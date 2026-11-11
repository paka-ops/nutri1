/* ============================================================================
 * NUTRI.N°1 — Citizen Health & Nutrition Dashboard 360° · localisation
 * ----------------------------------------------------------------------------
 * Le module possède son propre dictionnaire FR / EN (≈ 320 clés) afin de ne pas
 * polluer locales/*.json, pilotés par la couche data-i18n de la plateforme.
 *
 * API publique
 *   CZD_I18N.t(key, params)   → chaîne traduite (repli EN puis clé)
 *   CZD_I18N.lang             → 'fr' | 'en'
 *   CZD_I18N.setLang(lang)    → choix explicite persisté
 *   CZD_I18N.follow()         → re-suivre la langue de la plateforme
 *   CZD_I18N.onChange(fn)     → callback de re-rendu
 *   CZD_I18N.num(value, dec)  → nombre formaté (virgule décimale en FR)
 *   CZD_I18N.date(ts)         → heure courte localisée
 *   CZD_I18N.parity()         → contrôle de parité FR/EN (dev)
 *
 * Résolution de la langue : choix explicite du module (bouton FR/EN) sinon
 * langue de la plateforme. Les locales non traduites (es, ewe, kab) retombent
 * sur l'anglais, comme le reste de la vitrine.
 * ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_LANG = 'nutri_czd_lang';

  var STRINGS = {
    /* ================================================================== */
    /* FRANÇAIS                                                            */
    /* ================================================================== */
    fr: {
      /* ---- Rangée Dark Bento (activité) — SESSION 2 ------------------- */
      'czd.bento.week': 'Cette semaine',
      'czd.bento.activity.title': 'Activité physique',
      'czd.bento.activity.sub': 'Pas, minutes actives et calories dépensées, en % de l’objectif',
      'czd.bento.activity.goal': 'Objectif',
      'czd.bento.activity.aria': 'Courbes hebdomadaires des pas, des minutes actives et des calories dépensées',
      'czd.bento.steps': 'Pas',
      'czd.bento.minutes': 'Minutes actives',
      'czd.bento.kcal': 'Calories dépensées',
      'czd.bento.days.title': 'Jours actifs',
      'czd.bento.days.count': '{n} jours',
      'czd.bento.days.aria': '{n} jours actifs en {m}',
      'czd.bento.days.streak': 'jours d’affilée',
      'czd.bento.days.active': 'Actif',
      'czd.bento.days.today': 'Aujourd’hui',
      'czd.bento.sleep.title': 'Sommeil',
      'czd.bento.sleep.sub': 'Nuit dernière',
      'czd.bento.sleep.good': 'Réparateur',
      'czd.bento.sleep.fair': 'Correct',
      'czd.bento.sleep.short': 'Trop court',
      'czd.bento.sleep.of': 'sur {b}',
      'czd.bento.sleep.aria': '{a} de sommeil sur un objectif de {b}',
      'czd.bento.sleep.bed': 'Coucher',
      'czd.bento.sleep.wake': 'Réveil',
      'czd.bento.weight.title': 'Plan de poids',
      'czd.bento.weight.sub': 'Zone de référence : {a}–{b} kg',
      'czd.bento.weight.left': 'encore {v} kg',
      'czd.bento.weight.onTarget': 'Dans la zone de référence',
      'czd.bento.weight.start': 'Départ',
      'czd.bento.weight.progress': 'Progression',
      'czd.bento.weight.target': 'Cible',
      'czd.bento.acts.title': 'Mes activités',
      'czd.bento.acts.sub': 'Séances du jour',
      'czd.bento.acts.add': '1 000 pas',
      'czd.bento.act.walk': 'Marche rapide',
      'czd.bento.act.cycle': 'Vélo',
      'czd.bento.act.strength': 'Renforcement musculaire',
      'czd.bento.act.stretch': 'Étirements & respiration',
      /* ---- En-tête -------------------------------------------------- */
      'czd.kicker': 'Dossier nutrition & santé · niveau clinique',
      'czd.title': 'Tableau de bord citoyen 360°',
      'czd.subtitle': 'Anthropométrie, biomarqueurs, habitudes et alimentation locale réunis dans un seul dossier : suivez vos indicateurs, comprenez vos risques et recevez un plan nutritionnel adapté.',
      'czd.badge.local': 'Données traitées sur l’appareil',
      'czd.badge.private': 'Consentement explicite',
      'czd.badge.clinical': 'Références OMS',
      'czd.lang.fr': 'Français',
      'czd.lang.en': 'English',
      'czd.sync': 'Synchroniser mes appareils',
      'czd.syncing': 'Synchronisation…',
      'czd.synced': 'Synchronisé',
      'czd.sync.never': 'Aucune synchronisation',
      'czd.sync.updated': 'Mis à jour il y a {s} s',
      'czd.export': 'Exporter le dossier',
      'czd.export.done': 'Dossier exporté (JSON) — partageable avec votre professionnel de santé',
      'czd.csv.done': 'Plan 7 jours exporté (CSV)',
      'czd.print': 'Imprimer',
      'czd.reset': 'Réinitialiser',
      'czd.reset.done': 'Démo réinitialisée',
      'czd.preset.title': 'Profils de démonstration',
      'czd.preset.balanced': 'Équilibré',
      'czd.preset.risk': 'À risque métabolique',
      'czd.preset.athlete': 'Sportif',
      'czd.preset.maternal': 'Grossesse',
      'czd.preset.applied': 'Profil « {name} » chargé',

      /* ---- Onglets --------------------------------------------------- */
      'czd.tab.overview': 'Vue d’ensemble',
      'czd.tab.plan': 'Plan 7 jours',
      'czd.tab.clinical': 'Analyse clinique',
      'czd.tab.family': 'Famille & mineurs',
      'czd.tab.aria': 'Navigation du tableau de bord citoyen',

      /* ---- Score global --------------------------------------------- */
      'czd.score.title': 'Score santé global',
      'czd.score.hint': 'Composite pondéré : nutrition, métabolisme, activité, hydratation.',
      'czd.score.excellent': 'Excellent',
      'czd.score.good': 'Bon',
      'czd.score.watch': 'À surveiller',
      'czd.score.risk': 'Prioritaire',
      'czd.score.nutrition': 'Nutrition',
      'czd.score.metabolic': 'Métabolisme',
      'czd.score.activity': 'Activité',
      'czd.score.hydration': 'Hydratation',
      'czd.score.delta': '{n} pts vs profil de référence',
      'czd.score.detail': 'Détail du score',

      /* ---- Profil ---------------------------------------------------- */
      'czd.profile.hello': 'Bonjour {name}',
      'czd.profile.meta': '{age} ans · {sex} · {height} cm',
      'czd.profile.sex.female': 'femme',
      'czd.profile.sex.male': 'homme',
      'czd.profile.goal': 'Objectif nutritionnel',
      'czd.profile.country': 'Pays du plan alimentaire',
      'czd.profile.edit': 'Modifier mon profil',
      'czd.profile.saved': 'Profil enregistré sur cet appareil',

      /* ---- KPI ------------------------------------------------------- */
      'czd.kpi.bmi': 'IMC',
      'czd.kpi.weight': 'Poids',
      'czd.kpi.waist': 'Tour de taille',
      'czd.kpi.bp': 'Tension',
      'czd.kpi.glucose': 'Glycémie',
      'czd.kpi.hba1c': 'HbA1c',
      'czd.kpi.whr': 'Ratio taille-hanche',
      'czd.kpi.whtr': 'Taille / stature',
      'czd.kpi.bmr': 'Métabolisme de base',
      'czd.kpi.tdee': 'Dépense énergétique',
      'czd.kpi.fiber': 'Fibres',
      'czd.kpi.protein': 'Protéines',
      'czd.unit.kg': 'kg',
      'czd.unit.cm': 'cm',
      'czd.unit.mmhg': 'mmHg',
      'czd.unit.kcal': 'kcal',
      'czd.unit.g': 'g',
      'czd.unit.mg': 'mg',
      'czd.unit.ug': 'µg',
      'czd.unit.perday': '/ jour',
      'czd.kpi.target': 'Cible',
      'czd.kpi.trend': 'Tendance 14 j',
      'czd.kpi.good': 'Dans la cible',
      'czd.kpi.watch': 'À surveiller',
      'czd.kpi.high': 'Au-dessus de la cible',
      'czd.kpi.low': 'En dessous de la cible',

      /* ---- Statuts --------------------------------------------------- */
      'czd.status.underweight': 'Insuffisance pondérale',
      'czd.status.normal': 'Corpulence normale',
      'czd.status.overweight': 'Surpoids',
      'czd.status.obesity': 'Obésité',
      'czd.status.optimal': 'Optimal',
      'czd.status.elevated': 'Élevé',
      'czd.status.high': 'Haut',
      'czd.status.low': 'Bas',
      'czd.status.prediabetes': 'Prédiabète',
      'czd.status.diabetes': 'Diabète (à confirmer)',
      'czd.status.hypertension': 'Hypertension (à confirmer)',
      'czd.status.central': 'Adiposité centrale',
      'czd.status.normalRange': 'Dans les références',

      /* ---- Énergie & macros ------------------------------------------ */
      'czd.energy.title': 'Balance énergétique du jour',
      'czd.energy.sub': 'Apports alimentaires estimés vs dépense (métabolisme de base + activité).',
      'czd.energy.intake': 'Apports',
      'czd.energy.expend': 'Dépenses',
      'czd.energy.balance': 'Solde',
      'czd.energy.byMeal': 'Répartition par repas',
      'czd.energy.deficit': 'Déficit',
      'czd.energy.surplus': 'Excès',
      'czd.energy.inTarget': 'Équilibre',
      'czd.macro.title': 'Répartition des macronutriments',
      'czd.macro.protein': 'Protéines',
      'czd.macro.carbs': 'Glucides',
      'czd.macro.fat': 'Lipides',
      'czd.macro.fiber': 'Fibres',
      'czd.macro.ofEnergy': '{n} % de l’énergie',
      'czd.gi.title': 'Charge glycémique hebdomadaire',
      'czd.gi.sub': 'Plus la barre est basse, plus la réponse glycémique est douce.',
      'czd.gi.low': 'Faible',
      'czd.gi.medium': 'Moyenne',
      'czd.gi.high': 'Élevée',

      /* ---- Habitudes ------------------------------------------------- */
      'czd.habit.title': 'Habitudes du jour',
      'czd.habit.water': 'Hydratation',
      'czd.habit.water.unit': '{a} / {b} verres',
      'czd.habit.steps': 'Activité (pas)',
      'czd.habit.sleep': 'Sommeil',
      'czd.habit.veggies': 'Légumes & fruits',
      'czd.habit.veggies.unit': '{a} / {b} portions',
      'czd.habit.add': '+',
      'czd.habit.addWater': 'Ajouter un verre d’eau',
      'czd.habit.addPortion': 'Ajouter une portion',
      'czd.habit.removeWater': 'Retirer un verre',
      'czd.habit.steps.updated': 'Pas mis à jour',
      'czd.habit.sleep.yesterday': 'Nuit dernière',
      'czd.habit.goal': 'objectif {v}',

      /* ---- Micronutriments ------------------------------------------- */
      'czd.micro.title': 'Couverture en micronutriments',
      'czd.micro.sub': 'Estimation sur la base du plan du jour, comparée aux repères nutritionnels.',
      'czd.micro.fiber': 'Fibres',
      'czd.micro.protein': 'Protéines',
      'czd.micro.iron': 'Fer',
      'czd.micro.vitA': 'Vitamine A',
      'czd.micro.vitC': 'Vitamine C',
      'czd.micro.calcium': 'Calcium',
      'czd.micro.coverage': 'couverture',
      'czd.micro.gap': '{v} restants',
      'czd.micro.good': 'Couverture satisfaisante',
      'czd.micro.need': 'À renforcer',

      /* ---- Risques --------------------------------------------------- */
      'czd.risk.title': 'Signaux de prévention',
      'czd.risk.sub': 'Probabilités estimées à partir des facteurs mesurés. Un avis professionnel reste indispensable.',
      'czd.risk.diabetes': 'Diabète de type 2',
      'czd.risk.hypertension': 'Hypertension',
      'czd.risk.cvd': 'Risque cardiovasculaire',
      'czd.risk.anemia': 'Carence en fer',
      'czd.risk.undernutrition': 'Dénutrition',
      'czd.risk.low': 'Faible',
      'czd.risk.moderate': 'Modéré',
      'czd.risk.high': 'Élevé',
      'czd.risk.factor': 'Facteur dominant',
      'czd.risk.open': 'Comprendre',
      'czd.risk.horizon': 'Horizon estimé : {v}',
      'czd.risk.action': 'Action prioritaire',

      /* ---- Priorités / conseils -------------------------------------- */
      'czd.priority.title': 'Vos 3 priorités du jour',
      'czd.priority.sub': 'Générées automatiquement à partir de vos indicateurs.',
      'czd.priority.hydrate': 'Boire encore {n} verres d’eau',
      'czd.priority.hydrate.done': 'Hydratation terminée',
      'czd.priority.walk': 'Marcher {n} pas de plus',
      'czd.priority.walk.done': 'Objectif d’activité atteint',
      'czd.priority.veggies': 'Ajouter {n} portion(s) de légumes',
      'czd.priority.veggies.done': 'Diversité alimentaire atteinte',
      'czd.priority.sugar': 'Remplacer {n} boisson(s) sucrée(s) par de l’eau',
      'czd.priority.salt': 'Réduire le sel sur {n} plat(s)',
      'czd.priority.fiber': 'Ajouter des fibres : niébé, mil ou légumes feuilles',
      'czd.priority.sleep': 'Viser 7 h 30 de sommeil',
      'czd.priority.protein': 'Renforcer les protéines : poisson, œufs ou légumineuses',
      'czd.priority.screen': 'Programmer un bilan glycémique',
      'czd.priority.consult': 'Solliciter un nutritionniste',
      'czd.priority.cta.water': '+ 1 verre',
      'czd.priority.cta.meal': 'Journaliser un repas',
      'czd.priority.cta.steps': '+ 1 000 pas',
      'czd.priority.cta.plan': 'Voir mon plan',
      'czd.priority.cta.learn': 'En savoir plus',

      /* ---- Badges ---------------------------------------------------- */
      'czd.badge.hydration': 'Hydratation au top',
      'czd.badge.steps': 'Objectif pas atteint',
      'czd.badge.fiber': 'Fibres au rendez-vous',
      'czd.badge.diversity': 'Diversité alimentaire',
      'czd.badge.sleep': 'Sommeil réparateur',
      'czd.badge.sugar': 'Peu de sucres libres',
      'czd.badge.locked': 'Bloqué',
      'czd.badge.title': 'Objectifs & badges',
      'czd.badge.progress': '{a} / {b} obtenus',

      /* ---- Plan 7 jours ---------------------------------------------- */
      'czd.plan.title': 'Plan nutritionnel de 7 jours',
      'czd.plan.sub': 'Construit sur des aliments africains accessibles, avec portions chiffrées et charge glycémique.',
      'czd.plan.generate': 'Générer mon plan',
      'czd.plan.regenerate': 'Régénérer',
      'czd.plan.csv': 'Télécharger (CSV)',
      'czd.plan.target': 'Cible',
      'czd.plan.today': 'Aujourd’hui',
      'czd.plan.day': 'Jour {n}',
      'czd.plan.breakfast': 'Petit-déjeuner',
      'czd.plan.lunch': 'Déjeuner',
      'czd.plan.dinner': 'Dîner',
      'czd.plan.snack': 'Collation',
      'czd.plan.kcal': 'kcal',
      'czd.plan.protein': 'Prot.',
      'czd.plan.fiber': 'Fibres',
      'czd.plan.iron': 'Fer',
      'czd.plan.vitA': 'Vit. A',
      'czd.plan.carbs': 'Gluc.',
      'czd.plan.fat': 'Lip.',
      'czd.plan.dayTotal': 'Total du jour',
      'czd.plan.mark': 'Marquer comme consommé',
      'czd.plan.unmark': 'Annuler',
      'czd.plan.eaten': 'Consommé',
      'czd.plan.adherence': 'Adhérence hebdomadaire',
      'czd.plan.heat.title': 'Assiduité repas par repas',
      'czd.plan.heat.sub': 'Cliquez sur une case pour marquer un repas comme pris.',
      'czd.plan.shift': 'Décalage de {n} kcal par rapport à la cible',
      'czd.plan.onTarget': 'Journée alignée sur la cible',
      'czd.plan.localFoods': 'Aliments locaux',
      'czd.plan.details': 'Détail nutritionnel',
      'czd.plan.shopping': 'Liste de courses',
      'czd.plan.shopping.hint': 'Regroupée automatiquement pour la semaine.',
      'czd.plan.empty': 'Générez un plan pour commencer.',
      'czd.plan.generated': 'Plan de 7 jours généré',
      'czd.plan.noGate': 'Les aliments sont sélectionnés selon votre objectif, votre pays et vos biomarqueurs.',
      'czd.plan.tip.title': 'Conseil du jour',
      'czd.plan.budget': 'Coût estimé',
      'czd.plan.budget.unit': 'FCFA / jour',
      'czd.plan.legacy': 'Voir le plan de la famille',

      /* ---- Analyse clinique ------------------------------------------ */
      'czd.clin.title': 'Analyse clinique & anthropométrique',
      'czd.clin.sub': 'Renseignez vos mesures : chaque indicateur est recalculé en direct avec ses références.',
      'czd.clin.form': 'Mesures & biomarqueurs',
      'czd.clin.sex': 'Sexe',
      'czd.clin.age': 'Âge',
      'czd.clin.height': 'Taille (cm)',
      'czd.clin.weight': 'Poids (kg)',
      'czd.clin.waist': 'Tour de taille (cm)',
      'czd.clin.hip': 'Tour de hanches (cm)',
      'czd.clin.glucose': 'Glycémie à jeun',
      'czd.clin.glucoseUnit': 'Unité de glycémie',
      'czd.clin.hba1c': 'HbA1c (%)',
      'czd.clin.sys': 'Tension systolique',
      'czd.clin.dia': 'Tension diastolique',
      'czd.clin.chol': 'Cholestérol total (mmol/L)',
      'czd.clin.creat': 'Créatinine (µmol/L)',
      'czd.sex.female': 'Femme',
      'czd.sex.male': 'Homme',
      'czd.ref.whoMedian': 'Médiane OMS',
      'czd.kpi.chol': 'Cholestérol total',
      'czd.kpi.sys': 'Tension systolique',
      'czd.clin.activity': 'Niveau d’activité',
      'czd.clin.save': 'Enregistrer les mesures',
      'czd.clin.saved': 'Mesures enregistrées — indicateurs recalculés',
      'czd.clin.resetForm': 'Réinitialiser les champs',
      'czd.clin.live': 'Recalcul en direct',
      'czd.clin.live.at': 'Calculé à {t}',
      'czd.clin.ref': 'Références utilisées',
      'czd.clin.ref.sub': 'Repères adultes (OMS / consensus cliniques). Ils ne remplacent pas un diagnostic.',
      'czd.clin.table.param': 'Paramètre',
      'czd.clin.table.value': 'Valeur',
      'czd.clin.table.ref': 'Référence',
      'czd.clin.table.status': 'Statut',
      'czd.clin.table.zone': 'Position dans la cible',
      'czd.clin.trends': 'Tendances sur 14 jours',
      'czd.clin.trend.weight': 'Poids & tour de taille',
      'czd.clin.trend.metabolic': 'Glycémie & tension',
      'czd.clin.radar': 'Profil métabolique vs référence',
      'czd.clin.radar.sub': '100 = cible atteinte. Les axes extérieurs indiquent un écart favorable ou défavorable.',
      'czd.clin.bmr': 'Métabolisme de base',
      'czd.clin.tdee': 'Dépense énergétique totale',
      'czd.clin.proteinTarget': 'Protéines cibles',
      'czd.clin.fiberTarget': 'Fibres cibles',
      'czd.clin.note': 'Ces indicateurs sont des aides à la décision. Toute anomalie doit être confirmée par un professionnel de santé.',
      'czd.clin.notes.title': 'Lecture clinique automatique',
      'czd.clin.note.normal': 'Aucune anomalie majeure détectée sur les paramètres renseignés.',
      'czd.clin.note.bmi': 'IMC de {v} : sortir de la zone 18,5–24,9 kg/m² augmente le risque métabolique à long terme.',
      'czd.clin.note.waist': 'Tour de taille de {v} cm au-dessus du seuil ({max} cm) : adiposité centrale à surveiller.',
      'czd.clin.note.glucose': 'Glycémie à jeun de {v} mmol/L au-dessus du repère : un contrôle HbA1c est recommandé.',
      'czd.clin.note.bp': 'Tension {v} mmHg : répéter la mesure au repos et consulter si confirmée.',
      'czd.clin.note.chol': 'Cholestérol total de {v} mmol/L : privilégier les graisses insaturées et les fibres.',
      'czd.clin.note.hydration': 'Hydratation insuffisante : viser {n} verres par jour.',
      'czd.clin.note.activity': 'Activité physique en dessous des recommandations (30 min / jour).',

      /* ---- Famille --------------------------------------------------- */
      'czd.family.title': 'Famille & mineurs',
      'czd.family.pill': 'ABONNEMENT FAMILLE',
      'czd.family.sub': 'Les parents ou tuteurs légaux gèrent les profils autorisés de leurs enfants mineurs et suivent leur croissance et leur nutrition.',
      'czd.family.badge': 'Accès parent / tuteur',
      'czd.family.member': 'Membre de la famille',
      'czd.family.child1': 'Ama — 7 ans',
      'czd.family.child2': 'Kofi — 11 ans',
      'czd.family.request': 'Demander / confirmer l’accès parental',
      'czd.family.requested': 'Accès parental confirmé pour ce profil enfant',
      'czd.family.revoke': 'Révoquer l’accès',
      'czd.family.revoked': 'Accès parental révoqué',
      'czd.family.locked': 'Accès verrouillé : confirmez votre statut de tuteur pour afficher les données de l’enfant.',
      'czd.family.granted': 'Accès actif · consentement horodaté',
      'czd.family.growth': 'Courbe de croissance (IMC-pour-âge)',
      'czd.family.growth.sub': 'Comparaison à la médiane de référence (trait pointillé).',
      'czd.family.diversity': 'Diversité alimentaire',
      'czd.family.diversity.sub': 'Groupes d’aliments consommés sur 24 h (cible ≥ 5).',
      'czd.family.alerts': 'Alertes',
      'czd.family.noAlert': 'Aucune alerte active',
      'czd.family.alert1': 'Suivi recommandé : diversité alimentaire faible',
      'czd.family.plan': 'Voir le plan nutritionnel',
      'czd.family.plan.done': 'Plan nutritionnel de l’enfant ouvert',
      'czd.family.full': 'Ouvrir le tableau de bord complet',
      'czd.family.full.done': 'Tableau de bord de l’enfant ouvert',
      'czd.family.group.cereals': 'Céréales & tubercules',
      'czd.family.group.legumes': 'Légumineuses',
      'czd.family.group.vegetables': 'Légumes & fruits',
      'czd.family.group.animal': 'Produits animaux',
      'czd.family.group.fats': 'Matières grasses',
      'czd.family.group.dairy': 'Lait & dérivés',
      'czd.family.nextVisit': 'Prochain suivi',
      'czd.family.nextVisit.value': '12 mars · consultation nutrition',
      'czd.family.growth.status': 'Statut de croissance',
      'czd.family.growth.onTrack': 'Dans la trajectoire',
      'czd.family.growth.watch': 'À surveiller',
      'czd.family.bmiAge': 'IMC-pour-âge',
      'czd.family.zscore': 'z-score estimé',
      'czd.family.household': 'Foyer',
      'czd.family.household.sub': '4 membres · 2 profils enfants',
      'czd.family.consent': 'Le consentement du tuteur est requis et journalisé pour tout accès aux données d’un mineur.',
      'czd.family.disclaimer': 'Les courbes sont des repères pédagogiques simplifiés ; le carnet de santé national reste la référence.',

      /* ---- Détails / modale ------------------------------------------ */
      'czd.modal.close': 'Fermer',
      'czd.modal.bmi.title': 'Comprendre votre IMC',
      'czd.modal.bmi.body': 'L’indice de masse corporelle rapporte le poids à la taille. Chez l’adulte, la zone 18,5–24,9 kg/m² est associée au risque métabolique le plus faible. Il ne distingue pas la masse musculaire de la masse grasse : à interpréter avec le tour de taille.',
      'czd.modal.waist.title': 'Tour de taille',
      'czd.modal.waist.body': 'Le tour de taille mesure l’adiposité abdominale, facteur indépendant de risque cardiométabolique. Les seuils usuels sont 80 cm (femme) et 94 cm (homme) ; au-delà de 88 / 102 cm, le risque devient élevé.',
      'czd.modal.glucose.title': 'Glycémie à jeun',
      'czd.modal.glucose.body': 'La glycémie à jeun reflète l’équilibre glucidique. Entre 3,9 et 5,5 mmol/L (70–99 mg/dL) elle est considérée normale ; entre 5,6 et 6,9 mmol/L on parle de prédiabète. La charge glycémique des repas influence ce paramètre.',
      'czd.modal.bp.title': 'Tension artérielle',
      'czd.modal.bp.body': 'La tension se mesure après 5 minutes de repos, bras soutenu. Une valeur ≥ 140/90 mmHg mesurée à plusieurs reprises évoque une hypertension. Réduire le sel (< 5 g/jour) et le poids a un effet mesurable.',
      'czd.modal.score.title': 'Comment est calculé le score ?',
      'czd.modal.score.body': 'Le score agrège quatre familles : nutrition (fibres, sucres libres, diversité), métabolisme (IMC, tour de taille, glycémie, tension), activité (pas et minutes) et hydratation. Chaque famille est notée sur 100 puis pondérée. Aucune donnée ne quitte l’appareil.',
      'czd.modal.risk.title': 'Signaux de prévention',
      'czd.modal.risk.body': 'Les probabilités affichées sont des estimations pédagogiques calculées localement à partir des facteurs mesurés. Elles ne constituent ni un diagnostic ni une prescription.',
      'czd.modal.plan.title': 'Construction du plan',
      'czd.modal.plan.body': 'Le plan répartit l’apport énergétique cible (métabolisme de base × facteur d’activité) sur quatre créneaux, en privilégiant des aliments locaux riches en fibres, fer et vitamine A. La charge glycémique est contrôlée jour après jour.',
      'czd.modal.family.title': 'Protection des mineurs',
      'czd.modal.family.body': 'Aucune donnée d’enfant n’est accessible sans consentement du tuteur. Les accès sont horodatés, révocables et limités à la lecture. Les courbes de croissance sont fournies à titre indicatif.',

      /* ---- Notifications --------------------------------------------- */
      'czd.toast.saved': 'Données enregistrées sur cet appareil',
      'czd.toast.water': 'Verre ajouté — {a}/{b}',
      'czd.toast.water.max': 'Objectif d’hydratation atteint',
      'czd.toast.steps': '1 000 pas ajoutés — {v} pas',
      'czd.toast.meal': 'Repas journalisé — {v} kcal',
      'czd.toast.mealUndo': 'Repas retiré du journal',
      'czd.toast.goal': 'Objectif : {v}',
      'czd.toast.exportBlocked': 'Export indisponible dans cet environnement',
      'czd.toast.offline': 'Mode démo local — aucune donnée envoyée',

      /* ---- Accessibilité / divers ------------------------------------ */
      'czd.a11y.tabs': 'Onglets du tableau de bord',
      'czd.a11y.chart': 'Graphique : {v}',
      'czd.a11y.progress': 'Progression : {v} %',
      'czd.footer.note': 'Démonstration NUTRI.N°1 · données locales, aucune transmission · références OMS simplifiées',
      'czd.footer.demo': 'Mode démonstration',
      'czd.tip.1': 'Associez toujours une source de vitamine C (agrume, tomate, baobab) aux aliments riches en fer végétal : l’absorption du fer augmente jusqu’à trois fois.',
      'czd.tip.2': 'Le niébé, le mil et les légumes feuilles locaux couvrent fibres, fer et calcium à coût maîtrisé.',
      'czd.tip.3': 'Buvez un verre d’eau avant chaque repas : cela soutient l’hydratation et la satiété.',
      'czd.tip.4': 'Remplacez une boisson sucrée par une infusion de moringa ou de citron pour réduire les sucres libres.',
      'czd.tip.5': 'Une marche de 10 minutes après le repas aide à lisser le pic glycémique post-prandial.',
      'czd.tip.6': 'Cuire à la vapeur ou à l’étouffée préserve mieux les vitamines hydrosolubles que la friture.',
      'czd.goal.balance': 'Équilibre général',
      'czd.goal.weight': 'Gestion du poids',
      'czd.goal.energy': 'Énergie & vitalité',
      'czd.goal.maternal': 'Grossesse & allaitement',
      'czd.goal.performance': 'Performance sportive',
      'czd.goal.ncd': 'Prévention MNT',
      'czd.activity.low': 'Sédentaire',
      'czd.activity.light': 'Légère',
      'czd.activity.moderate': 'Modérée',
      'czd.activity.high': 'Intense',
      'czd.option.yes': 'Oui',
      'czd.option.no': 'Non'
    },

    /* ================================================================== */
    /* ENGLISH                                                            */
    /* ================================================================== */
    en: {
      /* ---- Dark Bento row (activity) — SESSION 2 ------------------- */
      'czd.bento.week': 'This week',
      'czd.bento.activity.title': 'Physical Activity',
      'czd.bento.activity.sub': 'Steps, active minutes and calories burned, as % of goal',
      'czd.bento.activity.goal': 'Goal',
      'czd.bento.activity.aria': 'Weekly curves for steps, active minutes and calories burned',
      'czd.bento.steps': 'Steps',
      'czd.bento.minutes': 'Active minutes',
      'czd.bento.kcal': 'Calories burned',
      'czd.bento.days.title': 'Active Days',
      'czd.bento.days.count': '{n} days',
      'czd.bento.days.aria': '{n} active days in {m}',
      'czd.bento.days.streak': 'day streak',
      'czd.bento.days.active': 'Active',
      'czd.bento.days.today': 'Today',
      'czd.bento.sleep.title': 'Sleep',
      'czd.bento.sleep.sub': 'Last night',
      'czd.bento.sleep.good': 'Restful',
      'czd.bento.sleep.fair': 'Fair',
      'czd.bento.sleep.short': 'Too short',
      'czd.bento.sleep.of': 'of {b}',
      'czd.bento.sleep.aria': '{a} of sleep against a {b} goal',
      'czd.bento.sleep.bed': 'Bedtime',
      'czd.bento.sleep.wake': 'Wake-up',
      'czd.bento.weight.title': 'Weight Plan',
      'czd.bento.weight.sub': 'Reference range: {a}–{b} kg',
      'czd.bento.weight.left': '{v} kg to go',
      'czd.bento.weight.onTarget': 'Within the reference range',
      'czd.bento.weight.start': 'Start',
      'czd.bento.weight.progress': 'Progress',
      'czd.bento.weight.target': 'Target',
      'czd.bento.acts.title': 'My Activities',
      'czd.bento.acts.sub': 'Today’s sessions',
      'czd.bento.acts.add': '1,000 steps',
      'czd.bento.act.walk': 'Brisk walk',
      'czd.bento.act.cycle': 'Cycling',
      'czd.bento.act.strength': 'Strength training',
      'czd.bento.act.stretch': 'Stretching & breathing',
      /* ---- Header ---------------------------------------------------- */
      'czd.kicker': 'Nutrition & health record · clinical grade',
      'czd.title': 'Citizen Dashboard 360°',
      'czd.subtitle': 'Anthropometry, biomarkers, habits and local food in one record: track your indicators, understand your risks and receive a tailored nutrition plan.',
      'czd.badge.local': 'Data processed on device',
      'czd.badge.private': 'Explicit consent',
      'czd.badge.clinical': 'WHO references',
      'czd.lang.fr': 'Français',
      'czd.lang.en': 'English',
      'czd.sync': 'Sync my devices',
      'czd.syncing': 'Syncing…',
      'czd.synced': 'Synced',
      'czd.sync.never': 'Never synced',
      'czd.sync.updated': 'Updated {s}s ago',
      'czd.export': 'Export record',
      'czd.export.done': 'Record exported (JSON) — shareable with your health professional',
      'czd.csv.done': '7-day plan exported (CSV)',
      'czd.print': 'Print',
      'czd.reset': 'Reset',
      'czd.reset.done': 'Demo reset',
      'czd.preset.title': 'Demo profiles',
      'czd.preset.balanced': 'Balanced',
      'czd.preset.risk': 'Metabolic risk',
      'czd.preset.athlete': 'Athlete',
      'czd.preset.maternal': 'Pregnancy',
      'czd.preset.applied': 'Profile “{name}” loaded',

      /* ---- Tabs ------------------------------------------------------ */
      'czd.tab.overview': 'Overview',
      'czd.tab.plan': '7-day plan',
      'czd.tab.clinical': 'Clinical analysis',
      'czd.tab.family': 'Family & minors',
      'czd.tab.aria': 'Citizen dashboard navigation',

      /* ---- Global score ---------------------------------------------- */
      'czd.score.title': 'Overall health score',
      'czd.score.hint': 'Weighted composite: nutrition, metabolism, activity, hydration.',
      'czd.score.excellent': 'Excellent',
      'czd.score.good': 'Good',
      'czd.score.watch': 'Watch',
      'czd.score.risk': 'Priority',
      'czd.score.nutrition': 'Nutrition',
      'czd.score.metabolic': 'Metabolism',
      'czd.score.activity': 'Activity',
      'czd.score.hydration': 'Hydration',
      'czd.score.delta': '{n} pts vs reference profile',
      'czd.score.detail': 'Score breakdown',

      /* ---- Profile --------------------------------------------------- */
      'czd.profile.hello': 'Hello {name}',
      'czd.profile.meta': '{age} yrs · {sex} · {height} cm',
      'czd.profile.sex.female': 'female',
      'czd.profile.sex.male': 'male',
      'czd.profile.goal': 'Nutrition goal',
      'czd.profile.country': 'Food plan country',
      'czd.profile.edit': 'Edit my profile',
      'czd.profile.saved': 'Profile saved on this device',

      /* ---- KPI ------------------------------------------------------- */
      'czd.kpi.bmi': 'BMI',
      'czd.kpi.weight': 'Weight',
      'czd.kpi.waist': 'Waist',
      'czd.kpi.bp': 'Blood pressure',
      'czd.kpi.glucose': 'Blood glucose',
      'czd.kpi.hba1c': 'HbA1c',
      'czd.kpi.whr': 'Waist-hip ratio',
      'czd.kpi.whtr': 'Waist-to-height',
      'czd.kpi.bmr': 'Basal metabolism',
      'czd.kpi.tdee': 'Energy expenditure',
      'czd.kpi.fiber': 'Fiber',
      'czd.kpi.protein': 'Protein',
      'czd.unit.kg': 'kg',
      'czd.unit.cm': 'cm',
      'czd.unit.mmhg': 'mmHg',
      'czd.unit.kcal': 'kcal',
      'czd.unit.g': 'g',
      'czd.unit.mg': 'mg',
      'czd.unit.ug': 'µg',
      'czd.unit.perday': '/ day',
      'czd.kpi.target': 'Target',
      'czd.kpi.trend': '14-day trend',
      'czd.kpi.good': 'Within target',
      'czd.kpi.watch': 'Watch',
      'czd.kpi.high': 'Above target',
      'czd.kpi.low': 'Below target',

      /* ---- Statuses -------------------------------------------------- */
      'czd.status.underweight': 'Underweight',
      'czd.status.normal': 'Healthy weight',
      'czd.status.overweight': 'Overweight',
      'czd.status.obesity': 'Obesity',
      'czd.status.optimal': 'Optimal',
      'czd.status.elevated': 'Elevated',
      'czd.status.high': 'High',
      'czd.status.low': 'Low',
      'czd.status.prediabetes': 'Prediabetes',
      'czd.status.diabetes': 'Diabetes (to confirm)',
      'czd.status.hypertension': 'Hypertension (to confirm)',
      'czd.status.central': 'Central adiposity',
      'czd.status.normalRange': 'Within references',

      /* ---- Energy & macros ------------------------------------------- */
      'czd.energy.title': 'Energy balance today',
      'czd.energy.sub': 'Estimated intake vs expenditure (basal metabolism + activity).',
      'czd.energy.intake': 'Intake',
      'czd.energy.expend': 'Expenditure',
      'czd.energy.balance': 'Balance',
      'czd.energy.byMeal': 'Breakdown by meal',
      'czd.energy.deficit': 'Deficit',
      'czd.energy.surplus': 'Surplus',
      'czd.energy.inTarget': 'Balanced',
      'czd.macro.title': 'Macronutrient split',
      'czd.macro.protein': 'Protein',
      'czd.macro.carbs': 'Carbs',
      'czd.macro.fat': 'Fat',
      'czd.macro.fiber': 'Fiber',
      'czd.macro.ofEnergy': '{n}% of energy',
      'czd.gi.title': 'Weekly glycaemic load',
      'czd.gi.sub': 'The lower the bar, the gentler the glycaemic response.',
      'czd.gi.low': 'Low',
      'czd.gi.medium': 'Medium',
      'czd.gi.high': 'High',

      /* ---- Habits ---------------------------------------------------- */
      'czd.habit.title': 'Today’s habits',
      'czd.habit.water': 'Hydration',
      'czd.habit.water.unit': '{a} / {b} glasses',
      'czd.habit.steps': 'Activity (steps)',
      'czd.habit.sleep': 'Sleep',
      'czd.habit.veggies': 'Vegetables & fruit',
      'czd.habit.veggies.unit': '{a} / {b} servings',
      'czd.habit.add': '+',
      'czd.habit.addWater': 'Add a glass of water',
      'czd.habit.addPortion': 'Add a serving',
      'czd.habit.removeWater': 'Remove a glass',
      'czd.habit.steps.updated': 'Steps updated',
      'czd.habit.sleep.yesterday': 'Last night',
      'czd.habit.goal': 'goal {v}',

      /* ---- Micronutrients -------------------------------------------- */
      'czd.micro.title': 'Micronutrient coverage',
      'czd.micro.sub': 'Estimated from today’s plan against nutrient reference values.',
      'czd.micro.fiber': 'Fiber',
      'czd.micro.protein': 'Protein',
      'czd.micro.iron': 'Iron',
      'czd.micro.vitA': 'Vitamin A',
      'czd.micro.vitC': 'Vitamin C',
      'czd.micro.calcium': 'Calcium',
      'czd.micro.coverage': 'coverage',
      'czd.micro.gap': '{v} remaining',
      'czd.micro.good': 'Adequate coverage',
      'czd.micro.need': 'Needs attention',

      /* ---- Risks ----------------------------------------------------- */
      'czd.risk.title': 'Prevention signals',
      'czd.risk.sub': 'Probabilities estimated from measured factors. Professional advice remains essential.',
      'czd.risk.diabetes': 'Type 2 diabetes',
      'czd.risk.hypertension': 'Hypertension',
      'czd.risk.cvd': 'Cardiovascular risk',
      'czd.risk.anemia': 'Iron deficiency',
      'czd.risk.undernutrition': 'Undernutrition',
      'czd.risk.low': 'Low',
      'czd.risk.moderate': 'Moderate',
      'czd.risk.high': 'High',
      'czd.risk.factor': 'Dominant factor',
      'czd.risk.open': 'Understand',
      'czd.risk.horizon': 'Estimated horizon: {v}',
      'czd.risk.action': 'Priority action',

      /* ---- Priorities / tips ----------------------------------------- */
      'czd.priority.title': 'Your 3 priorities today',
      'czd.priority.sub': 'Automatically generated from your indicators.',
      'czd.priority.hydrate': 'Drink {n} more glasses of water',
      'czd.priority.hydrate.done': 'Hydration complete',
      'czd.priority.walk': 'Walk {n} more steps',
      'czd.priority.walk.done': 'Activity goal reached',
      'czd.priority.veggies': 'Add {n} serving(s) of vegetables',
      'czd.priority.veggies.done': 'Dietary diversity reached',
      'czd.priority.sugar': 'Swap {n} sugary drink(s) for water',
      'czd.priority.salt': 'Reduce salt on {n} dish(es)',
      'czd.priority.fiber': 'Add fiber: black-eyed peas, millet or leafy greens',
      'czd.priority.sleep': 'Aim for 7h30 of sleep',
      'czd.priority.protein': 'Boost protein: fish, eggs or legumes',
      'czd.priority.screen': 'Schedule a glucose screening',
      'czd.priority.consult': 'Request a nutritionist',
      'czd.priority.cta.water': '+ 1 glass',
      'czd.priority.cta.meal': 'Log a meal',
      'czd.priority.cta.steps': '+ 1,000 steps',
      'czd.priority.cta.plan': 'View my plan',
      'czd.priority.cta.learn': 'Learn more',

      /* ---- Badges ---------------------------------------------------- */
      'czd.badge.hydration': 'Hydration on point',
      'czd.badge.steps': 'Step goal reached',
      'czd.badge.fiber': 'Fiber on track',
      'czd.badge.diversity': 'Dietary diversity',
      'czd.badge.sleep': 'Restorative sleep',
      'czd.badge.sugar': 'Low free sugars',
      'czd.badge.locked': 'Locked',
      'czd.badge.title': 'Goals & badges',
      'czd.badge.progress': '{a} / {b} earned',

      /* ---- 7-day plan ------------------------------------------------ */
      'czd.plan.title': '7-day nutrition plan',
      'czd.plan.sub': 'Built on accessible African foods, with measured portions and glycaemic load.',
      'czd.plan.generate': 'Generate my plan',
      'czd.plan.regenerate': 'Regenerate',
      'czd.plan.csv': 'Download (CSV)',
      'czd.plan.target': 'Target',
      'czd.plan.today': 'Today',
      'czd.plan.day': 'Day {n}',
      'czd.plan.breakfast': 'Breakfast',
      'czd.plan.lunch': 'Lunch',
      'czd.plan.dinner': 'Dinner',
      'czd.plan.snack': 'Snack',
      'czd.plan.kcal': 'kcal',
      'czd.plan.protein': 'Prot.',
      'czd.plan.fiber': 'Fiber',
      'czd.plan.iron': 'Iron',
      'czd.plan.vitA': 'Vit. A',
      'czd.plan.carbs': 'Carbs',
      'czd.plan.fat': 'Fat',
      'czd.plan.dayTotal': 'Day total',
      'czd.plan.mark': 'Mark as eaten',
      'czd.plan.unmark': 'Undo',
      'czd.plan.eaten': 'Eaten',
      'czd.plan.adherence': 'Weekly adherence',
      'czd.plan.heat.title': 'Meal-by-meal adherence',
      'czd.plan.heat.sub': 'Click a cell to mark a meal as eaten.',
      'czd.plan.shift': '{n} kcal away from target',
      'czd.plan.onTarget': 'Day aligned with target',
      'czd.plan.localFoods': 'Local foods',
      'czd.plan.details': 'Nutrition detail',
      'czd.plan.shopping': 'Shopping list',
      'czd.plan.shopping.hint': 'Automatically grouped for the week.',
      'czd.plan.empty': 'Generate a plan to get started.',
      'czd.plan.generated': '7-day plan generated',
      'czd.plan.noGate': 'Foods are selected from your goal, country and biomarkers.',
      'czd.plan.tip.title': 'Tip of the day',
      'czd.plan.budget': 'Estimated cost',
      'czd.plan.budget.unit': 'XOF / day',
      'czd.plan.legacy': 'View family plan',

      /* ---- Clinical -------------------------------------------------- */
      'czd.clin.title': 'Clinical & anthropometric analysis',
      'czd.clin.sub': 'Enter your measurements: every indicator is recalculated live against its references.',
      'czd.clin.form': 'Measurements & biomarkers',
      'czd.clin.sex': 'Sex',
      'czd.clin.age': 'Age',
      'czd.clin.height': 'Height (cm)',
      'czd.clin.weight': 'Weight (kg)',
      'czd.clin.waist': 'Waist (cm)',
      'czd.clin.hip': 'Hip (cm)',
      'czd.clin.glucose': 'Fasting glucose',
      'czd.clin.glucoseUnit': 'Glucose unit',
      'czd.clin.hba1c': 'HbA1c (%)',
      'czd.clin.sys': 'Systolic BP',
      'czd.clin.dia': 'Diastolic BP',
      'czd.clin.chol': 'Total cholesterol (mmol/L)',
      'czd.clin.creat': 'Creatinine (µmol/L)',
      'czd.sex.female': 'Female',
      'czd.sex.male': 'Male',
      'czd.ref.whoMedian': 'WHO median',
      'czd.kpi.chol': 'Total cholesterol',
      'czd.kpi.sys': 'Systolic BP',
      'czd.clin.activity': 'Activity level',
      'czd.clin.save': 'Save measurements',
      'czd.clin.saved': 'Measurements saved — indicators recalculated',
      'czd.clin.resetForm': 'Reset fields',
      'czd.clin.live': 'Live recalculation',
      'czd.clin.live.at': 'Computed at {t}',
      'czd.clin.ref': 'References used',
      'czd.clin.ref.sub': 'Adult references (WHO / clinical consensus). They do not replace a diagnosis.',
      'czd.clin.table.param': 'Parameter',
      'czd.clin.table.value': 'Value',
      'czd.clin.table.ref': 'Reference',
      'czd.clin.table.status': 'Status',
      'czd.clin.table.zone': 'Position in target',
      'czd.clin.trends': '14-day trends',
      'czd.clin.trend.weight': 'Weight & waist',
      'czd.clin.trend.metabolic': 'Glucose & blood pressure',
      'czd.clin.radar': 'Metabolic profile vs reference',
      'czd.clin.radar.sub': '100 = target met. Outer axes indicate a favourable or unfavourable gap.',
      'czd.clin.bmr': 'Basal metabolism',
      'czd.clin.tdee': 'Total energy expenditure',
      'czd.clin.proteinTarget': 'Protein target',
      'czd.clin.fiberTarget': 'Fiber target',
      'czd.clin.note': 'These indicators support decision-making. Any anomaly must be confirmed by a health professional.',
      'czd.clin.notes.title': 'Automatic clinical reading',
      'czd.clin.note.normal': 'No major anomaly detected on the provided parameters.',
      'czd.clin.note.bmi': 'BMI of {v}: leaving the 18.5–24.9 kg/m² zone increases long-term metabolic risk.',
      'czd.clin.note.waist': 'Waist of {v} cm above the threshold ({max} cm): monitor central adiposity.',
      'czd.clin.note.glucose': 'Fasting glucose of {v} mmol/L above reference: an HbA1c check is recommended.',
      'czd.clin.note.bp': 'Blood pressure {v} mmHg: repeat the measurement at rest and consult if confirmed.',
      'czd.clin.note.chol': 'Total cholesterol of {v} mmol/L: favour unsaturated fats and fiber.',
      'czd.clin.note.hydration': 'Insufficient hydration: aim for {n} glasses per day.',
      'czd.clin.note.activity': 'Physical activity below recommendations (30 min / day).',

      /* ---- Family ---------------------------------------------------- */
      'czd.family.title': 'Family & minors',
      'czd.family.pill': 'FAMILY SUBSCRIPTION',
      'czd.family.sub': 'Parents or legal guardians manage authorised profiles for their minor children and follow growth and nutrition.',
      'czd.family.badge': 'Parent / guardian access',
      'czd.family.member': 'Family member',
      'czd.family.child1': 'Ama — 7 years',
      'czd.family.child2': 'Kofi — 11 years',
      'czd.family.request': 'Request / confirm parental access',
      'czd.family.requested': 'Parental access confirmed for this child profile',
      'czd.family.revoke': 'Revoke access',
      'czd.family.revoked': 'Parental access revoked',
      'czd.family.locked': 'Access locked: confirm your guardian status to display the child’s data.',
      'czd.family.granted': 'Access active · timestamped consent',
      'czd.family.growth': 'Growth curve (BMI-for-age)',
      'czd.family.growth.sub': 'Compared with the reference median (dashed line).',
      'czd.family.diversity': 'Dietary diversity',
      'czd.family.diversity.sub': 'Food groups consumed in 24h (target ≥ 5).',
      'czd.family.alerts': 'Alerts',
      'czd.family.noAlert': 'No active alert',
      'czd.family.alert1': 'Follow-up recommended: low dietary diversity',
      'czd.family.plan': 'View nutrition plan',
      'czd.family.plan.done': 'Child nutrition plan opened',
      'czd.family.full': 'Open full child dashboard',
      'czd.family.full.done': 'Child dashboard opened',
      'czd.family.group.cereals': 'Cereals & tubers',
      'czd.family.group.legumes': 'Legumes',
      'czd.family.group.vegetables': 'Vegetables & fruit',
      'czd.family.group.animal': 'Animal products',
      'czd.family.group.fats': 'Fats',
      'czd.family.group.dairy': 'Milk & dairy',
      'czd.family.nextVisit': 'Next follow-up',
      'czd.family.nextVisit.value': 'March 12 · nutrition consultation',
      'czd.family.growth.status': 'Growth status',
      'czd.family.growth.onTrack': 'On track',
      'czd.family.growth.watch': 'Watch',
      'czd.family.bmiAge': 'BMI-for-age',
      'czd.family.zscore': 'Estimated z-score',
      'czd.family.household': 'Household',
      'czd.family.household.sub': '4 members · 2 child profiles',
      'czd.family.consent': 'Guardian consent is required and logged for any access to minor data.',
      'czd.family.disclaimer': 'Curves are simplified educational references; the national health booklet remains authoritative.',

      /* ---- Modal ----------------------------------------------------- */
      'czd.modal.close': 'Close',
      'czd.modal.bmi.title': 'Understanding your BMI',
      'czd.modal.bmi.body': 'Body mass index relates weight to height. In adults, 18.5–24.9 kg/m² is associated with the lowest metabolic risk. It does not separate muscle from fat: read it together with waist circumference.',
      'czd.modal.waist.title': 'Waist circumference',
      'czd.modal.waist.body': 'Waist circumference measures abdominal adiposity, an independent cardiometabolic risk factor. Usual thresholds are 80 cm (women) and 94 cm (men); above 88 / 102 cm risk becomes high.',
      'czd.modal.glucose.title': 'Fasting glucose',
      'czd.modal.glucose.body': 'Fasting glucose reflects glucose balance. Between 3.9 and 5.5 mmol/L (70–99 mg/dL) it is considered normal; 5.6–6.9 mmol/L indicates prediabetes. Meal glycaemic load influences this value.',
      'czd.modal.bp.title': 'Blood pressure',
      'czd.modal.bp.body': 'Blood pressure is measured after 5 minutes of rest, arm supported. A value ≥ 140/90 mmHg on repeated measurements suggests hypertension. Reducing salt (< 5 g/day) and weight has a measurable effect.',
      'czd.modal.score.title': 'How is the score calculated?',
      'czd.modal.score.body': 'The score aggregates four families: nutrition (fiber, free sugars, diversity), metabolism (BMI, waist, glucose, blood pressure), activity (steps and minutes) and hydration. Each is scored out of 100 then weighted. No data leaves the device.',
      'czd.modal.risk.title': 'Prevention signals',
      'czd.modal.risk.body': 'Displayed probabilities are educational estimates computed locally from measured factors. They are neither a diagnosis nor a prescription.',
      'czd.modal.plan.title': 'How the plan is built',
      'czd.modal.plan.body': 'The plan spreads the target energy intake (basal metabolism × activity factor) across four slots, prioritising local foods rich in fiber, iron and vitamin A. Glycaemic load is controlled day by day.',
      'czd.modal.family.title': 'Protecting minors',
      'czd.modal.family.body': 'No child data is accessible without guardian consent. Access is timestamped, revocable and read-only. Growth curves are indicative.',

      /* ---- Notifications --------------------------------------------- */
      'czd.toast.saved': 'Data saved on this device',
      'czd.toast.water': 'Glass added — {a}/{b}',
      'czd.toast.water.max': 'Hydration goal reached',
      'czd.toast.steps': '1,000 steps added — {v} steps',
      'czd.toast.meal': 'Meal logged — {v} kcal',
      'czd.toast.mealUndo': 'Meal removed from journal',
      'czd.toast.goal': 'Goal: {v}',
      'czd.toast.exportBlocked': 'Export unavailable in this environment',
      'czd.toast.offline': 'Local demo mode — no data sent',

      /* ---- A11y / misc ----------------------------------------------- */
      'czd.a11y.tabs': 'Dashboard tabs',
      'czd.a11y.chart': 'Chart: {v}',
      'czd.a11y.progress': 'Progress: {v}%',
      'czd.footer.note': 'NUTRI.N°1 demonstration · local data, nothing transmitted · simplified WHO references',
      'czd.footer.demo': 'Demo mode',
      'czd.tip.1': 'Always pair plant iron with a vitamin C source (citrus, tomato, baobab): iron absorption can triple.',
      'czd.tip.2': 'Black-eyed peas, millet and local leafy greens cover fiber, iron and calcium at low cost.',
      'czd.tip.3': 'Drink a glass of water before each meal: it supports hydration and satiety.',
      'czd.tip.4': 'Replace one sugary drink with a moringa or lemon infusion to cut free sugars.',
      'czd.tip.5': 'A 10-minute walk after eating helps smooth the post-meal glucose peak.',
      'czd.tip.6': 'Steaming or stewing preserves water-soluble vitamins better than frying.',
      'czd.goal.balance': 'General balance',
      'czd.goal.weight': 'Weight management',
      'czd.goal.energy': 'Energy & vitality',
      'czd.goal.maternal': 'Pregnancy & lactation',
      'czd.goal.performance': 'Sports performance',
      'czd.goal.ncd': 'NCD prevention',
      'czd.activity.low': 'Sedentary',
      'czd.activity.light': 'Light',
      'czd.activity.moderate': 'Moderate',
      'czd.activity.high': 'Intense',
      'czd.option.yes': 'Yes',
      'czd.option.no': 'No'
    }
  };

  /* ------------------------------------------------------------------ */
  /* Résolution de la langue                                            */
  /* ------------------------------------------------------------------ */
  function platformLocale() {
    var raw = '';
    try { raw = global.localStorage.getItem('nutri_language') || ''; } catch (e) {}
    if (!raw && global.NUTRI_I18N && global.NUTRI_I18N.locale) raw = global.NUTRI_I18N.locale;
    if (!raw) raw = global.document && global.document.documentElement.getAttribute('lang');
    raw = String(raw || '').toLowerCase();
    return raw.indexOf('fr') === 0 ? 'fr' : 'en';
  }

  function readOverride() {
    try {
      var v = global.localStorage.getItem(STORAGE_LANG);
      return v === 'fr' || v === 'en' ? v : null;
    } catch (e) { return null; }
  }

  var listeners = [];

  var API = {
    supported: ['fr', 'en'],
    lang: 'en',
    override: null,

    t: function (key, params) {
      var pack = STRINGS[this.lang] || STRINGS.en;
      var value = Object.prototype.hasOwnProperty.call(pack, key) ? pack[key] : null;
      if (value == null) value = STRINGS.en[key] != null ? STRINGS.en[key] : key;
      if (params) {
        Object.keys(params).forEach(function (k) {
          value = value.split('{' + k + '}').join(String(params[k]));
        });
      }
      return value;
    },

    /* Nombre formaté selon la langue : 1 234,5 (FR) / 1,234.5 (EN). */
    num: function (value, decimals) {
      if (value == null || isNaN(value)) return '—';
      var d = typeof decimals === 'number' ? decimals : (Math.abs(value) < 10 ? 1 : 0);
      var fixed = Number(value).toFixed(d);
      var parts = fixed.split('.');
      var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.lang === 'fr' ? ' ' : ',');
      return this.lang === 'fr' ? whole + (parts[1] ? ',' + parts[1] : '') : whole + (parts[1] ? '.' + parts[1] : '');
    },

    date: function (ts) {
      try {
        return new Date(ts || Date.now()).toLocaleTimeString(this.lang === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
      } catch (e) { return ''; }
    },

    onChange: function (fn) {
      if (typeof fn === 'function' && listeners.indexOf(fn) === -1) listeners.push(fn);
    },

    emit: function (reason) {
      listeners.forEach(function (fn) {
        try { fn(API.lang, reason); } catch (e) { /* un module ne doit jamais casser la page */ }
      });
    },

    follow: function (silent) {
      API.override = null;
      try { global.localStorage.removeItem(STORAGE_LANG); } catch (e) {}
      API.apply(platformLocale(), silent);
    },

    setLang: function (lang) {
      lang = String(lang || '').toLowerCase().indexOf('fr') === 0 ? 'fr' : 'en';
      API.override = lang;
      API.platformAtOverride = platformLocale();
      try { global.localStorage.setItem(STORAGE_LANG, lang); } catch (e) {}
      API.apply(lang, false);
    },

    apply: function (lang, silent) {
      var changed = API.lang !== lang;
      API.lang = lang;
      try {
        global.document.documentElement.setAttribute('data-czd-locale', lang);
        global.document.documentElement.setAttribute('lang', lang);
      } catch (e) {}
      if (changed && !silent) API.emit('language');
      return changed;
    },

    /* La plateforme peut rediffuser sa locale plusieurs fois au démarrage :
       un choix explicite n'est écrasé que si la langue change réellement. */
    syncFromPlatform: function () {
      if (!API.override) { API.follow(); return true; }
      if (API.settleUntil && Date.now() < API.settleUntil) return false;
      var p = platformLocale();
      if (p === API.lang || p === API.platformAtOverride) return false;
      API.follow();
      return true;
    },

    boot: function () {
      API.settleUntil = Date.now() + 3000;
      var override = readOverride();
      API.override = override;
      API.platformAtOverride = platformLocale();
      API.lang = override || API.platformAtOverride;
    },

    /* Contrôle de parité FR/EN (console + tests). */
    parity: function () {
      var fr = Object.keys(STRINGS.fr), en = Object.keys(STRINGS.en);
      var missingEn = fr.filter(function (k) { return en.indexOf(k) === -1; });
      var missingFr = en.filter(function (k) { return fr.indexOf(k) === -1; });
      var empty = fr.concat(en).filter(function (k) {
        var a = STRINGS.fr[k], b = STRINGS.en[k];
        if (a != null && !String(a).trim()) return true;
        if (b != null && !String(b).trim()) return true;
        return false;
      });
      return { fr: fr.length, en: en.length, missingEn: missingEn, missingFr: missingFr, empty: empty };
    }
  };

  global.CZD_I18N = API;
  global.CZD_I18N.strings = STRINGS;
  API.boot();
})(window);
