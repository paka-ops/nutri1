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
| `npm run ai-prevention` | module `#ai` « Moteur IA de Nutrition & de Prévention » : **132 assertions** — parcours nominal (`ai-prevention-suite.js`, 88) et cas de bord (`ai-prevention-edge-suite.js`, 44). Voir la section dédiée ci-dessous |
| `npm run ai-prevention:i18n` | audit statique du dictionnaire du module : parité FR/EN et clés orphelines (aucun serveur requis) |
| `npm run meal-scanner` | scanner immersif `#scanner` : 16 vérifications déterministes (portions, bilans, animation, imports locaux, annulation, mouvement réduit). Aucun serveur requis |
| `npm run perf` | temps de rendu et de calcul (renderAll, forecast, simulate, exports, rebuild) |

## Fichiers

| Fichier | Rôle |
|---|---|
| `harness.js` | chargement jsdom, polyfills (fetch, ResizeObserver, `URL.createObjectURL`, canvas 2D), largeur fixe des hôtes de graphique, helpers `click` / `selectValue` / `pathPoints` |
| `unicef-suite.js` | suite d'intégration `#unicef` |
| `test-suite.js` | suite d'intégration `#citizen` |
| `audit-contrast.js` | moteur de cascade + calcul de contraste WCAG (résout `var()`, dégradés, premier fond opaque ancêtre) |
| `ai-prevention-suite.js` | parcours nominal du module `#ai` (montage, capteurs, scanner, prédictions, programme, impression, langues) |
| `ai-prevention-edge-suite.js` | cas de bord `#ai` (accès direct aux étapes, clavier, invalidation, bascule de langue en pleine analyse, audit de contenu, reset, a11y) |
| `ai-prevention-i18n-audit.js` | parité FR/EN et couverture du dictionnaire du module `#ai` |

## Module `#ai` — Moteur IA de Nutrition & de Prévention

```bash
npm run serve &            # indispensable : la suite charge index.html en HTTP
npm run ai-prevention      # 132 assertions (2 suites, ~50 s)
npm run ai-prevention:i18n # 211 clés FR = 211 EN, aucune orpheline
```

Ce que la suite garantit :

* **montage** — une seule racine `#aiPrevention`, 4 étapes, 3 capteurs, 8 curseurs, API
  `AIPPrevention` / `AIP_MODEL` / `AIP_CHARTS` / `AIP_I18N` exposées ;
* **parcours** — synchronisation des capteurs (valeurs, horodatage, mini-courbes redessinées),
  curseurs et IMC recalculé, scanner (journal, progression, révélation des signaux), 4 cartes de
  risque bornées (`2–96 %`), timeline interactive, mode « programme corrigé » (les probabilités
  actuelles ne bougent pas), programme 7 × 4 repas, régénération **déterministe**, impression ;
* **langues** — bascule FR/EN à tout moment (y compris en pleine analyse), programme et jour
  consulté conservés, dictionnaire paritaire, aucun `data-i18n` dans le module (la couche de la
  plateforme écraserait les textes dynamiques), suivi de la langue de la plateforme une fois la
  fenêtre d’installation passée, résistance d’un choix explicite à la ré-assertion de démarrage ;
* **robustesse** — accès direct à n’importe quelle étape, flèches clavier sur les jours, `Entrée`
  sur les cartes de risque, invalidation des prédictions après modification, aucun `undefined`,
  `NaN`, clé i18n brute ni HTML échappé dans le rendu, console propre.
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
