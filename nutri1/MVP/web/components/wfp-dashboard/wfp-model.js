/* ============================================================================
 * WFP NutriTracker · wfp-model.js
 * Modele de vue : transforme l'etat des filtres en donnees pretes a dessiner.
 *
 *   state = { mode: 'region' | 'country', country: 'NE', zone: 'all' | 'sahel' |
 *             'golfe' | 'cotiere', period: 'M' | 'T' }
 *
 *  - mode 'region'  : Vue Globale Afrique de l'Ouest (eventuellement filtree par zone)
 *                     -> entites = pays ;
 *  - mode 'country' : Vue Detaillee -> entites = districts/regions du pays, avec
 *                     comparaison a la moyenne regionale.
 *
 * build(state) renvoie { kpi, charts: {...}, meta } ; chaque sous-objet est
 * consomme par un graphique (charts/*.js) ou par wfp-kpi (dans wfp-dashboard.js).
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP = global.WFP || {};
  const D = WFP.data, G = WFP.gen, R = D.REGION;
  const round1 = G.round1;

  // Phares du graphique 2 (vue globale) et couleurs de series
  const PHARES = ['NE', 'ML', 'NG', 'SN', 'GH', 'CI'];
  const SERIES_COLORS = ['#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#3B82F6', '#EC4899'];
  const CRITERIA = ['Réduction portions', 'Repas réduits / jour', 'Emprunts nourriture', 'Vente d\'actifs', 'Enfants sans repas'];
  const CSI_WEIGHTS = [1.1, 0.9, 0.7, 0.5, 0.35];

  // Entite "normalisee" : memes champs qu'il s'agisse d'un pays ou d'un district
  function entityFromCountry(c) {
    return {
      key: c.code, label: c.code, name: c.name, zone: c.zone, zoneLabel: D.ZONES[c.zone].label,
      fcs: c.fcs, fcsPrev: c.fcsPrev, csi: c.csi, ipc: c.ipc, insec: c.insec, pop: c.pop,
      benef: c.benef, target: c.target, screenedK: c.screenedK, phases: c.phases,
      fcsM: c.fcsM, priceM: c.priceM, priceIdx: c.priceIdx, heat: c.heat, sahel: c.sahel
    };
  }
  // Un district herite du pays : series et repartition derivees de facon deterministe
  function entityFromDistrict(d, c) {
    const pop = d.pop;
    return {
      key: d.code, label: d.name, name: d.name, zone: c.zone, zoneLabel: c.name,
      fcs: d.fcs, fcsPrev: d.fcsPrev, csi: d.csi, ipc: d.ipc,
      insec: round1(c.insec * pop / c.pop), pop, benef: round1(c.benef * pop / c.pop),
      target: round1(c.target * pop / c.pop), screenedK: d.screenedK,
      phases: G.phaseShares(d.ipc, d.code), fcsM: G.fcsMonthly(d.code, d.fcs, d.fcsPrev, c.sahel),
      priceM: G.priceRatioSeries(d.code, d.ipc).series, priceIdx: round1(G.priceRatioSeries(d.code, d.ipc).end * 100),
      heat: G.heatRatios(d.code, d.ipc), sahel: c.sahel
    };
  }

  const mean = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);

  /* ----------------------------------------------------------------------
   * Construction d'une vue complete
   * -------------------------------------------------------------------- */
  function build(state) {
    const isCountry = state.mode === 'country';
    const country = isCountry ? D.countryByCode[state.country] || D.COUNTRIES[0] : null;
    const scopeCountries = isCountry ? [country] : D.COUNTRIES.filter(c => state.zone === 'all' || c.zone === state.zone);
    const scope = scopeCountries.map(entityFromCountry);
    // Entites affichees par les graphiques "par entite" : pays (region) ou districts (pays)
    const ents = isCountry
      ? country.districtsData.map(d => entityFromDistrict(d, country))
      : scope;
    const quarterly = state.period === 'T';
    const isAll = !isCountry && state.zone === 'all';

    /* ---------- Agregats de l'etendue ---------- */
    const scopeInsec = scopeCountries.reduce((s, c) => s + c.insec, 0);
    const scopeBenef = scopeCountries.reduce((s, c) => s + c.benef, 0);
    const scopeTarget = scopeCountries.reduce((s, c) => s + c.target, 0);
    const scopeFcs = isAll ? R.fcs : mean(scopeCountries.map(c => c.fcs));
    const scopeCsi = mean(scope.map(e => e.csi));
    const regionCsi = mean(D.COUNTRIES.map(c => c.csi)); // moyenne des 16 pays (comparaison mode Pays)
    const scopeIpc3 = scopeCountries.filter(c => c.ipc >= 3).length;
    const scopeIdx = isAll ? R.priceIdx : mean(scope.map(e => e.priceIdx));
    const regionAvgInsec = R.insecM / D.COUNTRIES.length;

    /* ---------- KPI 1 : insecurite alimentaire ---------- */
    const kpi1Spark = []; // activite mensuelle des collecteurs (12 mois, base deterministe)
    {
      const r = G.rng(G.hash('act:' + state.mode + state.zone + state.country));
      for (let m = 0; m < 12; m++) kpi1Spark.push(round1(scopeInsec * (0.75 + 0.5 * r()) * (0.9 + 0.2 * Math.sin(m / 1.9))));
    }
    const kpi = {
      insec: isCountry
        ? { value: country.insec, unit: 'M', badge: '+' + Math.round((country.insec / regionAvgInsec - 1) * 100) + '% vs Moyenne Régionale', badgeKind: 'up', spark: kpi1Spark }
        : isAll
          ? { value: R.insecM, unit: 'M', badge: '↑ +2.3M vs T3 2023', badgeKind: 'up', spark: kpi1Spark }
          : { value: round1(scopeInsec), unit: 'M', badge: Math.round(scopeInsec / R.insecM * 100) + '% du total régional', badgeKind: 'info', spark: kpi1Spark },
      fcs: {
        value: isCountry ? country.fcs : scopeFcs,
        regional: R.fcs,
        badge: isCountry
          ? (country.fcs - R.fcs >= 0 ? '+' : '') + round1(country.fcs - R.fcs) + ' pts vs moyenne régionale'
          : isAll ? 'Moyenne régionale PAM' : 'Moyenne de la zone'
      },
      zones: isCountry
        ? { value: ents.filter(e => e.ipc >= 3).length, unit: 'districts', label: 'districts en phase IPC 3+ (urgence)',
            tiles: ents.map(e => ({ name: e.name, ipc: e.ipc })) }
        : { value: isAll ? D.BRIEF.ipcPaysGlobal : scopeIpc3, unit: 'pays', label: 'pays en phase IPC 3+ (alerte app)',
            tiles: scope.map(e => ({ name: e.label, ipc: e.ipc })) },
      benef: isCountry
        ? { value: country.benef, target: country.target }
        : { value: isAll ? R.benefM : round1(scopeBenef), target: isAll ? R.targetM : round1(scopeTarget) },
      price: {
        value: isCountry ? country.priceIdx : scopeIdx,
        trend: round1((isCountry ? country.priceIdx : scopeIdx) - 100),
        spark: (function () {
          const out = [];
          for (let t = 48; t < 60; t++) out.push(round1(mean(scope.map(e => e.priceM[t])) * 100));
          return out;
        })()
      }
    };

    /* ---------- Graphique 1 : phases IPC (empilees) ---------- */
    const ipc = {
      labels: ents.map(e => e.label),
      names: ents.map(e => e.name),
      zones: ents.map(e => e.zoneLabel),
      phases: ents.map(e => e.phases),
      screened: ents.map(e => e.screenedK),
      pop: ents.map(e => e.pop)
    };

    /* ---------- Graphique 2 : evolution FCS (multi-lignes) ---------- */
    const pick = t => (quarterly ? G.toQuarters(t) : t);
    const fcsLines = (function () {
      const crisis = quarterly ? { from: 8, to: 13 } : { from: 26, to: 41 };
      if (isCountry) {
        const regional = D.regionalFcsM;
        const districts = [...ents].sort((a, b) => b.ipc - a.ipc || a.fcs - b.fcs).slice(0, 3);
        const series = [
          { key: 'pays', label: country.name, color: WFP.C.primary, values: pick(country.fcsM), width: 3 },
          { key: 'region', label: 'Moyenne régionale', color: '#64748B', values: pick(regional), width: 2, dash: [6, 5] }
        ];
        districts.forEach((d, i) => series.push({ key: 'd' + i, label: d.name, color: ['#10B981', '#8B5CF6', '#3B82F6'][i], values: pick(d.fcsM), width: 1.6 }));
        return { labels: quarterly ? D.QUARTER_LABELS : D.MONTH_LABELS, series, threshold: 42, crisis };
      }
      const series = PHARES.map((code, i) => {
        const c = D.countryByCode[code];
        return { key: code, label: c.name, color: SERIES_COLORS[i], values: pick(c.fcsM), width: 2 };
      });
      return { labels: quarterly ? D.QUARTER_LABELS : D.MONTH_LABELS, series, threshold: 42, crisis };
    })();

    /* ---------- Graphique 3 : heatmap prix (8 produits x 24 mois) ---------- */
    const heat = (function () {
      const rows = D.PRODUCTS.map(p => p.label);
      const cols = [];
      for (let y = 2023; y <= 2024; y++) for (let m = 0; m < 12; m++) cols.push(D.MONTHS[m] + ' ' + String(y).slice(2));
      const values = D.PRODUCTS.map((p, i) => cols.map((_, c) => Math.round(mean(scope.map(e => e.heat[i][c])) * 100) / 100));
      const prices = values.map((row, i) => row.map(v => Math.round(D.PRODUCTS[i].normal * v)));
      return { rows, cols, values, prices, normal: D.PRODUCTS.map(p => p.normal) };
    })();

    /* ---------- Graphique 4 : radar CSI ---------- */
    const radar = (function () {
      const axes = CRITERIA;
      const vals = (csi, key) => {
        const r = G.rng(G.hash('csi:' + key));
        return CSI_WEIGHTS.map(w => Math.round(G.clamp(csi * w * 2.1 * (0.92 + r() * 0.16), 0, 100)));
      };
      if (isCountry) {
        return {
          axes,
          series: [
            { key: 'pays', label: country.name, color: WFP.C.primary, values: vals(country.csi, country.code) },
            { key: 'region', label: 'Moyenne régionale', color: '#8B5CF6', values: vals(regionCsi, 'region' + country.code) },
            { key: 'cible', label: 'Cible PAM', color: '#10B981', values: vals(12, 'cible'), dash: [5, 4] }
          ]
        };
      }
      const top = [...scope].sort((a, b) => b.csi - a.csi).slice(0, 4);
      return {
        axes,
        series: top.map((e, i) => ({ key: e.key, label: e.name, color: SERIES_COLORS[i], values: vals(e.csi, e.key) }))
      };
    })();

    /* ---------- Graphique 5 : nuage prix mil / malnutrition aigue ---------- */
    const scatter = (function () {
      const pts = [];
      const per = Math.max(1, Math.ceil(48 / ents.length));
      ents.forEach(e => {
        const r = G.rng(G.hash('sc:' + e.key));
        for (let i = 0; i < per && pts.length < 48; i++) {
          const x = Math.round(230 * (e.priceIdx / 100) * (0.9 + r() * 0.2));
          const y = G.clamp(3.2 + (x - 190) * 0.05 + (e.ipc - 2) * 0.8 + (r() - 0.5) * 2.4, 1, 20);
          pts.push({ x, y: round1(y), label: e.label, zone: e.zoneLabel });
        }
      });
      // Regression lineaire des moindres carres
      const n = pts.length, mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y));
      let sxy = 0, sxx = 0, syy = 0;
      pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
      const slope = sxy / sxx, intercept = my - slope * mx;
      const r2 = (sxy * sxy) / (sxx * syy);
      return { points: pts, slope, intercept, r2: round1(r2 * 100) / 100, n, xr: [Math.min(...pts.map(p => p.x)) - 10, Math.max(...pts.map(p => p.x)) + 10], yr: [0, Math.max(...pts.map(p => p.y)) + 2] };
    })();

    /* ---------- Graphique 6 : entonnoir logistique ---------- */
    const scale6 = isCountry ? scopeBenef / R.benefM : (isAll ? 1 : scopeBenef / R.benefM);
    const funnel = {
      stages: [
        { label: 'Bénéficiaires ciblés', value: round1(18.2 * scale6) },
        { label: 'Enregistrés dans l\'app', value: round1(15.1 * scale6) },
        { label: 'Plan de ravitaillement', value: round1(14.2 * scale6) },
        { label: 'Approvisionnés', value: round1(13.4 * scale6) },
        { label: 'Distribués (scannés)', value: round1(12.4 * scale6) },
        { label: 'Confirmés reçus', value: round1(11.8 * scale6) }
      ],
      unit: 'M'
    };

    /* ---------- Graphique 7 : saisonnalite des alertes (rose) ---------- */
    const rose = (function () {
      const values = new Array(12).fill(0);
      scope.forEach(e => {
        const r = G.rng(G.hash('rose:' + e.key));
        const base = 18 + e.insec * 7;
        for (let m = 0; m < 12; m++) {
          const soud = (m >= 5 && m <= 8) ? 1 : 0;
          const peak = Math.exp(-Math.pow(m - 7, 2) / 9);
          values[m] += base * (0.55 + 0.35 * peak + 0.55 * soud) * (0.9 + 0.2 * r());
        }
      });
      return { labels: D.MONTHS.slice(), values: values.map(v => Math.round(v)), soudure: [5, 6, 7, 8] };
    })();

    /* ---------- Graphique 8 : carte IPC ---------- */
    // Les 16 pays sont toujours fournis (fond de carte) ; en mode Pays, le pays est zoome
    const map = {
      mode: isCountry ? 'country' : 'region',
      code: isCountry ? country.code : null,
      name: isCountry ? country.name : null,
      countries: D.COUNTRIES.map(c => ({ code: c.code, name: c.name, ipc: c.ipc, fcs: c.fcs, csi: c.csi, insec: c.insec, inScope: scopeCountries.includes(c) })),
      districts: isCountry ? ents.map(e => ({ name: e.name, ipc: e.ipc, fcs: e.fcs, csi: e.csi, insec: e.insec })) : []
    };

    /* ---------- Graphique 9 : cinq cereales (aires degradees) ---------- */
    const cereals = (function () {
      const labels = quarterly ? D.QUARTER_LABELS : D.MONTH_LABELS;
      const series = D.CEREALS.map(cer => {
        const values = [];
        for (let t = 0; t < 60; t++) {
          const ratio = mean(scope.map(e => e.priceM[t]));
          values.push(Math.round(cer.base * ratio * (1 + (cer.rise - 1.27) * (t / 59))));
        }
        return { key: cer.key, label: cer.label, color: cer.color, values: quarterly ? G.toQuarters(values).map(Math.round) : values };
      });
      return { labels, series, unit: 'FCFA/kg' };
    })();

    /* ---------- Graphique 10 : disponibilite vs acces (double barres) ---------- */
    const dual = {
      labels: ents.map(e => e.label),
      names: ents.map(e => e.name),
      avail: ents.map(e => {
        const r = G.rng(G.hash('kcal:' + e.key));
        const kcal = G.clamp(1900 + (e.fcs - 25) * 22 + (r() - 0.5) * 160, 1700, 2800);
        return { kcal: Math.round(kcal), pct: round1(kcal / 2100 * 100) };
      }),
      access: ents.map(e => {
        const r = G.rng(G.hash('acc:' + e.key));
        return round1(G.clamp(30 + (e.fcs - 20) * 1.2 + (r() - 0.5) * 8, 30, 95));
      })
    };
    dual.avail = dual.avail.map((a, i) => Object.assign(a, { access: dual.access[i] }));

    /* ---------- Graphique 11 : distribution HDDS (0 a 12) ---------- */
    const hdds = (function () {
      const counts = new Array(13).fill(0);
      const N = 900;
      ents.forEach(e => {
        const mu = 3.2 + (e.fcs - 20) * 0.16;
        const w = [];
        for (let k = 0; k <= 12; k++) w.push(Math.exp(-Math.pow(k - mu, 2) / (2 * 1.9 * 1.9)));
        const s = w.reduce((a, b) => a + b, 0);
        for (let k = 0; k <= 12; k++) counts[k] += Math.round(N * w[k] / s);
      });
      const total = counts.reduce((a, b) => a + b, 0);
      const meanHdds = counts.reduce((s, c, k) => s + c * k, 0) / total;
      const density = counts.map(c => c / total);
      // Courbe de densite lissee (noyau gaussien) pour la courbe de distribution
      const curve = [];
      for (let x = 0; x <= 12; x += 0.25) {
        let v = 0;
        density.forEach((d, k) => { v += d * Math.exp(-Math.pow(x - k, 2) / (2 * 0.7 * 0.7)); });
        curve.push([x, v / (0.7 * Math.sqrt(2 * Math.PI))]);
      }
      return { bins: [...Array(13).keys()], counts, density, curve, mean: round1(meanHdds), total };
    })();

    /* ---------- Graphique 12 : dumbbell FCS 2020 vs 2024 ---------- */
    const dumbbell = {
      rows: ents.map(e => ({
        key: e.key, label: e.label, name: e.name,
        a: round1(mean(e.fcsM.slice(0, 12))),
        b: round1(mean(e.fcsM.slice(48, 60)))
      }))
    };

    /* ---------- Graphique 13 : matrice calendaire des alertes ---------- */
    const calendar = (function () {
      const rows = ents.map(e => e.label);
      const values = ents.map(e => {
        const r = G.rng(G.hash('cal:' + e.key));
        return D.MONTHS.map((_, m) => {
          const soud = (m >= 5 && m <= 8) ? 1 : 0;
          return Math.round(G.clamp(e.ipc * 1.6 + soud * (e.ipc + 1) * 1.4 + r() * 3, 0, 20));
        });
      });
      return { rows, cols: D.MONTHS.slice(), values, names: ents.map(e => e.name) };
    })();

    /* ---------- Graphique 14 : cascade financiere ---------- */
    const share = isCountry ? country.insec / R.insecM : scopeInsec / R.insecM;
    const r2d = v => Math.round(v * 100) / 100; // precision 0,01 Mds $ (utile en vue Pays)
    const waterfall = {
      steps: [
        { label: 'Budget requis', kind: 'total', from: 0, to: r2d(2.8 * share), value: r2d(2.8 * share), color: WFP.C.primary },
        { label: 'Gap de financement', kind: 'delta', from: r2d(2.8 * share), to: r2d(2.1 * share), value: r2d(-0.7 * share), color: WFP.C.urgent },
        { label: 'Budget disponible', kind: 'total', from: 0, to: r2d(2.1 * share), value: r2d(2.1 * share), color: WFP.C.available }
      ],
      contributions: r2d(2.1 * share),
      unit: 'Mds $'
    };

    /* ---------- Graphique 15 : bullet charts (8 indicateurs) ---------- */
    const bullets = (function () {
      const avgOf = fn => mean(scope.map(fn));
      const lowerBetter = { csi: true, delai: true, prix: true };
      const items = [
        { key: 'fcs', label: 'FCS moyen', value: isCountry ? country.fcs : scopeFcs, target: 50, max: 70, unit: '' },
        { key: 'csi', label: 'CSI moyen (plus bas = mieux)', value: isCountry ? country.csi : round1(scopeCsi), target: 15, max: 40, unit: '', inverse: true },
        { key: 'couv', label: 'Taux de couverture', value: round1(isCountry ? country.benef / country.target * 67 : (isAll ? 67 : scopeBenef / scopeTarget * 67)), target: 80, max: 100, unit: '%' },
        { key: 'stock', label: 'Stocks de sécurité (jours)', value: round1(isCountry ? 18 + (country.fcs - 25) * 0.9 : avgOf(e => 18 + (e.fcs - 25) * 0.9)), target: 60, max: 90, unit: ' j' },
        { key: 'delai', label: 'Délai d\'approvisionnement (jours)', value: round1(isCountry ? 12 + country.ipc * 2.4 : avgOf(e => 12 + e.ipc * 2.4)), target: 14, max: 35, unit: ' j', inverse: true },
        { key: 'joints', label: 'Ménages joints à l\'app', value: round1(isCountry ? 60 + country.fcs * 0.5 : avgOf(e => 60 + e.fcs * 0.5)), target: 90, max: 100, unit: '%' },
        { key: 'rapport', label: 'Taux de rapportage terrain', value: round1(isCountry ? 90 - (country.ipc - 1) * 1.5 : avgOf(e => 90 - (e.ipc - 1) * 1.5)), target: 95, max: 100, unit: '%' },
        { key: 'prix', label: 'Index prix céréales (base 100)', value: round1(scopeIdx), target: 100, max: 150, unit: '', inverse: true }
      ];
      items.forEach(it => {
        it.inverse = !!(it.inverse || lowerBetter[it.key]);
        it.value = round1(it.value);
      });
      return items;
    })();

    /* ---------- Meta : fil d'Ariane et libelles ---------- */
    const meta = {
      mode: state.mode,
      scopeLabel: isCountry ? country.name : (state.zone === 'all' ? 'Afrique de l\'Ouest' : D.ZONES[state.zone].label),
      breadcrumb: isCountry ? country.name : 'Régional',
      countries: scopeCountries.map(c => c.code),
      entityLabel: isCountry ? 'Districts' : 'Pays',
      quarterly,
      ents: ents.map(e => ({ key: e.key, name: e.name, label: e.label })),
      country: isCountry ? { code: country.code, name: country.name, zone: D.ZONES[country.zone].label, insec: country.insec } : null
    };

    return {
      meta, kpi,
      charts: { ipc, fcsLines, heat, radar, scatter, funnel, rose, map, cereals, dual, hdds, dumbbell, calendar, waterfall, bullets }
    };
  }

  WFP.model = { build, PHARES, SERIES_COLORS };
})(window);
