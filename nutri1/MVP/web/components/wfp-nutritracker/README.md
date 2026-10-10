# WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest

Tableau de bord PAM/WFP de niveau investisseur, embarqué dans la section `#wfp`
de `MVP/web/index.html` sous forme de **composant autonome** (Custom Element +
Shadow DOM) réparti en plusieurs fichiers, afin de ne pas alourdir `index.html`.

- **Institution** : PAM — Programme Alimentaire Mondial
- **Titre** : *WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest*
- **Source simulée** : Application Mobile Terrain PAM/WFP (Relais Communautaires,
  mVAM & Points de Distribution)
- **Stack** : HTML + CSS + JavaScript vanilla. **Zéro framework, zéro librairie
  de graphiques** : les 15 graphiques et les 5 mini-graphiques de KPI sont
  dessinés à la **Canvas 2D API pure**.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `wfp-nutritracker-host.css` | Seule feuille chargée dans le `<head>` de `index.html` : réserve la place du composant et masque les anciens modules WFP de la section (`.wf-takeover`) |
| `wfp-nutritracker.css` | Styles du composant (Shadow DOM) : charte PAM, grille 12 colonnes, responsive 1280px / 768px, impression |
| `wfp-nutritracker-data.js` | `WFPTracker.DATA` — données hardcodées des 16 pays (FCS, CSI, IPC, prix, MUAC, districts…), 8 produits, profils saisonniers, géométrie vectorielle simplifiée, funnel, waterfall, cibles |
| `wfp-nutritracker-model.js` | `WFPTracker.model.build(état)` — construit la **vue** complète (5 KPI + 15 jeux de données) selon le mode (Région/Pays), le pays, la granularité (Mensuel/Trimestriel) et la période |
| `wfp-nutritracker-chart-core.js` | Moteur Canvas : classe `WFP.Chart` (HiDPI, ResizeObserver, animation d'entrée 800 ms ease-out, IntersectionObserver, hit-testing, tooltip HTML, rAF groupé) + primitives (bézier monotone, barres arrondies, dégradés, échelles « nice », formats français) |
| `charts/wfp-charts-security.js` | G1 phases IPC · G2 FCS · G8 carte choroplèthe · G13 calendar heatmap |
| `charts/wfp-charts-markets.js` | G3 heatmap prix · G5 scatter + régression · G9 céréales · G10 disponibilité vs accès |
| `charts/wfp-charts-household.js` | G4 radar CSI · G7 rose chart · G11 histogramme HDDS · G12 dumbbell |
| `charts/wfp-charts-operations.js` | G6 funnel · G14 waterfall · G15 bullet charts + 5 mini-graphiques de KPI |
| `wfp-nutritracker-template.js` | Squelette HTML (sidebar, header, filtres, KPI, 15 cards, scorecard) + icônes SVG |
| `wfp-nutritracker-dashboard.js` | `<wfp-nutritracker-dashboard>` : état des filtres, événements, rendu des KPI/légendes/chips/tableau, navigation + scrollspy, exports PDF/CSV, badge de synchro |

## Intégration dans `index.html`

```html
<!-- <head> -->
<link rel="stylesheet" href="components/wfp-nutritracker/wfp-nutritracker-host.css">

<!-- <section id="wfp" class="view"> -->
<wfp-nutritracker-dashboard id="wfpNutriTracker"></wfp-nutritracker-dashboard>

<!-- fin de <body> : l'ordre est important -->
<script src="components/wfp-nutritracker/wfp-nutritracker-data.js"></script>
<script src="components/wfp-nutritracker/wfp-nutritracker-model.js"></script>
<script src="components/wfp-nutritracker/wfp-nutritracker-chart-core.js"></script>
<script src="components/wfp-nutritracker/charts/wfp-charts-security.js"></script>
<script src="components/wfp-nutritracker/charts/wfp-charts-markets.js"></script>
<script src="components/wfp-nutritracker/charts/wfp-charts-household.js"></script>
<script src="components/wfp-nutritracker/charts/wfp-charts-operations.js"></script>
<script src="components/wfp-nutritracker/wfp-nutritracker-template.js"></script>
<script src="components/wfp-nutritracker/wfp-nutritracker-dashboard.js"></script>
```

Les anciens modules « WFP Food Security Intelligence Center » restent dans le
DOM (d'autres scripts de la page, dont `renderWFP()`, en dépendent) mais sont
masqués par `wfp-nutritracker-host.css`. Le bouton
**« Afficher les modules WFP historiques »** de la sidebar du composant les
réaffiche (`.wf-show-legacy`).

## Double périmètre d'analyse

| Mode | Périmètre des KPI, cartes et graphiques |
| --- | --- |
| 🌍 **Vue Globale** | Afrique de l'Ouest : agrégats pondérés des 16 pays (population pour le FCS, nombre de marchés suivis pour les prix). Les 16 pays sont les zones des graphiques et de la carte. |
| 🏳️ **Vue Pays** | Le pays sélectionné, comparé à la moyenne régionale. Les **districts / provinces** du pays deviennent les zones (carte découpée, phases IPC, scorecard). |

Le sélecteur de **Période** (Mensuel / Trimestriel) choisit la période de
référence 2024 : les KPI sont ajustés sur la saisonnalité (hausse de
l'insécurité et des prix, baisse du FCS pendant la soudure juin → septembre),
et la période active est surlignée dans la heatmap des prix (G3) et la matrice
des alertes (G13).

## Chartes et données de référence

Couleurs PAM : primaire `#F59E0B`, secondaire `#EF4444`, tertiaire `#10B981`,
quaternaire `#8B5CF6`, info `#3B82F6`, sidebar `#1C1008`, fond `#FFFBF0`,
bordure de card `#FDE68A`.

Les valeurs régionales affichées sont **calculées** à partir des 16 pays et
retombent sur les ancres du cahier des charges :

| Indicateur | Valeur régionale |
| --- | --- |
| Personnes en insécurité alimentaire | **43.7 M** |
| Food Consumption Score (pondéré population) | **41.2** |
| Bénéficiaires assistés | **12.4 M** (cible 18.5 M) |
| Index prix céréales (pondéré marchés) | **127.4** |
| Ménages enquêtés ce mois | **312 400** |

> Le KPI 3 « Zones en Phase IPC 3+ » est **dérivé des données** : la table de
> référence des 16 pays compte **7** pays en IPC 3 ou plus (dont le Niger en
> IPC 4), et non 9. Le KPI affiche donc 7 pays et précise en sous-label le
> nombre de districts régionaux en IPC 3+ — une valeur figée à « 9 » aurait
> contredit la table de référence.

## Vérification

Deux harnais Node (hors dépôt) ont été exécutés sur ce composant :

1. **Rendu** — charge `data`, `model`, `chart-core`, les 4 fichiers de
   graphiques et le template avec un contexte Canvas instrumenté ; construit
   19 scénarios (Région + 16 pays × 2 granularités), appelle `draw()` de chaque
   graphique à p = 0 / 0.35 / 1 et vérifie les ~10 000 zones interactives
   (titres et valeurs de tooltip, absence de `NaN`, `onClick`).
2. **DOM** (jsdom) — instancie réellement `<wfp-nutritracker-dashboard>` :
   Shadow DOM, 20 canvas dimensionnés, 12 413 primitives par cycle de rendu,
   bascule sur les 16 pays (≈ 484 000 primitives), toggles de légende, chips
   radar, recherche et tri du scorecard, changements de période, export CSV,
   export PDF, badge de synchro, masquage des modules historiques.
