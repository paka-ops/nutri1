# WHO Nutrition Surveillance · Afrique de l'Ouest

Module de surveillance nutritionnelle OMS injecté dans la section `#who` de
`nutri1/MVP/web/index.html`.

## Pourquoi des fichiers séparés ?

`index.html` fait déjà ~39 000 lignes / 2,9 Mo. Y ajouter ce module en inline
l'aurait rendu impossible à maintenir. Le module vit donc dans des fichiers
dédiés, reliés à la page par **quatre balises** seulement :

```html
<!-- dans <head> -->
<link rel="stylesheet" href="assets/who/who-surveillance.css">

<!-- avant </body> -->
<script src="assets/who/who-data.js"></script>
<script src="assets/who/who-charts.js"></script>
<script src="assets/who/who-surveillance.js"></script>
```

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `who-data.js` | Données de surveillance : 16 pays d'Afrique de l'Ouest, séries 2014-2024, indicateurs OMS, seuils, statuts. Tout est figé et déterministe (aucun appel réseau, aucune donnée patient). |
| `who-charts.js` | Moteur de graphiques **100 % Canvas API** (Chart.js n'est pas utilisé ici) : 21 types de rendus, tooltip partagé, animations `requestAnimationFrame`, `update()` / `repaint()` / `destroy()`. |
| `who-surveillance.css` | Styles **scopés sous `#who`** et préfixés `.wsv-` : rien en dehors du module n'est restylé. |
| `who-surveillance.js` | Markup de la section, câblage des interactions, initialisation paresseuse (au premier affichage de la vue). |

## Contenu

- **Identité OMS** : bleu `#0066CC` dominant, fond `#F0F6FF`, bordures `#E0EEFF`.
- **Sidebar** `WHO NutriData` : 6 entrées de navigation (scroll vers les sections).
- **En-tête** : fil d'Ariane, titre, chips filtre pays (16), sélecteur de période
  2022-2024, export PDF (feuille d'impression dédiée), indicateur LIVE.
- **5 cartes KPI** : stunting, wasting, anémie, couverture vitamine A, double
  fardeau — chacune avec son mini-graphique Canvas (sparkline, jauge 270°,
  barres, barre de progression, mini donut).
- **15 graphiques** : multi-lignes + aires, classement horizontal, radar,
  double aire saisonnière, donut, bulles PIB/nutrition (zoom + panoramique),
  waterfall, heatmap 16×8 (triable), barres groupées ANJE, aires empilées,
  polaire, nuage WASH, timeline des 1000 jours, jauges micronutriments,
  scorecard tableau (recherche + tri + export CSV).

## Interactions

| Élément | Effet |
| --- | --- |
| Chips pays de l'en-tête | Filtre les KPI, la heatmap, le tableau (re-clic = retour vue régionale) |
| Sélecteur de période | Rejoue les KPI et la courbe d'évolution sur 2022 / 2023 / 2024 |
| Chips du graphique 1 | Active/désactive chaque courbe |
| Sélecteur du graphique 2 | Bascule Stunting / Wasting / Anémie / Vit. A (échelle adaptative) |
| Listes du radar | Compare 3 pays quelconques parmi les 16 |
| En-têtes de la heatmap | Trie les pays par indicateur |
| En-têtes du tableau | Trie la colonne (▲/▼) |
| Recherche du tableau | Filtre instantané par pays |
| « Exporter PDF » | `window.print()` — la feuille d'impression n'imprime que `#who` |
| « Exporter CSV » | Télécharge la scorecard filtrée |

## Notes

- Les données sont **illustratives** et alignées sur les cadres OMS/UNICEF ;
  elles ne remplacent pas les estimations officielles.
- Le module s'initialise au premier affichage de la vue `#who` (les canvas
  nécessitent une largeur réelle) et se redessine au redimensionnement.
- `#who` conserve son placeholder d'origine si les fichiers ne se chargent pas.
