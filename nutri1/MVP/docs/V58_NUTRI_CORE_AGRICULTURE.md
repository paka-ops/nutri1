# V58 — NUTRI CORE et cellule d'intelligence agricole (Ministère de l'Agriculture)

V58 transforme la section `#agri` (`web/index.html`) en cellule de décision
agricole complète et introduit un socle réutilisable par les autres sections.

## Architecture additive

```
web/assets/nutri-core/          moteur générique (aucune dépendance, SVG natif)
    nutri-core.css              système de conception .nx-*
    nutri-core.js               window.NX : DOM, formats, statistiques, graphiques, overlays, i18n
web/assets/modules/agri/        premier consommateur (modèle à copier)
    agri-data.js                données déterministes (pays, produits, millésimes, climat, régions)
    agri-models.js              modèles analytiques purs, sans DOM
    agri-module.js              coquille, boîte à outils NUTRI_AGRI_KIT, onglets 1–4
    agri-views.js               onglets 5–8
    agri.css                    couche visuelle dédiée
```

Dans `web/index.html` : deux `<link>` dans `<head>`, la section `#agri` réduite à
un titre masqué et `<div id="agriRoot" data-nx-module="agri">`, et cinq
`<script src>` avant `</body>`.

## Contrat de données

`NUTRI_AGRI_DATA.build(codePays, année)` renvoie :

- `country, countryName, year, years, crops, totals, nutrients`
- `history` : `years, productionT, areaHa, yieldTha, lossPct, climateRisk, importT, valueUsd, gapT, kcalPerCap, climateIndex, consumedT, exportedT, wasteT`
- `regions[]` : `name, share, productionT, lossT, lossPct, climateRisk, storage, cold, gapT, hotspot`
- `climate` : `tempAnomaly, rainBase, monthly[], events[]`
- `prices, profile, dataQuality, provenance`

Chaque produit porte : `id, fr, en, group, icon, areaHa, yieldTha, productionT,
lossPct, lossT, loss.stages{…}, loss.total, totalAvailT, needT, gapT,
sufficiency, priceUsdKg, valueUsd, lossValueUsd, exportedT, importedT,
consumedT, nut{kcal,prot,fe,va,zn}, climateSensitivity, nutritionDensity`.

## Contrat de modèles

| Fonction | Sortie |
| --- | --- |
| `nutritionGap(ds)` | deux repères par nutriment, contributeurs, chaîne, score, sous-alimentation déclarée |
| `lossSim(ds, leviers)` | tonnes/valeur/calories/eau/CO₂/emplois sauvés, coût, VAN, TRI (bisection), BCR, délai de retour |
| `climateStress(ds, {dTemp, dRain, adaptation, horizon})` | production projetée, perte additionnelle, vulnérabilité par produit |
| `forecast(ds, cfg)` | `labels, history, point, lo, hi, future, futureLo, futureHi, baseline, diagnostics{mape,mae,r2,bias,trendPct,cagr}, probAbove` |
| `monteCarlo(ds, {runs, horizon, lossTarget, plan})` | P10/P50/P90 pour autosuffisance, écart et pertes, probabilités, histogramme, échantillons |
| `nutritionGap(ds)` | disponibilité vs besoin par nutriment, couverture, contributeurs, criticité, chaîne |
| `interventions(ds)` | 11 mesures notées (tonnes sauvées, valeur, coût, BCR, délai, emplois) |
| `optimizeBudget(ds, catalogue, budget, {priority})` | portefeuille optimal par ratio bénéfice/coût |
| `brief(ds)`, `sensitivity(ds)`, `coverage()` | note de décision, sensibilités, couverture |

## Interaction et non-régression

- Les couches héritées V39/V44/V46/V51/V52/V53/V54/V57 n'agissent plus sur `#agri`
  (entrées retirées ou garde `#agriRoot`), V56 ne couvrait pas `#agri`.
- V48/V49 ignorent les sélecteurs situés dans `.nx-scope`.
- Le module reste autonome : navigation par `#agri/<onglet>`, réaction à
  `nutri:countryChanged` et `nutri:i18nChanged`, reconstruction sans doublon.

## Calibrage et unités

- Surfaces : `arable` est en millions d'hectares ; coefficient de mise en culture
  (0,62 vivrier / 0,68 rente) puis normalisation par la somme des parts de culture.
- Nutrition : apports calculés sur les volumes consommés (t → g → mg/µg) puis
  ramenés par habitant et par jour ; deux repères par nutriment (`max` population,
  `vuln` groupes vulnérables) et deux couvertures (`coverage`, `coverageVuln`).
- `nutritionGap()` renvoie en plus `gapsMean`, `gapsVuln`, `undernourished`,
  `peopleUndernourished` ; `critical` retient les nutriments sous 90 % du plus
  contraignant des deux repères.
- Simulateur de biofortification : la part des volumes consommés convertie en
  variétés enrichies produit un gain en mg/µg/g **par habitant et par jour**,
  affiché avec la couverture du repère moyen et celui des femmes.

## Honnêteté des données

Toutes les valeurs sont des estimations modélisées, déterministes et
reproductibles, étiquetées `reported` ou `modelled`. Aucune n'est présentée comme
une statistique officielle. Le calibrage avec les données du Ministère, des
laboratoires et des partenaires est décrit dans l'onglet « Données & méthode ».
