/* Statiflix — dashboard controller. Loads local data, computes stats per selected
 * year, renders the Netflix-themed UI, and wires sync / export / drill-downs. */
(function () {
  'use strict';
  const I = window.STX_I18N, R = window.STX_RENDER, S = window.STX_STATS;
  const t = I.t, el = R.el;
  const $ = (id) => document.getElementById(id);
  const DATA_KEY = 'statiflix.data';

  let raw = null;          // { items, profileName, art, fetchedAt }
  let yearSel = null;      // number or null (all time, the default)
  let stats = null;        // computed for current year
  let globalStats = null;  // all-time (abandoned is a lifetime property, never per-year)
  let enrichMap = {};      // title -> { poster, genres }
  let allYears = [];       // all years with data (desc)

  function load() { return new Promise((res) => chrome.storage.local.get([DATA_KEY], (o) => res(o[DATA_KEY] || null))); }

  /* ---------- decorate with real Netflix art + genres (TMDB as fallback) ---------- */
  function artFor(key) { const a = (raw && raw.art) || {}; return a[key.slice(1)] || null; } // key 's<id>'|'m<id>'
  function dec(it) {
    const na = artFor(it.key), tm = enrichMap[it.title];
    it.poster = (na && na.banner) || (tm && tm.poster) || null;
    it.genres = (na && na.genres && na.genres.length ? na.genres : (tm && tm.genres)) || null;
    return it;
  }
  function decorate(s) {
    s.top.forEach(dec);
    if (s.binge) s.binge.titles.forEach(dec);
    if (globalStats) globalStats.abandonedList.forEach(dec);
  }
  function genreRows(s) {
    const counts = {};
    const seen = new Set();
    s.top.concat(globalStats ? globalStats.abandonedList : []).forEach((it) => {
      if (seen.has(it.key)) return; seen.add(it.key);
      const g = it.genres || (artFor(it.key) && artFor(it.key).genres) || (enrichMap[it.title] && enrichMap[it.title].genres);
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
    decorate(stats);
    const app = $('app');
    app.textContent = '';
    if (stats.empty) { $('empty').classList.remove('hidden'); app.classList.add('hidden'); return; }
    $('empty').classList.add('hidden'); app.classList.remove('hidden');

    const days = t('days.short').split(',');

    // KPIs
    app.appendChild(el('div', { class: 'kpis' }, [
      kpi(t('stat.hours'), stats.totals.hours.toLocaleString(), t('stat.hours_unit'), { red: true }),
      kpi(t('stat.titles'), stats.totals.titles.toLocaleString()),
      kpi(t('stat.episodes'), stats.totals.episodes.toLocaleString()),
      kpi(t('stat.movies'), stats.totals.movies.toLocaleString()),
    ]));
    app.appendChild(el('div', { class: 'kpis' }, [
      kpi(t('stat.peak_hour'), stats.peak.hour == null ? '—' : hod(stats.peak.hour)),
      kpi(t('stat.peak_day'), stats.peak.day == null ? '—' : days[stats.peak.day]),
      kpi(t('stat.streak'), String(stats.streak), t('stat.days')),
      kpi(t('stat.abandoned'), globalStats.totals.abandoned.toLocaleString(), t('stat.titles_unit'),
        { onClick: globalStats.abandonedList.length ? () => drill(t('sec.abandoned'), abandonedList()) : null }),
    ]));

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

    // By weekday + binge
    app.appendChild(el('div', { class: 'grid cols2b' }, [
      el('div', { class: 'card' }, [
        cardHead(t('sec.byday')),
        R.bars(stats.byDay.map((v, i) => ({ label: days[i], value: v })), { fmt: (v) => R.fmtHours(v) }),
      ]),
      bingeCard(),
    ]));

    // Abandoned (all-time, real signals — a lifetime property, never per-year)
    if (globalStats.abandonedList.length) {
      app.appendChild(el('div', { class: 'card' }, [
        cardHead(t('sec.abandoned'), t('sec.abandoned_sub'), globalStats.abandonedList.length > 6 ? () => drill(t('sec.abandoned'), abandonedList()) : null),
        R.rankList(globalStats.abandonedList.slice(0, 6), { rank: false, sub: abandonedSub, value: (it) => R.fmtHours(it.hours) }),
      ]));
    }

    // Across the year (year navigation + drill: year → month → day → titles)
    app.appendChild(timeWidget());
  }

  /* ---------- abandoned label ---------- */
  function abandonedSub(it) {
    if (it.isEpisode) return t('label.eps_of', { n: it.distinctEpisodes, total: it.episodeCount });
    const pct = it.pct != null ? it.pct : Math.round(((it.bm && it.rt) ? it.bm / it.rt : 0) * 100);
    return t('label.pct_watched', { pct });
  }

  /* ---------- across-the-year widget + time drill ---------- */
  function inYM(it, y, m) { const d = new Date(it.date); return d.getFullYear() === y && (m == null || d.getMonth() === m); }
  function hoursOfYear(y) { let s = 0; raw.items.forEach((it) => { if (inYM(it, y)) s += it.duration / 3600; }); return s; }

  function timeWidget() {
    const months = t('months.short').split(',');
    const card = el('div', { class: 'card' });
    const head = el('div', { class: 'card-head' }, [ el('h3', { text: t('sec.bymonth') }) ]);
    const years = allYears;
    if (years.length) {
      const minY = years[years.length - 1], maxY = years[0];
      const prev = el('button', { class: 'ynav', text: '‹' });
      const lbl = el('span', { class: 'ynav-lbl', text: yearSel == null ? t('dash.all_years') : String(yearSel) });
      const next = el('button', { class: 'ynav', text: '›' });
      prev.disabled = yearSel != null && yearSel <= minY;
      next.disabled = yearSel == null || yearSel >= maxY;
      prev.onclick = () => { const ny = yearSel == null ? maxY : yearSel - 1; if (ny >= minY) setYear(ny); };
      next.onclick = () => { if (yearSel != null && yearSel < maxY) setYear(yearSel + 1); };
      head.appendChild(el('div', { class: 'yearnav' }, [prev, lbl, next]));
    }
    card.appendChild(head);

    if (yearSel == null) {
      const rows = allYears.slice().sort((a, b) => a - b).map((y) => ({ label: String(y), value: hoursOfYear(y), y }));
      card.appendChild(R.bars(rows, { fmt: (v) => R.fmtHours(v), onClick: (r) => setYear(r.y) }));
    } else {
      const rows = stats.byMonth.map((v, i) => ({ label: months[i], value: v, m: i }));
      card.appendChild(R.bars(rows, { fmt: (v) => R.fmtHours(v), onClick: (r) => monthDrill(yearSel, r.m) }));
    }
    return card;
  }

  function monthDays(y, m) {
    const map = {};
    raw.items.forEach((it) => { const d = new Date(it.date); if (d.getFullYear() === y && d.getMonth() === m) { const day = d.getDate(); (map[day] = map[day] || { hours: 0 }).hours += it.duration / 3600; } });
    return map;
  }
  function dayTitles(y, m, day) {
    const g = {};
    raw.items.forEach((it) => {
      const d = new Date(it.date);
      if (d.getFullYear() === y && d.getMonth() === m && d.getDate() === day) {
        const key = it.seriesId ? ('s' + it.seriesId) : (it.id ? ('m' + it.id) : ('t' + it.title));
        const o = g[key] || (g[key] = { key, title: it.title, hours: 0, eps: 0, isEpisode: it.isEpisode });
        o.hours += it.duration / 3600; if (it.isEpisode) o.eps++;
      }
    });
    return Object.values(g).map(dec).sort((a, b) => b.hours - a.hours);
  }
  function monthDrill(year, month) {
    const months = t('months.short').split(','), days = t('days.short').split(',');
    const map = monthDays(year, month);
    const ds = Object.keys(map).map(Number).sort((a, b) => a - b);
    let node;
    if (!ds.length) node = el('div', { class: 'stx-muted', text: t('label.no_items') });
    else {
      const max = Math.max.apply(null, ds.map((d) => map[d].hours).concat([0.001]));
      node = el('div', { class: 'stx-bars' });
      ds.forEach((d) => {
        const pct = Math.max(3, Math.round(map[d].hours / max * 100));
        const wd = days[(new Date(year, month, d).getDay() + 6) % 7];
        node.appendChild(el('div', { class: 'stx-bar clickable', onclick: () => dayDrill(year, month, d) }, [
          el('div', { class: 'stx-bar-top' }, [ el('span', { text: wd + ' ' + d }), el('span', { class: 'stx-muted', text: R.fmtHours(map[d].hours) }) ]),
          el('div', { class: 'stx-bar-track' }, [ el('div', { class: 'stx-bar-fill', style: 'width:' + pct + '%' }) ]),
        ]));
      });
    }
    drill(months[month] + ' ' + year, node, null);
  }
  function dayDrill(year, month, day) {
    const titles = dayTitles(year, month, day);
    const node = R.rankList(titles, { rank: false, sub: (it) => it.isEpisode ? t('label.episodes_n', { n: it.eps }) : t('label.movie'), value: (it) => R.fmtHours(it.hours) });
    const dateStr = new Date(year, month, day).toLocaleDateString(I.getLang(), { weekday: 'long', day: 'numeric', month: 'long' });
    drill(dateStr, node, () => monthDrill(year, month));
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

  function abandonedList() {
    return R.rankList(globalStats.abandonedList, { rank: false, sub: abandonedSub, value: (it) => R.fmtHours(it.hours) });
  }

  /* ---------- drill modal (supports nested back navigation) ---------- */
  function drill(title, node, backFn) {
    const head = $('drillTitle'); head.textContent = '';
    if (backFn) head.appendChild(el('button', { class: 'drill-back', text: '‹', onclick: backFn }));
    head.appendChild(document.createTextNode(title));
    const body = $('drillBody'); body.textContent = ''; body.appendChild(node);
    $('drillModal').classList.remove('hidden');
  }
  $('drillClose').addEventListener('click', () => $('drillModal').classList.add('hidden'));
  $('drillModal').addEventListener('click', (e) => { if (e.target === $('drillModal')) $('drillModal').classList.add('hidden'); });

  /* ---------- enrichment trigger ---------- */
  async function doEnrich(btn) {
    btn.disabled = true; btn.textContent = t('label.genres_loading');
    const titles = [...new Set(stats.top.concat(globalStats.abandonedList).map((x) => x.title))];
    enrichMap = Object.assign(enrichMap, await window.STX_ENRICH.enrich(titles));
    recompute(); // re-render with posters/genres
  }

  /* ---------- year + recompute ---------- */
  function setYear(y) {
    yearSel = y;
    const sel = $('year'); if (sel) sel.value = y == null ? '' : String(y);
    recompute();
  }
  function recompute() {
    stats = yearSel == null ? globalStats : S.compute(raw.items, { year: yearSel, meta: raw.art });
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
      [stats.totals.episodes.toLocaleString(), t('stat.episodes')],
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
    // Sync the current view's stats, but always carry the all-time abandoned list
    // (it's a lifetime property, not a per-year one).
    const out = Object.assign({}, stats, { abandonedList: globalStats.abandonedList, totals: Object.assign({}, stats.totals, { abandoned: globalStats.totals.abandoned }) });
    return {
      v: 1, kind: 'statiflix-snapshot',
      profileName: raw.profileName || null,
      year: yearSel, generatedAt: Date.now(),
      lang: I.getLang(),
      stats: out,
    };
  }

  /* ---------- wiring ---------- */
  function buildYearSelect() {
    const sel = $('year'); sel.textContent = '';
    const all = document.createElement('option'); all.value = ''; all.textContent = t('dash.all_years'); sel.appendChild(all);
    stats.span.years.forEach((y) => { const o = document.createElement('option'); o.value = y; o.textContent = y; sel.appendChild(o); });
    sel.value = yearSel || '';
    sel.onchange = () => setYear(sel.value ? Number(sel.value) : null);
  }

  /* ---------- screen switching ---------- */
  const SCREENS = ['app', 'empty', 'loading', 'harvestErr'];
  function showScreen(id) { SCREENS.forEach((s) => $(s).classList.toggle('hidden', s !== id)); }

  /* ---------- harvest ---------- */
  async function runHarvest() {
    showScreen('loading');
    $('loadMsg').textContent = t('load.starting');
    $('loadBar').style.width = '0%';
    $('loadSub').textContent = '';
    try {
      const res = await window.STX_HARVEST.run((phase, done, total) => {
        if (phase === 'history') { $('loadMsg').textContent = t('load.history', { done, total }); $('loadBar').style.width = (total ? Math.min(50, (done / total) * 50) : 5) + '%'; }
        else if (phase === 'meta') { $('loadMsg').textContent = t('load.meta', { done, total }); $('loadBar').style.width = (50 + (total ? (done / total) * 25 : 0)) + '%'; }
        else if (phase === 'art') { $('loadMsg').textContent = t('load.art', { done, total }); $('loadBar').style.width = (75 + (total ? (done / total) * 25 : 0)) + '%'; }
        else if (phase === 'done') { $('loadBar').style.width = '100%'; }
      });
      raw = { items: res.items, profileName: res.profileName, art: res.art || {}, fetchedAt: res.fetchedAt };
      await chrome.storage.local.set({ [DATA_KEY]: raw });
      boot();
    } catch (e) {
      const code = (e && e.code) || 'UNKNOWN';
      const map = {
        NOT_LOGGED_IN: ['err.login_title', 'err.login_body'],
        EMPTY: ['err.empty_title', 'err.empty_body'],
        API_ERROR: ['err.api_title', 'err.api_body'],
      };
      const [tk, bk] = map[code] || ['err.generic_title', 'err.generic_body'];
      $('errTitle').textContent = t(tk); $('errBody').textContent = t(bk);
      showScreen('harvestErr');
    }
  }

  /* ---------- boot (render with data in `raw`) ---------- */
  function boot() {
    globalStats = S.compute(raw.items, { meta: raw.art });   // all-time (lifetime totals + abandoned)
    allYears = globalStats.span.years;
    yearSel = null;                                          // default: All time, so totals match reality
    stats = globalStats;
    $('sub').textContent = raw.profileName ? '· ' + raw.profileName : '';
    showScreen('app');
    buildYearSelect();
    render();

    // auto-enable TMDB enrichment only as a fallback for titles lacking Netflix art
    window.STX_ENRICH.available().then(async (ok) => {
      if (!ok) return;
      const titles = [...new Set(globalStats.top.concat(globalStats.abandonedList).filter((x) => !artFor(x.key)).map((x) => x.title))];
      if (!titles.length) return;
      enrichMap = Object.assign(enrichMap, await window.STX_ENRICH.enrich(titles));
      recompute();
    });
  }

  async function init() {
    I.applyDOM(document);

    // wire persistent controls (live across screens)
    const sync = window.STX_SYNC.wire({
      modal: $('syncModal'), qrBox: $('qrBox'), status: $('syncStatus'),
      copyBtn: $('copyLink'), closeBtn: $('syncClose'),
    }, snapshot);
    $('syncBtn').addEventListener('click', sync.open);
    const em = $('exportMenu');
    $('exportBtn').addEventListener('click', (e) => { e.stopPropagation(); em.classList.toggle('hidden'); });
    document.addEventListener('click', () => em.classList.add('hidden'));
    em.addEventListener('click', (e) => {
      const act = e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'json') exportJSON(); else if (act === 'csv') exportCSV(); else if (act === 'recap') exportRecap();
      em.classList.add('hidden');
    });
    $('emptyAnalyze').addEventListener('click', runHarvest);
    $('errRetry').addEventListener('click', runHarvest);

    const params = new URLSearchParams(location.search);
    raw = await load();
    const hasData = raw && raw.items && raw.items.length;
    if (params.get('run') === '1' || !hasData) runHarvest();  // force refresh, or first run
    else boot();
  }

  init();
})();
