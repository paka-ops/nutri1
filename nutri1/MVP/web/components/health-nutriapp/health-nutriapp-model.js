/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : health-nutriapp-model.js
 * Rôle    : Couche « modèle » — transforme les données brutes
 *           (health-nutriapp-data.js) en objet « vue » prêt à afficher,
 *           selon l'état des filtres :
 *             - mode    : 'region' (Vue Globale) | 'country' (Vue Pays)
 *             - country : code ISO du pays sélectionné (ex. 'NE')
 *           Chaque changement de filtre reconstruit la vue complète, puis
 *           les 15 graphiques + 5 KPI sont réanimés.
 *
 *  Dérivations déterministes : aucun Math.random — bruit seedé par chaîne
 *  (hash) pour un rendu strictement stable d'un rafraîchissement à l'autre.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = (global.HealthNutriApp = global.HealthNutriApp || {});
  const D = HA.DATA;

  /* ---------- Utilitaires numériques ---------- */
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  /* Bruit déterministe ∈ [-0.5 ; 0.5] */
  const noise = (seed) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x) - 0.5;
  };
  const hashStr = (s) => { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 10000); };

  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const MONTHS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  HA.MONTHS = MONTHS;

  const byCode = {};
  D.countries.forEach((c) => (byCode[c.code] = c));
  HA.byCode = byCode;

  /* Statut global selon le score composite (badges interactifs G15) */
  function statusOf(score) {
    if (score < 40) return { label: 'Critique', tone: 'danger' };
    if (score < 55) return { label: 'Alerte', tone: 'warning' };
    if (score < 70) return { label: 'Vigilance', tone: 'info' };
    return { label: 'Satisfaisant', tone: 'success' };
  }
  HA.statusOf = statusOf;

  /* Couleur de stock ATPE selon les jours restants (seuil critique 30 j) */
  function stockColor(days) {
    if (days < 30) return '#EF4444';
    if (days < 45) return '#F59E0B';
    if (days < 60) return '#06B6D4';
    return '#10B981';
  }
  HA.stockColor = stockColor;

  /* ------------------------------------------------------------------
   * Districts d'un pays : indicateurs dérivés de façon déterministe
   * autour de la base pays (les capitales s'en sortent mieux).
   * ------------------------------------------------------------------ */
  const CAPITALS = { NE: 'Niamey', ML: 'Bamako', BF: 'Centre', SN: 'Dakar', GN: 'Conakry', CI: 'Abidjan', GH: 'Accra', NG: 'Lagos', MR: 'Nouakchott-Sud', SL: 'Freetown', LR: 'Montserrado', GW: 'Bissau', GM: 'Banjul', BJ: 'Littoral', TG: 'Lomé', CV: 'Praia' };
  function districtsFor(code) {
    const c = byCode[code];
    const names = D.districts[code] || [];
    // Parts d'admissions par district (poids seedés, normalisés à 100 %)
    const weights = names.map((n) => 0.6 + Math.abs(noise(hashStr(code + n))) * 1.4 + (n === CAPITALS[code] ? 0.9 : 0));
    const wSum = weights.reduce((s, v) => s + v, 0);
    return names.map((name, i) => {
      const s = hashStr(code + ':' + name);
      const cap = name === CAPITALS[code] ? 1 : 0; // bonus capitale
      const adm = Math.max(12, Math.round(c.admissions * weights[i] / wSum));
      const recovery = clamp(Math.round(c.recovery + noise(s + 1) * 10 + cap * 4), 45, 98);
      const dropout = clamp(r1(c.dropout + noise(s + 2) * 5 - cap * 1.5), 2, 30);
      const stockDays = clamp(Math.round(c.stockDays + noise(s + 3) * 22 + cap * 8), 8, 95);
      const rupt = stockDays < 30 ? (noise(s + 4) > 0.05 ? 1 : 0) + (stockDays < 20 ? 1 : 0) : 0;
      const obesity = clamp(r1(c.obesity + noise(s + 5) * 4 + cap * 2.5), 4, 30);
      const hyper = clamp(r1(c.hyper + noise(s + 6) * 5 + cap * 1.5), 12, 42);
      const diabetes = clamp(r1(c.diabetes + noise(s + 7) * 1.8 + cap * 0.8), 2, 14);
      const aneC = clamp(Math.round(c.aneC + noise(s + 8) * 10 - cap * 5), 25, 92);
      const iron = clamp(Math.round(c.iron + noise(s + 9) * 12 + cap * 6), 15, 96);
      const sync = clamp(Math.round(c.sync + noise(s + 10) * 14 + cap * 7), 30, 99);
      const cpn = clamp(Math.round(c.cpn + noise(s + 11) * 12 + cap * 6), 12, 90);
      const score = clamp(Math.round(c.score + noise(s + 12) * 16 + cap * 6), 15, 97);
      const salt = r1(c.salt + noise(s + 13) * 1.2);
      const mas = clamp(Math.round(c.mas + noise(s + 14) * 6 - cap * 2), 5, 40);
      const mam = clamp(Math.round(c.mam + noise(s + 15) * 6 - cap * 2), 10, 45);
      const overw = clamp(Math.round(c.overw + noise(s + 16) * 5 + cap * 2), 8, 38);
      const scoreTrend = [0, 1, 2, 3, 4].map((k) => clamp(Math.round(score - (4 - k) * (2 + Math.abs(noise(s + 20 + k)) * 1.6)), 10, 99));
      return { code: code + '-' + (i + 1), name, adm, admissions: adm, recovery, dropout, stockDays, ruptures: rupt, structures: Math.max(2, Math.round(c.structures * weights[i] / wSum)), obesity, hyper, diabetes, aneC, aneW: clamp(Math.round(c.aneW + noise(s + 17) * 8 - cap * 4), 20, 85), aneP: clamp(Math.round(c.aneP + noise(s + 18) * 8 - cap * 4), 22, 88), aneA: clamp(Math.round(c.aneA + noise(s + 19) * 8 - cap * 4), 18, 80), iron, sync, cpn, cpnCov: cpn, score, salt, mas, mam, overw, scoreTrend, isCapital: !!cap };
    });
  }
  HA.districtsFor = districtsFor;

  /* ------------------------------------------------------------------
   * Séries mensuelles d'admissions (G1) pour le périmètre courant.
   * Région : séries officielles. Pays : mise à l'échelle + bruit seedé.
   * ------------------------------------------------------------------ */
  function admissionSeries(scope) {
    const R = D.regional;
    if (scope.mode === 'region') return { m2023: R.monthly2023.slice(), m2024: R.monthly2024.slice() };
    const c = byCode[scope.country];
    const share = c.admissions / R.admissions;
    const mk = (base, seedKey) => base.map((v, m) => Math.max(1, Math.round(v * share * (1 + noise(hashStr(scope.country + seedKey + m)) * 0.22))));
    return { m2023: mk(R.monthly2023, 'a3'), m2024: mk(R.monthly2024, 'a4') };
  }

  /* ------------------------------------------------------------------
   * Grille de synchro hebdomadaire 52 semaines (G7), dérivée des
   * mensuels avec creux d'hivernage et bruit de terrain réaliste.
   * ------------------------------------------------------------------ */
  function syncWeekly(scope) {
    const base = D.regional.syncMonthly;
    const lvl = scope.mode === 'region' ? D.regional.sync : byCode[scope.country].sync;
    const out = [];
    for (let w = 0; w < 52; w++) {
      const m = Math.min(11, Math.floor(w / 4.33));
      const ref = base[m];
      const v = scope.mode === 'region'
        ? ref + noise(500 + w) * 7
        : ref * (lvl / D.regional.sync) + noise(hashStr(scope.country) + w) * 9;
      out.push(clamp(Math.round(v), 25, 99));
    }
    return out;
  }

  /* ------------------------------------------------------------------
   * Canaux de dépistage 2018 → 2024 (G12) pour le périmètre courant.
   * ------------------------------------------------------------------ */
  function channelSeries(scope) {
    const R = D.regional.channels;
    if (scope.mode === 'region') return { years: R.years.slice(), cpn: R.cpn.slice(), pedi: R.pedi.slice(), pb: R.pb.slice(), auto: R.auto.slice() };
    const s = hashStr(scope.country);
    const shift = (arr, k, amp) => arr.map((v, i) => clamp(Math.round(v + noise(s + k * 31 + i) * amp + (noise(s + k) * 4)), 4, 60));
    const cpn = shift(R.cpn, 1, 5), pedi = shift(R.pedi, 2, 5), pb = shift(R.pb, 3, 6), auto = shift(R.auto, 4, 4);
    // Renormalisation à 100 % par année
    for (let i = 0; i < R.years.length; i++) {
      const t = cpn[i] + pedi[i] + pb[i] + auto[i];
      cpn[i] = r1(cpn[i] / t * 100); pedi[i] = r1(pedi[i] / t * 100); pb[i] = r1(pb[i] / t * 100); auto[i] = r1(100 - cpn[i] - pedi[i] - pb[i]);
    }
    return { years: R.years.slice(), cpn, pedi, pb, auto };
  }

  /* ------------------------------------------------------------------
   * Funnel CPN (G9) : volumes mis à l'échelle du périmètre.
   * ------------------------------------------------------------------ */
  function funnelFor(scope) {
    const R = D.regional.funnel;
    if (scope.mode === 'region') return R.map((f) => ({ ...f }));
    const c = byCode[scope.country];
    const k = c.admissions / D.regional.admissions * 3.4; // CPN ≫ CRENAS
    const s = hashStr(scope.country + 'cpn');
    const v0 = Math.max(400, Math.round(R[0].value * k));
    const screenRate = c.cpn / 100;
    const v1 = Math.round(v0 * screenRate);
    const v2 = Math.round(v1 * (0.52 + noise(s + 1) * 0.12));
    const v3 = Math.round(v2 * (0.78 + noise(s + 2) * 0.08));
    const v4 = Math.round(v3 * (0.60 + noise(s + 3) * 0.1));
    return [
      { label: R[0].label, value: v0 }, { label: R[1].label, value: v1 },
      { label: R[2].label, value: v2 }, { label: R[3].label, value: v3 }, { label: R[4].label, value: v4 }
    ];
  }

  /* ------------------------------------------------------------------
   * Treemap comorbidités (G11) : volumes mis à l'échelle + profil pays.
   * ------------------------------------------------------------------ */
  function treemapFor(scope) {
    const R = D.regional.treemap;
    if (scope.mode === 'region') return R.map((t) => ({ ...t }));
    const c = byCode[scope.country];
    const k = c.admissions / D.regional.admissions;
    const s = hashStr(scope.country + 'tm');
    return R.map((t, i) => {
      let f = 1;
      if (t.label === 'Hypertension artérielle') f = c.hyper / D.regional.hyper;
      else if (t.label === 'Diabète') f = c.diabetes / D.regional.diabetes;
      else if (t.label === 'Obésité morbide') f = c.obesity / D.regional.obesity;
      else if (t.label === 'Anémie sévère' || t.label === 'Malnutrition aiguë') f = c.aneC / D.regional.aneC;
      return { label: t.label, group: t.group, value: Math.max(60, Math.round(t.value * k * f * (1 + noise(s + i) * 0.15))) };
    });
  }

  /* ------------------------------------------------------------------
   * Dumbbell MNT 2015 vs 2024 (G8) pour le périmètre courant.
   * ------------------------------------------------------------------ */
  function dumbbellFor(scope) {
    const R = D.regional.dumbbell;
    if (scope.mode === 'region') return R.map((d) => ({ ...d }));
    const c = byCode[scope.country];
    const cur = { 'HTA liée au sel': c.hyper, 'Diabète type 2': c.diabetes, 'Obésité adulte': c.obesity };
    return R.map((d) => {
      if (d.invert) { // malnutrition chronique : amélioration
        const now = clamp(r1(c.aneC * 0.44), 15, 45);
        return { label: d.label, v2015: r1(now * 1.22), v2024: now, unit: '%', invert: true };
      }
      const now = cur[d.label];
      const ratio = d.v2024 / d.v2015;
      return { label: d.label, v2015: r1(now / ratio), v2024: now, unit: '%' };
    });
  }

  /* ------------------------------------------------------------------
   * Small multiples (G10) : 6 métriques × 12 mois, courbes lisses seedées.
   * ------------------------------------------------------------------ */
  function smallMultiples(scope) {
    const ser = admissionSeries(scope);
    const lvl = scope.mode === 'region'
      ? { rec: D.regional.recovery, ane: D.regional.aneC, obe: D.regional.obesity, syn: D.regional.sync }
      : byCode[scope.country];
    const rec = scope.mode === 'region' ? lvl.rec : lvl.recovery;
    const ane = scope.mode === 'region' ? lvl.ane : lvl.aneC;
    const obe = scope.mode === 'region' ? lvl.obe : lvl.obesity;
    const syn = scope.mode === 'region' ? lvl.syn : lvl.sync;
    const seed = scope.mode === 'region' ? 9000 : hashStr(scope.country + 'sm');
    const curve = (base, amp, trend, k) => ser.m2024.map((_, m) =>
      r1(base + Math.sin((m + k * 2.2) / 11 * Math.PI * 2) * amp + (m / 11 - 0.5) * trend + noise(seed + k * 50 + m) * amp * 0.5));
    const ruptBase = scope.mode === 'region' ? D.regional.ruptures : byCode[scope.country].ruptures;
    return [
      { label: 'Admissions CRENAS', values: ser.m2024.slice(), color: '#7C3AED', fmt: 'int' },
      { label: 'Guérison %', values: curve(rec, 2.2, 3.5, 1), color: '#10B981', fmt: 'pct' },
      { label: 'Ruptures ATPE', values: curve(Math.max(1.5, ruptBase / 6), ruptBase / 14 + 0.4, -ruptBase / 9, 2).map((v) => Math.max(0, Math.round(v))), color: '#EF4444', fmt: 'int' },
      { label: 'Anémie enfants %', values: curve(ane, 2.5, -4, 3), color: '#F59E0B', fmt: 'pct' },
      { label: 'Obésité adulte %', values: curve(obe, 0.5, 1.4, 4), color: '#A855F7', fmt: 'pct' },
      { label: 'Synchro %', values: D.regional.syncMonthly.map((v, m) => scope.mode === 'region' ? v : clamp(Math.round(v * syn / D.regional.sync + noise(seed + m) * 4), 25, 99)), color: '#06B6D4', fmt: 'pct' }
    ];
  }

  /* ------------------------------------------------------------------
   * Colonnes de la matrice de performance (G4) : 8 indicateurs clés
   * avec fonction de gravité 0 (maîtrisé) → 1 (critique).
   * ------------------------------------------------------------------ */
  const MATRIX_COLS = [
    { key: 'recovery', label: 'Guérison', sev: (v) => (92 - v) / 40, fmt: (v) => v + ' %' },
    { key: 'dropout', label: 'Abandon', sev: (v) => (v - 4) / 16, fmt: (v) => v + ' %' },
    { key: 'stockDays', label: 'Stock ATPE', sev: (v) => (70 - v) / 55, fmt: (v) => v + ' j' },
    { key: 'aneC', label: 'Anémie', sev: (v) => (v - 40) / 35, fmt: (v) => v + ' %' },
    { key: 'iron', label: 'Fer', sev: (v) => (85 - v) / 50, fmt: (v) => v + ' %' },
    { key: 'sync', label: 'Synchro', sev: (v) => (92 - v) / 50, fmt: (v) => v + ' %' },
    { key: 'cpnCov', label: 'Dépist. CPN', sev: (v) => (70 - v) / 50, fmt: (v) => v + ' %' },
    { key: 'score', label: 'Score', sev: (v) => (85 - v) / 60, fmt: (v) => v + ' pts' }
  ];
  HA.MATRIX_COLS = MATRIX_COLS;

  /* ------------------------------------------------------------------
   * Construction de la vue complète pour l'état courant.
   * ------------------------------------------------------------------ */
  function build(state) {
    const scope = { mode: state.mode, country: state.country };
    const isRegion = state.mode === 'region';
    const c = byCode[state.country];
    // Zones affichées : 16 pays (région) ou districts (pays)
    const zones = isRegion
      ? D.countries.map((x) => ({ ...x, adm: x.admissions, cpnCov: x.cpn, scoreTrend: [0, 1, 2, 3, 4].map((k) => clamp(Math.round(x.score - (4 - k) * (2 + Math.abs(noise(hashStr(x.code + k)) * 1.4))), 10, 99)) }))
      : districtsFor(state.country);

    /* ----- KPI ----- */
    const R = D.regional;
    const kpis = isRegion ? {
      admissions: R.admissions, admissionsPrev: R.admissions2023, admissionsDelta: 12.0,
      obesity: R.obesity, obesityPrev: R.obesity2023,
      hyper: R.hyper, salt: R.salt,
      ruptures: R.ruptures, structures: R.structures,
      sync: R.sync
    } : {
      admissions: c.admissions, admissionsPrev: Math.round(c.admissions / 1.12), admissionsDelta: 12.0,
      obesity: c.obesity, obesityPrev: r1(c.obesity - 2.4),
      hyper: c.hyper, salt: c.salt,
      ruptures: c.ruptures, structures: c.structures,
      sync: c.sync
    };

    /* ----- Séries ----- */
    const adm = admissionSeries(scope);
    const weekly = syncWeekly(scope);
    const channels = channelSeries(scope);
    const funnel = funnelFor(scope);
    const treemap = treemapFor(scope).sort((a, b) => b.value - a.value);
    const dumbbell = dumbbellFor(scope);
    const smalls = smallMultiples(scope);

    /* ----- Polar saisonnalité (G5) : 12 mois, 3 cycles (2022→2024) ----- */
    const polar = (() => {
      const m24 = adm.m2024, m23 = adm.m2023;
      const m22 = m23.map((v, i) => Math.max(1, Math.round(v * 0.94 * (1 + noise(700 + i) * 0.1))));
      return { m2022: m22, m2023: m23, m2024: m24 };
    })();

    /* ----- Anémie vs fer (G6) ----- */
    const anemia = isRegion
      ? { cats: ['Enfants 6-59 m', 'Femmes enceintes', 'Femmes allaitantes', 'Adolescentes'], values: [62.4, 55.8, 48.6, 45.2], iron: R.iron, ironTrend: [51.2, 53.0, 54.6, 56.1, 57.3, 58.2] }
      : { cats: ['Enfants 6-59 m', 'Femmes enceintes', 'Femmes allaitantes', 'Adolescentes'], values: [c.aneC, c.aneP, c.aneW, c.aneA], iron: c.iron, ironTrend: [0, 1, 2, 3, 4, 5].map((k) => clamp(Math.round(c.iron - (5 - k) * 1.4), 10, 98)) };

    /* ----- Double fardeau 100 % (G14) par zone ----- */
    const stackedZones = zones.map((z) => {
      const v = { mas: z.mas != null ? z.mas : 18, mam: z.mam != null ? z.mam : 27, overw: z.overw != null ? z.overw : z.obesity * 1.55, obes: z.obesity, hta: z.hyper * 0.68 };
      const t = v.mas + v.mam + v.overw + v.obes + v.hta;
      return { name: z.name, code: z.code, mas: r1(v.mas / t * 100), mam: r1(v.mam / t * 100), overw: r1(v.overw / t * 100), obes: r1(v.obes / t * 100), hta: 0 };
    });
    stackedZones.forEach((z) => { z.hta = r1(100 - z.mas - z.mam - z.overw - z.obes); });

    /* ----- Scorecard (G15) : lignes triées par score décroissant ----- */
    const rows = zones.map((z) => ({ ...z, status: statusOf(z.score) })).sort((a, b) => b.score - a.score);

    return {
      scope, isRegion, country: c,
      zonesLabel: isRegion ? '16 pays' : (D.districts[state.country] || []).length + ' districts',
      kpis, zones, rows,
      g1: { m2023: adm.m2023, m2024: adm.m2024 },
      g5: polar, g6: anemia, g7: weekly, g8: dumbbell, g9: funnel,
      g10: smalls, g11: treemap, g12: channels,
      g14: stackedZones
    };
  }

  HA.model = { build, districtsFor, MATRIX_COLS, statusOf, stockColor };
})(window);
