/* ==========================================================================
   NUTRI.N°1 — Data Marketplace & APIs view  (SESSION 18)
   Renders <section id="market"> as a Dark Bento catalogue of the five planned
   APIs. No API exists: each card says so, and offers the one thing that is
   real, a JSON sample built from the Food Cloud entries typed on this device.

   Depends on : js/bento-i18n.js, js/bento-shell.js
   Reads      : localStorage.nutri_foodcloud (written by views/view-foodcloud.js)
   Styles     : styles/views.css  (shared .vi-* institution components)
   Note       : the original view was a five-row table (API, customer, purpose);
                its content is kept. Nothing is sent to a server; the sample is
                a file created in the browser.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('market');
  if (!root || !I18N) return;

  I18N.register({
    en: {
      'mkt.kicker': 'DATA · APIS', 'mkt.title': 'Data Marketplace & APIs',
      'mkt.sub': 'The data products the platform is meant to offer to apps, industry, researchers and governments.',
      'mkt.demo': 'No API is online',
      'mkt.kpis': 'Headline indicators',
      'mkt.k.planned': 'APIs planned', 'mkt.k.online': 'APIs online', 'mkt.k.records': 'Local records', 'mkt.k.types': 'APIs with local records',
      'mkt.k.cat': 'In the catalogue below', 'mkt.k.none': 'None exists yet', 'mkt.k.cloud': 'Food Cloud entries on this device', 'mkt.k.of': '{n} of {total}',
      'mkt.cat.title': 'API catalogue', 'mkt.cat.sub': 'Each card describes a planned API. The sample file shows what its records could look like, using the entries typed on this device.',
      'mkt.tag': 'Planned', 'mkt.for': 'For', 'mkt.purpose': 'Purpose', 'mkt.source': 'Sample source',
      'mkt.count': 'Local records: {n}', 'mkt.download': 'Download the sample (JSON)', 'mkt.download.aria': 'Download the sample for {name} (JSON)',
      'mkt.empty': 'No local record yet.', 'mkt.add': 'Add entries in the Food Cloud', 'mkt.add.aria': 'Add entries in the Food Cloud for {name}',
      'mkt.msg.done': 'Sample file created for {name}. Records: {n}.', 'mkt.msg.fail': 'The file could not be created in this browser.',
      'mkt.api.food': 'Food API', 'mkt.api.food.for': 'Apps and industry', 'mkt.api.food.use': 'Food resolution: names, local names, food group', 'mkt.api.food.src': 'Food entries',
      'mkt.api.composition': 'Composition API', 'mkt.api.composition.for': 'Research and food industry', 'mkt.api.composition.use': 'Nutrient data', 'mkt.api.composition.src': 'Laboratory results',
      'mkt.api.recipe': 'Recipe API', 'mkt.api.recipe.for': 'Apps and institutions', 'mkt.api.recipe.use': 'Traditional recipes', 'mkt.api.recipe.src': 'Recipe entries',
      'mkt.api.consumption': 'Consumption API', 'mkt.api.consumption.for': 'Governments', 'mkt.api.consumption.use': 'Dietary patterns', 'mkt.api.consumption.src': 'Consumption entries',
      'mkt.api.national': 'National Intelligence API', 'mkt.api.national.for': 'Governments', 'mkt.api.national.use': 'Indicators and maps', 'mkt.api.national.src': 'Production entries (no map data exists)',
      'mkt.file.title': 'What a sample file contains', 'mkt.file.sub': 'A file created in the browser. Nothing is sent.',
      'mkt.file.1': 'The name of the planned API and the date of the file', 'mkt.file.2': 'The status "not validated": records are as typed, unchecked',
      'mkt.file.3': 'The records of the matching type, from every country', 'mkt.file.4': 'The Food Cloud forms do not ask for personal data, but free-text fields are exported as typed',
      'mkt.file.note': 'The layout of the file is a proposal. It is not the contract of an existing API.',
      'mkt.gap.title': 'What does not exist yet', 'mkt.gap.sub': 'Everything a real data marketplace needs.', 'mkt.gap.none': 'Not available',
      'mkt.gap.1': 'API endpoints and servers', 'mkt.gap.2': 'API keys and authentication', 'mkt.gap.3': 'Pricing, plans and billing', 'mkt.gap.4': 'Technical documentation',
      'mkt.gap.5': 'Terms of use and data licences', 'mkt.gap.6': 'Validated national datasets'
    },
    fr: {
      'mkt.kicker': 'DONNÉES · API', 'mkt.title': 'Marché des données & API',
      'mkt.sub': 'Les produits de données que la plateforme doit proposer aux applications, à l’industrie, aux chercheurs et aux États.',
      'mkt.demo': 'Aucune API n’est en ligne',
      'mkt.kpis': 'Indicateurs clés',
      'mkt.k.planned': 'API prévues', 'mkt.k.online': 'API en ligne', 'mkt.k.records': 'Enregistrements locaux', 'mkt.k.types': 'API avec des enregistrements locaux',
      'mkt.k.cat': 'Dans le catalogue ci-dessous', 'mkt.k.none': 'Aucune n’existe encore', 'mkt.k.cloud': 'Saisies du Cloud alimentaire sur cet appareil', 'mkt.k.of': '{n} sur {total}',
      'mkt.cat.title': 'Catalogue des API', 'mkt.cat.sub': 'Chaque carte décrit une API prévue. Le fichier d’exemple montre à quoi ses enregistrements pourraient ressembler, à partir des saisies de cet appareil.',
      'mkt.tag': 'Prévu', 'mkt.for': 'Pour', 'mkt.purpose': 'Usage', 'mkt.source': 'Source de l’exemple',
      'mkt.count': 'Enregistrements locaux : {n}', 'mkt.download': 'Télécharger l’exemple (JSON)', 'mkt.download.aria': 'Télécharger l’exemple (JSON) : {name}',
      'mkt.empty': 'Aucun enregistrement local pour l’instant.', 'mkt.add': 'Ajouter des saisies dans le Cloud alimentaire', 'mkt.add.aria': 'Ajouter des saisies dans le Cloud alimentaire : {name}',
      'mkt.msg.done': 'Fichier d’exemple créé : {name}. Enregistrements : {n}.', 'mkt.msg.fail': 'Le fichier n’a pas pu être créé dans ce navigateur.',
      'mkt.api.food': 'API Aliments', 'mkt.api.food.for': 'Applications et industrie', 'mkt.api.food.use': 'Identification des aliments : noms, noms locaux, groupe d’aliments', 'mkt.api.food.src': 'Saisies d’aliments',
      'mkt.api.composition': 'API Composition', 'mkt.api.composition.for': 'Recherche et industrie alimentaire', 'mkt.api.composition.use': 'Données sur les nutriments', 'mkt.api.composition.src': 'Résultats de laboratoire',
      'mkt.api.recipe': 'API Recettes', 'mkt.api.recipe.for': 'Applications et institutions', 'mkt.api.recipe.use': 'Recettes traditionnelles', 'mkt.api.recipe.src': 'Saisies de recettes',
      'mkt.api.consumption': 'API Consommation', 'mkt.api.consumption.for': 'États', 'mkt.api.consumption.use': 'Habitudes alimentaires', 'mkt.api.consumption.src': 'Saisies de consommation',
      'mkt.api.national': 'API Intelligence nationale', 'mkt.api.national.for': 'États', 'mkt.api.national.use': 'Indicateurs et cartes', 'mkt.api.national.src': 'Saisies de production (aucune donnée cartographique n’existe)',
      'mkt.file.title': 'Ce que contient un fichier d’exemple', 'mkt.file.sub': 'Un fichier créé dans le navigateur. Rien n’est envoyé.',
      'mkt.file.1': 'Le nom de l’API prévue et la date du fichier', 'mkt.file.2': 'Le statut « non validé » : les enregistrements sont tels que saisis, sans contrôle',
      'mkt.file.3': 'Les enregistrements du type correspondant, tous pays confondus', 'mkt.file.4': 'Les formulaires du Cloud alimentaire ne demandent pas de données personnelles, mais les champs de texte libre sont exportés tels que saisis',
      'mkt.file.note': 'La structure du fichier est une proposition. Ce n’est pas le contrat d’une API existante.',
      'mkt.gap.title': 'Ce qui n’existe pas encore', 'mkt.gap.sub': 'Tout ce qu’il faut à un vrai marché de données.', 'mkt.gap.none': 'Non disponible',
      'mkt.gap.1': 'Points d’accès et serveurs des API', 'mkt.gap.2': 'Clés d’API et authentification', 'mkt.gap.3': 'Tarifs, formules et facturation', 'mkt.gap.4': 'Documentation technique',
      'mkt.gap.5': 'Conditions d’utilisation et licences des données', 'mkt.gap.6': 'Jeux de données nationaux validés'
    }
  });

  /* planned API -> Food Cloud entry type used for its sample */
  var APIS = [['food', 'food'], ['composition', 'lab'], ['recipe', 'recipe'], ['consumption', 'consumption'], ['national', 'production']];
  var ICON = { food: 'leaf', composition: 'flask', recipe: 'bowl', consumption: 'chart', national: 'flag' };
  var state = { msg: '' };
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'); } catch (e) { return String(v); } }
  function typeOf(api) { for (var i = 0; i < APIS.length; i++) if (APIS[i][0] === api) return APIS[i][1]; return null; }
  function records(type) {
    try {
      var raw = JSON.parse(global.localStorage.getItem('nutri_foodcloud') || '[]');
      return (Array.isArray(raw) ? raw : []).filter(function (e) { return e && e.type === type && e.data && typeof e.data === 'object'; }).map(function (e) { return e.data; });
    } catch (e) { return []; }
  }
  function sample(api) {
    var type = typeOf(api); if (!type) return null;
    var list = records(type);
    return { app: 'NUTRI.N°1', api: api, status: 'not validated', note: 'Sample built from local Food Cloud entries. Not the contract of an existing API.', exported: new Date().toISOString(), count: list.length, records: list };
  }
  var PATHS = {
    cloud: '<path d="M7 18a4 4 0 0 1-.500-8A5.500 5.500 0 0 1 17 9a4.500 4.500 0 0 1 0 9zM12 12v5M9.500 14.500 12 17l2.500-2.500"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.500"/><rect x="14" y="4" width="6" height="6" rx="1.500"/><rect x="4" y="14" width="6" height="6" rx="1.500"/><rect x="14" y="14" width="6" height="6" rx="1.500"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14zM5 19l7-7"/>',
    flask: '<path d="M9 4h6M10 4v6l-5 8.500a1 1 0 0 0 .900 1.500h12.200a1 1 0 0 0 .900-1.500L14 10V4M7.500 15h9"/>',
    bowl: '<path d="M4 11h16a8 8 0 0 1-16 0zM9 20h6M12 4v3M8 5v2M16 5v2"/>',
    chart: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
    flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
    file: '<path d="M7 4h7l4 4v12H7zM14 4v4h4M10 13h5M10 16h5"/>',
    plug: '<path d="M9 4v5M15 4v5M7 9h10v3a5 5 0 0 1-10 0zM12 17v3"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title) { return '<header class="vi-head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3></header>'; }
  function kpi(label, id, value, sub) { return '<li class="vi-kpi"><span class="vi-kpi__label">' + esc(label) + '</span><b id="' + id + '">' + esc(value) + '</b><small>' + esc(sub) + '</small></li>'; }

  function render() {
    var counts = {}, total = 0, withData = 0;
    APIS.forEach(function (a) { counts[a[0]] = records(a[1]).length; total += counts[a[0]]; if (counts[a[0]]) withData++; });
    var kpis = kpi(t('mkt.k.planned'), 'mktPlanned', num(APIS.length), t('mkt.k.cat')) + kpi(t('mkt.k.online'), 'mktOnline', '0', t('mkt.k.none')) +
      kpi(t('mkt.k.records'), 'mktRecords', num(total), t('mkt.k.cloud')) + kpi(t('mkt.k.types'), 'mktTypes', t('mkt.k.of', { n: withData, total: APIS.length }), t('mkt.k.cloud'));
    var cards = APIS.map(function (a) {
      var k = a[0], n = counts[k], name = t('mkt.api.' + k);
      return '<li class="vi-api" data-mkt-api="' + k + '"><div class="vi-api__top"><span class="vh-ico">' + ico(ICON[k]) + '</span><h4>' + esc(name) + '</h4><em>' + esc(t('mkt.tag')) + '</em></div>' +
        '<dl><div><dt>' + esc(t('mkt.for')) + '</dt><dd>' + esc(t('mkt.api.' + k + '.for')) + '</dd></div><div><dt>' + esc(t('mkt.purpose')) + '</dt><dd>' + esc(t('mkt.api.' + k + '.use')) + '</dd></div>' +
        '<div><dt>' + esc(t('mkt.source')) + '</dt><dd>' + esc(t('mkt.api.' + k + '.src')) + '</dd></div></dl>' +
        '<p class="vi-api__count' + (n ? ' is-on' : '') + '">' + (n ? ico('check') + esc(t('mkt.count', { n: num(n) })) : esc(t('mkt.empty'))) + '</p>' +
        (n ? '<button type="button" class="btn primary" data-mkt-act="download" aria-label="' + esc(t('mkt.download.aria', { name: name })) + '">' + ico('down') + esc(t('mkt.download')) + '</button>'
           : '<button type="button" class="btn secondary" data-mkt-act="add" aria-label="' + esc(t('mkt.add.aria', { name: name })) + '">' + ico('plus') + esc(t('mkt.add')) + '</button>') + '</li>';
    }).join('');
    var file = [1, 2, 3, 4].map(function (i) { return '<li><span>' + esc(t('mkt.file.' + i)) + '</span></li>'; }).join('');
    var gap = [1, 2, 3, 4, 5, 6].map(function (i) { return '<li><span>' + esc(t('mkt.gap.' + i)) + '</span><b>' + esc(t('mkt.gap.none')) + '</b></li>'; }).join('');
    root.innerHTML = '<div class="vi">' +
      '<section class="card vi-hero"><div class="vh-head"><div class="vi-hero__title"><span class="vh-ico">' + ico('cloud') + '</span><div><span class="vi-kicker">' + esc(t('mkt.kicker')) + '</span><h2>' + esc(t('mkt.title')) + '</h2>' +
        '<p class="vi-sub">' + esc(t('mkt.sub')) + '</p></div></div><span class="pill vi-demo">' + esc(t('mkt.demo')) + '</span></div>' +
        '<ul class="vi-kpis" aria-label="' + esc(t('mkt.kpis')) + '">' + kpis + '</ul></section>' +
      '<div class="vi-grid">' +
        '<section class="card vi-full">' + head('grid', t('mkt.cat.title')) + '<p class="vi-sub">' + esc(t('mkt.cat.sub')) + '</p>' +
          '<p class="vi-status" id="mktStatus" role="status" aria-live="polite">' + esc(state.msg) + '</p><ul class="vi-apis">' + cards + '</ul></section>' +
        '<section class="card vi-half">' + head('file', t('mkt.file.title')) + '<p class="vi-sub">' + esc(t('mkt.file.sub')) + '</p><ul class="vi-rows">' + file + '</ul>' +
          '<p class="vi-note">' + ico('info') + '<span>' + esc(t('mkt.file.note')) + '</span></p></section>' +
        '<section class="card vi-half">' + head('plug', t('mkt.gap.title')) + '<p class="vi-sub">' + esc(t('mkt.gap.sub')) + '</p><ul class="vi-rows">' + gap + '</ul></section>' +
      '</div></div>';
  }
  function download(api) {
    var s = sample(api);
    if (!s || !s.count) return false;
    var ok = true;
    try {
      var url = global.URL.createObjectURL(new global.Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }));
      var a = doc.createElement('a');
      a.href = url; a.download = 'nutri-sample-' + api + '-' + new Date().toISOString().slice(0, 10) + '.json';
      doc.body.appendChild(a); a.click(); a.remove();
      global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 2000);
    } catch (e) { ok = false; }
    state.msg = ok ? t('mkt.msg.done', { name: t('mkt.api.' + api), n: num(s.count) }) : t('mkt.msg.fail');
    render();
    var b = root.querySelector('[data-mkt-api="' + api + '"] [data-mkt-act]'); if (b) b.focus();
    return ok;
  }

  root.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-mkt-act]') : null;
    if (!b) return;
    var li = b.closest('[data-mkt-api]'), api = li && li.getAttribute('data-mkt-api'), type = typeOf(api);
    if (!type) return;
    if (b.getAttribute('data-mkt-act') === 'download') { download(api); return; }
    if (typeof global.go === 'function') global.go('foodcloud');
    var fc = global.NutriBentoViews && global.NutriBentoViews.foodcloud;
    if (fc && fc.setType) fc.setType(type, true);
  });
  if (global.MutationObserver) {
    var shown = root.classList.contains('on');
    new global.MutationObserver(function () { var on = root.classList.contains('on'); if (on && !shown) { state.msg = ''; render(); } shown = on; }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  global.addEventListener('storage', function (ev) { if (ev.key === 'nutri_foodcloud') render(); });

  var api = {
    render: render, sample: sample, download: download,
    state: function () { var c = {}; APIS.forEach(function (a) { c[a[0]] = records(a[1]).length; }); return { counts: c, msg: state.msg }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.market = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'market');
  render();
  I18N.onChange(function () { state.msg = ''; render(); });
})(window);
