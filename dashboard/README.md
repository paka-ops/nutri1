# NutriApp · Tableau de bord de surveillance nutritionnelle

**Ministère de la Santé — Surveillance Nutritionnelle Clinique, Communautaire & Maladies Chroniques (MNT)**

Livrable : **`index.html`**, fichier unique autonome (258 Ko).
`HTML + CSS + JavaScript` pur · **Canvas 2D natif pour les 15 graphiques** · **zéro framework** (ni Chart.js, ni D3).
Seule ressource externe : la police `Inter` (Google Fonts), avec repli système hors-ligne.

---

## 1. Démarrage

```bash
# Ouvrir directement le livrable
open index.html                     # ou double-clic

# Ou le servir (recommandé pour le plein écran et les aperçus)
python3 -m http.server 8080 --bind 0.0.0.0
# → http://localhost:8080
```

**Raccourcis clavier** : `1`–`6` sections · `G` vue globale · `P` vue pays · `F` plein écran · `Échap` ferme le sélecteur.

---

## 2. Contenu

### Sidebar (260 px, dégradé `#1E0A3C` → `#11052C`)
| # | Section | Graphiques |
|---|---------|-----------|
| 🏥 | Vue d'ensemble (NutriApp) | 5 KPI · 1 · 2 · 10 |
| 📊 | CRENAS / CRENAM | 4 · 5 · 12 · 13 |
| 💊 | Suivi des stocks ATPE | 3 · 15 |
| 🩸 | Anémie & micronutriments | 6 · 9 |
| ⚖️ | Double fardeau & MNT | 8 · 11 · 14 |
| 📋 | Synchro & qualité App | 7 · 3 (vue logistique) · qualité |

### Header persistant (72 px, glassmorphism `blur(16px)`)
Fil d'ariane interactif · sélecteur de périmètre **🌍 Vue Globale Afrique de l'Ouest** ↔ **🏳️ Vue Détaillée par Pays** ·
sélecteur de pays contextuel (16 pays, recherche instantanée) · badge animé **Synchro NutriApp LIVE** ·
**bouton de plein écran natif (Fullscreen API)** · export/impression de la vue.

### 5 KPI adaptatifs
Admissions CRENAS · Obésité adulte · Hypertension liée au sel · Structures en rupture ATPE · Taux de synchronisation.
Chaque carte : compteur animé, sparkline canvas de fond, badge d'état (effet pulsant rouge pour l'urgence réappro),
et **badge de comparaison à la moyenne régionale** en mode pays.

### 15 graphiques Canvas
1. Dual area 24 mois (2025 vs 2024, bande de soudure hachurée ambre)
2. Scatter 4 quadrants Sphère (75 % / 15 %), bulles ∝ volume d'admissions
3. Bullet chart vertical multi-zones, seuil de rupture 30 j (ligne rouge fixe)
4. Heatmap matricielle zones × 8 indicateurs (colorimétrie conditionnelle)
5. Polar rose 12 secteurs × 3 cycles annuels
6. Barres groupées anémie (3 sévérités) + ligne couverture fer (double axe)
7. Heatmap calendaire 52 semaines × 7 jours
8. Dumbbell 2015 vs 2024 (HTA/sel, diabète T2, obésité, retard)
9. Funnel CPN 5 étapes + callout du gap de 59 %
10. Small multiples : 6 mini-aires avec flèches de tendance
11. Treemap des comorbidités (algorithme *squarified* implémenté à la main)
12. Multi-line des canaux de dépistage 2018-2024
13. Lollipop du score composite avec objectif 70
14. Stacked bar 100 % du double fardeau (6 segments)
15. Scorecard tabulaire : sparklines canvas en cellule, mini-barres, badges de statut, tri par colonne

---

## 3. Charte graphique appliquée

| Élément | Valeur |
|---------|--------|
| Primaire / secondaire / tertiaire | `#7C3AED` · `#06B6D4` · `#10B981` |
| Quaternaire / danger | `#F59E0B` · `#EF4444` |
| Fond global / cards / bordure | `#FAF5FF` (grille technique) · `#FFFFFF` · `1px solid #DDD6FE` |
| Ombre carte | `0 4px 6px -1px rgba(124,58,237,.05), 0 10px 25px -5px rgba(124,58,237,.08)` |
| Radius / padding carte | `20px` / `28px` |
| Typographie | titre 28/700 · card 16/600 · sous-titre 13/400 · KPI 38/800 · axes 11/500 · data 13/600 |
| Courbes | Bézier cubiques (spline Catmull-Rom), aire en dégradé vertical → `alpha 0` |
| Barres | coins supérieurs arrondis 6 px, survol : cible en surbrillance + voisines à 35 % |
| Tooltips | carte blanche, ombre prononcée, bordure gauche 4 px à la couleur de la métrique, écarts comparatifs |
| Animations | 800 ms `requestAnimationFrame` + `IntersectionObserver`, easing cubic-out |
| Responsive | grille CSS 6 colonnes · breakpoints 1500 / 1180 (sidebar réduite) / 900 / 760 px |

---

## 4. Données

16 pays : Niger, Mali, Burkina Faso, Sénégal, Guinée, Côte d'Ivoire, Ghana, Nigeria, Mauritanie,
Sierra Leone, Liberia, Guinée-Bissau, Gambie, Bénin, Togo, Cap-Vert — chacun avec 5 à 8 districts réels.

**Valeurs de référence calibrées** (agrégats régionaux exacts) :

| Indicateur | Valeur globale |
|---|---|
| Admissions CRENAS 12 m | **48 234** (Niger : 12 450) |
| Points de distribution ATPE | **1 842** |
| Structures en rupture | **47** (2,55 %) — Niger : 12 |
| Obésité adulte (pondérée population) | **14,2 %** |
| Hypertension liée au sel | **27,8 %** |
| Synchronisation 24 h (pondérée agents) | **72 %** |
| Agents communautaires connectés | 4 196 |
| Districts sanitaires suivis | 102 |
| Σ des 12 mois = total annuel | exact, pour les 16 pays (méthode du plus fort reste) |

Provenance simulée (télémétrie NutriApp) : saisies ASC et cliniques mobiles, dépistages PB/MUAC,
enquêtes ménages type SMART, inventaires ATPE géolocalisés, journaux de synchronisation, consolidation DHIS2.

**Déterminisme** : les séries mensuelles, la décomposition par districts et les bruits de synchronisation sont
générés par un RNG `mulberry32` amorcé par le nom de la zone (`rngFrom`). Deux chargements produisent donc
strictement les mêmes chiffres — condition indispensable à la crédibilité d'un dashboard de pilotage.

**Cohérence arithmétique** : la somme des districts retombe exactement sur les totaux nationaux
(admissions, points ATPE, agents, ruptures), vérifiée par test automatisé.

Étalonnage : `../tools/calibrage_nutriapp.py` (ajuste les fiches pays pour atteindre les valeurs de référence).

---

## 5. Architecture du code

```
dashboard/
├── index.html                  ← LIVRABLE autonome (généré)
├── build.sh                    ← concatène src/ → index.html + contrôle de syntaxe
├── src/                        ← fragments sources (commentés en français)
│   ├── 01-head-css.html          méta, polices, design-system CSS complet
│   ├── 02-body.html              sidebar, header, 6 sections, 15 emplacements canvas
│   ├── 03-moteur.html            §1-4 utilitaires, primitives canvas, tooltip, animations
│   ├── 04-donnees.html           §5-6 dataset 16 pays, districts, moteur de périmètre
│   ├── 05-kpi-charts-1-2-3.html  §7 KPI + graphiques 1, 2, 3
│   ├── 06-charts-4-5-10-6-7.html graphiques 4, 5, 10, 6, 7
│   ├── 07-charts-8-9-11-12-13-14.html graphiques 8, 9, 11, 12, 13, 14
│   └── 08-chart-qualite-scorecard-init.html qualité, scorecard, navigation, boot
└── tests/                      ← bancs de test (jsdom + contexte canvas instrumenté)
    ├── test-fonctionnel.js       360 assertions
    └── test-geometrie.js         débordements de texte hors canvas
```

```bash
bash build.sh                       # régénère index.html + contrôle de syntaxe JS
npm i jsdom --no-save               # dépendance de test uniquement
node tests/test-fonctionnel.js      # 360 assertions
node tests/test-geometrie.js        # aucun texte ne déborde du canvas
```

**Ce que couvrent les tests** (contexte Canvas 2D instrumenté : chaque appel de dessin est réellement exécuté) :

- valeurs de référence du brief (48 234 · 14,2 % · 27,8 % · 47 · 1 842 · 72 %) ;
- intégrité arithmétique : Σ districts = total national (admissions, points ATPE, ruptures, agents),
  Σ des 12 mois = total annuel, bornes métier (guérison, abandon, synchro, score) ;
- les 15 fonctions de rendu × 2 largeurs × progression 0 → 1 × état de survol, **1 500 zones de survol**
  générées, chacune avec une infobulle non vide ;
- les 16 pays en vue détaillée (districts, scorecard, KPI, bandeau) ;
- navigation entre les 6 sections, fil d'ariane, tri des 12 colonnes du tableau,
  recherche de pays, plein écran (entrée/sortie), raccourcis clavier, resize, export ;
- géométrie : 5 largeurs (1920 → 900 px) × 2 périmètres × 15 graphiques, aucun libellé hors canvas.

Le moteur de rendu : `makeChart(id, draw, opts)` → registre `CHARTS`, mise à l'échelle `devicePixelRatio`,
`IntersectionObserver` (animation au premier affichage), `ResizeObserver`/`resize` (re-render),
zones de survol recalculées à chaque frame (`rect` / `circle` / `sector`).

---

## 6. Notes de conception

- **Changement de périmètre instantané** : `getScope()` est l'unique source de vérité ; tous les KPI et les
  15 graphiques la consomment. Sélectionner un pays rebascule l'ensemble du dashboard sur ses districts
  (heatmap, bullet, lollipop, stacked bar, scorecard) sans rechargement.
- **Tooltip unique partagé** (`#tip`) : une seule carte flottante pour 15 graphiques, positionnée avec
  retournement automatique en bord de viewport.
- **Accès hors-ligne** : les données étant embarquées, le dashboard fonctionne sans réseau (seule la police
  Inter bascule sur la pile système).
- **`prefers-reduced-motion`** : animations neutralisées, valeurs affichées immédiatement.
- **Aucune valeur de badge codée en dur** : les évolutions affichées sont recalculées depuis les séries
  (`pctChange`, `trend`), donc toujours cohérentes avec la courbe et l'infobulle adjacentes — y compris en
  vue pays, où chaque indicateur prend la saisonnalité réelle du pays sélectionné.
  Le calibrage des données fait retomber la vue globale sur les références du brief :

  | Badge | Valeur affichée (vue globale) | Calcul |
  |---|---|---|
  | KPI 1 · admissions | **↑ +12 % vs 2024 · Pic soudure +68 %** | campagne 2025 vs 2024 · août vs moyenne mensuelle |
  | KPI 2 · obésité | **↑ +2,4 pts vs 2023** | `FACTEUR_OBESITE_2023 = 0,831` (+20,3 % en 2 ans) |
  | KPI 3 · HTA | **⚠ Risque cardiovasculaire élevé** | seuil sel > 9 g/j |
  | KPI 4 · ATPE | **⚠ URGENT RÉAPPRO** (pulsant) | 47 structures < 30 jours |
  | KPI 5 · synchro | **◉ Réseau actif 16 pays** (+11,3 pts / 12 m) | tendance de la série mensuelle |

  La ligne de contexte du KPI 1 porte sur le dernier mois synchronisé (déc. 2025), le badge sur la campagne
  annuelle : les deux lectures se complètent sans se contredire.
