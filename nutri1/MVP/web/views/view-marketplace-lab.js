/* ==========================================================================
   NUTRI.N°1 — Nutrition lab inside the Healthy Food Marketplace  (TASK 4)
   Adds to <section id="marketplace">:
     · a photo + energy badge on every catalogue product (hook used by view-marketplace.js)
     · a "Nutrition lab" card mounted in #vmLab: detailed composition per food, glycaemic
       simulation, bioavailability simulation, nutrient-density radar, comparator and a
       ranking by physiological need.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), views/view-marketplace.js
   Styles     : styles/views.css  (.vl-*, block 8b)
   Assets     : assets/market/<id>.jpg  (AI-generated product photos)
   Storage    : localStorage "nutri_market_lab"  ({ food, need })
   Note       : demonstration only. Composition values are rounded, indicative figures per
                100 g in the spirit of West African food composition tables; they were entered
                by hand and are NOT laboratory-verified. Glycaemic curves, absorption rates,
                the density index and the need scores come from simple documented formulas
                (see section 3), not from clinical measurements. Not medical advice.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('marketplace');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'vl.kicker': 'NUTRITION SCIENCE', 'vl.title': 'Nutrition lab', 'vl.sub': 'Pick a food to see its detailed composition and simulate how your body uses it.',
      'vl.badge': 'Simulation · indicative values', 'vl.pick': 'Choose a food', 'vl.analyse': 'Analyse', 'vl.analyse.aria': 'Analyse {name} in the nutrition lab',
      'vl.per100': 'per 100 g', 'vl.kcal100': '{n} kcal / 100 g', 'vl.photo': 'Photo of {name}',
      'vl.f.ofsp': 'Orange-fleshed sweet potato', 'vl.f.ofspflour': 'Biofortified sweet potato flour', 'vl.f.sorghum': 'Whole sorghum grain', 'vl.f.millet': 'Pearl millet',
      'vl.f.baobab': 'Baobab fruit powder', 'vl.f.leafy': 'Fresh leafy vegetables', 'vl.f.cowpea': 'Cowpea (niébé)', 'vl.f.groundnut': 'Groundnut & seed mix',
      'vl.f.oil': 'Cold-pressed seed oil', 'vl.f.moringa': 'Moringa leaf powder', 'vl.f.fruits': 'Tropical fruit basket', 'vl.f.legflour': 'Legume flour', 'vl.f.grainmix': 'Whole-grain mix',
      'vl.portion': 'Portion', 'vl.portion.unit': '{n} g', 'vl.energy': 'Energy', 'vl.inportion': 'in {n} g',
      'vl.comp': 'Detailed composition', 'vl.col.100': '100 g', 'vl.col.portion': 'Portion', 'vl.col.dv': '% ref.',
      'vl.n.protein': 'Protein', 'vl.n.carbs': 'Available carbohydrate', 'vl.n.sugars': 'of which sugars', 'vl.n.fiber': 'Fibre', 'vl.n.fat': 'Fat', 'vl.n.sat': 'of which saturated', 'vl.n.water': 'Water',
      'vl.n.iron': 'Iron', 'vl.n.zinc': 'Zinc', 'vl.n.calcium': 'Calcium', 'vl.n.magnesium': 'Magnesium', 'vl.n.potassium': 'Potassium', 'vl.n.vita': 'Vitamin A (RAE)', 'vl.n.vitc': 'Vitamin C', 'vl.n.folate': 'Folate',
      'vl.macros': 'Macronutrients', 'vl.micros': 'Minerals & vitamins',
      'vl.tabs': 'Simulation', 'vl.tab.gi': 'Glycaemic index', 'vl.tab.bio': 'Bioavailability', 'vl.tab.density': 'Nutrient density', 'vl.tab.compare': 'Compare',
      'vl.gi.gi': 'Glycaemic index', 'vl.gi.gl': 'Glycaemic load', 'vl.gi.peak': 'Estimated peak', 'vl.gi.at': 'at {n} min',
      'vl.lvl.low': 'Low', 'vl.lvl.mid': 'Medium', 'vl.lvl.high': 'High', 'vl.gi.none': 'No available carbohydrate: no glycaemic effect.',
      'vl.gi.pair': 'Eaten with protein or fat', 'vl.gi.cool': 'Cooked, cooled, then reheated', 'vl.gi.fine': 'Finely milled or mashed',
      'vl.gi.chart': 'Simulated blood glucose over 2 hours after eating', 'vl.gi.food': 'This portion', 'vl.gi.ref': 'Reference · white bread, 50 g carbohydrate',
      'vl.gi.axis': 'mmol/L', 'vl.gi.min': '{n} min',
      'vl.gi.note': 'Illustrative curve shaped by the glycaemic load; individual responses vary widely.',
      'vl.bio.sub': 'What the food contains is not what the body absorbs. Toggle a preparation to see the effect.',
      'vl.bio.vitc': 'Add a vitamin C source (citrus, baobab, tomato)', 'vl.bio.soak': 'Soak, sprout or ferment first', 'vl.bio.tea': 'Tea or coffee with the meal', 'vl.bio.fat': 'Add a spoon of oil or groundnut',
      'vl.bio.content': 'In the portion', 'vl.bio.absorbed': 'Absorbed (estimate)', 'vl.bio.rate': 'absorption {n} %', 'vl.bio.need': '{n} % of the daily absorbed need',
      'vl.bio.protein': 'Digestible protein', 'vl.bio.phytate': 'Rich in phytates: they bind iron and zinc.', 'vl.bio.nophytate': 'Low in phytates.',
      'vl.bio.note': 'Absorption factors are simplified ranges from the nutrition literature, not measurements.',
      'vl.den.score': 'Density index', 'vl.den.sub': 'Share of ten daily references delivered by 100 kcal, on a 0–100 scale.',
      'vl.den.radar': 'Share of the daily reference covered by the portion, per nutrient', 'vl.den.cover': 'Portion coverage', 'vl.den.top': 'Strong points',
      'vl.den.kcal': '{n} kcal per portion', 'vl.den.none': 'No notable micronutrient contribution.',
      'vl.cmp.with': 'Compare with', 'vl.cmp.gi': 'Glycaemic index', 'vl.cmp.density': 'Density index', 'vl.cmp.note': 'Values per 100 g.',
      'vl.need.title': 'Filter by physiological need', 'vl.need.sub': 'The catalogue is ranked for the selected need, per usual portion.',
      'vl.need.adult': 'Healthy adult', 'vl.need.diabetes': 'Blood sugar control', 'vl.need.anemia': 'Anaemia & iron', 'vl.need.pregnancy': 'Pregnancy', 'vl.need.child': 'Child 1–3 years', 'vl.need.bp': 'Blood pressure', 'vl.need.sport': 'Active & sport',
      'vl.need.match': 'match', 'vl.need.why': 'Why',
      'vl.c.density': 'nutrient density', 'vl.c.fiber': 'fibre', 'vl.c.lowgl': 'low glycaemic load', 'vl.c.protein': 'protein', 'vl.c.magnesium': 'magnesium', 'vl.c.iron': 'absorbable iron',
      'vl.c.folate': 'folate', 'vl.c.vitc': 'vitamin C', 'vl.c.calcium': 'calcium', 'vl.c.vita': 'vitamin A', 'vl.c.zinc': 'zinc', 'vl.c.energy': 'energy', 'vl.c.potassium': 'potassium', 'vl.c.lowsat': 'little saturated fat',
      'vl.unit.g': 'g', 'vl.unit.mg': 'mg', 'vl.unit.ug': 'µg',
      'vl.note': 'Indicative, hand-entered values (rounded, per 100 g as sold) — not laboratory-verified. Daily references are rounded FAO/WHO-style figures. Simulations use simplified formulas and are not medical advice.'
    },
    fr: {
      'vl.kicker': 'SCIENCE NUTRITIONNELLE', 'vl.title': 'Laboratoire nutritionnel', 'vl.sub': 'Choisissez un aliment pour voir sa composition détaillée et simuler la façon dont le corps l’utilise.',
      'vl.badge': 'Simulation · valeurs indicatives', 'vl.pick': 'Choisir un aliment', 'vl.analyse': 'Analyser', 'vl.analyse.aria': 'Analyser {name} dans le laboratoire nutritionnel',
      'vl.per100': 'pour 100 g', 'vl.kcal100': '{n} kcal / 100 g', 'vl.photo': 'Photo : {name}',
      'vl.f.ofsp': 'Patate douce à chair orange', 'vl.f.ofspflour': 'Farine de patate douce biofortifiée', 'vl.f.sorghum': 'Sorgho complet', 'vl.f.millet': 'Mil (petit mil)',
      'vl.f.baobab': 'Poudre de fruit de baobab', 'vl.f.leafy': 'Légumes-feuilles frais', 'vl.f.cowpea': 'Niébé', 'vl.f.groundnut': 'Mélange arachides & graines',
      'vl.f.oil': 'Huile de graines pressée à froid', 'vl.f.moringa': 'Poudre de feuilles de moringa', 'vl.f.fruits': 'Panier de fruits tropicaux', 'vl.f.legflour': 'Farine de légumineuses', 'vl.f.grainmix': 'Mélange de céréales complètes',
      'vl.portion': 'Portion', 'vl.portion.unit': '{n} g', 'vl.energy': 'Énergie', 'vl.inportion': 'dans {n} g',
      'vl.comp': 'Composition détaillée', 'vl.col.100': '100 g', 'vl.col.portion': 'Portion', 'vl.col.dv': '% repère',
      'vl.n.protein': 'Protéines', 'vl.n.carbs': 'Glucides assimilables', 'vl.n.sugars': 'dont sucres', 'vl.n.fiber': 'Fibres', 'vl.n.fat': 'Lipides', 'vl.n.sat': 'dont saturés', 'vl.n.water': 'Eau',
      'vl.n.iron': 'Fer', 'vl.n.zinc': 'Zinc', 'vl.n.calcium': 'Calcium', 'vl.n.magnesium': 'Magnésium', 'vl.n.potassium': 'Potassium', 'vl.n.vita': 'Vitamine A (ER)', 'vl.n.vitc': 'Vitamine C', 'vl.n.folate': 'Folates',
      'vl.macros': 'Macronutriments', 'vl.micros': 'Minéraux & vitamines',
      'vl.tabs': 'Simulation', 'vl.tab.gi': 'Index glycémique', 'vl.tab.bio': 'Biodisponibilité', 'vl.tab.density': 'Densité nutritionnelle', 'vl.tab.compare': 'Comparer',
      'vl.gi.gi': 'Index glycémique', 'vl.gi.gl': 'Charge glycémique', 'vl.gi.peak': 'Pic estimé', 'vl.gi.at': 'à {n} min',
      'vl.lvl.low': 'Bas', 'vl.lvl.mid': 'Moyen', 'vl.lvl.high': 'Élevé', 'vl.gi.none': 'Aucun glucide assimilable : pas d’effet glycémique.',
      'vl.gi.pair': 'Consommé avec des protéines ou des lipides', 'vl.gi.cool': 'Cuit, refroidi puis réchauffé', 'vl.gi.fine': 'Moulu fin ou en purée',
      'vl.gi.chart': 'Glycémie simulée pendant 2 heures après le repas', 'vl.gi.food': 'Cette portion', 'vl.gi.ref': 'Référence · pain blanc, 50 g de glucides',
      'vl.gi.axis': 'mmol/L', 'vl.gi.min': '{n} min',
      'vl.gi.note': 'Courbe illustrative modelée par la charge glycémique ; les réponses individuelles varient beaucoup.',
      'vl.bio.sub': 'Ce que contient l’aliment n’est pas ce que le corps absorbe. Activez une préparation pour voir l’effet.',
      'vl.bio.vitc': 'Ajouter une source de vitamine C (agrume, baobab, tomate)', 'vl.bio.soak': 'Tremper, germer ou fermenter avant', 'vl.bio.tea': 'Thé ou café pendant le repas', 'vl.bio.fat': 'Ajouter une cuillère d’huile ou d’arachide',
      'vl.bio.content': 'Dans la portion', 'vl.bio.absorbed': 'Absorbé (estimation)', 'vl.bio.rate': 'absorption {n} %', 'vl.bio.need': '{n} % du besoin absorbé quotidien',
      'vl.bio.protein': 'Protéines digestibles', 'vl.bio.phytate': 'Riche en phytates : ils retiennent le fer et le zinc.', 'vl.bio.nophytate': 'Pauvre en phytates.',
      'vl.bio.note': 'Les facteurs d’absorption sont des ordres de grandeur simplifiés issus de la littérature, pas des mesures.',
      'vl.den.score': 'Indice de densité', 'vl.den.sub': 'Part de dix repères quotidiens apportée par 100 kcal, sur une échelle de 0 à 100.',
      'vl.den.radar': 'Part du repère quotidien couverte par la portion, par nutriment', 'vl.den.cover': 'Couverture par portion', 'vl.den.top': 'Points forts',
      'vl.den.kcal': '{n} kcal par portion', 'vl.den.none': 'Pas d’apport notable en micronutriments.',
      'vl.cmp.with': 'Comparer avec', 'vl.cmp.gi': 'Index glycémique', 'vl.cmp.density': 'Indice de densité', 'vl.cmp.note': 'Valeurs pour 100 g.',
      'vl.need.title': 'Filtrer par besoin physiologique', 'vl.need.sub': 'Le catalogue est classé pour le besoin choisi, par portion usuelle.',
      'vl.need.adult': 'Adulte en bonne santé', 'vl.need.diabetes': 'Contrôle de la glycémie', 'vl.need.anemia': 'Anémie & fer', 'vl.need.pregnancy': 'Grossesse', 'vl.need.child': 'Enfant 1–3 ans', 'vl.need.bp': 'Tension artérielle', 'vl.need.sport': 'Actif & sportif',
      'vl.need.match': 'adéquation', 'vl.need.why': 'Pourquoi',
      'vl.c.density': 'densité nutritionnelle', 'vl.c.fiber': 'fibres', 'vl.c.lowgl': 'charge glycémique basse', 'vl.c.protein': 'protéines', 'vl.c.magnesium': 'magnésium', 'vl.c.iron': 'fer assimilable',
      'vl.c.folate': 'folates', 'vl.c.vitc': 'vitamine C', 'vl.c.calcium': 'calcium', 'vl.c.vita': 'vitamine A', 'vl.c.zinc': 'zinc', 'vl.c.energy': 'énergie', 'vl.c.potassium': 'potassium', 'vl.c.lowsat': 'peu de graisses saturées',
      'vl.unit.g': 'g', 'vl.unit.mg': 'mg', 'vl.unit.ug': 'µg',
      'vl.note': 'Valeurs indicatives saisies à la main (arrondies, pour 100 g tel que vendu) — non vérifiées en laboratoire. Les repères quotidiens sont des valeurs arrondies de type FAO/OMS. Les simulations reposent sur des formules simplifiées et ne constituent pas un avis médical.'
    }
  });

  /* ---- 2. Food data (per 100 g as sold; indicative) ----------------------- */
  /* id, kcal, protein, available carbs, sugars, fibre, fat, saturated, water,
     iron mg, zinc mg, calcium mg, magnesium mg, potassium mg, vit A µg RAE, vit C mg, folate µg,
     GI, usual portion g, phytate-rich, starchy, protein digestibility */
  var RAW = [
    ['ofsp',       86,  1.6, 17.1,  4.2,  3.0,   0.1,  0.0, 77,  0.6, 0.3,   30,  25,  337,  709,   2.4,  11, 61, 150, 0, 1, 0.80],
    ['ofspflour', 350,  4.5, 74.0, 15.0,  9.0,   0.8,  0.2,  9,  2.0, 0.9,   95,  70, 1100, 1500,   8.0,  30, 66,  50, 0, 1, 0.80],
    ['sorghum',   329, 10.6, 63.0,  2.5,  6.7,   3.5,  0.6, 12,  3.4, 1.7,   13, 165,  363,    0,   0.0,  20, 62,  60, 1, 1, 0.74],
    ['millet',    378, 11.0, 64.0,  1.7,  8.5,   4.2,  0.7,  9,  3.0, 1.7,    8, 114,  195,    0,   0.0,  85, 60,  60, 1, 1, 0.76],
    ['baobab',    250,  2.3, 36.0, 25.0, 44.0,   0.5,  0.1, 11,  5.0, 1.0,  300, 150, 2000,    0, 280.0,   0, 25,  10, 0, 0, 0.70],
    ['leafy',      23,  2.5,  2.0,  0.5,  2.0,   0.3,  0.1, 91,  2.3, 0.9,  215,  55,  611,  146,  43.0,  85, 15, 100, 0, 0, 0.70],
    ['cowpea',    336, 23.5, 49.0,  6.9, 10.6,   1.3,  0.3, 11,  8.3, 3.4,  110, 184, 1112,    3,   1.5, 633, 38,  60, 1, 1, 0.80],
    ['groundnut', 575, 24.0, 12.0,  4.0,  8.5,  47.0,  7.5,  5,  4.5, 4.0,   95, 220,  680,    0,   0.0, 190, 15,  30, 1, 0, 0.85],
    ['oil',       884,  0.0,  0.0,  0.0,  0.0, 100.0, 14.0,  0,  0.0, 0.0,    0,   0,    0,    0,   0.0,   0,  0,  10, 0, 0, 0],
    ['moringa',   305, 27.0, 29.0,  3.0, 19.0,   5.5,  1.0,  7, 28.0, 2.5, 2000, 370, 1300, 1360,  17.0, 280, 20,  10, 0, 0, 0.72],
    ['fruits',     62,  0.8, 13.5, 12.0,  1.9,   0.3,  0.1, 83,  0.2, 0.1,   18,  14,  200,   45,  40.0,  30, 50, 150, 0, 0, 0.75],
    ['legflour',  370, 28.0, 42.0,  6.0, 12.0,   8.0,  1.2,  9,  7.5, 3.6,  160, 210, 1400,    2,   0.0, 350, 35,  50, 1, 1, 0.82],
    ['grainmix',  350, 10.0, 65.0,  2.0,  7.5,   3.6,  0.6, 11,  3.4, 1.9,   18, 130,  300,    5,   0.0,  40, 60,  60, 1, 1, 0.76]
  ];
  var KEYS = ['id', 'kcal', 'protein', 'carbs', 'sugars', 'fiber', 'fat', 'sat', 'water', 'iron', 'zinc', 'calcium', 'magnesium', 'potassium', 'vita', 'vitc', 'folate', 'gi', 'portion', 'phytate', 'starchy', 'pd'];
  var FOODS = RAW.map(function (r) { var o = {}; KEYS.forEach(function (k, i) { o[k] = r[i]; }); return o; });
  var MACROS = [['protein', 'g', 0], ['carbs', 'g', 0], ['sugars', 'g', 1], ['fiber', 'g', 0], ['fat', 'g', 0], ['sat', 'g', 1], ['water', 'g', 0]];
  var MICROS = [['iron', 'mg'], ['zinc', 'mg'], ['calcium', 'mg'], ['magnesium', 'mg'], ['potassium', 'mg'], ['vita', 'ug'], ['vitc', 'mg'], ['folate', 'ug']];
  var DENSITY = ['protein', 'fiber', 'iron', 'zinc', 'calcium', 'magnesium', 'potassium', 'vita', 'vitc', 'folate'];
  /* Rounded daily references (FAO/WHO-style). ironAbs / zincAbs = absorbed need, mg/day. */
  var DV = {
    adult:     { protein: 50, fiber: 25, iron: 14, zinc: 10, calcium: 1000, magnesium: 350, potassium: 3500, vita: 700, vitc: 45, folate: 400, ironAbs: 1.4, zincAbs: 2.5 },
    pregnancy: { protein: 60, fiber: 25, iron: 27, zinc: 11, calcium: 1000, magnesium: 350, potassium: 3500, vita: 800, vitc: 55, folate: 600, ironAbs: 4.0, zincAbs: 3.0 },
    child:     { protein: 13, fiber: 14, iron: 7,  zinc: 4,  calcium: 500,  magnesium: 80,  potassium: 2000, vita: 400, vitc: 30, folate: 150, ironAbs: 0.6, zincAbs: 0.8 }
  };
  var NEEDS = {
    adult:     { dv: 'adult',     w: { density: 0.5, fiber: 0.2, lowgl: 0.15, protein: 0.15 } },
    diabetes:  { dv: 'adult',     w: { lowgl: 0.45, fiber: 0.3, magnesium: 0.15, protein: 0.1 } },
    anemia:    { dv: 'adult',     w: { iron: 0.45, folate: 0.25, vitc: 0.2, protein: 0.1 } },
    pregnancy: { dv: 'pregnancy', w: { folate: 0.3, iron: 0.3, calcium: 0.15, protein: 0.15, vita: 0.1 } },
    child:     { dv: 'child',     w: { vita: 0.25, iron: 0.2, zinc: 0.2, protein: 0.2, energy: 0.15 } },
    bp:        { dv: 'adult',     w: { potassium: 0.4, magnesium: 0.25, fiber: 0.2, lowsat: 0.15 } },
    sport:     { dv: 'adult',     w: { protein: 0.35, energy: 0.25, potassium: 0.2, magnesium: 0.2 } }
  };
  var NEED_IDS = ['adult', 'diabetes', 'anemia', 'pregnancy', 'child', 'bp', 'sport'];
  var TABS = ['gi', 'bio', 'density', 'compare'];
  var STORE = 'nutri_market_lab';

  function food(id) { for (var i = 0; i < FOODS.length; i++) if (FOODS[i].id === id) return FOODS[i]; return null; }
  var state = { food: 'cowpea', other: 'sorghum', portion: 60, tab: 'gi', need: 'adult',
    gi: { pair: false, cool: false, fine: false }, bio: { vitc: false, soak: false, tea: false, fat: false } };
  (function () {
    try {
      var s = JSON.parse(global.localStorage.getItem(STORE) || 'null');
      if (s && food(s.food)) state.food = s.food;
      if (s && NEEDS[s.need]) state.need = s.need;
    } catch (e) { /* ignore */ }
    state.portion = food(state.food).portion;
    if (state.other === state.food) state.other = 'cowpea';
  })();
  function save() { try { global.localStorage.setItem(STORE, JSON.stringify({ food: state.food, need: state.need })); } catch (e) { /* ignore */ } }

  /* ---- 3. Model (simple, documented formulas) ------------------------------- */
  function dv() { return DV[NEEDS[state.need].dv]; }
  function giEff(f, m) {            /* effective GI after preparation modifiers */
    var g = f.gi;
    if (m.pair) g *= 0.85;
    if (m.cool && f.starchy) g *= 0.9;
    if (m.fine && f.starchy) g *= 1.12;
    return Math.min(100, g);
  }
  function gl(f, grams, m) { return giEff(f, m || {}) * f.carbs * grams / 10000; }   /* glycaemic load */
  function giLevel(g) { return g <= 55 ? 'low' : g < 70 ? 'mid' : 'high'; }
  function glLevel(v) { return v <= 10 ? 'low' : v < 20 ? 'mid' : 'high'; }
  function curve(load, g) {         /* illustrative 2 h response: baseline 5.0 mmol/L + A·(t/tp)·e^(1−t/tp) */
    var amp = Math.min(5, load * 0.125), tp = 30 + Math.max(0, 70 - g) * 0.35, pts = [];
    for (var tm = 0; tm <= 120; tm += 5) pts.push([tm, 5 + amp * (tm / tp) * Math.exp(1 - tm / tp)]);
    return { pts: pts, peak: 5 + amp, at: Math.round(tp / 5) * 5 };
  }
  function ironRate(f, b) {         /* non-haem iron absorption, share */
    var r = f.phytate ? 0.05 : 0.09;
    if (b.vitc || f.vitc >= 25) r *= f.phytate ? 2.0 : 1.5;
    if (b.soak && f.phytate) r *= 1.5;
    if (b.tea) r *= 0.45;
    return Math.min(0.2, r);
  }
  function zincRate(f, b) { var r = f.phytate ? 0.15 : 0.30; if (b.soak && f.phytate) r *= 1.4; return Math.min(0.45, r); }
  function vitaRate(f, b) { return (b.fat || f.fat >= 5) ? 1 : 0.5; }                /* carotenoids need fat */
  function protRate(f, b) { return f.pd ? Math.min(0.95, f.pd + (b.soak && f.phytate ? 0.05 : 0)) : 0; }
  function density(f) {             /* 0–100 index from the mean % of 10 adult references per 100 kcal */
    if (!f.kcal) return 0;
    var ref = DV.adult, sum = 0;
    DENSITY.forEach(function (k) { sum += Math.min(100, f[k] / f.kcal * 100 / ref[k] * 100); });
    return Math.round(100 * (1 - Math.exp(-(sum / DENSITY.length) / 25)));
  }
  function criteria(f, ref) {       /* 0–1 marks per usual portion; 30 % of a reference = full mark */
    var p = f.portion / 100, full = 0.3, c = {};
    ['protein', 'fiber', 'magnesium', 'folate', 'vitc', 'calcium', 'vita', 'zinc', 'potassium'].forEach(function (k) { c[k] = Math.min(1, f[k] * p / (ref[k] * full)); });
    c.iron = Math.min(1, f.iron * p * ironRate(f, {}) / (ref.ironAbs * full));
    c.lowgl = f.carbs ? 1 - Math.min(1, gl(f, f.portion) / 25) : 1;
    c.energy = Math.min(1, f.kcal * p / 300);
    c.lowsat = 1 - Math.min(1, f.sat * p / 5);
    c.density = density(f) / 100;
    return c;
  }
  function ranking() {
    var need = NEEDS[state.need], ref = DV[need.dv];
    return FOODS.map(function (f) {
      var c = criteria(f, ref), score = 0, parts = [];
      Object.keys(need.w).forEach(function (k) { var v = need.w[k] * c[k]; score += v; parts.push([k, v]); });
      /* "low …" criteria alone do not make a food useful: require some nutritional contribution */
      if (c.density < 0.05) score *= 0.4;
      parts.sort(function (a, b) { return b[1] - a[1]; });
      return { f: f, score: Math.round(score * 100), why: parts.filter(function (x) { return x[1] > 0.03; }).slice(0, 2).map(function (x) { return x[0]; }) };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  /* ---- 4. Helpers --------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function num(v, d) {
    if (d == null) d = v >= 100 ? 0 : v >= 10 ? 0 : 1;
    try { return Number(v).toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: d }); } catch (e) { return Number(v).toFixed(d); }
  }
  function fname(f) { return t('vl.f.' + f.id); }
  function img(f, cls) { return '<img class="' + cls + '" src="assets/market/' + f.id + '.jpg" alt="' + esc(t('vl.photo', { name: fname(f) })) + '" loading="lazy" decoding="async" width="720" height="720">'; }
  var PATHS = {
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.400a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.500 2.500M15.5 15.5 18 18M18 6l-2.500 2.500M8.5 15.5 6 18"/>',
    radar: '<path d="M12 3l8 5.500v7L12 21l-8-5.500v-7z"/><path d="M12 8l4 2.800v3.400L12 17l-4-2.800v-3.400z"/>',
    scale: '<path d="M12 4v16M6 20h12M5 8h14M5 8l-2.500 6a2.500 2.500 0 0 0 5 0zM19 8l-2.500 6a2.500 2.500 0 0 0 5 0z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function toggle(group, key, label, on, disabled) {
    return '<label class="vl-check' + (disabled ? ' is-off' : '') + '"><input type="checkbox" data-vl-' + group + '="' + key + '"' + (on ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
      '<i aria-hidden="true">' + ico('check') + '</i><span>' + esc(label) + '</span></label>';
  }

  /* ---- 5. Panels ------------------------------------------------------------- */
  function pickerHtml() {
    return '<div class="vl-picker" role="group" aria-label="' + esc(t('vl.pick')) + '">' + FOODS.map(function (f) {
      return '<button type="button" class="vl-pickbtn" data-vl-pick="' + f.id + '" aria-pressed="' + (f.id === state.food) + '">' + img(f, 'vl-pickbtn__img') + '<span>' + esc(fname(f)) + '</span></button>';
    }).join('') + '</div>';
  }
  function compHtml(f) {
    var p = state.portion / 100, ref = dv();
    var macroMax = Math.max(f.protein, f.carbs, f.fiber, f.fat, 1);
    var macros = MACROS.map(function (m, i) {
      var v = f[m[0]];
      return '<li class="vl-macro' + (m[2] ? ' vl-macro--sub' : '') + '" style="--i:' + i + '"><span>' + esc(t('vl.n.' + m[0])) + '</span><b>' + num(v) + ' g</b><em>' + num(v * p) + ' g</em>' +
        (m[2] || m[0] === 'water' ? '' : '<i class="vl-bar vl-bar--' + m[0] + '"><i style="--w:' + (v / macroMax * 100).toFixed(1) + '%"></i></i>') + '</li>';
    }).join('');
    var micros = MICROS.map(function (m, i) {
      var v = f[m[0]], pct = v * p / ref[m[0]] * 100, unit = t('vl.unit.' + m[1]);
      return '<li class="vl-micro" style="--i:' + i + '"><span>' + esc(t('vl.n.' + m[0])) + '</span><b>' + num(v) + ' ' + unit + '</b><em>' + num(v * p) + ' ' + unit + '</em>' +
        '<strong class="' + (pct >= 30 ? 'is-high' : pct >= 10 ? 'is-mid' : '') + '">' + num(Math.round(pct), 0) + ' %</strong>' +
        '<i class="vl-bar"><i style="--w:' + Math.min(100, pct).toFixed(1) + '%"></i></i></li>';
    }).join('');
    return '<div class="vl-comp"><h4>' + esc(t('vl.comp')) + '</h4>' +
      '<div class="vl-cols vl-cols--3" aria-hidden="true"><span>' + esc(t('vl.macros')) + '</span><span>' + esc(t('vl.col.100')) + '</span><span>' + esc(t('vl.col.portion')) + '</span></div>' +
      '<ul class="vl-macros">' + macros + '</ul>' +
      '<div class="vl-cols vl-cols--4" aria-hidden="true"><span>' + esc(t('vl.micros')) + '</span><span>' + esc(t('vl.col.100')) + '</span><span>' + esc(t('vl.col.portion')) + '</span><span>' + esc(t('vl.col.dv')) + '</span></div>' +
      '<ul class="vl-micros">' + micros + '</ul></div>';
  }
  function foodHtml(f) {
    return '<div class="vl-food"><div class="vl-food__media">' + img(f, 'vl-food__img') +
        '<div class="vl-food__cap"><b>' + esc(fname(f)) + '</b><span>' + esc(t('vl.per100')) + '</span></div>' +
        '<div class="vl-food__kcal"><strong>' + num(f.kcal, 0) + '</strong><span>kcal</span></div></div>' +
      '<div class="vl-portion"><label for="vlPortion">' + esc(t('vl.portion')) + '</label>' +
        '<output id="vlPortionOut"><b>' + esc(t('vl.portion.unit', { n: state.portion })) + '</b> · ' + num(f.kcal * state.portion / 100, 0) + ' kcal</output>' +
        '<input type="range" id="vlPortion" min="5" max="300" step="5" value="' + state.portion + '"></div>' +
      '<div id="vlComp">' + compHtml(f) + '</div></div>';
  }
  function giHtml(f) {
    if (!f.carbs) return '<p class="vl-empty">' + esc(t('vl.gi.none')) + '</p>';
    var g = giEff(f, state.gi), load = gl(f, state.portion, state.gi), c = curve(load, g), ref = curve(70 * 50 / 100, 70);
    var W = 560, H = 230, pl = 40, pr = 12, pt = 14, pb = 30, yMin = 4.5, yMax = 10.5;
    var X = function (m) { return pl + (W - pl - pr) * m / 120; }, Y = function (v) { return pt + (H - pt - pb) * (1 - (v - yMin) / (yMax - yMin)); };
    var path = function (pts) { return pts.map(function (q, i) { return (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1); }).join(' '); };
    var grid = [5, 6, 7, 8, 9, 10].map(function (v) { return '<line class="vl-grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text class="vl-axis" x="' + (pl - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + v + '</text>'; }).join('');
    var xl = [0, 30, 60, 90, 120].map(function (m) { return '<text class="vl-axis" x="' + X(m).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (m === 0 ? 'start' : m === 120 ? 'end' : 'middle') + '">' + esc(t('vl.gi.min', { n: m })) + '</text>'; }).join('');
    var d = path(c.pts);
    var stat = function (label, value, lvl, sub) {
      return '<div class="vl-stat vl-lvl--' + lvl + '"><span>' + esc(label) + '</span><b>' + value + '</b><small>' + esc(sub) + '</small></div>';
    };
    return '<div class="vl-stats">' +
        stat(t('vl.gi.gi'), num(Math.round(g), 0), giLevel(g), t('vl.lvl.' + giLevel(g))) +
        stat(t('vl.gi.gl'), num(load, 1), glLevel(load), t('vl.lvl.' + glLevel(load)) + ' · ' + t('vl.inportion', { n: state.portion })) +
        stat(t('vl.gi.peak'), num(c.peak, 1) + ' <i>mmol/L</i>', glLevel(load), t('vl.gi.at', { n: c.at })) + '</div>' +
      '<div class="vl-gauge vl-lvl--' + giLevel(g) + '" aria-hidden="true"><i style="--p:' + g.toFixed(1) + '%"></i><span style="left:55%"></span><span style="left:70%"></span></div>' +
      '<figure class="vl-fig"><svg class="vl-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('vl.gi.chart')) + '">' + grid + xl +
        '<path class="vl-line vl-line--ref" d="' + path(ref.pts) + '"/>' +
        '<path class="vl-area" d="' + d + ' L' + X(120).toFixed(1) + ' ' + Y(5).toFixed(1) + ' L' + X(0).toFixed(1) + ' ' + Y(5).toFixed(1) + ' Z"/>' +
        '<path class="vl-line vl-line--food" pathLength="100" d="' + d + '"/>' +
        '<circle class="vl-dot" cx="' + X(c.at).toFixed(1) + '" cy="' + Y(c.peak).toFixed(1) + '" r="5"/></svg>' +
        '<figcaption class="vl-legend"><span class="vl-key vl-key--food">' + esc(t('vl.gi.food')) + '</span><span class="vl-key vl-key--ref">' + esc(t('vl.gi.ref')) + '</span></figcaption></figure>' +
      '<div class="vl-checks">' + toggle('gi', 'pair', t('vl.gi.pair'), state.gi.pair) + toggle('gi', 'cool', t('vl.gi.cool'), state.gi.cool, !f.starchy) + toggle('gi', 'fine', t('vl.gi.fine'), state.gi.fine, !f.starchy) + '</div>' +
      '<p class="vl-fine">' + esc(t('vl.gi.note')) + '</p>';
  }
  function bioHtml(f) {
    var p = state.portion / 100, ref = dv(), b = state.bio;
    var rows = [
      ['iron', f.iron * p, ironRate(f, b), 'mg', ref.ironAbs],
      ['zinc', f.zinc * p, zincRate(f, b), 'mg', ref.zincAbs],
      ['vita', f.vita * p, vitaRate(f, b), 'ug', ref.vita],
      ['protein', f.protein * p, protRate(f, b), 'g', ref.protein]
    ].map(function (r, i) {
      var abs = r[1] * r[2], unit = t('vl.unit.' + r[3]), max = Math.max(r[1], 0.0001);
      return '<li class="vl-bio" style="--i:' + i + '"><div class="vl-bio__head"><b>' + esc(t(r[0] === 'protein' ? 'vl.bio.protein' : 'vl.n.' + r[0])) + '</b><span>' + esc(t('vl.bio.rate', { n: num(r[2] * 100, 0) })) + '</span></div>' +
        '<div class="vl-bio__row"><small>' + esc(t('vl.bio.content')) + '</small><i class="vl-bar vl-bar--dim"><i style="--w:100%"></i></i><em>' + num(r[1]) + ' ' + unit + '</em></div>' +
        '<div class="vl-bio__row"><small>' + esc(t('vl.bio.absorbed')) + '</small><i class="vl-bar"><i style="--w:' + (r[1] ? abs / max * 100 : 0).toFixed(1) + '%"></i></i><em>' + num(abs, abs < 1 ? 2 : 1) + ' ' + unit + '</em></div>' +
        '<p>' + esc(t('vl.bio.need', { n: num(Math.round(abs / r[4] * 100), 0) })) + '</p></li>';
    }).join('');
    return '<p class="vl-lead">' + esc(t('vl.bio.sub')) + ' <b>' + esc(t(f.phytate ? 'vl.bio.phytate' : 'vl.bio.nophytate')) + '</b></p>' +
      '<div class="vl-checks">' + toggle('bio', 'vitc', t('vl.bio.vitc'), b.vitc) + toggle('bio', 'soak', t('vl.bio.soak'), b.soak, !f.phytate) + toggle('bio', 'tea', t('vl.bio.tea'), b.tea) + toggle('bio', 'fat', t('vl.bio.fat'), b.fat, f.fat >= 5 || !f.vita) + '</div>' +
      '<ul class="vl-bios">' + rows + '</ul><p class="vl-fine">' + esc(t('vl.bio.note')) + '</p>';
  }
  function densityHtml(f) {
    var p = state.portion / 100, ref = dv(), score = density(f), n = DENSITY.length, cx = 150, cy = 150, R = 104;
    var pt = function (i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    var poly = function (r) { var s = []; for (var i = 0; i < n; i++) { var q = pt(i, r); s.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); } return s.join(' '); };
    var vals = DENSITY.map(function (k) { return Math.min(100, f[k] * p / ref[k] * 100); });
    var shape = vals.map(function (v, i) { var q = pt(i, R * Math.max(v, 3) / 100); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
    var rings = [25, 50, 75, 100].map(function (r) { return '<polygon class="vl-ring" points="' + poly(R * r / 100) + '"/>'; }).join('');
    var spokes = '', labels = '';
    DENSITY.forEach(function (k, i) {
      var e = pt(i, R), l = pt(i, R + 16);
      spokes += '<line class="vl-ring" x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>';
      labels += '<text class="vl-axis" x="' + l[0].toFixed(1) + '" y="' + (l[1] + 4).toFixed(1) + '" text-anchor="' + (Math.abs(l[0] - cx) < 12 ? 'middle' : l[0] > cx ? 'start' : 'end') + '">' + esc(t('vl.n.' + (k === 'vita' ? 'vita' : k)).replace(/ \(.*\)/, '')) + '</text>';
    });
    var top = DENSITY.map(function (k, i) { return [k, vals[i]]; }).sort(function (a, b) { return b[1] - a[1]; }).filter(function (x) { return x[1] >= 10; }).slice(0, 4);
    return '<div class="vl-den"><div class="vl-den__score vl-lvl--' + (score >= 60 ? 'low' : score >= 30 ? 'mid' : 'high') + '">' +
        '<svg class="vl-donut" viewBox="0 0 120 120" aria-hidden="true"><circle class="vl-donut__bg" cx="60" cy="60" r="50"/><circle class="vl-donut__fg" cx="60" cy="60" r="50" pathLength="100" style="--p:' + score + '"/></svg>' +
        '<b>' + score + '</b><span>' + esc(t('vl.den.score')) + '</span></div>' +
      '<div class="vl-den__txt"><p>' + esc(t('vl.den.sub')) + '</p><p class="vl-den__kcal">' + esc(t('vl.den.kcal', { n: num(f.kcal * p, 0) })) + '</p>' +
        '<h5>' + esc(t('vl.den.top')) + '</h5>' + (top.length ? '<ul class="vl-tops">' + top.map(function (x) { return '<li>' + esc(t('vl.n.' + x[0])) + ' <b>' + num(Math.round(x[1]), 0) + (x[1] >= 100 ? '+' : '') + ' %</b></li>'; }).join('') + '</ul>' : '<p>' + esc(t('vl.den.none')) + '</p>') + '</div></div>' +
      '<figure class="vl-fig vl-fig--radar"><svg class="vl-radar" viewBox="-40 0 380 300" role="img" aria-label="' + esc(t('vl.den.radar')) + '">' + rings + spokes +
        '<polygon class="vl-shape" points="' + shape + '"/>' + labels + '</svg><figcaption class="vl-legend"><span class="vl-key vl-key--food">' + esc(t('vl.den.cover')) + ' · ' + esc(t('vl.portion.unit', { n: state.portion })) + '</span></figcaption></figure>';
  }
  function compareHtml(f) {
    var o = food(state.other) || FOODS[0];
    var opts = FOODS.filter(function (x) { return x.id !== f.id; }).map(function (x) { return '<option value="' + x.id + '"' + (x.id === o.id ? ' selected' : '') + '>' + esc(fname(x)) + '</option>'; }).join('');
    var rows = [['vl.energy', f.kcal, o.kcal, 'kcal', 0], ['vl.n.protein', f.protein, o.protein, 'g', 1], ['vl.n.fiber', f.fiber, o.fiber, 'g', 1], ['vl.n.iron', f.iron, o.iron, 'mg', 1],
      ['vl.n.vita', f.vita, o.vita, 'µg', 1], ['vl.n.vitc', f.vitc, o.vitc, 'mg', 1], ['vl.n.folate', f.folate, o.folate, 'µg', 1], ['vl.cmp.gi', f.gi, o.gi, '', -1], ['vl.cmp.density', density(f), density(o), '', 1]
    ].map(function (r, i) {
      var max = Math.max(r[1], r[2], 0.0001), win = r[4] === 0 || r[1] === r[2] ? 0 : ((r[1] > r[2]) === (r[4] > 0) ? 1 : 2);
      return '<li class="vl-cmp" style="--i:' + i + '"><em class="' + (win === 1 ? 'is-win' : '') + '">' + num(r[1]) + (r[3] ? ' ' + r[3] : '') + '</em>' +
        '<i class="vl-bar vl-bar--a"><i style="--w:' + (r[1] / max * 100).toFixed(1) + '%"></i></i><span>' + esc(t(r[0])) + '</span>' +
        '<i class="vl-bar vl-bar--b"><i style="--w:' + (r[2] / max * 100).toFixed(1) + '%"></i></i><em class="' + (win === 2 ? 'is-win' : '') + '">' + num(r[2]) + (r[3] ? ' ' + r[3] : '') + '</em></li>';
    }).join('');
    return '<div class="vl-vs"><div class="vl-vs__side">' + img(f, 'vl-vs__img') + '<b>' + esc(fname(f)) + '</b></div>' +
      '<div class="vl-vs__side vl-vs__side--b">' + img(o, 'vl-vs__img') + '<label><span class="vl-sr">' + esc(t('vl.cmp.with')) + '</span><select id="vlOther">' + opts + '</select></label></div></div>' +
      '<ul class="vl-cmps">' + rows + '</ul><p class="vl-fine">' + esc(t('vl.cmp.note')) + '</p>';
  }
  function simHtml(f) {
    var tabs = TABS.map(function (id) {
      var on = state.tab === id;
      return '<button type="button" role="tab" id="vlTab-' + id + '" class="vl-tab" data-vl-tab="' + id + '" aria-selected="' + on + '" aria-controls="vlPanel" tabindex="' + (on ? 0 : -1) + '">' +
        ico({ gi: 'drop', bio: 'spark', density: 'radar', compare: 'scale' }[id]) + '<span>' + esc(t('vl.tab.' + id)) + '</span></button>';
    }).join('');
    return '<div class="vl-sim"><div class="vl-tabs" role="tablist" aria-label="' + esc(t('vl.tabs')) + '">' + tabs + '</div>' +
      '<div class="vl-panel" id="vlPanel" role="tabpanel" aria-labelledby="vlTab-' + state.tab + '">' + panelHtml(f) + '</div></div>';
  }
  function panelHtml(f) { return state.tab === 'gi' ? giHtml(f) : state.tab === 'bio' ? bioHtml(f) : state.tab === 'density' ? densityHtml(f) : compareHtml(f); }
  function needHtml() {
    var chips = NEED_IDS.map(function (id) { return '<button type="button" class="vl-chip" data-vl-need="' + id + '" aria-pressed="' + (state.need === id) + '">' + esc(t('vl.need.' + id)) + '</button>'; }).join('');
    var list = ranking().map(function (r, i) {
      return '<li style="--i:' + i + '"><button type="button" class="vl-rank' + (r.f.id === state.food ? ' is-on' : '') + '" data-vl-pick="' + r.f.id + '" data-vl-stay="1">' +
        '<span class="vl-rank__n">' + (i + 1) + '</span>' + img(r.f, 'vl-rank__img') +
        '<span class="vl-rank__txt"><b>' + esc(fname(r.f)) + '</b><small>' + esc(r.why.map(function (k) { return t('vl.c.' + k); }).join(' · ')) + '</small>' +
        '<i class="vl-bar"><i style="--w:' + r.score + '%"></i></i></span><span class="vl-rank__score"><b>' + r.score + '</b><small>' + esc(t('vl.need.match')) + '</small></span></button></li>';
    }).join('');
    return '<div class="vl-need"><header class="vl-need__head"><span class="vh-ico">' + ico('target') + '</span><div><h4>' + esc(t('vl.need.title')) + '</h4><p>' + esc(t('vl.need.sub')) + '</p></div></header>' +
      '<div class="vl-chips" role="group" aria-label="' + esc(t('vl.need.title')) + '">' + chips + '</div><ol class="vl-ranks">' + list + '</ol></div>';
  }
  function cardHtml() {
    var f = food(state.food);
    return '<section class="card vl-card" aria-labelledby="vlTitle"><header class="vl-head"><span class="vh-ico">' + ico('flask') + '</span>' +
        '<div><span class="vl-kicker">' + esc(t('vl.kicker')) + '</span><h3 id="vlTitle" tabindex="-1">' + esc(t('vl.title')) + '</h3><p>' + esc(t('vl.sub')) + '</p></div>' +
        '<span class="pill vl-badge">' + esc(t('vl.badge')) + '</span></header>' + pickerHtml() +
      '<div class="vl-main" id="vlMain">' + foodHtml(f) + simHtml(f) + '</div>' +
      '<div id="vlNeed">' + needHtml() + '</div>' +
      '<p class="vl-note">' + ico('info') + '<span>' + esc(t('vl.note')) + '</span></p></section>';
  }

  /* ---- 6. Render ---------------------------------------------------------------- */
  var host = doc.createElement('div'); host.className = 'vl-host';
  function $(id) { return doc.getElementById(id); }
  function paintAll(focusSel) {
    host.innerHTML = cardHtml();
    host.classList.remove('is-quiet');
    [['.vl-picker', '.vl-pickbtn[aria-pressed="true"]'], ['.vl-chips', '.vl-chip[aria-pressed="true"]']].forEach(function (pair) {   /* keep the active item visible in its strip */
      var strip = host.querySelector(pair[0]), on = host.querySelector(pair[1]);
      if (strip && on) { var sb = strip.style.scrollBehavior; strip.style.scrollBehavior = 'auto'; strip.scrollLeft = Math.max(0, on.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2); strip.style.scrollBehavior = sb; }
    });
    if (focusSel) { var el = host.querySelector(focusSel); if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }
  }
  function quiet() { host.classList.add('is-quiet'); }           /* repaint without replaying entry animations */
  function paintPanel(animate) { var el = $('vlPanel'); if (!el) return; if (!animate) quiet(); else host.classList.remove('is-quiet'); el.innerHTML = panelHtml(food(state.food)); }
  function paintPortion() {
    var f = food(state.food), out = $('vlPortionOut'), comp = $('vlComp');
    quiet();
    if (out) out.innerHTML = '<b>' + esc(t('vl.portion.unit', { n: state.portion })) + '</b> · ' + num(f.kcal * state.portion / 100, 0) + ' kcal';
    if (comp) comp.innerHTML = compHtml(f);
    var el = $('vlPanel'); if (el && state.tab !== 'compare') el.innerHTML = panelHtml(f);
  }
  function mount() {
    var slot = $('vmLab');
    if (!slot) return;
    if (host.parentNode !== slot) slot.appendChild(host);
    if (!host.firstChild) paintAll();
  }
  function select(id, scroll) {
    var f = food(id); if (!f) return;
    state.food = id; state.portion = f.portion;
    if (state.other === id) state.other = id === 'cowpea' ? 'sorghum' : 'cowpea';
    save();
    paintAll(scroll ? null : '[data-vl-pick="' + id + '"][aria-pressed]');
    if (scroll) {
      var title = $('vlTitle');
      if (title) { title.scrollIntoView({ behavior: global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); try { title.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
  }

  /* ---- 7. Actions ----------------------------------------------------------------- */
  root.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-vl-pick], [data-vl-tab], [data-vl-need]') : null;
    if (!el || !root.contains(el)) return;
    if (el.hasAttribute('data-vl-pick')) {
      var inLab = host.contains(el), stay = el.hasAttribute('data-vl-stay');
      select(el.getAttribute('data-vl-pick'), !inLab || stay);
    } else if (el.hasAttribute('data-vl-tab')) {
      var id = el.getAttribute('data-vl-tab'); if (TABS.indexOf(id) < 0) return;
      state.tab = id; paintAll('#vlTab-' + id);
    } else {
      var need = el.getAttribute('data-vl-need'); if (!NEEDS[need]) return;
      state.need = need; save();
      paintAll('[data-vl-need="' + need + '"]');
    }
  });
  host.addEventListener('keydown', function (ev) {
    var tab = ev.target.closest ? ev.target.closest('[data-vl-tab]') : null;
    if (!tab || (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft')) return;
    ev.preventDefault();
    var i = (TABS.indexOf(state.tab) + (ev.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    state.tab = TABS[i]; paintAll('#vlTab-' + TABS[i]);
  });
  host.addEventListener('input', function (ev) {
    ev.stopPropagation();
    if (ev.target.id === 'vlPortion') { state.portion = Math.max(5, Math.min(300, Math.round(+ev.target.value / 5) * 5 || 5)); paintPortion(); }
  });
  host.addEventListener('change', function (ev) {
    ev.stopPropagation();
    var el = ev.target, k;
    if ((k = el.getAttribute('data-vl-gi')) && k in state.gi) { state.gi[k] = !!el.checked; paintPanel(true); refocus('[data-vl-gi="' + k + '"]'); }
    else if ((k = el.getAttribute('data-vl-bio')) && k in state.bio) { state.bio[k] = !!el.checked; paintPanel(true); refocus('[data-vl-bio="' + k + '"]'); }
    else if (el.id === 'vlOther' && food(el.value)) { state.other = el.value; paintPanel(true); refocus('#vlOther'); }
  });
  function refocus(sel) { var el = host.querySelector(sel); if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }

  /* ---- 8. API ---------------------------------------------------------------------- */
  var BY_INDEX = FOODS.map(function (f) { return f.id; });      /* same order as PRODUCTS in view-marketplace.js */
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.marketplaceLab = {
    mount: mount, select: select,
    /* Markup placed at the top of a catalogue product card (called by view-marketplace.js). */
    cardMedia: function (index) {
      var f = food(BY_INDEX[index]); if (!f) return '';
      return '<button type="button" class="vl-thumb" data-vl-pick="' + f.id + '" aria-label="' + esc(t('vl.analyse.aria', { name: fname(f) })) + '">' + img(f, 'vl-thumb__img') +
        '<span class="vl-thumb__kcal">' + esc(t('vl.kcal100', { n: num(f.kcal, 0) })) + '</span><span class="vl-thumb__cta">' + ico('flask') + esc(t('vl.analyse')) + '</span></button>';
    },
    foods: function () { return FOODS.map(function (f) { return { id: f.id, kcal: f.kcal, gi: f.gi, density: density(f) }; }); },
    ranking: function () { return ranking().map(function (r) { return [r.f.id, r.score]; }); },
    state: function () {
      var f = food(state.food);
      return { food: state.food, portion: state.portion, tab: state.tab, need: state.need, other: state.other, gi: giEff(f, state.gi), gl: gl(f, state.portion, state.gi),
        ironRate: ironRate(f, state.bio), density: density(f) };
    }
  };
  I18N.onChange(function () { paintAll(); });
  var mk = global.NutriBentoViews.marketplace;
  if (mk && mk.render) mk.render();
  mount();
})(window);
