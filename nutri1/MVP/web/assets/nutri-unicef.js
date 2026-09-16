/* ============================================================================
   NUTRI.N°1 — UNICEF CHILD & MATERNAL NUTRITION COCKPIT (assets/nutri-unicef.js)
   ----------------------------------------------------------------------------
   Module « intelligence nutritionnelle de l'enfant et de la mère » de la
   section #unicef.

   Principes :
     • AUCUNE fonctionnalité existante supprimée : le balisage d'origine
       (#unicefCountry / #unicefLevel / #unicefYear, renderUNICEF(),
       .institution-kpis, #unicefAgeCards, #unicefFeedingIndicators,
       #unicefMaternal, #unicefAnaemiaPanel, #unicefTrendChart, #unicefGIS,
       #unicefAlerts) est conservé, réparé et enrichi — renderUNICEF() est
       encapsulé, jamais remplacé.
     • Tout est calculé en local : séries de surveillance reconstruites,
       prévision d'ensemble multi-modèles, simulation d'interventions
       Monte-Carlo, coût-efficacité (coût / DALY évité), détection d'anomalies,
       cartographie des points chauds, équité (urbain-rural, quintiles).
     • Bâti sur NutriVision (assets/nutri-vision.js) → le noyau est réutilisé
       tel quel, sans duplication : NV.stats.ensembleForecast, NV.ui.pipeline,
       NV.chart, NV.i18n, NV.store, NV.export.

   Réutilisation par une autre section :
       NutriUnicef.engine.series(code, ind)      → série annuelle de surveillance
       NutriUnicef.engine.forecast(code, ind, H) → prévision P10/P50/P90 + étapes IA
       NutriUnicef.engine.simulate(levers, opt)  → impact, coût, DALY, IC 90 %
       NutriUnicef.engine.hotspots(code)         → classement des districts
       NutriUnicef.engine.warning(code)          → alertes précoces + P(seuil)
   ========================================================================== */
(function (global) {
  'use strict';
  const NV = global.NutriVision;
  if (!NV) { if (global.console) console.error('[NutriUnicef] NutriVision manquant'); return; }
  const U = NV.util, S = NV.stats, RNG = NV.rng, TH = NV.theme, UI = NV.ui, CH = NV.chart;

  /* ==========================================================================
     0. TRADUCTIONS (EN / FR — toutes les clés sont préfixées « uni. » pour ne
        jamais entrer en collision avec les autres modules dans NV.i18n)
     ====================================================================== */
  const L = [
    ['uni.badge', 'UNICEF · Child & Maternal Nutrition Intelligence', 'UNICEF · Intelligence nutritionnelle enfant & mère'],
    ['uni.hero.sub', 'Population surveillance, ensemble forecasting and intervention simulation', 'Surveillance populationnelle, prévision d\'ensemble et simulation d\'interventions'],
    ['uni.hero.country', 'Country', 'Pays'],
    ['uni.hero.level', 'Administrative level', 'Niveau administratif'],
    ['uni.hero.year', 'Reference year', 'Année de référence'],
    ['uni.hero.u5', 'Children under 5', 'Enfants de moins de 5 ans'],
    ['uni.hero.monitored', 'Monitored', 'Suivis'],
    ['uni.hero.coverage', 'Surveillance coverage', 'Couverture de surveillance'],
    ['uni.hero.freshness', 'Last data ingestion', 'Dernière ingestion'],
    ['uni.hero.riskIndex', 'Composite nutrition risk', 'Risque nutritionnel composite'],
    ['uni.hero.live', 'Live surveillance', 'Surveillance en direct'],
    ['uni.hero.demo', 'Demonstration dataset — modelled values for investor preview', 'Jeu de données de démonstration — valeurs modélisées pour aperçu investisseurs'],

    /* indicateurs */
    ['uni.ind.stunting', 'Stunting (HAZ < −2)', 'Retard de croissance (HAZ < −2)'],
    ['uni.ind.wasting', 'Wasting (WHZ < −2)', 'Émaciation (WHZ < −2)'],
    ['uni.ind.underweight', 'Underweight (WAZ < −2)', 'Insuffisance pondérale (WAZ < −2)'],
    ['uni.ind.overweight', 'Overweight (WHZ > +2)', 'Surpoids (WHZ > +2)'],
    ['uni.ind.anaemia', 'Anaemia (children 6–59 m)', 'Anémie (enfants 6–59 mois)'],
    ['uni.ind.ebf', 'Exclusive breastfeeding < 6 m', 'Allaitement maternel exclusif < 6 mois'],
    ['uni.ind.minDiet', 'Minimum dietary diversity 6–23 m', 'Diversité alimentaire minimale 6–23 mois'],
    ['uni.ind.lbw', 'Low birth weight', 'Faible poids de naissance'],
    ['uni.ind.matAnaemia', 'Anaemia in pregnancy', 'Anémie pendant la grossesse'],
    ['uni.ind.short.stunting', 'Stunting', 'Retard'],
    ['uni.ind.short.wasting', 'Wasting', 'Émaciation'],
    ['uni.ind.short.underweight', 'Underweight', 'Insuff. pondérale'],
    ['uni.ind.short.overweight', 'Overweight', 'Surpoids'],
    ['uni.ind.short.anaemia', 'Anaemia', 'Anémie'],
    ['uni.ind.short.ebf', 'EBF', 'AME'],
    ['uni.ind.short.minDiet', 'Min. diet', 'Div. alim.'],
    ['uni.ind.short.lbw', 'LBW', 'FPN'],
    ['uni.ind.short.matAnaemia', 'Maternal anaemia', 'Anémie maternelle'],

    ['uni.delta.since', 'since', 'depuis'],
    ['uni.trend.improving', 'improving', 'en amélioration'],
    ['uni.trend.stable', 'stable', 'stable'],
    ['uni.trend.worsening', 'worsening', 'en dégradation'],
    ['uni.pace.perYear', 'pp / year', 'pp / an'],

    /* prévision */
    ['uni.fc.title', 'Ensemble Forecast — Child Nutrition Trajectories', 'Prévision d\'ensemble — trajectoires de nutrition infantile'],
    ['uni.fc.sub', 'Six competing models, walk-forward backtest, calibrated bootstrap residuals, Monte-Carlo trajectories', 'Six modèles en compétition, backtest walk-forward, résidus bootstrap calibrés, trajectoires Monte-Carlo'],
    ['uni.fc.indicator', 'Indicator', 'Indicateur'],
    ['uni.fc.horizon', 'Horizon (years)', 'Horizon (années)'],
    ['uni.fc.trials', 'Simulated trajectories', 'Trajectoires simulées'],
    ['uni.fc.scenario', 'Policy scenario', 'Scénario de politique'],
    ['uni.fc.run', 'Run forecast', 'Lancer la prévision'],
    ['uni.fc.history', 'Surveillance history', 'Historique de surveillance'],
    ['uni.fc.p50', 'P50 — no additional action', 'P50 — sans action additionnelle'],
    ['uni.fc.p50sc', 'P50 — scenario', 'P50 — scénario'],
    ['uni.fc.split', 'AI forecast', 'Prévision IA'],
    ['uni.fc.whoTarget', 'WHO / Global target', 'Cible OMS / mondiale'],
    ['uni.fc.meta.today', 'Latest observation', 'Dernière observation'],
    ['uni.fc.meta.p50', 'P50 at horizon', 'P50 à l\'horizon'],
    ['uni.fc.meta.ci', '80 % CI', 'IC 80 %'],
    ['uni.fc.meta.pTarget', 'P(target reached)', 'P(cible atteinte)'],
    ['uni.fc.meta.pBreach', 'P(threshold breached)', 'P(seuil franchi)'],
    ['uni.fc.meta.trials', 'trajectories', 'trajectoires'],
    ['uni.fc.meta.ensemble', 'Ensemble', 'Ensemble'],
    ['uni.fc.meta.models', 'models', 'modèles'],
    ['uni.fc.note', 'Engine: weighted ensemble scored by walk-forward backtest; scenario drift applied per year.', 'Moteur : ensemble pondéré noté par backtest walk-forward ; dérive de scénario appliquée par an.'],
    ['uni.fc.volScale', 'Calibrated volatility factor', 'Facteur de volatilité calibré'],
    ['uni.fc.coverage', 'Empirical coverage', 'Couverture empirique'],
    ['uni.fc.seed', 'seed', 'graine'],
    ['uni.fc.years', 'years', 'ans'],

    /* pipeline IA */
    ['uni.ai.title', 'Explainable AI — reasoning pipeline', 'IA explicable — chaîne de raisonnement'],
    ['uni.ai.sub', 'Every step of the model is exposed: inputs, cleaning, features, model zoo, backtest, weighting, Monte-Carlo, calibration, verdict', 'Chaque étape du modèle est exposée : entrées, nettoyage, caractéristiques, zoo de modèles, backtest, pondération, Monte-Carlo, calibration, verdict'],
    ['uni.ai.replay', 'Replay reasoning', 'Rejouer le raisonnement'],
    ['uni.ai.done', 'Inference completed in {ms} ms · {trials} trajectories · {models} models retained', 'Inférence terminée en {ms} ms · {trials} trajectoires · {models} modèles retenus'],
    ['uni.ai.kpi.best', 'Best model error', 'Erreur du meilleur modèle'],
    ['uni.ai.kpi.kept', 'Models in ensemble', 'Modèles dans l\'ensemble'],
    ['uni.ai.kpi.folds', 'Validation folds', 'Plis de validation'],
    ['uni.ai.kpi.ic', '80 % interval at horizon', 'Intervalle 80 % à l\'horizon'],
    ['uni.ai.kpi.trials', 'Simulated trajectories', 'Trajectoires simulées'],
    ['uni.ai.kpi.time', 'Compute time', 'Temps de calcul'],
    ['uni.ai.kpi.dirichlet', 'autocorrelated noise ρ 0.55 · Dirichlet weights', 'bruit autocorrélé ρ 0,55 · poids Dirichlet'],
    ['uni.ai.kpi.horizon', 'validation horizon', 'horizon de validation'],
    ['uni.ai.features', 'Features extracted from the series', 'Caractéristiques extraites de la série'],
    ['uni.ai.weights', 'Model weights (Dirichlet, backtest-scored)', 'Poids des modèles (Dirichlet, notés par backtest)'],
    ['uni.ai.rank', 'Ranking of competing models', 'Classement des modèles en compétition'],
    ['uni.ai.col.model', 'Model', 'Modèle'],
    ['uni.ai.col.rmse', 'RMSE', 'RMSE'],
    ['uni.ai.col.mae', 'MAE', 'MAE'],
    ['uni.ai.col.mape', 'MAPE %', 'MAPE %'],
    ['uni.ai.col.weight', 'Weight', 'Poids'],
    ['uni.ai.col.status', 'Status', 'Statut'],
    ['uni.ai.kept', 'retained', 'retenu'],
    ['uni.ai.dropped', 'dropped (backtest)', 'écarté (backtest)'],
    ['uni.ai.verdict', 'Verdict', 'Verdict'],
    ['uni.ai.anomalies', 'Shocks detected in the series', 'Chocs détectés dans la série'],
    ['uni.ai.noAnomaly', 'No significant anomaly detected', 'Aucune anomalie significative détectée'],

    /* simulation d'interventions */
    ['uni.sim.title', 'Intervention Simulator — Impact, Cost & Cost-Effectiveness', 'Simulateur d\'interventions — impact, coût et coût-efficacité'],
    ['uni.sim.sub', 'Scale programmes, constrain the budget, and read the predicted effect on prevalence with 90 % uncertainty', 'Ajustez les programmes, contraignez le budget et lisez l\'effet prédit sur les prévalences avec incertitude à 90 %'],
    ['uni.sim.preset', 'Scenario preset', 'Préréglage de scénario'],
    ['uni.sim.preset.bau', 'Business as usual', 'Statu quo'],
    ['uni.sim.preset.accelerated', 'Accelerated (2030 targets)', 'Accéléré (cibles 2030)'],
    ['uni.sim.preset.max', 'Maximum ambition', 'Ambition maximale'],
    ['uni.sim.preset.austerity', 'Budget contraction −40 %', 'Contraction budgétaire −40 %'],
    ['uni.sim.preset.custom', 'Custom mix', 'Panachage personnalisé'],
    ['uni.sim.budget', 'Annual budget (US$)', 'Budget annuel (US$)'],
    ['uni.sim.quality', 'Delivery quality / system strength', 'Qualité de mise en œuvre / force du système'],
    ['uni.sim.equity', 'Pro-poor targeting', 'Ciblage pro-pauvres'],
    ['uni.sim.horizon', 'Impact horizon (years)', 'Horizon d\'impact (années)'],
    ['uni.sim.run', 'Simulate', 'Simuler'],
    ['uni.sim.levers', 'Programme coverage levers', 'Leviers de couverture des programmes'],
    ['uni.sim.cost', 'Total programme cost', 'Coût total du programme'],
    ['uni.sim.over', 'Over budget — coverage auto-scaled', 'Hors budget — couverture réduite automatiquement'],
    ['uni.sim.within', 'Within budget', 'Dans le budget'],
    ['uni.sim.reached', 'Children reached', 'Enfants touchés'],
    ['uni.sim.averted', 'Cases averted', 'Cas évités'],
    ['uni.sim.daly', 'DALYs averted', 'DALY évités'],
    ['uni.sim.costDaly', 'Cost per DALY averted', 'Coût par DALY évité'],
    ['uni.sim.roi', 'Return on investment', 'Retour sur investissement'],
    ['uni.sim.veryCE', 'Very cost-effective (< 1× GDP/capita)', 'Très coût-efficace (< 1× PIB/habitant)'],
    ['uni.sim.ce', 'Cost-effective (< 3× GDP/capita)', 'Coût-efficace (< 3× PIB/habitant)'],
    ['uni.sim.notCE', 'Not cost-effective', 'Non coût-efficace'],
    ['uni.sim.impactChart', 'Predicted prevalence — baseline vs intervention', 'Prévalence prédite — référence vs intervention'],
    ['uni.sim.baseline', 'Baseline (no additional action)', 'Référence (sans action additionnelle)'],
    ['uni.sim.intervention', 'With interventions (P50)', 'Avec interventions (P50)'],
    ['uni.sim.p90band', 'P10–P90 uncertainty', 'Incertitude P10–P90'],
    ['uni.sim.frontier', 'Cost-effectiveness frontier', 'Frontière de coût-efficacité'],
    ['uni.sim.col.programme', 'Programme', 'Programme'],
    ['uni.sim.col.coverage', 'Coverage', 'Couverture'],
    ['uni.sim.col.reach', 'Children reached', 'Enfants touchés'],
    ['uni.sim.col.effect', 'Effect on target indicator', 'Effet sur l\'indicateur cible'],
    ['uni.sim.col.cost', 'Cost', 'Coût'],
    ['uni.sim.col.costDaly', 'US$ / DALY', 'US$ / DALY'],
    ['uni.sim.col.priority', 'Priority', 'Priorité'],
    ['uni.sim.uncertainty', 'Effect sizes are sampled per trajectory (log-normal 95 % CI) — the interval reflects both effectiveness and coverage uncertainty.', 'Les tailles d\'effet sont tirées par trajectoire (log-normal, IC 95 %) — l\'intervalle reflète l\'incertitude d\'efficacité et de couverture.'],
    ['uni.sim.synergy', 'Stacking correction', 'Correction d\'empilement'],
    ['uni.sim.lag', 'Effect ramp-up (lag)', 'Montée en charge (délai)'],
    ['uni.sim.noLever', 'Set at least one coverage lever above zero to simulate an impact.', 'Activez au moins un levier de couverture pour simuler un impact.'],

    /* points chauds & équité */
    ['uni.hs.title', 'Hotspot Intelligence — districts ranked by composite risk', 'Intelligence des points chauds — districts classés par risque composite'],
    ['uni.hs.sub', 'Composite of stunting, wasting, anaemia, feeding practices and surveillance coverage', 'Composite : retard, émaciation, anémie, pratiques d\'alimentation et couverture de surveillance'],
    ['uni.hs.col.district', 'District', 'District'],
    ['uni.hs.col.u5', 'Children < 5', 'Enfants < 5 ans'],
    ['uni.hs.col.risk', 'Risk index', 'Indice de risque'],
    ['uni.hs.col.burden', 'Stunted children', 'Enfants en retard'],
    ['uni.hs.col.coverage', 'Data coverage', 'Couverture données'],
    ['uni.hs.col.trend', 'Trend', 'Tendance'],
    ['uni.hs.focus', 'Focus on this district', 'Cibler ce district'],
    ['uni.hs.heat', 'District × indicator intensity', 'Intensité district × indicateur'],
    ['uni.hs.equity', 'Equity & leave-no-one-behind', 'Équité et « ne laisser personne de côté »'],
    ['uni.hs.urbanRural', 'Rural / urban ratio', 'Ratio rural / urbain'],
    ['uni.hs.quintile', 'Poorest / richest quintile', 'Quintile le plus pauvre / le plus riche'],
    ['uni.hs.dispersion', 'District dispersion (P90 / P10)', 'Dispersion inter-districts (P90 / P10)'],
    ['uni.hs.gini', 'Inequality of burden', 'Inégalité de la charge'],

    /* GIS */
    ['uni.gis.title', 'Nutrition Hotspot GIS — demonstration layer', 'SIG des points chauds nutritionnels — couche de démonstration'],
    ['uni.gis.sub', 'Synthetic geometry, modelled risk surfaces — click a tile to inspect the district', 'Géométrie synthétique, surfaces de risque modélisées — cliquez une tuile pour inspecter le district'],
    ['uni.gis.layer', 'Layer', 'Couche'],
    ['uni.gis.legend', 'Risk scale', 'Échelle de risque'],
    ['uni.gis.low', 'low', 'faible'],
    ['uni.gis.high', 'high', 'élevé'],
    ['uni.gis.open', 'Open GIS workbench', 'Ouvrir l\'atelier SIG'],
    ['uni.gis.tiles', 'tiles', 'tuiles'],
    ['uni.gis.selected', 'Selected district', 'District sélectionné'],

    /* alertes précoces */
    ['uni.ew.title', 'Early Warning — threshold breach probabilities', 'Alerte précoce — probabilités de franchissement de seuil'],
    ['uni.ew.sub', 'WHO thresholds tested against the Monte-Carlo forecast paths', 'Seuils OMS testés sur les trajectoires Monte-Carlo de la prévision'],
    ['uni.ew.breachYear', 'Median breach year', 'Année médiane de franchissement'],
    ['uni.ew.pBreach', 'P(breach by 2030)', 'P(franchissement d\'ici 2030)'],
    ['uni.ew.severity.critical', 'Critical', 'Critique'],
    ['uni.ew.severity.high', 'High', 'Élevé'],
    ['uni.ew.severity.moderate', 'Moderate', 'Modéré'],
    ['uni.ew.severity.low', 'Low', 'Faible'],
    ['uni.ew.action', 'Recommended early action', 'Action précoce recommandée'],
    ['uni.ew.none', 'No threshold breach projected on the current trajectory.', 'Aucun franchissement de seuil projeté sur la trajectoire actuelle.'],
    ['uni.ew.shock', 'Historical shock detected', 'Choc historique détecté'],

    /* qualité des données */
    ['uni.dq.title', 'Data Quality & Provenance', 'Qualité des données et provenance'],
    ['uni.dq.sub', 'Which evidence supports each indicator, and how reliable it is', 'Quelle preuve soutient chaque indicateur, et sa fiabilité'],
    ['uni.dq.col.indicator', 'Indicator', 'Indicateur'],
    ['uni.dq.col.source', 'Primary source', 'Source principale'],
    ['uni.dq.col.year', 'Latest round', 'Dernier passage'],
    ['uni.dq.col.completeness', 'Completeness', 'Complétude'],
    ['uni.dq.col.timeliness', 'Timeliness', 'Actualité'],
    ['uni.dq.col.confidence', 'Confidence', 'Confiance'],
    ['uni.dq.sources', 'DHS · MICS · SMART · routine HMIS · civil registration · food composition labs', 'EDS · MICS · SMART · routine HMIS · état civil · laboratoires de composition'],
    ['uni.dq.gauge', 'Overall data readiness', 'Maturité globale des données'],

    /* exports / pied */
    ['uni.exp.json', 'Export JSON', 'Exporter JSON'],
    ['uni.exp.csv', 'Export CSV', 'Exporter CSV'],
    ['uni.exp.report', 'Printable situation report', 'Rapport de situation imprimable'],
    ['uni.exp.title', 'UNICEF nutrition intelligence pack', 'Dossier d\'intelligence nutritionnelle UNICEF'],
    ['uni.foot.title', 'Reusable core', 'Noyau réutilisable'],
    ['uni.foot.text', 'This cockpit runs on the same NutriVision engine as the citizen section — statistics, charts, explainable-AI pipeline and design system are shared, not duplicated.', 'Ce cockpit fonctionne sur le même moteur NutriVision que la section citoyenne — statistiques, graphiques, chaîne d\'IA explicable et système de design sont partagés, non dupliqués.'],
    ['uni.foot.disclaimer', 'Demonstration product. Values are modelled for preview purposes and do not represent official UNICEF, WHO or national statistics.', 'Produit de démonstration. Les valeurs sont modélisées à des fins d\'aperçu et ne représentent pas les statistiques officielles de l\'UNICEF, de l\'OMS ou des États.'],

    /* interventions */
    ['uni.prog.ebf', 'Breastfeeding counselling (IYCF)', 'Conseil en allaitement (ANJE)'],
    ['uni.prog.iyfc', 'Complementary feeding & diet diversity', 'Alimentation complémentaire et diversité'],
    ['uni.prog.sam', 'SAM treatment — RUTF / OTP', 'Traitement MAS — ATPE / URENAM'],
    ['uni.prog.mnp', 'Multiple micronutrient powders', 'Poudres de micronutriments multiples'],
    ['uni.prog.ifa', 'Antenatal iron & folic acid', 'Fer et acide folique prénatal'],
    ['uni.prog.fort', 'Large-scale food fortification', 'Fortification alimentaire à grande échelle'],
    ['uni.prog.wash', 'Water, sanitation & hygiene (WASH)', 'Eau, assainissement et hygiène (WASH)'],
    ['uni.prog.cash', 'Nutrition-sensitive social transfers', 'Transferts sociaux sensibles à la nutrition'],
    ['uni.prog.csc', 'Community screening & growth monitoring', 'Dépistage communautaire et suivi de croissance'],
    ['uni.prog.hint.ebf', 'Counselling of mothers of infants 0–6 months', 'Conseil des mères de nourrissons 0–6 mois'],
    ['uni.prog.hint.iyfc', '6–23 months: safe, diverse, responsive feeding', '6–23 mois : alimentation sûre, diverse et responsive'],
    ['uni.prog.hint.sam', 'Severe acute malnutrition case management', 'Prise en charge de la malnutrition aiguë sévère'],
    ['uni.prog.hint.mnp', 'Home fortification for 6–23 months', 'Fortification à domicile pour les 6–23 mois'],
    ['uni.prog.hint.ifa', 'IFA during pregnancy + post-partum', 'Fer-acide folique pendant la grossesse et le post-partum'],
    ['uni.prog.hint.fort', 'Wheat flour / oil fortification with iron & folic acid', 'Fortification farine / huile en fer et acide folique'],
    ['uni.prog.hint.wash', 'Reduces environmental enteropathy and infections', 'Réduit l\'entéropathie environnementale et les infections'],
    ['uni.prog.hint.cash', 'Household food access and care practices', 'Accès alimentaire des ménages et pratiques de soins'],
    ['uni.prog.hint.csc', 'Early detection, referral and counselling', 'Détection précoce, référencement et conseil'],

    ['uni.common.of', 'of', 'sur'],
    ['uni.common.children', 'children', 'enfants'],
    ['uni.common.districts', 'districts', 'districts'],
    ['uni.common.perYear', 'per year', 'par an'],
    ['uni.common.total', 'Total', 'Total'],
    ['uni.common.years', 'years', 'ans'],
    ['uni.common.national', 'National', 'National'],
    ['uni.common.region', 'Region', 'Région'],
    ['uni.common.district', 'District', 'District'],
    ['uni.common.rural', 'Rural', 'Rural'],
    ['uni.common.urban', 'Urban', 'Urbain'],
    ['uni.common.refreshed', 'Cockpit refreshed', 'Cockpit actualisé'],
    ['uni.common.ready', 'Ready — select an indicator and run the forecast', 'Prêt — choisissez un indicateur et lancez la prévision'],
    ['uni.common.running', 'Running the ensemble…', 'Exécution de l\'ensemble…'],
    ['uni.common.cases', 'cases', 'cas'],
    ['uni.common.averted', 'averted', 'évités'],
    ['uni.common.burden', 'Burden', 'Charge'],
    ['uni.common.vsGdp', '× GDP / capita', '× PIB / habitant']
  ];
  const DICT = { en: {}, fr: {} };
  L.forEach(function (row) { DICT.en[row[0]] = row[1]; DICT.fr[row[0]] = row[2] || row[1]; });
  NV.i18n.add('unicef', DICT);
  function t(k, vars) { const s = NV.i18n.t(k, vars); return s === k ? k : s; }
  function fr() { return String(NV.i18n.localeCode || 'en').slice(0, 2) === 'fr'; }

  /* ==========================================================================
     1. MODÈLE DE DONNÉES DE SURVEILLANCE (démonstration)
        Les six pays présents dans le fichier historique (demoCountryMetrics)
        conservent exactement leurs valeurs d'ancrage : nos séries se terminent
        sur ces chiffres, donc les KPI hérités et le cockpit restent cohérents.
     ====================================================================== */
  const COUNTRY_LIST = [['BJ', 'Benin'], ['BF', 'Burkina Faso'], ['CV', 'Cabo Verde'], ['CI', 'Côte d\'Ivoire'], ['GM', 'The Gambia'], ['GH', 'Ghana'], ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'], ['LR', 'Liberia'], ['ML', 'Mali'], ['MR', 'Mauritania'], ['NE', 'Niger'], ['NG', 'Nigeria'], ['SN', 'Senegal'], ['SL', 'Sierra Leone'], ['TG', 'Togo'], ['TD', 'Chad']];
  const NAMES = {}; COUNTRY_LIST.forEach((c) => { NAMES[c[0]] = c[1]; });

  /* u5 : population des moins de 5 ans (millions) · gdp : PIB / habitant (US$, indicatif)
     urban : part urbaine (%) · prog : facteur d'avancement programmatique (0–1)
     monitored : enfants suivis dans le système (cohérent avec demoCountryMetrics) */
  const ANCHOR = {
    BJ: { u5: 3.6, stunting: 32, wasting: 5, underweight: 19, overweight: 4, anaemia: 52, ebf: 47, minDiet: 24, lbw: 14, matAnaemia: 50, gdp: 1400, urban: 48, prog: 0.60, monitored: 240000 },
    BF: { u5: 7.1, stunting: 25, wasting: 9, underweight: 18, overweight: 3, anaemia: 45, ebf: 47, minDiet: 20, lbw: 14, matAnaemia: 48, gdp: 830, urban: 31, prog: 0.55, monitored: 430000 },
    CV: { u5: 0.17, stunting: 10, wasting: 3, underweight: 6, overweight: 9, anaemia: 26, ebf: 52, minDiet: 38, lbw: 9, matAnaemia: 24, gdp: 3900, urban: 66, prog: 0.85, monitored: 42000 },
    CI: { u5: 7.6, stunting: 22, wasting: 7, underweight: 14, overweight: 5, anaemia: 43, ebf: 50, minDiet: 26, lbw: 13, matAnaemia: 44, gdp: 2500, urban: 52, prog: 0.66, monitored: 740000 },
    GM: { u5: 0.79, stunting: 17, wasting: 6, underweight: 12, overweight: 5, anaemia: 40, ebf: 48, minDiet: 28, lbw: 12, matAnaemia: 40, gdp: 800, urban: 59, prog: 0.72, monitored: 96000 },
    GH: { u5: 8.5, stunting: 16, wasting: 6, underweight: 11, overweight: 7, anaemia: 39, ebf: 55, minDiet: 32, lbw: 12, matAnaemia: 38, gdp: 2200, urban: 58, prog: 0.80, monitored: 620000 },
    GN: { u5: 4.5, stunting: 29, wasting: 6, underweight: 18, overweight: 4, anaemia: 48, ebf: 52, minDiet: 19, lbw: 14, matAnaemia: 46, gdp: 1200, urban: 37, prog: 0.58, monitored: 310000 },
    GW: { u5: 0.71, stunting: 28, wasting: 6, underweight: 17, overweight: 4, anaemia: 47, ebf: 46, minDiet: 21, lbw: 13, matAnaemia: 45, gdp: 800, urban: 43, prog: 0.55, monitored: 88000 },
    LR: { u5: 1.6, stunting: 30, wasting: 6, underweight: 17, overweight: 5, anaemia: 49, ebf: 44, minDiet: 23, lbw: 13, matAnaemia: 47, gdp: 700, urban: 49, prog: 0.52, monitored: 140000 },
    ML: { u5: 7.2, stunting: 38, wasting: 6, underweight: 20, overweight: 4, anaemia: 50, ebf: 49, minDiet: 17, lbw: 15, matAnaemia: 52, gdp: 900, urban: 42, prog: 0.55, monitored: 390000 },
    MR: { u5: 1.5, stunting: 28, wasting: 7, underweight: 18, overweight: 5, anaemia: 46, ebf: 44, minDiet: 22, lbw: 14, matAnaemia: 48, gdp: 2100, urban: 50, prog: 0.58, monitored: 130000 },
    NE: { u5: 7.9, stunting: 45, wasting: 10, underweight: 27, overweight: 3, anaemia: 55, ebf: 45, minDiet: 14, lbw: 16, matAnaemia: 56, gdp: 550, urban: 27, prog: 0.45, monitored: 360000 },
    NG: { u5: 31.0, stunting: 29, wasting: 8, underweight: 22, overweight: 6, anaemia: 46, ebf: 32, minDiet: 22, lbw: 15, matAnaemia: 41, gdp: 1500, urban: 54, prog: 0.60, monitored: 2200000 },
    SN: { u5: 4.9, stunting: 17, wasting: 5, underweight: 12, overweight: 6, anaemia: 41, ebf: 57, minDiet: 30, lbw: 11, matAnaemia: 40, gdp: 1600, urban: 48, prog: 0.78, monitored: 510000 },
    SL: { u5: 2.5, stunting: 35, wasting: 5, underweight: 21, overweight: 4, anaemia: 49, ebf: 54, minDiet: 21, lbw: 14, matAnaemia: 48, gdp: 500, urban: 43, prog: 0.50, monitored: 190000 },
    TG: { u5: 2.5, stunting: 18, wasting: 7, underweight: 14, overweight: 5, anaemia: 42, ebf: 58, minDiet: 30, lbw: 12, matAnaemia: 42, gdp: 950, urban: 42, prog: 0.75, monitored: 184000 },
    TD: { u5: 6.3, stunting: 42, wasting: 12, underweight: 26, overweight: 3, anaemia: 53, ebf: 38, minDiet: 12, lbw: 16, matAnaemia: 54, gdp: 700, urban: 29, prog: 0.42, monitored: 300000 },
    default: { u5: 3.0, stunting: 20, wasting: 7, underweight: 14, overweight: 5, anaemia: 42, ebf: 55, minDiet: 28, lbw: 12, matAnaemia: 42, gdp: 1300, urban: 45, prog: 0.60, monitored: 300000 }
  };

  /* indicateurs suivis : seuils OMS (warn / risk), cible mondiale 2030, sens */
  const INDICATORS = [
    { id: 'stunting', icon: '📏', good: 'down', warn: 20, risk: 30, target2030: 0.55, daly: 0.65, src: 'DHS / MICS anthropometry' },
    { id: 'wasting', icon: '⚠️', good: 'down', warn: 5, risk: 10, target2030: 0.55, daly: 0.35, src: 'SMART / MUAC screening' },
    { id: 'underweight', icon: '⚖️', good: 'down', warn: 15, risk: 25, target2030: 0.60, daly: 0.50, src: 'DHS / MICS anthropometry' },
    { id: 'overweight', icon: '📈', good: 'down', warn: 6, risk: 10, target2030: 0.90, daly: 0.05, src: 'DHS / MICS anthropometry' },
    { id: 'anaemia', icon: '🩸', good: 'down', warn: 20, risk: 40, target2030: 0.50, daly: 0.12, src: 'DHS capillary Hb' },
    { id: 'ebf', icon: '🤱', good: 'up', warn: 50, risk: 30, target2030: 1.70, daly: 0.04, src: 'MICS / DHS feeding module' },
    { id: 'minDiet', icon: '🥗', good: 'up', warn: 33, risk: 20, target2030: 1.60, daly: 0.02, src: 'MICS 24-h recall' },
    { id: 'lbw', icon: '👶', good: 'down', warn: 12, risk: 18, target2030: 0.70, daly: 0.40, src: 'Birth registration + HMIS' },
    { id: 'matAnaemia', icon: '🤰', good: 'down', warn: 20, risk: 40, target2030: 0.50, daly: 0.25, src: 'ANC register / DHS' }
  ];
  const IND_BY_ID = {}; INDICATORS.forEach((x) => { IND_BY_ID[x.id] = x; });
  const IND_IDS = INDICATORS.map((x) => x.id);

  /* dynamique historique : pente annuelle « business as usual » (points de %)
     vol : bruit annuel · shocks : chocs exogènes (année → delta en points) */
  const SAHEL = { BF: 1, ML: 1, NE: 1, TD: 1, SN: 0.45, MR: 0.7, NG: 0.5 };
  const TREND = {
    stunting: { annual: -0.55, vol: 0.30, shocks: [] },
    wasting: { annual: -0.06, vol: 0.55, shocks: [[2005, 2.2], [2012, 2.8], [2021, 1.6]], sahel: true },
    underweight: { annual: -0.36, vol: 0.30, shocks: [] },
    overweight: { annual: 0.07, vol: 0.18, shocks: [] },
    anaemia: { annual: -0.13, vol: 0.45, shocks: [[2012, 2.4], [2021, 1.4]], sahel: true },
    ebf: { annual: 0.85, vol: 0.55, shocks: [] },
    minDiet: { annual: 0.52, vol: 0.60, shocks: [[2021, -2.2]] },
    lbw: { annual: -0.06, vol: 0.22, shocks: [] },
    matAnaemia: { annual: -0.10, vol: 0.40, shocks: [[2012, 1.8]] }
  };
  const FIRST_YEAR = 2000, LAST_YEAR = 2026;

  function anchor(code) {
    const a = ANCHOR[String(code || '').toUpperCase()] || ANCHOR.default;
    /* réconciliation avec le fichier historique si présent */
    const legacy = global.demoCountryMetrics && global.demoCountryMetrics[String(code || '').toUpperCase()];
    if (legacy) {
      const out = {}; for (const k in a) out[k] = a[k];
      ['stunting', 'wasting', 'anaemia', 'ebf', 'overweight'].forEach((k) => { if (legacy[k] != null) out[k] = legacy[k]; });
      if (legacy.children != null) out.monitored = legacy.children;
      return out;
    }
    return a;
  }
  function countryName(code) { return NAMES[String(code || '').toUpperCase()] || (fr() ? 'Pays sélectionné' : 'Selected country'); }
  function countryCodes() { return COUNTRY_LIST.map((c) => c[0]); }

  /* RNG normal (Box-Muller) à partir du générateur du noyau */
  function normalOf(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng.next();
    while (v === 0) v = rng.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* série annuelle reconstruite 2000 → 2026, ancrée sur la valeur courante */
  const SERIES_CACHE = {};
  function seriesFor(code, indId, years) {
    const c = String(code || 'TG').toUpperCase();
    const scoped = c === String(State.country).toUpperCase() && State.mounted;
    const k = c + '|' + indId + '|' + (years || LAST_YEAR) + (scoped ? '|' + scopeKey() : '');
    if (SERIES_CACHE[k]) return SERIES_CACHE[k];
    const a = scoped ? effAnchor() : anchor(c);
    const ind = IND_BY_ID[indId] || INDICATORS[0], tr = TREND[indId] || { annual: 0, vol: 0.3 };
    const end = U.num(a[indId], 20);
    const rng = RNG('uni-series-' + c + '-' + indId);
    const pf = 0.55 + 0.85 * U.num(a.prog, 0.6);                 /* avance programmatique */
    const yrs = [];
    for (let y = FIRST_YEAR; y <= (years || LAST_YEAR); y++) yrs.push(y);
    const n = yrs.length;
    let noise = 0;
    const raw = yrs.map((y, i) => {
      const back = LAST_YEAR - y;                                  /* années avant l'ancrage */
      let v = end + (-tr.annual) * back * pf;                      /* tendance inversée vers le passé */
      noise = noise * 0.62 + normalOf(rng) * (tr.vol || 0.3);       /* bruit autorégressif */
      v += noise;
      if (tr.shocks && tr.shocks.length) {
        tr.shocks.forEach((sh) => {
          const amp = sh[1] * (tr.sahel ? (U.num(SAHEL[c], 0.3)) : 0.55) * (ind.good === 'up' ? -1 : 1);
          const d = y - sh[0];
          if (d >= 0 && d <= 2) v += amp * Math.exp(-d * 0.85);      /* pic puis résorption */
        });
      }
      /* bornes plausibles */
      const lo = ind.good === 'up' ? 4 : 0.4, hi = ind.good === 'up' ? 92 : 62;
      return U.clamp(v, lo, hi);
    });
    /* correction affine : la série se termine exactement sur l'ancrage */
    const last = raw[n - 1];
    const corr = end - last;
    const vals = raw.map((v, i) => U.round(v + corr * (i / Math.max(1, n - 1)), 1));
    vals[n - 1] = U.round(end, 1);
    const out = { years: yrs, values: vals, anchor: end, indicator: indId, country: c };
    SERIES_CACHE[k] = out;
    return out;
  }

  /* ---------------------------------------------------------------- districts */
  const REGIONS = {
    TG: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes', 'Golfe', 'Zio', 'Haho', 'Tchaoudjo', 'Kpendjal', 'Oti', 'Blitta'],
    GH: ['Greater Accra', 'Ashanti', 'Northern', 'Savannah', 'Volta', 'Western', 'Eastern', 'Bono', 'Upper East', 'Upper West', 'Central', 'Oti'],
    SN: ['Dakar', 'Thiès', 'Diourbel', 'Kaolack', 'Ziguinchor', 'Saint-Louis', 'Matam', 'Kolda', 'Tambacounda', 'Louga', 'Fatick', 'Kédougou'],
    NG: ['Kano', 'Lagos', 'Borno', 'Sokoto', 'Kaduna', 'Yobe', 'Niger', 'Bauchi', 'Jigawa', 'Katsina', 'Rivers', 'Benue'],
    BF: ['Centre', 'Nord', 'Sahel', 'Est', 'Hauts-Bassins', 'Boucle du Mouhoun', 'Cascades', 'Plateau-Central', 'Centre-Nord', 'Sud-Ouest', 'Kadiogo', 'Oudalan'],
    CI: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'Man', 'Daloa', 'San-Pédro', 'Abengourou', 'Bondoukou', 'Gagnoa', 'Odienné', 'Séguéla'],
    generic: ['Nord', 'Sud', 'Est', 'Ouest', 'Centre', 'Littoral', 'Plateau', 'Vallée', 'Hauts-Plateaux', 'Capitale', 'Péri-urbain', 'Zone sahélienne']
  };
  const DISTRICT_CACHE = {};
  function districts(code) {
    const c = String(code || 'TG').toUpperCase();
    if (DISTRICT_CACHE[c]) return DISTRICT_CACHE[c];
    const a = anchor(c), names = REGIONS[c] || REGIONS.generic, rng = RNG('uni-dist-' + c);
    const u5Total = U.num(a.u5, 3) * 1e6;
    const w = names.map(() => 0.55 + rng.next());
    const wSum = S.sum(w) || 1;
    const list = names.map((nm, i) => {
      const share = w[i] / wSum;
      const rural = U.clamp(U.num(a.urban, 45) + (normalOf(rng) * 22), 8, 96);
      const mult = {};
      IND_IDS.forEach((k) => {
        const ind = IND_BY_ID[k];
        const bias = ind.good === 'up' ? (rural - 50) / 260 : (rural - 50) / 165;
        mult[k] = U.clamp(1 + normalOf(rng) * 0.19 + bias, 0.62, 1.55);
      });
      const vals = {};
      IND_IDS.forEach((k) => {
        const ind = IND_BY_ID[k];
        const base = U.num(a[k], 20) * mult[k];
        vals[k] = U.round(ind.good === 'up' ? U.clamp(base, 4, 94) : U.clamp(base, 0.4, 64), 1);
      });
      return {
        name: nm, share: share, u5: Math.round(u5Total * share), rural: U.round(rural, 0),
        vals: vals, coverage: U.round(U.clamp(0.38 + U.num(a.prog, 0.6) * 0.5 + normalOf(rng) * 0.11, 0.2, 0.98), 2),
        lastSurvey: 2019 + Math.floor(rng.next() * 7),
        trend: U.round(normalOf(rng) * 0.9 - (U.num(a.prog, 0.6) - 0.5) * 1.4, 2)
      };
    });
    /* indice de risque composite (0-100) : charge + mauvaises pratiques + faible couverture */
    list.forEach((d) => {
      const z = (k, inv) => {
        const arr = list.map((x) => x.vals[k]);
        const mn = S.min(arr), mx = S.max(arr);
        const f = mx > mn ? (d.vals[k] - mn) / (mx - mn) : 0.5;
        return inv ? 1 - f : f;
      };
      d.risk = U.round(U.clamp(0.34 * z('stunting') + 0.26 * z('wasting') + 0.18 * z('anaemia') + 0.12 * z('ebf', true) + 0.10 * z('minDiet', true) + 0.08 * (1 - d.coverage), 0, 1) * 100, 1);
      d.stunted = Math.round(d.u5 * d.vals.stunting / 100);
      d.wasted = Math.round(d.u5 * d.vals.wasting / 100);
    });
    DISTRICT_CACHE[c] = list;
    return list;
  }

  /* -------------------------------------------------------------------- état */
  const store = NV.store.ns('unicef');
  const DEFAULT_LEVERS = { ebf: 25, iyfc: 20, sam: 35, mnp: 15, ifa: 30, fort: 40, wash: 15, cash: 10, csc: 25 };
  const PRESETS = {
    bau: { budget: 12e6, quality: 72, equity: 50, levers: { ebf: 12, iyfc: 8, sam: 22, mnp: 6, ifa: 18, fort: 22, wash: 6, cash: 4, csc: 10 } },
    accelerated: { budget: 48e6, quality: 82, equity: 74, levers: { ebf: 55, iyfc: 45, sam: 70, mnp: 40, ifa: 62, fort: 68, wash: 38, cash: 26, csc: 58 } },
    max: { budget: 120e6, quality: 92, equity: 88, levers: { ebf: 85, iyfc: 75, sam: 90, mnp: 78, ifa: 85, fort: 95, wash: 70, cash: 50, csc: 85 } },
    austerity: { budget: 7e6, quality: 62, equity: 40, levers: { ebf: 8, iyfc: 5, sam: 18, mnp: 4, ifa: 12, fort: 18, wash: 3, cash: 2, csc: 6 } }
  };
  const State = {
    mounted: false, country: 'TG', level: 'National', year: 2026,
    indicator: 'stunting', horizon: 8, trials: 3000, scenario: 'accelerated',
    budget: 48e6, quality: 82, equityPct: 74, levers: Object.assign({}, PRESETS.accelerated.levers),
    focusDistrict: null, gisLayer: 'stunting', charts: {}, pipes: {}, live: true, tick: 0,
    lastForecast: null, lastSim: null
  };
  function restore() {
    try {
      const sv = store.get('state');
      if (sv && typeof sv === 'object') {
        ['country', 'level', 'year', 'indicator', 'horizon', 'trials', 'scenario', 'budget', 'quality', 'equityPct', 'gisLayer', 'focusDistrict'].forEach((k) => { if (sv[k] != null) State[k] = sv[k]; });
        if (sv.levers) State.levers = Object.assign({}, PRESETS.accelerated.levers, sv.levers);
      }
    } catch (e) { }
  }
  function persist() {
    try {
      store.set('state', {
        country: State.country, level: State.level, year: State.year, indicator: State.indicator,
        horizon: State.horizon, trials: State.trials, scenario: State.scenario, budget: State.budget,
        quality: State.quality, equityPct: State.equityPct, gisLayer: State.gisLayer,
        focusDistrict: State.focusDistrict, levers: State.levers
      });
    } catch (e) { }
  }

  /* ==========================================================================
     2. PROGRAMMES : tailles d'effet (illustratives, inspirées de la littérature
        nutritionnelle — Lancet Nutrition Series, OMS, Alive & Thrive) et coûts
        unitaires. Chaque effet porte un intervalle de confiance à 95 % : il est
        re-tiré à chaque trajectoire Monte-Carlo.
     ====================================================================== */
  const PROGRAMMES = [
    { id: 'ebf', icon: '🤱', costPerChild: 3.5, maxCoverage: 0.85, lag: 1, reach: 0.62, effects: { stunting: [0.10, 0.06, 0.15], wasting: [0.05, 0.02, 0.08], anaemia: [0.03, 0.01, 0.06], minDiet: [0.07, 0.03, 0.11] } },
    { id: 'iyfc', icon: '🥣', costPerChild: 6.0, maxCoverage: 0.75, lag: 1, reach: 0.55, effects: { stunting: [0.14, 0.08, 0.20], wasting: [0.09, 0.04, 0.14], anaemia: [0.05, 0.02, 0.09], minDiet: [0.16, 0.09, 0.23] } },
    { id: 'sam', icon: '🚑', costPerChild: 52, maxCoverage: 0.90, lag: 0, reach: 0.12, effects: { wasting: [0.34, 0.24, 0.44], underweight: [0.10, 0.05, 0.16] } },
    { id: 'mnp', icon: '💊', costPerChild: 4.2, maxCoverage: 0.80, lag: 1, reach: 0.48, effects: { anaemia: [0.28, 0.19, 0.37], stunting: [0.04, 0.01, 0.08], matAnaemia: [0.05, 0.02, 0.09] } },
    { id: 'ifa', icon: '🤰', costPerChild: 2.1, maxCoverage: 0.85, lag: 2, reach: 0.70, effects: { matAnaemia: [0.30, 0.22, 0.38], lbw: [0.08, 0.04, 0.13], anaemia: [0.06, 0.02, 0.10], stunting: [0.03, 0.01, 0.06] } },
    { id: 'fort', icon: '🌾', costPerChild: 0.6, maxCoverage: 0.95, lag: 2, reach: 0.92, effects: { anaemia: [0.18, 0.11, 0.26], matAnaemia: [0.14, 0.08, 0.21] } },
    { id: 'wash', icon: '🚰', costPerChild: 11, maxCoverage: 0.70, lag: 3, reach: 0.80, effects: { stunting: [0.07, 0.02, 0.12], wasting: [0.05, 0.01, 0.09] } },
    { id: 'cash', icon: '💵', costPerChild: 26, maxCoverage: 0.50, lag: 2, reach: 0.45, effects: { stunting: [0.06, 0.02, 0.10], wasting: [0.06, 0.02, 0.10], minDiet: [0.09, 0.04, 0.15], lbw: [0.04, 0.01, 0.08] } },
    { id: 'csc', icon: '🏥', costPerChild: 8.5, maxCoverage: 0.80, lag: 2, reach: 0.68, effects: { stunting: [0.05, 0.02, 0.09], wasting: [0.08, 0.03, 0.13], anaemia: [0.04, 0.01, 0.07] } }
  ];
  const PROG_BY_ID = {}; PROGRAMMES.forEach((p) => { PROG_BY_ID[p.id] = p; });

  /* ==========================================================================
     3. MOTEUR — prévision, simulation d'interventions, points chauds, alertes
     ====================================================================== */
  function indLabel(id, short) { return t(short ? 'uni.ind.short.' + id : 'uni.ind.' + id); }
  function progLabel(id) { return t('uni.prog.' + id); }
  function progHint(id) { return t('uni.prog.hint.' + id); }
  function progIcon(id) { return (PROG_BY_ID[id] || {}).icon || '•'; }

  /* dérive de politique publique (points de pourcentage / an) par scénario */
  const SCEN = {
    bau: { stunting: 0, wasting: 0, underweight: 0, overweight: 0, anaemia: 0, ebf: 0, minDiet: 0, lbw: 0, matAnaemia: 0 },
    accelerated: { stunting: -0.85, wasting: -0.28, underweight: -0.62, overweight: -0.06, anaemia: -0.72, ebf: 0.95, minDiet: 0.85, lbw: -0.12, matAnaemia: -0.70 },
    max: { stunting: -1.45, wasting: -0.52, underweight: -1.05, overweight: -0.10, anaemia: -1.20, ebf: 1.40, minDiet: 1.30, lbw: -0.22, matAnaemia: -1.15 },
    austerity: { stunting: 0.42, wasting: 0.18, underweight: 0.30, overweight: 0.05, anaemia: 0.30, ebf: -0.28, minDiet: -0.34, lbw: 0.06, matAnaemia: 0.28 }
  };
  function scenarioDrift(indId, scenario) {
    const s = SCEN[scenario] || SCEN.bau;
    return U.num(s[indId], 0);
  }
  function yearLabels(H, fromYear) {
    const out = [], y0 = fromYear || LAST_YEAR;
    for (let i = 1; i <= H; i++) out.push(String(y0 + i));
    return out;
  }

  /* cache des prévisions d'ensemble */
  const FC_CACHE = {};
  function fcKey(code, indId, H, drift, trials) { return [code, indId, H, U.round(drift, 4), trials].join('|'); }
  function forecastInd(code, indId, H, opt) {
    const o = opt || {};
    const c = String(code || State.country).toUpperCase();
    const horizon = U.clamp(U.num(H, 8) | 0, 2, 20);
    const trials = U.clamp(U.num(o.trials, State.trials) | 0, 200, 8000);
    const drift = U.num(o.drift, 0);
    const k = fcKey(c, indId, horizon, drift, trials) + (c === String(State.country).toUpperCase() ? '|' + scopeKey() : '');
    if (FC_CACHE[k]) return FC_CACHE[k];
    const ser = seriesFor(c, indId);
    const ind = IND_BY_ID[indId] || INDICATORS[0];
    const fc = S.ensembleForecast(ser.values, horizon, {
      seed: 'uni-fc-' + c + '-' + indId + '-' + drift,
      trials: trials,
      drift: drift,
      driftSd: 0.06 * Math.abs(drift || 0.35),
      rho: 0.55,
      btHorizon: 3
    });
    const out = {
      fc: fc, country: c, indicator: indId, ind: ind, horizon: horizon, trials: trials, drift: drift,
      years: ser.years, past: ser.values, labels: ser.years.map(String).concat(yearLabels(horizon)),
      futureLabels: yearLabels(horizon)
    };
    FC_CACHE[k] = out;
    return out;
  }

  /* charge de morbidité (nombre de cas) par indicateur */
  function burden(code) {
    const a = scopeAnchor(code), u5 = U.num(a.u5, 3) * 1e6, out = {};
    IND_IDS.forEach((k) => {
      const ind = IND_BY_ID[k];
      const prev = U.num(a[k], 0) / 100;
      out[k] = { prevalence: U.num(a[k], 0), cases: Math.round(u5 * (ind.good === 'up' ? (1 - prev) : prev)), good: ind.good };
    });
    out.u5 = u5;
    return out;
  }

  /* indice de risque composite national (0-100) */
  function compositeRisk(code) {
    const a = scopeAnchor(code);
    const comp = [
      [U.clamp(U.num(a.stunting, 20) / 50, 0, 1), 0.30],
      [U.clamp(U.num(a.wasting, 6) / 15, 0, 1), 0.22],
      [U.clamp(U.num(a.anaemia, 42) / 60, 0, 1), 0.18],
      [U.clamp(1 - U.num(a.ebf, 50) / 80, 0, 1), 0.12],
      [U.clamp(1 - U.num(a.minDiet, 25) / 60, 0, 1), 0.10],
      [U.clamp(U.num(a.matAnaemia, 42) / 60, 0, 1), 0.08]
    ];
    return U.round(100 * comp.reduce((s, x) => s + x[0] * x[1], 0), 1);
  }

  /* --------------------------------------------------------------------------
     SIMULATEUR D'INTERVENTIONS
     couverture → effet → cas évités → DALY → coût / DALY → ROI
     Incertitude : tailles d'effet re-tirées par trajectoire (IC 95 %), glissement
     de couverture, et trajectoire de référence tirée parmi les chemins Monte-Carlo.
     ----------------------------------------------------------------------- */
  const SIM_CACHE = {};
  const SIM_TRIALS = 800;   /* même horizon & mêmes essais partout → cache partagé */
  function simulate(opt) {
    const o = opt || {};
    const code = String(o.country || State.country).toUpperCase();
    const H = U.clamp(U.num(o.horizon, State.horizon) | 0, 2, 15);
    const trials = U.clamp(U.num(o.trials, 1200) | 0, 200, 4000);
    const levers = o.levers || State.levers;
    const quality = U.clamp(U.num(o.quality, State.quality), 20, 100) / 100;
    const equityPct = U.clamp(U.num(o.equityPct, State.equityPct), 0, 100) / 100;
    const budget = U.num(o.budget, State.budget);
    const ck = [code, H, trials, quality, equityPct, budget, JSON.stringify(levers), scopeKey()].join('|');
    if (SIM_CACHE[ck]) return SIM_CACHE[ck];
    const t0 = Date.now();
    const a = scopeAnchor(code), u5 = U.num(a.u5, 3) * 1e6, gdp = U.num(a.gdp, 1300);
    const rng = RNG('uni-sim-' + code + '-' + H + '-' + U.hash(JSON.stringify(levers) + scopeKey()));

    /* 1) couverture effective, coût annuel et contrainte budgétaire */
    const progs = PROGRAMMES.map((p) => {
      const raw = U.clamp(U.num(levers[p.id], 0), 0, 100) / 100;
      const cov = Math.min(raw, p.maxCoverage);
      const reach = u5 * p.reach * cov;
      return { p: p, raw: raw, cov: cov, reach: reach, cost: reach * p.costPerChild };
    }).filter((x) => x.cov > 0);
    const annualCost0 = S.sum(progs.map((x) => x.cost));
    const scale = budget > 0 && annualCost0 > budget ? budget / annualCost0 : 1;
    progs.forEach((x) => {
      x.covEff = x.cov * scale;
      x.reachEff = u5 * x.p.reach * x.covEff;
      x.costEff = x.reachEff * x.p.costPerChild;
      /* effet effectif : couverture × qualité de mise en œuvre, rendements décroissants */
      x.eff = Math.pow(U.clamp(x.covEff * (0.55 + 0.45 * quality), 0, 1), 0.85);
    });
    const annualCost = S.sum(progs.map((x) => x.costEff));
    const totalCost = annualCost * H;
    const reached = Math.round(Math.max.apply(null, progs.map((x) => x.reachEff).concat([0])));

    /* 2) trajectoires de référence par indicateur (sans action additionnelle) */
    const base = {};
    IND_IDS.forEach((k) => {
      const f = forecastInd(code, k, H, { trials: SIM_TRIALS, drift: 0 });
      base[k] = f;
    });

    /* 3) Monte-Carlo : effet par indicateur et par année */
    const sigmaOf = (ci) => Math.max(1e-4, (ci[2] - ci[1]) / (2 * 1.96) / Math.max(1e-3, ci[0]));
    const perInd = {};
    IND_IDS.forEach((k) => { perInd[k] = { delta: [], endBase: [], endInt: [], byYearBase: [], byYearInt: [] }; });
    /* pré-tirage des chemins de référence (sous-échantillonnage des paths) */
    const pathOf = (k, i) => {
      const b = base[k], paths = (b.fc.paths && b.fc.paths.length) ? b.fc.paths : null;
      if (!paths) return b.fc.point;
      return paths[i % paths.length];
    };
    /* accumulation annuelle : base vs intervention */
    const acc = {};
    IND_IDS.forEach((k) => { acc[k] = { sumBase: [], sumInt: [], daly: 0, cases: 0 }; });
    for (let tr = 0; tr < trials; tr++) {
      /* effet re-tiré pour cette trajectoire */
      const eff = progs.map((x) => {
        const slip = 0.90 + 0.20 * rng.next();
        const out = { x: x, eff: U.clamp(x.eff * slip, 0, 1), t: {} };
        for (const k in x.p.effects) {
          const ci = x.p.effects[k], sig = sigmaOf(ci);
          out.t[k] = U.clamp(ci[0] * Math.exp(normalOf(rng) * sig * 0.85), ci[1] * 0.8, ci[2] * 1.2);
        }
        return out;
      });
      for (let y = 0; y < H; y++) {
        /* facteur de montée en charge : délai programmatique puis effet plein */
        const ramp = {};
        eff.forEach((e) => { ramp[e.x.p.id] = U.clamp((y + 1 - e.x.p.lag) / 2.2, 0, 1); });
        IND_IDS.forEach((k) => {
          const bp = pathOf(k, tr);
          const b = U.num(bp[y], base[k].fc.point[y]);
          let rr = 1;
          eff.forEach((e) => {
            const tk = e.t[k];
            if (tk != null && ramp[e.x.p.id] > 0) rr *= (1 - tk * e.eff * ramp[e.x.p.id]);
          });
          /* correction d'empilement : les effets ne sont pas parfaitement additifs */
          rr = 1 - (1 - rr) * 0.92;
          const iv = Math.max(0, b * rr);
          const dPrev = b - iv;
          const cases = Math.max(0, dPrev / 100 * u5);
          if (y === H - 1) { perInd[k].delta.push(dPrev); perInd[k].endBase.push(b); perInd[k].endInt.push(iv); }
          (perInd[k].byYearBase[y] = perInd[k].byYearBase[y] || []).push(b);
          (perInd[k].byYearInt[y] = perInd[k].byYearInt[y] || []).push(iv);
          acc[k].sumBase[y] = (acc[k].sumBase[y] || 0) + b;
          acc[k].sumInt[y] = (acc[k].sumInt[y] || 0) + iv;
          acc[k].daly += cases * U.num(IND_BY_ID[k].daly, 0.05);
          acc[k].cases += cases;
        });
      }
    }
    /* 4) synthèse par indicateur */
    const outInd = {};
    IND_IDS.forEach((k) => {
      const ind = IND_BY_ID[k], f = base[k];
      const meanBase = (acc[k].sumBase || []).map((v, y) => v / trials);
      const meanInt = (acc[k].sumInt || []).map((v, y) => v / trials);
      const dSorted = S.sorted(perInd[k].delta);
      const dP50 = S.quantile(dSorted, 0.5), dP10 = S.quantile(dSorted, 0.1), dP90 = S.quantile(dSorted, 0.9);
      const casesAvg = acc[k].cases / trials, dalyAvg = acc[k].daly / trials;
      const last = U.num(f.past[f.past.length - 1], 0);
      /* année d'atteinte de la cible mondiale (réduction relative vs 2012 ≈ ancrage 2026) */
      let targetYear = null;
      if (ind.target2030) {
        const tgt = ind.good === 'up' ? last * ind.target2030 : last * ind.target2030;
        for (let y = 0; y < meanInt.length; y++) {
          const hit = ind.good === 'up' ? meanInt[y] >= tgt : meanInt[y] <= tgt;
          if (hit) { targetYear = LAST_YEAR + y + 1; break; }
        }
      }
      outInd[k] = {
        id: k, ind: ind, label: indLabel(k),
        baseline: meanBase, intervention: meanInt,
        past: f.past, years: f.years, futureLabels: f.futureLabels,
        p10: meanInt.map((v, y) => Math.max(0, S.quantile(S.sorted(perInd[k].byYearInt[y] || [v]), 0.1))),
        p90: meanInt.map((v, y) => S.quantile(S.sorted(perInd[k].byYearInt[y] || [v]), 0.9)),
        baseP10: meanBase.map((v, y) => Math.max(0, S.quantile(S.sorted(perInd[k].byYearBase[y] || [v]), 0.1))),
        baseP90: meanBase.map((v, y) => S.quantile(S.sorted(perInd[k].byYearBase[y] || [v]), 0.9)),
        delta: { p10: dP10, p50: dP50, p90: dP90 },
        deltaRel: last ? dP50 / last : 0,
        casesAverted: Math.round(casesAvg), daly: dalyAvg,
        targetYear: targetYear, endBase: S.quantile(S.sorted(perInd[k].endBase), 0.5),
        endInt: S.quantile(S.sorted(perInd[k].endInt), 0.5)
      };
    });

    /* 5) tableau des programmes : coût, effet principal, coût / DALY, priorité */
    const totDaly = IND_IDS.reduce((s, k) => s + outInd[k].daly, 0);
    const rows = progs.map((x) => {
      const keys = Object.keys(x.p.effects);
      const main = keys.slice().sort((p, q) => x.p.effects[q][0] - x.p.effects[p][0])[0];
      const share = keys.reduce((s, k) => s + x.p.effects[k][0], 0) || 1;
      /* attribution du DALY au prorata de la taille d'effet × effet effective */
      const w = share * x.eff;
      const dalyAttr = totDaly ? totDaly * (w / (progs.reduce((s, y) => s + Object.keys(y.p.effects).reduce((a, k) => a + y.p.effects[k][0], 0) * y.eff, 0) || 1)) : 0;
      return {
        id: x.p.id, label: progLabel(x.p.id), icon: x.p.icon,
        coverage: x.covEff, rawCoverage: x.raw, capped: x.raw > x.p.maxCoverage,
        reach: Math.round(x.reachEff), cost: x.costEff * H, annual: x.costEff,
        main: main, mainLabel: indLabel(main, true), effect: x.p.effects[main][0] * x.eff,
        daly: dalyAttr, costDaly: dalyAttr > 0 ? (x.costEff * H) / dalyAttr : null,
        lag: x.p.lag, maxCoverage: x.p.maxCoverage
      };
    }).sort((p, q) => (p.costDaly == null ? 1e12 : p.costDaly) - (q.costDaly == null ? 1e12 : q.costDaly));
    rows.forEach((r, i) => { r.priority = i + 1; });

    const costDaly = totDaly > 0 ? totalCost / totDaly : null;
    const ratio = costDaly == null ? null : costDaly / gdp;
    const out = {
      country: code, horizon: H, trials: trials, budget: budget, quality: quality, equity: equityPct,
      levers: Object.assign({}, levers), scale: scale, overBudget: scale < 1,
      annualCost: annualCost, totalCost: totalCost, reached: reached,
      indicators: outInd, programmes: rows,
      totals: {
        daly: totDaly,
        cases: IND_IDS.reduce((s, k) => s + outInd[k].casesAverted, 0),
        costDaly: costDaly, ratioGdp: ratio,
        roi: totalCost > 0 ? (totDaly * gdp) / totalCost : 0,
        verdict: ratio == null ? null : (ratio < 1 ? 'veryCE' : ratio < 3 ? 'ce' : 'notCE')
      },
      gdp: gdp, u5: u5, ms: Date.now() - t0
    };
    SIM_CACHE[ck] = out;
    return out;
  }

  /* ---------------------------------------------------------------- hotspots */
  function hotspots(code) {
    const list = districts(code).slice().sort((a, b) => b.risk - a.risk);
    return list.map((d, i) => {
      d.rank = i + 1;
      d.tone = d.risk >= 66 ? 'risk' : d.risk >= 44 ? 'warn' : d.risk >= 26 ? 'ok' : 'good';
      return d;
    });
  }

  /* ------------------------------------------------------------ alerte précoce */
  const ACTIONS = {
    stunting: 'iyfc', wasting: 'sam', anaemia: 'fort', ebf: 'ebf', minDiet: 'iyfc',
    lbw: 'ifa', matAnaemia: 'ifa', underweight: 'csc', overweight: 'cash'
  };
  function warningList(code, H) {
    const horizon = U.clamp(U.num(H, 8) | 0, 2, 15);
    const out = [];
    IND_IDS.forEach((k) => {
      const ind = IND_BY_ID[k], f = forecastInd(code, k, horizon, { trials: SIM_TRIALS, drift: 0 });
      const paths = (f.fc.paths && f.fc.paths.length) ? f.fc.paths : null;
      const thr = ind.good === 'up' ? ind.risk : ind.risk;    /* seuil « risque » OMS */
      let pBreach = 0, breachYears = [];
      if (paths) {
        paths.forEach((p) => {
          for (let y = 0; y < p.length; y++) {
            const bad = ind.good === 'up' ? p[y] <= thr : p[y] >= thr;
            if (bad) { breachYears.push(LAST_YEAR + y + 1); pBreach++; break; }
          }
        });
        pBreach /= paths.length;
      } else {
        const bad = ind.good === 'up' ? f.fc.point[horizon - 1] <= thr : f.fc.point[horizon - 1] >= thr;
        pBreach = bad ? 1 : 0;
      }
      const byYear = {};
      breachYears.forEach((y) => { byYear[y] = (byYear[y] || 0) + 1; });
      const ks = Object.keys(byYear).map(Number).sort((a, b) => a - b);
      let med = null;
      if (ks.length) { let cum = 0; for (let i = 0; i < ks.length; i++) { cum += byYear[ks[i]]; if (cum >= breachYears.length / 2) { med = ks[i]; break; } } }
      const cur = U.num(scopeAnchor(code)[k], 0);
      const already = ind.good === 'up' ? cur <= ind.risk : cur >= ind.risk;
      const severity = already || pBreach >= 0.6 ? 'critical' : pBreach >= 0.3 ? 'high' : pBreach >= 0.1 ? 'moderate' : 'low';
      out.push({
        id: k, label: indLabel(k), icon: ind.icon, threshold: thr, current: cur,
        pBreach: pBreach, breachYear: med, severity: severity, already: already,
        action: ACTIONS[k] || 'csc', tone: severity === 'critical' ? 'risk' : severity === 'high' ? 'warn' : severity === 'moderate' ? 'info' : 'good'
      });
    });
    const rank = { critical: 0, high: 1, moderate: 2, low: 3 };
    return out.sort((a, b) => (rank[a.severity] - rank[b.severity]) || (b.pBreach - a.pBreach));
  }

  /* anomalies historiques (chocs détectés sur la série) */
  function shocksFor(code, indId) {
    const s = seriesFor(code, indId);
    return S.anomalies(s.values, { threshold: 2.2 }).map((x) => ({ year: s.years[x.index], value: x.value, z: x.z }));
  }

  /* ------------------------------------------------------------------ équité */
  function equityStats(code) {
    const a = scopeAnchor(code), list = districts(code);
    const k = State.indicator, ind = IND_BY_ID[k];
    const byRural = list.map((d) => ({ v: d.vals[k], rural: d.rural, u5: d.u5 }));
    const ruralW = byRural.filter((x) => x.rural >= 55), urbanW = byRural.filter((x) => x.rural < 45);
    const wavg = (arr) => { const n = S.sum(arr.map((x) => x.u5)) || 1; return S.sum(arr.map((x) => x.v * x.u5)) / n; };
    const rural = ruralW.length ? wavg(ruralW) : U.num(a[k], 0) * 1.18;
    const urban = urbanW.length ? wavg(urbanW) : U.num(a[k], 0) * 0.82;
    const values = list.map((d) => d.vals[k]).sort((x, y) => x - y);
    const p10 = S.quantile(values, 0.1), p90 = S.quantile(values, 0.9);
    /* quintiles de richesse : gradient modélisé depuis la dispersion des districts */
    const disp = (U.num(a[k], 1) || 1);
    const q1 = disp * (1 + 0.34 * (1 - U.num(a.prog, 0.6))), q5 = disp * (1 - 0.28 * U.num(a.prog, 0.6));
    const burdenArr = list.map((d) => d.u5 * (ind.good === 'up' ? (100 - d.vals[k]) : d.vals[k]) / 100);
    const total = S.sum(burdenArr) || 1;
    const shares = burdenArr.map((b) => b / total).sort((x, y) => x - y);
    let gini = 0;
    shares.forEach((s, i) => { gini += (2 * (i + 1) - shares.length - 1) * s; });
    gini = Math.abs(gini / shares.length);
    return {
      indicator: k, rural: rural, urban: urban, ratioRuralUrban: urban ? rural / urban : 1,
      q1: q1, q5: q5, ratioQuintile: q5 ? q1 / q5 : 1,
      p10: p10, p90: p90, dispersion: p10 ? p90 / p10 : 1,
      gini: gini, urbanShare: U.num(a.urban, 45)
    };
  }

  /* -------------------------------------------------------- qualité des données */
  const SOURCES = [
    { id: 'dhs', label: 'DHS (Demographic & Health Survey)', cycle: 5 },
    { id: 'mics', label: 'MICS (Multiple Indicator Cluster Survey)', cycle: 4 },
    { id: 'smart', label: 'SMART nutrition survey', cycle: 2 },
    { id: 'hmis', label: 'Routine HMIS / nutrition reporting', cycle: 1 },
    { id: 'crvs', label: 'Civil registration & vital statistics', cycle: 1 }
  ];
  function dataQuality(code) {
    const a = anchor(code), rng = RNG('uni-dq-' + code), prog = U.num(a.prog, 0.6);
    return INDICATORS.map((ind) => {
      const src = /wasting/.test(ind.id) ? SOURCES[2] : (/lbw/.test(ind.id) ? SOURCES[4] : (rng.next() > 0.5 ? SOURCES[0] : SOURCES[1]));
      const completeness = U.round(U.clamp(0.48 + prog * 0.42 + normalOf(rng) * 0.07, 0.25, 0.99), 2);
      const timeliness = U.round(U.clamp(0.42 + prog * 0.45 + normalOf(rng) * 0.09, 0.2, 0.99), 2);
      const conf = U.round(U.clamp(0.55 * completeness + 0.30 * timeliness + 0.15 * (0.5 + prog / 2), 0.2, 0.99), 2);
      const last = LAST_YEAR - Math.round((1 - timeliness) * src.cycle * 1.6);
      return { id: ind.id, label: indLabel(ind.id), icon: ind.icon, source: src, lastRound: last, completeness: completeness, timeliness: timeliness, confidence: conf, tone: conf >= 0.8 ? 'good' : conf >= 0.62 ? 'ok' : conf >= 0.45 ? 'warn' : 'risk' };
    });
  }
  function readiness(code) {
    const dq = dataQuality(code);
    return U.round(100 * S.mean(dq.map((x) => x.confidence)), 0);
  }

  /* ==========================================================================
     4. CONSTRUCTEURS HTML (classes du design system NutriVision réutilisées)
     ====================================================================== */
  let root = null;
  const refs = {};

  function sel(id, options, value, label) {
    return '<label class="nv-field"><span>' + U.esc(label) + '</span>' +
      '<select class="nv-select" id="' + id + '">' + options.map((o) =>
        '<option value="' + U.esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + U.esc(o[1]) + '</option>').join('') +
      '</select></label>';
  }
  function countryOptions() {
    const codes = countryCodes();
    return codes.map((c) => [c, NAMES[c]]);
  }
  function indicatorOptions() { return INDICATORS.map((x) => [x.id, x.icon + ' ' + indLabel(x.id)]); }
  function scenarioOptions() {
    return ['bau', 'accelerated', 'max', 'austerity'].map((s) => [s, t('uni.sim.preset.' + s)]);
  }

  /* ---------------------------------------------------------------- 1. hero */
  function htmlHero() {
    return '' +
      '<div class="nv-hero-grid">' +
        '<div class="nv-hero-id">' +
          UI.avatar('UN', { ring: true, color: TH.tones.info }) +
          '<div class="nv-hero-idtext">' +
            '<span class="nv-pill">' + U.esc(t('uni.badge')) + '</span>' +
            '<h1>🧒 ' + U.esc(fr() ? 'Cockpit nutrition enfant & mère' : 'Child & Maternal Nutrition Cockpit') + '</h1>' +
            '<p class="nv-sub">' + U.esc(t('uni.hero.sub')) + '</p>' +
            '<div class="nv-row nv-hero-chips" id="uniHeroChips"></div>' +
          '</div>' +
        '</div>' +
        '<div class="nv-hero-score">' +
          '<div class="nv-chart-host" data-chart="uniRisk" style="height:188px"></div>' +
          '<div class="nv-hero-scoremeta"><span id="uniRiskBand" class="nv-chip nv-chip-warn">—</span>' +
          '<span class="nv-note" id="uniRiskNote">—</span></div>' +
        '</div>' +
        '<div class="nv-hero-side">' +
          '<div class="nv-hero-kpis" id="uniHeroKpis"></div>' +
          '<div class="nv-row nv-hero-actions">' +
            UI.btn(t('uni.fc.run'), { kind: 'primary', action: 'uni-run-forecast', icon: '🚀' }) +
            UI.btn(t('uni.sim.run'), { action: 'uni-run-sim', icon: '🧪' }) +
            UI.btn(t('uni.exp.report'), { action: 'uni-report', icon: '📄' }) +
            UI.btn(fr() ? 'Actualiser' : 'Refresh', { kind: 'ghost', action: 'uni-refresh', icon: '♻' }) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="nv-live-strip">' +
        '<div class="nv-live-strip-head">' +
          '<span class="nv-live" id="uniLiveBadge"><i></i>' + U.esc(t('uni.hero.live')) + '</span>' +
          '<span class="nv-note" id="uniLiveSub">—</span>' +
          '<span class="nv-grow"></span>' +
          '<span class="nv-badge-demo">🧪 ' + U.esc(t('uni.hero.demo')) + '</span>' +
        '</div>' +
        '<div class="nv-chiprow" id="uniLiveChips"></div>' +
      '</div>';
  }

  /* --------------------------------------------------- 2. KPI avancés (bande) */
  function htmlKpis() {
    return UI.panel({
      id: 'uniKpiPanel', icon: '📊',
      title: fr() ? 'Indicateurs de surveillance — niveau, tendance et incertitude' : 'Surveillance indicators — level, trend and uncertainty',
      subtitle: fr() ? 'Séries annuelles reconstruites 2000 → 2026, ancrées sur les valeurs nationales ; tendance et variabilité issues du backtest.' : 'Annual series rebuilt 2000 → 2026, anchored on national values; trend and variability from the backtest.',
      actions: UI.segmented([{ id: 'level', label: fr() ? 'Niveau' : 'Level' }, { id: 'trend', label: fr() ? 'Tendance' : 'Trend' }, { id: 'burden', label: fr() ? 'Charge' : 'Burden' }], 'level', 'uni-kpi-view'),
      body: '<div class="nv-grid nv-g3" id="uniKpis"></div>'
    });
  }

  /* ------------------------------------------------------------- 3. prévision */
  function htmlForecast() {
    return UI.panel({
      id: 'uniFcPanel', icon: '🛰️', title: t('uni.fc.title'), subtitle: t('uni.fc.sub'),
      actions: UI.btn(t('uni.fc.run'), { kind: 'primary', action: 'uni-run-forecast', icon: '🚀', id: 'uniFcRun' }),
      body:
        '<div class="nv-pred-toolbar">' +
          sel('uniFcInd', indicatorOptions(), State.indicator, t('uni.fc.indicator')) +
          '<label class="nv-field"><span>' + U.esc(t('uni.fc.horizon')) + '</span>' +
            UI.slider({ key: 'horizon', id: 'uniFcHorizon', label: '', min: 3, max: 15, step: 1, value: State.horizon, unit: ' ' + t('uni.common.years'), display: State.horizon + ' ' + t('uni.fc.years') }) + '</label>' +
          '<label class="nv-field"><span>' + U.esc(t('uni.fc.trials')) + '</span>' +
            UI.slider({ key: 'trials', id: 'uniFcTrials', label: '', min: 500, max: 8000, step: 500, value: State.trials, display: U.fmtInt(State.trials) }) + '</label>' +
          sel('uniFcScenario', scenarioOptions(), State.scenario, t('uni.fc.scenario')) +
        '</div>' +
        '<div class="nv-pred-main">' +
          '<div class="nv-pred-chartcard">' +
            '<div class="nv-chart-host" data-chart="uniForecast" style="height:320px"></div>' +
            '<div class="nv-forecast-meta" id="uniFcMeta"></div>' +
          '</div>' +
          '<div class="nv-pred-risks">' +
            '<div class="nv-panel-title"><h3>' + U.esc(fr() ? 'Lecture opérationnelle' : 'Operational read-out') + '</h3></div>' +
            '<div class="nv-list" id="uniFcRead"></div>' +
            '<div class="nv-divider"></div>' +
            '<div class="nv-panel-title"><h3>' + U.esc(fr() ? 'Cibles mondiales 2030' : '2030 global targets') + '</h3></div>' +
            '<div id="uniFcTargets"></div>' +
          '</div>' +
        '</div>',
      footer: '<span class="nv-note" id="uniFcNote">' + U.esc(t('uni.fc.note')) + '</span>'
    });
  }

  /* ---------------------------------------------------------- 4. IA explicable */
  function htmlAi() {
    return UI.panel({
      id: 'uniAiPanel', icon: '🧠', title: t('uni.ai.title'), subtitle: t('uni.ai.sub'),
      actions: UI.btn(t('uni.ai.replay'), { action: 'uni-replay-ai', icon: '🔁' }),
      body:
        '<div class="nv-ai">' +
          '<div class="nv-ai-pipe">' +
            '<div class="nv-ai-head"><div class="nv-ai-title"><b>' + U.esc(fr() ? 'Chaîne d\'inférence' : 'Inference pipeline') + '</b><span class="nv-note" id="uniAiSub">—</span></div></div>' +
            '<div class="nv-ai-body"><div id="uniAiSteps"></div></div>' +
          '</div>' +
          '<div class="nv-ai-side">' +
            '<div class="nv-grid nv-g2" id="uniAiKpis"></div>' +
            '<div class="nv-divider"></div>' +
            '<div class="nv-panel-title"><h3>' + U.esc(t('uni.ai.features')) + '</h3></div>' +
            '<div class="nv-chiprow" id="uniAiFeatures"></div>' +
            '<div class="nv-divider"></div>' +
            '<div class="nv-panel-title"><h3>' + U.esc(t('uni.ai.rank')) + '</h3></div>' +
            '<div class="nv-ai-models" id="uniAiModels"></div>' +
            '<div class="nv-divider"></div>' +
            '<div class="nv-panel-title"><h3>' + U.esc(t('uni.ai.anomalies')) + '</h3></div>' +
            '<div class="nv-list" id="uniAiAnomalies"></div>' +
          '</div>' +
        '</div>'
    });
  }

  /* ----------------------------------------------------------- 5. simulateur */
  function htmlSim() {
    const levers = PROGRAMMES.map((p) =>
      '<div class="nv-uni-lever">' +
        '<div class="nv-uni-lever-head"><span class="nv-uni-lever-icon">' + p.icon + '</span>' +
          '<div><b>' + U.esc(progLabel(p.id)) + '</b><span class="nv-note">' + U.esc(progHint(p.id)) + '</span></div>' +
          '<span class="nv-chip nv-chip-neutral" data-lever-chip="' + p.id + '">—</span></div>' +
        UI.slider({ key: p.id, id: 'uniLev' + p.id, label: fr() ? 'Couverture' : 'Coverage', min: 0, max: 100, step: 5, value: U.num(State.levers[p.id], 0), unit: '%', display: U.num(State.levers[p.id], 0) + '%' }) +
      '</div>').join('');
    return UI.panel({
      id: 'uniSimPanel', icon: '🧪', title: t('uni.sim.title'), subtitle: t('uni.sim.sub'),
      actions: UI.btn(t('uni.sim.run'), { kind: 'primary', action: 'uni-run-sim', icon: '▶' }),
      body:
        '<div class="nv-pred-toolbar">' +
          sel('uniSimPreset', scenarioOptions().concat([['custom', t('uni.sim.preset.custom')]]), State.scenario, t('uni.sim.preset')) +
          '<label class="nv-field"><span>' + U.esc(t('uni.sim.budget')) + '</span>' +
            UI.slider({ key: 'budget', id: 'uniSimBudget', label: '', min: 1, max: 150, step: 1, value: Math.round(State.budget / 1e6), unit: ' M$', display: '$' + U.fmt(State.budget / 1e6, 1) + 'M' }) + '</label>' +
          '<label class="nv-field"><span>' + U.esc(t('uni.sim.quality')) + '</span>' +
            UI.slider({ key: 'quality', id: 'uniSimQuality', label: '', min: 40, max: 100, step: 1, value: State.quality, unit: '%', display: State.quality + '%' }) + '</label>' +
          '<label class="nv-field"><span>' + U.esc(t('uni.sim.equity')) + '</span>' +
            UI.slider({ key: 'equityPct', id: 'uniSimEquity', label: '', min: 0, max: 100, step: 1, value: State.equityPct, unit: '%', display: State.equityPct + '%' }) + '</label>' +
          '<label class="nv-field"><span>' + U.esc(t('uni.sim.horizon')) + '</span>' +
            UI.slider({ key: 'simHorizon', id: 'uniSimHorizon', label: '', min: 2, max: 15, step: 1, value: State.horizon, unit: ' ' + t('uni.common.years'), display: State.horizon + ' ' + t('uni.fc.years') }) + '</label>' +
        '</div>' +
        '<div class="nv-uni-levers">' + levers + '</div>' +
        '<div class="nv-divider"></div>' +
        '<div class="nv-grid nv-g3" id="uniSimKpis"></div>' +
        '<div class="nv-pred-main">' +
          '<div class="nv-pred-chartcard">' +
            '<div class="nv-panel-title"><h3>' + U.esc(t('uni.sim.impactChart')) + '</h3></div>' +
            '<div class="nv-chart-host" data-chart="uniSim" style="height:300px"></div>' +
            '<div class="nv-forecast-meta" id="uniSimMeta"></div>' +
          '</div>' +
          '<div class="nv-pred-risks">' +
            '<div class="nv-panel-title"><h3>' + U.esc(t('uni.sim.frontier')) + '</h3></div>' +
            '<div id="uniSimTable"></div>' +
            '<div class="nv-note" id="uniSimNote">' + U.esc(t('uni.sim.uncertainty')) + '</div>' +
          '</div>' +
        '</div>'
    });
  }

  /* ------------------------------------------------- 6. points chauds & équité */
  function htmlHotspots() {
    return UI.panel({
      id: 'uniHotPanel', icon: '🔥', title: t('uni.hs.title'), subtitle: t('uni.hs.sub'),
      actions: UI.btn(fr() ? 'Exporter le classement' : 'Export ranking', { action: 'uni-export-hotspots', icon: '⬇' }),
      body:
        '<div class="nv-grid nv-g2">' +
          '<div>' +
            '<div class="nv-panel-title"><h3>' + U.esc(t('uni.hs.heat')) + '</h3></div>' +
            '<div class="nv-chart-host" data-chart="uniHeat" style="height:340px"></div>' +
          '</div>' +
          '<div>' +
            '<div class="nv-panel-title"><h3>' + U.esc(t('uni.hs.equity')) + '</h3></div>' +
            '<div id="uniEquity"></div>' +
            '<div class="nv-divider"></div>' +
            '<div class="nv-panel-title"><h3>' + U.esc(fr() ? 'Districts prioritaires' : 'Priority districts') + '</h3></div>' +
            '<div class="nv-list" id="uniHotList"></div>' +
          '</div>' +
        '</div>' +
        '<div class="nv-divider"></div>' +
        '<div id="uniHotTable"></div>'
    });
  }

  /* ------------------------------------------------------------ 7. couche GIS */
  function htmlGisControls() {
    return '<div class="nv-uni-gisbar">' +
      '<div class="nv-row">' +
        '<span class="nv-note">' + U.esc(t('uni.gis.layer')) + '</span>' +
        UI.segmented([{ id: 'risk', label: fr() ? 'Risque' : 'Risk' }, { id: 'stunting', label: indLabel('stunting', true) }, { id: 'wasting', label: indLabel('wasting', true) }, { id: 'anaemia', label: indLabel('anaemia', true) }, { id: 'coverage', label: fr() ? 'Couverture' : 'Coverage' }], State.gisLayer, 'uni-gis-layer') +
        '<span class="nv-grow"></span>' +
        '<span class="nv-note" id="uniGisSel">—</span>' +
        UI.btn(t('uni.gis.open'), { action: 'uni-gis-open', icon: '🗺️' }) +
        UI.btn(fr() ? 'Détails du district' : 'District details', { action: 'uni-district', icon: '🔎' }) +
      '</div>' +
      '<div class="nv-uni-gislegend"><span>' + U.esc(t('uni.gis.low')) + '</span><i></i><span>' + U.esc(t('uni.gis.high')) + '</span></div>' +
    '</div>';
  }

  /* --------------------------------------------------------- 8. alerte précoce */
  function htmlWarning() {
    return UI.panel({
      id: 'uniWarnPanel', icon: '🚨', title: t('uni.ew.title'), subtitle: t('uni.ew.sub'),
      actions: UI.btn(fr() ? 'Plan d\'action précoce' : 'Early action plan', { kind: 'primary', action: 'uni-action-plan', icon: '🧭' }),
      body:
        '<div class="nv-pred-main">' +
          '<div class="nv-pred-risks"><div class="nv-list" id="uniWarnList"></div></div>' +
          '<div class="nv-pred-chartcard">' +
            '<div class="nv-panel-title"><h3>' + U.esc(fr() ? 'Probabilité de franchissement de seuil' : 'Threshold breach probability') + '</h3></div>' +
            '<div class="nv-chart-host" data-chart="uniWarn" style="height:280px"></div>' +
            '<div class="nv-note" id="uniWarnNote">—</div>' +
          '</div>' +
        '</div>'
    });
  }

  /* -------------------------------------------------- 9. qualité des données */
  function htmlData() {
    return UI.panel({
      id: 'uniDqPanel', icon: '🗂️', title: t('uni.dq.title'), subtitle: t('uni.dq.sub'),
      actions: UI.chip(t('uni.dq.sources'), 'neutral'),
      body:
        '<div class="nv-grid nv-g2">' +
          '<div><div class="nv-chart-host" data-chart="uniDq" style="height:190px"></div><div class="nv-note" id="uniDqNote">—</div></div>' +
          '<div id="uniDqTable"></div>' +
        '</div>'
    });
  }

  /* ---------------------------------------------------------------- 10. pied */
  function htmlFooter() {
    return UI.panel({
      id: 'uniFooter', icon: '🧬', title: t('uni.foot.title'), subtitle: t('uni.foot.text'),
      actions:
        UI.btn(t('uni.exp.json'), { action: 'uni-export-json', icon: '⬇' }) +
        UI.btn(t('uni.exp.csv'), { action: 'uni-export-csv', icon: '⬇' }) +
        UI.btn(t('uni.exp.report'), { action: 'uni-report', icon: '🖨' }),
      body: '<div class="nv-note">' + U.esc(t('uni.foot.disclaimer')) + '</div>',
      footer: '<span class="nv-note" id="uniFootMeta">—</span>'
    });
  }

  /* ==========================================================================
     5. RENDU
     ====================================================================== */
  function mkDiv(id, cls, html) {
    const d = document.createElement('div');
    if (id) d.id = id;
    if (cls) d.className = cls;
    if (html) d.innerHTML = html;
    return d;
  }
  function ins(node, pos, ref) {
    const r = ref || null;
    if (!r || !r.parentNode) { root.appendChild(node); return node; }
    if (pos === 'beforebegin') r.parentNode.insertBefore(node, r);
    else if (pos === 'afterend') r.parentNode.insertBefore(node, r.nextSibling);
    else r.insertAdjacentElement(pos, node);
    return node;
  }
  function setHtml(sel, html) { const e = typeof sel === 'string' ? (root && root.querySelector(sel)) : sel; if (e) e.innerHTML = html; return e; }
  function setTxt(sel, v) { const e = typeof sel === 'string' ? (root && root.querySelector(sel)) : sel; if (e) e.textContent = v; return e; }
  function chartHost(key) { return root ? root.querySelector('[data-chart="' + key + '"]') : null; }
  function mountChart(key, host, spec) {
    if (!host) return null;
    const cur = State.charts[key];
    if (cur && cur.host === host && !cur.destroyed) { cur.render(spec); return cur; }
    if (cur) { try { cur.destroy(); } catch (e) { } }
    const inst = CH.mount(host, spec);
    if (inst) State.charts[key] = inst;
    return inst;
  }
  function sparkAll(scope) {
    const hosts = U.qsa('[data-spark]', scope || root);
    hosts.forEach((h) => {
      const data = JSON.parse(h.getAttribute('data-spark') || '[]');
      const color = h.getAttribute('data-spark-color') || TH.tones.good;
      try { CH.render(h, { type: 'sparkline', data: data, color: color, width: 1.9 }); } catch (e) { }
    });
  }
  function bandOf(risk) { return risk >= 70 ? 'veryHigh' : risk >= 50 ? 'high' : risk >= 32 ? 'moderate' : 'low'; }
  function bandTone(risk) { return risk >= 70 ? 'risk' : risk >= 50 ? 'warn' : risk >= 32 ? 'ok' : 'good'; }
  function bandText(risk) {
    const b = bandOf(risk);
    return b === 'veryHigh' ? (fr() ? 'Risque très élevé' : 'Very high risk') : b === 'high' ? (fr() ? 'Risque élevé' : 'High risk') : b === 'moderate' ? (fr() ? 'Risque modéré' : 'Moderate risk') : (fr() ? 'Risque maîtrisé' : 'Controlled risk');
  }
  function toneOf(ind, v) {
    if (ind.good === 'up') return v >= ind.warn ? 'good' : v >= ind.risk ? 'warn' : 'risk';
    return v <= ind.warn ? 'good' : v < ind.risk ? 'warn' : 'risk';
  }
  function money(v) { return '$' + U.compact(v); }

  /* ------------------------------------------------------------------- hero */
  function renderHero() {
    const a = anchor(State.country), u5 = a.u5 * 1e6;
    const risk = compositeRisk(State.country), dq = readiness(State.country);
    const cov = a.monitored / u5;
    setHtml('#uniHeroChips',
      UI.chip('📍 ' + countryName(State.country), 'info') +
      UI.chip(t('uni.hero.level') + ' · ' + State.level, 'neutral') +
      UI.chip(t('uni.hero.year') + ' · ' + State.year, 'neutral') +
      UI.chip('👶 ' + U.compact(u5) + ' ' + t('uni.hero.u5'), 'good') +
      UI.chip('🩺 ' + U.compact(a.monitored) + ' ' + t('uni.hero.monitored'), 'ok') +
      UI.chip(t('uni.hero.coverage') + ' ' + U.pct(cov, 0), cov > 0.18 ? 'good' : 'warn') +
      UI.chip('🗂️ ' + t('uni.dq.gauge') + ' ' + dq + '%', dq > 72 ? 'good' : dq > 55 ? 'warn' : 'risk'));
    mountChart('uniRisk', chartHost('uniRisk'), {
      type: 'gauge', value: risk, min: 0, max: 100, digits: 1,
      bands: [{ from: 0, to: 32, color: TH.tones.good }, { from: 32, to: 50, color: TH.tones.ok }, { from: 50, to: 70, color: TH.tones.warn }, { from: 70, to: 100, color: TH.tones.risk }],
      label: t('uni.hero.riskIndex'), sub: countryName(State.country)
    });
    setHtml('#uniRiskBand', UI.chip(bandText(risk), bandTone(risk)));
    setTxt('#uniRiskNote', (fr() ? 'Charge pondérée : retard 30 % · émaciation 22 % · anémie 18 % · pratiques d\'alimentation 22 % · couverture 8 %.' : 'Weighted burden: stunting 30% · wasting 22% · anaemia 18% · feeding practices 22% · coverage 8%.'));
    const mains = ['stunting', 'wasting', 'anaemia', 'ebf'];
    setHtml('#uniHeroKpis', mains.map((k) => {
      const ind = IND_BY_ID[k], s = seriesFor(State.country, k), last = s.values[s.values.length - 1];
      const prev = s.values[Math.max(0, s.values.length - 6)];
      const d = last - prev;
      const good = ind.good === 'up' ? d > 0 : d < 0;
      return UI.kpi({
        label: indLabel(k, true), value: U.fmt(last, 1), unit: '%', icon: ind.icon,
        tone: toneOf(ind, last), delta: d, deltaGood: ind.good === 'up',
        deltaText: U.signed(d, 1) + ' pp / 5 ' + (fr() ? 'ans' : 'y'),
        chip: good ? (fr() ? 'amélioré' : 'improved') : (fr() ? 'dégradé' : 'worsened'),
        spark: '<div class="nv-chart-host" data-spark="' + JSON.stringify(s.values.slice(-14)) + '" data-spark-color="' + (good ? TH.tones.good : TH.tones.risk) + '" style="height:30px"></div>'
      });
    }).join(''));
    sparkAll(root.querySelector('#uniHeroKpis'));
    setTxt('#uniLiveSub', (fr() ? 'Flux de surveillance : ' : 'Surveillance feed: ') + districts(State.country).length + ' ' + t('uni.common.districts') + ' · ' + IND_IDS.length + ' ' + (fr() ? 'indicateurs' : 'indicators') + ' · ' + U.fmtInt(State.trials) + ' ' + t('uni.fc.meta.trials'));
    setHtml('#uniLiveChips',
      UI.chip((fr() ? 'Scénario : ' : 'Scenario: ') + t('uni.sim.preset.' + State.scenario), 'neutral') +
      UI.chip((fr() ? 'Indicateur : ' : 'Indicator: ') + indLabel(State.indicator, true), 'info') +
      UI.chip('P50 → ' + LAST_YEAR + '+' + State.horizon, 'ok') +
      (State.focusDistrict ? UI.chip('🎯 ' + State.focusDistrict, 'warn') : ''));
  }

  /* ---------------------------------------------------------- KPI avancés */
  let kpiView = 'level';
  function renderKpis() {
    const a = anchor(State.country), u5 = a.u5 * 1e6;
    const cards = INDICATORS.map((ind) => {
      const k = ind.id, s = seriesFor(State.country, k), last = s.values[s.values.length - 1];
      const prev5 = s.values[Math.max(0, s.values.length - 6)];
      const slope = S.slope(s.values.slice(-8));
      const tone = toneOf(ind, last);
      const improving = ind.good === 'up' ? slope > 0 : slope < 0;
      if (kpiView === 'trend') {
        return UI.kpi({
          id: 'uniKpi-' + k, label: indLabel(k), value: U.signed(slope, 2), unit: 'pp', icon: ind.icon,
          tone: improving ? 'good' : Math.abs(slope) < 0.08 ? 'neutral' : 'risk',
          chip: Math.abs(slope) < 0.08 ? t('uni.trend.stable') : (improving ? t('uni.trend.improving') : t('uni.trend.worsening')),
          hint: '<span class="nv-note">' + U.esc(fr() ? 'Projection ' : 'Projection ') + (LAST_YEAR + State.horizon) + ' : ' + U.fmt(s.values[s.values.length - 1] + slope * State.horizon, 1) + ' % · ' + U.esc(t('uni.pace.perYear')) + '</span>',
          spark: '<div class="nv-chart-host" data-spark="' + JSON.stringify(s.values.slice(-14)) + '" data-spark-color="' + (improving ? TH.tones.good : TH.tones.risk) + '" style="height:30px"></div>'
        });
      }
      if (kpiView === 'burden') {
        const cases = Math.round(u5 * (ind.good === 'up' ? (100 - last) / 100 : last / 100));
        return UI.kpi({
          id: 'uniKpi-' + k, label: indLabel(k), value: U.compact(cases), icon: ind.icon, tone: tone,
          chip: U.pct(ind.good === 'up' ? (100 - last) / 100 : last / 100, 0) + ' ' + t('uni.common.of'),
          hint: '<span class="nv-note">' + U.esc(ind.good === 'up' ? (fr() ? 'Enfants non couverts' : 'Children not covered') : (fr() ? 'Enfants affectés' : 'Children affected')) + ' · ' + U.esc(U.compact(u5)) + ' ' + t('uni.hero.u5') + '</span>',
          spark: '<div class="nv-chart-host" data-spark="' + JSON.stringify(s.values.slice(-14)) + '" data-spark-color="' + TH.tone(tone) + '" style="height:30px"></div>'
        });
      }
      const d = last - prev5;
      return UI.kpi({
        id: 'uniKpi-' + k, label: indLabel(k), value: U.fmt(last, 1), unit: '%', icon: ind.icon, tone: tone,
        delta: d, deltaGood: ind.good === 'up', deltaText: U.signed(d, 1) + ' pp',
        chip: (fr() ? 'Seuil OMS ' : 'WHO threshold ') + (ind.good === 'up' ? '≥ ' + ind.warn : '≤ ' + ind.warn) + ' %',
        hint: '<span class="nv-note">' + U.esc(t('uni.delta.since') + ' ' + s.years[s.years.length - 6]) + ' · ' + U.esc(ind.src) + '</span>',
        spark: '<div class="nv-chart-host" data-spark="' + JSON.stringify(s.values.slice(-14)) + '" data-spark-color="' + TH.tone(tone) + '" style="height:30px"></div>'
      });
    });
    setHtml('#uniKpis', cards.join(''));
    sparkAll(root.querySelector('#uniKpis'));
  }

  /* -------------------------------------------------------------- prévision */
  function renderForecast() {
    const ind = IND_BY_ID[State.indicator] || INDICATORS[0];
    const H = State.horizon;
    const f = forecastInd(State.country, State.indicator, H, { trials: State.trials, drift: 0 });
    const drift = scenarioDrift(State.indicator, State.scenario);
    const useSc = Math.abs(drift) > 1e-9;
    const fSc = useSc ? forecastInd(State.country, State.indicator, H, { trials: State.trials, drift: drift }) : null;
    State.lastForecast = fSc || f;
    const past = f.past.concat(new Array(H).fill(null));
    const bridge = new Array(f.past.length - 1).fill(null).concat([f.past[f.past.length - 1]]);
    const series = [
      { name: t('uni.fc.history'), data: past, color: '#38f0a5', fill: true, width: 2.6, points: false },
      { name: t('uni.fc.p50'), data: bridge.concat(f.fc.point), color: '#22d3ee', dash: '6 4', width: 2.2, points: false }
    ];
    if (fSc) series.push({ name: t('uni.fc.p50sc'), data: bridge.concat(fSc.fc.point), color: '#a3e635', dash: '2 4', width: 2.4, points: false });
    const target = ind.target2030 ? U.round(f.past[f.past.length - 1] * ind.target2030, 1) : null;
    mountChart('uniForecast', chartHost('uniForecast'), {
      type: 'line', height: 320, labels: f.labels, series: series,
      cone: { p10: f.fc.p10, p90: f.fc.p90, p25: f.fc.p25, p75: f.fc.p75, start: f.past.length - 1, color: '#22d3ee' },
      splitAt: f.past.length - 1, splitLabel: t('uni.fc.split'),
      y: { unit: '%', digits: 1 },
      goal: target != null ? { value: target, label: t('uni.fc.whoTarget') + ' ' + target + ' %' } : null
    });
    /* métadonnées */
    const last = f.past[f.past.length - 1];
    const endP = f.fc.point[H - 1], endS = fSc ? fSc.fc.point[H - 1] : endP;
    const thr = ind.risk;
    const paths = ((fSc || f).fc.paths || []);
    const pBad = paths.length ? paths.filter((p) => p.some((x) => ind.good === 'up' ? x <= thr : x >= thr)).length / paths.length : null;
    const pTgt = target != null && paths.length ? paths.filter((p) => p.some((x) => ind.good === 'up' ? x >= target : x <= target)).length / paths.length : null;
    setHtml('#uniFcMeta',
      '<div class="nv-row">' +
        UI.chip(t('uni.fc.meta.today') + ' ' + U.fmt(last, 1) + ' %', 'good') +
        UI.chip(t('uni.fc.meta.p50') + ' ' + (LAST_YEAR + H) + ' : ' + U.fmt(endP, 1) + ' %', 'info') +
        (fSc ? UI.chip((fr() ? 'Scénario → ' : 'Scenario → ') + U.fmt(endS, 1) + ' % (' + U.signed(drift, 2) + ' pp/' + (fr() ? 'an' : 'y') + ')', 'ok') : UI.chip(fr() ? 'Scénario = statu quo (aucune dérive)' : 'Scenario = business as usual (no drift)', 'neutral')) +
        UI.chip(t('uni.fc.meta.ci') + ' : ' + U.fmt(f.fc.p10[H - 1], 1) + ' – ' + U.fmt(f.fc.p90[H - 1], 1) + ' %', 'neutral') +
        (pTgt != null ? UI.chip(t('uni.fc.meta.pTarget') + ' ' + U.pct(pTgt, 0), pTgt > 0.5 ? 'good' : pTgt > 0.2 ? 'warn' : 'risk') : '') +
        (pBad != null ? UI.chip(t('uni.fc.meta.pBreach') + ' ' + U.pct(pBad, 0), pBad > 0.4 ? 'risk' : pBad > 0.15 ? 'warn' : 'good') : '') +
        UI.chip(U.fmtInt(f.fc.trials) + ' ' + t('uni.fc.meta.trials'), 'neutral') +
        (f.fc.models ? UI.chip(t('uni.fc.meta.ensemble') + ' : ' + f.fc.models.filter((x) => !x.dropped).length + '/' + f.fc.models.length + ' ' + t('uni.fc.meta.models'), 'info') : '') +
      '</div>' +
      '<div class="nv-note">' + U.esc(fr() ? 'Moteur : ensemble pondéré (' : 'Engine: weighted ensemble (') +
        (f.fc.models || []).filter((x) => !x.dropped).slice(0, 3).map((x) => x.label).join(' + ') +
        (fr() ? ') noté par backtest walk-forward, résidus bootstrap calibrés. ' : ') scored by walk-forward backtest, calibrated bootstrap residuals. ') +
        (f.fc.calibration ? (fr() ? 'Facteur de volatilité calibré : ' : 'Calibrated volatility factor: ') + U.fmt(f.fc.calibration.volScale, 2) + ' · ' + (fr() ? 'couverture empirique ' : 'empirical coverage ') + (f.fc.calibration.coverage != null ? U.pct(f.fc.calibration.coverage, 0) : '—') + '.' : '') + '</div>');
    /* lecture opérationnelle */
    const slopeHist = S.slope(f.past.slice(-8));
    const need = target != null ? (target - last) / Math.max(1, (2030 - LAST_YEAR)) : null;
    const items = [];
    items.push({
      icon: ind.icon, tone: toneOf(ind, last),
      title: (fr() ? 'Vitesse observée' : 'Observed pace'),
      text: U.signed(slopeHist, 2) + ' pp/' + (fr() ? 'an' : 'year') + ' · ' + (fr() ? 'nécessaire pour la cible 2030 : ' : 'required for the 2030 target: ') + (need != null ? U.signed(need, 2) + ' pp/' + (fr() ? 'an' : 'year') : '—'),
      side: need != null && Math.abs(slopeHist) >= Math.abs(need) ? (fr() ? 'Sur la bonne voie' : 'On track') : (fr() ? 'Hors trajectoire' : 'Off track'),
      sideTone: need != null && Math.abs(slopeHist) >= Math.abs(need) ? 'good' : 'risk'
    });
    items.push({
      icon: '🎯', tone: pTgt == null ? 'neutral' : pTgt > 0.5 ? 'good' : pTgt > 0.2 ? 'warn' : 'risk',
      title: (fr() ? 'Probabilité d\'atteindre la cible' : 'Probability of reaching the target'),
      text: target != null ? (U.pct(pTgt || 0, 0) + ' · ' + (fr() ? 'cible ' : 'target ') + U.fmt(target, 1) + ' % ' + (fr() ? 'en' : 'by') + ' 2030') : (fr() ? 'Pas de cible mondiale chiffrée' : 'No quantified global target'),
      side: target != null ? U.pct(pTgt || 0, 0) : '—', sideTone: pTgt > 0.5 ? 'good' : 'warn'
    });
    items.push({
      icon: '🧭', tone: 'info',
      title: (fr() ? 'Levier prioritaire' : 'Priority lever'),
      text: progLabel(ACTIONS[State.indicator] || 'csc') + ' · ' + progHint(ACTIONS[State.indicator] || 'csc'),
      side: progIcon(ACTIONS[State.indicator] || 'csc'), sideTone: 'info'
    });
    const shocks = shocksFor(State.country, State.indicator);
    items.push({
      icon: '⚡', tone: shocks.length ? 'warn' : 'good',
      title: (fr() ? 'Chocs historiques détectés' : 'Historical shocks detected'),
      text: shocks.length ? shocks.map((x) => x.year + ' (' + U.signed(x.z, 1) + 'σ)').join(' · ') : t('uni.ai.noAnomaly'),
      side: String(shocks.length), sideTone: shocks.length ? 'warn' : 'good'
    });
    setHtml('#uniFcRead', items.map((it) =>
      '<div class="nv-item" data-tone="' + it.tone + '"><span class="nv-item-icon">' + it.icon + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(it.title) + '</div><div class="nv-item-text">' + U.esc(it.text) + '</div></div>' +
      '<div class="nv-item-side"><b>' + U.esc(it.side) + '</b><span class="nv-chip nv-chip-' + it.sideTone + '">' + U.esc(it.sideTone === 'good' ? '✓' : it.sideTone === 'risk' ? '!' : 'i') + '</span></div></div>').join(''));
    /* cibles 2030 des quatre indicateurs majeurs */
    setHtml('#uniFcTargets', ['stunting', 'wasting', 'anaemia', 'ebf'].map((k) => {
      const i2 = IND_BY_ID[k], a = anchor(State.country), cur = U.num(a[k], 0);
      const tgt = U.round(cur * i2.target2030, 1);
      const prog = i2.good === 'up' ? U.clamp((cur - 20) / Math.max(1, tgt - 20), 0, 1) * 100 : U.clamp((60 - cur) / Math.max(1, 60 - tgt), 0, 1) * 100;
      return UI.meter({ label: indLabel(k, true) + ' → ' + tgt + ' %', value: prog, text: U.fmt(cur, 1) + ' %', marker: 100, markerLabel: '2030', color: TH.tone(toneOf(i2, cur)) });
    }).join(''));
    renderAi(fSc || f);
  }

  /* --------------------------------------------------------- IA explicable */
  function stepLabel(s) { const k = 'ai.s.' + s.id, v = t(k); return v === k ? s.label : v; }
  function stepDetail(s) { const k = 'ai.d.' + s.id, v = t(k); return v === k ? (s.detail || '') : v; }
  function metricKey(k) {
    /* les séries UNICEF sont annuelles : on relabelise les métriques « / mois » du noyau */
    if (k === 'driftPerMonth') return fr() ? 'dérive / an' : 'drift / year';
    const key = 'ai.m.' + k, v = t(key);
    return v === key ? k : v;
  }
  function renderAi(f) {
    const fc = f.fc;
    if (!fc) return;
    const ind = f.ind || IND_BY_ID[State.indicator];
    const host = root.querySelector('#uniAiSteps');
    if (host) {
      const steps = (fc.steps || []).map((s) => ({ id: s.id, label: stepLabel(s), detail: stepDetail(s), metrics: s.metrics }));
      if (State.pipes.ai) State.pipes.ai.clear();
      State.pipes.ai = UI.pipeline(host, steps, {
        fmtKey: metricKey,
        doneText: U.esc(t('uni.ai.done', { ms: U.fmtInt(fc.ms), trials: U.fmtInt(fc.trials), models: (fc.models || []).filter((m) => !m.dropped).length }))
      });
    }
    setTxt('#uniAiSub', indLabel(State.indicator) + ' · ' + countryName(State.country) + ' · ' + State.horizon + ' ' + t('uni.fc.years'));
    const kept = (fc.models || []).filter((m) => !m.dropped);
    const leader = kept.slice().sort((a, b) => (a.mae == null ? 9 : a.mae) - (b.mae == null ? 9 : b.mae))[0] || (fc.models || [])[0];
    setHtml('#uniAiKpis',
      UI.kpi({ label: t('uni.ai.kpi.best'), value: leader && leader.mae != null ? U.fmt(leader.mae, 3) : '—', unit: 'pp', icon: '🎯', tone: 'good', chip: leader ? leader.label : '', hint: '<span class="nv-note">RMSE ' + U.fmt(leader ? leader.rmse : 0, 3) + ' · MAPE ' + U.fmt(leader ? leader.mape : 0, 2) + ' %</span>' }) +
      UI.kpi({ label: t('uni.ai.kpi.kept'), value: kept.length + '/' + (fc.models || []).length, icon: '🧩', tone: 'info', hint: '<span class="nv-note">' + U.esc(kept.map((m) => m.id).join(' · ')) + '</span>' }) +
      UI.kpi({ label: t('uni.ai.kpi.folds'), value: U.fmtInt(fc.backtest ? fc.backtest.folds : 0), icon: '🔁', tone: 'neutral', hint: '<span class="nv-note">' + U.esc(t('uni.ai.kpi.horizon')) + ' ' + (fc.backtest ? fc.backtest.hmax : 0) + ' ' + t('uni.fc.years') + '</span>' }) +
      UI.kpi({ label: t('uni.ai.kpi.ic'), value: U.fmt(fc.p10[fc.horizon - 1], 1) + ' → ' + U.fmt(fc.p90[fc.horizon - 1], 1), unit: '%', icon: '📐', tone: 'ok', hint: '<span class="nv-note">' + U.esc(t('uni.fc.coverage')) + ' : ' + (fc.calibration && fc.calibration.coverage != null ? U.pct(fc.calibration.coverage, 0) : '—') + ' · ' + U.esc(t('uni.fc.volScale')) + ' ' + U.fmt(fc.calibration ? fc.calibration.volScale : 1, 2) + '</span>' }) +
      UI.kpi({ label: t('uni.ai.kpi.trials'), value: U.fmtInt(fc.trials), icon: '🎲', tone: 'neutral', hint: '<span class="nv-note">' + U.esc(t('uni.ai.kpi.dirichlet')) + '</span>' }) +
      UI.kpi({ label: t('uni.ai.kpi.time'), value: U.fmtInt(fc.ms), unit: 'ms', icon: '⚡', tone: fc.ms < 500 ? 'good' : 'warn', hint: '<span class="nv-note">' + U.esc(t('uni.fc.seed')) + ' ' + U.esc(String(fc.seed).slice(0, 28)) + '</span>' }));
    const ft = fc.features || {};
    setHtml('#uniAiFeatures',
      UI.chip((fr() ? 'Niveau ' : 'Level ') + U.fmt(ft.last, 1) + ' %', 'good') +
      UI.chip((fr() ? 'Pente ' : 'Slope ') + U.signed(ft.slope, 3) + ' pp/' + (fr() ? 'an' : 'y'), ft.slope < 0 ? 'ok' : 'warn') +
      UI.chip('CV ' + U.pct(ft.cv || 0, 1), 'neutral') +
      UI.chip((fr() ? 'Autocorrélation ρ₁ ' : 'Autocorrelation ρ₁ ') + U.fmt(ft.ac1 || 0, 2), 'info') +
      UI.chip((fr() ? 'R² tendance ' : 'Trend R² ') + U.fmt(ft.r2 || 0, 2), 'neutral') +
      UI.chip((fr() ? 'Anomalies ' : 'Anomalies ') + (fc.anomalies ? fc.anomalies.length : 0), fc.anomalies && fc.anomalies.length ? 'warn' : 'good') +
      UI.chip((fr() ? 'Cycle détecté ' : 'Cycle detected ') + (ft.seasonal ? ft.seasonal + (fr() ? ' pas' : ' steps') : (fr() ? 'aucun' : 'none')), 'neutral'));
    setHtml('#uniAiModels', UI.table([
      { key: 'label', label: t('uni.ai.col.model'), render: (v, r) => '<b>' + U.esc(v) + '</b>' + (r.dropped ? ' <span class="nv-chip nv-chip-risk">' + U.esc(t('uni.ai.dropped')) + '</span>' : '') },
      { key: 'rmse', label: t('uni.ai.col.rmse'), align: 'right', render: (v) => U.fmt(v, 3) },
      { key: 'mae', label: t('uni.ai.col.mae'), align: 'right', render: (v) => U.fmt(v, 3) },
      { key: 'mape', label: t('uni.ai.col.mape'), align: 'right', render: (v) => U.fmt(v, 2) },
      { key: 'weight', label: t('uni.ai.col.weight'), align: 'right', render: (v, r) => r.dropped ? '—' : U.pct(U.num(v, 0), 1) }
    ], (fc.models || []).map((m) => ({ label: m.label, rmse: m.rmse, mae: m.mae, mape: m.mape, weight: m.weight, dropped: m.dropped, __tone: m.dropped ? 'risk' : null }))));
    const shocks = shocksFor(State.country, State.indicator);
    setHtml('#uniAiAnomalies', shocks.length ? shocks.slice(0, 6).map((x) =>
      '<div class="nv-item" data-tone="' + (Math.abs(x.z) > 3 ? 'risk' : 'warn') + '"><span class="nv-item-icon">' + (x.z > 0 ? '📈' : '📉') + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(t('uni.ew.shock') + ' · ' + x.year) + '</div>' +
      '<div class="nv-item-text">' + U.esc(indLabel(State.indicator)) + ' → ' + U.fmt(x.value, 1) + ' % · z = ' + U.signed(x.z, 2) + 'σ (MAD)</div></div>' +
      '<div class="nv-item-side"><b>' + U.fmt(x.value, 1) + '%</b><span>' + U.esc(String(x.year)) + '</span></div></div>').join('')
      : '<div class="nv-note">' + U.esc(t('uni.ai.noAnomaly')) + '</div>');
  }

  /* ------------------------------------------------------------- simulateur */
  function renderSim() {
    const sim = simulate({
      country: State.country, horizon: State.horizon, trials: 1200,
      levers: State.levers, budget: State.budget, quality: State.quality, equityPct: State.equityPct
    });
    State.lastSim = sim;
    const ind = sim.indicators[State.indicator] || sim.indicators.stunting;
    const gdp = sim.gdp;
    /* pastilles de levier */
    sim.programmes.forEach((r) => {
      const c = root.querySelector('[data-lever-chip="' + r.id + '"]');
      if (c) { c.textContent = U.pct(r.coverage, 0) + (r.capped ? ' ⚠' : ''); c.className = 'nv-chip nv-chip-' + (r.coverage >= r.maxCoverage * 0.98 ? 'warn' : r.coverage > 0 ? 'good' : 'neutral'); }
    });
    setHtml('#uniSimKpis',
      UI.kpi({ label: t('uni.sim.cost'), value: money(sim.totalCost), icon: '💵', tone: sim.overBudget ? 'warn' : 'info', chip: sim.overBudget ? t('uni.sim.over') : t('uni.sim.within'), hint: '<span class="nv-note">' + U.esc(fr() ? 'Coût annuel ' : 'Annual cost ') + money(sim.annualCost) + ' · ' + U.esc(sim.horizon + ' ' + t('uni.common.years')) + (sim.scale < 1 ? ' · ×' + U.fmt(sim.scale, 2) : '') + '</span>' }) +
      UI.kpi({ label: t('uni.sim.reached'), value: U.compact(sim.reached), icon: '👶', tone: 'good', hint: '<span class="nv-note">' + U.esc(U.pct(sim.reached / Math.max(1, sim.u5), 0) + ' ' + t('uni.common.of') + ' ' + U.compact(sim.u5)) + ' ' + U.esc(t('uni.hero.u5')) + '</span>' }) +
      UI.kpi({ label: t('uni.sim.averted'), value: U.compact(sim.totals.cases), icon: '🛡️', tone: 'ok', chip: indLabel(State.indicator, true) + ' ' + U.signed(ind.delta.p50, 1) + ' pp', hint: '<span class="nv-note">IC 90 % : ' + U.signed(ind.delta.p10, 1) + ' → ' + U.signed(ind.delta.p90, 1) + ' pp</span>' }) +
      UI.kpi({ label: t('uni.sim.daly'), value: U.compact(sim.totals.daly), icon: '🌿', tone: 'good', hint: '<span class="nv-note">' + U.esc(fr() ? 'Poids DALY illustratifs par cas évité' : 'Illustrative DALY weights per case averted') + '</span>' }) +
      UI.kpi({ label: t('uni.sim.costDaly'), value: sim.totals.costDaly == null ? '—' : '$' + U.compact(sim.totals.costDaly), icon: '⚖️', tone: sim.totals.verdict === 'veryCE' ? 'good' : sim.totals.verdict === 'ce' ? 'ok' : 'warn', chip: sim.totals.ratioGdp != null ? U.fmt(sim.totals.ratioGdp, 2) + ' ' + t('uni.common.vsGdp') : '—', hint: '<span class="nv-note">' + U.esc(sim.totals.verdict ? t('uni.sim.' + sim.totals.verdict) : t('uni.sim.noLever')) + '</span>' }) +
      UI.kpi({ label: t('uni.sim.roi'), value: sim.totals.roi ? '×' + U.fmt(sim.totals.roi, 1) : '—', icon: '📈', tone: sim.totals.roi >= 3 ? 'good' : sim.totals.roi >= 1 ? 'ok' : 'warn', hint: '<span class="nv-note">' + U.esc(fr() ? 'Valeur d\'un DALY = 1 × PIB/habitant (' : 'Value of a DALY = 1 × GDP/capita (') + money(gdp) + ')</span>' }));
    /* graphique : référence vs intervention */
    const past = ind.past.slice(-12), years = ind.years.slice(-12);
    const nulls = new Array(past.length).fill(null);
    const bridge = new Array(past.length - 1).fill(null).concat([past[past.length - 1]]);
    mountChart('uniSim', chartHost('uniSim'), {
      type: 'line', height: 300, labels: years.map(String).concat(ind.futureLabels),
      series: [
        { name: t('uni.fc.history'), data: past.concat(nulls.slice(0, ind.futureLabels.length)), color: '#38f0a5', fill: true, width: 2.6, points: false },
        { name: t('uni.sim.baseline'), data: bridge.concat(ind.baseline), color: '#94a3b8', dash: '6 4', width: 2, points: false },
        { name: t('uni.sim.intervention'), data: bridge.concat(ind.intervention), color: '#a3e635', width: 2.8, points: false }
      ],
      cone: { p10: ind.p10, p90: ind.p90, start: past.length - 1, color: '#a3e635' },
      splitAt: past.length - 1, splitLabel: t('uni.fc.split'),
      y: { unit: '%', digits: 1 },
      goal: ind.ind.target2030 ? { value: U.round(past[past.length - 1] * ind.ind.target2030, 1), label: t('uni.fc.whoTarget') } : null
    });
    setHtml('#uniSimMeta',
      '<div class="nv-row">' +
        UI.chip(indLabel(State.indicator, true) + ' : ' + U.fmt(ind.endBase, 1) + ' % → ' + U.fmt(ind.endInt, 1) + ' %', 'ok') +
        UI.chip('Δ ' + U.signed(ind.delta.p50, 2) + ' pp (IC 90 % ' + U.signed(ind.delta.p10, 2) + ' → ' + U.signed(ind.delta.p90, 2) + ')', ind.delta.p50 > 0 ? 'good' : 'neutral') +
        UI.chip((fr() ? 'Réduction relative ' : 'Relative reduction ') + U.pct(Math.abs(ind.deltaRel), 0), 'info') +
        (ind.targetYear ? UI.chip((fr() ? 'Cible atteinte en ' : 'Target reached in ') + ind.targetYear, 'good') : UI.chip(fr() ? 'Cible 2030 non atteinte sur cet horizon' : '2030 target not reached in this horizon', 'warn')) +
        UI.chip(U.fmtInt(sim.trials) + ' ' + t('uni.fc.meta.trials') + ' · ' + U.fmtInt(sim.ms) + ' ms', 'neutral') +
        UI.chip(t('uni.sim.synergy') + ' ×0.92', 'neutral') +
        (sim.overBudget ? UI.chip(t('uni.sim.over') + ' (×' + U.fmt(sim.scale, 2) + ')', 'risk') : '') +
      '</div>');
    /* frontière de coût-efficacité */
    setHtml('#uniSimTable', sim.programmes.length ? UI.table([
      { key: 'priority', label: '#', align: 'center', render: (v) => '<b>' + v + '</b>' },
      { key: 'label', label: t('uni.sim.col.programme'), render: (v, r) => r.icon + ' ' + U.esc(v) + (r.capped ? ' <span class="nv-chip nv-chip-warn">' + U.esc(fr() ? 'plafond' : 'capped') + '</span>' : '') },
      { key: 'coverage', label: t('uni.sim.col.coverage'), align: 'right', render: (v) => U.pct(v, 0) },
      { key: 'reach', label: t('uni.sim.col.reach'), align: 'right', render: (v) => U.compact(v) },
      { key: 'effect', label: t('uni.sim.col.effect'), align: 'right', render: (v, r) => U.esc(r.mainLabel) + ' −' + U.pct(v, 1) },
      { key: 'cost', label: t('uni.sim.col.cost'), align: 'right', render: (v) => money(v) },
      { key: 'costDaly', label: t('uni.sim.col.costDaly'), align: 'right', render: (v) => v == null ? '—' : '$' + U.compact(v) }
    ], sim.programmes.map((r) => ({ __tone: r.priority <= 3 ? 'good' : null, priority: r.priority, label: r.label, icon: r.icon, coverage: r.coverage, capped: r.capped, reach: r.reach, effect: r.effect, mainLabel: r.mainLabel, cost: r.cost, costDaly: r.costDaly })))
      : '<div class="nv-note">' + U.esc(t('uni.sim.noLever')) + '</div>');
  }

  /* ------------------------------------------------------------ hotspots */
  function renderHotspots() {
    const list = hotspots(State.country);
    const cols = ['stunting', 'wasting', 'anaemia', 'ebf', 'minDiet', 'coverage'];
    const rows = list.slice(0, 12);
    /* normalisation par colonne (0 = meilleur, 100 = pire) */
    const norm = cols.map((c) => {
      const arr = list.map((d) => c === 'coverage' ? d.coverage * 100 : d.vals[c]);
      const mn = S.min(arr), mx = S.max(arr);
      return arr.map((v) => {
        const f = mx > mn ? (v - mn) / (mx - mn) : 0.5;
        return U.round((c === 'ebf' || c === 'minDiet' || c === 'coverage' ? (1 - f) : f) * 100, 1);
      });
    });
    mountChart('uniHeat', chartHost('uniHeat'), {
      type: 'heatmap', height: 340, min: 0, max: 100,
      rows: rows.map((d) => d.name),
      cols: cols.map((c) => c === 'coverage' ? (fr() ? 'Couverture' : 'Coverage') : indLabel(c, true)),
      values: rows.map((d, i) => cols.map((c, j) => norm[j][i]))
    });
    /* équité */
    const eq = equityStats(State.country);
    setHtml('#uniEquity',
      UI.meter({ label: t('uni.hs.urbanRural'), value: U.clamp((eq.ratioRuralUrban - 1) * 100, 0, 100), text: '×' + U.fmt(eq.ratioRuralUrban, 2), color: eq.ratioRuralUrban > 1.35 ? TH.tones.risk : eq.ratioRuralUrban > 1.15 ? TH.tones.warn : TH.tones.good, scale: [fr() ? 'parité' : 'parity', '×1.5', '×2'] }) +
      UI.meter({ label: t('uni.hs.quintile') + ' (' + indLabel(eq.indicator, true) + ')', value: U.clamp((eq.ratioQuintile - 1) * 60, 0, 100), text: '×' + U.fmt(eq.ratioQuintile, 2), color: eq.ratioQuintile > 1.8 ? TH.tones.risk : eq.ratioQuintile > 1.35 ? TH.tones.warn : TH.tones.good }) +
      UI.meter({ label: t('uni.hs.dispersion'), value: U.clamp((eq.dispersion - 1) * 40, 0, 100), text: U.fmt(eq.p10, 1) + ' → ' + U.fmt(eq.p90, 1) + ' %', color: eq.dispersion > 2 ? TH.tones.risk : eq.dispersion > 1.5 ? TH.tones.warn : TH.tones.good }) +
      UI.meter({ label: t('uni.hs.gini'), value: U.clamp(eq.gini * 100, 0, 100), text: U.fmt(eq.gini, 3), color: eq.gini > 0.3 ? TH.tones.risk : eq.gini > 0.18 ? TH.tones.warn : TH.tones.good }));
    /* districts prioritaires */
    setHtml('#uniHotList', list.slice(0, 5).map((d) =>
      '<div class="nv-item" data-tone="' + d.tone + '"><span class="nv-item-icon">' + (d.rank === 1 ? '🥇' : d.rank === 2 ? '🥈' : d.rank === 3 ? '🥉' : '📍') + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(d.name) + '</div>' +
      '<div class="nv-item-text">' + U.compact(d.u5) + ' ' + U.esc(t('uni.hs.col.u5')) + ' · ' + U.esc(indLabel('stunting', true)) + ' ' + U.fmt(d.vals.stunting, 1) + ' % · ' + U.esc(indLabel('wasting', true)) + ' ' + U.fmt(d.vals.wasting, 1) + ' % · ' + U.esc(t('uni.hs.col.coverage')) + ' ' + U.pct(d.coverage, 0) + '</div></div>' +
      '<div class="nv-item-side"><b>' + U.fmt(d.risk, 0) + '</b><span class="nv-chip nv-chip-' + d.tone + '">' + U.esc(d.stunted >= 1e5 ? U.compact(d.stunted) + ' ' + t('uni.common.cases') : U.esc(t('uni.hs.col.risk'))) + '</span></div></div>').join(''));
    /* tableau complet */
    setHtml('#uniHotTable', UI.table([
      { key: 'rank', label: '#', align: 'center', render: (v) => '<b>' + v + '</b>' },
      { key: 'name', label: t('uni.hs.col.district'), render: (v, r) => '<b>' + U.esc(v) + '</b>' + (State.focusDistrict === v ? ' <span class="nv-chip nv-chip-info">🎯</span>' : '') + '<br><span class="nv-note">' + U.esc(r.rural >= 55 ? t('uni.common.rural') : t('uni.common.urban')) + ' ' + r.rural + ' %</span>' },
      { key: 'u5', label: t('uni.hs.col.u5'), align: 'right', render: (v) => U.compact(v) },
      { key: 'risk', label: t('uni.hs.col.risk'), align: 'right', render: (v, r) => '<b style="color:' + TH.tone(r.tone) + '">' + U.fmt(v, 1) + '</b>' },
      { key: 'stunted', label: t('uni.hs.col.burden'), align: 'right', render: (v) => U.compact(v) },
      { key: 'coverage', label: t('uni.hs.col.coverage'), align: 'right', render: (v) => U.pct(v, 0) },
      { key: 'lastSurvey', label: t('uni.dq.col.year'), align: 'center' },
      { key: 'trend', label: t('uni.hs.col.trend'), align: 'right', render: (v) => '<span class="nv-chip nv-chip-' + (v < -0.35 ? 'good' : v > 0.35 ? 'risk' : 'neutral') + '">' + U.signed(v, 2) + ' pp</span>' },
      { key: 'name', label: '', align: 'center', render: (v) => '<button class="nv-btn" data-nv-action="uni-focus" data-nv-arg="' + U.esc(v) + '">' + U.esc(t('uni.hs.focus')) + '</button>' }
    ], list.map((d) => ({ __tone: d.tone === 'risk' ? 'risk' : null, rank: d.rank, name: d.name, u5: d.u5, risk: d.risk, tone: d.tone, stunted: d.stunted, coverage: d.coverage, lastSurvey: d.lastSurvey, trend: d.trend, rural: d.rural }))));
  }

  /* ---------------------------------------------------------------- couche GIS */
  function gisValue(d, layer) {
    if (layer === 'risk') return d.risk / 100;
    if (layer === 'coverage') return 1 - d.coverage;
    const ind = IND_BY_ID[layer] || IND_BY_ID.stunting;
    const arr = districts(State.country).map((x) => x.vals[layer]);
    const mn = S.min(arr), mx = S.max(arr);
    const f = mx > mn ? (d.vals[layer] - mn) / (mx - mn) : 0.5;
    return ind.good === 'up' ? 1 - f : f;
  }
  function renderGisInto(host) {
    if (!host) return;
    const list = districts(State.country);
    const rng = RNG('uni-gis-' + State.country);
    const W = 660, Hh = 250, cols = 4, rowsN = 3;
    const cw = W / cols, ch = Hh / rowsN;
    const tiles = list.slice(0, cols * rowsN).map((d, i) => {
      const cx = (i % cols) * cw + cw / 2 + (rng.next() - 0.5) * 12;
      const cy = Math.floor(i / cols) * ch + ch / 2 + (rng.next() - 0.5) * 10;
      const sev = U.clamp(gisValue(d, State.gisLayer), 0, 1);
      return { d: d, cx: cx, cy: cy, sev: sev, color: TH.scale(sev), w: cw * 0.82, h: ch * 0.76 };
    });
    const layerLabel = State.gisLayer === 'risk' ? (fr() ? 'Indice de risque composite' : 'Composite risk index') : State.gisLayer === 'coverage' ? (fr() ? 'Insuffisance de couverture des données' : 'Data coverage gap') : indLabel(State.gisLayer);
    host.innerHTML =
      '<div class="nv-uni-gis" role="img" aria-label="' + U.esc(t('uni.gis.title')) + '">' +
        '<svg viewBox="0 0 ' + W + ' ' + Hh + '" preserveAspectRatio="xMidYMid meet">' +
          '<defs><linearGradient id="uniGisSweep" x1="0" y1="0" x2="1" y2="0">' +
            '<stop offset="0%" stop-color="#38f0a5" stop-opacity="0"/><stop offset="50%" stop-color="#38f0a5" stop-opacity=".22"/><stop offset="100%" stop-color="#38f0a5" stop-opacity="0"/>' +
          '</linearGradient></defs>' +
          tiles.map((tl, i) =>
            '<g class="nv-uni-tile' + (State.focusDistrict === tl.d.name ? ' sel' : '') + '" data-district="' + U.esc(tl.d.name) + '" data-i="' + i + '" tabindex="0" role="button">' +
              '<rect x="' + U.round(tl.cx - tl.w / 2, 1) + '" y="' + U.round(tl.cy - tl.h / 2, 1) + '" width="' + U.round(tl.w, 1) + '" height="' + U.round(tl.h, 1) + '" rx="12" fill="' + TH.withAlpha(tl.color, 0.24) + '" stroke="' + tl.color + '" stroke-width="1.6"/>' +
              '<circle cx="' + U.round(tl.cx, 1) + '" cy="' + U.round(tl.cy - 6, 1) + '" r="' + U.round(4 + tl.sev * 9, 1) + '" fill="' + tl.color + '" opacity=".92"/>' +
              '<text x="' + U.round(tl.cx, 1) + '" y="' + U.round(tl.cy + 16, 1) + '" text-anchor="middle" class="nv-uni-tile-t">' + U.esc(tl.d.name) + '</text>' +
              '<text x="' + U.round(tl.cx, 1) + '" y="' + U.round(tl.cy + 30, 1) + '" text-anchor="middle" class="nv-uni-tile-v">' +
                (State.gisLayer === 'risk' ? U.fmt(tl.d.risk, 0) + '/100' : State.gisLayer === 'coverage' ? U.pct(tl.d.coverage, 0) : U.fmt(tl.d.vals[State.gisLayer], 1) + '%') + '</text>' +
            '</g>').join('') +
          '<rect class="nv-uni-sweep" x="0" y="0" width="' + (W / 3) + '" height="' + Hh + '" fill="url(#uniGisSweep)"/>' +
        '</svg>' +
        '<div class="nv-uni-gisfoot"><span class="nv-note">' + U.esc(t('uni.gis.sub')) + '</span>' +
        '<span class="nv-note">' + U.esc(layerLabel) + ' · ' + tiles.length + ' ' + U.esc(t('uni.gis.tiles')) + '</span></div>' +
      '</div>';
    /* interactions : survol (tooltip) + clic (focus district) */
    U.qsa('.nv-uni-tile', host).forEach((g) => {
      const nm = g.getAttribute('data-district');
      const d = list.filter((x) => x.name === nm)[0];
      if (!d) return;
      g.addEventListener('mouseenter', (e) => {
        CH.tooltip.show('<div class="nv-tip-title">' + U.esc(d.name) + '</div>' +
          CH.tooltip.row(TH.scale(d.risk / 100), t('uni.hs.col.risk'), U.fmt(d.risk, 1) + '/100') +
          CH.tooltip.row(TH.tones.good, indLabel('stunting', true), U.fmt(d.vals.stunting, 1) + ' %') +
          CH.tooltip.row(TH.tones.warn, indLabel('wasting', true), U.fmt(d.vals.wasting, 1) + ' %') +
          CH.tooltip.row(TH.tones.risk, indLabel('anaemia', true), U.fmt(d.vals.anaemia, 1) + ' %') +
          CH.tooltip.row(TH.tones.info, t('uni.hs.col.u5'), U.compact(d.u5)), e);
      });
      g.addEventListener('mousemove', (e) => CH.tooltip.show(null, e));
      g.addEventListener('mouseleave', () => CH.tooltip.hide());
      const act = () => { setFocusDistrict(d.name); };
      g.addEventListener('click', act);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
    setTxt('#uniGisSel', State.focusDistrict ? (t('uni.gis.selected') + ' : ' + State.focusDistrict) : (fr() ? 'Aucun district sélectionné' : 'No district selected'));
  }
  function renderGis() { renderGisInto(root ? root.querySelector('#unicefGIS') : null); }

  /* ------------------------------------------------------------ alerte précoce */
  function renderWarning() {
    const list = warningList(State.country, State.horizon);
    setHtml('#uniWarnList', list.map((w) =>
      '<div class="nv-item" data-tone="' + w.tone + '"><span class="nv-item-icon">' + w.icon + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(w.label) + ' · ' + U.esc(t('uni.ew.severity.' + w.severity)) + '</div>' +
      '<div class="nv-item-text">' +
        (w.already ? (fr() ? 'Seuil OMS déjà franchi aujourd\'hui (' : 'WHO threshold already breached today (') : (fr() ? 'Seuil OMS ' : 'WHO threshold ') + (IND_BY_ID[w.id].good === 'up' ? '≤ ' : '≥ ') + w.threshold + ' % · ' + (fr() ? 'P(franchissement d\'ici ' : 'P(breach by ') + (LAST_YEAR + State.horizon) + ') ') + U.pct(w.pBreach, 0) +
        (w.breachYear ? ' · ' + U.esc(t('uni.ew.breachYear')) + ' ' + w.breachYear : '') +
        ' · ' + U.esc(t('uni.ew.action')) + ' : ' + U.esc(progLabel(w.action)) +
      '</div></div>' +
      '<div class="nv-item-side"><b>' + U.fmt(w.current, 1) + '%</b><span class="nv-chip nv-chip-' + w.tone + '">' + U.pct(w.pBreach, 0) + '</span></div></div>').join(''));
    mountChart('uniWarn', chartHost('uniWarn'), {
      type: 'bars', height: 280, horizontal: true,
      labels: list.map((w) => w.icon + ' ' + indLabel(w.id, true)),
      series: [{ name: t('uni.ew.pBreach'), data: list.map((w) => U.round(w.pBreach * 100, 1)), color: '#f5c451' }],
      y: { unit: '%', digits: 0 }
    });
    const crit = list.filter((w) => w.severity === 'critical').length;
    setTxt('#uniWarnNote', (fr() ? 'Signaux critiques : ' : 'Critical signals: ') + crit + ' / ' + list.length +
      ' · ' + (fr() ? 'horizon ' : 'horizon ') + State.horizon + ' ' + t('uni.common.years') +
      ' · ' + (fr() ? 'trajectoires Monte-Carlo par indicateur : 900' : 'Monte-Carlo paths per indicator: 900'));
    return list;
  }

  /* -------------------------------------------------------- qualité des données */
  function renderData() {
    const dq = dataQuality(State.country), rd = readiness(State.country);
    mountChart('uniDq', chartHost('uniDq'), {
      type: 'gauge', value: rd, min: 0, max: 100, digits: 0, unit: '%',
      bands: [{ from: 0, to: 45, color: TH.tones.risk }, { from: 45, to: 62, color: TH.tones.warn }, { from: 62, to: 80, color: TH.tones.ok }, { from: 80, to: 100, color: TH.tones.good }],
      label: t('uni.dq.gauge'), sub: countryName(State.country)
    });
    setTxt('#uniDqNote', (fr() ? 'Moyenne pondérée de la confiance par indicateur · sources : ' : 'Weighted mean of per-indicator confidence · sources: ') + dq.map((x) => x.source.label.split(' (')[0]).filter((v, i, a) => a.indexOf(v) === i).join(' · '));
    setHtml('#uniDqTable', UI.table([
      { key: 'label', label: t('uni.dq.col.indicator'), render: (v, r) => r.icon + ' ' + U.esc(v) },
      { key: 'source', label: t('uni.dq.col.source'), render: (v) => U.esc(v.label) },
      { key: 'lastRound', label: t('uni.dq.col.year'), align: 'center' },
      { key: 'completeness', label: t('uni.dq.col.completeness'), align: 'right', render: (v) => U.pct(v, 0) },
      { key: 'timeliness', label: t('uni.dq.col.timeliness'), align: 'right', render: (v) => U.pct(v, 0) },
      { key: 'confidence', label: t('uni.dq.col.confidence'), align: 'right', render: (v, r) => '<span class="nv-chip nv-chip-' + r.tone + '">' + U.pct(v, 0) + '</span>' }
    ], dq));
  }

  /* ------------------------------------------------------------------- pied */
  function renderFooter() {
    const n = IND_IDS.length, d = districts(State.country).length;
    setTxt('#uniFootMeta', (fr() ? 'Noyau NutriVision ' : 'NutriVision core ') + NV.version +
      ' · ' + n + ' ' + (fr() ? 'indicateurs' : 'indicators') + ' · ' + d + ' ' + t('uni.common.districts') +
      ' · ' + PROGRAMMES.length + ' ' + (fr() ? 'programmes modélisés' : 'modelled programmes') +
      ' · ' + U.fmtInt(State.trials) + ' ' + t('uni.fc.meta.trials') +
      ' · ' + (fr() ? 'séries ' : 'series ') + FIRST_YEAR + '→' + LAST_YEAR);
  }

  /* ==========================================================================
     6. PORTÉE ADMINISTRATIVE — le sélecteur hérité #unicefLevel pilote tout le
        cockpit : National / Region / District recalculent séries, prévisions,
        simulation, alertes et charge de morbidité.
     ====================================================================== */
  function focusDistrictObj() {
    const list = districts(State.country);
    if (State.focusDistrict) { const f = list.filter((d) => d.name === State.focusDistrict)[0]; if (f) return f; }
    return null;
  }
  function scopeVals() {
    const a = anchor(State.country), list = districts(State.country);
    if (State.level === 'District') {
      const d = focusDistrictObj() || list.slice().sort((x, y) => y.risk - x.risk)[0];
      return { level: 'District', label: d.name, vals: d.vals, u5: d.u5, coverage: d.coverage, district: d };
    }
    if (State.level === 'Region') {
      const half = list.slice(0, Math.max(2, Math.ceil(list.length / 2)));
      const u5 = S.sum(half.map((d) => d.u5)) || 1;
      const vals = {};
      IND_IDS.forEach((k) => { vals[k] = U.round(S.sum(half.map((d) => d.vals[k] * d.u5)) / u5, 1); });
      const cov = S.sum(half.map((d) => d.coverage * d.u5)) / u5;
      return { level: 'Region', label: (fr() ? 'Région programmatique' : 'Programmatic region') + ' · ' + half.length + ' ' + t('uni.common.districts'), vals: vals, u5: u5, coverage: cov, districts: half };
    }
    const vals = {};
    IND_IDS.forEach((k) => { vals[k] = U.num(a[k], 0); });
    return { level: 'National', label: t('uni.common.national') + ' · ' + countryName(State.country), vals: vals, u5: U.num(a.u5, 3) * 1e6, coverage: a.monitored / (U.num(a.u5, 3) * 1e6) };
  }
  /* ancrage effectif : national, régional ou district selon #unicefLevel */
  function effAnchor() {
    const a = anchor(State.country), s = scopeVals(), out = {};
    for (const k in a) out[k] = a[k];
    IND_IDS.forEach((k) => { out[k] = s.vals[k]; });
    out.u5 = s.u5 / 1e6;
    out.monitored = Math.round(s.u5 * U.clamp(s.coverage, 0.02, 0.95));
    out.__scope = s.label;
    out.__level = s.level;
    return out;
  }
  function scopeAnchor(code) {
    return String(code || '').toUpperCase() === String(State.country).toUpperCase() ? effAnchor() : anchor(code);
  }
  function scopeKey() { return State.level + '|' + (State.focusDistrict || '-'); }

  /* ==========================================================================
     7. ENRICHISSEMENT DU BALISAGE HÉRITÉ (rien n'est supprimé)
     ====================================================================== */
  const LEGACY_IDS = ['unicefChildren', 'unicefStunting', 'unicefWasting', 'unicefAnaemia', 'unicefEBF'];
  function enhanceLegacy() {
    if (!root) return;
    /* 7.1 le canvas Chart.js injecté par la couche V38 : masqué, remplacé par un
           graphique NutriVision réel (barres par tranche d'âge) */
    const canvas = root.querySelector('#v38-unicef');
    if (canvas) {
      canvas.style.display = 'none';
      canvas.setAttribute('aria-hidden', 'true');
      const wrap = canvas.closest('.v38-chart-wrap') || canvas.parentElement;
      if (wrap && !wrap.querySelector('[data-chart="uniAgeBars"]')) {
        const host = document.createElement('div');
        host.className = 'nv-chart-host';
        host.dataset.chart = 'uniAgeBars';
        host.style.height = '230px';
        wrap.appendChild(host);
      }
    }
    renderAgeBars();
    /* 7.2 les KPI V38 (valeurs codées en dur) sont resynchronisés sur nos données */
    const v38 = root.querySelectorAll('.v38-kpis .v38-kpi');
    if (v38.length >= 4) {
      const s = scopeVals(), a = effAnchor();
      const rows = [
        [t('uni.hero.monitored'), U.fmtInt(a.monitored), U.esc(t('uni.hero.coverage')) + ' ' + U.pct(s.coverage, 0)],
        [indLabel('ebf'), U.fmt(s.vals.ebf, 1) + '%', U.esc(indLabel('ebf'))],
        [indLabel('stunting', true) + ' 6–24 ' + (fr() ? 'mois' : 'm'), U.fmt(s.vals.stunting, 1) + '%', U.esc(fr() ? 'Retard de croissance' : 'Stunting')],
        [indLabel('matAnaemia'), U.fmt(s.vals.matAnaemia, 1) + '%', U.esc(fr() ? 'Femmes enceintes' : 'Pregnant women')]
      ];
      rows.forEach((r, i) => {
        const c = v38[i];
        if (!c) return;
        const lab = c.querySelector('.v38-kpi-label'), val = c.querySelector('.v38-kpi-value'), tr = c.querySelector('.v38-kpi-trend');
        if (lab) lab.textContent = r[0];
        if (val) val.textContent = r[1];
        if (tr) tr.innerHTML = r[2];
      });
    }
    /* 7.3 carte héritée « Malnutrition Trends » : vrai graphique NV à la place
           des barres CSS (le conteneur #unicefTrendChart est conservé) */
    const trend = root.querySelector('#unicefTrendChart');
    if (trend) {
      const bars = trend.querySelector('.trend-bars');
      if (bars) bars.style.display = 'none';
      if (!trend.querySelector('[data-chart="uniTrend"]')) {
        const host = document.createElement('div');
        host.className = 'nv-chart-host';
        host.dataset.chart = 'uniTrend';
        host.style.height = '206px';
        trend.appendChild(host);
      }
      renderTrendChart();
    }
    /* 7.4 les cinq KPI institutionnels gardent leurs ids : on ajoute étincelle
           et pastille de statut, sans toucher au texte rempli par renderUNICEF() */
    const specs = [
      { id: 'unicefStunting', ind: 'stunting' }, { id: 'unicefWasting', ind: 'wasting' },
      { id: 'unicefAnaemia', ind: 'anaemia' }, { id: 'unicefEBF', ind: 'ebf' },
      { id: 'unicefChildren', ind: null }
    ];
    specs.forEach((sp) => {
      const el = root.querySelector('#' + sp.id);
      if (!el) return;
      const card = el.closest('.inst-kpi');
      if (!card) return;
      card.classList.add('nv-kpi-card');
      if (!card.querySelector('.nv-kpi-spark')) {
        const box = document.createElement('div');
        box.className = 'nv-kpi-spark';
        if (sp.ind) {
          const s = seriesFor(State.country, sp.ind);
          box.innerHTML = '<div class="nv-chart-host" data-spark="' + JSON.stringify(s.values.slice(-14)) + '" data-spark-color="' + TH.tone(toneOf(IND_BY_ID[sp.ind], s.values[s.values.length - 1])) + '" style="height:26px"></div>';
        } else {
          box.innerHTML = '<div class="nv-chart-host" data-spark="' + JSON.stringify(districts(State.country).map((d) => d.u5 / 1000)) + '" data-spark-color="' + TH.tones.info + '" style="height:26px"></div>';
        }
        card.appendChild(box);
      }
      if (sp.ind && !card.querySelector('.nv-kpi-chip')) {
        const s = seriesFor(State.country, sp.ind), last = s.values[s.values.length - 1];
        const chip = document.createElement('span');
        chip.className = 'nv-chip nv-kpi-chip nv-chip-' + toneOf(IND_BY_ID[sp.ind], last);
        chip.textContent = toneOf(IND_BY_ID[sp.ind], last) === 'good' ? (fr() ? 'sous contrôle' : 'under control') : toneOf(IND_BY_ID[sp.ind], last) === 'warn' ? (fr() ? 'à surveiller' : 'watch') : (fr() ? 'critique' : 'critical');
        el.insertAdjacentElement('afterend', chip);
      }
    });
    sparkAll(root);
    /* 7.5 signaux hérités #unicefAlerts : les deux lignes d'origine restent,
           on ajoute les signaux réels issus du Monte-Carlo */
    const alerts = root.querySelector('#unicefAlerts');
    if (alerts && !alerts.querySelector('[data-nv-warn]')) {
      const box = document.createElement('div');
      box.setAttribute('data-nv-warn', '1');
      box.className = 'nv-list';
      alerts.appendChild(box);
      renderLegacyAlerts(box);
    } else if (alerts) {
      renderLegacyAlerts(alerts.querySelector('[data-nv-warn]'));
    }
    /* 7.6 le bouton hérité « Explore GIS » ouvre désormais l'atelier SIG.
           Repérage par data-i18n (indépendant de la langue) puis par structure :
           le bouton de l'en-tête de la carte qui contient #unicefGIS. */
    const gisCard = root.querySelector('#unicefGIS');
    const gisBtn = root.querySelector('[data-i18n="ui.explore_gis"]') ||
      (gisCard && gisCard.closest('.card') ? gisCard.closest('.card').querySelector('.section-head button, button') : null) ||
      U.qsa('button', root).filter((b) => /explore gis/i.test(b.textContent || ''))[0];
    if (gisBtn && !gisBtn.__nvGis) {
      gisBtn.__nvGis = true;
      const legacy = gisBtn.getAttribute('onclick');
      gisBtn.setAttribute('onclick', '');
      /* le comportement hérité (toast) est conservé, puis l'atelier SIG réel */
      gisBtn.__nvGisHandler = function () {
        if (legacy) { try { global.eval(legacy); } catch (err) { } }
        openGisModal();
      };
      gisBtn.addEventListener('click', function (e) {
        e.preventDefault();
        gisBtn.__nvGisHandler();
      });
      if (NV.guard) NV.guard.mark(gisBtn);
    }
  }
  function renderLegacyAlerts(box) {
    if (!box) return;
    const list = warningList(State.country, State.horizon).slice(0, 4);
    box.innerHTML = list.map((w) =>
      '<div class="nv-item" data-tone="' + w.tone + '"><span class="nv-item-icon">' + w.icon + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(w.label) + ' · ' + U.esc(t('uni.ew.severity.' + w.severity)) + '</div>' +
      '<div class="nv-item-text">' + U.esc((w.already ? (fr() ? 'Seuil déjà franchi' : 'Threshold already breached') : (fr() ? 'P(franchissement) ' : 'P(breach) ') + U.pct(w.pBreach, 0)) + ' · ' + t('uni.ew.action') + ' : ' + progLabel(w.action)) + '</div></div>' +
      '<div class="nv-item-side"><b>' + U.fmt(w.current, 1) + '%</b><span>' + U.esc(w.breachYear ? String(w.breachYear) : '—') + '</span></div></div>').join('');
  }
  function renderAgeBars() {
    const host = root.querySelector('[data-chart="uniAgeBars"]');
    if (!host) return;
    const s = scopeVals();
    const bands = [
      ['0–6 ' + (fr() ? 'mois' : 'm'), s.vals.ebf, IND_BY_ID.ebf],
      ['6–23 ' + (fr() ? 'mois' : 'm'), s.vals.stunting, IND_BY_ID.stunting],
      ['6–59 ' + (fr() ? 'mois' : 'm'), s.vals.wasting, IND_BY_ID.wasting],
      ['5–12 ' + (fr() ? 'ans' : 'y'), s.vals.overweight, IND_BY_ID.overweight],
      ['15–49 ' + (fr() ? 'ans' : 'y'), s.vals.matAnaemia, IND_BY_ID.matAnaemia]
    ];
    mountChart('uniAgeBars', host, {
      type: 'bars', height: 230, horizontal: false,
      labels: bands.map((b) => b[0]),
      series: [{ name: fr() ? 'Prévalence' : 'Prevalence', data: bands.map((b) => b[1]), color: '#22d3ee' }],
      y: { unit: '%', digits: 0 }
    });
  }
  function renderTrendChart() {
    const host = root.querySelector('[data-chart="uniTrend"]');
    if (!host) return;
    const H = 5;
    const f = forecastInd(State.country, State.indicator, H, { trials: 700, drift: 0 });
    const past = f.past.slice(-14), years = f.years.slice(-14);
    const bridge = new Array(past.length - 1).fill(null).concat([past[past.length - 1]]);
    mountChart('uniTrend', host, {
      type: 'line', height: 206, labels: years.map(String).concat(yearLabels(H)),
      series: [
        { name: t('uni.fc.history'), data: past.concat(new Array(H).fill(null)), color: '#38f0a5', fill: true, width: 2.4, points: false },
        { name: 'P50', data: bridge.concat(f.fc.point), color: '#22d3ee', dash: '5 4', width: 2, points: false }
      ],
      cone: { p10: f.fc.p10, p90: f.fc.p90, start: past.length - 1, color: '#22d3ee' },
      splitAt: past.length - 1, y: { unit: '%', digits: 1 }
    });
  }

  /* ------------------------------------------------------------------ ponts */
  /* Le sélecteur hérité #unicefLevel n'a pas d'attribut value : la valeur d'une
     option EST son libellé, et la couche i18n de la page traduit ces libellés
     (« Region » → « Région », « National » → « National », etc.). On normalise
     donc dans les deux sens pour que le cockpit suive quelle que soit la langue. */
  function normLevel(v) {
    const s = String(v == null ? '' : v).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/^(dist|sous-dist|sub-dist|d$)/.test(s)) return 'District';
    if (/^(reg|prov|state|zone|prefect|county|r$)/.test(s)) return 'Region';
    if (/^(nat|pays|country|federal|n$)/.test(s)) return 'National';
    return '';
  }
  /* valeur réellement présente dans la liste pour un niveau donné */
  function legacyLevelValue(sel, lvl) {
    if (!sel || !sel.options) return lvl;
    const want = normLevel(lvl) || lvl;
    const hit = Array.prototype.slice.call(sel.options).filter(function (o) {
      return (normLevel(o.value) || normLevel(o.textContent)) === want;
    })[0];
    return hit ? (hit.value || hit.textContent) : lvl;
  }
  function syncFromLegacy() {
    const c = root && root.querySelector('#unicefCountry');
    const l = root && root.querySelector('#unicefLevel');
    const y = root && root.querySelector('#unicefYear');
    let changed = false;
    if (c && c.value && c.value !== State.country) { State.country = c.value; changed = true; }
    if (l) {
      const lv = normLevel(l.value) || normLevel(l.textContent);
      if (lv && lv !== State.level) { State.level = lv; changed = true; }
    }
    if (y && Number(y.value) !== Number(State.year)) { State.year = Number(y.value); changed = true; }
    if (changed) {
      State.focusDistrict = null;
      clearCaches();
      persist();
    }
    return changed;
  }
  function syncToLegacy() {
    const c = root && root.querySelector('#unicefCountry');
    if (c && c.value !== State.country) { try { c.value = State.country; } catch (e) { } }
    const l = root && root.querySelector('#unicefLevel');
    if (l) {
      const want = legacyLevelValue(l, State.level);
      if (l.value !== want) { try { l.value = want; } catch (e) { } }
    }
    const y = root && root.querySelector('#unicefYear');
    if (y && String(y.value) !== String(State.year)) { try { y.value = String(State.year); } catch (e) { } }
  }
  function callLegacyRender() {
    if (typeof global.renderUNICEF === 'function' && !global.renderUNICEF.__nvWrappedInside) {
      global.renderUNICEF.__nvWrappedInside = true;
      try { global.renderUNICEF(); } catch (e) { }
      global.renderUNICEF.__nvWrappedInside = false;
    }
  }
  function bridgeLegacy() {
    const orig = global.renderUNICEF;
    if (typeof orig !== 'function' || orig.__nvWrapped) return;
    const wrapped = function () {
      const r = orig.apply(this, arguments);
      try {
        if (State.mounted) {
          const changed = syncFromLegacy();
          if (changed) renderAll(); else { renderHero(); renderKpis(); enhanceLegacy(); }
        }
      } catch (e) { if (global.console) console.warn('[NutriUnicef]', e); }
      return r;
    };
    wrapped.__nvWrapped = true;
    global.renderUNICEF = wrapped;
  }
  function clearCaches() {
    for (const k in FC_CACHE) delete FC_CACHE[k];
    for (const k in SIM_CACHE) delete SIM_CACHE[k];
    for (const k in SERIES_CACHE) delete SERIES_CACHE[k];
  }

  /* ==========================================================================
     8. INTERACTIONS — chaque contrôle agit réellement sur le cockpit
     ====================================================================== */
  function setSegActive(action, arg) {
    U.qsa('[data-nv-seg="' + action + '"] .nv-seg-btn', root).forEach((b) => {
      b.classList.toggle('active', String(b.getAttribute('data-nv-arg')) === String(arg));
    });
  }
  function sliderOut(key, text) {
    const el = root.querySelector('[data-nv-slider="' + key + '"] output');
    if (el) el.textContent = text;
  }
  function syncSliders() {
    sliderOut('horizon', State.horizon + ' ' + t('uni.fc.years'));
    sliderOut('simHorizon', State.horizon + ' ' + t('uni.fc.years'));
    sliderOut('trials', U.fmtInt(State.trials));
    sliderOut('budget', '$' + U.fmt(State.budget / 1e6, 1) + 'M');
    sliderOut('quality', State.quality + '%');
    sliderOut('equityPct', State.equityPct + '%');
    PROGRAMMES.forEach((p) => sliderOut(p.id, U.num(State.levers[p.id], 0) + '%'));
    const hs = root.querySelector('#uniFcHorizon'), sh = root.querySelector('#uniSimHorizon');
    if (hs) hs.value = State.horizon;
    if (sh) sh.value = State.horizon;
  }
  function applyPreset(id) {
    const p = PRESETS[id];
    if (!p) { State.scenario = 'custom'; return false; }
    State.scenario = id;
    State.budget = p.budget; State.quality = p.quality; State.equityPct = p.equity;
    State.levers = Object.assign({}, p.levers);
    const bs = root.querySelector('#uniSimBudget'); if (bs) bs.value = Math.round(p.budget / 1e6);
    const qs = root.querySelector('#uniSimQuality'); if (qs) qs.value = p.quality;
    const es = root.querySelector('#uniSimEquity'); if (es) es.value = p.equity;
    PROGRAMMES.forEach((pr) => { const el = root.querySelector('#uniLev' + pr.id); if (el) el.value = U.num(p.levers[pr.id], 0); });
    syncSliders();
    return true;
  }
  function onSlider(e) {
    const el = e.target;
    if (!el || el.type !== 'range' || !el.getAttribute('data-nv-key')) return;
    const key = el.getAttribute('data-nv-key'), v = U.num(el.value, 0);
    if (key === 'horizon' || key === 'simHorizon') {
      State.horizon = U.clamp(v | 0, 2, 15);
      sliderOut('horizon', State.horizon + ' ' + t('uni.fc.years'));
      sliderOut('simHorizon', State.horizon + ' ' + t('uni.fc.years'));
      const other = root.querySelector(key === 'horizon' ? '#uniSimHorizon' : '#uniFcHorizon');
      if (other) other.value = State.horizon;
    } else if (key === 'trials') { State.trials = U.clamp(v | 0, 200, 8000); sliderOut('trials', U.fmtInt(State.trials)); }
    else if (key === 'budget') { State.budget = v * 1e6; sliderOut('budget', '$' + U.fmt(v, 1) + 'M'); }
    else if (key === 'quality') { State.quality = v; sliderOut('quality', v + '%'); }
    else if (key === 'equityPct') { State.equityPct = v; sliderOut('equityPct', v + '%'); }
    else if (PROG_BY_ID[key]) { State.levers[key] = v; sliderOut(key, v + '%'); State.scenario = 'custom'; const ps = root.querySelector('#uniSimPreset'); if (ps) ps.value = 'custom'; }
    scheduleRender();
  }
  const scheduleRender = U.debounce(function () {
    persist();
    renderHero(); renderKpis(); renderForecast(); renderSim(); renderWarning(); renderFooter();
    enhanceLegacy();
  }, 220);

  function handleAction(act, arg) {
    switch (act) {
      case 'uni-run-forecast':
        renderForecast(); renderHero(); replayAi();
        UI.toast((fr() ? 'Prévision d\'ensemble recalculée · ' : 'Ensemble forecast recomputed · ') + indLabel(State.indicator) + ' · ' + countryName(State.country), { tone: 'good' });
        break;
      case 'uni-run-sim':
        renderSim();
        UI.toast((fr() ? 'Simulation d\'interventions recalculée' : 'Intervention simulation recomputed'), { tone: 'good' });
        break;
      case 'uni-replay-ai': replayAi(); break;
      case 'uni-refresh':
        clearCaches(); callLegacyRender(); renderAll();
        UI.toast(t('uni.common.refreshed'), { tone: 'info' });
        break;
      case 'uni-report': printReport(); break;
      case 'uni-export-json': exportJSON(); break;
      case 'uni-export-csv': exportCSV(); break;
      case 'uni-export-hotspots': exportHotspots(); break;
      case 'uni-action-plan': openActionPlan(); break;
      case 'uni-gis-open': openGisModal(); break;
      case 'uni-gis-layer':
        State.gisLayer = arg; setSegActive('uni-gis-layer', arg); renderGis(); persist();
        break;
      case 'uni-kpi-view':
        kpiView = arg; setSegActive('uni-kpi-view', arg); renderKpis();
        break;
      case 'uni-focus': setFocusDistrict(arg); break;
      case 'uni-district': openDistrictModal(arg || State.focusDistrict); break;
      case 'uni-select-indicator':
        State.indicator = arg;
        const s = root.querySelector('#uniFcInd'); if (s) s.value = arg;
        clearCaches(); renderAll();
        break;
      default: return false;
    }
    return true;
  }
  function replayAi() {
    const p = State.pipes.ai;
    if (!p) return;
    p.run({ startText: U.esc(t('uni.common.running')), stepMs: 210, onDone: function () { UI.toast(t('uni.common.refreshed'), { tone: 'good' }); } });
  }
  function setFocusDistrict(name) {
    const list = districts(State.country);
    const d = list.filter((x) => x.name === name)[0];
    if (!d) return;
    State.focusDistrict = d.name;
    State.level = 'District';
    syncToLegacy();
    clearCaches(); persist();
    renderAll();
    UI.toast((fr() ? 'Cockpit recentré sur ' : 'Cockpit focused on ') + d.name + ' · ' + t('uni.hs.col.risk') + ' ' + U.fmt(d.risk, 1) + '/100', { tone: 'warn' });
  }

  /* un SELECT change : cockpit ou sélecteurs hérités (pays / niveau / année) */
  function handleSelect(el) {
    if (!el || el.tagName !== 'SELECT') return false;
    if (el.id === 'uniFcInd') { State.indicator = el.value; clearCaches(); renderAll(); }
    else if (el.id === 'uniFcScenario') { State.scenario = el.value; applyPreset(el.value); renderForecast(); renderSim(); renderHero(); persist(); }
    else if (el.id === 'uniSimPreset') { applyPreset(el.value); renderSim(); renderForecast(); renderHero(); persist(); }
    else if (el.id === 'unicefCountry' || el.id === 'unicefLevel' || el.id === 'unicefYear') {
      syncFromLegacy(); renderAll(); persist();
    } else { return false; }
    return true;
  }

  /* ------------------------------------------------------------------ garde
     Les couches de démonstration héritées (V54 « live overlay », V56 « intercept »,
     V57 « operational simulation ») écoutent les clics / changements sur document
     — V56 en capture — et ouvrent des fenêtres génériques par-dessus le cockpit.
     Elles restent actives ailleurs dans la page ; ici on exécute nous-mêmes
     l'action puis on arrête la propagation (NV.guard écoute sur window, donc
     avant elles). Réutilisable : même schéma pour toute section institutionnelle. */
  function ownClick(el) {
    if (!el) return true;
    if (typeof el.__nvGisHandler === 'function') { el.__nvGisHandler(); return true; }
    const tile = el.closest ? el.closest('.nv-uni-tile') : null;
    if (tile) { const nm = tile.getAttribute('data-district'); if (nm) setFocusDistrict(nm); return true; }
    const act = el.getAttribute && el.getAttribute('data-nv-action');
    if (act) { handleAction(act, el.getAttribute('data-nv-arg')); return true; }
    return true;   /* clic dans le cockpit : aucun overlay de démonstration */
  }
  function markOwned(sel) {
    const el = root && root.querySelector(sel);
    if (el && NV.guard) NV.guard.mark(el);
    return el;
  }
  function installGuard() {
    if (State.guarded || !root || !NV.guard) return;
    State.guarded = NV.guard.scope(root, { click: ownClick, change: handleSelect });
    /* les sélecteurs hérités pilotent le cockpit : ils font partie du périmètre */
    ['#unicefCountry', '#unicefLevel', '#unicefYear'].forEach(markOwned);
  }

  function wire() {
    if (State.wired) return;
    State.wired = true;
    root.addEventListener('click', function (e) {
      const b = e.target.closest('[data-nv-action]');
      if (!b || !root.contains(b)) return;
      handleAction(b.getAttribute('data-nv-action'), b.getAttribute('data-nv-arg'));
    });
    root.addEventListener('input', onSlider);
    root.addEventListener('change', function (e) { handleSelect(e.target); });
    /* navigation : la couche héritée V38 ré-injecte son canvas à chaque go() ;
       on ré-enrichit le balisage puis on redessine les graphiques (section visible) */
    document.addEventListener('nutri:view', function (e) {
      const id = e && e.detail ? e.detail.id : null;
      if (id !== 'unicef' || !State.mounted) return;
      setTimeout(function () {
        try { enhanceLegacy(); } catch (err) { }
        Object.keys(State.charts).forEach((k) => { try { State.charts[k].render(); } catch (err) { } });
      }, 160);
    });
    /* la couche V38 s'exécute ~450 ms après DOMContentLoaded : on repasse derrière */
    [700, 1500, 3000].forEach(function (ms) {
      setTimeout(function () { if (State.mounted) { try { enhanceLegacy(); } catch (e) { } } }, ms);
    });
  }

  /* ==========================================================================
     9. MODALES
     ====================================================================== */
  function openGisModal() {
    const m = UI.modal({
      size: 'lg', pill: t('uni.gis.title'), title: '🗺️ ' + countryName(State.country) + ' — ' + (fr() ? 'atelier SIG' : 'GIS workbench'),
      subtitle: t('uni.gis.sub'),
      body: '<div id="uniGisModalHost" style="min-height:300px"></div>' +
        '<div class="nv-divider"></div><div id="uniGisModalTable"></div>',
      actions: UI.btn(fr() ? 'Cibler le district le plus à risque' : 'Focus highest-risk district', { kind: 'primary', action: 'uni-focus-top', icon: '🎯' }) +
        UI.btn(fr() ? 'Fermer' : 'Close', { action: 'uni-close', icon: '✕' })
    });
    renderGisInto(m.body.querySelector('#uniGisModalHost'));
    const list = hotspots(State.country);
    m.body.querySelector('#uniGisModalTable').innerHTML = UI.table([
      { key: 'rank', label: '#', align: 'center' },
      { key: 'name', label: t('uni.hs.col.district') },
      { key: 'risk', label: t('uni.hs.col.risk'), align: 'right', render: (v, r) => '<b style="color:' + TH.tone(r.tone) + '">' + U.fmt(v, 1) + '</b>' },
      { key: 'stunting', label: indLabel('stunting', true), align: 'right', render: (v) => U.fmt(v, 1) + ' %' },
      { key: 'wasting', label: indLabel('wasting', true), align: 'right', render: (v) => U.fmt(v, 1) + ' %' },
      { key: 'anaemia', label: indLabel('anaemia', true), align: 'right', render: (v) => U.fmt(v, 1) + ' %' },
      { key: 'coverage', label: t('uni.hs.col.coverage'), align: 'right', render: (v) => U.pct(v, 0) }
    ], list.map((d) => ({ __tone: d.tone === 'risk' ? 'risk' : null, rank: d.rank, name: d.name, risk: d.risk, tone: d.tone, stunting: d.vals.stunting, wasting: d.vals.wasting, anaemia: d.vals.anaemia, coverage: d.coverage })));
    m.el.addEventListener('click', function (e) {
      const b = e.target.closest('[data-nv-action]');
      if (!b) return;
      const act = b.getAttribute('data-nv-action');
      if (act === 'uni-close') m.close();
      if (act === 'uni-focus-top') { setFocusDistrict(list[0].name); m.close(); }
    });
  }
  function openDistrictModal(name) {
    const list = districts(State.country);
    const d = list.filter((x) => x.name === name)[0] || list.slice().sort((a, b) => b.risk - a.risk)[0];
    if (!d) return;
    const nat = anchor(State.country);
    const m = UI.modal({
      size: 'lg', pill: t('uni.hs.col.district'), title: '📍 ' + d.name + ' — ' + countryName(State.country),
      subtitle: (fr() ? 'Profil nutritionnel du district, comparaison nationale et actions prioritaires' : 'District nutrition profile, national comparison and priority actions'),
      body:
        '<div class="nv-grid nv-g2">' +
          '<div><div class="nv-chart-host" id="uniDistRings" style="height:230px"></div></div>' +
          '<div class="nv-grid nv-g2" id="uniDistKpis"></div>' +
        '</div>' +
        '<div class="nv-divider"></div><div id="uniDistTable"></div>' +
        '<div class="nv-divider"></div><div class="nv-panel-title"><h3>' + U.esc(t('uni.ew.action')) + '</h3></div><div class="nv-list" id="uniDistActions"></div>',
      actions: UI.btn(t('uni.hs.focus'), { kind: 'primary', action: 'uni-focus-this', icon: '🎯' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'uni-close', icon: '✕' })
    });
    CH.mount(m.body.querySelector('#uniDistRings'), {
      type: 'rings', height: 230,
      items: IND_IDS.slice(0, 6).map((k, i) => ({
        label: indLabel(k, true), value: d.vals[k], min: 0, max: IND_BY_ID[k].good === 'up' ? 100 : 60,
        color: TH.tone(toneOf(IND_BY_ID[k], d.vals[k])), unit: '%', valueLabel: d.name
      }))
    });
    m.body.querySelector('#uniDistKpis').innerHTML =
      UI.kpi({ label: t('uni.hs.col.risk'), value: U.fmt(d.risk, 1), unit: '/100', icon: '🔥', tone: d.risk >= 66 ? 'risk' : d.risk >= 44 ? 'warn' : 'good' }) +
      UI.kpi({ label: t('uni.hs.col.u5'), value: U.compact(d.u5), icon: '👶', tone: 'info' }) +
      UI.kpi({ label: t('uni.hs.col.burden'), value: U.compact(d.stunted), icon: '📏', tone: 'warn' }) +
      UI.kpi({ label: t('uni.hs.col.coverage'), value: U.pct(d.coverage, 0), icon: '🗂️', tone: d.coverage > 0.7 ? 'good' : d.coverage > 0.45 ? 'warn' : 'risk' });
    m.body.querySelector('#uniDistTable').innerHTML = UI.table([
      { key: 'label', label: t('uni.dq.col.indicator'), render: (v, r) => r.icon + ' ' + U.esc(v) },
      { key: 'dist', label: d.name, align: 'right', render: (v) => U.fmt(v, 1) + ' %' },
      { key: 'nat', label: t('uni.common.national'), align: 'right', render: (v) => U.fmt(v, 1) + ' %' },
      { key: 'ratio', label: '×', align: 'right', render: (v, r) => '<span class="nv-chip nv-chip-' + (v > 1.15 ? 'risk' : v < 0.85 ? 'good' : 'neutral') + '">' + U.fmt(v, 2) + '</span>' }
    ], IND_IDS.map((k) => ({
      icon: IND_BY_ID[k].icon, label: indLabel(k), dist: d.vals[k], nat: U.num(nat[k], 0),
      ratio: U.num(nat[k], 0) ? d.vals[k] / U.num(nat[k], 1) : 1
    })));
    const worst = IND_IDS.slice().sort((a, b) => {
      const ra = d.vals[a] / Math.max(1, U.num(nat[a], 1)), rb = d.vals[b] / Math.max(1, U.num(nat[b], 1));
      return (IND_BY_ID[b].good === 'up' ? -rb : rb) - (IND_BY_ID[a].good === 'up' ? -ra : ra);
    }).slice(0, 3);
    m.body.querySelector('#uniDistActions').innerHTML = worst.map((k) => {
      const pid = ACTIONS[k] || 'csc';
      return '<div class="nv-item" data-tone="' + toneOf(IND_BY_ID[k], d.vals[k]) + '"><span class="nv-item-icon">' + progIcon(pid) + '</span>' +
        '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(progLabel(pid)) + '</div>' +
        '<div class="nv-item-text">' + U.esc(indLabel(k) + ' : ' + U.fmt(d.vals[k], 1) + ' % · ' + progHint(pid)) + '</div></div>' +
        '<div class="nv-item-side"><b>' + U.fmt(d.vals[k], 1) + '%</b><span>' + U.esc(t('uni.sim.lag') + ' ' + PROG_BY_ID[pid].lag + ' ' + t('uni.fc.years')) + '</span></div></div>';
    }).join('');
    m.el.addEventListener('click', function (e) {
      const b = e.target.closest('[data-nv-action]');
      if (!b) return;
      const act = b.getAttribute('data-nv-action');
      if (act === 'uni-close') m.close();
      if (act === 'uni-focus-this') { setFocusDistrict(d.name); m.close(); }
    });
  }
  function openActionPlan() {
    const sim = State.lastSim || simulate({ country: State.country, horizon: State.horizon, trials: SIM_TRIALS });
    const top = sim.programmes.slice(0, 5);
    const warn = warningList(State.country, State.horizon).slice(0, 3);
    const m = UI.modal({
      size: 'lg', pill: t('uni.ew.action'), title: '🧭 ' + (fr() ? 'Plan d\'action précoce — ' : 'Early action plan — ') + countryName(State.country),
      subtitle: (fr() ? 'Séquencement programmatique dérivé de la frontière de coût-efficacité et des signaux d\'alerte' : 'Programmatic sequencing derived from the cost-effectiveness frontier and warning signals'),
      body:
        '<div id="uniPlanStepper"></div>' +
        '<div class="nv-divider"></div>' +
        '<div class="nv-grid nv-g3" id="uniPlanKpis"></div>' +
        '<div class="nv-divider"></div><div id="uniPlanTable"></div>' +
        '<div class="nv-divider"></div><div class="nv-panel-title"><h3>' + U.esc(t('uni.ew.title')) + '</h3></div><div class="nv-list" id="uniPlanWarn"></div>',
      actions: UI.btn(t('uni.exp.report'), { kind: 'primary', action: 'uni-report', icon: '📄' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'uni-close', icon: '✕' })
    });
    const st = UI.stepper(m.body.querySelector('#uniPlanStepper'), top.map((r, i) => ({
      label: (fr() ? 'Phase ' : 'Phase ') + (i + 1) + ' · ' + r.label,
      detail: (fr() ? 'Couverture cible ' : 'Target coverage ') + U.pct(r.coverage, 0) + ' · ' + (fr() ? 'délai ' : 'lag ') + r.lag + ' ' + t('uni.fc.years') + ' · ' + U.compact(r.reach) + ' ' + t('uni.common.children')
    })), { readyText: fr() ? 'Séquencement proposé sur ' + sim.horizon + ' ans' : 'Proposed sequencing over ' + sim.horizon + ' years' });
    if (st && st.run) st.run({ stepMs: 260 });
    m.body.querySelector('#uniPlanKpis').innerHTML =
      UI.kpi({ label: t('uni.sim.cost'), value: money(sim.totalCost), icon: '💵', tone: 'info' }) +
      UI.kpi({ label: t('uni.sim.averted'), value: U.compact(sim.totals.cases), icon: '🛡️', tone: 'good' }) +
      UI.kpi({ label: t('uni.sim.costDaly'), value: sim.totals.costDaly == null ? '—' : '$' + U.compact(sim.totals.costDaly), icon: '⚖️', tone: sim.totals.verdict === 'notCE' ? 'warn' : 'good', chip: sim.totals.ratioGdp != null ? U.fmt(sim.totals.ratioGdp, 2) + ' ' + t('uni.common.vsGdp') : '—' });
    m.body.querySelector('#uniPlanTable').innerHTML = UI.table([
      { key: 'priority', label: '#', align: 'center' },
      { key: 'label', label: t('uni.sim.col.programme'), render: (v, r) => r.icon + ' ' + U.esc(v) },
      { key: 'coverage', label: t('uni.sim.col.coverage'), align: 'right', render: (v) => U.pct(v, 0) },
      { key: 'reach', label: t('uni.sim.col.reach'), align: 'right', render: (v) => U.compact(v) },
      { key: 'cost', label: t('uni.sim.col.cost'), align: 'right', render: (v) => money(v) },
      { key: 'costDaly', label: t('uni.sim.col.costDaly'), align: 'right', render: (v) => v == null ? '—' : '$' + U.compact(v) }
    ], top.map((r) => ({ __tone: r.priority <= 3 ? 'good' : null, priority: r.priority, label: r.label, icon: r.icon, coverage: r.coverage, reach: r.reach, cost: r.cost, costDaly: r.costDaly })));
    m.body.querySelector('#uniPlanWarn').innerHTML = warn.map((w) =>
      '<div class="nv-item" data-tone="' + w.tone + '"><span class="nv-item-icon">' + w.icon + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(w.label) + '</div>' +
      '<div class="nv-item-text">' + U.esc(t('uni.ew.pBreach') + ' ' + U.pct(w.pBreach, 0) + (w.breachYear ? ' · ' + t('uni.ew.breachYear') + ' ' + w.breachYear : '')) + '</div></div>' +
      '<div class="nv-item-side"><b>' + U.fmt(w.current, 1) + '%</b><span class="nv-chip nv-chip-' + w.tone + '">' + U.esc(t('uni.ew.severity.' + w.severity)) + '</span></div></div>').join('');
    m.el.addEventListener('click', function (e) {
      const b = e.target.closest('[data-nv-action]');
      if (!b) return;
      const act = b.getAttribute('data-nv-action');
      if (act === 'uni-close') m.close();
      if (act === 'uni-report') printReport();
    });
  }

  /* ==========================================================================
     10. EXPORTS
     ====================================================================== */
  function snapshot() {
    const sim = State.lastSim || simulate({ country: State.country, horizon: State.horizon, trials: 800 });
    const fc = {};
    IND_IDS.forEach((k) => {
      const f = forecastInd(State.country, k, State.horizon, { trials: SIM_TRIALS, drift: 0 });
      fc[k] = {
        label: indLabel(k), history: f.past, years: f.years,
        point: f.fc.point, p10: f.fc.p10, p90: f.fc.p90,
        models: (f.fc.models || []).map((m) => ({ id: m.id, label: m.label, rmse: m.rmse, mae: m.mae, mape: m.mape, weight: m.weight, dropped: m.dropped })),
        backtest: f.fc.backtest ? { folds: f.fc.backtest.folds, hmax: f.fc.backtest.hmax } : null,
        calibration: f.fc.calibration, anomalies: shocksFor(State.country, k)
      };
    });
    return {
      product: 'NUTRI.N°1 — UNICEF Child & Maternal Nutrition Intelligence',
      generatedAt: new Date().toISOString(),
      engine: { name: 'NutriVision', version: NV.version, reused: ['stats.ensembleForecast', 'ui.pipeline', 'chart', 'i18n', 'export'] },
      scope: { country: State.country, countryName: countryName(State.country), level: State.level, levelLabel: scopeVals().label, year: State.year, focusDistrict: State.focusDistrict },
      disclaimer: t('uni.foot.disclaimer'),
      indicators: INDICATORS.map((i) => ({ id: i.id, label: indLabel(i.id), whoThresholds: { warn: i.warn, risk: i.risk }, target2030Factor: i.target2030, dalyWeight: i.daly, source: i.src })),
      anchors: scopeAnchor(State.country),
      compositeRisk: compositeRisk(State.country),
      forecasts: fc,
      simulation: {
        scenario: State.scenario, horizon: sim.horizon, trials: sim.trials, budget: sim.budget,
        annualCost: sim.annualCost, totalCost: sim.totalCost, budgetScale: sim.scale, overBudget: sim.overBudget,
        childrenReached: sim.reached, totals: sim.totals,
        programmes: sim.programmes,
        perIndicator: IND_IDS.map((k) => ({ id: k, label: indLabel(k), baseline: sim.indicators[k].baseline, intervention: sim.indicators[k].intervention, deltaPP: sim.indicators[k].delta, casesAverted: sim.indicators[k].casesAverted, daly: sim.indicators[k].daly, targetYear: sim.indicators[k].targetYear }))
      },
      hotspots: hotspots(State.country).map((d) => ({ rank: d.rank, name: d.name, u5: d.u5, risk: d.risk, stunted: d.stunted, coverage: d.coverage, lastSurvey: d.lastSurvey, trend: d.trend, values: d.vals })),
      warnings: warningList(State.country, State.horizon),
      equity: equityStats(State.country),
      dataQuality: dataQuality(State.country).map((x) => ({ indicator: x.id, source: x.source.label, lastRound: x.lastRound, completeness: x.completeness, timeliness: x.timeliness, confidence: x.confidence }))
    };
  }
  function exportJSON() {
    NV.export.downloadJSON('nutri-unicef-' + State.country.toLowerCase() + '-' + new Date().toISOString().slice(0, 10) + '.json', snapshot());
    UI.toast(t('uni.exp.json') + ' ✓', { tone: 'good' });
  }
  function exportCSV() {
    const rows = [];
    IND_IDS.forEach((k) => {
      const s = seriesFor(State.country, k);
      s.years.forEach((y, i) => rows.push({ country: State.country, level: State.level, indicator: k, year: y, value: s.values[i] }));
    });
    hotspots(State.country).forEach((d) => rows.push({ country: State.country, level: 'District:' + d.name, indicator: 'riskIndex', year: State.year, value: d.risk }));
    NV.export.downloadCSV('nutri-unicef-series-' + State.country.toLowerCase() + '.csv', rows, ['country', 'level', 'indicator', 'year', 'value']);
    UI.toast(t('uni.exp.csv') + ' ✓', { tone: 'good' });
  }
  function exportHotspots() {
    const rows = hotspots(State.country).map((d) => ({
      rank: d.rank, district: d.name, children_u5: d.u5, risk_index: d.risk,
      stunting_pct: d.vals.stunting, wasting_pct: d.vals.wasting, anaemia_pct: d.vals.anaemia,
      ebf_pct: d.vals.ebf, min_diet_pct: d.vals.minDiet, stunted_children: d.stunted,
      data_coverage: d.coverage, last_survey: d.lastSurvey, trend_pp: d.trend
    }));
    NV.export.downloadCSV('nutri-unicef-hotspots-' + State.country.toLowerCase() + '.csv', rows);
    UI.toast(t('uni.exp.csv') + ' ✓', { tone: 'good' });
  }
  function printReport() {
    const s = snapshot(), sim = s.simulation;
    const rows = IND_IDS.map((k) => {
      const f = s.forecasts[k];
      return '<tr><td>' + U.esc(f.label) + '</td><td>' + U.fmt(f.history[f.history.length - 1], 1) + ' %</td><td>' + U.fmt(f.point[f.point.length - 1], 1) + ' %</td><td>' + U.fmt(f.p10[f.p10.length - 1], 1) + ' – ' + U.fmt(f.p90[f.p90.length - 1], 1) + ' %</td></tr>';
    }).join('');
    const prog = sim.programmes.map((r) => '<tr><td>' + r.icon + ' ' + U.esc(r.label) + '</td><td>' + U.pct(r.coverage, 0) + '</td><td>' + U.compact(r.reach) + '</td><td>' + money(r.cost) + '</td><td>' + (r.costDaly == null ? '—' : '$' + U.compact(r.costDaly)) + '</td></tr>').join('');
    const html =
      '<h1>' + U.esc(t('uni.exp.title')) + '</h1>' +
      '<p><b>' + U.esc(s.scope.countryName) + '</b> · ' + U.esc(s.scope.levelLabel) + ' · ' + U.esc(String(s.scope.year)) + ' · ' + new Date().toLocaleString() + '</p>' +
      '<h2>' + U.esc(fr() ? '1. Situation' : '1. Situation') + '</h2>' +
      '<p>' + U.esc(fr() ? 'Indice de risque composite' : 'Composite risk index') + ' : <b>' + U.fmt(s.compositeRisk, 1) + '/100</b> · ' +
        U.esc(t('uni.hero.u5')) + ' : <b>' + U.compact(s.anchors.u5 * 1e6) + '</b> · ' +
        U.esc(t('uni.dq.gauge')) + ' : <b>' + readiness(State.country) + ' %</b></p>' +
      '<table><thead><tr><th>' + U.esc(t('uni.dq.col.indicator')) + '</th><th>' + U.esc(t('uni.fc.meta.today')) + '</th><th>P50 ' + (LAST_YEAR + State.horizon) + '</th><th>' + U.esc(t('uni.fc.meta.ci')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<h2>' + U.esc(fr() ? '2. Simulation d\'interventions' : '2. Intervention simulation') + '</h2>' +
      '<p>' + U.esc(t('uni.sim.cost')) + ' : <b>' + money(sim.totalCost) + '</b> · ' + U.esc(t('uni.sim.reached')) + ' : <b>' + U.compact(sim.childrenReached) + '</b> · ' +
        U.esc(t('uni.sim.averted')) + ' : <b>' + U.compact(sim.totals.cases) + '</b> · ' + U.esc(t('uni.sim.daly')) + ' : <b>' + U.compact(sim.totals.daly) + '</b> · ' +
        U.esc(t('uni.sim.costDaly')) + ' : <b>' + (sim.totals.costDaly == null ? '—' : '$' + U.compact(sim.totals.costDaly)) + '</b> (' + U.fmt(sim.totals.ratioGdp || 0, 2) + ' × ' + U.esc(fr() ? 'PIB/habitant' : 'GDP/capita') + ')</p>' +
      '<table><thead><tr><th>' + U.esc(t('uni.sim.col.programme')) + '</th><th>' + U.esc(t('uni.sim.col.coverage')) + '</th><th>' + U.esc(t('uni.sim.col.reach')) + '</th><th>' + U.esc(t('uni.sim.col.cost')) + '</th><th>' + U.esc(t('uni.sim.col.costDaly')) + '</th></tr></thead><tbody>' + prog + '</tbody></table>' +
      '<h2>' + U.esc(fr() ? '3. Points chauds' : '3. Hotspots') + '</h2><ol>' +
      s.hotspots.slice(0, 6).map((d) => '<li><b>' + U.esc(d.name) + '</b> — ' + U.esc(t('uni.hs.col.risk')) + ' ' + U.fmt(d.risk, 1) + '/100 · ' + U.compact(d.stunted) + ' ' + U.esc(t('uni.hs.col.burden')) + ' · ' + U.esc(t('uni.hs.col.coverage')) + ' ' + U.pct(d.coverage, 0) + '</li>').join('') + '</ol>' +
      '<h2>' + U.esc(fr() ? '4. Alertes précoces' : '4. Early warnings') + '</h2><ul>' +
      s.warnings.slice(0, 6).map((w) => '<li>' + U.esc(w.label) + ' — ' + U.esc(t('uni.ew.severity.' + w.severity)) + ' · ' + U.esc(t('uni.ew.pBreach')) + ' ' + U.pct(w.pBreach, 0) + (w.breachYear ? ' · ' + U.esc(t('uni.ew.breachYear')) + ' ' + w.breachYear : '') + ' · ' + U.esc(t('uni.ew.action')) + ' : ' + U.esc(progLabel(w.action)) + '</li>').join('') + '</ul>' +
      '<h2>' + U.esc(fr() ? '5. Méthode' : '5. Method') + '</h2>' +
      '<p>' + U.esc(t('uni.fc.sub')) + ' ' + U.esc(t('uni.sim.uncertainty')) + '</p>' +
      '<p><i>' + U.esc(s.disclaimer) + '</i></p>';
    NV.export.print(html, t('uni.exp.title') + ' — ' + s.scope.countryName);
    UI.toast(t('uni.exp.report') + ' ✓', { tone: 'good' });
  }

  /* ==========================================================================
     11. RENDU GLOBAL, FLUX VIVANT, MONTAGE
     ====================================================================== */
  function renderAll() {
    if (!State.mounted || !root) return;
    renderHero();
    renderKpis();
    renderForecast();
    renderSim();
    renderHotspots();
    renderGis();
    renderWarning();
    renderData();
    renderFooter();
    enhanceLegacy();
    syncSliders();
  }
  function renderQuick() {
    if (!State.mounted || !root) return;
    renderHero(); renderKpis(); renderFooter(); syncSliders();
  }

  /* flux de surveillance (démonstration) : signale les ingestions en direct */
  let liveTimer = null;
  function liveTick() {
    State.tick++;
    const list = districts(State.country);
    const rng = RNG('uni-live-' + State.tick + '-' + State.country);
    const d = list[Math.floor(rng.next() * list.length)];
    const kinds = [
      { icon: '📡', fr: 'Lot SMART reçu — {d} · {n} mesures anthropométriques validées', en: 'SMART batch received — {d} · {n} anthropometric records validated' },
      { icon: '🏥', fr: 'Rapport HMIS hebdomadaire — {d} · {n} dépistages MUAC', en: 'Weekly HMIS report — {d} · {n} MUAC screenings' },
      { icon: '🚚', fr: 'Stock ATPE — {d} · {n} cartons livrés aux URENAM', en: 'RUTF stock — {d} · {n} cartons delivered to OTP sites' },
      { icon: '🌾', fr: 'Prix des marchés — {d} · variation de {n} % du panier alimentaire', en: 'Market prices — {d} · food basket changed by {n}%' },
      { icon: '🌦️', fr: 'Signal climatique — {d} · {n} districts en stress hydrique', en: 'Climate signal — {d} · {n} districts under water stress' },
      { icon: '🗂️', fr: 'Contrôle qualité — {d} · complétude {n} % sur le lot entrant', en: 'Quality check — {d} · {n}% completeness on the incoming batch' }
    ];
    const k = kinds[Math.floor(rng.next() * kinds.length)];
    const msg = (fr() ? k.fr : k.en).replace('{d}', d.name).replace('{n}', U.fmtInt(40 + Math.floor(rng.next() * 2400)));
    setTxt('#uniLiveSub', k.icon + ' ' + msg);
    const badge = root.querySelector('#uniLiveBadge');
    if (badge) { badge.classList.add('pulse'); setTimeout(function () { badge.classList.remove('pulse'); }, 900); }
  }
  function startLive() {
    if (liveTimer || !State.live) return;
    liveTimer = setInterval(function () {
      if (document.hidden || !State.mounted) return;
      liveTick();
    }, 4200);
  }
  function stopLive() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }

  /* ---------------------------------------------------------------- montage */
  function mount(r) {
    root = r;
    root.classList.add('nv-scope', 'nv-unicef');
    State.mounted = true;
    restore();
    syncFromLegacy();
    bridgeLegacy();
    callLegacyRender();

    const scan = document.createElement('div');
    scan.className = 'nv-scanline';
    root.insertBefore(scan, root.firstChild);

    const heroCard = root.querySelector('.hero.institution-hero');
    const kpiGrid = root.querySelector('.institution-kpis');
    const trendCard = root.querySelector('#unicefTrendChart') ? root.querySelector('#unicefTrendChart').closest('.card') : null;
    const gisHost = root.querySelector('#unicefGIS');
    const gisCard = gisHost ? gisHost.closest('.card') : null;
    const alertsBox = root.querySelector('#unicefAlerts');
    const alertsCard = alertsBox ? alertsBox.closest('.card') : null;

    refs.hero = ins(mkDiv('uniHeroWrap', 'nv-hero-panel', htmlHero()), 'afterend', heroCard || root.firstElementChild);
    refs.kpis = ins(mkDiv('uniKpiWrap', '', htmlKpis()), 'afterend', kpiGrid || refs.hero);
    refs.fc = ins(mkDiv('uniFcWrap', '', htmlForecast()), 'afterend', trendCard || refs.kpis);
    refs.ai = ins(mkDiv('uniAiWrap', '', htmlAi()), 'afterend', refs.fc);
    refs.sim = ins(mkDiv('uniSimWrap', '', htmlSim()), 'afterend', refs.ai);
    refs.hot = ins(mkDiv('uniHotWrap', '', htmlHotspots()), 'afterend', gisCard || refs.sim);
    refs.warn = ins(mkDiv('uniWarnWrap', '', htmlWarning()), 'afterend', alertsCard || refs.hot);
    refs.dq = ins(mkDiv('uniDqWrap', '', htmlData()), 'afterend', refs.warn);
    refs.foot = ins(mkDiv('uniFootWrap', '', htmlFooter()), 'afterend', refs.dq);

    /* contrôles de la couche SIG, au-dessus du conteneur hérité #unicefGIS */
    if (gisHost && !root.querySelector('.nv-uni-gisbar')) {
      gisHost.insertAdjacentHTML('beforebegin', htmlGisControls());
    }

    wire();
    installGuard();
    syncToLegacy();
    renderAll();
    startLive();
    /* changement de langue : tout le cockpit est re-libellé (mêmes données) */
    if (!State.langOff && NV.i18n && NV.i18n.onChange) {
      State.langOff = NV.i18n.onChange(function () { if (State.mounted) rebuild(); });
    }
  }

  function rebuild() {
    if (!State.mounted || !root) return;
    stopLive();
    [['hero', htmlHero], ['kpis', htmlKpis], ['fc', htmlForecast], ['ai', htmlAi], ['sim', htmlSim],
    ['hot', htmlHotspots], ['warn', htmlWarning], ['dq', htmlData], ['foot', htmlFooter]].forEach(function (x) {
      if (refs[x[0]]) refs[x[0]].innerHTML = x[1]();
    });
    const bar = root.querySelector('.nv-uni-gisbar');
    if (bar) { const d = document.createElement('div'); d.innerHTML = htmlGisControls(); bar.parentNode.replaceChild(d.firstElementChild, bar); }
    Object.keys(State.charts).forEach(function (k) { try { State.charts[k].destroy(); } catch (e) { } });
    State.charts = {};
    State.pipes = {};
    /* les écouteurs posés par wire() vivent sur root/document : ils survivent au
       rebuild. Les re-poser ici multiplierait les rendus à chaque changement de
       langue — seul le balisage des panneaux est remplacé. */
    callLegacyRender();
    renderAll();
    startLive();
  }

  function unmount() {
    stopLive();
    State.mounted = false;
    if (State.guarded && NV.guard) { NV.guard.release(State.guarded); State.guarded = null; }
    if (typeof State.langOff === 'function') { try { State.langOff(); } catch (e) { } State.langOff = null; }
    Object.keys(State.charts).forEach(function (k) { try { State.charts[k].destroy(); } catch (e) { } });
    State.charts = {};
    ['hero', 'kpis', 'fc', 'ai', 'sim', 'hot', 'warn', 'dq', 'foot'].forEach(function (k) {
      if (refs[k] && refs[k].parentNode) refs[k].parentNode.removeChild(refs[k]);
      refs[k] = null;
    });
    const bar = root && root.querySelector('.nv-uni-gisbar');
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    if (root) root.classList.remove('nv-unicef');
  }

  /* ==========================================================================
     12. API PUBLIQUE (réutilisable par d'autres sections / partenaires)
     ====================================================================== */
  global.NutriUnicef = {
    version: '1.0.0',
    state: State,
    data: {
      countries: countryCodes, names: NAMES, indicators: INDICATORS, programmes: PROGRAMMES,
      anchor: anchor, districts: districts, series: seriesFor, scope: scopeVals
    },
    engine: {
      series: function (code, indId) { return seriesFor(code || State.country, indId || 'stunting'); },
      forecast: function (code, indId, H, drift) { return forecastInd(code || State.country, indId || State.indicator, H || State.horizon, { trials: State.trials, drift: U.num(drift, 0) }); },
      simulate: function (levers, opt) {
        const o = Object.assign({ country: State.country, horizon: State.horizon, trials: SIM_TRIALS, levers: levers || State.levers }, opt || {});
        return simulate(o);
      },
      hotspots: hotspots, warning: warningList, equity: equityStats,
      dataQuality: dataQuality, burden: burden, risk: compositeRisk, shocks: shocksFor
    },
    render: { all: renderAll, quick: renderQuick, gis: renderGis, forecast: renderForecast, sim: renderSim },
    modals: { gis: openGisModal, district: openDistrictModal, plan: openActionPlan },
    exportData: { json: exportJSON, csv: exportCSV, hotspots: exportHotspots, report: printReport },
    actions: { focusDistrict: setFocusDistrict, preset: applyPreset, clearCaches: clearCaches },
    rebuild: rebuild, unmount: unmount
  };

  /* ---- enregistrement du module dans le noyau réutilisable --------------- */
  NV.app.module({
    id: 'unicef',
    section: 'unicef',
    priority: 20,
    mount: mount,
    render: rebuild,
    refresh: function () {
      if (!State.mounted) return;
      clearCaches();
      callLegacyRender();
      renderAll();
    }
  });

})(typeof window !== 'undefined' ? window : globalThis);
