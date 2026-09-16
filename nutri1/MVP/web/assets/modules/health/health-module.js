/* ============================================================================
   NUTRI.N°1 — SECTION SANTÉ (v59) · MODULE PRINCIPAL
   ---------------------------------------------------------------------------
   « Cellule nationale d'intelligence sanitaire » pour le Ministère de la Santé :
   état nutritionnel (mère & enfant), maladies non transmissibles liées à
   l'alimentation, facteurs de risque, dépistage, charge de morbidité, capacité
   de services, prévention et décision.

   ARCHITECTURE
     NX.shell()   → coquille commune (bandeau, KPI, onglets, tiroirs, présentation)
     NX.ui        → boîte à outils UI partagée avec les autres sections
     NUTRI_HEALTH_DATA / NUTRI_HEALTH_MODELS → données et modèles (sans DOM)
     Ce fichier   → onglets 1 à 4 ; health-views.js → onglets 5 à 8
   ========================================================================== */
(function (w, d) {
  'use strict';
  if (w.NUTRI_HEALTH_KIT) return;
  const NX = w.NX, DATA = w.NUTRI_HEALTH_DATA, M = w.NUTRI_HEALTH_MODELS, AGRI = w.NUTRI_AGRI_DATA;
  const { h, fmt, stats: S, overlay } = NX;

  function T(fr, en) { return NX.lang() === 'en' ? en : fr; }
  const label = (o) => (NX.lang() === 'en' ? o.en : o.fr);

  /* ------------------------------------------------------------------ état */
  const state = {
    country: (function () { try { return localStorage.getItem('nutri_country') || 'TG'; } catch (e) { return 'TG'; } })(),
    year: 2026,
    scenario: 'prevention',
    region: null,
    metric: 'stunting',
    horizon: 10,
    plan: M.allLevers(.5),
    budget: 45e6,
    priority: 'lives',
    selected: [],
    mc: null,
    view: 'risk',
    bench: 'stunting',
    ageMetric: 'stunting',
    ncdView: 'prevalence',
    mchLev: null
  };
  if (!DATA.COUNTRIES[state.country]) state.country = 'TG';
  let ds = DATA.build(state.country, state.year);

  /* ======================================================================= */
  /*  COQUILLE                                                               */
  /* ======================================================================= */
  /* Ces deux tableaux sont lus par la coquille au montage : on les crée avant
     l'appel, puis on y pousse les boutons (kit n'existe pas encore ici).      */
  const controls = [], footerRight = [
    h('span.nx-src', { text: T('données publiées', 'reported data') }),
    h('span.nx-src.model', { text: T('données modélisées', 'modelled data') })
  ];
  const kit = NX.shell({
    rootId: 'healthRoot', viewId: 'health', module: 'health',
    kicker: '🏥 ' + T('MINISTÈRE DE LA SANTÉ — CELLULE DE DONNÉES', 'MINISTRY OF HEALTH — DATA CELL') + ' • NUTRI.N°1',
    title: T('Intelligence sanitaire & prévention nutritionnelle', 'Health intelligence & nutrition prevention'),
    subtitle: T('Nutrition mère-enfant, maladies non transmissibles liées à l\'alimentation, dépistage et prise en charge réunis en une seule cellule de décision — des données que le Ministère ne possède pas encore aujourd\'hui.',
      'Maternal & child nutrition, diet-related non-communicable diseases, screening and care in a single decision cell — data the Ministry does not yet hold.'),
    chips: () => [
      h('span.nx-chip.lime', { text: '📅 ' + ds.year }),
      h('span.nx-chip', { text: '🌍 ' + ds.countryName }),
      h('span.nx-chip.info', { text: T('20 indicateurs · 12 leviers', '20 indicators · 12 levers') }),
      h('span.nx-chip.warn', { text: T('données modélisées', 'modelled data') }),
      ds.agriLinked ? h('span.nx-chip.lime', { text: T('🔗 lié à l’agriculture', '🔗 linked to agriculture') }) : null
    ],
    controls: controls,
    kpis: (K) => renderKpis(K),
    footerLeft: T('NUTRI.N°1 · Cellule sanitaire · v59 — estimations modélisées de démonstration, à calibrer sur les enquêtes nationales (EDS/DHS, STEPS, SARA, DHIS2).',
      'NUTRI.N°1 · Health cell · v59 — modelled demonstration estimates, to be calibrated with national surveys (DHS, STEPS, SARA, DHIS2).'),
    footerRight: footerRight,
    rebuild: (K) => {
      ds = DATA.build(state.country, state.year);
      if (state.region && !ds.regions.some(r => r.name === state.region)) state.region = null;
      K.state = state; K.ds = ds;
    },
    brief: (K) => ({
      chip: T('Note exécutive', 'Executive brief'),
      meta: ds.countryName + ' · ' + ds.year + ' · NUTRI.N°1 v59',
      title: T('Note de décision sanitaire', 'Health decision brief'),
      text: M.brief(ds, { plan: K.state.plan ? M.screeningSim(ds, K.state.plan) : null, mc: K.state.mc }),
      file: 'note-decision-sante-' + ds.country + '-' + ds.year,
      gotoTab: 'method'
    }),
    exportMenu: (K) => exportMenu(K)
  });

  kit.ds = ds; kit.state = state;
  footerRight.push(kit.btn(T('Méthode & qualité des données', 'Method & data quality'), { icon: '🧪', onClick: () => kit.showTab('method') }));
  kit.forecast = (cfg) => M.forecast(ds, cfg || {});
  kit.region = () => ds.regions.find(r => r.name === state.region) || null;

  /* ------------------------------------------------ barre de commande ----- */
  /* La coquille monte la barre au démarrage : on remplit ce tableau avant
     kit.boot(), et on le reconstruit à chaque changement de langue.          */
  function buildControls() {
    controls.length = 0;
    const countrySel = kit.select(
      DATA.availableCountries().map(c => ({ value: c, label: DATA.COUNTRIES[c].name })),
      state.country,
      v => {
        state.country = v;
        try { localStorage.setItem('nutri_country', v); } catch (e) { }
        const g = d.getElementById('country'); if (g) g.value = v;
        kit.refresh();
        d.dispatchEvent(new CustomEvent('nutri:countryChanged', { detail: { country: v } }));
        kit.toast(T('Pays analysé : ', 'Country: ') + '<b>' + DATA.COUNTRIES[v].name + '</b> — ' + T('modèles recalculés', 'models recomputed'));
      });
    const yearSel = kit.select(DATA.YEARS.slice().reverse().map(y => ({ value: y, label: String(y) })), state.year,
      v => { state.year = parseInt(v, 10); kit.refresh(); });
    const scenSel = kit.select(Object.keys(M.SCENARIOS).map(k => ({ value: k, label: label(M.SCENARIOS[k]) })), state.scenario,
      v => {
        state.scenario = M.SCENARIOS[v] ? v : 'prevention';               // valeur inconnue → retour au scénario de prévention
        kit.refresh();
        kit.toast(T('Scénario appliqué : ', 'Scenario applied: ') + label(M.SCENARIOS[state.scenario]));
      });
    controls.push(
      h('div.nx-row', null, [kit.field(T('Pays', 'Country'), countrySel), kit.field(T('Millésime', 'Year'), yearSel)]),
      kit.field(T('Scénario de prévention', 'Prevention scenario'), scenSel),
      h('div.nx-row', null, [
        kit.btn(T('Lancer la simulation', 'Run simulation'), { variant: 'primary', icon: '⚡', onClick: () => runGlobalSim() }),
        kit.btn(T('Présentation', 'Presentation'), { variant: 'lime', icon: '🎬', onClick: () => kit.present.start() })
      ]),
      h('div.nx-row', null, [
        kit.btn(T('Note de décision', 'Decision brief'), { variant: 'info', icon: '📄', onClick: () => kit.openBrief() }),
        kit.btn(T('Exporter', 'Export'), { icon: '⇩', onClick: () => kit.openExport() }),
        kit.btn(T('Imprimer', 'Print'), { icon: '🖨', onClick: () => w.print() })
      ])
    );
  }

  /* ------------------------------------------------------------- KPI du bandeau */
  function renderKpis(K) {
    const t = ds.totals, h0 = ds.history, n = ds.nutrition, k = ds.ncd;
    const last = (a) => a[a.length - 1], prev = (a) => a[a.length - 2] || last(a);
    const delta = (a) => { const p = prev(a), l = last(a); return p ? ((l - p) / p) * 100 : 0; };
    return [
      kit.kpi({ label: T('Population sous surveillance', 'Population under surveillance'), value: fmt.num(t.population / 1e6, 1), unit: 'M', foot: fmt.int(t.under5) + ' ' + T('enfants < 5 ans', 'children < 5') + ' · ' + fmt.int(t.women1549) + ' ' + T('femmes 15–49', 'women 15–49'), spark: h0.healthSpendPerCap, source: 'reported' }),
      kit.kpi({ label: T('Retard de croissance', 'Stunting'), value: fmt.num(n.stunting, 1), unit: '%', tone: n.stunting > ds.targets.stunting.target ? 'hot' : 'good', delta: delta(h0.stunting), foot: T('cible ', 'target ') + fmt.pct(ds.targets.stunting.target, 0) + ' · ' + fmt.int(ds.totals.under5 * n.stunting / 100) + ' ' + T('enfants', 'children'), spark: h0.stunting, sparkColor: '#ff6b5e' }),
      kit.kpi({ label: T('Anémie des femmes', 'Women anaemia'), value: fmt.num(n.anaemiaWomen, 1), unit: '%', tone: n.anaemiaWomen > 30 ? 'hot' : '', foot: T('allaitement exclusif ', 'exclusive breastfeeding ') + fmt.pct(n.exclusiveBF, 0), spark: h0.anaemia, sparkColor: '#f5b642' }),
      kit.kpi({ label: T('Diabète & hypertension', 'Diabetes & hypertension'), value: fmt.num(k.diabetes, 1), unit: '% / ' + fmt.num(k.hypertension, 1) + ' %', tone: k.hypertension > 30 ? 'hot' : '', foot: fmt.pct(k.hypertensionControlled, 0) + ' ' + T('hypertension contrôlée', 'hypertension controlled'), spark: h0.diabetes, sparkColor: '#a78bfa' }),
      kit.kpi({ label: T('Charge de morbidité', 'Burden of disease'), value: fmt.num(ds.burden.dalysPer100k, 0), unit: 'DALY/100k', tone: 'hot', foot: fmt.pct(ds.burden.dietAttributableDalyPct, 0) + ' ' + T('attribuable à l’alimentation', 'diet-attributable'), spark: h0.dalysPer100k, sparkColor: '#3fc8f0' }),
      kit.kpi({ label: T('Dépistage & assurance', 'Screening & insurance'), value: fmt.num(ds.services.screening, 0), unit: '%', tone: ds.services.screening < 40 ? 'hot' : 'good', foot: T('assurance ', 'insurance ') + fmt.pct(ds.services.insurance, 0) + ' · ' + fmt.num(ds.services.nutritionistsPer100k, 2) + ' ' + T('nutritionnistes/100k', 'nutritionists/100k'), spark: h0.screening, sparkColor: '#18d67f' })
    ];
  }

  /* ------------------------------------------------------- simulation globale */
  function runGlobalSim() {
    const body = h('div.nx-stack');
    body.appendChild(kit.note(T('<b>Simulation intégrée</b> — enchaînement complet : ingestion des sources (DHIS2, enquêtes, laboratoires), contrôle qualité, épidémiologie, dépistage et cascade de soins, prévision, Monte-Carlo et optimisation du portefeuille de prévention.',
      '<b>Integrated simulation</b> — full chain: source ingestion (DHIS2, surveys, laboratories), quality control, epidemiology, screening and care cascade, forecast, Monte-Carlo and prevention portfolio optimisation.'), 'info'));
    const steps = h('div.nx-sim'), progress = h('div.nx-progress', null, [h('i')]), result = h('div');
    body.appendChild(steps); body.appendChild(progress); body.appendChild(result);
    overlay.drawer({ kicker: 'NUTRI.N°1 · ' + T('CELLULE SANITAIRE', 'HEALTH CELL'), title: T('Simulation nationale — ', 'National simulation — ') + ds.countryName + ' ' + ds.year, body });
    kit.runSteps(steps, [
      T('Connexion des sources : DHIS2, enquêtes EDS/STEPS, registres hospitaliers', 'Source connection: DHIS2, DHS/STEPS surveys, hospital registries'),
      T('Contrôle qualité, complétude et appariement des identifiants', 'Quality, completeness and identifier matching control'),
      T('Épidémiologie : prévalences, tendances et attribution alimentaire', 'Epidemiology: prevalence, trends and dietary attribution'),
      T('Dépistage, diagnostic, traitement et contrôle (cascade)', 'Screening, diagnosis, treatment and control (cascade)'),
      T('Nutrition mère-enfant : cibles et couverture des programmes', 'Maternal & child nutrition: targets and programme coverage'),
      T('Prévision 10 ans et Monte-Carlo de la charge future', '10-year forecast and Monte-Carlo of future burden'),
      T('Optimisation du portefeuille de prévention sous contrainte budgétaire', 'Prevention portfolio optimisation under budget'),
      T('Génération des sorties décisionnelles et de la note exécutive', 'Decision outputs and executive brief generation')
    ], {
      step: 360,
      onDone: function () {
        const mc = M.burdenMC(ds, { runs: 4000, horizon: state.horizon });
        const sim = M.screeningSim(ds, state.plan);
        const cat = M.interventions(ds);
        const opt = M.optimizeBudget(ds, cat, state.budget, { priority: state.priority });
        state.mc = mc;
        progress.querySelector('i').style.width = '100%';
        result.appendChild(h('div.nx-grid.g-3', { style: { marginTop: '12px' } }, [
          kit.kpi({ label: T('Charge projetée (médiane)', 'Projected burden (median)'), value: fmt.num(mc.dalys.p50, 0), unit: 'DALY/100k', tone: 'hot', foot: 'P10 ' + fmt.num(mc.dalys.p10, 0) + ' · P90 ' + fmt.num(mc.dalys.p90, 0) }),
          kit.kpi({ label: T('Probabilité de hausse', 'Probability of increase'), value: fmt.num(mc.probBurdenUp, 1), unit: '%', tone: mc.probBurdenUp > 60 ? 'hot' : '' , foot: fmt.int(mc.runs) + ' ' + T('tirages', 'runs') }),
          kit.kpi({ label: T('DALY évités par le plan', 'DALYs averted by the plan'), value: fmt.num(sim.dalysAvoided, 0), tone: 'good', foot: T('coût ', 'cost ') + fmt.money(sim.costPerDaly, ds.country) + ' / DALY' })
        ]));
        result.appendChild(h('div.nx-grid.g-3', { style: { marginTop: '12px' } }, [
          kit.kpi({ label: T('Portefeuille optimisé', 'Optimised portfolio'), value: fmt.money(opt.spentUsd, ds.country), foot: opt.plan.length + ' ' + T('mesures', 'measures') + ' · ' + opt.coverageRegions + ' ' + T('régions', 'regions') }),
          kit.kpi({ label: T('Bénéfice / coût', 'Benefit / cost'), value: fmt.num(opt.bcr, 1), unit: '×', tone: 'good', foot: fmt.num(opt.dalysPerMillion, 0) + ' DALY / M$' }),
          kit.kpi({ label: T('Retard de croissance visé', 'Stunting target'), value: fmt.pct(sim.stuntingAfter, 1), tone: 'good', foot: T('actuel ', 'current ') + fmt.pct(ds.nutrition.stunting, 1) })
        ]));
        result.appendChild(kit.note(T('<b>Recommandation de la cellule :</b> prioriser la cascade dépistage → traitement → contrôle dans les régions à faible couverture, puis la fenêtre des 1 000 premiers jours (allaitement, alimentation de complément, fortification) — c\'est la combinaison au meilleur rapport coût-efficacité.',
          '<b>Cell recommendation:</b> prioritise the screening → treatment → control cascade in low-coverage regions, then the first 1,000 days (breastfeeding, complementary feeding, fortification) — the most cost-effective combination.'), 'ok'));
        result.appendChild(h('div.nx-row', { style: { marginTop: '10px' } }, [
          kit.btn(T('Voir la prévision', 'Open forecast'), { variant: 'primary', icon: '📈', onClick: () => { overlay.closeDrawer(); kit.showTab('forecast'); } }),
          kit.btn(T('Voir le plan de prévention', 'Open prevention plan'), { variant: 'lime', icon: '💰', onClick: () => { overlay.closeDrawer(); kit.showTab('investment'); } }),
          kit.btn(T('Note de décision', 'Decision brief'), { variant: 'info', icon: '📄', onClick: () => kit.openBrief() })
        ]));
      }
    });
  }

  /* ------------------------------------------------------------ export */
  function exportMenu(K) {
    const body = h('div.nx-stack');
    body.appendChild(h('div.nx-mini.nx-muted', { text: T('Choisissez le jeu de données à exporter (CSV ouvrable dans Excel, ou JSON complet pour vos analystes).', 'Choose the dataset to export (CSV for Excel, or full JSON for your analysts).') }));
    const rows = [
      { fr: 'Indicateurs clés (tous pays, millésime courant)', en: 'Key indicators (all countries, current year)', make: () => DATA.availableCountries().map(cc => {
          const x = DATA.build(cc, state.year);
          return {
            pays: x.countryName, code: cc, annee: x.year,
            population: Math.round(x.totals.population),
            retard_croissance_pct: +x.nutrition.stunting.toFixed(2),
            emaciation_pct: +x.nutrition.wasting.toFixed(2),
            anemies_femmes_pct: +x.nutrition.anaemiaWomen.toFixed(2),
            allaitement_exclusif_pct: +x.nutrition.exclusiveBF.toFixed(2),
            diabete_pct: +x.ncd.diabetes.toFixed(2),
            hypertension_pct: +x.ncd.hypertension.toFixed(2),
            obesite_pct: +x.ncd.obesity.toFixed(2),
            depistage_pct: +x.services.screening.toFixed(2),
            daly_100k: Math.round(x.burden.dalysPer100k),
            depenses_sante_pc_usd: Math.round(x.totals.healthSpendPerCapUsd)
          };
        }, null) },
      { fr: 'Série historique et régions (pays sélectionné)', en: 'History and regions (selected country)', make: () => ds.history.years.map((y, i) => ({
          annee: y, retard_croissance_pct: +ds.history.stunting[i].toFixed(2), anemies_femmes_pct: +ds.history.anaemia[i].toFixed(2),
          allaitement_exclusif_pct: +ds.history.exclusiveBF[i].toFixed(2), diabete_pct: +ds.history.diabetes[i].toFixed(2),
          hypertension_pct: +ds.history.hypertension[i].toFixed(2), obesite_pct: +ds.history.obesity[i].toFixed(2),
          depistage_pct: +ds.history.screening[i].toFixed(2), daly_100k: Math.round(ds.history.dalysPer100k[i])
        }), null) },
      { fr: 'Régions (risque, couverture, charge)', en: 'Regions (risk, coverage, burden)', make: () => ds.regions.map(r => ({
          region: r.name, population: Math.round(r.population), part_pct: +(r.share * 100).toFixed(2),
          retard_croissance_pct: +r.stunting.toFixed(2), anemies_pct: +r.anaemia.toFixed(2),
          diabete_pct: +r.diabetes.toFixed(2), hypertension_pct: +r.hypertension.toFixed(2),
          depistage_pct: +r.screening.toFixed(2), couverture_services_pct: +r.coverage.toFixed(2),
          daly: Math.round(r.dalys), indice_risque: r.risk, priorite: r.hotspot
        }), null) },
      { fr: 'Facteurs de risque alimentaires (PAF, décès, DALY)', en: 'Dietary risk factors (PAF, deaths, DALYs)', make: () => M.riskAttribution(ds).rows.map(r => ({
          facteur: label(r.fr ? r : { fr: r.fr, en: r.en }), apport: +r.intake.toFixed(2), unite: r.unit,
          repère_oms_renforce: 1, ratio: +r.ratio.toFixed(2), paf_pct: +(r.paf * 100).toFixed(2),
          deces_an: Math.round(r.deaths), daly_100k: +r.dalyPer100k.toFixed(1), action: r.action.fr
        }), null) },
      { fr: 'Catalogue d’interventions (coût, DALY, RAC)', en: 'Intervention catalogue (cost, DALYs, BCR)', make: () => M.interventions(ds).map(x => ({
          mesure: x.fr, groupe: x.group, region: x.region, cout_usd: Math.round(x.costUsd),
          daly_evites: +x.dalys.toFixed(1), deces_evites: +x.deaths.toFixed(2),
          cout_par_daly_usd: +x.costPerDaly.toFixed(0), rapport_benefice_cout: +x.bcr.toFixed(2), equite: +x.equity.toFixed(2)
        }), null) },
      { fr: 'Dossier complet (JSON)', en: 'Full dossier (JSON)', json: () => ({
          pays: ds.countryName, code: ds.country, annee: ds.year, source: 'NUTRI.N°1 v59 — estimations modélisées de démonstration',
          totaux: ds.totals, nutrition: ds.nutrition, ncd: ds.ncd, alimentation: ds.diet, charge: ds.burden,
          services: ds.services, regions: ds.regions, historique: ds.history, qualite: ds.dataQuality,
          facteurs_risque: M.riskAttribution(ds).rows, cascade: M.careCascade(ds).steps, preparation: M.readiness(ds)
        }) }
    ];
    rows.forEach(r => body.appendChild(h('div.nx-row.between', { style: { padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.06)' } }, [
      h('span', { text: label(r) }),
      h('span.nx-row', null, [
        r.json
          ? kit.btn('JSON', { icon: '⧉', onClick: () => kit.exportJSON(r.json(), 'dossier-sante', ds.country + '-' + ds.year) })
          : kit.btn('CSV', { icon: '⇩', onClick: () => kit.exportRows(r.make(), 'sante', ds.country + '-' + ds.year) })
      ])
    ])));
    body.appendChild(kit.note(T('Astuce : le CSV utilise le point-virgule comme séparateur (compatible Excel FR).', 'Tip: CSV uses semicolon separators (Excel FR compatible).')));
    return body;
  }

  /* ======================================================================= */
  /*  ONGLET 1 — VUE NATIONALE                                               */
  /* ======================================================================= */
  kit.registerTab({
    id: 'overview', icon: '🛰️', label: T('Vue nationale', 'National overview'), labelT: ['Vue nationale', 'National overview'],
    mount(host) {
      const trendCard = kit.card({
        title: T('Trajectoire sanitaire & projection', 'Health trajectory & projection'),
        sub: T('Histoire 2010 → aujourd\'hui, projection à 10 ans et cible nationale', 'History 2010 → today, 10-year projection and national target'),
        span: 3,
        actions: [kit.segmented([
          { value: 'stunting', label: T('Retard', 'Stunting') },
          { value: 'anaemia', label: T('Anémie', 'Anaemia') },
          { value: 'exclusiveBF', label: T('Allaitement', 'Breastfeeding') },
          { value: 'diabetes', label: T('Diabète', 'Diabetes') },
          { value: 'hypertension', label: T('HTA', 'Hypertension') },
          { value: 'obesity', label: T('Obésité', 'Obesity') },
          { value: 'screening', label: T('Dépistage', 'Screening') },
          { value: 'dalysPer100k', label: T('DALY', 'DALYs') }
        ], state.metric, v => { state.metric = v; drawTrend(); })]
      });
      const trendHost = kit.chartHost('xl');
      const trendNote = h('div.nx-mini.nx-dim');
      trendCard.body.appendChild(trendHost); trendCard.body.appendChild(trendNote);

      const burdenCard = kit.card({ title: T('Charge de morbidité nationale', 'National burden of disease'), sub: T('Des décès au fardeau attribuable à l\'alimentation', 'From deaths to the diet-attributable burden'), span: 3 });
      const burdenHost = kit.chartHost('lg');
      const burdenNote = h('div.nx-mini.nx-muted');
      burdenCard.body.appendChild(burdenHost); burdenCard.body.appendChild(burdenNote);

      const regionCard = kit.card({
        title: T('Carte régionale du risque', 'Regional risk map'),
        sub: T('Indice composite : nutrition, NCD, accès aux soins — cliquez une région', 'Composite index: nutrition, NCDs, access to care — click a region'), span: 3,
        actions: [kit.segmented([
          { value: 'risk', label: T('Risque', 'Risk') },
          { value: 'stunting', label: T('Retard', 'Stunting') },
          { value: 'diabetes', label: T('Diabète', 'Diabetes') },
          { value: 'screening', label: T('Dépistage', 'Screening') }
        ], state.view, v => { state.view = v; drawRegions(); })]
      });
      const regionHost = kit.chartHost('sm');
      const regionNote = h('div.nx-note');
      regionCard.body.appendChild(regionHost); regionCard.body.appendChild(regionNote);

      const readyCard = kit.card({ title: T('Préparation du système de santé', 'Health system readiness'), sub: T('Capacité à porter la prévention et la prise en charge', 'Capacity to deliver prevention and care'), span: 3 });
      const readyHost = h('div.nx-stack');
      readyCard.body.appendChild(readyHost);

      const alertCard = kit.card({ title: T('Alertes précoces', 'Early warnings'), sub: T('Signal → priorité → action', 'Signal → priority → action'), span: 2 });
      const alertHost = h('div.nx-timeline');
      alertCard.body.appendChild(alertHost);

      const benchCard = kit.card({
        title: T('Comparaison régionale (CEDEAO + AES)', 'Regional comparison (ECOWAS + AES)'),
        sub: T('Le pays sélectionné face à ses pairs — clic pour changer de pays', 'The selected country against its peers — click to switch country'), span: 4,
        actions: [kit.segmented([
          { value: 'stunting', label: T('Retard', 'Stunting') },
          { value: 'diabetes', label: T('Diabète', 'Diabetes') },
          { value: 'screening', label: T('Dépistage', 'Screening') },
          { value: 'dalysPer100k', label: T('DALY', 'DALYs') },
          { value: 'lifeExpectancy', label: T('Espérance de vie', 'Life expectancy') }
        ], state.bench || 'stunting', v => { state.bench = v; drawBench(); })]
      });
      const benchHost = kit.chartHost('lg');
      const benchNote = h('div.nx-mini.nx-muted');
      benchCard.body.appendChild(benchHost); benchCard.body.appendChild(benchNote);

      const dietCard = kit.card({ title: T('Double fardeau', 'Double burden'), sub: T('Retard de croissance, insuffisance pondérale et surpoids cohabitent', 'Stunting, underweight and overweight coexist'), span: 2 });
      const dietHost = kit.chartHost('sm');
      dietCard.body.appendChild(dietHost);

      const mapCard = kit.card({ title: T('Cartographie régionale', 'Regional tile map'), sub: T('Cartogramme tuilé — cliquez une région', 'Tile cartogram — click a region'), span: 2 });
      const mapHost = h('div.nx-tilemap');
      mapCard.body.appendChild(mapHost);

      const chainCard = kit.card({ title: T('Alimentation → Risque → Maladie → Coût', 'Food → Risk → Disease → Cost'), sub: T('La chaîne complète, chiffrée', 'The full chain, quantified'), span: 2 });
      const chainHost = h('div.nx-stack');
      chainCard.body.appendChild(chainHost);

      host.appendChild(h('div.nx-grid.g-6', null, [
        trendCard.el, burdenCard.el, regionCard.el, readyCard.el, alertCard.el, benchCard.el, dietCard.el, mapCard.el, chainCard.el
      ]));

      function drawTrend() {
        const f = M.forecast(ds, { metric: state.metric, horizon: state.horizon, scenario: state.scenario, plan: { intensity: planIntensity() } });
        const hist = ds.history.years.slice(-f.history.length);
        kit.chart('line', trendHost, {
          labels: f.labels,
          series: [
            { name: T('Réalisé', 'Actual'), data: f.history.concat(new Array(f.point.length).fill(null)), color: '#c9ee59', area: true, points: false },
            { name: T('Projection', 'Projection'), data: new Array(f.history.length - 1).fill(null).concat([f.history[f.history.length - 1]]).concat(f.point), color: '#3fc8f0', dash: true, points: true },
            { name: T('Intervalle 80 %', '80% interval'), data: [], bandLo: f.history.concat(f.lo), bandHi: f.history.concat(f.hi), color: '#3fc8f0', points: false }
          ],
          target: f.target, targetLabel: T('cible nationale', 'national target'), zero: false,
          format: v => f.def.unit === '%' ? fmt.num(v, 1) + ' %' : fmt.num(v, 0),
          xTicks: 8
        });
        const d = f.diagnostics;
        trendNote.innerHTML = T(
          '<b>' + label(f.def) + '</b> · ' + fmt.pct(f.history[f.history.length - 1], 1) + ' → <b>' + fmt.pct(f.point[f.point.length - 1], 1) + '</b> en ' + f.forecastYears[f.forecastYears.length - 1] +
          ' · ' + label(f.scenarioLabel) + ' · tendance ' + fmt.signed(d.trendPct, 1) + ' % · erreur de backtest ' + (isFinite(d.mape) ? fmt.pct(d.mape, 1) : 'n/a') +
          (f.gapToTarget ? (f.gapToTarget.reached ? ' · <b>cible atteinte</b>' : ' · cible ' + fmt.num(f.gapToTarget.target, 0) + (f.gapToTarget.yearsToTarget ? ' dans ~' + f.gapToTarget.yearsToTarget + ' ans' : ' non atteinte sur l\'horizon')) : ''),
          '<b>' + label(f.def) + '</b> · ' + fmt.pct(f.history[f.history.length - 1], 1) + ' → <b>' + fmt.pct(f.point[f.point.length - 1], 1) + '</b> by ' + f.forecastYears[f.forecastYears.length - 1] +
          ' · ' + label(f.scenarioLabel) + ' · trend ' + fmt.signed(d.trendPct, 1) + '% · backtest error ' + (isFinite(d.mape) ? fmt.pct(d.mape, 1) : 'n/a') +
          (f.gapToTarget ? (f.gapToTarget.reached ? ' · <b>target met</b>' : ' · target ' + fmt.num(f.gapToTarget.target, 0) + (f.gapToTarget.yearsToTarget ? ' in ~' + f.gapToTarget.yearsToTarget + ' yrs' : ' not reached within horizon')) : ''));
      }
      function planIntensity() {
        if (!state.plan) return 0;
        const vals = Object.keys(state.plan).map(k => state.plan[k] || 0);
        return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
      }
      function drawBurden() {
        const b = ds.burden;
        kit.chart('waterfall', burdenHost, {
          items: [
            { label: T('Décès toutes causes', 'All-cause deaths'), value: b.totalDeaths, type: 'total', color: '#3fc8f0' },
            { label: T('Dont enfants < 5 ans', 'Of which children <5'), value: -b.childDeaths, type: 'neg', color: '#ff6b5e' },
            { label: T('Dont attribuables à l\'alimentation', 'Diet-attributable'), value: -b.dietAttributableDeaths, type: 'neg', color: '#f5b642' },
            { label: T('DALY évitables (alimentation)', 'Avertible DALYs (diet)'), value: ds.burden.dalys * b.dietAttributableDalyPct / 100, type: 'total', color: '#18d67f' }
          ],
          format: v => fmt.num(Math.abs(v), 0)
        });
        burdenNote.innerHTML = T(
          '<b>' + fmt.num(b.dalysPer100k, 0) + ' DALY pour 100 000 habitants</b> · ' + fmt.pct(b.ncdDeathsShare * 100, 0) + ' des décès sont des maladies non transmissibles · ' +
          fmt.int(b.dietAttributableDeaths) + ' décès par an sont attribuables à l\'alimentation · perte de productivité estimée ' + fmt.money(b.productivityLossUsd, ds.country) + ' par an.',
          '<b>' + fmt.num(b.dalysPer100k, 0) + ' DALYs per 100,000 people</b> · ' + fmt.pct(b.ncdDeathsShare * 100, 0) + ' of deaths are non-communicable diseases · ' +
          fmt.int(b.dietAttributableDeaths) + ' deaths a year are diet-attributable · productivity loss estimated at ' + fmt.money(b.productivityLossUsd, ds.country) + ' per year.');
      }
      function drawRegions() {
        const rs = ds.regions.slice().sort((a, b) => (state.view === 'screening' ? a[state.view] - b[state.view] : b[state.view] - a[state.view]));
        const unit = v => state.view === 'risk' || state.view === 'screening' ? fmt.num(v, 0) + (state.view === 'screening' ? ' %' : '/100') : fmt.pct(v, 1);
        kit.chart('bars', regionHost, {
          horizontal: true,
          labels: rs.map(r => (r.name === state.region ? '⭐ ' : '') + r.name),
          series: [{ name: T('Niveau', 'Level'), data: rs.map(r => r[state.view]), color: null }],
          format: unit,
          colorScale: (v) => state.view === 'screening'
            ? (v < 25 ? '#ef4444' : v < 45 ? '#f5b642' : '#18d67f')
            : (v > 66 ? '#ef4444' : v > 50 ? '#f5b642' : '#c9ee59'),
          onSelect: i => { if (rs[i]) { state.region = state.region === rs[i].name ? null : rs[i].name; drawRegions(); renderRegionNote(rs[i]); } }
        });
        renderRegionNote(rs.find(r => r.name === state.region));
      }
      function renderRegionNote(r) {
        regionNote.innerHTML = r
          ? T('<b>' + r.name + '</b> — population ' + fmt.int(r.population) + ' · retard ' + fmt.pct(r.stunting, 1) + ' · anémie ' + fmt.pct(r.anaemia, 1) +
            ' · diabète ' + fmt.pct(r.diabetes, 1) + ' · dépistage ' + fmt.pct(r.screening, 0) + ' · DALY ' + fmt.num(r.dalys, 0) +
            '<br><span class="nx-mini nx-dim">' + (r.hotspot === 'risk' ? T('Priorité : cascade de soins et prévention', 'Priority: care cascade and prevention') : r.hotspot === 'nutrition' ? T('Priorité : nutrition mère-enfant', 'Priority: maternal & child nutrition') : r.hotspot === 'access' ? T('Priorité : accès au dépistage', 'Priority: screening access') : T('Situation stable — consolider', 'Stable — consolidate')) + '</span>',
            '<b>' + r.name + '</b> — population ' + fmt.int(r.population) + ' · stunting ' + fmt.pct(r.stunting, 1) + ' · anaemia ' + fmt.pct(r.anaemia, 1) +
            ' · diabetes ' + fmt.pct(r.diabetes, 1) + ' · screening ' + fmt.pct(r.screening, 0) + ' · DALYs ' + fmt.num(r.dalys, 0) +
            '<br><span class="nx-mini nx-dim">' + (r.hotspot === 'risk' ? T('Priority: care cascade and prevention', 'Priority: care cascade and prevention') : r.hotspot === 'nutrition' ? T('Priority: maternal & child nutrition', 'Priority: maternal & child nutrition') : r.hotspot === 'access' ? T('Priority: screening access', 'Priority: screening access') : T('Stable — consolidate', 'Stable — consolidate')) + '</span>')
          : T('<b>Aucune région sélectionnée.</b> Cliquez une barre ou une tuile pour cibler une région : les analyses de dépistage, de nutrition et d\'investissement s\'y recentrent.',
            '<b>No region selected.</b> Click a bar or tile to focus screening, nutrition and investment analyses.');
      }
      function drawReady() {
        const rd = M.readiness(ds);
        readyHost.innerHTML = '';
        readyHost.appendChild(h('div.nx-row.between', null, [
          h('span.nx-chip' + (rd.score > 60 ? '.lime' : rd.score > 45 ? '.warn' : ''), { text: T('Indice ', 'Index ') + fmt.num(rd.score, 0) + '/100 · ' + rd.level }),
          h('span.nx-mini.nx-dim', { text: T('moyenne pondérée des capacités', 'weighted average of capacities') })
        ]));
        rd.parts.forEach(p => readyHost.appendChild(kit.meter(label(p), p.v, 100, { format: v => fmt.num(v, 0) + ' %', tone: p.v < 45 ? 'risk' : p.v < 65 ? 'warn' : 'ok' })));
      }
      function drawAlerts() {
        const out = [];
        const n = ds.nutrition, k = ds.ncd, s = ds.services;
        if (n.stunting > ds.targets.stunting.target) out.push({ tone: 'warn', t: T('Retard de croissance au-dessus de la cible', 'Stunting above target'), d: fmt.pct(n.stunting, 1) + ' ' + T('vs cible ', 'vs target ') + fmt.pct(ds.targets.stunting.target, 0), a: T('Voir mère-enfant', 'Open MCH'), tab: 'mch' });
        if (n.anaemiaWomen > 25) out.push({ tone: 'risk', t: T('Anémie des femmes élevée', 'High women anaemia'), d: fmt.pct(n.anaemiaWomen, 1) + ' · ' + fmt.int(ds.totals.women1549 * n.anaemiaWomen / 100) + ' ' + T('femmes', 'women'), a: T('Agir', 'Act'), tab: 'nutrition' });
        if (s.screening < 40) out.push({ tone: 'risk', t: T('Dépistage NCD insuffisant', 'Insufficient NCD screening'), d: fmt.pct(s.screening, 0) + ' ' + T('de la population cible dépistée', 'of the target population screened'), a: T('Simuler', 'Simulate'), tab: 'screening' });
        if (k.diabetesUndiagnosed > 45) out.push({ tone: 'warn', t: T('Diabète non diagnostiqué', 'Undiagnosed diabetes'), d: fmt.pct(k.diabetesUndiagnosed, 0) + ' ' + T('des cas estimés', 'of estimated cases'), a: T('Dépister', 'Screen'), tab: 'screening' });
        if (ds.diet.sodiumMg > 2000) out.push({ tone: 'risk', t: T('Sodium au-dessus du repère OMS', 'Sodium above WHO reference'), d: fmt.num(ds.diet.sodiumMg, 0) + ' mg/j ' + T('pour un repère de 2 000 mg', 'vs a 2,000 mg reference'), a: T('Réduire', 'Reduce'), tab: 'ncd' });
        if (k.hypertensionControlled < 30) out.push({ tone: 'warn', t: T('Hypertension peu contrôlée', 'Low hypertension control'), d: fmt.pct(k.hypertensionControlled, 0) + ' ' + T('des patients traités sont contrôlés', 'of treated patients are controlled'), a: T('Voir la cascade', 'Open cascade'), tab: 'screening' });
        const rs = ds.regions.filter(r => r.risk > 60);
        if (rs.length) out.push({ tone: 'risk', t: T('Régions en risque élevé', 'High-risk regions'), d: rs.map(r => r.name).join(' · '), a: T('Cibler', 'Target'), tab: 'investment', region: rs[0].name });
        if (!out.length) out.push({ tone: 'ok', t: T('Aucune alerte critique', 'No critical alert'), d: T('Tous les indicateurs suivis sont dans les seuils de la cellule.', 'All monitored indicators are within thresholds.'), a: T('Méthode', 'Method'), tab: 'method' });
        alertHost.innerHTML = '';
        out.slice(0, 8).forEach(a => {
          alertHost.appendChild(h('div.nx-tl', null, [
            h('i', { class: 'nx-tl-dot ' + (a.tone === 'risk' ? 'risk' : a.tone === 'warn' ? 'warn' : '') }),
            h('div', { style: { flex: '1' } }, [
              h('b', { text: a.t }), h('div.nx-mini.nx-muted', { text: a.d }),
              h('button.nx-btn.sm', { type: 'button', text: a.a, style: { marginTop: '4px' }, onclick: () => { if (a.region) state.region = a.region; kit.showTab(a.tab); } })
            ])
          ]));
        });
      }
      function drawBench() {
        const rows = M.benchmark(ds, DATA).slice().sort((a, b) => state.bench === 'screening' || state.bench === 'lifeExpectancy' ? b[state.bench] - a[state.bench] : a[state.bench] - b[state.bench]);
        const key = state.bench || 'stunting';
        const unit = v => key === 'screening' ? fmt.pct(v, 0) : key === 'lifeExpectancy' ? fmt.num(v, 1) + ' ' + T('ans', 'yrs') : key === 'dalysPer100k' ? fmt.num(v, 0) : fmt.pct(v, 1);
        const avg = S.mean(rows.map(r => r[key]));
        const mine = rows.find(r => r.current);
        kit.chart('bars', benchHost, {
          horizontal: true,
          labels: rows.map(r => (r.current ? '⭐ ' : '') + r.name),
          series: [{ name: label({ fr: M.METRICS[key] ? M.METRICS[key].fr : 'Niveau', en: M.METRICS[key] ? M.METRICS[key].en : 'Level' }), data: rows.map(r => r[key]), color: null }],
          target: avg, targetLabel: T('moyenne régionale', 'regional average'),
          format: unit,
          colorScale: (v, i) => rows[i].current ? '#c9ee59' : 'rgba(63,200,240,.62)',
          onSelect: i => {
            if (!rows[i] || rows[i].current) return;
            state.country = rows[i].cc;
            try { localStorage.setItem('nutri_country', rows[i].cc); } catch (e) { }
            const sel = kit.root.querySelector('select');
            if (sel) sel.value = rows[i].cc;
            kit.refresh();
            kit.toast('🌍 ' + T('Pays analysé : ', 'Country: ') + '<b>' + rows[i].name + '</b>');
          }
        });
        const rank = rows.findIndex(r => r.current) + 1;
        benchNote.innerHTML = ds.countryName + ' : <b>' + unit(mine[key]) + '</b> · ' + T('rang ', 'rank ') + '<b>' + rank + '/' + rows.length + '</b> · ' + T('moyenne régionale ', 'regional average ') + unit(avg) + '.';
      }
      function drawDiet() {
        const n = ds.nutrition;
        kit.chart('bars', dietHost, {
          labels: [T('Retard', 'Stunting'), T('Insuffisance pondérale', 'Underweight'), T('Émaciation', 'Wasting'), T('Surpoids enfant', 'Child overweight'), T('Obésité adulte', 'Adult obesity'), T('Anémie femmes', 'Women anaemia')],
          series: [{ name: T('Prévalence (%)', 'Prevalence (%)'), data: [n.stunting, n.underweight, n.wasting, n.obesityChild, ds.ncd.obesity, n.anaemiaWomen], color: null }],
          format: v => fmt.num(v, 1) + ' %',
          colorScale: (v, i) => i <= 2 ? '#f5b642' : i === 3 ? '#a78bfa' : i === 4 ? '#f472b6' : '#ff6b5e'
        });
      }
      function drawMap() {
        mapHost.innerHTML = '';
        ds.regions.forEach(r => {
          mapHost.appendChild(h('div', {
            class: 'nx-tile' + (state.region === r.name ? ' on' : ''),
            title: r.name + ' · ' + T('risque ', 'risk ') + r.risk + '/100',
            onclick: () => { state.region = state.region === r.name ? null : r.name; drawMap(); drawRegions(); }
          }, [
            h('small', { text: r.name }),
            h('b', { text: String(r.risk) }),
            h('i', { text: T('risque', 'risk') }),
            h('div.nx-bar', null, [h('i', { style: { width: r.risk + '%' } })])
          ]));
        });
      }
      function drawChain() {
        const b = ds.burden, ra = M.riskAttribution(ds);
        chainHost.innerHTML = '';
        chainHost.appendChild(kit.flow([
          { label: T('Disponibilité alimentaire', 'Food availability'), value: fmt.num(ds.diet.intakePerCapKcal, 0) + ' kcal', sub: T('par habitant/jour', 'per capita/day') },
          { label: T('Facteurs de risque', 'Risk factors'), value: fmt.pct(ra.excessShare, 0), sub: T('charge attribuable', 'attributable burden') },
          { label: T('Maladies', 'Diseases'), value: fmt.num(ds.burden.dalysPer100k, 0), sub: 'DALY/100k' },
          { label: T('Coût annuel', 'Annual cost'), value: fmt.money(b.productivityLossUsd, ds.country), sub: T('perte de productivité', 'productivity loss') }
        ]));
        chainHost.appendChild(kit.note(T('La même chaîne est mesurée dans la section Agriculture (production, pertes, prix) : NUTRI.N°1 relie les deux ministères sur les mêmes aliments.',
          'The same chain is measured in the Agriculture section (production, losses, prices): NUTRI.N°1 links both ministries on the same foods.'), 'ok'));
      }
      function draw() { drawTrend(); drawBurden(); drawRegions(); drawReady(); drawAlerts(); drawBench(); drawDiet(); drawMap(); drawChain(); }
      draw();
      return { render: () => draw() };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 2 — NUTRITION MÈRE & ENFANT                                     */
  /* ======================================================================= */
  kit.registerTab({
    id: 'mch', icon: '🤱', label: T('Mère & enfant', 'Mother & child'), labelT: ['Mère & enfant', 'Mother & child'],
    mount(host) {
      const kpis = kit.kpiBand();

      const ageCard = kit.card({
        title: T('État nutritionnel par âge', 'Nutrition status by age'),
        sub: T('Fenêtre des 1 000 premiers jours — cliquez une tranche', 'First 1,000 days window — click an age band'), span: 3,
        actions: [kit.segmented([
          { value: 'stunting', label: T('Retard', 'Stunting') },
          { value: 'wasting', label: T('Émaciation', 'Wasting') },
          { value: 'overweight', label: T('Surpoids', 'Overweight') },
          { value: 'anaemia', label: T('Anémie', 'Anaemia') }
        ], state.ageMetric || 'stunting', v => { state.ageMetric = v; drawAgeRows(); })]
      });
      const ageHost = kit.chartHost('lg');
      const ageNote = h('div.nx-mini.nx-muted');
      ageCard.body.appendChild(ageHost); ageCard.body.appendChild(ageNote);

      const progCard = kit.card({ title: T('Programmes vs cibles', 'Programmes vs targets'), sub: T('Couverture des interventions mère-enfant', 'Maternal & child intervention coverage'), span: 3 });
      const progHost = kit.chartHost('lg');
      progCard.body.appendChild(progHost);

      const winCard = kit.card({ title: T('Fenêtre des 1 000 jours', 'The first 1,000 days'), sub: T('Ce qui est fait à chaque étape et ce qui manque', 'What happens at each stage and what is missing'), span: 3 });
      const winHost = h('div.nx-stack');
      winCard.body.appendChild(winHost);

      const simCard = kit.card({
        title: T('Simulateur mère-enfant', 'Maternal & child simulator'), accent: true,
        sub: T('Renforcez les programmes : le modèle recalcule le retard de croissance et l\'anémie', 'Strengthen programmes: the model recomputes stunting and anaemia'), span: 3,
        actions: [kit.btn(T('Réinitialiser', 'Reset'), { onClick: () => { state.mchLev = { breastfeeding: .5, complementary: 0, fortification: 0, schoolMeals: 0, community: 0 }; drawSim(); } })]
      });
      const simSliders = h('div.nx-stack');
      const simOut = h('div.nx-grid.g-3');
      const simHost = kit.chartHost('sm');
      simCard.body.appendChild(simSliders); simCard.body.appendChild(simOut); simCard.body.appendChild(simHost);

      const tabCard = kit.card({ title: T('Programme national par région', 'National programme by region'), sub: T('Où concentrer les efforts en premier', 'Where to concentrate efforts first'), span: 3 });
      const tabHost = h('div');
      tabCard.body.appendChild(tabHost);

      const momCard = kit.card({ title: T('Santé de la mère', 'Maternal health'), sub: T('Anémie, faible poids de naissance, suivi', 'Anaemia, low birth weight, follow-up'), span: 3 });
      const momHost = h('div.nx-stack');
      momCard.body.appendChild(momHost);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, ageCard.el, progCard.el, winCard.el, simCard.el, tabCard.el, momCard.el]));

      state.mchLev = state.mchLev || { breastfeeding: .5, complementary: 0, fortification: 0, schoolMeals: 0, community: 0 };
      let slidersBuilt = false;
      function buildSim() {
        if (slidersBuilt) return; slidersBuilt = true;
        const levs = [
          { k: 'breastfeeding', fr: 'Promotion de l\'allaitement exclusif', en: 'Exclusive breastfeeding promotion' },
          { k: 'complementary', fr: 'Alimentation de complément 6–23 mois', en: 'Complementary feeding 6–23 months' },
          { k: 'fortification', fr: 'Fortification & supplémentation', en: 'Fortification & supplementation' },
          { k: 'schoolMeals', fr: 'Cantines scolaires', en: 'School meals' },
          { k: 'community', fr: 'Agents de santé communautaire', en: 'Community health workers' }
        ];
        levs.forEach(l => simSliders.appendChild(kit.slider({
          label: label(l), min: 0, max: 100, value: Math.round((state.mchLev[l.k] || 0) * 100), format: v => fmt.num(v, 0) + ' %',
          oninput: v => { state.mchLev[l.k] = v / 100; drawSim(); }
        })));
      }
      function drawAgeRows() {
        const rows = M.nutritionStatus(ds).rows;
        const m = state.ageMetric || 'stunting';
        const def = { stunting: T('Retard de croissance', 'Stunting'), wasting: T('Émaciation', 'Wasting'), overweight: T('Surpoids', 'Overweight'), anaemia: T('Anémie', 'Anaemia') };
        kit.chart('bars', ageHost, {
          labels: rows.map(r => label(r)),
          series: [{ name: def[m], data: rows.map(r => r[m]), color: null }],
          format: v => fmt.num(v, 1) + ' %',
          colorScale: (v, i) => rows[i].severity === 'critical' ? '#ef4444' : rows[i].severity === 'alert' ? '#f5b642' : rows[i].severity === 'watch' ? '#c9ee59' : '#18d67f',
          onSelect: i => {
            const r = rows[i]; if (!r) return;
            const ns = M.nutritionStatus(ds);
            ageNote.innerHTML = T(
              '<b>' + label(r) + '</b> — ' + fmt.int(r.population) + ' enfants · retard ' + fmt.pct(r.stunting, 1) + ' · émaciation ' + fmt.pct(r.wasting, 1) +
              ' · surpoids ' + fmt.pct(r.overweight, 1) + ' · anémie ' + fmt.pct(r.anaemia, 1) + ' · sévérité ' + r.severity +
              ' · ' + fmt.int(ns.childrenStunted) + ' enfants retardés dans le pays au total.',
              '<b>' + label(r) + '</b> — ' + fmt.int(r.population) + ' children · stunting ' + fmt.pct(r.stunting, 1) + ' · wasting ' + fmt.pct(r.wasting, 1) +
              ' · overweight ' + fmt.pct(r.overweight, 1) + ' · anaemia ' + fmt.pct(r.anaemia, 1) + ' · severity ' + r.severity +
              ' · ' + fmt.int(ns.childrenStunted) + ' stunted children nationwide.');
          }
        });
        ageNote.innerHTML = T('Cliquez une tranche d\'âge pour le détail. Les adolescents et les femmes en âge de procréer sont suivis dans l\'onglet Nutrition.',
          'Click an age band for detail. Adolescents and women of reproductive age are tracked in the Nutrition tab.');
      }
      function drawProg() {
        const ns = M.nutritionStatus(ds);
        kit.chart('bars', progHost, {
          horizontal: true,
          labels: ns.program.map(p => label(p)),
          series: [
            { name: T('Couverture actuelle (%)', 'Current coverage (%)'), data: ns.program.map(p => p.value), color: null },
            { name: T('Cible (%)', 'Target (%)'), data: ns.program.map(p => p.target), color: 'rgba(201,238,89,.35)' }
          ],
          format: v => fmt.num(v, 0) + ' %',
          colorScale: (v, i) => ns.program[i] && ns.program[i].achieved ? '#18d67f' : '#f5b642'
        });
      }
      function drawWindow() {
        const n = ds.nutrition, t = ds.totals;
        winHost.innerHTML = '';
        winHost.appendChild(kit.flow([
          { label: T('Grossesse', 'Pregnancy'), value: fmt.int(t.pregnant) + ' ' + T('femmes', 'women'), sub: T('supplémentation, dépistage anémie', 'supplementation, anaemia screening') },
          { label: T('0–5 mois', '0–5 months'), value: fmt.pct(n.exclusiveBF, 0), sub: T('allaitement exclusif', 'exclusive breastfeeding') },
          { label: T('6–23 mois', '6–23 months'), value: fmt.pct(n.complementary, 0), sub: T('alimentation de complément', 'complementary feeding') },
          { label: T('24–59 mois', '24–59 months'), value: fmt.pct(n.growthMonitoring, 0), sub: T('suivi de croissance', 'growth monitoring') }
        ]));
        const miss = [];
        if (n.exclusiveBF < 70) miss.push(T('allaitement exclusif', 'exclusive breastfeeding') + ' ' + fmt.pct(n.exclusiveBF, 0) + ' / 70 %');
        if (n.complementary < 80) miss.push(T('alimentation de complément', 'complementary feeding') + ' ' + fmt.pct(n.complementary, 0) + ' / 80 %');
        if (n.iodisedSalt < 90) miss.push(T('sel iodé', 'iodised salt') + ' ' + fmt.pct(n.iodisedSalt, 0) + ' / 90 %');
        if (n.vitASupp < 80) miss.push(T('vitamine A', 'vitamin A') + ' ' + fmt.pct(n.vitASupp, 0) + ' / 80 %');
        winHost.appendChild(kit.note(miss.length
          ? T('<b>Écarts à combler :</b> ' + miss.join(' · ') + '. Chaque point de couverture gagné réduit durablement le retard de croissance.', '<b>Gaps to close:</b> ' + miss.join(' · ') + '. Every point of coverage durably reduces stunting.')
          : T('<b>Toutes les cibles de la fenêtre des 1 000 jours sont atteintes.</b>', '<b>All first-1,000-days targets are met.</b>'), miss.length ? 'warn' : 'ok'));
      }
      function drawSim() {
        const lev = M.allLevers(0);
        Object.keys(state.mchLev).forEach(k => lev[k] = state.mchLev[k]);
        const sim = M.screeningSim(ds, lev);
        simOut.innerHTML = '';
        [
          kit.kpi({ label: T('Retard de croissance projeté', 'Projected stunting'), value: fmt.pct(sim.stuntingAfter, 1), tone: 'good', foot: T('actuel ', 'current ') + fmt.pct(ds.nutrition.stunting, 1) + ' · −' + fmt.pct(sim.stuntingGain, 1), delta: -sim.stuntingGain / Math.max(.01, ds.nutrition.stunting) * 100 }),
          kit.kpi({ label: T('Anémie des femmes projetée', 'Projected women anaemia'), value: fmt.pct(sim.anaemiaAfter, 1), tone: 'good', foot: T('actuel ', 'current ') + fmt.pct(ds.nutrition.anaemiaWomen, 1) + ' · −' + fmt.pct(sim.anaemiaGain, 1) }),
          kit.kpi({ label: T('Coût du renforcement', 'Strengthening cost'), value: fmt.money(sim.costUsd, ds.country), foot: fmt.money(sim.costPerCapita, ds.country) + ' / ' + T('habitant', 'capita') }),
          kit.kpi({ label: T('DALY évités / an', 'DALYs averted / yr'), value: fmt.num(sim.dalysFromNutrition, 0), tone: 'good', foot: T('mère-enfant', 'maternal & child') }),
          kit.kpi({ label: T('Coût par DALY', 'Cost per DALY'), value: fmt.money(sim.costPerDaly, ds.country), foot: T('seuil OMS ', 'WHO threshold ') + fmt.money(ds.profile.gdp * 3, ds.country) }),
          kit.kpi({ label: T('Vies sauvées / an', 'Lives saved / yr'), value: fmt.int(sim.deathsAvoided), tone: 'good', foot: T('enfants & femmes', 'children & women') })
        ].forEach(k => simOut.appendChild(k));
        kit.chart('bars', simHost, {
          labels: [T('Situation actuelle', 'Current'), T('Plan renforcé', 'Strengthened plan')],
          series: [
            { name: T('Retard de croissance (%)', 'Stunting (%)'), data: [ds.nutrition.stunting, sim.stuntingAfter], color: null },
            { name: T('Anémie des femmes (%)', 'Women anaemia (%)'), data: [ds.nutrition.anaemiaWomen, sim.anaemiaAfter], color: null }
          ],
          format: v => fmt.num(v, 1) + ' %'
        });
      }
      function drawRegionTable() {
        const rows = ds.regions.slice().sort((a, b) => b.risk - a.risk).map(r => ({
          region: r.name, population: r.population, stunting: r.stunting, anaemia: r.anaemia,
          screening: r.screening, coverage: r.coverage, risk: r.risk, hotspot: r.hotspot,
          priority: r.hotspot === 'nutrition' ? T('Nutrition', 'Nutrition') : r.hotspot === 'access' ? T('Accès', 'Access') : r.hotspot === 'risk' ? T('Cascade', 'Cascade') : T('Consolider', 'Consolidate')
        }));
        if (tabHost._table) { tabHost._table.setRows(rows); return; }
        tabHost._table = kit.dataTable(tabHost, {
          columns: [
            { id: 'region', label: T('Région', 'Region'), width: '1.4fr' },
            { id: 'population', label: T('Population', 'Population'), align: 'right', format: (r, v) => fmt.int(v) },
            { id: 'stunting', label: T('Retard', 'Stunting'), align: 'right', format: (r, v) => fmt.pct(v, 1), bar: r => r.stunting * 2.5 },
            { id: 'anaemia', label: T('Anémie', 'Anaemia'), align: 'right', format: (r, v) => fmt.pct(v, 1), bar: r => r.anaemia },
            { id: 'screening', label: T('Dépistage', 'Screening'), align: 'right', format: (r, v) => fmt.pct(v, 0), bar: r => r.screening },
            { id: 'priority', label: T('Priorité', 'Priority') }
          ],
          rows, pageSize: 8,
          onRow: r => { state.region = state.region === r.region ? null : r.region; kit.toast('📍 ' + r.region + ' — ' + T('priorité ', 'priority ') + r.priority); }
        });
      }
      function drawMum() {
        const n = ds.nutrition, t = ds.totals;
        momHost.innerHTML = '';
        [
          { l: T('Femmes en âge de procréer', 'Women of reproductive age'), v: fmt.int(t.women1549), s: T('suivi annuel', 'annual monitoring') },
          { l: T('Femmes enceintes', 'Pregnant women'), v: fmt.int(t.pregnant), s: T('supplémentation & dépistage', 'supplementation & screening') },
          { l: T('Femmes allaitantes', 'Breastfeeding women'), v: fmt.int(t.lactating), s: T('appui nutritionnel', 'nutrition support') },
          { l: T('Cas de faible poids de naissance', 'Low birth weight cases'), v: fmt.int(t.population * .04 * n.lowBirthWeight / 100), s: fmt.pct(n.lowBirthWeight, 1) + ' ' + T('des naissances', 'of births') }
        ].forEach(x => momHost.appendChild(kit.meter(x.l, x.v === '—' ? 0 : 1, 1, { format: () => x.v, tone: 'ok' })));
        momHost.appendChild(h('div.nx-mini.nx-dim', { text: T('Cibles : anémie des femmes < 15 % · faible poids de naissance < 10 % · vitamine A ≥ 80 % · sel iodé ≥ 90 %.',
          'Targets: women anaemia < 15% · low birth weight < 10% · vitamin A ≥ 80% · iodised salt ≥ 90%.') }));
      }
      function renderKpis() {
        kpis.innerHTML = '';
        const t = ds.totals, n = ds.nutrition;
        [
          kit.kpi({ label: T('Enfants < 5 ans', 'Children < 5'), value: fmt.num(t.under5 / 1e6, 2), unit: 'M', foot: T('cible des programmes', 'programme target'), source: 'reported' }),
          kit.kpi({ label: T('Enfants retardés', 'Stunted children'), value: fmt.int(t.under5 * n.stunting / 100), tone: 'hot', foot: fmt.pct(n.stunting, 1) + ' · ' + T('cible ', 'target ') + fmt.pct(ds.targets.stunting.target, 0) }),
          kit.kpi({ label: T('Émaciation aiguë', 'Acute wasting'), value: fmt.pct(n.wasting, 1), tone: n.wasting > 5 ? 'hot' : 'good', foot: fmt.int(t.under5 * n.wasting / 100) + ' ' + T('enfants à traiter', 'children to treat') }),
          kit.kpi({ label: T('Surpoids de l’enfant', 'Child overweight'), value: fmt.pct(n.obesityChild, 1), tone: n.obesityChild > 5 ? 'hot' : '', foot: T('double fardeau', 'double burden') }),
          kit.kpi({ label: T('Allaitement exclusif', 'Exclusive breastfeeding'), value: fmt.pct(n.exclusiveBF, 0), tone: n.exclusiveBF < 70 ? 'hot' : 'good', foot: T('cible OMS ', 'WHO target ') + fmt.pct(ds.targets.exclusiveBF.target, 0) }),
          kit.kpi({ label: T('Anémie des femmes', 'Women anaemia'), value: fmt.pct(n.anaemiaWomen, 1), tone: 'hot', foot: fmt.int(t.women1549 * n.anaemiaWomen / 100) + ' ' + T('femmes concernées', 'women affected') })
        ].forEach(k => kpis.appendChild(k));
        NX.ui.animateKpis(kpis);
      }
      function draw() {
        renderKpis(); drawAgeRows(); drawProg(); drawWindow(); buildSim(); drawSim(); drawRegionTable(); drawMum();
      }
      draw();
      return { render: () => draw() };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 3 — NCD & FACTEURS DE RISQUE                                    */
  /* ======================================================================= */
  kit.registerTab({
    id: 'ncd', icon: '🩸', label: T('NCD & facteurs de risque', 'NCDs & risk factors'), labelT: ['NCD & facteurs de risque', 'NCDs & risk factors'],
    mount(host) {
      const kpis = kit.kpiBand();

      const prevCard = kit.card({
        title: T('Prévalences & charge par maladie', 'Prevalence & burden by disease'), span: 3,
        sub: T('Diabète, hypertension, obésité, cardiovasculaire, AVC, cancers, rein', 'Diabetes, hypertension, obesity, cardiovascular, stroke, cancers, kidney'),
        actions: [kit.segmented([
          { value: 'prevalence', label: T('Prévalence', 'Prevalence') },
          { value: 'burden', label: T('Charge', 'Burden') },
          { value: 'control', label: T('Contrôle', 'Control') }
        ], state.ncdView || 'prevalence', v => { state.ncdView = v; drawPrev(); })]
      });
      const prevHost = kit.chartHost('lg');
      const prevNote = h('div.nx-mini.nx-muted');
      prevCard.body.appendChild(prevHost); prevCard.body.appendChild(prevNote);

      const pafCard = kit.card({
        title: T('Attribution alimentaire (fractions attribuables)', 'Dietary attribution (attributable fractions)'), span: 3,
        sub: T('Part de la charge expliquée par chaque facteur — cliquez pour l\'action', 'Share of burden explained by each factor — click for the action')
      });
      const pafHost = kit.chartHost('lg');
      const pafNote = h('div.nx-note');
      pafCard.body.appendChild(pafHost); pafCard.body.appendChild(pafNote);

      const dietCard = kit.card({ title: T('Apports alimentaires vs repères OMS', 'Dietary intake vs WHO references'), sub: T('Chaque facteur est comparé au repère renforcé', 'Each factor is compared with the advanced reference'), span: 3 });
      const dietHost = kit.chartHost('lg');
      dietCard.body.appendChild(dietHost);

      const sugarCard = kit.card({ title: T('D’où viennent les sucres & le sel ?', 'Where do sugars & salt come from?'), sub: T('Production et disponibilité par groupe d’aliments', 'Production and availability by food group'), span: 3 });
      const sugarHost = kit.chartHost('sm');
      const sugarNote = h('div.nx-mini.nx-muted');
      sugarCard.body.appendChild(sugarHost); sugarCard.body.appendChild(sugarNote);

      const trendCard = kit.card({ title: T('Tendance des facteurs de risque', 'Risk factor trends'), sub: T('Base 100 = 2010', 'Index 100 = 2010'), span: 3 });
      const trendHost = kit.chartHost('lg');
      trendCard.body.appendChild(trendHost);

      const lifeCard = kit.card({ title: T('Mode de vie', 'Lifestyle'), sub: T('Tabac, alcool, inactivité physique', 'Tobacco, alcohol, physical inactivity'), span: 3 });
      const lifeHost = h('div.nx-stack');
      lifeCard.body.appendChild(lifeHost);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, prevCard.el, pafCard.el, dietCard.el, sugarCard.el, trendCard.el, lifeCard.el]));

      function drawPrev() {
        const k = ds.ncd, view = state.ncdView || 'prevalence';
        const items = [
          { fr: T('Diabète', 'Diabetes'), v: k.diabetes, ctl: k.diabetesControlled, color: '#a78bfa' },
          { fr: T('Hypertension', 'Hypertension'), v: k.hypertension, ctl: k.hypertensionControlled, color: '#ff6b5e' },
          { fr: T('Obésité', 'Obesity'), v: k.obesity, ctl: null, color: '#f472b6' },
          { fr: T('Surpoids', 'Overweight'), v: k.overweight, ctl: null, color: '#f5b642' },
          { fr: T('Inactivité physique', 'Physical inactivity'), v: k.inactivity, ctl: null, color: '#3fc8f0' },
          { fr: T('Tabagisme', 'Tobacco use'), v: k.tobacco, ctl: null, color: '#9fbfac' }
        ];
        if (view === 'burden') {
          kit.chart('bars', prevHost, {
            labels: [T('Cardiovasculaire', 'Cardiovascular'), T('AVC', 'Stroke'), T('Diabète', 'Diabetes'), T('Cancers', 'Cancers'), T('Rein', 'Kidney')],
            series: [{ name: T('Décès pour 100 000 habitants', 'Deaths per 100,000'), data: [k.cvd, k.stroke, k.diabetes * 9, k.cancer, k.kidney], color: null }],
            format: v => fmt.num(v, 0), colorScale: (v, i) => ['#ff6b5e', '#f472b6', '#a78bfa', '#f5b642', '#3fc8f0'][i]
          });
          prevNote.innerHTML = T('Estimations modélisées à partir des prévalences et des taux de létalité publiés : ces taux doivent être recalibrés sur les registres nationaux et GBD.',
            'Estimates modelled from prevalence and published case-fatality: these rates must be recalibrated on national registries and GBD.');
        } else if (view === 'control') {
          kit.chart('bars', prevHost, {
            labels: [T('Diabète contrôlé', 'Diabetes controlled'), T('Diabète non diagnostiqué', 'Undiagnosed diabetes'), T('Hypertension contrôlée', 'Hypertension controlled'), T('Sous traitement (diabète)', 'On treatment (diabetes)')],
            series: [{ name: T('Part des cas (%)', 'Share of cases (%)'), data: [k.diabetesControlled, k.diabetesUndiagnosed, k.hypertensionControlled, 100 - k.diabetesUndiagnosed], color: null }],
            format: v => fmt.num(v, 0) + ' %', colorScale: (v, i) => i % 2 ? '#ff6b5e' : '#18d67f'
          });
          prevNote.innerHTML = T('<b>' + fmt.pct(k.diabetesUndiagnosed, 0) + ' des diabétiques ignorent leur statut</b> et ' + fmt.pct(k.hypertensionControlled, 0) + ' seulement des hypertendus traités sont contrôlés : c\'est le principal gisement de vies sauvées à coût faible.',
            '<b>' + fmt.pct(k.diabetesUndiagnosed, 0) + ' of people with diabetes do not know their status</b> and only ' + fmt.pct(k.hypertensionControlled, 0) + ' of treated hypertensive patients are controlled: this is the largest low-cost opportunity to save lives.');
        } else {
          kit.chart('bars', prevHost, {
            horizontal: true,
            labels: items.map(x => x.fr),
            series: [{ name: T('Prévalence (%)', 'Prevalence (%)'), data: items.map(x => x.v), color: null }],
            format: v => fmt.num(v, 1) + ' %', colorScale: (v, i) => items[i].color
          });
          prevNote.innerHTML = T('Indice de risque composite : <b>' + fmt.num(k.riskScore, 0) + '/100</b> · ' + fmt.int(ds.burden.dietAttributableDeaths) + ' décès attribuables à l\'alimentation par an.',
            'Composite risk index: <b>' + fmt.num(k.riskScore, 0) + '/100</b> · ' + fmt.int(ds.burden.dietAttributableDeaths) + ' diet-attributable deaths per year.');
        }
      }
      function drawPaf() {
        const ra = M.riskAttribution(ds);
        const rows = ra.rows.slice().sort((a, b) => b.paf - a.paf);
        kit.chart('bars', pafHost, {
          labels: rows.map(r => label(r)),
          series: [{ name: T('Fraction attribuable (%)', 'Attributable fraction (%)'), data: rows.map(r => r.paf * 100), color: null }],
          format: v => fmt.num(v, 0) + ' %',
          colorScale: (v, i) => rows[i].color,
          onSelect: i => {
            const r = rows[i]; if (!r) return;
            const body = h('div.nx-stack');
            body.appendChild(h('div.nx-row', null, [
              h('span.nx-chip', { text: T('Apport ', 'Intake ') + fmt.num(r.intake, 0) + ' ' + r.unit }),
              h('span.nx-chip.warn', { text: T('Repère renforcé ', 'Advanced reference ') + fmt.num(({ sodiumMg: 1500, sugarG: 25, satFatPct: 7, ultraProcPct: 15, fiberG: 30, fruitVegG: 500 })[r.factor] || 0, 0) }),
              h('span.nx-chip' + (r.status === 'ok' ? '.lime' : ''), { text: label(r.label) })
            ]));
            body.appendChild(h('div.nx-grid.g-3', null, [
              kit.kpi({ label: T('Fraction attribuable', 'Attributable fraction'), value: fmt.pct(r.paf * 100, 1), tone: r.paf > .3 ? 'hot' : '' }),
              kit.kpi({ label: T('Décès / an', 'Deaths / yr'), value: fmt.int(r.deaths), tone: 'hot' }),
              kit.kpi({ label: T('Charge', 'Burden'), value: fmt.num(r.dalyPer100k, 0), unit: 'DALY/100k' })
            ]));
            body.appendChild(kit.note('<b>' + T('Action prioritaire', 'Priority action') + ' :</b> ' + label(r.action), 'ok'));
            body.appendChild(kit.note(T('Fraction attribuable modélisée à partir du dépassement du repère OMS renforcé et d\'un risque relatif exponentiel (famille GBD : FAF). À recalibrer sur les données nationales de consommation.',
              'Attributable fraction modelled from the excess over the WHO advanced reference with an exponential relative risk (GBD FAF family). To be recalibrated on national consumption data.'), 'info'));
            body.appendChild(h('div.nx-row', null, [
              kit.btn(T('Simuler la réduction', 'Simulate reduction'), { variant: 'primary', icon: '⚡', onClick: () => { overlay.closeDrawer(); kit.showTab('investment'); } }),
              kit.btn(T('Voir l’alimentation', 'Open food link'), { icon: '🌾', onClick: () => { overlay.closeDrawer(); kit.showTab('nutrition'); } })
            ]));
            overlay.drawer({ kicker: 'NUTRI.N°1 · ' + T('FACTEUR DE RISQUE', 'RISK FACTOR'), title: label(r), body });
          }
        });
        const top = rows[0];
        pafNote.innerHTML = T('Facteur dominant : <b>' + label(top) + '</b> avec ' + fmt.pct(top.paf * 100, 1) + ' de la charge attribuable · ' +
          fmt.int(ra.deathsDiet) + ' décès et ' + fmt.num(ra.dalysDiet, 0) + ' DALY attribuables à l\'alimentation chaque année.',
          'Leading factor: <b>' + label(top) + '</b> with ' + fmt.pct(top.paf * 100, 1) + ' of the attributable burden · ' +
          fmt.int(ra.deathsDiet) + ' deaths and ' + fmt.num(ra.dalysDiet, 0) + ' DALYs attributable to diet each year.');
      }
      function drawDiet() {
        const b = ds.dietBenchmarks, d = ds.diet;
        kit.chart('bars', dietHost, {
          horizontal: true,
          labels: b.map(x => label(x)),
          series: [
            { name: T('Apport (%) du repère renforcé', 'Intake (% of advanced reference)'), data: b.map(x => d[x.k] / x.safer * 100), color: null },
            { name: T('Repère renforcé', 'Advanced reference'), data: b.map(() => 100), color: 'rgba(201,238,89,.28)' }
          ],
          target: 100, targetLabel: T('repère renforcé', 'advanced reference'),
          format: v => fmt.num(v, 0) + ' %',
          colorScale: (v, i) => b[i].dir === 'down' ? (v > 150 ? '#ef4444' : v > 110 ? '#f5b642' : '#18d67f') : (v < 60 ? '#ef4444' : v < 90 ? '#f5b642' : '#18d67f')
        });
      }
      function drawSugar() {
        const sup = ds.diet.supply;
        const groups = [
          { fr: T('Céréales & tubercules', 'Cereals & tubers'), v: sup.cerealsTubers, c: '#c9ee59' },
          { fr: T('Légumineuses', 'Legumes'), v: sup.legumes, c: '#18d67f' },
          { fr: T('Fruits & légumes', 'Fruit & vegetables'), v: sup.fruitsVeg, c: '#3fc8f0' },
          { fr: T('Oléagineux & noix', 'Oilseeds & nuts'), v: sup.oilsNuts, c: '#f5b642' },
          { fr: T('Produits animaux', 'Animal products'), v: sup.animal, c: '#ff6b5e' },
          { fr: T('Cultures de rente (sucre, boissons)', 'Cash crops (sugar, drinks)'), v: sup.sugarCash, c: '#f472b6' }
        ];
        kit.chart('donut', sugarHost, {
          items: groups.map(g => ({ label: g.fr, value: Math.max(0, g.v), color: g.c })),
          thickness: .6,
          centerLabel: T('disponibilité kg/hab/an', 'availability kg/cap/yr'),
          format: v => fmt.num(v, 0) + ' kg'
        });
        sugarNote.innerHTML = T('Cultures sucrières et produits transformés : <b>' + fmt.num(sup.sugarCash, 0) + ' kg/hab/an</b>, soit une faible part de la masse alimentaire mais une densité en sucres libres très supérieure à celle des céréales et tubercules. Avec un niveau de prix de <b>' + fmt.num(ds.diet.priceLevel, 2) + '</b> (indice, 1 = référence), ce sont les premiers contributeurs aux ' + fmt.num(ds.diet.sugarG, 0) + ' g/j de sucres libres — la même donnée est produite par le Ministère de l\'Agriculture.',
          'Sugar crops and processed products: <b>' + fmt.num(sup.sugarCash, 0) + ' kg/cap/yr</b> — a small share of food mass but with a far higher free-sugar density than cereals and tubers. With a price level of <b>' + fmt.num(ds.diet.priceLevel, 2) + '</b> (index, 1 = reference), they are the leading contributors to the ' + fmt.num(ds.diet.sugarG, 0) + ' g/day of free sugars — the same data is produced by the Ministry of Agriculture.');
      }
      function drawTrend() {
        const h0 = ds.history;
        const base = (a) => { const b = a[0] || 1; return a.map(v => v / b * 100); };
        kit.chart('line', trendHost, {
          labels: h0.years.map(String),
          series: [
            { name: T('Diabète', 'Diabetes'), data: base(h0.diabetes), color: '#a78bfa' },
            { name: T('Hypertension', 'Hypertension'), data: base(h0.hypertension), color: '#ff6b5e' },
            { name: T('Obésité', 'Obesity'), data: base(h0.obesity), color: '#f472b6' },
            { name: T('Dépistage', 'Screening'), data: base(h0.screening), color: '#18d67f', dash: true },
            { name: T('Sucres libres', 'Free sugars'), data: base(h0.dietSugar), color: '#f5b642', dash: true }
          ],
          target: 100, targetLabel: T('niveau 2010', '2010 level'), xTicks: 8,
          format: v => fmt.num(v, 0)
        });
      }
      function drawLife() {
        const k = ds.ncd;
        lifeHost.innerHTML = '';
        [
          { l: T('Tabagisme', 'Tobacco use'), v: k.tobacco, c: 20 },
          { l: T('Consommation d’alcool', 'Alcohol use'), v: k.alcohol, c: 10 },
          { l: T('Inactivité physique', 'Physical inactivity'), v: k.inactivity, c: 30 },
          { l: T('Obésité', 'Obesity'), v: k.obesity, c: 10 },
          { l: T('Hypertension', 'Hypertension'), v: k.hypertension, c: 25 }
        ].forEach(x => lifeHost.appendChild(kit.meter(x.l, x.v, Math.max(x.c * 2, x.v), {
          format: v => fmt.num(v, 1) + ' %',
          tone: x.v > x.c ? 'risk' : x.v > x.c * .7 ? 'warn' : 'ok'
        })));
        lifeHost.appendChild(h('div.nx-mini.nx-dim', { text: T('Seuils indicatifs : tabac < 20 % · alcool < 10 % · inactivité < 30 % · obésité < 10 % · hypertension < 25 %.',
          'Indicative thresholds: tobacco < 20% · alcohol < 10% · inactivity < 30% · obesity < 10% · hypertension < 25%.') }));
      }
      function renderKpis() {
        kpis.innerHTML = '';
        const k = ds.ncd;
        [
          kit.kpi({ label: T('Diabète', 'Diabetes'), value: fmt.num(k.diabetes, 1), unit: '%', tone: 'hot', foot: fmt.pct(k.diabetesUndiagnosed, 0) + ' ' + T('non diagnostiqué', 'undiagnosed'), source: 'reported' }),
          kit.kpi({ label: T('Hypertension', 'Hypertension'), value: fmt.num(k.hypertension, 1), unit: '%', tone: 'hot', foot: fmt.pct(k.hypertensionControlled, 0) + ' ' + T('contrôlée', 'controlled') }),
          kit.kpi({ label: T('Obésité', 'Obesity'), value: fmt.num(k.obesity, 1), unit: '%', tone: k.obesity > 10 ? 'hot' : '', foot: T('surpoids ', 'overweight ') + fmt.pct(k.overweight, 1) }),
          kit.kpi({ label: T('Indice de risque composite', 'Composite risk index'), value: fmt.num(k.riskScore, 0), unit: '/100', tone: k.riskScore > 60 ? 'hot' : '', foot: T('alimentation + mode de vie', 'diet + lifestyle') }),
          kit.kpi({ label: T('Décès attribuables / an', 'Attributable deaths / yr'), value: fmt.int(ds.burden.dietAttributableDeaths), tone: 'hot', foot: fmt.pct(ds.burden.dietAttributableDalyPct, 0) + ' ' + T('de la charge', 'of the burden') }),
          kit.kpi({ label: T('Sodium & sucres', 'Sodium & sugars'), value: fmt.num(ds.diet.sodiumMg, 0), unit: 'mg/j', tone: ds.diet.sodiumMg > 2000 ? 'hot' : '', foot: fmt.num(ds.diet.sugarG, 0) + ' g ' + T('de sucres libres/j', 'free sugars/day') })
        ].forEach(k => kpis.appendChild(k));
        NX.ui.animateKpis(kpis);
      }
      function draw() { renderKpis(); drawPrev(); drawPaf(); drawDiet(); drawSugar(); drawTrend(); drawLife(); }
      draw();
      return { render: () => draw() };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 4 — DÉPISTAGE & CASCADE DE SOINS                                */
  /* ======================================================================= */
  kit.registerTab({
    id: 'screening', icon: '🩺', label: T('Dépistage & soins', 'Screening & care'), labelT: ['Dépistage & soins', 'Screening & care'],
    mount(host) {
      const kpis = kit.kpiBand();

      const casCard = kit.card({ title: T('Cascade de prise en charge', 'Care cascade'), sub: T('Population cible → dépistée → détectée → traitée → contrôlée', 'Target population → screened → detected → treated → controlled'), span: 3 });
      const casHost = kit.chartHost('lg');
      const casNote = h('div.nx-note');
      casCard.body.appendChild(casHost); casCard.body.appendChild(casNote);

      const simCard = kit.card({
        title: T('Simulateur de dépistage', 'Screening simulator'), accent: true, span: 3,
        sub: T('Bougez les leviers : le modèle recalcule la cascade, les vies sauvées et le coût', 'Move the levers: the model recomputes the cascade, lives saved and cost'),
        actions: [
          kit.btn(T('Optimiser', 'Optimise'), { variant: 'primary', icon: '🎯', onClick: () => { state.plan = M.allLevers(.8); syncSliders(); drawSim(); } }),
          kit.btn(T('Réinitialiser', 'Reset'), { onClick: () => { state.plan = M.allLevers(.5); syncSliders(); drawSim(); } })
        ]
      });
      const simSliders = h('div.nx-stack');
      const simOut = h('div.nx-grid.g-3');
      simCard.body.appendChild(simSliders); simCard.body.appendChild(simOut);

      const capCard = kit.card({ title: T('Capacité des services par région', 'Service capacity by region'), sub: T('Dépistage, laboratoire, suivi, couverture — cliquez une case', 'Screening, laboratory, follow-up, coverage — click a cell'), span: 3 });
      const capHost = kit.chartHost('lg');
      const capNote = h('div.nx-note');
      capCard.body.appendChild(capHost); capCard.body.appendChild(capNote);

      const eqCard = kit.card({ title: T('Équité urbain / rural', 'Urban / rural equity'), sub: T('L\'écart d\'accès est un choix de politique publique', 'The access gap is a public policy choice'), span: 3 });
      const eqHost = kit.chartHost('sm');
      const eqNote = h('div.nx-mini.nx-muted');
      eqCard.body.appendChild(eqHost); eqCard.body.appendChild(eqNote);

      const campCard = kit.card({ title: T('Campagnes & registre', 'Campaigns & registry'), sub: T('Prochaines campagnes de dépistage', 'Upcoming screening campaigns'), span: 3 });
      const campHost = h('div.nx-timeline');
      campCard.body.appendChild(campHost);

      const queueCard = kit.card({ title: T('File d\'attente & suivi', 'Waiting list & follow-up'), sub: T('Priorisation par risque et couverture', 'Prioritised by risk and coverage'), span: 3 });
      const queueHost = h('div');
      queueCard.body.appendChild(queueHost);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, casCard.el, simCard.el, capCard.el, eqCard.el, campCard.el, queueCard.el]));

      let slidersBuilt = false;
      const SIM_LEVERS = ['screening', 'treatment', 'community', 'salt', 'sugar', 'activity'];
      function syncSliders() {
        if (!slidersBuilt) return;
        simSliders.querySelectorAll('.nx-slider-row').forEach(row => {
          const k = row.dataset.lever;
          if (k && row._set) row._set(Math.round((state.plan[k] || 0) * 100));
        });
      }
      function buildSim() {
        if (slidersBuilt) return; slidersBuilt = true;
        SIM_LEVERS.forEach(k => {
          const def = M.LEVERS.find(l => l.k === k);
          const row = kit.slider({
            label: label(def), min: 0, max: 100, value: Math.round((state.plan[k] || 0) * 100), format: v => fmt.num(v, 0) + ' %',
            oninput: v => { state.plan[k] = v / 100; drawSim(); }
          });
          row.dataset.lever = k;
          simSliders.appendChild(row);
        });
      }
      function drawCascade() {
        const c = M.careCascade(ds);
        kit.chart('bars', casHost, {
          horizontal: true,
          labels: c.steps.map(s => label(s)),
          series: [{ name: T('Personnes', 'People'), data: c.steps.map(s => s.value), color: null }],
          format: v => fmt.int(v),
          colorScale: (v, i) => c.steps[i].color
        });
        const leaks = c.steps.filter(x => x.leakPct != null);
        const worst = leaks.slice().sort((a, b) => b.leakPct - a.leakPct)[0];
        const wFrom = worst.from ? label(worst.from) : '';
        casNote.innerHTML = T('Détection : <b>' + fmt.pct(c.detectionPct, 1) + '</b> des cas attendus parmi les personnes dépistées (' + fmt.int(c.diagnosed) + ' sur ' + fmt.int(c.expectedCases) + '). ' +
          'Fuite la plus forte ensuite : <b>' + wFrom + ' → ' + label(worst) + '</b> (' + fmt.pct(worst.leakPct, 0) + ' de perte, ' + fmt.int(worst.leak) + ' personnes). ' +
          'In fine, <b>' + fmt.pct(c.controlledShare, 1) + '</b> des cas prévalents estimés sont contrôlés — chaque point gagné réduit directement les complications et la mortalité.',
          'Detection: <b>' + fmt.pct(c.detectionPct, 1) + '</b> of expected cases among screened people (' + fmt.int(c.diagnosed) + ' of ' + fmt.int(c.expectedCases) + '). ' +
          'Largest downstream leak: <b>' + (worst.from ? label(worst.from) : '') + ' → ' + label(worst) + '</b> (' + fmt.pct(worst.leakPct, 0) + ' drop-off, ' + fmt.int(worst.leak) + ' people). ' +
          'Ultimately <b>' + fmt.pct(c.controlledShare, 1) + '</b> of estimated prevalent cases are controlled — every point gained directly reduces complications and mortality.');
      }
      function drawSim() {
        const sim = M.screeningSim(ds, state.plan);
        simOut.innerHTML = '';
        [
          kit.kpi({ label: T('Couverture du dépistage', 'Screening coverage'), value: fmt.pct(sim.coverage * 100, 0), tone: sim.coverage > .6 ? 'good' : 'hot', delta: (sim.coverage * 100 - ds.services.screening) }),
          kit.kpi({ label: T('Cas détectés', 'Cases detected'), value: fmt.int(sim.detected), foot: T('sur ', 'of ') + fmt.int(sim.cases) + ' ' + T('cas prévalents', 'prevalent cases') }),
          kit.kpi({ label: T('Sous traitement', 'On treatment'), value: fmt.int(sim.treated), foot: T('puis ', 'then ') + fmt.int(sim.controlled) + ' ' + T('contrôlés', 'controlled') }),
          kit.kpi({ label: T('Complications évitées / an', 'Complications averted / yr'), value: fmt.int(sim.complicationsAvoided), tone: 'good', foot: T('AVC, insuffisance rénale, amputations', 'stroke, kidney failure, amputations') }),
          kit.kpi({ label: T('Vies sauvées / an', 'Lives saved / yr'), value: fmt.int(sim.deathsAvoided), tone: 'good', foot: fmt.num(sim.dalysAvoided, 0) + ' DALY' }),
          kit.kpi({ label: T('Coût par DALY', 'Cost per DALY'), value: fmt.money(sim.costPerDaly, ds.country), tone: sim.costPerDaly < ds.profile.gdp * 3 ? 'good' : 'hot', foot: T('seuil de l’OMS : ', 'WHO threshold: ') + fmt.money(ds.profile.gdp * 3, ds.country) })
        ].forEach(k => simOut.appendChild(k));
      }
      function drawCap() {
        const rows = ds.regions.slice().sort((a, b) => b.risk - a.risk).slice(0, 8);
        const cols = [T('Dépistage', 'Screening'), T('Couverture services', 'Service coverage'), T('Nutrition', 'Nutrition'), T('NCD', 'NCDs'), T('Accès alimentaire', 'Food access')];
        const values = rows.map(r => [
          r.screening, r.coverage,
          Math.max(4, Math.min(100, 100 - r.stunting * 2.6)),
          Math.max(4, Math.min(100, 100 - r.diabetes * 4)),
          Math.round(r.foodAccess * 100)
        ]);
        kit.chart('heat', capHost, {
          rows: rows.map(r => r.name), cols, values,
          format: v => fmt.num(v, 0),
          onSelect: (i, j) => {
            const r = rows[i]; if (!r) return;
            state.region = r.name;
            capNote.innerHTML = T('<b>' + r.name + '</b> — ' + cols[j] + ' : <b>' + fmt.num(values[i][j], 0) + '/100</b> · dépistage ' + fmt.pct(r.screening, 0) +
              ' · couverture services ' + fmt.pct(r.coverage, 0) + ' · retard ' + fmt.pct(r.stunting, 1) + ' · diabète ' + fmt.pct(r.diabetes, 1) + '.',
              '<b>' + r.name + '</b> — ' + cols[j] + ': <b>' + fmt.num(values[i][j], 0) + '/100</b> · screening ' + fmt.pct(r.screening, 0) +
              ' · service coverage ' + fmt.pct(r.coverage, 0) + ' · stunting ' + fmt.pct(r.stunting, 1) + ' · diabetes ' + fmt.pct(r.diabetes, 1) + '.');
            kit.toast('📍 ' + r.name);
          }
        });
        capNote.innerHTML = T('Cliquez une case pour cibler la région. Les indices faibles signalent les zones où la cascade se casse le plus tôt.',
          'Click a cell to target the region. Low indices mark where the cascade breaks earliest.');
      }
      function drawEquity() {
        const urban = ds.profile.urban, rural = 1 - urban;
        const scU = Math.min(96, ds.services.screening * (1 + urban * .35));
        const scR = Math.max(4, ds.services.screening * (1 - rural * .3));
        kit.chart('bars', eqHost, {
          labels: [T('Urbain', 'Urban'), T('Rural', 'Rural')],
          series: [
            { name: T('Dépistage NCD (%)', 'NCD screening (%)'), data: [scU, scR], color: null },
            { name: T('Couverture services (%)', 'Service coverage (%)'), data: [Math.min(100, ds.services.insurance * 1.4 + 10), Math.max(3, ds.services.insurance * .7)], color: null }
          ],
          format: v => fmt.num(v, 1) + ' %'
        });
        eqNote.innerHTML = T('Écart de dépistage urbain/rural : <b>' + fmt.num(scU - scR, 1) + ' points</b>. Les agents de santé communautaire (levier « système ») réduisent cet écart de la moitié dans le simulateur.',
          'Urban/rural screening gap: <b>' + fmt.num(scU - scR, 1) + ' points</b>. Community health workers (the “system” lever) halve this gap in the simulator.');
      }
      function drawCampaigns() {
        const rs = ds.regions.slice().sort((a, b) => b.risk - a.risk).slice(0, 7);
        campHost.innerHTML = '';
        rs.forEach((r, i) => {
          const month = 1 + ((i * 2) % 12);
          const reach = Math.round(r.population * .42 * .6);
          campHost.appendChild(h('div.nx-tl', null, [
            h('i', { class: 'nx-tl-dot ' + (r.risk > 60 ? 'risk' : r.risk > 45 ? 'warn' : '') }),
            h('div', { style: { flex: '1' } }, [
              h('b', { text: r.name + ' · ' + T('campagne mois ', 'campaign month ') + month }),
              h('div.nx-mini.nx-muted', { text: T('Dépistage ciblé 35 ans + · ', 'Targeted screening 35+ · ') + fmt.int(reach) + ' ' + T('personnes attendues · risque ', 'people expected · risk ') + r.risk + '/100' }),
              h('button.nx-btn.sm', { type: 'button', text: T('Planifier', 'Schedule'), style: { marginTop: '4px' }, onclick: () => { state.region = r.name; kit.toast('📅 ' + r.name + ' — ' + T('campagne planifiée dans le simulateur', 'campaign scheduled in the simulator')); drawCap(); } })
            ])
          ]));
        });
      }
      function drawQueue() {
        const rows = ds.regions.map(r => ({
          region: r.name, risk: r.risk, screening: r.screening, coverage: r.coverage,
          backlog: Math.max(0, Math.round(r.population * .42 * ((60 - r.screening) / 100))),
          action: r.hotspot === 'access' ? T('Renforcer dépistage', 'Reinforce screening') : r.hotspot === 'nutrition' ? T('Nutrition mère-enfant', 'Maternal & child nutrition') : r.hotspot === 'risk' ? T('Cascade complète', 'Full cascade') : T('Maintenir', 'Maintain')
        }));
        if (queueHost._table) { queueHost._table.setRows(rows); return; }
        queueHost._table = kit.dataTable(queueHost, {
          columns: [
            { id: 'region', label: T('Région', 'Region'), width: '1.4fr' },
            { id: 'risk', label: T('Risque', 'Risk'), align: 'right', format: (r, v) => fmt.num(v, 0) + '/100', bar: r => r.risk },
            { id: 'screening', label: T('Dépistage', 'Screening'), align: 'right', format: (r, v) => fmt.pct(v, 0), bar: r => r.screening },
            { id: 'backlog', label: T('À dépister', 'To screen'), align: 'right', format: (r, v) => fmt.int(v) },
            { id: 'action', label: T('Action suggérée', 'Suggested action') }
          ],
          rows, pageSize: 8,
          onRow: r => { state.region = r.region; kit.toast('📍 ' + r.region + ' — ' + r.action); }
        });
      }
      function renderKpis() {
        kpis.innerHTML = '';
        const s = ds.services, k = ds.ncd, c = M.careCascade(ds);
        [
          kit.kpi({ label: T('Dépistage NCD', 'NCD screening'), value: fmt.num(s.screening, 0), unit: '%', tone: s.screening < 40 ? 'hot' : 'good', foot: T('cible 70 %', 'target 70%'), source: 'reported' }),
          kit.kpi({ label: T('Couverture assurantielle', 'Insurance coverage'), value: fmt.num(s.insurance, 0), unit: '%', tone: s.insurance < 30 ? 'hot' : '', foot: T('cible CSU 80 %', 'UHC target 80%') }),
          kit.kpi({ label: T('Hypertension contrôlée', 'Hypertension controlled'), value: fmt.num(k.hypertensionControlled, 0), unit: '%', tone: 'hot', foot: T('parmi les patients traités', 'among treated patients') }),
          kit.kpi({ label: T('Diabète non diagnostiqué', 'Undiagnosed diabetes'), value: fmt.num(k.diabetesUndiagnosed, 0), unit: '%', tone: 'hot', foot: T('des cas estimés', 'of estimated cases') }),
          kit.kpi({ label: T('Couverture laboratoire', 'Laboratory coverage'), value: fmt.num(s.labCoverage, 0), unit: '%', tone: s.labCoverage < 45 ? 'hot' : '', foot: T('chaîne du froid ', 'cold chain ') + fmt.pct(s.coldChain, 0) }),
          kit.kpi({ label: T('Personnel de santé', 'Health workforce'), value: fmt.num(s.nursesPer100k, 1), unit: '/100k', foot: fmt.num(s.doctorsPer100k, 1) + ' ' + T('médecins · ', 'doctors · ') + fmt.num(s.nutritionistsPer100k, 2) + ' ' + T('nutritionnistes', 'nutritionists') })
        ].forEach(k => kpis.appendChild(k));
        NX.ui.animateKpis(kpis);
      }
      function draw() { renderKpis(); drawCascade(); buildSim(); drawSim(); drawCap(); drawEquity(); drawCampaigns(); drawQueue(); }
      draw();
      return { render: () => draw() };
    }
  });

  /* ---------------------------------------------------------------- démarrage */
  w.NUTRI_HEALTH_KIT = kit;
  /* Onglets bilingues : le libellé est figé au montage, on le recalcule donc
     avant chaque reconstruction de la coquille (changement de langue).       */
  function relabelTabs() {
    kit.tabs.forEach(t => { if (t.labelT) t.label = NX.lang() === 'en' ? t.labelT[1] : t.labelT[0]; });
  }
  kit.relabelTabs = relabelTabs;
  function boot() {
    if (!d.getElementById('healthRoot')) { console.warn('[NUTRI_HEALTH] #healthRoot absent'); return; }
    buildControls();
    try { kit.boot(); } catch (e) { console.error('[NUTRI_HEALTH] montage impossible', e); }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', () => setTimeout(boot, 340));
  else setTimeout(boot, 340);

  d.addEventListener('nutri:i18nChanged', e => {
    const loc = (e && e.detail && e.detail.locale) || 'fr';
    NX.setLang(loc);
    if (!d.getElementById('healthRoot')) return;
    try { relabelTabs(); buildControls(); kit.rebuildShell(kit.activeTab); } catch (err) { console.error('[NUTRI_HEALTH] rebuild langue', err); }
  });
  d.addEventListener('nutri:countryChanged', e => {
    const cc = e && e.detail && e.detail.country;
    if (!cc || cc === state.country || !DATA.COUNTRIES[cc]) return;
    state.country = cc;
    const sel = kit.root && kit.root.querySelector('select');
    if (sel) sel.value = cc;
    kit.refresh();
  });
})(window, document);
