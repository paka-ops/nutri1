/* ==========================================================================
   NUTRI.N°1 — Executive Home view  (SESSION 1)
   Renders <section id="home"> as a Dark Bento grid.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vh-*)
   Preserves  : #profileName #profileContact #profileOrg #profileId
                #profileSpecialtyRow #profileSpecialty #profileStatus,
                details.profile-access, button.role-card[data-role],
                chooseRole(role, btn), signInProfile(), go(viewId)
   Storage    : nutri_role, nutri_profile_name (owned by the shell)
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('home');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'home.badge': 'ECOWAS + AES · 17 countries',
      'home.hero.title': 'Africa’s Food & Nutrition Intelligence Infrastructure',
      'home.hero.text': 'One dynamic platform connecting citizens, food intelligence, AI, nutrition professionals, governments and scientific partners.',
      'home.hero.citizen': 'Open Citizen Dashboard',
      'home.hero.health': 'Health Command Center',
      'home.hero.agri': 'Agriculture Intelligence',
      'home.hero.partners': 'Partner centers',
      'home.partner.unicef': 'UNICEF', 'home.partner.who': 'WHO', 'home.partner.wfp': 'WFP', 'home.partner.fao': 'FAO',

      'home.profile.title': 'Your workspace',
      'home.profile.summary': 'Create your platform profile',
      'home.profile.pending': 'Choose user type',
      'home.profile.intro': 'Pick a profile: its recommended modules are pinned first, all 18 stay available.',
      'home.profile.roles': 'User type',
      'home.profile.name': 'Full name', 'home.profile.name.ph': 'Your name',
      'home.profile.contact': 'Email / phone', 'home.profile.contact.ph': 'Email or phone number',
      'home.profile.org': 'Organization', 'home.profile.org.ph': 'Optional',
      'home.profile.id': 'User ID', 'home.profile.id.ph': 'Optional',
      'home.profile.specialty': 'Nutritionist specialty',
      'home.profile.submit': 'Identify / Enter workspace',
      'home.profile.signed': '{name} · {role}',
      'home.role.citizen': 'Citizen', 'home.role.citizen.desc': 'Personal nutrition & prevention',
      'home.role.nutritionist': 'Nutritionist', 'home.role.nutritionist.desc': 'Patients & consultations',
      'home.role.ministry_health': 'Ministry of Health', 'home.role.ministry_health.desc': 'National health intelligence',
      'home.role.ministry_agri': 'Ministry of Agriculture', 'home.role.ministry_agri.desc': 'Food production & needs',
      'home.role.institution': 'Institution / Research', 'home.role.institution.desc': 'Research, evidence & data',
      'home.role.admin': 'Administrator', 'home.role.admin.desc': 'Governance & configuration',
      'home.spec.clinical': 'Clinical Nutrition', 'home.spec.diabetes': 'Diabetes & Metabolic Nutrition',
      'home.spec.maternal': 'Maternal, Pregnancy & Lactation Nutrition', 'home.spec.pediatric': 'Pediatric Nutrition & Malnutrition',
      'home.spec.ncd': 'NCD Prevention Nutrition', 'home.spec.renal': 'Renal Nutrition', 'home.spec.cardio': 'Cardiovascular Nutrition',
      'home.spec.sports': 'Sports Nutrition', 'home.spec.public': 'Public Health Nutrition', 'home.spec.food': 'Food & Dietary Assessment',

      'home.kpi.countries': 'Countries', 'home.kpi.countries.tag': 'ECOWAS + AES scope',
      'home.kpi.ingestion': 'Data ingestion', 'home.kpi.ingestion.value': '360°', 'home.kpi.ingestion.tag': 'Manual + scan + API',
      'home.kpi.care': 'Care model', 'home.kpi.care.value': 'AI + Human', 'home.kpi.care.tag': 'Chat + teleconsultation',
      'home.kpi.evidence': 'Evidence', 'home.kpi.evidence.value': 'Graph', 'home.kpi.evidence.tag': 'Food → diet → health',
      'home.kpi.modules': 'Modules', 'home.kpi.modules.tag': 'One shared core',

      'home.quick.title': 'Recommended for you',
      'home.quick.sub': 'Shortcuts for the profile: {role}',
      'home.quick.all': 'All 18 modules',
      'home.open': 'Open {name}',

      'home.core.title': 'NUTRI.N°1 CORE — African Intelligence Engine',
      'home.core.sub': 'One shared technology core powering citizen, professional, government and development-partner intelligence.',
      'home.core.tag': 'Core platform',
      'home.core.food': 'African Food Database', 'home.core.food.desc': 'Foods, composition, recipes, portions, local dietary patterns and food ontology.',
      'home.core.ai': 'AI Engine', 'home.core.ai.desc': 'Food, nutrition, risk, forecasting, recommendation and decision-support models.',
      'home.core.scan': 'Food Scanner', 'home.core.scan.desc': 'Food, product and meal recognition, OCR, barcode, portions and confidence scoring.',
      'home.core.data': 'Data Platform', 'home.core.data.desc': 'Field, clinical, market, agriculture, nutrition, laboratory and program data pipelines.',
      'home.core.gis': 'GIS', 'home.core.gis.desc': 'Country, region, district, market, facility, farm and hotspot intelligence.',
      'home.core.analytics': 'Analytics', 'home.core.analytics.desc': 'Indicators, dashboards, trends, cohort analysis, impact evaluation and reporting.',
      'home.core.warning': 'Early Warning', 'home.core.warning.desc': 'Food, climate, nutrition, NCD and supply-risk signals with human review.',
      'home.core.interop': 'Interoperability', 'home.core.interop.desc': 'APIs, standardized indicators and connectors for national and institutional systems.',
      'home.core.privacy': 'Privacy & Governance', 'home.core.privacy.desc': 'Consent, data minimization, access control, auditability, safeguarding and provenance.',

      'home.layers.title': 'One Core — Six Institutional Layers',
      'home.layers.sub': 'Each partner gets its own indicators, workflows, dashboards and data governance on the same infrastructure.',
      'home.layer.agri': 'Ministry of Agriculture', 'home.layer.agri.desc': 'Production · markets · losses · climate · food systems',
      'home.layer.wfp': 'WFP', 'home.layer.wfp.desc': 'Food security · vulnerability · markets · assistance · resilience',
      'home.layer.unicef': 'UNICEF', 'home.layer.unicef.desc': 'Child nutrition · maternal nutrition · school nutrition',
      'home.layer.who': 'WHO', 'home.layer.who.desc': 'NCD nutrition · diabetes · hypertension · obesity · sodium',
      'home.layer.health': 'Ministry of Health', 'home.layer.health.desc': 'Nutrition & health · NCD prevention · screening · follow-up',
      'home.layer.research': 'Research & Development', 'home.layer.research.desc': 'Evidence · datasets · studies · impact evaluation',

      'home.plans.title': 'Choose your NUTRI.N°1 plan',
      'home.plans.sub': 'Start free. Upgrade when you need deeper personalization and professional services.',
      'home.plan.free.tag': 'Freemium', 'home.plan.free': 'Free', 'home.plan.free.desc': 'For everyday nutrition awareness.',
      'home.plan.free.1': 'Basic Citizen Dashboard', 'home.plan.free.2': 'Selected African food information', 'home.plan.free.3': 'Basic nutrition score',
      'home.plan.free.4': 'Limited AI recommendations', 'home.plan.free.5': 'Basic food scanning',
      'home.plan.free.cta': 'Continue with Free', 'home.plan.free.toast': 'Free plan active',
      'home.plan.premium.tag': 'Premium', 'home.plan.premium': 'Premium', 'home.plan.premium.desc': 'For personalized prevention and professional support.',
      'home.plan.premium.1': 'Advanced Citizen Dashboard 360°', 'home.plan.premium.2': 'Full AI Nutrition & Prevention', 'home.plan.premium.3': 'Advanced food & meal analysis',
      'home.plan.premium.4': 'Connected-device synchronization', 'home.plan.premium.5': 'Nutritionist consultations & teleconsultation', 'home.plan.premium.6': 'Personalized plans and family profiles',
      'home.plan.premium.cta': 'Upgrade to Premium',

      'home.pillar.ai': 'African Nutrition AI', 'home.pillar.ai.desc': 'Food resolution, meal analysis, personalized planning and prevention.', 'home.pillar.ai.cta': 'Open AI Nutrition',
      'home.pillar.gov': 'Government Intelligence', 'home.pillar.gov.desc': 'Health and Agriculture command centers with charts, GIS and indicators.', 'home.pillar.gov.cta': 'Open Health Center',
      'home.pillar.science': 'Scientific Infrastructure', 'home.pillar.science.desc': 'Food composition, recipes, consumption, laboratories and evidence.', 'home.pillar.science.cta': 'Open Food Cloud'
    },
    fr: {
      'home.badge': 'CEDEAO + AES · 17 pays',
      'home.hero.title': 'L’infrastructure africaine d’intelligence alimentaire et nutritionnelle',
      'home.hero.text': 'Une plateforme dynamique reliant citoyens, intelligence alimentaire, IA, professionnels de la nutrition, gouvernements et partenaires scientifiques.',
      'home.hero.citizen': 'Ouvrir le tableau de bord citoyen',
      'home.hero.health': 'Centre de commande Santé',
      'home.hero.agri': 'Intelligence agricole',
      'home.hero.partners': 'Centres partenaires',
      'home.partner.unicef': 'UNICEF', 'home.partner.who': 'OMS', 'home.partner.wfp': 'PAM', 'home.partner.fao': 'FAO',

      'home.profile.title': 'Votre espace de travail',
      'home.profile.summary': 'Créer votre profil sur la plateforme',
      'home.profile.pending': 'Choisir le type d’utilisateur',
      'home.profile.intro': 'Choisissez un profil : ses modules recommandés sont épinglés en premier, les 18 restent accessibles.',
      'home.profile.roles': 'Type d’utilisateur',
      'home.profile.name': 'Nom complet', 'home.profile.name.ph': 'Votre nom',
      'home.profile.contact': 'E-mail / téléphone', 'home.profile.contact.ph': 'E-mail ou numéro de téléphone',
      'home.profile.org': 'Organisation', 'home.profile.org.ph': 'Facultatif',
      'home.profile.id': 'Identifiant', 'home.profile.id.ph': 'Facultatif',
      'home.profile.specialty': 'Spécialité du nutritionniste',
      'home.profile.submit': 'S’identifier / Entrer dans l’espace',
      'home.profile.signed': '{name} · {role}',
      'home.role.citizen': 'Citoyen', 'home.role.citizen.desc': 'Nutrition personnelle et prévention',
      'home.role.nutritionist': 'Nutritionniste', 'home.role.nutritionist.desc': 'Patients et consultations',
      'home.role.ministry_health': 'Ministère de la Santé', 'home.role.ministry_health.desc': 'Intelligence sanitaire nationale',
      'home.role.ministry_agri': 'Ministère de l’Agriculture', 'home.role.ministry_agri.desc': 'Production et besoins alimentaires',
      'home.role.institution': 'Institution / Recherche', 'home.role.institution.desc': 'Recherche, preuves et données',
      'home.role.admin': 'Administrateur', 'home.role.admin.desc': 'Gouvernance et configuration',
      'home.spec.clinical': 'Nutrition clinique', 'home.spec.diabetes': 'Nutrition du diabète et du métabolisme',
      'home.spec.maternal': 'Nutrition maternelle, grossesse et allaitement', 'home.spec.pediatric': 'Nutrition pédiatrique et malnutrition',
      'home.spec.ncd': 'Nutrition de prévention des MNT', 'home.spec.renal': 'Nutrition rénale', 'home.spec.cardio': 'Nutrition cardiovasculaire',
      'home.spec.sports': 'Nutrition du sport', 'home.spec.public': 'Nutrition en santé publique', 'home.spec.food': 'Évaluation alimentaire et diététique',

      'home.kpi.countries': 'Pays', 'home.kpi.countries.tag': 'Périmètre CEDEAO + AES',
      'home.kpi.ingestion': 'Collecte des données', 'home.kpi.ingestion.value': '360°', 'home.kpi.ingestion.tag': 'Saisie + scan + API',
      'home.kpi.care': 'Modèle de soins', 'home.kpi.care.value': 'IA + Humain', 'home.kpi.care.tag': 'Chat + téléconsultation',
      'home.kpi.evidence': 'Preuves', 'home.kpi.evidence.value': 'Graphe', 'home.kpi.evidence.tag': 'Aliment → régime → santé',
      'home.kpi.modules': 'Modules', 'home.kpi.modules.tag': 'Un socle partagé',

      'home.quick.title': 'Recommandé pour vous',
      'home.quick.sub': 'Raccourcis pour le profil : {role}',
      'home.quick.all': 'Les 18 modules',
      'home.open': 'Ouvrir {name}',

      'home.core.title': 'NUTRI.N°1 CORE — Moteur d’intelligence africain',
      'home.core.sub': 'Un socle technologique partagé au service des citoyens, des professionnels, des gouvernements et des partenaires de développement.',
      'home.core.tag': 'Plateforme centrale',
      'home.core.food': 'Base des aliments africains', 'home.core.food.desc': 'Aliments, composition, recettes, portions, habitudes alimentaires locales et ontologie alimentaire.',
      'home.core.ai': 'Moteur d’IA', 'home.core.ai.desc': 'Modèles d’alimentation, de nutrition, de risque, de prévision, de recommandation et d’aide à la décision.',
      'home.core.scan': 'Scanner alimentaire', 'home.core.scan.desc': 'Reconnaissance des aliments, produits et repas, OCR, code-barres, portions et score de confiance.',
      'home.core.data': 'Plateforme de données', 'home.core.data.desc': 'Flux de données de terrain, cliniques, de marché, agricoles, nutritionnelles, de laboratoire et de programmes.',
      'home.core.gis': 'SIG', 'home.core.gis.desc': 'Intelligence par pays, région, district, marché, établissement, exploitation et zone critique.',
      'home.core.analytics': 'Analytique', 'home.core.analytics.desc': 'Indicateurs, tableaux de bord, tendances, analyse de cohortes, évaluation d’impact et rapports.',
      'home.core.warning': 'Alerte précoce', 'home.core.warning.desc': 'Signaux alimentaires, climatiques, nutritionnels, MNT et d’approvisionnement, avec validation humaine.',
      'home.core.interop': 'Interopérabilité', 'home.core.interop.desc': 'API, indicateurs normalisés et connecteurs pour les systèmes nationaux et institutionnels.',
      'home.core.privacy': 'Confidentialité et gouvernance', 'home.core.privacy.desc': 'Consentement, minimisation des données, contrôle d’accès, auditabilité, protection et traçabilité.',

      'home.layers.title': 'Un socle — six couches institutionnelles',
      'home.layers.sub': 'Chaque partenaire dispose de ses indicateurs, flux de travail, tableaux de bord et règles de gouvernance sur la même infrastructure.',
      'home.layer.agri': 'Ministère de l’Agriculture', 'home.layer.agri.desc': 'Production · marchés · pertes · climat · systèmes alimentaires',
      'home.layer.wfp': 'PAM', 'home.layer.wfp.desc': 'Sécurité alimentaire · vulnérabilité · marchés · assistance · résilience',
      'home.layer.unicef': 'UNICEF', 'home.layer.unicef.desc': 'Nutrition de l’enfant · nutrition maternelle · nutrition scolaire',
      'home.layer.who': 'OMS', 'home.layer.who.desc': 'Nutrition et MNT · diabète · hypertension · obésité · sodium',
      'home.layer.health': 'Ministère de la Santé', 'home.layer.health.desc': 'Nutrition et santé · prévention des MNT · dépistage · suivi',
      'home.layer.research': 'Recherche et développement', 'home.layer.research.desc': 'Preuves · jeux de données · études · évaluation d’impact',

      'home.plans.title': 'Choisissez votre formule NUTRI.N°1',
      'home.plans.sub': 'Commencez gratuitement. Passez à la formule supérieure pour une personnalisation avancée et des services professionnels.',
      'home.plan.free.tag': 'Freemium', 'home.plan.free': 'Gratuit', 'home.plan.free.desc': 'Pour une sensibilisation nutritionnelle au quotidien.',
      'home.plan.free.1': 'Tableau de bord citoyen de base', 'home.plan.free.2': 'Sélection d’informations sur les aliments africains', 'home.plan.free.3': 'Score nutritionnel de base',
      'home.plan.free.4': 'Recommandations IA limitées', 'home.plan.free.5': 'Scan alimentaire de base',
      'home.plan.free.cta': 'Continuer en version gratuite', 'home.plan.free.toast': 'Formule gratuite active',
      'home.plan.premium.tag': 'Premium', 'home.plan.premium': 'Premium', 'home.plan.premium.desc': 'Pour une prévention personnalisée et un accompagnement professionnel.',
      'home.plan.premium.1': 'Tableau de bord citoyen 360° avancé', 'home.plan.premium.2': 'IA Nutrition & Prévention complète', 'home.plan.premium.3': 'Analyse avancée des aliments et des repas',
      'home.plan.premium.4': 'Synchronisation des appareils connectés', 'home.plan.premium.5': 'Consultations et téléconsultations avec un nutritionniste', 'home.plan.premium.6': 'Plans personnalisés et profils familiaux',
      'home.plan.premium.cta': 'Passer à Premium',

      'home.pillar.ai': 'IA africaine de la nutrition', 'home.pillar.ai.desc': 'Identification des aliments, analyse des repas, planification personnalisée et prévention.', 'home.pillar.ai.cta': 'Ouvrir l’IA Nutrition',
      'home.pillar.gov': 'Intelligence gouvernementale', 'home.pillar.gov.desc': 'Centres de commande Santé et Agriculture avec graphiques, SIG et indicateurs.', 'home.pillar.gov.cta': 'Ouvrir le centre Santé',
      'home.pillar.science': 'Infrastructure scientifique', 'home.pillar.science.desc': 'Composition des aliments, recettes, consommation, laboratoires et preuves.', 'home.pillar.science.cta': 'Ouvrir le Cloud alimentaire'
    }
  });

  /* ---- 2. Helpers ------------------------------------------------------- */
  var t = function (key, params) { return I18N.t(key, params); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* 20px stroke icons (Lucide-style paths) used only by this view. */
  var PATHS = {
    food: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    ai: '<rect x="5" y="5" width="14" height="14" rx="3"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M4 12h16"/>',
    data: '<path d="M17.5 19a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.4 11.1 4 4 0 0 0 7 19z"/>',
    gis: '<path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    warning: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
    interop: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    privacy: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    arrow: '<path d="M7 17 17 7M9 7h8v8"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'
  };
  function ico(name) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[name] + '</svg>';
  }
  function navIcon(viewId) {
    var shell = global.NutriBentoShell;
    return shell && typeof shell.icon === 'function' ? shell.icon(viewId) : ico('arrow');
  }
  function tx(tag, key, cls) {
    return '<' + tag + (cls ? ' class="' + cls + '"' : '') + ' data-b-i18n="' + key + '">' + esc(t(key)) + '</' + tag + '>';
  }
  function store(key) { try { return global.localStorage.getItem(key); } catch (e) { return null; } }

  var ROLE_IDS = ['citizen', 'nutritionist', 'ministry_health', 'ministry_agri', 'institution', 'admin'];
  var ROLE_ICONS = { citizen: 'citizen', nutritionist: 'network', ministry_health: 'health', ministry_agri: 'agri', institution: 'research', admin: 'monitoring' };
  var SPECIALTIES = ['clinical', 'diabetes', 'maternal', 'pediatric', 'ncd', 'renal', 'cardio', 'sports', 'public', 'food'];
  var CORE = ['food', 'ai', 'scan', 'data', 'gis', 'analytics', 'warning', 'interop', 'privacy'];
  var LAYERS = ['agri', 'wfp', 'unicef', 'who', 'health', 'research'];
  var PARTNERS = ['unicef', 'who', 'wfp', 'fao'];
  var PILLARS = [{ id: 'ai', view: 'ai', icon: 'ai' }, { id: 'gov', view: 'health', icon: 'analytics' }, { id: 'science', view: 'foodcloud', icon: 'food' }];

  var state = { signed: false, name: '' };
  function currentRole() {
    var shell = global.NutriBentoShell;
    var role = (shell && shell.role) || global.selectedRole || store('nutri_role') || 'citizen';
    return ROLE_IDS.indexOf(role) >= 0 ? role : 'citizen';
  }

  /* ---- 3. Template ------------------------------------------------------ */
  function heroCard() {
    return '<article class="card vh-hero">' +
      '<span class="pill vh-badge">' + ico('globe') + tx('span', 'home.badge') + '</span>' +
      tx('h1', 'home.hero.title') + tx('p', 'home.hero.text', 'vh-lead') +
      '<div class="vh-actions">' +
        '<button type="button" class="btn primary" onclick="go(\'citizen\')">' + tx('span', 'home.hero.citizen') + ico('arrow') + '</button>' +
        '<button type="button" class="btn secondary" onclick="go(\'health\')" data-b-i18n="home.hero.health">' + esc(t('home.hero.health')) + '</button>' +
        '<button type="button" class="btn secondary" onclick="go(\'agri\')" data-b-i18n="home.hero.agri">' + esc(t('home.hero.agri')) + '</button>' +
      '</div>' +
      '<div class="vh-partners" role="group" data-b-i18n-aria="home.hero.partners" aria-label="' + esc(t('home.hero.partners')) + '">' +
        tx('span', 'home.hero.partners', 'vh-partners-label') +
        PARTNERS.map(function (p) {
          return '<button type="button" class="hero-center-btn vh-chip" onclick="go(\'' + p + '\')">' + navIcon(p) + tx('span', 'home.partner.' + p) + '</button>';
        }).join('') +
      '</div></article>';
  }
  function field(id, key, extra) {
    return '<label for="' + id + '">' + tx('span', 'home.profile.' + key) +
      '<input id="' + id + '" type="' + (extra && extra.type || 'text') + '" autocomplete="' + (extra && extra.ac || 'off') +
      '" data-b-i18n-placeholder="home.profile.' + key + '.ph" placeholder="' + esc(t('home.profile.' + key + '.ph')) + '"></label>';
  }
  function profileCard() {
    var role = currentRole();
    return '<details class="card profile-access vh-profile" open>' +
      '<summary class="profile-summary">' +
        '<span class="vh-profile-title">' + tx('b', 'home.profile.summary') +
        '<span id="profileStatus" class="muted" data-b-i18n="home.profile.pending">' + esc(t('home.profile.pending')) + '</span></span>' +
        '<span class="vh-chevron">' + ico('chevron') + '</span>' +
      '</summary>' +
      '<div class="profile-access-body">' +
        tx('p', 'home.profile.intro', 'muted vh-intro') +
        '<div class="profile-role-grid" role="group" data-b-i18n-aria="home.profile.roles" aria-label="' + esc(t('home.profile.roles')) + '">' +
        ROLE_IDS.map(function (r) {
          var on = r === role;
          return '<button type="button" class="role-card' + (on ? ' active' : '') + '" data-role="' + r + '" aria-pressed="' + on +
            '" onclick="chooseRole(\'' + r + '\',this)">' + navIcon(ROLE_ICONS[r]) +
            '<span class="vh-role-text">' + tx('b', 'home.role.' + r) + tx('small', 'home.role.' + r + '.desc') + '</span></button>';
        }).join('') + '</div>' +
        '<div class="profile-form">' +
          field('profileName', 'name', { ac: 'name' }) + field('profileContact', 'contact', { ac: 'email' }) +
          field('profileOrg', 'org', { ac: 'organization' }) + field('profileId', 'id') +
        '</div>' +
        '<div id="profileSpecialtyRow" class="profile-specialty"' + (role === 'nutritionist' ? '' : ' style="display:none"') + '>' +
          '<label for="profileSpecialty">' + tx('span', 'home.profile.specialty') + '<select id="profileSpecialty">' +
          SPECIALTIES.map(function (s) { return '<option value="' + s + '" data-b-i18n="home.spec.' + s + '">' + esc(t('home.spec.' + s)) + '</option>'; }).join('') +
          '</select></label></div>' +
        '<button type="button" class="btn primary vh-submit" onclick="signInProfile()">' + tx('span', 'home.profile.submit') + '</button>' +
      '</div></details>';
  }
  function kpi(id, value, tone, valueKey) {
    return '<article class="card vh-kpi vh-kpi--' + tone + '">' + tx('span', 'home.kpi.' + id, 'vh-kpi-label') +
      (valueKey ? tx('strong', valueKey, 'vh-kpi-value') : '<strong class="vh-kpi-value">' + value + '</strong>') +
      tx('span', 'home.kpi.' + id + '.tag', 'vh-kpi-tag') + '</article>';
  }
  function quickCard() {
    return '<article class="card vh-quick"><div class="vh-head"><div>' + tx('h2', 'home.quick.title') +
      '<p class="muted" id="vhQuickSub"></p></div>' +
      '<button type="button" class="btn secondary" id="vhQuickAll">' + tx('span', 'home.quick.all') + '</button></div>' +
      '<div class="vh-quick-list" id="vhQuickList"></div></article>';
  }
  function coreCard() {
    return '<article class="card institutional-core vh-core"><div class="vh-head"><div>' + tx('h2', 'home.core.title') +
      tx('p', 'home.core.sub', 'muted') + '</div>' + tx('span', 'home.core.tag', 'pill') + '</div>' +
      '<div class="core-grid">' + CORE.map(function (c) {
        return '<div class="core-card"><span class="vh-ico">' + ico(c) + '</span>' + tx('b', 'home.core.' + c) + tx('span', 'home.core.' + c + '.desc') + '</div>';
      }).join('') + '</div></article>';
  }
  function layersCard() {
    return '<article class="card vh-layers">' + tx('h2', 'home.layers.title') + tx('p', 'home.layers.sub', 'muted') +
      '<div class="institution-map-grid">' + LAYERS.map(function (l) {
        return '<button type="button" onclick="go(\'' + l + '\')"><span class="vh-ico">' + navIcon(l) + '</span>' +
          '<span class="vh-layer-text">' + tx('b', 'home.layer.' + l) + tx('span', 'home.layer.' + l + '.desc') + '</span>' +
          '<span class="vh-go">' + ico('arrow') + '</span></button>';
      }).join('') + '</div></article>';
  }
  function pillar(p) {
    return '<article class="card vh-pillar"><span class="vh-ico">' + ico(p.icon) + '</span>' + tx('h3', 'home.pillar.' + p.id) +
      tx('p', 'home.pillar.' + p.id + '.desc', 'muted') +
      '<button type="button" class="btn secondary" onclick="go(\'' + p.view + '\')">' + tx('span', 'home.pillar.' + p.id + '.cta') + ico('arrow') + '</button></article>';
  }

  function plan(id, count, primary) {
    var items = '';
    for (var i = 1; i <= count; i++) items += '<li>' + ico('check') + tx('span', 'home.plan.' + id + '.' + i) + '</li>';
    return '<div class="v47-plan vh-plan' + (primary ? ' premium' : '') + '">' + tx('span', 'home.plan.' + id + '.tag', 'pill') +
      tx('h3', 'home.plan.' + id) + tx('p', 'home.plan.' + id + '.desc', 'muted') + '<ul>' + items + '</ul>' +
      '<button type="button" class="btn ' + (primary ? 'primary' : 'secondary') + '" data-vh-plan="' + id + '">' + tx('span', 'home.plan.' + id + '.cta') + '</button></div>';
  }
  /* data-v47-plans tells the legacy v47 layer that the pricing block already exists. */
  function plansCard() {
    return '<article class="card vh-plans" data-v47-plans="1"><div class="vh-head"><div>' + tx('h2', 'home.plans.title') +
      tx('p', 'home.plans.sub', 'muted') + '</div></div><div class="v47-plan-grid">' + plan('free', 5, false) + plan('premium', 6, true) + '</div></article>';
  }

  function render() {
    root.setAttribute('data-v44bar', '1');      /* opt out of the legacy "live bar" injector */
    root.setAttribute('data-no-i18n', '');      /* text here is keyed: the phrase layer must not touch it */
    root.innerHTML = '<div class="vh">' + heroCard() + profileCard() +
      '<div class="vh-kpis">' + kpi('countries', '17', 'lime') + kpi('modules', '18', 'plain') + kpi('ingestion', '', 'blue', 'home.kpi.ingestion.value') +
      kpi('care', '', 'plain', 'home.kpi.care.value') + kpi('evidence', '', 'lavender', 'home.kpi.evidence.value') + '</div>' +
      quickCard() + coreCard() + layersCard() + PILLARS.map(pillar).join('') + plansCard() + '</div>';
    var saved = store('nutri_profile_name');
    var input = doc.getElementById('profileName');
    if (saved && input) input.value = saved;
    var all = doc.getElementById('vhQuickAll');
    if (all) all.addEventListener('click', function () {
      var shell = global.NutriBentoShell;
      if (shell && typeof shell.openDrawer === 'function') shell.openDrawer();
    });
    renderQuick();
  }
  root.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-vh-plan]') : null;
    if (!btn) return;
    if (btn.getAttribute('data-vh-plan') === 'premium') { if (typeof global.go === 'function') global.go('payments'); }
    else if (typeof global.toast === 'function') global.toast(t('home.plan.free.toast'));
  });

  /* ---- 4. Dynamic parts ------------------------------------------------- */
  function renderQuick() {
    var list = doc.getElementById('vhQuickList'), sub = doc.getElementById('vhQuickSub');
    if (!list) return;
    var shell = global.NutriBentoShell, role = currentRole();
    var pins = ((shell && shell.roles && shell.roles[role]) || ['citizen', 'scanner', 'ai']).filter(function (v) { return v !== 'home'; }).slice(0, 6);
    if (sub) sub.textContent = t('home.quick.sub', { role: t('role.' + role) });
    list.innerHTML = pins.map(function (v) {
      return '<button type="button" class="vh-quick-item" onclick="go(\'' + v + '\')" aria-label="' + esc(t('home.open', { name: t('nav.' + v) })) + '">' +
        '<span class="vh-ico">' + navIcon(v) + '</span><span class="vh-quick-text"><b>' + esc(t('nav.' + v)) + '</b><small>' + esc(t('nav.' + v + '.desc')) + '</small></span>' +
        '<span class="vh-go">' + ico('arrow') + '</span></button>';
    }).join('');
  }
  function renderStatus() {
    var st = doc.getElementById('profileStatus');
    if (!st) return;
    if (state.signed) {
      st.removeAttribute('data-b-i18n');
      st.classList.add('vh-signed');
      st.innerHTML = ico('check') + '<span>' + esc(t('home.profile.signed', { name: state.name || t('role.' + currentRole()), role: t('role.' + currentRole()) })) + '</span>';
    }
  }

  /* chooseRole / signInProfile keep their signatures; the view only reacts after them. */
  function after(name, fn) {
    var original = global[name];
    if (typeof original !== 'function' || original.__vhome) return;
    var wrapped = function () {
      var out = original.apply(this, arguments);
      try { fn.apply(this, arguments); } catch (e) { if (global.console) console.error(e); }
      return out;
    };
    wrapped.__vhome = true;
    if (original.__bento) wrapped.__bento = true;
    global[name] = wrapped;
  }
  function hook() {
    after('chooseRole', function () { renderQuick(); renderStatus(); });
    after('signInProfile', function () {
      var input = doc.getElementById('profileName');
      state.signed = true;
      state.name = input ? input.value.trim() : '';
      renderStatus();
      var box = root.querySelector('details.profile-access');
      if (box && global.matchMedia && global.matchMedia('(max-width: 980px)').matches) box.open = false;
    });
  }

  render();
  hook();
  /* The legacy inline script (re)defines signInProfile after this file: hook again once everything is parsed. */
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(hook, 0); });
  global.addEventListener('load', function () { hook(); renderQuick(); });
  I18N.onChange(function () { I18N.apply(root); renderQuick(); renderStatus(); });

  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.home = { render: render, renderQuick: renderQuick };
})(window);
