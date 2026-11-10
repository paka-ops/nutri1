/* ============================================================================
 * UNICEF NutriChild · Surveillance Nutritionnelle Infantile
 * Fichier : unicef-nutrichild-model.js
 * Rôle    : Modèle de données — transforme l'état des filtres
 *           (mode Régional / Pays, pays, période) en un objet « vue » complet
 *           consommé par les 5 KPI, les 15 graphiques et la scorecard.
 *
 *  Deux périmètres d'analyse :
 *    · MODE RÉGIONAL  — agrégation pondérée des 16 pays d'Afrique de l'Ouest
 *    · MODE PAYS      — décomposition par district du pays sélectionné,
 *                       toujours comparée à la moyenne régionale.
 *
 *  Pondération : les moyennes régionales sont pondérées par le nombre
 *  d'enfants dépistés via l'App (colonne `screened`) afin de refléter le
 *  volume réel d'observations terrain — c'est ce qui reproduit les agrégats
 *  institutionnels du brief (EBF 32 %, guérison 84,7 %, Vitamine A 71 %).
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = (global.NutriChild = global.NutriChild || {});
  const D = NC.DATA;

  /* -------------------------------------------------------------------------
   * Constantes institutionnelles reportées du brief (valeurs « App »)
   *  · Total régional des enfants MAS dépistés : 3,8 M
   *  · Niger : 890 k  (référence de contrôle du sélecteur pays)
   *  · Admissions CRENAS du mois en cours : 48 234
   * Les parts relatives des autres pays restent celles du jeu de données.
   * ----------------------------------------------------------------------- */
  const MAS_DETECTE = {
    NE: 890, ML: 279, BF: 155, SN: 107, NG: 1480, GH: 130, GN: 122, MR: 104,
    SL: 50, LR: 36, GW: 27, GM: 33, BJ: 51, TG: 48, CV: 2, CI: 286
  };
  const ADMISSION_MOIS_REF = 48234;   // admissions régionales du mois en cours
  const MOIS_COURANT = 8;             // Septembre (index 0 → Janvier)
  const OBJECTIFS = {
    ebf: 70, vitA: 80, recovery: 75, abandon: 10, death: 3,
    zinc: 60, deparasitage: 80, wash: 70, anje: 70
  };
  /* Libellés compacts des sous-régions (mini barres du KPI 1) */
  const REGION_SHORT = {
    'Sahel': 'Sahel', 'Sahel côtier': 'Sahel c.', 'Golfe de Guinée': 'Golfe',
    'Côtier': 'Côtier', 'Insulaire': 'Îles'
  };
  const SEUILS_MAS = [
    { max: 5, label: '< 5% — acceptable', color: '#80BD41' },
    { max: 10, label: '5–10% — alerte', color: '#F26A21' },
    { max: 15, label: '10–15% — urgence', color: '#E5243B' },
    { max: 999, label: '> 15% — urgence critique', color: '#991B1B' }
  ];

  /* Palette de séries (ordre stable pour les légendes) */
  const PALETTE = ['#1CABE2', '#80BD41', '#F26A21', '#DDA63A', '#E5243B', '#8B5CF6', '#0E7490', '#64748B'];

  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const byCode = (code) => D.countries.filter((c) => c.code === code)[0] || D.countries[0];
  const colorMAS = (v) => (SEUILS_MAS.filter((s) => v <= s.max)[0] || SEUILS_MAS[3]).color;

  /* -------------------------------------------------------------------------
   * Agrégation pondérée par les enfants dépistés
   * ----------------------------------------------------------------------- */
  function aggregate(list) {
    const w = sum(list.map((c) => c.screened)) || 1;
    const wa = (key) => sum(list.map((c) => c[key] * c.screened)) / w;
    const out = {
      count: list.length, weight: w,
      mas: wa('mas'), mam: wa('mam'), stunting: wa('stunting'), ebf: wa('ebf'),
      recovery: wa('recovery'), abandon: wa('abandon'), death: wa('death'),
      vitA: wa('vitA'), deparasitage: wa('deparasitage'), zinc: wa('zinc'),
      anemia: wa('anemia'), water: wa('water'), sanitation: wa('sanitation'),
      handwash: wa('handwash'), foodInsecurity: wa('foodInsecurity'),
      poverty: wa('poverty'), anjeScore: wa('anjeScore'), atpeStock: wa('atpeStock')
    };
    out.washScore = Math.round(out.water * 0.4 + out.sanitation * 0.35 + out.handwash * 0.25);
    out.u5 = sum(list.map((c) => c.u5));
    out.screened = sum(list.map((c) => c.screened));
    out.admissions = sum(list.map((c) => c.admissions));
    out.masCases = sum(list.map((c) => c.masCases));
    out.masDetected = sum(list.map((c) => MAS_DETECTE[c.code] || 0));
    out.anje = {};
    D.ANJE.forEach((a) => { out.anje[a.key] = sum(list.map((c) => c.anje[a.key] * c.screened)) / w; });
    return out;
  }

  /* Facteur de mise à l'échelle des admissions : calé sur l'agrégat régional
   * du brief (48 234 admissions sur le mois en cours). Il s'applique de façon
   * homogène à tous les pays afin de préserver les parts relatives. */
  let ADM_SCALE = 1;
  (function () {
    if (ADM_SCALE !== 1) return;
    let base = 0;
    D.countries.forEach((c) => { base += D.monthly[c.code].adm[MOIS_COURANT]; });
    ADM_SCALE = base ? ADMISSION_MOIS_REF / base : 1;
  })();

  /* Série mensuelle agrégée pour une liste de pays (ou un pays) */
  function monthlyFor(codes, key) {
    const out = [];
    for (let i = 0; i < 12; i++) {
      if (key === 'rec') {
        let s = 0, w = 0;
        codes.forEach((code) => { const c = byCode(code); s += D.monthly[code].rec[i] * c.screened; w += c.screened; });
        out.push(+(s / (w || 1)).toFixed(1));
      } else {
        out.push(sum(codes.map((code) => D.monthly[code][key][i])));
      }
    }
    return out;
  }
  /* Agrégation trimestrielle d'une série mensuelle */
  function toQuarters(series) {
    const out = [];
    for (let q = 0; q < 4; q++) out.push(+((series[q * 3] + series[q * 3 + 1] + series[q * 3 + 2]) / 3).toFixed(1));
    return out;
  }

  /* -------------------------------------------------------------------------
   * Références de croissance OMS — interpolation des percentiles
   * ----------------------------------------------------------------------- */
  function interp(knots, values, age) {
    if (age <= knots[0]) return values[0];
    if (age >= knots[knots.length - 1]) return values[values.length - 1];
    for (let i = 1; i < knots.length; i++) {
      if (age <= knots[i]) {
        const t = (age - knots[i - 1]) / (knots[i] - knots[i - 1]);
        return values[i - 1] + (values[i] - values[i - 1]) * t;
      }
    }
    return values[values.length - 1];
  }
  /* Valeur du percentile `pct` à l'âge `age` : valeur = M × (1 + z × CV) */
  function whoValue(measure, sex, age, z) {
    const ref = D.OMS_REF[measure][sex];
    const M = interp(D.AGE_KNOTS, ref.M, age);
    const cv = interp(D.AGE_KNOTS, ref.CV, age);
    return +(M * (1 + z * cv)).toFixed(D.OMS_REF[measure].dec);
  }

  /* Nuage de points « enfants réels mesurés sur le terrain » (déterministe).
   * La proportion de points sous la courbe P3 est pilotée par la prévalence
   * MAS du périmètre : plus le taux est élevé, plus le nuage descend. */
  function growthPoints(measure, sex, prevalence, seed, n) {
    const pts = [];
    const N = n || 260;
    for (let i = 0; i < N; i++) {
      const h1 = NC.hash(seed + '-a' + i), h2 = NC.hash(seed + '-b' + i);
      const age = Math.round((h1 % 6000) / 100);                     // 0 → 60 mois
      /* z-score moyen décalé par la prévalence (0 % → 0 ; 15 % → −1,35) */
      const shift = -(prevalence / 15) * 1.35;
      const z = shift + (((h2 % 1000) / 1000) * 2 - 1) * 1.55 + (h1 % 7) * 0.02;
      const value = whoValue(measure, sex, age, z);
      pts.push({ x: age, y: value, z: +z.toFixed(2) });
    }
    return pts;
  }

  /* -------------------------------------------------------------------------
   * RÉGRESSION LINÉAIRE — WASH vs Stunting (méthode des moindres carrés)
   * ----------------------------------------------------------------------- */
  function regression(points) {
    const n = points.length;
    if (n < 2) return { a: 0, b: 0, r2: 0 };
    const mx = sum(points.map((p) => p.x)) / n;
    const my = sum(points.map((p) => p.y)) / n;
    let sxy = 0, sxx = 0, syy = 0;
    points.forEach((p) => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) * (p.x - mx); syy += (p.y - my) * (p.y - my); });
    const a = sxx ? sxy / sxx : 0;
    const b = my - a * mx;
    const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
    return { a: a, b: b, r2: r2 };
  }

  /* =========================================================================
   * build(state) → objet vue complet
   * ========================================================================= */
  function build(state) {
    const mode = state.mode === 'country' ? 'country' : 'region';
    const country = byCode(state.code || 'NE');
    const all = D.countries;
    const region = aggregate(all);
    const isRegion = mode === 'region';

    /* Périmètre courant : liste des entités analysées (pays ou districts) */
    const districts = D.districts[country.code];
    const scope = isRegion ? all : districts;
    const local = isRegion ? region : aggregate([country]);
    const codes = isRegion ? all.map((c) => c.code) : [country.code];

    /* Scores ANJE du périmètre courant */
    const anjeKeys = D.ANJE.map((a) => a.key);
    const anjeLocal = {};
    anjeKeys.forEach((k) => {
      const total = isRegion
        ? sum(all.map((c) => c.anje[k] * c.screened)) / (region.weight || 1)
        : country.anje[k];
      anjeLocal[k] = +total.toFixed(1);
    });
    anjeLocal.ebf = local.ebf;

    /* ---------------------------------------------------------------------
     * A. Les 5 KPI (avec comparaison à la moyenne régionale en mode pays)
     * ------------------------------------------------------------------- */
    const comparative = (v, ref, invert) => {
      const d = +(v - ref).toFixed(1);
      const good = invert ? d < 0 : d > 0;
      return { delta: d, good: good, label: (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d).toFixed(1) + ' pts vs Moyenne Régionale' };
    };
    const masDetected = isRegion ? region.masDetected : (MAS_DETECTE[country.code] || 0);
    const admSeries = monthlyFor(codes, 'adm');
    const admCurrent = Math.round(admSeries[MOIS_COURANT] * ADM_SCALE);
    const admPrev = Math.round(admSeries[(MOIS_COURANT + 11) % 12] * ADM_SCALE);
    /* Sous-régions (mode régional) ou districts (mode pays) pour le KPI 1 */
    const masBreakdown = isRegion
      ? D.REGIONS.map((r) => {
          const list = all.filter((c) => c.region === r);
          if (!list.length) return null;
          return { label: r, short: REGION_SHORT[r] || r, value: sum(list.map((c) => MAS_DETECTE[c.code] || 0)) };
        }).filter(Boolean)
      : (function () {
          /* Répartition des enfants MAS dépistés du pays entre ses districts */
          const totalShare = sum(districts.map((d) => d.share)) || 1;
          const total = MAS_DETECTE[country.code] || 0;
          return districts.map((d) => ({ label: d.name, value: Math.round((total * d.share) / totalShare) }))
            .sort((a, b) => b.value - a.value).slice(0, 6);
        })();

    const kpis = {
      mas: {
        key: 'mas',
        value: masDetected,                      // milliers
        display: masDetected >= 1000 ? (masDetected / 1000).toFixed(1).replace('.', ',') + 'M' : NC.fmtInt(masDetected) + 'K',
        numeric: masDetected >= 1000 ? masDetected / 1000 : masDetected,
        decimals: masDetected >= 1000 ? 1 : 0,
        suffix: masDetected >= 1000 ? 'M' : 'K',
        color: '#E5243B',
        label: 'Malnutrition Aigüe Sévère (Dépistée)',
        sub: 'Enfants < 5 ans mesurés via l’App (PB < 115 mm)',
        badge: isRegion ? { text: 'URGENCE', tone: 'danger', blink: true }
                        : { text: comparative(local.mas, region.mas, true).label, tone: local.mas > region.mas ? 'danger' : 'ok' },
        compare: isRegion ? null : comparative(local.mas, region.mas, true),
        breakdown: masBreakdown,
        prevalence: local.mas,
        prevalenceRegion: region.mas
      },
      ebf: {
        key: 'ebf',
        value: local.ebf,
        display: Math.round(local.ebf) + '%',
        numeric: Math.round(local.ebf), decimals: 0, suffix: '%',
        color: '#F26A21',
        label: 'Allaitement Exclusif 0-6 mois',
        sub: 'Objectif OMS : 70% · Écart : ' + (Math.round(local.ebf) - 70) + ' pts',
        gap: Math.round(local.ebf) - 70,
        badge: local.ebf < 30 ? { text: 'NIVEAU INSUFFISANT', tone: 'danger' } : local.ebf < 50 ? { text: 'SOUS L’OBJECTIF', tone: 'warn' } : { text: 'PROCHE OBJECTIF', tone: 'ok' },
        compare: isRegion ? null : comparative(local.ebf, region.ebf, false),
        region: region.ebf
      },
      recovery: {
        key: 'recovery',
        value: local.recovery,
        display: local.recovery.toFixed(1).replace('.', ',') + '%',
        numeric: +local.recovery.toFixed(1), decimals: 1, suffix: '%',
        color: '#80BD41',
        label: 'Taux de Guérison (Prise en charge CRENAS)',
        sub: 'Seuil d’excellence Sphère : ≥ 75%',
        badge: local.recovery >= 75 ? { text: '✓ Conforme Norme Sphère', tone: 'ok' } : { text: '✗ Sous le seuil Sphère', tone: 'danger' },
        compare: isRegion ? null : comparative(local.recovery, region.recovery, false),
        series: monthlyFor(codes, 'rec'),
        spark: isRegion ? D.monthly.REGION.rec : D.monthly[country.code].rec,
        region: region.recovery
      },
      vitA: {
        key: 'vitA',
        value: local.vitA,
        display: Math.round(local.vitA) + '%',
        numeric: Math.round(local.vitA), decimals: 0, suffix: '%',
        color: '#1CABE2',
        label: 'Supplémentation Vitamine A (6-59 mois)',
        sub: 'Objectif régional : 80% · ' + all.filter((c) => c.vitA >= 80).length + ' pays en conformité',
        objective: 80,
        conformes: all.filter((c) => c.vitA >= 80).length,
        badge: local.vitA >= 80 ? { text: 'OBJECTIF ATTEINT', tone: 'ok' } : { text: 'OBJECTIF : 80%', tone: 'info' },
        compare: isRegion ? null : comparative(local.vitA, region.vitA, false),
        region: region.vitA
      },
      admissions: {
        key: 'admissions',
        value: admCurrent,
        display: NC.fmtInt(admCurrent),
        numeric: admCurrent, decimals: 0, suffix: '',
        color: '#1CABE2',
        label: 'Admissions Reçues dans l’App (Mois en cours)',
        sub: 'Saisies des centres Nutri · ' + D.MOIS_LONG[MOIS_COURANT] + ' 2024',
        variation: admPrev ? +(((admCurrent - admPrev) / admPrev) * 100).toFixed(1) : 0,
        series: admSeries.map((v) => Math.round(v * ADM_SCALE)),
        badge: { text: (admCurrent >= admPrev ? '↑ +' : '↓ ') + (admPrev ? Math.abs(((admCurrent - admPrev) / admPrev) * 100).toFixed(0) : 0) + '% vs mois passé', tone: admCurrent >= admPrev ? 'danger' : 'ok' },
        compare: isRegion ? null : comparative(local.admissions, region.admissions, false)
      }
    };

    /* ---------------------------------------------------------------------
     * B. Séries temporelles (mensuelles ou trimestrielles)
     * ------------------------------------------------------------------- */
    const period = state.period === 'T' ? 'T' : 'M';
    const labels = period === 'T' ? ['T1', 'T2', 'T3', 'T4'] : D.MOIS;
    const seriesOf = (key) => {
      const s = monthlyFor(codes, key);
      return period === 'T' ? toQuarters(s) : s;
    };
    const monthly = {
      period: period,
      labels: labels,
      adm: seriesOf('adm').map((v) => Math.round(v * ADM_SCALE)),
      mas: seriesOf('mas'),
      rec: seriesOf('rec'),
      dep: seriesOf('dep'),
      alert: seriesOf('alert')
    };
    /* Valeur marquée « mois en cours » (ou trimestre courant) sur les axes */
    monthly.activeIndex = period === 'T' ? Math.floor(MOIS_COURANT / 3) : MOIS_COURANT;

    /* ---------------------------------------------------------------------
     * C. G1 — Courbes de croissance OMS vs relevés terrain
     * ------------------------------------------------------------------- */
    const sex = state.sex === 'fille' ? 'fille' : 'garcon';
    const measure = ['poids', 'taille', 'muac'].indexOf(state.measure) >= 0 ? state.measure : 'taille';
    const ages = [];
    for (let a = 0; a <= 60; a++) ages.push(a);
    const percentiles = D.PCT_STYLE.map((p) => ({
      key: p.key, label: p.label, color: p.color, zone: p.zone,
      values: ages.map((a) => whoValue(measure, sex, a, D.Z[p.key]))
    }));
    const growth = {
      measure: measure, measureLabel: D.OMS_REF[measure].label, unit: D.OMS_REF[measure].unite,
      dec: D.OMS_REF[measure].dec, sex: sex, ages: ages, percentiles: percentiles,
      points: growthPoints(measure, sex, local.mas, country.code + measure + sex, isRegion ? 300 : 240),
      seuils: measure === 'muac' ? D.MUAC_SEUILS : null
    };

    /* ---------------------------------------------------------------------
     * D. G2 — Tunnel d'accompagnement MAS (dépistage → guérison)
     *    Étapes régionales calées sur le brief : 100 % → 55 % → 42 % → 32 %
     *    → 26 % → 22 %.
     * ------------------------------------------------------------------- */
    const estimes = isRegion ? 6900 : Math.round((MAS_DETECTE[country.code] || 0) / (0.42 + 0.26 * ((local.recovery - 79) / 16)));
    const funnelRatios = [1, 0.55, 0.42, 0.32, 0.26, 0.22];
    const funnelLabels = [
      ['Enfants MAS estimés', 'Modèle de prévalence régional (app + enquêtes)'],
      ['Dépistés par les relais (App)', 'Mesure du périmètre brachial saisie sur mobile'],
      ['Référés en centre Nutri', 'Transfert enregistré dans le dossier de l’enfant'],
      ['Admis & traités (CRENAS)', 'Ouverture de dossier et ATPE délivré'],
      ['Traitement complet', 'Protocole suivi jusqu’à la 8ᵉ semaine'],
      ['Guéris confirmés dans l’App', 'Statut de sortie validé par le centre']
    ];
    const funnelColors = ['#0E7490', '#1CABE2', '#38BDF8', '#80BD41', '#DDA63A', '#F26A21'];
    const funnel = {
      title: 'Tunnel d’Accompagnement MAS',
      stages: funnelLabels.map((l, i) => ({
        label: l[0], note: l[1],
        value: Math.round(estimes * funnelRatios[i]),
        pct: Math.round(funnelRatios[i] * 100),
        color: funnelColors[i]
      })),
      /* Gap de couverture : enfants jamais atteints par la cascade */
      gap: { pct: 78, value: Math.round(estimes * 0.78) },
      estimated: estimes
    };

    /* ---------------------------------------------------------------------
     * E. G3 — Radar ANJE (8 axes)
     * ------------------------------------------------------------------- */
    const radarSeries = [];
    if (isRegion) {
      /* Comparaison multi-pays : 4 pays contrastés + moyenne régionale */
      ['NE', 'NG', 'GH', 'CV'].forEach((code, i) => {
        const c = byCode(code);
        radarSeries.push({
          key: c.code, label: c.flag + ' ' + c.name, color: PALETTE[i],
          values: D.ANJE.map((a) => c.anje[a.key])
        });
      });
      radarSeries.push({
        key: 'REGION', label: 'Moyenne régionale', color: '#334155', dashed: true,
        values: D.ANJE.map((a) => +region.anje[a.key].toFixed(1))
      });
    } else {
      radarSeries.push({ key: country.code, label: country.flag + ' ' + country.name, color: '#1CABE2', values: D.ANJE.map((a) => country.anje[a.key]) });
      radarSeries.push({ key: 'REGION', label: 'Moyenne régionale', color: '#334155', dashed: true, values: D.ANJE.map((a) => +region.anje[a.key].toFixed(1)) });
      radarSeries.push({ key: 'OMS', label: 'Benchmark OMS', color: '#80BD41', dashed: true, values: D.ANJE.map((a) => a.oms) });
    }
    const radar = { axes: D.ANJE, series: radarSeries, oms: D.ANJE.map((a) => a.oms) };

    /* ---------------------------------------------------------------------
     * F. G4 — Bullet charts CRENAS par zone (3 métriques)
     * ------------------------------------------------------------------- */
    const bullets = {
      metrics: [
        { key: 'recovery', label: 'Taux de Guérison', unit: '%', target: OBJECTIFS.recovery, invert: false, objLabel: 'Seuil Sphère 75%' },
        { key: 'abandon', label: 'Taux d’Abandon', unit: '%', target: OBJECTIFS.abandon, invert: true, objLabel: 'Seuil Sphère ≤ 10%' },
        { key: 'death', label: 'Taux de Décès', unit: '%', target: OBJECTIFS.death, invert: true, objLabel: 'Seuil Sphère ≤ 3%' }
      ],
      rows: (isRegion
        ? all.map((c) => ({ label: c.flag + ' ' + c.name, recovery: c.recovery, abandon: c.abandon, death: c.death, admissions: c.admissions, color: colorMAS(c.mas) }))
        : districts.map((d) => ({ label: d.name, recovery: d.recovery, abandon: d.abandon, death: d.death, admissions: d.admissions, color: colorMAS(d.mas) }))
      ).sort((a, b) => a.recovery - b.recovery),
      region: { recovery: region.recovery, abandon: region.abandon, death: region.death }
    };

    /* ---------------------------------------------------------------------
     * G. G5 — Évolution empilée des campagnes de supplémentation
     * ------------------------------------------------------------------- */
    const campaigns = {
      years: D.campagnes.years,
      series: D.campagnes.series.map((s) => ({
        key: s.key, label: s.label, color: s.color,
        /* Les valeurs régionales sont ventilées selon le poids du périmètre */
        values: s.values.map((v) => +(v * (isRegion ? 1 : (country.screened / region.screened))).toFixed(2))
      })),
      total: D.campagnes.series.map((s) => s.values.reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0)
    };

    /* ---------------------------------------------------------------------
     * H. G6 — Heatmap matrice ANJE (pays ou districts × 8 indicateurs)
     * ------------------------------------------------------------------- */
    const heatRows = isRegion
      ? all.map((c) => ({ label: c.flag + ' ' + c.name, values: D.ANJE.map((a) => c.anje[a.key]) }))
      : districts.map((d) => ({ label: d.name, values: D.ANJE.map((a) => d.anje[a.key]) }));
    const heatmap = {
      cols: D.ANJE.map((a) => ({ key: a.key, label: a.label, short: a.short, oms: a.oms })),
      rows: heatRows,
      scopeLabel: isRegion ? 'Pays' : 'Districts de ' + country.name
    };

    /* ---------------------------------------------------------------------
     * I. G7 — Scatter WASH vs retard de croissance + régression
     * ------------------------------------------------------------------- */
    const scatterPoints = (isRegion
      ? all.map((c) => ({ x: c.washScore, y: c.stunting, r: Math.max(4, Math.sqrt(c.u5) / 12), label: c.flag + ' ' + c.name, code: c.code, mas: c.mas }))
      : districts.map((d) => ({ x: d.washScore, y: d.stunting, r: Math.max(4, Math.sqrt(d.share * 900) / 6), label: d.name, code: country.code, mas: d.mas }))
    );
    const scatter = { points: scatterPoints, regression: regression(scatterPoints.map((p) => ({ x: p.x, y: p.y }))) };

    /* ---------------------------------------------------------------------
     * J. G8 — Les 1000 premiers jours
     * ------------------------------------------------------------------- */
    const timeline1000 = {
      jalons: D.jalons,
      interventions: D.interventions.map((i) => Object.assign({}, i, {
        /* Couverture territoriale du périmètre courant */
        coverage: Math.min(98, Math.round(i.coverage * (isRegion ? 1 : country.vitA / region.vitA) * (isRegion ? 1 : 1)))
      })),
      impact: D.impact1000,
      jours: 1000
    };

    /* ---------------------------------------------------------------------
     * K. G9 — Cartographie à bulles (prévalence × volume MAS)
     * ------------------------------------------------------------------- */
    /* Positionnement géographique approximatif des 16 pays (x/y normalisés)
     * et des districts (dispersion autour du pays) — projection schématique. */
    const GEO = {
      CV: [6, 22], MR: [16, 8], SN: [18, 40], GM: [13, 47], GW: [19, 55], GN: [27, 57],
      SL: [24, 66], LR: [33, 70], ML: [38, 33], BF: [47, 46], CI: [44, 63], GH: [55, 66],
      TG: [58, 72], BJ: [62, 74], NE: [58, 20], NG: [72, 62]
    };
    const bubbles = (isRegion
      ? all.map((c) => ({
          code: c.code, label: c.flag + ' ' + c.name, x: (GEO[c.code] || [50, 50])[0], y: (GEO[c.code] || [50, 50])[1],
          mas: c.mas, cases: MAS_DETECTE[c.code] || 0, u5: c.u5, color: colorMAS(c.mas)
        }))
      : districts.map((d, i) => {
          const g = GEO[country.code] || [50, 50];
          const ang = (i / districts.length) * Math.PI * 2;
          return {
            code: country.code + i, label: d.name,
            x: g[0] + Math.cos(ang) * 5.5, y: g[1] + Math.sin(ang) * 5.5,
            mas: d.mas, cases: Math.round(d.share * 100), u5: d.share * country.u5, color: colorMAS(d.mas)
          };
        })
    );
    const bubbleView = { points: bubbles, scopeLabel: isRegion ? 'Afrique de l’Ouest' : country.name };

    /* ---------------------------------------------------------------------
     * L. G10 — Évolution historique de la MAS 2016-2024
     * ------------------------------------------------------------------- */
    let historySeries;
    if (isRegion) {
      const picked = state.trendPays && state.trendPays.length ? state.trendPays : ['NE', 'NG', 'ML', 'SN'];
      historySeries = picked.map((code, i) => {
        const c = byCode(code);
        return { key: c.code, label: c.flag + ' ' + c.name, color: PALETTE[i % PALETTE.length], values: D.history[c.code] };
      });
      historySeries.push({ key: 'REGION', label: 'Moyenne régionale', color: '#334155', dashed: true, values: D.history.REGION });
    } else {
      historySeries = [
        { key: country.code, label: country.flag + ' ' + country.name, color: '#1CABE2', values: D.history[country.code] },
        { key: 'REGION', label: 'Moyenne régionale', color: '#334155', dashed: true, values: D.history.REGION }
      ];
    }
    const history = {
      years: D.HIST_YEARS, series: historySeries,
      alert: 10, severe: 15,
      soudure: [2020, 2021]
    };

    /* ---------------------------------------------------------------------
     * M. G11 — Donut double anneau des déterminants
     * ------------------------------------------------------------------- */
    const determinants = {
      interne: D.determinants.interne,
      externe: D.determinants.externe,
      /* En mode pays, on redistribue légèrement selon l'insécurité alimentaire */
      ajuste: isRegion ? null : Math.round((local.foodInsecurity - region.foodInsecurity) * 2) / 10
    };

    /* ---------------------------------------------------------------------
     * N. G12 — Barres groupées : 5 pratiques ANJE par zone
     * ------------------------------------------------------------------- */
    const praticas5 = D.ANJE.filter((a) => ['early', 'ebf', 'mdd', 'mmf', 'cont'].indexOf(a.key) >= 0);
    let groupedBars;
    if (isRegion) {
      groupedBars = {
        groups: D.REGIONS.map((r) => {
          const list = all.filter((c) => c.region === r);
          if (!list.length) return null;
          const w = sum(list.map((c) => c.screened)) || 1;
          return { label: r, color: PALETTE[D.REGIONS.indexOf(r) % PALETTE.length], values: praticas5.map((a) => sum(list.map((c) => c.anje[a.key] * c.screened)) / w) };
        }).filter(Boolean)
      };
    } else {
      groupedBars = {
        groups: districts.slice(0, 5).map((d, i) => ({
          label: d.name, color: PALETTE[i % PALETTE.length],
          values: praticas5.map((a) => d.anje[a.key])
        }))
      };
    }
    groupedBars.axes = praticas5;
    const grouped = groupedBars;

    /* ---------------------------------------------------------------------
     * O. G13 — Polar chart : saisonnalité des admissions (soudure)
     * ------------------------------------------------------------------- */
    const admRaw = monthlyFor(codes, 'adm').map((v) => Math.round(v * ADM_SCALE));
    const polar = {
      labels: D.MOIS,
      values: admRaw,
      soudure: D.SOUDURE,
      max: Math.max.apply(null, admRaw),
      total: sum(admRaw),
      peakMonth: admRaw.indexOf(Math.max.apply(null, admRaw))
    };

    /* ---------------------------------------------------------------------
     * P. G14 — Lollipop : couverture des programmes 2022 vs 2024
     * ------------------------------------------------------------------- */
    const lolliRows = isRegion
      ? D.REGIONS.map((r) => {
          const list = all.filter((c) => c.region === r);
          if (!list.length) return null;
          const w = sum(list.map((c) => c.screened)) || 1;
          const now = sum(list.map((c) => c.vitA * c.screened)) / w;
          /* Couverture 2022 reconstituée : progression propre à chaque zone */
          const gap2022 = 6 + (NC.factor('lolli' + r, 0, 0.55)) * 8;
          return { label: r, v2022: +(now - gap2022).toFixed(1), v2024: +now.toFixed(1) };
        }).filter(Boolean)
      : districts.slice(0, 9).map((d) => ({
          label: d.name,
          v2022: +(d.vitA - (6 + NC.factor('lolli' + d.name, 0, 0.55) * 8)).toFixed(1),
          v2024: +d.vitA.toFixed(1)
        }));
    const lollipop = { rows: lolliRows, objective: OBJECTIFS.vitA, metric: 'Couverture Vitamine A' };

    /* ---------------------------------------------------------------------
     * Q. G15 — Scorecard des centres Nutri / CRENAS
     * ------------------------------------------------------------------- */
    const scorecard = (isRegion
      ? all.map((c) => ({
          label: c.flag + ' ' + c.name, code: c.code, admissions: c.admissions,
          recovery: c.recovery, abandon: c.abandon, death: c.death,
          atpe: c.atpeStock, anje: c.anjeScore, mas: c.mas,
          trend: D.history[c.code][8] - D.history[c.code][7],
          detected: MAS_DETECTE[c.code] || 0,
          spark: D.monthly[c.code].adm.map((v) => Math.round(v * ADM_SCALE))
        }))
      : districts.map((d) => ({
          label: d.name, code: country.code, admissions: d.admissions,
          recovery: d.recovery, abandon: d.abandon, death: d.death,
          atpe: d.atpeStock, anje: d.anjeScore, mas: d.mas,
          trend: +(d.recovery - country.recovery).toFixed(1),
          detected: Math.round(((MAS_DETECTE[country.code] || 0) * d.share) / (sum(districts.map((x) => x.share)) || 1)),
          spark: D.monthly[country.code].adm.map((v) => Math.round(v * ADM_SCALE * d.share / 1.4))
        }))
    );
    const scorecardTotals = {
      admissions: sum(scorecard.map((r) => r.admissions)),
      recovery: isRegion ? region.recovery : local.recovery,
      abandon: isRegion ? region.abandon : local.abandon,
      death: isRegion ? region.death : local.death,
      atpe: isRegion ? region.atpeStock : local.atpeStock,
      anje: isRegion ? region.anjeScore : local.anjeScore,
      mas: isRegion ? region.mas : local.mas
    };

    /* ---------------------------------------------------------------------
     * R. Index — classement des pays selon l'indicateur actif
     * ------------------------------------------------------------------- */
    const ranking = all.map((c) => ({
      code: c.code, label: c.flag + ' ' + c.name, name: c.name,
      mas: c.mas, ebf: c.ebf, recovery: c.recovery, vitA: c.vitA, stunting: c.stunting,
      anje: c.anjeScore, deaths: c.death, cases: MAS_DETECTE[c.code] || 0, u5: c.u5,
      color: colorMAS(c.mas)
    })).sort((a, b) => b.mas - a.mas);

    /* ---------------------------------------------------------------------
     * S. Objet vue final
     * ------------------------------------------------------------------- */
    return {
      mode: mode, isRegion: isRegion, period: period,
      country: country, scopeLabel: isRegion ? 'Afrique de l’Ouest (Vue Globale)' : country.name,
      scopeName: isRegion ? 'Afrique de l’Ouest' : country.name,
      crumb: isRegion ? 'Mode : Régional' : country.flag + ' ' + country.name,
      subtitle: isRegion
        ? 'Afrique de l’Ouest · ' + D.countries.length + ' pays · Données App Mobile 2024'
        : country.flag + ' · ' + districts.length + ' districts · ' + country.capitale + ' · Données App Mobile 2024',
      year: state.year || D.meta.annee,
      local: local, region: region, aggregate: local,
      codes: codes, districts: isRegion ? null : districts,
      kpis: kpis, monthly: monthly,
      growth: growth, funnel: funnel, radar: radar, bullets: bullets, campaigns: campaigns,
      heatmap: heatmap, scatter: scatter, timeline1000: timeline1000, bubbles: bubbleView,
      history: history, determinants: determinants, grouped: grouped, polar: polar,
      lollipop: lollipop, scorecard: scorecard, scorecardTotals: scorecardTotals,
      ranking: ranking, syncLog: D.syncLog, alertes: D.alertes,
      meta: D.meta, moisCourant: MOIS_COURANT, moisLabel: D.MOIS_LONG[MOIS_COURANT],
      objectifs: OBJECTIFS, seuilsMAS: SEUILS_MAS, palette: PALETTE
    };
  }

  NC.model = {
    build: build, byCode: byCode, aggregate: aggregate, regression: regression,
    whoValue: whoValue, colorMAS: colorMAS, PALETTE: PALETTE, OBJECTIFS: OBJECTIFS,
    SEUILS_MAS: SEUILS_MAS, MOIS_COURANT: MOIS_COURANT,
    MOIS: D.MOIS, MOIS_LONG: D.MOIS_LONG, ANJE: D.ANJE, GEO: null
  };
})(window);
