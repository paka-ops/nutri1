# Health cockpit — parité avec Agriculture & validation

## Périmètre

- `web/index.html` contient la section `#health` et deux gardes dans ses anciennes fonctions de graphiques dédiées (`healthCharts` / `health`).
- `web/assets/health/model.js` : moteur déterministe autonome, inchangé par la correction visuelle.
- `web/assets/health/cockpit.js` et `.css` : interface exclusivement limitée à `#health` et à son dialogue enfant `#healthCockpit`.
- Aucune modification de la section Agriculture, de son CSS/JavaScript, du routage partagé ou des valeurs par défaut de Chart.js.

## Parité visuelle demandée

La précédente interface entièrement sombre à onglets intégrés a été remplacée par la composition d’**Agriculture** :

- même bandeau vert dégradé, titre et sous-titre citron, pastilles et quatre actions ;
- quatre statistiques dans le bandeau, puis **12 cartes KPI blanches** avec mini-graphiques ;
- même panneau de leviers vert, cartes individuelles, boutons de scénarios arrondis et horizon segmenté ;
- même pipeline à six étapes ;
- grilles de graphiques blancs en deux/trois colonnes et format asymétrique ;
- jauges, graphiques en colonnes, courbes, donut, radar, comparaison de scénarios, tables et neuf modules à mini-graphiques ;
- **cockpit sombre unique à sept onglets**, même fond flouté, fenêtre, bandeau, actions et pied de progression.

Le bloc `BEGIN AGRI PARITY` de la feuille santé est une copie du bloc `nutri-agri-v59-css` de `index.html`. Seuls les identifiants, classes, variables et noms d’animations sont renommés pour isoler Santé. Un test vérifie cette copie exacte. Des adaptateurs santé gèrent les graphiques SVG/HTML, les textes et le contraste des tables. Sur petit écran, les graphiques passent en une colonne pour rester lisibles.

Les événements santé sont traités en capture sur `window`, **uniquement si la cible appartient à `#health`**, avant les anciennes délégations sur `document`. Un seul dialogue natif est créé, ses onglets réutilisent un seul panneau. Il reste dans le DOM de Santé. Fermeture par croix, fond ou Échap, confinement du focus, retour au déclencheur et restauration de la valeur précédente du défilement. Changer de section ferme le cockpit. Les anciennes couches de simulation ne sont jamais ouvertes par les contrôles santé.

## Modèle

Données entièrement fictives. Le pays est un contexte de démonstration, pas une source statistique. Hypothèses, limites, coûts unitaires et formules sont consultables dans « Audit & méthode » et dans les exports JSON/CSV. L’incidence MNT modélise des **événements**, pas des personnes uniques. Les bénéfices monétisés correspondent uniquement aux coûts de soins MNT potentiellement évités, jamais à des recettes privées. Les impacts maternels et infantiles ne sont pas ajoutés aux bénéfices financiers.

Un financement insuffisant réduit proportionnellement le programme. Les dépenses sont plafonnées ; les fonds non déployés ne sont pas comptés comme dépensés. La VAN peut être négative. La sensibilité ±25 % n’est pas un intervalle de confiance. Aucune connexion clinique ou institutionnelle n’est présentée comme réelle.

Les visualisations supplémentaires sont dérivées du même moteur : les ruptures du parcours sont des catégories disjointes totalisant les adultes dépistés ; la comparaison de pression ne modifie que le choc ; les comparaisons de scénarios réutilisent les mêmes cohorte, horizon, actualisation et coût évitable.

## Tests unitaires sans dépendance

Depuis la racine du dépôt :

```sh
node --test nutri1/MVP/tests/health/model.test.cjs
node --check nutri1/MVP/web/assets/health/cockpit.js
```

**19 tests** : déterminisme, non-mutation, budget zéro, statu quo, rapprochement des flux, VAN, ratio bénéfice/coût, allocations, déploiement, pression, cohortes, cas extrêmes, isolation CSS et copie exacte des styles Agriculture.

## Test navigateur

```sh
# Terminal 1, depuis la racine du dépôt
python3 -m http.server 8000 --bind 0.0.0.0

# Terminal 2 : dépendances de test hors du dépôt
npm install --prefix /tmp/nutri-health-qa playwright
/tmp/nutri-health-qa/node_modules/.bin/playwright install chromium
HEALTH_PLAYWRIGHT_MODULE=/tmp/nutri-health-qa/node_modules/playwright \
  node nutri1/MVP/tests/health/browser.cjs
```

Variables facultatives : `HEALTH_URL`, `HEALTH_CHROMIUM_EXECUTABLE`, `HEALTH_CHROMIUM_MODULE` (module compatible Sparticuz), `HEALTH_SCREENSHOT_DIR` (répertoire existant hors Git).

Si le serveur est lancé depuis `nutri1/MVP/web`, utiliser `HEALTH_URL=http://127.0.0.1:8000/`.

Le test compare les **styles calculés réels d’Agriculture et Santé** : bandeau, typographie, cartes KPI, leviers, boutons, cartes de graphiques, modules, grilles, dimensions et fond du cockpit. Il vérifie ensuite les scénarios, leviers, horizons/cohortes, sept onglets, territoires, exports JSON/CSV, FR/EN, touches fléchées, confinement du focus, Échap, fermeture sur le fond, réouvertures répétées, six étapes animées, présentation, unicité des IDs, absence de panneaux historiques et absence de débordement à 390/768/1024 px. Il ouvre enfin le cockpit Agriculture et revient en Santé.

## Vérifications réalisées

- 19 tests Node réussis.
- Test Chromium de parité et d’interactions réussi ; aucune erreur pendant les interactions.
- Contrôle automatisé axe-core (WCAG 2 A/AA et 2.1 AA) : aucune violation détectée sur le tableau de bord et les sept dimensions du cockpit auditées. Ce n’est pas une certification d’accessibilité.
- Graphiques santé indépendants de Chart.js et de services distants ; fonctionnement avec les requêtes externes bloquées vérifié.
- Les cinq erreurs globales préexistantes de chargement restent hors périmètre : `filterMarket` (élément null), syntaxe `ivory`, nom d’attribut V44 invalide, `V29_BASE_TEXT.forEach`, `this.setLocale`. Elles avaient été reproduites sur le HTML original et sont affichées séparément par le test.
