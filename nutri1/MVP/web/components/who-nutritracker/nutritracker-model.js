/* ============================================================================
 * NutriTracker West Africa · Surveillance Communautaire
 * Fichier : nutritracker-model.js
 * Rôle    : Couche "modèle" — transforme les données brutes (nutritracker-data.js)
 *           en un objet "vue" prêt à afficher, selon l'état des filtres :
 *             - mode       : 'region' (Vue Globale) | 'country' (Vue Pays)
 *             - country    : code ISO du pays sélectionné (ex. 'NE')
 *             - year       : 2022 | 2023 | 2024
 *             - period     : 'year' | 'Q1'..'Q4' | 'M1'..'M12'
 *           Chaque changement de filtre reconstruit la vue complète, puis les
 *           15 graphiques + 5 KPI sont réanimés.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = (global.NutriTracker = global.NutriTracker || {});
  const D = NT.DATA;

  /* ---------- Utilitaires numériques ---------- */
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  /* Bruit déterministe (pas de Math.random → rendu stable d'un rafraîchissement à l'autre) */
  const noise = (seed) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x) - 0.5; // ∈ [-0.5 ; 0.5]
  };
  const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h % 10000); };

  const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const MONTHS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const YEARS_HIST = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

  const byCode = {};
  D.countries.forEach((c) => (byCode[c.code] = c));

  /* Mois couverts par la période sélectionnée (indices 0..11) */
  function periodMonths(period) {
    if (!period || period === 'year') return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    if (period[0] === 'Q') { const q = +period.slice(1) - 1; return [q * 3, q * 3 + 1, q * 3 + 2]; }
    if (period[0] === 'M') return [+period.slice(1) - 1];
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }
  function periodLabel(period, year) {
    if (!period || period === 'year') return 'Année ' + year;
    if (period[0] === 'Q') return 'T' + period.slice(1) + ' ' + year;
    return MONTHS_LONG[+period.slice(1) - 1] + ' ' + year;
  }

  /* Seuils de gravité par indicateur (graphique 2 & tableau) */
  const INDICATORS = {
    stunting: { label: 'Stunting', unit: '%', threshold: 20, thresholdLabel: 'Seuil OMS 20%', higherIsWorse: true, bands: [35, 20, 10] },
    wasting: { label: 'Émaciation (PB)', unit: '%', threshold: 10, thresholdLabel: 'Seuil alerte 10%', higherIsWorse: true, bands: [15, 10, 5] },
    anemia: { label: 'Anémie', unit: '%', threshold: 40, thresholdLabel: 'Seuil sévère 40%', higherIsWorse: true, bands: [60, 40, 20] },
    vitA: { label: 'Vit. A', unit: '%', threshold: 80, thresholdLabel: 'Cible 80%', higherIsWorse: false, bands: [60, 70, 80] }
  };
  /* Couleur selon gravité (rouge > ambre > vert > bleu) */
  function severityColor(ind, v) {
    const I = INDICATORS[ind]; const b = I.bands;
    if (I.higherIsWorse) return v > b[0] ? '#EF4444' : v > b[1] ? '#F59E0B' : v > b[2] ? '#10B981' : '#0066CC';
    return v < b[0] ? '#EF4444' : v < b[1] ? '#F59E0B' : v < b[2] ? '#10B981' : '#0066CC';
  }
  function statusOf(score) {
    if (score < 40) return { label: 'Critique', tone: 'danger' };
    if (score < 55) return { label: 'Alerte', tone: 'warning' };
    if (score < 70) return { label: 'Vigilance', tone: 'info' };
    return { label: 'Satisfaisant', tone: 'success' };
  }

  /* ---------- Ajustement temporel (année + période) ----------
   * Les données de référence sont 2024. Pour 2022/2023 on applique le ratio de
   * la série historique du pays ; la période (trimestre/mois) module
   * l'émaciation selon la saisonnalité (soudure = pic). */
  function yearFactor(country, year) {
    const h = country.stuntingHistory; const idx = YEARS_HIST.indexOf(year);
    return idx < 0 ? 1 : h[idx] / h[10];
  }
  function seasonFactor(zone, period) {
    if (!period || period === 'year') return 1;
    const s = D.seasonality[zone] || D.seasonality.coast;
    return Math.pow(mean(periodMonths(period).map((m) => s[m])), 0.55);
  }
  function adjust(entity, country, year, period) {
    const yf = yearFactor(country, year);
    const back = 2024 - year;
    const sf = seasonFactor(country.zone, period);
    const o = Object.assign({}, entity);
    o.stunting = r1(entity.stunting * yf);
    o.wasting = r1(entity.wasting * (1 + (yf - 1) * 0.8) * sf);
    o.anemia = r1(clamp(entity.anemia * (1 + back * 0.012), 0, 99));
    o.vitA = Math.round(clamp(entity.vitA - back * 4.1, 5, 99));
    o.diversity = Math.round(clamp(entity.diversity - back * 1.5, 2, 99));
    o.ebf = Math.round(clamp(entity.ebf - back * 1.8, 2, 99));
    o.wash = Math.round(clamp(entity.wash - back * 1.6, 2, 99));
    o.earlyScreen = Math.round(clamp(entity.earlyScreen - back * 3.2, 2, 99));
    o.agentCov = Math.round(clamp(entity.agentCov - back * 5.5, 2, 99));
    o.recovery = Math.round(clamp(entity.recovery - back * 1.9, 2, 99));
    o.score = Math.round(clamp(entity.scoreTrend ? entity.scoreTrend[clamp(4 - back, 0, 4)] : entity.score, 1, 99));
    if (entity.registered) o.registered = Math.round(entity.registered * (D.regional.byYear[year].children / D.regional.byYear[2024].children));
    ['iodine', 'earlyBF', 'mealFreq', 'ironFolic', 'zinc', 'vitD', 'calcium'].forEach((k) => {
      if (entity[k] != null) o[k] = Math.round(clamp(entity[k] - back * 1.7, 2, 99));
    });
    return o;
  }

  /* Complète un district avec les champs présents seulement au niveau pays
   * (mise au sein précoce, fréquence des repas, micronutriments…) */
  function enrichDistrict(d, c) {
    const f = d.ebf / c.ebf; const fs = d.stunting / c.stunting;
    const o = Object.assign({}, d);
    o.earlyBF = Math.round(clamp(c.earlyBF * (0.5 + f * 0.5), 5, 98));
    o.mealFreq = Math.round(clamp(c.mealFreq * (1.4 - fs * 0.4), 5, 98));
    o.iodine = Math.round(clamp(c.iodine * (1.3 - fs * 0.3), 5, 99));
    o.ironFolic = Math.round(clamp(c.ironFolic * (1.3 - fs * 0.3), 5, 99));
    o.zinc = Math.round(clamp(c.zinc * (1.3 - fs * 0.3), 5, 99));
    o.vitD = Math.round(clamp(c.vitD * (1.3 - fs * 0.3), 3, 99));
    o.calcium = Math.round(clamp(c.calcium * (1.3 - fs * 0.3), 3, 99));
    o.overweight = c.overweight;
    o.zone = c.zone;
    return o;
  }

  /* Moyenne régionale (agrégats officiels + moyennes simples pour le reste) */
  function regionAverage(year, period) {
    const list = D.countries.map((c) => adjust(c, c, year, period));
    const R = D.regional.byYear[year];
    const avg = {};
    ['anemia', 'iodine', 'diversity', 'ebf', 'earlyBF', 'mealFreq', 'wash', 'earlyScreen', 'agentCov', 'recovery', 'ironFolic', 'zinc', 'vitD', 'calcium', 'score'].forEach((k) => (avg[k] = r1(mean(list.map((c) => c[k])))));
    const sf = Math.pow(mean(periodMonths(period).map((m) => D.seasonality.mixed[m])), 0.55);
    avg.stunting = R.stunting;
    avg.wasting = r1(R.wasting * (period === 'year' ? 1 : sf));
    avg.vitA = R.vitA;
    avg.registered = R.children;
    avg.name = 'Moyenne régionale';
    return avg;
  }

  /* Série historique d'un district (dérivée de la série pays) */
  function districtHistory(d, c) {
    const ratio = d.stunting / c.stunting; const s = hashStr(d.name);
    return c.stuntingHistory.map((v, i) => r1(v * ratio + noise(s + i) * 1.2 * (i === 10 ? 0 : 1)));
  }

  /* Cas mensuels dépistés (graphique 4) */
  function monthlyCases(entities, year) {
    const out = new Array(12).fill(0);
    entities.forEach((e) => {
      const s = D.seasonality[e.zone] || D.seasonality.coast;
      const screened = D.regional.byYear[year].screenedMonth * (e.registered / D.regional.byYear[year].children);
      for (let m = 0; m < 12; m++) {
        out[m] += screened * (e.wasting / 100) * 1.6 * s[m] * (1 + noise(hashStr(e.name || e.code) + m + year) * 0.12);
      }
    });
    return out.map(Math.round);
  }

  /* Parcours des 1000 premiers jours (graphique 13) */
  function milestones(e) {
    const anc = clamp(Math.round(e.earlyScreen * 0.85), 10, 96);
    const m = [
      { day: 0, short: 'Grossesse', label: 'Enregistrement grossesse (CPN1)', base: anc, boost: 14, icon: 'pregnant',
        desc: "L'agent enregistre la femme enceinte dans l'app ; les rappels planifient les 4 consultations prénatales." },
      { day: 120, short: 'CPN4 + Fer', label: 'Fer / Acide folique (CPN4)', base: e.ironFolic, boost: 16, icon: 'pill',
        desc: 'Rappel automatique de supplémentation fer/acide folique et de la 4ᵉ consultation prénatale.' },
      { day: 270, short: 'Naissance', label: 'Mise au sein précoce (< 1h)', base: e.earlyBF, boost: 11, icon: 'baby',
        desc: "Alerte de naissance : visite à domicile sous 48h, conseil sur la mise au sein précoce." },
      { day: 450, short: '6 mois', label: 'Allaitement exclusif jusqu’à 6 mois', base: e.ebf, boost: 15, icon: 'heart',
        desc: 'Visites ANJE mensuelles guidées par questionnaire, suivi du poids et du PB.' },
      { day: 540, short: '9 mois', label: 'Diversification + Vitamine A', base: Math.round((e.diversity + e.vitA) / 2), boost: 13, icon: 'bowl',
        desc: 'Rappel des campagnes Vitamine A / déparasitage et conseils de diversification alimentaire.' },
      { day: 1000, short: '24 mois', label: 'Suivi de croissance complet (taille/âge)', base: e.earlyScreen, boost: 12, icon: 'ruler',
        desc: 'Mesure z-score taille/âge à 24 mois : clôture du parcours des 1000 jours.' }
    ];
    /* Le gain des rappels dépend de la couverture en agents équipés (référence 70%) */
    const k = clamp((e.agentCov || 70) / 70, 0.6, 1.3);
    return m.map((x) => { const boost = Math.round(x.boost * k); return { ...x, boost, without: Math.round(clamp(x.base, 3, 97)), with: Math.round(clamp(x.base + boost, 5, 99)) }; });
  }

  /* Indice de performance normalisé (radar) : 100 = optimal */
  const RADAR_AXES = [
    { key: 'stunting', label: 'Stunting', norm: (v) => clamp(100 - v * 2, 0, 100) },
    { key: 'wasting', label: 'Émaciation (MUAC)', norm: (v) => clamp(100 - v * 5, 0, 100) },
    { key: 'anemia', label: 'Anémie', norm: (v) => clamp(100 - v, 0, 100) },
    { key: 'vitA', label: 'Vitamine A', norm: (v) => clamp(v, 0, 100) },
    { key: 'iodine', label: 'Iode / Sel', norm: (v) => clamp(v, 0, 100) },
    { key: 'diversity', label: 'Diversité ANJE', norm: (v) => clamp(v * 1.6, 0, 100) }
  ];
  const WHO_TARGET = { name: 'Cible OMS 2030', stunting: 15, wasting: 5, anemia: 30, vitA: 80, iodine: 90, diversity: 50 };

  /* Colonnes de la heatmap (graphique 8) avec fonction de gravité 0..1 */
  const HEAT_COLS = [
    { key: 'stunting', label: 'Stunting', sev: (v) => (v - 5) / 40 },
    { key: 'wasting', label: 'MUAC', sev: (v) => (v - 2) / 14 },
    { key: 'anemia', label: 'Anémie', sev: (v) => (v - 25) / 50 },
    { key: 'vitA', label: 'Vit. A', sev: (v) => (92 - v) / 40 },
    { key: 'ebf', label: 'Allait. excl.', sev: (v) => (70 - v) / 55 },
    { key: 'diversity', label: 'Diversité', sev: (v) => (50 - v) / 45 },
    { key: 'wash', label: 'Eau/Hygiène', sev: (v) => (85 - v) / 65 },
    { key: 'earlyScreen', label: 'Dépist. précoce', sev: (v) => (95 - v) / 45 }
  ];

  const PALETTE = ['#0066CC', '#FF6B35', '#7C3AED', '#00A86B', '#F59E0B', '#EC4899', '#0EA5E9', '#84CC16'];

  /* ===================================================================
   * build(state) → objet vue complet
   * =================================================================== */
  function build(state) {
    const year = state.year; const period = state.period || 'year';
    const months = periodMonths(period);
    const R = D.regional.byYear[year];
    const Rprev = D.regional.byYear[year - 1];
    const avg = regionAverage(year, period);
    const countries = D.countries.map((c) => adjust(c, c, year, period));
    const isCountry = state.mode === 'country' && byCode[state.country];
    const raw = isCountry ? byCode[state.country] : null;
    const C = isCountry ? countries.find((c) => c.code === raw.code) : null;
    const districts = isCountry ? D.districts[raw.code].map((d) => adjust(enrichDistrict(d, raw), raw, year, period)) : [];
    const subject = isCountry ? C : avg; // entité affichée dans les KPI
    const zones = isCountry ? districts : countries; // lignes des classements
    const V = { state, year, period, months, isCountry: !!isCountry, country: C, raw, avg, countries, districts, zones };

    V.labels = {
      scope: isCountry ? C.name : 'Afrique de l’Ouest',
      zoneWord: isCountry ? 'districts' : 'pays',
      zoneWordCap: isCountry ? 'Districts / Régions' : 'Pays',
      period: periodLabel(period, year)
    };

    /* ---------- KPI ---------- */
    const monthsSpark = MONTHS.map((m, i) => {
      const s = D.seasonality[isCountry ? C.zone : 'mixed'][i];
      const start = isCountry ? C.stunting * 1.045 : (Rprev ? Rprev.stunting : R.stunting * 1.03);
      const end = subject.stunting;
      return r1(start + (end - start) * (i / 11) + (s - 1) * 0.6 + noise(i + year) * 0.35);
    });
    const regBars = MONTHS.map((m, i) => Math.round((isCountry ? C.registered / 11 : R.children / 11) * (0.55 + i * 0.045 + noise(i * 3 + year) * 0.12)));
    let alertCount, severity, alertTotal;
    if (isCountry) {
      severity = { severe: 0, moderate: 0, controlled: 0 };
      districts.forEach((d, i) => {
        // Double fardeau : le surpoids (> 6 %) est signalé dans la zone urbaine principale
        if (d.stunting > 40 || d.wasting > 15) severity.severe++;
        else if (d.stunting > 30 || d.wasting > 10 || (i === 0 && d.overweight > 6)) severity.moderate++;
        else severity.controlled++;
      });
      alertCount = severity.severe + severity.moderate; alertTotal = districts.length;
    } else {
      const base = D.regional.alertSeverity; const delta = R.alerts - 11;
      severity = { severe: base.severe + Math.min(0, delta), moderate: base.moderate + Math.max(0, delta), controlled: base.controlled - delta };
      alertCount = R.alerts; alertTotal = 16;
    }
    const diffStr = (d, unit = ' pts') => (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(r1(d)).toFixed(1) + unit;
    const prevStunting = year === 2022 ? D.regional.stuntingHistory[7] : Rprev.stunting;
    const prevWasting = Rprev ? Rprev.wasting : r1(R.wasting * 1.02);
    const prevVitA = Rprev ? Rprev.vitA : r1(R.vitA - 3.6);
    const prevAlerts = Rprev ? Rprev.alerts : R.alerts - 1;
    const growth = { 2022: 7, 2023: 9, 2024: 12 }[year];
    V.kpi = {
      stunting: {
        value: subject.stunting, spark: monthsSpark,
        badge: isCountry
          ? { text: diffStr(C.stunting - avg.stunting) + ' vs Moy. Régionale', dir: C.stunting >= avg.stunting ? 'up' : 'down', good: C.stunting < avg.stunting }
          : { text: diffStr(R.stunting - prevStunting) + ' vs ' + (year - 1), dir: R.stunting <= prevStunting ? 'down' : 'up', good: R.stunting <= prevStunting }
      },
      wasting: {
        value: subject.wasting, max: 15, threshold: 10,
        badge: isCountry
          ? { text: diffStr(C.wasting - avg.wasting) + ' vs Moy. Régionale', dir: C.wasting >= avg.wasting ? 'up' : 'down', good: C.wasting < avg.wasting }
          : { text: diffStr(avg.wasting - prevWasting), dir: avg.wasting >= prevWasting ? 'up' : 'down', good: avg.wasting < prevWasting }
      },
      children: {
        value: subject.registered, bars: regBars,
        sync: isCountry ? r1(clamp(R.sync - 6 + C.agentCov * 0.08, 70, 99.5)) : R.sync,
        badge: isCountry
          ? { text: r1((C.registered / R.children) * 100).toFixed(1) + '% du total régional', dir: 'up', good: true }
          : { text: '+' + growth + '% ce mois', dir: 'up', good: true }
      },
      vitA: {
        value: subject.vitA, target: 80,
        districts: isCountry ? districts.filter((d) => d.vitA >= 80).length + '/' + districts.length + ' districts' : R.districtsOnTarget + '/' + D.regional.districtsTotal + ' districts',
        badge: isCountry
          ? { text: diffStr(C.vitA - avg.vitA) + ' vs Moy. Régionale', dir: C.vitA >= avg.vitA ? 'up' : 'down', good: C.vitA >= avg.vitA }
          : { text: diffStr(R.vitA - prevVitA), dir: R.vitA >= prevVitA ? 'up' : 'down', good: R.vitA >= prevVitA }
      },
      alerts: {
        value: alertCount, total: alertTotal, severity,
        unit: isCountry ? 'districts' : 'zones / pays',
        badge: isCountry
          ? { text: alertCount + ' / ' + alertTotal + ' districts en alerte', dir: 'up', good: alertCount === 0, warn: true }
          : { text: (R.alerts - prevAlerts >= 0 ? '+' : '−') + Math.abs(R.alerts - prevAlerts) + ' foyers', dir: R.alerts >= prevAlerts ? 'up' : 'down', good: R.alerts < prevAlerts, warn: true }
      }
    };

    /* Synchronisation App (header) */
    const screened = isCountry ? Math.round(R.screenedMonth * (C.registered / R.children)) : R.screenedMonth;
    const monthScreened = period[0] === 'M' ? Math.round(screened * (D.seasonality[isCountry ? C.zone : 'mixed'][months[0]])) : screened;
    V.sync = { screened: monthScreened };

    /* ---------- G1 : évolution du stunting ---------- */
    if (isCountry) {
      const big = D.districts[raw.code].slice().sort((a, b) => b.pop5 - a.pop5).slice(0, 3);
      V.g1 = {
        years: YEARS_HIST, selectedYear: year,
        series: [
          { key: raw.code, label: C.name, color: '#0066CC', values: raw.stuntingHistory, width: 3 },
          { key: 'avg', label: 'Moyenne régionale', color: '#FF6B35', values: D.regional.stuntingHistory, dashed: true },
          ...big.map((d, i) => ({ key: 'd' + i, label: d.name, color: ['#7C3AED', '#00A86B', '#F59E0B'][i], values: districtHistory(d, raw) }))
        ]
      };
    } else {
      const sel = state.g1Sel.filter((c) => byCode[c]);
      V.g1 = {
        years: YEARS_HIST, selectedYear: year,
        series: sel.map((code, i) => ({ key: code, label: byCode[code].name, color: PALETTE[i % PALETTE.length], values: byCode[code].stuntingHistory }))
      };
    }

    /* ---------- G2 : classement ---------- */
    const ind = state.g2Ind || 'stunting';
    V.g2 = {
      indicator: ind, meta: INDICATORS[ind],
      items: zones.map((z) => ({ label: z.name, value: z[ind], color: severityColor(ind, z[ind]), code: z.code })).sort((a, b) => b.value - a.value)
    };

    /* ---------- G3 : radar ---------- */
    const radarOf = (e) => RADAR_AXES.map((a) => a.norm(e[a.key]));
    const rawOf = (e) => RADAR_AXES.map((a) => e[a.key]);
    if (isCountry) {
      V.g3 = { axes: RADAR_AXES.map((a) => a.label), series: [
        { key: raw.code, label: C.name, color: '#0066CC', values: radarOf(C), raw: rawOf(C) },
        { key: 'avg', label: 'Moyenne régionale', color: '#FF6B35', values: radarOf(avg), raw: rawOf(avg) },
        { key: 'who', label: 'Cible OMS', color: '#00A86B', values: radarOf(WHO_TARGET), raw: rawOf(WHO_TARGET), dashed: true }
      ] };
    } else {
      V.g3 = { axes: RADAR_AXES.map((a) => a.label), series: state.g3Sel.filter((c) => byCode[c]).map((code, i) => {
        const e = countries.find((c) => c.code === code);
        return { key: code, label: e.name, color: ['#0066CC', '#FF6B35', '#00A86B'][i % 3], values: radarOf(e), raw: rawOf(e) };
      }) };
    }

    /* ---------- G4 : saisonnalité ---------- */
    const ents4 = isCountry ? [Object.assign({}, C, { zone: C.zone })] : countries;
    const yPrev = year - 1;
    const c24 = monthlyCases(ents4, year);
    let c23;
    if (D.regional.byYear[yPrev]) {
      // Année précédente disponible : on recalcule avec les données ajustées N-1
      const prevEnts = isCountry ? [adjust(raw, raw, yPrev, 'year')] : D.countries.map((c) => adjust(c, c, yPrev, 'year'));
      c23 = monthlyCases(prevEnts, yPrev);
    } else {
      // Pas de données App avant 2022 : estimation à partir de N (−14 %)
      c23 = c24.map((v, i) => Math.round(v * 0.86 * (1 + Math.sin(i * 1.3) * 0.05)));
    }
    V.g4 = { months: MONTHS, current: c24, previous: c23, yearCur: year, yearPrev: yPrev, highlight: period === 'year' ? null : months };

    /* ---------- G5 : répartition MUAC ---------- */
    const mu = D.regional.muac; const w = subject.wasting / R.wasting;
    let mas = r1(mu.mas * w), mam = r1(mu.mam * w), risk = r1(mu.risk * (0.8 + 0.2 * w));
    if (!isCountry) { mas = r1(mu.mas * w); mam = r1(mu.mam * w); risk = r1(mu.risk * (0.8 + 0.2 * w)); }
    const normal = r1(100 - mas - mam - risk);
    const totalMeasured = period === 'year' ? subject.registered : Math.round(months.reduce((s, m) => s + screened * D.seasonality[isCountry ? C.zone : 'mixed'][m], 0));
    V.g5 = { total: totalMeasured, slices: [
      { key: 'mas', label: 'MAS · Sévère', sub: 'PB < 115 mm', value: mas, color: '#EF4444' },
      { key: 'mam', label: 'MAM · Modérée', sub: 'PB 115–125 mm', value: mam, color: '#FF6B35' },
      { key: 'risk', label: 'En risque', sub: 'PB 125–135 mm', value: risk, color: '#F59E0B' },
      { key: 'normal', label: 'Normal', sub: 'PB ≥ 135 mm', value: normal, color: '#10B981' }
    ] };

    /* ---------- G6 : couverture agents vs guérison ---------- */
    V.g6 = { points: zones.map((z) => ({ label: z.name, x: z.agentCov, y: z.recovery, size: isCountry ? z.pop5 / 1000 : z.pop5 * 1000, sizeLabel: isCountry ? Math.round(z.pop5 / 1000) + ' k enfants' : z.pop5 + ' M enfants', color: severityColor('stunting', z.stunting) })) };

    /* ---------- G7 : cascade ---------- */
    if (isCountry) {
      const start = raw.stuntingHistory[1]; const end = C.stunting; const delta = start - end;
      const props = D.regional.cascade.steps.map((s) => s.value);
      const tot = props.reduce((a, b) => a + b, 0);
      V.g7 = { start: r1(start), end: r1(end), startLabel: 'Départ 2015', endLabel: 'Situation ' + year,
        steps: D.regional.cascade.steps.map((s) => ({ label: s.label, value: r1(-delta * (s.value / tot)) })) };
      // Correction d'arrondi pour que la cascade tombe exactement sur la valeur finale
      const sum = V.g7.steps.reduce((a, s) => a + s.value, 0);
      V.g7.steps[V.g7.steps.length - 1].value = r1(V.g7.steps[V.g7.steps.length - 1].value + (V.g7.end - V.g7.start - sum));
    } else {
      const cs = D.regional.cascade;
      V.g7 = { start: cs.start, end: cs.end, startLabel: 'Départ 2015', endLabel: 'Situation 2024', steps: cs.steps.map((s) => Object.assign({}, s)) };
    }

    /* ---------- G8 : heatmap ---------- */
    V.g8 = { cols: HEAT_COLS, rows: zones.map((z) => ({ label: z.name, values: HEAT_COLS.map((c) => z[c.key]), sev: HEAT_COLS.map((c) => clamp(c.sev(z[c.key]), 0, 1)) })) };

    /* ---------- G9 : ANJE ---------- */
    const cats = [
      { key: 'earlyBF', label: 'Mise au sein précoce' },
      { key: 'ebf', label: 'Allaitement exclusif < 6 mois' },
      { key: 'diversity', label: 'Diversité alimentaire min.' },
      { key: 'mealFreq', label: 'Fréquence repas min.' }
    ];
    let groups;
    if (isCountry) {
      const big2 = districts.slice().sort((a, b) => b.pop5 - a.pop5).slice(0, 2);
      groups = [
        { key: raw.code, label: C.name, color: '#0066CC', e: C },
        { key: 'avg', label: 'Moyenne régionale', color: '#FF6B35', e: avg },
        ...big2.map((d, i) => ({ key: 'd' + i, label: d.name, color: ['#7C3AED', '#00A86B'][i], e: d }))
      ];
    } else {
      groups = state.g9Sel.filter((c) => byCode[c]).map((code, i) => ({ key: code, label: byCode[code].name, color: ['#0066CC', '#FF6B35', '#7C3AED', '#00A86B'][i % 4], e: countries.find((c) => c.code === code) }));
    }
    V.g9 = { categories: cats.map((c) => c.label), groups: groups.map((g) => ({ key: g.key, label: g.label, color: g.color, values: cats.map((c) => Math.round(g.e[c.key])) })) };

    /* ---------- G10 : anémie empilée ---------- */
    const yrs10 = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
    const baseA = isCountry ? raw.anemia : mean(D.countries.map((c) => c.anemia));
    const sA = hashStr(isCountry ? raw.code : 'REG');
    const child = yrs10.map((y, i) => r1(baseA * (1 + (2024 - y) * 0.014) + noise(sA + i) * 1.4 + (y === 2020 ? 1.2 : 0)));
    V.g10 = { years: yrs10, series: [
      { key: 'child', label: 'Enfants < 5 ans', color: '#0066CC', values: child },
      { key: 'preg', label: 'Femmes enceintes', color: '#7C3AED', values: child.map((v, i) => r1(v * 0.79 + noise(sA + 20 + i) * 1.1)) },
      { key: 'wra', label: 'Femmes en âge de procréer', color: '#00A86B', values: child.map((v, i) => r1(v * 0.69 + noise(sA + 40 + i) * 1.1)) }
    ], selectedYear: year };

    /* ---------- G11 : signalements terrain par mois (polar) ---------- */
    const alertsYear = isCountry ? 3650 * (C.registered / R.children) * (C.wasting / avg.wasting) : 3650 * (R.children / D.regional.byYear[2024].children);
    const z11 = D.seasonality[isCountry ? C.zone : 'mixed'];
    const sumS = z11.reduce((a, b) => a + Math.pow(b, 1.4), 0);
    V.g11 = { months: MONTHS, values: z11.map((s, i) => Math.max(1, Math.round((alertsYear * Math.pow(s, 1.4)) / sumS * (1 + noise(sA + i * 7) * 0.1)))), highlight: period === 'year' ? null : months };

    /* ---------- G12 : WASH vs stunting ---------- */
    V.g12 = { xMid: 50, yMid: 20, points: zones.map((z) => ({ label: z.name, x: z.wash, y: z.stunting, size: isCountry ? z.pop5 / 1000 : z.pop5 * 1000 })) };

    /* ---------- G13 : 1000 premiers jours ---------- */
    V.g13 = { milestones: milestones(subject) };

    /* ---------- G14 : micronutriments ---------- */
    V.g14 = { target: 80, gauges: [
      { key: 'vitA', label: 'Vitamine A', value: subject.vitA },
      { key: 'ironFolic', label: 'Fer / Acide folique', value: subject.ironFolic },
      { key: 'zinc', label: 'Zinc (diarrhées)', value: subject.zinc },
      { key: 'iodine', label: 'Sel iodé', value: subject.iodine },
      { key: 'vitD', label: 'Vitamine D', value: subject.vitD },
      { key: 'calcium', label: 'Calcium', value: subject.calcium }
    ] };

    /* ---------- G15 : scorecard ---------- */
    V.g15 = { rows: zones.map((z) => ({
      name: z.name, code: z.code || null, stunting: z.stunting, wasting: z.wasting, anemia: z.anemia, vitA: z.vitA, diversity: z.diversity,
      score: z.score, status: statusOf(z.score), trend: z.scoreTrend || [], entity: z
    })) };

    return V;
  }

  NT.model = { build, byCode, MONTHS, MONTHS_LONG, INDICATORS, severityColor, statusOf, PALETTE, RADAR_AXES, HEAT_COLS, WHO_TARGET };
})(window);
