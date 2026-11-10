/* ============================================================================
 * NUTRI.N°1 — AI Nutrition & Prevention Engine · moteur graphique SVG
 * ----------------------------------------------------------------------------
 * Zéro librairie (ni Chart.js, ni D3). Tout est SVG inline généré en chaîne :
 *   AIP_CHARTS.icon(name)                 → icône 24 × 24
 *   AIP_CHARTS.gauge({...})               → jauge circulaire animable
 *   AIP_CHARTS.spark(values, color)       → mini-courbe de capteur
 *   AIP_CHARTS.timelineTrack(risk)        → piste temporelle double (actuel/corrigé)
 *   AIP_CHARTS.weekChart(gl, activeIndex) → charge glycémique des 7 jours
 *   AIP_CHARTS.animate(root)              → remplit jauges + compteurs (rAF)
 * ========================================================================== */
(function (global) {
  'use strict';

  var DATA = global.AIP_DATA;
  var seq = 0;
  var uid = function () { seq += 1; return 'aip' + seq; };

  function icon(name, cls) {
    var path = (DATA.ICONS && DATA.ICONS[name]) || DATA.ICONS.spark;
    return '<svg class="aip-icon ' + (cls || '') + '" viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      path + '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Jauge circulaire (stroke-dasharray → animable en CSS)              */
  /* ------------------------------------------------------------------ */
  function gauge(opts) {
    opts = opts || {};
    var value = Math.max(0, Math.min(100, Number(opts.value) || 0));
    var size = opts.size || 148;
    var stroke = opts.stroke || 11;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var id = uid();
    var from = opts.from || '#34d399';
    var to = opts.to || opts.from || '#0ea5e9';
    var label = opts.label || '';
    var unit = opts.unit == null ? '%' : opts.unit;

    return '' +
      '<div class="aip-gauge" style="--aip-gauge-size:' + size + 'px">' +
        '<svg class="aip-gauge__svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" ' +
          'aria-label="' + (label ? label + ' ' : '') + value + (unit || '').replace(/"/g, '') + '">' +
          '<defs>' +
            '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0%" stop-color="' + from + '"/>' +
              '<stop offset="100%" stop-color="' + to + '"/>' +
            '</linearGradient>' +
            '<filter id="' + id + '-glow" x="-40%" y="-40%" width="180%" height="180%">' +
              '<feGaussianBlur stdDeviation="4" result="b"/>' +
              '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
            '</filter>' +
          '</defs>' +
          '<circle class="aip-gauge__track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
          '<circle class="aip-gauge__bar" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" ' +
            'stroke="url(#' + id + ')" stroke-width="' + stroke + '" stroke-linecap="round" ' +
            'transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')" ' +
            'style="stroke-dasharray:' + c.toFixed(2) + ';stroke-dashoffset:' + c.toFixed(2) + ';filter:url(#' + id + '-glow)" ' +
            'data-dashoffset="' + (c * (1 - value / 100)).toFixed(2) + '"/>' +
        '</svg>' +
        '<div class="aip-gauge__center">' +
          '<b class="aip-gauge__value" data-count="' + value + '">0</b>' +
          '<span class="aip-gauge__unit">' + unit + '</span>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Mini-courbe de capteur                                             */
  /* ------------------------------------------------------------------ */
  function spark(values, color, opts) {
    opts = opts || {};
    var w = 120, h = 38, pad = 3;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = (max - min) || 1;
    var step = (w - pad * 2) / Math.max(1, values.length - 1);
    var pts = values.map(function (v, i) {
      var x = pad + i * step;
      var y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
    var area = line + ' L' + pts[pts.length - 1][0] + ' ' + (h - pad) + ' L' + pts[0][0] + ' ' + (h - pad) + ' Z';
    var id = uid();
    var col = color || '#34d399';
    return '' +
      '<svg class="aip-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
        '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + col + '" stop-opacity=".38"/>' +
          '<stop offset="100%" stop-color="' + col + '" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#' + id + ')"/>' +
        '<path class="aip-spark__line" d="' + line + '" fill="none" stroke="' + col + '" stroke-width="1.8" ' +
          'stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>' +
        '<circle class="aip-spark__dot" cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="2.6" fill="' + col + '"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Piste de timeline (deux bandes : actuel / corrigé)                 */
  /* ------------------------------------------------------------------ */
  var HORIZON = 20;

  function pct(year) { return Math.max(0, Math.min(100, (year / HORIZON) * 100)); }

  function timelineTrack(risk, mode) {
    var cur = risk.onset;
    var cor = risk.corrected.onset;
    var fromCur = pct(cur.from), toCur = pct(cur.to);
    var fromCor = pct(cor.from), toCor = pct(cor.to);
    var showCorrected = cor.probability >= 12;
    var grid = '';
    for (var y = 0; y <= HORIZON; y += 5) {
      grid += '<line x1="' + pct(y) + '" y1="0" x2="' + pct(y) + '" y2="30" class="aip-tl__grid" ' +
        (y === 0 ? 'data-first="1"' : '') + '/>';
    }
    return '' +
      '<svg class="aip-tl__track" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
        grid +
        (cur.beyond || cur.none ? '' :
          '<rect class="aip-tl__bar aip-tl__bar--current ' + (mode === 'corrected' ? 'is-dim' : '') + '" ' +
            'x="' + fromCur + '" y="4" width="' + Math.max(1.6, toCur - fromCur) + '" height="8" rx="2"/>') +
        (showCorrected && !cor.beyond && !cor.none ?
          '<rect class="aip-tl__bar aip-tl__bar--corrected ' + (mode === 'current' ? 'is-dim' : '') + '" ' +
            'x="' + fromCor + '" y="18" width="' + Math.max(1.6, toCor - fromCor) + '" height="8" rx="2"/>' : '') +
      '</svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Charge glycémique de la semaine                                    */
  /* ------------------------------------------------------------------ */
  function weekChart(values, activeIndex, labels) {
    var max = Math.max.apply(null, values) || 1;
    var bars = values.map(function (v, i) {
      var h = Math.max(6, Math.round((v / max) * 100));
      return '<div class="aip-week__col' + (i === activeIndex ? ' is-active' : '') + '">' +
        '<div class="aip-week__bar" style="--h:' + h + '%;--d:' + (i * 55) + 'ms">' +
          '<span class="aip-week__val">' + v + '</span>' +
        '</div>' +
        '<span class="aip-week__day">' + (labels[i] || '') + '</span>' +
      '</div>';
    }).join('');
    return '<div class="aip-week">' + bars + '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* Animation des jauges et compteurs                                  */
  /* ------------------------------------------------------------------ */
  function raf(fn) {
    if (typeof global.requestAnimationFrame === 'function') return global.requestAnimationFrame(fn);
    return setTimeout(function () { fn(Date.now()); }, 16);
  }

  function animate(root) {
    if (!root) return;
    var bars = root.querySelectorAll('.aip-gauge__bar');
    var counters = root.querySelectorAll('[data-count]');

    /* Filet de sécurité : certains environnements suspendent requestAnimationFrame
       (onglet en arrière-plan, erreur d’un script tiers). Les jauges doivent
       afficher leur valeur finale même si aucune frame n’est rendue. */
    setTimeout(function () {
      Array.prototype.forEach.call(bars, function (bar) {
        if (bar.getAttribute('data-dashoffset')) bar.style.strokeDashoffset = bar.getAttribute('data-dashoffset');
      });
      Array.prototype.forEach.call(counters, function (el) {
        var target = el.getAttribute('data-count');
        if (target != null) el.textContent = String(Math.round(parseFloat(target) || 0));
      });
    }, 2000);

    Array.prototype.forEach.call(bars, function (bar, i) {
      var target = bar.getAttribute('data-dashoffset');
      bar.style.transitionDelay = (i * 90) + 'ms';
      /* Double rAF : laisse le navigateur peindre l’état vide avant transition. */
      raf(function () {
        raf(function () { bar.style.strokeDashoffset = target; });
      });
    });

    Array.prototype.forEach.call(counters, function (el) {
      var to = parseFloat(el.getAttribute('data-count')) || 0;
      var start = null;
      var duration = 1150;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(to * eased));
        if (p < 1) raf(step);
        else el.textContent = String(Math.round(to));
      }
      raf(step);
    });
  }

  global.AIP_CHARTS = {
    icon: icon,
    gauge: gauge,
    spark: spark,
    timelineTrack: timelineTrack,
    weekChart: weekChart,
    animate: animate,
    pct: pct,
    horizon: HORIZON
  };
})(window);
