/* ==========================================================================
   NUTRI.N°1 — AI Nutrition & Prevention view  (SESSION 5)
   Renders <section id="ai"> as a Dark Bento grid.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.va-*)
   Preserves  : generatePlan(), #aiWizard (.step / .active / .done), #aiProgress,
                #aiStatus, #planCards
   Storage    : nutri_ai_profile  (the form values, this browser only)
   Note       : demonstration only. The "engine" is a small set of transparent rules
                (Mifflin-St Jeor energy estimate, WHO BMI classes and intake goals,
                fasting-glucose and blood-pressure cut-offs) listed in the "Explain"
                card. It is not a trained model and not medical advice. Adults only.
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
      'ai.title': 'AI Nutrition & Prevention Engine',
      'ai.sub': 'See exactly how a personalized plan is generated, step by step.',
      'ai.demo': 'Demonstration · rule-based',
      'ai.demo.note': 'This demonstration applies a small set of published rules, listed in the “Explain” card. It is not a trained AI model and not medical advice. Adults (18+) only.',
      'ai.form.title': 'Your inputs',
      'ai.form.profile': 'Profile', 'ai.form.diet': 'Diet', 'ai.form.clinical': 'Clinical (optional)',
      'ai.f.age': 'Age (years)', 'ai.f.sex': 'Sex', 'ai.f.sex.f': 'Female', 'ai.f.sex.m': 'Male',
      'ai.f.height': 'Height (cm)', 'ai.f.weight': 'Weight (kg)',
      'ai.f.activity': 'Activity level', 'ai.f.activity.low': 'Sedentary', 'ai.f.activity.light': 'Lightly active', 'ai.f.activity.moderate': 'Moderately active', 'ai.f.activity.high': 'Very active',
      'ai.f.pattern': 'Eating pattern', 'ai.f.pattern.omni': 'Everything', 'ai.f.pattern.pesc': 'Fish, no meat', 'ai.f.pattern.veg': 'Vegetarian',
      'ai.f.veg': 'Fruit & vegetable servings per day', 'ai.f.sugary': 'Sugary drinks per day',
      'ai.f.salt': 'I often add salt or stock cubes',
      'ai.f.glucose': 'Fasting glucose (mmol/L)', 'ai.f.sys': 'Systolic blood pressure (mmHg)',
      'ai.f.country': 'Country foods', 'ai.f.country.hint': 'Change the country in the header.',
      'ai.fill': 'Use my Citizen profile', 'ai.fill.done': 'Citizen profile copied into the form.', 'ai.fill.none': 'Citizen profile is not available yet.',
      'ai.generate': 'Generate personalized plan', 'ai.generating': 'Generating…',
      'ai.err.age': 'Enter an age between 18 and 90.', 'ai.err.height': 'Enter a height between 120 and 220 cm.',
      'ai.err.weight': 'Enter a weight between 30 and 250 kg.', 'ai.err.glucose': 'Enter a value between 2 and 30 mmol/L, or leave it empty.',
      'ai.err.sys': 'Enter a value between 70 and 250 mmHg, or leave it empty.', 'ai.err.summary': 'Please correct the highlighted fields.',
      'ai.pipe.title': 'Generation pipeline',
      'ai.step.profile': 'Profile', 'ai.step.diet': 'Diet', 'ai.step.clinical': 'Clinical', 'ai.step.country': 'Country foods',
      'ai.step.gaps': 'Nutrient gaps', 'ai.step.prevention': 'Prevention', 'ai.step.meal': 'Meal plan', 'ai.step.explain': 'Explain',
      'ai.status.ready': 'Ready to generate.', 'ai.status.run': 'Step {n} of 8 · {step}', 'ai.status.done': 'Plan generated for {country}.',
      'ai.status.stale': 'Inputs changed: generate again to update the plan.',
      'ai.plan.empty': 'Fill in the form and generate: the plan appears here.',
      'ai.c.targets': 'Daily targets', 'ai.c.gaps': 'Nutrient gaps', 'ai.c.prevention': 'Prevention priorities', 'ai.c.meals': 'One-day meal plan', 'ai.c.explain': 'How this was calculated',
      'ai.t.energy': 'Energy', 'ai.t.protein': 'Protein (minimum)', 'ai.t.fiber': 'Fibre (at least)', 'ai.t.sugar': 'Free sugars (less than)', 'ai.t.salt': 'Salt (less than)', 'ai.t.veg': 'Fruit & vegetables (at least)',
      'ai.t.veg.value': '5 servings', 'ai.t.bmi': 'BMI {v} · {cls}',
      'ai.bmi.under': 'underweight', 'ai.bmi.normal': 'healthy weight', 'ai.bmi.over': 'overweight', 'ai.bmi.obese': 'obesity',
      'ai.g.veg': 'Fruit and vegetables below 5 servings: fibre, vitamin A, vitamin C and potassium are likely low.',
      'ai.g.iron': 'Iron needs are higher for women aged 18–49: include legumes, leafy greens and a vitamin C source at meals.',
      'ai.g.vegdiet': 'Vegetarian pattern: watch vitamin B12, iron and zinc; ask a professional about B12.',
      'ai.g.sugar': 'Sugary drinks add free sugars with little nutritional value: replace them with water or unsweetened infusions.',
      'ai.g.salt': 'Added salt and stock cubes push sodium up: season with herbs, spices, onion, garlic or lemon instead.',
      'ai.g.none': 'No major gap flagged from the information given.',
      'ai.p.bmi.under': 'Weight is below the healthy range: increase energy with nutrient-dense foods and seek advice if weight loss was unintended.',
      'ai.p.bmi.over': 'Weight is above the healthy range: a moderate energy reduction and more daily movement lower cardiometabolic risk.',
      'ai.p.bmi.obese': 'BMI is in the obesity range: a supervised plan with a health professional is recommended.',
      'ai.p.glu.ifg': 'Fasting glucose is in the impaired range (6.1–6.9 mmol/L): limit sugary foods and refined starches, and have it rechecked.',
      'ai.p.glu.high': 'Fasting glucose is at or above 7.0 mmol/L: please see a health professional for confirmation.',
      'ai.p.bp.elev': 'Systolic pressure is 130–139 mmHg: reduce salt, keep active and recheck regularly.',
      'ai.p.bp.high': 'Systolic pressure is at or above 140 mmHg: please see a health professional.',
      'ai.p.activity': 'Aim for at least 150 minutes of moderate activity per week.',
      'ai.p.none': 'No specific risk flagged: keep a varied diet and regular activity.',
      'ai.m.breakfast': 'Breakfast', 'ai.m.lunch': 'Lunch', 'ai.m.dinner': 'Dinner', 'ai.m.snack': 'Snack',
      'ai.m.b.sahel': 'Millet porridge with groundnuts and moringa', 'ai.m.b.coast': 'Maize porridge with groundnuts and fresh fruit',
      'ai.m.staple.sahel': 'millet or sorghum tô', 'ai.m.staple.coast': 'yam, cassava or maize paste',
      'ai.m.l.omni': 'Leafy-vegetable sauce with fish, served with {staple}', 'ai.m.l.pesc': 'Leafy-vegetable sauce with fish, served with {staple}', 'ai.m.l.veg': 'Leafy-vegetable sauce with cowpeas, served with {staple}',
      'ai.m.d.omni': 'Vegetable soup with grilled chicken and brown rice', 'ai.m.d.pesc': 'Vegetable soup with grilled fish and brown rice', 'ai.m.d.veg': 'Bean and vegetable stew with brown rice',
      'ai.m.s': 'Fresh fruit (mango, orange or papaya) and a handful of groundnuts',
      'ai.m.note.glucose': 'Because glucose is raised: prefer whole grains and keep starch to a quarter of the plate.',
      'ai.m.note.salt': 'Cook without stock cubes; season with herbs, spices and lemon.',
      'ai.x.bmi': 'BMI = weight ÷ height² = {v} kg/m² (WHO classes: 18.5 / 25 / 30).',
      'ai.x.bmr': 'Resting energy (Mifflin-St Jeor) = {v} kcal.',
      'ai.x.tdee': 'Daily expenditure = resting energy × {f} (activity) = {v} kcal.',
      'ai.x.target.keep': 'Energy target = daily expenditure (weight in the healthy range).',
      'ai.x.target.cut': 'Energy target = daily expenditure − 15 % (BMI ≥ 25), never below {floor} kcal.',
      'ai.x.target.add': 'Energy target = daily expenditure + 10 % (BMI < 18.5).',
      'ai.x.protein': 'Protein minimum = 0.83 g per kg of body weight.',
      'ai.x.who': 'Intake goals: fibre ≥ 25 g, free sugars < 10 % of energy, salt < 5 g, ≥ 5 servings of fruit and vegetables (WHO).',
      'ai.x.cut': 'Cut-offs used: fasting glucose 6.1 and 7.0 mmol/L; systolic pressure 130 and 140 mmHg.',
      'ai.x.country': 'Staples chosen for {country}: {staple}.',
      'ai.x.split': 'Energy is split 25 % breakfast, 35 % lunch, 30 % dinner, 10 % snack.'
    },
    fr: {
      'ai.title': 'Moteur IA de nutrition et de prévention',
      'ai.sub': 'Voyez précisément comment un plan personnalisé est généré, étape par étape.',
      'ai.demo': 'Démonstration · à base de règles',
      'ai.demo.note': 'Cette démonstration applique un petit ensemble de règles publiées, listées dans la carte « Explication ». Ce n’est ni un modèle d’IA entraîné ni un avis médical. Adultes (18 ans et plus) uniquement.',
      'ai.form.title': 'Vos informations',
      'ai.form.profile': 'Profil', 'ai.form.diet': 'Alimentation', 'ai.form.clinical': 'Clinique (facultatif)',
      'ai.f.age': 'Âge (années)', 'ai.f.sex': 'Sexe', 'ai.f.sex.f': 'Femme', 'ai.f.sex.m': 'Homme',
      'ai.f.height': 'Taille (cm)', 'ai.f.weight': 'Poids (kg)',
      'ai.f.activity': 'Niveau d’activité', 'ai.f.activity.low': 'Sédentaire', 'ai.f.activity.light': 'Peu actif', 'ai.f.activity.moderate': 'Modérément actif', 'ai.f.activity.high': 'Très actif',
      'ai.f.pattern': 'Régime alimentaire', 'ai.f.pattern.omni': 'De tout', 'ai.f.pattern.pesc': 'Poisson, sans viande', 'ai.f.pattern.veg': 'Végétarien',
      'ai.f.veg': 'Portions de fruits et légumes par jour', 'ai.f.sugary': 'Boissons sucrées par jour',
      'ai.f.salt': 'J’ajoute souvent du sel ou des bouillons cubes',
      'ai.f.glucose': 'Glycémie à jeun (mmol/L)', 'ai.f.sys': 'Tension systolique (mmHg)',
      'ai.f.country': 'Aliments du pays', 'ai.f.country.hint': 'Changez de pays dans l’en-tête.',
      'ai.fill': 'Utiliser mon profil citoyen', 'ai.fill.done': 'Profil citoyen copié dans le formulaire.', 'ai.fill.none': 'Le profil citoyen n’est pas encore disponible.',
      'ai.generate': 'Générer le plan personnalisé', 'ai.generating': 'Génération…',
      'ai.err.age': 'Saisissez un âge entre 18 et 90 ans.', 'ai.err.height': 'Saisissez une taille entre 120 et 220 cm.',
      'ai.err.weight': 'Saisissez un poids entre 30 et 250 kg.', 'ai.err.glucose': 'Saisissez une valeur entre 2 et 30 mmol/L, ou laissez vide.',
      'ai.err.sys': 'Saisissez une valeur entre 70 et 250 mmHg, ou laissez vide.', 'ai.err.summary': 'Veuillez corriger les champs signalés.',
      'ai.pipe.title': 'Pipeline de génération',
      'ai.step.profile': 'Profil', 'ai.step.diet': 'Alimentation', 'ai.step.clinical': 'Clinique', 'ai.step.country': 'Aliments du pays',
      'ai.step.gaps': 'Carences', 'ai.step.prevention': 'Prévention', 'ai.step.meal': 'Plan de repas', 'ai.step.explain': 'Explication',
      'ai.status.ready': 'Prêt à générer.', 'ai.status.run': 'Étape {n} sur 8 · {step}', 'ai.status.done': 'Plan généré pour : {country}.',
      'ai.status.stale': 'Informations modifiées : générez à nouveau pour mettre le plan à jour.',
      'ai.plan.empty': 'Remplissez le formulaire et générez : le plan s’affiche ici.',
      'ai.c.targets': 'Objectifs quotidiens', 'ai.c.gaps': 'Carences probables', 'ai.c.prevention': 'Priorités de prévention', 'ai.c.meals': 'Plan de repas sur une journée', 'ai.c.explain': 'Comment c’est calculé',
      'ai.t.energy': 'Énergie', 'ai.t.protein': 'Protéines (minimum)', 'ai.t.fiber': 'Fibres (au moins)', 'ai.t.sugar': 'Sucres libres (moins de)', 'ai.t.salt': 'Sel (moins de)', 'ai.t.veg': 'Fruits et légumes (au moins)',
      'ai.t.veg.value': '5 portions', 'ai.t.bmi': 'IMC {v} · {cls}',
      'ai.bmi.under': 'insuffisance pondérale', 'ai.bmi.normal': 'corpulence normale', 'ai.bmi.over': 'surpoids', 'ai.bmi.obese': 'obésité',
      'ai.g.veg': 'Moins de 5 portions de fruits et légumes : fibres, vitamine A, vitamine C et potassium sont probablement insuffisants.',
      'ai.g.iron': 'Les besoins en fer sont plus élevés chez les femmes de 18 à 49 ans : prévoyez légumineuses, légumes-feuilles et une source de vitamine C aux repas.',
      'ai.g.vegdiet': 'Régime végétarien : surveillez la vitamine B12, le fer et le zinc ; demandez conseil à un professionnel pour la B12.',
      'ai.g.sugar': 'Les boissons sucrées apportent des sucres libres sans intérêt nutritionnel : remplacez-les par de l’eau ou des infusions non sucrées.',
      'ai.g.salt': 'Le sel ajouté et les bouillons cubes augmentent le sodium : assaisonnez plutôt avec herbes, épices, oignon, ail ou citron.',
      'ai.g.none': 'Aucune carence majeure signalée d’après les informations fournies.',
      'ai.p.bmi.under': 'Le poids est sous la zone de référence : augmentez l’énergie avec des aliments riches en nutriments et consultez si la perte de poids est involontaire.',
      'ai.p.bmi.over': 'Le poids est au-dessus de la zone de référence : une réduction modérée de l’énergie et plus de mouvement réduisent le risque cardiométabolique.',
      'ai.p.bmi.obese': 'L’IMC est dans la zone d’obésité : un suivi avec un professionnel de santé est recommandé.',
      'ai.p.glu.ifg': 'La glycémie à jeun est dans la zone d’hyperglycémie modérée (6,1–6,9 mmol/L) : limitez sucres et féculents raffinés, et faites-la recontrôler.',
      'ai.p.glu.high': 'La glycémie à jeun atteint ou dépasse 7,0 mmol/L : consultez un professionnel de santé pour confirmation.',
      'ai.p.bp.elev': 'La tension systolique est entre 130 et 139 mmHg : réduisez le sel, restez actif et recontrôlez régulièrement.',
      'ai.p.bp.high': 'La tension systolique atteint ou dépasse 140 mmHg : consultez un professionnel de santé.',
      'ai.p.activity': 'Visez au moins 150 minutes d’activité modérée par semaine.',
      'ai.p.none': 'Aucun risque particulier signalé : gardez une alimentation variée et une activité régulière.',
      'ai.m.breakfast': 'Petit-déjeuner', 'ai.m.lunch': 'Déjeuner', 'ai.m.dinner': 'Dîner', 'ai.m.snack': 'Collation',
      'ai.m.b.sahel': 'Bouillie de mil aux arachides et au moringa', 'ai.m.b.coast': 'Bouillie de maïs aux arachides et fruit frais',
      'ai.m.staple.sahel': 'tô de mil ou de sorgho', 'ai.m.staple.coast': 'igname, manioc ou pâte de maïs',
      'ai.m.l.omni': 'Sauce de légumes-feuilles au poisson, avec {staple}', 'ai.m.l.pesc': 'Sauce de légumes-feuilles au poisson, avec {staple}', 'ai.m.l.veg': 'Sauce de légumes-feuilles au niébé, avec {staple}',
      'ai.m.d.omni': 'Soupe de légumes, poulet grillé et riz complet', 'ai.m.d.pesc': 'Soupe de légumes, poisson grillé et riz complet', 'ai.m.d.veg': 'Ragoût de haricots et légumes, riz complet',
      'ai.m.s': 'Fruit frais (mangue, orange ou papaye) et une poignée d’arachides',
      'ai.m.note.glucose': 'La glycémie étant élevée : préférez les céréales complètes et limitez les féculents à un quart de l’assiette.',
      'ai.m.note.salt': 'Cuisinez sans bouillon cube ; assaisonnez avec herbes, épices et citron.',
      'ai.x.bmi': 'IMC = poids ÷ taille² = {v} kg/m² (classes OMS : 18,5 / 25 / 30).',
      'ai.x.bmr': 'Énergie de repos (Mifflin-St Jeor) = {v} kcal.',
      'ai.x.tdee': 'Dépense quotidienne = énergie de repos × {f} (activité) = {v} kcal.',
      'ai.x.target.keep': 'Objectif d’énergie = dépense quotidienne (poids dans la zone de référence).',
      'ai.x.target.cut': 'Objectif d’énergie = dépense quotidienne − 15 % (IMC ≥ 25), jamais sous {floor} kcal.',
      'ai.x.target.add': 'Objectif d’énergie = dépense quotidienne + 10 % (IMC < 18,5).',
      'ai.x.protein': 'Minimum de protéines = 0,83 g par kg de poids corporel.',
      'ai.x.who': 'Objectifs d’apport : fibres ≥ 25 g, sucres libres < 10 % de l’énergie, sel < 5 g, ≥ 5 portions de fruits et légumes (OMS).',
      'ai.x.cut': 'Seuils utilisés : glycémie à jeun 6,1 et 7,0 mmol/L ; tension systolique 130 et 140 mmHg.',
      'ai.x.country': 'Aliments de base retenus pour {country} : {staple}.',
      'ai.x.split': 'L’énergie est répartie : 25 % petit-déjeuner, 35 % déjeuner, 30 % dîner, 10 % collation.'
    }
  });

  /* ---- 2. Model --------------------------------------------------------- */
  var STEPS = ['profile', 'diet', 'clinical', 'country', 'gaps', 'prevention', 'meal', 'explain'];
  var ACTIVITY = { low: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
  var SAHEL = ['BF', 'ML', 'NE', 'TD', 'MR', 'SN', 'GM'];
  var STORE = 'nutri_ai_profile';
  var DEFAULTS = { age: '34', sex: 'f', height: '166', weight: '68', activity: 'light', pattern: 'omni', veg: '3', sugary: '1', salt: false, glucose: '', sys: '' };
  var RANGES = { age: [18, 90], height: [120, 220], weight: [30, 250], glucose: [2, 30], sys: [70, 250] };
  var OPTIONAL = { glucose: 1, sys: 1 };

  /* step: -1 idle · 0–7 running · 8 done */
  var state = { form: {}, errors: {}, step: -1, plan: null, stale: false };
  (function load() {
    var saved = null;
    try { saved = JSON.parse(global.localStorage.getItem(STORE) || 'null'); } catch (e) { /* ignore */ }
    for (var k in DEFAULTS) state.form[k] = saved && typeof saved[k] === typeof DEFAULTS[k] ? saved[k] : DEFAULTS[k];
  })();
  function save() { try { global.localStorage.setItem(STORE, JSON.stringify(state.form)); } catch (e) { /* ignore */ } }

  function numberOf(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function validate() {
    var errors = {};
    Object.keys(RANGES).forEach(function (k) {
      var raw = String(state.form[k]).trim(), v = numberOf(raw);
      if (!raw && OPTIONAL[k]) return;
      if (isNaN(v) || v < RANGES[k][0] || v > RANGES[k][1]) errors[k] = 'ai.err.' + k;
    });
    return errors;
  }
  function country() {
    var sel = doc.getElementById('country'), code = (sel && sel.value) || 'TG';
    return { code: code, name: typeof I18N.countryName === 'function' ? I18N.countryName(code) : code, zone: SAHEL.indexOf(code) >= 0 ? 'sahel' : 'coast' };
  }
  /* All numbers are computed here; texts are resolved at render time so the plan follows the language. */
  function compute() {
    var f = state.form, age = numberOf(f.age), h = numberOf(f.height), w = numberOf(f.weight);
    var glucose = numberOf(f.glucose), sys = numberOf(f.sys), veg = +f.veg || 0, sugary = +f.sugary || 0;
    var bmi = w / Math.pow(h / 100, 2);
    var bmiClass = bmi < 18.5 ? 'under' : bmi < 25 ? 'normal' : bmi < 30 ? 'over' : 'obese';
    var bmr = 10 * w + 6.25 * h - 5 * age + (f.sex === 'm' ? 5 : -161);
    var tdee = bmr * ACTIVITY[f.activity];
    var floor = f.sex === 'm' ? 1500 : 1200;
    var mode = bmi >= 25 ? 'cut' : bmi < 18.5 ? 'add' : 'keep';
    var target = mode === 'cut' ? Math.max(floor, tdee * 0.85) : mode === 'add' ? tdee * 1.1 : tdee;
    target = Math.round(target / 10) * 10;
    var gaps = [], prev = [];
    if (veg < 5) gaps.push('veg');
    if (f.sex === 'f' && age < 50) gaps.push('iron');
    if (f.pattern === 'veg') gaps.push('vegdiet');
    if (sugary >= 1) gaps.push('sugar');
    if (f.salt) gaps.push('salt');
    if (bmiClass !== 'normal') prev.push({ key: 'bmi.' + bmiClass, tone: bmiClass === 'obese' ? 'alert' : 'warn' });
    var gluRaised = false;
    if (!isNaN(glucose)) {
      if (glucose >= 7) { prev.push({ key: 'glu.high', tone: 'alert' }); gluRaised = true; }
      else if (glucose >= 6.1) { prev.push({ key: 'glu.ifg', tone: 'warn' }); gluRaised = true; }
    }
    if (!isNaN(sys)) {
      if (sys >= 140) prev.push({ key: 'bp.high', tone: 'alert' });
      else if (sys >= 130) prev.push({ key: 'bp.elev', tone: 'warn' });
    }
    if (f.activity === 'low') prev.push({ key: 'activity', tone: 'info' });
    return {
      country: country(), bmi: bmi, bmiClass: bmiClass, bmr: Math.round(bmr), tdee: Math.round(tdee), factor: ACTIVITY[f.activity], floor: floor, mode: mode,
      target: target, protein: Math.round(0.83 * w), sugar: Math.round(target * 0.1 / 4), gaps: gaps, prev: prev,
      pattern: f.pattern, gluRaised: gluRaised, salt: !!f.salt,
      meals: [['breakfast', 0.25], ['lunch', 0.35], ['dinner', 0.30], ['snack', 0.10]].map(function (m) { return { slot: m[0], kcal: Math.round(target * m[1] / 10) * 10 }; })
    };
  }

  /* ---- 3. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function num(v, digits) { try { return Number(v).toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }); } catch (e) { return Number(v).toFixed(digits); } }
  var PATHS = {
    spark: '<path d="M12 3l1.900 4.900 4.900 1.900-4.900 1.900L12 16.600l-1.900-4.900-4.900-1.900 4.900-1.900z"/><path d="M19 15v4M17 17h4"/>',
    form: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    pipe: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
    target: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="4.500"/><path d="M12 12h.010"/>',
    gap: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    shield: '<path d="M12 3 4.500 6v5.500c0 4.600 3.200 8 7.500 9.500 4.300-1.500 7.500-4.900 7.500-9.500V6z"/><path d="m9 12 2.200 2.200L15.500 10"/>',
    bowl: '<path d="M3.500 11h17a8.500 8.500 0 0 1-17 0z"/><path d="M9 20h6M9 7c0-1.500 1.500-1.500 1.500-3M13.500 7c0-1.500 1.500-1.500 1.500-3"/>',
    book: '<path d="M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z"/><path d="M9 9h5M9 13h5"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    alert: '<path d="M12 4 3 19h18L12 4z"/><path d="M12 10v4M12 17h.010"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.010"/>',
    user: '<circle cx="12" cy="8" r="3.600"/><path d="M5 20c0-3.600 3.100-6 7-6s7 2.400 7 6"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2').replace(/\.010/g, '.01') + '</svg>';
  }
  function busy() { return state.step >= 0 && state.step < 8; }

  /* ---- 4. Template: form -------------------------------------------------- */
  function field(key, type, extra) {
    var err = state.errors[key], id = 'vaF-' + key, dis = busy() ? ' disabled' : '';
    var control;
    if (type === 'select') {
      control = '<select id="' + id + '" data-va-field="' + key + '"' + dis + '>' + extra.map(function (v) {
        return '<option value="' + v + '"' + (state.form[key] === v ? ' selected' : '') + '>' + esc(t('ai.f.' + key + '.' + v)) + '</option>';
      }).join('') + '</select>';
    } else if (type === 'count') {
      control = '<select id="' + id + '" data-va-field="' + key + '"' + dis + '>' + extra.map(function (v) {
        return '<option value="' + v + '"' + (String(state.form[key]) === String(v) ? ' selected' : '') + '>' + v + (v === extra[extra.length - 1] ? '+' : '') + '</option>';
      }).join('') + '</select>';
    } else {
      control = '<input id="' + id + '" type="text" inputmode="decimal" autocomplete="off" data-va-field="' + key + '" value="' + esc(state.form[key]) + '"' +
        (err ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : '') + dis + '>';
    }
    return '<div class="va-field' + (err ? ' has-error' : '') + '"><label for="' + id + '">' + esc(t('ai.f.' + key)) + '</label>' + control +
      (err ? '<p class="va-err" id="' + id + '-err">' + esc(t(err)) + '</p>' : '') + '</div>';
  }
  function formCard() {
    var c = country(), hasErr = Object.keys(state.errors).length > 0;
    return '<article class="card va-form"><form novalidate data-va-form>' +
      '<header class="va-card__head"><span class="vh-ico">' + ico('form') + '</span><h3>' + esc(t('ai.form.title')) + '</h3>' +
        '<button type="button" class="btn secondary va-fill" data-va-act="fill"' + (busy() ? ' disabled' : '') + '>' + ico('user') + '<span>' + esc(t('ai.fill')) + '</span></button></header>' +
      '<fieldset><legend>' + esc(t('ai.form.profile')) + '</legend><div class="va-fields">' +
        field('age') + field('sex', 'select', ['f', 'm']) + field('height') + field('weight') + field('activity', 'select', ['low', 'light', 'moderate', 'high']) + '</div></fieldset>' +
      '<fieldset><legend>' + esc(t('ai.form.diet')) + '</legend><div class="va-fields">' +
        field('pattern', 'select', ['omni', 'pesc', 'veg']) + field('veg', 'count', [0, 1, 2, 3, 4, 5, 6, 7, 8]) + field('sugary', 'count', [0, 1, 2, 3, 4, 5]) + '</div>' +
        '<label class="va-check"><input type="checkbox" data-va-field="salt"' + (state.form.salt ? ' checked' : '') + (busy() ? ' disabled' : '') + '><i aria-hidden="true">' + ico('check') + '</i><span>' + esc(t('ai.f.salt')) + '</span></label></fieldset>' +
      '<fieldset><legend>' + esc(t('ai.form.clinical')) + '</legend><div class="va-fields">' + field('glucose') + field('sys') +
        '<div class="va-field va-field--static"><span class="va-label">' + esc(t('ai.f.country')) + '</span><b>' + esc(c.name) + '</b><small>' + esc(t('ai.f.country.hint')) + '</small></div></div></fieldset>' +
      '<p class="va-summary" role="alert">' + (hasErr ? esc(t('ai.err.summary')) : '') + '</p>' +
      '<button type="submit" class="btn primary va-generate"' + (busy() ? ' disabled' : '') + '>' + ico('spark') + '<span>' + esc(t(busy() ? 'ai.generating' : 'ai.generate')) + '</span></button>' +
      '</form></article>';
  }

  /* ---- 5. Template: pipeline + plan --------------------------------------- */
  function statusText() {
    if (busy()) return t('ai.status.run', { n: state.step + 1, step: t('ai.step.' + STEPS[state.step]) });
    if (state.plan && state.stale) return t('ai.status.stale');
    if (state.plan) return t('ai.status.done', { country: state.plan.country.name });
    return t('ai.status.ready');
  }
  function wizard() {
    return STEPS.map(function (s, i) {
      var cls = 'step';
      if (state.step === 8 || (state.step < 0 && state.plan)) cls += ' done';
      else if (state.step < 0) { if (i === 0) cls += ' active'; }
      else if (i < state.step) cls += ' done';
      else if (i === state.step) cls += ' active';
      return '<li class="' + cls + '"' + (cls.indexOf('active') > 0 ? ' aria-current="step"' : '') + '><i>' + (cls.indexOf('done') > 0 ? ico('check') : (i + 1)) + '</i><span>' + esc(t('ai.step.' + s)) + '</span></li>';
    }).join('');
  }
  function progress() { return state.plan && !busy() ? 100 : busy() ? Math.round((state.step + 1) / 8 * 100) : 0; }
  function pipeCard() {
    var p = progress();
    return '<article class="card va-pipe">' +
      '<header class="va-card__head"><span class="vh-ico">' + ico('pipe') + '</span><h3>' + esc(t('ai.pipe.title')) + '</h3></header>' +
      '<ol class="wizard va-wizard" id="aiWizard">' + wizard() + '</ol>' +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p + '" aria-label="' + esc(t('ai.pipe.title')) + '"><i id="aiProgress" style="width:' + p + '%"></i></div>' +
      '<p id="aiStatus" class="va-status" role="status" aria-live="polite">' + esc(statusText()) + '</p>' +
      '</article>';
  }
  function listCard(cls, icon, titleKey, items, extra) {
    return '<article class="card va-out ' + cls + '"><header class="va-card__head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(t(titleKey)) + '</h3></header>' +
      '<ul class="va-list">' + items.map(function (it) {
        return '<li class="va-list__item va-list__item--' + it.tone + '">' + ico(it.tone === 'good' ? 'check' : it.tone === 'info' || it.tone === 'plain' ? 'info' : 'alert') + '<span>' + esc(it.text) + '</span></li>';
      }).join('') + '</ul>' + (extra || '') + '</article>';
  }
  function planCards() {
    var p = state.plan;
    if (!p || busy()) return '<p class="va-empty">' + esc(t('ai.plan.empty')) + '</p>';
    var targets = [
      ['energy', num(p.target, 0) + ' kcal'], ['protein', num(p.protein, 0) + ' g'], ['fiber', '25 g'],
      ['sugar', num(p.sugar, 0) + ' g'], ['salt', '5 g'], ['veg', t('ai.t.veg.value')]
    ];
    var gaps = p.gaps.length ? p.gaps.map(function (g) { return { tone: 'warn', text: t('ai.g.' + g) }; }) : [{ tone: 'good', text: t('ai.g.none') }];
    var prev = p.prev.length ? p.prev.map(function (x) { return { tone: x.tone, text: t('ai.p.' + x.key) }; }) : [{ tone: 'good', text: t('ai.p.none') }];
    var staple = t('ai.m.staple.' + p.country.zone);
    var dish = { breakfast: t('ai.m.b.' + p.country.zone), lunch: t('ai.m.l.' + p.pattern, { staple: staple }), dinner: t('ai.m.d.' + p.pattern), snack: t('ai.m.s') };
    var notes = (p.gluRaised ? '<p class="va-mealnote">' + esc(t('ai.m.note.glucose')) + '</p>' : '') + (p.salt ? '<p class="va-mealnote">' + esc(t('ai.m.note.salt')) + '</p>' : '');
    var explain = [
      t('ai.x.bmi', { v: num(p.bmi, 1) }), t('ai.x.bmr', { v: num(p.bmr, 0) }), t('ai.x.tdee', { f: num(p.factor, 3), v: num(p.tdee, 0) }),
      t('ai.x.target.' + p.mode, { floor: num(p.floor, 0) }), t('ai.x.protein'), t('ai.x.who'), t('ai.x.cut'),
      t('ai.x.country', { country: p.country.name, staple: staple }), t('ai.x.split')
    ].map(function (x) { return { tone: 'plain', text: x }; });
    return '<article class="card va-out va-targets" tabindex="-1" data-va-focus><header class="va-card__head"><span class="vh-ico">' + ico('target') + '</span><h3>' + esc(t('ai.c.targets')) + '</h3>' +
        '<span class="pill va-bmi va-bmi--' + p.bmiClass + '">' + esc(t('ai.t.bmi', { v: num(p.bmi, 1), cls: t('ai.bmi.' + p.bmiClass) })) + '</span></header>' +
        '<div class="va-tiles">' + targets.map(function (x, i) { return '<div class="va-tile' + (i === 0 ? ' va-tile--main' : '') + '"><span>' + esc(t('ai.t.' + x[0])) + '</span><b>' + esc(x[1]) + '</b></div>'; }).join('') + '</div></article>' +
      listCard('va-gaps', 'gap', 'ai.c.gaps', gaps) +
      listCard('va-prev', 'shield', 'ai.c.prevention', prev) +
      '<article class="card va-out va-meals"><header class="va-card__head"><span class="vh-ico">' + ico('bowl') + '</span><h3>' + esc(t('ai.c.meals')) + '</h3>' +
        '<span class="pill va-country">' + esc(p.country.name) + '</span></header><ul class="va-meallist">' +
        p.meals.map(function (m) { return '<li><div><span>' + esc(t('ai.m.' + m.slot)) + '</span><b>' + esc(dish[m.slot]) + '</b></div><em>≈ ' + num(m.kcal, 0) + ' kcal</em></li>'; }).join('') + '</ul>' + notes + '</article>' +
      listCard('va-explain', 'book', 'ai.c.explain', explain);
  }
  function template() {
    return '<div class="va">' +
      '<article class="card va-hero"><div class="vh-head"><div class="va-hero__title"><span class="vh-ico">' + ico('spark') + '</span>' +
        '<div><h2>' + esc(t('ai.title')) + '</h2><p class="muted">' + esc(t('ai.sub')) + '</p></div></div>' +
        '<span class="pill va-demo">' + esc(t('ai.demo')) + '</span></div>' +
        '<p class="va-hero__note">' + esc(t('ai.demo.note')) + '</p></article>' +
      formCard() + pipeCard() +
      '<div id="planCards" class="va-plan' + (state.stale ? ' is-stale' : '') + '">' + planCards() + '</div>' +
      '</div>';
  }

  /* ---- 6. Render ----------------------------------------------------------- */
  function render(focusSel) {
    var active = doc.activeElement, keep = null;
    if (!focusSel && active && root.contains(active)) {
      if (active.id) keep = '#' + active.id;
      else if (active.getAttribute('data-va-act')) keep = '[data-va-act="' + active.getAttribute('data-va-act') + '"]';
      else if (active.getAttribute('data-va-field')) keep = '[data-va-field="' + active.getAttribute('data-va-field') + '"]';
      else if (active.type === 'submit') keep = '.va-generate';
    }
    root.innerHTML = template();
    var target = root.querySelector(focusSel || keep || 'x-none');
    if (target && !target.disabled) { try { target.focus({ preventScroll: !focusSel }); } catch (e) { target.focus(); } }
  }
  function paintPipe() {
    var w = doc.getElementById('aiWizard'), s = doc.getElementById('aiStatus'), b = doc.getElementById('aiProgress'), p = progress();
    if (w) w.innerHTML = wizard();
    if (s) s.textContent = statusText();
    if (b) { b.style.width = p + '%'; if (b.parentNode) b.parentNode.setAttribute('aria-valuenow', p); }
    var plan = doc.getElementById('planCards');
    if (plan) plan.classList.toggle('is-stale', !!state.stale);
  }

  /* ---- 7. Actions ----------------------------------------------------------- */
  var timer = null;
  function generate() {
    if (busy()) return false;
    state.errors = validate();
    var bad = Object.keys(state.errors);
    if (bad.length) { render('#vaF-' + bad[0]); return false; }
    save();
    var plan = compute();
    state.step = 0; state.stale = false;
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hadFocus = root.contains(doc.activeElement);
    if (reduce) { state.plan = plan; state.step = 8; render(hadFocus ? '[data-va-focus]' : null); return true; }
    render();
    timer = global.setInterval(function () {
      state.step += 1;
      if (state.step < 8) { paintPipe(); return; }
      global.clearInterval(timer); timer = null;
      state.plan = plan; state.step = 8;
      render(root.contains(doc.activeElement) || hadFocus ? '[data-va-focus]' : null);
    }, 380);
    return true;
  }
  function fillFromCitizen() {
    var api = global.NUTRI_CITIZEN, p = null;
    try { p = api && typeof api.getState === 'function' ? api.getState().profile : null; } catch (e) { p = null; }
    if (!p) { notify(t('ai.fill.none')); return; }
    var f = state.form;
    if (p.age) f.age = String(p.age);
    if (p.sex) f.sex = p.sex === 'male' ? 'm' : 'f';
    if (p.height) f.height = String(p.height);
    if (p.weight) f.weight = String(p.weight);
    if (ACTIVITY[p.activity]) f.activity = p.activity;
    if (p.glucose) f.glucose = String(p.glucose);
    if (p.sys) f.sys = String(p.sys);
    state.errors = {}; markStale(); save(); render('[data-va-act="fill"]');
    notify(t('ai.fill.done'));
  }
  function notify(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }
  function markStale() { if (state.plan && !state.stale) { state.stale = true; } }

  root.addEventListener('submit', function (ev) { ev.preventDefault(); generate(); });
  root.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-va-act]') : null;
    if (el && root.contains(el) && !el.disabled && el.getAttribute('data-va-act') === 'fill') fillFromCitizen();
  });
  function onField(ev) {
    var el = ev.target, key = el && el.getAttribute && el.getAttribute('data-va-field');
    if (!key || !(key in DEFAULTS)) return;
    state.form[key] = el.type === 'checkbox' ? !!el.checked : el.value;
    var was = state.stale; markStale();
    if (state.stale !== was) paintPipe();
    if (ev.type === 'change') save();
  }
  root.addEventListener('input', onField);
  root.addEventListener('change', onField);
  doc.addEventListener('nutri:countryChanged', function () { markStale(); if (!busy()) render(); });

  /* ---- 8. Legacy API ----------------------------------------------------------- */
  global.generatePlan = generate;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  render();
  I18N.onChange(function () { if (state.plan && typeof I18N.countryName === 'function') state.plan.country.name = I18N.countryName(state.plan.country.code); render(); });

  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.ai = {
    render: render, compute: compute,
    state: function () { return { step: state.step, stale: state.stale, errors: Object.keys(state.errors), form: JSON.parse(JSON.stringify(state.form)), plan: state.plan ? JSON.parse(JSON.stringify(state.plan)) : null }; }
  };
})(window);
