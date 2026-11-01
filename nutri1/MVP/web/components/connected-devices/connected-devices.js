/* ============================================================================
 * NUTRI.N°1 — CONNECTED DEVICES LAB (#devices)
 * ----------------------------------------------------------------------------
 * Immersive simulation of the device connection + background synchronisation
 * journey: BLE discovery → secure pairing → granular consent → first import →
 * live telemetry → ingestion pipeline → clinical alerts → sync history.
 *
 * Design rules
 *   • Mounted in a Shadow DOM: no global CSS, no global MutationObserver and no
 *     interference with the platform's versioned layers (V39…V58) or with the
 *     v28/v29 text translators.
 *   • Additive only: the legacy globals connectDevice() and runSync() are
 *     re-routed to this engine so every existing onclick keeps working.
 *   • No external dependency (no Chart.js): the live chart is hand-drawn SVG.
 * ========================================================================== */
(function () {
  'use strict';

  var DATA = window.NUTRI_DEVICES_SIM_DATA;
  var I18N = window.NUTRI_DEVICES_SIM_I18N;
  if (!DATA || !I18N) { console.warn('[devices-sim] data/i18n bundle missing'); return; }

  var host = document.getElementById('devicesSim');
  if (!host) return;
  if (host.shadowRoot || host.dataset.devsimMounted === '1') return;
  host.dataset.devsimMounted = '1';

  var shadow = host.attachShadow({ mode: 'open' });
  var CSS_HREF = 'components/connected-devices/connected-devices.css';
  var T = function (k, p) { return I18N.t(k, p); };
  var L = function (o) { return I18N.loc(o); };
  var H = DATA.helpers;
  var SCOPES = DATA.scopes;
  var SECTION = host.closest('section') || host.parentElement;

  /* ------------------------------------------------------------------ util -- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel) { return shadow.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(shadow.querySelectorAll(sel)); }
  function setText(el, txt) { if (el && el.textContent !== txt) el.textContent = txt; }
  function setHtml(el, html) { if (el) el.innerHTML = html; }
  function hhmmss(d) {
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(function (n) { return String(n).padStart(2, '0'); }).join(':');
  }
  function hhmm(d) {
    return [d.getHours(), d.getMinutes()]
      .map(function (n) { return String(n).padStart(2, '0'); }).join(':');
  }
  function relTime(ts) {
    if (!ts) return T('kpi.never');
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 4) return T('kpi.now');
    if (s < 60) return T('kpi.ago', { s: s });
    return T('kpi.agoMin', { m: Math.round(s / 60) });
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  /* Timers we own — two buckets so closing the pairing dialog never kills a
     running guided demo (and vice-versa). */
  var sessionTimers = [];
  var sessionIntervals = [];
  var modalTimers = [];
  var modalIntervals = [];

  function schedule(bucket, fn, ms) {
    var id = setTimeout(function () {
      var i = bucket.indexOf(id);
      if (i > -1) bucket.splice(i, 1);
      try { fn(); } catch (err) { console.error('[devices-sim]', err); }
    }, ms);
    bucket.push(id);
    return id;
  }
  function later(fn, ms) { return schedule(sessionTimers, fn, ms); }
  function laterModal(fn, ms) { return schedule(modalTimers, fn, ms); }
  function trackInterval(id) { modalIntervals.push(id); return id; }

  function clearTimers() {
    sessionTimers.forEach(clearTimeout);
    sessionTimers = [];
    sessionIntervals.forEach(clearInterval);
    sessionIntervals = [];
    clearModalTimers();
  }
  function clearModalTimers() {
    modalTimers.forEach(clearTimeout);
    modalTimers = [];
    modalIntervals.forEach(clearInterval);
    modalIntervals = [];
  }

  function toast(msg) {
    var box = $('#dsToast');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'ds-toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 320);
    }, 2400);
  }

  /* ---------------------------------------------------------- gateway info -- */
  function gatewayInfo() {
    var code = 'TG';
    try {
      var sel = document.getElementById('country');
      if (sel && sel.value && DATA.gateways[sel.value]) code = sel.value;
    } catch (e) { /* keep default */ }
    var g = DATA.gateways[code] || DATA.gateways.TG;
    return { code: code, city: g.city, flag: g.flag };
  }

  /* ----------------------------------------------------------------- state -- */
  function newState() {
    var state = {
      devices: DATA.devices.map(DATA.instantiate),
      consent: {},
      gen: DATA.createGenerators(),
      series: { glucose: [], hr: [] },
      counters: { received: 0, normalized: 0, rejected: 0, stored: 0 },
      readings: 0,
      syncs: { ok: 0, fail: 0 },
      latencies: [38, 44, 41, 47],
      lastSyncAt: null,
      hr: null,
      spo2: 97.6,
      steps: 0,
      sleep: null,
      glucose: null,
      bp: null,
      weight: null,
      notifications: [],
      log: [],
      logFilter: 'all',
      alerts: [],
      history: [],
      paused: false,
      speed: 1,
      autopilot: false,
      autoIndex: 0,
      syncing: false,
      syncPct: 0,
      pipelineStage: -1,
      tick: 0,
      cooldown: {},
      gateway: gatewayInfo(),
      sessionId: 'NG-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      startedAt: Date.now(),
      autoStarted: false,
      logSeq: 0,
      alertSeq: 0
    };
    SCOPES.forEach(function (s) { state.consent[s.id] = true; });
    return state;
  }
  var S = newState();

  var STATUS_RANK = {
    offline: 0, error: 0, discovering: 1, pairing: 2, consenting: 3,
    importing: 4, connected: 5, syncing: 5
  };
  function isLive(d) { return d.status === 'connected' || d.status === 'syncing' || d.status === 'importing'; }
  function isBusy(d) { return STATUS_RANK[d.status] > 0 && STATUS_RANK[d.status] < 5; }
  function connectedDevices() { return S.devices.filter(function (d) { return d.status === 'connected' || d.status === 'syncing'; }); }

  /* -------------------------------------------------------------- log/toast - */
  function log(kind, key, params) {
    var entry = { id: ++S.logSeq, kind: kind, key: key, params: params || {}, at: Date.now() };
    S.log.unshift(entry);
    if (S.log.length > 70) S.log.length = 70;
    renderLog();
    return entry;
  }
  function logText(e) { return T(e.key, e.params); }

  /* ----------------------------------------------------------------- SHELL -- */
  function shellHtml() {
    return '' +
      '<link rel="stylesheet" href="' + CSS_HREF + '">' +
      '<div class="ds-root">' +

      /* ---------------- HUD ---------------- */
      '<div class="ds-hud">' +
        '<div class="ds-hud-main">' +
          '<div class="ds-hud-title"><span class="ds-led"></span>' +
            '<span data-i18n-ds="hud.title">Session de synchronisation sécurisée</span>' +
            '<span class="ds-chip" data-i18n-ds="hud.live">LIVE</span>' +
          '</div>' +
          '<div class="ds-hud-meta">' +
            '<span data-i18n-ds="hud.gateway">Passerelle</span>' +
            '<span class="ds-val" id="dsGateway">—</span>' +
            '<span>🔒 <span data-i18n-ds="hud.crypto">TLS 1.3 · AES-256</span></span>' +
            '<span><span data-i18n-ds="hud.latency">Latence</span> <b class="ds-val" id="dsLatency">—</b> ms</span>' +
            '<span><span data-i18n-ds="hud.uptime">Session</span> <b class="ds-val" id="dsUptime">00:00</b></span>' +
            '<span>ID <b class="ds-val" id="dsSessionId">—</b></span>' +
            '<span class="ds-val" id="dsClock">--:--:--</span>' +
          '</div>' +
        '</div>' +
        '<div class="ds-hud-actions">' +
          '<button class="ds-btn on-light" data-act="autopilot" id="dsAutoBtn">▶ Démo guidée</button>' +
          '<button class="ds-btn on-light" data-act="pause" id="dsPauseBtn">⏸ Pause</button>' +
          '<span class="ds-speed"><label for="dsSpeed" data-i18n-ds="hud.speed">Vitesse</label>' +
            '<select id="dsSpeed" data-act="speed"><option value="1">×1</option><option value="2">×2</option><option value="4">×4</option></select>' +
          '</span>' +
          '<button class="ds-btn on-light" data-act="reset" data-i18n-ds="hud.reset">⟲ Réinitialiser</button>' +
        '</div>' +
        '<div class="ds-hud-status"><span class="ds-dot"></span><span id="dsStatusLine">—</span></div>' +
      '</div>' +

      /* ---------------- KPIs ---------------- */
      '<div class="ds-kpis" id="dsKpis"></div>' +

      /* ---------------- devices + monitor ---------------- */
      '<div class="ds-cols two">' +
        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="cat.title">Appareils & plateformes de santé</h3>' +
            '<p class="ds-hint" data-i18n-ds="cat.hint">Protocole d’appairage sécurisé.</p>' +
          '</div><span class="ds-count" id="dsDeviceCount">0/6</span></div>' +
          '<div class="ds-devices" id="dsDevices"></div>' +
        '</section>' +

        '<section class="ds-panel ds-monitor">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="live.title">Moniteur temps réel</h3>' +
            '<p class="ds-hint" data-i18n-ds="live.hint">Flux via passerelle chiffrée.</p>' +
          '</div><span class="ds-count" id="dsMonitorState">—</span></div>' +

          '<div class="ds-watch">' +
            '<div class="ds-watch-top"><span data-i18n-ds="live.device">Montre connectée</span><span id="dsWatchClock">--:--</span></div>' +
            '<div class="ds-watch-bpm"><span class="ds-watch-heart">❤️</span><b id="dsBpm">--</b>' +
              '<span data-i18n-ds="live.bpm">bpm</span></div>' +
            '<svg class="ds-ecg" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true">' +
              '<polyline id="dsEcg" points=""></polyline>' +
            '</svg>' +
            '<div class="ds-watch-foot">' +
              '<span>SpO₂ <b id="dsSpo2">--</b> %</span>' +
              '<span>🔋 <b id="dsWatchBattery">--</b> %</span>' +
              '<span id="dsWatchSignal">⌁ —</span>' +
            '</div>' +
          '</div>' +

          '<div class="ds-vitals" id="dsVitals"></div>' +
          '<div class="ds-phone" id="dsPhone"></div>' +
          '<p class="ds-empty-note" id="dsMonitorEmpty" data-i18n-ds="live.waiting">Aucun appareil connecté.</p>' +
        '</section>' +
      '</div>' +

      /* ---------------- chart + pipeline ---------------- */
      '<div class="ds-cols chart">' +
        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="chart.title">Flux normalisé</h3>' +
            '<p class="ds-hint" data-i18n-ds="chart.hint">Glycémie et fréquence cardiaque.</p>' +
          '</div><span class="ds-count" id="dsChartCount">0</span></div>' +
          '<div class="ds-chart-legend">' +
            '<span><i style="background:#08733f"></i><span data-i18n-ds="chart.glucose">Glycémie (mmol/L)</span></span>' +
            '<span><i style="background:#b96c1b"></i><span data-i18n-ds="chart.hr">Fréquence cardiaque (bpm)</span></span>' +
            '<span><i style="background:#08733f33;height:9px;border-radius:2px"></i><span data-i18n-ds="chart.target">Cible 3,9 – 7,8</span></span>' +
          '</div>' +
          '<div class="ds-chart" id="dsChart"></div>' +
        '</section>' +

        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="pipe.title">Chaîne d’ingestion</h3>' +
            '<p class="ds-hint" data-i18n-ds="pipe.hint">Chaque mesure traverse cinq étapes.</p>' +
          '</div><span class="ds-count" id="dsPipeState">—</span></div>' +
          '<div class="ds-pipeline" id="dsPipeline"></div>' +
          '<div class="ds-counters" id="dsCounters"></div>' +
          '<div style="margin-top:11px">' +
            '<div class="ds-progress"><i id="syncbar"></i></div>' +
            '<div class="ds-progress-label"><span id="syncText">—</span><span id="dsSyncPct">0 %</span></div>' +
            '<button class="ds-btn primary sm" data-act="syncall" style="margin-top:8px">🔄 ' +
              '<span data-i18n-ds="dev.sync">Synchroniser</span></button>' +
          '</div>' +
        '</section>' +
      '</div>' +

      /* ---------------- log + consent ---------------- */
      '<div class="ds-cols log">' +
        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="log.title">Journal de session</h3>' +
            '<p class="ds-hint" data-i18n-ds="log.hint">Chaque événement est horodaté.</p>' +
          '</div><span class="ds-count" id="dsLogCount">0</span></div>' +
          '<div class="ds-filters" id="dsFilters"></div>' +
          '<div class="ds-log" id="dsLog" aria-live="polite"></div>' +
        '</section>' +

        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="consent.title">Consentement & confidentialité</h3>' +
            '<p class="ds-hint" data-i18n-ds="consent.hint">Vous contrôlez chaque catégorie.</p>' +
          '</div></div>' +
          '<div class="ds-scopes" id="dsScopes"></div>' +
          '<div class="ds-retention">' +
            '<div><b data-i18n-ds="consent.retention">Conservation des mesures</b><br>' +
              '<span data-i18n-ds="consent.retentionValue">24 mois</span></div>' +
            '<span>🔐</span>' +
          '</div>' +
          '<div class="ds-consent-actions">' +
            '<button class="ds-btn sm ghost" data-act="revokeall" data-i18n-ds="consent.revokeAll">Tout révoquer</button>' +
            '<button class="ds-btn sm ghost" data-act="restoreall" data-i18n-ds="consent.restoreAll">Tout réautoriser</button>' +
            '<button class="ds-btn sm" data-act="export" data-i18n-ds="consent.export">⭳ Exporter mes données</button>' +
            '<button class="ds-btn sm" data-act="disconnectall" data-i18n-ds="consent.disconnectAll">Déconnecter tous les appareils</button>' +
            '<button class="ds-btn sm danger" data-act="clear" data-i18n-ds="consent.clear">Effacer le journal</button>' +
          '</div>' +
          '<p class="ds-consent-note" data-i18n-ds="consent.note">Retrait possible à tout moment.</p>' +
        '</section>' +
      '</div>' +

      /* ---------------- alerts + history + interop ---------------- */
      '<div class="ds-cols three">' +
        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="alerts.title">Alertes cliniques & techniques</h3>' +
            '<p class="ds-hint" data-i18n-ds="alerts.hint">Détection automatique.</p>' +
          '</div></div>' +
          '<div class="ds-alerts" id="dsAlerts"></div>' +
        '</section>' +
        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="history.title">Historique de synchronisation</h3>' +
            '<p class="ds-hint" data-i18n-ds="history.hint">Traçabilité des imports.</p>' +
          '</div></div>' +
          '<div id="dsHistory"></div>' +
        '</section>' +
        '<section class="ds-panel">' +
          '<div class="ds-panel-head"><div>' +
            '<h3 data-i18n-ds="interop.title">Interopérabilité</h3>' +
            '<p class="ds-hint" data-i18n-ds="interop.hint">Codes LOINC et ressources FHIR.</p>' +
          '</div></div>' +
          '<div class="ds-interop" id="dsInterop"></div>' +
        '</section>' +
      '</div>' +

      /* ---------------- modal ---------------- */
      '<div class="ds-backdrop" id="dsBackdrop">' +
        '<div class="ds-modal" role="dialog" aria-modal="true" aria-labelledby="dsModalTitle" id="dsModal"></div>' +
      '</div>' +
      '<div class="ds-toastbox" id="dsToast" aria-live="polite"></div>' +
      '</div>';
  }

  /* ------------------------------------------------------------ STATIC RENDER */
  function batteryText(dev) {
    if (dev.battery == null) return '🔌 ' + (dev.kind === 'platform' ? 'API' : '—');
    return '🔋 ' + Math.max(0, Math.round(dev.battery)) + ' %';
  }
  function signalBars(n) {
    var out = '<span class="ds-bars" aria-hidden="true">';
    for (var i = 1; i <= 3; i++) out += '<i class="' + (i <= n ? 'on' : '') + '" style="height:' + (3 + i * 2.5) + 'px"></i>';
    return out + '</span>';
  }
  function scopeById(id) {
    for (var i = 0; i < SCOPES.length; i++) if (SCOPES[i].id === id) return SCOPES[i];
    return null;
  }
  function unitOf(scope) {
    if (!scope) return '';
    return typeof scope.unit === 'object' ? L(scope.unit) : scope.unit;
  }
  function valueHtml(dev) {
    if (dev.lastValue == null) return '<span class="ds-empty">' + esc(T('dev.noData')) + '</span>';
    return '<b>' + esc(dev.lastValue) + '</b><span>' + esc(dev.lastUnit) + '</span>' +
      '<span style="margin-left:auto;font-size:10px">' + esc(relTime(dev.lastAt)) + '</span>';
  }
  function deviceCard(dev) {
    var live = isLive(dev);
    var busy = isBusy(dev);
    var cls = 'ds-device' + (live ? ' is-connected' : '') + (busy || dev.status === 'syncing' ? ' is-busy' : '');
    var actions = '';
    if (dev.status === 'offline' || dev.status === 'error') {
      actions = '<button class="ds-btn primary sm" data-act="pair" data-id="' + dev.id + '">🔗 ' +
        esc(T(dev.status === 'error' ? 'dev.reconnect' : 'dev.pair')) + '</button>';
    } else if (busy) {
      actions = '<button class="ds-btn sm" disabled>' + esc(T('dev.' + dev.status)) + '…</button>';
    } else {
      actions = '<button class="ds-btn primary sm" data-act="devsync" data-id="' + dev.id + '">🔄 ' +
        esc(T('dev.sync')) + '</button>' +
        '<button class="ds-btn sm" data-act="disconnect" data-id="' + dev.id + '">' +
        esc(T('dev.disconnect')) + '</button>';
    }
    var prog = (busy || dev.status === 'syncing')
      ? '<div class="ds-bar"><i style="width:' + Math.round(dev.progress || 0) + '%"></i></div>' : '';
    return '<article class="' + cls + '" data-dev="' + dev.id + '">' +
      '<div class="ds-device-top">' +
        '<span class="ds-device-icon" aria-hidden="true">' + dev.icon + '</span>' +
        '<div style="min-width:0">' +
          '<div class="ds-device-name">' + esc(L(dev.name)) + '</div>' +
          '<div class="ds-device-sub">' + esc(dev.vendor) + ' · ' + esc(dev.firmware) + '</div>' +
        '</div>' +
        '<span class="ds-state ' + dev.status + '">' + esc(T('dev.' + dev.status)) + '</span>' +
      '</div>' +
      '<div class="ds-device-meta">' +
        '<span id="dvb-' + dev.id + '">' + batteryText(dev) + '</span>' +
        '<span>' + esc(T('dev.signal')) + ' ' + signalBars(dev.signal) + '</span>' +
        '<span><b id="dvc-' + dev.id + '">' + dev.imported + '</b> ' + esc(T('dev.imported')) + '</span>' +
      '</div>' +
      '<div class="ds-device-value" id="dvv-' + dev.id + '">' + valueHtml(dev) + '</div>' +
      prog +
      '<div class="ds-scope-dots">' + dev.scopes.map(function (id) {
        var s = scopeById(id);
        if (!s) return '';
        return '<i class="' + (S.consent[id] ? 'on' : '') + '" title="' + esc(T('dev.scopes') + ' · ' + L(s.label)) + '">' + s.icon + '</i>';
      }).join('') + '</div>' +
      '<div class="ds-device-actions">' + actions + '</div>' +
      '</article>';
  }
  function renderDevices() {
    var grid = $('#dsDevices');
    if (!grid) return;
    grid.innerHTML = S.devices.map(deviceCard).join('');
    var n = connectedDevices().length;
    setText($('#dsDeviceCount'), n + '/' + S.devices.length);
  }
  function refreshDeviceValues() {
    S.devices.forEach(function (dev) {
      var valueEl = $('#dvv-' + dev.id);
      if (valueEl) valueEl.innerHTML = valueHtml(dev);
      setText($('#dvc-' + dev.id), String(dev.imported));
      var batEl = $('#dvb-' + dev.id);
      if (batEl) batEl.textContent = batteryText(dev);
    });
  }

  function renderKpis() {
    var box = $('#dsKpis');
    if (!box) return;
    var live = connectedDevices().length;
    var latency = Math.round(S.latencies.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, S.latencies.length));
    var total = S.syncs.ok + S.syncs.fail;
    var rate = total ? Math.round((S.syncs.ok / total) * 1000) / 10 : 100;
    box.innerHTML =
      kpi(T('kpi.devices'), live + '/' + S.devices.length, T('kpi.devicesSub', { total: S.devices.length }), true) +
      kpi(T('kpi.readings'), String(S.readings), T('kpi.readingsSub'), true) +
      kpi(T('kpi.lastsync'), relTime(S.lastSyncAt), S.lastSyncAt ? hhmmss(new Date(S.lastSyncAt)) : T('kpi.never'), false) +
      kpi(T('kpi.success'), rate + ' %', T('kpi.syncCount', { n: S.syncs.ok + S.syncs.fail }), true) +
      kpi(T('kpi.latency'), latency + ' ms', 'TLS 1.3', false);

    function kpi(label, value, sub, accent) {
      return '<div class="ds-kpi' + (accent ? ' accent' : '') + '"><small>' + esc(label) + '</small>' +
        '<b>' + esc(value) + '</b><span>' + esc(sub) + '</span></div>';
    }
  }

  function renderVitals() {
    var box = $('#dsVitals');
    if (!box) return;
    var rows = [
      ['glucose', 'live.glucose', S.glucose == null ? '—' : S.glucose.toFixed(1), 'mmol/L'],
      ['bp', 'live.bp', S.bp ? S.bp.sys + '/' + S.bp.dia : '—', 'mmHg'],
      ['weight', 'live.weight', S.weight == null ? '—' : S.weight.toFixed(1), 'kg'],
      ['steps', 'live.steps', S.steps ? S.steps.toLocaleString() : '—', ''],
      ['sleep', 'live.sleep', S.sleep == null ? '—' : S.sleep.toFixed(1), unitOf(scopeById('sleep'))]
    ];
    box.innerHTML = rows.map(function (r) {
      return '<div class="ds-vital"><small>' + esc(T(r[1])) + '</small><b>' + esc(r[2]) +
        (r[3] ? '<em>' + esc(r[3]) + '</em>' : '') + '</b></div>';
    }).join('');
  }

  function renderPhone() {
    var box = $('#dsPhone');
    if (!box) return;
    var n = S.notifications[0];
    if (!n) {
      box.innerHTML = '<span class="ds-phone-ico">🔔</span><div class="ds-phone-txt">' +
        '<b>NUTRI.N°1</b><span>' + esc(T('live.notifEmpty')) + '</span></div>';
      return;
    }
    box.innerHTML = '<span class="ds-phone-ico ds-notif-in">🔔</span><div class="ds-phone-txt ds-notif-in">' +
      '<b>' + esc(T('live.notifTitle')) + ' · ' + hhmm(new Date(n.at)) + '</b>' +
      '<span>' + esc(n.text) + '</span></div>';
  }

  /* ------------------------------------------------------------------ chart -- */
  var CHART = { w: 640, h: 190, l: 30, r: 36, t: 14, b: 22, n: 36, gMin: 2, gMax: 12, hMin: 50, hMax: 130 };
  function chartShell() {
    return '<svg viewBox="0 0 ' + CHART.w + ' ' + CHART.h + '" preserveAspectRatio="none" role="img" aria-label="' +
      esc(T('chart.title')) + '">' +
      '<defs><linearGradient id="dsGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#08733f" stop-opacity=".28"></stop>' +
      '<stop offset="1" stop-color="#08733f" stop-opacity="0"></stop></linearGradient></defs>' +
      '<g id="dsGrid"></g>' +
      '<rect class="ds-band" id="dsBand" x="0" y="0" width="0" height="0"></rect>' +
      '<path class="ds-area" id="dsArea" d=""></path>' +
      '<polyline class="ds-line-h" id="dsChartH" points=""></polyline>' +
      '<polyline class="ds-line-g" id="dsChartG" points=""></polyline>' +
      '<circle class="ds-dot" id="dsLastDot" r="3" cx="-10" cy="-10"></circle>' +
      '<g id="dsAxis"></g>' +
      '</svg>';
  }
  function plotW() { return CHART.w - CHART.l - CHART.r; }
  function plotH() { return CHART.h - CHART.t - CHART.b; }
  function yGlucose(v) {
    var r = H.clamp((v - CHART.gMin) / (CHART.gMax - CHART.gMin), 0, 1);
    return CHART.h - CHART.b - r * plotH();
  }
  function yHr(v) {
    var r = H.clamp((v - CHART.hMin) / (CHART.hMax - CHART.hMin), 0, 1);
    return CHART.h - CHART.b - r * plotH();
  }
  function xAt(i) { return CHART.l + (i / (CHART.n - 1)) * plotW(); }

  function makeChartStatic() {
    var box = $('#dsChart');
    if (!box) return;
    box.innerHTML = chartShell();
    var grid = $('#dsGrid');
    var axis = $('#dsAxis');
    var g = '';
    for (var i = 0; i <= 4; i++) {
      var y = CHART.t + (i / 4) * plotH();
      g += '<line class="ds-grid" x1="' + CHART.l + '" y1="' + y + '" x2="' + (CHART.w - CHART.r) + '" y2="' + y + '"></line>';
    }
    grid.innerHTML = g;
    var labels = [12, 9, 7, 4, 2];
    var hLabels = [130, 110, 90, 70, 50];
    var a = '';
    for (var j = 0; j <= 4; j++) {
      var y2 = CHART.t + (j / 4) * plotH() + 3;
      a += '<text class="ds-axis" x="2" y="' + y2 + '">' + labels[j] + '</text>';
      a += '<text class="ds-axis" x="' + (CHART.w - 24) + '" y="' + y2 + '">' + hLabels[j] + '</text>';
    }
    a += '<text class="ds-axis" x="' + CHART.l + '" y="' + (CHART.h - 6) + '">' + esc(T('chart.now')) + '</text>';
    axis.innerHTML = a;
    var band = $('#dsBand');
    var yTop = yGlucose(DATA.thresholds.glucoseHigh);
    var yBottom = yGlucose(DATA.thresholds.glucoseLow);
    band.setAttribute('x', CHART.l);
    band.setAttribute('width', plotW());
    band.setAttribute('y', yTop);
    band.setAttribute('height', Math.max(0, yBottom - yTop));
  }

  function updateChart() {
    var g = S.series.glucose.slice(-CHART.n);
    var h = S.series.hr.slice(-CHART.n);
    var gp = [], hp = [];
    var gLine = $('#dsChartG'), hLine = $('#dsChartH'), area = $('#dsArea'), dot = $('#dsLastDot');
    if (!gLine) return;
    for (var i = 0; i < g.length; i++) gp.push(xAt(i) + ',' + yGlucose(g[i]).toFixed(1));
    for (var j = 0; j < h.length; j++) hp.push(xAt(j) + ',' + yHr(h[j]).toFixed(1));
    gLine.setAttribute('points', gp.join(' '));
    hLine.setAttribute('points', hp.join(' '));
    /* When the CGM is not paired yet, the area + cursor follow the heart-rate
       series so the panel is never an empty frame. */
    var primary = g.length > 1 ? gp : hp;
    var lastValue = g.length > 1 ? yGlucose(g[g.length - 1]) : yHr(h[h.length - 1]);
    if (primary.length > 1) {
      var base = CHART.h - CHART.b;
      area.setAttribute('d', 'M' + xAt(0) + ',' + base + ' L' + primary.join(' L') +
        ' L' + xAt(primary.length - 1) + ',' + base + ' Z');
      dot.setAttribute('cx', xAt(primary.length - 1));
      dot.setAttribute('cy', lastValue);
      dot.style.display = '';
    } else {
      dot.style.display = 'none';
    }
    setText($('#dsChartCount'), String(S.readings));
    if (primary.length < 2) {
      var el = $('#dsChart');
      if (el && !el.querySelector('.ds-chart-empty')) {
        var note = document.createElement('div');
        note.className = 'ds-chart-empty ds-empty-note';
        note.textContent = T('chart.empty');
        note.style.marginTop = '10px';
        el.appendChild(note);
      }
    } else {
      var old = $('#dsChart .ds-chart-empty');
      if (old) old.remove();
    }
  }

  /* --------------------------------------------------------------- pipeline -- */
  var STAGES = ['collect', 'gateway', 'consent', 'normalize', 'graph'];
  function renderPipeline() {
    var box = $('#dsPipeline');
    if (!box) return;
    box.className = 'ds-pipeline' + (S.syncPct > 0 && S.syncPct < 100 ? ' is-running' : '');
    var icons = ['📶', '🔐', '🛡️', '🧬', '🗂️'];
    var html = '';
    STAGES.forEach(function (st, i) {
      var active = S.pipelineStage === i;
      var done = S.pipelineStage > i || (S.syncPct >= 100 && S.pipelineStage === -1);
      html += '<div class="ds-stage' + (active ? ' is-active' : '') + (done && !active ? ' is-done' : '') + '">' +
        '<span class="ds-stage-ico">' + icons[i] + '</span>' +
        '<span class="ds-stage-name">' + esc(T('pipe.stage.' + st)) + '</span>' +
        '<span class="ds-stage-count">' + (active ? '⏳ ' + esc(T('pipe.running')) : (done ? '✓' : '')) + '</span>' +
        '</div>';
      if (i < STAGES.length - 1) {
        html += '<div class="ds-link"><i></i><i></i><i></i></div>';
      }
    });
    box.innerHTML = html;
    var c = S.counters;
    setHtml($('#dsCounters'),
      counter(c.received, 'pipe.received') + counter(c.normalized, 'pipe.normalized') +
      counter(c.rejected, 'pipe.rejected') + counter(c.stored, 'pipe.stored'));
    setText($('#dsPipeState'), S.pipelineStage >= 0 ? T('pipe.running') : T('pipe.idle'));

    function counter(v, key) {
      return '<div class="ds-counter"><b>' + v + '</b><small>' + esc(T(key)) + '</small></div>';
    }
  }

  /* -------------------------------------------------------------------- log -- */
  var KINDS = ['all', 'data', 'security', 'alert', 'consent', 'system'];
  var KIND_ICON = { data: '📈', security: '🔐', alert: '⚠️', consent: '🛡️', system: '⚙️' };
  function renderFilters() {
    var box = $('#dsFilters');
    if (!box) return;
    box.innerHTML = KINDS.map(function (k) {
      return '<button class="ds-filter' + (S.logFilter === k ? ' on' : '') + '" data-act="filter" data-id="' + k + '">' +
        esc(T('log.filter.' + k)) + '</button>';
    }).join('');
  }
  function renderLog() {
    var box = $('#dsLog');
    if (!box) return;
    var items = S.log.filter(function (e) { return S.logFilter === 'all' || e.kind === S.logFilter; }).slice(0, 60);
    var keep = box.scrollTop;
    if (!items.length) {
      box.innerHTML = '<div class="ds-log-empty">' + esc(T('log.empty')) + '</div>';
    } else {
      box.innerHTML = items.map(function (e) {
        return '<div class="ds-entry k-' + e.kind + '">' +
          '<span class="ds-entry-ico" aria-hidden="true">' + KIND_ICON[e.kind] + '</span>' +
          '<div class="ds-entry-body"><p>' + esc(logText(e)) + '</p><time>' + hhmmss(new Date(e.at)) + '</time></div>' +
          '</div>';
      }).join('');
    }
    box.scrollTop = keep;
    setText($('#dsLogCount'), T('log.count', { n: S.log.length }));
  }

  /* ------------------------------------------------------------------ scopes -- */
  function renderScopes() {
    var box = $('#dsScopes');
    if (!box) return;
    box.innerHTML = SCOPES.map(function (s) {
      var on = !!S.consent[s.id];
      return '<div class="ds-scope">' +
        '<span class="ds-scope-ico" aria-hidden="true">' + s.icon + '</span>' +
        '<span class="ds-scope-txt"><b>' + esc(L(s.label)) + '</b>' +
        '<small>' + (on ? esc(unitOf(s) + ' · LOINC ' + s.loinc) : esc(T('consent.blocked'))) + '</small></span>' +
        '<span class="ds-switch"><input type="checkbox" data-act="scope" data-id="' + s.id + '"' +
        (on ? ' checked' : '') + ' aria-label="' + esc(L(s.label)) + '"><span></span></span>' +
        '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------------ alerts -- */
  function renderAlerts() {
    var box = $('#dsAlerts');
    if (!box) return;
    if (!S.alerts.length) {
      box.innerHTML = '<div class="ds-table-empty">' + esc(T('alerts.empty')) + '</div>';
      return;
    }
    box.innerHTML = S.alerts.slice(0, 8).map(function (a) {
      var sev = a.severity || 'tech';
      return '<div class="ds-alert ' + sev + (a.resolved ? ' is-resolved' : '') + '">' +
        '<div class="ds-alert-top"><b>' + esc(T(a.titleKey, a.params)) + '</b>' +
        '<span class="ds-alert-tag">' + esc(T(a.resolved ? 'alerts.resolved' : 'alerts.open')) + '</span></div>' +
        (a.recKey ? '<p>' + esc(T(a.recKey)) + '</p>' : '') +
        '<div class="ds-alert-actions">' +
        (a.resolved ? '' :
          '<button class="ds-btn sm ghost" data-act="escalate" data-id="' + a.id + '">' + esc(T('alerts.escalate')) + '</button>' +
          '<button class="ds-btn sm" data-act="resolve" data-id="' + a.id + '">' + esc(T('alerts.resolve')) + '</button>') +
        '<span class="ds-alert-tag" style="margin-left:auto">' + hhmm(new Date(a.at)) + '</span>' +
        '</div></div>';
    }).join('');
  }
  function pushAlert(type, params, severity, titleKey, recKey) {
    var cd = S.cooldown[type] || 0;
    if (cd > S.tick) return;
    S.cooldown[type] = S.tick + (type === 'battery' ? 40 : (type === 'quality' ? 60 : 24));
    S.alerts.unshift({
      id: ++S.alertSeq, type: type, severity: severity, titleKey: titleKey,
      recKey: recKey, params: params || {}, at: Date.now(), resolved: false
    });
    if (S.alerts.length > 20) S.alerts.length = 20;
    log('alert', titleKey, params);
    renderAlerts();
  }

  /* ----------------------------------------------------------------- history -- */
  function pushHistory(label, readings, ms, partial) {
    S.history.unshift({
      at: Date.now(), device: label, readings: readings, ms: ms, partial: !!partial
    });
    if (S.history.length > 12) S.history.length = 12;
    renderHistory();
  }
  function renderHistory() {
    var box = $('#dsHistory');
    if (!box) return;
    if (!S.history.length) {
      box.innerHTML = '<div class="ds-table-empty">' + esc(T('history.empty')) + '</div>';
      return;
    }
    var rows = S.history.slice(0, 7).map(function (h) {
      return '<tr><td>' + hhmmss(new Date(h.at)) + '</td>' +
        '<td>' + esc(h.device) + '</td>' +
        '<td><b>' + h.readings + '</b></td>' +
        '<td>' + h.ms + ' ms</td>' +
        '<td><span class="ds-badge' + (h.partial ? ' partial' : '') + '">' +
        esc(T(h.partial ? 'history.partial' : 'history.ok')) + '</span></td></tr>';
    }).join('');
    box.innerHTML = '<table class="ds-table"><thead><tr>' +
      ['history.time', 'history.device', 'history.readings', 'history.duration', 'history.status']
        .map(function (k) { return '<th>' + esc(T(k)) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ----------------------------------------------------------------- interop -- */
  function renderInterop() {
    var box = $('#dsInterop');
    if (!box) return;
    box.innerHTML = DATA.interop.map(function (r) {
      return '<div class="ds-interop-row">' +
        '<span>' + esc(L(r.label)) + '</span>' +
        '<span class="ds-loinc">' + r.loinc + '</span>' +
        '<span class="ds-fhir">' + esc(r.resource) + '</span></div>';
    }).join('');
  }

  /* ---------------------------------------------------------------- HUD/misc -- */
  function updateHud() {
    var live = connectedDevices().length;
    setText($('#dsGateway'), S.gateway.flag + ' ' + S.gateway.city + ' · ' + S.gateway.code);
    var latency = Math.round(S.latencies.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, S.latencies.length));
    setText($('#dsLatency'), String(latency));
    var up = Math.floor((Date.now() - S.startedAt) / 1000);
    setText($('#dsUptime'), pad(Math.floor(up / 60)) + ':' + pad(up % 60));
    setText($('#dsClock'), hhmmss(new Date()));
    setText($('#dsSessionId'), S.sessionId);
    var status;
    if (S.autopilot) status = T('hud.autopilot', { n: Math.min(S.autoIndex, S.devices.length), total: S.devices.length });
    else if (S.paused) status = T('hud.paused');
    else if (!live) status = T('hud.idle');
    else status = T('hud.ready', { n: live });
    setText($('#dsStatusLine'), status);
    setText($('#dsAutoBtn'), S.autopilot ? T('hud.guidedStop') : T('hud.guided'));
    setText($('#dsPauseBtn'), S.paused ? T('hud.resume') : T('hud.pause'));
    setText($('#dsMonitorState'), live ? live + '/' + S.devices.length : '0/' + S.devices.length);
    /* keep the idle label localised without erasing the "sync complete" message */
    if (!S.syncing && S.syncPct === 0 && Date.now() - (S.syncDoneAt || 0) > 3000) {
      setSyncBar(0, T('pipe.idle'));
    }
    var empty = $('#dsMonitorEmpty');
    if (empty) empty.style.display = live ? 'none' : 'block';
  }

  /* ---------------------------------------------------------------- sensors -- */
  /* Explicit per-category sampler (keeps display + numeric value together). */
  function readScope(scope) {
    switch (scope) {
      case 'heart': var hr = S.gen.heart(); return { value: hr, unit: 'bpm', display: String(hr) };
      case 'glucose': var g = S.gen.glucose(); return { value: g, unit: 'mmol/L', display: g.toFixed(1) };
      case 'bp': var bp = S.gen.bp(); return { value: bp.sys, unit: 'mmHg', display: bp.sys + '/' + bp.dia, extra: bp };
      case 'weight': var w = S.gen.weight(); return { value: w, unit: 'kg', display: w.toFixed(1) };
      case 'steps': var st = S.gen.steps(); return { value: st, unit: unitOf(scopeById('steps')), display: st.toLocaleString() };
      case 'sleep': var sl = S.gen.sleep(); return { value: sl, unit: unitOf(scopeById('sleep')), display: sl.toFixed(1) };
      default: return null;
    }
  }
  function applyReading(scope, r, dev) {
    switch (scope) {
      case 'heart':
        S.hr = r.value; S.spo2 = S.gen.spo2();
        S.series.hr.push(r.value);
        if (S.series.hr.length > CHART.n * 2) S.series.hr.shift();
        break;
      case 'glucose':
        S.glucose = r.value;
        S.series.glucose.push(r.value);
        if (S.series.glucose.length > CHART.n * 2) S.series.glucose.shift();
        if (r.value < DATA.thresholds.glucoseLow) {
          pushAlert('hypo', { v: r.value.toFixed(1) }, 'critical', 'alert.hypo', 'alert.rec.hypo');
        } else if (r.value > DATA.thresholds.glucoseCriticalHigh) {
          pushAlert('hyper', { v: r.value.toFixed(1) }, 'critical', 'alert.hyper', 'alert.rec.hyper');
        }
        break;
      case 'bp':
        S.bp = r.extra;
        if (r.extra.sys >= DATA.thresholds.sysHigh || r.extra.dia >= DATA.thresholds.diaHigh) {
          pushAlert('bp', { v: r.extra.sys + '/' + r.extra.dia }, 'warn', 'alert.bp', 'alert.rec.bp');
        }
        break;
      case 'weight': S.weight = r.value; break;
      case 'steps': S.steps = r.value; break;
      case 'sleep': S.sleep = r.value; break;
      default: break;
    }
    S.notifications.unshift({
      at: Date.now(),
      text: T('live.notifBody', { v: r.display, u: r.unit })
    });
    if (S.notifications.length > 4) S.notifications.length = 4;
    if (dev) { dev.lastValue = r.display; dev.lastUnit = r.unit; dev.lastAt = Date.now(); }
  }

  /* ------------------------------------------------------------------- tick -- */
  var ECG_LEN = 72;
  var ecgBuf = new Array(ECG_LEN).fill(0);
  var ecgIdx = 0;
  function ecgNext(i) {
    var p = i % 46;
    if (p === 0) return -0.16;
    if (p === 1) return 0.22;
    if (p === 2) return -0.36;
    if (p === 3) return 1;
    if (p === 4) return 0.24;
    if (p === 5) return -0.22;
    if (p === 6) return 0.1;
    if (p === 7) return 0.02;
    return 0.02 * Math.sin(i / 2.6);
  }
  function drawEcg() {
    var line = $('#dsEcg');
    if (!line) return;
    var pts = [];
    for (var i = 0; i < ECG_LEN; i++) {
      var v = ecgBuf[(ecgIdx + i) % ECG_LEN];
      pts.push(((i / (ECG_LEN - 1)) * 300).toFixed(1) + ',' + (44 - v * 30).toFixed(1));
    }
    line.setAttribute('points', pts.join(' '));
  }
  function heartStreaming() {
    return connectedDevices().some(function (d) {
      return S.consent.heart && d.scopes.indexOf('heart') !== -1;
    });
  }
  function tickEcg() {
    if (!heartStreaming()) {
      ecgBuf[ecgIdx % ECG_LEN] = 0.015 * Math.sin(ecgIdx / 9); /* flatline drift */
      ecgIdx++;
      drawEcg();
      return;
    }
    var hr = S.hr || 72;
    var beat = 60 / hr;
    /* advance the buffer at ~10 fps: one beat every `beat` seconds */
    ecgBuf[ecgIdx % ECG_LEN] = ecgNext(Math.round(Date.now() / (beat * 1000 / 46)));
    ecgIdx++;
    drawEcg();
  }

  /* Watch face: heart rate, SpO2, battery + signal of the streaming device. */
  function updateWatch() {
    setText($('#dsBpm'), S.hr ? String(Math.round(S.hr)) : '--');
    setText($('#dsSpo2'), heartStreaming() ? S.spo2.toFixed(1) : '--');
    var src = S.devices.filter(function (d) {
      return d.id === 'wearable' && (d.status === 'connected' || d.status === 'syncing');
    })[0] || S.devices.filter(function (d) {
      return d.status === 'connected' || d.status === 'syncing';
    })[0];
    setText($('#dsWatchBattery'), src && src.battery != null ? String(Math.round(src.battery)) : '--');
    setText($('#dsWatchSignal'), src ? '⌁ ' + '▮'.repeat(src.signal) + '▯'.repeat(3 - src.signal) : '⌁ —');
  }

  function tick(visible) {
    S.tick++;
    var live = connectedDevices();
    var accepted = 0;
    live.forEach(function (dev) {
      var scopes = dev.scopes.filter(function (s) { return S.consent[s]; });
      if (!scopes.length) return;
      scopes.forEach(function (scope) {
        /* heart rate streams continuously, other categories at a lower cadence */
        if (scope !== 'heart' && Math.random() > 0.5) return;
        var r = readScope(scope);
        if (!r) return;
        S.counters.received++;
        S.latencies.push(H.round(H.rnd(26, 78), 0));
        if (S.latencies.length > 20) S.latencies.shift();
        /* simulated unit rejection (mg/dL payload sent to a mmol/L feed) */
        if (Math.random() < 0.012) {
          S.counters.rejected++;
          return;
        }
        S.counters.normalized++;
        S.counters.stored++;
        S.readings++;
        dev.imported++;
        applyReading(scope, r, dev);
        accepted++;
      });
      /* battery drain + signal jitter */
      if (dev.battery != null) {
        dev.battery = Math.max(4, dev.battery - H.rnd(0.01, 0.06));
        if (dev.battery < 15) {
          pushAlert('battery', { d: L(dev.name), v: Math.round(dev.battery) }, 'tech', 'alert.battery', 'alert.rec.battery');
          log('alert', 'log.battery', { d: L(dev.name), v: Math.round(dev.battery) });
        }
      }
      if (Math.random() < 0.08) dev.signal = H.clamp(dev.signal + (Math.random() < 0.5 ? -1 : 1), 1, 3);
    });

    if (accepted && S.tick % 3 === 0) {
      log('data', 'log.tick', { n: accepted, d: L(live[0].name) });
    }
    if (S.tick % 17 === 0 && live.length) {
      log('security', 'log.security', { d: L(live[0].name) });
    }
    if (S.counters.rejected >= 3) {
      pushAlert('quality', { n: S.counters.rejected }, 'tech', 'alert.quality', 'alert.rec.quality');
    }

    if (visible === false) return; /* keep the model warm without repainting off-screen */
    renderKpis();
    renderVitals();
    renderPhone();
    updateWatch();
    updateChart();
    renderPipeline();
    refreshDeviceValues();
    updateHud();
  }

  function setSyncBar(pct, label) {
    var bar = $('#syncbar');
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
    setText($('#syncText'), label);
    setText($('#dsSyncPct'), Math.round(pct) + ' %');
  }

  /* ------------------------------------------------------------------- sync -- */
  function runSync(list, opts) {
    opts = opts || {};
    list = (list && list.length ? list : connectedDevices());
    if (S.syncing) return;
    if (!list.length) {
      toast(T('hud.idle'));
      log('system', 'log.syncStart', { n: 0 });
      return;
    }
    S.syncing = true;
    var started = Date.now();
    list.forEach(function (d) { d.status = 'syncing'; d.progress = 0; });
    renderDevices();
    log('system', 'log.syncStart', { n: list.length });
    var target = Math.round(list.length * H.rnd(4, 9));
    var imported = 0;
    var pct = 0;
    setSyncBar(0, T('pipe.running'));

    var timer = setInterval(function () {
      pct = Math.min(100, pct + H.rnd(6, 13) * S.speed);
      S.syncPct = pct;
      var want = Math.round((pct / 100) * target);
      while (imported < want) {
        imported++;
        S.counters.received++; S.counters.normalized++; S.counters.stored++;
        S.readings++;
        var dev = list[imported % list.length];
        dev.imported++;
        var scope = dev.scopes.filter(function (s) { return S.consent[s]; })[0] || 'heart';
        var r = readScope(scope);
        if (r) applyReading(scope, r, dev);
      }
      list.forEach(function (d) { d.progress = pct; d.status = 'syncing'; });
      S.pipelineStage = Math.min(STAGES.length - 1, Math.floor((pct / 100) * STAGES.length));
      setSyncBar(pct, T('pipe.running') + ' · ' + imported + ' / ' + target);
      renderPipeline();
      if (pct >= 100) {
        clearInterval(timer);
        finish();
      }
    }, 120);
    sessionIntervals.push(timer);

    function finish() {
      var ms = Math.max(120, Date.now() - started);
      S.syncing = false;
      S.pipelineStage = -1;
      S.syncPct = 0;
      S.lastSyncAt = Date.now();
      S.latencies.push(ms);
      if (S.latencies.length > 20) S.latencies.shift();
      var partial = Math.random() < 0.12;
      partial ? S.syncs.fail++ : S.syncs.ok++;
      pushHistory(list.length > 1 ? T('history.multi', { n: list.length }) : L(list[0].name),
        imported || target, ms, partial);
      list.forEach(function (d) {
        d.status = 'connected'; d.progress = 0; d.lastSync = Date.now();
      });
      S.syncDoneAt = Date.now();
      log('system', 'log.syncDone', { n: imported || target, ms: ms });
      setSyncBar(100, T('pipe.done') + ' · ' + (imported || target) + ' ' + T('dev.imported'));
      toast(T('toast.sync', { n: imported || target }));
      renderDevices(); renderKpis(); renderHistory(); renderPipeline(); updateHud();
      if (!opts.silent) setTimeout(function () { setSyncBar(0, T('pipe.idle')); }, 2600);
    }
  }

  /* -------------------------------------------------------------- connect flow */
  function setDeviceState(dev, status, progress) {
    dev.status = status;
    dev.progress = progress == null ? dev.progress : progress;
    renderDevices();
    updateHud();
  }

  /* Fast connection used by the guided demo / auto-start (no modal). */
  function quickConnect(dev, done) {
    if (!dev) { done && done(); return; }
    dev.failures = dev.failures || 0;
    /* The guided demo plays the same protocol at a presentation pace. */
    var pace = S.autopilot ? 0.55 : 1;
    setDeviceState(dev, 'discovering', 4);
    log('system', 'log.scan', { d: L(dev.name) });
    later(function () { setDeviceState(dev, 'pairing', 30); }, 600 / S.speed * pace);
    later(function () {
      dev.progress = 55;
      log('security', 'log.pair', { d: L(dev.name) });
      setDeviceState(dev, 'consenting', 62);
    }, 1250 / S.speed * pace);
    later(function () {
      dev.progress = 78;
      var scopes = dev.scopes.filter(function (s) { return S.consent[s]; });
      log('consent', 'log.consent', { d: L(dev.name), n: scopes.length });
      setDeviceState(dev, 'importing', 82);
    }, 1950 / S.speed * pace);
    later(function () {
      dev.progress = 92;
    }, 2450 / S.speed * pace);
    later(function () {
      var scopes = dev.scopes.filter(function (s) { return S.consent[s]; });
      dev.imported += Math.round(H.rnd(28, 96));
      dev.progress = 100;
      dev.lastSync = Date.now();
      S.lastSyncAt = Date.now();
      S.counters.received += dev.imported;
      S.counters.normalized += dev.imported;
      S.counters.stored += dev.imported;
      S.readings += dev.imported;
      if (scopes.indexOf('heart') !== -1 || scopes.length) {
        var r = readScope(scopes[0] || 'heart');
        if (r) applyReading(scopes[0] || 'heart', r, dev);
      }
      setDeviceState(dev, 'connected', 0);
      log('data', 'log.import', { n: dev.imported, d: L(dev.name) });
      log('system', 'log.connected', { d: L(dev.name) });
      toast(T('toast.paired', { d: L(dev.name) }));
      pushHistory(L(dev.name), Math.max(1, Math.round(dev.imported)), Math.round(H.rnd(900, 1900)), false);
      renderKpis(); renderVitals(); renderPhone(); updateWatch(); updateChart();
      done && done(dev);
    }, 3050 / S.speed * pace);
  }

  function disconnect(dev, silent) {
    dev.status = 'offline';
    dev.progress = 0;
    renderDevices();
    updateHud();
    if (!silent) log('consent', 'log.disconnected', { d: L(dev.name) });
  }

  /* --------------------------------------------------------------- autopilot -- */
  function startAutopilot() {
    if (S.autopilot) { stopAutopilot(true); return; }
    S.autopilot = true;
    S.autoIndex = 0;
    S.paused = false;
    log('system', 'log.auto');
    updateHud();
    stepAuto();
  }
  function stepAuto() {
    if (!S.autopilot) return;
    var next = S.devices.filter(function (d) { return d.status === 'offline' || d.status === 'error'; })[0];
    if (!next) {
      runSync(connectedDevices(), { silent: true });
      later(function () {
        S.autopilot = false;
        log('system', 'log.autoStop');
        updateHud();
      }, 2600);
      return;
    }
    S.autoIndex++;
    updateHud();
    quickConnect(next, function () {
      later(stepAuto, 700 / S.speed);
    });
  }
  function stopAutopilot(manual) {
    S.autopilot = false;
    clearTimers();
    /* Release any device left mid-protocol by the cancelled queue. */
    S.devices.forEach(function (d) {
      if (isBusy(d)) { d.status = 'offline'; d.progress = 0; }
    });
    renderDevices();
    log('system', 'log.autoStop');
    updateHud();
    if (manual) toast(T('hud.guidedStop'));
  }

  /* --------------------------------------------------------------- modal ---- */
  var M = { open: false, dev: null, step: 0, pin: '', scopes: {}, agreed: false, imported: 0, done: false };

  function modalPin() {
    var s = '';
    for (var i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
    return s;
  }
  function openConnect(dev) {
    if (!dev) return;
    if (isLive(dev) || isBusy(dev)) { toast(T('dev.' + dev.status)); return; }
    M = { open: true, dev: dev, step: 0, pin: modalPin(), scopes: {}, agreed: false, imported: 0, done: false };
    dev.scopes.forEach(function (s) { M.scopes[s] = !!S.consent[s]; });
    var backdrop = $('#dsBackdrop');
    if (backdrop) backdrop.classList.add('is-open');
    setDeviceState(dev, 'discovering', 4);
    log('system', 'log.scan', { d: L(dev.name) });
    renderModal();
    startScanStep();
    var closeBtn = $('#dsClose');
    if (closeBtn) closeBtn.focus();
  }
  function closeModal() {
    M.open = false;
    var backdrop = $('#dsBackdrop');
    if (backdrop) backdrop.classList.remove('is-open');
    if (M.dev && !M.done) {
      M.dev.status = 'offline';
      M.dev.progress = 0;
      renderDevices();
      updateHud();
    }
    clearModalTimers();
  }
  function modalStepsHtml() {
    var labels = ['modal.step.scan', 'modal.step.pair', 'modal.step.consent', 'modal.step.import', 'modal.step.done'];
    return '<div class="ds-steps">' + labels.map(function (k, i) {
      var cls = i === M.step ? ' on' : (i < M.step ? ' done' : '');
      return '<span class="ds-stepdot' + cls + '"><i>' + (i < M.step ? '✓' : (i + 1)) + '</i>' + esc(T(k)) + '</span>';
    }).join('') + '</div>';
  }
  function modalHead(titleKey, hintKey) {
    var dev = M.dev;
    return '<div class="ds-modal-head"><div style="z-index:1">' +
      '<h3 id="dsModalTitle">' + esc(T(titleKey)) + '</h3>' +
      '<p>' + esc(T(hintKey)) + '</p>' +
      '<div class="ds-modal-device"><span class="ds-device-icon">' + dev.icon + '</span>' +
      '<span>' + esc(L(dev.name)) + ' · ' + esc(dev.vendor) + '</span></div>' +
      '</div><button class="ds-close" id="dsClose" data-act="modal-close" aria-label="' + esc(T('modal.close')) + '">×</button></div>';
  }
  function renderModal() {
    var box = $('#dsModal');
    if (!box || !M.open) return;
    var html = '';
    if (M.step === 0) {
      html = modalHead('scan.title', 'scan.hint') + modalStepsHtml() +
        '<div class="ds-modal-body">' +
        '<div class="ds-radar"><svg viewBox="0 0 400 200" aria-hidden="true">' +
        '<defs><linearGradient id="dsSweepGrad" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#c9ee59" stop-opacity=".55"></stop>' +
        '<stop offset="1" stop-color="#c9ee59" stop-opacity="0"></stop></linearGradient></defs>' +
        '<circle class="ds-ring" cx="200" cy="100" r="34"></circle>' +
        '<circle class="ds-ring" cx="200" cy="100" r="64"></circle>' +
        '<circle class="ds-ring" cx="200" cy="100" r="92"></circle>' +
        '<path class="ds-sweep" d="M200 100 L200 8 A92 92 0 0 1 279 55 Z"></path>' +
        '</svg><span class="ds-radar-label" id="dsRadarLabel">' + esc(T('scan.scanning')) + '</span></div>' +
        '<div class="ds-scan-list" id="dsScanList"></div>' +
        '</div>';
    } else if (M.step === 1) {
      var digits = M.pin.split('').map(function (d) { return '<b>' + d + '</b>'; }).join('');
      html = modalHead('pair.title', 'pair.hint') + modalStepsHtml() +
        '<div class="ds-modal-body">' +
        '<div class="ds-pin" aria-label="' + esc(T('pair.code')) + '">' + digits + '</div>' +
        '<div>' +
        '<div class="ds-check" id="dsChk1"><i>✓</i>' + esc(T('pair.check1')) + '</div>' +
        '<div class="ds-check" id="dsChk2"><i>✓</i>' + esc(T('pair.check2')) + '</div>' +
        '<div class="ds-check" id="dsChk3"><i>✓</i>' + esc(T('pair.check3')) + '</div>' +
        '</div>' +
        '<div class="ds-modal-actions">' +
        '<button class="ds-btn primary" data-act="modal-confirm">' + esc(T('pair.confirm')) + '</button>' +
        '</div></div>';
    } else if (M.step === 2) {
      html = modalHead('consent.title', 'consent.hint2') + modalStepsHtml() +
        '<div class="ds-modal-body">' +
        '<div class="ds-mlist">' + M.dev.scopes.map(function (id) {
          var s = scopeById(id);
          if (!s) return '';
          return '<div class="ds-scope"><span class="ds-scope-ico">' + s.icon + '</span>' +
            '<span class="ds-scope-txt"><b>' + esc(L(s.label)) + '</b><small>' + esc(unitOf(s) + ' · LOINC ' + s.loinc) + '</small></span>' +
            '<span class="ds-switch"><input type="checkbox" data-act="mscope" data-id="' + id + '"' +
            (M.scopes[id] ? ' checked' : '') + ' aria-label="' + esc(L(s.label)) + '"><span></span></span></div>';
        }).join('') + '</div>' +
        '<label class="ds-agree"><input type="checkbox" data-act="magree"' + (M.agreed ? ' checked' : '') + '>' +
        '<span>' + esc(T('consent.checkbox')) + '</span></label>' +
        '<div class="ds-modal-actions">' +
        '<button class="ds-btn primary" id="dsAllowBtn" data-act="modal-allow"' + (M.agreed ? '' : ' disabled') + '>' +
        esc(T('consent.allow')) + '</button></div></div>';
    } else if (M.step === 3) {
      html = modalHead('import.title', 'import.hint') + modalStepsHtml() +
        '<div class="ds-modal-body">' +
        '<div class="ds-progress running"><i id="dsImportBar" style="width:' + M.imported + '%"></i></div>' +
        '<div class="ds-progress-label"><span id="dsImportLabel">' + esc(T('import.progress', { n: 0 })) + '</span>' +
        '<span id="dsImportPct">' + Math.round(M.imported) + ' %</span></div>' +
        '<div class="ds-log-mini" id="dsImportLog"></div>' +
        '<div class="ds-modal-actions"><span class="ds-hint" id="dsImportHint">' +
        esc(T('import.finalizing')) + '</span></div></div>';
    } else {
      var scopeNames = M.dev.scopes.filter(function (s) { return M.scopes[s]; })
        .map(function (s) { var o = scopeById(s); return o ? L(o.label) : s; }).join(', ');
      html = modalHead('done.title', 'done.hint') + modalStepsHtml() +
        '<div class="ds-modal-body"><div class="ds-done-ico">✓</div>' +
        '<div class="ds-summary">' +
        '<div><small>' + esc(T('done.device')) + '</small><b>' + esc(L(M.dev.name)) + '</b></div>' +
        '<div><small>' + esc(T('done.readings')) + '</small><b>' + M.dev.imported + '</b></div>' +
        '<div><small>' + esc(T('done.scopes')) + '</small><b style="font-size:11.5px">' + esc(scopeNames || '—') + '</b></div>' +
        '<div><small>' + esc(T('done.latency')) + '</small><b>' + Math.round(H.rnd(28, 62)) + ' ms</b></div>' +
        '</div>' +
        '<p class="ds-hint">' + esc(T('done.next')) + '</p>' +
        '<div class="ds-modal-actions">' +
        '<button class="ds-btn primary" data-act="modal-finish">' + esc(T('done.finish')) + '</button>' +
        '</div></div>';
    }
    box.innerHTML = html;
    if (M.step === 3) appendImportLog(T('import.hint'));
  }
  function appendImportLog(line) {
    var box = $('#dsImportLog');
    if (!box) return;
    var div = document.createElement('div');
    div.textContent = '› ' + line;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function startScanStep() {
    var list = $('#dsScanList');
    if (!list) return;
    var found = 0;
    var dev = M.dev;
    var neighbours = ['Mi Band 8', 'Beurer BM57', 'Withings Body+', 'Dexcom G7', 'Pixel Watch 2', 'Omron M6'];
    var iv = trackInterval(setInterval(function () {
      if (!M.open) { clearInterval(iv); return; }
      found++;
      var isTarget = found === 3;
      var name = isTarget ? L(dev.name) : neighbours[found % neighbours.length];
      var row = document.createElement('div');
      row.className = 'ds-scan-row' + (isTarget ? ' is-found' : '');
      row.innerHTML = '<span aria-hidden="true">' + (isTarget ? '🎯' : '📡') + '</span>' +
        '<b>' + esc(name) + '</b><span class="ds-rssi">' + esc(T('scan.strength', { v: -Math.round(H.rnd(42, 88)) })) + '</span>';
      list.appendChild(row);
      if (isTarget) {
        setText($('#dsRadarLabel'), T('scan.connecting', { d: L(dev.name) }));
        var dev2 = dev;
        laterModal(function () {
          if (!M.open) return;
          M.step = 1;
          setDeviceState(dev2, 'pairing', 30);
          renderModal();
          startPairStep();
        }, 900);
        clearInterval(iv);
      }
    }, 620));
  }
  function startPairStep() {
    var steps = [['#dsChk1', 500], ['#dsChk2', 1000], ['#dsChk3', 1500]];
    steps.forEach(function (pair) {
      laterModal(function () {
        var el = $(pair[0]);
        if (el) el.classList.add('on');
        if (pair[0] === '#dsChk3') {
          var dev = M.dev;
          log('security', 'log.pair', { d: L(dev.name) });
        }
      }, pair[1] / S.speed);
    });
    laterModal(function () {
      if (!M.open || M.step !== 1) return;
      goConsentStep();
    }, 2900 / S.speed);
  }
  function goConsentStep() {
    if (!M.open) return;
    M.step = 2;
    setDeviceState(M.dev, 'consenting', 62);
    renderModal();
    var agree = $('input[data-act="magree"]');
    if (agree) agree.focus();
  }
  function goImportStep() {
    if (!M.open) return;
    M.step = 3;
    var dev = M.dev;
    setDeviceState(dev, 'importing', 82);
    var scopes = Object.keys(M.scopes).filter(function (k) { return M.scopes[k]; });
    log('consent', 'log.consent', { d: L(dev.name), n: scopes.length });
    Object.keys(M.scopes).forEach(function (k) { S.consent[k] = !!M.scopes[k]; });
    renderScopes();
    renderModal();
    var pct = 0;
    var count = 0;
    var iv = trackInterval(setInterval(function () {
      if (!M.open) { clearInterval(iv); return; }
      pct = Math.min(100, pct + H.rnd(7, 15) * S.speed);
      count = Math.round((pct / 100) * 128);
      var bar = $('#dsImportBar');
      if (bar) bar.style.width = pct + '%';
      setText($('#dsImportPct'), Math.round(pct) + ' %');
      setText($('#dsImportLabel'), T('import.progress', { n: count }));
      if (pct > 40 && pct - 15 < 40) appendImportLog('LOINC 2339-0 → mmol/L (normalisé)');
      if (pct > 62 && pct - 15 < 62) appendImportLog('LOINC 8867-4 → bpm (normalisé)');
      if (pct > 84 && pct - 15 < 84) appendImportLog('FHIR Observation → Evidence Graph');
      if (pct >= 100) {
        clearInterval(iv);
        dev.imported += 128;
        S.counters.received += 128;
        S.counters.normalized += 128;
        S.counters.stored += 128;
        S.readings += 128;
        dev.lastSync = Date.now();
        var r = readScope(dev.scopes.filter(function (s) { return S.consent[s]; })[0] || 'heart');
        if (r) applyReading(dev.scopes[0] || 'heart', r, dev);
        M.done = true;
        M.step = 4;
        S.lastSyncAt = Date.now();
        setDeviceState(dev, 'connected', 0);
        log('data', 'log.import', { n: dev.imported, d: L(dev.name) });
        log('system', 'log.connected', { d: L(dev.name) });
        toast(T('toast.paired', { d: L(dev.name) }));
        pushHistory(L(dev.name), 128, Math.round(H.rnd(1800, 3200)), false);
        renderModal();
        renderKpis(); renderVitals(); updateWatch(); updateChart();
      }
    }, 130));
  }

  /* ------------------------------------------------------------------ reset -- */
  function resetSession(silent) {
    clearTimers();
    var wasAuto = S.autopilot;
    S = newState();
    S.autoStarted = true;
    if (wasAuto) S.autopilot = false;
    ecgBuf = new Array(ECG_LEN).fill(0);
    ecgIdx = 0;
    var speedSel = $('#dsSpeed');
    if (speedSel) speedSel.value = '1';
    S.speed = 1;
    M = { open: false, dev: null, step: 0, pin: '', scopes: {}, agreed: false, imported: 0, done: false };
    var backdrop = $('#dsBackdrop');
    if (backdrop) backdrop.classList.remove('is-open');
    setSyncBar(0, T('pipe.idle'));
    renderDevices(); renderKpis(); renderScopes(); renderAlerts(); renderHistory();
    renderFilters(); renderPipeline(); renderVitals(); renderPhone(); renderInterop();
    renderLog(); updateChart(); updateHud();
    log('system', 'log.boot', { g: S.gateway.city, id: S.sessionId });
    log('system', 'log.reset');
    if (!silent) toast(T('toast.reset'));
  }

  /* ------------------------------------------------------------------ export -- */
  function exportData() {
    var payload = {
      platform: 'NUTRI.N°1',
      module: 'connected-devices',
      generatedAt: new Date().toISOString(),
      locale: I18N.currentLocale(),
      sessionId: S.sessionId,
      gateway: S.gateway,
      consent: S.consent,
      devices: S.devices.map(function (d) {
        return {
          id: d.id, name: L(d.name), vendor: d.vendor, firmware: d.firmware,
          status: d.status, scopes: d.scopes, readings: d.imported,
          lastValue: d.lastValue, lastUnit: d.lastUnit, lastSync: d.lastSync
        };
      }),
      counters: S.counters,
      readings: S.readings,
      history: S.history,
      alerts: S.alerts,
      eventLog: S.log
    };
    try {
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'nutri-n1-devices-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast(T('toast.export'));
      log('system', 'log.export', { n: S.log.length });
    } catch (e) {
      toast(T('toast.export'));
    }
  }

  /* ------------------------------------------------------------------ events -- */
  function findDevice(id) {
    return S.devices.filter(function (d) { return d.id === id; })[0] || null;
  }
  /* Legacy labels used by the previous #devices markup (and by any external
     caller): map them onto the new catalogue. */
  var LEGACY_ALIASES = {
    'apple health': 'apple-health', 'apple': 'apple-health',
    'health connect': 'health-connect', 'android': 'health-connect',
    'glucose': 'cgm', 'glycemie': 'cgm', 'glycémie': 'cgm', 'cgm': 'cgm',
    'blood pressure': 'bp', 'tension': 'bp', 'bp': 'bp',
    'wearable': 'wearable', 'montre': 'wearable', 'watch': 'wearable',
    'smart scale': 'scale', 'scale': 'scale', 'balance': 'scale', 'poids': 'scale'
  };
  function findDeviceByName(name) {
    var q = String(name || '').toLowerCase().trim();
    var alias = LEGACY_ALIASES[q];
    if (alias) {
      var byAlias = findDevice(alias);
      if (byAlias) return byAlias;
    }
    return S.devices.filter(function (d) {
      var names = [d.id, d.name.en, d.name.fr, L(d.name)].map(function (x) { return String(x).toLowerCase(); });
      return names.indexOf(q) !== -1 || names.some(function (n) { return n.indexOf(q) !== -1 && q.length > 3; });
    })[0] || null;
  }

  function onClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.dataset.act;
    var id = el.dataset.id;

    switch (act) {
      case 'pair':
        openConnect(findDevice(id));
        break;
      case 'disconnect': {
        var dev = findDevice(id);
        if (dev) disconnect(dev);
        break;
      }
      case 'devsync': {
        var d2 = findDevice(id);
        if (d2) runSync([d2]);
        break;
      }
      case 'syncall':
        runSync(connectedDevices());
        break;
      case 'autopilot':
        startAutopilot();
        break;
      case 'pause':
        S.paused = !S.paused;
        log('system', S.paused ? 'log.paused' : 'log.resumed');
        updateHud();
        break;
      case 'reset':
        resetSession();
        break;
      case 'filter':
        S.logFilter = id;
        renderFilters();
        renderLog();
        break;
      case 'revokeall':
        SCOPES.forEach(function (s) { S.consent[s.id] = false; });
        log('consent', 'log.revokedAll');
        renderScopes(); renderDevices(); updateHud();
        toast(T('toast.revoked', { s: T('log.filter.all') }));
        break;
      case 'restoreall':
        SCOPES.forEach(function (s) { S.consent[s.id] = true; });
        log('consent', 'log.restoredAll');
        renderScopes(); renderDevices(); updateHud();
        toast(T('toast.restored', { s: T('log.filter.all') }));
        break;
      case 'export':
        exportData();
        break;
      case 'clear':
        S.log = [];
        renderLog();
        toast(T('toast.cleared'));
        break;
      case 'disconnectall':
        S.devices.forEach(function (x) { disconnect(x, true); });
        log('consent', 'log.disconnected', { d: T('log.filter.all') });
        break;
      case 'escalate': {
        var al = S.alerts.filter(function (a) { return String(a.id) === String(id); })[0];
        if (al) { al.resolved = true; renderAlerts(); }
        toast(T('toast.escalated'));
        log('alert', 'toast.escalated');
        break;
      }
      case 'resolve': {
        var al2 = S.alerts.filter(function (a) { return String(a.id) === String(id); })[0];
        if (al2) { al2.resolved = true; renderAlerts(); }
        break;
      }
      case 'modal-close':
        closeModal();
        break;
      case 'modal-confirm':
        goConsentStep();
        break;
      case 'modal-allow':
        if (M.agreed) goImportStep();
        break;
      case 'modal-finish':
        M.done = true;
        closeModal();
        break;
      default:
        break;
    }
  }

  function onChange(e) {
    var el = e.target;
    if (!el || !el.dataset) return;
    var act = el.dataset.act;
    if (act === 'speed') {
      S.speed = Number(el.value) || 1;
      log('system', 'log.speed', { n: S.speed });
      return;
    }
    if (act === 'scope') {
      var scope = scopeById(el.dataset.id);
      if (!scope) return;
      S.consent[el.dataset.id] = !!el.checked;
      log('consent', el.checked ? 'log.consentOn' : 'log.consentOff', { s: L(scope.label) });
      toast(T(el.checked ? 'toast.restored' : 'toast.revoked', { s: L(scope.label) }));
      renderScopes(); renderDevices(); updateHud();
      return;
    }
    if (act === 'mscope') {
      M.scopes[el.dataset.id] = !!el.checked;
      return;
    }
    if (act === 'magree') {
      M.agreed = !!el.checked;
      var btn = $('#dsAllowBtn');
      if (btn) btn.disabled = !M.agreed;
      return;
    }
  }

  /* -------------------------------------------------------------- i18n sync -- */
  function applyLocale() {
    $$('[data-i18n-ds]').forEach(function (el) {
      setText(el, T(el.dataset.i18nDs));
    });
    $$('[data-i18n-ds-title]').forEach(function (el) {
      el.title = T(el.dataset.i18nDsTitle);
    });
    renderDevices(); renderKpis(); renderScopes(); renderAlerts(); renderHistory();
    renderFilters(); renderVitals(); renderPhone(); renderInterop(); renderPipeline();
    renderLog(); updateHud(); makeChartStatic(); updateChart();
    if (M.open) renderModal();
  }

  /* --------------------------------------------------------------- boot ----- */
  shadow.innerHTML = shellHtml();
  renderDevices(); renderKpis(); renderScopes(); renderAlerts(); renderHistory();
  renderFilters(); renderVitals(); renderPhone(); renderInterop(); makeChartStatic();
  renderPipeline(); renderLog(); updateHud(); setSyncBar(0, T('pipe.idle'));
  log('system', 'log.boot', { g: S.gateway.city, id: S.sessionId });

  shadow.addEventListener('click', onClick);
  shadow.addEventListener('change', onChange);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && M.open) closeModal();
  });

  /* Re-label on language change (NUTRI_I18N dispatches a CustomEvent). */
  document.addEventListener('nutri:i18nChanged', function () { setTimeout(applyLocale, 40); });
  (function watchLanguageSelect() {
    var sel = document.getElementById('language');
    if (!sel || sel.dataset.devsimLang) return;
    sel.dataset.devsimLang = '1';
    sel.addEventListener('change', function () { setTimeout(applyLocale, 120); });
  })();

  /* Country change → new local gateway (no reload, no side effect). */
  (function watchCountrySelect() {
    var sel = document.getElementById('country');
    if (!sel || sel.dataset.devsimCountry) return;
    sel.dataset.devsimCountry = '1';
    sel.addEventListener('change', function () {
      S.gateway = gatewayInfo();
      updateHud();
      log('system', 'log.boot', { g: S.gateway.city, id: S.sessionId });
    });
  })();

  /* Simulation clock: 100 ms base for the ECG, 1.2 s semantics per tick. */
  var acc = 0;
  setInterval(function () {
    if (document.hidden) return;
    var visible = sectionVisible();
    if (visible) setText($('#dsWatchClock'), hhmm(timeNow()));
    if (visible && !S.paused) tickEcg();
    if (S.paused) return;
    acc += 100 * S.speed;
    if (acc >= 1200) { acc = 0; tick(visible); }
  }, 100);
  function timeNow() { return new Date(); }

  /* ------------------------------------------------------- first-visit demo -- */
  function sectionVisible() {
    if (!SECTION) return false;
    if (SECTION.classList && !SECTION.classList.contains('on')) return false;
    var view = SECTION.closest ? SECTION.closest('.view') : null;
    if (view && !view.classList.contains('on')) return false;
    return true;
  }
  function onSectionVisible() {
    if (!sectionVisible()) return;
    applyLocale();          /* the platform language may have changed meanwhile */
    autoStartOnce();
  }
  function autoStartOnce() {
    if (S.autoStarted) return;
    S.autoStarted = true;
    /* Two devices are presented as "already linked to the account" so the
       monitor and the graph are alive the moment the page opens. */
    var watch = findDevice('wearable');
    var cgm = findDevice('cgm');
    if (watch) later(function () { if (!isLive(watch)) quickConnect(watch); }, 700);
    if (cgm) later(function () { if (!isLive(cgm)) quickConnect(cgm); }, 4600);
  }

  if (SECTION && SECTION.classList) {
    var visObserver = new MutationObserver(function () { onSectionVisible(); });
    visObserver.observe(SECTION, { attributes: true, attributeFilter: ['class'] });
  }
  onSectionVisible();
  /* The country/language engines initialise after us: refresh once more. */
  later(function () { applyLocale(); }, 1200);
  later(function () { S.gateway = gatewayInfo(); updateHud(); }, 1500);

  /* -------------------------------------------------------- legacy bridge -- */
  window.connectDevice = function (name) {
    var dev = findDeviceByName(name);
    if (dev) openConnect(dev);
    else toast(String(name || ''));
  };
  window.runSync = function () { runSync(connectedDevices()); };
  window.NUTRI_DEVICES_SIM = {
    version: DATA.version,
    openConnect: function (id) { openConnect(findDevice(id) || findDeviceByName(id)); },
    sync: function () { runSync(connectedDevices()); },
    reset: function () { resetSession(true); },
    export: exportData,
    get state() { return S; }
  };
})();
