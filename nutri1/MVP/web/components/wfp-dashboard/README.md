# WFP NutriTracker · composant `wfp-dashboard`

Tableau de bord « WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest », intégré dans la section `#wfp` de `web/index.html`.

HTML + CSS + JavaScript pur, graphiques 100 % Canvas API (aucune librairie).

## Fichiers
| Fichier | Rôle |
|---|---|
| `wfp-core.js` | Namespace, palette PAM, boucle d'animation rAF, classe `BaseChart` (HiDPI, survol, tooltip, légendes) |
| `wfp-data.js` | Données de référence des 16 pays (brief), districts, générateurs déterministes |
| `wfp-geo.js` | Contours simplifiés des 16 pays (Natural Earth 1:50m via `world-atlas`) |
| `wfp-model.js` | Modèle de vue : Vue Globale / Vue Pays, zones, période → données des KPI et graphiques |
| `charts/charts-distribution.js` | Graphiques 1 (IPC), 4 (radar CSI), 7 (rose), 11 (HDDS) |
| `charts/charts-trends.js` | Graphiques 2 (FCS), 3 (heatmap prix), 9 (céréales), 12 (dumbbell) |
| `charts/charts-compare.js` | Graphiques 5 (nuage + régression), 6 (funnel), 10 (double barres), 13 (calendrier), 14 (cascade), 15 (bullets) |
| `charts/charts-map.js` | Graphique 8 : carte choroplèthe (pays, puis districts en Voronoï en mode Pays) |
| `wfp-template.js` | Gabarit HTML (sidebar, en-tête, filtres, 5 KPI, grille) |
| `wfp-dashboard.css` | Styles (Shadow DOM, responsive par container queries) |
| `wfp-dashboard.js` | Custom element `<wfp-dashboard>` : état, filtres, KPI, IntersectionObserver, scrollspy, export CSV |

## Ordre de chargement
Défini dans `web/index.html` (fin du `<body>`) : core → data → geo → model → charts/* → template → dashboard.

## Notes
- Les valeurs de référence des 16 pays (FCS, CSI, IPC, FCS précédent) et les totaux régionaux viennent du cahier des charges.
- Séries mensuelles 2020-2024, districts, prix et distributions sont reconstruits de façon déterministe (graine = code pays) : un même état produit toujours les mêmes chiffres.
- Données de démonstration, non officielles.
