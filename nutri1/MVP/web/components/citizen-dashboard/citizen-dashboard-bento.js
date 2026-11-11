/* ============================================================================
 * NUTRI.N°1 — Citizen Dashboard 360° · Dark Bento "activity" row  (SESSION 2)
 * ----------------------------------------------------------------------------
 * Pure template helpers (no DOM access, no state mutation) for the five cards
 * that open the Overview tab:
 *
 *   Physical Activity  three smoothed splines (steps / active minutes / kcal)
 *   Active Days        cobalt month calendar
 *   Sleep              ring gauge
 *   Weight plan        progress towards the reference weight
 *   My Activities      today's sessions
 *
 * Everything is derived from the controller state (state.habits, state.history,
 * state.profile, state.indicator); citizen-dashboard-data.js and
 * citizen-dashboard-model.js are left untouched.
 *
 * Load order : i18n → data → model → charts → bento → template → controller
 * API        : CZD_BENTO.render(state) → HTML string
 * ========================================================================== */
(function (global) {
  'use strict';

  var I18N = global.CZD_I18N;
  var C = global.CZD_CHARTS;
  if (!I18N || !C) return;

  var LIME = '#D2F85A', ORANGE = '#F59B42', LAVENDER = '#8F88E8';
  var seq = 0;

  function t(k, p) { return I18N.t(k, p); }
  function n(v, d) { return I18N.num(v, d); }
  function esc(s) { return C.esc(s); }
  function icon(name) { return C.icon(name); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* Deterministic pseudo-random stream: the same profile always yields the same demo history. */
  function rng(seedStr) {
    var s = 2166136261;
    String(seedStr || 'nutri').split('').forEach(function (ch) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619); });
    return function () {
      s = Math.imul(s ^ (s >>> 15), 2246822507); s = Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
    };
  }

  /* ---- Derived activity model ---------------------------------------- */
  function week(state) {
    var h = state.habits || {}, p = state.profile || {}, hist = state.history || [];
    var last7 = hist.slice(-7);
    var todayIdx = (new Date().getDay() + 6) % 7;                 /* Monday = 0 */
    var r = rng((p.name || '') + (p.goal || '') + 'week');
    var steps = [], minutes = [], kcal = [];
    for (var i = 0; i < 7; i++) {
      var base = last7[i] ? last7[i].steps : 6000 + r() * 3000;
      var s = i === todayIdx ? (h.steps || 0) : i > todayIdx ? 0 : Math.round(base);
      steps.push(s);
      var m = i > todayIdx ? 0 : Math.round(s / 150 + (i === todayIdx ? 0 : r() * 12));
      minutes.push(m);
      kcal.push(i > todayIdx ? 0 : Math.round(s * 0.045 * ((p.weight || 68) / 68) + m * 2.2));
    }
    return {
      today: todayIdx, steps: steps, minutes: minutes, kcal: kcal,
      stepsGoal: h.stepsGoal || 8000, minutesGoal: 45,
      kcalGoal: Math.round((h.stepsGoal || 8000) * 0.045 * ((p.weight || 68) / 68) + 45 * 2.2)
    };
  }

  function dayLabels() {
    return I18N.lang === 'fr' ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
  function dayInitials() {
    return I18N.lang === 'fr' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  }
  function monthName(d) {
    var fr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    var en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return (I18N.lang === 'fr' ? fr : en)[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* ---- Spline chart (three series, common 0–120 % of goal axis) -------- */
  function smooth(pts) {
    if (!pts.length) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function splines(w) {
    var W = 640, H = 250, pad = { t: 34, r: 18, b: 34, l: 18 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var labels = dayLabels(), id = 'czdb' + (++seq);
    var x = function (i) { return pad.l + iw * i / 6; };
    var y = function (pct) { return pad.t + ih * (1 - clamp(pct, 0, 125) / 125); };
    var series = [
      { key: 'kcal', color: LAVENDER, values: w.kcal, goal: w.kcalGoal },
      { key: 'minutes', color: ORANGE, values: w.minutes, goal: w.minutesGoal },
      { key: 'steps', color: LIME, values: w.steps, goal: w.stepsGoal }
    ];
    var body = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + LIME + '" stop-opacity=".28"/><stop offset="1" stop-color="' + LIME + '" stop-opacity="0"/></linearGradient></defs>';
    /* goal line (100 %) + day guides */
    body += '<line class="czdb-goal" x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y(100).toFixed(1) + '" y2="' + y(100).toFixed(1) + '"/>' +
      '<text class="czdb-axis" x="' + (W - pad.r) + '" y="' + (y(100) - 7).toFixed(1) + '" text-anchor="end">' + esc(t('czd.bento.activity.goal')) + '</text>';
    labels.forEach(function (l, i) {
      body += '<text class="czdb-axis' + (i === w.today ? ' is-today' : '') + '" x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(l) + '</text>';
    });
    series.forEach(function (s) {
      var pts = [];
      for (var i = 0; i <= w.today; i++) pts.push([x(i), y(s.values[i] / s.goal * 100)]);
      if (pts.length === 1) pts.unshift([pad.l, pts[0][1]]);
      var d = smooth(pts);
      if (s.key === 'steps') {
        body += '<path d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (pad.t + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (pad.t + ih) + ' Z" fill="url(#' + id + ')"/>';
      }
      body += '<path class="czdb-line" d="' + d + '" stroke="' + s.color + '"/>';
      var last = pts[pts.length - 1];
      body += '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="5" fill="#2B2C31" stroke="' + s.color + '" stroke-width="3"/>';
      if (s.key === 'steps') {
        var txt = n(w.steps[w.today], 0), bw = txt.length * 8 + 22;
        var bx = clamp(last[0] - bw / 2, pad.l, W - pad.r - bw), by = Math.max(4, last[1] - 36);
        body += '<rect class="czdb-badge-bg" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + bw + '" height="24" rx="12" fill="' + LIME + '"/>' +
          '<text class="czdb-badge" x="' + (bx + bw / 2).toFixed(1) + '" y="' + (by + 16.5).toFixed(1) + '" text-anchor="middle">' + esc(txt) + '</text>';
      }
    });
    return '<svg class="czdb-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('czd.bento.activity.aria')) + '">' + body + '</svg>';
  }

  /* ---- Cards ---------------------------------------------------------- */
  function stat(color, label, value, goal) {
    return '<div class="czdb-stat"><i style="background:' + color + '"></i><span>' + esc(label) + '</span>' +
      '<b>' + esc(value) + '</b><small>' + esc(goal) + '</small></div>';
  }
  function activityCard(state, w) {
    var i = w.today;
    return '<article class="czd-card czdb czdb-activity">' +
      '<div class="czdb-head"><div><h3>' + esc(t('czd.bento.activity.title')) + '</h3>' +
        '<p>' + esc(t('czd.bento.activity.sub')) + '</p></div>' +
        '<span class="czdb-chip">' + esc(t('czd.bento.week')) + '</span></div>' +
      '<div class="czdb-stats">' +
        stat(LIME, t('czd.bento.steps'), n(w.steps[i], 0), '/ ' + n(w.stepsGoal, 0)) +
        stat(ORANGE, t('czd.bento.minutes'), n(w.minutes[i], 0) + ' min', '/ ' + n(w.minutesGoal, 0) + ' min') +
        stat(LAVENDER, t('czd.bento.kcal'), n(w.kcal[i], 0) + ' kcal', '/ ' + n(w.kcalGoal, 0) + ' kcal') +
      '</div>' + splines(w) + '</article>';
  }

  function calendarCard(state, w) {
    var now = new Date(), y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
    var first = (new Date(y, m, 1).getDay() + 6) % 7, total = new Date(y, m + 1, 0).getDate();
    var p = state.profile || {}, goal = w.stepsGoal;
    var r = rng((p.name || '') + (p.goal || '') + y + '-' + m);
    var base = { low: 0.42, light: 0.6, moderate: 0.74, high: 0.88 }[p.activity] || 0.66;
    var cells = '', active = 0, streak = 0, run = 0;
    for (var b = 0; b < first; b++) cells += '<span class="czdb-day is-blank"></span>';
    for (var d = 1; d <= total; d++) {
      var on;
      if (d > today) on = false;
      else if (d === today) on = (state.habits.steps || 0) >= goal * 0.75;
      else on = r() < base;
      if (on) { active++; run++; } else if (d < today) run = 0;
      if (d <= today) streak = run;
      cells += '<span class="czdb-day' + (on ? ' is-on' : '') + (d === today ? ' is-today' : '') + (d > today ? ' is-future' : '') + '"' +
        (d === today ? ' aria-current="date"' : '') + '>' + d + '</span>';
    }
    return '<article class="czd-card czdb czdb-calendar">' +
      '<div class="czdb-head"><div><h3>' + esc(t('czd.bento.days.title')) + '</h3><p>' + esc(monthName(now)) + '</p></div>' +
        '<span class="czdb-chip czdb-chip--light">' + esc(t('czd.bento.days.count', { n: active })) + '</span></div>' +
      '<div class="czdb-cal" role="img" aria-label="' + esc(t('czd.bento.days.aria', { n: active, m: monthName(now) })) + '">' +
        dayInitials().map(function (l) { return '<span class="czdb-dow">' + l + '</span>'; }).join('') + cells + '</div>' +
      '<div class="czdb-cal-foot"><span><b>' + streak + '</b> ' + esc(t('czd.bento.days.streak')) + '</span>' +
        '<span class="czdb-legend"><i class="is-on"></i>' + esc(t('czd.bento.days.active')) + '<i class="is-today"></i>' + esc(t('czd.bento.days.today')) + '</span></div>' +
      '</article>';
  }

  function hm(hours) {
    var h = Math.floor(hours), m = Math.round((hours - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    return h + ' h ' + (m < 10 ? '0' : '') + m;
  }
  function clock(decimal) {
    var v = ((decimal % 24) + 24) % 24, h = Math.floor(v), m = Math.round((v - h) * 60);
    if (m === 60) { h = (h + 1) % 24; m = 0; }
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function sleepCard(state) {
    var h = state.habits || {}, sleep = h.sleep || 0, goal = h.sleepGoal || 7.5;
    var ratio = clamp(sleep / goal, 0, 1), size = 168, stroke = 16, rad = (size - stroke) / 2, circ = 2 * Math.PI * rad;
    var quality = ratio >= 0.95 ? 'good' : ratio >= 0.8 ? 'fair' : 'short';
    var wake = 6, bed = wake - sleep;
    return '<article class="czd-card czdb czdb-sleep">' +
      '<div class="czdb-head"><div><h3>' + esc(t('czd.bento.sleep.title')) + '</h3><p>' + esc(t('czd.bento.sleep.sub')) + '</p></div>' +
        '<span class="czdb-chip czdb-chip--' + quality + '">' + esc(t('czd.bento.sleep.' + quality)) + '</span></div>' +
      '<div class="czdb-ring">' +
        '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(t('czd.bento.sleep.aria', { a: hm(sleep), b: hm(goal) })) + '">' +
          '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + rad + '" fill="none" stroke="#1E1F23" stroke-width="' + stroke + '"/>' +
          '<circle class="czdb-ring-arc" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + rad + '" fill="none" stroke="' + LAVENDER + '" stroke-width="' + stroke + '" stroke-linecap="round" ' +
            'stroke-dasharray="' + (circ * ratio).toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
        '</svg>' +
        '<div class="czdb-ring-label"><b>' + esc(hm(sleep)) + '</b><span>' + esc(t('czd.bento.sleep.of', { b: hm(goal) })) + '</span></div>' +
      '</div>' +
      '<div class="czdb-pair"><div><span>' + esc(t('czd.bento.sleep.bed')) + '</span><b>' + clock(bed) + '</b></div>' +
        '<div><span>' + esc(t('czd.bento.sleep.wake')) + '</span><b>' + clock(wake) + '</b></div></div>' +
      '</article>';
  }

  function weightCard(state) {
    var p = state.profile || {}, ind = state.indicator || {}, hist = state.history || [];
    var ideal = ind.idealWeight || { min: p.weight, max: p.weight };
    var current = p.weight || 0;
    var target = current > ideal.max ? ideal.max : current < ideal.min ? ideal.min : current;
    var start = hist.length ? hist[0].weight : current;
    if (Math.abs(start - target) < Math.abs(current - target)) start = current;
    var span = Math.abs(start - target), done = span ? clamp(1 - Math.abs(current - target) / span, 0, 1) : 1;
    var left = Math.abs(current - target);
    var onTarget = left < 0.05;
    var pct = Math.round(done * 100);
    return '<article class="czd-card czdb czdb-weight">' +
      '<div class="czdb-head"><div><h3>' + esc(t('czd.bento.weight.title')) + '</h3><p>' + esc(t('czd.bento.weight.sub', { a: n(ideal.min, 0), b: n(ideal.max, 0) })) + '</p></div>' +
        '<span class="czdb-ico">' + icon('scale') + '</span></div>' +
      '<div class="czdb-weight-now"><b>' + esc(n(current, 1)) + '</b><span>kg</span>' +
        '<em class="' + (onTarget ? 'is-ok' : '') + '">' + esc(onTarget ? t('czd.bento.weight.onTarget') : t('czd.bento.weight.left', { v: n(left, 1) })) + '</em></div>' +
      '<div class="czdb-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(t('czd.bento.weight.title')) + '">' +
        '<i style="width:' + pct + '%"></i></div>' +
      '<div class="czdb-pair czdb-pair--three"><div><span>' + esc(t('czd.bento.weight.start')) + '</span><b>' + esc(n(start, 1)) + ' kg</b></div>' +
        '<div><span>' + esc(t('czd.bento.weight.progress')) + '</span><b>' + pct + ' %</b></div>' +
        '<div><span>' + esc(t('czd.bento.weight.target')) + '</span><b>' + esc(n(target, 1)) + ' kg</b></div></div>' +
      '</article>';
  }

  function activitiesCard(state, w) {
    var p = state.profile || {}, h = state.habits || {}, weight = p.weight || 68;
    var walkMin = Math.round((h.steps || 0) / 110);
    var level = { low: 0, light: 1, moderate: 2, high: 3 }[p.activity];
    if (level == null) level = 1;
    var rows = [
      { key: 'walk', icon: 'steps', color: LIME, min: walkMin, goal: Math.round((h.stepsGoal || 8000) / 110), met: 3.5, time: '06:30' },
      { key: 'cycle', icon: 'bike', color: ORANGE, min: [0, 15, 30, 45][level], goal: 30, met: 6.8, time: '12:15' },
      { key: 'strength', icon: 'dumbbell', color: LAVENDER, min: [0, 10, 20, 35][level], goal: 20, met: 5, time: '17:40' },
      { key: 'stretch', icon: 'yoga', color: '#A9B5FF', min: [5, 10, 15, 15][level], goal: 15, met: 2.5, time: '21:00' }
    ];
    return '<article class="czd-card czdb czdb-activities">' +
      '<div class="czdb-head"><div><h3>' + esc(t('czd.bento.acts.title')) + '</h3><p>' + esc(t('czd.bento.acts.sub')) + '</p></div>' +
        '<button type="button" class="czd-btn czd-btn--primary czdb-add" data-czd-act="steps+" data-czd-amount="1000">' + icon('plus') + '<span>' + esc(t('czd.bento.acts.add')) + '</span></button></div>' +
      '<ul class="czdb-acts">' + rows.map(function (r) {
        var pct = r.goal ? clamp(Math.round(r.min / r.goal * 100), 0, 100) : 0;
        var kcal = Math.round(r.met * weight * r.min / 60);
        return '<li class="czdb-act"><span class="czdb-ico" style="color:' + r.color + '">' + icon(r.icon) + '</span>' +
          '<div class="czdb-act-main"><b>' + esc(t('czd.bento.act.' + r.key)) + '</b><small>' + r.time + ' · ' + esc(n(r.min, 0)) + ' min · ' + esc(n(kcal, 0)) + ' kcal</small>' +
            '<span class="czdb-track czdb-track--thin" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + esc(t('czd.bento.act.' + r.key)) + '">' +
            '<i style="width:' + pct + '%;background:' + r.color + '"></i></span></div>' +
          '<span class="czdb-act-pct">' + pct + ' %</span></li>';
      }).join('') + '</ul></article>';
  }

  function render(state) {
    var w = week(state);
    return '<div class="czdb-grid">' + activityCard(state, w) + calendarCard(state, w) + sleepCard(state) +
      weightCard(state) + activitiesCard(state, w) + '</div>';
  }

  global.CZD_BENTO = { render: render, week: week };
})(window);
