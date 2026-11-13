/* ==========================================================================
   NUTRI.N°1 — Medical team inside the Network view  (TASK 3)
   Mounts a doctor directory (photos, specialty, facility, presence), a simulated
   appointment booking dialog and a simulated teleconsultation room into
   #vnTeam, the placeholder emitted by views/view-network.js (patient space).

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), views/view-network.js
   Styles     : styles/views.css  (.vt-*, block 6b)
   Assets     : assets/doctors/<id>.jpg  (AI-generated portraits, not real people)
   Storage    : localStorage "nutri_network_appts"
   Note       : demonstration only. Doctors and facilities are fictional; presence
                changes, bookings and the call are simulated on this device; no camera,
                microphone or network request is used.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('network');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'network.title': 'Medical & Nutrition Network',
      'network.sub': 'Find a doctor or nutrition professional, book a visit or a teleconsultation and follow each consultation from request to follow-up.',
      'vt.title': 'Partner medical team', 'vt.sub': 'Doctors across West Africa available for in-clinic visits and teleconsultation.',
      'vt.online': '{n} online now', 'vt.search': 'Search a doctor, specialty, city…', 'vt.search.label': 'Search',
      'vt.onlyOnline': 'Online only', 'vt.filter': 'Filter by specialty', 'vt.all': 'All',
      'vt.s.cardio': 'Cardiology', 'vt.s.endo': 'Endocrinology & diabetes', 'vt.s.nutrition': 'Clinical nutrition', 'vt.s.pediatrics': 'Paediatrics',
      'vt.s.general': 'General medicine & public health', 'vt.s.obgyn': 'Gynaecology & obstetrics', 'vt.s.nephro': 'Nephrology', 'vt.s.gastro': 'Gastroenterology',
      'vt.st.online': 'Online', 'vt.st.busy': 'In consultation', 'vt.st.offline': 'Offline',
      'vt.exp': '{n} yrs experience', 'vt.next': 'Next slot', 'vt.today': 'Today', 'vt.tomorrow': 'Tomorrow',
      'vt.book': 'Book appointment', 'vt.tele': 'Teleconsultation', 'vt.photo': 'Portrait of {name}',
      'vt.none': 'No doctor matches these filters.',
      'vt.c.TG': 'Togo', 'vt.c.SN': 'Senegal', 'vt.c.NG': 'Nigeria', 'vt.c.ML': 'Mali', 'vt.c.GH': 'Ghana', 'vt.c.CI': 'Côte d’Ivoire', 'vt.c.BJ': 'Benin',
      'vt.mine': 'My appointments', 'vt.mine.join': 'Join', 'vt.mine.cancel': 'Cancel', 'vt.mine.cancelled': 'Appointment cancelled.',
      'vt.m.video': 'Video teleconsultation', 'vt.m.clinic': 'In-clinic visit',
      'vt.bk.title': 'Book an appointment', 'vt.bk.mode': 'Type of consultation', 'vt.bk.day': 'Day', 'vt.bk.time': 'Time', 'vt.bk.reason': 'Reason',
      'vt.bk.taken': 'taken', 'vt.bk.confirm': 'Confirm appointment', 'vt.bk.pick': 'Choose a time slot to continue.',
      'vt.r.checkup': 'Nutrition check-up', 'vt.r.diabetes': 'Diabetes / blood sugar follow-up', 'vt.r.bp': 'Blood pressure & heart', 'vt.r.child': 'Child growth & feeding', 'vt.r.pregnancy': 'Pregnancy & breastfeeding', 'vt.r.other': 'Other',
      'vt.ok.title': 'Appointment confirmed', 'vt.ok.ref': 'Reference', 'vt.ok.when': 'When', 'vt.ok.how': 'Type', 'vt.ok.where': 'Where', 'vt.ok.why': 'Reason',
      'vt.ok.online': 'Online · link in “My appointments”', 'vt.ok.note': 'Demonstration: no real booking was made and nobody was contacted.',
      'vt.ok.toast': 'Appointment confirmed with {name}.',
      'vt.close': 'Close', 'vt.done': 'Done',
      'vt.call.title': 'Teleconsultation', 'vt.call.ringing': 'Calling {name}…', 'vt.call.secure': 'Establishing encrypted connection',
      'vt.call.live': 'Live', 'vt.call.you': 'You', 'vt.call.camOff': 'Camera off',
      'vt.call.mic': 'Microphone', 'vt.call.cam': 'Camera', 'vt.call.end': 'End call', 'vt.call.captions': 'Live captions',
      'vt.call.l1': 'Hello, can you hear me well? I have your nutrition profile in front of me.',
      'vt.call.l2': 'Your last scans show a lot of refined starch in the evening. How do you feel after dinner?',
      'vt.call.l3': 'Let’s add a legume portion — cowpeas or beans — three times a week, and cut sugary drinks.',
      'vt.call.l4': 'I would like a fasting blood sugar and a blood pressure reading before our next visit.',
      'vt.call.l5': 'I am sending you a summary and a follow-up slot. Take care of yourself.',
      'vt.call.offline': '{name} is offline. Book an appointment instead.',
      'vt.call.busy': '{name} is in consultation — you were placed first in the waiting room.',
      'vt.end.title': 'Consultation ended', 'vt.end.dur': 'Duration', 'vt.end.sum': 'A consultation summary would be shared in your secure chat.',
      'vt.end.rebook': 'Book a follow-up',
      'vt.note': 'Fictional doctors and facilities · AI-generated portraits · simulated presence, booking and call (no camera or microphone used).'
    },
    fr: {
      'network.title': 'Réseau médical & nutrition',
      'network.sub': 'Trouvez un médecin ou un professionnel de la nutrition, réservez une visite ou une téléconsultation et suivez chaque consultation, de la demande au suivi.',
      'vt.title': 'Équipe médicale partenaire', 'vt.sub': 'Des médecins d’Afrique de l’Ouest disponibles au cabinet et en téléconsultation.',
      'vt.online': '{n} en ligne', 'vt.search': 'Rechercher un médecin, une spécialité, une ville…', 'vt.search.label': 'Recherche',
      'vt.onlyOnline': 'En ligne uniquement', 'vt.filter': 'Filtrer par spécialité', 'vt.all': 'Toutes',
      'vt.s.cardio': 'Cardiologie', 'vt.s.endo': 'Endocrinologie & diabète', 'vt.s.nutrition': 'Nutrition clinique', 'vt.s.pediatrics': 'Pédiatrie',
      'vt.s.general': 'Médecine générale & santé publique', 'vt.s.obgyn': 'Gynécologie-obstétrique', 'vt.s.nephro': 'Néphrologie', 'vt.s.gastro': 'Gastro-entérologie',
      'vt.st.online': 'En ligne', 'vt.st.busy': 'En consultation', 'vt.st.offline': 'Hors ligne',
      'vt.exp': '{n} ans d’expérience', 'vt.next': 'Prochain créneau', 'vt.today': 'Aujourd’hui', 'vt.tomorrow': 'Demain',
      'vt.book': 'Prendre rendez-vous', 'vt.tele': 'Téléconsultation', 'vt.photo': 'Portrait de {name}',
      'vt.none': 'Aucun médecin ne correspond à ces filtres.',
      'vt.c.TG': 'Togo', 'vt.c.SN': 'Sénégal', 'vt.c.NG': 'Nigéria', 'vt.c.ML': 'Mali', 'vt.c.GH': 'Ghana', 'vt.c.CI': 'Côte d’Ivoire', 'vt.c.BJ': 'Bénin',
      'vt.mine': 'Mes rendez-vous', 'vt.mine.join': 'Rejoindre', 'vt.mine.cancel': 'Annuler', 'vt.mine.cancelled': 'Rendez-vous annulé.',
      'vt.m.video': 'Téléconsultation vidéo', 'vt.m.clinic': 'Visite au cabinet',
      'vt.bk.title': 'Prendre rendez-vous', 'vt.bk.mode': 'Type de consultation', 'vt.bk.day': 'Jour', 'vt.bk.time': 'Heure', 'vt.bk.reason': 'Motif',
      'vt.bk.taken': 'pris', 'vt.bk.confirm': 'Confirmer le rendez-vous', 'vt.bk.pick': 'Choisissez un créneau pour continuer.',
      'vt.r.checkup': 'Bilan nutritionnel', 'vt.r.diabetes': 'Suivi diabète / glycémie', 'vt.r.bp': 'Tension & cœur', 'vt.r.child': 'Croissance et alimentation de l’enfant', 'vt.r.pregnancy': 'Grossesse & allaitement', 'vt.r.other': 'Autre',
      'vt.ok.title': 'Rendez-vous confirmé', 'vt.ok.ref': 'Référence', 'vt.ok.when': 'Quand', 'vt.ok.how': 'Type', 'vt.ok.where': 'Lieu', 'vt.ok.why': 'Motif',
      'vt.ok.online': 'En ligne · lien dans « Mes rendez-vous »', 'vt.ok.note': 'Démonstration : aucune réservation réelle n’a été faite et personne n’a été contacté.',
      'vt.ok.toast': 'Rendez-vous confirmé avec {name}.',
      'vt.close': 'Fermer', 'vt.done': 'Terminé',
      'vt.call.title': 'Téléconsultation', 'vt.call.ringing': 'Appel de {name}…', 'vt.call.secure': 'Établissement de la connexion chiffrée',
      'vt.call.live': 'En direct', 'vt.call.you': 'Vous', 'vt.call.camOff': 'Caméra coupée',
      'vt.call.mic': 'Micro', 'vt.call.cam': 'Caméra', 'vt.call.end': 'Raccrocher', 'vt.call.captions': 'Sous-titres en direct',
      'vt.call.l1': 'Bonjour, vous m’entendez bien ? J’ai votre profil nutritionnel sous les yeux.',
      'vt.call.l2': 'Vos derniers scans montrent beaucoup de féculents raffinés le soir. Comment vous sentez-vous après le dîner ?',
      'vt.call.l3': 'Ajoutons une portion de légumineuses — niébé ou haricots — trois fois par semaine, et réduisons les boissons sucrées.',
      'vt.call.l4': 'J’aimerais une glycémie à jeun et une mesure de tension avant notre prochain rendez-vous.',
      'vt.call.l5': 'Je vous envoie un compte rendu et un créneau de suivi. Prenez soin de vous.',
      'vt.call.offline': '{name} est hors ligne. Prenez plutôt rendez-vous.',
      'vt.call.busy': '{name} est en consultation — vous êtes placé en tête de la salle d’attente.',
      'vt.end.title': 'Consultation terminée', 'vt.end.dur': 'Durée', 'vt.end.sum': 'Un compte rendu de consultation serait partagé dans votre messagerie sécurisée.',
      'vt.end.rebook': 'Réserver un suivi',
      'vt.note': 'Médecins et établissements fictifs · portraits générés par IA · présence, réservation et appel simulés (ni caméra ni micro utilisés).'
    }
  });

  /* ---- 2. Data ----------------------------------------------------------- */
  var DOCTORS = [
    { id: 'mensah',  name: 'Dr. Koffi Mensah',    spec: 'cardio',     place: 'Centre Cardiologique du Golfe', city: 'Lomé',    cc: 'TG', langs: ['Français', 'Éwé', 'English'],    exp: 18, status: 'online' },
    { id: 'diallo',  name: 'Dr. Aminata Diallo',  spec: 'endo',       place: 'Clinique de la Corniche',       city: 'Dakar',   cc: 'SN', langs: ['Français', 'Wolof', 'English'],  exp: 12, status: 'online' },
    { id: 'okafor',  name: 'Dr. Chinedu Okafor',  spec: 'nutrition',  place: 'Harmattan Specialist Hospital', city: 'Lagos',   cc: 'NG', langs: ['English', 'Igbo'],               exp: 9,  status: 'busy' },
    { id: 'traore',  name: 'Dr. Aïcha Traoré',    spec: 'pediatrics', place: 'Polyclinique du Fleuve',        city: 'Bamako',  cc: 'ML', langs: ['Français', 'Bambara'],           exp: 15, status: 'online' },
    { id: 'ndiaye',  name: 'Dr. Babacar Ndiaye',  spec: 'general',    place: 'Centre de Santé Teranga',       city: 'Thiès',   cc: 'SN', langs: ['Français', 'Wolof'],             exp: 27, status: 'offline' },
    { id: 'boateng', name: 'Dr. Akosua Boateng',  spec: 'obgyn',      place: 'Volta Women’s Clinic',          city: 'Accra',   cc: 'GH', langs: ['English', 'Twi'],                exp: 7,  status: 'online' },
    { id: 'kouassi', name: 'Dr. Yao Kouassi',     spec: 'nephro',     place: 'Clinique des Lagunes',          city: 'Abidjan', cc: 'CI', langs: ['Français', 'Baoulé'],            exp: 13, status: 'busy' },
    { id: 'adjovi',  name: 'Dr. Grace Adjovi',    spec: 'gastro',     place: 'Clinique de l’Atlantique',      city: 'Cotonou', cc: 'BJ', langs: ['Français', 'Fon', 'English'],    exp: 20, status: 'offline' }
  ];
  var SPECS = ['cardio', 'endo', 'nutrition', 'pediatrics', 'general', 'obgyn', 'nephro', 'gastro'];
  var SLOTS = ['08:30', '09:15', '10:00', '11:30', '14:00', '15:15', '16:30', '17:15'];
  var REASONS = ['checkup', 'diabetes', 'bp', 'child', 'pregnancy', 'other'];
  var LINES = ['l1', 'l2', 'l3', 'l4', 'l5'];
  var STORE = 'nutri_network_appts';

  function load() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(STORE) || '[]');
      return Array.isArray(raw) ? raw.filter(function (a) { return a && doctor(a.doc) && typeof a.date === 'string' && SLOTS.indexOf(a.time) >= 0; }).slice(0, 6) : [];
    } catch (e) { return []; }
  }
  function save() { try { global.localStorage.setItem(STORE, JSON.stringify(state.appts)); } catch (e) { /* ignore */ } }
  function doctor(id) { for (var i = 0; i < DOCTORS.length; i++) if (DOCTORS[i].id === id) return DOCTORS[i]; return null; }

  var state = { spec: 'all', q: '', onlyOnline: false, appts: [], modal: null, opener: null };
  /* modal: { kind:'book', doc, mode, day, time, reason, done, ref, error } | { kind:'call', doc, phase ringing|live|ended, started, ended, line, mic, cam } */
  state.appts = load();

  /* ---- 3. Helpers --------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function notify(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }
  function reduced() { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; return (h >>> 0) % 9973; }
  function clock(ms) { var s = Math.max(0, Math.floor(ms / 1000)), m = Math.floor(s / 60); s = s % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function days() {               /* today + next working days (Mon–Sat), 6 entries */
    var out = [], d = new Date(); d.setHours(0, 0, 0, 0);
    while (out.length < 6) { if (d.getDay() !== 0) out.push(new Date(d)); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); }
    return out;
  }
  function taken(docId, date, time) {
    if (state.appts.some(function (a) { return a.doc === docId && a.date === date && a.time === time; })) return true;
    if (date === iso(new Date())) { var now = new Date(), p = time.split(':'); if (+p[0] * 60 + +p[1] <= now.getHours() * 60 + now.getMinutes() + 20) return true; }
    return hash(docId + date + time) % 3 === 0;
  }
  function firstFree(docId) {
    var list = days();
    for (var i = 0; i < list.length; i++) for (var j = 0; j < SLOTS.length; j++) if (!taken(docId, iso(list[i]), SLOTS[j])) return { date: list[i], time: SLOTS[j] };
    return null;
  }
  function dayLabel(d, long) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var diff = Math.round((d - today) / 86400000);
    if (!long && diff === 0) return t('vt.today');
    if (!long && diff === 1) return t('vt.tomorrow');
    try { return d.toLocaleDateString(locale(), long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch (e) { return iso(d); }
  }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var PATHS = {
    steth: '<path d="M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="12" r="2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.500C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 7v4M10 9h4M10 21v-4h4v4"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.400 0 17M12 3.5c-2.5 2.6-2.5 14.400 0 17"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    phone: '<path d="M3 11c5-5 13-5 18 0l-2 3-4-1.500v-2.500a9 9 0 0 0-6 0v2.500L5 14z"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n] + '</svg>';
  }
  function photo(d, cls) {
    return '<img class="' + cls + '" src="assets/doctors/' + d.id + '.jpg" alt="' + esc(t('vt.photo', { name: d.name })) + '" loading="lazy" decoding="async" width="560" height="560">';
  }
  function statusPill(d) { return '<span class="vt-status vt-status--' + d.status + '" data-vt-status="' + d.id + '"><i aria-hidden="true"></i>' + esc(t('vt.st.' + d.status)) + '</span>'; }

  /* ---- 4. Directory card ---------------------------------------------------- */
  function matches(d) {
    if (state.spec !== 'all' && d.spec !== state.spec) return false;
    if (state.onlyOnline && d.status !== 'online') return false;
    if (state.q) {
      var hay = (d.name + ' ' + t('vt.s.' + d.spec) + ' ' + d.place + ' ' + d.city + ' ' + t('vt.c.' + d.cc) + ' ' + d.langs.join(' ')).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
    }
    return true;
  }
  function docCard(d, i) {
    var nf = firstFree(d.id);
    return '<li class="vt-doc" style="--i:' + i + '">' +
      '<div class="vt-doc__media">' + photo(d, 'vt-doc__img') + statusPill(d) + '</div>' +
      '<div class="vt-doc__body"><b class="vt-doc__name">' + esc(d.name) + '</b>' +
        '<span class="vt-doc__spec">' + esc(t('vt.s.' + d.spec)) + '</span>' +
        '<ul class="vt-meta">' +
          '<li>' + ico('building') + '<span>' + esc(d.place) + '</span></li>' +
          '<li>' + ico('pin') + '<span>' + esc(d.city) + ', ' + esc(t('vt.c.' + d.cc)) + ' · ' + esc(t('vt.exp', { n: d.exp })) + '</span></li>' +
          '<li>' + ico('globe') + '<span>' + esc(d.langs.join(' · ')) + '</span></li>' +
          '<li class="vt-meta__next">' + ico('clock') + '<span>' + esc(t('vt.next')) + ' : <b>' + (nf ? esc(dayLabel(nf.date)) + ' · ' + nf.time : '—') + '</b></span></li>' +
        '</ul></div>' +
      '<div class="vt-doc__actions">' +
        '<button type="button" class="btn primary" data-vt-act="book" data-vt-id="' + d.id + '">' + ico('calendar') + '<span>' + esc(t('vt.book')) + '</span></button>' +
        '<button type="button" class="btn secondary" data-vt-act="call" data-vt-id="' + d.id + '">' + ico('video') + '<span>' + esc(t('vt.tele')) + '</span></button>' +
      '</div></li>';
  }
  function listHtml() {
    var list = DOCTORS.filter(matches);
    if (!list.length) return '<p class="vt-empty">' + esc(t('vt.none')) + '</p>';
    return '<ul class="vt-docs">' + list.map(docCard).join('') + '</ul>';
  }
  function mineHtml() {
    if (!state.appts.length) return '';
    return '<div class="vt-mine"><h4>' + ico('calendar') + esc(t('vt.mine')) + '</h4><ul>' + state.appts.map(function (a) {
      var d = doctor(a.doc);
      return '<li class="vt-appt">' + photo(d, 'vt-appt__img') +
        '<div><b>' + esc(d.name) + '</b><small>' + esc(dayLabel(parseIso(a.date))) + ' · ' + a.time + ' · ' + esc(t('vt.m.' + a.mode)) + '</small></div>' +
        (a.mode === 'video' ? '<button type="button" class="btn primary" data-vt-act="join" data-vt-id="' + d.id + '">' + ico('video') + '<span>' + esc(t('vt.mine.join')) + '</span></button>' : '') +
        '<button type="button" class="btn secondary" data-vt-act="cancel" data-vt-ref="' + esc(a.ref) + '">' + esc(t('vt.mine.cancel')) + '</button></li>';
    }).join('') + '</ul></div>';
  }
  function onlineCount() { return DOCTORS.filter(function (d) { return d.status === 'online'; }).length; }
  function cardHtml() {
    var chips = [['all', t('vt.all')]].concat(SPECS.map(function (s) { return [s, t('vt.s.' + s)]; })).map(function (c) {
      return '<button type="button" class="vt-chip" data-vt-act="spec" data-vt-v="' + c[0] + '" aria-pressed="' + (state.spec === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('');
    return '<article class="card vt-card">' +
      '<header class="vt-head"><span class="vh-ico">' + ico('steth') + '</span><div><h3>' + esc(t('vt.title')) + '</h3><p>' + esc(t('vt.sub')) + '</p></div>' +
        '<span class="pill vt-live" id="vtOnline"><i aria-hidden="true"></i>' + esc(t('vt.online', { n: onlineCount() })) + '</span></header>' +
      '<div class="vt-tools"><label class="vt-search">' + ico('search') + '<span class="vn-sr">' + esc(t('vt.search.label')) + '</span>' +
          '<input type="search" id="vtSearch" autocomplete="off" maxlength="60" placeholder="' + esc(t('vt.search')) + '" value="' + esc(state.q) + '"></label>' +
        '<label class="vt-toggle"><input type="checkbox" id="vtOnly"' + (state.onlyOnline ? ' checked' : '') + '><i aria-hidden="true"></i><span>' + esc(t('vt.onlyOnline')) + '</span></label></div>' +
      '<div class="vt-chips" role="group" aria-label="' + esc(t('vt.filter')) + '">' + chips + '</div>' +
      '<div id="vtMine">' + mineHtml() + '</div>' +
      '<div id="vtList" aria-live="polite">' + listHtml() + '</div>' +
      '<p class="vt-note">' + ico('lock') + '<span>' + esc(t('vt.note')) + '</span></p></article>';
  }

  /* ---- 5. Dialogs ------------------------------------------------------------- */
  function docHead(d) {
    return '<div class="vt-who">' + photo(d, 'vt-who__img') + '<div><b>' + esc(d.name) + '</b><span>' + esc(t('vt.s.' + d.spec)) + '</span>' +
      '<small>' + esc(d.place) + ' · ' + esc(d.city) + ', ' + esc(t('vt.c.' + d.cc)) + '</small></div>' + statusPill(d) + '</div>';
  }
  function closeBtn() { return '<button type="button" class="vt-x" data-vt-act="close" aria-label="' + esc(t('vt.close')) + '">' + ico('x') + '</button>'; }
  function bookHtml(m) {
    var d = m.doc;
    if (m.done) {
      var rows = [['ref', m.ref], ['when', dayLabel(parseIso(m.day), true) + ' · ' + m.time], ['how', t('vt.m.' + m.mode)],
        ['where', m.mode === 'video' ? t('vt.ok.online') : d.place + ', ' + d.city], ['why', t('vt.r.' + m.reason)]];
      return '<div class="vt-dialog__head"><h3 id="vtDlgTitle">' + esc(t('vt.ok.title')) + '</h3>' + closeBtn() + '</div>' +
        '<div class="vt-ok"><span class="vt-ok__tick">' + ico('check') + '</span>' + docHead(d) +
        '<dl class="vt-sum">' + rows.map(function (r) { return '<div><dt>' + esc(t('vt.ok.' + r[0])) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<p class="vt-fine">' + esc(t('vt.ok.note')) + '</p>' +
        '<div class="vt-dialog__foot"><button type="button" class="btn primary" data-vt-act="close">' + esc(t('vt.done')) + '</button></div></div>';
    }
    var modes = ['video', 'clinic'].map(function (k) {
      return '<button type="button" class="vt-opt" data-vt-act="mode" data-vt-v="' + k + '" aria-pressed="' + (m.mode === k) + '">' + ico(k === 'video' ? 'video' : 'building') + '<span>' + esc(t('vt.m.' + k)) + '</span></button>';
    }).join('');
    var dayBtns = days().map(function (dt) {
      var v = iso(dt);
      return '<button type="button" class="vt-day" data-vt-act="day" data-vt-v="' + v + '" aria-pressed="' + (m.day === v) + '">' + esc(dayLabel(dt)) + '</button>';
    }).join('');
    var slots = SLOTS.map(function (s) {
      var off = taken(d.id, m.day, s);
      return '<button type="button" class="vt-slot" data-vt-act="time" data-vt-v="' + s + '" aria-pressed="' + (m.time === s) + '"' + (off ? ' disabled aria-label="' + s + ' — ' + esc(t('vt.bk.taken')) + '"' : '') + '>' + s + '</button>';
    }).join('');
    var reasons = REASONS.map(function (r) { return '<option value="' + r + '"' + (m.reason === r ? ' selected' : '') + '>' + esc(t('vt.r.' + r)) + '</option>'; }).join('');
    return '<div class="vt-dialog__head"><h3 id="vtDlgTitle">' + esc(t('vt.bk.title')) + '</h3>' + closeBtn() + '</div>' + docHead(d) +
      '<div class="vt-form">' +
        '<div class="vt-group"><span class="vt-label">' + esc(t('vt.bk.mode')) + '</span><div class="vt-opts">' + modes + '</div></div>' +
        '<div class="vt-group"><span class="vt-label">' + esc(t('vt.bk.day')) + '</span><div class="vt-days">' + dayBtns + '</div></div>' +
        '<div class="vt-group"><span class="vt-label">' + esc(t('vt.bk.time')) + '</span><div class="vt-slots">' + slots + '</div></div>' +
        '<label class="vt-group"><span class="vt-label">' + esc(t('vt.bk.reason')) + '</span><select id="vtReason">' + reasons + '</select></label>' +
      '</div>' +
      '<p class="vt-error" role="alert">' + (m.error ? esc(t('vt.bk.pick')) : '') + '</p>' +
      '<div class="vt-dialog__foot"><button type="button" class="btn secondary" data-vt-act="close">' + esc(t('vt.close')) + '</button>' +
        '<button type="button" class="btn primary" data-vt-act="confirm">' + ico('check') + '<span>' + esc(t('vt.bk.confirm')) + '</span></button></div>';
  }
  function callHtml(m) {
    var d = m.doc;
    if (m.phase === 'ended') {
      return '<div class="vt-dialog__head"><h3 id="vtDlgTitle">' + esc(t('vt.end.title')) + '</h3>' + closeBtn() + '</div>' +
        '<div class="vt-ok"><span class="vt-ok__tick">' + ico('check') + '</span>' + docHead(d) +
        '<dl class="vt-sum"><div><dt>' + esc(t('vt.end.dur')) + '</dt><dd>' + clock(m.ended - m.started) + '</dd></div></dl>' +
        '<p class="vt-fine">' + esc(t('vt.end.sum')) + ' ' + esc(t('vt.ok.note')) + '</p>' +
        '<div class="vt-dialog__foot"><button type="button" class="btn secondary" data-vt-act="book" data-vt-id="' + d.id + '">' + ico('calendar') + '<span>' + esc(t('vt.end.rebook')) + '</span></button>' +
          '<button type="button" class="btn primary" data-vt-act="close">' + esc(t('vt.done')) + '</button></div></div>';
    }
    var live = m.phase === 'live';
    return '<div class="vt-dialog__head"><h3 id="vtDlgTitle">' + esc(t('vt.call.title')) + '</h3>' + closeBtn() + '</div>' +
      '<div class="vt-stage vt-stage--' + m.phase + '">' + photo(d, 'vt-stage__img') +
        (live
          ? '<span class="vt-stage__live"><i aria-hidden="true"></i>' + esc(t('vt.call.live')) + ' · <b id="vtElapsed">' + clock(Date.now() - m.started) + '</b></span>' +
            '<span class="vt-stage__name">' + esc(d.name) + ' · ' + esc(t('vt.s.' + d.spec)) + '</span>' +
            '<span class="vt-self' + (m.cam ? '' : ' is-off') + '"><b aria-hidden="true">' + (m.cam ? esc(t('vt.call.you')) : '') + '</b><small>' + esc(t(m.cam ? 'vt.call.you' : 'vt.call.camOff')) + '</small></span>' +
            '<span class="vt-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>'
          : '<div class="vt-ring"><span class="vt-ring__pic">' + photo(d, 'vt-ring__img') + '</span>' +
            '<b>' + esc(t('vt.call.ringing', { name: d.name })) + '</b><small>' + ico('lock') + esc(t('vt.call.secure')) + '</small></div>') +
      '</div>' +
      (live ? '<p class="vt-caption" aria-live="polite"><small>' + esc(t('vt.call.captions')) + '</small><span id="vtCaption">' + esc(t('vt.call.' + LINES[m.line])) + '</span></p>' : '') +
      '<div class="vt-ctrls">' +
        '<button type="button" class="vt-ctrl" data-vt-act="mic" aria-pressed="' + m.mic + '" aria-label="' + esc(t('vt.call.mic')) + '"' + (live ? '' : ' disabled') + '>' + ico('mic') + '</button>' +
        '<button type="button" class="vt-ctrl" data-vt-act="cam" aria-pressed="' + m.cam + '" aria-label="' + esc(t('vt.call.cam')) + '"' + (live ? '' : ' disabled') + '>' + ico('video') + '</button>' +
        '<button type="button" class="vt-ctrl vt-ctrl--end" data-vt-act="hangup" aria-label="' + esc(t('vt.call.end')) + '">' + ico('phone') + '</button>' +
      '</div><p class="vt-fine">' + esc(t('network.tele.note')) + '</p>';
  }
  var fresh = false;              /* true only for the first paint of a dialog: plays the entry animation once */
  function modalHtml() {
    var m = state.modal;
    if (!m) return '';
    return '<div class="vt-overlay' + (fresh ? '' : ' is-still') + '" data-vt-overlay><div class="vt-dialog vt-dialog--' + m.kind + '" role="dialog" aria-modal="true" aria-labelledby="vtDlgTitle" tabindex="-1">' +
      (m.kind === 'book' ? bookHtml(m) : callHtml(m)) + '</div></div>';
  }

  /* ---- 6. Render ---------------------------------------------------------------- */
  var host = doc.createElement('div'); host.className = 'vt-host';
  var cardEl = doc.createElement('div'); cardEl.className = 'vt-slot-card';
  var modalEl = doc.createElement('div'); modalEl.className = 'vt-slot-modal';
  host.appendChild(cardEl); host.appendChild(modalEl);

  function paintCard() {
    var active = doc.activeElement, keepSearch = active && active.id === 'vtSearch', pos = keepSearch ? active.selectionStart : 0;
    cardEl.innerHTML = cardHtml();
    if (keepSearch) { var s = doc.getElementById('vtSearch'); if (s) { s.focus(); try { s.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } } }
  }
  function paintList() { var el = doc.getElementById('vtList'); if (el) el.innerHTML = listHtml(); }
  function paintMine() { var el = doc.getElementById('vtMine'); if (el) el.innerHTML = mineHtml(); }
  function paintModal(focusSel) {
    var sc = modalEl.querySelector('.vt-dialog'), top = sc ? sc.scrollTop : 0;
    modalEl.innerHTML = modalHtml();
    fresh = false;
    var dlg = modalEl.querySelector('.vt-dialog');
    if (!dlg) return;
    dlg.scrollTop = top;
    var target = focusSel ? dlg.querySelector(focusSel) : null;
    (target || dlg).focus({ preventScroll: true });
  }
  function mount() {
    var slot = doc.getElementById('vnTeam');
    if (!slot) return;
    if (host.parentNode !== slot) slot.appendChild(host);
    if (!cardEl.firstChild) paintCard();
  }

  /* ---- 7. Actions ------------------------------------------------------------------ */
  var callTimers = [];
  function clearCall() { callTimers.forEach(function (id) { global.clearTimeout(id); global.clearInterval(id); }); callTimers = []; }
  function openModal(m, opener) {
    clearCall();
    if (!state.modal) { state.opener = opener || doc.activeElement; fresh = true; }
    state.modal = m;
    doc.documentElement.classList.add('vt-lock');
    paintModal('.vt-x');
  }
  function closeModal() {
    clearCall();
    state.modal = null;
    doc.documentElement.classList.remove('vt-lock');
    modalEl.innerHTML = '';
    var o = state.opener; state.opener = null;
    if (o && doc.contains(o) && o.focus) o.focus();
  }
  function openBook(d, opener) {
    var nf = firstFree(d.id), list = days();
    openModal({ kind: 'book', doc: d, mode: 'video', day: iso(nf ? nf.date : list[0]), time: nf ? nf.time : null, reason: d.spec === 'pediatrics' ? 'child' : d.spec === 'obgyn' ? 'pregnancy' : d.spec === 'cardio' ? 'bp' : d.spec === 'endo' ? 'diabetes' : 'checkup', done: false, error: false }, opener);
  }
  function confirm() {
    var m = state.modal;
    if (!m || m.kind !== 'book') return;
    if (!m.time || taken(m.doc.id, m.day, m.time)) { m.error = true; m.time = null; paintModal('.vt-slot:not([disabled])'); return; }
    m.ref = 'RDV-' + (1000 + hash(m.doc.id + m.day + m.time + Date.now()) % 9000);
    state.appts.unshift({ ref: m.ref, doc: m.doc.id, date: m.day, time: m.time, mode: m.mode, reason: m.reason });
    state.appts = state.appts.slice(0, 6);
    save();
    m.done = true;
    paintModal('.vt-dialog__foot .btn.primary');
    paintMine(); paintList();
    notify(t('vt.ok.toast', { name: m.doc.name }));
  }
  function goLive() {
    var m = state.modal;
    if (!m || m.kind !== 'call') return;
    m.phase = 'live'; m.started = Date.now(); m.line = 0;
    paintModal('.vt-ctrl--end');
    callTimers.push(global.setInterval(function () {
      var el = doc.getElementById('vtElapsed');
      if (el && state.modal === m) el.textContent = clock(Date.now() - m.started);
    }, 1000));
    callTimers.push(global.setInterval(function () {
      if (state.modal !== m || m.line >= LINES.length - 1) return;
      m.line += 1;
      var el = doc.getElementById('vtCaption');
      if (el) { el.textContent = t('vt.call.' + LINES[m.line]); el.classList.remove('is-in'); void el.offsetWidth; el.classList.add('is-in'); }
    }, 5200));
  }
  function openCall(d, opener, booked) {
    if (d.status === 'offline' && !booked) { notify(t('vt.call.offline', { name: d.name })); openBook(d, opener); return; }
    if (d.status === 'busy' && !booked) notify(t('vt.call.busy', { name: d.name }));
    var m = { kind: 'call', doc: d, phase: 'ringing', started: 0, ended: 0, line: 0, mic: true, cam: true };
    openModal(m, opener);
    callTimers.push(global.setTimeout(goLive, reduced() ? 300 : (d.status === 'busy' && !booked ? 4200 : 2600)));
  }
  function hangup() {
    var m = state.modal;
    if (!m || m.kind !== 'call') return;
    clearCall();
    if (m.phase !== 'live') { closeModal(); return; }
    m.phase = 'ended'; m.ended = Date.now();
    paintModal('.vt-dialog__foot .btn.primary');
  }

  host.addEventListener('click', function (ev) {
    if (ev.target.hasAttribute && ev.target.hasAttribute('data-vt-overlay')) { var mm = state.modal; if (mm && mm.kind === 'call' && mm.phase === 'live') return; closeModal(); return; }
    var el = ev.target.closest ? ev.target.closest('[data-vt-act]') : null;
    if (!el || el.disabled) return;
    var act = el.getAttribute('data-vt-act'), v = el.getAttribute('data-vt-v'), d = doctor(el.getAttribute('data-vt-id')), m = state.modal;
    if (act === 'spec') { state.spec = v === 'all' || SPECS.indexOf(v) >= 0 ? v : 'all'; paintCard(); var c = cardEl.querySelector('[data-vt-act="spec"][data-vt-v="' + state.spec + '"]'); if (c) c.focus(); }
    else if (act === 'book' && d) openBook(d, m ? state.opener : el);
    else if (act === 'call' && d) openCall(d, el, false);
    else if (act === 'join' && d) openCall(d, el, true);
    else if (act === 'cancel') {
      var ref = el.getAttribute('data-vt-ref');
      state.appts = state.appts.filter(function (a) { return a.ref !== ref; });
      save(); paintMine(); paintList(); notify(t('vt.mine.cancelled'));
    }
    else if (act === 'close') { if (m && m.kind === 'call' && m.phase === 'live') hangup(); else closeModal(); }
    else if (act === 'hangup') hangup();
    else if (m && m.kind === 'book' && !m.done) {
      if (act === 'mode' && (v === 'video' || v === 'clinic')) { m.mode = v; paintModal('[data-vt-act="mode"][data-vt-v="' + v + '"]'); }
      else if (act === 'day') { m.day = v; if (m.time && taken(m.doc.id, m.day, m.time)) m.time = null; paintModal('[data-vt-act="day"][data-vt-v="' + v + '"]'); }
      else if (act === 'time' && SLOTS.indexOf(v) >= 0) { m.time = v; m.error = false; paintModal('[data-vt-act="time"][data-vt-v="' + v + '"]'); }
      else if (act === 'confirm') confirm();
    }
    else if (m && m.kind === 'call' && m.phase === 'live' && (act === 'mic' || act === 'cam')) { m[act] = !m[act]; paintModal('[data-vt-act="' + act + '"]'); }
  });
  host.addEventListener('input', function (ev) {
    if (ev.target.id === 'vtSearch') { state.q = ev.target.value.replace(/\s+/g, ' ').slice(0, 60).trim(); paintList(); }
  });
  host.addEventListener('change', function (ev) {
    ev.stopPropagation();               /* keep the host view's own change handler out of it */
    if (ev.target.id === 'vtOnly') { state.onlyOnline = !!ev.target.checked; paintList(); }
    else if (ev.target.id === 'vtReason' && state.modal && REASONS.indexOf(ev.target.value) >= 0) state.modal.reason = ev.target.value;
  });
  host.addEventListener('submit', function (ev) { ev.preventDefault(); ev.stopPropagation(); });
  doc.addEventListener('keydown', function (ev) {
    if (!state.modal) return;
    var dlg = modalEl.querySelector('.vt-dialog');
    if (ev.key === 'Escape') { ev.preventDefault(); if (state.modal.kind === 'call' && state.modal.phase === 'live') hangup(); else closeModal(); return; }
    if (ev.key !== 'Tab' || !dlg) return;
    var f = [].slice.call(dlg.querySelectorAll('button:not([disabled]), select, input, [href]'));
    if (!f.length) { ev.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1];
    if (!dlg.contains(doc.activeElement)) { ev.preventDefault(); first.focus(); }
    else if (ev.shiftKey && doc.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && doc.activeElement === last) { ev.preventDefault(); first.focus(); }
  });

  /* Simulated presence: one doctor changes status from time to time while the view is shown. */
  var tick = 0;
  global.setInterval(function () {
    if (!root.classList.contains('active') && root.offsetParent === null) return;
    if (doc.hidden) return;
    tick += 1;
    var d = DOCTORS[(tick * 3) % DOCTORS.length];
    if (state.modal && state.modal.doc === d) return;
    d.status = d.status === 'online' ? 'busy' : d.status === 'busy' ? 'online' : (tick % 2 ? 'online' : 'offline');
    if (state.onlyOnline) paintList();
    [].forEach.call(host.querySelectorAll('[data-vt-status="' + d.id + '"]'), function (el) {
      el.className = 'vt-status vt-status--' + d.status; el.innerHTML = '<i aria-hidden="true"></i>' + esc(t('vt.st.' + d.status));
    });
    var on = doc.getElementById('vtOnline');
    if (on) on.innerHTML = '<i aria-hidden="true"></i>' + esc(t('vt.online', { n: onlineCount() }));
  }, 14000);

  /* ---- 8. API ------------------------------------------------------------------------ */
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.networkTeam = {
    mount: mount,
    doctors: function () { return DOCTORS.map(function (d) { return { id: d.id, name: d.name, spec: d.spec, status: d.status }; }); },
    book: function (id) { var d = doctor(id); if (d) openBook(d); },
    call: function (id) { var d = doctor(id); if (d) openCall(d, null, false); },
    close: closeModal,
    state: function () {
      var m = state.modal;
      return { spec: state.spec, q: state.q, onlyOnline: state.onlyOnline, appts: state.appts.length,
        modal: m ? { kind: m.kind, doc: m.doc.id, phase: m.phase || (m.done ? 'done' : 'form'), time: m.time || null } : null };
    }
  };
  I18N.onChange(function () { paintCard(); if (state.modal) paintModal(); });
  if (global.NutriBentoViews.network && global.NutriBentoViews.network.render) global.NutriBentoViews.network.render();
  mount();
})(window);
