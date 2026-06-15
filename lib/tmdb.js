'use strict';
/* Statiflix enrichment — optional TMDB proxy.
 * Receives only title STRINGS (no identity, no watch data), looks up the first TV
 * or movie match, and returns { poster, genres } per title. Results are cached on
 * disk so repeated lookups are free and rate-limited toward TMDB. If no TMDB_API_KEY
 * is configured the proxy reports disabled and returns nothing — the extension then
 * keeps its private gradient posters. */
const fs = require('fs');
const path = require('path');
const https = require('https');

const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w342';
// TMDB genre id → English name (TV + movie merged; we localize on the client if needed).
const GENRES = {
  10759: 'Action', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary',
  18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi', 10766: 'Soap', 10767: 'Talk', 10768: 'War',
  37: 'Western', 28: 'Action', 12: 'Adventure', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 10752: 'War',
};

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' }, timeout: 8000 }, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('timeout')); });
  });
}

function createTmdb(dataDir) {
  const KEY = process.env.TMDB_API_KEY || '';
  const FILE = path.join(dataDir, 'tmdb-cache.json');
  let cache = {};
  try { fs.mkdirSync(dataDir, { recursive: true }); cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) {}
  let timer = null;
  const persist = () => { clearTimeout(timer); timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(cache), () => {}), 1500); };

  const enabled = () => !!KEY;

  async function lookup(title) {
    const k = title.trim().toLowerCase();
    if (k in cache) return cache[k];
    let result = null;
    try {
      const url = `${API}/search/multi?api_key=${KEY}&query=${encodeURIComponent(title)}&include_adult=false`;
      const data = await getJSON(url);
      const hit = (data.results || []).find((r) => r.media_type === 'tv' || r.media_type === 'movie');
      if (hit) {
        result = {
          poster: hit.poster_path ? IMG + hit.poster_path : null,
          genres: (hit.genre_ids || []).map((id) => GENRES[id]).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
        };
      }
    } catch (_) { result = null; }
    cache[k] = result; persist();
    return result;
  }

  // titles: string[] → { title: {poster,genres} }
  async function enrich(titles) {
    if (!enabled()) return {};
    const out = {};
    for (const tt of titles.slice(0, 60)) {
      if (typeof tt !== 'string' || !tt.trim()) continue;
      const r = await lookup(tt);
      if (r) out[tt] = r;
    }
    return out;
  }

  return { enabled, enrich };
}

module.exports = { createTmdb };
