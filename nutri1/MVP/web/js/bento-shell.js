/* ==========================================================================
   NUTRI.N°1 — Dark Bento shell controller  (SESSION 0)
   --------------------------------------------------------------------------
   1. Simulation click guard   filters, <select>, <input>, tabs and language
                               toggles can never open a simulation popup
   2. window.NutriBentoCharts  offline inline-SVG charts (spline, bars, ring,
                               sparkline, progress) + a small `Chart` adapter so
                               legacy `new Chart(...)` calls render without CDN
   3. Navigation               go() wrapper, 84px icon rail, role-aware
                               18-module drawer, < 980px bottom dock + sheet
   4. Header                   greeting, live module search, Premium CTA
   5. Safety nets              missing legacy hooks (chooseRole, selectedRole,
                               updateReferences), duplicate "Indicator" chart
                               blocker, accessible names on unlabeled fields
   Loaded in <head>, before the legacy inline scripts of index.html.
   ========================================================================== */
(function (global) {
  'use strict';

  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  function t(key, params) { return I18N ? I18N.t(key, params) : key; }
  function $(id) { return doc.getElementById(id); }
  function store(key, value) {
    try {
      if (value === undefined) return global.localStorage.getItem(key);
      if (value === null) global.localStorage.removeItem(key);
      else global.localStorage.setItem(key, value);
    } catch (e) { /* storage unavailable */ }
    return null;
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ====================================================================== */
  /* 1. SIMULATION CLICK GUARD                                              */
  /* ====================================================================== */
  /* Elements that must never start a simulation, whatever layer listens. */
  var PROTECTED = [
    'select', 'option', 'optgroup', 'input', 'textarea', 'label', 'summary', 'a[href]',
    '[contenteditable]', '[role="tab"]', '[role="tablist"]', '[role="switch"]', '[role="option"]',
    '[role="combobox"]', '[role="radio"]', '[role="checkbox"]',
    '.tab', '.tabs', '.institution-filters', '.healthy-store-tabs', '.store-tab',
    '.filter-pill', '.filter', '[data-filter]', '.v38-controls', '.v46-gov-toolbar',
    '.v47-research-filter', '[data-czd-act]', '[data-czd-lang]', '[data-bento-lang]',
    '.bento-lang', '.bento-header', '.bento-rail', '.bento-dock', '.bento-drawer', '[data-no-sim]'
  ].join(',');
  var SIM_OVERLAYS = '.v56-overlay,.v57-overlay';
  var SIM_SCRIPT = /^v5\d/;
  var guard = { blockUntil: 0, blocked: 0 };

  function isProtected(target) {
    return !!(target && target.closest && target.closest(PROTECTED));
  }
  function hasOwnAction(target) {
    var el = target && target.closest ? target.closest('button,[onclick],[role="button"]') : null;
    return !!(el && (el.getAttribute('onclick') || typeof el.onclick === 'function'));
  }

  /* (a) Document-level listeners registered by the v5x simulation scripts are
         wrapped: they are skipped for protected targets, and "change" events
         (a <select> or <input> being edited) never reach them. */
  var nativeAdd = doc.addEventListener;
  doc.addEventListener = function (type, listener, options) {
    var script = doc.currentScript;
    if ((type === 'click' || type === 'change') && typeof listener === 'function' &&
        script && SIM_SCRIPT.test(script.id || '')) {
      var wrapped = function (e) {
        if (type === 'change' || isProtected(e.target)) { guard.blocked++; return undefined; }
        return listener.call(this, e);
      };
      return nativeAdd.call(doc, type, wrapped, options);
    }
    return nativeAdd.call(doc, type, listener, options);
  };

  /* (b) Catch-all for listeners wired straight on cards/rows: anything a
         protected interaction managed to open is rolled back immediately. */
  var before = null;
  function snapshot(e) {
    if (!isProtected(e.target)) { before = null; return; }
    guard.blockUntil = Date.now() + 450;
    before = Array.prototype.slice.call(doc.querySelectorAll(SIM_OVERLAYS));
    before.live = !!(doc.querySelector('.v51-live.show'));
  }
  function rollback() {
    if (!before) return;
    var now = doc.querySelectorAll(SIM_OVERLAYS);
    for (var i = 0; i < now.length; i++) {
      if (before.indexOf(now[i]) === -1) { now[i].remove(); guard.blocked++; }
    }
    var live = doc.querySelector('.v51-live.show');
    if (live && !before.live) { live.classList.remove('show'); guard.blocked++; }
    before = null;
  }
  global.addEventListener('click', snapshot, true);
  global.addEventListener('change', snapshot, true);
  global.addEventListener('click', rollback, false);
  global.addEventListener('change', rollback, false);

  /* (c) One interaction → one response: the corner "live" panel stays quiet
         when a workspace modal answered the same click. */
  function guardLivePanel() {
    var run = global.runV51Simulation;
    if (typeof run !== 'function' || run.__bento) return;
    var wrapped = function () {
      if (Date.now() < guard.blockUntil || doc.querySelector(SIM_OVERLAYS)) { guard.blocked++; return undefined; }
      return run.apply(this, arguments);
    };
    wrapped.__bento = true;
    global.runV51Simulation = wrapped;
  }

  /* ====================================================================== */
  /* 2. NutriBentoCharts — offline inline SVG                               */
  /* ====================================================================== */
  var PALETTE = ['#D2F85A', '#4E65EC', '#F59B42', '#8F88E8'];
  var uid = 0;

  function nums(list) {
    return (list || []).map(function (v) { v = Number(v); return isFinite(v) ? v : 0; });
  }
  function fmt(value) {
    var lang = I18N ? I18N.lang : 'en';
    var abs = Math.abs(value);
    var digits = abs >= 100 || value % 1 === 0 ? 0 : (abs >= 10 ? 1 : 2);
    try { return Number(value).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: digits }); }
    catch (e) { return String(Math.round(value * 100) / 100); }
  }
  function label(text) { return I18N ? I18N.translate(String(text == null ? '' : text)) : String(text); }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  /* Smooth cubic-bezier path through points (monotone, no overshoot). */
  function splinePath(points) {
    if (!points.length) return '';
    if (points.length === 1) return 'M' + points[0][0] + ',' + points[0][1];
    var d = 'M' + points[0][0].toFixed(1) + ',' + points[0][1].toFixed(1);
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[i], p1 = points[i + 1];
      var mx = (p0[0] + p1[0]) / 2;
      d += ' C' + mx.toFixed(1) + ',' + p0[1].toFixed(1) + ' ' + mx.toFixed(1) + ',' + p1[1].toFixed(1) +
           ' ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1);
    }
    return d;
  }
  function frame(o) {
    var w = Math.max(220, Math.round(o.width || 640)), h = Math.max(90, Math.round(o.height || 240));
    var pad = o.bare ? { l: 4, r: 4, t: 6, b: 4 } : { l: 44, r: 16, t: o.peak ? 34 : 16, b: 30 };
    return { w: w, h: h, pad: pad, iw: w - pad.l - pad.r, ih: h - pad.t - pad.b };
  }
  function gridLines(f, max, min) {
    var out = '', steps = 4;
    for (var i = 0; i <= steps; i++) {
      var y = f.pad.t + f.ih * (1 - i / steps);
      out += '<line x1="' + f.pad.l + '" x2="' + (f.w - f.pad.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) +
             '" stroke="rgba(255,255,255,.07)" stroke-width="1"/>' +
             '<text x="' + (f.pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="nbc-axis">' +
             esc(fmt(min + (max - min) * i / steps)) + '</text>';
    }
    return out;
  }
  function xLabels(f, labels, xAt) {
    var out = '', n = labels.length, every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(f.iw / 64))));
    for (var i = 0; i < n; i++) {
      if (i % every && i !== n - 1) continue;
      out += '<text x="' + xAt(i).toFixed(1) + '" y="' + (f.h - 8) + '" text-anchor="middle" class="nbc-axis">' +
             esc(label(labels[i])) + '</text>';
    }
    return out;
  }
  function open(f, o, cls) {
    return '<svg class="nbc ' + cls + '" viewBox="0 0 ' + f.w + ' ' + f.h + '" width="100%" height="' + f.h +
      '" role="img" aria-label="' + esc(o.ariaLabel || o.title || '') + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">';
  }
  function emptySvg(o) {
    var f = frame(o);
    return open(f, o, 'nbc-empty') + '<text x="' + f.w / 2 + '" y="' + f.h / 2 + '" text-anchor="middle" class="nbc-axis">' +
      esc(t('chart.empty')) + '</text></svg>';
  }

  var Charts = {
    palette: PALETTE.slice(),
    splinePath: splinePath,

    /* spline({labels, series:[{name,data,color,fill}], width, height, peak, bare, min, max}) */
    spline: function (o) {
      o = o || {};
      var series = (o.series || []).map(function (s, i) {
        return { name: s.name || '', data: nums(s.data), color: s.color || PALETTE[i % PALETTE.length], fill: s.fill !== false && i === 0, dashed: !!s.dashed };
      }).filter(function (s) { return s.data.length; });
      if (!series.length) return emptySvg(o);
      var f = frame(o), id = 'nbc' + (++uid);
      var all = [].concat.apply([], series.map(function (s) { return s.data; }));
      var max = o.max != null ? o.max : niceMax(Math.max.apply(null, all));
      var min = o.min != null ? o.min : (Math.min.apply(null, all) < 0 ? -niceMax(-Math.min.apply(null, all)) : 0);
      if (o.bare) { min = Math.min.apply(null, all); max = Math.max.apply(null, all); if (max === min) max = min + 1; var m = (max - min) * 0.12; min -= m; max += m; }
      var n = Math.max.apply(null, series.map(function (s) { return s.data.length; }));
      var xAt = function (i) { return f.pad.l + (n === 1 ? f.iw / 2 : f.iw * i / (n - 1)); };
      var yAt = function (v) { return f.pad.t + f.ih * (1 - (v - min) / (max - min || 1)); };
      var svg = open(f, o, 'nbc-spline') + '<defs>';
      series.forEach(function (s, i) {
        svg += '<linearGradient id="' + id + 'g' + i + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.color +
               '" stop-opacity=".32"/><stop offset="1" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient>';
      });
      svg += '</defs>';
      if (!o.bare) svg += gridLines(f, max, min) + xLabels(f, o.labels || [], xAt);
      series.forEach(function (s, i) {
        var pts = s.data.map(function (v, k) { return [xAt(k), yAt(v)]; });
        var d = splinePath(pts);
        if (s.fill && pts.length > 1) {
          svg += '<path d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (f.pad.t + f.ih) + ' L' + pts[0][0].toFixed(1) + ',' +
                 (f.pad.t + f.ih) + ' Z" fill="url(#' + id + 'g' + i + ')"/>';
        }
        svg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (o.bare ? 2 : 3) +
               '" stroke-linecap="round" stroke-linejoin="round"' + (s.dashed ? ' stroke-dasharray="6 6"' : '') + '/>';
        if (!o.bare) {
          pts.forEach(function (p, k) {
            svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="9" fill="transparent"><title>' +
                   esc((s.name ? label(s.name) + ' — ' : '') + label((o.labels || [])[k] || '') + ': ' + fmt(s.data[k])) + '</title></circle>';
          });
        }
        if (o.peak && i === 0) {
          var top = 0;
          s.data.forEach(function (v, k) { if (v > s.data[top]) top = k; });
          var px = pts[top][0], py = pts[top][1], text = fmt(s.data[top]), bw = Math.max(40, text.length * 8 + 18);
          var bx = Math.min(Math.max(px - bw / 2, 2), f.w - bw - 2);
          svg += '<line x1="' + px.toFixed(1) + '" x2="' + px.toFixed(1) + '" y1="' + py.toFixed(1) + '" y2="' + (f.pad.t + f.ih) +
                 '" stroke="' + s.color + '" stroke-width="1.5" stroke-dasharray="4 5" opacity=".7"/>' +
                 '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5" fill="#2B2C31" stroke="' + s.color + '" stroke-width="3"/>' +
                 '<rect x="' + bx.toFixed(1) + '" y="' + Math.max(2, py - 32).toFixed(1) + '" width="' + bw + '" height="22" rx="11" fill="' + s.color + '"/>' +
                 '<text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (Math.max(2, py - 32) + 15.5).toFixed(1) +
                 '" text-anchor="middle" class="nbc-badge">' + esc(text) + '</text>';
        }
      });
      return svg + '</svg>';
    },

    /* bars({labels, series:[{name,data,color}], width, height}) */
    bars: function (o) {
      o = o || {};
      var series = (o.series || []).map(function (s, i) {
        return { name: s.name || '', data: nums(s.data), color: s.color || PALETTE[i % PALETTE.length] };
      }).filter(function (s) { return s.data.length; });
      if (!series.length) return emptySvg(o);
      var f = frame(o);
      var all = [].concat.apply([], series.map(function (s) { return s.data; }));
      var max = o.max != null ? o.max : niceMax(Math.max.apply(null, all.concat([0])));
      var n = Math.max.apply(null, series.map(function (s) { return s.data.length; }));
      var band = f.iw / n, group = Math.min(band * 0.62, 56 * series.length), bw = group / series.length;
      var xAt = function (i) { return f.pad.l + band * (i + 0.5); };
      var svg = open(f, o, 'nbc-bars') + gridLines(f, max, 0) + xLabels(f, o.labels || [], xAt);
      series.forEach(function (s, si) {
        s.data.forEach(function (v, k) {
          var h = Math.max(0, f.ih * (v / (max || 1)));
          var x = xAt(k) - group / 2 + si * bw + 1;
          var r = Math.min(8, (bw - 2) / 2, h / 2);
          svg += '<rect x="' + x.toFixed(1) + '" y="' + (f.pad.t + f.ih - h).toFixed(1) + '" width="' + Math.max(2, bw - 2).toFixed(1) +
                 '" height="' + h.toFixed(1) + '" rx="' + r.toFixed(1) + '" fill="' + s.color + '"><title>' +
                 esc((s.name ? label(s.name) + ' — ' : '') + label((o.labels || [])[k] || '') + ': ' + fmt(v)) + '</title></rect>';
        });
      });
      return svg + '</svg>';
    },

    /* ring({value, max, size, stroke, color, label, sub}) — circular gauge */
    ring: function (o) {
      o = o || {};
      var size = o.size || 105, stroke = o.stroke || 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
      var ratio = Math.max(0, Math.min(1, (Number(o.value) || 0) / (Number(o.max) || 100)));
      var color = o.color || PALETTE[0];
      return '<svg class="nbc nbc-ring" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size +
        '" role="img" aria-label="' + esc(o.ariaLabel || (o.label != null ? o.label : Math.round(ratio * 100) + '%')) + '" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#1E1F23" stroke-width="' + stroke + '"/>' +
        '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke +
        '" stroke-linecap="round" stroke-dasharray="' + (c * ratio).toFixed(2) + ' ' + c.toFixed(2) +
        '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
        '<text x="50%" y="' + (o.sub ? '48%' : '50%') + '" text-anchor="middle" dominant-baseline="central" class="nbc-ring-value">' +
        esc(o.label != null ? o.label : Math.round(ratio * 100) + '%') + '</text>' +
        (o.sub ? '<text x="50%" y="66%" text-anchor="middle" class="nbc-axis">' + esc(o.sub) + '</text>' : '') + '</svg>';
    },

    /* sparkline(data, {color, width, height}) — bare mini spline for KPI cards */
    sparkline: function (data, o) {
      o = o || {};
      return Charts.spline({ series: [{ data: data, color: o.color || PALETTE[0] }], width: o.width || 120, height: o.height || 40, bare: true, ariaLabel: o.ariaLabel || '' });
    },

    /* progress({value, max, color}) — pill progress bar */
    progress: function (o) {
      o = o || {};
      var ratio = Math.max(0, Math.min(1, (Number(o.value) || 0) / (Number(o.max) || 100)));
      return '<svg class="nbc nbc-progress" viewBox="0 0 200 12" width="100%" height="12" preserveAspectRatio="none" role="img" aria-label="' +
        esc(o.ariaLabel || Math.round(ratio * 100) + '%') + '" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="12" rx="6" fill="#1E1F23"/>' +
        '<rect width="' + (200 * ratio).toFixed(1) + '" height="12" rx="6" fill="' + (o.color || PALETTE[0]) + '"/></svg>';
    },

    legend: function (series) {
      return '<div class="nbc-legend">' + (series || []).map(function (s, i) {
        return '<span><i style="background:' + (s.color || PALETTE[i % PALETTE.length]) + '"></i>' + esc(label(s.name || s.label || '')) + '</span>';
      }).join('') + '</div>';
    },

    /* render(target, 'spline'|'bars'|'ring'|'progress', options) */
    render: function (target, type, o) {
      var el = typeof target === 'string' ? doc.querySelector(target) : target;
      if (!el) return null;
      o = o || {};
      if (!o.width && el.clientWidth) o.width = el.clientWidth;
      var fn = Charts[type] || Charts.spline;
      el.innerHTML = fn(o) + (o.legend && o.series ? Charts.legend(o.series) : '');
      return el;
    }
  };
  global.NutriBentoCharts = Charts;

  /* ---- `Chart` adapter: legacy `new Chart(ctx, cfg)` → inline SVG -------- */
  var instances = [];
  function BentoChart(ctx, config) {
    var canvas = ctx && ctx.canvas ? ctx.canvas : ctx;
    if (typeof canvas === 'string') canvas = $(canvas);
    this.canvas = canvas;
    this.ctx = ctx;
    this.config = config || {};
    this.data = this.config.data || { labels: [], datasets: [] };
    this.options = this.config.options || {};
    var old = BentoChart.getChart(canvas);
    if (old) old.destroy();
    if (canvas && canvas.parentNode) {
      this.host = doc.createElement('div');
      this.host.className = 'bento-chart';
      this.host.setAttribute('data-no-sim', '');
      canvas.parentNode.insertBefore(this.host, canvas.nextSibling);
      canvas.hidden = true;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.__bentoChart = this;
    }
    instances.push(this);
    this.update();
  }
  BentoChart.prototype.update = function () {
    if (!this.host || !this.host.isConnected) return;
    var data = this.data || {}, type = this.config.type || 'line';
    var series = (data.datasets || []).map(function (d, i) {
      var color = typeof d.borderColor === 'string' ? d.borderColor : (typeof d.backgroundColor === 'string' ? d.backgroundColor : null);
      if (color && !/^#(?:D2F85A|4E65EC|F59B42|8F88E8)$/i.test(color)) color = null; /* legacy palettes → Bento tokens */
      return { name: d.label || '', data: d.data || [], color: color || PALETTE[i % PALETTE.length], fill: !!d.fill };
    });
    var width = this.host.clientWidth || (this.host.parentNode && this.host.parentNode.clientWidth) || 560;
    var o = { labels: data.labels || [], series: series, width: width, height: 230, ariaLabel: series.map(function (s) { return label(s.name); }).join(', ') };
    this.host.innerHTML = (type === 'bar' ? Charts.bars(o) : Charts.spline(o)) + Charts.legend(series);
  };
  BentoChart.prototype.destroy = function () {
    if (this.host && this.host.parentNode) this.host.parentNode.removeChild(this.host);
    if (this.canvas) { this.canvas.__bentoChart = null; }
    var i = instances.indexOf(this);
    if (i !== -1) instances.splice(i, 1);
    this.host = null;
  };
  BentoChart.prototype.resize = BentoChart.prototype.update;
  BentoChart.getChart = function (canvas) { return canvas && canvas.__bentoChart ? canvas.__bentoChart : undefined; };
  BentoChart.register = function () {};
  BentoChart.defaults = { color: '#9A9CA3', font: {}, plugins: {} };
  BentoChart.isBentoAdapter = true;
  if (!global.Chart) global.Chart = BentoChart;

  function redrawCharts() {
    instances.slice().forEach(function (c) {
      if (c.host && !c.host.isConnected) { c.destroy(); return; }
      try { c.update(); } catch (e) { /* detached */ }
    });
  }
  var resizeTimer = null;
  global.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redrawCharts, 150);
  });

  /* ====================================================================== */
  /* 3. NAVIGATION                                                          */
  /* ====================================================================== */
  var ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    citizen: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/>',
    devices: '<rect x="7" y="7" width="10" height="10" rx="3"/><path d="M9 7l.7-4h4.6l.7 4"/><path d="M9 17l.7 4h4.6l.7-4"/><path d="M12 10v2.2l1.4 1"/>',
    scanner: '<path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.2"/>',
    ai: '<path d="M12 3l1.9 4.9 4.9 1.9-4.9 1.9L12 16.6l-1.9-4.9-4.9-1.9 4.9-1.9z"/><path d="M19 15.5v4"/><path d="M17 17.5h4"/><path d="M5 17v3"/><path d="M3.5 18.5h3"/>',
    network: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M18 14.8c1.8.8 3 2.6 3 5.2"/>',
    payments: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/><path d="M7 15h4"/>',
    marketplace: '<path d="M3 4h2.5l2.2 10.5h10.2L20 7H7"/><circle cx="9.5" cy="18.5" r="1.4"/><circle cx="16.5" cy="18.5" r="1.4"/>',
    foodcloud: '<path d="M7 18a4 4 0 0 1-.6-7.9A6 6 0 0 1 18 9.6 4.2 4.2 0 0 1 17.5 18z"/>',
    health: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    agri: '<path d="M12 21v-9"/><path d="M12 12c0-3.5-2.5-6-7-6 0 4 2.5 6 7 6z"/><path d="M12 15.5c0-3 2.2-5.5 7-5.5 0 3.5-2.2 5.5-7 5.5z"/>',
    unicef: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"/><path d="M9 10h.01"/><path d="M15 10h.01"/>',
    who: '<path d="M12 20S4 15 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 15 12 20 12 20z"/><path d="M7.5 12H10l1.2-2.2 1.8 4 1.2-1.8h2.3"/>',
    wfp: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 21h6"/><path d="M9 7c0-1.2 1-1.4 1-2.6"/><path d="M13 7c0-1.2 1-1.4 1-2.6"/>',
    fao: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.8 3 2.8 15 0 18"/><path d="M12 3c-2.8 3-2.8 15 0 18"/>',
    monitoring: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4h6v3H9z"/><path d="M9 13.5l2 2 4-4"/>',
    research: '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="8" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8.2 6.3l7.6 1.3"/><path d="M7 8l4 8"/><path d="M17 10l-4 6"/>',
    market: '<path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M13.5 5l-3 14"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    logout: '<path d="M10 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M15 8l4 4-4 4"/><path d="M19 12H10"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    spark: '<path d="M12 4l2.1 5.4L19.5 11.5l-5.4 2.1L12 19l-2.1-5.4L4.5 11.5l5.4-2.1z"/>',
    arrow: '<path d="M7 17L17 7"/><path d="M9 7h8v8"/>'
  };
  function icon(name) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.grid) + '</svg>';
  }

  /* The 18 views, in navigation order. */
  var VIEWS = [
    { id: 'home', group: 'care' }, { id: 'citizen', group: 'care' }, { id: 'devices', group: 'care' },
    { id: 'scanner', group: 'care' }, { id: 'ai', group: 'care' }, { id: 'network', group: 'care' },
    { id: 'payments', group: 'care' },
    { id: 'marketplace', group: 'food' }, { id: 'foodcloud', group: 'food' },
    { id: 'health', group: 'gov' }, { id: 'agri', group: 'gov' },
    { id: 'unicef', group: 'partners' }, { id: 'who', group: 'partners' }, { id: 'wfp', group: 'partners' },
    { id: 'fao', group: 'partners' }, { id: 'monitoring', group: 'partners' },
    { id: 'research', group: 'science' }, { id: 'market', group: 'science' }
  ];
  var GROUPS = ['care', 'food', 'gov', 'partners', 'science'];
  var ROLES = {
    citizen: ['home', 'citizen', 'scanner', 'ai', 'devices', 'network', 'marketplace', 'payments'],
    nutritionist: ['home', 'network', 'citizen', 'ai', 'scanner', 'foodcloud', 'payments'],
    ministry_health: ['home', 'health', 'who', 'unicef', 'monitoring', 'research'],
    ministry_agri: ['home', 'agri', 'fao', 'wfp', 'foodcloud', 'market'],
    institution: ['home', 'research', 'market', 'monitoring', 'unicef', 'who', 'wfp', 'fao'],
    admin: ['home', 'monitoring', 'market', 'payments', 'health', 'agri']
  };
  var shell = {
    view: 'home',
    role: ROLES[store('nutri_role')] ? store('nutri_role') : 'citizen',
    name: store('nutri_profile_name') || '',
    mounted: false
  };

  /* Legacy hooks that index.html calls but that were lost in an old merge. */
  global.selectedRole = shell.role;
  if (typeof global.updateReferences !== 'function') {
    /* Replaced by the citizen module once it loads; keeps legacy init() alive. */
    global.updateReferences = function () {
      if (global.NUTRI_CITIZEN && global.NUTRI_CITIZEN.render && $('czdRoot') && $('czdRoot').firstChild) global.NUTRI_CITIZEN.render();
    };
  }
  global.chooseRole = function (role, btn) {
    if (!ROLES[role]) return;
    var changed = role !== shell.role;
    shell.role = role;
    global.selectedRole = role;
    store('nutri_role', role);
    var cards = doc.querySelectorAll('.role-card');
    for (var i = 0; i < cards.length; i++) {
      var on = cards[i].getAttribute('data-role') === role;
      cards[i].classList.toggle('active', on);
      cards[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    var row = $('profileSpecialtyRow');
    if (row) row.style.display = role === 'nutritionist' ? '' : 'none';
    if (shell.mounted) {
      renderNav();
      if (changed && btn && typeof global.toast === 'function') global.toast(t('shell.toast.role', { role: t('role.' + role) }));
    }
  };

  function pinned() { return ROLES[shell.role] || ROLES.citizen; }
  function navButton(id, cls, withLabel) {
    var on = id === shell.view;
    return '<button type="button" class="' + cls + (on ? ' on' : '') + '" data-view="' + id + '" onclick="go(\'' + id + '\',this)"' +
      (on ? ' aria-current="page"' : '') + ' aria-label="' + esc(t('nav.' + id)) + '"' + (withLabel ? '' : ' data-tip="' + esc(t('nav.' + id)) + '"') + '>' +
      icon(id) + (withLabel ? withLabel(id) : '') + '</button>';
  }

  function renderNav() {
    var pins = pinned();
    /* Rail: recommended views for the role + "all modules" */
    var rail = $('bentoRailNav');
    if (rail) {
      rail.innerHTML = pins.slice(0, 7).map(function (id) { return navButton(id, 'bento-rail-btn'); }).join('') +
        '<span class="bento-rail-sep" aria-hidden="true"></span>' +
        '<button type="button" class="bento-rail-btn bento-rail-more" data-bento-drawer aria-haspopup="dialog" aria-expanded="false" aria-controls="bentoDrawer" aria-label="' +
        esc(t('shell.drawer.open')) + '" data-tip="' + esc(t('shell.drawer.title')) + '">' + icon('grid') + '</button>';
    }
    /* Mobile dock: 4 recommended views + "All" */
    var dock = $('bentoDock');
    if (dock) {
      dock.innerHTML = pins.slice(0, 4).map(function (id) {
        return navButton(id, 'bento-dock-btn', function (v) { return '<span>' + esc(shortLabel(v)) + '</span>'; });
      }).join('') +
        '<button type="button" class="bento-dock-btn bento-dock-all" data-bento-drawer aria-haspopup="dialog" aria-expanded="false" aria-controls="bentoDrawer" aria-label="' +
        esc(t('shell.drawer.open')) + '">' + icon('grid') + '<span>' + esc(t('shell.dock.all')) + '</span></button>';
    }
    /* Drawer / sheet: role-aware list of the 18 modules */
    var drawer = $('bentoDrawer');
    if (drawer) {
      var item = function (id, pinnedFlag) {
        return navButton(id, 'bento-drawer-item', function (v) {
          return '<span class="bento-drawer-text"><b>' + esc(t('nav.' + v)) + '</b><small>' + esc(t('nav.' + v + '.desc')) + '</small></span>' +
            (pinnedFlag ? '<em class="bento-pin">' + esc(t('shell.pinned')) + '</em>' : '');
        });
      };
      var html = '<header class="bento-drawer-head"><div><h2 id="bentoDrawerTitle">' + esc(t('shell.drawer.title')) + '</h2>' +
        '<p class="bento-drawer-role"><span>' + esc(t('shell.drawer.role')) + '</span><button type="button" class="bento-role-badge" data-bento-role title="' +
        esc(t('shell.drawer.changeRole')) + '">' + esc(t('role.' + shell.role)) + '</button></p></div>' +
        '<button type="button" class="bento-rail-btn" data-bento-drawer-close aria-label="' + esc(t('shell.drawer.close')) + '">' + icon('close') + '</button></header>' +
        '<div class="bento-drawer-body nav">' +
        '<h3>' + esc(t('shell.drawer.recommended')) + '</h3><div class="bento-drawer-list">' +
        pins.map(function (id) { return item(id, true); }).join('') + '</div>' +
        '<h3>' + esc(t('shell.drawer.all')) + '</h3>' +
        GROUPS.map(function (g) {
          return '<h4>' + esc(t('group.' + g)) + '</h4><div class="bento-drawer-list">' +
            VIEWS.filter(function (v) { return v.group === g; }).map(function (v) { return item(v.id, false); }).join('') + '</div>';
        }).join('') +
        '</div><footer class="bento-drawer-foot"><b>NUTRI.N°1</b> <span class="bento-version">' + esc(t('shell.version')) + '</span><small>' + esc(t('shell.tagline')) + '</small></footer>';
      drawer.innerHTML = html;
    }
    syncDrawerButtons();
  }
  function shortLabel(id) {
    var full = t('nav.' + id);
    var short = { home: { en: 'Home', fr: 'Accueil' }, citizen: { en: 'Citizen', fr: 'Citoyen' }, devices: { en: 'Devices', fr: 'Appareils' },
      scanner: { en: 'Scanner', fr: 'Scanner' }, ai: { en: 'AI', fr: 'IA' }, network: { en: 'Network', fr: 'Réseau' },
      payments: { en: 'Payments', fr: 'Paiements' }, marketplace: { en: 'Store', fr: 'Marché' }, foodcloud: { en: 'Food Cloud', fr: 'Cloud' },
      health: { en: 'Health', fr: 'Santé' }, agri: { en: 'Agriculture', fr: 'Agriculture' }, unicef: { en: 'UNICEF', fr: 'UNICEF' },
      who: { en: 'WHO', fr: 'OMS' }, wfp: { en: 'WFP', fr: 'PAM' }, fao: { en: 'FAO', fr: 'FAO' },
      monitoring: { en: 'M&E', fr: 'Suivi' }, research: { en: 'Research', fr: 'Recherche' }, market: { en: 'APIs', fr: 'API' } }[id];
    return short ? short[I18N && I18N.lang === 'fr' ? 'fr' : 'en'] : full;
  }

  /* ---- drawer / bottom sheet ------------------------------------------- */
  var lastFocus = null;
  function drawerOpen() { var d = $('bentoDrawer'); return !!(d && !d.hidden); }
  function syncDrawerButtons() {
    var open = drawerOpen(), list = doc.querySelectorAll('[data-bento-drawer]');
    for (var i = 0; i < list.length; i++) list[i].setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function openDrawer() {
    var d = $('bentoDrawer'), s = $('bentoScrim');
    if (!d || drawerOpen()) return;
    lastFocus = doc.activeElement;
    d.hidden = false; if (s) s.hidden = false;
    doc.documentElement.classList.add('bento-drawer-open');
    global.requestAnimationFrame(function () { d.classList.add('is-open'); if (s) s.classList.add('is-open'); });
    var first = d.querySelector('.bento-drawer-item.on') || d.querySelector('.bento-drawer-item');
    if (first) first.focus({ preventScroll: false });
    syncDrawerButtons();
  }
  function closeDrawer(restore) {
    var d = $('bentoDrawer'), s = $('bentoScrim');
    if (!d || !drawerOpen()) return;
    d.classList.remove('is-open'); if (s) s.classList.remove('is-open');
    d.hidden = true; if (s) s.hidden = true;
    doc.documentElement.classList.remove('bento-drawer-open');
    syncDrawerButtons();
    if (restore !== false && lastFocus && lastFocus.focus && lastFocus.isConnected) lastFocus.focus();
  }

  /* ---- go(): single navigation controller ------------------------------ */
  function markActive() {
    var list = doc.querySelectorAll('[data-view]');
    for (var i = 0; i < list.length; i++) {
      var on = list[i].getAttribute('data-view') === shell.view;
      list[i].classList.toggle('on', on);
      if (on) list[i].setAttribute('aria-current', 'page'); else list[i].removeAttribute('aria-current');
    }
    var title = $('title');
    if (title) title.textContent = t('nav.' + shell.view);
    doc.title = t('nav.' + shell.view) + ' — NUTRI.N°1 ' + t('shell.version');
  }
  function wrapGo() {
    var legacyGo = global.go;
    if (typeof legacyGo !== 'function' || legacyGo.__bento) return;
    var go = function (id, btn) {
      var target = $(id);
      if (!target || !target.classList.contains('view')) return;
      var changed = id !== shell.view;
      try { legacyGo(id, btn); } catch (e) { if (global.console) console.error(e); }
      shell.view = id;
      markActive();
      closeDrawer(false);
      closeSearch();
      if (changed) {
        try { global.history.replaceState(null, '', '#' + id); } catch (e) { /* file:// */ }
        global.scrollTo(0, 0);
        var main = $('bentoMain');
        if (main && shell.mounted) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
        setTimeout(function () { cleanIndicators(); labelFields(); redrawCharts(); if (I18N) I18N.apply(target); }, 60);
      }
    };
    go.__bento = true;
    global.go = go;
  }

  /* ====================================================================== */
  /* 4. HEADER                                                              */
  /* ====================================================================== */
  function displayName() { return shell.name || t('shell.guest'); }
  function renderGreeting() {
    var g = $('bentoGreeting');
    if (g) g.textContent = t('shell.greeting', { name: displayName() });
    var i = $('bentoUserInitial');
    if (i) i.textContent = displayName().charAt(0).toUpperCase();
  }
  function wrapProfile() {
    var legacy = global.signInProfile;
    if (typeof legacy !== 'function' || legacy.__bento) return;
    var wrapped = function () {
      var input = $('profileName');
      var name = input ? input.value.trim() : '';
      try { legacy.apply(this, arguments); } catch (e) { if (global.console) console.error(e); }
      var st = $('profileStatus');
      if (st) st.textContent = '✓ ' + (name || t('role.' + shell.role)) + ' • ' + t('role.' + shell.role);
      if (name) { shell.name = name.split(/\s+/)[0]; store('nutri_profile_name', shell.name); }
      renderGreeting();
      renderNav();
    };
    wrapped.__bento = true;
    global.signInProfile = wrapped;
  }
  function wrapToast() {
    var legacy = global.toast;
    if (typeof legacy !== 'function' || legacy.__bento) return;
    var wrapped = function (message) { return legacy(I18N ? I18N.translate(String(message == null ? '' : message)) : message); };
    wrapped.__bento = true;
    global.toast = wrapped;
  }
  function logout() {
    shell.name = '';
    store('nutri_profile_name', null);
    ['profileName', 'profileContact', 'profileOrg', 'profileId'].forEach(function (id) { var el = $(id); if (el) el.value = ''; });
    global.chooseRole('citizen');
    renderGreeting();
    if (typeof global.go === 'function') global.go('home');
    if (typeof global.toast === 'function') global.toast(t('shell.toast.logout'));
  }
  function openProfile() {
    if (typeof global.go === 'function') global.go('home');
    var details = doc.querySelector('#home details.profile-access');
    if (details) details.open = true;
    var input = $('profileName');
    if (input) setTimeout(function () { input.focus(); }, 80);
  }

  /* ---- live module search ---------------------------------------------- */
  function fold(text) {
    return String(text).toLowerCase().normalize ? String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : String(text).toLowerCase();
  }
  function closeSearch() {
    var box = $('bentoSearchResults'), input = $('bentoSearch');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    if (input) input.setAttribute('aria-expanded', 'false');
  }
  function runSearch() {
    var input = $('bentoSearch'), box = $('bentoSearchResults');
    if (!input || !box) return;
    var q = fold(input.value.trim());
    if (!q) { closeSearch(); return; }
    var lang = I18N ? I18N.lang : 'en';
    var hits = VIEWS.filter(function (v) {
      var hay = [t('nav.' + v.id), t('nav.' + v.id + '.desc'), shortLabel(v.id), v.id, t('group.' + v.group)].join(' ');
      return fold(hay).indexOf(q) !== -1;
    }).slice(0, 7);
    box.setAttribute('aria-label', t('shell.search.results'));
    box.setAttribute('lang', lang);
    box.innerHTML = hits.length ? hits.map(function (v) {
      return '<button type="button" role="option" class="bento-search-hit" data-view="' + v.id + '" onclick="go(\'' + v.id + '\',this)">' + icon(v.id) +
        '<span><b>' + esc(t('nav.' + v.id)) + '</b><small>' + esc(t('nav.' + v.id + '.desc')) + '</small></span></button>';
    }).join('') : '<p class="bento-search-empty">' + esc(t('shell.search.empty', { q: input.value.trim() })) + '</p>';
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  /* ====================================================================== */
  /* 5. SAFETY NETS                                                         */
  /* ====================================================================== */
  /* Generic "Indicator" charts that the V39 layer used to append to views. */
  function cleanIndicators() {
    var list = doc.querySelectorAll('.v38-chart-wrap, canvas[id^="v38-"], .v38-svg-chart');
    for (var i = 0; i < list.length; i++) {
      var node = list[i].closest('.v38-chart-wrap') || list[i];
      if (node.parentNode) node.parentNode.removeChild(node);
    }
  }
  /* Accessible name for every form field that has neither <label> nor aria-label. */
  var FIELD_KEYS = { profileName: 'field.profileName', profileContact: 'field.profileContact', profileOrg: 'field.profileOrg',
    profileId: 'field.profileId', profileSpecialty: 'field.profileSpecialty' };
  function labelFields() {
    var list = doc.querySelectorAll('.view input, .view select, .view textarea');
    var named = 0;
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.type === 'hidden' || el.closest('#czdRoot')) continue;
      if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) continue;
      if (el.closest('label')) continue;
      if (el.id && doc.querySelector('label[for="' + (global.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]')) continue;
      var key = FIELD_KEYS[el.id], text = '';
      if (key) { el.setAttribute('data-b-i18n-aria', key); el.setAttribute('aria-label', t(key)); named++; continue; }
      if (el.classList.contains('v38-period')) { el.setAttribute('data-b-i18n-aria', 'field.period'); el.setAttribute('aria-label', t('field.period')); named++; continue; }
      text = el.getAttribute('placeholder') || '';
      if (!text) {
        var prev = el.previousElementSibling;
        if (prev && /^(B|SPAN|STRONG|SMALL|H3|H4|P|DIV)$/.test(prev.tagName) && prev.textContent.trim().length < 60) text = prev.textContent.trim();
      }
      if (!text) {
        var card = el.closest('.card,.form,section');
        var head = card ? card.querySelector('h2,h3,h4,b') : null;
        if (head) text = head.textContent.trim().slice(0, 60);
      }
      if (text) el.setAttribute('aria-label', text);
      else { el.setAttribute('data-b-i18n-aria', 'field.generic'); el.setAttribute('aria-label', t('field.generic')); }
      named++;
    }
    return named;
  }

  /* ====================================================================== */
  /* MOUNT                                                                  */
  /* ====================================================================== */
  function injectIcons(root) {
    var list = (root || doc).querySelectorAll('[data-bento-icon]');
    for (var i = 0; i < list.length; i++) {
      if (!list[i].firstChild) list[i].innerHTML = icon(list[i].getAttribute('data-bento-icon'));
    }
  }

  function onDocClick(e) {
    var target = e.target;
    if (!target || !target.closest) return;
    if (target.closest('[data-bento-drawer]')) { if (drawerOpen()) closeDrawer(); else openDrawer(); return; }
    if (target.closest('[data-bento-drawer-close]') || target.id === 'bentoScrim') { closeDrawer(); return; }
    if (target.closest('[data-bento-role]')) { closeDrawer(false); openProfile(); return; }
    if (target.closest('#bentoPremium')) {
      if (typeof global.go === 'function') global.go('payments');
      if (typeof global.toast === 'function') global.toast(t('shell.premium.toast'));
      return;
    }
    if (target.closest('#bentoLogoutBtn')) { logout(); return; }
    if (target.closest('#bentoUserBtn')) { openProfile(); return; }
    if (!target.closest('.bento-search')) closeSearch();
  }
  function onKeydown(e) {
    if (e.key === 'Escape') {
      if (drawerOpen()) { closeDrawer(); e.stopPropagation(); return; }
      closeSearch();
    }
    if (e.key === 'Tab' && drawerOpen()) {
      var d = $('bentoDrawer');
      var focusable = d.querySelectorAll('button');
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') && !(e.target && e.target.isContentEditable)) {
      var input = $('bentoSearch');
      if (input && input.offsetParent) { e.preventDefault(); input.focus(); }
    }
  }

  function mount() {
    if (shell.mounted) return;
    wrapGo(); wrapProfile(); wrapToast(); guardLivePanel();
    injectIcons(doc);
    global.chooseRole(shell.role);
    shell.mounted = true;
    renderNav();
    renderGreeting();
    markActive();
    cleanIndicators();
    labelFields();

    doc.addEventListener('click', onDocClick);
    doc.addEventListener('keydown', onKeydown);
    var search = $('bentoSearch');
    if (search) {
      search.addEventListener('input', runSearch);
      search.addEventListener('focus', runSearch);
      search.addEventListener('keydown', function (e) {
        var box = $('bentoSearchResults');
        if (e.key === 'Enter') { var hit = box && box.querySelector('.bento-search-hit'); if (hit) { e.preventDefault(); hit.click(); search.value = ''; } }
        if (e.key === 'ArrowDown') { var first = box && box.querySelector('.bento-search-hit'); if (first) { e.preventDefault(); first.focus(); } }
      });
    }
    if (I18N) {
      I18N.onChange(function () { renderNav(); renderGreeting(); markActive(); runSearch(); redrawCharts(); });
    }
    /* Late legacy layers (timeouts up to ~1s) keep adding nodes: settle after them. */
    [500, 1200, 2500].forEach(function (ms) {
      setTimeout(function () { guardLivePanel(); cleanIndicators(); labelFields(); }, ms);
    });
    if (global.MutationObserver) {
      var timer = null;
      new MutationObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(function () { cleanIndicators(); labelFields(); }, 400);
      }).observe($('bentoMain') || doc.body, { childList: true, subtree: true });
    }
    /* Deep link: index.html#unicef opens that view directly. */
    var hash = (global.location.hash || '').replace('#', '');
    if (hash && $(hash) && $(hash).classList.contains('view') && typeof global.go === 'function') global.go(hash);
    /* The hash names a view, not an anchor: never let the browser scroll past the header. */
    var resetScroll = function () { global.scrollTo(0, 0); };
    resetScroll(); global.addEventListener('load', function () { setTimeout(resetScroll, 0); });
    global.addEventListener('hashchange', function () {
      var id = (global.location.hash || '').replace('#', '');
      if (id && id !== shell.view && $(id) && $(id).classList.contains('view')) global.go(id);
      resetScroll();
    });
    /* Default market is Togo until the user explicitly picks a country. */
    var country = $('country');
    if (country) {
      country.addEventListener('change', function () { try { localStorage.setItem('nutri_country_chosen', '1'); } catch (e) { /* private mode */ } });
      var chosen = null; try { chosen = localStorage.getItem('nutri_country_chosen'); } catch (e) { /* private mode */ }
      if (!chosen && country.value !== 'TG' && country.querySelector('option[value="TG"]')) {
        country.value = 'TG';
        if (typeof global.countryChanged === 'function') { try { global.countryChanged(); } catch (e) { if (global.console) console.error(e); } }
      }
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', mount);
  else mount();

  global.NutriBentoShell = {
    views: VIEWS, roles: ROLES, icons: ICONS, icon: icon, guard: guard,
    isProtected: isProtected, hasOwnAction: hasOwnAction,
    get view() { return shell.view; },
    get role() { return shell.role; },
    openDrawer: openDrawer, closeDrawer: closeDrawer, renderNav: renderNav,
    labelFields: labelFields, cleanIndicators: cleanIndicators, redrawCharts: redrawCharts
  };
})(window);
