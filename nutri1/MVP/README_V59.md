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
