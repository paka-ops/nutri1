/* ============================================================================
   NUTRI.N°1 — UNICEF · CHILD NUTRITION ANALYTICS · AFRIQUE DE L'OUEST
   unicef-data.js — données du tableau de bord.

   Pourquoi ce fichier ? index.html fait déjà ~39 000 lignes / 2,9 Mo. Le
   tableau de bord UNICEF (5 KPI, 15 graphiques, scorecard CRENAS) vit donc
   dans assets/unicef/ et n'est relié à la page que par quelques balises :
     1 CSS  : unicef-dashboard.css
     3 JS   : unicef-data.js, unicef-charts.js, unicef-dashboard.js

   NATURE DES DONNÉES : estimations illustratives, figées et déterministes,
   alignées sur les cadres UNICEF / OMS (SMART, ANJE, CRENAS-CRENAM, Sphère,
   fenêtre des 1000 jours). Aucun appel réseau, aucune donnée patient. Elles
   ne remplacent pas les chiffres officiels de l'UNICEF.

   Deux valeurs de référence du cahier des charges (3,8 M d'enfants MAS et
   32 % d'allaitement exclusif) sont des estimations consolidées régionales :
   elles sont donc isolées dans REGION et documentées comme telles, tandis que
   les séries pays restent, elles, strictement celles du cahier des charges.
   ============================================================================ */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------- palette
     Identité visuelle UNICEF — couleurs exclusives du module.            */
  var COLORS = {
    cyan: "#1CABE2",      /* primaire   — cyan UNICEF officiel          */
    cyan2: "#38BDF8",     /* accent KPI (gradient #1CABE2 → #38BDF8)    */
    sky: "#7FD8FF",
    green: "#80BD41",     /* secondaire — vert tendre                    */
    orange: "#F26A21",    /* tertiaire  — orange chaleureux              */
    gold: "#DDA63A",      /* quaternaire— doré enfance                   */
    danger: "#E5243B",    /* rouge urgence UNICEF                        */
    side: "#002952",      /* fond sidebar — bleu nuit UNICEF             */
    bg: "#F0F9FF",        /* fond global — cyan très très clair          */
    line: "#BAE6FD",      /* bordure des cartes                          */
    ink: "#082F49",
    muted: "#5B7C93",
    violet: "#7C3AED",
    teal: "#0E7490",
  };

  /* ------------------------------------------------------- zones de fond */
  var BANDS = {
    rose: "#FFF1F2",     /* < P3 et > P97                                  */
    green: "#F0FDF4",    /* P15 → P85                                      */
    orange: "#FFF7ED",   /* P85 → P97                                      */
  };

  /* ==========================================================================
     1. PAYS — panel Afrique de l'Ouest (15 pays)
     mas      : prévalence malnutrition aigüe sévère, % enfants < 5 ans
     masAbs   : enfants MAS, milliers (décompte des bulles, graphique 9)
     stunting : prévalence retard de croissance, %
     water    : ménages avec accès à l'eau potable, %
     ebf      : allaitement exclusif 0-6 mois, %
     cure/abandon/death : cohortes CRENAS-CRENAM, %
     vitA / vitA2022    : couverture vitamine A, %
     admissions : admissions CRENAS du mois courant — panel scorecard (10 pays)
     stock      : couverture des stocks ATPE, %
     score      : index composite ANJE (0-100), publication régionale
     anje       : 8 indicateurs ANJE, dans l'ordre de ANJE[8] ci-dessous
     trend      : taux de guérison 2016 → 2024 (sparkline du scorecard)
     ========================================================================== */
  var COUNTRIES = [
    { code: "NE", name: "Niger", short: "Niger", flag: "🇳🇪", zone: "sahel", map: [60, 28],
      u5: 5.6, mas: 14.8, masAbs: 890, stunting: 47, water: 48, ebf: 24,
      cure: 86, curePrev: 84, abandon: 7.4, death: 2.1,
      vitA: 68, vitA2022: 61, admissions: 9800, admissionsPrev: 8700,
      stock: 62, stockPrev: 55, score: 34,
      anje: [42, 24, 71, 18, 44, 16, 62, 45],
      trend: [78, 79, 80, 81, 82, 83, 84, 84, 86] },
    { code: "ML", name: "Mali", short: "Mali", flag: "🇲🇱", zone: "sahel", map: [28, 44],
      u5: 4.6, mas: 12.3, masAbs: 680, stunting: 38, water: 55, ebf: 28,
      cure: 82, curePrev: 80, abandon: 9.8, death: 2.6,
      vitA: 71, vitA2022: 63, admissions: 7500, admissionsPrev: 6900,
      stock: 54, stockPrev: 49, score: 39,
      anje: [48, 28, 74, 22, 48, 19, 58, 49],
      trend: [72, 73, 75, 76, 77, 78, 79, 80, 82] },
    { code: "BF", name: "Burkina Faso", short: "Burkina", flag: "🇧🇫", zone: "sahel", map: [38, 58],
      u5: 4.6, mas: 8.1, masAbs: 450, stunting: 29, water: 57, ebf: 41,
      cure: 88, curePrev: 86, abandon: 6.2, death: 1.8,
      vitA: 79, vitA2022: 70, admissions: 5600, admissionsPrev: 5200,
      stock: 66, stockPrev: 60, score: 52,
      anje: [68, 41, 79, 29, 52, 24, 45, 58],
      trend: [79, 80, 81, 82, 83, 84, 85, 86, 88] },
    { code: "SN", name: "Sénégal", short: "Sénégal", flag: "🇸🇳", zone: "sahel", map: [8, 52],
      u5: 3.0, mas: 7.2, masAbs: 290, stunting: 17, water: 73, ebf: 38,
      cure: 91, curePrev: 89, abandon: 4.1, death: 1.2,
      vitA: 83, vitA2022: 74, admissions: 3200, admissionsPrev: 2950,
      stock: 72, stockPrev: 66, score: 58,
      anje: [61, 38, 82, 34, 58, 31, 38, 64],
      trend: [82, 83, 84, 85, 86, 87, 88, 89, 91] },
    { code: "NG", name: "Nigeria", short: "Nigeria", flag: "🇳🇬", zone: "cotier", map: [68, 62],
      u5: 34.0, mas: 7.2, masAbs: 1800, stunting: 37, water: 61, ebf: 22,
      cure: 79, curePrev: 77, abandon: 12.6, death: 3.4,
      vitA: 58, vitA2022: 52, admissions: 11000, admissionsPrev: 10100,
      stock: 44, stockPrev: 40, score: 38,
      anje: [46, 22, 68, 16, 42, 14, 52, 40],
      trend: [70, 71, 72, 73, 74, 75, 76, 77, 79] },
    { code: "GH", name: "Ghana", short: "Ghana", flag: "🇬🇭", zone: "cotier", map: [55, 63],
      u5: 5.0, mas: 5.7, masAbs: 320, stunting: 18, water: 79, ebf: 48,
      cure: 92, curePrev: 90, abandon: 3.8, death: 1.1,
      vitA: 79, vitA2022: 71, admissions: 1500, admissionsPrev: 1400,
      stock: 78, stockPrev: 72, score: 63,
      anje: [72, 48, 87, 41, 64, 38, 32, 71],
      trend: [84, 85, 86, 87, 88, 89, 90, 91, 92] },
    { code: "GN", name: "Guinée", short: "Guinée", flag: "🇬🇳", zone: "cotier", map: [17, 47],
      u5: 2.6, mas: 9.3, masAbs: 400, stunting: 30, water: 62, ebf: 44,
      cure: 85, curePrev: 83, abandon: 8.1, death: 2.3,
      vitA: 74, vitA2022: 66, admissions: null, admissionsPrev: null,
      stock: 58, stockPrev: 52, score: 54,
      anje: [64, 44, 83, 36, 57, 33, 41, 61],
      trend: [76, 77, 78, 79, 80, 81, 82, 83, 85] },
    { code: "MR", name: "Mauritanie", short: "Mauritanie", flag: "🇲🇷", zone: "sahel", map: [15, 19],
      u5: 0.8, mas: 15.1, masAbs: 180, stunting: 28, water: 52, ebf: 26,
      cure: 83, curePrev: 81, abandon: 9.1, death: 2.8,
      vitA: 66, vitA2022: 58, admissions: 2750, admissionsPrev: 2500,
      stock: 51, stockPrev: 46, score: 37,
      anje: [45, 26, 69, 21, 46, 17, 57, 47],
      trend: [74, 75, 76, 77, 78, 79, 80, 81, 83] },
    { code: "SL", name: "Sierra Leone", short: "S. Leone", flag: "🇸🇱", zone: "cotier", map: [12, 70],
      u5: 1.2, mas: 6.4, masAbs: 110, stunting: 29, water: 45, ebf: 34,
      cure: 87, curePrev: 85, abandon: 6.8, death: 2.0,
      vitA: 72, vitA2022: 63, admissions: 2050, admissionsPrev: 1900,
      stock: 61, stockPrev: 55, score: 48,
      anje: [56, 34, 76, 27, 50, 22, 49, 55],
      trend: [78, 79, 80, 81, 82, 83, 84, 85, 87] },
    { code: "CI", name: "Côte d'Ivoire", short: "C. Ivoire", flag: "🇨🇮", zone: "cotier", map: [38, 68],
      u5: 6.2, mas: 7.7, masAbs: 380, stunting: 22, water: 71, ebf: 30,
      cure: 89, curePrev: 87, abandon: 5.4, death: 1.6,
      vitA: 81, vitA2022: 73, admissions: 3300, admissionsPrev: 3000,
      stock: 68, stockPrev: 62, score: 51,
      anje: [58, 30, 77, 31, 54, 26, 44, 57],
      trend: [80, 81, 82, 83, 84, 85, 86, 87, 89] },
    { code: "LR", name: "Liberia", short: "Liberia", flag: "🇱🇷", zone: "cotier", map: [26, 78],
      u5: 0.9, mas: 5.3, masAbs: 85, stunting: 31, water: 46, ebf: 39,
      cure: 86, curePrev: 84, abandon: 7.0, death: 2.2,
      vitA: 69, vitA2022: 60, admissions: null, admissionsPrev: null,
      stock: 56, stockPrev: 50, score: 50,
      anje: [60, 39, 78, 28, 51, 23, 42, 56],
      trend: [77, 78, 79, 80, 81, 82, 83, 84, 86] },
    { code: "GM", name: "Gambie", short: "Gambie", flag: "🇬🇲", zone: "cotier", map: [6, 55],
      u5: 0.4, mas: 8.4, masAbs: 45, stunting: 24, water: 68, ebf: 47,
      cure: 90, curePrev: 88, abandon: 4.9, death: 1.4,
      vitA: 77, vitA2022: 69, admissions: 1534, admissionsPrev: 1400,
      stock: 64, stockPrev: 58, score: 57,
      anje: [66, 47, 84, 38, 60, 35, 36, 66],
      trend: [81, 82, 83, 84, 85, 86, 87, 88, 90] },
    { code: "GW", name: "Guinée-Bissau", short: "G. Bissau", flag: "🇬🇼", zone: "cotier", map: [12, 44],
      u5: 0.3, mas: 6.9, masAbs: 40, stunting: 27, water: 58, ebf: 40,
      cure: 84, curePrev: 82, abandon: 8.4, death: 2.4,
      vitA: 64, vitA2022: 56, admissions: null, admissionsPrev: null,
      stock: 48, stockPrev: 43, score: 52,
      anje: [62, 40, 79, 33, 55, 28, 46, 59],
      trend: [75, 76, 77, 78, 79, 80, 81, 82, 84] },
    { code: "BJ", name: "Bénin", short: "Bénin", flag: "🇧🇯", zone: "cotier", map: [50, 62],
      u5: 1.8, mas: 6.1, masAbs: 120, stunting: 25, water: 66, ebf: 43,
      cure: 88, curePrev: 86, abandon: 6.5, death: 1.9,
      vitA: 76, vitA2022: 68, admissions: null, admissionsPrev: null,
      stock: 60, stockPrev: 54, score: 55,
      anje: [65, 43, 82, 35, 59, 30, 39, 62],
      trend: [79, 80, 81, 82, 83, 84, 85, 86, 88] },
    { code: "TG", name: "Togo", short: "Togo", flag: "🇹🇬", zone: "cotier", map: [54, 65],
      u5: 1.4, mas: 5.9, masAbs: 95, stunting: 23, water: 64, ebf: 45,
      cure: 89, curePrev: 87, abandon: 5.1, death: 1.5,
      vitA: 78, vitA2022: 70, admissions: null, admissionsPrev: null,
      stock: 63, stockPrev: 57, score: 56,
      anje: [67, 45, 84, 37, 61, 32, 37, 63],
      trend: [80, 81, 82, 83, 84, 85, 86, 87, 89] },
  ];

  /* Pays ayant atteint l'objectif de 80 % de couverture vitamine A (2024).
     Le décompte de référence du cahier des charges (4 pays) porte sur le
     panel régional élargi UNICEF WCARO, qui inclut les deux États insulaires
     ci-dessous en plus du panel continental de 14 pays du graphique 14.   */
  var VITA_OVER_80 = [
    { code: "CV", name: "Cap-Vert", value: 88, panel: "élargi" },
    { code: "ST", name: "São Tomé-et-Príncipe", value: 85, panel: "élargi" },
    { code: "SN", name: "Sénégal", value: 83, panel: "14 pays" },
    { code: "CI", name: "Côte d'Ivoire", value: 81, panel: "14 pays" },
  ];

  /* ==========================================================================
     2. ANJE — 8 indicateurs OMS (radar, heatmap, barres groupées)
     target : cible OMS / UNICEF de l'indicateur, %
     inverse: true → une valeur basse est favorable (biberon)
     ========================================================================== */
  var ANJE = [
    { id: "early", label: "Mise au sein précoce", short: "Mise au sein", target: 80 },
    { id: "ebf", label: "Allaitement exclusif 0-6 mois", short: "Allaitement excl.", target: 70 },
    { id: "intro", label: "Introduction des aliments complémentaires", short: "Intro. compléments", target: 90 },
    { id: "mdd", label: "Diversité alimentaire minimale", short: "Diversité min.", target: 50 },
    { id: "mmf", label: "Fréquence minimale des repas", short: "Fréq. repas min.", target: 70 },
    { id: "mad", label: "Alimentation minimale acceptable", short: "Alim. acceptable", target: 40 },
    { id: "bottle", label: "Alimentation au biberon (indicateur inversé)", short: "Biberon (inv.)", target: 20, inverse: true },
    { id: "cont", label: "Poursuite de l'allaitement à 2 ans", short: "Allait. 2 ans", target: 80 },
  ];

  /* Benchmark OMS porté sur le radar (graphique 3) — l'axe « biberon » est
     inversé : la cible affichée est 20 %. */
  var ANJE_BENCHMARK = ANJE.map(function (a) { return a.target; });

  /* ==========================================================================
     3. CROISSANCE OMS — courbes de percentiles (graphique 1)
     Référence OMS 2006 (0-60 mois), valeurs approchées aux âges repères.
     PB = périmètre brachial (MUAC), mesuré à partir de 6 mois.
     ========================================================================== */
  var GROWTH_MONTHS = [0, 1, 2, 3, 4, 5, 6, 9, 12, 18, 24, 36, 48, 60];

  var GROWTH = {
    months: GROWTH_MONTHS,
    metrics: [
      { id: "weight", label: "Poids pour âge", short: "Poids", unit: " kg", dec: 1, yMin: 0, yMax: 23 },
      { id: "height", label: "Taille pour âge", short: "Taille", unit: " cm", dec: 0, yMin: 40, yMax: 120 },
      { id: "pb", label: "Périmètre brachial (MUAC)", short: "PB", unit: " cm", dec: 1, yMin: 10, yMax: 19, fromMonth: 6 },
    ],
    sexes: [
      { id: "boys", label: "Garçon" },
      { id: "girls", label: "Fille" },
    ],
    series: {
      boys: {
        weight: {
          p3: [2.5, 3.4, 4.4, 5.1, 5.6, 6.1, 6.4, 7.2, 7.8, 8.8, 9.7, 11.3, 12.7, 14.1],
          p15: [2.9, 3.9, 4.9, 5.7, 6.2, 6.7, 7.1, 8.0, 8.6, 9.7, 10.7, 12.5, 14.1, 15.7],
          p50: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.9, 9.6, 10.9, 12.2, 14.3, 16.3, 18.3],
          p85: [3.9, 5.1, 6.3, 7.2, 7.8, 8.4, 8.8, 9.9, 10.7, 12.1, 13.7, 16.2, 18.6, 21.0],
          p97: [4.3, 5.7, 7.0, 7.9, 8.6, 9.2, 9.7, 10.9, 11.8, 13.3, 15.3, 18.3, 21.2, 23.9],
        },
        height: {
          p3: [46.3, 51.1, 54.7, 57.6, 60.0, 61.9, 63.6, 68.4, 71.3, 76.9, 81.7, 89.5, 96.0, 102.0],
          p15: [47.5, 52.5, 56.2, 59.1, 61.6, 63.6, 65.3, 70.0, 73.1, 78.8, 83.9, 91.9, 98.7, 105.0],
          p50: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 72.3, 75.7, 82.3, 87.1, 96.1, 103.3, 110.0],
          p85: [52.0, 56.9, 60.7, 63.8, 66.3, 68.4, 70.2, 74.8, 78.4, 84.8, 90.0, 99.1, 106.5, 113.5],
          p97: [53.4, 58.4, 62.2, 65.3, 67.8, 69.9, 71.7, 76.4, 79.9, 86.5, 91.6, 100.8, 108.3, 115.5],
        },
        pb: {
          p3: [null, null, null, null, null, null, 12.5, 12.8, 13.0, 13.4, 13.7, 14.2, 14.6, 14.9],
          p15: [null, null, null, null, null, null, 13.0, 13.3, 13.6, 13.9, 14.2, 14.7, 15.1, 15.4],
          p50: [null, null, null, null, null, null, 13.7, 14.1, 14.3, 14.7, 15.0, 15.5, 15.9, 16.3],
          p85: [null, null, null, null, null, null, 14.4, 14.8, 15.1, 15.5, 15.8, 16.4, 16.8, 17.2],
          p97: [null, null, null, null, null, null, 14.9, 15.3, 15.6, 16.0, 16.4, 17.0, 17.4, 17.8],
        },
      },
      girls: {
        weight: {
          p3: [2.4, 3.2, 4.0, 4.7, 5.2, 5.6, 5.9, 6.7, 7.3, 8.2, 9.1, 10.8, 12.3, 13.7],
          p15: [2.8, 3.6, 4.5, 5.2, 5.7, 6.2, 6.5, 7.3, 7.9, 9.0, 10.0, 11.9, 13.6, 15.2],
          p50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 8.2, 8.9, 10.2, 11.5, 13.9, 16.1, 18.2],
          p85: [3.7, 4.8, 5.9, 6.6, 7.3, 7.8, 8.3, 9.4, 10.2, 11.6, 13.0, 15.8, 18.4, 20.8],
          p97: [4.2, 5.4, 6.6, 7.5, 8.2, 8.8, 9.4, 10.6, 11.5, 13.2, 14.8, 18.1, 21.2, 24.0],
        },
        height: {
          p3: [45.6, 50.0, 53.2, 55.8, 58.0, 59.9, 61.2, 65.3, 68.9, 74.9, 80.0, 87.4, 94.1, 99.9],
          p15: [46.8, 51.4, 54.8, 57.3, 59.6, 61.5, 62.9, 67.0, 70.7, 76.9, 82.2, 90.0, 96.9, 103.0],
          p50: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 70.1, 74.0, 80.7, 85.7, 95.1, 102.7, 109.4],
          p85: [51.2, 55.8, 59.3, 62.3, 64.7, 66.6, 68.5, 73.0, 77.0, 83.9, 89.0, 98.3, 106.3, 113.2],
          p97: [52.7, 57.4, 60.9, 63.8, 66.2, 68.2, 70.3, 74.8, 78.9, 86.0, 90.9, 100.1, 108.2, 115.3],
        },
        pb: {
          p3: [null, null, null, null, null, null, 12.3, 12.6, 12.8, 13.2, 13.5, 14.0, 14.4, 14.7],
          p15: [null, null, null, null, null, null, 12.8, 13.1, 13.3, 13.7, 14.0, 14.5, 14.9, 15.2],
          p50: [null, null, null, null, null, null, 13.5, 13.8, 14.1, 14.5, 14.8, 15.3, 15.7, 16.1],
          p85: [null, null, null, null, null, null, 14.2, 14.5, 14.8, 15.2, 15.6, 16.2, 16.6, 17.0],
          p97: [null, null, null, null, null, null, 14.7, 15.0, 15.4, 15.8, 16.2, 16.8, 17.2, 17.6],
        },
      },
    },
    /* Enfant suivi : décrochage progressif des couloirs (démonstration) */
    child: {
      name: "Enfant suivi · Niger",
      months: [6, 12, 18, 24, 30, 36],
      values: [7.6, 8.8, 9.7, 10.3, 11.0, 11.6],
      height: [66.8, 74.2, 79.4, 83.1, 86.0, 88.4],
      pb: [14.2, 13.9, 13.5, 13.2, 12.9, 12.6],
    },
    percentiles: ["p3", "p15", "p50", "p85", "p97"],
    percentileLabels: { p3: "P3", p15: "P15", p50: "P50", p85: "P85", p97: "P97" },
    percentileColors: { p3: "#E5243B", p15: "#F26A21", p50: "#0E7490", p85: "#80BD41", p97: "#DDA63A" },
  };

  /* ==========================================================================
     4. TUNNEL MAS — prise en charge (graphique 2)
     ========================================================================== */
  var FUNNEL = [
    { name: "Enfants MAS", short: "Enfants MAS", value: 3800000, pct: 100, color: "#E5243B" },
    { name: "Dépistés communautaire", short: "Dépistés", value: 2100000, pct: 55, color: "#F26A21" },
    { name: "Référés CRENAS", short: "Référés", value: 1600000, pct: 42, color: "#DDA63A" },
    { name: "Admis & traités", short: "Admis & traités", value: 1200000, pct: 32, color: "#A3C64A" },
    { name: "Traitement complet", short: "Traitement complet", value: 1000000, pct: 26, color: "#80BD41" },
    { name: "Guéris", short: "Guéris", value: 850000, pct: 22, color: "#4D9950" },
  ];

  /* ==========================================================================
     5. SUPPLÉMENTATION — 8 campagnes (graphique 5)
     ========================================================================== */
  var SUPPLEMENTATION = {
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    objective: 80,
    series: [
      { id: "vita", name: "Vitamine A", color: "#1CABE2", data: [58, 61, 63, 65, 67, 68, 70, 71] },
      { id: "deworm", name: "Déparasitage", color: "#80BD41", data: [62, 65, 68, 70, 72, 74, 76, 78] },
      { id: "zinc", name: "Zinc", color: "#F26A21", data: [18, 22, 26, 29, 31, 34, 36, 38] },
    ],
  };

  /* ==========================================================================
     6. ÉVOLUTION MAS 2016 → 2024 (graphique 10)
     ========================================================================== */
  var MAS_EVOLUTION = {
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    urgency: 10,   /* seuil OMS urgence : > 10 %          */
    alert: 5,      /* zone d'alerte : 5 - 10 %            */
    series: [
      { code: "NE", name: "Niger", color: "#E5243B", data: [17.2, 16.8, 16.1, 15.8, 15.4, 15.0, 14.9, 14.8, 14.8] },
      { code: "ML", name: "Mali", color: "#F26A21", data: [14.8, 14.3, 13.9, 13.5, 13.1, 12.8, 12.5, 12.3, 12.3] },
      { code: "MR", name: "Mauritanie", color: "#7C3AED", data: [16.1, 15.8, 15.4, 15.2, 15.0, 15.1, 15.2, 15.1, 15.1] },
      { code: "BF", name: "Burkina Faso", color: "#DDA63A", data: [10.2, 9.8, 9.4, 9.1, 8.8, 8.5, 8.3, 8.1, 8.1] },
      { code: "SN", name: "Sénégal", color: "#1CABE2", data: [9.4, 9.0, 8.7, 8.4, 8.1, 7.8, 7.5, 7.2, 7.2] },
    ],
  };

  /* ==========================================================================
     7. BULLES MAS — carte schématique (graphique 9)
     ========================================================================== */
  var BUBBLES = ["NE", "ML", "BF", "SN", "NG", "MR", "SL", "LR"].map(function (code) {
    var c = null;
    COUNTRIES.forEach(function (x) { if (x.code === code) c = x; });
    return { code: code, name: c.name, mas: c.mas, abs: c.masAbs, map: c.map, flag: c.flag };
  });

  /* ==========================================================================
     8. CAUSES DE LA MALNUTRITION — donut à deux anneaux (graphique 11)
     ========================================================================== */
  var CAUSES = {
    center: "Causes de la\nMalnutrition",
    outer: [
      { name: "Alimentation insuffisante", value: 38, color: "#E5243B" },
      { name: "Maladies infectieuses", value: 31, color: "#7C3AED" },
      { name: "Alimentation + Maladies", value: 31, color: "#0E7490" },
    ],
    inner: [
      { name: "Insécurité alimentaire", value: 42, color: "#F26A21" },
      { name: "WASH insuffisant", value: 28, color: "#1CABE2" },
      { name: "Soins inadéquats", value: 22, color: "#80BD41" },
      { name: "Pauvreté", value: 8, color: "#DDA63A" },
    ],
  };

  /* ==========================================================================
     9. ANJE — barres groupées 5 pays (graphique 12)
     ========================================================================== */
  var GROUPED_ANJE = {
    countries: ["NE", "ML", "BF", "SN", "GH"],
    rows: [
      { label: "Allaitement excl.", short: "Allaitement excl.", target: 70, values: [24, 28, 41, 38, 48] },
      { label: "Diversité minimale", short: "Diversité min.", target: 50, values: [18, 22, 29, 34, 41] },
      { label: "Fréquence des repas", short: "Fréq. repas", target: 70, values: [44, 48, 52, 58, 64] },
      { label: "Mise au sein précoce", short: "Mise au sein", target: 80, values: [42, 48, 68, 61, 72] },
      { label: "Alimentation acceptable", short: "Alim. acceptable", target: 40, values: [16, 19, 24, 31, 38] },
    ],
  };

  /* ==========================================================================
     10. SAISONNALITÉ DES ADMISSIONS — rose polaire (graphique 13)
     Admissions CRENAS, base 100 = moyenne annuelle.
     ========================================================================== */
  var SEASONALITY = {
    months: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
    soudure: [5, 8],   /* secteurs juin → septembre, zone de soudure */
    years: [
      { year: "2022", color: "#94A3B8", alpha: 0.42, ring: true,
        data: [85, 83, 82, 88, 99, 120, 138, 145, 132, 112, 97, 91] },
      { year: "2023", color: "#F26A21", alpha: 0.5, ring: true,
        data: [92, 90, 88, 95, 108, 132, 150, 158, 143, 121, 104, 98] },
      { year: "2024", color: "#1CABE2", alpha: 0.85, ring: false,
        data: [100, 98, 96, 102, 118, 145, 168, 172, 155, 130, 112, 105] },
    ],
  };

  /* ==========================================================================
     11. FENÊTRE DES 1000 JOURS — timeline (graphique 8)
     ========================================================================== */
  var TIMELINE = {
    days: 1000,
    milestones: [
      { day: 0, label: "Conception", icon: "heart", sub: "J0" },
      { day: 270, label: "Naissance", icon: "baby", sub: "J270" },
      { day: 450, label: "6 mois", icon: "milk", sub: "J450" },
      { day: 635, label: "12 mois", icon: "spoon", sub: "J635" },
      { day: 1000, label: "24 mois", icon: "child", sub: "J1000" },
    ],
    interventions: [
      { from: 0, to: 270, label: "Supplémentation Fe / acide folique", color: "#E5243B", caret: true },
      { from: 270, to: 450, label: "Allaitement exclusif", color: "#1CABE2", caret: true },
      { from: 450, to: 730, label: "Introduction complémentaire", color: "#80BD41", caret: true },
      { day: 365, label: "Vit. A 1ère dose", color: "#F26A21" },
      { day: 550, label: "Déparasitage", color: "#7C3AED" },
      { day: 750, label: "Vit. A 2ème dose", color: "#DDA63A" },
    ],
    impact: {
      label: "Impact cumulé sur le retard de croissance",
      days: [0, 120, 270, 450, 635, 800, 1000],
      reduction: [0, 2, 5, 9, 14, 18, 20],
      final: "−20 % de retard de croissance avec un paquet complet d'interventions",
    },
  };

  /* ==========================================================================
     12. COUVERTURE VITAMINE A — lollipop 14 pays (graphique 14)
     ========================================================================== */
  var LOLLIPOP = ["NE", "ML", "BF", "SN", "NG", "GH", "CI", "MR", "SL", "LR", "GW", "GM", "BJ", "TG"]
    .map(function (code) {
      var c = null;
      COUNTRIES.forEach(function (x) { if (x.code === code) c = x; });
      return { code: code, name: c.name, short: c.short, flag: c.flag, from: c.vitA2022, to: c.vitA };
    });
  var LOLLIPOP_OBJECTIVE = 80;

  /* ==========================================================================
     13. SCORECARD CRENAS — panel de 10 pays (graphiques 4 et 15)
     Seuils Sphère : guérison > 75 %, abandon < 15 %, décès < 10 %.
     ========================================================================== */
  var SCORECARD_CODES = ["NE", "ML", "BF", "SN", "NG", "GH", "CI", "MR", "SL", "GM"];
  var SPHERE = { cure: 75, abandon: 15, death: 10, stock: 60 };

  var SCORECARD = SCORECARD_CODES.map(function (code) {
    var c = null;
    COUNTRIES.forEach(function (x) { if (x.code === code) c = x; });
    return c;
  });

  var BULLET_METRICS = [
    { id: "cure", label: "Guérison", short: "Guérison", unit: " %", target: SPHERE.cure, better: "high", prev: "curePrev", decimals: 0 },
    { id: "abandon", label: "Abandon", short: "Abandon", unit: " %", target: SPHERE.abandon, better: "low", prev: null, decimals: 1 },
    { id: "death", label: "Décès", short: "Décès", unit: " %", target: SPHERE.death, better: "low", prev: null, decimals: 1 },
  ];

  /* ==========================================================================
     14. KPI — 5 cartes de synthèse
     ========================================================================== */
  var MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

  /* Admissions CRENAS des 12 derniers mois (panel scorecard) : le dernier
     point est la somme des admissions pays et donne l'écart mensuel affiché. */
  var ADMISSIONS_12M = [38200, 35600, 34100, 36800, 41200, 45800, 52400, 56100, 53200, 47400, 43100, 48234];

  var KPI = {
    /* 3,8 M : estimation consolidée régionale UNICEF/SMART 2024 (7,8 M d'enfants
       MAS en Afrique de l'Ouest et centrale à l'échelle élargie ; le panel
       continental de ce tableau de bord en couvre 3,8 M). Les décomptes par
       pays du graphique 9 sont des cas prévalents non sommable avec elle. */
    sam: { total: 3.8, unit: "M", label: "Malnutrition Aigüe Sévère", sub: "Enfants < 5 ans · Afrique de l'Ouest" },
    /* 32 % : taux régional consolidé d'allaitement exclusif 0-6 mois. */
    ebf: { regional: 32, target: 70, label: "Allaitement exclusif 0-6 mois" },
    /* Taux de guérison consolidé CRENAS = moyenne des cohortes pondérée par
       les admissions du panel (recalculé dans le module : 84,7 %). */
    cure: { target: SPHERE.cure, spark: [82.1, 82.4, 82.9, 83.2, 83.6, 83.9, 84.1, 84.3, 84.5, 84.6, 84.5, 84.7] },
    /* 71 % : couverture régionale consolidée vitamine A, objectif 80 % ;
       le décompte de pays ≥ 80 % suit VITA_OVER_80. */
    vita: { regional: 71, target: 80, over80: VITA_OVER_80 },
    admissions: { series: ADMISSIONS_12M, months: MONTHS_SHORT },
    /* Prévalence MAS — 6 pays prioritaires (Niger en tête) */
    samBars: ["NE", "ML", "GN", "GM", "BF", "SN"].map(function (code) {
      var c = null;
      COUNTRIES.forEach(function (x) { if (x.code === code) c = x; });
      return { code: code, name: c.short, flag: c.flag, value: c.mas };
    }),
  };

  /* ==========================================================================
     15. NAVIGATION DU MODULE
     ========================================================================== */
  var NAV = [
    { id: "sam", icon: "👶", label: "Malnutrition infantile", targets: ["unG1", "unG2", "unG9", "unG10"], note: "MAS · dépistage · prise en charge" },
    { id: "anje", icon: "🤱", label: "ANJE & Allaitement", targets: ["unG3", "unG6", "unG12"], note: "8 indicateurs OMS · 12 pays" },
    { id: "crenas", icon: "🏥", label: "CRENAS/CRENAM", targets: ["unG4", "unG13", "unG15"], note: "cohortes · performance · stocks" },
    { id: "supp", icon: "💊", label: "Supplémentation", targets: ["unG5", "unG8", "unG14"], note: "vitamine A · déparasitage · zinc" },
    { id: "wash", icon: "🌊", label: "WASH & Nutrition", targets: ["unG7", "unG11"], note: "eau · assainissement · causes" },
    { id: "tend", icon: "📈", label: "Tendances", targets: ["unG10", "unG13", "unKpis"], note: "séries longues · saisonnalité" },
  ];

  var COUNTRY_CHIPS = ["NE", "ML", "BF", "SN", "NG", "GH"];

  var BY_CODE = {};
  COUNTRIES.forEach(function (c) { BY_CODE[c.code] = c; });

  /* ------------------------------------------------------------------ export */
  root.UNICEF_DATA = {
    COLORS: COLORS,
    BANDS: BANDS,
    COUNTRIES: COUNTRIES,
    BY_CODE: BY_CODE,
    COUNTRY_CHIPS: COUNTRY_CHIPS,
    ANJE: ANJE,
    ANJE_BENCHMARK: ANJE_BENCHMARK,
    GROWTH: GROWTH,
    FUNNEL: FUNNEL,
    SUPPLEMENTATION: SUPPLEMENTATION,
    MAS_EVOLUTION: MAS_EVOLUTION,
    BUBBLES: BUBBLES,
    CAUSES: CAUSES,
    GROUPED_ANJE: GROUPED_ANJE,
    SEASONALITY: SEASONALITY,
    TIMELINE: TIMELINE,
    LOLLIPOP: LOLLIPOP,
    LOLLIPOP_OBJECTIVE: LOLLIPOP_OBJECTIVE,
    SCORECARD: SCORECARD,
    SPHERE: SPHERE,
    BULLET_METRICS: BULLET_METRICS,
    KPI: KPI,
    NAV: NAV,
    VITA_OVER_80: VITA_OVER_80,
    MONTHS_SHORT: MONTHS_SHORT,
  };
})(typeof window !== "undefined" ? window : globalThis);
