# NUTRI.N°1 V58 — NUTRI CORE + Section Agriculture (Ministère de l'Agriculture)

V58 remplace la démonstration statique de la section `#agri` par une véritable
cellule d'intelligence agricole destinée au **Ministère de l'Agriculture** :
production par produit, pertes post-récolte étape par étape, climat et
résilience, prévision, Monte-Carlo, nutrition, investissement et méthode.

Le même socle est réutilisable : il suffit de copier `assets/modules/agri/` et de
remplacer les données + les modèles pour créer une autre section.

## Nouveaux fichiers (100 % additifs, aucune dépendance externe)

| Fichier | Rôle |
| --- | --- |
| `web/assets/nutri-core/nutri-core.css` | Système de conception `NX` (variables, cartes, KPI, graphiques, tableaux, tiroirs, modales, simulations). Tous les sélecteurs sont préfixés `.nx-`. |
| `web/assets/nutri-core/nutri-core.js` | Moteur réutilisable `window.NX` : DOM, formatage, statistiques (Holt-Winters, Monte-Carlo, backtest, médiane), graphiques SVG (ligne, barres — y compris repère vertical en mode horizontal —, anneau, cascade, chaleur, jauge, sparkline), overlays, export, i18n, palette. |
| `web/assets/modules/agri/agri-data.js` | Moteur de données déterministe `window.NUTRI_AGRI_DATA` : 17 pays, 7 groupes, 30 produits, 17 millésimes, 5 zones climatiques, profils, qualité et provenance. |
| `web/assets/modules/agri/agri-models.js` | Modèles analytiques `window.NUTRI_AGRI_MODELS` : pertes (10 leviers), climat, prévision (4 scénarios), Monte-Carlo, nutrition, interventions, optimisation budgétaire, note de décision. |
| `web/assets/modules/agri/agri-module.js` | Coquille + onglets 1 à 4 (Vue nationale, Production, Pertes, Climat) + boîte à outils partagée `NUTRI_AGRI_KIT`. |
| `web/assets/modules/agri/agri-views.js` | Onglets 5 à 8 (Prévision & simulation, Nutrition & valeur, Investissement & décision, Données & méthode). |
| `web/assets/modules/agri/agri.css` | Couche visuelle dédiée (bandeau KPI collant, onglets collants, cartogramme, mode présentation, impression). |

## Intégration dans `web/index.html`

- Deux feuilles de style ajoutées dans `<head>` (`nutri-core-css`, `nutri-agri-css`).
- La section `#agri` ne contient plus qu'un titre masqué (accessibilité / barre de
  titre de l'application) et `<div id="agriRoot" data-nx-module="agri">`.
- Cinq scripts ajoutés avant `</body>` dans l'ordre : noyau → données → modèles →
  module → vues.
- Les couches héritées n'interviennent plus dans `#agri` (aucun doublon de
  graphique, de KPI ou de superposition) : les entrées `agri` ont été retirées de
  V39 (`pageDefs`), V44 (modules et filtres), V51, V52, V53, V54 et V57, et V46
  est court-circuité lorsque `#agriRoot` existe. V56 ne couvrait déjà pas `agri`.
  Les sélecteurs de langue hérités (V48/V49) ignorent tout élément `.nx-scope`.

## Ce que le Ministère peut faire dans la section

1. **Vue nationale** — 6 KPI animés, cartogramme des régions, classement des hotspots de pertes, trajectoire 2010 → 2036 (production / rendement / surfaces / pertes / kcal), **comparaison régionale des 17 pays (classement, moyenne CEDEAO + AES, clic pour changer de pays)**, chaîne alimentaire cliquable, alertes et note de décision.
2. **Production & produits** — recherche, filtres, tri, 3 unités (tonnes, dollars, kg/habitant), indice 2010 = 100 (production / surfaces / rendement), concentration de la valeur, **marchés & qualité (indice des prix du panier, termes de l'échange, volatilité, stockage, chaîne du froid, réseau routier, couverture laboratoire)**, détail produit, pertes par étape, export CSV.
3. **Pertes post-récolte** — simulateur à 10 leviers (récolte, stockage, transport, transformation, marché, chaîne du froid, irrigation, semences, vulgarisation, biofortification) avec tonnes sauvées, valeur, calories, eau, CO₂, emplois, TRI/VAN/délai de retour et comparaison avant/après.
4. **Climat & résilience** — pluie, température, NDVI, indice de stress, registre d'événements, projection à 10 ans selon ΔT°, Δpluie, adaptation et horizon.
5. **Prévision & simulation** — Holt-Winters amorti, 4 scénarios, bandes P10–P90, backtest glissant (MAPE/MAE/biais/R²), Monte-Carlo 10 000 tirages (probabilité de rupture, dépassement du seuil de pertes, histogramme, export CSV).
6. **Nutrition & valeur** — couverture des besoins par nutriment, flux Ferme → Assiette → Santé, contribution par produit, densité nutritionnelle, simulateur de biofortification, programme laboratoire.
7. **Investissement & décision** — portefeuille de mesures, budget, priorité, filtre régional, optimisation coût/bénéfice, VAN/TRI/BCR, classement régional, report du plan sur la prévision, export CSV.
8. **Données & méthode** — piliers de qualité contre objectif 80 %, lacunes à combler, pipeline exécutable, provenance indicateur par indicateur, API institutionnelles, feuille de route 12 mois et engagement de transparence.

## Calibrage des données (modèle)

- La surface arable de chaque pays est exprimée en **millions d'hectares** ; seules
  62 % (cultures vivrières) à 68 % (cultures de rente) sont considérées comme
  effectivement cultivées chaque année (jachère, parcours, pertes de sol).
- La répartition entre produits est normalisée par la somme des parts de culture :
  la surface cultivée ne dépasse jamais la surface arable du pays.
- Les apports nutritionnels sont calculés sur les volumes **réellement consommés**
  (après pertes post-récolte, pertes ménagères et échanges) puis convertis en
  apports par habitant et par jour (t → g → nutriment).
- Chaque nutriment est comparé à **deux repères** : le repère moyen de la
  population (FAO/OMS) et le repère des **groupes vulnérables** (femmes en âge de
  procréer, jeunes enfants) — c'est ce second repère qui révèle les carences.

Contrôle de cohérence (millésime 2026, sortie du modèle) :

| Pays | Production | Pertes | Autosuffisance | Surface cultivée |
| --- | --- | --- | --- | --- |
| Togo | 7,98 Mt | 30,7 % | 97 % | 1,73 M ha |
| Bénin | 8,81 Mt | 29,5 % | 76 % | 1,83 M ha |
| Sénégal | 7,47 Mt | 27,6 % | 67 % | 2,09 M ha |
| Nigeria | 93,6 Mt | 31,2 % | 58 % | 20,8 M ha |
| Niger | 28,4 Mt | 33,8 % | 114 % | 11,0 M ha |

## Honnêteté des données

Toutes les valeurs affichées sont des **estimations modélisées**, déterministes et
reproductibles (graine `pays | produit | millésime`), étiquetées `reported`
(ordre de grandeur publié) ou `modelled`. Elles illustrent ce que la plateforme
produira **avec** les données du Ministère, des laboratoires et des partenaires.
Aucune valeur n'est présentée comme une statistique officielle ; le calibrage est
décrit comme un processus documenté, versionné et auditable.

## Réutilisation par une autre section

```js
// 1) copier assets/modules/agri/ → assets/modules/<domaine>/
// 2) réécrire <domaine>-data.js (même forme de sortie que build())
// 3) réécrire <domaine>-models.js (fonctions pures, sans DOM)
// 4) conserver la coquille, les onglets et la boîte à outils telles quelles
K.registerTab({ id: 'overview', icon: '📊', label: T('Vue nationale', 'National view'), mount(host) { /* … */ } });
```

La boîte à outils expose : `card, kpi, field, select, segmented, slider, toggle,
btn, meter, note, flow, dataTable, chart, chartHost, rebuild, refreshAll,
showTab, setPlan, toast, exportRows, exportJSON, openDrawer, closeDrawer,
runSteps, registerTab`.

## Vérification

- `node --check` sur les cinq fichiers JavaScript : OK.
- Banc d'essai jsdom (module seul) : 8 onglets, 103 contrôles actionnés, 0 erreur.
- Banc d'essai jsdom (page réelle `web/index.html`) : montage de `#agriRoot`,
  8 onglets, 103 contrôles actionnés, 0 interception par les couches héritées,
  0 résidu, réactions à `nutri:countryChanged` et `nutri:i18nChanged` validées.
- Contrôles ciblés : bandeau KPI (valeurs non nulles avant/après l'animation de
  comptage), montant/unités des apports nutritionnels par habitant, historiques et
  sommes régionales cohérentes avec le total national.
- Les erreurs restantes du chargement de la page sont **antérieures à V58**
  (identiques avec la version V57 témoin).
