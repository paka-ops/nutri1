/* ============================================================================
   NUTRI.N°1 — WHO NUTRITION SURVEILLANCE · AFRIQUE DE L'OUEST
   who-data.js — couche de données illustratives, déterministes.

   • Aucune donnée patient, aucun service externe.
   • Chiffres alignés sur les cadres de surveillance OMS / UNICEF (JME,
     bases de données mondiales sur l'anémie, l'allaitement, la carence en
     vitamine A, l'iode, l'eau et l'assainissement).
   • Toutes les valeurs sont figées ici pour rester reproductibles en
     présentation investisseurs.
   ==========================================================================*/
(function (root) {
  "use strict";

  /* ---------------------------------------------------------------- helpers */
  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------------------ temps */
  const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

  /* Séries historiques officielles du cahier des charges (2014 → 2024) */
  const STUNTING_TREND = {
    NE: [50, 49, 48, 47, 46, 45, 44, 43, 41, 39, 38],
    ML: [42, 41, 40, 39, 38, 37, 37, 36, 35, 34, 33],
    BF: [38, 37, 36, 35, 33, 32, 31, 30, 29, 29, 28],
    SN: [22, 21, 21, 20, 19, 19, 18, 18, 17, 17, 16],
    NG: [36, 35, 34, 33, 33, 32, 31, 30, 29, 28, 28],
  };

  /* --------------------------------------------------------- 16 pays A.O. */
  /* stunting / wasting / anémie / vitA : prévalences (%)
     iode : ménages consommant du sel iodé (%)      ebf : allaitement exclusif (%)
     mam : malnutrition aigüe modérée (%)           surpoids : enfants <5 ans (%)
     score : indice composite régional 0-100 (100 = meilleur)                */
  const RAW = [
    ["NE", "Niger", "🇳🇪", "Sahel", 580, 4.2, 48, 47, 14.8, 72, 68, 62, 24, 14.6, 3.4, 22, 18.2, "severe"],
    ["ML", "Mali", "🇲🇱", "Sahel", 850, 3.8, 55, 38, 12.3, 65, 71, 68, 38, 12.3, 3.1, 35, 15.1, "severe"],
    ["BF", "Burkina Faso", "🇧🇫", "Sahel", 780, 3.5, 57, 29, 8.1, 58, 79, 84, 41, 8.1, 2.9, 52, 13.4, "severe"],
    ["SN", "Sénégal", "🇸🇳", "Côtier", 1630, 2.1, 73, 17, 7.2, 49, 83, 91, 38, 7.2, 2.2, 71, 10.8, "none"],
    ["GN", "Guinée", "🇬🇳", "Côtier", 740, 1.8, 52, 31, 9.3, 63, 74, 79, 34, 9.3, 3.0, 48, 14.6, "severe"],
    ["CI", "Côte d'Ivoire", "🇨🇮", "Côtier", 2290, 2.8, 66, 21, 6.8, 51, 81, 88, 29, 6.8, 2.6, 68, 9.7, "none"],
    ["GH", "Ghana", "🇬🇭", "Côtier", 2200, 3.2, 79, 18, 5.7, 42, 79, 93, 52, 5.7, 2.1, 74, 8.9, "none"],
    ["NG", "Nigeria", "🇳🇬", "Côtier", 2085, 28.0, 61, 37, 7.2, 55, 58, 74, 29, 7.2, 3.6, 44, 13.2, "severe"],
    ["MR", "Mauritanie", "🇲🇷", "Sahel", 1720, 0.7, 58, 28, 15.1, 60, 66, 71, 31, 15.1, 4.1, 47, 14.8, "moderate"],
    ["SL", "Sierra Leone", "🇸🇱", "Côtier", 510, 0.9, 54, 29, 6.4, 67, 72, 82, 36, 6.4, 2.8, 50, 15.6, "moderate"],
    ["LR", "Liberia", "🇱🇷", "Côtier", 640, 0.7, 59, 32, 5.3, 56, 69, 80, 39, 5.3, 2.4, 51, 12.4, "moderate"],
    ["GW", "Guinée-Bissau", "🇬🇼", "Côtier", 690, 0.4, 47, 28, 7.1, 61, 64, 68, 33, 7.1, 2.5, 46, 13.9, "moderate"],
    ["GM", "Gambie", "🇬🇲", "Côtier", 760, 0.5, 68, 19, 11.2, 52, 77, 90, 44, 11.2, 3.3, 63, 11.2, "none"],
    ["BJ", "Bénin", "🇧🇯", "Côtier", 1250, 1.7, 63, 34, 5.1, 54, 76, 86, 37, 5.1, 2.7, 54, 12.8, "moderate"],
    ["TG", "Togo", "🇹🇬", "Côtier", 970, 1.2, 64, 27, 6.3, 50, 78, 89, 40, 6.3, 2.3, 60, 11.6, "moderate"],
    ["CV", "Cap-Vert", "🇨🇻", "Insulaire", 1980, 0.1, 81, 9, 3.2, 35, 88, 97, 58, 3.2, 1.6, 88, 7.4, "none"],
  ];

  const FIELDS = [
    "code", "name", "flag", "subregion", "gdp", "pop", "water",
    "stunting", "wasting", "anemia", "vitA", "iode", "ebf", "mam", "overweight", "score", "maternal", "dbLevel",
  ];

  const COUNTRIES = RAW.map(function (row) {
    const c = {};
    FIELDS.forEach(function (f, i) { c[f] = row[i]; });
    /* Série 2014-2024 : valeurs du cahier des charges, sinon reconstitution
       déterministe terminée sur la valeur 2024 du pays. */
    if (STUNTING_TREND[c.code]) {
      c.series = STUNTING_TREND[c.code].slice();
    } else {
      const j = seeded(c.code);
      const start = c.stunting + 7 + j * 5;
      c.series = YEARS.map(function (y, i) {
        const t = i / (YEARS.length - 1);
        const v = start - (start - c.stunting) * t + (seeded(c.code + y) - 0.5) * 1.4;
        return r1(clamp(v, 1, 60));
      });
    }
    /* Étincelle 5 ans pour la colonne Tendance du tableau de bord */
    c.spark = [4.2, 3.1, 2.0, 0.9, 0].map(function (d, i) {
      return r1(clamp(c.stunting + d + (seeded(c.code + "s" + i) - 0.5) * 1.2, 1, 60));
    });
    /* Radar : 0-100, 100 = situation la plus défavorable */
    const nrm = (v, ref) => clamp((v / ref) * 100, 0, 100);
    c.radar = [
      nrm(c.stunting, 50), nrm(c.wasting, 15), nrm(c.anemia, 75),
      nrm(100 - c.vitA, 20), nrm(100 - c.iode, 10), nrm(c.maternal, 25),
    ];
    c.db = c.dbLevel !== "none";
    return c;
  });

  const BY_CODE = {};
  COUNTRIES.forEach(function (c) { BY_CODE[c.code] = c; });

  /* ------------------------------------------------------------- régional */
  const mean = function (key) {
    return r1(COUNTRIES.reduce(function (s, c) { return s + c[key]; }, 0) / COUNTRIES.length);
  };

  const REGION = {
    name: "Afrique de l'Ouest",
    countries: COUNTRIES.length,
    year: 2024,
    stunting: 28.4,
    wasting: 8.9,
    anemia: 52.7,
    vitA: 67.3,
    doubleBurden: 11,
    anemiaChildren: 60,
    anemiaPregnant: 64,
    anemiaNonPregnant: 49,
    totalMalnutrition: 22.8,
  };

  /* KPI par année (sélecteur de période de l'en-tête) */
  const KPI_BY_YEAR = {
    2024: { stunting: 28.4, wasting: 8.9, anemia: 52.7, vitA: 67.3, doubleBurden: 11 },
    2023: { stunting: 30.5, wasting: 8.6, anemia: 52.7, vitA: 63.1, doubleBurden: 9 },
    2022: { stunting: 31.2, wasting: 8.4, anemia: 52.8, vitA: 61.0, doubleBurden: 9 },
  };

  /* Étincelle 12 mois — retard de croissance régional */
  const STUNTING_MONTHLY = [27.2, 27.4, 27.8, 28.0, 28.3, 28.7, 29.2, 29.5, 29.1, 28.7, 28.5, 28.4];

  /* Anémie femmes 15-49 ans — 5 pays (mini barres KPI 3) */
  const ANEMIA_TOP5 = [
    { code: "NE", label: "Niger", value: 72 },
    { code: "ML", label: "Mali", value: 65 },
    { code: "BF", label: "Burkina", value: 58 },
    { code: "SN", label: "Sénégal", value: 49 },
    { code: "GH", label: "Ghana", value: 42 },
  ];

  /* ------------------------------------------------- graphique 2 : classement */
  /* short / group : libellé et groupe du sélecteur (<optgroup>).
     D'autres modules peuvent enrichir cet objet (ex. who-ncd-data.js). */
  const RANK_LEGEND = "Rouge > 35 % · orange 20-35 % · vert 10-20 % · bleu < 10 %";
  const RANK_INDICATORS = {
    stunting: { key: "stunting", short: "Stunting", group: "Nutrition", label: "Retard de croissance (stunting)", unit: "%", threshold: 20, thresholdLabel: "Seuil OMS 20 %", legend: RANK_LEGEND },
    wasting: { key: "wasting", short: "Wasting", group: "Nutrition", label: "Malnutrition aigüe (wasting)", unit: "%", threshold: 10, thresholdLabel: "Seuil urgence OMS 10 %", legend: RANK_LEGEND },
    anemia: { key: "anemia", short: "Anémie", group: "Nutrition", label: "Anémie (femmes 15-49 ans)", unit: "%", threshold: 40, thresholdLabel: "Objectif OMS 40 %", legend: RANK_LEGEND },
    vitA: { key: "vitA", short: "Vit. A", group: "Nutrition", label: "Couverture vitamine A", unit: "%", threshold: 80, thresholdLabel: "Objectif OMS 80 %", legend: RANK_LEGEND },
  };

  const RANK_ROWS = {};
  Object.keys(RANK_INDICATORS).forEach(function (id) {
    const k = RANK_INDICATORS[id].key;
    const sorted = COUNTRIES.slice().sort(function (a, b) { return b[k] - a[k]; });
    RANK_ROWS[id] = sorted.map(function (c, i) {
      return { label: c.name, flag: c.flag, code: c.code, value: c[k], rank: i + 1 };
    });
  });

  /* -------------------------------------------------- graphique 3 : radar */
  const RADAR_AXES = ["Stunting", "Wasting", "Anémie", "Vit. A", "Iode", "Malnutrition maternelle"];
  const RADAR_BENCHMARK = [40, 66.7, 53.3, 100, 100, 40]; // cibles OMS normalisées (100 = plus défavorable)

  /* ------------------------------------------- graphique 4 & 11 : saisonnalité */
  const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const SEASON = {
    2023: [100, 98, 95, 102, 110, 145, 168, 172, 155, 130, 112, 105],
    2024: [98, 96, 93, 105, 118, 152, 175, 180, 162, 138, 115, 108],
  };

  /* ------------------------------------------------ graphique 5 : donut */
  const DONUT = [
    { label: "MAS (sévère)", value: 8.2, color: "#EF4444", children: "1,2 M" },
    { label: "MAM (modérée)", value: 14.6, color: "#F59E0B", children: "2,1 M" },
    { label: "Risque", value: 22.8, color: "#FCD34D", children: "3,3 M" },
    { label: "Normal", value: 54.4, color: "#10B981", children: "7,9 M" },
  ];

  /* ---------------------------------------------- graphique 6 & 12 : nuages */
  const BUBBLE_COLORS = { Sahel: "#EF4444", "Côtier": "#3B82F6", Insulaire: "#10B981" };

  /* ------------------------------------------------ graphique 7 : waterfall */
  const WATERFALL = {
    start: { label: "Départ 2015", value: 47 },
    steps: [
      { label: "Amélioration allaitement", value: -2.1 },
      { label: "Supplémentation Vit. A", value: -1.8 },
      { label: "Eau & assainissement", value: -1.4 },
      { label: "Alimentation complémentaire", value: -2.3 },
      { label: "Soins prénataux", value: -1.2 },
    ],
    end: { label: "Résultat 2024", value: 38 },
    total: -9,
  };

  /* ------------------------------------------------ graphique 8 : heatmap */
  const HEAT_INDICATORS = [
    { key: "stunting", label: "Stunting", unit: "%", threshold: 20, dir: "high", thresholdLabel: "Seuil OMS 20 %" },
    { key: "wasting", label: "Wasting", unit: "%", threshold: 10, dir: "high", thresholdLabel: "Seuil urgence 10 %" },
    { key: "anemia", label: "Anémie", unit: "%", threshold: 40, dir: "high", thresholdLabel: "Objectif 40 %" },
    { key: "vitA", label: "Vit. A", unit: "%", threshold: 80, dir: "low", thresholdLabel: "Objectif 80 %" },
    { key: "iode", label: "Iode", unit: "%", threshold: 90, dir: "low", thresholdLabel: "Objectif 90 %" },
    { key: "ebf", label: "Allaitement", unit: "%", threshold: 60, dir: "low", thresholdLabel: "Objectif 60 %" },
    { key: "mam", label: "MAM", unit: "%", threshold: 5, dir: "high", thresholdLabel: "Seuil 5 %" },
    { key: "overweight", label: "Surpoids", unit: "%", threshold: 5, dir: "high", thresholdLabel: "Seuil 5 %" },
  ];

  /* ------------------------------------------------ graphique 9 : ANJE */
  const ANJE_COUNTRIES = [
    { code: "NE", name: "Niger", color: "#0066CC" },
    { code: "SN", name: "Sénégal", color: "#00A86B" },
    { code: "NG", name: "Nigeria", color: "#FF6B35" },
    { code: "BF", name: "Burkina", color: "#7C3AED" },
  ];
  const ANJE_INDICATORS = [
    { label: "Mise au sein précoce", objective: 80, values: { NE: 42, SN: 61, NG: 32, BF: 68 } },
    { label: "Allaitement exclusif", objective: 60, values: { NE: 24, SN: 38, NG: 22, BF: 41 } },
    { label: "Introduction complémentaire", objective: 80, values: { NE: 71, SN: 82, NG: 68, BF: 79 } },
    { label: "Diversité minimale", objective: 50, values: { NE: 18, SN: 34, NG: 24, BF: 29 } },
    { label: "Fréquence repas min.", objective: 60, values: { NE: 44, SN: 58, NG: 41, BF: 52 } },
    { label: "ATPE acceptable", objective: 60, values: { NE: 39, SN: 55, NG: 36, BF: 61 } },
    { label: "Biberon (inversé)", objective: 10, values: { NE: 31, SN: 18, NG: 44, BF: 15 }, invert: true },
    { label: "Allaitement à 2 ans", objective: 70, values: { NE: 52, SN: 67, NG: 48, BF: 71 } },
  ];

  /* --------------------------------------------- graphique 10 : anémie 2017-24 */
  const ANEMIA_TREND = {
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    series: [
      { name: "Enfants < 5 ans", color: "#EF4444", data: [68, 67, 66, 65, 64, 63, 61, 60] },
      { name: "Femmes enceintes", color: "#FF6B35", data: [72, 71, 70, 69, 68, 67, 65, 64] },
      { name: "Femmes non-enceintes", color: "#F472B6", data: [55, 54, 53, 52, 51, 50, 49, 49] },
    ],
  };

  /* ------------------------------------------------ graphique 14 : jauges */
  const GAUGES = [
    { label: "Vitamine A (couverture)", value: 67, unit: "%" },
    { label: "Fer / Acide folique", value: 43, unit: "%" },
    { label: "Zinc (supplémentation)", value: 28, unit: "%" },
    { label: "Sel iodé (ménages)", value: 89, unit: "%" },
    { label: "Vitamine D", value: 31, unit: "%" },
    { label: "Calcium (grossesse)", value: 52, unit: "%" },
  ];
  const GAUGE_OBJECTIVE = 80;

  /* ---------------------------------------------- graphique 13 : timeline */
  const TIMELINE = {
    milestones: [
      { day: 0, label: "Jour 0", short: "J0", title: "Conception", detail: "Début de la fenêtre des 1000 jours : statut nutritionnel maternel, fer, acide folique." },
      { day: 270, label: "Jour 270", short: "J270", title: "Naissance", detail: "Poids de naissance, mise au sein dans la première heure, prévention de l'hypothermie." },
      { day: 450, label: "Jour 270+180", short: "J450", title: "6 mois", detail: "Introduction de l'alimentation complémentaire, diversification, continuité de l'allaitement." },
      { day: 635, label: "Jour 270+365", short: "J635", title: "12 mois", detail: "Supplémentation en vitamine A, diversification alimentaire, suivi de la croissance." },
      { day: 1000, label: "Jour 270+730", short: "J1000", title: "24 mois", detail: "Fin de la fenêtre : les dommages sur la croissance deviennent largement irréversibles." },
    ],
    interventions: [
      { day: 60, label: "Prénatal (fer + AF)", color: "#EF4444" },
      { day: 280, label: "Allaitement exclusif", color: "#0066CC" },
      { day: 470, label: "Alimentation compl.", color: "#00A86B" },
      { day: 760, label: "Vitamine A", color: "#FF6B35" },
    ],
  };

  /* ------------------------------------------- seuils & statuts (tableau) */
  const STATUS_RULES = [
    { min: 0, max: 30, label: "Critique", cls: "crit" },
    { min: 30, max: 50, label: "Alerte", cls: "alert" },
    { min: 50, max: 70, label: "Attention", cls: "warn" },
    { min: 70, max: 101, label: "Bon", cls: "good" },
  ];
  const statusOf = function (score) {
    for (let i = 0; i < STATUS_RULES.length; i++) if (score >= STATUS_RULES[i].min && score < STATUS_RULES[i].max) return STATUS_RULES[i];
    return STATUS_RULES[3];
  };

  root.WHO_SURV = {
    YEARS: YEARS,
    COUNTRIES: COUNTRIES,
    BY_CODE: BY_CODE,
    REGION: REGION,
    KPI_BY_YEAR: KPI_BY_YEAR,
    STUNTING_MONTHLY: STUNTING_MONTHLY,
    ANEMIA_TOP5: ANEMIA_TOP5,
    RANK_INDICATORS: RANK_INDICATORS,
    RANK_ROWS: RANK_ROWS,
    RADAR_AXES: RADAR_AXES,
    RADAR_BENCHMARK: RADAR_BENCHMARK,
    MONTHS: MONTHS,
    SEASON: SEASON,
    DONUT: DONUT,
    BUBBLE_COLORS: BUBBLE_COLORS,
    WATERFALL: WATERFALL,
    HEAT_INDICATORS: HEAT_INDICATORS,
    ANJE_COUNTRIES: ANJE_COUNTRIES,
    ANJE_INDICATORS: ANJE_INDICATORS,
    ANEMIA_TREND: ANEMIA_TREND,
    GAUGES: GAUGES,
    GAUGE_OBJECTIVE: 80,
    TIMELINE: TIMELINE,
    STATUS_RULES: STATUS_RULES,
    statusOf: statusOf,
    seeded: seeded,
    mean: mean,
  };
})(typeof window !== "undefined" ? window : this);
