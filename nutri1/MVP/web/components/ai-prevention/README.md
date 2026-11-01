# Moteur IA de Nutrition & de Prévention — `#ai`

Application **vanilla** (HTML5 + CSS3 + ES6, zéro framework, zéro librairie de graphiques) montée dans
la section `#ai` du MVP web : capteurs simulés → moteur de simulation → prédictions & timeline →
programme nutritionnel correctif de 7 jours, **entièrement bilingue FR / EN**.

Édition *premium* : interface obsidienne en verre dépoli, accents émeraude / lime, aurora animée,
jauges SVG remplissables, timeline prédictive interactive à deux bandes (habitudes actuelles /
programme corrigé) et onglets de jours à encre glissante.

---

## 1. Fichiers

| Fichier | Rôle |
| --- | --- |
| `ai-prevention-data.js` | Référentiel pur : état par défaut, profils de démonstration, 32 plats locaux (FR/EN) répartis sur 4 créneaux, métadonnées des 4 maladies, facteurs → conseils, icônes SVG. Aucun accès au DOM. |
| `ai-prevention-i18n.js` | Dictionnaire local **FR / EN** (211 clés, parité vérifiée par script) + `t(key, params)`, `loc({fr,en})`, `setLang()`, `markPlatformAligned()`, `syncFromPlatform()`. Le module suit la langue de la plateforme et accepte un choix explicite. |
| `ai-prevention-model.js` | Moteur déterministe : scores pondérés → probabilités → fenêtres d’apparition → générateur de programme 7 jours → cibles correctives. Aucun accès au DOM. |
| `ai-prevention-charts.js` | Moteur SVG : jauges circulaires (`stroke-dasharray`), mini-courbes de capteurs, pistes de timeline, charge glycémique hebdomadaire, animation des compteurs (rAF + filet de sécurité). |
| `ai-prevention-template.js` | Gabarits HTML des 4 étapes (aucune logique métier, aucun état). |
| `ai-prevention.js` | Contrôleur : état, délégation d’événements, séquence du scanner, onglets, timeline, impression, API publique `window.AIPrevention`. |
| `ai-prevention.css` | Feuille premium, **préfixée `#ai .aip-*`** (aucune fuite de style), responsive, `prefers-reduced-motion`, styles d’impression. |
| `ai-prevention-preview.html` | Page d’aperçu autonome du module (sans la plateforme) pour relire le design. |

Chargement : `data → i18n → model → charts → template → controller`.

---

## 2. Intégration dans `index.html` (3 ajouts seulement)

```html
<!-- <head> -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="components/ai-prevention/ai-prevention.css">

<!-- section #ai -->
<section id="ai" class="view">
  <div id="aiPrevention" class="aip-root"></div>
  <noscript>…</noscript>
</section>

<!-- avant les couches i18n institutionnelles -->
<script src="components/ai-prevention/ai-prevention-data.js"></script>
<script src="components/ai-prevention/ai-prevention-i18n.js"></script>
<script src="components/ai-prevention/ai-prevention-model.js"></script>
<script src="components/ai-prevention/ai-prevention-charts.js"></script>
<script src="components/ai-prevention/ai-prevention-template.js"></script>
<script src="components/ai-prevention/ai-prevention.js"></script>
```

L’ancien shim `window.generatePlan` de `index.html` a été retiré : le module expose sa propre API
(et conserve `window.generatePlan()` pour compatibilité).

---

## 3. Les quatre étapes

1. **Capteurs & données** — glycémie continue, fréquence cardiaque au repos, qualité du sommeil
   (bouton *Synchroniser les capteurs* : compteurs animés, mini-courbes redessinées, horodatage),
   données médicales (âge, sexe, taille, poids → IMC calculé, cholestérol, tension systolique et
   diastolique) et habitudes (sucres raffinés, graisses saturées, fibres, hydratation).
2. **Moteur de simulation** — scanner animé (anneaux, balayage conique, particules orbitales),
   progression, journal d’analyse en six étapes, révélation des signaux détectés, puis passage
   automatique aux prédictions.
3. **Risques & timeline** — score métabolique global, âge métabolique, quatre cartes de risque
   (diabète de type 2, maladies cardiovasculaires, hypertension, stéatose hépatique) avec jauges
   SVG, facteurs dominants chiffrés et fenêtre d’apparition. Timeline prédictive interactive :
   jalons cliquables, détail par maladie, bascule *habitudes actuelles / programme corrigé*.
4. **Programme 7 jours** — sept onglets (encre glissante, flèches clavier), quatre repas par jour
   avec aliments locaux chiffrés (kcal, protéines, fibres, charge glycémique), impacts estimés,
   charge glycémique de la semaine, cibles correctives à 12 semaines, impression et régénération.

---

## 4. Le moteur (déterministe)

Chaque facteur est normalisé dans `[0,1]` puis combiné en moyenne pondérée :

| Maladie | Facteurs (poids) |
| --- | --- |
| Diabète de type 2 | glycémie .30 · IMC .22 · sucres .20 · fibres .14 · âge .08 · sommeil .06 |
| Cardiovasculaire | cholestérol .26 · graisses saturées .20 · systolique .16 · IMC .12 · fibres .10 · âge .09 · glycémie .07 |
| Hypertension | systolique .34 · diastolique .22 · IMC .14 · sucres .12 · hydratation .10 · âge .08 |
| Stéatose hépatique | IMC .28 · sucres .26 · graisses saturées .18 · glycémie .16 · sommeil .12 |

* probabilité `p = 100 / (1 + e^(−(score − 0,42) × 7,5))`, bornée à `[2 ; 96]` ;
* niveaux : `< 20` faible, `< 40` modéré, `< 60` élevé, `< 80` fort, `≥ 80` critique ;
* fenêtre d’apparition par bandes de probabilité (`80+ → 2–4 ans`, `65 → 3–6`, `50 → 5–9`,
  `35 → 8–13`, `20 → 13–19`), ajustée à l’âge (≥ 58 ans : −2 ans, ≥ 48 : −1, ≤ 32 : +1) ;
* **programme corrigé** : adhésion réaliste de 46–54 %, donc une probabilité réduite et une
  fenêtre repoussée — les valeurs « actuelles » restent affichées pour comparer ;
* score métabolique `100 − Σ(poids × probabilité)`, âge métabolique dérivé du score ;
* programme : générateur **PRNG mulberry32** amorcé par l’état complet (données + compteur
  *Régénérer*). Même état ⇒ même semaine ; un clic sur *Régénérer* ⇒ nouvelle semaine, elle aussi
  reproductible. Les plats sont choisis selon les deux risques dominants, l’écart à la cible
  calorique (Mifflin-St Jeor × 1,4 − déficit) et la pénalité de répétition sur 48 h.

---

## 5. Bilinguisme

* 211 clés FR/EN strictement à parité, aucune clé orpheline (vérifié par
  `tools/nvtest/ai-prevention-i18n-audit.js`, qui relève les clés réellement référencées).
* Les noms de plats, ingrédients et unités sont résolus à la volée (`AIP_I18N.loc`).
* **Aucun attribut `data-i18n`** dans le module : la couche i18n de la plateforme écraserait le
  contenu dynamique. Les textes sont rendus par `AIP_I18N.t()` à chaque passe.
* À chaque changement de langue, le module **re-rend tout le DOM** (nouveaux nœuds texte) : aucun
  cache de traduction ne peut restaurer une langue périmée.
* Le sélecteur FR/EN de l’en-tête aligne aussi la plateforme (`NUTRI_I18N.setLocale`), pour que la
  couche institutionnelle FR → EN ne retraduise pas les textes français.
* Sens de suivi : la plateforme est maîtresse, sauf pendant les 4 secondes qui suivent le montage
  (fenêtre d’installation : la plateforme initialise encore sa langue par pays et réaffirme une
  locale qui n’existait pas au moment du clic). Passé ce délai, tout changement réel est suivi, y
  compris quelques centaines de millisecondes après un choix explicite ; un simple re-dispatch de la
  locale déjà affichée ne casse jamais ce choix.

---

## 6. Accessibilité & performance

* Curseurs natifs (`<input type="range">`) étiquetés, nombres en `inputmode`, sélecteurs
  segmentés `aria-pressed`, onglets `role="tab"` + `aria-selected`, panneaux `role="tabpanel"`,
  flèches gauche/droite sur les jours, `Entrée`/`Espace` sur les cartes de risque.
* Zones de texte : 100 % en `rem`/`clamp()`, aucune fenêtre modale, aucun piège de focus.
* `prefers-reduced-motion` neutralise animations et transitions ; les jauges affichent alors
  directement leur valeur.
* Aucun réseau, aucun stockage serveur : tout est calculé dans le navigateur. Les animations
  utilisent `transform`/`opacity`, le SVG est inline, aucune image externe.
* Filets de sécurité si `requestAnimationFrame` est suspendu (onglet inactif) : jauges, compteurs
  et synchronisation aboutissent quand même.

---

## 7. API publique

```js
AIPrevention.state            // état complet (lecture)
AIPrevention.go(1..4)         // navigation
AIPrevention.analyse()        // (re)calcule les prédictions
AIPrevention.build()          // (re)génère le programme
AIPrevention.sync()           // synchronise les capteurs
AIPrevention.setDay(0..6)     // jour affiché
AIPrevention.setMode('current'|'corrected')
AIPrevention.selectRisk('diabetes'|'cardio'|'hypertension'|'hepatic')
AIPrevention.preset('risk'|'balanced')
AIPrevention.reset()
AIPrevention.model            // AIP_MODEL (moteur pur, testable sans DOM)
AIPrevention.charts           // AIP_CHARTS (générateurs SVG)
```

---

## 8. Tests

Suites jsdom de `tools/nvtest` (aucune dépendance de production) :

```bash
cd tools/nvtest
npm install
npm run serve &             # sert nutri1/MVP/web sur http://localhost:8000
npm run ai-prevention       # 132 vérifications (parcours + cas de bord)
npm run ai-prevention:i18n  # parité FR/EN du dictionnaire
```

Les suites couvrent : montage, 4 étapes, capteurs et synchro, curseurs/IMC, scanner et révélation
des signaux, bornes du moteur, cartes, timeline et sélection, mode corrigé, programme (7 jours,
déterminisme, régénération, parité FR/EN), impression, accessibilité, accès direct aux étapes,
clavier, invalidation, bascule de langue en pleine analyse, console propre et absence de clés i18n
non résolues.

---

## 9. Aperçu isolé

Ouvrir `components/ai-prevention/ai-prevention-preview.html` dans un navigateur : la même
application, sans la plateforme, pratique pour relire le design ou faire une démonstration.
