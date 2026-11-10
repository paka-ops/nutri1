/* ============================================================================
 * NUTRI.N°1 — Citizen Health & Nutrition Dashboard 360° · moteur graphique
 * ----------------------------------------------------------------------------
 * SVG pur, aucune librairie : les graphiques restent nets, imprimables et
 * légers. Chaque fonction renvoie une chaîne HTML/SVG ; les animations sont
 * déclenchées par CZD_CHARTS.animate() (classes CSS + requestAnimationFrame)
 * et respectent prefers-reduced-motion (voir citizen-dashboard.css).
 *
 *   CZD_CHARTS.ring({value, parts, label})          → anneau de score + sous-scores
 *   CZD_CHARTS.spark(values, opts)                  → micro-courbe
 *   CZD_CHARTS.line({series, labels, opts})         → courbe multi-séries
 *   CZD_CHARTS.bars({items, opts})                  → barres horizontales / verticales
 *   CZD_CHARTS.donut({slices, center})              → répartition macros
 *   CZD_CHARTS.radar({axes, ref})                   → profil métabolique
 *   CZD_CHARTS.gauge({value, color, label})         → jauge semi-circulaire
 *   CZD_CHARTS.diverging({value, max})              → balance énergétique
 *   CZD_CHARTS.growth({points, curve, opts})        → courbe de croissance enfant
 *   CZD_CHARTS.columnWeek({values, target})         → charge glycémique 7 jours
 *   CZD_CHARTS.icon(name)                           → pictogrammes SVG
 *   CZD_CHARTS.animate(root)                        → lance les animations
 * ========================================================================== */
(function (global) {
  'use strict';

  var seq = 0;
  var COUNTS = {};
  var uid = function (p) { seq += 1; return 'czd' + (p || 'x') + seq; };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ------------------------------------------------------------------ */
  /* Icônes (SVG 24×24, currentColor)                                   */
  /* ------------------------------------------------------------------ */
  var ICONS = {
    heart: '<path d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.65 12 20 12 20Z"/>',
    drop: '<path d="M12 3s6 6.2 6 10.2A6 6 0 0 1 6 13.2C6 9.2 12 3 12 3Z"/>',
    scale: '<path d="M12 4v16M6 8h12M8 8l-2 5a2.2 2.2 0 0 0 4 0L8 8Zm8 0-2 5a2.2 2.2 0 0 0 4 0l-2-5Z"/>',
    leaf: '<path d="M20 4c-9 0-14 4.5-14 11a5 5 0 0 0 5 5c6.5 0 9-5 9-16Z"/><path d="M4 20c3-6 7-9 12-10"/>',
    pulse: '<path d="M2 12h4l2.5-7 4 14 3-9 2 2h4.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
    spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/>',
    check: '<path d="M4.5 12.5 9 17l10.5-10.5"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11"/>',
    family: '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3.5 19c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M11.5 19c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"/>',
    chart: '<path d="M4 19V5m0 14h16"/><path d="M8 16v-5m4 5V8m4 8v-3"/>',
    plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>',
    water: '<path d="M7 4h10l-1 15a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2L7 4Z"/>',
    book: '<path d="M5 5h6a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H5V5Zm14 0h-3a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H19V5Z"/>',
    alert: '<path d="M12 4 3 20h18L12 4Z"/><path d="M12 10v4.5M12 17.2v.6"/>',
    download: '<path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 10h18"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6m2 4c2 1 3 2.5 3 5"/>',
    activity: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    logout: '<path d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>'
  };
  function icon(name, cls) {
    var body = ICONS[name] || ICONS.spark;
    return '<svg class="czd-ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Anneau de score principal                                          */
  /* ------------------------------------------------------------------ */
  function ring(opts) {
    opts = opts || {};
    var value = Math.max(0, Math.min(100, opts.value || 0));
    var parts = opts.parts || [];
    var id = uid('ring');
    var R = 86, C = 2 * Math.PI * R;
    var inner = [];
    parts.forEach(function (p, i) {
      var r = 64 - i * 13;
      var c = 2 * Math.PI * r;
      var dash = (Math.max(0, Math.min(100, p.value)) / 100) * c;
      inner.push(
        '<circle class="czd-ring__track" cx="110" cy="110" r="' + r + '" fill="none" stroke="rgba(15,45,30,.09)" stroke-width="6" />' +
        '<circle class="czd-ring__sub" cx="110" cy="110" r="' + r + '" fill="none" stroke="' + (p.color || '#0f9d58') + '" ' +
        'stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="' + (dash / c).toFixed(4) + ' 1" ' +
        'transform="rotate(-90 110 110)" data-delay="' + (240 + i * 110) + '" />'
      );
    });
    return '' +
      '<div class="czd-ring" role="img" aria-label="' + esc(opts.aria || ('Score ' + value)) + '">' +
        '<svg viewBox="0 0 220 220" class="czd-ring__svg">' +
          '<defs>' +
            '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0%" stop-color="#1a9e63"/><stop offset="55%" stop-color="#8fd14f"/><stop offset="100%" stop-color="#f2c94c"/>' +
            '</linearGradient>' +
            '<filter id="' + id + 'glow" x="-40%" y="-40%" width="180%" height="180%">' +
              '<feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
            '</filter>' +
          '</defs>' +
          '<circle cx="110" cy="110" r="' + R + '" fill="none" stroke="rgba(15,45,30,.07)" stroke-width="15" />' +
          '<circle class="czd-ring__main" cx="110" cy="110" r="' + R + '" fill="none" stroke="url(#' + id + ')" stroke-width="15" ' +
            'stroke-linecap="round" pathLength="1" stroke-dasharray="' + (value / 100).toFixed(4) + ' 1" ' +
            'transform="rotate(-90 110 110)" filter="url(#' + id + 'glow)" data-delay="0" />' +
          inner.join('') +
          '<g class="czd-ring__ticks">' + tickMarks(110, 110, 97, 108) + '</g>' +
        '</svg>' +
        '<div class="czd-ring__center">' +
          '<span class="czd-ring__value" data-count="' + value + '" data-count-key="score">0</span>' +
          '<span class="czd-ring__unit">/ 100</span>' +
          (opts.label ? '<span class="czd-ring__label">' + esc(opts.label) + '</span>' : '') +
        '</div>' +
      '</div>';
  }

  function tickMarks(cx, cy, r1, r2) {
    var out = '';
    for (var i = 0; i < 40; i++) {
      var a = (i / 40) * Math.PI * 2 - Math.PI / 2;
      var long = i % 5 === 0;
      var x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1;
      var x2 = cx + Math.cos(a) * (long ? r2 : r1 + ((r2 - r1) * 0.45)) ;
      var y2 = cy + Math.sin(a) * (long ? r2 : r1 + ((r2 - r1) * 0.45));
      out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" />';
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Micro-courbe                                                      */
  /* ------------------------------------------------------------------ */
  function spark(values, opts) {
    opts = opts || {};
    var id = uid('sp');
    var vals = (values || []).filter(function (v) { return typeof v === 'number' && !isNaN(v); });
    if (vals.length < 2) return '<div class="czd-spark czd-spark--empty"></div>';
    var w = 120, h = opts.height || 34, p = 3;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = (max - min) || 1;
    var pts = vals.map(function (v, i) {
      return [p + (i * (w - 2 * p)) / (vals.length - 1), h - p - ((v - min) / span) * (h - 2 * p)];
    });
    var d = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1); }).join(' ');
    var area = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + h + ' L' + pts[0][0].toFixed(1) + ' ' + h + ' Z';
    var color = opts.color || '#0f9d58';
    var last = pts[pts.length - 1];
    return '<svg class="czd-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity=".28"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path class="czd-spark__area" d="' + area + '" fill="url(#' + id + ')" />' +
      '<path class="czd-spark__line" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" pathLength="1" />' +
      '<circle class="czd-spark__dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.6" fill="' + color + '" />' +
    '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Courbe multi-séries (avec grille, axes, points interactifs)        */
  /* ------------------------------------------------------------------ */
  function line(opts) {
    opts = opts || {};
    var series = (opts.series || []).filter(function (s) { return s && s.values && s.values.length; });
    if (!series.length) return '<div class="czd-chart czd-chart--empty"></div>';
    var labels = opts.labels || series[0].values.map(function (_, i) { return String(i + 1); });
    var W = 640, H = opts.height || 240, pad = { t: 16, r: 18, b: 28, l: 38 };
    var all = [];
    series.forEach(function (s) { all = all.concat(s.values.filter(function (v) { return typeof v === 'number'; })); });
    var min = opts.min != null ? opts.min : Math.min.apply(null, all);
    var max = opts.max != null ? opts.max : Math.max.apply(null, all);
    if (max === min) { max = min + 1; }
    var padY = (max - min) * 0.12;
    var lo = opts.min != null ? min : min - padY;
    var hi = opts.max != null ? max : max + padY;
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var x = function (i) { return pad.l + (i * iw) / Math.max(1, labels.length - 1); };
    var y = function (v) { return pad.t + ih - ((v - lo) / (hi - lo)) * ih; };
    var id = uid('ln');
    var defs = '', grid = '', body = '';

    /* Grille horizontale + libellés Y */
    for (var g = 0; g <= 4; g++) {
      var gy = pad.t + (g * ih) / 4;
      var gv = hi - ((hi - lo) * g) / 4;
      grid += '<line class="czd-chart__grid" x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + gy.toFixed(1) + '" />' +
        '<text class="czd-chart__tick" x="' + (pad.l - 8) + '" y="' + (gy + 3.5).toFixed(1) + '" text-anchor="end">' + fmtTick(gv, opts.tickDecimals) + '</text>';
    }
    /* Libellés X (tous les 2 si trop dense) */
    var step = labels.length > 8 ? 2 : 1;
    labels.forEach(function (lb, i) {
      if (i % step !== 0) return;
      grid += '<text class="czd-chart__tick" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lb) + '</text>';
    });

    series.forEach(function (s, si) {
      var color = s.color || '#0f9d58';
      defs += '<linearGradient id="' + id + 'g' + si + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity=".26"/><stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient>';
      var pts = s.values.map(function (v, i) { return [x(i), y(v)]; });
      var d = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1); }).join(' ');
      if (opts.smooth !== false) {
        d = smoothPath(pts);
      }
      var area = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (pad.t + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (pad.t + ih) + ' Z';
      if (opts.area !== false) body += '<path class="czd-chart__area" d="' + area + '" fill="url(#' + id + 'g' + si + ')" />';
      body += '<path class="czd-chart__line" d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round" ' +
        'pathLength="1" data-delay="' + (si * 140) + '" />';
      if (opts.dots !== false) {
        pts.forEach(function (pt, i) {
          body += '<circle class="czd-chart__dot" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="3.4" fill="#fff" stroke="' + color + '" stroke-width="2" ' +
            'data-delay="' + (400 + i * 22) + '"><title>' + esc((s.label || '') + ' · ' + labels[i] + ' : ' + fmtTick(s.values[i], opts.valueDecimals)) + '</title></circle>';
        });
      }
      /* dernier point mis en avant */
      var lastPt = pts[pts.length - 1];
      body += '<circle class="czd-chart__pulse" cx="' + lastPt[0].toFixed(1) + '" cy="' + lastPt[1].toFixed(1) + '" r="7" fill="' + color + '" opacity=".18" />';
      if (si === series.length - 1 && opts.valueTag !== false) {
        body += '<g class="czd-chart__tag"><rect x="' + (lastPt[0] - 30).toFixed(1) + '" y="' + (lastPt[1] - 26).toFixed(1) + '" width="60" height="19" rx="9" fill="' + color + '"/>' +
          '<text x="' + lastPt[0].toFixed(1) + '" y="' + (lastPt[1] - 12.5).toFixed(1) + '" text-anchor="middle" fill="#fff" font-size="10.5" font-weight="700">' +
          fmtTick(s.values[s.values.length - 1], opts.valueDecimals) + (opts.unit ? ' ' + esc(opts.unit) : '') + '</text></g>';
      }
    });

    var legend = opts.legend === false ? '' : '<div class="czd-chart__legend">' + series.map(function (s) {
      return '<span class="czd-chart__legend-item"><i style="background:' + (s.color || '#0f9d58') + '"></i>' + esc(s.label || '') + '</span>';
    }).join('') + '</div>';

    return '<div class="czd-chart" role="img" aria-label="' + esc(opts.aria || 'Chart') + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="czd-chart__svg">' +
        '<defs>' + defs + '</defs>' + grid + body +
      '</svg>' + legend + '</div>';
  }

  function smoothPath(pts) {
    if (pts.length < 3) return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  function fmtTick(v, dec) {
    if (v == null || isNaN(v)) return '—';
    var d = typeof dec === 'number' ? dec : (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 0 : 1);
    var s = Number(v).toFixed(d);
    if (global.CZD_I18N) return s.replace('.', global.CZD_I18N.lang === 'fr' ? ',' : '.');
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* Barres (horizontales par défaut)                                   */
  /* ------------------------------------------------------------------ */
  function bars(opts) {
    opts = opts || {};
    var items = opts.items || [];
    if (!items.length) return '<div class="czd-bars czd-bars--empty"></div>';
    if (opts.vertical) return columnWeek({ values: items.map(function (i) { return i.value; }), labels: items.map(function (i) { return i.label; }), colors: items.map(function (i) { return i.color; }), target: opts.target });
    return '<div class="czd-bars' + (opts.compact ? ' czd-bars--compact' : '') + '">' + items.map(function (it, i) {
      var max = it.max || 100;
      var p = Math.max(0, Math.min(100, (it.value / max) * 100));
      return '<div class="czd-bars__row" data-delay="' + (i * 70) + '">' +
        '<span class="czd-bars__label">' + esc(it.label) + '</span>' +
        '<span class="czd-bars__track"><i class="czd-bars__fill" style="--w:' + p.toFixed(1) + '%;--c:' + (it.color || '#0f9d58') + '"></i></span>' +
        '<span class="czd-bars__value">' + esc(it.display != null ? it.display : fmtTick(it.value, it.decimals)) + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Colonnes (charge glycémique hebdomadaire)                          */
  /* ------------------------------------------------------------------ */
  function columnWeek(o) {
    o = o || {};
    var values = o.values || [];
    var labels = o.labels || values.map(function (_, i) { return String(i + 1); });
    var colors = o.colors || [];
    var target = o.target;
    var max = Math.max.apply(null, values.concat([target || 0, 1])) * 1.15;
    var W = 640, H = 200, pad = { t: 22, r: 10, b: 26, l: 10 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var bw = Math.min(52, (iw / values.length) * 0.55);
    var body = '';
    if (target) {
      var ty = pad.t + ih - (target / max) * ih;
      body += '<line class="czd-col__target" x1="' + pad.l + '" y1="' + ty.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + ty.toFixed(1) + '" />' +
        '<text class="czd-col__target-label" x="' + (W - pad.r) + '" y="' + (ty - 5).toFixed(1) + '" text-anchor="end">' + fmtTick(target, 0) + '</text>';
    }
    values.forEach(function (v, i) {
      var cx = pad.l + (iw / values.length) * (i + 0.5);
      var h = Math.max(3, (v / max) * ih);
      var color = colors[i] || (v > 130 ? '#c0453c' : v > 100 ? '#d98200' : '#0f9d58');
      body += '<rect class="czd-col__bar" x="' + (cx - bw / 2).toFixed(1) + '" y="' + (pad.t + ih).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="0" rx="6" fill="' + color + '" ' +
        'style="--h:' + h.toFixed(1) + 'px" data-delay="' + (i * 75) + '"><title>' + esc(labels[i] + ' · ' + v) + '</title></rect>' +
        '<text class="czd-col__value" x="' + cx.toFixed(1) + '" y="' + (pad.t + ih - h - 6).toFixed(1) + '" text-anchor="middle" data-delay="' + (i * 75 + 160) + '">' + fmtTick(v, 0) + '</text>' +
        '<text class="czd-col__label" x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(labels[i]) + '</text>';
    });
    return '<div class="czd-chart czd-chart--cols" role="img" aria-label="' + esc(o.aria || 'Columns') + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="czd-chart__svg">' + body + '</svg></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Donut macronutriments                                              */
  /* ------------------------------------------------------------------ */
  function donut(o) {
    o = o || {};
    var slices = (o.slices || []).filter(function (s) { return s.value > 0; });
    var total = slices.reduce(function (a, s) { return a + s.value; }, 0) || 1;
    var R = 62, r = 40, cx = 80, cy = 80;
    var acc = 0, body = '';
    slices.forEach(function (s, i) {
      var frac = s.value / total;
      var a0 = acc * Math.PI * 2 - Math.PI / 2;
      acc += frac;
      var a1 = acc * Math.PI * 2 - Math.PI / 2;
      var large = frac > 0.5 ? 1 : 0;
      var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R;
      var x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
      var x2 = cx + Math.cos(a1) * r, y2 = cy + Math.sin(a1) * r;
      var x3 = cx + Math.cos(a0) * r, y3 = cy + Math.sin(a0) * r;
      var d = 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
        ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
        ' L' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
        ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + x3.toFixed(2) + ' ' + y3.toFixed(2) + ' Z';
      body += '<path class="czd-donut__slice" d="' + d + '" fill="' + (s.color || '#0f9d58') + '" data-delay="' + (i * 90) + '">' +
        '<title>' + esc(s.label + ' : ' + fmtTick(s.value, 0) + (s.unit ? ' ' + s.unit : '')) + '</title></path>';
    });
    return '<div class="czd-donut">' +
      '<svg viewBox="0 0 160 160" class="czd-donut__svg" role="img" aria-label="' + esc(o.aria || 'Distribution') + '">' +
        '<circle cx="80" cy="80" r="51" fill="rgba(15,45,30,.035)" />' + body +
        '<text x="80" y="76" text-anchor="middle" class="czd-donut__center">' + esc(o.centerValue != null ? o.centerValue : '') + '</text>' +
        '<text x="80" y="94" text-anchor="middle" class="czd-donut__sub">' + esc(o.centerLabel || '') + '</text>' +
      '</svg>' +
      '<div class="czd-donut__legend">' + (o.slices || []).map(function (s) {
        return '<div class="czd-donut__item"><i style="background:' + (s.color || '#0f9d58') + '"></i>' +
          '<span>' + esc(s.label) + '</span><b>' + (s.share != null ? fmtTick(s.share, 0) + ' %' : fmtTick(s.value, 0) + ' ' + esc(s.unit || '')) + '</b></div>';
      }).join('') + '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Radar métabolique                                                  */
  /* ------------------------------------------------------------------ */
  function radar(o) {
    o = o || {};
    var axes = o.axes || [];
    if (axes.length < 3) return '';
    var cx = 130, cy = 122, R = 88;
    var n = axes.length;
    var ang = function (i) { return (i / n) * Math.PI * 2 - Math.PI / 2; };
    var pt = function (i, ratio) {
      return [cx + Math.cos(ang(i)) * R * ratio, cy + Math.sin(ang(i)) * R * ratio];
    };
    var rings = '';
    [0.25, 0.5, 0.75, 1].forEach(function (rr) {
      var pts = [];
      for (var i = 0; i < n; i++) { var p = pt(i, rr); pts.push(p[0].toFixed(1) + ',' + p[1].toFixed(1)); }
      rings += '<polygon class="czd-radar__ring" points="' + pts.join(' ') + '" />';
    });
    var spokes = '';
    for (var i = 0; i < n; i++) {
      var p = pt(i, 1);
      spokes += '<line class="czd-radar__spoke" x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" />';
    }
    var poly = [];
    var dots = '';
    var labels = '';
    axes.forEach(function (a, i) {
      var ratio = Math.max(0.08, Math.min(1.1, (a.value || 0) / (a.max || 100)));
      var p = pt(i, ratio);
      poly.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
      dots += '<circle class="czd-radar__dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" fill="#0f9d58" data-delay="' + (320 + i * 60) + '"><title>' + esc(a.label + ' : ' + fmtTick(a.value, 0)) + '</title></circle>';
      var lp = pt(i, 1.22);
      var anchor = Math.abs(lp[0] - cx) < 8 ? 'middle' : (lp[0] > cx ? 'start' : 'end');
      labels += '<text class="czd-radar__label" x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 3).toFixed(1) + '" text-anchor="' + anchor + '">' + esc(a.label) + '</text>';
    });
    var radId = uid('rd');
    return '<div class="czd-radar" role="img" aria-label="' + esc(o.aria || 'Radar') + '">' +
      '<svg viewBox="0 0 260 250" class="czd-radar__svg">' +
        '<defs><radialGradient id="' + radId + '" cx="50%" cy="50%" r="50%">' +
          '<stop offset="0%" stop-color="#22c07a" stop-opacity=".42"/><stop offset="100%" stop-color="#8fd14f" stop-opacity=".16"/>' +
        '</radialGradient></defs>' +
        rings + spokes + labels +
        '<polygon class="czd-radar__shape" points="' + poly.join(' ') + '" fill="url(#' + radId + ')" />' +
        '<polygon class="czd-radar__shape-line" points="' + poly.join(' ') + '" />' +
        dots +
        '<circle cx="' + cx + '" cy="' + cy + '" r="2.5" fill="#0f9d58" opacity=".5"/>' +
      '</svg></div>';
  }

  /* ------------------------------------------------------------------ */
  /* Jauge semi-circulaire (risques)                                    */
  /* ------------------------------------------------------------------ */
  function gauge(o) {
    o = o || {};
    var v = Math.max(0, Math.min(1, o.value || 0));
    var color = o.color || '#d98200';
    var W = 120, H = 70, cx = 60, cy = 62, R = 48;
    var a0 = Math.PI, a1 = Math.PI + Math.PI * v;
    var x0 = cx + Math.cos(a0) * R, y0 = cy + Math.sin(a0) * R;
    var x1 = cx + Math.cos(a1) * R, y1 = cy + Math.sin(a1) * R;
    var large = v > 0.5 ? 1 : 0;
    return '<svg class="czd-gauge" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '">' +
      '<path class="czd-gauge__track" d="M' + (cx - R) + ' ' + cy + ' A' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy + '" fill="none" stroke-width="8" stroke-linecap="round"/>' +
      (v > 0.01 ? '<path class="czd-gauge__fill" d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" ' +
        'fill="none" stroke="' + color + '" stroke-width="8" stroke-linecap="round" pathLength="1" data-delay="120"/>' : '') +
      '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + color + '" opacity=".55"/>' +
    '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Barre divergente (balance énergétique)                             */
  /* ------------------------------------------------------------------ */
  function diverging(o) {
    o = o || {};
    var value = o.value || 0;
    var max = Math.max(1, o.max || 1000);
    var p = Math.max(-1, Math.min(1, value / max));
    var color = value >= 0 ? '#0f9d58' : '#c0453c';
    return '<div class="czd-div">' +
      '<div class="czd-div__axis"></div>' +
      '<div class="czd-div__bar" style="--p:' + (Math.abs(p) * 50).toFixed(1) + '%;--c:' + color + ';' + (value < 0 ? 'right:50%' : 'left:50%') + '"></div>' +
      '<div class="czd-div__labels"><span>' + esc(o.left || '') + '</span><span>' + esc(o.center || '0') + '</span><span>' + esc(o.right || '') + '</span></div>' +
    '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Courbe de croissance enfant                                        */
  /* ------------------------------------------------------------------ */
  function growth(o) {
    o = o || {};
    var points = o.points || [];
    var curve = o.curve || [];
    if (!points.length) return '';
    var W = 460, H = 210, pad = { t: 14, r: 16, b: 28, l: 34 };
    var ages = curve.map(function (c) { return c.age; }).concat(points.map(function (p) { return p.age; }));
    var minA = Math.min.apply(null, ages), maxA = Math.max.apply(null, ages);
    var vals = curve.map(function (c) { return c.bmi; }).concat(points.map(function (p) { return p.bmi; }));
    var minV = Math.min.apply(null, vals) - 1, maxV = Math.max.apply(null, vals) + 1;
    var x = function (a) { return pad.l + ((a - minA) / Math.max(0.001, maxA - minA)) * (W - pad.l - pad.r); };
    var y = function (v) { return pad.t + (H - pad.t - pad.b) - ((v - minV) / (maxV - minV)) * (H - pad.t - pad.b); };
    var refPath = curve.map(function (c, i) { return (i ? 'L' : 'M') + x(c.age).toFixed(1) + ' ' + y(c.bmi).toFixed(1); }).join(' ');
    var ptPath = points.map(function (p, i) { return (i ? 'L' : 'M') + x(p.age).toFixed(1) + ' ' + y(p.bmi).toFixed(1); }).join(' ');
    var dots = points.map(function (p, i) {
      return '<circle class="czd-chart__dot" cx="' + x(p.age).toFixed(1) + '" cy="' + y(p.bmi).toFixed(1) + '" r="4" fill="#0f9d58" stroke="#fff" stroke-width="2" data-delay="' + (300 + i * 90) + '"><title>' + p.age + ' ' + fmtTick(p.bmi, 1) + '</title></circle>';
    }).join('');
    var axis = '';
    curve.forEach(function (c, i) {
      if (i % 2) return;
      axis += '<text class="czd-chart__tick" x="' + x(c.age).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + c.age + '</text>';
    });
    [minV, (minV + maxV) / 2, maxV].forEach(function (v, i) {
      var gy = y(v);
      axis += '<line class="czd-chart__grid" x1="' + pad.l + '" y1="' + gy.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + gy.toFixed(1) + '" />' +
        '<text class="czd-chart__tick" x="' + (pad.l - 6) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end">' + fmtTick(v, 1) + '</text>';
    });
    return '<div class="czd-chart czd-chart--growth" role="img" aria-label="' + esc(o.aria || 'Growth') + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="czd-chart__svg">' + axis +
        '<path class="czd-chart__ref" d="' + refPath + '" fill="none" stroke="#8a9a90" stroke-width="2" stroke-dasharray="6 6" />' +
        '<path class="czd-chart__line" d="' + ptPath + '" fill="none" stroke="#0f9d58" stroke-width="2.8" stroke-linecap="round" pathLength="1" data-delay="120" />' +
        dots +
      '</svg>' +
      '<div class="czd-chart__legend"><span class="czd-chart__legend-item"><i style="background:#0f9d58"></i>' + esc(o.label || '') + '</span>' +
      '<span class="czd-chart__legend-item"><i style="background:#8a9a90"></i>' + esc(o.refLabel || '') + '</span></div>' +
    '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Dark Bento — smooth metric splines                                 */
  /* ------------------------------------------------------------------ */
  function bentoSpline(o) {
    o = o || {};
    var source = o.series || [{ values: o.values || [], color: o.color, area: o.area }];
    var series = source.map(function (s) {
      return {
        values: (s.values || []).map(Number).filter(function (v) { return isFinite(v); }),
        color: s.color || o.color || '#D2F85A',
        area: s.area != null ? s.area : o.area
      };
    }).filter(function (s) { return s.values.length > 1; });
    var id = uid('bento');
    var W = o.width || 300, H = o.height || 132;
    var pad = { t: o.peak === false ? 12 : 32, r: 8, b: 10, l: 8 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var defs = '', body = '', overlays = '';

    series.forEach(function (s, si) {
      var min = o.min != null ? o.min : Math.min.apply(null, s.values);
      var max = o.max != null ? o.max : Math.max.apply(null, s.values);
      if (o.sharedScale && series.length) {
        var all = [];
        series.forEach(function (x) { all = all.concat(x.values); });
        min = o.min != null ? o.min : Math.min.apply(null, all);
        max = o.max != null ? o.max : Math.max.apply(null, all);
      }
      var spread = max - min;
      var lo = o.min != null ? min : min - (spread || Math.max(1, Math.abs(min) * .1)) * .16;
      var hi = o.max != null ? max : max + (spread || Math.max(1, Math.abs(max) * .1)) * .16;
      var pts = s.values.map(function (v, i) {
        return [
          pad.l + (i * iw) / Math.max(1, s.values.length - 1),
          pad.t + ih - ((v - lo) / ((hi - lo) || 1)) * ih
        ];
      });
      var d = smoothPath(pts);
      if (s.area) {
        var gid = id + 'area' + si;
        defs += '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + s.color + '" stop-opacity=".35"/>' +
          '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient>';
        var area = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - pad.b) +
          ' L' + pts[0][0].toFixed(1) + ' ' + (H - pad.b) + ' Z';
        body += '<path class="czd-bento-chart-area" d="' + area + '" fill="url(#' + gid + ')"/>';
      }
      body += '<path class="czd-bento-chart-line" d="' + d + '" stroke="' + s.color + '" pathLength="1" data-delay="' + (si * 120) + '"/>';

      if (si === 0 && o.peak !== false) {
        var peakIndex = typeof o.peakIndex === 'number' ? Math.max(0, Math.min(pts.length - 1, o.peakIndex)) : s.values.indexOf(max);
        if (peakIndex < 0) peakIndex = 0;
        var pt = pts[peakIndex];
        var peakValue = s.values[peakIndex];
        var label = o.peakLabel != null ? String(o.peakLabel) :
          (global.CZD_I18N ? global.CZD_I18N.num(peakValue, o.peakDecimals || 0) : fmtTick(peakValue, o.peakDecimals || 0));
        var bw = Math.max(40, Math.min(76, label.length * 7 + 16));
        var bx = Math.max(2, Math.min(W - bw - 2, pt[0] - bw / 2));
        var by = Math.max(0, pt[1] - 29);
        var badgeColor = o.badgeColor || s.color;
        var badgeText = o.badgeTextColor || '#18191C';
        if (o.dropLine !== false) {
          overlays += '<line class="czd-bento-peak-line" x1="' + pt[0].toFixed(1) + '" y1="' + (pt[1] + 5).toFixed(1) +
            '" x2="' + pt[0].toFixed(1) + '" y2="' + (H - pad.b) + '"/>';
        }
        overlays += '<g class="czd-bento-peak">' +
          '<circle class="czd-bento-peak-glow" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="11" fill="' + s.color + '"/>' +
          '<circle class="czd-bento-peak-dot" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="4.5" fill="' + s.color + '"/>' +
          '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + bw + '" height="21" rx="10.5" fill="' + badgeColor + '"/>' +
          '<text class="czd-bento-peak-badge" x="' + (bx + bw / 2).toFixed(1) + '" y="' + (by + 14.5).toFixed(1) +
            '" text-anchor="middle" fill="' + badgeText + '">' + esc(label) + '</text></g>';
      }
    });

    if (!series.length) {
      return '<svg class="czd-bento-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || '') + '"></svg>';
    }
    return '<svg class="czd-bento-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(o.aria || 'Activity chart') + '">' +
      '<defs>' + defs + '</defs>' + body + overlays + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Dark Bento — 105 px circular sleep gauge                           */
  /* ------------------------------------------------------------------ */
  function sleepRing(o) {
    o = o || {};
    var value = Number(o.value) || 0;
    var goal = Number(o.goal) || 1;
    var progress = o.percent != null ? Number(o.percent) / 100 : value / goal;
    progress = Math.max(0, Math.min(1, isFinite(progress) ? progress : 0));
    var display = o.display != null ? o.display :
      (global.CZD_I18N ? global.CZD_I18N.num(value, 1) : String(value)) + 'h';
    return '<svg viewBox="0 0 105 105" role="img" aria-label="' + esc(o.aria || display) + '">' +
      '<circle cx="52.5" cy="52.5" r="43" fill="none" stroke="#37383F" stroke-width="10"/>' +
      '<circle class="czd-bento-sleep-arc" cx="52.5" cy="52.5" r="43" fill="none" stroke="' + (o.color || '#D2F85A') +
        '" stroke-width="10" stroke-linecap="round" pathLength="1" stroke-dasharray="' + progress.toFixed(4) + ' 1" data-progress="' + progress.toFixed(4) + '"/>' +
      '<text class="czd-bento-sleep-ring-value" x="52.5" y="59" text-anchor="middle" fill="#FFFFFF" transform="rotate(90 52.5 52.5)">' + esc(display) + '</text>' +
      '<title>' + esc(o.aria || display) + '</title></svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Animations                                                         */
  /* ------------------------------------------------------------------ */
  function raf(fn) {
    if (typeof global.requestAnimationFrame === 'function') return global.requestAnimationFrame(fn);
    return setTimeout(function () { fn(Date.now()); }, 16);
  }
  function reduced() {
    try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* Marque chaque élément animé : le module peut être re-rendu (langue, onglet,
     profil) et les nouveaux nœuds doivent rejouer leur animation. */
  function claim(el) {
    if (!el || el.dataset.czdAnimated === '1') return false;
    el.dataset.czdAnimated = '1';
    return true;
  }

  function animate(root) {
    if (!root) return;
    var slow = reduced();

    /* 1. Tracés : dasharray animé via requestAnimationFrame (fiable partout). */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-chart__line, .czd-gauge__fill, .czd-ring__main, .czd-bento-chart-line'), function (el) {
      if (!claim(el)) return;
      var delay = Number(el.getAttribute('data-delay') || 0);
      el.style.strokeDasharray = '1 1';
      el.style.strokeDashoffset = '1';
      setTimeout(function () {
        if (slow) { el.style.strokeDashoffset = '0'; return; }
        raf(function () {
          el.style.transition = 'stroke-dashoffset 1.25s cubic-bezier(.22,1,.36,1)';
          el.style.strokeDashoffset = '0';
        });
      }, slow ? 0 : Math.min(delay, 500));
    });

    /* 1b. Anneau de sommeil : conserve sa progression au lieu de remplir le
       cercle complet comme les simples tracés pathLength="1". */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-bento-sleep-arc'), function (el) {
      if (!claim(el)) return;
      var progress = el.getAttribute('data-progress') || '0';
      el.style.strokeDasharray = '0 1';
      setTimeout(function () {
        el.style.transition = slow ? 'none' : 'stroke-dasharray 1s cubic-bezier(.22,1,.36,1)';
        el.style.strokeDasharray = progress + ' 1';
      }, slow ? 0 : 100);
    });

    /* 2. Sous-anneaux (dasharray déjà calculé) : fondu + rotation. */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-ring__sub'), function (el) {
      if (!claim(el)) return;
      var delay = Number(el.getAttribute('data-delay') || 0);
      el.style.opacity = '0';
      el.style.transformOrigin = '110px 110px';
      el.style.transform = 'rotate(-18deg) scale(.94)';
      setTimeout(function () {
        el.style.transition = 'opacity .7s ease, transform .9s cubic-bezier(.22,1,.36,1)';
        el.style.opacity = '1';
        el.style.transform = 'rotate(0deg) scale(1)';
      }, slow ? 0 : delay);
    });

    /* 3. Compteurs : repartent de la valeur précédente (pas de retour à zéro
       quand seul le score change légèrement). */
    Array.prototype.forEach.call(root.querySelectorAll('[data-count]'), function (el) {
      if (!claim(el)) return;
      var target = Number(el.getAttribute('data-count')) || 0;
      var dec = Number(el.getAttribute('data-count-dec') || 0);
      var key = el.getAttribute('data-count-key');
      var from = key && COUNTS[key] != null ? COUNTS[key] : 0;
      if (slow) { el.textContent = formatCount(target, dec); if (key) COUNTS[key] = target; return; }
      var t0 = null, dur = 1100;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatCount(from + (target - from) * eased, dec);
        if (p < 1) raf(step); else { el.textContent = formatCount(target, dec); if (key) COUNTS[key] = target; }
      }
      raf(step);
    });

    /* 4. Barres horizontales : largeur. */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-bars__row'), function (row) {
      if (!claim(row)) return;
      var delay = Number(row.getAttribute('data-delay') || 0);
      var fill = row.querySelector('.czd-bars__fill');
      if (!fill) return;
      fill.style.width = '0%';
      setTimeout(function () { fill.style.width = 'var(--w)'; }, slow ? 0 : 80 + delay);
    });

    /* 5. Colonnes : hauteur. */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-col__bar'), function (bar) {
      if (!claim(bar)) return;
      var delay = Number(bar.getAttribute('data-delay') || 0);
      var h = bar.style.getPropertyValue('--h') || '0px';
      setTimeout(function () {
        bar.style.transition = slow ? 'none' : 'height .8s cubic-bezier(.22,1,.36,1), y .8s cubic-bezier(.22,1,.36,1)';
        bar.style.height = h;
        bar.setAttribute('y', String(parseFloat(bar.getAttribute('y')) - parseFloat(h)));
      }, slow ? 0 : delay);
    });
    Array.prototype.forEach.call(root.querySelectorAll('.czd-col__value'), function (t) {
      if (!claim(t)) return;
      t.style.opacity = '0';
      setTimeout(function () { t.style.transition = 'opacity .5s ease'; t.style.opacity = '1'; }, slow ? 0 : Number(t.getAttribute('data-delay') || 0));
    });

    /* 6. Donut : apparition en cascade. */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-donut__slice'), function (el) {
      if (!claim(el)) return;
      var delay = Number(el.getAttribute('data-delay') || 0);
      el.style.opacity = '0';
      el.style.transformOrigin = '80px 80px';
      el.style.transform = 'scale(.86)';
      setTimeout(function () {
        el.style.transition = 'opacity .5s ease, transform .7s cubic-bezier(.22,1,.36,1)';
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      }, slow ? 0 : delay);
    });

    /* 7. Radar : apparition + rotation. */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-radar__shape, .czd-radar__shape-line, .czd-radar__dot'), function (el) {
      if (!claim(el)) return;
      var delay = Number(el.getAttribute('data-delay') || 0);
      el.style.opacity = '0';
      setTimeout(function () { el.style.transition = 'opacity .8s ease'; el.style.opacity = '1'; }, slow ? 0 : delay);
    });

    /* 8. Micro-courbes. */
    Array.prototype.forEach.call(root.querySelectorAll('.czd-spark__line'), function (el) {
      if (!claim(el)) return;
      el.style.strokeDasharray = '1 1';
      el.style.strokeDashoffset = '1';
      setTimeout(function () {
        el.style.transition = slow ? 'none' : 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)';
        el.style.strokeDashoffset = '0';
      }, 60);
    });
    Array.prototype.forEach.call(root.querySelectorAll('.czd-spark__area, .czd-bento-chart-area, .czd-bento-peak'), function (el) {
      if (!claim(el)) return;
      el.style.opacity = '0';
      setTimeout(function () { el.style.transition = slow ? 'none' : 'opacity .7s ease'; el.style.opacity = '1'; }, slow ? 0 : 260);
    });
  }

  /* Autorise un nouveau passage d'animation (ex. réouverture de la section). */
  function resetAnimation(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('[data-czd-animated]'), function (el) {
      el.removeAttribute('data-czd-animated');
    });
  }

  function formatCount(v, dec) {
    var s = Number(v).toFixed(dec);
    if (global.CZD_I18N) {
      s = global.CZD_I18N.num(Number(s), dec);
    }
    return s;
  }

  global.CZD_CHARTS = {
    icon: icon,
    ring: ring,
    spark: spark,
    line: line,
    bars: bars,
    columnWeek: columnWeek,
    donut: donut,
    radar: radar,
    gauge: gauge,
    diverging: diverging,
    growth: growth,
    bentoSpline: bentoSpline,
    sleepRing: sleepRing,
    animate: animate,
    resetAnimation: resetAnimation,
    fmt: fmtTick,
    esc: esc
  };
})(window);
