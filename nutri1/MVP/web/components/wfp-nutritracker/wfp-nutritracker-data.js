/* ============================================================================
 * WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest
 * Fichier : wfp-nutritracker-data.js
 * Rôle    : Données JSON hardcodées réalistes (16 pays d'Afrique de l'Ouest).
 *
 * Source simulée : Application Mobile Terrain PAM/WFP
 *   → Relais Communautaires (dépistage MUAC, visites ménages)
 *   → Enquêtes mVAM (FCS, CSI, HDDS déclarés par les ménages)
 *   → Points de Distribution (scan bénéficiaires, ravitaillement)
 *   → Relevés de prix marchés par les agents terrain
 *
 * Convention : toutes les valeurs sont des ancres ANNUELLES 2024 ; les séries
 * mensuelles / trimestrielles sont reconstruites de façon DÉTERMINISTE dans
 * wfp-nutritracker-model.js (profils saisonniers + bruit sinusoïdal, jamais de
 * Math.random → le rendu est identique à chaque rafraîchissement).
 *
 * Champs pays :
 *  fcs / fcsPrev      Food Consumption Score 2024 / 2020 (mVAM)
 *  csi                Coping Strategy Index (rCSI, 0-90)
 *  ipc                Phase IPC dominante (1 Minimale → 5 Famine)
 *  pop                population totale (millions)
 *  insecure           personnes en insécurité alimentaire (millions)
 *  beneficiaries      bénéficiaires assistés enregistrés dans l'app (M)
 *  hhMonth            ménages enquêtés ce mois (milliers)
 *  collectors         relais communautaires équipés de l'app
 *  markets            marchés suivis par les relevés de prix App
 *  priceIndex         index prix céréales (100 = normale saisonnière)
 *  muac               malnutrition aigüe dépistée au ruban MUAC (%)
 *  kcal               disponibilité énergétique (kcal/personne/jour)
 *  access             % ménages capables d'acheter le panier alimentaire
 *  hdds               Household Dietary Diversity Score moyen (0-12)
 *  districts          noms des districts/provinces suivis (mode Pays)
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = (global.WFPTracker = global.WFPTracker || {});

  /* ---------------------------------------------------------------------
   * 16 PAYS D'AFRIQUE DE L'OUEST — valeurs de référence 2024
   * ------------------------------------------------------------------- */
  const countries = [
    {
      code: 'NE', name: 'Niger', flag: '🇳🇪', zone: 'sahel',
      fcs: 28.3, fcsPrev: 30.1, csi: 38, ipc: 4, pop: 27.2, insecure: 5.8, beneficiaries: 2.2,
      hhMonth: 27.6, collectors: 4280, markets: 96, priceIndex: 145.8, muac: 14.8,
      kcal: 2085, access: 38, hdds: 5.4, stockDays: 46,
      districts: ['Maradi', 'Zinder', 'Diffa', 'Tillabéri', 'Tahoua', 'Dosso', 'Agadez', 'Niamey']
    },
    {
      code: 'ML', name: 'Mali', flag: '🇲🇱', zone: 'sahel',
      fcs: 34.1, fcsPrev: 35.8, csi: 31, ipc: 3, pop: 23.3, insecure: 6.1, beneficiaries: 1.4,
      hhMonth: 25.8, collectors: 3960, markets: 118, priceIndex: 141.6, muac: 12.6,
      kcal: 2210, access: 44, hdds: 6.1, stockDays: 58,
      districts: ['Mopti', 'Ségou', 'Tombouctou', 'Gao', 'Kayes', 'Sikasso', 'Koulikoro', 'Ménaka']
    },
    {
      code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', zone: 'sahel',
      fcs: 36.2, fcsPrev: 37.9, csi: 28, ipc: 3, pop: 23.3, insecure: 3.0, beneficiaries: 1.0,
      hhMonth: 24.4, collectors: 3420, markets: 84, priceIndex: 137.2, muac: 11.4,
      kcal: 2260, access: 47, hdds: 6.4, stockDays: 61,
      districts: ['Sahel', 'Centre-Nord', 'Est', 'Boucle du Mouhoun', 'Nord', 'Centre-Est', 'Hauts-Bassins', 'Sud-Ouest']
    },
    {
      code: 'MR', name: 'Mauritanie', flag: '🇲🇷', zone: 'sahel',
      fcs: 32.6, fcsPrev: 34.2, csi: 33, ipc: 3, pop: 4.9, insecure: 0.9, beneficiaries: 0.42,
      hhMonth: 9.6, collectors: 1180, markets: 46, priceIndex: 136.9, muac: 12.1,
      kcal: 2140, access: 41, hdds: 5.9, stockDays: 52,
      districts: ['Hodh Ech Chargui', 'Hodh El Gharbi', 'Assaba', 'Gorgol', 'Brakna', 'Trarza', 'Guidimaka', 'Nouakchott']
    },
    {
      code: 'NG', name: 'Nigeria', flag: '🇳🇬', zone: 'mixed',
      fcs: 39.4, fcsPrev: 40.8, csi: 24, ipc: 3, pop: 227.0, insecure: 18.4, beneficiaries: 4.2,
      hhMonth: 72.4, collectors: 9640, markets: 420, priceIndex: 135.2, muac: 9.8,
      kcal: 2280, access: 46, hdds: 6.9, stockDays: 74,
      districts: ['Borno', 'Yobe', 'Adamawa', 'Sokoto', 'Katsina', 'Kebbi', 'Zamfara', 'Kaduna']
    },
    {
      code: 'SN', name: 'Sénégal', flag: '🇸🇳', zone: 'coast',
      fcs: 48.7, fcsPrev: 47.2, csi: 18, ipc: 2, pop: 17.9, insecure: 1.0, beneficiaries: 0.35,
      hhMonth: 19.8, collectors: 2460, markets: 132, priceIndex: 124.2, muac: 6.1,
      kcal: 2380, access: 56, hdds: 7.8, stockDays: 88,
      districts: ['Matam', 'Kolda', 'Kédougou', 'Tambacounda', 'Saint-Louis', 'Louga', 'Kaolack', 'Ziguinchor']
    },
    {
      code: 'GN', name: 'Guinée', flag: '🇬🇳', zone: 'coast',
      fcs: 44.2, fcsPrev: 43.7, csi: 21, ipc: 2, pop: 14.2, insecure: 1.9, beneficiaries: 0.55,
      hhMonth: 17.2, collectors: 1890, markets: 74, priceIndex: 128.6, muac: 7.9,
      kcal: 2230, access: 43, hdds: 7.2, stockDays: 79,
      districts: ['Boké', 'Kindia', 'Mamou', 'Faranah', 'Kankan', 'Labé', 'Nzérékoré', 'Conakry']
    },
    {
      code: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮', zone: 'coast',
      fcs: 51.3, fcsPrev: 50.1, csi: 14, ipc: 2, pop: 31.9, insecure: 1.2, beneficiaries: 0.4,
      hhMonth: 21.6, collectors: 2140, markets: 168, priceIndex: 115.2, muac: 5.2,
      kcal: 2490, access: 58, hdds: 8.1, stockDays: 94,
      districts: ['Savanes', 'Zanzan', 'Woroba', 'Vallée du Bandama', 'Lacs', 'Montagnes', 'Comoé', 'Sassandra']
    },
    {
      code: 'GH', name: 'Ghana', flag: '🇬🇭', zone: 'coast',
      fcs: 54.2, fcsPrev: 52.8, csi: 12, ipc: 2, pop: 34.1, insecure: 1.4, beneficiaries: 0.45,
      hhMonth: 22.2, collectors: 2380, markets: 210, priceIndex: 112.8, muac: 4.6,
      kcal: 2540, access: 62, hdds: 8.4, stockDays: 102,
      districts: ['Northern', 'Upper East', 'Upper West', 'Savannah', 'North East', 'Oti', 'Bono East', 'Volta']
    },
    {
      code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', zone: 'coast',
      fcs: 41.8, fcsPrev: 42.9, csi: 26, ipc: 3, pop: 8.6, insecure: 1.1, beneficiaries: 0.38,
      hhMonth: 11.4, collectors: 1320, markets: 58, priceIndex: 129.5, muac: 8.4,
      kcal: 2190, access: 39, hdds: 6.8, stockDays: 66,
      districts: ['Northern', 'North West', 'Eastern', 'Southern', 'Western Area', 'Bombali', 'Kailahun', 'Pujehun']
    },
    {
      code: 'LR', name: 'Liberia', flag: '🇱🇷', zone: 'coast',
      fcs: 43.2, fcsPrev: 42.1, csi: 23, ipc: 2, pop: 5.4, insecure: 0.8, beneficiaries: 0.28,
      hhMonth: 10.2, collectors: 1080, markets: 42, priceIndex: 120.7, muac: 7.2,
      kcal: 2120, access: 36, hdds: 7.0, stockDays: 63,
      districts: ['Lofa', 'Nimba', 'Grand Gedeh', 'Maryland', 'Bong', 'Montserrado', 'Sinoe', 'River Gee']
    },
    {
      code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', zone: 'coast',
      fcs: 38.9, fcsPrev: 39.8, csi: 29, ipc: 3, pop: 2.2, insecure: 0.4, beneficiaries: 0.14,
      hhMonth: 6.8, collectors: 640, markets: 24, priceIndex: 121.9, muac: 8.8,
      kcal: 2010, access: 33, hdds: 6.3, stockDays: 54,
      districts: ['Gabú', 'Oio', 'Bafatá', 'Cacheu', 'Biombo', 'Quinara', 'Tombali', 'Bissau']
    },
    {
      code: 'GM', name: 'Gambie', flag: '🇬🇲', zone: 'coast',
      fcs: 46.1, fcsPrev: 45.3, csi: 19, ipc: 2, pop: 2.7, insecure: 0.3, beneficiaries: 0.12,
      hhMonth: 7.4, collectors: 520, markets: 30, priceIndex: 124.8, muac: 6.4,
      kcal: 2260, access: 48, hdds: 7.4, stockDays: 81,
      districts: ['Central River', 'Upper River', 'North Bank', 'Lower River', 'West Coast', 'Banjul']
    },
    {
      code: 'BJ', name: 'Bénin', flag: '🇧🇯', zone: 'coast',
      fcs: 47.3, fcsPrev: 46.1, csi: 20, ipc: 2, pop: 13.7, insecure: 0.7, beneficiaries: 0.28,
      hhMonth: 17.6, collectors: 1640, markets: 108, priceIndex: 118.4, muac: 5.8,
      kcal: 2330, access: 51, hdds: 7.5, stockDays: 86,
      districts: ['Alibori', 'Borgou', 'Atacora', 'Donga', 'Zou', 'Collines', 'Mono', 'Atlantique']
    },
    {
      code: 'TG', name: 'Togo', flag: '🇹🇬', zone: 'coast',
      fcs: 45.8, fcsPrev: 44.9, csi: 21, ipc: 2, pop: 9.0, insecure: 0.6, beneficiaries: 0.22,
      hhMonth: 15.8, collectors: 1260, markets: 76, priceIndex: 116.9, muac: 5.4,
      kcal: 2280, access: 47, hdds: 7.3, stockDays: 84,
      districts: ['Savanes', 'Kara', 'Centrale', 'Plateaux', 'Maritime', 'Lomé']
    },
    {
      code: 'CV', name: 'Cap-Vert', flag: '🇨🇻', zone: 'island',
      fcs: 62.1, fcsPrev: 60.4, csi: 8, ipc: 1, pop: 0.6, insecure: 0.06, beneficiaries: 0.03,
      hhMonth: 2.6, collectors: 180, markets: 18, priceIndex: 108.6, muac: 2.8,
      kcal: 2410, access: 64, hdds: 9.6, stockDays: 118,
      districts: ['Santiago', 'Santo Antão', 'São Vicente', 'Fogo', 'Boa Vista', 'Sal']
    }
  ];

  /* ---------------------------------------------------------------------
   * Produits de base suivis par les relevés de prix de l'app
   * base = prix « normale saisonnière » en FCFA/kg (référence 100)
   * ------------------------------------------------------------------- */
  const products = [
    { key: 'mil', name: 'Mil', base: 285, season: 'sahel', cereal: true, vol: 0.9 },
    { key: 'mais', name: 'Maïs', base: 265, season: 'mixed', cereal: true, vol: 1.0 },
    { key: 'riz', name: 'Riz (importé)', base: 520, season: 'import', cereal: true, vol: 0.6 },
    { key: 'sorgho', name: 'Sorgho', base: 275, season: 'sahel', cereal: true, vol: 0.85 },
    { key: 'haricots', name: 'Haricots (niébé)', base: 640, season: 'mixed', cereal: true, vol: 1.2 },
    { key: 'farine', name: 'Farine de blé', base: 430, season: 'import', cereal: false, vol: 0.7 },
    { key: 'huile', name: 'Huile végétale', base: 1150, season: 'import', cereal: false, vol: 0.5 },
    { key: 'sucre', name: 'Sucre', base: 720, season: 'import', cereal: false, vol: 0.55 }
  ];

  /* ---------------------------------------------------------------------
   * Axes du radar CSI (stratégies d'adaptation des ménages)
   * weight = pondération officielle du rCSI
   * ------------------------------------------------------------------- */
  const csiAxes = [
    { key: 'portions', label: 'Réduction portions', weight: 1 },
    { key: 'repas', label: 'Repas réduits / jour', weight: 1 },
    { key: 'emprunts', label: 'Emprunts nourriture', weight: 2 },
    { key: 'actifs', label: 'Vente d’actifs', weight: 3 },
    { key: 'enfants', label: 'Enfants sans repas', weight: 1 }
  ];

  /* ---------------------------------------------------------------------
   * Bullet charts de performance (G15) — mesuré App vs objectif PAM
   * higherIsBetter=false → un indicateur « bas » est bon (CSI, délais)
   * ------------------------------------------------------------------- */
  const bullets = [
    { key: 'fcs', label: 'FCS moyen', unit: '', target: 42, max: 70, higherIsBetter: true, note: 'Seuil acceptable 42' },
    { key: 'csi', label: 'CSI (rCSI)', unit: '', target: 20, max: 60, higherIsBetter: false, note: 'Cible : sous 20' },
    { key: 'coverage', label: 'Taux de couverture', unit: '%', target: 90, max: 100, higherIsBetter: true, note: 'Bénéficiaires ciblés atteints' },
    { key: 'stocks', label: 'Stocks de sécurité', unit: ' j', target: 90, max: 150, higherIsBetter: true, note: 'Jours de stock en entrepôt' },
    { key: 'muac', label: 'Dépistages MUAC / mois', unit: ' k', target: 500, max: 700, higherIsBetter: true, note: 'Enfants dépistés au ruban MUAC' },
    { key: 'delay', label: 'Délai de distribution', unit: ' j', target: 12, max: 30, higherIsBetter: false, note: 'Scan → confirmation réception' },
    { key: 'alerts', label: 'Alertes traitées < 72 h', unit: '%', target: 95, max: 100, higherIsBetter: true, note: 'Signalements relais communautaires' },
    { key: 'sync', label: 'Synchro App terrain', unit: '%', target: 95, max: 100, higherIsBetter: true, note: 'Fiches synchronisées dans les 24 h' }
  ];

  /* ---------------------------------------------------------------------
   * Profils saisonniers (coefficients mensuels Jan → Déc)
   *  soudure = période de soudure agricole (juin → septembre)
   * ------------------------------------------------------------------- */
  const seasonality = {
    sahel: { price: [0.86, 0.88, 0.94, 1.02, 1.12, 1.24, 1.36, 1.42, 1.31, 1.08, 0.92, 0.85], alerts: [0.58, 0.55, 0.62, 0.74, 0.96, 1.34, 1.68, 1.74, 1.38, 0.98, 0.72, 0.62] },
    coast: { price: [0.93, 0.94, 0.97, 1.02, 1.06, 1.12, 1.16, 1.15, 1.09, 1.03, 0.97, 0.94], alerts: [0.78, 0.74, 0.80, 0.90, 1.00, 1.14, 1.24, 1.22, 1.10, 0.96, 0.86, 0.80] },
    mixed: { price: [0.90, 0.91, 0.96, 1.03, 1.10, 1.19, 1.28, 1.31, 1.22, 1.06, 0.95, 0.90], alerts: [0.68, 0.64, 0.71, 0.82, 0.99, 1.24, 1.48, 1.52, 1.26, 0.98, 0.79, 0.71] },
    island: { price: [0.96, 0.96, 0.98, 1.01, 1.03, 1.05, 1.06, 1.06, 1.04, 1.02, 1.00, 0.98], alerts: [0.86, 0.82, 0.86, 0.92, 0.98, 1.04, 1.08, 1.08, 1.02, 0.96, 0.90, 0.86] }
  };

  /* ---------------------------------------------------------------------
   * Phases IPC — répartition de référence (en % de population) par phase
   * dominante ; le modèle la module ensuite par pays / district.
   * ------------------------------------------------------------------- */
  const ipcProfiles = {
    1: { phases: [62, 32, 5, 1, 0], color: '#10B981', label: 'Minimale' },
    2: { phases: [31, 44, 19, 5, 1], color: '#84CC16', label: 'Sous pression' },
    3: { phases: [12, 33, 34, 17, 4], color: '#F59E0B', label: 'Crise' },
    4: { phases: [4, 20, 38, 30, 8], color: '#F97316', label: 'Urgence' },
    5: { phases: [1, 9, 28, 40, 22], color: '#EF4444', label: 'Famine' }
  };
  const IPC_PHASES = [
    { key: 1, label: 'IPC 1 · Minimale', color: '#10B981' },
    { key: 2, label: 'IPC 2 · Sous pression', color: '#84CC16' },
    { key: 3, label: 'IPC 3 · Crise', color: '#F59E0B' },
    { key: 4, label: 'IPC 4 · Urgence', color: '#F97316' },
    { key: 5, label: 'IPC 5 · Famine', color: '#EF4444' }
  ];

  /* ---------------------------------------------------------------------
   * Géométrie vectorielle simplifiée (lon/lat) pour la carte choroplèthe.
   * Silhouettes volontairement allégées (10 à 20 sommets) : l'objectif est la
   * lecture des phases IPC et l'interactivité, pas la précision cartographique.
   * ------------------------------------------------------------------- */
  const geo = {
    /* Cadre du continent affiché (le Cap-Vert est dessiné en encart) */
    bbox: { lon0: -17.6, lon1: 16.4, lat0: 3.8, lat1: 26.8 },
    /* Encart Cap-Vert (coins de l'encart en lon/lat réels) */
    inset: { lon0: -25.6, lon1: -22.2, lat0: 14.5, lat1: 17.4 },
    polygons: {
      MR: [[-17.05, 20.9], [-16.45, 19.4], [-16.1, 18.0], [-16.5, 16.7], [-16.5, 16.1], [-15.0, 16.6], [-13.5, 15.6], [-11.5, 15.7], [-9.0, 15.5], [-5.5, 15.5], [-5.4, 17.5], [-5.5, 20.5], [-4.8, 25.0], [-8.7, 25.6], [-12.0, 26.0], [-13.0, 23.0], [-16.0, 21.6]],
      ML: [[-12.3, 14.6], [-11.5, 15.7], [-9.0, 15.5], [-5.5, 15.5], [-5.4, 17.5], [-5.5, 20.5], [-4.8, 24.9], [-1.0, 22.8], [1.0, 20.5], [4.2, 19.1], [4.2, 16.5], [3.5, 15.3], [2.2, 14.2], [1.0, 14.3], [0.2, 14.9], [-1.5, 14.7], [-2.9, 15.1], [-4.2, 14.5], [-4.3, 13.2], [-5.4, 11.8], [-4.9, 11.0], [-5.5, 10.4], [-6.7, 10.4], [-7.6, 10.3], [-8.0, 11.0], [-8.7, 11.4], [-9.3, 12.3], [-10.7, 12.1], [-11.4, 12.4], [-12.5, 12.3], [-12.3, 13.6]],
      NE: [[0.2, 14.9], [1.0, 14.3], [2.2, 14.2], [3.5, 15.3], [4.2, 16.5], [4.2, 19.1], [8.0, 21.5], [12.0, 23.5], [15.0, 23.0], [15.7, 20.8], [15.4, 16.9], [13.9, 15.7], [13.6, 14.4], [13.2, 13.6], [11.5, 13.3], [10.0, 13.2], [7.5, 13.4], [5.4, 13.9], [4.2, 13.4], [3.6, 12.5], [2.4, 12.4], [2.2, 13.6]],
      SN: [[-16.75, 16.1], [-15.9, 16.6], [-14.6, 16.7], [-13.5, 15.6], [-13.0, 14.9], [-12.1, 14.7], [-11.5, 15.6], [-11.4, 14.4], [-11.8, 13.3], [-11.4, 12.4], [-12.5, 12.3], [-13.7, 12.7], [-15.6, 12.4], [-16.7, 12.4], [-16.6, 13.5], [-16.85, 14.7], [-16.5, 15.5]],
      GM: [[-16.8, 13.5], [-16.7, 13.15], [-15.0, 13.25], [-13.8, 13.45], [-13.8, 13.62], [-15.0, 13.62], [-16.8, 13.62]],
      GW: [[-16.7, 12.3], [-15.9, 11.6], [-15.2, 11.05], [-14.4, 11.1], [-13.7, 12.0], [-13.7, 12.7], [-15.6, 12.4]],
      GN: [[-14.9, 12.6], [-13.7, 12.7], [-12.5, 12.3], [-11.4, 12.4], [-10.7, 12.1], [-9.3, 12.3], [-8.8, 11.6], [-9.0, 10.6], [-8.2, 10.5], [-8.0, 9.6], [-8.9, 8.4], [-8.3, 7.6], [-9.2, 7.3], [-10.3, 8.5], [-11.4, 8.3], [-12.4, 9.5], [-13.3, 9.9], [-14.4, 10.4], [-14.9, 11.4]],
      SL: [[-13.3, 9.6], [-12.6, 9.9], [-11.4, 9.9], [-10.8, 9.4], [-10.3, 8.7], [-10.6, 7.9], [-11.4, 7.0], [-12.4, 7.3], [-13.2, 8.5]],
      LR: [[-11.4, 7.0], [-10.6, 7.9], [-10.3, 8.7], [-9.4, 8.5], [-8.9, 8.4], [-8.3, 7.6], [-8.2, 6.6], [-7.5, 5.3], [-7.5, 4.4], [-9.0, 5.0], [-10.5, 6.2]],
      CI: [[-8.3, 7.6], [-8.2, 6.6], [-7.5, 5.3], [-6.5, 5.0], [-5.3, 5.1], [-4.0, 5.2], [-3.1, 5.1], [-2.5, 5.2], [-2.6, 7.0], [-3.2, 8.0], [-2.7, 9.5], [-3.6, 9.9], [-4.6, 9.7], [-5.5, 10.4], [-6.7, 10.4], [-7.6, 10.3], [-8.0, 9.6], [-8.9, 8.4]],
      GH: [[-3.1, 5.1], [-2.5, 5.2], [-1.6, 5.0], [-0.6, 5.3], [0.6, 5.8], [1.2, 6.1], [0.6, 8.0], [0.4, 9.5], [-0.1, 11.1], [-1.5, 11.0], [-2.7, 9.5], [-3.2, 8.0], [-2.6, 7.0]],
      TG: [[1.2, 6.1], [1.8, 6.2], [1.6, 9.0], [0.9, 10.2], [0.7, 11.0], [-0.1, 11.1], [0.4, 9.5], [0.6, 8.0]],
      BJ: [[1.8, 6.2], [2.7, 6.3], [3.3, 6.3], [2.8, 8.0], [3.6, 9.5], [3.8, 11.0], [2.4, 12.4], [0.9, 11.7], [0.7, 11.0], [0.9, 10.2], [1.6, 9.0]],
      BF: [[-5.5, 10.4], [-4.6, 9.7], [-3.6, 9.9], [-2.7, 9.5], [-1.5, 11.0], [-0.1, 11.1], [0.7, 11.0], [0.9, 11.7], [2.4, 12.4], [2.2, 13.6], [1.0, 14.3], [0.2, 14.9], [-1.5, 14.7], [-2.9, 15.1], [-4.2, 14.5], [-4.3, 13.2], [-5.4, 11.8], [-4.9, 11.0]],
      NG: [[2.4, 12.4], [3.6, 12.5], [4.2, 13.4], [5.4, 13.9], [7.5, 13.4], [10.0, 13.2], [11.5, 13.3], [13.2, 13.6], [13.6, 14.4], [14.7, 12.8], [14.6, 11.5], [13.8, 10.0], [12.4, 8.9], [11.0, 7.0], [9.5, 6.0], [8.4, 4.6], [7.0, 4.4], [5.4, 4.9], [3.5, 6.3], [2.8, 8.0], [3.6, 9.5], [3.8, 11.0]],
      /* Îles du Cap-Vert (dessinées dans l'encart) */
      CV: [[-25.35, 17.05], [-24.95, 17.2], [-24.3, 16.85], [-24.55, 16.55], [-25.2, 16.75]],
      CV2: [[-23.85, 15.6], [-23.4, 15.5], [-23.0, 15.1], [-23.55, 14.85], [-24.0, 15.15]],
      CV3: [[-22.95, 16.4], [-22.5, 16.3], [-22.55, 16.0], [-23.05, 16.05]]
    },
    /* Étiquettes de carte (position en lon/lat) */
    labels: {
      MR: [-10.5, 20.0], ML: [-3.5, 17.5], NE: [9.0, 17.5], NG: [8.0, 9.5], BF: [-1.2, 12.5],
      SN: [-14.6, 14.3], GM: [-15.2, 13.4], GW: [-14.9, 11.9], GN: [-11.0, 10.5], SL: [-11.8, 8.6],
      LR: [-9.4, 6.6], CI: [-5.6, 7.6], GH: [-1.2, 7.8], TG: [0.9, 8.6], BJ: [2.3, 9.6], CV: [-24.2, 16.0]
    }
  };

  /* ---------------------------------------------------------------------
   * Entonnoir logistique (G6) — étapes de la chaîne de distribution NutriApp
   * En mode Pays, les valeurs sont re-mise à l'échelle du pays.
   * ------------------------------------------------------------------- */
  const funnel = [
    { key: 'targeted', label: 'Bénéficiaires ciblés', value: 18.2, note: 'Plan de réponse régional validé' },
    { key: 'registered', label: 'Enregistrés dans l’App', value: 15.1, note: 'Carte bénéficiaire + empreinte scannée' },
    { key: 'planned', label: 'Plan de ravitaillement', value: 14.2, note: 'Tonnage affecté aux entrepôts' },
    { key: 'supplied', label: 'Approvisionnés', value: 13.4, note: 'Convois arrivés aux points de distribution' },
    { key: 'distributed', label: 'Distribués (scannés)', value: 12.4, note: 'Scan QR à la remise du kit' },
    { key: 'confirmed', label: 'Confirmés reçus', value: 11.8, note: 'Contre-appel IVR / visite relais' }
  ];

  /* ---------------------------------------------------------------------
   * Waterfall financier (G14) — couverture des opérations (Mds $)
   * ------------------------------------------------------------------- */
  const waterfall = [
    { key: 'required', label: 'Budget requis', value: 2.8, type: 'total', note: 'Appel régional 2024' },
    { key: 'confirmed', label: 'Contributions confirmées', value: 1.6, type: 'up', note: 'Bailleurs signataires' },
    { key: 'pledged', label: 'Contributions annoncées', value: 0.5, type: 'up', note: 'Engagements non décaissés' },
    { key: 'available', label: 'Budget disponible', value: 2.1, type: 'total', note: '75% du besoin couvert' },
    { key: 'committed', label: 'Engagé sur programmes', value: -1.7, type: 'down', note: 'Distributions & nutrition' },
    { key: 'pipeline', label: 'En pipeline logistique', value: -0.3, type: 'down', note: 'Achats et fret en cours' },
    { key: 'gap', label: 'Gap de financement', value: -0.7, type: 'gap', note: 'À mobiliser d’ici T2 2025' }
  ];

  /* ---------------------------------------------------------------------
   * Distribution HDDS (G11) — poids relatifs des scores 0 → 12
   * (déclarés dans les formulaires mobiles par les chefs de ménages)
   * ------------------------------------------------------------------- */
  const hddsShape = [1.2, 2.4, 4.1, 6.2, 8.4, 10.6, 12.0, 11.4, 9.6, 7.2, 4.8, 2.4, 0.9];

  /* ---------------------------------------------------------------------
   * Divers
   * ------------------------------------------------------------------- */
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const MONTHS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const QUARTERS = ['T1', 'T2', 'T3', 'T4'];
  /* Mois de la période de soudure agricole (indices 0..11) */
  const LEAN_SEASON = [5, 6, 7, 8];
  /* Fenêtre « Crise alimentaire / inflation marchés » mise en avant (2022T1 → 2023T2) */
  const CRISIS_WINDOW = { from: { y: 2022, q: 1 }, to: { y: 2023, q: 2 } };

  WFP.DATA = {
    countries, products, csiAxes, bullets, seasonality, ipcProfiles, IPC_PHASES,
    geo, funnel, waterfall, hddsShape, MONTHS, MONTHS_LONG, QUARTERS, LEAN_SEASON, CRISIS_WINDOW,
    /* Cibles institutionnelles régionales */
    targets: { beneficiaries: 18.5, fcs: 42, priceNorm: 100, muacMax: 5, stockDays: 90 },
    /* Métadonnées d'affichage */
    meta: {
      title: 'WFP NutriTracker · Surveillance Communautaire Afrique de l’Ouest',
      source: 'Application Mobile Terrain PAM/WFP (Relais Communautaires, mVAM & Points de Distribution)',
      appVersion: 'NutriApp Terrain v5.1'
    }
  };
})(window);
