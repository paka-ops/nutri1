# NUTRI.N°1 V59 — Section Santé (Ministère de la Santé) + socle partagé `NX.ui` / `NX.shell`

V59 remplace la démonstration statique de la section `#health` (« — » à la place
des chiffres, trois graphiques Chart.js hors-ligne, pastilles GIS décoratives)
par une **cellule nationale d'intelligence sanitaire** destinée au Ministère de
la Santé : nutrition mère-enfant, maladies non transmissibles liées à
l'alimentation, facteurs de risque, dépistage, cascade de prise en charge,
prévision, risque, investissement et méthode.

Deux apports structurants :

1. **Le socle de section est désormais extrait et partagé** — `NX.ui` (boîte à
   outils d'interface) et `NX.shell()` (coquille de section) ne contiennent plus
   aucun code métier : n'importe quelle autre section (UNICEF, OMS, PAM, FAO,
   surveillance) peut s'y brancher en écrivant uniquement ses données, ses
   modèles et ses vues.
2. **La section Santé est le premier consommateur de ce socle** : 8 onglets,
   tous les contrôles fonctionnels, graphiques SVG interactifs, simulations,
   prévision et note de décision exportable.

---

## 1. Nouveaux fichiers

| Fichier | Rôle |
| --- | --- |
| `web/assets/nutri-core/nutri-ui.js` | `window.NX.ui` — boîte à outils partagée : `card`, `kpi`, `kpiBand`, `animateKpis`, `field`, `select`, `segmented`, `slider`, `toggle`, `btn`, `meter`, `note`, `flow`, `dataTable`, `chart`, `chartHost`. Aucune dépendance hors `NX`. |
| `web/assets/nutri-core/nutri-shell.js` | `window.NX.shell(cfg)` — coquille commune d'une section : en-tête (kicker, titre, sous-titre, jetons, horloge UTC), barre de commande, bandeau de KPI pleine largeur animé, onglets collants, panneaux montés à la demande, tiroirs, note de décision, menu d'export, mode présentation, isolation des événements, recalcul au redimensionnement. Renvoie la « kit » : `boot`, `registerTab`, `showTab`, `refreshAll`, `openBrief`, `openExport`, `exportRows`, `exportJSON`, `copyText`, `toast`, `present`. |
| `web/assets/modules/health/health-data.js` | `window.NUTRI_HEALTH_DATA` — moteur de données déterministe : **17 pays** (mêmes codes que l'agriculture), **2010 → 2030**, profils sanitaires, nutrition mère-enfant, NCD, apports alimentaires, charge de morbidité, services, **régions réelles par pays**, historique rétro-projeté, bandes d'âge, qualité/provenance/partenaires, cibles OMS & repères renforcés. Se branche sur `NUTRI_AGRI_DATA` quand la section Agriculture est chargée (`agriLinked`). |
| `web/assets/modules/health/health-models.js` | `window.NUTRI_HEALTH_MODELS` — 10 métriques, 4 scénarios, 12 leviers chiffrés (USD/hab/an), prévision (lissage amorti + backtest + traction vers la cible), simulation de plan (cascade, DALY, coût/DALY, RAC, TRI, retour, emplois, équité), attribution alimentaire (PAF de type GBD), catalogue de 60 mesures régionalisées, optimiseur budgétaire (3 priorités politiques), état nutritionnel, cascade de soins, Monte-Carlo, sensibilité, comparatif 17 pays, indice de préparation, note de décision bilingue. |
| `web/assets/modules/health/health-module.js` | Onglets 1 à 4 : **Vue nationale**, **Mère & enfant**, **NCD & facteurs de risque**, **Dépistage & soins**. Montage de la coquille, barre de commande (pays, millésime, scénario, simulation, note, export, impression), KPI du bandeau supérieur, simulation nationale intégrée en 8 étapes, menu d'export (CSV/JSON). |
| `web/assets/modules/health/health-views.js` | Onglets 5 à 8 : **Nutrition & alimentation**, **Prévision & scénarios**, **Investissement & prévention**, **Méthode & données**. Navigation croisée vers la section Agriculture. |
| `web/assets/modules/health/health.css` | Couche visuelle dédiée (hero clinique animé, cartogramme régional, alertes, curseurs, mode présentation, impression). Les primitives de section (`.nx-kpi-band`, `.nx-sticky-tabs`, `.nx-kpi-num`) ont été déplacées dans `nutri-core.css` : elles servent toutes les sections. |

Tous les autres fichiers du dépôt sont inchangés, à l'exception de :

| Fichier | Modification |
| --- | --- |
| `web/index.html` | Section `#health` remplacée par un titre masqué + `<div id="healthRoot" data-nx-module="health">` ; feuille de style et six scripts ajoutés ; garde `[data-nx-module]` ajoutée aux trois couches héritées qui injectaient du contenu dans `#health` (V41 `healthCharts`, V43 `healthEnhance`, V44 `institutions`) et à V46 `health()`. |
| `web/assets/nutri-core/nutri-core.css` | Primitives de section partagées (bandeau KPI, onglets collants) + neutralisation imprimable. |
| `web/assets/nutri-core/nutri-ui.js` | Correction : `dataTable` dupliquait ses lignes à chaque nouveau rendu (nœud de lignes créé hors de `render()`). |
| `web/assets/modules/agri/agri.css` | Règles devenues partagées retirées (déplacées dans le noyau) ; aucune règle spécifique à l'agriculture modifiée. |
| `web/VERSION` | `V59`. |

## 2. Ce que la cellule permet de faire (8 onglets historiques ; 9 depuis les finitions v59.1)

1. **Vue nationale** — 6 KPI animés (population surveillée, retard de croissance, anémie des femmes, diabète/HTA, charge DALY, dépistage & assurance) ; trajectoire 2010 → **+10 ans** avec intervalle 80 % et cible nationale (8 indicateurs au choix) ; cascade décès → charge attribuable ; carte régionale interactive (risque, retard, diabète, dépistage) ; indice de préparation du système ; alertes précoces cliquables qui ouvrent l'onglet concerné ; **comparatif des 17 pays** (clic = le pays devient le pays analysé) ; double fardeau ; cartogramme ; chaîne alimentation → risque → maladie → coût.
2. **Mère & enfant** — état nutritionnel par bande d'âge (4 indicateurs), couverture des programmes vs cibles, fenêtre des 1 000 jours chiffrée, **simulateur** à 5 leviers (allaitement, alimentation de complément, fortification, cantines, agents communautaires) avec coût, DALY évités, vies sauvées et coût par DALY, table régionale triable, santé de la mère.
3. **NCD & facteurs de risque** — prévalences / charge / contrôle (3 vues), **attribution alimentaire** : 6 facteurs avec PAF, décès, DALY/100k et action de politique publique (tiroir détaillé), apports vs repères renforcés de l'OMS, origine des sucres & du sel (anneau), tendances base 100, mode de vie avec seuils.
4. **Dépistage & soins** — cascade population cible → dépistée → cas détectés → traités → contrôlés, avec **performance de détection mesurée sur les cas attendus** et fuites aval nommées ; **simulateur** à 6 leviers (dépistage, observance, agents communautaires, sel, sucres, activité) : couverture, cas détectés, complications évitées, vies sauvées, coût par DALY ; capacité des services par région (carte de chaleur cliquable) ; équité urbain/rural ; campagnes planifiables ; file d'attente priorisée.
5. **Nutrition & alimentation** — qualité du régime (séries historiques + repères), double fardeau régional, **indice composite de qualité du régime** (jauge + 6 jauges), disponibilité par groupe d'aliments (croisée avec l'Agriculture), chaîne « du champ à la maladie » avec export CSV, leviers alimentaires classés par charge évitable.
6. **Prévision & scénarios** — trajectoire avec intervalle 80 %, **4 scénarios comparés** (tendance, prévention, accéléré, inaction), Monte-Carlo 4 000 tirages (P10/P50/P90, probabilités), **tornade de sensibilité** (±10 % par moteur), tableau de bord des 10 indicateurs projetés, atteinte des cibles.
7. **Investissement & prévention** — **constructeur de portefeuille** : enveloppe annuelle (curseur) × priorité politique (vies / équité / rendement) → optimisation gloutonne de 60 mesures ; frontière coût-efficacité vs seuil OMS ; répartition par groupe et par région ; portefeuille détaillé et exportable ; structure de financement ; retour économique (cascade) ; comparaison des trois priorités ; coût des 12 leviers.
8. **Méthode & données** — indice de qualité des données (jauge + 6 facettes), provenance et statut des sources, **équations et hypothèses** du modèle, lacunes et feuille de route, calibration vs références publiées, limites d'usage, gouvernance & partenaires, réutilisation du socle (export JSON, copie de la méthode).

## 3. Modélisation (tout est recalculé, rien n'est saisi)

- **Prévision** : lissage exponentiel amorti sur l'historique, backtest glissant
  (MAPE, MAE, R², biais), puis traction vers la cible nationale dont l'intensité
  dépend du scénario et du plan (`strength = facteur × (1,2 % → 3,8 %/an)`).
- **Attribution alimentaire** : `PAF = 1 − exp(−k × dépassement du repère OMS
  renforcé)`, k calibré par facteur ; la charge attribuée est répartie au prorata
  des PAF, elle-même adossée à la charge nationale de morbidité.
- **Cascade de soins** : population cible (35 ans +) → dépistée → cas attendus
  (prévalence combinée diabète + 62 % de l'hypertension) → détectée (qualité
  laboratoire) → traitée (suivi) → contrôlée (contrôle tension/glucose observé).
- **DALY évités** : complications évitées (2,4 %/an chez les patients non
  contrôlés) × facteur de mise en œuvre (38 %) valorisées 21 DALY par décès évité
  et 6,4 par complication évitée, plus les gains mère-enfant et alimentaires.
- **Rentabilité** : un DALY évité vaut 1,6 × PIB/habitant (seuil OMS),
  actualisation à 9 % sur 10 ans → VAN, RAC, TRI (bissection), délai de retour.
- **Optimisation** : sélection gloutonne du meilleur rapport DALY/USD pondéré par
  la priorité politique, plafond de 6 mesures par levier, budget respecté.
- **Risque** : Monte-Carlo (4 000 tirages, chocs épidémiologiques, crises
  ponctuelles à 6 %/an) → distribution de la charge et probabilités.

Ordres de grandeur de contrôle (Togo, millésime 2026, modèle) : retard de
croissance 15,3 %, anémie des femmes 32,2 %, diabète 8,4 %, hypertension 28,7 %,
indice de risque composite 82/100, 16 290 DALY/100 000, 40 655 décès attribuables
à l'alimentation/an ; le plan à 50 % d'intensité évite ≈ 117 000 DALY/an pour
≈ 112 000 FCFA par DALY (RAC ≈ 8,7).

## 4. Intégration dans `web/index.html`

- `#health` ne contient plus qu'un titre masqué (accessibilité et titre de la
  page) et `<div id="healthRoot" data-nx-module="health">`.
- Ordre de chargement ajouté avant `</body>` :
  `nutri-ui.js` → `nutri-shell.js` → `health-data.js` → `health-models.js` →
  `health-module.js` → `health-views.js`.
- Les couches héritées ne touchent plus `#health` :
  - **V41 `healthCharts`** — sortie immédiate si `[data-nx-module]` (plus de
    recherche de canvas disparus) ;
  - **V43 `healthEnhance`** — plus de barre de filtres « Live population view » ;
  - **V44 `institutions`** — plus de barre « Live data view » ajoutée à `#health` ;
  - **V46 `health()`** — plus de KPI ni de graphiques injectés hors module ;
  - **V51/V52/V53/V54/V56/V57** — ces couches agissent sur des sélecteurs hérités
    (`.card`, `.ncd-card`, `.age-card`, `.module-grid`, `table tr`, `canvas`…)
    qui n'existent plus dans `#health` ; les clics dans la section sont en outre
    isolés par la coquille (`stopPropagation` à la racine du module), comme pour
    `#agri`.
- `nutri:countryChanged` et `nutri:i18nChanged` sont écoutés : changer de pays
  dans la barre supérieure de l'application recalcule toute la cellule ; changer
  de langue reconstruit la coquille **et les libellés d'onglets** (`labelT`).

## 5. Vérification (bancs d'essai jsdom, aucun navigateur graphique disponible)

*Tableau de la livraison initiale (8 onglets, avant les finitions v59.1) — les
chiffres à jour figurent au § 6.6.*

| Banc | Résultat |
| --- | --- |
| `health-check.js` (défaut) | 21 contrôles verts : 8 onglets, libellés bilingues, `#healthRoot` monté, bandeau 6 tuiles, sélecteur de pays, **rangées de cartes complètes** (somme des `span` multiple de 6), PAF bornés, optimiseur contraint par le budget, bornes de prévision P10 ≤ médiane ≤ P90 sur les 10 indicateurs. |
| `health-page.js` (page réelle) | 8 onglets ; 90 clics de contrôles, 13 curseurs, 103 lignes de tableau, 19 jauges ; **aucune erreur nouvelle** (parité exacte avec la page V57 : 4 erreurs préexistantes) ; résidus hérités dans `#health` : aucun ; bascule pays TG → SN recalculée ; bascule FR → EN → FR des onglets et des contenus. |
| `agri-test.js` | Non régression agriculture : 8 onglets, 103 contrôles, 0 erreur. |
| `full-page.js` | Non régression page complète : résidus `#agri` nuls, 97 contrôles, parité des erreurs avec V57. |
| `kpi-check.js` / `climate-check.js` | Non régression des KPI (bandeau identique au modèle) et des cartes climat. |

## 6. Finitions 2 (v59.1) — lisibilité, moteur graphique, cœur PMT-ICE

Trois défauts signalés sur la cellule Santé : des **mots qui se chevauchent**, deux
**jauges dont l'arc de valeur partait ailleurs** (« Data quality index » et
« National diet quality index ») et un **moteur de simulation aux sorties vides,
sans graphiques**. Analyse et corrections :

### 6.1 Arc de jauge (noyau `NX.charts.gauge`, tous les modules)

`arc()` utilisait `large-arc-flag = (to - from) > .5`. La jauge n'occupant qu'un
**demi-cercle**, un balayage de 0,56 ne vaut pas 180° mais 100,8° : le drapeau
passait à 1 dès 90° et le chemin SVG prenait **le grand arc**, c'est-à-dire le bas
du cercle — d'où l'arc qui « part complètement ailleurs ». Le drapeau ne vaut 1
que pour un balayage > 180° (`span > 1`) : il reste donc **toujours à 0**.
La jauge gagne au passage : pastille de butée, graduations, libellé de valeur
borné en largeur **et** en écart vertical (valeur et libellé ne peuvent plus se
toucher), rayons adaptatifs (12–14 px d'épaisseur, jamais de débordement).

### 6.2 Étiquettes de graphiques sans chevauchement (`NX.charts.bars`, `waterfall`)

Les libellés d'axe X étaient simplement tronqués à 12 caractères puis centrés sur
la bande : dans une carte étroite (grille `g-6`, 200–300 px) les mots se
superposaient. Le noyau applique désormais **trois verrous successifs** :

1. marge de l'axe dimensionnée sur la plus longue étiquette (et sur les graduations) ;
2. **rotation à −34° / −55°** dès que l'étiquette dépasse la largeur de bande,
   avec marge basse recalculée ;
3. **décimation** (une étiquette sur N) quand même la rotation ne suffit pas,
   selon l'emprise horizontale projetée.

Le `waterfall` (rentabilité, onglet Investissement) coupe ses libellés en lignes
bornées par la largeur de bande. Vérifié par `kit-charts.js` : 250 px / 8 régions
→ 4 étiquettes en rotation, 900 px → 4 étiquettes horizontales complètes.

### 6.3 Coquille partagée (`nutri-shell.js`)

- **Identifiants de panneaux préfixés par le module** (`#nx-panel-health-hub`) :
  `#agri` et `#health` déclaraient tous deux `nx-panel-overview`,
  `nx-panel-forecast`… `getElementById` renvoyait donc le mauvais panneau.
  Un attribut `data-tab` est ajouté pour les tests et le ciblage CSS.
- **Routage d'URL corrigé** : `#section/onglet` n'est honoré que si la section du
  hash est la section courante ; auparavant, `#agri/overview` faisait ouvrir
  « Vue nationale » à la cellule Santé au démarrage.
- `.nx-flow` : gouttière portée à 14 px (la flèche `›` en `right:-11px` débordait
  sur la tuile voisine) ; `.nx-tile` et `.nx-card-head` reçoivent les garde-fous
  `overflow:hidden` / `flex-wrap` / `overflow-wrap` qui interdisent tout débordement.

### 6.4 Nouvel onglet « Vue d'ensemble & moteur » (🧭, premier onglet)

Poste de pilotage de la cellule, **entièrement calculé par les modèles** :

- **Cœur PMT-ICE** — trois anneaux concentriques en SVG : anneau extérieur
  (maladies attribuables à l'alimentation, en DALY/100k dérivés des PAF),
  anneau médian (facteurs métaboliques : HTA, obésité, hyperglycémie, lipides),
  anneau intérieur (comportements : alimentation, inactivité, alcool, tabac, en
  ratio au repère OMS renforcé) ; moyeu = indice de risque composite.
  Les **12 cellules sont cliquables** : le panneau « Lecture du moteur » affiche
  le graphique de la cellule, ses chiffres, ses facteurs et l'action recommandée.
- **Moteur paramétrable** : indicateur suivi (8), scénario politique (4), horizon
  (3–20 ans), intensité des leviers (0–100 %), budget (5–150 M$) — chaque
  paramètre recalcule la prévision, les KPI de sortie et le portefeuille ;
  le sélecteur de scénario global de la barre de commande reste synchronisé.
- **Sorties permanentes** : courbe de prévision (réalisé / projection /
  incertitude 80 % / cible nationale), portefeuille optimisé (anneau par famille
  de mesures), cascade dépistage → contrôle, attribution alimentaire (PAF),
  boucle d'apprentissage (sources → modèles → décision → suivi → recalibrage).
- Boutons : **Lancer le moteur**, Prévision détaillée, Portefeuille, Leviers
  (tiroir des 12 leviers), Note de décision, **Synthèse CSV**.

### 6.5 Simulation nationale : sorties chiffrées **et** graphiques

Le tiroir de simulation produit désormais, en plus des 6 KPI : **6 graphiques**
(prévision avec bande d'incertitude, distribution Monte-Carlo, cascade, budget
par famille de mesures, attribution des PAF, charge évitée par famille de leviers)
et un **tableau millésime par millésime** (réalisé / projection / P10 / P90 /
cible), plus l'export CSV des sorties. Chaque sortie est isolée dans un
`try/catch` : une donnée manquante affiche une explication au lieu de laisser un
espace vide ; le tiroir ne peut plus rester muet.

### 6.6 Vérification (bancs jsdom)

| Banc | Résultat |
| --- | --- |
| `health-hub.js` (nouveau) | 0 échec : 9 onglets, cœur (12 cellules, 12 chemins sans drapeau d'arc erroné), 3 cellules cliquées → lectures distinctes, 3 curseurs, scénario synchronisé, simulation → **6 graphiques + 7 cartes + 8 lignes de tableau**, aucune carte vide, export CSV, tiroir des 12 leviers. |
| `gauges.js` (nouveau) | 0 échec : les deux jauges signalées — arc de valeur de y=250 (diamètre) vers y=76 / y=22, **dans le demi-cercle**, libellé séparé de 51 px. |
| `kit-charts.js` (nouveau) | 0 échec : géométrie de jauge + étiquettes de barres en 250 px et 900 px. |
| `health-check.js` | ✅ 9 onglets, bandeaux (section 6 + moteur 6), rangées multiples de 6, bornes de prévision ordonnées. |
| `health-deep.js` | 0 échec (présentation, note de décision, 6 exports, tiroir PAF, recalculs pays/millésime). |
| `health-page.js` | 9 onglets · 119 clics · 16 curseurs · 44 lignes de tableau · 21 jauges · **aucune erreur nouvelle** (parité V57 : 4 erreurs préexistantes) · résidus hérités : aucun. |
| `agri-test.js`, `full-page.js`, `kpi-check.js`, `climate-check.js` | Non régression : 103 contrôles / 0 erreur, parité des erreurs, bandeau conforme. |

Fichiers touchés par ces finitions : `nutri-core.js`, `nutri-core.css`,
`nutri-shell.js`, `health-views.js` (nouvel onglet + cœur), `health-module.js`
(simulation graphique, exports, familles de leviers), `health.css` (cœur, mise en
page), plus la documentation.

## 7. Suite

- Migrer `#agri` sur `NX.ui` / `NX.shell` (aujourd'hui l'agriculture conserve des
  copies privées : `nutri-ui.js` et `nutri-shell.js` ne sont encore utilisés que
  par la santé) ; puis créer les sections UNICEF / OMS / PAM / FAO sur le même
  modèle — seuls `*-data.js` et `*-models.js` changent.
- Brancher les sources réelles : DHIS2, EDS/DHS & SMART, STEPS, SARA, registres
  d'hôpitaux de référence, biomarqueurs — la cellule affiche déjà les statuts
  « publié / partiel / modélisé / à calibrer » et la feuille de route.
