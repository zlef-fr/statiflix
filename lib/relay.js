'use strict';
/* Statiflix relay — zero-knowledge ciphertext store.
 * Holds only opaque base64 blobs (iv+AES-GCM ciphertext) under a random id, with
 * a 24h TTL. The decryption key never reaches this server (it lives in the QR/URL
 * fragment), so a dump of this store reveals nothing. Backed by a small JSON file. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_BLOB = 700 * 1024;     // ~700KB ciphertext ceiling
const MAX_ENTRIES = 5000;        // global cap; oldest pruned first

function createRelay(dataDir) {
  const FILE = path.join(dataDir, 'relay.json');
  let store = {};
  try { fs.mkdirSync(dataDir, { recursive: true }); store = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) {}

  let timer = null;
  const persist = () => { clearTimeout(timer); timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(store), () => {}), 800); };

  function prune() {
    const now = Date.now();
    let ids = Object.keys(store);
    for (const id of ids) if (store[id].exp < now) delete store[id];
    ids = Object.keys(store);
    if (ids.length > MAX_ENTRIES) {
      ids.sort((a, b) => store[a].exp - store[b].exp);
      ids.slice(0, ids.length - MAX_ENTRIES).forEach((id) => delete store[id]);
    }
  }

  function put(blob) {
    if (typeof blob !== 'string' || !blob.length || blob.length > MAX_BLOB) return null;
    if (!/^[A-Za-z0-9_-]+$/.test(blob)) return null; // base64url only
    prune();
    const id = crypto.randomBytes(8).toString('base64url'); // ~11 chars
    store[id] = { blob, exp: Date.now() + TTL_MS };
    persist();
    return id;
  }

  function get(id) {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(id || '')) return null;
    const e = store[id];
    if (!e) return null;
    if (e.exp < Date.now()) { delete store[id]; persist(); return null; }
    return e.blob;
  }

  // periodic prune
  setInterval(() => { prune(); persist(); }, 60 * 60 * 1000).unref();

  return { put, get };
}

module.exports = { createRelay, TTL_MS, MAX_BLOB };
