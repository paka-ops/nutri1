/* ==========================================================================
   NUTRI.N°1 — Shared animated dashboard engine  (TASKS 6–11)
   Small dependency-free toolkit used by the data views (Agri, Health, UNICEF, FAO,
   WFP, WHO): seeded demo data, inline SVG/CSS charts in the Bento palette and an
   interactive indicator explorer (filter → clickable list → live detail panel with
   "Captation App" and "Angle mort comblé").

   Exposes : window.NutriBentoDash
   Styles  : styles/views.css  (.nd-*, block 12h) — colours come from the theme tokens
   Depends : js/bento-i18n.js (NUTRI_BENTO_I18N)
   Note    : every figure drawn by this engine is SIMULATED demonstration data produced
             by a seeded random walk in the browser. No national statistic is connected.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  if (!I18N) return;

  I18N.register({
    en: {
      'nd.capt': 'App capture', 'nd.blind': 'Blind spot filled', 'nd.live': 'Live', 'nd.sim': 'Simulated data', 'nd.all': 'All',
      'nd.prev': 'Previous indicator', 'nd.next': 'Next indicator', 'nd.filter': 'Filter indicators', 'nd.list': 'Indicators',
      'nd.n': 'Indicator {n} of {total}', 'nd.pause': 'Pause live updates', 'nd.play': 'Resume live updates',
      'nd.delta': 'vs. previous reading', 'nd.now': 'now', 'nd.mandate': 'REAL-TIME DATA MANDATE', 'nd.ind.title': 'The 15 indicators',
      'nd.ind.sub': 'Select an indicator to see its live chart, how the app captures it and the blind spot it fills.',
      'nd.note': 'Demonstration: all figures are simulated in this browser (seeded random series, refreshed every few seconds). No national statistic or user data is connected.'
    },
    fr: {
      'nd.capt': 'Captation App', 'nd.blind': 'Angle mort comblé', 'nd.live': 'En direct', 'nd.sim': 'Données simulées', 'nd.all': 'Tous',
      'nd.prev': 'Indicateur précédent', 'nd.next': 'Indicateur suivant', 'nd.filter': 'Filtrer les indicateurs', 'nd.list': 'Indicateurs',
      'nd.n': 'Indicateur {n} sur {total}', 'nd.pause': 'Mettre le direct en pause', 'nd.play': 'Reprendre le direct',
      'nd.delta': 'par rapport au relevé précédent', 'nd.now': 'maintenant', 'nd.mandate': 'MANDAT DATA TEMPS RÉEL', 'nd.ind.title': 'Les 15 indicateurs',
      'nd.ind.sub': 'Sélectionnez un indicateur pour voir son graphique en direct, la façon dont l’application le capte et l’angle mort qu’il comble.',
      'nd.note': 'Démonstration : tous les chiffres sont simulés dans ce navigateur (séries aléatoires reproductibles, rafraîchies toutes les quelques secondes). Aucune statistique nationale ni donnée d’utilisateur n’est connectée.'
    }
  });

  /* ---- 1. Utilities -------------------------------------------------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function t(key, params) { return I18N.t(key, params); }
  function fmt(v, dec) {
    try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
    catch (e) { return Number(v).toFixed(dec || 0); }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function reduced() { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function rng(seed) {                 /* deterministic generator from a string seed (xmur3 + mulberry32) */
    var h = 1779033703 ^ seed.length;
    for (var i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    var a = h >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  var ICONS = {
    capt: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    left: '<path d="m14.5 5-7 7 7 7"/>', right: '<path d="m9.5 5 7 7-7 7"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 4.5v15l12-7.5z"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    pulse: '<path d="M3 12h4l2.500-6 4 12 2.500-6H21"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[n] || '').replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  var TONES = ['lime', 'blue', 'orange', 'lav', 'red', 'sky'];

  /* ---- 2. Model: seeded series with a live random walk -------------------------- */
  /* Indicator definition:
       { id, type: line|bars|stack|donut|gauge|radar|heat, value, min, max, vol, dec, unit, good: 'up'|'down',
         labels: [...], vals: [...]            (bars, donut, radar, gauge parts)
         series: [...], cols: [...], grid: [[...]]   (stack: series × cols; heat: rows = labels, cols)
         s2: { off, name, flat }               (line: second series = first + off, or the constant `flat`, e.g. a threshold) }                              */
  function Model(defs, seed) {
    var self = this, N = 28;
    this.defs = defs; this.st = {}; this.rand = rng(seed);
    defs.forEach(function (d) {
      var r = rng(seed + ':' + d.id), span = d.max - d.min, vol = d.vol == null ? span * 0.02 : d.vol;
      var v = clamp(d.value + (r() - 0.5) * span * 0.08, d.min, d.max), hist = [];
      for (var i = 0; i < N; i++) { hist.unshift(v); v = clamp(v + (r() - 0.5) * 2 * vol - (d.trend || 0) * vol * 0.25, d.min, d.max); }
      var s = { v: hist[N - 1], prev: hist[N - 2], hist: hist, vol: vol };
      if (d.s2) { s.hist2 = hist.map(function (x, i) { return d.s2.flat != null ? d.s2.flat : x + d.s2.off + Math.sin(i / 3 + r() * 6) * vol * 1.5; }); }
      if (d.vals) s.vals = d.vals.map(function (x) { return x * (0.94 + r() * 0.12); });
      if (d.grid) s.grid = d.grid.map(function (row) { return row.map(function (x) { return x * (0.92 + r() * 0.16); }); });
      self.st[d.id] = s;
    });
  }
  Model.prototype.tick = function () {
    var self = this, r = this.rand;
    this.defs.forEach(function (d) {
      var s = self.st[d.id], pull = (d.value - s.v) * 0.06;
      s.prev = s.v;
      s.v = clamp(s.v + (r() - 0.5) * 2 * s.vol + pull, d.min, d.max);
      s.hist.push(s.v); s.hist.shift();
      if (s.hist2) { s.hist2.push(d.s2.flat != null ? d.s2.flat : s.v + d.s2.off + (r() - 0.5) * s.vol * 3); s.hist2.shift(); }
      if (s.vals) s.vals = s.vals.map(function (x, i) { return Math.max(0, x + (d.vals[i] - x) * 0.15 + (r() - 0.5) * d.vals[i] * 0.07); });
      if (s.grid) s.grid = s.grid.map(function (row, i) { return row.map(function (x, j) { return Math.max(0, x + (d.grid[i][j] - x) * 0.15 + (r() - 0.5) * d.grid[i][j] * 0.1); }); });
    });
  };

  /* ---- 3. Charts ---------------------------------------------------------------- */
  function lab(ns, k) { return t(ns + '.l.' + k); }
  function legend(items) { return '<ul class="nd-legend">' + items.map(function (it, i) { return '<li class="nd-tone--' + TONES[i % TONES.length] + '"><i></i>' + esc(it) + '</li>'; }).join('') + '</ul>'; }

  function line(d, s, ns, o) {
    var W = 560, H = o.h || 240, pl = 44, pr = 14, pt = 14, pb = 22, all = s.hist2 ? s.hist.concat(s.hist2) : s.hist;
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * 0.18 || 1; lo -= pad; hi += pad;
    var n = s.hist.length, X = function (i) { return pl + (W - pl - pr) * i / (n - 1); }, Y = function (v) { return pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo)); };
    var path = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' '); };
    var g = '';
    for (var k = 0; k <= 3; k++) { var v = lo + (hi - lo) * k / 3; g += '<line class="nd-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="nd-axis" x="' + (pl - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + fmt(v, d.dec) + '</text>'; }
    var p1 = path(s.hist), last = s.hist[n - 1];
    return '<svg class="nd-svg nd-line" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '">' + g +
      '<text class="nd-axis" x="' + (W - pr) + '" y="' + (H - 4) + '" text-anchor="end">' + esc(t('nd.now')) + '</text>' +
      '<path class="nd-area nd-tone--lime" d="' + p1 + ' L' + X(n - 1).toFixed(1) + ' ' + (H - pb) + ' L' + pl + ' ' + (H - pb) + ' Z"/>' +
      (s.hist2 ? '<path class="nd-path nd-tone--blue" pathLength="100" d="' + path(s.hist2) + '"/>' : '') +
      '<path class="nd-path nd-tone--lime" pathLength="100" d="' + p1 + '"/>' +
      '<circle class="nd-ping nd-tone--lime" cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(last).toFixed(1) + '" r="9"/>' +
      '<circle class="nd-dot nd-tone--lime" cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(last).toFixed(1) + '" r="4.5"/></svg>' +
      (d.s2 ? legend([lab(ns, d.s1 || 'value'), lab(ns, d.s2.name)]) : '');
  }
  function bars(d, s, ns) {
    var max = Math.max.apply(null, s.vals.concat([d.barMax || 0])) || 1;
    return '<ul class="nd-bars">' + s.vals.map(function (v, i) {
      return '<li class="nd-tone--' + TONES[d.oneTone ? 0 : i % TONES.length] + '" style="--i:' + i + '"><span>' + esc(lab(ns, d.labels[i])) + '</span><i class="nd-bar"><i style="--w:' + (v / max * 100).toFixed(1) + '%"></i></i><b>' + fmt(v, d.vdec == null ? 0 : d.vdec) + (d.vunit || '') + '</b></li>';
    }).join('') + '</ul>';
  }
  function stack(d, s, ns, o) {
    var W = 560, H = o.h || 240, pl = 12, pr = 12, pt = 12, pb = 28, cols = d.cols.length, bw = (W - pl - pr) / cols;
    var totals = d.cols.map(function (_, j) { var sum = 0; s.grid.forEach(function (row) { sum += row[j]; }); return sum; }), max = Math.max.apply(null, totals) || 1, out = '';
    d.cols.forEach(function (c, j) {
      var y = H - pb, x = pl + j * bw + bw * 0.18, w = bw * 0.64;
      s.grid.forEach(function (row, i) {
        var h = (H - pt - pb) * row[j] / max; y -= h;
        out += '<rect class="nd-seg nd-tone--' + TONES[i % TONES.length] + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, h - 2).toFixed(1) + '" rx="4" style="--i:' + j + '"/>';
      });
      out += '<text class="nd-axis" x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lab(ns, c)) + '</text>';
    });
    return '<svg class="nd-svg nd-stack" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '">' + out + '</svg>' + legend(d.series.map(function (k) { return lab(ns, k); }));
  }
  function donut(d, s, ns, o) {
    var sum = s.vals.reduce(function (a, b) { return a + b; }, 0) || 1, acc = 0, segs = '';
    s.vals.forEach(function (v, i) {
      var p = v / sum * 100;
      segs += '<circle class="nd-arc nd-tone--' + TONES[i % TONES.length] + '" cx="80" cy="80" r="62" pathLength="100" stroke-dasharray="' + Math.max(0, p - 1).toFixed(2) + ' ' + (100 - Math.max(0, p - 1)).toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '"/>';
      acc += p;
    });
    return '<div class="nd-donut"><svg class="nd-svg" viewBox="0 0 160 160" role="img" aria-label="' + esc(o.label || '') + '"><circle class="nd-track" cx="80" cy="80" r="62"/><g class="nd-spin">' + segs + '</g>' +
      '<text class="nd-big" x="80" y="80" text-anchor="middle">' + fmt(s.vals[0] / sum * 100, 0) + ' %</text><text class="nd-axis" x="80" y="100" text-anchor="middle">' + esc(lab(ns, d.labels[0])) + '</text></svg>' +
      '<ul class="nd-legend nd-legend--col">' + s.vals.map(function (v, i) { return '<li class="nd-tone--' + TONES[i % TONES.length] + '"><i></i>' + esc(lab(ns, d.labels[i])) + ' <b>' + fmt(v / sum * 100, 0) + ' %</b></li>'; }).join('') + '</ul></div>';
  }
  function gauge(d, s, ns, o) {
    var p = clamp((s.v - d.min) / (d.max - d.min), 0, 1), ang = -90 + p * 180;
    var tone = (d.good === 'down' ? 1 - p : p) >= 0.66 ? 'lime' : (d.good === 'down' ? 1 - p : p) >= 0.4 ? 'orange' : 'red';
    return '<svg class="nd-svg nd-gauge nd-tone--' + tone + '" viewBox="0 0 240 172" role="img" aria-label="' + esc(o.label || '') + '">' +
      '<path class="nd-track" d="M30 125 A90 90 0 0 1 210 125"/>' +
      '<path class="nd-gauge__fg" pathLength="100" d="M30 125 A90 90 0 0 1 210 125" style="--p:' + (p * 100).toFixed(1) + '"/>' +
      '<g class="nd-needle" style="--a:' + ang.toFixed(1) + 'deg"><line x1="120" y1="125" x2="120" y2="52"/><circle cx="120" cy="125" r="7"/></g>' +
      '<text class="nd-axis" x="30" y="145" text-anchor="middle">' + fmt(d.min, 0) + '</text><text class="nd-axis" x="210" y="145" text-anchor="middle">' + fmt(d.max, 0) + '</text>' +
      '<text class="nd-big" x="120" y="166" text-anchor="middle">' + fmt(s.v, d.dec) + (d.unit ? ' ' + esc(d.unit) : '') + '</text></svg>';
  }
  function radar(d, s, ns, o) {
    var n = s.vals.length, cx = 170, cy = 128, R = 88, max = d.radarMax || 100;
    var pt = function (i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    var poly = function (r) { var q = []; for (var i = 0; i < n; i++) { var p = pt(i, r); q.push(p[0].toFixed(1) + ',' + p[1].toFixed(1)); } return q.join(' '); };
    var rings = [0.25, 0.5, 0.75, 1].map(function (k) { return '<polygon class="nd-ring" points="' + poly(R * k) + '"/>'; }).join(''), spokes = '', labels = '', legend = '';
    var shape = s.vals.map(function (v, i) {
      var p = pt(i, R * clamp(v / max, 0.03, 1)), e = pt(i, R), l = pt(i, R + 14);
      spokes += '<line class="nd-ring" x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>';
      labels += '<text class="nd-axis" x="' + l[0].toFixed(1) + '" y="' + (l[1] + 4).toFixed(1) + '" text-anchor="middle">' + (i + 1) + '</text>';
      legend += '<li><i>' + (i + 1) + '</i>' + esc(lab(ns, d.labels[i])) + ' <b>' + fmt(v, 0) + '</b></li>';
      return p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }).join(' ');
    return '<div class="nd-radarbox"><svg class="nd-svg nd-radar" viewBox="35 8 270 240" role="img" aria-label="' + esc(o.label || '') + '">' + rings + spokes + '<polygon class="nd-shape nd-tone--lime" points="' + shape + '"/>' + labels + '</svg><ul class="nd-legend nd-legend--num">' + legend + '</ul></div>';
  }
  function heat(d, s, ns) {
    var max = 0; s.grid.forEach(function (row) { row.forEach(function (x) { if (x > max) max = x; }); }); max = d.heatMax || max || 1;
    var head = '<span></span>' + d.cols.map(function (c) { return '<span class="nd-heat__col">' + esc(lab(ns, c)) + '</span>'; }).join('');
    var rows = s.grid.map(function (row, i) {
      return '<span class="nd-heat__row">' + esc(lab(ns, d.labels[i])) + '</span>' + row.map(function (x, j) {
        return '<i class="nd-cell" style="--k:' + clamp(x / max, 0, 1).toFixed(2) + ';--i:' + (i + j) + '" title="' + fmt(x, d.vdec || 0) + (d.vunit || '') + '"><b>' + fmt(x, d.vdec || 0) + '</b></i>';
      }).join('');
    }).join('');
    return '<div class="nd-heat nd-tone--' + (d.heatTone || 'orange') + '" style="--cols:' + d.cols.length + '">' + head + rows + '</div>';
  }
  /* Bipartite flow map: sources on the left, sinks on the right, animated dashes on the links. */
  function flows(cfg, ns) {
    var W = 720, H = cfg.h || 270, L = cfg.left, R = cfg.right, lx = 200, rx = 450;   /* room for long labels on both sides */
    var ly = function (i) { return 26 + (H - 52) * (L.length === 1 ? 0.5 : i / (L.length - 1)); }, ry = function (j) { return 26 + (H - 52) * (R.length === 1 ? 0.5 : j / (R.length - 1)); };
    var max = Math.max.apply(null, cfg.links.map(function (k) { return k[2]; })) || 1, out = '';
    cfg.links.forEach(function (k, i) {
      var y1 = ly(k[0]), y2 = ry(k[1]), mx = (lx + rx) / 2, w = 1.5 + 7 * k[2] / max;
      var dpath = 'M' + lx + ' ' + y1.toFixed(1) + ' C' + mx + ' ' + y1.toFixed(1) + ' ' + mx + ' ' + y2.toFixed(1) + ' ' + rx + ' ' + y2.toFixed(1);
      out += '<path class="nd-flow__bg nd-tone--' + TONES[k[0] % TONES.length] + '" d="' + dpath + '" stroke-width="' + w.toFixed(1) + '"/><path class="nd-flow__fg nd-tone--' + TONES[k[0] % TONES.length] + '" d="' + dpath + '" stroke-width="' + Math.max(1.5, w * 0.45).toFixed(1) + '" style="--i:' + i + '"/>';
    });
    L.forEach(function (k, i) { out += '<circle class="nd-node nd-tone--' + TONES[i % TONES.length] + '" cx="' + lx + '" cy="' + ly(i).toFixed(1) + '" r="6"/><text class="nd-axis" x="' + (lx - 12) + '" y="' + (ly(i) + 4).toFixed(1) + '" text-anchor="end">' + esc(lab(ns, k)) + '</text>'; });
    R.forEach(function (k, j) { out += '<circle class="nd-node nd-node--sink" cx="' + rx + '" cy="' + ry(j).toFixed(1) + '" r="7"/><text class="nd-axis" x="' + (rx + 12) + '" y="' + (ry(j) + 4).toFixed(1) + '">' + esc(lab(ns, k)) + '</text>'; });
    return '<svg class="nd-svg nd-flows" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(cfg.label || '') + '">' + out + '</svg>';
  }
  function chart(d, s, ns, o) {
    o = o || {};
    var f = { line: line, bars: bars, stack: stack, donut: donut, gauge: gauge, radar: radar, heat: heat }[d.type] || line;
    return f(d, s, ns, o);
  }
  function spark(hist) {
    var lo = Math.min.apply(null, hist), hi = Math.max.apply(null, hist), n = hist.length, span = (hi - lo) || 1;
    return '<svg class="nd-spark" viewBox="0 0 80 24" aria-hidden="true" preserveAspectRatio="none"><path d="' + hist.map(function (v, i) { return (i ? 'L' : 'M') + (80 * i / (n - 1)).toFixed(1) + ' ' + (21 - 18 * (v - lo) / span).toFixed(1); }).join(' ') + '"/></svg>';
  }
  function delta(d, s) {
    var diff = s.v - s.prev, up = diff >= 0, good = (d.good === 'down') ? !up : up;
    return '<span class="nd-delta ' + (Math.abs(diff) < 1e-9 ? '' : good ? 'is-good' : 'is-bad') + '">' + ico(up ? 'up' : 'down') + fmt(Math.abs(diff), Math.max(1, d.dec || 0)) + '</span>';
  }
  function value(d, s) { return fmt(s.v, d.dec) + (d.unit ? '<small>' + esc(d.unit) + '</small>' : ''); }

  /* ---- 4. Indicator explorer ------------------------------------------------------ */
  /* cfg: { ns, defs (15 indicator definitions with fam), families: [ids], model }                 */
  function Explorer(cfg) { this.cfg = cfg; this.fam = 'all'; this.sel = cfg.defs[0].id; }
  Explorer.prototype.list = function () { var f = this.fam; return this.cfg.defs.filter(function (d) { return f === 'all' || d.fam === f; }); };
  Explorer.prototype.def = function (id) { var out = null; this.cfg.defs.forEach(function (d) { if (d.id === id) out = d; }); return out; };
  Explorer.prototype.num = function (d) { return this.cfg.defs.indexOf(d) + 1; };
  Explorer.prototype.cardsHtml = function () {
    var self = this, ns = this.cfg.ns, st = this.cfg.model.st;
    return this.list().map(function (d, i) {
      var n = self.num(d);
      return '<li style="--i:' + i + '"><button type="button" class="nd-card" data-nd-ind="' + d.id + '" aria-pressed="' + (d.id === self.sel) + '">' +
        '<span class="nd-card__n">' + (n < 10 ? '0' : '') + n + '</span><span class="nd-card__t">' + esc(t(ns + '.i' + n + '.t')) + '</span>' +
        '<span class="nd-card__v" data-nd-val="' + d.id + '">' + value(d, st[d.id]) + '</span><span class="nd-card__s" data-nd-spark="' + d.id + '">' + spark(st[d.id].hist) + '</span></button></li>';
    }).join('');
  };
  Explorer.prototype.detailHtml = function (animate) {
    var d = this.def(this.sel), ns = this.cfg.ns, s = this.cfg.model.st[d.id], n = this.num(d), title = t(ns + '.i' + n + '.t');
    return '<div class="nd-detail__top"><span class="nd-detail__n">' + (n < 10 ? '0' : '') + n + '</span><div class="nd-detail__ttl"><span class="nd-fam">' + esc(t(ns + '.fam.' + d.fam)) + ' · ' + esc(t('nd.n', { n: n, total: this.cfg.defs.length })) + '</span>' +
        '<h4 id="' + ns + 'NdTitle" tabindex="-1">' + esc(title) + '</h4></div>' +
        '<button type="button" class="nd-ibtn" data-nd-step="-1" aria-label="' + esc(t('nd.prev')) + '">' + ico('left') + '</button><button type="button" class="nd-ibtn" data-nd-step="1" aria-label="' + esc(t('nd.next')) + '">' + ico('right') + '</button></div>' +
      '<div class="nd-read"><b class="nd-read__v" data-nd-big>' + value(d, s) + '</b><span data-nd-delta title="' + esc(t('nd.delta')) + '">' + delta(d, s) + '</span>' +
        '<span class="nd-livetag"><i></i>' + esc(t('nd.live')) + '</span></div>' +
      '<div class="nd-chart' + (animate ? ' is-in' : '') + '" data-nd-chart>' + chart(d, s, ns, { label: title, h: 230 }) + '</div>' +
      '<div class="nd-texts"><div class="nd-text nd-text--capt"><h5>' + ico('capt') + esc(t('nd.capt')) + '</h5><p>' + esc(t(ns + '.i' + n + '.c')) + '</p></div>' +
        '<div class="nd-text nd-text--blind"><h5>' + ico('eye') + esc(t('nd.blind')) + '</h5><p>' + esc(t(ns + '.i' + n + '.a')) + '</p></div></div>';
  };
  Explorer.prototype.html = function () {
    var self = this, ns = this.cfg.ns;
    var chips = ['all'].concat(this.cfg.families).map(function (f) {
      var count = f === 'all' ? self.cfg.defs.length : self.cfg.defs.filter(function (d) { return d.fam === f; }).length;
      return '<button type="button" class="nd-chip" data-nd-fam="' + f + '" aria-pressed="' + (self.fam === f) + '">' + esc(f === 'all' ? t('nd.all') : t(ns + '.fam.' + f)) + '<b>' + count + '</b></button>';
    }).join('');
    return '<section class="card nd-explorer" data-nd-explorer="' + ns + '"><header class="nd-head"><span class="vh-ico">' + ico('grid') + '</span><div><h3>' + esc(t('nd.ind.title')) + '</h3><p>' + esc(t('nd.ind.sub')) + '</p></div>' +
        '<span class="pill nd-simtag">' + esc(t('nd.sim')) + '</span></header>' +
      '<div class="nd-chips" role="group" aria-label="' + esc(t('nd.filter')) + '">' + chips + '</div>' +
      '<div class="nd-split"><div class="nd-detail" data-nd-detail aria-live="off">' + this.detailHtml(true) + '</div>' +
        '<ul class="nd-cards" data-nd-cards aria-label="' + esc(t('nd.list')) + '">' + this.cardsHtml() + '</ul></div></section>';
  };
  /* Wire events on a container that holds the explorer markup (delegated; call once). */
  Explorer.prototype.bind = function (host) {
    var self = this;
    this.host = host;
    host.addEventListener('click', function (ev) {
      var el = ev.target.closest ? ev.target.closest('[data-nd-ind], [data-nd-fam], [data-nd-step]') : null;
      if (!el || !host.contains(el)) return;
      if (el.hasAttribute('data-nd-ind')) self.select(el.getAttribute('data-nd-ind'), true);
      else if (el.hasAttribute('data-nd-step')) {
        var list = self.list(), i = list.indexOf(self.def(self.sel)), step = +el.getAttribute('data-nd-step') > 0 ? 1 : -1;
        self.select(list[((i < 0 ? 0 : i + step) + list.length) % list.length].id, false);
        var again = host.querySelector('[data-nd-step="' + step + '"]'); if (again) again.focus();
      } else {
        var f = el.getAttribute('data-nd-fam');
        if (f !== 'all' && self.cfg.families.indexOf(f) < 0) return;
        self.fam = f;
        var l = self.list(); if (l.indexOf(self.def(self.sel)) < 0) self.sel = l[0].id;
        self.repaint();
        var chip = host.querySelector('[data-nd-fam="' + f + '"]'); if (chip) chip.focus();
      }
    });
  };
  Explorer.prototype.repaint = function () {
    var box = this.host && this.host.querySelector('[data-nd-explorer]');
    if (box) box.outerHTML = this.html();
  };
  Explorer.prototype.select = function (id, fromCard) {
    if (!this.def(id)) return;
    this.sel = id;
    var host = this.host, det = host.querySelector('[data-nd-detail]');
    if (det) det.innerHTML = this.detailHtml(true);
    [].forEach.call(host.querySelectorAll('[data-nd-ind]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-nd-ind') === id)); });
    var on = host.querySelector('[data-nd-ind="' + id + '"]'), strip = host.querySelector('[data-nd-cards]');
    if (on && strip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, on.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2);
    if (fromCard && det && global.matchMedia && global.matchMedia('(max-width: 1100px)').matches) det.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
  };
  /* Refresh the live parts without replaying entry animations. */
  Explorer.prototype.tick = function () {
    var host = this.host, cfg = this.cfg, st = cfg.model.st, self = this;
    if (!host || !host.querySelector('[data-nd-explorer]')) return;
    this.list().forEach(function (d) {
      var v = host.querySelector('[data-nd-val="' + d.id + '"]'), sp = host.querySelector('[data-nd-spark="' + d.id + '"]');
      if (v) v.innerHTML = value(d, st[d.id]);
      if (sp) sp.innerHTML = spark(st[d.id].hist);
    });
    var d = this.def(this.sel), s = st[d.id], big = host.querySelector('[data-nd-big]'), dl = host.querySelector('[data-nd-delta]'), ch = host.querySelector('[data-nd-chart]');
    if (big) { big.innerHTML = value(d, s); big.classList.remove('is-tick'); void big.offsetWidth; big.classList.add('is-tick'); }
    if (dl) dl.innerHTML = delta(d, s);
    if (ch) { ch.classList.remove('is-in'); ch.innerHTML = chart(d, s, cfg.ns, { label: t(cfg.ns + '.i' + self.num(d) + '.t'), h: 230 }); }
  };

  /* ---- 5. Live loop ---------------------------------------------------------------- */
  /* Calls fn every `ms` while `root` is on screen and the tab is visible. */
  function live(root, fn, ms) {
    return global.setInterval(function () {
      if (doc.hidden || root.offsetParent === null) return;
      fn();
    }, ms || 2600);
  }
  function mandate(ns, icon) {
    return '<section class="card nd-mandate"><span class="nd-mandate__ico">' + ico('target') + '</span><div><span class="nd-kicker">' + esc(t('nd.mandate')) + '</span>' +
      '<h3>' + esc(t(ns + '.mandate.t')) + '</h3><p>' + esc(t(ns + '.mandate')) + '</p></div><span class="pill nd-simtag">' + esc(t('nd.sim')) + '</span></section>';
  }
  function panel(cls, title, sub, body, attr) {
    return '<section class="card nd-panel ' + cls + '"><header class="nd-panel__head"><h3>' + esc(title) + '</h3>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</header><div class="nd-panel__body" ' + (attr || '') + '>' + body + '</div></section>';
  }
  function note() { return '<p class="nd-note">' + ico('info') + '<span>' + esc(t('nd.note')) + '</span></p>'; }

  /* ---- Board: a complete dashboard (mandate, live KPIs, overview panels, flow map, explorer) ----
     cfg = { ns, root (the view <section>), slot (id of the placeholder re-emitted by the host view),
             countrySelect (id of the view's own country <select>; default: the header #country),
             defs (15 indicators), families, over (overview chart defs), layout ([{ o: index in over | 'flows', cls }]),
             flows ({ left, right, links }), kpis ([{ k, base, step }]) }
     Dictionary keys: <ns>.mandate(.t), <ns>.kN, <ns>.oN.t/.s (N = position in layout), <ns>.fam.*, <ns>.l.*, <ns>.iN.t/.c/.a
     Returns { mount, tick, pause, state }. Every figure is simulated and seeded per country. */
  function Board(cfg) {
    var NS = cfg.ns, seed = '', model = null, over = null, explorer = null, kpi = [], paused = false;
    var host = doc.createElement('div'); host.className = 'nd-host';
    function country() { var sel = doc.getElementById(cfg.countrySelect || 'country') || doc.getElementById('country'); return (sel && sel.value) || 'TG'; }
    function build() {
      seed = NS + ':' + country();
      model = new Model(cfg.defs, seed); over = new Model(cfg.over, seed + ':o');
      var r = rng(seed + ':k');
      kpi = cfg.kpis.map(function (k) { return Math.round(k.base * (0.85 + r() * 0.3)); });
      if (explorer) explorer.cfg.model = model;   /* one explorer for the page: its click handler is bound once */
      else explorer = new Explorer({ ns: NS, defs: cfg.defs, families: cfg.families, model: model });
    }
    function oChart(n) { var d = cfg.over[cfg.layout[n].o]; return chart(d, over.st[d.id], NS, { label: t(NS + '.o' + (n + 1) + '.t'), h: n === 0 ? 220 : 230 }); }
    function html() {
      var panels = cfg.layout.map(function (L, n) {
        var body = L.o === 'flows' ? flows({ left: cfg.flows.left, right: cfg.flows.right, links: cfg.flows.links, label: t(NS + '.o' + (n + 1) + '.t') }, NS) : oChart(n);
        return panel('vrd-p vrd-p--' + L.cls, t(NS + '.o' + (n + 1) + '.t'), t(NS + '.o' + (n + 1) + '.s'), body, L.o === 'flows' ? '' : 'data-nd-o="' + n + '"');
      }).join('');
      return '<div class="nd">' + mandate(NS) +
        '<ul class="nd-kpis">' + cfg.kpis.map(function (k, i) { return '<li><span>' + esc(t(NS + '.' + k.k)) + '</span><b data-nd-kpi="' + i + '">' + fmt(kpi[i], 0) + '</b></li>'; }).join('') + '</ul>' +
        '<div class="vrd-grid">' + panels + '</div>' + explorer.html() + note() + '</div>';
    }
    function paint() { host.innerHTML = html(); }
    function mount() {
      var slot = doc.getElementById(cfg.slot);
      if (!slot) return;
      if (seed !== NS + ':' + country()) { build(); paint(); }
      if (host.parentNode !== slot) slot.appendChild(host);
    }
    function tick() {
      if (paused || !host.firstChild) return;
      model.tick(); over.tick();
      cfg.kpis.forEach(function (k, i) {
        kpi[i] += Math.round(k.step * (0.5 + model.rand() * 1.5));
        var el = host.querySelector('[data-nd-kpi="' + i + '"]'); if (el) el.textContent = fmt(kpi[i], 0);
      });
      cfg.layout.forEach(function (L, n) {
        var el = host.querySelector('[data-nd-o="' + n + '"]');
        if (el) { el.classList.add('is-live'); el.innerHTML = oChart(n); }
      });
      explorer.tick();
    }
    build(); explorer.bind(host); paint();
    live(cfg.root, tick, 2600);
    I18N.onChange(function () { paint(); });
    doc.addEventListener('nutri:countryChanged', function () { mount(); });
    return {
      mount: mount, tick: tick,
      pause: function (v) { paused = v !== false; },
      state: function () { return { country: country(), fam: explorer.fam, sel: explorer.sel, shown: explorer.list().length, value: model.st[explorer.sel].v }; }
    };
  }


  global.NutriBentoDash = {
    Board: Board, Model: Model, Explorer: Explorer, chart: chart, flows: flows, spark: spark, value: value, delta: delta, live: live,
    mandate: mandate, panel: panel, note: note, ico: ico, fmt: fmt, esc: esc, rng: rng, reduced: reduced
  };
})(window);
