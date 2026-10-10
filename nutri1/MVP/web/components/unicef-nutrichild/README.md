# UNICEF NutriChildApp · Surveillance Nutritionnelle Infantile

Tableau de bord autonome (Custom Element `<unicef-nutrichild-dashboard>`, Shadow DOM)
affiché dans la section `#fao` de `index.html`, placé avant le tableau FAO.

Zéro framework : HTML, CSS et JavaScript natif, graphiques en **Canvas 2D** uniquement.

## Contenu

- 16 pays d'Afrique de l'Ouest regroupés en 3 zones (Sahel, Atlantique & côte ouest, Golfe de Guinée).
- Barre latérale (240 px, `#002952`) avec 6 sections de navigation qui font défiler et surlignent les cartes concernées.
- En-tête avec fil d'Ariane, filtres Région / Pays, zones, Mensuel / Trimestriel, badge de synchro et bouton « Générer Rapport » (CSV).
- 5 KPI : MAS dépistée, allaitement exclusif, guérison CRENAS, vitamine A, admissions.
- 15 cartes Canvas (G1 à G15) : courbes de croissance, entonnoir MAS, radar ANJE, bullet charts, aires empilées, heatmap ANJE, nuage WASH avec régression, 1000 premiers jours, carte à bulles, historique, donut, barres groupées, polar, lollipop et tableau synthétique avec sparklines.

## Structure

| Fichier | Rôle |
|---|---|
| `unicef-nutrichild-data.js` | Jeu de données de démonstration (`NS.DATA`) |
| `unicef-nutrichild-model.js` | Calculs : agrégats, régression, statut de stock, `NS.model.build(state)` |
| `unicef-nutrichild-chart-core.js` | Moteur Canvas partagé (HiDPI, animation, survol, légendes, `NS.Tooltip`) |
| `charts/unicef-charts-growth.js` | G1 courbes de croissance, G2 entonnoir MAS |
| `charts/unicef-charts-anje.js` | G3 radar, G6 heatmap, G12 barres groupées |
| `charts/unicef-charts-programs.js` | G4 bullet, G5 aires empilées, G14 lollipop |
| `charts/unicef-charts-determinants.js` | G7 nuage + régression, G8 1000 jours, G11 donut |
| `charts/unicef-charts-trends.js` | G9 carte à bulles, G10 historique, G13 polar |
| `unicef-kpi-charts.js` | Mini-graphiques KPI : `MiniBars`, `Gauge`, `Sparkline` |
| `unicef-nutrichild-template.js` | Gabarit HTML (`NS.template()`) |
| `unicef-nutrichild-dashboard.js` | Contrôleur : état, événements délégués, tween des KPI, rapport CSV |
| `unicef-nutrichild.css` | Styles du Shadow DOM |
| `unicef-nutrichild-host.css` | Feuille hôte légère, chargée dans le `<head>` de `index.html` |

Ordre de chargement (imposé par les dépendances, voir `index.html`) : data → model → chart-core → charts → kpi-charts → template → dashboard.

## Utilisation

Le composant se déclare dans la page par sa seule balise :

```html
<unicef-nutrichild-dashboard id="unicefNutriChild"></unicef-nutrichild-dashboard>
```

Le contrôleur ne dépend d'aucun état global de la page. Le titre de la section (`#title`) vient du premier `<h1>` de `#fao`.

## Règles de conception

- **Une seule source de vérité** : `NS.model.build(state)` produit une vue complète ; chaque graphique ne lit que sa tranche (`select(view)`).
- **Délégation d'événements** : une écoute par type d'événement sur la racine du Shadow DOM.
- **Animations** : entrée des graphiques déclenchée par `IntersectionObserver` (800 ms, ease-out). Les KPI sont interpolés sur `requestAnimationFrame`.
- **Pas de gouttière sur la grille de 100 colonnes** : l'espace entre cartes est une marge interne de 10 px (sinon `99 × gap` déborde).
- **Accessibilité** : `aria-pressed` sur les boutons à bascule, `aria-label` sur les canvas, focus visible, réduction des animations respectée (`prefers-reduced-motion`).

## Limites connues

- Données **de démonstration** : districts, séries historiques et courbes OMS approchées sont simulés. À rapprocher des enquêtes officielles avant toute décision.
- Les emojis des icônes KPI et de la navigation nécessitent une police emoji sur le poste.
- Le rapport est un CSV (BOM UTF-8, séparateur `;`) nommé `unicef-nutrichild-{regional|code pays}-{mois|trimestre}.csv`.
