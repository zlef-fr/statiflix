/* Statiflix — shared rendering helpers (DOM-safe, no innerHTML of user data).
 * Used by the dashboard (extension) and the mobile PWA. Builds the Netflix-themed
 * stat components from a Stats object. Real posters appear only when enrichment is
 * available; otherwise we draw a deterministic gradient "poster" from the title,
 * which keeps the experience fully private and offline. */
(function (root) {
  'use strict';
  const t = (k, v) => (root.STX_I18N ? root.STX_I18N.t(k, v) : k);

  function el(tag, props, kids) {
    const n = document.createElement(tag);
    if (props) for (const k in props) {
      if (k === 'class') n.className = props[k];
      else if (k === 'style') n.style.cssText = props[k];
      else if (k === 'text') n.textContent = props[k];
      else if (k === 'html') n.innerHTML = props[k]; // only ever called with our own static markup
      else if (k.startsWith('on') && typeof props[k] === 'function') n.addEventListener(k.slice(2), props[k]);
      else if (props[k] != null) n.setAttribute(k, props[k]);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach((c) => {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  // Deterministic hue from a string → gradient poster.
  function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i); return h >>> 0; }
  function posterStyle(title) {
    const h = hash(title || 'x');
    const a = h % 360, b = (a + 40 + (h >> 3) % 60) % 360;
    return `background:linear-gradient(135deg,hsl(${a} 45% 22%),hsl(${b} 55% 38%))`;
  }
  function poster(item, size) {
    size = size || 'md';
    const cls = 'stx-poster stx-poster-' + size;
    if (item && item.poster) {
      return el('div', { class: cls, style: 'overflow:hidden' }, [
        el('img', { src: item.poster, alt: item.title || '', loading: 'lazy', style: 'width:100%;height:100%;object-fit:cover;display:block' }),
      ]);
    }
    const node = el('div', { class: cls, style: posterStyle(item && item.title) }, [
      el('span', { class: 'stx-poster-ini', text: initials(item && item.title) }),
    ]);
    return node;
  }
  function initials(title) {
    if (!title) return '?';
    return title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  const fmtH = (h) => (h >= 10 ? Math.round(h) : Math.round(h * 10) / 10);
  function fmtHours(h) { return t('label.hours_n', { n: fmtH(h) }); }

  // 7×24 heatmap → grid of cells, Netflix-red intensity scale.
  function heatmap(stats) {
    const days = t('days.short').split(',');
    let max = 0;
    stats.heatmap.forEach((row) => row.forEach((v) => { if (v > max) max = v; }));
    const wrap = el('div', { class: 'stx-heat' });
    for (let d = 0; d < 7; d++) {
      const row = el('div', { class: 'stx-heat-row' });
      row.appendChild(el('span', { class: 'stx-heat-lbl', text: days[d] }));
      const cells = el('div', { class: 'stx-heat-cells' });
      for (let h = 0; h < 24; h++) {
        const v = stats.heatmap[d][h];
        const a = max ? v / max : 0;
        const bg = a <= 0 ? 'rgba(255,255,255,.05)'
          : `rgba(229,9,20,${(0.18 + a * 0.82).toFixed(3)})`;
        cells.appendChild(el('div', {
          class: 'stx-heat-cell', style: 'background:' + bg,
          title: `${days[d]} ${h}:00 — ${fmtHours(v)}`,
        }));
      }
      row.appendChild(cells);
      wrap.appendChild(row);
    }
    const axis = el('div', { class: 'stx-heat-axis' }, [
      el('span', { text: '6a' }), el('span', { text: '12p' }), el('span', { text: '6p' }), el('span', { text: '12a' }),
    ]);
    return el('div', {}, [wrap, axis]);
  }

  // Horizontal bar list (used for genres, by-day, by-month).
  function bars(rows, opts) {
    opts = opts || {};
    const max = Math.max.apply(null, rows.map((r) => r.value).concat([0.0001]));
    const wrap = el('div', { class: 'stx-bars' });
    rows.forEach((r) => {
      const pct = Math.max(2, Math.round((r.value / max) * 100));
      wrap.appendChild(el('div', { class: 'stx-bar' }, [
        el('div', { class: 'stx-bar-top' }, [
          el('span', { text: r.label }),
          el('span', { class: 'stx-muted', text: opts.fmt ? opts.fmt(r.value) : String(r.value) }),
        ]),
        el('div', { class: 'stx-bar-track' }, [
          el('div', { class: 'stx-bar-fill', style: `width:${pct}%` }),
        ]),
      ]));
    });
    return wrap;
  }

  // Poster rail (Most watched): big posters in a horizontal scroller.
  function rail(items, opts) {
    opts = opts || {};
    const wrap = el('div', { class: 'stx-rail' });
    if (!items.length) return el('div', { class: 'stx-muted', text: t('label.no_items') });
    items.forEach((it, i) => {
      const meta = opts.meta ? opts.meta(it, i) : '';
      wrap.appendChild(el('div', { class: 'stx-rail-item' }, [
        opts.badge ? badged(poster(it, 'rail'), opts.badge(it)) : poster(it, 'rail'),
        el('div', { class: 'stx-rail-title', text: it.title }),
        meta ? el('div', { class: 'stx-rail-meta', text: meta }) : null,
      ]));
    });
    return wrap;
  }
  function badged(node, label) {
    if (!label) return node;
    return el('div', { class: 'stx-badge-wrap' }, [node, el('span', { class: 'stx-badge', text: label })]);
  }

  // Ranked list with small posters (rewatched / abandoned drill-downs).
  function rankList(items, opts) {
    opts = opts || {};
    const wrap = el('div', { class: 'stx-rank' });
    if (!items.length) return el('div', { class: 'stx-muted', text: t('label.no_items') });
    items.forEach((it, i) => {
      wrap.appendChild(el('div', { class: 'stx-rank-row' }, [
        opts.rank !== false ? el('span', { class: 'stx-rank-n', text: String(i + 1) }) : null,
        poster(it, 'sm'),
        el('div', { class: 'stx-rank-body' }, [
          el('div', { class: 'stx-rank-title', text: it.title }),
          el('div', { class: 'stx-rank-sub', text: opts.sub ? opts.sub(it) : '' }),
        ]),
        opts.value ? el('span', { class: 'stx-rank-val', text: opts.value(it) }) : null,
      ]));
    });
    return wrap;
  }

  // Donut for genres.
  function donut(rows, centerTop, centerBot) {
    const palette = ['#E50914', '#b3121a', '#7a2b2b', '#c98a2e', '#5a5a2b', '#404040', '#8a3a6a', '#2b5a7a'];
    const total = rows.reduce((n, r) => n + r.value, 0) || 1;
    let acc = 0; const segs = [];
    rows.forEach((r, i) => {
      const start = (acc / total) * 100; acc += r.value;
      const end = (acc / total) * 100;
      segs.push(`${palette[i % palette.length]} ${start}% ${end}%`);
    });
    const d = el('div', { class: 'stx-donut', style: `background:conic-gradient(${segs.join(',')})` }, [
      el('div', { class: 'stx-donut-hole' }, [
        el('span', { class: 'stx-donut-top', text: centerTop }),
        el('span', { class: 'stx-donut-bot', text: centerBot }),
      ]),
    ]);
    const legend = el('div', { class: 'stx-legend' });
    rows.forEach((r, i) => legend.appendChild(el('div', { class: 'stx-legend-row' }, [
      el('span', { class: 'stx-legend-dot', style: 'background:' + palette[i % palette.length] }),
      el('span', { text: r.label }),
      el('span', { class: 'stx-muted', style: 'margin-left:auto', text: Math.round((r.value / total) * 100) + '%' }),
    ])));
    return el('div', { class: 'stx-donut-wrap' }, [d, legend]);
  }

  root.STX_RENDER = { el, poster, posterStyle, initials, fmtHours, fmtH, heatmap, bars, rail, rankList, donut, hash };
})(typeof window !== 'undefined' ? window : this);
