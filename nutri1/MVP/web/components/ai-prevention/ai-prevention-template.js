/* ============================================================================
 * NUTRI.N°1 — AI Nutrition & Prevention Engine · gabarits HTML
 * ----------------------------------------------------------------------------
 * Le module est rendu dans le light DOM de #ai. Tous les textes passent par
 * AIP_I18N.t() / AIP_I18N.loc() : aucun attribut data-i18n n’est utilisé, car
 * la couche i18n de la plateforme écraserait le contenu dynamique.
 *
 *   AIP_TEMPLATE.shell(state)              → ossature (en-tête, étapes, scène)
 *   AIP_TEMPLATE.step1(state)              → capteurs + données médicales + habitudes
 *   AIP_TEMPLATE.scanner(state)            → écran d’analyse spectaculaire
 *   AIP_TEMPLATE.results(result, mode)     → score, 4 risques, timeline
 *   AIP_TEMPLATE.plan(plan, result, state) → programme 7 jours
 * ========================================================================== */
(function (global) {
  'use strict';

  var I18N = global.AIP_I18N;
  var CHARTS = global.AIP_CHARTS;
  var MODEL = global.AIP_MODEL;
  var DATA = global.AIP_DATA;

  function t(key, params) { return I18N.t(key, params); }
  function loc(obj) { return I18N.loc(obj); }
  function icon(name, cls) { return CHARTS.icon(name, cls); }
  function num(n) { return String(n); }

  /* Le dégradé de texte (background-clip) rendrait l’emoji monochrome :
     on isole le pictogramme d’ouverture dans son propre span. */
  function splitTitle(raw) {
    try {
      var m = raw.match(/^([\p{Extended_Pictographic}\uFE0F\u200D]+)\s*/u);
      if (m) return { emoji: m[1], text: raw.slice(m[0].length) };
    } catch (e) { /* moteurs sans propriétés Unicode */ }
    return { emoji: '', text: raw };
  }

  /* ------------------------------------------------------------------ */
  /* 1. Ossature                                                         */
  /* ------------------------------------------------------------------ */
  function shell(state) {
    var stepLabels = ['ai.step1', 'ai.step2', 'ai.step3', 'ai.step4'];
    var steps = stepLabels.map(function (key, i) {
      var n = i + 1;
      return '<button class="aip-step-tab' + (n === 1 ? ' is-active' : '') + '" data-goto="' + n + '" role="tab" ' +
        'aria-selected="' + (n === 1) + '" aria-controls="aipStep' + n + '" id="aipTab' + n + '" type="button">' +
        '<span class="aip-step-tab__num">' + n + '</span>' +
        '<span class="aip-step-tab__label">' + t(key) + '</span>' +
        '</button>' +
        (n < 4 ? '<span class="aip-step-tab__link" aria-hidden="true"></span>' : '');
    }).join('');

    return '' +
      '<div class="aip-aurora" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<header class="aip-head">' +
        '<div class="aip-head__main">' +
          '<span class="aip-kicker"><i class="aip-kicker__dot"></i>' + t('ai.kicker') + '</span>' +
          '<h2 class="aip-title">' + (function () {
            var parts = splitTitle(t('ai.title'));
            return (parts.emoji ? '<span class="aip-title__emoji" aria-hidden="true">' + parts.emoji + '</span>' : '') +
              '<span class="aip-title__text">' + parts.text + '</span>';
          })() + '</h2>' +
          '<p class="aip-subtitle">' + t('ai.subtitle') + '</p>' +
          '<div class="aip-badges">' +
            '<span class="aip-badge">' + icon('spark') + t('ai.badge.deterministic') + '</span>' +
            '<span class="aip-badge">' + icon('activity') + t('ai.badge.vanilla') + '</span>' +
            '<span class="aip-badge">' + icon('lock') + t('ai.badge.privacy') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="aip-head__tools">' +
          '<div class="aip-lang" role="group" aria-label="FR / EN">' +
            '<button type="button" data-aip-lang="fr"' + (I18N.lang === 'fr' ? ' class="is-active"' : '') + '>' + t('ai.lang.fr') + '</button>' +
            '<button type="button" data-aip-lang="en"' + (I18N.lang === 'en' ? ' class="is-active"' : '') + '>' + t('ai.lang.en') + '</button>' +
          '</div>' +
          '<div class="aip-presets">' +
            '<span class="aip-presets__title">' + t('ai.preset.title') + '</span>' +
            '<div class="aip-presets__row">' +
              '<button type="button" class="aip-chipbtn" data-preset="risk">' + t('ai.preset.risk') + '</button>' +
              '<button type="button" class="aip-chipbtn" data-preset="balanced">' + t('ai.preset.balanced') + '</button>' +
              '<button type="button" class="aip-chipbtn aip-chipbtn--ghost" data-reset>' + icon('refresh') + t('ai.reset') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<nav class="aip-steps" role="tablist" aria-label="' + t('ai.step1') + '">' + steps + '</nav>' +
      '<div class="aip-stage">' +
        '<section class="aip-step is-active" id="aipStep1" role="tabpanel" aria-labelledby="aipTab1" data-step="1"></section>' +
        '<section class="aip-step" id="aipStep2" role="tabpanel" aria-labelledby="aipTab2" data-step="2"></section>' +
        '<section class="aip-step" id="aipStep3" role="tabpanel" aria-labelledby="aipTab3" data-step="3"></section>' +
        '<section class="aip-step" id="aipStep4" role="tabpanel" aria-labelledby="aipTab4" data-step="4"></section>' +
      '</div>' +
      '<p class="aip-disclaimer">' + icon('info') + '<span>' + t('ai.disclaimer') + '</span></p>';
  }

  /* ------------------------------------------------------------------ */
  /* Blocs de contrôle réutilisables                                     */
  /* ------------------------------------------------------------------ */
  function slider(opts) {
    var qLabel = t('ai.q.' + opts.quality);
    return '' +
      '<div class="aip-control" data-control="' + opts.field + '">' +
        '<div class="aip-control__head">' +
          '<label for="aip-' + opts.field + '">' + t(opts.labelKey) + '</label>' +
          '<span class="aip-quality aip-quality--' + opts.quality + '" data-quality-key="' + opts.quality + '">' + qLabel + '</span>' +
        '</div>' +
        '<div class="aip-control__row">' +
          '<input type="range" id="aip-' + opts.field + '" data-field="' + opts.field + '" ' +
            'min="' + opts.min + '" max="' + opts.max + '" step="' + opts.step + '" value="' + opts.value + '" ' +
            'aria-label="' + t(opts.labelKey) + '" />' +
          '<output class="aip-control__value" for="aip-' + opts.field + '">' +
            '<b data-out="' + opts.field + '">' + opts.display + '</b>' +
            '<small>' + t(opts.unitKey) + '</small>' +
          '</output>' +
        '</div>' +
        (opts.hintKey ? '<p class="aip-control__hint">' + t(opts.hintKey) + '</p>' : '') +
      '</div>';
  }

  var SENSOR_PATTERN = {
    glucose: [-9, 3, -6, 8, -4, 5, -2, 6, -5, 0],
    hr: [5, -3, 6, -5, 2, 4, -4, 1, -2, 0],
    sleep: [-6, 4, -3, 7, -8, 2, 5, -4, 3, 0]
  };

  function sensorSeries(key, value) {
    var pattern = SENSOR_PATTERN[key] || [0];
    /* La forme de la courbe dépend de la valeur : deux mesures différentes ne
       donnent pas la même silhouette (au-delà du simple décalage vertical). */
    var wobble = 1 + ((Math.round(value) * 13) % 11) / 22;
    var scale = (key === 'sleep' ? 1.2 : 1) * wobble;
    return pattern.map(function (offset) {
      return Math.max(1, Math.round(value + offset * scale));
    });
  }

  function sensorCard(opts) {
    return '' +
      '<article class="aip-sensor" data-sensor="' + opts.key + '" style="--accent:' + opts.accent + '">' +
        '<div class="aip-sensor__top">' +
          '<span class="aip-sensor__icon">' + icon(opts.icon) + '</span>' +
          '<span class="aip-quality aip-quality--' + opts.quality + '" data-sensor-quality>' + t('ai.quality.' + opts.quality) + '</span>' +
        '</div>' +
        '<p class="aip-sensor__label">' + t(opts.labelKey) + '</p>' +
        '<div class="aip-sensor__value">' +
          '<b data-sensor-value="' + opts.key + '">' + opts.value + '</b>' +
          '<small>' + t(opts.unitKey) + '</small>' +
        '</div>' +
        CHARTS.spark(opts.series, opts.accent) +
        '<div class="aip-sensor__meter" role="presentation"><i style="width:' + opts.fill + '%"></i></div>' +
      '</article>';
  }

  /* Bloc des trois capteurs — re-rendu après une synchronisation pour que la
     mini-courbe et les qualificatifs suivent les nouvelles valeurs. */
  function sensorsBlock(state) {
    var s = state.sensors;
    var q = MODEL.quality;
    return sensorCard({
      key: 'glucose', icon: 'droplet', accent: '#34d399', labelKey: 'ai.sensors.glucose',
      value: s.glucose, unitKey: 'ai.unit.mgdl', quality: q('glucose', s.glucose),
      series: sensorSeries('glucose', s.glucose),
      fill: Math.min(100, Math.round((s.glucose / 200) * 100))
    }) + sensorCard({
      key: 'hr', icon: 'pulse', accent: '#fb7185', labelKey: 'ai.sensors.hr',
      value: s.hr, unitKey: 'ai.unit.bpm', quality: q('hr', s.hr),
      series: sensorSeries('hr', s.hr),
      fill: Math.min(100, Math.round((s.hr / 120) * 100))
    }) + sensorCard({
      key: 'sleep', icon: 'moon', accent: '#818cf8', labelKey: 'ai.sensors.sleep',
      value: s.sleep, unitKey: 'ai.unit.percent', quality: q('sleep', s.sleep),
      series: sensorSeries('sleep', s.sleep),
      fill: Math.min(100, s.sleep)
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Étape 1 — capteurs, données médicales, habitudes                 */
  /* ------------------------------------------------------------------ */
  function step1(state) {
    var s = state.sensors, p = state.profile, h = state.habits;
    var m = MODEL.derived(state);
    var q = MODEL.quality;

    var sensors = sensorsBlock(state);

    var bmiBandKey = MODEL.bmiBand(m.bmi);

    return '' +
      '<div class="aip-grid aip-grid--3">' +
        '<section class="aip-panel aip-panel--span2" data-panel="sensors">' +
          '<header class="aip-panel__head">' +
            '<div>' +
              '<span class="aip-eyebrow">' + icon('activity') + '01</span>' +
              '<h3>' + t('ai.sensors.title') + '</h3>' +
              '<p class="aip-muted">' + t('ai.sensors.sub') + '</p>' +
            '</div>' +
            '<div class="aip-sync">' +
              '<span class="aip-sync__stamp" data-sync-stamp>' + (s.syncedAt ? t('ai.sensors.synced') : t('ai.sensors.never')) + '</span>' +
              '<button type="button" class="aip-btn aip-btn--primary aip-btn--sync" data-sync>' +
                '<span class="aip-btn__icon">' + icon('refresh') + '</span>' +
                '<span data-sync-label>' + t('ai.sensors.sync') + '</span>' +
              '</button>' +
            '</div>' +
          '</header>' +
          '<div class="aip-sensors">' + sensors + '</div>' +
        '</section>' +

        '<section class="aip-panel" data-panel="medical">' +
          '<header class="aip-panel__head">' +
            '<div>' +
              '<span class="aip-eyebrow">' + icon('flask') + '02</span>' +
              '<h3>' + t('ai.medical.title') + '</h3>' +
              '<p class="aip-muted">' + t('ai.medical.sub') + '</p>' +
            '</div>' +
          '</header>' +

          '<div class="aip-sex" role="group" aria-label="' + t('ai.field.sex') + '">' +
            '<span class="aip-sex__label">' + t('ai.field.sex') + '</span>' +
            '<button type="button" class="aip-seg' + (p.sex === 'female' ? ' is-active' : '') + '" data-sex="female">' + t('ai.field.sex.female') + '</button>' +
            '<button type="button" class="aip-seg' + (p.sex === 'male' ? ' is-active' : '') + '" data-sex="male">' + t('ai.field.sex.male') + '</button>' +
          '</div>' +

          '<div class="aip-numbers">' +
            '<label class="aip-number"><span>' + t('ai.field.height') + '</span>' +
              '<input type="number" min="120" max="215" step="1" value="' + p.height + '" data-field="profile.height" inputmode="numeric" />' +
              '<small>' + t('ai.unit.cm') + '</small></label>' +
            '<label class="aip-number"><span>' + t('ai.field.weight') + '</span>' +
              '<input type="number" min="35" max="200" step="0.5" value="' + p.weight + '" data-field="profile.weight" inputmode="decimal" />' +
              '<small>' + t('ai.unit.kg') + '</small></label>' +
          '</div>' +

          '<div class="aip-bmi" data-bmi data-band="' + bmiBandKey + '">' +
            '<div class="aip-bmi__value"><b data-bmi-value>' + m.bmiRounded + '</b><span>' + t('ai.field.bmi') + '</span></div>' +
            '<div class="aip-bmi__meta">' +
              '<span class="aip-bmi__band" data-bmi-band>' + t('ai.bmi.' + bmiBandKey) + '</span>' +
              '<p>' + t('ai.bmi.hint') + '</p>' +
            '</div>' +
          '</div>' +

          slider({
            field: 'profile.age', labelKey: 'ai.field.age', quality: p.age >= 55 ? 'high' : (p.age >= 40 ? 'moderate' : 'low'),
            min: 18, max: 85, step: 1, value: p.age, display: p.age, unitKey: 'ai.unit.years'
          }) +
          slider({
            field: 'profile.chol', labelKey: 'ai.field.chol', quality: p.chol >= 240 ? 'high' : (p.chol >= 200 ? 'moderate' : 'low'),
            min: 120, max: 320, step: 2, value: p.chol, display: p.chol, unitKey: 'ai.unit.mgdl'
          }) +
          slider({
            field: 'profile.sbp', labelKey: 'ai.field.systolic', quality: p.sbp >= 140 ? 'high' : (p.sbp >= 125 ? 'moderate' : 'low'),
            min: 95, max: 195, step: 1, value: p.sbp, display: p.sbp, unitKey: 'ai.unit.mmhg'
          }) +
          slider({
            field: 'profile.dbp', labelKey: 'ai.field.diastolic', quality: p.dbp >= 90 ? 'high' : (p.dbp >= 82 ? 'moderate' : 'low'),
            min: 55, max: 120, step: 1, value: p.dbp, display: p.dbp, unitKey: 'ai.unit.mmhg'
          }) +
        '</section>' +

        '<section class="aip-panel aip-panel--wide" data-panel="habits">' +
          '<header class="aip-panel__head">' +
            '<div>' +
              '<span class="aip-eyebrow">' + icon('leaf') + '03</span>' +
              '<h3>' + t('ai.habits.title') + '</h3>' +
              '<p class="aip-muted">' + t('ai.habits.sub') + '</p>' +
            '</div>' +
          '</header>' +
          '<div class="aip-habits">' +
            slider({
              field: 'habits.sugar', labelKey: 'ai.habit.sugar', hintKey: 'ai.habit.sugar.hint',
              quality: q('sugar', h.sugar), min: 0, max: 120, step: 1, value: h.sugar,
              display: Math.round(h.sugar), unitKey: 'ai.unit.gday'
            }) +
            slider({
              field: 'habits.satFat', labelKey: 'ai.habit.satfat', hintKey: 'ai.habit.satfat.hint',
              quality: q('satfat', h.satFat), min: 3, max: 25, step: 1, value: h.satFat,
              display: Math.round(h.satFat), unitKey: 'ai.unit.pct'
            }) +
            slider({
              field: 'habits.fiber', labelKey: 'ai.habit.fiber', hintKey: 'ai.habit.fiber.hint',
              quality: q('fiber', h.fiber), min: 0, max: 8, step: 0.5, value: h.fiber,
              display: String(h.fiber).replace('.', I18N.lang === 'fr' ? ',' : '.'), unitKey: 'ai.unit.portion'
            }) +
            slider({
              field: 'habits.water', labelKey: 'ai.habit.water', hintKey: 'ai.habit.water.hint',
              quality: q('water', h.water), min: 0.3, max: 4, step: 0.1, value: h.water,
              display: String(h.water).replace('.', I18N.lang === 'fr' ? ',' : '.'), unitKey: 'ai.unit.lday'
            }) +
          '</div>' +
          '<div class="aip-actions aip-actions--end">' +
            '<button type="button" class="aip-btn aip-btn--cta" data-analyse>' +
              icon('brain') + '<span>' + t('ai.cta.analyse') + '</span>' + icon('arrow') +
            '</button>' +
          '</div>' +
        '</section>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* 3. Étape 2 — scanner d’analyse                                      */
  /* ------------------------------------------------------------------ */
  function scanner(state) {
    var particles = '';
    for (var i = 0; i < 18; i++) {
      var angle = (i / 18) * 360;
      var radius = 38 + ((i * 13) % 26);
      var delay = (i * 0.17).toFixed(2);
      particles += '<span style="--angle:' + angle.toFixed(0) + 'deg;--radius:' + radius + 'px;--delay:' + delay + 's"></span>';
    }

    return '' +
      '<div class="aip-scan" data-scan>' +
        '<div class="aip-scan__viz">' +
          '<div class="aip-scan__orb">' +
            '<span class="aip-scan__ring aip-scan__ring--1"></span>' +
            '<span class="aip-scan__ring aip-scan__ring--2"></span>' +
            '<span class="aip-scan__ring aip-scan__ring--3"></span>' +
            '<span class="aip-scan__sweep"></span>' +
            '<span class="aip-scan__core">' + icon('brain') + '</span>' +
            '<span class="aip-scan__particles">' + particles + '</span>' +
          '</div>' +
          '<div class="aip-scan__percent"><b data-scan-percent>0</b><small>%</small></div>' +
          '<p class="aip-scan__stage" data-scan-stage>' + t('ai.scan.stage.biomarkers') + '</p>' +
        '</div>' +

        '<div class="aip-scan__panel">' +
          '<span class="aip-eyebrow">' + icon('spark') + 'IA</span>' +
          '<h3>' + t('ai.scan.title') + '</h3>' +
          '<p class="aip-muted">' + t('ai.scan.sub') + '</p>' +
          '<div class="aip-scan__progress"><i data-scan-bar></i></div>' +
          '<ul class="aip-scan__log" data-scan-log aria-live="polite"></ul>' +
          '<div class="aip-scan__signals">' +
            '<span class="aip-scan__signals-title">' + t('ai.scan.signals') + '</span>' +
            '<div class="aip-signals" data-scan-signals>' +
              '<p class="aip-muted">' + t('ai.scan.waiting') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="aip-actions">' +
            '<button type="button" class="aip-btn aip-btn--ghost" data-goto="1">' + t('ai.nav.prev') + '</button>' +
            '<button type="button" class="aip-btn aip-btn--cta" data-goto="3" data-needs="result" disabled>' +
              '<span>' + t('ai.cta.results') + '</span>' + icon('arrow') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* 4. Étape 3 — score, risques, timeline                               */
  /* ------------------------------------------------------------------ */
  function levelClass(level) { return 'aip-level aip-level--' + level; }

  function windowLabel(risk, mode) {
    var src = mode === 'corrected' ? risk.corrected : risk;
    var onset = src.onset;
    if (onset.none) return t('ai.risk.none');
    if (onset.beyond) return t('ai.risk.beyond');
    return t('ai.risk.window', { a: onset.from, b: onset.to });
  }

  function middlePct(onset) {
    if (onset.none) return 94;
    if (onset.beyond) return 96;
    return Math.max(3, Math.min(97, ((onset.from + onset.to) / 2 / 20) * 100));
  }

  function riskCard(risk, mode) {
    var drivers = risk.drivers.map(function (d) {
      var unit = d.unitKey ? ' ' + t(d.unitKey) : '';
      return '<li>' +
        '<span class="aip-risk__driver">' + t(DATA.DRIVERS[d.key].labelKey) + '</span>' +
        '<b>' + d.value + unit + '</b>' +
        '<i class="aip-risk__meter" style="--w:' + Math.max(8, Math.min(100, d.share)) + '%"></i>' +
        '</li>';
    }).join('');

    var correctedChip = mode === 'corrected'
      ? '<span class="aip-risk__delta">−' + risk.corrected.delta + ' pts</span>'
      : '';

    return '' +
      '<article class="aip-risk" data-risk="' + risk.id + '" style="--accent:' + risk.accent + ';--accent2:' + risk.accent2 + '" ' +
        'tabindex="0" role="button" aria-pressed="false" aria-label="' + t(risk.nameKey) + '">' +
        '<header class="aip-risk__head">' +
          '<span class="aip-risk__icon">' + icon(risk.icon) + '</span>' +
          '<div class="aip-risk__title">' +
            '<h3>' + t(risk.nameKey) + '</h3>' +
            '<span class="' + levelClass(risk.level) + '">' + t('ai.level.' + risk.level) + '</span>' +
          '</div>' +
          CHARTS.gauge({
            value: risk.probability, size: 104, stroke: 9,
            from: risk.accent, to: risk.accent2, unit: '%', label: t(risk.nameKey)
          }) +
        '</header>' +
        '<div class="aip-risk__drivers">' +
          '<span class="aip-risk__label">' + t('ai.risk.drivers') + '</span>' +
          '<ul>' + drivers + '</ul>' +
        '</div>' +
        '<footer class="aip-risk__foot">' +
          '<div>' +
            '<span class="aip-risk__label">' + t(mode === 'corrected' ? 'ai.risk.projection.corrected' : 'ai.risk.projection') + '</span>' +
            '<b class="aip-risk__window">' + windowLabel(risk, mode) + '</b>' +
          '</div>' +
          correctedChip +
        '</footer>' +
      '</article>';
  }

  function timelineRow(risk, mode) {
    var onset = mode === 'corrected' ? risk.corrected.onset : risk.onset;
    var markerLabel = onset.none ? '—' : (onset.beyond ? '20+' : onset.from + '–' + onset.to);
    var curOnset = risk.onset;
    var corOnset = risk.corrected.onset;
    return '' +
      '<div class="aip-tl__row" data-tl-row="' + risk.id + '" style="--accent:' + risk.accent + '">' +
        '<button type="button" class="aip-tl__label" data-tl-select="' + risk.id + '">' +
          '<span class="aip-tl__name">' + icon(risk.icon) + '<span>' + t(risk.nameKey) + '</span></span>' +
          '<small>' + risk.probability + '% · ' + t('ai.level.' + risk.level) + '</small>' +
        '</button>' +
        '<div class="aip-tl__trackwrap">' +
          CHARTS.timelineTrack(risk, mode) +
          (curOnset.none || curOnset.beyond ? '' :
            '<button type="button" class="aip-tl__marker aip-tl__marker--current' + (mode === 'corrected' ? ' is-dim' : '') + '" ' +
              'style="left:' + middlePct(curOnset) + '%" data-tl-select="' + risk.id + '" ' +
              'aria-label="' + t(risk.nameKey) + ' ' + windowLabel(risk, 'current') + '">' +
              '<span>' + (curOnset.from + '–' + curOnset.to) + '</span></button>') +
          (corOnset.none || corOnset.beyond ? '' :
            '<button type="button" class="aip-tl__marker aip-tl__marker--corrected' + (mode === 'current' ? ' is-dim' : '') + '" ' +
              'style="left:' + middlePct(corOnset) + '%" data-tl-select="' + risk.id + '" ' +
              'aria-label="' + t(risk.nameKey) + ' ' + windowLabel(risk, 'corrected') + '">' +
              '<span>' + (corOnset.from + '–' + corOnset.to) + '</span></button>') +
        '</div>' +
      '</div>';
  }

  function results(result, mode) {
    mode = mode || 'current';
    var scoreBandKey = result.scoreBand;
    var gap = result.ageGap;
    var gapText = gap > 0 ? t('ai.score.gap', { n: gap }) : t('ai.score.gapNone');

    var grid = result.risks.map(function (r) { return riskCard(r, mode); }).join('');
    var rows = result.risks.map(function (r) { return timelineRow(r, mode); }).join('');

    var kpis = result.risks.map(function (r) {
      return '<li><span style="--accent:' + r.accent + '">' + icon(r.icon) + '</span>' +
        '<b>' + r.probability + '<small>%</small></b>' +
        '<em>' + t(r.nameKey) + '</em></li>';
    }).join('');

    return '' +
      '<div class="aip-results">' +

        '<section class="aip-score">' +
          '<div class="aip-score__visual">' +
            CHARTS.gauge({
              value: result.metabolicScore, size: 186, stroke: 14,
              from: '#34d399', to: result.metabolicScore < 60 ? '#fb7185' : '#22d3ee', unit: '',
              label: t('ai.score.title')
            }) +
            '<span class="aip-score__band aip-score__band--' + scoreBandKey + '">' + t('ai.score.band.' + scoreBandKey) + '</span>' +
          '</div>' +
          '<div class="aip-score__body">' +
            '<span class="aip-eyebrow">' + icon('spark') + 'SCORE</span>' +
            '<h3>' + t('ai.score.title') + '</h3>' +
            '<p class="aip-muted">' + t('ai.score.hint') + '</p>' +
            '<div class="aip-age">' +
              '<div class="aip-age__item">' +
                '<span>' + t('ai.score.metabolicAge') + '</span>' +
                '<b>' + result.metabolicAge + '<small>' + t('ai.unit.years') + '</small></b>' +
              '</div>' +
              '<span class="aip-age__vs" aria-hidden="true">vs</span>' +
              '<div class="aip-age__item aip-age__item--muted">' +
                '<span>' + t('ai.score.chronoAge') + '</span>' +
                '<b>' + (result.metabolicAge - gap) + '<small>' + t('ai.unit.years') + '</small></b>' +
              '</div>' +
            '</div>' +
            '<p class="aip-age__gap">' + gapText + '</p>' +
            '<ul class="aip-score__kpis">' + kpis + '</ul>' +
          '</div>' +
        '</section>' +

        '<section class="aip-panel aip-panel--results">' +
          '<header class="aip-panel__head">' +
            '<div>' +
              '<span class="aip-eyebrow">' + icon('activity') + '04</span>' +
              '<h3>' + t('ai.results.title') + '</h3>' +
              '<p class="aip-muted">' + t('ai.results.sub') + '</p>' +
            '</div>' +
            '<div class="aip-mode" role="group" aria-label="' + t('ai.timeline.title') + '">' +
              '<button type="button" class="aip-mode__btn' + (mode === 'current' ? ' is-active' : '') + '" data-mode="current">' + t('ai.timeline.current') + '</button>' +
              '<button type="button" class="aip-mode__btn' + (mode === 'corrected' ? ' is-active' : '') + '" data-mode="corrected">' + t('ai.timeline.corrected') + '</button>' +
            '</div>' +
          '</header>' +
          '<div class="aip-risk-grid">' + grid + '</div>' +
        '</section>' +

        '<section class="aip-panel aip-panel--timeline">' +
          '<header class="aip-panel__head">' +
            '<div>' +
              '<span class="aip-eyebrow">' + icon('clock') + '05</span>' +
              '<h3>' + t('ai.timeline.title') + '</h3>' +
              '<p class="aip-muted">' + t('ai.timeline.sub') + '</p>' +
            '</div>' +
            '<div class="aip-legend">' +
              '<span class="aip-legend__item aip-legend__item--current">' + t('ai.timeline.legend.current') + '</span>' +
              '<span class="aip-legend__item aip-legend__item--corrected">' + t('ai.timeline.legend.corrected') + '</span>' +
            '</div>' +
          '</header>' +
          '<div class="aip-tl" data-timeline>' +
            '<div class="aip-tl__head">' +
              '<span></span>' +
              '<div class="aip-tl__axis">' +
                '<span>' + t('ai.timeline.today') + '</span>' +
                '<span>' + t('ai.timeline.years', { n: 5 }) + '</span>' +
                '<span>' + t('ai.timeline.years', { n: 10 }) + '</span>' +
                '<span>' + t('ai.timeline.years', { n: 15 }) + '</span>' +
                '<span>' + t('ai.timeline.years', { n: 20 }) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="aip-tl__rows">' + rows + '</div>' +
          '</div>' +
          '<div class="aip-tl__detail" data-tl-detail>' +
            '<div class="aip-tl__empty">' + icon('info') + '<span>' + t('ai.timeline.select') + '</span></div>' +
          '</div>' +
          '<div class="aip-actions aip-actions--end">' +
            '<button type="button" class="aip-btn aip-btn--ghost" data-goto="1">' + icon('refresh') + '<span>' + t('ai.cta.newanalysis') + '</span></button>' +
            '<button type="button" class="aip-btn aip-btn--cta" data-goto="4" data-build-plan>' + icon('leaf') + '<span>' + t('ai.cta.plan') + '</span>' + icon('arrow') + '</button>' +
          '</div>' +
        '</section>' +
      '</div>';
  }

  /* Détail d’un jalon sélectionné dans la timeline. */
  function timelineDetail(risk, mode) {
    var onset = mode === 'corrected' ? risk.corrected.onset : risk.onset;
    var actions = risk.drivers
      .filter(function (d) { return DATA.DRIVERS[d.key] && DATA.DRIVERS[d.key].adviceKey; })
      .slice(0, 2)
      .map(function (d) { return '<li>' + t(DATA.DRIVERS[d.key].adviceKey) + '</li>'; })
      .join('');

    return '' +
      '<div class="aip-tl__card" style="--accent:' + risk.accent + '">' +
        '<header class="aip-tl__cardhead">' +
          '<span class="aip-tl__cardicon">' + icon(risk.icon) + '</span>' +
          '<div><h4>' + t(risk.nameKey) + '</h4>' +
            '<span class="' + levelClass(risk.level) + '">' + t('ai.level.' + risk.level) + '</span></div>' +
          '<button type="button" class="aip-tl__close" data-tl-close aria-label="×">×</button>' +
        '</header>' +
        '<div class="aip-tl__facts">' +
          '<div><span>' + t('ai.timeline.detail.window') + '</span><b>' + windowLabel(risk, mode) + '</b></div>' +
          '<div><span>' + t('ai.timeline.detail.prob') + '</span><b>' +
            (mode === 'corrected' ? risk.corrected.probability : risk.probability) + '%</b></div>' +
          '<div><span>' + t('ai.timeline.detail.drivers') + '</span><b>' + risk.drivers.length + '</b></div>' +
        '</div>' +
        (actions ? '<div class="aip-tl__actions"><span class="aip-risk__label">' + t('ai.timeline.detail.actions') + '</span><ul>' + actions + '</ul></div>' : '') +
        '<p class="aip-tl__note">' + t('ai.risk.window', { a: onset.from, b: onset.to }) + '</p>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* 5. Étape 4 — programme de 7 jours                                   */
  /* ------------------------------------------------------------------ */
  function weekChartBlock(plan) {
    var labels = DATA.DAY_KEYS.map(function (k) { return t('ai.day.' + k + '.short'); });
    return CHARTS.weekChart(plan.week.gl, plan.activeDay || 0, labels);
  }

  function protocolBlock(state) {
    var targets = MODEL.targets(state);
    var rows = targets.map(function (x) {
      var currentPct = Math.min(100, (x.current / x.max) * 100);
      var targetPct = Math.min(100, (x.target / x.max) * 100);
      var fmt = function (v) { return String(v).replace('.', I18N.lang === 'fr' ? ',' : '.'); };
      return '<li class="aip-proto">' +
        '<div class="aip-proto__head"><span>' + t('ai.habit.' + x.key) + '</span>' +
          '<b>' + fmt(x.current) + ' → <em>' + fmt(x.target) + '</em> <small>' + t(x.unitKey) + '</small></b></div>' +
        '<div class="aip-proto__bar">' +
          '<i class="aip-proto__current" style="--w:' + currentPct.toFixed(1) + '%"></i>' +
          '<i class="aip-proto__target" style="--w:' + targetPct.toFixed(1) + '%"></i>' +
        '</div>' +
      '</li>';
    }).join('');

    return '<div class="aip-panel aip-panel--protocol">' +
      '<h3>' + icon('spark') + t('ai.plan.protocol') + '</h3>' +
      '<p class="aip-muted">' + t('ai.plan.protocol.sub') + '</p>' +
      '<ul class="aip-protos">' + rows + '</ul>' +
    '</div>';
  }

  function mealCard(slot, dish) {
    var tags = (dish.tags || []).map(function (tag) {
      return '<span class="aip-tag">' + t('ai.tag.' + tag) + '</span>';
    }).join('');
    return '' +
      '<article class="aip-meal" data-slot="' + slot + '">' +
        '<span class="aip-meal__emoji" aria-hidden="true">' + dish.emoji + '</span>' +
        '<div class="aip-meal__body">' +
          '<span class="aip-meal__slot">' + t('ai.plan.slot.' + slot) + '</span>' +
          '<h4>' + loc(dish.name) + '</h4>' +
          '<p class="aip-meal__items">' + loc(dish.items) + '</p>' +
          '<div class="aip-meal__macros">' +
            '<span><b>' + dish.kcal + '</b> ' + t('ai.unit.kcal') + '</span>' +
            '<span><b>' + dish.protein + ' g</b> · ' + t('ai.plan.protein') + '</span>' +
            '<span><b>' + dish.fiber + ' g</b> · ' + t('ai.plan.fiber') + '</span>' +
            '<span><b>' + dish.gl + '</b> · ' + t('ai.plan.gl') + '</span>' +
          '</div>' +
          (tags ? '<div class="aip-meal__tags">' + tags + '</div>' : '') +
        '</div>' +
      '</article>';
  }

  function dayPanel(plan, index) {
    var day = plan.days[index];
    var meals = DATA.SLOTS.map(function (slot) { return mealCard(slot, day.meals[slot]); }).join('');
    var impacts = day.impacts.map(function (imp) {
      return '<span class="aip-impact">' + t(imp.key, imp.n != null ? { n: imp.n } : undefined) + '</span>';
    }).join('');

    return '' +
      '<div class="aip-day" data-day="' + index + '">' +
        '<header class="aip-day__head">' +
          '<div>' +
            '<span class="aip-day__kicker">' + t('ai.day.' + day.key) + '</span>' +
            '<h3>' + t('ai.plan.balance') + '</h3>' +
          '</div>' +
          '<div class="aip-day__totals">' +
            '<span><b>' + day.totals.kcal + '</b> ' + t('ai.unit.kcal') + '</span>' +
            '<span><b>' + day.totals.protein + ' g</b> ' + t('ai.plan.protein') + '</span>' +
            '<span><b>' + day.totals.fiber + ' g</b> ' + t('ai.plan.fiber') + '</span>' +
            '<span><b>' + day.totals.gl + '</b> ' + t('ai.plan.gl') + '</span>' +
          '</div>' +
        '</header>' +
        '<div class="aip-meals">' + meals + '</div>' +
        '<footer class="aip-day__foot">' +
          '<span class="aip-day__impacttitle">' + icon('spark') + t('ai.plan.impact') + '</span>' +
          '<div class="aip-impacts">' + impacts + '</div>' +
        '</footer>' +
      '</div>';
  }

  function plan(planData, result, state) {
    var activeIndex = planData.activeDay || 0;
    var tabs = planData.days.map(function (day, i) {
      var on = i === activeIndex;
      return '<button type="button" class="aip-daytab' + (on ? ' is-active' : '') + '" data-day-tab="' + i + '" role="tab" ' +
        'aria-selected="' + on + '" aria-controls="aipDayPanel" type="button">' +
        '<span class="aip-daytab__day">' + t('ai.day.' + day.key + '.short') + '</span>' +
        '<span class="aip-daytab__gl">' + day.totals.gl + '</span>' +
        '</button>';
    }).join('');

    return '' +
      '<div class="aip-plan">' +
        '<section class="aip-panel aip-panel--planhead">' +
          '<header class="aip-panel__head">' +
            '<div>' +
              '<span class="aip-eyebrow">' + icon('leaf') + '06</span>' +
              '<h3>' + t('ai.plan.title') + '</h3>' +
              '<p class="aip-muted">' + t('ai.plan.sub') + '</p>' +
            '</div>' +
            '<div class="aip-plan__target">' +
              '<span>' + t('ai.plan.kcalTarget') + '</span>' +
              '<b>' + planData.kCalTarget + ' <small>' + t('ai.unit.kcal') + '</small></b>' +
            '</div>' +
          '</header>' +
          '<div class="aip-plan__bar">' +
            '<div class="aip-plan__priority">' +
              planData.priority.slice(0, 2).map(function (id) {
                var meta = DATA.RISKS.filter(function (r) { return r.id === id; })[0];
                return '<span class="aip-tag aip-tag--accent" style="--accent:' + meta.accent + '">' + icon(meta.icon) + t(meta.nameKey) + '</span>';
              }).join('') +
            '</div>' +
            '<div class="aip-actions aip-actions--tight">' +
              '<button type="button" class="aip-btn aip-btn--ghost" data-regenerate>' + icon('refresh') + '<span>' + t('ai.plan.regenerate') + '</span></button>' +
              '<button type="button" class="aip-btn aip-btn--ghost" data-print>' + icon('printer') + '<span>' + t('ai.plan.print') + '</span></button>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<div class="aip-plan__grid">' +
          '<div class="aip-daytabs" role="tablist" aria-label="' + t('ai.plan.title') + '" data-day-tabs>' +
            '<span class="aip-daytabs__ink" data-day-ink aria-hidden="true"></span>' + tabs +
          '</div>' +
          '<div class="aip-daywrap" data-daywrap role="tabpanel" id="aipDayPanel">' + dayPanel(planData, activeIndex) + '</div>' +
        '</div>' +

        '<div class="aip-plan__bottom">' +
          '<div class="aip-panel aip-panel--week">' +
            '<h3>' + icon('activity') + t('ai.plan.week') + '</h3>' +
            '<p class="aip-muted">' + t('ai.plan.footnote') + '</p>' +
            '<div data-week-chart>' + weekChartBlock(planData) + '</div>' +
          '</div>' +
          protocolBlock(state) +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  /* 6. Bandeau de notifications interne                                 */
  /* ------------------------------------------------------------------ */
  function toast(message) {
    return '<div class="aip-toast" role="status">' + icon('check') + '<span>' + message + '</span></div>';
  }

  global.AIP_TEMPLATE = {
    shell: shell,
    step1: step1,
    sensors: sensorsBlock,
    scanner: scanner,
    results: results,
    timelineDetail: timelineDetail,
    plan: plan,
    dayPanel: dayPanel,
    weekChartBlock: weekChartBlock,
    protocolBlock: protocolBlock,
    toast: toast,
    windowLabel: windowLabel
  };
})(window);
