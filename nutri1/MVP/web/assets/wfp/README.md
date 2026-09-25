# PAM · Food Security Analytics · Afrique de l'Ouest

Tableau de bord injecté dans la section `#wfp` de `nutri1/MVP/web/index.html`.

## Pourquoi des fichiers séparés ?

`index.html` fait déjà ~39 000 lignes / 2,9 Mo. Le module PAM vit donc à part et n'est relié à la page que par **quatre balises** :

```html
<!-- dans <head> -->
<link rel="stylesheet" href="assets/wfp/wfp-dashboard.css">

<!-- avant </body> — l'ordre compte -->
<script src="assets/wfp/wfp-data.js"></script>
<script src="assets/wfp/wfp-charts.js"></script>
<script src="assets/wfp/wfp-dashboard.js"></script>
```

`#wfp` conserve son texte d'origine tant que ces fichiers ne sont pas chargés. Au premier affichage de la vue, le composant remplace le contenu de la section. Le cockpit d'investissement PAM reste dans **Projects, Surveys & Nutrition Surveillance** (bouton dans la barre latérale du module).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `wfp-data.js` | 15 pays, phases IPC, séries FCS, prix marchés, CSI, pipeline, saisonnalité, budget, indicateurs. Données **illustratives**, figées, sans appel réseau. |
| `wfp-charts.js` | Moteur **100 % Canvas** (Chart.js n'est pas utilisé) : 15 graphiques + 3 minis KPI, tooltips, animations `requestAnimationFrame`. |
| `wfp-dashboard.css` | Styles scopés sous `#wfp`, préfixe `.wfp-`. Palette PAM : ambre `#F59E0B`, sidebar `#1C1008`, fond `#FFFBF0`, bordures `#FDE68A`. |
| `wfp-dashboard.js` | Markup, filtres Sahel / Côtier / Tous, périodicité, rapport, initialisation paresseuse. |

## Contenu

- Barre latérale **WFP DataHub** (épi de blé) : tableau de bord, sécurité alimentaire, marchés & prix, opérations, IPC, alertes précoces.
- En-tête : titre, badge « 3 pays IPC Phase 4 », sélecteur Mensuel / Trimestriel / Annuel, segment Sahel | Côtier | Tous, bouton **Générer rapport**.
- 5 cartes KPI : insécurité 43,7 M, FCS 41,2, 9 pays IPC 3+, 12,4 M bénéficiaires (67 %), indice prix 127,4.
- 15 graphiques Canvas : barres IPC empilées, courbes FCS, heatmap des prix, radar CSI, nuage prix/MAG, funnel, rose saisonnière, choroplèthe, aires céréales, double barres accès/disponibilité, histogramme HDDS, haltères FCS, calendrier d'alertes, waterfall budgétaire, bullet charts.

## Notes

- Les clics du module ne remontent pas vers les simulations historiques de la page (`v52`–`v54`), pour que les filtres et les graphiques restent utilisables.
- « Générer rapport » ouvre une synthèse imprimable. L'impression ne sort que `#wfp`.
- API légère : `window.WFPDash.getState()` et `WFPDash.setRegion("sahel" | "cotier" | "tous")`.
