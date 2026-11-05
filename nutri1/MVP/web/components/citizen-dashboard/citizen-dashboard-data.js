/* ============================================================================
 * NUTRI.N°1 — Citizen Health & Nutrition Dashboard 360° · référentiel
 * ----------------------------------------------------------------------------
 * Ce fichier ne touche JAMAIS au DOM : il ne contient que des données, des
 * valeurs de référence et des textes bilingues (FR / EN).
 *
 * Contenu
 *   1. Profil de démonstration, habitudes et historique de mesures
 *   2. Références cliniques (IMC, tour de taille, tension, glycémie, HbA1c…)
 *   3. Aliments africains (composition par portion) — base du plan 7 jours
 *   4. Modèles de repas par jour et par créneau
 *   5. Micronutriments suivis, objectifs, badges et conseils
 *
 * Toutes les valeurs nutritionnelles sont des ordres de grandeur pédagogiques
 * (démonstration), dérivés des tables de composition alimentaire africaines.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 0. Utilitaires déterministes (aucun Math.random : démo reproductible) */
  /* ------------------------------------------------------------------ */
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < String(str).length; i++) {
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    var s = seed || 1;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* 1. Profils, habitudes, historique                                   */
  /* ------------------------------------------------------------------ */
  var DEFAULTS = {
    locale: null,
    profile: {
      name: 'Amina',
      sex: 'female',
      age: 34,
      height: 166,
      weight: 68.4,
      waist: 82,
      hip: 98,
      glucose: 5.4,
      glucoseUnit: 'mmol',
      hba1c: 5.6,
      sys: 118,
      dia: 76,
      chol: 4.6,
      creatinine: 68,
      activity: 'moderate',
      goal: 'balance',
      country: 'TG'
    },
    habits: {
      water: 6,          /* verres de 250 ml bus aujourd'hui */
      waterGoal: 8,
      steps: 6420,
      stepsGoal: 8000,
      sleep: 6.8,
      sleepGoal: 7.5,
      veggies: 3,        /* portions de légumes / fruits */
      veggiesGoal: 5,
      sugary: 2,         /* boissons ou snacks sucrés / jour */
      salt: 1,           /* plats riches en sel / jour */
      activityMin: 24,
      activityGoal: 30,
      fiber: 22,         /* g de fibres estimés */
      protein: 54       /* g de protéines estimés */
    },
    sync: { last: 0, source: 'watch' },
    familyAccess: false,
    activeChild: 'child1',
    activeTab: 'overview',
    activeDay: 0,
    waterToday: 6
  };

  /* Profils de démonstration — chaque preset rejoue un cas d'usage réel. */
  var PRESETS = {
    balanced: {
      profile: { name: 'Amina', sex: 'female', age: 34, height: 166, weight: 68.4, waist: 82, hip: 98, glucose: 5.4, hba1c: 5.6, sys: 118, dia: 76, chol: 4.6, creatinine: 68, activity: 'moderate', goal: 'balance' },
      habits: { water: 6, steps: 6420, sleep: 6.8, veggies: 3, sugary: 2, salt: 1, activityMin: 24, fiber: 22, protein: 54 }
    },
    risk: {
      profile: { name: 'Kossi', sex: 'male', age: 47, height: 172, weight: 92.6, waist: 104, hip: 106, glucose: 7.2, hba1c: 6.7, sys: 142, dia: 92, chol: 5.8, creatinine: 96, activity: 'low', goal: 'weight' },
      habits: { water: 3, steps: 3100, sleep: 5.6, veggies: 1, sugary: 6, salt: 4, activityMin: 8, fiber: 11, protein: 78 }
    },
    athlete: {
      profile: { name: 'Esi', sex: 'female', age: 26, height: 170, weight: 61.2, waist: 71, hip: 94, glucose: 4.8, hba1c: 5.1, sys: 110, dia: 68, chol: 3.9, creatinine: 74, activity: 'high', goal: 'performance' },
      habits: { water: 8, steps: 12400, sleep: 7.9, veggies: 5, sugary: 1, salt: 1, activityMin: 62, fiber: 32, protein: 96 }
    },
    maternal: {
      profile: { name: 'Ama', sex: 'female', age: 29, height: 162, weight: 71.5, waist: 96, hip: 104, glucose: 5.9, hba1c: 5.8, sys: 124, dia: 79, chol: 5.1, creatinine: 62, activity: 'light', goal: 'maternal' },
      habits: { water: 6, steps: 4800, sleep: 7.1, veggies: 2, sugary: 3, salt: 2, activityMin: 18, fiber: 19, protein: 66 }
    }
  };

  /* Historique de mesures (14 points) recalculé à partir du profil courant. */
  function historyFor(profile, seedStr) {
    var r = rng(seedFrom(seedStr || profile.name || 'nutri'));
    var n = 14, out = [];
    var w0 = profile.weight - 1.2;
    var waist0 = profile.waist - 2.4;
    var gl0 = profile.glucose - 0.5;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      out.push({
        day: i,
        weight: +(w0 + (profile.weight - w0) * t + (r() - 0.5) * 0.7).toFixed(1),
        waist: +(waist0 + (profile.waist - waist0) * t + (r() - 0.5) * 1.1).toFixed(1),
        glucose: +(gl0 + (profile.glucose - gl0) * t + (r() - 0.5) * 0.28).toFixed(2),
        sys: Math.round(profile.sys + 6 - 6 * t + (r() - 0.5) * 6),
        dia: Math.round(profile.dia + 4 - 4 * t + (r() - 0.5) * 5),
        steps: Math.round(import_step(profile.activity, r)),
        sleep: +Math.max(4.6, Math.min(9, 6.4 + (r() - 0.4) * 1.6)).toFixed(1)
      });
    }
    return out;
  }
  function import_step(activity, r) {
    var base = { low: 3400, light: 5200, moderate: 7400, high: 10800 }[activity] || 6800;
    return base + r() * 2600;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Références cliniques                                             */
  /* ------------------------------------------------------------------ */
  var REFERENCES = {
    bmi: { min: 18.5, max: 24.9, label: { fr: '18,5 – 24,9 kg/m²', en: '18.5 – 24.9 kg/m²' } },
    whtr: { max: 0.5, label: { fr: '≤ 0,50 (adulte)', en: '≤ 0.50 (adult)' } },
    waist: {
      female: { max: 80, label: { fr: '≤ 80 cm (femme)', en: '≤ 80 cm (female)' } },
      male: { max: 94, label: { fr: '≤ 94 cm (homme)', en: '≤ 94 cm (male)' } }
    },
    glucose: { min: 3.9, max: 5.5, label: { fr: '3,9 – 5,5 mmol/L à jeun', en: '3.9 – 5.5 mmol/L fasting' } },
    hba1c: { max: 5.7, label: { fr: '< 5,7 %', en: '< 5.7 %' } },
    bp: { sys: 120, dia: 80, label: { fr: '< 120 / 80 mmHg', en: '< 120 / 80 mmHg' } },
    chol: { max: 5.0, label: { fr: '< 5,0 mmol/L', en: '< 5.0 mmol/L' } },
    protein: { perKg: 1.2, label: { fr: '1,0 – 1,2 g/kg/jour', en: '1.0 – 1.2 g/kg/day' } },
    fiber: { per1000kcal: 14, label: { fr: '≈ 14 g / 1 000 kcal', en: '≈ 14 g / 1 000 kcal' } }
  };

  /* Seuils OMS simplifiés pour les enfants (BMI-for-age, indices zindicatifs). */
  var CHILD_REFS = {
    child1: { name: 'Ama', age: 7, sex: 'female', height: 121, weight: 23.4, bmi: 16.0, growth: 'onTrack', diversity: 4, alerts: 0, points: [ [2, 14.4], [3, 14.7], [4, 15.0], [5, 15.2], [6, 15.6], [7, 16.0] ] },
    child2: { name: 'Kofi', age: 11, sex: 'male', height: 142, weight: 39.2, bmi: 19.4, growth: 'watch', diversity: 2, alerts: 1, points: [ [6, 15.1], [7, 15.6], [8, 16.2], [9, 17.0], [10, 18.1], [11, 19.4] ] }
  };
  /* Courbes de référence simplifiées (50e percentile approx., 2–12 ans). */
  var CHILD_CURVES = {
    female: [[2, 14.8], [3, 15.0], [4, 15.2], [5, 15.3], [6, 15.5], [7, 15.7], [8, 16.0], [9, 16.4], [10, 16.9], [11, 17.5], [12, 18.2]],
    male: [[2, 15.2], [3, 15.4], [4, 15.5], [5, 15.6], [6, 15.8], [7, 16.0], [8, 16.3], [9, 16.8], [10, 17.4], [11, 18.1], [12, 19.0]]
  };

  /* ------------------------------------------------------------------ */
  /* 3. Aliments africains (par portion servie)                          */
  /*    kcal · protéines · glucides · lipides · fibres (g)               */
  /*    fer (mg) · vitA (µg ER) · vitC (mg) · calcium (mg) · sodium (mg) */
  /* ------------------------------------------------------------------ */
  function food(id, icon, fr, en, kcal, p, c, f, fib, fe, va, vc, ca, na, gi, tags) {
    return {
      id: id, icon: icon, name: { fr: fr, en: en }, kcal: kcal, protein: p, carbs: c, fat: f,
      fiber: fib, iron: fe, vitA: va, vitC: vc, calcium: ca, sodium: na, gi: gi, tags: tags || []
    };
  }

  var FOODS = {
    /* Petit-déjeuner */
    b1: food('b1', '🥣', 'Bouillie de mil enrichie au moringa', 'Millet porridge with moringa', 320, 9, 54, 7, 6, 3.4, 210, 12, 120, 180, 58, ['fiber', 'iron']),
    b2: food('b2', '🍠', 'Patate douce à chair orange + lait caillé', 'Orange-fleshed sweet potato + curd', 340, 11, 58, 6, 7, 2.1, 780, 26, 160, 140, 54, ['vitA', 'fiber']),
    b3: food('b3', '🥑', 'Tartine de pain local + avocat + tomate', 'Local bread, avocado & tomato', 310, 8, 34, 15, 7, 1.9, 90, 18, 70, 320, 55, ['healthyFat']),
    b4: food('b4', '🍌', 'Banane plantain vapeur + arachides', 'Steamed plantain with groundnuts', 360, 7, 62, 9, 6, 1.6, 60, 14, 40, 90, 62, ['energy']),
    b5: food('b5', '🥚', 'Œufs brouillés + légumes verts', 'Scrambled eggs with leafy greens', 250, 17, 6, 18, 2, 2.8, 320, 22, 110, 260, 40, ['protein', 'vitA']),
    b6: food('b6', '🍚', 'Riz complet + haricots niébé', 'Brown rice & black-eyed peas', 380, 15, 64, 6, 9, 4.2, 40, 6, 90, 210, 52, ['fiber', 'protein']),

    /* Déjeuner */
    l1: food('l1', '🍲', 'Ragoût d’igname à la tomate et au poisson', 'Yam stew with tomato & fish', 520, 28, 62, 16, 8, 3.6, 240, 30, 180, 520, 48, ['protein', 'omega3']),
    l2: food('l2', '🍛', 'Riz au gras + légumes feuilles (gboma)', 'Jollof-style rice with leafy greens', 560, 16, 82, 18, 7, 4.8, 480, 20, 150, 640, 62, ['iron', 'vitA']),
    l3: food('l3', '🫘', 'Haricots rouges + huile de palme rouge', 'Red beans in red palm oil', 430, 18, 58, 14, 14, 5.1, 620, 12, 130, 380, 42, ['fiber', 'vitA']),
    l4: food('l4', '🐟', 'Tilapia grillé + attiéké + salade', 'Grilled tilapia, attiéké & salad', 480, 34, 48, 15, 5, 2.4, 120, 28, 180, 420, 50, ['protein', 'omega3']),
    l5: food('l5', '🍗', 'Poulet braisé + riz + carottes', 'Grilled chicken, rice & carrots', 540, 36, 54, 18, 4, 2.2, 420, 16, 90, 560, 56, ['protein']),
    l6: food('l6', '🍲', 'Sauce arachide + couscous de mil + légumes', 'Peanut sauce, mil couscous & vegetables', 590, 22, 66, 24, 9, 4.4, 180, 22, 140, 480, 55, ['energy', 'plantProtein']),

    /* Dîner */
    d1: food('d1', '🥗', 'Salade de niébé, tomate et avocat', 'Black-eyed pea, tomato & avocado salad', 340, 14, 34, 16, 11, 3.8, 200, 32, 110, 300, 34, ['fiber', 'plantProtein']),
    d2: food('d2', '🍲', 'Soupe de légumes verts + poisson fumé', 'Leafy vegetable soup with smoked fish', 300, 24, 22, 13, 8, 3.9, 560, 40, 220, 480, 30, ['vitA', 'protein']),
    d3: food('d3', '🌽', 'Maïs frais + haricots + épinards', 'Fresh maize, beans & spinach', 400, 16, 60, 10, 12, 4.6, 380, 28, 170, 260, 58, ['fiber', 'iron']),
    d4: food('d4', '🍛', 'Mafé allégé + riz complet', 'Light maafe with brown rice', 520, 20, 62, 20, 8, 4.1, 300, 14, 130, 520, 52, ['plantProtein']),
    d5: food('d5', '🐐', 'Viande de chèvre maigre + légumes rôtis', 'Lean goat meat with roasted vegetables', 420, 32, 26, 20, 6, 3.4, 460, 34, 90, 380, 36, ['protein', 'iron']),

    /* Collations */
    s1: food('s1', '🥭', 'Mangue fraîche (1/2)', 'Fresh mango (1/2)', 100, 1, 24, 0, 3, 0.3, 320, 46, 18, 2, 51, ['vitC', 'vitA']),
    s2: food('s2', '🌰', 'Poignée de noix de cajou locales', 'Handful of local cashews', 180, 5, 9, 15, 2, 1.8, 4, 1, 30, 120, 25, ['healthyFat']),
    s3: food('s3', '🥕', 'Carottes & concombre en bâtonnets', 'Carrot & cucumber sticks', 70, 1.5, 12, 0.5, 4, 0.5, 820, 14, 32, 40, 20, ['vitA', 'fiber']),
    s4: food('s4', '🥛', 'Yaourt nature + baobab', 'Plain yoghurt with baobab', 160, 9, 16, 6, 3, 0.6, 90, 34, 240, 90, 35, ['calcium', 'vitC']),
    s5: food('s5', '🍊', 'Orange fraîche', 'Fresh orange', 62, 1, 15, 0, 3, 0.2, 20, 62, 40, 1, 43, ['vitC']),
    s6: food('s6', '🌿', 'Infusion de moringa + citron', 'Moringa infusion with lemon', 20, 1, 3, 0.2, 1, 1.2, 320, 20, 60, 5, 15, ['vitA'])
  };

  var FOOD_ORDER = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'd1', 'd2', 'd3', 'd4', 'd5', 's1', 's2', 's3', 's4', 's5', 's6'];

  /* Modèles de journée : 4 créneaux, rotation selon le jour et le profil. */
  var MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
  var PLAN_MATRIX = [
    { breakfast: ['b1', 's5'], lunch: ['l1', 's3'], dinner: ['d2', 's1'], snack: ['s4'] },
    { breakfast: ['b2', 's6'], lunch: ['l3', 's1'], dinner: ['d4', 's3'], snack: ['s2'] },
    { breakfast: ['b5', 'b3'], lunch: ['l4', 's3'], dinner: ['d1', 's5'], snack: ['s4'] },
    { breakfast: ['b6', 's5'], lunch: ['l2', 's1'], dinner: ['d3', 's6'], snack: ['s3'] },
    { breakfast: ['b3', 's4'], lunch: ['l6', 's3'], dinner: ['d5', 's1'], snack: ['s5'] },
    { breakfast: ['b4', 's6'], lunch: ['l5', 's1'], dinner: ['d2', 's3'], snack: ['s2'] },
    { breakfast: ['b1', 's4'], lunch: ['l1', 's5'], dinner: ['d1', 's6'], snack: ['s1'] }
  ];

  /* ------------------------------------------------------------------ */
  /* 4. Micronutriments suivis                                          */
  /* ------------------------------------------------------------------ */
  var MICROS = [
    { key: 'fiber', labelKey: 'czd.micro.fiber', unit: 'g', rda: 25, color: '#0f9d58' },
    { key: 'protein', labelKey: 'czd.micro.protein', unit: 'g', rda: 60, color: '#1f7ae0' },
    { key: 'iron', labelKey: 'czd.micro.iron', unit: 'mg', rda: 18, color: '#a4453f' },
    { key: 'vitA', labelKey: 'czd.micro.vitA', unit: 'µg', rda: 700, color: '#e07a1f' },
    { key: 'vitC', labelKey: 'czd.micro.vitC', unit: 'mg', rda: 75, color: '#c68a0a' },
    { key: 'calcium', labelKey: 'czd.micro.calcium', unit: 'mg', rda: 1000, color: '#3c7f9a' }
  ];

  /* ------------------------------------------------------------------ */
  /* 5. Objectifs, badges, conseils                                     */
  /* ------------------------------------------------------------------ */
  var GOALS = [
    { key: 'balance', icon: '⚖️', labelKey: 'czd.goal.balance' },
    { key: 'weight', icon: '🎯', labelKey: 'czd.goal.weight' },
    { key: 'energy', icon: '⚡', labelKey: 'czd.goal.energy' },
    { key: 'maternal', icon: '🤰🏾', labelKey: 'czd.goal.maternal' },
    { key: 'performance', icon: '🏃🏾‍♀️', labelKey: 'czd.goal.performance' },
    { key: 'ncd', icon: '❤️‍🩹', labelKey: 'czd.goal.ncd' }
  ];

  var ACTIVITY_LEVELS = [
    { key: 'low', icon: '🪑', factor: 1.2, labelKey: 'czd.activity.low' },
    { key: 'light', icon: '🚶🏾', factor: 1.375, labelKey: 'czd.activity.light' },
    { key: 'moderate', icon: '🚴🏾', factor: 1.55, labelKey: 'czd.activity.moderate' },
    { key: 'high', icon: '🏃🏾', factor: 1.725, labelKey: 'czd.activity.high' }
  ];

  var ACHIEVEMENTS = [
    { key: 'hydration', icon: '💧', labelKey: 'czd.badge.hydration', rule: 'water>=8' },
    { key: 'steps', icon: '👟', labelKey: 'czd.badge.steps', rule: 'steps>=8000' },
    { key: 'fiber', icon: '🌾', labelKey: 'czd.badge.fiber', rule: 'fiber>=25' },
    { key: 'diversity', icon: '🌈', labelKey: 'czd.badge.diversity', rule: 'veggies>=5' },
    { key: 'sleep', icon: '😴', labelKey: 'czd.badge.sleep', rule: 'sleep>=7.5' },
    { key: 'sugar', icon: '🚫', labelKey: 'czd.badge.sugar', rule: 'sugary<=1' }
  ];

  var TIPS = [
    'czd.tip.1', 'czd.tip.2', 'czd.tip.3', 'czd.tip.4', 'czd.tip.5', 'czd.tip.6'
  ];

  global.CZD_DATA = {
    version: '1.0.0',
    seedFrom: seedFrom,
    rng: rng,
    DEFAULTS: DEFAULTS,
    PRESETS: PRESETS,
    REFERENCES: REFERENCES,
    CHILD_REFS: CHILD_REFS,
    CHILD_CURVES: CHILD_CURVES,
    FOODS: FOODS,
    FOOD_ORDER: FOOD_ORDER,
    MEAL_SLOTS: MEAL_SLOTS,
    PLAN_MATRIX: PLAN_MATRIX,
    MICROS: MICROS,
    GOALS: GOALS,
    ACTIVITY_LEVELS: ACTIVITY_LEVELS,
    ACHIEVEMENTS: ACHIEVEMENTS,
    TIPS: TIPS,
    historyFor: historyFor
  };
})(typeof window !== 'undefined' ? window : this);

/* --------------------------------------------------------------------------
 * Prix indicatifs par portion (FCFA, marché ouest-africain, démonstration).
 * Exposés séparément pour rester modifiables sans toucher aux compositions.
 * ------------------------------------------------------------------------ */
(function (global) {
  var COSTS = {
    b1: 250, b2: 300, b3: 350, b4: 200, b5: 400, b6: 300,
    l1: 900, l2: 700, l3: 450, l4: 1200, l5: 1100, l6: 800,
    d1: 500, d2: 650, d3: 400, d4: 750, d5: 1250,
    s1: 150, s2: 300, s3: 100, s4: 250, s5: 100, s6: 50
  };
  if (global.CZD_DATA) {
    global.CZD_DATA.COSTS = COSTS;
    global.CZD_DATA.DAY_NAMES = {
      fr: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
      en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    };
    global.CZD_DATA.GROCERY_GROUPS = {
      b1: 'cereal', b4: 'cereal', b6: 'cereal', b3: 'cereal',
      l1: 'tuber', l2: 'cereal', l6: 'cereal', d4: 'cereal', d3: 'cereal',
      l3: 'legume', d1: 'legume', l5: 'animal', l4: 'animal', d2: 'animal', d5: 'animal',
      b5: 'animal', s4: 'dairy', b2: 'vegetable', s1: 'fruit', s5: 'fruit', s3: 'vegetable', s6: 'vegetable', s2: 'fat'
    };
  }
})(typeof window !== 'undefined' ? window : this);
