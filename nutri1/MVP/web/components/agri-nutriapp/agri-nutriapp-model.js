/* =====================================================================
 * AgriNutri · Modèle de vue
 * ---------------------------------------------------------------------
 * Porte l'état du tableau de bord (périmètre régional ou pays sélectionné)
 * et calcule, pour chaque graphique, les séries adaptées au périmètre :
 *  - Vue Globale (16 pays) : agrégats régionaux, comparaisons entre pays ;
 *  - Vue Détaillée (pays) : décomposition par régions / districts du pays.
 * Toutes les fonctions sont pures : elles ne touchent pas au DOM.
 *
 * Expose : window.AgriNutriModel
 * ===================================================================== */
(function () {
  'use strict';

  const D = window.AgriNutriData;
  const COUNTRIES = D.COUNTRIES;
  const REGION_PRICE = D.ANCHORS.price;

  /* Pondérations des régions d'un pays (somme = 1) et ajustements des autres métriques */
  const UNIT_WEIGHTS = [0.34, 0.28, 0.22, 0.16];
  const UNIT_TILT = [1, 0.4, -0.3, -0.9];

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);
  const byCode = (code) => COUNTRIES.find((c) => c.code === code) || null;

  /* Unités administratives d'un pays : valeurs dérivées des agrégats nationaux */
  function unitsOf(c) {
    return c.regions.map(function (name, i) {
      const tilt = 1 + 0.06 * UNIT_TILT[i];
      const prod = c.prod * UNIT_WEIGHTS[i];
      return {
        name: name,
        prod: prod,
        needs: prod / Math.max(0.05, c.ss * tilt),
        price: Math.round(c.price * (1 + 0.04 * UNIT_TILT[i])),
        loss: c.loss * (1 + 0.05 * UNIT_TILT[i]),
        hdds: c.hdds * (1 + 0.04 * UNIT_TILT[i] * 0.6),
        div: Math.max(0, Math.min(10, c.div * (1 + 0.05 * UNIT_TILT[i]))),
        rev: c.rev * (1 + 0.08 * UNIT_TILT[i]),
        mnt: c.mnt * (1 - 0.04 * UNIT_TILT[i]),
        garden: Math.max(0, Math.min(100, c.garden * (1 - 0.06 * UNIT_TILT[i]))),
        ss: c.ss * tilt,
        code: c.code
      };
    });
  }

  /* Modèle : état + calculs dérivés */
  const Model = {
    state: { scope: 'region', code: null, period: 'annuel' },

    /* Bascule le périmètre ('region' | 'country') et le pays actif */
    setScope(scope, code) {
      this.state.scope = scope;
      if (scope === 'country') this.state.code = code || this.state.code || COUNTRIES[0].code;
      else this.state.code = null;
    },
    setCountry(code) {
      this.state.scope = 'country';
      this.state.code = code;
    },
    isCountry() { return this.state.scope === 'country' && !!this.country(); },
    country() { return this.state.code ? byCode(this.state.code) : null; },
    countries() { return COUNTRIES; },

    /* Agrégats régionaux (16 pays) — base de comparaison */
    regionTotals() {
      const P = sum(COUNTRIES.map((c) => c.prod));
      const N = sum(COUNTRIES.map((c) => c.prod / c.ss));
      const prev = sum(COUNTRIES.map((c) => c.prod / (1 + c.growth / 100)));
      return {
        prod: P,
        needs: N,
        ss: P / N,
        growth: (P / prev - 1) * 100,
        price: REGION_PRICE,
        loss: D.ANCHORS.loss,
        mnt: D.ANCHORS.mnt,
        hdds: D.ANCHORS.hdds
      };
    },

    /* KPI 1 à 5 : valeur, sous-label et badge selon le périmètre */
    kpis() {
      const R = this.regionTotals();
      const c = this.country();
      if (!c) {
        return {
          scope: 'region',
          cereal: { value: R.prod, unit: 'Mt', badge: { dir: 'up', text: '+' + R.growth.toFixed(1) + '% vs 2023' } },
          price: { value: D.ANCHORS.price, unit: 'FCFA/kg', badge: { dir: 'up', text: '+' + D.ANCHORS.priceSeason + '% vs normale saisonnière' } },
          ss: { value: D.ANCHORS.ss, unit: '%', target: 100, badge: { dir: 'neutral', text: 'Taux moyen régional' } },
          mnt: { value: D.ANCHORS.mnt, unit: '%', badge: { dir: 'up', text: '+' + D.ANCHORS.mntDelta + ' pts vs 2022' } },
          loss: { value: D.ANCHORS.loss, unit: '%', badge: { dir: 'good', text: '3,4 Mds USD perdus / an' } }
        };
      }
      const prodPrev = c.prod / (1 + c.growth / 100);
      const mntPrev = c.mnt - c.mntDelta;
      return {
        scope: 'country',
        cereal: { value: c.prod, unit: 'Mt', badge: { dir: c.growth >= 0 ? 'up' : 'down', text: (c.growth >= 0 ? '+' : '') + c.growth.toFixed(1) + '% vs 2023', cmp: 'Écart vs région : ' + ((c.prod / R.prod) * 100).toFixed(1) + '% du total' } },
        price: { value: c.price, unit: 'FCFA/kg', badge: { dir: c.price > REGION_PRICE ? 'up' : 'good', text: (c.price >= REGION_PRICE ? '+' : '') + Math.round((c.price / REGION_PRICE - 1) * 100) + '% vs moyenne régionale' } },
        ss: { value: Math.round(c.ss * 100), unit: '%', target: 100, badge: { dir: c.ss * 100 >= R.ss * 100 ? 'good' : 'down', text: (c.ss * 100 >= R.ss * 100 ? '+' : '') + Math.round(c.ss * 100 - R.ss * 100) + ' pts vs moyenne régionale (' + Math.round(R.ss * 100) + ' %)' } },
        mnt: { value: c.mnt, unit: '%', badge: { dir: 'up', text: '+' + c.mntDelta.toFixed(1) + ' pts vs 2022', cmp: 'Régional : ' + D.ANCHORS.mnt + '%' } },
        loss: { value: c.loss, unit: '%', badge: { dir: c.loss > D.ANCHORS.loss ? 'down' : 'good', text: 'Cible < 10% · Régional : 22%' } },
        prodPrev: prodPrev, mntPrev: mntPrev
      };
    },

    /* Chart 1 — Production vs Besoins : pays (vue globale) ou régions (vue pays) */
    productionVsNeeds() {
      const c = this.country();
      if (!c) {
        const rows = COUNTRIES.map((x) => ({ label: x.code, name: x.name, prod: x.prod, needs: x.prod / x.ss }));
        return rows;
      }
      return unitsOf(c).map((u) => ({ label: u.name, name: u.name, prod: u.prod, needs: u.needs }));
    },

    /* Chart 2 — Heatmap : ratio prix / normale par commodité et par mois */
    priceHeatmap() {
      const c = this.country();
      const adj = c ? c.price / REGION_PRICE : 1;
      return D.COMMODITIES.map(function (name) {
        return { name: name, values: D.SEASON_PROFILE[name].map(function (v) { return v * (1 + (adj - 1) * 0.6); }), harvest: D.HARVEST_MONTHS[name] || [] };
      });
    },

    /* Chart 3 — Gantt : calendrier agricole + pluviométrie + malnutrition */
    calendar() {
      const c = this.country();
      const rainK = c ? c.rain / 1000 : 1;
      return {
        crops: D.CROPS_CALENDAR,
        rain: D.RAIN_MONTHLY.map(function (v) { return v * (c ? rainK * 1.1 : 1); }),
        malnutrition: D.MALNUTRITION_PEAK.map(function (v) { return v * (c ? 0.9 + (c.mnt / 40) : 1); }),
        leanSeason: D.LEAN_SEASON
      };
    },

    /* Chart 4 — Scatter : diversité des cultures vs HDDS (R² ≈ 0,67) */
    diversityScatter() {
      const c = this.country();
      if (!c) return COUNTRIES.map((x) => ({ label: x.name, x: x.div, y: x.hdds }));
      return unitsOf(c).map((u) => ({ label: u.name, x: u.div, y: u.hdds }));
    },

    /* Chart 5 — Waterfall des pertes : étapes, pertes à l'échelle du périmètre */
    wasteWaterfall() {
      const c = this.country();
      const k = c ? c.loss / D.ANCHORS.loss : 1;
      return D.WASTE_STAGES.map((s) => ({ name: s.name, loss: s.loss * k }));
    },

    /* Chart 6 — Paired bar : consommation avec / sans jardin potager */
    gardenPairs() {
      const c = this.country();
      const k = c ? c.garden / 35.5 : 1;
      return D.FOOD_GROUPS.map((g) => ({ name: g.name, garden: Math.min(100, g.garden * (0.9 + 0.1 * k)), none: g.none }));
    },

    /* Chart 7 — Dual axis : prix du mil vs insécurité alimentaire (24 mois) */
    priceInsecurity() {
      const c = this.country();
      const k = c ? c.price / REGION_PRICE : 1;
      return {
        labels: D.SERIES_24M.labels,
        price: D.SERIES_24M.price.map((p) => Math.round(p * k)),
        insecurity: D.SERIES_24M.insecurity.map((v) => Number((v * (c ? 0.6 + 0.4 * k : 1)).toFixed(1)))
      };
    },

    /* Chart 8 — Funnel de fortification, ajusté par l'autosuffisance */
    fortificationFunnel() {
      const c = this.country();
      const k = c ? c.ss / 0.73 : 1;
      return D.FORTIFICATION_FUNNEL.map((s, i) => ({ name: s.name, value: i === 0 ? 100 : Math.min(100, Math.round(s.value * k)) }));
    },

    /* Chart 9 — Stacked area : production 2014-2024 par culture */
    productionHistory() {
      const c = this.country();
      const k = c ? c.prod / D.ANCHORS.prod : 1;
      const total = D.CAMPAIGN_TOTAL.map((t) => t * k);
      const shares = D.CAMPAIGN_SHARE;
      const series = Object.keys(shares).map(function (name) {
        return { name: name, values: total.map(function (t) { return t * shares[name]; }) };
      });
      return { labels: D.CAMPAIGNS, series: series, total: total };
    },

    /* Chart 10 — Bubble : pertes vs revenu net ; taille = production */
    lossVsIncome() {
      const c = this.country();
      if (!c) return COUNTRIES.map((x) => ({ label: x.name, x: x.loss, y: x.rev, r: x.prod }));
      return unitsOf(c).map((u) => ({ label: u.name, x: u.loss, y: u.rev, r: u.prod }));
    },

    /* Chart 11 — Lollipop : autosuffisance (%) par pays ou région */
    selfSufficiency() {
      const c = this.country();
      const rows = c ? unitsOf(c).map((u) => ({ label: u.name, value: u.ss * 100 })) : COUNTRIES.map((x) => ({ label: x.code, name: x.name, value: x.ss * 100 }));
      return rows.sort((a, b) => b.value - a.value);
    },

    /* Chart 12 — Treemap : production par culture et zone (Mt) */
    cropTreemap() {
      const c = this.country();
      const k = c ? c.prod / D.ANCHORS.prod : 1;
      const out = [];
      D.CROPS_PRODUCTION.forEach(function (cr) {
        const share = D.ZONE_SHARE[cr.name] || [1 / 3, 1 / 3, 1 / 3];
        D.ZONES.forEach(function (z, i) {
          out.push({ crop: cr.name, zone: z, value: cr.mt * k * share[i], color: cr.color });
        });
      });
      return out;
    },

    /* Chart 13 — Radar : 6 axes ; périmètre actif vs moyenne régionale */
    systemsRadar() {
      function scores(list) {
        const ss = avg(list.map((x) => x.ss)) * 100;
        const loss = avg(list.map((x) => x.loss));
        const garden = avg(list.map((x) => x.garden));
        const div = avg(list.map((x) => x.div));
        const rev = avg(list.map((x) => x.rev));
        const mnt = avg(list.map((x) => x.mnt));
        return [
          Math.min(100, ss),                       // Production
          Math.max(0, 100 - loss * 2.5),           // Durabilité (pertes)
          Math.min(100, div * 10),                 // Diversité nutritive
          Math.min(100, rev / 16),                 // Économie
          Math.min(100, garden * 1.6),             // Équité (accès aux jardins)
          Math.max(0, 100 - mnt * 2.5)             // Prévention obésité / MNT
        ];
      }
      const region = scores(COUNTRIES);
      const c = this.country();
      return {
        axes: ['Production', 'Durabilité', 'Diversité nutritive', 'Économie', 'Équité', 'Prévention MNT'],
        region: region,
        current: c ? scores([c]) : null,
        label: c ? c.name : 'Région'
      };
    },

    /* Chart 14 — Dumbbell : prix 2020 vs 2024 */
    priceDumbbell() {
      const c = this.country();
      const k = c ? c.price / REGION_PRICE : 1;
      return D.DUMBBELL_COMMODITIES.map((d) => ({ name: d.name, p2020: Math.round(d.p2020 * k), p2024: Math.round(d.p2024 * k) }));
    },

    /* Chart 15 — Scorecard : indicateurs, statut et tendance */
    scorecard() {
      const c = this.country();
      return D.SCORECARD.map(function (s) {
        let value = s.value;
        if (c) {
          if (s.label.indexOf('Production') === 0) value = c.prod;
          else if (s.label.indexOf('Autosuffisance') === 0) value = c.ss * 100;
          else if (s.label.indexOf('Pertes') === 0) value = c.loss;
          else if (s.label.indexOf('Prix') === 0) value = c.price;
          else if (s.label.indexOf('HDDS') === 0) value = c.hdds;
          else if (s.label.indexOf('Diversité') === 0) value = c.div;
          else if (s.label.indexOf('Double') === 0) value = c.mnt;
          else if (s.label.indexOf('jardin') === 0) value = c.garden;
        }
        const progress = s.good === 'up' ? value / s.target : s.target / value;
        const status = progress >= 0.95 ? 'good' : progress >= 0.75 ? 'warn' : 'bad';
        return Object.assign({}, s, { current: value, status: status });
      });
    },

    /* Sparklines des KPI : mini-séries Canvas */
    kpiSeries() {
      const c = this.country();
      const k = c ? c.prod / D.ANCHORS.prod : 1;
      return {
        cereal: D.CROPS_PRODUCTION.slice(0, 4).map((cr) => ({ name: cr.name, value: cr.mt * k, color: cr.color })),
        price: D.SERIES_24M.price.slice(12).map((p) => p * (c ? c.price / REGION_PRICE : 1)),
        ss: [61, 63, 65, 66, 68, 70, 71, 73],
        mnt: [13.9, 14.6, 15.2, 15.8, 16.4, 17.0, 17.8, 18.4],
        loss: [29, 28, 27, 26, 25, 24, 23, 22]
      };
    }
  };

  window.AgriNutriModel = Model;
})();
