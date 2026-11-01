# Connected Devices Lab — `#devices`

Simulation immersive du parcours **appareil de santé → passerelle chiffrée → consentement →
normalisation FHIR → graphe de preuves NUTRI.N°1**, pour la page *Connected Devices &
Automatic Sync* du MVP web (`web/index.html`, section `#devices`).

**Édition Premium (v2)** : centre de commande sombre de luxe — verre dépoli obsidienne,
accents émeraude & or, aurora animée en arrière-plan, graphe héros avec halo, mini-tendances
par catégorie vitale, anneaux d'activité, débit d'ingestion temps réel et score de bien-être
composite — le tout piloté par les données vivantes des appareils connectés.

---

## 1. Fichiers

| Fichier | Rôle |
| --- | --- |
| `connected-devices-data.js` | Catalogue des appareils, catégories de données (LOINC/FHIR), passerelles pays, générateurs physiologiques, seuils cliniques. Aucun accès au DOM. |
| `connected-devices-i18n.js` | Dictionnaire local **FR / EN** (~190 clés) + `t(key, params)`, `loc({fr,en})`, `currentLocale()`. |
| `connected-devices-charts.js` | Moteur de graphiques premium exposé via `window.NUTRI_DEVICES_CHARTS` : graphe héros dual-axe (SVG, glow + crosshair), mini-tendances, anneaux, barres de débit, champ de particules aurora (canvas rAF), compteurs animés, score bien-être. |
| `connected-devices.js` | Rendu Shadow DOM, machine à états des appareils, moteur de synchronisation, alertes, journal, export, boucle de simulation, intégration du moteur premium. |
| `connected-devices.css` | Styles de base du module (préfixe `ds-`) + styles de l'intro en light DOM (`.devsim-*`). |
| `connected-devices-premium.css` | Couche design luxe chargée dans le Shadow DOM : tokens sombres, verre dépoli, halos, shimmer, keyframes premium, `prefers-reduced-motion`. |

## 2. Intégration dans `index.html` (4 ajouts seulement)

```html
<!-- <head> -->
<link rel="stylesheet" href="components/connected-devices/connected-devices.css">

<!-- section #devices -->
<div id="devicesSim" class="devsim-mount"></div>

<!-- avant les scripts i18n institutionnels -->
<script src="components/connected-devices/connected-devices-data.js"></script>
<script src="components/connected-devices/connected-devices-i18n.js"></script>
<script src="components/connected-devices/connected-devices-charts.js"></script>
<script src="components/connected-devices/connected-devices.js"></script>
```

Le contenu est rendu **dans un Shadow DOM** attaché à `#devicesSim` : aucune fuite de style,
aucun `MutationObserver` global, aucun conflit avec les couches versionnées V39 → V58 ni avec
les traducteurs de texte v28/v29.

## 3. Ce que la simulation propose

### Session (bandeau HUD)
- État LIVE + badge ÉDITION PREMIUM, passerelle locale (ville + pays selon le sélecteur `#country`),
  TLS 1.3 / AES-256, latence moyenne, identifiant de session, horloge, chrono de session.
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
- Cadran de montre avec ECG animé (SVG, halo lumineux), BPM, SpO₂, batterie, signal.
- Constantes : glycémie, tension, poids, pas, sommeil — avec flash à chaque nouvelle mesure.
- Notification mobile simulée à chaque mesure synchronisée.

### Graphiques dynamiques (toutes les données des appareils)
- **Graphe héros** (pleine largeur) : glycémie + fréquence cardiaque en fenêtre glissante,
  aires dégradées, ligne glycémie avec halo pulsant, bande de cible 3,9 – 7,8 mmol/L,
  crosshair + infobulle au survol. Si la CGM n'est pas encore associée, le graphe suit le
  seul flux FC (jamais un cadre vide).
- **Tendances vitales** : 6 tuiles animées (glycémie, FC, tension, poids, pas, sommeil),
  chacune avec sa mini-courbe dégradée, la valeur courante et le delta vs lecture précédente ;
  flash doré sur la tuile quand la donnée arrive.
- **Anneaux & bien-être** : anneaux d'activité (pas / 8 000, sommeil / 7,5 h, qualité signal),
  **score de bien-être composite 0–100** (glycémie, FC, tension, pas, sommeil) avec statut
  (Excellent → À surveiller), et **débit d'ingestion** (mesures/tick, barres 26 ticks).
- **Chaîne d'ingestion** en 5 étapes avec animation de paquets et compteurs
  reçues / normalisées / rejetées / stockées.
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
« déjà associés au compte » : le moniteur et les graphiques sont vivants immédiatement.

## 4. API publique

```js
window.NUTRI_DEVICES_SIM.openConnect('cgm');   // ouvre l'appairage d'un appareil
window.NUTRI_DEVICES_SIM.sync();               // synchronise les appareils connectés
window.NUTRI_DEVICES_SIM.reset();
window.NUTRI_DEVICES_SIM.export();
window.NUTRI_DEVICES_SIM.state;                // état complet (lecture)

// Moteur de graphiques (si besoin ailleurs)
window.NUTRI_DEVICES_CHARTS.wellnessScore({ glucose: 5.6, hr: 72, bp: { sys: 118, dia: 76 }, steps: 6400, sleep: 7.2 });
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
- Toutes les clés internes (HUD, tuiles, anneaux, score, journal, alertes…) existent en **FR et EN** ;
  le changement de langue re-rend les graphiques, tuiles et axes sans perdre la session.
- L'intro (light DOM) utilise 5 clés `ui.devsim_*` ajoutées à `locales/{en,fr,es,ewe,kab}.json`
  et au dictionnaire embarqué (`NUTRI_EMBEDDED_LOCALES`), ce qui garde
  `tools/validate_i18n.py` au vert.

## 6. Accessibilité & performance

- Boutons réels, `aria-busy`, `role="dialog"`, `aria-modal`, fermeture par `Échap`,
  libellés de bascules, focus visible.
- `prefers-reduced-motion: reduce` neutralise les animations (ECG, radar, paquets, aurora,
  halo, shimmer).
- Boucle `setInterval` de 100 ms pour la simulation ; le rendu est ignoré quand la vue est
  masquée ; l'aurora utilise `requestAnimationFrame` + `ResizeObserver`. Aucune dépendance
  externe (pas de Chart.js).

## 7. Non-régression

- Aucune fonction globale existante n'est supprimée : `connectDevice()` et `runSync()`
  sont seulement redirigés vers le nouveau moteur.
- La section conserve son `h2` portant le texte « Connected Devices », utilisé par la couche
  V39 (`visibleSection`) pour ses KPI/charts : ces couches continuent de s'afficher.
- V43/V44 cherchaient des boutons « connect » dans `#devices` : ils ne trouvent plus de cible,
  ce qui est sans effet (aucune erreur) et évite deux animations concurrentes.
- IDs historiques `#syncbar` / `#syncText` conservés.
- Vérifié par test DOM (jsdom) : montage premium, auto-démarrage (montre + CGM), séries
  glycémie/FC, graphe héros, mini-tendances, anneaux, appairage modal complet, synchronisation,
  changement de langue FR↔EN, pause, autopilote, révocation de consentement, reset, et absence
  d'erreur provenant du module.
