# V59 — Tableau de bord citoyen 360° (refonte premium de `#citizen`)

## Objectif

Faire passer la section `#citizen` du MVP web au niveau d'une **application santé
professionnelle** dédiée à la nutrition, sans réécrire les autres sections et sans
casser les couches additives existantes (V39, V41, V44, V45, V57…).

## Livré

### 1. Un module dédié, chargé en six fichiers

`web/components/citizen-dashboard/` :

| Fichier | Rôle |
| --- | --- |
| `citizen-dashboard-data.js` | Référentiel pur : 4 profils de démonstration, références cliniques, 23 aliments africains chiffrés, matrices de repas 7 jours, micronutriments, badges, coûts, groupes de courses. |
| `citizen-dashboard-i18n.js` | Dictionnaire **FR / EN** de 360 clés (parité vérifiée) + `t()`, `num()`, `date()`, `setLang()`, `syncFromPlatform()`, `parity()`. |
| `citizen-dashboard-model.js` | Moteur déterministe : IMC, masse grasse, ratios, MB/DEJ, cibles, scores pondérés, 5 signaux de prévention, priorités, plan 7 jours, charge glycémique, couverture micronutritionnelle, croissance enfant, lecture clinique. |
| `citizen-dashboard-charts.js` | 11 types de graphiques **SVG animés** (anneau multi-axes, courbes lissées, barres, colonnes, donut, radar, jauges, courbe de croissance, micro-courbes), sans aucune librairie. |
| `citizen-dashboard-template.js` | Gabarits HTML des 4 volets + modale explicative. |
| `citizen-dashboard.js` | Contrôleur : état persistant, délégation d'événements, re-rendu partiel, export JSON/CSV, impression, API `NUTRI_CITIZEN`, compatibilité historique. |
| `citizen-dashboard.css` | Feuille premium préfixée (aucune fuite de style), responsive, impression, `prefers-reduced-motion`. |
| `citizen-dashboard-preview.html` | Aperçu autonome du module. |
| `README.md` | Documentation technique complète. |

Dans `index.html` : **3 ajouts seulement** (une feuille `<link>`, le point de montage
`#czdRoot` dans la section, les six `<script>`), plus l'ancien contenu encapsulé dans
`.czd-legacy-holder` et masqué en CSS.

### 2. Les quatre volets

1. **Vue d'ensemble** — score santé global (anneau 4 axes), fiche profil, balance énergétique,
   6 KPI cliquables avec micro-courbes, tendances 14 jours, habitudes ajustables en un clic,
   donut des macros, couverture micronutritionnelle, 5 signaux de prévention, 3 priorités du
   jour actionnables, badges, charge glycémique hebdomadaire.
2. **Plan 7 jours** — 7 onglets de jour, 4 repas/jour (aliments locaux, portions chiffrées,
   score nutritionnel), marquage « consommé », heatmap d'assiduité, couverture micronutritionnelle,
   liste de courses regroupée, coût estimé, export CSV, régénération.
3. **Analyse clinique** — formulaire de mesures/biomarqueurs avec recalcul en direct, tableau de
   références avec position dans la cible, radar métabolique, courbes 14 jours, lecture clinique
   automatique.
4. **Famille & mineurs** — verrou par consentement du tuteur, 2 profils enfants, IMC-pour-âge et
   z-score estimé, courbe de croissance vs médiane de référence, diversité alimentaire interactive.

### 3. Bilingue FR / EN

- Sélecteur **FR / EN** dans l'en-tête du module, choix persisté, sinon suivi de la langue de la
  plateforme (`nutri:i18nChanged`, `NUTRI_I18N`).
- Nombres, unités et heures formatés selon la langue (virgule décimale / séparateur de milliers).
- La couche de traduction par dictionnaire de la page (`v28TranslateAll`) **ignore désormais
  `#czdRoot` et `[data-czd-noscan]`** : sans cette exclusion, le module basculait en français
  après chaque changement de langue (correction vérifiée en navigateur simulé).

### 4. Non-régression

- Aucune structure supprimée : les cartes historiques de `#citizen` restent dans le DOM (lues par
  V39/V44/V45 et par les tests), encapsulées et masquées.
- Les couches injectées (`.v44-livebar`, `#v45-citizen-inputs`, `#v45-metrics`, cartes V47) sont
  masquées uniquement **à l'intérieur** de `#citizen`.
- `#bmi`, `#weight`, `#waist`, `#bp`, `#recs`, `#familyMember` restent synchronisés.
- `updateReferences()`, `saveCitizen()`, `generateRecommendations()`,
  `loadFamilyChildDashboard()`, `requestChildAccess()`, `openChildNutritionPlan()` restent
  disponibles (définies seulement si absentes, comme le reste de la page).
- `locales/*.json` intacts (829 clés × 5 langues, `tools/validate_i18n.py` OK) : le module
  possède son propre dictionnaire.

## Vérifications effectuées

- Parité FR/EN : **360 / 360 clés**, 0 manquante, 0 vide.
- Rendu des 4 volets + modale dans les 2 langues : aucune occurrence de `NaN`, `undefined` ou
  `[object Object]` ; 114 SVG, 170 boutons.
- Parcours automatisé (DOM réel, jsdom) : **83 boutons cliqués**, 0 exception, 0 erreur console ;
  navigation clavier (← →) des onglets OK ; export CSV/JSON, sync, presets, consentement,
  heatmap, modale et bascule FR/EN vérifiés.
- `index.html` : balises équilibrées (18 sections, 796 div), sélecteurs pays / langue fonctionnels.

## Limites connues

- Le rendu visuel n'a pas pu être capturé en image dans cet environnement (binaires système
  manquants pour Chromium) : la mise en page a été validée par structure DOM, contraintes CSS
  et parcours d'interaction. L'aperçu `citizen-dashboard-preview.html` permet une revue visuelle
  immédiate dans un navigateur.
- Les valeurs sont **pédagogiques** (références OMS simplifiées, formules documentées) : la
  vitrine le rappelle dans le pied de page et dans les fenêtres explicatives.
