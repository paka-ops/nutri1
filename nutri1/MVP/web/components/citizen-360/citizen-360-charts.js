/* ============================================================================
   NUTRI.N°1 — CITIZEN 360 · moteur graphique SVG
   ----------------------------------------------------------------------------
   100 % Vanilla JS, zéro dépendance externe (pas de Chart.js, pas de CDN).
   Chaque fonction renvoie une chaîne SVG autonome avec viewBox, dégradés,
   axes, <title> accessibles et points de survol pour le tooltip du contrôleur.

   Graphiques livrés :
     · sparkline      micro-courbes des KPI
     · gauge          jauge circulaire multi-anneaux du score
     · stackedBars    énergie par repas + ligne de cible
     · multiLine      tendances cliniques normalisées, séries activables
     · donut          macronutriments
     · microBars      couverture des micronutriments
     · radar          diversité des groupes alimentaires
     · heatmap        hydratation 28 jours
     · riskBullets    scores de prévention
     · growthCurve    courbe IMC-âge avec bande P15–P85
   ========================================================================== */
(function (global) {
  'use strict';

  var M = global.C360_MODEL;
  var esc = M ? M.esc : function (v) { return String(v == null ? '' : v); };
  var uid = 0;

  function id(prefix) { uid += 1; return prefix + '-' + uid; }
  function n(v) { return String(Math.round(Number(v) * 100) / 100); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function polar(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function arc(cx, cy, r, start, end) {
    var p1 = polar(cx, cy, r, start), p2 = polar(cx, cy, r, end);
    var large = (end - start) > 180 ? 1 : 0;
    return 'M ' + n(p1[0]) + ' ' + n(p1[1]) + ' A ' + n(r) + ' ' + n(r) + ' 0 ' + large + ' 1 ' + n(p2[0]) + ' ' + n(p2[1]);
  }

  function donutSlice(cx, cy, ro, ri, start, end) {
    var a = polar(cx, cy, ro, start), b = polar(cx, cy, ro, end);
    var c = polar(cx, cy, ri, end), d = polar(cx, cy, ri, start);
    var large = (end - start) > 180 ? 1 : 0;
    return 'M ' + n(a[0]) + ' ' + n(a[1]) +
      ' A ' + n(ro) + ' ' + n(ro) + ' 0 ' + large + ' 1 ' + n(b[0]) + ' ' + n(b[1]) +
      ' L ' + n(c[0]) + ' ' + n(c[1]) +
      ' A ' + n(ri) + ' ' + n(ri) + ' 0 ' + large + ' 0 ' + n(d[0]) + ' ' + n(d[1]) + ' Z';
  }

  function smoothPath(points) {
    if (!points.length) return '';
    if (points.length === 1) return 'M ' + n(points[0][0]) + ' ' + n(points[0][1]);
    var d = 'M ' + n(points[0][0]) + ' ' + n(points[0][1]);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i - 1] || points[i];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C ' + n(c1x) + ' ' + n(c1y) + ' ' + n(c2x) + ' ' + n(c2y) + ' ' + n(p2[0]) + ' ' + n(p2[1]);
    }
    return d;
  }

  function svgWrap(opts, inner, points) {
    var w = opts.w || 720, h = opts.h || 280;
    var pts = points || [];
    return '<svg class="c360-svg" viewBox="0 0 ' + w + ' ' + h + '" role="img" ' +
      'aria-label="' + esc(opts.aria || opts.title || 'Chart') + '" ' +
      'data-c360-chart="1" data-points="' + esc(JSON.stringify(pts)) + '">' +
      '<title>' + esc(opts.title || opts.aria || 'Chart') + '</title>' + inner + '</svg>';
  }

  function gridLines(x, y, w, h, rows, cols, fmtY) {
    var s = '';
    for (var r = 0; r <= rows; r++) {
      var yy = y + (h / rows) * r;
      s += '<line class="c360-grid-line' + (r === rows ? ' c360-grid-line--strong' : '') + '" x1="' + n(x) + '" y1="' + n(yy) + '" x2="' + n(x + w) + '" y2="' + n(yy) + '"/>';
      if (fmtY) s += '<text class="c360-axis-label" x="' + n(x - 8) + '" y="' + n(yy + 3.5) + '" text-anchor="end">' + esc(fmtY(r)) + '</text>';
    }
    for (var c = 0; c <= cols; c++) {
      var xx = x + (w / cols) * c;
      s += '<line class="c360-grid-line" x1="' + n(xx) + '" y1="' + n(y) + '" x2="' + n(xx) + '" y2="' + n(y + h) + '"/>';
    }
    return s;
  }

  function defsLinear(idName, color, opacityTop, opacityBottom) {
    return '<linearGradient id="' + idName + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="' + (opacityTop == null ? .38 : opacityTop) + '"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="' + (opacityBottom == null ? 0 : opacityBottom) + '"/>' +
      '</linearGradient>';
  }

  /* ------------------------------------------------------------ sparkline */
  function sparkline(values, opts) {
    opts = opts || {};
    var w = 140, h = 40, p = 3;
    var vals = (values || []).slice(-14).map(Number);
    if (!vals.length) vals = [0, 0];
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = (max - min) || 1;
    var color = opts.color || '#34d399';
    var gid = id('c360-spark');
    var pts = vals.map(function (v, i) {
      return [p + i * (w - 2 * p) / Math.max(1, vals.length - 1), h - p - ((v - min) / span) * (h - 2 * p)];
    });
    var line = smoothPath(pts);
    var area = line + ' L ' + n(pts[pts.length - 1][0]) + ' ' + n(h) + ' L ' + n(pts[0][0]) + ' ' + n(h) + ' Z';
    var last = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="c360-svg" role="img" aria-label="' + esc(opts.aria || 'Trend') + '">' +
      '<defs>' + defsLinear(gid, color, .38, 0) + '</defs>' +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle class="c360-dot" cx="' + n(last[0]) + '" cy="' + n(last[1]) + '" r="3.2" fill="' + color + '"/>' +
      '</svg>';
  }

  /* ---------------------------------------------------------------- gauge */
  function gauge(score, rings, opts) {
    opts = opts || {};
    var w = 200, h = 200, cx = 100, cy = 100;
    var start = -135, sweep = 270;
    var gid = id('c360-gauge');
    var inner = '<defs><linearGradient id="' + gid + '" x1="0" y1="1" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="#34d399"/><stop offset="55%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#c9ee59"/>' +
      '</linearGradient></defs>';
    inner += '<circle cx="' + cx + '" cy="' + cy + '" r="76" fill="none" stroke="rgba(255,255,255,.045)" stroke-width="1"/>';
    inner += '<circle cx="' + cx + '" cy="' + cy + '" r="58" fill="rgba(52,211,153,.035)" stroke="rgba(52,211,153,.10)" stroke-width="1"/>';

    /* Graduations */
    for (var t = 0; t <= 10; t++) {
      var a = start + (sweep * t / 10);
      var p1 = polar(cx, cy, 88, a), p2 = polar(cx, cy, t % 5 === 0 ? 94 : 91, a);
      inner += '<line x1="' + n(p1[0]) + '" y1="' + n(p1[1]) + '" x2="' + n(p2[0]) + '" y2="' + n(p2[1]) + '" stroke="rgba(255,255,255,' + (t % 5 === 0 ? '.3' : '.13') + ')" stroke-width="1.2" stroke-linecap="round"/>';
    }

    /* Anneau principal : score */
    inner += '<path d="' + arc(cx, cy, 82, start, start + sweep) + '" fill="none" stroke="rgba(255,255,255,.075)" stroke-width="11" stroke-linecap="round"/>';
    inner += '<path d="' + arc(cx, cy, 82, start, start + sweep * clamp(score, 0, 100) / 100) + '" fill="none" stroke="url(#' + gid + ')" stroke-width="11" stroke-linecap="round" style="filter:drop-shadow(0 0 10px rgba(52,211,153,.45))"/>';

    /* Anneaux secondaires : sous-scores */
    var radii = [68, 60];
    (rings || []).slice(0, 2).forEach(function (ring, i) {
      var r = radii[i];
      inner += '<path d="' + arc(cx, cy, r, start, start + sweep) + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="4" stroke-linecap="round"/>';
      inner += '<path d="' + arc(cx, cy, r, start, start + sweep * clamp(ring.value, 0, 100) / 100) + '" fill="none" stroke="' + ring.color + '" stroke-width="4" stroke-linecap="round" opacity=".85"/>';
    });

    return svgWrap({ w: w, h: h, aria: opts.aria || 'Nutrition score', title: opts.title || 'Nutrition score' }, inner, []);
  }

  /* --------------------------------------------------------- stackedBars */
  function stackedBars(bars, opts) {
    opts = opts || {};
    var w = 720, h = 280, padL = 48, padR = 14, padT = 18, padB = 38;
    var cw = w - padL - padR, ch = h - padT - padB;
    var colors = opts.colors || ['#c9ee59', '#34d399', '#5cc8ff', '#e8c877'];
    var target = opts.target || 2100;
    var max = Math.max(target * 1.16, Math.max.apply(null, bars.map(function (b) { return b.total; })) * 1.1);
    var y = function (v) { return padT + ch - (v / max) * ch; };
    var step = cw / Math.max(1, bars.length);
    var bw = Math.max(6, Math.min(34, step * .58));
    var gradIds = colors.map(function () { return id('c360-bar'); });
    var inner = '<defs>' + colors.map(function (c, i) { return defsLinear(gradIds[i], c, .95, .68); }).join('') + '</defs>';
    inner += gridLines(padL, padT, cw, ch, 5, 4, function (r) { return M.fmt(max - (max / 5) * r, 0, opts.lang); });
    inner += '<line class="c360-target-line" x1="' + n(padL) + '" y1="' + n(y(target)) + '" x2="' + n(padL + cw) + '" y2="' + n(y(target)) + '"/>';
    inner += '<text class="c360-axis-label" x="' + n(padL + cw - 2) + '" y="' + n(y(target) - 6) + '" text-anchor="end" fill="#c9ee59">' + esc(opts.targetLabel || 'Target') + '</text>';

    var points = [];
    bars.forEach(function (b, i) {
      var x = padL + step * i + (step - bw) / 2;
      var acc = 0;
      b.parts.forEach(function (v, k) {
        var y1 = y(acc + v), y2 = y(acc);
        var height = Math.max(0, y2 - y1);
        inner += '<rect class="c360-bar" x="' + n(x) + '" y="' + n(y1) + '" width="' + n(bw) + '" height="' + n(height) + '" fill="url(#' + gradIds[k % gradIds.length] + ')" opacity=".95">' +
          '<title>' + esc((opts.segmentLabels || [])[k] || '') + ' · ' + esc(M.fmt(v, 0, opts.lang) + ' ' + (opts.unit || '')) + '</title></rect>';
        acc += v;
      });
      inner += '<text class="c360-axis-label" x="' + n(x + bw / 2) + '" y="' + n(h - 15) + '" text-anchor="middle">' + esc(opts.xLabels[i] || '') + '</text>';
      points.push({ x: x + bw / 2, y: y(b.total), label: opts.xLabels[i] || '', value: M.fmt(b.total, 0, opts.lang) + ' ' + (opts.unit || ''), series: opts.totalLabel || 'Total', color: colors[0] });
    });
    inner += '<text class="c360-axis-title" transform="translate(12 ' + n(padT + ch / 2) + ') rotate(-90)" text-anchor="middle">' + esc(opts.unit || '') + '</text>';
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Energy chart', title: opts.title || 'Energy chart' }, inner, points);
  }

  /* ------------------------------------------------------------ multiLine */
  function multiLine(series, opts) {
    opts = opts || {};
    var w = 720, h = 280, padL = 46, padR = 16, padT = 18, padB = 38;
    var cw = w - padL - padR, ch = h - padT - padB;
    var all = [];
    series.forEach(function (s) { s.values.forEach(function (v) { all.push(v); }); });
    if (!all.length) all = [95, 105];
    var min = Math.min.apply(null, all), max = Math.max.apply(null, all);
    var pad = Math.max(2, (max - min) * .28);
    min -= pad; max += pad;
    var count = Math.max.apply(null, series.map(function (s) { return s.values.length; }).concat([2]));
    var x = function (i) { return padL + (cw * i) / Math.max(1, count - 1); };
    var y = function (v) { return padT + ch - ((v - min) / (max - min)) * ch; };
    var areaId = id('c360-line-area');
    var inner = '<defs>' + defsLinear(areaId, '#34d399', .22, 0) + '</defs>';
    inner += gridLines(padL, padT, cw, ch, 4, 5, function (r) { return M.fmt(max - ((max - min) / 4) * r, 0, opts.lang); });
    /* Ligne de référence base 100 */
    if (min < 100 && max > 100) {
      inner += '<line class="c360-target-line" x1="' + n(padL) + '" y1="' + n(y(100)) + '" x2="' + n(padL + cw) + '" y2="' + n(y(100)) + '"/>';
      inner += '<text class="c360-axis-label" x="' + n(padL + cw - 2) + '" y="' + n(y(100) - 6) + '" text-anchor="end">' + esc(opts.indexLabel || '100') + '</text>';
    }
    /* Étiquettes d'axe X échantillonnées */
    var ticks = Math.min(6, count);
    for (var t = 0; t < ticks; t++) {
      var i = Math.round((count - 1) * t / Math.max(1, ticks - 1));
      inner += '<text class="c360-axis-label" x="' + n(x(i)) + '" y="' + n(h - 15) + '" text-anchor="' + (t === 0 ? 'start' : t === ticks - 1 ? 'end' : 'middle') + '">' + esc((opts.xLabels || [])[i] || '') + '</text>';
    }

    var points = [];
    series.forEach(function (s, si) {
      var pts = s.values.map(function (v, i) { return [x(i), y(v)]; });
      var line = smoothPath(pts);
      if (si === 0 && pts.length > 1) {
        inner += '<path class="c360-area" d="' + line + ' L ' + n(pts[pts.length - 1][0]) + ' ' + n(padT + ch) + ' L ' + n(pts[0][0]) + ' ' + n(padT + ch) + ' Z" fill="url(#' + areaId + ')"/>';
      }
      inner += '<path class="c360-line" d="' + line + '" stroke="' + s.color + '"/>';
      var last = pts[pts.length - 1];
      if (last) inner += '<circle class="c360-dot" cx="' + n(last[0]) + '" cy="' + n(last[1]) + '" r="4" fill="' + s.color + '"><title>' + esc(s.label || s.key) + '</title></circle>';
      pts.forEach(function (p, i) {
        points.push({
          x: p[0], y: p[1],
          label: (opts.xLabels || [])[i] || '',
          value: opts.formatPoint ? opts.formatPoint(s, i) : M.fmt(s.values[i], 1, opts.lang),
          series: s.label || s.key,
          color: s.color
        });
      });
    });
    inner += '<text class="c360-axis-title" transform="translate(12 ' + n(padT + ch / 2) + ') rotate(-90)" text-anchor="middle">' + esc(opts.indexLabel || 'Index') + '</text>';
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Clinical trends', title: opts.title || 'Clinical trends' }, inner, points);
  }

  /* ---------------------------------------------------------------- donut */
  function donut(macros, opts) {
    opts = opts || {};
    var w = 240, h = 240, cx = 120, cy = 120, ro = 96, ri = 64;
    var items = macros.filter(function (m) { return m.kcal > 0; });
    var total = items.reduce(function (a, m) { return a + m.kcal; }, 0) || 1;
    var inner = '', angle = 0, points = [];
    items.forEach(function (m) {
      var sweep = (m.kcal / total) * 360;
      var s = angle + 1.1, e = angle + sweep - 1.1;
      if (e > s) {
        inner += '<path class="c360-arc" d="' + donutSlice(cx, cy, ro, ri, s, e) + '" fill="' + m.color + '" opacity=".92">' +
          '<title>' + esc(m.label || m.key) + ' · ' + esc(M.fmt(m.kcal, 0, opts.lang) + ' ' + (opts.unit || '')) + '</title></path>';
      }
      var mid = polar(cx, cy, (ro + ri) / 2, angle + sweep / 2);
      points.push({ x: mid[0], y: mid[1], label: m.label || m.key, value: M.fmt(m.kcal / total * 100, 1, opts.lang) + ' %', series: m.label || m.key, color: m.color });
      angle += sweep;
    });
    inner += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (ri - 7) + '" fill="rgba(5,18,12,.55)" stroke="rgba(255,255,255,.08)"/>';
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Macronutrients', title: opts.title || 'Macronutrients' }, inner, points);
  }

  /* ------------------------------------------------------------- microBars */
  function microBars(items, opts) {
    opts = opts || {};
    var w = 420, h = 300, padL = 96, padR = 46, padT = 12, rowH = 34;
    var barW = w - padL - padR;
    var max = 120;
    var x = function (pct) { return padL + (clamp(pct, 0, max) / max) * barW; };
    var targetX = x(100);
    var inner = '<line class="c360-target-line" x1="' + n(targetX) + '" y1="' + n(padT) + '" x2="' + n(targetX) + '" y2="' + n(padT + rowH * items.length) + '"/>';
    var points = [];
    var statusColor = { good: '#34d399', watch: '#e8c877', high: '#fb7185' };
    items.forEach(function (it, i) {
      var pct = (it.value / it.target) * 100;
      var yy = padT + i * rowH;
      var color = it.inverse ? (pct > 90 ? '#e8c877' : '#34d399') : (statusColor[it.status] || '#34d399');
      inner += '<text class="c360-axis-label" x="' + n(padL - 10) + '" y="' + n(yy + 18) + '" text-anchor="end">' + esc(it.label || it.key) + '</text>';
      inner += '<rect class="c360-bullet-track" x="' + n(padL) + '" y="' + n(yy + 7) + '" width="' + n(barW) + '" height="12" rx="6"/>';
      inner += '<rect class="c360-bar" x="' + n(padL) + '" y="' + n(yy + 7) + '" width="' + n(Math.max(2, x(pct) - padL)) + '" height="12" rx="6" fill="' + color + '" opacity=".88">' +
        '<title>' + esc(it.label || it.key) + ' · ' + esc(M.fmt(it.value, 1, opts.lang) + ' / ' + M.fmt(it.target, 0, opts.lang) + ' ' + it.unit) + '</title></rect>';
      inner += '<text class="c360-axis-label" x="' + n(w - 6) + '" y="' + n(yy + 18) + '" text-anchor="end">' + esc(M.fmt(pct, 0, opts.lang) + '%') + '</text>';
      points.push({ x: x(pct), y: yy + 13, label: it.label || it.key, value: M.fmt(it.value, 1, opts.lang) + ' / ' + M.fmt(it.target, 0, opts.lang) + ' ' + it.unit, series: opts.seriesLabel || '', color: color });
    });
    inner += '<text class="c360-axis-title" x="' + n(targetX) + '" y="' + n(padT + rowH * items.length + 15) + '" text-anchor="middle">' + esc(opts.targetLabel || '100%') + '</text>';
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Micronutrients', title: opts.title || 'Micronutrients' }, inner, points);
  }

  /* ---------------------------------------------------------------- radar */
  function radar(items, opts) {
    opts = opts || {};
    var w = 420, h = 310, cx = 210, cy = 150, r = 106;
    var count = items.length || 6;
    var angle = function (i) { return (360 / count) * i; };
    var pt = function (i, value) { var p = polar(cx, cy, r * clamp(value, 0, 100) / 100, angle(i)); return [p[0], p[1]]; };
    var inner = '';
    [25, 50, 75, 100].forEach(function (level) {
      var pts = items.map(function (_, i) { var p = polar(cx, cy, r * level / 100, angle(i)); return n(p[0]) + ',' + n(p[1]); }).join(' ');
      inner += '<polygon class="c360-radar-grid" points="' + pts + '"/>';
    });
    items.forEach(function (_, i) {
      var p = polar(cx, cy, r, angle(i));
      inner += '<line class="c360-radar-axis" x1="' + n(cx) + '" y1="' + n(cy) + '" x2="' + n(p[0]) + '" y2="' + n(p[1]) + '"/>';
      var lp = polar(cx, cy, r + 24, angle(i));
      var anchor = lp[0] < cx - 12 ? 'end' : lp[0] > cx + 12 ? 'start' : 'middle';
      inner += '<text class="c360-axis-label" x="' + n(lp[0]) + '" y="' + n(lp[1] + 3) + '" text-anchor="' + anchor + '">' + esc((opts.labels || [])[i] || '') + '</text>';
    });
    var targetPts = items.map(function (it, i) { return pt(i, it.target); });
    var actualPts = items.map(function (it, i) { return pt(i, it.actual); });
    inner += '<polygon class="c360-radar-area" points="' + targetPts.map(function (p) { return p.join(','); }).join(' ') + '" fill="rgba(167,139,250,.07)" stroke="#a78bfa" stroke-dasharray="5 4"/>';
    inner += '<polygon class="c360-radar-area" points="' + actualPts.map(function (p) { return p.join(','); }).join(' ') + '" fill="rgba(52,211,153,.16)" stroke="#34d399"/>';
    var points = [];
    actualPts.forEach(function (p, i) {
      inner += '<circle class="c360-marker" cx="' + n(p[0]) + '" cy="' + n(p[1]) + '" r="3.6" fill="#c9ee59"><title>' + esc((opts.labels || [])[i] || '') + ' · ' + esc(M.fmt(items[i].actual, 0, opts.lang)) + '</title></circle>';
      points.push({ x: p[0], y: p[1], label: (opts.labels || [])[i] || '', value: M.fmt(items[i].actual, 0, opts.lang) + ' / ' + M.fmt(items[i].target, 0, opts.lang), series: opts.actualLabel || 'Actual', color: '#34d399' });
    });
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Dietary diversity', title: opts.title || 'Dietary diversity' }, inner, points);
  }

  /* -------------------------------------------------------------- heatmap */
  function heatmap(cells, opts) {
    opts = opts || {};
    var w = 420, h = 242, padL = 42, padT = 30, cell = 44, gap = 6;
    var inner = '';
    var dayLabels = opts.dayLabels || ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    dayLabels.forEach(function (d, i) {
      inner += '<text class="c360-axis-label" x="' + n(padL + i * (cell + gap) + cell / 2) + '" y="' + n(padT - 10) + '" text-anchor="middle">' + esc(d) + '</text>';
    });
    function color(v) {
      if (v >= 100) return 'rgba(201,238,89,.85)';
      if (v >= 85) return 'rgba(52,211,153,.78)';
      if (v >= 70) return 'rgba(110,231,183,.48)';
      if (v >= 55) return 'rgba(232,200,119,.42)';
      return 'rgba(251,113,133,.38)';
    }
    var points = [];
    for (var r = 0; r < 4; r++) {
      inner += '<text class="c360-axis-label" x="' + n(padL - 10) + '" y="' + n(padT + r * (cell + gap) + cell / 2 + 3) + '" text-anchor="end">' + esc((opts.weekLabel || 'W') + ' ' + (r + 1)) + '</text>';
      for (var c = 0; c < 7; c++) {
        var idx = r * 7 + c, v = cells[idx] || 0;
        var x = padL + c * (cell + gap), y = padT + r * (cell + gap);
        inner += '<rect class="c360-heat-cell" x="' + n(x) + '" y="' + n(y) + '" width="' + cell + '" height="' + cell + '" fill="' + color(v) + '">' +
          '<title>' + esc(opts.weekLabel || 'W') + ' ' + (r + 1) + ' · ' + esc(dayLabels[c]) + ' · ' + esc(M.fmt(v, 0, opts.lang) + '%') + '</title></rect>';
        inner += '<text class="c360-axis-label" x="' + n(x + cell / 2) + '" y="' + n(y + cell / 2 + 3) + '" text-anchor="middle" fill="rgba(255,255,255,.72)">' + esc(M.fmt(v, 0, opts.lang)) + '</text>';
        points.push({ x: x + cell / 2, y: y + cell / 2, label: (opts.weekLabel || 'W') + ' ' + (r + 1) + ' · ' + dayLabels[c], value: M.fmt(v, 0, opts.lang) + '%', series: opts.seriesLabel || '', color: color(v) });
      }
    }
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Hydration heatmap', title: opts.title || 'Hydration heatmap' }, inner, points);
  }

  /* ---------------------------------------------------------- riskBullets */
  function riskBullets(risks, opts) {
    opts = opts || {};
    var w = 420, h = 252, padL = 118, padR = 46, padT = 16, rowH = 56;
    var barW = w - padL - padR;
    var inner = '';
    risks.forEach(function (rk, i) {
      var y = padT + i * rowH;
      var score = clamp(rk.score, 0, 100);
      var color = rk.tone === 'good' ? '#34d399' : rk.tone === 'high' ? '#fb7185' : '#e8c877';
      inner += '<text class="c360-axis-label" x="' + n(padL - 10) + '" y="' + n(y + 16) + '" text-anchor="end">' + esc(rk.label || rk.key) + '</text>';
      inner += '<rect class="c360-bullet-track" x="' + n(padL) + '" y="' + n(y + 5) + '" width="' + n(barW) + '" height="14" rx="7"/>';
      inner += '<rect class="c360-bullet-good" x="' + n(padL) + '" y="' + n(y + 5) + '" width="' + n(barW * .3) + '" height="14" rx="7"/>';
      inner += '<rect class="c360-bullet-watch" x="' + n(padL + barW * .3) + '" y="' + n(y + 5) + '" width="' + n(barW * .3) + '" height="14"/>';
      inner += '<rect class="c360-bullet-high" x="' + n(padL + barW * .6) + '" y="' + n(y + 5) + '" width="' + n(barW * .4) + '" height="14" rx="7"/>';
      inner += '<rect class="c360-bar" x="' + n(padL) + '" y="' + n(y + 7) + '" width="' + n(Math.max(2, barW * score / 100)) + '" height="10" rx="5" fill="' + color + '" opacity=".9"><title>' + esc(rk.label || rk.key) + ' · ' + esc(M.fmt(score, 0, opts.lang) + '/100') + '</title></rect>';
      inner += '<circle class="c360-marker" cx="' + n(padL + barW * score / 100) + '" cy="' + n(y + 12) + '" r="5" fill="#fff"/>';
      inner += '<text class="c360-axis-label" x="' + n(w - 6) + '" y="' + n(y + 17) + '" text-anchor="end">' + esc(M.fmt(score, 0, opts.lang)) + '</text>';
      inner += '<text class="c360-axis-label" x="' + n(padL) + '" y="' + n(y + 35) + '" fill="rgba(226,241,232,.42)">' + esc(rk.detail || '') + '</text>';
    });
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Risk scores', title: opts.title || 'Risk scores' }, inner, []);
  }

  /* ---------------------------------------------------------- growthCurve */
  function growthCurve(child, opts) {
    opts = opts || {};
    var w = 520, h = 240, padL = 40, padR = 14, padT = 16, padB = 32;
    var cw = w - padL - padR, ch = h - padT - padB;
    var ages = child.ages;
    var minAge = ages[0], maxAge = ages[ages.length - 1];
    var all = child.values.concat(child.p15).concat(child.p85);
    var min = Math.min.apply(null, all) - 1, max = Math.max.apply(null, all) + 1;
    var x = function (a) { return padL + ((a - minAge) / (maxAge - minAge)) * cw; };
    var y = function (v) { return padT + ch - ((v - min) / (max - min)) * ch; };
    var gid = id('c360-growth');
    var inner = '<defs>' + defsLinear(gid, '#5cc8ff', .2, .03) + '</defs>';
    inner += gridLines(padL, padT, cw, ch, 4, ages.length - 1, function (r) { return M.fmt(max - ((max - min) / 4) * r, 0, opts.lang); });
    var upper = child.p85.map(function (v, i) { return [x(ages[i]), y(v)]; });
    var lower = child.p15.map(function (v, i) { return [x(ages[i]), y(v)]; }).reverse();
    var band = upper.concat(lower).map(function (p) { return n(p[0]) + ',' + n(p[1]); }).join(' ');
    inner += '<polygon points="' + band + '" fill="url(#' + gid + ')" stroke="rgba(92,200,255,.28)" stroke-width="1" stroke-dasharray="4 4"/>';
    var pts = child.values.map(function (v, i) { return [x(ages[i]), y(v)]; });
    inner += '<path class="c360-line" d="' + smoothPath(pts) + '" stroke="#c9ee59"/>';
    var points = [];
    pts.forEach(function (p, i) {
      inner += '<circle class="c360-dot" cx="' + n(p[0]) + '" cy="' + n(p[1]) + '" r="3.4" fill="#c9ee59"><title>' + esc(M.fmt(ages[i], 0, opts.lang) + ' · ' + M.fmt(child.values[i], 1, opts.lang)) + '</title></circle>';
      points.push({ x: p[0], y: p[1], label: M.fmt(ages[i], 0, opts.lang) + ' ' + (opts.ageUnit || ''), value: M.fmt(child.values[i], 1, opts.lang) + ' ' + (opts.unit || ''), series: opts.childLabel || 'Child', color: '#c9ee59' });
    });
    ages.forEach(function (a) {
      inner += '<text class="c360-axis-label" x="' + n(x(a)) + '" y="' + n(h - 12) + '" text-anchor="middle">' + esc(M.fmt(a, 0, opts.lang)) + '</text>';
    });
    return svgWrap({ w: w, h: h, aria: opts.aria || 'Growth curve', title: opts.title || 'Growth curve' }, inner, points);
  }

  /* -------------------------------------------------- tooltips interactifs */
  function activate(root) {
    if (!root) return;
    var svgs = root.querySelectorAll('[data-c360-chart]');
    Array.prototype.forEach.call(svgs, function (svg) {
      if (!svg.dataset) return;
      if (svg.dataset.c360Bound === '1') return;
      if (typeof svg.createSVGPoint !== 'function' || typeof svg.getScreenCTM !== 'function') return;
      svg.dataset.c360Bound = '1';
      var holder = svg.closest ? (svg.closest('.c360-chart') || svg.parentElement) : svg.parentElement;
      if (!holder) return;
      var tip = holder.querySelector('.c360-tooltip');
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'c360-tooltip';
        holder.appendChild(tip);
      }
      var points = [];
      try { points = JSON.parse(svg.getAttribute('data-points') || '[]'); } catch (e) { points = []; }
      if (!points.length) return;

      function hide() { tip.classList.remove('is-visible'); }

      svg.addEventListener('pointermove', function (e) {
        var matrix = svg.getScreenCTM();
        if (!matrix) return;
        var p = svg.createSVGPoint();
        p.x = e.clientX; p.y = e.clientY;
        var loc = p.matrixTransform(matrix.inverse());
        var best = null, dist = Infinity;
        for (var i = 0; i < points.length; i++) {
          var q = points[i];
          var d = Math.abs(q.x - loc.x) + Math.abs(q.y - loc.y) * .35;
          if (d < dist) { dist = d; best = q; }
        }
        if (!best || dist > 90) { hide(); return; }
        tip.style.setProperty('--tip', best.color || '#34d399');
        tip.innerHTML = '<b>' + esc(best.label) + '</b><span><i></i>' + esc(best.series || '') + ' · ' + esc(best.value || '') + '</span>';
        var rect = holder.getBoundingClientRect();
        tip.style.left = clamp(e.clientX - rect.left, 70, rect.width - 70) + 'px';
        tip.style.top = clamp(e.clientY - rect.top, 46, rect.height - 8) + 'px';
        tip.classList.add('is-visible');
      });
      svg.addEventListener('pointerleave', hide);
    });
  }

  global.C360_CHARTS = {
    sparkline: sparkline,
    gauge: gauge,
    stackedBars: stackedBars,
    multiLine: multiLine,
    donut: donut,
    microBars: microBars,
    radar: radar,
    heatmap: heatmap,
    riskBullets: riskBullets,
    growthCurve: growthCurve,
    activate: activate
  };
})(window);
