/* Statiflix — dashboard controller. Loads local data, computes stats per selected
 * year, renders the Netflix-themed UI, and wires sync / export / drill-downs. */
(function () {
  'use strict';
  const I = window.STX_I18N, R = window.STX_RENDER, S = window.STX_STATS;
  const t = I.t, el = R.el;
  const $ = (id) => document.getElementById(id);
  const DATA_KEY = 'statiflix.data';

  let raw = null;          // { items, profileName, fetchedAt }
  let yearSel = null;      // number or null (all)
  let stats = null;        // computed for current year
  let enrichMap = {};      // title -> { poster, genres }

  function load() { return new Promise((res) => chrome.storage.local.get([DATA_KEY], (o) => res(o[DATA_KEY] || null))); }

  /* ---------- enrichment ---------- */
  function applyEnrichment(s) {
    const tag = (it) => { const e = enrichMap[it.title]; if (e) { it.poster = e.poster; it.genres = e.genres; } return it; };
    s.top.forEach(tag); s.rewatched.forEach(tag); s.abandonedList.forEach(tag);
    if (s.binge) s.binge.titles.forEach(tag);
  }
  function genreRows(s) {
    const counts = {};
    const all = s.top.concat(s.rewatched);
    const seen = new Set();
    all.forEach((it) => {
      if (seen.has(it.key)) return; seen.add(it.key);
      const g = enrichMap[it.title] && enrichMap[it.title].genres;
      if (g && g.length) counts[g[0]] = (counts[g[0]] || 0) + Math.max(1, it.hours || 1);
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }

  /* ---------- builders ---------- */
  function kpi(label, value, unit, opts) {
    opts = opts || {};
    const v = el('div', { class: 'kpi-val' + (opts.red ? ' red' : '') }, [
      document.createTextNode(value),
      unit ? el('span', { class: 'u', text: unit }) : null,
    ]);
    const node = el('div', { class: 'kpi' + (opts.onClick ? ' clickable' : '') }, [
      el('div', { class: 'kpi-label', text: label }), v,
    ]);
    if (opts.onClick) node.addEventListener('click', opts.onClick);
    return node;
  }

  function cardHead(title, hint, onMore) {
    return el('div', { class: 'card-head' }, [
      el('h3', { text: title }),
      onMore ? el('button', { class: 'more', text: '→', onclick: onMore }) : (hint ? el('span', { class: 'hint', text: hint }) : null),
    ]);
  }

  function hod(h) { return h === 0 ? '12am' : h < 12 ? h + 'am' : h === 12 ? '12pm' : (h - 12) + 'pm'; }

  function render() {
    applyEnrichment(stats);
    const app = $('app');
    app.textContent = '';
    if (stats.empty) { $('empty').classList.remove('hidden'); app.classList.add('hidden'); return; }
    $('empty').classList.add('hidden'); app.classList.remove('hidden');

    const days = t('days.short').split(',');

    // KPIs
    const kpis = el('div', { class: 'kpis' }, [
      kpi(t('stat.hours'), stats.totals.hours.toLocaleString(), t('stat.hours_unit'), { red: true }),
      kpi(t('stat.titles'), stats.totals.titles.toLocaleString()),
      kpi(t('stat.rewatched'), stats.totals.rewatchedTitles.toLocaleString(), t('stat.titles_unit'),
        { onClick: () => drill(t('sec.rewatched'), rewatchedList()) }),
      kpi(t('stat.abandoned'), stats.totals.abandoned.toLocaleString(), t('stat.shows_unit'),
        { onClick: () => drill(t('sec.abandoned'), abandonedList()) }),
    ]);
    const kpis2 = el('div', { class: 'kpis' }, [
      kpi(t('stat.episodes'), stats.totals.episodes.toLocaleString()),
      kpi(t('stat.peak_hour'), stats.peak.hour == null ? '—' : hod(stats.peak.hour)),
      kpi(t('stat.peak_day'), stats.peak.day == null ? '—' : days[stats.peak.day]),
      kpi(t('stat.streak'), String(stats.streak), t('stat.days')),
    ]);
    app.appendChild(kpis); app.appendChild(kpis2);

    // Top rail
    app.appendChild(el('div', { class: 'card' }, [
      cardHead(t('sec.top')),
      R.rail(stats.top.slice(0, 14), {
        meta: (it) => it.isEpisode ? t('label.episodes_n', { n: it.episodeViews }) : R.fmtHours(it.hours),
      }),
    ]));

    // When you watch + genres
    app.appendChild(el('div', { class: 'grid cols2' }, [
      el('div', { class: 'card' }, [ cardHead(t('sec.when'), t('sec.when_sub')), R.heatmap(stats) ]),
      el('div', { class: 'card' }, [ cardHead(t('sec.genres')), genreCard() ]),
    ]));

    // Rewatched + Abandoned
    app.appendChild(el('div', { class: 'grid cols2b' }, [
      el('div', { class: 'card' }, [
        cardHead(t('sec.rewatched'), null, stats.rewatched.length > 5 ? () => drill(t('sec.rewatched'), rewatchedList()) : null),
        R.rankList(stats.rewatched.slice(0, 5), {
          sub: (it) => it.isEpisode ? t('label.episodes_n', { n: it.distinctEpisodes }) : R.fmtHours(it.hours),
          value: (it) => t('label.times_n', { n: it.rewatchScore + 1 }),
        }),
      ]),
      el('div', { class: 'card' }, [
        cardHead(t('sec.abandoned'), null, stats.abandonedList.length > 5 ? () => drill(t('sec.abandoned'), abandonedList()) : null),
        R.rankList(stats.abandonedList.slice(0, 5), {
          rank: false,
          sub: (it) => t('label.quit_after', { ep: t('label.ep_n', { n: it.distinctEpisodes }) }),
        }),
      ]),
    ]));

    // By weekday + binge
    app.appendChild(el('div', { class: 'grid cols2b' }, [
      el('div', { class: 'card' }, [
        cardHead(t('sec.byday')),
        R.bars(stats.byDay.map((v, i) => ({ label: days[i], value: v })), { fmt: (v) => R.fmtHours(v) }),
      ]),
      bingeCard(),
    ]));

    // Across the year
    const months = t('months.short').split(',');
    app.appendChild(el('div', { class: 'card' }, [
      cardHead(t('sec.bymonth')),
      R.bars(stats.byMonth.map((v, i) => ({ label: months[i], value: v })), { fmt: (v) => R.fmtHours(v) }),
    ]));
  }

  function genreCard() {
    const rows = genreRows(stats);
    if (rows.length) {
      const total = rows.reduce((n, r) => n + r.value, 0);
      return R.donut(rows, String(rows.length), t('sec.genres'));
    }
    const box = el('div', {});
    box.appendChild(el('div', { class: 'genres-off', text: t('label.genres_off') }));
    const btn = el('button', { class: 'pill enrich-btn', text: t('nav.install') === 'Add to Chrome' ? 'Enable genres' : 'Activer les genres' });
    btn.addEventListener('click', () => doEnrich(btn));
    box.appendChild(btn);
    return box;
  }

  function bingeCard() {
    if (!stats.binge) return el('div', { class: 'card' }, [ cardHead(t('sec.binge')), el('div', { class: 'stx-muted', text: t('label.no_items') }) ]);
    const d = new Date(stats.binge.date);
    return el('div', { class: 'card' }, [
      cardHead(t('sec.binge')),
      el('div', { class: 'binge-head' }, [
        el('span', { class: 'binge-hours', text: R.fmtHours(stats.binge.hours) }),
        el('span', { class: 'binge-date', text: d.toLocaleDateString(I.getLang(), { weekday: 'long', month: 'short', day: 'numeric' }) }),
      ]),
      R.rail(stats.binge.titles, { meta: (it) => R.fmtHours(it.hours) }),
    ]);
  }

  function rewatchedList() {
    return R.rankList(stats.rewatched, {
      sub: (it) => it.isEpisode ? t('label.episodes_n', { n: it.distinctEpisodes }) : R.fmtHours(it.hours),
      value: (it) => t('label.times_n', { n: it.rewatchScore + 1 }),
    });
  }
  function abandonedList() {
    return R.rankList(stats.abandonedList, {
      rank: false,
      sub: (it) => t('label.quit_after', { ep: t('label.ep_n', { n: it.distinctEpisodes }) }),
    });
  }

  /* ---------- drill modal ---------- */
  function drill(title, node) {
    $('drillTitle').textContent = title;
    const body = $('drillBody'); body.textContent = ''; body.appendChild(node);
    $('drillModal').classList.remove('hidden');
  }
  $('drillClose').addEventListener('click', () => $('drillModal').classList.add('hidden'));
  $('drillModal').addEventListener('click', (e) => { if (e.target === $('drillModal')) $('drillModal').classList.add('hidden'); });

  /* ---------- enrichment trigger ---------- */
  async function doEnrich(btn) {
    btn.disabled = true; btn.textContent = t('label.genres_loading');
    const titles = [...new Set(stats.top.concat(stats.rewatched, stats.abandonedList).map((x) => x.title))];
    enrichMap = Object.assign(enrichMap, await window.STX_ENRICH.enrich(titles));
    recompute(); // re-render with posters/genres
  }

  /* ---------- year + recompute ---------- */
  function recompute() {
    stats = S.compute(raw.items, { year: yearSel });
    render();
  }

  /* ---------- export ---------- */
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportJSON() {
    download('statiflix-' + (yearSel || 'all') + '.json', new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }));
  }
  function exportCSV() {
    const rows = [['type', 'title', 'episode', 'date', 'minutes']];
    raw.items.forEach((i) => rows.push([
      i.isEpisode ? 'episode' : 'movie',
      '"' + (i.title || '').replace(/"/g, '""') + '"',
      '"' + (i.episodeTitle || '').replace(/"/g, '""') + '"',
      new Date(i.date).toISOString(),
      Math.round(i.duration / 60),
    ]));
    download('statiflix-history.csv', new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }));
  }
  function exportRecap() {
    const c = buildRecap();
    c.toBlob((b) => download('statiflix-recap-' + (yearSel || 'all') + '.png', b), 'image/png');
  }

  function buildRecap() {
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#0b0b0f'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W * 0.7, 0, 0, W * 0.7, 0, 1400); g.addColorStop(0, '#3a0c10'); g.addColorStop(1, '#0b0b0f');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#E50914'; x.font = '800 64px Helvetica, Arial'; x.fillText('STATIFLIX', 80, 180);
    x.fillStyle = '#9a9aa2'; x.font = '400 38px Helvetica, Arial';
    x.fillText((yearSel || t('dash.all_years')) + ' · ' + (raw.profileName || ''), 80, 240);
    const big = [
      [stats.totals.hours.toLocaleString() + 'h', t('stat.hours')],
      [stats.totals.titles.toLocaleString(), t('stat.titles')],
      [stats.totals.rewatchedTitles.toLocaleString(), t('stat.rewatched')],
      [stats.peak.hour == null ? '—' : hod(stats.peak.hour), t('stat.peak_hour')],
    ];
    let y = 420;
    big.forEach((b) => {
      x.fillStyle = '#fff'; x.font = '800 120px Helvetica, Arial'; x.fillText(b[0], 80, y);
      x.fillStyle = '#9a9aa2'; x.font = '500 36px Helvetica, Arial'; x.fillText(b[1], 80, y + 50);
      y += 230;
    });
    // top titles
    x.fillStyle = '#E50914'; x.font = '700 44px Helvetica, Arial'; x.fillText(t('sec.top').toUpperCase(), 80, y + 40);
    y += 110; x.fillStyle = '#fff'; x.font = '600 42px Helvetica, Arial';
    stats.top.slice(0, 6).forEach((it, i) => { x.fillText((i + 1) + '.  ' + it.title.slice(0, 28), 80, y); y += 70; });
    x.fillStyle = '#6d6d75'; x.font = '400 30px Helvetica, Arial';
    x.fillText('statiflix.zlef.fr · private by design', 80, H - 80);
    return c;
  }

  /* ---------- snapshot for sync/export ---------- */
  function snapshot() {
    return {
      v: 1, kind: 'statiflix-snapshot',
      profileName: raw.profileName || null,
      year: yearSel, generatedAt: Date.now(),
      lang: I.getLang(),
      stats: stats,
    };
  }

  /* ---------- wiring ---------- */
  function buildYearSelect() {
    const sel = $('year'); sel.textContent = '';
    const all = document.createElement('option'); all.value = ''; all.textContent = t('dash.all_years'); sel.appendChild(all);
    stats.span.years.forEach((y) => { const o = document.createElement('option'); o.value = y; o.textContent = y; sel.appendChild(o); });
    sel.value = yearSel || '';
    sel.onchange = () => { yearSel = sel.value ? Number(sel.value) : null; recompute(); $('year').value = yearSel || ''; };
  }

  function buildLangSelect() {
    const sel = $('lang'); sel.textContent = '';
    I.langs.forEach((l) => { const o = document.createElement('option'); o.value = l; o.textContent = l.toUpperCase(); sel.appendChild(o); });
    sel.value = I.getLang();
    sel.onchange = () => { I.setLang(sel.value); recompute(); buildYearSelect(); };
  }

  async function init() {
    I.applyDOM(document);
    raw = await load();
    if (!raw || !raw.items || !raw.items.length) {
      stats = S.emptyStats(); render();
      buildLangSelect();
      return;
    }
    // default to most recent year that has data
    const full = S.compute(raw.items, {});
    yearSel = full.span.years.length ? full.span.years[0] : null;
    stats = S.compute(raw.items, { year: yearSel });
    $('sub').textContent = raw.profileName ? '· ' + raw.profileName : '';

    buildLangSelect();
    buildYearSelect();
    render();

    // sync modal
    const sync = window.STX_SYNC.wire({
      modal: $('syncModal'), qrBox: $('qrBox'), status: $('syncStatus'),
      copyBtn: $('copyLink'), closeBtn: $('syncClose'),
    }, snapshot);
    $('syncBtn').addEventListener('click', sync.open);

    // export menu
    const em = $('exportMenu');
    $('exportBtn').addEventListener('click', (e) => { e.stopPropagation(); em.classList.toggle('hidden'); });
    document.addEventListener('click', () => em.classList.add('hidden'));
    em.addEventListener('click', (e) => {
      const act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'json') exportJSON(); else if (act === 'csv') exportCSV(); else if (act === 'recap') exportRecap();
      em.classList.add('hidden');
    });

    // auto-enable enrichment if relay has a key (covers/genres light up automatically)
    if (await window.STX_ENRICH.available()) {
      const titles = [...new Set(stats.top.concat(stats.rewatched, stats.abandonedList).map((x) => x.title))];
      enrichMap = await window.STX_ENRICH.enrich(titles);
      recompute();
    }
  }

  init();
})();
