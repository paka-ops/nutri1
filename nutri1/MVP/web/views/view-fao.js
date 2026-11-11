/* ==========================================================================
   NUTRI.N°1 — FAO Food Systems Intelligence Center view  (SESSION 15)
   Renders <section id="fao"> as a Dark Bento dashboard. The prototype holds no
   agrifood data, so the view shows only what exists: the production,
   consumption and laboratory entries typed into the Food Cloud on this device.

   Depends on : js/bento-i18n.js, js/bento-shell.js
   Reads      : localStorage.nutri_foodcloud (written by views/view-foodcloud.js)
   Styles     : styles/views.css  (shared .vi-* institution components)
   Preserves  : renderFAO(), #faoCountry, #faoProduction, #faoLoss, #faoPrice,
                #faoAvailability, #faoSafety, #faoProductionPanel,
                #faoNutritionPanel, #faoSafetyPanel, #faoMarketPanel
   Note       : removed because they were invented: the production forecast,
                post-harvest loss, price pressure and availability figures (they
                were computed from stunting, wasting, obesity and diabetes), the
                food safety signal (computed from anaemia), the Level and Year
                filters, the map pins and the "Active / Tracked / Modeled /
                Mapped / Monitored" rows.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('fao');
  if (!root || !I18N) return;

  I18N.register({
    en: {
      'fao.kicker': 'FAO · FOOD SYSTEMS & AGRIFOOD', 'fao.title': 'FAO Food Systems Intelligence Center',
      'fao.sub': 'Production, losses, markets, food availability, food safety and nutrition-sensitive agriculture.',
      'fao.demo': 'No agrifood data connected',
      'fao.country': 'Country', 'fao.kpis': 'Headline indicators',
      'fao.k.prod': 'Production recorded', 'fao.k.loss': 'Post-harvest loss', 'fao.k.price': 'Food price pressure',
      'fao.k.avail': 'Food groups produced', 'fao.k.safety': 'Laboratory results',
      'fao.k.none': 'Not connected', 'fao.k.local': 'From entries on this device', 'fao.k.empty': 'No entry yet', 'fao.k.of': '{n} of {total}',
      'fao.k.year': 'Year {year}, entries on this device', 'fao.k.alllabs': 'All countries, this device',
      'fao.sys.title': 'Production and consumption by food group: {country}', 'fao.sys.sub': 'Built from the Food Cloud entries typed on this device.',
      'fao.sys.subyear': 'Built from the Food Cloud entries typed on this device. Production: year {year}.',
      'fao.sys.cons': 'Consumption entries: {n}', 'fao.sys.share': '{pct} of recorded production', 'fao.sys.noprod': 'No production recorded',
      'fao.sys.empty': 'No production or consumption entry for {country} yet. Add entries in the Food Cloud to compare what is produced with what is eaten.',
      'fao.add.prod': 'Add a production entry', 'fao.add.cons': 'Add a consumption entry', 'fao.add.lab': 'Add a laboratory result',
      'fao.sys.note': 'Tonnes are the sum of what was typed here, not national production. Consumption entries are counted, not converted to tonnes.',
      'fao.g.cereals': 'Cereals', 'fao.g.tubers': 'Tubers & roots', 'fao.g.fruits': 'Fruits & vegetables', 'fao.g.legumes': 'Legumes', 'fao.g.oilseeds': 'Oilseeds', 'fao.g.animal': 'Animal-source foods',
      'fao.sig.title': 'Food system signals', 'fao.sig.sub': 'Only what the recorded entries can support.',
      'fao.sig.warn': 'Watch', 'fao.sig.good': 'Covered', 'fao.sig.info': 'Note',
      'fao.sig.gap': 'Eaten but no production recorded: {list}.', 'fao.sig.noprod': 'No production recorded for: {list}.',
      'fao.sig.full': 'Production is recorded for all six food groups.', 'fao.sig.match': 'Every food group with consumption entries also has production recorded.',
      'fao.sig.none': 'No entry yet for {country}, so there is nothing to compare.',
      'fao.sig.note': 'Loss, price and climate signals need data feeds that are not connected.',
      'fao.lab.title': 'Food safety: laboratory results', 'fao.lab.sub': 'The latest results typed into the Food Cloud. They carry no country, so all are shown.',
      'fao.lab.empty': 'No laboratory result yet.', 'fao.lab.by': 'Laboratory: {lab}',
      'fao.lab.note': 'Results are shown as typed. No limit or compliance check is applied.',
      'fao.cov.title': 'Coverage of the data', 'fao.cov.sub': 'What the view can read today, and what still has to be connected.',
      'fao.cov.local': 'Local entries: {n}', 'fao.cov.none': 'Not connected',
      'fao.cov.a': 'Production entries (Food Cloud)', 'fao.cov.b': 'Consumption entries (Food Cloud)', 'fao.cov.c': 'Laboratory results (Food Cloud)',
      'fao.cov.1': 'Area, yield and production forecast', 'fao.cov.2': 'Post-harvest losses by stage', 'fao.cov.3': 'Food prices and market availability',
      'fao.cov.4': 'Climate and crop stress', 'fao.cov.5': 'Processing and value addition', 'fao.cov.6': 'Traceability from lot to market', 'fao.cov.7': 'Sub-national levels, value chains and maps',
      'fao.prod.title': 'Planned data products', 'fao.prod.sub': 'What the platform is meant to produce once data feeds exist. None is available today.', 'fao.prod.tag': 'Planned',
      'fao.prod.1': 'Production Intelligence', 'fao.prod.1.d': 'Area, yield, harvest and forecast. For production planning.',
      'fao.prod.2': 'Post-Harvest Loss Observatory', 'fao.prod.2.d': 'Loss quantity, stage, cause and cost. For loss-reduction investment.',
      'fao.prod.3': 'Food Price Observatory', 'fao.prod.3.d': 'Prices, availability and anomalies. For market monitoring.',
      'fao.prod.4': 'Healthy Diet Availability', 'fao.prod.4.d': 'Food groups, seasonality and access. For nutrition-sensitive policy.',
      'fao.prod.5': 'Food Safety Intelligence', 'fao.prod.5.d': 'Contaminants, lab results and traceability. For quality assurance.',
      'fao.prod.6': 'Climate-Food Early Warning', 'fao.prod.6.d': 'Climate shocks and local risk. For early action.'
    },
    fr: {
      'fao.kicker': 'FAO · SYSTÈMES ALIMENTAIRES ET AGROALIMENTAIRE', 'fao.title': 'Centre FAO des systèmes alimentaires',
      'fao.sub': 'Production, pertes, marchés, disponibilité des aliments, sécurité sanitaire et agriculture sensible à la nutrition.',
      'fao.demo': 'Aucune donnée agroalimentaire connectée',
      'fao.country': 'Pays', 'fao.kpis': 'Indicateurs clés',
      'fao.k.prod': 'Production saisie', 'fao.k.loss': 'Pertes après récolte', 'fao.k.price': 'Pression sur les prix alimentaires',
      'fao.k.avail': 'Groupes d’aliments produits', 'fao.k.safety': 'Résultats de laboratoire',
      'fao.k.none': 'Non connecté', 'fao.k.local': 'D’après les saisies de cet appareil', 'fao.k.empty': 'Aucune saisie', 'fao.k.of': '{n} sur {total}',
      'fao.k.year': 'Année {year}, saisies de cet appareil', 'fao.k.alllabs': 'Tous pays, cet appareil',
      'fao.sys.title': 'Production et consommation par groupe d’aliments : {country}', 'fao.sys.sub': 'Établi à partir des saisies faites dans le Cloud alimentaire sur cet appareil.',
      'fao.sys.subyear': 'Établi à partir des saisies faites dans le Cloud alimentaire sur cet appareil. Production : année {year}.',
      'fao.sys.cons': 'Saisies de consommation : {n}', 'fao.sys.share': '{pct} de la production saisie', 'fao.sys.noprod': 'Aucune production saisie',
      'fao.sys.empty': 'Aucune saisie de production ou de consommation pour ce pays ({country}). Ajoutez des saisies dans le Cloud alimentaire pour comparer ce qui est produit et ce qui est consommé.',
      'fao.add.prod': 'Ajouter une saisie de production', 'fao.add.cons': 'Ajouter une saisie de consommation', 'fao.add.lab': 'Ajouter un résultat de laboratoire',
      'fao.sys.note': 'Les tonnes sont la somme de ce qui a été saisi ici, pas la production nationale. Les saisies de consommation sont comptées, pas converties en tonnes.',
      'fao.g.cereals': 'Céréales', 'fao.g.tubers': 'Tubercules et racines', 'fao.g.fruits': 'Fruits et légumes', 'fao.g.legumes': 'Légumineuses', 'fao.g.oilseeds': 'Oléagineux', 'fao.g.animal': 'Aliments d’origine animale',
      'fao.sig.title': 'Signaux du système alimentaire', 'fao.sig.sub': 'Uniquement ce que les saisies permettent.',
      'fao.sig.warn': 'À surveiller', 'fao.sig.good': 'Couvert', 'fao.sig.info': 'Note',
      'fao.sig.gap': 'Consommé mais sans production saisie : {list}.', 'fao.sig.noprod': 'Aucune production saisie pour : {list}.',
      'fao.sig.full': 'Une production est saisie pour les six groupes d’aliments.', 'fao.sig.match': 'Chaque groupe d’aliments ayant des saisies de consommation a aussi une production saisie.',
      'fao.sig.none': 'Aucune saisie pour ce pays ({country}) : il n’y a rien à comparer.',
      'fao.sig.note': 'Les signaux sur les pertes, les prix et le climat demandent des flux de données qui ne sont pas connectés.',
      'fao.lab.title': 'Sécurité sanitaire : résultats de laboratoire', 'fao.lab.sub': 'Les derniers résultats saisis dans le Cloud alimentaire. Ils ne portent pas de pays : tous sont affichés.',
      'fao.lab.empty': 'Aucun résultat de laboratoire pour l’instant.', 'fao.lab.by': 'Laboratoire : {lab}',
      'fao.lab.note': 'Les résultats sont affichés tels que saisis. Aucun contrôle de seuil ou de conformité n’est appliqué.',
      'fao.cov.title': 'Couverture des données', 'fao.cov.sub': 'Ce que la vue peut lire aujourd’hui, et ce qui reste à connecter.',
      'fao.cov.local': 'Saisies locales : {n}', 'fao.cov.none': 'Non connecté',
      'fao.cov.a': 'Saisies de production (Cloud alimentaire)', 'fao.cov.b': 'Saisies de consommation (Cloud alimentaire)', 'fao.cov.c': 'Résultats de laboratoire (Cloud alimentaire)',
      'fao.cov.1': 'Surfaces, rendements et prévision de production', 'fao.cov.2': 'Pertes après récolte par étape', 'fao.cov.3': 'Prix des aliments et disponibilité sur les marchés',
      'fao.cov.4': 'Climat et stress des cultures', 'fao.cov.5': 'Transformation et valeur ajoutée', 'fao.cov.6': 'Traçabilité du lot au marché', 'fao.cov.7': 'Niveaux infranationaux, filières et cartes',
      'fao.prod.title': 'Produits de données prévus', 'fao.prod.sub': 'Ce que la plateforme doit produire une fois les flux de données en place. Aucun n’est disponible aujourd’hui.', 'fao.prod.tag': 'Prévu',
      'fao.prod.1': 'Veille sur la production', 'fao.prod.1.d': 'Surfaces, rendements, récoltes et prévisions. Pour la planification de la production.',
      'fao.prod.2': 'Observatoire des pertes après récolte', 'fao.prod.2.d': 'Quantités perdues, étape, cause et coût. Pour l’investissement dans la réduction des pertes.',
      'fao.prod.3': 'Observatoire des prix alimentaires', 'fao.prod.3.d': 'Prix, disponibilité et anomalies. Pour le suivi des marchés.',
      'fao.prod.4': 'Disponibilité d’une alimentation saine', 'fao.prod.4.d': 'Groupes d’aliments, saisonnalité et accès. Pour les politiques sensibles à la nutrition.',
      'fao.prod.5': 'Veille sur la sécurité sanitaire des aliments', 'fao.prod.5.d': 'Contaminants, résultats de laboratoire et traçabilité. Pour l’assurance qualité.',
      'fao.prod.6': 'Alerte précoce climat et alimentation', 'fao.prod.6.d': 'Chocs climatiques et risque local. Pour l’action anticipée.'
    }
  });

  var GROUPS = ['cereals', 'tubers', 'fruits', 'legumes', 'oilseeds', 'animal'];
  function codes() { return (I18N.countries || []).map(function (c) { return c.code; }); }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  var state = { country: headerCountry() };
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function num(v, d) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: d == null ? 1 : d }); } catch (e) { return String(v); } }
  function tonnes(v) { return num(v, v < 100 ? 1 : 0) + '\u00a0t'; }
  /* short form for the headline tile: 1 200 000 t does not fit a narrow tile */
  function tonnesShort(v) { if (v < 10000) return tonnes(v); try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-US', { notation: 'compact', maximumFractionDigits: 1 }) + '\u00a0t'; } catch (e) { return tonnes(v); } }
  function pct(v) { return num(v, 0) + (I18N.lang === 'fr' ? '\u00a0%' : '%'); }
  function model() {
    var raw = [];
    try { raw = JSON.parse(global.localStorage.getItem('nutri_foodcloud') || '[]'); if (!Array.isArray(raw)) raw = []; } catch (e) { raw = []; }
    var prod = [], cons = {}, consTotal = 0, labs = [];
    raw.forEach(function (e) {
      if (!e || !e.data) return;
      var d = e.data;
      if (e.type === 'lab') { labs.push(d); return; }
      if (d.country !== state.country) return;
      if (e.type === 'production' && Number(d.tonnes) > 0 && Number(d.year) > 0) prod.push(d);
      if (e.type === 'consumption') { consTotal++; if (GROUPS.indexOf(d.group) >= 0) cons[d.group] = (cons[d.group] || 0) + 1; }
    });
    var year = prod.reduce(function (y, d) { return Math.max(y, Number(d.year)); }, 0) || null;
    var sums = {}, total = 0, rows = 0;
    prod.forEach(function (d) { if (Number(d.year) !== year) return; rows++; total += Number(d.tonnes); if (GROUPS.indexOf(d.group) >= 0) sums[d.group] = (sums[d.group] || 0) + Number(d.tonnes); });
    return { year: year, sums: sums, total: total, prodEntries: prod.length, yearEntries: rows, cons: cons, consTotal: consTotal, labs: labs,
      produced: GROUPS.filter(function (g) { return sums[g]; }), notProduced: GROUPS.filter(function (g) { return !sums[g]; }),
      gap: GROUPS.filter(function (g) { return cons[g] && !sums[g]; }) };
  }
  var PATHS = {
    wheat: '<path d="M12 21V8M12 8c0-2 1.500-3.500 3-4 0 2-1 3.500-3 4zM12 8c0-2-1.500-3.500-3-4 0 2 1 3.500 3 4zM12 13c0-2 1.500-3.500 4-4 0 2.500-1.500 4-4 4zM12 13c0-2-1.500-3.500-4-4 0 2.500 1.500 4 4 4zM12 18c0-2 1.500-3.500 4-4 0 2.500-1.500 4-4 4zM12 18c0-2-1.500-3.500-4-4 0 2.500 1.500 4 4 4z"/>',
    bars: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
    alert: '<path d="M12 4 3.500 19h17zM12 10v4M12 16.500v.100"/>',
    flask: '<path d="M9 4h6M10 4v6l-5 8.500a1 1 0 0 0 .900 1.500h12.200a1 1 0 0 0 .900-1.500L14 10V4M7.500 15h9"/>',
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
  function head(icon, title) { return '<header class="vi-head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3></header>'; }
  function kpi(label, id, value, sub) { return '<li class="vi-kpi"><span class="vi-kpi__label">' + esc(label) + '</span><b id="' + id + '">' + esc(value) + '</b><small>' + esc(sub) + '</small></li>'; }
  function btn(act, label, primary) { return '<button type="button" class="btn ' + (primary ? 'primary' : 'secondary') + '" data-fao-act="' + act + '">' + ico('plus') + esc(t(label)) + '</button>'; }
  function names(list) { return list.map(function (g) { return t('fao.g.' + g).toLowerCase(); }).join(', '); }

  function render() {
    var d = model(), name = cname(state.country), any = d.yearEntries || d.consTotal;
    var kpis = kpi(t('fao.k.prod'), 'faoProduction', d.year ? tonnesShort(d.total) : '—', d.year ? t('fao.k.year', { year: d.year }) : t('fao.k.empty')) +
      kpi(t('fao.k.avail'), 'faoAvailability', d.year ? t('fao.k.of', { n: d.produced.length, total: GROUPS.length }) : '—', d.year ? t('fao.k.local') : t('fao.k.empty')) +
      kpi(t('fao.k.safety'), 'faoSafety', num(d.labs.length, 0), t('fao.k.alllabs')) +
      kpi(t('fao.k.loss'), 'faoLoss', '—', t('fao.k.none')) + kpi(t('fao.k.price'), 'faoPrice', '—', t('fao.k.none'));
    var sys = any ? '<ul class="vi-bars" id="faoProductionPanel">' + GROUPS.map(function (g) {
      var v = d.sums[g] || 0, c = d.cons[g] || 0;
      return '<li><div class="vi-bars__top"><span><b>' + esc(t('fao.g.' + g)) + '</b><small>' + esc(v ? t('fao.sys.share', { pct: pct(v / d.total * 100) }) : t('fao.sys.noprod')) + ' · ' + esc(t('fao.sys.cons', { n: c })) + '</small></span>' +
        '<strong>' + (v ? esc(tonnes(v)) : '—') + '</strong></div>' + (v ? '<div class="vi-bar vi-bar--good" aria-hidden="true"><i style="--w:' + (v / d.total * 100).toFixed(1) + '%"></i></div>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="vi-note vi-note--warn" id="faoProductionPanel">' + ico('info') + '<span>' + esc(t('fao.sys.empty', { country: name })) + '</span></p>';
    var sig = [];
    if (!any) sig.push(['info', t('fao.sig.none', { country: name })]);
    else {
      if (d.gap.length) sig.push(['warn', t('fao.sig.gap', { list: names(d.gap) })]);
      else if (d.consTotal && d.year) sig.push(['good', t('fao.sig.match')]);
      if (d.year) sig.push(d.notProduced.length ? ['info', t('fao.sig.noprod', { list: names(d.notProduced) })] : ['good', t('fao.sig.full')]);
    }
    var signals = sig.map(function (x) { return '<li class="vi-signal vi-signal--' + x[0] + '"><strong>' + esc(t('fao.sig.' + x[0])) + '</strong><span>' + esc(x[1]) + '</span></li>'; }).join('');
    var labs = d.labs.length ? '<ul class="vi-rows vi-rows--two" id="faoSafetyPanel">' + d.labs.slice(-6).reverse().map(function (l) {
      return '<li><span><b>' + esc(l.analyte) + '</b><small>' + esc(t('fao.lab.by', { lab: l.lab })) + '</small></span><strong>' + esc(num(l.value, 3)) + ' ' + esc(l.unit) + '</strong></li>';
    }).join('') + '</ul>' : '<p class="vi-note vi-note--warn" id="faoSafetyPanel">' + ico('info') + '<span>' + esc(t('fao.lab.empty')) + '</span></p>';
    var local = { a: d.prodEntries, b: d.consTotal, c: d.labs.length };
    var cov = ['a', 'b', 'c'].map(function (k) {
      return '<li><span>' + esc(t('fao.cov.' + k)) + '</span><b class="' + (local[k] ? 'is-on' : '') + '">' + (local[k] ? ico('check') : '') + esc(t('fao.cov.local', { n: local[k] })) + '</b></li>';
    }).concat([1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<li><span>' + esc(t('fao.cov.' + i)) + '</span><b>' + esc(t('fao.cov.none')) + '</b></li>'; })).join('');
    var prods = [1, 2, 3, 4, 5, 6].map(function (i) {
      return '<li><span><b>' + esc(t('fao.prod.' + i)) + '</b><small>' + esc(t('fao.prod.' + i + '.d')) + '</small></span><em>' + esc(t('fao.prod.tag')) + '</em></li>';
    }).join('');
    root.innerHTML = '<div class="vi">' +
      '<section class="card vi-hero"><div class="vh-head"><div class="vi-hero__title"><span class="vh-ico">' + ico('wheat') + '</span><div><span class="vi-kicker">' + esc(t('fao.kicker')) + '</span><h2>' + esc(t('fao.title')) + '</h2>' +
        '<p class="vi-sub">' + esc(t('fao.sub')) + '</p></div></div><span class="pill vi-demo">' + esc(t('fao.demo')) + '</span></div>' +
        '<div class="vi-toolbar"><label class="vi-field"><span>' + esc(t('fao.country')) + '</span><select id="faoCountry">' + codes().map(function (c) {
          return '<option value="' + c + '"' + (c === state.country ? ' selected' : '') + '>' + esc(cname(c)) + '</option>'; }).join('') + '</select></label></div>' +
        '<ul class="vi-kpis vi-kpis--5" aria-label="' + esc(t('fao.kpis')) + '">' + kpis + '</ul></section>' +
      '<div class="vi-grid">' +
        '<section class="card vi-wide">' + head('bars', t('fao.sys.title', { country: name })) + '<p class="vi-sub">' + esc(d.year ? t('fao.sys.subyear', { year: d.year }) : t('fao.sys.sub')) + '</p>' + sys +
          '<div class="vi-actions">' + btn('production', 'fao.add.prod', !any) + btn('consumption', 'fao.add.cons') + '</div>' +
          '<p class="vi-note">' + ico('info') + '<span>' + esc(t('fao.sys.note')) + '</span></p></section>' +
        '<section class="card vi-side alert-panel">' + head('alert', t('fao.sig.title')) + '<p class="vi-sub">' + esc(t('fao.sig.sub')) + '</p><ul class="vi-signals" id="faoNutritionPanel">' + signals + '</ul>' +
          '<p class="vi-note">' + ico('info') + '<span>' + esc(t('fao.sig.note')) + '</span></p></section>' +
        '<section class="card vi-half">' + head('flask', t('fao.lab.title')) + '<p class="vi-sub">' + esc(t('fao.lab.sub')) + '</p>' + labs +
          '<div class="vi-actions">' + btn('lab', 'fao.add.lab') + '</div><p class="vi-note">' + ico('info') + '<span>' + esc(t('fao.lab.note')) + '</span></p></section>' +
        '<section class="card vi-half">' + head('list', t('fao.cov.title')) + '<p class="vi-sub">' + esc(t('fao.cov.sub')) + '</p><ul class="vi-rows" id="faoMarketPanel">' + cov + '</ul></section>' +
        '<section class="card vi-full">' + head('box', t('fao.prod.title')) + '<p class="vi-sub">' + esc(t('fao.prod.sub')) + '</p><ul class="vi-products">' + prods + '</ul></section>' +
      '</div></div>';
  }

  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'faoCountry' && codes().indexOf(ev.target.value) >= 0) { state.country = ev.target.value; render(); var s = doc.getElementById('faoCountry'); if (s) s.focus(); }
  });
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-fao-act]') : null;
    if (!b) return;
    var type = b.getAttribute('data-fao-act');
    if (['production', 'consumption', 'lab'].indexOf(type) < 0) return;
    if (typeof global.go === 'function') global.go('foodcloud');
    var fc = global.NutriBentoViews && global.NutriBentoViews.foodcloud;
    if (fc && fc.setType) fc.setType(type, true);
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
    renderFAO: function () { var e = doc.getElementById('faoCountry'); if (e && codes().indexOf(e.value) >= 0) state.country = e.value; render(); },
    state: function () { var d = model(); return { country: state.country, year: d.year, total: d.total, produced: d.produced, gap: d.gap, cons: d.consTotal, labs: d.labs.length }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.fao = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'fao');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.country = headerCountry(); render(); });
  I18N.onChange(function () { render(); });
})(window);
