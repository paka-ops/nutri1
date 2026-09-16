/* ============================================================================
   NUTRI.N°1 — SECTION SANTÉ (v59) · MODÈLES ANALYTIQUES
   ---------------------------------------------------------------------------
   window.NUTRI_HEALTH_MODELS — fonctions PURES (aucun DOM) réutilisables :
     prévision d'indicateurs, simulation de dépistage/prise en charge,
     attribution des risques alimentaires (fractions attribuables), catalogue
     d'interventions, optimisation budgétaire, cascade de soins, Monte-Carlo,
     sensibilité, comparaison régionale et note de décision.

   Tous les coefficients sont des paramètres de DÉMONSTRATION modélisés
   (ordres de grandeur publiés : OMS, IHME/GBD, Banque mondiale). Ils sont
   réglables et doivent être recalibrés sur les données nationales.
   ========================================================================== */
(function (w) {
  'use strict';
  if (w.NUTRI_HEALTH_MODELS) return;
  const NX = w.NX;
  const S = NX.stats, f = NX.fmt;
  const clamp = NX.clamp;

  /* ------------------------------------------------------------ indicateurs */
  const METRICS = {
    stunting: { fr: 'Retard de croissance', en: 'Stunting', unit: '%', dir: 'down', floor: 2, ceil: 60, anchor: 15 },
    wasting: { fr: 'Émaciation aiguë', en: 'Wasting', unit: '%', dir: 'down', floor: 1, ceil: 30, anchor: 5 },
    anaemia: { fr: 'Anémie (femmes)', en: 'Anaemia (women)', unit: '%', dir: 'down', floor: 4, ceil: 75, anchor: 15 },
    exclusiveBF: { fr: 'Allaitement exclusif', en: 'Exclusive breastfeeding', unit: '%', dir: 'up', floor: 5, ceil: 95, anchor: 70 },
    diabetes: { fr: 'Diabète', en: 'Diabetes', unit: '%', dir: 'down', floor: 1, ceil: 30, anchor: 8 },
    hypertension: { fr: 'Hypertension', en: 'Hypertension', unit: '%', dir: 'down', floor: 5, ceil: 55, anchor: 25 },
    obesity: { fr: 'Obésité', en: 'Obesity', unit: '%', dir: 'down', floor: 1, ceil: 40, anchor: 10 },
    screening: { fr: 'Dépistage NCD', en: 'NCD screening', unit: '%', dir: 'up', floor: 2, ceil: 98, anchor: 70 },
    ncdShare: { fr: 'Part des décès NCD', en: 'NCD share of deaths', unit: '%', dir: 'down', floor: 10, ceil: 80, anchor: 30 },
    dalysPer100k: { fr: 'DALY / 100 000 hab.', en: 'DALYs / 100,000', unit: '', dir: 'down', floor: 2000, ceil: 60000, anchor: 12000 }
  };

  /* ------------------------------------------------------------ scénarios */
  const SCENARIOS = {
    baseline: { fr: 'Tendance actuelle', en: 'Current trend', factor: 0 },
    prevention: { fr: 'Plan national de prévention', en: 'National prevention plan', factor: 1 },
    accelerated: { fr: 'Adoption accélérée', en: 'Accelerated adoption', factor: 1.6 },
    inaction: { fr: 'Inaction', en: 'Inaction', factor: -1 }
  };

  /**
   * Prévision d'un indicateur (série d'histoire + scénario).
   * Le scénario modifie la pente future : `factor` accélère les progrès
   * (indicateurs « dir: down ») ou les freine (valeur négative).
   */
  function forecast(ds, cfg) {
    const c = Object.assign({ metric: 'stunting', horizon: 10, scenario: 'baseline', plan: null, confidence: .8 }, cfg || {});
    const m = METRICS[c.metric] || METRICS.stunting;
    const key = c.metric === 'anaemia' ? 'anaemia' : c.metric;
    const series = (ds.history[key] || ds.history.stunting).slice();
    const h = Math.max(1, c.horizon | 0);
    const fc = S.forecast(series, h, { damped: true });
    const bt = S.backtest(series, { holdout: Math.min(4, Math.max(2, series.length - 6)) });
    const sc = SCENARIOS[c.scenario] || SCENARIOS.baseline;
    const intensity = c.plan ? clamp(c.plan.intensity == null ? .5 : c.plan.intensity, 0, 1) : 0;
    const strength = sc.factor * (.012 + intensity * .026);        // 1,2 % à 3,8 % par an
    const last = series[series.length - 1];
    const adj = (i, v) => {
      const years = i + 1;
      const drive = m.dir === 'up' ? 1 : -1;
      const target = last + drive * Math.abs(last - m.anchor) * .5;     // direction souhaitable
      const pull = (target - last) * Math.min(1, years * .06) * strength;
      const floor = m.floor, ceil = m.ceil;
      return clamp(v + pull, floor, ceil);
    };
    const point = fc.point.map((v, i) => adj(i, v));
    const lo = fc.lo80.map((v, i) => clamp(Math.min(v, point[i]), m.floor, m.ceil));
    const hi = fc.hi80.map((v, i) => clamp(Math.max(v, point[i]), m.floor, m.ceil));
    const histTail = series.slice(-Math.min(6, series.length));
    const labels = ds.history.years.slice(-Math.min(6, series.length)).map(String)
      .concat(Array.from({ length: h }, (_, i) => String(ds.year + i + 1)));
    const yearsFuture = Array.from({ length: h }, (_, i) => ds.year + i + 1);
    const gapToTarget = (function () {
      const t = ds.targets && ds.targets[c.metric];
      if (!t || t.target == null) return null;
      const v = point[point.length - 1];
      return { target: t.target, value: v, reached: m.dir === 'up' ? v >= t.target : v <= t.target, yearsToTarget: (function () {
        const perYear = (point[point.length - 1] - last) / h;
        if (!perYear) return null;
        const need = t.target - last;
        const n = need / perYear;
        return n >= 0 && n <= 40 && isFinite(n) ? Math.ceil(n) : null;
      })() };
    })();
    return {
      metric: c.metric, def: m, scenario: c.scenario, scenarioLabel: sc,
      historyYears: ds.history.years.slice(-histTail.length), history: histTail,
      forecastYears: yearsFuture, point, lo, hi, labels, gapToTarget,
      diagnostics: { mape: bt.mape, mae: bt.mae, r2: bt.r2, bias: bt.bias, trendPct: last ? ((point[point.length - 1] - last) / last) * 100 : 0 },
      target: ds.targets && ds.targets[c.metric] ? ds.targets[c.metric].target : null
    };
  }

  /* -------------------------------------------------- leviers d'intervention */
  /* Unité de coût = USD par habitant et par an (hors coûts fixes nationaux). */
  const LEVERS = [
    { k: 'screening', fr: 'Dépistage NCD communautaire', en: 'Community NCD screening', cost: .45, group: 'depistage', evidence: 'fort' },
    { k: 'treatment', fr: 'Observance & contrôle tension/glucose', en: 'Adherence & BP/glucose control', cost: .70, group: 'soins', evidence: 'fort' },
    { k: 'salt', fr: 'Réduction du sel (reformulation + éducation)', en: 'Salt reduction (reformulation + education)', cost: .06, group: 'alimentation', evidence: 'fort' },
    { k: 'sugar', fr: 'Réduction des sucres libres (taxation, boissons)', en: 'Free-sugar reduction (taxation, drinks)', cost: .05, group: 'alimentation', evidence: 'fort' },
    { k: 'labels', fr: 'Étiquetage nutritionnel & marketing', en: 'Nutrition labelling & marketing rules', cost: .08, group: 'alimentation', evidence: 'moyen' },
    { k: 'breastfeeding', fr: 'Promotion de l’allaitement exclusif', en: 'Exclusive breastfeeding promotion', cost: .30, group: 'mère-enfant', evidence: 'fort' },
    { k: 'complementary', fr: 'Alimentation de complément 6–23 mois', en: 'Complementary feeding 6–23 months', cost: .55, group: 'mère-enfant', evidence: 'fort' },
    { k: 'fortification', fr: 'Fortification & supplémentation micronutriments', en: 'Fortification & micronutrient supplementation', cost: .25, group: 'mère-enfant', evidence: 'fort' },
    { k: 'activity', fr: 'Activité physique & environnement urbain', en: 'Physical activity & urban environment', cost: .18, group: 'prevention', evidence: 'moyen' },
    { k: 'tobacco', fr: 'Lutte anti-tabac & alcool', en: 'Tobacco & alcohol control', cost: .07, group: 'prevention', evidence: 'fort' },
    { k: 'schoolMeals', fr: 'Cantines scolaires & fruits à l’école', en: 'School meals & fruit at school', cost: 1.10, group: 'mère-enfant', evidence: 'moyen' },
    { k: 'community', fr: 'Agents de santé communautaire & données', en: 'Community health workers & data', cost: .65, group: 'systeme', evidence: 'moyen' }
  ];
  function defaultLevers() { const o = {}; LEVERS.forEach(l => o[l.k] = 0); return o; }
  function allLevers(v) { const o = {}; LEVERS.forEach(l => o[l.k] = v == null ? .5 : v); return o; }

  /* -------------------------------------------------- simulation plan santé */
  /**
   * Simule un plan de prévention / prise en charge.
   * lev : intensité 0→1 par levier (cf. LEVERS).
   * Renvoie l'impact sanitaire, le coût, la rentabilité et l'équité.
   */
  function screeningSim(ds, lev) {
    const L = Object.assign(defaultLevers(), lev || {});
    const t = ds.totals, n = ds.nutrition, k = ds.ncd, s = ds.services;
    /* Facteur de mise en œuvre : un programme national n'atteint jamais 100 %
       de son effet théorique (adhésion, ruptures de stock, suivi). */
    const DELIVERY = .38;
    const adults35 = t.population * .42;                        // population cible du dépistage
    const prevalence = (k.diabetes + k.hypertension * .62) / 100;
    const cases = adults35 * prevalence;                        // cas prévalents attendus

    /* --- couverture : dépistage + agents communautaires ------------------- */
    const coverageBase = s.screening / 100;
    const coverage = clamp(coverageBase + (1 - coverageBase) * (L.screening * .5 + L.community * .22), 0, .97);

    /* --- cascade : dépistés → cas détectés → traités → contrôlés ---------- */
    const screened = adults35 * coverage;
    const detection = clamp(.62 + L.treatment * .06 + L.community * .04, 0, .95);
    const detected = Math.min(cases, screened * prevalence * detection);
    const treated = detected * clamp(.58 + L.treatment * .3 + L.community * .07, 0, .96);
    const controlled = treated * clamp(.44 + L.treatment * .34 + L.community * .06, 0, .9);
    const uncontrolled = treated - controlled;

    /* --- événements évités (par an, à couverture stabilisée) -------------- */
    const complRate = .024;                                     // complications majeures / patient non contrôlé / an
    const complicationsAvoided = (uncontrolled * complRate + detected * .01) * DELIVERY;
    const deathsAvoided = (complicationsAvoided * .22 + controlled * .0038) * DELIVERY;
    const careDalys = (complicationsAvoided * 6.4 + deathsAvoided * 21 + uncontrolled * .16) * DELIVERY;

    /* --- nutrition mère & enfant ------------------------------------------ */
    const stuntingGain = n.stunting * (L.breastfeeding * .09 + L.complementary * .14 + L.fortification * .06 + L.schoolMeals * .03 + L.community * .04);
    const anaemiaGain = n.anaemiaWomen * (L.fortification * .22 + L.complementary * .09 + L.breastfeeding * .04 + L.schoolMeals * .05);
    const childDalys = ((stuntingGain / 100) * t.under5 * 4.2 + (anaemiaGain / 100) * t.women1549 * .35) * DELIVERY;

    /* --- charge évitée liée à l'alimentation (NCD) ------------------------ */
    const dietWeight = { salt: 1.35, sugar: 1.15, labels: .5, activity: .8, tobacco: .9 };
    const dietDalys = ds.burden.dalys * .06 * Object.keys(dietWeight)
      .reduce((a, key) => a + (L[key] || 0) * dietWeight[key], 0) / 4.7 * DELIVERY;

    const totalDalys = careDalys + childDalys + dietDalys;

    /* --- coûts & rentabilité ---------------------------------------------- */
    const perCapita = LEVERS.reduce((a, l) => a + (L[l.k] || 0) * l.cost, 0);
    const cost = perCapita * t.population;
    const benefit = totalDalys * ds.profile.gdp * 1.6;          // valeur d'un DALY évité ≈ 1,6 PIB/hab (seuil OMS)
    const flows = [];
    for (let i = 0; i <= 10; i++) flows.push(i === 0 ? -cost * .6 : (benefit * (1 - Math.pow(.96, i)) - cost * .4 / 10));
    const npv = (function () { let v = 0; flows.forEach((x, i) => { v += x / Math.pow(1.09, i); }); return v; })();
    const bcr = cost > 0 ? benefit / cost : 0;
    const irr = (function () {
      let lo = -0.6, hi = 4;
      const npvAt = (r) => flows.reduce((a, x, i) => a + x / Math.pow(1 + r, i), 0);
      if (npvAt(lo) * npvAt(hi) > 0) return NaN;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; (npvAt(lo) * npvAt(mid) <= 0) ? hi = mid : lo = mid; }
      return (lo + hi) / 2;
    })();
    let cum = -cost * .6, payback = null;
    flows.forEach((x, i) => { if (i) { cum += x; if (payback == null && cum >= 0) payback = i; } });
    const jobs = Math.round(L.community * t.population / 4200 + L.screening * t.population / 12000 + L.schoolMeals * t.under5 / 900);
    const equity = clamp(.35 + L.community * .3 + L.screening * .18 + L.schoolMeals * .1, 0, 1);

    return {
      levers: L, coverage, screened, cases, detected, diagnosed: detected, treated, controlled, uncontrolled,
      complicationsAvoided, deathsAvoided, dalysAvoided: totalDalys,
      dalysFromCare: careDalys, dalysFromNutrition: childDalys, dalysFromDiet: dietDalys,
      stuntingGain, anaemiaGain,
      stuntingAfter: Math.max(2, ds.nutrition.stunting - stuntingGain),
      anaemiaAfter: Math.max(3, ds.nutrition.anaemiaWomen - anaemiaGain),
      costUsd: cost, costPerCapita: perCapita, benefitUsd: benefit,
      costPerDaly: totalDalys > 0 ? cost / totalDalys : Infinity,
      npv, irr, bcr, payback, jobs, equity, delivery: DELIVERY,
      flows: flows.map((v, i) => ({ year: ds.year + i, value: v, cum: flows.slice(0, i + 1).reduce((a, b) => a + b, 0) }))
    };
  }

  /* -------------------------------------------- attribution des risques ---- */
  /**
   * Fractions attribuables (PAF) : chaque facteur alimentaire est comparé au
   * repère OMS ; l'excès (ou le déficit) produit un risque relatif modélisé.
   * Renvoie, par maladie, la part attribuable à chaque facteur et les cas
   * attribuables (décès, DALY).
   */
  function riskAttribution(ds) {
    const d = ds.diet, bench = ds.dietBenchmarks;
    /* Le risque est évalué contre le repère RENFORCÉ (colonne `safer` : OMS
       strict), le repère de base (`bench`) servant d'objectif de politique
       publique. Un ratio < 1 sur le repère renforcé ne produit aucun PAF. */
    const load = {}, loadBase = {};
    bench.forEach(b => { load[b.k] = d[b.k] / b.safer; loadBase[b.k] = d[b.k] / b.bench; });
    const paf = (ratio, dir, k) => {
      const excess = dir === 'down' ? Math.max(0, ratio - 1) : Math.max(0, 1 - ratio);
      return clamp(1 - Math.exp(-(k || 1.1) * excess), 0, .78);
    };
    const rows = [
      { id: 'sodium', fr: 'Excès de sodium', en: 'Excess sodium', factor: 'sodiumMg', intake: d.sodiumMg, unit: 'mg/j', ratio: load.sodiumMg, baseRatio: loadBase.sodiumMg, paf: paf(load.sodiumMg, 'down', .95), diseases: ['hypertension', 'cvd', 'stroke'], color: '#ff6b5e', action: { fr: 'Reformulation (pain, bouillons, conserves) + étiquetage', en: 'Reformulation (bread, stock cubes, cans) + labelling' } },
      { id: 'sugar', fr: 'Excès de sucres libres', en: 'Excess free sugars', factor: 'sugarG', intake: d.sugarG, unit: 'g/j', ratio: load.sugarG, baseRatio: loadBase.sugarG, paf: paf(load.sugarG, 'down', .45), diseases: ['diabetes', 'obesity'], color: '#f472b6', action: { fr: 'Taxation des boissons sucrées + cantines sans sucre ajouté', en: 'Sugary drink tax + sugar-free school canteens' } },
      { id: 'satfat', fr: 'Excès de graisses saturées', en: 'Excess saturated fat', factor: 'satFatPct', intake: d.satFatPct, unit: '% AET', ratio: load.satFatPct, baseRatio: loadBase.satFatPct, paf: paf(load.satFatPct, 'down', .6), diseases: ['cvd', 'stroke'], color: '#f5b642', action: { fr: 'Huiles locales non hydrogénées, cuisson à l’eau', en: 'Local non-hydrogenated oils, moist cooking' } },
      { id: 'ultra', fr: 'Ultra-transformés', en: 'Ultra-processed foods', factor: 'ultraProcPct', intake: d.ultraProcPct, unit: '% kcal', ratio: load.ultraProcPct, baseRatio: loadBase.ultraProcPct, paf: paf(load.ultraProcPct, 'down', .45), diseases: ['obesity', 'diabetes', 'cancer'], color: '#a78bfa', action: { fr: 'Réglementation du marketing + approvisionnement public', en: 'Marketing regulation + public procurement' } },
      { id: 'fiber', fr: 'Déficit de fibres', en: 'Fibre deficit', factor: 'fiberG', intake: d.fiberG, unit: 'g/j', ratio: load.fiberG, baseRatio: loadBase.fiberG, paf: paf(load.fiberG, 'up', .6), diseases: ['cancer', 'cvd'], color: '#18d67f', action: { fr: 'Céréales complètes & légumineuses locales', en: 'Whole grains & local legumes' } },
      { id: 'fruitveg', fr: 'Déficit de fruits & légumes', en: 'Fruit & vegetable deficit', factor: 'fruitVegG', intake: d.fruitVegG, unit: 'g/j', ratio: load.fruitVegG, baseRatio: loadBase.fruitVegG, paf: paf(load.fruitVegG, 'up', .7), diseases: ['cvd', 'stroke', 'cancer'], color: '#3fc8f0', action: { fr: 'Circuit court maraîcher + prix garanti saison sèche', en: 'Short market-garden chain + dry-season price floor' } }
    ];
    /* Charge attribuable : répartie sur les décès et les DALY en fonction du
       poids relatif de chaque maladie dans la charge nationale. */
    rows.forEach(r => {
      r.status = r.paf < .02 ? 'ok' : r.ratio > 2 ? 'critical' : 'alert';
      r.label = r.paf < .02
        ? { fr: 'Repère OMS renforcé atteint', en: 'WHO advanced reference met' }
        : { fr: 'Au-dessus du repère OMS renforcé', en: 'Above the WHO advanced reference' };
    });
    const total = rows.reduce((a, r) => a + r.paf, 0) || 1;
    const deathsDiet = ds.burden.dietAttributableDeaths;
    const dalysDiet = ds.burden.dalys * (ds.burden.dietAttributableDalyPct / 100);
    rows.forEach(r => {
      r.share = r.paf / total;
      r.deaths = deathsDiet * r.share;
      r.dalys = dalysDiet * r.share;
      r.dalyPer100k = ds.totals.population ? r.dalys / ds.totals.population * 1e5 : 0;
    });
    const perDisease = {};
    rows.forEach(r => r.diseases.forEach(dz => { perDisease[dz] = (perDisease[dz] || 0) + r.paf / r.diseases.length; }));
    return { rows, perDisease, deathsDiet, dalysDiet, excessShare: rows.reduce((a, r) => a + r.paf, 0) / rows.length * 100 };
  }

  /* --------------------------------------------------------- interventions */
  /**
   * Catalogue d'interventions chiffrées : coût, DALY évités, vies sauvées,
   * rapport coût-efficacité et ciblage régional. Sert au portefeuille et à
   * l'optimiseur budgétaire.
   */
  function interventions(ds) {
    const out = [];
    ds.regions.forEach((rg, i) => {
      const w = rg.population / ds.totals.population;
      LEVERS.forEach((l, j) => {
        const lev = defaultLevers();
        lev[l.k] = l.group === 'mère-enfant' ? .5 : .45;
        if (l.group === 'mère-enfant') { lev.fortification = .45; }
        const sim = screeningSim(ds, lev);
        /* une mesure par région : la charge régionale pondère l'impact */
        const load = .6 + rg.risk / 100 * 1.1;
        const dalys = sim.dalysAvoided * w * (l.group === 'mère-enfant'
          ? (rg.stunting / Math.max(1, ds.nutrition.stunting))
          : (rg.diabetes + rg.hypertension) / Math.max(1, ds.ncd.diabetes + ds.ncd.hypertension)) * load;
        const cost = l.cost * rg.population * .55 + l.cost * rg.population * .45;
        const deaths = sim.deathsAvoided * w * (l.group === 'mère-enfant' ? rg.stunting / Math.max(1, ds.nutrition.stunting) : load);
        out.push({
          id: l.k + '|' + rg.name + '|' + (i * LEVERS.length + j),
          lever: l.k, fr: l.fr, en: l.en, group: l.group, evidence: l.evidence, region: rg.name,
          costUsd: cost, dalys, deaths, bcr: cost > 0 ? (dalys * ds.profile.gdp * 1.6) / cost : 0,
          costPerDaly: dalys > 0 ? cost / dalys : Infinity,
          stuntingGain: sim.stuntingGain * (rg.stunting / Math.max(1, ds.nutrition.stunting)),
          coverage: sim.coverage * 100,
          equity: clamp(.3 + (1 - rg.urban) * .4 + (l.group === 'mère-enfant' ? .25 : 0), 0, 1),
          jobs: Math.round(sim.jobs * w),
          risk: rg.risk
        });
      });
    });
    return out;
  }

  /**
   * Optimisation budgétaire gloutonne : on retient les mesures au meilleur
   * rapport DALY évité / USD, pondéré par la priorité politique.
   * priority : 'lives' (DALY), 'equity' (zones rurales/pauvres), 'economy' (BCR).
   */
  function optimizeBudget(ds, catalogue, budget, opts) {
    const o = Object.assign({ priority: 'lives', maxPerLever: 6 }, opts || {});
    const score = (x) => {
      const perUsd = x.dalys / Math.max(1, x.costUsd);
      if (o.priority === 'equity') return perUsd * (.55 + x.equity * .9);
      if (o.priority === 'economy') return perUsd * (.6 + Math.min(2, x.bcr) * .3);
      return perUsd * (.75 + Math.min(2.5, x.bcr) * .12);
    };
    const sorted = catalogue.slice().sort((a, b) => score(b) - score(a));
    let spent = 0;
    const plan = [];
    const byLever = {};
    sorted.forEach(x => {
      if (spent + x.costUsd > budget) return;
      if ((byLever[x.lever] = (byLever[x.lever] || 0) + 1) > o.maxPerLever) { byLever[x.lever]--; return; }
      plan.push(x); spent += x.costUsd;
    });
    const dalys = plan.reduce((a, x) => a + x.dalys, 0);
    const deaths = plan.reduce((a, x) => a + x.deaths, 0);
    const jobs = plan.reduce((a, x) => a + x.jobs, 0);
    const stunting = plan.reduce((a, x) => a + x.stuntingGain, 0);
    const leverMix = {};
    plan.forEach(x => { leverMix[x.lever] = (leverMix[x.lever] || 0) + 1; });
    return {
      plan, spentUsd: spent, budgetUsd: budget, dalys, deaths, jobs, stuntingGain: stunting,
      dalysPerMillion: spent > 0 ? dalys / (spent / 1e6) : 0,
      bcr: spent > 0 ? (dalys * ds.profile.gdp * 1.6) / spent : 0,
      leverMix,
      coverageRegions: Array.from(new Set(plan.map(x => x.region))).length
    };
  }

  /* ------------------------------------------------------- nutrition MCH */
  /** État nutritionnel mère & enfant : bandes d'âge, cibles, priorités. */
  function nutritionStatus(ds) {
    const n = ds.nutrition, t = ds.targets;
    const rows = ds.ageBands.map(b => ({
      id: b.id, fr: b.fr, en: b.en, population: b.population,
      stunting: b.stunting, wasting: b.wasting, overweight: b.overweight, anaemia: b.anaemia,
      severity: b.stunting > 25 ? 'critical' : b.stunting > 15 ? 'alert' : b.stunting > 8 ? 'watch' : 'ok'
    }));
    const program = [
      { k: 'exclusiveBF', fr: 'Allaitement exclusif 0–5 mois', en: 'Exclusive breastfeeding 0–5 m', value: n.exclusiveBF, target: t.exclusiveBF.target, dir: 'up' },
      { k: 'complementary', fr: 'Alimentation de complément', en: 'Complementary feeding', value: n.complementary, target: t.complementary.target, dir: 'up' },
      { k: 'dietaryDiversity', fr: 'Diversité alimentaire minimale', en: 'Minimum dietary diversity', value: n.dietaryDiversity, target: t.dietaryDiversity.target, dir: 'up' },
      { k: 'growthMonitoring', fr: 'Suivi de la croissance', en: 'Growth monitoring', value: n.growthMonitoring, target: t.growthMonitoring.target, dir: 'up' },
      { k: 'vitASupp', fr: 'Supplémentation vitamine A', en: 'Vitamin A supplementation', value: n.vitASupp, target: t.vitASupp.target, dir: 'up' },
      { k: 'iodisedSalt', fr: 'Sel iodé', en: 'Iodised salt', value: n.iodisedSalt, target: t.iodisedSalt.target, dir: 'up' },
      { k: 'anaemiaWomen', fr: 'Anémie des femmes', en: 'Women anaemia', value: n.anaemiaWomen, target: t.anaemiaWomen.target, dir: 'down' },
      { k: 'stunting', fr: 'Retard de croissance', en: 'Stunting', value: n.stunting, target: t.stunting.target, dir: 'down' }
    ].map(x => Object.assign(x, {
      gap: x.dir === 'up' ? x.target - x.value : x.value - x.target,
      achieved: x.dir === 'up' ? x.value >= x.target : x.value <= x.target,
      ratio: x.target ? (x.dir === 'up' ? x.value / x.target : x.target / Math.max(.001, x.value)) : 1
    }));
    const critical = program.filter(p => !p.achieved).sort((a, b) => a.ratio - b.ratio);
    const score = clamp(program.reduce((a, p) => a + clamp(p.ratio, 0, 1.2), 0) / program.length * 100 * .92, 0, 100);
    const childrenAffected = ds.totals.under5 * n.stunting / 100;
    return {
      rows, program, critical,
      score,
      childrenStunted: childrenAffected,
      childrenWasted: ds.totals.under5 * n.wasting / 100,
      womenAnaemic: ds.totals.women1549 * n.anaemiaWomen / 100,
      summary: critical.length
        ? { fr: 'Écarts aux cibles : ' + critical.slice(0, 3).map(c => c.fr).join(', '), en: 'Gaps to targets: ' + critical.slice(0, 3).map(c => c.en).join(', ') }
        : { fr: 'Toutes les cibles mère-enfant sont atteintes', en: 'All maternal & child targets are met' }
    };
  }

  /** Cascade de prise en charge : population → dépisté → diagnostiqué → traité → contrôlé. */
  function careCascade(ds) {
    const t = ds.totals, s = ds.services, k = ds.ncd;
    const target = t.population * .42;                       // population cible (35 ans +)
    const prevalence = (k.diabetes + k.hypertension * .62) / 100;
    const cases = target * prevalence;
    const screeningRate = s.screening / 100;
    const screened = target * screeningRate;
    const expectedCases = screened * prevalence;             // cas attendus parmi les personnes dépistées
    const diagnosed = Math.min(cases, expectedCases * clamp(.62 + s.labCoverage / 100 * .2, 0, .95));
    const treated = diagnosed * clamp(.58 + s.followUp / 100 * .32, 0, .96);
    const controlled = treated * clamp((k.hypertensionControlled / 100) * .6 + (k.diabetesControlled / 100) * .4 + .1, 0, .88);
    const steps = [
      { fr: 'Population cible (35 ans +)', en: 'Target population (35+)', value: target, color: '#9fbfac' },
      { fr: 'Dépistée', en: 'Screened', value: screened, color: '#3fc8f0' },
      { fr: 'Cas détectés', en: 'Cases detected', value: diagnosed, color: '#f5b642' },
      { fr: 'Sous traitement', en: 'On treatment', value: treated, color: '#c9ee59' },
      { fr: 'Contrôlée', en: 'Controlled', value: controlled, color: '#18d67f' }
    ];
    steps.forEach((x, i) => {
      x.pct = i === 0 ? 100 : (x.value / steps[0].value) * 100;
      x.pctPrev = i ? (x.value / steps[i - 1].value) * 100 : 100;
      /* i = 1 : le passage « dépistée → cas détectés » n'est pas une fuite mais la
         part de personnes saines dans la population dépistée ; la performance de
         détection se mesure par rapport aux cas attendus. Les fuites chiffrées
         portent donc sur la suite de la cascade (détecté → traité → contrôlé). */
      x.from = i ? steps[i - 1] : null;
      x.leak = i >= 3 ? Math.max(0, steps[i - 1].value - x.value) : 0;
      x.leakPct = i >= 3 ? 100 - x.pctPrev : null;
    });
    return {
      steps, prevalence, cases, screened, expectedCases, diagnosed, treated, controlled,
      detectionPct: expectedCases > 0 ? diagnosed / expectedCases * 100 : 0,
      detectionVsCases: cases > 0 ? diagnosed / cases * 100 : 0,
      controlledShare: cases > 0 ? controlled / cases * 100 : 0
    };
  }

  /* ------------------------------------------------------------- Monte-Carlo */
  /** Distribution de la charge future : DALY, diabète, retard de croissance. */
  function burdenMC(ds, opts) {
    const o = Object.assign({ runs: 5000, horizon: 10 }, opts || {});
    const base = ds.burden.dalysPer100k, diab = ds.ncd.diabetes, st = ds.nutrition.stunting;
    const dalys = [], dm = [], sm = [];
    const rnd = (() => { let a = 987654321; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    for (let i = 0; i < o.runs; i++) {
      let d0 = base, d1 = diab, s1 = st;
      for (let y = 0; y < o.horizon; y++) {
        const shock = (rnd() - .5) * .06;
        const growth = 1 + (.004 + shock) + (rnd() < .06 ? .05 : 0);     // épidémio + aléas (épidémies, crises)
        d0 *= growth;
        d1 *= 1 + (.008 + (rnd() - .5) * .05);
        s1 *= 1 - (.012 + (rnd() - .5) * .07);
      }
      dalys.push(d0); dm.push(Math.min(35, d1)); sm.push(Math.max(2, s1));
    }
    const q = (arr) => ({ p10: S.quantile(arr, .1), p50: S.quantile(arr, .5), p90: S.quantile(arr, .9) });
    const hist = S.histogram(dalys, 24);
    return {
      runs: o.runs, horizon: o.horizon,
      dalys: q(dalys), diabetes: q(dm), stunting: q(sm),
      hist,
      probDiabetesUp: dm.filter(v => v > diab * 1.1).length / dm.length * 100,
      probStuntingDown: sm.filter(v => v < st * .9).length / sm.length * 100,
      probBurdenUp: dalys.filter(v => v > base).length / dalys.length * 100,
      samples: dalys.slice(0, 400)
    };
  }

  /* -------------------------------------------------------------- sensibilité */
  /** Effet d'une variation de ±10 % des moteurs clés sur la charge de morbidité. */
  function sensitivity(ds) {
    const ra = riskAttribution(ds);
    const saltLoad = ds.diet.sodiumMg / 2000, sugarLoad = ds.diet.sugarG / 50;
    const drivers = [
      { fr: 'Sodium alimentaire', en: 'Dietary sodium', w: saltLoad * .34, tag: 'alimentation' },
      { fr: 'Sucres libres', en: 'Free sugars', w: sugarLoad * .28, tag: 'alimentation' },
      { fr: 'Ultra-transformés', en: 'Ultra-processed', w: ds.diet.ultraProcPct / 100 * .26, tag: 'alimentation' },
      { fr: 'Fruits & légumes', en: 'Fruit & vegetables', w: -.2 * (1 - Math.min(1, ds.diet.fruitVegG / 400)), tag: 'alimentation' },
      { fr: 'Dépistage NCD', en: 'NCD screening', w: -.3 * (ds.services.screening / 100), tag: 'services' },
      { fr: 'Contrôle tension', en: 'BP control', w: -.36 * (ds.ncd.hypertensionControlled / 100), tag: 'soins' },
      { fr: 'Inactivité physique', en: 'Physical inactivity', w: ds.ncd.inactivity / 100 * .2, tag: 'mode de vie' },
      { fr: 'Allaitement exclusif', en: 'Exclusive breastfeeding', w: -.18 * (ds.nutrition.exclusiveBF / 100), tag: 'mère-enfant' },
      { fr: 'Alimentation de complément', en: 'Complementary feeding', w: -.16 * (ds.nutrition.complementary / 100), tag: 'mère-enfant' }
    ].map(d => ({ fr: d.fr, en: d.en, tag: d.tag, elasticity: d.w, low: -10 * d.w, high: 10 * d.w }));
    drivers.sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity));
    return { drivers, base: ds.burden.dalys };
  }

  /* --------------------------------------------------------------- comparatif */
  /** Comparaison avec les pays pairs (même jeu d'indicateurs, même millésime). */
  function benchmark(ds, DATA) {
    const D = DATA || w.NUTRI_HEALTH_DATA;
    return D.availableCountries().map(cc => {
      const d = D.build(cc, ds.year);
      return {
        cc, name: d.countryName,
        stunting: d.nutrition.stunting,
        diabetes: d.ncd.diabetes,
        hypertension: d.ncd.hypertension,
        obesity: d.ncd.obesity,
        screening: d.services.screening,
        dalysPer100k: d.burden.dalysPer100k,
        uhc: d.services.insurance,
        lifeExpectancy: d.totals.lifeExpectancy,
        current: cc === ds.country
      };
    });
  }

  /** Indice composite de préparation du système (0→100). */
  function readiness(ds) {
    const parts = [
      { fr: 'Couverture assurantielle', en: 'Insurance coverage', v: ds.services.insurance, w: .18 },
      { fr: 'Personnel de santé', en: 'Health workforce', v: clamp(ds.services.nursesPer100k / 8 * 100 + ds.services.doctorsPer100k / 2 * 40, 0, 100), w: .18 },
      { fr: 'Couverture laboratoire', en: 'Laboratory coverage', v: ds.services.labCoverage, w: .14 },
      { fr: 'Chaîne du froid', en: 'Cold chain', v: ds.services.coldChain, w: .12 },
      { fr: 'Dépistage NCD', en: 'NCD screening', v: ds.services.screening, w: .16 },
      { fr: 'Suivi des patients', en: 'Patient follow-up', v: ds.services.followUp, w: .12 },
      { fr: 'Disponibilité des médicaments', en: 'Medicine availability', v: 100 - ds.services.stockouts, w: .10 }
    ];
    const score = parts.reduce((a, p) => a + p.v * p.w, 0);
    return { parts, score, level: score > 65 ? 'solide' : score > 45 ? 'intermédiaire' : 'fragile' };
  }

  /* ------------------------------------------------------- note de décision */
  function brief(ds, opts) {
    const o = opts || {};
    const lang = o.lang || NX.lang();
    const en = lang === 'en';
    const ns = nutritionStatus(ds);
    const ra = riskAttribution(ds);
    const cas = careCascade(ds);
    const plan = o.plan || screeningSim(ds, allLevers(.5));
    const mc = o.mc || null;
    const rd = readiness(ds);
    const L = [];
    L.push(en ? 'NUTRI.N°1 — PUBLIC HEALTH DECISION BRIEF' : 'NUTRI.N°1 — NOTE DE DÉCISION EN SANTÉ PUBLIQUE');
    L.push('');
    L.push((en ? 'Country: ' : 'Pays : ') + ds.countryName + '  ·  ' + (en ? 'Year: ' : 'Millésime : ') + ds.year + '  ·  ' + (en ? 'Population: ' : 'Population : ') + f.num(ds.totals.population / 1e6, 1) + ' M');
    L.push('');
    L.push(en ? '1. SITUATION' : '1. SITUATION');
    L.push('• ' + (en ? 'Stunting ' : 'Retard de croissance ') + f.pct(ds.nutrition.stunting, 1) + (en ? ' (target ' : ' (cible ') + f.pct(ds.targets.stunting.target, 0) + ') · ' +
      (en ? 'women anaemia ' : 'anémie des femmes ') + f.pct(ds.nutrition.anaemiaWomen, 1) + ' · ' +
      (en ? 'exclusive breastfeeding ' : 'allaitement exclusif ') + f.pct(ds.nutrition.exclusiveBF, 1));
    L.push('• ' + (en ? 'Diabetes ' : 'Diabète ') + f.pct(ds.ncd.diabetes, 1) + ' · ' + (en ? 'hypertension ' : 'hypertension ') + f.pct(ds.ncd.hypertension, 1) +
      ' · ' + (en ? 'obesity ' : 'obésité ') + f.pct(ds.ncd.obesity, 1) + ' · ' + (en ? 'BP controlled ' : 'HTA contrôlée ') + f.pct(ds.ncd.hypertensionControlled, 1));
    L.push('• ' + (en ? 'Burden: ' : 'Charge : ') + f.num(ds.burden.dalysPer100k, 0) + ' DALY/100k · ' + (en ? 'NCD share of deaths ' : 'part NCD des décès ') + f.pct(ds.burden.ncdDeathsShare * 100, 0) +
      ' · ' + (en ? 'diet-attributable deaths ' : 'décès attribuables à l’alimentation ') + f.int(ds.burden.dietAttributableDeaths));
    L.push('• ' + (en ? 'Health system readiness: ' : 'Préparation du système de santé : ') + f.num(rd.score, 0) + '/100 (' + rd.level + ') · ' +
      (en ? 'screening ' : 'dépistage ') + f.pct(ds.services.screening, 0) + ' · ' + (en ? 'insurance ' : 'assurance ') + f.pct(ds.services.insurance, 0));
    L.push('');
    L.push(en ? '2. DRIVERS' : '2. MOTEURS');
    ra.rows.slice(0, 4).forEach(r => L.push('• ' + (en ? r.en : r.fr) + ' — ' + (en ? 'attributable share ' : 'part attribuable ') + f.pct(r.paf * 100, 1) +
      ' → ' + f.int(r.deaths) + (en ? ' deaths/yr, ' : ' décès/an, ') + f.num(r.dalyPer100k, 0) + ' DALY/100k'));
    L.push('');
    L.push(en ? '3. CARE CASCADE' : '3. CASCADE DE PRISE EN CHARGE');
    cas.steps.forEach((s, i) => { if (i) L.push('• ' + (en ? s.en : s.fr) + ' : ' + f.int(s.value) + ' (' + f.pct(s.pct, 1) + ') — ' + (en ? 'leak ' : 'perte ') + f.int(s.leak) + (en ? ' people' : ' personnes')); });
    L.push('');
    L.push(en ? '4. PROPOSED PLAN (50 % intensity on all levers)' : '4. PLAN PROPOSÉ (50 % d’intensité sur tous les leviers)');
    L.push('• ' + (en ? 'Cost ' : 'Coût ') + f.money(plan.costUsd, ds.country) + ' · ' + (en ? 'DALYs averted ' : 'DALY évités ') + f.num(plan.dalysAvoided, 0) +
      ' · ' + (en ? 'cost per DALY ' : 'coût par DALY ') + f.money(plan.costPerDaly, ds.country));
    L.push('• ' + (en ? 'Deaths averted ' : 'Décès évités ') + f.int(plan.deathsAvoided) + ' · ' + (en ? 'BP/diabetes cases controlled +' : 'cas contrôlés en plus +') + f.int(plan.controlled) +
      ' · ' + (en ? 'jobs ' : 'emplois ') + f.int(plan.jobs));
    L.push('• ' + (en ? 'Stunting ' : 'Retard de croissance ') + f.pct(ds.nutrition.stunting, 1) + ' → ' + f.pct(plan.stuntingAfter, 1) +
      ' · ' + (en ? 'anaemia ' : 'anémie ') + f.pct(ds.nutrition.anaemiaWomen, 1) + ' → ' + f.pct(plan.anaemiaAfter, 1));
    L.push('• ' + (en ? 'Benefit/cost ' : 'Bénéfice/coût ') + f.num(plan.bcr, 2) + '× · TRI ' + (isFinite(plan.irr) ? f.pct(plan.irr * 100, 0) : 'n/a') +
      ' · ' + (en ? 'payback ' : 'retour sur ')+(plan.payback == null ? (en ? 'beyond 10 yrs' : 'au-delà de 10 ans') : plan.payback + (en ? ' yrs' : ' ans')));
    if (mc) {
      L.push('');
      L.push(en ? '5. RISK (Monte-Carlo)' : '5. RISQUE (Monte-Carlo)');
      L.push('• ' + (en ? 'Burden in ' : 'Charge en ') + (ds.year + mc.horizon) + ' : P10 ' + f.num(mc.dalys.p10, 0) + ' / P50 ' + f.num(mc.dalys.p50, 0) + ' / P90 ' + f.num(mc.dalys.p90, 0) + ' DALY/100k');
      L.push('• ' + (en ? 'Probability burden rises: ' : 'Probabilité de hausse de la charge : ') + f.pct(mc.probBurdenUp, 1) +
        ' · ' + (en ? 'diabetes up: ' : 'diabète en hausse : ') + f.pct(mc.probDiabetesUp, 1));
    }
    L.push('');
    L.push(en ? '6. RECOMMENDATION' : '6. RECOMMANDATION');
    const top = ra.rows.slice().sort((a, b) => b.paf - a.paf)[0];
    const weak = ns.critical[0];
    L.push((en ? '• Act first on ' : '• Agir d’abord sur ') + (en ? top.en : top.fr) + (en ? ' (largest attributable share) and on ' : ' (part attribuable la plus forte) et sur ') + (weak ? (en ? weak.en : weak.fr) : (en ? 'screening coverage' : 'la couverture du dépistage')) + '.');
    L.push(en ? '• Finance the cascade: screening → diagnosis → treatment → control. Every 1,000 people controlled removes roughly 28 major complications per year.' : '• Financer la cascade : dépistage → diagnostic → traitement → contrôle. 1 000 personnes contrôlées évitent environ 28 complications majeures par an.');
    L.push('• ' + (en ? 'Data: connect DHIS2, laboratories and referral hospitals so that this dashboard becomes official reporting rather than modelled estimation.' : 'Données : connecter DHIS2, les laboratoires et les hôpitaux de référence pour que ce tableau de bord devienne un rapport officiel et non une estimation modélisée.'));
    L.push('');
    L.push(en ? 'Figures are modelled demonstration estimates — not official statistics.' : 'Valeurs modélisées de démonstration — ne constituent pas des statistiques officielles.');
    return L.join('\n');
  }

  function coverage() {
    return {
      metrics: Object.keys(METRICS), levers: LEVERS.map(l => l.k), scenarios: Object.keys(SCENARIOS),
      indicators: Object.keys(METRICS).length * 3 + LEVERS.length + 6
    };
  }

  w.NUTRI_HEALTH_MODELS = {
    __v59: true, METRICS, SCENARIOS, LEVERS, defaultLevers, allLevers,
    forecast, screeningSim, riskAttribution, interventions, optimizeBudget,
    nutritionStatus, careCascade, burdenMC, sensitivity, benchmark, readiness, brief, coverage
  };
})(window);
