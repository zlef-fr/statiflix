/* Statiflix PWA — decrypts the snapshot referenced by the URL fragment (#id.key)
 * entirely on-device and renders the mobile dashboard. The key is read from the
 * fragment (never sent to the server); only the ciphertext is fetched by id. */
(function () {
  'use strict';
  const I = window.STX_I18N, R = window.STX_RENDER, C = window.STX_CRYPTO;
  const t = I.t, el = R.el;
  const $ = (id) => document.getElementById(id);
  let snap = null;

  function showState(msg, isErr) {
    const s = $('state'); s.classList.remove('hidden'); s.className = 'pwa-state' + (isErr ? ' err' : '');
    $('stateMsg').textContent = msg;
  }
  function hideState() { $('state').classList.add('hidden'); }

  function parseFrag() {
    const h = (location.hash || '').replace(/^#/, '');
    const dot = h.indexOf('.');
    if (dot < 1) return null;
    return { id: h.slice(0, dot), key: h.slice(dot + 1) };
  }

  function hod(h) { return h === 0 ? '12am' : h < 12 ? h + 'am' : h === 12 ? '12pm' : (h - 12) + 'pm'; }

  function render() {
    const stats = snap.stats;
    const app = $('app'); app.textContent = '';
    const days = t('days.short').split(',');

    if (snap.profileName) app.appendChild(el('div', { class: 'profile-line', text: (snap.year || t('dash.all_years')) + ' · ' + snap.profileName }));

    function kpi(label, value, unit, red) {
      return el('div', { class: 'kpi' }, [
        el('div', { class: 'kpi-label', text: label }),
        el('div', { class: 'kpi-val' + (red ? ' red' : '') }, [document.createTextNode(value), unit ? el('span', { class: 'u', text: unit }) : null]),
      ]);
    }
    app.appendChild(el('div', { class: 'kpis' }, [
      kpi(t('stat.hours'), stats.totals.hours.toLocaleString(), t('stat.hours_unit'), true),
      kpi(t('stat.titles'), stats.totals.titles.toLocaleString()),
      kpi(t('stat.rewatched'), stats.totals.rewatchedTitles.toLocaleString(), t('stat.titles_unit')),
      kpi(t('stat.abandoned'), stats.totals.abandoned.toLocaleString(), t('stat.shows_unit')),
    ]));

    const head = (title, hint) => el('div', { class: 'card-head' }, [el('h3', { text: title }), hint ? el('span', { class: 'hint', text: hint }) : null]);

    // Top
    app.appendChild(el('div', { class: 'card' }, [
      head(t('sec.top')),
      R.rail(stats.top.slice(0, 12), { meta: (it) => it.isEpisode ? t('label.episodes_n', { n: it.episodeViews }) : R.fmtHours(it.hours) }),
    ]));

    // When you watch
    app.appendChild(el('div', { class: 'card' }, [head(t('sec.when'), t('sec.when_sub')), R.heatmap(stats)]));

    // Genres (if present in snapshot via enrichment)
    const gr = genreRows(stats);
    if (gr.length) app.appendChild(el('div', { class: 'card' }, [head(t('sec.genres')), R.donut(gr, String(gr.length), t('sec.genres'))]));

    // Rewatched
    if (stats.rewatched.length) app.appendChild(el('div', { class: 'card' }, [
      head(t('sec.rewatched')),
      R.rankList(stats.rewatched.slice(0, 8), {
        sub: (it) => it.isEpisode ? t('label.episodes_n', { n: it.distinctEpisodes }) : R.fmtHours(it.hours),
        value: (it) => t('label.times_n', { n: it.rewatchScore + 1 }),
      }),
    ]));

    // Abandoned
    if (stats.abandonedList.length) app.appendChild(el('div', { class: 'card' }, [
      head(t('sec.abandoned')),
      R.rankList(stats.abandonedList.slice(0, 8), { rank: false, sub: (it) => t('label.quit_after', { ep: t('label.ep_n', { n: it.distinctEpisodes }) }) }),
    ]));

    // By weekday
    app.appendChild(el('div', { class: 'card' }, [
      head(t('sec.byday')),
      R.bars(stats.byDay.map((v, i) => ({ label: days[i], value: v })), { fmt: (v) => R.fmtHours(v) }),
    ]));

    // Binge
    if (stats.binge) {
      const d = new Date(stats.binge.date);
      app.appendChild(el('div', { class: 'card' }, [
        head(t('sec.binge')),
        el('div', { class: 'binge-head' }, [
          el('span', { class: 'binge-hours', text: R.fmtHours(stats.binge.hours) }),
          el('span', { class: 'binge-date', text: d.toLocaleDateString(I.getLang(), { weekday: 'long', month: 'short', day: 'numeric' }) }),
        ]),
        R.rail(stats.binge.titles, { meta: (it) => R.fmtHours(it.hours) }),
      ]));
    }
  }

  function genreRows(stats) {
    const counts = {}; const seen = new Set();
    stats.top.concat(stats.rewatched).forEach((it) => {
      if (seen.has(it.key)) return; seen.add(it.key);
      if (it.genres && it.genres.length) counts[it.genres[0]] = (counts[it.genres[0]] || 0) + Math.max(1, it.hours || 1);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }

  function buildLang() {
    const sel = $('lang'); sel.textContent = '';
    I.langs.forEach((l) => { const o = document.createElement('option'); o.value = l; o.textContent = l.toUpperCase(); sel.appendChild(o); });
    sel.value = I.getLang();
    sel.onchange = () => { I.setLang(sel.value); if (snap) render(); };
  }

  async function init() {
    I.applyDOM(document);
    buildLang();
    const f = parseFrag();
    if (!f) { showState(t('pwa.error'), true); return; }
    showState(t('pwa.loading'), false);
    try {
      const r = await fetch('/api/sync/' + encodeURIComponent(f.id));
      if (!r.ok) throw new Error('gone');
      const { blob } = await r.json();
      snap = await C.decrypt(blob, f.key);
      if (snap.lang && I.langs.includes(snap.lang)) { I.setLang(snap.lang); buildLang(); }
      hideState();
      render();
    } catch (e) {
      showState(t('pwa.error'), true);
    }
  }

  window.addEventListener('hashchange', () => location.reload());
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  init();
})();
