/* ============================================================================
 * NutriApp Santé · moh-nutriapp-data.js
 * Données réalistes hardcodées issues de l'application NutriApp.
 * 16 pays d'Afrique de l'Ouest + profils de districts, mois sur 24 mois, etc.
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = (global.MOHNutriApp = global.MOHNutriApp || {});

  /* 16 pays d'Afrique de l'Ouest — données NutriApp 2024 */
  MOH.COUNTRIES = [
    { code: 'NE', name: 'Niger',         adm: 48234, guer: 0.86, rupture: 23, dhis2: 0.61, score: 22, abandon: 0.11, deces: 0.03, depist: 0.41, stocks: 38, anemieF: 0.62, anemieE: 0.71, cpn: 0.38, diabete: 0.04, surpoids: 0.08 },
    { code: 'ML', name: 'Mali',          adm: 38920, guer: 0.82, rupture: 18, dhis2: 0.68, score: 35, abandon: 0.13, deces: 0.04, depist: 0.35, stocks: 42, anemieF: 0.58, anemieE: 0.68, cpn: 0.35, diabete: 0.03, surpoids: 0.09 },
    { code: 'BF', name: 'Burkina Faso',  adm: 29140, guer: 0.88, rupture: 12, dhis2: 0.74, score: 52, abandon: 0.09, deces: 0.025, depist: 0.46, stocks: 52, anemieF: 0.54, anemieE: 0.63, cpn: 0.42, diabete: 0.035, surpoids: 0.10 },
    { code: 'SN', name: 'Sénégal',       adm: 18730, guer: 0.91, rupture: 5,  dhis2: 0.88, score: 71, abandon: 0.06, deces: 0.018, depist: 0.52, stocks: 72, anemieF: 0.48, anemieE: 0.56, cpn: 0.58, diabete: 0.05, surpoids: 0.15 },
    { code: 'NG', name: 'Nigeria',       adm:124500, guer: 0.79, rupture: 67, dhis2: 0.58, score: 44, abandon: 0.16, deces: 0.05, depist: 0.33, stocks: 35, anemieF: 0.65, anemieE: 0.74, cpn: 0.30, diabete: 0.045, surpoids: 0.12 },
    { code: 'GH', name: 'Ghana',         adm: 11240, guer: 0.92, rupture: 3,  dhis2: 0.91, score: 74, abandon: 0.05, deces: 0.015, depist: 0.56, stocks: 78, anemieF: 0.45, anemieE: 0.52, cpn: 0.62, diabete: 0.06, surpoids: 0.18 },
    { code: 'CI', name: "Côte d'Ivoire", adm: 15400, guer: 0.89, rupture: 6,  dhis2: 0.85, score: 68, abandon: 0.08, deces: 0.022, depist: 0.49, stocks: 65, anemieF: 0.50, anemieE: 0.59, cpn: 0.54, diabete: 0.05, surpoids: 0.16 },
    { code: 'MR', name: 'Mauritanie',    adm:  9800, guer: 0.84, rupture: 9,  dhis2: 0.70, score: 47, abandon: 0.12, deces: 0.032, depist: 0.38, stocks: 45, anemieF: 0.57, anemieE: 0.65, cpn: 0.40, diabete: 0.04, surpoids: 0.13 },
    { code: 'GN', name: 'Guinée',        adm: 14200, guer: 0.85, rupture: 11, dhis2: 0.66, score: 48, abandon: 0.11, deces: 0.035, depist: 0.36, stocks: 41, anemieF: 0.60, anemieE: 0.69, cpn: 0.37, diabete: 0.038, surpoids: 0.10 },
    { code: 'SL', name: 'Sierra Leone',  adm:  8700, guer: 0.87, rupture: 7,  dhis2: 0.72, score: 50, abandon: 0.10, deces: 0.028, depist: 0.42, stocks: 48, anemieF: 0.55, anemieE: 0.64, cpn: 0.44, diabete: 0.035, surpoids: 0.11 },
    { code: 'LR', name: 'Liberia',       adm:  6200, guer: 0.84, rupture: 5,  dhis2: 0.69, score: 51, abandon: 0.11, deces: 0.03, depist: 0.39, stocks: 50, anemieF: 0.56, anemieE: 0.66, cpn: 0.43, diabete: 0.036, surpoids: 0.11 },
    { code: 'GW', name: 'Guinée-Bissau', adm:  4100, guer: 0.81, rupture: 6,  dhis2: 0.64, score: 46, abandon: 0.14, deces: 0.038, depist: 0.34, stocks: 39, anemieF: 0.61, anemieE: 0.70, cpn: 0.33, diabete: 0.032, surpoids: 0.09 },
    { code: 'GM', name: 'Gambie',        adm:  3800, guer: 0.89, rupture: 2,  dhis2: 0.79, score: 63, abandon: 0.07, deces: 0.02, depist: 0.47, stocks: 62, anemieF: 0.51, anemieE: 0.58, cpn: 0.51, diabete: 0.048, surpoids: 0.14 },
    { code: 'BJ', name: 'Bénin',         adm:  7900, guer: 0.90, rupture: 4,  dhis2: 0.81, score: 54, abandon: 0.07, deces: 0.021, depist: 0.48, stocks: 60, anemieF: 0.52, anemieE: 0.61, cpn: 0.49, diabete: 0.042, surpoids: 0.14 },
    { code: 'TG', name: 'Togo',          adm:  6500, guer: 0.88, rupture: 4,  dhis2: 0.83, score: 60, abandon: 0.08, deces: 0.023, depist: 0.45, stocks: 58, anemieF: 0.53, anemieE: 0.62, cpn: 0.47, diabete: 0.04, surpoids: 0.13 },
    { code: 'CV', name: 'Cap-Vert',      adm:   800, guer: 0.95, rupture: 0,  dhis2: 0.94, score: 85, abandon: 0.03, deces: 0.008, depist: 0.72, stocks: 95, anemieF: 0.32, anemieE: 0.38, cpn: 0.78, diabete: 0.07, surpoids: 0.24 }
  ];

  /* Agrégats régionaux (Afrique de l'Ouest) — valeurs globales issues des agrégations NutriApp */
  MOH.REGION = {
    name: 'Afrique de l\'Ouest',
    adm: 48234 /* valeur du KPI global mensuel — admissions agrégées du mois en cours */,
    guer: 0.863,
    rupture: 47, /* structures en rupture à l'échelle régionale (2.6% de 1842 points) */
    dhis2: 0.72,
    depist: 0.41,
    stocks: 54
  };
  MOH.REGION.totalStructures = 1842;

  /* 24 mois Jan 2023 -> Déc 2024 — Admissions CRENAS (forme en cloche avec pic de soudure Juin-Sept) */
  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  MOH.MONTHS_24 = [];
  (function () {
    // Saisonnalité : pic Juin-Sept (mois 5-8 en indice 0) correspondant à la soudure
    const seasonality2023 = [0.55,0.50,0.52,0.60,0.78,1.18,1.40,1.35,1.10,0.82,0.65,0.55]; // base 1 = moyenne
    const seasonality2024 = [0.58,0.52,0.55,0.65,0.85,1.28,1.55,1.48,1.18,0.85,0.68,0.58];
    const base2023 = 2800; // admissions mensuelles moyennes par pays en 2023
    const base2024 = 3200; // progression 2024
    for (let m = 0; m < 12; m++) {
      MOH.MONTHS_24.push({ label: MONTHS_FR[m] + ' 23', year: 2023, month: m, value: Math.round(base2023 * seasonality2023[m] * 16) });
    }
    for (let m = 0; m < 12; m++) {
      MOH.MONTHS_24.push({ label: MONTHS_FR[m] + ' 24', year: 2024, month: m, value: Math.round(base2024 * seasonality2024[m] * 16) });
    }
  })();

  /* Zones/Districts pour la vue pays (12 districts génériques par pays) */
  MOH.DISTRICTS = [
    'District Nord', 'District Sud', 'District Est', 'District Ouest',
    'District Central', 'District Fleuve', 'District Plateau', 'District Sahel',
    'District Littoral', 'District Montagne', 'District Rural I', 'District Rural II'
  ];

  /* Données de stocks ATPE par zone pour bullet chart (jours de consommation) */
  MOH.ATPE_STOCKS_ZONES = [
    { zone: 'Niamey',    jours: 72, cible: 60, etat: 'ok' },
    { zone: 'Maradi',    jours: 28, cible: 60, etat: 'critique' },
    { zone: 'Zinder',    jours: 55, cible: 60, etat: 'warn' },
    { zone: 'Tahoua',    jours: 38, cible: 60, etat: 'orange' },
    { zone: 'Tillabéri', jours: 62, cible: 60, etat: 'ok' },
    { zone: 'Dosso',     jours: 45, cible: 60, etat: 'warn' },
    { zone: 'Agadez',    jours: 22, cible: 60, etat: 'critique' },
    { zone: 'Diffa',     jours: 33, cible: 60, etat: 'orange' },
    { zone: 'Kollo',     jours: 58, cible: 60, etat: 'ok' },
    { zone: 'Konni',     jours: 41, cible: 60, etat: 'orange' },
    { zone: 'Say',       jours: 68, cible: 60, etat: 'ok' },
    { zone: 'Téra',      jours: 25, cible: 60, etat: 'critique' }
  ];

  /* 8 indicateurs de la heatmap matricielle de performance */
  MOH.HEATMAP_INDICATORS = [
    { key: 'guer',    label: 'Guérison %',  inv: false },
    { key: 'abandon', label: 'Abandon %',   inv: true },
    { key: 'deces',   label: 'Décès %',     inv: true },
    { key: 'depist',  label: 'Dépistage',   inv: false },
    { key: 'stocks',  label: 'Stocks j.',   inv: false },
    { key: 'dhis2',   label: 'Synchro %',   inv: false },
    { key: 'admVol',  label: 'Admissions',  inv: false },
    { key: 'score',   label: 'Score App',   inv: false }
  ];

  /* 3 années pour polar chart saisonnalité */
  MOH.POLAR_YEARS = [2022, 2023, 2024];

  /* Comorbidités (treemap) */
  MOH.COMORBIDITIES = [
    { label: 'Diarrhée',      value: 28, color: '#7C3AED' },
    { label: 'Paludisme',     value: 22, color: '#06B6D4' },
    { label: 'Pneumonie',     value: 18, color: '#10B981' },
    { label: 'Rougeole',      value: 12, color: '#F59E0B' },
    { label: 'MAS directe',   value: 11, color: '#EF4444' },
    { label: 'Autres',        value:  9, color: '#8B5CF6' }
  ];

  /* Canaux de dépistage (évolution 2018-2024) multi-ligne */
  MOH.CHANNELS = [
    { key: 'cpn',     label: 'CPN (prénatal)',     color: '#7C3AED', data: [12,15,19,24,30,36,41] },
    { key: 'ped',     label: 'Pédiatrie',          color: '#06B6D4', data: [28,30,32,34,36,38,39] },
    { key: 'pb',      label: 'PB/MUAC commu.',     color: '#10B981', data: [22,28,35,44,53,62,71] },
    { key: 'auto',    label: 'Auto-dépist. mère',  color: '#F59E0B', data: [ 3, 5, 8,12,17,23,29] }
  ];
  MOH.CHANNELS_YEARS = [2018,2019,2020,2021,2022,2023,2024];

  /* Funnel CPN */
  MOH.FUNNEL = [
    { label: 'Consultations CPN saisies', pct: 100, color: '#7C3AED' },
    { label: 'Dépistées malnutrition',    pct:  41, color: '#8B5CF6' },
    { label: 'Dépistage Positif',         pct:  17, color: '#06B6D4' },
    { label: 'Référées vers structure',   pct:  11, color: '#10B981' },
    { label: 'Prises en charge CRENAS',   pct:   9, color: '#F59E0B' }
  ];

  /* Small multiples : 6 métriques avec tendance */
  MOH.SMALL_MULTIPLES = [
    { key: 'adm',    label: 'Admissions MAS', color: '#7C3AED', trend: '+12%', up: true },
    { key: 'guer',   label: 'Guérison %',     color: '#10B981', trend: '+2.1 pts', up: true },
    { key: 'abandon',label: 'Abandon %',      color: '#EF4444', trend: '-1.4 pts', up: true },
    { key: 'deces',  label: 'Décès %',        color: '#64748B', trend: '-0.3 pts', up: true },
    { key: 'stock',  label: 'Stock ATPE j.',  color: '#06B6D4', trend: '-4 jours', up: false },
    { key: 'cpn',    label: 'Dépistage CPN',  color: '#F59E0B', trend: '+8 pts', up: true }
  ];

  /* Scorecard des zones (pour tableau G15) */
  MOH.ZONES_SCORECARD = [
    { zone: 'Niamey',    adm: 8420, guer: 0.92, rupture: 0,  sync: 0.94, score: 82, status: 'ok' },
    { zone: 'Maradi',    adm: 12560,guer: 0.81, rupture: 6,  sync: 0.55, score: 38, status: 'crit' },
    { zone: 'Zinder',    adm: 10230,guer: 0.87, rupture: 3,  sync: 0.68, score: 55, status: 'warn' },
    { zone: 'Tahoua',    adm: 7640, guer: 0.83, rupture: 4,  sync: 0.62, score: 45, status: 'warn' },
    { zone: 'Tillabéri', adm: 5890, guer: 0.88, rupture: 2,  sync: 0.71, score: 59, status: 'ok' },
    { zone: 'Dosso',     adm: 4520, guer: 0.86, rupture: 2,  sync: 0.65, score: 52, status: 'warn' },
    { zone: 'Agadez',    adm: 1840, guer: 0.79, rupture: 3,  sync: 0.48, score: 31, status: 'crit' },
    { zone: 'Diffa',     adm: 2310, guer: 0.80, rupture: 2,  sync: 0.51, score: 34, status: 'crit' },
    { zone: 'Kollo',     adm: 3680, guer: 0.90, rupture: 1,  sync: 0.80, score: 68, status: 'ok' },
    { zone: 'Konni',     adm: 4210, guer: 0.84, rupture: 1,  sync: 0.66, score: 50, status: 'warn' }
  ];

  /* Santé maternelle 2015 vs 2024 (Dumbbell G8) */
  MOH.DUMBBELL = [
    { label: 'Anémie femmes enceintes', v2015: 58, v2024: 62, worse: true },
    { label: 'Diabète gestationnel',    v2015:  3, v2024:  5, worse: true },
    { label: 'Surpoids femmes',         v2015: 12, v2024: 18, worse: true },
    { label: 'Malnutrition aiguë',      v2015: 18, v2024: 12, worse: false }
  ];

  /* Profils nutritionnels (Stacked 100% G14) — 10 zones */
  MOH.PROFILES = [
    { zone: 'Urbain A',  mas: 4, mam: 12, risque: 24, normal: 42, surpoids: 13, obesite: 5 },
    { zone: 'Urbain B',  mas: 5, mam: 14, risque: 26, normal: 38, surpoids: 12, obesite: 5 },
    { zone: 'Périurbain',mas: 8, mam: 18, risque: 28, normal: 32, surpoids: 10, obesite: 4 },
    { zone: 'Rural N',   mas: 14,mam: 24, risque: 30, normal: 24, surpoids: 6,  obesite: 2 },
    { zone: 'Rural S',   mas: 11,mam: 22, risque: 29, normal: 28, surpoids: 7,  obesite: 3 },
    { zone: 'Sahel',     mas: 18,mam: 28, risque: 28, normal: 20, surpoids: 5,  obesite: 1 },
    { zone: 'Fleuve',    mas: 9, mam: 19, risque: 27, normal: 33, surpoids: 9,  obesite: 3 },
    { zone: 'Littoral',  mas: 6, mam: 15, risque: 25, normal: 38, surpoids: 11, obesite: 5 }
  ];

  /* Heatmap synchro hebdomadaire 52 semaines x districts (valeurs 0.35-1.0) */
  MOH.SYNC_HEATMAP = (function () {
    const rng = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    const r = rng(42);
    const out = [];
    for (let w = 0; w < 52; w++) {
      const row = [];
      for (let d = 0; d < 12; d++) {
        // Meilleure synchronisation en saison sèche, pire en soudure (semaines ~24-38)
        const soudure = w >= 24 && w <= 38 ? 0.12 : 0;
        row.push(Math.max(0.35, Math.min(1.0, 0.82 - soudure + (r() - 0.5) * 0.28)));
      }
      out.push(row);
    }
    return out;
  })();

  /* Lollipop scores composites (par zone) */
  MOH.LOLLIPOP = MOH.ZONES_SCORECARD.map(z => ({ label: z.zone, score: z.score })).sort((a, b) => a.score - b.score);

  /* Couleurs charte graphique NutriApp */
  MOH.COLORS = {
    primary: '#7C3AED', secondary: '#06B6D4', tertiary: '#10B981',
    quaternary: '#F59E0B', danger: '#EF4444', purpleLight: '#A855F7',
    sidebar: '#1E0A3C', bg: '#FAF5FF', cardBorder: '#DDD6FE',
    grid: '#F1F5F9', axis: '#E2E8F0', label: '#94A3B8', value: '#334155',
    title: '#1E293B', body: '#64748B'
  };
})(window);
