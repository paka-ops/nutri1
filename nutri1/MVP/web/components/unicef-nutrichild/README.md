# UNICEF NutriChild · Surveillance Nutritionnelle Infantile

Composant **autonome** (Custom Element + Shadow DOM) qui remplace le contenu de la
section `#unicef` de `web/index.html` par un tableau de bord institutionnel
premium : **5 KPI dynamiques** et **15 graphiques 100 % Canvas API** (aucune
bibliothèque : ni Chart.js, ni D3, ni Bootstrap).

## Pourquoi des fichiers séparés ?

`web/index.html` pèse déjà ~500 Ko : tout inliner aurait rendu le fichier
impossible à maintenir. Le tableau de bord est donc découpé en modules, chargés
par `<script src>` comme les composants `who-nutritracker`, `wfp-nutritracker` et
`fao-nutritracker` déjà présents dans le projet.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `unicef-nutrichild-host.css` | Seule feuille du `<head>` : réserve la place du composant et masque les modules historiques de la section. |
| `unicef-nutrichild-data.js` | Données de référence : 16 pays, districts, ANJE, WASH, références de croissance OMS, séries 2016-2024, campagnes, jalons des 1000 jours. |
| `unicef-nutrichild-model.js` | Modèle : agrégations pondérées, tunnel de soins, régression, classements, construction de l'objet « vue ». |
| `unicef-nutrichild-chart-core.js` | Moteur Canvas 2D : classe `Chart` (HiDPI, `ResizeObserver`, `IntersectionObserver`, hit-testing, tooltips), helpers de dessin. |
| `charts/nc-charts-growth.js` | **G1** courbes de croissance OMS · **G2** tunnel d'accompagnement MAS · **G9** cartographie à bulles. |
| `charts/nc-charts-anje.js` | **G3** radar ANJE · **G6** heatmap matricielle · **G12** barres groupées. |
| `charts/nc-charts-care.js` | **G4** bullet charts CRENAS · **G13** polar de saisonnalité (soudure). |
| `charts/nc-charts-campaigns.js` | **G5** aires empilées des campagnes · **G14** double lollipop de couverture. |
| `charts/nc-charts-wash-trends.js` | **G7** nuage WASH × stunting + régression · **G10** historique 2016-2024 · **G11** donut double anneau. |
| `charts/nc-charts-timeline.js` | **G8** infographie des 1000 premiers jours + impact cumulé. |
| `unicef-nutrichild-kpi-charts.js` | Micro-graphiques des 5 KPI + sparkline réutilisable (scorecard). |
| `unicef-nutrichild-template.js` | Squelette HTML (sidebar, header, KPI, 6 sections, 15 cards) et icônes SVG. |
| `unicef-nutrichild-dashboard.js` | Contrôleur : état des filtres, animations, navigation, exports PDF/CSV, modales. |
| `unicef-nutrichild.css` | Styles complets, encapsulés dans le Shadow DOM. |

## Ordre de chargement (obligatoire)

```
données → modèle → moteur Canvas → charts/*.js → KPI charts → template → dashboard
```

## Intégration dans `index.html`

```html
<!-- <head> -->
<link rel="stylesheet" href="components/unicef-nutrichild/unicef-nutrichild-host.css">

<!-- <section id="unicef" class="view"> -->
<unicef-nutrichild-dashboard id="unicefNutriChild"
  aria-label="UNICEF NutriApp · Surveillance Nutritionnelle Infantile"></unicef-nutrichild-dashboard>

<!-- avant </body> -->
<script src="components/unicef-nutrichild/unicef-nutrichild-data.js"></script>
<!-- … puis modèle, chart-core, charts/*.js, kpi-charts, template, dashboard -->
```

Le tableau de bord prend le contrôle de la section : les anciens modules
« UNICEF Nutrition Intelligence Center » restent dans le DOM (d'autres scripts
globaux les utilisent) mais sont masqués. Le bouton **« Afficher les modules
UNICEF historiques »** en bas de la sidebar du composant les réaffiche.

Un lien profond a également été ajouté en fin de `index.html` : ouvrir
`index.html#unicef` (ou `#who`, `#fao`…) active directement la section demandée —
pratique pour partager un lien vers le tableau de bord.

## Fonctionnalités

- **Double périmètre** : Vue Globale Afrique de l'Ouest ↔ Vue Détaillée par pays
  (16 pays, découpage par districts). Le basculement met à jour instantanément
  les 5 KPI, les 15 graphiques, le bandeau et la scorecard.
- **Filtres** : mode, pays, période (mensuel / trimestriel), sexe et mesure de
  croissance (poids, taille, périmètre brachial), métrique des bullet charts,
  sélection des séries de tendance.
- **Interactions** : survol de chaque point / barre / segment / cellule avec
  tooltip complet, toggles de séries dans les légendes, tri et recherche dans la
  scorecard, clic sur une cellule ANJE pour ouvrir la fiche détaillée.
- **Exports** : rapport PDF imprimable (les Canvas sont sérialisés en PNG et
  intégrés au document) et extraction CSV de la scorecard.
- **Performance** : rendu à la demande uniquement (aucune boucle permanente),
  animations d'entrée de 800 ms orchestrées par un unique ordonnanceur
  `requestAnimationFrame` → 60 fps garantis.

## Notes techniques

- Les moyennes régionales sont pondérées par le nombre d'enfants dépistés via
  l'app (`screened`) : cette pondération reproduit les agrégats institutionnels
  du cahier des charges (allaitement exclusif 32 %, guérison 84,7 %,
  Vitamine A 71 %).
- Les valeurs de district sont dérivées de l'indicateur national par un
  générateur déterministe seedé : un district affiche toujours les mêmes
  valeurs, aucun aléatoire à l'exécution.
- Les percentiles de croissance sont interpolés depuis les médianes et
  coefficients de variation OMS aux âges clés, via les z-scores standards
  (P3 = −1,881 … P97 = +1,881).

Données de démonstration — ordres de grandeur cohérents avec les publications
UNICEF / OMS / SMART pour l'Afrique de l'Ouest.
