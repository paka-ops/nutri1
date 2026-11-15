/* ==========================================================================
   NUTRI.N°1 — Shared data-dashboard engine  (TASKS 6–11, period edition)
   Small dependency-free toolkit used by the data views (Agri, Health, UNICEF, FAO,
   WFP, WHO). It presents each institution's data as SERIES BY YEAR AND BY MONTH
   (2021 → 2026) — the form in which the data products are meant to be sold — with
   several chart types (curves, columns, stacked columns, donuts, horizontal bars,
   radar, gauge, heat map, flow map), a period selector, a data table and a CSV export
   per indicator, and an indicator explorer (filter → clickable list → detail panel
   with "Captation App" and "Angle mort comblé").

   Exposes : window.NutriBentoDash  (Board, Model, Explorer, chart helpers)
   Styles  : styles/views.css  (.nd-*, block 12h; .vrd-* grid, block 11b) — theme tokens only
   Depends : js/bento-i18n.js (NUTRI_BENTO_I18N)
   Note    : every figure drawn by this engine is SIMULATED demonstration data: monthly
             series generated in the browser from a seed (country + indicator), with a
             trend, a seasonal cycle and noise. Annual figures are the mean of the months.
             No national statistic or user data is connected.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  if (!I18N) return;

  I18N.register({
    en: {
      'nd.capt': 'App capture', 'nd.blind': 'Blind spot filled', 'nd.sim': 'Demonstration data', 'nd.all': 'All',
      'nd.prev': 'Previous indicator', 'nd.next': 'Next indicator', 'nd.filter': 'Filter indicators', 'nd.list': 'Indicators',
      'nd.n': 'Indicator {n} of {total}', 'nd.mandate': 'DATA MANDATE', 'nd.ind.title': 'The 15 indicators',
      'nd.ind.sub': 'Select an indicator to see its yearly and monthly series, how the app captures it and the blind spot it fills.',
      'nd.period': 'Period', 'nd.gran': 'Time step', 'nd.gran.year': 'By year', 'nd.gran.month': 'By month', 'nd.year': 'Year', 'nd.month': 'Month',
      'nd.period.sub': 'Series available from {a} to {b}. Pick a year or a month, or click a point or a column in a chart.',
      'nd.partial': '{year} (Jan–{m})', 'nd.vs': 'vs {p}', 'nd.first': 'first period of the series',
      'nd.evo.year': 'Yearly series, {a}–{b}', 'nd.evo.month': 'Monthly series, {year}', 'nd.detail': 'Breakdown · {p}', 'nd.kpis': 'Volume of data behind the period',
      'nd.table': 'Data table', 'nd.col.period': 'Period', 'nd.col.value': 'Value', 'nd.export': 'Export CSV', 'nd.exported': 'CSV file downloaded (demonstration data).',
      'nd.csv.note': 'NUTRI.N1 demonstration data - simulated series, not official statistics',
      'nd.note': 'Demonstration: the yearly and monthly series are simulated in this browser (reproducible per country: trend, seasonal cycle and noise; yearly figures are the mean of the months). No national statistic or user data is connected.'
    },
    fr: {
      'nd.capt': 'Captation App', 'nd.blind': 'Angle mort comblé', 'nd.sim': 'Données de démonstration', 'nd.all': 'Tous',
      'nd.prev': 'Indicateur précédent', 'nd.next': 'Indicateur suivant', 'nd.filter': 'Filtrer les indicateurs', 'nd.list': 'Indicateurs',
      'nd.n': 'Indicateur {n} sur {total}', 'nd.mandate': 'MANDAT DATA', 'nd.ind.title': 'Les 15 indicateurs',
      'nd.ind.sub': 'Sélectionnez un indicateur pour voir ses séries annuelles et mensuelles, la façon dont l’application le capte et l’angle mort qu’il comble.',
      'nd.period': 'Période', 'nd.gran': 'Pas de temps', 'nd.gran.year': 'Par année', 'nd.gran.month': 'Par mois', 'nd.year': 'Année', 'nd.month': 'Mois',
      'nd.period.sub': 'Séries disponibles de {a} à {b}. Choisissez une année ou un mois, ou cliquez sur un point ou une colonne d’un graphique.',
      'nd.partial': '{year} (janv.–{m})', 'nd.vs': 'vs {p}', 'nd.first': 'première période de la série',
      'nd.evo.year': 'Série annuelle, {a}–{b}', 'nd.evo.month': 'Série mensuelle, {year}', 'nd.detail': 'Répartition · {p}', 'nd.kpis': 'Volume de données derrière la période',
      'nd.table': 'Tableau des données', 'nd.col.period': 'Période', 'nd.col.value': 'Valeur', 'nd.export': 'Exporter en CSV', 'nd.exported': 'Fichier CSV téléchargé (données de démonstration).',
      'nd.csv.note': 'NUTRI.N1 donnees de demonstration - series simulees, pas des statistiques officielles',
      'nd.note': 'Démonstration : les séries annuelles et mensuelles sont simulées dans ce navigateur (reproductibles par pays : tendance, cycle saisonnier et bruit ; les chiffres annuels sont la moyenne des mois). Aucune statistique nationale ni donnée d’utilisateur n’est connectée.'
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
    pulse: '<path d="M3 12h4l2.500-6 4 12 2.500-6H21"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    dl: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    table: '<rect x="3.5" y="4.500" width="17" height="15" rx="2.500"/><path d="M3.5 9.500h17M3.5 14.500h17M9.500 4.500v15"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[n] || '').replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  var TONES = ['lime', 'blue', 'orange', 'lav', 'red', 'sky'];

  /* ---- 2. Model: seeded monthly series, 2021 → 2026 ------------------------------ */
  /* Indicator definition:
       { id, fam, value (level of the latest months), min, max, dec, unit, good: 'up'|'down',
         trend (change per year, in units; default: seeded), season: { amp, peak (month 1–12) }, noise,
         tchart: 'line'|'cols'|'stack'        (chart of the series over time; default 'line')
         shares: { labels, vals, lead }        (tchart 'stack': shares in % per period; lead = first share follows the series)
         type: bars|donut|radar|gauge|heat|stack|flows   (breakdown for the selected period; optional)
         labels, vals                          (bars, donut, radar)      series, cols, grid   (stack; heat: rows = labels)
         s1, s2: { off, name, flat }           (second curve = first + off, or the constant `flat`, e.g. a threshold)
         b: true                               (the dictionary has a title for the breakdown: <ns>.iN.b) }                        */
  var Y0 = 2021, Y1 = 2026, LASTM = 9;           /* series run from January 2021 to October 2026 */
  var YEARS = []; for (var yy = Y0; yy <= Y1; yy++) YEARS.push(yy);
  var NM = (Y1 - Y0) * 12 + LASTM + 1;
  function monthsIn(year) { return year === Y1 ? LASTM + 1 : 12; }
  function monthName(m, long) {
    try { return new Date(2024, m, 15).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { month: long ? 'long' : 'short' }); }
    catch (e) { return String(m + 1); }
  }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; }

  function Model(defs, seed) {
    var self = this;
    this.defs = defs; this.m = {}; this.m2 = {}; this.items = {};
    defs.forEach(function (d) {
      var r = rng(seed + ':' + d.id), span = (d.max - d.min) || 1;
      var trend = d.trend != null ? d.trend : (r() < 0.72 ? 1 : -1) * (d.good === 'down' ? -1 : 1) * span * (0.015 + r() * 0.03);
      var amp = d.season ? d.season.amp : span * 0.035 * (0.4 + r()), peak = d.season ? d.season.peak : 1 + Math.floor(r() * 12);
      var noise = d.noise != null ? d.noise : span * 0.012, e = 0, arr = [], ph = r() * 6;
      for (var k = 0; k < NM; k++) {
        e = e * 0.55 + (r() - 0.5) * 2 * noise;
        arr.push(clamp(d.value - trend * (NM - 1 - k) / 12 + amp * Math.cos(2 * Math.PI * ((k % 12) + 1 - peak) / 12) + e, d.min, d.max));
      }
      self.m[d.id] = arr;
      if (d.s2) self.m2[d.id] = arr.map(function (x, k) { return d.s2.flat != null ? d.s2.flat : x + d.s2.off * (1 + 0.2 * Math.sin(k / 5 + ph)) + (r() - 0.5) * noise * 2; });
      var n = Math.max(d.vals ? d.vals.length : 0, d.grid ? d.grid.length : 0, d.shares ? d.shares.vals.length : 0), it = [];
      for (var i = 0; i < n; i++) it.push({ g: (r() - 0.5) * 0.1, w: (r() - 0.5) * 0.14, ph: r() * 12 });
      self.items[d.id] = it;
    });
  }
  /* Multiplier of breakdown item i at a period (slow drift over the years + seasonal wobble in monthly view). */
  Model.prototype.mult = function (d, i, gran, yi, month) {
    var it = this.items[d.id][i] || { g: 0, w: 0, ph: 0 };
    return Math.max(0.05, 1 + it.g * (yi - (Y1 - Y0)) + (gran === 'month' ? it.w * Math.cos(2 * Math.PI * (month - it.ph) / 12) : 0));
  };
  /* Everything needed to draw indicator d for the period P = { gran: 'year'|'month', year, month (0–11) }. */
  Model.prototype.view = function (d, P) {
    var self = this, m = this.m[d.id], m2 = this.m2[d.id], yi = P.year - Y0, nm = monthsIn(P.year), month = Math.min(P.month, nm - 1);
    var ann = function (arr) { return YEARS.map(function (y, j) { return mean(arr.slice(j * 12, j * 12 + monthsIn(y))); }); };
    var mon = function (arr) { return arr.slice(yi * 12, yi * 12 + nm); };
    var yearX = YEARS.map(String), monthX = []; for (var q = 0; q < nm; q++) monthX.push(monthName(q));
    var V = { gran: P.gran, year: P.year, month: month };
    if (P.gran === 'year') {
      V.series = ann(m); V.x = yearX; V.idx = yi; V.kind = 'year';
      V.prev = yi > 0 ? V.series[yi - 1] : null; V.prevLabel = String(P.year - 1);
      V.alt = { series: mon(m), x: monthX, idx: -1, kind: 'month' };
      V.label = nm < 12 ? t('nd.partial', { year: P.year, m: monthName(nm - 1) }) : String(P.year);
      if (m2) V.series2 = ann(m2);
    } else {
      var k = yi * 12 + month;
      V.series = mon(m); V.x = monthX; V.idx = month; V.kind = 'month';
      V.prev = k > 0 ? m[k - 1] : null; V.prevLabel = monthName((month + 11) % 12) + (month === 0 ? ' ' + (P.year - 1) : '');
      V.alt = { series: ann(m), x: yearX, idx: yi, kind: 'year' };
      V.label = monthName(month, true) + ' ' + P.year;
      if (m2) V.series2 = mon(m2);
    }
    V.v = V.series[V.idx];
    V.yearLabel = nm < 12 ? t('nd.partial', { year: P.year, m: monthName(nm - 1) }) : String(P.year);
    var cap = d.cap != null ? d.cap : (/%/.test(d.vunit || '') ? 100 : Infinity);
    var f = (d.scale === false || Math.abs(d.value) < 1e-9) ? 1 : V.v / d.value;
    var shares = function (base, lead, gran, y, mo, head) {
      var raw = base.map(function (x, i) { return x * self.mult(d, i, gran, y, mo); }), sum, out;
      if (lead) { var v0 = clamp(head, 1, 99); sum = 0; for (var i = 1; i < raw.length; i++) sum += raw[i]; out = raw.map(function (x, i) { return i ? x / (sum || 1) * (100 - v0) : v0; }); }
      else { sum = raw.reduce(function (a, b) { return a + b; }, 0) || 1; out = raw.map(function (x) { return x / sum * 100; }); }
      return out;
    };
    if (d.vals) {
      if (d.type === 'donut') V.vals = shares(d.vals, d.lead !== false && Math.abs(d.vals[0] - d.value) < 0.6, P.gran, yi, month, V.v);
      else V.vals = d.vals.map(function (x, i) { return Math.min(cap, x * f * self.mult(d, i, P.gran, yi, month)); });
    }
    if (d.grid) {              /* grids describe the whole selected year (their columns are quarters, regions…), so they follow the yearly level */
      var fy = (d.type !== 'heat' || d.scale === false || Math.abs(d.value) < 1e-9) ? 1 : mean(m.slice(yi * 12, yi * 12 + nm)) / d.value;
      V.grid = d.grid.map(function (row, i) { var k2 = fy * self.mult(d, i, 'year', yi, 0); return row.map(function (x) { return Math.min(cap, x * k2); }); });
    }
    if (d.shares) {            /* shares for every period on the x axis: [period][series] */
      V.stackT = V.x.map(function (_, p) { return P.gran === 'year' ? shares(d.shares.vals, d.shares.lead, 'year', p, 0, V.series[p]) : shares(d.shares.vals, d.shares.lead, 'month', yi, p, V.series[p]); });
    }
    return V;
  };

  /* ---- 3. Charts ---------------------------------------------------------------- */
  function lab(ns, k) { return t(ns + '.l.' + k); }
  function legend(items) { return '<ul class="nd-legend">' + items.map(function (it, i) { return '<li class="nd-tone--' + TONES[i % TONES.length] + '"><i></i>' + esc(it) + '</li>'; }).join('') + '</ul>'; }

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
      '<text class="nd-big" x="80" y="' + (lab(ns, d.labels[0]).length > 13 ? 88 : 80) + '" text-anchor="middle">' + fmt(s.vals[0] / sum * 100, 0) + ' %</text>' + (function (t) { return t.length > 13 ? '' : '<text class="nd-axis" x="80" y="100" text-anchor="middle">' + esc(t) + '</text>'; })(lab(ns, d.labels[0])) + '</svg>' +
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
      legend += '<li><i>' + (i + 1) + '</i>' + esc(lab(ns, d.labels[i])) + ' <b>' + fmt(v, d.vdec || 0) + '</b></li>';
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

  /* -- Charts over time. V = Model.view(); every x slot is clickable (data-nd-pick) to select that period. -- */
  function picks(V, X, slot, top, h) {
    return V.x.map(function (lbl, i) {
      return '<rect class="nd-pick" data-nd-pick="' + i + '" data-nd-kind="' + V.kind + '" x="' + (X(i) - slot / 2).toFixed(1) + '" y="' + top + '" width="' + slot.toFixed(1) + '" height="' + h + '"><title>' + esc(lbl) + '</title></rect>';
    }).join('');
  }
  function yaxis(lo, hi, Y, pl, W, pr, dec) {
    var g = '';
    for (var k = 0; k <= 3; k++) { var v = lo + (hi - lo) * k / 3; g += '<line class="nd-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="nd-axis" x="' + (pl - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + fmt(v, dec) + '</text>'; }
    return g;
  }
  function xaxis(V, X, H) {
    return V.x.map(function (lbl, i) { return '<text class="nd-axis' + (i === V.idx ? ' is-sel' : '') + '" x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(lbl) + '</text>'; }).join('');
  }
  function tline(d, V, ns, o) {
    var W = 560, H = o.h || 240, pl = 56, pr = 22, pt = 26, pb = 28, n = V.series.length, all = V.series2 ? V.series.concat(V.series2) : V.series;
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * 0.18 || Math.abs(hi) * 0.05 || 1; lo -= pad; hi += pad;
    var X = function (i) { return n === 1 ? (pl + W - pr) / 2 : pl + (W - pl - pr) * i / (n - 1); }, Y = function (v) { return pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo)); };
    var path = function (arr) { return arr.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' '); };
    var p1 = path(V.series), slot = n > 1 ? (W - pl - pr) / (n - 1) : W - pl - pr, sel = V.idx >= 0 ? V.idx : -1;
    var dots = V.series.map(function (v, i) { return '<circle class="nd-dot nd-tone--lime' + (i === sel ? ' is-sel' : '') + '" cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (i === sel ? 6 : 3.5) + '" style="--i:' + i + '"/>'; }).join('');
    return '<svg class="nd-svg nd-line" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '">' + yaxis(lo, hi, Y, pl, W, pr, d.dec) + xaxis(V, X, H) +
      (sel >= 0 ? '<line class="nd-cursor" x1="' + X(sel).toFixed(1) + '" x2="' + X(sel).toFixed(1) + '" y1="' + pt + '" y2="' + (H - pb) + '"/>' : '') +
      '<path class="nd-area nd-tone--lime" d="' + p1 + ' L' + X(n - 1).toFixed(1) + ' ' + (H - pb) + ' L' + X(0).toFixed(1) + ' ' + (H - pb) + ' Z"/>' +
      (V.series2 ? '<path class="nd-path nd-tone--blue" pathLength="100" d="' + path(V.series2) + '"/>' : '') +
      '<path class="nd-path nd-tone--lime" pathLength="100" d="' + p1 + '"/>' + dots +
      (sel >= 0 ? '<text class="nd-vlabel" x="' + clamp(X(sel), pl + 20, W - pr - 20).toFixed(1) + '" y="' + Math.max(16, Y(V.series[sel]) - 12).toFixed(1) + '" text-anchor="middle">' + fmt(V.series[sel], d.dec) + '</text>' : '') +
      picks(V, X, slot, pt, H - pt) + '</svg>' +
      (d.s2 ? legend([lab(ns, d.s1 || 'value'), lab(ns, d.s2.name)]) : '');
  }
  function tcols(d, V, ns, o) {
    var W = 560, H = o.h || 240, pl = 56, pr = 14, pt = 26, pb = 28, n = V.series.length;
    var mn = Math.min.apply(null, V.series), hi = Math.max.apply(null, V.series), lo;
    if (mn >= 0 && (hi - mn) > hi * 0.3) lo = 0; else { var pad0 = (hi - mn) * 0.35 || Math.abs(hi) * 0.05 || 1; lo = mn - pad0; }   /* zero baseline when the variation is large enough to read */
    hi += (hi - lo) * 0.12 || 1;
    var bw = (W - pl - pr) / n, X = function (i) { return pl + bw * (i + 0.5); }, Y = function (v) { return pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo)); };
    var cols = V.series.map(function (v, i) {
      var y = Y(v), w = Math.min(46, bw * 0.62);
      return '<rect class="nd-col nd-tone--' + (i === V.idx ? 'lime' : 'blue') + (i === V.idx ? ' is-sel' : '') + '" x="' + (X(i) - w / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(1, H - pb - y).toFixed(1) + '" rx="5" style="--i:' + i + '"/>' +
        (i === V.idx || n <= 6 ? '<text class="nd-vlabel' + (i === V.idx ? '' : ' is-dim') + '" x="' + X(i).toFixed(1) + '" y="' + (y - 7).toFixed(1) + '" text-anchor="middle">' + fmt(v, d.dec) + '</text>' : '');
    }).join('');
    return '<svg class="nd-svg nd-cols" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '">' + yaxis(lo, hi, Y, pl, W, pr, d.dec) + xaxis(V, X, H) + cols + picks(V, X, bw, pt, H - pt) + '</svg>';
  }
  function tstack(d, V, ns, o) {
    var W = 560, H = o.h || 240, pl = 44, pr = 14, pt = 14, pb = 28, n = V.x.length, bw = (W - pl - pr) / n;
    var X = function (i) { return pl + bw * (i + 0.5); }, Y = function (v) { return pt + (H - pt - pb) * (1 - v / 100); }, out = '';
    V.stackT.forEach(function (sh, p) {
      var acc = 0, w = Math.min(46, bw * 0.66);
      sh.forEach(function (v, i) {
        var y1 = Y(acc + v), y0 = Y(acc); acc += v;
        out += '<rect class="nd-seg nd-tone--' + TONES[i % TONES.length] + (p === V.idx ? ' is-sel' : '') + '" x="' + (X(p) - w / 2).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, y0 - y1 - 2).toFixed(1) + '" rx="4" style="--i:' + p + '"><title>' + esc(lab(ns, d.shares.labels[i])) + ' · ' + esc(V.x[p]) + ' : ' + fmt(v, 0) + ' %</title></rect>';
      });
    });
    var sel = V.idx >= 0 ? V.stackT[V.idx] : V.stackT[n - 1];
    return '<svg class="nd-svg nd-stack" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || '') + '">' + yaxis(0, 100, Y, pl, W, pr, 0) + xaxis(V, X, H) + out + picks(V, X, bw, pt, H - pt) + '</svg>' +
      '<ul class="nd-legend">' + d.shares.labels.map(function (k, i) { return '<li class="nd-tone--' + TONES[i % TONES.length] + '"><i></i>' + esc(lab(ns, k)) + ' <b>' + fmt(sel[i], 0) + ' %</b></li>'; }).join('') + '</ul>';
  }
  /* The series over time, in the style chosen by the definition. */
  function trend(d, V, ns, o) {
    o = o || {};
    if (d.tchart === 'stack' && V.stackT) return tstack(d, V, ns, o);
    return (d.tchart === 'cols' ? tcols : tline)(d, V, ns, o);
  }
  /* Breakdown for the selected period (V.vals / V.grid / V.v). */
  function chart(d, V, ns, o) {
    o = o || {};
    if (d.type === 'flows') return flows({ left: d.left, right: d.right, links: d.links, label: o.label }, ns);
    var f = { bars: bars, stack: stack, donut: donut, gauge: gauge, radar: radar, heat: heat }[d.type];
    return f ? f(d, V, ns, o) : trend(d, V, ns, o);
  }
  function hasBreakdown(d) { return !!{ bars: 1, stack: 1, donut: 1, gauge: 1, radar: 1, heat: 1, flows: 1 }[d.type]; }
  function spark(hist) {
    var lo = Math.min.apply(null, hist), hi = Math.max.apply(null, hist), n = hist.length, span = (hi - lo) || 1;
    return '<svg class="nd-spark" viewBox="0 0 80 24" aria-hidden="true" preserveAspectRatio="none"><path d="' + hist.map(function (v, i) { return (i ? 'L' : 'M') + (n > 1 ? 80 * i / (n - 1) : 40).toFixed(1) + ' ' + (21 - 18 * (v - lo) / span).toFixed(1); }).join(' ') + '"/></svg>';
  }
  function delta(d, V) {
    if (V.prev == null) return '<span class="nd-delta">' + esc(t('nd.first')) + '</span>';
    var diff = V.v - V.prev, up = diff >= 0, good = (d.good === 'down') ? !up : up;
    return '<span class="nd-delta ' + (Math.abs(diff) < 1e-9 || d.good === 'none' ? '' : good ? 'is-good' : 'is-bad') + '">' + ico(up ? 'up' : 'down') + fmt(Math.abs(diff), Math.abs(V.v) >= 1000 ? (d.dec || 0) : Math.max(1, d.dec || 0)) + ' <i>' + esc(t('nd.vs', { p: V.prevLabel })) + '</i></span>';
  }
  function value(d, V) { return fmt(V.v, d.dec) + (d.unit ? '<small>' + esc(d.unit) + '</small>' : ''); }
  function table(d, V, ns) {
    var head = V.x.map(function (x, i) { return '<th scope="col"' + (i === V.idx ? ' class="is-sel"' : '') + '>' + esc(x) + '</th>'; }).join('');
    var row = function (name, arr) { return '<tr><th scope="row">' + esc(name) + '</th>' + arr.map(function (v, i) { return '<td' + (i === V.idx ? ' class="is-sel"' : '') + '>' + fmt(v, d.dec) + '</td>'; }).join('') + '</tr>'; };
    return '<div class="nd-tablewrap"><table class="nd-table"><thead><tr><th scope="col">' + esc(t('nd.col.period')) + '</th>' + head + '</tr></thead><tbody>' +
      row(d.s2 ? lab(ns, d.s1 || 'value') : t('nd.col.value') + (d.unit ? ' (' + d.unit + ')' : ''), V.series) + (V.series2 ? row(lab(ns, d.s2.name), V.series2) : '') + '</tbody></table></div>';
  }

  /* ---- 4. Indicator explorer ------------------------------------------------------ */
  /* cfg: { ns, defs (15 indicator definitions with fam), families: [ids], view: function (def) → Model.view() }   */
  function Explorer(cfg) { this.cfg = cfg; this.fam = 'all'; this.sel = cfg.defs[0].id; }
  Explorer.prototype.list = function () { var f = this.fam; return this.cfg.defs.filter(function (d) { return f === 'all' || d.fam === f; }); };
  Explorer.prototype.def = function (id) { var out = null; this.cfg.defs.forEach(function (d) { if (d.id === id) out = d; }); return out; };
  Explorer.prototype.num = function (d) { return this.cfg.defs.indexOf(d) + 1; };
  Explorer.prototype.cardsHtml = function () {
    var self = this, ns = this.cfg.ns;
    return this.list().map(function (d, i) {
      var n = self.num(d), V = self.cfg.view(d);
      return '<li style="--i:' + i + '"><button type="button" class="nd-card" data-nd-ind="' + d.id + '" aria-pressed="' + (d.id === self.sel) + '">' +
        '<span class="nd-card__n">' + (n < 10 ? '0' : '') + n + '</span><span class="nd-card__t">' + esc(t(ns + '.i' + n + '.t')) + '</span>' +
        '<span class="nd-card__v">' + value(d, V) + '</span><span class="nd-card__s">' + spark(V.series) + '</span></button></li>';
    }).join('');
  };
  Explorer.prototype.detailHtml = function () {
    var d = this.def(this.sel), ns = this.cfg.ns, V = this.cfg.view(d), n = this.num(d), title = t(ns + '.i' + n + '.t');
    var evo = V.gran === 'year' ? t('nd.evo.year', { a: Y0, b: Y1 }) : t('nd.evo.month', { year: V.year }), second, secondTitle;
    if (hasBreakdown(d)) { second = chart(d, V, ns, { label: title, h: 220 }); var pl = (d.type === 'heat' || d.type === 'stack') ? V.yearLabel : V.label; secondTitle = d.b ? t(ns + '.i' + n + '.b') + ' · ' + pl : t('nd.detail', { p: pl }); }
    else {                                        /* no breakdown: show the other time step, in the other chart style */
      var A = { series: V.alt.series, x: V.alt.x, idx: V.alt.idx, kind: V.alt.kind };
      second = (d.tchart === 'cols' ? tline : tcols)({ dec: d.dec }, A, ns, { label: title, h: 200 });
      secondTitle = V.gran === 'year' ? t('nd.evo.month', { year: V.year }) : t('nd.evo.year', { a: Y0, b: Y1 });
    }
    return '<div class="nd-detail__top"><span class="nd-detail__n">' + (n < 10 ? '0' : '') + n + '</span><div class="nd-detail__ttl"><span class="nd-fam">' + esc(t(ns + '.fam.' + d.fam)) + ' · ' + esc(t('nd.n', { n: n, total: this.cfg.defs.length })) + '</span>' +
        '<h4 id="' + ns + 'NdTitle" tabindex="-1">' + esc(title) + '</h4></div>' +
        '<button type="button" class="nd-ibtn" data-nd-step="-1" aria-label="' + esc(t('nd.prev')) + '">' + ico('left') + '</button><button type="button" class="nd-ibtn" data-nd-step="1" aria-label="' + esc(t('nd.next')) + '">' + ico('right') + '</button></div>' +
      '<div class="nd-read"><b class="nd-read__v">' + value(d, V) + '</b>' + delta(d, V) + '<span class="nd-ptag">' + ico('cal') + esc(V.label) + '</span></div>' +
      '<div class="nd-figs"><figure class="nd-chart is-in"><figcaption>' + esc(evo) + '</figcaption>' + trend(d, V, ns, { label: title + ' — ' + evo, h: 230 }) + '</figure>' +
        '<figure class="nd-chart is-in"><figcaption>' + esc(secondTitle) + '</figcaption>' + second + '</figure></div>' +
      '<div class="nd-data"><div class="nd-data__head"><h5>' + ico('table') + esc(t('nd.table')) + '</h5><button type="button" class="btn secondary nd-export" data-nd-export="' + d.id + '">' + ico('dl') + '<span>' + esc(t('nd.export')) + '</span></button></div>' + table(d, V, ns) + '</div>' +
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
      '<div class="nd-split"><div class="nd-detail" data-nd-detail>' + this.detailHtml() + '</div>' +
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
    if (det) { det.innerHTML = this.detailHtml(); centerSel(det); }
    [].forEach.call(host.querySelectorAll('[data-nd-ind]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-nd-ind') === id)); });
    var on = host.querySelector('[data-nd-ind="' + id + '"]'), strip = host.querySelector('[data-nd-cards]');
    if (on && strip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, on.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2);
    if (fromCard && det && global.matchMedia && global.matchMedia('(max-width: 1100px)').matches) det.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
  };

  /* ---- 5. Page furniture ------------------------------------------------------------ */
  function mandate(ns) {
    return '<section class="card nd-mandate"><span class="nd-mandate__ico">' + ico('target') + '</span><div><span class="nd-kicker">' + esc(t('nd.mandate')) + '</span>' +
      '<h3>' + esc(t(ns + '.mandate.t')) + '</h3><p>' + esc(t(ns + '.mandate')) + '</p></div><span class="pill nd-simtag">' + esc(t('nd.sim')) + '</span></section>';
  }
  function panel(cls, title, sub, body, attr) {
    return '<section class="card nd-panel ' + cls + '"><header class="nd-panel__head"><h3>' + esc(title) + '</h3>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</header><div class="nd-panel__body" ' + (attr || '') + '>' + body + '</div></section>';
  }
  function note() { return '<p class="nd-note">' + ico('info') + '<span>' + esc(t('nd.note')) + '</span></p>'; }
  /* On narrow screens the time charts scroll sideways: bring the selected period into view. */
  function centerSel(rootEl) {
    [].forEach.call(rootEl.querySelectorAll('.nd-chart, .nd-panel__body, .nd-tablewrap'), function (box) {
      if (box.scrollWidth <= box.clientWidth + 2) return;
      var el = box.querySelector('.nd-axis.is-sel, th.is-sel'); if (!el) return;
      var a = el.getBoundingClientRect(), b = box.getBoundingClientRect(), st = box.querySelector('th[scope="row"]');
      var pad = st ? st.getBoundingClientRect().width : 0;   /* sticky first column of the data table */
      box.scrollLeft = Math.max(0, box.scrollLeft + (a.left + a.width / 2) - (b.left + pad + (b.width - pad) / 2));
    });
  }
  function csvCell(v) { v = String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, text) {
    try {
      var url = global.URL.createObjectURL(new global.Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' })), a = doc.createElement('a');
      a.href = url; a.download = name; doc.body.appendChild(a); a.click(); doc.body.removeChild(a);
      global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 2000);
      return true;
    } catch (e) { return false; }
  }

  /* ---- 6. Board: a complete dashboard ---------------------------------------------------
     (mandate, period selector, KPIs, overview panels, flow map, explorer of the 15 indicators)
     cfg = { ns, root (the view <section>), slot (id of the placeholder re-emitted by the host view),
             countrySelect (id of the view's own country <select>; default: the header #country),
             defs (15 indicators), families, over (overview chart defs), layout ([{ o: index in over | 'flows', cls }]),
             flows ({ left, right, links }), kpis ([{ k, base (level in the latest year), growth (×/year, default 1.22), flow (true = count per period) }]) }
     Dictionary keys: <ns>.mandate(.t), <ns>.kN, <ns>.oN.t/.s (N = position in layout), <ns>.fam.*, <ns>.l.*, <ns>.iN.t/.c/.a(/.b)
     Returns { mount, state, setPeriod, select, csv }. Every figure is simulated and seeded per country. */
  function Board(cfg) {
    var NS = cfg.ns, seed = '', model = null, over = null, explorer = null, kr = [];
    var P = { gran: 'year', year: Y1, month: LASTM };
    var host = doc.createElement('div'); host.className = 'nd-host';
    function country() { var sel = doc.getElementById(cfg.countrySelect || 'country') || doc.getElementById('country'); return (sel && sel.value) || 'TG'; }
    function view(d) { return model.view(d, P); }
    function build() {
      seed = NS + ':' + country();
      model = new Model(cfg.defs, seed); over = new Model(cfg.over, seed + ':o');
      var r = rng(seed + ':k');
      kr = cfg.kpis.map(function () { return 0.85 + r() * 0.3; });
      if (!explorer) explorer = new Explorer({ ns: NS, defs: cfg.defs, families: cfg.families, view: view });
    }
    function kpiValue(k, i) {
      var yrs = (Y1 - P.year) - (P.gran === 'month' ? (Math.min(P.month, monthsIn(P.year) - 1) - LASTM) / 12 : 0);
      var v = k.base * kr[i] / Math.pow(k.growth || 1.22, Math.max(0, yrs));
      if (k.flow || k.step > 0) v = P.gran === 'month' ? v / 12 * (1 + 0.06 * Math.cos(2 * Math.PI * (P.month - i * 2) / 12)) : v * monthsIn(P.year) / 12;
      return Math.max(1, Math.round(v));
    }
    function oChart(n) {
      var d = cfg.over[cfg.layout[n].o], V = over.view(d, P), o = { label: t(NS + '.o' + (n + 1) + '.t'), h: n === 0 ? 230 : 230 };
      return hasBreakdown(d) ? chart(d, V, NS, o) : trend(d, V, NS, o);
    }
    function periodHtml() {
      var V = over.view(cfg.over[0], P);
      var years = YEARS.map(function (y) { return '<option value="' + y + '"' + (y === P.year ? ' selected' : '') + '>' + y + '</option>'; }).join(''), months = '';
      for (var m = 0; m < monthsIn(P.year); m++) months += '<option value="' + m + '"' + (m === V.month ? ' selected' : '') + '>' + esc(monthName(m, true)) + '</option>';
      return '<section class="card nd-period" aria-label="' + esc(t('nd.period')) + '"><span class="vh-ico">' + ico('cal') + '</span>' +
        '<div class="nd-period__txt"><h3>' + esc(t('nd.period')) + ' · <span class="nd-period__now">' + esc(V.label) + '</span></h3><p>' + esc(t('nd.period.sub', { a: Y0, b: Y1 })) + '</p></div>' +
        '<div class="nd-period__ctl"><div class="nd-segs" role="group" aria-label="' + esc(t('nd.gran')) + '">' +
          ['year', 'month'].map(function (g) { return '<button type="button" class="nd-seg-btn" data-nd-gran="' + g + '" aria-pressed="' + (P.gran === g) + '">' + esc(t('nd.gran.' + g)) + '</button>'; }).join('') + '</div>' +
          '<label class="nd-field"><span>' + esc(t('nd.year')) + '</span><select data-nd-year>' + years + '</select></label>' +
          (P.gran === 'month' ? '<label class="nd-field"><span>' + esc(t('nd.month')) + '</span><select data-nd-month>' + months + '</select></label>' : '') + '</div></section>';
    }
    function html() {
      var panels = cfg.layout.map(function (L, n) {
        var body = L.o === 'flows' ? flows({ left: cfg.flows.left, right: cfg.flows.right, links: cfg.flows.links, label: t(NS + '.o' + (n + 1) + '.t') }, NS) : oChart(n);
        return panel('vrd-p vrd-p--' + L.cls, t(NS + '.o' + (n + 1) + '.t'), t(NS + '.o' + (n + 1) + '.s'), body);
      }).join('');
      return '<div class="nd">' + mandate(NS) + periodHtml() +
        '<ul class="nd-kpis" aria-label="' + esc(t('nd.kpis')) + '">' + cfg.kpis.map(function (k, i) { return '<li><span>' + esc(t(NS + '.' + k.k)) + '</span><b data-nd-count="' + kpiValue(k, i) + '">' + fmt(kpiValue(k, i), 0) + '</b></li>'; }).join('') + '</ul>' +
        '<div class="vrd-grid">' + panels + '</div>' + explorer.html() + note() + '</div>';
    }
    function countUp() {
      if (reduced() || !global.requestAnimationFrame) return;
      [].forEach.call(host.querySelectorAll('[data-nd-count]'), function (el) {
        var to = +el.getAttribute('data-nd-count'), from = to * 0.82, t0 = null;
        global.requestAnimationFrame(function step(ts) {
          if (t0 == null) t0 = ts;
          var k = Math.min(1, (ts - t0) / 650), e = 1 - Math.pow(1 - k, 3);
          el.textContent = fmt(Math.round(from + (to - from) * e), 0);
          if (k < 1 && el.isConnected) global.requestAnimationFrame(step);
        });
      });
    }
    function paint(focusSel) {
      host.innerHTML = html(); countUp(); centerSel(host);
      if (focusSel) { var f = host.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
    }
    function setPeriod(next, focusSel) {
      if (next.gran === 'year' || next.gran === 'month') P.gran = next.gran;
      if (next.year != null && YEARS.indexOf(+next.year) >= 0) P.year = +next.year;
      if (next.month != null && +next.month >= 0 && +next.month < 12) P.month = +next.month;
      P.month = Math.min(P.month, monthsIn(P.year) - 1);
      paint(focusSel);
    }
    function csv(id) {
      var d = explorer.def(id || explorer.sel); if (!d) return '';
      var V = view(d), n = explorer.num(d), rows = [['# ' + t('nd.csv.note')], ['# ' + t(NS + '.i' + n + '.t')], ['# ' + I18N.countryName(country()) + ' | ' + V.label + (d.unit ? ' | ' + d.unit : '')]];
      rows.push([t('nd.col.period'), d.s2 ? lab(NS, d.s1 || 'value') : t('nd.col.value')].concat(V.series2 ? [lab(NS, d.s2.name)] : []));
      V.x.forEach(function (x, i) { rows.push([V.gran === 'month' ? P.year + '-' + (i < 9 ? '0' : '') + (i + 1) : x, Number(V.series[i]).toFixed(d.dec || 0)].concat(V.series2 ? [Number(V.series2[i]).toFixed(d.dec || 0)] : [])); });
      return rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
    }
    function mount() {
      var slot = doc.getElementById(cfg.slot);
      if (!slot) return;
      if (seed !== NS + ':' + country()) { build(); paint(); }
      if (host.parentNode !== slot) { slot.appendChild(host); centerSel(host); }
    }
    build(); explorer.bind(host); paint();
    host.addEventListener('click', function (ev) {
      var el = ev.target.closest ? ev.target.closest('[data-nd-gran], [data-nd-pick], [data-nd-export]') : null;
      if (!el || !host.contains(el)) return;
      if (el.hasAttribute('data-nd-gran')) setPeriod({ gran: el.getAttribute('data-nd-gran') }, '[data-nd-gran="' + el.getAttribute('data-nd-gran') + '"]');
      else if (el.hasAttribute('data-nd-pick')) {
        var i = +el.getAttribute('data-nd-pick');
        if (el.getAttribute('data-nd-kind') === 'year') setPeriod({ year: Y0 + i }); else setPeriod({ gran: 'month', month: i });
      } else {
        var id = el.getAttribute('data-nd-export'), d = explorer.def(id);
        if (d && download('nutri1_' + NS + '_i' + explorer.num(d) + '_' + country() + '_' + P.gran + '_' + P.year + '.csv', csv(id)) && typeof global.toast === 'function') global.toast(t('nd.exported'));
      }
    });
    host.addEventListener('change', function (ev) {
      var el = ev.target;
      if (el.hasAttribute && el.hasAttribute('data-nd-year')) setPeriod({ year: el.value }, '[data-nd-year]');
      else if (el.hasAttribute && el.hasAttribute('data-nd-month')) setPeriod({ month: el.value }, '[data-nd-month]');
    });
    I18N.onChange(function () { paint(); });
    doc.addEventListener('nutri:countryChanged', function () { mount(); });
    return {
      mount: mount, setPeriod: setPeriod, csv: csv,
      select: function (id) { explorer.select(id, false); },
      state: function () { var d = explorer.def(explorer.sel), V = view(d); return { country: country(), gran: P.gran, year: P.year, month: P.month, period: V.label, fam: explorer.fam, sel: explorer.sel, shown: explorer.list().length, value: V.v, points: V.series.length }; }
    };
  }

  global.NutriBentoDash = {
    Board: Board, Model: Model, Explorer: Explorer, chart: chart, trend: trend, flows: flows, spark: spark, value: value, delta: delta,
    mandate: mandate, panel: panel, note: note, ico: ico, fmt: fmt, esc: esc, rng: rng, reduced: reduced, YEARS: YEARS
  };
})(window);
