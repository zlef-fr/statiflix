/* Statiflix — popup. A thin launcher: the dashboard does the actual harvest
 * (long-running, needs a persistent page), so the popup just opens it. */
(function () {
  'use strict';
  const { t, getLang, setLang, langs, applyDOM } = window.STX_I18N;
  const $ = (id) => document.getElementById(id);
  const DATA_KEY = 'statiflix.data';

  function relTime(ms) {
    if (!ms) return t('popup.never');
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return getLang() === 'fr' ? "à l'instant" : 'just now';
    if (m < 60) return getLang() === 'fr' ? `il y a ${m} min` : `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return getLang() === 'fr' ? `il y a ${h} h` : `${h}h ago`;
    return new Date(ms).toLocaleDateString();
  }

  function load() { return new Promise((res) => chrome.storage.local.get([DATA_KEY], (o) => res(o[DATA_KEY] || null))); }
  function openDash(refresh) { chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html' + (refresh ? '?run=1' : '')) }); window.close(); }

  async function render() {
    applyDOM(document);
    const data = await load();
    const has = data && data.items && data.items.length;
    $('open').classList.toggle('hidden', !has);
    $('refresh').classList.toggle('hidden', !has);
    $('analyze').classList.toggle('hidden', !!has);
    const meta = $('meta');
    if (has) {
      meta.classList.remove('hidden');
      meta.textContent = t('popup.fetched_items', { n: data.items.length.toLocaleString() }) +
        ' · ' + t('popup.last_sync', { when: relTime(data.fetchedAt) });
    } else meta.classList.add('hidden');
  }

  $('analyze').onclick = () => openDash(true);
  $('refresh').onclick = () => openDash(true);
  $('open').onclick = () => openDash(false);

  render();
})();
