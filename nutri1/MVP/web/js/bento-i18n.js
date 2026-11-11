/* ==========================================================================
   NUTRI.N°1 — Unified bilingual EN ↔ FR synchronization bus  (SESSION 0)
   --------------------------------------------------------------------------
   Replaces the five competing language layers that used to live inline in
   index.html (T / V28 / V29 text scanners, V33 NUTRI_I18N, V34 country
   manifest, V48 + V49 selector engines).

   One state, one dispatcher:
     NUTRI_BENTO_I18N.setLang('fr' | 'en')
   is called by every control (header EN|FR pill, <select id="language">,
   the #citizen FR/EN switch through NUTRI_I18N.setLocale) and updates, with
   no page reload:
     localStorage  nutri_language · nutri_czd_lang · nutri_ai_prevention_lang
     <html lang>, NUTRI_I18N (data-i18n keys), CZD_I18N (citizen module),
     the shell dictionary below (data-b-i18n) and the phrase layer that
     translates text rendered by legacy scripts without i18n keys.

   Public API (window.NUTRI_BENTO_I18N)
     lang · t(key, params) · setLang(lang) · toggle() · onChange(fn)
     register({en:{}, fr:{}})      add keys from a view module (views/view-*.js)
     registerPhrases({fr:{}})      add English → French phrases
     apply(root) · translate(text) · parity() · countries · countryName(code)
   Compatibility: window.NUTRI_I18N, NUTRI_V34_MANIFEST, NUTRI_V34_COUNTRY,
     languageChanged(), countryChanged(), v28TranslateAll(), v29TranslateAll().
   ========================================================================== */
(function (global) {
  'use strict';

  var doc = global.document;
  var SUPPORTED = ['en', 'fr'];
  var STORAGE_KEYS = ['nutri_language', 'nutri_czd_lang', 'nutri_ai_prevention_lang'];
  var LOCALES = global.NUTRI_BENTO_LOCALES || { keys: { en: {}, fr: {} }, phrases: { fr: {} }, patterns: { fr: [] } };

  /* ------------------------------------------------------------------ */
  /* Master shell dictionary — every key exists in EN and FR             */
  /* ------------------------------------------------------------------ */
  var DICT = {
    en: {
      'shell.skip': 'Skip to content',
      'shell.version': 'V59',
      'shell.tagline': "Africa's food & nutrition intelligence infrastructure",
      'shell.brand.home': 'NUTRI.N°1 — back to Executive Home',
      'shell.nav.primary': 'Primary navigation',
      'shell.nav.recommended': 'Recommended modules',
      'shell.user.profile': 'Open your profile',
      'shell.user.logout': 'Log out',
      'shell.greeting': 'Hello, {name}!',
      'shell.subtitle': "Ready for today's challenges?",
      'shell.search': 'Search for some activities',
      'shell.search.results': 'Search results',
      'shell.search.empty': 'No module matches “{q}”',
      'shell.language': 'Language',
      'shell.language.en': 'English',
      'shell.language.fr': 'Français',
      'shell.country': 'Country',
      'shell.premium': 'Premium',
      'shell.premium.toast': 'Premium plans — choose a payment method',
      'shell.drawer.title': 'All 18 modules',
      'shell.drawer.open': 'Open all 18 modules',
      'shell.drawer.close': 'Close the module list',
      'shell.drawer.recommended': 'Recommended for you',
      'shell.drawer.all': 'All modules',
      'shell.drawer.role': 'Role',
      'shell.drawer.changeRole': 'Change role',
      'shell.dock.all': 'All',
      'shell.pinned': 'Recommended',
      'shell.toast.lang': 'Interface in English',
      'shell.toast.country': '{country} selected — country intelligence updated',
      'shell.toast.role': 'Workspace adapted for: {role}',
      'shell.toast.logout': 'Signed out — demo profile reset',
      'shell.toast.profile': 'Profile created',
      'shell.guest': 'Alex',

      'group.care': 'Citizen & care',
      'group.food': 'Food & data',
      'group.gov': 'Government',
      'group.partners': 'Development partners',
      'group.science': 'Science & APIs',

      'nav.home': 'Executive Home',
      'nav.home.desc': 'Overview, roles and platform core',
      'nav.citizen': 'Citizen Dashboard 360°',
      'nav.citizen.desc': 'Personal health, activity and nutrition',
      'nav.devices': 'Connected Devices',
      'nav.devices.desc': 'Wearables, glucometers and automatic sync',
      'nav.scanner': 'AI Food & Meal Scanner',
      'nav.scanner.desc': 'Recognise foods, meals and products',
      'nav.ai': 'AI Nutrition & Prevention',
      'nav.ai.desc': 'Personalised plans and risk prevention',
      'nav.network': 'Nutritionist Network',
      'nav.network.desc': 'Practitioners, chat and teleconsultation',
      'nav.payments': 'Payments',
      'nav.payments.desc': 'Country-specific cards and mobile money',
      'nav.marketplace': 'Healthy Food Marketplace',
      'nav.marketplace.desc': 'Healthy products and patient food bridge',
      'nav.foodcloud': 'African Food Cloud',
      'nav.foodcloud.desc': 'Food ontology, composition and recipes',
      'nav.health': 'Ministry of Health Command Center',
      'nav.health.desc': 'National nutrition and NCD surveillance',
      'nav.agri': 'Ministry of Agriculture Food Intelligence',
      'nav.agri.desc': 'Production, markets, losses and climate',
      'nav.unicef': 'UNICEF Nutrition Intelligence Center',
      'nav.unicef.desc': 'Child and maternal nutrition',
      'nav.who': 'WHO Nutrition & NCD Intelligence Center',
      'nav.who.desc': 'Diet-related noncommunicable diseases',
      'nav.wfp': 'WFP Food Security Intelligence Center',
      'nav.wfp.desc': 'Food security and early warning',
      'nav.fao': 'FAO Food Systems Intelligence Center',
      'nav.fao.desc': 'Food systems and supply chains',
      'nav.monitoring': 'Projects, Surveys & Nutrition Surveillance',
      'nav.monitoring.desc': 'M&E, surveys and routine surveillance',
      'nav.research': 'Research & Evidence Graph',
      'nav.research.desc': 'Studies, datasets and evidence links',
      'nav.market': 'Data Marketplace & APIs',
      'nav.market.desc': 'National intelligence APIs and data products',

      'role.citizen': 'Citizen / Individual',
      'role.nutritionist': 'Nutritionist / Health Professional',
      'role.ministry_health': 'Ministry of Health',
      'role.ministry_agri': 'Ministry of Agriculture',
      'role.institution': 'Institution / Research Partner',
      'role.admin': 'Platform Administrator',

      'country.BJ': 'Benin', 'country.BF': 'Burkina Faso', 'country.CV': 'Cabo Verde',
      'country.CI': "Côte d'Ivoire", 'country.GM': 'The Gambia', 'country.GH': 'Ghana',
      'country.GN': 'Guinea', 'country.GW': 'Guinea-Bissau', 'country.LR': 'Liberia',
      'country.ML': 'Mali', 'country.MR': 'Mauritania', 'country.NE': 'Niger',
      'country.NG': 'Nigeria', 'country.SN': 'Senegal', 'country.SL': 'Sierra Leone',
      'country.TG': 'Togo', 'country.TD': 'Chad',

      'sim.close': 'Close',
      'sim.live': 'Live simulation',
      'chart.empty': 'No data available',
      'chart.value': 'Value',

      'field.profileName': 'Full name',
      'field.profileContact': 'Email or phone number',
      'field.profileOrg': 'Organization',
      'field.profileId': 'User ID',
      'field.profileSpecialty': 'Nutritionist specialty',
      'field.period': 'Period',
      'field.careMode': 'Care mode',
      'field.generic': 'Field'
    },
    fr: {
      'shell.skip': 'Aller au contenu',
      'shell.version': 'V59',
      'shell.tagline': 'Infrastructure africaine d’intelligence alimentaire et nutritionnelle',
      'shell.brand.home': 'NUTRI.N°1 — retour à l’accueil exécutif',
      'shell.nav.primary': 'Navigation principale',
      'shell.nav.recommended': 'Modules recommandés',
      'shell.user.profile': 'Ouvrir votre profil',
      'shell.user.logout': 'Se déconnecter',
      'shell.greeting': 'Bonjour, {name} !',
      'shell.subtitle': 'Prêt à relever les défis du jour ?',
      'shell.search': 'Rechercher une activité ou un module...',
      'shell.search.results': 'Résultats de recherche',
      'shell.search.empty': 'Aucun module ne correspond à « {q} »',
      'shell.language': 'Langue',
      'shell.language.en': 'English',
      'shell.language.fr': 'Français',
      'shell.country': 'Pays',
      'shell.premium': 'Premium',
      'shell.premium.toast': 'Offres Premium — choisissez un moyen de paiement',
      'shell.drawer.title': 'Les 18 modules',
      'shell.drawer.open': 'Ouvrir les 18 modules',
      'shell.drawer.close': 'Fermer la liste des modules',
      'shell.drawer.recommended': 'Recommandés pour vous',
      'shell.drawer.all': 'Tous les modules',
      'shell.drawer.role': 'Rôle',
      'shell.drawer.changeRole': 'Changer de rôle',
      'shell.dock.all': 'Tout',
      'shell.pinned': 'Recommandé',
      'shell.toast.lang': 'Interface en français',
      'shell.toast.country': '{country} sélectionné — intelligence pays mise à jour',
      'shell.toast.role': 'Espace adapté au rôle : {role}',
      'shell.toast.logout': 'Déconnecté — profil de démonstration réinitialisé',
      'shell.toast.profile': 'Profil créé',
      'shell.guest': 'Alex',

      'group.care': 'Citoyen & soins',
      'group.food': 'Alimentation & données',
      'group.gov': 'Gouvernement',
      'group.partners': 'Partenaires de développement',
      'group.science': 'Science & API',

      'nav.home': 'Accueil exécutif',
      'nav.home.desc': 'Vue d’ensemble, rôles et socle de la plateforme',
      'nav.citizen': 'Tableau de bord citoyen 360°',
      'nav.citizen.desc': 'Santé, activité et nutrition personnelles',
      'nav.devices': 'Appareils connectés',
      'nav.devices.desc': 'Montres, glucomètres et synchronisation automatique',
      'nav.scanner': 'Scanner IA d’aliments et de repas',
      'nav.scanner.desc': 'Reconnaître aliments, plats et produits',
      'nav.ai': 'IA Nutrition & Prévention',
      'nav.ai.desc': 'Plans personnalisés et prévention des risques',
      'nav.network': 'Réseau de nutritionnistes',
      'nav.network.desc': 'Praticiens, messagerie et téléconsultation',
      'nav.payments': 'Paiements',
      'nav.payments.desc': 'Cartes et mobile money selon le pays',
      'nav.marketplace': 'Marché d’aliments sains',
      'nav.marketplace.desc': 'Produits sains et passerelle alimentaire patient',
      'nav.foodcloud': 'Cloud alimentaire africain',
      'nav.foodcloud.desc': 'Ontologie, composition et recettes des aliments',
      'nav.health': 'Centre de commande du Ministère de la Santé',
      'nav.health.desc': 'Surveillance nationale de la nutrition et des MNT',
      'nav.agri': 'Intelligence alimentaire du Ministère de l’Agriculture',
      'nav.agri.desc': 'Production, marchés, pertes et climat',
      'nav.unicef': 'Centre d’intelligence nutritionnelle UNICEF',
      'nav.unicef.desc': 'Nutrition de l’enfant et de la mère',
      'nav.who': 'Centre OMS Nutrition & MNT',
      'nav.who.desc': 'Maladies non transmissibles liées à l’alimentation',
      'nav.wfp': 'Centre PAM de sécurité alimentaire',
      'nav.wfp.desc': 'Sécurité alimentaire et alerte précoce',
      'nav.fao': 'Centre FAO des systèmes alimentaires',
      'nav.fao.desc': 'Systèmes alimentaires et chaînes d’approvisionnement',
      'nav.monitoring': 'Projets, enquêtes & surveillance nutritionnelle',
      'nav.monitoring.desc': 'Suivi-évaluation, enquêtes et surveillance de routine',
      'nav.research': 'Recherche & graphe des preuves',
      'nav.research.desc': 'Études, jeux de données et liens de preuve',
      'nav.market': 'Marché des données & API',
      'nav.market.desc': 'API d’intelligence nationale et produits de données',

      'role.citizen': 'Citoyen / Particulier',
      'role.nutritionist': 'Nutritionniste / Professionnel de santé',
      'role.ministry_health': 'Ministère de la Santé',
      'role.ministry_agri': 'Ministère de l’Agriculture',
      'role.institution': 'Institution / Partenaire de recherche',
      'role.admin': 'Administrateur de la plateforme',

      'country.BJ': 'Bénin', 'country.BF': 'Burkina Faso', 'country.CV': 'Cabo Verde',
      'country.CI': 'Côte d’Ivoire', 'country.GM': 'Gambie', 'country.GH': 'Ghana',
      'country.GN': 'Guinée', 'country.GW': 'Guinée-Bissau', 'country.LR': 'Libéria',
      'country.ML': 'Mali', 'country.MR': 'Mauritanie', 'country.NE': 'Niger',
      'country.NG': 'Nigéria', 'country.SN': 'Sénégal', 'country.SL': 'Sierra Leone',
      'country.TG': 'Togo', 'country.TD': 'Tchad',

      'sim.close': 'Fermer',
      'sim.live': 'Simulation en direct',
      'chart.empty': 'Aucune donnée disponible',
      'chart.value': 'Valeur',

      'field.profileName': 'Nom complet',
      'field.profileContact': 'E-mail ou numéro de téléphone',
      'field.profileOrg': 'Organisation',
      'field.profileId': 'Identifiant utilisateur',
      'field.profileSpecialty': 'Spécialité du nutritionniste',
      'field.period': 'Période',
      'field.careMode': 'Mode de prise en charge',
      'field.generic': 'Champ'
    }
  };

  /* 17 countries: 12 ECOWAS members + 3 AES members + Mauritania and Chad
     (the two neighbours already present in the platform's own country list). */
  var COUNTRIES = [
    { code: 'BJ', group: 'ECOWAS' }, { code: 'BF', group: 'AES' }, { code: 'CV', group: 'ECOWAS' },
    { code: 'CI', group: 'ECOWAS' }, { code: 'GM', group: 'ECOWAS' }, { code: 'GH', group: 'ECOWAS' },
    { code: 'GN', group: 'ECOWAS' }, { code: 'GW', group: 'ECOWAS' }, { code: 'LR', group: 'ECOWAS' },
    { code: 'ML', group: 'AES' }, { code: 'MR', group: 'PARTNER' }, { code: 'NE', group: 'AES' },
    { code: 'NG', group: 'ECOWAS' }, { code: 'SN', group: 'ECOWAS' }, { code: 'SL', group: 'ECOWAS' },
    { code: 'TG', group: 'ECOWAS' }, { code: 'TD', group: 'PARTNER' }
  ];
  var DEFAULT_COUNTRY = 'TG';

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */
  function store(key, value) {
    try {
      if (value === undefined) return global.localStorage.getItem(key);
      global.localStorage.setItem(key, value);
    } catch (e) { /* private mode / file:// restrictions */ }
    return null;
  }
  function normalize(lang) {
    lang = String(lang || '').toLowerCase();
    if (lang.indexOf('fr') === 0) return 'fr';
    if (lang.indexOf('en') === 0) return 'en';
    return null;
  }
  function initialLang() {
    return normalize(store('nutri_language')) ||
      normalize(global.navigator && global.navigator.language) || 'en';
  }

  var state = { lang: initialLang(), booted: false };
  var listeners = [];

  /* ------------------------------------------------------------------ */
  /* Lookup                                                              */
  /* ------------------------------------------------------------------ */
  var EMOJI = /^(?:[\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u27BF\u2900-\u297F\u2B00-\u2BFF\u3030\u303D\u3297\u3299\uFE0F\u200D\u20E3]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])+\s*/;
  var KEEP_SYMBOL = /^[→←↑↓↗↘✓✔＋]/;

  function stripEmoji(text) {
    if (!text || KEEP_SYMBOL.test(text)) return text;
    var out = text.replace(EMOJI, '');
    return out;
  }
  function fill(text, params) {
    if (!params) return text;
    return String(text).replace(/\{(\w+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m;
    });
  }
  function isTemplateJunk(value) { return typeof value !== 'string' || value.indexOf('${') !== -1; }

  function lookup(key, lang) {
    var d = DICT[lang];
    if (d && Object.prototype.hasOwnProperty.call(d, key)) return d[key];
    var k = LOCALES.keys[lang];
    if (k && Object.prototype.hasOwnProperty.call(k, key) && !isTemplateJunk(k[key])) return k[key];
    return null;
  }
  function t(key, params) {
    var value = lookup(key, state.lang);
    if (value == null) value = lookup(key, 'en');
    if (value == null) value = key;
    return fill(value, params);
  }

  /* ------------------------------------------------------------------ */
  /* Phrase layer — English DOM text → French (legacy, un-keyed content) */
  /* ------------------------------------------------------------------ */
  var compiledPatterns = null;
  function patterns() {
    if (!compiledPatterns) {
      compiledPatterns = ((LOCALES.patterns && LOCALES.patterns.fr) || []).map(function (p) {
        try { return [new RegExp(p[0]), p[1]]; } catch (e) { return null; }
      }).filter(Boolean);
    }
    return compiledPatterns;
  }
  function collapse(text) { return String(text).replace(/\s+/g, ' ').trim(); }

  /* Returns the text to display for an English source string. */
  function translate(source, lang) {
    lang = lang || state.lang;
    var lead = (source.match(/^\s*/) || [''])[0];
    var tail = (source.match(/\s*$/) || [''])[0];
    var core = stripEmoji(collapse(source));
    if (!core) return source.replace(EMOJI, '') === source ? source : lead + tail;
    if (lang === 'en') return core === collapse(source) ? source : lead + core + tail;
    var dict = LOCALES.phrases.fr;
    var hit = Object.prototype.hasOwnProperty.call(dict, core) ? dict[core] : null;
    if (hit == null) {
      var trimmed = core.replace(/[:\s]+$/, '');
      if (trimmed !== core && Object.prototype.hasOwnProperty.call(dict, trimmed)) {
        hit = dict[trimmed] + (/:\s*$/.test(core) ? ' :' : '');
      }
    }
    if (hit == null) {
      var list = patterns();
      for (var i = 0; i < list.length; i++) {
        if (list[i][0].test(core)) {
          hit = core.replace(list[i][0], function () {
            var args = arguments;
            return list[i][1].replace(/\$(\d)/g, function (m, n) {
              var part = args[Number(n)] == null ? '' : String(args[Number(n)]);
              return Object.prototype.hasOwnProperty.call(dict, part) ? dict[part] : part;
            });
          });
          break;
        }
      }
    }
    return lead + (hit == null ? core : hit) + tail;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, SVG: 1, svg: 1 };
  var SKIP_SELECTOR = '#czdRoot,[data-czd-noscan],[data-no-i18n],[data-b-i18n],.bento-rail,.bento-drawer,.bento-dock,.bento-header,svg';

  function skipElement(el) {
    if (!el || SKIP_TAGS[el.tagName]) return true;
    return !!(el.closest && el.closest(SKIP_SELECTOR));
  }
  function setNode(node, lang) {
    var current = node.nodeValue;
    if (node.__bentoSrc === undefined || (current !== node.__bentoOut && current !== node.__bentoSrc)) {
      node.__bentoSrc = current; /* first visit, or rewritten by legacy code */
    }
    var out = translate(node.__bentoSrc, lang);
    /* An emoji that is the only content of its element is an icon: keep it. */
    if (!/\S/.test(out) && node.parentNode && node.parentNode.childNodes.length === 1) out = node.__bentoSrc;
    node.__bentoOut = out;
    if (out !== current) node.nodeValue = out;
  }
  function setAttr(el, attr, lang) {
    var current = el.getAttribute(attr);
    if (current == null || current === '') return;
    var bag = el.__bentoAttr || (el.__bentoAttr = {});
    var rec = bag[attr];
    if (!rec || (current !== rec.out && current !== rec.src)) rec = bag[attr] = { src: current, out: current };
    var out = translate(rec.src, lang);
    rec.out = out;
    if (out !== current) el.setAttribute(attr, out);
  }
  function translateTree(root) {
    if (!root || !doc.body) return;
    var lang = state.lang;
    var start = root.nodeType === 9 ? doc.body : root;
    if (start.nodeType === 3) {
      if (!skipElement(start.parentElement)) setNode(start, lang);
      return;
    }
    if (start.nodeType !== 1 || skipElement(start)) return;
    var walker = doc.createTreeWalker(start, 4 /* SHOW_TEXT */, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.nodeValue || !/\S/.test(n.nodeValue)) continue;
      var p = n.parentElement;
      if (!p || SKIP_TAGS[p.tagName]) continue;
      if (p.closest(SKIP_SELECTOR)) continue;
      setNode(n, lang);
    }
    var withAttr = start.querySelectorAll('[placeholder],[title],[aria-label]');
    for (var j = 0; j < withAttr.length; j++) {
      var el = withAttr[j];
      if (el.closest(SKIP_SELECTOR) || el.closest('.bento-header,.bento-rail,.bento-drawer,.bento-dock')) continue;
      if (el.hasAttribute('placeholder') && !el.hasAttribute('data-i18n-placeholder') && !el.hasAttribute('data-b-i18n-placeholder')) setAttr(el, 'placeholder', lang);
      if (el.hasAttribute('title') && !el.hasAttribute('data-i18n-title')) setAttr(el, 'title', lang);
      if (el.hasAttribute('aria-label') && !el.hasAttribute('data-i18n-aria') && !el.hasAttribute('data-b-i18n-aria')) setAttr(el, 'aria-label', lang);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Keyed layers                                                        */
  /* ------------------------------------------------------------------ */
  function each(root, selector, fn) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches(selector)) fn(root);
    var list = root.querySelectorAll(selector);
    for (var i = 0; i < list.length; i++) fn(list[i]);
  }
  function params(el) {
    var raw = el.getAttribute('data-b-i18n-params');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  /* data-b-i18n*: shell + view-module keys */
  function applyShell(root) {
    root = root || doc;
    each(root, '[data-b-i18n]', function (el) { el.textContent = t(el.getAttribute('data-b-i18n'), params(el)); });
    each(root, '[data-b-i18n-aria]', function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-b-i18n-aria'), params(el))); });
    each(root, '[data-b-i18n-placeholder]', function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-b-i18n-placeholder'), params(el))); });
    each(root, '[data-b-i18n-title]', function (el) { el.setAttribute('title', t(el.getAttribute('data-b-i18n-title'), params(el))); });
  }
  /* data-i18n*: legacy V33 "ui.*" keys. An element is only rewritten while it
     still shows the default text of its key, so values written by the app
     logic (status lines, selected titles…) are never wiped by a language switch. */
  function renderKeys(root) {
    root = root || doc;
    each(root, '[data-i18n]', function (el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
      if (el.closest('#czdRoot,[data-czd-noscan]')) return;
      var key = el.getAttribute('data-i18n');
      var en = lookup(key, 'en');
      if (en == null) return;
      var fr = lookup(key, 'fr');
      var current = stripEmoji(collapse(el.textContent));
      var known = current === stripEmoji(collapse(en)) || (fr != null && current === stripEmoji(collapse(fr)));
      if (!known && el.__bentoKeyed) return;
      if (!known && current !== '') return;
      el.__bentoKeyed = true;
      var next = stripEmoji(t(key));
      if (el.textContent !== next) el.textContent = next;
    });
    each(root, '[data-i18n-placeholder]', function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'))); });
    each(root, '[data-i18n-title]', function (el) { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
    each(root, '[data-i18n-aria]', function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
  }

  var observer = null;
  var pending = [];
  var flushTimer = null;
  function withObserverPaused(fn) {
    if (observer) observer.disconnect();
    try { fn(); } finally {
      if (observer && doc.body) observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    }
  }
  function apply(root) {
    if (!doc.body) return;
    withObserverPaused(function () {
      renderKeys(root || doc);
      applyShell(root || doc);
      translateTree(root || doc.body);
    });
  }
  function flush() {
    flushTimer = null;
    var batch = pending; pending = [];
    withObserverPaused(function () {
      for (var i = 0; i < batch.length; i++) {
        var n = batch[i];
        if (!n.isConnected) continue;
        if (n.nodeType === 1) { renderKeys(n); applyShell(n); }
        translateTree(n);
      }
    });
  }
  function watch() {
    if (observer || !global.MutationObserver || !doc.body) return;
    observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') pending.push(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) pending.push(r.addedNodes[j]);
      }
      if (pending.length && !flushTimer) flushTimer = global.setTimeout(flush, 16);
    });
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
  }

  /* ------------------------------------------------------------------ */
  /* Controls                                                            */
  /* ------------------------------------------------------------------ */
  function syncControls() {
    var select = doc.getElementById('language');
    if (select) {
      if (select.options.length !== 2 || select.options[0].value !== 'en') {
        select.innerHTML = '<option value="en">English</option><option value="fr">Français</option>';
      }
      if (select.value !== state.lang) select.value = state.lang;
    }
    var pills = doc.querySelectorAll('[data-bento-lang]');
    for (var i = 0; i < pills.length; i++) {
      var on = pills[i].getAttribute('data-bento-lang') === state.lang;
      pills[i].classList.toggle('is-on', on);
      pills[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  function syncCitizen() {
    var czd = global.CZD_I18N;
    if (!czd || typeof czd.setLang !== 'function') return;
    if (czd.lang === state.lang && czd.override === state.lang) return;
    czd.setLang(state.lang);
    var root = doc.getElementById('czdRoot');
    if (root && root.firstChild && global.NUTRI_CITIZEN && global.NUTRI_CITIZEN.render) {
      try { global.NUTRI_CITIZEN.render(); } catch (e) { /* module not ready */ }
    }
  }
  function refreshCountryLabels() {
    var select = doc.getElementById('country');
    if (!select) return;
    for (var i = 0; i < select.options.length; i++) {
      var o = select.options[i];
      o.textContent = countryName(o.value);
      o.setAttribute('data-no-i18n', '');
    }
  }

  function setLang(lang, options) {
    lang = normalize(lang) || 'en';
    options = options || {};
    var changed = lang !== state.lang;
    state.lang = lang;
    for (var i = 0; i < STORAGE_KEYS.length; i++) store(STORAGE_KEYS[i], lang);
    if (doc.documentElement) doc.documentElement.lang = lang;
    syncControls();
    refreshCountryLabels();
    apply();
    syncCitizen();
    for (var j = 0; j < listeners.length; j++) {
      try { listeners[j](lang, changed); } catch (e) { if (global.console) console.error(e); }
    }
    try {
      doc.dispatchEvent(new CustomEvent('nutri:i18nChanged', { detail: { locale: lang, lang: lang, changed: changed } }));
    } catch (e) { /* very old browsers */ }
    if (changed && !options.silent && state.booted && typeof global.toast === 'function') {
      global.toast(t('shell.toast.lang'));
    }
    return lang;
  }

  /* ------------------------------------------------------------------ */
  /* Countries                                                           */
  /* ------------------------------------------------------------------ */
  function countryName(code, lang) {
    var v = lookup('country.' + code, lang || state.lang);
    return v == null ? code : v;
  }
  function ensureCountries() {
    var select = doc.getElementById('country');
    if (!select) return null;
    var wanted = select.value || store('nutri_country') || DEFAULT_COUNTRY;
    var codes = [];
    for (var i = 0; i < select.options.length; i++) codes.push(select.options[i].value);
    if (codes.join() !== COUNTRIES.map(function (c) { return c.code; }).join()) {
      var saved = store('nutri_country');
      wanted = saved || DEFAULT_COUNTRY;
      select.innerHTML = COUNTRIES.map(function (c) {
        return '<option value="' + c.code + '" data-no-i18n>' + countryName(c.code) + '</option>';
      }).join('');
    }
    if (!COUNTRIES.some(function (c) { return c.code === wanted; })) wanted = DEFAULT_COUNTRY;
    select.value = wanted;
    return select;
  }
  function fillLegacyCountrySelects() {
    var food = doc.getElementById('foodCountry');
    var html = COUNTRIES.map(function (c) {
      return '<option value="' + c.code + '">' + countryName(c.code, 'en') + '</option>';
    }).join('');
    if (food) { var fv = food.value; food.innerHTML = html; if (fv) food.value = fv; }
    var lists = doc.querySelectorAll('.countryList');
    for (var i = 0; i < lists.length; i++) {
      lists[i].innerHTML = COUNTRIES.map(function (c) { return '<option>' + countryName(c.code, 'en') + '</option>'; }).join('');
    }
  }

  /* Global hooks kept for the inline handlers of index.html */
  global.countryChanged = function () {
    var select = ensureCountries();
    if (!select) return;
    var code = select.value;
    store('nutri_country', code);
    fillLegacyCountrySelects();
    try {
      /* Chad was missing from the legacy payment table. */
      if (typeof payment !== 'undefined' && !payment.TD) payment.TD = ['Bank Card', 'Airtel Money', 'Moov Money'];
      if (typeof global.renderPayments === 'function') global.renderPayments(code);
    } catch (e) { /* payments view not ready */ }
    syncControls();
    apply();
    try {
      doc.dispatchEvent(new CustomEvent('nutri:countryChanged', { detail: { country: code, languages: SUPPORTED.slice() } }));
    } catch (e) { /* noop */ }
    if (state.booted && typeof global.toast === 'function') {
      global.toast(t('shell.toast.country', { country: countryName(code) }));
    }
  };
  global.languageChanged = function () {
    var select = doc.getElementById('language');
    setLang(select ? select.value : state.lang);
  };
  /* Former text scanners: now a single pass through the bus. */
  global.v28TranslateAll = global.v29TranslateAll = function () { apply(); };
  global.v29Install = function () {};

  /* ------------------------------------------------------------------ */
  /* Compatibility objects                                               */
  /* ------------------------------------------------------------------ */
  global.NUTRI_EMBEDDED_LOCALES = LOCALES.keys;
  global.NUTRI_I18N = {
    get locale() { return state.lang; },
    set locale(v) { setLang(v, { silent: true }); },
    dictionaries: LOCALES.keys,
    load: function (locale) { return Promise.resolve(LOCALES.keys[normalize(locale) || 'en']); },
    init: function () { return Promise.resolve(); },
    t: t,
    setLocale: function (locale) { setLang(locale, { silent: true }); return Promise.resolve(); },
    render: function (root) { apply(root && root.nodeType ? root : undefined); },
    renderModule: function (root) { apply(root && root.nodeType ? root : undefined); }
  };
  global.NUTRI_V34_MANIFEST = {
    version: '59.0',
    scope: '12 ECOWAS member states + 3 AES member states + Mauritania and Chad',
    defaultCountry: DEFAULT_COUNTRY,
    countryCount: COUNTRIES.length,
    countries: COUNTRIES.map(function (c) {
      return { code: c.code, name: countryName(c.code, 'en'), group: c.group, official: SUPPORTED.slice(), local: [], default: 'fr' };
    }),
    languageLabels: { en: 'English', fr: 'Français' }
  };
  global.NUTRI_V34_COUNTRY = {
    manifest: global.NUTRI_V34_MANIFEST,
    countrySelect: function () { return doc.getElementById('country'); },
    languageSelect: function () { return doc.getElementById('language'); },
    init: function () { ensureCountries(); syncControls(); },
    ensureCountry: ensureCountries,
    available: function () { return SUPPORTED.slice(); },
    rebuildLanguages: syncControls,
    bind: function () {}
  };

  /* ------------------------------------------------------------------ */
  /* Public API                                                          */
  /* ------------------------------------------------------------------ */
  function merge(target, source) {
    for (var k in source) if (Object.prototype.hasOwnProperty.call(source, k)) target[k] = source[k];
  }
  var API = {
    supported: SUPPORTED.slice(),
    storageKeys: STORAGE_KEYS.slice(),
    countries: COUNTRIES,
    get lang() { return state.lang; },
    t: t,
    translate: translate,
    stripEmoji: stripEmoji,
    setLang: setLang,
    toggle: function () { return setLang(state.lang === 'fr' ? 'en' : 'fr'); },
    apply: apply,
    countryName: countryName,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    /* views/view-*.js register their own keys here: register({en:{…}, fr:{…}}) */
    register: function (pack) {
      if (!pack) return;
      merge(DICT.en, pack.en || {}); merge(DICT.fr, pack.fr || {});
      if (state.booted) apply();
    },
    registerPhrases: function (pack) {
      if (!pack) return;
      merge(LOCALES.phrases.fr, pack.fr || pack);
      if (state.booted) apply();
    },
    /* EN/FR parity report: every key must exist, non-empty, in both languages. */
    parity: function () {
      var en = Object.keys(DICT.en), fr = Object.keys(DICT.fr);
      var uiEn = Object.keys(LOCALES.keys.en || {}), uiFr = Object.keys(LOCALES.keys.fr || {});
      return {
        en: en.length, fr: fr.length,
        missingFr: en.filter(function (k) { return !DICT.fr[k]; }),
        missingEn: fr.filter(function (k) { return !DICT.en[k]; }),
        uiKeys: uiEn.length,
        uiMissingFr: uiEn.filter(function (k) { return uiFr.indexOf(k) === -1; }),
        phrases: Object.keys(LOCALES.phrases.fr).length
      };
    }
  };
  global.NUTRI_BENTO_I18N = API;

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  doc.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-bento-lang]') : null;
    if (!btn) return;
    e.preventDefault();
    setLang(btn.getAttribute('data-bento-lang'));
  });

  function boot() {
    ensureCountries();
    setLang(state.lang, { silent: true });
    watch();
    /* Late modules (citizen dashboard) boot after us: settle once more. */
    global.setTimeout(function () { syncCitizen(); apply(); state.booted = true; }, 400);
  }
  if (doc.documentElement) doc.documentElement.lang = state.lang;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
