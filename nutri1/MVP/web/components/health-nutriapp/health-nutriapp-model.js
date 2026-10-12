/* ============================================================================
 * NutriApp Santé · health-nutriapp-model.js
 * Rôle : modèle de données. Transforme l'état des filtres (mode Vue Globale /
 *        Pays, pays choisi, zone, période) en un objet « vue » unique que
 *        consomment les 5 KPI et les 15 graphiques.
 *
 *  - Mode « region » : lignes = pays inclus (filtrés par zone) ; agrégats
 *    pondérés par le volume d'admissions.
 *  - Mode « country » : lignes = districts du pays sélectionné ; les agrégats
 *    sont les valeurs réelles du pays, comparées à la moyenne régionale.
 *
 *  Les valeurs de districts, séries mensuelles et tendances sont dérivées de
 *  façon DÉTERMINISTE (générateur pseudo-aléatoire seedé) : mêmes données à
 *  chaque rechargement, pas de hasard visible pour l'utilisateur.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;

  /* ---------- Utilitaires numériques ---------- */

  /* Générateur pseudo-aléatoire seedé (mulberry32) — initialisé par une chaîne */
  NH.rng = function (seed) {
    let h = 2166136261;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  NH.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  NH.sum = sum;
  /* Moyenne pondérée par le volume d'admissions */
  const wavg = (list, key) => {
    const t = sum(list.map((c) => c.adm));
    return t ? sum(list.map((c) => c.adm * c[key])) / t : 0;
  };
  /* Normalise un tableau pour que sa somme vaille 1 */
  const norm = (a) => { const s = sum(a); return a.map((v) => v / s); };
  const S24 = norm(NH.SEASON_2024);
  const S23 = norm(NH.SEASON_2023);

  /* ---------- Séries de base par entité (pays ou district) ---------- */

  /* Série mensuelle 2024 et 2023 (admissions) */
  function monthly(row) {
    return {
      y24: S24.map((s) => row.adm * s),
      y23: S23.map((s) => (row.adm / 1.12) * s)
    };
  }

  /* Tendance hebdomadaire de synchronisation (52 semaines) */
  function weekly(row, seed) {
    const r = NH.rng(seed + '|wk');
    const phase = r() * Math.PI * 2;
    const out = [];
    for (let w = 0; w < 52; w++) {
      const v = row.dhis2 + 7 * Math.sin((w / 52) * Math.PI * 3 + phase) + (w / 52) * 4 + (r() - 0.5) * 20;
      out.push(NH.clamp(Math.round(v), 5, 100));
    }
    return out;
  }

  /* Enrichit une ligne (pays ou district) de ses séries dérivées */
  function enrich(row, seed) {
    const m = monthly(row);
    row.y24 = m.y24;
    row.y23 = m.y23;
    row.spark = m.y24.map((v) => Math.round(v));
    row.weekly = weekly(row, seed);
    row.pct = row.guer;
    return row;
  }

  /* ---------- Districts (dérivés, déterministes) ---------- */
  const districtCache = {};
  function districtsOf(c) {
    if (districtCache[c.code]) return districtCache[c.code];
    const r = NH.rng('dist|' + c.code);
    const n = c.districts.length;
    const w = Array.from({ length: n }, () => 0.6 + r() * 0.8);
    const tw = sum(w);
    const rows = c.districts.map((name, i) => {
      const share = w[i] / tw;
      const d = {
        id: c.code + '-' + i,
        code: c.code,
        zone: c.zone,
        label: name,
        parent: c.name,
        adm: Math.round(c.adm * share),
        guer: NH.clamp(c.guer + (r() - 0.5) * 10, 40, 99),
        abandon: NH.clamp(c.abandon + (r() - 0.5) * 6, 0.2, 30),
        deces: NH.clamp(c.deces + (r() - 0.5) * 1.4, 0, 8),
        cpn: NH.clamp(c.cpn + (r() - 0.5) * 24, 5, 100),
        stock: NH.clamp(c.stock * (0.7 + r() * 0.6), 5, 110),
        dhis2: NH.clamp(c.dhis2 + (r() - 0.5) * 24, 20, 100),
        rupture: Math.max(0, Math.round(c.rupture * share * (0.5 + r() * 1.5))),
        pdv: Math.max(1, Math.round(c.pdv * share)),
        score: NH.clamp(c.score + (r() - 0.5) * 22, 0, 100),
        anem: c.anem.map((v) => NH.clamp(v + (r() - 0.5) * 8, 5, 70)),
        suppl: NH.clamp(c.suppl + (r() - 0.5) * 20, 5, 100),
        prof: c.prof.map((v) => Math.max(0.2, v * (0.8 + r() * 0.4)))
      };
      /* Le profil nutritionnel est re-normalisé pour rester sous 100 % */
      const tot = sum(d.prof);
      if (tot > 60) d.prof = d.prof.map((v) => (v * 60) / tot);
      return enrich(d, d.id);
    });
    districtCache[c.code] = rows;
    return rows;
  }

  /* ---------- Agrégats ---------- */

  /* Agrège une liste de pays (moyennes pondérées, sommes pour les volumes) */
  function aggregate(list) {
    const anem = [0, 1, 2].map((i) => wavg(list.map((c) => ({ adm: c.adm, v: c.anem[i] })), 'v'));
    const prof = [0, 1, 2, 3, 4].map((i) => wavg(list.map((c) => ({ adm: c.adm, v: c.prof[i] })), 'v'));
    const pdv = sum(list.map((c) => c.pdv));
    return {
      adm: sum(list.map((c) => c.adm)),
      guer: wavg(list, 'guer'),
      abandon: wavg(list, 'abandon'),
      deces: wavg(list, 'deces'),
      cpn: wavg(list, 'cpn'),
      stock: wavg(list, 'stock'),
      dhis2: wavg(list, 'dhis2'),
      score: wavg(list, 'score'),
      suppl: wavg(list, 'suppl'),
      rupture: sum(list.map((c) => c.rupture)),
      pdv,
      rupRate: pdv ? (sum(list.map((c) => c.rupture)) / pdv) * 100 : 0,
      anem,
      prof
    };
  }

  /* Agrège des séries mensuelles */
  function sumSeries(list, key) {
    const out = new Array(12).fill(0);
    list.forEach((c) => c[key].forEach((v, i) => { out[i] += v; }));
    return out;
  }

  /* ---------- Séries 2018–2024 des canaux de dépistage ---------- */
  function canaux(agg, code) {
    const r = NH.rng('canal|' + code);
    const base = { cpn: agg.cpn, ped: 33 * (agg.cpn / 41), muac: 58 * (agg.cpn / 41), auto: 14 * (agg.cpn / 41) };
    const series = {};
    NH.CANAUX.forEach((ch) => {
      const v24 = base[ch.key];
      series[ch.key] = NH.YEARS.map((y, i) => {
        const f = 0.55 + 0.45 * Math.pow(i / 6, 0.9);
        return Math.max(1, v24 * f + (r() - 0.5) * 2);
      });
      series[ch.key][6] = v24; // 2024 = valeur réelle
    });
    return series;
  }

  /* ---------- Petits multiples : 12 mois de 2024 par métrique ---------- */
  function smallMultiples(agg, code) {
    const r = NH.rng('sm|' + code);
    const trend = (base, amp, drift) => Array.from({ length: 12 }, (_, i) =>
      base + amp * Math.sin((i / 12) * Math.PI * 2 + r() * 0.5) + (i / 11 - 0.5) * drift + (r() - 0.5) * amp * 0.5);
    const mas = S24.map((s) => agg.adm * s);
    return {
      mas,
      guer: trend(agg.guer, 1.2, 3),
      ab: trend(agg.abandon, 0.6, -1.4),
      dc: trend(agg.deces, 0.25, -0.5),
      stock: trend(agg.stock, 4, 6),
      cpn: trend(agg.cpn, 2, 8)
    };
  }

  /* ---------- Construction de la vue ---------- */

  /* state = { mode: 'region'|'country', code, zone, period: 'M'|'T' } */
  NH.build = function (state) {
    const all = NH.COUNTRIES.map((c) => enrich(Object.assign({}, c, { cpnNote: '' }), c.code));
    const zone = NH.ZONES.find((z) => z.id === state.zone) || NH.ZONES[0];
    const regional = aggregate(all);
    const country = state.mode === 'country' ? all.find((c) => c.code === state.code) || all[0] : null;

    let scope, rows, agg, label, labelShort;
    if (country) {
      scope = [country];
      rows = districtsOf(country);
      agg = aggregate([country]);
      /* Pour un pays, les valeurs réelles priment sur la moyenne pondérée */
      agg.guer = country.guer; agg.abandon = country.abandon; agg.deces = country.deces;
      agg.cpn = country.cpn; agg.stock = country.stock; agg.dhis2 = country.dhis2;
      agg.score = country.score; agg.suppl = country.suppl; agg.rupture = country.rupture;
      agg.pdv = country.pdv; agg.rupRate = (country.rupture / country.pdv) * 100;
      agg.anem = country.anem.slice(); agg.prof = country.prof.slice();
      label = country.name;
      labelShort = country.name;
    } else {
      scope = zone.id === 'all' ? all : all.filter((c) => c.zone === zone.id);
      if (!scope.length) scope = all;
      rows = scope.slice();
      agg = aggregate(scope);
      label = 'Afrique de l\u2019Ouest';
      labelShort = zone.id === 'all' ? 'Vue Régionale' : zone.label;
    }

    /* Séries mensuelles agrégées (scope) */
    const m24 = sumSeries(scope, 'y24');
    const m23 = sumSeries(scope, 'y23');
    const sum24 = sum(m24), sum23 = sum(m23);
    const q24 = [0, 1, 2, 3].map((q) => sum(m24.slice(q * 3, q * 3 + 3)));
    const q23 = [0, 1, 2, 3].map((q) => sum(m23.slice(q * 3, q * 3 + 3)));

    /* Séries bimestrielles 24 mois (pour la courbe G1 : 2023 puis 2024) */
    const series24 = { labels: [], v24: [], v23: [] };
    if (state.period === 'T') {
      for (let q = 0; q < 4; q++) {
        series24.labels.push('T' + (q + 1) + ' 23');
        series24.v23.push(q23[q]);
        series24.v24.push(null);
      }
      for (let q = 0; q < 4; q++) {
        series24.labels.push('T' + (q + 1) + ' 24');
        series24.v23.push(null);
        series24.v24.push(q24[q]);
      }
    } else {
      NH.MONTHS.forEach((m, i) => { series24.labels.push(m + ' 23'); series24.v23.push(m23[i]); series24.v24.push(null); });
      NH.MONTHS.forEach((m, i) => { series24.labels.push(m + ' 24'); series24.v23.push(null); series24.v24.push(m24[i]); });
    }

    /* Pic de soudure (Juin–Sept) : écart du mois de pic à la moyenne 2024 */
    const peakIdx = m24.indexOf(Math.max.apply(null, m24));
    const peakPct = ((m24[peakIdx] / (sum24 / 12)) - 1) * 100;

    /* Canaux & petits multiples */
    const canauxSeries = canaux(agg, state.code || 'REG');
    const sm = smallMultiples(agg, state.code || 'REG');

    /* Ligne par ligne : enrichie pour les graphiques */
    const rowsView = rows.map((r) => Object.assign({}, r, { label: r.label || r.name }));

    return {
      mode: country ? 'country' : 'region',
      country,
      code: country ? country.code : null,
      zone,
      period: state.period,
      label,
      labelShort,
      scope,
      rows: rowsView,
      agg,
      regional,
      all,
      kpi: {
        adm: agg.adm,
        admPctVsRegion: country ? (country.adm / (regional.adm / NH.COUNTRIES.length) - 1) * 100 : null,
        admGrowth: ((sum24 / sum23) - 1) * 100,
        peakPct,
        peakMonth: NH.MONTHS[peakIdx],
        guer: agg.guer,
        guerDelta: agg.guer - regional.guer,
        cpn: agg.cpn,
        cpnDelta: canauxSeries.cpn[6] - canauxSeries.cpn[5],
        rupture: agg.rupture,
        pdv: agg.pdv,
        rupRate: agg.rupRate,
        dhis2: agg.dhis2
      },
      series24,
      m24,
      m23,
      q24,
      q23,
      canaux: canauxSeries,
      sm,
      spark: sumSeries(scope, 'spark'),
      /* Table de comparaison (scorecard) : totaux régionaux */
      sumAdm: sum24,
      /* Aide à la lecture : comorbidités & dumbbell (ajustés au périmètre) */
      comorb: NH.COMORBIDITES.map((x) => Object.assign({}, x, {
        value: country ? NH.clamp(x.value + (country.stock % 7) - 3, 3, 40) : x.value
      }))
    };
  };

  /* Liste des lignes : libellés et couleurs de zone (pour légendes) */
  NH.zoneOf = (id) => NH.ZONES.find((z) => z.id === id) || NH.ZONES[0];
  NH.ZONE_COLORS = { sahel: '#F59E0B', cotiere: '#06B6D4', anglo: '#10B981', lusophone: '#A855F7' };
  NH.ZONE_LABELS = { sahel: 'Sahel & AES', cotiere: 'Côtière francophone', anglo: 'Anglophone', lusophone: 'Lusophone & îles' };

  /* Formatage français des nombres et pourcentages */
  NH.fmt = (n, d) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  NH.pct = (n, d) => NH.fmt(n, d == null ? 1 : d) + ' %';
})(typeof window !== 'undefined' ? window : globalThis);
