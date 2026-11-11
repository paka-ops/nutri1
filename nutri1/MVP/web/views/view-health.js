/* ==========================================================================
   NUTRI.N°1 — Ministry of Health Command Center view  (SESSION 10)
   Renders <section id="health"> as a Dark Bento dashboard: headline indicators with
   WHO severity classes, two indicator profiles, a country comparison, the NCD
   intelligence modules and the data products.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js, js/bento-sample-data.js
   Styles     : styles/views.css  (.vg-*)
   Note       : the figures are the illustrative sample values of the original prototype
                (demoCountryMetrics, six countries + one placeholder). They are NOT official
                statistics. The prototype's trend charts, "Health GIS" pins, live KPI bar and
                age-segment filter showed invented series and were removed.
                Severity classes use the WHO/UNICEF prevalence thresholds for stunting and
                wasting (children under 5) and the WHO classes for anaemia as a public-health
                problem; they were written from memory and must be checked before real use.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('health');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'moh.kicker': 'MINISTRY OF HEALTH', 'moh.title': 'Ministry of Health Command Center',
      'moh.sub': 'Nutrition and diet-related NCD indicators for {country}.',
      'moh.demo': 'Illustrative figures · not official statistics',
      'moh.placeholder': 'No country-specific sample exists for {country}: the placeholder values of the prototype are shown.',
      'moh.i.stunting': 'Stunting', 'moh.i.wasting': 'Wasting', 'moh.i.anaemia': 'Anaemia', 'moh.i.ebf': 'Exclusive breastfeeding',
      'moh.i.diabetes': 'Diabetes', 'moh.i.hypertension': 'Hypertension', 'moh.i.obesity': 'Obesity', 'moh.i.cvd': 'Cardiovascular disease', 'moh.i.stroke': 'Stroke',
      'moh.p.stunting': 'Children under 5', 'moh.p.wasting': 'Children under 5', 'moh.p.anaemia': 'Women and children', 'moh.p.ebf': 'Infants under 6 months',
      'moh.p.diabetes': 'Adults', 'moh.p.hypertension': 'Adults', 'moh.p.obesity': 'Adults', 'moh.p.cvd': 'Adults', 'moh.p.stroke': 'Adults',
      'moh.s.verylow': 'Very low', 'moh.s.low': 'Low', 'moh.s.medium': 'Medium', 'moh.s.high': 'High', 'moh.s.veryhigh': 'Very high',
      'moh.s.none': 'Not a public-health problem', 'moh.s.mild': 'Mild public-health problem', 'moh.s.moderate': 'Moderate public-health problem', 'moh.s.severe': 'Severe public-health problem',
      'moh.s.ontarget': 'At or above the 50% global target', 'moh.s.below': 'Below the 50% global target',
      'moh.s.label': 'WHO class', 'moh.s.target': 'Target',
      'moh.kpis': 'Headline indicators',
      'moh.child.title': 'Children and mothers', 'moh.child.sub': 'Undernutrition, anaemia and breastfeeding.',
      'moh.ncd.title': 'Diet-related NCDs', 'moh.ncd.sub': 'Share of adults, as given in the prototype sample.',
      'moh.cmp.title': 'Country comparison', 'moh.cmp.sub': 'Sample countries of the prototype, highest value first.',
      'moh.cmp.indicator': 'Indicator', 'moh.cmp.placeholder': 'Placeholder', 'moh.cmp.selected': 'selected country',
      'moh.cmp.higher': 'A higher value is better for this indicator.', 'moh.cmp.lower': 'A lower value is better for this indicator.',
      'moh.cmp.rank': '{country}: {value}, rank {rank} of {n} for this indicator.',
      'moh.mod.title': 'Nutrition and NCD intelligence', 'moh.mod.sub': 'Population and service intelligence focused on diet-related noncommunicable diseases.',
      'moh.mod.status': 'Planned module',
      'moh.m.1': 'Diabetes prevention', 'moh.m.1.d': 'Food quality, physical activity, BMI, glucose or HbA1c where available, follow-up and trends.',
      'moh.m.2': 'Hypertension and CVD', 'moh.m.2.d': 'Blood pressure, sodium exposure, weight, activity and cardiovascular risk factors.',
      'moh.m.3': 'Sugar intelligence', 'moh.m.3.d': 'Estimated free-sugar exposure, sweetened beverages and population trends.',
      'moh.m.4': 'Sodium intelligence', 'moh.m.4.d': 'Estimated sodium exposure, food sources and reduction-program monitoring.',
      'moh.m.5': 'Obesity observatory', 'moh.m.5.d': 'Overweight, obesity, waist circumference, dietary patterns and activity.',
      'moh.m.6': 'Screening and follow-up', 'moh.m.6.d': 'Campaign collection, professional review, referral and longitudinal monitoring.',
      'moh.m.7': 'NCD early warning', 'moh.m.7.d': 'Emerging dietary and metabolic risk signals for investigation and public-health action.',
      'moh.m.8': 'Intervention impact', 'moh.m.8.d': 'Baseline, intervention, follow-up and outcome reporting for prevention programs.',
      'moh.prio.title': 'Priority NCDs',
      'moh.prio.1': 'Diabetes', 'moh.prio.2': 'Hypertension', 'moh.prio.3': 'Cardiovascular disease', 'moh.prio.4': 'Cancers', 'moh.prio.5': 'Kidney disease', 'moh.prio.6': 'Other priority NCDs',
      'moh.prod.title': 'Ministry of Health data products', 'moh.prod.c1': 'Product', 'moh.prod.c2': 'Primary output', 'moh.prod.c3': 'Decision use',
      'moh.prod.1': 'National Nutrition and NCD Observatory', 'moh.prod.1.o': 'Risk-factor trends and maps', 'moh.prod.1.u': 'National planning',
      'moh.prod.2': 'Diabetes and Hypertension Monitor', 'moh.prod.2.o': 'Control and follow-up indicators', 'moh.prod.2.u': 'Care improvement',
      'moh.prod.3': 'Food-NCD Risk Engine', 'moh.prod.3.o': 'Dietary risk profiles', 'moh.prod.3.u': 'Prevention targeting',
      'moh.prod.4': 'Screening Campaign Platform', 'moh.prod.4.o': 'Aggregated screening intelligence', 'moh.prod.4.u': 'Campaign management',
      'moh.prod.5': 'Prevention Impact Engine', 'moh.prod.5.o': 'Before and after outcomes', 'moh.prod.5.u': 'Program evaluation',
      'moh.note': 'Sample values carried over from the prototype. Replace them with national survey or WHO, UNICEF data before any decision use.'
    },
    fr: {
      'moh.kicker': 'MINISTÈRE DE LA SANTÉ', 'moh.title': 'Centre de commande du ministère de la Santé',
      'moh.sub': 'Indicateurs de nutrition et de MNT liées à l’alimentation : {country}.',
      'moh.demo': 'Chiffres illustratifs · pas de statistiques officielles',
      'moh.placeholder': 'Il n’existe pas d’exemple propre à ce pays ({country}) : les valeurs génériques du prototype sont affichées.',
      'moh.i.stunting': 'Retard de croissance', 'moh.i.wasting': 'Émaciation', 'moh.i.anaemia': 'Anémie', 'moh.i.ebf': 'Allaitement exclusif',
      'moh.i.diabetes': 'Diabète', 'moh.i.hypertension': 'Hypertension', 'moh.i.obesity': 'Obésité', 'moh.i.cvd': 'Maladies cardiovasculaires', 'moh.i.stroke': 'AVC',
      'moh.p.stunting': 'Enfants de moins de 5 ans', 'moh.p.wasting': 'Enfants de moins de 5 ans', 'moh.p.anaemia': 'Femmes et enfants', 'moh.p.ebf': 'Nourrissons de moins de 6 mois',
      'moh.p.diabetes': 'Adultes', 'moh.p.hypertension': 'Adultes', 'moh.p.obesity': 'Adultes', 'moh.p.cvd': 'Adultes', 'moh.p.stroke': 'Adultes',
      'moh.s.verylow': 'Très faible', 'moh.s.low': 'Faible', 'moh.s.medium': 'Moyenne', 'moh.s.high': 'Élevée', 'moh.s.veryhigh': 'Très élevée',
      'moh.s.none': 'Pas un problème de santé publique', 'moh.s.mild': 'Problème de santé publique léger', 'moh.s.moderate': 'Problème de santé publique modéré', 'moh.s.severe': 'Problème de santé publique grave',
      'moh.s.ontarget': 'Cible mondiale de 50 % atteinte', 'moh.s.below': 'Sous la cible mondiale de 50 %',
      'moh.s.label': 'Classe OMS', 'moh.s.target': 'Cible',
      'moh.kpis': 'Indicateurs clés',
      'moh.child.title': 'Enfants et mères', 'moh.child.sub': 'Dénutrition, anémie et allaitement.',
      'moh.ncd.title': 'MNT liées à l’alimentation', 'moh.ncd.sub': 'Part des adultes, telle que donnée dans l’exemple du prototype.',
      'moh.cmp.title': 'Comparaison entre pays', 'moh.cmp.sub': 'Pays d’exemple du prototype, de la valeur la plus haute à la plus basse.',
      'moh.cmp.indicator': 'Indicateur', 'moh.cmp.placeholder': 'Valeur générique', 'moh.cmp.selected': 'pays sélectionné',
      'moh.cmp.higher': 'Pour cet indicateur, une valeur plus haute est préférable.', 'moh.cmp.lower': 'Pour cet indicateur, une valeur plus basse est préférable.',
      'moh.cmp.rank': '{country} : {value}, rang {rank} sur {n} pour cet indicateur.',
      'moh.mod.title': 'Veille nutrition et MNT', 'moh.mod.sub': 'Veille populationnelle et de services centrée sur les maladies non transmissibles liées à l’alimentation.',
      'moh.mod.status': 'Module prévu',
      'moh.m.1': 'Prévention du diabète', 'moh.m.1.d': 'Qualité de l’alimentation, activité physique, IMC, glycémie ou HbA1c si disponibles, suivi et tendances.',
      'moh.m.2': 'Hypertension et MCV', 'moh.m.2.d': 'Tension artérielle, exposition au sodium, poids, activité et facteurs de risque cardiovasculaire.',
      'moh.m.3': 'Veille sur le sucre', 'moh.m.3.d': 'Exposition estimée aux sucres libres, boissons sucrées et tendances de la population.',
      'moh.m.4': 'Veille sur le sodium', 'moh.m.4.d': 'Exposition estimée au sodium, sources alimentaires et suivi des programmes de réduction.',
      'moh.m.5': 'Observatoire de l’obésité', 'moh.m.5.d': 'Surpoids, obésité, tour de taille, habitudes alimentaires et activité.',
      'moh.m.6': 'Dépistage et suivi', 'moh.m.6.d': 'Collecte en campagne, avis professionnel, orientation et suivi dans la durée.',
      'moh.m.7': 'Alerte précoce MNT', 'moh.m.7.d': 'Signaux émergents de risque alimentaire et métabolique, pour enquête et action de santé publique.',
      'moh.m.8': 'Impact des interventions', 'moh.m.8.d': 'Situation de départ, intervention, suivi et résultats des programmes de prévention.',
      'moh.prio.title': 'MNT prioritaires',
      'moh.prio.1': 'Diabète', 'moh.prio.2': 'Hypertension', 'moh.prio.3': 'Maladies cardiovasculaires', 'moh.prio.4': 'Cancers', 'moh.prio.5': 'Maladies rénales', 'moh.prio.6': 'Autres MNT prioritaires',
      'moh.prod.title': 'Produits de données du ministère de la Santé', 'moh.prod.c1': 'Produit', 'moh.prod.c2': 'Résultat principal', 'moh.prod.c3': 'Usage pour la décision',
      'moh.prod.1': 'Observatoire national de la nutrition et des MNT', 'moh.prod.1.o': 'Tendances des facteurs de risque et cartes', 'moh.prod.1.u': 'Planification nationale',
      'moh.prod.2': 'Suivi du diabète et de l’hypertension', 'moh.prod.2.o': 'Indicateurs de contrôle et de suivi', 'moh.prod.2.u': 'Amélioration des soins',
      'moh.prod.3': 'Moteur de risque alimentation-MNT', 'moh.prod.3.o': 'Profils de risque alimentaire', 'moh.prod.3.u': 'Ciblage de la prévention',
      'moh.prod.4': 'Plateforme de campagnes de dépistage', 'moh.prod.4.o': 'Synthèse agrégée des dépistages', 'moh.prod.4.u': 'Gestion des campagnes',
      'moh.prod.5': 'Moteur d’impact de la prévention', 'moh.prod.5.o': 'Résultats avant et après', 'moh.prod.5.u': 'Évaluation des programmes',
      'moh.note': 'Valeurs d’exemple reprises du prototype. Remplacez-les par les données d’enquêtes nationales ou de l’OMS et de l’UNICEF avant tout usage pour la décision.'
    }
  });

  /* ---- 2. Sample data (demoCountryMetrics of the original prototype, %) ---- */
  var S = global.NutriSampleIndicators;
  if (!S) return;
  var DATA = S.data, PLACEHOLDER = S.placeholder;
  var CHILD = ['stunting', 'wasting', 'anaemia', 'ebf'], NCD = ['hypertension', 'cvd', 'obesity', 'diabetes', 'stroke'];
  var ALL = CHILD.concat(NCD), KPIS = ['stunting', 'wasting', 'anaemia', 'hypertension'];
  var MOD_ICON = ['drop', 'heart', 'cube', 'salt', 'scale', 'phone', 'alert', 'trend'];

  /* severity: returns [label key, tone] ; tone good | warn | bad — see js/bento-sample-data.js */
  function severity(k, v) { return S.severity(k, v); }

  /* ---- 3. State & helpers ------------------------------------------------ */
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  var state = { country: headerCountry(), indicator: 'stunting' };
  function metrics() { return DATA[state.country] || PLACEHOLDER; }
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function pct(v) {
    var s; try { s = Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }); } catch (e) { s = String(v); }
    return s + (I18N.lang === 'fr' ? ' %' : '%');
  }
  var PATHS = {
    health: '<path d="M4 20V8l8-4 8 4v12M9 20v-5h6v5M12 8v4M10 10h4"/>',
    child: '<circle cx="12" cy="7" r="3"/><path d="M7 20v-3a5 5 0 0 1 10 0v3"/>',
    heart: '<path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.200a4.300 4.300 0 0 1 7.500 2.600C19.500 15.400 12 20 12 20z"/>',
    bars: '<path d="M4 20h16M7 20v-6M12 20V6M17 20v-9"/>',
    drop: '<path d="M12 3.500c3.500 4.300 6 7.500 6 10.800A6 6 0 0 1 6 14.300c0-3.300 2.500-6.500 6-10.800z"/>',
    cube: '<path d="M12 3.500 19.500 8v8L12 20.500 4.500 16V8zM4.500 8 12 12.500 19.500 8M12 12.500v8"/>',
    salt: '<path d="M8.500 9h7l1 11h-9zM9 9a3 3 0 0 1 6 0M11 5.500h.100M13 5.500h.100"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.500 9.500a5 5 0 0 1 7 0M12 9v2.500"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.500"/><path d="M11 17.500h2"/>',
    alert: '<path d="M12 4 3.500 19h17zM12 10v4M12 16.500v.100"/>',
    trend: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
    grid: '<rect x="4" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="4" width="6.500" height="6.500" rx="1.500"/><rect x="4" y="13.500" width="6.500" height="6.500" rx="1.500"/><rect x="13.500" y="13.500" width="6.500" height="6.500" rx="1.500"/>',
    box: '<path d="M4 8.500 12 4l8 4.500v7L12 20l-8-4.500zM4 8.500l8 4.500 8-4.500M12 13v7"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra) {
    return '<header class="vg-card__head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3>' + (extra || '') + '</header>';
  }

  /* ---- 4. Blocks ---------------------------------------------------------- */
  function sevPill(k, v) {
    var s = severity(k, v);
    return s ? '<span class="vg-sev vg-sev--' + s[1] + '">' + esc(t('moh.s.' + s[0])) + '</span>' : '';
  }
  function kpisHtml() {
    var m = metrics();
    return KPIS.map(function (k) {
      var s = severity(k, m[k]);
      return '<li class="vg-kpi"><span class="vg-kpi__label">' + esc(t('moh.i.' + k)) + '</span><b>' + esc(pct(m[k])) + '</b><small>' + esc(t('moh.p.' + k)) + '</small>' +
        (s ? '<span class="vg-kpi__class"><em>' + esc(t(k === 'ebf' ? 'moh.s.target' : 'moh.s.label')) + '</em>' + sevPill(k, m[k]) + '</span>' : '') + '</li>';
    }).join('');
  }
  function barsHtml(keys, max) {
    var m = metrics();
    return '<ul class="vg-bars">' + keys.map(function (k) {
      var s = severity(k, m[k]), tone = s ? s[1] : 'plain';
      return '<li><div class="vg-bars__top"><span><b>' + esc(t('moh.i.' + k)) + '</b><small>' + esc(t('moh.p.' + k)) + '</small></span><strong>' + esc(pct(m[k])) + '</strong></div>' +
        '<div class="vg-bar vg-bar--' + tone + '" aria-hidden="true"><i style="--w:' + Math.min(100, m[k] / max * 100).toFixed(1) + '%"></i></div>' + sevPill(k, m[k]) + '</li>';
    }).join('') + '</ul>';
  }
  function compareHtml() {
    var k = state.indicator, rows = Object.keys(DATA).map(function (c) { return { c: c, name: cname(c), v: DATA[c][k], on: c === state.country }; });
    if (!DATA[state.country]) rows.push({ c: state.country, name: cname(state.country) + ' (' + t('moh.cmp.placeholder').toLowerCase() + ')', v: PLACEHOLDER[k], on: true });
    rows.sort(function (a, b) { return b.v - a.v; });
    var max = rows[0].v || 1, me = null;
    rows.forEach(function (r, i) { if (r.on) me = { r: r, i: i + 1 }; });
    return '<ol class="vg-cmp">' + rows.map(function (r) {
      return '<li class="' + (r.on ? 'is-on' : '') + '"' + (r.on ? ' aria-current="true"' : '') + '><span class="vg-cmp__name">' + esc(r.name) + (r.on ? '<span class="vg-sr"> (' + esc(t('moh.cmp.selected')) + ')</span>' : '') + '</span>' +
        '<div class="vg-bar" aria-hidden="true"><i style="--w:' + (r.v / max * 100).toFixed(1) + '%"></i></div><strong>' + esc(pct(r.v)) + '</strong></li>';
    }).join('') + '</ol>' +
      '<p class="vg-rank" role="status">' + esc(t('moh.cmp.rank', { country: cname(state.country), value: pct(me.r.v), rank: me.i, n: rows.length })) + ' ' + esc(t(k === 'ebf' ? 'moh.cmp.higher' : 'moh.cmp.lower')) + '</p>';
  }
  function render() {
    var name = cname(state.country), own = !!DATA[state.country];
    root.innerHTML = '<div class="vg">' +
      '<section class="card vg-hero"><div class="vh-head"><div class="vg-hero__title"><span class="vh-ico">' + ico('health') + '</span><div><span class="vg-kicker">' + esc(t('moh.kicker')) + '</span><h2>' + esc(t('moh.title')) + '</h2>' +
        '<p class="vg-sub">' + esc(t('moh.sub', { country: name })) + '</p></div></div><span class="pill vg-demo">' + esc(t('moh.demo')) + '</span></div>' +
        (own ? '' : '<p class="vg-note vg-note--warn">' + ico('info') + '<span>' + esc(t('moh.placeholder', { country: name })) + '</span></p>') +
        '<ul class="vg-kpis" aria-label="' + esc(t('moh.kpis')) + '">' + kpisHtml() + '</ul></section>' +
      '<div class="vg-grid">' +
        '<section class="card vg-half">' + head('child', t('moh.child.title')) + '<p class="vg-sub">' + esc(t('moh.child.sub')) + '</p>' + barsHtml(CHILD, 100) + '</section>' +
        '<section class="card vg-half">' + head('heart', t('moh.ncd.title')) + '<p class="vg-sub">' + esc(t('moh.ncd.sub')) + '</p>' + barsHtml(NCD, 40) + '</section>' +
        '<section class="card vg-full">' + head('bars', t('moh.cmp.title'), '<label class="vg-field"><span>' + esc(t('moh.cmp.indicator')) + '</span><select id="vgIndicator">' + ALL.map(function (k) {
          return '<option value="' + k + '"' + (k === state.indicator ? ' selected' : '') + '>' + esc(t('moh.i.' + k)) + '</option>'; }).join('') + '</select></label>') +
          '<p class="vg-sub">' + esc(t('moh.cmp.sub')) + '</p><div id="vgCompare">' + compareHtml() + '</div></section>' +
        '<section class="card vg-full">' + head('grid', t('moh.mod.title'), '<span class="pill vg-pill">' + esc(t('moh.kicker')) + '</span>') + '<p class="vg-sub">' + esc(t('moh.mod.sub')) + '</p>' +
          '<ul class="vg-mods">' + MOD_ICON.map(function (ic, i) {
            return '<li><span class="vg-mods__ico">' + ico(ic) + '</span><b>' + esc(t('moh.m.' + (i + 1))) + '</b><p>' + esc(t('moh.m.' + (i + 1) + '.d')) + '</p><small>' + esc(t('moh.mod.status')) + '</small></li>'; }).join('') + '</ul>' +
          '<h4>' + esc(t('moh.prio.title')) + '</h4><ul class="vg-prio">' + [1, 2, 3, 4, 5, 6].map(function (i) { return '<li>' + esc(t('moh.prio.' + i)) + '</li>'; }).join('') + '</ul></section>' +
        '<section class="card vg-full">' + head('box', t('moh.prod.title')) +
          '<div class="vg-tablewrap"><table class="vg-table"><thead><tr><th scope="col">' + esc(t('moh.prod.c1')) + '</th><th scope="col">' + esc(t('moh.prod.c2')) + '</th><th scope="col">' + esc(t('moh.prod.c3')) + '</th></tr></thead><tbody>' +
          [1, 2, 3, 4, 5].map(function (i) {
            return '<tr><th scope="row">' + esc(t('moh.prod.' + i)) + '</th><td data-label="' + esc(t('moh.prod.c2')) + '">' + esc(t('moh.prod.' + i + '.o')) + '</td><td data-label="' + esc(t('moh.prod.c3')) + '">' + esc(t('moh.prod.' + i + '.u')) + '</td></tr>'; }).join('') +
          '</tbody></table></div><p class="vg-note">' + ico('info') + '<span>' + esc(t('moh.note')) + '</span></p></section>' +
      '</div></div>';
  }

  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'vgIndicator' && ALL.indexOf(ev.target.value) >= 0) {
      state.indicator = ev.target.value;
      var box = doc.getElementById('vgCompare'); if (box) box.innerHTML = compareHtml();
    }
  });
  doc.addEventListener('nutri:countryChanged', function () { state.country = headerCountry(); render(); });

  var api = {
    render: render, severity: severity,
    setIndicator: function (k) { if (ALL.indexOf(k) >= 0) { state.indicator = k; render(); } },
    state: function () { return { country: state.country, indicator: state.indicator, own: !!DATA[state.country], metrics: metrics() }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.health = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'health');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.country = headerCountry(); render(); });
  I18N.onChange(function () { render(); });
})(window);
