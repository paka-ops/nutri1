/* ============================================================================
 * NUTRI.N°1 — Citizen Health & Nutrition Dashboard 360° · moteur de calcul
 * ----------------------------------------------------------------------------
 * Moteur 100 % déterministe et pur : aucun accès au DOM, aucune dépendance
 * externe. Il alimente les KPI, les graphiques, le plan 7 jours et les
 * messages de prévention du module (#citizen).
 *
 *   CZD_MODEL.indicator(profile)        → IMC, ratio, masse grasse estimée…
 *   CZD_MODEL.vitals(profile)           → statuts glycémie / tension / lipides
 *   CZD_MODEL.energy(profile, activity) → MB, DEJ, cibles protéines / fibres
 *   CZD_MODEL.scores(profile, habits, plan) → score global + 4 sous-scores
 *   CZD_MODEL.risks(profile, habits)    → 5 signaux de prévention pondérés
 *   CZD_MODEL.priorities(profile, habits, plan) → 3 actions du jour
 *   CZD_MODEL.buildPlan(profile, habits, opts)  → plan 7 jours + micronutriments
 *   CZD_MODEL.glycemicLoad(day)         → charge glycémique d'une journée
 *   CZD_MODEL.microCoverage(plan)       → couverture par micronutriment
 *   CZD_MODEL.childAnalysis(childId)    → analyse de croissance + diversité
 *   CZD_MODEL.clinicalNotes(...)        → lecture clinique automatique
 *
 * Les formules sont des approximations documentées (Mifflin-St Jeor, Deurenberg,
 * indices OMS simplifiés) destinées à une démonstration produit.
 * ========================================================================== */
(function (global) {
  'use strict';

  var D = global.CZD_DATA;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  var r2 = function (v) { return Math.round(v * 100) / 100; };
  var pct = function (v, max) { return clamp(Math.round((v / max) * 100), 0, 200); };
  var COL = {
    good: '#0f9d58', watch: '#d98200', high: '#c0453c', low: '#1f7ae0', neutral: '#5b6b7c'
  };

  /* ------------------------------------------------------------------ */
  /* 1. Anthropométrie                                                  */
  /* ------------------------------------------------------------------ */
  function bmiOf(weight, heightCm) {
    if (!weight || !heightCm) return null;
    var m = heightCm / 100;
    return r1(weight / (m * m));
  }

  function bmiStatus(bmi) {
    if (bmi == null) return { key: 'unknown', tone: 'neutral' };
    if (bmi < 18.5) return { key: 'underweight', tone: 'watch', color: COL.watch };
    if (bmi < 25) return { key: 'normal', tone: 'good', color: COL.good };
    if (bmi < 30) return { key: 'overweight', tone: 'watch', color: COL.watch };
    return { key: 'obesity', tone: 'high', color: COL.high };
  }

  /* Estimation de la masse grasse (Deurenberg) : utile pour nuancer l'IMC. */
  function bodyFat(profile) {
    var bmi = bmiOf(profile.weight, profile.height);
    if (bmi == null) return null;
    var sex = 1; /* 1 = homme, 0 = femme */
    var fat = 1.2 * bmi + 0.23 * (profile.age || 30) - 10.8 * sex - 5.4;
    return r1(clamp(fat, 5, 55));
  }

  function waistStatus(profile) {
    var max = profile.sex === 'male' ? D.REFERENCES.waist.male.max : D.REFERENCES.waist.female.max;
    var value = profile.waist || 0;
    if (!value) return { key: 'unknown', tone: 'neutral' };
    if (value <= max) return { key: 'normal', tone: 'good', color: COL.good, max: max };
    if (value <= max + 8) return { key: 'watch', tone: 'watch', color: COL.watch, max: max };
    return { key: 'central', tone: 'high', color: COL.high, max: max };
  }

  function indicator(profile) {
    var bmi = bmiOf(profile.weight, profile.height);
    var heightM = (profile.height || 0) / 100;
    var whtr = heightM ? r2((profile.waist || 0) / profile.height) : null;
    var whr = profile.hip ? r2((profile.waist || 0) / profile.hip) : null;
    return {
      bmi: bmi,
      bmiStatus: bmiStatus(bmi),
      bodyFat: bodyFat(profile),
      waist: profile.waist,
      waistStatus: waistStatus(profile),
      whtr: whtr,
      whtrStatus: whtr == null ? { tone: 'neutral' } : (whtr <= 0.5 ? { tone: 'good', color: COL.good } : (whtr <= 0.55 ? { tone: 'watch', color: COL.watch } : { tone: 'high', color: COL.high })),
      whr: whr,
      whrStatus: whr == null ? { tone: 'neutral' } : (
        profile.sex === 'male'
          ? (whr < 0.9 ? { tone: 'good', color: COL.good } : (whr < 1 ? { tone: 'watch', color: COL.watch } : { tone: 'high', color: COL.high }))
          : (whr < 0.85 ? { tone: 'good', color: COL.good } : (whr < 0.9 ? { tone: 'watch', color: COL.watch } : { tone: 'high', color: COL.high }))
      ),
      idealWeight: heightM ? { min: r1(18.5 * heightM * heightM), max: r1(24.9 * heightM * heightM) } : null
    };
  }

  /* ------------------------------------------------------------------ */
  /* 2. Biomarqueurs                                                    */
  /* ------------------------------------------------------------------ */
  function toMmol(value, unit) {
    if (value == null) return null;
    return String(unit).toLowerCase() === 'mgdl' ? r2(value / 18.0) : Number(value);
  }

  function vitals(profile) {
    var gl = toMmol(profile.glucose, profile.glucoseUnit);
    var glStatus;
    if (gl == null) glStatus = { key: 'unknown', tone: 'neutral' };
    else if (gl < 3.9) glStatus = { key: 'low', tone: 'watch', color: COL.watch };
    else if (gl <= 5.5) glStatus = { key: 'optimal', tone: 'good', color: COL.good };
    else if (gl <= 6.9) glStatus = { key: 'prediabetes', tone: 'watch', color: COL.watch };
    else glStatus = { key: 'diabetes', tone: 'high', color: COL.high };

    var a1c = profile.hba1c;
    var a1cStatus = a1c == null ? { key: 'unknown', tone: 'neutral' }
      : a1c < 5.7 ? { key: 'optimal', tone: 'good', color: COL.good }
        : a1c < 6.5 ? { key: 'prediabetes', tone: 'watch', color: COL.watch }
          : { key: 'diabetes', tone: 'high', color: COL.high };

    var sys = profile.sys, dia = profile.dia;
    var bpStatus = (sys == null || dia == null) ? { key: 'unknown', tone: 'neutral' }
      : (sys < 120 && dia < 80) ? { key: 'optimal', tone: 'good', color: COL.good }
        : (sys < 140 && dia < 90) ? { key: 'elevated', tone: 'watch', color: COL.watch }
          : { key: 'hypertension', tone: 'high', color: COL.high };

    var chol = profile.chol;
    var cholStatus = chol == null ? { key: 'unknown', tone: 'neutral' }
      : chol < 5.0 ? { key: 'optimal', tone: 'good', color: COL.good }
        : chol < 6.2 ? { key: 'elevated', tone: 'watch', color: COL.watch }
          : { key: 'high', tone: 'high', color: COL.high };

    var creat = profile.creatinine;
    /* eGFR simplifiée (CKD-EPI 2009, femme/homme). */
    var egfr = null;
    if (creat && profile.age && profile.sex) {
      var k = profile.sex === 'female' ? 0.7 : 0.9;
      var a = profile.sex === 'female' ? -0.329 : -0.411;
      var ratio = creat / 88.4 / k;
      egfr = Math.round(141 * Math.pow(Math.min(ratio, 1), a) * Math.pow(Math.max(ratio, 1), -1.209) * Math.pow(0.993, profile.age) * (profile.sex === 'female' ? 1.018 : 1));
    }

    return {
      glucose: gl,
      glucoseUnit: 'mmol',
      glucoseStatus: glStatus,
      hba1c: a1c,
      hba1cStatus: a1cStatus,
      sys: sys, dia: dia, bpStatus: bpStatus,
      chol: chol, cholStatus: cholStatus,
      egfr: egfr,
      egfrStatus: egfr == null ? { tone: 'neutral' } : (egfr >= 90 ? { tone: 'good', color: COL.good } : egfr >= 60 ? { tone: 'watch', color: COL.watch } : { tone: 'high', color: COL.high })
    };
  }

  /* ------------------------------------------------------------------ */
  /* 3. Énergie                                                         */
  /* ------------------------------------------------------------------ */
  function activityFactor(level) {
    var found = null;
    (D.ACTIVITY_LEVELS || []).forEach(function (a) { if (a.key === level) found = a; });
    return found || { key: 'moderate', factor: 1.55 };
  }

  function energy(profile) {
    var w = profile.weight || 0, h = profile.height || 0, age = profile.age || 30;
    /* Mifflin-St Jeor */
    var bmr = 10 * w + 6.25 * h - 5 * age + (profile.sex === 'male' ? 5 : -161);
    bmr = Math.max(900, Math.round(bmr));
    var act = activityFactor(profile.activity);
    var tdee = Math.round(bmr * act.factor);
    /* Ajustement selon l'objectif */
    var targetDelta = { balance: 0, weight: -350, energy: 150, maternal: 250, performance: 300, ncd: -150 }[profile.goal] || 0;
    var target = Math.round(tdee + targetDelta);
    var protein = Math.round(w * (profile.goal === 'performance' ? 1.6 : profile.goal === 'weight' ? 1.4 : 1.1));
    var fiber = Math.round((target / 1000) * 14);
    return {
      bmr: bmr,
      tdee: tdee,
      target: target,
      delta: targetDelta,
      activity: act,
      proteinTarget: protein,
      fiberTarget: fiber,
      waterTarget: Math.round(clamp(w * 35 / 250, 6, 12)),
      fatMax: Math.round((target * 0.3) / 9),
      carbRange: [Math.round((target * 0.45) / 4), Math.round((target * 0.60) / 4)]
    };
  }

  /* ------------------------------------------------------------------ */
  /* 4. Scores                                                          */
  /* ------------------------------------------------------------------ */
  function planDayTotals(day) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, iron: 0, vitA: 0, vitC: 0, calcium: 0, sodium: 0, gi: 0, cost: 0 };
    if (!day) return t;
    Object.keys(day.meals || {}).forEach(function (slot) {
      (day.meals[slot] || []).forEach(function (item) {
        var f = D.FOODS[item.id];
        if (!f) return;
        var q = item.portion || 1;
        t.kcal += f.kcal * q;
        t.protein += f.protein * q;
        t.carbs += f.carbs * q;
        t.fat += f.fat * q;
        t.fiber += f.fiber * q;
        t.iron += f.iron * q;
        t.vitA += f.vitA * q;
        t.vitC += f.vitC * q;
        t.calcium += f.calcium * q;
        t.sodium += f.sodium * q;
        t.gi += f.gi * q;
        t.cost += (D.COSTS && D.COSTS[item.id]) || 0;
      });
    });
    Object.keys(t).forEach(function (k) { t[k] = r1(t[k]); });
    return t;
  }

  function scores(profile, habits, plan, energyObj) {
    var e = energyObj || energy(profile);
    var ind = indicator(profile);
    var vit = vitals(profile);

    /* --- Nutrition : fibres, sucres libres, diversité, sodium --- */
    var fiberRatio = clamp((habits.fiber || 0) / (e.fiberTarget || 25), 0, 1.3);
    var sugarPenalty = clamp(((habits.sugary || 0) - 1) * 8, 0, 40);
    var diversity = clamp((habits.veggies || 0) / (habits.veggiesGoal || 5), 0, 1.2);
    var saltPenalty = clamp(((habits.salt || 0) - 1) * 6, 0, 30);
    var nutritionHabits = clamp(Math.round(40 * fiberRatio + 32 * diversity + 28 - sugarPenalty - saltPenalty), 14, 100);
    var nutrition = nutritionHabits;
    if (plan && plan.micros && plan.micros.length) {
      /* Un plan généré et respecté améliore la lecture nutritionnelle :
         couverture micronutritionnelle moyenne, plafonnée à 100. */
      var cov = plan.micros.reduce(function (a, m) { return a + clamp(m.coverage, 0, 100); }, 0) / plan.micros.length;
      nutrition = clamp(Math.round(nutritionHabits * 0.62 + cov * 0.38), 5, 100);
    }

    /* --- Métabolisme : IMC, tour de taille, glycémie, tension --- */
    var bmiScore = ind.bmi == null ? 60 : clamp(100 - Math.abs(ind.bmi - 22) * 9, 10, 100);
    var waistScore = { good: 100, watch: 72, high: 35, neutral: 65 }.hasOwnProperty(ind.waistStatus.tone) ? { good: 100, watch: 72, high: 35, neutral: 65 }[ind.waistStatus.tone] : 65;
    var glScore = { optimal: 100, low: 70, prediabetes: 55, diabetes: 25, unknown: 70 }[vit.glucoseStatus.key] || 70;
    var bpScore = { optimal: 100, elevated: 62, hypertension: 28, unknown: 72 }[vit.bpStatus.key] || 72;
    var metabolic = clamp(Math.round(bmiScore * 0.32 + waistScore * 0.22 + glScore * 0.26 + bpScore * 0.2), 5, 100);

    /* --- Activité : pas + minutes --- */
    var stepScore = clamp((habits.steps || 0) / (habits.stepsGoal || 8000), 0, 1.4);
    var minScore = clamp((habits.activityMin || 0) / (habits.activityGoal || 30), 0, 1.4);
    var activity = clamp(Math.round((stepScore * 0.6 + minScore * 0.4) * 100), 2, 100);

    /* --- Hydratation --- */
    var hydration = clamp(Math.round(((habits.water || 0) / (habits.waterGoal || 8)) * 100), 0, 100);

    var global = Math.round(nutrition * 0.32 + metabolic * 0.34 + activity * 0.2 + hydration * 0.14);
    var band = global >= 85 ? 'excellent' : global >= 70 ? 'good' : global >= 55 ? 'watch' : 'risk';

    /* Adhérence alimentaire réelle si un plan existe. */
    var adherence = null;
    if (plan && plan.days && plan.days.length) {
      var done = 0, total = 0;
      plan.days.forEach(function (d) {
        Object.keys(d.meals || {}).forEach(function (slot) { total += 1; if (d.eaten && d.eaten[slot]) done += 1; });
      });
      adherence = total ? Math.round((done / total) * 100) : 0;
    }

    return {
      global: global, band: band, nutrition: nutrition, metabolic: metabolic,
      activity: activity, hydration: hydration, adherence: adherence,
      parts: [
        { key: 'nutrition', value: nutrition, color: COL.good },
        { key: 'metabolic', value: metabolic, color: '#1f7ae0' },
        { key: 'activity', value: activity, color: '#8b5cf6' },
        { key: 'hydration', value: hydration, color: '#0ea5b7' }
      ]
    };
  }

  /* ------------------------------------------------------------------ */
  /* 5. Signaux de prévention                                           */
  /* ------------------------------------------------------------------ */
  function risks(profile, habits) {
    var ind = indicator(profile);
    var vit = vitals(profile);
    var bmiF = clamp(((ind.bmi || 22) - 22) / 12, 0, 1);
    var waistF = clamp((((profile.waist || 0) - (profile.sex === 'male' ? 84 : 72)) / 28), 0, 1);
    var glF = clamp((((vit.glucose || 5) - 4.6) / 3.4), 0, 1);
    var bpF = clamp((((profile.sys || 115) - 112) / 40), 0, 1);
    var sugarF = clamp(((habits.sugary || 0) - 1) / 6, 0, 1);
    var fiberF = clamp(1 - (habits.fiber || 0) / 30, 0, 1);
    var saltF = clamp(((habits.salt || 0) - 1) / 4, 0, 1);
    var actF = clamp(1 - (habits.steps || 0) / 9000, 0, 1);
    var cholF = clamp((((profile.chol || 4.4) - 4.2) / 3), 0, 1);
    var ironF = clamp((((profile.sex === 'female' ? 16 : 10) - (habits.fiber || 0) * 0.9) / 14), 0, 1);
    var underF = clamp((18.5 - (ind.bmi || 20)) / 5, 0, 1);

    function pack(key, p, factorKey, factorVal, horizon) {
      var band = p >= 0.62 ? 'high' : p >= 0.34 ? 'moderate' : 'low';
      return {
        key: key, value: Math.round(clamp(p, 0.03, 0.96) * 100) / 100, band: band,
        color: band === 'high' ? COL.high : band === 'moderate' ? COL.watch : COL.good,
        factorKey: factorKey, factorValue: Math.round(factorVal * 100),
        horizon: horizon
      };
    }

    return [
      pack('diabetes', 0.06 + glF * 0.5 + bmiF * 0.26 + sugarF * 0.14 + fiberF * 0.08 + actF * 0.06, 'czd.kpi.glucose', glF, { fr: '3 – 6 ans', en: '3 – 6 years' }),
      pack('hypertension', 0.04 + bpF * 0.52 + saltF * 0.2 + bmiF * 0.16 + actF * 0.08, 'czd.kpi.bp', bpF, { fr: '2 – 5 ans', en: '2 – 5 years' }),
      pack('cvd', 0.05 + (bmiF * 0.24 + waistF * 0.2 + cholF * 0.24 + bpF * 0.18 + actF * 0.14), 'czd.kpi.waist', waistF, { fr: '5 – 10 ans', en: '5 – 10 years' }),
      pack('anemia', 0.05 + ironF * 0.55 + fiberF * 0.18 + (profile.sex === 'female' ? 0.1 : 0), 'czd.kpi.fiber', fiberF, { fr: '3 – 6 mois', en: '3 – 6 months' }),
      pack('undernutrition', 0.04 + underF * 0.7 + actF * 0.1, 'czd.kpi.bmi', underF, { fr: '6 – 12 mois', en: '6 – 12 months' })
    ];
  }

  /* ------------------------------------------------------------------ */
  /* 6. Priorités du jour                                               */
  /* ------------------------------------------------------------------ */
  function priorities(profile, habits, plan) {
    var out = [];
    var watersLeft = Math.max(0, (habits.waterGoal || 8) - (habits.water || 0));
    if (watersLeft > 0) {
      out.push({ key: 'hydrate', icon: '💧', n: watersLeft, cta: 'water', tone: 'blue' });
    } else {
      out.push({ key: 'hydrate.done', icon: '💧', n: 0, cta: 'water', tone: 'good' });
    }
    var stepsLeft = Math.max(0, (habits.stepsGoal || 8000) - (habits.steps || 0));
    if (stepsLeft > 0) out.push({ key: 'walk', icon: '👟', n: Math.round(stepsLeft / 100) * 100, cta: 'steps', tone: 'violet' });
    else out.push({ key: 'walk.done', icon: '👟', n: 0, cta: 'steps', tone: 'good' });

    var vegLeft = Math.max(0, (habits.veggiesGoal || 5) - (habits.veggies || 0));
    if (vegLeft > 0) out.push({ key: 'veggies', icon: '🥦', n: vegLeft, cta: 'meal', tone: 'green' });
    else out.push({ key: 'veggies.done', icon: '🥦', n: 0, cta: 'meal', tone: 'good' });

    if ((habits.sugary || 0) >= 4) out.push({ key: 'sugar', icon: '🍬', n: (habits.sugary || 0) - 1, cta: 'meal', tone: 'amber' });
    if ((habits.salt || 0) >= 3) out.push({ key: 'salt', icon: '🧂', n: (habits.salt || 0) - 1, cta: 'meal', tone: 'amber' });
    if ((habits.fiber || 0) < 20) out.push({ key: 'fiber', icon: '🌾', n: 0, cta: 'plan', tone: 'green' });
    if ((habits.sleep || 7) < 7) out.push({ key: 'sleep', icon: '😴', n: 0, cta: 'learn', tone: 'violet' });
    if ((habits.protein || 0) < 50) out.push({ key: 'protein', icon: '🐟', n: 0, cta: 'plan', tone: 'blue' });

    var vit = vitals(profile);
    if (vit.glucoseStatus.tone !== 'good') out.push({ key: 'screen', icon: '🩺', n: 0, cta: 'learn', tone: 'red' });
    if (out.length < 3) out.push({ key: 'consult', icon: '👩🏾‍⚕️', n: 0, cta: 'learn', tone: 'violet' });

    return out.slice(0, 3);
  }

  /* ------------------------------------------------------------------ */
  /* 7. Plan 7 jours                                                    */
  /* ------------------------------------------------------------------ */
  function mealKcal(ids) {
    return ids.reduce(function (a, id) { var f = D.FOODS[id]; return a + (f ? f.kcal : 0); }, 0);
  }

  function pickVariant(matrixRow, targetKcal, slot, rnd) {
    /* Ajuste la portion des aliments énergétiques pour approcher la cible. */
    return (matrixRow[slot] || []).map(function (id) {
      return { id: id, portion: 1 };
    });
  }

  function buildPlan(profile, habits, opts) {
    opts = opts || {};
    var e = energy(profile);
    var sliceTarget = {
      breakfast: Math.round(e.target * 0.25),
      lunch: Math.round(e.target * 0.35),
      dinner: Math.round(e.target * 0.3),
      snack: Math.round(e.target * 0.1)
    };
    var rotation = opts.seed ? D.seedFrom(opts.seed) : D.seedFrom(profile.name + profile.goal + (profile.country || 'TG'));
    var rnd = D.rng(rotation);
    var goalShift = { weight: 0, energy: 1, performance: 2, maternal: 3, ncd: 4, balance: 0 }[profile.goal] || 0;
    var days = [];

    for (var d = 0; d < 7; d++) {
      var row = D.PLAN_MATRIX[(d + goalShift) % D.PLAN_MATRIX.length];
      var meals = {}, eaten = {};
      D.MEAL_SLOTS.forEach(function (slot) {
        var items = pickVariant(row, sliceTarget[slot], slot, rnd);
        /* Ajustement des portions : on module l'aliment le plus énergétique du
           créneau (entre 0,6 et 1,6 portion) pour approcher la cible du repas.
           Aucun aliment n'est supprimé : la diversité est préservée. */
        var total = items.reduce(function (a, it) { return a + D.FOODS[it.id].kcal * it.portion; }, 0);
        if (items.length) {
          var sorted = items.slice().sort(function (a, b) { return D.FOODS[b.id].kcal - D.FOODS[a.id].kcal; });
          var main = sorted[0];
          var others = total - D.FOODS[main.id].kcal * main.portion;
          var wanted = clamp((sliceTarget[slot] - others) / D.FOODS[main.id].kcal, 0.6, 1.6);
          main.portion = Math.round(wanted * 10) / 10;
        }
        meals[slot] = items;
        eaten[slot] = false;
      });
      days.push({
        index: d,
        meals: meals,
        eaten: eaten,
        totals: planDayTotals({ meals: meals })
      });
    }

    var plan = {
      days: days,
      target: e.target,
      sliceTarget: sliceTarget,
      energy: e,
      createdAt: Date.now(),
      seed: rotation
    };
    plan.micros = microCoverage(plan);
    plan.shopping = shoppingList(plan);
    return plan;
  }

  function glycemicLoad(day) {
    if (!day) return 0;
    /* CL = Σ (glucides disponibles d'un aliment × IG de cet aliment / 100).
       Les glucides disponibles sont estimés à 92 % des glucides totaux. */
    var gl = 0;
    Object.keys(day.meals || {}).forEach(function (slot) {
      (day.meals[slot] || []).forEach(function (item) {
        var f = D.FOODS[item.id];
        if (!f) return;
        gl += f.carbs * 0.92 * (f.gi / 100) * (item.portion || 1);
      });
    });
    return Math.round(gl);
  }

  function microCoverage(plan) {
    var totals = { fiber: 0, protein: 0, iron: 0, vitA: 0, vitC: 0, calcium: 0 };
    (plan.days || []).forEach(function (day) {
      var t = day.totals || planDayTotals(day);
      Object.keys(totals).forEach(function (k) { totals[k] += t[k] || 0; });
    });
    var n = (plan.days || []).length || 1;
    return (D.MICROS || []).map(function (m) {
      var avg = totals[m.key] / n;
      return {
        key: m.key, labelKey: m.labelKey, unit: m.unit, rda: m.rda, color: m.color,
        value: r1(avg),
        coverage: clamp(Math.round((avg / m.rda) * 100), 0, 130),
        gap: r1(Math.max(0, m.rda - avg))
      };
    });
  }

  function shoppingList(plan) {
    var groups = {};
    var seen = {};
    (plan.days || []).forEach(function (day) {
      D.MEAL_SLOTS.forEach(function (slot) {
        (day.meals[slot] || []).forEach(function (item) {
          if (seen[item.id]) return;
          seen[item.id] = true;
          var g = (D.GROCERY_GROUPS && D.GROCERY_GROUPS[item.id]) || 'other';
          if (!groups[g]) groups[g] = [];
          groups[g].push({ id: item.id, name: D.FOODS[item.id].name, icon: D.FOODS[item.id].icon });
        });
      });
    });
    return groups;
  }

  /* ------------------------------------------------------------------ */
  /* 8. Enfant                                                          */
  /* ------------------------------------------------------------------ */
  function childAnalysis(childId) {
    var c = D.CHILD_REFS[childId] || D.CHILD_REFS.child1;
    var curve = D.CHILD_CURVES[c.sex] || D.CHILD_CURVES.female;
    var median = null;
    curve.forEach(function (p) { if (p[0] === c.age) median = p[1]; });
    var z = median ? r1((c.bmi - median) / 1.1) : 0;
    var band = z > 1.2 ? 'watch' : z < -1.5 ? 'high' : 'good';
    var diversityMax = 6;
    return {
      id: childId,
      ref: c,
      median: median,
      zscore: z,
      band: band,
      diversity: c.diversity,
      diversityMax: diversityMax,
      diversityPct: Math.round((c.diversity / diversityMax) * 100),
      points: c.points.map(function (p) { return { age: p[0], bmi: p[1], ref: (curve.filter(function (x) { return x[0] === p[0]; })[0] || [0, p[1]])[1] }; }),
      curve: curve.map(function (p) { return { age: p[0], bmi: p[1] }; }),
      alerts: c.alerts
    };
  }

  /* ------------------------------------------------------------------ */
  /* 9. Lecture clinique                                                */
  /* ------------------------------------------------------------------ */
  function clinicalNotes(profile, habits) {
    var vit = vitals(profile);
    var ind = indicator(profile);
    var e = energy(profile);
    var out = [];
    if (ind.bmi != null && (ind.bmi < 18.5 || ind.bmi >= 25)) {
      out.push({ tone: 'watch', key: 'bmi', textKey: 'czd.clin.note.bmi', params: { v: String(ind.bmi).replace('.', ',') } });
    }
    if (ind.waistStatus.tone !== 'good' && ind.waistStatus.tone !== 'neutral') {
      out.push({ tone: 'watch', key: 'waist', textKey: 'czd.clin.note.waist', params: { v: profile.waist, max: ind.waistStatus.max } });
    }
    if (vit.glucoseStatus.tone !== 'good' && vit.glucoseStatus.tone !== 'neutral') {
      out.push({ tone: 'high', key: 'glucose', textKey: 'czd.clin.note.glucose', params: { v: vit.glucose } });
    }
    if (vit.bpStatus.tone !== 'good' && vit.bpStatus.tone !== 'neutral') {
      out.push({ tone: 'high', key: 'bp', textKey: 'czd.clin.note.bp', params: { v: (profile.sys || 0) + '/' + (profile.dia || 0) } });
    }
    if (vit.chol != null && vit.cholStatus.tone !== 'good') {
      out.push({ tone: 'watch', key: 'chol', textKey: 'czd.clin.note.chol', params: { v: vit.chol } });
    }
    if ((habits.water || 0) < (habits.waterGoal || 8) * 0.8) {
      out.push({ tone: 'info', key: 'hydration', textKey: 'czd.clin.note.hydration', params: { n: e.waterTarget } });
    }
    if ((habits.activityMin || 0) < 30) {
      out.push({ tone: 'info', key: 'activity', textKey: 'czd.clin.note.activity', params: {} });
    }
    if (!out.length) out.push({ tone: 'good', key: 'normal', textKey: 'czd.clin.note.normal', params: {} });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 10. Score nutrition d'un aliment (pour la colorisation)             */
  /* ------------------------------------------------------------------ */
  function foodScore(food) {
    if (!food) return 0;
    var positive = food.fiber * 2 + food.protein * 0.4 + food.vitA / 120 + food.vitC / 12 + food.iron * 1.2;
    var negative = food.sodium / 120 + food.fat * 0.15 + food.gi / 30;
    return Math.round(clamp(positive - negative + 40, 5, 100));
  }

  global.CZD_MODEL = {
    clamp: clamp,
    round1: r1,
    COL: COL,
    bmiOf: bmiOf,
    bmiStatus: bmiStatus,
    bodyFat: bodyFat,
    waistStatus: waistStatus,
    indicator: indicator,
    vitals: vitals,
    activityFactor: activityFactor,
    energy: energy,
    planDayTotals: planDayTotals,
    scores: scores,
    risks: risks,
    priorities: priorities,
    buildPlan: buildPlan,
    glycemicLoad: glycemicLoad,
    microCoverage: microCoverage,
    shoppingList: shoppingList,
    childAnalysis: childAnalysis,
    clinicalNotes: clinicalNotes,
    foodScore: foodScore,
    toMmol: toMmol
  };
})(window);
