# `tools/nvtest` — suites d'intégration des cockpits NutriVision

Tests **hors ligne de production** : ils chargent `nutri1/MVP/web/index.html` dans jsdom
(au-dessus d'un petit serveur statique) et vérifient le comportement réel des modules
`assets/nutri-citizen.js` et `assets/nutri-unicef.js` construits sur le noyau
`assets/nutri-vision.js`.

Aucune dépendance de production : `jsdom` uniquement (dossier de développement).

## Installation

```bash
cd tools/nvtest
npm install                       # une fois
npm run serve &                   # sert nutri1/MVP/web sur http://localhost:8000
```

> Le serveur doit tourner : jsdom charge la page en HTTP (`JSDOM.fromURL`) pour que les
> scripts et feuilles de style soient résolus comme dans un navigateur.

## Suites

| Commande | Vérifie |
|---|---|
| `npm run unicef` | cockpit `#unicef` : **139 assertions** — montage sur le noyau, fonctionnalités héritées conservées, géométrie des graphiques (aucune courbe hors cadre, aucun NaN), moteur (prévision d'ensemble, simulation d'interventions, hotspots, alerte précoce, équité, qualité des données), portée administrative, **chaque contrôle agit** (boutons, curseurs, listes, tuiles SIG, modales, exports), i18n, console propre |
| `npm run citizen` | cockpit `#citizen` : **144 assertions** — non-régression du module publié précédemment |
| `npm run sections` | les autres sections (`who`, `wfp`, `fao`, `health`, `agri`, `monitoring`, `research`) ne reçoivent aucun panneau et gardent leurs couches de démonstration |
| `npm run contrast:unicef` | audit WCAG AA : mini-moteur de cascade CSS sur le DOM réel (895 éléments texte, 0 sous le seuil) |
| `npm run contrast:unicef:mobile` | même audit au breakpoint 390 px |
| `npm run contrast:citizen` | même audit pour la section citoyenne |
| `npm run perf` | temps de rendu et de calcul (renderAll, forecast, simulate, exports, rebuild) |

## Fichiers

| Fichier | Rôle |
|---|---|
| `harness.js` | chargement jsdom, polyfills (fetch, ResizeObserver, `URL.createObjectURL`, canvas 2D), largeur fixe des hôtes de graphique, helpers `click` / `selectValue` / `pathPoints` |
| `unicef-suite.js` | suite d'intégration `#unicef` |
| `test-suite.js` | suite d'intégration `#citizen` |
| `audit-contrast.js` | moteur de cascade + calcul de contraste WCAG (résout `var()`, dégradés, premier fond opaque ancêtre) |
| `smoke-sections.js` | non-régression des autres sections |
| `who-suite.js` | contrat du cockpit V62 `#who` : surface unique anti-superposition, invariants du modèle, tracés réels, fr/en, exports |
| `perf-unicef.js` | mesures de performance |

## Limites connues de l'environnement

* jsdom ne charge pas les ressources distantes : les erreurs « Could not load
  script/link » vers `cdn.jsdelivr.net` (Chart.js) et `fonts.googleapis.com` sont des
  artefacts du bac à sable hors ligne et sont filtrées par les suites.
* jsdom n'implémente pas `innerText` : la couche héritée V56 lève une `TypeError` sur
  certains clics — c'est précisément ce que `NV.guard` (noyau) contourne pour les
  contrôles du cockpit, et la suite le vérifie.
* Les graphiques sont rendus en SVG ; les largeurs mesurées sont forcées à 720 px par le
  harnais (jsdom renvoie 0).
* Le harnais attendait `NutriCitizen.state.mounted` / `NutriUnicef.state.mounted` : ces
  globaux (et `NutriVision`) ne sont définis par **aucun** build de `index.html` — toutes les
  suites mouraient d'un `FATAL timeout` avant le premier test. `H.ready()` accepte maintenant
  le premier module de cockpit réellement exposé (`NUTRI_UNICEF`, `NUTRI_HEALTH`, `NUTRI_AGRI`,
  `NUTRI_WHO`, `NUTRI_I18N`). Les suites `citizen`, `unicef` et `perf` restent écrites contre
  les API absentes : elles échouent pour cette raison, indépendamment de `#who`.
* jsdom ne fournit pas de contexte 2D : `who-suite.js` installe un contexte enregistreur pour
  que le tracé des graphes du cockpit soit réellement exécuté (une erreur de dessin remonte
  alors au lieu d'être masquée).
