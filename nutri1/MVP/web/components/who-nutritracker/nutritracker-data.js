/* ============================================================================
 * NutriTracker West Africa · Surveillance Communautaire
 * Fichier : nutritracker-data.js
 * Rôle    : Données JSON hardcodées (16 pays d'Afrique de l'Ouest + districts).
 *
 * Source simulée : Application Mobile de Suivi Nutritionnel Terrain
 * (agents communautaires, relais, ONG — dépistages MUAC, z-score taille/âge,
 * questionnaires ANJE ménages). Données de démonstration réalistes 2024.
 *
 * Champs pays :
 *  stunting / wasting / anemia (%)       → prévalences (retard de croissance,
 *                                          émaciation PB<125mm, anémie)
 *  vitA, ironFolic, zinc, iodine, vitD, calcium (%) → couvertures micronutriments
 *  diversity (%)  → diversité alimentaire minimale (ANJE)
 *  ebf / earlyBF / mealFreq (%) → allaitement exclusif, mise au sein précoce,
 *                                 fréquence minimale des repas
 *  wash (score 0-100) → accès eau potable / hygiène du ménage (évalué dans l'app)
 *  earlyScreen (%)    → dépistage précoce (mesure dans les délais)
 *  agentCov (%)       → couverture en agents communautaires équipés de l'app
 *  recovery (%)       → taux de guérison / prise en charge rapide
 *  pop5 (millions)    → population d'enfants < 5 ans
 *  registered         → enfants enregistrés dans l'app
 *  stuntingHistory    → série 2014 → 2024 (11 valeurs)
 *  scoreTrend         → score global 2020 → 2024 (5 valeurs)
 *  zone               → profil saisonnier : sahel | coast | mixed
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = (global.NutriTracker = global.NutriTracker || {});

  NT.DATA = {
    /* Agrégats régionaux officiels (moyenne pondérée Afrique de l'Ouest, App) */
    regional: {
      byYear: {
        2022: { stunting: 31.2, wasting: 9.4, children: 742300, vitA: 58.9, alerts: 9, sync: 89.6, districtsOnTarget: 31, screenedMonth: 30120 },
        2023: { stunting: 30.5, wasting: 8.6, children: 1014800, vitA: 63.1, alerts: 9, sync: 92.1, districtsOnTarget: 41, screenedMonth: 37460 },
        2024: { stunting: 28.4, wasting: 8.9, children: 1248500, vitA: 67.3, alerts: 11, sync: 94.2, districtsOnTarget: 48, screenedMonth: 42850 }
      },
      districtsTotal: 120,
      /* Série régionale du stunting 2014 → 2024 */
      stuntingHistory: [33.9, 33.4, 33.0, 32.5, 32.1, 31.6, 32.4, 32.0, 31.2, 30.5, 28.4],
      /* Répartition MUAC régionale (graphique 5) */
      muac: { mas: 8.2, mam: 14.6, risk: 22.8, normal: 54.4 },
      /* Sévérité des foyers d'alerte (KPI 5) : sévère / modéré / sous contrôle */
      alertSeverity: { severe: 4, moderate: 7, controlled: 5 },
      /* Cascade d'impact (graphique 7) — cohorte des zones prioritaires suivies */
      cascade: { start: 47, end: 38, steps: [
        { label: 'Visites ménages ANJE', value: -2.1 },
        { label: 'Suivi Vitamine A', value: -1.8 },
        { label: 'Eau & Hygiène', value: -1.4 },
        { label: 'Prise en charge précoce', value: -2.3 },
        { label: 'Autres facteurs contextuels', value: -1.4 }
      ] }
    },

    /* Profils saisonniers (coefficients mensuels Jan → Déc) */
    seasonality: {
      sahel: [0.62, 0.58, 0.60, 0.66, 0.80, 1.05, 1.38, 1.62, 1.44, 1.02, 0.74, 0.65],
      coast: [0.82, 0.80, 0.86, 0.94, 1.02, 1.12, 1.18, 1.16, 1.06, 0.96, 0.90, 0.86],
      mixed: [0.70, 0.66, 0.70, 0.78, 0.90, 1.10, 1.30, 1.46, 1.32, 1.00, 0.80, 0.72]
    },

  countries: [
    {code:"NE",name:"Niger",zone:"sahel",stunting:47,wasting:14.8,anemia:72,vitA:68,score:22,pop5:5,registered:168200,iodine:55,diversity:9,ebf:23,earlyBF:53,mealFreq:39,wash:28,earlyScreen:58,agentCov:54,recovery:71,ironFolic:41,zinc:32,vitD:18,calcium:12,overweight:2.8,stuntingHistory:[52.8,52.3,52.2,51.5,50.6,49.8,50.9,49.5,48.3,47.3,47],scoreTrend:[13,15,16,20,22]},
    {code:"ML",name:"Mali",zone:"sahel",stunting:38,wasting:12.3,anemia:65,vitA:71,score:35,pop5:4,registered:121500,iodine:79,diversity:13,ebf:40,earlyBF:53,mealFreq:34,wash:38,earlyScreen:62,agentCov:61,recovery:75,ironFolic:45,zinc:36,vitD:22,calcium:15,overweight:1.9,stuntingHistory:[41.2,41,40.9,40.4,40.2,39.5,40.5,40,38.4,38.4,38],scoreTrend:[28,31,32,33,35]},
    {code:"BF",name:"Burkina Faso",zone:"sahel",stunting:29,wasting:8.1,anemia:58,vitA:79,score:52,pop5:3.5,registered:109800,iodine:87,diversity:22,ebf:64,earlyBF:59,mealFreq:51,wash:42,earlyScreen:71,agentCov:72,recovery:82,ironFolic:58,zinc:49,vitD:28,calcium:19,overweight:1.7,stuntingHistory:[35.6,34.9,34.2,33.5,33.3,32.5,32.9,31.6,30.6,29.5,29],scoreTrend:[44,47,48,50,52]},
    {code:"SN",name:"Sénégal",zone:"sahel",stunting:17,wasting:7.2,anemia:49,vitA:83,score:71,pop5:2.6,registered:71600,iodine:61,diversity:32,ebf:41,earlyBF:34,mealFreq:53,wash:64,earlyScreen:79,agentCov:81,recovery:88,ironFolic:69,zinc:55,vitD:41,calcium:31,overweight:2.4,stuntingHistory:[21.1,20.7,20.2,19.8,19.2,18.7,19.6,18.8,17.7,17.2,17],scoreTrend:[64,64,66,70,71]},
    {code:"GN",name:"Guinée",zone:"coast",stunting:31,wasting:9.3,anemia:63,vitA:74,score:48,pop5:2.1,registered:62400,iodine:61,diversity:18,ebf:33,earlyBF:34,mealFreq:39,wash:40,earlyScreen:64,agentCov:63,recovery:78,ironFolic:52,zinc:40,vitD:27,calcium:18,overweight:4.1,stuntingHistory:[33.8,33.4,33.5,33,32.5,32.6,33.5,32.3,31.4,31.3,31],scoreTrend:[43,43,43,44,48]},
    {code:"CI",name:"Côte d'Ivoire",zone:"coast",stunting:21,wasting:6.8,anemia:51,vitA:81,score:68,pop5:4.3,registered:86300,iodine:82,diversity:24,ebf:34,earlyBF:37,mealFreq:46,wash:61,earlyScreen:74,agentCov:76,recovery:85,ironFolic:63,zinc:51,vitD:38,calcium:27,overweight:3,stuntingHistory:[29.7,29,28.1,26.9,26.3,25.3,25.8,24.4,22.4,22.1,21],scoreTrend:[59,60,65,65,68]},
    {code:"GH",name:"Ghana",zone:"coast",stunting:18,wasting:5.7,anemia:42,vitA:79,score:74,pop5:4.1,registered:74100,iodine:69,diversity:36,ebf:43,earlyBF:52,mealFreq:56,wash:66,earlyScreen:81,agentCov:83,recovery:89,ironFolic:71,zinc:58,vitD:44,calcium:34,overweight:2.6,stuntingHistory:[27,26.3,25.1,24.3,23.2,22.6,23.3,21.1,19.9,19,18],scoreTrend:[65,70,68,72,74]},
    {code:"NG",name:"Nigeria",zone:"mixed",stunting:37,wasting:7.2,anemia:55,vitA:58,score:44,pop5:33,registered:322400,iodine:93,diversity:25,ebf:29,earlyBF:42,mealFreq:41,wash:47,earlyScreen:59,agentCov:57,recovery:74,ironFolic:47,zinc:38,vitD:25,calcium:17,overweight:2.2,stuntingHistory:[41.4,41.3,40.6,40.1,40,39.5,40.2,39,38.2,37.5,37],scoreTrend:[40,39,40,42,44]},
    {code:"MR",name:"Mauritanie",zone:"sahel",stunting:28,wasting:15.1,anemia:60,vitA:66,score:47,pop5:0.75,registered:31200,iodine:44,diversity:19,ebf:41,earlyBF:70,mealFreq:37,wash:45,earlyScreen:63,agentCov:60,recovery:72,ironFolic:49,zinc:41,vitD:24,calcium:16,overweight:3.1,stuntingHistory:[30.7,30.4,30,30.1,29.8,29.1,30.5,29.9,28.6,28.3,28],scoreTrend:[38,41,44,44,47]},
    {code:"SL",name:"Sierra Leone",zone:"coast",stunting:29,wasting:6.4,anemia:67,vitA:72,score:50,pop5:1.2,registered:38700,iodine:80,diversity:18,ebf:53,earlyBF:75,mealFreq:42,wash:43,earlyScreen:68,agentCov:69,recovery:80,ironFolic:56,zinc:46,vitD:31,calcium:22,overweight:7,stuntingHistory:[36.6,35.7,35.2,34.2,33.4,32.9,33.2,32.2,30.6,29.6,29],scoreTrend:[44,45,47,48,50]},
    {code:"LR",name:"Liberia",zone:"coast",stunting:32,wasting:5.3,anemia:56,vitA:69,score:51,pop5:0.8,registered:27600,iodine:71,diversity:15,ebf:55,earlyBF:61,mealFreq:40,wash:46,earlyScreen:66,agentCov:66,recovery:79,ironFolic:54,zinc:44,vitD:29,calcium:20,overweight:4.7,stuntingHistory:[37.7,37.3,36.4,36,35.6,34.7,35.3,34.6,33.1,32.6,32],scoreTrend:[40,44,46,48,51]},
    {code:"GW",name:"Guinée-Bissau",zone:"coast",stunting:28,wasting:7.1,anemia:61,vitA:64,score:46,pop5:0.3,registered:15300,iodine:47,diversity:17,ebf:59,earlyBF:33,mealFreq:38,wash:41,earlyScreen:63,agentCov:62,recovery:77,ironFolic:50,zinc:39,vitD:26,calcium:17,overweight:2.8,stuntingHistory:[31,30.9,30.8,30,30.2,29.3,30.4,29.7,28.7,28,28],scoreTrend:[40,42,42,44,46]},
    {code:"GM",name:"Gambie",zone:"sahel",stunting:19,wasting:11.2,anemia:52,vitA:77,score:63,pop5:0.37,registered:17400,iodine:70,diversity:29,ebf:54,earlyBF:61,mealFreq:47,wash:58,earlyScreen:75,agentCov:77,recovery:84,ironFolic:64,zinc:52,vitD:36,calcium:26,overweight:1.9,stuntingHistory:[23.1,22.9,22.3,22.3,21.8,21.2,22,21.4,19.9,19.2,19],scoreTrend:[54,55,58,61,63]},
    {code:"BJ",name:"Bénin",zone:"coast",stunting:34,wasting:5.1,anemia:54,vitA:76,score:54,pop5:2.1,registered:54800,iodine:86,diversity:26,ebf:42,earlyBF:54,mealFreq:48,wash:50,earlyScreen:72,agentCov:73,recovery:83,ironFolic:60,zinc:48,vitD:33,calcium:23,overweight:1.9,stuntingHistory:[41.4,40.4,39.8,39.2,38.2,37.4,37.6,36.9,35.4,34.7,34],scoreTrend:[47,50,50,52,54]},
    {code:"TG",name:"Togo",zone:"coast",stunting:27,wasting:6.3,anemia:50,vitA:78,score:60,pop5:1.3,registered:41900,iodine:77,diversity:27,ebf:64,earlyBF:61,mealFreq:50,wash:53,earlyScreen:76,agentCov:78,recovery:86,ironFolic:65,zinc:53,vitD:37,calcium:28,overweight:2,stuntingHistory:[32.3,31.9,31.4,30.4,29.8,29.5,30.4,29.3,27.8,27.7,27],scoreTrend:[51,55,57,58,60]},
    {code:"CV",name:"Cap-Vert",zone:"coast",stunting:9,wasting:2.1,anemia:31,vitA:89,score:85,pop5:0.05,registered:5300,iodine:88,diversity:52,ebf:60,earlyBF:73,mealFreq:68,wash:86,earlyScreen:92,agentCov:94,recovery:95,ironFolic:84,zinc:72,vitD:58,calcium:49,overweight:6.5,stuntingHistory:[11.1,10.3,10.3,10.1,10.2,9.6,10.5,10.2,9.4,9.1,9],scoreTrend:[79,79,82,84,85]}
  ],
  districts: {
    NE: [
      {name:"Maradi",stunting:61.1,wasting:19.7,anemia:83.3,vitA:61,diversity:10,ebf:21,wash:19,earlyScreen:45,agentCov:45,recovery:66,score:11,pop5:407463,registered:13707,scoreTrend:[5,5,8,9,11]},
      {name:"Zinder",stunting:55.2,wasting:17.7,anemia:77.3,vitA:60,diversity:9,ebf:19,wash:22,earlyScreen:51,agentCov:46,recovery:64,score:16,pop5:554739,registered:18661,scoreTrend:[10,14,12,16,16]},
      {name:"Diffa",stunting:54.8,wasting:18,anemia:78.9,vitA:65,diversity:8,ebf:24,wash:25,earlyScreen:52,agentCov:46,recovery:69,score:19,pop5:346637,registered:11661,scoreTrend:[15,15,16,19,19]},
      {name:"Tillabéri",stunting:41.1,wasting:13,anemia:69.4,vitA:74,diversity:9,ebf:24,wash:29,earlyScreen:64,agentCov:59,recovery:73,score:28,pop5:332698,registered:11192,scoreTrend:[21,22,25,26,28]},
      {name:"Tahoua",stunting:40.5,wasting:13.2,anemia:68.9,vitA:71,diversity:8,ebf:23,wash:30,earlyScreen:64,agentCov:56,recovery:72,score:27,pop5:207757,registered:6989,scoreTrend:[18,23,21,25,27]},
      {name:"Dosso",stunting:41.9,wasting:12.9,anemia:67.8,vitA:71,diversity:10,ebf:24,wash:28,earlyScreen:60,agentCov:55,recovery:74,score:26,pop5:387445,registered:13034,scoreTrend:[15,20,22,22,26]},
      {name:"Agadez",stunting:40.6,wasting:12.7,anemia:65.4,vitA:73,diversity:11,ebf:21,wash:28,earlyScreen:64,agentCov:61,recovery:73,score:24,pop5:266822,registered:8976,scoreTrend:[17,16,21,20,24]},
      {name:"Niamey",stunting:33,wasting:9.5,anemia:61.1,vitA:81,diversity:14,ebf:25,wash:38,earlyScreen:66,agentCov:68,recovery:76,score:32,pop5:1111358,registered:37386,scoreTrend:[24,26,31,30,32]},
      {name:"Magaria",stunting:53.8,wasting:17.7,anemia:78.8,vitA:65,diversity:8,ebf:21,wash:22,earlyScreen:52,agentCov:48,recovery:69,score:18,pop5:280337,registered:9431,scoreTrend:[10,11,14,15,18]},
      {name:"Dakoro",stunting:53.1,wasting:17.2,anemia:76.9,vitA:61,diversity:9,ebf:23,wash:25,earlyScreen:56,agentCov:52,recovery:66,score:16,pop5:477312,registered:16057,scoreTrend:[10,13,12,16,16]},
      {name:"Mirriah",stunting:58.2,wasting:19.4,anemia:80.7,vitA:57,diversity:8,ebf:20,wash:20,earlyScreen:50,agentCov:45,recovery:67,score:12,pop5:412595,registered:13880,scoreTrend:[9,7,7,9,12]},
      {name:"Tessaoua",stunting:53.9,wasting:17.7,anemia:77.6,vitA:61,diversity:8,ebf:21,wash:23,earlyScreen:51,agentCov:48,recovery:68,score:16,pop5:214837,registered:7227,scoreTrend:[7,8,13,14,16]}
    ],
    ML: [
      {name:"Kayes",stunting:25.6,wasting:7.2,anemia:54.1,vitA:83,diversity:16,ebf:47,wash:47,earlyScreen:77,agentCov:78,recovery:84,score:54,pop5:419939,registered:12756,scoreTrend:[44,50,50,53,54]},
      {name:"Koulikoro",stunting:36.6,wasting:12.3,anemia:63.2,vitA:71,diversity:14,ebf:43,wash:37,earlyScreen:62,agentCov:63,recovery:75,score:36,pop5:383629,registered:11653,scoreTrend:[29,32,33,35,36]},
      {name:"Sikasso",stunting:35.8,wasting:11.4,anemia:61.6,vitA:74,diversity:13,ebf:39,wash:39,earlyScreen:66,agentCov:64,recovery:76,score:42,pop5:200395,registered:6087,scoreTrend:[32,39,36,40,42]},
      {name:"Ségou",stunting:35.4,wasting:10.6,anemia:61.1,vitA:76,diversity:16,ebf:40,wash:38,earlyScreen:65,agentCov:66,recovery:76,score:39,pop5:171428,registered:5207,scoreTrend:[28,36,34,38,39]},
      {name:"Mopti",stunting:51.1,wasting:17.3,anemia:73.3,vitA:63,diversity:10,ebf:32,wash:30,earlyScreen:52,agentCov:49,recovery:64,score:15,pop5:388914,registered:11813,scoreTrend:[7,8,10,13,15]},
      {name:"Tombouctou",stunting:47.4,wasting:16.2,anemia:70.6,vitA:59,diversity:9,ebf:38,wash:30,earlyScreen:50,agentCov:47,recovery:67,score:19,pop5:386674,registered:11745,scoreTrend:[9,10,14,19,19]},
      {name:"Gao",stunting:44.2,wasting:14.7,anemia:70.5,vitA:65,diversity:14,ebf:40,wash:34,earlyScreen:58,agentCov:51,recovery:73,score:28,pop5:372929,registered:11328,scoreTrend:[17,24,24,27,28]},
      {name:"Kidal",stunting:41.5,wasting:13.4,anemia:67.9,vitA:66,diversity:11,ebf:37,wash:35,earlyScreen:60,agentCov:56,recovery:70,score:28,pop5:310811,registered:9441,scoreTrend:[24,24,24,28,28]},
      {name:"Bamako",stunting:25.1,wasting:7.9,anemia:57.3,vitA:81,diversity:17,ebf:48,wash:48,earlyScreen:76,agentCov:77,recovery:81,score:52,pop5:826533,registered:25106,scoreTrend:[46,47,49,50,52]},
      {name:"Ménaka",stunting:44.8,wasting:15.1,anemia:72.3,vitA:65,diversity:13,ebf:37,wash:34,earlyScreen:57,agentCov:54,recovery:69,score:21,pop5:344534,registered:10465,scoreTrend:[16,15,19,19,21]},
      {name:"Taoudénit",stunting:40.6,wasting:13.4,anemia:67.8,vitA:66,diversity:9,ebf:37,wash:38,earlyScreen:56,agentCov:57,recovery:74,score:28,pop5:194215,registered:5899,scoreTrend:[25,20,26,27,28]}
    ],
    BF: [
      {name:"Boucle du Mouhoun",stunting:19,wasting:5.1,anemia:50.5,vitA:94,diversity:30,ebf:75,wash:53,earlyScreen:83,agentCov:89,recovery:91,score:78,pop5:438088,registered:13743,scoreTrend:[71,75,76,75,78]},
      {name:"Cascades",stunting:27.3,wasting:7.3,anemia:57.7,vitA:79,diversity:22,ebf:69,wash:47,earlyScreen:76,agentCov:72,recovery:84,score:56,pop5:181985,registered:5709,scoreTrend:[52,52,55,55,56]},
      {name:"Centre",stunting:18.9,wasting:4.4,anemia:47.2,vitA:91,diversity:30,ebf:71,wash:55,earlyScreen:86,agentCov:90,recovery:92,score:79,pop5:567194,registered:17794,scoreTrend:[71,72,74,76,79]},
      {name:"Centre-Est",stunting:31.9,wasting:8.8,anemia:59.7,vitA:79,diversity:21,ebf:64,wash:38,earlyScreen:68,agentCov:69,recovery:78,score:46,pop5:354050,registered:11107,scoreTrend:[43,43,40,44,46]},
      {name:"Centre-Nord",stunting:37.7,wasting:10.8,anemia:66.3,vitA:68,diversity:19,ebf:55,wash:35,earlyScreen:58,agentCov:60,recovery:74,score:27,pop5:145105,registered:4552,scoreTrend:[23,22,23,24,27]},
      {name:"Centre-Ouest",stunting:29.8,wasting:8.3,anemia:59.8,vitA:75,diversity:18,ebf:64,wash:40,earlyScreen:67,agentCov:68,recovery:80,score:50,pop5:311226,registered:9764,scoreTrend:[39,47,48,46,50]},
      {name:"Centre-Sud",stunting:28.8,wasting:8,anemia:56.5,vitA:83,diversity:23,ebf:66,wash:42,earlyScreen:70,agentCov:76,recovery:83,score:53,pop5:192451,registered:6037,scoreTrend:[48,47,50,52,53]},
      {name:"Est",stunting:36.9,wasting:10.4,anemia:64.2,vitA:70,diversity:20,ebf:59,wash:33,earlyScreen:60,agentCov:59,recovery:73,score:32,pop5:290987,registered:9129,scoreTrend:[26,27,29,29,32]},
      {name:"Hauts-Bassins",stunting:31.9,wasting:9.2,anemia:60.3,vitA:74,diversity:17,ebf:64,wash:42,earlyScreen:65,agentCov:70,recovery:82,score:42,pop5:137549,registered:4315,scoreTrend:[39,36,36,41,42]},
      {name:"Nord",stunting:34.5,wasting:9.8,anemia:62.2,vitA:70,diversity:20,ebf:59,wash:35,earlyScreen:61,agentCov:59,recovery:76,score:38,pop5:168156,registered:5275,scoreTrend:[27,30,33,36,38]},
      {name:"Plateau-Central",stunting:27.2,wasting:7.5,anemia:57,vitA:80,diversity:21,ebf:66,wash:43,earlyScreen:77,agentCov:74,recovery:85,score:55,pop5:168012,registered:5271,scoreTrend:[46,47,50,51,55]},
      {name:"Sahel",stunting:36.7,wasting:10.6,anemia:66.4,vitA:67,diversity:20,ebf:59,wash:34,earlyScreen:61,agentCov:62,recovery:73,score:34,pop5:209488,registered:6572,scoreTrend:[28,32,29,33,34]},
      {name:"Sud-Ouest",stunting:29.9,wasting:8.7,anemia:59,vitA:77,diversity:19,ebf:62,wash:38,earlyScreen:72,agentCov:72,recovery:78,score:49,pop5:335709,registered:10532,scoreTrend:[39,46,45,46,49]}
    ],
    SN: [
      {name:"Dakar",stunting:11.7,wasting:4.5,anemia:42.7,vitA:96,diversity:44,ebf:47,wash:82,earlyScreen:95,agentCov:98,recovery:98,score:96,pop5:376760,registered:10375,scoreTrend:[90,91,90,95,96]},
      {name:"Diourbel",stunting:16.7,wasting:6.9,anemia:48.6,vitA:84,diversity:36,ebf:42,wash:66,earlyScreen:83,agentCov:85,recovery:87,score:71,pop5:237650,registered:6545,scoreTrend:[67,69,67,70,71]},
      {name:"Fatick",stunting:14.9,wasting:6,anemia:44.7,vitA:91,diversity:38,ebf:46,wash:68,earlyScreen:85,agentCov:87,recovery:93,score:89,pop5:122655,registered:3378,scoreTrend:[84,83,87,89,89]},
      {name:"Kaffrine",stunting:16.8,wasting:7,anemia:47.2,vitA:82,diversity:33,ebf:41,wash:63,earlyScreen:78,agentCov:80,recovery:90,score:74,pop5:250262,registered:6892,scoreTrend:[65,67,72,73,74]},
      {name:"Kaolack",stunting:16.7,wasting:7.2,anemia:50,vitA:82,diversity:34,ebf:41,wash:61,earlyScreen:78,agentCov:78,recovery:88,score:70,pop5:207113,registered:5704,scoreTrend:[63,65,65,67,70]},
      {name:"Kédougou",stunting:22.5,wasting:9.9,anemia:57.1,vitA:68,diversity:22,ebf:39,wash:45,earlyScreen:65,agentCov:61,recovery:79,score:35,pop5:213565,registered:5881,scoreTrend:[28,31,35,35,35]},
      {name:"Kolda",stunting:22.1,wasting:9.6,anemia:54.7,vitA:73,diversity:23,ebf:38,wash:50,earlyScreen:65,agentCov:65,recovery:82,score:39,pop5:150839,registered:4154,scoreTrend:[28,36,34,36,39]},
      {name:"Louga",stunting:16.9,wasting:7.4,anemia:47.7,vitA:81,diversity:34,ebf:41,wash:64,earlyScreen:80,agentCov:83,recovery:87,score:72,pop5:175244,registered:4826,scoreTrend:[63,69,70,72,72]},
      {name:"Matam",stunting:19.2,wasting:8.6,anemia:53.4,vitA:77,diversity:25,ebf:40,wash:55,earlyScreen:71,agentCov:71,recovery:85,score:58,pop5:109557,registered:3017,scoreTrend:[52,50,52,56,58]},
      {name:"Saint-Louis",stunting:15.9,wasting:6.6,anemia:48,vitA:86,diversity:35,ebf:41,wash:65,earlyScreen:80,agentCov:87,recovery:88,score:77,pop5:204476,registered:5631,scoreTrend:[66,75,76,75,77]},
      {name:"Sédhiou",stunting:18.5,wasting:7.7,anemia:51.2,vitA:78,diversity:28,ebf:39,wash:59,earlyScreen:76,agentCov:80,recovery:84,score:64,pop5:92441,registered:2546,scoreTrend:[54,60,60,63,64]},
      {name:"Tambacounda",stunting:21,wasting:9.3,anemia:53.9,vitA:74,diversity:23,ebf:35,wash:49,earlyScreen:67,agentCov:69,recovery:83,score:44,pop5:104618,registered:2881,scoreTrend:[36,35,42,41,44]},
      {name:"Thiès",stunting:16.3,wasting:6.9,anemia:48.1,vitA:86,diversity:35,ebf:39,wash:68,earlyScreen:81,agentCov:82,recovery:91,score:74,pop5:250282,registered:6892,scoreTrend:[69,68,70,71,74]},
      {name:"Ziguinchor",stunting:16.4,wasting:7.1,anemia:48.6,vitA:83,diversity:34,ebf:41,wash:62,earlyScreen:82,agentCov:82,recovery:89,score:70,pop5:104539,registered:2879,scoreTrend:[63,68,66,68,70]}
    ],
    GN: [
      {name:"Conakry",stunting:22.7,wasting:6.5,anemia:56.9,vitA:86,diversity:24,ebf:38,wash:50,earlyScreen:73,agentCov:74,recovery:85,score:68,pop5:372158,registered:11058,scoreTrend:[57,64,64,68,68]},
      {name:"Boké",stunting:29.2,wasting:8.5,anemia:62.1,vitA:75,diversity:17,ebf:35,wash:44,earlyScreen:67,agentCov:67,recovery:82,score:51,pop5:135890,registered:4038,scoreTrend:[42,48,48,51,51]},
      {name:"Faranah",stunting:37.6,wasting:11.6,anemia:70.8,vitA:68,diversity:17,ebf:32,wash:32,earlyScreen:57,agentCov:54,recovery:73,score:33,pop5:206588,registered:6139,scoreTrend:[25,23,30,32,33]},
      {name:"Kankan",stunting:38.4,wasting:12.5,anemia:71.4,vitA:66,diversity:13,ebf:30,wash:29,earlyScreen:55,agentCov:50,recovery:71,score:30,pop5:218281,registered:6486,scoreTrend:[20,22,26,29,30]},
      {name:"Kindia",stunting:34.2,wasting:10.5,anemia:64.8,vitA:70,diversity:17,ebf:34,wash:37,earlyScreen:63,agentCov:61,recovery:77,score:41,pop5:188010,registered:5587,scoreTrend:[39,33,36,40,41]},
      {name:"Labé",stunting:32,wasting:9.4,anemia:62.7,vitA:74,diversity:20,ebf:34,wash:38,earlyScreen:63,agentCov:60,recovery:75,score:47,pop5:125383,registered:3726,scoreTrend:[38,42,45,45,47]},
      {name:"Mamou",stunting:33.6,wasting:10.4,anemia:66.4,vitA:74,diversity:19,ebf:32,wash:38,earlyScreen:61,agentCov:58,recovery:78,score:41,pop5:185594,registered:5515,scoreTrend:[33,38,36,38,41]},
      {name:"Nzérékoré",stunting:26.4,wasting:7.9,anemia:59.3,vitA:80,diversity:21,ebf:36,wash:44,earlyScreen:72,agentCov:67,recovery:83,score:58,pop5:182053,registered:5410,scoreTrend:[52,50,55,58,58]},
      {name:"Siguiri",stunting:36.3,wasting:11.1,anemia:69.3,vitA:69,diversity:12,ebf:31,wash:35,earlyScreen:54,agentCov:53,recovery:71,score:33,pop5:238947,registered:7100,scoreTrend:[24,26,29,32,33]},
      {name:"Guéckédou",stunting:27.5,wasting:8.3,anemia:59.3,vitA:80,diversity:22,ebf:34,wash:40,earlyScreen:69,agentCov:66,recovery:80,score:52,pop5:247096,registered:7342,scoreTrend:[48,45,48,49,52]}
    ],
    CI: [
      {name:"Abidjan",stunting:14.2,wasting:4.4,anemia:43.1,vitA:92,diversity:30,ebf:38,wash:75,earlyScreen:86,agentCov:95,recovery:91,score:96,pop5:795055,registered:15957,scoreTrend:[90,91,94,94,96]},
      {name:"Bas-Sassandra",stunting:22.6,wasting:7.6,anemia:52.2,vitA:75,diversity:25,ebf:33,wash:58,earlyScreen:72,agentCov:69,recovery:80,score:59,pop5:157348,registered:3158,scoreTrend:[55,55,54,57,59]},
      {name:"Comoé",stunting:20.2,wasting:6.4,anemia:48.7,vitA:84,diversity:28,ebf:36,wash:66,earlyScreen:74,agentCov:76,recovery:83,score:71,pop5:186236,registered:3738,scoreTrend:[63,64,68,69,71]},
      {name:"Denguélé",stunting:26.5,wasting:9.3,anemia:57.9,vitA:68,diversity:18,ebf:32,wash:47,earlyScreen:59,agentCov:60,recovery:79,score:38,pop5:369444,registered:7415,scoreTrend:[32,30,37,37,38]},
      {name:"Gôh-Djiboua",stunting:20.5,wasting:6.9,anemia:51.5,vitA:81,diversity:26,ebf:32,wash:60,earlyScreen:77,agentCov:77,recovery:84,score:66,pop5:347720,registered:6979,scoreTrend:[60,60,59,65,66]},
      {name:"Lacs",stunting:17.9,wasting:5.8,anemia:48.5,vitA:84,diversity:25,ebf:35,wash:69,earlyScreen:82,agentCov:80,recovery:88,score:80,pop5:324231,registered:6507,scoreTrend:[74,74,77,77,80]},
      {name:"Lagunes",stunting:23,wasting:7.5,anemia:52.8,vitA:78,diversity:20,ebf:33,wash:55,earlyScreen:68,agentCov:72,recovery:83,score:58,pop5:163816,registered:3288,scoreTrend:[47,52,53,57,58]},
      {name:"Montagnes",stunting:21.1,wasting:7,anemia:50.6,vitA:79,diversity:22,ebf:31,wash:59,earlyScreen:73,agentCov:77,recovery:83,score:64,pop5:232765,registered:4672,scoreTrend:[59,61,59,63,64]},
      {name:"Sassandra-Marahoué",stunting:18.7,wasting:6,anemia:47.3,vitA:86,diversity:29,ebf:35,wash:68,earlyScreen:81,agentCov:84,recovery:90,score:80,pop5:209551,registered:4206,scoreTrend:[75,73,78,78,80]},
      {name:"Savanes",stunting:26.9,wasting:8.9,anemia:56.9,vitA:68,diversity:17,ebf:28,wash:49,earlyScreen:62,agentCov:61,recovery:79,score:36,pop5:292534,registered:5871,scoreTrend:[31,29,34,35,36]},
      {name:"Vallée du Bandama",stunting:22.9,wasting:7.4,anemia:52.6,vitA:77,diversity:23,ebf:34,wash:60,earlyScreen:71,agentCov:75,recovery:84,score:59,pop5:273291,registered:5485,scoreTrend:[56,55,53,57,59]},
      {name:"Woroba",stunting:22.7,wasting:7.3,anemia:52,vitA:78,diversity:21,ebf:32,wash:60,earlyScreen:72,agentCov:75,recovery:85,score:58,pop5:288744,registered:5795,scoreTrend:[47,52,55,56,58]},
      {name:"Yamoussoukro",stunting:22.9,wasting:7.4,anemia:51.6,vitA:81,diversity:21,ebf:36,wash:56,earlyScreen:72,agentCov:72,recovery:84,score:59,pop5:391162,registered:7851,scoreTrend:[49,51,56,57,59]},
      {name:"Zanzan",stunting:22.4,wasting:7.1,anemia:51.8,vitA:82,diversity:21,ebf:34,wash:61,earlyScreen:71,agentCov:74,recovery:86,score:63,pop5:268103,registered:5381,scoreTrend:[57,54,58,63,63]}
    ],
    GH: [
      {name:"Greater Accra",stunting:11.4,wasting:3,anemia:34.9,vitA:94,diversity:50,ebf:52,wash:86,earlyScreen:97,agentCov:98,recovery:98,score:96,pop5:401473,registered:7256,scoreTrend:[90,90,91,93,96]},
      {name:"Ashanti",stunting:16.9,wasting:5.2,anemia:41.2,vitA:80,diversity:39,ebf:41,wash:69,earlyScreen:86,agentCov:86,recovery:93,score:79,pop5:367739,registered:6646,scoreTrend:[67,71,78,75,79]},
      {name:"Western",stunting:16.2,wasting:5.1,anemia:40.5,vitA:81,diversity:39,ebf:41,wash:67,earlyScreen:86,agentCov:89,recovery:91,score:81,pop5:356145,registered:6437,scoreTrend:[74,79,76,78,81]},
      {name:"Central",stunting:18.8,wasting:6.3,anemia:42.2,vitA:79,diversity:34,ebf:39,wash:64,earlyScreen:78,agentCov:77,recovery:86,score:63,pop5:242749,registered:4387,scoreTrend:[55,56,57,60,63]},
      {name:"Eastern",stunting:16.3,wasting:5,anemia:39.9,vitA:85,diversity:37,ebf:45,wash:69,earlyScreen:84,agentCov:87,recovery:94,score:89,pop5:240933,registered:4354,scoreTrend:[81,86,83,85,89]},
      {name:"Volta",stunting:17.6,wasting:5.6,anemia:42.9,vitA:80,diversity:33,ebf:43,wash:64,earlyScreen:81,agentCov:85,recovery:90,score:71,pop5:338508,registered:6118,scoreTrend:[63,63,69,71,71]},
      {name:"Northern",stunting:20.4,wasting:6.7,anemia:44.6,vitA:72,diversity:34,ebf:38,wash:57,earlyScreen:75,agentCov:72,recovery:86,score:58,pop5:271812,registered:4913,scoreTrend:[47,56,54,55,58]},
      {name:"Savannah",stunting:22.8,wasting:7.4,anemia:46.9,vitA:67,diversity:29,ebf:40,wash:55,earlyScreen:70,agentCov:67,recovery:79,score:43,pop5:212968,registered:3849,scoreTrend:[35,41,41,42,43]},
      {name:"North East",stunting:23.5,wasting:7.6,anemia:47.9,vitA:65,diversity:29,ebf:38,wash:50,earlyScreen:69,agentCov:65,recovery:82,score:43,pop5:343825,registered:6214,scoreTrend:[36,37,41,41,43]},
      {name:"Upper East",stunting:20.8,wasting:6.7,anemia:45,vitA:75,diversity:32,ebf:39,wash:57,earlyScreen:71,agentCov:72,recovery:85,score:53,pop5:256441,registered:4635,scoreTrend:[43,45,51,50,53]},
      {name:"Upper West",stunting:23.9,wasting:7.8,anemia:48.3,vitA:69,diversity:29,ebf:37,wash:50,earlyScreen:66,agentCov:65,recovery:78,score:38,pop5:279250,registered:5047,scoreTrend:[29,35,35,35,38]},
      {name:"Bono",stunting:18.7,wasting:5.6,anemia:42.9,vitA:81,diversity:39,ebf:44,wash:63,earlyScreen:78,agentCov:81,recovery:88,score:73,pop5:329460,registered:5954,scoreTrend:[68,64,69,69,73]},
      {name:"Oti",stunting:17.1,wasting:5.1,anemia:41.1,vitA:81,diversity:39,ebf:42,wash:67,earlyScreen:84,agentCov:88,recovery:89,score:83,pop5:316108,registered:5713,scoreTrend:[71,79,82,83,83]},
      {name:"Ahafo",stunting:19.3,wasting:6.1,anemia:42.9,vitA:76,diversity:32,ebf:39,wash:65,earlyScreen:80,agentCov:80,recovery:87,score:65,pop5:142588,registered:2577,scoreTrend:[61,62,61,63,65]}
    ],
    NG: [
      {name:"Lagos",stunting:24.2,wasting:4.2,anemia:46.7,vitA:68,diversity:32,ebf:32,wash:61,earlyScreen:73,agentCov:69,recovery:81,score:69,pop5:4573508,registered:44682,scoreTrend:[59,62,65,66,69]},
      {name:"Kano",stunting:44.9,wasting:9,anemia:61.6,vitA:54,diversity:19,ebf:25,wash:41,earlyScreen:52,agentCov:51,recovery:67,score:32,pop5:1456489,registered:14229,scoreTrend:[21,27,26,32,32]},
      {name:"Katsina",stunting:45.9,wasting:9.4,anemia:60.8,vitA:51,diversity:18,ebf:29,wash:35,earlyScreen:52,agentCov:46,recovery:67,score:26,pop5:1565712,registered:15297,scoreTrend:[16,23,23,25,26]},
      {name:"Sokoto",stunting:47.8,wasting:9.6,anemia:61.2,vitA:47,diversity:16,ebf:28,wash:38,earlyScreen:50,agentCov:46,recovery:66,score:20,pop5:1059004,registered:10346,scoreTrend:[9,16,16,17,20]},
      {name:"Zamfara",stunting:48.3,wasting:10,anemia:64,vitA:51,diversity:16,ebf:27,wash:34,earlyScreen:49,agentCov:47,recovery:63,score:23,pop5:2268307,registered:22161,scoreTrend:[19,20,19,22,23]},
      {name:"Kebbi",stunting:43.2,wasting:8.4,anemia:59.2,vitA:51,diversity:21,ebf:28,wash:41,earlyScreen:54,agentCov:53,recovery:72,score:34,pop5:1697007,registered:16579,scoreTrend:[24,29,33,33,34]},
      {name:"Jigawa",stunting:40.9,wasting:8.1,anemia:56.7,vitA:55,diversity:20,ebf:30,wash:42,earlyScreen:53,agentCov:52,recovery:71,score:35,pop5:2556917,registered:24980,scoreTrend:[25,26,29,32,35]},
      {name:"Bauchi",stunting:44.2,wasting:9.1,anemia:60.5,vitA:52,diversity:21,ebf:25,wash:37,earlyScreen:55,agentCov:52,recovery:69,score:32,pop5:2351864,registered:22977,scoreTrend:[24,26,27,30,32]},
      {name:"Borno",stunting:48.8,wasting:10,anemia:64.8,vitA:48,diversity:17,ebf:23,wash:32,earlyScreen:45,agentCov:46,recovery:64,score:22,pop5:1021182,registered:9977,scoreTrend:[12,19,19,21,22]},
      {name:"Yobe",stunting:48.6,wasting:9.7,anemia:62.6,vitA:49,diversity:17,ebf:26,wash:39,earlyScreen:48,agentCov:43,recovery:67,score:22,pop5:1611157,registered:15741,scoreTrend:[10,20,15,21,22]},
      {name:"Kaduna",stunting:37,wasting:7.1,anemia:53.5,vitA:61,diversity:23,ebf:28,wash:49,earlyScreen:61,agentCov:55,recovery:72,score:43,pop5:2094715,registered:20465,scoreTrend:[32,39,38,43,43]},
      {name:"Oyo",stunting:37.5,wasting:7.5,anemia:55,vitA:56,diversity:22,ebf:27,wash:45,earlyScreen:56,agentCov:59,recovery:75,score:40,pop5:2214191,registered:21632,scoreTrend:[33,34,37,37,40]},
      {name:"Rivers",stunting:40.6,wasting:7.6,anemia:57.5,vitA:54,diversity:23,ebf:25,wash:47,earlyScreen:59,agentCov:51,recovery:70,score:41,pop5:1949738,registered:19048,scoreTrend:[36,35,36,38,41]},
      {name:"Enugu",stunting:32.3,wasting:6.4,anemia:52.7,vitA:63,diversity:25,ebf:33,wash:49,earlyScreen:65,agentCov:64,recovery:75,score:50,pop5:1057511,registered:10332,scoreTrend:[43,46,46,48,50]},
      {name:"FCT Abuja",stunting:25.5,wasting:4.5,anemia:46.8,vitA:65,diversity:32,ebf:32,wash:58,earlyScreen:72,agentCov:67,recovery:82,score:65,pop5:5522698,registered:53955,scoreTrend:[55,58,61,65,65]}
    ],
    MR: [
      {name:"Nouakchott",stunting:21,wasting:10.5,anemia:51.8,vitA:76,diversity:24,ebf:46,wash:57,earlyScreen:74,agentCov:69,recovery:80,score:67,pop5:114869,registered:4779,scoreTrend:[61,61,62,67,67]},
      {name:"Hodh Ech Chargui",stunting:31.4,wasting:17.4,anemia:62.5,vitA:63,diversity:17,ebf:37,wash:42,earlyScreen:59,agentCov:54,recovery:68,score:38,pop5:52006,registered:2163,scoreTrend:[29,36,33,36,38]},
      {name:"Hodh El Gharbi",stunting:32.1,wasting:17.5,anemia:62,vitA:64,diversity:17,ebf:40,wash:42,earlyScreen:55,agentCov:53,recovery:67,score:37,pop5:53161,registered:2211,scoreTrend:[26,30,32,35,37]},
      {name:"Assaba",stunting:25.7,wasting:13.7,anemia:57.4,vitA:70,diversity:22,ebf:44,wash:45,earlyScreen:65,agentCov:65,recovery:75,score:52,pop5:38765,registered:1613,scoreTrend:[44,46,51,49,52]},
      {name:"Gorgol",stunting:36.1,wasting:19.9,anemia:68.5,vitA:55,diversity:15,ebf:34,wash:34,earlyScreen:55,agentCov:48,recovery:66,score:25,pop5:38484,registered:1601,scoreTrend:[17,19,24,24,25]},
      {name:"Brakna",stunting:24.3,wasting:13.4,anemia:56.1,vitA:72,diversity:21,ebf:40,wash:47,earlyScreen:70,agentCov:64,recovery:74,score:57,pop5:62568,registered:2603,scoreTrend:[52,52,55,55,57]},
      {name:"Trarza",stunting:29.7,wasting:16.1,anemia:63,vitA:61,diversity:20,ebf:42,wash:45,earlyScreen:59,agentCov:61,recovery:68,score:44,pop5:45158,registered:1879,scoreTrend:[37,40,39,43,44]},
      {name:"Adrar",stunting:29.5,wasting:15.7,anemia:62.3,vitA:65,diversity:21,ebf:43,wash:44,earlyScreen:63,agentCov:57,recovery:71,score:45,pop5:57295,registered:2383,scoreTrend:[41,37,39,43,45]},
      {name:"Dakhlet Nouadhibou",stunting:24.2,wasting:13.1,anemia:56.8,vitA:73,diversity:19,ebf:45,wash:47,earlyScreen:65,agentCov:66,recovery:74,score:56,pop5:34311,registered:1427,scoreTrend:[46,49,52,55,56]},
      {name:"Tagant",stunting:30,wasting:16.5,anemia:63.1,vitA:61,diversity:18,ebf:40,wash:45,earlyScreen:58,agentCov:59,recovery:69,score:44,pop5:47582,registered:1979,scoreTrend:[40,35,39,43,44]},
      {name:"Guidimaka",stunting:30.7,wasting:17.3,anemia:63.6,vitA:63,diversity:16,ebf:38,wash:43,earlyScreen:58,agentCov:57,recovery:70,score:35,pop5:70408,registered:2929,scoreTrend:[31,26,33,33,35]},
      {name:"Tiris Zemmour",stunting:30.2,wasting:16.5,anemia:62.1,vitA:65,diversity:20,ebf:37,wash:43,earlyScreen:56,agentCov:57,recovery:70,score:39,pop5:69306,registered:2883,scoreTrend:[28,34,36,36,39]},
      {name:"Inchiri",stunting:27.4,wasting:15.3,anemia:61.1,vitA:65,diversity:20,ebf:40,wash:44,earlyScreen:65,agentCov:57,recovery:74,score:48,pop5:66088,registered:2749,scoreTrend:[44,43,44,45,48]}
    ],
    SL: [
      {name:"Western Area Urban",stunting:18.2,wasting:3.8,anemia:58.5,vitA:83,diversity:26,ebf:57,wash:54,earlyScreen:79,agentCov:86,recovery:87,score:79,pop5:188195,registered:6069,scoreTrend:[68,71,75,78,79]},
      {name:"Bo",stunting:28.6,wasting:6.4,anemia:66.3,vitA:75,diversity:19,ebf:53,wash:43,earlyScreen:70,agentCov:71,recovery:79,score:52,pop5:105543,registered:3404,scoreTrend:[46,46,49,51,52]},
      {name:"Bombali",stunting:27.5,wasting:6,anemia:63.3,vitA:72,diversity:22,ebf:57,wash:44,earlyScreen:69,agentCov:73,recovery:84,score:56,pop5:91989,registered:2967,scoreTrend:[48,48,55,54,56]},
      {name:"Bonthe",stunting:36,wasting:8.4,anemia:75.2,vitA:62,diversity:13,ebf:49,wash:33,earlyScreen:60,agentCov:61,recovery:72,score:30,pop5:55065,registered:1776,scoreTrend:[25,23,27,29,30]},
      {name:"Falaba",stunting:29.7,wasting:6.3,anemia:65.7,vitA:75,diversity:17,ebf:53,wash:42,earlyScreen:66,agentCov:71,recovery:78,score:48,pop5:46299,registered:1493,scoreTrend:[41,41,47,48,48]},
      {name:"Kailahun",stunting:33.2,wasting:7.3,anemia:72.5,vitA:65,diversity:16,ebf:52,wash:38,earlyScreen:61,agentCov:61,recovery:79,score:41,pop5:58979,registered:1902,scoreTrend:[33,37,37,38,41]},
      {name:"Kambia",stunting:27.9,wasting:6.3,anemia:65.3,vitA:75,diversity:16,ebf:55,wash:42,earlyScreen:70,agentCov:69,recovery:79,score:51,pop5:46337,registered:1494,scoreTrend:[44,47,45,48,51]},
      {name:"Karene",stunting:28.9,wasting:6.5,anemia:67.4,vitA:69,diversity:21,ebf:53,wash:45,earlyScreen:68,agentCov:65,recovery:81,score:48,pop5:110130,registered:3552,scoreTrend:[37,41,44,46,48]},
      {name:"Kenema",stunting:31.1,wasting:7,anemia:67.4,vitA:67,diversity:15,ebf:50,wash:43,earlyScreen:63,agentCov:68,recovery:81,score:41,pop5:110320,registered:3558,scoreTrend:[32,36,37,38,41]},
      {name:"Koinadugu",stunting:29.8,wasting:6.6,anemia:67.9,vitA:71,diversity:18,ebf:50,wash:45,earlyScreen:67,agentCov:67,recovery:81,score:45,pop5:45276,registered:1460,scoreTrend:[35,37,42,43,45]},
      {name:"Kono",stunting:33.4,wasting:7.3,anemia:69.6,vitA:69,diversity:16,ebf:53,wash:37,earlyScreen:62,agentCov:60,recovery:78,score:37,pop5:72404,registered:2335,scoreTrend:[26,35,32,37,37]},
      {name:"Moyamba",stunting:24.3,wasting:5.5,anemia:63.3,vitA:79,diversity:20,ebf:56,wash:48,earlyScreen:72,agentCov:76,recovery:85,score:58,pop5:75968,registered:2450,scoreTrend:[47,52,53,56,58]},
      {name:"Port Loko",stunting:28.2,wasting:6.5,anemia:67.3,vitA:71,diversity:17,ebf:52,wash:43,earlyScreen:71,agentCov:68,recovery:81,score:51,pop5:83959,registered:2708,scoreTrend:[40,44,50,50,51]},
      {name:"Pujehun",stunting:37,wasting:8.5,anemia:74.1,vitA:63,diversity:12,ebf:45,wash:31,earlyScreen:56,agentCov:54,recovery:72,score:25,pop5:55684,registered:1796,scoreTrend:[21,22,22,23,25]},
      {name:"Tonkolili",stunting:26,wasting:5.6,anemia:64.9,vitA:73,diversity:23,ebf:54,wash:47,earlyScreen:73,agentCov:73,recovery:84,score:62,pop5:53851,registered:1737,scoreTrend:[52,54,60,60,62]}
    ],
    LR: [
      {name:"Montserrado",stunting:21.1,wasting:3.2,anemia:47.4,vitA:81,diversity:18,ebf:61,wash:60,earlyScreen:83,agentCov:80,recovery:86,score:79,pop5:105958,registered:3656,scoreTrend:[70,73,73,76,79]},
      {name:"Bomi",stunting:27.3,wasting:4.4,anemia:53.1,vitA:76,diversity:18,ebf:55,wash:50,earlyScreen:70,agentCov:72,recovery:84,score:61,pop5:26399,registered:911,scoreTrend:[50,56,56,60,61]},
      {name:"Bong",stunting:32.9,wasting:5.6,anemia:57.9,vitA:68,diversity:16,ebf:55,wash:46,earlyScreen:66,agentCov:68,recovery:77,score:52,pop5:56756,registered:1958,scoreTrend:[43,48,48,52,52]},
      {name:"Gbarpolu",stunting:29.5,wasting:4.9,anemia:53.3,vitA:71,diversity:16,ebf:56,wash:46,earlyScreen:68,agentCov:68,recovery:81,score:58,pop5:48243,registered:1664,scoreTrend:[53,53,56,58,58]},
      {name:"Grand Bassa",stunting:29.6,wasting:5,anemia:54.6,vitA:73,diversity:18,ebf:55,wash:46,earlyScreen:66,agentCov:70,recovery:80,score:53,pop5:60928,registered:2102,scoreTrend:[46,49,50,52,53]},
      {name:"Grand Cape Mount",stunting:31.4,wasting:5.3,anemia:54.3,vitA:68,diversity:13,ebf:57,wash:49,earlyScreen:65,agentCov:69,recovery:79,score:54,pop5:62913,registered:2171,scoreTrend:[52,49,51,51,54]},
      {name:"Grand Gedeh",stunting:30.6,wasting:5.3,anemia:54.7,vitA:70,diversity:16,ebf:57,wash:50,earlyScreen:69,agentCov:69,recovery:80,score:52,pop5:55658,registered:1920,scoreTrend:[46,45,47,51,52]},
      {name:"Grand Kru",stunting:41.6,wasting:7.2,anemia:63.3,vitA:56,diversity:11,ebf:49,wash:37,earlyScreen:57,agentCov:51,recovery:68,score:26,pop5:27386,registered:945,scoreTrend:[22,21,23,26,26]},
      {name:"Lofa",stunting:32.3,wasting:5.6,anemia:56,vitA:66,diversity:15,ebf:53,wash:44,earlyScreen:63,agentCov:66,recovery:78,score:47,pop5:54347,registered:1875,scoreTrend:[39,40,45,46,47]},
      {name:"Margibi",stunting:32.4,wasting:5.4,anemia:55.5,vitA:66,diversity:16,ebf:54,wash:47,earlyScreen:63,agentCov:66,recovery:79,score:47,pop5:42584,registered:1469,scoreTrend:[35,43,46,45,47]},
      {name:"Maryland",stunting:29.2,wasting:4.7,anemia:53.5,vitA:74,diversity:19,ebf:59,wash:49,earlyScreen:71,agentCov:70,recovery:81,score:60,pop5:38192,registered:1318,scoreTrend:[53,54,54,59,60]},
      {name:"Nimba",stunting:28,wasting:4.4,anemia:51,vitA:76,diversity:18,ebf:60,wash:51,earlyScreen:69,agentCov:74,recovery:84,score:64,pop5:59573,registered:2055,scoreTrend:[56,57,61,62,64]},
      {name:"River Cess",stunting:31.8,wasting:5.2,anemia:55.9,vitA:72,diversity:16,ebf:55,wash:49,earlyScreen:68,agentCov:67,recovery:81,score:53,pop5:68015,registered:2347,scoreTrend:[41,47,50,52,53]},
      {name:"River Gee",stunting:37.2,wasting:6.3,anemia:60.5,vitA:62,diversity:13,ebf:52,wash:40,earlyScreen:59,agentCov:58,recovery:76,score:39,pop5:59972,registered:2069,scoreTrend:[34,34,35,37,39]},
      {name:"Sinoe",stunting:32.3,wasting:5.4,anemia:56.1,vitA:69,diversity:17,ebf:57,wash:45,earlyScreen:68,agentCov:68,recovery:81,score:51,pop5:33075,registered:1141,scoreTrend:[46,49,49,48,51]}
    ],
    GW: [
      {name:"Bissau (SAB)",stunting:20,wasting:4.6,anemia:53,vitA:75,diversity:20,ebf:69,wash:52,earlyScreen:76,agentCov:74,recovery:88,score:68,pop5:47565,registered:2426,scoreTrend:[58,60,66,66,68]},
      {name:"Bafatá",stunting:31.8,wasting:8.2,anemia:66.6,vitA:58,diversity:13,ebf:53,wash:34,earlyScreen:57,agentCov:56,recovery:71,score:34,pop5:27427,registered:1399,scoreTrend:[26,29,32,31,34]},
      {name:"Biombo",stunting:30.3,wasting:8,anemia:61.6,vitA:63,diversity:15,ebf:58,wash:37,earlyScreen:60,agentCov:59,recovery:72,score:37,pop5:16702,registered:852,scoreTrend:[27,31,33,35,37]},
      {name:"Bolama-Bijagós",stunting:29.3,wasting:7.7,anemia:63.9,vitA:62,diversity:18,ebf:56,wash:40,earlyScreen:58,agentCov:58,recovery:78,score:42,pop5:33847,registered:1726,scoreTrend:[33,39,38,38,42]},
      {name:"Cacheu",stunting:27.6,wasting:7.1,anemia:59.5,vitA:67,diversity:19,ebf:62,wash:40,earlyScreen:62,agentCov:63,recovery:77,score:47,pop5:33938,registered:1731,scoreTrend:[41,38,43,47,47]},
      {name:"Gabú",stunting:36.3,wasting:9.6,anemia:69.4,vitA:52,diversity:11,ebf:52,wash:28,earlyScreen:51,agentCov:48,recovery:70,score:21,pop5:25356,registered:1293,scoreTrend:[10,18,19,21,21]},
      {name:"Oio",stunting:35.4,wasting:9.5,anemia:69.2,vitA:54,diversity:12,ebf:54,wash:34,earlyScreen:54,agentCov:47,recovery:68,score:26,pop5:33141,registered:1690,scoreTrend:[21,18,24,24,26]},
      {name:"Quinara",stunting:28.6,wasting:7.6,anemia:62.3,vitA:63,diversity:18,ebf:57,wash:41,earlyScreen:60,agentCov:62,recovery:76,score:41,pop5:41162,registered:2099,scoreTrend:[31,34,39,38,41]},
      {name:"Tombali",stunting:26.1,wasting:6.8,anemia:59.5,vitA:68,diversity:16,ebf:61,wash:45,earlyScreen:64,agentCov:62,recovery:76,score:50,pop5:40862,registered:2084,scoreTrend:[42,45,47,47,50]}
    ],
    GM: [
      {name:"Banjul",stunting:13.8,wasting:7.5,anemia:45.2,vitA:85,diversity:34,ebf:57,wash:70,earlyScreen:89,agentCov:91,recovery:91,score:93,pop5:108435,registered:5099,scoreTrend:[89,90,89,92,93]},
      {name:"Kanifing",stunting:16.9,wasting:9.7,anemia:50.3,vitA:79,diversity:33,ebf:59,wash:63,earlyScreen:80,agentCov:86,recovery:90,score:77,pop5:44866,registered:2110,scoreTrend:[68,71,72,76,77]},
      {name:"Brikama",stunting:18.7,wasting:10.5,anemia:51.2,vitA:76,diversity:32,ebf:57,wash:58,earlyScreen:75,agentCov:76,recovery:82,score:67,pop5:46376,registered:2181,scoreTrend:[56,63,62,65,67]},
      {name:"Mansakonko",stunting:18.2,wasting:11,anemia:51.4,vitA:76,diversity:28,ebf:53,wash:60,earlyScreen:76,agentCov:81,recovery:85,score:64,pop5:27429,registered:1290,scoreTrend:[55,58,60,61,64]},
      {name:"Kerewan",stunting:18.4,wasting:10.6,anemia:50.9,vitA:79,diversity:32,ebf:54,wash:58,earlyScreen:75,agentCov:76,recovery:83,score:69,pop5:21505,registered:1011,scoreTrend:[64,63,67,67,69]},
      {name:"Kuntaur",stunting:22.9,wasting:14,anemia:57.3,vitA:71,diversity:21,ebf:49,wash:47,earlyScreen:63,agentCov:68,recovery:80,score:41,pop5:44205,registered:2079,scoreTrend:[30,34,37,39,41]},
      {name:"Janjanbureh",stunting:25.1,wasting:15.1,anemia:59.2,vitA:66,diversity:20,ebf:48,wash:45,earlyScreen:64,agentCov:64,recovery:73,score:33,pop5:45192,registered:2125,scoreTrend:[29,30,31,29,33]},
      {name:"Basse",stunting:21.2,wasting:13.3,anemia:56.6,vitA:70,diversity:25,ebf:53,wash:52,earlyScreen:69,agentCov:71,recovery:81,score:50,pop5:31994,registered:1505,scoreTrend:[40,45,46,49,50]}
    ],
    BJ: [
      {name:"Littoral",stunting:21.8,wasting:2.9,anemia:44.9,vitA:91,diversity:34,ebf:45,wash:62,earlyScreen:85,agentCov:92,recovery:95,score:85,pop5:209195,registered:5459,scoreTrend:[79,79,81,83,85]},
      {name:"Alibori",stunting:41.4,wasting:6.3,anemia:59.5,vitA:68,diversity:23,ebf:42,wash:42,earlyScreen:64,agentCov:62,recovery:80,score:36,pop5:220753,registered:5761,scoreTrend:[27,33,32,34,36]},
      {name:"Atacora",stunting:41.7,wasting:6.4,anemia:58.6,vitA:67,diversity:19,ebf:38,wash:40,earlyScreen:64,agentCov:63,recovery:74,score:35,pop5:234507,registered:6120,scoreTrend:[26,31,33,34,35]},
      {name:"Atlantique",stunting:37.6,wasting:5.7,anemia:57,vitA:73,diversity:21,ebf:39,wash:47,earlyScreen:71,agentCov:70,recovery:78,score:46,pop5:197673,registered:5158,scoreTrend:[39,40,42,46,46]},
      {name:"Borgou",stunting:31,wasting:4.6,anemia:52.9,vitA:80,diversity:30,ebf:41,wash:53,earlyScreen:75,agentCov:76,recovery:86,score:59,pop5:190383,registered:4968,scoreTrend:[49,51,55,57,59]},
      {name:"Collines",stunting:34.8,wasting:5.3,anemia:54.8,vitA:72,diversity:25,ebf:40,wash:48,earlyScreen:72,agentCov:71,recovery:84,score:52,pop5:177540,registered:4633,scoreTrend:[40,45,49,50,52]},
      {name:"Couffo",stunting:37.4,wasting:5.6,anemia:56.7,vitA:73,diversity:22,ebf:42,wash:49,earlyScreen:66,agentCov:66,recovery:77,score:44,pop5:122514,registered:3197,scoreTrend:[36,38,41,45,44]},
      {name:"Donga",stunting:35.9,wasting:5.4,anemia:56.1,vitA:74,diversity:27,ebf:41,wash:47,earlyScreen:69,agentCov:67,recovery:84,score:51,pop5:129556,registered:3381,scoreTrend:[42,47,47,50,51]},
      {name:"Mono",stunting:32.1,wasting:4.6,anemia:53.9,vitA:81,diversity:26,ebf:42,wash:56,earlyScreen:74,agentCov:80,recovery:84,score:60,pop5:206547,registered:5390,scoreTrend:[49,51,54,59,60]},
      {name:"Ouémé",stunting:38,wasting:5.6,anemia:56.8,vitA:71,diversity:21,ebf:37,wash:45,earlyScreen:69,agentCov:68,recovery:78,score:47,pop5:107595,registered:2808,scoreTrend:[38,43,45,47,47]},
      {name:"Plateau",stunting:36.5,wasting:5.5,anemia:54.7,vitA:72,diversity:25,ebf:43,wash:45,earlyScreen:67,agentCov:73,recovery:80,score:46,pop5:173756,registered:4534,scoreTrend:[43,41,44,44,46]},
      {name:"Zou",stunting:34.4,wasting:5.2,anemia:55,vitA:77,diversity:27,ebf:44,wash:50,earlyScreen:72,agentCov:76,recovery:81,score:52,pop5:129982,registered:3392,scoreTrend:[44,48,49,50,52]}
    ],
    TG: [
      {name:"Golfe",stunting:17.7,wasting:3.4,anemia:41.9,vitA:91,diversity:35,ebf:72,wash:70,earlyScreen:95,agentCov:98,recovery:94,score:96,pop5:175733,registered:5664,scoreTrend:[90,92,95,95,96]},
      {name:"Agoè-Nyivé",stunting:26.3,wasting:6.1,anemia:50.1,vitA:78,diversity:30,ebf:64,wash:56,earlyScreen:78,agentCov:82,recovery:88,score:60,pop5:131825,registered:4249,scoreTrend:[54,52,56,58,60]},
      {name:"Zio",stunting:24.9,wasting:5.6,anemia:47.6,vitA:79,diversity:30,ebf:66,wash:58,earlyScreen:83,agentCov:86,recovery:91,score:67,pop5:135533,registered:4368,scoreTrend:[59,59,64,66,67]},
      {name:"Lacs",stunting:27.5,wasting:6.3,anemia:49.6,vitA:79,diversity:26,ebf:67,wash:55,earlyScreen:78,agentCov:78,recovery:87,score:62,pop5:92322,registered:2976,scoreTrend:[53,56,60,61,62]},
      {name:"Ogou",stunting:24.2,wasting:5.8,anemia:48.6,vitA:84,diversity:27,ebf:66,wash:56,earlyScreen:81,agentCov:83,recovery:88,score:71,pop5:88827,registered:2863,scoreTrend:[65,63,70,69,71]},
      {name:"Kloto",stunting:26.8,wasting:5.9,anemia:49.6,vitA:77,diversity:29,ebf:63,wash:56,earlyScreen:76,agentCov:78,recovery:90,score:63,pop5:140059,registered:4514,scoreTrend:[57,58,57,61,63]},
      {name:"Tchaoudjo",stunting:24.3,wasting:5.8,anemia:49,vitA:82,diversity:32,ebf:64,wash:58,earlyScreen:82,agentCov:84,recovery:88,score:66,pop5:146985,registered:4737,scoreTrend:[56,58,61,63,66]},
      {name:"Kozah",stunting:24.7,wasting:5.6,anemia:49.7,vitA:80,diversity:30,ebf:66,wash:57,earlyScreen:81,agentCov:83,recovery:90,score:66,pop5:159786,registered:5150,scoreTrend:[60,62,60,65,66]},
      {name:"Tône",stunting:34,wasting:8.1,anemia:56.2,vitA:65,diversity:22,ebf:60,wash:45,earlyScreen:64,agentCov:65,recovery:81,score:37,pop5:92113,registered:2969,scoreTrend:[34,29,34,36,37]},
      {name:"Kpendjal",stunting:34,wasting:8.2,anemia:55.4,vitA:67,diversity:24,ebf:59,wash:43,earlyScreen:64,agentCov:63,recovery:80,score:38,pop5:136817,registered:4410,scoreTrend:[29,31,33,36,38]}
    ],
    CV: [
      {name:"Praia (Santiago)",stunting:6.8,wasting:1.5,anemia:28,vitA:98,diversity:62,ebf:67,wash:98,earlyScreen:98,agentCov:98,recovery:98,score:96,pop5:14542,registered:1541,scoreTrend:[91,88,92,94,96]},
      {name:"São Vicente",stunting:8.1,wasting:2,anemia:29.9,vitA:92,diversity:57,ebf:60,wash:93,earlyScreen:95,agentCov:98,recovery:98,score:92,pop5:7435,registered:788,scoreTrend:[82,87,89,90,92]},
      {name:"Santo Antão",stunting:11.5,wasting:2.8,anemia:34.4,vitA:79,diversity:36,ebf:51,wash:64,earlyScreen:76,agentCov:74,recovery:83,score:44,pop5:4130,registered:438,scoreTrend:[35,39,40,42,44]},
      {name:"Fogo",stunting:8.4,wasting:1.9,anemia:30.9,vitA:89,diversity:56,ebf:60,wash:86,earlyScreen:92,agentCov:98,recovery:96,score:91,pop5:3263,registered:346,scoreTrend:[82,85,90,90,91]},
      {name:"Sal",stunting:8,wasting:1.8,anemia:29.2,vitA:92,diversity:59,ebf:61,wash:91,earlyScreen:98,agentCov:98,recovery:98,score:96,pop5:3296,registered:349,scoreTrend:[84,89,92,96,96]},
      {name:"Boa Vista",stunting:9.3,wasting:2.2,anemia:32.1,vitA:87,diversity:49,ebf:61,wash:81,earlyScreen:89,agentCov:91,recovery:91,score:78,pop5:6619,registered:702,scoreTrend:[72,74,76,77,78]},
      {name:"Maio",stunting:8.3,wasting:1.9,anemia:31,vitA:93,diversity:56,ebf:64,wash:87,earlyScreen:93,agentCov:97,recovery:95,score:95,pop5:2914,registered:309,scoreTrend:[90,87,91,94,95]},
      {name:"São Nicolau",stunting:8.4,wasting:1.8,anemia:29.1,vitA:92,diversity:58,ebf:60,wash:92,earlyScreen:98,agentCov:98,recovery:98,score:96,pop5:3228,registered:342,scoreTrend:[90,92,91,97,96]},
      {name:"Brava",stunting:10.8,wasting:2.5,anemia:32.8,vitA:81,diversity:42,ebf:57,wash:76,earlyScreen:84,agentCov:81,recovery:89,score:59,pop5:4574,registered:485,scoreTrend:[53,54,52,56,59]}
    ]
  }
  };
})(window);
