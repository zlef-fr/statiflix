'use strict';
/* statiflix.zlef.fr — landing page + E2EE mobile viewer (PWA) + zero-knowledge
 * sync relay + optional TMDB enrichment proxy.
 *
 * Privacy posture: the relay only ever stores opaque ciphertext (the key lives in
 * the client URL fragment, never sent here). Enrichment receives title strings
 * only. No accounts, no IP logging, no watch data on disk. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRelay } = require('./lib/relay');
const { createTmdb } = require('./lib/tmdb');

const PORT = Number(process.env.PORT || 10047);
const ROOT = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');

const relay = createRelay(DATA);
const tmdb = createTmdb(DATA);

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.zip': 'application/zip', '.woff2': 'font/woff2', '.webp': 'image/webp',
};

function readBody(req, limit, cb) {
  let body = '', tooBig = false;
  req.on('data', (c) => { body += c; if (body.length > limit) { tooBig = true; req.destroy(); } });
  req.on('end', () => { if (tooBig) return cb(null); try { cb(JSON.parse(body)); } catch (_) { cb(null); } });
}
function json(res, code, obj, extra) {
  res.writeHead(code, Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, CORS, extra || {}));
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    let p = decodeURIComponent(u.pathname);

    /* ---------------- API ---------------- */
    if (p.startsWith('/api/')) {
      if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

      // Relay: store ciphertext
      if (p === '/api/sync' && req.method === 'POST') {
        return readBody(req, 1024 * 1024, (b) => {
          if (!b || typeof b.blob !== 'string') return json(res, 400, { error: 'bad_request' });
          const id = relay.put(b.blob);
          if (!id) return json(res, 413, { error: 'too_large' });
          json(res, 200, { id });
        });
      }
      // Relay: fetch ciphertext
      let m = p.match(/^\/api\/sync\/([A-Za-z0-9_-]{1,32})$/);
      if (m && req.method === 'GET') {
        const blob = relay.get(m[1]);
        if (!blob) return json(res, 404, { error: 'not_found' });
        return json(res, 200, { blob });
      }
      // Enrichment status
      if (p === '/api/enrich/status' && req.method === 'GET') {
        return json(res, 200, { enabled: tmdb.enabled() });
      }
      // Enrichment proxy
      if (p === '/api/enrich' && req.method === 'POST') {
        return readBody(req, 32 * 1024, async (b) => {
          if (!b || !Array.isArray(b.titles)) return json(res, 400, { error: 'bad_request' });
          if (!tmdb.enabled()) return json(res, 200, { results: {}, enabled: false });
          try { const results = await tmdb.enrich(b.titles); json(res, 200, { results, enabled: true }); }
          catch (_) { json(res, 200, { results: {} }); }
        });
      }
      res.writeHead(404, CORS); return res.end('not found');
    }

    /* ---------------- static + routes ---------------- */
    // /app must keep its trailing slash so the PWA's relative asset paths resolve
    // under /app/ (and so the QR fragment is preserved through the redirect).
    if (p === '/app') { res.writeHead(301, { location: '/app/' }); return res.end(); }
    if (p === '/') p = '/index.html';
    if (p === '/app/') p = '/app/index.html';
    if (p === '/privacy') p = '/privacy.html';
    if (!path.extname(p) && fs.existsSync(path.join(ROOT, p + '.html'))) p += '.html';

    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
      const ext = path.extname(file).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const cache = ext === '.html' || ext === '.webmanifest' ? 'no-cache' : 'public, max-age=3600';
      const headers = { 'content-type': type, 'cache-control': cache, 'content-length': st.size };
      if (ext === '.zip') headers['content-disposition'] = 'attachment; filename="statiflix.zip"';
      res.writeHead(200, headers);
      fs.createReadStream(file).pipe(res);
    });
  } catch (e) {
    res.writeHead(500); res.end('error');
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`statiflix.zlef.fr on 127.0.0.1:${PORT} (enrich: ${tmdb.enabled() ? 'on' : 'off'})`));
