/* ============================================================================
 * NUTRI.N°1 — AI Nutrition & Prevention Engine · référentiel de données
 * ----------------------------------------------------------------------------
 * Aucun accès au DOM : ce fichier ne contient que des données pures.
 *
 *   AIP_DATA.DEFAULT       → état initial (capteurs, profil, habitudes)
 *   AIP_DATA.PRESETS       → profils de démonstration reproductibles
 *   AIP_DATA.SLOTS         → ordre des repas d’une journée
 *   AIP_DATA.DISHES        → bibliothèque de plats locaux (8 par créneau)
 *   AIP_DATA.RISKS         → métadonnées des quatre maladies ciblées
 *   AIP_DATA.DRIVERS       → correspondance facteur → conseil correctif
 *   AIP_DATA.ICONS         → icônes SVG inline (aucune librairie externe)
 *
 * Chaque plat porte : énergie, protéines, glucides, fibres, charge glycémique,
 * un vecteur de bénéfices (0–3) par maladie et des étiquettes nutritionnelles.
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* 1. État par défaut                                                  */
  /* ------------------------------------------------------------------ */
  var DEFAULTS = {
    sensors: { glucose: 104, hr: 74, sleep: 78, syncedAt: 0 },
    profile: { age: 41, sex: 'female', height: 165, weight: 78, chol: 212, sbp: 132, dbp: 86 },
    habits: { sugar: 52, satFat: 13, fiber: 2, water: 1.3 }
  };

  /* Profils de démonstration — valeurs réalistes, volontairement contrastées. */
  var PRESETS = {
    risk: {
      sensors: { glucose: 128, hr: 88, sleep: 61 },
      profile: { age: 52, sex: 'male', height: 172, weight: 96, chol: 246, sbp: 148, dbp: 95 },
      habits: { sugar: 88, satFat: 18, fiber: 1, water: 0.9 }
    },
    balanced: {
      sensors: { glucose: 88, hr: 62, sleep: 91 },
      profile: { age: 34, sex: 'female', height: 168, weight: 61, chol: 172, sbp: 112, dbp: 72 },
      habits: { sugar: 18, satFat: 7, fiber: 5, water: 2.6 }
    }
  };

  /* ------------------------------------------------------------------ */
  /* 2. Repas et bibliothèque de plats                                   */
  /* ------------------------------------------------------------------ */
  var SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'];

  /* help: b = bénéfices par maladie (0–3) · gl = charge glycémique de la portion */
  var DISHES = {
    breakfast: [
      {
        id: 'bf_millet', emoji: '🥣',
        name: { fr: 'Bouillie de mil, pâte d’arachide et papaye', en: 'Millet porridge, groundnut paste & papaya' },
        items: { fr: 'Mil · arachide · papaye', en: 'Millet · groundnut · papaya' },
        kcal: 370, protein: 12, carbs: 56, fiber: 7, gl: 22,
        b: { diabetes: 3, cardio: 2, hypertension: 1, hepatic: 2 },
        tags: ['lowgi', 'fiber']
      },
      {
        id: 'bf_omelette', emoji: '🍳',
        name: { fr: 'Omelette aux légumes, pain complet et tomate', en: 'Vegetable omelette, wholegrain bread & tomato' },
        items: { fr: 'Œufs · poivron · tomate · pain complet', en: 'Eggs · pepper · tomato · wholegrain bread' },
        kcal: 340, protein: 19, carbs: 30, fiber: 5, gl: 18,
        b: { diabetes: 3, cardio: 1, hypertension: 1, hepatic: 2 },
        tags: ['protein', 'lowgi']
      },
      {
        id: 'bf_oats', emoji: '🥛',
        name: { fr: 'Flocons d’avoine, lait de soja, banane et sésame', en: 'Oats, soy milk, banana & sesame' },
        items: { fr: 'Avoine · soja · banane · sésame', en: 'Oats · soy · banana · sesame' },
        kcal: 390, protein: 15, carbs: 55, fiber: 9, gl: 28,
        b: { diabetes: 2, cardio: 3, hypertension: 1, hepatic: 2 },
        tags: ['fiber', 'potassium']
      },
      {
        id: 'bf_yogurt', emoji: '🍶',
        name: { fr: 'Yaourt nature, fruit de baobab et noix de cajou', en: 'Plain yoghurt, baobab fruit & cashew nuts' },
        items: { fr: 'Yaourt · baobab · cajou', en: 'Yoghurt · baobab · cashew' },
        kcal: 300, protein: 14, carbs: 26, fiber: 4, gl: 14,
        b: { diabetes: 3, cardio: 2, hypertension: 2, hepatic: 1 },
        tags: ['probiotic', 'potassium']
      },
      {
        id: 'bf_sweetpotato', emoji: '🍠',
        name: { fr: 'Patate douce bouillie, pâte de niébé et thé de moringa', en: 'Boiled sweet potato, cowpea paste & moringa tea' },
        items: { fr: 'Patate douce · niébé · moringa', en: 'Sweet potato · cowpea · moringa' },
        kcal: 360, protein: 13, carbs: 60, fiber: 9, gl: 30,
        b: { diabetes: 2, cardio: 2, hypertension: 3, hepatic: 1 },
        tags: ['fiber', 'vita', 'potassium']
      },
      {
        id: 'bf_wagashi', emoji: '🧀',
        name: { fr: 'Wagashi (fromage peulh), tomate et pain complet', en: 'Wagashi (Fulani cheese), tomato & wholegrain bread' },
        items: { fr: 'Wagashi · tomate · pain complet', en: 'Wagashi · tomato · wholegrain bread' },
        kcal: 330, protein: 18, carbs: 28, fiber: 4, gl: 17,
        b: { diabetes: 3, cardio: 2, hypertension: 2, hepatic: 1 },
        tags: ['protein', 'lowgi']
      },
      {
        id: 'bf_tofu', emoji: '🥬',
        name: { fr: 'Tofu brouillé, épinards et galette de mil', en: 'Scrambled tofu, spinach & millet flatbread' },
        items: { fr: 'Tofu · épinards · mil', en: 'Tofu · spinach · millet' },
        kcal: 350, protein: 20, carbs: 32, fiber: 7, gl: 19,
        b: { diabetes: 3, cardio: 2, hypertension: 1, hepatic: 2 },
        tags: ['plantprotein', 'lowgi', 'fiber']
      },
      {
        id: 'bf_akassa', emoji: '🫓',
        name: { fr: 'Akassa, poisson fumé et thé d’hibiscus sans sucre', en: 'Akassa, smoked fish & unsweetened hibiscus tea' },
        items: { fr: 'Maïs fermenté · poisson fumé · hibiscus', en: 'Fermented maize · smoked fish · hibiscus' },
        kcal: 380, protein: 17, carbs: 58, fiber: 4, gl: 34,
        b: { diabetes: 1, cardio: 1, hypertension: 1, hepatic: 1 },
        tags: ['iron']
      }
    ],

    lunch: [
      {
        id: 'ln_fonio', emoji: '🌾',
        name: { fr: 'Fonio, niébé, sauce gombo et tilapia grillé', en: 'Fonio, cowpea, okra sauce & grilled tilapia' },
        items: { fr: 'Fonio · niébé · gombo · tilapia', en: 'Fonio · cowpea · okra · tilapia' },
        kcal: 560, protein: 32, carbs: 62, fiber: 12, gl: 30,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 2 },
        tags: ['lowgi', 'fiber', 'omega3']
      },
      {
        id: 'ln_brownrice', emoji: '🍚',
        name: { fr: 'Riz complet, poulet fermier et légumes-feuilles', en: 'Brown rice, farm chicken & leafy vegetables' },
        items: { fr: 'Riz complet · poulet · gboma', en: 'Brown rice · chicken · leafy greens' },
        kcal: 590, protein: 34, carbs: 66, fiber: 9, gl: 36,
        b: { diabetes: 2, cardio: 2, hypertension: 2, hepatic: 2 },
        tags: ['fiber', 'protein']
      },
      {
        id: 'ln_sorghum', emoji: '🥘',
        name: { fr: 'Couscous de sorgho, maquereau et carottes', en: 'Sorghum couscous, mackerel & carrots' },
        items: { fr: 'Sorgho · maquereau · carotte', en: 'Sorghum · mackerel · carrot' },
        kcal: 570, protein: 30, carbs: 64, fiber: 10, gl: 33,
        b: { diabetes: 3, cardio: 3, hypertension: 1, hepatic: 2 },
        tags: ['omega3', 'fiber']
      },
      {
        id: 'ln_lentil', emoji: '🫘',
        name: { fr: 'Ragoût de lentilles, millet et épinards', en: 'Lentil stew, millet & spinach' },
        items: { fr: 'Lentilles · millet · épinards', en: 'Lentils · millet · spinach' },
        kcal: 520, protein: 24, carbs: 68, fiber: 14, gl: 27,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 3 },
        tags: ['fiber', 'plantprotein']
      },
      {
        id: 'ln_plantain', emoji: '🍌',
        name: { fr: 'Banane plantain verte, poisson braisé et chou', en: 'Green plantain, braised fish & cabbage' },
        items: { fr: 'Plantain · poisson · chou', en: 'Plantain · fish · cabbage' },
        kcal: 540, protein: 28, carbs: 70, fiber: 8, gl: 38,
        b: { diabetes: 1, cardio: 2, hypertension: 2, hepatic: 1 },
        tags: ['potassium', 'fiber']
      },
      {
        id: 'ln_millet_fish', emoji: '🐟',
        name: { fr: 'Boule de mil, sardines et sauce tomate', en: 'Millet ball, sardines & tomato sauce' },
        items: { fr: 'Mil · sardines · tomate', en: 'Millet · sardines · tomato' },
        kcal: 550, protein: 31, carbs: 63, fiber: 8, gl: 32,
        b: { diabetes: 2, cardio: 3, hypertension: 1, hepatic: 2 },
        tags: ['omega3', 'iron']
      },
      {
        id: 'ln_tofu_bowl', emoji: '🥗',
        name: { fr: 'Bol de tofu, riz complet, gombo et avocat', en: 'Tofu bowl, brown rice, okra & avocado' },
        items: { fr: 'Tofu · riz complet · gombo · avocat', en: 'Tofu · brown rice · okra · avocado' },
        kcal: 530, protein: 26, carbs: 58, fiber: 12, gl: 26,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 3 },
        tags: ['plantprotein', 'fiber', 'potassium']
      },
      {
        id: 'ln_chicken_yam', emoji: '🍗',
        name: { fr: 'Igname, poulet fermier et sauce gboma', en: 'Yam, farm chicken & gboma sauce' },
        items: { fr: 'Igname · poulet · gboma', en: 'Yam · chicken · leafy greens' },
        kcal: 600, protein: 33, carbs: 72, fiber: 10, gl: 40,
        b: { diabetes: 1, cardio: 1, hypertension: 1, hepatic: 1 },
        tags: ['protein', 'fiber']
      }
    ],

    snack: [
      {
        id: 'sn_groundnut', emoji: '🥜',
        name: { fr: 'Poignée d’arachides et orange', en: 'Handful of groundnuts & orange' },
        items: { fr: 'Arachide · orange', en: 'Groundnut · orange' },
        kcal: 180, protein: 6, carbs: 14, fiber: 3, gl: 8,
        b: { diabetes: 2, cardio: 2, hypertension: 1, hepatic: 1 },
        tags: ['lowgi', 'potassium']
      },
      {
        id: 'sn_papaya', emoji: '🍈',
        name: { fr: 'Papaye et graines de sésame', en: 'Papaya & sesame seeds' },
        items: { fr: 'Papaye · sésame', en: 'Papaya · sesame' },
        kcal: 140, protein: 3, carbs: 22, fiber: 4, gl: 9,
        b: { diabetes: 2, cardio: 1, hypertension: 2, hepatic: 2 },
        tags: ['fiber', 'vita']
      },
      {
        id: 'sn_baobab', emoji: '🧃',
        name: { fr: 'Jus de baobab non sucré et noix tigrées', en: 'Unsweetened baobab juice & tiger nuts' },
        items: { fr: 'Baobab · noix tigrées', en: 'Baobab · tiger nuts' },
        kcal: 160, protein: 4, carbs: 20, fiber: 6, gl: 10,
        b: { diabetes: 3, cardio: 1, hypertension: 2, hepatic: 1 },
        tags: ['lowgi', 'potassium']
      },
      {
        id: 'sn_yogurt', emoji: '🥛',
        name: { fr: 'Yaourt nature et mangue', en: 'Plain yoghurt & mango' },
        items: { fr: 'Yaourt · mangue', en: 'Yoghurt · mango' },
        kcal: 170, protein: 9, carbs: 20, fiber: 2, gl: 12,
        b: { diabetes: 2, cardio: 1, hypertension: 2, hepatic: 1 },
        tags: ['probiotic']
      },
      {
        id: 'sn_vegsticks', emoji: '🥕',
        name: { fr: 'Bâtons de carotte et concombre, houmous', en: 'Carrot & cucumber sticks, hummus' },
        items: { fr: 'Carotte · concombre · pois chiches', en: 'Carrot · cucumber · chickpea' },
        kcal: 150, protein: 6, carbs: 16, fiber: 5, gl: 7,
        b: { diabetes: 3, cardio: 2, hypertension: 2, hepatic: 2 },
        tags: ['fiber', 'lowgi']
      },
      {
        id: 'sn_bissap', emoji: '🌺',
        name: { fr: 'Hibiscus infusé et galette d’arachide', en: 'Hibiscus infusion & groundnut cake' },
        items: { fr: 'Hibiscus · arachide', en: 'Hibiscus · groundnut' },
        kcal: 190, protein: 5, carbs: 21, fiber: 3, gl: 13,
        b: { diabetes: 1, cardio: 1, hypertension: 1, hepatic: 1 },
        tags: []
      },
      {
        id: 'sn_cashew', emoji: '🥭',
        name: { fr: 'Noix de cajou et goyave', en: 'Cashew nuts & guava' },
        items: { fr: 'Cajou · goyave', en: 'Cashew · guava' },
        kcal: 175, protein: 5, carbs: 16, fiber: 4, gl: 8,
        b: { diabetes: 2, cardio: 2, hypertension: 1, hepatic: 2 },
        tags: ['potassium', 'lowgi']
      },
      {
        id: 'sn_banana', emoji: '🍌',
        name: { fr: 'Banane et graines de courge', en: 'Banana & pumpkin seeds' },
        items: { fr: 'Banane · courge', en: 'Banana · pumpkin' },
        kcal: 165, protein: 5, carbs: 28, fiber: 4, gl: 17,
        b: { diabetes: 1, cardio: 1, hypertension: 1, hepatic: 1 },
        tags: ['potassium']
      }
    ],

    dinner: [
      {
        id: 'dn_okra', emoji: '🍲',
        name: { fr: 'Soupe d’okra légère, poisson et petite boule de mil', en: 'Light okra soup, fish & small millet ball' },
        items: { fr: 'Gombo · poisson · mil', en: 'Okra · fish · millet' },
        kcal: 470, protein: 28, carbs: 52, fiber: 10, gl: 26,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 2 },
        tags: ['omega3', 'fiber']
      },
      {
        id: 'dn_veg_stew', emoji: '🥘',
        name: { fr: 'Ragoût de légumes, tofu et patate douce', en: 'Vegetable stew, tofu & sweet potato' },
        items: { fr: 'Légumes · tofu · patate douce', en: 'Vegetables · tofu · sweet potato' },
        kcal: 450, protein: 22, carbs: 54, fiber: 12, gl: 24,
        b: { diabetes: 3, cardio: 3, hypertension: 3, hepatic: 3 },
        tags: ['plantprotein', 'fiber', 'potassium']
      },
      {
        id: 'dn_beans', emoji: '🫘',
        name: { fr: 'Purée de niébé, épinards et petit riz', en: 'Cowpea purée, spinach & a little rice' },
        items: { fr: 'Niébé · épinards · riz', en: 'Cowpea · spinach · rice' },
        kcal: 460, protein: 23, carbs: 58, fiber: 13, gl: 27,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 3 },
        tags: ['fiber', 'plantprotein']
      },
      {
        id: 'dn_sardines', emoji: '🐟',
        name: { fr: 'Sardines grillées, salade et fonio', en: 'Grilled sardines, salad & fonio' },
        items: { fr: 'Sardines · salade · fonio', en: 'Sardines · salad · fonio' },
        kcal: 480, protein: 32, carbs: 46, fiber: 9, gl: 22,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 2 },
        tags: ['omega3', 'lowgi']
      },
      {
        id: 'dn_chicken', emoji: '🍗',
        name: { fr: 'Poulet, feuilles de moringa et igname', en: 'Chicken, moringa leaves & yam' },
        items: { fr: 'Poulet · moringa · igname', en: 'Chicken · moringa · yam' },
        kcal: 510, protein: 34, carbs: 54, fiber: 8, gl: 32,
        b: { diabetes: 2, cardio: 2, hypertension: 2, hepatic: 1 },
        tags: ['protein', 'vita']
      },
      {
        id: 'dn_lentil_soup', emoji: '🍜',
        name: { fr: 'Soupe de lentilles et courge, pain complet', en: 'Lentil & squash soup, wholegrain bread' },
        items: { fr: 'Lentilles · courge · pain complet', en: 'Lentils · squash · wholegrain bread' },
        kcal: 430, protein: 20, carbs: 56, fiber: 14, gl: 25,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 3 },
        tags: ['fiber', 'plantprotein']
      },
      {
        id: 'dn_omelette', emoji: '🍳',
        name: { fr: 'Omelette aux légumes, avocat et salade de concombre', en: 'Vegetable omelette, avocado & cucumber salad' },
        items: { fr: 'Œufs · légumes · avocat · concombre', en: 'Eggs · vegetables · avocado · cucumber' },
        kcal: 400, protein: 21, carbs: 22, fiber: 7, gl: 13,
        b: { diabetes: 3, cardio: 2, hypertension: 3, hepatic: 2 },
        tags: ['lowgi', 'potassium']
      },
      {
        id: 'dn_tofu_cabbage', emoji: '🥬',
        name: { fr: 'Sauté de tofu et chou, petit riz complet', en: 'Tofu & cabbage stir-fry, a little brown rice' },
        items: { fr: 'Tofu · chou · riz complet', en: 'Tofu · cabbage · brown rice' },
        kcal: 440, protein: 24, carbs: 48, fiber: 10, gl: 23,
        b: { diabetes: 3, cardio: 3, hypertension: 2, hepatic: 3 },
        tags: ['plantprotein', 'fiber']
      }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. Maladies ciblées                                                 */
  /* ------------------------------------------------------------------ */
  var RISKS = [
    {
      id: 'diabetes', icon: 'droplet', accent: '#34d399', accent2: '#0ea5e9',
      nameKey: 'ai.risk.diabetes',
      weight: 0.32
    },
    {
      id: 'cardio', icon: 'heart', accent: '#fb7185', accent2: '#f43f5e',
      nameKey: 'ai.risk.cardio',
      weight: 0.28
    },
    {
      id: 'hypertension', icon: 'pulse', accent: '#fbbf24', accent2: '#f59e0b',
      nameKey: 'ai.risk.hypertension',
      weight: 0.22
    },
    {
      id: 'hepatic', icon: 'liver', accent: '#a3e635', accent2: '#65a30d',
      nameKey: 'ai.risk.hepatic',
      weight: 0.18
    }
  ];

  /* Facteur → conseil correctif (utilisé dans la timeline et les cartes). */
  var DRIVERS = {
    glucose: { labelKey: 'ai.driver.glucose', adviceKey: 'ai.advice.glucose' },
    bmi: { labelKey: 'ai.driver.bmi', adviceKey: 'ai.advice.bmi' },
    sugar: { labelKey: 'ai.driver.sugar', adviceKey: 'ai.advice.sugar' },
    fiber: { labelKey: 'ai.driver.fiber', adviceKey: 'ai.advice.fiber' },
    sleep: { labelKey: 'ai.driver.sleep', adviceKey: 'ai.advice.sleep' },
    age: { labelKey: 'ai.driver.age', adviceKey: null },
    chol: { labelKey: 'ai.driver.chol', adviceKey: 'ai.advice.chol' },
    satfat: { labelKey: 'ai.driver.satfat', adviceKey: 'ai.advice.satfat' },
    sbp: { labelKey: 'ai.driver.sbp', adviceKey: 'ai.advice.sbp' },
    dbp: { labelKey: 'ai.driver.dbp', adviceKey: 'ai.advice.dbp' },
    hydration: { labelKey: 'ai.driver.hydration', adviceKey: 'ai.advice.hydration' }
  };

  /* ------------------------------------------------------------------ */
  /* 4. Icônes SVG inline (24 × 24, trait 1.6)                           */
  /* ------------------------------------------------------------------ */
  var ICONS = {
    droplet: '<path d="M12 3.5c3.2 4 5.5 6.7 5.5 9.6a5.5 5.5 0 0 1-11 0c0-2.9 2.3-5.6 5.5-9.6Z"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-9.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.6 12 20 12 20Z"/><path d="M3.5 12.5h3l1.5-3 2.5 6 2-4 1.5 1h6.5"/>',
    pulse: '<path d="M3 12.5h3.5l2-4.5 3 9 2.5-6 1.5 3H21"/>',
    liver: '<path d="M4 10.5c2.6-3.6 8-4.6 12-2.6 3 1.5 4.4 5.6 1.4 7.5-3.4 2.1-9.7 2.3-12.6-.4-1.3-1.2-1.6-3-0.8-4.5Z"/><path d="M8 12.5c1.8-.6 3.4-.3 4.8.8"/>',
    moon: '<path d="M20 14.5A7.8 7.8 0 0 1 9.5 4 8.2 8.2 0 1 0 20 14.5Z"/><path d="M16.5 4.5l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8Z"/>',
    user: '<circle cx="12" cy="8.2" r="3.4"/><path d="M5 20c.7-3.6 3.5-5.6 7-5.6s6.3 2 7 5.6"/>',
    scale: '<path d="M6 20V5.2A1.2 1.2 0 0 1 7.2 4h9.6A1.2 1.2 0 0 1 18 5.2V20"/><path d="M4.5 20h15"/><path d="M12 8v3"/><circle cx="12" cy="12.6" r="1.6"/>',
    flask: '<path d="M9 3.5h6M10 3.5v5L6.2 17a2.4 2.4 0 0 0 2.2 3.5h7.2A2.4 2.4 0 0 0 17.8 17L14 8.5v-5"/><path d="M7.5 14h9"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l3.5-5"/><circle cx="12" cy="17" r="1.4"/>',
    sugar: '<rect x="4.5" y="7" width="8" height="8" rx="2"/><rect x="11.5" y="11" width="8" height="8" rx="2"/>',
    fat: '<path d="M4.5 15.5c0-4 3.5-8 7.5-8s7.5 4 7.5 8a3.5 3.5 0 0 1-3.5 3.5H8a3.5 3.5 0 0 1-3.5-3.5Z"/><path d="M8 15h8"/>',
    leaf: '<path d="M20 4c-8.5 0-13 4-13 9.5 0 2 .8 3.6 2 4.8C11.2 15.6 14.6 13 20 12"/><path d="M6.5 20c.4-3.4 1.8-6 4-8.4"/>',
    water: '<path d="M12 3.5c3 3.6 5.2 6.2 5.2 9a5.2 5.2 0 0 1-10.4 0c0-2.8 2.2-5.4 5.2-9Z"/><path d="M9.5 13.5c0 1.6 1.1 2.6 2.5 2.6"/>',
    brain: '<path d="M9.5 4.5A3 3 0 0 0 6.5 8a3.2 3.2 0 0 0-1.5 5.5A3.3 3.3 0 0 0 8 19a3 3 0 0 0 4 1V4.8a2 2 0 0 0-2.5-.3Z"/><path d="M14.5 4.5A3 3 0 0 1 17.5 8a3.2 3.2 0 0 1 1.5 5.5A3.3 3.3 0 0 1 16 19a3 3 0 0 1-4 1"/>',
    activity: '<path d="M3 17l4.5-6 3.5 4 3-7 3.5 5H21"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    arrow: '<path d="M5 12h13"/><path d="M13 6.5l5.5 5.5L13 17.5"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/>',
    printer: '<path d="M7 8V4h10v4"/><rect x="4.5" y="8" width="15" height="7" rx="2"/><path d="M7 15h10v5H7z"/>',
    spark: '<path d="M12 3.5l2.2 5.3 5.3 2.2-5.3 2.2L12 18.5l-2.2-5.3L4.5 11l5.3-2.2Z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'
  };

  global.AIP_DATA = {
    DEFAULT: DEFAULTS,
    PRESETS: PRESETS,
    SLOTS: SLOTS,
    DISHES: DISHES,
    RISKS: RISKS,
    DRIVERS: DRIVERS,
    ICONS: ICONS,
    DAY_KEYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    /* Ordre de grandeur des quatre maladies, utilisé par les KPI secondaires. */
    HORIZON: 20
  };
})(window);
