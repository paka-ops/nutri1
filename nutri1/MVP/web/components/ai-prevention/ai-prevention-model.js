/* ============================================================================
 * NUTRI.N°1 — AI Nutrition & Prevention Engine · moteur de simulation
 * ----------------------------------------------------------------------------
 * Algorithme **déterministe** : mêmes entrées → mêmes sorties, aucune donnée
 * aléatoire non reproductible. Chaque probabilité est la moyenne pondérée de
 * facteurs normalisés (0–1) passée dans une sigmoïde, puis traduite en fenêtre
 * d’apparition temporelle.
 *
 *   AIP_MODEL.analyse(state)            → scores, risques, facteurs, projection
 *   AIP_MODEL.buildPlan(state, result)  → programme de 7 jours
 *   AIP_MODEL.targets(state)            → cibles correctives à 12 semaines
 *
 * Aucune dépendance DOM. Aucune librairie externe.
 * ========================================================================== */
(function (global) {
  'use strict';

  var DATA = global.AIP_DATA;

  /* ------------------------------------------------------------------ */
  /* Utilitaires numériques                                             */
  /* ------------------------------------------------------------------ */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  /* Normalise x dans [lo,hi] → [0,1] (borné). */
  function norm(x, lo, hi) { return clamp((x - lo) / (hi - lo), 0, 1); }
  /* Risque décroissant : plus la valeur est basse, plus le risque monte. */
  function inv(x, lo, hi) { return 1 - norm(x, lo, hi); }
  function round(v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* PRNG déterministe (mulberry32) : le programme de la semaine est stable
     pour un profil donné, et change quand on demande « Régénérer ». */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedOf(state) {
    var p = state.profile, s = state.sensors, h = state.habits;
    return hashString([
      p.age, p.sex, p.height, p.weight, p.chol, p.sbp, p.dbp,
      s.glucose, s.hr, s.sleep,
      h.sugar, h.satFat, h.fiber, h.water,
      state.planSeed || 0
    ].join('|'));
  }

  /* ------------------------------------------------------------------ */
  /* Indicateurs dérivés                                                */
  /* ------------------------------------------------------------------ */
  function derived(state) {
    var p = state.profile;
    var meters = p.height / 100;
    var bmi = p.weight / (meters * meters);
    /* Mifflin-St Jeor */
    var bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
    var maintenance = bmr * 1.4;
    var deficit = bmi >= 30 ? 600 : (bmi >= 25 ? 400 : 0);
    var kcalTarget = clamp(Math.round((maintenance - deficit) / 10) * 10, 1400, 2900);
    return {
      bmi: bmi,
      bmiRounded: round(bmi, 1),
      bmr: Math.round(bmr),
      maintenance: Math.round(maintenance),
      kcalTarget: kcalTarget,
      pulsePressure: p.sbp - p.dbp,
      map: Math.round(p.dbp + (p.sbp - p.dbp) / 3)
    };
  }

  function bmiBand(bmi) {
    if (bmi < 18.5) return 'under';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'over';
    return 'obese';
  }

  /* ------------------------------------------------------------------ */
  /* Scores de risque                                                   */
  /* ------------------------------------------------------------------ */
  var FACTORS = {
    diabetes: [
      { key: 'glucose', w: 0.30, v: function (m, st) { return norm(st.sensors.glucose, 85, 165); } },
      { key: 'bmi', w: 0.22, v: function (m) { return norm(m.bmi, 22, 38); } },
      { key: 'sugar', w: 0.20, v: function (m, st) { return norm(st.habits.sugar, 20, 90); } },
      { key: 'fiber', w: 0.14, v: function (m, st) { return inv(st.habits.fiber, 0.5, 5); } },
      { key: 'age', w: 0.08, v: function (m, st) { return norm(st.profile.age, 30, 72); } },
      { key: 'sleep', w: 0.06, v: function (m, st) { return inv(st.sensors.sleep, 55, 95); } }
    ],
    cardio: [
      { key: 'chol', w: 0.26, v: function (m, st) { return norm(st.profile.chol, 170, 300); } },
      { key: 'satfat', w: 0.20, v: function (m, st) { return norm(st.habits.satFat, 6, 22); } },
      { key: 'sbp', w: 0.16, v: function (m, st) { return norm(st.profile.sbp, 110, 170); } },
      { key: 'bmi', w: 0.12, v: function (m) { return norm(m.bmi, 22, 36); } },
      { key: 'fiber', w: 0.10, v: function (m, st) { return inv(st.habits.fiber, 0.5, 5); } },
      { key: 'age', w: 0.09, v: function (m, st) { return norm(st.profile.age, 30, 72); } },
      { key: 'glucose', w: 0.07, v: function (m, st) { return norm(st.sensors.glucose, 90, 160); } }
    ],
    hypertension: [
      { key: 'sbp', w: 0.34, v: function (m, st) { return norm(st.profile.sbp, 110, 170); } },
      { key: 'dbp', w: 0.22, v: function (m, st) { return norm(st.profile.dbp, 70, 110); } },
      { key: 'bmi', w: 0.14, v: function (m) { return norm(m.bmi, 22, 36); } },
      { key: 'sugar', w: 0.12, v: function (m, st) { return norm(st.habits.sugar, 20, 90); } },
      { key: 'hydration', w: 0.10, v: function (m, st) { return inv(st.habits.water, 1, 3); } },
      { key: 'age', w: 0.08, v: function (m, st) { return norm(st.profile.age, 30, 72); } }
    ],
    hepatic: [
      { key: 'bmi', w: 0.28, v: function (m) { return norm(m.bmi, 22, 38); } },
      { key: 'sugar', w: 0.26, v: function (m, st) { return norm(st.habits.sugar, 20, 90); } },
      { key: 'satfat', w: 0.18, v: function (m, st) { return norm(st.habits.satFat, 6, 22); } },
      { key: 'glucose', w: 0.16, v: function (m, st) { return norm(st.sensors.glucose, 85, 160); } },
      { key: 'sleep', w: 0.12, v: function (m, st) { return inv(st.sensors.sleep, 55, 95); } }
    ]
  };

  /* Valeur lisible d’un facteur (affichée dans les cartes). */
  function factorValue(key, state, m) {
    var p = state.profile, s = state.sensors, h = state.habits;
    switch (key) {
      case 'glucose': return { value: round(s.glucose, 0), unitKey: 'ai.unit.mgdl' };
      case 'bmi': return { value: m.bmiRounded, unitKey: '' };
      case 'sugar': return { value: round(h.sugar, 0), unitKey: 'ai.unit.gday' };
      case 'fiber': return { value: round(h.fiber, 1), unitKey: 'ai.unit.portion' };
      case 'sleep': return { value: round(s.sleep, 0), unitKey: 'ai.unit.percent' };
      case 'age': return { value: p.age, unitKey: 'ai.unit.years' };
      case 'chol': return { value: p.chol, unitKey: 'ai.unit.mgdl' };
      case 'satfat': return { value: round(h.satFat, 0), unitKey: 'ai.unit.pct' };
      case 'sbp': return { value: p.sbp, unitKey: 'ai.unit.mmhg' };
      case 'dbp': return { value: p.dbp, unitKey: 'ai.unit.mmhg' };
      case 'hydration': return { value: round(h.water, 1), unitKey: 'ai.unit.lday' };
      default: return { value: '', unitKey: '' };
    }
  }

  /* Score pondéré + facteurs dominants d’une maladie. */
  function scoreRisk(id, state, m) {
    var list = FACTORS[id];
    var totalW = 0, weighted = 0;
    var parts = list.map(function (f) {
      var v = clamp(f.v(m, state), 0, 1);
      totalW += f.w;
      weighted += f.w * v;
      return { key: f.key, part: f.w * v, v: v };
    });
    var score = totalW ? weighted / totalW : 0;
    parts.sort(function (a, b) { return b.part - a.part; });
    var drivers = parts
      .filter(function (d) { return d.part > 0.035; })
      .slice(0, 3)
      .map(function (d) {
        var info = factorValue(d.key, state, m);
        return { key: d.key, value: info.value, unitKey: info.unitKey, share: Math.round(d.part / (totalW * 0.6) * 100) };
      });
    return { score: score, drivers: drivers };
  }

  /* Sigmoïde : 0.42 de score ≈ 50 % de probabilité. */
  function probability(score) {
    return clamp(Math.round(100 / (1 + Math.exp(-(score - 0.42) * 7.5))), 2, 96);
  }

  function levelOf(p) {
    if (p < 20) return 'low';
    if (p < 40) return 'moderate';
    if (p < 60) return 'elevated';
    if (p < 80) return 'high';
    return 'critical';
  }

  /* Fenêtre d’apparition : plus la probabilité est haute, plus elle est proche.
     L’âge avancé rapproche la fenêtre (ancienneté de l’exposition). */
  var BANDS = [
    { min: 80, from: 2, to: 4 },
    { min: 65, from: 3, to: 6 },
    { min: 50, from: 5, to: 9 },
    { min: 35, from: 8, to: 13 },
    { min: 20, from: 13, to: 19 },
    { min: 0, from: 18, to: 24 }
  ];

  function onsetWindow(p, age) {
    var band = BANDS[BANDS.length - 1];
    for (var i = 0; i < BANDS.length; i++) {
      if (p >= BANDS[i].min) { band = BANDS[i]; break; }
    }
    var shift = 0;
    if (age >= 58) shift = -2;
    else if (age >= 48) shift = -1;
    else if (age <= 32) shift = 1;
    var from = Math.max(1, band.from + shift);
    var to = Math.max(from + 2, band.to + shift);
    return { from: from, to: to, beyond: from > 20, none: p < 12 };
  }

  /* ------------------------------------------------------------------ */
  /* Analyse complète                                                   */
  /* ------------------------------------------------------------------ */
  function analyse(state) {
    var m = derived(state);
    var risks = DATA.RISKS.map(function (meta) {
      var sc = scoreRisk(meta.id, state, m);
      var p = probability(sc.score);
      var onset = onsetWindow(p, state.profile.age);
      /* Programme correctif : adhésion réaliste (50–58 %), plus forte sur le
         risque dominant. Volontairement conservateur. */
      var adherence = 0.54 - Math.min(0.06, sc.score * 0.05);
      var p2 = clamp(Math.round(p * (1 - adherence)), 2, 96);
      var onset2 = onsetWindow(p2, state.profile.age);
      return {
        id: meta.id,
        nameKey: meta.nameKey,
        icon: meta.icon,
        accent: meta.accent,
        accent2: meta.accent2,
        weight: meta.weight,
        score: round(sc.score, 3),
        probability: p,
        level: levelOf(p),
        drivers: sc.drivers,
        onset: onset,
        corrected: { probability: p2, level: levelOf(p2), onset: onset2, delta: Math.max(0, p - p2) }
      };
    });

    risks.sort(function (a, b) { return b.probability - a.probability; });

    /* Score métabolique global : 100 = trajectoire optimale. */
    var health = 100;
    risks.forEach(function (r) { health -= r.weight * r.probability; });
    health = clamp(Math.round(health), 3, 98);

    var bmiBandKey = bmiBand(m.bmi);
    var metabolicAge = clamp(Math.round(state.profile.age + (58 - health) / 2.1), 16, 92);

    /* Signaux détectés : facteurs dominants fusionnés, sans doublon. */
    var signals = [];
    var seen = {};
    risks.forEach(function (r) {
      r.drivers.forEach(function (d) {
        if (seen[d.key]) { seen[d.key].share += d.share; return; }
        seen[d.key] = { key: d.key, value: d.value, unitKey: d.unitKey, share: d.share };
        signals.push(seen[d.key]);
      });
    });
    signals.sort(function (a, b) { return b.share - a.share; });
    signals = signals.slice(0, 5);

    var top = risks[0];

    return {
      derived: m,
      bmiBand: bmiBandKey,
      risks: risks,
      topRisk: top,
      metabolicScore: health,
      metabolicAge: metabolicAge,
      ageGap: metabolicAge - state.profile.age,
      scoreBand: health >= 80 ? 'excellent' : (health >= 65 ? 'good' : (health >= 50 ? 'fragile' : 'alert')),
      signals: signals,
      seed: seedOf(state)
    };
  }

  /* ------------------------------------------------------------------ */
  /* Cibles correctives                                                 */
  /* ------------------------------------------------------------------ */
  function targets(state) {
    var h = state.habits;
    return [
      { key: 'sugar', current: round(h.sugar, 0), target: Math.max(12, Math.min(25, Math.round(h.sugar * 0.5))), unitKey: 'ai.unit.gday', max: 100 },
      { key: 'satfat', current: round(h.satFat, 0), target: Math.max(5, Math.min(10, Math.round(h.satFat * 0.6))), unitKey: 'ai.unit.pct', max: 25 },
      { key: 'fiber', current: round(h.fiber, 1), target: Math.max(4, Math.min(7, round(h.fiber + 2, 1))), unitKey: 'ai.unit.portion', max: 8 },
      { key: 'water', current: round(h.water, 1), target: Math.max(2.2, round(h.water + 0.7, 1)), unitKey: 'ai.unit.lday', max: 4 }
    ];
  }

  /* ------------------------------------------------------------------ */
  /* Générateur de programme 7 jours                                    */
  /* ------------------------------------------------------------------ */
  var SLOT_SHARE = { breakfast: 0.25, lunch: 0.35, snack: 0.10, dinner: 0.30 };

  function pickDish(slot, state, riskPriority, kcalTarget, rng, used) {
    var pool = DATA.DISHES[slot];
    var weighted = pool.map(function (dish) {
      var score = 0;
      riskPriority.slice(0, 3).forEach(function (id, index) {
        var boost = [1.8, 1.2, 0.7][index] || 0;
        score += (dish.b[id] || 0) * boost;
      });
      /* Écart énergétique : on garde le repas proche de sa part de la cible. */
      score -= Math.abs(dish.kcal - kcalTarget * SLOT_SHARE[slot]) / 120;
      /* Éviter la répétition : un plat déjà servi récemment est fortement pénalisé. */
      if (used.indexOf(dish.id) !== -1) score -= 6;
      /* Poids de sélection toujours positif, modulé par le PRNG déterministe. */
      return { dish: dish, w: Math.max(0.15, 1 + score) };
    });

    var total = weighted.reduce(function (a, b) { return a + b.w; }, 0);
    var ticket = rng() * total;
    var chosen = weighted[weighted.length - 1].dish;
    for (var i = 0; i < weighted.length; i++) {
      ticket -= weighted[i].w;
      if (ticket <= 0) { chosen = weighted[i].dish; break; }
    }
    return chosen;
  }

  function buildPlan(state, result) {
    var res = result || analyse(state);
    /* La graine dépend de l’état, donc du compteur « Régénérer » : mêmes
       données + même graine ⇒ même programme, un clic sur Régénérer ⇒ un
       nouveau programme tout aussi reproductible. */
    var rng = mulberry32(seedOf(state));
    var priority = res.risks.map(function (r) { return r.id; });
    var kcalTarget = res.derived.kcalTarget;
    var days = [];
    var recent = { breakfast: [], lunch: [], snack: [], dinner: [] };

    for (var d = 0; d < 7; d++) {
      var meals = {};
      var totals = { kcal: 0, protein: 0, carbs: 0, fiber: 0, gl: 0 };
      DATA.SLOTS.forEach(function (slot) {
        var dish = pickDish(slot, state, priority, kcalTarget, rng, recent[slot]);
        meals[slot] = dish;
        totals.kcal += dish.kcal;
        totals.protein += dish.protein;
        totals.carbs += dish.carbs;
        totals.fiber += dish.fiber;
        totals.gl += dish.gl;
        recent[slot].push(dish.id);
        if (recent[slot].length > 2) recent[slot].shift();
      });

      var chosen = DATA.SLOTS.map(function (slot) { return meals[slot]; });
      var avgBenefit = function (riskId) {
        var sum = 0;
        chosen.forEach(function (dish) { sum += (dish.b[riskId] || 0); });
        return sum / chosen.length;
      };
      var tags = {};
      chosen.forEach(function (dish) {
        (dish.tags || []).forEach(function (tag) { tags[tag] = true; });
      });

      /* Impact estimé — déterministe, dérivé des bénéfices réellement servis. */
      var impacts = [];
      var glucoseCut = clamp(Math.round(9 + avgBenefit('diabetes') * 4 + (priority[0] === 'diabetes' ? 4 : 0)), 9, 33);
      impacts.push({ key: 'ai.impact.glucose', n: glucoseCut });
      if (totals.fiber >= 26) impacts.push({ key: 'ai.impact.fiber', n: Math.round(totals.fiber) });
      if (tags.omega3) impacts.push({ key: 'ai.impact.omega3' });
      if (priority.slice(0, 2).indexOf('hepatic') !== -1) {
        impacts.push({ key: 'ai.impact.liver', n: clamp(Math.round(8 + avgBenefit('hepatic') * 5), 8, 34) });
      }
      if (priority.slice(0, 2).indexOf('hypertension') !== -1 && tags.potassium) {
        impacts.push({ key: 'ai.impact.sodium' });
      }
      if (totals.protein >= 80) impacts.push({ key: 'ai.impact.protein', n: Math.round(totals.protein) });

      days.push({
        key: DATA.DAY_KEYS[d],
        meals: meals,
        totals: {
          kcal: totals.kcal,
          protein: Math.round(totals.protein),
          carbs: Math.round(totals.carbs),
          fiber: Math.round(totals.fiber),
          gl: Math.round(totals.gl)
        },
        impacts: impacts.slice(0, 4),
        tags: Object.keys(tags)
      });
    }

    var weekGl = days.map(function (x) { return x.totals.gl; });
    return {
      kCalTarget: kcalTarget,
      days: days,
      week: {
        avgKcal: Math.round(days.reduce(function (a, b) { return a + b.totals.kcal; }, 0) / 7),
        avgGl: Math.round(weekGl.reduce(function (a, b) { return a + b; }, 0) / 7),
        gl: weekGl,
        maxGl: Math.max.apply(null, weekGl),
        avgFiber: Math.round(days.reduce(function (a, b) { return a + b.totals.fiber; }, 0) / 7)
      },
      priority: priority
    };
  }

  /* ------------------------------------------------------------------ */
  /* Qualificatifs des curseurs (libellés courts)                       */
  /* ------------------------------------------------------------------ */
  function quality(kind, value) {
    switch (kind) {
      case 'sugar':
        if (value <= 25) return 'low';
        if (value <= 50) return 'moderate';
        if (value <= 75) return 'high';
        return 'critical';
      case 'satfat':
        if (value <= 8) return 'low';
        if (value <= 14) return 'moderate';
        if (value <= 20) return 'high';
        return 'critical';
      case 'fiber':
        if (value <= 1) return 'insufficient';
        if (value <= 3) return 'moderate';
        if (value <= 5) return 'good';
        return 'excellent';
      case 'water':
        if (value < 1.2) return 'critical';
        if (value < 1.8) return 'insufficient';
        if (value < 2.5) return 'moderate';
        return 'excellent';
      case 'glucose':
        if (value < 90) return 'optimal';
        if (value < 110) return 'watch';
        return 'high';
      case 'hr':
        if (value <= 62) return 'optimal';
        if (value <= 78) return 'watch';
        return 'high';
      case 'sleep':
        if (value >= 85) return 'optimal';
        if (value >= 70) return 'watch';
        return 'low';
      /* Constantes médicales : vocabulaire des curseurs (ai.q.*). */
      case 'age':
        if (value >= 58) return 'high';
        if (value >= 42) return 'moderate';
        return 'low';
      case 'chol':
        if (value >= 240) return 'high';
        if (value >= 200) return 'moderate';
        return 'low';
      case 'sbp':
        if (value >= 140) return 'high';
        if (value >= 125) return 'moderate';
        return 'low';
      case 'dbp':
        if (value >= 90) return 'high';
        if (value >= 82) return 'moderate';
        return 'low';
      default: return 'moderate';
    }
  }

  global.AIP_MODEL = {
    version: '1.0.0',
    analyse: analyse,
    buildPlan: buildPlan,
    targets: targets,
    quality: quality,
    derived: derived,
    bmiBand: bmiBand,
    levelOf: levelOf,
    onsetWindow: onsetWindow,
    helpers: { clamp: clamp, norm: norm, inv: inv, round: round }
  };
})(window);
