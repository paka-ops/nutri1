# NUTRI.N°1 V59 — Dark Bento front end

V59 replaces the V16–V57 inline front end of `web/index.html` with a modular one. It is a
front-end demonstrator: nothing is sent to a server and no API is online.

## Structure (`web/`)

| Path | Role |
| --- | --- |
| `index.html` | App shell, 18 view sections, the core legacy script (navigation, country list, delegations) |
| `styles/bento-design-system.css` | Tokens, shell, cards, buttons, form controls |
| `styles/views.css` | One block per view, plus the shared institution block |
| `styles/legacy-layout.css` | What is left of the old layout rules (selectors still in use only) |
| `styles/theme-light.css`, `js/bento-theme.js` | Optional light theme (`<html data-theme="light">`), toggle in the header, stored in `localStorage` (`nutri_theme`). Dark stays the default |
| `assets/scanner/*.jpg` | AI-generated sample photos used by the scanner simulation |
| `views/view-ai-predict.js` | Predictive health lab mounted inside the AI view (`#vaPredict`): illustrative, hand-weighted risk model — not a trained or validated model |
| `views/view-network-team.js` | Medical team mounted inside the Network view (`#vnTeam`): fictional doctors, simulated presence, appointment booking and teleconsultation room |
| `assets/doctors/*.jpg` | AI-generated doctor portraits (not real people) |
| `views/view-marketplace-lab.js` | Nutrition lab mounted inside the Healthy Food Marketplace (`#vmLab`) + product photos: indicative hand-entered composition, glycaemic / bioavailability / density simulations, comparator, ranking by physiological need |
| `assets/market/*.jpg` | AI-generated product photos |
| `views/view-foodcloud-cards.js` | African dish grid + football-style nutrition card dialog mounted inside the Food Cloud (`#vfCards`); indicative per-serving estimates, playful 0–99 ratings |
| `assets/dishes/*.jpg` | AI-generated dish photos |
| `js/bento-dash.js` | Shared engine for the animated institutional dashboards (`NutriBentoDash`: seeded live model, SVG/CSS charts, 15-indicator explorer); styles `.nd-*` (views.css block 12h) |
| `views/view-agri-dash.js` | Agriculture: data mandate, simulated real-time dashboard and 15 indicators, mounted into `#vrDash`; all texts in its dictionary (`agd.*`) |
| `views/view-health-dash.js` | Health: data mandate, simulated real-time dashboard and 15 indicators (`NutriBentoDash.Board`), mounted into `#vgDash`; texts in its dictionary (`hsd.*`) |
| `views/view-unicef-dash.js` | UNICEF: data mandate, simulated real-time dashboard and 15 indicators (`NutriBentoDash.Board`), mounted into `#viuDash`; texts in its dictionary (`ucd.*`) |
| `views/view-fao-dash.js` | FAO: data mandate, simulated real-time dashboard and the 15 FAO indicators (`NutriBentoDash.Board`), mounted into `#vifDash`; texts in its dictionary (`fad.*`) |
| `js/bento-i18n.js`, `js/bento-locales.js` | English / French strings, country names |
| `js/bento-shell.js` | Rail, dock, drawer, header, SVG chart adapter |
| `js/bento-sample-data.js` | Illustrative nutrition / NCD indicators for six countries |
| `views/view-<id>.js` | One module per view, exposed as `NutriBentoViews.<id>` |
| `components/citizen-dashboard/` | Citizen Dashboard 360° component |

## Run

Open `web/index.html` directly, or serve the folder: `python3 -m http.server 8765` from `web/`.

## What is real and what is not

- Indicators in Health, UNICEF, WHO and WFP are **illustrative samples**, not official statistics.
- Professionals, products, prices, payments, scans and AI plans are demonstration content.
- Food Cloud entries, projects (Monitoring) and evidence links (Research) are stored in the
  browser only (`localStorage`).
- The V39–V57 simulation layers (random live counters, generated workspaces and overlays) were
  removed in V59. `README_V57.md` and earlier describe features that no longer exist.
