# NutriApp Santé · Surveillance Nutritionnelle Clinique & Communautaire

Composant **autonome** (Custom Element + Shadow DOM) qui remplace le contenu de la
section `#health` de `web/index.html` par le tableau de bord du **Ministère de la
Santé / Coordination NutriApp** : **5 KPI dynamiques** et **15 graphiques 100 %
Canvas API** (aucune bibliothèque : ni Chart.js, ni D3, ni Bootstrap).

## Pourquoi des fichiers séparés ?

`web/index.html` pèse plus de 500 Ko. Le tableau de bord est donc découpé en
modules chargés par `<script src>`, comme les composants `unicef-nutrichild`,
`who-nutritracker`, `wfp-nutritracker` et `fao-nutritracker`.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `health-nutriapp-host.css` | Seule feuille du `<head>` : réserve la place et masque les modules historiques de `#health`. |
| `health-nutriapp-data.js` | Données de référence : 16 pays (adm, guérison, ruptures, complétude, score + indicateurs complémentaires), districts, saisonnalité, comorbidités, dumbbell, canaux de dépistage, thème. |
| `health-nutriapp-model.js` | Modèle : agrégats pondérés, districts déterministes, séries mensuelles et trimestrielles, construction de la « vue » (`NutriHealth.build`). |
| `health-nutriapp-chart-core.js` | Moteur Canvas : classe `Chart` (HiDPI, `ResizeObserver`, `IntersectionObserver`, animation 800 ms ease-out, hit-testing, tooltips, halo 12 px) + helpers de dessin. |
| `charts/hn-charts-overview.js` | **G1** dual area · **G2** scatter Sphère · **G3** bullet chart stocks · **G4** heatmap de performance. |
| `charts/hn-charts-programmes.js` | **G5** rose polaire · **G6** combo anémie / suppléments · **G7** calendar heatmap 52 semaines · **G8** dumbbell 2015 → 2024. |
| `charts/hn-charts-analytics.js` | **G9** funnel CPN · **G10** small multiples · **G11** treemap squarifié · **G12** multi-lignes · **G13** lollipop · **G14** stacked 100 % · sparklines G15. |
| `health-nutriapp-kpi-charts.js` | Micro-graphiques des 5 cartes KPI. |
| `health-nutriapp-template.js` | Squelette HTML : sidebar, en-tête, double périmètre, KPI, 6 sections, 15 cartes, scorecard. |
| `health-nutriapp-dashboard.js` | Contrôleur `<health-nutriapp-dashboard>` : état des filtres, animations, légendes, scrollspy, scorecard triable, export CSV, rapport imprimable. |
| `health-nutriapp.css` | Styles complets, encapsulés dans le Shadow DOM. |

## Ordre de chargement (obligatoire)

```
données → modèle → moteur Canvas → charts/*.js → KPI charts → template → dashboard
```

## Intégration dans `index.html`

```html
<!-- <head> -->
<link rel="stylesheet" href="components/health-nutriapp/health-nutriapp-host.css">

<!-- <section id="health" class="view"> -->
<health-nutriapp-dashboard aria-label="NutriApp · Surveillance Nutritionnelle"></health-nutriapp-dashboard>
<div class="hn-legacy"> … modules historiques conservés (masqués) … </div>

<!-- avant </body> -->
<script src="components/health-nutriapp/health-nutriapp-data.js"></script>
<!-- … puis model, chart-core, charts/*.js, kpi-charts, template, dashboard -->
```

Lien profond : `index.html#health` ouvre directement la section.

## Périmètre et interactions

- **Mode** : *Afrique de l'Ouest (Vue Globale)* ↔ *Sélectionner un Pays ▾* (liste déroulante).
  En mode pays, les KPI affichent le pays avec un badge comparatif vs la moyenne régionale ;
  les graphiques passent aux **districts** du pays.
- **Zones** (chips) : filtrent les pays agrégés en vue régionale. **Pays** (chips) : ouvrent le détail.
- **Période** : Mensuel (24 mois) ↔ Trimestriel (8 trimestres) pour G1.
- **Légendes** : chaque série peut être masquée/affichée (G1, G2, G5, G6, G8, G12, G14).
- **Drill-down** : cliquer une ligne pays de la heatmap G4 ouvre le détail du pays.
- **Scorecard G15** : tri par colonne, export CSV (séparateur `;`).
- **Rapport** : « Générer Rapport NutriApp » ouvre une version imprimable (KPI + graphiques PNG).

## Données

Les valeurs 2024 de référence (admissions, guérison, ruptures ATPE, complétude,
score) proviennent de la spécification. Les autres indicateurs (abandon, décès,
dépistage CPN, stocks, anémie, suppléments, profil nutritionnel, points de
distribution) sont un **jeu de démonstration cohérent**. Les districts, séries
mensuelles et tendances hebdomadaires sont dérivés de façon **déterministe**
(générateur seedé) : le rendu est identique à chaque chargement.

⚠ Pour la production, remplacer `health-nutriapp-data.js` par un appel à l'API NutriApp
(les autres modules n'ont pas à changer, ils consomment l'objet « vue »).
