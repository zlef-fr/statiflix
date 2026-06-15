/* Statiflix PWA service worker — caches the app shell so the viewer opens
 * offline once installed. Stats themselves are fetched fresh (ciphertext) and
 * decrypted in memory; nothing decrypted is ever cached. */
'use strict';
const CACHE = 'statiflix-shell-v1';
const SHELL = [
  '/app', '/app/', '/app/index.html', '/app/app.js', '/app/render.js',
  '/app/i18n.js', '/app/crypto.js', '/app/dashboard.css', '/app/pwa.css',
  '/assets/qrcode.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // always network for ciphertext
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (e.request.method === 'GET' && res.ok && url.origin === location.origin) {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
