# NutriVision — noyau front réutilisable (graphiques, stats, simulation, UI)

`web/assets/nutri-vision.js` + `web/assets/nutri-vision.css` forment un noyau
**sans dépendance** (aucun npm, aucun build, aucun appel réseau) conçu pour être monté
sur n'importe quelle section de la plateforme. `web/assets/nutri-citizen.js` en est la
première application concrète (section `#citizen`) et sert de modèle.

```
index.html
  ├─ <link assets/nutri-vision.css>      système de design, porté par .nv-scope
  ├─ <script assets/nutri-vision.js>     NV.util / rng / stats / theme / chart /
  │                                      bus / i18n / store / export / ui / app
  └─ <script assets/nutri-citizen.js>    module « citizen » (NV.app.module)
```

Le noyau s'auto-amorce : `NV.app.boot()` est appelé sur `DOMContentLoaded` (+30 ms),
monte tous les modules enregistrés, enveloppe `go()` (sans le modifier) pour émettre
`NV.bus 'view'`, et gère le deep-link `#section`.

---

## 1. Monter un module sur une autre section

```js
(function (global) {
  'use strict';
  const NV = global.NutriVision;
  const U = NV.util, S = NV.stats, UI = NV.ui, CH = NV.chart, RNG = NV.rng;
  let root = null;

  function htmlPanel() {
    return UI.panel({
      id: 'agriPanel', icon: '🌾', title: 'Intelligence agricole',
      subtitle: 'Offre bio tracée par pays',
      actions: UI.btn('Recalculer', { action: 'recompute', icon: '↻', kind: 'primary' }),
      body: '<div class="nv-grid nv-g4" id="agriKpis"></div>' +
            '<div class="nv-chart-host" data-chart="supply" style="height:280px"></div>'
    });
  }

  function render() {
    root.querySelector('#agriKpis').innerHTML =
      UI.kpi({ label: 'Producteurs', value: '48 620', icon: '👩🏾‍🌾', tone: 'good' });
    CH.mount(root.querySelector('[data-chart="supply"]'), {
      type: 'bars', labels: ['TG', 'GH', 'BJ', 'SN'],
      series: [{ name: 'Offre bio', data: [42, 38, 31, 27], color: '#38f0a5' }]
    });
  }

  function mount(r) {
    root = r;                                   // r = <section id="agri">
    root.classList.add('nv-scope');             // active le thème cockpit
    root.insertAdjacentHTML('beforeend', htmlPanel());
    root.addEventListener('click', (e) => {     // délégation : 1 seul écouteur
      const b = e.target.closest('[data-nv-action]');
      if (b && b.getAttribute('data-nv-action') === 'recompute') render();
    });
    render();
  }

  NV.app.module({ id: 'agri', section: 'agri', mount: mount, refresh: render });
})(typeof window !== 'undefined' ? window : globalThis);
```

Points de convention (vérifiés sur le module citoyen) :

* **Portée** : tout ce qui est ajouté vit sous `.nv-scope` ; le reste de l'application
  (thème clair `ui-refresh.css`, couches V28→V57) n'est pas affecté.
* **Délégation d'événements** : un écouteur `click` / `input` / `change` sur la racine,
  avec `data-nv-action` + `data-nv-arg` — jamais d'`onclick` inline.
* **Graphiques** : hôtes `<div class="nv-chart-host" data-chart="clé">`, montés via
  `CH.mount(host, spec)` (ResizeObserver inclus, rendu unique via `CH.render`).
* **Traduction** : utiliser `NV.i18n.add('monmodule', {en:{}, fr:{}})` + `t('clé')` et
  régénérer le HTML sur `NV.i18n.onChange(...)`. Ne **pas** poser de `data-i18n` sur les
  nœuds ajoutés : les couches V28/V29 ré-écrivent les nœuds texte par correspondance de
  sous-chaîne.
* **Persistance** : `NV.store.ns('monmodule')` (localStorage + repli mémoire).
* **Coexistence** : si une couche historique touche la même section, exposer un drapeau
  (`window.NUTRI_CITIZEN_ENGINE`) et faire tester ce drapeau par la couche historique —
  c'est ce qui a été fait pour V44/V45, sans supprimer leur code.

---

## 2. API du noyau

### `NV.util`
`qs qsa esc clamp lerp num round fmt fmtInt compact pct signed uid debounce throttle on
mk download reducedMotion daysAgo addMonths hash dateLabel monthLabel width isEl`

### `NV.rng(seed)` → RNG déterministe
`next() int(a,b) gauss(mu,sigma) pick(arr) weighted([[item,w]…]) chance(p) shuffle(arr)
beta(a,b) gamma()` — même graine ⇒ même résultat (démo reproductible).

### `NV.stats`
`mean sd median quantile slope linreg ewma holt forecast markov markovSample sigmoid
logit linearRisk riskCI anomalies corr healthyYears`

* `holt(values, {phi})` → `{level, trend, resid, phi}` (tendance amortie, φ = 0,86).
* `forecast(values, horizon, {seed, trials, drift, min, max, vol})` →
  `{point, p10, p25, p75, p90, paths, level, trend, sd, trials}` : Monte-Carlo par
  rééchantillonnage bootstrap des résidus, dérive imposable (scénarios).
* `markov(P, start, years)` → distributions annuelles ; `markovSample` → trajectoires.
* `linearRisk(factors, {intercept})` → `{p0, p, contributions[]}` (logistique linéaire
  explicable) ; `riskCI(p0, contributions, {trials, seed})` → IC 90 %.
* `anomalies(series, {dates, window})` → `[{index, z, tone, …}]`.
* `healthyYears(dists, weights)` → années pondérées (QALY simplifié).

### `NV.theme`
`tones{good,ok,warn,risk,info,neutral} scale(t) at(i) tone(name)` + palettes SVG.

### `NV.chart` — 12 types, SVG pur, tooltips, légendes, axes doubles
`line`/`area` (cônes `cone`, zones `zones`, seuil `goal`, séparation `splitAt`,
`markers`, axe secondaire `axis:'y2'`, `dash`, `fill`, `points`, `lastLabel`),
`bars` (`horizontal`, `diverging`, `stacked`, `barHeight`, `showValues`, `colors`),
`donut` (`slices`, `center`, `thickness`), `radar` (`axes`, `max`, `series[].fill`),
`gauge`, `rings`, `heatmap` (`rows`, `cols`, `values`, `colorAt`), `scatter`,
`stackedArea` (`reverse`), `sparkline`.
`CH.mount(target, spec)` → `{render, update, setSpec, destroy, host}` ;
`CH.render(target, spec)` pour un rendu unique (modales, listes).

### `NV.bus` — `on off emit` (`'boot'`, `'view'`, `'lang'`, `'module:mounted'`, libres)

### `NV.i18n` — `add(ns, {en, fr, …})`, `t(key, vars)`, `set(locale)`,
`localeCode` (accesseur), `locale()`, `onChange(fn)`, `install()`
(détection : `#language`, `NUTRI_I18N.locale`, `<html lang>`).

### `NV.store.ns(name)` — `get set remove clear`

### `NV.export` — `csv(rows, cols)`, `downloadCSV`, `downloadJSON`, `downloadText`,
`print(html, title)` (iframe d'impression).

### `NV.ui` — composants HTML autonomes
`panel kpi meter chip btn segmented slider toggle table countUp modal toast stepper
signal avatar` — tous renvoient une chaîne HTML (composables), sauf `countUp`, `modal`,
`toast`, `stepper` qui agissent sur le DOM.

### `NV.app` — `module(def)`, `boot()`, `get(id)`, `refresh(id, data)`, `relang()`
`def = {id, section, mount(root, api), refresh(data, root), render(root), priority}`

---

## 3. Modèles du module citoyen (`nutri-citizen.js`)

| Modèle | Méthode | Paramètres clés |
| --- | --- | --- |
| Besoins nutritionnels | Mifflin-St Jeor + facteurs d'activité + majorations grossesse/allaitement/enfant | énergie, protéines, 11 micronutriments, limites sodium/sucres/graisses saturées |
| Dérivés cliniques | IMC, RTH, RTT, PAM, **DFG CKD-EPI 2021**, dépense de repos | — |
| NutriScore global | somme pondérée de 5 sous-scores | anthropométrie 0,24 · métabolique 0,24 · tension 0,16 · qualité alimentaire 0,22 · mode de vie 0,14 |
| Apports | journal du jour si présent, sinon estimation déclarée (habitudes) | 22 nutriments, diversité MDD-W (10 groupes), coût, part bio |
| Risques 10 ans | logistique linéaire explicable, 5 pathologies, facteurs bornés | contributions en Δ logit, IC 90 % bootstrap (240 tirages) |
| Prévision | Holt à tendance amortie + bootstrap Monte-Carlo | φ = 0,86 ; 200–4 000 trajectoires ; dérive de scénario mensuelle |
| Markov | cohorte 5 états, 2–30 ans | poids de santé [1 ; 0,93 ; 0,76 ; 0,50 ; 0,22] ; matrice recalculée depuis risques + adhésion |
| Scénarios | 10 leviers + 5 préréglages | Δ score, Δ années en bonne santé, coûts évités (`HEALTH_COST`), jours de productivité, empreinte CO₂e, panier |
| Plan alimentaire | recherche locale stochastique | 320 permutations, 6 passes de calibrage énergétique, score pondéré (couverture 0,42 · densité 0,20 · coût 0,16 · saison 0,12 · bio 0,10) |
| Agriculture bio | offre nationale traçable par pays vs demande du scénario | `ORGANIC_SUPPLY`, dépenses producteurs, signal d'opportunité |
| Enfant | z-scores OMS (taille/âge, poids/âge, IMC/âge), percentiles, MDD-C | courbes P3–P97, plan cantine + maison |
| Anomalies | z-score + pente sur 45 jours | alertes datées, seuils 1,8σ / 2,5σ |

### Base alimentaire
56 aliments × 22 champs nutritionnels + `price`, `organic`, `gi`, `countries`, `season`,
`upf`. Filtrée par pays (`foodsFor(code)`) et par saison (`inSeason(food, month)`).
Les valeurs sont illustratives (démonstrateur front) ; en production elles proviennent
des tables de composition nationales analysées en laboratoire (INFOODS/FAO) et du
graphe de preuves — voir `docs/DATA_SOURCES_AND_PROVENANCE.md`.

### API publique exposée
```js
NutriCitizen.profile() / .scenario() / .setProfile(patch) / .setScenario(patch)
NutriCitizen.score(p) .risks(p) .forecast(key, months, withScenario)
NutriCitizen.markov(years, trials) .scenarios() .plan(opt)
NutriCitizen.alerts(p) .recommendations(p) .anomalies() .history()
NutriCitizen.journal.{add,remove,today,clear,streak}
NutriCitizen.engine.{score,risks,forecast,markov,plan,foods,requirements}
NutriCitizen.exportData.{json,csv,plan,recs,report}
NutriCitizen.modals.{foods,evidence,booking,models,report,shopping,child}
NutriCitizen.render.{all,quick,heavy} · .rebuild() · .unmount() · .goto(section)
```
Un autre module peut donc réutiliser les modèles sans dépendre du DOM citoyen :
```js
const score = NutriCitizen.engine.score({ sex:'female', age:41, weight:78, height:165 });
const foods = NutriCitizen.engine.foods('GH');
```

---

## 4. Pièges connus de la plateforme (documentés pour les prochains modules)

1. **Couches historiques additives** (V28→V57) : plusieurs posent des
   `MutationObserver` sur `document.body` ou sur une section, et ré-injectent des
   champs/graphiques. Toujours prévoir un drapeau de passation plutôt que de supprimer
   leur code.
2. **V28 / V29 ré-écrivent les nœuds texte** par correspondance de sous-chaîne lors d'un
   changement de langue : ne pas dépendre du texte brut de ses propres nœuds, et éviter
   `data-i18n` sur du contenu généré dynamiquement.
3. **`go(id, btn)`** est la fonction de navigation unique ; `NV.app` l'enveloppe sans la
   remplacer et émet `NV.bus 'view'` — écouter cet événement pour rafraîchir à l'entrée
   dans une vue.
4. **Canvas Chart.js** : si une couche historique dessine sur un canvas, masquer le
   canvas (`display:none`) et monter un hôte SVG à côté plutôt que de le supprimer —
   la réversibilité est totale.
5. **`localStorage`** : préfixer ses clés (`nutri.<module>.`) et prévoir le repli mémoire
   (contexte `file://`).
