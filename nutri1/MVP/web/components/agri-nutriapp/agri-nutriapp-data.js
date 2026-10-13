/* =====================================================================
 * AgriNutri Intelligence · Données de référence (16 pays d'Afrique de l'Ouest)
 * ---------------------------------------------------------------------
 * Jeu de données hardcodé, réaliste, présenté comme issu de la télémétrie
 * NutriApp (saisie des agents agricoles, relais communautaires, enquêtes
 * ménages et relevés de prix sur les marchés).
 * ⚠️ Valeurs de démonstration : ancrées sur les indicateurs régionaux du
 * brief (52,4 Mt, 380 FCFA/kg, 73 %, 18,4 %, 22 %), elles ne constituent pas
 * des statistiques officielles.
 *
 * Expose : window.AgriNutriData
 * ===================================================================== */
(function () {
  'use strict';

  /* Palette exclusive du Ministère de l'Agriculture (brief) */
  const COLORS = {
    primary: '#15803D',     // vert agriculture foncé
    secondary: '#B45309',   // brun terre
    tertiary: '#0369A1',    // bleu eau / irrigation
    quaternary: '#A21CAF',  // violet analyse
    success: '#16A34A',     // vert clair
    danger: '#DC2626',      // rouge alerte
    sidebar: '#052E16',
    bg: '#F7FFF7',
    border: '#BBF7D0',
    grey: '#94A3B8',
    ink: '#0F172A'
  };

  /* 16 pays : prod = production céréalière 2024 (Mt), ss = autosuffisance (ratio),
   * growth = croissance de production vs 2023 (%), price = prix moyen du mil (FCFA/kg),
   * hdds = score HDDS moyen des ménages, loss = pertes post-récolte (%),
   * mnt = prévalence du double fardeau / obésité urbaine (%), mntDelta = hausse vs 2022 (pts),
   * div = indice de diversité des cultures (0-10), rev = revenu net moyen exploitant (USD/an),
   * rain = pluviométrie annuelle (mm), garden = part des ménages avec jardin potager (%),
   * zone = zone agroclimatique, regions = 4 unités administratives (districts / régions) */
  const COUNTRIES = [
    { code: 'NG', name: 'Nigeria',       prod: 22.0, ss: 0.8, growth: 5.0, price: 356, hdds: 4.48, loss: 22.5, mnt: 23.5, mntDelta: 4.0, div: 6.1, rev: 1180, rain: 1150, garden: 34, zone: 'Soudano-guinéenne', regions: ['Kano', 'Kaduna', 'Benue', 'Oyo'] },
    { code: 'NE', name: 'Niger',         prod: 4.8,  ss: 0.62, growth: 3.2, price: 420, hdds: 3.51, loss: 26.0, mnt: 13.6, mntDelta: 2.4, div: 3.9, rev: 610,  rain: 420,  garden: 22, zone: 'Sahélienne', regions: ['Maradi', 'Zinder', 'Tahoua', 'Tillabéri'] },
    { code: 'ML', name: 'Mali',          prod: 5.1,  ss: 0.78, growth: 3.8, price: 372, hdds: 3.86, loss: 23.5, mnt: 15.0, mntDelta: 2.9, div: 4.6, rev: 790,  rain: 620,  garden: 26, zone: 'Sahélienne', regions: ['Ségou', 'Sikasso', 'Kayes', 'Mopti'] },
    { code: 'BF', name: 'Burkina Faso', prod: 4.2,  ss: 0.68, growth: 2.1, price: 398, hdds: 3.63, loss: 24.0, mnt: 14.2, mntDelta: 2.5, div: 4.2, rev: 680,  rain: 760,  garden: 24, zone: 'Sahélienne', regions: ['Hauts-Bassins', 'Centre-Ouest', 'Est', 'Nord'] },
    { code: 'SN', name: 'Sénégal',       prod: 1.6,  ss: 0.55, growth: 5.5, price: 410, hdds: 3.99, loss: 18.5, mnt: 18.8, mntDelta: 3.8, div: 5.0, rev: 920,  rain: 710,  garden: 41, zone: 'Sahélienne', regions: ['Kaolack', 'Louga', 'Kolda', 'Tambacounda'] },
    { code: 'GN', name: 'Guinée',        prod: 2.4,  ss: 0.71, growth: 3.1, price: 344, hdds: 4.13, loss: 20.0, mnt: 17.6, mntDelta: 3.3, div: 5.5, rev: 850,  rain: 1900, garden: 38, zone: 'Guinéenne', regions: ['Kankan', 'Faranah', "N'Zérékoré", 'Labé'] },
    { code: 'CI', name: "Côte d'Ivoire", prod: 3.2,  ss: 0.84, growth: 4.4, price: 336, hdds: 4.63, loss: 18.5, mnt: 26.0, mntDelta: 4.5, div: 6.8, rev: 1420, rain: 1300, garden: 47, zone: 'Guinéenne', regions: ['Bouaké', 'Korhogo', 'San-Pédro', 'Abidjan urbain'] },
    { code: 'GH', name: 'Ghana',         prod: 3.4,  ss: 0.88, growth: 3.9, price: 322, hdds: 4.74, loss: 17.0, mnt: 24.6, mntDelta: 3.9, div: 7.0, rev: 1560, rain: 1200, garden: 52, zone: 'Guinéenne', regions: ['Northern', 'Ashanti', 'Volta', 'Brong-Ahafo'] },
    { code: 'MR', name: 'Mauritanie',    prod: 0.4,  ss: 0.31, growth: 6.4, price: 462, hdds: 3.01, loss: 26.5, mnt: 16.1, mntDelta: 2.7, div: 2.6, rev: 540,  rain: 180,  garden: 18, zone: 'Saharienne', regions: ['Trarza', 'Gorgol', 'Assaba', 'Hodh El Gharbi'] },
    { code: 'SL', name: 'Sierra Leone',  prod: 0.9,  ss: 0.58, growth: 2.4, price: 362, hdds: 3.81, loss: 22.5, mnt: 14.9, mntDelta: 2.3, div: 5.3, rev: 730,  rain: 2600, garden: 36, zone: 'Guinéenne', regions: ['Northern', 'Eastern', 'Southern', 'Western Area'] },
    { code: 'LR', name: 'Liberia',       prod: 0.5,  ss: 0.52, growth: 2.1, price: 380, hdds: 3.56, loss: 25.0, mnt: 15.7, mntDelta: 2.6, div: 5.9, rev: 690,  rain: 2400, garden: 33, zone: 'Guinéenne', regions: ['Nimba', 'Bong', 'Lofa', 'Grand Gedeh'] },
    { code: 'GW', name: 'Guinée-Bissau', prod: 0.3,  ss: 0.49, growth: 1.2, price: 390, hdds: 3.38, loss: 27.0, mnt: 12.8, mntDelta: 1.8, div: 4.8, rev: 560,  rain: 1500, garden: 21, zone: 'Guinéenne', regions: ['Gabu', 'Bafatá', 'Oio', 'Cacheu'] },
    { code: 'GM', name: 'Gambie',        prod: 0.2,  ss: 0.44, growth: 2.7, price: 402, hdds: 3.65, loss: 23.5, mnt: 17.0, mntDelta: 3.0, div: 4.4, rev: 610,  rain: 900,  garden: 29, zone: 'Sahélienne', regions: ['Upper River', 'Central River', 'North Bank', 'West Coast'] },
    { code: 'BJ', name: 'Bénin',         prod: 1.9,  ss: 0.86, growth: 4.1, price: 350, hdds: 4.30, loss: 19.0, mnt: 19.4, mntDelta: 3.3, div: 6.4, rev: 1080, rain: 1100, garden: 44, zone: 'Guinéenne', regions: ['Borgou', 'Atacora', 'Zou', 'Alibori'] },
    { code: 'TG', name: 'Togo',          prod: 1.4,  ss: 0.81, growth: 3.6, price: 344, hdds: 4.37, loss: 20.0, mnt: 20.6, mntDelta: 3.5, div: 6.0, rev: 1010, rain: 1200, garden: 45, zone: 'Guinéenne', regions: ['Savanes', 'Kara', 'Centrale', 'Maritime'] },
    { code: 'CV', name: 'Cap-Vert',      prod: 0.1,  ss: 0.12, growth: -2.0, price: 456, hdds: 3.85, loss: 14.0, mnt: 22.4, mntDelta: 3.1, div: 3.1, rev: 1250, rain: 240,  garden: 58, zone: 'Insulaire', regions: ['Santiago Sul', 'Santo Antão', 'São Vicente', 'Sal'] }
  ];

  /* Régions d'objectif : autosuffisance 100 %, prix normal, HDDS cible 5 */
  const TARGETS = { ss: 1.0, loss: 10, hdds: 5, mnt: 10, price: 300 };

  /* 6 commodités suivies sur les marchés (heatmap) */
  const COMMODITIES = ['Mil', 'Sorgho', 'Maïs', 'Riz local', 'Niébé', 'Manioc'];

  /* Profil saisonnier du ratio prix / normale, par mois (jan → déc).
   * Les mois de récolte (sorgho/mil : oct-nov, maïs : sept-oct) ont un ratio < 1. */
  const SEASON_PROFILE = {
    'Mil':       [1.04, 1.07, 1.10, 1.13, 1.16, 1.18, 1.16, 1.10, 0.94, 0.84, 0.86, 0.95],
    'Sorgho':    [1.02, 1.05, 1.08, 1.11, 1.14, 1.15, 1.12, 1.06, 0.92, 0.82, 0.85, 0.94],
    'Maïs':      [1.00, 1.03, 1.06, 1.12, 1.19, 1.20, 1.14, 1.04, 0.86, 0.80, 0.90, 0.98],
    'Riz local': [0.98, 0.99, 1.01, 1.03, 1.05, 1.09, 1.10, 1.07, 1.01, 0.95, 0.94, 0.96],
    'Niébé':     [1.06, 1.09, 1.12, 1.15, 1.18, 1.22, 1.20, 1.10, 0.90, 0.86, 0.92, 1.01],
    'Manioc':    [1.00, 1.01, 1.03, 1.06, 1.09, 1.12, 1.11, 1.05, 0.96, 0.92, 0.94, 0.98]
  };
  /* Mois de récolte principale (index 0 = janvier) pour l'icône d'épi */
  const HARVEST_MONTHS = {
    'Mil': [9, 10], 'Sorgho': [9, 10], 'Maïs': [8, 9], 'Riz local': [10, 11], 'Niébé': [9], 'Manioc': [11, 0]
  };

  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  /* 10 cultures du calendrier : semis [début, fin], récolte [début, fin] (index mois) */
  const CROPS_CALENDAR = [
    { name: 'Mil',      sow: [5, 6],  harvest: [9, 10] },
    { name: 'Sorgho',   sow: [5, 6],  harvest: [9, 10] },
    { name: 'Maïs',     sow: [4, 5],  harvest: [7, 8] },
    { name: 'Riz',      sow: [5, 6],  harvest: [10, 11] },
    { name: 'Niébé',    sow: [6, 7],  harvest: [8, 9] },
    { name: 'Arachide', sow: [5, 6],  harvest: [9, 10] },
    { name: 'Manioc',   sow: [3, 4],  harvest: [11, 0] },
    { name: 'Igname',   sow: [2, 3],  harvest: [9, 10] },
    { name: 'Patate douce', sow: [6, 7], harvest: [10, 11] },
    { name: 'Sésame',   sow: [5, 6],  harvest: [9, 9] }
  ];
  /* Pluviométrie régionale moyenne (mm / mois) et pic de malnutrition aigüe (% MAS) */
  const RAIN_MONTHLY = [4, 6, 14, 38, 88, 141, 218, 262, 178, 61, 9, 2];
  const MALNUTRITION_PEAK = [5.2, 5.5, 6.1, 6.8, 7.6, 8.4, 9.1, 9.8, 9.4, 7.9, 6.2, 5.4];
  /* Période de soudure (juin → septembre) */
  const LEAN_SEASON = [5, 6, 7, 8];

  /* Production par culture (Mt) — treemap et pile empilée */
  const CROPS_PRODUCTION = [
    { name: 'Maïs',     mt: 12.6, color: '#15803D' },
    { name: 'Mil',      mt: 10.6, color: '#B45309' },
    { name: 'Manioc',   mt: 8.9,  color: '#0369A1' },
    { name: 'Sorgho',   mt: 7.9,  color: '#A21CAF' },
    { name: 'Riz',      mt: 5.8,  color: '#16A34A' },
    { name: 'Igname',   mt: 3.4,  color: '#7C3AED' },
    { name: 'Niébé',    mt: 1.6,  color: '#CA8A04' },
    { name: 'Arachide', mt: 1.6,  color: '#0891B2' }
  ];
  /* Répartition par zone agroclimatique pour le treemap */
  const ZONES = ['Sahélienne', 'Soudano-guinéenne', 'Guinéenne'];
  const ZONE_SHARE = { Maïs: [0.22, 0.38, 0.40], Mil: [0.70, 0.22, 0.08], Manioc: [0.08, 0.27, 0.65], Sorgho: [0.62, 0.30, 0.08], Riz: [0.14, 0.30, 0.56], Igname: [0.05, 0.25, 0.70], Niébé: [0.55, 0.30, 0.15], Arachide: [0.50, 0.35, 0.15] };

  /* Série décennale 2014-2024 (11 campagnes) : total (Mt) et part de chaque culture */
  const CAMPAIGNS = ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'];
  const CAMPAIGN_TOTAL = [38.0, 39.4, 40.1, 41.8, 43.0, 44.6, 45.9, 47.2, 48.8, 50.3, 52.4];
  const CAMPAIGN_SHARE = { Maïs: 0.24, Mil: 0.20, Manioc: 0.17, Sorgho: 0.15, Riz: 0.11, Autres: 0.13 };

  /* Chaîne de pertes post-récolte (points de %) : somme = 22 % */
  const WASTE_STAGES = [
    { name: 'Récolte', loss: 3.5 }, { name: 'Battage', loss: 2.8 }, { name: 'Stockage', loss: 6.1 },
    { name: 'Transport', loss: 2.4 }, { name: 'Transformation', loss: 1.9 }, { name: 'Commerce', loss: 2.6 },
    { name: 'Ménage', loss: 2.7 }
  ];

  /* Entonnoir de fortification (% de la production industrielle) */
  const FORTIFICATION_FUNNEL = [
    { name: 'Production industrielle', value: 100 },
    { name: 'Commercialisée', value: 68 },
    { name: 'Achetée par les ménages', value: 49 },
    { name: 'Consommée effectivement', value: 37 }
  ];

  /* Série 24 mois (2023-2024) : prix du mil (FCFA/kg) et indice d'insécurité alimentaire (%) */
  const SERIES_24M = (function () {
    const labels = [];
    const price = [];
    const insecurity = [];
    for (let i = 0; i < 24; i++) {
      const m = i % 12;
      const y = i < 12 ? 2023 : 2024;
      labels.push(MONTHS[m] + ' ' + String(y).slice(2));
      // Saisonnalité (soudure = pic) + tendance haussière
      const season = [0.96, 0.98, 1.00, 1.03, 1.06, 1.10, 1.13, 1.15, 1.10, 0.94, 0.90, 0.93][m];
      const p = Math.round(330 * season * (1 + i * 0.012));
      price.push(p);
      // Corrélation prix → insécurité (R² ≈ 0,71), avec bruit déterministe
      const noise = Math.sin(i * 1.7) * 1.25;
      insecurity.push(Number((9.5 + (p - 300) * 0.034 + noise).toFixed(1)));
    }
    return { labels, price, insecurity };
  })();

  /* Consommation par groupe alimentaire (% de ménages) : avec jardin vs sans jardin */
  const FOOD_GROUPS = [
    { name: 'Céréales', garden: 98, none: 97 }, { name: 'Racines', garden: 84, none: 79 },
    { name: 'Légumineuses', garden: 66, none: 49 }, { name: 'Légumes-feuilles', garden: 81, none: 34 },
    { name: 'Fruits riches en vit. A', garden: 58, none: 22 }, { name: 'Autres légumes', garden: 72, none: 31 },
    { name: 'Viande / volaille', garden: 41, none: 33 }, { name: 'Poisson', garden: 38, none: 36 },
    { name: 'Œufs', garden: 46, none: 27 }, { name: 'Lait / laitages', garden: 32, none: 25 },
    { name: 'Huiles enrichies', garden: 62, none: 55 }, { name: 'Sucres', garden: 44, none: 46 }
  ];

  /* Prix des produits de base : 2020 vs 2024 (FCFA/kg) */
  const DUMBBELL_COMMODITIES = [
    { name: 'Mil', p2020: 245, p2024: 380 }, { name: 'Sorgho', p2020: 232, p2024: 351 },
    { name: 'Maïs', p2020: 210, p2024: 318 }, { name: 'Riz importé', p2020: 365, p2024: 452 },
    { name: 'Niébé', p2020: 480, p2024: 690 }, { name: 'Manioc', p2020: 128, p2024: 176 },
    { name: 'Huile de palme', p2020: 770, p2024: 1010 }, { name: 'Oignon', p2020: 290, p2024: 415 }
  ];

  /* Scorecard : indicateurs synthétiques + tendance sur 8 points */
  const SCORECARD = [
    { label: 'Production céréalière (Mt)', value: 52.4, target: 60, unit: 'Mt', trend: [38.0, 40.1, 41.8, 44.6, 47.2, 48.8, 50.3, 52.4], good: 'up' },
    { label: 'Autosuffisance (%)', value: 73, target: 100, unit: '%', trend: [61, 63, 65, 66, 68, 70, 71, 73], good: 'up' },
    { label: 'Pertes post-récolte (%)', value: 22, target: 10, unit: '%', trend: [29, 28, 27, 26, 25, 24, 23, 22], good: 'down' },
    { label: 'Prix du mil (FCFA/kg)', value: 380, target: 300, unit: 'FCFA', trend: [310, 318, 335, 344, 352, 361, 372, 380], good: 'down' },
    { label: 'Score HDDS moyen', value: 4.2, target: 5, unit: '', trend: [3.7, 3.8, 3.8, 3.9, 4.0, 4.0, 4.1, 4.2], good: 'up' },
    { label: 'Diversité des cultures (0-10)', value: 5.3, target: 7, unit: '', trend: [4.4, 4.6, 4.7, 4.8, 5.0, 5.1, 5.2, 5.3], good: 'up' },
    { label: 'Double fardeau urbain (%)', value: 18.4, target: 10, unit: '%', trend: [13.9, 14.6, 15.2, 15.8, 16.4, 17.0, 17.8, 18.4], good: 'down' },
    { label: 'Ménages avec jardin (%)', value: 37, target: 60, unit: '%', trend: [24, 26, 28, 30, 32, 34, 36, 37], good: 'up' }
  ];

  /* Heatmap / Marchés : clé d'un pays → écarts (ajustement local) */
  window.AgriNutriData = {
    COLORS, COUNTRIES, TARGETS, COMMODITIES, SEASON_PROFILE, HARVEST_MONTHS, MONTHS,
    CROPS_CALENDAR, RAIN_MONTHLY, MALNUTRITION_PEAK, LEAN_SEASON,
    CROPS_PRODUCTION, ZONES, ZONE_SHARE, CAMPAIGNS, CAMPAIGN_TOTAL, CAMPAIGN_SHARE,
    WASTE_STAGES, FORTIFICATION_FUNNEL, SERIES_24M, FOOD_GROUPS, DUMBBELL_COMMODITIES, SCORECARD,
    /* Ancres régionales du brief (affichées telles quelles en vue globale) */
    ANCHORS: { prod: 52.4, price: 380, ss: 73, mnt: 18.4, mntDelta: 3.1, loss: 22, lossBn: 3.4, growth: 4.1, hdds: 4.2, priceSeason: 28 }
  };
})();
