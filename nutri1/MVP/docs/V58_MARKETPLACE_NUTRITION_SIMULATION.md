# NUTRI.N°1 V58 — Marketplace Nutrition Simulation

Built on V50/V56. Additive layer inside `web/index.html`, scoped to `#marketplace`.

The Healthy Food & Nutrition Marketplace now behaves like the **AI Nutrition & Prevention Engine**: a live, explainable simulation instead of a static product grid. Every product is detailed in terms of nutritional contribution, with circular (donut) composition charts.

## Modules

- **Immersive command center** — hub bar with live status/LED/alerts/clock, global controls (run analysis, quick scan, auto-analysis, country, goal, guided demo, export), 4 live KPIs, progress bar and 8-step pipeline (Catalogue → Context → Match → Composition → Energy split → Micronutrients → Prevention → Basket).
- **African composition catalogue** — 24 local products (TG, SN, GH, BF, NG, CI) with per-100 g composition: energy, protein, carbohydrate, sugars, fat, saturates, fiber, sodium, potassium, calcium, iron, zinc, vitamin A, vitamin C, folate, magnesium, glycemic index, serving size.
- **Product nutrition analysis** — per-product panel with score /100, category, origin, data confidence, tags and **three donut charts**:
  - energy split (% kcal from protein / carbohydrate / fat),
  - macro composition in grams (protein / carbohydrate / fiber / fat),
  - micronutrient coverage (% NRV per serving).
- **Full composition table** — per 100 g, per serving and % NRV, with the NRV references of EU Regulation 1169/2011.
- **Goal matching** — live match score and bar for six contexts: balanced, diabetes-aware, hypertension-aware, child, maternal, weight management.
- **Prevention layer** — goal-aware signals (sodium, sugars, glycemic index, fiber, protein, vitamin A, iron, folate, calcium, supplements, oils, portion warnings), mirrored into an alerts drawer.
- **Basket simulation** — quantities, estimated total, household energy share by product (donut), basket macro composition (donut), coverage bars, basket-level prevention check and auto-fill of a balanced basket.
- **Nutrition sheet (per product)** — full-page sheet with serving simulator: moving the slider recomputes every chart, coverage bar, goal match and table live; plus traceability chain (farm → family) and batch/origin.
- **Session memory** — analysed products persisted locally (`nutri_market_immersive_v1`), clearable, used by the KPI counters.
- **Guided demo** — autopilot scenario (Togo household): diabetes goal → orange-fleshed sweet potato, child goal → fortified infant flour, hypertension goal → sodium alert, balanced basket, full pipeline run.
- **Export** — CSV of the whole composition database (per 100 g, scores, goal match, GI).

## Integration

- Purely additive: legacy marketplace cards, clinical food path, cart, trace and checkout blocks are untouched.
- Legacy product cards are decorated automatically (MutationObserver) with a mini energy-split donut, per-serving kcal, three coverage bars, score chip and a “Nutrition sheet · charts” button.
- The legacy “Trace & details” and “Nutrition details” buttons now open the immersive nutrition sheet when the product exists in the composition catalogue.
- Country + category filters degrade gracefully to regional alternatives instead of showing an empty grid.
- Bilingual EN/FR, follows the existing platform language engine (`nutri_language`, `nutri:i18nChanged`).
- Dependency-free charts: inline SVG donuts (no Chart.js requirement), responsive breakpoints and `prefers-reduced-motion` support.

## Data & positioning

- Composition values are **illustrative simulation values** aligned with published African food composition data; they must be replaced by validated national food composition tables before production use.
- NRV references are European defaults used as guidance; national references can be swapped in the `NUTRIENTS` table inside the module.
- Not a medical device: portions, supplements and clinical contexts require professional confirmation.
