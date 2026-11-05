/* ============================================================================
   NUTRI.N°1 — CITIZEN 360 · données de démonstration
   ----------------------------------------------------------------------------
   Séries déterministes (aucun Math.random) : les graphiques restent stables
   d'un rendu à l'autre, mais réagissent à la période et au bouton « actualiser ».
   Toutes les valeurs sont des DONNÉES DE DÉMONSTRATION, pas des données médicales.
   ========================================================================== */
(function (global) {
  'use strict';

  /* Générateur pseudo-aléatoire reproductible (LCG 32 bits). */
  function lcg(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function round(v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

  var PERIODS = [7, 30, 90];

  /* Construit une chronique complète pour une période donnée. */
  function buildSeries(period, revision) {
    var n = PERIODS.indexOf(period) >= 0 ? period : 7;
    var rnd = lcg(9187 + n * 131 + (revision || 0) * 977);
    var out = {
      period: n,
      labels: [],
      energy: [],
      target: [],
      weight: [],
      glucose: [],
      systolic: [],
      diastolic: [],
      hydration: [],
      diversity: [],
      adherence: [],
      meals: []
    };

    for (var i = 0; i < n; i++) {
      var t = n > 1 ? i / (n - 1) : 1;
      var j = rnd() - .5;
      var wave = Math.sin((i / Math.max(n, 1)) * Math.PI * 4 + .5);
      var wave2 = Math.sin((i / 3.4) + 1.2);
      var energy = 1990 + wave * 105 + wave2 * 42 + j * 110 + (revision % 3) * 9;
      var w = 68.9 - t * .72 + Math.sin(i / 3.1) * .16 + j * .12;
      var gl = 5.38 - t * .16 + Math.sin(i / 4.2) * .10 + j * .13;
      var sys = 121.5 - t * 3.6 + Math.sin(i / 5.1) * 2.1 + j * 1.8;
      var dia = 78.4 - t * 2.3 + Math.sin(i / 5.4) * 1.3 + j * 1.2;
      var hyd = 1.74 + t * .32 + Math.sin(i / 3.3) * .16 + j * .16;
      var div = 68 + t * 10 + Math.sin(i / 4.4) * 3.1 + j * 2.6;
      var adh = 80 + t * 8 + Math.sin(i / 5.2) * 3 + j * 2.8;

      var breakfast = energy * (.22 + (rnd() - .5) * .025);
      var lunch = energy * (.37 + (rnd() - .5) * .025);
      var dinner = energy * (.31 + (rnd() - .5) * .025);
      var snack = energy - breakfast - lunch - dinner;

      out.labels.push(i - n + 1);          // 0 = aujourd'hui
      out.energy.push(round(energy, 0));
      out.target.push(2100);
      out.weight.push(round(w, 2));
      out.glucose.push(round(clamp(gl, 4.5, 6.2), 2));
      out.systolic.push(round(clamp(sys, 108, 132), 0));
      out.diastolic.push(round(clamp(dia, 68, 86), 0));
      out.hydration.push(round(clamp(hyd, 1.1, 2.8), 2));
      out.diversity.push(round(clamp(div, 55, 92), 1));
      out.adherence.push(round(clamp(adh, 70, 98), 1));
      out.meals.push([
        round(breakfast, 0), round(lunch, 0), round(dinner, 0), round(snack, 0)
      ]);
    }
    return out;
  }

  /* Heatmap d'hydratation : 4 semaines × 7 jours, en % de l'objectif. */
  function buildHydration(revision) {
    var rnd = lcg(4451 + (revision || 0) * 313);
    var cells = [];
    for (var w = 0; w < 4; w++) {
      for (var d = 0; d < 7; d++) {
        var weekend = d >= 5 ? -9 : 0;
        var v = 74 + w * 4 + weekend + Math.sin(d * 1.7) * 8 + rnd() * 22;
        cells.push(round(clamp(v, 38, 104), 0));
      }
    }
    return cells;
  }

  var MACROS = [
    { key: 'macro.carbs', grams: 265, kcal: 1060, target: 260, color: '#c9ee59' },
    { key: 'macro.protein', grams: 92, kcal: 368, target: 95, color: '#34d399' },
    { key: 'macro.fat', grams: 68, kcal: 612, target: 65, color: '#5cc8ff' },
    { key: 'macro.fiber', grams: 27, kcal: 0, target: 30, color: '#e8c877' }
  ];

  var MICROS = [
    { key: 'micro.iron', value: 14.2, target: 18, unit: 'mg', status: 'watch' },
    { key: 'micro.calcium', value: 790, target: 1000, unit: 'mg', status: 'watch' },
    { key: 'micro.vitA', value: 625, target: 700, unit: 'µg', status: 'good' },
    { key: 'micro.vitC', value: 94, target: 110, unit: 'mg', status: 'good' },
    { key: 'micro.folate', value: 322, target: 400, unit: 'µg', status: 'watch' },
    { key: 'micro.zinc', value: 9.3, target: 11, unit: 'mg', status: 'good' },
    { key: 'micro.fiber', value: 27, target: 30, unit: 'g', status: 'good' },
    { key: 'micro.sodium', value: 1960, target: 2000, unit: 'mg', status: 'watch', inverse: true }
  ];

  var RADAR = [
    { key: 'radar.cereals', actual: 84, target: 80 },
    { key: 'radar.legumes', actual: 68, target: 80 },
    { key: 'radar.vegetables', actual: 76, target: 80 },
    { key: 'radar.fruits', actual: 61, target: 80 },
    { key: 'radar.protein', actual: 79, target: 75 },
    { key: 'radar.dairy', actual: 57, target: 70 }
  ];

  var SIGNALS = [
    { icon: '🩸', tone: 'good', delta: '-0,2 mmol/L', title: { fr: 'Glycémie stabilisée', en: 'Fasting glucose stabilised' }, detail: { fr: '5,2 mmol/L sur 14 jours · dans la plage de référence.', en: '5.2 mmol/L over 14 days · within the reference range.' } },
    { icon: '🧂', tone: 'watch', delta: '+4 %', title: { fr: 'Sodium à surveiller', en: 'Sodium intake to watch' }, detail: { fr: '1 960 mg/jour, proche du seuil OMS de 2 000 mg.', en: '1,960 mg/day, close to the 2,000 mg WHO threshold.' } },
    { icon: '🥗', tone: 'info', delta: '+6 pts', title: { fr: 'Diversité en progression', en: 'Dietary diversity improving' }, detail: { fr: 'Score 78/100 · légumineuses et légumes feuilles en hausse.', en: 'Score 78/100 · legumes and leafy vegetables are increasing.' } }
  ];

  var RISKS = [
    { key: 'risk.glucose', score: 24, trend: -3, tone: 'good', detail: { fr: 'Glycémie et HbA1c dans les cibles.', en: 'Glucose and HbA1c within targets.' } },
    { key: 'risk.cardio', score: 38, trend: -5, tone: 'watch', detail: { fr: 'Tension en baisse, sodium encore élevé.', en: 'Blood pressure falling, sodium still high.' } },
    { key: 'risk.micro', score: 31, trend: -8, tone: 'good', detail: { fr: 'Fer et folates sous la cible.', en: 'Iron and folate below target.' } },
    { key: 'risk.sodium', score: 64, trend: 4, tone: 'high', detail: { fr: 'Exposition sodée persistante.', en: 'Persistent sodium exposure.' } }
  ];

  var MEALS = [
    {
      icon: '🥣', time: '07:20', kcal: 486, score: 88, protein: 18, carbs: 62, fat: 16,
      name: { fr: 'Bouillie de mil enrichie, œuf & papaye', en: 'Enriched millet porridge, egg & papaya' },
      foods: { fr: 'Mil · œuf · papaye · arachide', en: 'Millet · egg · papaya · peanut' }
    },
    {
      icon: '🍲', time: '12:45', kcal: 724, score: 91, protein: 34, carbs: 88, fat: 24,
      name: { fr: 'Riz complet, sauce arachide & poisson', en: 'Brown rice, peanut sauce & fish' },
      foods: { fr: 'Riz · arachide · feuilles de manioc · poisson', en: 'Rice · peanut · cassava leaves · fish' }
    },
    {
      icon: '🍌', time: '16:10', kcal: 214, score: 84, protein: 9, carbs: 31, fat: 7,
      name: { fr: 'Banane & pois chiches grillés', en: 'Banana & roasted chickpeas' },
      foods: { fr: 'Banane · pois chiches · eau', en: 'Banana · chickpeas · water' }
    },
    {
      icon: '🥘', time: '19:30', kcal: 612, score: 86, protein: 29, carbs: 71, fat: 22,
      name: { fr: 'Fufu d’igname, soupe légumes & tofu', en: 'Yam fufu, vegetable soup & tofu' },
      foods: { fr: 'Igname · gombo · tomate · tofu', en: 'Yam · okra · tomato · tofu' }
    }
  ];

  var RECOMMENDATIONS = [
    {
      priority: 'high', accent: '#fb7185', icon: '🧂',
      title: { fr: 'Réduire le sodium de 15 %', en: 'Cut sodium by 15%' },
      body: { fr: 'Les bouillons cubes et condiments représentent 42 % de l’apport. Substituez-les par des herbes, du gingembre et du citron.', en: 'Stock cubes and condiments account for 42% of intake. Replace them with herbs, ginger and lemon.' },
      action: { fr: 'Voir les alternatives', en: 'See alternatives' },
      evidence: { fr: 'OMS · seuil 2 000 mg/j', en: 'WHO · 2,000 mg/day limit' }
    },
    {
      priority: 'medium', accent: '#e8c877', icon: '🫘',
      title: { fr: 'Renforcer fer + vitamine C', en: 'Boost iron + vitamin C' },
      body: { fr: 'Associez légumineuses et agrumes au même repas : la vitamine C améliore l’absorption du fer non héminique.', en: 'Pair legumes with citrus in the same meal: vitamin C improves non-haem iron absorption.' },
      action: { fr: 'Composer le repas', en: 'Build the meal' },
      evidence: { fr: 'Evidence graph · 1 240 liens', en: 'Evidence graph · 1,240 links' }
    },
    {
      priority: 'medium', accent: '#5cc8ff', icon: '💧',
      title: { fr: 'Hydratation les week-ends', en: 'Weekend hydration' },
      body: { fr: 'L’objectif de 2 L est atteint 5 jours sur 7. Programmez deux rappels samedi et dimanche.', en: 'The 2 L goal is met 5 days out of 7. Schedule two reminders on Saturday and Sunday.' },
      action: { fr: 'Activer les rappels', en: 'Enable reminders' },
      evidence: { fr: 'Journal 28 jours', en: '28-day journal' }
    },
    {
      priority: 'low', accent: '#34d399', icon: '🥬',
      title: { fr: 'Maintenir la diversité', en: 'Maintain diversity' },
      body: { fr: 'Six groupes alimentaires sur dix sont consommés chaque semaine. Ajoutez un produit laitier ou alternative enrichie.', en: 'Six of ten food groups are eaten weekly. Add a dairy product or fortified alternative.' },
      action: { fr: 'Ouvrir le plan 7 jours', en: 'Open the 7-day plan' },
      evidence: { fr: 'Score MDD-W adapté', en: 'Adapted MDD-W score' }
    }
  ];

  var FAMILY = {
    child1: {
      id: 'child1', name: 'Ama', age: 7, sex: { fr: 'Fille', en: 'Girl' }, icon: '👧🏾',
      height: 121, weight: 23.4, bmi: 16.0, percentile: 58,
      growth: { fr: 'Courbe régulière', en: 'On track' },
      nutrition: { fr: 'Bonne diversité alimentaire', en: 'Good dietary diversity' },
      alerts: { fr: 'Aucune alerte active', en: 'No active alert' },
      ages: [5, 6, 7, 8, 9, 10, 11, 12],
      values: [15.2, 15.5, 16.0, 16.3, 16.6, 16.9, 17.2, 17.6],
      p15: [13.7, 13.9, 14.1, 14.3, 14.5, 14.7, 14.9, 15.2],
      p85: [17.4, 17.8, 18.2, 18.6, 19.0, 19.4, 19.9, 20.4]
    },
    child2: {
      id: 'child2', name: 'Kofi', age: 11, sex: { fr: 'Garçon', en: 'Boy' }, icon: '👦🏾',
      height: 142, weight: 39.2, bmi: 19.4, percentile: 71,
      growth: { fr: 'Tendance à surveiller', en: 'Monitor trend' },
      nutrition: { fr: 'Diversité à améliorer', en: 'Needs more dietary diversity' },
      alerts: { fr: 'Suivi recommandé', en: 'Follow-up recommended' },
      ages: [5, 6, 7, 8, 9, 10, 11, 12],
      values: [15.6, 16.1, 16.7, 17.4, 18.1, 18.8, 19.4, 20.1],
      p15: [13.9, 14.1, 14.4, 14.7, 15.0, 15.3, 15.7, 16.1],
      p85: [17.6, 18.0, 18.5, 19.1, 19.7, 20.4, 21.1, 21.9]
    }
  };

  /* Aliments locaux : la plateforme couvre 17 pays ; suggestions ciblées + repli. */
  var LOCAL_FOODS = {
    TG: { country: { fr: 'Togo', en: 'Togo' }, items: [{ fr: 'Feuilles de manioc', en: 'Cassava leaves' }, { fr: 'Igname de Sotouboua', en: 'Sotouboua yam' }, { fr: 'Soja de Lomé', en: 'Lomé soy' }] },
    GH: { country: { fr: 'Ghana', en: 'Ghana' }, items: [{ fr: 'Fufu de plantain', en: 'Plantain fufu' }, { fr: 'Feuilles de cocoyam', en: 'Cocoyam leaves' }, { fr: 'Mil rouge', en: 'Red millet' }] },
    SN: { country: { fr: 'Sénégal', en: 'Senegal' }, items: [{ fr: 'Moringa', en: 'Moringa' }, { fr: 'Niébé', en: 'Cowpea' }, { fr: 'Bissap', en: 'Hibiscus' }] },
    NG: { country: { fr: 'Nigeria', en: 'Nigeria' }, items: [{ fr: 'Patate douce orange', en: 'Orange-fleshed sweet potato' }, { fr: 'Egusi', en: 'Egusi' }, { fr: 'Feuilles d’amarante', en: 'Amaranth leaves' }] },
    CI: { country: { fr: 'Côte d’Ivoire', en: 'Côte d’Ivoire' }, items: [{ fr: 'Foutou d’igname', en: 'Yam foutou' }, { fr: 'Sauce graine', en: 'Palm nut sauce' }, { fr: 'Attiéké', en: 'Attiéké' }] },
    BF: { country: { fr: 'Burkina Faso', en: 'Burkina Faso' }, items: [{ fr: 'Tô de mil', en: 'Millet tô' }, { fr: 'Soumbala', en: 'Soumbala' }, { fr: 'Baobab', en: 'Baobab' }] },
    BJ: { country: { fr: 'Bénin', en: 'Benin' }, items: [{ fr: 'Amiwo de maïs', en: 'Amiwo corn porridge' }, { fr: 'Feuilles de fonio', en: 'Fonio greens' }, { fr: 'Soja affine', en: 'Fermented soy' }] },
    ML: { country: { fr: 'Mali', en: 'Mali' }, items: [{ fr: 'Fonio', en: 'Fonio' }, { fr: 'Dégué', en: 'Dégué' }, { fr: 'Karité', en: 'Shea' }] },
    NE: { country: { fr: 'Niger', en: 'Niger' }, items: [{ fr: 'Mil perlé', en: 'Pearl millet' }, { fr: 'Niébé', en: 'Cowpea' }, { fr: 'Oseille', en: 'Roselle' }] }
  };

  var DEFAULT_FOODS = {
    country: { fr: 'Afrique de l’Ouest', en: 'West Africa' },
    items: [{ fr: 'Légumes feuilles locales', en: 'Local leafy vegetables' }, { fr: 'Légumineuses', en: 'Legumes' }, { fr: 'Céréales complètes', en: 'Whole grains' }]
  };

  var BASE_MEASURES = {
    profile: 'female', age: 35, weight: 68.4, height: 170,
    waist: 82, hip: 98, glucose: 5.2, hba1c: 5.4,
    systolic: 118, diastolic: 76, cholesterol: 4.6
  };

  var DATA = {
    version: '1.0.0',
    periods: PERIODS,
    series: buildSeries,
    hydration: buildHydration,
    macros: MACROS,
    micros: MICROS,
    radar: RADAR,
    signals: SIGNALS,
    risks: RISKS,
    meals: MEALS,
    recommendations: RECOMMENDATIONS,
    family: FAMILY,
    localFoods: LOCAL_FOODS,
    defaultFoods: DEFAULT_FOODS,
    baseMeasures: BASE_MEASURES,
    helpers: { clamp: clamp, round: round, lcg: lcg }
  };

  global.C360_DATA = DATA;
})(window);
