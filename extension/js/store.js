/* Statiflix — local storage wrapper (chrome.storage.local).
 * Holds the raw harvested items + metadata. Stats are recomputed on demand so we
 * never persist anything we can't re-derive. Nothing here ever touches a network. */
(function (root) {
  'use strict';
  const KEY = 'statiflix.data';
  const api = (typeof chrome !== 'undefined' && chrome.storage) ? chrome.storage.local : null;

  function save(payload) {
    return new Promise((res, rej) => {
      if (!api) return rej(new Error('no storage'));
      api.set({ [KEY]: payload }, () => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(true));
    });
  }
  function load() {
    return new Promise((res, rej) => {
      if (!api) return rej(new Error('no storage'));
      api.get([KEY], (o) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(o[KEY] || null));
    });
  }
  function clear() {
    return new Promise((res) => { if (!api) return res(); api.remove([KEY], () => res()); });
  }
  root.STX_STORE = { save, load, clear };
})(typeof window !== 'undefined' ? window : this);
