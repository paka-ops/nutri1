/* ==========================================================================
   NUTRI.N°1 — Predictive medicine lab inside <section id="ai">  (TASK 2)
   Mounted in #vaPredict, a placeholder rendered by views/view-ai.js.

   Depends on : js/bento-i18n.js, views/view-ai.js (NutriBentoViews.ai, generatePlan)
   Styles     : styles/views.css  (.vp-*)
   Storage    : nutri_ai_predict  (eating-habit sliders, this browser only)
   Note       : simulation only. Risks come from an illustrative logistic scoring
                model whose weights were set by hand for this demonstrator: it is
                not a trained or clinically validated model and not medical advice.
                The uncertainty band is a real Monte-Carlo run (2,000 draws) on
                that same model.
   API        : NutriBentoViews.aiPredict { mount, run, state }
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('ai');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'ai.sub': 'From your eating habits to a personalized plan and a projection of your health risks.',
      'ai.demo.note': 'Demonstration. The plan applies published rules listed in the “Explain” card. The predictive lab uses an illustrative scoring model with hand-set weights: it is not a trained or clinically validated AI model and not medical advice. Adults (18+) only.',
      'vp.kicker': 'PREDICTIVE MEDICINE', 'vp.title': 'Predictive health lab', 'vp.sub': 'Your nutrition data is projected at 6 months, 2 years and 5 years to spot metabolic and cardiovascular risks early.',
      'vp.badge': 'Simulation · illustrative model',
      'vp.hab.title': 'Eating habits · last 7 days', 'vp.hab.sub': 'Combined with the profile above. Move a slider: the projection updates live.',
      'vp.h.upf': 'Ultra-processed foods', 'vp.h.upf.u': '% of meals', 'vp.h.fried': 'Fried foods', 'vp.h.legumes': 'Legumes (cowpeas, beans)', 'vp.h.fish': 'Fish',
      'vp.h.alcohol': 'Alcohol', 'vp.h.week': 'per week', 'vp.h.drinks': 'drinks per week',
      'vp.h.famDiab': 'Family history of diabetes', 'vp.h.famHta': 'Family history of hypertension',
      'vp.run': 'Run predictive analysis', 'vp.rerun': 'Run the analysis again', 'vp.running': 'Analysing…',
      'vp.net.title': 'Neural network at work', 'vp.net.alt': 'Animated diagram of a neural network linking {n} input variables to five health risks.',
      'vp.net.idle': 'Waiting for your data. Run the analysis to start the network.', 'vp.net.done': 'Analysis complete · {n} trajectories simulated',
      'vp.s.0': 'Reading profile and eating habits ({n} variables)', 'vp.s.1': 'Normalising and encoding intakes', 'vp.s.2': 'Layer 1 · food patterns',
      'vp.s.3': 'Layer 2 · nutrient × biomarker interactions', 'vp.s.4': 'Simulating {n} trajectories over 5 years', 'vp.s.5': 'Calibrating probabilities',
      'vp.s.6': 'Early detection of weak signals', 'vp.s.7': 'Ranking preventive actions',
      'vp.in.age': 'Age', 'vp.in.bmi': 'BMI', 'vp.in.veg': 'Fruit & veg', 'vp.in.sugary': 'Sugary drinks', 'vp.in.salt': 'Salt', 'vp.in.upf': 'Ultra-processed',
      'vp.in.fried': 'Fried foods', 'vp.in.legumes': 'Legumes', 'vp.in.fish': 'Fish', 'vp.in.alcohol': 'Alcohol', 'vp.in.act': 'Activity', 'vp.in.glucose': 'Glucose',
      'vp.in.sys': 'Blood pressure', 'vp.in.fam': 'Family history', 'vp.in.sex': 'Sex', 'vp.in.pattern': 'Diet pattern',
      'vp.r.diabetes': 'Type 2 diabetes', 'vp.r.hta': 'Hypertension', 'vp.r.cvd': 'Cardiovascular', 'vp.r.obesity': 'Obesity', 'vp.r.deficiency': 'Anaemia & deficiencies',
      'vp.e.diabetes': 'Prediabetes', 'vp.e.hta': 'Elevated blood pressure', 'vp.e.cvd': 'Raised lipids / early plaque', 'vp.e.obesity': 'Overweight', 'vp.e.deficiency': 'Low reserves',
      'vp.lvl.low': 'Low', 'vp.lvl.mod': 'Moderate', 'vp.lvl.high': 'High', 'vp.lvl.vhigh': 'Very high',
      'vp.score.title': 'Predictive health score', 'vp.score.plan': '{v} with the plan', 'vp.rel.title': 'Model reliability',
      'vp.rel.hint.full': 'Glucose and blood pressure provided.', 'vp.rel.hint.part': 'Add fasting glucose and blood pressure above to narrow the uncertainty.',
      'vp.hz.title': 'Horizon', 'vp.hz.6m': '6 months', 'vp.hz.2y': '2 years', 'vp.hz.5y': '5 years',
      'vp.risk.title': 'Projected risks', 'vp.risk.sub': 'Probability of onset within the selected horizon. Select a risk to explore it.',
      'vp.risk.plan': '{v} with plan', 'vp.risk.select': 'Explore {name}',
      'vp.traj.title': 'Risk trajectory · {name}', 'vp.traj.cur': 'Current habits', 'vp.traj.plan': 'With preventive plan', 'vp.traj.band': '80 % interval ({n} simulations)',
      'vp.traj.now': 'Today', 'vp.traj.1y': '1 yr', 'vp.traj.3y': '3 yrs', 'vp.traj.4y': '4 yrs', 'vp.traj.alt': 'Line chart of the probability of {name} from today to 5 years, with current habits and with the preventive plan.',
      'vp.drv.title': 'What drives this risk', 'vp.drv.sub': 'Contribution of each variable to the score.', 'vp.drv.up': 'raises', 'vp.drv.down': 'protects', 'vp.drv.none': 'No variable stands out for this risk.',
      'vp.tree.title': 'Probability tree · 5 years', 'vp.tree.root': 'You today', 'vp.tree.cur': 'Current habits', 'vp.tree.plan': 'Preventive plan', 'vp.tree.ok': 'No condition',
      'vp.tree.alt': 'Probability tree at 5 years for {name}: outcomes with current habits and with the preventive plan.',
      'vp.bio.title': 'Projected markers · {hz}', 'vp.bio.weight': 'Weight', 'vp.bio.glucose': 'Fasting glucose', 'vp.bio.sys': 'Systolic pressure',
      'vp.bio.cur': 'Current habits', 'vp.bio.plan': 'With plan', 'vp.bio.assumed': 'Starting value assumed (not provided)',
      'vp.al.title': 'Early detection', 'vp.al.none': 'No weak signal detected with the data provided.',
      'vp.al.sodium': 'Salt and stock cubes with pressure not under control: hypertension signal.', 'vp.al.sodium.u': 'Salt and stock cubes, blood pressure not measured: possible silent hypertension.',
      'vp.al.glycemic': 'Sugary drinks combined with excess weight: insulin resistance pattern.', 'vp.al.ifg': 'Fasting glucose in the impaired range (6.1–6.9 mmol/L).',
      'vp.al.upf': 'Half or more of meals are ultra-processed: metabolic drift pattern.', 'vp.al.lipid': 'Frequent fried foods with almost no fish: unfavourable lipid profile.',
      'vp.al.iron': 'Few legumes, fruit and vegetables for a woman of childbearing age: iron-deficiency signal.', 'vp.al.weight': 'Projected weight gain of {kg} kg per year with current habits.',
      'vp.al.bp': 'Systolic pressure already at or above 130 mmHg.',
      'vp.rec.title': 'Personalized preventive actions', 'vp.rec.sub': 'Tick an action to simulate it: curves, tree and markers are recalculated.',
      'vp.rec.impact': '−{v} pts on {name}', 'vp.rec.noimpact': 'Improves model reliability', 'vp.rec.none': 'Your habits already match the preventive targets of this model.',
      'vp.rec.veg': 'Reach 5 servings of fruit and vegetables a day', 'vp.rec.sugary': 'Replace sugary drinks with water or unsweetened bissap',
      'vp.rec.salt': 'Cut added salt and stock cubes', 'vp.rec.upf': 'Halve ultra-processed foods', 'vp.rec.fried': 'Limit fried foods to twice a week',
      'vp.rec.legumes': 'Eat cowpeas or other legumes 4 times a week', 'vp.rec.fish': 'Eat fish twice a week', 'vp.rec.act': 'Add 30 minutes of brisk walking a day',
      'vp.rec.weight': 'Lose 5 % of body weight within a year', 'vp.rec.alcohol': 'Stay under 7 drinks a week', 'vp.rec.screen': 'Get fasting glucose and blood pressure measured',
      'vp.note': 'Illustrative projection for a demonstration. It does not replace screening or a consultation with a health professional.',
      'vp.err': 'Fix the highlighted fields in “Your inputs” to run the analysis.'
    },
    fr: {
      'ai.sub': 'De vos habitudes alimentaires à un plan personnalisé et à une projection de vos risques de santé.',
      'ai.demo.note': 'Démonstration. Le plan applique des règles publiées, listées dans la carte « Explication ». Le laboratoire prédictif utilise un modèle de score illustratif aux poids fixés à la main : ce n’est ni un modèle d’IA entraîné ou validé cliniquement, ni un avis médical. Adultes (18 ans et plus) uniquement.',
      'vp.kicker': 'MÉDECINE PRÉDICTIVE', 'vp.title': 'Laboratoire de santé prédictive', 'vp.sub': 'Vos données nutritionnelles sont projetées à 6 mois, 2 ans et 5 ans pour repérer tôt les risques métaboliques et cardiovasculaires.',
      'vp.badge': 'Simulation · modèle illustratif',
      'vp.hab.title': 'Habitudes alimentaires · 7 derniers jours', 'vp.hab.sub': 'Combinées au profil ci-dessus. Déplacez un curseur : la projection se met à jour en direct.',
      'vp.h.upf': 'Aliments ultra-transformés', 'vp.h.upf.u': '% des repas', 'vp.h.fried': 'Fritures', 'vp.h.legumes': 'Légumineuses (niébé, haricots)', 'vp.h.fish': 'Poisson',
      'vp.h.alcohol': 'Alcool', 'vp.h.week': 'par semaine', 'vp.h.drinks': 'verres par semaine',
      'vp.h.famDiab': 'Antécédents familiaux de diabète', 'vp.h.famHta': 'Antécédents familiaux d’hypertension',
      'vp.run': 'Lancer l’analyse prédictive', 'vp.rerun': 'Relancer l’analyse', 'vp.running': 'Analyse en cours…',
      'vp.net.title': 'Réseau neuronal en action', 'vp.net.alt': 'Schéma animé d’un réseau neuronal reliant {n} variables d’entrée à cinq risques de santé.',
      'vp.net.idle': 'En attente de vos données. Lancez l’analyse pour activer le réseau.', 'vp.net.done': 'Analyse terminée · {n} trajectoires simulées',
      'vp.s.0': 'Lecture du profil et des habitudes alimentaires ({n} variables)', 'vp.s.1': 'Normalisation et encodage des apports', 'vp.s.2': 'Couche 1 · schémas alimentaires',
      'vp.s.3': 'Couche 2 · interactions nutriments × biomarqueurs', 'vp.s.4': 'Simulation de {n} trajectoires sur 5 ans', 'vp.s.5': 'Calibration des probabilités',
      'vp.s.6': 'Détection précoce des signaux faibles', 'vp.s.7': 'Classement des actions préventives',
      'vp.in.age': 'Âge', 'vp.in.bmi': 'IMC', 'vp.in.veg': 'Fruits et légumes', 'vp.in.sugary': 'Boissons sucrées', 'vp.in.salt': 'Sel', 'vp.in.upf': 'Ultra-transformés',
      'vp.in.fried': 'Fritures', 'vp.in.legumes': 'Légumineuses', 'vp.in.fish': 'Poisson', 'vp.in.alcohol': 'Alcool', 'vp.in.act': 'Activité', 'vp.in.glucose': 'Glycémie',
      'vp.in.sys': 'Tension', 'vp.in.fam': 'Antécédents', 'vp.in.sex': 'Sexe', 'vp.in.pattern': 'Régime',
      'vp.r.diabetes': 'Diabète de type 2', 'vp.r.hta': 'Hypertension', 'vp.r.cvd': 'Cardiovasculaire', 'vp.r.obesity': 'Obésité', 'vp.r.deficiency': 'Anémie et carences',
      'vp.e.diabetes': 'Prédiabète', 'vp.e.hta': 'Tension élevée', 'vp.e.cvd': 'Lipides élevés / plaque débutante', 'vp.e.obesity': 'Surpoids', 'vp.e.deficiency': 'Réserves basses',
      'vp.lvl.low': 'Faible', 'vp.lvl.mod': 'Modéré', 'vp.lvl.high': 'Élevé', 'vp.lvl.vhigh': 'Très élevé',
      'vp.score.title': 'Score de santé prédictif', 'vp.score.plan': '{v} avec le plan', 'vp.rel.title': 'Fiabilité du modèle',
      'vp.rel.hint.full': 'Glycémie et tension renseignées.', 'vp.rel.hint.part': 'Ajoutez la glycémie à jeun et la tension ci-dessus pour réduire l’incertitude.',
      'vp.hz.title': 'Horizon', 'vp.hz.6m': '6 mois', 'vp.hz.2y': '2 ans', 'vp.hz.5y': '5 ans',
      'vp.risk.title': 'Risques projetés', 'vp.risk.sub': 'Probabilité de survenue dans l’horizon choisi. Sélectionnez un risque pour l’explorer.',
      'vp.risk.plan': '{v} avec le plan', 'vp.risk.select': 'Explorer {name}',
      'vp.traj.title': 'Trajectoire du risque · {name}', 'vp.traj.cur': 'Habitudes actuelles', 'vp.traj.plan': 'Avec le plan préventif', 'vp.traj.band': 'Intervalle à 80 % ({n} simulations)',
      'vp.traj.now': 'Auj.', 'vp.traj.1y': '1 an', 'vp.traj.3y': '3 ans', 'vp.traj.4y': '4 ans', 'vp.traj.alt': 'Courbe de la probabilité de {name} d’aujourd’hui à 5 ans, avec les habitudes actuelles et avec le plan préventif.',
      'vp.drv.title': 'Ce qui pèse sur ce risque', 'vp.drv.sub': 'Contribution de chaque variable au score.', 'vp.drv.up': 'augmente', 'vp.drv.down': 'protège', 'vp.drv.none': 'Aucune variable ne ressort pour ce risque.',
      'vp.tree.title': 'Arbre de probabilités · 5 ans', 'vp.tree.root': 'Vous aujourd’hui', 'vp.tree.cur': 'Habitudes actuelles', 'vp.tree.plan': 'Plan préventif', 'vp.tree.ok': 'Pas de maladie',
      'vp.tree.alt': 'Arbre de probabilités à 5 ans pour {name} : issues avec les habitudes actuelles et avec le plan préventif.',
      'vp.bio.title': 'Marqueurs projetés · {hz}', 'vp.bio.weight': 'Poids', 'vp.bio.glucose': 'Glycémie à jeun', 'vp.bio.sys': 'Tension systolique',
      'vp.bio.cur': 'Habitudes actuelles', 'vp.bio.plan': 'Avec le plan', 'vp.bio.assumed': 'Valeur de départ supposée (non renseignée)',
      'vp.al.title': 'Détection précoce', 'vp.al.none': 'Aucun signal faible détecté avec les données fournies.',
      'vp.al.sodium': 'Sel et cubes bouillon avec une tension non maîtrisée : signal d’hypertension.', 'vp.al.sodium.u': 'Sel et cubes bouillon, tension non mesurée : hypertension silencieuse possible.',
      'vp.al.glycemic': 'Boissons sucrées associées à un excès de poids : schéma d’insulinorésistance.', 'vp.al.ifg': 'Glycémie à jeun dans la zone d’hyperglycémie modérée (6,1–6,9 mmol/L).',
      'vp.al.upf': 'La moitié des repas ou plus est ultra-transformée : schéma de dérive métabolique.', 'vp.al.lipid': 'Fritures fréquentes et presque pas de poisson : profil lipidique défavorable.',
      'vp.al.iron': 'Peu de légumineuses, de fruits et de légumes chez une femme en âge de procréer : signal de carence en fer.', 'vp.al.weight': 'Prise de poids projetée de {kg} kg par an avec les habitudes actuelles.',
      'vp.al.bp': 'Tension systolique déjà à 130 mmHg ou plus.',
      'vp.rec.title': 'Actions préventives personnalisées', 'vp.rec.sub': 'Cochez une action pour la simuler : courbes, arbre et marqueurs sont recalculés.',
      'vp.rec.impact': '−{v} pts sur {name}', 'vp.rec.noimpact': 'Améliore la fiabilité du modèle', 'vp.rec.none': 'Vos habitudes correspondent déjà aux cibles préventives de ce modèle.',
      'vp.rec.veg': 'Atteindre 5 portions de fruits et légumes par jour', 'vp.rec.sugary': 'Remplacer les boissons sucrées par de l’eau ou du bissap non sucré',
      'vp.rec.salt': 'Réduire le sel ajouté et les cubes bouillon', 'vp.rec.upf': 'Diviser par deux les aliments ultra-transformés', 'vp.rec.fried': 'Limiter les fritures à deux fois par semaine',
      'vp.rec.legumes': 'Manger du niébé ou d’autres légumineuses 4 fois par semaine', 'vp.rec.fish': 'Manger du poisson deux fois par semaine', 'vp.rec.act': 'Ajouter 30 minutes de marche rapide par jour',
      'vp.rec.weight': 'Perdre 5 % du poids en un an', 'vp.rec.alcohol': 'Rester sous 7 verres par semaine', 'vp.rec.screen': 'Faire mesurer la glycémie à jeun et la tension',
      'vp.note': 'Projection illustrative pour une démonstration. Elle ne remplace ni un dépistage ni une consultation avec un professionnel de santé.',
      'vp.err': 'Corrigez les champs signalés dans « Vos données » pour lancer l’analyse.'
    }
  });

  /* ---- 2. Model --------------------------------------------------------- */
  var STORE = 'nutri_ai_predict';
  var HAB = { upf: [0, 80, 5, 30], fried: [0, 14, 1, 3], legumes: [0, 14, 1, 3], fish: [0, 7, 1, 1], alcohol: [0, 21, 1, 2] };
  var HAB_KEYS = ['upf', 'fried', 'legumes', 'fish', 'alcohol'];
  var RISKS = ['diabetes', 'hta', 'cvd', 'obesity', 'deficiency'];
  var WEIGHTS = { diabetes: 0.25, hta: 0.25, cvd: 0.25, obesity: 0.15, deficiency: 0.10 };
  var HORIZONS = [['6m', 0.5], ['2y', 2], ['5y', 5]];
  var INPUTS = ['age', 'bmi', 'veg', 'sugary', 'salt', 'upf', 'fried', 'legumes', 'fish', 'alcohol', 'act', 'glucose', 'sys', 'fam'];
  var ACT = { low: 0, light: 1, moderate: 2, high: 3 };
  var N_SIM = 2000;

  var hab = { upf: 30, fried: 3, legumes: 3, fish: 1, alcohol: 2, famDiab: false, famHta: false };
  (function load() {
    try {
      var s = JSON.parse(global.localStorage.getItem(STORE) || 'null');
      if (s) { HAB_KEYS.forEach(function (k) { var v = +s[k]; if (isFinite(v)) hab[k] = Math.max(HAB[k][0], Math.min(HAB[k][1], v)); }); hab.famDiab = !!s.famDiab; hab.famHta = !!s.famHta; }
    } catch (e) { /* ignore */ }
  })();
  function save() { try { global.localStorage.setItem(STORE, JSON.stringify(hab)); } catch (e) { /* ignore */ } }

  /* phase: 'idle' | 'run' | 'done' */
  var state = { phase: 'idle', stage: -1, risk: 'diabetes', hz: '5y', recs: null, intro: false, error: false, result: null, last: null };

  function numberOf(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function formOf() {
    var api = global.NutriBentoViews && global.NutriBentoViews.ai;
    try { return api ? api.state().form : null; } catch (e) { return null; }
  }
  /* Feature vector from the AI form + the habit sliders. Returns null when the form is not usable. */
  function features() {
    var f = formOf(); if (!f) return state.last;
    var age = numberOf(f.age), h = numberOf(f.height), w = numberOf(f.weight);
    if (!(age >= 18 && age <= 90) || !(h >= 120 && h <= 220) || !(w >= 30 && w <= 250)) return state.last;
    var glu = numberOf(f.glucose), sys = numberOf(f.sys);
    var x = {
      age: age, height: h, weight: w, bmi: w / Math.pow(h / 100, 2), male: f.sex === 'm' ? 1 : 0,
      veg: clamp(+f.veg || 0, 0, 5), sugary: clamp(+f.sugary || 0, 0, 5), salt: f.salt ? 1 : 0, act: ACT[f.activity] != null ? ACT[f.activity] : 1,
      vegdiet: f.pattern === 'veg' ? 1 : 0,
      glucose: glu >= 2 && glu <= 30 ? glu : NaN, sys: sys >= 70 && sys <= 250 ? sys : NaN,
      upf: hab.upf, fried: hab.fried, legumes: hab.legumes, fish: hab.fish, alcohol: hab.alcohol, famDiab: hab.famDiab ? 1 : 0, famHta: hab.famHta ? 1 : 0
    };
    state.last = x;
    return x;
  }
  /* Hand-set illustrative weights. Each term is the contribution of one variable to the logit. */
  function terms(risk, x) {
    var hasG = !isNaN(x.glucose), hasS = !isNaN(x.sys), t;
    if (risk === 'diabetes') t = { base: -3.6, age: 0.045 * (x.age - 35), bmi: 0.16 * (x.bmi - 23), sugary: 0.35 * x.sugary, upf: 0.018 * (x.upf - 20), fried: 0.03 * x.fried,
      legumes: -0.05 * x.legumes, veg: -0.12 * x.veg, act: -0.25 * x.act, fam: 0.8 * x.famDiab, glucose: hasG ? 0.9 * (x.glucose - 5.2) : 0 };
    else if (risk === 'hta') t = { base: -3.0, age: 0.05 * (x.age - 35), bmi: 0.10 * (x.bmi - 23), salt: 0.7 * x.salt, upf: 0.015 * (x.upf - 20), fried: 0.02 * x.fried,
      alcohol: 0.03 * x.alcohol, veg: -0.08 * x.veg, act: -0.2 * x.act, fam: 0.6 * x.famHta, sys: hasS ? 0.05 * (x.sys - 120) : 0 };
    else if (risk === 'cvd') t = { base: -4.4, age: 0.07 * (x.age - 35), sex: 0.4 * x.male, bmi: 0.08 * (x.bmi - 23), fried: 0.03 * x.fried, upf: 0.012 * (x.upf - 20), salt: 0.35 * x.salt,
      alcohol: 0.015 * x.alcohol, fish: -0.10 * x.fish, veg: -0.08 * x.veg, legumes: -0.04 * x.legumes, act: -0.2 * x.act, sys: hasS ? 0.03 * (x.sys - 120) : 0, glucose: hasG ? 0.3 * (x.glucose - 5.2) : 0 };
    else if (risk === 'obesity') t = { base: -2.2, bmi: 0.45 * (x.bmi - 25), sugary: 0.3 * x.sugary, upf: 0.02 * (x.upf - 20), fried: 0.04 * x.fried, act: -0.35 * x.act, veg: -0.06 * x.veg, age: -0.02 * (x.age - 35) };
    else t = { base: -1.6, sex: !x.male && x.age < 50 ? 0.9 : 0, veg: -0.15 * x.veg, legumes: -0.08 * x.legumes, fish: -0.10 * x.fish, pattern: 0.5 * x.vegdiet, upf: 0.012 * (x.upf - 20), bmi: x.bmi < 18.5 ? 0.8 : 0 };
    return t;
  }
  function logit(risk, x) { var t = terms(risk, x), z = 0; for (var k in t) z += t[k]; return z; }
  function atHorizon(p5, years) { return 1 - Math.pow(1 - p5, years / 5); }
  function levelOf(p5) { return p5 < 0.05 ? 'low' : p5 < 0.15 ? 'mod' : p5 < 0.30 ? 'high' : 'vhigh'; }

  /* Preventive actions: each one edits the feature vector. */
  var RECS = [
    { id: 'sugary', when: function (x) { return x.sugary >= 1; }, apply: function (x) { x.sugary = 0; } },
    { id: 'salt', when: function (x) { return x.salt; }, apply: function (x) { x.salt = 0; } },
    { id: 'upf', when: function (x) { return x.upf > 20; }, apply: function (x) { x.upf = x.upf / 2; } },
    { id: 'veg', when: function (x) { return x.veg < 5; }, apply: function (x) { x.veg = 5; } },
    { id: 'act', when: function (x) { return x.act < 2; }, apply: function (x) { x.act += 1; } },
    { id: 'weight', when: function (x) { return x.bmi >= 25; }, apply: function (x) { x.bmi *= 0.95; x.loss = 1; } },
    { id: 'fried', when: function (x) { return x.fried > 2; }, apply: function (x) { x.fried = 2; } },
    { id: 'legumes', when: function (x) { return x.legumes < 4; }, apply: function (x) { x.legumes = 4; } },
    { id: 'fish', when: function (x) { return x.fish < 2; }, apply: function (x) { x.fish = 2; } },
    { id: 'alcohol', when: function (x) { return x.alcohol > 7; }, apply: function (x) { x.alcohol = 7; } },
    { id: 'screen', when: function (x) { return isNaN(x.glucose) || isNaN(x.sys); }, apply: function () {} }
  ];
  function copy(x) { var o = {}; for (var k in x) o[k] = x[k]; return o; }
  function withRecs(x, ids) {
    var o = copy(x);
    RECS.forEach(function (r) { if (ids[r.id] && r.when(x)) r.apply(o); });
    return o;
  }
  /* Deterministic generator so the interval does not flicker between renders. */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function interval(z, sigma) {
    var r = rng(20261112), out = new Array(N_SIM);
    for (var i = 0; i < N_SIM; i++) {
      var u = Math.max(1e-9, r()), v = r();
      out[i] = sigmoid(z + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
    }
    out.sort(function (a, b) { return a - b; });
    return [out[Math.floor(N_SIM * 0.1)], out[Math.floor(N_SIM * 0.9)]];
  }
  function markers(x) {
    var wr = clamp(0.2 + 0.35 * x.sugary + 0.012 * (x.upf - 20) + 0.05 * x.fried - 0.4 * x.act - 0.06 * x.veg, -1.5, 2.5);
    var gr = clamp(0.01 + 0.03 * x.sugary + 0.006 * (x.bmi - 23) + 0.001 * (x.upf - 20) - 0.012 * x.act, -0.03, 0.2);
    var sr = clamp(0.4 + 1.2 * x.salt + 0.12 * (x.bmi - 23) + 0.04 * x.alcohol - 0.12 * x.veg - 0.25 * x.act, -1, 4);
    return { wr: wr, gr: gr, sr: sr };
  }
  function scoreOf(p) {
    var s = 100; RISKS.forEach(function (r) { s -= WEIGHTS[r] * Math.min(1, p[r] * 1.6) * 100; });
    return clamp(Math.round(s), 5, 98);
  }
  function compute() {
    var x = features(); if (!x) return null;
    var avail = RECS.filter(function (r) { return r.when(x); });
    var hasG = !isNaN(x.glucose), hasS = !isNaN(x.sys), sigma = 0.55 - (hasG ? 0.15 : 0) - (hasS ? 0.15 : 0);
    var cur = {}, band = {}, drivers = {};
    RISKS.forEach(function (r) {
      var z = logit(r, x); cur[r] = sigmoid(z); band[r] = interval(z, sigma);
      var t = terms(r, x), list = [];
      for (var k in t) if (k !== 'base' && Math.abs(t[k]) >= 0.03) list.push({ k: k, v: t[k] });
      list.sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); });
      drivers[r] = list.slice(0, 6);
    });
    /* impact of each action taken alone, on the risk it lowers most */
    var impact = {};
    avail.forEach(function (r) {
      var one = {}; one[r.id] = 1;
      var y = withRecs(x, one), best = null;
      RISKS.forEach(function (k) { var d = cur[k] - sigmoid(logit(k, y)); if (d > 0.0005 && (!best || d > best.d)) best = { risk: k, d: d }; });
      impact[r.id] = best;
    });
    if (!state.recs) {
      state.recs = {};
      avail.filter(function (r) { return impact[r.id]; }).sort(function (a, b) { return impact[b.id].d - impact[a.id].d; }).slice(0, 3).forEach(function (r) { state.recs[r.id] = 1; });
    }
    var xp = withRecs(x, state.recs), plan = {};
    RISKS.forEach(function (r) { plan[r] = sigmoid(logit(r, xp)); });
    var m = markers(x), mp = markers(xp);
    return {
      x: x, xp: xp, cur: cur, plan: plan, band: band, drivers: drivers, recs: avail, impact: impact, m: m, mp: mp,
      score: scoreOf(cur), scorePlan: scoreOf(plan), reliability: 58 + (hasG ? 14 : 0) + (hasS ? 14 : 0), hasG: hasG, hasS: hasS,
      alerts: alerts(x, m)
    };
  }
  function alerts(x, m) {
    var out = [], female = !x.male;
    if (!isNaN(x.glucose) && x.glucose >= 6.1 && x.glucose < 7) out.push({ k: 'ifg', hz: '6m', tone: 'alert' });
    if (!isNaN(x.sys) && x.sys >= 130) out.push({ k: x.salt ? 'sodium' : 'bp', hz: '6m', tone: 'alert' });
    else if (x.salt && isNaN(x.sys)) out.push({ k: 'sodium.u', hz: '2y', tone: 'warn' });
    if (x.sugary >= 2 && x.bmi >= 25) out.push({ k: 'glycemic', hz: '2y', tone: 'warn' });
    if (x.upf >= 50) out.push({ k: 'upf', hz: '2y', tone: 'warn' });
    if (x.fried >= 5 && x.fish < 1) out.push({ k: 'lipid', hz: '5y', tone: 'warn' });
    if (female && x.age < 50 && x.legumes < 2 && x.veg < 3) out.push({ k: 'iron', hz: '6m', tone: 'warn' });
    if (m.wr >= 1) out.push({ k: 'weight', hz: '2y', tone: 'info', kg: m.wr });
    return out;
  }

  /* ---- 3. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function num(v, d) { try { return Number(v).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }); } catch (e) { return Number(v).toFixed(d); } }
  function pc(p) { var v = p * 100; return num(v, v < 10 ? 1 : 0) + ' %'; }
  function reduced() { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function years() { for (var i = 0; i < HORIZONS.length; i++) if (HORIZONS[i][0] === state.hz) return HORIZONS[i][1]; return 5; }
  var PATHS = {
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0"/>',
    net: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 4M7 17l3-4M14 11l3-4M14 13l3 4"/>',
    bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20h6M9 7c0-1.5 1.5-1.5 1.5-3M13.5 7c0-1.5 1.5-1.5 1.5-3"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    trend: '<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>',
    tree: '<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 12h10M7 12c5 0 5-7 10-7M7 12c5 0 5 7 10 7"/>',
    alert: '<path d="M12 4 3 19h18L12 4z"/><path d="M12 10v4M12 17h.01"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.500-1-8-4-8-9V6l8-3z"/><path d="m9 12 2 2 4-4"/>',
    bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    drop: '<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      PATHS[n].replace(/(\d)\.500/g, '$1.5') + '</svg>';
  }
  function ring() {
    return '<svg class="vp-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="vp-ring__bg" cx="50" cy="50" r="42" pathLength="100"/><circle class="vp-ring__fg" cx="50" cy="50" r="42" pathLength="100"/></svg>';
  }

  /* ---- 4. Template: habits + network ---------------------------------------- */
  function habitsCard() {
    var busy = state.phase === 'run';
    var sliders = HAB_KEYS.map(function (k) {
      var h = HAB[k], unit = k === 'upf' ? t('vp.h.upf.u') : k === 'alcohol' ? t('vp.h.drinks') : t('vp.h.week');
      return '<div class="vp-slider"><label for="vpH-' + k + '">' + esc(t('vp.h.' + k)) + '</label><output id="vpO-' + k + '" for="vpH-' + k + '"><b>' + num(hab[k], 0) + '</b> ' + esc(unit) + '</output>' +
        '<input id="vpH-' + k + '" type="range" min="' + h[0] + '" max="' + h[1] + '" step="' + h[2] + '" value="' + hab[k] + '" data-vp-hab="' + k + '"></div>';
    }).join('');
    var checks = ['famDiab', 'famHta'].map(function (k) {
      return '<label class="vp-check"><input type="checkbox" data-vp-hab="' + k + '"' + (hab[k] ? ' checked' : '') + '><i aria-hidden="true">' + ico('check') + '</i><span>' + esc(t('vp.h.' + k)) + '</span></label>';
    }).join('');
    return '<article class="card vp-hab"><header class="vp-head"><span class="vh-ico">' + ico('bowl') + '</span><div><h3>' + esc(t('vp.hab.title')) + '</h3><p>' + esc(t('vp.hab.sub')) + '</p></div></header>' +
      '<div class="vp-sliders">' + sliders + '</div><div class="vp-checks">' + checks + '</div>' +
      '<p class="vp-error" role="alert">' + (state.error ? esc(t('vp.err')) : '') + '</p>' +
      '<button type="button" class="btn primary vp-run" data-vp-act="run"' + (busy ? ' disabled' : '') + '>' + ico(busy ? 'net' : 'play') + '<span>' + esc(t(busy ? 'vp.running' : state.phase === 'done' ? 'vp.rerun' : 'vp.run')) + '</span></button></article>';
  }
  function logLines() {
    var out = '';
    for (var i = 0; i <= Math.min(state.stage, 7); i++) {
      var done = state.phase === 'done' || i < state.stage;
      out += '<li class="' + (done ? 'is-done' : 'is-on') + '"><i aria-hidden="true">' + (done ? ico('check') : '') + '</i><span>' + esc(t('vp.s.' + i, { n: i === 0 ? INPUTS.length + 2 : num(N_SIM, 0) })) + '</span></li>';
    }
    return out;
  }
  function netStatus() {
    return state.phase === 'idle' ? t('vp.net.idle') : state.phase === 'done' ? t('vp.net.done', { n: num(N_SIM, 0) }) : t('vp.running');
  }
  function netCard() {
    var p = state.phase === 'done' ? 100 : state.phase === 'run' ? Math.round((state.stage + 1) / 8 * 100) : 0;
    return '<article class="card vp-net" data-vp-phase="' + state.phase + '"><header class="vp-head"><span class="vh-ico">' + ico('net') + '</span><div><h3>' + esc(t('vp.net.title')) + '</h3>' +
      '<p id="vpNetStatus" role="status" aria-live="polite">' + esc(netStatus()) + '</p></div></header>' +
      '<div class="vp-canvas"><canvas id="vpCanvas" role="img" aria-label="' + esc(t('vp.net.alt', { n: INPUTS.length })) + '"></canvas></div>' +
      '<div class="progress vp-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p + '"><i id="vpBar" style="width:' + p + '%"></i></div>' +
      '<ol class="vp-log" id="vpLog">' + logLines() + '</ol></article>';
  }

  /* ---- 5. Template: results -------------------------------------------------- */
  function kpiRow(r) {
    var hz = HORIZONS.map(function (h) {
      return '<button type="button" class="vp-seg" data-vp-act="hz" data-vp-v="' + h[0] + '" aria-pressed="' + (state.hz === h[0]) + '">' + esc(t('vp.hz.' + h[0])) + '</button>';
    }).join('');
    return '<div class="vp-kpis">' +
      '<article class="card vp-kpi vp-kpi--score" style="--p:' + r.score + '"><div class="vp-kpi__ring">' + ring() + '<b>' + r.score + '</b></div>' +
        '<div><span>' + esc(t('vp.score.title')) + '</span><strong>' + r.score + ' / 100</strong><small class="vp-good">' + ico('trend') + esc(t('vp.score.plan', { v: r.scorePlan })) + '</small></div></article>' +
      '<article class="card vp-kpi" style="--p:' + r.reliability + '"><div class="vp-kpi__ring vp-kpi__ring--blue">' + ring() + '<b>' + r.reliability + '<small>%</small></b></div>' +
        '<div><span>' + esc(t('vp.rel.title')) + '</span><strong>' + r.reliability + ' %</strong><small>' + esc(t(r.hasG && r.hasS ? 'vp.rel.hint.full' : 'vp.rel.hint.part')) + '</small></div></article>' +
      '<article class="card vp-kpi vp-kpi--hz"><span>' + esc(t('vp.hz.title')) + '</span><div class="vp-segs" role="group" aria-label="' + esc(t('vp.hz.title')) + '">' + hz + '</div></article></div>';
  }
  function riskCards(r) {
    var y = years();
    return '<article class="card vp-risks"><header class="vp-head"><span class="vh-ico">' + ico('shield') + '</span><div><h3>' + esc(t('vp.risk.title')) + '</h3><p>' + esc(t('vp.risk.sub')) + '</p></div></header>' +
      '<div class="vp-risk-grid">' + RISKS.map(function (k, i) {
        var p = atHorizon(r.cur[k], y), q = atHorizon(r.plan[k], y), lvl = levelOf(r.cur[k]);
        return '<button type="button" class="vp-risk vp-lvl--' + lvl + '" data-vp-act="risk" data-vp-v="' + k + '" aria-pressed="' + (state.risk === k) + '" aria-label="' + esc(t('vp.risk.select', { name: t('vp.r.' + k) })) + '" style="--p:' + (clamp(p, 0, 1) * 100).toFixed(1) + ';--i:' + i + '">' +
          '<span class="vp-risk__name">' + esc(t('vp.r.' + k)) + '</span>' +
          '<span class="vp-risk__ring">' + ring() + '<b>' + esc(pc(p)) + '</b></span>' +
          '<span class="vp-risk__lvl">' + esc(t('vp.lvl.' + lvl)) + '</span>' +
          '<span class="vp-risk__plan">' + esc(t('vp.risk.plan', { v: pc(q) })) + '</span></button>';
      }).join('') + '</div></article>';
  }
  function trajectory(r) {
    var k = state.risk, W = 640, H = 300, L = 46, R = 18, T = 18, B = 34, iw = W - L - R, ih = H - T - B;
    var p5 = r.cur[k], q5 = r.plan[k], lo = r.band[k][0], hi = r.band[k][1];
    var top = Math.max(atHorizon(hi, 5), 0.02) * 1.15, max = top <= 0.05 ? 0.05 : top <= 0.1 ? 0.1 : top <= 0.2 ? 0.2 : top <= 0.4 ? 0.4 : top <= 0.6 ? 0.6 : 1;
    var X = function (yr) { return L + iw * yr / 5; }, Y = function (p) { return T + ih * (1 - Math.min(p, max) / max); };
    var pts = function (p) { var a = []; for (var i = 0; i <= 20; i++) { var yr = i / 4; a.push([X(yr), Y(atHorizon(p, yr))]); } return a; };
    var line = function (a) { return a.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); };
    var up = pts(hi), dn = pts(lo).reverse();
    var grid = '', i;
    for (i = 0; i <= 4; i++) {
      var gv = max * i / 4, gy = Y(gv);
      grid += '<line class="vp-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '"/><text class="vp-axis" x="' + (L - 8) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end">' + num(gv * 100, max <= 0.05 ? 1 : 0) + ' %</text>';
    }
    var labels = [[0, 'vp.traj.now'], [0.5, 'vp.hz.6m'], [1, 'vp.traj.1y'], [2, 'vp.hz.2y'], [3, 'vp.traj.3y'], [4, 'vp.traj.4y'], [5, 'vp.hz.5y']];
    var xl = labels.map(function (l) {
      return '<text class="vp-axis' + (l[0] === years() ? ' is-on' : '') + '" x="' + X(l[0]).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' + (l[0] === 0 ? 'start' : l[0] === 5 ? 'end' : 'middle') + '">' + esc(t(l[1])) + '</text>';
    }).join('');
    var y = years(), hx = X(y);
    var dots = HORIZONS.map(function (h) {
      var on = h[1] === y;
      return '<circle class="vp-dot vp-dot--cur' + (on ? ' is-on' : '') + '" cx="' + X(h[1]).toFixed(1) + '" cy="' + Y(atHorizon(p5, h[1])).toFixed(1) + '" r="' + (on ? 6 : 4) + '"/>' +
        '<circle class="vp-dot vp-dot--plan' + (on ? ' is-on' : '') + '" cx="' + X(h[1]).toFixed(1) + '" cy="' + Y(atHorizon(q5, h[1])).toFixed(1) + '" r="' + (on ? 6 : 4) + '"/>';
    }).join('');
    var name = t('vp.r.' + k);
    return '<article class="card vp-traj"><header class="vp-head"><span class="vh-ico">' + ico('trend') + '</span><div><h3>' + esc(t('vp.traj.title', { name: name })) + '</h3></div></header>' +
      '<div class="vp-scroll"><svg class="vp-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('vp.traj.alt', { name: name })) + '">' + grid +
        '<path class="vp-band" d="' + line(up) + ' ' + line(dn).replace('M', 'L') + ' Z"/>' +
        '<line class="vp-hline" x1="' + hx.toFixed(1) + '" x2="' + hx.toFixed(1) + '" y1="' + T + '" y2="' + (T + ih) + '"/>' +
        '<path class="vp-line vp-line--cur" pathLength="100" d="' + line(pts(p5)) + '"/><path class="vp-line vp-line--plan" pathLength="100" d="' + line(pts(q5)) + '"/>' + dots + xl + '</svg></div>' +
      '<div class="vp-legend"><span class="vp-key vp-key--cur">' + esc(t('vp.traj.cur')) + ' · <b>' + esc(pc(atHorizon(p5, y))) + '</b></span>' +
        '<span class="vp-key vp-key--plan">' + esc(t('vp.traj.plan')) + ' · <b>' + esc(pc(atHorizon(q5, y))) + '</b></span>' +
        '<span class="vp-key vp-key--band">' + esc(t('vp.traj.band', { n: num(N_SIM, 0) })) + '</span></div></article>';
  }
  function driversCard(r) {
    var list = r.drivers[state.risk], max = list.length ? Math.abs(list[0].v) : 1;
    var rows = list.map(function (d, i) {
      var up = d.v > 0, w = Math.max(6, Math.abs(d.v) / max * 100);
      return '<li class="vp-drv ' + (up ? 'is-up' : 'is-down') + '" style="--w:' + w.toFixed(0) + '%;--i:' + i + '"><span>' + esc(t('vp.in.' + d.k)) + '</span>' +
        '<div class="vp-drv__bar"><i></i></div><em>' + (up ? '+' : '−') + num(Math.abs(d.v), 2) + ' · ' + esc(t(up ? 'vp.drv.up' : 'vp.drv.down')) + '</em></li>';
    }).join('');
    return '<article class="card vp-drivers"><header class="vp-head"><span class="vh-ico">' + ico('bars') + '</span><div><h3>' + esc(t('vp.drv.title')) + '</h3><p>' + esc(t('vp.drv.sub')) + '</p></div></header>' +
      (rows ? '<ul class="vp-drv-list">' + rows + '</ul>' : '<p class="vp-empty">' + esc(t('vp.drv.none')) + '</p>') + '</article>';
  }
  function outcomes(p) { var early = (1 - p) * Math.min(0.6, p * 1.5); return [1 - p - early, early, p]; }
  function treeCard(r) {
    var k = state.risk, W = 684, H = 330, a = outcomes(r.cur[k]), b = outcomes(r.plan[k]);
    var names = [t('vp.tree.ok'), t('vp.e.' + k), t('vp.r.' + k)], tones = ['good', 'warn', 'bad'];
    var rootX = 8, RW = 140, rootY = H / 2, midX = 250, leafX = 474, ys = [[40, 85, 130], [200, 245, 290]], mids = [85, 245];
    var curve = function (x1, y1, x2, y2) { var mx = (x1 + x2) / 2; return 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2; };
    var out = '';
    [[a, 'cur', t('vp.tree.cur')], [b, 'plan', t('vp.tree.plan')]].forEach(function (br, bi) {
      out += '<path class="vp-edge vp-edge--' + br[1] + '" pathLength="100" style="--i:' + bi + '" d="' + curve(rootX + RW, rootY, midX, mids[bi]) + '"/>';
      br[0].forEach(function (p, i) {
        out += '<path class="vp-edge vp-edge--' + tones[i] + '" pathLength="100" style="--i:' + (2 + bi * 3 + i) + ';stroke-width:' + (1.5 + p * 9).toFixed(1) + '" d="' + curve(midX + 150, mids[bi], leafX, ys[bi][i]) + '"/>' +
          '<g class="vp-leaf vp-leaf--' + tones[i] + '" style="--i:' + (2 + bi * 3 + i) + '"><rect x="' + leafX + '" y="' + (ys[bi][i] - 17) + '" width="200" height="34" rx="17"/>' +
          '<text x="' + (leafX + 14) + '" y="' + (ys[bi][i] + 5) + '">' + esc(names[i]) + '</text><text class="vp-leaf__p" x="' + (leafX + 188) + '" y="' + (ys[bi][i] + 5) + '" text-anchor="end">' + esc(pc(p)) + '</text></g>';
      });
      out += '<g class="vp-node vp-node--' + br[1] + '"><rect x="' + midX + '" y="' + (mids[bi] - 20) + '" width="150" height="40" rx="20"/><text x="' + (midX + 75) + '" y="' + (mids[bi] + 5) + '" text-anchor="middle">' + esc(br[2]) + '</text></g>';
    });
    out += '<g class="vp-node vp-node--root"><rect x="' + rootX + '" y="' + (rootY - 22) + '" width="' + RW + '" height="44" rx="22"/><text x="' + (rootX + RW / 2) + '" y="' + (rootY + 5) + '" text-anchor="middle">' + esc(t('vp.tree.root')) + '</text></g>';
    return '<article class="card vp-tree"><header class="vp-head"><span class="vh-ico">' + ico('tree') + '</span><div><h3>' + esc(t('vp.tree.title')) + '</h3><p>' + esc(t('vp.r.' + k)) + '</p></div></header>' +
      '<div class="vp-tree__scroll"><svg class="vp-treesvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('vp.tree.alt', { name: t('vp.r.' + k) })) + '">' + out + '</svg></div></article>';
  }
  function sideCard(r) {
    var y = years(), x = r.x, hzName = t('vp.hz.' + state.hz);
    var w0 = x.weight, wc = w0 + r.m.wr * y, wp = r.xp.loss ? w0 * (1 - 0.05 * Math.min(1, y)) + Math.min(0, r.mp.wr) * Math.max(0, y - 1) * 0.3 : w0 + r.mp.wr * y;
    var g0 = r.hasG ? x.glucose : 5.0, s0 = r.hasS ? x.sys : 120;
    var rows = [
      ['weight', num(wc, 1) + ' kg', num(wp, 1) + ' kg', wc - w0, false],
      ['glucose', num(g0 + r.m.gr * y, 1) + ' mmol/L', num(g0 + r.mp.gr * y, 1) + ' mmol/L', r.m.gr, !r.hasG],
      ['sys', num(s0 + r.m.sr * y, 0) + ' mmHg', num(s0 + r.mp.sr * y, 0) + ' mmHg', r.m.sr, !r.hasS]
    ].map(function (m) {
      return '<div class="vp-bio"><span>' + esc(t('vp.bio.' + m[0])) + (m[4] ? ' *' : '') + '</span><div><b class="' + (m[3] > 0.005 ? 'is-up' : '') + '">' + esc(m[1]) + '</b><small>' + esc(t('vp.bio.cur')) + '</small></div>' +
        '<div><b class="is-plan">' + esc(m[2]) + '</b><small>' + esc(t('vp.bio.plan')) + '</small></div></div>';
    }).join('');
    var al = r.alerts.length ? r.alerts.map(function (a, i) {
      return '<li class="vp-alert vp-alert--' + a.tone + '" style="--i:' + i + '">' + ico(a.tone === 'info' ? 'trend' : 'alert') + '<span>' + esc(t('vp.al.' + a.k, { kg: num(a.kg || 0, 1) })) + '</span><em>' + esc(t('vp.hz.' + a.hz)) + '</em></li>';
    }).join('') : '<li class="vp-alert vp-alert--good">' + ico('check') + '<span>' + esc(t('vp.al.none')) + '</span></li>';
    return '<article class="card vp-side"><header class="vp-head"><span class="vh-ico">' + ico('drop') + '</span><div><h3>' + esc(t('vp.bio.title', { hz: hzName })) + '</h3></div></header>' +
      '<div class="vp-bios">' + rows + '</div>' + (!r.hasG || !r.hasS ? '<p class="vp-foot">* ' + esc(t('vp.bio.assumed')) + '</p>' : '') +
      '<h4>' + ico('alert') + esc(t('vp.al.title')) + '</h4><ul class="vp-alerts">' + al + '</ul></article>';
  }
  function recsCard(r) {
    var rows = r.recs.map(function (rec, i) {
      var imp = r.impact[rec.id], on = !!state.recs[rec.id];
      return '<li style="--i:' + i + '"><label class="vp-rec' + (on ? ' is-on' : '') + '"><input type="checkbox" data-vp-rec="' + rec.id + '"' + (on ? ' checked' : '') + '><i aria-hidden="true">' + ico('check') + '</i>' +
        '<span class="vp-rec__txt">' + esc(t('vp.rec.' + rec.id)) + '</span>' +
        '<em class="' + (imp ? 'vp-good' : '') + '">' + esc(imp ? t('vp.rec.impact', { v: num(imp.d * 100, 1), name: t('vp.r.' + imp.risk) }) : t('vp.rec.noimpact')) + '</em></label></li>';
    }).join('');
    return '<article class="card vp-recs"><header class="vp-head"><span class="vh-ico">' + ico('shield') + '</span><div><h3>' + esc(t('vp.rec.title')) + '</h3><p>' + esc(t('vp.rec.sub')) + '</p></div></header>' +
      (rows ? '<ul class="vp-rec-list">' + rows + '</ul>' : '<p class="vp-empty">' + esc(t('vp.rec.none')) + '</p>') +
      '<p class="vp-note">' + esc(t('vp.note')) + '</p></article>';
  }
  function resultsHtml() {
    var r = state.result; if (state.phase !== 'done' || !r) return '';
    return kpiRow(r) + riskCards(r) + trajectory(r) + driversCard(r) + treeCard(r) + sideCard(r) + recsCard(r);
  }
  function shell() {
    return '<div class="vp">' +
      '<article class="card vp-intro"><div><span class="vp-kicker">' + esc(t('vp.kicker')) + '</span><h3 class="vp-title">' + ico('brain') + esc(t('vp.title')) + '</h3><p>' + esc(t('vp.sub')) + '</p></div>' +
        '<span class="pill vp-badge">' + esc(t('vp.badge')) + '</span></article>' +
      habitsCard() + netCard() +
      '<div class="vp-results' + (state.intro ? ' is-intro' : '') + '" id="vpResults" aria-live="polite">' + resultsHtml() + '</div></div>';
  }

  /* ---- 6. Neural network canvas ---------------------------------------------- */
  var host = doc.createElement('div');
  host.className = 'vp-host';
  var net = { raf: 0, t0: 0, pulses: [], colors: null, w: 0, h: 0, edges: null };
  var LAYERS = [INPUTS.length, 8, 6, RISKS.length];
  function cssVar(name, fb) { var v = global.getComputedStyle(doc.documentElement).getPropertyValue(name); return (v && v.trim()) || fb; }
  function readColors() {
    net.colors = { lime: cssVar('--accent-lime', '#D2F85A'), blue: cssVar('--accent-blue', '#4E65EC'), orange: cssVar('--accent-orange', '#F59B42'), red: cssVar('--accent-red', '#FF8A8A'),
      lav: cssVar('--accent-lavender', '#8F88E8'), text: cssVar('--text-primary', '#fff'), muted: cssVar('--text-secondary', '#9A9CA3'), well: cssVar('--bg-card-secondary', '#37383F'), line: cssVar('--border-strong', 'rgba(255,255,255,.16)') };
  }
  function buildEdges() {
    var r = rng(7), list = [];
    for (var l = 0; l < LAYERS.length - 1; l++) for (var i = 0; i < LAYERS[l]; i++) for (var j = 0; j < LAYERS[l + 1]; j++) list.push({ l: l, i: i, j: j, w: r() });
    net.edges = list;
  }
  function activation(k) {
    var x = state.last; if (!x) return 0.4;
    var m = { age: (x.age - 18) / 60, bmi: (x.bmi - 17) / 20, veg: x.veg / 5, sugary: x.sugary / 4, salt: x.salt, upf: x.upf / 80, fried: x.fried / 14, legumes: x.legumes / 10, fish: x.fish / 5,
      alcohol: x.alcohol / 21, act: x.act / 3, glucose: isNaN(x.glucose) ? 0 : (x.glucose - 4) / 5, sys: isNaN(x.sys) ? 0 : (x.sys - 100) / 70, fam: (x.famDiab + x.famHta) / 2 };
    return clamp(m[k] == null ? 0.4 : m[k], 0, 1);
  }
  function nodePos(l, i) {
    var compact = net.w < 560, padL = compact ? 106 : 132, padR = compact ? 112 : 176, n = LAYERS[l];
    var x = padL + (net.w - padL - padR) * l / (LAYERS.length - 1), top = 16, bottom = net.h - 16;
    return [x, n === 1 ? (top + bottom) / 2 : top + (bottom - top) * (i + 0.5) / n];
  }
  function drawNet(now) {
    var cv = doc.getElementById('vpCanvas'); if (!cv || !cv.getContext) return;
    var box = cv.parentNode.getBoundingClientRect(), dpr = Math.min(2, global.devicePixelRatio || 1);
    if (box.width < 10) return;
    var w = Math.round(box.width), h = Math.round(box.height);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    net.w = w; net.h = h;
    if (!net.colors) readColors();
    if (!net.edges) buildEdges();
    var c = net.colors, g = cv.getContext('2d'), running = state.phase === 'run', done = state.phase === 'done';
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    var tsec = now / 1000, live = running ? Math.max(0, Math.min(2, state.stage - 2)) : -1;   /* layer whose edges fire during the run */
    /* edges */
    g.lineWidth = 1;
    net.edges.forEach(function (e) {
      var a = nodePos(e.l, e.i), b = nodePos(e.l + 1, e.j);
      var hot = running && state.stage >= 2 && e.l <= live;
      g.globalAlpha = (state.phase === 'idle' ? 0.10 : 0.16) + e.w * (hot || done ? 0.30 : 0.10);
      g.strokeStyle = hot || done ? (e.w > 0.66 ? c.lime : e.w > 0.33 ? c.blue : c.lav) : c.muted;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    });
    g.globalAlpha = 1;
    /* pulses */
    if (!reduced()) {
      var rate = running ? 5 : done ? 1 : 0.4;
      if (net.pulses.length < (running ? 90 : 26) && Math.random() < rate * 0.35) {
        var pool = running ? net.edges.filter(function (e) { return e.l === (state.stage < 2 ? 0 : live); }) : net.edges;
        var e = pool[Math.floor(Math.random() * pool.length)];
        if (e) net.pulses.push({ e: e, t: 0, s: (running ? 1.6 : 0.6) + Math.random() * 0.6 });
      }
      var dt = Math.min(0.05, (now - (net.t0 || now)) / 1000); net.t0 = now;
      net.pulses = net.pulses.filter(function (p) {
        p.t += dt * p.s; if (p.t >= 1) return false;
        var a = nodePos(p.e.l, p.e.i), b = nodePos(p.e.l + 1, p.e.j), x = a[0] + (b[0] - a[0]) * p.t, y = a[1] + (b[1] - a[1]) * p.t;
        g.fillStyle = p.e.w > 0.5 ? c.lime : c.blue; g.globalAlpha = 0.9 * Math.sin(Math.PI * p.t);
        g.beginPath(); g.arc(x, y, running ? 2.6 : 2, 0, 6.2832); g.fill();
        return true;
      });
      g.globalAlpha = 1;
    }
    /* nodes */
    var compact = w < 560; g.font = (compact ? '500 11px ' : '500 12px ') + cssVar('--font', 'system-ui, sans-serif'); g.textBaseline = 'middle';
    for (var l = 0; l < LAYERS.length; l++) for (var i = 0; i < LAYERS[l]; i++) {
      var p = nodePos(l, i), rad = l === 0 ? 5 : l === 3 ? 9 : 6, fill = c.well, glow = 0;
      if (l === 0) { var act = state.phase === 'idle' ? 0 : activation(INPUTS[i]); glow = act; fill = act > 0.02 ? c.lime : c.well; g.globalAlpha = state.phase === 'idle' ? 1 : 0.35 + act * 0.65; }
      else if (l === 3) {
        var rk = RISKS[i], pr = done && state.result ? state.result.cur[rk] : 0, lvl = levelOf(pr);
        fill = done ? (lvl === 'low' ? c.lime : lvl === 'mod' ? c.blue : lvl === 'high' ? c.orange : c.red) : (running && state.stage >= 5 ? c.lav : c.well); glow = done ? 0.8 : 0;
      } else {
        var on = running && state.stage >= l + 1 || done;
        fill = on ? (l === 1 ? c.blue : c.lav) : c.well;
        if (on && !reduced()) g.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(tsec * 2 + i * 1.3 + l));
      }
      if (glow > 0.3 && (running || done)) { g.save(); g.globalAlpha = 0.18; g.fillStyle = fill; g.beginPath(); g.arc(p[0], p[1], rad + 5 + (reduced() ? 0 : 2 * Math.sin(tsec * 3 + i)), 0, 6.2832); g.fill(); g.restore(); }
      g.fillStyle = fill; g.beginPath(); g.arc(p[0], p[1], rad, 0, 6.2832); g.fill();
      g.globalAlpha = 1; g.strokeStyle = c.line; g.lineWidth = 1; g.stroke();
      if (l === 0) { g.fillStyle = c.muted; g.textAlign = 'right'; g.fillText(t('vp.in.' + INPUTS[i]), p[0] - 12, p[1]); }
      if (l === 3) {
        g.textAlign = 'left'; g.fillStyle = c.text; var label = t('vp.r.' + RISKS[i]), maxW = (compact ? 112 : 176) - 22;
        if (done && state.result) { g.fillText(label, p[0] + 16, p[1] - 8, maxW); g.fillStyle = c.muted; g.fillText(pc(atHorizon(state.result.cur[RISKS[i]], years())), p[0] + 16, p[1] + 9, maxW); }
        else g.fillText(label, p[0] + 16, p[1], maxW);
      }
    }
  }
  function loop(now) {
    net.raf = 0;
    if (!doc.body.contains(host) || !root.classList.contains('on')) return;      /* restarted by mount() / visibility watcher */
    drawNet(now || 0);
    if (!reduced() || state.phase === 'run') net.raf = global.requestAnimationFrame(loop);
  }
  function kick() { if (!net.raf && global.requestAnimationFrame) net.raf = global.requestAnimationFrame(loop); }

  /* ---- 7. Render ----------------------------------------------------------------- */
  function selectorOf(el) {
    if (!el || !el.getAttribute) return null;
    if (el.id) return '#' + el.id;
    var a = el.getAttribute('data-vp-act'), v = el.getAttribute('data-vp-v');
    if (a) return '[data-vp-act="' + a + '"]' + (v ? '[data-vp-v="' + v + '"]' : '');
    if (el.getAttribute('data-vp-rec')) return '[data-vp-rec="' + el.getAttribute('data-vp-rec') + '"]';
    if (el.getAttribute('data-vp-hab')) return '[data-vp-hab="' + el.getAttribute('data-vp-hab') + '"]';
    return null;
  }
  function refocus(sel) { var el = sel ? host.querySelector(sel) : null; if (el && !el.disabled) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }
  function rebuild() {
    var keep = host.contains(doc.activeElement) ? selectorOf(doc.activeElement) : null;
    host.innerHTML = shell();
    refocus(keep); kick();
  }
  function paintResults(intro) {
    var box = host.querySelector('#vpResults'); if (!box) return;
    var keep = host.contains(doc.activeElement) ? selectorOf(doc.activeElement) : null;
    state.intro = !!intro && !reduced();
    box.classList.toggle('is-intro', state.intro);
    box.innerHTML = resultsHtml();
    refocus(keep); kick();
  }
  function paintRun() {
    var log = host.querySelector('#vpLog'), bar = host.querySelector('#vpBar'), st = host.querySelector('#vpNetStatus'), card = host.querySelector('.vp-net');
    var p = state.phase === 'done' ? 100 : Math.round((state.stage + 1) / 8 * 100);
    if (log) log.innerHTML = logLines();
    if (bar) { bar.style.width = p + '%'; if (bar.parentNode) bar.parentNode.setAttribute('aria-valuenow', p); }
    if (st) st.textContent = netStatus();
    if (card) card.setAttribute('data-vp-phase', state.phase);
  }
  function mount() {
    var slot = doc.getElementById('vaPredict'); if (!slot) return;
    if (!host.firstChild) host.innerHTML = shell();
    if (host.parentNode !== slot) slot.appendChild(host);
    kick();
  }
  /* Recompute without replaying the analysis (sliders, form edits, toggles). */
  function refresh() {
    if (state.phase !== 'done') { features(); kick(); return; }
    var r = compute(); if (!r) return;
    state.result = r; paintResults(false);
  }

  /* ---- 8. Actions ------------------------------------------------------------------ */
  var timer = null;
  var DUR = [700, 650, 800, 800, 1300, 650, 650, 500];
  function finish() {
    timer = null; state.phase = 'done'; state.stage = 8;
    state.result = compute();
    rebuild(); paintResults(true);
    var box = host.querySelector('#vpResults');
    if (box && box.scrollIntoView && root.classList.contains('on')) { try { box.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); } catch (e) { /* ignore */ } }
  }
  function advance() {
    state.stage += 1;
    if (state.stage >= 8) { finish(); return; }
    paintRun();
    timer = global.setTimeout(advance, DUR[state.stage]);
  }
  /* Starts the analysis. Called by the lab button and by view-ai.js when a plan is generated. */
  function run() {
    if (state.phase === 'run') return false;
    if (!features()) { state.error = true; rebuild(); return false; }
    state.error = false; state.recs = null; state.result = null; state.intro = false;
    if (timer) { global.clearTimeout(timer); timer = null; }
    if (reduced()) { finish(); return true; }
    state.phase = 'run'; state.stage = -1; net.pulses = [];
    rebuild(); advance();
    return true;
  }
  function start() {
    /* The plan generator validates the form; when it accepts, it calls run() itself. */
    var ok = typeof global.generatePlan === 'function' ? global.generatePlan() : true;
    if (ok === false) {
      var api = global.NutriBentoViews && global.NutriBentoViews.ai, st = api ? api.state() : null;
      if (st && st.errors && st.errors.length) { state.error = true; rebuild(); return; }
    }
    if (state.phase !== 'run') run();
  }

  host.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-vp-act]') : null;
    if (!el || !host.contains(el) || el.disabled) return;
    var act = el.getAttribute('data-vp-act'), v = el.getAttribute('data-vp-v');
    if (act === 'run') start();
    else if (act === 'hz' && state.phase === 'done') { state.hz = v; paintResults(false); }
    else if (act === 'risk' && state.phase === 'done' && RISKS.indexOf(v) >= 0) { state.risk = v; paintResults(false); }
  });
  function onHabit(ev) {
    var el = ev.target, k = el && el.getAttribute && el.getAttribute('data-vp-hab');
    if (k) {
      if (el.type === 'checkbox') hab[k] = !!el.checked;
      else { hab[k] = clamp(+el.value || 0, HAB[k][0], HAB[k][1]); var out = host.querySelector('#vpO-' + k + ' b'); if (out) out.textContent = num(hab[k], 0); }
      if (ev.type === 'change') save();
      refresh(); return;
    }
    var rec = el && el.getAttribute && el.getAttribute('data-vp-rec');
    if (rec && ev.type === 'change' && state.phase === 'done') {
      state.recs = state.recs || {};
      if (el.checked) state.recs[rec] = 1; else delete state.recs[rec];
      refresh();
    }
  }
  host.addEventListener('input', onHabit);
  host.addEventListener('change', onHabit);
  /* Edits in the AI form above feed the projection live. */
  root.addEventListener('input', function (ev) { if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-va-field')) global.setTimeout(refresh, 0); });
  root.addEventListener('change', function (ev) { if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-va-field')) global.setTimeout(refresh, 0); });
  doc.addEventListener('nutri:themeChanged', function () { net.colors = null; kick(); });
  global.addEventListener('resize', kick);
  if (global.MutationObserver) new global.MutationObserver(function () { if (root.classList.contains('on')) kick(); }).observe(root, { attributes: true, attributeFilter: ['class'] });
  I18N.onChange(function () { rebuild(); mount(); });

  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.aiPredict = {
    mount: mount, run: run,
    state: function () {
      var r = state.result;
      return { phase: state.phase, stage: state.stage, risk: state.risk, horizon: state.hz, habits: JSON.parse(JSON.stringify(hab)), recs: state.recs ? Object.keys(state.recs) : [],
        risks: r ? JSON.parse(JSON.stringify(r.cur)) : null, plan: r ? JSON.parse(JSON.stringify(r.plan)) : null, score: r ? r.score : null, reliability: r ? r.reliability : null };
    }
  };
  features();
  mount();
})(window);
