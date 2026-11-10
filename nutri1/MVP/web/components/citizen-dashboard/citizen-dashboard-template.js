/* ============================================================================
 * NUTRI.N°1 — Citizen Health & Nutrition Dashboard 360° · gabarits
 * ----------------------------------------------------------------------------
 * Le module est rendu dans le light DOM de #citizen. Aucun attribut data-i18n :
 * tous les textes passent par CZD_I18N.t(), sinon la couche i18n de la
 * plateforme écraserait les contenus dynamiques.
 *
 *   CZD_TPL.shell(state)      → ossature (en-tête, profils, onglets, panneaux)
 *   CZD_TPL.overview(state)   → vue d'ensemble
 *   CZD_TPL.plan(state)       → plan nutritionnel 7 jours
 *   CZD_TPL.clinical(state)   → analyse clinique & anthropométrique
 *   CZD_TPL.family(state)     → famille & mineurs
 *   CZD_TPL.modal(opts)       → fenêtre explicative
 * ========================================================================== */
(function (global) {
  'use strict';

  var D = global.CZD_DATA;
  var M = global.CZD_MODEL;
  var C = global.CZD_CHARTS;
  var I18N = global.CZD_I18N;

  function t(k, p) { return I18N.t(k, p); }
  function n(v, d) { return I18N.num(v, d); }
  function esc(s) { return C.esc(s); }
  function icon(name, cls) { return C.icon(name, cls); }
  function foodName(f) { return f.name[I18N.lang] || f.name.en; }

  var TONE = {
    good: 'ok', ok: 'ok', optimal: 'ok', normal: 'ok', excellent: 'ok',
    watch: 'warn', elevated: 'warn', prediabetes: 'warn', moderate: 'warn', low: 'warn',
    high: 'alert', obesity: 'alert', diabetes: 'alert', hypertension: 'alert', central: 'alert',
    neutral: 'muted', unknown: 'muted', info: 'info'
  };
  function tone(x) { return TONE[x] || 'muted'; }

  function statusText(key) {
    var map = {
      underweight: 'czd.status.underweight', normal: 'czd.status.normal', overweight: 'czd.status.overweight',
      obesity: 'czd.status.obesity', optimal: 'czd.status.optimal', elevated: 'czd.status.elevated',
      high: 'czd.status.high', low: 'czd.status.low', prediabetes: 'czd.status.prediabetes',
      diabetes: 'czd.status.diabetes', hypertension: 'czd.status.hypertension', central: 'czd.status.central',
      normalRange: 'czd.status.normalRange'
    };
    return map[key] ? t(map[key]) : t('czd.status.normalRange');
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 1. Ossature                                                      */
  /* ══════════════════════════════════════════════════════════════════ */
  function shell(state) {
    return '' +
      '<div class="czd-bento-shell" data-czd-noscan="true">' +
        bentoRail(state) +
        header(state) +
        quickDrawer(state) +
        '<div class="czd-bento-workspace">' +
          panel('overview', state.activeTab === 'overview', overview(state)) +
          panel('plan', state.activeTab === 'plan', '<div class="czd-bento-rich-panel">' + planPanel(state) + '</div>') +
          panel('clinical', state.activeTab === 'clinical', '<div class="czd-bento-rich-panel">' + clinicalPanel(state) + '</div>') +
          panel('family', state.activeTab === 'family', '<div class="czd-bento-rich-panel">' + familyPanel(state) + '</div>') +
        '</div>' +
      '</div>';
  }

  function panel(key, on, inner) {
    return '<section class="czd-panel czd-bento-panel' + (on ? ' is-on' : '') + '" id="czdPanel-' + key + '" data-czd-panel="' + key + '" role="tabpanel" ' +
      'aria-labelledby="czdTab-' + key + '"' + (on ? '' : ' hidden') + '>' + inner + '</section>';
  }

  function legacyHeader(state) {
    var s = state.scores;
    var bandColor = { excellent: '#1a9e63', good: '#3fa36b', watch: '#d98200', risk: '#c0453c' }[s.band];
    var syncLabel = state.sync.last
      ? t('czd.sync.updated', { s: Math.max(1, Math.round((Date.now() - state.sync.last) / 1000)) })
      : t('czd.sync.never');
    return '' +
      '<header class="czd-hero">' +
        '<div class="czd-hero__main">' +
          '<span class="czd-kicker"><i class="czd-kicker__dot"></i>' + esc(t('czd.kicker')) + '</span>' +
          '<h2 class="czd-title">' +
            '<span class="czd-title__emoji" aria-hidden="true">👤</span>' +
            '<span class="czd-title__text">' + esc(t('czd.title').replace(/^👤\s*/, '')) + '</span>' +
          '</h2>' +
          '<p class="czd-sub">' + esc(t('czd.subtitle')) + '</p>' +
          '<div class="czd-badges">' +
            badge('lock', t('czd.badge.local')) +
            badge('check', t('czd.badge.private')) +
            badge('book', t('czd.badge.clinical')) +
            '<span class="czd-chip czd-chip--live" style="--band:' + bandColor + '"><i></i>' +
              esc(t('czd.score.title')) + ' · ' + n(s.global, 0) + '/100 · ' + esc(t('czd.score.' + s.band)) +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="czd-hero__side">' +
          '<div class="czd-lang" role="group" aria-label="Language">' +
            '<button type="button" class="czd-lang__btn' + (I18N.lang === 'fr' ? ' is-on' : '') + '" data-czd-lang="fr" aria-pressed="' + (I18N.lang === 'fr') + '">FR</button>' +
            '<button type="button" class="czd-lang__btn' + (I18N.lang === 'en' ? ' is-on' : '') + '" data-czd-lang="en" aria-pressed="' + (I18N.lang === 'en') + '">EN</button>' +
          '</div>' +
          '<button type="button" class="czd-btn czd-btn--sync" data-czd-act="sync" data-czd-idle="' + esc(t('czd.sync')) + '">' +
            icon('refresh', 'czd-btn__ico') + '<span class="czd-btn__label">' + esc(t('czd.sync')) + '</span>' +
          '</button>' +
          '<span class="czd-sync-state" data-czd-sync>' + esc(syncLabel) + '</span>' +
          '<div class="czd-hero__tools">' +
            '<button type="button" class="czd-iconbtn" data-czd-act="export" title="' + esc(t('czd.export')) + '" aria-label="' + esc(t('czd.export')) + '">' + icon('download') + '</button>' +
            '<button type="button" class="czd-iconbtn" data-czd-act="print" title="' + esc(t('czd.print')) + '" aria-label="' + esc(t('czd.print')) + '">' + icon('print') + '</button>' +
            '<button type="button" class="czd-iconbtn" data-czd-act="reset" title="' + esc(t('czd.reset')) + '" aria-label="' + esc(t('czd.reset')) + '">' + icon('spark') + '</button>' +
          '</div>' +
        '</div>' +
      '</header>';
  }

  function badge(ico, label) {
    return '<span class="czd-badge">' + icon(ico) + esc(label) + '</span>';
  }

  function presets(state) {
    var items = [
      ['balanced', '⚖️', 'czd.preset.balanced'],
      ['risk', '⚠️', 'czd.preset.risk'],
      ['athlete', '🏃🏾‍♀️', 'czd.preset.athlete'],
      ['maternal', '🤰🏾', 'czd.preset.maternal']
    ];
    return '<div class="czd-presets" role="group" aria-label="' + esc(t('czd.preset.title')) + '">' +
      '<span class="czd-presets__label">' + esc(t('czd.preset.title')) + '</span>' +
      items.map(function (it) {
        return '<button type="button" class="czd-preset' + (state.preset === it[0] ? ' is-on' : '') + '" data-czd-preset="' + it[0] + '">' +
          '<span aria-hidden="true">' + it[1] + '</span>' + esc(t(it[2])) + '</button>';
      }).join('') +
    '</div>';
  }

  function tabs(state) {
    var items = [
      ['overview', 'chart', 'czd.tab.overview'],
      ['plan', 'plate', 'czd.tab.plan'],
      ['clinical', 'pulse', 'czd.tab.clinical'],
      ['family', 'family', 'czd.tab.family']
    ];
    return '<nav class="czd-tabs" role="tablist" aria-label="' + esc(t('czd.tab.aria')) + '">' +
      items.map(function (it) {
        var on = state.activeTab === it[0];
        return '<button type="button" class="czd-tab' + (on ? ' is-on' : '') + '" role="tab" id="czdTab-' + it[0] + '" ' +
          'aria-selected="' + on + '" aria-controls="czdPanel-' + it[0] + '" tabindex="' + (on ? '0' : '-1') + '" data-czd-tab="' + it[0] + '">' +
          icon(it[1]) + '<span>' + esc(t(it[2])) + '</span>' +
          (it[0] === 'family' && !state.familyAccess ? '<em class="czd-tab__lock">' + icon('lock') + '</em>' : '') +
        '</button>';
      }).join('') +
      '<span class="czd-tabs__ink" data-czd-ink></span>' +
    '</nav>';
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 2. Vue d'ensemble                                                */
  /* ══════════════════════════════════════════════════════════════════ */
  function legacyOverview(state) {
    return '' +
      '<div class="czd-grid czd-grid--top">' +
        scoreCard(state) +
        profileCard(state) +
        energyCard(state) +
      '</div>' +
      kpiStrip(state) +
      '<div class="czd-grid">' +
        trendAnthropo(state) +
        trendMetabolic(state) +
      '</div>' +
      '<div class="czd-grid czd-grid--three">' +
        habitCard(state) +
        macroCard(state) +
        microCard(state) +
      '</div>' +
      '<div class="czd-grid">' +
        riskCard(state) +
        priorityCard(state) +
      '</div>' +
      '<div class="czd-grid">' +
        glycemicCard(state) +
        badgeCard(state) +
      '</div>';
  }

  /* ---- Score ------------------------------------------------------- */
  function scoreCard(state) {
    var s = state.scores;
    var legend = s.parts.map(function (p) {
      return '<li><i style="background:' + p.color + '"></i><span>' + esc(t('czd.score.' + p.key)) + '</span><b>' + n(p.value, 0) + '</b></li>';
    }).join('');
    return '<article class="czd-card czd-card--score">' +
      '<div class="czd-card__head">' +
        '<h3>' + esc(t('czd.score.title')) + '</h3>' +
        '<button type="button" class="czd-info" data-czd-act="explain" data-czd-topic="score" aria-label="' + esc(t('czd.score.detail')) + '">?</button>' +
      '</div>' +
      '<div class="czd-score">' +
        C.ring({ value: s.global, parts: s.parts, label: t('czd.score.' + s.band), aria: t('czd.score.title') + ' ' + s.global + '/100' }) +
        '<ul class="czd-score__legend">' + legend + '</ul>' +
      '</div>' +
      '<p class="czd-note">' + esc(t('czd.score.hint')) + '</p>' +
      '<div class="czd-score__foot">' +
        '<span class="czd-chip czd-chip--band">' + esc(t('czd.score.' + s.band)) + '</span>' +
        '<button type="button" class="czd-link" data-czd-act="tab" data-czd-target="clinical">' + esc(t('czd.score.detail')) + ' →</button>' +
      '</div>' +
    '</article>';
  }

  /* ---- Profil ------------------------------------------------------ */
  function profileCard(state) {
    var p = state.profile;
    var ini = (p.name || 'A').trim().charAt(0).toUpperCase();
    var goal = (D.GOALS || []).filter(function (g) { return g.key === p.goal; })[0] || D.GOALS[0];
    var countries = state.countries || [];
    return '<article class="czd-card czd-card--profile">' +
      '<div class="czd-id">' +
        '<span class="czd-id__avatar" aria-hidden="true">' + esc(ini) + '</span>' +
        '<span class="czd-id__txt">' +
          '<b>' + esc(t('czd.profile.hello', { name: p.name })) + '</b>' +
          '<small>' + esc(t('czd.profile.meta', {
            age: p.age,
            sex: t('czd.profile.sex.' + (p.sex === 'male' ? 'male' : 'female')),
            height: p.height
          })) + '</small>' +
        '</span>' +
        '<span class="czd-id__ring" aria-hidden="true">' + M.indicator(p).bmi + '</span>' +
      '</div>' +
      '<div class="czd-fields">' +
        '<label class="czd-field"><span>' + esc(t('czd.profile.goal')) + '</span>' +
          '<select data-czd-input="goal">' + (D.GOALS || []).map(function (g) {
            return '<option value="' + g.key + '"' + (g.key === p.goal ? ' selected' : '') + '>' + g.icon + ' ' + esc(t(g.labelKey)) + '</option>';
          }).join('') + '</select>' +
        '</label>' +
        '<label class="czd-field"><span>' + esc(t('czd.profile.country')) + '</span>' +
          '<select data-czd-input="country">' + countries.map(function (c) {
            return '<option value="' + c[0] + '"' + (c[0] === p.country ? ' selected' : '') + '>' + esc(c[1]) + '</option>';
          }).join('') + '</select>' +
        '</label>' +
      '</div>' +
      '<div class="czd-mini">' +
        miniStat('czd.kpi.bmr', n(state.energy.bmr, 0), 'kcal', t('czd.clin.bmr')) +
        miniStat('czd.kpi.tdee', n(state.energy.tdee, 0), 'kcal', t('czd.clin.tdee')) +
        miniStat('czd.kpi.protein', n(state.energy.proteinTarget, 0), 'g', t('czd.clin.proteinTarget')) +
        miniStat('czd.kpi.fiber', n(state.energy.fiberTarget, 0), 'g', t('czd.clin.fiberTarget')) +
      '</div>' +
      '<div class="czd-profile__foot">' +
        '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="tab" data-czd-target="clinical">' + icon('scale') + esc(t('czd.profile.edit')) + '</button>' +
        '<span class="czd-saved">' + icon('check') + esc(t('czd.profile.saved')) + '</span>' +
      '</div>' +
    '</article>';
  }

  function miniStat(labelKey, value, unit, hint) {
    return '<div class="czd-mini__item" title="' + esc(hint) + '">' +
      '<span>' + esc(t(labelKey)) + '</span>' +
      '<b>' + value + ' <small>' + esc(unit) + '</small></b>' +
    '</div>';
  }

  /* ---- Énergie du jour -------------------------------------------- */
  function energyCard(state) {
    var day = currentDay(state);
    var intake = day ? Math.round(day.totals.kcal) : 0;
    var target = state.energy.target;
    var delta = intake - target;
    var pct = Math.max(0, Math.min(150, Math.round((intake / target) * 100)));
    var slice = state.plan ? state.plan.sliceTarget : {};
    var mealBars = D.MEAL_SLOTS.map(function (slot) {
      var k = 0;
      if (day) (day.meals[slot] || []).forEach(function (it) { k += D.FOODS[it.id].kcal * it.portion; });
      var tgt = slice[slot] || 1;
      return { label: t(slot === 'breakfast' ? 'czd.plan.breakfast' : slot === 'lunch' ? 'czd.plan.lunch' : slot === 'dinner' ? 'czd.plan.dinner' : 'czd.plan.snack'), value: Math.round(k), max: Math.round(tgt), color: k > tgt * 1.15 ? '#d98200' : '#0f9d58', display: Math.round(k) + ' / ' + Math.round(tgt) + ' kcal' };
    });
    return '<article class="czd-card czd-card--energy">' +
      '<div class="czd-card__head">' +
        '<h3>' + esc(t('czd.energy.title')) + '</h3>' +
        '<span class="czd-pill">' + esc(t('czd.plan.target')) + ' ' + n(target, 0) + ' kcal</span>' +
      '</div>' +
      '<p class="czd-note">' + esc(t('czd.energy.sub')) + '</p>' +
      '<div class="czd-energy">' +
        '<div class="czd-energy__nums">' +
          '<div><span>' + esc(t('czd.energy.intake')) + '</span><b data-count="' + intake + '" data-count-key="intake">0</b><small>kcal</small></div>' +
          '<div><span>' + esc(t('czd.energy.expend')) + '</span><b data-count="' + state.energy.tdee + '" data-count-key="expend">0</b><small>kcal</small></div>' +
          '<div class="czd-energy__delta ' + (Math.abs(delta) < 120 ? 'is-ok' : delta > 0 ? 'is-alert' : 'is-warn') + '">' +
            '<span>' + esc(t('czd.energy.balance')) + '</span><b>' + (delta > 0 ? '+' : '') + n(delta, 0) + '</b>' +
            '<small>' + esc(t(Math.abs(delta) < 120 ? 'czd.energy.inTarget' : delta > 0 ? 'czd.energy.surplus' : 'czd.energy.deficit')) + '</small>' +
          '</div>' +
        '</div>' +
        '<div class="czd-energy__track"><i style="--w:' + pct + '%" class="' + (delta > 150 ? 'is-alert' : '') + '"></i>' +
          '<span class="czd-energy__target"></span></div>' +
        '<div class="czd-energy__meals">' + C.bars({ items: mealBars, compact: true }) + '</div>' +
      '</div>' +
      '<div class="czd-card__foot">' +
        '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="tab" data-czd-target="plan">' + icon('plate') + esc(t('czd.energy.byMeal')) + '</button>' +
      '</div>' +
    '</article>';
  }

  /* ---- Bande de KPI ------------------------------------------------ */
  function kpiStrip(state) {
    var ind = state.indicator, p = state.profile, h = state.history;
    var sp = function (key) { return h.map(function (d) { return d[key]; }); };
    var bmiSpark = h.map(function (d) { return d.weight / Math.pow(p.height / 100, 2); });
    var glSpark = sp('glucose');
    var bpSpark = h.map(function (d) { return d.sys; });
    var waistSpark = sp('waist');
    return '<div class="czd-kpis">' +
      kpi('bmi', esc(t('czd.kpi.bmi')), n(ind.bmi, 1), 'kg/m²', statusText(ind.bmiStatus.key), tone(ind.bmiStatus.tone), C.spark(bmiSpark, { color: ind.bmiStatus.color }), '18,5–24,9', 'bmi') +
      kpi('waist', esc(t('czd.kpi.waist')), n(p.waist, 0), 'cm', statusText(ind.waistStatus.key), tone(ind.waistStatus.tone), C.spark(waistSpark, { color: ind.waistStatus.color }), '≤ ' + (ind.waistStatus.max || 80) + ' cm', 'waist') +
      kpi('glucose', esc(t('czd.kpi.glucose')), n(state.vitals.glucose, 1), 'mmol/L', statusText(state.vitals.glucoseStatus.key), tone(state.vitals.glucoseStatus.tone), C.spark(glSpark, { color: '#1f7ae0' }), '3,9–5,5', 'glucose') +
      kpi('bp', esc(t('czd.kpi.bp')), (p.sys || '—') + '/' + (p.dia || '—'), 'mmHg', statusText(state.vitals.bpStatus.key), tone(state.vitals.bpStatus.tone), C.spark(bpSpark, { color: '#c0453c' }), '< 120/80', 'bp') +
      kpi('weight', esc(t('czd.kpi.weight')), n(p.weight, 1), 'kg', t('czd.kpi.target') + ' ' + n(ind.idealWeight ? ind.idealWeight.min : 0, 0) + '–' + n(ind.idealWeight ? ind.idealWeight.max : 0, 0), 'info', C.spark(sp('weight'), { color: '#0f9d58' }), t('czd.kpi.trend'), 'weight') +
      kpi('whtr', esc(t('czd.kpi.whtr')), n(ind.whtr, 2), '', statusText(ind.whtrStatus.tone === 'good' ? 'normal' : 'watch'), tone(ind.whtrStatus.tone), C.spark(h.map(function (d) { return d.waist / p.height; }), { color: '#8b5cf6' }), '≤ 0,50', 'whtr') +
    '</div>';
  }

  function kpi(id, label, value, unit, status, toneCls, sparkHtml, hint, topic) {
    return '<button type="button" class="czd-kpi czd-kpi--' + toneCls + '" data-czd-act="explain" data-czd-topic="' + topic + '">' +
      '<span class="czd-kpi__label">' + label + '</span>' +
      '<span class="czd-kpi__value"><b>' + value + '</b>' + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span>' +
      '<span class="czd-kpi__status"><i></i>' + esc(status) + '</span>' +
      '<span class="czd-kpi__spark" aria-hidden="true">' + sparkHtml + '</span>' +
      '<span class="czd-kpi__hint">' + esc(hint) + '</span>' +
    '</button>';
  }

  /* ---- Tendances --------------------------------------------------- */
  function trendAnthropo(state) {
    var h = state.history;
    return '<article class="czd-card czd-card--chart">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.clin.trend.weight')) + '</h3>' +
        '<span class="czd-pill">' + esc(t('czd.kpi.trend')) + '</span></div>' +
      C.line({
        labels: labels14(state),
        series: [
          { label: t('czd.kpi.weight') + ' (kg)', values: h.map(function (d) { return d.weight; }), color: '#0f9d58' },
          { label: t('czd.kpi.waist') + ' (cm)', values: h.map(function (d) { return d.waist; }), color: '#1f7ae0' }
        ],
        height: 210, valueDecimals: 1, smooth: true,
        aria: t('czd.clin.trend.weight')
      }) +
    '</article>';
  }

  function trendMetabolic(state) {
    var h = state.history;
    return '<article class="czd-card czd-card--chart">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.clin.trend.metabolic')) + '</h3>' +
        '<span class="czd-pill">' + esc(t('czd.kpi.trend')) + '</span></div>' +
      C.line({
        labels: labels14(state),
        series: [
          { label: t('czd.kpi.glucose') + ' (mmol/L)', values: h.map(function (d) { return d.glucose; }), color: '#c0453c' },
          { label: t('czd.kpi.bp') + ' (mmHg)', values: h.map(function (d) { return d.sys; }), color: '#8b5cf6' }
        ],
        height: 210, valueDecimals: 1, smooth: true,
        aria: t('czd.clin.trend.metabolic')
      }) +
    '</article>';
  }

  function labels14(state) {
    var out = [];
    var p = I18N.lang === 'fr' ? 'J' : 'D';
    for (var i = 13; i >= 0; i--) out.push(i === 0 ? p : p + '-' + i);
    return out;
  }

  /* ---- Habitudes --------------------------------------------------- */
  function habitCard(state) {
    var h = state.habits;
    return '<article class="czd-card czd-card--habits">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.habit.title')) + '</h3><span class="czd-pill">' + icon('sun') + ' ' + esc(t('czd.plan.today')) + '</span></div>' +
      habitRow('water', '💧', t('czd.habit.water'), h.water, h.waterGoal, t('czd.habit.water.unit', { a: h.water, b: h.waterGoal }), 'blue', true) +
      habitRow('steps', '👟', t('czd.habit.steps'), h.steps, h.stepsGoal, n(h.steps, 0) + ' / ' + n(h.stepsGoal, 0), 'violet', false) +
      habitRow('veggies', '🥦', t('czd.habit.veggies'), h.veggies, h.veggiesGoal, t('czd.habit.veggies.unit', { a: h.veggies, b: h.veggiesGoal }), 'green', true) +
      habitRow('sleep', '😴', t('czd.habit.sleep'), h.sleep, h.sleepGoal, n(h.sleep, 1) + ' h / ' + n(h.sleepGoal, 1) + ' h', 'amber', false) +
    '</article>';
  }

  function habitRow(key, emoji, label, value, goal, display, color, adjustable) {
    var pct = Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
    return '<div class="czd-habit czd-habit--' + color + '" data-czd-habit="' + key + '">' +
      '<span class="czd-habit__emoji" aria-hidden="true">' + emoji + '</span>' +
      '<div class="czd-habit__main">' +
        '<span class="czd-habit__top"><b>' + esc(label) + '</b><small>' + esc(display) + '</small></span>' +
        '<span class="czd-habit__track" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(label) + '">' +
          '<i style="--w:' + pct + '%"></i>' +
        '</span>' +
      '</div>' +
      '<div class="czd-habit__ctrl">' +
        (adjustable
          ? '<button type="button" class="czd-step" data-czd-act="habit-" data-czd-habitkey="' + key + '" aria-label="' + esc(t('czd.habit.removeWater')) + '">−</button>' +
            '<button type="button" class="czd-step czd-step--plus" data-czd-act="habit+" data-czd-habitkey="' + key + '" aria-label="' + esc(t('czd.habit.addWater')) + '">＋</button>'
          : (key === 'steps'
            ? '<button type="button" class="czd-step czd-step--wide" data-czd-act="steps+">＋ 1 000</button>'
            : '<span class="czd-habit__ok">' + icon('check') + '</span>')) +
      '</div>' +
    '</div>';
  }

  /* ---- Macros ------------------------------------------------------ */
  function macroCard(state) {
    var day = currentDay(state);
    var tot = day ? day.totals : { protein: 0, carbs: 0, fat: 0, fiber: 0, kcal: 0 };
    var eP = tot.protein * 4, eC = tot.carbs * 4, eF = tot.fat * 9;
    var eTot = eP + eC + eF || 1;
    var slices = [
      { label: t('czd.macro.protein'), value: Math.round(eP / eTot * 100), color: '#1f7ae0', unit: '%', share: Math.round(eP / eTot * 100) },
      { label: t('czd.macro.carbs'), value: Math.round(eC / eTot * 100), color: '#e0a92b', unit: '%', share: Math.round(eC / eTot * 100) },
      { label: t('czd.macro.fat'), value: Math.round(eF / eTot * 100), color: '#8b5cf6', unit: '%', share: Math.round(eF / eTot * 100) }
    ];
    return '<article class="czd-card czd-card--macro">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.macro.title')) + '</h3></div>' +
      C.donut({ slices: slices, centerValue: n(tot.kcal, 0), centerLabel: 'kcal', aria: t('czd.macro.title') }) +
      '<div class="czd-macro__foot">' +
        '<span>' + esc(t('czd.macro.protein')) + ' <b>' + n(tot.protein, 0) + ' g</b></span>' +
        '<span>' + esc(t('czd.macro.carbs')) + ' <b>' + n(tot.carbs, 0) + ' g</b></span>' +
        '<span>' + esc(t('czd.macro.fat')) + ' <b>' + n(tot.fat, 0) + ' g</b></span>' +
        '<span>' + esc(t('czd.macro.fiber')) + ' <b>' + n(tot.fiber, 0) + ' g</b></span>' +
      '</div>' +
    '</article>';
  }

  /* ---- Micronutriments --------------------------------------------- */
  function microCard(state) {
    var micros = state.plan ? state.plan.micros : M.microCoverage({ days: [currentDay(state) || { meals: {}, totals: null }] });
    var items = micros.map(function (m) {
      var pct = Math.min(100, m.coverage);
      return '<div class="czd-micro" data-czd-micro="' + m.key + '">' +
        '<span class="czd-micro__label">' + esc(t(m.labelKey)) + '</span>' +
        '<span class="czd-micro__track"><i style="--w:' + pct + '%;--c:' + m.color + '"></i></span>' +
        '<span class="czd-micro__val ' + (m.coverage >= 90 ? 'is-ok' : m.coverage >= 60 ? 'is-warn' : 'is-alert') + '">' +
          n(m.value, m.value >= 100 ? 0 : 1) + ' <small>' + esc(m.unit) + '</small>' +
        '</span>' +
        '<span class="czd-micro__pct">' + (m.coverage >= 100 ? icon('check') : n(m.coverage, 0) + '%') + '</span>' +
      '</div>';
    }).join('');
    return '<article class="czd-card czd-card--micro">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.micro.title')) + '</h3>' +
        '<span class="czd-pill">' + esc(t('czd.micro.coverage')) + '</span></div>' +
      '<p class="czd-note">' + esc(t('czd.micro.sub')) + '</p>' +
      '<div class="czd-micros">' + items + '</div>' +
    '</article>';
  }

  /* ---- Risques ------------------------------------------------------ */
  function riskCard(state) {
    var cards = state.risks.map(function (r) {
      return '<div class="czd-risk czd-risk--' + r.band + '">' +
        '<div class="czd-risk__top">' +
          '<span class="czd-risk__name">' + esc(t('czd.risk.' + r.key)) + '</span>' +
          '<span class="czd-risk__band">' + esc(t('czd.risk.' + r.band)) + '</span>' +
        '</div>' +
        '<div class="czd-risk__gauge">' + C.gauge({ value: r.value, color: r.color, label: t('czd.risk.' + r.key) }) +
          '<b>' + n(Math.round(r.value * 100), 0) + '<small>%</small></b></div>' +
        '<div class="czd-risk__meta">' +
          '<span>' + esc(t('czd.risk.horizon', { v: r.horizon[I18N.lang] || r.horizon.en })) + '</span>' +
          '<span class="czd-risk__factor">' + esc(t('czd.risk.factor')) + ' : ' + n(r.factorValue, 0) + '%</span>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<article class="czd-card czd-card--risk">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.risk.title')) + '</h3>' +
        '<button type="button" class="czd-info" data-czd-act="explain" data-czd-topic="risk">?</button></div>' +
      '<p class="czd-note">' + esc(t('czd.risk.sub')) + '</p>' +
      '<div class="czd-risks">' + cards + '</div>' +
    '</article>';
  }

  /* ---- Priorités ---------------------------------------------------- */
  function priorityCard(state) {
    var items = state.priorities.map(function (p) {
      var labelKey = 'czd.priority.' + p.key;
      var text = p.key === 'hydrate' ? t('czd.priority.hydrate', { n: p.n })
        : p.key === 'walk' ? t('czd.priority.walk', { n: n(p.n, 0) })
          : p.key === 'veggies' ? t('czd.priority.veggies', { n: p.n })
            : p.key === 'sugar' ? t('czd.priority.sugar', { n: p.n })
              : p.key === 'salt' ? t('czd.priority.salt', { n: p.n })
                : t(labelKey);
      var ctaLabel = 'czd.priority.cta.' + (p.cta || 'learn');
      var act = { water: 'add-water', steps: 'steps+', meal: 'log-meal', plan: 'tab', learn: 'explain' }[p.cta] || 'explain';
      return '<li class="czd-prio czd-prio--' + p.tone + '">' +
        '<span class="czd-prio__ico" aria-hidden="true">' + p.icon + '</span>' +
        '<span class="czd-prio__txt">' + esc(text) + '</span>' +
        '<button type="button" class="czd-btn czd-btn--mini" data-czd-act="' + act + '"' +
          (act === 'tab' ? ' data-czd-target="plan"' : '') +
          (act === 'steps+' ? ' data-czd-amount="1000"' : '') +
          (act === 'add-water' ? ' data-czd-amount="1"' : '') +
          (act === 'explain' ? ' data-czd-topic="risk"' : '') + '>' +
          esc(t(ctaLabel)) + '</button>' +
      '</li>';
    }).join('');
    return '<article class="czd-card czd-card--priority">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.priority.title')) + '</h3>' +
        '<span class="czd-pill">' + icon('spark') + esc(t('czd.plan.target')) + ' : ' + n(state.energy.target, 0) + ' kcal</span></div>' +
      '<p class="czd-note">' + esc(t('czd.priority.sub')) + '</p>' +
      '<ul class="czd-prios">' + items + '</ul>' +
      '<div class="czd-prio__foot">' +
        '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="tab" data-czd-target="plan">' + icon('plate') + esc(t('czd.priority.cta.plan')) + '</button>' +
        '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="save">' + icon('check') + esc(t('czd.clin.save')) + '</button>' +
      '</div>' +
    '</article>';
  }

  function achievementOn(b, state) {
    var h = state.habits;
    var rules = {
      water: h.water >= (h.waterGoal || 8),
      steps: h.steps >= (h.stepsGoal || 8000),
      fiber: (h.fiber || 0) >= 25,
      diversity: h.veggies >= (h.veggiesGoal || 5),
      sleep: h.sleep >= (h.sleepGoal || 7.5),
      sugar: (h.sugary || 0) <= 1
    };
    return !!rules[b.key];
  }

  /* ---- Charge glycémique -------------------------------------------- */
  function glycemicCard(state) {
    var plan = state.plan;
    var values = plan ? plan.days.map(function (d) { return M.glycemicLoad(d); }) : [];
    var labels = dayShortLabels();
    var colors = values.map(function (v) { return v > 130 ? '#c0453c' : v > 100 ? '#d98200' : '#0f9d58'; });
    return '<article class="czd-card czd-card--gl">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.gi.title')) + '</h3>' +
        '<span class="czd-pill">' + esc(t('czd.gi.low')) + ' · ' + esc(t('czd.gi.medium')) + ' · ' + esc(t('czd.gi.high')) + '</span></div>' +
      '<p class="czd-note">' + esc(t('czd.gi.sub')) + '</p>' +
      (values.length ? C.columnWeek({ values: values, labels: labels, colors: colors, target: 100, aria: t('czd.gi.title') })
        : '<p class="czd-empty">' + esc(t('czd.plan.empty')) + '</p>') +
    '</article>';
  }

  function badgeCard(state) {
    var s = state.scores;
    var badges = (D.ACHIEVEMENTS || []).map(function (b) {
      var on = achievementOn(b, state);
      return '<span class="czd-achievement' + (on ? ' is-on' : '') + '" title="' + esc(t(b.labelKey)) + '">' +
        '<i aria-hidden="true">' + (on ? b.icon : '🔒') + '</i>' + esc(t(b.labelKey)) + '</span>';
    }).join('');
    var earned = (D.ACHIEVEMENTS || []).filter(function (b) { return achievementOn(b, state); }).length;
    var bars = s.parts.map(function (p) {
      return { label: t('czd.score.' + p.key), value: p.value, color: p.color, display: n(p.value, 0) };
    });
    return '<article class="czd-card czd-card--badges">' +
      '<div class="czd-card__head"><h3>' + esc(t('czd.badge.title')) + '</h3>' +
        '<span class="czd-pill">' + esc(t('czd.badge.progress', { a: earned, b: (D.ACHIEVEMENTS || []).length })) + '</span></div>' +
      C.bars({ items: bars }) +
      '<div class="czd-achievements">' + badges + '</div>' +
      '<div class="czd-adherence">' +
        '<span>' + esc(t('czd.plan.adherence')) + '</span>' +
        '<b>' + (s.adherence == null ? '—' : n(s.adherence, 0) + ' %') + '</b>' +
        '<span class="czd-adherence__track"><i style="--w:' + (s.adherence || 0) + '%"></i></span>' +
      '</div>' +
    '</article>';
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 2b. Dark Bento workspace                                         */
  /* ══════════════════════════════════════════════════════════════════ */
  function bentoNumber(v, decimals) {
    var value = n(v, decimals);
    return I18N.lang === 'en' ? value.replace(/,/g, ' ') : value;
  }

  function bentoRail(state) {
    var items = [
      ['overview', 'home', 'czd.bento.nav.overview'],
      ['plan', 'calendar', 'czd.bento.nav.plan'],
      ['clinical', 'chart', 'czd.bento.nav.clinical'],
      ['family', 'family', 'czd.bento.nav.family']
    ];
    return '<aside class="czd-bento-rail" aria-label="' + esc(t('czd.tab.aria')) + '">' +
      '<div class="czd-bento-logo" aria-label="NUTRI.N°1"><svg viewBox="0 0 42 42" fill="none" aria-hidden="true">' +
        '<path d="M7 31V11h7l7 11V11h7v20h-7l-7-11v11H7Z" fill="currentColor"/>' +
        '<path d="M32 11h4v20h-4z" fill="#D2F85A"/></svg></div>' +
      '<nav class="czd-bento-rail-nav" role="tablist" aria-label="' + esc(t('czd.tab.aria')) + '">' +
        items.map(function (it) {
          var on = state.activeTab === it[0];
          return '<button type="button" class="czd-bento-rail-btn' + (on ? ' is-on' : '') + '" id="czdTab-' + it[0] + '" role="tab" ' +
            'data-czd-tab="' + it[0] + '" data-tooltip="' + esc(t(it[2])) + '" aria-label="' + esc(t(it[2])) + '" aria-selected="' + on + '" ' +
            'aria-controls="czdPanel-' + it[0] + '" tabindex="' + (on ? '0' : '-1') + '">' + icon(it[1]) + '</button>';
        }).join('') +
        '<button type="button" class="czd-bento-rail-btn' + (state.quickActionsOpen ? ' is-on' : '') + '" data-czd-act="quick-actions" ' +
          'data-tooltip="' + esc(t('czd.bento.nav.actions')) + '" aria-label="' + esc(t('czd.bento.nav.actions')) + '" aria-expanded="' + !!state.quickActionsOpen + '">' + icon('bell') + '</button>' +
      '</nav>' +
      '<div class="czd-bento-rail-bottom">' +
        '<button type="button" class="czd-bento-reset" data-czd-act="reset" aria-label="' + esc(t('czd.bento.reset')) + '" title="' + esc(t('czd.bento.reset')) + '">' + icon('logout') + '</button>' +
        '<button type="button" class="czd-bento-avatar" data-czd-act="tab" data-czd-target="clinical" aria-label="' + esc(t('czd.bento.avatar', { name: state.profile.name })) + '">' +
          esc((state.profile.name || 'A').trim().charAt(0)) + '</button>' +
      '</div>' +
    '</aside>';
  }

  function header(state) {
    var names = ['balanced', 'risk', 'athlete', 'maternal'];
    return '<header class="czd-bento-header">' +
      '<div class="czd-bento-greeting">' +
        '<h2>' + esc(t('czd.bento.greeting', { name: state.profile.name })) + '</h2>' +
        '<p>' + esc(t('czd.bento.subtitle')) + '</p>' +
        '<div class="czd-bento-preset-strip" role="group" aria-label="' + esc(t('czd.preset.title')) + '">' +
          names.map(function (key) {
            return '<button type="button" class="czd-bento-preset' + (state.preset === key ? ' is-on' : '') + '" data-czd-preset="' + key + '" aria-pressed="' + (state.preset === key) + '">' +
              esc(D.PRESETS[key].profile.name) + '</button>';
          }).join('') +
          '<span class="czd-bento-langs" role="group" aria-label="Language">' +
            '<button type="button" class="czd-bento-lang' + (I18N.lang === 'fr' ? ' is-on' : '') + '" data-czd-lang="fr" aria-pressed="' + (I18N.lang === 'fr') + '">FR</button>' +
            '<button type="button" class="czd-bento-lang' + (I18N.lang === 'en' ? ' is-on' : '') + '" data-czd-lang="en" aria-pressed="' + (I18N.lang === 'en') + '">EN</button>' +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="czd-bento-header-tools">' +
        '<label class="czd-bento-search">' + icon('search') +
          '<span class="czd-bento-sr-only">' + esc(t('czd.bento.search')) + '</span>' +
          '<input type="search" data-czd-search value="' + esc(state.searchQuery || '') + '" placeholder="' + esc(t('czd.bento.search')) + '" autocomplete="off">' +
          (state.searchQuery ? '<button type="button" class="czd-bento-search-clear" data-czd-act="search-clear" aria-label="' + esc(t('czd.bento.search.clear')) + '">' + icon('close') + '</button>' : '') +
        '</label>' +
        '<button type="button" class="czd-bento-sync" data-czd-act="sync" data-czd-idle="' + esc(t('czd.bento.premium')) + '" aria-label="' + esc(t('czd.sync')) + '">' +
          '<span class="czd-bento-sync-dot" aria-hidden="true"></span><span class="czd-btn__label">' + esc(t('czd.bento.premium')) + '</span>' +
          '<span class="czd-bento-sr-only" data-czd-sync>' + esc(state.sync.last ? t('czd.synced') : t('czd.sync.never')) + '</span>' +
        '</button>' +
      '</div>' +
    '</header>';
  }

  function quickDrawer(state) {
    return '<section class="czd-bento-drawer" data-czd-drawer aria-label="' + esc(t('czd.bento.quick.title')) + '"' + (state.quickActionsOpen ? '' : ' hidden') + '>' +
      '<div class="czd-bento-drawer-head"><strong>' + esc(t('czd.bento.quick.title')) + '</strong>' +
        '<button type="button" class="czd-bento-close" data-czd-act="quick-actions" aria-label="' + esc(t('czd.bento.quick.close')) + '">×</button></div>' +
      '<div class="czd-bento-drawer-actions">' +
        ['balanced', 'risk', 'athlete', 'maternal'].map(function (key) {
          return '<button type="button" class="czd-bento-action' + (state.preset === key ? ' is-lime' : '') + '" data-czd-preset="' + key + '">' + esc(D.PRESETS[key].profile.name) + '</button>';
        }).join('') +
        '<button type="button" class="czd-bento-action" data-czd-act="export">' + icon('download') + esc(t('czd.export')) + '</button>' +
        '<button type="button" class="czd-bento-action" data-czd-act="print">' + icon('print') + esc(t('czd.print')) + '</button>' +
        '<button type="button" class="czd-bento-action is-blue" data-czd-act="sync">' + icon('refresh') + esc(t('czd.sync')) + '</button>' +
        '<button type="button" class="czd-bento-action is-danger" data-czd-act="reset">' + icon('logout') + esc(t('czd.reset')) + '</button>' +
      '</div>' +
    '</section>';
  }

  function overview(state) {
    return physicalCard(state) + calendarCard(state) +
      '<div class="czd-bento-side-stack">' + sleepCard(state) + weightCard(state) + '</div>' + activitiesCard(state);
  }

  function physicalCard(state) {
    var h = state.habits, history = state.history;
    var steps = history.map(function (d) { return d.steps; });
    var currentBurned = Math.max(0, Math.round(h.steps * .035 + h.activityMin * 6));
    var burned = history.map(function (d) { return Math.max(0, Math.round(d.steps * .035 + h.activityMin * 6)); });
    burned[burned.length - 1] = currentBurned;
    var day = currentDay(state);
    var intake = day ? day.totals.kcal : 0;
    var consumed = history.map(function (_, i) { return Math.round(intake * (.92 + ((i * 3) % 7) * .018)); });
    var minutes = history.map(function (d) { return Math.max(0, Math.round(h.activityMin * d.steps / Math.max(1, h.steps))); });
    minutes[minutes.length - 1] = h.activityMin;
    var week = state.activityPeriod === 'week';
    var sum = function (values) { return values.slice(-7).reduce(function (a, v) { return a + v; }, 0); };
    var avg = function (values) { return Math.round(values.reduce(function (a, v) { return a + v; }, 0) / Math.max(1, values.length)); };
    var stepValue = week ? sum(steps) : h.steps;
    var burnValue = week ? sum(burned) : currentBurned;
    var minuteValue = week ? sum(minutes) : h.activityMin;
    var burnGoal = Math.max(300, state.energy.tdee - state.energy.bmr);
    var activityPeak = I18N.lang === 'fr' ? '18 h' : '6 PM';
    return '<article class="czd-bento-card czd-bento-physical">' +
      '<div class="czd-bento-card-head"><h3 class="czd-bento-card-title">' + esc(t('czd.bento.physical')) + '</h3>' +
        '<select class="czd-bento-select" data-czd-period aria-label="' + esc(t('czd.bento.physical')) + '">' +
          '<option value="today"' + (!week ? ' selected' : '') + '>' + esc(t('czd.bento.today')) + ' ⌄</option>' +
          '<option value="week"' + (week ? ' selected' : '') + '>' + esc(t('czd.bento.week')) + ' ⌄</option></select></div>' +
      '<div class="czd-bento-metrics">' +
        bentoMetric(state, C.bentoSpline({ values: steps, color: '#D2F85A', aria: t('czd.bento.chart.steps') }),
          'czd.bento.steps', bentoNumber(stepValue, 0), '', bentoNumber(h.stepsGoal * (week ? 7 : 1), 0), bentoNumber(avg(steps), 0), 'steps+') +
        bentoMetric(state, C.bentoSpline({ series: [{ values: burned, color: '#F59B42' }, { values: consumed, color: '#8F88E8' }], aria: t('czd.bento.chart.calories') }) +
          '<div class="czd-bento-legend"><span style="color:#F59B42"><i></i>' + esc(t('czd.bento.burned')) + '</span><span style="color:#8F88E8"><i></i>' + esc(t('czd.bento.consumed')) + '</span></div>',
          'czd.bento.calories', bentoNumber(burnValue, 0), 'kcal', bentoNumber(burnGoal * (week ? 7 : 1), 0) + ' kcal', bentoNumber(avg(burned), 0) + ' kcal', 'activity-adjust') +
        bentoMetric(state, C.bentoSpline({ values: minutes, color: '#4E65EC', area: true, peakLabel: activityPeak, badgeTextColor: '#FFFFFF', dropLine: false, aria: t('czd.bento.chart.activity') }),
          'czd.bento.activityTime', formatMinutes(minuteValue), '', formatMinutes(h.activityGoal * (week ? 7 : 1)), formatMinutes(avg(minutes)), 'activity-adjust') +
      '</div>' +
    '</article>';
  }

  function bentoMetric(state, chart, labelKey, value, unit, goal, average, action) {
    var amount = action === 'steps+' ? ' data-czd-amount="1000"' : '';
    return '<div class="czd-bento-metric"><div class="czd-bento-chart">' + chart + '</div>' +
      '<button type="button" class="czd-bento-metric-button" data-czd-act="' + action + '"' + amount + '>' +
        '<span class="czd-bento-metric-label">' + esc(t(labelKey)) + '</span>' +
        '<strong class="czd-bento-kpi">' + esc(value) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</strong>' +
        '<span class="czd-bento-metric-foot"><span>' + esc(t('czd.bento.goal', { v: goal })) + '</span><span>' + esc(t('czd.bento.average')) + ' <b>' + esc(average) + '</b></span></span>' +
      '</button></div>';
  }

  function formatMinutes(value) {
    var v = Math.max(0, Math.round(value || 0));
    if (v < 60) return v + 'min';
    var hours = Math.floor(v / 60), mins = v % 60;
    return hours + 'h' + (mins ? ' ' + mins + 'min' : '');
  }

  function calendarCard(state) {
    var now = new Date();
    var year = Number(state.calendarYear) || now.getFullYear();
    var month = state.calendarMonth == null ? now.getMonth() : Number(state.calendarMonth);
    month = Math.max(0, Math.min(11, month));
    var selected = Number(state.calendarDay) || 15;
    var offset = (new Date(year, month, 1).getDay() + 6) % 7;
    var days = new Date(year, month + 1, 0).getDate();
    var previousDays = new Date(year, month, 0).getDate();
    var cells = Math.ceil((offset + days) / 7) * 7;
    var weekdays = I18N.lang === 'fr' ? ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    var monthName = '';
    try { monthName = new Date(year, month, 1).toLocaleDateString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long' }); } catch (e) { monthName = String(month + 1); }
    var html = weekdays.map(function (d) { return '<span class="czd-bento-weekday">' + d + '</span>'; }).join('');
    for (var i = 0; i < cells; i++) {
      var dayNumber = i - offset + 1;
      if (dayNumber < 1 || dayNumber > days) {
        var overflow = dayNumber < 1 ? previousDays + dayNumber : dayNumber - days;
        html += '<span class="czd-bento-day is-overflow" aria-hidden="true">' + overflow + '</span>';
      } else {
        var historyPoint = state.history[dayNumber - 1];
        var logged = !!(historyPoint && historyPoint.steps >= state.habits.stepsGoal * .75) || !!state.eaten[((dayNumber - 1) % 7) + ':breakfast'];
        html += '<button type="button" class="czd-bento-day' + (dayNumber === selected ? ' is-active' : '') + (logged ? ' has-log' : '') + '" ' +
          'data-czd-act="calendar-day" data-czd-calendar-day="' + dayNumber + '" aria-pressed="' + (dayNumber === selected) + '" aria-label="' + dayNumber + ' ' + esc(monthName) + '">' + dayNumber + '</button>';
      }
    }
    return '<article class="czd-bento-card czd-bento-calendar">' +
      '<div class="czd-bento-card-head"><h3 class="czd-bento-card-title">' + esc(t('czd.bento.activeDays')) + '</h3>' +
        '<select class="czd-bento-select" data-czd-month aria-label="' + esc(t('czd.bento.calendar')) + '">' +
          Array.apply(null, Array(12)).map(function (_, m) {
            var label = '';
            try { label = new Date(year, m, 1).toLocaleDateString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long' }); } catch (e) { label = String(m + 1); }
            return '<option value="' + m + '"' + (m === month ? ' selected' : '') + '>' + esc(label) + ' ⌄</option>';
          }).join('') + '</select></div>' +
      '<div class="czd-bento-calendar-grid" role="group" aria-label="' + esc(monthName + ' ' + year) + '">' + html + '</div>' +
    '</article>';
  }

  function sleepCard(state) {
    var h = state.habits;
    return '<article class="czd-bento-card czd-bento-sleep">' +
      '<div class="czd-bento-sleep-copy"><h3 class="czd-bento-card-title">' + esc(t('czd.bento.sleep')) + '</h3>' +
        '<p class="czd-bento-sleep-status">' + esc(t('czd.bento.sleep.almost')) + '</p>' +
        '<p class="czd-bento-sleep-goal">' + esc(t('czd.bento.sleep.goal', { v: n(h.sleepGoal, 1) })) + '</p>' +
        '<button type="button" class="czd-bento-sleep-adjust" data-czd-act="sleep+">' + esc(t('czd.bento.sleep.adjust')) + ' +0,5</button></div>' +
      '<div class="czd-bento-sleep-ring">' + C.sleepRing({ value: h.sleep, goal: h.sleepGoal, aria: t('czd.bento.chart.sleep', { value: n(h.sleep, 1), goal: n(h.sleepGoal, 1) }) }) + '</div>' +
    '</article>';
  }

  function weightCard(state) {
    var current = state.profile.weight;
    var start = state.history.length ? state.history[0].weight : current;
    var ideal = state.indicator.idealWeight;
    var target = ideal ? ideal.max : current;
    var completion = Math.max(0, Math.min(100, Math.round(100 - Math.abs(current - target) / Math.max(4, Math.abs(start - target)) * 100)));
    return '<article class="czd-bento-card czd-bento-weight">' +
      '<div class="czd-bento-card-head"><h3 class="czd-bento-card-title">' + esc(t('czd.bento.weightPlan')) + '</h3>' +
        '<span class="czd-bento-completion"><b>' + esc(t('czd.bento.completed', { v: completion })) + '</b></span></div>' +
      '<div class="czd-bento-progress" role="progressbar" aria-valuenow="' + completion + '" aria-valuemin="0" aria-valuemax="100"><i style="--bento-progress:' + completion + '%"></i></div>' +
      '<div class="czd-bento-weight-labels"><span>' + esc(t('czd.bento.startWeight')) + '<b>' + n(start, 1) + 'kg</b></span>' +
        '<span>' + esc(t('czd.bento.targetWeight')) + '<b>' + n(target, 1) + 'kg</b></span></div>' +
    '</article>';
  }

  function activityIcon(type) {
    return { running: '👟', workout: '🏋🏾', meditation: '🧘🏾', walking: '🚶🏾', meal: '🥘', other: '✨' }[type] || '✨';
  }

  function bentoActivities(state) {
    var custom = (state.activities || []).filter(function (a) { return Number(a.day) === state.activeDay; }).map(function (a) {
      return { id: a.id, name: a.name, type: a.type, time: a.time, duration: a.duration, audience: a.audience,
        notes: a.notes, icon: activityIcon(a.type), done: !!a.done, custom: true };
    });
    var priorityNote = function (cta, fallback) {
      var found = (state.priorities || []).filter(function (p) { return p.cta === cta; })[0];
      return found ? t('czd.priority.' + found.key, { n: found.n }) : fallback;
    };
    var defaults = [
      { id: 'daily-running', name: t('czd.bento.running'), type: 'running', time: I18N.lang === 'fr' ? '07:00' : '7:00 AM', audience: 'alone', icon: '👟', notes: priorityNote('steps', bentoNumber(state.habits.steps, 0) + ' / ' + bentoNumber(state.habits.stepsGoal, 0)) },
      { id: 'daily-gym', name: t('czd.bento.gym'), type: 'workout', time: I18N.lang === 'fr' ? '20:00' : '8:00 PM', audience: 'alone', icon: '🏋🏾', notes: priorityNote('water', formatMinutes(state.habits.activityMin) + ' / ' + formatMinutes(state.habits.activityGoal)) },
      { id: 'daily-meditation', name: t('czd.bento.meditation'), type: 'meditation', time: I18N.lang === 'fr' ? '22:30' : '10:30 PM', audience: 'alone', icon: '🧘🏾', notes: priorityNote('learn', n(state.habits.sleep, 1) + 'h · ' + t('czd.bento.sleep')) }
    ];
    var day = currentDay(state);
    var times = I18N.lang === 'fr' ? ['07:30', '12:30', '19:30', '16:00'] : ['7:30 AM', '12:30 PM', '7:30 PM', '4:00 PM'];
    var meals = day ? D.MEAL_SLOTS.map(function (slot, i) {
      var first = (day.meals[slot] || [])[0];
      var food = first ? D.FOODS[first.id] : null;
      return { id: 'meal-' + state.activeDay + '-' + slot, name: food ? foodName(food) : slotLabel(slot), type: 'meal', time: times[i],
        audience: 'friends', icon: food ? food.icon : '🥘', mealSlot: slot, done: !!(day.eaten && day.eaten[slot]), notes: slotLabel(slot) };
    }) : [];
    return custom.concat(defaults, meals).map(function (a) {
      if (!a.custom && !a.mealSlot) a.done = !!(state.activityDone || {})[a.id];
      return a;
    });
  }

  function filteredActivities(state) {
    var query = String(state.searchQuery || '').trim().toLocaleLowerCase();
    return bentoActivities(state).filter(function (a) {
      if (state.activityFilter === 'alone' && a.audience !== 'alone') return false;
      if (state.activityFilter === 'friends' && a.audience !== 'friends') return false;
      if (!query) return true;
      return [a.name, a.type, a.notes, a.time, t('czd.bento.type.' + (a.type === 'workout' ? 'workout' : a.type))].join(' ').toLocaleLowerCase().indexOf(query) !== -1;
    });
  }

  function activityCountText(state) {
    return t('czd.bento.planned', { count: filteredActivities(state).length });
  }

  function activityGrid(state) {
    var matches = filteredActivities(state);
    var cards = matches.slice(0, 3).map(function (a, i) {
      return '<button type="button" class="czd-bento-activity' + (i === 0 ? ' is-featured' : '') + (a.done ? ' is-complete' : '') + '" ' +
        'data-czd-act="activity-toggle" data-czd-activity="' + esc(a.id) + '"' + (a.mealSlot ? ' data-czd-slot="' + a.mealSlot + '"' : '') + ' aria-pressed="' + !!a.done + '">' +
        '<span class="czd-bento-activity-badges" aria-hidden="true"><span class="czd-bento-activity-badge">' + a.icon + '</span>' +
          '<span class="czd-bento-activity-badge">' + (a.audience === 'friends' ? '👥' : '✓') + '</span></span>' +
        '<span class="czd-bento-activity-arrow" aria-hidden="true">↗</span>' +
        '<span class="czd-bento-activity-name">' + esc(a.name) + '</span><span class="czd-bento-activity-time">' + esc(a.time) + '</span>' +
        (a.notes ? '<span class="czd-bento-activity-meta">' + esc(a.notes) + '</span>' : '') +
      '</button>';
    }).join('');
    if (!matches.length) cards = '<div class="czd-bento-empty">' + esc(t('czd.bento.search.empty', { q: state.searchQuery || '' })) + '</div>';
    return cards + '<button type="button" class="czd-bento-activity czd-bento-add" data-czd-act="add-activity">' +
      '<span class="czd-bento-add-plus" aria-hidden="true">+</span><span class="czd-bento-add-label">' + esc(t('czd.bento.add')) + '</span></button>';
  }

  function activitiesCard(state) {
    var filters = [['all', 'czd.bento.filter.all'], ['alone', 'czd.bento.filter.alone'], ['friends', 'czd.bento.filter.friends']];
    return '<article class="czd-bento-card czd-bento-activities">' +
      '<div class="czd-bento-card-head"><h3 class="czd-bento-card-title">' + esc(t('czd.bento.activities')) + '</h3>' +
        '<span class="czd-bento-activity-count" data-czd-activity-count>' + esc(activityCountText(state)) + '</span></div>' +
      '<div class="czd-bento-filters" role="group" aria-label="' + esc(t('czd.bento.activities')) + '">' + filters.map(function (f) {
        var on = state.activityFilter === f[0];
        return '<button type="button" class="czd-bento-filter' + (on ? ' is-on' : '') + '" data-czd-act="activity-filter" data-czd-filter="' + f[0] + '" aria-pressed="' + on + '">' + esc(t(f[1])) + '</button>';
      }).join('') + '</div>' +
      '<div class="czd-bento-activity-grid" data-czd-activities-grid>' + activityGrid(state) + '</div>' +
    '</article>';
  }

  function activityModal() {
    var types = ['running', 'workout', 'meditation', 'walking', 'meal', 'other'];
    return '<div class="czd-bento-modal-layer">' +
      '<div class="czd-bento-modal-backdrop" data-czd-act="modal-close"></div>' +
      '<div class="czd-bento-modal" role="dialog" aria-modal="true" aria-labelledby="czdActivityModalTitle">' +
        '<div class="czd-bento-modal-head"><div><h3 id="czdActivityModalTitle">' + esc(t('czd.bento.modal.title')) + '</h3><p>' + esc(t('czd.bento.modal.subtitle')) + '</p></div>' +
          '<button type="button" class="czd-modal__close czd-bento-close" data-czd-act="modal-close" aria-label="' + esc(t('czd.modal.close')) + '">×</button></div>' +
        '<form class="czd-bento-form" data-czd-activity-form>' +
          '<label class="czd-bento-field"><span>' + esc(t('czd.bento.field.name')) + '</span><input name="name" required maxlength="80" placeholder="' + esc(t('czd.bento.field.namePlaceholder')) + '"></label>' +
          '<div class="czd-bento-form-row"><label class="czd-bento-field"><span>' + esc(t('czd.bento.field.type')) + '</span><select name="type">' +
            types.map(function (type) { return '<option value="' + type + '">' + esc(t('czd.bento.type.' + type)) + '</option>'; }).join('') + '</select></label>' +
            '<label class="czd-bento-field"><span>' + esc(t('czd.bento.field.time')) + '</span><input name="time" type="time" value="19:00" required></label></div>' +
          '<div class="czd-bento-form-row"><label class="czd-bento-field"><span>' + esc(t('czd.bento.field.duration')) + '</span><input name="duration" type="number" value="30" min="1" max="600" required></label>' +
            '<label class="czd-bento-field"><span>' + esc(t('czd.bento.field.audience')) + '</span><select name="audience"><option value="alone">' + esc(t('czd.bento.filter.alone')) + '</option><option value="friends">' + esc(t('czd.bento.filter.friends')) + '</option></select></label></div>' +
          '<label class="czd-bento-field"><span>' + esc(t('czd.bento.field.notes')) + '</span><textarea name="notes" maxlength="180" placeholder="' + esc(t('czd.bento.field.notesPlaceholder')) + '"></textarea></label>' +
          '<p class="czd-bento-form-error" data-czd-activity-error role="alert"></p>' +
          '<div class="czd-bento-modal-actions"><button type="button" class="czd-bento-action" data-czd-act="modal-close">' + esc(t('czd.bento.cancel')) + '</button>' +
            '<button type="submit" class="czd-bento-action is-lime">' + esc(t('czd.bento.create')) + '</button></div>' +
        '</form>' +
      '</div></div>';
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 3. Plan 7 jours                                                  */
  /* ══════════════════════════════════════════════════════════════════ */
  function planPanel(state) {
    if (!state.plan) {
      return '<article class="czd-card czd-card--empty">' +
        '<h3>' + esc(t('czd.plan.title')) + '</h3>' +
        '<p class="czd-note">' + esc(t('czd.plan.sub')) + '</p>' +
        '<button type="button" class="czd-btn czd-btn--primary" data-czd-act="plan-generate">' + icon('spark') + esc(t('czd.plan.generate')) + '</button>' +
      '</article>';
    }
    var plan = state.plan;
    var day = currentDay(state);
    var totals = day.totals;
    var e = plan.energy;
    var delta = Math.round(totals.kcal - plan.target);

    var dayTabs = plan.days.map(function (d, i) {
      var active = i === state.activeDay;
      return '<button type="button" class="czd-day' + (active ? ' is-on' : '') + '" data-czd-day="' + i + '" role="tab" aria-selected="' + active + '">' +
        '<span class="czd-day__name">' + esc(dayShort(i)) + '</span>' +
        '<span class="czd-day__kcal">' + n(Math.round(d.totals.kcal), 0) + '</span>' +
        (i === 0 ? '<span class="czd-day__today">' + esc(t('czd.plan.today')) + '</span>' : '') +
      '</button>';
    }).join('');

    var meals = D.MEAL_SLOTS.map(function (slot) {
      var items = day.meals[slot] || [];
      var kcal = items.reduce(function (a, it) { return a + D.FOODS[it.id].kcal * it.portion; }, 0);
      var eaten = day.eaten && day.eaten[slot];
      return '<div class="czd-meal' + (eaten ? ' is-eaten' : '') + '" data-czd-meal="' + slot + '">' +
        '<div class="czd-meal__head">' +
          '<span class="czd-meal__slot">' + esc(slotLabel(slot)) + '</span>' +
          '<span class="czd-meal__kcal">' + n(Math.round(kcal), 0) + ' kcal</span>' +
          '<button type="button" class="czd-meal__toggle" data-czd-act="toggle-meal" data-czd-slot="' + slot + '" aria-pressed="' + !!eaten + '">' +
            (eaten ? icon('check') + esc(t('czd.plan.eaten')) : esc(t('czd.plan.mark'))) + '</button>' +
        '</div>' +
        '<ul class="czd-meal__items">' + items.map(function (it) {
          var f = D.FOODS[it.id];
          var scorePct = M.foodScore(f);
          return '<li class="czd-food" data-czd-food="' + it.id + '">' +
            '<span class="czd-food__ico" aria-hidden="true">' + f.icon + '</span>' +
            '<span class="czd-food__name">' + esc(foodName(f)) +
              '<small>' + n(Math.round(f.kcal * it.portion), 0) + ' kcal · ' + n(Math.round(f.protein * it.portion), 0) + ' g ' + esc(t('czd.plan.protein').toLowerCase()) +
              ' · ' + n(Math.round(f.fiber * it.portion), 0) + ' g ' + esc(t('czd.plan.fiber').toLowerCase()) + '</small>' +
            '</span>' +
            '<span class="czd-food__portion">×' + n(it.portion, 1) + '</span>' +
            '<span class="czd-food__score" style="--v:' + scorePct + '" title="' + esc(t('czd.plan.details')) + '"><i>' + scorePct + '</i></span>' +
          '</li>';
        }).join('') + '</ul>' +
      '</div>';
    }).join('');

    var micros = plan.micros.map(function (m) {
      return '<div class="czd-micro" data-czd-micro="' + m.key + '">' +
        '<span class="czd-micro__label">' + esc(t(m.labelKey)) + '</span>' +
        '<span class="czd-micro__track"><i style="--w:' + Math.min(100, m.coverage) + '%;--c:' + m.color + '"></i></span>' +
        '<span class="czd-micro__val">' + n(m.value, 0) + ' <small>' + esc(m.unit) + '</small></span>' +
        '<span class="czd-micro__pct">' + (m.coverage >= 100 ? icon('check') : n(m.coverage, 0) + '%') + '</span>' +
      '</div>';
    }).join('');

    var shopping = Object.keys(plan.shopping || {}).map(function (g) {
      return '<div class="czd-shop__group"><b>' + esc(groceryLabel(g)) + '</b>' +
        plan.shopping[g].map(function (f) {
          return '<span class="czd-shop__item">' + f.icon + ' ' + esc(f.name[I18N.lang] || f.name.en) + '</span>';
        }).join('') + '</div>';
    }).join('');

    var heat = heatmap(state);
    var tip = (D.TIPS || [])[(state.activeDay + 3) % (D.TIPS || ['czd.tip.1']).length];

    return '' +
      '<div class="czd-planbar">' +
        '<div class="czd-planbar__left">' +
          '<h3>' + esc(t('czd.plan.title')) + '</h3>' +
          '<p class="czd-note">' + esc(t('czd.plan.sub')) + '</p>' +
        '</div>' +
        '<div class="czd-planbar__right">' +
          '<button type="button" class="czd-btn czd-btn--primary" data-czd-act="plan-generate">' + icon('spark') + esc(t('czd.plan.regenerate')) + '</button>' +
          '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="plan-csv">' + icon('download') + esc(t('czd.plan.csv')) + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="czd-planmetrics">' +
        planMetric('czd.plan.kcal', n(Math.round(totals.kcal), 0), '/ ' + n(plan.target, 0), Math.abs(delta) < 150 ? 'ok' : 'warn') +
        planMetric('czd.plan.protein', n(totals.protein, 0) + ' g', '/ ' + n(e.proteinTarget, 0) + ' g', totals.protein >= e.proteinTarget * 0.9 ? 'ok' : 'warn') +
        planMetric('czd.plan.fiber', n(totals.fiber, 0) + ' g', '/ ' + n(e.fiberTarget, 0) + ' g', totals.fiber >= e.fiberTarget * 0.9 ? 'ok' : 'warn') +
        planMetric('czd.plan.iron', n(totals.iron, 1) + ' mg', '/ 18 mg', totals.iron >= 16 ? 'ok' : 'warn') +
        planMetric('czd.plan.budget', n(Math.round(totals.cost), 0), t('czd.plan.budget.unit'), 'info') +
        planMetric('czd.plan.localFoods', n(countFoods(day), 0), '🥘', 'info') +
      '</div>' +
      '<div class="czd-days" role="tablist" aria-label="' + esc(t('czd.plan.title')) + '">' + dayTabs + '</div>' +
      '<div class="czd-grid czd-grid--plan">' +
        '<article class="czd-card czd-card--meals">' +
          '<div class="czd-card__head">' +
            '<h3>' + esc(dayLong(state.activeDay)) + '</h3>' +
            '<span class="czd-pill ' + (Math.abs(delta) < 150 ? 'is-ok' : 'is-warn') + '">' +
              esc(Math.abs(delta) < 150 ? t('czd.plan.onTarget') : t('czd.plan.shift', { n: n(Math.abs(delta), 0) })) + '</span>' +
          '</div>' +
          meals +
        '</article>' +
        '<div class="czd-plan__side">' +
          '<article class="czd-card"><div class="czd-card__head"><h3>' + esc(t('czd.micro.title')) + '</h3></div>' +
            '<div class="czd-micros">' + micros + '</div></article>' +
          '<article class="czd-card"><div class="czd-card__head"><h3>' + esc(t('czd.plan.heat.title')) + '</h3>' +
            '<span class="czd-pill">' + esc(t('czd.plan.adherence')) + ' ' + (state.scores.adherence == null ? '—' : n(state.scores.adherence, 0) + ' %') + '</span></div>' +
            '<p class="czd-note">' + esc(t('czd.plan.heat.sub')) + '</p>' + heat + '</article>' +
          '<article class="czd-card"><div class="czd-card__head"><h3>' + esc(t('czd.plan.shopping')) + '</h3></div>' +
            '<p class="czd-note">' + esc(t('czd.plan.shopping.hint')) + '</p>' +
            '<div class="czd-shop">' + shopping + '</div></article>' +
        '</div>' +
      '</div>' +
      '<div class="czd-grid">' +
        '<article class="czd-card czd-card--tip">' +
          '<div class="czd-card__head"><h3>' + esc(t('czd.plan.tip.title')) + '</h3><span class="czd-pill">' + icon('leaf') + '</span></div>' +
          '<p class="czd-tip">' + esc(t(tip)) + '</p>' +
          '<button type="button" class="czd-link" data-czd-act="explain" data-czd-topic="plan">' + esc(t('czd.priority.cta.learn')) + ' →</button>' +
        '</article>' +
        '<article class="czd-card czd-card--weekchart">' +
          '<div class="czd-card__head"><h3>' + esc(t('czd.gi.title')) + '</h3></div>' +
          C.columnWeek({
            values: plan.days.map(function (d) { return M.glycemicLoad(d); }),
            labels: dayShortLabels(),
            colors: plan.days.map(function (d) { return M.glycemicLoad(d) > 130 ? '#c0453c' : M.glycemicLoad(d) > 100 ? '#d98200' : '#0f9d58'; }),
            target: 100, aria: t('czd.gi.title')
          }) +
        '</article>' +
      '</div>';
  }

  function planMetric(labelKey, value, sub, toneCls) {
    return '<div class="czd-pm czd-pm--' + toneCls + '">' +
      '<span>' + esc(t(labelKey)) + '</span><b>' + value + '</b><small>' + esc(sub) + '</small></div>';
  }

  function countFoods(day) {
    var seen = {};
    D.MEAL_SLOTS.forEach(function (slot) {
      (day.meals[slot] || []).forEach(function (it) { seen[it.id] = true; });
    });
    return Object.keys(seen).length;
  }

  function heatmap(state) {
    var plan = state.plan;
    if (!plan) return '';
    var head = '<div class="czd-heat__head"><span></span>' + D.MEAL_SLOTS.map(function (s) {
      return '<span>' + esc(slotLabel(s).slice(0, 3)) + '</span>';
    }).join('') + '</div>';
    var rows = plan.days.map(function (d, i) {
      return '<div class="czd-heat__row' + (i === state.activeDay ? ' is-on' : '') + '">' +
        '<span class="czd-heat__day">' + esc(dayShort(i)) + '</span>' +
        D.MEAL_SLOTS.map(function (s) {
          var on = d.eaten && d.eaten[s];
          return '<button type="button" class="czd-heat__cell' + (on ? ' is-on' : '') + '" data-czd-act="toggle-heat" data-czd-day="' + i + '" data-czd-slot="' + s + '" ' +
            'aria-pressed="' + !!on + '" aria-label="' + esc(dayShort(i) + ' ' + slotLabel(s)) + '">' +
            (on ? icon('check') : '') + '</button>';
        }).join('') +
      '</div>';
    }).join('');
    return '<div class="czd-heat">' + head + rows + '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 4. Analyse clinique                                              */
  /* ══════════════════════════════════════════════════════════════════ */
  function clinicalPanel(state) {
    var p = state.profile, ind = state.indicator, vit = state.vitals;
    var notes = state.notes.map(function (nt) {
      return '<li class="czd-clinenote czd-clinenote--' + nt.tone + '">' + icon(nt.tone === 'good' ? 'check' : nt.tone === 'info' ? 'book' : 'alert') +
        '<span>' + esc(t(nt.textKey, nt.params)) + '</span></li>';
    }).join('');

    var rows = [
      row('czd.kpi.bmi', n(ind.bmi, 1) + ' kg/m²', I18N.lang === 'fr' ? '18,5 – 24,9' : '18.5 – 24.9', ind.bmiStatus, positionBmi(ind.bmi)),
      row('czd.kpi.waist', n(p.waist, 0) + ' cm', '≤ ' + (ind.waistStatus.max || 80) + ' cm', ind.waistStatus, positionRatio(p.waist, ind.waistStatus.max || 80)),
      row('czd.kpi.whtr', n(ind.whtr, 2), '≤ 0,50', ind.whtrStatus, positionRatio(ind.whtr, 0.5)),
      row('czd.kpi.glucose', n(vit.glucose, 1) + ' mmol/L', I18N.lang === 'fr' ? '3,9 – 5,5' : '3.9 – 5.5', vit.glucoseStatus, positionBand(vit.glucose, 3.9, 5.5, 7)),
      row('czd.kpi.hba1c', n(vit.hba1c, 1) + ' %', '< 5,7', vit.hba1cStatus, positionRatio(vit.hba1c, 6.5)),
      row('czd.kpi.bp', (p.sys || '—') + '/' + (p.dia || '—') + ' mmHg', '< 120/80', vit.bpStatus, positionBand(p.sys, 110, 120, 160)),
      row('czd.kpi.whr', n(ind.whr, 2), p.sex === 'male' ? '< 0,90' : '< 0,85', ind.whrStatus, positionRatio(ind.whr, 0.95)),
      row('czd.kpi.fiber', n(state.plan ? state.plan.days[state.activeDay].totals.fiber : 0, 0) + ' g', n(state.energy.fiberTarget, 0) + ' g', { key: 'normal', tone: 'good' }, positionRatio(state.plan ? state.plan.days[state.activeDay].totals.fiber : 0, state.energy.fiberTarget))
    ].join('');

    var radarAxes = [
      { label: t('czd.kpi.bmi'), value: clampScore(100 - Math.abs((ind.bmi || 22) - 22) * 11, 10, 100) },
      { label: t('czd.kpi.waist'), value: clampScore(100 - Math.max(0, (p.waist || 0) - (ind.waistStatus.max || 80)) * 3.4, 10, 100) },
      { label: t('czd.kpi.glucose'), value: clampScore(100 - Math.max(0, (vit.glucose || 5) - 5.5) * 34, 12, 100) },
      { label: t('czd.kpi.bp'), value: clampScore(100 - Math.max(0, (p.sys || 115) - 120) * 2.4, 12, 100) },
      { label: t('czd.kpi.hba1c'), value: clampScore(100 - Math.max(0, (vit.hba1c || 5.4) - 5.7) * 40, 12, 100) },
      { label: t('czd.macro.fiber'), value: clampScore((state.plan ? state.plan.days[state.activeDay].totals.fiber : 0) / state.energy.fiberTarget * 100, 12, 100) }
    ];

    return '' +
      '<div class="czd-clin">' +
        clinicalForm(state) +
        '<div class="czd-clin__side" data-czd-derived="side">' + clinicalSide(state) + '</div>' +
      '</div>' +
      '<div data-czd-derived="charts">' + clinicalCharts(state) + '</div>';
  }

  function clinicalForm(state) {
    var p = state.profile, vit = state.vitals;
    return '<article class="czd-card czd-card--form">' +
        '<div class="czd-card__head"><h3>' + esc(t('czd.clin.form')) + '</h3>' +
          '<span class="czd-chip czd-chip--live"><i></i>' + esc(t('czd.clin.live')) + '</span></div>' +
        '<p class="czd-note">' + esc(t('czd.clin.sub')) + '</p>' +
        '<form class="czd-form" data-czd-form onsubmit="return false">' +
          field('sex', t('czd.clin.sex'), 'select', p.sex, [['female', t('czd.sex.female')], ['male', t('czd.sex.male')]]) +
          numField('age', t('czd.clin.age'), p.age, 1, 110, 1) +
          numField('height', t('czd.clin.height'), p.height, 60, 230, 1) +
          numField('weight', t('czd.clin.weight'), p.weight, 15, 250, 0.1) +
          numField('waist', t('czd.clin.waist'), p.waist, 40, 200, 1) +
          numField('hip', t('czd.clin.hip'), p.hip, 40, 220, 1) +
          numField('glucose', t('czd.clin.glucose'),
            (p.glucoseUnit === 'mgdl' ? Math.round((Number(vit.glucose) || 0) * 18) : (Number(vit.glucose) || '')),
            (p.glucoseUnit === 'mgdl' ? 40 : 2), (p.glucoseUnit === 'mgdl' ? 550 : 30),
            (p.glucoseUnit === 'mgdl' ? 1 : 0.1)) +
          field('glucoseUnit', t('czd.clin.glucoseUnit'), 'select', p.glucoseUnit || 'mmol', [['mmol', 'mmol/L'], ['mgdl', 'mg/dL']]) +
          numField('hba1c', t('czd.clin.hba1c'), p.hba1c, 3, 18, 0.1) +
          numField('sys', t('czd.clin.sys'), p.sys, 70, 240, 1) +
          numField('dia', t('czd.clin.dia'), p.dia, 40, 150, 1) +
          numField('chol', t('czd.clin.chol'), p.chol, 1, 15, 0.1) +
          numField('creatinine', t('czd.clin.creat'), p.creatinine, 20, 900, 1) +
          field('activity', t('czd.clin.activity'), 'select', p.activity, (D.ACTIVITY_LEVELS || []).map(function (a) { return [a.key, a.icon + ' ' + t(a.labelKey)]; })) +
        '</form>' +
        '<div class="czd-form__foot">' +
          '<span class="czd-live-stamp" data-czd-stamp>' + esc(t('czd.clin.live.at', { t: I18N.date(Date.now()) })) + '</span>' +
          '<button type="button" class="czd-btn czd-btn--save" data-czd-act="save">' + icon('check') + esc(t('czd.clin.save')) + '</button>' +
          '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="form-reset">' + esc(t('czd.clin.resetForm')) + '</button>' +
        '</div>' +
      '</article>';
  }

  function clinicalSide(state) {
    var p = state.profile, ind = state.indicator, vit = state.vitals;
    var rows = [
      row('czd.kpi.bmi', n(ind.bmi, 1) + ' kg/m²', I18N.lang === 'fr' ? '18,5 – 24,9' : '18.5 – 24.9', ind.bmiStatus, positionBmi(ind.bmi)),
      row('czd.kpi.waist', n(p.waist, 0) + ' cm', '≤ ' + (ind.waistStatus.max || 80) + ' cm', ind.waistStatus, positionRatio(p.waist, ind.waistStatus.max || 80)),
      row('czd.kpi.whtr', n(ind.whtr, 2), '≤ 0,50', ind.whtrStatus, positionRatio(ind.whtr, 0.5)),
      row('czd.kpi.glucose', n(vit.glucose, 1) + ' mmol/L', I18N.lang === 'fr' ? '3,9 – 5,5' : '3.9 – 5.5', vit.glucoseStatus, positionBand(vit.glucose, 3.9, 5.5, 7)),
      row('czd.kpi.hba1c', n(vit.hba1c, 1) + ' %', '< 5,7', vit.hba1cStatus, positionRatio(vit.hba1c, 6.5)),
      row('czd.kpi.bp', (p.sys || '—') + '/' + (p.dia || '—') + ' mmHg', '< 120/80', vit.bpStatus, positionBand(p.sys, 110, 120, 160)),
      row('czd.kpi.whr', n(ind.whr, 2), p.sex === 'male' ? '< 0,90' : '< 0,85', ind.whrStatus, positionRatio(ind.whr, 0.95)),
      row('czd.clin.creat', n(p.creatinine, 0) + ' µmol/L', '> 60 mL/min', vit.egfrStatus, positionRatio(vit.egfr || 90, 120))
    ].join('');
    var radarAxes = [
      { label: t('czd.kpi.bmi'), value: clampScore(100 - Math.abs((ind.bmi || 22) - 22) * 11, 10, 100) },
      { label: t('czd.kpi.waist'), value: clampScore(100 - Math.max(0, (p.waist || 0) - (ind.waistStatus.max || 80)) * 3.4, 10, 100) },
      { label: t('czd.kpi.glucose'), value: clampScore(100 - Math.max(0, (vit.glucose || 5) - 5.5) * 34, 12, 100) },
      { label: t('czd.kpi.bp'), value: clampScore(100 - Math.max(0, (p.sys || 115) - 120) * 2.4, 12, 100) },
      { label: t('czd.kpi.hba1c'), value: clampScore(100 - Math.max(0, (vit.hba1c || 5.4) - 5.7) * 40, 12, 100) },
      { label: t('czd.macro.fiber'), value: clampScore((state.plan ? state.plan.days[state.activeDay].totals.fiber : 0) / state.energy.fiberTarget * 100, 12, 100) }
    ];
    return '<article class="czd-card czd-card--table">' +
        '<div class="czd-card__head"><h3>' + esc(t('czd.clin.ref')) + '</h3>' +
          '<span class="czd-pill">' + esc(t('czd.clin.ref')) + '</span></div>' +
        '<div class="czd-tablewrap"><table class="czd-table"><thead><tr>' +
          '<th>' + esc(t('czd.clin.table.param')) + '</th><th>' + esc(t('czd.clin.table.value')) + '</th>' +
          '<th>' + esc(t('czd.clin.table.ref')) + '</th><th>' + esc(t('czd.clin.table.status')) + '</th>' +
          '<th class="czd-table__zone">' + esc(t('czd.clin.table.zone')) + '</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<p class="czd-note">' + esc(t('czd.clin.note')) + '</p>' +
      '</article>' +
      '<article class="czd-card czd-card--radar">' +
        '<div class="czd-card__head"><h3>' + esc(t('czd.clin.radar')) + '</h3></div>' +
        '<p class="czd-note">' + esc(t('czd.clin.radar.sub')) + '</p>' +
        C.radar({ axes: radarAxes, aria: t('czd.clin.radar') }) +
      '</article>';
  }

  function clinicalCharts(state) {
    var h = state.history;
    var notes = state.notes.map(function (nt) {
      return '<li class="czd-clinenote czd-clinenote--' + nt.tone + '">' + icon(nt.tone === 'good' ? 'check' : nt.tone === 'info' ? 'book' : 'alert') +
        '<span>' + esc(t(nt.textKey, nt.params)) + '</span></li>';
    }).join('');
    return '<div class="czd-grid">' +
        '<article class="czd-card czd-card--chart"><div class="czd-card__head"><h3>' + esc(t('czd.clin.trend.weight')) + '</h3></div>' +
          C.line({ labels: labels14(state), series: [{ label: t('czd.kpi.weight'), values: h.map(function (d) { return d.weight; }), color: '#0f9d58' }, { label: t('czd.kpi.waist'), values: h.map(function (d) { return d.waist; }), color: '#1f7ae0' }], height: 200, valueDecimals: 1 }) +
        '</article>' +
        '<article class="czd-card czd-card--chart"><div class="czd-card__head"><h3>' + esc(t('czd.clin.trend.metabolic')) + '</h3></div>' +
          C.line({ labels: labels14(state), series: [{ label: t('czd.kpi.glucose'), values: h.map(function (d) { return d.glucose; }), color: '#c0453c' }, { label: t('czd.kpi.bp') + ' (sys)', values: h.map(function (d) { return d.sys; }), color: '#8b5cf6' }], height: 200, valueDecimals: 1 }) +
        '</article>' +
      '</div>' +
      '<article class="czd-card czd-card--notes">' +
        '<div class="czd-card__head"><h3>' + esc(t('czd.clin.notes.title')) + '</h3>' +
          '<button type="button" class="czd-info" data-czd-act="explain" data-czd-topic="score">?</button></div>' +
        '<ul class="czd-clinenotes">' + notes + '</ul>' +
        '<div class="czd-refs">' +
          refChip('czd.kpi.bmi', '18,5–24,9 kg/m²') + refChip('czd.kpi.waist', '≤ 80 / 94 cm') +
          refChip('czd.kpi.glucose', '3,9–5,5 mmol/L') + refChip('czd.kpi.bp', '< 120/80 mmHg') +
          refChip('czd.kpi.hba1c', '< 5,7 %') + refChip('czd.kpi.chol', '< 5,0 mmol/L') +
        '</div>' +
      '</article>';
  }

  function clampScore(v, a, b) { return Math.max(a, Math.min(b, Math.round(v))); }
  function positionRatio(v, max) { return Math.max(2, Math.min(100, Math.round(((v || 0) / (max || 1)) * 100))); }
  function positionBand(v, min, max, bad) {
    if (v == null) return 50;
    if (v <= max) return Math.max(4, Math.min(96, Math.round(((v - min * 0.4) / (max - min * 0.4)) * 60)));
    return Math.min(100, 60 + Math.round(((v - max) / (bad - max)) * 40));
  }
  function positionBmi(bmi) {
    if (bmi == null) return 50;
    return Math.max(4, Math.min(100, Math.round(((bmi - 14) / (40 - 14)) * 100)));
  }
  function row(labelKey, value, ref, status, position) {
    return '<tr>' +
      '<td>' + esc(t(labelKey)) + '</td>' +
      '<td><b>' + esc(value) + '</b></td>' +
      '<td class="czd-table__ref">' + esc(ref) + '</td>' +
      '<td><span class="czd-tag czd-tag--' + tone(status.tone) + '">' + esc(statusText(status.key)) + '</span></td>' +
      '<td class="czd-table__zone"><span class="czd-zone"><i style="--p:' + position + '%"></i><em></em></span></td>' +
    '</tr>';
  }
  function refChip(labelKey, ref) {
    return '<span class="czd-refchip"><b>' + esc(t(labelKey)) + '</b>' + esc(ref) + '</span>';
  }
  function field(name, label, type, value, options) {
    return '<label class="czd-field"><span>' + esc(label) + '</span>' +
      '<select data-czd-input="' + name + '">' + (options || []).map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select></label>';
  }
  function numField(name, label, value, min, max, step) {
    return '<label class="czd-field"><span>' + esc(label) + '</span>' +
      '<input type="number" data-czd-input="' + name + '" value="' + esc(value) + '" min="' + min + '" max="' + max + '" step="' + step + '" inputmode="decimal"></label>';
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 5. Famille & mineurs                                             */
  /* ══════════════════════════════════════════════════════════════════ */
  function familyPanel(state) {
    var child = M.childAnalysis(state.activeChild);
    var ref = child.ref;
    var granted = state.familyAccess;
    var children = [
      ['child1', 'czd.family.child1'], ['child2', 'czd.family.child2']
    ];
    var selector = '<div class="czd-childsel" role="tablist" aria-label="' + esc(t('czd.family.member')) + '">' +
      children.map(function (c) {
        return '<button type="button" class="czd-child' + (state.activeChild === c[0] ? ' is-on' : '') + '" data-czd-child="' + c[0] + '" role="tab" aria-selected="' + (state.activeChild === c[0]) + '">' +
          '<span aria-hidden="true">' + (c[0] === 'child1' ? '👧🏾' : '👦🏾') + '</span>' + esc(t(c[1])) + '</button>';
      }).join('') + '</div>';

    var groups = [
      ['cereals', '🌾', 'czd.family.group.cereals'],
      ['legumes', '🫘', 'czd.family.group.legumes'],
      ['vegetables', '🥬', 'czd.family.group.vegetables'],
      ['animal', '🐟', 'czd.family.group.animal'],
      ['fats', '🫒', 'czd.family.group.fats'],
      ['dairy', '🥛', 'czd.family.group.dairy']
    ];
    var diversity = state.childDiversity[state.activeChild] || [];
    var groupHtml = groups.map(function (g) {
      var on = diversity.indexOf(g[0]) !== -1;
      return '<button type="button" class="czd-group' + (on ? ' is-on' : '') + '" data-czd-group="' + g[0] + '" aria-pressed="' + on + '">' +
        '<span aria-hidden="true">' + g[1] + '</span>' + esc(t(g[2])) + (on ? icon('check') : '') + '</button>';
    }).join('');

    return '' +
      '<article class="czd-card czd-card--family">' +
        '<div class="czd-card__head">' +
          '<div><span class="czd-pill">' + esc(t('czd.family.pill')) + '</span>' +
            '<h3>' + esc(t('czd.family.title')) + '</h3>' +
            '<p class="czd-note">' + esc(t('czd.family.sub')) + '</p></div>' +
          '<span class="czd-badge czd-badge--lock">' + icon('lock') + esc(t('czd.family.badge')) + '</span>' +
        '</div>' +
        '<div class="czd-familybar">' +
          selector +
          '<div class="czd-familybar__actions">' +
            '<button type="button" class="czd-btn ' + (granted ? 'czd-btn--danger' : 'czd-btn--primary') + '" data-czd-act="consent">' +
              icon(granted ? 'lock' : 'check') + esc(granted ? t('czd.family.revoke') : t('czd.family.request')) + '</button>' +
            '<span class="czd-consent ' + (granted ? 'is-on' : '') + '"><i></i>' +
              esc(granted ? t('czd.family.granted') : t('czd.family.consent')) + '</span>' +
          '</div>' +
        '</div>' +
        (granted ? '' : '<div class="czd-lock">' + icon('lock') +
          '<span>' + esc(t('czd.family.locked')) + '</span></div>') +
        '<div class="czd-family ' + (granted ? '' : 'is-locked') + '">' +
          '<div class="czd-childstats">' +
            childStat('👧🏾', t('czd.family.member'), ref.name + ' · ' + ref.age + ' ' + (I18N.lang === 'fr' ? 'ans' : 'yrs'), '') +
            childStat('📏', t('czd.kpi.bmi'), n(ref.bmi, 1), t('czd.family.bmiAge')) +
            childStat('🌱', t('czd.family.zscore'), (child.zscore > 0 ? '+' : '') + n(child.zscore, 1), child.band === 'good' ? t('czd.family.growth.onTrack') : t('czd.family.growth.watch')) +
            childStat('📅', t('czd.family.nextVisit'), t('czd.family.nextVisit.value'), '') +
          '</div>' +
          '<div class="czd-grid czd-grid--family">' +
            '<article class="czd-subcard">' +
              '<div class="czd-card__head"><h4>' + esc(t('czd.family.growth')) + '</h4></div>' +
              '<p class="czd-note">' + esc(t('czd.family.growth.sub')) + '</p>' +
              C.growth({ points: child.points, curve: child.curve, label: ref.name, refLabel: t('czd.ref.whoMedian'), aria: t('czd.family.growth') }) +
            '</article>' +
            '<article class="czd-subcard">' +
              '<div class="czd-card__head"><h4>' + esc(t('czd.family.diversity')) + '</h4>' +
                '<span class="czd-pill ' + (diversity.length >= 5 ? 'is-ok' : 'is-warn') + '">' + diversity.length + ' / 6</span></div>' +
              '<p class="czd-note">' + esc(t('czd.family.diversity.sub')) + '</p>' +
              '<div class="czd-groups">' + groupHtml + '</div>' +
              '<div class="czd-alertbox ' + (diversity.length >= 5 ? 'is-ok' : 'is-warn') + '">' +
                icon(diversity.length >= 5 ? 'check' : 'alert') +
                '<span>' + esc(diversity.length >= 5 ? t('czd.family.noAlert') : t('czd.family.alert1')) + '</span></div>' +
            '</article>' +
          '</div>' +
          '<div class="czd-family__foot">' +
            '<span class="czd-hint">' + esc(t('czd.family.disclaimer')) + '</span>' +
            '<div class="czd-family__btns">' +
              '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="child-plan">' + icon('plate') + esc(t('czd.family.plan')) + '</button>' +
              '<button type="button" class="czd-btn czd-btn--soft" data-czd-act="child-full">' + icon('family') + esc(t('czd.family.full')) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function childStat(emoji, label, value, sub) {
    return '<div class="czd-childstat"><span class="czd-childstat__ico" aria-hidden="true">' + emoji + '</span>' +
      '<span class="czd-childstat__label">' + esc(label) + '</span>' +
      '<b>' + esc(value) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 6. Modale explicative                                            */
  /* ══════════════════════════════════════════════════════════════════ */
  function modal(topic) {
    if (topic === 'activity') return activityModal();
    var keys = {
      bmi: ['czd.modal.bmi.title', 'czd.modal.bmi.body'],
      waist: ['czd.modal.waist.title', 'czd.modal.waist.body'],
      glucose: ['czd.modal.glucose.title', 'czd.modal.glucose.body'],
      bp: ['czd.modal.bp.title', 'czd.modal.bp.body'],
      score: ['czd.modal.score.title', 'czd.modal.score.body'],
      risk: ['czd.modal.risk.title', 'czd.modal.risk.body'],
      plan: ['czd.modal.plan.title', 'czd.modal.plan.body'],
      family: ['czd.modal.family.title', 'czd.modal.family.body'],
      whtr: ['czd.modal.waist.title', 'czd.modal.waist.body'],
      weight: ['czd.modal.bmi.title', 'czd.modal.bmi.body']
    };
    var k = keys[topic] || keys.score;
    return '<div class="czd-modal" role="dialog" aria-modal="true" aria-labelledby="czdModalTitle">' +
      '<div class="czd-modal__backdrop" data-czd-act="modal-close"></div>' +
      '<div class="czd-modal__panel">' +
        '<button type="button" class="czd-modal__close" data-czd-act="modal-close" aria-label="' + esc(t('czd.modal.close')) + '">×</button>' +
        '<span class="czd-modal__kicker">' + icon('book') + esc(t('czd.kicker')) + '</span>' +
        '<h3 id="czdModalTitle">' + esc(t(k[0])) + '</h3>' +
        '<p>' + esc(t(k[1])) + '</p>' +
        '<div class="czd-modal__foot">' +
          '<button type="button" class="czd-btn czd-btn--primary" data-czd-act="modal-close">' + esc(t('czd.modal.close')) + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* 7. Helpers                                                       */
  /* ══════════════════════════════════════════════════════════════════ */
  function currentDay(state) {
    if (!state.plan) return null;
    return state.plan.days[state.activeDay] || state.plan.days[0];
  }

  function slotLabel(slot) {
    return t('czd.plan.' + slot);
  }

  function dayShort(i) {
    var names = (D.DAY_NAMES || {})[I18N.lang] || [];
    return (names[i] || 'J' + (i + 1)).slice(0, 3);
  }
  function dayLong(i) {
    var names = (D.DAY_NAMES || {})[I18N.lang] || [];
    return t('czd.plan.day', { n: i + 1 }) + ' · ' + (names[i] || '');
  }
  function dayShortLabels() {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(dayShort(i));
    return out;
  }

  function groceryLabel(g) {
    var map = {
      cereal: { fr: 'Céréales', en: 'Cereals' },
      tuber: { fr: 'Tubercules', en: 'Tubers' },
      legume: { fr: 'Légumineuses', en: 'Legumes' },
      vegetable: { fr: 'Légumes & fruits', en: 'Vegetables & fruit' },
      fruit: { fr: 'Fruits', en: 'Fruit' },
      animal: { fr: 'Protéines animales', en: 'Animal protein' },
      dairy: { fr: 'Lait & dérivés', en: 'Milk & dairy' },
      fat: { fr: 'Graisses & oléagineux', en: 'Fats & oilseeds' },
      other: { fr: 'Autres', en: 'Other' }
    };
    return (map[g] || map.other)[I18N.lang] || g;
  }

  global.CZD_TPL = {
    shell: shell,
    overview: overview,
    legacyOverview: legacyOverview,
    activityGrid: activityGrid,
    activityCountText: activityCountText,
    planPanel: planPanel,
    clinicalPanel: clinicalPanel,
    clinicalSide: clinicalSide,
    clinicalCharts: clinicalCharts,
    familyPanel: familyPanel,
    modal: modal,
    header: header
  };
})(window);
