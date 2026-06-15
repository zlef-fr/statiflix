/* Statiflix — client-side E2EE for the mobile hand-off.
 *
 * Threat model: the relay (statiflix.zlef.fr) is treated as fully untrusted. It
 * only ever stores opaque ciphertext. The symmetric key is generated here, used
 * to encrypt the stats snapshot, and travels to the phone ONLY inside the QR/URL
 * fragment (`#id.key`). Fragments are never sent to the server, so the key never
 * reaches the relay — it cannot decrypt anything it stores.
 *
 * AES-GCM-256 via the Web Crypto API (available in both the extension and the PWA).
 */
(function (root) {
  'use strict';
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // URL-safe base64 (no padding) so keys/ids fit cleanly in a fragment.
  function b64u(bytes) {
    let s = btoa(String.fromCharCode.apply(null, new Uint8Array(bytes)));
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function genKey() {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  async function exportKey(key) { return b64u(await crypto.subtle.exportKey('raw', key)); }
  async function importKey(b64) {
    return crypto.subtle.importKey('raw', unb64u(b64), { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }

  // Returns { keyStr, blob } where blob = iv(12) ++ ciphertext, base64url-encoded.
  async function encrypt(obj) {
    const key = await genKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = enc.encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    const packed = new Uint8Array(iv.length + ct.byteLength);
    packed.set(iv, 0); packed.set(new Uint8Array(ct), iv.length);
    return { keyStr: await exportKey(key), blob: b64u(packed) };
  }

  async function decrypt(blobB64, keyStr) {
    const key = await importKey(keyStr);
    const packed = unb64u(blobB64);
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(dec.decode(plain));
  }

  root.STX_CRYPTO = { encrypt, decrypt, b64u, unb64u };
})(typeof window !== 'undefined' ? window : this);
