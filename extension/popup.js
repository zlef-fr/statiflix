/* Statiflix — popup controller.
 * Finds (or opens) a netflix.com tab, asks the content script to harvest the
 * viewing history, stores it locally, and opens the dashboard. */
(function () {
  'use strict';
  const { t, getLang, setLang, langs, applyDOM } = window.STX_I18N;
  const $ = (id) => document.getElementById(id);
  const DATA_KEY = 'statiflix.data';

  // Language selector.
  const sel = $('lang');
  langs.forEach((l) => { const o = document.createElement('option'); o.value = l; o.textContent = l.toUpperCase(); sel.appendChild(o); });
  sel.value = getLang();
  sel.onchange = () => { setLang(sel.value); render(); };

  function setStatus(msg, kind, busy) {
    const s = $('status');
    s.className = 'status' + (kind ? ' ' + kind : '');
    s.classList.remove('hidden');
    s.textContent = '';
    if (busy) s.appendChild(Object.assign(document.createElement('span'), { className: 'spin' }));
    s.appendChild(document.createTextNode(msg));
  }
  function hideStatus() { $('status').classList.add('hidden'); }

  function relTime(ms) {
    if (!ms) return t('popup.never');
    const diff = Date.now() - ms, m = Math.round(diff / 60000);
    if (m < 1) return getLang() === 'fr' ? "à l'instant" : 'just now';
    if (m < 60) return getLang() === 'fr' ? `il y a ${m} min` : `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return getLang() === 'fr' ? `il y a ${h} h` : `${h}h ago`;
    return new Date(ms).toLocaleDateString();
  }

  let existing = null;
  function loadExisting() {
    return new Promise((res) => chrome.storage.local.get([DATA_KEY], (o) => res(o[DATA_KEY] || null)));
  }

  async function render() {
    applyDOM(document);
    existing = await loadExisting();
    const has = existing && existing.items && existing.items.length;
    $('open').classList.toggle('hidden', !has);
    $('refresh').classList.toggle('hidden', !has);
    $('analyze').classList.toggle('hidden', !!has);
    const meta = $('meta');
    if (has) {
      meta.classList.remove('hidden');
      meta.textContent = t('popup.fetched_items', { n: existing.items.length.toLocaleString() }) +
        ' · ' + t('popup.last_sync', { when: relTime(existing.fetchedAt) });
    } else meta.classList.add('hidden');
  }

  async function findNetflixTab() {
    const tabs = await chrome.tabs.query({ url: '*://*.netflix.com/*' });
    if (tabs.length) {
      // prefer the active one
      const active = tabs.find((tt) => tt.active) || tabs[0];
      return active;
    }
    return null;
  }

  async function ensureContentScript(tabId) {
    // content script is declared in manifest; just ping it.
    return new Promise((res) => {
      chrome.tabs.sendMessage(tabId, { type: 'STATIFLIX_PING' }, () => { void chrome.runtime.lastError; res(); });
    });
  }

  function harvest(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'STATIFLIX_HARVEST' }, (resp) => {
        if (chrome.runtime.lastError || !resp) return resolve({ ok: false, error: 'NO_CONTENT' });
        resolve(resp);
      });
    });
  }

  // Progress messages from content script.
  chrome.runtime.onMessage.addListener((m) => {
    if (m && m.type === 'STATIFLIX_PROGRESS') setStatus(t('popup.fetching') + ' (' + m.count + ')', 'busy', true);
  });

  async function doAnalyze() {
    let tab = await findNetflixTab();
    let createdTab = false;
    if (!tab) {
      // No netflix tab — open one and ask the user to retry once signed in.
      setStatus(t('popup.go_netflix') + ' — ' + t('popup.go_netflix_hint'), 'err');
      chrome.tabs.create({ url: 'https://www.netflix.com/viewingactivity', active: true });
      return;
    }
    $('analyze').disabled = $('refresh').disabled = true;
    setStatus(t('popup.fetching'), 'busy', true);
    await ensureContentScript(tab.id);
    const resp = await harvest(tab.id);
    $('analyze').disabled = $('refresh').disabled = false;

    if (!resp.ok) {
      if (resp.error === 'NOT_LOGGED_IN') setStatus(t('popup.err_login'), 'err');
      else setStatus(t('popup.err_generic'), 'err');
      return;
    }
    await chrome.storage.local.set({ [DATA_KEY]: { items: resp.items, profileName: resp.profileName, fetchedAt: resp.fetchedAt } });
    hideStatus();
    await render();
    openDashboard();
  }

  function openDashboard() {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }

  $('analyze').onclick = doAnalyze;
  $('refresh').onclick = doAnalyze;
  $('open').onclick = openDashboard;

  render();
})();
