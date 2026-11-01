/* ============================================================================
 * NUTRI.N°1 — AI Nutrition & Prevention Engine · localisation (FR / EN)
 * ----------------------------------------------------------------------------
 * The engine is a self-contained premium module mounted in the light DOM of
 * #ai. It owns its small dictionary so that ~250 product/UX strings do not
 * pollute locales/*.json (which is driven by the platform data-i18n layer).
 *
 * Public API
 *   AIP_I18N.t(key, params)      → translated string (falls back to EN, then key)
 *   AIP_I18N.loc(obj)            → {fr,en} object resolved for the active language
 *   AIP_I18N.lang                → 'fr' | 'en'
 *   AIP_I18N.setLang(lang)       → force the module language (persisted)
 *   AIP_I18N.follow(sync)        → re-follow the platform locale
 *   AIP_I18N.onChange(fn)        → register a render callback
 *
 * Language resolution
 *   The module follows the platform locale (NUTRI_I18N.locale / localStorage
 *   'nutri_language' / <html lang>) whenever the language is French. Every
 *   other platform locale (en, es, ewe, kab…) falls back to English because
 *   the module ships two fully reviewed languages.
 * ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_OVERRIDE = 'nutri_ai_prevention_lang';
  var STORAGE_PLATFORM = 'nutri_language';

  var STRINGS = {
    /* ======================================================================
     * FRANÇAIS
     * ==================================================================== */
    fr: {
      /* ---- En-tête ---------------------------------------------------- */
      'ai.lang.fr': 'Français',
      'ai.lang.en': 'English',
      'ai.kicker': 'Moteur IA premium · métabolisme',
      'ai.title': '🥗 Moteur IA de Nutrition & de Prévention',
      'ai.subtitle': 'Croisez vos capteurs, vos biomarqueurs et vos habitudes alimentaires pour projeter vos risques métaboliques et recevoir un programme correctif de 7 jours, construit sur des aliments locaux.',
      'ai.badge.deterministic': 'Algorithme déterministe',
      'ai.badge.vanilla': '100 % Vanilla JS',
      'ai.badge.privacy': 'Données traitées localement',
      'ai.preset.title': 'Profils de démonstration',
      'ai.preset.risk': 'Profil à risque',
      'ai.preset.balanced': 'Profil équilibré',
      'ai.reset': 'Réinitialiser',

      /* ---- Navigation ------------------------------------------------- */
      'ai.step1': 'Capteurs & données',
      'ai.step2': 'Moteur de simulation',
      'ai.step3': 'Risques & projection',
      'ai.step4': 'Programme 7 jours',
      'ai.nav.prev': 'Étape précédente',

      /* ---- Capteurs --------------------------------------------------- */
      'ai.sensors.title': 'Capteurs temps réel',
      'ai.sensors.sub': 'Mesures simulées importées depuis la montre, le glucomètre et le bracelet de sommeil.',
      'ai.sensors.sync': 'Synchroniser les capteurs',
      'ai.sensors.syncing': 'Synchronisation…',
      'ai.sensors.synced': 'Synchronisé',
      'ai.sensors.updated': 'Mis à jour il y a {s} s',
      'ai.sensors.never': 'Aucune synchronisation',
      'ai.sensors.glucose': 'Glycémie continue',
      'ai.sensors.hr': 'Fréquence cardiaque au repos',
      'ai.sensors.sleep': 'Qualité du sommeil',
      'ai.quality.optimal': 'Optimal',
      'ai.quality.watch': 'À surveiller',
      'ai.quality.high': 'Élevé',
      'ai.quality.low': 'Bas',

      /* ---- Données médicales ------------------------------------------ */
      'ai.medical.title': 'Données médicales',
      'ai.medical.sub': 'Renseignez les constantes cliniques disponibles lors de votre dernier bilan.',
      'ai.field.age': 'Âge',
      'ai.field.sex': 'Sexe',
      'ai.field.sex.female': 'Femme',
      'ai.field.sex.male': 'Homme',
      'ai.field.height': 'Taille',
      'ai.field.weight': 'Poids',
      'ai.field.bmi': 'IMC calculé',
      'ai.field.chol': 'Cholestérol total',
      'ai.field.systolic': 'Systolique',
      'ai.field.diastolic': 'Diastolique',
      'ai.bmi.under': 'Insuffisance pondérale',
      'ai.bmi.normal': 'Corpulence normale',
      'ai.bmi.over': 'Surpoids',
      'ai.bmi.obese': 'Obésité',
      'ai.bmi.hint': 'IMC = poids (kg) / taille² (m). Calculé automatiquement.',

      /* ---- Habitudes -------------------------------------------------- */
      'ai.habits.title': 'Habitudes alimentaires actuelles',
      'ai.habits.sub': 'Décrivez une semaine type : ces curseurs pèsent directement dans le calcul des risques.',
      'ai.habit.sugar': 'Sucres raffinés',
      'ai.habit.sugar.hint': 'Boissons sucrées, confiseries, pain blanc, jus industriels.',
      'ai.habit.satfat': 'Graisses saturées',
      'ai.habit.satfat.hint': 'Huile de palme non rouge, fritures, viandes grasses, beurre.',
      'ai.habit.fiber': 'Légumes, fruits & fibres',
      'ai.habit.fiber.hint': 'Portions de légumes, légumineuses et céréales complètes.',
      'ai.habit.water': 'Hydratation',
      'ai.habit.water.hint': 'Eau, infusions sans sucre, bouillies légères.',
      'ai.q.low': 'Faible',
      'ai.q.moderate': 'Modéré',
      'ai.q.high': 'Élevé',
      'ai.q.critical': 'Critique',
      'ai.q.good': 'Bon',
      'ai.q.insufficient': 'Insuffisant',
      'ai.q.excellent': 'Excellent',

      /* ---- Unités ----------------------------------------------------- */
      'ai.unit.mgdl': 'mg/dL',
      'ai.unit.bpm': 'bpm',
      'ai.unit.percent': '%',
      'ai.unit.gday': 'g/jour',
      'ai.unit.pct': '% des apports',
      'ai.unit.portion': 'portions/jour',
      'ai.unit.lday': 'L/jour',
      'ai.unit.kcal': 'kcal',
      'ai.unit.years': 'ans',
      'ai.unit.mmhg': 'mmHg',
      'ai.unit.cm': 'cm',
      'ai.unit.kg': 'kg',

      /* ---- Appels à l’action ------------------------------------------ */
      'ai.cta.analyse': 'Lancer l’analyse IA',
      'ai.cta.results': 'Voir mes prédictions',
      'ai.cta.plan': 'Générer mon programme nutritionnel',
      'ai.cta.newanalysis': 'Nouvelle analyse',

      /* ---- Scanner IA ------------------------------------------------- */
      'ai.scan.title': 'Moteur de simulation',
      'ai.scan.sub': 'Le moteur croise vos données de capteurs, vos constantes biologiques et vos habitudes pour estimer votre trajectoire métabolique.',
      'ai.scan.stage.biomarkers': 'Analyse des biomarqueurs',
      'ai.scan.stage.correlation': 'Corrélation habitudes × biologie',
      'ai.scan.stage.projection': 'Calcul des projections métaboliques',
      'ai.scan.stage.protocol': 'Génération du protocole nutritionnel',
      'ai.scan.log1': 'Lecture des capteurs et des biomarqueurs…',
      'ai.scan.log2': 'Corrélation glycémie × sucres raffinés × sommeil…',
      'ai.scan.log3': 'Modélisation du risque cardiométabolique…',
      'ai.scan.log4': 'Projection temporelle sur 0 à 20 ans…',
      'ai.scan.log5': 'Détection des facteurs de risque dominants…',
      'ai.scan.log6': 'Assemblage du protocole nutritionnel correctif…',
      'ai.scan.done': 'Analyse terminée · {n} signaux détectés',
      'ai.scan.signals': 'Signaux détectés',
      'ai.scan.waiting': 'En attente de vos données',

      /* ---- Résultats -------------------------------------------------- */
      'ai.results.title': 'Prédictions & risques métaboliques',
      'ai.results.sub': 'Probabilités estimées à partir de vos données actuelles. Chaque carte est interactive.',
      'ai.score.title': 'Score métabolique global',
      'ai.score.hint': '100 = trajectoire métabolique optimale · 0 = risque maximal.',
      'ai.score.metabolicAge': 'Âge métabolique',
      'ai.score.chronoAge': 'Âge chronologique',
      'ai.score.gap': '+{n} ans par rapport à votre âge réel',
      'ai.score.gapNone': 'Aligné sur votre âge réel',
      'ai.score.band.excellent': 'Trajectoire solide',
      'ai.score.band.good': 'À consolider',
      'ai.score.band.fragile': 'Fragile',
      'ai.score.band.alert': 'Sous surveillance',
      'ai.risk.drivers': 'Facteurs dominants',
      'ai.risk.projection': 'Déclaration possible',
      'ai.risk.projection.corrected': 'Avec le programme',
      'ai.risk.window': 'dans {a}–{b} ans',
      'ai.risk.beyond': 'au-delà de 20 ans',
      'ai.risk.none': 'non projetée',
      'ai.risk.diabetes': 'Diabète de type 2',
      'ai.risk.cardio': 'Maladies cardiovasculaires',
      'ai.risk.hepatic': 'Stéatose hépatique',
      'ai.risk.hypertension': 'Hypertension artérielle',
      'ai.level.low': 'Risque faible',
      'ai.level.moderate': 'Risque modéré',
      'ai.level.elevated': 'Risque élevé',
      'ai.level.high': 'Risque fort',
      'ai.level.critical': 'Risque critique',

      /* ---- Timeline --------------------------------------------------- */
      'ai.timeline.title': 'Timeline prédictive',
      'ai.timeline.sub': 'Quand chaque maladie pourrait apparaître si les habitudes actuelles se maintiennent. Cliquez sur un jalon pour explorer.',
      'ai.timeline.current': 'Habitudes actuelles',
      'ai.timeline.corrected': 'Programme corrigé',
      'ai.timeline.today': 'Aujourd’hui',
      'ai.timeline.years': '+{n} ans',
      'ai.timeline.select': 'Sélectionnez un jalon',
      'ai.timeline.detail.window': 'Fenêtre d’apparition',
      'ai.timeline.detail.prob': 'Probabilité',
      'ai.timeline.detail.drivers': 'Facteurs à corriger',
      'ai.timeline.detail.actions': 'Actions prioritaires',
      'ai.timeline.legend.current': 'Sans changement',
      'ai.timeline.legend.corrected': 'Avec le programme',
      'ai.disclaimer': 'Simulation à visée de prévention et de démonstration. Elle ne remplace ni un diagnostic ni un avis médical : seule une consultation permet de confirmer un risque.',

      /* ---- Facteurs de risque ---------------------------------------- */
      'ai.driver.glucose': 'Glycémie à jeun élevée',
      'ai.driver.bmi': 'Indice de masse corporelle élevé',
      'ai.driver.sugar': 'Sucres raffinés excessifs',
      'ai.driver.fiber': 'Fibres et légumes insuffisants',
      'ai.driver.sleep': 'Sommeil dégradé',
      'ai.driver.age': 'Âge et ancienneté du risque',
      'ai.driver.chol': 'Cholestérol total élevé',
      'ai.driver.satfat': 'Graisses saturées excessives',
      'ai.driver.sbp': 'Tension systolique élevée',
      'ai.driver.dbp': 'Tension diastolique élevée',
      'ai.driver.hydration': 'Hydratation insuffisante',

      /* ---- Recommandations par facteur -------------------------------- */
      'ai.advice.glucose': 'Réduire la charge glycémique des trois repas et marcher 15 minutes après le dîner.',
      'ai.advice.bmi': 'Viser −5 % de poids en 12 semaines avec un déficit de 350 kcal par jour.',
      'ai.advice.sugar': 'Ramener les sucres libres sous 25 g par jour et supprimer les boissons sucrées.',
      'ai.advice.fiber': 'Atteindre 30 g de fibres par jour : légumineuses, fonio, légumes-feuilles.',
      'ai.advice.sleep': 'Régulariser 7–8 h de sommeil ; le manque de sommeil aggrave l’insulino-résistance.',
      'ai.advice.chol': 'Remplacer les graisses saturées par des huiles non raffinées et des oméga-3 marins.',
      'ai.advice.satfat': 'Limiter les fritures à deux fois par semaine et préférer l’huile de palme rouge.',
      'ai.advice.sbp': 'Réduire le sel sous 5 g par jour et augmenter les aliments riches en potassium.',
      'ai.advice.dbp': 'Contrôler la tension matin et soir ; consulter si elle dépasse 90 mmHg au repos.',
      'ai.advice.hydration': 'Boire 2,5 L d’eau par jour, répartis entre les repas.',

      /* ---- Programme 7 jours ------------------------------------------ */
      'ai.plan.title': 'Programme nutritionnel correctif',
      'ai.plan.sub': 'Sept jours construits sur les risques détectés, les aliments locaux et une charge glycémique maîtrisée.',
      'ai.plan.kcalTarget': 'Cible énergétique quotidienne',
      'ai.plan.protein': 'Protéines',
      'ai.plan.fiber': 'Fibres',
      'ai.plan.gl': 'Charge glycémique',
      'ai.plan.impact': 'Impact estimé',
      'ai.plan.week': 'Charge glycémique de la semaine',
      'ai.plan.protocol': 'Cibles correctives',
      'ai.plan.protocol.sub': 'Trajectoire à tenir pendant les 12 prochaines semaines.',
      'ai.plan.print': 'Imprimer le programme',
      'ai.plan.regenerate': 'Régénérer',
      'ai.plan.footnote': 'Programme généré par le moteur déterministe NUTRI.N°1 à partir de vos données. À valider avec un nutritionniste.',
      'ai.plan.slot.breakfast': 'Petit-déjeuner',
      'ai.plan.slot.lunch': 'Déjeuner',
      'ai.plan.slot.snack': 'Collation',
      'ai.plan.slot.dinner': 'Dîner',
      'ai.plan.balance': 'Équilibre du jour',
      'ai.day.mon': 'Lundi',
      'ai.day.tue': 'Mardi',
      'ai.day.wed': 'Mercredi',
      'ai.day.thu': 'Jeudi',
      'ai.day.fri': 'Vendredi',
      'ai.day.sat': 'Samedi',
      'ai.day.sun': 'Dimanche',
      'ai.day.mon.short': 'Lun',
      'ai.day.tue.short': 'Mar',
      'ai.day.wed.short': 'Mer',
      'ai.day.thu.short': 'Jeu',
      'ai.day.fri.short': 'Ven',
      'ai.day.sat.short': 'Sam',
      'ai.day.sun.short': 'Dim',

      /* ---- Étiquettes nutritionnelles -------------------------------- */
      'ai.tag.lowgi': 'Index glycémique bas',
      'ai.tag.fiber': 'Riche en fibres',
      'ai.tag.omega3': 'Oméga-3 marins',
      'ai.tag.potassium': 'Riche en potassium',
      'ai.tag.probiotic': 'Ferments protecteurs',
      'ai.tag.protein': 'Protéines maigres',
      'ai.tag.plantprotein': 'Protéines végétales',
      'ai.tag.iron': 'Riche en fer',
      'ai.tag.vita': 'Riche en vitamine A',
      'ai.impact.glucose': '−{n} % de pic glycémique',
      'ai.impact.fiber': '{n} g de fibres protectrices',
      'ai.impact.omega3': 'Oméga-3 pour le cœur',
      'ai.impact.liver': '−{n} % de charge hépatique',
      'ai.impact.sodium': 'Pauvre en sodium',
      'ai.impact.protein': '{n} g de protéines rassasiantes',

      /* ---- Notifications --------------------------------------------- */
      'ai.toast.synced': 'Capteurs synchronisés',
      'ai.toast.analysed': 'Analyse terminée',
      'ai.toast.plan': 'Programme de 7 jours généré',
      'ai.toast.reset': 'Données réinitialisées',
      'ai.toast.preset': 'Profil de démonstration chargé',
      'ai.toast.print': 'Ouverture de l’impression'
    },

    /* ======================================================================
     * ENGLISH
     * ==================================================================== */
    en: {
      'ai.lang.fr': 'Français',
      'ai.lang.en': 'English',
      'ai.kicker': 'Premium AI engine · metabolism',
      'ai.title': '🥗 AI Nutrition & Prevention Engine',
      'ai.subtitle': 'Cross your sensors, biomarkers and eating habits to project your metabolic risks and receive a 7-day corrective programme built on local foods.',
      'ai.badge.deterministic': 'Deterministic algorithm',
      'ai.badge.vanilla': '100% vanilla JS',
      'ai.badge.privacy': 'Processed locally',
      'ai.preset.title': 'Demo profiles',
      'ai.preset.risk': 'At-risk profile',
      'ai.preset.balanced': 'Balanced profile',
      'ai.reset': 'Reset',

      'ai.step1': 'Sensors & data',
      'ai.step2': 'Simulation engine',
      'ai.step3': 'Risk & forecast',
      'ai.step4': '7-day programme',
      'ai.nav.prev': 'Previous step',

      'ai.sensors.title': 'Real-time sensors',
      'ai.sensors.sub': 'Simulated readings imported from the watch, the glucose meter and the sleep band.',
      'ai.sensors.sync': 'Sync sensors',
      'ai.sensors.syncing': 'Syncing…',
      'ai.sensors.synced': 'Synced',
      'ai.sensors.updated': 'Updated {s}s ago',
      'ai.sensors.never': 'No synchronization yet',
      'ai.sensors.glucose': 'Continuous glucose',
      'ai.sensors.hr': 'Resting heart rate',
      'ai.sensors.sleep': 'Sleep quality',
      'ai.quality.optimal': 'Optimal',
      'ai.quality.watch': 'Watch',
      'ai.quality.high': 'High',
      'ai.quality.low': 'Low',

      'ai.medical.title': 'Medical data',
      'ai.medical.sub': 'Enter the clinical values available from your latest check-up.',
      'ai.field.age': 'Age',
      'ai.field.sex': 'Sex',
      'ai.field.sex.female': 'Female',
      'ai.field.sex.male': 'Male',
      'ai.field.height': 'Height',
      'ai.field.weight': 'Weight',
      'ai.field.bmi': 'Computed BMI',
      'ai.field.chol': 'Total cholesterol',
      'ai.field.systolic': 'Systolic',
      'ai.field.diastolic': 'Diastolic',
      'ai.bmi.under': 'Underweight',
      'ai.bmi.normal': 'Healthy weight',
      'ai.bmi.over': 'Overweight',
      'ai.bmi.obese': 'Obesity',
      'ai.bmi.hint': 'BMI = weight (kg) / height² (m). Computed automatically.',

      'ai.habits.title': 'Current eating habits',
      'ai.habits.sub': 'Describe a typical week: these sliders feed directly into the risk calculation.',
      'ai.habit.sugar': 'Refined sugars',
      'ai.habit.sugar.hint': 'Sweet drinks, sweets, white bread, industrial juices.',
      'ai.habit.satfat': 'Saturated fats',
      'ai.habit.satfat.hint': 'Non-red palm oil, deep-fried food, fatty meats, butter.',
      'ai.habit.fiber': 'Vegetables, fruit & fibre',
      'ai.habit.fiber.hint': 'Servings of vegetables, pulses and wholegrains.',
      'ai.habit.water': 'Hydration',
      'ai.habit.water.hint': 'Water, unsweetened infusions, light porridges.',
      'ai.q.low': 'Low',
      'ai.q.moderate': 'Moderate',
      'ai.q.high': 'High',
      'ai.q.critical': 'Critical',
      'ai.q.good': 'Good',
      'ai.q.insufficient': 'Insufficient',
      'ai.q.excellent': 'Excellent',

      'ai.unit.mgdl': 'mg/dL',
      'ai.unit.bpm': 'bpm',
      'ai.unit.percent': '%',
      'ai.unit.gday': 'g/day',
      'ai.unit.pct': '% of intake',
      'ai.unit.portion': 'servings/day',
      'ai.unit.lday': 'L/day',
      'ai.unit.kcal': 'kcal',
      'ai.unit.years': 'years',
      'ai.unit.mmhg': 'mmHg',
      'ai.unit.cm': 'cm',
      'ai.unit.kg': 'kg',

      'ai.cta.analyse': 'Run AI analysis',
      'ai.cta.results': 'See my predictions',
      'ai.cta.plan': 'Generate my nutrition programme',
      'ai.cta.newanalysis': 'New analysis',

      'ai.scan.title': 'Simulation engine',
      'ai.scan.sub': 'The engine crosses your sensor data, biomarkers and habits to estimate your metabolic trajectory.',
      'ai.scan.stage.biomarkers': 'Analysing biomarkers',
      'ai.scan.stage.correlation': 'Correlating habits × biology',
      'ai.scan.stage.projection': 'Computing metabolic projections',
      'ai.scan.stage.protocol': 'Generating the nutrition protocol',
      'ai.scan.log1': 'Reading sensors and biomarkers…',
      'ai.scan.log2': 'Correlating glucose × refined sugars × sleep…',
      'ai.scan.log3': 'Modelling cardiometabolic risk…',
      'ai.scan.log4': 'Projecting 0 to 20 years ahead…',
      'ai.scan.log5': 'Detecting dominant risk drivers…',
      'ai.scan.log6': 'Assembling the corrective nutrition protocol…',
      'ai.scan.done': 'Analysis complete · {n} signals detected',
      'ai.scan.signals': 'Detected signals',
      'ai.scan.waiting': 'Waiting for your data',

      'ai.results.title': 'Metabolic risks & predictions',
      'ai.results.sub': 'Probabilities estimated from your current data. Every card is interactive.',
      'ai.score.title': 'Global metabolic score',
      'ai.score.hint': '100 = optimal metabolic trajectory · 0 = maximum risk.',
      'ai.score.metabolicAge': 'Metabolic age',
      'ai.score.chronoAge': 'Chronological age',
      'ai.score.gap': '+{n} years above your real age',
      'ai.score.gapNone': 'Aligned with your real age',
      'ai.score.band.excellent': 'Solid trajectory',
      'ai.score.band.good': 'To consolidate',
      'ai.score.band.fragile': 'Fragile',
      'ai.score.band.alert': 'Under watch',
      'ai.risk.drivers': 'Dominant drivers',
      'ai.risk.projection': 'Possible onset',
      'ai.risk.projection.corrected': 'With the programme',
      'ai.risk.window': 'in {a}–{b} years',
      'ai.risk.beyond': 'beyond 20 years',
      'ai.risk.none': 'not projected',
      'ai.risk.diabetes': 'Type 2 diabetes',
      'ai.risk.cardio': 'Cardiovascular disease',
      'ai.risk.hepatic': 'Fatty liver disease',
      'ai.risk.hypertension': 'Hypertension',
      'ai.level.low': 'Low risk',
      'ai.level.moderate': 'Moderate risk',
      'ai.level.elevated': 'Elevated risk',
      'ai.level.high': 'High risk',
      'ai.level.critical': 'Critical risk',

      'ai.timeline.title': 'Predictive timeline',
      'ai.timeline.sub': 'When each condition could appear if current habits continue. Click a milestone to explore it.',
      'ai.timeline.current': 'Current habits',
      'ai.timeline.corrected': 'Corrected programme',
      'ai.timeline.today': 'Today',
      'ai.timeline.years': '+{n} years',
      'ai.timeline.select': 'Select a milestone',
      'ai.timeline.detail.window': 'Onset window',
      'ai.timeline.detail.prob': 'Probability',
      'ai.timeline.detail.drivers': 'Drivers to correct',
      'ai.timeline.detail.actions': 'Priority actions',
      'ai.timeline.legend.current': 'No change',
      'ai.timeline.legend.corrected': 'With the programme',
      'ai.disclaimer': 'Prevention simulation built for demonstration purposes. It does not replace a diagnosis or medical advice: only a consultation can confirm a risk.',

      'ai.driver.glucose': 'Elevated fasting glucose',
      'ai.driver.bmi': 'Elevated body mass index',
      'ai.driver.sugar': 'Excess refined sugars',
      'ai.driver.fiber': 'Insufficient fibre and vegetables',
      'ai.driver.sleep': 'Degraded sleep',
      'ai.driver.age': 'Age and risk duration',
      'ai.driver.chol': 'Elevated total cholesterol',
      'ai.driver.satfat': 'Excess saturated fats',
      'ai.driver.sbp': 'Elevated systolic pressure',
      'ai.driver.dbp': 'Elevated diastolic pressure',
      'ai.driver.hydration': 'Insufficient hydration',

      'ai.advice.glucose': 'Lower the glycemic load of all three meals and walk 15 minutes after dinner.',
      'ai.advice.bmi': 'Target −5% body weight in 12 weeks with a 350 kcal daily deficit.',
      'ai.advice.sugar': 'Bring free sugars under 25 g per day and drop sweet drinks.',
      'ai.advice.fiber': 'Reach 30 g of fibre per day: pulses, fonio, leafy vegetables.',
      'ai.advice.sleep': 'Stabilise 7–8 h of sleep; sleep debt worsens insulin resistance.',
      'ai.advice.chol': 'Swap saturated fats for unrefined oils and marine omega-3.',
      'ai.advice.satfat': 'Limit fried food to twice a week and prefer red palm oil.',
      'ai.advice.sbp': 'Cut salt below 5 g per day and increase potassium-rich foods.',
      'ai.advice.dbp': 'Check blood pressure morning and evening; consult above 90 mmHg at rest.',
      'ai.advice.hydration': 'Drink 2.5 L of water per day, spread between meals.',

      'ai.plan.title': 'Corrective nutrition programme',
      'ai.plan.sub': 'Seven days built on the detected risks, local foods and a controlled glycemic load.',
      'ai.plan.kcalTarget': 'Daily energy target',
      'ai.plan.protein': 'Protein',
      'ai.plan.fiber': 'Fibre',
      'ai.plan.gl': 'Glycemic load',
      'ai.plan.impact': 'Estimated impact',
      'ai.plan.week': 'Weekly glycemic load',
      'ai.plan.protocol': 'Corrective targets',
      'ai.plan.protocol.sub': 'Trajectory to hold over the next 12 weeks.',
      'ai.plan.print': 'Print the programme',
      'ai.plan.regenerate': 'Regenerate',
      'ai.plan.footnote': 'Programme generated by the deterministic NUTRI.N°1 engine from your data. To be validated with a nutritionist.',
      'ai.plan.slot.breakfast': 'Breakfast',
      'ai.plan.slot.lunch': 'Lunch',
      'ai.plan.slot.snack': 'Snack',
      'ai.plan.slot.dinner': 'Dinner',
      'ai.plan.balance': 'Daily balance',
      'ai.day.mon': 'Monday',
      'ai.day.tue': 'Tuesday',
      'ai.day.wed': 'Wednesday',
      'ai.day.thu': 'Thursday',
      'ai.day.fri': 'Friday',
      'ai.day.sat': 'Saturday',
      'ai.day.sun': 'Sunday',
      'ai.day.mon.short': 'Mon',
      'ai.day.tue.short': 'Tue',
      'ai.day.wed.short': 'Wed',
      'ai.day.thu.short': 'Thu',
      'ai.day.fri.short': 'Fri',
      'ai.day.sat.short': 'Sat',
      'ai.day.sun.short': 'Sun',

      'ai.tag.lowgi': 'Low glycemic index',
      'ai.tag.fiber': 'High fibre',
      'ai.tag.omega3': 'Marine omega-3',
      'ai.tag.potassium': 'Potassium-rich',
      'ai.tag.probiotic': 'Protective ferments',
      'ai.tag.protein': 'Lean protein',
      'ai.tag.plantprotein': 'Plant protein',
      'ai.tag.iron': 'Iron-rich',
      'ai.tag.vita': 'Vitamin A rich',
      'ai.impact.glucose': '−{n}% glycemic spike',
      'ai.impact.fiber': '{n} g of protective fibre',
      'ai.impact.omega3': 'Omega-3 for the heart',
      'ai.impact.liver': '−{n}% liver load',
      'ai.impact.sodium': 'Low in sodium',
      'ai.impact.protein': '{n} g of satiating protein',

      'ai.toast.synced': 'Sensors synchronized',
      'ai.toast.analysed': 'Analysis complete',
      'ai.toast.plan': '7-day programme generated',
      'ai.toast.reset': 'Data reset',
      'ai.toast.preset': 'Demo profile loaded',
      'ai.toast.print': 'Opening the print dialog'
    }
  };

  /* ------------------------------------------------------------------ */
  /* Locale helpers                                                      */
  /* ------------------------------------------------------------------ */
  function readPlatformLocale() {
    var raw = '';
    try {
      if (global.NUTRI_I18N && global.NUTRI_I18N.locale) raw = global.NUTRI_I18N.locale;
      else raw = global.localStorage.getItem(STORAGE_PLATFORM) || '';
    } catch (e) { raw = ''; }
    raw = String(raw || '').toLowerCase();
    if (!raw) {
      raw = String((global.document && global.document.documentElement &&
        global.document.documentElement.getAttribute('lang')) || '').toLowerCase();
    }
    return raw.indexOf('fr') === 0 ? 'fr' : 'en';
  }

  function readOverride() {
    try {
      var v = global.localStorage.getItem(STORAGE_OVERRIDE);
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

    /* Resolve an inline {fr,en} pair (dish names, ingredient lists…). */
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
        try { fn(API.lang, reason); } catch (e) { /* a module render error must not break the page */ }
      });
    },

    /* Follow the platform locale (default behaviour). */
    follow: function (silent) {
      API.override = null;
      try { global.localStorage.removeItem(STORAGE_OVERRIDE); } catch (e) {}
      API.apply(readPlatformLocale(), silent);
    },

    /* Explicit module language chosen by the FR / EN switch of the header. */
    setLang: function (lang) {
      lang = String(lang || '').toLowerCase() === 'fr' ? 'fr' : 'en';
      API.override = lang;
      /* Locale de la plateforme au moment du choix : un simple re-rendu de la
         plateforme (elle redispatch son événement plusieurs fois au démarrage)
         ne doit pas écraser le choix explicite de l’utilisateur. */
      API.platformAtOverride = readPlatformLocale();
      try { global.localStorage.setItem(STORAGE_OVERRIDE, lang); } catch (e) {}
      API.apply(lang, false);
    },

    /* À appeler après avoir aligné la plateforme sur notre choix : la valeur
       de référence devient alors la nouvelle langue, si bien qu’un vrai
       changement côté plateforme sera de nouveau suivi. */
    markPlatformAligned: function (lang) {
      API.platformAtOverride = String(lang || API.lang).toLowerCase() === 'fr' ? 'fr' : 'en';
    },

    /* Suit la plateforme uniquement si sa langue a réellement changé.
       Deux garde-fous, dans cet ordre :
         1. une fenêtre d’installation de 4 s après le montage, pendant laquelle la
            plateforme termine son initialisation (pays → langue) et réaffirme une
            locale qui n’existait pas encore quand l’utilisateur a cliqué ;
         2. ensuite, une comparaison de VALEURS : si la plateforme affiche déjà
            notre langue, ou redispatch la locale connue au moment du choix, on ne
            touche à rien. Un vrai changement est donc suivi, même rapide. */
    syncFromPlatform: function () {
      if (!API.override) { API.follow(); return true; }
      /* Fenêtre d’installation (4 s après le montage) : la plateforme initialise sa
         langue APRÈS nous (pays → langue, dictionnaires, re-apply à 180 ms) et
         réaffirme une locale qui n’était pas encore connue au moment du clic.
         Un choix explicite de l’utilisateur ne doit pas être annulé par cette
         installation tardive ; passé ce délai, tout changement réel est suivi. */
      if (API.settleUntil && Date.now() < API.settleUntil) return false;
      var platform = readPlatformLocale();
      /* La plateforme affiche déjà la langue choisie, ou redispatch la même
         information : le choix explicite de l’utilisateur prime. */
      if (platform === API.lang || platform === API.platformAtOverride) return false;
      API.follow();
      return true;
    },

    apply: function (lang, silent) {
      var changed = API.lang !== lang;
      API.lang = lang;
      /* Attribut distinct de `data-aip-lang` (porté par les boutons FR/EN) :
         sinon `closest('[data-aip-lang]')` capterait tous les clics. */
      try { global.document.documentElement.setAttribute('data-aip-locale', lang); } catch (e) {}
      if (changed && !silent) API.emit('language');
      return changed;
    },

    /* Boot: honour an explicit module choice, otherwise follow the platform. */
    boot: function () {
      API.settleUntil = Date.now() + 4000;
      var override = readOverride();
      API.override = override;
      API.platformAtOverride = readPlatformLocale();
      API.lang = override || API.platformAtOverride;
    }
  };

  global.AIP_I18N = API;
  global.AIP_I18N.strings = STRINGS;
})(window);
