# Citizen 360 — tableau de bord nutrition premium

Refonte complète de la section `#citizen` de `nutri1/MVP/web/index.html`.
Le dashboard est un **module autonome monté dans un Shadow DOM** : aucun style,
aucun gestionnaire d'événement et aucun traducteur global ne fuite vers les
autres vues de la plateforme (V38…V58).

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `citizen-360-host.css` | Feuille **light DOM** chargée par `index.html`. Neutralise les injections V39/V44/V45 dans `#citizen` et masque le bouclier de compatibilité. |
| `citizen-360.css` | Design system complet chargé **dans le Shadow DOM** : tokens, verre dépoli, grille 12 colonnes, cartes, SVG, formulaire, responsive, `prefers-reduced-motion`, impression. |
| `citizen-360-data.js` | Jeu de données déterministe : chroniques 7/30/90 jours, macronutriments, micronutriments, radar alimentaire, repas, risques, recommandations, profils famille, aliments locaux par pays. |
| `citizen-360-model.js` | Fonctions pures : IMC, WHtR, WHR, pression moyenne, statuts, score composite, normalisation base 100, formatage FR/EN, sélection d'aliments locaux. |
| `citizen-360-i18n.js` | Dictionnaires FR/EN (~170 clés), suivi de la locale plateforme + commutateur local FR/EN. |
| `citizen-360-charts.js` | Moteur SVG maison, sans Chart.js ni CDN : sparklines, jauge multi-anneaux, barres empilées, courbes multi-séries, donut, barres de couverture, radar, heatmap, bullet charts, courbe de croissance, tooltips. |
| `citizen-360-template.js` | Gabarits HTML : en-tête, héros, KPI, 8 cartes graphiques, journal des repas, recommandations, mesures, espace famille, pied de page. |
| `citizen-360.js` | Contrôleur : montage, état, délégation d'événements, calculs live, export CSV, impression, toasts, synchronisation langue/pays, visibilité de section, pont avec les anciens globals. |

## Graphiques livrés

1. **Jauge de score** — 3 anneaux concentriques (qualité alimentaire, équilibre métabolique, assiduité).
2. **4 sparklines KPI** — IMC, glycémie, tension, diversité.
3. **Énergie & équilibre** — barres empilées par repas + cible 2 100 kcal.
4. **Tendances cliniques croisées** — 4 séries normalisées base 100, activables/désactivables.
5. **Macronutriments** — donut + barres de distance à la cible.
6. **Micronutriments** — 8 bullet bars avec seuil à 100 %.
7. **Diversité alimentaire** — radar 6 axes, profil réel vs panier cible.
8. **Hydratation** — heatmap 4 semaines × 7 jours.
9. **Prévention** — 4 bullet charts de risque avec zones de seuil.
10. **Croissance enfant** — courbe IMC-âge avec bande P15–P85.

Tous les SVG sont interactifs (tooltip au survol), accessibles (`role="img"`,
`<title>`, `aria-label`) et responsive (`viewBox`). Le moteur ne dépend d'aucune
librairie externe : les graphiques restent visibles même si le CDN Chart.js est
indisponible.

## Intégration dans `index.html`

Trois modifications volontairement minimales :

1. `<link rel="stylesheet" href="components/citizen-360/citizen-360-host.css">` dans le `<head>`.
2. Le contenu historique de `<section id="citizen" class="view">` est remplacé par :
   un `<h2>` technique (lu par `go()` pour la barre supérieure), une ancre de
   compatibilité V39, un bouclier caché (`input[name=weight]` + `canvas#v38-citizen`)
   et `<div id="citizen360"></div>`.
3. Les 7 scripts du module sont chargés en fin de `<body>`, dans l'ordre
   `data → model → i18n → charts → template → controller`.

## Compatibilité avec les couches versionnées

- **V39** cherche un canvas `#v38-citizen` : le bouclier le fournit, ses KPI et
  contrôles injectés sont masqués par `citizen-360-host.css`.
- **V44** ajoute une barre « live » après le premier `<h2>` : masquée.
- **V45** recrée un formulaire s'il ne trouve pas de champ « weight » : le
  champ caché du bouclier l'en empêche.
- **V28 / V29 / institutional-i18n-engine** parcourent le light DOM : le Shadow
  DOM n'est pas traduit par erreur ; le module gère lui-même FR/EN.
- `saveCitizen`, `generateRecommendations`, `requestChildAccess`,
  `openChildNutritionPlan` et `loadFamilyChildDashboard` sont re-routés vers le
  nouveau module pour préserver les anciens points d'entrée.

## Langue & pays

Le module suit `NUTRI_I18N.locale` / `#language` / `#country`. Pour les langues
locales non couvertes (ewe, kabyè, twi…), il conserve la langue officielle du
pays (FR pour le Togo, EN pour le Ghana…). Le commutateur interne FR/EN est
persisté dans `localStorage.nutri_citizen360_lang` et n'affecte que ce module.
Le pays sélectionné modifie les aliments locaux recommandés dans le journal.

## Données

**Toutes les valeurs sont des données de démonstration.** Les scores, références
et recommandations sont indicatifs et n'ont aucune valeur diagnostique. Le
tableau de bord le rappelle explicitement dans le pied de page, le formulaire
de mesures et le panneau de prévention.

## API de débogage

```js
Citizen360.setPeriod(90);
Citizen360.setLanguage('fr');
Citizen360.setCountry('GH');
Citizen360.exportCsv();
Citizen360.render();
```
