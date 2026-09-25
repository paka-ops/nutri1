# WHO Nutrition Surveillance · Afrique de l'Ouest

Module de surveillance nutritionnelle OMS injecté dans la section `#who` de
`nutri1/MVP/web/index.html`, complété par le module **Maladies chroniques
(MNT)** : obésité, hypertension, diabète, mortalité prématurée.

## Pourquoi des fichiers séparés ?

`index.html` fait déjà ~39 000 lignes / 2,9 Mo. Y ajouter ce module en inline
l'aurait rendu impossible à maintenir. Le module vit donc dans des fichiers
dédiés, reliés à la page par **six balises** seulement :

```html
<!-- dans <head> -->
<link rel="stylesheet" href="assets/who/who-surveillance.css">

<!-- avant </body> — l'ordre compte -->
<script src="assets/who/who-data.js"></script>
<script src="assets/who/who-ncd-data.js"></script>
<script src="assets/who/who-charts.js"></script>
<script src="assets/who/who-surveillance.js"></script>
<script src="assets/who/who-ncd.js"></script>
```

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `who-data.js` | Données de surveillance nutritionnelle : 16 pays d'Afrique de l'Ouest, séries 2014-2024, indicateurs OMS, seuils, statuts. Données **illustratives**, figées et déterministes (aucun appel réseau, aucune donnée patient). |
| `who-ncd-data.js` | Données **réelles de l'OMS** sur les maladies chroniques (voir « Sources MNT »). Enrichit `WHO_SURV` (classement, export CSV, rapport pays) et expose `window.WHO_NCD`. |
| `who-charts.js` | Moteur de graphiques **100 % Canvas API** (Chart.js n'est pas utilisé ici) : 23 types de rendus, tooltip partagé, animations `requestAnimationFrame`, `update()` / `repaint()` / `destroy()`. |
| `who-surveillance.css` | Styles **scopés sous `#who`** et préfixés `.wsv-` : rien en dehors du module n'est restylé. |
| `who-surveillance.js` | Markup de la section, câblage des interactions, initialisation paresseuse (au premier affichage de la vue), API d'extension `window.WHOSurv`. |
| `who-ncd.js` | Composant « Maladies chroniques » : section, entrée de barre latérale, 4 KPI, 5 graphiques. Se branche via `WHOSurv` sans modifier le module principal. |

## Contenu

- **Identité OMS** : bleu `#0066CC` dominant, fond `#F0F6FF`, bordures `#E0EEFF`.
- **Sidebar** `WHO NutriData` : 7 entrées de navigation (scroll vers les sections),
  dont « Maladies chroniques ».
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
- **Module Maladies chroniques (MNT)** :
  - bandeau + **4 KPI** : obésité adulte (×3 depuis 2000), hypertension
    (9 hypertendus sur 10 non contrôlés), diabète (82 % des diabétiques de
    30 ans et plus non traités), mortalité prématurée (cible ODD 3.4) ;
  - **haltères** femmes / hommes de l'obésité adulte (16 pays) ;
  - **cascade de soins** de l'hypertension (diagnostic → traitement →
    contrôle) avec repères mondiaux OMS et cible « pays performants ≥ 50 % » ;
  - **nuage diabète** prévalence × accès au traitement (quadrant « priorité ») ;
  - **transition nutritionnelle** : obésité 2000 → 2024, niveau 2010 (cible
    OMS « stopper la hausse ») ;
  - **matrice de risque MNT** 16 pays × 7 indicateurs (triable) ;
  - classement du graphique 2 : options **Obésité adulte / Hypertension /
    Diabète**, avec bandes de couleur propres et repère mondial OMS.

## Interactions

| Élément | Effet |
| --- | --- |
| Chips pays de l'en-tête | Filtre les KPI, la heatmap, le tableau et **tout le module MNT** (re-clic = retour vue régionale) |
| Sélecteur de période | Rejoue les KPI et la courbe d'évolution sur 2022 / 2023 / 2024 (les MNT affichent la dernière estimation OMS disponible) |
| Chips du graphique 1 | Active/désactive chaque courbe |
| Sélecteur du graphique 2 | Stunting / Wasting / Anémie / Vit. A / Obésité / Hypertension / Diabète |
| Listes du radar | Compare 3 pays quelconques parmi les 16 |
| En-têtes des heatmaps (nutrition et MNT) | Trient les pays par indicateur |
| En-têtes du tableau | Trie la colonne (▲/▼), aussi au clavier (Entrée / Espace) |
| Recherche du tableau | Filtre instantané par pays |
| Navigation dans la vue | Les canvas sont redessinés au retour (bitmap caduc après masquage) |
| « Exporter PDF » | `window.print()` — la feuille d'impression n'imprime que `#who` |
| « Exporter CSV » | Télécharge la scorecard filtrée, avec 8 colonnes MNT |

## API d'extension

`who-surveillance.js` expose `window.WHOSurv` et émet deux événements sur `#who` :

| Élément | Description |
| --- | --- |
| `wsv:ready` | Le tableau de bord est construit (grille, barre latérale) |
| `wsv:filter` | Le filtre pays ou la période a changé — `detail = { country, year }` |
| `WHOSurv.getState()` | `{ country: "ALL" \| code, year }` |
| `WHOSurv.setCountry(code)` | Applique un filtre pays |
| `WHOSurv.ui` | `kpiCard`, `cardHead`, `ICO`, `nf`, `fmtPct`, `esc`, `toast` — pour un rendu homogène |
| `WHO_SURV.RANK_INDICATORS` | Un module peut y ajouter des indicateurs (`short`, `group`, `bands`, `legend`) : ils apparaissent dans le sélecteur du graphique 2 |
| `WHO_SURV.CSV_EXTRA` | Colonnes supplémentaires de l'export CSV (`{ label, get(c) }`) |
| `WHO_SURV.REPORT_EXTRA(c)` | Complément du toast « Voir rapport » |

## Sources MNT (données réelles)

Observatoire mondial de la santé de l'OMS (GHO), API OData
`https://ghoapi.azureedge.net/api/` — extraction du 25/09/2026. Estimations
standardisées sur l'âge, arrondies à 0,1 point.

| Indicateur | Code GHO | Année |
| --- | --- | --- |
| Obésité adultes 18+ (IMC ≥ 30), par sexe, NCD-RisC / OMS | `NCD_BMI_30A` | 2000-2024 (mise à jour OMS du 27/05/2026) |
| Hypertension 30-79 ans, par sexe | `NCD_HYP_PREVALENCE_A` | 2019 |
| Cascade HTA : diagnostic / traitement / contrôle | `NCD_HYP_DIAGNOSIS_A`, `NCD_HYP_TREATMENT_A`, `NCD_HYP_CONTROL_A` | 2019 |
| Diabète 18+, par sexe, NCD-RisC / OMS | `NCD_DIABETES_PREVALENCE_AGESTD` | 2022 |
| Couverture du traitement du diabète 30+ | `NCD_DIABETES_TREATMENT_AGESTD` | 2022 |
| Probabilité de décès 30-70 ans (MCV, cancers, diabète, respiratoires chroniques) | `NCDMORT3070` | 2015 et 2021 |

Repères mondiaux (fiches d'information OMS) : obésité 16 % des adultes (2022),
diabète 14 % (2022), hypertension ≈ 33 % des 30-79 ans, dont 54 % diagnostiqués,
42 % traités, 21 % contrôlés. Moyennes régionales = moyennes non pondérées des
16 pays, comme dans le reste du module.

## Notes

- Les données de surveillance nutritionnelle (`who-data.js`) sont
  **illustratives** et alignées sur les cadres OMS/UNICEF ; elles ne remplacent
  pas les estimations officielles. Les données MNT (`who-ncd-data.js`) sont les
  estimations officielles de l'OMS, affichées avec leur année de référence.
- Le module s'initialise au premier affichage de la vue `#who` (les canvas
  nécessitent une largeur réelle) et se redessine au redimensionnement.
- `#who` conserve son placeholder d'origine si les fichiers ne se chargent pas.
