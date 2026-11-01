# Connected Devices Lab — `#devices`

Simulation immersive du parcours **appareil de santé → passerelle chiffrée → consentement →
normalisation FHIR → graphe de preuves NUTRI.N°1**, pour la page *Connected Devices &
Automatic Sync* du MVP web (`web/index.html`, section `#devices`).

Le module remplace l'ancienne grille statique de six cartes « Connect » par un laboratoire
de session complet : appairage Bluetooth, consentement granulaire, flux temps réel,
pipeline d'ingestion, alertes cliniques et historique de synchronisation.

---

## 1. Fichiers

| Fichier | Rôle |
| --- | --- |
| `connected-devices-data.js` | Catalogue des appareils, catégories de données (LOINC/FHIR), passerelles pays, générateurs physiologiques, seuils cliniques. Aucun accès au DOM. |
| `connected-devices-i18n.js` | Dictionnaire local **FR / EN** (≈150 clés) + `t(key, params)`, `loc({fr,en})`, `currentLocale()`. |
| `connected-devices.js` | Rendu Shadow DOM, machine à états des appareils, moteur de synchronisation, alertes, journal, export, boucle de simulation. |
| `connected-devices.css` | Styles du module (préfixe `ds-`) + styles de l'intro en light DOM (`.devsim-*`). |

## 2. Intégration dans `index.html` (3 ajouts seulement)

```html
<!-- <head> -->
<link rel="stylesheet" href="components/connected-devices/connected-devices.css">

<!-- section #devices -->
<div id="devicesSim" class="devsim-mount"></div>

<!-- avant les scripts i18n institutionnels -->
<script src="components/connected-devices/connected-devices-data.js"></script>
<script src="components/connected-devices/connected-devices-i18n.js"></script>
<script src="components/connected-devices/connected-devices.js"></script>
```

Le contenu est rendu **dans un Shadow DOM** attaché à `#devicesSim` : aucune fuite de style,
aucun `MutationObserver` global, aucun conflit avec les couches versionnées V39 → V58 ni avec
les traducteurs de texte v28/v29.

## 3. Ce que la simulation propose

### Session (bandeau HUD)
- État LIVE, passerelle locale (ville + pays selon le sélecteur `#country`), TLS 1.3 / AES-256,
  latence moyenne, identifiant de session, horloge, chrono de session.
- **Démo guidée** (autopilote) : associe les appareils un par un puis lance une synchronisation.
- **Pause / Reprendre**, **vitesse ×1 / ×2 / ×4**, **Réinitialiser**.

### Appareils
- 6 appareils : Apple Health, Health Connect, CGM, tensiomètre, montre, balance connectée.
- Machine à états visible : `hors ligne → découverte → appairage → consentement → import →
  connecté → synchro`.
- Batterie, signal, firmware, nombre de mesures importées, dernière valeur, catégories partagées.

### Protocole d'appairage (modale en 5 étapes)
1. **Découverte BLE** — radar animé, appareils voisins détectés avec RSSI.
2. **Appairage sécurisé** — code à 6 chiffres, négociation ECDH, étapes du handshake.
3. **Consentement** — une bascule par catégorie + acceptation explicite (bouton bloqué sinon).
4. **Premier import** — progression, journal de normalisation (LOINC, unités, FHIR).
5. **Récapitulatif** — appareil, catégories, mesures importées, latence.

### Moniteur temps réel
- Cadran de montre avec ECG animé (SVG), BPM, SpO₂, batterie, signal.
- Constantes : glycémie, tension, poids, pas, sommeil.
- Notification mobile simulée à chaque mesure synchronisée.

### Graphique & pipeline
- Courbe glycémie + fréquence cardiaque en fenêtre glissante (SVG natif, **sans Chart.js**),
  bande de cible glycémique 3,9 – 7,8 mmol/L, point de curseur animé.
- Chaîne d'ingestion en 5 étapes (collecte BLE → passerelle → consentement → FHIR → graphe)
  avec animation de paquets et compteurs reçues / normalisées / rejetées / stockées.
- Barre de synchronisation (`#syncbar` / `#syncText` conservés pour compatibilité).

### Journal, consentement, alertes, historique
- Journal filtrable (mesures, sécurité, alertes, consentement, système), horodaté.
- Consentement par catégorie : révocation immédiate de l'ingestion + journalisation.
- Alertes : hypoglycémie < 3,9 mmol/L, hyperglycémie > 10 mmol/L, tension ≥ 140/90,
  batterie faible, qualité des données ; actions « Escalader au nutritionniste » / « Résoudre ».
- Historique des synchronisations (heure, appareil, volume, durée, statut).
- Export JSON de la session (`Blob` + téléchargement) et effacement du journal.

### Première visite
À la première ouverture de la vue, la montre et le capteur de glucose sont présentés comme
« déjà associés au compte » : le moniteur et le graphique sont vivants immédiatement.

## 4. API publique

```js
window.NUTRI_DEVICES_SIM.openConnect('cgm');   // ouvre l'appairage d'un appareil
window.NUTRI_DEVICES_SIM.sync();               // synchronise les appareils connectés
window.NUTRI_DEVICES_SIM.reset();
window.NUTRI_DEVICES_SIM.export();
window.NUTRI_DEVICES_SIM.state;                // état complet (lecture)
```

Compatibilité avec l'ancienne page :

```js
window.connectDevice('Apple Health');  // → résolu vers le bon appareil du catalogue
window.runSync();                      // → moteur de synchronisation du nouveau module
```

## 5. Internationalisation

- Le module choisit sa langue via `NUTRI_I18N.locale`, puis `document.documentElement.lang`,
  puis `localStorage.nutri_language` (défaut : anglais).
- Il écoute `nutri:i18nChanged` et le `change` du sélecteur `#language`, et se re-localise
  également à chaque ouverture de la vue.
- L'intro (light DOM) utilise 5 clés `ui.devsim_*` ajoutées à `locales/{en,fr,es,ewe,kab}.json`
  et au dictionnaire embarqué (`NUTRI_EMBEDDED_LOCALES`), ce qui garde
  `tools/validate_i18n.py` au vert.
- Les messages dynamiques (journal, alertes) sont stockés sous forme de clé + paramètres :
  changer de langue re-rend le journal sans perdre la session.

## 6. Accessibilité & performance

- Boutons réels, `aria-busy`, `role="dialog"`, `aria-modal`, fermeture par `Échap`,
  libellés de bascules, focus visible.
- `prefers-reduced-motion: reduce` neutralise les animations (ECG, radar, paquets).
- Une seule boucle `setInterval` de 100 ms ; le rendu est ignoré quand la vue est masquée,
  les minuteries sont annulées au reset. Aucune dépendance externe.

## 7. Non-régression

- Aucune fonction globale existante n'est supprimée : `connectDevice()` et `runSync()`
  sont seulement redirigés vers le nouveau moteur.
- La section conserve son `h2` portant le texte « Connected Devices », utilisé par la couche
  V39 (`visibleSection`) pour ses KPI/charts : ces couches continuent de s'afficher.
- V43/V44 cherchaient des boutons « connect » dans `#devices` : ils ne trouvent plus de cible,
  ce qui est sans effet (aucune erreur) et évite deux animations concurrentes.
- Vérifié par test DOM (jsdom) : appairage complet, synchronisation, consentement,
  changement de langue, autopilote, reset, et absence d'erreur provenant du module.
