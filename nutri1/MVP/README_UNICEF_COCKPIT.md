# NUTRI.N°1 — Cockpit UNICEF (`#unicef`)

Module `assets/nutri-unicef.js` (≈ 2 500 lignes) + `assets/nutri-unicef.css`, construits
**entièrement sur le noyau réutilisable** `assets/nutri-vision.js` / `nutri-vision.css`
(le même que le cockpit citoyen `#citizen`) : graphiques, pipeline IA, modales, exports,
i18n, thème sombre `.nv-scope`, système de modules `NV.app`.

Principe directeur : **rien d'existant n'est supprimé**. Le balisage hérité de la section
(KPI, cartes d'âge, ANJE, nutrition maternelle, anémie, tendances, couche GIS, alertes)
est conservé, re-synchronisé sur le moteur de calcul, puis entouré de huit panneaux
d'analyse prédictive.

---

## 1. Ce que voit l'investisseur

| Panneau | Contenu |
|---|---|
| **Hero cockpit** | portée administrative (pays / niveau / district), risque composite 0-100, enfants suivis, badge de flux vivant, raccourcis d'action |
| **KPI** | deux vues commutables : *niveau* (prévalences vs seuils OMS) et *charge de morbidité* (effectifs d'enfants affectés, non couverts) |
| **Prévision d'ensemble** | 9 indicateurs, horizon 1-15 ans, 4 scénarios de politique publique, historique 2000-2025 + cône d'incertitude P10/P90, lecture du point de bascule |
| **Atelier IA** | les 10 étapes du raisonnement (ingestion → repli → nettoyage → features → entraînement → backtest → pondération → calibration → Monte-Carlo → incertitude → synthèse), zoo de 6 modèles avec poids et erreur, plis de backtest, facteur de calibration |
| **Simulateur d'interventions** | 9 programmes (AME, alimentation complémentaire, SAM, MNP, fer-acide folique, fortification, WASH, transferts, prise en charge communautaire), curseurs de couverture, préréglages, contrainte budgétaire, cas évités / DALY / coût par DALY / ROI, frontière d'efficience, IC 95 % |
| **Points chauds SIG** | 12 districts en tuiles cliquables, 3 couches (risque composite, couverture, indicateur au choix), classement, comparaison au pays |
| **Alerte précoce** | P(franchissement du seuil) par indicateur sur l'horizon, sévérité, fenêtre d'action, action recommandée |
| **Qualité des données** | confiance par indicateur, source (DHS / MICS / SMART / HMIS), dernier passage, part non couverte |
| **Pied de cockpit** | avertissement « données de démonstration », exports, rapport imprimable |

**Modales fonctionnelles** : atelier SIG (table des districts + ciblage du plus à risque),
fiche district (anneaux, KPI, comparaison au pays, actions recommandées), plan d'action
anticipé (phases au stepper, KPI de suivi, programmes, avertissements).

**Exports** : instantané JSON complet (données + prévisions + simulation + hotspots),
CSV des séries, CSV des points chauds, rapport imprimable HTML.

---

## 2. Le moteur (chaîne de calcul)

```
ANCHOR (17 pays d'Afrique de l'Ouest / centrale, valeurs DHS-MICS-SMART)
   └─ seriesFor()      séries mensuelles 2000-2025, volatilité et tendance par
   │                   indicateur, correction affine : la dernière valeur EST l'ancrage
   └─ districts()      12 districts par pays, population <5 ans pondérée, ajustements
   │                   régionaux déterministes, risque composite, dernier passage d'enquête
   ├─ forecastInd()    NV.stats.ensembleForecast : 6 modèles en compétition, backtest
   │                   walk-forward (39 plis), pondération par erreur, calibration des
   │                   intervalles, 3 000 trajectoires Monte-Carlo, dérive de scénario
   ├─ simulate()       couverture → effet (tailles re-tirées, IC 95 %) → cas évités →
   │                   DALY → coût / DALY → ROI, 800 essais (SIM_TRIALS, cache partagé
   │                   avec warningList / snapshot / plan d'action)
   ├─ warningList()    P(franchissement) par indicateur, sévérité, action
   ├─ equityStats()    gradient rural / urbain, quintiles de richesse, Gini
   ├─ dataQuality()    confiance, source, dernier passage, part non couverte
   └─ compositeRisk()  6 indicateurs pondérés → indice 0-100
```

**Portée administrative** : `scopeVals()` / `effAnchor()` / `scopeAnchor()` / `scopeKey()`.
Le sélecteur hérité `#unicefLevel` (National / Région / District) **ré-ancrage tous les
calculs** — séries, prévisions, simulation, hotspots, équité, qualité — et entre dans la
clé de chaque cache. Un district ciblé (clic sur une tuile SIG) recentre tout le cockpit
et remet le sélecteur hérité à jour en retour.

---

## 3. Ce qui a été réparé (fonctionnalités existantes)

| Élément hérité | Traitement |
|---|---|
| `renderUNICEF()` | **encapsulé**, jamais remplacé : il continue de remplir les KPI, cartes d'âge, ANJE, maternel, anémie, tendances ; le module se resynchronise après chaque appel |
| Canvas Chart.js de la couche V38 (données codées en dur, `248 620`…) | masqué (pas de bloc blanc) et **remplacé par un graphique NutriVision** alimenté par le moteur ; ses KPI sont resynchronisés |
| `.trend-bars` (barres statiques) | conservées dans le DOM mais masquées, un vrai graphique les remplace dans la même carte |
| Couche GIS `.gis-demo` | conservée comme conteneur : la carte à tuiles du moteur y est injectée, avec barre de contrôles (couches, atelier SIG, fiche district) |
| 2 signaux d'alerte hérités | conservés ; 4 signaux Monte-Carlo (avec P de franchissement) y sont ajoutés |
| Bouton « Explore GIS » | conservé (son toast d'origine est toujours déclenché) **et** ouvre désormais l'atelier SIG réel |
| Couches V44 / V51 / V52 | neutralisées dans la section seulement (drapeau de passation), comportement inchangé ailleurs |
| Couches V54 / V56 / V57 (overlays de démonstration) | `NV.guard` (noyau) reprend la main sur les contrôles du cockpit **sans supprimer ces couches** : elles continuent de fonctionner sur les cartes héritées et sur toutes les autres sections |
| **Bug de langue** | la couche i18n traduit les `<option>` de `#unicefLevel` — et comme ces options n'ont pas d'attribut `value`, leur valeur devient « Région » : le niveau régional était donc ignoré. Normalisation dans les deux sens (`normLevel` / `legacyLevelValue`) |
| Contraste | bannière `.hero` (dégradé vert clair) repassée sur la surface du cockpit : **895 éléments texte audités, 0 sous le seuil WCAG AA** (desktop et mobile 390 px) |

---

## 4. Intégration dans `web/index.html` (2 lignes, réversibles)

```html
<link rel="stylesheet" href="assets/nutri-unicef.css" id="nutri-unicef-css">   <!-- ligne 268 -->
<script src="assets/nutri-unicef.js" id="nutri-unicef-module"></script>        <!-- ligne 2773 -->
```

Retirer ces deux lignes rend la section exactement identique à l'ancienne version.
Le module s'auto-enregistre : `NV.app.module({ id: 'unicef', section: 'unicef', priority: 20 })`.

---

## 5. Réutilisation (le noyau s'enrichit, pas la section)

Trois ajouts **génériques** ont été faits au noyau pendant ce chantier ; ils profitent
aux prochaines sections (`who`, `wfp`, `fao`, `health`, `agri`, `monitoring`) :

1. **`NV.guard.scope(root, { click, change })`** (`nutri-vision.js`) — reprend la main sur
   les clics / changements dans le périmètre d'un module, pour que les overlays de
   démonstration hérités (V54 / V56 / V57, dont l'un écoute en phase de capture sur
   `document`) ne masquent plus le cockpit. `NV.guard.mark(el)` marque un contrôle
   hérité repris par le module ; `NV.guard.release()` au démontage.
2. **`nutri-vision.css` § 12.b / 12.c / 12.d** — neutralisation des surfaces héritées à
   fond clair (`gis-demo`, `bar-wrap`, `progress`, `evidence-flow`, `pill`, `inst-kpi`,
   V38…), des survols V54 / V57, et de la bannière `.hero`. Toute section portant
   `.nv-scope` en bénéficie, sans duplication par module.
3. **`document.dispatchEvent(new CustomEvent('nutri:view', …))`** — événement public de
   navigation émis par le noyau : les modules redessinent leurs graphiques quand leur
   section redevient visible (les graphiques montés dans une section cachée partent
   sinon sur une largeur de 80 px).

Le module expose aussi une API publique pour les tests et les intégrations futures :
`window.NutriUnicef` → `state`, `data`, `engine`, `render`, `modals`, `exportData`,
`actions`, `rebuild()`, `unmount()`.

---

## 6. Tester la démo

```bash
cd nutri1/MVP/web && python3 -m http.server 8000 --bind 0.0.0.0
# http://localhost:8000  →  onglet « UNICEF »
```

Suites d'intégration jsdom (dossier `tools/nvtest`, hors ligne de production) :

```bash
cd tools/nvtest && npm install            # une fois (jsdom)
node unicef-suite.js                      # 139 assertions — cockpit UNICEF
node test-suite.js                        # 144 assertions — cockpit citoyen (non-régression)
node audit-contrast.js unicef             # audit WCAG AA (NV_W=390 pour le mobile)
node smoke-sections.js                    # les autres sections ne bougent pas
node perf-unicef.js                       # temps de rendu et de calcul
```

Mesures relevées (jsdom, donc majorées par rapport à un navigateur) :

| Opération | Durée |
|---|---|
| `renderAll()` — 9 panneaux, 7 graphiques | 261 ms |
| `render.quick()` — hero + KPI | 44 ms |
| `forecast()` 8 ans, froid / en cache | 65 ms / 0 ms |
| `simulate()` 9 programmes, froid / en cache | 206 ms / 0 ms |
| Exports JSON / CSV / hotspots | 21 / 17 / 14 ms |
| `rebuild()` (changement de langue) | 575 ms |

---

## 7. Garantie « rien n'est perdu »

Sélecteurs hérités toujours présents et fonctionnels après montage du module :
`#unicefCountry`, `#unicefLevel`, `#unicefYear`, `#unicefChildren`, `#unicefStunting`,
`#unicefWasting`, `#unicefAnaemia`, `#unicefEBF`, `#unicefAgeCards` (5 cartes),
`#unicefFeedingIndicators`, `#unicefMaternal`, `#unicefAnaemiaPanel`, `#unicefTrendChart`,
`#unicefGIS`, `#unicefAlerts` (2 signaux), `.institution-kpis` (5 KPI), `.institution-hero`.

Les autres sections (`who`, `wfp`, `fao`, `health`, `agri`, `monitoring`, `research`) ne
reçoivent aucun panneau et gardent leurs couches de démonstration : vérifié par
`tools/nvtest/smoke-sections.js`.

> Données de démonstration, déterministes et documentées (ancrages inspirés des
> enquêtes DHS / MICS / SMART). En production, `seriesFor()` et `ANCHOR` sont les deux
> seuls points à brancher sur les jeux de données validés.
