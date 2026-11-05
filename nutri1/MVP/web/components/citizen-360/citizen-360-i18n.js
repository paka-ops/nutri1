/* ============================================================================
   NUTRI.N°1 — CITIZEN 360 · localisation FR / EN
   ----------------------------------------------------------------------------
   Le module vit dans un Shadow DOM : les traducteurs globaux (V28 / V29 /
   institutional-i18n-engine) ne le voient pas. Il possède donc son propre
   dictionnaire, suit la langue de la plateforme et propose un commutateur
   FR / EN local qui n'affecte aucune autre vue.
   ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_OVERRIDE = 'nutri_citizen360_lang';
  var STORAGE_PLATFORM = 'nutri_language';
  var FR_COUNTRIES = ['BJ', 'BF', 'CI', 'GN', 'GW', 'ML', 'NE', 'SN', 'TG', 'TD', 'CG', 'CD', 'CM', 'GA'];

  var STRINGS = {
    fr: {
      /* ---- En-tête ---- */
      'head.kicker': 'INTELLIGENCE NUTRITIONNELLE PERSONNELLE',
      'head.title': 'Citizen 360 · Tableau de bord nutrition',
      'head.sub': 'Une lecture clinique, alimentaire et préventive de vos 90 derniers jours : mesures, apports, micronutriments, habitudes et signaux précoces réunis dans un seul espace.',
      'head.updated': 'Données actualisées',
      'head.country': 'Pays',
      'head.confidence': 'Confiance IA',
      'badge.premium': 'ÉDITION PREMIUM',
      'badge.demo': 'DONNÉES DE DÉMONSTRATION',
      'badge.privacy': 'CONSENTEMENT & CONFIDENTIALITÉ',
      'badge.live': 'FLUX ACTIF',
      'period.label': 'Période',
      'period.7': '7 J',
      'period.30': '30 J',
      'period.90': '90 J',
      'lang.label': 'Langue du module',
      'lang.fr': 'FR',
      'lang.en': 'EN',
      'btn.export': 'Exporter',
      'btn.refresh': 'Actualiser',
      'btn.print': 'Imprimer',
      'btn.plan': 'Ouvrir mon plan 7 jours',
      'btn.consult': 'Consulter un nutritionniste',

      /* ---- Héros ---- */
      'hero.eyebrow': 'VOTRE PROFIL NUTRITIONNEL',
      'hero.greeting': 'Bonjour, Ama 👋🏾',
      'hero.intro': 'Votre équilibre nutritionnel progresse. Trois leviers restent prioritaires pour consolider les résultats des 30 derniers jours.',
      'hero.scoreLabel': 'Score nutrition',
      'hero.scoreUnit': '/ 100',
      'hero.improvement': '+6 pts ce mois',
      'hero.nextReview': 'Prochain bilan · 12 nov. 2026',
      'hero.target': 'Objectif 85',
      'hero.legend.diet': 'Qualité alimentaire',
      'hero.legend.metabolic': 'Équilibre métabolique',
      'hero.legend.adherence': 'Assiduité au plan',
      'signals.title': 'Signaux du jour',
      'signals.sub': 'Détectés par le moteur de prévention, avec validation humaine.',

      /* ---- KPI ---- */
      'kpi.bmi': 'IMC',
      'kpi.glucose': 'Glycémie à jeun',
      'kpi.bp': 'Tension artérielle',
      'kpi.diversity': 'Diversité alimentaire',
      'kpi.ref.bmi': 'Réf. 18,5–24,9',
      'kpi.ref.glucose': 'Réf. 3,9–5,5 mmol/L',
      'kpi.ref.bp': 'Réf. < 120/80',
      'kpi.ref.diversity': 'Cible ≥ 80',
      'kpi.delta.vs': 'vs période précédente',

      /* ---- Graphiques ---- */
      'chart.energy.title': 'Énergie & équilibre des repas',
      'chart.energy.sub': 'Apport quotidien par repas, comparé à la cible énergétique personnalisée.',
      'chart.energy.target': 'Cible 2 100 kcal',
      'chart.energy.unit': 'kcal',
      'chart.energy.meals.breakfast': 'Petit-déjeuner',
      'chart.energy.meals.lunch': 'Déjeuner',
      'chart.energy.meals.dinner': 'Dîner',
      'chart.energy.meals.snack': 'Collation',
      'chart.energy.note': 'Les barres empilées montrent la répartition des repas ; la ligne pointillée indique la cible.',

      'chart.clinical.title': 'Tendances cliniques croisées',
      'chart.clinical.sub': 'Indices normalisés (base 100 au début de la période) pour comparer des unités différentes.',
      'chart.clinical.index': 'Indice base 100',
      'chart.clinical.latest': 'Dernière valeur',
      'chart.clinical.toggle': 'Afficher / masquer une série',
      'chart.clinical.series.weight': 'Poids',
      'chart.clinical.series.glucose': 'Glycémie',
      'chart.clinical.series.systolic': 'Tension systolique',
      'chart.clinical.series.diversity': 'Diversité',
      'chart.clinical.note': 'Un indice inférieur à 100 signifie une baisse par rapport au début de la période.',

      'chart.macro.title': 'Répartition des macronutriments',
      'chart.macro.sub': 'Apport du jour et distance à la cible personnalisée.',
      'chart.macro.total': 'Apport total',
      'chart.macro.kcal': 'kcal',
      'chart.macro.target': 'Cible',
      'chart.macro.note': 'Les fibres ne comptent pas dans l’apport calorique total.',
      'macro.carbs': 'Glucides',
      'macro.protein': 'Protéines',
      'macro.fat': 'Lipides',
      'macro.fiber': 'Fibres',

      'chart.micro.title': 'Couverture des micronutriments',
      'chart.micro.sub': 'Pourcentage de l’apport de référence atteint sur les 7 derniers jours.',
      'chart.micro.achieved': 'atteint',
      'chart.micro.target': 'Cible 100 %',
      'micro.iron': 'Fer',
      'micro.calcium': 'Calcium',
      'micro.vitA': 'Vitamine A',
      'micro.vitC': 'Vitamine C',
      'micro.folate': 'Folates',
      'micro.zinc': 'Zinc',
      'micro.fiber': 'Fibres',
      'micro.sodium': 'Sodium (max)',

      'chart.radar.title': 'Diversité des groupes alimentaires',
      'chart.radar.sub': 'Profil de consommation hebdomadaire comparé au panier équilibré de référence.',
      'chart.radar.actual': 'Votre profil',
      'chart.radar.target': 'Panier cible',
      'radar.cereals': 'Céréales',
      'radar.legumes': 'Légumineuses',
      'radar.vegetables': 'Légumes',
      'radar.fruits': 'Fruits',
      'radar.protein': 'Protéines',
      'radar.dairy': 'Laitages',

      'chart.hydration.title': 'Hydratation & assiduité',
      'chart.hydration.sub': 'Objectif quotidien de 2 L sur 28 jours, complété par le score d’assiduité.',
      'chart.hydration.week': 'Semaine',
      'chart.hydration.low': 'Sous l’objectif',
      'chart.hydration.good': 'Objectif atteint',
      'chart.hydration.avg': 'Moyenne 28 j',
      'chart.hydration.today': 'Aujourd’hui',

      'chart.risk.title': 'Prévention & signaux de risque',
      'chart.risk.sub': 'Scores indicatifs calculés à partir des mesures, du journal alimentaire et des références.',
      'chart.risk.composite': 'Indice composite',
      'chart.risk.low': 'Faible',
      'chart.risk.moderate': 'Modéré',
      'chart.risk.high': 'À surveiller',
      'chart.risk.trend': 'Tendance 30 j',
      'chart.risk.disclaimer': 'Scores de démonstration, sans valeur diagnostique. Toute décision de santé relève d’un professionnel.',
      'risk.glucose': 'Risque glycémique',
      'risk.cardio': 'Risque cardiovasculaire',
      'risk.micro': 'Carence micronutritionnelle',
      'risk.sodium': 'Surcharge sodée',

      /* ---- Journal ---- */
      'section.meals.title': 'Journal alimentaire du jour',
      'section.meals.sub': 'Repas reconnus par le scanner IA, enrichis par la base alimentaire africaine.',
      'section.meals.add': '＋ Ajouter un repas',
      'section.meals.kcal': 'kcal',
      'section.meals.score': 'Qualité',
      'section.meals.protein': 'Prot.',
      'section.meals.carbs': 'Gluc.',
      'section.meals.fat': 'Lip.',
      'section.meals.local': 'ALIMENTS LOCAUX RECOMMANDÉS',
      'section.meals.localSub': 'Sélection issue de la base alimentaire pour {country} : privilégiez ces aliments dans le plan de la semaine.',

      /* ---- Recommandations ---- */
      'section.recs.title': 'Recommandations personnalisées',
      'section.recs.sub': 'Priorisées par impact estimé, avec source de référence et action associée.',
      'section.recs.priority.high': 'Priorité haute',
      'section.recs.priority.medium': 'Priorité moyenne',
      'section.recs.priority.low': 'Entretien',
      'section.recs.evidence': 'Référence',
      'section.recs.action': 'Appliquer',

      /* ---- Mesures ---- */
      'section.measure.title': 'Mes mesures & calculs cliniques',
      'section.measure.sub': 'Modifiez une valeur : les indicateurs dérivés se recalculent immédiatement, puis alimentent le score.',
      'section.measure.profile': 'Profil',
      'section.measure.profile.adultFemale': 'Femme adulte',
      'section.measure.profile.adultMale': 'Homme adulte',
      'section.measure.profile.child': 'Enfant / adolescent',
      'section.measure.age': 'Âge',
      'section.measure.weight': 'Poids (kg)',
      'section.measure.height': 'Taille (cm)',
      'section.measure.waist': 'Tour de taille (cm)',
      'section.measure.hip': 'Tour de hanches (cm)',
      'section.measure.glucose': 'Glycémie (mmol/L)',
      'section.measure.hba1c': 'HbA1c (%)',
      'section.measure.systolic': 'Tension systolique',
      'section.measure.diastolic': 'Tension diastolique',
      'section.measure.chol': 'Cholestérol total (mmol/L)',
      'section.measure.save': 'Enregistrer & recalculer',
      'section.measure.result.bmi': 'IMC',
      'section.measure.result.whtr': 'Tour de taille / taille',
      'section.measure.result.map': 'Pression artérielle moyenne',
      'section.measure.result.whr': 'Rapport taille / hanches (WHR)',
      'section.measure.status.good': 'Dans la référence',
      'section.measure.status.watch': 'À surveiller',
      'section.measure.status.high': 'Hors référence',
      'section.measure.status.unknown': 'Donnée manquante',
      'section.measure.reference': 'Références adultes indicatives',
      'section.measure.disclaimer': 'Ces calculs sont pédagogiques. Les références varient selon l’âge, le sexe, la grossesse et le contexte clinique ; un professionnel de santé valide toute interprétation.',

      /* ---- Famille ---- */
      'section.family.title': 'Espace famille & mineurs',
      'section.family.sub': 'Un parent ou tuteur autorisé suit la croissance et les indicateurs nutritionnels de l’enfant.',
      'section.family.badge': 'ACCÈS PARENT / TUTEUR',
      'section.family.member': 'Membre de la famille',
      'section.family.height': 'Taille',
      'section.family.weight': 'Poids',
      'section.family.bmi': 'IMC-âge',
      'section.family.percentile': 'Percentile',
      'section.family.growth': 'Croissance',
      'section.family.nutrition': 'Nutrition',
      'section.family.alerts': 'Alertes',
      'section.family.request': 'Confirmer l’accès parental',
      'section.family.plan': 'Voir le plan nutrition',
      'section.family.growthChart': 'Courbe IMC-âge · bande P15–P85',
      'chart.growth.band': 'Bande P15–P85',
      'chart.growth.child': 'Enfant',

      /* ---- Pied de page ---- */
      'foot.title': 'PROVENANCE & GOUVERNANCE',
      'foot.source': 'Sources : journal alimentaire, scanner IA, appareils synchronisés, mesures saisies et références OMS/FAO. Données de démonstration, non destinées à un usage clinique.',
      'foot.disclaimer': 'Confidentialité : consentement granulaire, minimisation des données, journal d’audit et validation humaine des signaux IA.',
      'foot.lastSync': 'Dernière synchronisation',
      'foot.btn.csv': 'CSV',
      'foot.btn.pdf': 'Bilan PDF',

      /* ---- Tooltips & toasts ---- */
      'tooltip.value': 'Valeur',
      'tooltip.ofTarget': 'de la cible',
      'toast.export': 'Export CSV généré · bilan nutritionnel prêt',
      'toast.refresh': 'Nouvelles mesures importées · indicateurs recalculés',
      'toast.saved': 'Mesures enregistrées · score et graphiques mis à jour',
      'toast.plan': 'Plan nutritionnel 7 jours ouvert (démonstration)',
      'toast.consult': 'Demande de téléconsultation préparée (démonstration)',
      'toast.familyAccess': 'Accès parental confirmé pour ce profil',
      'toast.familyPlan': 'Plan nutrition de l’enfant ouvert',
      'toast.mealAdded': 'Repas ajouté au journal (démonstration)',
      'toast.pdf': 'Bilan PDF prêt à être imprimé',
      'toast.print': 'Impression du tableau de bord'
    },

    en: {
      /* ---- Header ---- */
      'head.kicker': 'PERSONAL NUTRITION INTELLIGENCE',
      'head.title': 'Citizen 360 · Nutrition Dashboard',
      'head.sub': 'A clinical, dietary and preventive reading of your last 90 days: measurements, intake, micronutrients, habits and early signals in one workspace.',
      'head.updated': 'Data updated',
      'head.country': 'Country',
      'head.confidence': 'AI confidence',
      'badge.premium': 'PREMIUM EDITION',
      'badge.demo': 'DEMO DATASET',
      'badge.privacy': 'CONSENT & PRIVACY',
      'badge.live': 'LIVE STREAM',
      'period.label': 'Period',
      'period.7': '7 D',
      'period.30': '30 D',
      'period.90': '90 D',
      'lang.label': 'Module language',
      'lang.fr': 'FR',
      'lang.en': 'EN',
      'btn.export': 'Export',
      'btn.refresh': 'Refresh',
      'btn.print': 'Print',
      'btn.plan': 'Open my 7-day plan',
      'btn.consult': 'Consult a nutritionist',

      /* ---- Hero ---- */
      'hero.eyebrow': 'YOUR NUTRITION PROFILE',
      'hero.greeting': 'Hello, Ama 👋🏾',
      'hero.intro': 'Your nutritional balance is improving. Three levers remain priority to consolidate the last 30 days of results.',
      'hero.scoreLabel': 'Nutrition score',
      'hero.scoreUnit': '/ 100',
      'hero.improvement': '+6 pts this month',
      'hero.nextReview': 'Next review · 12 Nov 2026',
      'hero.target': 'Target 85',
      'hero.legend.diet': 'Diet quality',
      'hero.legend.metabolic': 'Metabolic balance',
      'hero.legend.adherence': 'Plan adherence',
      'signals.title': 'Today’s signals',
      'signals.sub': 'Detected by the prevention engine, with human validation.',

      /* ---- KPI ---- */
      'kpi.bmi': 'BMI',
      'kpi.glucose': 'Fasting glucose',
      'kpi.bp': 'Blood pressure',
      'kpi.diversity': 'Dietary diversity',
      'kpi.ref.bmi': 'Ref. 18.5–24.9',
      'kpi.ref.glucose': 'Ref. 3.9–5.5 mmol/L',
      'kpi.ref.bp': 'Ref. < 120/80',
      'kpi.ref.diversity': 'Target ≥ 80',
      'kpi.delta.vs': 'vs previous period',

      /* ---- Charts ---- */
      'chart.energy.title': 'Energy & meal balance',
      'chart.energy.sub': 'Daily intake by meal, compared with your personalised energy target.',
      'chart.energy.target': 'Target 2,100 kcal',
      'chart.energy.unit': 'kcal',
      'chart.energy.meals.breakfast': 'Breakfast',
      'chart.energy.meals.lunch': 'Lunch',
      'chart.energy.meals.dinner': 'Dinner',
      'chart.energy.meals.snack': 'Snack',
      'chart.energy.note': 'Stacked bars show meal distribution; the dashed line marks the target.',

      'chart.clinical.title': 'Crossed clinical trends',
      'chart.clinical.sub': 'Normalised indices (base 100 at period start) make different units comparable.',
      'chart.clinical.index': 'Base-100 index',
      'chart.clinical.latest': 'Latest value',
      'chart.clinical.toggle': 'Show / hide a series',
      'chart.clinical.series.weight': 'Weight',
      'chart.clinical.series.glucose': 'Glucose',
      'chart.clinical.series.systolic': 'Systolic BP',
      'chart.clinical.series.diversity': 'Diversity',
      'chart.clinical.note': 'An index below 100 means a decrease since the start of the period.',

      'chart.macro.title': 'Macronutrient split',
      'chart.macro.sub': 'Today’s intake and distance from the personalised target.',
      'chart.macro.total': 'Total intake',
      'chart.macro.kcal': 'kcal',
      'chart.macro.target': 'Target',
      'chart.macro.note': 'Fibre is not counted in total caloric intake.',
      'macro.carbs': 'Carbs',
      'macro.protein': 'Protein',
      'macro.fat': 'Fat',
      'macro.fiber': 'Fibre',

      'chart.micro.title': 'Micronutrient coverage',
      'chart.micro.sub': 'Percentage of the reference intake reached over the last 7 days.',
      'chart.micro.achieved': 'achieved',
      'chart.micro.target': 'Target 100%',
      'micro.iron': 'Iron',
      'micro.calcium': 'Calcium',
      'micro.vitA': 'Vitamin A',
      'micro.vitC': 'Vitamin C',
      'micro.folate': 'Folate',
      'micro.zinc': 'Zinc',
      'micro.fiber': 'Fibre',
      'micro.sodium': 'Sodium (max)',

      'chart.radar.title': 'Food group diversity',
      'chart.radar.sub': 'Weekly consumption profile compared with the balanced reference basket.',
      'chart.radar.actual': 'Your profile',
      'chart.radar.target': 'Target basket',
      'radar.cereals': 'Cereals',
      'radar.legumes': 'Legumes',
      'radar.vegetables': 'Vegetables',
      'radar.fruits': 'Fruit',
      'radar.protein': 'Protein',
      'radar.dairy': 'Dairy',

      'chart.hydration.title': 'Hydration & adherence',
      'chart.hydration.sub': 'Daily 2 L goal over 28 days, completed by the adherence score.',
      'chart.hydration.week': 'Week',
      'chart.hydration.low': 'Below goal',
      'chart.hydration.good': 'Goal met',
      'chart.hydration.avg': '28-day avg.',
      'chart.hydration.today': 'Today',

      'chart.risk.title': 'Prevention & risk signals',
      'chart.risk.sub': 'Indicative scores computed from measurements, the food journal and references.',
      'chart.risk.composite': 'Composite index',
      'chart.risk.low': 'Low',
      'chart.risk.moderate': 'Moderate',
      'chart.risk.high': 'Watch',
      'chart.risk.trend': '30-day trend',
      'chart.risk.disclaimer': 'Demonstration scores, not a diagnosis. Any health decision belongs to a professional.',
      'risk.glucose': 'Glycaemic risk',
      'risk.cardio': 'Cardiovascular risk',
      'risk.micro': 'Micronutrient gap',
      'risk.sodium': 'Sodium exposure',

      /* ---- Journal ---- */
      'section.meals.title': 'Today’s food journal',
      'section.meals.sub': 'Meals recognised by the AI scanner, enriched by the African food database.',
      'section.meals.add': '＋ Add a meal',
      'section.meals.kcal': 'kcal',
      'section.meals.score': 'Quality',
      'section.meals.protein': 'Protein',
      'section.meals.carbs': 'Carbs',
      'section.meals.fat': 'Fat',
      'section.meals.local': 'RECOMMENDED LOCAL FOODS',
      'section.meals.localSub': 'Selected from the food database for {country}: prioritise these foods in the weekly plan.',

      /* ---- Recommendations ---- */
      'section.recs.title': 'Personalised recommendations',
      'section.recs.sub': 'Ranked by estimated impact, with a reference source and an associated action.',
      'section.recs.priority.high': 'High priority',
      'section.recs.priority.medium': 'Medium priority',
      'section.recs.priority.low': 'Maintenance',
      'section.recs.evidence': 'Reference',
      'section.recs.action': 'Apply',

      /* ---- Measurements ---- */
      'section.measure.title': 'My measurements & clinical calculations',
      'section.measure.sub': 'Change any value: derived indicators recompute instantly and feed the score.',
      'section.measure.profile': 'Profile',
      'section.measure.profile.adultFemale': 'Adult female',
      'section.measure.profile.adultMale': 'Adult male',
      'section.measure.profile.child': 'Child / adolescent',
      'section.measure.age': 'Age',
      'section.measure.weight': 'Weight (kg)',
      'section.measure.height': 'Height (cm)',
      'section.measure.waist': 'Waist (cm)',
      'section.measure.hip': 'Hip (cm)',
      'section.measure.glucose': 'Glucose (mmol/L)',
      'section.measure.hba1c': 'HbA1c (%)',
      'section.measure.systolic': 'Systolic BP',
      'section.measure.diastolic': 'Diastolic BP',
      'section.measure.chol': 'Total cholesterol (mmol/L)',
      'section.measure.save': 'Save & recalculate',
      'section.measure.result.bmi': 'BMI',
      'section.measure.result.whtr': 'Waist-to-height ratio',
      'section.measure.result.map': 'Mean arterial pressure',
      'section.measure.result.whr': 'Waist / hip ratio',
      'section.measure.status.good': 'Within reference',
      'section.measure.status.watch': 'Watch',
      'section.measure.status.high': 'Outside reference',
      'section.measure.status.unknown': 'Missing data',
      'section.measure.reference': 'Indicative adult references',
      'section.measure.disclaimer': 'These calculations are educational. References vary by age, sex, pregnancy and clinical context; a health professional validates any interpretation.',

      /* ---- Family ---- */
      'section.family.title': 'Family & minors space',
      'section.family.sub': 'An authorised parent or guardian follows the child’s growth and nutrition indicators.',
      'section.family.badge': 'PARENT / GUARDIAN ACCESS',
      'section.family.member': 'Family member',
      'section.family.height': 'Height',
      'section.family.weight': 'Weight',
      'section.family.bmi': 'BMI-for-age',
      'section.family.percentile': 'Percentile',
      'section.family.growth': 'Growth',
      'section.family.nutrition': 'Nutrition',
      'section.family.alerts': 'Alerts',
      'section.family.request': 'Confirm parental access',
      'section.family.plan': 'View nutrition plan',
      'section.family.growthChart': 'BMI-for-age curve · P15–P85 band',
      'chart.growth.band': 'P15–P85 band',
      'chart.growth.child': 'Child',

      /* ---- Footer ---- */
      'foot.title': 'PROVENANCE & GOVERNANCE',
      'foot.source': 'Sources: food journal, AI scanner, synced devices, entered measurements and WHO/FAO references. Demonstration data, not for clinical use.',
      'foot.disclaimer': 'Privacy: granular consent, data minimisation, audit trail and human validation of AI signals.',
      'foot.lastSync': 'Last synchronisation',
      'foot.btn.csv': 'CSV',
      'foot.btn.pdf': 'PDF report',

      /* ---- Tooltips & toasts ---- */
      'tooltip.value': 'Value',
      'tooltip.ofTarget': 'of target',
      'toast.export': 'CSV export generated · nutrition report ready',
      'toast.refresh': 'New readings imported · indicators recomputed',
      'toast.saved': 'Measurements saved · score and charts updated',
      'toast.plan': '7-day nutrition plan opened (demo)',
      'toast.consult': 'Teleconsultation request prepared (demo)',
      'toast.familyAccess': 'Parental access confirmed for this profile',
      'toast.familyPlan': 'Child nutrition plan opened',
      'toast.mealAdded': 'Meal added to the journal (demo)',
      'toast.pdf': 'PDF report ready to print',
      'toast.print': 'Printing dashboard'
    }
  };

  var listeners = [];
  var API = {
    supported: ['fr', 'en'],
    lang: 'fr',
    override: null,
    settleUntil: 0,
    platformAtOverride: null,

    t: function (key, params) {
      var pack = STRINGS[this.lang] || STRINGS.en;
      var value = Object.prototype.hasOwnProperty.call(pack, key) ? pack[key] : STRINGS.en[key];
      if (value == null) value = key;
      if (params) {
        Object.keys(params).forEach(function (k) {
          value = String(value).split('{' + k + '}').join(String(params[k]));
        });
      }
      return value;
    },

    loc: function (obj) {
      if (obj == null) return '';
      if (typeof obj === 'string') return obj;
      return obj[this.lang] != null ? obj[this.lang] : (obj.en || obj.fr || '');
    },

    onChange: function (fn) {
      if (typeof fn === 'function' && listeners.indexOf(fn) === -1) listeners.push(fn);
    },

    emit: function (reason) {
      listeners.forEach(function (fn) {
        try { fn(API.lang, reason); } catch (e) { if (global.console) global.console.warn('[C360] i18n listener', e); }
      });
    }
  };

  function countryCode() {
    try {
      var sel = document.getElementById('country');
      if (sel && sel.value) return String(sel.value).toUpperCase();
    } catch (e) { /* ignore */ }
    return 'TG';
  }

  function readPlatformLocale() {
    var raw = '';
    try {
      if (global.NUTRI_I18N && global.NUTRI_I18N.locale) raw = global.NUTRI_I18N.locale;
      if (!raw) raw = global.localStorage.getItem(STORAGE_PLATFORM) || '';
      if (!raw) raw = document.documentElement.getAttribute('lang') || '';
      if (!raw) {
        var sel = document.getElementById('language');
        if (sel) raw = sel.value || '';
      }
    } catch (e) { raw = 'en'; }
    raw = String(raw || '').toLowerCase().split(/[-_]/)[0];
    if (raw.indexOf('fr') === 0) return 'fr';
    if (raw.indexOf('en') === 0) return 'en';
    if (raw.indexOf('es') === 0 || raw.indexOf('pt') === 0) return 'en';
    /* Langues locales : on conserve la langue officielle du pays. */
    return FR_COUNTRIES.indexOf(countryCode()) >= 0 ? 'fr' : 'en';
  }

  function readOverride() {
    try {
      var v = global.localStorage.getItem(STORAGE_OVERRIDE);
      return (v === 'fr' || v === 'en') ? v : null;
    } catch (e) { return null; }
  }

  API.apply = function (lang, silent) {
    lang = lang === 'en' ? 'en' : 'fr';
    var changed = API.lang !== lang;
    API.lang = lang;
    if (changed && !silent) API.emit('language');
    return changed;
  };

  API.follow = function (silent) {
    API.override = null;
    try { global.localStorage.removeItem(STORAGE_OVERRIDE); } catch (e) {}
    API.platformAtOverride = readPlatformLocale();
    return API.apply(API.platformAtOverride, silent);
  };

  API.setLang = function (lang) {
    lang = lang === 'en' ? 'en' : 'fr';
    API.override = lang;
    API.platformAtOverride = readPlatformLocale();
    try { global.localStorage.setItem(STORAGE_OVERRIDE, lang); } catch (e) {}
    return API.apply(lang, false);
  };

  API.syncFromPlatform = function () {
    if (!API.override) { API.follow(); return true; }
    if (API.settleUntil && Date.now() < API.settleUntil) return false;
    var platform = readPlatformLocale();
    if (platform === API.lang || platform === API.platformAtOverride) return false;
    API.follow();
    return true;
  };

  API.boot = function () {
    API.settleUntil = Date.now() + 4000;
    API.override = readOverride();
    API.platformAtOverride = readPlatformLocale();
    API.lang = API.override || API.platformAtOverride;
  };

  global.C360_I18N = API;
  global.C360_I18N.strings = STRINGS;
})(window);
