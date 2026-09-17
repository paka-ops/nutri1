/* NUTRI Health Lab v1 — illustrative, deterministic planning model.
 * No patient data, external services or validated epidemiological estimates.
 * Browser + Node export keeps the exact UI engine independently testable. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NutriHealthModel = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const defaults = Object.freeze({
    population: 1000000,
    budget: 6,
    screening: 65,
    followup: 70,
    nutrition: 60,
    maternal: 65,
    capacity: 75,
    shock: 0,
    horizon: 5,
    discount: 8,
    unitSaving: 2400,
  });
  const presets = Object.freeze({
    reference: {
      budget: 0,
      screening: 0,
      followup: 0,
      nutrition: 0,
      maternal: 0,
      capacity: 0,
      shock: 0,
    },
    national: {
      budget: 6,
      screening: 65,
      followup: 70,
      nutrition: 60,
      maternal: 65,
      capacity: 75,
      shock: 0,
    },
    prevention: {
      budget: 8,
      screening: 90,
      followup: 85,
      nutrition: 80,
      maternal: 45,
      capacity: 90,
      shock: 0,
    },
    maternal: {
      budget: 6,
      screening: 40,
      followup: 55,
      nutrition: 85,
      maternal: 95,
      capacity: 75,
      shock: 0,
    },
    crisis: {
      budget: 6,
      screening: 65,
      followup: 70,
      nutrition: 60,
      maternal: 65,
      capacity: 75,
      shock: 60,
    },
  });
  function clamp(value, min, max, fallback) {
    value = Number(value);
    return Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;
  }
  function normalize(input = {}) {
    const s = { ...defaults, ...input };
    Object.keys(defaults).forEach((k) => {
      s[k] = clamp(s[k], 0, 100, defaults[k]);
    });
    s.population = Math.round(
      clamp(
        input.population ?? defaults.population,
        100000,
        10000000,
        defaults.population,
      ),
    );
    s.budget = clamp(input.budget ?? defaults.budget, 0, 30, defaults.budget);
    s.horizon = Math.round(
      clamp(input.horizon ?? defaults.horizon, 3, 10, defaults.horizon),
    );
    s.discount = clamp(
      input.discount ?? defaults.discount,
      0,
      20,
      defaults.discount,
    );
    s.unitSaving = clamp(
      input.unitSaving ?? defaults.unitSaving,
      0,
      10000,
      defaults.unitSaving,
    );
    return s;
  }
  function simulate(input) {
    const s = normalize(input),
      p = s.population,
      adult = p * 0.6;
    const screen = s.screening / 100,
      follow = s.followup / 100,
      nut = s.nutrition / 100,
      mat = s.maternal / 100,
      cap = s.capacity / 100;
    // Full deployment annual costs (USD): screening, follow-up, nutrition,
    // maternal care, digital/field infrastructure. Budget is a ceiling, not spend.
    const desired = [
      adult * screen * 6,
      adult * screen * 0.2 * follow * 45,
      p * 0.12 * nut * 24,
      p * 0.04 * mat * 55,
      p * cap * 1.2,
    ];
    const demand = desired.reduce((a, b) => a + b, 0);
    const funding = demand ? Math.min(1, (s.budget * 1e6) / demand) : 0;
    const delivery = (0.4 + 0.6 * cap) * (1 - (0.45 * s.shock) / 100);
    const effect = funding * delivery;
    const reduction = Math.min(
      0.45,
      (0.24 * screen * follow + 0.18 * nut) * effect,
    );
    const setup = demand ? s.budget * 1e6 * 0.15 : 0;
    let pvCost = setup,
      pvBenefit = 0,
      cumulative = -setup,
      totalAvoided = 0,
      cost = setup,
      benefit = 0;
    const annual = [
      {
        year: 2026,
        baseline: 28 * (1 + (0.25 * s.shock) / 100),
        programme: 28 * (1 + (0.25 * s.shock) / 100),
        avoided: 0,
        cost: setup,
        benefit: 0,
        net: -setup,
        cumulative,
        ramp: 0,
      },
    ];
    for (let i = 1; i <= s.horizon; i++) {
      const ramp = Math.min(1, i / 3),
        baseline = 28 * (1 + (0.25 * s.shock) / 100) * Math.pow(1.015, i);
      const programme = baseline * (1 - reduction * ramp),
        avoided = ((baseline - programme) / 1000) * adult;
      const yearlyCost = demand * funding * ramp,
        yearlyBenefit = avoided * s.unitSaving;
      const net = yearlyBenefit - yearlyCost;
      cumulative += net;
      totalAvoided += avoided;
      cost += yearlyCost;
      benefit += yearlyBenefit;
      pvCost += yearlyCost / Math.pow(1 + s.discount / 100, i);
      pvBenefit += yearlyBenefit / Math.pow(1 + s.discount / 100, i);
      annual.push({
        year: 2026 + i,
        baseline,
        programme,
        avoided,
        cost: yearlyCost,
        benefit: yearlyBenefit,
        net,
        cumulative,
        ramp,
      });
    }
    const screened = adult * screen * effect,
      flagged = screened * 0.2,
      followed = flagged * follow,
      controlled = followed * (0.45 + 0.3 * nut);
    const childrenBase = [24, 9, 12],
      womenBase = [36, 29, 17];
    const children = childrenBase.map(
      (v, i) => v * (1 - [0.28, 0.34, 0.2][i] * nut * effect),
    );
    const women = womenBase.map(
      (v, i) => v * (1 - [0.32, 0.28, 0.25][i] * mat * effect),
    );
    const regions = [1.3, 1.18, 1.08, 0.97, 0.84, 0.63].map((risk, i) => {
      const coverage = Math.min(100, screen * effect * (1.15 - i * 0.07) * 100);
      return {
        id: i,
        risk: 28 * risk * (1 + (0.25 * s.shock) / 100),
        coverage,
        after:
          28 *
          risk *
          (1 + (0.25 * s.shock) / 100) *
          (1 - reduction * (1.15 - i * 0.07)),
        allocation: (demand * funding * risk) / 6,
      };
    });
    return {
      inputs: s,
      annual,
      adult,
      demand,
      funding,
      delivery,
      reduction,
      setup,
      cost,
      benefit,
      pvCost,
      pvBenefit,
      npv: pvBenefit - pvCost,
      bcr: pvCost ? pvBenefit / pvCost : null,
      totalAvoided,
      allocations: desired.map((v) => v * funding),
      screened,
      flagged,
      followed,
      controlled,
      childrenBase,
      children,
      womenBase,
      women,
      regions,
      payback:
        annual.find((r, i) => i > 0 && r.cumulative >= 0 && setup > 0)?.year ??
        null,
    };
  }
  return Object.freeze({
    defaults,
    presets,
    normalize,
    simulate,
    version: "health-1.0",
  });
});
