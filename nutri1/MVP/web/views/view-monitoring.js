/* ==========================================================================
   NUTRI.N°1 — Projects, Surveys & Nutrition Surveillance view  (SESSION 16)
   Renders <section id="monitoring"> as a Dark Bento workspace built around a
   small working register: projects, surveys and surveillance systems are typed
   in, kept on this device and moved through the monitoring and evaluation cycle.

   Depends on : js/bento-i18n.js, js/bento-shell.js
   Storage    : localStorage.nutri_projects = [{id, name, type, country, stage, indicators, at}]
   Styles     : styles/views.css  (shared .vi-* institution components)
   Preserves  : renderMonitoring(), #meProjects, #meSurveys, #meIndicators,
                #meQuality, #meEval, #meIndicatorPanel, #meAlerts
   Note       : removed because they were invented: the counters (24 projects,
                18 surveys, 286 indicators, 92% quality, 14 evaluation ready), the
                78% cycle bar, the "88% coverage / 76% target achievement" rows,
                the map pins, the three quality sentences and the three buttons
                that only showed a message. Nothing is sent to a server.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('monitoring');
  if (!root || !I18N) return;

  I18N.register({
    en: {
      'me.kicker': 'NUTRI.N°1 · MONITORING, EVALUATION & SURVEILLANCE', 'me.title': 'Projects, Surveys & Nutrition Surveillance',
      'me.sub': 'A register of projects, surveys and surveillance systems, followed from baseline to impact.',
      'me.demo': 'Local register · nothing is sent',
      'me.kpis': 'Headline indicators',
      'me.k.projects': 'Records in the register', 'me.k.surveys': 'Surveys and surveillance', 'me.k.indicators': 'Indicators declared',
      'me.k.eval': 'At endline or impact', 'me.k.quality': 'Data quality',
      'me.k.local': 'Kept on this device', 'me.k.sum': 'Sum of the declared numbers', 'me.k.none': 'Not connected',
      'me.reg.title': 'Register', 'me.reg.sub': 'Move each record through the cycle as the work advances.',
      'me.reg.count': 'Records: {n}',
      'me.reg.empty': 'The register is empty. Add a project, a survey or a surveillance system with the form.',
      'me.reg.meta': '{type} · {country}', 'me.reg.ind': 'Indicators: {n}',
      'me.reg.stage': 'Stage {i} of {n}: {stage}',
      'me.reg.prev': 'Previous stage', 'me.reg.next': 'Next stage', 'me.reg.del': 'Delete', 'me.reg.confirm': 'Confirm deletion', 'me.reg.cancel': 'Cancel',
      'me.reg.aria.prev': 'Move {name} to the previous stage', 'me.reg.aria.next': 'Move {name} to the next stage', 'me.reg.aria.del': 'Delete {name}',
      'me.reg.more': 'The {n} most recent records are shown.',
      'me.type.project': 'Project monitoring and evaluation', 'me.type.survey': 'Survey', 'me.type.surveillance': 'Routine surveillance',
      'me.stage.baseline': 'Baseline', 'me.stage.targets': 'Targets', 'me.stage.routine': 'Routine monitoring', 'me.stage.midline': 'Midline', 'me.stage.endline': 'Endline', 'me.stage.impact': 'Impact',
      'me.form.title': 'Add a record', 'me.form.sub': 'Fields marked with * are required.',
      'me.f.name': 'Name *', 'me.f.type': 'Type *', 'me.f.country': 'Country *', 'me.f.stage': 'Current stage *', 'me.f.indicators': 'Number of indicators',
      'me.f.hint': 'Optional, 0 to 500.',
      'me.form.submit': 'Add to the register',
      'me.err.name': 'Enter a name of 3 to 80 characters.', 'me.err.indicators': 'Enter a whole number from 0 to 500, or leave the field empty.',
      'me.err.full': 'The register holds 100 records. Delete one before adding another.', 'me.err.store': 'The record could not be saved on this device.',
      'me.msg.added': 'Added: {name}.', 'me.msg.deleted': 'Deleted: {name}.', 'me.msg.stage': '{name}: {stage}.',
      'me.cycle.title': 'Monitoring and evaluation cycle', 'me.cycle.sub': 'How many records of the register stand at each stage.',
      'me.cycle.count': 'Records: {n}',
      'me.cov.title': 'What is not connected', 'me.cov.sub': 'The register is a list. The tools below do not exist yet.',
      'me.cov.none': 'Not connected',
      'me.cov.1': 'Questionnaire builder and field data collection', 'me.cov.2': 'Indicator values, targets and coverage', 'me.cov.3': 'Data quality checks (completeness, outliers)',
      'me.cov.4': 'Survey coverage maps', 'me.cov.5': 'Consent, provenance and role-based access', 'me.cov.6': 'Sharing the register between devices or users',
      'me.rep.title': 'Planned reports', 'me.rep.sub': 'What the platform is meant to produce once data collection exists. None is available today.', 'me.rep.tag': 'Planned',
      'me.rep.1': 'Baseline Report', 'me.rep.1.d': 'Population profile, indicators and reference values. For programme design.',
      'me.rep.2': 'Routine Monitoring Report', 'me.rep.2.d': 'Coverage, outputs, timeliness, quality and geographic gaps. For programme management.',
      'me.rep.3': 'Midline and Endline Report', 'me.rep.3.d': 'Indicator change, target achievement and equity. For management decisions.',
      'me.rep.4': 'Impact Evaluation', 'me.rep.4.d': 'Before and after, cohort and comparison analysis where the design permits. For evidence and scale-up.',
      'me.rep.5': 'Nutrition Surveillance Bulletin', 'me.rep.5.d': 'Diet, anthropometry, food access, risk factors and trends. For public-health action.',
      'me.rep.6': 'Food and Nutrition Situation Report', 'me.rep.6.d': 'Food availability, prices, climate, losses and nutrition signals. For early warning and policy.'
    },
    fr: {
      'me.kicker': 'NUTRI.N°1 · SUIVI, ÉVALUATION ET SURVEILLANCE', 'me.title': 'Projets, enquêtes & surveillance nutritionnelle',
      'me.sub': 'Un registre des projets, des enquêtes et des systèmes de surveillance, suivis de la situation de référence à l’impact.',
      'me.demo': 'Registre local · rien n’est envoyé',
      'me.kpis': 'Indicateurs clés',
      'me.k.projects': 'Fiches dans le registre', 'me.k.surveys': 'Enquêtes et surveillance', 'me.k.indicators': 'Indicateurs déclarés',
      'me.k.eval': 'En évaluation finale ou d’impact', 'me.k.quality': 'Qualité des données',
      'me.k.local': 'Conservé sur cet appareil', 'me.k.sum': 'Somme des nombres déclarés', 'me.k.none': 'Non connecté',
      'me.reg.title': 'Registre', 'me.reg.sub': 'Faites avancer chaque fiche dans le cycle au fil du travail.',
      'me.reg.count': 'Fiches : {n}',
      'me.reg.empty': 'Le registre est vide. Ajoutez un projet, une enquête ou un système de surveillance avec le formulaire.',
      'me.reg.meta': '{type} · {country}', 'me.reg.ind': 'Indicateurs : {n}',
      'me.reg.stage': 'Étape {i} sur {n} : {stage}',
      'me.reg.prev': 'Étape précédente', 'me.reg.next': 'Étape suivante', 'me.reg.del': 'Supprimer', 'me.reg.confirm': 'Confirmer la suppression', 'me.reg.cancel': 'Annuler',
      'me.reg.aria.prev': 'Ramener à l’étape précédente : {name}', 'me.reg.aria.next': 'Passer à l’étape suivante : {name}', 'me.reg.aria.del': 'Supprimer : {name}',
      'me.reg.more': 'Fiches affichées (les plus récentes) : {n}.',
      'me.type.project': 'Suivi-évaluation de projet', 'me.type.survey': 'Enquête', 'me.type.surveillance': 'Surveillance de routine',
      'me.stage.baseline': 'Situation de référence', 'me.stage.targets': 'Cibles', 'me.stage.routine': 'Suivi de routine', 'me.stage.midline': 'Mi-parcours', 'me.stage.endline': 'Évaluation finale', 'me.stage.impact': 'Impact',
      'me.form.title': 'Ajouter une fiche', 'me.form.sub': 'Les champs marqués d’un * sont obligatoires.',
      'me.f.name': 'Nom *', 'me.f.type': 'Type *', 'me.f.country': 'Pays *', 'me.f.stage': 'Étape actuelle *', 'me.f.indicators': 'Nombre d’indicateurs',
      'me.f.hint': 'Facultatif, de 0 à 500.',
      'me.form.submit': 'Ajouter au registre',
      'me.err.name': 'Saisissez un nom de 3 à 80 caractères.', 'me.err.indicators': 'Saisissez un nombre entier de 0 à 500, ou laissez le champ vide.',
      'me.err.full': 'Le registre contient 100 fiches. Supprimez-en une avant d’en ajouter.', 'me.err.store': 'La fiche n’a pas pu être enregistrée sur cet appareil.',
      'me.msg.added': 'Fiche ajoutée : {name}.', 'me.msg.deleted': 'Fiche supprimée : {name}.', 'me.msg.stage': '{name} : {stage}.',
      'me.cycle.title': 'Cycle de suivi et d’évaluation', 'me.cycle.sub': 'Nombre de fiches du registre à chaque étape.',
      'me.cycle.count': 'Fiches : {n}',
      'me.cov.title': 'Ce qui n’est pas connecté', 'me.cov.sub': 'Le registre est une liste. Les outils ci-dessous n’existent pas encore.',
      'me.cov.none': 'Non connecté',
      'me.cov.1': 'Création de questionnaires et collecte sur le terrain', 'me.cov.2': 'Valeurs des indicateurs, cibles et couverture', 'me.cov.3': 'Contrôles de qualité des données (complétude, valeurs aberrantes)',
      'me.cov.4': 'Cartes de couverture des enquêtes', 'me.cov.5': 'Consentement, provenance et accès par rôle', 'me.cov.6': 'Partage du registre entre appareils ou utilisateurs',
      'me.rep.title': 'Rapports prévus', 'me.rep.sub': 'Ce que la plateforme doit produire une fois la collecte de données en place. Aucun n’est disponible aujourd’hui.', 'me.rep.tag': 'Prévu',
      'me.rep.1': 'Rapport de référence', 'me.rep.1.d': 'Profil de la population, indicateurs et valeurs de référence. Pour la conception des programmes.',
      'me.rep.2': 'Rapport de suivi de routine', 'me.rep.2.d': 'Couverture, réalisations, délais, qualité et écarts géographiques. Pour la gestion des programmes.',
      'me.rep.3': 'Rapport à mi-parcours et final', 'me.rep.3.d': 'Évolution des indicateurs, atteinte des cibles et équité. Pour les décisions de gestion.',
      'me.rep.4': 'Évaluation d’impact', 'me.rep.4.d': 'Analyses avant-après, de cohorte et de comparaison quand le protocole le permet. Pour les preuves et le passage à l’échelle.',
      'me.rep.5': 'Bulletin de surveillance nutritionnelle', 'me.rep.5.d': 'Alimentation, anthropométrie, accès à l’alimentation, facteurs de risque et tendances. Pour l’action de santé publique.',
      'me.rep.6': 'Rapport de situation alimentaire et nutritionnelle', 'me.rep.6.d': 'Disponibilité, prix, climat, pertes et signaux nutritionnels. Pour l’alerte précoce et les politiques.'
    }
  });

  var KEY = 'nutri_projects', MAX = 100, SHOWN = 30;
  var TYPES = ['project', 'survey', 'surveillance'];
  var STAGES = ['baseline', 'targets', 'routine', 'midline', 'endline', 'impact'];
  function codes() { return (I18N.countries || []).map(function (c) { return c.code; }); }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  var state = { draft: { name: '', type: 'project', country: headerCountry(), stage: 'baseline', indicators: '' }, errors: {}, confirm: null, msg: '' };
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function num(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'); } catch (e) { return String(v); } }
  function load() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(KEY) || '[]');
      return (Array.isArray(raw) ? raw : []).filter(function (r) {
        return r && typeof r.id === 'string' && typeof r.name === 'string' && TYPES.indexOf(r.type) >= 0 && STAGES.indexOf(r.stage) >= 0;
      }).slice(0, MAX);
    } catch (e) { return []; }
  }
  function save(list) { try { global.localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }

  var PATHS = {
    clip: '<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5V4h6v1M9 10h6M9 14h6"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.100M4 12h.100M4 17h.100"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    cycle: '<path d="M19 12a7 7 0 0 1-12 5M5 12a7 7 0 0 1 12-5M17 4v3h-3M7 20v-3h3"/>',
    plug: '<path d="M9 4v5M15 4v5M7 9h10v3a5 5 0 0 1-10 0zM12 17v3"/>',
    doc: '<path d="M7 4h7l4 4v12H7zM14 4v4h4M10 13h5M10 16h5"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>', right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra, id) { return '<header class="vi-head"><span class="vh-ico">' + ico(icon) + '</span><h3' + (id ? ' id="' + id + '" tabindex="-1"' : '') + '>' + esc(title) + '</h3>' + (extra || '') + '</header>'; }
  function kpi(label, id, value, sub) { return '<li class="vi-kpi"><span class="vi-kpi__label">' + esc(label) + '</span><b id="' + id + '">' + esc(value) + '</b><small>' + esc(sub) + '</small></li>'; }
  function options(list, cur, label) { return list.map(function (v) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label(v)) + '</option>'; }).join(''); }
  function field(name, label, control, hint) {
    var err = state.errors[name];
    return '<div class="vi-form__field"><label for="me-' + name + '">' + esc(label) + '</label>' + control +
      (hint ? '<small id="me-' + name + '-hint">' + esc(hint) + '</small>' : '') +
      (err ? '<p class="vi-form__err" id="me-' + name + '-err">' + esc(t(err)) + '</p>' : '') + '</div>';
  }
  function describe(name, hint) { var ids = []; if (hint) ids.push('me-' + name + '-hint'); if (state.errors[name]) ids.push('me-' + name + '-err'); return (ids.length ? ' aria-describedby="' + ids.join(' ') + '"' : '') + (state.errors[name] ? ' aria-invalid="true"' : ''); }

  function render() {
    var list = load(), d = state.draft;
    var surveys = list.filter(function (r) { return r.type !== 'project'; }).length;
    var indicators = list.reduce(function (s, r) { return s + (Number(r.indicators) > 0 ? Number(r.indicators) : 0); }, 0);
    var ready = list.filter(function (r) { return r.stage === 'endline' || r.stage === 'impact'; }).length;
    var kpis = kpi(t('me.k.projects'), 'meProjects', num(list.length), t('me.k.local')) + kpi(t('me.k.surveys'), 'meSurveys', num(surveys), t('me.k.local')) +
      kpi(t('me.k.indicators'), 'meIndicators', num(indicators), t('me.k.sum')) + kpi(t('me.k.eval'), 'meEval', num(ready), t('me.k.local')) +
      kpi(t('me.k.quality'), 'meQuality', '—', t('me.k.none'));
    var reg = list.length ? '<ul class="vi-reg" id="meRegister">' + list.slice(0, SHOWN).map(function (r) {
      var i = STAGES.indexOf(r.stage), nm = r.name, ask = state.confirm === r.id;
      var steps = STAGES.map(function (s, k) { return '<i class="' + (k < i ? 'is-done' : (k === i ? 'is-on' : '')) + '"></i>'; }).join('');
      return '<li class="vi-reg__item" data-me-id="' + esc(r.id) + '"><div class="vi-reg__top"><span><b>' + esc(nm) + '</b><small>' + esc(t('me.reg.meta', { type: t('me.type.' + r.type), country: cname(r.country) })) +
          (Number(r.indicators) > 0 ? ' · ' + esc(t('me.reg.ind', { n: num(r.indicators) })) : '') + '</small></span></div>' +
        '<div class="vi-steps" role="img" aria-label="' + esc(t('me.reg.stage', { i: i + 1, n: STAGES.length, stage: t('me.stage.' + r.stage) })) + '">' + steps + '</div>' +
        '<p class="vi-reg__stage">' + esc(t('me.reg.stage', { i: i + 1, n: STAGES.length, stage: t('me.stage.' + r.stage) })) + '</p>' +
        '<div class="vi-reg__actions">' + (ask
          ? '<button type="button" class="btn vi-btn-danger" data-me-act="confirm">' + ico('trash') + esc(t('me.reg.confirm')) + '</button><button type="button" class="btn secondary" data-me-act="cancel">' + esc(t('me.reg.cancel')) + '</button>'
          : '<button type="button" class="btn secondary" data-me-act="prev"' + (i === 0 ? ' disabled' : '') + ' aria-label="' + esc(t('me.reg.aria.prev', { name: nm })) + '">' + ico('left') + esc(t('me.reg.prev')) + '</button>' +
            '<button type="button" class="btn secondary" data-me-act="next"' + (i === STAGES.length - 1 ? ' disabled' : '') + ' aria-label="' + esc(t('me.reg.aria.next', { name: nm })) + '">' + esc(t('me.reg.next')) + ico('right') + '</button>' +
            '<button type="button" class="btn secondary" data-me-act="del" aria-label="' + esc(t('me.reg.aria.del', { name: nm })) + '">' + ico('trash') + esc(t('me.reg.del')) + '</button>') +
        '</div></li>';
    }).join('') + '</ul>' + (list.length > SHOWN ? '<p class="vi-note">' + ico('info') + '<span>' + esc(t('me.reg.more', { n: SHOWN })) + '</span></p>' : '')
      : '<p class="vi-note vi-note--warn" id="meRegister">' + ico('info') + '<span>' + esc(t('me.reg.empty')) + '</span></p>';
    var form = '<form class="vi-form" id="meForm" novalidate>' +
      (state.errors.form ? '<p class="vi-form__err" role="alert">' + esc(t(state.errors.form)) + '</p>' : '') +
      field('name', t('me.f.name'), '<input type="text" id="me-name" name="name" maxlength="80" autocomplete="off" required value="' + esc(d.name) + '"' + describe('name') + '>') +
      field('type', t('me.f.type'), '<select id="me-type" name="type">' + options(TYPES, d.type, function (v) { return t('me.type.' + v); }) + '</select>') +
      field('country', t('me.f.country'), '<select id="me-country" name="country">' + options(codes(), d.country, cname) + '</select>') +
      field('stage', t('me.f.stage'), '<select id="me-stage" name="stage">' + options(STAGES, d.stage, function (v) { return t('me.stage.' + v); }) + '</select>') +
      field('indicators', t('me.f.indicators'), '<input type="text" inputmode="numeric" id="me-indicators" name="indicators" maxlength="3" autocomplete="off" value="' + esc(d.indicators) + '"' + describe('indicators', true) + '>', t('me.f.hint')) +
      '<button type="submit" class="btn primary">' + ico('plus') + esc(t('me.form.submit')) + '</button></form>';
    var cycle = STAGES.map(function (s, k) {
      var c = list.filter(function (r) { return r.stage === s; }).length;
      return '<li><span>' + (k + 1) + '. ' + esc(t('me.stage.' + s)) + '</span><b class="' + (c ? 'is-on' : '') + '">' + esc(t('me.cycle.count', { n: c })) + '</b></li>';
    }).join('');
    var cov = [1, 2, 3, 4, 5, 6].map(function (i) { return '<li><span>' + esc(t('me.cov.' + i)) + '</span><b>' + esc(t('me.cov.none')) + '</b></li>'; }).join('');
    var reps = [1, 2, 3, 4, 5, 6].map(function (i) {
      return '<li><span><b>' + esc(t('me.rep.' + i)) + '</b><small>' + esc(t('me.rep.' + i + '.d')) + '</small></span><em>' + esc(t('me.rep.tag')) + '</em></li>';
    }).join('');
    root.innerHTML = '<div class="vi">' +
      '<section class="card vi-hero"><div class="vh-head"><div class="vi-hero__title"><span class="vh-ico">' + ico('clip') + '</span><div><span class="vi-kicker">' + esc(t('me.kicker')) + '</span><h2>' + esc(t('me.title')) + '</h2>' +
        '<p class="vi-sub">' + esc(t('me.sub')) + '</p></div></div><span class="pill vi-demo">' + esc(t('me.demo')) + '</span></div>' +
        '<ul class="vi-kpis vi-kpis--5" aria-label="' + esc(t('me.kpis')) + '">' + kpis + '</ul></section>' +
      '<div class="vi-grid">' +
        '<section class="card vi-wide">' + head('list', t('me.reg.title'), '<span class="pill vi-count">' + esc(t('me.reg.count', { n: list.length })) + '</span>', 'meRegTitle') + '<p class="vi-sub">' + esc(t('me.reg.sub')) + '</p>' +
          '<p class="vi-status" id="meStatus" role="status" aria-live="polite">' + esc(state.msg) + '</p>' + reg + '</section>' +
        '<section class="card vi-side">' + head('plus', t('me.form.title')) + '<p class="vi-sub">' + esc(t('me.form.sub')) + '</p>' + form + '</section>' +
        '<section class="card vi-half">' + head('cycle', t('me.cycle.title')) + '<p class="vi-sub">' + esc(t('me.cycle.sub')) + '</p><ol class="vi-rows" id="meIndicatorPanel">' + cycle + '</ol></section>' +
        '<section class="card vi-half">' + head('plug', t('me.cov.title')) + '<p class="vi-sub">' + esc(t('me.cov.sub')) + '</p><ul class="vi-rows" id="meAlerts">' + cov + '</ul></section>' +
        '<section class="card vi-full">' + head('doc', t('me.rep.title')) + '<p class="vi-sub">' + esc(t('me.rep.sub')) + '</p><ul class="vi-products">' + reps + '</ul></section>' +
      '</div></div>';
  }
  function readDraft() {
    var f = doc.getElementById('meForm'); if (!f) return;
    ['name', 'type', 'country', 'stage', 'indicators'].forEach(function (k) { if (f.elements[k]) state.draft[k] = f.elements[k].value; });
  }
  function submit() {
    readDraft();
    var d = state.draft, errors = {}, name = d.name.replace(/\s+/g, ' ').trim(), ind = d.indicators.trim();
    if (name.length < 3 || name.length > 80) errors.name = 'me.err.name';
    if (ind !== '' && (!/^\d{1,3}$/.test(ind) || Number(ind) > 500)) errors.indicators = 'me.err.indicators';
    if (TYPES.indexOf(d.type) < 0) d.type = 'project';
    if (STAGES.indexOf(d.stage) < 0) d.stage = 'baseline';
    if (codes().indexOf(d.country) < 0) d.country = headerCountry();
    var list = load();
    if (!errors.name && !errors.indicators && list.length >= MAX) errors.form = 'me.err.full';
    if (!errors.name && !errors.indicators && !errors.form) {
      list.unshift({ id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name, type: d.type, country: d.country, stage: d.stage, indicators: ind === '' ? 0 : Number(ind), at: new Date().toISOString() });
      if (!save(list)) errors.form = 'me.err.store';
    }
    state.errors = errors; state.confirm = null;
    if (errors.name || errors.indicators || errors.form) {
      state.msg = ''; render();
      var bad = doc.getElementById(errors.name ? 'me-name' : (errors.indicators ? 'me-indicators' : 'me-name')); if (bad) bad.focus();
      return false;
    }
    state.msg = t('me.msg.added', { name: name });
    state.draft = { name: '', type: d.type, country: d.country, stage: 'baseline', indicators: '' };
    render();
    var n = doc.getElementById('me-name'); if (n) n.focus();
    return true;
  }
  function act(id, what) {
    var list = load(), idx = -1;
    list.forEach(function (r, k) { if (r.id === id) idx = k; });
    if (idx < 0) { state.confirm = null; render(); return; }
    var r = list[idx], focusSel = '[data-me-id="' + id + '"] [data-me-act="' + what + '"]';
    if (what === 'prev' || what === 'next') {
      var i = STAGES.indexOf(r.stage) + (what === 'next' ? 1 : -1);
      if (i < 0 || i >= STAGES.length) return;
      r.stage = STAGES[i]; if (!save(list)) return;
      state.msg = t('me.msg.stage', { name: r.name, stage: t('me.stage.' + r.stage) });
    } else if (what === 'del') { state.confirm = id; focusSel = '[data-me-id="' + id + '"] [data-me-act="cancel"]'; }
    else if (what === 'cancel') { state.confirm = null; focusSel = '[data-me-id="' + id + '"] [data-me-act="del"]'; }
    else if (what === 'confirm') {
      list.splice(idx, 1); if (!save(list)) return;
      state.confirm = null; state.msg = t('me.msg.deleted', { name: r.name }); focusSel = '#meRegTitle';
    }
    readDraft(); render();
    var el = root.querySelector(focusSel);
    if (el && el.disabled) el = root.querySelector('[data-me-id="' + id + '"] [data-me-act="' + (what === 'next' ? 'prev' : 'next') + '"]');
    if (el) el.focus();
  }

  root.addEventListener('submit', function (ev) { if (ev.target.id === 'meForm') { ev.preventDefault(); submit(); } });
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-me-act]') : null;
    if (!b || b.disabled) return;
    var li = b.closest('[data-me-id]'); if (li) act(li.getAttribute('data-me-id'), b.getAttribute('data-me-act'));
  });
  doc.addEventListener('nutri:countryChanged', function () { readDraft(); state.draft.country = headerCountry(); render(); });
  global.addEventListener('storage', function (ev) { if (ev.key === KEY) { readDraft(); render(); } });

  var api = {
    render: render, renderMonitoring: render, submit: submit, act: act,
    fill: function (values) { Object.keys(values || {}).forEach(function (k) { if (k in state.draft) state.draft[k] = String(values[k]); }); render(); },
    state: function () { var l = load(); return { records: l.length, errors: state.errors, confirm: state.confirm, stages: l.map(function (r) { return r.stage; }) }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.monitoring = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'monitoring');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.draft.country = headerCountry(); render(); });
  I18N.onChange(function () { readDraft(); state.msg = ''; render(); });
})(window);
