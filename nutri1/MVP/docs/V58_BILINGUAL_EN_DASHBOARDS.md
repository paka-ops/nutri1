# V58 — Full English localization of the institutional dashboards (bilingual EN/FR MVP)

## Objective

The MVP was French-only inside its six institutional dashboards. V58 makes the
whole `MVP/web` application fully usable in **English** while keeping the
**French** experience strictly unchanged.

## What was delivered

### 1. New non-destructive translation layer (`assets/institutional-i18n*.js`)

The six embedded institutional dashboards (WHO NutriTracker, WFP NutriTracker,
FAO AgriNutriApp, UNICEF NutriChild, NutriApp Santé / Ministère de la Santé,
AgriNutri Intelligence / Ministère de l'Agriculture) are authored in French in
isolated Shadow DOM components (Canvas charts, HTML tooltips, CSV/PDF exports).
V58 adds two new files loaded by `index.html`:

- `assets/institutional-i18n.js` — a FR→EN dictionary (~1,050 entries) covering
  every UI label, chart title, axis, legend, threshold, status, month name,
  crop, indicator, insight narrative and export header of the six dashboards.
- `assets/institutional-i18n-engine.js` — the activation engine:
  - active whenever the platform locale is not French; French originals are
    cached and restored instantly when switching back to French;
  - translates DOM text, placeholders, titles and ARIA labels inside each
    Shadow DOM (MutationObserver per shadow root + document body);
  - patches `CanvasRenderingContext2D.fillText/strokeText` so every chart
    label, tick, legend and Canvas tooltip renders in English, and dashboards
    are redrawn on language change;
  - patches `Blob` (CSV exports) and `window.open → document.write` (printable
    PDF reports) so exports are fully English, including the CSV header row;
  - switches French (`fr-FR`) number formatting to English formatting.

### 2. Locale packs completed (`locales/*.json`)

- `en.json` had 124 missing keys compared to `fr.json` — added (English text).
- `fr.json` — completed the French translations for all `ui.*` keys that were
  still displayed in English (nav, forms, buttons, family/patient panels…).
- `es.json`, `ewe.json`, `kab.json` — key parity restored (824 keys each);
  `tools/validate_i18n.py` passes again.
- `index.html` embedded `NUTRI_EMBEDDED_LOCALES` re-synced with the packs.

### 3. Language switcher made reliable (root cause of "English not present")

- Selecting a language by display name ("English", "Français", "Eʋegbe / Ewe"…)
  used to crash `NUTRI_I18N.setLocale` (`locales/english.json` 404) and the
  interface silently stayed French. Locale codes are now resolved through an
  alias table, and an unknown pack falls back to English instead of throwing.
- `countryChanged()` now emits `<option value="en|fr|ewe|kab|…">` codes for the
  language selector instead of bare display names.

### 4. Pre-existing breakages repaired (console-clean boot)

- `updateReferences`, `saveCitizen`, `generateRecommendations`, `chooseRole`,
  `connectDevice`, `runSync`, `runScan`, `generatePlan`,
  `startTeleconsultation`, `manageAppointments`, `sendChat` were missing while
  still referenced by live buttons — restored in an additive
  `nutri-core-actions` script (only defined when absent, so versioned layers
  keep priority).
- `filterMarket()` crashed at boot (`#marketProducts` no longer exists),
  aborting the patient dashboard, family dashboard and nutritionist rendering —
  guarded.
- V48 country/language engine was dead: `'CI",'ivory coast'` quote typo — fixed.
- V34 re-apply used `this.setLocale` inside a plain callback — fixed.
- V44 investor layer threw `InvalidCharacterError` on dataset keys with spaces —
  fixed.
- V29 translator crashed on `WeakMap.forEach` — guarded (behavior preserved).

## Verification performed

- `node --check` on every touched/created JS file; JSON validity of all packs.
- Automated jsdom audit of the full application in both languages:
  - **EN**: 0 untranslated French strings across DOM, Canvas charts, tooltips,
    CSV exports and PDF reports (place and person names excepted);
  - **FR**: all original French strings preserved byte-for-byte.
- `tools/validate_i18n.py`: OK 824 keys for fr/es/ewe/kab.
- `tools/nvtest/smoke-sections`: improved from 6 to 4 failed points versus the
  base commit (remaining points test components removed in earlier versions);
  the three other suites fail identically on base and here (they target the
  pre-V50 NutriVision/NUTRI_WHO/NutriUnicef kernels).
