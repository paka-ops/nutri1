# AgriNutri Intelligence · Surveillance Agricole & Nutritionnelle

Tableau de bord du **Ministère de l'Agriculture** embarqué dans la section
`#agri` de `MVP/web/index.html`. Il est construit en **HTML, CSS et JavaScript
pur** (zéro framework, aucun Chart.js ni D3) : tous les graphiques sont dessinés
sur **Canvas 2D**. Le composant est un **Custom Element avec Shadow DOM**
(`<agri-nutriapp-dashboard>`) afin d'isoler ses styles du reste de la page.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `agri-nutriapp-host.css` | Feuille légère liée dans le `<head>` : hôte, placeholder avant enregistrement, plein écran. |
| `agri-nutriapp.css` | Charte du Ministère (vert `#15803D`, brun `#B45309`, bleu `#0369A1`, violet `#A21CAF`), sidebar, en-tête glassmorphism, KPI, grille 12 colonnes, responsive. |
| `agri-nutriapp-data.js` | Jeu de données hardcodé : 16 pays d'Afrique de l'Ouest, saisonnalité des prix, calendrier agricole, pertes, HDDS, MNT, séries 2014-2024 et 2023-2024. |
| `agri-nutriapp-model.js` | Modèle de vue : périmètre régional ou pays, KPI, séries de chaque graphique, scorecard. |
| `agri-nutriapp-chart-core.js` | Moteur Canvas partagé : HiDPI, `ResizeObserver`, `IntersectionObserver`, animation de 800 ms par `requestAnimationFrame`, survol, tooltip Canvas natif, courbes de Bézier lissées, barres à coins arrondis. |
| `charts/agri-charts-production.js` | G1 production vs besoins, G9 aires empilées 10 ans, G11 lollipop autosuffisance, G12 treemap. |
| `charts/agri-charts-markets.js` | G2 heatmap des prix, G7 double axe prix / insécurité, G14 dumbbell 2020-2024. |
| `charts/agri-charts-calendar.js` | G3 Gantt calendrier agricole avec pluviométrie, malnutrition et soudure. |
| `charts/agri-charts-diversity.js` | G4 scatter diversité vs HDDS (4 quadrants), G6 barres avec / sans jardin, G8 entonnoir de fortification. |
| `charts/agri-charts-losses.js` | G5 cascade des pertes (8 étapes), G10 bulles pertes vs revenu. |
| `charts/agri-charts-nutrition.js` | G13 radar des systèmes alimentaires (6 axes). |
| `charts/agri-charts-scorecard.js` | G15 scorecard avec mini-sparklines Canvas dans les cellules. |
| `agri-kpi-charts.js` | Mini-visuels des 5 KPI (répartition, courbe, jauges). |
| `agri-nutriapp-template.js` | Gabarit HTML : sidebar, en-tête, KPI, 15 cartes et leur grille. |
| `agri-nutriapp-dashboard.js` | Custom Element `<agri-nutriapp-dashboard>` : contrôleur, périmètre, plein écran, navigation. |

## Branchement dans `index.html`

```html
<section id="agri" class="view">
  <agri-nutriapp-dashboard id="agriNutriApp"></agri-nutriapp-dashboard>
</section>
```

Les feuilles et scripts sont chargés dans `index.html`, dans cet ordre :
données → modèle → moteur Canvas → graphiques → mini-KPI → gabarit → contrôleur.
Le lien profond `index.html#agri` ouvre directement la section.

## Fonctionnalités

- **Périmètre** : « Vue Globale Afrique de l'Ouest » ou « Vue Détaillée par Pays ▾ ».
  En vue pays, le sélecteur met à jour instantanément les 5 KPI, les 15 graphiques
  et le fil d'ariane. Les graphiques se décomposent alors par régions / districts.
- **Fil d'ariane** interactif (retour à la vue globale, module actif).
- **Navigation par module** : les 6 entrées de la sidebar mettent en évidence les
  cartes du module et font défiler la page jusqu'à elles ; les autres cartes sont atténuées.
- **Badge « Synchro NutriApp LIVE »** avec horodatage.
- **Plein écran natif** (Fullscreen API) sur l'élément hôte, pour le mode immersif.
- **Survol** : élément ciblé mis en surbrillance, voisins à 35 % d'opacité, tooltip
  Canvas (carte blanche, ombre, bordure gauche de 4 px à la couleur de la métrique).
- **Animations d'entrée** de 800 ms, déclenchées seulement quand la carte est visible.

## Mise en page

- Desktop (composant ≥ 1180 px) : sidebar verticale de 260 px, grille CSS 12 colonnes.
- Tablette et largeurs intermédiaires : navigation horizontale, cartes sur toute la largeur.
- La page `index.html` dispose déjà d'une barre latérale fixe de 300 px ; la navigation
  interne reste donc horizontale tant que la zone disponible est étroite.

## Provenance des chiffres

Les valeurs reprennent les ancres du brief : **52,4 Mt** de production, **380 FCFA/kg**
pour le mil, **73 %** d'autosuffisance, **18,4 %** de prévalence du double fardeau,
**22 %** de pertes post-récolte (3,4 Mds USD). Les 16 pays, leurs districts, les
séries temporelles, les calendriers et les corrélations sont **simulés pour
l'interface** à partir de ces ancres. Ils ne constituent pas des statistiques
officielles ni des observations vérifiées.

## Ajouter ou modifier des données

Toutes les valeurs pays se trouvent dans `COUNTRIES` (`agri-nutriapp-data.js`).
Chaque graphique lit son jeu de données via `AgriNutriModel` : pour en ajouter un,
créer une méthode dans `agri-nutriapp-model.js`, une fabrique dans le fichier
`charts/` correspondant, puis les relier dans `CHART_KEYS` (`agri-nutriapp-dashboard.js`).
