# FAO AgriNutriApp · composant de surveillance terrain

Tableau de bord autonome embarqué dans la section `#fao` de
`MVP/web/index.html`. Il utilise un **Custom Element avec Shadow DOM** afin de
garder la page principale légère et de ne pas entrer en conflit avec les
modules FAO historiques ou les styles du reste de l'application.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `fao-nutritracker-host.css` | Feuille légère liée dans le `<head>` : visibilité de l'hôte et comportement en plein écran. |
| `fao-nutritracker.css` | Charte FAO, mise en page responsive, navigation, cartes, filtres et états d'animation dans le Shadow DOM. |
| `fao-nutritracker-data.js` | Référentiel de démonstration pour les 16 pays, les zones, aliments, calendriers et cibles. |
| `fao-nutritracker-model.js` | Modèle de vue : mode régional / pays / zone, campagne, trimestre, agrégats KPI et séries de graphiques. |
| `fao-nutritracker-chart-core.js` | Moteur Canvas 2D partagé : HiDPI, `ResizeObserver`, `IntersectionObserver`, animations rAF, survol et tooltips. |
| `charts/fao-charts-foundation.js` | G1 production/besoins, G2 matrice nutritive, G3 calendrier agricole. |
| `charts/fao-charts-valuechain.js` | G4 Sankey avec particules animées, G7 waterfall des pertes. |
| `charts/fao-charts-households.js` | G5 distribution HDDS, G8 cultures vs HDDS, G13 écart à la cible. |
| `charts/fao-charts-markets.js` | G6 jauges de fortification, G11 comparatif nutritif, G12 heatmap des prix. |
| `charts/fao-charts-resilience.js` | G9 évolution en aires, G10 radar, G14 bulles, G15 scorecard. |
| `fao-kpi-charts.js` | Cinq mini-graphiques Canvas intégrés aux KPI. |
| `fao-nutritracker-template.js` | Gabarit HTML de la navigation, des filtres, des KPI et des 15 cartes. |
| `fao-nutritracker-dashboard.js` | Élément `<fao-nutritracker-dashboard>` et orchestration des interactions. |

## Branchement dans `index.html`

Le composant est placé comme enfant direct de `<section id="fao">` :

```html
<fao-nutritracker-dashboard id="faoNutriTracker"></fao-nutritracker-dashboard>
```

L'ancien bloc de présentation FAO a été retiré de `index.html` pour alléger la
page. La fonction globale historique `renderFAO()` quitte proprement si ses
anciens champs n'existent plus. Les scripts du composant sont chargés en bas de
page, dans cet ordre : données, modèle, moteur Canvas, modules de graphiques,
mini-KPI, gabarit, contrôleur.

## Interactions

- Vue globale (16 pays) ou vue détaillée par pays et zones ; clic sur les chips
  de pays / districts pour changer ou concentrer le périmètre.
- Campagne 2023 / 2024, granularité annuelle / trimestrielle et sélection T1–T4.
- Les cinq KPI et l'ensemble des 15 graphiques sont recalculés sur le même modèle.
- Survol des points, cellules, flux et barres : infobulle contextuelle ; clic sur
  les observations nationales pour ouvrir la vue pays.
- Séries activables/désactivables dans les légendes, navigation avec suivi de
  section, bouton de synchronisation simulée, rapport CSV et plein écran.
- Animations d'entrée pilotées par `IntersectionObserver`, redessin HiDPI groupé
  par `requestAnimationFrame` et observation de taille sans dépendance graphique.

## Provenance des chiffres

Les valeurs numériques reprennent les valeurs de référence fournies dans le
brief de démonstration (production, pertes, HDDS, fortification et revenu pour
les 16 pays ; ancres régionales de 52,4 Mt, 22 %, HDDS 4,2, 3/5 aliments et
6 200 variétés). Les districts, distributions, calendriers, nutriments relatifs,
prix et tendances décennales sont **simulés pour l'interface**. Ils ne sont pas
présentés comme des statistiques officielles ou des observations vérifiées par
la FAO. Une mention de prudence est visible dans le tableau de bord et le rapport
CSV ; les données doivent être rapprochées des enquêtes nationales et des tables
FAO/INFOODS avant tout usage décisionnel.

## Vérifications locales

```bash
for f in components/fao-nutritracker/*.js components/fao-nutritracker/charts/*.js; do
  node --check "$f"
done
```

Aucune dépendance Chart.js, D3, Bootstrap ou autre bibliothèque graphique n'est
utilisée par le composant FAO : les mini-visualisations et les 15 graphiques
sont dessinés par Canvas 2D natif.
