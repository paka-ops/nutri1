/* ============================================================================
   NUTRI.N°1 — CITIZEN HEALTH COCKPIT  (assets/nutri-citizen.js)
   ----------------------------------------------------------------------------
   Module « suivi nutritionnel & santé du citoyen » de la section #citizen.

   Principes :
     • AUCUNE fonctionnalité existante supprimée : le balisage d'origine
       (#familyDashboard, #bmi/#weight/#waist/#bp, #anthroChart, #clinicalChart,
       #nutritionClinicalChart, #referenceCards, le formulaire de saisie,
       #recs) est conservé, réparé (saveCitizen / updateReferences /
       generateRecommendations étaient appelés mais jamais définis) et amélioré.
     • Tout est calculé en local : moteurs de score, de risque, de prévision
       Monte-Carlo, de Markov, d'optimisation de plan alimentaire.
     • Bâti sur NutriVision (assets/nutri-vision.js) → réutilisable tel quel
       par les autres sections (agriculture, santé publique, recherche…).

   Réutilisation par une autre section :
       NutriCitizen.engine.score(profile)      → NutriScore + sous-scores
       NutriCitizen.engine.risks(profile)      → 5 risques 10 ans + attribution
       NutriCitizen.engine.forecast(profile,k) → prévision P10/P50/P90
       NutriCitizen.engine.plan(profile,opts)  → plan alimentaire local optimisé
       NutriCitizen.engine.foods(countryCode)  → base alimentaire filtrée
   ========================================================================== */
(function (global) {
  'use strict';
  /* Drapeau posé dès le chargement : les couches héritées V44/V45 lui laissent
     la main pour la section #citizen (elles restent intactes pour les autres). */
  global.NUTRI_CITIZEN_ENGINE = true;
  const NV = global.NutriVision;
  if (!NV) { if (global.console) console.error('[NutriCitizen] NutriVision manquant'); return; }
  const U = NV.util, S = NV.stats, RNG = NV.rng, TH = NV.theme, UI = NV.ui, CH = NV.chart;

  /* ==========================================================================
     0. TRADUCTIONS (EN / FR — repli automatique sur l'anglais)
     ====================================================================== */
  const L = [
    /* identité & cockpit */
    ['badge', 'Citizen Health Cockpit', 'Cockpit Santé Citoyen'],
    ['hero.sub', 'Personal nutrition & health intelligence — powered by the African Food Cloud', 'Intelligence nutritionnelle et santé personnalisée — alimentée par l\'African Food Cloud'],
    ['hero.member', 'Member', 'Membre'],
    ['hero.country', 'Country', 'Pays'],
    ['hero.dataQuality', 'Data quality', 'Qualité des données'],
    ['hero.sync', 'Sync', 'Synchronisation'],
    ['hero.globalScore', 'Global NutriScore', 'NutriScore global'],
    ['hero.band', 'Health band', 'Bande de santé'],
    ['hero.actions.sync', 'Sync devices', 'Synchroniser les appareils'],
    ['hero.actions.report', 'Export report', 'Exporter le rapport'],
    ['hero.actions.share', 'Share with a nutritionist', 'Partager avec un nutritionniste'],
    ['hero.actions.reset', 'Reset demo data', 'Réinitialiser la démo'],
    ['hero.twin', 'Digital twin', 'Jumeau numérique'],
    ['hero.twinSub', '{n} simulated trajectories', '{n} trajectoires simulées'],
    ['demo', 'Demo data', 'Données de démo'],
    /* flux vivant */
    ['live.title', 'Live biometric stream', 'Flux biométrique en direct'],
    ['live.sub', 'Connected devices · encrypted stream · demonstration feed', 'Objets connectés · flux chiffré · données de démonstration'],
    ['live.on', 'Live', 'En direct'],
    ['live.paused', 'Paused', 'En pause'],
    ['lastSync', 'Last sync', 'Dernière synchro'],
    ['hr', 'Heart rate', 'Fréquence cardiaque'],
    ['hrv', 'HRV', 'VFC'],
    ['spo2', 'SpO₂', 'SpO₂'],
    ['steps', 'Steps today', 'Pas aujourd\'hui'],
    ['sleep', 'Sleep', 'Sommeil'],
    ['hydration', 'Hydration', 'Hydratation'],
    ['cgm', 'Glucose (CGM)', 'Glycémie (CGM)'],
    ['activity', 'Activity', 'Activité'],
    /* score */
    ['score.title', 'Nutrition & health score engine', 'Moteur de score nutrition & santé'],
    ['score.sub', 'Composite score rebuilt live from your measurements, diet and lifestyle', 'Score composite recalculé en direct à partir de vos mesures, alimentation et hygiène de vie'],
    ['score.anthro', 'Anthropometry', 'Anthropométrie'],
    ['score.metabolic', 'Metabolic', 'Métabolique'],
    ['score.diet', 'Diet quality', 'Qualité de l\'alimentation'],
    ['score.lifestyle', 'Lifestyle', 'Hygiène de vie'],
    ['score.data', 'Monitoring', 'Suivi des données'],
    ['score.adequacy', 'Nutrient adequacy', 'Adéquation nutritionnelle'],
    ['score.adequacySub', 'Intake vs. your daily requirements', 'Apports vs. vos besoins journaliers'],
    ['score.band.optimal', 'Optimal', 'Optimal'],
    ['score.band.good', 'Good', 'Bon'],
    ['score.band.watch', 'Watch', 'À surveiller'],
    ['score.band.risk', 'At risk', 'À risque'],
    /* KPI cliniques */
    ['kpi.bmi', 'BMI', 'IMC'],
    ['kpi.weight', 'Weight', 'Poids'],
    ['kpi.waist', 'Waist', 'Tour de taille'],
    ['kpi.bp', 'Blood pressure', 'Pression artérielle'],
    ['kpi.glucose', 'Glucose', 'Glycémie'],
    ['kpi.hba1c', 'HbA1c', 'HbA1c'],
    ['kpi.chol', 'Cholesterol', 'Cholestérol'],
    ['kpi.egfr', 'eGFR', 'DFG'],
    ['kpi.whr', 'Waist / hip', 'Taille / hanches'],
    ['kpi.tdee', 'Energy need', 'Besoin énergétique'],
    ['kpi.diversity', 'Diet diversity', 'Diversité alimentaire'],
    ['kpi.sodium', 'Sodium', 'Sodium'],
    ['status.optimal', 'Optimal', 'Optimal'],
    ['status.watch', 'Watch', 'Surveillance'],
    ['status.high', 'High', 'Élevé'],
    ['status.low', 'Low', 'Bas'],
    ['status.na', 'No data', 'Aucune donnée'],
    /* tendances */
    ['trend.anthro', 'Anthropometry trends', 'Tendances anthropométriques'],
    ['trend.clinical', 'Metabolic & clinical trends', 'Tendances métaboliques & cliniques'],
    ['trend.nutrition', 'Nutrition-linked clinical parameters', 'Paramètres cliniques liés à la nutrition'],
    ['trend.ref', 'Reference comparison', 'Comparaison aux références'],
    ['trend.period', 'Period', 'Période'],
    ['trend.days30', '30 days', '30 jours'],
    ['trend.days90', '90 days', '90 jours'],
    ['trend.days180', '6 months', '6 mois'],
    ['trend.days365', '12 months', '12 mois'],
    ['trend.historySub', 'Reconstructed history ending on your last measurement', 'Historique reconstitué se terminant sur votre dernière mesure'],
    /* prédiction */
    ['pred.title', 'AI prediction lab', 'Laboratoire de prédiction IA'],
    ['pred.sub', 'Monte-Carlo forecasting ({trials} trajectories) + explainable risk models', 'Prévision Monte-Carlo ({trials} trajectoires) + modèles de risque explicables'],
    ['pred.forecast', 'Trajectory forecast', 'Prévision de trajectoire'],
    ['pred.forecastSub', 'If nothing changes — P10 / P50 / P90 envelope', 'Si rien ne change — enveloppe P10 / P50 / P90'],
    ['pred.horizon', 'Horizon', 'Horizon'],
    ['pred.months', '{n} months', '{n} mois'],
    ['pred.years', '{n} years', '{n} ans'],
    ['pred.variable', 'Variable', 'Variable'],
    ['pred.risks', '10-year risk projection', 'Projection du risque à 10 ans'],
    ['pred.risksSub', 'Logistic model · 90% confidence interval · exact factor attribution', 'Modèle logistique · intervalle de confiance 90 % · attribution exacte des facteurs'],
    ['pred.markov', 'Metabolic progression cohort', 'Cohorte de progression métabolique'],
    ['pred.markovSub', 'Markov simulation of {n} digital twins over {y} years', 'Simulation de Markov de {n} jumeaux numériques sur {y} ans'],
    ['pred.trials', 'Simulated twins', 'Jumeaux simulés'],
    ['pred.rerun', 'Re-run simulation', 'Relancer la simulation'],
    ['pred.healthyYears', 'Healthy years gained', 'Années en bonne santé gagnées'],
    ['pred.attr', 'Why this risk?', 'Pourquoi ce risque ?'],
    ['pred.attrSub', 'Contribution of each factor in probability points', 'Contribution de chaque facteur en points de probabilité'],
    ['pred.converged', 'Converged (±{v})', 'Convergé (±{v})'],
    ['pred.anomaly', 'Early-warning signals', 'Signaux d\'alerte précoce'],
    ['pred.anomalySub', 'Robust anomaly detection on your series (z-score / MAD)', 'Détection robuste d\'anomalies sur vos séries (z-score / MAD)'],
    /* risques */
    ['risk.t2d', 'Type 2 diabetes', 'Diabète de type 2'],
    ['risk.htn', 'Hypertension', 'Hypertension'],
    ['risk.cvd', 'Cardiovascular disease', 'Maladie cardiovasculaire'],
    ['risk.anemia', 'Anaemia / iron deficit', 'Anémie / déficit en fer'],
    ['risk.obesity', 'Weight progression', 'Progression pondérale'],
    ['risk.low', 'Low', 'Faible'],
    ['risk.mod', 'Moderate', 'Modéré'],
    ['risk.high', 'High', 'Élevé'],
    ['risk.veryhigh', 'Very high', 'Très élevé'],
    /* états markov */
    ['st.healthy', 'Metabolically healthy', 'Métaboliquement sain'],
    ['st.atrisk', 'At risk', 'À risque'],
    ['st.pre', 'Prediabetes', 'Prédiabète'],
    ['st.t2d', 'Type 2 diabetes', 'Diabète T2'],
    ['st.comp', 'Complications', 'Complications'],
    /* scénarios */
    ['sim.title', 'Prevention scenario simulator', 'Simulateur de scénarios de prévention'],
    ['sim.sub', 'Move a lever: risks, score, healthy years and avoided costs are recomputed instantly', 'Déplacez un levier : risques, score, années en bonne santé et coûts évités sont recalculés instantanément'],
    ['sim.levers', 'Prevention levers', 'Leviers de prévention'],
    ['sim.impact', 'Projected impact', 'Impact projeté'],
    ['sim.compare', 'Compare trajectories', 'Comparer les trajectoires'],
    ['sim.compareSub', 'Business-as-usual vs. your scenario', 'Trajectoire actuelle vs. votre scénario'],
    ['sim.apply', 'Apply to my plan', 'Appliquer à mon plan'],
    ['sim.reset', 'Reset levers', 'Réinitialiser les leviers'],
    ['sim.out.score', 'NutriScore', 'NutriScore'],
    ['sim.out.years', 'Healthy life years', 'Années de vie en bonne santé'],
    ['sim.out.cost', 'Health costs avoided (10 y)', 'Coûts de santé évités (10 ans)'],
    ['sim.out.days', 'Productivity days kept', 'Jours de productivité préservés'],
    ['sim.out.footprint', 'Food footprint', 'Empreinte alimentaire'],
    ['sim.out.basket', 'Food basket cost', 'Coût du panier'],
    ['sim.organic', 'Local & organic sourcing', 'Approvisionnement local & bio'],
    ['sim.organicSub', 'Links citizen health to the bio-agriculture supply side', 'Relie la santé du citoyen à l\'offre agricole bio'],
    /* leviers */
    ['lev.weight', 'Body weight', 'Poids corporel'],
    ['lev.activity', 'Physical activity', 'Activité physique'],
    ['lev.fruitveg', 'Fruit & vegetables', 'Fruits & légumes'],
    ['lev.sodium', 'Salt / sodium', 'Sel / sodium'],
    ['lev.sugar', 'Sugary drinks', 'Boissons sucrées'],
    ['lev.upf', 'Ultra-processed share', 'Part d\'ultra-transformés'],
    ['lev.sleep', 'Sleep', 'Sommeil'],
    ['lev.organic', 'Local & organic food', 'Aliments locaux & bio'],
    ['lev.adherence', 'Plan adherence', 'Adhésion au plan'],
    ['lev.smoke', 'Tobacco', 'Tabac'],
    ['lev.alcohol', 'Alcohol', 'Alcool'],
    ['presets', 'Presets', 'Scénarios types'],
    ['preset.base', 'Business as usual', 'Laisser-faire'],
    ['preset.weight', '−5% body weight', '−5 % de poids'],
    ['preset.local', 'Local & organic pattern', 'Modèle local & bio'],
    ['preset.sodium', 'WHO salt target', 'Cible sel OMS'],
    ['preset.active', 'Active citizen', 'Citoyen actif'],
    ['preset.full', 'Full prevention program', 'Programme prévention complet'],
    /* journal */
    ['journal.title', 'Nutrition journal & intake analysis', 'Journal nutritionnel & analyse des apports'],
    ['journal.sub', 'Log meals, watch nutrient coverage update live', 'Enregistrez vos repas, suivez la couverture nutritionnelle en direct'],
    ['journal.today', 'Today', 'Aujourd\'hui'],
    ['journal.add', 'Quick add', 'Ajout rapide'],
    ['journal.intake', 'Intake vs. requirements', 'Apports vs. besoins'],
    ['journal.adherence', '12-week adherence', 'Assiduité sur 12 semaines'],
    ['journal.streak', 'Streak', 'Série en cours'],
    ['journal.days', '{n} days', '{n} jours'],
    ['journal.scan', 'Simulate meal scan', 'Simuler un scan de repas'],
    ['journal.scanTitle', 'AI meal scanner pipeline', 'Pipeline du scan de repas IA'],
    ['journal.logged', 'Logged', 'Enregistré'],
    ['journal.empty', 'Nothing logged today — tap a food to start.', 'Rien aujourd\'hui — touchez un aliment pour commencer.'],
    ['journal.clear', 'Clear today', 'Vider la journée'],
    ['slot.breakfast', 'Breakfast', 'Petit-déjeuner'],
    ['slot.lunch', 'Lunch', 'Déjeuner'],
    ['slot.dinner', 'Dinner', 'Dîner'],
    ['slot.snack', 'Snack', 'Collation'],
    ['journal.portion', 'Portion', 'Portion'],
    /* plan */
    ['plan.title', 'Personalized food plan — local & organic', 'Plan alimentaire personnalisé — local & bio'],
    ['plan.sub', 'Optimizer over the African Food Cloud database ({n} foods available in {country})', 'Optimiseur sur la base African Food Cloud ({n} aliments disponibles au {country})'],
    ['plan.regenerate', 'Regenerate plan', 'Régénérer le plan'],
    ['plan.apply', 'Log today\'s plan', 'Enregistrer le plan du jour'],
    ['plan.market', 'Open marketplace', 'Ouvrir la marketplace'],
    ['plan.coverage', 'Nutrient coverage', 'Couverture nutritionnelle'],
    ['plan.cost', 'Cost / day', 'Coût / jour'],
    ['plan.organic', 'Organic share', 'Part bio'],
    ['plan.local', 'Local sourcing', 'Approvisionnement local'],
    ['plan.energy', 'Energy', 'Énergie'],
    ['plan.day', 'Day {n}', 'Jour {n}'],
    ['plan.season', 'Seasonal note', 'Note de saison'],
    /* recommandations */
    ['rec.title', 'Personalized recommendations', 'Recommandations personnalisées'],
    ['rec.generate', 'Generate personalized recommendations', 'Générer des recommandations personnalisées'],
    ['rec.impact', 'Expected impact', 'Impact attendu'],
    ['rec.evidence', 'Evidence', 'Preuve'],
    ['rec.priority', 'Priority', 'Priorité'],
    ['rec.why', 'Why', 'Pourquoi'],
    ['rec.empty', 'Enter your profile and measurements to generate personalized recommendations.', 'Saisissez votre profil et vos mesures pour générer des recommandations personnalisées.'],
    /* alertes */
    ['alert.title', 'Alerts & care pathway', 'Alertes & parcours de soin'],
    ['alert.sub', 'Threshold and anomaly engine — escalation to a professional when relevant', 'Moteur de seuils et d\'anomalies — escalade vers un professionnel si nécessaire'],
    ['alert.book', 'Book a teleconsultation', 'Réserver une téléconsultation'],
    ['alert.foods', 'Find adapted foods', 'Trouver des aliments adaptés'],
    ['alert.evidence', 'See the evidence', 'Voir les preuves'],
    ['alert.dismiss', 'Dismiss', 'Ignorer'],
    ['alert.none', 'No active alert — keep monitoring.', 'Aucune alerte active — continuez le suivi.'],
    /* famille */
    ['fam.title', 'Growth & nutrition follow-up', 'Suivi croissance & nutrition'],
    ['fam.growth', 'Growth curve', 'Courbe de croissance'],
    ['fam.growthSub', 'Height-for-age and weight-for-age against reference bands', 'Taille-pour-âge et poids-pour-âge vs. bandes de référence'],
    ['fam.percentile', 'Percentile', 'Percentile'],
    ['fam.diversity', 'Child diet diversity', 'Diversité alimentaire de l\'enfant'],
    ['fam.consent', 'Parental consent', 'Consentement parental'],
    ['fam.consentSub', 'Guardian verification before a minor profile is opened', 'Vérification du tuteur avant l\'ouverture d\'un profil mineur'],
    ['fam.granted', 'Access granted', 'Accès accordé'],
    ['fam.grant', 'Request / confirm parental access', 'Demander / confirmer l\'accès parental'],
    ['fam.plan', 'Child nutrition plan', 'Plan nutritionnel de l\'enfant'],
    ['fam.zscore', 'z-score', 'z-score'],
    ['fam.school', 'School feeding link', 'Lien cantine scolaire'],
    /* saisie */
    ['form.title', 'Enter / update your data', 'Saisir / mettre à jour vos données'],
    ['form.sub', 'Live calculation — every field instantly updates the whole cockpit', 'Calcul en direct — chaque champ met à jour tout le cockpit'],
    ['form.lifestyle', 'Lifestyle & diet context', 'Hygiène de vie & contexte alimentaire'],
    ['form.activity', 'Physical activity (min/week)', 'Activité physique (min/semaine)'],
    ['form.sleep', 'Sleep (h/night)', 'Sommeil (h/nuit)'],
    ['form.fruitveg', 'Fruit & vegetables (servings/day)', 'Fruits & légumes (portions/jour)'],
    ['form.sodium', 'Salt added (g/day)', 'Sel ajouté (g/jour)'],
    ['form.upf', 'Ultra-processed food share (%)', 'Part d\'ultra-transformés (%)'],
    ['form.water', 'Water (L/day)', 'Eau (L/jour)'],
    ['form.smoke', 'Tobacco', 'Tabac'],
    ['form.alcohol', 'Alcohol (units/week)', 'Alcool (unités/semaine)'],
    ['form.demo', 'Load a demo profile', 'Charger un profil de démo'],
    ['form.save', 'Save & calculate', 'Enregistrer & calculer'],
    ['form.saved', 'Profile saved — {n} indicators recalculated', 'Profil enregistré — {n} indicateurs recalculés'],
    ['form.sex.female', 'Adult female', 'Femme adulte'],
    ['form.sex.male', 'Adult male', 'Homme adulte'],
    ['form.sex.child', 'Child / adolescent', 'Enfant / adolescent'],
    ['form.pregnant', 'Pregnant or breastfeeding', 'Enceinte ou allaitante'],
    /* divers */
    ['common.close', 'Close', 'Fermer'],
    ['common.export', 'Export', 'Exporter'],
    ['common.print', 'Print', 'Imprimer'],
    ['common.download', 'Download', 'Télécharger'],
    ['common.copy', 'Copy', 'Copier'],
    ['common.copied', 'Copied ✓', 'Copié ✓'],
    ['common.open', 'Open', 'Ouvrir'],
    ['common.details', 'Details', 'Détails'],
    ['common.today', 'Today', 'Aujourd\'hui'],
    ['common.week', 'Week', 'Semaine'],
    ['common.month', 'Month', 'Mois'],
    ['common.year', 'Year', 'An'],
    ['common.all', 'All', 'Tous'],
    ['common.none', 'None', 'Aucun'],
    ['common.ref', 'Reference', 'Référence'],
    ['common.you', 'You', 'Vous'],
    ['common.scenario', 'Scenario', 'Scénario'],
    ['common.current', 'Current', 'Actuel'],
    ['common.confidence', 'Confidence', 'Confiance'],
    ['common.model', 'Model', 'Modèle'],
    ['common.footnote', 'Demonstration engine — illustrative models, not a medical device. Always confirm with a health professional.',
      'Moteur de démonstration — modèles illustratifs, non un dispositif médical. Confirmez toujours avec un professionnel de santé.'],
    ['common.privacy', 'Data stays on this device (localStorage). No server call in the demo.',
      'Les données restent sur cet appareil (localStorage). Aucun appel serveur dans la démo.']
  ];
  const DICT = { en: {}, fr: {} };
  L.forEach(function (row) { DICT.en[row[0]] = row[1]; DICT.fr[row[0]] = row[2] || row[1]; });
  NV.i18n.add('citizen', DICT);
  function t(k, vars) { return NV.i18n.t(k, vars); }
  function fr() { return String(NV.i18n.localeCode || 'en').slice(0, 2) === 'fr'; }

  /* ==========================================================================
     1. BASE ALIMENTAIRE AFRICAINE (valeurs / 100 g part comestible)
     --------------------------------------------------------------------------
     id | en | fr | icône | groupe | kcal | prot | lip | gluc | fibres | Na mg |
     Fe mg | vitA µg | vitC mg | Ca mg | Zn mg | folate µg | K mg | sucres g |
     satfat g | prix USD/kg | disponibilité bio 0-1 | IG | pays | mois | UPF
     Sources : ordres de grandeur FAO/West African Food Composition Table.
     ====================================================================== */
  const FOOD_RAW = [
    ['rice', 'Rice (cooked)', 'Riz (cuit)', '🍚', 'cereals', 130, 2.4, 0.3, 28, 0.4, 1, 0.2, 0, 0, 10, 0.4, 3, 28, 0, 0.1, 0.9, 0.25, 72, 'all', null, 0],
    ['rice_w', 'Whole rice', 'Riz complet', '🍚', 'cereals', 123, 2.7, 1, 25, 1.8, 4, 0.6, 0, 0, 12, 0.7, 8, 79, 0.4, 0.2, 1.3, 0.4, 68, 'all', null, 0],
    ['maize', 'Whole maize flour', 'Farine de maïs complet', '🌽', 'cereals', 362, 8.6, 4.1, 69, 7.3, 6, 2.6, 60, 0, 18, 2.6, 22, 330, 0.6, 0.7, 1.1, 0.35, 70, 'all', null, 0],
    ['maize_bf', 'Biofortified yellow maize', 'Maïs jaune biofortifié', '🌽', 'cereals', 358, 8.8, 4, 68, 7, 5, 3, 210, 0, 16, 2.5, 26, 320, 0.6, 0.7, 1.6, 0.5, 68, 'GH,TG,CI,BF,NG,SN,ML', null, 0],
    ['millet', 'Millet', 'Mil', '🌾', 'cereals', 378, 11, 4.2, 67, 8.5, 5, 3.9, 0, 0, 8, 2.8, 40, 300, 0.5, 0.8, 1.2, 0.45, 62, 'SN,ML,BF,NE,NG,TG,GH', null, 0],
    ['sorghum', 'Sorghum', 'Sorgho', '🌾', 'cereals', 329, 10.6, 3.5, 65, 6.7, 6, 4.4, 0, 0, 28, 2.9, 39, 350, 0.6, 0.7, 1, 0.5, 66, 'BF,ML,NE,NG,SN,TD,TG', null, 0],
    ['fonio', 'Fonio', 'Fonio', '🌾', 'cereals', 360, 9, 3.9, 72, 5.9, 3, 5, 0, 0, 44, 3.1, 44, 340, 0.5, 0.7, 2.4, 0.7, 60, 'GN,ML,BF,SN,CI,TG', null, 0],
    ['bread', 'Whole-wheat bread', 'Pain complet', '🍞', 'cereals', 247, 9.4, 3.4, 41, 7, 450, 2.5, 0, 0, 120, 1, 44, 250, 5, 0.6, 1.2, 0.3, 71, 'all', null, 0],
    ['cassava', 'Cassava (cooked)', 'Manioc (cuit)', '🥔', 'tubers', 112, 1.4, 0.3, 27, 1.8, 10, 0.3, 0, 12, 24, 0.3, 14, 270, 1.7, 0.1, 0.5, 0.3, 55, 'all', null, 0],
    ['yam', 'Yam', 'Igname', '🍠', 'tubers', 118, 1.5, 0.2, 28, 4.1, 9, 0.5, 7, 17, 14, 0.4, 23, 810, 0.5, 0.1, 0.9, 0.35, 54, 'CI,GH,NG,TG,BJ,BF,GN,LR,SL', null, 0],
    ['ofsp', 'Orange-fleshed sweet potato', 'Patate douce à chair orange', '🍠', 'tubers', 92, 2, 0.1, 20, 3, 12, 0.7, 960, 22, 38, 0.3, 15, 430, 4.2, 0, 0.6, 0.6, 63, 'all', null, 0],
    ['plantain', 'Plantain', 'Plantain', '🍌', 'tubers', 122, 1.3, 0.4, 32, 2.3, 4, 0.3, 64, 18, 3, 0.1, 22, 499, 15, 0.1, 0.8, 0.35, 55, 'CI,GH,NG,CM,GN,LR,SL,TG,BJ', null, 0],
    ['taro', 'Taro / cocoyam', 'Taro / macabo', '🥔', 'tubers', 142, 1.5, 0.2, 34, 5.1, 11, 0.6, 0, 4, 43, 0.3, 22, 590, 0.7, 0.1, 0.7, 0.3, 56, 'GH,CI,NG,CM,LR,SL,TG', null, 0],
    ['potato', 'Irish potato', 'Pomme de terre', '🥔', 'tubers', 87, 1.9, 0.1, 20, 2.2, 6, 0.3, 0, 12, 12, 0.3, 15, 420, 0.8, 0, 0.4, 0.2, 78, 'all', null, 0],
    ['cowpea', 'Cowpea (niébé)', 'Niébé', '🫘', 'legumes', 116, 7.7, 0.4, 21, 6.7, 4, 1.6, 3, 0, 42, 1.1, 100, 270, 3.3, 0.1, 1.4, 0.7, 30, 'BF,NE,ML,NG,SN,TG,GH,BJ,CI', null, 0],
    ['beans', 'Red beans', 'Haricots rouges', '🫘', 'legumes', 127, 8.7, 0.5, 23, 6.4, 2, 2.1, 0, 1.2, 28, 1, 130, 400, 0.3, 0.1, 1.6, 0.8, 29, 'all', null, 0],
    ['groundnut', 'Groundnut', 'Arachide', '🥜', 'legumes', 585, 24, 51, 16, 9, 6, 2.3, 0, 0, 56, 3.3, 145, 660, 4, 7.9, 2, 0.5, 22, 'all', null, 0],
    ['soy', 'Soybean', 'Soja', '🫘', 'legumes', 173, 16.6, 9, 9.9, 6, 1, 5.1, 3, 1.5, 102, 1.8, 54, 560, 3, 1.3, 2.2, 0.8, 30, 'NG,GH,CI,BJ,TG,BF', null, 0],
    ['bambara', 'Bambara groundnut', 'Poisson de terre / bambara', '🥜', 'legumes', 370, 19, 6.5, 61, 15, 8, 4.4, 0, 3, 60, 2.6, 180, 1200, 3, 0.9, 1.8, 0.55, 26, 'BF,ML,NE,NG,TG,GH,SN', null, 0],
    ['egusi', 'Egusi (melon seed)', 'Graine d\'égousi', '🌰', 'oilseeds', 593, 31, 47, 15, 3, 3, 7.3, 0, 0, 54, 10.2, 58, 650, 2.6, 8, 2.6, 0.9, 20, 'NG,CI,GH,BJ,TG,CM', null, 0],
    ['sesame', 'Sesame', 'Sésame', '🌰', 'oilseeds', 565, 20, 47, 24, 12, 11, 14.6, 9, 0, 989, 7.8, 97, 468, 0.3, 7, 3.5, 0.5, 35, 'BF,ML,NE,NG,SN,TG,TD', null, 0],
    ['shea', 'Shea butter', 'Beurre de karité', '🧈', 'oils', 884, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 42, 5, 0.2, 2, 'BF,ML,GH,TG,BJ,CI,NG,SN', null, 0],
    ['palmoil', 'Red palm oil', 'Huile de palme rouge', '🛢️', 'oils', 884, 0, 100, 0, 0, 0, 0.1, 45000, 0, 0, 0, 0, 0, 0, 49, 1.1, 0.3, 2, 'CI,GH,NG,BJ,TG,GN,LR,SL', null, 0],
    ['groundoil', 'Groundnut oil', 'Huile d\'arachide', '🛢️', 'oils', 884, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 1.5, 0.15, 12, 'all', null, 0],
    ['amaranth', 'Amaranth leaves (adémè)', 'Feuilles d\'amarante (adémè)', '🥬', 'veg', 43, 4.6, 0.6, 6.4, 2.5, 20, 2.9, 400, 65, 260, 1.1, 130, 490, 1.1, 0.2, 1.1, 0.75, 12, 'TG,BJ,GH,NG,CI,SN', null, 0],
    ['okra', 'Okra (gombo)', 'Gombo', '🥬', 'veg', 33, 1.9, 0.2, 7.5, 3.2, 7, 0.6, 716, 23, 82, 0.6, 60, 299, 1.4, 0, 0.6, 0.7, 15, 'all', null, 0],
    ['spl', 'Sweet potato leaves', 'Feuilles de patate douce', '🥬', 'veg', 34, 3.6, 0.5, 6.2, 3.4, 12, 1, 5000, 11, 78, 0.4, 120, 320, 0.6, 0.1, 0.9, 0.8, 10, 'TG,GH,NG,BJ,CI,UG', null, 0],
    ['moringa', 'Moringa leaves', 'Feuilles de moringa', '🌿', 'veg', 92, 9.4, 2, 15, 4, 113, 7, 6780, 220, 440, 0.85, 141, 1324, 8.2, 0.3, 2.5, 0.9, 25, 'all', null, 0],
    ['tomato', 'Tomato', 'Tomate', '🍅', 'veg', 18, 0.9, 0.2, 3.9, 1.2, 5, 0.3, 42, 14, 10, 0.2, 15, 237, 2.6, 0, 0.5, 0.6, 15, 'all', null, 0],
    ['onion', 'Onion', 'Oignon', '🧅', 'veg', 40, 1.1, 0.1, 9.3, 1.7, 4, 0.2, 2, 7.4, 23, 0.2, 19, 146, 4.2, 0, 0.4, 0.5, 15, 'all', null, 0],
    ['pepper', 'Hot pepper', 'Piment', '🌶️', 'veg', 40, 1.9, 0.4, 9.5, 1.5, 7, 1.2, 48, 242, 14, 0.3, 24, 322, 5.3, 0.1, 0.8, 0.7, 20, 'all', null, 0],
    ['carrot', 'Carrot', 'Carotte', '🥕', 'veg', 41, 0.9, 0.2, 9.6, 2.8, 69, 0.3, 835, 5.9, 33, 0.2, 19, 320, 4.7, 0, 0.7, 0.45, 25, 'all', null, 0],
    ['cabbage', 'Cabbage', 'Chou', '🥬', 'veg', 25, 1.3, 0.1, 5.8, 2.5, 18, 0.5, 98, 37, 40, 0.2, 43, 170, 3.2, 0, 0.6, 0.4, 12, 'all', null, 0],
    ['baobab', 'Baobab pulp', 'Pulpe de baobab', '🌳', 'fruit', 338, 2.3, 0.3, 76, 44, 8, 2.9, 0, 280, 295, 0.5, 79, 1400, 12, 0.1, 8.9, 0.95, 20, 'SN,BF,ML,NE,TG,BJ,CI,NG,TD', null, 0],
    ['mango', 'Mango', 'Mangue', '🥭', 'fruit', 60, 0.8, 0.4, 15, 1.6, 1, 0.2, 54, 36, 11, 0.1, 43, 168, 14, 0.1, 0.9, 0.85, 51, 'all', [4, 5, 6, 7], 0],
    ['papaya', 'Papaya', 'Papaye', '🍈', 'fruit', 43, 0.5, 0.3, 11, 1.7, 8, 0.3, 47, 62, 20, 0.1, 38, 182, 7.8, 0, 0.8, 0.9, 59, 'all', null, 0],
    ['pineapple', 'Pineapple', 'Ananas', '🍍', 'fruit', 50, 0.5, 0.1, 13, 1.4, 1, 0.3, 3, 48, 13, 0.1, 18, 109, 9.9, 0, 0.7, 0.8, 56, 'BJ,CI,GH,GN,TG,NG,SL,LR', null, 0],
    ['banana', 'Banana', 'Banane', '🍌', 'fruit', 89, 1.1, 0.3, 23, 2.6, 1, 0.3, 3, 8.7, 5, 0.2, 20, 358, 12, 0.1, 0.7, 0.6, 55, 'all', null, 0],
    ['orange', 'Orange', 'Orange', '🍊', 'fruit', 47, 0.9, 0.1, 12, 2.4, 0, 0.1, 11, 53, 40, 0.1, 30, 181, 9.4, 0, 0.6, 0.7, 40, 'all', [11, 12, 1, 2, 3], 0],
    ['avocado', 'Avocado', 'Avocat', '🥑', 'fruit', 160, 2, 15, 9, 7, 7, 0.6, 7, 10, 12, 0.6, 81, 485, 0.7, 2.1, 1.6, 0.65, 15, 'GH,CI,NG,TG,BJ,CM,KE', [6, 7, 8, 9, 10], 0],
    ['coconut', 'Coconut', 'Noix de coco', '🥥', 'fruit', 354, 3.3, 33, 15, 9, 55, 2.4, 0, 3.3, 14, 1.1, 26, 356, 6.2, 29.7, 1.2, 0.8, 45, 'CI,GH,NG,SN,TG,BJ,SL,LR,GM,CV', null, 0],
    ['tilapia', 'Tilapia', 'Tilapia', '🐟', 'animal', 128, 26, 3, 0, 0, 55, 1, 4, 0, 12, 0.4, 24, 302, 0, 0.9, 3.2, 0.35, 0, 'all', null, 0],
    ['sardine', 'Canned sardine', 'Sardine en boîte', '🐟', 'animal', 208, 25, 11, 0, 0, 307, 2.9, 32, 0, 382, 1.3, 10, 397, 0, 2.5, 2.4, 0.2, 0, 'all', null, 0],
    ['smokedfish', 'Smoked fish', 'Poisson fumé', '🐟', 'animal', 200, 33, 7, 0, 0, 720, 2.4, 12, 0, 300, 1.2, 15, 480, 0, 1.4, 4.5, 0.25, 0, 'GH,NG,CI,SN,TG,BJ,SL,LR,GM', null, 0],
    ['chicken', 'Chicken', 'Poulet', '🍗', 'animal', 165, 31, 3.6, 0, 0, 74, 1, 21, 0, 15, 1.1, 6, 223, 0, 0.9, 3, 0.5, 0, 'all', null, 0],
    ['egg', 'Egg', 'Œuf', '🥚', 'animal', 143, 13, 9.5, 0.6, 0, 142, 1.7, 160, 0, 56, 1.1, 47, 138, 0.6, 3.1, 2.6, 0.55, 0, 'all', null, 0],
    ['beef', 'Beef (lean)', 'Bœuf (maigre)', '🥩', 'animal', 187, 26, 9, 0, 0, 66, 2.6, 6, 0, 12, 4.2, 7, 318, 0, 3.7, 4.8, 0.4, 0, 'all', null, 0],
    ['goat', 'Goat meat', 'Viande de chèvre', '🐐', 'animal', 143, 27, 3, 0, 0, 64, 3.7, 0, 0, 13, 4, 6, 405, 0, 1, 3.4, 0.35, 0, 'all', null, 0],
    ['milk', 'Fresh milk', 'Lait frais', '🥛', 'animal', 61, 3.2, 3.3, 4.8, 0, 43, 0.1, 46, 1, 120, 0.4, 5, 156, 5.1, 1.9, 1, 0.3, 32, 'SN,ML,BF,NE,NG,TD,CI', null, 0],
    ['yogurt', 'Fermented milk (lait caillé)', 'Lait caillé', '🥛', 'animal', 63, 3.5, 3.4, 4.6, 0, 46, 0.1, 27, 0.5, 118, 0.5, 11, 141, 4.6, 1.8, 1.1, 0.5, 34, 'SN,ML,BF,NE,NG,TG,BJ,CI', null, 0],
    ['fortified', 'Fortified cereal blend (6-24m)', 'Farine infantile fortifiée', '🥣', 'special', 386, 12, 5, 71, 5, 120, 8.4, 380, 25, 420, 3.4, 180, 340, 4, 0.8, 3.5, 0.2, 65, 'all', null, 0],
    ['moringa_powder', 'Moringa powder', 'Poudre de moringa', '🌿', 'special', 303, 27, 4, 38, 19, 400, 28, 18000, 17, 1800, 6, 320, 1300, 7, 0.6, 7.2, 0.95, 25, 'all', null, 0],
    ['sugar', 'Sugar', 'Sucre', '🍬', 'processed', 387, 0, 0, 100, 0, 0, 0.1, 0, 0, 1, 0.01, 0, 2, 99, 0, 1, 0.15, 68, 'all', null, 0],
    ['honey', 'Honey', 'Miel', '🍯', 'processed', 304, 0.3, 0, 82, 0.2, 4, 0.4, 0, 0.5, 6, 0.2, 2, 52, 82, 0, 2.5, 0.9, 45, 'all', null, 0],
    ['pasta', 'Pasta (cooked)', 'Pâtes (cuites)', '🍝', 'processed', 158, 5.8, 0.9, 31, 1.8, 3, 0.5, 0, 0, 7, 0.5, 7, 44, 0.6, 0.1, 1.1, 0.2, 55, 'all', null, 0],
    ['soda', 'Sugary soda', 'Soda sucré', '🥤', 'upf', 42, 0, 0, 10.6, 0, 12, 0, 0, 0, 2, 0, 0, 1, 10.6, 0, 0.9, 0.02, 68, 'all', null, 1],
    ['biscuit', 'Packaged biscuit', 'Biscuit industriel', '🍪', 'upf', 480, 7, 21, 63, 2.4, 480, 2.2, 0, 0, 42, 0.7, 60, 130, 24, 7, 2.6, 0.15, 72, 'all', null, 1],
    ['bouillon', 'Bouillon cube', 'Cube de bouillon', '🧂', 'upf', 180, 12, 5, 20, 2, 22000, 3, 0, 0, 60, 1, 20, 300, 4, 1, 1.2, 0.05, 55, 'all', null, 1],
    ['instant_noodle', 'Instant noodles', 'Nouilles instantanées', '🍜', 'upf', 460, 9, 18, 62, 2.6, 1600, 2.4, 0, 0, 40, 1, 80, 120, 3, 8, 1, 0.05, 72, 'all', null, 1]
  ];
  const FOOD_KEYS = ['id', 'en', 'fr', 'icon', 'group', 'kcal', 'protein', 'fat', 'carb', 'fiber', 'sodium', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium', 'sugar', 'satfat', 'price', 'organic', 'gi', 'countries', 'season', 'upf'];
  const FOODS = FOOD_RAW.map(function (row) {
    const o = {};
    FOOD_KEYS.forEach(function (k, i) { o[k] = row[i]; });
    return o;
  });
  const FOOD_BY_ID = {};
  FOODS.forEach(function (f) { FOOD_BY_ID[f.id] = f; });

  function foodName(f) { return fr() ? f.fr : f.en; }
  function foodsFor(countryCode) {
    const c = String(countryCode || 'TG').toUpperCase();
    return FOODS.filter(function (f) { return f.countries === 'all' || String(f.countries).split(',').indexOf(c) >= 0; });
  }
  function inSeason(f, month) {
    if (!f.season) return true;
    return f.season.indexOf(((month || (new Date().getMonth() + 1)) - 1) % 12 + 1) >= 0;
  }

  /* groupes pour le score de diversité (MDD-W adapté) */
  const DIVERSITY_GROUPS = {
    cereals: 'cereals', tubers: 'cereals', legumes: 'legumes', oilseeds: 'legumes',
    animal: 'animal', veg: 'veg', fruit: 'fruit', oils: 'fats', special: 'cereals',
    processed: 'other', upf: 'other'
  };

  /* ==========================================================================
     2. RÉFÉRENTIELS (adulte + enfant) & BESOINS JOURNALIERS
     ====================================================================== */
  const REF = {
    bmi: [
      { max: 18.5, tone: 'warn', en: 'Underweight', fr: 'Insuffisance pondérale' },
      { max: 25, tone: 'good', en: 'Healthy range', fr: 'Corpulence normale' },
      { max: 30, tone: 'warn', en: 'Overweight', fr: 'Surpoids' },
      { max: 99, tone: 'risk', en: 'Obesity', fr: 'Obésité' }
    ],
    waist: { male: { ok: 94, high: 102 }, female: { ok: 80, high: 88 } },
    whr: { male: 0.9, female: 0.85 },
    bp: [
      { sys: 120, dia: 80, tone: 'good', en: 'Optimal', fr: 'Optimale' },
      { sys: 130, dia: 85, tone: 'ok', en: 'Normal', fr: 'Normale' },
      { sys: 140, dia: 90, tone: 'warn', en: 'High-normal', fr: 'Normale haute' },
      { sys: 160, dia: 100, tone: 'risk', en: 'Hypertension grade 1', fr: 'Hypertension grade 1' },
      { sys: 999, dia: 999, tone: 'risk', en: 'Hypertension grade 2+', fr: 'Hypertension grade 2+' }
    ],
    glucose: [
      { max: 70, tone: 'warn', en: 'Low (hypoglycaemia signal)', fr: 'Basse (signal d\'hypoglycémie)' },
      { max: 100, tone: 'good', en: 'Normal fasting', fr: 'À jeun normale' },
      { max: 126, tone: 'warn', en: 'Impaired fasting glucose', fr: 'Glycémie à jeun anormale' },
      { max: 999, tone: 'risk', en: 'Diabetes range', fr: 'Zone diabète' }
    ],
    hba1c: [
      { max: 5.7, tone: 'good', en: 'Normal', fr: 'Normale' },
      { max: 6.5, tone: 'warn', en: 'Prediabetes', fr: 'Prédiabète' },
      { max: 99, tone: 'risk', en: 'Diabetes', fr: 'Diabète' }
    ],
    chol: [
      { max: 200, tone: 'good', en: 'Desirable', fr: 'Souhaitable' },
      { max: 240, tone: 'warn', en: 'Borderline high', fr: 'Limite haute' },
      { max: 999, tone: 'risk', en: 'High', fr: 'Élevé' }
    ],
    egfr: [
      { min: 90, tone: 'good', en: 'Normal kidney function', fr: 'Fonction rénale normale' },
      { min: 60, tone: 'ok', en: 'Mild decrease', fr: 'Diminution légère' },
      { min: 30, tone: 'warn', en: 'Moderate decrease', fr: 'Diminution modérée' },
      { min: 0, tone: 'risk', en: 'Severe decrease', fr: 'Diminution sévère' }
    ],
    /* Référentiel de démonstration pour enfants 5-18 ans (inspiré OMS 5-19).
       [âge, médiane IMC, écart-type approximatif, médiane taille cm, médiane poids kg] */
    childBmi: {
      male: [[5, 15.3, 1.1, 110, 18.3], [6, 15.3, 1.1, 116, 20.5], [7, 15.4, 1.2, 121.8, 22.9], [8, 15.6, 1.3, 127.3, 25.6], [9, 15.9, 1.4, 132.6, 28.6], [10, 16.3, 1.5, 137.8, 31.9], [11, 16.8, 1.6, 143.5, 35.6], [12, 17.4, 1.8, 149.1, 39.9], [13, 18.1, 1.9, 156.2, 45.3], [14, 18.8, 2, 163.8, 50.8], [15, 19.5, 2.1, 169, 55.4], [16, 20.1, 2.2, 171.6, 58.2], [17, 20.6, 2.2, 173, 60.1], [18, 21, 2.3, 173.7, 61.4]],
      female: [[5, 15, 1.1, 109, 17.8], [6, 15.1, 1.2, 115, 20.2], [7, 15.3, 1.3, 120.8, 22.7], [8, 15.6, 1.4, 126.5, 25.7], [9, 16.1, 1.6, 132.4, 29.1], [10, 16.6, 1.7, 138.5, 33.1], [11, 17.3, 1.9, 144.9, 37.9], [12, 18, 2.1, 151.2, 43.1], [13, 18.8, 2.2, 156.8, 47.9], [14, 19.5, 2.3, 160.1, 51], [15, 20.1, 2.4, 161.5, 52.7], [16, 20.5, 2.4, 162.2, 53.7], [17, 20.8, 2.5, 162.5, 54.4], [18, 21, 2.5, 162.7, 54.9]]
    }
  };
  function refBand(list, value, key) {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.max != null && value < b.max) return b;
      if (b.min != null && value >= b.min) return b;
    }
    return list[list.length - 1];
  }
  function refLabel(band) { return band ? (fr() ? band.fr : band.en) : '—'; }

  /* Besoins journaliers : Mifflin-St Jeor + facteurs d'activité + références micro */
  function requirements(p) {
    const female = String(p.sex || 'female') === 'female';
    const w = U.num(p.weight, 68), h = U.num(p.height, 170), age = U.clamp(U.num(p.age, 35), 5, 100);
    const bmr = female ? 10 * w + 6.25 * h - 5 * age - 161 : 10 * w + 6.25 * h - 5 * age + 5;
    const act = U.clamp(U.num(p.activityMin, 90) / 60, 0, 6);
    const pal = 1.2 + Math.min(0.75, act * 0.13);
    const preg = p.pregnant ? (p.pregnant === 'lactation' ? 500 : 340) : 0;
    const energy = Math.round(bmr * pal + preg);
    const r = {
      energy: energy,
      protein: Math.round(Math.max(0.9, 1.05 + act * 0.05) * w),          // g
      fat: Math.round(energy * 0.28 / 9),
      satfat: Math.round(energy * 0.09 / 9),
      carb: Math.round(energy * 0.55 / 4),
      fiber: female ? 26 : 32,
      sodium: 2000,                                                         // mg (OMS ≤ 2 g Na ≈ 5 g sel)
      sugar: Math.round(energy * 0.05 / 4),
      potassium: 3510,
      iron: female ? (age < 50 ? 18 : 8) : 8,
      vitA: female ? 700 : 900,
      vitC: female ? 75 : 90,
      calcium: age < 19 ? 1300 : 1000,
      zinc: female ? 8 : 11,
      folate: p.pregnant ? 600 : 400,
      water: female ? 2.1 : 2.6
    };
    r.iron = p.pregnant ? 27 : r.iron;
    return r;
  }

  /* ==========================================================================
     3. CONTEXTE PAYS (devises, coûts de santé, disponibilité)
     ====================================================================== */
  const CURRENCIES = {
    BJ: ['FCFA', 600], BF: ['FCFA', 600], CI: ['FCFA', 600], GW: ['FCFA', 600], ML: ['FCFA', 600],
    NE: ['FCFA', 600], SN: ['FCFA', 600], TG: ['FCFA', 600], GH: ['GHS', 15.2], NG: ['NGN', 1520],
    GM: ['GMD', 72], CV: ['CVE', 100], GN: ['GNF', 8600], LR: ['LRD', 190], SL: ['SLE', 22.5],
    MR: ['MRU', 40], TD: ['FCFA', 600]
  };
  /* Coût annuel moyen pris en charge + reste à charge par pathologie (USD, ordres de grandeur IDF/OMS). */
  const HEALTH_COST = { t2d: { yearly: 640, years: 6, days: 14 }, htn: { yearly: 240, years: 8, days: 6 }, cvd: { yearly: 2100, years: 2.5, days: 42 }, anemia: { yearly: 120, years: 3, days: 9 }, obesity: { yearly: 380, years: 5, days: 8 } };
  /* Part d'offre agricole bio/local disponible par pays (démonstration — alimente le volet agricole). */
  const ORGANIC_SUPPLY = { TG: 0.34, BJ: 0.31, BF: 0.44, CI: 0.29, CV: 0.18, GM: 0.22, GH: 0.38, GN: 0.26, GW: 0.19, LR: 0.17, ML: 0.41, NE: 0.33, NG: 0.27, SN: 0.36, SL: 0.16, MR: 0.2, TD: 0.24, default: 0.28 };

  function manifestCountries() {
    const m = global.NUTRI_V34_MANIFEST;
    if (m && m.countries && m.countries.length) return m.countries;
    return [{ code: 'TG', name: 'Togo' }];
  }
  function countryCode() {
    const sel = document.getElementById('country') || document.getElementById('countrySelector');
    const v = sel && sel.value;
    return (v && String(v).toUpperCase()) || 'TG';
  }
  function countryName(code) {
    const c = (code || countryCode()).toUpperCase();
    const hit = manifestCountries().filter((x) => String(x.code).toUpperCase() === c)[0];
    return hit ? hit.name : c;
  }
  function currency(code) { return CURRENCIES[(code || countryCode()).toUpperCase()] || ['USD', 1]; }
  function money(usd, code) {
    const cur = currency(code);
    const v = usd * cur[1];
    return (cur[0] === 'USD' ? '$' : '') + U.fmtInt(v) + (cur[0] === 'USD' ? '' : ' ' + cur[0]);
  }
  function organicSupply(code) { return ORGANIC_SUPPLY[(code || countryCode()).toUpperCase()] != null ? ORGANIC_SUPPLY[(code || countryCode()).toUpperCase()] : ORGANIC_SUPPLY.default; }

  /* ==========================================================================
     4. ÉTAT
     ====================================================================== */
  const store = NV.store.ns('citizen');
  const DEFAULT_PROFILE = {
    name: '', sex: 'female', age: 34, height: 167, weight: 71.5, waist: 88, hip: 103,
    glucose: 104, hba1c: 5.8, sbp: 129, dbp: 83, chol: 206, creatinine: 0.9, egfr: 92,
    activityMin: 78, sleep: 6.4, fruitVeg: 2.4, sodiumMg: 5200, upf: 34, water: 1.6,
    smoke: false, alcohol: 2, pregnant: false, hemoglobin: 11.8, diversity: 4.2
  };
  const DEFAULT_SCENARIO = { weightPct: 0, activityMin: 78, fruitVeg: 2.4, sodiumMg: 5200, sodaWk: 4, upf: 34, sleep: 6.4, organic: 30, adherence: 55, smoke: false, alcohol: 2 };
  const DEFAULT_SETTINGS = { period: 90, predVar: 'weight', horizon: 24, trials: 1000, live: true, speed: 1, child: 'child1' };

  const State = {
    profile: Object.assign({}, DEFAULT_PROFILE, store.get('profile', {}) || {}),
    scenario: Object.assign({}, DEFAULT_SCENARIO, store.get('scenario', {}) || {}),
    settings: Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}) || {}),
    journal: store.get('journal', []) || [],
    dismissed: store.get('dismissed', []) || [],
    consent: store.get('consent', {}) || {},
    live: { hr: 74, hrv: 48, spo2: 97.6, steps: 6420, sleep: 6.4, water: 1.4, cgm: 101, kcal: 1610 },
    history: null,
    cache: {},
    charts: {},
    mounted: false
  };
  function save(k) {
    if (k === 'all' || !k) { store.set('profile', State.profile); store.set('scenario', State.scenario); store.set('settings', State.settings); store.set('journal', State.journal.slice(-400)); store.set('dismissed', State.dismissed); store.set('consent', State.consent); }
    else store.set(k, State[k]);
  }

  /* ==========================================================================
     5. MOTEURS DE CALCUL
     ====================================================================== */
  /* Courbe de notation par morceaux : stops = [[valeur, score], ...] croissant */
  function grade(v, stops) {
    const x = U.num(v, NaN);
    if (!isFinite(x)) return null;
    if (x <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const [x0, y0] = stops[i - 1], [x1, y1] = stops[i];
        return Math.round(U.lerp(y0, y1, (x - x0) / ((x1 - x0) || 1)));
      }
    }
    return stops[stops.length - 1][1];
  }
  const GRADES = {
    bmi: [[15, 22], [17.5, 55], [18.5, 74], [21, 100], [23.5, 96], [25, 84], [27, 64], [30, 42], [33, 26], [37, 12], [45, 4]],
    waistM: [[70, 96], [82, 100], [94, 74], [102, 48], [112, 24], [125, 8]],
    waistF: [[62, 94], [72, 100], [80, 78], [88, 50], [98, 26], [112, 8]],
    glucose: [[55, 34], [70, 76], [85, 100], [99, 84], [110, 62], [126, 38], [150, 20], [200, 8], [300, 2]],
    hba1c: [[4.4, 62], [5.1, 100], [5.6, 88], [6, 68], [6.5, 46], [7.2, 30], [8.5, 14], [11, 5]],
    sbp: [[88, 56], [100, 90], [118, 100], [128, 80], [138, 58], [148, 40], [160, 24], [180, 8]],
    dbp: [[55, 52], [68, 92], [78, 100], [85, 82], [90, 62], [100, 36], [115, 12]],
    chol: [[140, 66], [170, 94], [195, 100], [215, 74], [240, 50], [270, 26], [320, 8]],
    egfr: [[10, 4], [30, 22], [45, 46], [60, 70], [75, 86], [90, 97], [110, 100], [150, 84]],
    activity: [[0, 8], [40, 34], [90, 62], [150, 92], [210, 100], [300, 94], [420, 76]],
    sleep: [[3.5, 22], [5, 55], [6, 82], [7, 100], [8, 96], [9, 84], [11, 48]],
    fruitveg: [[0, 4], [1, 26], [2, 46], [3, 66], [4, 82], [5, 94], [6.5, 100], [9, 96], [12, 88]],
    sodium: [[800, 74], [1500, 96], [2000, 100], [2800, 74], [3800, 50], [5000, 30], [6500, 16], [9000, 5]],
    upf: [[0, 100], [8, 94], [16, 84], [26, 68], [36, 52], [48, 34], [62, 20], [80, 8], [100, 2]],
    water: [[0.4, 34], [1.2, 74], [1.9, 98], [2.5, 100], [3.4, 88], [5, 66]],
    diversity: [[0, 4], [2, 34], [3, 52], [4, 68], [5, 80], [6, 90], [7.5, 98], [9, 100], [10, 98]],
    hemoglobin: [[6, 6], [8, 26], [10, 52], [11, 72], [12, 90], [13.5, 100], [16, 96], [18, 62]],
    whrM: [[0.78, 100], [0.86, 92], [0.9, 74], [0.96, 50], [1.04, 26], [1.15, 8]],
    whrF: [[0.7, 100], [0.78, 94], [0.85, 72], [0.9, 50], [0.96, 28], [1.05, 8]]
  };
  function g(name, v) { const s = grade(v, GRADES[name]); return s == null ? 70 : s; }
  function avg(pairs) {
    let sum = 0, wsum = 0;
    pairs.forEach((p) => { if (p[0] != null && isFinite(p[0])) { sum += p[0] * p[1]; wsum += p[1]; } });
    return wsum ? sum / wsum : 70;
  }

  /* ---- indicateurs dérivés ------------------------------------------------ */
  function derived(p) {
    const female = String(p.sex) === 'female';
    const h = U.num(p.height, 170) / 100, w = U.num(p.weight, 70);
    const bmi = h > 0 ? w / (h * h) : 0;
    const waist = U.num(p.waist, 0), hip = U.num(p.hip, 0);
    const whr = hip > 0 ? waist / hip : 0;
    const whtr = h > 0 && waist ? waist / (h * 100) : 0;
    const req = requirements(p);
    const sbp = U.num(p.sbp, 0), dbp = U.num(p.dbp, 0);
    const map = sbp && dbp ? dbp + (sbp - dbp) / 3 : 0;
    const pp = sbp && dbp ? sbp - dbp : 0;
    const creat = U.num(p.creatinine, 0);
    let egfr = U.num(p.egfr, 0);
    if (!egfr && creat > 0) {
      const age = U.num(p.age, 35), k = female ? 0.7 : 0.9, a = female ? -0.329 : -0.411;
      egfr = 142 * Math.pow(Math.min(creat / k, 1), a) * Math.pow(Math.max(creat / k, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
    }
    return {
      bmi, whr, whtr, map, pp, egfr: egfr || null, req, female,
      energyBalance: 0,
      bmr: Math.round(female ? 10 * w + 6.25 * (h * 100) - 5 * U.num(p.age, 35) - 161 : 10 * w + 6.25 * (h * 100) - 5 * U.num(p.age, 35) + 5)
    };
  }

  /* ---- apports (journal ou habitudes déclarées) --------------------------- */
  function intake(p) {
    const today = todayKey();
    const entries = State.journal.filter((e) => e.date === today);
    const out = { source: entries.length ? 'journal' : 'declared', meals: entries.length, energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, sodium: 0, iron: 0, vitA: 0, vitC: 0, calcium: 0, zinc: 0, folate: 0, potassium: 0, sugar: 0, satfat: 0, diversity: 0, groups: {}, organic: 0, cost: 0, gi: 0 };
    if (entries.length) {
      const groups = {};
      entries.forEach((e) => {
        const f = FOOD_BY_ID[e.food];
        if (!f) return;
        const k = U.num(e.grams, 100) / 100;
        out.energy += f.kcal * k; out.protein += f.protein * k; out.fat += f.fat * k; out.carb += f.carb * k;
        out.fiber += f.fiber * k; out.sodium += f.sodium * k; out.iron += f.iron * k; out.vitA += f.vitA * k;
        out.vitC += f.vitC * k; out.calcium += f.calcium * k; out.zinc += f.zinc * k; out.folate += f.folate * k;
        out.potassium += f.potassium * k; out.sugar += f.sugar * k; out.satfat += f.satfat * k;
        out.cost += f.price * k; out.organic += (e.organic ? 1 : 0);
        out.gi += f.gi * (f.carb * k);
        const dg = DIVERSITY_GROUPS[f.group] || 'other';
        groups[dg] = 1;
      });
      out.groups = groups;
      out.diversity = Object.keys(groups).length + (entries.length >= 5 ? 1 : 0);
      out.gi = out.carb ? out.gi / out.carb : 0;
      out.organicPct = entries.length ? Math.round((out.organic / entries.length) * 100) : 0;
      ['energy', 'protein', 'fat', 'carb', 'fiber', 'sodium', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium', 'sugar', 'satfat', 'cost'].forEach((k) => { out[k] = Math.round(out[k] * 10) / 10; });
      return out;
    }
    /* repli : habitudes déclarées → estimation d'apports */
    const req = requirements(p);
    const fv = U.num(p.fruitVeg, 2.5);
    out.source = 'declared';
    out.energy = req.energy * (0.94 + U.num(p.upf, 30) / 620 + Math.max(0, 3 - fv) * 0.012);
    out.protein = req.protein * (0.82 + Math.min(0.4, fv * 0.03));
    out.fat = req.fat * (0.95 + U.num(p.upf, 30) / 240);
    out.carb = req.carb;
    out.fiber = 8 + fv * 3.4 + Math.max(0, (100 - U.num(p.upf, 30)) - 60) * 0.16;
    out.sodium = U.num(p.sodiumMg, 5000);
    out.iron = req.iron * (0.72 + Math.min(0.6, fv * 0.07));
    out.vitA = req.vitA * (0.6 + Math.min(0.8, fv * 0.14));
    out.vitC = req.vitC * (0.55 + Math.min(1.1, fv * 0.2));
    out.calcium = req.calcium * 0.68;
    out.zinc = req.zinc * 0.8;
    out.folate = req.folate * (0.7 + Math.min(0.5, fv * 0.08));
    out.potassium = req.potassium * (0.62 + Math.min(0.5, fv * 0.09));
    out.sugar = req.sugar * (1 + U.num(p.sodaWk, 4) / 8 + U.num(p.upf, 30) / 120);
    out.satfat = req.satfat * (0.9 + U.num(p.upf, 30) / 150);
    out.diversity = U.clamp(2 + fv * 0.9 - U.num(p.upf, 30) / 22, 1, 10);
    out.organicPct = U.clamp(Math.round(organicSupply() * 100 * (1 - U.num(p.upf, 30) / 160)), 0, 100);
    out.cost = 1.6 + fv * 0.16;
    ['energy', 'protein', 'fat', 'carb', 'fiber', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium', 'sugar', 'satfat'].forEach((k) => { out[k] = Math.round(out[k] * 10) / 10; });
    out.sodium = Math.round(out.sodium);
    return out;
  }

  /* ---- NutriScore composite ---------------------------------------------- */
  function scoreProfile(p, it) {
    const d = derived(p);
    it = it || intake(p);
    const req = d.req;
    const fiberPct = req.fiber ? U.clamp(it.fiber / req.fiber, 0, 1.6) : 0.5;
    const sugarPct = req.sugar ? U.clamp(it.sugar / req.sugar, 0, 3) : 1;
    const monitoring = U.clamp(28 + State.journal.length * 2.2 + (U.num(p.weight) ? 12 : 0) + (U.num(p.sbp) ? 8 : 0) + (U.num(p.glucose) ? 8 : 0) + (U.num(p.hba1c) ? 6 : 0), 0, 100);
    const parts = [
      {
        key: 'anthro', label: t('score.anthro'), weight: 0.22,
        score: Math.round(avg([[g('bmi', d.bmi), 0.5], [g(d.female ? 'waistF' : 'waistM', p.waist), 0.3], [g(d.female ? 'whrF' : 'whrM', d.whr || (d.female ? 0.8 : 0.9)), 0.2]]))
      },
      {
        key: 'metabolic', label: t('score.metabolic'), weight: 0.26,
        score: Math.round(avg([[g('glucose', p.glucose), 0.3], [g('hba1c', p.hba1c), 0.26], [g('sbp', p.sbp), 0.2], [g('dbp', p.dbp), 0.08], [g('chol', p.chol), 0.1], [g('egfr', d.egfr), 0.06]]))
      },
      {
        key: 'diet', label: t('score.diet'), weight: 0.3,
        score: Math.round(avg([[g('diversity', it.diversity), 0.24], [g('fruitveg', U.num(p.fruitVeg, 2)), 0.18], [g('sodium', it.sodium), 0.2], [g('upf', U.num(p.upf, 30)), 0.14], [U.clamp(40 + fiberPct * 62 - Math.max(0, sugarPct - 1) * 34, 2, 100), 0.16], [U.clamp(it.organicPct || 0, 0, 100) * 0.55 + 45, 0.08]]))
      },
      {
        key: 'lifestyle', label: t('score.lifestyle'), weight: 0.14,
        score: Math.round(avg([[g('activity', U.num(p.activityMin, 60)), 0.38], [g('sleep', U.num(p.sleep, 6.5)), 0.3], [g('water', U.num(p.water, 1.6)), 0.16], [p.smoke ? 6 : 100, 0.1], [U.clamp(100 - U.num(p.alcohol, 0) * 6, 0, 100), 0.06]]))
      },
      { key: 'data', label: t('score.data'), weight: 0.08, score: Math.round(monitoring) }
    ];
    const total = Math.round(parts.reduce((a, x) => a + x.score * x.weight, 0));
    const band = total >= 82 ? 'optimal' : total >= 68 ? 'good' : total >= 52 ? 'watch' : 'risk';
    return { total, parts, band, it, d };
  }
  function bandLabel(band) {
    return band === 'optimal' ? t('score.band.optimal') : band === 'good' ? t('score.band.good') : band === 'watch' ? t('score.band.watch') : t('score.band.risk');
  }
  function bandTone(band) { return band === 'optimal' ? 'good' : band === 'good' ? 'ok' : band === 'watch' ? 'warn' : 'risk'; }

  /* ---- historique reconstitué (pont brownien seedé) ---------------------- */
  const SERIES_DEF = {
    weight: { vol: 0.0035, drift: 0.00022 }, bmi: { vol: 0.0035, drift: 0.00022 }, waist: { vol: 0.0022, drift: 0.00016 },
    sbp: { vol: 0.014, drift: -0.00008 }, dbp: { vol: 0.013, drift: -0.00006 }, glucose: { vol: 0.05, drift: -0.0004 },
    hba1c: { vol: 0.006, drift: -0.00004 }, chol: { vol: 0.011, drift: -0.00005 }, score: { vol: 0.012, drift: 0.0009 },
    steps: { vol: 0.22, drift: 0.0022 }, sleep: { vol: 0.06, drift: 0.0006 }, activityMin: { vol: 0.18, drift: 0.0026 },
    sodiumMg: { vol: 0.09, drift: -0.0009 }, fruitVeg: { vol: 0.19, drift: 0.0016 }, diversity: { vol: 0.12, drift: 0.0016 },
    energy: { vol: 0.09, drift: -0.0004 }, hemoglobin: { vol: 0.012, drift: 0.00008 }, upf: { vol: 0.12, drift: -0.0016 }
  };
  function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function buildHistory(p, days) {
    const N = Math.max(30, days | 0);
    const seed = U.hash([p.sex, p.age, U.round(p.weight, 1), U.round(p.height, 1), countryCode(), N].join('|'));
    const rng = RNG(seed);
    const out = { days: N, dates: [], series: {} };
    for (let i = 0; i < N; i++) out.dates.push(U.daysAgo(N - 1 - i));
    const sc = scoreProfile(p);
    const bias = (sc.total - 68) / 100;   // >0 = profil plutôt sain → tendance favorable
    Object.keys(SERIES_DEF).forEach((key) => {
      const def = SERIES_DEF[key];
      let last = U.num(p[key], NaN);
      if (!isFinite(last)) {
        const proxy = { bmi: sc.d.bmi, score: sc.total, energy: sc.it.energy, diversity: sc.it.diversity, sodiumMg: sc.it.sodium, upf: U.num(p.upf, 34), steps: 6400, hemoglobin: 12 }[key];
        last = U.num(proxy, 0) || 1;
      }
      const driftTotal = -def.drift * N * last * (0.4 + bias) * (key === 'score' || key === 'steps' || key === 'activityMin' || key === 'fruitVeg' || key === 'diversity' || key === 'sleep' || key === 'hemoglobin' ? 1.6 : 1);
      const noise = [];
      let acc = 0;
      for (let i = 0; i < N; i++) { acc += rng.gauss(0, def.vol * Math.abs(last)); noise.push(acc); }
      const endNoise = noise[N - 1];
      const weekly = key === 'steps' || key === 'activityMin' || key === 'sleep' || key === 'energy' || key === 'sodiumMg';
      const arr = [];
      for (let i = 0; i < N; i++) {
        let v = (last - driftTotal) + driftTotal * (i / (N - 1)) + (noise[i] - (i / (N - 1)) * endNoise);
        if (weekly) v *= 1 + 0.09 * Math.sin((i / 7) * Math.PI * 2 + seed % 3);
        if (key === 'steps' || key === 'activityMin') v = Math.max(0, v);
        if (key === 'score') v = U.clamp(v, 5, 99);
        if (key === 'hemoglobin') v = U.clamp(v, 5, 18);
        arr.push(Math.round(v * 100) / 100);
      }
      arr[N - 1] = Math.round(last * 100) / 100;
      out.series[key] = arr;
    });
    return out;
  }
  function history() {
    if (!State.history || State.history.profileKey !== profileKey() || State.history.days !== 400) {
      State.history = buildHistory(State.profile, 400);
      State.history.profileKey = profileKey();
    }
    return State.history;
  }
  function profileKey() { return JSON.stringify([State.profile.sex, State.profile.age, State.profile.weight, State.profile.sbp, State.profile.glucose, State.profile.hba1c, State.profile.upf, State.profile.activityMin, countryCode()]); }
  function slice(key, days) {
    const h = history(), n = h.series[key] || [];
    return n.slice(Math.max(0, n.length - days));
  }
  function sliceDates(days) {
    const h = history();
    return h.dates.slice(Math.max(0, h.dates.length - days));
  }
  function monthly(key, months) {
    const h = history(), n = h.series[key] || [];
    const per = Math.max(1, Math.round(n.length / Math.max(1, months)));
    const out = [], labs = [];
    for (let i = months - 1; i >= 0; i--) {
      const end = n.length - i * per, start = Math.max(0, end - per);
      const chunk = n.slice(start, end);
      if (!chunk.length) continue;
      out.push(Math.round(S.mean(chunk) * 100) / 100);
      const d = h.dates[Math.min(h.dates.length - 1, end - 1)];
      labs.push(U.monthLabel(d) + (d.getMonth() === 0 ? ' ' + d.getFullYear() : ''));
    }
    return { values: out, labels: labs };
  }

  /* ---- modèles de risque 10 ans (logistique linéaire explicable) --------- */
  function dl(x, lo, hi) { return U.clamp(U.num(x, 0), lo == null ? -2.4 : lo, hi == null ? 2.8 : hi); }
  const RISK_BANDS = {
    t2d: [0.05, 0.11, 0.22], htn: [0.12, 0.24, 0.42], cvd: [0.05, 0.11, 0.2],
    anemia: [0.18, 0.34, 0.5], obesity: [0.2, 0.4, 0.6]
  };
  function riskBand(key, p) {
    const b = RISK_BANDS[key] || [0.1, 0.2, 0.35];
    if (p < b[0]) return { tone: 'good', label: t('risk.low') };
    if (p < b[1]) return { tone: 'ok', label: t('risk.mod') };
    if (p < b[2]) return { tone: 'warn', label: t('risk.high') };
    return { tone: 'risk', label: t('risk.veryhigh') };
  }
  function risksFor(p, opt) {
    const o = opt || {};
    const d = derived(p);
    const it = o.it || intake(p);
    const req = d.req;
    const age = U.clamp(U.num(p.age, 35), 5, 95);
    const female = d.female;
    const waistRef = female ? 80 : 94;
    const fv = U.num(p.fruitVeg, 2.5), act = U.num(p.activityMin, 60), upf = U.num(p.upf, 30);
    const sleep = U.num(p.sleep, 6.5), alc = U.num(p.alcohol, 0), smoke = p.smoke ? 1 : 0;
    const sodiumG = U.num(it.sodium, 5000) / 1000;
    const adher = U.clamp(U.num(o.adherence, State.scenario.adherence), 0, 100) / 100;
    const adherMod = (v) => v * (0.35 + 0.65 * adher);  // l'adhésion au plan amortit les facteurs défavorables
    const out = {};

    /* Diabète de type 2 */
    const baseT2D = S.sigmoid(-4.42 + 0.043 * Math.max(0, age - 30) + (female ? 0 : 0.1) + 0.055 * (d.bmi - 23) + (p.pregnant ? 0.5 : 0));
    out.t2d = S.linearRisk(baseT2D, [
      { key: 'bmi', label: t('kpi.bmi') + ' ' + U.fmt(d.bmi, 1), delta: dl(adherMod(0.125 * (d.bmi - 23))) },
      { key: 'waist', label: t('kpi.waist') + ' ' + U.fmt(p.waist, 0) + ' cm', delta: dl(adherMod(0.062 * ((U.num(p.waist, waistRef) - waistRef) / 4))) },
      { key: 'glucose', label: t('kpi.glucose') + ' ' + U.fmt(p.glucose, 0) + ' mg/dL', delta: dl(adherMod(0.085 * ((U.num(p.glucose, 92) - 92) / 6))) },
      { key: 'hba1c', label: 'HbA1c ' + U.fmt(p.hba1c, 1) + ' %', delta: dl(adherMod(0.92 * (U.num(p.hba1c, 5.3) - 5.3))) },
      { key: 'activity', label: t('lev.activity') + ' ' + U.fmtInt(act) + ' min/sem', delta: dl(-0.0042 * (act - 100), -1.2, 0.9) },
      { key: 'upf', label: t('lev.upf') + ' ' + U.fmtInt(upf) + ' %', delta: dl(adherMod(0.019 * (upf - 18))) },
      { key: 'fruitveg', label: t('lev.fruitveg') + ' ' + U.fmt(fv, 1) + '/j', delta: dl(-0.095 * (fv - 3), -1.1, 0.8) },
      { key: 'sugar', label: 'Sucres libres ' + U.fmt(it.sugar, 0) + ' g', delta: dl(adherMod(0.055 * ((it.sugar - req.sugar) / 8)), -0.8, 1.4) },
      { key: 'sleep', label: t('lev.sleep') + ' ' + U.fmt(sleep, 1) + ' h', delta: dl(adherMod(0.19 * (6.9 - sleep)), -0.6, 1) },
      { key: 'sbp', label: 'PAS ' + U.fmt(p.sbp, 0) + ' mmHg', delta: dl(adherMod(0.013 * ((U.num(p.sbp, 118) - 118) / 4)), -0.6, 1.2) }
    ]);

    /* Hypertension */
    const baseHTN = S.sigmoid(-4.05 + 0.062 * Math.max(0, age - 30) + 0.075 * (d.bmi - 23));
    out.htn = S.linearRisk(baseHTN, [
      { key: 'sbp', label: 'PAS ' + U.fmt(p.sbp, 0) + ' mmHg', delta: dl(adherMod(0.115 * ((U.num(p.sbp, 118) - 118) / 5)), -1.2, 3.2) },
      { key: 'dbp', label: 'PAD ' + U.fmt(p.dbp, 0) + ' mmHg', delta: dl(adherMod(0.1 * ((U.num(p.dbp, 78) - 78) / 4)), -0.9, 2.6) },
      { key: 'sodium', label: 'Sel ' + U.fmt(sodiumG, 1) + ' g/j', delta: dl(adherMod(0.34 * (sodiumG - 2)), -0.9, 2.4) },
      { key: 'bmi', label: t('kpi.bmi') + ' ' + U.fmt(d.bmi, 1), delta: dl(adherMod(0.105 * (d.bmi - 23))) },
      { key: 'potassium', label: 'Fruits & légumes ' + U.fmt(fv, 1) + '/j', delta: dl(-0.13 * (fv - 2.5), -1.1, 0.7) },
      { key: 'activity', label: t('lev.activity') + ' ' + U.fmtInt(act) + ' min/sem', delta: dl(-0.0035 * (act - 100), -1, 0.7) },
      { key: 'alcohol', label: t('lev.alcohol') + ' ' + U.fmt(alc, 0) + ' u/sem', delta: dl(adherMod(0.05 * (alc - 2)), -0.3, 1.2) },
      { key: 'sleep', label: t('lev.sleep') + ' ' + U.fmt(sleep, 1) + ' h', delta: dl(adherMod(0.16 * (6.9 - sleep)), -0.5, 0.9) },
      { key: 'upf', label: t('lev.upf') + ' ' + U.fmtInt(upf) + ' %', delta: dl(adherMod(0.012 * (upf - 20)), -0.5, 1) }
    ]);

    /* Maladie cardiovasculaire */
    const baseCVD = S.sigmoid(-4.95 + 0.068 * Math.max(0, age - 30) + 0.05 * (d.bmi - 23) + (female ? -0.35 : 0));
    out.cvd = S.linearRisk(baseCVD, [
      { key: 'chol', label: t('kpi.chol') + ' ' + U.fmt(p.chol, 0) + ' mg/dL', delta: dl(adherMod(0.019 * (U.num(p.chol, 195) - 195)), -0.8, 1.8) },
      { key: 'sbp', label: 'PAS ' + U.fmt(p.sbp, 0) + ' mmHg', delta: dl(adherMod(0.062 * ((U.num(p.sbp, 118) - 118) / 5)), -0.7, 2.2) },
      { key: 'smoke', label: t('lev.smoke'), delta: smoke ? dl(0.85) : dl(-0.12) },
      { key: 'glyc', label: 'HbA1c ' + U.fmt(p.hba1c, 1) + ' %', delta: dl(adherMod(0.42 * (U.num(p.hba1c, 5.3) - 5.3))) },
      { key: 'bmi', label: t('kpi.bmi') + ' ' + U.fmt(d.bmi, 1), delta: dl(adherMod(0.075 * (d.bmi - 23))) },
      { key: 'activity', label: t('lev.activity') + ' ' + U.fmtInt(act) + ' min/sem', delta: dl(-0.0038 * (act - 100), -1.1, 0.8) },
      { key: 'upf', label: t('lev.upf') + ' ' + U.fmtInt(upf) + ' %', delta: dl(adherMod(0.014 * (upf - 18)), -0.5, 1.1) },
      { key: 'egfr', label: 'DFG ' + U.fmt(d.egfr, 0), delta: d.egfr ? dl(0.02 * (90 - d.egfr), -0.4, 1.6) : { delta: 0 } }
    ]);

    /* Anémie / déficit en fer */
    const baseAn = female ? (age < 50 ? 0.3 : 0.17) : 0.1;
    const ironCov = req.iron ? it.iron / req.iron : 1;
    out.anemia = S.linearRisk(p.pregnant ? Math.max(baseAn, 0.4) : baseAn, [
      { key: 'iron', label: 'Fer ' + U.fmt(it.iron, 1) + ' mg', delta: dl(adherMod(-1.15 * (ironCov - 0.85)), -1.6, 1.8) },
      { key: 'vitc', label: 'Vitamine C ' + U.fmt(it.vitC, 0) + ' mg', delta: dl(adherMod(-0.6 * ((it.vitC / (req.vitC || 75)) - 0.8)), -0.9, 1) },
      { key: 'animal', label: 'Aliments d\'origine animale', delta: dl(adherMod(it.groups && it.groups.animal ? -0.45 : 0.35)) },
      { key: 'diversity', label: t('kpi.diversity') + ' ' + U.fmt(it.diversity, 1) + '/10', delta: dl(adherMod(-0.16 * (it.diversity - 4)), -1.1, 1.1) },
      { key: 'upf', label: t('lev.upf') + ' ' + U.fmtInt(upf) + ' %', delta: dl(adherMod(0.012 * (upf - 20)), -0.4, 0.9) },
      { key: 'hb', label: 'Hémoglobine ' + U.fmt(p.hemoglobin, 1) + ' g/dL', delta: p.hemoglobin ? dl(-0.55 * (U.num(p.hemoglobin, 12) - 11.8), -1.8, 2.4) : { delta: 0 } }
    ]);

    /* Progression pondérale / double fardeau */
    const baseOb = S.sigmoid(-1.9 - 0.017 * Math.max(0, age - 30) + 0.3 * (d.bmi - 23));
    const balance = (it.energy - req.energy) / Math.max(400, req.energy);
    out.obesity = S.linearRisk(baseOb, [
      { key: 'balance', label: 'Balance énergétique ' + U.signed(balance * 100, 0) + ' %', delta: dl(adherMod(4.2 * balance), -1.2, 2) },
      { key: 'bmi', label: t('kpi.bmi') + ' ' + U.fmt(d.bmi, 1), delta: dl(0.22 * (d.bmi - 23), -1, 2.4) },
      { key: 'activity', label: t('lev.activity') + ' ' + U.fmtInt(act) + ' min/sem', delta: dl(-0.0045 * (act - 110), -1.2, 0.9) },
      { key: 'upf', label: t('lev.upf') + ' ' + U.fmtInt(upf) + ' %', delta: dl(adherMod(0.02 * (upf - 18)), -0.5, 1.4) },
      { key: 'soda', label: t('lev.sugar') + ' ' + U.fmt(p.sodaWk == null ? State.scenario.sodaWk : p.sodaWk, 0) + '/sem', delta: dl(adherMod(0.09 * (U.num(p.sodaWk == null ? State.scenario.sodaWk : p.sodaWk, 4) - 1)), -0.4, 1.3) },
      { key: 'sleep', label: t('lev.sleep') + ' ' + U.fmt(sleep, 1) + ' h', delta: dl(adherMod(0.2 * (6.9 - sleep)), -0.5, 1) },
      { key: 'fruitveg', label: t('lev.fruitveg') + ' ' + U.fmt(fv, 1) + '/j', delta: dl(-0.1 * (fv - 3), -0.9, 0.7) }
    ]);

    const labels = { t2d: t('risk.t2d'), htn: t('risk.htn'), cvd: t('risk.cvd'), anemia: t('risk.anemia'), obesity: t('risk.obesity') };
    Object.keys(out).forEach((k) => {
      const r = out[k];
      r.key = k; r.label = labels[k];
      r.ci = S.riskCI(r.p0, r.contributions.map((c) => ({ key: c.key, label: c.label, delta: c.delta })), { trials: 240, seed: 'ci-' + k + profileKey().length });
      r.band = riskBand(k, r.p);
      r.contributions = r.contributions.filter((c) => Math.abs(c.delta) > 0.004);
    });
    return out;
  }

  /* ---- profil « scénario » (leviers appliqués) --------------------------- */
  function scenarioProfile() {
    const s = State.scenario, p = State.profile, d = derived(p);
    const w = U.num(p.weight, 70) * (1 + U.num(s.weightPct, 0) / 100);
    const h = U.num(p.height, 170) / 100;
    return Object.assign({}, p, {
      weight: w,
      bmi: h ? w / (h * h) : d.bmi,
      waist: U.num(p.waist, 0) * (1 + U.num(s.weightPct, 0) / 150),
      activityMin: U.num(s.activityMin, 78),
      fruitVeg: U.num(s.fruitVeg, 2.4),
      sodiumMg: U.num(s.sodiumMg, 5200),
      upf: U.num(s.upf, 34),
      sleep: U.num(s.sleep, 6.4),
      smoke: !!s.smoke,
      alcohol: U.num(s.alcohol, 2),
      sodaWk: U.num(s.sodaWk, 4)
    });
  }
  /* dérive mensuelle imposée par le scénario pour la prévision */
  function scenarioDrift(key) {
    const s = State.scenario, p = State.profile, d = derived(p);
    const wDelta = U.num(p.weight, 70) * (U.num(s.weightPct, 0) / 100);
    const actDelta = U.num(s.activityMin, 78) - U.num(p.activityMin, 78);
    const naDelta = (U.num(s.sodiumMg, 5200) - U.num(p.sodiumMg, 5200)) / 1000;
    const per = {
      weight: wDelta / 5,
      bmi: (wDelta / 5) / Math.pow(U.num(p.height, 170) / 100, 2),
      waist: (U.num(s.weightPct, 0) / 100 * U.num(p.waist, 85)) / 6,
      sbp: -(wDelta * 0.9 + naDelta * 1.6 + actDelta * 0.012) / 4,
      dbp: -(wDelta * 0.5 + naDelta * 0.9 + actDelta * 0.008) / 4,
      glucose: -(wDelta * 1.1 + actDelta * 0.03 + (U.num(s.fruitVeg, 2.4) - U.num(p.fruitVeg, 2.4)) * 0.7) / 4,
      hba1c: -(wDelta * 0.035 + actDelta * 0.0012) / 3,
      chol: -(actDelta * 0.02 + (U.num(s.upf, 34) - U.num(p.upf, 34)) * 0.25) / 5,
      score: (scoreProfile(scenarioProfile()).total - scoreProfile(p).total) / 5,
      steps: actDelta * 22,
      activityMin: actDelta / 4,
      sleep: (U.num(s.sleep, 6.4) - U.num(p.sleep, 6.4)) / 4,
      sodiumMg: naDelta * 1000 / 3,
      fruitVeg: (U.num(s.fruitVeg, 2.4) - U.num(p.fruitVeg, 2.4)) / 4,
      diversity: (U.num(s.fruitVeg, 2.4) - U.num(p.fruitVeg, 2.4)) * 0.22,
      upf: (U.num(s.upf, 34) - U.num(p.upf, 34)) / 4,
      energy: -(wDelta * 22),
      hemoglobin: (U.num(s.fruitVeg, 2.4) - U.num(p.fruitVeg, 2.4)) * 0.012
    };
    return per[key] || 0;
  }
  const BOUNDS = { weight: [25, 320], bmi: [9, 75], waist: [40, 200], sbp: [70, 240], dbp: [40, 150], glucose: [40, 420], hba1c: [3.5, 16], chol: [80, 480], score: [5, 100], steps: [0, 60000], sleep: [2, 13], sodiumMg: [300, 15000], fruitVeg: [0, 14], diversity: [0, 10], upf: [0, 100], energy: [600, 6500], hemoglobin: [4, 20], activityMin: [0, 900] };
  function forecastVar(key, months, withScenario) {
    const m = monthly(key, 12);
    const past = m.values;
    const b = BOUNDS[key] || [null, null];
    const useSc = withScenario !== false;
    /* les deux trajectoires partent du même point présent : seule la dérive
       mensuelle imposée par le scénario les fait diverger (comparaison lisible). */
    const drift = useSc ? scenarioDrift(key) * 0.55 : 0;
    const fc = S.forecast(past, Math.max(2, months), {
      seed: 'fc-' + key + '-' + months + (withScenario === false ? '-base' : '-sc') + '-' + U.num(State.settings.rerun, 0),
      trials: U.clamp(State.settings.trials, 200, 4000),
      drift: drift, min: b[0], max: b[1], vol: 1
    });
    return { past: past, labels: m.labels, fc: fc, key: key, months: months, drift: drift };
  }

  /* ---- cohorte de Markov (progression métabolique) ----------------------- */
  const MARKOV_STATES = ['st.healthy', 'st.atrisk', 'st.pre', 'st.t2d', 'st.comp'];
  const MARKOV_WEIGHTS = [1, 0.93, 0.76, 0.5, 0.22];
  function currentStateIndex(p) {
    const a1c = U.num(p.hba1c, 5.4), glu = U.num(p.glucose, 92), bmi = derived(p).bmi;
    if (a1c >= 8 || (a1c >= 6.5 && (U.num(p.chol, 190) > 260 || U.num(p.sbp, 120) >= 160))) return 4;
    if (a1c >= 6.5 || glu >= 126) return 3;
    if (a1c >= 5.7 || glu >= 100 || bmi >= 30) return 2;
    if (bmi >= 25 || U.num(p.sbp, 118) >= 130) return 1;
    return 0;
  }
  function markovMatrix(p, scenP) {
    const r = risksFor(scenP || p);
    const annual = 1 - Math.pow(1 - U.clamp(r.t2d.p, 0.001, 0.95), 1 / 10);
    const adher = U.clamp(U.num(State.scenario.adherence, 55), 0, 100) / 100;
    const remission = (0.1 + 0.22 * adher) * (1 + Math.max(0, -U.num(State.scenario.weightPct, 0)) / 12);
    const control = U.clamp(1 - annual * 2.4, 0.02, 0.95);
    const complication = U.clamp(0.028 + annual * 0.6 - adher * 0.012, 0.008, 0.22);
    const back = 0.45 * remission;
    const M = [
      [1 - annual * 0.55, annual * 0.55, 0, 0, 0],
      [back * 0.6, 1 - back * 0.6 - annual * 1.05, annual * 1.05, 0, 0],
      [0, back, 1 - back - annual * 1.9, annual * 1.9, 0],
      [0, 0, control * remission * 0.5, 1 - control * remission * 0.5 - complication, complication],
      [0, 0, 0, 0.04, 0.96]
    ];
    return M.map((row) => { const s = row.reduce((a, b) => a + b, 0) || 1; return row.map((v) => Math.max(0, v) / s); });
  }
  function markovRun(p, scenP, years, trials) {
    const Y = U.clamp(years || 10, 2, 30);
    const P = markovMatrix(p, scenP);
    const start = new Array(5).fill(0);
    start[currentStateIndex(p)] = 1;
    const dists = S.markov(P, start, Y);
    const rng = RNG('markov-' + profileKey().length + Y + (trials || 0) + '-' + U.num(State.settings.rerun, 0));
    const N = U.clamp(trials || 1000, 100, 8000);
    let healthyAt10 = 0, anyDiab = 0, pathSum = 0;
    const stateCount = [0, 0, 0, 0, 0];
    for (let i = 0; i < N; i++) {
      const path = S.markovSample(P, currentStateIndex(p), Y, rng);
      const last = path[path.length - 1];
      stateCount[last]++;
      if (last <= 1) healthyAt10++;
      if (path.indexOf(3) >= 0 || path.indexOf(4) >= 0) anyDiab++;
      pathSum += MARKOV_WEIGHTS[path[path.length - 1]];
    }
    return {
      years: Y, dists: dists, labels: dists.map((_, i) => (i === 0 ? t('common.today') : 'A+' + i)),
      healthyYears: S.healthyYears(dists, MARKOV_WEIGHTS),
      healthyAt10: healthyAt10 / N, anyDiab: anyDiab / N, trials: N,
      stateShare: stateCount.map((c) => c / N), P: P, start: currentStateIndex(p)
    };
  }

  /* ---- résultats du scénario -------------------------------------------- */
  function scenarioOutcomes() {
    const p = State.profile, sp = scenarioProfile();
    const itB = intake(p);
    const sB = scoreProfile(p, itB), sS = scoreProfile(sp);
    const rB = risksFor(p, { it: itB }), rS = risksFor(sp, { adherence: State.scenario.adherence });
    const mB = markovRun(p, p, 10, 600), mS = markovRun(p, sp, 10, 600);
    const keys = ['t2d', 'htn', 'cvd', 'anemia', 'obesity'];
    const deltas = {};
    let cost = 0, days = 0;
    keys.forEach((k) => {
      const dp = (rS[k].p - rB[k].p) * 100;
      deltas[k] = dp;
      const c = HEALTH_COST[k] || { yearly: 300, years: 4, days: 8 };
      cost += Math.max(0, -dp / 100) * c.yearly * c.years;
      days += Math.max(0, -dp / 100) * c.days * c.years;
    });
    /* empreinte alimentaire (kg CO₂e/an) : protéines animales + ultra-transformés */
    const foot = (pr) => {
      const upf = U.num(pr.upf, 30), fv = U.num(pr.fruitVeg, 2.5);
      const organic = U.num(State.scenario.organic, 30) / 100;
      return Math.round((290 + upf * 4.4 - fv * 11 + (1 - organic) * 40) * 10) / 10;
    };
    const basket = (organicPct) => {
      const base = 1.5 + U.num(p.fruitVeg, 2.4) * 0.22 + U.num(p.upf, 30) * 0.006;
      return Math.round((base * (1 + (organicPct / 100) * 0.14 - 0.05)) * 100) / 100;
    };
    return {
      score: { base: sB.total, scen: sS.total, delta: sS.total - sB.total, band: sS.band, baseBand: sB.band },
      risks: { base: rB, scen: rS, deltas: deltas },
      healthyYears: { base: mB.healthyYears, scen: mS.healthyYears, delta: mS.healthyYears - mB.healthyYears },
      diabetesFree: { base: mB.healthyAt10, scen: mS.healthyAt10 },
      cost: { usd: cost, local: money(cost), days: Math.round(days) },
      footprint: { base: foot(p), scen: foot(sp), delta: foot(sp) - foot(p) },
      basket: { base: basket(U.num(State.scenario.organic, 30)), deltaPct: 0 }
    };
  }

  /* ---- optimiseur de plan alimentaire local & bio ------------------------ */
  const SLOTS = [
    { key: 'breakfast', share: 0.25, items: [{ role: 'staple', g: 85 }, { role: 'protein', g: 45 }, { role: 'fruit', g: 130 }, { role: 'fat', g: 7 }, { role: 'dairy', g: 160, opt: true }] },
    { key: 'lunch', share: 0.34, items: [{ role: 'staple', g: 160 }, { role: 'protein', g: 110 }, { role: 'veg', g: 160 }, { role: 'fat', g: 11 }, { role: 'fruit', g: 120 }] },
    { key: 'dinner', share: 0.31, items: [{ role: 'staple', g: 115 }, { role: 'protein', g: 95 }, { role: 'veg', g: 150 }, { role: 'fat', g: 8 }] },
    { key: 'snack', share: 0.1, items: [{ role: 'fruit', g: 110 }, { role: 'protein', g: 28 }] }
  ];
  const ROLE_GROUPS = { staple: ['cereals', 'tubers'], protein: ['legumes', 'animal', 'oilseeds'], veg: ['veg'], fruit: ['fruit'], fat: ['oils'] };
  const DAIRY_IDS = ['milk', 'yogurt'];
  function roleCandidates(pool, role) {
    if (role === 'dairy') return pool.filter((f) => DAIRY_IDS.indexOf(f.id) >= 0);
    if (role === 'fat') return pool.filter((f) => f.group === 'oils' || f.id === 'shea' || f.id === 'avocado');
    const gs = ROLE_GROUPS[role] || [];
    return pool.filter((f) => gs.indexOf(f.group) >= 0 && !f.upf && f.id !== 'sugar' && f.id !== 'honey');
  }
  function mealTotals(meals) {
    const tot = { energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, sodium: 0, iron: 0, vitA: 0, vitC: 0, calcium: 0, zinc: 0, folate: 0, potassium: 0, sugar: 0, satfat: 0, cost: 0, organicItems: 0, items: 0, giw: 0, groups: {} };
    meals.forEach((m) => m.items.forEach((it) => {
      const f = it.f, k = it.g / 100;
      tot.energy += f.kcal * k; tot.protein += f.protein * k; tot.fat += f.fat * k; tot.carb += f.carb * k;
      tot.fiber += f.fiber * k; tot.sodium += f.sodium * k; tot.iron += f.iron * k; tot.vitA += f.vitA * k;
      tot.vitC += f.vitC * k; tot.calcium += f.calcium * k; tot.zinc += f.zinc * k; tot.folate += f.folate * k;
      tot.potassium += f.potassium * k; tot.sugar += f.sugar * k; tot.satfat += f.satfat * k;
      tot.cost += f.price * k * (it.organic ? 1.14 : 1); tot.giw += f.gi * f.carb * k;
      tot.items++; if (it.organic) tot.organicItems++;
      tot.groups[DIVERSITY_GROUPS[f.group] || 'other'] = 1;
    }));
    tot.diversity = Object.keys(tot.groups).length;
    tot.organicPct = tot.items ? Math.round((tot.organicItems / tot.items) * 100) : 0;
    tot.gi = tot.carb ? tot.giw / tot.carb : 0;
    return tot;
  }
  function planScore(tot, req, opt) {
    const cov = (n) => U.clamp(tot[n] / (req[n] || 1), 0, 1.4);
    let s = 0;
    s += 20 * Math.min(1, cov('protein')) + 13 * Math.min(1, cov('fiber')) + 8 * Math.min(1, cov('iron'));
    s += 8 * Math.min(1, cov('vitA')) + 8 * Math.min(1, cov('vitC')) + 8 * Math.min(1, cov('calcium'));
    s += 6 * Math.min(1, cov('zinc')) + 6 * Math.min(1, cov('folate')) + 7 * Math.min(1, cov('potassium'));
    s += 6 * Math.min(1, tot.diversity / 6);
    s -= 30 * Math.min(1, Math.abs(tot.energy - req.energy) / (req.energy || 1) * 2.6);
    s -= 16 * Math.max(0, (tot.sodium - req.sodium) / (req.sodium || 2000));
    s -= 12 * Math.max(0, (tot.sugar - req.sugar) / (req.sugar || 30));
    s -= 12 * Math.max(0, (tot.satfat - req.satfat) / (req.satfat || 22));
    s -= 8 * Math.max(0, (tot.cost - opt.budget) / (opt.budget || 3));
    s += 5 * (Math.max(0, Math.min(tot.organicPct, opt.organicTarget * 100 + 12) / 100));
    return s;
  }
  function buildDay(pool, req, opt, rng) {
    const meals = SLOTS.map((slot) => {
      const items = [];
      slot.items.forEach((spec) => {
        const cand = roleCandidates(pool, spec.role);
        if (!cand.length) return;
        if (spec.opt && !rng.chance(0.72)) return;
        /* préférence : densité nutritionnelle, saison, bio, prix */
        const weights = cand.map((f) => {
          let w = 1 + (f.fiber * 0.16 + f.protein * 0.14 + f.iron * 0.22 + f.vitA / 900 + f.vitC / 40 + f.calcium / 320) * (spec.role === 'fat' || spec.role === 'staple' ? 0.25 : 1);
          if (!inSeason(f, opt.month)) w *= 0.45;
          w *= 1 + f.organic * opt.organicTarget * 0.9;
          w *= U.clamp(2.2 - f.price / 2.4, 0.25, 2.2);
          if (f.upf) w *= 0.05;
          return Math.max(0.02, w);
        });
        const f = rng.weighted(cand.map((c, i) => [c, weights[i]]));
        const organic = rng.next() < U.clamp(f.organic * (0.35 + opt.organicTarget), 0, 0.95);
        items.push({ f: f, g: spec.g * (0.9 + rng.next() * 0.25), organic: organic, role: spec.role });
      });
      return { slot: slot.key, share: slot.share, items: items };
    });
    /* calibration énergétique */
    for (let pass = 0; pass < 6; pass++) {
      const tot = mealTotals(meals);
      const k = U.clamp(req.energy / (tot.energy || 1), 0.55, 1.7);
      meals.forEach((m) => m.items.forEach((it) => {
        if (it.role === 'fat' || it.role === 'dairy') return;
        it.g = U.clamp(it.g * Math.pow(k, 0.55), 8, 520);
      }));
    }
    meals.forEach((m) => m.items.forEach((it) => { it.g = Math.round(it.g / 5) * 5; it.kcal = Math.round(it.f.kcal * it.g / 100); }));
    return meals;
  }
  function plan(p, opt) {
    const o = opt || {};
    const code = o.country || countryCode();
    const pool = foodsFor(code).filter((f) => !(o.clean !== false && f.upf));
    const req = requirements(p);
    const rng = RNG((o.seed || 'plan') + code + p.sex + Math.round(U.num(p.weight, 70)) + Math.round(U.num(p.age, 30)));
    const organicTarget = U.clamp(U.num(o.organic, State.scenario.organic) / 100, 0, 1);
    const budget = o.budget || 3.4;
    const conf = { month: new Date().getMonth() + 1, organicTarget: organicTarget, budget: budget };
    let best = buildDay(pool, req, conf, rng);
    let bestScore = planScore(mealTotals(best), req, conf);
    /* recherche locale : permutations + ajustements de portions */
    for (let it = 0; it < 320; it++) {
      const cand = best.map((m) => ({ slot: m.slot, share: m.share, items: m.items.map((i) => ({ f: i.f, g: i.g, organic: i.organic, role: i.role })) }));
      const mi = rng.int(0, cand.length - 1);
      const ii = cand[mi].items.length ? rng.int(0, cand[mi].items.length - 1) : 0;
      if (!cand[mi].items.length) continue;
      if (rng.chance(0.55)) {
        const role = cand[mi].items[ii].role;
        const list = roleCandidates(pool, role);
        if (list.length > 1) {
          const f = rng.pick(list.filter((x) => x.id !== cand[mi].items[ii].f.id)) || rng.pick(list);
          cand[mi].items[ii].f = f;
          cand[mi].items[ii].organic = rng.next() < U.clamp(f.organic * (0.35 + organicTarget), 0, 0.95);
        }
      } else {
        cand[mi].items[ii].g = U.clamp(cand[mi].items[ii].g * (0.82 + rng.next() * 0.4), 8, 520);
      }
      for (let pass = 0; pass < 2; pass++) {
        const tot = mealTotals(cand);
        const k = U.clamp(req.energy / (tot.energy || 1), 0.7, 1.4);
        cand.forEach((m) => m.items.forEach((x) => { if (x.role !== 'fat') x.g = U.clamp(x.g * Math.pow(k, 0.5), 8, 520); }));
      }
      const sc = planScore(mealTotals(cand), req, conf);
      if (sc > bestScore) { bestScore = sc; best = cand; }
    }
    best.forEach((m) => m.items.forEach((x) => { x.g = Math.round(x.g / 5) * 5; x.kcal = Math.round(x.f.kcal * x.g / 100); }));
    /* 7 jours : rotation déterministe à partir du template optimisé */
    const days = [];
    for (let d = 0; d < 7; d++) {
      const r2 = RNG((o.seed || 'plan') + code + '-d' + d + Math.round(U.num(p.weight, 70)));
      let meals;
      if (d === 0) meals = best.map((m) => ({ slot: m.slot, items: m.items.map((i) => ({ f: i.f, g: i.g, organic: i.organic, role: i.role, kcal: i.kcal })) }));
      else {
        meals = best.map((m) => ({
          slot: m.slot, items: m.items.map((i) => {
            const list = roleCandidates(pool, i.role);
            const swap = list.length > 1 && r2.chance(0.42);
            const f = swap ? (r2.pick(list.filter((x) => x.id !== i.f.id)) || i.f) : i.f;
            return { f: f, g: Math.round(U.clamp(i.g * (0.92 + r2.next() * 0.18), 8, 520) / 5) * 5, organic: r2.next() < U.clamp(f.organic * (0.35 + organicTarget), 0, 0.95), role: i.role };
          })
        }));
        meals.forEach((m) => m.items.forEach((x) => { x.kcal = Math.round(x.f.kcal * x.g / 100); }));
      }
      const tot = mealTotals(meals);
      days.push({ index: d, meals: meals, totals: tot, cost: Math.round(tot.cost * 100) / 100, organicPct: tot.organicPct, date: U.daysAgo(-d) });
    }
    const avgTot = {};
    ['energy', 'protein', 'fat', 'carb', 'fiber', 'sodium', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium', 'sugar', 'satfat', 'cost', 'diversity', 'organicPct', 'gi'].forEach((k) => {
      avgTot[k] = Math.round(days.reduce((a, d) => a + (d.totals[k] || 0), 0) / days.length * 10) / 10;
    });
    const coverage = {};
    ['energy', 'protein', 'fiber', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium'].forEach((k) => {
      coverage[k] = { value: avgTot[k], req: req[k], pct: req[k] ? U.clamp(avgTot[k] / req[k], 0, 2) * 100 : 0 };
    });
    coverage.sodium = { value: avgTot.sodium, req: req.sodium, pct: req.sodium ? (avgTot.sodium / req.sodium) * 100 : 0, inverse: true };
    const outOfSeason = [];
    days[0].meals.forEach((m) => m.items.forEach((i) => { if (!inSeason(i.f, conf.month) && outOfSeason.indexOf(foodName(i.f)) < 0) outOfSeason.push(foodName(i.f)); }));
    return {
      days: days, template: best, avg: avgTot, coverage: coverage, req: req, score: Math.round(bestScore),
      cost: avgTot.cost, organicPct: avgTot.organicPct, poolSize: pool.length, country: code,
      outOfSeason: outOfSeason, generated: new Date().toISOString()
    };
  }

  /* ---- journal ----------------------------------------------------------- */
  function journalFor(date) { return State.journal.filter((e) => e.date === (date || todayKey())); }
  function addJournal(foodId, grams, slot, organic) {
    const f = FOOD_BY_ID[foodId];
    if (!f) return null;
    const e = { date: todayKey(), ts: Date.now(), food: foodId, grams: Math.round(U.num(grams, 100)), slot: slot || guessSlot(), organic: !!organic };
    State.journal.push(e);
    if (State.journal.length > 600) State.journal = State.journal.slice(-600);
    save('journal');
    State.history = null;
    return e;
  }
  function guessSlot() {
    const h = new Date().getHours();
    return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 20 ? 'dinner' : 'snack';
  }
  function removeJournal(ts) { State.journal = State.journal.filter((e) => e.ts !== ts); save('journal'); State.history = null; }
  function clearToday() { const d = todayKey(); State.journal = State.journal.filter((e) => e.date !== d); save('journal'); }
  function adherenceMatrix(weeks) {
    const W = weeks || 12;
    const rows = [], cols = [], values = [];
    const labels = [t('slot.breakfast'), t('slot.lunch'), t('slot.dinner'), t('slot.snack')];
    const slots = ['breakfast', 'lunch', 'dinner', 'snack'];
    for (let w = W - 1; w >= 0; w--) {
      const end = U.daysAgo(w * 7);
      cols.push((w === 0 ? '→ ' : '') + U.dateLabel(U.daysAgo(w * 7 + 6)).slice(0, 6));
    }
    slots.forEach((s, si) => {
      rows.push(labels[si]);
      const row = [];
      for (let w = W - 1; w >= 0; w--) {
        let days = 0;
        for (let d = 0; d < 7; d++) {
          const date = U.daysAgo(w * 7 + d);
          const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
          if (State.journal.some((e) => e.date === key && e.slot === s)) days++;
        }
        row.push(Math.round((days / 7) * 100));
      }
      values.push(row);
    });
    return { rows: rows, cols: cols, values: values };
  }
  function streak() {
    let n = 0;
    for (let i = 0; i < 120; i++) {
      const d = U.daysAgo(i);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (State.journal.some((e) => e.date === key)) n++;
      else if (i > 0) break;
    }
    return n;
  }

  /* ---- anomalies & alertes ---------------------------------------------- */
  function anomalies() {
    const out = [];
    const defs = [
      { key: 'glucose', label: t('kpi.glucose'), unit: ' mg/dL', thr: 2.3, tone: 'warn' },
      { key: 'sbp', label: 'PAS', unit: ' mmHg', thr: 2.5, tone: 'warn' },
      { key: 'weight', label: t('kpi.weight'), unit: ' kg', thr: 2.6, tone: 'info' },
      { key: 'sleep', label: t('lev.sleep'), unit: ' h', thr: 2.4, tone: 'info' },
      { key: 'steps', label: t('steps'), unit: '', thr: 2.4, tone: 'info' }
    ];
    const h = history();
    defs.forEach((d) => {
      const series = h.series[d.key] || [];
      if (series.length < 20) return;
      const recent = series.slice(-45);
      S.anomalies(recent, { threshold: d.thr }).slice(-2).forEach((a) => {
        out.push({
          id: 'an-' + d.key + '-' + a.index, kind: 'anomaly', tone: Math.abs(a.z) > 3.2 ? 'risk' : d.tone,
          icon: Math.abs(a.z) > 3.2 ? '🚨' : '📈',
          title: (a.z > 0 ? '↑ ' : '↓ ') + d.label,
          text: (fr() ? 'Écart détecté : ' : 'Detected deviation: ') + U.fmt(a.value, 1) + d.unit + ' · z = ' + U.fmt(a.z, 1) + (fr() ? ' sur 45 jours' : ' over 45 days'),
          value: a.value, z: a.z, key: d.key
        });
      });
    });
    return out;
  }
  function alerts(p) {
    const d = derived(p), it = intake(p), sc = scoreProfile(p, it);
    const list = [];
    const push = (a) => { if (State.dismissed.indexOf(a.id) < 0) list.push(a); };
    if (d.bmi >= 30) push({ id: 'ob2', tone: 'risk', icon: '⚖️', title: fr() ? 'Obésité détectée' : 'Obesity detected', text: (fr() ? 'IMC ' : 'BMI ') + U.fmt(d.bmi, 1) + ' kg/m² — ' + (fr() ? 'accompagnement nutritionnel recommandé.' : 'nutrition follow-up recommended.'), actions: ['book', 'foods'] });
    else if (d.bmi >= 25) push({ id: 'ow', tone: 'warn', icon: '⚖️', title: fr() ? 'Surpoids' : 'Overweight', text: (fr() ? 'IMC ' : 'BMI ') + U.fmt(d.bmi, 1) + ' kg/m² — ' + (fr() ? 'objectif : retour sous 25 en 6 mois.' : 'target: back under 25 within 6 months.'), actions: ['plan', 'foods'] });
    if (U.num(p.waist) && d.bmi && (d.female ? p.waist >= 88 : p.waist >= 102)) push({ id: 'waist', tone: 'risk', icon: '📏', title: fr() ? 'Adiposité abdominale élevée' : 'High abdominal adiposity', text: (fr() ? 'Tour de taille ' : 'Waist ') + U.fmt(p.waist, 0) + ' cm — ' + (fr() ? 'risque cardiométabolique accru.' : 'increased cardiometabolic risk.'), actions: ['sim', 'foods'] });
    if (U.num(p.sbp) >= 140 || U.num(p.dbp) >= 90) push({ id: 'htn', tone: 'risk', icon: '❤️', title: fr() ? 'Hypertension artérielle' : 'High blood pressure', text: U.fmt(p.sbp, 0) + '/' + U.fmt(p.dbp, 0) + ' mmHg — ' + (fr() ? 'confirmer par 3 mesures et consulter.' : 'confirm with 3 readings and consult.'), actions: ['book', 'evidence'] });
    else if (U.num(p.sbp) >= 130 || U.num(p.dbp) >= 85) push({ id: 'htn1', tone: 'warn', icon: '❤️', title: fr() ? 'Pression artérielle limite' : 'Borderline blood pressure', text: U.fmt(p.sbp, 0) + '/' + U.fmt(p.dbp, 0) + ' mmHg — ' + (fr() ? 'réduire le sel, augmenter l\'activité.' : 'reduce salt, increase activity.'), actions: ['sim', 'foods'] });
    if (U.num(p.hba1c) >= 6.5 || U.num(p.glucose) >= 126) push({ id: 'dia', tone: 'risk', icon: '🩸', title: fr() ? 'Signal diabète' : 'Diabetes signal', text: 'HbA1c ' + U.fmt(p.hba1c, 1) + ' % · ' + (fr() ? 'glycémie ' : 'glucose ') + U.fmt(p.glucose, 0) + ' mg/dL — ' + (fr() ? 'bilan professionnel recommandé.' : 'professional assessment recommended.'), actions: ['book', 'evidence'] });
    else if (U.num(p.hba1c) >= 5.7 || U.num(p.glucose) >= 100) push({ id: 'pre', tone: 'warn', icon: '🩸', title: fr() ? 'Prédiabète probable' : 'Probable prediabetes', text: 'HbA1c ' + U.fmt(p.hba1c, 1) + ' % · ' + (fr() ? 'glycémie ' : 'glucose ') + U.fmt(p.glucose, 0) + ' mg/dL — ' + (fr() ? 'réversible dans 60 % des cas avec un plan adapté.' : 'reversible in ~60% of cases with an adapted plan.'), actions: ['plan', 'sim'] });
    if (U.num(p.chol) >= 240) push({ id: 'chol', tone: 'warn', icon: '🫀', title: fr() ? 'Cholestérol élevé' : 'High cholesterol', text: U.fmt(p.chol, 0) + ' mg/dL — ' + (fr() ? 'profil lipidique complet à prévoir.' : 'full lipid profile advised.'), actions: ['foods', 'book'] });
    if (d.egfr && d.egfr < 60) push({ id: 'egfr', tone: 'risk', icon: '🫘', title: fr() ? 'Fonction rénale réduite' : 'Reduced kidney function', text: 'DFG ' + U.fmt(d.egfr, 0) + ' mL/min — ' + (fr() ? 'protéines et sodium à individualiser avec un clinicien.' : 'protein and sodium to individualise with a clinician.'), actions: ['book', 'evidence'] });
    if (it.iron < 0.7 * requirements(p).iron) push({ id: 'iron', tone: 'warn', icon: '🩸', title: fr() ? 'Apport en fer insuffisant' : 'Insufficient iron intake', text: U.fmt(it.iron, 1) + ' mg / ' + U.fmt(requirements(p).iron, 0) + ' mg — ' + (fr() ? 'associer fer végétal + vitamine C.' : 'pair plant iron with vitamin C.'), actions: ['plan', 'foods'] });
    if (U.num(p.activityMin, 60) < 90) push({ id: 'act', tone: 'warn', icon: '🏃🏾', title: fr() ? 'Activité physique insuffisante' : 'Insufficient physical activity', text: U.fmtInt(p.activityMin) + ' min/sem — ' + (fr() ? 'cible OMS : 150 min.' : 'WHO target: 150 min.'), actions: ['sim'] });
    if (U.num(it.sodium, 0) > 4200) push({ id: 'na', tone: 'risk', icon: '🧂', title: fr() ? 'Exposition sodée élevée' : 'High sodium exposure', text: U.fmtInt(it.sodium) + ' mg/j — ' + (fr() ? 'limite OMS 2 000 mg (5 g de sel).' : 'WHO limit 2,000 mg (5 g salt).'), actions: ['sim', 'foods'] });
    if (U.num(p.upf, 0) > 40) push({ id: 'upf', tone: 'warn', icon: '🍪', title: fr() ? 'Part d\'ultra-transformés élevée' : 'High ultra-processed share', text: U.fmtInt(p.upf) + ' % — ' + (fr() ? 'substituer par des aliments locaux non transformés.' : 'replace with local unprocessed foods.'), actions: ['plan', 'foods'] });
    if (p.smoke) push({ id: 'smoke', tone: 'risk', icon: '🚭', title: fr() ? 'Tabac' : 'Tobacco', text: fr() ? 'Facteur de risque majeur — accompagnement au sevrage disponible.' : 'Major risk factor — cessation support available.', actions: ['book'] });
    anomalies().slice(0, 3).forEach((a) => push(a));
    const order = { risk: 0, warn: 1, info: 2 };
    return list.sort((a, b) => (order[a.tone] - order[b.tone]) || (Math.abs(b.z || 0) - Math.abs(a.z || 0)));
  }

  /* ---- recommandations explicable --------------------------------------- */
  function recommendations(p) {
    const d = derived(p), it = intake(p), req = requirements(p), sc = scoreProfile(p, it);
    const r = risksFor(p, { it: it });
    const out = [];
    const add = (rec) => { rec.id = rec.id || rec.title; out.push(rec); };
    const ev = (level) => level === 3 ? (fr() ? 'Revue systématique' : 'Systematic review') : level === 2 ? (fr() ? 'Cohorte prospective' : 'Prospective cohort') : (fr() ? 'Recommandation OMS' : 'WHO guidance');
    if (it.sodium > req.sodium * 1.4) add({ id: 'salt', icon: '🧂', tone: 'risk', priority: 1, category: fr() ? 'Sodium' : 'Sodium', title: fr() ? 'Ramener le sel sous 5 g/jour' : 'Bring salt under 5 g/day', text: fr() ? 'Remplacez les cubes de bouillon par des aromates locaux (piment, oignon, ail, gingembre, dawadawa) et rincez les aliments saumurés.' : 'Replace bouillon cubes with local aromatics (chilli, onion, garlic, ginger, dawadawa) and rinse brined foods.', impact: (fr() ? '−' : '−') + U.fmt(Math.min(9, (r.htn.p * 100) * 0.28), 1) + ' pts ' + t('risk.htn'), why: U.fmtInt(it.sodium) + ' mg/j vs ' + U.fmtInt(req.sodium) + ' mg', evidence: ev(3), level: 3, actions: ['sim', 'foods'] });
    if (d.bmi >= 25 || U.num(State.scenario.weightPct) === 0 && r.obesity.p > 0.3) add({ id: 'weight', icon: '⚖️', tone: r.obesity.p > 0.4 ? 'risk' : 'warn', priority: 1, category: fr() ? 'Énergie' : 'Energy', title: fr() ? 'Perte de 5 % du poids sur 6 mois' : 'Lose 5% of body weight over 6 months', text: fr() ? 'Déficit modéré de 350 kcal/j via portions de féculents réduites d\'un tiers au dîner et 150 min d\'activité par semaine.' : 'Moderate 350 kcal/day deficit via a third smaller starch portion at dinner plus 150 min of activity per week.', impact: '−' + U.fmt(Math.min(12, r.t2d.p * 100 * 0.34), 1) + ' pts ' + t('risk.t2d') + ' · −' + U.fmt(r.htn.p * 100 * 0.2, 1) + ' pts ' + t('risk.htn'), why: 'IMC ' + U.fmt(d.bmi, 1) + ' · ' + U.fmt(p.weight, 1) + ' kg', evidence: ev(3), level: 3, actions: ['sim', 'plan'] });
    if (U.num(p.fruitVeg, 0) < 4) add({ id: 'fv', icon: '🥬', tone: 'warn', priority: 2, category: fr() ? 'Densité nutritionnelle' : 'Nutrient density', title: fr() ? 'Passer à 5 portions de fruits & légumes locaux' : 'Move to 5 servings of local fruit & vegetables', text: fr() ? 'Ajoutez adémè, gombo, feuilles de patate douce ou moringa à chaque repas et un fruit de saison en collation.' : 'Add amaranth leaves, okra, sweet-potato leaves or moringa to each meal plus a seasonal fruit snack.', impact: '+' + U.fmt(Math.min(9, (4 - U.num(p.fruitVeg, 0)) * 2.2), 0) + ' pts NutriScore', why: U.fmt(p.fruitVeg, 1) + '/5 ' + (fr() ? 'portions' : 'servings'), evidence: ev(3), level: 3, actions: ['plan', 'foods'] });
    if (it.fiber < req.fiber * 0.8) add({ id: 'fiber', icon: '🌾', tone: 'warn', priority: 2, category: fr() ? 'Fibres' : 'Fibre', title: fr() ? 'Atteindre 30 g de fibres par jour' : 'Reach 30 g of fibre per day', text: fr() ? 'Privilégiez mil, sorgho, fonio complets, niébé et bambara ; ajoutez 10 g de poudre de baobab.' : 'Favour whole millet, sorghum, fonio, cowpea and bambara; add 10 g of baobab powder.', impact: (fr() ? 'Glycémie post-prandiale −' : 'Post-prandial glucose −') + U.fmt(Math.min(14, (req.fiber - it.fiber) * 0.9), 0) + ' mg/dL', why: U.fmt(it.fiber, 0) + ' g / ' + U.fmtInt(req.fiber) + ' g', evidence: ev(2), level: 2, actions: ['plan'] });
    if (it.iron < req.iron * 0.85) add({ id: 'iron', icon: '🩸', tone: r.anemia.p > 0.35 ? 'risk' : 'warn', priority: r.anemia.p > 0.35 ? 1 : 2, category: fr() ? 'Fer' : 'Iron', title: fr() ? 'Couvrir le besoin en fer avec des aliments locaux' : 'Cover iron needs with local foods', text: fr() ? 'Foie/poisson ou niébé + moringa, toujours avec une source de vitamine C (baobab, citron, tomate) pour l\'absorption.' : 'Liver/fish or cowpea + moringa, always with a vitamin-C source (baobab, lemon, tomato) for absorption.', impact: '−' + U.fmt(Math.min(14, r.anemia.p * 100 * 0.3), 1) + ' pts ' + t('risk.anemia'), why: U.fmt(it.iron, 1) + ' / ' + U.fmt(req.iron, 0) + ' mg', evidence: ev(2), level: 2, actions: ['plan', 'foods'] });
    if (U.num(p.activityMin, 0) < 150) add({ id: 'act', icon: '🏃🏾', tone: 'warn', priority: 2, category: fr() ? 'Activité' : 'Activity', title: fr() ? '150 minutes d\'activité par semaine' : '150 minutes of activity per week', text: fr() ? 'Marche active 30 min × 5, montée d\'escaliers, vélo pour les trajets courts ; ajoutez 2 séances de renforcement.' : 'Brisk walking 30 min × 5, stair climbing, cycling for short trips; add 2 strength sessions.', impact: '−' + U.fmt(Math.min(7, (150 - U.num(p.activityMin, 0)) * 0.045), 1) + ' pts ' + t('risk.htn') + ' · −' + U.fmt(Math.min(6, (150 - U.num(p.activityMin, 0)) * 0.035), 1) + ' pts ' + t('risk.t2d'), why: U.fmtInt(p.activityMin) + ' / 150 min', evidence: ev(3), level: 3, actions: ['sim'] });
    if (U.num(p.upf, 0) > 25) add({ id: 'upf', icon: '🍪', tone: 'warn', priority: 2, category: fr() ? 'Transformation' : 'Processing', title: fr() ? 'Réduire les ultra-transformés sous 20 %' : 'Cut ultra-processed food below 20%', text: fr() ? 'Substituez sodas et biscuits par eau infusée au bissap/gingembre, arachides grillées et fruits de saison.' : 'Swap sodas and biscuits for hibiscus/ginger infused water, roasted groundnuts and seasonal fruit.', impact: '+' + U.fmt(Math.min(8, (U.num(p.upf, 0) - 20) * 0.35), 0) + ' pts NutriScore', why: U.fmtInt(p.upf) + ' % UPF', evidence: ev(2), level: 2, actions: ['plan', 'foods'] });
    if (U.num(p.sleep, 7) < 6.5) add({ id: 'sleep', icon: '😴', tone: 'info', priority: 3, category: fr() ? 'Sommeil' : 'Sleep', title: fr() ? 'Stabiliser 7 h de sommeil' : 'Stabilise 7 hours of sleep', text: fr() ? 'Coucher régulier, dernier repas 3 h avant, écran réduit le soir : effet direct sur la glycémie à jeun.' : 'Regular bedtime, last meal 3 h before, less evening screen time: direct effect on fasting glucose.', impact: (fr() ? 'Glycémie −' : 'Glucose −') + U.fmt(Math.min(9, (7 - U.num(p.sleep, 7)) * 4.2), 0) + ' mg/dL', why: U.fmt(p.sleep, 1) + ' h/nuit', evidence: ev(2), level: 2, actions: ['sim'] });
    if (State.scenario.organic < 40) add({ id: 'organic', icon: '🌱', tone: 'good', priority: 3, category: fr() ? 'Agriculture bio' : 'Organic farming', title: fr() ? 'Passer à 50 % d\'aliments locaux & bio' : 'Move to 50% local & organic food', text: (fr() ? 'Le pays dispose de ' : 'This country has ') + U.pct(organicSupply() * 100, 0) + (fr() ? ' d\'offre bio tracée — vos achats orientent la production locale.' : ' of traceable organic supply — your purchases steer local production.'), impact: (fr() ? 'Empreinte −' : 'Footprint −') + U.fmt(Math.min(48, (50 - U.num(State.scenario.orgic, 30)) * 1.6), 0) + ' kg CO₂e/an', why: U.fmtInt(State.scenario.organic) + ' % ' + t('sim.organic'), evidence: ev(1), level: 1, actions: ['market', 'sim'] });
    if (r.t2d.p > 0.12 || r.htn.p > 0.25) add({ id: 'pro', icon: '👩🏾‍⚕️', tone: 'risk', priority: 1, category: fr() ? 'Suivi professionnel' : 'Professional follow-up', title: fr() ? 'Consulter un nutritionniste du réseau' : 'Consult a network nutritionist', text: fr() ? 'Votre profil justifie un avis professionnel : bilan, plan personnalisé et suivi à 3 mois.' : 'Your profile warrants professional advice: assessment, personalised plan and 3-month follow-up.', impact: fr() ? 'Adhésion au plan ×2,3' : 'Plan adherence ×2.3', why: t('risk.t2d') + ' ' + U.pct(r.t2d.p * 100, 1), evidence: ev(1), level: 1, actions: ['book'] });
    if (!out.length) add({ id: 'keep', icon: '✅', tone: 'good', priority: 3, category: fr() ? 'Maintien' : 'Maintenance', title: fr() ? 'Profil solide — maintenez le cap' : 'Strong profile — keep going', text: fr() ? 'Continuez le suivi hebdomadaire, la diversité alimentaire et l\'activité régulière.' : 'Keep weekly monitoring, dietary diversity and regular activity.', impact: 'NutriScore ' + sc.total, why: sc.total + '/100', evidence: ev(1), level: 1, actions: ['plan'] });
    return out.sort((a, b) => (a.priority - b.priority) || (b.tone === 'risk' ? 1 : 0));
  }

  /* ---- enfants : croissance & nutrition --------------------------------- */
  const CHILDREN = {
    child1: { id: 'child1', name: 'Ama', sex: 'female', age: 7, ageMonths: 87, height: 121, weight: 23.4, bmi: 16, hb: 11.2, diversity: 5.2, fruitVeg: 3, school: true, percentile: 52, alerts: 0, plan: 'school' },
    child2: { id: 'child2', name: 'Kofi', sex: 'male', age: 11, ageMonths: 137, height: 142, weight: 39.2, bmi: 19.4, hb: 12.4, diversity: 3.6, fruitVeg: 1.6, school: true, percentile: 74, alerts: 1, plan: 'school' }
  };
  function childRef(child) {
    const table = REF.childBmi[child.sex === 'male' ? 'male' : 'female'];
    const idx = U.clamp(Math.round(child.age) - 5, 0, table.length - 1);
    return { row: table[idx], table: table, idx: idx };
  }
  function childZ(child) {
    const ref = childRef(child);
    const med = ref.row[1], sd = ref.row[2];
    const bmi = U.num(child.weight) / Math.pow(U.num(child.height) / 100, 2);
    const hMed = ref.row[3], hSd = hMed * 0.035;
    const wMed = ref.row[4], wSd = wMed * 0.11;
    return {
      bmi: bmi, zBmi: (bmi - med) / sd,
      zHeight: (U.num(child.height) - hMed) / hSd,
      zWeight: (U.num(child.weight) - wMed) / wSd,
      percentile: percentileFromZ((bmi - med) / sd)
    };
  }
  function percentileFromZ(z) {
    /* approximation de la normale centrée réduite */
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    p = z > 0 ? 1 - p : p;
    return Math.round(p * 1000) / 10;
  }
  function childGrowthSeries(child) {
    const ref = childRef(child);
    const table = ref.table;
    const rng = RNG('child-' + child.id);
    const ages = table.map((r) => r[0]);
    const curAge = child.age;
    const hMed = table.map((r) => r[3]), wMed = table.map((r) => r[4]);
    const offsetH = (U.num(child.height) - ref.row[3]) / (ref.row[3] * 0.035);
    const offsetW = (U.num(child.weight) - ref.row[4]) / (ref.row[4] * 0.11);
    const heights = ages.map((a, i) => Math.round((hMed[i] * (1 + 0.035 * offsetH) + rng.gauss(0, 0.5)) * 10) / 10);
    const weights = ages.map((a, i) => Math.round((wMed[i] * (1 + 0.11 * offsetW) + rng.gauss(0, 0.25)) * 10) / 10);
    const p3 = ages.map((a, i) => Math.round(hMed[i] * 0.93 * 10) / 10);
    const p97 = ages.map((a, i) => Math.round(hMed[i] * 1.07 * 10) / 10);
    const w3 = ages.map((a, i) => Math.round(wMed[i] * 0.78 * 10) / 10);
    const w97 = ages.map((a, i) => Math.round(wMed[i] * 1.28 * 10) / 10);
    const cur = ages.indexOf(Math.min.apply(null, ages.filter((a) => a >= curAge).concat([ages[ages.length - 1]])));
    return { ages: ages, heights: heights, weights: weights, p3: p3, p97: p97, w3: w3, w97: w97, curIndex: U.clamp(cur, 0, ages.length - 1) };
  }

  /* ==========================================================================
     6. CONSTRUCTION DU DOM  (le balisage existant est conservé)
     ====================================================================== */
  let root = null;
  const refs = {};
  function ins(node, where, ref) { if (ref) ref.insertAdjacentElement(where, node); return node; }
  function mkDiv(id, cls, html) {
    const d = document.createElement('div');
    if (id) d.id = id;
    d.className = cls || '';
    if (html != null) d.innerHTML = html;
    return d;
  }

  /* ---- qualité / complétude des données --------------------------------- */
  const FIELD_LABELS = {
    weight: ['Weight', 'Poids'], height: ['Height', 'Taille'], waist: ['Waist', 'Tour de taille'], hip: ['Hip', 'Hanches'],
    glucose: ['Glucose', 'Glycémie'], hba1c: ['HbA1c', 'HbA1c'], sbp: ['Systolic BP', 'PAS'], dbp: ['Diastolic BP', 'PAD'],
    chol: ['Cholesterol', 'Cholestérol'], age: ['Age', 'Âge'], activityMin: ['Activity', 'Activité'], sleep: ['Sleep', 'Sommeil'],
    fruitVeg: ['Fruit & veg', 'Fruits & légumes'], sodiumMg: ['Sodium', 'Sodium'], upf: ['UPF share', 'Part UPF'], water: ['Water', 'Eau']
  };
  function completeness(p) {
    const keys = Object.keys(FIELD_LABELS);
    const missing = keys.filter((k) => !isFinite(U.num(p[k], NaN)));
    return { pct: Math.round(((keys.length - missing.length) / keys.length) * 100), missing: missing };
  }
  function fieldLabel(k) { const f = FIELD_LABELS[k] || [k, k]; return fr() ? f[1] : f[0]; }

  /* ---- HERO -------------------------------------------------------------- */
  function heroName() {
    const n = (document.getElementById('profileName') || {}).value;
    if (n && String(n).trim()) return String(n).trim();
    return State.profile.name || (fr() ? 'Profil citoyen' : 'Citizen profile');
  }
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'N1';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function htmlHero() {
    const name = heroName();
    const code = countryCode();
    const cp = completeness(State.profile);
    return '' +
      '<div class="nv-hero-grid">' +
        '<div class="nv-hero-id">' +
          UI.avatar(initials(name), { ring: true }) +
          '<div class="nv-hero-idtext">' +
            '<span class="nv-pill">' + U.esc(t('badge')) + '</span>' +
            '<h1>' + U.esc(name) + '</h1>' +
            '<p class="nv-sub">' + U.esc(t('hero.sub')) + '</p>' +
            '<div class="nv-row nv-hero-chips">' +
              UI.chip('📍 ' + U.esc(countryName(code)), 'info') +
              UI.chip((State.profile.sex === 'male' ? '♂ ' : '♀ ') + U.esc(t('form.sex.' + (State.profile.sex === 'male' ? 'male' : State.profile.sex === 'child' ? 'child' : 'female'))) + ' · ' + U.fmtInt(State.profile.age) + ' ' + (fr() ? 'ans' : 'y'), 'neutral') +
              UI.chip((fr() ? 'Qualité données ' : 'Data quality ') + cp.pct + '%', cp.pct > 80 ? 'good' : cp.pct > 55 ? 'warn' : 'risk') +
              '<span class="nv-badge-demo">🧪 ' + U.esc(t('demo')) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="nv-hero-score">' +
          '<div class="nv-chart-host" data-chart="heroGauge" style="height:186px"></div>' +
          '<div class="nv-hero-scoremeta"><span id="nvScoreBand" class="nv-chip nv-chip-good">—</span>' +
          '<span class="nv-note" id="nvScoreDelta">—</span></div>' +
        '</div>' +
        '<div class="nv-hero-side">' +
          '<div class="nv-hero-kpis" id="nvHeroKpis"></div>' +
          '<div class="nv-row nv-hero-actions">' +
            UI.btn(t('hero.actions.sync'), { kind: 'primary', action: 'sync', icon: '⚡' }) +
            UI.btn(t('hero.actions.report'), { action: 'report', icon: '📄' }) +
            UI.btn(t('hero.actions.share'), { action: 'share', icon: '🔐' }) +
            UI.btn(t('hero.actions.reset'), { kind: 'ghost', action: 'reset', icon: '♻', title: t('hero.actions.reset') }) +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="nv-live-strip">' +
        '<div class="nv-live-strip-head">' +
          '<span class="nv-live" id="nvLiveBadge"><i></i>' + U.esc(t('live.title')) + '</span>' +
          '<span class="nv-note" id="nvLiveSub">' + U.esc(t('live.sub')) + '</span>' +
          '<span class="nv-grow"></span>' +
          UI.segmented([{ id: 1, label: '×1' }, { id: 2, label: '×2' }, { id: 4, label: '×4' }], State.settings.speed, 'live-speed') +
          UI.btn(State.settings.live ? '⏸' : '▶', { action: 'live-toggle', kind: 'ghost', title: t('live.on') }) +
          '<span class="nv-note" id="nvLastSync">—</span>' +
        '</div>' +
        '<div class="nv-vitals" id="nvVitals"></div>' +
      '</div>';
  }
  const VITALS = [
    { key: 'hr', label: 'hr', unit: 'bpm', color: '#fb7185', min: 45, max: 130, dec: 0 },
    { key: 'hrv', label: 'hrv', unit: 'ms', color: '#818cf8', min: 10, max: 110, dec: 0 },
    { key: 'spo2', label: 'spo2', unit: '%', color: '#22d3ee', min: 88, max: 100, dec: 1 },
    { key: 'steps', label: 'steps', unit: '', color: '#a3e635', min: 0, max: 18000, dec: 0 },
    { key: 'sleep', label: 'sleep', unit: 'h', color: '#60a5fa', min: 3, max: 11, dec: 1 },
    { key: 'water', label: 'hydration', unit: 'L', color: '#38f0a5', min: 0, max: 4, dec: 1 },
    { key: 'cgm', label: 'cgm', unit: 'mg/dL', color: '#f5c451', min: 50, max: 240, dec: 0 }
  ];
  const liveBuf = {};
  VITALS.forEach((v) => { liveBuf[v.key] = []; });
  function htmlVital(v) {
    return '<div class="nv-vital" data-vital="' + v.key + '">' +
      '<div class="nv-vital-head"><span>' + U.esc(t(v.label)) + '</span><i style="background:' + v.color + '"></i></div>' +
      '<div class="nv-vital-val" data-vital-val="' + v.key + '">—<small>' + U.esc(v.unit) + '</small></div>' +
      '<div class="nv-chart-host nv-vital-spark" data-spark="' + v.key + '" style="height:34px"></div>' +
      '</div>';
  }
  function renderVitals() {
    const host = refs.vitals;
    if (!host) return;
    if (!host.children.length) host.innerHTML = VITALS.map(htmlVital).join('');
    VITALS.forEach((v) => {
      const out = host.querySelector('[data-vital-val="' + v.key + '"]');
      if (!out) return;
      const val = State.live[v.key];
      out.innerHTML = (v.dec ? U.fmt(val, v.dec) : U.fmtInt(val)) + '<small>' + U.esc(v.unit) + '</small>';
      const buf = liveBuf[v.key];
      if (buf.length > 1) {
        const sp = host.querySelector('[data-spark="' + v.key + '"]');
        if (sp) CH.render(sp, { type: 'sparkline', data: buf.slice(-40), color: v.color, height: 34 });
      }
    });
  }
  function seedLive() {
    const rng = RNG('live-' + profileKey().length);
    const p = State.profile;
    State.live.hr = U.clamp(62 + (U.num(p.weight, 70) - 68) * 0.18 - U.num(p.activityMin, 80) * 0.02, 48, 110);
    State.live.hrv = U.clamp(74 - U.num(p.age, 34) * 0.6 + U.num(p.activityMin, 80) * 0.03, 12, 110);
    State.live.spo2 = 97.4;
    State.live.steps = 6420;
    State.live.sleep = U.num(p.sleep, 6.6);
    State.live.water = U.num(p.water, 1.6);
    State.live.cgm = U.clamp(U.num(p.glucose, 96) * 0.98, 55, 240);
    VITALS.forEach((v) => {
      liveBuf[v.key] = [];
      let x = State.live[v.key];
      for (let i = 0; i < 36; i++) { x = U.clamp(x + rng.gauss(0, (v.max - v.min) * 0.012), v.min, v.max); liveBuf[v.key].push(Math.round(x * 10) / 10); }
      State.live[v.key] = Math.round(liveBuf[v.key][liveBuf[v.key].length - 1] * 10) / 10;
    });
    liveBuf.steps = liveBuf.steps.map((x, i) => Math.round(x * (0.4 + 0.6 * (i / 35))));
  }
  let liveTimer = null;
  function tickLive() {
    if (!State.settings.live) return;
    const speed = U.num(State.settings.speed, 1);
    const rng = RNG('live-tick-' + Date.now());
    VITALS.forEach((v) => {
      if (v.key === 'steps') {
        State.live.steps = Math.min(24000, State.live.steps + Math.max(0, Math.round(rng.gauss(28 * speed, 22))));
        liveBuf.steps.push(State.live.steps);
      } else {
        const amp = (v.max - v.min) * (v.key === 'spo2' ? 0.0018 : v.key === 'cgm' ? 0.018 : 0.014);
        const pull = (v.key === 'hr' ? 72 : v.key === 'cgm' ? U.num(State.profile.glucose, 96) : State.live[v.key]);
        let x = State.live[v.key] + rng.gauss(0, amp * (v.max - v.min) / 12) + (pull - State.live[v.key]) * 0.06;
        x = U.clamp(x, v.min, v.max);
        State.live[v.key] = Math.round(x * 10) / 10;
        liveBuf[v.key].push(State.live[v.key]);
      }
      if (liveBuf[v.key].length > 60) liveBuf[v.key].shift();
    });
    renderVitals();
    const ls = refs.liveBadge;
    if (ls) ls.classList.toggle('off', !State.settings.live);
  }
  function startLive() {
    stopLive();
    if (!State.settings.live) return;
    liveTimer = setInterval(tickLive, Math.round(1700 / U.num(State.settings.speed, 1)));
  }
  function stopLive() { if (liveTimer) { clearInterval(liveTimer); liveTimer = null; } }

  /* ---- KPI additionnels (glucose, HbA1c, cholestérol, DFG…) -------------- */
  function extraKpis() {
    const p = State.profile, d = derived(p), it = intake(p);
    const items = [
      { key: 'glucose', label: t('kpi.glucose'), value: U.fmt(p.glucose, 0), unit: 'mg/dL', series: 'glucose', band: refBand(REF.glucose, U.num(p.glucose, 90)), ref: '70–99 mg/dL', icon: '🩸' },
      { key: 'hba1c', label: t('kpi.hba1c'), value: U.fmt(p.hba1c, 1), unit: '%', series: 'hba1c', band: refBand(REF.hba1c, U.num(p.hba1c, 5.4)), ref: '< 5,7 %', icon: '🧪' },
      { key: 'chol', label: t('kpi.chol'), value: U.fmt(p.chol, 0), unit: 'mg/dL', series: 'chol', band: refBand(REF.chol, U.num(p.chol, 190)), ref: '< 200 mg/dL', icon: '🫀' },
      { key: 'egfr', label: t('kpi.egfr'), value: d.egfr ? U.fmt(d.egfr, 0) : '—', unit: 'mL/min', series: null, band: d.egfr ? refBand(REF.egfr, d.egfr) : null, ref: '≥ 90', icon: '🫘' },
      { key: 'whr', label: t('kpi.whr'), value: d.whr ? U.fmt(d.whr, 2) : '—', unit: '', series: 'waist', band: null, ref: (d.female ? '< 0,85' : '< 0,90'), icon: '📏' },
      { key: 'tdee', label: t('kpi.tdee'), value: U.fmtInt(d.req.energy), unit: 'kcal', series: 'energy', band: null, ref: 'Mifflin-St Jeor', icon: '🔥' },
      { key: 'diversity', label: t('kpi.diversity'), value: U.fmt(it.diversity, 1), unit: '/10', series: 'diversity', band: null, ref: '≥ 5 / 10', icon: '🥗' },
      { key: 'sodium', label: t('kpi.sodium'), value: U.fmtInt(it.sodium), unit: 'mg', series: 'sodiumMg', band: null, ref: '≤ 2 000 mg', icon: '🧂' }
    ];
    return items;
  }
  function htmlExtraKpis() {
    return '<div class="nv-grid nv-g4" id="nvKpiExtra">' + extraKpis().map((k) => {
      const tone = k.band ? k.band.tone : 'info';
      return UI.kpi({ label: k.label, value: k.value, unit: k.unit, icon: k.icon, tone: tone, chip: k.band ? refLabel(k.band) : k.ref, hint: '<span class="nv-note">' + U.esc(t('common.ref') + ' : ' + k.ref) + '</span><div class="nv-kpi-spark"><div class="nv-chart-host" data-spark="x-' + (k.series || 'none') + '" style="height:28px"></div></div>' });
    }).join('') + '</div>';
  }

  /* ---- moteur de score --------------------------------------------------- */
  function htmlScore() {
    return UI.panel({
      id: 'nvScorePanel', icon: '🧬', title: t('score.title'), subtitle: U.esc(t('score.sub')),
      actions: UI.btn(t('pred.rerun'), { action: 'recompute', icon: '↻', kind: 'ghost' }),
      body: '<div class="nv-score-grid">' +
        '<div class="nv-score-rings">' +
          '<div class="nv-chart-host" data-chart="scoreRings" style="height:216px"></div>' +
          '<div class="nv-ring-legend" id="nvRingLegend"></div>' +
        '</div>' +
        '<div class="nv-score-parts" id="nvScoreParts"></div>' +
        '<div class="nv-score-radar">' +
          '<h4>' + U.esc(t('score.adequacy')) + '</h4>' +
          '<p class="nv-sub">' + U.esc(t('score.adequacySub')) + '</p>' +
          '<div class="nv-chart-host" data-chart="adequacyRadar" style="height:250px"></div>' +
          '<div id="nvAdequacyList" class="nv-adequacy-list"></div>' +
        '</div>' +
      '</div>',
      footer: '<span class="nv-note">' + U.esc(t('common.footnote')) + '</span>'
    });
  }

  /* ---- laboratoire de prédiction ---------------------------------------- */
  const PRED_VARS = [
    { id: 'weight', label: ['Weight', 'Poids'], unit: 'kg', digits: 1 },
    { id: 'bmi', label: ['BMI', 'IMC'], unit: 'kg/m²', digits: 1 },
    { id: 'glucose', label: ['Glucose', 'Glycémie'], unit: 'mg/dL', digits: 0 },
    { id: 'hba1c', label: ['HbA1c', 'HbA1c'], unit: '%', digits: 2 },
    { id: 'sbp', label: ['Systolic BP', 'PAS'], unit: 'mmHg', digits: 0 },
    { id: 'score', label: ['NutriScore', 'NutriScore'], unit: '/100', digits: 0 },
    { id: 'waist', label: ['Waist', 'Tour de taille'], unit: 'cm', digits: 1 }
  ];
  function predVar(id) { return PRED_VARS.filter((v) => v.id === id)[0] || PRED_VARS[0]; }
  function predVarLabel(v) { return fr() ? v.label[1] : v.label[0]; }
  function htmlPred() {
    const trials = State.settings.trials;
    return UI.panel({
      id: 'nvPredPanel', icon: '🔮', title: t('pred.title'),
      subtitle: U.esc(t('pred.sub', { trials: U.fmtInt(trials) })),
      actions: UI.segmented([{ id: 300, label: '300' }, { id: 1000, label: '1 000' }, { id: 3000, label: '3 000' }], trials, 'trials') +
        '<span class="nv-note">' + U.esc(t('pred.trials')) + '</span>',
      body:
        '<div class="nv-pred-toolbar">' +
          '<div class="nv-field"><span>' + U.esc(t('pred.variable')) + '</span>' +
            UI.segmented(PRED_VARS.map((v) => ({ id: v.id, label: predVarLabel(v) })), State.settings.predVar, 'pred-var') + '</div>' +
          '<div class="nv-field nv-grow">' + UI.slider({ key: 'horizon', id: 'nvHorizon', label: t('pred.horizon'), min: 3, max: 60, step: 3, value: State.settings.horizon, display: t('pred.months', { n: State.settings.horizon }), unit: '' }) + '</div>' +
          '<div class="nv-field">' + UI.toggle({ key: 'predScenario', on: State.settings.predScenario !== false, label: fr() ? 'Avec mon scénario' : 'With my scenario' }) + '</div>' +
        '</div>' +
        '<div class="nv-pred-main">' +
          '<div class="nv-pred-chartcard">' +
            '<h4>' + U.esc(t('pred.forecast')) + '</h4>' +
            '<p class="nv-sub" id="nvForecastSub">' + U.esc(t('pred.forecastSub')) + '</p>' +
            '<div class="nv-chart-host" data-chart="forecast" style="height:288px"></div>' +
            '<div class="nv-forecast-meta" id="nvForecastMeta"></div>' +
          '</div>' +
          '<div class="nv-pred-risks">' +
            '<h4>' + U.esc(t('pred.risks')) + '</h4>' +
            '<p class="nv-sub">' + U.esc(t('pred.risksSub')) + '</p>' +
            '<div class="nv-list" id="nvRiskList"></div>' +
            '<h4 style="margin-top:14px">' + U.esc(t('pred.attr')) + ' — <span id="nvAttrTitle">—</span></h4>' +
            '<p class="nv-sub">' + U.esc(t('pred.attrSub')) + '</p>' +
            '<div class="nv-chart-host" data-chart="attr" style="height:210px"></div>' +
          '</div>' +
        '</div>' +
        '<div class="nv-divider"></div>' +
        '<div class="nv-markov">' +
          '<div class="nv-markov-chart">' +
            '<h4>' + U.esc(t('pred.markov')) + '</h4>' +
            '<p class="nv-sub" id="nvMarkovSub">—</p>' +
            '<div class="nv-chart-host" data-chart="markov" style="height:264px"></div>' +
            '<div class="nv-legend-html" id="nvMarkovLegend"></div>' +
          '</div>' +
          '<div class="nv-markov-side">' +
            '<div class="nv-grid nv-g2" id="nvMarkovKpis"></div>' +
            '<div class="nv-row" style="margin-top:10px">' +
              UI.btn(t('pred.rerun'), { action: 'pred-rerun', icon: '↻', kind: 'primary' }) +
              UI.btn(fr() ? 'Voir le modèle' : 'Inspect model', { action: 'model-info', icon: '🧠', kind: 'ghost' }) +
            '</div>' +
            '<div class="nv-note" id="nvMarkovNote" style="margin-top:8px"></div>' +
          '</div>' +
        '</div>' +
        '<div class="nv-divider"></div>' +
        '<div class="nv-anomaly">' +
          '<h4>' + U.esc(t('pred.anomaly')) + '</h4>' +
          '<p class="nv-sub">' + U.esc(t('pred.anomalySub')) + '</p>' +
          '<div class="nv-grid nv-g3" id="nvAnomalyList"></div>' +
        '</div>'
    });
  }

  /* ---- simulateur de scénarios ------------------------------------------ */
  const PRESETS = {
    base: { weightPct: 0, activityMin: 78, fruitVeg: 2.4, sodiumMg: 5200, sodaWk: 4, upf: 34, sleep: 6.4, organic: 30, adherence: 55 },
    weight: { weightPct: -5, activityMin: 120, fruitVeg: 3, sodiumMg: 4600, sodaWk: 3, upf: 30, sleep: 6.6, organic: 34, adherence: 70 },
    local: { weightPct: -2, activityMin: 110, fruitVeg: 5.5, sodiumMg: 3600, sodaWk: 1, upf: 14, sleep: 7, organic: 78, adherence: 76 },
    sodium: { weightPct: -1, activityMin: 95, fruitVeg: 3.4, sodiumMg: 2000, sodaWk: 2, upf: 24, sleep: 6.8, organic: 42, adherence: 68 },
    active: { weightPct: -3, activityMin: 220, fruitVeg: 4, sodiumMg: 4000, sodaWk: 1, upf: 22, sleep: 7.4, organic: 38, adherence: 82 },
    full: { weightPct: -7, activityMin: 240, fruitVeg: 6, sodiumMg: 1800, sodaWk: 0, upf: 8, sleep: 7.6, organic: 85, adherence: 92 }
  };
  const LEVERS = [
    { key: 'weightPct', label: 'lev.weight', icon: '⚖️', min: -15, max: 10, step: 0.5, unit: ' %', dec: 1 },
    { key: 'activityMin', label: 'lev.activity', icon: '🏃🏾', min: 0, max: 420, step: 5, unit: ' min/sem', dec: 0 },
    { key: 'fruitVeg', label: 'lev.fruitveg', icon: '🥬', min: 0, max: 10, step: 0.5, unit: '/j', dec: 1 },
    { key: 'sodiumMg', label: 'lev.sodium', icon: '🧂', min: 800, max: 9000, step: 100, unit: ' mg/j', dec: 0 },
    { key: 'sodaWk', label: 'lev.sugar', icon: '🥤', min: 0, max: 21, step: 1, unit: '/sem', dec: 0 },
    { key: 'upf', label: 'lev.upf', icon: '🍪', min: 0, max: 90, step: 1, unit: ' %', dec: 0 },
    { key: 'sleep', label: 'lev.sleep', icon: '😴', min: 3.5, max: 10, step: 0.1, unit: ' h', dec: 1 },
    { key: 'organic', label: 'lev.organic', icon: '🌱', min: 0, max: 100, step: 1, unit: ' %', dec: 0 },
    { key: 'adherence', label: 'lev.adherence', icon: '🎯', min: 0, max: 100, step: 1, unit: ' %', dec: 0 }
  ];
  function htmlSim() {
    const s = State.scenario;
    return UI.panel({
      id: 'nvSimPanel', icon: '🎛️', title: t('sim.title'), subtitle: U.esc(t('sim.sub')),
      actions: '<select class="nv-select" data-nv-action="preset">' + Object.keys(PRESETS).map((k) => '<option value="' + k + '">' + U.esc(t('preset.' + k)) + '</option>').join('') + '</select>' +
        UI.btn(t('sim.apply'), { action: 'sim-apply', icon: '✅', kind: 'primary' }) +
        UI.btn(t('sim.reset'), { action: 'sim-reset', icon: '↺', kind: 'ghost' }),
      body: '<div class="nv-sim-grid">' +
        '<div class="nv-sim-levers">' +
          '<h4>' + U.esc(t('sim.levers')) + '</h4>' +
          LEVERS.map((lv) => UI.slider({
            key: lv.key, id: 'nvLev-' + lv.key, label: t(lv.label), icon: lv.icon,
            min: lv.min, max: lv.max, step: lv.step, value: U.num(s[lv.key], lv.min),
            display: U.fmt(U.num(s[lv.key], lv.min), lv.dec) + lv.unit, unit: lv.unit, decimals: lv.dec
          })).join('') +
          '<div class="nv-row" style="margin-top:8px">' +
            UI.toggle({ key: 'smoke', on: !!s.smoke, label: t('lev.smoke') }) +
            UI.slider({ key: 'alcohol', id: 'nvLev-alcohol', label: t('lev.alcohol'), icon: '🍺', min: 0, max: 21, step: 1, value: U.num(s.alcohol, 2), display: U.fmt(U.num(s.alcohol, 2), 0) + ' u', decimals: 0 }) +
          '</div>' +
          '<div class="nv-organic-box" id="nvOrganicBox"></div>' +
        '</div>' +
        '<div class="nv-sim-out">' +
          '<h4>' + U.esc(t('sim.impact')) + '</h4>' +
          '<div class="nv-grid nv-g3" id="nvSimKpis"></div>' +
          '<div class="nv-chart-host" data-chart="simDelta" style="height:186px;margin-top:10px"></div>' +
          '<h4 style="margin-top:12px">' + U.esc(t('sim.compare')) + '</h4>' +
          '<p class="nv-sub">' + U.esc(t('sim.compareSub')) + '</p>' +
          '<div class="nv-chart-host" data-chart="simCompare" style="height:210px"></div>' +
        '</div>' +
      '</div>'
    });
  }

  /* ---- journal nutritionnel --------------------------------------------- */
  function htmlJournal() {
    return UI.panel({
      id: 'nvJournalPanel', icon: '📓', title: t('journal.title'), subtitle: U.esc(t('journal.sub')),
      actions:
        UI.segmented(['breakfast', 'lunch', 'dinner', 'snack'].map((s) => ({ id: s, label: t('slot.' + s) })), State.settings.slot || guessSlot(), 'journal-slot') +
        UI.segmented([{ id: 50, label: '50 g' }, { id: 100, label: '100 g' }, { id: 150, label: '150 g' }, { id: 250, label: '250 g' }], State.settings.grams || 100, 'journal-grams') +
        UI.btn(t('journal.scan'), { action: 'journal-scan', icon: '📷', kind: 'primary' }) +
        UI.btn(t('journal.clear'), { action: 'journal-clear', icon: '🗑', kind: 'ghost' }),
      body:
        '<div class="nv-journal-grid">' +
          '<div class="nv-journal-add">' +
            '<h4>' + U.esc(t('journal.add')) + ' — ' + U.esc(countryName()) + '</h4>' +
            '<div class="nv-foodchips" id="nvFoodChips"></div>' +
            '<h4 style="margin-top:12px">' + U.esc(t('journal.today')) + '</h4>' +
            '<div class="nv-list nv-scroll" id="nvJournalList"></div>' +
          '</div>' +
          '<div class="nv-journal-intake">' +
            '<h4>' + U.esc(t('journal.intake')) + '</h4>' +
            '<div class="nv-intake-grid">' +
              '<div class="nv-chart-host" data-chart="macroDonut" style="height:190px"></div>' +
              '<div id="nvIntakeList" class="nv-scroll"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="nv-divider"></div>' +
        '<div class="nv-adherence">' +
          '<h4>' + U.esc(t('journal.adherence')) + '</h4>' +
          '<div class="nv-adherence-grid">' +
            '<div class="nv-chart-host" data-chart="adherence" style="height:190px"></div>' +
            '<div class="nv-grid nv-g2" id="nvJournalKpis"></div>' +
          '</div>' +
        '</div>' +
        '<div class="nv-scan-stage" id="nvScanStage" style="display:none"></div>'
    });
  }

  /* ---- plan alimentaire -------------------------------------------------- */
  function htmlPlan() {
    return UI.panel({
      id: 'nvPlanPanel', icon: '🍽️', title: t('plan.title'),
      subtitle: '<span id="nvPlanSub">—</span>',
      actions:
        '<select class="nv-select" data-nv-action="plan-budget">' + [2.2, 3.4, 5, 7.5].map((b) => '<option value="' + b + '"' + (Math.abs(b - (State.settings.budget || 3.4)) < 0.01 ? ' selected' : '') + '>≤ $' + b + '/j</option>').join('') + '</select>' +
        UI.btn(t('plan.regenerate'), { action: 'plan-regen', icon: '🎲', kind: 'primary' }) +
        UI.btn(t('plan.apply'), { action: 'plan-log', icon: '📥' }) +
        UI.btn(t('plan.market'), { action: 'goto', arg: 'marketplace', icon: '🛒', kind: 'ghost' }) +
        UI.btn(t('common.export'), { action: 'plan-export', icon: '⇩', kind: 'ghost' }),
      body:
        '<div class="nv-plan-grid">' +
          '<div class="nv-plan-days">' +
            '<div class="nv-tabs" id="nvPlanTabs"></div>' +
            '<div id="nvPlanDay"></div>' +
          '</div>' +
          '<div class="nv-plan-side">' +
            '<div class="nv-grid nv-g2" id="nvPlanKpis"></div>' +
            '<h4 style="margin-top:12px">' + U.esc(t('plan.coverage')) + '</h4>' +
            '<div class="nv-chart-host" data-chart="planRadar" style="height:236px"></div>' +
            '<div id="nvPlanNotes" class="nv-note" style="margin-top:8px"></div>' +
          '</div>' +
        '</div>'
    });
  }

  /* ---- alertes ------------------------------------------------------------ */
  function htmlAlerts() {
    return UI.panel({
      id: 'nvAlertsPanel', icon: '🚨', title: t('alert.title'), subtitle: '<span class="nv-pill" id="nvAlertCount">0</span> ' + U.esc(t('alert.sub')),
      actions: UI.btn(t('alert.book'), { action: 'alert-act', arg: 'book', icon: '👩🏾‍⚕️', kind: 'primary' }),
      body: '<div class="nv-list" id="nvAlertList"></div>'
    });
  }

  /* ---- pied de section : données, export, confidentialité ---------------- */
  function htmlFooter() {
    return UI.panel({
      id: 'nvFooterPanel', icon: '🔐', title: fr() ? 'Données, export & confidentialité' : 'Data, export & privacy',
      subtitle: U.esc(t('common.privacy')),
      body: '<div class="nv-row">' +
        UI.btn('JSON', { action: 'export-json', icon: '⇩' }) +
        UI.btn('CSV', { action: 'export-csv', icon: '⇩' }) +
        UI.btn(t('common.print'), { action: 'export-print', icon: '🖨' }) +
        UI.btn(fr() ? 'Ouvrir African Food Cloud' : 'Open African Food Cloud', { action: 'goto', arg: 'foodcloud', icon: '🌍', kind: 'ghost' }) +
        UI.btn(fr() ? 'Ouvrir les objets connectés' : 'Open connected devices', { action: 'goto', arg: 'devices', icon: '⌚', kind: 'ghost' }) +
        '<span class="nv-grow"></span>' +
        '<span class="nv-badge-demo">🧪 ' + U.esc(t('demo')) + '</span>' +
      '</div>',
      footer: '<span class="nv-note">' + U.esc(t('common.footnote')) + '</span>'
    });
  }

  /* ---- enrichissement du formulaire existant ---------------------------- */
  function htmlFormExtras() {
    const p = State.profile;
    return '<div class="nv-form-extra">' +
      '<div class="nv-divider"></div>' +
      '<h4>' + U.esc(t('form.lifestyle')) + '</h4>' +
      '<div class="form nv-form-lifestyle">' +
        '<label>' + U.esc(t('form.activity')) + '<input id="nvAct" type="number" min="0" max="1000" step="5" value="' + U.fmt(p.activityMin, 0) + '" data-nv-field="activityMin"></label>' +
        '<label>' + U.esc(t('form.sleep')) + '<input id="nvSleep" type="number" min="2" max="12" step=".1" value="' + U.fmt(p.sleep, 1) + '" data-nv-field="sleep"></label>' +
        '<label>' + U.esc(t('form.fruitveg')) + '<input id="nvFv" type="number" min="0" max="14" step=".5" value="' + U.fmt(p.fruitVeg, 1) + '" data-nv-field="fruitVeg"></label>' +
        '<label>' + U.esc(t('form.sodium')) + '<input id="nvNa" type="number" min="0" max="15" step=".1" value="' + U.fmt(U.num(p.sodiumMg, 5200) / 1000, 1) + '" data-nv-field="sodiumG"></label>' +
        '<label>' + U.esc(t('form.upf')) + '<input id="nvUpf" type="number" min="0" max="100" step="1" value="' + U.fmt(p.upf, 0) + '" data-nv-field="upf"></label>' +
        '<label>' + U.esc(t('form.water')) + '<input id="nvWater" type="number" min="0" max="6" step=".1" value="' + U.fmt(p.water, 1) + '" data-nv-field="water"></label>' +
        '<label>' + U.esc(t('form.alcohol')) + '<input id="nvAlc" type="number" min="0" max="40" step="1" value="' + U.fmt(p.alcohol, 0) + '" data-nv-field="alcohol"></label>' +
        '<label>' + U.esc(t('form.smoke')) + '<select id="nvSmoke" data-nv-field="smoke"><option value="0"' + (p.smoke ? '' : ' selected') + '>' + (fr() ? 'Non' : 'No') + '</option><option value="1"' + (p.smoke ? ' selected' : '') + '>' + (fr() ? 'Oui' : 'Yes') + '</option></select></label>' +
        '<label>' + U.esc(t('form.pregnant')) + '<select id="nvPreg" data-nv-field="pregnant"><option value="0"' + (!p.pregnant ? ' selected' : '') + '>' + (fr() ? 'Non' : 'No') + '</option><option value="pregnancy"' + (p.pregnant === 'pregnancy' || p.pregnant === true ? ' selected' : '') + '>' + (fr() ? 'Grossesse' : 'Pregnancy') + '</option><option value="lactation"' + (p.pregnant === 'lactation' ? ' selected' : '') + '>' + (fr() ? 'Allaitement' : 'Breastfeeding') + '</option></select></label>' +
      '</div>' +
      '<div class="nv-row" style="margin-top:10px">' +
        UI.btn(t('form.demo'), { action: 'form-demo', icon: '🧪' }) +
        UI.btn(fr() ? 'Compléter depuis les appareils' : 'Fill from devices', { action: 'form-device', icon: '⌚' }) +
        '<span class="nv-grow"></span>' +
        '<span class="nv-live" id="nvFormLive"><i></i>' + U.esc(t('form.sub')) + '</span>' +
      '</div>' +
    '</div>';
  }

  /* ---- famille & mineurs (amélioration du bloc existant) ------------------ */
  function childById(id) { return CHILDREN[id] || CHILDREN.child1; }
  function renderFamily() {
    const host = document.getElementById('familyChildDashboard');
    if (!host) return;
    const id = (document.getElementById('familyMember') || {}).value || State.settings.child;
    const c = childById(id);
    State.settings.child = id;
    const z = childZ(c), gs = childGrowthSeries(c);
    const consent = State.consent[id];
    host.innerHTML =
      '<div class="child-stats">' +
        '<div class="child-stat"><span class="muted">' + U.esc(fr() ? 'Enfant' : 'Child') + '</span><b>' + U.esc(c.name) + '</b><small>' + U.esc((c.sex === 'male' ? '♂ ' : '♀ ') + c.age + ' ' + (fr() ? 'ans' : 'years')) + '</small></div>' +
        '<div class="child-stat"><span class="muted">' + U.esc(fr() ? 'Taille' : 'Height') + '</span><b>' + U.fmt(c.height, 1) + ' cm</b><small>z = ' + U.signed(z.zHeight, 2) + ' · P' + U.fmt(percentileFromZ(z.zHeight), 0) + '</small></div>' +
        '<div class="child-stat"><span class="muted">' + U.esc(fr() ? 'Poids' : 'Weight') + '</span><b>' + U.fmt(c.weight, 1) + ' kg</b><small>z = ' + U.signed(z.zWeight, 2) + ' · P' + U.fmt(percentileFromZ(z.zWeight), 0) + '</small></div>' +
        '<div class="child-stat"><span class="muted">' + U.esc(fr() ? 'IMC-pour-âge' : 'BMI-for-age') + '</span><b>' + U.fmt(z.bmi, 1) + '</b><small>' + U.esc(t('fam.percentile')) + ' P' + U.fmt(z.percentile, 0) + '</small></div>' +
      '</div>' +
      '<div class="nv-family-grid">' +
        '<div>' +
          '<h4 style="margin:12px 0 4px">' + U.esc(t('fam.growth')) + '</h4>' +
          '<p class="nv-sub">' + U.esc(t('fam.growthSub')) + '</p>' +
          '<div class="nv-chart-host" data-chart="childGrowth" style="height:236px"></div>' +
        '</div>' +
        '<div>' +
          '<h4 style="margin:12px 0 4px">' + U.esc(t('fam.diversity')) + '</h4>' +
          '<div class="nv-chart-host" data-chart="childRadar" style="height:200px"></div>' +
          '<div class="nv-list" id="nvChildAlerts"></div>' +
        '</div>' +
      '</div>' +
      '<div class="nv-row" style="margin-top:12px">' +
        '<span class="nv-chip nv-chip-' + (consent ? 'good' : 'warn') + '">' + (consent ? '🔓 ' + U.esc(t('fam.granted')) + ' · ' + U.esc(consent.code) : '🔐 ' + U.esc(t('fam.consent'))) + '</span>' +
        UI.btn(t('fam.grant'), { action: 'child-consent', arg: id, icon: '🔐' }) +
        UI.btn(t('fam.plan'), { action: 'child-plan', arg: id, icon: '🍽', kind: 'primary' }) +
        UI.btn(fr() ? 'Tableau de bord complet' : 'Full child dashboard', { action: 'child-full', arg: id, icon: '📊' }) +
        '<span class="nv-grow"></span>' +
        '<span class="nv-note">' + U.esc(t('fam.school')) + ' : ' + (c.school ? (fr() ? 'connecté' : 'connected') : '—') + '</span>' +
      '</div>';
    /* graphiques enfant */
    renderChildCharts(c, z, gs);
    renderChildAlerts(c, z);
  }
  function renderChildAlerts(c, z) {
    const host = root && root.querySelector('#nvChildAlerts');
    if (!host) return;
    const items = [];
    if (z.zBmi < -1) items.push({ tone: 'warn', icon: '📉', title: fr() ? 'IMC-pour-âge bas' : 'Low BMI-for-age', text: 'z = ' + U.fmt(z.zBmi, 2) + ' — ' + (fr() ? 'renforcer la densité énergétique et le suivi.' : 'increase energy density and follow-up.') });
    if (z.zBmi > 1) items.push({ tone: 'warn', icon: '📈', title: fr() ? 'IMC-pour-âge élevé' : 'High BMI-for-age', text: 'z = ' + U.fmt(z.zBmi, 2) + ' — ' + (fr() ? 'double fardeau : surveiller les aliments ultra-transformés.' : 'double burden: watch ultra-processed foods.') });
    if (z.zHeight < -1) items.push({ tone: 'risk', icon: '🧍🏾', title: fr() ? 'Retard de croissance' : 'Growth faltering', text: 'z = ' + U.fmt(z.zHeight, 2) + ' — ' + (fr() ? 'évaluation professionnelle recommandée.' : 'professional assessment recommended.') });
    if (c.diversity < 4) items.push({ tone: 'warn', icon: '🥗', title: fr() ? 'Diversité alimentaire faible' : 'Low diet diversity', text: U.fmt(c.diversity, 1) + '/10 — ' + (fr() ? 'ajouter légumes verts + légumineuses à la cantine et à la maison.' : 'add green leaves + legumes at school and home.') });
    if (c.hb < 11.5) items.push({ tone: 'risk', icon: '🩸', title: fr() ? 'Signal d\'anémie' : 'Anaemia signal', text: 'Hb ' + U.fmt(c.hb, 1) + ' g/dL — ' + (fr() ? 'fer + vitamine C, dépistage conseillé.' : 'iron + vitamin C, screening advised.') });
    if (!items.length) items.push({ tone: 'good', icon: '✅', title: fr() ? 'Aucune alerte active' : 'No active alert', text: fr() ? 'Croissance et apports dans les bandes attendues.' : 'Growth and intake within expected bands.' });
    host.innerHTML = items.map((i) => '<div class="nv-item" data-tone="' + i.tone + '"><span class="nv-item-icon">' + i.icon + '</span><div class="nv-item-body"><div class="nv-item-title">' + U.esc(i.title) + '</div><div class="nv-item-text">' + U.esc(i.text) + '</div></div></div>').join('');
  }
  function renderChildCharts(c, z, gs) {
    const gh = root && root.querySelector('[data-chart="childGrowth"]');
    if (gh) {
      mountChart('childGrowth', gh, {
        type: 'line', height: 236, labels: gs.ages.map((a) => a + (fr() ? ' ans' : ' y')),
        series: [
          { name: fr() ? 'P97 taille' : 'Height P97', data: gs.p97, color: '#22d3ee', dash: '4 4', points: false, fill: false, width: 1.4, lastLabel: false },
          { name: fr() ? 'Taille' : 'Height', data: gs.heights, color: '#38f0a5', fill: true, width: 2.6 },
          { name: fr() ? 'P3 taille' : 'Height P3', data: gs.p3, color: '#22d3ee', dash: '4 4', points: false, fill: false, width: 1.4, lastLabel: false },
          { name: fr() ? 'Poids' : 'Weight', data: gs.weights, color: '#f5c451', axis: 'y2', width: 2.2 },
          { name: fr() ? 'Poids P97' : 'Weight P97', data: gs.w97, color: '#f5c451', axis: 'y2', dash: '4 4', points: false, width: 1.2, lastLabel: false },
          { name: fr() ? 'Poids P3' : 'Weight P3', data: gs.w3, color: '#f5c451', axis: 'y2', dash: '4 4', points: false, width: 1.2, lastLabel: false }
        ],
        y: { label: 'cm', digits: 0 }, y2: { label: 'kg', digits: 0 },
        markers: [{ index: gs.curIndex, value: gs.heights[gs.curIndex], label: c.name + ' · ' + U.fmt(c.height, 0) + ' cm', color: '#38f0a5' }],
        legend: true
      });
    }
    const rh = root && root.querySelector('[data-chart="childRadar"]');
    if (rh) {
      const req = requirements({ sex: c.sex, age: c.age, weight: c.weight, height: c.height, activityMin: 420, pregnant: false });
      const est = {
        energy: U.clamp(52 + c.diversity * 6.4, 20, 108), protein: U.clamp(46 + c.diversity * 7.2, 15, 112),
        iron: U.clamp(38 + c.hb * 4.4, 10, 110), vitA: U.clamp(30 + c.diversity * 9.5, 10, 118),
        vitC: U.clamp(35 + c.fruitVeg * 16, 10, 120), calcium: U.clamp(32 + c.diversity * 8.6, 10, 115),
        zinc: U.clamp(40 + c.diversity * 7.4, 10, 112), folate: U.clamp(34 + c.diversity * 8.2, 10, 114)
      };
      mountChart('childRadar', rh, {
        type: 'radar', height: 200,
        axes: ['energy', 'protein', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate'].map((k) => ({
          label: k === 'energy' ? (fr() ? 'Énergie' : 'Energy') : k === 'protein' ? (fr() ? 'Protéines' : 'Protein') : k === 'iron' ? 'Fer' : k === 'vitA' ? 'Vit. A' : k === 'vitC' ? 'Vit. C' : k === 'calcium' ? 'Calcium' : k === 'zinc' ? 'Zinc' : 'Folate',
          max: 130
        })),
        series: [
          { name: c.name, data: Object.keys(est).map((k) => est[k]), color: '#a3e635' },
          { name: fr() ? 'Cible' : 'Target', data: Object.keys(est).map(() => 100), color: '#22d3ee', fill: false }
        ],
        y: { format: (v) => U.fmt(v, 0) + '%' }
      });
    }
  }

  /* ==========================================================================
     7. MONTAGE + AMÉLIORATION DU BALISAGE EXISTANT
     ====================================================================== */
  function mountChart(key, host, spec) {
    if (!host) return null;
    const cur = State.charts[key];
    if (cur && cur.host === host && !cur.destroyed) { cur.render(spec); return cur; }
    if (cur) { try { cur.destroy(); } catch (e) { } }
    const inst = CH.mount(host, spec);
    if (inst) State.charts[key] = inst;
    return inst;
  }
  function chartHost(key) { return root ? root.querySelector('[data-chart="' + key + '"]') : null; }
  function sparkHost(key) { return root ? root.querySelector('[data-spark="' + key + '"]') : null; }
  function setTxt(sel, val) { const e = typeof sel === 'string' ? (root && root.querySelector(sel)) : sel; if (e) e.textContent = val; return e; }
  function setHtml(sel, val) { const e = typeof sel === 'string' ? (root && root.querySelector(sel)) : sel; if (e) e.innerHTML = val; return e; }

  function mount(r) {
    root = r;
    root.classList.add('nv-scope', 'nv-citizen');
    State.mounted = true;
    global.NUTRI_CITIZEN_ENGINE = true;
    installLegacyGlobals();

    /* halo de balayage */
    const scan = document.createElement('div');
    scan.className = 'nv-scanline';
    root.insertBefore(scan, root.firstChild);

    const family = root.querySelector('#familyDashboard');
    const title = root.querySelector('h2[data-t="citizenTitle"]') || root.querySelector('h2');
    const kpiGrid = title ? (title.nextElementSibling && title.nextElementSibling.classList.contains('grid') ? title.nextElementSibling : null) : null;
    const grid2s = U.qsa('.grid2', root).filter((g) => g.parentElement === root);
    const formCard = (root.querySelector('#citizen .form') || root.querySelector('.form')) && (root.querySelector('.form').closest('.card'));
    const recsCard = root.querySelector('#recs') ? root.querySelector('#recs').closest('.card') : null;

    /* 1. hero (identité + score global + flux vivant) */
    refs.hero = ins(mkDiv('nvHero', 'nv-hero-panel', htmlHero()), 'beforebegin', family || root.firstElementChild);
    refs.vitals = refs.hero.querySelector('#nvVitals');
    refs.liveBadge = refs.hero.querySelector('#nvLiveBadge');

    /* 2. KPI cliniques additionnels, juste après la grille existante */
    refs.kpiExtra = ins(mkDiv('nvKpiExtraWrap', '', htmlExtraKpis()), 'afterend', kpiGrid || refs.hero);

    /* 3. moteur de score */
    refs.score = ins(mkDiv('nvScoreWrap', '', htmlScore()), 'afterend', refs.kpiExtra);

    /* 4. prédiction + scénarios, après les graphiques existants */
    const lastGrid2 = grid2s.length ? grid2s[grid2s.length - 1] : refs.score;
    refs.pred = ins(mkDiv('nvPredWrap', '', htmlPred()), 'afterend', lastGrid2);
    refs.sim = ins(mkDiv('nvSimWrap', '', htmlSim()), 'afterend', refs.pred);

    /* 5. journal + plan, après le formulaire existant */
    refs.journal = ins(mkDiv('nvJournalWrap', '', htmlJournal()), 'afterend', formCard || refs.sim);
    refs.plan = ins(mkDiv('nvPlanWrap', '', htmlPlan()), 'afterend', refs.journal);

    /* 6. alertes + pied de section */
    refs.alerts = ins(mkDiv('nvAlertsWrap', '', htmlAlerts()), 'afterend', recsCard || refs.plan);
    refs.footer = ins(mkDiv('nvFooterWrap', '', htmlFooter()), 'afterend', refs.alerts);

    /* 7. enrichissement du formulaire existant (aucun champ supprimé) */
    if (formCard && !formCard.querySelector('.nv-form-extra')) {
      const legacyBtn = formCard.querySelector('button.btn.primary');
      if (legacyBtn) {
        const wrap = document.createElement('div');
        wrap.innerHTML = htmlFormExtras();
        formCard.insertBefore(wrap.firstElementChild, legacyBtn.parentElement === formCard ? legacyBtn : null);
      } else formCard.insertAdjacentHTML('beforeend', htmlFormExtras());
    }

    enhanceLegacyCharts();
    enhanceLegacyKpis();
    wire();
    seedLive();
    renderVitals();
    startLive();
    renderAll();
    /* synchronise le formulaire avec l'état persisté */
    fillForm();
    renderFamily();
  }

  /* ---- graphiques existants : on garde les cartes, on remplace le rendu --- */
  const LEGACY_CHARTS = [
    { canvas: 'anthroChart', key: 'anthro', title: 'trend.anthro', toolbar: true },
    { canvas: 'clinicalChart', key: 'clinical', title: 'trend.clinical', toolbar: false },
    { canvas: 'nutritionClinicalChart', key: 'nutriClin', title: 'trend.nutrition', toolbar: false }
  ];
  function enhanceLegacyCharts() {
    LEGACY_CHARTS.forEach((cfg) => {
      const canvas = root.querySelector('#' + cfg.canvas);
      if (!canvas) return;
      canvas.style.display = 'none';
      canvas.setAttribute('aria-hidden', 'true');
      const card = canvas.closest('.card');
      if (!card) return;
      let host = card.querySelector('[data-chart="' + cfg.key + '"]');
      if (!host) {
        host = document.createElement('div');
        host.className = 'nv-chart-host';
        host.dataset.chart = cfg.key;
        host.style.height = '262px';
        canvas.parentElement.appendChild(host);
      }
      if (cfg.toolbar && !card.querySelector('.nv-trend-toolbar')) {
        const bar = document.createElement('div');
        bar.className = 'nv-trend-toolbar nv-row';
        bar.innerHTML = '<span class="nv-note">' + U.esc(t('trend.period')) + '</span>' +
          UI.segmented([{ id: 30, label: t('trend.days30') }, { id: 90, label: t('trend.days90') }, { id: 180, label: t('trend.days180') }, { id: 365, label: t('trend.days365') }], State.settings.period, 'period') +
          '<span class="nv-grow"></span><span class="nv-note">' + U.esc(t('trend.historySub')) + '</span>';
        const h3 = card.querySelector('h3');
        if (h3) h3.insertAdjacentElement('afterend', bar); else card.insertBefore(bar, card.firstChild);
      }
    });
    /* carte « Reference comparison » : le conteneur legacy #referenceCards est conservé */
    const refCard = root.querySelector('#referenceCards');
    if (refCard && !refCard.parentElement.querySelector('[data-chart="refBars"]')) {
      const host = document.createElement('div');
      host.className = 'nv-chart-host';
      host.dataset.chart = 'refBars';
      host.style.height = '200px';
      refCard.insertAdjacentElement('afterend', host);
    }
  }

  /* ---- KPI existants : étincelles + statut, sans toucher aux ids --------- */
  function enhanceLegacyKpis() {
    const specs = [
      { id: 'bmi', key: 'bmi', spark: 'bmi' },
      { id: 'weight', key: 'weight', spark: 'weight' },
      { id: 'waist', key: 'waist', spark: 'waist' },
      { id: 'bp', key: 'bp', spark: 'sbp' }
    ];
    specs.forEach((s) => {
      const metric = root.querySelector('#' + s.id);
      if (!metric) return;
      const card = metric.closest('.card');
      if (!card) return;
      card.classList.add('nv-kpi-card');
      card.dataset.nvKpi = s.key;
      if (!card.querySelector('.nv-kpi-spark')) {
        const sp = document.createElement('div');
        sp.className = 'nv-kpi-spark';
        sp.innerHTML = '<div class="nv-chart-host" data-spark="' + s.spark + '" style="height:30px"></div>';
        card.appendChild(sp);
      }
      if (!card.querySelector('.nv-kpi-chip')) {
        const chip = document.createElement('span');
        chip.className = 'nv-chip nv-kpi-chip';
        const kpi = card.querySelector('.kpi');
        if (kpi) kpi.insertAdjacentElement('afterend', chip); else card.appendChild(chip);
      }
    });
  }

  /* ---- remplissage du formulaire existant depuis l'état ------------------ */
  function fillForm() {
    const p = State.profile;
    const map = { profile: p.sex === 'male' ? 'male' : p.sex === 'child' ? 'child' : 'female', age: p.age, w: p.weight, h: p.height, wa: p.waist, hi: p.hip, gl: p.glucose, a1c: p.hba1c, sys: p.sbp, dia: p.dbp, chol: p.chol };
    Object.keys(map).forEach((id) => {
      const e = root.querySelector('#' + id);
      if (e && map[id] != null) e.value = map[id];
    });
    const kidney = root.querySelector('#kidney');
    if (kidney && p.creatinine) kidney.value = U.fmt(p.creatinine, 2) + ' mg/dL · eGFR ' + U.fmt(derived(p).egfr || 0, 0);
    const nv = { nvAct: p.activityMin, nvSleep: p.sleep, nvFv: p.fruitVeg, nvNa: Math.round(U.num(p.sodiumMg, 5200) / 100) / 10, nvUpf: p.upf, nvWater: p.water, nvAlc: p.alcohol };
    Object.keys(nv).forEach((id) => { const e = root.querySelector('#' + id); if (e && nv[id] != null) e.value = nv[id]; });
    const smoke = root.querySelector('#nvSmoke'); if (smoke) smoke.value = p.smoke ? '1' : '0';
    const preg = root.querySelector('#nvPreg'); if (preg) preg.value = p.pregnant === 'lactation' ? 'lactation' : (p.pregnant ? 'pregnancy' : '0');
  }
  function readForm() {
    const p = State.profile;
    const num = (id, dflt) => { const e = root.querySelector('#' + id); const v = e ? U.num(e.value, NaN) : NaN; return isFinite(v) ? v : dflt; };
    const sexSel = root.querySelector('#profile');
    if (sexSel) p.sex = sexSel.value === 'male' ? 'male' : sexSel.value === 'child' ? 'child' : 'female';
    if (p.sex === 'child' && U.num(p.age, 34) > 18) p.age = 12;
    p.age = num('age', p.age);
    p.weight = num('w', p.weight);
    p.height = num('h', p.height);
    p.waist = num('wa', p.waist);
    p.hip = num('hi', p.hip);
    p.glucose = num('gl', p.glucose);
    p.hba1c = num('a1c', p.hba1c);
    p.sbp = num('sys', p.sbp);
    p.dbp = num('dia', p.dbp);
    p.chol = num('chol', p.chol);
    const kidney = root.querySelector('#kidney');
    if (kidney && kidney.value) {
      const nums = String(kidney.value).match(/-?\d+(\.\d+)?/g);
      if (nums && nums.length) {
        const first = U.num(nums[0], 0);
        if (first > 0 && first < 30) p.creatinine = first;
        else if (first >= 30) p.egfr = first;
        if (nums.length > 1) { const second = U.num(nums[1], 0); if (second >= 20 && second < 200) p.egfr = second; }
      }
    }
    const nvNum = (id, key, mul) => { const e = root.querySelector('#' + id); if (e && isFinite(U.num(e.value, NaN))) p[key] = U.num(e.value) * (mul || 1); };
    nvNum('nvAct', 'activityMin'); nvNum('nvSleep', 'sleep'); nvNum('nvFv', 'fruitVeg');
    nvNum('nvNa', 'sodiumMg', 1000); nvNum('nvUpf', 'upf'); nvNum('nvWater', 'water'); nvNum('nvAlc', 'alcohol');
    const smoke = root.querySelector('#nvSmoke'); if (smoke) p.smoke = smoke.value === '1';
    const preg = root.querySelector('#nvPreg'); if (preg) p.pregnant = preg.value === '0' ? false : preg.value;
    return p;
  }

  /* ==========================================================================
     8. RENDUS
     ====================================================================== */
  let quickTimer = null, heavyTimer = null;
  function scheduleQuick() { clearTimeout(quickTimer); quickTimer = setTimeout(renderQuick, 90); }
  function scheduleHeavy() { clearTimeout(heavyTimer); heavyTimer = setTimeout(renderHeavy, 340); }
  function computeCache() {
    const p = State.profile;
    const it = intake(p);
    const sc = scoreProfile(p, it);
    State.cache.it = it;
    State.cache.sc = sc;
    State.cache.d = sc.d;
    State.cache.risks = risksFor(p, { it: it });
    return State.cache;
  }
  function renderAll() {
    if (!State.mounted) return;
    computeCache();
    renderHero();
    renderLegacyKpis();
    renderExtraKpis();
    renderScorePanel();
    renderTrendCharts();
    renderReference();
    renderPred();
    renderSim();
    renderJournal();
    renderPlan();
    renderAlerts();
    renderRecs();
    renderFamily();
  }
  function renderQuick() {
    if (!State.mounted) return;
    computeCache();
    renderHero();
    renderLegacyKpis();
    renderExtraKpis();
    renderScorePanel();
    renderTrendCharts();
    renderReference();
    renderJournalIntake();
    renderAlerts();
  }
  function renderHeavy() {
    if (!State.mounted) return;
    computeCache();
    renderPred();
    renderSim();
    renderPlan();
  }

  /* ---- hero -------------------------------------------------------------- */
  function renderHero() {
    const sc = State.cache.sc, p = State.profile;
    const host = chartHost('heroGauge');
    mountChart('heroGauge', host, {
      type: 'gauge', height: 186, value: sc.total, min: 0, max: 100, thickness: 15, needle: false, digits: 0,
      color: sc.total >= 68 ? '#38f0a5' : sc.total >= 52 ? '#f5c451' : '#fb7185', colorTo: '#22d3ee',
      bands: [
        { from: 0, to: 52, color: TH.tones.risk }, { from: 52, to: 68, color: TH.tones.warn },
        { from: 68, to: 82, color: TH.tones.ok }, { from: 82, to: 100, color: TH.tones.good }
      ],
      label: t('hero.globalScore'), sub: bandLabel(sc.band)
    });
    setHtml('#nvScoreBand', '<span class="nv-chip nv-chip-' + bandTone(sc.band) + '">' + U.esc(bandLabel(sc.band)) + '</span>');
    const hist = history().series.score || [];
    const past = hist.length > 31 ? hist[hist.length - 31] : hist[0];
    const delta = sc.total - Math.round(past);
    setTxt('#nvScoreDelta', (delta >= 0 ? '▲ +' : '▼ ') + U.fmt(delta, 0) + (fr() ? ' pts sur 30 jours' : ' pts over 30 days'));
    renderHeroKpis();
  }
  function renderHeroKpis() {
    const host = root.querySelector('#nvHeroKpis');
    if (!host) return;
    const r = State.cache.risks, sc = State.cache.sc;
    const keys = Object.keys(r);
    let top = keys[0];
    keys.forEach((k) => { if (r[k].p > r[top].p) top = k; });
    const mk = markovLight();
    const al = alerts(State.profile);
    host.innerHTML =
      UI.kpi({ label: fr() ? 'Risque dominant (10 ans)' : 'Dominant 10-y risk', value: U.pct(r[top].p * 100, 1), icon: '🎯', tone: r[top].band.tone, chip: r[top].label, hint: '<span class="nv-note">IC 90 % : ' + U.pct(r[top].ci[0] * 100, 1) + ' – ' + U.pct(r[top].ci[1] * 100, 1) + '</span>' }) +
      UI.kpi({ label: t('pred.healthyYears'), value: U.fmt(mk.healthyYears, 1), unit: '/10', icon: '🌿', tone: mk.healthyYears > 8 ? 'good' : mk.healthyYears > 6.5 ? 'warn' : 'risk', hint: '<span class="nv-note">' + U.pct(mk.healthyAt10 * 100, 0) + ' ' + (fr() ? 'des jumeaux sans diabète à 10 ans' : 'of twins diabetes-free at 10 y') + '</span>' }) +
      UI.kpi({ label: fr() ? 'Alertes actives' : 'Active alerts', value: String(al.length), icon: '🚨', tone: al.some((a) => a.tone === 'risk') ? 'risk' : al.length ? 'warn' : 'good', hint: '<span class="nv-note">' + U.esc(al.filter((a) => a.tone === 'risk').length + ' ' + (fr() ? 'prioritaires' : 'priority')) + '</span>' }) +
      UI.kpi({ label: t('hero.twin'), value: U.fmtInt(State.settings.trials), icon: '🧬', tone: 'info', hint: '<span class="nv-note">' + U.esc(t('hero.twinSub', { n: U.fmtInt(State.settings.trials) })) + '</span>' });
  }
  let markovCache = null, markovCacheKey = '';
  function markovLight() {
    const key = profileKey() + '|' + State.settings.trials;
    if (markovCache && markovCacheKey === key) return markovCache;
    markovCache = markovRun(State.profile, State.profile, 10, U.clamp(State.settings.trials, 200, 2000));
    markovCacheKey = key;
    return markovCache;
  }

  /* ---- KPI legacy (#bmi, #weight, #waist, #bp) -------------------------- */
  function renderLegacyKpis() {
    const p = State.profile, sc = State.cache.sc, d = State.cache.d;
    const bmiBand = refBand(REF.bmi, d.bmi);
    const bpBand = p.sbp ? REF.bp.filter((b) => U.num(p.sbp) < b.sys && U.num(p.dbp) < b.dia)[0] || REF.bp[REF.bp.length - 1] : null;
    const waistRef = REF.waist[d.female ? 'female' : 'male'];
    const waistTone = !U.num(p.waist) ? 'info' : p.waist >= waistRef.high ? 'risk' : p.waist >= waistRef.ok ? 'warn' : 'good';
    setTxt('#bmi', U.fmt(d.bmi, 1));
    setTxt('#weight', U.fmt(p.weight, 1) + ' kg');
    setTxt('#waist', U.num(p.waist) ? U.fmt(p.waist, 0) + ' cm' : '—');
    setTxt('#bp', U.num(p.sbp) && U.num(p.dbp) ? U.fmt(p.sbp, 0) + ' / ' + U.fmt(p.dbp, 0) : '—');
    setTxt('#bmiRef', (fr() ? 'Statut : ' : 'Status: ') + refLabel(bmiBand) + ' · ' + (fr() ? 'référence adulte 18,5–24,9 kg/m²' : 'adult reference 18.5–24.9 kg/m²'));
    setTxt('#weightRef', (fr() ? 'Cible : ' : 'Target: ') + U.fmt(18.5 * Math.pow(U.num(p.height, 170) / 100, 2), 1) + '–' + U.fmt(24.9 * Math.pow(U.num(p.height, 170) / 100, 2), 1) + ' kg (' + U.fmt(p.height, 0) + ' cm)');
    setTxt('#waistRef', (fr() ? 'Seuil ' : 'Threshold ') + (d.female ? '♀ 80 / 88 cm' : '♂ 94 / 102 cm') + ' · ' + (d.whr ? 'RTH ' + U.fmt(d.whr, 2) : ''));
    setTxt('#bpRef', bpBand ? (fr() ? 'Statut : ' : 'Status: ') + refLabel(bpBand) + ' · MAP ' + U.fmt(d.map, 0) + ' mmHg' : '—');
    const chips = [
      { key: 'bmi', tone: bmiBand.tone, text: refLabel(bmiBand) },
      { key: 'weight', tone: bmiBand.tone, text: U.fmt(d.bmi, 1) + ' kg/m²' },
      { key: 'waist', tone: waistTone, text: waistTone === 'good' ? (fr() ? 'Sous le seuil' : 'Below threshold') : waistTone === 'warn' ? (fr() ? 'Seuil atteint' : 'At threshold') : (fr() ? 'Risque élevé' : 'High risk') },
      { key: 'bp', tone: bpBand ? bpBand.tone : 'info', text: bpBand ? refLabel(bpBand) : '—' }
    ];
    chips.forEach((c) => {
      const card = root.querySelector('[data-nv-kpi="' + c.key + '"]');
      if (!card) return;
      const chip = card.querySelector('.nv-kpi-chip');
      if (chip) { chip.className = 'nv-chip nv-kpi-chip nv-chip-' + c.tone; chip.textContent = c.text; }
    });
    renderSparks(card_scopes_legacy());
  }
  function card_scopes_legacy() {
    const out = [];
    ['bmi', 'weight', 'waist', 'bp'].forEach((k) => { const c = root.querySelector('[data-nv-kpi="' + k + '"]'); if (c) out.push(c); });
    return out;
  }
  function renderSparks(scopes) {
    const nodes = [];
    (scopes && scopes.length ? scopes : [root]).forEach((s) => { U.qsa('[data-spark]', s).forEach((n) => nodes.push(n)); });
    nodes.forEach((host) => {
      let key = host.dataset.spark;
      if (!key) return;
      if (key.indexOf('x-') === 0) key = key.slice(2);
      if (key === 'none' || !SERIES_DEF[key]) return;
      const data = slice(key, 45);
      if (!data || data.length < 2) return;
      const first = data[0], last = data[data.length - 1];
      const up = key === 'score' || key === 'steps' || key === 'activityMin' || key === 'fruitVeg' || key === 'diversity' || key === 'sleep' || key === 'hemoglobin';
      const good = up ? last >= first : last <= first;
      CH.render(host, { type: 'sparkline', data: data, height: U.num(host.style.height, 30) || 30, color: good ? TH.tones.good : TH.tones.risk });
    });
  }

  /* ---- KPI additionnels -------------------------------------------------- */
  function renderExtraKpis() {
    const wrap = root.querySelector('#nvKpiExtra');
    if (!wrap) return;
    const p = State.profile, d = State.cache.d, it = State.cache.it;
    const fresh = extraKpis();
    if (wrap.dataset.built !== '1') { wrap.dataset.built = '1'; }
    wrap.innerHTML = fresh.map((k) => {
      const tone = k.band ? k.band.tone : 'info';
      return UI.kpi({
        label: k.label, value: k.value, unit: k.unit, icon: k.icon, tone: tone,
        chip: k.band ? refLabel(k.band) : k.ref,
        hint: '<span class="nv-note">' + U.esc(t('common.ref') + ' : ' + k.ref) + '</span>' +
          (k.series && SERIES_DEF[k.series] ? '<div class="nv-kpi-spark"><div class="nv-chart-host" data-spark="x-' + k.series + '" style="height:28px"></div></div>' : '')
      });
    }).join('');
    renderSparks([wrap]);
    /* indicateurs dérivés non présents dans les cartes */
    const extras = root.querySelector('#nvDerived');
    const derivedHtml = '<div class="nv-row nv-derived">' +
      UI.chip('MAP ' + U.fmt(d.map, 0) + ' mmHg', 'info') +
      UI.chip((fr() ? 'Pression pulsée ' : 'Pulse pressure ') + U.fmt(d.pp, 0) + ' mmHg', d.pp > 60 ? 'warn' : 'neutral') +
      UI.chip('BMR ' + U.fmtInt(d.bmr) + ' kcal', 'neutral') +
      UI.chip((fr() ? 'Besoin ' : 'Need ') + U.fmtInt(d.req.energy) + ' kcal/j', 'ok') +
      UI.chip((fr() ? 'Protéines cibles ' : 'Protein target ') + U.fmtInt(d.req.protein) + ' g/j', 'ok') +
      UI.chip((fr() ? 'Balance ' : 'Balance ') + U.signed((it.energy - d.req.energy), 0) + ' kcal', Math.abs(it.energy - d.req.energy) > 220 ? 'warn' : 'good') +
      UI.chip((it.source === 'journal' ? '📓 ' : '📝 ') + (it.source === 'journal' ? (fr() ? 'Journal du jour' : 'Today\'s journal') : (fr() ? 'Habitudes déclarées' : 'Declared habits')), it.source === 'journal' ? 'good' : 'warn') +
      '</div>';
    if (extras) extras.innerHTML = derivedHtml;
    else {
      const dv = document.createElement('div');
      dv.id = 'nvDerived';
      dv.innerHTML = derivedHtml;
      wrap.insertAdjacentElement('afterend', dv);
    }
  }

  /* ---- moteur de score --------------------------------------------------- */
  function renderScorePanel() {
    const sc = State.cache.sc, it = State.cache.it, req = State.cache.d.req;
    const colors = ['#38f0a5', '#22d3ee', '#a3e635', '#818cf8', '#f5c451'];
    mountChart('scoreRings', chartHost('scoreRings'), {
      type: 'rings', height: 216, thickness: 13, gap: 8,
      center: { value: sc.total + '', label: t('hero.globalScore') },
      items: sc.parts.map((p, i) => ({ label: p.label, value: p.score, max: 100, color: colors[i % colors.length], unit: '/100', valueLabel: p.label }))
    });
    setHtml('#nvRingLegend', sc.parts.map((p, i) =>
      '<div class="nv-rank"><i style="color:' + colors[i % colors.length] + '">●</i><span>' + U.esc(p.label) + '</span><b>' + p.score + '</b><em class="nv-note">' + Math.round(p.weight * 100) + '%</em></div>').join(''));
    const details = {
      anthro: ['BMI ' + U.fmt(State.cache.d.bmi, 1), (fr() ? 'Taille ' : 'Waist ') + U.fmt(State.profile.waist, 0) + ' cm', 'RTH ' + U.fmt(State.cache.d.whr || 0, 2)],
      metabolic: ['Glycémie ' + U.fmt(State.profile.glucose, 0), 'HbA1c ' + U.fmt(State.profile.hba1c, 1) + '%', 'PA ' + U.fmt(State.profile.sbp, 0) + '/' + U.fmt(State.profile.dbp, 0)],
      diet: [(fr() ? 'Diversité ' : 'Diversity ') + U.fmt(it.diversity, 1) + '/10', (fr() ? 'Fibres ' : 'Fibre ') + U.fmt(it.fiber, 0) + ' g', 'Na ' + U.fmtInt(it.sodium) + ' mg', 'UPF ' + U.fmtInt(State.profile.upf) + '%'],
      lifestyle: [(fr() ? 'Activité ' : 'Activity ') + U.fmtInt(State.profile.activityMin) + ' min', (fr() ? 'Sommeil ' : 'Sleep ') + U.fmt(State.profile.sleep, 1) + ' h', (fr() ? 'Eau ' : 'Water ') + U.fmt(State.profile.water, 1) + ' L'],
      data: [State.journal.length + (fr() ? ' entrées' : ' entries'), (fr() ? 'Complétude ' : 'Completeness ') + completeness(State.profile).pct + '%']
    };
    setHtml('#nvScoreParts', sc.parts.map((p, i) =>
      '<div class="nv-score-part" data-part="' + p.key + '">' +
        UI.meter({ label: p.label, value: p.score, text: p.score + '/100', color: colors[i % colors.length], marker: 70, markerLabel: (fr() ? 'Cible' : 'Target') }) +
        '<div class="nv-row">' + (details[p.key] || []).map((d) => '<span class="nv-chip">' + U.esc(d) + '</span>').join('') + '</div>' +
      '</div>').join(''));
    /* radar d'adéquation */
    const keys = ['energy', 'protein', 'fiber', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium'];
    const labels = { energy: fr() ? 'Énergie' : 'Energy', protein: fr() ? 'Protéines' : 'Protein', fiber: fr() ? 'Fibres' : 'Fibre', iron: 'Fer', vitA: 'Vit. A', vitC: 'Vit. C', calcium: 'Calcium', zinc: 'Zinc', folate: 'Folate', potassium: 'Potassium' };
    const cov = keys.map((k) => ({ k: k, pct: req[k] ? U.clamp((it[k] || 0) / req[k] * 100, 0, 165) : 0, v: it[k] || 0, r: req[k] }));
    mountChart('adequacyRadar', chartHost('adequacyRadar'), {
      type: 'radar', height: 250, rings: 4,
      axes: cov.map((c) => ({ label: labels[c.k], max: 160, ref: U.fmt(c.v, 0) + ' / ' + U.fmtInt(c.r) })),
      series: [
        { name: fr() ? 'Vos apports' : 'Your intake', data: cov.map((c) => c.pct), color: '#a3e635' },
        { name: fr() ? 'Cible 100 %' : '100% target', data: keys.map(() => 100), color: '#22d3ee', fill: false }
      ],
      y: { format: (v) => U.fmt(v, 0) + '%' }
    });
    const low = cov.filter((c) => c.pct < 82), high = cov.filter((c) => c.pct > 135);
    setHtml('#nvAdequacyList',
      (low.length ? '<div class="nv-row">' + low.map((c) => UI.chip('▼ ' + labels[c.k] + ' ' + U.fmt(c.pct, 0) + '%', 'warn')).join('') + '</div>' : '') +
      (high.length ? '<div class="nv-row">' + high.map((c) => UI.chip('▲ ' + labels[c.k] + ' ' + U.fmt(c.pct, 0) + '%', c.k === 'energy' ? 'warn' : 'info')).join('') + '</div>' : '') +
      (!low.length && !high.length ? '<div class="nv-row">' + UI.chip(fr() ? 'Couverture équilibrée' : 'Balanced coverage', 'good') + '</div>' : '') +
      '<div class="nv-note" style="margin-top:6px">' + U.esc(fr() ? 'Source des apports : ' : 'Intake source: ') + (it.source === 'journal' ? (fr() ? 'journal du jour' : 'today\'s journal') : (fr() ? 'habitudes déclarées (remplissez le journal pour affiner)' : 'declared habits (fill the journal to refine)')) + '</div>');
  }

  /* ---- graphiques de tendances (cartes existantes) ----------------------- */
  function compactDate(d) { return String(d.getDate()).padStart(2, '0') + ' ' + U.monthLabel(d); }
  function trendLabels(days) { return sliceDates(days).map(compactDate); }
  function renderTrendCharts() {
    const days = U.clamp(U.num(State.settings.period, 90), 7, 400);
    const p = State.profile, req = State.cache.d.req;
    /* anthropométrie */
    const targetW = U.num(p.weight, 70) * (1 + U.num(State.scenario.weightPct, 0) / 100);
    mountChart('anthro', chartHost('anthro'), {
      type: 'line', height: 262, labels: trendLabels(days),
      series: [
        { name: t('kpi.weight') + ' (kg)', data: slice('weight', days), color: '#38f0a5', fill: true, width: 2.6, points: false },
        { name: 'BMI (kg/m²)', data: slice('bmi', days), color: '#22d3ee', axis: 'y2', width: 2, points: false },
        { name: (fr() ? 'Taille (cm)' : 'Waist (cm)'), data: slice('waist', days), color: '#f5c451', axis: 'y2', width: 1.6, dash: '5 4', points: false, lastLabel: false }
      ],
      y: { unit: 'kg', digits: 1 }, y2: { digits: 1 },
      goal: Math.abs(U.num(State.scenario.weightPct, 0)) > 0.4 ? { value: targetW, label: (fr() ? 'Cible scénario ' : 'Scenario target ') + U.fmt(targetW, 1) + ' kg' } : null
    });
    /* métabolique & clinique */
    mountChart('clinical', chartHost('clinical'), {
      type: 'line', height: 262, labels: trendLabels(days),
      series: [
        { name: t('kpi.glucose') + ' (mg/dL)', data: slice('glucose', days), color: '#f5c451', fill: true, width: 2.4, points: false },
        { name: 'PAS (mmHg)', data: slice('sbp', days), color: '#fb7185', axis: 'y2', width: 2, points: false },
        { name: 'PAD (mmHg)', data: slice('dbp', days), color: '#818cf8', axis: 'y2', width: 1.6, dash: '5 4', points: false, lastLabel: false }
      ],
      zones: [
        { from: 70, to: 100, color: '#38f0a5', label: '70–100' },
        { from: 100, to: 126, color: '#f5c451', label: '100–126' },
        { from: 126, to: 260, color: '#fb7185', label: '> 126' }
      ],
      y: { unit: 'mg/dL', digits: 0 }, y2: { unit: 'mmHg', digits: 0 }
    });
    /* paramètres cliniques liés à la nutrition (indices 0–160) */
    const div = slice('diversity', days), fv = slice('fruitVeg', days), na = slice('sodiumMg', days), upf = slice('upf', days), en = slice('energy', days);
    mountChart('nutriClin', chartHost('nutriClin'), {
      type: 'line', height: 262, labels: trendLabels(days),
      series: [
        { name: (fr() ? 'Diversité' : 'Diversity'), data: div.map((v) => U.clamp(v * 10, 0, 160)), color: '#a3e635', width: 2.2, points: false },
        { name: (fr() ? 'Fruits & légumes' : 'Fruit & veg'), data: fv.map((v) => U.clamp(v * 20, 0, 160)), color: '#38f0a5', width: 2, points: false },
        { name: (fr() ? 'Maîtrise du sodium' : 'Sodium control'), data: na.map((v) => U.clamp((2000 / Math.max(300, v)) * 100, 0, 160)), color: '#22d3ee', width: 1.8, points: false },
        { name: (fr() ? 'Aliments bruts' : 'Whole foods'), data: upf.map((v) => U.clamp(100 - v, 0, 160)), color: '#818cf8', width: 1.8, dash: '5 4', points: false },
        { name: (fr() ? 'Équilibre énergétique' : 'Energy balance'), data: en.map((v) => U.clamp((req.energy / Math.max(400, v)) * 100, 0, 160)), color: '#f5c451', width: 1.6, dash: '2 4', points: false, lastLabel: false }
      ],
      zones: [{ from: 85, to: 125, color: '#38f0a5', label: (fr() ? 'Cible 85–125 %' : 'Target 85–125%') }],
      y: { format: (v) => U.fmt(v, 0) + '%', digits: 0 }
    });
  }

  /* ---- comparaison aux références (#referenceCards conservé) ------------- */
  function refItems() {
    const p = State.profile, d = State.cache.d, it = State.cache.it, req = d.req;
    return [
      { key: 'bmi', label: 'IMC', value: d.bmi, unit: 'kg/m²', lo: 18.5, hi: 24.9, digits: 1 },
      { key: 'waist', label: fr() ? 'Tour de taille' : 'Waist', value: p.waist, unit: 'cm', lo: d.female ? 68 : 76, hi: d.female ? 80 : 94, digits: 0 },
      { key: 'whr', label: fr() ? 'Taille / hanches' : 'Waist / hip', value: d.whr, unit: '', lo: 0.72, hi: d.female ? 0.85 : 0.9, digits: 2 },
      { key: 'sbp', label: 'PAS', value: p.sbp, unit: 'mmHg', lo: 95, hi: 120, digits: 0 },
      { key: 'dbp', label: 'PAD', value: p.dbp, unit: 'mmHg', lo: 60, hi: 80, digits: 0 },
      { key: 'glucose', label: fr() ? 'Glycémie à jeun' : 'Fasting glucose', value: p.glucose, unit: 'mg/dL', lo: 70, hi: 99, digits: 0 },
      { key: 'hba1c', label: 'HbA1c', value: p.hba1c, unit: '%', lo: 4.5, hi: 5.6, digits: 1 },
      { key: 'chol', label: fr() ? 'Cholestérol total' : 'Total cholesterol', value: p.chol, unit: 'mg/dL', lo: 140, hi: 199, digits: 0 },
      { key: 'egfr', label: 'DFG', value: d.egfr, unit: 'mL/min', lo: 90, hi: 130, digits: 0, inverse: true },
      { key: 'fiber', label: fr() ? 'Fibres' : 'Fibre', value: it.fiber, unit: 'g', lo: req.fiber * 0.9, hi: req.fiber * 1.5, digits: 0 },
      { key: 'sodium', label: 'Sodium', value: it.sodium, unit: 'mg', lo: 1200, hi: 2000, digits: 0, inverse: true }
    ].filter((x) => isFinite(U.num(x.value, NaN)));
  }
  function refStatus(x) {
    const v = U.num(x.value);
    if (x.inverse) return v >= x.hi ? 'good' : v >= x.lo ? 'ok' : v >= x.lo * 0.7 ? 'warn' : 'risk';
    return v >= x.lo && v <= x.hi ? 'good' : (v < x.lo ? 'warn' : v <= x.hi * 1.18 ? 'warn' : 'risk');
  }
  function renderReference() {
    const items = refItems();
    const host = root.querySelector('#referenceCards');
    if (host) {
      host.innerHTML = items.map((x) => {
        const tone = refStatus(x);
        const spanLo = x.lo * 0.72, spanHi = x.hi * 1.32;
        const pos = U.clamp(((U.num(x.value) - spanLo) / (spanHi - spanLo)) * 100, 0, 100);
        const zLo = ((x.lo - spanLo) / (spanHi - spanLo)) * 100, zHi = ((x.hi - spanLo) / (spanHi - spanLo)) * 100;
        return '<div class="nv-ref-card" data-tone="' + tone + '">' +
          '<div class="nv-ref-head"><span>' + U.esc(x.label) + '</span><b>' + U.fmt(x.value, x.digits) + ' <small>' + U.esc(x.unit) + '</small></b></div>' +
          '<div class="nv-ref-track"><i style="left:' + U.fmt(zLo, 1) + '%;width:' + U.fmt(Math.max(2, zHi - zLo), 1) + '%"></i><u style="left:' + U.fmt(pos, 1) + '%"></u></div>' +
          '<div class="nv-ref-foot"><span>' + U.esc(t('common.ref') + ' : ' + (x.inverse ? '≥ ' : '') + U.fmt(x.lo, x.digits) + '–' + U.fmt(x.hi, x.digits) + ' ' + x.unit) + '</span>' +
          '<span class="nv-chip nv-chip-' + tone + '">' + U.esc(tone === 'good' ? t('status.optimal') : tone === 'ok' ? t('status.optimal') : tone === 'warn' ? t('status.watch') : t('status.high')) + '</span></div></div>';
      }).join('');
    }
    const mid = items.map((x) => {
      const m = (x.lo + x.hi) / 2, v = U.num(x.value);
      return x.inverse ? ((m - v) / m) * 100 : ((v - m) / m) * 100;
    });
    mountChart('refBars', chartHost('refBars'), {
      type: 'bars', horizontal: true, diverging: true, height: Math.max(170, items.length * 26 + 26),
      labels: items.map((x) => x.label),
      series: [{ name: fr() ? 'Écart à la référence' : 'Deviation from reference', data: mid.map((v) => Math.round(v * 10) / 10), colors: mid.map((v) => Math.abs(v) < 12 ? TH.tones.good : Math.abs(v) < 30 ? TH.tones.warn : TH.tones.risk) }],
      valueFormat: (v) => U.signed(v, 0) + '%',
      y: { digits: 0 }, showValues: true, barHeight: 13
    });
  }

  /* ---- laboratoire de prédiction ---------------------------------------- */
  function futureLabels(months) {
    const out = [];
    const now = new Date();
    for (let i = 1; i <= months; i++) {
      const d = U.addMonths(now, i);
      out.push(U.monthLabel(d) + (d.getMonth() === 0 ? ' ' + d.getFullYear() : ''));
    }
    return out;
  }
  function thresholdFor(key) {
    return { glucose: 126, hba1c: 6.5, sbp: 140, weight: null, bmi: 30, waist: null, score: null }[key];
  }
  function renderPred() {
    const p = State.profile, v = predVar(State.settings.predVar);
    const H = U.clamp(U.num(State.settings.horizon, 24), 3, 60);
    const useSc = State.settings.predScenario !== false;
    const f = forecastVar(v.id, H, false);
    const fSc = useSc ? forecastVar(v.id, H, true) : null;
    const labels = f.labels.concat(futureLabels(H));
    const past = f.past.concat(new Array(H).fill(null));
    const bridge = new Array(f.past.length - 1).fill(null).concat([f.past[f.past.length - 1]]);
    const series = [
      { name: (fr() ? 'Historique ' : 'History ') + predVarLabel(v), data: past, color: '#38f0a5', fill: true, width: 2.6, points: false },
      { name: 'P50' + (useSc ? ' (' + (fr() ? 'sans action' : 'no action') + ')' : ''), data: bridge.concat(f.fc.point), color: '#22d3ee', dash: '6 4', width: 2.2, points: false }
    ];
    if (fSc) series.push({ name: 'P50 ' + t('common.scenario'), data: bridge.concat(fSc.fc.point), color: '#a3e635', dash: '2 4', width: 2.4, points: false });
    mountChart('forecast', chartHost('forecast'), {
      type: 'line', height: 288, labels: labels, series: series,
      cone: { p10: f.fc.p10, p90: f.fc.p90, p25: f.fc.p25, p75: f.fc.p75, start: f.past.length - 1, color: '#22d3ee' },
      splitAt: f.past.length - 1, splitLabel: fr() ? 'Prévision IA' : 'AI forecast',
      y: { unit: v.unit, digits: v.digits },
      goal: thresholdFor(v.id) != null ? { value: thresholdFor(v.id), label: (fr() ? 'Seuil clinique ' : 'Clinical threshold ') + thresholdFor(v.id) } : null
    });
    /* méta-données de prévision */
    const last = f.past[f.past.length - 1];
    const endP = f.fc.point[H - 1], endS = fSc ? fSc.fc.point[H - 1] : endP;
    const thr = thresholdFor(v.id);
    let pThr = null;
    if (thr != null) {
      const paths = (fSc || f).fc.paths;
      pThr = paths.filter((pa) => pa.some((x) => x >= thr)).length / Math.max(1, paths.length);
    }
    setHtml('#nvForecastMeta',
      '<div class="nv-row">' +
        UI.chip((fr() ? 'Aujourd\'hui ' : 'Today ') + U.fmt(last, v.digits) + ' ' + v.unit, 'good') +
        UI.chip('P50 → ' + U.fmt(endP, v.digits) + ' ' + v.unit + ' (' + U.signed(((endP - last) / (Math.abs(last) || 1)) * 100, 1) + '%)', 'info') +
        (fSc ? UI.chip((fr() ? 'Scénario → ' : 'Scenario → ') + U.fmt(endS, v.digits) + ' ' + v.unit, 'ok') : '') +
        UI.chip('IC 80 % : ' + U.fmt(f.fc.p10[H - 1], v.digits) + ' – ' + U.fmt(f.fc.p90[H - 1], v.digits), 'neutral') +
        (pThr != null ? UI.chip((fr() ? 'P(seuil franchi) ' : 'P(threshold crossed) ') + U.pct(pThr * 100, 0), pThr > 0.4 ? 'risk' : pThr > 0.18 ? 'warn' : 'good') : '') +
        UI.chip(U.fmtInt(f.fc.trials) + ' ' + (fr() ? 'trajectoires' : 'trajectories'), 'neutral') +
      '</div>' +
      '<div class="nv-note">' + U.esc((fr() ? 'Moteur : lissage de Holt à tendance amortie + résidus bootstrap (φ = 0,86). Dérive de scénario appliquée : '
        : 'Engine: damped-trend Holt smoothing + bootstrap residuals (φ = 0.86). Scenario drift applied: ') + U.fmt(scenarioDrift(v.id), 3) + ' / ' + (fr() ? 'mois.' : 'month.')) + '</div>');
    setTxt('#nvForecastSub', t('pred.forecastSub') + ' · ' + predVarLabel(v) + ' · ' + t('pred.months', { n: H }));
    renderRiskList();
    renderMarkov();
    renderAnomalies();
  }
  function renderRiskList() {
    const host = root.querySelector('#nvRiskList');
    if (!host) return;
    const r = State.cache.risks;
    const sel = State.settings.riskSel || 't2d';
    const icons = { t2d: '🩸', htn: '❤️', cvd: '🫀', anemia: '🧬', obesity: '⚖️' };
    host.innerHTML = Object.keys(r).map((k) => {
      const x = r[k];
      return '<button class="nv-item nv-risk-item' + (k === sel ? ' sel' : '') + '" data-nv-action="risk-select" data-nv-arg="' + k + '" data-tone="' + x.band.tone + '">' +
        '<span class="nv-item-icon">' + icons[k] + '</span>' +
        '<span class="nv-item-body"><span class="nv-item-title">' + U.esc(x.label) + '</span>' +
        '<span class="nv-meter nv-meter-compact"><span class="nv-meter-track"><i style="width:' + U.clamp(x.p * 100 * 1.6, 2, 100) + '%;background:' + TH.tone(x.band.tone === 'good' ? 'good' : x.band.tone === 'ok' ? 'ok' : x.band.tone === 'warn' ? 'warn' : 'risk') + '"></i></span></span>' +
        '<span class="nv-item-text">IC 90 % ' + U.pct(x.ci[0] * 100, 1) + ' – ' + U.pct(x.ci[1] * 100, 1) + '</span></span>' +
        '<span class="nv-item-side"><b>' + U.pct(x.p * 100, 1) + '</b><span class="nv-chip nv-chip-' + x.band.tone + '">' + U.esc(x.band.label) + '</span></span>' +
        '</button>';
    }).join('');
    renderAttribution();
  }
  function renderAttribution() {
    const r = State.cache.risks;
    const sel = State.settings.riskSel || 't2d';
    const x = r[sel] || r.t2d;
    setTxt('#nvAttrTitle', x.label);
    const l0 = S.logit(x.p0 == null ? x.p : x.p0);
    const contrib = x.contributions.slice()
      .map((c) => ({ label: c.label, pp: (S.sigmoid(l0 + c.delta) - x.p) * 100 }))
      .sort((a, b) => Math.abs(b.pp) - Math.abs(a.pp))
      .slice(0, 9);
    mountChart('attr', chartHost('attr'), {
      type: 'bars', horizontal: true, diverging: true, height: Math.max(150, contrib.length * 25 + 24),
      labels: contrib.map((c) => c.label),
      series: [{
        name: (fr() ? 'Impact' : 'Impact'), data: contrib.map((c) => Math.round(c.pp * 100) / 100),
        colors: contrib.map((c) => c.pp > 0 ? TH.tones.risk : TH.tones.good)
      }],
      valueFormat: (v) => U.signed(v, 1) + ' pts', barHeight: 12, y: { digits: 1 }
    });
  }
  function renderMarkov() {
    const useSc = State.settings.predScenario !== false;
    const sp = useSc ? scenarioProfile() : State.profile;
    const run = markovRun(State.profile, sp, 10, U.clamp(State.settings.trials, 200, 3000));
    const colors = ['#38f0a5', '#a3e635', '#f5c451', '#fb7185', '#818cf8'];
    mountChart('markov', chartHost('markov'), {
      type: 'stackedArea', height: 264, labels: run.labels,
      series: MARKOV_STATES.map((s, i) => ({
        name: t(s), color: colors[i],
        data: run.dists.map((d) => Math.round(d[i] * 1000) / 10)
      })),
      y: { digits: 0 }, reverse: true
    });
    setHtml('#nvMarkovLegend', MARKOV_STATES.map((s, i) => '<span><i style="background:' + colors[i] + '"></i>' + U.esc(t(s)) + ' · ' + U.fmt(run.dists[10][i] * 100, 0) + '%</span>').join(''));
    const annual = 1 - Math.pow(1 - U.clamp(State.cache.risks.t2d.p, 0.001, 0.95), 1 / 10);
    setHtml('#nvMarkovKpis',
      UI.kpi({ label: t('pred.healthyYears'), value: U.fmt(run.healthyYears, 2), unit: '/10', tone: run.healthyYears > 8 ? 'good' : run.healthyYears > 6.5 ? 'warn' : 'risk', icon: '🌿' }) +
      UI.kpi({ label: fr() ? 'Sans diabète à 10 ans' : 'Diabetes-free at 10 y', value: U.pct(run.healthyAt10 * 100, 0), tone: run.healthyAt10 > 0.8 ? 'good' : run.healthyAt10 > 0.55 ? 'warn' : 'risk', icon: '🛡️' }) +
      UI.kpi({ label: fr() ? 'Progression annuelle' : 'Annual progression', value: U.pct(annual * 100, 2), tone: annual > 0.03 ? 'risk' : annual > 0.015 ? 'warn' : 'good', icon: '📈' }) +
      UI.kpi({ label: fr() ? 'État actuel' : 'Current state', value: t(MARKOV_STATES[run.start]).split(' ')[0], tone: run.start <= 1 ? 'good' : run.start === 2 ? 'warn' : 'risk', icon: '📍' }));
    setTxt('#nvMarkovSub', t('pred.markovSub', { n: U.fmtInt(run.trials), y: run.years }) + ' · ' + (useSc ? t('common.scenario') : (fr() ? 'trajectoire actuelle' : 'current trajectory')));
    setTxt('#nvMarkovNote', (fr() ? 'Poids de santé : sain 1,00 · à risque 0,93 · prédiabète 0,76 · diabète 0,50 · complications 0,22. Matrice recalculée depuis vos risques et votre adhésion au plan.'
      : 'Health weights: healthy 1.00 · at risk 0.93 · prediabetes 0.76 · diabetes 0.50 · complications 0.22. Matrix recomputed from your risks and plan adherence.'));
  }
  function renderAnomalies() {
    const host = root.querySelector('#nvAnomalyList');
    if (!host) return;
    const a = anomalies();
    if (!a.length) {
      host.innerHTML = '<div class="nv-item" data-tone="good"><span class="nv-item-icon">✅</span><div class="nv-item-body"><div class="nv-item-title">' + U.esc(fr() ? 'Aucune anomalie détectée' : 'No anomaly detected') + '</div><div class="nv-item-text">' + U.esc(fr() ? 'Vos séries sont stables sur les 45 derniers jours.' : 'Your series are stable over the last 45 days.') + '</div></div></div>';
      return;
    }
    host.innerHTML = a.map((x) => '<div class="nv-item" data-tone="' + x.tone + '"><span class="nv-item-icon">' + x.icon + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(x.title) + '</div><div class="nv-item-text">' + U.esc(x.text) + '</div></div>' +
      '<div class="nv-item-side"><b>' + U.fmt(x.z, 1) + 'σ</b><span>' + U.esc(fr() ? 'écart' : 'deviation') + '</span></div></div>').join('');
  }

  /* ---- simulateur de scénarios ------------------------------------------ */
  let simCache = null, simCacheKey = '';
  function simOutcomes() {
    const key = JSON.stringify(State.scenario) + profileKey();
    if (simCache && simCacheKey === key) return simCache;
    simCache = scenarioOutcomes();
    simCacheKey = key;
    return simCache;
  }
  function renderSim() {
    const o = simOutcomes();
    const s = State.scenario;
    /* KPI d'impact */
    const host = root.querySelector('#nvSimKpis');
    if (host) {
      host.innerHTML =
        UI.kpi({ label: t('sim.out.score'), value: U.signed(o.score.delta, 0), unit: 'pts', icon: '🧬', tone: o.score.delta > 1 ? 'good' : o.score.delta < -1 ? 'risk' : 'info', chip: o.score.scen + '/100', hint: '<span class="nv-note">' + U.esc(bandLabel(o.score.band)) + ' ← ' + U.esc(bandLabel(o.score.baseBand)) + '</span>' }) +
        UI.kpi({ label: t('sim.out.years'), value: U.signed(o.healthyYears.delta, 2), unit: (fr() ? 'ans' : 'y'), icon: '🌿', tone: o.healthyYears.delta > 0.15 ? 'good' : o.healthyYears.delta < -0.1 ? 'risk' : 'info', hint: '<span class="nv-note">' + U.fmt(o.healthyYears.base, 2) + ' → ' + U.fmt(o.healthyYears.scen, 2) + '</span>' }) +
        UI.kpi({ label: t('sim.out.cost'), value: o.cost.local, icon: '💰', tone: o.cost.usd > 50 ? 'good' : 'info', hint: '<span class="nv-note">$' + U.fmtInt(o.cost.usd) + ' · ' + U.esc(countryName()) + '</span>' }) +
        UI.kpi({ label: t('sim.out.days'), value: U.fmtInt(o.cost.days), unit: (fr() ? 'jours' : 'days'), icon: '📆', tone: o.cost.days > 5 ? 'good' : 'info' }) +
        UI.kpi({ label: t('sim.out.footprint'), value: U.signed(o.footprint.delta, 0), unit: 'kg CO₂e', icon: '🌍', tone: o.footprint.delta < -5 ? 'good' : o.footprint.delta > 5 ? 'risk' : 'info', hint: '<span class="nv-note">' + U.fmt(o.footprint.base, 0) + ' → ' + U.fmt(o.footprint.scen, 0) + ' kg/an</span>' }) +
        UI.kpi({ label: fr() ? 'Panier alimentaire' : 'Food basket', value: '$' + U.fmt(o.basket.base, 2), unit: '/j', icon: '🧺', tone: 'neutral', hint: '<span class="nv-note">' + U.esc(fr() ? 'dont bio local ' : 'incl. local organic ') + U.fmtInt(s.organic) + '%</span>' });
    }
    /* deltas de risque */
    const keys = ['t2d', 'htn', 'cvd', 'anemia', 'obesity'];
    const labels = { t2d: t('risk.t2d'), htn: t('risk.htn'), cvd: t('risk.cvd'), anemia: t('risk.anemia'), obesity: t('risk.obesity') };
    mountChart('simDelta', chartHost('simDelta'), {
      type: 'bars', horizontal: true, diverging: true, height: 186,
      labels: keys.map((k) => labels[k]),
      series: [{
        name: fr() ? 'Variation du risque (points)' : 'Risk change (points)',
        data: keys.map((k) => Math.round(o.risks.deltas[k] * 100) / 100),
        colors: keys.map((k) => o.risks.deltas[k] < 0 ? TH.tones.good : TH.tones.risk)
      }],
      valueFormat: (v) => U.signed(v, 1) + ' pts', barHeight: 13
    });
    /* comparaison de trajectoires */
    const v = predVar(State.settings.predVar);
    const H = U.clamp(U.num(State.settings.horizon, 24), 3, 60);
    const fB = forecastVar(v.id, H, false), fS = forecastVar(v.id, H, true);
    const br = new Array(fB.past.length - 1).fill(null).concat([fB.past[fB.past.length - 1]]);
    mountChart('simCompare', chartHost('simCompare'), {
      type: 'line', height: 210, labels: fB.labels.concat(futureLabels(H)),
      series: [
        { name: (fr() ? 'Historique' : 'History'), data: fB.past.concat(new Array(H).fill(null)), color: '#38f0a5', fill: true, width: 2.4, points: false },
        { name: t('preset.base'), data: br.concat(fB.fc.point), color: '#fb7185', dash: '6 4', width: 2, points: false },
        { name: t('common.scenario'), data: br.concat(fS.fc.point), color: '#a3e635', width: 2.6, points: false }
      ],
      y: { unit: v.unit, digits: v.digits }
    });
    /* volet agriculture bio : la demande citoyenne oriente l'offre */
    const supply = organicSupply();
    const demand = U.clamp(U.num(s.organic, 30) / 100, 0, 1);
    const weeklyUsd = 12 + demand * 26;
    const box = root.querySelector('#nvOrganicBox');
    if (box) {
      box.innerHTML = '<h4>🌱 ' + U.esc(t('sim.organic')) + '</h4>' +
        '<p class="nv-sub">' + U.esc(t('sim.organicSub')) + '</p>' +
        UI.meter({ label: fr() ? 'Votre demande bio' : 'Your organic demand', value: demand * 100, text: U.pct(demand * 100, 0), color: TH.tones.good, marker: supply * 100, markerLabel: fr() ? 'Offre nationale' : 'National supply' }) +
        UI.meter({ label: fr() ? 'Offre bio tracée — ' + countryName() : 'Traceable organic supply — ' + countryName(), value: supply * 100, text: U.pct(supply * 100, 0), color: TH.tones.info }) +
        '<div class="nv-row">' +
          UI.chip((fr() ? 'Dépense hebdo estimée chez les producteurs bio : ' : 'Est. weekly spend with organic farms: ') + money(weeklyUsd), 'good') +
          UI.chip(demand > supply ? (fr() ? 'Signal de demande > offre → opportunité agricole' : 'Demand signal > supply → farming opportunity') : (fr() ? 'Offre suffisante' : 'Supply sufficient'), demand > supply ? 'warn' : 'ok') +
        '</div>' +
        '<div class="nv-row" style="margin-top:6px">' + UI.btn(fr() ? 'Voir l\'intelligence agricole' : 'Open agriculture intelligence', { action: 'goto', arg: 'agri', icon: '🌾', kind: 'ghost' }) + '</div>';
    }
    /* synchronise les libellés des curseurs */
    LEVERS.concat([{ key: 'alcohol', dec: 0, unit: ' u' }]).forEach((lv) => {
      const out = root.querySelector('#nvLev-' + lv.key + '-out');
      const inp = root.querySelector('#nvLev-' + lv.key);
      if (out && inp) out.textContent = U.fmt(U.num(inp.value, 0), lv.dec || 0) + (lv.unit || '');
    });
  }

  /* ---- journal ----------------------------------------------------------- */
  let chipsCountry = '';
  function renderJournal() {
    const code = countryCode();
    const host = root.querySelector('#nvFoodChips');
    if (host && chipsCountry !== code) {
      chipsCountry = code;
      const pool = foodsFor(code);
      const groups = ['cereals', 'tubers', 'legumes', 'oilseeds', 'veg', 'fruit', 'animal', 'oils', 'special', 'processed', 'upf'];
      const names = {
        cereals: fr() ? 'Céréales' : 'Cereals', tubers: fr() ? 'Tubercules' : 'Tubers', legumes: fr() ? 'Légumineuses' : 'Legumes',
        oilseeds: fr() ? 'Oléagineux' : 'Oilseeds', veg: fr() ? 'Légumes' : 'Vegetables', fruit: fr() ? 'Fruits' : 'Fruits',
        animal: fr() ? 'Animal' : 'Animal-source', oils: fr() ? 'Matières grasses' : 'Fats & oils', special: fr() ? 'Aliments enrichis' : 'Fortified',
        processed: fr() ? 'Transformés' : 'Processed', upf: fr() ? 'Ultra-transformés' : 'Ultra-processed'
      };
      host.innerHTML = groups.map((gk) => {
        const list = pool.filter((f) => f.group === gk);
        if (!list.length) return '';
        return '<div class="nv-foodgroup"><span class="nv-foodgroup-label">' + U.esc(names[gk]) + '</span><div class="nv-row">' +
          list.map((f) => '<button class="nv-foodchip' + (inSeason(f) ? '' : ' off-season') + (f.upf ? ' upf' : '') + '" data-nv-action="journal-add" data-nv-arg="' + f.id + '" title="' + U.esc(foodName(f) + ' · ' + f.kcal + ' kcal/100g · $' + f.price + '/kg' + (inSeason(f) ? '' : (fr() ? ' · hors saison' : ' · out of season'))) + '">' +
            '<i>' + f.icon + '</i><span>' + U.esc(foodName(f)) + '</span><small>' + f.kcal + '</small></button>').join('') + '</div></div>';
      }).join('');
    }
    renderJournalList();
    renderJournalIntake();
    renderAdherence();
  }
  function renderJournalList() {
    const host = root.querySelector('#nvJournalList');
    if (!host) return;
    const entries = journalFor();
    if (!entries.length) {
      host.innerHTML = '<div class="nv-item" data-tone="info"><span class="nv-item-icon">📓</span><div class="nv-item-body"><div class="nv-item-title">' + U.esc(t('journal.empty')) + '</div><div class="nv-item-text">' + U.esc(t('journal.sub')) + '</div></div></div>';
      return;
    }
    host.innerHTML = entries.slice().reverse().map((e) => {
      const f = FOOD_BY_ID[e.food];
      if (!f) return '';
      const k = e.grams / 100;
      return '<div class="nv-item"><span class="nv-item-icon">' + f.icon + '</span>' +
        '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(foodName(f)) + ' · ' + U.fmtInt(e.grams) + ' g</div>' +
        '<div class="nv-item-text">' + U.esc(t('slot.' + e.slot)) + ' · ' + U.fmtInt(f.kcal * k) + ' kcal · P ' + U.fmt(f.protein * k, 1) + ' g · Na ' + U.fmtInt(f.sodium * k) + ' mg' +
        (e.organic ? ' · 🌱 ' + (fr() ? 'bio' : 'organic') : '') + '</div></div>' +
        '<div class="nv-item-side"><b>' + U.fmtInt(f.kcal * k) + '</b><span>kcal</span>' +
        '<button class="nv-btn sm ghost" data-nv-action="journal-remove" data-nv-arg="' + e.ts + '" style="margin-top:4px">✕</button></div></div>';
    }).join('');
  }
  function renderJournalIntake() {
    const it = intake(State.profile), req = requirements(State.profile);
    const pKcal = it.protein * 4, fKcal = it.fat * 9, cKcal = it.carb * 4;
    const tot = Math.max(1, pKcal + fKcal + cKcal);
    mountChart('macroDonut', chartHost('macroDonut'), {
      type: 'donut', height: 190, thickness: 0.34,
      slices: [
        { label: fr() ? 'Glucides' : 'Carbs', value: cKcal, color: '#a3e635' },
        { label: fr() ? 'Protéines' : 'Protein', value: pKcal, color: '#38f0a5' },
        { label: fr() ? 'Lipides' : 'Fat', value: fKcal, color: '#f5c451' }
      ],
      center: { value: U.fmtInt(it.energy), label: 'kcal' },
      valueLabel: fr() ? 'Énergie' : 'Energy', valueFormat: (v) => U.fmtInt(v) + ' kcal'
    });
    const host = root.querySelector('#nvIntakeList');
    if (!host) return;
    const rows = [
      { k: 'energy', label: t('plan.energy'), unit: 'kcal', v: it.energy, r: req.energy, digits: 0, inverse: false },
      { k: 'protein', label: fr() ? 'Protéines' : 'Protein', unit: 'g', v: it.protein, r: req.protein, digits: 0 },
      { k: 'fiber', label: fr() ? 'Fibres' : 'Fibre', unit: 'g', v: it.fiber, r: req.fiber, digits: 0 },
      { k: 'iron', label: 'Fer', unit: 'mg', v: it.iron, r: req.iron, digits: 1 },
      { k: 'vitA', label: 'Vitamine A', unit: 'µg', v: it.vitA, r: req.vitA, digits: 0 },
      { k: 'vitC', label: 'Vitamine C', unit: 'mg', v: it.vitC, r: req.vitC, digits: 0 },
      { k: 'calcium', label: 'Calcium', unit: 'mg', v: it.calcium, r: req.calcium, digits: 0 },
      { k: 'folate', label: 'Folate', unit: 'µg', v: it.folate, r: req.folate, digits: 0 },
      { k: 'potassium', label: 'Potassium', unit: 'mg', v: it.potassium, r: req.potassium, digits: 0 },
      { k: 'sodium', label: 'Sodium', unit: 'mg', v: it.sodium, r: req.sodium, digits: 0, inverse: true },
      { k: 'sugar', label: fr() ? 'Sucres libres' : 'Free sugars', unit: 'g', v: it.sugar, r: req.sugar, digits: 0, inverse: true },
      { k: 'satfat', label: fr() ? 'Graisses saturées' : 'Saturated fat', unit: 'g', v: it.satfat, r: req.satfat, digits: 1, inverse: true }
    ];
    host.innerHTML = rows.map((r) => {
      const pctv = r.r ? (r.v / r.r) * 100 : 0;
      const tone = r.inverse ? (pctv <= 100 ? 'good' : pctv <= 140 ? 'warn' : 'risk') : (pctv >= 92 ? 'good' : pctv >= 68 ? 'ok' : pctv >= 45 ? 'warn' : 'risk');
      return UI.meter({
        label: r.label + ' · ' + U.fmt(r.v, r.digits) + '/' + U.fmtInt(r.r) + ' ' + r.unit,
        value: U.clamp(pctv, 0, 160) / 1.6, text: U.fmt(pctv, 0) + '%',
        color: TH.tone(tone === 'ok' ? 'ok' : tone), marker: r.inverse ? 100 / 1.6 : 100 / 1.6, markerLabel: '100%'
      });
    }).join('') +
      '<div class="nv-row" style="margin-top:8px">' +
        UI.chip((fr() ? 'Diversité ' : 'Diversity ') + U.fmt(it.diversity, 1) + '/10', it.diversity >= 5 ? 'good' : 'warn') +
        UI.chip((fr() ? 'Bio ' : 'Organic ') + U.fmtInt(it.organicPct || 0) + '%', 'ok') +
        UI.chip((fr() ? 'Coût ' : 'Cost ') + money(it.cost || 0), 'neutral') +
        UI.chip(it.source === 'journal' ? (fr() ? 'Journal actif' : 'Journal active') : (fr() ? 'Estimation déclarée' : 'Declared estimate'), it.source === 'journal' ? 'good' : 'warn') +
      '</div>';
  }
  function renderAdherence() {
    const m = adherenceMatrix(12);
    mountChart('adherence', chartHost('adherence'), {
      type: 'heatmap', height: 190, rows: m.rows, cols: m.cols, values: m.values,
      min: 0, max: 100, valueFormat: (v) => U.fmt(v, 0) + '%', valueLabel: fr() ? 'Jours couverts' : 'Days covered',
      colorAt: (tt) => tt < 0.02 ? 'rgba(255,255,255,.05)' : TH.scale(0.25 + tt * 0.75)
    });
    const host = root.querySelector('#nvJournalKpis');
    if (!host) return;
    const days = {};
    State.journal.forEach((e) => { days[e.date] = (days[e.date] || 0) + 1; });
    const nbDays = Object.keys(days).length;
    const last14 = Object.keys(days).filter((d) => d >= (function () { const x = U.daysAgo(14); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })()).length;
    host.innerHTML =
      UI.kpi({ label: t('journal.streak'), value: String(streak()), unit: (fr() ? 'jours' : 'days'), icon: '🔥', tone: streak() >= 5 ? 'good' : streak() >= 2 ? 'warn' : 'risk' }) +
      UI.kpi({ label: fr() ? 'Jours suivis (14 j)' : 'Days tracked (14 d)', value: last14 + '/14', icon: '📅', tone: last14 >= 10 ? 'good' : last14 >= 6 ? 'warn' : 'risk' }) +
      UI.kpi({ label: fr() ? 'Entrées totales' : 'Total entries', value: String(State.journal.length), icon: '📓', tone: 'info' }) +
      UI.kpi({ label: fr() ? 'Couverture moyenne' : 'Average coverage', value: U.fmt(m.values.reduce((a, r) => a + S.mean(r), 0) / m.values.length, 0), unit: '%', icon: '🎯', tone: 'ok' });
  }

  /* ---- plan alimentaire optimisé ---------------------------------------- */
  let planCache = null, planCacheKey = '';
  function currentPlan() {
    const p = State.profile;
    const key = [countryCode(), U.num(State.settings.budget, 3.4), U.num(State.scenario.organic, 30), State.settings.planSeed || 'plan', p.sex, U.num(p.weight), U.num(p.age), State.settings.clean !== false ? 1 : 0].join('|');
    if (planCache && planCacheKey === key) return planCache;
    planCache = plan(p, {
      budget: U.num(State.settings.budget, 3.4),
      organic: U.num(State.scenario.organic, 30),
      seed: State.settings.planSeed || 'plan',
      clean: State.settings.clean !== false
    });
    planCacheKey = key;
    return planCache;
  }
  const DAY_NAMES = [['Mon', 'Lun'], ['Tue', 'Mar'], ['Wed', 'Mer'], ['Thu', 'Jeu'], ['Fri', 'Ven'], ['Sat', 'Sam'], ['Sun', 'Dim']];
  function renderPlan() {
    const pl = currentPlan(), req = pl.req;
    const di = U.clamp(U.num(State.settings.planDay, 0), 0, 6);
    const day = pl.days[di];
    setTxt('#nvPlanSub', t('plan.sub') + ' · ' + countryName() + ' · ' + (fr() ? 'bio local ' : 'local organic ') + U.fmtInt(pl.organicPct) + '% · ≤ $' + U.fmt(U.num(State.settings.budget, 3.4), 2) + '/j');
    /* onglets jours */
    const tabs = root.querySelector('#nvPlanTabs');
    if (tabs) {
      tabs.innerHTML = pl.days.map((d, i) => {
        const nm = DAY_NAMES[d.date.getDay()];
        return '<button class="nv-tab' + (i === di ? ' active' : '') + '" data-nv-action="plan-day" data-nv-arg="' + i + '">' +
          '<b>' + U.esc(fr() ? nm[1] : nm[0]) + '</b><span>' + U.dateLabel(d.date).slice(0, 6) + '</span>' +
          '<small>' + U.fmtInt(d.totals.energy) + ' kcal · ' + money(d.cost) + '</small></button>';
      }).join('');
    }
    /* repas du jour */
    const host = root.querySelector('#nvPlanDay');
    if (host) {
      host.innerHTML = day.meals.map((m) => {
        const tot = mealTotals([m]);
        return '<article class="nv-meal"><header><h4>' + U.esc(t('slot.' + m.slot)) + '</h4>' +
          '<span class="nv-chip nv-chip-neutral">' + U.fmtInt(tot.energy) + ' kcal</span>' +
          '<span class="nv-chip nv-chip-neutral">' + money(tot.cost) + '</span>' +
          '<span class="nv-chip nv-chip-neutral">' + U.pct(m.share * 100, 0) + ' ' + (fr() ? 'de l\'énergie' : 'of energy') + '</span>' +
          '<span style="flex:1"></span>' +
          '<button class="nv-btn sm" data-nv-action="plan-log" data-nv-arg="' + m.slot + '"><i>📥</i><span>' + U.esc(fr() ? 'Ajouter au journal' : 'Log to journal') + '</span></button>' +
          '</header><ul class="nv-meal-items">' +
          m.items.map((it) => '<li' + (inSeason(it.f) ? '' : ' class="off-season"') + '>' +
            '<i>' + it.f.icon + '</i><span class="nm">' + U.esc(foodName(it.f)) + '</span>' +
            '<span class="g">' + U.fmtInt(it.g) + ' g</span>' +
            '<span class="kc">' + U.fmtInt(it.kcal) + ' kcal</span>' +
            (it.organic ? '<span class="nv-chip nv-chip-good" title="' + U.esc(fr() ? 'Agriculture bio locale tracée' : 'Traceable local organic') + '">🌱</span>' : '') +
            (inSeason(it.f) ? '' : '<span class="nv-chip nv-chip-warn" title="' + U.esc(fr() ? 'Hors saison' : 'Out of season') + '">📅</span>') +
            '</li>').join('') +
          '</ul></article>';
      }).join('') +
        '<div class="nv-daytot"><span>' + U.esc(fr() ? 'Total du jour' : 'Day total') + '</span><b>' + U.fmtInt(day.totals.energy) + ' kcal</b>' +
        '<span>P ' + U.fmt(day.totals.protein, 0) + ' g</span><span>G ' + U.fmt(day.totals.fat, 0) + ' g</span><span>C ' + U.fmt(day.totals.carb, 0) + ' g</span>' +
        '<span>' + U.esc(fr() ? 'Fibres' : 'Fibre') + ' ' + U.fmt(day.totals.fiber, 0) + ' g</span><span>Na ' + U.fmtInt(day.totals.sodium) + ' mg</span>' +
        '<b>' + money(day.cost) + '</b></div>';
    }
    /* KPI du plan */
    const kpis = root.querySelector('#nvPlanKpis');
    if (kpis) {
      const c = pl.coverage;
      const enPct = c.energy.pct;
      kpis.innerHTML =
        UI.kpi({ label: fr() ? 'Coût journalier' : 'Daily cost', value: money(pl.cost), icon: '💵', tone: pl.cost <= U.num(State.settings.budget, 3.4) ? 'good' : 'warn', hint: '<span class="nv-note">' + U.esc(fr() ? 'Budget ≤ ' : 'Budget ≤ ') + '$' + U.fmt(U.num(State.settings.budget, 3.4), 2) + ' · ' + money(pl.cost * 30) + (fr() ? '/mois' : '/month') + '</span>' }) +
        UI.kpi({ label: t('plan.energy'), value: U.fmtInt(pl.avg.energy), unit: 'kcal', icon: '⚡', tone: enPct >= 90 && enPct <= 112 ? 'good' : 'warn', hint: '<span class="nv-note">' + U.fmt(enPct, 0) + '% ' + (fr() ? 'du besoin' : 'of need') + ' (' + U.fmtInt(req.energy) + ')</span>' }) +
        UI.kpi({ label: fr() ? 'Bio local tracé' : 'Traceable local organic', value: U.fmtInt(pl.organicPct), unit: '%', icon: '🌱', tone: pl.organicPct >= 45 ? 'good' : pl.organicPct >= 25 ? 'ok' : 'warn' }) +
        UI.kpi({ label: fr() ? 'Qualité du plan' : 'Plan quality', value: String(pl.score), unit: '/100', icon: '🧮', tone: pl.score >= 78 ? 'good' : pl.score >= 60 ? 'warn' : 'risk', hint: '<span class="nv-note">' + U.esc(fr() ? 'Optimisation : 320 permutations + calibrage énergétique' : 'Optimisation: 320 permutations + energy calibration') + '</span>' }) +
        UI.kpi({ label: fr() ? 'Diversité' : 'Diversity', value: U.fmt(pl.avg.diversity, 1), unit: '/10', icon: '🍽️', tone: pl.avg.diversity >= 6 ? 'good' : 'warn' }) +
        UI.kpi({ label: fr() ? 'Aliments locaux disponibles' : 'Local foods available', value: String(pl.poolSize), unit: '/56', icon: '🗺️', tone: 'info', hint: '<span class="nv-note">' + U.esc(fr() ? 'Base analysée en laboratoire' : 'Lab-analysed database') + '</span>' });
    }
    /* radar de couverture des besoins */
    const axes = ['energy', 'protein', 'fiber', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium'];
    mountChart('planRadar', chartHost('planRadar'), {
      type: 'radar', height: 236,
      axes: axes.map((k) => (fr() ? { energy: 'Énergie', protein: 'Protéines', fiber: 'Fibres', iron: 'Fer', vitA: 'Vit. A', vitC: 'Vit. C', calcium: 'Calcium', zinc: 'Zinc', folate: 'Folate', potassium: 'Potassium' }[k] : k[0].toUpperCase() + k.slice(1))),
      series: [
        { name: t('plan.coverage'), data: axes.map((k) => Math.round(U.clamp(pl.coverage[k].pct, 0, 200) * 10) / 10), color: '#38f0a5', fill: true },
        { name: fr() ? 'Apports actuels' : 'Current intake', data: axes.map((k) => Math.round(U.clamp((State.cache.it[k] / (req[k] || 1)) * 100, 0, 200) * 10) / 10), color: '#22d3ee' }
      ],
      max: 200, valueFormat: (v) => U.fmt(v, 0) + '%', valueLabel: fr() ? 'Couverture' : 'Coverage'
    });
    const notes = root.querySelector('#nvPlanNotes');
    if (notes) {
      const bits = [
        '🧺 ' + (fr() ? 'Sodium du plan : ' : 'Plan sodium: ') + U.fmtInt(pl.avg.sodium) + ' mg (' + U.fmt((pl.avg.sodium / (req.sodium || 2000)) * 100, 0) + '% ' + (fr() ? 'de la limite OMS' : 'of WHO limit') + ')',
        '🗓️ ' + (pl.outOfSeason.length ? (fr() ? 'Hors saison ce mois-ci : ' : 'Out of season this month: ') + pl.outOfSeason.slice(0, 4).join(', ') : (fr() ? 'Tous les aliments sont de saison.' : 'All foods are in season.')),
        '🌍 ' + (fr() ? 'Empreinte du plan ≈ ' : 'Plan footprint ≈ ') + U.fmt(240 + (100 - pl.organicPct) * 1.6 + U.clamp(pl.avg.protein - req.protein, 0, 60) * 3.2, 0) + ' kg CO₂e/an',
        '🧾 ' + (fr() ? 'Indice glycémique moyen : ' : 'Mean glycaemic index: ') + U.fmt(pl.avg.gi, 0)
      ];
      notes.innerHTML = bits.map((b) => '<div>' + U.esc(b) + '</div>').join('') +
        '<div class="nv-row" style="margin-top:8px">' + UI.btn(fr() ? 'Liste de courses' : 'Shopping list', { action: 'plan-shopping', icon: '🧺' }) + UI.btn(fr() ? 'Régénérer' : 'Regenerate', { action: 'plan-regen', icon: '🎲', kind: 'ghost' }) + '</div>';
    }
  }

  /* ---- alertes ------------------------------------------------------------ */
  const ALERT_ACTIONS = {
    book: { icon: '👩🏾‍⚕️', fr: 'Prendre RDV', en: 'Book appointment' },
    foods: { icon: '🧪', fr: 'Voir la base aliments', en: 'Open food database' },
    plan: { icon: '🍽️', fr: 'Ouvrir le plan', en: 'Open the plan' },
    sim: { icon: '🎚️', fr: 'Simuler', en: 'Simulate' },
    evidence: { icon: '📚', fr: 'Voir les preuves', en: 'See the evidence' },
    market: { icon: '🛒', fr: 'Marché bio', en: 'Organic market' }
  };
  function renderAlerts() {
    const host = root.querySelector('#nvAlertList');
    if (!host) return;
    const list = alerts(State.profile);
    const count = root.querySelector('#nvAlertCount');
    if (count) count.textContent = String(list.length);
    if (!list.length) {
      host.innerHTML = '<div class="nv-item" data-tone="good"><span class="nv-item-icon">🛡️</span><div class="nv-item-body"><div class="nv-item-title">' +
        U.esc(fr() ? 'Aucune alerte active' : 'No active alert') + '</div><div class="nv-item-text">' +
        U.esc(fr() ? 'Tous vos indicateurs sont dans les seuils de référence. Continuez le suivi hebdomadaire.' : 'All your markers are within reference ranges. Keep the weekly monitoring.') +
        '</div></div></div>';
      return;
    }
    host.innerHTML = list.map((a) => '<div class="nv-item nv-alert" data-tone="' + a.tone + '" data-alert="' + U.esc(a.id) + '">' +
      '<span class="nv-item-icon">' + (a.icon || '⚠️') + '</span>' +
      '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(a.title) + '</div>' +
      '<div class="nv-item-text">' + U.esc(a.text) + '</div>' +
      (a.z != null ? '<div class="nv-item-text">σ = ' + U.fmt(a.z, 1) + ' · ' + U.esc(fr() ? 'écart au modèle de référence' : 'deviation from reference model') + '</div>' : '') +
      '<div class="nv-row" style="margin-top:6px">' +
        (a.actions || []).map((ac) => {
          const A = ALERT_ACTIONS[ac];
          if (!A) return '';
          return UI.btn(fr() ? A.fr : A.en, { action: 'alert-act', arg: ac, icon: A.icon, kind: 'sm' });
        }).join('') +
        UI.btn(fr() ? 'Masquer' : 'Dismiss', { action: 'alert-dismiss', arg: a.id, kind: 'sm ghost' }) +
      '</div></div>' +
      '<div class="nv-item-side"><span class="nv-chip nv-chip-' + a.tone + '">' + U.esc(a.tone === 'risk' ? t('status.high') : a.tone === 'warn' ? t('status.watch') : t('status.info')) + '</span></div>' +
      '</div>').join('');
  }
  function renderRecs() {
    const host = root.querySelector('#recs');
    if (!host) return;
    const list = recommendations(State.profile);
    host.innerHTML = '<div class="nv-grid nv-g2">' + list.map((r) =>
      '<article class="nv-rec" data-tone="' + r.tone + '">' +
        '<header><i>' + r.icon + '</i><div><h4>' + U.esc(r.title) + '</h4><span>' + U.esc(r.category) + ' · ' + U.esc(fr() ? 'Priorité' : 'Priority') + ' ' + r.priority + '</span></div>' +
        '<span class="nv-chip nv-chip-' + r.tone + '">P' + r.priority + '</span></header>' +
        '<p>' + U.esc(r.text) + '</p>' +
        '<div class="nv-rec-impact"><b>' + U.esc(r.impact) + '</b><span>' + U.esc(fr() ? 'Impact estimé' : 'Estimated impact') + '</span></div>' +
        '<div class="nv-rec-why">' + U.esc(fr() ? 'Pourquoi : ' : 'Why: ') + U.esc(r.why) + '</div>' +
        '<div class="nv-rec-ev">📚 ' + U.esc(r.evidence) + ' · ' + U.esc(fr() ? 'Niveau de preuve ' : 'Evidence level ') + r.level + '/3</div>' +
        '<div class="nv-row">' + (r.actions || []).map((ac) => {
          const A = ALERT_ACTIONS[ac];
          return A ? UI.btn(fr() ? A.fr : A.en, { action: 'alert-act', arg: ac, icon: A.icon, kind: 'sm ghost' }) : '';
        }).join('') + '</div>' +
      '</article>').join('') + '</div>' +
      '<div class="nv-row" style="margin-top:10px">' +
        UI.btn(fr() ? 'Exporter le plan d\'action (CSV)' : 'Export action plan (CSV)', { action: 'recs-export', icon: '⇩', kind: 'ghost' }) +
        UI.btn(fr() ? 'Imprimer' : 'Print', { action: 'print', icon: '🖨️', kind: 'ghost' }) +
      '</div>';
  }

  /* =====================================================================
     E — INTERACTIONS : chaque bouton, curseur et champ est fonctionnel
     ===================================================================== */
  const dQuick = U.debounce(function () { save('all'); renderQuick(); }, 300);
  const dHeavy = U.debounce(function () { save('all'); renderHeavy(); }, 340);
  function pulse(el) {
    if (!el || U.reducedMotion()) return;
    el.classList.add('nv-pulse');
    setTimeout(() => el.classList.remove('nv-pulse'), 560);
  }
  function scrollTo(sel) {
    const el = root.querySelector(sel) || document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: U.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }
  function gotoSection(id) {
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) { UI.toast((fr() ? 'Section indisponible dans cette démo : ' : 'Section unavailable in this demo: ') + id, { tone: 'warn' }); return; }
    const btn = document.querySelector('.nav button[onclick*="\'' + id + '\'"]');
    if (typeof global.go === 'function') global.go(id, btn || undefined);
    else target.scrollIntoView({ behavior: 'smooth' });
  }
  function syncSegmented(action, value) {
    U.qsa('[data-nv-action="' + action + '"]', root).forEach((b) => {
      b.classList.toggle('active', String(b.getAttribute('data-nv-arg')) === String(value));
    });
  }
  function syncLevers() {
    LEVERS.concat([{ key: 'alcohol', dec: 0, unit: ' u' }]).forEach((lv) => {
      const inp = root.querySelector('#nvLev-' + lv.key);
      if (!inp) return;
      inp.value = U.num(State.scenario[lv.key], inp.value);
      const out = root.querySelector('#nvLev-' + lv.key + '-out');
      if (out) out.textContent = U.fmt(U.num(inp.value, 0), lv.dec || 0) + (lv.unit || '');
    });
    const hz = root.querySelector('#nvLev-horizon');
    if (hz) {
      hz.value = U.num(State.settings.horizon, 24);
      const o = root.querySelector('#nvLev-horizon-out');
      if (o) o.textContent = U.fmtInt(hz.value) + ' ' + (fr() ? 'mois' : 'mo');
    }
    const sm = root.querySelector('[data-nv-toggle="smoke"] input');
    if (sm) { sm.checked = !!State.scenario.smoke; sm.closest('.nv-toggle').classList.toggle('on', sm.checked); }
    const ps = root.querySelector('[data-nv-toggle="predScenario"] input');
    if (ps) { ps.checked = State.settings.predScenario !== false; ps.closest('.nv-toggle').classList.toggle('on', ps.checked); }
    syncSegmented('period', State.settings.period);
    syncSegmented('trials', State.settings.trials);
    syncSegmented('pred-var', State.settings.predVar);
    syncSegmented('journal-slot', State.settings.slot || guessSlot());
    syncSegmented('journal-grams', State.settings.grams || 100);
    syncSegmented('live-speed', State.settings.speed);
    const bud = root.querySelector('[data-nv-action="plan-budget"]');
    if (bud) bud.value = String(U.num(State.settings.budget, 3.4));
  }
  const LEGACY_FIELDS = ['profile', 'age', 'w', 'h', 'wa', 'hi', 'gl', 'a1c', 'sys', 'dia', 'chol', 'kidney'];
  function wire() {
    if (State.wired) return;
    State.wired = true;
    /* --- clic : délégation unique sur toute la section --- */
    U.on(root, 'click', function (e) {
      const el = e.target && e.target.closest ? e.target.closest('[data-nv-action]') : null;
      if (!el || !root.contains(el)) return;
      if (el.tagName === 'SELECT') return;                     /* géré par change */
      const action = el.getAttribute('data-nv-action');
      const arg = el.getAttribute('data-nv-arg');
      if (el.tagName === 'BUTTON' || el.tagName === 'A') e.preventDefault();
      try { run(action, arg, el, e); }
      catch (err) { if (global.console) console.error('[NutriCitizen]', action, err); UI.toast((fr() ? 'Action impossible : ' : 'Action failed: ') + action, { tone: 'risk' }); }
    });
    /* --- curseurs et champs numériques --- */
    U.on(root, 'input', function (e) {
      const el = e.target;
      if (!el || !el.dataset) return;
      const slider = el.closest ? el.closest('.nv-slider') : null;
      if (slider && el.dataset.nvKey) { onSlider(el); return; }
      if (el.dataset.nvField) { onField(el); return; }
      if (LEGACY_FIELDS.indexOf(el.id) >= 0) { readForm(); dQuick(); }
    });
    U.on(root, 'change', function (e) {
      const el = e.target;
      if (!el || !el.dataset) return;
      if (el.dataset.nvKey && el.type === 'checkbox') { onToggle(el); return; }
      if (el.dataset.nvField) { onField(el); return; }
      if (el.getAttribute('data-nv-action') === 'preset') { applyPreset(el.value, el); return; }
      if (el.getAttribute('data-nv-action') === 'plan-budget') {
        State.settings.budget = U.num(el.value, 3.4);
        planCache = null; save('settings'); renderPlan();
        UI.toast((fr() ? 'Budget du plan : ≤ $' : 'Plan budget: ≤ $') + U.fmt(State.settings.budget, 2) + (fr() ? '/jour — plan ré-optimisé' : '/day — plan re-optimised'), { tone: 'good', icon: '🧺' });
        return;
      }
      if (el.id === 'familyMember') { State.settings.child = el.value; save('settings'); renderFamily(); }
    });
    /* --- rechargement de langue : tout est régénéré --- */
    NV.i18n.onChange(function () { if (State.mounted) rebuild(); });
  }
  function onSlider(el) {
    const key = el.dataset.nvKey;
    const v = U.num(el.value, 0);
    const dec = U.num(el.dataset.nvDecimals, 0);
    const out = root.querySelector('#' + el.id + '-out');
    if (out) out.textContent = U.fmt(v, dec) + (el.dataset.nvUnit || '');
    if (key === 'horizon') { State.settings.horizon = U.clamp(v, 3, 60); save('settings'); dHeavy(); return; }
    State.scenario[key] = v;
    save('scenario');
    /* le poids cible influence immédiatement les graphiques de tendance */
    if (key === 'weightPct') { renderTrendCharts(); }
    dHeavy();
  }
  function onToggle(el) {
    const key = el.dataset.nvKey;
    el.closest('.nv-toggle').classList.toggle('on', el.checked);
    if (key === 'predScenario') { State.settings.predScenario = el.checked; save('settings'); renderPred(); return; }
    State.scenario[key] = el.checked;
    save('scenario');
    dHeavy();
  }
  function onField(el) {
    const key = el.dataset.nvField;
    const v = el.value;
    if (key === 'smoke') State.profile.smoke = String(v) === '1';
    else if (key === 'pregnant') State.profile.pregnant = String(v) === '0' ? false : String(v);
    else if (key === 'sodiumG') State.profile.sodiumMg = U.clamp(U.num(v, 5.2) * 1000, 0, 15000);
    else State.profile[key] = U.num(v, State.profile[key]);
    State.history = null;
    dQuick();
  }
  /* --- table de dispatch des actions --- */
  function run(action, arg, el, ev) {
    switch (action) {
      /* journal */
      case 'journal-add': journalAdd(arg, el); break;
      case 'journal-remove': removeJournal(U.num(arg, 0)); renderJournal(); renderQuick(); save('all');
        UI.toast(fr() ? 'Entrée supprimée' : 'Entry removed', { tone: 'info', icon: '🗑' }); break;
      case 'journal-clear': confirmModal(fr() ? 'Vider le journal du jour ?' : 'Clear today\'s journal?',
        fr() ? 'Les entrées du jour seront supprimées. L\'historique et les modèles seront recalculés.' : 'Today\'s entries will be removed. History and models will be recomputed.',
        function () { clearToday(); State.history = null; renderJournal(); renderQuick(); UI.toast(fr() ? 'Journal du jour vidé' : 'Today\'s journal cleared', { tone: 'info' }); }); break;
      case 'journal-scan': runScan(el); break;
      case 'journal-slot': State.settings.slot = arg; save('settings'); syncSegmented('journal-slot', arg);
        UI.toast((fr() ? 'Repas actif : ' : 'Active meal: ') + t('slot.' + arg), { tone: 'info' }); break;
      case 'journal-grams': State.settings.grams = U.num(arg, 100); save('settings'); syncSegmented('journal-grams', State.settings.grams);
        UI.toast((fr() ? 'Portion par défaut : ' : 'Default portion: ') + U.fmtInt(State.settings.grams) + ' g', { tone: 'info' }); break;
      /* prédiction */
      case 'risk-select': State.settings.riskSel = arg; save('settings'); renderRiskList(); break;
      case 'pred-var': State.settings.predVar = arg; save('settings'); syncSegmented('pred-var', arg); renderPred(); renderSim(); break;
      case 'pred-rerun': State.settings.rerun = U.num(State.settings.rerun, 0) + 1; save('settings');
        pulse(root.querySelector('#nvPredPanel')); renderPred();
        UI.toast(fr() ? 'Monte-Carlo relancé : nouveaux tirages bootstrap' : 'Monte-Carlo re-run: new bootstrap draws', { tone: 'good', icon: '↻' }); break;
      case 'trials': State.settings.trials = U.num(arg, 1000); save('settings'); syncSegmented('trials', State.settings.trials);
        pulse(root.querySelector('#nvPredPanel')); renderPred();
        UI.toast(U.fmtInt(State.settings.trials) + (fr() ? ' trajectoires simulées' : ' trajectories simulated'), { tone: 'info', icon: '🎲' }); break;
      case 'model-info': openModelModal(); break;
      case 'recompute': recompute(); break;
      /* scénarios */
      case 'preset': applyPreset(arg, el); break;
      case 'sim-apply': applyScenario(); break;
      case 'sim-reset': resetScenario(); break;
      /* tendances */
      case 'period': State.settings.period = U.num(arg, 90); save('settings'); syncSegmented('period', State.settings.period);
        renderTrendCharts(); renderSparks(); break;
      /* plan */
      case 'plan-day': State.settings.planDay = U.clamp(U.num(arg, 0), 0, 6); save('settings'); renderPlan(); break;
      case 'plan-regen': State.settings.planSeed = 'p' + Date.now().toString(36); planCache = null; save('settings');
        pulse(root.querySelector('#nvPlanPanel')); renderPlan();
        UI.toast(fr() ? 'Plan ré-optimisé (320 permutations)' : 'Plan re-optimised (320 permutations)', { tone: 'good', icon: '🎲' }); break;
      case 'plan-log': logPlanToJournal(arg); break;
      case 'plan-shopping': openShoppingModal(); break;
      case 'plan-export': exportPlan(); break;
      /* alertes */
      case 'alert-act': alertAction(arg, el); break;
      case 'alert-dismiss':
        if (State.dismissed.indexOf(arg) < 0) State.dismissed.push(arg);
        save('dismissed'); renderAlerts();
        UI.toast(fr() ? 'Alerte masquée — réactivable via Réinitialiser' : 'Alert dismissed — restore via Reset', { tone: 'info', icon: '🔕' }); break;
      /* flux vivant */
      case 'live-toggle':
        State.settings.live = !State.settings.live; save('settings');
        if (State.settings.live) startLive(); else stopLive();
        updateLiveBadge();
        UI.toast(State.settings.live ? (fr() ? 'Flux capteurs activé' : 'Sensor stream on') : (fr() ? 'Flux capteurs en pause' : 'Sensor stream paused'), { tone: State.settings.live ? 'good' : 'info' }); break;
      case 'live-speed': State.settings.speed = U.num(arg, 1); save('settings'); syncSegmented('live-speed', State.settings.speed); startLive(); break;
      /* famille */
      case 'child-consent': requestChildAccess(arg); break;
      case 'child-plan': openChildNutritionPlan(arg); break;
      case 'child-full': openChildModal(arg); break;
      /* formulaire */
      case 'form-demo': loadDemoProfile(); break;
      case 'form-device': fillFromDevices(); break;
      /* navigation & données */
      case 'goto': gotoSection(arg); break;
      case 'sync': openSyncModal(el); break;
      case 'report': openReportModal(); break;
      case 'share': shareProfile(); break;
      case 'reset': confirmModal(fr() ? 'Réinitialiser la démo citoyenne ?' : 'Reset the citizen demo?',
        fr() ? 'Profil, scénario, journal et alertes masquées reviennent à l\'état initial.' : 'Profile, scenario, journal and dismissed alerts return to their initial state.',
        resetAll); break;
      case 'export-json': exportJSON(); break;
      case 'export-csv': exportCSV(); break;
      case 'export-print': case 'print': printReport(); break;
      case 'recs-export': exportRecs(); break;
      default:
        if (global.console) console.warn('[NutriCitizen] action inconnue :', action);
    }
  }
  function updateLiveBadge() {
    if (refs.liveBadge) refs.liveBadge.classList.toggle('off', !State.settings.live);
    const b = root.querySelector('[data-nv-action="live-toggle"]');
    if (b) {
      const i = b.querySelector('i');
      if (i) i.textContent = State.settings.live ? '⏸' : '▶';
      b.title = State.settings.live ? t('live.on') : t('live.off');
    }
  }

  /* ---- actions : journal ------------------------------------------------ */
  function journalAdd(foodId, el) {
    const f = FOOD_BY_ID[foodId];
    if (!f) return;
    const grams = U.num(State.settings.grams, 100);
    const slot = State.settings.slot || guessSlot();
    const rng = RNG('journal-' + Date.now() + foodId);
    const organic = rng.next() < U.clamp(f.organic * (0.35 + U.num(State.scenario.organic, 30) / 100), 0, 0.95);
    const e = addJournal(foodId, grams, slot, organic);
    if (!e) return;
    pulse(el);
    UI.toast('✓ ' + foodName(f) + ' · ' + U.fmtInt(grams) + ' g · ' + t('slot.' + slot) + (organic ? ' · 🌱 bio' : ''), { tone: 'good', duration: 2400 });
    renderJournal();
    renderQuick();
  }
  function runScan(el) {
    const stage = root.querySelector('#nvScanStage');
    if (!stage) return;
    pulse(el);
    stage.style.display = '';
    scrollTo('#nvScanStage');
    const steps = [
      { label: fr() ? 'Capture photo' : 'Photo capture', text: fr() ? 'Détection du plat — 0,4 s' : 'Dish detection — 0.4 s' },
      { label: fr() ? 'Reconnaissance IA' : 'AI recognition', text: fr() ? 'Vision : 3 aliments identifiés' : 'Vision: 3 foods identified' },
      { label: fr() ? 'Estimation des portions' : 'Portion estimation', text: fr() ? 'Volume 3D → grammes' : '3D volume → grams' },
      { label: fr() ? 'Composition laboratoire' : 'Lab composition', text: fr() ? 'Table de composition ' + countryName() : 'Composition table ' + countryName() },
      { label: fr() ? 'Impact métabolique' : 'Metabolic impact', text: fr() ? 'Réponse glycémique prédite' : 'Predicted glycaemic response' }
    ];
    const api = UI.stepper(stage, steps, { stepMs: 520, doneText: fr() ? '✓ Repas analysé et ajouté au journal' : '✓ Meal analysed and logged' });
    api.run({
      onDone: function () {
        const pool = foodsFor(countryCode()).filter((f) => !f.upf);
        const rng = RNG('scan-' + Date.now());
        const picks = [];
        for (let i = 0; i < 3 && pool.length; i++) {
          const f = rng.pick(pool);
          if (f && picks.indexOf(f) < 0) picks.push(f);
        }
        picks.forEach((f) => {
          const organic = rng.next() < U.clamp(f.organic * (0.35 + U.num(State.scenario.organic, 30) / 100), 0, 0.95);
          addJournal(f.id, Math.round(rng.int(60, 240) / 5) * 5, State.settings.slot || guessSlot(), organic);
        });
        renderJournal();
        renderQuick();
        UI.toast((fr() ? 'Repas scanné : ' : 'Scanned meal: ') + picks.map(foodName).join(' · '), { tone: 'good', icon: '📷' });
        setTimeout(() => { stage.style.display = 'none'; }, 2600);
      }
    });
  }
  function logPlanToJournal(slotArg) {
    const pl = currentPlan();
    const day = pl.days[U.clamp(U.num(State.settings.planDay, 0), 0, 6)];
    const rng = RNG('planlog-' + Date.now());
    let n = 0;
    day.meals.forEach((m) => {
      if (slotArg && m.slot !== slotArg) return;
      m.items.forEach((it) => { addJournal(it.f.id, it.g, m.slot, it.organic); n++; });
    });
    if (!n) return;
    State.history = null;
    renderJournal();
    renderQuick();
    UI.toast((fr() ? n + ' aliments du plan ajoutés au journal' : n + ' plan foods logged to the journal'), { tone: 'good', icon: '📥' });
  }

  /* ---- actions : scénarios --------------------------------------------- */
  function applyPreset(key, el) {
    const p = PRESETS[key];
    if (!p) return;
    State.scenario = Object.assign({}, DEFAULT_SCENARIO, p);
    State.settings.predScenario = true;
    simCache = null;
    save('all');
    syncLevers();
    pulse(el);
    pulse(root.querySelector('#nvSimPanel'));
    renderHeavy();
    renderQuick();
    UI.toast((fr() ? 'Préréglage appliqué : ' : 'Preset applied: ') + t('preset.' + key), { tone: 'good', icon: '🎚️' });
  }
  function resetScenario() {
    State.scenario = Object.assign({}, DEFAULT_SCENARIO);
    simCache = null;
    save('scenario');
    syncLevers();
    renderHeavy();
    UI.toast(fr() ? 'Scénario réinitialisé' : 'Scenario reset', { tone: 'info', icon: '↺' });
  }
  function applyScenario() {
    const s = State.scenario, p = State.profile;
    const d = derived(p);
    p.weight = Math.round(U.num(p.weight, 70) * (1 + U.num(s.weightPct, 0) / 100) * 10) / 10;
    p.waist = Math.round(U.num(p.waist, 85) * (1 + U.num(s.weightPct, 0) / 150) * 10) / 10;
    p.hip = Math.round(U.clamp(U.num(p.hip, 100) * (1 + U.num(s.weightPct, 0) / 200), 60, 160) * 10) / 10;
    p.activityMin = U.num(s.activityMin, p.activityMin);
    p.fruitVeg = U.num(s.fruitVeg, p.fruitVeg);
    p.sodiumMg = U.num(s.sodiumMg, p.sodiumMg);
    p.upf = U.num(s.upf, p.upf);
    p.sleep = U.num(s.sleep, p.sleep);
    p.sodaWk = U.num(s.sodaWk, p.sodaWk);
    p.alcohol = U.num(s.alcohol, p.alcohol);
    p.smoke = !!s.smoke;
    p.sbp = Math.round(U.clamp(U.num(p.sbp, 120) + scenarioDrift('sbp') * 5, 85, 230));
    p.dbp = Math.round(U.clamp(U.num(p.dbp, 78) + scenarioDrift('dbp') * 5, 50, 140));
    p.glucose = Math.round(U.clamp(U.num(p.glucose, 95) + scenarioDrift('glucose') * 5, 55, 380));
    p.hba1c = Math.round(U.clamp(U.num(p.hba1c, 5.4) + scenarioDrift('hba1c') * 5, 4, 15) * 10) / 10;
    p.chol = Math.round(U.clamp(U.num(p.chol, 195) + scenarioDrift('chol') * 5, 90, 420));
    /* le scénario appliqué devient la nouvelle ligne de base */
    State.scenario = Object.assign({}, DEFAULT_SCENARIO, {
      weightPct: 0, activityMin: p.activityMin, fruitVeg: p.fruitVeg, sodiumMg: p.sodiumMg,
      sodaWk: p.sodaWk, upf: p.upf, sleep: p.sleep, organic: U.num(s.organic, 30),
      adherence: Math.max(U.num(s.adherence, 55), 72), smoke: p.smoke, alcohol: p.alcohol
    });
    State.history = null; planCache = null; simCache = null;
    save('all');
    syncLevers();
    fillForm();
    renderAll();
    UI.toast(fr() ? 'Scénario appliqué à votre profil — modèles recalculés' : 'Scenario applied to your profile — models recomputed', { tone: 'good', icon: '✅' });
  }
  function recompute() {
    State.history = null; planCache = null; simCache = null;
    State.settings.rerun = U.num(State.settings.rerun, 0) + 1;
    save('settings');
    root.classList.add('nv-busy');
    renderAll();
    setTimeout(() => root.classList.remove('nv-busy'), 620);
    UI.toast(fr() ? 'Tous les modèles ont été recalculés' : 'All models recomputed', { tone: 'good', icon: '↻' });
  }
  function loadDemoProfile() {
    State.profile = Object.assign({}, State.profile, {
      sex: 'female', age: 41, weight: 78.4, height: 165, waist: 92, hip: 106,
      glucose: 108, hba1c: 5.9, sbp: 134, dbp: 86, chol: 214, creatinine: 0.86,
      activityMin: 62, sleep: 6.1, fruitVeg: 2.1, sodiumMg: 6100, upf: 38, water: 1.3,
      alcohol: 3, sodaWk: 6, smoke: false, pregnant: false
    });
    State.history = null; planCache = null; simCache = null;
    save('all');
    fillForm();
    renderAll();
    UI.toast(fr() ? 'Profil de démonstration chargé : femme, 41 ans, Lomé' : 'Demo profile loaded: woman, 41, Lomé', { tone: 'good', icon: '🧪' });
    scrollTo('#nvHero');
  }
  function fillFromDevices() {
    const p = State.profile, l = State.live;
    p.sbp = Math.round(U.clamp(U.num(p.sbp, 120) * 0.6 + (l.hr * 0.62 + 74) * 0.4, 85, 220));
    p.dbp = Math.round(U.clamp(U.num(p.dbp, 78) * 0.6 + (p.sbp * 0.52) * 0.4, 50, 140));
    p.glucose = Math.round(U.clamp(l.cgm, 55, 380));
    p.sleep = Math.round(U.clamp(l.sleep, 3, 11) * 10) / 10;
    p.water = Math.round(U.clamp(l.water, 0, 6) * 10) / 10;
    p.activityMin = Math.round(U.clamp(l.steps / 62, 0, 900));
    State.history = null;
    save('all');
    fillForm();
    renderQuick();
    renderHeavy();
    UI.toast(fr() ? 'Données appareils importées (montre, CGM, balance)' : 'Device data imported (watch, CGM, scale)', { tone: 'good', icon: '⌚' });
  }
  function resetAll() {
    stopLive();
    State.profile = Object.assign({}, DEFAULT_PROFILE);
    State.scenario = Object.assign({}, DEFAULT_SCENARIO);
    State.settings = Object.assign({}, DEFAULT_SETTINGS);
    State.journal = [];
    State.dismissed = [];
    State.consent = {};
    State.history = null; planCache = null; simCache = null;
    chipsCountry = '';
    save('all');
    syncLevers();
    fillForm();
    renderAll();
    renderFamily();
    seedLive();
    startLive();
    UI.toast(fr() ? 'Démo réinitialisée' : 'Demo reset', { tone: 'info', icon: '♻' });
  }

  /* ---- exports ------------------------------------------------------------ */
  function stamp() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  }
  function snapshot() {
    const p = State.profile, it = State.cache.it || intake(p), sc = State.cache.sc || scoreProfile(p, it), r = State.cache.risks || risksFor(p, { it: it });
    const pl = currentPlan();
    return {
      generated: new Date().toISOString(), app: 'NUTRI.N°1 — Citizen Dashboard 360°', version: 'V57 + NutriVision engine',
      country: countryName(), countryCode: countryCode(), currency: CURRENCIES[countryCode()] ? CURRENCIES[countryCode()].code : 'USD',
      profile: p, derived: State.cache.d || derived(p), intake: it,
      score: { total: sc.total, band: sc.band, parts: sc.parts },
      risks: Object.keys(r).map((k) => ({ key: k, label: r[k].label, p: Math.round(r[k].p * 10000) / 10000, ci: r[k].ci.map((x) => Math.round(x * 10000) / 10000), band: r[k].band.label, contributions: r[k].contributions.map((c) => ({ factor: c.label, logitDelta: Math.round(c.delta * 1000) / 1000 })) })),
      forecast: PRED_VARS.map((v) => { const f = forecastVar(v.id, U.num(State.settings.horizon, 24), true); return { variable: v.id, horizonMonths: f.months, today: f.past[f.past.length - 1], p50: f.fc.point[f.fc.point.length - 1], p10: f.fc.p10[f.fc.p10.length - 1], p90: f.fc.p90[f.fc.p90.length - 1], driftPerMonth: Math.round(f.drift * 10000) / 10000, trials: f.fc.trials }; }),
      markov: (function () { const m = markovRun(p, scenarioProfile(), 10, 600); return { years: m.years, healthyYears: Math.round(m.healthyYears * 100) / 100, diabetesFreeAt10: Math.round(m.healthyAt10 * 1000) / 1000, states: MARKOV_STATES.map((s, i) => ({ state: s, shareAt10y: Math.round(m.dists[10][i] * 1000) / 1000 })), matrix: m.P.map((row) => row.map((v) => Math.round(v * 1000) / 1000)) }; })(),
      scenario: State.scenario, scenarioOutcomes: (function () { const o = simOutcomes(); return { scoreDelta: Math.round(o.score.delta * 10) / 10, healthyYearsDelta: Math.round(o.healthyYears.delta * 100) / 100, costAvoidedUsd: Math.round(o.cost.usd), productivityDays: o.cost.days, footprintDeltaKg: Math.round(o.footprint.delta * 10) / 10, riskDeltasPoints: Object.keys(o.risks.deltas).reduce((a, k) => { a[k] = Math.round(o.risks.deltas[k] * 100) / 100; return a; }, {}) }; })(),
      plan: { days: pl.days.map((d, i) => ({ day: i + 1, date: d.date.toISOString().slice(0, 10), energy: Math.round(d.totals.energy), costUsd: d.cost, organicPct: Math.round(d.organicPct), meals: d.meals.map((m) => ({ slot: m.slot, items: m.items.map((x) => ({ food: foodName(x.f), grams: x.g, kcal: x.kcal, organic: !!x.organic, inSeason: inSeason(x.f) })) })) })), coverage: Object.keys(pl.coverage).map((k) => ({ nutrient: k, pct: Math.round(pl.coverage[k].pct) })) },
      alerts: alerts(p), recommendations: recommendations(p),
      journal: State.journal.slice(-120).map((e) => ({ date: e.date, slot: e.slot, food: (FOOD_BY_ID[e.food] ? foodName(FOOD_BY_ID[e.food]) : e.food), grams: e.grams, organic: !!e.organic })),
      history: (function () { const h = history(); return h.dates.slice(-90).map((d, i) => { const row = { date: U.dateLabel(d) }; Object.keys(h.series).forEach((k) => { row[k] = h.series[k][h.series[k].length - 90 + i]; }); return row; }); })()
    };
  }
  function exportJSON() {
    NV.export.downloadJSON('nutri1-citizen-' + stamp() + '.json', snapshot());
    UI.toast(fr() ? 'Export JSON généré' : 'JSON export generated', { tone: 'good', icon: '⇩' });
  }
  function exportCSV() {
    const h = history();
    const keys = Object.keys(h.series);
    const rows = h.dates.map((d, i) => { const r = { date: d.toISOString().slice(0, 10) }; keys.forEach((k) => { r[k] = h.series[k][i]; }); return r; });
    NV.export.downloadCSV('nutri1-citizen-history-' + stamp() + '.csv', rows, ['date'].concat(keys));
    UI.toast(fr() ? 'Historique exporté (CSV, ' + rows.length + ' jours)' : 'History exported (CSV, ' + rows.length + ' days)', { tone: 'good', icon: '⇩' });
  }
  function exportPlan() {
    const pl = currentPlan();
    const rows = [];
    pl.days.forEach((d, i) => d.meals.forEach((m) => m.items.forEach((x) => rows.push({
      day: i + 1, date: d.date.toISOString().slice(0, 10), meal: m.slot, food: foodName(x.f), food_en: x.f.en,
      group: x.f.group, grams: x.g, kcal: x.kcal, protein_g: Math.round(x.f.protein * x.g / 100 * 10) / 10,
      fiber_g: Math.round(x.f.fiber * x.g / 100 * 10) / 10, sodium_mg: Math.round(x.f.sodium * x.g / 100),
      iron_mg: Math.round(x.f.iron * x.g / 100 * 10) / 10, organic: x.organic ? 1 : 0, in_season: inSeason(x.f) ? 1 : 0,
      cost_usd: Math.round(x.f.price * x.g / 100 * 1000) / 1000, country: countryName()
    }))));
    NV.export.downloadCSV('nutri1-plan-' + countryCode() + '-' + stamp() + '.csv', rows);
    UI.toast(fr() ? 'Plan 7 jours exporté (' + rows.length + ' lignes)' : '7-day plan exported (' + rows.length + ' rows)', { tone: 'good', icon: '⇩' });
  }
  function exportRecs() {
    const rows = recommendations(State.profile).map((r) => ({
      priority: r.priority, category: r.category, title: r.title, detail: r.text,
      estimated_impact: r.impact, rationale: r.why, evidence: r.evidence, evidence_level: r.level, tone: r.tone
    }));
    NV.export.downloadCSV('nutri1-action-plan-' + stamp() + '.csv', rows);
    UI.toast(fr() ? 'Plan d\'action exporté (' + rows.length + ' recommandations)' : 'Action plan exported (' + rows.length + ' recommendations)', { tone: 'good', icon: '⇩' });
  }
  function reportHTML() {
    const p = State.profile, sc = State.cache.sc, r = State.cache.risks, it = State.cache.it, d = State.cache.d;
    const o = simOutcomes(), pl = currentPlan();
    const line = (k, v) => '<tr><td>' + U.esc(k) + '</td><td><b>' + v + '</b></td></tr>';
    return '<style>body{font-family:system-ui,sans-serif;color:#12211a}h1{font-size:20px}h2{font-size:15px;margin-top:18px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:4px 6px;border-bottom:1px solid #eee;text-align:left}.tag{display:inline-block;padding:2px 7px;border-radius:99px;background:#eaf7f0;color:#0a6b41;font-size:11px}</style>' +
      '<h1>NUTRI.N°1 — ' + U.esc(fr() ? 'Rapport nutritionnel citoyen 360°' : 'Citizen 360° nutrition report') + '</h1>' +
      '<p>' + U.esc(heroName()) + ' · ' + U.esc((p.sex === 'male' ? (fr() ? 'Homme' : 'Male') : p.sex === 'child' ? (fr() ? 'Enfant' : 'Child') : (fr() ? 'Femme' : 'Female'))) + ', ' + U.fmtInt(p.age) + ' ' + U.esc(fr() ? 'ans' : 'years') + ' · ' + U.esc(countryName()) + ' · ' + new Date().toLocaleString() + '</p>' +
      '<h2>' + U.esc(fr() ? 'Synthèse' : 'Summary') + '</h2><table>' +
      line(fr() ? 'NutriScore NUTRI.N°1' : 'NUTRI.N°1 NutriScore', sc.total + '/100 · ' + bandLabel(sc.band)) +
      line('BMI', U.fmt(d.bmi, 1) + ' kg/m²') + line(fr() ? 'Tour de taille' : 'Waist', U.fmt(p.waist, 0) + ' cm') +
      line(fr() ? 'Pression artérielle' : 'Blood pressure', U.fmt(p.sbp, 0) + '/' + U.fmt(p.dbp, 0) + ' mmHg') +
      line(fr() ? 'Glycémie / HbA1c' : 'Glucose / HbA1c', U.fmt(p.glucose, 0) + ' mg/dL · ' + U.fmt(p.hba1c, 1) + ' %') +
      line(fr() ? 'Apport énergétique' : 'Energy intake', U.fmtInt(it.energy) + ' / ' + U.fmtInt(d.req.energy) + ' kcal') +
      line(fr() ? 'Années en bonne santé (10 ans)' : 'Healthy years (10 y)', U.fmt(markovRun(p, scenarioProfile(), 10, 400).healthyYears, 2) + '/10') +
      '</table>' +
      '<h2>' + U.esc(fr() ? 'Risques à 10 ans' : '10-year risks') + '</h2><table><tr><th>' + U.esc(fr() ? 'Pathologie' : 'Condition') + '</th><th>P</th><th>IC 90 %</th><th>' + U.esc(fr() ? 'Bande' : 'Band') + '</th></tr>' +
      Object.keys(r).map((k) => '<tr><td>' + U.esc(r[k].label) + '</td><td>' + U.pct(r[k].p * 100, 1) + '</td><td>' + U.pct(r[k].ci[0] * 100, 1) + '–' + U.pct(r[k].ci[1] * 100, 1) + '</td><td>' + U.esc(r[k].band.label) + '</td></tr>').join('') + '</table>' +
      '<h2>' + U.esc(fr() ? 'Impact du scénario sélectionné' : 'Impact of the selected scenario') + '</h2><table>' +
      line('NutriScore', U.signed(o.score.delta, 0) + ' pts (' + o.score.base + ' → ' + o.score.scen + ')') +
      line(fr() ? 'Années en bonne santé' : 'Healthy years', U.signed(o.healthyYears.delta, 2)) +
      line(fr() ? 'Coûts de santé évités' : 'Health costs avoided', '$' + U.fmtInt(o.cost.usd) + ' · ' + o.cost.days + ' ' + (fr() ? 'jours de productivité' : 'productivity days')) +
      line(fr() ? 'Empreinte alimentaire' : 'Food footprint', U.signed(o.footprint.delta, 0) + ' kg CO₂e/an') +
      '</table>' +
      '<h2>' + U.esc(fr() ? 'Plan alimentaire local & bio' : 'Local & organic food plan') + '</h2><table>' +
      line(fr() ? 'Coût / jour' : 'Cost / day', money(pl.cost)) + line(fr() ? 'Énergie / jour' : 'Energy / day', U.fmtInt(pl.avg.energy) + ' kcal') +
      line(fr() ? 'Part bio tracée' : 'Traceable organic share', U.fmtInt(pl.organicPct) + ' %') +
      line(fr() ? 'Qualité du plan' : 'Plan quality', pl.score + '/100') + '</table>' +
      '<h2>' + U.esc(fr() ? 'Recommandations prioritaires' : 'Priority recommendations') + '</h2><table>' +
      recommendations(p).slice(0, 8).map((x) => '<tr><td>' + x.icon + ' ' + U.esc(x.title) + '</td><td>' + U.esc(x.impact) + '</td><td><span class="tag">' + U.esc(x.evidence) + '</span></td></tr>').join('') + '</table>' +
      '<p style="margin-top:14px;font-size:11px;color:#5b6b62">' + U.esc(fr() ? 'Document généré par le moteur NutriVision (Holt amorti + Monte-Carlo bootstrap, risque logistique explicable, cohorte de Markov, optimiseur de plan local). Démo — ne remplace pas un avis médical.'
        : 'Generated by the NutriVision engine (damped Holt + bootstrap Monte-Carlo, explainable logistic risk, Markov cohort, local plan optimiser). Demo — not a substitute for medical advice.') + '</p>';
  }
  function printReport() {
    NV.export.print(reportHTML(), 'NUTRI.N°1 — ' + (fr() ? 'Rapport citoyen 360°' : 'Citizen 360° report'));
    UI.toast(fr() ? 'Rapport envoyé à l\'impression' : 'Report sent to print', { tone: 'good', icon: '🖨' });
  }
  function shareProfile() {
    const payload = { v: 1, c: countryCode(), p: State.profile, s: State.scenario, k: State.settings };
    const txt = JSON.stringify(payload);
    const enc = (global.btoa ? global.btoa(unescape(encodeURIComponent(txt))) : txt);
    const url = (global.location.origin || '') + (global.location.pathname || '') + '#citizen' + enc.slice(0, 0) + '?nv=' + enc.slice(0, 900);
    const done = function () { UI.toast(fr() ? 'Lien de partage copié (chiffré côté démonstrateur)' : 'Share link copied (demo-side encrypted)', { tone: 'good', icon: '🔐' }); };
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(function () { openShareModal(url); });
    } else openShareModal(url);
  }
  function openShareModal(url) {
    const m = UI.modal({
      pill: 'RGPD / GDPR', title: U.esc(fr() ? 'Partage sécurisé du profil' : 'Secure profile sharing'), size: 'md',
      body: '<p class="nv-sub">' + U.esc(fr() ? 'Ce lien contient vos mesures encodées. Il permet à un nutritionniste du réseau de pré-remplir une consultation. Vous restez propriétaire de la donnée.' : 'This link contains your encoded measurements. It lets a network nutritionist pre-fill a consultation. You remain the data owner.') + '</p>' +
        '<textarea class="nv-input" rows="4" readonly>' + U.esc(url) + '</textarea>' +
        '<div class="nv-row" style="margin-top:8px">' + UI.chip(fr() ? 'Aucune donnée envoyée à un serveur' : 'No data sent to a server', 'good') + UI.chip(fr() ? 'Révocable à tout moment' : 'Revocable at any time', 'ok') + '</div>',
      actions: UI.btn(fr() ? 'Télécharger le JSON' : 'Download JSON', { action: 'sh-json', icon: '⇩', kind: 'primary' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'sh-close', kind: 'ghost' })
    });
    m.el.addEventListener('click', function (e) {
      const b = e.target.closest('[data-nv-action]');
      if (!b) return;
      const a = b.getAttribute('data-nv-action');
      if (a === 'sh-json') { exportJSON(); m.close(); }
      else if (a === 'sh-close') m.close();
    });
  }

  /* ---- modales ------------------------------------------------------------ */
  function modalActions(m, map) {
    m.el.addEventListener('click', function (e) {
      const b = e.target.closest('[data-nv-action]');
      if (!b || !m.el.contains(b)) return;
      const a = b.getAttribute('data-nv-action');
      if (map[a]) { e.preventDefault(); map[a](b, m); }
    });
  }
  function confirmModal(title, text, onYes) {
    const m = UI.modal({
      pill: fr() ? 'Confirmation' : 'Confirm', title: U.esc(title), size: 'sm',
      body: '<p class="nv-sub" style="font-size:14px">' + U.esc(text) + '</p>',
      actions: UI.btn(fr() ? 'Annuler' : 'Cancel', { action: 'cf-no', kind: 'ghost' }) + UI.btn(fr() ? 'Confirmer' : 'Confirm', { action: 'cf-yes', kind: 'primary' })
    });
    modalActions(m, {
      'cf-yes': function (b, mm) { mm.close(); if (onYes) onYes(); },
      'cf-no': function (b, mm) { mm.close(); }
    });
    return m;
  }
  const GROUP_LABELS = {
    cereals: ['Cereals', 'Céréales'], tubers: ['Tubers & roots', 'Tubercules'], legumes: ['Legumes & nuts', 'Légumineuses'],
    oilseeds: ['Oilseeds', 'Oléagineux'], veg: ['Vegetables', 'Légumes'], fruit: ['Fruits', 'Fruits'],
    animal: ['Animal-source', 'Produits animaux'], oils: ['Fats & oils', 'Matières grasses'], special: ['Fortified & special', 'Enrichis'],
    processed: ['Processed', 'Transformés'], upf: ['Ultra-processed', 'Ultra-transformés'], dairy: ['Dairy', 'Laitier'], fish: ['Fish', 'Poisson']
  };
  function openFoodsModal() {
    const code = countryCode();
    const m = UI.modal({
      pill: countryName(), size: 'lg',
      title: U.esc(fr() ? 'Base alimentaire analysée en laboratoire' : 'Lab-analysed food database'),
      subtitle: U.esc(fr() ? 'Composition mesurée · saisonnalité · prix marché · traçabilité bio. Vos achats orientent la production locale.' : 'Measured composition · seasonality · market price · organic traceability. Your purchases steer local production.'),
      body:
        '<div class="nv-row" style="margin-bottom:10px">' +
          '<input id="nvFoodQ" class="nv-input" placeholder="' + U.esc(fr() ? 'Rechercher un aliment…' : 'Search a food…') + '" style="flex:1;min-width:180px">' +
          '<select id="nvFoodG" class="nv-select"><option value="">' + U.esc(fr() ? 'Tous les groupes' : 'All groups') + '</option>' +
            Object.keys(GROUP_LABELS).map((g) => '<option value="' + g + '">' + U.esc(fr() ? GROUP_LABELS[g][1] : GROUP_LABELS[g][0]) + '</option>').join('') + '</select>' +
          '<label class="nv-check"><input type="checkbox" id="nvFoodSeason"> ' + U.esc(fr() ? 'De saison' : 'In season') + '</label>' +
          '<label class="nv-check"><input type="checkbox" id="nvFoodOrganic"> ' + U.esc(fr() ? 'Bio disponible' : 'Organic available') + '</label>' +
        '</div>' +
        '<div id="nvFoodTbl" class="nv-scroll" style="max-height:54vh"></div>',
      actions: '<span class="nv-note" id="nvFoodCount"></span>' + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'fd-close', kind: 'ghost' })
    });
    const draw = function () {
      const q = (U.qs('#nvFoodQ', m.el).value || '').toLowerCase();
      const g = U.qs('#nvFoodG', m.el).value;
      const onlySeason = U.qs('#nvFoodSeason', m.el).checked;
      const onlyOrg = U.qs('#nvFoodOrganic', m.el).checked;
      const rows = FOODS.filter((f) =>
        (!g || f.group === g) &&
        (!q || (f.en + ' ' + f.fr + ' ' + f.group).toLowerCase().indexOf(q) >= 0) &&
        (!onlySeason || inSeason(f)) &&
        (!onlyOrg || f.organic > 0.25)
      );
      const cols = [
        { key: 'icon', label: '', render: (v, r) => r.icon },
        { key: 'name', label: fr() ? 'Aliment' : 'Food', render: (v, r) => '<b>' + U.esc(foodName(r)) + '</b>' + (r.upf ? ' <span class="nv-chip nv-chip-risk">UPF</span>' : '') + '<br><span class="nv-note">' + U.esc(r.group) + '</span>' },
        { key: 'kcal', label: 'kcal/100g', align: 'right' },
        { key: 'protein', label: 'P (g)', align: 'right' },
        { key: 'fiber', label: fr() ? 'Fibres' : 'Fibre', align: 'right' },
        { key: 'iron', label: 'Fe (mg)', align: 'right' },
        { key: 'vitA', label: 'Vit A (µg)', align: 'right' },
        { key: 'sodium', label: 'Na (mg)', align: 'right' },
        { key: 'gi', label: 'IG', align: 'right', render: (v) => v ? U.fmt(v, 0) : '—' },
        { key: 'price', label: '$/kg', align: 'right' },
        { key: 'organic', label: fr() ? 'Bio' : 'Organic', align: 'center', render: (v) => v > 0.5 ? '🌱 ' + U.pct(v * 100, 0) : v > 0.2 ? U.pct(v * 100, 0) : '—' },
        { key: 'season', label: fr() ? 'Saison' : 'Season', align: 'center', render: (v, r) => inSeason(r) ? '<span class="nv-chip nv-chip-good">' + U.esc(fr() ? 'oui' : 'yes') + '</span>' : '<span class="nv-chip nv-chip-warn">' + U.esc(fr() ? 'non' : 'no') + '</span>' },
        { key: 'add', label: '', align: 'center', render: (v, r) => '<button class="nv-btn sm" data-nv-action="fd-add" data-nv-arg="' + r.id + '">📥</button>' }
      ];
      U.qs('#nvFoodTbl', m.el).innerHTML = UI.table(cols, rows);
      U.qs('#nvFoodCount', m.el).textContent = rows.length + ' / ' + FOODS.length + ' ' + (fr() ? 'aliments' : 'foods');
    };
    m.el.addEventListener('input', draw);
    m.el.addEventListener('change', draw);
    modalActions(m, {
      'fd-close': function (b, mm) { mm.close(); },
      'fd-add': function (b, mm) {
        journalAdd(b.getAttribute('data-nv-arg'), b);
        mm.close();
        scrollTo('#nvJournalPanel');
      }
    });
    draw();
  }
  const EVIDENCE = [
    { icon: '🧂', lvl: 3, src: 'OMS / WHO 2012 & 2020', title: ['Sodium intake < 2 g/day reduces blood pressure and CVD risk', 'Apport sodé < 2 g/j réduit la pression artérielle et le risque cardiovasculaire'], eff: ['−5 à −8 mmHg de PAS', '−5 to −8 mmHg SBP'] },
    { icon: '🥬', lvl: 3, src: 'GBD Diet Collaborators, The Lancet 2019', title: ['Low whole-grain, low fruit and high sodium are the leading dietary risk factors', 'Céréales complètes, fruits et sel sont les premiers facteurs de risque alimentaires'], eff: ['11 M décès/an attribuables', '11 M deaths/year attributable'] },
    { icon: '🩸', lvl: 3, src: 'IDF Diabetes Atlas 2021 — Région Afrique', title: ['70 % of adults with diabetes live in low- and middle-income countries', '70 % des adultes diabétiques vivent dans des pays à revenu faible ou intermédiaire'], eff: ['Prévention primaire = levier n°1', 'Primary prevention = top lever'] },
    { icon: '⚖️', lvl: 2, src: 'Look AHEAD / DPP (cohortes randomisées)', title: ['5–7 % weight loss + 150 min activity reduces diabetes incidence by 58 %', 'Perte de 5–7 % + 150 min d\'activité réduisent l\'incidence du diabète de 58 %'], eff: ['−58 % d\'incidence', '−58 % incidence'] },
    { icon: '🍽️', lvl: 2, src: 'FAO / FHI 360 — MDD-W', title: ['Minimum dietary diversity for women: 5 of 10 food groups', 'Diversité alimentaire minimale pour les femmes : 5 groupes sur 10'], eff: ['Proxy d\'adéquation micronutritionnelle', 'Micronutrient adequacy proxy'] },
    { icon: '🌱', lvl: 2, src: 'IFOAM & UNEP 2021 — Afrique de l\'Ouest', title: ['Organic demand signals raise smallholder income and reduce input exposure', 'Le signal de demande bio augmente le revenu des petits producteurs'], eff: ['+18 % de marge producteur', '+18 % producer margin'] },
    { icon: '🧪', lvl: 1, src: 'INFOODS / tables nationales de composition', title: ['Foods analysed in partner laboratories per country', 'Aliments analysés en laboratoire partenaire par pays'], eff: ['Base 56 aliments, 22 nutriments', '56 foods, 22 nutrients'] },
    { icon: '🏫', lvl: 2, src: 'WFP — State of School Feeding 2022', title: ['School meals improve attendance and dietary diversity in children', 'Les cantines scolaires améliorent l\'assiduité et la diversité des enfants'], eff: ['+0,6 z-score de croissance', '+0.6 growth z-score'] }
  ];
  function openEvidenceModal() {
    const m = UI.modal({
      pill: fr() ? 'Graphe des preuves' : 'Evidence graph', size: 'lg',
      title: U.esc(fr() ? 'Fondements scientifiques du moteur' : 'Scientific foundations of the engine'),
      subtitle: U.esc(fr() ? 'Chaque coefficient du modèle est adossé à une source publiée. Niveaux : 3 = méta-analyse/OMS, 2 = cohorte, 1 = données locales.' : 'Every model coefficient is backed by a published source. Levels: 3 = meta-analysis/WHO, 2 = cohort, 1 = local data.'),
      body: '<div class="nv-list">' + EVIDENCE.map((e) =>
        '<div class="nv-item" data-tone="' + (e.lvl === 3 ? 'good' : e.lvl === 2 ? 'ok' : 'info') + '"><span class="nv-item-icon">' + e.icon + '</span>' +
        '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(fr() ? e.title[1] : e.title[0]) + '</div>' +
        '<div class="nv-item-text">' + U.esc(e.src) + ' · ' + U.esc(fr() ? e.eff[1] : e.eff[0]) + '</div></div>' +
        '<div class="nv-item-side"><span class="nv-chip nv-chip-' + (e.lvl === 3 ? 'good' : e.lvl === 2 ? 'ok' : 'info') + '">' + U.esc(fr() ? 'Niveau ' : 'Level ') + e.lvl + '</span></div></div>').join('') + '</div>',
      actions: UI.btn(fr() ? 'Ouvrir Recherche & preuves' : 'Open Research & evidence', { action: 'ev-go', icon: '🔬' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'ev-close', kind: 'ghost' })
    });
    modalActions(m, { 'ev-close': function (b, mm) { mm.close(); }, 'ev-go': function (b, mm) { mm.close(); gotoSection('research'); } });
  }
  const NUTRITIONISTS = [
    { name: 'Aïcha Diallo', spec: ['Diabetes & metabolic nutrition', 'Diabète & nutrition métabolique'], city: 'Dakar', rating: 4.9, sessions: 412, price: 18, modes: ['tele', 'center'] },
    { name: 'Kwame Mensah', spec: ['Sports & cardiometabolic nutrition', 'Nutrition sportive & cardiométabolique'], city: 'Accra', rating: 4.8, sessions: 288, price: 15, modes: ['tele', 'chat'] },
    { name: 'Ngozi Okonkwo', spec: ['Maternal & child nutrition', 'Nutrition maternelle & infantile'], city: 'Lagos', rating: 5.0, sessions: 531, price: 20, modes: ['center', 'chat'] },
    { name: 'Fatoumata Cissé', spec: ['Renal & NCD prevention nutrition', 'Nutrition rénale & prévention MNT'], city: 'Abidjan', rating: 4.7, sessions: 197, price: 16, modes: ['tele', 'chat'] }
  ];
  function openBookingModal() {
    const m = UI.modal({
      pill: fr() ? 'Réseau NUTRI.N°1' : 'NUTRI.N°1 network', size: 'md',
      title: U.esc(fr() ? 'Prendre rendez-vous avec un nutritionniste' : 'Book an appointment with a nutritionist'),
      subtitle: U.esc(fr() ? 'Votre dossier (score, risques, plan) est transmis de façon sécurisée avec votre consentement.' : 'Your file (score, risks, plan) is shared securely with your consent.'),
      body: '<div class="nv-list" id="nvBookList">' + NUTRITIONISTS.map((n, i) =>
        '<div class="nv-item"><span class="nv-item-icon">' + UI.avatar(initials(n.name)) + '</span>' +
        '<div class="nv-item-body"><div class="nv-item-title">' + U.esc(n.name) + ' · ' + U.esc(n.city) + '</div>' +
        '<div class="nv-item-text">' + U.esc(fr() ? n.spec[1] : n.spec[0]) + '</div>' +
        '<div class="nv-row" style="margin-top:4px">' + UI.chip('★ ' + U.fmt(n.rating, 1), 'good') + UI.chip(U.fmtInt(n.sessions) + ' ' + (fr() ? 'consultations' : 'sessions'), 'neutral') +
        n.modes.map((mo) => UI.chip(mo === 'tele' ? (fr() ? 'Téléconsultation' : 'Teleconsult') : mo === 'chat' ? 'Chat' : (fr() ? 'En centre' : 'In centre'), 'info')).join('') + '</div></div>' +
        '<div class="nv-item-side"><b>' + money(n.price) + '</b><span>' + U.esc(fr() ? '/ 45 min' : '/ 45 min') + '</span>' +
        '<button class="nv-btn sm primary" data-nv-action="bk-pick" data-nv-arg="' + i + '" style="margin-top:6px">' + U.esc(fr() ? 'Choisir' : 'Select') + '</button></div></div>').join('') +
        '</div><div id="nvBookStage" style="margin-top:12px"></div>',
      actions: UI.btn(fr() ? 'Partager mon dossier (JSON)' : 'Share my file (JSON)', { action: 'bk-json', icon: '⇩', kind: 'ghost' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'bk-close', kind: 'ghost' })
    });
    modalActions(m, {
      'bk-close': function (b, mm) { mm.close(); },
      'bk-json': function () { exportJSON(); },
      'bk-pick': function (b, mm) {
        const n = NUTRITIONISTS[U.num(b.getAttribute('data-nv-arg'), 0)] || NUTRITIONISTS[0];
        const stage = U.qs('#nvBookStage', mm.el);
        const api = UI.stepper(stage, [
          { label: fr() ? 'Consentement RGPD' : 'GDPR consent', text: fr() ? 'Dossier chiffré, partage révocable' : 'Encrypted file, revocable sharing' },
          { label: fr() ? 'Créneau' : 'Slot', text: fr() ? 'Demain 09:30 (fuseau local)' : 'Tomorrow 09:30 (local time)' },
          { label: fr() ? 'Paiement mobile money' : 'Mobile money payment', text: money(n.price) + ' · ' + n.city },
          { label: fr() ? 'Confirmation' : 'Confirmation', text: 'NV-' + U.hash(n.name + Date.now()).toString(36).toUpperCase().slice(0, 6) }
        ], { stepMs: 620, doneText: fr() ? '✓ Rendez-vous confirmé avec ' + n.name : '✓ Appointment confirmed with ' + n.name });
        api.run({ onDone: function () { UI.toast(fr() ? 'Rendez-vous confirmé — ' + n.name + ' · ' + n.city : 'Appointment confirmed — ' + n.name + ' · ' + n.city, { tone: 'good', icon: '👩🏾‍⚕️' }); } });
      }
    });
  }
  function openModelModal() {
    const r = State.cache.risks || risksFor(State.profile);
    const mk = markovRun(State.profile, scenarioProfile(), 10, 400);
    const sel = State.settings.riskSel || 't2d';
    const x = r[sel] || r.t2d;
    const l0 = S.logit(x.p0 == null ? x.p : x.p0);
    const m = UI.modal({
      pill: fr() ? 'Transparence du modèle' : 'Model transparency', size: 'lg',
      title: U.esc(fr() ? 'Sous le capot du moteur NutriVision' : 'Under the hood of the NutriVision engine'),
      subtitle: U.esc(fr() ? 'Aucune boîte noire : chaque sortie est traçable, paramétrée et rejouable.' : 'No black box: every output is traceable, parameterised and replayable.'),
      body:
        '<div class="nv-grid nv-g2">' +
        '<section><h4>📈 ' + U.esc(fr() ? 'Prévision de séries' : 'Series forecasting') + '</h4><div class="nv-note">' +
        U.esc(fr() ? 'Lissage exponentiel de Holt à tendance amortie (φ = 0,86) sur 12 points mensuels, puis Monte-Carlo par rééchantillonnage bootstrap des résidus (σ = ' : 'Damped-trend Holt exponential smoothing (φ = 0.86) on 12 monthly points, then bootstrap Monte-Carlo on residuals (σ = ') +
        U.fmt(S.sd(forecastVar(sel, 12, false).past), 2) + (fr() ? '). Les scénarios ajoutent une dérive mensuelle déterministe dérivée des leviers.' : '). Scenarios add a deterministic monthly drift derived from the levers.') +
        '</div>' + UI.table(
          [{ key: 'v', label: fr() ? 'Variable' : 'Variable' }, { key: 'today', label: fr() ? 'Aujourd\'hui' : 'Today', align: 'right' }, { key: 'p50', label: 'P50', align: 'right' }, { key: 'ic', label: 'IC 80 %', align: 'right' }, { key: 'drift', label: fr() ? 'Drive/mois' : 'Drift/mo', align: 'right' }],
          PRED_VARS.map((v) => { const f = forecastVar(v.id, U.num(State.settings.horizon, 24), true); const n = f.months; return { v: predVarLabel(v), today: U.fmt(f.past[f.past.length - 1], v.digits), p50: U.fmt(f.fc.point[n - 1], v.digits), ic: U.fmt(f.fc.p10[n - 1], v.digits) + ' – ' + U.fmt(f.fc.p90[n - 1], v.digits), drift: U.signed(f.drift, 3) }; })
        ) + '</section>' +
        '<section><h4>🎯 ' + U.esc(fr() ? 'Risque logistique explicable' : 'Explainable logistic risk') + '</h4><div class="nv-note">' +
        U.esc(fr() ? 'Logit(p) = β₀ + Σ βᵢ·fᵢ(x), fᵢ bornées. Contributions = effet marginal de chaque facteur sur l\'échelle logit. IC 90 % par bootstrap des contributions.' : 'Logit(p) = β₀ + Σ βᵢ·fᵢ(x), bounded fᵢ. Contributions = marginal effect of each factor on the logit scale. 90 % CI by bootstrap over contributions.') +
        '</div>' + UI.table(
          [{ key: 'f', label: fr() ? 'Facteur' : 'Factor' }, { key: 'd', label: 'Δ logit', align: 'right' }, { key: 'pp', label: fr() ? 'Impact (pts de risque)' : 'Impact (risk points)', align: 'right' }],
          x.contributions.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map((c) => ({ f: c.label, d: U.signed(c.delta, 2), pp: U.signed((S.sigmoid(l0 + c.delta) - x.p) * 100, 1) }))
        ) + '</section>' +
        '<section><h4>🔁 ' + U.esc(fr() ? 'Cohorte de Markov (10 ans)' : 'Markov cohort (10 y)') + '</h4>' +
        UI.table(
          [{ key: 'from', label: fr() ? 'De \\ Vers' : 'From \\ To' }].concat(MARKOV_STATES.map((s, i) => ({ key: 's' + i, label: (i + 1) + '. ' + t(s).split(' ')[0], align: 'right' }))),
          mk.P.map((row, i) => { const o = { from: t(MARKOV_STATES[i]) }; row.forEach((v, j) => { o['s' + j] = U.fmt(v * 100, 1) + '%'; }); return o; })
        ) +
        '<div class="nv-note" style="margin-top:6px">' + U.esc(fr() ? 'Années en bonne santé (QALY simplifié) = Σ wₛ·πₛ avec w = [1, 0.93, 0.76, 0.50, 0.22]. ' + U.fmtInt(mk.trials) + ' trajectoires individuelles tirées.' : 'Healthy years (simplified QALY) = Σ wₛ·πₛ with w = [1, 0.93, 0.76, 0.50, 0.22]. ' + U.fmtInt(mk.trials) + ' individual trajectories sampled.') + '</div></section>' +
        '<section><h4>🍽️ ' + U.esc(fr() ? 'Optimiseur de plan alimentaire' : 'Food plan optimiser') + '</h4><div class="nv-note">' +
        U.esc(fr() ? 'Recherche locale stochastique (320 permutations) sur un score pondéré : couverture des besoins (0,42), densité nutritionnelle (0,20), coût (0,16), saisonnalité (0,12), part bio (0,10). Calibrage énergétique itératif sur 6 passes. Pool = aliments du pays analysés en laboratoire.'
          : 'Stochastic local search (320 permutations) over a weighted score: requirement coverage (0.42), nutrient density (0.20), cost (0.16), seasonality (0.12), organic share (0.10). Iterative energy calibration over 6 passes. Pool = country foods analysed in the lab.') +
        '</div>' + UI.table(
          [{ key: 'k', label: fr() ? 'Nutriment' : 'Nutrient' }, { key: 'req', label: fr() ? 'Besoin' : 'Requirement', align: 'right' }, { key: 'plan', label: fr() ? 'Plan' : 'Plan', align: 'right' }, { key: 'pct', label: '%', align: 'right' }],
          ['energy', 'protein', 'fiber', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate', 'potassium', 'sodium'].map((k) => {
            const c = currentPlan().coverage[k];
            return { k: k, req: U.fmtInt(c.req), plan: U.fmtInt(c.value), pct: U.fmt(c.pct, 0) + '%' };
          })
        ) + '</section>' +
        '</div>',
      actions: UI.btn(fr() ? 'Recalculer tout' : 'Recompute everything', { action: 'md-rec', icon: '↻', kind: 'primary' }) + UI.btn(fr() ? 'Exporter JSON' : 'Export JSON', { action: 'md-json', icon: '⇩' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'md-close', kind: 'ghost' })
    });
    modalActions(m, {
      'md-close': function (b, mm) { mm.close(); },
      'md-json': function () { exportJSON(); },
      'md-rec': function (b, mm) { mm.close(); recompute(); }
    });
  }

  function openReportModal() {
    const p = State.profile, sc = State.cache.sc, r = State.cache.risks, o = simOutcomes(), pl = currentPlan();
    const mk = markovRun(p, scenarioProfile(), 10, 400);
    const m = UI.modal({
      pill: fr() ? 'Rapport 360°' : '360° report', size: 'lg',
      title: U.esc(heroName()) + ' — ' + U.esc(fr() ? 'synthèse nutrition & prévention' : 'nutrition & prevention summary'),
      subtitle: U.esc(countryName()) + ' · ' + new Date().toLocaleDateString() + ' · ' + U.esc(fr() ? 'moteur NutriVision' : 'NutriVision engine'),
      body:
        '<div class="nv-grid nv-g4">' +
          UI.kpi({ label: 'NutriScore', value: sc.total, unit: '/100', icon: '🧬', tone: sc.band === 'strong' ? 'good' : sc.band === 'moderate' ? 'warn' : 'risk', chip: bandLabel(sc.band) }) +
          UI.kpi({ label: fr() ? 'Années en bonne santé' : 'Healthy years', value: U.fmt(mk.healthyYears, 2), unit: '/10', icon: '🌿', tone: mk.healthyYears > 8 ? 'good' : 'warn' }) +
          UI.kpi({ label: fr() ? 'Coûts évités (scénario)' : 'Costs avoided (scenario)', value: o.cost.local, icon: '💰', tone: 'good', hint: '<span class="nv-note">' + o.cost.days + ' ' + (fr() ? 'jours de productivité' : 'productivity days') + '</span>' }) +
          UI.kpi({ label: fr() ? 'Plan local & bio' : 'Local organic plan', value: money(pl.cost), unit: '/j', icon: '🍽️', tone: 'info', chip: U.fmtInt(pl.organicPct) + '% 🌱' }) +
        '</div>' +
        '<h4 style="margin:14px 0 6px">' + U.esc(fr() ? 'Risques à 10 ans' : '10-year risks') + '</h4>' +
        UI.table(
          [{ key: 'l', label: fr() ? 'Pathologie' : 'Condition' }, { key: 'p', label: 'P', align: 'right' }, { key: 'ci', label: 'IC 90 %', align: 'right' }, { key: 'b', label: fr() ? 'Bande' : 'Band' }, { key: 'd', label: fr() ? 'Scénario (Δ pts)' : 'Scenario (Δ pts)', align: 'right' }],
          Object.keys(r).map((k) => ({ l: r[k].label, p: U.pct(r[k].p * 100, 1), ci: U.pct(r[k].ci[0] * 100, 1) + ' – ' + U.pct(r[k].ci[1] * 100, 1), b: '<span class="nv-chip nv-chip-' + r[k].band.tone + '">' + U.esc(r[k].band.label) + '</span>', d: U.signed(o.risks.deltas[k], 1) }))
        ) +
        '<h4 style="margin:14px 0 6px">' + U.esc(fr() ? 'Recommandations prioritaires' : 'Priority recommendations') + '</h4>' +
        '<div class="nv-list">' + recommendations(p).slice(0, 5).map((x) =>
          '<div class="nv-item" data-tone="' + x.tone + '"><span class="nv-item-icon">' + x.icon + '</span><div class="nv-item-body">' +
          '<div class="nv-item-title">' + U.esc(x.title) + '</div><div class="nv-item-text">' + U.esc(x.impact) + ' · ' + U.esc(x.why) + '</div></div>' +
          '<div class="nv-item-side"><span class="nv-chip nv-chip-ok">' + U.esc(x.evidence) + '</span></div></div>').join('') + '</div>',
      actions: UI.btn('JSON', { action: 'rp-json', icon: '⇩' }) + UI.btn('CSV', { action: 'rp-csv', icon: '⇩' }) + UI.btn(fr() ? 'Imprimer / PDF' : 'Print / PDF', { action: 'rp-print', icon: '🖨', kind: 'primary' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'rp-close', kind: 'ghost' })
    });
    modalActions(m, {
      'rp-json': function () { exportJSON(); }, 'rp-csv': function () { exportCSV(); },
      'rp-print': function (b, mm) { mm.close(); printReport(); }, 'rp-close': function (b, mm) { mm.close(); }
    });
  }
  function shoppingList() {
    const pl = currentPlan();
    const agg = {};
    pl.days.forEach((d) => d.meals.forEach((mm) => mm.items.forEach((x) => {
      const k = x.f.id;
      if (!agg[k]) agg[k] = { f: x.f, grams: 0, organic: 0, cost: 0 };
      agg[k].grams += x.g;
      agg[k].cost += x.f.price * x.g / 100;
      if (x.organic) agg[k].organic++;
    })));
    return Object.keys(agg).map((k) => agg[k]).sort((a, b) => b.cost - a.cost);
  }
  function openShoppingModal() {
    const list = shoppingList();
    const total = list.reduce((a, x) => a + x.cost, 0);
    const organicShare = list.reduce((a, x) => a + x.organic, 0) / Math.max(1, list.reduce((a, x) => a + 7, 0));
    const m = UI.modal({
      pill: fr() ? '7 jours' : '7 days', size: 'md',
      title: U.esc(fr() ? 'Liste de courses — ' + countryName() : 'Shopping list — ' + countryName()),
      subtitle: U.esc(fr() ? 'Quantités cumulées sur le plan de 7 jours, prix marché local et part bio tracée.' : 'Quantities cumulated over the 7-day plan, local market prices and traceable organic share.'),
      body: UI.table(
        [{ key: 'i', label: '' }, { key: 'n', label: fr() ? 'Aliment' : 'Food' }, { key: 'g', label: fr() ? 'Quantité' : 'Quantity', align: 'right' }, { key: 'c', label: fr() ? 'Coût' : 'Cost', align: 'right' }, { key: 'o', label: fr() ? 'Bio' : 'Organic', align: 'center' }],
        list.map((x) => ({ i: x.f.icon, n: foodName(x.f) + (inSeason(x.f) ? '' : ' 📅'), g: U.fmtInt(x.grams) + ' g', c: money(x.cost), o: x.organic ? U.fmtInt(x.organic) + '/7 🌱' : '—' }))
      ) + '<div class="nv-row" style="margin-top:10px">' + UI.chip(fr() ? 'Total 7 jours : ' + money(total) : 'Total 7 days: ' + money(total), 'good') +
        UI.chip(fr() ? '≈ ' + money(total / 7) + ' / jour' : '≈ ' + money(total / 7) + ' / day', 'ok') +
        UI.chip(fr() ? 'Part bio : ' + U.pct(organicShare * 100, 0) : 'Organic share: ' + U.pct(organicShare * 100, 0), 'info') +
        UI.chip(fr() ? 'Dépense reversée aux producteurs locaux' : 'Spending returned to local producers', 'neutral') + '</div>',
      actions: UI.btn(fr() ? 'Exporter CSV' : 'Export CSV', { action: 'sh2-csv', icon: '⇩', kind: 'primary' }) + UI.btn(fr() ? 'Voir le marché bio' : 'Open organic market', { action: 'sh2-go', icon: '🛒' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'sh2-close', kind: 'ghost' })
    });
    modalActions(m, {
      'sh2-close': function (b, mm) { mm.close(); },
      'sh2-go': function (b, mm) { mm.close(); gotoSection('marketplace'); },
      'sh2-csv': function () {
        NV.export.downloadCSV('nutri1-shopping-' + countryCode() + '-' + stamp() + '.csv', list.map((x) => ({
          food: foodName(x.f), food_en: x.f.en, group: x.f.group, grams_7d: Math.round(x.grams),
          organic_meals: x.organic, cost_usd_7d: Math.round(x.cost * 100) / 100, in_season: inSeason(x.f) ? 1 : 0
        })));
        UI.toast(fr() ? 'Liste de courses exportée' : 'Shopping list exported', { tone: 'good', icon: '🧺' });
      }
    });
  }
  function openSyncModal(el) {
    pulse(el);
    const m = UI.modal({
      pill: fr() ? 'Objets connectés' : 'Connected devices', size: 'md',
      title: U.esc(fr() ? 'Synchronisation des capteurs' : 'Sensor synchronisation'),
      subtitle: U.esc(fr() ? 'Montre, capteur de glucose en continu, balance connectée, téléphone (podomètre, hydratation).' : 'Watch, continuous glucose monitor, connected scale, phone (pedometer, hydration).'),
      body:
        '<div class="nv-list">' +
        [['⌚', fr() ? 'Montre — FC, VFC, SpO₂, sommeil' : 'Watch — HR, HRV, SpO₂, sleep', 'good'],
        ['🩸', fr() ? 'CGM — glucose interstitiel 5 min' : 'CGM — interstitial glucose every 5 min', 'good'],
        ['⚖️', fr() ? 'Balance — poids, masse grasse' : 'Scale — weight, body fat', 'ok'],
        ['📱', fr() ? 'Téléphone — pas, hydratation, activité' : 'Phone — steps, hydration, activity', 'ok']].map((d) =>
          '<div class="nv-item" data-tone="' + d[2] + '"><span class="nv-item-icon">' + d[0] + '</span><div class="nv-item-body"><div class="nv-item-title">' + U.esc(d[1]) + '</div>' +
          '<div class="nv-item-text">' + U.esc(fr() ? 'Dernière synchronisation : il y a ' : 'Last sync: ') + RNG('sync').int(2, 48) + ' min</div></div>' +
          '<div class="nv-item-side"><span class="nv-chip nv-chip-' + d[2] + '">BLE</span></div></div>').join('') +
        '</div><div id="nvSyncStage" style="margin-top:12px"></div>',
      actions: UI.btn(fr() ? 'Importer dans mon profil' : 'Import into my profile', { action: 'sy-import', icon: '⬇', kind: 'primary', disabled: false }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'sy-close', kind: 'ghost' })
    });
    const api = UI.stepper(U.qs('#nvSyncStage', m.el), [
      { label: fr() ? 'Découverte BLE' : 'BLE discovery', text: fr() ? '4 appareils détectés' : '4 devices found' },
      { label: fr() ? 'Transfert chiffré' : 'Encrypted transfer', text: 'AES-256 · 12 kB' },
      { label: fr() ? 'Contrôle qualité' : 'Quality control', text: fr() ? '0 valeur aberrante' : '0 outlier' },
      { label: fr() ? 'Recalcul des modèles' : 'Model recomputation', text: fr() ? 'Score, risques, prévisions' : 'Score, risks, forecasts' }
    ], { stepMs: 560, doneText: fr() ? '✓ Synchronisation terminée' : '✓ Synchronisation complete' });
    api.run({
      onDone: function () {
        State.live.steps = Math.round(U.clamp(State.live.steps + RNG('sy' + Date.now()).int(400, 2600), 0, 24000));
        State.profile.activityMin = Math.round(U.clamp(State.live.steps / 62, 0, 900));
        State.profile.sleep = Math.round(U.clamp(State.live.sleep, 3, 11) * 10) / 10;
        State.profile.water = Math.round(U.clamp(State.live.water, 0, 6) * 10) / 10;
        State.history = null;
        save('all');
        renderQuick();
        renderHeavy();
      }
    });
    modalActions(m, {
      'sy-close': function (b, mm) { api.clear(); mm.close(); },
      'sy-import': function (b, mm) { api.clear(); mm.close(); fillFromDevices(); }
    });
  }
  function openChildModal(id) {
    const c = childById(id || State.settings.child);
    const z = childZ(c), gs = childGrowthSeries(c);
    const req = requirements({ sex: c.sex, age: c.age, weight: c.weight, height: c.height, activityMin: 420 });
    const m = UI.modal({
      pill: '🔐 ' + U.esc(t('fam.title')), size: 'lg',
      title: U.esc(c.name) + ' — ' + U.fmtInt(c.age) + ' ' + U.esc(fr() ? 'ans' : 'years') + ' · ' + U.esc(countryName()),
      subtitle: U.esc(fr() ? 'Suivi de croissance OMS (z-scores), diversité alimentaire et cantine scolaire connectée.' : 'WHO growth monitoring (z-scores), dietary diversity and connected school feeding.'),
      body:
        '<div class="nv-grid nv-g4">' +
          UI.kpi({ label: fr() ? 'Taille / âge' : 'Height / age', value: U.signed(z.zHeight, 2), unit: 'z', icon: '🧍🏾', tone: z.zHeight > -1 ? 'good' : 'risk', hint: '<span class="nv-note">P' + U.fmt(percentileFromZ(z.zHeight), 0) + ' · ' + U.fmt(c.height, 1) + ' cm</span>' }) +
          UI.kpi({ label: fr() ? 'Poids / âge' : 'Weight / age', value: U.signed(z.zWeight, 2), unit: 'z', icon: '⚖️', tone: Math.abs(z.zWeight) < 1.2 ? 'good' : 'warn', hint: '<span class="nv-note">P' + U.fmt(percentileFromZ(z.zWeight), 0) + ' · ' + U.fmt(c.weight, 1) + ' kg</span>' }) +
          UI.kpi({ label: fr() ? 'IMC / âge' : 'BMI / age', value: U.fmt(z.bmi, 1), unit: 'kg/m²', icon: '📊', tone: Math.abs(z.zBmi) < 1 ? 'good' : 'warn', chip: 'P' + U.fmt(z.percentile, 0) }) +
          UI.kpi({ label: 'Hémoglobine', value: U.fmt(c.hb, 1), unit: 'g/dL', icon: '🩸', tone: c.hb >= 11.5 ? 'good' : 'risk', hint: '<span class="nv-note">' + U.esc(fr() ? 'Seuil OMS 5–11 ans : 11,5' : 'WHO threshold 5–11 y: 11.5') + '</span>' }) +
        '</div>' +
        '<div class="nv-grid nv-g2" style="margin-top:12px">' +
          '<div><h4>' + U.esc(fr() ? 'Courbes de croissance OMS' : 'WHO growth curves') + '</h4><div id="nvChildModalGrowth" style="height:250px"></div></div>' +
          '<div><h4>' + U.esc(fr() ? 'Diversité alimentaire (MDD-C)' : 'Dietary diversity (MDD-C)') + '</h4><div id="nvChildModalRadar" style="height:250px"></div></div>' +
        '</div>' +
        '<h4 style="margin:12px 0 6px">' + U.esc(fr() ? 'Alertes pédiatriques' : 'Paediatric alerts') + '</h4><div class="nv-list" id="nvChildModalAlerts"></div>' +
        '<div class="nv-row" style="margin-top:10px">' +
          UI.chip(fr() ? 'Besoins énergétiques : ' + U.fmtInt(req.energy) + ' kcal/j' : 'Energy needs: ' + U.fmtInt(req.energy) + ' kcal/day', 'info') +
          UI.chip(fr() ? 'Protéines : ' + U.fmt(req.protein, 0) + ' g/j' : 'Protein: ' + U.fmt(req.protein, 0) + ' g/day', 'info') +
          UI.chip(fr() ? 'Fer : ' + U.fmt(req.iron, 1) + ' mg/j' : 'Iron: ' + U.fmt(req.iron, 1) + ' mg/day', 'info') +
          UI.chip(c.school ? (fr() ? 'Cantine scolaire connectée' : 'Connected school feeding') : (fr() ? 'Cantine non connectée' : 'School feeding not connected'), c.school ? 'good' : 'warn') +
        '</div>',
      actions: UI.btn(fr() ? 'Plan nutritionnel enfant' : 'Child nutrition plan', { action: 'ch-plan', icon: '🍽', kind: 'primary' }) +
        UI.btn(fr() ? 'Consentement parental' : 'Parental consent', { action: 'ch-consent', icon: '🔐' }) +
        UI.btn(fr() ? 'Fermer' : 'Close', { action: 'ch-close', kind: 'ghost' })
    });
    CH.render(U.qs('#nvChildModalGrowth', m.el), {
      type: 'line', height: 250, labels: gs.ages.map((a) => a + (fr() ? ' ans' : ' y')),
      series: [
        { name: fr() ? 'P97 taille' : 'Height P97', data: gs.p97, color: '#22d3ee', dash: '4 4', points: false, width: 1.4 },
        { name: fr() ? 'Taille' : 'Height', data: gs.heights, color: '#38f0a5', fill: true, width: 2.6 },
        { name: fr() ? 'P3 taille' : 'Height P3', data: gs.p3, color: '#22d3ee', dash: '4 4', points: false, width: 1.4 },
        { name: fr() ? 'Poids' : 'Weight', data: gs.weights, color: '#f5c451', axis: 'y2', width: 2.2 }
      ], y: { label: 'cm', digits: 0 }, y2: { label: 'kg', digits: 0 }, legend: true
    });
    const est = { energy: U.clamp(52 + c.diversity * 6.4, 20, 108), protein: U.clamp(46 + c.diversity * 7.2, 15, 112), iron: U.clamp(38 + c.hb * 4.4, 10, 110), vitA: U.clamp(30 + c.diversity * 9.5, 10, 118), vitC: U.clamp(35 + c.fruitVeg * 16, 10, 120), calcium: U.clamp(32 + c.diversity * 8.6, 10, 115), zinc: U.clamp(40 + c.diversity * 7.4, 10, 112), folate: U.clamp(34 + c.diversity * 8.2, 10, 114) };
    CH.render(U.qs('#nvChildModalRadar', m.el), {
      type: 'radar', height: 250, max: 120,
      axes: ['Énergie', 'Protéines', 'Fer', 'Vit. A', 'Vit. C', 'Calcium', 'Zinc', 'Folate'],
      series: [
        { name: c.name, data: ['energy', 'protein', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate'].map((k) => Math.round(est[k])), color: '#38f0a5', fill: true },
        { name: fr() ? 'Cible 100 %' : 'Target 100%', data: new Array(8).fill(100), color: '#22d3ee', dash: '4 4' }
      ], valueFormat: (v) => U.fmt(v, 0) + '%'
    });
    const alertsHost = U.qs('#nvChildModalAlerts', m.el);
    renderChildAlerts(c, z);
    const inner = root.querySelector('#nvChildAlerts');
    alertsHost.innerHTML = inner ? inner.innerHTML : '';
    modalActions(m, {
      'ch-close': function (b, mm) { mm.close(); },
      'ch-plan': function (b, mm) { mm.close(); openChildNutritionPlan(c.id); },
      'ch-consent': function (b, mm) { mm.close(); requestChildAccess(c.id); }
    });
  }
  function openChildNutritionPlan(id) {
    const c = childById(id || State.settings.child);
    const cp = { sex: c.sex === 'male' ? 'male' : 'female', age: c.age, weight: c.weight, height: c.height, activityMin: 420, fruitVeg: c.fruitVeg, sodiumMg: 2600, upf: 16, sleep: 9.6, sodaWk: 2, pregnant: false };
    const pl = plan(cp, { budget: 2.2, organic: 55, seed: 'child-' + c.id + U.num(State.settings.rerun, 0), country: countryCode() });
    const req = pl.req;
    const m = UI.modal({
      pill: '🍽 ' + U.esc(c.name), size: 'lg',
      title: U.esc(fr() ? 'Plan nutritionnel enfant — ' + c.name : 'Child nutrition plan — ' + c.name),
      subtitle: U.esc(fr() ? 'Optimisé pour la croissance, la cantine scolaire et les aliments locaux de ' : 'Optimised for growth, school feeding and local foods of ') + countryName() + '.',
      body:
        '<div class="nv-grid nv-g4">' +
          UI.kpi({ label: fr() ? 'Énergie cible' : 'Target energy', value: U.fmtInt(req.energy), unit: 'kcal', icon: '⚡', tone: 'info' }) +
          UI.kpi({ label: fr() ? 'Coût / jour' : 'Cost / day', value: money(pl.cost), icon: '💵', tone: pl.cost <= 2.2 ? 'good' : 'warn' }) +
          UI.kpi({ label: fr() ? 'Bio local' : 'Local organic', value: U.fmtInt(pl.organicPct), unit: '%', icon: '🌱', tone: pl.organicPct >= 40 ? 'good' : 'warn' }) +
          UI.kpi({ label: fr() ? 'Qualité du plan' : 'Plan quality', value: String(pl.score), unit: '/100', icon: '🧮', tone: pl.score >= 70 ? 'good' : 'warn' }) +
        '</div>' +
        '<div class="nv-grid nv-g2" style="margin-top:12px">' +
          '<div><h4>' + U.esc(fr() ? 'Couverture des besoins' : 'Requirement coverage') + '</h4><div id="nvChildPlanRadar" style="height:240px"></div></div>' +
          '<div><h4>' + U.esc(fr() ? 'Journée type (cantine + maison)' : 'Typical day (school + home)') + '</h4>' +
          pl.days[0].meals.map((mm) => '<div class="nv-meal"><header><h4>' + U.esc(t('slot.' + mm.slot)) + '</h4><span class="nv-chip nv-chip-neutral">' + U.fmtInt(mealTotals([mm]).energy) + ' kcal</span></header>' +
            '<ul class="nv-meal-items">' + mm.items.map((x) => '<li><i>' + x.f.icon + '</i><span class="nm">' + U.esc(foodName(x.f)) + '</span><span class="g">' + U.fmtInt(x.g) + ' g</span>' +
            (x.organic ? '<span class="nv-chip nv-chip-good">🌱</span>' : '') + '</li>').join('') + '</ul></div>').join('') + '</div>' +
        '</div>' +
        '<div class="nv-row" style="margin-top:10px">' +
          UI.chip(fr() ? 'Cantine scolaire : 1 repas/jour couvert' : 'School feeding: 1 meal/day covered', 'good') +
          UI.chip(fr() ? 'Fer : ' + U.fmt(pl.coverage.iron.pct, 0) + '% du besoin' : 'Iron: ' + U.fmt(pl.coverage.iron.pct, 0) + '% of need', pl.coverage.iron.pct >= 85 ? 'good' : 'warn') +
          UI.chip(fr() ? 'Calcium : ' + U.fmt(pl.coverage.calcium.pct, 0) + '%' : 'Calcium: ' + U.fmt(pl.coverage.calcium.pct, 0) + '%', pl.coverage.calcium.pct >= 85 ? 'good' : 'warn') +
          UI.chip(fr() ? 'Diversité : ' + U.fmt(pl.avg.diversity, 1) + '/10' : 'Diversity: ' + U.fmt(pl.avg.diversity, 1) + '/10', 'ok') +
        '</div>',
      actions: UI.btn(fr() ? 'Exporter le plan (CSV)' : 'Export plan (CSV)', { action: 'cp-csv', icon: '⇩', kind: 'primary' }) + UI.btn(fr() ? 'Fermer' : 'Close', { action: 'cp-close', kind: 'ghost' })
    });
    const axes = ['energy', 'protein', 'fiber', 'iron', 'vitA', 'vitC', 'calcium', 'zinc', 'folate'];
    CH.render(U.qs('#nvChildPlanRadar', m.el), {
      type: 'radar', height: 240, max: 200,
      axes: axes.map((k) => ({ energy: fr() ? 'Énergie' : 'Energy', protein: fr() ? 'Protéines' : 'Protein', fiber: fr() ? 'Fibres' : 'Fibre', iron: 'Fer', vitA: 'Vit. A', vitC: 'Vit. C', calcium: 'Calcium', zinc: 'Zinc', folate: 'Folate' }[k])),
      series: [{ name: c.name, data: axes.map((k) => Math.round(U.clamp(pl.coverage[k].pct, 0, 200))), color: '#38f0a5', fill: true }],
      valueFormat: (v) => U.fmt(v, 0) + '%'
    });
    modalActions(m, {
      'cp-close': function (b, mm) { mm.close(); },
      'cp-csv': function () {
        const rows = [];
        pl.days.forEach((d, i) => d.meals.forEach((mm) => mm.items.forEach((x) => rows.push({ child: c.name, day: i + 1, meal: mm.slot, food: foodName(x.f), grams: x.g, kcal: x.kcal, organic: x.organic ? 1 : 0 }))));
        NV.export.downloadCSV('nutri1-child-plan-' + c.id + '-' + stamp() + '.csv', rows);
        UI.toast(fr() ? 'Plan enfant exporté' : 'Child plan exported', { tone: 'good', icon: '⇩' });
      }
    });
  }
  function requestChildAccess(id) {
    const cid = id || State.settings.child || (document.getElementById('familyMember') || {}).value || 'child1';
    const c = childById(cid);
    const m = UI.modal({
      pill: '🔐 RGPD', size: 'md',
      title: U.esc(fr() ? 'Consentement parental — ' + c.name : 'Parental consent — ' + c.name),
      subtitle: U.esc(fr() ? 'Le partage des données d\'un mineur exige un consentement explicite du représentant légal.' : 'Sharing a minor\'s data requires explicit consent from the legal guardian.'),
      body:
        '<div class="nv-list">' +
        [['👤', fr() ? 'Identité du représentant légal vérifiée' : 'Legal guardian identity verified', 'good'],
        ['🔒', fr() ? 'Chiffrement de bout en bout, hébergement régional' : 'End-to-end encryption, regional hosting', 'good'],
        ['🏫', fr() ? 'Partage limité : cantine scolaire + nutritionniste' : 'Limited sharing: school feeding + nutritionist', 'ok'],
        ['⏱️', fr() ? 'Révocable à tout moment, conservation 24 mois' : 'Revocable at any time, 24-month retention', 'ok']].map((x) =>
          '<div class="nv-item" data-tone="' + x[2] + '"><span class="nv-item-icon">' + x[0] + '</span><div class="nv-item-body"><div class="nv-item-title">' + U.esc(x[1]) + '</div></div></div>').join('') +
        '</div>' +
        '<label class="nv-check" style="display:block;margin-top:10px"><input type="checkbox" id="nvConsentChk"> ' +
        U.esc(fr() ? 'Je suis le représentant légal de ' + c.name + ' et j\'autorise le suivi nutritionnel.' : 'I am the legal guardian of ' + c.name + ' and I authorise the nutrition follow-up.') + '</label>' +
        '<div id="nvConsentStage" style="margin-top:10px"></div>',
      actions: UI.btn(fr() ? 'Signer le consentement' : 'Sign the consent', { action: 'cs-sign', icon: '✍️', kind: 'primary' }) + UI.btn(fr() ? 'Annuler' : 'Cancel', { action: 'cs-close', kind: 'ghost' })
    });
    modalActions(m, {
      'cs-close': function (b, mm) { mm.close(); },
      'cs-sign': function (b, mm) {
        const chk = U.qs('#nvConsentChk', mm.el);
        if (!chk || !chk.checked) { UI.toast(fr() ? 'Cochez la déclaration de représentation légale' : 'Tick the legal-guardian declaration', { tone: 'warn' }); return; }
        const api = UI.stepper(U.qs('#nvConsentStage', mm.el), [
          { label: fr() ? 'Vérification OTP' : 'OTP verification', text: fr() ? 'Code envoyé au tuteur' : 'Code sent to the guardian' },
          { label: fr() ? 'Signature électronique' : 'Electronic signature', text: 'eIDAS · SHA-256' },
          { label: fr() ? 'Inscription au registre' : 'Registry record', text: fr() ? 'Journal d\'audit immuable' : 'Immutable audit log' }
        ], { stepMs: 560, doneText: fr() ? '✓ Consentement enregistré' : '✓ Consent recorded' });
        api.run({
          onDone: function () {
            const code = 'NV-' + U.hash(c.id + Date.now()).toString(36).toUpperCase().slice(0, 8);
            State.consent[c.id] = { code: code, at: new Date().toISOString(), guardian: heroName() };
            save('consent');
            renderFamily();
            setTimeout(function () { mm.close(); }, 900);
            UI.toast(fr() ? 'Accès parental confirmé — code ' + code : 'Parental access confirmed — code ' + code, { tone: 'good', icon: '🔓' });
          }
        });
      }
    });
  }
  function alertAction(act, el) {
    switch (act) {
      case 'book': openBookingModal(); break;
      case 'foods': openFoodsModal(); break;
      case 'plan': pulse(el); scrollTo('#nvPlanPanel'); UI.toast(fr() ? 'Plan alimentaire local & bio' : 'Local & organic food plan', { tone: 'info', icon: '🍽️' }); break;
      case 'sim': pulse(el); scrollTo('#nvSimPanel'); UI.toast(fr() ? 'Ajustez les leviers pour mesurer l\'impact' : 'Adjust the levers to measure the impact', { tone: 'info', icon: '🎚️' }); break;
      case 'evidence': openEvidenceModal(); break;
      case 'market': gotoSection('marketplace'); break;
      default: UI.toast(fr() ? 'Action indisponible dans la démo' : 'Action unavailable in the demo', { tone: 'warn' });
    }
  }

  /* ---- reconstruction complète (changement de langue, remise à zéro) ----- */
  function syncRefs() {
    refs.vitals = root.querySelector('#nvVitals');
    refs.liveBadge = root.querySelector('#nvLiveBadge');
  }
  function rebuild() {
    if (!State.mounted || !root) return;
    stopLive();
    [[refs.hero, htmlHero], [refs.kpiExtra, htmlExtraKpis], [refs.score, htmlScore],
    [refs.pred, htmlPred], [refs.sim, htmlSim], [refs.journal, htmlJournal],
    [refs.plan, htmlPlan], [refs.alerts, htmlAlerts], [refs.footer, htmlFooter]].forEach(function (x) {
      if (x[0] && typeof x[1] === 'function') x[0].innerHTML = x[1]();
    });
    const fe = root.querySelector('.nv-form-extra');
    if (fe) {
      const holder = document.createElement('div');
      holder.innerHTML = htmlFormExtras();
      if (holder.firstElementChild) fe.parentNode.replaceChild(holder.firstElementChild, fe);
    }
    Object.keys(State.charts).forEach(function (k) { try { State.charts[k].destroy(); } catch (e) { } });
    State.charts = {};
    chipsCountry = '';
    syncRefs();
    enhanceLegacyCharts();
    enhanceLegacyKpis();
    syncLevers();
    fillForm();
    seedLive();
    renderVitals();
    if (State.settings.live) startLive();
    renderAll();
    renderFamily();
  }
  function unmount() {
    stopLive();
    State.mounted = false;
    Object.keys(State.charts).forEach(function (k) { try { State.charts[k].destroy(); } catch (e) { } });
    State.charts = {};
    ['hero', 'kpiExtra', 'score', 'pred', 'sim', 'journal', 'plan', 'alerts', 'footer'].forEach(function (k) {
      if (refs[k] && refs[k].parentNode) refs[k].parentNode.removeChild(refs[k]);
      refs[k] = null;
    });
    const fe = root && root.querySelector('.nv-form-extra');
    if (fe && fe.parentNode) fe.parentNode.removeChild(fe);
    if (root) root.classList.remove('nv-citizen');
  }

  /* ---- compatibilité ascendante : les fonctions globales existantes ------
     Installées dès le chargement (avant les scripts historiques, qui appelaient
     saveCitizen / updateReferences / generateRecommendations sans les définir),
     puis ré-installées au montage pour reprendre la main sur les définitions
     héritées (loadFamilyChildDashboard / requestChildAccess /
     openChildNutritionPlan) sans jamais les supprimer. */
  function installLegacyGlobals() {
  global.saveCitizen = function () {
    if (!State.mounted) return;
    readForm();
    State.history = null; planCache = null; simCache = null;
    save('all');
    renderAll();
    renderFamily();
    UI.toast(fr() ? 'Profil enregistré — tous les modèles ont été recalculés' : 'Profile saved — all models recomputed', { tone: 'good', icon: '💾' });
    if (typeof global.toast === 'function') { try { global.toast(fr() ? 'Profil enregistré' : 'Profile saved'); } catch (e) { } }
  };
  global.updateReferences = function () {
    if (!State.mounted) return;
    readForm();
    State.history = null;
    save('all');
    renderQuick();
    renderReference();
  };
  global.generateRecommendations = function () {
    if (!State.mounted) return;
    readForm();
    save('all');
    renderRecs();
    renderAlerts();
    scrollTo('#recs');
    UI.toast(fr() ? recommendations(State.profile).length + ' recommandations générées (preuve + impact chiffré)' : recommendations(State.profile).length + ' recommendations generated (evidence + quantified impact)', { tone: 'good', icon: '🤖' });
  };
  global.loadFamilyChildDashboard = function () {
    const sel = document.getElementById('familyMember');
    if (sel && sel.value) State.settings.child = sel.value;
    if (State.mounted) renderFamily();
  };
  global.requestChildAccess = function (id) {
    requestChildAccess((typeof id === 'string' && id) ? id : null);
  };
  global.openChildNutritionPlan = function (id) {
    openChildNutritionPlan((typeof id === 'string' && id) ? id : null);
  };
  }
  installLegacyGlobals();

  /* ---- rafraîchissement à l'entrée dans la vue --------------------------- */
  NV.bus.on('view', function (d) {
    if (!d || d.id !== 'citizen' || !State.mounted) return;
    setTimeout(function () {
      renderVitals();
      renderSparks();
      if (State.settings.live && !liveTimer) startLive();
    }, 80);
  });

  /* ---- API publique réutilisable par les autres sections ----------------- */
  global.NutriCitizen = {
    version: '1.0.0',
    engine: 'NutriVision',
    state: State,
    foods: FOODS,
    foodById: function (id) { return FOOD_BY_ID[id] || null; },
    foodsForCountry: foodsFor,
    requirements: requirements,
    profile: function () { return State.profile; },
    scenario: function () { return State.scenario; },
    setProfile: function (patch) {
      Object.assign(State.profile, patch || {});
      State.history = null; planCache = null; simCache = null;
      save('all');
      if (State.mounted) { fillForm(); renderAll(); renderFamily(); }
      return State.profile;
    },
    setScenario: function (patch) {
      Object.assign(State.scenario, patch || {});
      simCache = null;
      save('scenario');
      if (State.mounted) { syncLevers(); renderHeavy(); renderQuick(); }
      return State.scenario;
    },
    applyPreset: function (key) { applyPreset(key); },
    derived: function (p) { return derived(p || State.profile); },
    intake: function (p) { return intake(p || State.profile); },
    score: function (p) { return scoreProfile(p || State.profile, intake(p || State.profile)); },
    risks: function (p) { return risksFor(p || State.profile); },
    forecast: function (key, months, withScenario) { return forecastVar(key || 'weight', months || 24, withScenario !== false); },
    markov: function (years, trials, p) { return markovRun(p || State.profile, scenarioProfile(), years || 10, trials || 1000); },
    scenarios: simOutcomes,
    plan: function (opt) { return plan(State.profile, opt || {}); },
    alerts: function (p) { return alerts(p || State.profile); },
    recommendations: function (p) { return recommendations(p || State.profile); },
    anomalies: anomalies,
    history: history,
    children: CHILDREN,
    childPlan: function (id) { openChildNutritionPlan(id); },
    journal: { add: addJournal, remove: removeJournal, today: journalFor, clear: clearToday, streak: streak },
    render: { all: renderAll, quick: renderQuick, heavy: renderHeavy },
    exportData: { json: exportJSON, csv: exportCSV, plan: exportPlan, recs: exportRecs, report: printReport },
    modals: { foods: openFoodsModal, evidence: openEvidenceModal, booking: openBookingModal, models: openModelModal, report: openReportModal, shopping: openShoppingModal, child: openChildModal },
    goto: gotoSection,
    rebuild: rebuild,
    unmount: unmount,
    /* fonctions appelées par le balisage historique (pont nutri-citizen-bridge) */
    legacy: {
      saveCitizen: function () { global.saveCitizen(); },
      updateReferences: function () { global.updateReferences(); },
      generateRecommendations: function () { global.generateRecommendations(); },
      loadFamilyChildDashboard: function () { global.loadFamilyChildDashboard(); },
      requestChildAccess: function (id) { global.requestChildAccess(id); },
      openChildNutritionPlan: function (id) { global.openChildNutritionPlan(id); }
    },
    /* API documentée en tête de fichier — réutilisable par les autres sections */
    engine: {
      score: function (p) { return scoreProfile(p || State.profile, intake(p || State.profile)); },
      risks: function (p) { return risksFor(p || State.profile); },
      forecast: function (p, key, months, withScenario) {
        const prev = State.profile;
        if (p) State.profile = p;
        const out = forecastVar(key || 'weight', months || 24, withScenario !== false);
        State.profile = prev;
        return out;
      },
      markov: function (p, years, trials) { return markovRun(p || State.profile, scenarioProfile(), years || 10, trials || 1000); },
      plan: function (p, opt) { return plan(p || State.profile, opt || {}); },
      foods: function (code) { return foodsFor(code || countryCode()); },
      requirements: function (p) { return requirements(p || State.profile); }
    }
  };

  /* ---- enregistrement du module dans le noyau réutilisable --------------- */
  NV.app.module({
    id: 'citizen',
    section: 'citizen',
    mount: mount,
    render: rebuild,
    refresh: function () {
      if (!State.mounted) return;
      State.history = null; planCache = null; simCache = null;
      syncLevers();
      renderAll();
      renderFamily();
    }
  });

})(typeof window !== 'undefined' ? window : globalThis);
