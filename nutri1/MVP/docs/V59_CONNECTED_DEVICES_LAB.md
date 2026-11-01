# V59 — Connected Devices Lab (page `#devices`)

**Périmètre** : uniquement la section `#devices` de `nutri1/MVP/web/index.html`.
Aucune autre page, aucun autre module, aucun réglage pays/langue/paiement n'est modifié.

## 1. Objectif

L'ancienne page « Connected Devices & Automatic Sync » affichait six cartes avec un bouton
`Connect` et une barre de synchronisation. Elle ne montrait ni le protocole d'appairage, ni
le consentement, ni le flux de données, ni les alertes.

La V59 transforme cette page en **démonstration opérationnelle** : on voit un appareil se
découvrir, s'appairer, demander un consentement, importer son historique, puis alimenter en
continu le pipeline de données de la plateforme — avec les mécanismes de sécurité, de
traçabilité et de détection clinique attendus par un investisseur, un ministère ou un
professionnel de santé.

## 2. Architecture

```
#devices  (index.html)
├── .devsim-intro                     ← titre, sous-titre, badges (light DOM, clés ui.devsim_*)
├── #devicesSim                        ← hôte du Shadow DOM
│   └── shadow root
│       ├── .ds-hud                    session LIVE, passerelle, latence, contrôles
│       ├── .ds-kpis                   5 indicateurs de session
│       ├── .ds-devices                6 appareils (machine à états)
│       ├── .ds-monitor                montre ECG + constantes + notification
│       ├── .ds-chart                  courbe glycémie / fréquence cardiaque (SVG)
│       ├── .ds-pipeline               5 étages + compteurs + barre de synchro
│       ├── .ds-log                    journal filtrable
│       ├── .ds-scopes                 consentement par catégorie + actions
│       ├── .ds-alerts / history / interop
│       ├── .ds-backdrop > .ds-modal   protocole d'appairage 5 étapes
│       └── .ds-toastbox               notifications internes
└── <noscript>                         repli lisible sans JavaScript
```

Fichiers livrés : `components/connected-devices/connected-devices-{data,i18n}.js`,
`…/connected-devices.js`, `…/connected-devices.css` (+ `README.md`).
Voir le README du composant pour le détail des fonctionnalités et de l'API.

## 3. Modèle de données (front-end)

```js
state = {
  devices: [ { id, icon, name{fr,en}, vendor, firmware, scopes[], battery, signal,
               status, progress, imported, lastValue, lastUnit, lastSync } ],
  consent:  { heart: true, glucose: true, bp: true, weight: true, steps: true, sleep: true },
  series:   { glucose: [], hr: [] },            // fenêtre glissante du graphique
  counters: { received, normalized, rejected, stored },
  syncs:    { ok, fail }, latencies: [], lastSyncAt,
  alerts:   [ { id, type, severity, titleKey, recKey, params, at, resolved } ],
  history:  [ { at, device, readings, ms, partial } ],
  log:      [ { id, kind, key, params, at } ]   // clé + paramètres → re-localisable
}
```

Catégories et interopérabilité : `glucose 2339-0`, `heart 8867-4`, `bp 85354-9`,
`weight 29463-7`, `steps 55423-8`, `sleep 93832-4` (toutes en ressource FHIR `Observation`).

Seuils d'alerte : glycémie < 3,9 / > 10,0 mmol/L, tension ≥ 140/90 mmHg, batterie < 15 %,
mesures rejetées (unités non conformes).

## 4. Scénarios couverts

| Scénario | Déclencheur | Résultat |
| --- | --- | --- |
| Appairage guidé | « Associer » sur une carte | Modale 5 étapes, consentement obligatoire, import de 128 mesures |
| Démo investisseur | « ▶ Démo guidée » | Appairage séquentiel des 6 appareils puis synchronisation |
| Synchronisation manuelle | « Synchroniser » / carte | Pipeline animé, compteurs, ligne d'historique, toast |
| Révocation | Bascule de consentement | Ingestion de la catégorie stoppée, événement journalisé |
| Alerte clinique | Seuil franchi par le flux | Carte d'alerte + suggestion + escalade nutritionniste |
| Export | « ⭳ Exporter mes données » | Fichier JSON horodaté de la session |
| Réinitialisation | « ⟲ Réinitialiser » | Session neuve, appareils hors ligne, journal remis à zéro |

## 5. Non-régression vérifiée

Tests exécutés avec jsdom (serveur local, `resources` limité au dépôt) :

1. la page se charge, `#devicesSim` porte bien un `shadowRoot` et 6 cartes ;
2. navigation `go('devices')` → auto-connexion de la montre puis du CGM, ECG/BPM actifs ;
3. appairage complet du CGM via la modale (radar → PIN → consentement → import → résumé) ;
4. synchronisation manuelle → ligne d'historique, `#syncText` mis à jour ;
5. bascule de consentement → journal + toast ;
6. passage en français (`NUTRI_I18N.setLocale('fr')`) → libellés, journal et statuts traduits ;
7. démo guidée → 6 appareils connectés, synchronisation finale, alerte technique ;
8. `Reset` → état vierge ; passerelles `window.connectDevice()` / `window.runSync()` actives ;
9. autres modules intacts : `#agriNutriApp`, composants `#who`, marketplace, paiements.

Aucune erreur JavaScript provenant du module n'est émise (les erreurs résiduelles du bac à
sable jsdom proviennent de l'absence de canvas/`ResizeObserver` dans les dashboards existants).

`python3 tools/validate_i18n.py` : `fr/es/ewe/kab OK 829 keys`.

## 6. Limites assumées

- Simulation 100 % front-end : aucune donnée réelle, aucun appel réseau, aucune donnée de santé
  stockée (tout est en mémoire, l'export est local).
- L'horloge de simulation et les générateurs physiologiques sont illustratifs ; le module ne
  remplace ni un dispositif médical, ni une intégration HealthKit/Health Connect réelle.
- Une intégration de production nécessiterait OAuth par fournisseur, gestion des jetons,
  consentement serveur, journal d'audit persistant et validation réglementaire.
