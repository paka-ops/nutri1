# UNICEF · Child Nutrition Analytics · Afrique de l'Ouest

Tableau de bord injecté dans la section `#unicef` de `nutri1/MVP/web/index.html`.

## Pourquoi des fichiers séparés ?

`index.html` fait déjà ~39 000 lignes / 2,9 Mo. Le module UNICEF vit donc à part
et n'est relié à la page que par **quatre balises** :

```html
<!-- dans <head> -->
<link rel="stylesheet" href="assets/unicef/unicef-dashboard.css">

<!-- avant </body> — l'ordre compte -->
<script src="assets/unicef/unicef-data.js"></script>
<script src="assets/unicef/unicef-charts.js"></script>
<script src="assets/unicef/unicef-dashboard.js"></script>
```

`#unicef` conserve son texte d'origine tant que ces fichiers ne sont pas
chargés. Au premier affichage de la vue, le composant remplace le contenu de la
section. Le cockpit d'investissement UNICEF reste dans **Projects, Surveys &
Nutrition Surveillance** (bouton en bas de la barre latérale du module).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `unicef-data.js` | 15 pays, 8 indicateurs ANJE, percentiles OMS 2006, tunnel MAS, campagnes, saisonnalité, causes, fenêtre des 1000 jours, KPI. Données **illustratives**, figées, sans appel réseau. |
| `unicef-charts.js` | Moteur **100 % Canvas API** (Chart.js n'est pas utilisé) : 15 graphiques + 5 minis KPI + sparkline/mini-bullet du scorecard, infobulles, animations `requestAnimationFrame`. |
| `unicef-dashboard.css` | Styles **scopés sous `#unicef`**, préfixe `.un-` (seule exception : l'infobulle `.un-tip`, ancrée au `<body>`). Palette UNICEF exclusive : cyan `#1CABE2`, sidebar `#002952`, fond `#F0F9FF`, bordures `#BAE6FD`. |
| `unicef-dashboard.js` | Markup, filtres de portée, bascules, tri, scorecard, rapport, impression, export CSV et initialisation paresseuse. |
| `preview.html` | Page de contrôle **hors application** : monte le composant seul (utile pour vérifier le rendu sans charger les 2,9 Mo de `index.html`). |

## Contenu

- **Barre latérale** `UNICEF NutriChild` (logo enfant + globe) : malnutrition
  infantile, ANJE & allaitement, CRENAS/CRENAM, supplémentation, WASH &
  nutrition, tendances.
- **En-tête** : fil d'Ariane, titre, badge d'urgence clignotant, sélecteur de
  portée (Afrique de l'Ouest 15 pays / Sahel 6 / zone côtière 9), impression,
  rapport régional.
- **5 cartes KPI** avec mini-graphique Canvas : 3,8 M d'enfants MAS (badge
  URGENCE + mini-barres 6 pays), allaitement exclusif 32 % (jauge 270° contre
  l'objectif OMS de 70 % + comparaison 5 pays), guérison CRENAS 84,7 % (badge
  « ✓ Conforme Sphère » + sparkline 12 mois), couverture vitamine A 71 %
  (barre de progression cyan + 4 pays ≥ 80 %), admissions CRENAS 48 234
  (+12 % vs mois passé, 12 mois en mini-barres).
- **15 graphiques** :
  1. Courbes de croissance OMS (percentiles P3 → P97, couloirs colorés,
     série enfant suivie, bascules Garçon/Fille et Poids/Taille/PB) ;
  2. Tunnel MAS de prise en charge (6 étapes, pertes inter-étapes, gap critique) ;
  3. Radar ANJE 8 indicateurs (4 pays + benchmark OMS pointillé) ;
  4. Bullet chart CRENAS (10 pays, seuil Sphère, valeur 2023, 3 métriques) ;
  5. Aires des 8 campagnes de supplémentation (vitamine A, déparasitage, zinc) ;
  6. Heatmap Pays × ANJE (12 × 8, tri par colonne, score composite) ;
  7. Nuage WASH × retard de croissance (15 pays, 4 quadrants, régression) ;
  8. Timeline des 1000 jours (jalons, interventions, impact cumulé) ;
  9. Bulles MAS (taille = enfants, couleur = prévalence) ;
  10. Évolution de la MAS 2016 → 2024 (5 pays, zones urgence / alerte) ;
  11. Donut à double anneau des causes (directes / sous-jacentes) ;
  12. Barres groupées ANJE (5 indicateurs × 5 pays, cibles OMS) ;
  13. Rose polaire de saisonnalité (2022 / 2023 / 2024, zone de soudure) ;
  14. Lollipop de couverture vitamine A 2022 → 2024 (14 pays, objectif 80 %) ;
  15. Scorecard CRENAS (tableau HTML triable + sparklines de tendance et
      mini-bullets de stock ATPE).

## Interactions

| Élément | Effet |
| --- | --- |
| Sélecteur de portée | Filtre les KPI CRENAS, la heatmap, le bullet chart, le lollipop et le scorecard |
| Graphique 1 — Garçon/Fille, Poids/Taille/PB | Rejoue les percentiles concernés |
| Graphique 4 — Guérison / Abandon / Décès | Change la métrique, l'échelle et le seuil |
| Graphique 6 — en-tête de colonne | Trie les pays par performance relative à l'objectif |
| Graphique 15 — en-tête de colonne | Trie le scorecard (aussi au clavier : Entrée / Espace) |
| Barre latérale | Défilement vers la première carte de la rubrique |
| « Rapport régional » | Synthèse imprimable (synthèse, priorités, écarts ANJE, lecture opérationnelle) |
| « Exporter CSV » | Télécharge la scorecard filtrée (13 colonnes) |
| « Imprimer » | `window.print()` — la feuille d'impression ne sort que `#unicef` |

## API légère

`window.UNICEFDash` expose `getState()`, `setScope("tous" | "sahel" | "cotier")`
et `charts` (accès direct aux instances de graphiques). `window.UNICEF_DATA` et
`window.UNICEFCharts` restent disponibles pour un branchement ultérieur (module
complémentaire, export, tests).

## Notes de données

- **Références du cahier des charges conservées telles quelles** : 3,8 M
  d'enfants MAS, 32 % d'allaitement exclusif, 84,7 % de guérison, 71 % de
  couverture vitamine A, 48 234 admissions, 4 pays ≥ 80 % de couverture.
  Deux d'entre elles sont des estimations **consolidées régionales** isolées
  dans `REGION` / documentées dans `unicef-data.js` : le décompte par pays du
  graphique 9 (8 pays du panel) n'est pas censé sommer au total régional, et le
  taux de guérison de 84,7 % correspond au panel complet de 10 pays (moyenne
  pondérée par les admissions, recalculée dans le module).
- Le décompte « 4 pays ≥ 80 % » suit le panel régional élargi UNICEF WCARO
  (les deux États insulaires en plus des 14 pays continentaux du graphique 14) ;
  le lollipop, lui, n'affiche que les pays du cahier des charges.
- Les 8 indicateurs ANJE, les percentiles OMS 2006 et les seuils Sphère
  (guérison > 75 %, abandon < 15 %, décès < 10 %) sont utilisés comme cadres de
  référence ; les séries sont illustratives et ne remplacent pas les
  estimations officielles de l'UNICEF.

## Contrôle visuel

```bash
# depuis nutri1/MVP/web, avec n'importe quel serveur statique
python3 -m http.server 8080
# -> http://localhost:8080/assets/unicef/preview.html
```

`preview.html` affiche uniquement la section `#unicef` alimentée par les
fichiers du module — c'est la vue à utiliser pour contrôler un graphique ou une
couleur sans ouvrir l'application complète.

## Notes techniques

- Initialisation **paresseuse** au premier affichage de `#unicef` (un canvas a
  besoin d'une largeur réelle) ; les canvas sont redessinés au retour dans la
  vue et au redimensionnement de la fenêtre.
- Les clics, saisies et changements internes ne remontent pas vers les
  simulations historiques de la page (`v52` → `v57`), pour que les filtres et
  tris restent utilisables.
- Graisses de police limitées aux centaines : les valeurs intermédiaires
  (`750`, `850`) sont interprétées comme une taille par certains moteurs de
  rendu Canvas.
