/* ============================================================================
 * NutriApp Santé · health-nutriapp-data.js
 * Rôle : données de référence (JSON hardcodé) du tableau de bord du Ministère
 *        de la Santé — 16 pays d'Afrique de l'Ouest, issus de l'application
 *        mobile terrain NutriApp (agents communautaires, cliniques mobiles,
 *        relais terrain).
 *        Valeurs 2024 fournies par la spécification : admissions, guérison,
 *        ruptures ATPE, complétude (dhis2), score composite.
 *        Indicateurs complémentaires (abandon, décès, dépistage CPN, stocks,
 *        anémie, suppléments, profil nutritionnel, points de distribution)
 *        = jeu de démonstration cohérent.
 *        ⚠ À remplacer par l'API NutriApp en production.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = (global.NutriHealth = global.NutriHealth || {});

  /* Identité visuelle du Ministère (couleurs exclusives) */
  NH.THEME = {
    primary: '#7C3AED',    // violet médical
    secondary: '#06B6D4',  // cyan clinique
    tertiary: '#10B981',   // vert santé
    quaternary: '#F59E0B', // ambre avertissement
    danger: '#EF4444',     // rouge urgence
    indigo: '#6366F1',     // courbe 2024 des admissions
    purpleLight: '#A855F7',
    sidebar: '#1E0A3C',
    bg: '#FAF5FF',
    border: '#DDD6FE',
    grid: '#F1F5F9',
    axis: '#E2E8F0',
    label: '#94A3B8',
    value: '#334155',
    title: '#1E293B',
    body: '#64748B'
  };

  /* Zones de filtrage (chips cliquables) */
  NH.ZONES = [
    { id: 'all', label: 'Toutes les zones', color: '#7C3AED' },
    { id: 'sahel', label: 'Sahel & AES', color: '#F59E0B' },
    { id: 'cotiere', label: 'Côtière francophone', color: '#06B6D4' },
    { id: 'anglo', label: 'Anglophone', color: '#10B981' },
    { id: 'lusophone', label: 'Lusophone & îles', color: '#A855F7' }
  ];

  /* Saisonnalité des admissions : profil mensuel (soudure Juin–Sept) */
  NH.SEASON_2024 = [0.060, 0.050, 0.052, 0.062, 0.072, 0.088, 0.112, 0.124, 0.118, 0.098, 0.068, 0.056];
  NH.SEASON_2023 = [0.066, 0.058, 0.056, 0.064, 0.070, 0.082, 0.096, 0.104, 0.102, 0.092, 0.080, 0.070];
  NH.MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  NH.YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

  /* Pays — adm : admissions CRENAS 2024 · guer : guérison % · rupture : structures
   * en rupture ATPE · dhis2 : complétude / synchro % · score : score composite ·
   * pdv : points de distribution suivis (total 1 842) · abandon, deces, cpn (dépistage
   * CPN %), stock (jours de consommation), anem [femmes enceintes, enfants <5 ans,
   * femmes non enceintes] en %, suppl (couverture suppléments fer/AF %),
   * prof [MAS, MAM, Risque, Surpoids, Obésité] en % (le reste = normal). */
  NH.COUNTRIES = [
    { code: 'NE', name: 'Niger', zone: 'sahel', adm: 48234, guer: 86, rupture: 23, dhis2: 61, score: 22, pdv: 142, abandon: 9.8, deces: 2.1, cpn: 34, stock: 38, anem: [38.2, 52.4, 33.1], suppl: 46, prof: [4.1, 10.2, 21.5, 4.8, 1.6], districts: ['Tahoua', 'Maradi', 'Zinder', 'Dosso', 'Tillabéri', 'Diffa'] },
    { code: 'ML', name: 'Mali', zone: 'sahel', adm: 38920, guer: 82, rupture: 18, dhis2: 68, score: 35, pdv: 170, abandon: 11.4, deces: 2.6, cpn: 36, stock: 41, anem: [35.6, 56.8, 30.4], suppl: 51, prof: [3.6, 9.1, 20.3, 5.6, 1.9], districts: ['Kayes', 'Koulikoro', 'Ségou', 'Mopti', 'Sikasso', 'Gao'] },
    { code: 'BF', name: 'Burkina Faso', zone: 'sahel', adm: 29140, guer: 88, rupture: 12, dhis2: 74, score: 52, pdv: 115, abandon: 7.2, deces: 1.8, cpn: 40, stock: 52, anem: [33.9, 48.1, 29.8], suppl: 58, prof: [3.2, 8.4, 19.6, 6.9, 2.3], districts: ['Nord', 'Sahel', 'Centre-Nord', 'Est', 'Boucle du Mouhoun', 'Hauts-Bassins'] },
    { code: 'SN', name: 'Sénégal', zone: 'cotiere', adm: 18730, guer: 91, rupture: 5, dhis2: 88, score: 71, pdv: 106, abandon: 4.1, deces: 0.9, cpn: 58, stock: 63, anem: [24.6, 37.2, 22.4], suppl: 71, prof: [1.9, 5.6, 16.8, 9.8, 3.4], districts: ['Matam', 'Kaffrine', 'Tambacounda', 'Kolda', 'Ziguinchor', 'Louga'] },
    { code: 'NG', name: 'Nigeria', zone: 'anglo', adm: 124500, guer: 79, rupture: 67, dhis2: 58, score: 44, pdv: 494, abandon: 12.6, deces: 3.4, cpn: 35, stock: 27, anem: [41.5, 47.9, 37.8], suppl: 44, prof: [5.2, 11.6, 22.4, 7.4, 2.8], districts: ['Kano', 'Sokoto', 'Katsina', 'Borno', 'Lagos', 'Adamawa'] },
    { code: 'GH', name: 'Ghana', zone: 'anglo', adm: 11240, guer: 92, rupture: 3, dhis2: 91, score: 74, pdv: 77, abandon: 3.2, deces: 0.6, cpn: 62, stock: 68, anem: [21.8, 31.4, 20.6], suppl: 78, prof: [1.4, 4.2, 14.9, 12.1, 4.6], districts: ['Northern', 'Upper East', 'Volta', 'Ashanti', 'Greater Accra', 'Western'] },
    { code: 'CI', name: "Côte d'Ivoire", zone: 'cotiere', adm: 15400, guer: 89, rupture: 6, dhis2: 85, score: 68, pdv: 95, abandon: 5.4, deces: 1.2, cpn: 49, stock: 58, anem: [28.3, 39.6, 26.1], suppl: 63, prof: [2.4, 6.8, 17.7, 10.3, 3.9], districts: ['Savanes', 'Denguélé', 'Bas-Sassandra', 'Lagunes', 'Zanzan', 'Montagnes'] },
    { code: 'MR', name: 'Mauritanie', zone: 'sahel', adm: 9800, guer: 84, rupture: 9, dhis2: 70, score: 47, pdv: 70, abandon: 8.3, deces: 2.0, cpn: 38, stock: 44, anem: [36.7, 46.2, 31.5], suppl: 49, prof: [3.9, 9.6, 20.9, 6.1, 2.2], districts: ['Hodh Ech Chargui', 'Assaba', 'Gorgol', 'Trarza', 'Nouakchott', 'Tagant'] },
    { code: 'GN', name: 'Guinée', zone: 'cotiere', adm: 14200, guer: 85, rupture: 11, dhis2: 66, score: 48, pdv: 125, abandon: 9.1, deces: 2.4, cpn: 37, stock: 47, anem: [37.4, 50.6, 32.2], suppl: 52, prof: [4.0, 9.9, 21.1, 5.3, 1.9], districts: ['Kankan', 'Faranah', "N'Zérékoré", 'Labé', 'Boké', 'Mamou'] },
    { code: 'SL', name: 'Sierra Leone', zone: 'anglo', adm: 8700, guer: 87, rupture: 7, dhis2: 72, score: 50, pdv: 79, abandon: 6.8, deces: 1.7, cpn: 44, stock: 49, anem: [34.1, 44.7, 29.9], suppl: 56, prof: [2.8, 7.9, 19.0, 7.8, 2.6], districts: ['Northern', 'Eastern', 'Southern', 'Western Area', 'North West', 'Kenema'] },
    { code: 'LR', name: 'Liberia', zone: 'anglo', adm: 6200, guer: 84, rupture: 5, dhis2: 69, score: 51, pdv: 70, abandon: 7.9, deces: 1.9, cpn: 46, stock: 46, anem: [31.2, 41.3, 27.5], suppl: 55, prof: [2.9, 7.2, 18.4, 8.6, 3.1], districts: ['Nimba', 'Lofa', 'Grand Gedeh', 'Bong', 'Montserrado', 'Maryland'] },
    { code: 'GW', name: 'Guinée-Bissau', zone: 'lusophone', adm: 4100, guer: 81, rupture: 6, dhis2: 64, score: 46, pdv: 62, abandon: 10.2, deces: 2.8, cpn: 39, stock: 39, anem: [39.8, 49.9, 34.6], suppl: 48, prof: [4.3, 10.4, 21.8, 5.9, 2.0], districts: ['Bafatá', 'Gabú', 'Oio', 'Cacheu', 'Bissau', 'Quinara'] },
    { code: 'GM', name: 'Gambie', zone: 'anglo', adm: 3800, guer: 89, rupture: 2, dhis2: 79, score: 63, pdv: 56, abandon: 4.6, deces: 1.0, cpn: 57, stock: 55, anem: [25.3, 35.1, 23.8], suppl: 68, prof: [2.1, 6.1, 16.3, 10.6, 4.2], districts: ['West Coast', 'Upper River', 'Central River', 'North Bank', 'Lower River', 'Banjul'] },
    { code: 'BJ', name: 'Bénin', zone: 'cotiere', adm: 7900, guer: 90, rupture: 4, dhis2: 81, score: 54, pdv: 85, abandon: 5.9, deces: 1.3, cpn: 52, stock: 57, anem: [29.7, 40.2, 25.0], suppl: 64, prof: [2.3, 6.4, 16.9, 9.9, 3.6], districts: ['Alibori', 'Atacora', 'Borgou', 'Zou', 'Atlantique', 'Ouémé'] },
    { code: 'TG', name: 'Togo', zone: 'cotiere', adm: 6500, guer: 88, rupture: 4, dhis2: 83, score: 60, pdv: 79, abandon: 6.1, deces: 1.4, cpn: 51, stock: 53, anem: [30.2, 41.8, 26.3], suppl: 61, prof: [2.5, 6.9, 17.2, 9.2, 3.3], districts: ['Savanes', 'Kara', 'Centrale', 'Plateaux', 'Maritime', 'Lomé'] },
    { code: 'CV', name: 'Cap-Vert', zone: 'lusophone', adm: 800, guer: 95, rupture: 0, dhis2: 94, score: 85, pdv: 17, abandon: 1.1, deces: 0.2, cpn: 79, stock: 72, anem: [14.6, 18.9, 13.2], suppl: 88, prof: [0.6, 2.1, 9.4, 13.6, 5.8], districts: ['Santiago Norte', 'Santiago Sul', 'São Vicente', 'Sal', 'Santo Antão', 'Fogo'] }
  ];

  /* Seuils de référence */
  NH.SPHERE = { guerison: 75, abandon: 15 };
  NH.OBJECTIF_SCORE = 70;
  NH.OBJECTIF_CPN = 100;

  /* Synchronisation NutriApp (bandeau) */
  NH.SYNC = { minutesAgo: 4, fichesMois: 142800 };

  /* Comorbidités associées à la malnutrition (répartition régionale, %) */
  NH.COMORBIDITES = [
    { label: 'Diarrhée', value: 28, color: '#7C3AED' },
    { label: 'Paludisme', value: 22, color: '#06B6D4' },
    { label: 'Pneumonie', value: 18, color: '#10B981' },
    { label: 'Rougeole', value: 12, color: '#F59E0B' },
    { label: 'MAS directe', value: 11, color: '#EF4444' },
    { label: 'Autres', value: 9, color: '#A855F7' }
  ];

  /* Dumbbell 2015 → 2024 (registres NutriApp, %) */
  NH.DUMBBELL = [
    { label: 'Anémie', v2015: 46.0, v2024: 38.5 },
    { label: 'Diabète', v2015: 3.9, v2024: 5.6 },
    { label: 'Surpoids', v2015: 9.2, v2024: 12.1 },
    { label: 'Malnutrition', v2015: 15.4, v2024: 11.8 }
  ];

  /* Canaux de dépistage — valeur de référence 2024 (%) */
  NH.CANAUX = [
    { key: 'cpn', label: 'CPN (consultation prénatale)', color: '#7C3AED', v2024: 41 },
    { key: 'ped', label: 'Pédiatrie', color: '#06B6D4', v2024: 33 },
    { key: 'muac', label: 'PB/MUAC communautaire', color: '#10B981', v2024: 58 },
    { key: 'auto', label: 'Auto-dépistage mère', color: '#F59E0B', v2024: 14 }
  ];

  /* Groupes de l'enquête anémie */
  NH.ANEMIE_GROUPES = ['Femmes enceintes', 'Enfants < 5 ans', 'Femmes non enceintes'];

  /* Petits multiples : 6 métriques de tendance */
  NH.SMALL_MULTIPLES = [
    { key: 'mas', label: 'Admissions MAS', unit: '', color: '#7C3AED' },
    { key: 'guer', label: 'Guérison', unit: '%', color: '#10B981' },
    { key: 'ab', label: 'Abandon', unit: '%', color: '#F59E0B' },
    { key: 'dc', label: 'Décès', unit: '%', color: '#EF4444' },
    { key: 'stock', label: 'Stock ATPE', unit: 'j', color: '#06B6D4' },
    { key: 'cpn', label: 'Dépistage CPN', unit: '%', color: '#A855F7' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
