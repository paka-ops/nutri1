/* ============================================================================
 * NUTRI.N°1 — Connected Devices Lab · premium chart engine
 * ----------------------------------------------------------------------------
 * Hand-crafted SVG/canvas visual helpers used by connected-devices.js inside
 * its Shadow DOM. No external dependency (no Chart.js), no global leak.
 *
 * Exposed as window.NUTRI_DEVICES_CHARTS:
 *   • heroChart(shadowRoot, series, opts)   — dual-axis glucose + HR stream
 *   • miniTrend(el, values, opts)           — animated sparkline tile
 *   • ring(el, pct, opts)                   — circular activity ring
 *   • throughput(el, buckets, opts)         — readings-per-tick bar strip
 *   • ambient(canvas, opts)                 — aurora particle field (rAF)
 *   • animateNumber(el, to, opts)           — smooth counter
 * ========================================================================== */
(function (global) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------------- util -- */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function prefersReducedMotion() {
    try {
      return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  /* Unique gradient/filter ids so multiple charts never collide. */
  var uidSeq = 0;
  function uid(prefix) { return 'ndc_' + prefix + '_' + (++uidSeq); }

  /* ====================================================================== *
   * HERO CHART — dual series (glucose mmol/L + heart rate bpm) over a
   * rolling window. Gradient areas, glow line, pulsing cursor, crosshair.
   * ====================================================================== */
  var HERO = { w: 720, h: 230, l: 38, r: 44, t: 16, b: 26, n: 42 };

  function heroGeometry() {
    var pw = HERO.w - HERO.l - HERO.r;
    var ph = HERO.h - HERO.t - HERO.b;
    return { pw: pw, ph: ph };
  }

  function heroX(i, n) {
    var g = heroGeometry();
    return HERO.l + (n <= 1 ? 0 : (i / (n - 1)) * g.pw);
  }
  function heroYGlucose(v, min, max) {
    var g = heroGeometry();
    return HERO.h - HERO.b - clamp((v - min) / (max - min), 0, 1) * g.ph;
  }
  function heroYHr(v, min, max) {
    var g = heroGeometry();
    return HERO.h - HERO.b - clamp((v - min) / (max - min), 0, 1) * g.ph;
  }

  /**
   * Mount (once) then update the hero chart living in `root` (the shadow).
   * `state.series = { glucose: number[], hr: number[] }`
   */
  function heroChart(root, cfg) {
    if (!root) return null;
    var box = root.querySelector(cfg.mount);
    if (!box) return null;

    var minG = cfg.glucoseMin != null ? cfg.glucoseMin : 2;
    var maxG = cfg.glucoseMax != null ? cfg.glucoseMax : 12;
    var minH = cfg.hrMin != null ? cfg.hrMin : 50;
    var maxH = cfg.hrMax != null ? cfg.hrMax : 130;
    var targetLo = cfg.targetLo, targetHi = cfg.targetHi;
    var n = HERO.n;

    var api = {
      mounted: false,
      svg: null,
      refs: {},
      update: update,
      rebuildStatic: rebuildStatic
    };

    function rebuildStatic() {
      box.innerHTML = '';
      var svg = svgEl('svg', {
        viewBox: '0 0 ' + HERO.w + ' ' + HERO.h,
        preserveAspectRatio: 'none',
        role: 'img',
        'aria-label': cfg.aria || 'live chart'
      });
      svg.classList.add('ndc-hero');

      var defs = svgEl('defs');
      /* Gradient: glucose area */
      var gGrad = svgEl('linearGradient', { id: uid('ga'), x1: '0', y1: '0', x2: '0', y2: '1' });
      gGrad.appendChild(svgEl('stop', { offset: '0', 'stop-color': cfg.glucoseColor || '#12b76a', 'stop-opacity': '.34' }));
      gGrad.appendChild(svgEl('stop', { offset: '1', 'stop-color': cfg.glucoseColor || '#12b76a', 'stop-opacity': '0' }));
      /* Gradient: HR area */
      var hGrad = svgEl('linearGradient', { id: uid('ha'), x1: '0', y1: '0', x2: '0', y2: '1' });
      hGrad.appendChild(svgEl('stop', { offset: '0', 'stop-color': cfg.hrColor || '#e8b04b', 'stop-opacity': '.22' }));
      hGrad.appendChild(svgEl('stop', { offset: '1', 'stop-color': cfg.hrColor || '#e8b04b', 'stop-opacity': '0' }));
      /* Glow filter */
      var glow = svgEl('filter', { id: uid('glow'), x: '-40%', y: '-40%', width: '180%', height: '180%' });
      var blur = svgEl('feGaussianBlur', { stdDeviation: '2.2', result: 'b' });
      var merge = svgEl('feMerge');
      var m1 = svgEl('feMergeNode', { in: 'b' });
      var m2 = svgEl('feMergeNode', { in: 'SourceGraphic' });
      merge.appendChild(m1); merge.appendChild(m2);
      glow.appendChild(blur); glow.appendChild(merge);
      defs.appendChild(gGrad); defs.appendChild(hGrad); defs.appendChild(glow);
      svg.appendChild(defs);

      /* grid */
      var grid = svgEl('g', { class: 'ndc-grid' });
      for (var i = 0; i <= 4; i++) {
        var y = HERO.t + (i / 4) * heroGeometry().ph;
        grid.appendChild(svgEl('line', {
          x1: HERO.l, y1: y, x2: HERO.w - HERO.r, y2: y, class: 'ndc-gridline'
        }));
      }
      svg.appendChild(grid);

      /* target band */
      if (targetLo != null && targetHi != null) {
        var bandTop = heroYGlucose(targetHi, minG, maxG);
        var bandBot = heroYGlucose(targetLo, minG, maxG);
        var band = svgEl('rect', {
          class: 'ndc-band',
          x: HERO.l, y: bandTop, width: heroGeometry().pw, height: Math.max(0, bandBot - bandTop)
        });
        svg.appendChild(band);
        var bandLbl = svgEl('text', {
          class: 'ndc-bandlabel', x: HERO.l + 6, y: bandTop + 12
        });
        bandLbl.textContent = cfg.bandLabel || '';
        svg.appendChild(bandLbl);
      }

      var areaH = svgEl('path', { class: 'ndc-area-h', d: '', fill: 'url(#' + hGrad.id + ')' });
      var areaG = svgEl('path', { class: 'ndc-area-g', d: '', fill: 'url(#' + gGrad.id + ')' });
      var lineH = svgEl('polyline', { class: 'ndc-line-h', points: '' });
      var lineG = svgEl('polyline', { class: 'ndc-line-g', points: '' });
      lineG.setAttribute('filter', 'url(#' + glow.id + ')');
      var cross = svgEl('line', { class: 'ndc-cross', x1: -10, y1: HERO.t, x2: -10, y2: HERO.h - HERO.b });
      var dotH = svgEl('circle', { class: 'ndc-dot-h', r: 3.4, cx: -20, cy: -20 });
      var dotG = svgEl('circle', { class: 'ndc-dot-g', r: 4.2, cx: -20, cy: -20 });
      var haloG = svgEl('circle', { class: 'ndc-halo-g', r: 9, cx: -20, cy: -20 });
      svg.appendChild(areaH); svg.appendChild(areaG);
      svg.appendChild(lineH); svg.appendChild(lineG);
      svg.appendChild(cross); svg.appendChild(dotH);
      svg.appendChild(haloG); svg.appendChild(dotG);

      /* axis labels */
      var axis = svgEl('g', { class: 'ndc-axis' });
      var gLabels = [maxG, (maxG + minG) / 2 + (maxG - minG) / 4, (maxG + minG) / 2, (maxG + minG) / 2 - (maxG - minG) / 4, minG];
      var hLabels = [maxH, (maxH + minH) / 2 + (maxH - minH) / 4, (maxH + minH) / 2, (maxH + minH) / 2 - (maxH - minH) / 4, minH];
      for (var j = 0; j <= 4; j++) {
        var yl = HERO.t + (j / 4) * heroGeometry().ph + 3;
        var tg = svgEl('text', { class: 'ndc-axistext', x: 4, y: yl });
        tg.textContent = Math.round(gLabels[j]);
        var th = svgEl('text', { class: 'ndc-axistext ndc-axistext-h', x: HERO.w - HERO.r + 8, y: yl });
        th.textContent = Math.round(hLabels[j]);
        axis.appendChild(tg); axis.appendChild(th);
      }
      var nowT = svgEl('text', { class: 'ndc-axistext', x: HERO.l, y: HERO.h - 8 });
      nowT.textContent = cfg.nowLabel || 'now';
      axis.appendChild(nowT);
      svg.appendChild(axis);

      /* tooltip */
      var tip = svgEl('g', { class: 'ndc-tip', opacity: '0' });
      var tipBg = svgEl('rect', { rx: 8, ry: 8, width: 150, height: 46, x: 0, y: 0 });
      var tipG = svgEl('text', { class: 'ndc-tiptext', x: 10, y: 18 });
      var tipH = svgEl('text', { class: 'ndc-tiptext ndc-tiptext-h', x: 10, y: 34 });
      tip.appendChild(tipBg); tip.appendChild(tipG); tip.appendChild(tipH);
      svg.appendChild(tip);

      /* interaction plane */
      var hit = svgEl('rect', {
        class: 'ndc-hit', x: HERO.l, y: HERO.t, width: heroGeometry().pw, height: heroGeometry().ph, fill: 'transparent'
      });
      svg.appendChild(hit);
      box.appendChild(svg);

      api.svg = svg;
      api.refs = {
        areaG: areaG, areaH: areaH, lineG: lineG, lineH: lineH,
        dotG: dotG, dotH: dotH, haloG: haloG, cross: cross,
        tip: tip, tipBg: tipBg, tipG: tipG, tipH: tipH, hit: hit
      };
      api.mounted = true;

      /* crosshair + tooltip on pointer move */
      hit.addEventListener('pointermove', function (ev) {
        var rect = svg.getBoundingClientRect();
        var mx = ((ev.clientX - rect.left) / rect.width) * HERO.w;
        var g = api.last || { glucose: [], hr: [] };
        var len = Math.min(g.glucose.length, g.hr.length, n);
        if (len < 2) return;
        var idx = Math.round(clamp((mx - HERO.l) / heroGeometry().pw, 0, 1) * (len - 1));
        var x = heroX(idx, len);
        var gv = g.glucose[g.glucose.length - len + idx];
        var hv = g.hr[g.hr.length - len + idx];
        api.refs.cross.setAttribute('x1', x);
        api.refs.cross.setAttribute('x2', x);
        api.refs.cross.setAttribute('opacity', '.55');
        var tipX = clamp(x - 75, HERO.l, HERO.w - HERO.r - 150);
        api.refs.tip.setAttribute('transform', 'translate(' + tipX + ',' + (HERO.t + 4) + ')');
        api.refs.tip.setAttribute('opacity', '1');
        api.refs.tipG.textContent = (cfg.glucoseLabel || 'Glucose') + '  ' + (gv != null ? gv.toFixed(1) : '—');
        api.refs.tipH.textContent = (cfg.hrLabel || 'HR') + '  ' + (hv != null ? Math.round(hv) : '—');
      });
      hit.addEventListener('pointerleave', function () {
        api.refs.cross.setAttribute('opacity', '0');
        api.refs.tip.setAttribute('opacity', '0');
      });
    }

    function buildPath(values, yFn, min, max, len, x0, x1) {
      var pts = [];
      for (var i = 0; i < len; i++) {
        var v = values[values.length - len + i];
        pts.push(xFn(i, len).toFixed(1) + ',' + yFn(v, min, max).toFixed(1));
      }
      return pts;
    }
    function xFn(i, len) { return heroX(i, len); }

    function areaFrom(pts, len) {
      if (!pts.length) return '';
      var base = HERO.h - HERO.b;
      return 'M' + xFn(0, len) + ',' + base + ' L' + pts.join(' L') + ' L' + xFn(len - 1, len) + ',' + base + ' Z';
    }

    function update(series) {
      if (!api.mounted) rebuildStatic();
      var glucose = series.glucose || [];
      var hr = series.hr || [];
      var useGlucose = glucose.length >= 2;
      var useHr = hr.length >= 2;
      var lenG = useGlucose ? Math.min(n, glucose.length) : 0;
      var lenH = useHr ? Math.min(n, hr.length) : 0;
      var len = Math.max(lenG, lenH);
      api.last = series;
      if (len < 2) {
        api.refs.lineG.setAttribute('points', '');
        api.refs.lineH.setAttribute('points', '');
        api.refs.areaG.setAttribute('d', '');
        api.refs.areaH.setAttribute('d', '');
        api.refs.dotG.setAttribute('opacity', '0');
        api.refs.dotH.setAttribute('opacity', '0');
        api.refs.haloG.setAttribute('opacity', '0');
        return false;
      }
      /* Glucose absent → the HR stream drives the panel alone (never an
         empty frame while only the watch is paired). */
      if (!useGlucose) {
        var hpOnly = [];
        for (var k = 0; k < lenH; k++) {
          var hvOnly = hr[hr.length - lenH + k];
          hpOnly.push(xFn(k, lenH).toFixed(1) + ',' + heroYHr(hvOnly, minH, maxH).toFixed(1));
        }
        api.refs.lineG.setAttribute('points', '');
        api.refs.areaG.setAttribute('d', '');
        api.refs.dotG.setAttribute('opacity', '0');
        api.refs.haloG.setAttribute('opacity', '0');
        api.refs.lineH.setAttribute('points', hpOnly.join(' '));
        api.refs.areaH.setAttribute('d', areaFrom(hpOnly, lenH));
        var hxOnly = xFn(lenH - 1, lenH), hyOnly = heroYHr(hr[hr.length - 1], minH, maxH);
        api.refs.dotH.setAttribute('cx', hxOnly); api.refs.dotH.setAttribute('cy', hyOnly);
        api.refs.dotH.setAttribute('opacity', '1');
        return true;
      }
      var gp = [], hp = [];
      for (var i = 0; i < lenG; i++) {
        var gv = glucose[glucose.length - lenG + i];
        gp.push(xFn(i, lenG).toFixed(1) + ',' + heroYGlucose(gv, minG, maxG).toFixed(1));
      }
      for (var j = 0; j < lenH; j++) {
        var hv = hr[hr.length - lenH + j];
        hp.push(xFn(j, lenH).toFixed(1) + ',' + heroYHr(hv, minH, maxH).toFixed(1));
      }
      api.refs.lineG.setAttribute('points', gp.join(' '));
      api.refs.lineH.setAttribute('points', hp.join(' '));
      api.refs.areaG.setAttribute('d', areaFrom(gp, lenG));
      api.refs.areaH.setAttribute('d', areaFrom(hp, lenH));
      var lastG = glucose[glucose.length - 1];
      var gx = xFn(lenG - 1, lenG), gy = heroYGlucose(lastG, minG, maxG);
      api.refs.dotG.setAttribute('cx', gx); api.refs.dotG.setAttribute('cy', gy);
      api.refs.dotG.setAttribute('opacity', '1');
      api.refs.haloG.setAttribute('cx', gx); api.refs.haloG.setAttribute('cy', gy);
      api.refs.haloG.setAttribute('opacity', '1');
      if (lenH >= 2) {
        var hx = xFn(lenH - 1, lenH), hy = heroYHr(hr[hr.length - 1], minH, maxH);
        api.refs.dotH.setAttribute('cx', hx); api.refs.dotH.setAttribute('cy', hy);
        api.refs.dotH.setAttribute('opacity', '1');
      } else {
        api.refs.dotH.setAttribute('opacity', '0');
      }
      return true;
    }

    rebuildStatic();
    return api;
  }

  /* ====================================================================== *
   * MINI TREND — small sparkline with gradient fill + pulsing head dot.
   * ====================================================================== */
  function miniTrend(el, values, opts) {
    if (!el) return;
    opts = opts || {};
    var W = 120, H = 42, pad = 4;
    var color = opts.color || '#12b76a';
    var nMax = opts.n || 24;
    var data = (values || []).slice(-nMax);
    var min = opts.min, max = opts.max;
    if (min == null || max == null) {
      var lo = Infinity, hi = -Infinity;
      data.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
      if (!data.length) { lo = 0; hi = 1; }
      var span = (hi - lo) || 1;
      min = min != null ? min : lo - span * 0.15;
      max = max != null ? max : hi + span * 0.15;
    }
    var gradId = el.dataset.ndcGrad || (el.dataset.ndcGrad = uid('mini'));
    var lineId = el.dataset.ndcLine || (el.dataset.ndcLine = uid('minil'));

    if (!el._ndc) {
      var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', class: 'ndc-mini', 'aria-hidden': 'true' });
      var defs = svgEl('defs');
      var grad = svgEl('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '0', y2: '1' });
      grad.appendChild(svgEl('stop', { offset: '0', 'stop-color': color, 'stop-opacity': '.35' }));
      grad.appendChild(svgEl('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }));
      defs.appendChild(grad);
      svg.appendChild(defs);
      var area = svgEl('path', { fill: 'url(#' + gradId + ')' });
      var line = svgEl('polyline', { fill: 'none', stroke: color, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      var halo = svgEl('circle', { r: 5.5, fill: color, opacity: '.22' });
      var dot = svgEl('circle', { r: 2.8, fill: color });
      svg.appendChild(area); svg.appendChild(line); svg.appendChild(halo); svg.appendChild(dot);
      el.appendChild(svg);
      el._ndc = { svg: svg, area: area, line: line, dot: dot, halo: halo };
    }
    var r = el._ndc;
    if (data.length < 2) {
      r.line.setAttribute('points', '');
      r.area.setAttribute('d', '');
      r.dot.setAttribute('opacity', '0');
      r.halo.setAttribute('opacity', '0');
      return;
    }
    var pts = [];
    for (var i = 0; i < data.length; i++) {
      var x = pad + (i / (data.length - 1)) * (W - pad * 2);
      var y = H - pad - clamp((data[i] - min) / (max - min), 0, 1) * (H - pad * 2);
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    r.line.setAttribute('points', pts.join(' '));
    r.area.setAttribute('d', 'M' + pts[0].split(',')[0] + ',' + (H - pad) + ' L' + pts.join(' L') + ' L' + pts[pts.length - 1].split(',')[0] + ',' + (H - pad) + ' Z');
    var last = pts[pts.length - 1].split(',');
    r.dot.setAttribute('cx', last[0]); r.dot.setAttribute('cy', last[1]);
    r.dot.setAttribute('opacity', '1');
    r.halo.setAttribute('cx', last[0]); r.halo.setAttribute('cy', last[1]);
    r.halo.setAttribute('opacity', '1');
    if (!prefersReducedMotion()) {
      r.halo.style.animation = 'none';
      /* force reflow to restart pulse */
      void r.halo.getBoundingClientRect();
      r.halo.style.animation = 'ndc-halopulse 1.6s ease-out';
    }
  }

  /* ====================================================================== *
   * RING — circular progress (activity-ring style).
   * ====================================================================== */
  function ring(el, pct, opts) {
    if (!el) return;
    opts = opts || {};
    var size = opts.size || 74;
    var stroke = opts.stroke || 7;
    var radius = (size - stroke) / 2;
    var c = 2 * Math.PI * radius;
    pct = clamp(pct, 0, 1);
    var color = opts.color || '#c9ee59';

    if (!el._ndc) {
      var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'ndc-ring', 'aria-hidden': 'true' });
      var track = svgEl('circle', {
        cx: size / 2, cy: size / 2, r: radius,
        fill: 'none', stroke: 'rgba(255,255,255,.1)', 'stroke-width': stroke
      });
      var bar = svgEl('circle', {
        cx: size / 2, cy: size / 2, r: radius,
        fill: 'none', stroke: color, 'stroke-width': stroke,
        'stroke-linecap': 'round',
        'stroke-dasharray': c.toFixed(2),
        'stroke-dashoffset': c.toFixed(2),
        transform: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')'
      });
      bar.style.transition = 'stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)';
      svg.appendChild(track); svg.appendChild(bar);
      el.appendChild(svg);
      el._ndc = { bar: bar, c: c };
    }
    el._ndc.bar.setAttribute('stroke', color);
    el._ndc.bar.setAttribute('stroke-dashoffset', (c * (1 - pct)).toFixed(2));
  }

  /* ====================================================================== *
   * THROUGHPUT — vertical bar strip: readings accepted per tick.
   * ====================================================================== */
  function throughput(el, buckets, opts) {
    if (!el) return;
    opts = opts || {};
    var n = opts.n || 26;
    var color = opts.color || '#12b76a';
    var data = (buckets || []).slice(-n);
    var maxV = Math.max(1, Math.max.apply(null, data.length ? data : [1]));

    if (!el._ndc) {
      var svg = svgEl('svg', { viewBox: '0 0 ' + (n * 6) + ' 40', preserveAspectRatio: 'none', class: 'ndc-bars', 'aria-hidden': 'true' });
      el.appendChild(svg);
      el._ndc = { svg: svg, n: n, color: color };
    }
    var svg = el._ndc.svg;
    /* rebuild cheap: reuse child nodes when count matches */
    while (svg.childNodes.length > data.length) svg.removeChild(svg.lastChild);
    for (var i = 0; i < data.length; i++) {
      var h = Math.max(2, (data[i] / maxV) * 34);
      var bar = svg.childNodes[i];
      if (!bar) {
        bar = svgEl('rect', { rx: 2, width: 4, x: i * 6 + 1 });
        svg.appendChild(bar);
      }
      bar.setAttribute('height', h.toFixed(1));
      bar.setAttribute('y', (38 - h).toFixed(1));
      bar.setAttribute('fill', i === data.length - 1 ? color : (data[i] ? color + 'bb' : '#ffffff14'));
      bar.setAttribute('opacity', i === data.length - 1 ? '1' : '.85');
    }
  }

  /* ====================================================================== *
   * AMBIENT — aurora particle field on a canvas (behind the UI).
   * ====================================================================== */
  function ambient(canvas, opts) {
    if (!canvas || prefersReducedMotion()) return { stop: function () {} };
    opts = opts || {};
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return { stop: function () {} };
    var running = true, raf = 0, w = 0, h = 0;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var hues = opts.hues || [145, 90, 160];
    var blobs = [];
    var count = opts.count || 5;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(initial) {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: 60 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.12,
        hue: hues[Math.floor(Math.random() * hues.length)],
        a: 0.05 + Math.random() * 0.07,
        ph: Math.random() * Math.PI * 2,
        born: initial ? 0 : Date.now()
      };
    }
    for (var i = 0; i < count; i++) blobs.push(spawn(true));

    resize();
    var ro = null;
    try {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } catch (e) { global.addEventListener('resize', resize); }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      var t = Date.now() / 1000;
      blobs.forEach(function (b, i) {
        b.x += b.vx + Math.sin(t * 0.35 + b.ph) * 0.12;
        b.y += b.vy + Math.cos(t * 0.28 + b.ph) * 0.09;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        var alpha = b.a * (0.75 + 0.25 * Math.sin(t * 0.6 + b.ph));
        g.addColorStop(0, 'hsla(' + b.hue + ',72%,58%,' + alpha + ')');
        g.addColorStop(1, 'hsla(' + b.hue + ',72%,58%,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        if (i === 0 && Math.random() < 0.008) {
          /* occasionally re-seed a blob for slow morphing */
          blobs[i] = spawn(false);
        }
      });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
        if (ro && ro.disconnect) ro.disconnect();
      }
    };
  }

  /* ====================================================================== *
   * ANIMATE NUMBER — smooth KPI counter.
   * ====================================================================== */
  var numberAnims = new WeakMap();
  function animateNumber(el, to, opts) {
    if (!el) return;
    opts = opts || {};
    var dur = opts.duration != null ? opts.duration : 550;
    var format = opts.format || function (v) { return String(Math.round(v)); };
    var from = numberAnims.get(el);
    if (from == null) from = to;
    if (prefersReducedMotion() || from === to) {
      el.textContent = format(to);
      numberAnims.set(el, to);
      return;
    }
    var start = performance.now();
    function step(now) {
      var t = clamp((now - start) / dur, 0, 1);
      var v = lerp(from, to, easeOutCubic(t));
      el.textContent = format(v);
      if (t < 1 && numberAnims.get(el) === undefined || t < 1) {
        if (t < 1) requestAnimationFrame(step);
        else numberAnims.set(el, to);
      } else {
        numberAnims.set(el, to);
      }
    }
    numberAnims.set(el, to);
    requestAnimationFrame(step);
  }

  /* ====================================================================== *
   * WELLNESS SCORE — composite 0..100 from the latest vitals.
   * ====================================================================== */
  function wellnessScore(v) {
    if (!v) return null;
    var parts = [];
    if (v.glucose != null) {
      /* 3.9–7.8 ideal, penalise distance */
      var g = v.glucose;
      var gScore = g >= 3.9 && g <= 7.8 ? 100
        : g < 3.9 ? clamp(100 - (3.9 - g) * 45, 0, 100)
          : clamp(100 - (g - 7.8) * 22, 0, 100);
      parts.push({ w: 0.24, s: gScore });
    }
    if (v.hr != null) {
      var hr = v.hr;
      var hScore = hr >= 55 && hr <= 90 ? 100
        : hr < 55 ? clamp(100 - (55 - hr) * 4, 0, 100)
          : clamp(100 - (hr - 90) * 2.4, 0, 100);
      parts.push({ w: 0.2, s: hScore });
    }
    if (v.bp && v.bp.sys != null) {
      var sys = v.bp.sys, dia = v.bp.dia;
      var bScore = sys < 130 && dia < 85 ? 100
        : clamp(100 - Math.max(0, sys - 130) * 2.2 - Math.max(0, dia - 85) * 3, 0, 100);
      parts.push({ w: 0.2, s: bScore });
    }
    if (v.steps != null) {
      parts.push({ w: 0.18, s: clamp((v.steps / 8000) * 100, 0, 100) });
    }
    if (v.sleep != null) {
      var sl = v.sleep;
      var sScore = sl >= 7 && sl <= 8.5 ? 100 : clamp(100 - Math.abs(sl - 7.6) * 28, 0, 100);
      parts.push({ w: 0.18, s: sScore });
    }
    if (!parts.length) return null;
    var tw = parts.reduce(function (a, p) { return a + p.w; }, 0);
    var sum = parts.reduce(function (a, p) { return a + p.s * p.w; }, 0);
    return Math.round(sum / tw);
  }

  global.NUTRI_DEVICES_CHARTS = {
    heroChart: heroChart,
    miniTrend: miniTrend,
    ring: ring,
    throughput: throughput,
    ambient: ambient,
    animateNumber: animateNumber,
    wellnessScore: wellnessScore,
    prefersReducedMotion: prefersReducedMotion
  };
})(window);
