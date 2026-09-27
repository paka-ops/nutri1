# FAO · Food Systems Intelligence · Afrique de l'Ouest

Module agro-nutritionnel de la FAO injecté comme composant autonome dans la section `#fao` de `nutri1/MVP/web/index.html`.

## Pourquoi des fichiers séparés ?

`index.html` est volumineux (~39 000 lignes / 2,9 Mo). Pour respecter la consigne de ne pas encombrer cette page avec des milliers de lignes supplémentaires, ce module vit dans des fichiers séparés et modulaires sous `assets/fao/`, reliés à `index.html` par **quatre balises** seulement :

```html
<!-- dans <head> -->
<link rel="stylesheet" href="assets/fao/fao-dashboard.css">

<!-- avant </body> — l'ordre compte -->
<script src="assets/fao/fao-data.js"></script>
<script src="assets/fao/fao-charts.js"></script>
<script src="assets/fao/fao-dashboard.js"></script>
```

Au premier affichage de la vue `#fao` (clic sur « 🌾 FAO Food Systems Intelligence Center » dans la barre latérale globale), le composant prend le relais et initialise son interface complète.

## Fichiers composants

| Fichier | Rôle |
| --- | --- |
| `fao-data.js` | Données institutionnelles FAO : 14 pays d'Afrique de l'Ouest (CEDEAO + Mauritanie), bilans céréaliers (production vs besoins), composition nutritive détaillée de 18 aliments locaux sur 8 nutriments, calendriers phénologiques agricoles (Gantt, météo et malnutrition), matrice de flux de la chaîne de valeur (Sankey), enquêtes HDDS, cascades de pertes post-récolte, fortification et marchés. |
| `fao-charts.js` | Moteur de rendu **100 % Canvas API pure** (zéro framework, zéro Chart.js) : 15 graphiques analytiques haute définition + 5 mini-graphiques KPI, gestion du ratio Retina (`devicePixelRatio`), tooltips au survol, animations séquentielles fluides (`requestAnimationFrame`) et particules coulantes sur le diagramme de flux. |
| `fao-dashboard.css` | Styles scopés sous `#fao` et préfixés `.fao-`. Respect rigoureux de la charte visuelle FAO (vert émeraude `#059669`, ambre `#D97706`, cyan `#0891B2`, violet `#7C3AED`, rouge pertes `#DC2626`, sidebar vert forêt `#052E16`, fond global `#F0FDF4`, bordures `#BBF7D0`). |
| `fao-dashboard.js` | Structure HTML injectée, sidebar FAO dédiée avec logo stylisé et navigation interne, gestion des filtres par pays, sélecteurs interactifs et initialisation paresseuse réactive. |

---

## Identité visuelle FAO

- **Couleur primaire** : `#059669` (vert FAO émeraude)
- **Couleur secondaire** : `#D97706` (ambre récolte)
- **Couleur tertiaire** : `#0891B2` (cyan eau)
- **Couleur quaternaire** : `#7C3AED` (violet analyse)
- **Couleur danger** : `#DC2626` (rouge pertes)
- **Fond sidebar** : `#052E16` (vert forêt profond)
- **Fond global** : `#F0FDF4` (vert très très clair)
- **Bordure cards** : `1px solid #BBF7D0`
- **Accent KPI** : dégradé linéaire `#059669 → #10B981`

---

## Contenu & Fonctionnalités

### 1. Sidebar FAO AgriNutri
- Logo : Grain d'épi stylisé SVG vert
- Texte : **FAO AgriNutri**
- Navigation dynamique vers les 6 piliers :
  - 🌾 Production agricole
  - 🍽️ Systèmes alimentaires
  - 🔬 Composition nutritive
  - 📅 Calendriers agricoles
  - 🏭 Chaîne de valeur
  - 💊 Fortification
- Raccourci vers le cockpit d'investissement S&E et export imprimable.

### 2. 5 Cartes KPI
1. **Production Céréalière 2024** : `52.4M t` vert `#059669` (Afrique de l'Ouest totale, badge ↑ `+4.1% vs 2023`, mini-barres Canvas pour 6 cultures : maïs, mil, riz, sorgho, haricots, fonio).
2. **Pertes Post-Récolte** : `22%` rouge `#DC2626` (`= 11.5M tonnes perdues`, `3.4 Milliards USD`, mini-gauge rouge croissant).
3. **Score HDDS Régional** : `4.2 / 12` orange `#D97706` (Diversité alimentaire ménages, Objectif OMS : ≥ 6 groupes, gauge orange).
4. **Couverture Fortification** : `3 aliments` sur 5 cibles (Sel iodé 89% \| Farine 61% \| Huile 45%, 3 barres horizontales empilées).
5. **Biodiversité Alimentaire** : `6,200` espèces cultivées documentées sur 30,000 comestibles connues (mini-donut : cultivées vs perdues vs inconnues).

### 3. Les 15 Graphiques Canvas purs
1. **Production vs Besoins par Pays** [60% largeur] : Grouped bar + gap chart (12 pays, production verte vs besoins gris, flèches surplus/déficit, seuil d'autosuffisance 100%).
2. **Heatmap Nutritive Aliments** [40% largeur] : Matrice 18 aliments locaux × 8 nutriments clés, normalisée, bordure dorée pour les super-aliments (Moringa, Niébé, Fonio).
3. **Calendrier Agricole Gantt** [Pleine largeur 100%] : 10 cultures locales sur 12 mois avec phases phénologiques (préparation sol, semis, croissance, récolte, stockage), courbe pluviométrique bleue, courbe malnutrition rouge et surbrillance de la soudure alimentaire (Mai-Août). Sélecteur de pays.
4. **Sankey Chaîne de Valeur** [55% largeur] : Diagramme Alluvial à 4 colonnes (Production → Transformation → Distribution → Consommation), pertes vers le bas en rouge/gris, et animation de particules coulantes via `requestAnimationFrame`.
5. **HDDS Dot Plot Pays** [45% largeur] : Jitter dot plot de 14 pays (score moyen + nuage de dispersion des ménages), ligne objectif 6 et urgence 3.
6. **Gauges Fortification** [1/3 largeur] : 5 semi-jauges 180° avec arc coloré, seuil cible à 80% et valeur en gras au centre.
7. **Waterfall Pertes Post-Récolte** [1/3 largeur] : Cascade séquentielle de 100% à 78% disponible final, badge récapitulatif `22% · 11.5Mt · 3.4Mds USD`.
8. **Scatter Diversité Cultures/HDDS** [1/3 largeur] : Nuage de 80+ districts sur 4 quadrants interprétatifs (↗ Bon, ↙ Critique, ↖ Paradoxe, ↘ Inattendu) avec régression R² = 0.67.
9. **Area Chart Production 10 ans** [50% largeur] : Aires empilées des 6 céréales phares de 2014 à 2024 avec légende filtrable.
10. **Radar Systèmes Alimentaires** [50% largeur] : Évaluation sur 7 axes de durabilité (Production, Environnement, Nutrition, Économie, Social, Culture, Gouvernance) avec comparaison des pays phares.
11. **Bar Chart Valeur Nutritive** [1/3 largeur] : Barres horizontales groupées Mil vs Maïs vs Riz sur Fer, Zinc, Protéines, B3 et Calcium avec badge « Le MIL : champion nutritionnel ».
12. **Heatmap Prix Marchés 2024** [1/3 largeur] : Suivi des prix mensuels de 6 denrées, déviation par rapport à la normale saisonnière et repère 🌾 des mois de récolte.
13. **Lollipop HDDS Objectifs** [1/3 largeur] : Tiges et têtes de sucettes animées montrant l'écart direct de 14 pays à la cible de 6.0.
14. **Bubble Pertes × Revenus** [50% largeur] : Nuage de bulles corrélant la baisse des pertes à l'augmentation des revenus agricoles avec ligne de tendance.
15. **Scorecard Nutrition-Agriculture** [50% largeur] : Grille de bullet charts (5 pays × 6 indicateurs clés) avec bandes qualitatives et repères de cible.
