/* ============================================================================
 * FAO AgriNutriApp · Référentiel de démonstration pour le tableau de bord.
 * Les chiffres sont des données d'exemple structurées comme des remontées
 * terrain ; ils ne constituent pas une publication officielle de la FAO.
 * ========================================================================== */
(function (global) {
  'use strict';

  const FAO = (global.FAONutriTracker = global.FAONutriTracker || {});

  const countries = [
    { code: 'NE', name: 'Niger', production: 4.8, loss: 28, hdds: 3.8, fortification: 45, income: 320, selfSufficiency: .72, diversity: 3.1, households: 13200, mix: [32, 10, 4, 31, 20, 3] },
    { code: 'ML', name: 'Mali', production: 11.2, loss: 22, hdds: 4.1, fortification: 52, income: 480, selfSufficiency: 1.17, diversity: 3.7, households: 18400, mix: [28, 15, 3, 30, 18, 6] },
    { code: 'BF', name: 'Burkina Faso', production: 6.7, loss: 25, hdds: 4.4, fortification: 61, income: 420, selfSufficiency: 1.05, diversity: 4.0, households: 15900, mix: [27, 12, 4, 32, 20, 5] },
    { code: 'SN', name: 'Sénégal', production: 3.2, loss: 18, hdds: 5.2, fortification: 71, income: 720, selfSufficiency: .66, diversity: 4.9, households: 14300, mix: [14, 8, 27, 20, 17, 14] },
    { code: 'GN', name: 'Guinée', production: 3.5, loss: 21, hdds: 4.8, fortification: 58, income: 460, selfSufficiency: 1.13, diversity: 4.5, households: 12600, mix: [8, 11, 13, 19, 25, 24] },
    { code: 'CI', name: 'Côte d’Ivoire', production: 3.8, loss: 17, hdds: 5.9, fortification: 68, income: 890, selfSufficiency: .76, diversity: 5.4, households: 17100, mix: [6, 9, 24, 13, 25, 23] },
    { code: 'GH', name: 'Ghana', production: 4.1, loss: 14, hdds: 6.1, fortification: 74, income: 980, selfSufficiency: .92, diversity: 5.8, households: 16800, mix: [10, 18, 8, 21, 25, 18] },
    { code: 'NG', name: 'Nigeria', production: 18.4, loss: 20, hdds: 5.8, fortification: 63, income: 850, selfSufficiency: 1.08, diversity: 5.2, households: 32600, mix: [13, 18, 15, 20, 23, 11] },
    { code: 'MR', name: 'Mauritanie', production: 1.2, loss: 24, hdds: 4.2, fortification: 49, income: 510, selfSufficiency: .42, diversity: 3.5, households: 7200, mix: [16, 5, 32, 14, 28, 5] },
    { code: 'SL', name: 'Sierra Leone', production: 1.8, loss: 23, hdds: 4.8, fortification: 55, income: 390, selfSufficiency: .92, diversity: 4.2, households: 8100, mix: [5, 8, 16, 13, 28, 30] },
    { code: 'LR', name: 'Liberia', production: .9, loss: 26, hdds: 4.6, fortification: 51, income: 370, selfSufficiency: .52, diversity: 4.0, households: 6900, mix: [4, 7, 14, 11, 26, 38] },
    { code: 'GW', name: 'Guinée-Bissau', production: .6, loss: 25, hdds: 4.3, fortification: 48, income: 340, selfSufficiency: .77, diversity: 3.7, households: 5600, mix: [4, 8, 36, 13, 21, 18] },
    { code: 'GM', name: 'Gambie', production: .4, loss: 19, hdds: 5.1, fortification: 65, income: 590, selfSufficiency: .81, diversity: 4.6, households: 5100, mix: [12, 6, 29, 15, 20, 18] },
    { code: 'BJ', name: 'Bénin', production: 2.9, loss: 16, hdds: 5.3, fortification: 69, income: 610, selfSufficiency: 1.20, diversity: 5.0, households: 10900, mix: [12, 16, 12, 20, 25, 15] },
    { code: 'TG', name: 'Togo', production: 2.4, loss: 17, hdds: 5.0, fortification: 67, income: 580, selfSufficiency: 1.13, diversity: 4.8, households: 9200, mix: [11, 14, 10, 20, 28, 17] },
    { code: 'CV', name: 'Cap-Vert', production: .1, loss: 9, hdds: 6.4, fortification: 86, income: 1250, selfSufficiency: .38, diversity: 5.2, households: 3100, mix: [5, 3, 49, 5, 18, 20] }
  ];

  /* Noms de provinces/régions utilisés pour la vue détaillée du pays. */
  const districts = {
    NE: ['Agadez', 'Diffa', 'Dosso', 'Maradi', 'Tahoua', 'Tillabéri', 'Zinder', 'Niamey'],
    ML: ['Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'Tombouctou', 'Gao', 'Bamako'],
    BF: ['Boucle du Mouhoun', 'Cascades', 'Centre', 'Centre-Est', 'Est', 'Hauts-Bassins', 'Nord', 'Sahel'],
    SN: ['Dakar', 'Diourbel', 'Fatick', 'Kaolack', 'Kolda', 'Matam', 'Saint-Louis', 'Thiès'],
    GN: ['Boké', 'Conakry', 'Faranah', 'Kankan', 'Kindia', 'Labé', 'Mamou', 'Nzérékoré'],
    CI: ['Abidjan', 'Bas-Sassandra', 'Comoé', 'Denguélé', 'Gôh-Djiboua', 'Lacs', 'Montagnes', 'Savanes'],
    GH: ['Ashanti', 'Bono', 'Central', 'Eastern', 'Greater Accra', 'Northern', 'Upper East', 'Western'],
    NG: ['Abuja FCT', 'Borno', 'Kaduna', 'Kano', 'Lagos', 'Niger State', 'Oyo', 'Rivers'],
    MR: ['Adrar', 'Assaba', 'Brakna', 'Dakhlet Nouadhibou', 'Gorgol', 'Guidimakha', 'Hodh Ech Chargui', 'Trarza'],
    SL: ['Eastern', 'North-West', 'Northern', 'Southern', 'Western Area'],
    LR: ['Bong', 'Grand Bassa', 'Lofa', 'Margibi', 'Montserrado', 'Nimba', 'River Gee'],
    GW: ['Bafatá', 'Biombo', 'Cacheu', 'Gabú', 'Oio', 'Quinara', 'Tombali'],
    GM: ['Banjul', 'Central River', 'Lower River', 'North Bank', 'Upper River', 'West Coast'],
    BJ: ['Alibori', 'Atacora', 'Atlantique', 'Borgou', 'Collines', 'Donga', 'Littoral', 'Zou'],
    TG: ['Centrale', 'Kara', 'Maritime', 'Plateaux', 'Savanes'],
    CV: ['Boa Vista', 'Fogo', 'Maio', 'Sal', 'Santiago', 'Santo Antão', 'São Nicolau', 'São Vicente']
  };

  /* Indices de densité nutritive relatifs (0–100), à lire comme un aperçu,
   * pas comme une composition certifiée en mg ou kcal pour 100 g. */
  const nutrients = ['Énergie', 'Protéines', 'Fer', 'Zinc', 'Vit. A', 'Vit. C', 'Calcium', 'Folate'];
  const foods = [
    { name: 'Mil', values: [73, 42, 48, 37, 8, 6, 22, 31] },
    { name: 'Fonio', values: [71, 27, 35, 29, 4, 3, 18, 20], superfood: true },
    { name: 'Sorgho', values: [68, 39, 42, 34, 7, 5, 20, 28] },
    { name: 'Maïs', values: [76, 31, 24, 27, 15, 6, 12, 24] },
    { name: 'Niébé', values: [51, 79, 75, 57, 4, 5, 21, 68], superfood: true },
    { name: 'Arachide', values: [91, 81, 38, 52, 2, 1, 24, 51] },
    { name: 'Moringa', values: [36, 64, 93, 74, 100, 88, 95, 78], superfood: true },
    { name: 'Gombo', values: [24, 21, 27, 19, 17, 48, 34, 22] },
    { name: 'Patate douce', values: [56, 10, 13, 12, 92, 44, 13, 17], superfood: true },
    { name: 'Manioc', values: [63, 8, 12, 9, 6, 35, 9, 11] },
    { name: 'Igname', values: [67, 12, 17, 15, 4, 19, 8, 14] },
    { name: 'Riz local', values: [74, 19, 13, 17, 2, 1, 7, 12] },
    { name: 'Sésame', values: [88, 45, 66, 62, 1, 2, 78, 37], superfood: true },
    { name: 'Baobab', values: [29, 12, 49, 22, 13, 100, 83, 27], superfood: true },
    { name: 'Feuilles de manioc', values: [27, 34, 84, 44, 75, 61, 62, 53] },
    { name: 'Poisson séché', values: [42, 92, 55, 67, 11, 0, 100, 18] },
    { name: 'Haricot bambara', values: [49, 74, 66, 54, 2, 4, 23, 59], superfood: true },
    { name: 'Taro', values: [62, 9, 11, 13, 3, 18, 15, 12] }
  ];

  const cropNames = ['Mil', 'Maïs', 'Riz', 'Sorgho', 'Légumineuses', 'Fonio'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const seasons = [
    { crop: 'Mil', plant: [4, 6], grow: [6, 9], harvest: [9, 11] },
    { crop: 'Maïs', plant: [2, 4], grow: [4, 7], harvest: [7, 9] },
    { crop: 'Riz', plant: [4, 6], grow: [6, 9], harvest: [9, 11] },
    { crop: 'Sorgho', plant: [4, 6], grow: [6, 9], harvest: [9, 11] },
    { crop: 'Niébé', plant: [4, 6], grow: [6, 8], harvest: [8, 10] },
    { crop: 'Fonio', plant: [4, 6], grow: [6, 9], harvest: [9, 10] },
    { crop: 'Arachide', plant: [3, 5], grow: [5, 8], harvest: [8, 10] },
    { crop: 'Patate douce', plant: [1, 4], grow: [4, 9], harvest: [8, 11] }
  ];

  const regionalAnchors = {
    production: 52.4,
    loss: 22,
    hdds: 4.2,
    fortificationCount: 3,
    biodiversity: 6200,
    households: 184200,
    lostTonnes: 11.5,
    lossValueBillion: 3.4
  };

  FAO.DATA = {
    countries,
    byCode: Object.fromEntries(countries.map((country) => [country.code, country])),
    districts,
    nutrients,
    foods,
    cropNames,
    months,
    seasons,
    regionalAnchors,
    fortificationFoods: [
      { key: 'salt', label: 'Sel iodé', value: 89, target: 90 },
      { key: 'flour', label: 'Farine de blé', value: 61, target: 80 },
      { key: 'oil', label: 'Huile enrichie', value: 45, target: 80 },
      { key: 'semolina', label: 'Semoule', value: 37, target: 80 },
      { key: 'milk', label: 'Lait', value: 26, target: 80 }
    ],
    priceCrops: ['Mil', 'Maïs', 'Riz', 'Sorgho'],
    sourceNote: 'Simulation pédagogique inspirée des formulaires de suivi mobile et de relais communautaires. À valider avec les enquêtes nationales et les tables FAO/INFOODS avant tout usage décisionnel.'
  };
})(window);
