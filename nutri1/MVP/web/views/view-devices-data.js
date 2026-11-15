/* ==========================================================================
   NUTRI.N°1 — Connected Devices · "Data sent" curves
   Mounts into #vdData (placeholder emitted by views/view-devices.js): for every
   data type a connected and synchronised source is allowed to send, a curve of
   the measurements sent (last 24 hours, 7 days or 30 days), min / average / max,
   and a second curve with the number of measurements sent per day.

   Depends on : js/bento-i18n.js, views/view-devices.js (NutriBentoViews.devices.sent())
   Styles     : styles/views.css  (.vdx-* in block 3, scoped to #devices)
   Note       : demonstration only — no device is read. The series are generated in
                the browser from a fixed seed per data type and per hour, so they are
                stable from one sync to the next. "Latest readings" in view-devices.js
                shows the last point of the same series (latest()).
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('devices');
  var host = global.NutriBentoViews && global.NutriBentoViews.devices;
  if (!root || !I18N || !host || !host.sent) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'devx.title': 'Data sent by your devices',
      'devx.sub': 'Curves of the measurements each connected source has sent to NUTRI.N°1.',
      'devx.empty': 'No data sent yet. Connect a source above and run a sync: the curves of the measurements sent will appear here.',
      'devx.range': 'Period', 'devx.range.day': '24 hours', 'devx.range.week': '7 days', 'devx.range.month': '30 days',
      'devx.types': 'Data type',
      'devx.from': 'Sent by {name} · last sent at {time}',
      'devx.stat.last': 'Latest', 'devx.stat.min': 'Minimum', 'devx.stat.avg': 'Average', 'devx.stat.max': 'Maximum', 'devx.stat.total': 'Total',
      'devx.band': 'Usual range',
      'devx.sys': 'Systolic', 'devx.dia': 'Diastolic',
      'devx.vol.title': 'Measurements sent per day',
      'devx.vol.sub': 'All connected sources, last 7 days',
      'devx.vol.total': '{n} measurements sent in 7 days',
      'devx.chart': '{name}: curve of the values sent, {range}. Use the left and right arrow keys to read each point.',
      'devx.today': 'Today', 'devx.now': 'Now',
      'devx.note': 'Demonstration: the values are generated in this browser. No device, account or health platform is contacted.'
    },
    fr: {
      'devx.title': 'Données envoyées par vos appareils',
      'devx.sub': 'Courbes des mesures que chaque source connectée a envoyées à NUTRI.N°1.',
      'devx.empty': 'Aucune donnée envoyée pour l’instant. Connectez une source ci-dessus et lancez une synchro : les courbes des mesures envoyées s’afficheront ici.',
      'devx.range': 'Période', 'devx.range.day': '24 heures', 'devx.range.week': '7 jours', 'devx.range.month': '30 jours',
      'devx.types': 'Type de donnée',
      'devx.from': 'Envoyé par {name} · dernier envoi à {time}',
      'devx.stat.last': 'Dernière', 'devx.stat.min': 'Minimum', 'devx.stat.avg': 'Moyenne', 'devx.stat.max': 'Maximum', 'devx.stat.total': 'Total',
      'devx.band': 'Plage habituelle',
      'devx.sys': 'Systolique', 'devx.dia': 'Diastolique',
      'devx.vol.title': 'Mesures envoyées par jour',
      'devx.vol.sub': 'Toutes les sources connectées, 7 derniers jours',
      'devx.vol.total': '{n} mesures envoyées en 7 jours',
      'devx.chart': '{name} : courbe des valeurs envoyées, {range}. Utilisez les flèches gauche et droite pour lire chaque point.',
      'devx.today': 'Aujourd’hui', 'devx.now': 'Maintenant',
      'devx.note': 'Démonstration : les valeurs sont générées dans ce navigateur. Aucun appareil, compte ou plateforme de santé n’est contacté.'
    }
  });

  /* ---- 2. Model: seeded series per data type ------------------------------ */
  var HOUR = 36e5, DAY = 864e5;
  /* perDay = measurements a source sends per day; daily = one value per day only (no 24-hour curve) */
  var META = {
    steps:   { dec: 0, unit: 'devices.unit.steps', perDay: 24, sum: true, tone: 'lime' },
    heart:   { dec: 0, unit: 'devices.unit.bpm', perDay: 288, tone: 'red', band: [60, 100] },
    sleep:   { dec: 1, unit: 'devices.unit.hours', perDay: 1, daily: true, tone: 'violet', band: [7, 9] },
    glucose: { dec: 1, unitText: 'mmol/L', perDay: 288, tone: 'orange', band: [3.9, 7.8] },
    bp:      { dec: 0, unitText: 'mmHg', perDay: 2, daily: true, tone: 'blue', two: true },
    weight:  { dec: 1, unitText: 'kg', perDay: 1, daily: true, tone: 'lime' },
    fat:     { dec: 1, unitText: '%', perDay: 1, daily: true, tone: 'orange' }
  };
  var ICONS = {
    steps: '<path d="M7 4c1.7 0 2.5 1.8 2.5 4.5S8.7 13 7.5 13 5 11.5 5 8.5 5.5 4 7 4zM17 6c1.5 0 2 1.5 2 4.5S17.7 15 16.5 15s-2-1.800-2-4.500S15.300 6 17 6z"/><path d="M6 16h3M15 18h3"/>',
    heart: '<path d="M12 20S4 15 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 15 12 20 12 20z"/>',
    sleep: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    glucose: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    bp: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
    weight: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0M12 9.5l1.5-1.5"/>',
    fat: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
    chart: '<path d="M4 19h16M4 15l4-5 4 3 4-7 4 4"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[n] + '</svg>';
  }
  function hash(a, b) {   /* 0..1, stable */
    var h = (Math.imul(a | 0, 2654435761) ^ Math.imul((b | 0) + 0x9e3779b9, 2246822507)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function bump(h, at, width) { var d = Math.min(Math.abs(h - at), 24 - Math.abs(h - at)); return Math.exp(-(d * d) / (2 * width * width)); }
  /* value for one absolute hour index H (hours since epoch, local clock used for the time of day) */
  function hourly(scope, H) {
    var h = new Date(H * HOUR).getHours(), r = hash(H, scope.length * 131), day = Math.floor(H / 24);
    if (scope === 'steps') {
      if (h < 6 || h > 22) return Math.round(r * 30);
      return Math.round(120 + 760 * bump(h, 8, 1.3) + 520 * bump(h, 13, 1.4) + 880 * bump(h, 18, 1.6) + r * 240 + hash(day, 7) * 120);
    }
    if (scope === 'heart') return Math.round(56 + 9 * bump(h, 8, 1.5) + 8 * bump(h, 13, 2) + 16 * bump(h, 18, 1.8) + 6 * bump(h, 15, 5) + r * 5);
    /* glucose: three meal peaks */
    return 4.7 + 1.5 * bump(h, 8, 1.1) + 1.9 * bump(h, 13.5, 1.2) + 1.7 * bump(h, 20.5, 1.3) + (r - 0.5) * 0.3 + (hash(day, 11) - 0.5) * 0.3;
  }
  /* value for one day index D (days since epoch); upTo = last hour index included (today is partial) */
  function daily(scope, D, upTo) {
    var r = hash(D, scope.length * 977), i, v = 0, n = 0;
    if (scope === 'steps' || scope === 'heart' || scope === 'glucose') {
      var H0 = Math.floor(new Date(D * DAY).setHours(0, 0, 0, 0) / HOUR);   /* local midnight of that day */
      for (i = 0; i < 24; i++) { if (H0 + i > upTo) break; v += hourly(scope, H0 + i); n++; }
      return scope === 'steps' ? v : (n ? v / n : hourly(scope, upTo));
    }
    if (scope === 'sleep') return 6.1 + r * 1.9;
    if (scope === 'weight') return 69.4 - (D % 60) * 0.018 + (r - 0.5) * 0.5;
    if (scope === 'fat') return 24.6 - (D % 60) * 0.012 + (r - 0.5) * 0.5;
    return [Math.round(113 + r * 14 + 3 * Math.sin(D / 3)), Math.round(72 + hash(D, 4099) * 11)];   /* bp: [sys, dia] */
  }
  function nowIdx() { var n = Date.now(); return { H: Math.floor(n / HOUR), D: Math.floor((n - new Date(n).getTimezoneOffset() * 6e4) / DAY) }; }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function dayLabel(D, long) {
    var d = new Date(D * DAY + 12 * HOUR);
    try { return d.toLocaleDateString(locale(), long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' }); } catch (e) { return d.getDate() + '/' + (d.getMonth() + 1); }
  }
  /* -> { x: [labels], full: [long labels], a: [values], b: [second series] | null } */
  function series(scope, range) {
    var m = META[scope], N = nowIdx(), x = [], full = [], a = [], b = m.two ? [] : null, i, v;
    if (range === 'day' && !m.daily) {
      for (i = 23; i >= 0; i--) {
        var H = N.H - i, hh = new Date(H * HOUR).getHours();
        x.push(hh + ' h'); full.push(i === 0 ? t('devx.now') : hh + ' h'); a.push(hourly(scope, H));
      }
    } else {
      var n = range === 'month' ? 30 : 7;
      for (i = n - 1; i >= 0; i--) {
        v = daily(scope, N.D - i, N.H);
        x.push(dayLabel(N.D - i)); full.push(i === 0 ? t('devx.today') : dayLabel(N.D - i, true));
        if (m.two) { a.push(v[0]); b.push(v[1]); } else a.push(v);
      }
    }
    return { x: x, full: full, a: a, b: b };
  }
  function num(v, dec) { try { return Number(v).toLocaleString(locale(), { minimumFractionDigits: dec, maximumFractionDigits: dec }); } catch (e) { return Number(v).toFixed(dec); } }
  function unit(scope) { var m = META[scope]; return m.unitText || t(m.unit); }
  function fmt(scope, v, v2) { var m = META[scope]; return (m.two ? Math.round(v) + '/' + Math.round(v2) : num(v, m.dec)) + ' ' + unit(scope); }
  /* Last value sent: the same text is used by the "Latest readings" card of view-devices.js. */
  function latest(scope) {
    if (!META[scope]) return '';
    var N = nowIdx(), m = META[scope];
    if (scope === 'steps') return fmt(scope, daily('steps', N.D, N.H));
    if (!m.daily) return fmt(scope, hourly(scope, N.H));
    var v = daily(scope, N.D, N.H);
    return m.two ? fmt(scope, v[0], v[1]) : fmt(scope, v);
  }
  /* measurements sent per day for the active scopes, last 7 days */
  function volume(scopes) {
    var N = nowIdx(), frac = (new Date().getHours() + 1) / 24, out = { x: [], full: [], a: [], b: null }, i;
    for (i = 6; i >= 0; i--) {
      var D = N.D - i, n = 0;
      scopes.forEach(function (s) {
        var per = META[s].perDay, got = per <= 2 ? per : Math.round(per * (0.93 + 0.07 * hash(D, s.length * 53)));
        n += i === 0 ? Math.max(per <= 2 ? 1 : 0, Math.round(got * frac)) : got;
      });
      out.x.push(dayLabel(D)); out.full.push(i === 0 ? t('devx.today') : dayLabel(D, true)); out.a.push(n);
    }
    return out;
  }

  /* ---- 3. Chart ----------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function niceScale(lo, hi, dec) {
    if (hi - lo < 1e-9) { hi = lo + 1; }
    var pad = (hi - lo) * 0.18; lo -= pad; hi += pad;
    var p = Math.pow(10, dec); lo = Math.floor(lo * p) / p; hi = Math.ceil(hi * p) / p;
    return { lo: lo, hi: hi };
  }
  /* smooth path through points [[x, y]] in the 0..100 box (Catmull-Rom → cubic Bézier, clamped to the box) */
  function path(pts) {
    var d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2), i, c = function (v) { return Math.max(0, Math.min(100, v)).toFixed(2); };
    for (i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ' ' + c(p1[1] + (p2[1] - p0[1]) / 6) + ' ' +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ' ' + c(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d;
  }
  /* o: { id, s (series), dec, band, zero, tone, label, text(i) -> tooltip text, every (x label step) } */
  function plot(o) {
    var s = o.s, all = s.a.concat(s.b || []), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (o.band) { lo = Math.min(lo, o.band[0]); hi = Math.max(hi, o.band[1]); }
    var sc = o.zero ? { lo: 0, hi: Math.ceil(hi * 1.15) || 1 } : niceScale(lo, hi, o.dec), n = s.a.length;
    var X = function (i) { return n > 1 ? i / (n - 1) * 100 : 50; }, Y = function (v) { return 100 - (v - sc.lo) / (sc.hi - sc.lo) * 100; };
    var pa = s.a.map(function (v, i) { return [X(i), Y(v)]; }), pb = s.b ? s.b.map(function (v, i) { return [X(i), Y(v)]; }) : null;
    var da = path(pa), grid = '', ylab = '', xlab = '', i;
    for (i = 0; i <= 3; i++) {
      grid += '<line class="vdx-grid" x1="0" x2="100" y1="' + (i * 100 / 3).toFixed(2) + '" y2="' + (i * 100 / 3).toFixed(2) + '"/>';
      ylab += '<span>' + esc(num(sc.hi - (sc.hi - sc.lo) * i / 3, o.dec)) + '</span>';
    }
    var step = o.every || Math.ceil(n / 6);
    for (i = 0; i < n; i++) if ((n - 1 - i) % step === 0) xlab += '<span style="left:' + X(i).toFixed(2) + '%">' + esc(s.x[i]) + '</span>';
    var band = o.band ? '<rect class="vdx-band" x="0" width="100" y="' + Y(o.band[1]).toFixed(2) + '" height="' + (Y(o.band[0]) - Y(o.band[1])).toFixed(2) + '"/>' : '';
    var pts = JSON.stringify({ a: pa.map(function (p) { return [+p[0].toFixed(2), +p[1].toFixed(2)]; }), b: pb ? pb.map(function (p) { return [+p[0].toFixed(2), +p[1].toFixed(2)]; }) : null, tx: s.a.map(function (_, k) { return o.text(k); }) });
    var last = n - 1;
    return '<div class="vdx-plot vdx-tone--' + o.tone + '" data-vdx-plot="' + o.id + '">' +
      '<div class="vdx-y" aria-hidden="true">' + ylab + '</div>' +
      '<div class="vdx-area" tabindex="0" role="img" aria-label="' + esc(o.label) + '" data-vdx-pts="' + esc(pts) + '">' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + grid + band +
          '<g class="vdx-draw"><path class="vdx-fill" d="' + da + 'L100 100L0 100Z"/><path class="vdx-line" d="' + da + '"/>' +
          (pb ? '<path class="vdx-line vdx-line--b" d="' + path(pb) + '"/>' : '') + '</g></svg>' +
        '<i class="vdx-cursor" style="left:' + pa[last][0] + '%"></i>' +
        '<i class="vdx-dot" style="left:' + pa[last][0] + '%;top:' + pa[last][1].toFixed(2) + '%"></i>' +
        (pb ? '<i class="vdx-dot vdx-dot--b" style="left:' + pb[last][0] + '%;top:' + pb[last][1].toFixed(2) + '%"></i>' : '') +
      '</div>' +
      '<div class="vdx-x" aria-hidden="true">' + xlab + '</div>' +
      '<output class="vdx-tip" aria-live="polite">' + esc(o.text(last)) + '</output>' +
      '</div>';
  }
  function spark(vals) {
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), n = vals.length;
    var pts = vals.map(function (v, i) { return [i / (n - 1) * 100, 88 - (hi - lo < 1e-9 ? 0.5 : (v - lo) / (hi - lo)) * 76]; });
    return '<svg class="vdx-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="' + path(pts) + '"/></svg>';
  }

  /* ---- 4. Template --------------------------------------------------------- */
  var state = { scope: null, range: 'day', drawn: '' };
  function time(ts) { try { return new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return new Date(ts).toTimeString().slice(0, 5); } }
  function template(sent) {
    var head = '<header class="vd-card__head"><span class="vh-ico">' + ico('send') + '</span><div class="vdx-head"><h3>' + esc(t('devx.title')) + '</h3>' +
      '<p class="vdx-sub">' + esc(t('devx.sub')) + '</p></div><span class="pill vd-demo">' + esc(t('devices.demo')) + '</span></header>';
    if (!sent.length) return head + '<p class="vd-empty">' + esc(t('devx.empty')) + '</p>';
    var cur = sent.filter(function (s) { return s.scope === state.scope; })[0] || sent[0];
    state.scope = cur.scope;
    var m = META[cur.scope], range = (m.daily && state.range === 'day') ? 'week' : state.range;
    var s = series(cur.scope, range), name = t('devices.scope.' + cur.scope);
    var tiles = sent.map(function (x) {
      var wk = series(x.scope, 'week');
      return '<button type="button" class="vdx-tile vdx-tone--' + META[x.scope].tone + (x.scope === cur.scope ? ' is-active' : '') + '" data-vdx-scope="' + x.scope + '" aria-pressed="' + (x.scope === cur.scope) + '">' +
        '<span class="vdx-tile__ico">' + ico(x.scope) + '</span><span class="vdx-tile__txt"><span>' + esc(t('devices.scope.' + x.scope)) + '</span><b>' + esc(latest(x.scope)) + '</b></span>' + spark(wk.a) + '</button>';
    }).join('');
    var ranges = ['day', 'week', 'month'].map(function (r) {
      var off = r === 'day' && m.daily;
      return '<button type="button" class="vdx-seg' + (r === range ? ' is-active' : '') + '" data-vdx-range="' + r + '" aria-pressed="' + (r === range) + '"' + (off ? ' disabled' : '') + '>' + esc(t('devx.range.' + r)) + '</button>';
    }).join('');
    var mn = Math.min.apply(null, s.a), mx = Math.max.apply(null, s.a), sum = s.a.reduce(function (a, b) { return a + b; }, 0), avg = sum / s.a.length;
    var one = function (k, v, v2) { return '<li><span>' + esc(t('devx.stat.' + k)) + '</span><b>' + esc(fmt(cur.scope, v, v2)) + '</b></li>'; };
    var stats;
    if (m.two) {
      var bmn = Math.min.apply(null, s.b), bmx = Math.max.apply(null, s.b), bavg = s.b.reduce(function (a, b) { return a + b; }, 0) / s.b.length;
      stats = one('last', s.a[s.a.length - 1], s.b[s.b.length - 1]) + one('min', mn, bmn) + one('avg', avg, bavg) + one('max', mx, bmx);
    } else {
      stats = one('last', s.a[s.a.length - 1]) + one('min', mn) + one('avg', avg) + one('max', mx) + (m.sum ? one('total', sum) : '');
    }
    var legend = m.two ? '<ul class="vdx-legend"><li><i></i>' + esc(t('devx.sys')) + '</li><li class="is-b"><i></i>' + esc(t('devx.dia')) + '</li></ul>'
      : (m.band ? '<ul class="vdx-legend"><li class="is-band"><i></i>' + esc(t('devx.band')) + ' · ' + esc(num(m.band[0], m.dec) + '–' + num(m.band[1], m.dec) + ' ' + unit(cur.scope)) + '</li></ul>' : '');
    var main = plot({
      id: 'main', s: s, dec: m.dec, band: m.band, zero: !!m.sum, tone: m.tone,
      label: t('devx.chart', { name: name, range: t('devx.range.' + range) }),
      text: function (i) { return s.full[i] + ' · ' + (m.two ? fmt(cur.scope, s.a[i], s.b[i]) : fmt(cur.scope, s.a[i])); },
      every: range === 'day' ? 6 : range === 'month' ? 6 : 1
    });
    var vol = volume(sent.map(function (x) { return x.scope; })), vt = vol.a.reduce(function (a, b) { return a + b; }, 0);
    var volPlot = plot({
      id: 'vol', s: vol, dec: 0, zero: true, tone: 'blue', label: t('devx.vol.title') + '. ' + t('devx.vol.sub'),
      text: function (i) { return vol.full[i] + ' · ' + num(vol.a[i], 0); }, every: 2
    });
    return head +
      '<div class="vdx-tiles" role="group" aria-label="' + esc(t('devx.types')) + '">' + tiles + '</div>' +
      '<div class="vdx-body">' +
        '<section class="vdx-panel vdx-panel--main">' +
          '<div class="vdx-panel__head"><div><h4>' + esc(name) + '</h4><p>' + esc(t('devx.from', { name: t('devices.d.' + cur.device), time: time(cur.last) })) + '</p></div>' +
            '<div class="vdx-segs" role="group" aria-label="' + esc(t('devx.range')) + '">' + ranges + '</div></div>' +
          main + legend +
          '<ul class="vdx-stats">' + stats + '</ul>' +
        '</section>' +
        '<section class="vdx-panel vdx-panel--vol">' +
          '<div class="vdx-panel__head"><div><h4>' + esc(t('devx.vol.title')) + '</h4><p>' + esc(t('devx.vol.sub')) + '</p></div></div>' +
          volPlot +
          '<p class="vdx-total">' + ico('chart') + '<span>' + esc(t('devx.vol.total', { n: num(vt, 0) })) + '</span></p>' +
        '</section>' +
      '</div>' +
      '<p class="vdx-note">' + esc(t('devx.note')) + '</p>';
  }
  function mount() {
    var slot = doc.getElementById('vdData');
    if (!slot) return;
    var sent = host.sent();
    /* the curves are drawn (animated) when the data changes, not on every re-render of the page */
    var key = sent.map(function (s) { return s.scope + s.last; }).join('|') + '/' + state.scope + '/' + state.range + '/' + I18N.lang;
    slot.innerHTML = template(sent);
    slot.classList.toggle('is-still', key === state.drawn);
    state.drawn = sent.map(function (s) { return s.scope + s.last; }).join('|') + '/' + state.scope + '/' + state.range + '/' + I18N.lang;
  }

  /* ---- 5. Events ------------------------------------------------------------ */
  function point(area, i) {
    var data; try { data = JSON.parse(area.getAttribute('data-vdx-pts')); } catch (e) { return; }
    i = Math.max(0, Math.min(data.a.length - 1, i));
    area.setAttribute('data-vdx-i', i);
    var cur = area.querySelector('.vdx-cursor'), dots = area.querySelectorAll('.vdx-dot'), tip = area.parentNode.querySelector('.vdx-tip');
    if (cur) cur.style.left = data.a[i][0] + '%';
    if (dots[0]) { dots[0].style.left = data.a[i][0] + '%'; dots[0].style.top = data.a[i][1] + '%'; }
    if (dots[1] && data.b) { dots[1].style.left = data.b[i][0] + '%'; dots[1].style.top = data.b[i][1] + '%'; }
    if (tip) tip.textContent = data.tx[i];
  }
  function fromPointer(ev) {
    var area = ev.target.closest && ev.target.closest('.vdx-area');
    if (!area || !root.contains(area)) return;
    var r = area.getBoundingClientRect(), n; try { n = JSON.parse(area.getAttribute('data-vdx-pts')).a.length; } catch (e) { return; }
    point(area, Math.round((ev.clientX - r.left) / (r.width || 1) * (n - 1)));
  }
  root.addEventListener('pointermove', fromPointer);
  root.addEventListener('pointerdown', fromPointer);
  root.addEventListener('keydown', function (ev) {
    var area = ev.target.closest && ev.target.closest('.vdx-area');
    if (!area || (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight' && ev.key !== 'Home' && ev.key !== 'End')) return;
    var n; try { n = JSON.parse(area.getAttribute('data-vdx-pts')).a.length; } catch (e) { return; }
    var i = area.hasAttribute('data-vdx-i') ? +area.getAttribute('data-vdx-i') : n - 1;
    point(area, ev.key === 'Home' ? 0 : ev.key === 'End' ? n - 1 : i + (ev.key === 'ArrowLeft' ? -1 : 1));
    ev.preventDefault();
  });
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-vdx-scope], [data-vdx-range]');
    if (!b || !root.contains(b) || b.disabled) return;
    var sel;
    if (b.hasAttribute('data-vdx-scope')) { state.scope = b.getAttribute('data-vdx-scope'); sel = '[data-vdx-scope="' + state.scope + '"]'; }
    else { state.range = b.getAttribute('data-vdx-range'); sel = '[data-vdx-range="' + state.range + '"]'; }
    mount();
    var next = root.querySelector(sel); if (next) { try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); } }
  });

  global.NutriBentoViews.devicesData = {
    mount: mount, latest: latest, series: series,
    state: function () { return { scope: state.scope, range: state.range }; },
    select: function (scope, range) { if (META[scope]) state.scope = scope; if (range) state.range = range; mount(); }
  };
  if (host.render) host.render(); else mount();
})(window);
