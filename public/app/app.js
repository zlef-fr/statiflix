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
      kpi(t('stat.episodes'), stats.totals.episodes.toLocaleString()),
      kpi(t('stat.abandoned'), stats.totals.abandoned.toLocaleString(), t('stat.titles_unit')),
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

    // Abandoned (real signals: % watched for movies, N of M episodes for series)
    if (stats.abandonedList.length) app.appendChild(el('div', { class: 'card' }, [
      head(t('sec.abandoned'), t('sec.abandoned_sub')),
      R.rankList(stats.abandonedList.slice(0, 10), {
        rank: false,
        sub: (it) => it.isEpisode ? t('label.eps_of', { n: it.distinctEpisodes, total: it.episodeCount }) : t('label.pct_watched', { pct: it.pct != null ? it.pct : 0 }),
        value: (it) => R.fmtHours(it.hours),
      }),
    ]));

    // Across the year (month bars)
    const months = t('months.short').split(',');
    app.appendChild(el('div', { class: 'card' }, [
      head(t('sec.bymonth')),
      R.bars(stats.byMonth.map((v, i) => ({ label: months[i], value: v })), { fmt: (v) => R.fmtHours(v) }),
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
    stats.top.concat(stats.abandonedList).forEach((it) => {
      if (seen.has(it.key)) return; seen.add(it.key);
      if (it.genres && it.genres.length) counts[it.genres[0]] = (counts[it.genres[0]] || 0) + Math.max(1, it.hours || 1);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }

  async function init() {
    I.applyDOM(document);
    const f = parseFrag();
    if (!f) { showState(t('pwa.error'), true); return; }
    showState(t('pwa.loading'), false);
    try {
      const r = await fetch('/api/sync/' + encodeURIComponent(f.id));
      if (!r.ok) throw new Error('gone');
      const { blob } = await r.json();
      snap = await C.decrypt(blob, f.key);
      // language follows the visitor's own zl-lang cookie / browser (set in init)
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
