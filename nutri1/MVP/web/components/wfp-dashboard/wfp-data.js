/* ============================================================================
 * WFP NutriTracker · wfp-data.js
 * Donnees de reference (app mobile de suivi terrain PAM 2024) et generateurs
 * deterministes pour les series temporelles et les districts.
 *
 *  - Les valeurs des 16 pays (FCS, FCS precedent, CSI, IPC) et les totaux
 *    regionaux viennent directement du cahier des charges (hardcodes).
 *  - Les series mensuelles 2020-2024, les districts, les prix et les distributions
 *    sont reconstruits de facon DETERMINISTE (graine = code pays) a partir de ces
 *    points d'ancrage : rejouer le tableau de bord donne toujours les memes chiffres.
 *
 * Dependances : aucune. Expose window.WFP.data et les generateurs WFP.gen.
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP = global.WFP || {};

  /* ----------------------------------------------------------------------
   * 1. Utilitaires de generation (PRNG xorshift32 + hachage FNV-1a)
   * -------------------------------------------------------------------- */
  // Hachage d'une chaine -> entier 32 bits non signe (graine stable)
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  // Generateur pseudo-aleatoire deterministe, renvoie un nombre dans [0,1)
  function rng(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const round1 = v => Math.round(v * 10) / 10;

  /* ----------------------------------------------------------------------
   * 2. Constantes de reference regionales (valeurs du brief)
   * -------------------------------------------------------------------- */
  const REGION = {
    insecM: 43.7,      // personnes en insecurite alimentaire (M)
    fcs: 41.2,         // FCS moyen regional
    ipcCountries: 9,   // pays en phase IPC 3+ (valeur du brief)
    benefM: 12.4,      // beneficiaires assistes (M)
    targetM: 18.5,     // cible PAM (M)
    priceIdx: 127.4,   // index prix cereales
    priceTrend: 28,    // % vs normale saisonniere
    syncMinutes: 8,
    householdsMonth: 312400
  };

  /* ----------------------------------------------------------------------
   * 3. Phases IPC, zones, palette PAM
   * -------------------------------------------------------------------- */
  const PHASES = [
    { id: 'IPC1', label: 'Minimale', color: '#10B981' },
    { id: 'IPC2', label: 'Sous pression', color: '#86EFAC' },
    { id: 'IPC3', label: 'Crise', color: '#FACC15' },
    { id: 'IPC4', label: 'Urgence', color: '#F97316' },
    { id: 'IPC5', label: 'Famine', color: '#DC2626' }
  ];
  const ZONES = {
    all: { label: 'Afrique de l\'Ouest' },
    sahel: { label: 'Sahel / AES' },
    golfe: { label: 'Golfe de Guinée' },
    cotiere: { label: 'Côtière Ouest' }
  };
  const PRODUCTS = [
    { key: 'mil', label: 'Mil', normal: 230, vol: 1.00 },
    { key: 'mais', label: 'Maïs', normal: 240, vol: 0.95 },
    { key: 'riz', label: 'Riz', normal: 360, vol: 0.80 },
    { key: 'sorgho', label: 'Sorgho', normal: 220, vol: 1.05 },
    { key: 'haricots', label: 'Haricots', normal: 560, vol: 1.15 },
    { key: 'farine', label: 'Farine', normal: 330, vol: 0.90 },
    { key: 'huile', label: 'Huile', normal: 1150, vol: 0.70 },
    { key: 'sucre', label: 'Sucre', normal: 620, vol: 0.60 }
  ];
  // 5 cereales suivies pour le graphique 9 (prix de base 2020, FCFA/kg, facteur de hausse)
  const CEREALS = [
    { key: 'mil', label: 'Mil', base: 215, rise: 1.32, color: '#F59E0B' },
    { key: 'mais', label: 'Maïs', base: 225, rise: 1.25, color: '#EF4444' },
    { key: 'riz', label: 'Riz', base: 340, rise: 1.18, color: '#10B981' },
    { key: 'sorgho', label: 'Sorgho', base: 205, rise: 1.30, color: '#8B5CF6' },
    { key: 'haricots', label: 'Haricots', base: 520, rise: 1.35, color: '#3B82F6' }
  ];
  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  /* ----------------------------------------------------------------------
   * 4. Les 16 pays (valeurs de reference issues de l'app de suivi 2024)
   *    fcs / fcsPrev : FCS 2024 et precedent · csi : Coping Strategy Index
   *    ipc : phase IPC dominante · insec : personnes en insecurite (M)
   *    pop : population approximative (M) · districts : regions suivies
   * -------------------------------------------------------------------- */
  const COUNTRIES = [
    { code: 'NE', name: 'Niger', zone: 'sahel', fcs: 28.3, fcsPrev: 30.1, csi: 38, ipc: 4, insec: 5.8, pop: 27,
      districts: ['Agadez', 'Diffa', 'Dosso', 'Maradi', 'Tahoua', 'Tillabéri', 'Zinder', 'Niamey'] },
    { code: 'ML', name: 'Mali', zone: 'sahel', fcs: 34.1, fcsPrev: 35.8, csi: 31, ipc: 3, insec: 4.9, pop: 23,
      districts: ['Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti', 'Tombouctou', 'Gao', 'Kidal'] },
    { code: 'BF', name: 'Burkina Faso', zone: 'sahel', fcs: 36.2, fcsPrev: 37.9, csi: 28, ipc: 3, insec: 4.6, pop: 23,
      districts: ['Boucle du Mouhoun', 'Cascades', 'Centre-Nord', 'Est', 'Nord', 'Sahel', 'Centre-Est', 'Hauts-Bassins'] },
    { code: 'MR', name: 'Mauritanie', zone: 'sahel', fcs: 32.6, fcsPrev: 34.2, csi: 33, ipc: 3, insec: 1.0, pop: 5,
      districts: ['Hodh Ech Chargui', 'Hodh El Gharbi', 'Assaba', 'Gorgol', 'Trarza', 'Nouakchott'] },
    { code: 'SN', name: 'Sénégal', zone: 'cotiere', fcs: 48.7, fcsPrev: 47.2, csi: 18, ipc: 2, insec: 2.4, pop: 18,
      districts: ['Dakar', 'Kaolack', 'Kolda', 'Matam', 'Tambacounda', 'Louga', 'Sédhiou', 'Ziguinchor'] },
    { code: 'GN', name: 'Guinée', zone: 'cotiere', fcs: 44.2, fcsPrev: 43.7, csi: 21, ipc: 2, insec: 2.1, pop: 14,
      districts: ['Conakry', 'Kindia', 'Boké', 'Faranah', 'Kankan', 'N\'Zérékoré'] },
    { code: 'SL', name: 'Sierra Leone', zone: 'cotiere', fcs: 41.8, fcsPrev: 42.9, csi: 26, ipc: 3, insec: 1.4, pop: 9,
      districts: ['Nord', 'Est', 'Sud', 'Ouest', 'Nord-Ouest'] },
    { code: 'LR', name: 'Liberia', zone: 'cotiere', fcs: 43.2, fcsPrev: 42.1, csi: 23, ipc: 2, insec: 0.9, pop: 5,
      districts: ['Montserrado', 'Nimba', 'Lofa', 'Bong', 'Grand Gedeh'] },
    { code: 'GW', name: 'Guinée-Bissau', zone: 'cotiere', fcs: 38.9, fcsPrev: 39.8, csi: 29, ipc: 3, insec: 0.7, pop: 2,
      districts: ['Bissau', 'Bafatá', 'Gabú', 'Oio', 'Cacheu', 'Tombali'] },
    { code: 'GM', name: 'Gambie', zone: 'cotiere', fcs: 46.1, fcsPrev: 45.3, csi: 19, ipc: 2, insec: 0.6, pop: 2.7,
      districts: ['Western', 'North Bank', 'Central River', 'Upper River', 'Lower River'] },
    { code: 'CV', name: 'Cap-Vert', zone: 'cotiere', fcs: 62.1, fcsPrev: 60.4, csi: 8, ipc: 1, insec: 0.1, pop: 0.6,
      districts: ['Santiago', 'São Vicente', 'Sal', 'Boa Vista', 'Santo Antão'] },
    { code: 'NG', name: 'Nigeria', zone: 'golfe', fcs: 39.4, fcsPrev: 40.8, csi: 24, ipc: 3, insec: 12.7, pop: 230,
      districts: ['Nord-Ouest', 'Nord-Est', 'Nord-Centre', 'Sud-Ouest', 'Sud-Est', 'Sud-Sud'] },
    { code: 'GH', name: 'Ghana', zone: 'golfe', fcs: 54.2, fcsPrev: 52.8, csi: 12, ipc: 2, insec: 1.5, pop: 34,
      districts: ['Nord', 'Haut-Est', 'Haut-Ouest', 'Volta', 'Ashanti', 'Grand Accra'] },
    { code: 'CI', name: 'Côte d\'Ivoire', zone: 'golfe', fcs: 51.3, fcsPrev: 50.1, csi: 14, ipc: 2, insec: 2.2, pop: 29,
      districts: ['Savanes', 'Denguélé', 'Vallée du Bandama', 'Zanzan', 'Woroba', 'Lagunes'] },
    { code: 'BJ', name: 'Bénin', zone: 'golfe', fcs: 47.3, fcsPrev: 46.1, csi: 20, ipc: 2, insec: 1.6, pop: 14,
      districts: ['Alibori', 'Atacora', 'Borgou', 'Zou', 'Atlantique', 'Ouémé'] },
    { code: 'TG', name: 'Togo', zone: 'golfe', fcs: 45.8, fcsPrev: 44.9, csi: 21, ipc: 2, insec: 1.2, pop: 9,
      districts: ['Savanes', 'Kara', 'Centrale', 'Plateaux', 'Maritime'] }
  ];


  /* ----------------------------------------------------------------------
   * 5. Generateurs de series (deterministes)
   * -------------------------------------------------------------------- */
  // Serie mensuelle FCS 2020-2024 (60 points) : ancrage 2020 -> 2023 (fcsPrev) -> 2024 (fcs)
  function fcsMonthly(key, fcs, fcsPrev, sahel) {
    const r = rng(hash('fcs:' + key));
    const start = fcs + (r() * 6 - 2);        // niveau 2020 (leger ecart)
    const out = [];
    for (let t = 0; t < 60; t++) {
      const base = t <= 47
        ? start + (fcsPrev - start) * (t / 47)
        : fcsPrev + (fcs - fcsPrev) * ((t - 47) / 12);
      const m = t % 12;
      const soudure = (m >= 5 && m <= 8) ? (sahel ? -1.1 : -0.5) : 0; // creux de soudure juin-sept
      out.push(round1(clamp(base + soudure + (r() - 0.5) * 1.1, 8, 80)));
    }
    return out;
  }
  // Moyenne trimestrielle a partir de 60 mois -> 20 points
  function toQuarters(monthly) {
    const q = [];
    for (let i = 0; i < monthly.length; i += 3) {
      const s = monthly.slice(i, i + 3);
      q.push(round1(s.reduce((a, b) => a + b, 0) / s.length));
    }
    return q;
  }
  // Index des mois (0 = janv. 2020) ; quartiers Q1-2020 = 0
  const QUARTER_LABELS = [];
  for (let y = 2020; y <= 2024; y++) for (let q = 1; q <= 4; q++) QUARTER_LABELS.push('T' + q + ' ' + String(y).slice(2));
  const MONTH_LABELS = [];
  for (let y = 2020; y <= 2024; y++) for (let m = 0; m < 12; m++) MONTH_LABELS.push(MONTHS[m] + ' ' + String(y).slice(2));

  // Indice de prix mensuel (base 100 en 2020) pour un pays ou la region
  function priceRatioSeries(key, ipc) {
    const r = rng(hash('px:' + key));
    const endRatio = 1.20 + (ipc - 2) * 0.06 + (r() * 0.06 - 0.03);
    const out = [];
    for (let t = 0; t < 60; t++) {
      const trend = 1 + (endRatio - 1) * Math.pow(t / 59, 1.4);
      const m = t % 12;
      const soud = (m >= 5 && m <= 8) ? 0.035 : 0;
      out.push(trend + soud + (r() - 0.5) * 0.02);
    }
    return { end: endRatio, series: out };
  }

  // Ratio d'ecart au prix normal (cellules heatmap) pour un pays, 24 mois (2023-2024)
  function heatRatios(key, ipc) {
    const r = rng(hash('heat:' + key));
    const rows = PRODUCTS.map(p => {
      const cols = [];
      for (let m = 0; m < 24; m++) {
        const mo = m % 12;
        const soud = (mo >= 5 && mo <= 8) ? 0.22 : 0;
        const crisis = (ipc - 1) * 0.20;
        const v = (0.82 + crisis + soud) * (0.85 + 0.25 * p.vol) + (r() - 0.5) * 0.16;
        cols.push(round1(clamp(v, 0.6, 2.6) * 100) / 100);
      }
      return cols;
    });
    return rows;
  }

  // Distribution IPC (% population par phase) pour un niveau moyen (1..5)
  function phaseShares(level, seedKey) {
    const r = rng(hash('ipc:' + seedKey));
    const w = [1, 2, 3, 4, 5].map(k => Math.exp(-Math.pow(k - level, 2) / 1.1) * (0.85 + r() * 0.3) + 0.002);
    const s = w.reduce((a, b) => a + b, 0);
    return w.map(v => round1(v / s * 100));
  }

  // Districts : valeurs derivees du pays (variation deterministe)
  function buildDistricts(c) {
    const r = rng(hash('dist:' + c.code));
    return c.districts.map((name, i) => {
      const dFcs = c.fcs + (r() * 8 - 4);
      const dPrev = c.fcsPrev + (r() * 8 - 4);
      const ipc = clamp(Math.round(c.ipc + (r() * 2 - 1)), 1, 5);
      const pop = c.pop / c.districts.length * (0.5 + r());
      return {
        code: c.code + '-' + i,
        name,
        country: c.code,
        fcs: round1(clamp(dFcs, 15, 70)),
        fcsPrev: round1(clamp(dPrev, 15, 70)),
        csi: Math.round(clamp(c.csi + (r() * 10 - 5), 3, 45)),
        ipc,
        pop: round1(pop),
        screenedK: Math.round(pop * 1000 * 0.012 * (0.6 + r()))
      };
    });
  }

  /* ----------------------------------------------------------------------
   * 6. Assemblage final : enrichit chaque pays (series, districts, totaux)
   * -------------------------------------------------------------------- */
  COUNTRIES.forEach(c => {
    c.sahel = c.zone === 'sahel';
    c.fcsM = fcsMonthly(c.code, c.fcs, c.fcsPrev, c.sahel);
    c.benef = round1(c.insec * REGION.benefM / REGION.insecM);
    c.target = round1(c.insec * REGION.targetM / REGION.insecM);
    c.screenedK = Math.round(c.pop * 1000 * 0.012 * (0.8 + hash(c.code) % 40 / 100));
    c.phases = phaseShares(c.ipc, c.code);
    const px = priceRatioSeries(c.code, c.ipc);
    c.priceIdx = round1(px.end * 100);
    c.priceM = px.series;
    c.heat = heatRatios(c.code, c.ipc);
    c.districtsData = buildDistricts(c);
  });

  // Les 16 pays forment la base regionale : moyennes et sommes utilisees par le modele
  const countryByCode = {};
  COUNTRIES.forEach(c => { countryByCode[c.code] = c; });

  // Serie mensuelle moyenne regionale (courbe "Moyenne regionale" du graphique 2)
  const regionalFcsM = [];
  for (let t = 0; t < 60; t++) {
    regionalFcsM.push(round1(COUNTRIES.reduce((s, c) => s + c.fcsM[t], 0) / COUNTRIES.length));
  }

  /* ----------------------------------------------------------------------
   * 7. Export
   * -------------------------------------------------------------------- */
  WFP.data = {
    REGION, PHASES, ZONES, PRODUCTS, CEREALS, MONTHS, MONTH_LABELS, QUARTER_LABELS,
    COUNTRIES, countryByCode, regionalFcsM,
    // Valeurs affichees telles quelles par le brief (ne pas recalculer)
    BRIEF: { ipcPaysGlobal: 9, districtsUrgence: 14, insecCrise: { start: 26, end: 41 } }
  };
  WFP.gen = { hash, rng, clamp, round1, toQuarters, fcsMonthly, priceRatioSeries, heatRatios, phaseShares };
})(window);
