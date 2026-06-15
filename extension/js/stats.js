/* Statiflix — stats engine (pure, no DOM, no network).
 *
 * Input: normalized viewing items from content.js:
 *   { id, seriesId, title, episodeTitle, isEpisode, date(ms), duration(s), bookmark }
 *
 * Output: a `Stats` object the dashboard and the PWA both render. The same code
 * runs in the extension and (bundled into the snapshot) is not needed on mobile —
 * the mobile PWA receives the already-computed Stats, so this file stays local.
 *
 * Heuristics (documented, since Netflix gives us no "completed" flag):
 *  - Rewatch: a movie seen on ≥2 distinct days, or a series episode logged ≥2×.
 *  - Abandoned: a series with ≤2 distinct episodes watched and no activity in the
 *    last 45 days (you sampled it and never came back).
 *  - A "title" = a movie, or a whole series (episodes are grouped under it).
 */
(function (root) {
  'use strict';

  const DAY_MS = 86400000;
  const ABANDON_GAP_DAYS = 45;

  const hoursOf = (sec) => sec / 3600;
  const dayKey = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // JS getDay(): 0=Sun..6=Sat. We want 0=Mon..6=Sun for display.
  const dow = (ms) => (new Date(ms).getDay() + 6) % 7;

  function emptyStats() {
    return {
      generatedAt: Date.now(),
      empty: true,
      totals: { hours: 0, items: 0, titles: 0, episodes: 0, movies: 0, rewatchedTitles: 0, abandoned: 0 },
      span: { first: null, last: null, years: [] },
      heatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
      peak: { hour: null, day: null },
      byHour: new Array(24).fill(0),
      byDay: new Array(7).fill(0),
      byMonth: new Array(12).fill(0),
      top: [], rewatched: [], abandonedList: [], binge: null, streak: 0,
      titles: {},
    };
  }

  // Build per-title aggregates. key = seriesId||('m'+id)||('t'+title)
  function compute(items, opts) {
    opts = opts || {};
    if (!items || !items.length) return emptyStats();

    // Optional year filter.
    if (opts.year) items = items.filter((i) => new Date(i.date).getFullYear() === opts.year);
    if (!items.length) return emptyStats();

    const s = emptyStats();
    s.empty = false;

    const titles = {};          // key -> aggregate
    const dayHours = {};         // dayKey -> hours (for binge + streak)
    let first = Infinity, last = -Infinity;

    for (const it of items) {
      const h = hoursOf(it.duration);
      s.totals.hours += h;
      s.totals.items++;
      if (it.date < first) first = it.date;
      if (it.date > last) last = it.date;

      const d = dow(it.date), hr = new Date(it.date).getHours(), mo = new Date(it.date).getMonth();
      s.heatmap[d][hr] += h;
      s.byHour[hr] += h;
      s.byDay[d] += h;
      s.byMonth[mo] += h;

      const dk = dayKey(it.date);
      dayHours[dk] = (dayHours[dk] || 0) + h;

      const key = it.seriesId ? ('s' + it.seriesId) : (it.id ? ('m' + it.id) : ('t' + it.title));
      let agg = titles[key];
      if (!agg) {
        agg = titles[key] = {
          key, title: it.title, isEpisode: it.isEpisode,
          hours: 0, sessions: 0, episodeViews: 0,
          episodes: new Set(), days: new Set(), lastDate: 0, firstDate: Infinity,
          poster: null, genres: null,
        };
      }
      agg.hours += h;
      agg.sessions++;
      agg.days.add(dk);
      if (it.date > agg.lastDate) agg.lastDate = it.date;
      if (it.date < agg.firstDate) agg.firstDate = it.date;
      if (it.isEpisode) {
        agg.episodeViews++;
        if (it.id) agg.episodes.add(it.id);
      }
    }

    s.span.first = first; s.span.last = last;
    const yset = new Set();
    for (let t = first; t <= last; t += DAY_MS) { /* no-op */ break; }
    items.forEach((i) => yset.add(new Date(i.date).getFullYear()));
    s.span.years = Array.from(yset).sort((a, b) => b - a);

    // Peaks.
    s.peak.hour = s.byHour.indexOf(Math.max(...s.byHour));
    s.peak.day = s.byDay.indexOf(Math.max(...s.byDay));

    // Finalize titles.
    const arr = Object.values(titles).map((a) => {
      const distinctEps = a.episodes.size;
      // rewatch score: for series = episode re-views (extra plays of same ep);
      // for movies = extra days beyond the first.
      const rewatchScore = a.isEpisode
        ? Math.max(0, a.episodeViews - distinctEps)
        : Math.max(0, a.days.size - 1);
      return {
        key: a.key, title: a.title, isEpisode: a.isEpisode,
        hours: a.hours, sessions: a.sessions,
        distinctEpisodes: distinctEps, episodeViews: a.episodeViews,
        days: a.days.size, lastDate: a.lastDate, firstDate: a.firstDate,
        rewatchScore,
      };
    });

    s.totals.titles = arr.length;
    s.totals.episodes = arr.reduce((n, a) => n + a.episodeViews, 0);
    s.totals.movies = arr.filter((a) => !a.isEpisode).length;

    // Top by hours.
    s.top = arr.slice().sort((a, b) => b.hours - a.hours).slice(0, 24);

    // Rewatched.
    const rew = arr.filter((a) => a.rewatchScore > 0).sort((a, b) => b.rewatchScore - a.rewatchScore);
    s.rewatched = rew.slice(0, 24);
    s.totals.rewatchedTitles = rew.length;

    // Abandoned: series, ≤2 distinct eps, dormant > 45d.
    const now = Date.now();
    const ab = arr.filter((a) =>
      a.isEpisode && a.distinctEpisodes > 0 && a.distinctEpisodes <= 2 &&
      (now - a.lastDate) > ABANDON_GAP_DAYS * DAY_MS
    ).sort((a, b) => a.distinctEpisodes - b.distinctEpisodes || b.lastDate - a.lastDate);
    s.abandonedList = ab.slice(0, 24);
    s.totals.abandoned = ab.length;

    // Binge day + streak.
    const dayKeys = Object.keys(dayHours).sort();
    let bestDay = null, bestH = 0;
    for (const k in dayHours) if (dayHours[k] > bestH) { bestH = dayHours[k]; bestDay = k; }
    if (bestDay) {
      const bingeItems = items
        .filter((i) => dayKey(i.date) === bestDay)
        .reduce((m, i) => {
          const key = i.seriesId ? ('s' + i.seriesId) : (i.id ? ('m' + i.id) : ('t' + i.title));
          (m[key] = m[key] || { title: i.title, hours: 0, key }).hours += hoursOf(i.duration);
          return m;
        }, {});
      s.binge = {
        date: new Date(bestDay + 'T00:00:00').getTime(),
        hours: bestH,
        titles: Object.values(bingeItems).sort((a, b) => b.hours - a.hours).slice(0, 8),
      };
    }
    // Longest consecutive-day streak.
    let streak = 0, best = 0, prev = null;
    for (const k of dayKeys) {
      const t = new Date(k + 'T00:00:00').getTime();
      if (prev !== null && Math.round((t - prev) / DAY_MS) === 1) streak++;
      else streak = 1;
      if (streak > best) best = streak;
      prev = t;
    }
    s.streak = best;

    // Round hours for transport.
    s.totals.hours = Math.round(s.totals.hours);
    s.top.forEach((a) => (a.hours = Math.round(a.hours * 10) / 10));
    s.rewatched.forEach((a) => (a.hours = Math.round(a.hours * 10) / 10));
    if (s.binge) { s.binge.hours = Math.round(s.binge.hours * 10) / 10; s.binge.titles.forEach((t) => (t.hours = Math.round(t.hours * 10) / 10)); }

    return s;
  }

  root.STX_STATS = { compute, emptyStats };
})(typeof window !== 'undefined' ? window : this);
