# NUTRI.N°1 — Cockpit Santé Citoyen 360° (`#citizen`)

Refonte **additive** de la section citoyenne du MVP : aucun élément existant n'a été
supprimé, tout le balisage historique est conservé, réparé et enrichi par un moteur de
données, de simulation et de prédiction construit sur un noyau réutilisable
(**NutriVision**) que les autres sections pourront monter tel quel.

Fichiers ajoutés :

| Fichier | Rôle | Taille |
| --- | --- | --- |
| `web/assets/nutri-vision.js` | Noyau réutilisable : utilitaires, RNG deterministe, statistiques, Monte-Carlo, thème, moteur de graphiques SVG, bus, i18n, store, export, composants UI, registre de modules | ~1 670 lignes |
| `web/assets/nutri-vision.css` | Système de design « cockpit » sombre, porté par `.nv-scope` (le reste de l'app n'est pas affecté) | ~1 130 lignes |
| `web/assets/nutri-citizen.js` | Module citoyen : base alimentaire, modèles, panneaux, interactions | ~4 100 lignes |

Fichiers modifiés : `web/index.html` uniquement (5 interventions chirurgicales, voir
« Intégration » ci-dessous). Aucune dépendance npm, aucun build : la démo reste un
fichier HTML + 3 assets statiques.

---

## 1. Ce que voit l'investisseur

### Cockpit d'identité (hero)
Avatar, membre, pays, qualité/complétude des données, jauge de **NutriScore global
(0–100)** avec bande de santé, 4 KPI historiques (IMC, poids, tour de taille, tension)
conservés et enrichis (sparkline 90 j + référence chiffrée), puis un **flux biométrique
vivant** : fréquence cardiaque, VFC, SpO₂, pas, sommeil, hydratation, glucose capteur —
7 mini-graphes qui se mettent à jour en direct (vitesse ×1/×2/×4, pause/reprise).

### KPI cliniques additionnels
Glycémie, HbA1c, cholestérol, DFG (CKD-EPI 2021), pression artérielle moyenne,
score d'adhésion, diversité MDD-W, exposition aux ultra-transformés — chacun avec
sparkline historique, référence et code couleur. Bloc « dérivés cliniques » :
IMC, RTH, RTT, PAM, DFG, dépense énergétique de repos, balance énergétique.

### Moteur de score
Anneaux de contribution (5 sous-scores : anthropométrie, métabolique, pression
artérielle, qualité alimentaire, mode de vie), radar d'adéquation aux besoins
(11 nutriments), liste d'adéquation nutriment par nutriment.

### Tendances (cartes historiques conservées)
Les 3 canvas Chart.js d'origine restent dans le DOM mais sont masqués et remplacés par
des graphiques SVG interactifs du noyau : anthropométrie (poids/IMC/taille + cible du
scénario), métabolique & clinique (glycémie/PAS/PAD + zones 70–100–126 mg/dL),
paramètres cliniques liés à la nutrition (diversité, fruits & légumes, maîtrise du
sodium, aliments bruts, équilibre énergétique, indices 0–160 % avec bande cible).
Barre d'outils 30/90/180/365 jours.

### Comparaison aux références
`#referenceCards` (conteneur d'origine) reçoit 11 fiches : valeur, intervalle de
référence, curseur de position, statut. Un graphique de divergences complète la carte
(écart en % à la référence).

### Laboratoire de prédiction
* Prévision 3–60 mois sur 7 variables (poids, IMC, glycémie, HbA1c, PAS, score, tour de
  taille) : historique, cône P10–P90 / P25–P75, P50 sans action vs P50 avec scénario,
  seuil clinique tracé, P(seuil franchi) calculée sur les trajectoires.
* **Risques 10 ans** (diabète de type 2, hypertension, MCV, anémie, obésité) avec
  probabilité, IC 90 %, bande, et **attribution factorielle** cliquable (barres
  divergentes : impact de chaque facteur en points de risque).
* **Cohorte de Markov** à 5 états (sain → à risque → prédiabète → diabète →
  complications) : aires empilées sur 10 ans, années en bonne santé, probabilité de
  rester sans diabète, progression annuelle, matrice inspectable.
* **Détection d'anomalies** sur 45 jours (z-score + pente) : alertes datées et chiffrées.

### Simulateur de scénarios
5 préréglages (laisser-faire, −5 % de poids, modèle local & bio, cible sel OMS, citoyen
actif, programme prévention complet) + 10 curseurs (poids, activité, fruits & légumes,
sodium, sodas, ultra-transformés, sommeil, part bio, adhésion, alcool, tabac).
Sorties : Δ NutriScore, Δ années en bonne santé, **coûts de santé évités** (devise
locale), jours de productivité, empreinte alimentaire (kg CO₂e/an), panier quotidien,
deltas de risque par pathologie, comparaison de trajectoires, et un volet
**« votre demande bio oriente l'offre »** (demande vs offre nationale traçable,
dépense hebdomadaire chez les producteurs, signal d'opportunité agricole).

### Journal nutritionnel
56 aliments de la base analysée en laboratoire, filtrés par pays et saison, groupés
(13 groupes) ; portions 50/100/150/250 g, repas actif, **scan IA** (stépper 5 étapes :
capture → reconnaissance → portions 3D → composition laboratoire → impact métabolique),
donut macros, 12 jauges d'adéquation, **heat-map d'adhésion** (12 semaines × 4 repas),
série, jours suivis, couverture moyenne.

### Plan alimentaire local & bio optimisé
Optimiseur stochastique (320 permutations + calibrage énergétique itératif) sur les
aliments du pays : 7 jours, 4 repas, grammages, coûts en devise locale, part bio tracée,
hors-saison signalé, radar de couverture des besoins, notes (sodium, saison, empreinte,
IG moyen), **liste de courses 7 jours** exportable, budget ≤ 2,2/3,4/5/7,5 $/jour,
régénération, et « ajouter au journal » (repas ou journée entière).

### Alertes & recommandations
Alertes cliniques classées (IMC, adiposité abdominale, tension, signal diabète,
cholestérol, fonction rénale, fer, activité, sodium, UPF, tabac + anomalies) avec actions
contextuelles (RDV, base aliments, plan, simulation, preuves, marché bio) et masquage.
`#recs` (carte d'origine) reçoit des recommandations priorisées : impact chiffré,
justification, **niveau de preuve** (OMS/méta-analyse, cohorte, données locales).

### Famille & mineurs
Tableau enfant conservé et enrichi : statistiques de croissance, **courbes OMS**
(taille/poids avec P3–P97 et marqueur), radar de diversité MDD-C, alertes pédiatriques,
**consentement parental** (stépper OTP → signature → registre, code de consentement
persisté), **plan nutritionnel enfant** (cantine + maison) exportable.

### Modales fonctionnelles
Base alimentaire interrogeable (recherche, groupe, saison, bio, ajout au journal),
graphe des preuves (8 sources + niveaux), prise de rendez-vous (4 nutritionnistes,
créneau, paiement mobile money, confirmation), transparence du modèle (paramètres,
table des contributions, matrice de Markov, couverture du plan), rapport 360°,
liste de courses, synchronisation des capteurs, partage sécurisé.

### Données, export & confidentialité
Export JSON complet (profil, dérivés, apports, score, risques + IC + contributions,
prévisions, Markov + matrice, scénarios, plan 7 jours, alertes, recommandations,
journal, historique 90 j), CSV historique, CSV plan, CSV plan d'action, impression/PDF
du rapport.

---

## 2. Ce qui a été réparé (fonctionnalités existantes)

| Élément | Avant | Après |
| --- | --- | --- |
| `saveCitizen()` (bouton « Save & calculate ») | **non défini** → `ReferenceError` | lit le formulaire historique + les champs ajoutés, recalcule tout |
| `updateReferences()` (`onchange`/`oninput` de `#profile`, `#age`, et dernier appel de `init()`) | **non défini** → erreur console au chargement | recalcule références, KPI et fiches de comparaison en direct |
| `generateRecommendations()` | **non défini** | recommandations priorisées + preuve + export |
| `loadFamilyChildDashboard()` | version statique (texte) | z-scores OMS, courbes de croissance, radar, alertes |
| `requestChildAccess()` | simple toast | consentement RGPD horodaté (stépper + code persisté) |
| `openChildNutritionPlan()` | simple toast | plan enfant optimisé 7 jours + export CSV |
| `#recs` | texte d'attente | recommandations chiffrées dès le montage |
| `#referenceCards` | texte d'attente | 11 fiches de référence + graphique d'écarts |
| SyntaxError couche V48 (`"cote d'ivoire":'CI"` mal fermé) | **tout le moteur de langues V48 mort** | corrigé |
| `this.setLocale` (rappel V34, `this` ≠ `NUTRI_I18N`) | erreur, locale FR/ES jamais ré-appliquée | corrigé |
| `filterMarket()` sur des conteneurs supprimés en V5x | `TypeError` dès que `init()` allait au bout | garde-fou |
| `V29_BASE_TEXT.forEach` sur un `WeakMap` | `TypeError` à chaque mutation du DOM | passe laissée inactive (comportement historique) mais silencieuse |
| `btn.dataset['v44'+match]` avec espaces (V44) | `InvalidCharacterError` au clic | clé normalisée |

Résultat mesuré (jsdom, page complète) : **4 erreurs console non capturées avant →
0 après**, et 118 assertions d'intégration au vert.

---

## 3. Intégration dans `web/index.html` (5 points, tous réversibles)

1. `<head>` : `<link rel="stylesheet" href="assets/nutri-vision.css">` après
   `ui-refresh.css` (priorité à spécificité égale).
2. Avant le script historique principal : `<script id="nutri-citizen-bridge">` — définit
   immédiatement les 6 fonctions appelées par le balisage (elles n'existaient pas) et les
   fait déléguer au moteur dès son montage.
3. Couche V44, `citizen()` : `if(window.NUTRI_CITIZEN_ENGINE)return;` — la couche reste
   intacte pour toutes les autres vues.
4. Couche V45, `setup()` : même garde — plus de champs ni de graphiques dupliqués dans
   `#citizen` (V45 reste le repli si le moteur est absent).
5. Fin de `<body>` : chargement de `assets/nutri-vision.js` puis
   `assets/nutri-citizen.js`. L'ordre d'exécution des couches V28→V57 est inchangé.

Le drapeau `window.NUTRI_CITIZEN_ENGINE` est posé dès le chargement du module ; les
couches historiques le testent au moment de leur exécution (DOMContentLoaded pour V44,
DOMContentLoaded + 900 ms et MutationObserver pour V45).

---

## 4. Garantie « rien n'est perdu »

* Les canvas `#anthroChart`, `#clinicalChart`, `#nutritionClinicalChart` restent dans le
  DOM (masqués) : si le moteur est retiré, V44/V45 reprennent la main immédiatement.
* Les identifiants historiques (`#bmi`, `#weight`, `#waist`, `#bp`, `#bmiRef`,
  `#weightRef`, `#waistRef`, `#bpRef`, `#referenceCards`, `#recs`, `#familyDashboard`,
  `#familyChildDashboard`, `#familyMember`, tous les champs du formulaire) sont conservés
  et alimentés par le moteur.
* Les attributs `data-i18n`/`data-t` du balisage d'origine ne sont pas touchés : les
  couches de traduction historiques continuent de s'appliquer.
* Les panneaux ajoutés vivent dans des conteneurs `.nv-*` indépendants ; un retrait des
  trois assets + des 5 points d'intégration restaure la page précédente.

---

## 5.Tester la démo

```bash
cd nutri1/MVP/web
python3 -m http.server 8000 --bind 0.0.0.0
# http://localhost:8000  →  bouton « Citizen Dashboard 360° »
```

Aucune dépendance : tout est calculé côté client (aucun appel réseau hors
`locales/*.json` et Chart.js déjà présent). Les données sont de démonstration,
déterministes par profil, persistées en `localStorage` (`nutri.citizen.*`).

Test d'intégration automatisé (jsdom) : 118 assertions — montage, conservation du
balisage, 17 hôtes de graphiques, journal, plan, alertes, famille, 20+ actions
clicables, modales, exports, API publique, absence de duplication V44/V45,
0 erreur console.

> Les valeurs cliniques, économiques et d'empreinte sont illustratives (démonstrateur
> front) et ne doivent pas être présentées comme des statistiques officielles.
