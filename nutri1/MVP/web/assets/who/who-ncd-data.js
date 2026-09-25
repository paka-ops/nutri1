/* ==========================================================================
   WHO NutriData — Maladies chroniques liées à la nutrition (MNT)
   --------------------------------------------------------------------------
   DONNÉES RÉELLES — Observatoire mondial de la santé de l'OMS (GHO),
   API OData https://ghoapi.azureedge.net/api/ — extraction du 25/09/2026.
   Toutes les valeurs sont des estimations standardisées sur l'âge (%),
   deux sexes sauf mention, arrondies à 0,1 point.

     Obésité adultes 18+ (IMC ≥ 30) ... NCD_BMI_30A (NCD-RisC / OMS)
                                        2000 → 2024, mise à jour OMS 27/05/2026
     Hypertension 30-79 ans ........... NCD_HYP_PREVALENCE_A        (2019)
     Cascade HTA : diagnostic / traitement / contrôle
                                        NCD_HYP_DIAGNOSIS_A / _TREATMENT_A /
                                        _CONTROL_A                  (2019)
     Diabète 18+ ...................... NCD_DIABETES_PREVALENCE_AGESTD (2022)
     Traitement du diabète 30+ ........ NCD_DIABETES_TREATMENT_AGESTD  (2022)
     Mortalité prématurée MNT 30-70 ... NCDMORT3070 (MCV, cancers, diabète,
                                        maladies respiratoires chroniques)
                                        2015 (référence ODD) et 2021

   Chaque indicateur est affiché avec son année : ce sont les dernières
   estimations publiées par l'OMS (le reste du module WHO NutriData utilise
   des données illustratives).

   Ce fichier enrichit window.WHO_SURV (classement, export CSV, rapport pays)
   et expose window.WHO_NCD pour le composant who-ncd.js.
   Doit être chargé APRÈS who-data.js et AVANT who-surveillance.js.
   ========================================================================== */
(function (root) {
  "use strict";

  const S = root.WHO_SURV;
  if (!S || !S.COUNTRIES) return;

  const OB_YEARS = [2000, 2004, 2008, 2012, 2016, 2020, 2024];

  /* Obésité adulte (IMC ≥ 30), séries 2000 → 2024 par pas de 4 ans.
     all = deux sexes · f = femmes · m = hommes                              */
  const OBESITY = {
    NE: { all: [1.9, 2.6, 3.3, 3.9, 4.6, 5.5, 6.8], f: [2.7, 3.6, 4.4, 5.1, 6.0, 7.3, 8.7], m: [1.1, 1.6, 2.2, 2.7, 3.1, 3.8, 4.9] },
    ML: { all: [3.5, 4.9, 6.3, 7.6, 9.0, 11.0, 13.3], f: [3.9, 5.5, 7.2, 8.9, 11.2, 14.2, 17.6], m: [3.1, 4.3, 5.5, 6.3, 6.9, 7.8, 9.0] },
    BF: { all: [1.4, 2.1, 2.8, 3.6, 4.6, 6.0, 7.7], f: [1.9, 2.7, 3.7, 4.8, 6.3, 8.3, 10.7], m: [0.9, 1.4, 1.9, 2.3, 2.8, 3.5, 4.4] },
    SN: { all: [4.3, 5.5, 6.5, 7.4, 8.5, 9.9, 11.6], f: [7.2, 8.9, 10.5, 11.8, 13.6, 15.9, 18.4], m: [1.2, 1.6, 2.2, 2.6, 3.1, 3.7, 4.7] },
    GN: { all: [2.7, 3.7, 4.7, 5.8, 7.0, 8.6, 10.6], f: [3.5, 4.7, 6.0, 7.4, 9.3, 11.7, 14.6], m: [1.8, 2.5, 3.3, 3.8, 4.4, 5.1, 6.2] },
    CI: { all: [4.6, 5.9, 7.1, 8.1, 9.2, 10.9, 12.8], f: [6.5, 8.0, 9.4, 10.8, 12.7, 15.0, 17.7], m: [2.8, 3.9, 4.8, 5.5, 6.1, 7.0, 8.2] },
    GH: { all: [6.0, 7.6, 9.0, 10.1, 11.3, 12.8, 14.5], f: [9.4, 11.8, 13.9, 15.8, 18.0, 20.8, 23.9], m: [2.2, 3.1, 3.8, 4.1, 4.2, 4.4, 4.8] },
    NG: { all: [4.9, 6.3, 7.7, 8.8, 10.1, 11.7, 13.7], f: [6.7, 8.4, 9.9, 11.4, 13.3, 15.9, 18.9], m: [3.0, 4.2, 5.5, 6.3, 6.8, 7.5, 8.5] },
    MR: { all: [11.4, 13.7, 15.8, 17.3, 19.2, 21.6, 24.1], f: [19.2, 22.4, 25.2, 27.5, 30.4, 33.8, 37.4], m: [3.2, 4.3, 5.4, 6.2, 6.9, 7.8, 9.0] },
    SL: { all: [3.5, 4.4, 5.2, 5.7, 6.3, 7.2, 8.2], f: [5.4, 6.8, 8.0, 8.9, 10.0, 11.5, 13.1], m: [1.3, 1.9, 2.3, 2.4, 2.5, 2.7, 3.0] },
    LR: { all: [3.7, 5.0, 6.6, 8.2, 10.4, 13.6, 17.8], f: [4.9, 6.5, 8.4, 10.5, 13.4, 17.2, 21.9], m: [2.4, 3.4, 4.6, 5.7, 7.2, 9.8, 13.4] },
    GW: { all: [4.1, 5.3, 6.6, 7.7, 9.0, 10.7, 12.7], f: [5.3, 6.8, 8.4, 9.9, 11.8, 14.3, 17.1], m: [2.6, 3.5, 4.5, 5.1, 5.7, 6.6, 7.8] },
    GM: { all: [3.5, 4.9, 6.3, 7.6, 8.9, 10.5, 12.4], f: [5.2, 7.2, 9.1, 10.9, 13.2, 15.9, 19.0], m: [1.6, 2.5, 3.3, 3.9, 4.3, 4.8, 5.4] },
    BJ: { all: [4.5, 5.8, 7.1, 8.0, 9.1, 10.5, 12.2], f: [6.4, 8.2, 9.8, 11.1, 12.6, 14.6, 16.8], m: [2.3, 3.1, 4.0, 4.7, 5.3, 6.2, 7.4] },
    TG: { all: [3.4, 4.6, 6.0, 7.3, 8.9, 10.9, 13.4], f: [4.9, 6.6, 8.5, 10.4, 12.9, 16.0, 19.7], m: [1.7, 2.4, 3.1, 3.6, 4.2, 5.0, 6.1] },
    CV: { all: [6.6, 8.3, 9.9, 11.1, 12.6, 14.5, 16.7], f: [9.2, 11.4, 13.6, 15.7, 18.2, 21.4, 24.9], m: [3.6, 4.7, 5.8, 6.5, 7.0, 7.8, 8.8] },
  };

  /* Hypertension (2019), diabète (2022), mortalité prématurée (2015, 2021) */
  const NCD_FIELDS = ["hta", "htaF", "htaM", "htaDx", "htaTx", "htaCtl", "diab", "diabF", "diabM", "diabTx", "mort2015", "mort"];
  const NCD = {
    //   HTA   F     H     diag  trait contr diab  F     H     trait mort15 mort21
    NE: [41.5, 42.6, 40.4, 26.6, 13.4, 6.1, 6.2, 6.2, 6.3, 10.6, 20.9, 20.2],
    ML: [34.6, 38.3, 30.5, 52.8, 35.6, 14.5, 8.4, 9.4, 7.5, 18.7, 25.4, 23.0],
    BF: [30.5, 31.7, 29.1, 37.7, 20.8, 8.9, 12.3, 11.7, 12.9, 7.1, 25.3, 23.4],
    SN: [40.5, 42.9, 37.3, 38.6, 21.2, 9.5, 8.2, 8.2, 8.1, 22.7, 22.8, 21.4],
    GN: [40.9, 42.5, 38.3, 44.6, 22.6, 7.2, 10.3, 11.1, 9.4, 19.0, 25.8, 23.6],
    CI: [37.3, 37.6, 36.9, 37.8, 23.3, 8.6, 11.3, 12.0, 10.6, 18.1, 24.1, 22.7],
    GH: [33.9, 36.1, 31.4, 49.9, 36.9, 19.1, 10.4, 11.1, 9.7, 19.6, 24.2, 22.2],
    NG: [36.1, 39.0, 33.0, 46.6, 28.6, 11.1, 10.9, 11.2, 10.7, 25.1, 17.4, 17.7],
    MR: [37.9, 39.7, 35.9, 43.0, 26.2, 11.1, 11.6, 12.3, 10.8, 15.6, 18.1, 18.7],
    SL: [40.8, 43.4, 38.0, 37.9, 20.3, 8.5, 11.4, 12.0, 10.7, 18.2, 24.4, 23.9],
    LR: [39.4, 41.3, 37.4, 41.7, 26.3, 8.3, 9.4, 10.2, 8.5, 13.9, 22.7, 22.0],
    GW: [38.0, 39.7, 36.0, 43.6, 26.7, 11.3, 11.4, 12.0, 10.6, 18.2, 26.9, 25.3],
    GM: [37.6, 40.2, 34.7, 45.3, 27.9, 9.6, 13.3, 15.8, 10.6, 18.2, 23.0, 21.8],
    BJ: [31.2, 33.0, 28.9, 38.5, 24.9, 9.3, 12.1, 12.6, 11.6, 12.0, 22.5, 20.8],
    TG: [36.0, 37.5, 34.3, 42.0, 20.4, 9.4, 9.5, 10.1, 8.9, 22.4, 27.1, 25.4],
    CV: [44.1, 41.7, 45.7, 52.5, 36.0, 14.1, 8.6, 9.2, 8.0, 32.3, 14.6, 17.2],
  };

  const r1 = (v) => Math.round(v * 10) / 10;
  const avg = (arr) => r1(arr.reduce((a, b) => a + b, 0) / (arr.length || 1));
  const fr = (v) => r1(v).toFixed(1).replace(".", ",");
  /* Niveau 2010 (cible OMS « stopper la hausse ») : interpolation 2008-2012 */
  const at2010 = (s) => r1((s[2] + s[3]) / 2);

  /* ---------------------------------------------- enrichissement des pays */
  S.COUNTRIES.forEach(function (c) {
    const ob = OBESITY[c.code], row = NCD[c.code];
    if (!ob || !row) return;
    const n = {};
    NCD_FIELDS.forEach(function (f, i) { n[f] = row[i]; });
    const last = OB_YEARS.length - 1;
    n.obesity = ob.all[last];
    n.obesityF = ob.f[last];
    n.obesityM = ob.m[last];
    n.obesity2000 = ob.all[0];
    n.obesity2010 = at2010(ob.all);
    n.obesityX = r1(ob.all[last] / ob.all[0]);
    n.obSeries = ob;
    n.mortTarget = r1((n.mort2015 * 2) / 3);
    c.ncd = n;
    /* champs « plats » pour le classement (graphique 2) */
    c.obesity = n.obesity;
    c.hta = n.hta;
    c.diabetes = n.diab;
  });

  const C = S.COUNTRIES.filter(function (c) { return !!c.ncd; });
  const col = (k) => C.map(function (c) { return c.ncd[k]; });

  /* Moyennes non pondérées des 16 pays (comme le reste du module) */
  const REGION = {};
  NCD_FIELDS.concat(["obesity", "obesityF", "obesityM", "obesity2000", "obesity2010"]).forEach(function (k) {
    REGION[k] = avg(col(k));
  });
  REGION.obSeries = {
    all: OB_YEARS.map(function (_, i) { return avg(C.map(function (c) { return c.ncd.obSeries.all[i]; })); }),
    f: OB_YEARS.map(function (_, i) { return avg(C.map(function (c) { return c.ncd.obSeries.f[i]; })); }),
    m: OB_YEARS.map(function (_, i) { return avg(C.map(function (c) { return c.ncd.obSeries.m[i]; })); }),
  };
  REGION.obesity2010 = at2010(REGION.obSeries.all);
  REGION.obesityX = r1(REGION.obSeries.all[OB_YEARS.length - 1] / REGION.obSeries.all[0]);
  REGION.mortTarget = r1((REGION.mort2015 * 2) / 3);

  /* Références mondiales OMS (fiches d'information OMS) */
  const GLOBAL = {
    obesity: 16,     // % adultes 18+ obèses, 2022
    diab: 14,        // % adultes 18+ diabétiques, 2022
    diabUntreated: 59, // % des diabétiques 30+ sans traitement, 2022
    hta: 33,         // % adultes 30-79 ans hypertendus (≈ 1 sur 3)
    htaDx: 54,       // % des hypertendus diagnostiqués (46 % l'ignorent)
    htaTx: 42,       // % des hypertendus traités
    htaCtl: 21,      // % des hypertendus contrôlés (≈ 1 sur 5)
  };

  const TARGETS = {
    obesity: "Stopper la hausse au niveau de 2010 (cible mondiale OMS)",
    hta: "−33 % de prévalence de l'hypertension entre 2010 et 2030 (cible mondiale OMS)",
    htaCtl: 50,
    htaCtlLabel: "Pays performants ≥ 50 %",
    htaImpact: "Porter le contrôle au niveau des pays performants éviterait 76 millions de décès dans le monde d'ici 2050 (OMS, 2023)",
    diab: "Cibles OMS 2030 : 80 % des diabétiques diagnostiqués, 80 % des diagnostiqués équilibrés",
    mort: "ODD 3.4 : réduire d'un tiers la mortalité prématurée par MNT entre 2015 et 2030",
  };

  const SOURCES = [
    { code: "NCD_BMI_30A", label: "Obésité adultes 18+ (IMC ≥ 30), NCD-RisC / OMS", year: "2000-2024" },
    { code: "NCD_HYP_PREVALENCE_A", label: "Hypertension 30-79 ans", year: "2019" },
    { code: "NCD_HYP_DIAGNOSIS_A · TREATMENT_A · CONTROL_A", label: "Cascade de soins de l'hypertension", year: "2019" },
    { code: "NCD_DIABETES_PREVALENCE_AGESTD", label: "Diabète 18+, NCD-RisC / OMS", year: "2022" },
    { code: "NCD_DIABETES_TREATMENT_AGESTD", label: "Couverture du traitement du diabète 30+", year: "2022" },
    { code: "NCDMORT3070", label: "Probabilité de décès 30-70 ans (4 MNT)", year: "2015 · 2021" },
  ];

  /* Matrice de risque MNT (dir : « high » = plus c'est haut, plus c'est grave) */
  const HEAT_INDICATORS = [
    { key: "obesityF", label: "Obésité femmes", dir: "high", thresholdLabel: "18+ · 2024" },
    { key: "obesityM", label: "Obésité hommes", dir: "high", thresholdLabel: "18+ · 2024" },
    { key: "hta", label: "Hypertension", dir: "high", thresholdLabel: "30-79 ans · 2019" },
    { key: "htaCtl", label: "HTA contrôlée", dir: "low", thresholdLabel: "cible ≥ 50 %" },
    { key: "diab", label: "Diabète", dir: "high", thresholdLabel: "18+ · 2022" },
    { key: "diabTx", label: "Diabète traité", dir: "low", thresholdLabel: "30+ · 2022" },
    { key: "mort", label: "Mortalité MNT", dir: "high", thresholdLabel: "30-70 ans · 2021" },
  ];

  /* ---------------------------------- classement (graphique 2) : 3 options */
  const NEW_RANK = {
    obesity: {
      key: "obesity", short: "Obésité adulte", group: "Maladies chroniques (MNT)",
      label: "Obésité adulte (IMC ≥ 30, 18+) · OMS 2024", unit: "%", decimals: 1,
      threshold: GLOBAL.obesity, thresholdLabel: "Moyenne mondiale OMS 16 %",
      bands: [{ min: 20, color: "#EF4444" }, { min: 12, color: "#FF6B35" }, { min: 8, color: "#F59E0B" }, { min: 0, color: "#10B981" }],
      legend: "Rouge ≥ 20 % · orange 12-20 % · ambre 8-12 % · vert < 8 % · source OMS/NCD-RisC 2024",
      note: "OMS 2024",
    },
    hta: {
      key: "hta", short: "Hypertension", group: "Maladies chroniques (MNT)",
      label: "Hypertension (30-79 ans) · OMS 2019", unit: "%", decimals: 1,
      threshold: GLOBAL.hta, thresholdLabel: "Moyenne mondiale OMS 33 %",
      bands: [{ min: 40, color: "#EF4444" }, { min: 35, color: "#FF6B35" }, { min: 30, color: "#F59E0B" }, { min: 0, color: "#10B981" }],
      legend: "Rouge ≥ 40 % · orange 35-40 % · ambre 30-35 % · vert < 30 % · source OMS 2019",
      note: "OMS 2019",
    },
    diabetes: {
      key: "diabetes", short: "Diabète", group: "Maladies chroniques (MNT)",
      label: "Diabète (adultes 18+) · OMS 2022", unit: "%", decimals: 1,
      threshold: GLOBAL.diab, thresholdLabel: "Moyenne mondiale OMS 14 %",
      bands: [{ min: 12, color: "#EF4444" }, { min: 10, color: "#FF6B35" }, { min: 8, color: "#F59E0B" }, { min: 0, color: "#10B981" }],
      legend: "Rouge ≥ 12 % · orange 10-12 % · ambre 8-10 % · vert < 8 % · source OMS/NCD-RisC 2022",
      note: "OMS 2022",
    },
  };
  Object.keys(NEW_RANK).forEach(function (id) {
    const ind = NEW_RANK[id];
    S.RANK_INDICATORS[id] = ind;
    S.RANK_ROWS[id] = C.slice()
      .sort(function (a, b) { return b[ind.key] - a[ind.key]; })
      .map(function (c, i) { return { label: c.name, flag: c.flag, code: c.code, value: c[ind.key], rank: i + 1 }; });
  });

  /* ------------------------------------------ export CSV & rapport pays */
  S.CSV_EXTRA = (S.CSV_EXTRA || []).concat([
    { label: "Obesite adulte % (OMS 2024)", key: "obesity" },
    { label: "Obesite femmes % (OMS 2024)", key: "obesityF" },
    { label: "Obesite hommes % (OMS 2024)", key: "obesityM" },
    { label: "Hypertension 30-79 ans % (OMS 2019)", key: "hta" },
    { label: "HTA controlee % (OMS 2019)", key: "htaCtl" },
    { label: "Diabete 18+ % (OMS 2022)", key: "diab" },
    { label: "Diabete traite 30+ % (OMS 2022)", key: "diabTx" },
    { label: "Mortalite prematuree MNT 30-70 % (OMS 2021)", key: "mort" },
  ].map(function (e) {
    return {
      label: e.label,
      get: function (c) { return c && c.ncd ? c.ncd[e.key] : ""; },
      region: REGION[e.key],
    };
  }));

  S.REPORT_EXTRA = function (c) {
    if (!c || !c.ncd) return "";
    return "MNT : obésité " + fr(c.ncd.obesity) + " % · HTA " + fr(c.ncd.hta) + " % · diabète " + fr(c.ncd.diab) + " %";
  };

  root.WHO_NCD = {
    EXTRACTED: "25/09/2026",
    OB_YEARS: OB_YEARS,
    REGION: REGION,
    GLOBAL: GLOBAL,
    TARGETS: TARGETS,
    SOURCES: SOURCES,
    HEAT_INDICATORS: HEAT_INDICATORS,
    COUNTRIES: C,
    byCode: function (code) {
      for (let i = 0; i < C.length; i++) if (C[i].code === code) return C[i];
      return null;
    },
    fr: fr,
  };
})(window);
