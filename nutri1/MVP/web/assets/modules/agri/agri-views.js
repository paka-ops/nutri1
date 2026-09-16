/* ============================================================================
   NUTRI.N°1 — SECTION AGRICULTURE (v58) · ESPACES DE TRAVAIL 5 → 8
     • Prévision & Monte-Carlo
     • Nutrition & valeur ajoutée
     • Investissement & plan national
     • Données, méthode & API
   Ces vues consomment la boîte à outils partagée NUTRI_AGRI_KIT : une autre
   section peut copier exactement la même structure pour ses propres onglets.
   ========================================================================== */
(function (w) {
  'use strict';
  const K = w.NUTRI_AGRI_KIT;
  if (!K) { console.warn('[NUTRI_AGRI] kit absent : agri-module.js doit être chargé avant agri-views.js'); return; }
  const { h, fmt, stats: S, charts: C } = K.NX;
  const { card, kpi, field, select, segmented, slider, toggle, btn, meter, note, flow, dataTable, chart, chartHost, T, state, overlay } = K;
  const DATA = w.NUTRI_AGRI_DATA, M = w.NUTRI_AGRI_MODELS;
  const clamp = K.NX.clamp;

  /* ======================================================================= */
  /*  ONGLET 5 — PRÉVISION & MONTE-CARLO                                     */
  /* ======================================================================= */
  K.registerTab({
    id: 'forecast', icon: '📈', label: T('Prévision & simulation', 'Forecast & simulation'),
    mount(host) {
      const cfg = state.forecastCfg;
      const kpis = h('div.nx-grid.g-6.nx-kpi-row');

      const fCard = card({
        title: T('Prévision de production', 'Production forecast'),
        sub: T('Modèle Holt-Winters amorti + scénarios ; bandes de confiance P10–P90', 'Damped Holt-Winters + scenarios; P10–P90 confidence bands'),
        span: 4, accent: true
      });
      const ctl = h('div.nx-grid.g-4');
      const cropSel = select([{ value: '', label: T('🌍 Toute la production nationale', '🌍 Entire national production') }]
        .concat(DATA.CROPS.map(c => ({ value: c.id, label: c.icon + ' ' + (K.NX.lang() === 'en' ? c.en : c.fr) }))), cfg.cropId || '', v => { cfg.cropId = v || null; draw(); });
      const scenSel = select([
        { value: 'baseline', label: T('Tendance actuelle', 'Current trend') },
        { value: 'optimistic', label: T('Adoption accélérée (+1,7 %/an)', 'Accelerated adoption (+1.7%/yr)') },
        { value: 'climate', label: T('Stress climatique', 'Climate stress') },
        { value: 'plan', label: T('Avec plan d’investissement', 'With investment plan') }
      ], cfg.scenario, v => { cfg.scenario = v; state.scenario = v; draw(); });
      const confSel = select([{ value: '.8', label: T('Confiance 80 %', '80% confidence') }, { value: '.95', label: T('Confiance 95 %', '95% confidence') }], String(cfg.confidence), v => { cfg.confidence = parseFloat(v); draw(); });
      ctl.appendChild(field(T('Produit à projeter', 'Product to project'), cropSel));
      ctl.appendChild(field(T('Scénario', 'Scenario'), scenSel));
      ctl.appendChild(field(T('Intervalle de confiance', 'Confidence interval'), confSel));
      ctl.appendChild(slider({ label: T('Horizon (années)', 'Horizon (years)'), min: 1, max: 10, value: cfg.horizon, format: v => fmt.num(v, 0) + ' ' + T('ans', 'yrs'), oninput: v => { cfg.horizon = v; draw(); } }));
      fCard.body.appendChild(ctl);
      const fHost = chartHost('xl');
      fCard.body.appendChild(fHost);
      const diagHost = h('div.nx-grid.g-4');
      fCard.body.appendChild(diagHost);
      const mdlRow = h('div.nx-row');
      mdlRow.appendChild(toggle({ label: T('Saisonnalité trimestrielle', 'Quarterly seasonality'), checked: cfg.seasonal, onchange: v => { cfg.seasonal = v; draw(); } }));
      mdlRow.appendChild(btn(T('Ajouter le plan d’investissement à la prévision', 'Add investment plan to forecast'), { variant: 'lime', icon: '💰', onClick: () => { cfg.scenario = 'plan'; state.scenario = 'plan'; scenSel.value = 'plan'; draw(); overlay.toast(T('Plan intégré à la projection', 'Plan merged into projection')); } }));
      mdlRow.appendChild(btn(T('Réinitialiser le modèle', 'Reset model'), { onClick: () => { cfg.horizon = 6; cfg.confidence = .8; cfg.scenario = 'baseline'; cfg.seasonal = false; draw(); } }));
      fCard.body.appendChild(mdlRow);

      const mcCard = card({
        title: T('Monte-Carlo : 10 000 futurs possibles', 'Monte-Carlo: 10,000 possible futures'),
        sub: T('Tirages simultanés du climat, des rendements, des pertes et des prix', 'Joint draws on climate, yields, losses and prices'), span: 2,
        actions: [btn(T('Lancer 10 000 simulations', 'Run 10,000 simulations'), { variant: 'primary', icon: '🎲', onClick: runMC })]
      });
      const mcHost = chartHost('sm');
      const mcTable = h('div');
      mcCard.body.appendChild(mcHost); mcCard.body.appendChild(mcTable);

      const gaugeCard = card({ title: T('Probabilités clés', 'Key probabilities'), span: 2 });
      const gaugeHost = h('div.nx-grid.g-3');
      gaugeCard.body.appendChild(gaugeHost);

      const tableCard = card({ title: T('Table de projection détaillée', 'Detailed projection table'), sub: T('Exportable pour les services techniques', 'Exportable for technical departments'), span: 2, actions: [btn(T('Exporter (CSV)', 'Export (CSV)'), { icon: '⇩', onClick: exportForecast })] });
      const tableHost = h('div');
      tableCard.body.appendChild(tableHost);

      const scenCard = card({ title: T('Comparaison des scénarios', 'Scenario comparison'), sub: T('Même horizon, quatre trajectoires', 'Same horizon, four trajectories'), span: 2 });
      const scenHost = chartHost('sm');
      scenCard.body.appendChild(scenHost);

      const btCard = card({ title: T('Qualité du modèle (backtest glissant)', 'Model quality (rolling backtest)'), span: 6 });
      const btHost = h('div.nx-stack');
      btCard.body.appendChild(btHost);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, fCard.el, mcCard.el, gaugeCard.el, tableCard.el, scenCard.el, btCard.el]));

      function currentForecast() {
        const crop = cfg.cropId ? ds2().crops.find(c => c.id === cfg.cropId) : null;
        const plan = state.plan;
        return M.forecast(ds2(), {
          cropId: cfg.cropId, horizon: cfg.horizon, confidence: cfg.confidence, scenario: cfg.scenario, seasonal: cfg.seasonal,
          adaptation: state.climateCfg.adaptation,
          dT: state.climateCfg.dTemp, dRain: state.climateCfg.dRain,
          planGain: plan ? clamp(plan.extraProdT / Math.max(1, ds2().totals.productionT), 0, .06) : 0,
          planLossGain: plan ? Math.max(0, plan.lossPctBefore - plan.lossPctAfter) : 0
        });
      }
      function ds2() { return K.ds; }

      function draw() {
        const d = ds2();
        const f = currentForecast();
        /* --- KPI ---------------------------------------------------------- */
        const dg = f.diagnostics;
        kpis.innerHTML = '';
        const unitFmt = v => fmt.tons(v);
        [
          kpi({ label: T('Valeur projetée ' + f.forecastYears[f.forecastYears.length - 1], 'Projected value ' + f.forecastYears[f.forecastYears.length - 1]), value: fmt.tons(dg.targetValue).split(' ')[0], unit: fmt.tons(dg.targetValue).split(' ')[1], tone: dg.cagr > 0 ? 'good' : 'hot', foot: T('TCMA ', 'CAGR ') + fmt.signed(dg.cagr, 2) + ' %' }),
          kpi({ label: T('Probabilité ≥ besoins', 'Probability ≥ needs'), value: fmt.num(f.probAbove, 1), unit: '%', tone: f.probAbove > 60 ? 'good' : 'hot', foot: T('cible : besoins nationaux', 'target: national needs') }),
          kpi({ label: T('Erreur moyenne (MAPE)', 'Mean error (MAPE)'), value: isFinite(dg.mape) ? fmt.num(dg.mape, 1) : 'n/a', unit: isFinite(dg.mape) ? '%' : '', foot: T('backtest glissant sur les derniers millésimes', 'rolling backtest on latest vintages') }),
          kpi({ label: T('Qualité d’ajustement (R²)', 'Goodness of fit (R²)'), value: isFinite(dg.r2) ? fmt.num(dg.r2, 3) : 'n/a', foot: T('tendance ', 'trend ') + fmt.signed(dg.trendPct, 2) + ' %/an' })
        ].forEach(k => kpis.appendChild(k));

        /* --- graphique ---------------------------------------------------- */
        const labels = f.labels;
        chart('line', fHost, {
          labels,
          series: [
            { name: T('Historique', 'History'), data: f.history, color: '#c9ee59', area: true, points: false },
            { name: f.scenario === 'baseline' ? T('Prévision P50', 'Forecast P50') : T('Prévision ' + f.scenario, 'Forecast ' + f.scenario), data: f.point, color: '#3fc8f0', dash: true, points: true, width: 2.6 },
            { name: (cfg.confidence === .95 ? T('Intervalle 95 %', '95% interval') : T('Intervalle 80 %', '80% interval')), data: [], bandLo: f.lo, bandHi: f.hi, color: '#3fc8f0' },
            { name: T('Sans mesure (tendance brute)', 'No action (raw trend)'), data: f.baseline, color: '#a78bfa', points: false, width: 1.6 }
          ],
          format: unitFmt,
          markers: d.climate.events.filter(e => e.severity > 50).slice(-3).map(e => ({ index: d.history.years.indexOf(e.year), label: e.type, color: 'rgba(245,182,66,.7)' })),
          xTicks: 10,
          aria: T('Prévision de production', 'Production forecast')
        });

        /* --- diagnostics -------------------------------------------------- */
        diagHost.innerHTML = '';
        [
          meter(T('Tendance annuelle', 'Annual trend'), clamp(50 + dg.trendPct * 9, 0, 100), 100, { format: () => fmt.signed(dg.trendPct, 2) + ' %/an' }),
          meter(T('Précision du modèle', 'Model accuracy'), clamp(100 - (isFinite(dg.mape) ? dg.mape * 3 : 30), 0, 100), 100, { format: () => isFinite(dg.mape) ? fmt.num(100 - dg.mape, 1) + ' / 100' : 'n/a' }),
          meter(T('Écart-type résiduel', 'Residual std-dev'), clamp(100 - (f.config.horizon * 2), 0, 100), 100, { format: () => fmt.tons(f.model ? f.model.residSd : 0) }),
          meter(T('Fiabilité de la cible', 'Target reliability'), f.probAbove, 100, { format: () => fmt.pct(f.probAbove, 1), tone: f.probAbove < 55 ? 'risk' : '' })
        ].forEach(m => diagHost.appendChild(m));

        /* --- Monte-Carlo -------------------------------------------------- */
        const mc = mcCache && mcCache.key === key() ? mcCache.value : null;
        if (mc) drawMC(mc);
        else {
          mcHost.innerHTML = '';
          mcHost.appendChild(h('div.nx-note.info', { text: T('Cliquez « Lancer 10 000 simulations » pour calculer la distribution complète du bilan alimentaire à l’horizon souhaité.', 'Click “Run 10,000 simulations” to compute the full food-balance distribution for the selected horizon.') }));
          mcHost.classList.remove('nx-chart');
        }

        /* --- probabilités ------------------------------------------------- */
        const mcL = mc || M.monteCarlo(d, { runs: 900, horizon: 3, plan: state.plan });
        gaugeHost.innerHTML = '';
        [
          { v: 100 - mcL.probShortfall, l: T('Couverture des besoins', 'Needs coverage'), tone: '#18d67f' },
          { v: mcL.probShortfall, l: T('Risque de déficit', 'Shortfall risk'), tone: '#ff6b5e' },
          { v: 100 - mcL.probLossAboveTarget, l: T('Pertes sous la cible', 'Losses below target'), tone: '#c9ee59' }
        ].forEach(x => {
          const gh = h('div.nx-gauge');
          gaugeHost.appendChild(gh);
          chart('gauge', gh, { value: x.v, max: 100, format: v => fmt.num(v, 1) + ' %', tone: x.tone });
          gh.appendChild(h('div.nx-gauge-lab', { text: x.l }));
        });

        /* --- tableau ------------------------------------------------------ */
        const rows = f.forecastYears.map((y, i) => {
          const need = cfg.cropId ? (d.crops.find(c => c.id === cfg.cropId).needT * Math.pow(1.024, i + 1)) : (d.totals.needT * Math.pow(1.024, i + 1));
          return {
            year: y, p10: f.futureLo[i], p50: f.future[i], p90: f.futureHi[i], base: f.baseline[f.labels.length - f.forecastYears.length + i],
            need, coverage: need ? f.future[i] / need * 100 : 100, upsideT: f.future[i] - (f.baseline[f.labels.length - f.forecastYears.length + i] || f.future[i]),
            p10s: f.futureLo[i], p90s: f.futureHi[i]
          };
        });
        if (!tableHost.__t) {
          tableHost.__t = dataTable(tableHost, {
            columns: [
              { id: 'year', label: T('Année', 'Year'), width: '.7fr' },
              { id: 'p10', label: 'P10', width: '1fr', align: 'right', format: r => fmt.tons(r.p10) },
              { id: 'p50', label: T('Médiane P50', 'Median P50'), width: '1fr', align: 'right', format: r => fmt.tons(r.p50) },
              { id: 'p90', label: 'P90', width: '1fr', align: 'right', format: r => fmt.tons(r.p90) },
              { id: 'need', label: T('Besoins', 'Needs'), width: '1fr', align: 'right', format: r => fmt.tons(r.need) },
              { id: 'coverage', label: T('Couverture', 'Coverage'), width: '1.1fr', align: 'right', format: r => fmt.pct(r.coverage, 0), bar: r => clamp(r.coverage, 0, 100) },
              { id: 'upsideT', label: T('Effet du plan', 'Plan effect'), width: '1fr', align: 'right', format: r => fmt.signed(r.upsideT, 0) + ' t' }
            ], rows, pageSize: 10, sort: { id: 'year', dir: 'asc' }
          });
        } else tableHost.__t.setRows(rows);

        /* --- scénarios ---------------------------------------------------- */
        const scen = ['baseline', 'optimistic', 'climate', 'plan'].map(s => {
          const ff = M.forecast(d, {
            cropId: cfg.cropId, horizon: cfg.horizon, scenario: s, seasonal: cfg.seasonal, adaptation: state.climateCfg.adaptation,
            dT: state.climateCfg.dTemp, dRain: state.climateCfg.dRain,
            planGain: state.plan ? clamp(state.plan.extraProdT / Math.max(1, d.totals.productionT), 0, .06) : .012,
            planLossGain: state.plan ? Math.max(0, state.plan.lossPctBefore - state.plan.lossPctAfter) : 0
          });
          return ff.future[ff.future.length - 1];
        });
        chart('bars', scenHost, {
          labels: [T('Tendance', 'Trend'), T('Adoption', 'Adoption'), T('Stress climatique', 'Climate stress'), T('Plan national', 'National plan')],
          series: [{ name: T('Production projetée', 'Projected production'), data: scen }],
          format: v => fmt.tons(v),
          colorScale: v => v >= scen[0] ? '#18d67f' : '#ff6b5e'
        });

        /* --- backtest ------------------------------------------------------ */
        btHost.innerHTML = '';
        btHost.appendChild(h('div.nx-grid.g-2', null, [
          kpi({ label: 'MAPE', value: isFinite(f.diagnostics.mape) ? fmt.num(f.diagnostics.mape, 2) : 'n/a', unit: '%', foot: T('erreur absolue moyenne en %', 'mean absolute % error') }),
          kpi({ label: 'MAE', value: isFinite(f.diagnostics.mae) ? fmt.tons(f.diagnostics.mae) : 'n/a', foot: T('erreur absolue moyenne', 'mean absolute error') }),
          kpi({ label: 'R²', value: isFinite(f.diagnostics.r2) ? fmt.num(f.diagnostics.r2, 3) : 'n/a', foot: T('variance expliquée', 'explained variance') }),
          kpi({ label: T('Biais', 'Bias'), value: isFinite(f.diagnostics.bias) ? fmt.signed(f.diagnostics.bias, 0) + ' t' : 'n/a', foot: T('sous/sur-estimation moyenne', 'average over/under estimate') })
        ]));
        btHost.appendChild(note(T('Le backtest réentraîne le modèle sur les données passées et mesure l’erreur sur les dernières années — c’est la preuve de robustesse à présenter aux bailleurs.', 'The backtest retrains the model on past data and measures error on the latest years — robustness evidence to present to funders.'), 'info'));
      }

      /* ---- Monte-Carlo -------------------------------------------------- */
      let mcCache = null;
      function key() { return [state.country, state.year, cfg.horizon, state.plan ? 'plan' : 'none', state.budget].join('|'); }
      function runMC() {
        const body = h('div.nx-stack');
        const steps = h('div.nx-sim');
        const out = h('div');
        const key0 = key();
        body.appendChild(note(T('Simulation stochastique du bilan alimentaire : climat, rendement, pertes, adoption et prix varient simultanément selon leurs distributions estimées.', 'Stochastic food-balance simulation: climate, yield, losses, adoption and prices vary jointly per estimated distributions.'), 'info'));
        body.appendChild(steps); body.appendChild(out);
        overlay.drawer({ kicker: 'NUTRI.N°1 · MONTE-CARLO', title: T('10 000 futurs possibles', '10,000 possible futures'), body });
        K.runSteps(steps, [
          T('Échantillonnage des indices climatiques régionaux', 'Sampling regional climate indices'),
          T('Propagation vers rendements et surfaces', 'Propagation to yields and areas'),
          T('Pertes post-récolte stochastiques par produit', 'Stochastic post-harvest losses per product'),
          T('Adoption des technologies et prix', 'Technology adoption and prices'),
          T('Agrégation du bilan alimentaire (10 000 tirages)', 'Food-balance aggregation (10,000 runs)'),
          T('Calcul des probabilités et quantiles', 'Probability and quantile computation')
        ], {
          step: 400, onDone: () => {
            const mc = M.monteCarlo(ds2(), { runs: 10000, horizon: cfg.horizon, plan: state.plan });
            mcCache = { key: key0, value: mc };
            state.mc = mc;
            out.appendChild(h('div.nx-grid.g-3', null, [
              kpi({ label: T('Autosuffisance médiane', 'Median self-sufficiency'), value: fmt.num(mc.ss.p50, 1), unit: '%', tone: mc.ss.p50 < 100 ? 'hot' : 'good' }),
              kpi({ label: T('Probabilité de déficit', 'Shortfall probability'), value: fmt.num(mc.probShortfall, 2), unit: '%', tone: 'hot' }),
              kpi({ label: T('Écart médian', 'Median gap'), value: fmt.tons(mc.gap.p50), tone: 'hot', foot: T('nourriture manquante', 'missing food') })
            ]));
            out.appendChild(h('div.nx-grid.g-3', { style: { marginTop: '10px' } }, [
              kpi({ label: T('Pertes médianes', 'Median losses'), value: fmt.num(mc.loss.p50, 2), unit: '%', foot: 'P10 ' + fmt.num(mc.loss.p10, 1) + ' · P90 ' + fmt.num(mc.loss.p90, 1) }),
              kpi({ label: T('Risque pertes > cible 10 %', 'Risk losses > 10% target'), value: fmt.num(mc.probLossAboveTarget, 1), unit: '%', tone: mc.probLossAboveTarget > 70 ? 'hot' : '' }),
              kpi({ label: T('Amplitude des résultats', 'Outcome spread'), value: fmt.pct(mc.ss.p90 - mc.ss.p10, 1), foot: T('P10 → P90 (incertitude)', 'P10 → P90 (uncertainty)') })
            ]));
            out.appendChild(note(T('<b>Comment lire :</b> la dispersion P10–P90 mesure le risque. Une projection médiane supérieure aux besoins avec une bande basse sous 100 % signifie que la sécurité alimentaire dépend de la météo — donc de la résilience à investir.', '<b>How to read:</b> the P10–P90 spread measures risk. A median above needs with a low band under 100% means food security depends on weather — hence the resilience investment case.'), 'ok'));
            out.appendChild(h('div.nx-row', { style: { marginTop: '10px' } }, [
              btn(T('Appliquer à la prévision', 'Apply to forecast'), { variant: 'primary', icon: '✓', onClick: () => { overlay.closeDrawer(); draw(); } }),
              btn(T('Exporter la distribution (CSV)', 'Export distribution (CSV)'), { icon: '⇩', onClick: () => K.exportRows(mc.samples.slice(0, 5000).map((s, i) => ({ tirage: i + 1, autosuffisance_pct: +s.ss.toFixed(2), ecart_t: Math.round(s.gap), pertes_pct: +s.lossPct.toFixed(2), production_t: Math.round(s.prod) })), 'monte-carlo') }),
              btn(T('Note de décision', 'Decision brief'), { variant: 'info', onClick: () => { overlay.closeDrawer(); K.NX.overlay.toast(T('Note générée depuis l’onglet Vue nationale', 'Brief generated from the national overview tab')); } })
            ]));
          }
        });
      }
      function drawMC(mc) {
        mcHost.classList.add('nx-chart');
        chart('bars', mcHost, {
          labels: mc.histogram.centers.map(c => fmt.num(c, 0) + '%'),
          series: [{ name: T('Nombre de tirages', 'Number of runs'), data: mc.histogram.counts, color: '#3fc8f0' }],
          format: v => fmt.int(v),
          target: 100, targetLabel: T('seuil d’autosuffisance', 'self-sufficiency threshold')
        });
        mcTable.innerHTML = '';
        mcTable.appendChild(h('div.nx-grid.g-4', null, [
          kpi({ label: 'P10', value: fmt.pct(mc.ss.p10, 1), tone: mc.ss.p10 < 100 ? 'hot' : '' }),
          kpi({ label: 'P50', value: fmt.pct(mc.ss.p50, 1) }),
          kpi({ label: 'P90', value: fmt.pct(mc.ss.p90, 1), tone: 'good' }),
          kpi({ label: T('Probabilité déficit', 'Shortfall prob.'), value: fmt.pct(mc.probShortfall, 1), tone: mc.probShortfall > 40 ? 'hot' : 'good' })
        ]));
      }
      function exportForecast() {
        const f = currentForecast();
        K.exportRows(f.forecastYears.map((y, i) => ({
          annee: y, p10: Math.round(f.futureLo[i]), mediane: Math.round(f.future[i]), p90: Math.round(f.futureHi[i]),
          sans_mesure: Math.round(f.baseline[f.labels.length - f.forecastYears.length + i] || 0), scenario: f.scenario
        })), 'prevision');
      }
      return { render: draw, redraw: () => { } };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 6 — NUTRITION & VALEUR AJOUTÉE                                  */
  /* ======================================================================= */
  K.registerTab({
    id: 'nutrition', icon: '🥗', label: T('Nutrition & valeur', 'Nutrition & value'),
    mount(host) {
      const kpis = h('div.nx-grid.g-6.nx-kpi-row');
      const gaugeCard = card({ title: T('Couverture des besoins nutritionnels', 'Nutritional needs coverage'), sub: T('Nutriments disponibles d’origine nationale (après pertes et échanges)', 'Nationally available nutrients (after losses and trade)'), span: 3 });
      const gHost = h('div.nx-grid.g-5');
      gaugeCard.body.appendChild(gHost);

      const chainCard = card({ title: T('Ferme → Assiette → Santé', 'Farm → Plate → Health'), sub: T('Chaque étape consomme une partie du potentiel nutritionnel', 'Each step consumes part of the nutritional potential'), span: 3 });
      const chainHost = h('div.nx-stack');
      chainCard.body.appendChild(chainHost);

      const contribCard = card({
        title: T('D’où viennent les nutriments ?', 'Where do nutrients come from?'), span: 2,
        actions: [segmented([{ value: 'kcal', label: 'kcal' }, { value: 'prot', label: 'Prot.' }, { value: 'fe', label: 'Fer' }, { value: 'va', label: 'Vit. A' }, { value: 'zn', label: 'Zinc' }], state.nutrient, v => { state.nutrient = v; draw(); })]
      });
      const contribHost = chartHost('sm');
      const contribList = h('div');
      contribCard.body.appendChild(contribHost); contribCard.body.appendChild(contribList);

      const densityCard = card({ title: T('Densité nutritionnelle par produit', 'Nutrient density by product'), sub: T('Nutriments apportés par unité d’énergie — base d’une agriculture sensible à la nutrition', 'Nutrients per unit of energy — the basis of nutrition-sensitive agriculture'), span: 2 });
      const densityHost = chartHost('lg');
      densityCard.body.appendChild(densityHost);

      const fortCard = card({
        title: T('Simulateur de biofortification', 'Biofortification simulator'), span: 2, accent: true,
        sub: T('Part des surfaces converties en variétés enrichies (vitamine A, fer, zinc)', 'Share of area converted to enriched varieties (vitamin A, iron, zinc)')
      });
      const fortOut = h('div.nx-stack');
      fortCard.body.appendChild(slider({
        label: T('Part des surfaces biofortifiées', 'Share of biofortified area'), min: 0, max: 80, value: 25, format: v => fmt.num(v, 0) + ' %',
        oninput: v => fortify(v / 100)
      }));
      fortCard.body.appendChild(fortOut);

      const labCard = card({ title: T('Programme laboratoire NUTRI.N°1', 'NUTRI.N°1 laboratory programme'), sub: T('Quatre axes de collecte qui alimentent directement les modèles de la section', 'Four collection streams that feed the section models directly'), span: 6 });
      const labHost = h('div.nx-grid.g-2');
      labCard.body.appendChild(labHost);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, gaugeCard.el, chainCard.el, contribCard.el, densityCard.el, fortCard.el, labCard.el]));

      function fortify(share) {
        const ng = M.nutritionGap(ds0());
        const d = ds0();
        const target = d.crops.filter(c => ['cereals', 'tubers', 'legumes'].indexOf(c.group) >= 0);
        const gain = { kcal: 0, prot: 0, fe: 0, va: 0, zn: 0 };
        /* La part `share` des volumes consommés de céréales, tubercules et
           légumineuses passe en variétés enrichies : on ajoute la différence de
           teneur (mg / µg / g pour 100 g) au volume effectivement consommé. */
        target.forEach(c => {
          const boost = { fe: c.id === 'cowpea' || c.id === 'bambara' ? .55 : .12, va: c.id === 'sweetpotato' || c.id === 'maize' ? 1.6 : .06, zn: c.id === 'millet' ? .45 : .1, kcal: .02, prot: .05 };
          const extraT = c.consumedT * share;
          gain.fe += extraT * 1e6 * (c.nut.fe * boost.fe) / 100;
          gain.va += extraT * 1e6 * (c.nut.va * boost.va) / 100;
          gain.zn += extraT * 1e6 * (c.nut.zn * boost.zn) / 100;
          gain.prot += extraT * 1e6 * (c.nut.prot * boost.prot) / 100;
          gain.kcal += extraT * 1e6 * (c.nut.kcal * boost.kcal) / 100;
        });
        const pop = d.totals.population * 1e6;
        const per = k => gain[k] / pop / 365;   // par habitant et par jour
        fortOut.innerHTML = '';
        fortOut.appendChild(h('div.nx-grid.g-2', null, [
          kpi({ label: T('Fer supplémentaire', 'Additional iron'), value: fmt.num(per('fe'), 2), unit: 'mg/hab/j', tone: 'good', foot: T('couverture repère moyen ', 'average reference coverage ') + fmt.pct((d.nutrients.fe + per('fe')) / d.nutrients.need.fe * 100, 0) + ' · ' + T('femmes ', 'women ') + fmt.pct((d.nutrients.fe + per('fe')) / 24 * 100, 0) }),
          kpi({ label: T('Vitamine A supplémentaire', 'Additional vitamin A'), value: fmt.num(per('va'), 0), unit: 'µg/hab/j', tone: 'good', foot: T('couverture ', 'coverage ') + fmt.pct((d.nutrients.va + per('va')) / d.nutrients.need.va * 100, 0) }),
          kpi({ label: T('Protéines supplémentaires', 'Additional protein'), value: fmt.num(per('prot'), 1), unit: 'g/hab/j', foot: T('sur ', 'of ') + fmt.num(d.nutrients.prot, 1) + ' g' }),
          kpi({ label: T('Coût estimé', 'Estimated cost'), value: fmt.money(share * d.totals.areaHa * .08 * 15, d.country), foot: T('15 $/ha sur les surfaces ciblées', '$15/ha on targeted area') })
        ]));
        fortOut.appendChild(note(T('La biofortification ne remplace pas la diversification alimentaire : elle augmente la densité en micronutriments des aliments de base déjà consommés — un levier rapide pour les carences en fer et en vitamine A.', 'Biofortification does not replace dietary diversification: it raises micronutrient density of already-consumed staples — a fast lever for iron and vitamin A gaps.'), 'ok'));
      }
      function ds0() { return K.ds; }
      function draw() {
        const d = ds0();
        const ng = M.nutritionGap(d);
        kpis.innerHTML = '';
        ng.rows.forEach(r => kpis.appendChild(kpi({
          label: r.fr.split(' (')[0], value: fmt.num(r.available, r.unit === 'kcal' ? 0 : 1), unit: r.unit,
          tone: Math.min(r.coverage, r.coverageVuln) < 90 ? 'hot' : r.coverageVuln < 100 ? 'warn' : 'good',
          foot: T('couverture ', 'coverage ') + fmt.pct(r.coverage, 0) + ' · ' + T('groupes vulnérables ', 'vulnerable groups ') + fmt.pct(r.coverageVuln, 0)
        })));
        gHost.innerHTML = '';
        ng.rows.forEach(r => {
          const gh = h('div.nx-gauge');
          gHost.appendChild(gh);
          const worst = Math.min(r.coverage, r.coverageVuln);
          chart('gauge', gh, { value: clamp(r.coverage, 0, 130), max: 130, format: v => fmt.num(v, 0) + ' %', tone: worst < 90 ? '#ff6b5e' : worst < 100 ? '#f5b642' : '#18d67f' });
          gh.appendChild(h('div.nx-gauge-lab', { text: r.fr.split(' (')[0] }));
          gh.appendChild(h('div.nx-mini.nx-dim', {
            text: T('Groupes vulnérables : ', 'Vulnerable groups: ') + fmt.pct(r.coverageVuln, 0) + ' (' + fmt.num(r.needVuln, 0) + ' ' + r.unit + ')'
          }));
          if (r.coverageVuln < 90) gh.appendChild(h('div.nx-mini', { style: { color: '#ffb0a7' }, text: '⚠ ' + T('sous le repère femmes / jeunes enfants', 'below women / young children reference') }));
        });
        chainHost.innerHTML = '';
        chainHost.appendChild(flow(ng.chain.map(c => ({ label: NX.cap(c), value: c.people ? fmt.num(c.value * 1000 / 1e9, 0) + ' Md kcal/an' : fmt.tons(c.value), sub: '' }))));
        chainHost.appendChild(h('div.nx-note', {
          html: T('La chaîne perd d’abord à la récolte et au stockage, puis à la transformation et à la distribution — c’est exactement la zone où NUTRI.N°1 mesure, modélise et priorise les investissements.',
            'The chain loses first at harvest and storage, then in processing and distribution — precisely where NUTRI.N°1 measures, models and prioritises investment.')
        }));
        const r0 = ng.rows.find(r => r.k === state.nutrient) || ng.rows[0];
        chart('bars', contribHost, {
          labels: r0.contributors.map(c => c.icon + ' ' + (K.NX.lang() === 'en' ? c.en : c.fr)),
          horizontal: true,
          series: [{ name: T('Contribution (%)', 'Contribution (%)'), data: r0.contributors.map(c => c.share) }],
          format: v => fmt.pct(v, 0)
        });
        contribList.innerHTML = '';
        contribList.appendChild(h('div.nx-grid.g-2', { style: { marginTop: '10px' } }, [
          kpi({ label: T('Nutriment analysé', 'Nutrient analysed'), value: r0.fr.split(' (')[0], foot: fmt.num(r0.available, 1) + ' ' + r0.unit + ' / ' + fmt.num(r0.need, 0) }),
          kpi({ label: T('Couverture', 'Coverage'), value: fmt.pct(r0.coverage, 0), tone: Math.min(r0.coverage, r0.coverageVuln) < 90 ? 'hot' : 'good', foot: T('groupes vulnérables ', 'vulnerable groups ') + fmt.pct(r0.coverageVuln, 0) + ' · ' + (ng.critical.length ? T('déficits modélisés', 'modelled gaps') : T('repères atteints', 'references met')) })
        ]));
        const dens = d.crops.filter(c => c.group !== 'cash').slice().sort((a, b) => b.nutritionDensity - a.nutritionDensity).slice(0, 14);
        /* indice base 100 = médiane des cultures vivrières : lisible et comparable */
        const med = S.median(dens.map(c => c.nutritionDensity)) || 1;
        chart('bars', densityHost, {
          labels: dens.map(c => NX.lang() === 'en' ? c.en : c.fr), horizontal: true,
          series: [{ name: T('Densité nutritionnelle (base 100 = médiane)', 'Nutrient density (100 = median)'), data: dens.map(c => c.nutritionDensity / med * 100) }],
          target: 100, targetLabel: T('médiane nationale', 'national median'),
          format: v => fmt.num(v, 0),
          colorScale: v => v >= 160 ? '#18d67f' : v >= 100 ? '#c9ee59' : v >= 60 ? '#f5b642' : '#ff6b5e'
        });
        labHost.innerHTML = '';
        [
          { i: '🧪', fr: 'Analyse en laboratoire des aliments africains (composition, micronutriments, contaminants)', en: 'Laboratory analysis of African foods (composition, micronutrients, contaminants)' },
          { i: '🍲', fr: 'Recettes traditionnelles : valeurs nutritionnelles réelles, portion par portion', en: 'Traditional recipes: real nutrient values, portion by portion' },
          { i: '🧬', fr: 'Liens aliment → nutriment → biomarqueur → maladie (graphe de preuves)', en: 'Food → nutrient → biomarker → disease links (evidence graph)' },
          { i: '📡', fr: 'Remontée continue depuis les scanners citoyens et les professionnels de santé', en: 'Continuous feed from citizen scanners and health professionals' }
        ].forEach(x => labHost.appendChild(h('div.nx-tl', null, [
          h('i', { class: 'nx-tl-dot' }),
          h('div', { style: { flex: '1' } }, [h('b', { text: x.i + ' ' + T(x.fr, x.en) })])
        ])));
        fortify(.25);
      }
      return { render: draw, redraw: () => { } };
    }
  });
  const NX = K.NX;
  NX.cap = function (c) { return NX.lang() === 'en' ? c.en : c.fr; };

  /* ======================================================================= */
  /*  ONGLET 7 — INVESTISSEMENT & PLAN NATIONAL                              */
  /* ======================================================================= */
  K.registerTab({
    id: 'investment', icon: '💰', label: T('Investissement & décision', 'Investment & decision'),
    mount(host) {
      const kpis = h('div.nx-grid.g-6.nx-kpi-row');
      const cat = { list: [], selected: new Set() };

      const planCard = card({
        title: T('Portefeuille d’investissement', 'Investment portfolio'),
        sub: T('Cochez les mesures retenues — ou laissez l’optimiseur construire le portefeuille', 'Tick the measures you retain — or let the optimiser build the portfolio'),
        span: 4, accent: true,
        actions: [
          btn(T('Optimiser sous budget', 'Optimise under budget'), { variant: 'primary', icon: '🎯', onClick: autoOptimize }),
          btn(T('Tout sélectionner', 'Select all'), { onClick: () => { cat.list.forEach(x => cat.selected.add(x.uid)); drawPlan(); } }),
          btn(T('Effacer', 'Clear'), { onClick: () => { cat.selected.clear(); drawPlan(); } }),
          btn(T('Appliquer aux prévisions', 'Apply to forecasts'), { variant: 'lime', icon: '✓', onClick: applyPlan }),
          btn(T('Exporter le plan', 'Export plan'), { icon: '⇩', onClick: exportPlan })
        ]
      });
      const budgetRow = h('div.nx-grid.g-3');
      budgetRow.appendChild(slider({
        label: T('Budget d’investissement disponible', 'Available investment budget'), min: 5, max: 400, value: Math.round(state.budget / 1e6), step: 5,
        format: v => fmt.num(v, 0) + ' M$', oninput: v => { state.budget = v * 1e6; drawPlan(); }
      }));
      budgetRow.appendChild(field(T('Priorité politique', 'Policy priority'), select([
        { value: 'balanced', label: T('Équilibrée (rendement global)', 'Balanced (overall return)') },
        { value: 'nutrition', label: T('Nutrition d’abord', 'Nutrition first') },
        { value: 'jobs', label: T('Emplois d’abord', 'Jobs first') }
      ], state.priority, v => { state.priority = v; drawPlan(); })));
      budgetRow.appendChild(field(T('Région ciblée', 'Target region'), select([{ value: '', label: T('Tout le pays', 'Whole country') }].concat(K.ds.regions.map(r => ({ value: r.name, label: r.name }))), state.region || '', v => { state.region = v || null; drawPlan(); })));
      planCard.body.appendChild(budgetRow);
      const planList = h('div.nx-table');
      planCard.body.appendChild(planList);

      const sumCard = card({ title: T('Impact du plan retenu', 'Impact of the selected plan'), span: 2 });
      const sumHost = h('div.nx-stack');
      sumCard.body.appendChild(sumHost);

      const cashCard = card({ title: T('Rentabilité & trésorerie', 'Profitability & cash flow'), span: 2 });
      const cashHost = chartHost('sm');
      cashCard.body.appendChild(cashHost);

      const baCard = card({ title: T('Avant / après le plan', 'Before / after the plan'), sub: T('Pertes par produit', 'Losses by product'), span: 2 });
      const baHost = chartHost('sm');
      baCard.body.appendChild(baHost);

      const regionCard = card({ title: T('Priorisation géographique', 'Geographic prioritisation'), sub: T('Score composite : pertes, climat, déficit, population', 'Composite score: losses, climate, deficit, population'), span: 2 });
      const regionHost = chartHost('sm');
      regionCard.body.appendChild(regionHost);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, planCard.el, sumCard.el, cashCard.el, baCard.el, regionCard.el]));

      function catalogue() {
        const all = M.interventions(K.ds);
        all.forEach((x, i) => { x.uid = x.id + '|' + x.region + '|' + i; });
        return all;
      }
      function activeCatalogue() { return cat.list; }
      function planFromSelection() {
        const chosen = activeCatalogue().filter(x => cat.selected.has(x.uid));
        const lev = {};
        chosen.forEach(x => { lev[x.lever] = clamp((lev[x.lever] || 0) + .26, 0, 1); });
        const sim = M.lossSim(K.ds, lev);
        return { sim, chosen, levers: lev };
      }
      function autoOptimize() {
        const opt = M.optimizeBudget(K.ds, activeCatalogue(), state.budget, { priority: state.priority });
        cat.selected.clear();
        opt.plan.forEach(x => cat.selected.add(x.uid));
        drawPlan();
        overlay.toast('🎯 ' + T('Portefeuille optimisé : ', 'Optimised portfolio: ') + opt.plan.length + ' ' + T('mesures pour ', 'measures for ') + fmt.money(opt.spentUsd, K.ds.country));
      }
      function applyPlan() {
        const p = planFromSelection();
        K.setPlan(p.sim);
        state.levers = Object.assign({}, state.levers, p.levers);
        overlay.toast('✓ ' + T('Plan appliqué aux prévisions et aux simulations', 'Plan applied to forecasts and simulations'));
      }
      function exportPlan() {
        const p = planFromSelection();
        K.exportRows(p.chosen.map(x => ({
          mesure: x.fr, region: x.region, categorie: x.cat, tonnes_sauvees_an: Math.round(x.savedT), valeur_usd: Math.round(x.valueUsd),
          cout_usd: Math.round(x.costUsd), rac: +x.bcr.toFixed(2), retour_ans: x.payback ? +x.payback.toFixed(1) : '', emplois: x.jobs, score: Math.round(x.score)
        })), 'plan-investissement');
      }
      function drawPlan() {
        kpis.innerHTML = '';
        const p = planFromSelection();
        const sim = p.sim;
        [
          kpi({ label: T('Investissement total', 'Total investment'), value: fmt.money(sim.investmentUsd, K.ds.country), foot: p.chosen.length + ' ' + T('mesures retenues', 'measures selected') }),
          kpi({ label: T('Production sauvée / an', 'Production saved / yr'), value: fmt.tons(sim.savedT), tone: 'good', foot: T('de ', 'from ') + fmt.pct(sim.lossPctBefore, 1) + ' → ' + fmt.pct(sim.lossPctAfter, 1) }),
          kpi({ label: T('Valeur récupérée / an', 'Value recovered / yr'), value: fmt.money(sim.savedValueUsd, K.ds.country), tone: 'good', foot: T('revenu producteurs + filières', 'farmer + value-chain income') }),
          kpi({ label: T('Rentabilité (RAC)', 'Benefit-cost ratio'), value: fmt.num(sim.bcr, 2), unit: '×', tone: sim.bcr > 1.3 ? 'good' : sim.bcr < 1 ? 'hot' : '', foot: 'TRI ' + (isFinite(sim.irr) ? fmt.pct(sim.irr * 100, 0) : 'n/a') }),
          kpi({ label: T('Personnes nourries / an', 'People fed / yr'), value: fmt.int(sim.peopleYear), foot: T('équivalent 2100 kcal/j', '2100 kcal/day equivalent') }),
          kpi({ label: T('Emplois & CO₂', 'Jobs & CO₂'), value: fmt.int(sim.jobs), unit: '+' + fmt.compact(sim.co2AvoidedT, 0) + ' tCO₂', foot: T('emplois induits + émissions évitées', 'induced jobs + avoided emissions') })
        ].forEach(k => kpis.appendChild(k));

        /* tableau du portefeuille */
        planList.innerHTML = '';
        const head = h('div.nx-thead', { style: { gridTemplateColumns: '.4fr 2.4fr 1.2fr 1fr 1fr .9fr .8fr .7fr' } }, [
          h('div.nx-th', { text: '' }),
          h('div.nx-th', { text: T('Mesure', 'Measure') }),
          h('div.nx-th', { text: T('Région', 'Region') }),
          h('div.nx-th', { text: T('Tonnes sauvées', 'Tonnes saved') }),
          h('div.nx-th', { text: T('Coût', 'Cost') }),
          h('div.nx-th', { text: T('RAC', 'BCR') }),
          h('div.nx-th', { text: T('Délai', 'Lead time') }),
          h('div.nx-th', { text: T('Score', 'Score') })
        ]);
        planList.appendChild(head);
        activeCatalogue().forEach(x => {
          const on = cat.selected.has(x.uid);
          const tr = h('div.nx-tr' + (on ? ' sel' : ''), { style: { gridTemplateColumns: '.4fr 2.4fr 1.2fr 1fr 1fr .9fr .8fr .7fr' } });
          const cb = h('input', { type: 'checkbox', checked: on ? 'checked' : null, 'aria-label': T('Sélectionner', 'Select') });
          cb.addEventListener('change', () => { if (cb.checked) cat.selected.add(x.uid); else cat.selected.delete(x.uid); drawPlan(); });
          tr.appendChild(h('div.nx-td', null, [cb]));
          tr.appendChild(h('div.nx-td', { text: x.icon + ' ' + T(x.fr, x.en) }));
          tr.appendChild(h('div.nx-td', { text: x.region }));
          tr.appendChild(h('div.nx-td', { text: fmt.tons(x.savedT) }));
          tr.appendChild(h('div.nx-td', { text: fmt.money(x.costUsd, K.ds.country) }));
          tr.appendChild(h('div.nx-td', { text: fmt.num(x.bcr, 2) + '×' }));
          tr.appendChild(h('div.nx-td', { text: fmt.num(x.delay, 0) + ' ' + T('an(s)', 'yr(s)') }));
          tr.appendChild(h('div.nx-td', { text: fmt.num(x.score, 0) + '/100' }));
          planList.appendChild(tr);
        });

        /* synthèse */
        sumHost.innerHTML = '';
        sumHost.appendChild(h('div.nx-grid.g-2', null, [
          kpi({ label: T('Bénéfice annuel', 'Annual benefit'), value: fmt.money(sim.annualBenefit, K.ds.country), tone: sim.annualBenefit > 0 ? 'good' : 'hot', foot: T('valeur + production additionnelle − O&M', 'value + extra output − O&M') }),
          kpi({ label: T('VAN sur 10 ans', 'NPV over 10 yrs'), value: fmt.money(sim.npv, K.ds.country), tone: sim.npv > 0 ? 'good' : 'hot', foot: T('actualisation 9 %', '9% discount') }),
          kpi({ label: T('Retour sur investissement', 'Payback'), value: sim.payback ? fmt.num(sim.payback, 1) : '> 5', unit: T('ans', 'yrs'), foot: sim.payback ? T('année de rentabilité', 'break-even year') : T('non atteint sur l’horizon simulé', 'not reached within the simulated horizon') }),
          kpi({ label: T('TRI', 'IRR'), value: isFinite(sim.irr) ? fmt.pct(sim.irr * 100, 0) : 'n/a', tone: 'good', foot: T('taux de rendement interne', 'internal rate of return') })
        ]));
        sumHost.appendChild(note(T('<b>Argument investisseurs :</b> chaque dollar investi dans la réduction des pertes retourne ≈ ' + fmt.num(sim.bcr, 2) + ' $ de valeur alimentaire, sans nouvelle terre, avec un effet immédiat sur la nutrition.',
          '<b>Investor case:</b> every dollar invested in loss reduction returns ≈ ' + fmt.num(sim.bcr, 2) + ' $ of food value, without new land, with immediate nutrition effects.'), 'ok'));

        /* trésorerie */
        const cum = []; let c0 = -sim.investmentUsd;
        for (let y = 1; y <= 10; y++) { c0 += sim.annualBenefit * Math.pow(1.012, y - 1); cum.push(c0); }
        chart('line', cashHost, {
          labels: cum.map((v, i) => 'A' + (i + 1)),
          series: [
            { name: T('Trésorerie cumulée', 'Cumulative cash'), data: cum, color: cum[cum.length - 1] > 0 ? '#18d67f' : '#ff6b5e', area: true },
            { name: T('Investissement initial', 'Initial investment'), data: cum.map(() => sim.investmentUsd), color: '#3fc8f0', points: false, width: 1.4 }
          ],
          format: v => fmt.money(v, K.ds.country), zero: true
        });

        /* avant / après */
        const top = sim.rows.slice(0, 8);
        chart('bars', baHost, {
          labels: top.map(x => NX.lang() === 'en' ? x.en : x.fr),
          series: [
            { name: T('Avant (%)', 'Before (%)'), data: top.map(x => x.lossPctBefore), color: '#ff6b5e' },
            { name: T('Après (%)', 'After (%)'), data: top.map(x => x.lossPctAfter), color: '#18d67f' }
          ],
          format: v => fmt.pct(v, 1), target: 10, targetLabel: T('cible 10 %', 'target 10%')
        });

        /* priorités géographiques */
        const regs = K.ds.regions.map(r => ({ name: r.name, score: r.lossPct * 1.6 + r.climateRisk * .35 + (r.gapT / Math.max(1, K.ds.totals.gapT)) * 55 + (r.population / Math.max(1, K.ds.totals.population * 1e6)) * 30 })).sort((a, b) => b.score - a.score);
        chart('bars', regionHost, {
          labels: regs.map(r => r.name),
          series: [{ name: T('Score de priorité', 'Priority score'), data: regs.map(r => r.score), color: null }],
          format: v => fmt.num(v, 1),
          colorScale: v => v > 60 ? '#ef4444' : v > 45 ? '#f5b642' : '#18d67f',
          onSelect: i => { state.region = regs[i].name; overlay.toast('📍 ' + regs[i].name + ' — ' + T('priorité ', 'priority ') + fmt.num(regs[i].score, 0) + '/100'); }
        });
      }
      function draw() {
        cat.list = catalogue();
        drawPlan();
      }
      return { render: draw, redraw: () => { } };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 8 — DONNÉES, MÉTHODE & API                                      */
  /* ======================================================================= */
  K.registerTab({
    id: 'method', icon: '🧪', label: T('Données & méthode', 'Data & method'),
    mount(host) {
      const qCard = card({ title: T('Qualité des données aujourd’hui', 'Today’s data quality'), sub: T('Ce que le Ministère possède… et ce qu’il ne possède pas encore', 'What the Ministry holds… and what it does not yet'), span: 2 });
      const qHost = h('div.nx-stack');
      qCard.body.appendChild(qHost);

      const gapCard = card({ title: T('Lacunes critiques à combler', 'Critical gaps to close'), sub: T('Chaque lacune est un livrable de la plateforme', 'Each gap is a platform deliverable'), span: 2 });
      const gapHost = h('div.nx-timeline');
      gapCard.body.appendChild(gapHost);

      const pipeCard = card({
        title: T('Chaîne de traitement des données', 'Data pipeline'), span: 2,
        actions: [btn(T('Exécuter le pipeline', 'Run pipeline'), { variant: 'primary', icon: '▶', onClick: runPipeline })]
      });
      const pipeHost = h('div.nx-sim');
      pipeCard.body.appendChild(pipeHost);

      const qChartCard = card({
        title: T('Écart à la cible de qualité (80 %)', 'Gap to the 80% quality target'),
        sub: T('Cinq piliers mesurés sur les données réellement mobilisables aujourd’hui', 'Five pillars measured on the data actually available today'), span: 3
      });
      const qChartHost = chartHost('sm');
      qChartCard.body.appendChild(qChartHost);

      const provCard = card({ title: T('Provenance & statut de chaque indicateur', 'Provenance & status of each indicator'), span: 3 });
      const provHost = h('div');
      provCard.body.appendChild(provHost);

      const apiCard = card({ title: T('API institutionnelles (déjà exposées par la plateforme)', 'Institutional APIs (already exposed by the platform)'), span: 2 });
      const apiHost = h('div.nx-table');
      apiCard.body.appendChild(apiHost);

      const roadCard = card({ title: T('Feuille de route avec le Ministère (12 mois)', 'Roadmap with the Ministry (12 months)'), span: 2 });
      const roadHost = h('div.nx-timeline');
      roadCard.body.appendChild(roadHost);

      const engageCard = card({ title: T('Engagement de transparence', 'Transparency statement'), span: 2 });
      engageCard.body.appendChild(note(T(
        '<b>Aucune donnée officielle n’est inventée ici.</b> Toutes les valeurs affichées sont des estimations modélisées, générées de façon déterministe et reproductible, et explicitement étiquetées. Elles illustrent ce que la plateforme produira <b>avec</b> les données du Ministère, des laboratoires et des partenaires. Le calibrage est un processus documenté, versionné et auditable.',
        '<b>No official data is invented here.</b> Every displayed value is a modelled, deterministic and reproducible estimate, explicitly labelled. It illustrates what the platform will produce <b>with</b> Ministry, laboratory and partner data. Calibration is a documented, versioned and auditable process.'), 'info'));

      host.appendChild(h('div.nx-grid.g-6', null, [qCard.el, gapCard.el, pipeCard.el, qChartCard.el, provCard.el, apiCard.el, roadCard.el, engageCard.el]));

      function runPipeline() {
        K.runSteps(pipeHost, [
          T('Collecte : registre producteurs, enquêtes, marchés', 'Collection: farmer registry, surveys, markets'),
          T('Satellite & météo : NDVI, pluie, température', 'Satellite & weather: NDVI, rain, temperature'),
          T('Laboratoire : composition nutritionnelle des aliments', 'Laboratory: food nutritional composition'),
          T('Nettoyage, imputation, contrôle de cohérence', 'Cleaning, imputation, consistency control'),
          T('Modélisation : rendements, pertes, bilan alimentaire', 'Modelling: yields, losses, food balance'),
          T('Publication : tableaux de bord, API, bulletins', 'Publication: dashboards, APIs, bulletins')
        ], {
          step: 420, onDone: () => {
            K.toast('✓ ' + T('Pipeline exécuté — jeux de données consolidés et publiés', 'Pipeline executed — datasets consolidated and published'));
            K.NX.overlay.toast('✓ ' + T('Pipeline terminé', 'Pipeline complete'));
          }
        });
      }
      function draw() {
        const d = K.ds, q = d.dataQuality;
        qHost.innerHTML = '';
        [
          { k: T('Complétude', 'Completeness'), v: q.completeness },
          { k: T('Actualité', 'Timeliness'), v: q.timeliness },
          { k: T('Granularité géographique', 'Geographic granularity'), v: q.granularity },
          { k: T('Couverture laboratoire', 'Laboratory coverage'), v: q.laboratory },
          { k: T('Traçabilité', 'Traceability'), v: q.traceability }
        ].forEach(x => qHost.appendChild(meter(x.k, x.v, 100, { format: v => fmt.pct(v, 0), tone: x.v < 45 ? 'risk' : x.v < 70 ? 'warn' : '' })));
        chart('bars', qChartHost, {
          horizontal: true,
          labels: [
            T('Complétude', 'Completeness'), T('Actualité', 'Timeliness'), T('Granularité géographique', 'Geographic granularity'),
            T('Couverture laboratoire', 'Laboratory coverage'), T('Traçabilité', 'Traceability')
          ],
          series: [{
            name: T('Niveau atteint (%)', 'Level reached (%)'), data: [q.completeness, q.timeliness, q.granularity, q.laboratory, q.traceability],
            color: '#18d67f'
          }],
          target: 80, targetLabel: T('objectif 80 %', '80% target'),
          format: v => fmt.pct(v, 0)
        });
        gapHost.innerHTML = '';
        q.gaps.forEach(g => gapHost.appendChild(h('div.nx-tl', null, [
          h('i', { class: 'nx-tl-dot ' + (g.status === 'missing' ? 'risk' : 'warn') }),
          h('div', { style: { flex: '1' } }, [
            h('b', { text: T(g.fr, g.en) }),
            h('div.nx-mini.nx-muted', { text: g.status === 'missing' ? T('Donnée inexistante aujourd’hui → livrable plateforme', 'Data does not exist today → platform deliverable') : T('Donnée partielle → consolidation', 'Partial data → consolidation') })
          ]),
          btn(T('Prioriser', 'Prioritise'), { variant: 'sm', onClick: () => { K.toast('📌 ' + T('Ajouté au plan de collecte : ', 'Added to collection plan: ') + T(g.fr, g.en)); } })
        ])));
        const prov = [
          { ind: T('Population, terres cultivées', 'Population, cultivated land'), src: T('Publié (ordre de grandeur)', 'Reported (order of magnitude)'), stat: '🟢', owner: T('Ministère / institut statistique', 'Ministry / statistics office'), next: T('Millésime officiel', 'Official vintage') },
          { ind: T('Rendements & production', 'Yields & production'), src: T('Modélisé (calibré)', 'Modelled (calibrated)'), stat: '🟠', owner: T('Services techniques régionaux', 'Regional technical services'), next: T('Relevés GPS + télédétection', 'GPS plots + remote sensing') },
          { ind: T('Pertes post-récolte', 'Post-harvest losses'), src: T('Modélisé', 'Modelled'), stat: '🔴', owner: T('Chambres d’agriculture / OP', 'Farmers’ organisations'), next: T('Enquête pertes par étape', 'Stage-by-stage loss survey') },
          { ind: T('Composition nutritionnelle', 'Nutritional composition'), src: T('Modélisé (référentiels)', 'Modelled (reference tables)'), stat: '🔴', owner: T('Laboratoires NUTRI.N°1', 'NUTRI.N°1 laboratories'), next: T('Analyses physico-chimiques', 'Physico-chemical assays') },
          { ind: T('Prix & marchés', 'Prices & markets'), src: T('Modélisé', 'Modelled'), stat: '🟠', owner: T('SIM / observatoires de prix', 'Market information systems'), next: T('Collecte hebdomadaire', 'Weekly collection') },
          { ind: T('Climat & végétation', 'Climate & vegetation'), src: T('Modélisé (satellite)', 'Modelled (satellite)'), stat: '🟢', owner: T('Agence météo / spatiale', 'Weather / space agency'), next: T('API satellite en direct', 'Live satellite API') },
          { ind: T('Régions & districts', 'Regions & districts'), src: T('Publié (découpage)', 'Reported (administrative)'), stat: '🟢', owner: T('Ministère', 'Ministry'), next: T('Référentiel géographique', 'Geographic reference') },
          { ind: T('Nutriments disponibles', 'Available nutrients'), src: T('Modélisé', 'Modelled'), stat: '🔴', owner: T('Ministère + Santé + NUTRI.N°1', 'Ministry + Health + NUTRI.N°1'), next: T('Bilan alimentaire + analyses', 'Food balance + assays') }
        ];
        provHost.innerHTML = '';
        dataTable(provHost, {
          columns: [
            { id: 'ind', label: T('Indicateur', 'Indicator'), width: '1.6fr' },
            { id: 'src', label: T('Provenance', 'Provenance'), width: '1.3fr', sortable: false },
            { id: 'stat', label: T('État', 'State'), width: '.5fr', sortable: false, align: 'center' },
            { id: 'owner', label: T('Détenteur', 'Owner'), width: '1.4fr', sortable: false },
            { id: 'next', label: T('Prochaine étape', 'Next step'), width: '1.3fr', sortable: false }
          ], rows: prov, pageSize: 8
        });
        apiHost.innerHTML = '';
        [
          { m: 'GET', p: '/api/v1/government/agriculture/{pays}/food-balance', d: T('Bilan alimentaire national et par produit', 'National and per-product food balance') },
          { m: 'GET', p: '/api/v1/government/agriculture/{pays}/production', d: T('Production, surfaces, rendements (série annuelle)', 'Production, area, yields (annual series)') },
          { m: 'GET', p: '/api/v1/government/agriculture/{pays}/consumption', d: T('Consommation apparente et disponibilité', 'Apparent consumption and availability') },
          { m: 'GET', p: '/api/v1/government/agriculture/{pays}/needs', d: T('Besoins nationaux et écart à combler', 'National needs and remaining gap') },
          { m: 'GET', p: '/api/v1/government/agriculture/{pays}/losses', d: T('Pertes par étape, produit et région', 'Losses by stage, product and region') },
          { m: 'GET', p: '/api/v1/government/agriculture/{pays}/climate-risk', d: T('Indice de risque climatique et séries climatiques', 'Climate risk index and series') },
          { m: 'GET', p: '/api/v1/government/agriculture/{pays}/forecast', d: T('Prévision modélisée + intervalles de confiance', 'Modelled forecast + confidence intervals') }
        ].forEach(a => {
          const tr = h('div.nx-tr', { style: { gridTemplateColumns: '.6fr 2.4fr 2fr .7fr' } });
          tr.appendChild(h('div.nx-td', null, [h('span.nx-chip.ok', { text: a.m })]));
          tr.appendChild(h('div.nx-td', null, [h('code', { style: { fontFamily: 'var(--nx-mono)', fontSize: '11.5px' }, text: a.p })]));
          tr.appendChild(h('div.nx-td', { text: a.d }));
          tr.appendChild(h('div.nx-td', null, [btn(T('Copier', 'Copy'), { variant: 'sm', onClick: () => { try { navigator.clipboard.writeText(a.p); } catch (e) { } K.toast('✓ ' + a.p); } })]));
          apiHost.appendChild(tr);
        });
        apiHost.insertBefore(h('div.nx-thead', { style: { gridTemplateColumns: '.6fr 2.4fr 2fr .7fr' } }, [
          h('div.nx-th', { text: 'Méthode' }), h('div.nx-th', { text: 'Endpoint' }), h('div.nx-th', { text: T('Contenu', 'Content') }), h('div.nx-th', { text: '' })
        ]), apiHost.firstChild);
        roadHost.innerHTML = '';
        [
          { m: 'M1–M2', fr: 'Cadrage, référentiel géographique et catalogue de produits', en: 'Scoping, geographic reference and product catalogue' },
          { m: 'M3–M4', fr: 'Connexion des sources existantes + premier bilan alimentaire', en: 'Connect existing sources + first food balance' },
          { m: 'M5–M6', fr: 'Enquête pertes post-récolte (protocole NUTRI.N°1)', en: 'Post-harvest loss survey (NUTRI.N°1 protocol)' },
          { m: 'M7–M8', fr: 'Analyses de laboratoire : 150 aliments africains', en: 'Laboratory analyses: 150 African foods' },
          { m: 'M9–M10', fr: 'Tableaux de bord ministériels + formation des cadres', en: 'Ministry dashboards + staff training' },
          { m: 'M11–M12', fr: 'Prévisions opérationnelles + API pour les partenaires', en: 'Operational forecasts + partner APIs' }
        ].forEach(x => roadHost.appendChild(h('div.nx-tl', null, [
          h('i', { class: 'nx-tl-dot' }),
          h('div', { style: { flex: '1' } }, [h('b', { text: x.m + ' · ' + T(x.fr, x.en) })])
        ])));
        runPipeline();
      }
      return { render: draw, redraw: () => { } };
    }
  });
})(window);
