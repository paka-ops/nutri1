# NutriApp Santé · Ministère de la Santé — Composant `health-nutriapp`

Tableau de bord « Surveillance Nutritionnelle Clinique, Communautaire & Maladies
Chroniques (MNT) » pour la **section `#health`** de `nutri1/MVP/web/index.html`.

## Principe d'intégration (page `index.html` non encombrée)

La page `index.html` est déjà volumineuse : tout le dashboard Santé vit ici, en
**fichiers séparés**, reliés à `index.html` en 3 points uniquement :

1. **`<head>`** — 1 ligne : `components/health-nutriapp/health-nutriapp-host.css`
2. **`<section id="health">`** — 1 balise : `<health-nutriapp-dashboard>`
3. **Bas de page** — 12 `<script>` (données → modèle → moteur Canvas →
   graphiques → KPI → template → contrôleur), même convention que les
   composants `who-nutritracker`, `wfp-nutritracker`, `fao-nutritracker` et
   `unicef-nutrichild`.

Le composant est un **Custom Element + Shadow DOM** : styles et DOM isolés,
aucune fuite CSS vers/depuis `index.html`. Zéro framework, Canvas API pur.

## Contenu

| Fichier | Rôle |
|---|---|
| `health-nutriapp-host.css` | Styles hôtes minimaux (chargés par `index.html`) |
| `health-nutriapp.css` | Styles complets du dashboard (Shadow DOM, charte Min. Santé) |
| `health-nutriapp-data.js` | Données JSON hardcodées : 16 pays + districts, séries NutriApp |
| `health-nutriapp-model.js` | Modèle : agrégats Région/Pays, dérivations déterministes, formats |
| `health-nutriapp-chart-core.js` | Moteur Canvas : HiDPI, animation 800 ms, tooltips, hit-testing |
| `charts/ha-charts-admissions.js` | G1 admissions 24 mois, G12 canaux, G10 small multiples |
| `charts/ha-charts-performance.js` | G2 scatter Sphère, G13 lollipop, G8 dumbbell MNT |
| `charts/ha-charts-stocks.js` | G3 bullet ATPE, G7 heatmap synchro, G5 polar saisonnalité |
| `charts/ha-charts-nutrition.js` | G4 matrice districts, G6 anémie+fer, G14 double fardeau 100 % |
| `charts/ha-charts-special.js` | G9 funnel CPN, G11 treemap comorbidités, G15 sparklines scorecard |
| `health-nutriapp-kpi-charts.js` | Mini-visualisations des 5 KPI (sparkline, jauge, barres, donut) |
| `health-nutriapp-template.js` | Squelette HTML + icônes SVG + cartes G1..G15 |
| `health-nutriapp-dashboard.js` | Contrôleur `<health-nutriapp-dashboard>` : état, filtres, rendus |

## Données

Source simulée : **application mobile de suivi terrain NutriApp**
(agents communautaires, cliniques mobiles, dépistages PB/MUAC, enquêtes
ménages, inventaires ATPE). 16 pays d'Afrique de l'Ouest, données 2024 de
démonstration réalistes. Commentaires de code en français.
