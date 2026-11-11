# Tableau de bord citoyen 360° — `#citizen`

Application **vanilla** (HTML5 + CSS3 + ES6, zéro framework, zéro librairie de graphiques)
montée dans la section `#citizen` du MVP web : un dossier nutrition & santé de niveau clinique,
**entièrement bilingue FR / EN**, avec graphiques SVG animés, plan alimentaire africain de
7 jours, analyse anthropométrique et espace famille / mineurs sous consentement.

Édition *premium* : surface claire en verre dépoli, accents émeraude / lime, aurore animée,
anneau de score multi-axes, jauges de risque, radar métabolique, heatmap d'assiduité,
micro-courbes de KPI et compteurs animés — le tout sans aucune dépendance réseau.

---

## 1. Fichiers

| Fichier | Rôle |
| --- | --- |
| `citizen-dashboard-data.js` | Référentiel pur : profil par défaut, 4 profils de démonstration, références cliniques (OMS / consensus), 23 aliments africains chiffrés (kcal, protéines, fibres, fer, vitamine A/C, calcium, sodium, IG), matrices de repas 7 jours, micronutriments suivis, objectifs, badges, prix indicatifs, groupes de courses. Aucun accès au DOM. |
| `citizen-dashboard-i18n.js` | Dictionnaire local **FR / EN** (360 clés, parité vérifiée) + `t()`, `num()`, `date()`, `setLang()`, `follow()`, `syncFromPlatform()`, `parity()`. |
| `citizen-dashboard-model.js` | Moteur déterministe : IMC, masse grasse (Deurenberg), ratios, MB (Mifflin-St Jeor), DEJ, cibles protéines / fibres / eau, scores pondérés, 5 signaux de prévention, priorités du jour, générateur de plan 7 jours, charge glycémique, couverture micronutritionnelle, analyse de croissance enfant, lecture clinique automatique. |
| `citizen-dashboard-charts.js` | Moteur graphique SVG : anneau de score, micro-courbes, courbes multi-séries lissées, barres, colonnes, donut, radar, jauges semi-circulaires, barre divergente, courbe de croissance, icônes. Animations `requestAnimationFrame` + filet de sécurité, rejouables (`resetAnimation`). |
| `citizen-dashboard-template.js` | Gabarits HTML des 4 volets + modale (aucune logique métier, aucun état). |
| `citizen-dashboard.js` | Contrôleur : état sérialisable persisté, délégation d'événements, re-rendu partiel, export JSON / CSV, impression, API publique `window.NUTRI_CITIZEN`, compatibilité avec les fonctions historiques de la page. |
| `citizen-dashboard.css` | Feuille premium **préfixée `#citizen` / `.czd-*`** (aucune fuite de style), responsive, impression, `prefers-reduced-motion`. |
| `citizen-dashboard-preview.html` | Page d'aperçu autonome du module (sans la plateforme). |

Chargement : `i18n → data → model → charts → template → controller`.

---

## 2. Intégration dans `index.html`

```html
<!-- <head> -->
<link rel="stylesheet" href="components/citizen-dashboard/citizen-dashboard.css">

<!-- section #citizen -->
<section id="citizen" class="view" aria-label="Citizen Dashboard 360">
  <h2 class="czd-visually-hidden" data-i18n="ui.citizen_dashboard_360">Citizen Dashboard 360°</h2>
  <div id="czdRoot" class="czd-root" data-czd-noscan></div>
  <noscript>…</noscript>
  <div class="czd-legacy-holder" hidden aria-hidden="true">…contenu historique conservé…</div>
</section>

<!-- avant la couche i18n institutionnelle -->
<script src="components/citizen-dashboard/citizen-dashboard-i18n.js"></script>
<script src="components/citizen-dashboard/citizen-dashboard-data.js"></script>
<script src="components/citizen-dashboard/citizen-dashboard-model.js"></script>
<script src="components/citizen-dashboard/citizen-dashboard-charts.js"></script>
<script src="components/citizen-dashboard/citizen-dashboard-template.js"></script>
<script src="components/citizen-dashboard/citizen-dashboard.js"></script>
```

### Non-régression de la plateforme

Le module **ne supprime aucune structure** : l'ancien contenu de `#citizen` reste dans le DOM
(il est lu par les couches additives V39 / V44 / V45 et par les tests historiques) mais il est
encapsulé dans `.czd-legacy-holder` et masqué en CSS. Les couches injectées dans la section
(`.v44-livebar`, `#v45-metrics`, `#v45-citizen-inputs`…) sont masquées de la même manière, et les
identifiants historiques (`#bmi`, `#weight`, `#waist`, `#bp`, `#recs`, `#familyMember`) sont
maintenus à jour par `syncLegacyFields()`.

La couche de traduction par dictionnaire de la page (`v28TranslateAll`, qui réécrit les nœuds
texte du `body`) **ignore** `#czdRoot` et `[data-czd-noscan]` : le module possède sa propre
localisation FR/EN et ne doit jamais être traduit par-dessus.

---

## 3. Les quatre volets

1. **Vue d'ensemble** — score santé global (anneau 4 axes + légende), fiche profil (objectif,
   pays du plan, MB, DEJ, cibles protéines / fibres), balance énergétique du jour, six KPI
   cliquables (IMC, tour de taille, glycémie, tension, poids, ratio taille/stature) avec
   micro-courbes 14 jours, deux courbes de tendance, habitudes ajustables en un clic
   (hydratation, pas, légumes & fruits, sommeil), donut des macronutriments, couverture en
   micronutriments, cinq signaux de prévention (jauges), trois priorités du jour actionnables,
   badges, charge glycémique hebdomadaire.
2. **Plan 7 jours** — sept onglets de jour, quatre repas par jour avec aliments locaux,
   portions, kcal, protéines, fibres, score nutritionnel de l'aliment, marquage « consommé »,
   heatmap d'assiduité (28 cases), couverture micronutritionnelle du plan, liste de courses
   regroupée, coût estimé, charge glycémique, export CSV et régénération.
3. **Analyse clinique** — formulaire de mesures et biomarqueurs (recalcul en direct, sans
   rechargement), tableau de références avec statuts et position dans la cible, radar
   métabolique, courbes 14 jours, lecture clinique automatique et rappel des références.
4. **Famille & mineurs** — verrou d'accès par consentement du tuteur, deux profils enfants,
   statistiques (IMC-for-age, z-score estimé, prochain suivi), courbe de croissance comparée à
   la médiane de référence, diversité alimentaire interactive (6 groupes).

---

## 4. Le moteur (déterministe)

| Bloc | Formule / logique |
| --- | --- |
| IMC | poids / taille² ; classes OMS 18,5 / 25 / 30 |
| Masse grasse | Deurenberg : `1,2 × IMC + 0,23 × âge − 10,8 × sexe − 5,4` |
| MB | Mifflin-St Jeor : `10 × poids + 6,25 × taille − 5 × âge + (5 / −161)` |
| DEJ | MB × facteur d'activité (1,2 → 1,725) |
| Cible énergétique | DEJ ajusté à l'objectif (−350 à +300 kcal) |
| Scores | nutrition 32 %, métabolisme 34 %, activité 20 %, hydratation 14 % ; bandes ≥ 85 excellent, ≥ 70 bon, ≥ 55 à surveiller, sinon prioritaire |
| Risques | combinaisons pondérées de l'IMC, du tour de taille, de la glycémie, de la tension, du cholestérol et des habitudes → probabilité + facteur dominant + horizon |
| Plan | répartition 25 / 35 / 30 / 10 % de la cible, 7 matrices de repas, ajustement de portion de 0,6 à 1,6 |
| Charge glycémique | `Σ (glucides disponibles × IG / 100)` par aliment |
| eGFR | CKD-EPI 2009 simplifiée |

Aucune valeur n'est tirée au hasard : les profils de démonstration produisent toujours les mêmes
indicateurs, ce qui rend la vitrine reproductible en rendez-vous investisseur.

---

## 5. API publique

```js
NUTRI_CITIZEN.mount()                 // monte le module dans #citizen
NUTRI_CITIZEN.render()                // recalcul + rendu complet
NUTRI_CITIZEN.setTab('plan')          // 'overview' | 'plan' | 'clinical' | 'family'
NUTRI_CITIZEN.setProfile({ weight: 74 })
NUTRI_CITIZEN.getProfile()
NUTRI_CITIZEN.getState()              // état complet (scores, risques, plan…)
NUTRI_CITIZEN.toast('message')
```

Compatibilité conservée (définies seulement si absentes, comme le reste de la page) :
`updateReferences()`, `saveCitizen()`, `generateRecommendations()`,
`loadFamilyChildDashboard(id)`, `requestChildAccess()`, `openChildNutritionPlan()`.

Événements écoutés : `nutri:i18nChanged` (la langue de la plateforme est suivie, sauf choix
explicite FR/EN du module, persisté dans `localStorage`).

---

## 6. Accessibilité & performance

- Rôles `tablist` / `tab` / `tabpanel`, navigation clavier ← → Home End, `aria-pressed`,
  `aria-valuenow` sur les barres, `role="img"` + libellé sur chaque graphique, focus visible.
- Modale : `role="dialog"`, `aria-modal`, fermeture Échap / clic extérieur, retour du focus.
- `prefers-reduced-motion` : animations neutralisées (les valeurs finales restent affichées).
- Aucune dépendance externe : les 114 SVG de la vue sont générés localement (≈ 236 Ko de DOM,
  pas de requête réseau, pas de canvas à repeindre).
- Impression : tous les volets sont dépliés, l'aurore et les outils sont masqués.

---

## 7. Vérifications

```bash
# parité FR/EN
node -e "…CZD_I18N.parity()…"        # 360 / 360, 0 clé manquante

# rendu de tous les volets dans les deux langues
node -e "…CZD_TPL.shell/overview/planPanel/clinicalPanel/familyPanel…"
# → aucune occurrence de NaN, undefined ou [object Object]
```


## Session 2/19 — thème Dark Bento

Le module suit désormais le design system de la plateforme (`styles/bento-design-system.css`).

- **Thème** : `citizen-dashboard.css` mappe ses variables (`--surface`, `--ink`, `--muted`, `--green-*`…) sur les jetons Dark Bento ; cartes plates à rayon 28 px, sans ombre ni halo ; texte toujours quasi noir sur fond lime ; taille de police minimale 13 px. Les sections 13 et 14 en fin de fichier portent la rangée d'activité et les corrections de composants.
- **Nouveau fichier `citizen-dashboard-bento.js`** (`CZD_BENTO.render(state)`) : rangée d'ouverture de la vue d'ensemble — Activité physique (3 courbes lissées), Jours actifs (calendrier cobalt), Sommeil (anneau), Plan de poids, Mes activités. Ordre de chargement : i18n → data → model → charts → **bento** → template → contrôleur.
- **Données de démonstration** : les séries hebdomadaires, le calendrier des jours actifs, les séances et les heures de coucher / réveil sont dérivés de façon déterministe du profil et des habitudes ; ce ne sont pas des mesures réelles.
- **Icônes** : plus aucun emoji ; tout passe par `CZD_CHARTS.icon(name)`. Les champs `icon` de `-data.js` / `-model.js` ne sont plus affichés (tables `PRIORITY_ICON` / `BADGE_ICON` dans le template).
- **Couleurs des données** : les couleurs issues de `-data.js` / `-model.js` sont converties vers la palette au rendu (`theme()` dans le template) ; ces deux fichiers ne sont pas modifiés.
- **Langue** : le sélecteur FR / EN propre au module est masqué ; la langue est pilotée par l'en-tête de la plateforme (`NUTRI_BENTO_I18N`). Les clés `czd.bento.*` existent en FR et EN.
- **Famille & mineurs** : tant que l'accès parental n'est pas confirmé, seul l'écran de consentement est rendu — aucune donnée de l'enfant n'est présente dans le DOM.
- **Graphique en colonnes** : la géométrie finale est écrite dans le SVG (hauteur bornée à la zone de tracé), l'animation est une simple mise à l'échelle CSS.
