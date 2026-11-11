/* ==========================================================================
   NUTRI.N°1 — Nutritionist Network view  (SESSION 6)
   Renders <section id="network"> as a Dark Bento grid with two spaces:
   "Patient" (directory, chat, appointment) and "Nutritionist" (patient file, agenda).

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vn-*)
   Preserves  : renderNutritionists(), populateNutritionistCountries(), loadPatientDashboard(),
                sendChat(), startTeleconsultation(), manageAppointments(),
                #patientCareDashboard #nutritionistPatient #patientAccessScope #patientPeriod
                #patientDashboard #nutritionistCountry #nutritionSpecialty #nutritionistResults
                #chat #chatInput
   Note       : demonstration only. Professionals and patients are fictional sample
                profiles; chat replies are automatic; no call, camera or microphone is
                used; nothing is sent anywhere. State lives in memory for the session.
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
      'network.title': 'Nutritionist Network',
      'network.sub': 'Find a nutrition professional, talk securely and follow each consultation from request to follow-up.',
      'network.demo': 'Demonstration · fictional profiles',
      'network.tabs': 'Workspace', 'network.tab.patient': 'I am a patient', 'network.tab.pro': 'I am a nutritionist',
      'network.find.title': 'Find a nutritionist', 'network.find.sub': 'Choose the country, specialty and care mode you need.',
      'network.f.country': 'Country', 'network.f.specialty': 'Specialty', 'network.f.mode': 'Care mode',
      'network.all': 'All specialties', 'network.mode.any': 'Any mode', 'network.mode.chat': 'Chat', 'network.mode.inperson': 'In-person', 'network.mode.video': 'Video consultation',
      'network.results': '{n} professional(s) in {country}',
      'network.none': 'No sample professional matches these filters. Try another specialty or care mode.',
      'network.verified': 'Sample profile',
      'network.request': 'Request appointment', 'network.requested': 'Request sent', 'network.chatwith': 'Chat',
      'network.toast.request': 'Appointment request sent to {name}.',
      'network.chat.title': 'Secure patient chat', 'network.chat.with': 'With {name}', 'network.chat.nobody': 'Choose a professional to start.',
      'network.chat.hello': 'Hello! I have reviewed your nutrition profile. How can I help you today?',
      'network.chat.offer': 'I can also schedule a video consultation if you need a deeper assessment.',
      'network.chat.auto': 'Thank you. Your message has been received; I will review your profile and continue the consultation.',
      'network.chat.autotag': 'Automatic demo reply',
      'network.chat.you': 'You', 'network.chat.pro': 'Nutritionist',
      'network.chat.placeholder': 'Type your message', 'network.chat.label': 'Message', 'network.chat.send': 'Send', 'network.chat.log': 'Conversation',
      'network.flow.title': 'Appointment workflow',
      'network.flow.request': 'Request', 'network.flow.review': 'Review', 'network.flow.confirm': 'Confirm', 'network.flow.reminder': 'Reminder',
      'network.flow.waiting': 'Waiting room', 'network.flow.consult': 'Consultation', 'network.flow.followup': 'Follow-up',
      'network.flow.idle': 'No appointment yet: request one from the directory.',
      'network.flow.status': '{name} · step {n} of 7: {step}',
      'network.flow.done': 'Consultation with {name} completed. Follow-up notes are shared in the chat.',
      'network.flow.next': 'Next step (demo)', 'network.flow.cancel': 'Cancel appointment',
      'network.tele.start': 'Start teleconsultation', 'network.tele.end': 'End consultation',
      'network.tele.need': 'Request an appointment first.',
      'network.tele.room': 'Consultation room', 'network.tele.note': 'Demonstration room: no camera or microphone is used.',
      'network.tele.elapsed': 'Elapsed {time}',
      'network.care.pill': 'CLINICAL WORKSPACE', 'network.care.title': 'Patient Dashboard Access',
      'network.care.sub': 'Select an authorized patient to view nutrition, anthropometric, metabolic and clinical trends.',
      'network.care.badge': 'Consent-based access',
      'network.care.patient': 'Patient', 'network.care.scope': 'Access scope', 'network.care.period': 'Period',
      'network.scope.full': 'Full nutrition profile', 'network.scope.anthro': 'Nutrition & anthropometry', 'network.scope.metabolic': 'Metabolic monitoring', 'network.scope.summary': 'Clinical summary',
      'network.period.30': 'Last 30 days', 'network.period.90': 'Last 90 days', 'network.period.365': 'Last 12 months',
      'network.p.p001': 'Afi Mensah — adult, female', 'network.p.p002': 'Kossi Adjei — adult, male', 'network.p.p003': 'Ama Mensah — child',
      'network.p.female': 'Female', 'network.p.male': 'Male', 'network.p.child': 'Child', 'network.p.years': '{sex} · {age} years',
      'network.s.bmi': 'BMI', 'network.s.waist': 'Waist', 'network.s.glucose': 'Glucose', 'network.s.bp': 'Blood pressure',
      'network.s.latest': 'Latest record', 'network.s.na': 'Not recorded',
      'network.trend.title': 'Patient trend', 'network.trend.bmi': 'BMI trend · {period}', 'network.trend.glucose': 'Glucose trend · {period}',
      'network.trend.aria': '{label}: from {a} to {b}',
      'network.sum.title': 'Nutritionist summary', 'network.sum.trend': 'Trend', 'network.sum.nutrition': 'Nutrition status', 'network.sum.signal': 'Prevention signal',
      'network.v.improving': 'Improving', 'network.v.attention': 'Needs attention', 'network.v.growing': 'Growing',
      'network.v.balanced': 'Balanced', 'network.v.adjust': 'Needs adjustment', 'network.v.growth': 'Growth-supportive',
      'network.v.low': 'Low', 'network.v.moderate': 'Moderate', 'network.v.monitor': 'Monitor growth',
      'network.scope.note': 'Shown under the “{scope}” scope; other data stays hidden.',
      'network.ws.title': 'Nutritionist workspace', 'network.ws.pending': 'Pending requests', 'network.ws.upcoming': 'Upcoming', 'network.ws.unread': 'Unread',
      'network.ws.manage': 'Manage appointments', 'network.ws.hide': 'Hide requests',
      'network.ws.requests': 'Pending requests', 'network.ws.norequests': 'No pending request.',
      'network.ws.accept': 'Accept', 'network.ws.decline': 'Decline',
      'network.ws.accepted': 'Request accepted: {name}.', 'network.ws.declined': 'Request declined: {name}.',
      'network.ws.fromyou': 'Your request to {name}',
      'network.day.mon': 'Mon', 'network.day.tue': 'Tue', 'network.day.wed': 'Wed', 'network.day.thu': 'Thu', 'network.day.fri': 'Fri',
      'network.slot.video': 'Video', 'network.slot.chat': 'Chat', 'network.slot.followup': 'Follow-up', 'network.slot.new': 'New'
    },
    fr: {
      'network.title': 'Réseau de nutritionnistes',
      'network.sub': 'Trouvez un professionnel de la nutrition, échangez en toute sécurité et suivez chaque consultation, de la demande au suivi.',
      'network.demo': 'Démonstration · profils fictifs',
      'network.tabs': 'Espace', 'network.tab.patient': 'Je suis patient', 'network.tab.pro': 'Je suis nutritionniste',
      'network.find.title': 'Trouver un nutritionniste', 'network.find.sub': 'Choisissez le pays, la spécialité et le mode de prise en charge.',
      'network.f.country': 'Pays', 'network.f.specialty': 'Spécialité', 'network.f.mode': 'Mode de prise en charge',
      'network.all': 'Toutes les spécialités', 'network.mode.any': 'Tous les modes', 'network.mode.chat': 'Messagerie', 'network.mode.inperson': 'En présentiel', 'network.mode.video': 'Consultation vidéo',
      'network.results': '{n} professionnel(s) · {country}',
      'network.none': 'Aucun profil d’exemple ne correspond à ces filtres. Essayez une autre spécialité ou un autre mode.',
      'network.verified': 'Profil d’exemple',
      'network.request': 'Demander un rendez-vous', 'network.requested': 'Demande envoyée', 'network.chatwith': 'Discuter',
      'network.toast.request': 'Demande de rendez-vous envoyée à {name}.',
      'network.chat.title': 'Messagerie sécurisée patient', 'network.chat.with': 'Avec {name}', 'network.chat.nobody': 'Choisissez un professionnel pour commencer.',
      'network.chat.hello': 'Bonjour ! J’ai consulté votre profil nutritionnel. Comment puis-je vous aider aujourd’hui ?',
      'network.chat.offer': 'Je peux aussi planifier une consultation vidéo si vous avez besoin d’un bilan plus approfondi.',
      'network.chat.auto': 'Merci. Votre message a bien été reçu ; je vais étudier votre profil et poursuivre la consultation.',
      'network.chat.autotag': 'Réponse automatique de démonstration',
      'network.chat.you': 'Vous', 'network.chat.pro': 'Nutritionniste',
      'network.chat.placeholder': 'Écrivez votre message', 'network.chat.label': 'Message', 'network.chat.send': 'Envoyer', 'network.chat.log': 'Conversation',
      'network.flow.title': 'Parcours du rendez-vous',
      'network.flow.request': 'Demande', 'network.flow.review': 'Examen', 'network.flow.confirm': 'Confirmation', 'network.flow.reminder': 'Rappel',
      'network.flow.waiting': 'Salle d’attente', 'network.flow.consult': 'Consultation', 'network.flow.followup': 'Suivi',
      'network.flow.idle': 'Aucun rendez-vous pour l’instant : faites une demande depuis l’annuaire.',
      'network.flow.status': '{name} · étape {n} sur 7 : {step}',
      'network.flow.done': 'Consultation avec {name} terminée. Les notes de suivi sont partagées dans la messagerie.',
      'network.flow.next': 'Étape suivante (démo)', 'network.flow.cancel': 'Annuler le rendez-vous',
      'network.tele.start': 'Démarrer la téléconsultation', 'network.tele.end': 'Terminer la consultation',
      'network.tele.need': 'Demandez d’abord un rendez-vous.',
      'network.tele.room': 'Salle de consultation', 'network.tele.note': 'Salle de démonstration : ni caméra ni micro ne sont utilisés.',
      'network.tele.elapsed': 'Durée {time}',
      'network.care.pill': 'ESPACE CLINIQUE', 'network.care.title': 'Accès au dossier patient',
      'network.care.sub': 'Sélectionnez un patient autorisé pour consulter ses tendances nutritionnelles, anthropométriques, métaboliques et cliniques.',
      'network.care.badge': 'Accès soumis au consentement',
      'network.care.patient': 'Patient', 'network.care.scope': 'Périmètre d’accès', 'network.care.period': 'Période',
      'network.scope.full': 'Profil nutritionnel complet', 'network.scope.anthro': 'Nutrition et anthropométrie', 'network.scope.metabolic': 'Suivi métabolique', 'network.scope.summary': 'Synthèse clinique',
      'network.period.30': '30 derniers jours', 'network.period.90': '90 derniers jours', 'network.period.365': '12 derniers mois',
      'network.p.p001': 'Afi Mensah — adulte, femme', 'network.p.p002': 'Kossi Adjei — adulte, homme', 'network.p.p003': 'Ama Mensah — enfant',
      'network.p.female': 'Femme', 'network.p.male': 'Homme', 'network.p.child': 'Enfant', 'network.p.years': '{sex} · {age} ans',
      'network.s.bmi': 'IMC', 'network.s.waist': 'Tour de taille', 'network.s.glucose': 'Glycémie', 'network.s.bp': 'Tension artérielle',
      'network.s.latest': 'Dernière mesure', 'network.s.na': 'Non renseigné',
      'network.trend.title': 'Tendance du patient', 'network.trend.bmi': 'Tendance de l’IMC · {period}', 'network.trend.glucose': 'Tendance de la glycémie · {period}',
      'network.trend.aria': '{label} : de {a} à {b}',
      'network.sum.title': 'Synthèse du nutritionniste', 'network.sum.trend': 'Tendance', 'network.sum.nutrition': 'État nutritionnel', 'network.sum.signal': 'Signal de prévention',
      'network.v.improving': 'En amélioration', 'network.v.attention': 'À surveiller', 'network.v.growing': 'En croissance',
      'network.v.balanced': 'Équilibré', 'network.v.adjust': 'À ajuster', 'network.v.growth': 'Favorable à la croissance',
      'network.v.low': 'Faible', 'network.v.moderate': 'Modéré', 'network.v.monitor': 'Surveiller la croissance',
      'network.scope.note': 'Affiché selon le périmètre « {scope} » ; les autres données restent masquées.',
      'network.ws.title': 'Espace du nutritionniste', 'network.ws.pending': 'Demandes en attente', 'network.ws.upcoming': 'À venir', 'network.ws.unread': 'Non lus',
      'network.ws.manage': 'Gérer les rendez-vous', 'network.ws.hide': 'Masquer les demandes',
      'network.ws.requests': 'Demandes en attente', 'network.ws.norequests': 'Aucune demande en attente.',
      'network.ws.accept': 'Accepter', 'network.ws.decline': 'Refuser',
      'network.ws.accepted': 'Demande acceptée : {name}.', 'network.ws.declined': 'Demande refusée : {name}.',
      'network.ws.fromyou': 'Votre demande à {name}',
      'network.day.mon': 'Lun', 'network.day.tue': 'Mar', 'network.day.wed': 'Mer', 'network.day.thu': 'Jeu', 'network.day.fri': 'Ven',
      'network.slot.video': 'Vidéo', 'network.slot.chat': 'Messagerie', 'network.slot.followup': 'Suivi', 'network.slot.new': 'Nouveau'
    }
  });

  /* ---- 2. Model (fictional sample data) --------------------------------- */
  var SPECS = ['clinical', 'diabetes', 'maternal', 'pediatric', 'ncd', 'renal', 'cardio', 'sports', 'public', 'food'];
  var MODES = ['chat', 'inperson', 'video'];
  var NAMES = ['Dr. Amina Diallo', 'Dr. Kwame Mensah', 'Dr. Elise Koffi', 'Dr. Awa Diop', 'Dr. Ibrahim Camara', 'Dr. Mariam Koné',
    'Dr. Chinedu Okafor', 'Dr. Fatou Sow', 'Dr. Jean Kaboré', 'Dr. Afi Lawson', 'Dr. Moussa Bah', 'Dr. Grace Owusu'];
  var MODE_SETS = [['chat', 'inperson', 'video'], ['chat', 'video'], ['inperson', 'chat']];
  var COUNTRY_CODES = (I18N.countries || []).map(function (c) { return c.code; });
  if (!COUNTRY_CODES.length) COUNTRY_CODES = ['TG'];
  function directory(code) {
    var ci = Math.max(0, COUNTRY_CODES.indexOf(code)), out = [];
    for (var k = 0; k < 3; k++) {
      var specs = [];
      for (var j = 0; j < 3; j++) { var s = SPECS[(ci * 2 + k * 3 + j * 4) % SPECS.length]; if (specs.indexOf(s) < 0) specs.push(s); }
      out.push({ id: code + '-' + k, name: NAMES[(ci * 3 + k) % NAMES.length], country: code, specs: specs, modes: MODE_SETS[k] });
    }
    return out;
  }
  var PATIENTS = {
    p001: { name: 'Afi Mensah', sex: 'female', age: 34, bmi: 24.8, waist: 79, glucose: 5.2, bp: '118/76', trend: 'improving', nutrition: 'balanced', signal: 'low', drift: 0.6 },
    p002: { name: 'Kossi Adjei', sex: 'male', age: 41, bmi: 28.1, waist: 96, glucose: 6.0, bp: '132/84', trend: 'attention', nutrition: 'adjust', signal: 'moderate', drift: -0.5 },
    p003: { name: 'Ama Mensah', sex: 'child', age: 7, bmi: 15.8, waist: null, glucose: null, bp: '104/68', trend: 'growing', nutrition: 'growth', signal: 'monitor', drift: -0.3 }
  };
  var SCOPES = ['full', 'anthro', 'metabolic', 'summary'];
  var PERIODS = ['30', '90', '365'];
  var FLOW = ['request', 'review', 'confirm', 'reminder', 'waiting', 'consult', 'followup'];
  var CALENDAR = [['mon', '09:00', 'video'], ['tue', '11:30', 'chat'], ['wed', '15:00', 'video'], ['thu', '10:00', 'followup'], ['fri', '14:00', 'video']];

  function headerCountry() { var sel = doc.getElementById('country'); return (sel && COUNTRY_CODES.indexOf(sel.value) >= 0) ? sel.value : COUNTRY_CODES[0]; }
  function initialTab() {
    var shell = global.NutriBentoShell, role = (shell && shell.role) || global.selectedRole;
    return role === 'nutritionist' ? 'pro' : 'patient';
  }
  var state = {
    tab: initialTab(), country: headerCountry(), spec: 'all', mode: 'any',
    partner: null, messages: [{ from: 'pro', key: 'network.chat.hello' }, { from: 'pro', key: 'network.chat.offer' }],
    appt: null,                       /* { pro, step 0–6, done } */
    tele: null,                       /* { started } */
    patient: 'p001', scope: 'full', period: '30',
    requests: [{ id: 'r1', name: 'Kossi Adjei', slot: 'video' }, { id: 'r2', name: 'Afi Mensah', slot: 'chat' }, { id: 'r3', name: 'Ama Mensah', slot: 'followup' }],
    upcoming: 4, unread: 5, manage: false
  };

  /* ---- 3. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function num(v, digits) { try { return Number(v).toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }); } catch (e) { return Number(v).toFixed(digits); } }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function notify(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }
  function findPro(id) { var list = directory(String(id).split('-')[0]); for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function clock(ms) { var s = Math.max(0, Math.floor(ms / 1000)), m = Math.floor(s / 60); s = s % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  var PATHS = {
    people: '<circle cx="9" cy="8" r="3.200"/><path d="M3 20c0-3.300 2.700-5.500 6-5.500s6 2.200 6 5.500M16 5.200a3.200 3.200 0 0 1 0 5.800M21 20c0-2.600-1.500-4.500-3.800-5.200"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4 4"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    flow: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8.500 3v4M15.500 3v4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.500"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    file: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    trend: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
    pin: '<path d="M12 21s7-6.200 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
    user: '<circle cx="12" cy="8" r="3.600"/><path d="M5 20c0-3.600 3.100-6 7-6s7 2.400 7 6"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra) {
    return '<header class="vn-card__head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3>' + (extra || '') + '</header>';
  }
  function select(id, label, options, value, attr) {
    return '<label class="vn-field"><span>' + esc(label) + '</span><select id="' + id + '" ' + attr + '>' + options.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select></label>';
  }

  /* ---- 4. Patient space --------------------------------------------------- */
  function results() {
    var list = directory(state.country).filter(function (p) {
      return (state.spec === 'all' || p.specs.indexOf(state.spec) >= 0) && (state.mode === 'any' || p.modes.indexOf(state.mode) >= 0);
    });
    var summary = '<p class="vn-count" role="status">' + esc(t('network.results', { n: list.length, country: cname(state.country) })) + '</p>';
    if (!list.length) return summary + '<p class="vn-empty">' + esc(t('network.none')) + '</p>';
    return summary + '<ul class="vn-pros">' + list.map(function (p) {
      var asked = state.appt && state.appt.pro.id === p.id;
      return '<li class="vn-pro' + (state.partner && state.partner.id === p.id ? ' is-on' : '') + '">' +
        '<div class="vn-pro__top"><span class="vn-avatar" aria-hidden="true">' + esc(p.name.replace('Dr. ', '').charAt(0)) + '</span>' +
          '<div><b>' + esc(p.name) + '</b><small>' + ico('pin') + esc(cname(p.country)) + ' · ' + esc(t('network.verified')) + '</small></div></div>' +
        '<ul class="vn-tags">' + p.specs.map(function (s) { return '<li>' + esc(t('home.spec.' + s)) + '</li>'; }).join('') + '</ul>' +
        '<p class="vn-modes">' + p.modes.map(function (m) { return esc(t('network.mode.' + m)); }).join(' · ') + '</p>' +
        '<div class="vn-actions"><button type="button" class="btn primary" data-vn-act="request" data-vn-id="' + p.id + '"' + (asked ? ' disabled' : '') + '>' +
          esc(t(asked ? 'network.requested' : 'network.request')) + '</button>' +
          '<button type="button" class="btn secondary" data-vn-act="chat" data-vn-id="' + p.id + '">' + ico('chat') + '<span>' + esc(t('network.chatwith')) + '</span></button></div></li>';
    }).join('') + '</ul>';
  }
  function findCard() {
    var countries = COUNTRY_CODES.map(function (c) { return [c, cname(c)]; });
    var specs = [['all', t('network.all')]].concat(SPECS.map(function (s) { return [s, t('home.spec.' + s)]; }));
    var modes = [['any', t('network.mode.any')]].concat(MODES.map(function (m) { return [m, t('network.mode.' + m)]; }));
    return '<article class="card vn-find">' + head('search', t('network.find.title')) +
      '<p class="vn-sub">' + esc(t('network.find.sub')) + '</p>' +
      '<div class="vn-filters">' + select('nutritionistCountry', t('network.f.country'), countries, state.country, 'data-vn-field="country"') +
        select('nutritionSpecialty', t('network.f.specialty'), specs, state.spec, 'data-vn-field="spec"') +
        select('vnMode', t('network.f.mode'), modes, state.mode, 'data-vn-field="mode"') + '</div>' +
      '<div id="nutritionistResults" class="vn-results">' + results() + '</div></article>';
  }
  function messages() {
    return state.messages.map(function (m) {
      var who = m.from === 'me' ? t('network.chat.you') : (state.partner ? state.partner.name : t('network.chat.pro'));
      return '<div class="msg vn-msg vn-msg--' + m.from + '"><span class="vn-msg__who">' + esc(who) + (m.auto ? ' · ' + esc(t('network.chat.autotag')) : '') + '</span>' +
        '<p>' + esc(m.key ? t(m.key) : m.text) + '</p></div>';
    }).join('');
  }
  function chatCard() {
    return '<article class="card vn-chat">' + head('chat', t('network.chat.title')) +
      '<p class="vn-sub" id="vnChatWith">' + esc(state.partner ? t('network.chat.with', { name: state.partner.name }) : t('network.chat.nobody')) + '</p>' +
      '<div class="chat vn-chatlog" id="chat" role="log" aria-live="polite" aria-label="' + esc(t('network.chat.log')) + '" tabindex="0">' + messages() + '</div>' +
      '<form class="vn-chatform" data-vn-chat><label class="vn-sr" for="chatInput">' + esc(t('network.chat.label')) + '</label>' +
        '<input id="chatInput" type="text" autocomplete="off" maxlength="500" placeholder="' + esc(t('network.chat.placeholder')) + '">' +
        '<button type="submit" class="btn primary">' + ico('send') + '<span>' + esc(t('network.chat.send')) + '</span></button></form></article>';
  }
  function flowStatus() {
    var a = state.appt;
    if (!a) return t('network.flow.idle');
    if (a.done) return t('network.flow.done', { name: a.pro.name });
    return t('network.flow.status', { name: a.pro.name, n: a.step + 1, step: t('network.flow.' + FLOW[a.step]) });
  }
  function teleRoom() {
    if (!state.tele) return '';
    var a = state.appt;
    return '<div class="vn-room"><div class="vn-room__stage"><span class="vn-avatar vn-avatar--xl" aria-hidden="true">' + esc(a.pro.name.replace('Dr. ', '').charAt(0)) + '</span>' +
      '<b>' + esc(a.pro.name) + '</b><span id="vnElapsed">' + esc(t('network.tele.elapsed', { time: clock(Date.now() - state.tele.started) })) + '</span></div>' +
      '<p class="vn-note">' + esc(t('network.tele.note')) + '</p>' +
      '<button type="button" class="btn danger" data-vn-act="tele-end">' + esc(t('network.tele.end')) + '</button></div>';
  }
  function flowCard() {
    var a = state.appt;
    var steps = FLOW.map(function (s, i) {
      var cls = 'step';
      if (!a) { if (i === 0) cls += ' active'; }
      else if (a.done || i < a.step) cls += ' done';
      else if (i === a.step) cls += ' active';
      return '<li class="' + cls + '"' + (cls.indexOf('active') > 0 ? ' aria-current="step"' : '') + '><i>' + (cls.indexOf('done') > 0 ? ico('check') : (i + 1)) + '</i><span>' + esc(t('network.flow.' + s)) + '</span></li>';
    }).join('');
    var actions = '';
    if (a && !a.done && !state.tele) {
      actions = '<button type="button" class="btn secondary" data-vn-act="flow-next">' + esc(t('network.flow.next')) + '</button>' +
        '<button type="button" class="btn primary" data-vn-act="tele-start">' + ico('video') + '<span>' + esc(t('network.tele.start')) + '</span></button>' +
        '<button type="button" class="btn secondary" data-vn-act="flow-cancel">' + esc(t('network.flow.cancel')) + '</button>';
    }
    return '<article class="card vn-flow">' + head('flow', t('network.flow.title')) +
      '<ol class="wizard vn-wizard">' + steps + '</ol>' +
      '<p class="vn-status" id="vnFlowStatus" role="status" aria-live="polite">' + esc(flowStatus()) + '</p>' +
      teleRoom() + (actions ? '<div class="vn-actions vn-actions--row">' + actions + '</div>' : '') + '</article>';
  }

  /* ---- 5. Nutritionist space ----------------------------------------------- */
  function series(p, metric) {
    var n = state.period === '30' ? 6 : state.period === '90' ? 9 : 12, end = p[metric], out = [];
    var scale = metric === 'bmi' ? 1 : 0.5, span = p.drift * scale * (state.period === '30' ? 1 : state.period === '90' ? 1.8 : 3);
    for (var i = 0; i < n; i++) {
      var x = i / (n - 1), wobble = Math.sin((i + 1) * 2.3 + end) * 0.08 * scale * (i === n - 1 ? 0 : 1);
      out.push(end + span * (1 - x) + wobble);
    }
    return out;
  }
  function trendChart(p, metric) {
    var vals = series(p, metric), W = 560, H = 170, pad = { t: 18, r: 14, b: 14, l: 14 };
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), range = (max - min) || 1;
    var pts = vals.map(function (v, i) { return [pad.l + (W - pad.l - pad.r) * i / (vals.length - 1), pad.t + (H - pad.t - pad.b) * (1 - (v - min) / range)]; });
    var d = pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    var last = pts[pts.length - 1], label = t('network.trend.' + metric, { period: t('network.period.' + state.period) });
    return '<figure class="vn-trend"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' +
      esc(t('network.trend.aria', { label: label, a: num(vals[0], 1), b: num(vals[vals.length - 1], 1) })) + '">' +
      '<path d="' + d + ' L' + last[0].toFixed(1) + ' ' + (H - 2) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - 2) + ' Z" fill="#D2F85A" opacity=".12"/>' +
      '<path d="' + d + '" fill="none" stroke="#D2F85A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="5" fill="#2B2C31" stroke="#D2F85A" stroke-width="3"/></svg>' +
      '<figcaption><span>' + esc(label) + '</span><b>' + num(vals[0], 1) + ' → ' + num(vals[vals.length - 1], 1) + '</b></figcaption></figure>';
  }
  function patientDashboard() {
    var p = PATIENTS[state.patient] || PATIENTS.p001, sc = state.scope;
    var show = { bmi: sc === 'full' || sc === 'anthro', waist: sc === 'full' || sc === 'anthro', glucose: sc === 'full' || sc === 'metabolic', bp: sc === 'full' || sc === 'metabolic' };
    var stat = function (key, value) {
      return '<div class="vn-stat"><span>' + esc(t('network.s.' + key)) + '</span><b>' + esc(value == null ? '—' : value) + '</b><small>' + esc(t(value == null ? 'network.s.na' : 'network.s.latest')) + '</small></div>';
    };
    var stats = '<div class="vn-stat vn-stat--id"><span>' + esc(t('network.care.patient')) + '</span><b>' + esc(p.name) + '</b><small>' +
      esc(t('network.p.years', { sex: t('network.p.' + p.sex), age: p.age })) + '</small></div>';
    if (show.bmi) stats += stat('bmi', num(p.bmi, 1) + ' kg/m²');
    if (show.waist) stats += stat('waist', p.waist == null ? null : num(p.waist, 0) + ' cm');
    if (show.glucose) stats += stat('glucose', p.glucose == null ? null : num(p.glucose, 1) + ' mmol/L');
    if (show.bp) stats += stat('bp', p.bp + ' mmHg');
    var metric = sc === 'metabolic' && p.glucose != null ? 'glucose' : (sc === 'metabolic' ? null : 'bmi');
    var trend = sc !== 'summary' && metric ? '<div class="vn-block">' + head('trend', t('network.trend.title')) + trendChart(p, metric) + '</div>' : '';
    var rows = [];
    if (sc !== 'anthro') rows.push(['trend', 'network.v.' + p.trend]);
    if (sc !== 'metabolic') rows.push(['nutrition', 'network.v.' + p.nutrition]);
    if (sc !== 'anthro') rows.push(['signal', 'network.v.' + p.signal]);
    var summary = '<div class="vn-block">' + head('file', t('network.sum.title')) + '<dl class="vn-sum">' + rows.map(function (r) {
      return '<div><dt>' + esc(t('network.sum.' + r[0])) + '</dt><dd>' + esc(t(r[1])) + '</dd></div>';
    }).join('') + '</dl></div>';
    return '<div class="vn-stats">' + stats + '</div><div class="vn-blocks' + (trend ? '' : ' vn-blocks--one') + '">' + trend + summary + '</div>' +
      (sc === 'full' ? '' : '<p class="vn-note">' + ico('lock') + esc(t('network.scope.note', { scope: t('network.scope.' + sc) })) + '</p>');
  }
  function careCard() {
    return '<article class="card vn-care patient-care-panel" id="patientCareDashboard">' +
      '<div class="vn-care__head"><div><span class="pill vn-pill">' + esc(t('network.care.pill')) + '</span><h3>' + esc(t('network.care.title')) + '</h3>' +
        '<p class="vn-sub">' + esc(t('network.care.sub')) + '</p></div><span class="pill vn-badge">' + ico('lock') + esc(t('network.care.badge')) + '</span></div>' +
      '<div class="vn-filters">' +
        select('nutritionistPatient', t('network.care.patient'), Object.keys(PATIENTS).map(function (id) { return [id, t('network.p.' + id)]; }), state.patient, 'data-vn-field="patient"') +
        select('patientAccessScope', t('network.care.scope'), SCOPES.map(function (s) { return [s, t('network.scope.' + s)]; }), state.scope, 'data-vn-field="scope"') +
        select('patientPeriod', t('network.care.period'), PERIODS.map(function (s) { return [s, t('network.period.' + s)]; }), state.period, 'data-vn-field="period"') + '</div>' +
      '<div id="patientDashboard" class="patient-dashboard vn-dash">' + patientDashboard() + '</div></article>';
  }
  function workspaceCard() {
    var counters = [['pending', state.requests.length], ['upcoming', state.upcoming], ['unread', state.unread]].map(function (c) {
      return '<div class="vn-counter"><b>' + c[1] + '</b><span>' + esc(t('network.ws.' + c[0])) + '</span></div>';
    }).join('');
    var days = CALENDAR.map(function (d) {
      return '<li class="vn-day"><b>' + esc(t('network.day.' + d[0])) + '</b><span>' + d[1] + '</span><small>' + esc(t('network.slot.' + d[2])) + '</small></li>';
    }).join('');
    var requests = '';
    if (state.manage) {
      requests = '<div class="vn-requests" id="vnRequests"><h4 tabindex="-1" data-vn-focus>' + esc(t('network.ws.requests')) + '</h4>' +
        (state.requests.length ? '<ul>' + state.requests.map(function (r) {
          var label = r.mine ? t('network.ws.fromyou', { name: r.name }) : r.name;
          return '<li><div><b>' + esc(label) + '</b><small>' + esc(t('network.slot.' + r.slot)) + '</small></div>' +
            '<button type="button" class="btn primary" data-vn-act="accept" data-vn-id="' + r.id + '">' + esc(t('network.ws.accept')) + '</button>' +
            '<button type="button" class="btn secondary" data-vn-act="decline" data-vn-id="' + r.id + '">' + esc(t('network.ws.decline')) + '</button></li>';
        }).join('') + '</ul>' : '<p class="vn-empty">' + esc(t('network.ws.norequests')) + '</p>') + '</div>';
    }
    return '<article class="card vn-ws">' + head('calendar', t('network.ws.title')) +
      '<div class="vn-counters">' + counters + '</div><ul class="vn-days">' + days + '</ul>' +
      '<div class="vn-actions vn-actions--row"><button type="button" class="btn primary" data-vn-act="manage" aria-expanded="' + (state.manage ? 'true' : 'false') + '" aria-controls="vnRequests">' +
        esc(t(state.manage ? 'network.ws.hide' : 'network.ws.manage')) + '</button></div>' + requests + '</article>';
  }

  /* ---- 6. Template ----------------------------------------------------------- */
  function template() {
    var tab = function (id) {
      var on = state.tab === id;
      return '<button type="button" role="tab" id="vnTab-' + id + '" aria-selected="' + on + '" aria-controls="vnPanel-' + id + '" tabindex="' + (on ? 0 : -1) + '" class="vn-tab' + (on ? ' is-on' : '') + '" data-vn-tab="' + id + '">' +
        ico(id === 'patient' ? 'user' : 'file') + '<span>' + esc(t('network.tab.' + id)) + '</span></button>';
    };
    return '<div class="vn">' +
      '<article class="card vn-hero"><div class="vh-head"><div class="vn-hero__title"><span class="vh-ico">' + ico('people') + '</span>' +
        '<div><h2>' + esc(t('network.title')) + '</h2><p class="muted">' + esc(t('network.sub')) + '</p></div></div>' +
        '<span class="pill vn-demo">' + esc(t('network.demo')) + '</span></div>' +
        '<div class="vn-tabs" role="tablist" aria-label="' + esc(t('network.tabs')) + '">' + tab('patient') + tab('pro') + '</div></article>' +
      '<div class="vn-panel vn-panel--patient" role="tabpanel" id="vnPanel-patient" aria-labelledby="vnTab-patient"' + (state.tab === 'patient' ? '' : ' hidden') + '>' +
        findCard() + chatCard() + flowCard() + '</div>' +
      '<div class="vn-panel vn-panel--pro" role="tabpanel" id="vnPanel-pro" aria-labelledby="vnTab-pro"' + (state.tab === 'pro' ? '' : ' hidden') + '>' +
        careCard() + workspaceCard() + '</div>' +
      '</div>';
  }

  /* ---- 7. Render ---------------------------------------------------------------- */
  function selectorOf(el) {
    if (!el || !root.contains(el) || !el.getAttribute) return null;
    if (el.id) return '#' + el.id;
    var act = el.getAttribute('data-vn-act'), id = el.getAttribute('data-vn-id'), tab = el.getAttribute('data-vn-tab');
    if (tab) return '[data-vn-tab="' + tab + '"]';
    if (act) return '[data-vn-act="' + act + '"]' + (id ? '[data-vn-id="' + id + '"]' : '');
    return null;
  }
  function render(focusSel) {
    var keep = focusSel || selectorOf(doc.activeElement);
    var input = doc.getElementById('chatInput'), draft = input ? input.value : '';
    root.innerHTML = template();
    input = doc.getElementById('chatInput'); if (input && draft) input.value = draft;
    scrollChat();
    var target = keep ? root.querySelector(keep) : null;
    if (target && !target.disabled && target.offsetParent !== null) { try { target.focus({ preventScroll: !focusSel }); } catch (e) { target.focus(); } }
  }
  function scrollChat() { var log = doc.getElementById('chat'); if (log) log.scrollTop = log.scrollHeight; }
  function paintResults() { var out = doc.getElementById('nutritionistResults'); if (out) out.innerHTML = results(); }
  function paintDashboard() { var out = doc.getElementById('patientDashboard'); if (out) out.innerHTML = patientDashboard(); }
  function paintChat() {
    var log = doc.getElementById('chat'), who = doc.getElementById('vnChatWith');
    if (log) log.innerHTML = messages();
    if (who) who.textContent = state.partner ? t('network.chat.with', { name: state.partner.name }) : t('network.chat.nobody');
    scrollChat();
  }

  /* ---- 8. Actions ------------------------------------------------------------------ */
  var replyTimer = null, teleTimer = null;
  function setTab(id, focus) { if (id !== 'patient' && id !== 'pro') return; state.tab = id; render(focus ? '[data-vn-tab="' + id + '"]' : null); }
  function request(pro) {
    stopTele();
    state.appt = { pro: pro, step: 0, done: false };
    state.partner = pro;
    state.requests = state.requests.filter(function (r) { return !r.mine; });
    state.requests.push({ id: 'mine', name: pro.name, slot: 'new', mine: true });
    render('[data-vn-act="chat"][data-vn-id="' + pro.id + '"]');
    notify(t('network.toast.request', { name: pro.name }));
  }
  function send() {
    var input = doc.getElementById('chatInput'); if (!input) return false;
    var text = input.value.replace(/\s+/g, ' ').trim();
    if (!text) { input.focus(); return false; }
    state.messages.push({ from: 'me', text: text.slice(0, 500) });
    input.value = '';
    paintChat();
    if (replyTimer) global.clearTimeout(replyTimer);
    replyTimer = global.setTimeout(function () { replyTimer = null; state.messages.push({ from: 'pro', key: 'network.chat.auto', auto: true }); paintChat(); }, 700);
    return true;
  }
  function stopTele() { if (teleTimer) { global.clearInterval(teleTimer); teleTimer = null; } state.tele = null; }
  function startTele() {
    if (!state.appt || state.appt.done) { notify(t('network.tele.need')); if (state.tab !== 'patient') setTab('patient'); return false; }
    if (state.tele) return true;
    state.tab = 'patient';
    state.appt.step = FLOW.indexOf('consult');
    state.tele = { started: Date.now() };
    render('[data-vn-act="tele-end"]');
    teleTimer = global.setInterval(function () {
      var el = doc.getElementById('vnElapsed');
      if (el && state.tele) el.textContent = t('network.tele.elapsed', { time: clock(Date.now() - state.tele.started) });
    }, 1000);
    return true;
  }
  function endTele() {
    stopTele();
    if (state.appt) { state.appt.step = FLOW.length - 1; state.appt.done = true; state.requests = state.requests.filter(function (r) { return !r.mine; }); }
    render('#vnFlowStatus');
  }
  function advance() {
    var a = state.appt; if (!a || a.done) return;
    if (a.step >= FLOW.length - 1) { a.done = true; state.requests = state.requests.filter(function (r) { return !r.mine; }); }
    else a.step += 1;
    render('[data-vn-act="flow-next"]');
  }
  function manage() { state.manage = !state.manage; if (state.tab !== 'pro') state.tab = 'pro'; render(state.manage ? '[data-vn-focus]' : '[data-vn-act="manage"]'); return state.manage; }
  function decide(id, accept) {
    var r = null; state.requests.forEach(function (x) { if (x.id === id) r = x; });
    if (!r) return;
    state.requests = state.requests.filter(function (x) { return x.id !== id; });
    if (accept) state.upcoming += 1;
    if (r.mine && state.appt && !state.appt.done) {
      if (accept) state.appt.step = Math.max(state.appt.step, FLOW.indexOf('confirm'));
      else { stopTele(); state.appt = null; }
    }
    render('[data-vn-focus]');
    notify(t(accept ? 'network.ws.accepted' : 'network.ws.declined', { name: r.name }));
  }

  root.addEventListener('click', function (ev) {
    var tabEl = ev.target.closest ? ev.target.closest('[data-vn-tab]') : null;
    if (tabEl && root.contains(tabEl)) { setTab(tabEl.getAttribute('data-vn-tab'), true); return; }
    var el = ev.target.closest ? ev.target.closest('[data-vn-act]') : null;
    if (!el || !root.contains(el) || el.disabled) return;
    var act = el.getAttribute('data-vn-act'), id = el.getAttribute('data-vn-id');
    if (act === 'request') { var p = findPro(id); if (p) request(p); }
    else if (act === 'chat') { var q = findPro(id); if (q) { state.partner = q; render('#chatInput'); } }
    else if (act === 'flow-next') advance();
    else if (act === 'flow-cancel') { stopTele(); state.appt = null; state.requests = state.requests.filter(function (r) { return !r.mine; }); render('#vnFlowStatus'); }
    else if (act === 'tele-start') startTele();
    else if (act === 'tele-end') endTele();
    else if (act === 'manage') manage();
    else if (act === 'accept' || act === 'decline') decide(id, act === 'accept');
  });
  root.addEventListener('keydown', function (ev) {
    var tabEl = ev.target.closest ? ev.target.closest('[data-vn-tab]') : null;
    if (!tabEl) return;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'Home' || ev.key === 'End') {
      ev.preventDefault();
      setTab(ev.key === 'Home' ? 'patient' : ev.key === 'End' ? 'pro' : (state.tab === 'patient' ? 'pro' : 'patient'), true);
    }
  });
  root.addEventListener('change', function (ev) {
    var el = ev.target, key = el && el.getAttribute && el.getAttribute('data-vn-field');
    if (!key) return;
    if (key === 'country' && COUNTRY_CODES.indexOf(el.value) >= 0) { state.country = el.value; paintResults(); }
    else if (key === 'spec' && (el.value === 'all' || SPECS.indexOf(el.value) >= 0)) { state.spec = el.value; paintResults(); }
    else if (key === 'mode' && (el.value === 'any' || MODES.indexOf(el.value) >= 0)) { state.mode = el.value; paintResults(); }
    else if (key === 'patient' && PATIENTS[el.value]) { state.patient = el.value; paintDashboard(); }
    else if (key === 'scope' && SCOPES.indexOf(el.value) >= 0) { state.scope = el.value; paintDashboard(); }
    else if (key === 'period' && PERIODS.indexOf(el.value) >= 0) { state.period = el.value; paintDashboard(); }
  });
  root.addEventListener('submit', function (ev) { ev.preventDefault(); send(); });
  doc.addEventListener('nutri:countryChanged', function () { state.country = headerCountry(); render(); });

  /* ---- 9. Legacy API (index.html delegates its old functions here) -------------------- */
  function syncFromDom() {
    var map = { nutritionistCountry: 'country', nutritionSpecialty: 'spec', nutritionistPatient: 'patient', patientAccessScope: 'scope', patientPeriod: 'period' };
    Object.keys(map).forEach(function (id) { var el = doc.getElementById(id); if (el && el.value) state[map[id]] = el.value; });
    if (COUNTRY_CODES.indexOf(state.country) < 0) state.country = headerCountry();
    if (state.spec !== 'all' && SPECS.indexOf(state.spec) < 0) state.spec = 'all';
    if (!PATIENTS[state.patient]) state.patient = 'p001';
    if (SCOPES.indexOf(state.scope) < 0) state.scope = 'full';
    if (PERIODS.indexOf(state.period) < 0) state.period = '30';
  }
  var api = {
    render: render, setTab: setTab,
    renderNutritionists: function () { syncFromDom(); paintResults(); },
    populateNutritionistCountries: function () { state.country = headerCountry(); render(); },
    loadPatientDashboard: function () { syncFromDom(); paintDashboard(); },
    sendChat: send, startTeleconsultation: startTele, manageAppointments: manage,
    state: function () {
      return { tab: state.tab, country: state.country, spec: state.spec, mode: state.mode, partner: state.partner && state.partner.id, messages: state.messages.length,
        appt: state.appt ? { pro: state.appt.pro.id, step: state.appt.step, done: state.appt.done } : null, tele: !!state.tele,
        patient: state.patient, scope: state.scope, period: state.period, requests: state.requests.length, upcoming: state.upcoming, manage: state.manage };
    }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.network = api;
  function hook() {
    global.sendChat = api.sendChat;
    global.startTeleconsultation = api.startTeleconsultation;
    global.manageAppointments = api.manageAppointments;
  }

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'network');
  render();
  hook();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { hook(); state.country = headerCountry(); state.tab = initialTab(); render(); });
  global.addEventListener('load', hook);
  I18N.onChange(function () { render(); });
})(window);
