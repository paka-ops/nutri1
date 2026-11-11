/* ==========================================================================
   NUTRI.N°1 — WHO Nutrition & NCD Intelligence Center view  (SESSION 13)
   Renders <section id="who"> as a Dark Bento dashboard: five diet-related NCD
   indicators, a comparison across the sample countries, a reading against the
   sample median and the coverage of the data.

   Depends on : js/bento-i18n.js, js/bento-shell.js, js/bento-sample-data.js
   Styles     : styles/views.css  (shared .vi-* institution components)
   Preserves  : renderWHO(), selectWHOCondition(), #whoCountry, #whoDiabetes,
                #whoHypertension, #whoObesity, #whoCVD, #whoStroke,
                #whoConditionTitle, #whoConditionSummary, #whoRiskFactors, #whoAlerts
   Note       : illustrative sample values, not official statistics (see
                js/bento-sample-data.js). No severity class is applied: the sample
                does not say what each percentage measures. Removed because nothing
                backed them: the Level and Year filters (they changed nothing), the
                trend bars (value ± fixed offsets), the cancer, kidney disease and
                dietary risk tiles (one constant for every country), the GIS demo,
                the "Monitored" rows and the two fixed alert sentences.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N, S = global.NutriSampleIndicators;
  var root = doc.getElementById('who');
  if (!root || !I18N || !S) return;

  I18N.register({
    en: {
      'who.kicker': 'WHO · NUTRITION & NONCOMMUNICABLE DISEASES', 'who.title': 'WHO Nutrition & NCD Intelligence Center',
      'who.sub': 'Diet-related noncommunicable diseases and metabolic risk at population level.',
      'who.demo': 'Illustrative figures · not official statistics',
      'who.country': 'Country',
      'who.placeholder': 'No country-specific sample exists for {country}: the placeholder values of the prototype are shown.',
      'who.i.diabetes': 'Diabetes', 'who.i.hypertension': 'Hypertension', 'who.i.obesity': 'Obesity', 'who.i.cvd': 'Cardiovascular disease', 'who.i.stroke': 'Stroke',
      'who.kpis': 'Headline indicators', 'who.median': 'Sample median: {value}',
      'who.def': 'The sample gives one percentage per condition without saying what it measures (age group, prevalence or share of deaths). No severity class is applied.',
      'who.cmp.title': '{name}: the sample countries compared', 'who.cmp.pick': 'Condition', 'who.cmp.sub': 'The six countries that have their own sample value, highest first.',
      'who.cmp.you': 'Selected country',
      'who.cmp.sum': '{country}: {value}. Rank {rank} of {n} sample countries, highest first. Sample median: {median}.',
      'who.cmp.sum.none': '{country} has no sample value of its own, so it is not ranked. Sample median: {median}.',
      'who.read.title': 'Reading against the sample median', 'who.read.sub': 'A comparison with the other sample countries, not a severity rating.',
      'who.read.above': 'Above', 'who.read.below': 'Below', 'who.read.equal': 'At median',
      'who.read.text': '{name}: {value}, median {median}.',
      'who.read.none': 'No comparison for {country}: it has no sample value of its own.',
      'who.cov.title': 'Coverage of the data', 'who.cov.sub': 'What the sample contains, and what still has to be connected.',
      'who.cov.sample': 'Sample value', 'who.cov.none': 'Not connected',
      'who.cov.cancer': 'Cancer', 'who.cov.kidney': 'Kidney disease', 'who.cov.diet': 'Dietary risk and salt intake', 'who.cov.activity': 'Physical activity',
      'who.cov.tobacco': 'Tobacco and alcohol use', 'who.cov.sub2': 'Sub-national levels and yearly trends',
      'who.flow.title': 'From diet to disease', 'who.flow.sub': 'The chain of evidence the platform is meant to connect. A reading guide, not a result.',
      'who.flow.1': 'Diet', 'who.flow.2': 'Nutrients', 'who.flow.3': 'Biomarkers', 'who.flow.4': 'Risk factors', 'who.flow.5': 'NCD outcomes',
      'who.flow.note': 'Global NCD targets are changes from a baseline year (for example halting the rise of diabetes and obesity), so they cannot be read from one value.',
      'who.note': 'Sample values carried over from the prototype. Replace them with national survey data (WHO STEPS) or the WHO Global Health Observatory before any decision use.'
    },
    fr: {
      'who.kicker': 'OMS · NUTRITION ET MALADIES NON TRANSMISSIBLES', 'who.title': 'Centre OMS Nutrition & MNT',
      'who.sub': 'Maladies non transmissibles liées à l’alimentation et risque métabolique dans la population.',
      'who.demo': 'Chiffres illustratifs · pas de statistiques officielles',
      'who.country': 'Pays',
      'who.placeholder': 'Il n’existe pas d’exemple propre à ce pays ({country}) : les valeurs génériques du prototype sont affichées.',
      'who.i.diabetes': 'Diabète', 'who.i.hypertension': 'Hypertension', 'who.i.obesity': 'Obésité', 'who.i.cvd': 'Maladies cardiovasculaires', 'who.i.stroke': 'AVC',
      'who.kpis': 'Indicateurs clés', 'who.median': 'Médiane de l’exemple : {value}',
      'who.def': 'L’exemple donne un pourcentage par maladie sans préciser ce qu’il mesure (tranche d’âge, prévalence ou part des décès). Aucune classe de gravité n’est appliquée.',
      'who.cmp.title': '{name} : comparaison des pays de l’exemple', 'who.cmp.pick': 'Maladie', 'who.cmp.sub': 'Les six pays qui ont leur propre valeur d’exemple, du plus élevé au plus bas.',
      'who.cmp.you': 'Pays sélectionné',
      'who.cmp.sum': '{country} : {value}. Rang {rank} sur {n} pays de l’exemple, du plus élevé au plus bas. Médiane de l’exemple : {median}.',
      'who.cmp.sum.none': 'Pas de valeur d’exemple propre à ce pays ({country}), donc pas de rang. Médiane de l’exemple : {median}.',
      'who.read.title': 'Lecture par rapport à la médiane', 'who.read.sub': 'Une comparaison avec les autres pays de l’exemple, pas une note de gravité.',
      'who.read.above': 'Au-dessus', 'who.read.below': 'En dessous', 'who.read.equal': 'À la médiane',
      'who.read.text': '{name} : {value}, médiane {median}.',
      'who.read.none': 'Pas de comparaison pour ce pays ({country}) : il n’a pas de valeur d’exemple propre.',
      'who.cov.title': 'Couverture des données', 'who.cov.sub': 'Ce que contient l’exemple, et ce qui reste à connecter.',
      'who.cov.sample': 'Valeur d’exemple', 'who.cov.none': 'Non connecté',
      'who.cov.cancer': 'Cancer', 'who.cov.kidney': 'Maladies rénales', 'who.cov.diet': 'Risque alimentaire et consommation de sel', 'who.cov.activity': 'Activité physique',
      'who.cov.tobacco': 'Tabac et alcool', 'who.cov.sub2': 'Niveaux infranationaux et tendances annuelles',
      'who.flow.title': 'De l’alimentation à la maladie', 'who.flow.sub': 'La chaîne de preuves que la plateforme doit relier. Un guide de lecture, pas un résultat.',
      'who.flow.1': 'Alimentation', 'who.flow.2': 'Nutriments', 'who.flow.3': 'Biomarqueurs', 'who.flow.4': 'Facteurs de risque', 'who.flow.5': 'Maladies non transmissibles',
      'who.flow.note': 'Les cibles mondiales sur les MNT sont des évolutions par rapport à une année de référence (par exemple stopper la hausse du diabète et de l’obésité) : elles ne se lisent pas sur une seule valeur.',
      'who.note': 'Valeurs d’exemple reprises du prototype. Remplacez-les par des données d’enquête nationale (STEPS de l’OMS) ou par l’Observatoire mondial de la santé de l’OMS avant tout usage pour la décision.'
    }
  });

  var KEYS = ['diabetes', 'hypertension', 'obesity', 'cvd', 'stroke'];
  var IDS = { diabetes: 'whoDiabetes', hypertension: 'whoHypertension', obesity: 'whoObesity', cvd: 'whoCVD', stroke: 'whoStroke' };
  function codes() { return (I18N.countries || []).map(function (c) { return c.code; }); }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  var state = { country: headerCountry(), condition: 'diabetes' };
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function n1(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }); } catch (e) { return String(v); } }
  function pct(v) { return n1(v) + (I18N.lang === 'fr' ? '\u00a0%' : '%'); }
  function median(k) {
    var a = S.countries.map(function (c) { return S.data[c][k]; }).sort(function (x, y) { return x - y; }), h = a.length / 2;
    return a.length % 2 ? a[Math.floor(h)] : Math.round((a[h - 1] + a[h]) / 2 * 100) / 100;
  }
  var PATHS = {
    heart: '<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z"/>',
    bars: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
    scale: '<path d="M4 17h16M4 17v-3M20 17v-3M12 17V7M9.500 9.500 12 7l2.500 2.500"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.100M4 12h.100M4 17h.100"/>',
    flow: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h10M14 9l3 3-3 3"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, id) { return '<header class="vi-head"><span class="vh-ico">' + ico(icon) + '</span><h3' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h3></header>'; }

  function render() {
    var m = S.get(state.country), own = S.has(state.country), name = cname(state.country), k = state.condition;
    var kpis = KEYS.map(function (x) {
      return '<li class="vi-kpi"><span class="vi-kpi__label">' + esc(t('who.i.' + x)) + '</span><b id="' + IDS[x] + '">' + esc(pct(m[x])) + '</b><small>' + esc(t('who.median', { value: pct(median(x)) })) + '</small></li>';
    }).join('');
    var chips = KEYS.map(function (x) {
      return '<button type="button" class="vi-chip" data-who-cond="' + x + '" aria-pressed="' + (x === k) + '">' + esc(t('who.i.' + x)) + '</button>';
    }).join('');
    var list = S.countries.map(function (c) { return { c: c, v: S.data[c][k] }; }).sort(function (a, b) { return b.v - a.v; });
    var top = list[0].v, med = median(k);
    var bars = list.map(function (x) {
      var on = x.c === state.country;
      return '<li class="' + (on ? 'is-on' : '') + '"><div class="vi-bars__top"><span><b>' + esc(cname(x.c)) + '</b>' + (on ? '<small>' + esc(t('who.cmp.you')) + '</small>' : '') + '</span><strong>' + esc(pct(x.v)) + '</strong></div>' +
        '<div class="vi-bar' + (on ? ' vi-bar--good' : '') + '" aria-hidden="true"><i style="--w:' + (x.v / top * 100).toFixed(1) + '%"></i></div></li>';
    }).join('');
    var rank = 1 + list.filter(function (x) { return x.v > m[k]; }).length;
    var summary = own ? t('who.cmp.sum', { country: name, value: pct(m[k]), rank: rank, n: list.length, median: pct(med) }) : t('who.cmp.sum.none', { country: name, median: pct(med) });
    var reading = own ? '<ul class="vi-signals" id="whoAlerts">' + KEYS.map(function (x) {
      var md = median(x), pos = m[x] > md ? 'above' : (m[x] < md ? 'below' : 'equal');
      return '<li class="vi-signal vi-signal--' + (pos === 'above' ? 'warn' : 'info') + '"><strong>' + esc(t('who.read.' + pos)) + '</strong><span>' + esc(t('who.read.text', { name: t('who.i.' + x), value: pct(m[x]), median: pct(md) })) + '</span></li>';
    }).join('') + '</ul>' : '<p class="vi-note vi-note--warn" id="whoAlerts">' + ico('info') + '<span>' + esc(t('who.read.none', { country: name })) + '</span></p>';
    var cov = KEYS.map(function (x) { return '<li><span>' + esc(t('who.i.' + x)) + '</span><b class="is-on">' + ico('check') + esc(pct(m[x])) + ' · ' + esc(t('who.cov.sample')) + '</b></li>'; })
      .concat(['cancer', 'kidney', 'diet', 'activity', 'tobacco', 'sub2'].map(function (x) { return '<li><span>' + esc(t('who.cov.' + x)) + '</span><b>' + esc(t('who.cov.none')) + '</b></li>'; })).join('');
    var flow = [1, 2, 3, 4, 5].map(function (i) { return '<li>' + (i > 1 ? ico('arrow') : '') + '<span>' + esc(t('who.flow.' + i)) + '</span></li>'; }).join('');
    root.innerHTML = '<div class="vi">' +
      '<section class="card vi-hero"><div class="vh-head"><div class="vi-hero__title"><span class="vh-ico">' + ico('heart') + '</span><div><span class="vi-kicker">' + esc(t('who.kicker')) + '</span><h2>' + esc(t('who.title')) + '</h2>' +
        '<p class="vi-sub">' + esc(t('who.sub')) + '</p></div></div><span class="pill vi-demo">' + esc(t('who.demo')) + '</span></div>' +
        '<div class="vi-toolbar"><label class="vi-field"><span>' + esc(t('who.country')) + '</span><select id="whoCountry">' + codes().map(function (c) {
          return '<option value="' + c + '"' + (c === state.country ? ' selected' : '') + '>' + esc(cname(c)) + '</option>'; }).join('') + '</select></label></div>' +
        (own ? '' : '<p class="vi-note vi-note--warn">' + ico('info') + '<span>' + esc(t('who.placeholder', { country: name })) + '</span></p>') +
        '<ul class="vi-kpis vi-kpis--5" aria-label="' + esc(t('who.kpis')) + '">' + kpis + '</ul>' +
        '<p class="vi-note">' + ico('info') + '<span>' + esc(t('who.def')) + '</span></p></section>' +
      '<div class="vi-grid">' +
        '<section class="card vi-wide">' + head('bars', t('who.cmp.title', { name: t('who.i.' + k) }), 'whoConditionTitle') + '<p class="vi-sub">' + esc(t('who.cmp.sub')) + '</p>' +
          '<div class="vi-chips" role="group" aria-label="' + esc(t('who.cmp.pick')) + '">' + chips + '</div><ul class="vi-bars vi-bars--rank">' + bars + '</ul>' +
          '<p class="vi-note" id="whoConditionSummary" aria-live="polite">' + ico('info') + '<span>' + esc(summary) + '</span></p></section>' +
        '<section class="card vi-side alert-panel">' + head('scale', t('who.read.title')) + '<p class="vi-sub">' + esc(t('who.read.sub')) + '</p>' + reading + '</section>' +
        '<section class="card vi-half">' + head('list', t('who.cov.title')) + '<p class="vi-sub">' + esc(t('who.cov.sub')) + '</p><ul class="vi-rows" id="whoRiskFactors">' + cov + '</ul></section>' +
        '<section class="card vi-half">' + head('flow', t('who.flow.title')) + '<p class="vi-sub">' + esc(t('who.flow.sub')) + '</p><ol class="vi-flow">' + flow + '</ol>' +
          '<p class="vi-note">' + ico('info') + '<span>' + esc(t('who.flow.note')) + '</span></p></section>' +
        '<p class="vi-note vi-full">' + ico('info') + '<span>' + esc(t('who.note')) + '</span></p>' +
      '</div></div>';
  }
  function setCondition(c, focus) {
    if (KEYS.indexOf(c) < 0) return;
    state.condition = c; render();
    if (focus) { var b = root.querySelector('[data-who-cond="' + c + '"]'); if (b) b.focus(); }
  }

  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'whoCountry' && codes().indexOf(ev.target.value) >= 0) { state.country = ev.target.value; render(); var s = doc.getElementById('whoCountry'); if (s) s.focus(); }
  });
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-who-cond]') : null;
    if (b) setCondition(b.getAttribute('data-who-cond'), true);
  });
  doc.addEventListener('nutri:countryChanged', function () { state.country = headerCountry(); render(); });

  var api = {
    render: render, setCondition: setCondition,
    renderWHO: function () { var e = doc.getElementById('whoCountry'); if (e && codes().indexOf(e.value) >= 0) state.country = e.value; render(); },
    median: median,
    state: function () { return { country: state.country, condition: state.condition, own: S.has(state.country), metrics: S.get(state.country) }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.who = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'who');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.country = headerCountry(); render(); });
  I18N.onChange(function () { render(); });
})(window);
