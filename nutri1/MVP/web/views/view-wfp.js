/* ==========================================================================
   NUTRI.N°1 — WFP Food Security Intelligence Center view  (SESSION 14)
   Renders <section id="wfp"> as a Dark Bento dashboard. The prototype holds no
   food-security data, so the view shows only what exists: the food groups found
   in the consumption entries typed into the Food Cloud on this device, and the
   two child-nutrition sample values (stunting, wasting) as context.

   Depends on : js/bento-i18n.js, js/bento-shell.js, js/bento-sample-data.js
   Reads      : localStorage.nutri_foodcloud (written by views/view-foodcloud.js)
   Styles     : styles/views.css  (shared .vi-* institution components)
   Preserves  : renderWFP(), #wfpCountry, #wfpRisk, #wfpAfford, #wfpDiversity,
                #wfpPrice, #wfpNutrition, #wfpEarly, #wfpMarket, #wfpDiet
   Note       : removed because they were invented: the five "/ 100" scores (food
                security risk, affordability, diversity and price pressure were
                computed from obesity, diabetes and hypertension; nutrition risk
                was stunting × 1.5), the Level and Year filters, the map pins, the
                "Active / Scored / Analyzed / Monitored" rows and the impact boxes.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N, S = global.NutriSampleIndicators;
  var root = doc.getElementById('wfp');
  if (!root || !I18N || !S) return;

  I18N.register({
    en: {
      'wfp.kicker': 'WFP · FOOD SECURITY & NUTRITION', 'wfp.title': 'WFP Food Security Intelligence Center',
      'wfp.sub': 'Food access, markets, vulnerability and nutrition, meant to complement existing WFP systems.',
      'wfp.demo': 'No food-security data connected',
      'wfp.country': 'Country', 'wfp.kpis': 'Headline indicators',
      'wfp.k.risk': 'Food security risk', 'wfp.k.afford': 'Healthy diet affordability', 'wfp.k.price': 'Price pressure',
      'wfp.k.groups': 'Food groups recorded', 'wfp.k.entries': 'Consumption entries',
      'wfp.k.none': 'Not connected', 'wfp.k.local': 'From entries on this device', 'wfp.k.empty': 'No entry yet', 'wfp.k.of': '{n} of {total}',
      'wfp.diet.title': 'Food groups in recorded consumption: {country}', 'wfp.diet.sub': 'Built from the consumption entries typed into the Food Cloud on this device.',
      'wfp.diet.count': 'Entries: {n}', 'wfp.diet.missing': 'Not recorded',
      'wfp.diet.empty': 'No consumption entry for {country} yet. Add entries in the Food Cloud to see which food groups they cover.',
      'wfp.diet.add': 'Add a consumption entry',
      'wfp.diet.note': 'This counts food groups in what was typed here. It is not a household dietary diversity score, which needs a survey.',
      'wfp.g.cereals': 'Cereals', 'wfp.g.tubers': 'Tubers & roots', 'wfp.g.fruits': 'Fruits & vegetables', 'wfp.g.legumes': 'Legumes', 'wfp.g.oilseeds': 'Oilseeds', 'wfp.g.animal': 'Animal-source foods',
      'wfp.ctx.title': 'Nutrition context', 'wfp.ctx.sub': 'Children under 5.', 'wfp.ctx.demo': 'Illustrative figures',
      'wfp.ctx.placeholder': 'No country-specific sample exists for {country}: the placeholder values of the prototype are shown.',
      'wfp.i.stunting': 'Stunting', 'wfp.i.wasting': 'Wasting',
      'wfp.s.verylow': 'Very low', 'wfp.s.low': 'Low', 'wfp.s.medium': 'Medium', 'wfp.s.high': 'High', 'wfp.s.veryhigh': 'Very high',
      'wfp.early.title': 'Early warning', 'wfp.early.sub': 'Only the signals that the available data can support.',
      'wfp.sig.bad': 'Alert', 'wfp.sig.warn': 'Watch', 'wfp.sig.good': 'On track',
      'wfp.sig.ind': '{name} is {value}: {cls} (illustrative value).',
      'wfp.sig.gap': 'Recorded consumption does not cover: {list}.', 'wfp.sig.full': 'Recorded consumption covers all six food groups.',
      'wfp.early.note': 'Price, climate and food-access signals need data feeds that are not connected.',
      'wfp.cov.title': 'Coverage of the data', 'wfp.cov.sub': 'What the view can read today, and what still has to be connected.',
      'wfp.cov.local': 'Local entries: {n}', 'wfp.cov.none': 'Not connected',
      'wfp.cov.0': 'Food consumption entries (Food Cloud)', 'wfp.cov.1': 'Food prices and market availability', 'wfp.cov.2': 'Cost of a healthy diet',
      'wfp.cov.3': 'Household food consumption and coping', 'wfp.cov.4': 'School meals and local procurement', 'wfp.cov.5': 'Climate and production shocks',
      'wfp.cov.6': 'Programme baseline and follow-up', 'wfp.cov.7': 'Sub-national levels, markets and yearly trends',
      'wfp.prod.title': 'Planned data products', 'wfp.prod.sub': 'What the platform is meant to produce once data feeds exist. None is available today.', 'wfp.prod.tag': 'Planned',
      'wfp.prod.1': 'Household Food Security Monitor', 'wfp.prod.1.d': 'Consumption, diversity, access, coping. For vulnerability targeting.',
      'wfp.prod.2': 'Food Price Intelligence', 'wfp.prod.2.d': 'Prices, availability, anomalies. For market monitoring.',
      'wfp.prod.3': 'Healthy Diet Affordability', 'wfp.prod.3.d': 'Food basket cost and access gap. For programme design.',
      'wfp.prod.4': 'School Feeding Intelligence', 'wfp.prod.4.d': 'Meals, quality, local sourcing, waste. For school meal planning.',
      'wfp.prod.5': 'Climate Food-Security Early Warning', 'wfp.prod.5.d': 'Shock signals and local risk. For early action.',
      'wfp.prod.6': 'Intervention Impact', 'wfp.prod.6.d': 'Baseline, follow-up, outcomes. For evaluation and scale-up.'
    },
    fr: {
      'wfp.kicker': 'PAM · SÉCURITÉ ALIMENTAIRE ET NUTRITION', 'wfp.title': 'Centre PAM de sécurité alimentaire',
      'wfp.sub': 'Accès à l’alimentation, marchés, vulnérabilité et nutrition, en complément des systèmes existants du PAM.',
      'wfp.demo': 'Aucune donnée de sécurité alimentaire connectée',
      'wfp.country': 'Pays', 'wfp.kpis': 'Indicateurs clés',
      'wfp.k.risk': 'Risque d’insécurité alimentaire', 'wfp.k.afford': 'Accessibilité d’une alimentation saine', 'wfp.k.price': 'Pression sur les prix',
      'wfp.k.groups': 'Groupes d’aliments saisis', 'wfp.k.entries': 'Saisies de consommation',
      'wfp.k.none': 'Non connecté', 'wfp.k.local': 'D’après les saisies de cet appareil', 'wfp.k.empty': 'Aucune saisie', 'wfp.k.of': '{n} sur {total}',
      'wfp.diet.title': 'Groupes d’aliments dans la consommation saisie : {country}', 'wfp.diet.sub': 'Établi à partir des saisies de consommation faites dans le Cloud alimentaire sur cet appareil.',
      'wfp.diet.count': 'Saisies : {n}', 'wfp.diet.missing': 'Non saisi',
      'wfp.diet.empty': 'Aucune saisie de consommation pour ce pays ({country}). Ajoutez des saisies dans le Cloud alimentaire pour voir les groupes d’aliments couverts.',
      'wfp.diet.add': 'Ajouter une saisie de consommation',
      'wfp.diet.note': 'Il s’agit d’un décompte des groupes d’aliments saisis ici. Ce n’est pas un score de diversité alimentaire des ménages, qui demande une enquête.',
      'wfp.g.cereals': 'Céréales', 'wfp.g.tubers': 'Tubercules et racines', 'wfp.g.fruits': 'Fruits et légumes', 'wfp.g.legumes': 'Légumineuses', 'wfp.g.oilseeds': 'Oléagineux', 'wfp.g.animal': 'Aliments d’origine animale',
      'wfp.ctx.title': 'Contexte nutritionnel', 'wfp.ctx.sub': 'Enfants de moins de 5 ans.', 'wfp.ctx.demo': 'Chiffres illustratifs',
      'wfp.ctx.placeholder': 'Il n’existe pas d’exemple propre à ce pays ({country}) : les valeurs génériques du prototype sont affichées.',
      'wfp.i.stunting': 'Retard de croissance', 'wfp.i.wasting': 'Émaciation',
      'wfp.s.verylow': 'Très faible', 'wfp.s.low': 'Faible', 'wfp.s.medium': 'Moyenne', 'wfp.s.high': 'Élevée', 'wfp.s.veryhigh': 'Très élevée',
      'wfp.early.title': 'Alerte précoce', 'wfp.early.sub': 'Uniquement les signaux que les données disponibles permettent.',
      'wfp.sig.bad': 'Alerte', 'wfp.sig.warn': 'À surveiller', 'wfp.sig.good': 'En bonne voie',
      'wfp.sig.ind': '{name} : {value}, classe « {cls} » (valeur illustrative).',
      'wfp.sig.gap': 'La consommation saisie ne couvre pas : {list}.', 'wfp.sig.full': 'La consommation saisie couvre les six groupes d’aliments.',
      'wfp.early.note': 'Les signaux sur les prix, le climat et l’accès à l’alimentation demandent des flux de données qui ne sont pas connectés.',
      'wfp.cov.title': 'Couverture des données', 'wfp.cov.sub': 'Ce que la vue peut lire aujourd’hui, et ce qui reste à connecter.',
      'wfp.cov.local': 'Saisies locales : {n}', 'wfp.cov.none': 'Non connecté',
      'wfp.cov.0': 'Saisies de consommation (Cloud alimentaire)', 'wfp.cov.1': 'Prix des aliments et disponibilité sur les marchés', 'wfp.cov.2': 'Coût d’une alimentation saine',
      'wfp.cov.3': 'Consommation alimentaire des ménages et stratégies d’adaptation', 'wfp.cov.4': 'Repas scolaires et achats locaux', 'wfp.cov.5': 'Chocs climatiques et de production',
      'wfp.cov.6': 'Situation de référence et suivi des programmes', 'wfp.cov.7': 'Niveaux infranationaux, marchés et tendances annuelles',
      'wfp.prod.title': 'Produits de données prévus', 'wfp.prod.sub': 'Ce que la plateforme doit produire une fois les flux de données en place. Aucun n’est disponible aujourd’hui.', 'wfp.prod.tag': 'Prévu',
      'wfp.prod.1': 'Suivi de la sécurité alimentaire des ménages', 'wfp.prod.1.d': 'Consommation, diversité, accès, adaptation. Pour le ciblage de la vulnérabilité.',
      'wfp.prod.2': 'Veille sur les prix alimentaires', 'wfp.prod.2.d': 'Prix, disponibilité, anomalies. Pour le suivi des marchés.',
      'wfp.prod.3': 'Accessibilité d’une alimentation saine', 'wfp.prod.3.d': 'Coût du panier alimentaire et écart d’accès. Pour la conception des programmes.',
      'wfp.prod.4': 'Veille sur l’alimentation scolaire', 'wfp.prod.4.d': 'Repas, qualité, approvisionnement local, pertes. Pour la planification des repas scolaires.',
      'wfp.prod.5': 'Alerte précoce climat et sécurité alimentaire', 'wfp.prod.5.d': 'Signaux de choc et risque local. Pour l’action anticipée.',
      'wfp.prod.6': 'Impact des interventions', 'wfp.prod.6.d': 'Référence, suivi, résultats. Pour l’évaluation et le passage à l’échelle.'
    }
  });

  var GROUPS = ['cereals', 'tubers', 'fruits', 'legumes', 'oilseeds', 'animal'], IND = ['stunting', 'wasting'];
  function codes() { return (I18N.countries || []).map(function (c) { return c.code; }); }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  var state = { country: headerCountry() };
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function n1(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }); } catch (e) { return String(v); } }
  function pct(v) { return n1(v) + (I18N.lang === 'fr' ? '\u00a0%' : '%'); }
  function model() {
    var counts = {}, total = 0;
    try {
      var raw = JSON.parse(global.localStorage.getItem('nutri_foodcloud') || '[]');
      (Array.isArray(raw) ? raw : []).forEach(function (e) {
        if (!e || e.type !== 'consumption' || !e.data || e.data.country !== state.country) return;
        total++;
        if (GROUPS.indexOf(e.data.group) >= 0) counts[e.data.group] = (counts[e.data.group] || 0) + 1;
      });
    } catch (err) { counts = {}; total = 0; }
    var have = GROUPS.filter(function (g) { return counts[g]; });
    return { counts: counts, total: total, have: have, missing: GROUPS.filter(function (g) { return !counts[g]; }) };
  }
  var PATHS = {
    bowl: '<path d="M4 11h16a8 8 0 0 1-16 0zM9 20h6M12 4v3M8 5v2M16 5v2"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.500"/><rect x="14" y="4" width="6" height="6" rx="1.500"/><rect x="4" y="14" width="6" height="6" rx="1.500"/><rect x="14" y="14" width="6" height="6" rx="1.500"/>',
    child: '<circle cx="12" cy="7" r="3"/><path d="M7 20v-3a5 5 0 0 1 10 0v3"/>',
    alert: '<path d="M12 4 3.500 19h17zM12 10v4M12 16.500v.100"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.100M4 12h.100M4 17h.100"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra) { return '<header class="vi-head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3>' + (extra || '') + '</header>'; }
  function kpi(label, id, value, sub) { return '<li class="vi-kpi"><span class="vi-kpi__label">' + esc(label) + '</span><b id="' + id + '">' + esc(value) + '</b><small>' + esc(sub) + '</small></li>'; }

  function render() {
    var d = model(), m = S.get(state.country), own = S.has(state.country), name = cname(state.country);
    var kpis = kpi(t('wfp.k.risk'), 'wfpRisk', '—', t('wfp.k.none')) + kpi(t('wfp.k.afford'), 'wfpAfford', '—', t('wfp.k.none')) + kpi(t('wfp.k.price'), 'wfpPrice', '—', t('wfp.k.none')) +
      kpi(t('wfp.k.groups'), 'wfpDiversity', d.total ? t('wfp.k.of', { n: d.have.length, total: GROUPS.length }) : '—', d.total ? t('wfp.k.local') : t('wfp.k.empty')) +
      kpi(t('wfp.k.entries'), 'wfpEntries', n1(d.total), t('wfp.k.local'));
    var addBtn = '<div class="vi-actions"><button type="button" class="btn ' + (d.total ? 'secondary' : 'primary') + '" data-wfp-act="add">' + ico('plus') + esc(t('wfp.diet.add')) + '</button></div>';
    var diet = d.total ? '<ul class="vi-rows" id="wfpDiet">' + GROUPS.map(function (g) {
      var c = d.counts[g] || 0;
      return '<li><span>' + esc(t('wfp.g.' + g)) + '</span><b class="' + (c ? 'is-on' : '') + '">' + (c ? ico('check') + esc(t('wfp.diet.count', { n: c })) : esc(t('wfp.diet.missing'))) + '</b></li>';
    }).join('') + '</ul>' : '<p class="vi-note vi-note--warn" id="wfpDiet">' + ico('info') + '<span>' + esc(t('wfp.diet.empty', { country: name })) + '</span></p>';
    var ctx = IND.map(function (k) {
      var s = S.severity(k, m[k]);
      return '<li><div class="vi-bars__top"><span><b>' + esc(t('wfp.i.' + k)) + '</b></span><strong' + (k === 'stunting' ? ' id="wfpNutrition"' : '') + '>' + esc(pct(m[k])) + '</strong></div>' +
        '<span class="vi-sev vi-sev--' + s[1] + '">' + esc(t('wfp.s.' + s[0])) + '</span></li>';
    }).join('');
    var order = { bad: 0, warn: 1, good: 2 };
    var sig = IND.map(function (k) { var s = S.severity(k, m[k]); return { tone: s[1], text: t('wfp.sig.ind', { name: t('wfp.i.' + k), value: pct(m[k]), cls: t('wfp.s.' + s[0]).toLowerCase() }) }; });
    if (d.total) sig.push(d.missing.length ? { tone: 'warn', text: t('wfp.sig.gap', { list: d.missing.map(function (g) { return t('wfp.g.' + g).toLowerCase(); }).join(', ') }) } : { tone: 'good', text: t('wfp.sig.full') });
    sig.sort(function (a, b) { return order[a.tone] - order[b.tone]; });
    var signals = sig.map(function (x) { return '<li class="vi-signal vi-signal--' + x.tone + '"><strong>' + esc(t('wfp.sig.' + x.tone)) + '</strong><span>' + esc(x.text) + '</span></li>'; }).join('');
    var cov = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
      var on = i === 0 && d.total > 0;
      return '<li><span>' + esc(t('wfp.cov.' + i)) + '</span><b class="' + (on ? 'is-on' : '') + '">' + (i === 0 ? (on ? ico('check') : '') + esc(t('wfp.cov.local', { n: d.total })) : esc(t('wfp.cov.none'))) + '</b></li>';
    }).join('');
    var prods = [1, 2, 3, 4, 5, 6].map(function (i) {
      return '<li><span><b>' + esc(t('wfp.prod.' + i)) + '</b><small>' + esc(t('wfp.prod.' + i + '.d')) + '</small></span><em>' + esc(t('wfp.prod.tag')) + '</em></li>';
    }).join('');
    root.innerHTML = '<div class="vi">' +
      '<section class="card vi-hero"><div class="vh-head"><div class="vi-hero__title"><span class="vh-ico">' + ico('bowl') + '</span><div><span class="vi-kicker">' + esc(t('wfp.kicker')) + '</span><h2>' + esc(t('wfp.title')) + '</h2>' +
        '<p class="vi-sub">' + esc(t('wfp.sub')) + '</p></div></div><span class="pill vi-demo">' + esc(t('wfp.demo')) + '</span></div>' +
        '<div class="vi-toolbar"><label class="vi-field"><span>' + esc(t('wfp.country')) + '</span><select id="wfpCountry">' + codes().map(function (c) {
          return '<option value="' + c + '"' + (c === state.country ? ' selected' : '') + '>' + esc(cname(c)) + '</option>'; }).join('') + '</select></label></div>' +
        '<ul class="vi-kpis vi-kpis--5" aria-label="' + esc(t('wfp.kpis')) + '">' + kpis + '</ul></section>' +
      '<div class="vi-grid">' +
        '<section class="card vi-wide">' + head('grid', t('wfp.diet.title', { country: name })) + '<p class="vi-sub">' + esc(t('wfp.diet.sub')) + '</p>' + diet + addBtn +
          '<p class="vi-note">' + ico('info') + '<span>' + esc(t('wfp.diet.note')) + '</span></p></section>' +
        '<section class="card vi-side">' + head('child', t('wfp.ctx.title'), '<span class="pill vi-demo">' + esc(t('wfp.ctx.demo')) + '</span>') + '<p class="vi-sub">' + esc(t('wfp.ctx.sub')) + '</p>' +
          (own ? '' : '<p class="vi-note vi-note--warn">' + ico('info') + '<span>' + esc(t('wfp.ctx.placeholder', { country: name })) + '</span></p>') +
          '<ul class="vi-bars">' + ctx + '</ul></section>' +
        '<section class="card vi-half alert-panel">' + head('alert', t('wfp.early.title')) + '<p class="vi-sub">' + esc(t('wfp.early.sub')) + '</p><ul class="vi-signals" id="wfpEarly">' + signals + '</ul>' +
          '<p class="vi-note">' + ico('info') + '<span>' + esc(t('wfp.early.note')) + '</span></p></section>' +
        '<section class="card vi-half">' + head('list', t('wfp.cov.title')) + '<p class="vi-sub">' + esc(t('wfp.cov.sub')) + '</p><ul class="vi-rows" id="wfpMarket">' + cov + '</ul></section>' +
        '<section class="card vi-full">' + head('box', t('wfp.prod.title')) + '<p class="vi-sub">' + esc(t('wfp.prod.sub')) + '</p><ul class="vi-products">' + prods + '</ul></section>' +
      '</div></div>';
  }

  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'wfpCountry' && codes().indexOf(ev.target.value) >= 0) { state.country = ev.target.value; render(); var s = doc.getElementById('wfpCountry'); if (s) s.focus(); }
  });
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-wfp-act]') : null;
    if (!b) return;
    if (typeof global.go === 'function') global.go('foodcloud');
    var fc = global.NutriBentoViews && global.NutriBentoViews.foodcloud;
    if (fc && fc.setType) fc.setType('consumption', true);
  });
  doc.addEventListener('nutri:countryChanged', function () { state.country = headerCountry(); render(); });
  /* refresh when the view is shown again (entries may have been added in the Food Cloud) */
  if (global.MutationObserver) {
    var shown = root.classList.contains('on');
    new global.MutationObserver(function () { var on = root.classList.contains('on'); if (on && !shown) render(); shown = on; }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  global.addEventListener('storage', function (ev) { if (ev.key === 'nutri_foodcloud') render(); });

  var api = {
    render: render, model: model,
    renderWFP: function () { var e = doc.getElementById('wfpCountry'); if (e && codes().indexOf(e.value) >= 0) state.country = e.value; render(); },
    state: function () { var d = model(); return { country: state.country, entries: d.total, groups: d.have, missing: d.missing }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.wfp = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'wfp');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.country = headerCountry(); render(); });
  I18N.onChange(function () { render(); });
})(window);
