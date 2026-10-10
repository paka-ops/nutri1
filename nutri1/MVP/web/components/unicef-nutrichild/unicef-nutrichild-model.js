/* ============================================================================
 * UNICEF NutriChildApp · Modèle de vue
 * ----------------------------------------------------------------------------
 * Transforme l'état des filtres (mode Global / Pays, zones, pays, période,
 * sexe, métrique de croissance…) en un objet "vue" unique consommé par les
 * 5 KPI, les 15 graphiques et le tableau de synthèse.
 * Aucun DOM ici : fonctions pures, faciles à tester.
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = (global.UNICEFNutriChild = global.UNICEFNutriChild || {});
  const D = NS.DATA;
  const { clamp } = D;

  /** Formats d'affichage (français) partagés par le composant. */
  const fmt = {
    /** Milliers → "890K" ou "3.8M" au-delà d'un million. */
    k(valueK) {
      if (valueK >= 1000) return (valueK / 1000).toFixed(1) + 'M';
      return Math.round(valueK) + 'K';
    },
    /** Entier avec séparateur de milliers. */
    int(v) {
      return Math.round(v).toLocaleString('fr-FR');
    },
    /** Pourcentage à `d` décimales. */
    pct(v, d) {
      return v.toFixed(d === undefined ? 1 : d) + '%';
    },
    /** Écart signé avec signe moins typographique. */
    signed(v, d) {
      const s = Math.abs(v).toFixed(d === undefined ? 0 : d);
      return (v > 0 ? '+' : v < 0 ? '−' : '') + s;
    }
  };
  NS.fmt = fmt;

  const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);

  /**
   * Agrège des unités (pays ou districts) :
   * - moyennes pondérées par la population < 5 ans (MAS, allaitement, vitamine A, ANJE, retard, WASH) ;
   * - moyennes pondérées par les enfants dépistés (guérison, abandon, décès).
   */
  function aggregate(units) {
    const u5 = sum(units, (u) => u.u5) || 1;
    const mdk = sum(units, (u) => u.mdk) || 1;
    const wu = (fn) => sum(units, (u) => u.u5 * fn(u)) / u5;
    const wm = (fn) => sum(units, (u) => u.mdk * fn(u)) / mdk;
    return {
      key: 'agg',
      name: 'Région',
      u5,
      mdk,
      adm: sum(units, (u) => u.adm),
      mas: wu((u) => u.mas),
      allait: wu((u) => u.allait),
      vitA: wu((u) => u.vitA),
      anje: wu((u) => u.anje),
      stunt: wu((u) => u.stunt),
      wash: wu((u) => u.wash),
      guer: wm((u) => u.guer),
      abandon: wm((u) => u.abandon),
      deces: wm((u) => u.deces),
      atpe: Math.min.apply(null, units.map((u) => u.atpe)),
      anje8: D.anjeShort.map((_, i) => wu((u) => u.anje8[i])),
      guerTrend: D.months.map((_, m) => wm((u) => u.guerTrend[m])),
      masHist: D.yearsHist.map((_, i) => wu((u) => u.masHist[i]))
    };
  }

  /** Régression linéaire et coefficient de détermination R² (nuage de points). */
  function regression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
    const mx = sum(points, (p) => p.x) / n;
    const my = sum(points, (p) => p.y) / n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    points.forEach((p) => {
      sxy += (p.x - mx) * (p.y - my);
      sxx += (p.x - mx) * (p.x - mx);
      syy += (p.y - my) * (p.y - my);
    });
    const slope = sxx ? sxy / sxx : 0;
    return {
      slope,
      intercept: my - slope * mx,
      r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : 0
    };
  }

  /** Statut des stocks d'ATPE (aliments thérapeutiques prêts à l'emploi). */
  function stockStatus(months) {
    if (months < 1) return { label: 'Rupture imminente', tone: 'danger' };
    if (months < 2) return { label: 'Alerte', tone: 'tertiary' };
    return { label: 'Stock OK', tone: 'secondary' };
  }

  /** Couleur d'une bulle selon la prévalence MAS (<5 vert, 5-10 orange, >10 rouge). */
  function masColor(mas) {
    if (mas < 5) return D.brand.secondary;
    if (mas <= 10) return D.brand.tertiary;
    return D.brand.danger;
  }

  /** Répartition normalisée à 100 (arrondie, le reste est absorbé par la dernière part). */
  function normalizeTo100(values) {
    const total = sum(values, (v) => v) || 1;
    const rounded = values.map((v) => Math.round((v / total) * 100));
    const diff = 100 - sum(rounded, (v) => v);
    rounded[rounded.length - 1] += diff;
    return rounded;
  }

  /**
   * Construit la vue complète à partir de l'état.
   * @param {object} state  { mode:'global'|'country', country:'NE', zones:[], period:'monthly'|'quarterly',
   *                          sex:'F'|'M', metric:'poids'|'taille'|'pb', bullet:'guerison'|'abandon'|'deces' }
   */
  function build(state) {
    const allZoneIds = D.zones.map((z) => z.id);
    const zonesActive = state.zones && state.zones.length ? state.zones : allZoneIds;
    const allZones = zonesActive.length === allZoneIds.length;
    const isGlobal = state.mode !== 'country';
    const country = D.countryByCode(state.country);
    const countries = isGlobal ? D.countries.filter((c) => zonesActive.includes(c.zone)) : [country];
    const regional = aggregate(D.countries);
    const scope = isGlobal ? aggregate(countries) : country;
    const isFull = isGlobal && allZones;
    const rows = isGlobal ? countries : country.districts;
    const quarterly = state.period === 'quarterly';

    /** Découpe une admission annuelle en mois ou en trimestres. */
    const toPeriod = (annual) => {
      const months = D.profile.map((p) => annual * p);
      if (!quarterly) return months;
      return [0, 1, 2, 3].map((q) => months[q * 3] + months[q * 3 + 1] + months[q * 3 + 2]);
    };
    const periodLabels = quarterly ? D.quarters : D.months;
    const curIdx = quarterly ? 2 : 7; // T3 ou août
    const prevIdx = curIdx - 1;
    const curName = quarterly ? 'T3 2024' : 'août 2024';
    const prevName = quarterly ? 'T2 2024' : 'juil. 2024';

    // ---- KPI 1 : enfants MAS dépistés -------------------------------------
    const masMini = isGlobal
      ? D.zones.filter((z) => zonesActive.includes(z.id)).map((z) => ({
        label: z.label,
        value: sum(countries.filter((c) => c.zone === z.id), (c) => c.mdk),
        color: z.color
      }))
      : country.districts.map((d) => ({ label: d.name, value: d.mdk, color: d.color }));
    const masPct = Math.round((scope.mas / regional.mas - 1) * 100);
    const kpiMas = {
      value: scope.mdk,
      display: fmt.k(scope.mdk),
      sub: 'Enfants < 5 ans mesurés via l’App (PB < 115 mm) · prévalence ' + fmt.pct(scope.mas),
      badge: isGlobal
        ? { tone: 'danger', text: 'URGENCE', blink: true }
        : { tone: masPct > 0 ? 'danger' : 'ok', text: (masPct > 0 ? '+' : '−') + Math.abs(masPct) + '% vs Moyenne Régionale' },
      mini: masMini
    };

    // ---- KPI 2 : allaitement exclusif ------------------------------------
    const allaitVal = isFull ? D.ref.allait : scope.allait;
    const kpiAllait = {
      value: allaitVal,
      display: fmt.pct(allaitVal, 0),
      sub: 'Objectif OMS : 70% · Écart : ' + fmt.signed(allaitVal - D.target.allait) + ' pts',
      badge: allaitVal < 50
        ? { tone: 'danger', text: 'Niveau insuffisant (< 50%)' }
        : { tone: 'ok', text: 'Niveau en progression' },
      gauge: allaitVal
    };

    // ---- KPI 3 : taux de guérison CRENAS ---------------------------------
    const guerVal = isFull ? D.ref.guer : scope.guer;
    const last = scope.guerTrend[11];
    const guerSpark = scope.guerTrend.map((v, i) => v + (guerVal - last) * (i / 11));
    const kpiGuer = {
      value: guerVal,
      display: fmt.pct(guerVal, 1),
      sub: 'Seuil d’excellence Sphère : ≥ 75%',
      badge: guerVal >= D.target.guer
        ? { tone: 'ok', text: '✓ Conforme Norme Sphère' }
        : { tone: 'danger', text: '⚠ Sous le seuil Sphère (75%)' },
      spark: guerSpark
    };

    // ---- KPI 4 : couverture vitamine A -----------------------------------
    const vitVal = isFull ? D.ref.vitA : scope.vitA;
    const compliant = countries.filter((c) => c.vitA >= D.target.vitA).length;
    const kpiVit = {
      value: vitVal,
      display: fmt.pct(vitVal, 0),
      sub: isGlobal
        ? 'Objectif régional : 80% · ' + compliant + ' pays en conformité'
        : 'Objectif national : 80% · ' + (vitVal >= D.target.vitA ? 'conforme' : 'écart ' + fmt.signed(vitVal - D.target.vitA) + ' pts'),
      target: D.target.vitA
    };

    // ---- KPI 5 : admissions CRENAS du mois ---------------------------------
    const admSeries = toPeriod(scope.adm);
    const admCur = admSeries[curIdx];
    const admPrev = admSeries[prevIdx];
    const admVar = (admCur / admPrev - 1) * 100;
    const kpiAdm = {
      value: admCur,
      display: fmt.int(admCur),
      label: quarterly ? 'Admissions du trimestre (' + curName + ')' : 'Admissions du mois (' + curName + ')',
      badge: { tone: admVar >= 0 ? 'ok' : 'danger', text: (admVar >= 0 ? '↑ +' : '↓ −') + Math.abs(admVar).toFixed(0) + '% vs ' + prevName },
      mini: { labels: periodLabels, values: admSeries, color: D.brand.primary, highlight: curIdx }
    };

    // ---- G1 : courbes de croissance OMS et mesures terrain --------------------
    const sex = state.sex === 'M' ? 'M' : 'F';
    const metric = D.growth.metrics[state.metric] ? state.metric : 'poids';
    const pointUnits = isGlobal ? countries : country.districts;
    const growthPoints = pointUnits
      .reduce((acc, u) => acc.concat(D.samplePoints(u)), [])
      .filter((p) => p.sex === sex)
      .map((p) => {
        const value = D.growthValue(metric, sex, p.age, p.z);
        const color = p.z < -2 ? D.brand.danger : p.z < -1 ? D.brand.tertiary : D.brand.secondary;
        return { x: p.age, y: value, z: p.z, name: p.name, color };
      });
    const growth = {
      sex,
      metric,
      meta: D.growth.metrics[metric],
      curves: D.growth.percentiles.map((pc) => ({ key: pc.key, points: D.growthCurve(metric, sex, pc.z) })),
      points: growthPoints,
      emaciated: growthPoints.filter((p) => p.z < -2).length
    };

    // ---- G2 : tunnel d'accompagnement MAS ------------------------------------
    const dep = 55 * (scope.guer / regional.guer);
    const base = scope.mdk / (dep / 100);
    const stageRatios = [100, dep, dep * 42 / 55, dep * 32 / 55, dep * 26 / 55, dep * 22 / 55];
    const funnelLabels = [
      'Enfants MAS estimés',
      'Dépistés par les agents (App)',
      'Référés en centres',
      'Admis & traités enregistrés',
      'Traitement complet',
      'Guéris confirmés (App)'
    ];
    const funnel = funnelLabels.map((label, i) => ({
      label,
      pct: stageRatios[i],
      value: base * stageRatios[i] / 100
    }));

    // ---- G3 : radar ANJE -------------------------------------------------------
    const scored = countries.slice().sort((a, b) => b.anje - a.anje);
    const radarSeries = isGlobal
      ? [
        { key: 'best', label: scored[0].name + ' (meilleur score ANJE)', values: scored[0].anje8, color: D.brand.secondary },
        { key: 'worst', label: scored[scored.length - 1].name + ' (score le plus bas)', values: scored[scored.length - 1].anje8, color: D.brand.danger },
        { key: 'region', label: 'Moyenne régionale pondérée', values: scope.anje8, color: D.brand.primary, width: 2.6 }
      ]
      : [
        { key: 'country', label: country.name, values: country.anje8, color: D.brand.primary, width: 2.6 },
        { key: 'region', label: 'Moyenne régionale', values: regional.anje8, color: D.brand.secondary }
      ];
    radarSeries.push({ key: 'oms', label: 'Benchmark OMS', values: D.anjeOms, color: D.brand.muted, dash: [6, 5] });

    // ---- G4 : bullet charts CRENAS ---------------------------------------------
    const bulletDef = D.bullet[state.bullet] || D.bullet.guerison;
    const bullet = {
      key: state.bullet in D.bullet ? state.bullet : 'guerison',
      def: bulletDef,
      rows: rows.map((u) => ({ name: u.name, value: u[bulletDef.key], code: u.code }))
    };

    // ---- G5 : campagnes de supplémentation (empilé, millions d'enfants) --------
    const covScale = scope.vitA / regional.vitA;
    const stackedSeries = [
      { key: 'vitA', label: 'Vitamine A', color: D.brand.primary, values: D.campaignBase.vitA.map((c) => scope.u5 * (c * covScale) / 100 * 0.5) },
      { key: 'deparasit', label: 'Déparasitage', color: D.brand.secondary, values: D.campaignBase.deparasitage.map((c) => scope.u5 * (c * covScale) / 100 * 0.5) },
      { key: 'zinc', label: 'Zinc', color: D.brand.tertiary, values: D.campaignBase.zinc.map((c) => scope.u5 * (c * covScale) / 100 * 0.5) }
    ];

    // ---- G6 : heatmap ANJE ----------------------------------------------------
    const heatRows = isGlobal
      ? countries.map((c) => ({ name: c.name, values: c.anje8, selected: false }))
      : [{ name: country.name + ' (national)', values: country.anje8, selected: true }]
        .concat(country.districts.map((d) => ({ name: d.name, values: d.anje8, selected: false })));

    // ---- G7 : nuage WASH / retard de croissance ----------------------------------
    const scatterPoints = rows.map((u) => ({
      name: u.name,
      code: u.code,
      x: u.wash,
      y: u.stunt,
      color: isGlobal ? (D.zones.find((z) => z.id === u.zone) || {}).color : u.color
    }));
    const scatter = Object.assign({ points: scatterPoints }, regression(scatterPoints.map((p) => ({ x: p.x, y: p.y }))));

    // ---- G8 : frise des 1000 premiers jours -----------------------------------
    const timelineRows = D.timeline.rows.map((r) => ({
      label: r.label,
      from: r.from,
      to: r.to,
      value: r.source ? scope[r.source] : clamp(r.base * (scope.anje / regional.anje), 5, 99),
      color: r.color
    }));
    const impact = clamp(D.timeline.impactRegional * (scope.anje / regional.anje), 6, 26);

    // ---- G9 : cartographie des bulles MAS -------------------------------------
    const bubbleSource = isGlobal ? countries : D.countries;
    const bubbles = bubbleSource.map((c) => ({
      code: c.code,
      name: c.name,
      lon: c.lon,
      lat: c.lat,
      mas: c.mas,
      mdk: c.mdk,
      color: masColor(c.mas),
      selected: !isGlobal && c.code === country.code,
      faded: !isGlobal && c.code !== country.code
    }));

    // ---- G10 : historique MAS 2016-2024 ----------------------------------------
    const topMas = countries.slice().sort((a, b) => b.mas - a.mas).slice(0, 4);
    const history = isGlobal
      ? topMas.map((c) => ({ key: c.code, label: c.name, color: c.color, values: c.masHist }))
        .concat([{ key: 'region', label: 'Région (pondérée)', color: D.brand.navy, values: scope.masHist, width: 3 }])
      : [{ key: country.code, label: country.name, color: country.color, values: country.masHist, width: 3 }]
        .concat(country.districts.map((d) => ({ key: d.key, label: d.name, color: d.color, values: d.masHist })))
        .concat([{ key: 'region', label: 'Région (pondérée)', color: D.brand.navy, values: regional.masHist, width: 3 }]);

    // ---- G11 : déterminants (double anneau) ------------------------------------
    const directAlim = clamp(Math.round(50 + (scope.mas - regional.mas) * 1.5), 35, 70);
    const outer = [
      { label: D.drivers.direct[0], value: directAlim, color: D.brand.tertiary },
      { label: D.drivers.direct[1], value: 100 - directAlim, color: D.brand.primary }
    ];
    const underRaw = [
      36 + (scope.mas - regional.mas) * 0.8,
      22 + (100 - scope.wash) * 0.3,
      24 + (scope.stunt - regional.stunt) * 0.2,
      18 + (100 - scope.guer) * 0.8
    ].map((v) => Math.max(v, 4));
    const underVals = normalizeTo100(underRaw);
    const inner = D.drivers.underlying.map((label, i) => ({
      label,
      value: underVals[i],
      color: [D.brand.primary, D.brand.secondary, D.brand.quaternary, D.brand.sky][i]
    }));
    const donut = { outer, inner, centerValue: fmt.pct(scope.mas, 1), centerLabel: 'prévalence MAS' };

    // ---- G12 : pratiques ANJE groupées par zone (ou district) ---------------
    const practices = [
      { label: 'Mise au sein < 1 h', idx: 0, target: D.anjeOms[0] },
      { label: 'Allaitement exclusif', idx: 1, target: D.anjeOms[1] },
      { label: 'Diversité alimentaire', idx: 3, target: D.anjeOms[3] },
      { label: 'Fréquence des repas', idx: 4, target: D.anjeOms[4] },
      { label: 'Alimentation acceptable', idx: 5, target: D.anjeOms[5] }
    ];
    const groups = isGlobal
      ? D.zones.filter((z) => zonesActive.includes(z.id)).map((z) => ({
        label: z.label,
        color: z.color,
        values: aggregate(countries.filter((c) => c.zone === z.id)).anje8
      }))
      : country.districts.map((d) => ({ label: d.name, color: d.color, values: d.anje8 }));
    const grouped = {
      practices,
      groups: groups.map((g) => ({ label: g.label, color: g.color, values: practices.map((p) => g.values[p.idx]) }))
    };

    // ---- G13 : saisonnalité (rose polaire) ---------------------------------------
    const polar = {
      labels: periodLabels,
      values: admSeries,
      highlight: quarterly ? [1, 2] : [5, 6, 7, 8]
    };

    // ---- G14 : couverture 2022 vs 2024 (sucettes) -------------------------------
    const lollipop = {
      target: D.target.vitA,
      rows: rows.map((u) => ({ name: u.name, v22: u.vitA2022, v24: u.vitA }))
    };

    // ---- G15 : tableau de synthèse des centres -------------------------------
    const stockRow = (u, label) => ({
      name: label,
      code: u.code,
      adm: u.adm / 1000,
      guer: u.guer,
      abandon: u.abandon,
      deces: u.deces,
      atpe: u.atpe,
      stock: stockStatus(u.atpe),
      trend: u.guerTrend,
      national: label.indexOf('national') !== -1 || label.indexOf('Total') !== -1
    });
    const scorecard = isGlobal
      ? [stockRow(scope, 'Total régional')].concat(countries.map((c) => stockRow(c, c.name)))
      : [stockRow(country, country.name + ' (national)')].concat(country.districts.map((d) => stockRow(d, d.name)));

    return {
      mode: isGlobal ? 'global' : 'country',
      isFull,
      allZones,
      zones: zonesActive,
      countries,
      country,
      scope,
      regional,
      quarterly,
      periodName: curName,
      breadcrumb: isGlobal ? 'Afrique de l’Ouest (Vue Régionale)' : country.name,
      rowsLabel: isGlobal ? 'pays' : 'districts',
      kpi: { mas: kpiMas, allait: kpiAllait, guer: kpiGuer, vit: kpiVit, adm: kpiAdm },
      growth,
      funnel,
      radar: { axes: D.anjeShort, series: radarSeries },
      bullet,
      stacked: { years: D.campaignYears, series: stackedSeries },
      heat: { cols: D.anjeShort, objectives: D.anjeOms, rows: heatRows },
      scatter,
      timeline: { rows: timelineRows, impact, milestones: D.timeline.milestones, min: D.timeline.min, max: D.timeline.max },
      bubbles,
      history: { years: D.yearsHist, series: history, threshold: 10 },
      donut,
      grouped,
      polar,
      lollipop,
      scorecard
    };
  }

  NS.model = { build, aggregate, regression, stockStatus };
})(window);
