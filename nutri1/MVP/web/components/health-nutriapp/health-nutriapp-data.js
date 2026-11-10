/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : health-nutriapp-data.js
 * Rôle    : Données JSON hardcodées — 16 pays d'Afrique de l'Ouest + districts.
 *
 * Source simulée : application mobile de suivi terrain NutriApp
 * (saisie par agents communautaires, cliniques mobiles, dépistages PB/MUAC,
 * enquêtes ménages et inventaires ATPE). Données 2024 de démonstration,
 * réalistes et cohérentes entre elles (les totaux régionaux sont la somme
 * exacte des pays : ex. 48 234 admissions, 47 ruptures sur 1 842 structures).
 *
 * Champs pays :
 *  admissions        → admissions CRENAS saisies dans NutriApp (2024)
 *  recovery/dropout  → % guérison / % abandon (références Sphère 75 % / 15 %)
 *  stockDays         → jours médians de stock ATPE (seuil critique : 30 j)
 *  ruptures/structures → points de distribution en rupture / suivis dans l'App
 *  obesity/hyper     → % obésité adulte / % hypertension liée au sel
 *  salt              → consommation moyenne de sel (g/jour)
 *  diabetes          → % diabète de type 2 (dépistages NutriApp)
 *  aneC/aneW/aneP    → % anémie enfants 6-59 m / femmes / femmes enceintes
 *  iron              → % couverture en suppléments de fer
 *  cpn               → % femmes enceintes vues en CPN dépistées (anémie)
 *  sync              → % fiches synchronisées dans les 24 h
 *  score             → score composite NutriApp (0-100, objectif 70)
 *  mas/mam/overw     → % MAS / MAM / surpoids (double fardeau)
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = (global.HealthNutriApp = global.HealthNutriApp || {});

  /* ------------------------------------------------------------------
   * Agrégats régionaux officiels (télémétrie NutriApp consolidée).
   * Utilisés en « Vue Globale » pour garantir les KPI de référence.
   * ------------------------------------------------------------------ */
  HA.DATA = {
    regional: {
      admissions: 48234, admissions2023: 43066,
      obesity: 14.2, obesity2023: 11.8,          // +2,4 pts vs 2023
      hyper: 27.8, salt: 9.4, diabetes: 6.6,
      ruptures: 47, structures: 1842,           // 2,6 % en rupture
      sync: 72,
      recovery: 78.4, dropout: 11.6,
      stockDays: 34, aneC: 62.4, iron: 58.2, cpn: 41, score: 62,
      /* Admissions mensuelles 2023 vs 2024 (soudure : juin → septembre) */
      monthly2023: [2680, 2590, 2840, 3120, 3620, 4420, 4780, 4920, 4480, 3720, 3050, 2846],
      monthly2024: [2850, 2720, 3010, 3340, 3980, 5120, 5680, 5910, 5340, 4120, 3280, 2884],
      /* Synchro mensuelle 2024 (%) — creux d'hivernage, pic de fin d'année */
      syncMonthly: [70, 72, 73, 71, 68, 65, 64, 65, 70, 76, 81, 85],
      /* Canaux de dépistage 2018 → 2024 (parts %, total 100 / an) */
      channels: {
        years: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
        cpn:  [38, 36, 34, 32, 30, 28, 26],
        pedi: [30, 29, 28, 27, 26, 25, 24],
        pb:   [22, 24, 26, 28, 31, 33, 35],
        auto: [10, 11, 12, 13, 13, 14, 15]
      },
      /* Dumbbell MNT 2015 vs 2024 */
      dumbbell: [
        { label: 'HTA liée au sel', v2015: 19.4, v2024: 27.8, unit: '%' },
        { label: 'Diabète type 2', v2015: 4.1, v2024: 6.6, unit: '%' },
        { label: 'Obésité adulte', v2015: 9.8, v2024: 14.2, unit: '%' },
        { label: 'Malnutrition chronique', v2015: 33.9, v2024: 28.4, unit: '%', invert: true }
      ],
      /* Funnel dépistage CPN (gap : 59 % de femmes non dépistées) */
      funnel: [
        { label: 'Enceintes vues en CPN', value: 186400 },
        { label: 'Dépistées anémie (Hb)', value: 76424 },
        { label: 'Anémie confirmée', value: 44326 },
        { label: 'Mises sous fer', value: 36347 },
        { label: 'Suivies à 30 jours', value: 23262 }
      ],
      /* Treemap comorbidités & MNT (cas enregistrés dans l'App) */
      treemap: [
        { label: 'Paludisme', value: 214500, group: 'infect' },
        { label: 'Diarrhée', value: 132700, group: 'infect' },
        { label: 'Hypertension artérielle', value: 124800, group: 'mnt' },
        { label: 'IRA', value: 98600, group: 'infect' },
        { label: 'Anémie sévère', value: 96300, group: 'nut' },
        { label: 'Malnutrition aiguë', value: 48234, group: 'nut' },
        { label: 'Diabète', value: 48200, group: 'mnt' },
        { label: 'Obésité morbide', value: 18900, group: 'mnt' }
      ],
      /* Double fardeau (parts %, total 100) */
      stacked: { mas: 18, mam: 27, overw: 22, obes: 14, hta: 19 }
    },

    /* ----------------------------------------------------------------
     * Les 16 pays (totaux cohérents avec l'agrégat régional).
     * ---------------------------------------------------------------- */
    countries: [
      { code: 'NE', name: 'Niger',          admissions: 12450, recovery: 78, dropout: 12, stockDays: 22, ruptures: 12, structures: 252, obesity: 9.8,  hyper: 24.1, salt: 8.4,  diabetes: 5.2, aneC: 68, aneW: 52, aneP: 61, aneA: 49, iron: 54, cpn: 34, sync: 66, score: 58, mas: 24, mam: 31, overw: 18, cpnCov: 34 },
      { code: 'ML', name: 'Mali',           admissions: 4210,  recovery: 81, dropout: 10, stockDays: 35, ruptures: 5,  structures: 170, obesity: 10.4, hyper: 25.6, salt: 8.7,  diabetes: 5.8, aneC: 64, aneW: 49, aneP: 58, aneA: 46, iron: 58, cpn: 38, sync: 70, score: 62, mas: 21, mam: 29, overw: 19, cpnCov: 38 },
      { code: 'BF', name: 'Burkina Faso',   admissions: 3850,  recovery: 83, dropout: 9,  stockDays: 41, ruptures: 4,  structures: 150, obesity: 9.2,  hyper: 23.8, salt: 8.1,  diabetes: 5.1, aneC: 62, aneW: 47, aneP: 55, aneA: 44, iron: 61, cpn: 44, sync: 74, score: 66, mas: 19, mam: 28, overw: 20, cpnCov: 44 },
      { code: 'SN', name: 'Sénégal',        admissions: 2740,  recovery: 86, dropout: 7,  stockDays: 52, ruptures: 2,  structures: 136, obesity: 15.6, hyper: 28.4, salt: 9.2,  diabetes: 6.9, aneC: 55, aneW: 42, aneP: 49, aneA: 39, iron: 68, cpn: 52, sync: 79, score: 72, mas: 14, mam: 24, overw: 24, cpnCov: 52 },
      { code: 'GN', name: 'Guinée',         admissions: 2680,  recovery: 74, dropout: 14, stockDays: 28, ruptures: 3,  structures: 140, obesity: 11.8, hyper: 26.9, salt: 9.0,  diabetes: 6.1, aneC: 66, aneW: 51, aneP: 59, aneA: 47, iron: 52, cpn: 36, sync: 64, score: 55, mas: 22, mam: 30, overw: 20, cpnCov: 36 },
      { code: 'CI', name: "Côte d'Ivoire",  admissions: 2450,  recovery: 84, dropout: 8,  stockDays: 48, ruptures: 2,  structures: 140, obesity: 16.2, hyper: 29.3, salt: 9.6,  diabetes: 7.4, aneC: 58, aneW: 44, aneP: 51, aneA: 41, iron: 66, cpn: 49, sync: 76, score: 70, mas: 15, mam: 25, overw: 23, cpnCov: 49 },
      { code: 'GH', name: 'Ghana',          admissions: 1980,  recovery: 87, dropout: 6,  stockDays: 61, ruptures: 1,  structures: 118, obesity: 18.9, hyper: 30.2, salt: 10.1, diabetes: 8.2, aneC: 52, aneW: 40, aneP: 46, aneA: 37, iron: 71, cpn: 55, sync: 82, score: 76, mas: 12, mam: 22, overw: 25, cpnCov: 55 },
      { code: 'NG', name: 'Nigeria',        admissions: 8930,  recovery: 76, dropout: 13, stockDays: 25, ruptures: 7,  structures: 230, obesity: 13.4, hyper: 28.8, salt: 9.4,  diabetes: 6.6, aneC: 63, aneW: 50, aneP: 57, aneA: 46, iron: 56, cpn: 39, sync: 68, score: 59, mas: 20, mam: 28, overw: 22, cpnCov: 39 },
      { code: 'MR', name: 'Mauritanie',     admissions: 1620,  recovery: 79, dropout: 11, stockDays: 33, ruptures: 2,  structures: 84,  obesity: 19.5, hyper: 31.5, salt: 10.8, diabetes: 8.9, aneC: 57, aneW: 43, aneP: 50, aneA: 40, iron: 60, cpn: 42, sync: 69, score: 63, mas: 13, mam: 23, overw: 26, cpnCov: 42 },
      { code: 'SL', name: 'Sierra Leone',   admissions: 1320,  recovery: 72, dropout: 16, stockDays: 24, ruptures: 2,  structures: 76,  obesity: 12.1, hyper: 27.2, salt: 8.9,  diabetes: 5.9, aneC: 69, aneW: 53, aneP: 62, aneA: 50, iron: 50, cpn: 33, sync: 62, score: 52, mas: 23, mam: 30, overw: 19, cpnCov: 33 },
      { code: 'LR', name: 'Liberia',        admissions: 980,   recovery: 71, dropout: 17, stockDays: 21, ruptures: 1,  structures: 56,  obesity: 12.8, hyper: 26.4, salt: 8.6,  diabetes: 5.7, aneC: 67, aneW: 52, aneP: 60, aneA: 48, iron: 48, cpn: 31, sync: 60, score: 50, mas: 23, mam: 31, overw: 19, cpnCov: 31 },
      { code: 'GW', name: 'Guinée-Bissau',  admissions: 760,   recovery: 69, dropout: 18, stockDays: 19, ruptures: 1,  structures: 44,  obesity: 11.2, hyper: 25.1, salt: 8.3,  diabetes: 5.4, aneC: 70, aneW: 54, aneP: 63, aneA: 51, iron: 46, cpn: 29, sync: 58, score: 47, mas: 24, mam: 32, overw: 18, cpnCov: 29 },
      { code: 'GM', name: 'Gambie',         admissions: 620,   recovery: 85, dropout: 7,  stockDays: 55, ruptures: 0,  structures: 40,  obesity: 14.6, hyper: 27.9, salt: 9.1,  diabetes: 6.3, aneC: 54, aneW: 41, aneP: 48, aneA: 38, iron: 69, cpn: 54, sync: 81, score: 71, mas: 14, mam: 24, overw: 23, cpnCov: 54 },
      { code: 'BJ', name: 'Bénin',          admissions: 1890,  recovery: 82, dropout: 9,  stockDays: 44, ruptures: 2,  structures: 100, obesity: 13.9, hyper: 28.1, salt: 9.3,  diabetes: 6.8, aneC: 60, aneW: 45, aneP: 53, aneA: 42, iron: 64, cpn: 46, sync: 75, score: 68, mas: 17, mam: 26, overw: 22, cpnCov: 46 },
      { code: 'TG', name: 'Togo',           admissions: 1450,  recovery: 80, dropout: 10, stockDays: 38, ruptures: 2,  structures: 90,  obesity: 13.1, hyper: 27.5, salt: 9.0,  diabetes: 6.2, aneC: 61, aneW: 46, aneP: 54, aneA: 43, iron: 62, cpn: 43, sync: 73, score: 65, mas: 18, mam: 27, overw: 21, cpnCov: 43 },
      { code: 'CV', name: 'Cap-Vert',       admissions: 304,   recovery: 89, dropout: 5,  stockDays: 68, ruptures: 1,  structures: 16,  obesity: 17.4, hyper: 29.8, salt: 9.8,  diabetes: 7.8, aneC: 48, aneW: 36, aneP: 42, aneA: 33, iron: 76, cpn: 61, sync: 86, score: 80, mas: 10, mam: 20, overw: 26, cpnCov: 61 }
    ],

    /* ----------------------------------------------------------------
     * Districts / provinces par pays (noms réels, découpage administratif).
     * Les indicateurs par district sont dérivés dans le modèle de façon
     * déterministe (bruit seedé) autour de la base pays — rendu stable.
     * ---------------------------------------------------------------- */
    districts: {
      NE: ['Agadez', 'Diffa', 'Dosso', 'Maradi', 'Niamey', 'Tahoua', "Tillabéri", 'Zinder'],
      ML: ['Bamako', 'Gao', 'Kayes', 'Kidal', 'Koulikoro', 'Mopti', 'Ségou', 'Sikasso'],
      BF: ['Boucle du Mouhoun', 'Cascades', 'Centre', 'Est', 'Hauts-Bassins', 'Nord', 'Sahel', 'Sud-Ouest'],
      SN: ['Dakar', 'Diourbel', 'Kaolack', 'Louga', 'Saint-Louis', 'Tambacounda', 'Thiès', 'Ziguinchor'],
      GN: ['Boké', 'Conakry', 'Faranah', 'Kankan', 'Kindia', 'Labé', 'Mamou', 'Nzérékoré'],
      CI: ['Abidjan', 'Bas-Sassandra', 'Comoé', 'Denguélé', 'Gôh-Djiboua', 'Lacs', 'Lagunes', 'Sassandra-Marahoué'],
      GH: ['Accra', 'Ashanti', 'Brong-Ahafo', 'Central', 'Eastern', 'Northern', 'Volta', 'Western'],
      NG: ['Bauchi', 'Borno', 'Kaduna', 'Kano', 'Lagos', 'Oyo', 'Rivers', 'Sokoto'],
      MR: ['Dakhlet-Nouadhibou', 'Gorgol', 'Guidimagha', 'Hodh-Charghi', 'Nouakchott-Nord', 'Nouakchott-Sud', 'Tagant', 'Trarza'],
      SL: ['Bo', 'Bombali', 'Freetown', 'Kailahun', 'Kenema', 'Kono', 'Port Loko', 'Tonkolili'],
      LR: ['Bong', 'Grand Bassa', 'Grand Gedeh', 'Lofa', 'Margibi', 'Maryland', 'Montserrado', 'Nimba'],
      GW: ['Bafatá', 'Biombo', 'Bissau', 'Cacheu', 'Gabú', 'Oio', 'Quinara', 'Tombali'],
      GM: ['Banjul', 'Basse', 'Brikama', 'Janjanbureh', 'Kanifing', 'Kerewan', 'Kuntaur', 'Mansakonko'],
      BJ: ['Alibori', 'Atacora', 'Atlantique', 'Borgou', 'Littoral', 'Ouémé', 'Plateau', 'Zou'],
      TG: ['Centrale', 'Golfe', 'Kara', 'Lomé', 'Maritime', 'Plateaux', 'Savanes'],
      CV: ['Boa Vista', 'Fogo', 'Praia', 'Sal', 'Santiago-Nord', 'Santo Antão', 'São Vicente', 'Barlavento']
    }
  };
})(window);
