/* ============================================================================
   NUTRI.N°1 — PAM · FOOD SECURITY ANALYTICS · AFRIQUE DE L'OUEST
   wfp-data.js — données illustratives du tableau de bord.

   Chiffres de démonstration, figés et déterministes, alignés sur les cadres
   IPC / FCS / CSI / HDDS. Ils ne remplacent pas les estimations officielles
   du Programme alimentaire mondial.
   ============================================================================ */
(function (root) {
  "use strict";

  var PHASES = [
    { id: 1, label: "IPC 1 · Minimale", short: "Minimale", color: "#22C55E" },
    { id: 2, label: "IPC 2 · Sous pression", short: "Sous pression", color: "#86EFAC" },
    { id: 3, label: "IPC 3 · Crise", short: "Crise", color: "#FCD34D" },
    { id: 4, label: "IPC 4 · Urgence", short: "Urgence", color: "#FB923C" },
    { id: 5, label: "IPC 5 · Famine", short: "Famine", color: "#EF4444" },
  ];

  var COLORS = {
    amber: "#F59E0B",
    amberSoft: "#FBBF24",
    red: "#EF4444",
    green: "#10B981",
    violet: "#8B5CF6",
    blue: "#3B82F6",
    orange: "#FB923C",
    ink: "#1C1008",
    muted: "#78716C",
  };

  /* phases = [IPC1..IPC5] en % de la population, somme 100.
     ipc = phase nationale classée. phase4 = alerte phase 4 du bandeau.
     insecure = personnes en insécurité alimentaire, millions. */
  var COUNTRIES = [
    { code: "NE", name: "Niger", short: "Niger", flag: "🇳🇪", region: "sahel", pop: 26.2, insecure: 7.2, fcs: 28.3, fcsPrev: 30.1, fcs2020: 32.0, csi: 38, ipc: 4, phase4: true, phases: [12, 28, 38, 18, 4], kcal: 2180, access: 48, mag: 13.2, fpi: 158, priceRatio: 2.30, coverage: 58, coveragePrev: 52, mam: 64, mamPrev: 61, stocks: 21, stocksPrev: 26, hddsMean: 3.9, hddsPrev: 4.2, benefW: 1.9 },
    { code: "ML", name: "Mali", short: "Mali", flag: "🇲🇱", region: "sahel", pop: 22.6, insecure: 5.3, fcs: 34.1, fcsPrev: 35.8, fcs2020: 36.0, csi: 31, ipc: 3, phase4: true, phases: [18, 32, 34, 14, 2], kcal: 2280, access: 54, mag: 10.1, fpi: 146, priceRatio: 2.10, coverage: 61, coveragePrev: 57, mam: 67, mamPrev: 65, stocks: 26, stocksPrev: 31, hddsMean: 4.4, hddsPrev: 4.6, benefW: 1.5 },
    { code: "BF", name: "Burkina Faso", short: "Burkina", flag: "🇧🇫", region: "sahel", pop: 22.7, insecure: 5.8, fcs: 36.2, fcsPrev: 37.9, fcs2020: 38.0, csi: 28, ipc: 3, phase4: true, phases: [15, 30, 36, 17, 2], kcal: 2350, access: 58, mag: 9.4, fpi: 142, priceRatio: 2.15, coverage: 63, coveragePrev: 59, mam: 69, mamPrev: 66, stocks: 29, stocksPrev: 33, hddsMean: 4.6, hddsPrev: 4.8, benefW: 1.6 },
    { code: "SN", name: "Sénégal", short: "Sénégal", flag: "🇸🇳", region: "sahel", pop: 17.8, insecure: 2.0, fcs: 48.7, fcsPrev: 47.2, fcs2020: 49.0, csi: 18, ipc: 2, phase4: false, phases: [42, 38, 16, 4, 0], kcal: 2480, access: 72, mag: 6.8, fpi: 118, priceRatio: 1.45, coverage: 74, coveragePrev: 71, mam: 78, mamPrev: 76, stocks: 48, stocksPrev: 44, hddsMean: 6.1, hddsPrev: 5.9, benefW: 0.55 },
    { code: "NG", name: "Nigeria", short: "Nigeria", flag: "🇳🇬", region: "cotier", pop: 223.8, insecure: 8.2, fcs: 39.4, fcsPrev: 40.8, fcs2020: 41.0, csi: 24, ipc: 3, phase4: false, phases: [22, 35, 31, 11, 1], kcal: 2520, access: 64, mag: 8.6, fpi: 124, priceRatio: 1.70, coverage: 66, coveragePrev: 61, mam: 71, mamPrev: 69, stocks: 34, stocksPrev: 38, hddsMean: 5.0, hddsPrev: 5.2, benefW: 2.6 },
    { code: "GH", name: "Ghana", short: "Ghana", flag: "🇬🇭", region: "cotier", pop: 33.5, insecure: 1.6, fcs: 54.2, fcsPrev: 52.8, fcs2020: 54.0, csi: 12, ipc: 2, phase4: false, phases: [45, 38, 14, 3, 0], kcal: 2680, access: 79, mag: 5.4, fpi: 106, priceRatio: 1.22, coverage: 81, coveragePrev: 78, mam: 84, mamPrev: 82, stocks: 62, stocksPrev: 58, hddsMean: 6.8, hddsPrev: 6.6, benefW: 0.45 },
    { code: "CI", name: "Côte d'Ivoire", short: "C. Ivoire", flag: "🇨🇮", region: "cotier", pop: 28.9, insecure: 2.2, fcs: 51.3, fcsPrev: 50.1, fcs2020: 49.4, csi: 14, ipc: 2, phase4: false, phases: [48, 36, 13, 3, 0], kcal: 2550, access: 71, mag: 6.1, fpi: 110, priceRatio: 1.28, coverage: 78, coveragePrev: 74, mam: 82, mamPrev: 80, stocks: 55, stocksPrev: 51, hddsMean: 6.5, hddsPrev: 6.3, benefW: 0.7 },
    { code: "MR", name: "Mauritanie", short: "Maurit.", flag: "🇲🇷", region: "sahel", pop: 4.9, insecure: 2.3, fcs: 32.6, fcsPrev: 34.2, fcs2020: 36.5, csi: 33, ipc: 3, phase4: false, phases: [14, 29, 37, 18, 2], kcal: 2240, access: 46, mag: 11.4, fpi: 151, priceRatio: 2.05, coverage: 57, coveragePrev: 53, mam: 65, mamPrev: 62, stocks: 24, stocksPrev: 29, hddsMean: 4.2, hddsPrev: 4.4, benefW: 0.85 },
    { code: "GN", name: "Guinée", short: "Guinée", flag: "🇬🇳", region: "cotier", pop: 14.2, insecure: 2.6, fcs: 44.2, fcsPrev: 43.7, fcs2020: 42.5, csi: 21, ipc: 2, phase4: false, phases: [34, 46, 16, 4, 0], kcal: 2320, access: 61, mag: 7.4, fpi: 121, priceRatio: 1.48, coverage: 70, coveragePrev: 66, mam: 74, mamPrev: 72, stocks: 38, stocksPrev: 35, hddsMean: 5.6, hddsPrev: 5.4, benefW: 0.7 },
    { code: "SL", name: "Sierra Leone", short: "S. Leone", flag: "🇸🇱", region: "cotier", pop: 8.6, insecure: 2.0, fcs: 41.8, fcsPrev: 42.9, fcs2020: 44.2, csi: 26, ipc: 3, phase4: false, phases: [20, 30, 34, 14, 2], kcal: 2290, access: 57, mag: 8.8, fpi: 132, priceRatio: 1.72, coverage: 64, coveragePrev: 60, mam: 68, mamPrev: 66, stocks: 30, stocksPrev: 34, hddsMean: 4.8, hddsPrev: 5.0, benefW: 0.5 },
    { code: "LR", name: "Liberia", short: "Liberia", flag: "🇱🇷", region: "cotier", pop: 5.4, insecure: 1.5, fcs: 43.2, fcsPrev: 42.1, fcs2020: 41.8, csi: 23, ipc: 2, phase4: false, phases: [40, 44, 12, 4, 0], kcal: 2340, access: 60, mag: 7.1, fpi: 119, priceRatio: 1.40, coverage: 68, coveragePrev: 64, mam: 73, mamPrev: 71, stocks: 36, stocksPrev: 33, hddsMean: 5.4, hddsPrev: 5.2, benefW: 0.3 },
    { code: "GW", name: "Guinée-Bissau", short: "G. Bissau", flag: "🇬🇼", region: "cotier", pop: 2.1, insecure: 0.4, fcs: 38.9, fcsPrev: 39.8, fcs2020: 41.5, csi: 29, ipc: 3, phase4: false, phases: [16, 30, 36, 16, 2], kcal: 2210, access: 52, mag: 9.6, fpi: 136, priceRatio: 1.85, coverage: 60, coveragePrev: 56, mam: 66, mamPrev: 64, stocks: 27, stocksPrev: 31, hddsMean: 4.5, hddsPrev: 4.7, benefW: 0.2 },
    { code: "GM", name: "Gambie", short: "Gambie", flag: "🇬🇲", region: "cotier", pop: 2.7, insecure: 0.5, fcs: 46.1, fcsPrev: 45.3, fcs2020: 44.8, csi: 19, ipc: 2, phase4: false, phases: [44, 38, 14, 4, 0], kcal: 2410, access: 69, mag: 6.4, fpi: 112, priceRatio: 1.32, coverage: 76, coveragePrev: 73, mam: 80, mamPrev: 78, stocks: 50, stocksPrev: 46, hddsMean: 6.0, hddsPrev: 5.8, benefW: 0.15 },
    { code: "BJ", name: "Bénin", short: "Bénin", flag: "🇧🇯", region: "cotier", pop: 13.7, insecure: 1.3, fcs: 47.3, fcsPrev: 46.1, fcs2020: 45.5, csi: 20, ipc: 2, phase4: false, phases: [46, 36, 14, 4, 0], kcal: 2460, access: 68, mag: 6.2, fpi: 109, priceRatio: 1.30, coverage: 77, coveragePrev: 73, mam: 81, mamPrev: 79, stocks: 52, stocksPrev: 48, hddsMean: 6.2, hddsPrev: 6.0, benefW: 0.4 },
    { code: "TG", name: "Togo", short: "Togo", flag: "🇹🇬", region: "cotier", pop: 9.1, insecure: 0.8, fcs: 45.8, fcsPrev: 44.9, fcs2020: 43.6, csi: 21, ipc: 2, phase4: false, phases: [42, 40, 14, 4, 0], kcal: 2390, access: 66, mag: 6.6, fpi: 114, priceRatio: 1.35, coverage: 75, coveragePrev: 71, mam: 79, mamPrev: 77, stocks: 49, stocksPrev: 45, hddsMean: 5.9, hddsPrev: 5.7, benefW: 0.35 },
  ];

  /* Polygones simplifiés [lon, lat] — Afrique de l'Ouest, rendus Canvas. */
  var POLYGONS = {
    MR: [[-17.0, 20.6], [-16.5, 26.8], [-8.2, 27.1], [-5.2, 24.6], [-4.9, 16.6], [-11.6, 14.9], [-16.0, 16.2], [-17.2, 19.4]],
    ML: [[-12.0, 14.6], [-5.0, 15.0], [-4.2, 24.6], [1.2, 24.9], [4.0, 21.8], [3.8, 15.2], [1.6, 11.2], [-4.6, 10.3], [-9.6, 12.2], [-12.1, 13.6]],
    NE: [[0.4, 14.8], [3.6, 13.2], [3.9, 11.9], [8.2, 12.6], [12.6, 13.4], [13.8, 12.2], [15.6, 13.6], [15.6, 23.1], [4.2, 23.4], [2.2, 19.5], [0.6, 15.6]],
    BF: [[-5.5, 9.6], [-2.2, 9.5], [2.15, 11.25], [1.95, 14.85], [-5.15, 14.9], [-5.55, 12.3]],
    SN: [[-17.45, 14.75], [-16.05, 16.55], [-12.15, 16.4], [-11.7, 13.7], [-12.3, 12.35], [-16.55, 12.25], [-17.5, 13.45]],
    GM: [[-16.55, 13.58], [-13.85, 13.52], [-13.8, 13.18], [-16.5, 13.22]],
    GW: [[-16.55, 12.15], [-13.75, 12.35], [-13.65, 11.05], [-15.4, 10.95], [-16.55, 11.25]],
    GN: [[-14.9, 12.05], [-13.1, 12.35], [-8.35, 10.55], [-7.95, 7.65], [-12.3, 7.55], [-14.4, 9.05], [-15.05, 10.45]],
    SL: [[-13.25, 9.95], [-10.95, 9.9], [-10.35, 7.05], [-13.05, 7.0]],
    LR: [[-11.35, 8.45], [-7.65, 8.35], [-7.45, 4.4], [-11.25, 4.35]],
    CI: [[-8.45, 10.45], [-2.95, 10.55], [-2.55, 4.85], [-7.55, 4.5], [-8.35, 7.15]],
    GH: [[-3.15, 11.0], [0.05, 11.05], [0.15, 5.05], [-2.65, 4.95], [-3.2, 7.6]],
    TG: [[0.2, 10.95], [1.42, 10.9], [1.32, 6.2], [0.55, 6.25]],
    BJ: [[1.58, 12.15], [3.65, 12.1], [3.3, 6.35], [1.62, 6.4]],
    NG: [[3.85, 13.45], [14.35, 13.25], [14.55, 6.45], [8.3, 4.35], [4.9, 5.7], [3.9, 6.5], [3.55, 9.6], [2.85, 11.4], [3.3, 12.7]],
  };

  var ALERTS = {
    NE: [4, 3, 3, 3, 4, 4, 5, 5, 4, 4, 3, 3],
    ML: [3, 3, 2, 2, 3, 4, 4, 5, 4, 3, 3, 2],
    BF: [3, 2, 2, 2, 3, 3, 4, 4, 4, 3, 3, 2],
    SN: [1, 1, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1],
    NG: [2, 2, 2, 2, 3, 3, 4, 4, 3, 3, 2, 2],
    GH: [1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1],
    CI: [1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1],
    MR: [3, 3, 3, 3, 4, 4, 5, 5, 4, 3, 3, 3],
    GN: [2, 2, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2],
    SL: [2, 2, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2],
    LR: [2, 2, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2],
    GW: [3, 2, 2, 3, 3, 4, 4, 4, 3, 3, 2, 2],
    GM: [1, 1, 1, 2, 2, 2, 3, 3, 2, 2, 1, 1],
    BJ: [1, 1, 1, 1, 2, 2, 2, 3, 2, 1, 1, 1],
    TG: [1, 1, 1, 2, 2, 2, 3, 3, 2, 2, 1, 1],
  };

  var FCS_SERIES = {
    labels: ["T1 20", "T3 20", "T1 21", "T3 21", "T1 22", "T3 22", "T1 23", "T3 23", "T1 24", "T2 24", "T3 24", "T4 24"],
    covid: [0, 3],
    sahel: [4, 7],
    series: [
      { code: "NE", name: "Niger", color: "#F59E0B", data: [32, 31, 30, 29, 28, 30, 29, 28, 27, 28, 28, 27] },
      { code: "ML", name: "Mali", color: "#EF4444", data: [36, 35, 35, 34, 34, 35, 34, 34, 33, 34, 34, 33] },
      { code: "BF", name: "Burkina Faso", color: "#8B5CF6", data: [38, 37, 37, 36, 36, 37, 36, 36, 35, 36, 36, 35] },
      { code: "SN", name: "Sénégal", color: "#10B981", data: [49, 49, 50, 50, 49, 50, 50, 51, 51, 50, 50, 51] },
      { code: "GH", name: "Ghana", color: "#3B82F6", data: [54, 54, 55, 55, 54, 55, 56, 56, 55, 56, 56, 57] },
      { code: "NG", name: "Nigeria", color: "#FB923C", data: [41, 41, 40, 40, 39, 40, 40, 39, 39, 40, 39, 39] },
    ],
  };

  var CSI = {
    axes: ["Réduction portions", "Repas réduits / jour", "Emprunts nourrit.", "Vente actifs prod.", "Enfants sans repas"],
    note: "Score élevé = situation critique",
    countries: [
      { code: "NE", name: "Niger", color: "#F59E0B", values: [72, 68, 54, 48, 31] },
      { code: "ML", name: "Mali", color: "#EF4444", values: [62, 58, 47, 38, 22] },
      { code: "BF", name: "Burkina Faso", color: "#8B5CF6", values: [55, 51, 41, 32, 18] },
      { code: "SN", name: "Sénégal", color: "#10B981", values: [28, 24, 19, 12, 6] },
      { code: "GH", name: "Ghana", color: "#3B82F6", values: [21, 18, 14, 9, 4] },
    ],
  };

  var FUNNEL = [
    { label: "Bénéficiaires ciblés", value: 18.2, pct: 100, loss: "Référence du plan de réponse — 100 % de la cible identifiée." },
    { label: "Enregistrés", value: 15.1, pct: 83, loss: "Ménages non joints, déplacements et refus d'enregistrement." },
    { label: "Plan de ravitaillement", value: 14.2, pct: 78, loss: "Contraintes logistiques et fenêtres d'accès trop courtes." },
    { label: "Approvisionnés", value: 13.4, pct: 74, loss: "Ruptures fournisseurs, retards portuaires et corridors." },
    { label: "Distribués", value: 12.4, pct: 68, loss: "Accès terrain, insécurité et dernier kilomètre." },
    { label: "Confirmés reçus", value: 11.8, pct: 65, loss: "Non-confirmation, absences au point de distribution, pertes finales." },
  ];

  var SEASON = {
    labels: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"],
    years: [
      { year: 2022, opacity: 0.35, values: [33, 33, 32, 33, 37, 42, 46, 48, 43, 39, 36, 34] },
      { year: 2023, opacity: 0.55, values: [36, 35, 34, 36, 39, 45, 49, 51, 46, 41, 39, 37] },
      { year: 2024, opacity: 1, values: [38, 37, 36, 38, 42, 48, 52, 54, 49, 44, 41, 39] },
    ],
    soudure: [5, 8],
  };

  var CEREALS = {
    labels: (function () {
      var out = [];
      for (var y = 2020; y <= 2024; y++) for (var q = 1; q <= 4; q++) out.push(y + " T" + q);
      return out;
    })(),
    series: [
      { id: "mil", name: "Mil", color: "#F59E0B", data: [180, 185, 190, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345, 360, 375, 390, 400, 410, 420] },
      { id: "mais", name: "Maïs", color: "#FBBF24", data: [160, 165, 170, 175, 190, 205, 220, 235, 248, 260, 272, 285, 298, 310, 322, 334, 346, 358, 368, 378] },
      { id: "riz", name: "Riz", color: "#3B82F6", data: [400, 408, 416, 424, 435, 446, 458, 470, 480, 490, 500, 512, 524, 536, 548, 560, 572, 584, 596, 608] },
      { id: "sorgho", name: "Sorgho", color: "#EF4444", data: [150, 154, 158, 162, 172, 182, 192, 204, 216, 228, 240, 252, 264, 276, 290, 305, 318, 330, 342, 355] },
      { id: "haricots", name: "Haricots", color: "#8B5CF6", data: [240, 248, 256, 264, 278, 292, 308, 320, 334, 348, 362, 376, 390, 404, 418, 432, 446, 460, 472, 485] },
    ],
    zones: [
      { from: 0, to: 7, color: "rgba(100,116,139,.13)", label: "COVID 2020-2021" },
      { from: 8, to: 11, color: "rgba(239,68,68,.10)", label: "Crise Ukraine 2022" },
      { from: 9, to: 15, color: "rgba(245,158,11,.12)", label: "Crise Sahel 2022-23" },
    ],
  };

  var BUDGET = {
    need: 2.8,
    available: 2.1,
    gap: 0.7,
    items: [
      { label: "Besoin", kind: "anchor", value: 2.8, from: 0 },
      { label: "USA", kind: "in", value: 0.8, from: 0 },
      { label: "UE", kind: "in", value: 0.6, from: 0.8 },
      { label: "Royaume-Uni", kind: "in", value: 0.3, from: 1.4 },
      { label: "Autres bailleurs", kind: "in", value: 0.4, from: 1.7 },
      { label: "Disponible", kind: "total", value: 2.1, from: 0 },
      { label: "Gap", kind: "gap", value: 0.7, from: 2.1 },
    ],
  };

  var INDICATORS = [
    { id: "fcs", label: "FCS moyen", unit: "", target: 42, higher: true, min: 20, max: 70, get: function (c) { return c.fcs; }, prev: function (c) { return c.fcsPrev; } },
    { id: "csi", label: "CSI moyen", unit: "", target: 20, higher: false, min: 0, max: 50, get: function (c) { return c.csi; }, prev: function (c) { return Math.round(c.csi * 0.92); } },
    { id: "coverage", label: "Couverture PAM", unit: "%", target: 75, higher: true, min: 0, max: 100, get: function (c) { return c.coverage; }, prev: function (c) { return c.coveragePrev; } },
    { id: "ipc3", label: "% IPC 3+", unit: "%", target: 15, higher: false, min: 0, max: 80, get: function (c) { return c.ipc3share; }, prev: function (c) { return c.ipc3share2023; } },
    { id: "mam", label: "Guérison MAM", unit: "%", target: 75, higher: true, min: 40, max: 100, get: function (c) { return c.mam; }, prev: function (c) { return c.mamPrev; } },
    { id: "price", label: "Prix / normale", unit: "×", target: 1, higher: false, min: 0.8, max: 2.6, get: function (c) { return c.priceRatio; }, prev: function (c) { return Math.round(c.priceRatio * 0.86 * 100) / 100; } },
    { id: "hdds", label: "HDDS moyen", unit: "", target: 6, higher: true, min: 0, max: 12, get: function (c) { return c.hddsMean; }, prev: function (c) { return c.hddsPrev; } },
    { id: "stocks", label: "Stocks (jours)", unit: " j", target: 60, higher: true, min: 0, max: 90, get: function (c) { return c.stocks; }, prev: function (c) { return c.stocksPrev; } },
  ];

  var PRICE_INDEX = [108.2, 109.4, 110.1, 111.8, 113.5, 116.2, 118.4, 121.0, 122.6, 124.1, 125.8, 127.4];

  function round1(n) { return Math.round(n * 10) / 10; }
  function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }

  function shiftPhases(phases, towardBetter) {
    var p = phases.slice();
    var move = Math.min(towardBetter, p[2] + p[3] + p[4]);
    var left = move;
    for (var i = 4; i >= 2 && left > 0; i--) {
      var take = Math.min(p[i], left);
      p[i] = round1(p[i] - take);
      left = round1(left - take);
    }
    p[0] = round1(p[0] + move * 0.35);
    p[1] = round1(p[1] + move * 0.65);
    var s = sum(p);
    p = p.map(function (v) { return round1(v * 100 / s); });
    p[1] = round1(p[1] + (100 - sum(p)));
    return p;
  }

  function hddsCurve(mean) {
    var sd = 1.65, raw = [], s = 0, i;
    for (i = 0; i <= 12; i++) {
      var z = (i + 0.5 - mean) / sd;
      var w = Math.exp(-0.5 * z * z);
      raw.push(w);
      s += w;
    }
    var out = raw.map(function (w) { return Math.round(w / s * 1000) / 10; });
    var drift = Math.round((100 - sum(out)) * 10) / 10;
    var pivot = Math.max(0, Math.min(12, Math.round(mean)));
    out[pivot] = Math.round((out[pivot] + drift) * 10) / 10;
    return out;
  }

  function pricePath(start, end, normal, seed) {
    var out = [], i;
    for (i = 0; i < 24; i++) {
      var t = i / 23;
      var eased = Math.pow(t, 0.7);
      var month = i % 12;
      var season = (month >= 5 && month <= 8) ? normal * 0.055 : (month <= 1 || month === 11 ? -normal * 0.028 : 0);
      var wave = Math.sin(i * 0.9 + seed) * normal * 0.022;
      out.push(Math.max(1, Math.round(start + (end - start) * eased + season + wave)));
    }
    out[0] = start;
    out[23] = end;
    return out;
  }

  var MOIS = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
  var MONTH_LABELS = [];
  for (var yy = 2023; yy <= 2024; yy++) {
    for (var mm = 0; mm < 12; mm++) MONTH_LABELS.push(MOIS[mm] + " " + String(yy).slice(2));
  }

  var COMMODITIES = [
    { id: "mil", name: "Mil", market: "Niger", normal: 183, monthly: pricePath(180, 420, 183, 1.2), region: "sahel" },
    { id: "mais", name: "Maïs", market: "Burkina Faso", normal: 158, monthly: pricePath(160, 380, 158, 2.1), region: "sahel" },
    { id: "riz", name: "Riz", market: "Sénégal", normal: 406, monthly: pricePath(400, 650, 406, 0.4), region: "cotier" },
    { id: "sorgho", name: "Sorgho", market: "Mali", normal: 148, monthly: pricePath(150, 310, 148, 3.3), region: "sahel" },
    { id: "haricots", name: "Haricots", market: "Sahel", normal: 250, monthly: pricePath(255, 490, 250, 4.2), region: "sahel" },
    { id: "farine", name: "Farine", market: "Côtier", normal: 280, monthly: pricePath(290, 455, 280, 1.7), region: "cotier" },
    { id: "huile", name: "Huile", market: "Régional", normal: 780, monthly: pricePath(810, 1380, 780, 5.1), region: "tous" },
    { id: "sucre", name: "Sucre", market: "Régional", normal: 490, monthly: pricePath(510, 760, 490, 2.8), region: "tous" },
  ];

  /* 6 pays × 8 trimestres = 48 points. Les 4 points cités sont imposés. */
  function buildScatter() {
    var meta = [
      { code: "NE", name: "Niger", color: "#F59E0B", p0: 248, p1: 418, bias: 1.35, pop: 7.2 },
      { code: "ML", name: "Mali", color: "#EF4444", p0: 214, p1: 362, bias: 0.15, pop: 5.3 },
      { code: "BF", name: "Burkina Faso", color: "#8B5CF6", p0: 206, p1: 348, bias: -0.15, pop: 5.8 },
      { code: "SN", name: "Sénégal", color: "#10B981", p0: 198, p1: 286, bias: -2.55, pop: 2.0 },
      { code: "NG", name: "Nigeria", color: "#3B82F6", p0: 226, p1: 348, bias: -0.55, pop: 8.2 },
      { code: "GH", name: "Ghana", color: "#FB923C", p0: 168, p1: 246, bias: -3.05, pop: 1.6 },
    ];
    var quarters = ["T1 23", "T2 23", "T3 23", "T4 23", "T1 24", "T2 24", "T3 24", "T4 24"];
    var forced = {
      "NE|T1 24": { price: 380, mag: 13.2 },
      "NE|T3 24": { price: 420, mag: 14.8 },
      "ML|T1 24": { price: 340, mag: 10.1 },
      "SN|T1 24": { price: 260, mag: 6.8 },
    };
    var pts = [];
    meta.forEach(function (m) {
      quarters.forEach(function (q, i) {
        var t = i / 7;
        var noiseP = Math.sin(m.code.charCodeAt(0) * 3 + i * 1.7) * 8;
        var price = Math.round(m.p0 + (m.p1 - m.p0) * t + noiseP);
        var noiseAmp = 1.48;
        var noiseM = Math.cos(m.code.charCodeAt(1) + i * 1.3) * noiseAmp + Math.sin(i * 2.2 + m.p0) * noiseAmp * 0.55;
        var mag = Math.round((4.2 + 0.022 * price + m.bias + noiseM) * 10) / 10;
        var key = m.code + "|" + q;
        if (forced[key]) { price = forced[key].price; mag = forced[key].mag; }
        pts.push({
          code: m.code, name: m.name, color: m.color, quarter: q,
          price: price, mag: Math.max(4.2, Math.min(17.6, mag)), pop: m.pop,
        });
      });
    });
    return pts;
  }

  COUNTRIES.forEach(function (c) {
    c.alerts = ALERTS[c.code];
    c.poly = POLYGONS[c.code];
    c.ipc3share = c.phases[2] + c.phases[3] + c.phases[4];
    c.phases2023 = shiftPhases(c.phases, c.region === "sahel" ? 7 : 4);
    c.ipc3share2023 = round1(c.phases2023[2] + c.phases2023[3] + c.phases2023[4]);
    c.dominant = c.phases.indexOf(Math.max.apply(null, c.phases)) + 1;
    c.dominant2023 = c.phases2023.indexOf(Math.max.apply(null, c.phases2023)) + 1;
    c.hdds = c.code === "NE"
      ? [1.5, 2.5, 4, 18, 24, 22, 14, 8, 2.4, 1.6, 1.0, 0.6, 0.4]
      : hddsCurve(c.hddsMean);
    var hs = sum(c.hdds);
    if (Math.abs(hs - 100) > 0.15) {
      c.hdds[Math.round(c.hddsMean)] = round1(c.hdds[Math.round(c.hddsMean)] + (100 - hs));
    }
    var acc = 0, med = c.hddsMean;
    for (var i = 0; i < c.hdds.length; i++) {
      acc += c.hdds[i];
      if (acc >= 50) { med = i; break; }
    }
    c.hddsMedian = med;
  });

  var benefScale = 12.4 / COUNTRIES.reduce(function (s, c) { return s + c.benefW; }, 0);
  var deltaScale = 2.3 / COUNTRIES.reduce(function (s, c) { return s + Math.max(0.05, c.insecure * (c.ipc >= 3 ? 1.4 : 0.35)); }, 0);
  COUNTRIES.forEach(function (c) {
    c.benef = round1(c.benefW * benefScale);
    c.target = round1(c.insecure * 18.5 / 43.7);
    c.insecureDelta = round1(Math.max(0.05, c.insecure * (c.ipc >= 3 ? 1.4 : 0.35)) * deltaScale);
  });
  /* recale les sommes affichées sur les titres du brief */
  function rescale(key, total) {
    var s = COUNTRIES.reduce(function (a, c) { return a + c[key]; }, 0);
    COUNTRIES.forEach(function (c) { c[key] = round1(c[key] * total / s); });
    var drift = round1(total - COUNTRIES.reduce(function (a, c) { return a + c[key]; }, 0));
    COUNTRIES[0][key] = round1(COUNTRIES[0][key] + drift);
  }
  rescale("benef", 12.4);
  rescale("target", 18.5);
  rescale("insecureDelta", 2.3);

  var BY_CODE = {};
  COUNTRIES.forEach(function (c) { BY_CODE[c.code] = c; });

  function regionOf(id) {
    if (!id || id === "tous") return COUNTRIES.slice();
    return COUNTRIES.filter(function (c) { return c.region === id; });
  }

  function weighted(list, key, wkey) {
    var sw = 0, sv = 0;
    list.forEach(function (c) { sw += c[wkey]; sv += c[key] * c[wkey]; });
    return sw ? sv / sw : 0;
  }

  function ipc3plusPop(list, year) {
    var key = year === 2023 ? "phases2023" : "phases";
    return list.reduce(function (s, c) {
      return s + c.pop * (c[key][2] + c[key][3] + c[key][4]) / 100;
    }, 0);
  }

  function phasePopulation(list, year) {
    var key = year === 2023 ? "phases2023" : "phases";
    return PHASES.map(function (_, i) {
      return list.reduce(function (s, c) { return s + c.pop * c[key][i] / 100; }, 0);
    });
  }

  function aggregateHdds(list) {
    var bins = [];
    for (var i = 0; i < 13; i++) bins.push(0);
    var w = 0;
    list.forEach(function (c) {
      w += c.pop;
      c.hdds.forEach(function (v, i) { bins[i] += v * c.pop; });
    });
    if (!w) return bins;
    return bins.map(function (v) { return Math.round(v / w * 10) / 10; });
  }

  function ratioColor(r) {
    if (r < 0.8) return "#DCFCE7";
    if (r < 1.0) return "#F0FDF4";
    if (r < 1.2) return "#FFFBEB";
    if (r < 1.5) return "#FEF3C7";
    if (r <= 2.0) return "#FED7AA";
    return "#FCA5A5";
  }

  function ratioLabel(r) {
    if (r < 0.8) return "Très bon marché";
    if (r < 1.0) return "Normal bas";
    if (r < 1.2) return "Légère tension";
    if (r < 1.5) return "Tension";
    if (r <= 2.0) return "Alerte";
    return "Crise";
  }

  function aggregateMonthly(values, mode) {
    if (mode === "annee") {
      return [
        values.slice(0, 12).reduce(function (a, b) { return a + b; }, 0) / 12,
        values.slice(12).reduce(function (a, b) { return a + b; }, 0) / 12,
      ].map(function (v) { return Math.round(v); });
    }
    if (mode === "trimestre") {
      var out = [];
      for (var i = 0; i < 24; i += 3) {
        out.push(Math.round((values[i] + values[i + 1] + values[i + 2]) / 3));
      }
      return out;
    }
    return values.slice();
  }

  function periodLabels(mode) {
    if (mode === "annee") return ["2023", "2024"];
    if (mode === "trimestre") {
      var out = [];
      for (var y = 2023; y <= 2024; y++) for (var q = 1; q <= 4; q++) out.push(y + " T" + q);
      return out;
    }
    return MONTH_LABELS.slice();
  }

  root.WFP_DATA = {
    title: "Food Security Analytics · Afrique de l'Ouest",
    year: 2024,
    PHASES: PHASES,
    COLORS: COLORS,
    COUNTRIES: COUNTRIES,
    BY_CODE: BY_CODE,
    FCS_SERIES: FCS_SERIES,
    CSI: CSI,
    FUNNEL: FUNNEL,
    SEASON: SEASON,
    CEREALS: CEREALS,
    BUDGET: BUDGET,
    INDICATORS: INDICATORS,
    COMMODITIES: COMMODITIES,
    MONTH_LABELS: MONTH_LABELS,
    MOIS: MOIS,
    PRICE_INDEX: PRICE_INDEX,
    SCATTER: buildScatter(),
    HEADLINE: {
      insecure: 43.7,
      insecureDelta: 2.3,
      fcs: 41.2,
      fcsClass: "Limite",
      crisisCountries: 9,
      phase4Countries: 3,
      benef: 12.4,
      target: 18.5,
      benefDelta: 8,
      priceIndex: 127.4,
      priceVsNormal: 28,
    },
    regionOf: regionOf,
    weighted: weighted,
    phasePopulation: phasePopulation,
    ipc3plusPop: ipc3plusPop,
    aggregateHdds: aggregateHdds,
    ratioColor: ratioColor,
    ratioLabel: ratioLabel,
    aggregateMonthly: aggregateMonthly,
    periodLabels: periodLabels,
    ipcColor: function (phase) {
      return (PHASES[phase - 1] && PHASES[phase - 1].color) || "#FDE68A";
    },
    fcsClass: function (v) {
      if (v < 28) return "Pauvre";
      if (v < 42) return "Limite";
      return "Acceptable";
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
