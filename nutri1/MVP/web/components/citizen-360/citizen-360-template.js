/* ============================================================================
   NUTRI.N°1 — CITIZEN 360 · gabarits HTML
   ----------------------------------------------------------------------------
   Tous les textes passent par C360_I18N.t() / .loc() : aucun data-i18n, aucun
   onclick inline. Le contrôleur utilise la délégation d'événements dans le
   Shadow DOM, ce qui permet de re-rendre intégralement sans perdre d'écouteur.
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.C360_DATA;
  var I = global.C360_I18N;
  var M = global.C360_MODEL;
  var C = global.C360_CHARTS;

  function t(k, p) { return I.t(k, p); }
  function loc(o) { return I.loc(o); }
  function esc(v) { return M.esc(v); }
  function fmt(v, d, lang) { return M.fmt(v, d, lang); }

  function badge(text, variant) {
    return '<span class="c360-badge' + (variant ? ' c360-badge--' + variant : '') + '">' + esc(text) + '</span>';
  }

  function cardHead(title, sub, tools) {
    return '<div class="c360-card__head"><div><h2>' + esc(title) + '</h2>' +
      (sub ? '<p class="c360-card__sub">' + esc(sub) + '</p>' : '') + '</div>' +
      (tools ? '<div class="c360-card__tools">' + tools + '</div>' : '') + '</div>';
  }

  function legend(items) {
    return '<div class="c360-legend">' + items.map(function (x) {
      return '<span class="c360-legend__item"><i class="c360-legend__swatch' + (x.line ? ' c360-legend__swatch--line' : '') + '" style="--swatch:' + esc(x.color) + '"></i>' + esc(x.label) + '</span>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------- header */
  function head(state) {
    var lang = state.lang;
    var periods = [7, 30, 90].map(function (p) {
      return '<button type="button" data-c360-period="' + p + '" class="' + (state.period === p ? 'is-active' : '') + '" aria-pressed="' + (state.period === p) + '">' + esc(t('period.' + p)) + '</button>';
    }).join('');

    return '<header class="c360-head">' +
      '<div class="c360-head__identity">' +
        '<div class="c360-eyebrow">' + esc(t('head.kicker')) + '</div>' +
        '<h1>' + esc(t('head.title')) + '</h1>' +
        '<p class="c360-head__sub">' + esc(t('head.sub')) + '</p>' +
        '<div class="c360-head__badges">' +
          badge(t('badge.premium'), 'gold') +
          badge(t('badge.demo'), 'lime') +
          badge(t('badge.privacy')) +
          '<span class="c360-badge c360-badge--live"><i class="c360-badge__dot"></i>' + esc(t('badge.live')) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="c360-head__controls">' +
        '<div class="c360-toolbar">' +
          '<span class="c360-tag" title="' + esc(t('period.label')) + '">' + esc(t('period.label')) + '</span>' +
          '<div class="c360-segment" role="group" aria-label="' + esc(t('period.label')) + '">' + periods + '</div>' +
          '<div class="c360-segment" role="group" aria-label="' + esc(t('lang.label')) + '">' +
            '<button type="button" data-c360-lang="fr" class="' + (lang === 'fr' ? 'is-active' : '') + '">' + esc(t('lang.fr')) + '</button>' +
            '<button type="button" data-c360-lang="en" class="' + (lang === 'en' ? 'is-active' : '') + '">' + esc(t('lang.en')) + '</button>' +
          '</div>' +
          '<button type="button" class="c360-btn c360-btn--ghost" data-c360-action="refresh" title="' + esc(t('btn.refresh')) + '">⟲ ' + esc(t('btn.refresh')) + '</button>' +
          '<button type="button" class="c360-btn c360-btn--primary" data-c360-action="export-csv">↧ ' + esc(t('btn.export')) + '</button>' +
        '</div>' +
        '<div class="c360-meta">' +
          '<span>' + esc(t('head.updated')) + ' · <b>' + esc(state.updatedLabel) + '</b></span>' +
          '<span>' + esc(t('head.country')) + ' · <b>' + esc(state.countryLabel) + '</b></span>' +
          '<span>' + esc(t('head.confidence')) + ' · <b>96,4 %</b></span>' +
        '</div>' +
      '</div>' +
    '</header>';
  }

  /* --------------------------------------------------------------- hero */
  function hero(state) {
    var rings = state.scoreRings || [];
    var signals = D.signals.map(function (s) {
      return '<div class="c360-signal c360-signal--' + esc(s.tone) + '">' +
        '<div class="c360-signal__icon">' + esc(s.icon) + '</div>' +
        '<div class="c360-signal__body"><b>' + esc(loc(s.title)) + '</b><span>' + esc(loc(s.detail)) + '</span></div>' +
        '<div class="c360-signal__delta">' + esc(s.delta) + '</div>' +
      '</div>';
    }).join('');

    var ringRows = rings.map(function (r) {
      return '<div class="c360-ring-row"><span>' + esc(t(r.key)) + '</span><b>' + esc(fmt(r.value, 0, state.lang)) + '%</b>' +
        '<div class="c360-ring-track"><i style="width:' + r.value + '%;background:linear-gradient(90deg,' + r.color + ',rgba(255,255,255,.35))"></i></div></div>';
    }).join('');

    return '<article class="c360-card c360-card--12 c360-hero">' +
      '<div class="c360-hero__grid">' +
        '<div>' +
          '<div class="c360-hero__score">' +
            '<div class="c360-gauge-wrap">' + C.gauge(state.score, rings, { aria: t('hero.scoreLabel'), title: t('hero.scoreLabel') }) +
              '<div class="c360-gauge-center"><b>' + esc(fmt(state.score, 0, state.lang)) + '</b><small>' + esc(t('hero.scoreUnit')) + '</small><span>' + esc(t('hero.improvement')) + '</span></div>' +
            '</div>' +
            '<div class="c360-hero__intro">' +
              '<div class="c360-eyebrow">' + esc(t('hero.eyebrow')) + '</div>' +
              '<h2>' + esc(t('hero.greeting')) + '</h2>' +
              '<p>' + esc(t('hero.intro')) + '</p>' +
              '<div class="c360-hero__rings">' + ringRows + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="c360-hero__actions">' +
            '<button type="button" class="c360-btn c360-btn--primary" data-c360-action="plan">🥗 ' + esc(t('btn.plan')) + '</button>' +
            '<button type="button" class="c360-btn" data-c360-action="consult">👩🏾‍⚕️ ' + esc(t('btn.consult')) + '</button>' +
            '<span class="c360-tag c360-tag--info">' + esc(t('hero.nextReview')) + '</span>' +
          '</div>' +
        '</div>' +
        '<div>' +
          cardHead(t('signals.title'), t('signals.sub'), '<span class="c360-tag c360-tag--good">' + esc(t('hero.target')) + '</span>') +
          '<div class="c360-signals">' + signals + '</div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ---------------------------------------------------------------- KPI */
  function kpis(state) {
    var s = state.series;
    function last(key) {
      var arr = s[key];
      return arr && arr.length ? arr[arr.length - 1] : null;
    }
    var b = M.bmi(state.measures.weight, state.measures.height);
    var items = [
      { key: 'kpi.bmi', value: b != null ? fmt(b, 1, state.lang) : '—', unit: 'kg/m²', ref: t('kpi.ref.bmi'), delta: '−0,4', cls: '', color: '#c9ee59', spark: s.weight },
      { key: 'kpi.glucose', value: fmt(last('glucose'), 1, state.lang), unit: 'mmol/L', ref: t('kpi.ref.glucose'), delta: '−0,2', cls: 'c360-kpi__delta--down', color: '#5cc8ff', spark: s.glucose },
      { key: 'kpi.bp', value: fmt(last('systolic'), 0, state.lang) + '/' + fmt(last('diastolic'), 0, state.lang), unit: 'mmHg', ref: t('kpi.ref.bp'), delta: '−4', cls: 'c360-kpi__delta--down', color: '#a78bfa', spark: s.systolic },
      { key: 'kpi.diversity', value: fmt(last('diversity'), 0, state.lang), unit: '/100', ref: t('kpi.ref.diversity'), delta: '+6 pts', cls: '', color: '#34d399', spark: s.diversity }
    ];
    return items.map(function (it) {
      return '<article class="c360-card c360-card--3 c360-kpi" style="--kpi-accent:' + it.color + '">' +
        '<div class="c360-kpi__label">' + esc(t(it.key)) + '</div>' +
        '<div class="c360-kpi__value"><b>' + esc(it.value) + '</b><span>' + esc(it.unit) + '</span></div>' +
        '<div class="c360-kpi__foot"><span class="c360-kpi__delta ' + it.cls + '">' + esc(it.delta) + ' ' + esc(t('kpi.delta.vs')) + '</span><span class="c360-kpi__ref">' + esc(it.ref) + '</span></div>' +
        '<div class="c360-spark">' + C.sparkline(it.spark, { color: it.color, aria: t(it.key) }) + '</div>' +
      '</article>';
    }).join('');
  }

  /* ------------------------------------------------------- energy chart */
  function energyCard(state) {
    var bars = M.energyBars(state.series, 12);
    var xf = state.period === 7
      ? function (o) { return M.weekdayLabel(o, state.lang); }
      : function (o) { return M.dateLabel(o, state.lang, { day: '2-digit', month: 'short' }); };
    var xLabels = bars.map(function (b) { return xf(b.offset); });
    var svg = C.stackedBars(bars, {
      lang: state.lang,
      target: 2100,
      targetLabel: t('chart.energy.target'),
      unit: t('chart.energy.unit'),
      xLabels: xLabels,
      segmentLabels: ['breakfast', 'lunch', 'dinner', 'snack'].map(function (k) { return t('chart.energy.meals.' + k); }),
      totalLabel: t('chart.macro.total'),
      colors: ['#c9ee59', '#34d399', '#5cc8ff', '#e8c877'],
      aria: t('chart.energy.title'),
      title: t('chart.energy.title')
    });
    return '<article class="c360-card c360-card--6">' +
      cardHead(t('chart.energy.title'), t('chart.energy.sub'), '<span class="c360-tag c360-tag--lime">' + esc(t('period.' + state.period)) + '</span>') +
      '<div class="c360-chart c360-chart--tall">' + svg + '</div>' +
      legend(['breakfast', 'lunch', 'dinner', 'snack'].map(function (k, i) {
        return { label: t('chart.energy.meals.' + k), color: ['#c9ee59', '#34d399', '#5cc8ff', '#e8c877'][i] };
      })) +
      '<p class="c360-chart-note">' + esc(t('chart.energy.note')) + '</p>' +
    '</article>';
  }

  /* ----------------------------------------------------- clinical chart */
  function clinicalCard(state) {
    var series = M.clinicalSeries(state.series, state.activeSeries).map(function (s) {
      return Object.assign({}, s, { label: t('chart.clinical.series.' + s.key) });
    });
    var xLabels = state.series.labels.map(function (o) { return M.dateLabel(o, state.lang, { day: '2-digit', month: 'short' }); });
    var svg = C.multiLine(series, {
      lang: state.lang,
      xLabels: xLabels,
      indexLabel: t('chart.clinical.index'),
      aria: t('chart.clinical.title'),
      title: t('chart.clinical.title'),
      formatPoint: function (s, i) {
        var raw = state.series[s.key] ? state.series[s.key][i] : s.values[i];
        return fmt(raw, s.decimals, state.lang) + ' ' + s.unit;
      }
    });
    var chips = M.seriesMeta ? Object.keys(M.seriesMeta) : ['weight', 'glucose', 'systolic', 'diversity'];
    var tools = chips.map(function (key) {
      var meta = M.seriesMeta[key];
      var active = state.activeSeries.indexOf(key) !== -1;
      return '<button type="button" class="c360-chip ' + (active ? 'is-active' : '') + '" data-series="' + key + '" aria-pressed="' + active + '">' +
        '<i class="c360-chip__dot" style="--dot:' + meta.color + '"></i>' + esc(t('chart.clinical.series.' + key)) + '</button>';
    }).join('');
    var latest = series.map(function (s) {
      return '<span class="c360-tag">' + esc(s.label) + ' <b style="color:' + s.color + '">' + esc(fmt(s.latest, s.decimals, state.lang) + ' ' + s.unit) + '</b></span>';
    }).join('');
    return '<article class="c360-card c360-card--6">' +
      cardHead(t('chart.clinical.title'), t('chart.clinical.sub'), '<span class="c360-tag c360-tag--info">' + esc(t('chart.clinical.latest')) + '</span>') +
      '<div class="c360-card__tools" style="justify-content:flex-start;margin-bottom:10px">' + tools + '</div>' +
      '<div class="c360-chart c360-chart--tall">' + svg + '</div>' +
      '<div class="c360-legend">' + latest + '</div>' +
      '<p class="c360-chart-note">' + esc(t('chart.clinical.note')) + '</p>' +
    '</article>';
  }

  /* --------------------------------------------------------- macro donut */
  function macroCard(state) {
    var macros = D.macros.map(function (m) { return Object.assign({}, m, { label: t(m.key) }); });
    var total = macros.reduce(function (a, m) { return a + m.kcal; }, 0);
    var svg = C.donut(macros, { lang: state.lang, unit: t('chart.macro.kcal'), aria: t('chart.macro.title'), title: t('chart.macro.title') });
    var rows = macros.map(function (m) {
      var pct = m.target ? (m.grams / m.target) * 100 : 0;
      return '<div class="c360-macro-row">' +
        '<span class="c360-macro-row__name"><i class="c360-legend__swatch" style="--swatch:' + m.color + '"></i>' + esc(m.label) + '</span>' +
        '<span class="c360-macro-row__val">' + esc(fmt(m.grams, 0, state.lang) + ' g · ' + fmt(pct, 0, state.lang) + '% ' + t('chart.macro.target')) + '</span>' +
        '<div class="c360-macro-row__track"><i style="width:' + M.clamp(pct, 0, 100) + '%;--bar:' + m.color + '"></i></div>' +
      '</div>';
    }).join('');
    return '<article class="c360-card c360-card--4">' +
      cardHead(t('chart.macro.title'), t('chart.macro.sub')) +
      '<div class="c360-chart"><div class="c360-donut-wrap">' + svg +
        '<div class="c360-donut-center"><b>' + esc(fmt(total, 0, state.lang)) + '</b><span>' + esc(t('chart.macro.kcal')) + '</span></div>' +
      '</div></div>' +
      '<div class="c360-macro-list">' + rows + '</div>' +
      '<p class="c360-chart-note">' + esc(t('chart.macro.note')) + '</p>' +
    '</article>';
  }

  /* --------------------------------------------------------- micro bars */
  function microCard(state) {
    var items = D.micros.map(function (m) { return Object.assign({}, m, { label: t(m.key) }); });
    var svg = C.microBars(items, {
      lang: state.lang,
      targetLabel: t('chart.micro.target'),
      aria: t('chart.micro.title'),
      title: t('chart.micro.title'),
      seriesLabel: t('chart.micro.achieved')
    });
    return '<article class="c360-card c360-card--4">' +
      cardHead(t('chart.micro.title'), t('chart.micro.sub'), '<span class="c360-tag c360-tag--good">' + esc(t('chart.micro.target')) + '</span>') +
      '<div class="c360-chart c360-chart--medium">' + svg + '</div>' +
    '</article>';
  }

  /* ------------------------------------------------------------- radar */
  function radarCard(state) {
    var svg = C.radar(D.radar, {
      lang: state.lang,
      labels: D.radar.map(function (r) { return t(r.key); }),
      actualLabel: t('chart.radar.actual'),
      aria: t('chart.radar.title'),
      title: t('chart.radar.title')
    });
    return '<article class="c360-card c360-card--4">' +
      cardHead(t('chart.radar.title'), t('chart.radar.sub')) +
      '<div class="c360-chart c360-chart--medium">' + svg + '</div>' +
      legend([
        { label: t('chart.radar.actual'), color: '#34d399' },
        { label: t('chart.radar.target'), color: '#a78bfa', line: true }
      ]) +
    '</article>';
  }

  /* ----------------------------------------------------------- habits */
  function habitsCard(state) {
    var dayLabels = state.lang === 'fr'
      ? ['L', 'M', 'M', 'J', 'V', 'S', 'D']
      : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    var avg = state.hydration.reduce(function (a, b) { return a + b; }, 0) / (state.hydration.length || 1);
    var svg = C.heatmap(state.hydration, {
      lang: state.lang,
      dayLabels: dayLabels,
      weekLabel: state.lang === 'fr' ? 'S' : 'W',
      seriesLabel: t('chart.hydration.good'),
      aria: t('chart.hydration.title'),
      title: t('chart.hydration.title')
    });
    return '<article class="c360-card c360-card--6">' +
      cardHead(t('chart.hydration.title'), t('chart.hydration.sub'),
        '<span class="c360-tag c360-tag--info">' + esc(t('chart.hydration.avg') + ' · ' + fmt(avg, 0, state.lang) + '%') + '</span>') +
      '<div class="c360-chart c360-chart--medium">' + svg + '</div>' +
      legend([
        { label: t('chart.hydration.low'), color: 'rgba(251,113,133,.5)' },
        { label: t('chart.hydration.good'), color: '#34d399' }
      ]) +
    '</article>';
  }

  /* ------------------------------------------------------------- risks */
  function riskCard(state) {
    var risks = D.risks.map(function (r) {
      return Object.assign({}, r, { label: t(r.key), detail: loc(r.detail) });
    });
    var composite = Math.round(risks.reduce(function (a, r) { return a + r.score; }, 0) / risks.length);
    var svg = C.riskBullets(risks, {
      lang: state.lang,
      aria: t('chart.risk.title'),
      title: t('chart.risk.title')
    });
    return '<article class="c360-card c360-card--6">' +
      cardHead(t('chart.risk.title'), t('chart.risk.sub'), '<span class="c360-tag c360-tag--watch">' + esc(t('chart.risk.composite') + ' · ' + fmt(composite, 0, state.lang) + '/100') + '</span>') +
      '<div class="c360-risk-summary"><b>' + esc(fmt(composite, 0, state.lang)) + '</b><span>' + esc(t('chart.risk.composite') + ' · ' + t('chart.risk.trend')) + '</span></div>' +
      '<div class="c360-chart c360-chart--medium">' + svg + '</div>' +
      legend([
        { label: t('chart.risk.low'), color: '#34d399' },
        { label: t('chart.risk.moderate'), color: '#e8c877' },
        { label: t('chart.risk.high'), color: '#fb7185' }
      ]) +
      '<p class="c360-chart-note">⚠️ ' + esc(t('chart.risk.disclaimer')) + '</p>' +
    '</article>';
  }

  /* ------------------------------------------------------------- meals */
  function mealsCard(state) {
    var local = M.localForCountry(state.country);
    var countryLabel = loc(local.country);
    var meals = D.meals.map(function (m) {
      return '<div class="c360-meal">' +
        '<div class="c360-meal__icon">' + esc(m.icon) + '</div>' +
        '<div class="c360-meal__body">' +
          '<div class="c360-meal__time">' + esc(m.time) + '</div>' +
          '<b>' + esc(loc(m.name)) + '</b>' +
          '<div class="c360-meal__foods">' + esc(loc(m.foods)) + '</div>' +
          '<div class="c360-meal__chips">' +
            '<span>' + esc(t('section.meals.protein') + ' ' + m.protein + ' g') + '</span>' +
            '<span>' + esc(t('section.meals.carbs') + ' ' + m.carbs + ' g') + '</span>' +
            '<span>' + esc(t('section.meals.fat') + ' ' + m.fat + ' g') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="c360-meal__kcal"><b>' + esc(fmt(m.kcal, 0, state.lang)) + '</b><span>' + esc(t('section.meals.kcal')) + '</span>' +
          '<div class="c360-meal__score">' + esc(t('section.meals.score') + ' ' + m.score + '/100') + '</div></div>' +
      '</div>';
    }).join('');
    return '<article class="c360-card c360-card--7">' +
      cardHead(t('section.meals.title'), t('section.meals.sub'),
        '<button type="button" class="c360-btn c360-btn--sm" data-c360-action="add-meal">' + esc(t('section.meals.add')) + '</button>') +
      '<div class="c360-meals">' + meals + '</div>' +
      '<div class="c360-local"><b>' + esc(t('section.meals.local')) + '</b>' +
        '<p>' + esc(t('section.meals.localSub', { country: countryLabel })) + '<br><strong style="color:var(--c360-ink)">' +
        esc(local.items.map(function (i) { return loc(i); }).join(' · ')) + '</strong></p></div>' +
    '</article>';
  }

  /* --------------------------------------------------- recommendations */
  function recsCard(state) {
    var recs = D.recommendations.map(function (r, i) {
      return '<div class="c360-rec" style="--rec-accent:' + r.accent + '">' +
        '<div class="c360-rec__top"><b>' + esc(r.icon + ' ' + loc(r.title)) + '</b>' +
          '<span class="c360-tag c360-tag--' + (r.priority === 'high' ? 'high' : r.priority === 'medium' ? 'watch' : 'good') + '">' + esc(t('section.recs.priority.' + r.priority)) + '</span></div>' +
        '<p>' + esc(loc(r.body)) + '</p>' +
        '<div class="c360-rec__foot">' +
          '<span class="c360-rec__evidence">' + esc(t('section.recs.evidence') + ' · ' + loc(r.evidence)) + '</span>' +
          '<button type="button" class="c360-btn c360-btn--sm c360-btn--ghost" data-c360-action="rec" data-c360-index="' + i + '">' + esc(t('section.recs.action')) + ' →</button>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<article class="c360-card c360-card--5">' +
      cardHead(t('section.recs.title'), t('section.recs.sub'), '<span class="c360-tag c360-tag--lime">IA + HUMAIN</span>') +
      '<div class="c360-recs">' + recs + '</div>' +
    '</article>';
  }

  /* ------------------------------------------------------ measurements */
  function field(name, label, value, extra) {
    return '<label class="c360-field"><span>' + esc(label) + '</span>' +
      '<input class="c360-input" type="number" inputmode="decimal" data-c360-field="' + esc(name) + '" value="' + esc(value) + '" ' + (extra || '') + '></label>';
  }

  function calcItem(label, value, unit, status) {
    var statusText = t('section.measure.status.' + status);
    return '<span>' + esc(label) + '</span><b data-c360-calc-value>' + esc(value) + (unit ? ' <small style="font-size:10px;color:var(--c360-faint)">' + esc(unit) + '</small>' : '') + '</b>' +
      '<small class="is-' + esc(status) + '" data-c360-calc-status>' + esc(statusText) + '</small>';
  }

  function measurementsCard(state) {
    var m = state.measures;
    var b = M.bmi(m.weight, m.height);
    var wh = M.whtr(m.waist, m.height);
    var mp = M.mapPressure(m.systolic, m.diastolic);
    var wr = M.whr(m.waist, m.hip);
    var bStatus = M.bmiStatus(b, m.profile);
    var whStatus = wh == null ? 'unknown' : (wh <= .5 ? 'good' : wh <= .58 ? 'watch' : 'high');
    var bpStatus = M.bpStatus(m.systolic, m.diastolic);
    var wrStatus = wr == null ? 'unknown' : (wr <= .85 ? 'good' : wr <= .95 ? 'watch' : 'high');

    var profileOptions = [
      ['female', t('section.measure.profile.adultFemale')],
      ['male', t('section.measure.profile.adultMale')],
      ['child', t('section.measure.profile.child')]
    ].map(function (o) {
      return '<option value="' + o[0] + '" ' + (m.profile === o[0] ? 'selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');

    return '<article class="c360-card c360-card--6">' +
      cardHead(t('section.measure.title'), t('section.measure.sub'), '<span class="c360-tag c360-tag--info">' + esc(t('section.measure.reference')) + '</span>') +
      '<div class="c360-form-grid">' +
        '<label class="c360-field"><span>' + esc(t('section.measure.profile')) + '</span><select class="c360-select" data-c360-field="profile">' + profileOptions + '</select></label>' +
        field('age', t('section.measure.age'), m.age, 'min="1" max="120" step="1"') +
        field('weight', t('section.measure.weight'), m.weight, 'min="1" step=".1"') +
        field('height', t('section.measure.height'), m.height, 'min="30" step="1"') +
        field('waist', t('section.measure.waist'), m.waist, 'min="20" step=".1"') +
        field('hip', t('section.measure.hip'), m.hip, 'min="20" step=".1"') +
        field('glucose', t('section.measure.glucose'), m.glucose, 'min="1" step=".1"') +
        field('hba1c', t('section.measure.hba1c'), m.hba1c, 'min="2" step=".1"') +
        field('systolic', t('section.measure.systolic'), m.systolic, 'min="50" step="1"') +
        field('diastolic', t('section.measure.diastolic'), m.diastolic, 'min="30" step="1"') +
        field('cholesterol', t('section.measure.chol'), m.cholesterol, 'min="1" step=".1"') +
      '</div>' +
      '<div class="c360-form-actions"><button type="button" class="c360-btn c360-btn--primary" data-c360-action="save">✓ ' + esc(t('section.measure.save')) + '</button>' +
        '<span class="c360-tag c360-tag--good">' + esc(t('hero.scoreLabel') + ' · ' + fmt(state.score, 0, state.lang) + '/100') + '</span></div>' +
      '<div class="c360-calc">' +
        '<div class="c360-calc__item" data-c360-calc="bmi">' + calcItem(t('section.measure.result.bmi'), b == null ? '—' : fmt(b, 1, state.lang), 'kg/m²', bStatus, state.lang) + '</div>' +
        '<div class="c360-calc__item" data-c360-calc="whtr">' + calcItem(t('section.measure.result.whtr'), wh == null ? '—' : fmt(wh, 2, state.lang), '', whStatus, state.lang) + '</div>' +
        '<div class="c360-calc__item" data-c360-calc="map">' + calcItem(t('section.measure.result.map'), mp == null ? '—' : fmt(mp, 0, state.lang), 'mmHg', bpStatus, state.lang) + '</div>' +
        '<div class="c360-calc__item" data-c360-calc="whr">' + calcItem(t('section.measure.result.whr'), wr == null ? '—' : fmt(wr, 2, state.lang), '', wrStatus, state.lang) + '</div>' +
      '</div>' +
      '<p class="c360-disclaimer">⚠️ ' + esc(t('section.measure.disclaimer')) + '</p>' +
    '</article>';
  }

  /* ------------------------------------------------------------ family */
  function familyCard(state) {
    var child = D.family[state.child] || D.family.child1;
    var options = Object.keys(D.family).map(function (k) {
      var c = D.family[k];
      return '<option value="' + k + '" ' + (state.child === k ? 'selected' : '') + '>' + esc(c.name + ' — ' + c.age + ' ' + (state.lang === 'fr' ? 'ans' : 'y')) + '</option>';
    }).join('');
    var svg = C.growthCurve(child, {
      lang: state.lang,
      ageUnit: state.lang === 'fr' ? 'ans' : 'y',
      unit: 'kg/m²',
      childLabel: t('chart.growth.child'),
      aria: t('section.family.growthChart'),
      title: t('section.family.growthChart')
    });
    return '<article class="c360-card c360-card--6">' +
      cardHead(t('section.family.title'), t('section.family.sub'), '<span class="c360-tag c360-tag--info">🔐 ' + esc(t('section.family.badge')) + '</span>') +
      '<div class="c360-family">' +
        '<div class="c360-family__side">' +
          '<label class="c360-field"><span>' + esc(t('section.family.member')) + '</span><select class="c360-select c360-family__select" data-c360-child>' + options + '</select></label>' +
          '<div class="c360-family__avatar">' + esc(child.icon) + '</div>' +
          '<div class="c360-family__stats">' +
            '<div class="c360-family__stat"><span>' + esc(t('section.family.height')) + '</span><b>' + esc(fmt(child.height, 0, state.lang) + ' cm') + '</b></div>' +
            '<div class="c360-family__stat"><span>' + esc(t('section.family.weight')) + '</span><b>' + esc(fmt(child.weight, 1, state.lang) + ' kg') + '</b></div>' +
            '<div class="c360-family__stat"><span>' + esc(t('section.family.bmi')) + '</span><b>' + esc(fmt(child.bmi, 1, state.lang)) + '</b></div>' +
            '<div class="c360-family__stat"><span>' + esc(t('section.family.percentile')) + '</span><b>P' + esc(fmt(child.percentile, 0, state.lang)) + '</b></div>' +
          '</div>' +
        '</div>' +
        '<div class="c360-family__main">' +
          '<div class="c360-family__badges">' +
            '<span class="c360-tag c360-tag--good">' + esc(t('section.family.growth') + ' · ' + loc(child.growth)) + '</span>' +
            '<span class="c360-tag c360-tag--watch">' + esc(t('section.family.alerts') + ' · ' + loc(child.alerts)) + '</span>' +
          '</div>' +
          '<div class="c360-chart c360-chart--medium">' + svg + '</div>' +
          '<div class="c360-family__lines">' +
            '<div class="c360-family__line"><span>' + esc(t('section.family.nutrition')) + '</span><b>' + esc(loc(child.nutrition)) + '</b></div>' +
          '</div>' +
          '<div class="c360-family__actions">' +
            '<button type="button" class="c360-btn c360-btn--sm" data-c360-action="family-access">🔐 ' + esc(t('section.family.request')) + '</button>' +
            '<button type="button" class="c360-btn c360-btn--sm c360-btn--primary" data-c360-action="family-plan">📋 ' + esc(t('section.family.plan')) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ------------------------------------------------------------ footer */
  function footer(state) {
    return '<footer class="c360-foot">' +
      '<div class="c360-foot__left"><b>' + esc(t('foot.title')) + '</b>' + esc(t('foot.source')) + '<br>' + esc(t('foot.disclaimer')) + '</div>' +
      '<div class="c360-foot__actions">' +
        '<span class="c360-tag">' + esc(t('foot.lastSync') + ' · ' + state.updatedLabel) + '</span>' +
        '<button type="button" class="c360-btn c360-btn--sm" data-c360-action="export-csv">' + esc(t('foot.btn.csv')) + '</button>' +
        '<button type="button" class="c360-btn c360-btn--sm" data-c360-action="export-pdf">' + esc(t('foot.btn.pdf')) + '</button>' +
        '<button type="button" class="c360-btn c360-btn--sm c360-btn--ghost" data-c360-action="print">' + esc(t('btn.print')) + '</button>' +
      '</div>' +
    '</footer>';
  }

  /* ------------------------------------------------------------- shell */
  function shell(state) {
    return '<div class="c360-root" data-c360-root data-c360-lang="' + esc(state.lang) + '">' +
      '<div class="c360-aurora" aria-hidden="true"></div>' +
      head(state) +
      '<div class="c360-grid">' +
        hero(state) +
        kpis(state) +
        energyCard(state) +
        clinicalCard(state) +
        macroCard(state) +
        microCard(state) +
        radarCard(state) +
        habitsCard(state) +
        riskCard(state) +
        mealsCard(state) +
        recsCard(state) +
        measurementsCard(state) +
        familyCard(state) +
      '</div>' +
      footer(state) +
      '<div class="c360-toasts" data-c360-toasts aria-live="polite"></div>' +
    '</div>';
  }

  global.C360_TEMPLATE = {
    shell: shell,
    head: head,
    hero: hero,
    kpis: kpis,
    footer: footer,
    measurementsCard: measurementsCard
  };
})(window);
