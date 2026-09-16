/* ============================================================================
   NUTRI.N°1 — MODÈLES AGRO-ALIMENTAIRES (module Agriculture, v58)
   ---------------------------------------------------------------------------
   Couche analytique RÉUTILISABLE (indépendante de l'interface) :

     • waterfall()          bilan alimentaire national (production → pertes → …)
     • lossSim()            simulateur de réduction des pertes post-récolte
     • climateStress()      impact climatique (ΔT, Δpluie) → rendements → disponible
     • forecast()           prévision production/disponibilité + intervalles
     • monteCarlo()         simulation stochastique du bilan (10 000 tirages)
     • interventions()      catalogue chiffré de mesures + optimisation budgétaire
     • nutritionGap()       nutriments disponibles vs besoins (kcal, protéines, Fe…)
     • sensitivity()        analyse de sensibilité (tornado) du moteur national
     • brief()              note de décision pour le Ministère / investisseurs

   Toutes les sorties sont des ESTIMATIONS MODÉLISÉES de démonstration.
   ========================================================================== */
(function (w) {
  'use strict';
  if (w.NUTRI_AGRI_MODELS) return;
  const NX = w.NX, D = w.NUTRI_AGRI_DATA;
  const S = NX.stats, F = NX.fmt;
  const clamp = NX.clamp, interp = NX.lerp;

  /* empreinte eau (m³/t) et facteur d'émission évité (tCO2e/t perdue) par groupe */
  const WATER_FP = { cereals: 1600, tubers: 420, legumes: 1900, fruits_veg: 260, oilseeds: 3200, animal: 5200, cash: 2400 };
  const CO2_FP = { cereals: 1.6, tubers: 1.1, legumes: 1.8, fruits_veg: 1.4, oilseeds: 2.1, animal: 5.6, cash: 1.9 };

  /* --------------------------------------------------------------- bilan */
  function waterfall(ds) {
    const t = ds.totals;
    const food = ds.crops.filter(c => c.group !== 'cash');
    const consumed = food.reduce((s, c) => s + c.consumedT, 0);
    return {
      items: [
        { label: 'Production totale', value: t.productionT, type: 'total', color: '#c9ee59' },
        { label: 'Pertes post-récolte', value: -t.lossT, type: 'neg', color: '#ff6b5e' },
        { label: 'Exportations', value: -food.reduce((s, c) => s + c.exportedT, 0), type: 'neg', color: '#f472b6' },
        { label: 'Importations', value: food.reduce((s, c) => s + c.importedT, 0), type: 'pos', color: '#3fc8f0' },
        { label: 'Pertes ménages', value: -food.reduce((s, c) => s + (c.totalAvailT - c.consumedT), 0), type: 'neg', color: '#f5b642' },
        { label: 'Disponible consommé', value: consumed, type: 'total', color: '#18d67f' },
        { label: 'Besoins nationaux', value: t.needT, type: 'total', color: '#a78bfa' },
        { label: 'Écart à combler', value: -t.gapT, type: 'neg', color: '#ef4444' }
      ],
      lossStages: lossByStage(ds),
      topGaps: food.slice().sort((a, b) => b.gapT - a.gapT).slice(0, 6)
    };
  }
  function lossByStage(ds) {
    const acc = { harvest: 0, storage: 0, transport: 0, processing: 0, market: 0 };
    ds.crops.forEach(c => {
      for (const k in acc) acc[k] += c.lossT * ((c.loss.stages[k] || 0) / (c.loss.total || 1));
    });
    const total = S.sum(Object.keys(acc).map(k => acc[k])) || 1;
    const LAB = {
      harvest: { fr: 'Récolte & battage', en: 'Harvest & threshing', color: '#c9ee59' },
      storage: { fr: 'Séchage & stockage', en: 'Drying & storage', color: '#f5b642' },
      transport: { fr: 'Transport', en: 'Transport', color: '#3fc8f0' },
      processing: { fr: 'Transformation', en: 'Processing', color: '#a78bfa' },
      market: { fr: 'Marché & distribution', en: 'Market & distribution', color: '#ff6b5e' }
    };
    return Object.keys(acc).map(k => ({ key: k, value: acc[k], share: acc[k] / total * 100, ...LAB[k] }));
  }

  /* -------------------------------------------------- simulateur de pertes */
  /** Étapes : récolte, stockage, transport, transformation, marché (0-1). */
  function lossSim(ds, levers, opts) {
    const o = Object.assign({ horizon: 5, discount: .09 }, opts || {});
    const L = Object.assign({ harvest: 0, storage: 0, transport: 0, processing: 0, market: 0, coldChain: 0, irrigation: 0, seed: 0, extension: 0, biofort: 0 }, levers || {});
    const c = ds.profile;
    /* gain = part de la perte d'étape évitée (rendements décroissants) */
    const eff = (x, ceiling) => ceiling * (1 - Math.exp(-3.1 * clamp(x, 0, 1)));
    const fHarvest = 1 - eff(L.harvest, .55);
    const fStorage = 1 - eff(L.storage, .72);
    const fTransport = 1 - eff(L.transport + L.coldChain * .55, .70);
    const fProcessing = 1 - eff(L.processing, .62);
    const fMarket = 1 - eff(L.market + L.coldChain * .75, .78);
    const factors = { harvest: fHarvest, storage: fStorage, transport: fTransport, processing: fProcessing, market: fMarket };

    const rows = ds.crops.map(crop => {
      const stages = crop.loss.stages || {};
      const newTotal = Object.keys(factors).reduce((s, k) => s + (stages[k] || 0) * factors[k], 0);
      const newLossT = crop.productionT * newTotal / 100;
      const savedT = Math.max(0, crop.lossT - newLossT);
      const edibleKcal = savedT * 1e6 * crop.nut.kcal / 100 / 1000;   // milliers kcal
      return {
        id: crop.id, fr: crop.fr, en: crop.en, group: crop.group, icon: crop.icon,
        lossPctBefore: crop.lossPct, lossPctAfter: newTotal,
        savedT, savedValueUsd: savedT * crop.priceUsdKg * 1000,
        kcalK: edibleKcal, peopleYear: edibleKcal * 1000 / (2100 * 365),
        waterSavedM3: savedT * (WATER_FP[crop.group] || 1500),
        co2AvoidedT: savedT * (CO2_FP[crop.group] || 1.6),
        landSavedHa: savedT * 1000 / Math.max(60, crop.yieldTha * 1000),
        proteinT: savedT * crop.nut.prot / 100,
        ironKg: savedT * crop.nut.fe * 10,
        vaKg: savedT * crop.nut.va * 10
      };
    }).sort((a, b) => b.savedT - a.savedT);

    const savedT = S.sum(rows.map(r => r.savedT));
    const savedValueUsd = S.sum(rows.map(r => r.savedValueUsd));
    const kcalK = S.sum(rows.map(r => r.kcalK));
    /* coûts d'investissement (USD) ---------------------------------------- */
    const prodPerish = ds.crops.filter(x => ['fruits_veg', 'animal', 'tubers'].indexOf(x.group) >= 0).reduce((s, x) => s + x.productionT, 0);
    const cerealT = ds.crops.filter(x => x.group === 'cereals').reduce((s, x) => s + x.productionT, 0);
    const cost = {
      storage: L.storage * cerealT * .28 * 46,
      coldChain: L.coldChain * prodPerish * .18 * 340,
      transport: L.transport * ds.totals.productionT * .55 * 26,
      processing: L.processing * ds.totals.productionT * .12 * 96,
      market: L.market * ds.totals.productionT * .35 * 14,
      harvest: L.harvest * ds.totals.farms * .55 * 9,
      irrigation: L.irrigation * ds.totals.areaHa * .05 * 3400,
      seed: L.seed * ds.totals.areaHa * .35 * 42,
      extension: L.extension * ds.totals.farms * 3.4,
      biofort: L.biofort * ds.totals.areaHa * .08 * 15
    };
    const investmentUsd = S.sum(Object.keys(cost).map(k => cost[k]));
    const omUsd = investmentUsd * .065;
    /* gain de production additionnel (irrigation / semences / conseil) ------- */
    const yieldGain = (L.irrigation * .16 + L.seed * .12 + L.extension * .07);
    const extraProdT = ds.totals.productionT * yieldGain;
    const extraValueUsd = extraProdT * (ds.totals.valueUsd / Math.max(1, ds.totals.productionT));
    const annualBenefit = savedValueUsd + extraValueUsd - omUsd;
    /* indicateurs financiers ------------------------------------------------- */
    const r = o.discount, N = o.horizon;
    let npv = -investmentUsd, cum = -investmentUsd, payback = null;
    for (let y = 1; y <= N; y++) {
      const b = annualBenefit * Math.pow(1.012, y - 1);
      npv += b / Math.pow(1 + r, y);
      cum += b;
      if (payback == null && cum >= 0) payback = y - 1 + (cum - b * 1.012) >= 0 ? y - 1 : y - 1 + (-(cum - b) / b);
    }
    const irr = (function () {
      let lo = -.9, hi = 2.5;
      const f = rate => { let v = -investmentUsd; for (let y = 1; y <= N; y++) v += annualBenefit * Math.pow(1.012, y - 1) / Math.pow(1 + rate, y); return v; };
      if (f(lo) * f(hi) > 0) return f(hi) > 0 ? 2.5 : NaN;
      for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; }
      return (lo + hi) / 2;
    })();
    const bcr = investmentUsd > 0 ? npv / investmentUsd + 1 : 0;
    /* effets nutritionnels --------------------------------------------------- */
    const peopleYear = kcalK * 1000 / (2100 * 365);
    return {
      levers: L, factors, rows, savedT, savedValueUsd, investmentUsd, omUsd, extraProdT, extraValueUsd, annualBenefit,
      npv, irr, bcr, payback: payback == null ? null : Math.max(.2, payback),
      kcalK, peopleYear, micronutrients: { proteinT: S.sum(rows.map(x => x.proteinT)), ironKg: S.sum(rows.map(x => x.ironKg)), vaKg: S.sum(rows.map(x => x.vaKg)) },
      waterSavedM3: S.sum(rows.map(x => x.waterSavedM3)), co2AvoidedT: S.sum(rows.map(x => x.co2AvoidedT)), landSavedHa: S.sum(rows.map(x => x.landSavedHa)),
      jobs: Math.round(investmentUsd / 14500 + ds.totals.farms * (L.harvest * .05 + L.extension * .03)),
      lossPctBefore: ds.totals.lossPct,
      lossPctAfter: ds.totals.productionT ? ((ds.totals.lossT - savedT) / ds.totals.productionT) * 100 : 0,
      cost
    };
  }

  /* ------------------------------------------------------- stress climatique */
  function climateStress(ds, params) {
    const p = Object.assign({ dTemp: 1.5, dRain: -10, horizon: 8, adaptation: 0 }, params || {});
    const adapt = 1 - clamp(p.adaptation, 0, 100) / 100 * .62;
    const rows = ds.crops.map(crop => {
      const st = crop.climateSensitivity || [6, 10];
      const dT = p.dTemp, dR = p.dRain;
      const tempEffect = -dT * st[0] / 100 * 4.2 * adapt;      // % de rendement
      const rainEffect = dR / 10 * st[1] / 100 * .5 * adapt;
      const delta = (tempEffect + rainEffect);
      return {
        id: crop.id, fr: crop.fr, en: crop.en, group: crop.group, icon: crop.icon,
        yieldBase: crop.yieldTha, yieldNew: crop.yieldTha * (1 + delta),
        deltaPct: delta * 100,
        prodBase: crop.productionT, prodNew: Math.max(0, crop.productionT * (1 + delta)),
        prodDeltaT: crop.productionT * delta,
        valueDeltaUsd: crop.productionT * delta * crop.priceUsdKg * 1000,
        risk: clamp(50 + delta * 220, 0, 100),
        sensitivity: st
      };
    }).sort((a, b) => a.deltaPct - b.deltaPct);
    const prodDeltaT = S.sum(rows.map(r => r.prodDeltaT));
    const foodBase = ds.crops.filter(c => c.group !== 'cash');
    const availDelta = S.sum(rows.filter(r => { const c = D.crop(r.id); return c.group !== 'cash'; }).map(r => r.prodDeltaT * (1 - r.deltaPct < 0 ? .15 : .1)));
    const newNeed = ds.totals.needT;
    const newAvail = ds.totals.availFoodT + availDelta - ds.totals.lossT * (availDelta < 0 ? .1 : .05);
    const gapNew = Math.max(0, newNeed - newAvail);
    return {
      params: p, rows, prodDeltaT, prodDeltaPct: ds.totals.productionT ? prodDeltaT / ds.totals.productionT * 100 : 0,
      valueDeltaUsd: S.sum(rows.map(r => r.valueDeltaUsd)),
      selfSuffBase: ds.totals.selfSufficiency,
      selfSuffNew: newNeed ? newAvail / newNeed * 100 : 100,
      gapBase: ds.totals.gapT, gapNew, extraGapT: Math.max(0, gapNew - ds.totals.gapT),
      vulnerable: rows.filter(r => r.deltaPct < -.08).length,
      kcalPerCapNew: ds.nutrients.kcal * (1 + (newNeed ? availDelta / ds.totals.availFoodT : 0)),
      adaptationGainT: S.sum(rows.map(r => Math.max(0, r.prodBase - r.prodNew) * clamp(p.adaptation, 0, 100) / 100 * .62))
    };
  }

  /* ------------------------------------------------------------- prévision */
  function scenarioAdjust(series, kind, ds, opts) {
    const o = opts || {};
    const h = series.length;
    switch (kind) {
      case 'optimistic': return (v, i) => v * Math.pow(1 + .0165, i + 1);
      case 'climate': {
        const dT = o.dTemp == null ? 1.6 : o.dTemp, dR = o.dRain == null ? -12 : o.dRain;
        const st = o.sensitivity || [6.5, 11];
        const perYear = (-(dT / (o.horizon || 8)) * st[0] / 100 * 4.2 + (dR / (o.horizon || 8)) / 10 * st[1] / 100 * .5) * (1 - clamp(o.adaptation || 0, 0, 100) / 200);
        return (v, i) => v * Math.pow(1 + perYear, i + 1);
      }
      case 'plan': {
        const g = o.yieldGain || 0;              // % de production additionnelle / an
        const lg = o.lossGain || 0;              // points de pertes évités (sur le disponible)
        return (v, i) => v * Math.pow(1 + g, i + 1) + v * (lg / 100) * Math.min(1, (i + 1) / 3);
      }
      default: return v => v;
    }
  }
  /**
   * Prévision de la production (ou du disponible) d'un produit ou du national.
   * Renvoie historique + prévision + bandes P10/P90 + diagnostics de backtest.
   */
  function forecast(ds, config) {
    const c = Object.assign({ cropId: null, horizon: 6, scenario: 'baseline', confidence: .8, seasonal: false, dTemp: 1.6, dRain: -12, adaptation: 0, planGain: 0, planLossGain: 0, metric: 'productionT' }, config || {});
    const crop = c.cropId ? ds.crops.find(x => x.id === c.cropId) : null;
    const series = crop
      ? ds.history.years.map((y, i) => crop.productionT * Math.pow(1 + .031 - (ds.year - y) * .0008, -(ds.year - y)) * (1 - ds.history.climateRisk[i] / 100 * .06))
      : ds.history[c.metric] || ds.history.productionT;
    const years = ds.history.years.slice();
    const f = S.forecast(series, c.horizon, { season: c.seasonal ? 4 : 0 });
    const adj = scenarioAdjust(series, c.scenario, ds, {
      dTemp: c.dTemp, dRain: c.dRain, adaptation: c.adaptation, horizon: c.horizon,
      yieldGain: c.planGain, lossGain: c.planLossGain, sensitivity: crop ? crop.climateSensitivity : [6.5, 11]
    });
    const k = c.confidence === .95 ? { lo: 'lo95', hi: 'hi95' } : { lo: 'lo80', hi: 'hi80' };
    const futureYears = []; for (let i = 1; i <= c.horizon; i++) futureYears.push(ds.year + i);
    const point = f.point.map((v, i) => adj(v, i));
    const lo = f[k.lo].map((v, i) => adj(v, i)), hi = f[k.hi].map((v, i) => adj(v, i));
    const bt = S.backtest(series, { holdout: Math.min(4, Math.max(2, Math.floor(series.length / 4))) });
    const baseline = S.forecast(series, c.horizon, { season: 0 }).point;
    return {
      labels: years.concat(futureYears),
      history: series.concat(new Array(futureYears.length).fill(null)),
      point: new Array(years.length).fill(null).concat(point),
      lo: new Array(years.length).fill(null).concat(lo),
      hi: new Array(years.length).fill(null).concat(hi),
      baseline: new Array(years.length).fill(null).concat(baseline),
      forecastYears: futureYears, future: point, futureLo: lo, futureHi: hi,
      diagnostics: {
        mape: bt.mape, mae: bt.mae, r2: bt.r2, bias: bt.bias,
        trendPct: (S.linreg(years, series).slope / (S.mean(series) || 1)) * 100,
        lastValue: series[series.length - 1],
        targetValue: point[point.length - 1],
        cagr: (Math.pow(point[point.length - 1] / (series[series.length - 1] || 1), 1 / Math.max(1, c.horizon)) - 1) * 100
      },
      crop: crop ? { id: crop.id, fr: crop.fr, en: crop.en, icon: crop.icon, unit: 't' } : { id: 'national', fr: 'Production nationale', en: 'National production', icon: '🌍', unit: 't' },
      scenario: c.scenario, config: c,
      /** probabilité (modèle) que la production atteigne la cible */
      probAbove: (function (target) {
        const sd = f.model.residSd || 1;
        const z = (point[point.length - 1] - target) / Math.max(1e-6, sd * Math.sqrt(c.horizon));
        return clamp(.5 * (1 + erf(z / Math.SQRT2)) * 100, 0, 100);
      })(crop ? (crop.needT || crop.productionT) : ds.totals.needT)
    };
  }
  function erf(x) {
    const s = Math.sign(x); x = Math.abs(x);
    const a1 = .254829592, a2 = -.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = .3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return s * y;
  }

  /* ---------------------------------------------------------- Monte-Carlo */
  function monteCarlo(ds, config) {
    const c = Object.assign({ runs: 10000, horizon: 5, lossTarget: 10, plan: null }, config || {});
    const plan = c.plan;
    const baseProd = ds.totals.productionT;
    const baseLoss = ds.totals.lossPct;
    const need = ds.totals.needT * Math.pow(1.0245, c.horizon);
    const trend = .031;
    const lossPlan = plan ? plan.lossPctAfter : baseLoss;
    const yieldPlan = plan ? (1 + (plan.extraProdT / Math.max(1, baseProd))) : 1;
    const samples = S.monteCarlo(function (r) {
      const climate = (r() + r() + r() - 1.5) * .58;            // ~N(0,0.5) approx
      const yieldNoise = (r() - .5) * .11;
      const adoption = .85 + r() * .3;
      const prod = baseProd * Math.pow(1 + trend, c.horizon) * (1 - climate * .075) * (1 + yieldNoise) * yieldPlan * adoption;
      const lossPct = clamp(lossPlan * (1 + climate * .06) + (r() - .5) * 1.6, 3, 45);
      const avail = prod * (1 - lossPct / 100);
      const price = 1 + Math.abs(r() - .5) * .5 + Math.abs(climate) * .4;
      return { ss: need ? avail / need * 100 : 100, gap: Math.max(0, need - avail), lossPct, prod, price };
    }, c.runs);
    const ss = samples.map(s => s.ss);
    const hist = S.histogram(ss, 26);
    const bad = samples.filter(s => s.ss < 100).length;
    return {
      runs: c.runs, horizon: c.horizon,
      ss: { p10: S.quantile(ss, .1), p50: S.quantile(ss, .5), p90: S.quantile(ss, .9), mean: S.mean(ss), sd: S.sd(ss) },
      gap: { p10: S.quantile(samples.map(s => s.gap), .1), p50: S.quantile(samples.map(s => s.gap), .5), p90: S.quantile(samples.map(s => s.gap), .9) },
      loss: { p10: S.quantile(samples.map(s => s.lossPct), .1), p50: S.quantile(samples.map(s => s.lossPct), .5), p90: S.quantile(samples.map(s => s.lossPct), .9) },
      probShortfall: bad / samples.length * 100,
      probLossAboveTarget: samples.filter(s => s.lossPct > c.lossTarget).length / samples.length * 100,
      histogram: hist, samples,
      need: need
    };
  }

  /* -------------------------------------------------- catalogue de mesures */
  const MEASURE_LIB = [
    { id: 'cold', icon: '❄️', fr: 'Chaîne du froid solaire (chambres froides + véhicules)', en: 'Solar cold chain', cat: 'loss', color: '#3fc8f0', lever: 'coldChain', unit: 'région', costKey: 'coldChain', targets: ['fruits_veg', 'animal', 'tubers'], impact: 45 },
    { id: 'storage', icon: '🏭', fr: 'Stockage amélioré (silos, entrepôts aérés)', en: 'Improved storage (silos, aerated warehouses)', cat: 'loss', color: '#c9ee59', lever: 'storage', unit: 'région', costKey: 'storage', targets: ['cereals', 'legumes', 'oilseeds'], impact: 38 },
    { id: 'roads', icon: '🛣️', fr: 'Pistes rurales & logistique de collecte', en: 'Rural roads & collection logistics', cat: 'loss', color: '#f5b642', lever: 'transport', unit: 'région', costKey: 'transport', targets: ['*'], impact: 26 },
    { id: 'processing', icon: '⚙️', fr: 'Transformation locale (séchage, mouture, conservation)', en: 'Local processing (drying, milling, preservation)', cat: 'loss', color: '#a78bfa', lever: 'processing', unit: 'région', costKey: 'processing', targets: ['tubers', 'fruits_veg', 'cereals'], impact: 30 },
    { id: 'market', icon: '🏪', fr: 'Marchés structurés & contrats acheteurs', en: 'Structured markets & buyer contracts', cat: 'loss', color: '#f472b6', lever: 'market', unit: 'région', costKey: 'market', targets: ['*'], impact: 22 },
    { id: 'training', icon: '👩🏾‍🌾', fr: 'Formation récolte / battage / tri des producteurs', en: 'Harvest, threshing & sorting training', cat: 'loss', color: '#18d67f', lever: 'harvest', unit: 'région', costKey: 'harvest', targets: ['*'], impact: 20 },
    { id: 'irrigation', icon: '💧', fr: 'Irrigation à petite échelle & maîtrise de l’eau', en: 'Small-scale irrigation & water control', cat: 'production', color: '#3fc8f0', lever: 'irrigation', unit: 'région', costKey: 'irrigation', targets: ['cereals', 'fruits_veg'], impact: 16 },
    { id: 'seed', icon: '🌱', fr: 'Semences améliorées / résilientes au climat', en: 'Improved & climate-resilient seed', cat: 'production', color: '#c9ee59', lever: 'seed', unit: 'région', costKey: 'seed', targets: ['cereals', 'legumes'], impact: 12 },
    { id: 'extension', icon: '📱', fr: 'Conseil agricole numérique (alertes, météo, prix)', en: 'Digital advisory (alerts, weather, prices)', cat: 'production', color: '#a78bfa', lever: 'extension', unit: 'région', costKey: 'extension', targets: ['*'], impact: 7 },
    { id: 'biofort', icon: '🧬', fr: 'Biofortification (maïs, patate douce, mil, niébé)', en: 'Biofortification (maize, sweet potato, millet, cowpea)', cat: 'nutrition', color: '#18d67f', lever: 'biofort', unit: 'région', costKey: 'biofort', targets: ['cereals', 'tubers', 'legumes'], impact: 18 },
    { id: 'schoollunch', icon: '🍲', fr: 'Restauration scolaire à approvisionnement local', en: 'Home-grown school feeding', cat: 'nutrition', color: '#f5b642', lever: 'market', unit: 'région', costKey: 'market', targets: ['cereals', 'legumes', 'fruits_veg'], impact: 15 }
  ];

  /**
   * Construit le catalogue chiffré des mesures pour le pays :
   * chaque mesure est évaluée seule (kg sauvés, valeur, coût, BCR, délai).
   */
  function interventions(ds, opts) {
    const o = Object.assign({ max: 18 }, opts || {});
    const regions = ds.regions.slice().sort((a, b) => b.lossT - a.lossT);
    const list = [];
    MEASURE_LIB.forEach(m => {
      regions.slice(0, 4).forEach(reg => {
        const lev = {}; lev[m.lever] = m.lever === 'coldChain' ? .55 : .5;
        const sim = lossSim(ds, lev);
        const regShare = reg.share * (reg.lossPct / Math.max(1, ds.totals.lossPct));
        const savedT = sim.savedT * clamp(regShare * 1.5, .05, .8);
        const value = savedT * (ds.totals.valueUsd / Math.max(1, ds.totals.productionT));
        const costFull = sim.cost[m.costKey] || sim.investmentUsd * .5;
        const cost = Math.max(120000, costFull * clamp(regShare * 1.8, .1, .85) * (m.cat === 'nutrition' ? 1.2 : 1));
        const om = cost * .06;
        const annualBenefit = value - om + (m.cat === 'production' ? value * .25 : 0);
        const npv = (function () { let v = -cost; for (let y = 1; y <= 10; y++) v += annualBenefit / Math.pow(1.09, y); return v; })();
        list.push({
          ...m, region: reg.name, regionShare: regShare,
          savedT, valueUsd: value, costUsd: cost, omUsd: om,
          bcr: cost ? npv / cost + 1 : 0, npv,
          payback: annualBenefit > 0 ? cost / annualBenefit : null,
          peopleYear: savedT * 1e6 * .6 / (2100 * 365) / 1000 * 1000,
          jobs: Math.round(cost / 16000),
          co2T: savedT * 1.7,
          delay: m.cat === 'loss' ? 1 : m.cat === 'production' ? 2 : 1,
          score: 0
        });
      });
    });
    /* score composite : bénéfice / coût, équité (régions à fortes pertes), nutrition */
    const maxBcr = Math.max.apply(null, list.map(x => x.bcr)) || 1;
    list.forEach(x => {
      x.score = clamp(
        (x.bcr / maxBcr) * 46 +
        clamp(x.savedT / Math.max(1, ds.totals.lossT) * 320, 0, 26) +
        (x.cat === 'nutrition' ? 14 : 0) +
        clamp(x.regionShare * 44, 0, 14), 0, 100);
    });
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, o.max);
  }

  /** Optimisation sous contrainte budgétaire (sac à dos glouton par rendement). */
  function optimizeBudget(ds, catalogue, budgetUsd, opts) {
    const o = Object.assign({ priority: 'balanced' }, opts || {});
    const remaining = catalogue.slice();
    let budget = budgetUsd, chosen = [];
    while (remaining.length && budget > 0) {
      let best = null, bestRatio = -1;
      remaining.forEach(x => {
        const ratio = (x.savedT * (ds.totals.valueUsd / Math.max(1, ds.totals.productionT)) +
          (o.priority === 'nutrition' ? x.savedT * 260 : 0) + (o.priority === 'jobs' ? x.jobs * 900 : 0)) / x.costUsd;
        if (x.costUsd <= budget && ratio > bestRatio) { bestRatio = ratio; best = x; }
      });
      if (!best) break;
      chosen.push(best);
      budget -= best.costUsd;
      remaining.splice(remaining.indexOf(best), 1);
      if (chosen.length >= 10) break;
    }
    const lev = {};
    chosen.forEach(x => { lev[x.lever] = clamp((lev[x.lever] || 0) + .28, 0, 1); });
    const sim = lossSim(ds, lev);
    return {
      plan: chosen, levers: lev, spentUsd: budgetUsd - budget, remainingUsd: budget, sim,
      savedT: S.sum(chosen.map(x => x.savedT)) * .82,
      valueUsd: S.sum(chosen.map(x => x.valueUsd)) * .82,
      jobs: S.sum(chosen.map(x => x.jobs)),
      peopleYear: S.sum(chosen.map(x => x.peopleYear)) * .82
    };
  }

  /* ------------------------------------------------------------- nutrition */
  function nutritionGap(ds) {
    const n = ds.nutrients;
    /* `max` = repère moyen de la population (FAO/OMS) ; `vuln` = repère des groupes
       vulnérables (femmes en âge de procréer / jeunes enfants), qui est le repère
       utilisé en santé publique pour juger d'une carence. */
    const keys = [
      { k: 'kcal', fr: 'Énergie (kcal/hab/j)', en: 'Energy (kcal/cap/d)', unit: 'kcal', max: 2100, vuln: 2250, color: '#c9ee59', gapKey: 'kcal' },
      { k: 'prot', fr: 'Protéines (g/hab/j)', en: 'Protein (g/cap/d)', unit: 'g', max: 52, vuln: 57, color: '#18d67f' },
      { k: 'fe', fr: 'Fer (mg/hab/j)', en: 'Iron (mg/cap/d)', unit: 'mg', max: 11.5, vuln: 24, color: '#ff6b5e' },
      { k: 'va', fr: 'Vitamine A (µg/hab/j)', en: 'Vitamin A (µg/cap/d)', unit: 'µg', max: 480, vuln: 700, color: '#f5b642' },
      { k: 'zn', fr: 'Zinc (mg/hab/j)', en: 'Zinc (mg/cap/d)', unit: 'mg', max: 8.2, vuln: 9.8, color: '#a78bfa' }
    ];
    const rows = keys.map(x => {
      const crit = ds.crops.filter(c => c.group !== 'cash').map(c => ({ c, contrib: (c.consumedT * 1000) * (c.nut[x.k] || 0) })).sort((a, b) => b.contrib - a.contrib);
      const tot = S.sum(crit.map(y => y.contrib)) || 1;
      return {
        ...x, available: n[x.k], need: x.max, coverage: clamp(n[x.k] / x.max * 100, 0, 200),
        needVuln: x.vuln, coverageVuln: clamp(n[x.k] / x.vuln * 100, 0, 200),
        contributors: crit.slice(0, 5).map(y => ({ id: y.c.id, fr: y.c.fr, en: y.c.en, icon: y.c.icon, share: y.contrib / tot * 100 }))
      };
    });
    /* chaîne ferme → assiette → santé */
    const food = ds.crops.filter(c => c.group !== 'cash');
    const prod = S.sum(food.map(c => c.productionT));
    const lost = S.sum(food.map(c => c.lossT));
    const avail = S.sum(food.map(c => c.totalAvailT));
    const consumed = S.sum(food.map(c => c.consumedT));
    const chain = [
      { fr: 'Production', en: 'Production', value: prod, unit: 't' },
      { fr: 'Pertes post-récolte', en: 'Post-harvest losses', value: lost, unit: 't', bad: true },
      { fr: 'Disponible (import/export)', en: 'Available (trade adj.)', value: avail, unit: 't' },
      { fr: 'Consommé (pertes ménages)', en: 'Consumed (household waste)', value: consumed, unit: 't' },
      { fr: 'Énergie livrée / an', en: 'Energy delivered / yr', value: row('kcal'), unit: 'kcal', people: true }
    ];
    function row(k) { return (n[k] * ds.totals.population * 1e6 * 365) / 1e3; } // milliers kcal
    const worst = r => Math.min(r.coverage, r.coverageVuln);
    const critical = rows.filter(r => worst(r) < 90).sort((a, b) => worst(a) - worst(b));
    const gapsMean = rows.filter(r => r.coverage < 90).map(r => r.fr.split(' (')[0]);
    const gapsVuln = rows.filter(r => r.coverageVuln < 90).map(r => r.fr.split(' (')[0]);
    const pop = ds.totals.population * 1e6;
    const undern = ds.profile.undernourish || 0;
    let summary;
    if (!critical.length) {
      summary = { fr: 'Tous les nutriments suivis au-dessus des repères, y compris pour les groupes vulnérables', en: 'All tracked nutrients above reference, including for vulnerable groups' };
    } else if (!gapsMean.length) {
      summary = {
        fr: 'Disponibilité moyenne suffisante mais repères des groupes vulnérables non atteints : ' + gapsVuln.join(', '),
        en: 'Average availability sufficient, but vulnerable-group references not met: ' + gapsVuln.join(', ')
      };
    } else {
      summary = {
        fr: 'Déficits modélisés sous le repère moyen : ' + gapsMean.join(', ') + (gapsVuln.length ? ' — groupes vulnérables : ' + gapsVuln.join(', ') : ''),
        en: 'Modelled gaps below the average reference: ' + gapsMean.join(', ') + (gapsVuln.length ? ' — vulnerable groups: ' + gapsVuln.join(', ') : '')
      };
    }
    return {
      rows, chain, critical, gapsMean, gapsVuln,
      undernourished: undern, peopleUndernourished: pop * undern / 100,
      score: clamp(S.mean(rows.map(r => clamp(worst(r), 0, 150))) * .78, 0, 100),
      summary
    };
  }

  /* ----------------------------------------------------------- sensibilité */
  function sensitivity(ds) {
    const drivers = [
      { id: 'rain', fr: 'Pluviométrie (-10 %)', en: 'Rainfall (-10%)', delta: climateStress(ds, { dRain: -10, dTemp: 0 }).prodDeltaT },
      { id: 'rain_up', fr: 'Pluviométrie (+10 %)', en: 'Rainfall (+10%)', delta: climateStress(ds, { dRain: 10, dTemp: 0 }).prodDeltaT },
      { id: 'temp', fr: 'Température (+1 °C)', en: 'Temperature (+1°C)', delta: climateStress(ds, { dTemp: 1, dRain: 0 }).prodDeltaT },
      { id: 'loss', fr: 'Pertes post-récolte (+5 pts)', en: 'Post-harvest loss (+5 pts)', delta: -ds.totals.productionT * .05 },
      { id: 'area', fr: 'Surfaces cultivées (-5 %)', en: 'Cultivated area (-5%)', delta: -ds.totals.productionT * .05 },
      { id: 'yield', fr: 'Rendement (-5 %)', en: 'Yield (-5%)', delta: -ds.totals.productionT * .05 },
      { id: 'fert', fr: 'Intrants/fertilisants (-20 %)', en: 'Inputs/fertilizer (-20%)', delta: -ds.totals.productionT * .062 },
      { id: 'price', fr: 'Prix alimentaires (+20 %)', en: 'Food prices (+20%)', delta: -ds.totals.productionT * .018 }
    ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const worst = S.sum(drivers.filter(d => d.delta < 0).map(d => d.delta));
    return { drivers, worstCaseT: worst, worstCasePct: worst / Math.max(1, ds.totals.productionT) * 100 };
  }

  /* --------------------------------------------------------------- note */
  function brief(ds, ctx) {
    const c = ctx || {};
    const lang = c.lang === 'en' ? 'en' : 'fr';
    const t = ds.totals, n = ds.nutrients, L = lang === 'en';
    const lossPct = t.lossPct, ss = t.selfSufficiency;
    const f = L ? F : F;
    const lines = [];
    lines.push(L
      ? `SUMMARY — ${ds.countryName} agrifood situation ${ds.year} (modelled estimates)`
      : `SYNTHÈSE — Situation agro-alimentaire ${ds.countryName} ${ds.year} (estimations modélisées)`);
    lines.push(L
      ? `• Gross agricultural production: ${f.tons(t.productionT)} on ${f.ha(t.areaHa)} (average yield ${f.num(t.avgYield, 2)} t/ha).`
      : `• Production agricole brute : ${f.tons(t.productionT)} sur ${f.ha(t.areaHa)} (rendement moyen ${f.num(t.avgYield, 2)} t/ha).`);
    lines.push(L
      ? `• Post-harvest losses: ${f.tons(t.lossT)} (${f.pct(lossPct)}) ≈ ${f.money(t.lossValueUsd, ds.country)} of lost value.`
      : `• Pertes post-récolte : ${f.tons(t.lossT)} (${f.pct(lossPct)}) ≈ ${f.money(t.lossValueUsd, ds.country)} de valeur perdue.`);
    lines.push(L
      ? `• Food self-sufficiency: ${f.pct(ss)}; remaining gap ${f.tons(t.gapT)}; imports ${f.tons(t.importT)}.`
      : `• Autosuffisance alimentaire : ${f.pct(ss)} ; écart résiduel ${f.tons(t.gapT)} ; importations ${f.tons(t.importT)}.`);
    lines.push(L
      ? `• Nutrients available per capita/day: ${f.num(n.kcal, 0)} kcal, ${f.num(n.prot, 1)} g protein, ${f.num(n.fe, 1)} mg iron, ${f.num(n.va, 0)} µg vitamin A.`
      : `• Nutriments disponibles par habitant/jour : ${f.num(n.kcal, 0)} kcal, ${f.num(n.prot, 1)} g de protéines, ${f.num(n.fe, 1)} mg de fer, ${f.num(n.va, 0)} µg de vitamine A.`);
    if (c.plan) {
      lines.push(L
        ? `• Investment plan: ${f.money(c.plan.investmentUsd, ds.country)} → ${f.tons(c.plan.savedT)} saved/year (${f.num(c.plan.peopleYear, 0)} people fed), BCR ${f.num(c.plan.bcr, 2)}, IRR ${isFinite(c.plan.irr) ? f.pct(c.plan.irr * 100, 0) : 'n/a'}.`
        : `• Plan d'investissement : ${f.money(c.plan.investmentUsd, ds.country)} → ${f.tons(c.plan.savedT)} sauvées/an (${f.num(c.plan.peopleYear, 0)} personnes nourries), RAC ${f.num(c.plan.bcr, 2)}, TRI ${isFinite(c.plan.irr) ? f.pct(c.plan.irr * 100, 0) : 'n/a'}.`);
    }
    if (c.mc) {
      lines.push(L
        ? `• Stochastic simulation (${f.int(c.mc.runs)} runs): probability of shortfall ${f.pct(c.mc.probShortfall)}, median self-sufficiency ${f.pct(c.mc.ss.p50)} (P10 ${f.pct(c.mc.ss.p10)} / P90 ${f.pct(c.mc.ss.p90)}).`
        : `• Simulation stochastique (${f.int(c.mc.runs)} tirages) : probabilité de déficit ${f.pct(c.mc.probShortfall)}, autosuffisance médiane ${f.pct(c.mc.ss.p50)} (P10 ${f.pct(c.mc.ss.p10)} / P90 ${f.pct(c.mc.ss.p90)}).`);
    }
    lines.push(L
      ? `• Data gaps to close with the Ministry: ${ds.dataQuality.gaps.filter(g => g.status === 'missing').length} critical datasets missing (losses by stage, laboratory composition, farmer registry).`
      : `• Lacunes de données à combler avec le Ministère : ${ds.dataQuality.gaps.filter(g => g.status === 'missing').length} jeux critiques manquants (pertes par étape, composition en laboratoire, registre des producteurs).`);
    lines.push(L
      ? 'All figures are modelled demonstration estimates and must be validated with national sources before official use.'
      : 'Toutes les valeurs sont des estimations modélisées de démonstration et doivent être validées avec les sources nationales avant usage officiel.');
    return lines.join('\n');
  }

  w.NUTRI_AGRI_MODELS = {
    waterfall, lossByStage, lossSim, climateStress, forecast, monteCarlo,
    interventions, optimizeBudget, nutritionGap, sensitivity, brief,
    MEASURE_LIB, WATER_FP, CO2_FP,
    /** utilitaire : couverture d'un nutriment en % du besoin */
    coverage: (ds, key) => { const n = ds.nutrients; const need = n.need[key]; return need ? n[key] / need * 100 : 100; }
  };
})(window);
