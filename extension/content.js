/* Statiflix — content script (runs on netflix.com)
 *
 * Sole job: pull the signed-in user's *own* viewing activity from Netflix's
 * internal Shakti API, using the cookies already in the browser. Everything is
 * fetched same-origin from within netflix.com, so no credentials ever leave the
 * machine and no token handling is needed. The raw items are handed back to the
 * extension (popup/dashboard) which does all the analysis locally.
 *
 * We never scrape rendered DOM (brittle across Netflix's redesigns); we read the
 * documented JSON endpoint /api/shakti/<BUILD>/viewingactivity?pg=N and discover
 * BUILD + the active profile from the page's bootstrap context.
 */
(function () {
  'use strict';

  const PAGE_SIZE_GUESS = 20; // Netflix returns ~20 items/page; we stop on empty.
  const MAX_PAGES = 1000;     // hard safety cap (~20k items)

  // Pull the Shakti build id + active profile guid from the viewingactivity page.
  async function discover() {
    const res = await fetch('https://www.netflix.com/viewingactivity', {
      credentials: 'include',
      headers: { 'Accept': 'text/html' },
    });
    if (res.status === 401 || res.status === 403 || res.url.includes('/login')) {
      throw { code: 'NOT_LOGGED_IN' };
    }
    const html = await res.text();
    if (/\/login|netflix\.com\/login/.test(res.url)) throw { code: 'NOT_LOGGED_IN' };

    const build =
      (html.match(/"BUILD_IDENTIFIER"\s*:\s*"([^"]+)"/) || [])[1] ||
      (html.match(/"buildIdentifier"\s*:\s*"([^"]+)"/) || [])[1];
    const guid =
      (html.match(/"guid"\s*:\s*"([A-Z0-9]+)"/) || [])[1] || null;
    const name =
      (html.match(/"firstName"\s*:\s*"([^"]*)"/) || [])[1] ||
      (html.match(/"profileName"\s*:\s*"([^"]*)"/) || [])[1] || null;

    if (!build) throw { code: 'NO_BUILD' };
    return { build, guid, name };
  }

  async function fetchPage(build, pg) {
    const url = `https://www.netflix.com/api/shakti/${build}/viewingactivity?pg=${pg}&pgSize=${PAGE_SIZE_GUESS}`;
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'application/json, text/javascript, */*' },
    });
    if (!res.ok) throw { code: 'HTTP_' + res.status };
    const data = await res.json();
    return Array.isArray(data.viewedItems) ? data.viewedItems : [];
  }

  // Normalize a raw Shakti item into the minimal shape stats.js consumes.
  function normalize(it) {
    const date = typeof it.date === 'number'
      ? it.date
      : (Date.parse(it.date) || null);
    const isEpisode = !!(it.series || it.seriesTitle);
    return {
      id: it.movieID || it.movieId || null,
      seriesId: it.series || null,
      title: isEpisode
        ? (it.seriesTitle || it.seriesName || it.title || 'Unknown')
        : (it.title || 'Unknown'),
      episodeTitle: isEpisode ? (it.videoTitle || it.title || '') : '',
      isEpisode,
      date,                                   // ms epoch
      duration: Number(it.duration) || 0,     // seconds watched in this session
      bookmark: Number(it.bookmark) || 0,
    };
  }

  async function harvest(onProgress) {
    const meta = await discover();
    const items = [];
    for (let pg = 0; pg < MAX_PAGES; pg++) {
      const page = await fetchPage(meta.build, pg);
      if (!page.length) break;
      for (const it of page) {
        const n = normalize(it);
        if (n.date) items.push(n);
      }
      if (onProgress) onProgress(items.length, pg);
    }
    return { items, profileName: meta.name, fetchedAt: Date.now() };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg) return;
    if (msg.type === 'STATIFLIX_PING') { sendResponse({ ok: true }); return; }
    if (msg.type !== 'STATIFLIX_HARVEST') return;
    harvest((count) => {
      try { chrome.runtime.sendMessage({ type: 'STATIFLIX_PROGRESS', count }); } catch (_) {}
    })
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: (err && err.code) || 'UNKNOWN' }));
    return true; // async response
  });
})();
