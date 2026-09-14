# Health cockpit — validation

## Périmètre

- `web/index.html` : remplacement de **la seule section `#health`** et gardes dans les deux anciennes fonctions dédiées aux graphiques santé (`healthCharts` / `health`).
- `web/assets/health/model.js` : moteur déterministe autonome, partagé par l’interface et les tests Node.
- `web/assets/health/cockpit.js` et `.css` : interface exclusivement limitée à `#health`.
- Aucun changement dans `#agri`, le routage global, les autres sections ou les valeurs par défaut de Chart.js.

Les événements santé sont traités en capture sur `window`, **uniquement si la cible appartient à `#health`**, avant les anciennes délégations sur `document`. Les onglets utilisent un seul panneau dans le flux de la page : aucune modale, aucun empilement et aucun verrouillage global du défilement. Les décorateurs historiques de santé ont des sentinelles cachées ; les anciennes fonctions de graphiques santé sont ignorées pour ce cockpit. Les gestes natifs des champs, listes et accordéons restent actifs.

## Modèle

Données entièrement fictives. Le pays est un contexte de démonstration, pas une source statistique. Les hypothèses, limites, coûts unitaires et formules sont consultables dans « Hypothèses & preuves » et dans les exports JSON/CSV. L’incidence MNT modélise des **événements**, pas des personnes uniques. Les bénéfices monétisés correspondent uniquement aux coûts de soins MNT potentiellement évités, jamais à des recettes privées. Les impacts maternels et infantiles ne sont pas additionnés aux bénéfices financiers. Aucune connexion clinique ou institutionnelle n’est simulée comme étant réelle.

Un financement insuffisant réduit proportionnellement le programme. Les dépenses sont plafonnées ; les fonds non déployés ne sont pas comptés comme dépensés. La VAN peut être négative : aucun scénario n’est artificiellement forcé à être rentable. L’analyse ±25 % est une sensibilité, pas un intervalle de confiance.

## Tests unitaires sans dépendance

Depuis la racine du dépôt :

```sh
node --test nutri1/MVP/tests/health/model.test.cjs
node --check nutri1/MVP/web/assets/health/cockpit.js
```

18 tests : déterminisme, non-mutation, budget zéro, statu quo, rapprochement des flux, VAN, ratio bénéfice/coût, allocations, déploiement, pression, cohortes, cas extrêmes et isolation CSS.

## Test navigateur

Servir le dépôt avec un serveur statique, puis utiliser Playwright et son Chromium :

```sh
# Terminal 1, depuis la racine du dépôt
python3 -m http.server 8000 --bind 0.0.0.0

# Terminal 2 : dépendances de test uniquement, en dehors du dépôt
npm install --prefix /tmp/nutri-health-qa playwright
/tmp/nutri-health-qa/node_modules/.bin/playwright install chromium
HEALTH_PLAYWRIGHT_MODULE=/tmp/nutri-health-qa/node_modules/playwright \
  node nutri1/MVP/tests/health/browser.cjs
```

Variables facultatives : `HEALTH_URL`, `HEALTH_CHROMIUM_EXECUTABLE`, `HEALTH_CHROMIUM_MODULE` (chemin d’un module Chromium compatible Sparticuz), `HEALTH_SCREENSHOT_DIR` (répertoire existant, hors Git).

Le test vérifie les cinq scénarios, les leviers, les horizons/cohortes, les onglets, les territoires, les téléchargements JSON/CSV réels, FR/EN, les touches fléchées, Échap, le parcours animé, l’absence de panneaux historiques visibles, l’absence de débordement à 390/768/1024 px, puis le cockpit agriculture existant et le retour en santé.

## Vérifications effectuées

- 18 tests Node réussis.
- Parcours navigateur Chromium réussi, aucune erreur pendant les interactions santé.
- Rendu et clics contrôlés à 1512, 1024, 768 et 390 px ; aucune barre horizontale au niveau de la page ou du cockpit.
- Santé fonctionne avec les requêtes HTTPS externes bloquées (graphiques sans dépendance à Chart.js/CDN).
- Contrôle automatisé axe-core (WCAG 2 A/AA et 2.1 AA) sans violation détectée dans les vues santé auditées : vue d’ensemble, territoires, investissement et hypothèses. Cela ne constitue pas une certification d’accessibilité.
- Agriculture : ouverture de son cockpit puis retour en santé testés sans changement de son implémentation.
- Les cinq erreurs globales de chargement présentes à l’origine ont été reproduites sur le HTML de `HEAD` : `filterMarket` (élément null), syntaxe `ivory`, nom d’attribut V44 invalide, `V29_BASE_TEXT.forEach`, `this.setLocale`. Elles ne sont pas corrigées ici pour respecter le périmètre demandé. Le test navigateur les affiche séparément des erreurs d’interaction.
