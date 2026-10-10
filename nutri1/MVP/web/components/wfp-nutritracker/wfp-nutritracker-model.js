/* ============================================================================
 * WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest
 * Fichier : wfp-nutritracker-model.js
 * Rôle    : Couche « modèle ». Transforme les données brutes
 *           (wfp-nutritracker-data.js) en un objet VUE prêt à afficher, en
 *           fonction de l'état des filtres :
 *             mode      : 'region' (Vue Globale Afrique de l'Ouest)
 *                       | 'country' (Vue Détaillée par Pays)
 *             country   : code ISO2 du pays sélectionné (ex. 'NE')
 *             gran      : 'M' (Mensuel) | 'Q' (Trimestriel)
 *             sub       : 1..12 (mois) | 1..4 (trimestre) de l'année courante
 *           Chaque changement de filtre reconstruit la vue complète : les
 *           5 KPI et les 15 graphiques sont alors réanimés.
 *
 *  Principe de réalisme : les séries temporelles sont reconstruites de façon
 *  DÉTERMINISTE (bruit sinusoïdal, aucun Math.random) à partir des ancres
 *  annuelles + profils saisonniers, de sorte que les totaux régionaux restent
 *  cohérents avec les KPI affichés.
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = (global.WFPTracker = global.WFPTracker || {});
  const D = WFP.DATA;

  /* ---------- Utilitaires numériques ---------- */
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const wAvg = (arr, key, wkey) => sum(arr.map((o) => o[key] * o[wkey])) / (sum(arr.map((o) => o[wkey])) || 1);
  /* Bruit déterministe ∈ [-0.5 ; 0.5] (rendu stable d'un rafraîchissement à l'autre) */
  const noise = (seed) => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) - 0.5; };
  const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 10000); };

  const MONTHS = D.MONTHS, MONTHS_LONG = D.MONTHS_LONG, QUARTERS = D.QUARTERS;
  const YEAR = 2024;
  const byCode = {};
  D.countries.forEach((c) => (byCode[c.code] = c));

  /* Période de référence : 20 trimestres (2020T1 → 2024T4) */
  const TREND_QUARTERS = [];
  for (let y = 2020; y <= 2024; y++) for (let q = 1; q <= 4; q++) TREND_QUARTERS.push({ y, q, label: 'T' + q + ' ' + String(y).slice(2), key: y + 'T' + q });

  /* 24 mois : janvier 2023 → décembre 2024 */
  const PRICE_MONTHS = [];
  for (let y = 2023; y <= 2024; y++) for (let m = 0; m < 12; m++) PRICE_MONTHS.push({ y, m, label: MONTHS[m] + ' ' + String(y).slice(2), key: y + 'M' + (m + 1) });

  /* ==========================================================================
   * 1. Agrégats régionaux (pondérés) — source unique des KPI globaux
   * ======================================================================== */
  const C = D.countries;
  const regional = {
    pop: sum(C.map((c) => c.pop)),
    insecure: r1(sum(C.map((c) => c.insecure))),
    beneficiaries: r1(sum(C.map((c) => c.beneficiaries))),
    target: D.targets.beneficiaries,
    hhMonth: r1(sum(C.map((c) => c.hhMonth))) * 1000,
    collectors: sum(C.map((c) => c.collectors)),
    markets: sum(C.map((c) => c.markets)),
    fcs: r1(wAvg(C, 'fcs', 'pop')),
    fcsPrev: r1(wAvg(C, 'fcsPrev', 'pop')),
    csi: Math.round(wAvg(C, 'csi', 'pop')),
    priceIndex: r1(wAvg(C, 'priceIndex', 'markets')),
    muac: r1(wAvg(C, 'muac', 'pop')),
    kcal: Math.round(wAvg(C, 'kcal', 'pop')),
    access: Math.round(wAvg(C, 'access', 'pop')),
    hdds: r1(wAvg(C, 'hdds', 'pop')),
    stockDays: Math.round(wAvg(C, 'stockDays', 'pop')),
    countriesIpc3: C.filter((c) => c.ipc >= 3).length,
    countriesIpc4: C.filter((c) => c.ipc >= 4).length,
    countriesTotal: C.length
  };
  /* Nombre de districts en IPC 3+ dans toute la région (dérivé, cf. districtsOf) */
  let regionDistrictsTotal = 0, regionDistrictsCrisis = 0, regionDistrictsUrgency = 0;

  /* ==========================================================================
   * 2. Districts / provinces (mode Pays) — valeurs dérivées du pays
   * ======================================================================== */
  const districtCache = {};
  function districtsOf(c) {
    if (districtCache[c.code]) return districtCache[c.code];
    const names = c.districts;
    const base = hashStr(c.code);
    const list = names.map((name, i) => {
      const seed = base + i * 37;
      /* 25% des districts sont des « poches » plus vulnérables que la moyenne */
      const hotspot = noise(seed * 1.7) > 0.22;
      const delta = (hotspot ? -1 : 1) * (4.2 + Math.abs(noise(seed * 3.1)) * 5.4);
      const popShare = 1 / names.length * (1 + noise(seed * 5.3) * 0.55);
      const ipc = clamp(c.ipc + (hotspot ? (noise(seed * 7.7) > 0.15 ? 1 : 0) : -1), 1, 5);
      const o = {
        code: c.code + '-' + i, country: c.code, name,
        fcs: r1(clamp(c.fcs + delta, 8, 72)),
        fcsPrev: r1(clamp(c.fcsPrev + delta * 0.85, 8, 74)),
        csi: Math.round(clamp(c.csi + (hotspot ? 9 : -7) + noise(seed * 9.1) * 6, 2, 68)),
        ipc,
        pop: r2(c.pop * popShare),
        muac: r1(clamp(c.muac + (hotspot ? 4.4 : -2.6) + noise(seed * 11.3) * 2.2, 0.6, 28)),
        priceIndex: r1(c.priceIndex + noise(seed * 13.7) * 14),
        kcal: Math.round(c.kcal + (hotspot ? -160 : 90) + noise(seed * 15.1) * 90),
        access: Math.round(clamp(c.access + (hotspot ? -13 : 9) + noise(seed * 17.3) * 7, 6, 92)),
        hdds: r1(clamp(c.hdds + (hotspot ? -1.6 : 1.1) + noise(seed * 19.7) * 0.9, 1, 12)),
        insecure: r2(c.insecure * popShare * (hotspot ? 1.45 : 0.72)),
        stockDays: Math.round(clamp(c.stockDays + (hotspot ? -22 : 16) + noise(seed * 21.1) * 12, 8, 180)),
        beneficiaries: r2(c.beneficiaries * popShare * (hotspot ? 1.3 : 0.8)),
        hhMonth: r1(c.hhMonth * popShare * (1 + Math.abs(noise(seed * 23.9)) * 0.4))
      };
      regionDistrictsTotal++;
      if (o.ipc >= 3) regionDistrictsCrisis++;
      if (o.ipc >= 4) regionDistrictsUrgency++;
      return o;
    });
    /* Part de population normalisée (les parts doivent sommer à 1) */
    const tot = sum(list.map((d) => d.pop));
    list.forEach((d) => (d.popShare = d.pop / tot));
    districtCache[c.code] = list;
    return list;
  }
  /* Pré-calcul : alimente les compteurs régionaux de districts */
  C.forEach(districtsOf);
  regional.districtsTotal = regionDistrictsTotal;
  regional.districtsCrisis = regionDistrictsCrisis;
  regional.districtsUrgency = regionDistrictsUrgency;

  /* ==========================================================================
   * 3. Séries temporelles déterministes
   * ======================================================================== */

  /* Coefficient saisonnier d'un mois m (0..11) pour un pays */
  const seas = (c, kind, m) => D.seasonality[c.zone][kind][m];

  /* --- FCS trimestriel 2020 → 2024 (20 points) --------------------------- */
  function fcsQuarterly(c) {
    const n = TREND_QUARTERS.length;
    return TREND_QUARTERS.map((t, i) => {
      const prog = i / (n - 1);
      /* Trajectoire de fond : ancre 2020 → ancre 2024 */
      let v = c.fcsPrev + (c.fcs - c.fcsPrev) * prog;
      /* Saisonnalité : creux pendant la soudure (T2-T3) */
      const lean = t.q === 3 ? -1.9 : t.q === 2 ? -1.1 : t.q === 1 ? 0.4 : 1.5;
      v += lean * (c.zone === 'sahel' ? 1.5 : c.zone === 'island' ? 0.4 : 1);
      /* Choc 2022 (crise alimentaire / inflation marchés) */
      if (t.y === 2022) v -= 2.4;
      if (t.y === 2022 && t.q >= 3) v -= 1.2;
      /* Micro-variations déterministes */
      v += noise(hashStr(c.code) + i * 7) * 1.35;
      return r1(clamp(v, 6, 80));
    });
  }
  /* Moyenne régionale pondérée (même construction, sur les 16 pays) */
  function fcsQuarterlyRegional() {
    const series = C.map((c) => ({ v: fcsQuarterly(c), w: c.pop }));
    return TREND_QUARTERS.map((t, i) => r1(sum(series.map((s) => s.v[i] * s.w)) / sum(series.map((s) => s.w))));
  }

  /* --- FCS mensuel 2023 → 2024 (24 points, utilisé en granularité Mensuel) */
  function fcsMonthly(c) {
    return PRICE_MONTHS.map((p, i) => {
      const base = c.fcsPrev + (c.fcs - c.fcsPrev) * (0.6 + 0.4 * (i / 23));
      const lean = seas(c, 'alerts', p.m);
      return r1(clamp(base - (lean - 1) * 6.4 + noise(hashStr(c.code) + i * 13) * 1.1, 6, 80));
    });
  }

  /* --- Index prix : 24 mois (2023-01 → 2024-12) -------------------------- */
  function priceIndexMonthly(c) {
    return PRICE_MONTHS.map((p, i) => {
      const trend = 0.94 + 0.06 * (i / 23);            // dérive inflationniste
      const v = c.priceIndex * seas(c, 'price', p.m) * trend;
      return r1(v + noise(hashStr(c.code) * 3 + i * 5) * 2.4);
    });
  }
  /* --- Index prix : 20 trimestres (2020T1 → 2024T4) ---------------------- */
  function priceIndexQuarterly(c) {
    return TREND_QUARTERS.map((t, i) => {
      const prog = i / (TREND_QUARTERS.length - 1);
      const trend = 0.66 + 0.34 * prog;                       // escalade 2020 → 2024
      const ssn = seas(c, 'price', (t.q - 1) * 3 + 1);
      const shock = t.y === 2022 ? 0.1 : t.y === 2023 && t.q === 1 ? 0.04 : 0;
      return r1(c.priceIndex * (trend + shock) * (0.92 + 0.08 * ssn) + noise(hashStr(c.code) * 5 + i * 7) * 2);
    });
  }
  /* Série régionale pondérée (poids = population ou nb de marchés suivis) */
  function weightedSeries(getter, wkey) {
    const series = C.map((cc) => ({ v: getter(cc), w: cc[wkey] }));
    const tot = sum(series.map((s) => s.w)) || 1;
    return series[0].v.map((x, i) => r1(sum(series.map((s) => s.v[i] * s.w)) / tot));
  }
  /* Prix FCFA/kg d'un produit pour un pays, un mois */
  function productPrice(c, prod, m) {
    const zoneCoef = prod.season === 'import' ? 1 + noise(hashStr(prod.key) + hashStr(c.code)) * 0.06 : 1;
    return Math.round(prod.base * (c.priceIndex / 100) * seas(c, 'price', m) * zoneCoef);
  }

  /* --- Alertes nutritionnelles mensuelles (relais communautaires) -------- */
  function alertsMonthly(c) {
    const base = 12 + c.insecure * 26 + c.csi * 1.6;
    return MONTHS.map((m, i) => Math.round(base * seas(c, 'alerts', i) * (1 + noise(hashStr(c.code) + i * 29) * 0.12)));
  }

  /* --- Ménages enquêtés / activité des collecteurs ----------------------- */
  function collectorMonthly(c) {
    return MONTHS.map((m, i) => Math.round((c.hhMonth * 1000 / 12) * (0.82 + 0.36 * seas(c, 'alerts', i) / 1.7) * (1 + noise(hashStr(c.code) + i * 41) * 0.08)));
  }

  /* --- Distribution HDDS (0-12) ------------------------------------------ */
  function hddsDistribution(c, households) {
    const mean = c.hdds;
    const sigma = 2.0 + (12 - mean) * 0.13;
    const raw = D.hddsShape.map((w, s) => w * Math.exp(-Math.pow(s - mean, 2) / (2 * sigma * sigma)));
    const tot = sum(raw);
    return raw.map((w) => Math.round((w / tot) * households));
  }

  /* --- Répartition IPC (5 phases, % de population) ----------------------- */
  function ipcPhases(o, seedShift) {
    const prof = D.ipcProfiles[o.ipc].phases.slice();
    const shift = seedShift || 0;
    /* Module la répartition selon la sévérité exacte (FCS / CSI) */
    const severity = clamp((42 - o.fcs) / 20 + (o.csi - 20) / 40, -1, 1.6);
    const out = prof.map((v, i) => clamp(v + (i >= 2 ? severity * 4.5 : -severity * 4.5) * (i >= 3 ? 1.25 : 0.75) + noise(shift + i * 3) * 1.4, 0, 100));
    const tot = sum(out);
    return out.map((v) => r1((v / tot) * 100));
  }

  /* ==========================================================================
   * 4. Régression linéaire (graphique 5)
   * ======================================================================== */
  function linearRegression(pts) {
    const n = pts.length;
    const sx = sum(pts.map((p) => p.x)), sy = sum(pts.map((p) => p.y));
    const sxy = sum(pts.map((p) => p.x * p.y)), sxx = sum(pts.map((p) => p.x * p.x)), syy = sum(pts.map((p) => p.y * p.y));
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
    const b = (sy - a * sx) / n;
    const r = (n * sxy - sx * sy) / (Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy)) || 1);
    return { a, b, r };
  }

  /* ==========================================================================
   * 5. Construction de la VUE
   * ======================================================================== */
  function build(state) {
    const mode = state.mode === 'country' ? 'country' : 'region';
    const gran = state.gran === 'M' ? 'M' : 'Q';
    const sub = clamp(state.sub || (gran === 'M' ? 12 : 4), 1, gran === 'M' ? 12 : 4);
    const c = mode === 'country' ? byCode[state.country] || C[0] : null;
    const periodLabel = gran === 'M' ? MONTHS_LONG[sub - 1] + ' ' + YEAR : QUARTERS[sub - 1] + ' ' + YEAR;

    /* -------- Objet de référence (pays ou région) -------- */
    const ref = mode === 'country' ? c : {
      code: 'AO', name: 'Afrique de l’Ouest', flag: '🌍', zone: 'mixed',
      fcs: regional.fcs, fcsPrev: regional.fcsPrev, csi: regional.csi, pop: regional.pop,
      insecure: regional.insecure, beneficiaries: regional.beneficiaries,
      hhMonth: regional.hhMonth / 1000, collectors: regional.collectors, markets: regional.markets,
      priceIndex: regional.priceIndex, muac: regional.muac, kcal: regional.kcal,
      access: regional.access, hdds: regional.hdds, stockDays: regional.stockDays, ipc: 3
    };

    /* -------- Séries de la vue courante (pays réel ou agrégat régional) --------
     * En Vue Globale, chaque série est un agrégat pondéré des 16 pays
     * (population pour le FCS, nombre de marchés suivis pour les prix). */
    const series = {
      fcsQ: mode === 'country' ? fcsQuarterly(c) : weightedSeries(fcsQuarterly, 'pop'),
      fcsM: mode === 'country' ? fcsMonthly(c) : weightedSeries(fcsMonthly, 'pop'),
      priceM: mode === 'country' ? priceIndexMonthly(c) : weightedSeries(priceIndexMonthly, 'markets'),
      alertsM: mode === 'country' ? alertsMonthly(c) : MONTHS.map((m, i) => sum(C.map((cc) => alertsMonthly(cc)[i]))),
      collectorsM: mode === 'country' ? collectorMonthly(c) : MONTHS.map((m, i) => sum(C.map((cc) => collectorMonthly(cc)[i]))),
      /* Prix FCFA/kg d'un produit : relevé pays ou moyenne pondérée régionale */
      priceOf: (prod, m) => (mode === 'country' ? productPrice(c, prod, m)
        : Math.round(sum(C.map((cc) => productPrice(cc, prod, m) * cc.markets)) / regional.markets))
    };

    /* -------- Ajustement saisonnier des KPI selon la période sélectionnée --------
     * leanCoef > 1 pendant la soudure (juin → septembre) : les personnes en
     * insécurité augmentent, le FCS baisse, les prix montent. En Vue Globale, le
     * coefficient est pondéré par le nombre de personnes en insécurité. */
    const leanIdx = gran === 'M' ? sub - 1 : (sub - 1) * 3 + 1;
    const leanCoef = mode === 'country' ? seas(c, 'alerts', leanIdx)
      : sum(C.map((cc) => seas(cc, 'alerts', leanIdx) * cc.insecure)) / regional.insecure;
    const k = (v) => r1(v * (1 + (leanCoef - 1) * 0.55));      // indicateur « pression »
    const fcsNow = r1(ref.fcs - (leanCoef - 1) * 7.5);         // FCS : creux en soudure
    /* Séries ramenées à la granularité choisie (12 mois 2024 ou 4 trimestres 2024) :
     * les mini-graphiques de KPI exigent values.length === labels.length. */
    const aggQ = (arr) => QUARTERS.map((q, i) => Math.round(sum(arr.slice(i * 3, i * 3 + 3)) / 3));
    const toGran = (arr) => (gran === 'M' ? arr.slice(12) : aggQ(arr.slice(12)));   // séries de 24 mois
    const toGranYear = (arr) => (gran === 'M' ? arr : aggQ(arr));                   // séries de 12 mois
    const granLabels = gran === 'M' ? MONTHS : QUARTERS;
    const priceYear = toGran(series.priceM);
    /* Index prix de la période sélectionnée (cohérent avec le sparkline du KPI 5 :
     * priceYear est déjà à la granularité courante, 12 mois ou 4 trimestres) */
    const priceNow = priceYear[sub - 1];

    /* -------- Zones : 16 pays OU districts du pays -------- */
    const zones = mode === 'country' ? districtsOf(c) : C.slice();
    const zoneUnit = mode === 'country' ? 'district' : 'pays';

    /* -------- Séries G2 -------- */
    let g2;
    if (gran === 'Q') {
      const labels = TREND_QUARTERS.map((t) => t.label);
      if (mode === 'region') {
        const flagship = ['NE', 'ML', 'BF', 'NG', 'SN', 'GH'].map((code) => byCode[code]);
        g2 = {
          labels, granularity: 'Q', threshold: 42, crisis: crisisRange('Q'),
          series: flagship.map((cc, i) => ({
            key: cc.code, label: cc.flag + ' ' + cc.name, values: fcsQuarterly(cc),
            color: ['#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#F97316'][i]
          }))
        };
      } else {
        const ds = districtsOf(c).slice().sort((a, b) => a.fcs - b.fcs).slice(0, 3);
        g2 = {
          labels, granularity: 'Q', threshold: 42, crisis: crisisRange('Q'),
          series: [{ key: c.code, label: c.flag + ' ' + c.name + ' (national)', values: fcsQuarterly(c), color: '#F59E0B', width: 3.4 }]
            .concat([{ key: 'AO', label: '🌍 Moyenne régionale', values: fcsQuarterlyRegional(), color: '#8B5CF6', dashed: true, width: 2 }])
            .concat(ds.map((d, i) => ({ key: d.code, label: d.name, values: fcsQuarterly({ code: c.code + d.code, name: d.name, zone: c.zone, fcs: d.fcs, fcsPrev: d.fcsPrev }), color: ['#3B82F6', '#10B981', '#EF4444'][i] })))
        };
      }
    } else {
      const labels = PRICE_MONTHS.map((p) => p.label);
      const crisisIdx = crisisRange('M');
      if (mode === 'region') {
        const flagship = ['NE', 'ML', 'BF', 'NG', 'SN', 'GH'].map((code) => byCode[code]);
        g2 = {
          labels, granularity: 'M', threshold: 42, crisis: crisisIdx,
          series: flagship.map((cc, i) => ({
            key: cc.code, label: cc.flag + ' ' + cc.name, values: fcsMonthly(cc),
            color: ['#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#F97316'][i]
          }))
        };
      } else {
        const ds = districtsOf(c).slice().sort((a, b) => a.fcs - b.fcs).slice(0, 3);
        const regMonthly = weightedSeries(fcsMonthly, 'pop');
        g2 = {
          labels, granularity: 'M', threshold: 42, crisis: crisisIdx,
          series: [{ key: c.code, label: c.flag + ' ' + c.name + ' (national)', values: fcsMonthly(c), color: '#F59E0B', width: 3.4 }]
            .concat([{ key: 'AO', label: '🌍 Moyenne régionale', values: regMonthly, color: '#8B5CF6', dashed: true, width: 2 }])
            .concat(ds.map((d, i) => ({ key: d.code, label: d.name, values: fcsMonthly({ code: c.code + d.code, name: d.name, zone: c.zone, fcs: d.fcs, fcsPrev: d.fcsPrev }), color: ['#3B82F6', '#10B981', '#EF4444'][i] })))
        };
      }
    }

    /* -------- Heatmap prix G3 (24 mois × 8 produits) -------- */
    const g3 = {
      rows: D.products.map((p) => p.name),
      cols: PRICE_MONTHS.map((p) => p.label),
      cells: D.products.map((prod, r) => PRICE_MONTHS.map((p, ci) => {
        const price = series.priceOf(prod, p.m);
        return { row: r, col: ci, price, ratio: r2(price / prod.base), product: prod.name, month: p.label };
      })),
      currentCol: gran === 'M' ? 11 + (sub - 1) : 11 + (sub - 1) * 3 + 1
    };

    /* -------- Radar CSI G4 -------- */
    let g4;
    const csiOf = (o) => D.csiAxes.map((a) => r1(o.csi * a.weight * (0.78 + Math.abs(noise(hashStr(o.code + a.key)) * 2) * 0.5)));
    if (mode === 'region') {
      const sel = (state.g4Sel && state.g4Sel.length ? state.g4Sel : ['NE', 'BF', 'SN']);
      g4 = {
        axes: D.csiAxes.map((a) => a.label),
        series: sel.map((code) => ({ key: code, label: byCode[code].flag + ' ' + byCode[code].name, values: csiOf(byCode[code]), color: code === 'NE' ? '#EF4444' : code === 'BF' ? '#F59E0B' : '#10B981' }))
      };
    } else {
      g4 = {
        axes: D.csiAxes.map((a) => a.label),
        series: [
          { key: c.code, label: c.flag + ' ' + c.name, values: csiOf(c), color: '#F59E0B' },
          { key: 'AO', label: '🌍 Moyenne régionale', values: csiOf({ code: 'AO', csi: regional.csi }), color: '#8B5CF6', dashed: true },
          { key: 'target', label: 'Cible PAM (CSI ≤ 20)', values: csiOf({ code: 'target', csi: 20 }), color: '#10B981', dashed: true }
        ]
      };
    }

    /* -------- Scatter G5 : prix du mil vs malnutrition aigüe (48 points) -- */
    const mil = D.products[0];
    const pts = [];
    C.forEach((cc) => {
      for (let i = 0; i < 3; i++) {
        const seed = hashStr(cc.code) + i * 91;
        const x = Math.round(mil.base * (cc.priceIndex / 100) * (1 + noise(seed) * 0.16));
        const y = r1(clamp(cc.muac * (1 + noise(seed * 3.7) * 0.24), 0.5, 30));
        pts.push({
          x, y, r: 3 + Math.sqrt(cc.pop) * 0.62, label: cc.name, sub: ['Marché urbain', 'Marché rural', 'Point de distribution'][i],
          color: D.ipcProfiles[cc.ipc].color, ipc: cc.ipc, code: cc.code, households: Math.round(cc.hhMonth * 1000 / 3)
        });
      }
    });
    const reg = linearRegression(pts);
    const xMin = Math.min.apply(null, pts.map((p) => p.x)), xMax = Math.max.apply(null, pts.map((p) => p.x));
    const g5 = {
      points: pts,
      regression: { a: r2(reg.a * 1000) / 1000, b: r1(reg.b), r: r2(reg.r), x0: xMin, y0: r1(reg.a * xMin + reg.b), x1: xMax, y1: r1(reg.a * xMax + reg.b) },
      xLabel: 'Prix du mil relevé (FCFA/kg)', yLabel: 'Malnutrition aigüe MUAC (%)'
    };

    /* -------- Funnel G6 -------- */
    const scaleF = (mode === 'country' ? c.beneficiaries / regional.beneficiaries : 1);
    const g6 = {
      steps: D.funnel.map((s) => ({
        label: s.label, note: s.note,
        value: r2(s.value * scaleF * (s.key === 'targeted' ? (mode === 'country' ? 1.12 : 1) : 1)),
        share: r1((s.value / D.funnel[0].value) * 100)
      }))
    };

    /* -------- Rose chart G7 -------- */
    const alerts = series.alertsM;
    const g7 = { values: alerts, labels: MONTHS, lean: D.LEAN_SEASON, unit: 'alertes' };

    /* -------- Carte G8 -------- */
    const g8 = mode === 'country'
      ? { mode: 'country', country: c.code, countryName: c.name, zones: districtsOf(c).map((d) => ({ code: d.code, name: d.name, ipc: d.ipc, fcs: d.fcs, csi: d.csi, muac: d.muac, insecure: d.insecure, pop: d.pop, beneficiaries: d.beneficiaries })) }
      : { mode: 'region', countryName: 'Afrique de l’Ouest', zones: C.map((cc) => ({ code: cc.code, name: cc.name, flag: cc.flag, ipc: cc.ipc, fcs: cc.fcs, csi: cc.csi, muac: cc.muac, insecure: cc.insecure, pop: cc.pop, beneficiaries: cc.beneficiaries })) };

    /* -------- Prix des 5 céréales G9 (20 trimestres) -------- */
    const cerealKeys = D.products.filter((p) => p.cereal);
    /* Index de prix trimestriel de la vue courante (pays ou régional pondéré) */
    const idxQ = mode === 'country' ? priceIndexQuarterly(c) : weightedSeries(priceIndexQuarterly, 'markets');
    const g9 = {
      labels: TREND_QUARTERS.map((t) => t.label),
      unit: 'FCFA/kg',
      series: cerealKeys.map((prod, i) => ({
        key: prod.key, label: prod.name,
        color: ['#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#10B981'][i],
        values: idxQ.map((idx, qi) => Math.round(prod.base * (idx / 100) * (1 + noise(hashStr(prod.key) + qi * 11) * 0.05)))
      }))
    };

    /* -------- Disponibilité vs accès G10 -------- */
    const z10 = zones.slice().sort((a, b) => a.access - b.access).slice(0, 10);
    const g10 = {
      unit: zoneUnit,
      zones: z10.map((z) => (mode === 'country' ? z.name : z.flag + ' ' + z.name)),
      availability: z10.map((z) => z.kcal),
      access: z10.map((z) => z.access),
      gap: z10.map((z) => Math.round((z.kcal / 2400) * 100 - z.access)),
      availabilityNorm: 2400
    };

    /* -------- HDDS G11 -------- */
    const households = Math.round((mode === 'country' ? c.hhMonth : regional.hhMonth / 1000) * 1000 * (gran === 'M' ? 1 : 3));
    const g11 = {
      scores: Array.from({ length: 13 }, (x, i) => i),
      counts: hddsDistribution(ref, households),
      mean: ref.hdds, threshold: 6, households,
      unit: zoneUnit
    };

    /* -------- Dumbbell G12 -------- */
    const g12 = {
      unit: zoneUnit,
      rows: zones.slice().sort((a, b) => (a.fcs - a.fcsPrev) - (b.fcs - b.fcsPrev)).map((z) => ({
        name: mode === 'country' ? z.name : z.flag + ' ' + z.name,
        code: z.code, v2020: z.fcsPrev, v2024: z.fcs, delta: r1(z.fcs - z.fcsPrev)
      }))
    };

    /* -------- Calendar heatmap G13 (12 mois × zones) -------- */
    const zRows = zones.slice().sort((a, b) => b.ipc - a.ipc || a.fcs - b.fcs).slice(0, 12);
    const g13 = {
      cols: MONTHS,
      unit: zoneUnit,
      rows: zRows.map((z) => ({
        name: mode === 'country' ? z.name : z.flag + ' ' + z.name, code: z.code,
        values: MONTHS.map((m, i) => Math.round((mode === 'country' ? alertsMonthly(c)[i] * (0.5 + z.popShare * 2) : alertsMonthly(z)[i]) * (0.6 + z.csi / 60)))
      })),
      currentCol: gran === 'M' ? sub - 1 : (sub - 1) * 3 + 1
    };

    /* -------- Waterfall G14 -------- */
    const scaleW = mode === 'country' ? (c.beneficiaries / regional.beneficiaries) * 1.05 : 1;
    const g14 = {
      unit: 'Mds $',
      steps: D.waterfall.map((s) => ({ key: s.key, label: s.label, type: s.type, note: s.note, value: r2(s.value * scaleW) }))
    };

    /* -------- Bullet charts G15 -------- */
    const coverage = r1((ref.beneficiaries / (mode === 'country' ? D.targets.beneficiaries * (c.beneficiaries / regional.beneficiaries) * 1.25 : D.targets.beneficiaries)) * 100);
    const muacScreen = Math.round((mode === 'country' ? c.hhMonth * 1000 * 1.72 : regional.hhMonth * 1.72) / 1000);
    const g15 = {
      rows: D.bullets.map((b) => {
        const v = {
          fcs: fcsNow, csi: Math.round(ref.csi * (1 + (leanCoef - 1) * 0.5)), coverage: clamp(coverage, 0, 100),
          stocks: Math.round(ref.stockDays * (gran === 'M' ? 1 : 1.02)), muac: muacScreen,
          delay: r1(9 + (mode === 'country' ? c.csi / 14 : 6) + noise(hashStr(ref.code + 'delay')) * 1.6),
          alerts: r1(88 + (ref.fcs - 30) / 8), sync: r1(91 + (ref.fcs - 30) / 12)
        }[b.key];
        return { key: b.key, label: b.label, unit: b.unit, target: b.target, max: b.max, higherIsBetter: b.higherIsBetter, note: b.note, value: typeof v === 'number' ? v : 0 };
      })
    };

    /* -------- G1 : phases IPC -------- */
    const g1 = {
      unit: zoneUnit,
      phases: D.IPC_PHASES,
      zones: zones.slice().sort((a, b) => b.ipc - a.ipc || a.fcs - b.fcs).map((z, i) => {
        const popPersons = mode === 'country' ? z.pop * 1e6 : z.pop * 1e6;
        return {
          code: z.code, name: mode === 'country' ? z.name : z.flag + ' ' + z.name, ipc: z.ipc,
          phases: ipcPhases(z, hashStr(z.code) + i), persons: Math.round(popPersons),
          insecure: mode === 'country' ? z.insecure : z.insecure,
          screened: Math.round((z.hhMonth || 0) * 1000 * 4.2)
        };
      })
    };

    /* ================= KPI ================= */
    const kpis = {
      k1: {
        value: fmtM(k(ref.insecure)),
        unit: 'M',
        label: 'Personnes en insécurité alimentaire',
        sub: 'Dépistage app mobile / Enquêtes mVAM ménages',
        color: '#F59E0B',
        badge: mode === 'country'
          ? { dir: c.insecure / (regional.insecure / 16) > 1 ? 'up' : 'down', text: pctVs(c.insecure, regional.insecure / 16) + ' vs Moyenne régionale' }
          : { dir: 'up', text: '+2.3M vs T3 2023' },
        viz: { type: 'bars', values: toGranYear(series.collectorsM), labels: granLabels, color: '#F59E0B', gran },
        foot: fmtInt(Math.round((mode === 'country' ? c.hhMonth : regional.hhMonth / 1000) * 1000)) + ' ménages enquêtés · ' + fmtInt(mode === 'country' ? c.collectors : regional.collectors) + ' relais équipés'
      },
      k2: {
        value: fcsNow, unit: '',
        label: 'Food Consumption Score (App Ménages)',
        sub: 'Classification : Limite (0-28 Pauvre | 28.5-42 Limite | >42 Acceptable)',
        color: '#F59E0B',
        badge: mode === 'country'
          ? { dir: c.fcs >= regional.fcs ? 'up' : 'down', text: pctVs(c.fcs, regional.fcs) + ' vs Moyenne Régionale' }
          : { dir: regional.fcs >= regional.fcsPrev ? 'up' : 'down', text: (regional.fcs >= regional.fcsPrev ? '+' : '−') + r1(Math.abs(regional.fcs - regional.fcsPrev)) + ' pt vs 2020' },
        viz: { type: 'gauge', value: r1(k(ref.fcs)), max: 70, zones: [[0, 28, '#EF4444', 'Pauvre'], [28, 42, '#F59E0B', 'Limite'], [42, 70, '#10B981', 'Acceptable']], gran },
        foot: 'FCS 2020 : ' + ref.fcsPrev + ' → 2024 : ' + ref.fcs + ' (' + (ref.fcs >= ref.fcsPrev ? '+' : '−') + r1(Math.abs(ref.fcs - ref.fcsPrev)) + ' pt)'
      },
      k3: {
        value: mode === 'country' ? districtsOf(c).filter((d) => d.ipc >= 3).length : regional.countriesIpc3,
        unit: mode === 'country' ? ' districts' : ' pays',
        label: 'Zones en Phase IPC 3+ (Alerte App)',
        sub: mode === 'country' ? 'dont ' + districtsOf(c).filter((d) => d.ipc >= 4).length + ' district(s) en IPC 4+ (Urgence)'
          : 'dont ' + regional.countriesIpc4 + ' en IPC 4+ · ' + regional.districtsCrisis + ' districts régionaux en IPC 3+',
        color: '#EF4444', badge: { dir: 'up', text: 'Alertes terrain actives' },
        viz: {
          type: 'grid',
          cells: zones.slice().sort((a, b) => b.ipc - a.ipc || a.fcs - b.fcs).map((z) => ({ name: mode === 'country' ? z.name : z.flag, ipc: z.ipc, code: z.code })),
          gran
        },
        foot: (mode === 'country' ? c.name : 'Afrique de l’Ouest') + ' · phase IPC dominante : IPC ' + ref.ipc + ' (' + D.ipcProfiles[ref.ipc].label + ')'
      },
      k4: {
        value: fmtM(ref.beneficiaries), unit: 'M',
        label: 'Bénéficiaires assistés (Scannés/Enregistrés App)',
        sub: mode === 'country'
          ? 'Cible pays PAM : ' + r1(D.targets.beneficiaries * (c.beneficiaries / regional.beneficiaries) * 1.25) + 'M (' + coverage + '% d’exécution)'
          : 'Cible PAM : ' + D.targets.beneficiaries + 'M (' + r1((regional.beneficiaries / D.targets.beneficiaries) * 100) + '% d’exécution)',
        color: '#10B981',
        badge: { dir: 'up', text: '+' + r1(mode === 'country' ? 0.4 : 1.9) + 'M vs 2023' },
        viz: {
          type: 'progress', value: mode === 'country' ? c.beneficiaries : regional.beneficiaries,
          target: mode === 'country' ? D.targets.beneficiaries * (c.beneficiaries / regional.beneficiaries) * 1.25 : D.targets.beneficiaries, gran
        },
        foot: 'Chaîne logistique : ' + g6.steps[g6.steps.length - 1].value + 'M confirmés reçus (' + g6.steps[g6.steps.length - 1].share + '% de la cible)'
      },
      k5: {
        value: priceNow, unit: '',
        label: 'Index Prix Céréales (Relevé App Marchés)',
        sub: '↑ +' + Math.round(priceNow - 100) + '% vs normale saisonnière',
        color: '#EF4444',
        badge: { dir: priceNow >= 100 ? 'up' : 'down', text: (priceNow >= 100 ? '+' : '−') + Math.round(Math.abs(priceNow - 100)) + '% vs normale' },
        viz: {
          type: 'line',
          values: priceYear,
          labels: granLabels, color: '#EF4444', gran, baseline: 100
        },
        foot: fmtInt(mode === 'country' ? c.markets : regional.markets) + ' marchés suivis · panier 8 produits · ' + (mode === 'country' ? c.name : '16 pays')
      }
    };

    return {
      meta: {
        mode, gran, sub, periodLabel,
        country: mode === 'country' ? c.code : null,
        countryName: mode === 'country' ? c.name : 'Afrique de l’Ouest',
        flag: mode === 'country' ? c.flag : '🌍',
        zoneUnit,
        ref: {
          code: ref.code, name: ref.name, fcs: ref.fcs, fcsPrev: ref.fcsPrev, csi: ref.csi, ipc: ref.ipc,
          muac: ref.muac, access: ref.access, kcal: ref.kcal, hdds: ref.hdds, stockDays: ref.stockDays,
          pop: ref.pop, insecure: ref.insecure, beneficiaries: ref.beneficiaries, priceIndex: ref.priceIndex
        },
        regional,
        households,
        alertsTotal: sum(alerts)
      },
      kpis, g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13, g14, g15,
      zones: zones.map((z) => ({
        code: z.code, name: mode === 'country' ? z.name : z.flag + ' ' + z.name, flag: z.flag || '',
        fcs: z.fcs, fcsPrev: z.fcsPrev, csi: z.csi, ipc: z.ipc, muac: z.muac, priceIndex: z.priceIndex,
        access: z.access, kcal: z.kcal, hdds: z.hdds, insecure: z.insecure, beneficiaries: z.beneficiaries,
        pop: z.pop, hhMonth: z.hhMonth, stockDays: z.stockDays
      }))
    };
  }

  /* Indices de la fenêtre « Crise alimentaire / inflation marchés » */
  function crisisRange(gran) {
    if (gran === 'Q') {
      const i0 = TREND_QUARTERS.findIndex((t) => t.y === D.CRISIS_WINDOW.from.y && t.q === D.CRISIS_WINDOW.from.q);
      const i1 = TREND_QUARTERS.findIndex((t) => t.y === D.CRISIS_WINDOW.to.y && t.q === D.CRISIS_WINDOW.to.q);
      return [i0, i1];
    }
    return [PRICE_MONTHS.findIndex((p) => p.y === 2023 && p.m === 0), PRICE_MONTHS.findIndex((p) => p.y === 2023 && p.m === 5)];
  }

  /* ---------- Formats ---------- */
  function fmtInt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F'); }
  /* Millions : 2 décimales sous 1 M, 1 décimale au-delà */
  function fmtM(v) { return v < 1 ? r2(v) : r1(v); }
  function pctVs(v, base) { const d = ((v - base) / (base || 1)) * 100; return (d >= 0 ? '+' : '−') + Math.abs(Math.round(d)) + '%'; }

  WFP.model = {
    build,
    countries: C,
    byCode,
    regional,
    districtsOf,
    fmtInt,
    fmtM,
    pctVs,
    r1, r2, clamp, sum,
    MONTHS, MONTHS_LONG, QUARTERS,
    TREND_QUARTERS, PRICE_MONTHS
  };
})(window);
