/* ==========================================================================
   NUTRI.N°1 — Connected Devices view  (SESSION 3)
   Renders <section id="devices"> as a Dark Bento grid.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vd-*)
   Preserves  : connectDevice(name), runSync(), #syncbar, #syncText
                (legacy device names: 'Apple Health', 'Health Connect', 'Glucose',
                 'Blood Pressure', 'Wearable', 'Smart Scale')
   Storage    : nutri_devices  { connected: {id: {since, last}}, auto, log[] }
   Note       : demonstration only — no real device, account or health platform is
                contacted; readings are sample values generated in the browser.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('devices');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'devices.title': 'Connected Devices & Automatic Sync',
      'devices.sub': 'Authorization-first connection: nothing is read until you approve each data type.',
      'devices.demo': 'Demonstration · sample data',
      'devices.count': '{n} of {total} connected',
      'devices.list.title': 'Sources',
      'devices.status.on': 'Connected', 'devices.status.off': 'Not connected', 'devices.status.pending': 'Awaiting authorization',
      'devices.connect': 'Connect', 'devices.disconnect': 'Disconnect',
      'devices.authorize': 'Authorize', 'devices.cancel': 'Cancel',
      'devices.consent.title': 'Allow NUTRI.N°1 to read:',
      'devices.consent.note': 'Read-only. You can revoke access at any time.',
      'devices.last': 'Last sync {time}', 'devices.never': 'Not synced yet',
      'devices.d.apple': 'Apple Health', 'devices.d.apple.desc': 'Health platform bridge for iPhone and Apple Watch.',
      'devices.d.hconnect': 'Health Connect', 'devices.d.hconnect.desc': 'Android health platform.',
      'devices.d.glucose': 'Glucometer / CGM', 'devices.d.glucose.desc': 'Glucose measurements.',
      'devices.d.bp': 'Blood Pressure Monitor', 'devices.d.bp.desc': 'Systolic and diastolic readings.',
      'devices.d.wearable': 'Wearables', 'devices.d.wearable.desc': 'Smartwatch or fitness band.',
      'devices.d.scale': 'Smart Scale', 'devices.d.scale.desc': 'Weight and body composition.',
      'devices.scope.steps': 'Steps', 'devices.scope.heart': 'Heart rate', 'devices.scope.sleep': 'Sleep',
      'devices.scope.glucose': 'Blood glucose', 'devices.scope.bp': 'Blood pressure', 'devices.scope.weight': 'Weight', 'devices.scope.fat': 'Body fat',
      'devices.sync.title': 'Automatic background synchronization',
      'devices.sync.idle': 'No active connection.',
      'devices.sync.ready': 'Ready to synchronize {n} source(s).',
      'devices.sync.running': 'Synchronizing {name}… {pct}%',
      'devices.sync.done': 'Synchronized {n} source(s) at {time}.',
      'devices.sync.button': 'Demonstrate background sync', 'devices.sync.busy': 'Synchronizing…',
      'devices.sync.auto': 'Sync automatically after connecting',
      'devices.sync.need': 'Connect a source first.',
      'devices.read.title': 'Latest readings',
      'devices.read.empty': 'Connect a source and run a sync to see readings here.',
      'devices.read.source': 'via {name}',
      'devices.read.open': 'Open Citizen Dashboard',
      'devices.unit.steps': 'steps', 'devices.unit.bpm': 'bpm', 'devices.unit.hours': 'h',
      'devices.log.title': 'Activity log', 'devices.log.empty': 'No activity yet.', 'devices.log.clear': 'Clear log',
      'devices.log.connect': 'Connected: {name}', 'devices.log.disconnect': 'Disconnected: {name}', 'devices.log.sync': 'Sync completed · {n} source(s)',
      'devices.privacy.title': 'Privacy by design',
      'devices.privacy.1': 'Explicit authorization per source and per data type.',
      'devices.privacy.2': 'In this demonstration, connection state is stored only in this browser.',
      'devices.privacy.3': 'Disconnecting a source removes its readings from this page.',
      'devices.toast.on': 'Connected: {name}', 'devices.toast.off': 'Disconnected: {name}'
    },
    fr: {
      'devices.title': 'Appareils connectés & synchronisation automatique',
      'devices.sub': 'Connexion soumise à autorisation : rien n’est lu tant que vous n’avez pas approuvé chaque type de donnée.',
      'devices.demo': 'Démonstration · données d’exemple',
      'devices.count': '{n} sur {total} connectés',
      'devices.list.title': 'Sources',
      'devices.status.on': 'Connecté', 'devices.status.off': 'Non connecté', 'devices.status.pending': 'En attente d’autorisation',
      'devices.connect': 'Connecter', 'devices.disconnect': 'Déconnecter',
      'devices.authorize': 'Autoriser', 'devices.cancel': 'Annuler',
      'devices.consent.title': 'Autoriser NUTRI.N°1 à lire :',
      'devices.consent.note': 'Lecture seule. Vous pouvez révoquer l’accès à tout moment.',
      'devices.last': 'Dernière synchro {time}', 'devices.never': 'Pas encore synchronisé',
      'devices.d.apple': 'Apple Santé', 'devices.d.apple.desc': 'Passerelle santé pour iPhone et Apple Watch.',
      'devices.d.hconnect': 'Health Connect', 'devices.d.hconnect.desc': 'Plateforme santé Android.',
      'devices.d.glucose': 'Glucomètre / CGM', 'devices.d.glucose.desc': 'Mesures de glycémie.',
      'devices.d.bp': 'Tensiomètre', 'devices.d.bp.desc': 'Mesures systolique et diastolique.',
      'devices.d.wearable': 'Objets connectés', 'devices.d.wearable.desc': 'Montre connectée ou bracelet d’activité.',
      'devices.d.scale': 'Balance connectée', 'devices.d.scale.desc': 'Poids et composition corporelle.',
      'devices.scope.steps': 'Pas', 'devices.scope.heart': 'Fréquence cardiaque', 'devices.scope.sleep': 'Sommeil',
      'devices.scope.glucose': 'Glycémie', 'devices.scope.bp': 'Tension artérielle', 'devices.scope.weight': 'Poids', 'devices.scope.fat': 'Masse grasse',
      'devices.sync.title': 'Synchronisation automatique en arrière-plan',
      'devices.sync.idle': 'Aucune connexion active.',
      'devices.sync.ready': 'Prêt à synchroniser {n} source(s).',
      'devices.sync.running': 'Synchronisation de {name}… {pct} %',
      'devices.sync.done': '{n} source(s) synchronisée(s) à {time}.',
      'devices.sync.button': 'Démontrer la synchro en arrière-plan', 'devices.sync.busy': 'Synchronisation…',
      'devices.sync.auto': 'Synchroniser automatiquement après connexion',
      'devices.sync.need': 'Connectez d’abord une source.',
      'devices.read.title': 'Dernières mesures',
      'devices.read.empty': 'Connectez une source et lancez une synchro pour afficher les mesures ici.',
      'devices.read.source': 'via {name}',
      'devices.read.open': 'Ouvrir le tableau de bord citoyen',
      'devices.unit.steps': 'pas', 'devices.unit.bpm': 'bpm', 'devices.unit.hours': 'h',
      'devices.log.title': 'Journal d’activité', 'devices.log.empty': 'Aucune activité pour l’instant.', 'devices.log.clear': 'Effacer le journal',
      'devices.log.connect': 'Connexion : {name}', 'devices.log.disconnect': 'Déconnexion : {name}', 'devices.log.sync': 'Synchro terminée · {n} source(s)',
      'devices.privacy.title': 'Confidentialité dès la conception',
      'devices.privacy.1': 'Autorisation explicite par source et par type de donnée.',
      'devices.privacy.2': 'Dans cette démonstration, l’état des connexions est stocké uniquement dans ce navigateur.',
      'devices.privacy.3': 'Déconnecter une source retire ses mesures de cette page.',
      'devices.toast.on': 'Connexion établie : {name}', 'devices.toast.off': 'Déconnexion : {name}'
    }
  });

  /* ---- 2. Model --------------------------------------------------------- */
  var DEVICES = [
    { id: 'apple', legacy: 'Apple Health', icon: 'heart', scopes: ['steps', 'heart', 'sleep'] },
    { id: 'hconnect', legacy: 'Health Connect', icon: 'phone', scopes: ['steps', 'heart', 'sleep'] },
    { id: 'glucose', legacy: 'Glucose', icon: 'drop', scopes: ['glucose'] },
    { id: 'bp', legacy: 'Blood Pressure', icon: 'pulse', scopes: ['bp'] },
    { id: 'wearable', legacy: 'Wearable', icon: 'watch', scopes: ['steps', 'heart', 'sleep'] },
    { id: 'scale', legacy: 'Smart Scale', icon: 'scale', scopes: ['weight', 'fat'] }
  ];
  var SCOPES = ['steps', 'heart', 'sleep', 'glucose', 'bp', 'weight', 'fat'];
  var SCOPE_ICON = { steps: 'steps', heart: 'heart', sleep: 'moon', glucose: 'drop', bp: 'pulse', weight: 'scale', fat: 'ring' };
  var STORE = 'nutri_devices';

  var state = { connected: {}, auto: true, log: [], pending: null, sync: { running: false, pct: 0, name: '', doneAt: 0, n: 0 } };
  (function load() {
    try {
      var saved = JSON.parse(global.localStorage.getItem(STORE) || 'null');
      if (saved && typeof saved === 'object') {
        DEVICES.forEach(function (d) {
          var c = saved.connected && saved.connected[d.id];
          if (c && typeof c === 'object') state.connected[d.id] = { since: +c.since || Date.now(), last: +c.last || 0 };
        });
        state.auto = saved.auto !== false;
        if (Array.isArray(saved.log)) state.log = saved.log.filter(function (e) { return e && e.t && e.type; }).slice(0, 12);
      }
    } catch (e) { /* storage unavailable: start empty */ }
  })();
  function save() {
    try { global.localStorage.setItem(STORE, JSON.stringify({ connected: state.connected, auto: state.auto, log: state.log })); } catch (e) { /* ignore */ }
  }
  function byId(id) { for (var i = 0; i < DEVICES.length; i++) if (DEVICES[i].id === id) return DEVICES[i]; return null; }
  function findDevice(name) {
    var key = String(name == null ? '' : name).toLowerCase();
    for (var i = 0; i < DEVICES.length; i++) if (DEVICES[i].id === key || DEVICES[i].legacy.toLowerCase() === key) return DEVICES[i];
    return null;
  }
  function connectedIds() { return DEVICES.filter(function (d) { return state.connected[d.id]; }).map(function (d) { return d.id; }); }
  function log(type, id, n) { state.log.unshift({ t: Date.now(), type: type, id: id || '', n: n || 0 }); state.log = state.log.slice(0, 12); }

  /* Sample readings: stable per day, so repeated syncs do not invent a new history. */
  function sample(scope) {
    var day = Math.floor(Date.now() / 864e5), h = (day * 2654435761 + scope.length * 97) >>> 0;
    var r = function (min, max) { h = (Math.imul(h ^ (h >>> 15), 2246822507) ^ 0x9e3779b9) >>> 0; return min + (h % 1000) / 1000 * (max - min); };
    switch (scope) {
      case 'steps': return num(Math.round(r(5200, 9400)), 0) + ' ' + t('devices.unit.steps');
      case 'heart': return Math.round(r(62, 78)) + ' ' + t('devices.unit.bpm');
      case 'sleep': return num(r(6.2, 7.9), 1) + ' ' + t('devices.unit.hours');
      case 'glucose': return num(r(4.8, 5.9), 1) + ' mmol/L';
      case 'bp': return Math.round(r(112, 128)) + '/' + Math.round(r(72, 84)) + ' mmHg';
      case 'weight': return num(r(66, 71), 1) + ' kg';
      default: return num(r(21, 27), 1) + ' %';
    }
  }
  function readings() {
    var out = [];
    SCOPES.forEach(function (scope) {
      for (var i = 0; i < DEVICES.length; i++) {
        var d = DEVICES[i], c = state.connected[d.id];
        if (c && c.last && d.scopes.indexOf(scope) >= 0) { out.push({ scope: scope, device: d, value: sample(scope) }); break; }
      }
    });
    return out;
  }

  /* ---- 3. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function num(v, digits) { try { return Number(v).toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }); } catch (e) { return Number(v).toFixed(digits); } }
  function time(ts) { try { return new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return new Date(ts).toTimeString().slice(0, 5); } }
  function name(d) { return t('devices.d.' + d.id); }
  var PATHS = {
    heart: '<path d="M12 20S4 15 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.200C20 15 12 20 12 20z"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.500"/><path d="M11 18h2"/>',
    drop: '<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',
    pulse: '<path d="M3 12h4l2.500-6 4 12 2.500-6h5"/>',
    watch: '<rect x="7" y="7" width="10" height="10" rx="3"/><path d="M9 7l.700-3.500h4.600L15 7M9 17l.700 3.500h4.600L15 17M12 10.500V12l1 1"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.500 9a5 5 0 0 1 7 0M12 9.500l1.500-1.500"/>',
    steps: '<path d="M7 4c1.700 0 2.500 1.800 2.500 4.500S8.700 13 7.500 13 5 11.500 5 8.500 5.500 4 7 4zM17 6c1.500 0 2 1.500 2 4.500S17.700 15 16.500 15s-2-1.800-2-4.500S15.300 6 17 6z"/><path d="M6 16h3M15 18h3"/>',
    moon: '<path d="M20 14.500A8 8 0 0 1 9.500 4 8 8 0 1 0 20 14.500z"/>',
    ring: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/>',
    sync: '<path d="M20 11a8 8 0 0 0-14.500-4M4 4v4h4M4 13a8 8 0 0 0 14.500 4M20 20v-4h-4"/>',
    shield: '<path d="M12 3 4.500 6v5.500c0 4.600 3.200 8 7.500 9.500 4.300-1.500 7.500-4.900 7.500-9.500V6z"/><path d="m9 12 2.200 2.200L15.500 10"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
    unlink: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1M4 4l16 16"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.010M4 12h.010M4 18h.010"/>',
    arrow: '<path d="M7 17 17 7M9 7h8v8"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2').replace(/\.010/g, '.01') + '</svg>';
  }

  /* ---- 4. Template ------------------------------------------------------ */
  function deviceCard(d) {
    var c = state.connected[d.id], pending = state.pending === d.id;
    var status = c ? 'on' : pending ? 'pending' : 'off';
    var scopes = d.scopes.map(function (s) { return '<li>' + ico(pending ? 'check' : SCOPE_ICON[s]) + '<span>' + esc(t('devices.scope.' + s)) + '</span></li>'; }).join('');
    var body;
    if (pending) {
      body = '<div class="vd-consent" role="group" aria-labelledby="vd-consent-' + d.id + '">' +
        '<p id="vd-consent-' + d.id + '" class="vd-consent__title">' + esc(t('devices.consent.title')) + '</p>' +
        '<ul class="vd-scopes vd-scopes--consent">' + scopes + '</ul>' +
        '<p class="vd-note">' + esc(t('devices.consent.note')) + '</p>' +
        '<div class="vd-actions"><button type="button" class="btn primary" data-vd-act="authorize" data-vd-id="' + d.id + '">' + esc(t('devices.authorize')) + '</button>' +
        '<button type="button" class="btn secondary" data-vd-act="cancel" data-vd-id="' + d.id + '">' + esc(t('devices.cancel')) + '</button></div></div>';
    } else {
      body = '<p class="vd-desc">' + esc(t('devices.d.' + d.id + '.desc')) + '</p>' +
        '<ul class="vd-scopes">' + scopes + '</ul>' +
        '<p class="vd-note">' + esc(c ? (c.last ? t('devices.last', { time: time(c.last) }) : t('devices.never')) : '\u00a0') + '</p>' +
        '<div class="vd-actions">' + (c
          ? '<button type="button" class="btn secondary" data-vd-act="disconnect" data-vd-id="' + d.id + '">' + ico('unlink') + '<span>' + esc(t('devices.disconnect')) + '</span></button>'
          : '<button type="button" class="btn primary" data-vd-act="connect" data-vd-id="' + d.id + '">' + ico('link') + '<span>' + esc(t('devices.connect')) + '</span></button>') +
        '</div>';
    }
    return '<article class="card vd-device is-' + status + '" data-vd-device="' + d.id + '">' +
      '<header class="vd-device__head"><span class="vh-ico">' + ico(d.icon) + '</span>' +
        '<div><h3>' + esc(name(d)) + '</h3><span class="vd-status vd-status--' + status + '"><i></i>' + esc(t('devices.status.' + status)) + '</span></div></header>' +
      body + '</article>';
  }

  function syncText() {
    var n = connectedIds().length, s = state.sync;
    if (s.running) return t('devices.sync.running', { name: s.name, pct: Math.round(s.pct) });
    if (!n) return t('devices.sync.idle');
    if (s.doneAt) return t('devices.sync.done', { n: s.n, time: time(s.doneAt) });
    return t('devices.sync.ready', { n: n });
  }
  function syncCard() {
    var s = state.sync, pct = s.running ? s.pct : (s.doneAt && connectedIds().length ? 100 : 0);
    return '<article class="card vd-sync">' +
      '<header class="vd-card__head"><span class="vh-ico">' + ico('sync') + '</span><h3>' + esc(t('devices.sync.title')) + '</h3></header>' +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '" aria-label="' + esc(t('devices.sync.title')) + '">' +
        '<i id="syncbar" style="width:' + pct + '%"></i></div>' +
      '<p id="syncText" class="vd-sync__text" role="status" aria-live="polite">' + esc(syncText()) + '</p>' +
      '<button type="button" class="btn ' + (connectedIds().length ? 'primary' : 'secondary') + ' vd-sync__btn" data-vd-act="sync"' + (s.running ? ' disabled' : '') + '>' +
        ico('sync') + '<span>' + esc(t(s.running ? 'devices.sync.busy' : 'devices.sync.button')) + '</span></button>' +
      '<label class="vd-switch"><input type="checkbox" data-vd-act="auto"' + (state.auto ? ' checked' : '') + '><i aria-hidden="true"></i><span>' + esc(t('devices.sync.auto')) + '</span></label>' +
      '</article>';
  }
  function readingsCard() {
    var list = readings();
    var body = list.length
      ? '<ul class="vd-readings">' + list.map(function (r) {
          return '<li><span class="vd-readings__ico">' + ico(SCOPE_ICON[r.scope]) + '</span><div><span>' + esc(t('devices.scope.' + r.scope)) + '</span>' +
            '<small>' + esc(t('devices.read.source', { name: name(r.device) })) + '</small></div><b>' + esc(r.value) + '</b></li>';
        }).join('') + '</ul>'
      : '<p class="vd-empty">' + esc(t('devices.read.empty')) + '</p>';
    return '<article class="card vd-read">' +
      '<header class="vd-card__head"><span class="vh-ico">' + ico('pulse') + '</span><h3>' + esc(t('devices.read.title')) + '</h3>' +
        '<span class="pill vd-demo">' + esc(t('devices.demo')) + '</span></header>' + body +
      '<button type="button" class="btn secondary vd-read__open" data-vd-act="citizen"><span>' + esc(t('devices.read.open')) + '</span>' + ico('arrow') + '</button>' +
      '</article>';
  }
  function logCard() {
    var items = state.log.map(function (e) {
      var d = byId(e.id);
      var text = e.type === 'sync' ? t('devices.log.sync', { n: e.n }) : t('devices.log.' + e.type, { name: d ? name(d) : '' });
      return '<li class="vd-log__item vd-log__item--' + e.type + '"><i></i><span>' + esc(text) + '</span><time>' + esc(time(e.t)) + '</time></li>';
    }).join('');
    return '<article class="card vd-log">' +
      '<header class="vd-card__head"><span class="vh-ico">' + ico('list') + '</span><h3>' + esc(t('devices.log.title')) + '</h3>' +
        (state.log.length ? '<button type="button" class="btn secondary vd-log__clear" data-vd-act="clear">' + esc(t('devices.log.clear')) + '</button>' : '') + '</header>' +
      (items ? '<ul class="vd-log__list">' + items + '</ul>' : '<p class="vd-empty">' + esc(t('devices.log.empty')) + '</p>') +
      '</article>';
  }
  function privacyCard() {
    return '<article class="card vd-privacy">' +
      '<header class="vd-card__head"><span class="vh-ico">' + ico('shield') + '</span><h3>' + esc(t('devices.privacy.title')) + '</h3></header>' +
      '<ul class="vd-privacy__list">' + [1, 2, 3].map(function (i) { return '<li>' + ico('check') + '<span>' + esc(t('devices.privacy.' + i)) + '</span></li>'; }).join('') + '</ul>' +
      '</article>';
  }
  function template() {
    var n = connectedIds().length;
    return '<div class="vd">' +
      '<article class="card vd-hero"><div class="vh-head"><div class="vd-hero__title"><span class="vh-ico">' + ico('watch') + '</span>' +
        '<div><h2>' + esc(t('devices.title')) + '</h2><p class="muted">' + esc(t('devices.sub')) + '</p></div></div>' +
        '<div class="vd-hero__pills"><span class="pill vd-count' + (n ? ' is-on' : '') + '">' + esc(t('devices.count', { n: n, total: DEVICES.length })) + '</span>' +
        '<span class="pill vd-demo">' + esc(t('devices.demo')) + '</span></div></div></article>' +
      '<div class="vd-devices" role="list" aria-label="' + esc(t('devices.list.title')) + '">' + DEVICES.map(function (d) { return '<div role="listitem">' + deviceCard(d) + '</div>'; }).join('') + '</div>' +
      '<div class="vd-side">' + syncCard() + readingsCard() + '</div>' +
      logCard() + privacyCard() +
      '</div>';
  }

  /* ---- 5. Render (keeps keyboard focus across re-renders) ---------------- */
  function render() {
    var active = doc.activeElement, key = null;
    if (active && root.contains(active) && active.getAttribute) {
      key = { act: active.getAttribute('data-vd-act'), id: active.getAttribute('data-vd-id') };
    }
    root.innerHTML = template();
    if (key && key.act) {
      var sel = '[data-vd-act="' + key.act + '"]' + (key.id ? '[data-vd-id="' + key.id + '"]' : '');
      var next = root.querySelector(sel) || (key.id && root.querySelector('[data-vd-device="' + key.id + '"] button'));
      if (next && !next.disabled) { try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); } }
    }
  }
  /* During a sync only the bar and its label change: no full re-render per tick. */
  function paintSync() {
    var bar = doc.getElementById('syncbar'), text = doc.getElementById('syncText');
    if (bar) { bar.style.width = state.sync.pct + '%'; if (bar.parentNode) bar.parentNode.setAttribute('aria-valuenow', Math.round(state.sync.pct)); }
    if (text) text.textContent = syncText();
  }
  function notify(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }

  /* ---- 6. Actions -------------------------------------------------------- */
  var timer = null;
  function requestConnect(d) {
    if (state.connected[d.id]) return;
    state.pending = d.id;
    render();
    var btn = root.querySelector('[data-vd-act="authorize"][data-vd-id="' + d.id + '"]');
    if (btn) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
  }
  function authorize(d) {
    state.pending = null;
    state.connected[d.id] = { since: Date.now(), last: 0 };
    state.sync.doneAt = 0;
    log('connect', d.id);
    save(); render();
    notify(t('devices.toast.on', { name: name(d) }));
    if (state.auto) runSync();
  }
  function disconnect(d) {
    if (!state.connected[d.id]) return;
    delete state.connected[d.id];
    if (!connectedIds().length) { stopSync(); state.sync.doneAt = 0; }
    log('disconnect', d.id);
    save(); render();
    notify(t('devices.toast.off', { name: name(d) }));
  }
  function stopSync() { if (timer) { global.clearInterval(timer); timer = null; } state.sync.running = false; state.sync.pct = 0; }
  function runSync() {
    var ids = connectedIds();
    if (!ids.length) { stopSync(); state.sync.doneAt = 0; render(); notify(t('devices.sync.need')); return false; }
    if (state.sync.running) return true;
    state.sync.running = true; state.sync.pct = 0; state.sync.name = name(byId(ids[0]));
    render();
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var step = reduce ? 100 : 5;
    timer = global.setInterval(function () {
      var live = connectedIds();
      if (!live.length) { stopSync(); render(); return; }
      state.sync.pct = Math.min(100, state.sync.pct + step);
      state.sync.name = name(byId(live[Math.min(live.length - 1, Math.floor(state.sync.pct / 100 * live.length))]));
      if (state.sync.pct < 100) { paintSync(); return; }
      global.clearInterval(timer); timer = null;
      var now = Date.now();
      live.forEach(function (id) { state.connected[id].last = now; });
      state.sync.running = false; state.sync.doneAt = now; state.sync.n = live.length;
      log('sync', '', live.length);
      save(); render();
    }, 90);
    return true;
  }

  root.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-vd-act]') : null;
    if (!el || !root.contains(el) || el.tagName === 'INPUT') return;
    var act = el.getAttribute('data-vd-act'), d = byId(el.getAttribute('data-vd-id'));
    if (act === 'connect' && d) requestConnect(d);
    else if (act === 'authorize' && d) authorize(d);
    else if (act === 'cancel' && d) { state.pending = null; render(); var b = root.querySelector('[data-vd-act="connect"][data-vd-id="' + d.id + '"]'); if (b) b.focus(); }
    else if (act === 'disconnect' && d) disconnect(d);
    else if (act === 'sync') runSync();
    else if (act === 'clear') { state.log = []; save(); render(); }
    else if (act === 'citizen' && typeof global.go === 'function') global.go('citizen');
  });
  root.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el && el.getAttribute && el.getAttribute('data-vd-act') === 'auto') { state.auto = !!el.checked; save(); }
  });
  root.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && state.pending) {
      var id = state.pending; state.pending = null; render();
      var b = root.querySelector('[data-vd-act="connect"][data-vd-id="' + id + '"]'); if (b) b.focus();
    }
  });

  /* ---- 7. Legacy API ------------------------------------------------------ */
  /* connectDevice(name) keeps the authorization-first rule: it opens the consent step. */
  global.connectDevice = function (legacyName) {
    var d = findDevice(legacyName);
    if (!d) return false;
    requestConnect(d);
    return true;
  };
  global.runSync = runSync;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  render();
  I18N.onChange(render);

  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.devices = {
    render: render, devices: DEVICES.map(function (d) { return d.id; }),
    state: function () { return JSON.parse(JSON.stringify({ connected: state.connected, auto: state.auto, pending: state.pending, sync: state.sync, log: state.log })); }
  };
})(window);
