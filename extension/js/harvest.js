/* Statiflix — history harvester.
 *
 * Reuses the proven pipeline from the netflix-watchtime extension (Netflix killed
 * the old /shakti/<build>/viewingactivity REST feed; the current path is the AUI
 * Falcor endpoint, with runtimes/bookmarks recovered from the member Falcor API).
 * Everything runs in the Netflix tab's MAIN world so it uses the page's own
 * cookies + CSRF token; nothing is sent anywhere. We open viewingactivity in a
 * background tab, inject the pipeline, collect the result, and close the tab.
 *
 * runPipeline() MUST stay self-contained (no outer-scope refs): chrome.scripting
 * serializes it by .toString() to run it in the page context.
 */
(function (root) {
  'use strict';

  // ---- injected into the Netflix MAIN world (self-contained) ----
  async function runPipeline(cfg) {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const report = (phase, done, total) => { try { document.title = 'STX::' + phase + '::' + done + '::' + total; } catch (e) {} };

    let m = null;
    for (let i = 0; i < 40; i++) {
      try { m = window.netflix.reactContext.models; } catch (e) { m = null; }
      if (m && m.userInfo && m.userInfo.data && m.userInfo.data.authURL) break;
      m = null; await sleep(250);
    }
    if (!m) return { error: 'NOT_LOGGED_IN' };

    const authURL = m.userInfo.data.authURL;
    const build = m.serverDefs.data.BUILD_IDENTIFIER;
    const guid = m.userInfo.data.guid;
    let esn = '';
    try { esn = m.esnAccessor.data.esn || ''; } catch (e) {}

    const auiHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-netflix.uiversion': build,
      'x-netflix.clienttype': 'akira',
      'x-netflix.nq.stack': 'prod',
      'x-netflix.esnprefix': 'NFCDCH-LX-',
      'x-netflix.client.request.name': 'ui/xhrUnclassified',
      'x-netflix.request.routing': JSON.stringify({ path: '/nq/aui/endpoint/^1.0.0-web/pathEvaluator', control_tag: 'auinqweb' }),
    };
    const metaHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-netflix.uiversion': build,
      'x-netflix.client.request.name': 'ui/falcorUnclassified',
      'x-netflix.request.client.user.guid': guid,
      'x-netflix.clienttype': 'akira',
      'x-netflix.nq.stack': 'prod',
    };
    if (esn) metaHeaders['x-netflix.esn'] = esn;

    async function vaPage(pg) {
      const url = 'https://www.netflix.com/api/aui/pathEvaluator/web/^2.0.0?method=call&callPath=' +
        encodeURIComponent(JSON.stringify(['aui', 'viewingActivity', pg, 50])) + '&falcor_server=0.1.0';
      const r = await fetch(url, { method: 'POST', credentials: 'include', headers: auiHeaders, body: 'param=' + encodeURIComponent(JSON.stringify({ guid })) });
      if (!r.ok) throw new Error('history HTTP ' + r.status);
      const j = await r.json();
      const v = j.jsonGraph && j.jsonGraph.aui && j.jsonGraph.aui.viewingActivity && j.jsonGraph.aui.viewingActivity.value;
      if (!v) throw new Error('history shape');
      return v;
    }
    async function metaChunk(ids) {
      const url = 'https://www.netflix.com/nq/website/memberapi/release/pathEvaluator' +
        '?webp=true&falcor_server=0.1.0&withSize=true&materialize=true&original_path=%2Fshakti%2F' + build + '%2FpathEvaluator';
      const body = 'authURL=' + encodeURIComponent(authURL) + '&path=' + encodeURIComponent(JSON.stringify(['videos', ids, ['runtime', 'bookmarkPosition']]));
      const r = await fetch(url, { method: 'POST', credentials: 'include', headers: metaHeaders, body });
      if (!r.ok) throw new Error('meta HTTP ' + r.status);
      const j = await r.json();
      return (j.jsonGraph && j.jsonGraph.videos) || {};
    }
    async function withRetry(fn, tries = 3) {
      for (let a = 0; a < tries; a++) { try { return await fn(); } catch (e) { if (a === tries - 1) throw e; await sleep(300 * (a + 1)); } }
    }
    async function runPool(list, concurrency, fn) {
      let i = 0; const n = Math.max(1, Math.min(concurrency, list.length || 1));
      await Promise.all(Array.from({ length: n }, async () => { while (true) { const idx = i++; if (idx >= list.length) break; await fn(list[idx]); } }));
    }

    // 1. paginate full history
    const all = []; let vhSize = null, profileName = null, v0;
    try { v0 = await withRetry(() => vaPage(0)); } catch (e) { return { error: 'API_ERROR', detail: String(e) }; }
    if (typeof v0.vhSize === 'number') vhSize = v0.vhSize;
    if (v0.profileInfo) profileName = v0.profileInfo.profileName || null;
    all.push(...(v0.viewedItems || []));
    report('history', all.length, vhSize || all.length);
    const pageLen = (v0.viewedItems || []).length || 20;
    if (vhSize != null && all.length < vhSize) {
      const totalPages = Math.ceil(vhSize / pageLen); const pages = [];
      for (let pg = 1; pg < totalPages; pg++) pages.push(pg);
      await runPool(pages, cfg.concurrency, async (pg) => {
        let v = null; try { v = await withRetry(() => vaPage(pg)); } catch (e) {}
        if (v && v.viewedItems && v.viewedItems.length) all.push(...v.viewedItems);
        report('history', all.length, vhSize);
      });
    }
    if (!all.length) return { error: 'EMPTY' };

    // 2. runtime + bookmark per unique video
    const ids = [...new Set(all.map((x) => x.movieID))];
    const meta = {}; const chunks = [];
    for (let i = 0; i < ids.length; i += cfg.metaChunk) chunks.push(ids.slice(i, i + cfg.metaChunk));
    let metaDone = 0;
    await runPool(chunks, cfg.metaConcurrency, async (chunk) => {
      let v = {}; try { v = await withRetry(() => metaChunk(chunk)); } catch (e) {}
      for (const id of chunk) {
        const node = v[id]; if (!node) continue;
        meta[id] = {
          runtime: node.runtime && typeof node.runtime.value === 'number' ? node.runtime.value : null,
          bookmark: node.bookmarkPosition && typeof node.bookmarkPosition.value === 'number' ? node.bookmarkPosition.value : null,
        };
      }
      metaDone += chunk.length; report('meta', Math.min(metaDone, ids.length), ids.length);
    });

    // 3. assemble raw items
    const items = all.map((x) => {
      const mv = meta[x.movieID] || {};
      return {
        id: x.movieID, date: x.date, title: x.title,
        series: x.series != null ? x.series : null, seriesTitle: x.seriesTitle || null,
        episodeTitle: x.episodeTitle || null, rt: mv.runtime, bm: mv.bookmark,
      };
    });
    report('done', items.length, items.length);
    return { items, profileName, vhSize };
  }

  // ---- normal-world helpers ----
  const FINISHED_RATIO = 0.9;
  function watchedSeconds(rt, bm, isEpisode) {
    let s;
    if (rt == null && bm == null) s = null;
    else if (rt == null) s = bm;
    else if (bm == null || bm <= 0) s = rt;
    else if (bm >= FINISHED_RATIO * rt) s = rt;
    else s = Math.min(bm, rt);
    if (s == null || s <= 0) s = isEpisode ? 1800 : 6000; // estimate when Netflix hides runtime
    return s;
  }
  // Map pipeline raw → stats.js input shape.
  function toStatsItems(raw) {
    return raw.map((x) => {
      const isEpisode = x.series != null;
      return {
        id: x.id, seriesId: x.series || null,
        title: isEpisode ? (x.seriesTitle || (x.title || '').split(/:\s/)[0] || 'Unknown') : (x.title || 'Unknown'),
        episodeTitle: isEpisode ? (x.episodeTitle || x.title || '') : '',
        isEpisode, date: x.date, duration: watchedSeconds(x.rt, x.bm, isEpisode), bookmark: x.bm || 0,
      };
    }).filter((i) => i.date);
  }

  function waitForTabComplete(tabId, timeoutMs) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (ok) => { if (done) return; done = true; chrome.tabs.onUpdated.removeListener(listener); clearTimeout(timer); ok ? resolve() : reject(new Error('tab timeout')); };
      const listener = (id, info) => { if (id === tabId && info.status === 'complete') finish(true); };
      const timer = setTimeout(() => finish(false), timeoutMs || 30000);
      chrome.tabs.onUpdated.addListener(listener);
      chrome.tabs.get(tabId, (tab) => { if (!chrome.runtime.lastError && tab && tab.status === 'complete') finish(true); });
    });
  }

  // Orchestrator. onProgress(phase, done, total). Resolves { items, profileName } or throws {code}.
  async function run(onProgress) {
    let tab;
    try { tab = await chrome.tabs.create({ url: 'https://www.netflix.com/viewingactivity', active: false }); }
    catch (e) { throw { code: 'NO_TAB' }; }

    let poll = null;
    try {
      await waitForTabComplete(tab.id);
      if (onProgress) poll = setInterval(async () => {
        try {
          const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => document.title });
          const title = r && r[0] && r[0].result;
          if (typeof title === 'string' && title.startsWith('STX::')) { const [, phase, done, total] = title.split('::'); onProgress(phase, +done, +total); }
        } catch (e) {}
      }, 500);

      const injection = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: 'MAIN', func: runPipeline,
        args: [{ concurrency: 12, metaConcurrency: 6, metaChunk: 200 }],
      });
      const result = injection && injection[0] && injection[0].result;
      if (!result) throw { code: 'UNKNOWN' };
      if (result.error) throw { code: result.error };
      return { items: toStatsItems(result.items), profileName: result.profileName, fetchedAt: Date.now() };
    } finally {
      if (poll) clearInterval(poll);
      try { await chrome.tabs.remove(tab.id); } catch (e) {}
    }
  }

  root.STX_HARVEST = { run };
})(typeof window !== 'undefined' ? window : this);
