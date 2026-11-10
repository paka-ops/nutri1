/* ============================================================================
 * FAO AgriNutriApp · Modèle de vue.
 * Agrège les valeurs régionales, génère des zones de démonstration déterministes
 * et prépare les données consommées par les 5 KPI et les 15 graphiques Canvas.
 * ========================================================================== */
(function (global) {
  'use strict';

  const FAO = (global.FAONutriTracker = global.FAONutriTracker || {});
  const DATA = FAO.DATA;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const sum = (items, selector) => items.reduce((total, item) => total + selector(item), 0);
  const average = (items, selector) => items.length ? sum(items, selector) / items.length : 0;
  const fmt = (value, digits) => new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits == null ? 0 : digits,
    maximumFractionDigits: digits == null ? 0 : digits
  }).format(value);
  const numberWithUnit = (value, digits) => fmt(value, digits) + ' M t';
  const FOOD_FOCUS = {
    NE: ['Mil', 'Sorgho', 'Niébé', 'Moringa', 'Arachide'], ML: ['Mil', 'Sorgho', 'Fonio', 'Niébé', 'Baobab'],
    BF: ['Mil', 'Sorgho', 'Niébé', 'Arachide'], SN: ['Mil', 'Riz local', 'Niébé', 'Poisson séché', 'Baobab'],
    GN: ['Riz local', 'Fonio', 'Manioc', 'Niébé', 'Feuilles de manioc'], CI: ['Maïs', 'Manioc', 'Igname', 'Niébé', 'Patate douce'],
    GH: ['Maïs', 'Igname', 'Niébé', 'Patate douce', 'Moringa'], NG: ['Maïs', 'Sorgho', 'Manioc', 'Igname', 'Niébé'],
    MR: ['Sorgho', 'Riz local', 'Poisson séché', 'Arachide'], SL: ['Riz local', 'Manioc', 'Poisson séché', 'Patate douce'],
    LR: ['Riz local', 'Manioc', 'Taro', 'Poisson séché'], GW: ['Riz local', 'Fonio', 'Niébé', 'Poisson séché'],
    GM: ['Riz local', 'Arachide', 'Mil', 'Poisson séché'], BJ: ['Maïs', 'Sorgho', 'Igname', 'Arachide', 'Niébé'],
    TG: ['Maïs', 'Sorgho', 'Igname', 'Niébé', 'Arachide'], CV: ['Maïs', 'Riz local', 'Haricot bambara', 'Poisson séché']
  };
  const quarterEffects = {
    1: { production: .96, loss: -1, hdds: .15, price: -2 },
    2: { production: .91, loss: 2, hdds: -.15, price: 7 },
    3: { production: 1.06, loss: 3, hdds: -.35, price: 11 },
    4: { production: 1.02, loss: 0, hdds: .25, price: 1 }
  };

  function yearEffect(year) {
    if (String(year) === '2023') return { production: 1 / 1.041, loss: 1.2, hdds: -.12, fortification: -3, price: 8 };
    return { production: 1, loss: 0, hdds: 0, fortification: 0, price: 0 };
  }

  function periodEffect(state) {
    const yearly = yearEffect(state.year || '2024');
    const season = state.granularity === 'quarterly' ? quarterEffects[state.quarter || 3] : { production: 1, loss: 0, hdds: 0, price: 0 };
    return {
      production: yearly.production * season.production,
      loss: yearly.loss + season.loss,
      hdds: yearly.hdds + season.hdds,
      fortification: yearly.fortification,
      price: yearly.price + season.price
    };
  }

  function makeCountryRow(country, index, period) {
    const production = country.production * period.production;
    const loss = clamp(country.loss + period.loss, 5, 45);
    const hdds = clamp(country.hdds + period.hdds, 2.2, 9);
    const fort = clamp(country.fortification + period.fortification, 15, 100);
    const pressure = clamp(108 + loss * .85 - country.income / 28 + period.price, 65, 165);
    return {
      name: country.name,
      code: country.code,
      parentCode: country.code,
      production,
      needs: production / country.selfSufficiency,
      selfSufficiency: country.selfSufficiency,
      loss,
      hdds,
      fortification: fort,
      income: country.income,
      diversity: country.diversity,
      households: country.households,
      priceIndex: pressure,
      mix: country.mix,
      index,
      type: 'country'
    };
  }

  /* Les poids et variations sont fixes : un même périmètre produit le même
   * résultat à chaque chargement, ce qui facilite les démonstrations et tests. */
  function makeDistrictRows(country, countryIndex, period) {
    const names = DATA.districts[country.code] || [];
    const rawWeights = names.map((_, index) => 1 + Math.sin((index + 1) * 1.71 + countryIndex * .83) * .20 + ((index % 3) - 1) * .035);
    const totalWeight = rawWeights.reduce((a, b) => a + b, 0) || 1;
    return names.map((name, index) => {
      const share = rawWeights[index] / totalWeight;
      const offset = ((index * 3 + countryIndex) % 7) - 3;
      const production = country.production * period.production * share;
      const selfSufficiency = clamp(country.selfSufficiency + offset * .035, .3, 1.55);
      const loss = clamp(country.loss + period.loss + offset * 1.18, 6, 42);
      const hdds = clamp(country.hdds + period.hdds + offset * .16, 2.4, 8.2);
      const fortification = clamp(country.fortification + period.fortification + offset * 2.1, 18, 100);
      const income = Math.round(country.income * (1 + offset * .055));
      return {
        name,
        code: country.code + '-' + (index + 1),
        parentCode: country.code,
        production,
        needs: production / selfSufficiency,
        selfSufficiency,
        loss,
        hdds,
        fortification,
        income,
        diversity: clamp(country.diversity + offset * .24, 2.1, 8),
        households: Math.max(250, Math.round(country.households * share)),
        priceIndex: clamp(108 + loss * .85 - income / 28 + period.price + offset * 2, 65, 180),
        mix: country.mix,
        share,
        index,
        type: 'district'
      };
    });
  }

  function weightedMix(rows) {
    const total = sum(rows, (row) => row.production) || 1;
    return DATA.cropNames.map((_, cropIndex) => sum(rows, (row) => row.production * row.mix[cropIndex]) / total);
  }

  function compareBadge(value, baseline, unit, inverse) {
    const difference = value - baseline;
    if (unit === 'pts') {
      const sign = difference > .04 ? '+' : difference < -.04 ? '−' : '±';
      const label = sign === '±' ? 'dans la moyenne' : sign + fmt(Math.abs(difference), 1) + ' pts vs moyenne régionale';
      return { label, positive: inverse ? difference < 0 : difference > 0, neutral: Math.abs(difference) <= .04 };
    }
    const relative = baseline ? (difference / baseline) * 100 : 0;
    const sign = relative > .45 ? '+' : relative < -.45 ? '−' : '±';
    return {
      label: sign === '±' ? 'dans la moyenne' : sign + fmt(Math.abs(relative), 0) + '% vs moyenne régionale',
      positive: inverse ? difference < 0 : difference > 0,
      neutral: Math.abs(relative) <= .45
    };
  }

  function buildKpis(state, rows, country, focusedRow, period) {
    const anchors = DATA.regionalAnchors;
    const regionalMeans = {
      production: average(DATA.countries, (item) => item.production),
      loss: average(DATA.countries, (item) => item.loss),
      hdds: average(DATA.countries, (item) => item.hdds),
      fortification: average(DATA.countries, (item) => item.fortification),
      biodiversity: anchors.biodiversity / DATA.countries.length
    };
    const scopeIsRegion = state.mode === 'region';
    const base = scopeIsRegion ? {
      production: anchors.production * period.production,
      loss: clamp(anchors.loss + period.loss, 5, 45),
      hdds: clamp(anchors.hdds + period.hdds, 2.2, 9),
      fortification: 61 + period.fortification,
      biodiversity: anchors.biodiversity,
      income: average(DATA.countries, (item) => item.income),
      households: anchors.households
    } : {
      production: focusedRow ? focusedRow.production : country.production * period.production,
      loss: focusedRow ? focusedRow.loss : clamp(country.loss + period.loss, 5, 45),
      hdds: focusedRow ? focusedRow.hdds : clamp(country.hdds + period.hdds, 2.2, 9),
      fortification: focusedRow ? focusedRow.fortification : clamp(country.fortification + period.fortification, 15, 100),
      biodiversity: Math.round(anchors.biodiversity * (focusedRow ? focusedRow.production : country.production * period.production) / 66),
      income: focusedRow ? focusedRow.income : country.income,
      households: focusedRow ? focusedRow.households : country.households
    };

    const coverage = DATA.fortificationFoods.map((item) => {
      const regionalValue = item.value;
      const value = scopeIsRegion
        ? regionalValue
        : clamp(regionalValue * (base.fortification / 61), 4, 100);
      return Object.assign({}, item, { value: Math.round(value) });
    });
    const coverageCount = scopeIsRegion
      ? anchors.fortificationCount
      : coverage.filter((item) => item.value >= 40).length;
    const productionMix = scopeIsRegion ? weightedMix(rows) : (focusedRow ? country.mix : country.mix);
    const productionBadge = scopeIsRegion
      ? { label: state.year === '2023' ? 'Campagne de référence 2023' : '+4,1 % vs 2023', positive: true }
      : compareBadge(base.production, regionalMeans.production, '%', false);
    const lossBadge = scopeIsRegion
      ? { label: '−1,2 pt vs 2023', positive: true }
      : compareBadge(base.loss, regionalMeans.loss, '%', true);
    const hddsBadge = scopeIsRegion
      ? { label: '−0,3 pt vs 2023', positive: false }
      : compareBadge(base.hdds, regionalMeans.hdds, 'pts', false);
    const fortBadge = scopeIsRegion
      ? { label: '3 aliments au seuil suivi', positive: true }
      : compareBadge(base.fortification, regionalMeans.fortification, '%', false);
    const biodiversityBadge = scopeIsRegion
      ? { label: '6 200 variétés recensées', positive: true }
      : compareBadge(base.biodiversity, regionalMeans.biodiversity, '%', false);

    const lostTonnes = scopeIsRegion ? anchors.lostTonnes * period.production : base.production * base.loss / 100;
    const lossValue = scopeIsRegion ? anchors.lossValueBillion : Math.max(.02, lostTonnes / anchors.lostTonnes * anchors.lossValueBillion);
    const focusLabel = focusedRow ? ' · ' + focusedRow.name : '';
    const kpis = [
      {
        id: 'production', tone: 'green', label: 'Production céréalière estimée (App)',
        value: numberWithUnit(base.production, 1),
        sub: scopeIsRegion ? 'Déclarations terrain · repère régional consolidé' : 'Déclarations et relevés des agents agricoles' + focusLabel,
        badge: productionBadge,
        mini: { mix: productionMix }
      },
      {
        id: 'loss', tone: 'red', label: 'Pertes post-récolte (suivi App)',
        value: fmt(base.loss, 0) + '%',
        sub: fmt(lostTonnes, 1) + ' M t estimées · ' + fmt(lossValue, 1) + ' Md USD de valeur exposée',
        badge: lossBadge,
        mini: { value: base.loss, target: 15 }
      },
      {
        id: 'hdds', tone: 'amber', label: 'Diversité alimentaire des ménages (HDDS)',
        value: fmt(base.hdds, 1) + ' / 12',
        sub: 'Objectif OMS / FAO : ≥ 6 groupes d’aliments',
        badge: hddsBadge,
        mini: { value: base.hdds, target: 6, max: 12 }
      },
      {
        id: 'fortification', tone: 'cyan', label: 'Fortification des denrées de base',
        value: coverageCount + ' / 5',
        sub: coverage.slice(0, 3).map((item) => item.label + ' ' + item.value + '%').join(' | '),
        badge: fortBadge,
        mini: { coverage }
      },
      {
        id: 'biodiversity', tone: 'violet', label: 'Espèces & variétés documentées par l’App',
        value: fmt(base.biodiversity, 0),
        sub: 'Sur 30 000 espèces comestibles connues dans la région',
        badge: biodiversityBadge,
        mini: { cultivated: 38, decline: 11, undocumented: 51 }
      }
    ];

    return { items: kpis, summary: base, coverage, lostTonnes, regionalMeans };
  }

  function build(state) {
    const period = periodEffect(state);
    const country = DATA.byCode[state.country] || DATA.byCode.NE;
    const countryIndex = DATA.countries.findIndex((item) => item.code === country.code);
    const nationalRows = DATA.countries.map((item, index) => makeCountryRow(item, index, period));
    const districtRows = makeDistrictRows(country, Math.max(0, countryIndex), period);
    const rows = state.mode === 'country' ? districtRows : nationalRows;
    const focusedRow = state.mode === 'country' && state.zone
      ? districtRows.find((row) => row.name === state.zone) || null
      : null;
    const kpis = buildKpis(state, nationalRows, country, focusedRow, period);
    const current = kpis.summary;
    const targetName = state.mode === 'country' ? country.name : 'Afrique de l’Ouest';
    const regionLabel = state.mode === 'country'
      ? country.name + (focusedRow ? ' · ' + focusedRow.name : '')
      : 'Afrique de l’Ouest';
    const chartRows = rows;
    const totalProduction = sum(chartRows, (row) => row.production);
    const totalLosses = current.loss;
    const historyBase = state.mode === 'country' ? current.production : current.production;
    const historyYears = Array.from({ length: 10 }, (_, index) => 2015 + index);
    const historyFactors = [.73, .76, .79, .83, .85, .84, .9, .93, .97, 1];
    const history = historyYears.map((year, index) => {
      const total = historyBase * historyFactors[index];
      const mix = state.mode === 'country' ? country.mix : weightedMix(nationalRows);
      return {
        year,
        values: mix.map((percent) => total * percent / 100),
        total
      };
    });
    const avgPrice = average(chartRows, (row) => row.priceIndex);
    const priceHeat = DATA.priceCrops.map((crop, cropIndex) => ({
      crop,
      values: DATA.months.map((_, monthIndex) => {
        const seasonal = [92, 91, 94, 98, 108, 119, 129, 133, 121, 108, 99, 95][monthIndex];
        const cropOffset = (cropIndex - 1.5) * 4;
        const modeOffset = state.mode === 'country' ? current.loss * .52 - 9 : 0;
        return Math.round(clamp(seasonal + cropOffset + modeOffset + period.price + (avgPrice - 108) * .12, 70, 180));
      })
    }));

    const radar = state.mode === 'country' ? [
      clamp(current.production / (country.production / country.selfSufficiency) * 72, 18, 100),
      clamp(78 - current.loss * .65, 20, 88),
      clamp(current.hdds / 8 * 100, 20, 90),
      clamp(current.income / 13, 20, 95),
      clamp(42 + current.fortification * .34, 25, 85),
      clamp(52 + country.diversity * 5, 30, 90),
      clamp(55 + current.fortification * .23, 25, 82)
    ] : [62, 58, 49, 57, 52, 72, 61];

    const scorecard = [
      { key: 'autosufficiency', label: 'Autosuffisance', value: clamp((current.production / (focusedRow ? focusedRow.needs : state.mode === 'country' ? current.production / country.selfSufficiency : 52.4)) * 100, 20, 150), target: 100, max: 150, display: fmt(current.production / (focusedRow ? focusedRow.needs : state.mode === 'country' ? current.production / country.selfSufficiency : 52.4) * 100, 0) + '%' },
      { key: 'hdds', label: 'Score HDDS', value: current.hdds, target: 6, max: 12, display: fmt(current.hdds, 1) + ' / 12' },
      { key: 'loss', label: 'Pertes post-récolte', value: current.loss, target: 15, max: 40, reverse: true, display: fmt(current.loss, 0) + '%' },
      { key: 'fortification', label: 'Fortification', value: current.fortification, target: 80, max: 100, display: fmt(current.fortification, 0) + '%' },
      { key: 'price', label: 'Indice des prix', value: avgPrice, target: 100, max: 180, reverse: true, display: fmt(avgPrice, 0) + ' / 100' },
      { key: 'income', label: 'Revenu agricole', value: current.income, target: 800, max: 1500, display: '$' + fmt(current.income, 0) }
    ];

    return {
      meta: {
        mode: state.mode,
        countryCode: country.code,
        countryName: country.name,
        focusName: focusedRow ? focusedRow.name : null,
        regionLabel,
        targetName,
        year: String(state.year || '2024'),
        granularity: state.granularity || 'annual',
        quarter: state.quarter || 3,
        sampleCount: state.mode === 'region' ? DATA.regionalAnchors.households : (focusedRow ? focusedRow.households : country.households),
        updatedLabel: 'Enquêtes ménages & rendements saisis en ligne'
      },
      kpis,
      rows: chartRows,
      nationalRows,
      districtRows,
      country,
      current,
      totalProduction,
      totalLosses,
      history,
      historyYears,
      radar,
      priceHeat,
      scorecard,
      coverage: kpis.coverage,
      productionMix: state.mode === 'country' ? country.mix : weightedMix(nationalRows),
      period,
      selectedZone: state.zone || null,
      seasons: DATA.seasons,
      months: DATA.months,
      foods: DATA.foods.map((food) => Object.assign({}, food, {
        focus: state.mode === 'country'
          ? (FOOD_FOCUS[country.code] || []).includes(food.name)
          : ['Mil', 'Sorgho', 'Maïs', 'Niébé'].includes(food.name)
      })),
      nutrients: DATA.nutrients,
      cropNames: DATA.cropNames,
      fortificationFoods: DATA.fortificationFoods,
      regionalAnchors: DATA.regionalAnchors
    };
  }

  FAO.model = { build, format: fmt, clamp };
})(window);
