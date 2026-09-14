"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const M = require("../../web/assets/health/model.js");
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
test("deterministic and does not mutate inputs or presets", () => {
  const input = { ...M.defaults },
    before = JSON.stringify(input);
  assert.deepEqual(M.simulate(input), M.simulate(input));
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(M.simulate(), M.simulate(M.defaults));
});
test("status quo has no expenditure, no artificial benefit and no undefined ratio", () => {
  const s = M.simulate(M.presets.reference);
  ["cost", "benefit", "npv", "totalAvoided", "setup"].forEach((k) =>
    assert.equal(s[k], 0),
  );
  assert.equal(s.bcr, null);
  assert.equal(s.payback, null);
  s.annual.forEach((r) => close(r.baseline, r.programme));
  assert.deepEqual(s.children, s.childrenBase);
  assert.deepEqual(s.women, s.womenBase);
});
test("zero budget never delivers free modeled health effects", () => {
  const s = M.simulate({ budget: 0 });
  assert.equal(s.funding, 0);
  assert.equal(s.totalAvoided, 0);
  assert.equal(s.cost, 0);
  assert.equal(s.screened, 0);
  assert.deepEqual(s.children, s.childrenBase);
  assert.deepEqual(s.women, s.womenBase);
});
test("no requested programme means no setup expense even with budget available", () => {
  const s = M.simulate({ ...M.presets.reference, budget: 30 });
  assert.equal(s.setup, 0);
  assert.equal(s.cost, 0);
});
test("financial totals reconcile against each annual cash flow", () => {
  const s = M.simulate();
  const sum = (k) => s.annual.reduce((a, r) => a + r[k], 0);
  close(s.cost, sum("cost"));
  close(s.benefit, sum("benefit"));
  close(s.totalAvoided, sum("avoided"));
  close(s.annual.at(-1).cumulative, s.benefit - s.cost);
  close(
    s.pvCost,
    s.annual.reduce((a, r, i) => a + r.cost / 1.08 ** i, 0),
  );
  close(
    s.pvBenefit,
    s.annual.reduce((a, r, i) => a + r.benefit / 1.08 ** i, 0),
  );
  close(s.npv, s.pvBenefit - s.pvCost);
  close(s.bcr, s.pvBenefit / s.pvCost);
});
test("allocations and synthetic territories reconcile to mature annual spend", () => {
  const s = M.simulate();
  const deployed = s.allocations.reduce((a, b) => a + b, 0);
  close(deployed, s.annual.at(-1).cost);
  close(
    deployed,
    s.regions.reduce((a, r) => a + r.allocation, 0),
  );
  assert.ok(deployed <= s.inputs.budget * 1e6 + 1e-6);
});
test("funding saturates at 100% and budget shortfalls reduce benefits", () => {
  const low = M.simulate({ budget: 1 }),
    high = M.simulate({ budget: 30 });
  assert.ok(low.funding < high.funding);
  assert.equal(high.funding, 1);
  assert.ok(low.totalAvoided < high.totalAvoided);
  assert.ok(high.allocations.reduce((a, b) => a + b, 0) < 30e6);
});
test("three-year ramp reconciles baseline, programme and avoided events", () => {
  const s = M.simulate();
  assert.equal(s.annual.length, 6);
  s.annual.forEach((r, i) => {
    close(r.ramp, Math.min(1, i / 3));
    close(r.avoided, ((r.baseline - r.programme) / 1000) * s.adult);
  });
});
test("pressure uses the same counterfactual and reduces relative impact", () => {
  const a = M.simulate({ shock: 0 }),
    b = M.simulate({ shock: 100 });
  assert.ok(b.reduction < a.reduction);
  assert.ok(b.delivery < a.delivery);
  assert.ok(b.annual[1].baseline > a.annual[1].baseline);
});
test("care cascade is nested and bounded by the adult population", () => {
  const s = M.simulate();
  assert.ok(s.controlled <= s.followed);
  assert.ok(s.followed <= s.flagged);
  assert.ok(s.flagged <= s.screened);
  assert.ok(s.screened <= s.adult);
});
test("maternal outcomes react to maternal lever without being added to monetised NCD events", () => {
  const a = M.simulate({ budget: 30, maternal: 0 }),
    b = M.simulate({ budget: 30, maternal: 100 });
  assert.deepEqual(a.women, a.womenBase);
  assert.ok(b.women.every((v, i) => v < a.women[i]));
  close(a.totalAvoided, b.totalAvoided);
});
test("unit saving changes economic value, never clinical quantities", () => {
  const a = M.simulate({ unitSaving: 1200 }),
    b = M.simulate({ unitSaving: 2400 });
  close(b.benefit, a.benefit * 2);
  close(a.totalAvoided, b.totalAvoided);
  close(a.cost, b.cost);
});
test("zero avoidable unit cost yields no benefits but preserves programme cost", () => {
  const s = M.simulate({ unitSaving: 0 });
  assert.equal(s.benefit, 0);
  assert.equal(s.bcr, 0);
  close(s.npv, -s.pvCost);
});
test("zero discount reconciles NPV with nominal balance", () => {
  const s = M.simulate({ discount: 0 });
  close(s.npv, s.benefit - s.cost);
});
test("longer horizon accumulates events and exposes all annual rows", () => {
  const a = M.simulate({ horizon: 3 }),
    b = M.simulate({ horizon: 10 });
  assert.equal(b.annual.length, 11);
  assert.ok(b.totalAvoided > a.totalAvoided);
  assert.equal(b.annual.at(-1).year, 2036);
});
test("invalid inputs are bounded and non-finite inputs use defaults", () => {
  const s = M.simulate({
    population: Infinity,
    budget: -1,
    horizon: 100,
    screening: NaN,
    discount: 999,
    unitSaving: -5,
  });
  assert.equal(s.inputs.population, M.defaults.population);
  assert.equal(s.inputs.budget, 0);
  assert.equal(s.inputs.horizon, 10);
  assert.equal(s.inputs.screening, M.defaults.screening);
  assert.equal(s.inputs.discount, 20);
  assert.equal(s.inputs.unitSaving, 0);
});
test("all presets and extreme combinations stay finite, bounded and reconciled", () => {
  const cases = [...Object.values(M.presets)];
  for (const population of [100000, 10000000])
    for (const budget of [0, 30])
      for (const shock of [0, 100])
        for (const level of [0, 100])
          cases.push({
            population,
            budget,
            shock,
            screening: level,
            followup: level,
            nutrition: level,
            maternal: level,
            capacity: level,
            horizon: 10,
          });
  for (const input of cases) {
    const s = M.simulate(input);
    const walk = (o) => {
      for (const value of Object.values(o)) {
        if (typeof value === "number") assert.ok(Number.isFinite(value));
        else if (value && typeof value === "object") walk(value);
      }
    };
    walk(s);
    assert.ok(s.reduction >= 0 && s.reduction <= 0.45);
    s.annual.forEach((r) =>
      assert.ok(r.programme >= 0 && r.programme <= r.baseline),
    );
    close(s.npv, s.pvBenefit - s.pvCost);
  }
});
test("CSS selectors are scoped to health (no global selectors)", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "../../web/assets/health/cockpit.css"),
    "utf8",
  );
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{}]+\{/g) || [];
  rules.forEach((r) => {
    const selector = r.slice(0, -1).trim();
    if (selector.startsWith("@") || /^(0%|100%)$/.test(selector)) return;
    selector
      .split(",")
      .forEach((s) => assert.ok(s.trim().startsWith("#health"), s));
  });
});
