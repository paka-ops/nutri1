# NUTRI.N°1 V59 — Cellule Santé (Ministère de la Santé) + socle de sections partagé

V59 remplace la démonstration statique de la section `#health` (chiffres « — »,
graphiques vides, pastilles décoratives) par une véritable **cellule nationale
d'intelligence sanitaire** : nutrition mère-enfant, maladies non transmissibles
liées à l'alimentation, facteurs de risque, dépistage et cascade de prise en
charge, prévision, risque, investissement et méthode.

Elle introduit aussi le **socle de section réutilisable** qui manquait :

| Fichier | Rôle |
| --- | --- |
| `web/assets/nutri-core/nutri-ui.js` | `NX.ui` — cartes, tuiles d'indicateurs (bandeau pleine largeur), contrôles (sélecteur, segmenté, curseur, interrupteur, bouton), jauges, notes, chaînes de valeur, tableaux, graphiques SVG. |
| `web/assets/nutri-core/nutri-shell.js` | `NX.shell(cfg)` — coquille commune : en-tête, barre de commande, bandeau de KPI animé, onglets collants, tiroirs, note de décision, export, mode présentation, isolation des événements. |
| `web/assets/modules/health/*` | Données (`NUTRI_HEALTH_DATA`), modèles (`NUTRI_HEALTH_MODELS`), coquille et 8 onglets de la cellule santé, feuille de style dédiée. |

Aucune autre section n'est modifiée : `#agri` continue de fonctionner à
l'identique (bancs d'essai repassés : 8 onglets, 103 contrôles, 0 erreur).

## Les 8 onglets de la cellule santé

1. **Vue nationale** — 6 KPI animés, trajectoire 2010 → +10 ans avec intervalle
   80 % et cible nationale, cascade décès → charge attribuable, carte régionale
   interactive, indice de préparation du système, alertes cliquables, comparatif
   des 17 pays (clic = pays analysé), double fardeau, cartogramme, chaîne
   alimentation → risque → maladie → coût.
2. **Mère & enfant** — bandes d'âge, programmes vs cibles, fenêtre des
   1 000 jours, simulateur (allaitement, alimentation de complément,
   fortification, cantines, agents communautaires) avec coût, DALY évités et
   vies sauvées, table régionale triable, santé de la mère.
3. **NCD & facteurs de risque** — prévalences / charge / contrôle, attribution
   alimentaire (PAF, décès, DALY/100k, action de politique publique), apports vs
   repères OMS renforcés, origine des sucres & du sel, tendances base 100, mode
   de vie.
4. **Dépistage & soins** — cascade complète avec performance de détection et
   fuites aval chiffrées, simulateur à 6 leviers, capacité des services par
   région (carte de chaleur), équité urbain/rural, campagnes, file d'attente.
5. **Nutrition & alimentation** — qualité du régime, double fardeau régional,
   indice composite de qualité, disponibilité par groupe d'aliments croisée avec
   le Ministère de l'Agriculture, leviers alimentaires classés par impact.
6. **Prévision & scénarios** — intervalle 80 %, 4 scénarios comparés,
   Monte-Carlo 4 000 tirages, tornade de sensibilité, tableau des 10 indicateurs
   projetés, atteinte des cibles.
7. **Investissement & prévention** — constructeur de portefeuille (enveloppe ×
   priorité politique), frontière coût-efficacité vs seuil OMS, allocation par
   groupe et par région, portefeuille exportable, financement, retour
   économique, comparaison des trois priorités, coût des 12 leviers.
8. **Méthode & données** — qualité des données, provenance, équations,
   lacunes & feuille de route, calibration vs références, limites, gouvernance,
   réutilisation du socle.

Détail complet, formules et résultats de vérification :
[`docs/V59_NUTRI_CORE_SANTE.md`](docs/V59_NUTRI_CORE_SANTE.md).

## Vérification

- `health-check.js` : 21 contrôles verts (montage, onglets bilingues, bandeau de
  6 tuiles, rangées de cartes complètes, bornes de prévision, optimiseur contraint
  par le budget) ;
- `health-page.js` sur la page réelle : 8 onglets, 90 clics, 13 curseurs,
  103 lignes de tableau, **aucune erreur nouvelle** (parité avec la page V57) et
  aucun résidu des couches héritées dans `#health` ;
- non-régression agriculture et page complète : `agri-test.js`, `full-page.js`,
  `kpi-check.js`, `climate-check.js` repassés sans erreur.

Toutes les valeurs affichées sont **modélisées** à partir de sources synthétiques
nationales et étiquetées comme telles : la cellule montre la méthode et la
chaîne de décision, elle est prête à être recalibrée sur DHIS2, EDS/DHS & SMART,
STEPS, SARA et les registres hospitaliers.
