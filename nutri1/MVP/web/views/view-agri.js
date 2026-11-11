/* ==========================================================================
   NUTRI.N°1 — Ministry of Agriculture Food Intelligence view  (SESSION 11)
   Renders <section id="agri"> as a Dark Bento dashboard built on the production and
   consumption entries recorded in the African Food Cloud workbench for the
   selected country: production by food group, recorded crops, recorded intakes,
   the agrifood intelligence modules and the data products.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Reads      : localStorage.nutri_foodcloud (written by views/view-foodcloud.js)
   Styles     : styles/views.css  (.vr-*)
   Note       : the prototype had no agricultural data (every tile showed "—") and its
                charts drew invented series; those were removed. This view shows only what
                was entered locally. "National needs" and "Production gap" need a population
                and requirement reference that is not connected, so they stay empty.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('agri');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'agri.kicker': 'MINISTRY OF AGRICULTURE', 'agri.title': 'Ministry of Agriculture Food Intelligence',
      'agri.sub': 'Production and consumption recorded for {country}, by food group.',
      'agri.demo': 'Local entries · no national data connected',
      'agri.g.cereals': 'Cereals', 'agri.g.tubers': 'Tubers & roots', 'agri.g.fruits': 'Fruits & vegetables', 'agri.g.legumes': 'Legumes', 'agri.g.oilseeds': 'Oilseeds', 'agri.g.animal': 'Animal-source foods', 'agri.g.other': 'Unclassified',
      'agri.kpis': 'Production by food group', 'agri.kpi.none': 'No entry', 'agri.kpi.entries': 'Entries: {n}', 'agri.kpi.gap': 'Production gap', 'agri.kpi.needs': 'National needs',
      'agri.kpi.na': 'Reference not connected',
      'agri.year': 'Year', 'agri.year.all': 'All years',
      'agri.empty.title': 'No production data for {country} yet',
      'agri.empty.text': 'This dashboard shows the production entries recorded in the African Food Cloud. Add a crop, its food group, year and tonnage to see it here.',
      'agri.add': 'Add production data', 'agri.add.cons': 'Add consumption data',
      'agri.prod.title': 'Production by food group', 'agri.prod.total': 'Total recorded: {value}', 'agri.prod.share': '{pct} of the recorded total',
      'agri.crops.title': 'Recorded crops', 'agri.crops.count': 'Entries: {n}',
      'agri.c.crop': 'Crop', 'agri.c.group': 'Food group', 'agri.c.region': 'Region', 'agri.c.year': 'Year', 'agri.c.tonnes': 'Tonnes', 'agri.c.source': 'Source',
      'agri.c.none': 'Not given',
      'agri.cons.title': 'Recorded consumption', 'agri.cons.sub': 'Average intakes entered for {country}. No requirement reference is connected, so intakes are not compared with needs.',
      'agri.cons.empty': 'No consumption entry for this country yet.',
      'agri.cons.unit': 'g/day',
      'agri.pop.all': 'General population', 'agri.pop.children': 'Children under 5', 'agri.pop.school': 'School-age children', 'agri.pop.women': 'Women 15–49', 'agri.pop.adults': 'Adults', 'agri.pop.elderly': 'Older adults',
      'agri.note': 'Figures are the sum of the entries saved in this browser. They have not been validated and are not national statistics.',
      'agri.mod.title': 'National agrifood intelligence', 'agri.mod.sub': 'Farm-to-fork intelligence for production, markets, resilience, nutrition and value addition.', 'agri.mod.status': 'Planned module',
      'agri.m.1': 'Farmer registry', 'agri.m.1.d': 'Producer, farm, crop, variety, season, production and market-access profiles.',
      'agri.m.2': 'Production forecast', 'agri.m.2.d': 'Crop area, yield, harvest forecast and production gaps.',
      'agri.m.3': 'Climate early warning', 'agri.m.3.d': 'Weather, drought, flood, heat and crop-risk signals.',
      'agri.m.4': 'Post-harvest loss observatory', 'agri.m.4.d': 'Loss quantity, stage, cause, cost and hotspot mapping.',
      'agri.m.5': 'Food price intelligence', 'agri.m.5.d': 'Market prices, anomalies, availability and trends.',
      'agri.m.6': 'Processing and value addition', 'agri.m.6.d': 'Transformation yields, costs, losses, quality and value creation.',
      'agri.m.7': 'Nutrition-sensitive agriculture', 'agri.m.7.d': 'Availability of diverse, nutrient-dense and biofortified foods.',
      'agri.m.8': 'Food safety', 'agri.m.8.d': 'Aflatoxins, microbiology, quality, traceability and laboratory provenance.',
      'agri.m.9': 'Satellite and drone intelligence', 'agri.m.9.d': 'Farm monitoring, stress detection and targeted field verification.',
      'agri.prod2.title': 'Ministry of Agriculture data products', 'agri.p.c1': 'Product', 'agri.p.c2': 'Primary output', 'agri.p.c3': 'Decision use',
      'agri.p.1': 'National Agrifood Command Center', 'agri.p.1.o': 'Production, markets, climate and nutrition', 'agri.p.1.u': 'Sector planning',
      'agri.p.2': 'Post-Harvest Loss Observatory', 'agri.p.2.o': 'Loss hotspots and causes', 'agri.p.2.u': 'Investment targeting',
      'agri.p.3': 'Food Price Observatory', 'agri.p.3.o': 'Price trends and anomalies', 'agri.p.3.u': 'Market monitoring',
      'agri.p.4': 'Nutrition-Sensitive Agriculture Dashboard', 'agri.p.4.o': 'Healthy-food availability', 'agri.p.4.u': 'Nutrition policy',
      'agri.p.5': 'Value Chain Intelligence', 'agri.p.5.o': 'Processing and value addition', 'agri.p.5.u': 'Industrial and agricultural investment'
    },
    fr: {
      'agri.kicker': 'MINISTÈRE DE L’AGRICULTURE', 'agri.title': 'Intelligence alimentaire du ministère de l’Agriculture',
      'agri.sub': 'Production et consommation enregistrées par groupe d’aliments : {country}.',
      'agri.demo': 'Saisies locales · aucune donnée nationale connectée',
      'agri.g.cereals': 'Céréales', 'agri.g.tubers': 'Tubercules et racines', 'agri.g.fruits': 'Fruits et légumes', 'agri.g.legumes': 'Légumineuses', 'agri.g.oilseeds': 'Oléagineux', 'agri.g.animal': 'Aliments d’origine animale', 'agri.g.other': 'Non classé',
      'agri.kpis': 'Production par groupe d’aliments', 'agri.kpi.none': 'Aucune saisie', 'agri.kpi.entries': 'Saisies : {n}', 'agri.kpi.gap': 'Écart de production', 'agri.kpi.needs': 'Besoins nationaux',
      'agri.kpi.na': 'Référence non connectée',
      'agri.year': 'Année', 'agri.year.all': 'Toutes les années',
      'agri.empty.title': 'Pas encore de données de production : {country}',
      'agri.empty.text': 'Ce tableau de bord affiche les saisies de production enregistrées dans le Cloud alimentaire africain. Ajoutez une culture, son groupe d’aliments, l’année et le tonnage pour la voir ici.',
      'agri.add': 'Ajouter des données de production', 'agri.add.cons': 'Ajouter des données de consommation',
      'agri.prod.title': 'Production par groupe d’aliments', 'agri.prod.total': 'Total enregistré : {value}', 'agri.prod.share': '{pct} du total enregistré',
      'agri.crops.title': 'Cultures enregistrées', 'agri.crops.count': 'Saisies : {n}',
      'agri.c.crop': 'Culture', 'agri.c.group': 'Groupe d’aliments', 'agri.c.region': 'Région', 'agri.c.year': 'Année', 'agri.c.tonnes': 'Tonnes', 'agri.c.source': 'Source',
      'agri.c.none': 'Non précisé',
      'agri.cons.title': 'Consommation enregistrée', 'agri.cons.sub': 'Consommations moyennes saisies : {country}. Aucune référence de besoins n’est connectée : elles ne sont donc pas comparées aux besoins.',
      'agri.cons.empty': 'Pas encore de saisie de consommation pour ce pays.',
      'agri.cons.unit': 'g/jour',
      'agri.pop.all': 'Population générale', 'agri.pop.children': 'Enfants de moins de 5 ans', 'agri.pop.school': 'Enfants d’âge scolaire', 'agri.pop.women': 'Femmes de 15 à 49 ans', 'agri.pop.adults': 'Adultes', 'agri.pop.elderly': 'Personnes âgées',
      'agri.note': 'Les chiffres sont la somme des saisies enregistrées dans ce navigateur. Ils n’ont pas été validés et ne sont pas des statistiques nationales.',
      'agri.mod.title': 'Veille agroalimentaire nationale', 'agri.mod.sub': 'De la ferme à l’assiette : production, marchés, résilience, nutrition et création de valeur.', 'agri.mod.status': 'Module prévu',
      'agri.m.1': 'Registre des agriculteurs', 'agri.m.1.d': 'Profils des producteurs : exploitation, culture, variété, saison, production et accès au marché.',
      'agri.m.2': 'Prévision de production', 'agri.m.2.d': 'Surfaces, rendements, prévisions de récolte et écarts de production.',
      'agri.m.3': 'Alerte climatique précoce', 'agri.m.3.d': 'Signaux météo, sécheresse, inondation, chaleur et risques pour les cultures.',
      'agri.m.4': 'Observatoire des pertes après récolte', 'agri.m.4.d': 'Quantités perdues, étape, cause, coût et cartographie des zones critiques.',
      'agri.m.5': 'Veille sur les prix alimentaires', 'agri.m.5.d': 'Prix des marchés, anomalies, disponibilité et tendances.',
      'agri.m.6': 'Transformation et création de valeur', 'agri.m.6.d': 'Rendements de transformation, coûts, pertes, qualité et valeur créée.',
      'agri.m.7': 'Agriculture sensible à la nutrition', 'agri.m.7.d': 'Disponibilité d’aliments variés, denses en nutriments et biofortifiés.',
      'agri.m.8': 'Sécurité sanitaire des aliments', 'agri.m.8.d': 'Aflatoxines, microbiologie, qualité, traçabilité et provenance des analyses.',
      'agri.m.9': 'Veille par satellite et drone', 'agri.m.9.d': 'Suivi des exploitations, détection du stress et vérifications ciblées sur le terrain.',
      'agri.prod2.title': 'Produits de données du ministère de l’Agriculture', 'agri.p.c1': 'Produit', 'agri.p.c2': 'Résultat principal', 'agri.p.c3': 'Usage pour la décision',
      'agri.p.1': 'Centre de commande agroalimentaire national', 'agri.p.1.o': 'Production, marchés, climat et nutrition', 'agri.p.1.u': 'Planification du secteur',
      'agri.p.2': 'Observatoire des pertes après récolte', 'agri.p.2.o': 'Zones critiques et causes des pertes', 'agri.p.2.u': 'Ciblage des investissements',
      'agri.p.3': 'Observatoire des prix alimentaires', 'agri.p.3.o': 'Tendances et anomalies de prix', 'agri.p.3.u': 'Suivi des marchés',
      'agri.p.4': 'Tableau de bord de l’agriculture sensible à la nutrition', 'agri.p.4.o': 'Disponibilité des aliments sains', 'agri.p.4.u': 'Politique de nutrition',
      'agri.p.5': 'Veille sur les chaînes de valeur', 'agri.p.5.o': 'Transformation et création de valeur', 'agri.p.5.u': 'Investissement industriel et agricole'
    }
  });

  /* ---- 2. Data access --------------------------------------------------- */
  var GROUPS = ['cereals', 'tubers', 'fruits', 'legumes', 'oilseeds', 'animal'];
  var POPS = ['all', 'children', 'school', 'women', 'adults', 'elderly'];
  var G_ICON = { cereals: 'grain', tubers: 'tuber', fruits: 'leaf', legumes: 'bean', oilseeds: 'drop', animal: 'egg', other: 'box' };
  var M_ICON = ['people', 'sprout', 'cloud', 'box', 'coin', 'factory', 'leaf', 'flask', 'sat'];
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  var state = { country: headerCountry(), year: 'latest' };
  function entries(type) {
    try {
      var raw = JSON.parse(global.localStorage.getItem('nutri_foodcloud') || '[]');
      return (Array.isArray(raw) ? raw : []).filter(function (e) { return e && e.type === type && e.data && e.data.country === state.country; }).map(function (e) { return e.data; });
    } catch (e) { return []; }
  }
  function grp(d) { return GROUPS.indexOf(d.group) >= 0 ? d.group : 'other'; }
  function model() {
    var prod = entries('production').filter(function (d) { return Number(d.tonnes) > 0 && Number(d.year) > 0; });
    var years = [];
    prod.forEach(function (d) { if (years.indexOf(Number(d.year)) < 0) years.push(Number(d.year)); });
    years.sort(function (a, b) { return b - a; });
    var year = state.year === 'latest' ? (years[0] || null) : (state.year === 'all' ? 'all' : (years.indexOf(Number(state.year)) >= 0 ? Number(state.year) : (years[0] || null)));
    var rows = prod.filter(function (d) { return year === 'all' || Number(d.year) === year; });
    var sums = {}, counts = {}, total = 0;
    rows.forEach(function (d) { var g = grp(d); sums[g] = (sums[g] || 0) + Number(d.tonnes); counts[g] = (counts[g] || 0) + 1; total += Number(d.tonnes); });
    rows.sort(function (a, b) { return Number(b.tonnes) - Number(a.tonnes); });
    return { years: years, year: year, rows: rows, sums: sums, counts: counts, total: total, cons: entries('consumption').filter(function (d) { return Number(d.amount) > 0; }) };
  }

  /* ---- 3. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function num(v, d) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: d == null ? 1 : d }); } catch (e) { return String(v); } }
  function tonnes(v) { return num(v, v < 100 ? 1 : 0) + ' t'; }
  function pct(v) { return num(v, 0) + (I18N.lang === 'fr' ? ' %' : '%'); }
  var PATHS = {
    agri: '<path d="M12 21V8M12 8c-2-1-3-3-3-5 2 0 3 1.500 3 3 0-1.500 1-3 3-3 0 2-1 4-3 5zM12 13c-2.500 0-4-1.500-4-4M12 13c2.500 0 4-1.500 4-4M12 18c-2.500 0-4-1.500-4-4M12 18c2.500 0 4-1.500 4-4"/>',
    grain: '<path d="M12 21V8M12 8c-2-1-3-3-3-5 2 0 3 1.500 3 3 0-1.500 1-3 3-3 0 2-1 4-3 5zM12 13c-2.500 0-4-1.500-4-4M12 13c2.500 0 4-1.500 4-4M12 18c-2.500 0-4-1.500-4-4M12 18c2.500 0 4-1.500 4-4"/>',
    tuber: '<path d="M6 14c0-5 4-9 8-9 3 0 5 2 5 5 0 5-5 9-9 9-2.500 0-4-2-4-5z"/><path d="M11 11.500h.100M14.500 9.500h.100M11.500 15h.100"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c2-4 5-7 9-9"/>',
    bean: '<path d="M7 4c7 0 12 5 12 12 0 2-1.500 4-4 4-5.500 0-10-4.500-10-10 0-3 0-6 2-6z"/><circle cx="10" cy="10" r="1.200"/><circle cx="14" cy="14.500" r="1.200"/>',
    drop: '<path d="M12 3.500c3.500 4.300 6 7.500 6 10.800A6 6 0 0 1 6 14.300c0-3.300 2.500-6.500 6-10.800z"/>',
    egg: '<path d="M12 3.500c3.300 0 6 5 6 9.500a6 6 0 0 1-12 0c0-4.500 2.700-9.500 6-9.500z"/>',
    box: '<path d="M4 8.500 12 4l8 4.500v7L12 20l-8-4.500zM4 8.500l8 4.500 8-4.500M12 13v7"/>',
    bars: '<path d="M4 20h16M7 20v-6M12 20V6M17 20v-9"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.100M4 12h.100M4 17h.100"/>',
    bowl: '<path d="M4 11h16a8 8 0 0 1-16 0zM9 20h6M9 7c0-1.500 1.500-1.500 1.500-3M13.500 7c0-1.500 1.500-1.500 1.500-3"/>',
    grid: '<rect x="4" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.500"/>',
    people: '<circle cx="9" cy="8" r="3.200"/><path d="M3 20c0-3.300 2.700-5.500 6-5.500s6 2.200 6 5.500M16 5.200a3.200 3.200 0 0 1 0 5.800M21 20c0-2.600-1.500-4.500-3.800-5.200"/>',
    sprout: '<path d="M12 21v-8M12 13c0-4-2.500-6.500-7-6.500 0 4 2.500 6.500 7 6.500zM12 10c0-3.500 2.300-5.800 6.500-5.800 0 3.700-2.300 5.800-6.500 5.800z"/>',
    cloud: '<path d="M7 16a4 4 0 0 1-.500-7.950A5.500 5.500 0 0 1 17 7.500a4.200 4.200 0 0 1 0 8.500zM9 19.500v.100M12 19.500v.100M15 19.500v.100"/>',
    coin: '<circle cx="12" cy="12" r="8.500"/><path d="M14.500 9.500c-.500-1-1.500-1.500-2.500-1.500-1.500 0-2.500.800-2.500 2s1 1.700 2.500 2 2.500.800 2.500 2-1 2-2.500 2c-1.200 0-2.200-.500-2.700-1.500M12 6.500V8M12 16v1.500"/>',
    factory: '<path d="M4 20V10l5 3v-3l5 3V6h5v14zM8 16.500h.100M12 16.500h.100M16 16.500h.100"/>',
    flask: '<path d="M9.500 4h5M10.500 4v5.500L5.500 18a1.500 1.500 0 0 0 1.300 2.200h10.400a1.500 1.500 0 0 0 1.300-2.200l-5-8.500V4M8 15h8"/>',
    sat: '<path d="m8.500 8.500 7 7M6 11l-2.500-2.500 5-5L11 6zM13 18l2.500 2.500 5-5L18 13zM5 16a4 4 0 0 0 4 4"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra) {
    return '<header class="vr-card__head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3>' + (extra || '') + '</header>';
  }

  /* ---- 4. Render ------------------------------------------------------------ */
  function render() {
    var m = model(), name = cname(state.country), has = m.rows.length > 0;
    var kpis = GROUPS.map(function (g) {
      var v = m.sums[g];
      return '<li class="vr-kpi"><span class="vr-kpi__ico">' + ico(G_ICON[g]) + '</span><span class="vr-kpi__label">' + esc(t('agri.g.' + g)) + '</span><b>' + (v ? esc(tonnes(v)) : '—') + '</b>' +
        '<small>' + esc(v ? t('agri.kpi.entries', { n: m.counts[g] }) : t('agri.kpi.none')) + '</small></li>';
    }).join('') + ['gap', 'needs'].map(function (k) {
      return '<li class="vr-kpi vr-kpi--na"><span class="vr-kpi__ico">' + ico('info') + '</span><span class="vr-kpi__label">' + esc(t('agri.kpi.' + k)) + '</span><b>—</b><small>' + esc(t('agri.kpi.na')) + '</small></li>';
    }).join('');
    var yearSel = m.years.length ? '<label class="vr-field"><span>' + esc(t('agri.year')) + '</span><select id="vrYear">' + m.years.map(function (y) {
      return '<option value="' + y + '"' + (m.year === y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '<option value="all"' + (m.year === 'all' ? ' selected' : '') + '>' + esc(t('agri.year.all')) + '</option></select></label>' : '';
    var keys = GROUPS.concat(['other']).filter(function (g) { return m.sums[g]; }).sort(function (a, b) { return m.sums[b] - m.sums[a]; });
    var max = keys.length ? m.sums[keys[0]] : 1;
    var prodCard = has
      ? head('bars', t('agri.prod.title'), yearSel) + '<p class="vr-sub">' + esc(t('agri.prod.total', { value: tonnes(m.total) })) + '</p><ul class="vr-bars">' + keys.map(function (g) {
          return '<li><div class="vr-bars__top"><span><b>' + esc(t('agri.g.' + g)) + '</b><small>' + esc(t('agri.prod.share', { pct: pct(m.sums[g] / m.total * 100) })) + '</small></span><strong>' + esc(tonnes(m.sums[g])) + '</strong></div>' +
            '<div class="vr-bar" aria-hidden="true"><i style="--w:' + (m.sums[g] / max * 100).toFixed(1) + '%"></i></div></li>'; }).join('') + '</ul>'
      : head('bars', t('agri.prod.title')) + '<div class="vr-empty"><b>' + esc(t('agri.empty.title', { country: name })) + '</b><p>' + esc(t('agri.empty.text')) + '</p>' +
          '<button type="button" class="btn primary" data-vr-act="add-production">' + ico('plus') + esc(t('agri.add')) + '</button></div>';
    var cropsCard = has ? '<section class="card vr-full">' + head('list', t('agri.crops.title'), '<span class="pill vr-count">' + esc(t('agri.crops.count', { n: m.rows.length })) + '</span>') +
      '<div class="vr-tablewrap"><table class="vr-table"><thead><tr>' + ['crop', 'group', 'region', 'year', 'tonnes', 'source'].map(function (c) { return '<th scope="col"' + (c === 'tonnes' ? ' class="vr-num"' : '') + '>' + esc(t('agri.c.' + c)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      m.rows.map(function (d) {
        function td(c, v, cls) { return '<td data-label="' + esc(t('agri.c.' + c)) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(v) + '</td>'; }
        return '<tr><th scope="row">' + esc(d.name) + '</th>' + td('group', t('agri.g.' + grp(d))) + td('region', d.region || t('agri.c.none')) + td('year', String(d.year)) + td('tonnes', num(d.tonnes, 1), 'vr-num') + td('source', d.source || t('agri.c.none')) + '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="vr-actions"><button type="button" class="btn secondary" data-vr-act="add-production">' + ico('plus') + esc(t('agri.add')) + '</button></div></section>' : '';
    var consCard = head('bowl', t('agri.cons.title')) + '<p class="vr-sub">' + esc(t('agri.cons.sub', { country: name })) + '</p>' +
      (m.cons.length ? '<ul class="vr-cons">' + m.cons.map(function (d) {
        return '<li><span><b>' + esc(d.name) + '</b><small>' + esc(t('agri.g.' + grp(d))) + ' · ' + esc(POPS.indexOf(d.pop) >= 0 ? t('agri.pop.' + d.pop) : t('agri.c.none')) + '</small></span><strong>' + esc(num(d.amount, 1)) + ' ' + esc(t('agri.cons.unit')) + '</strong></li>'; }).join('') + '</ul>'
        : '<p class="vr-empty vr-empty--line">' + esc(t('agri.cons.empty')) + '</p>') +
      '<div class="vr-actions"><button type="button" class="btn secondary" data-vr-act="add-consumption">' + ico('plus') + esc(t('agri.add.cons')) + '</button></div>';
    root.innerHTML = '<div class="vr">' +
      '<section class="card vr-hero"><div class="vh-head"><div class="vr-hero__title"><span class="vh-ico">' + ico('agri') + '</span><div><span class="vr-kicker">' + esc(t('agri.kicker')) + '</span><h2>' + esc(t('agri.title')) + '</h2>' +
        '<p class="vr-sub">' + esc(t('agri.sub', { country: name })) + '</p></div></div><span class="pill vr-demo">' + esc(t('agri.demo')) + '</span></div>' +
        '<ul class="vr-kpis" aria-label="' + esc(t('agri.kpis')) + '">' + kpis + '</ul></section>' +
      '<div class="vr-grid">' +
        '<section class="card vr-wide">' + prodCard + '</section>' +
        '<section class="card vr-side">' + consCard + '</section>' + cropsCard +
        (has || m.cons.length ? '<p class="vr-note vr-full">' + ico('info') + '<span>' + esc(t('agri.note')) + '</span></p>' : '') +
        '<section class="card vr-full">' + head('grid', t('agri.mod.title'), '<span class="pill vr-pill">' + esc(t('agri.kicker')) + '</span>') + '<p class="vr-sub">' + esc(t('agri.mod.sub')) + '</p>' +
          '<ul class="vr-mods">' + M_ICON.map(function (ic, i) {
            return '<li><span class="vr-mods__ico">' + ico(ic) + '</span><b>' + esc(t('agri.m.' + (i + 1))) + '</b><p>' + esc(t('agri.m.' + (i + 1) + '.d')) + '</p><small>' + esc(t('agri.mod.status')) + '</small></li>'; }).join('') + '</ul></section>' +
        '<section class="card vr-full">' + head('box', t('agri.prod2.title')) +
          '<div class="vr-tablewrap"><table class="vr-table"><thead><tr><th scope="col">' + esc(t('agri.p.c1')) + '</th><th scope="col">' + esc(t('agri.p.c2')) + '</th><th scope="col">' + esc(t('agri.p.c3')) + '</th></tr></thead><tbody>' +
          [1, 2, 3, 4, 5].map(function (i) {
            return '<tr><th scope="row">' + esc(t('agri.p.' + i)) + '</th><td data-label="' + esc(t('agri.p.c2')) + '">' + esc(t('agri.p.' + i + '.o')) + '</td><td data-label="' + esc(t('agri.p.c3')) + '">' + esc(t('agri.p.' + i + '.u')) + '</td></tr>'; }).join('') +
          '</tbody></table></div></section>' +
      '</div></div>';
  }

  root.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-vr-act]');
    if (!el || !root.contains(el)) return;
    var type = el.getAttribute('data-vr-act') === 'add-consumption' ? 'consumption' : 'production';
    if (typeof global.go === 'function') global.go('foodcloud');
    var fc = global.NutriBentoViews && global.NutriBentoViews.foodcloud;
    if (fc && fc.setType) fc.setType(type, true);
  });
  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'vrYear') { state.year = ev.target.value; render(); var s = doc.getElementById('vrYear'); if (s) s.focus(); }
  });
  doc.addEventListener('nutri:countryChanged', function () { state.country = headerCountry(); state.year = 'latest'; render(); });
  /* refresh when the view is shown again (entries may have been added in the Food Cloud) */
  if (global.MutationObserver) {
    var shown = root.classList.contains('on');
    new global.MutationObserver(function () { var on = root.classList.contains('on'); if (on && !shown) render(); shown = on; }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  global.addEventListener('storage', function (ev) { if (ev.key === 'nutri_foodcloud') render(); });

  var api = { render: render, model: model, state: function () { var m = model(); return { country: state.country, year: m.year, years: m.years, rows: m.rows.length, total: m.total, sums: m.sums, cons: m.cons.length }; } };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.agri = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'agri');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.country = headerCountry(); render(); });
  I18N.onChange(function () { render(); });
})(window);
