/* Statiflix — optional metadata enrichment.
 *
 * Privacy: this is strictly OPT-IN. Nothing here runs unless the user explicitly
 * asks for genre/cover enrichment. When triggered, it sends ONLY a list of title
 * strings (no identity, no dates, no watch data) to the Statiflix relay, which
 * proxies TMDB and caches results. If the relay has no TMDB key configured it
 * returns empty and the dashboard simply keeps its gradient posters. Results are
 * cached locally so we never re-ask. */
(function (root) {
  'use strict';
  const ENDPOINT = 'https://statiflix.zlef.fr/api/enrich';
  const CACHE_KEY = 'statiflix.enrich';

  function loadCache() {
    return new Promise((res) => {
      try { chrome.storage.local.get([CACHE_KEY], (o) => res(o[CACHE_KEY] || {})); }
      catch (_) { res({}); }
    });
  }
  function saveCache(c) { try { chrome.storage.local.set({ [CACHE_KEY]: c }); } catch (_) {} }

  // titles: array of strings. Returns map title -> { poster, genres:[...] } (may be partial/empty).
  async function enrich(titles) {
    const cache = await loadCache();
    const need = [...new Set(titles)].filter((t) => !(t in cache));
    if (need.length) {
      try {
        // chunk to keep requests modest
        for (let i = 0; i < need.length; i += 40) {
          const chunk = need.slice(i, i + 40);
          const r = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ titles: chunk }),
          });
          if (!r.ok) { chunk.forEach((t) => (cache[t] = null)); continue; }
          const data = await r.json();
          const res = data.results || {};
          chunk.forEach((t) => { cache[t] = res[t] || null; });
        }
        saveCache(cache);
      } catch (_) { /* offline / no key — leave gradients */ }
    }
    const out = {};
    titles.forEach((t) => { if (cache[t]) out[t] = cache[t]; });
    return out;
  }

  async function available() {
    try { const r = await fetch('https://statiflix.zlef.fr/api/enrich/status'); const d = await r.json(); return !!d.enabled; }
    catch (_) { return false; }
  }

  root.STX_ENRICH = { enrich, available };
})(typeof window !== 'undefined' ? window : this);
