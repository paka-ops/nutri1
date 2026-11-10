/* ============================================================================
 * NUTRI.N°1 — AI Nutrition & Prevention Engine · contrôleur
 * ----------------------------------------------------------------------------
 * Assemble les quatre étapes du parcours : capteurs → moteur de simulation →
 * prédictions & timeline → programme nutritionnel de 7 jours.
 *
 * Principes
 *  · Un seul écouteur délégué sur la racine (#aiPrevention) : le module peut
 *    être re-rendu intégralement lors d’un changement de langue sans perdre
 *    ses interactions.
 *  · État unique et sérialisable (state) : aucun accès direct au DOM depuis le
 *    moteur de calcul (AIP_MODEL).
 *  · Les animations respectent prefers-reduced-motion (voir la feuille CSS).
 * ========================================================================== */
(function (global) {
  'use strict';

  var DATA = global.AIP_DATA;
  var I18N = global.AIP_I18N;
  var MODEL = global.AIP_MODEL;
  var CHARTS = global.AIP_CHARTS;
  var TPL = global.AIP_TEMPLATE;

  if (!DATA || !I18N || !MODEL || !CHARTS || !TPL) {
    if (global.console) global.console.warn('[AIP] dépendances manquantes');
    return;
  }

  var root = null;
  var state = null;
  var scanToken = 0;
  var timers = [];
  var bound = false;

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                        */
  /* ------------------------------------------------------------------ */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function q(sel) { return root ? root.querySelector(sel) : null; }
  function qa(sel) { return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : []; }
  function t(key, params) { return I18N.t(key, params); }

  function raf(fn) {
    if (typeof global.requestAnimationFrame === 'function') return global.requestAnimationFrame(fn);
    return setTimeout(fn, 16);
  }

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    timers = [];
  }

  function fmt(value, decimals) {
    var out = decimals ? Number(value).toFixed(decimals) : String(value);
    return I18N.lang === 'fr' ? out.replace('.', ',') : out;
  }

  /* ------------------------------------------------------------------ */
  /* État                                                               */
  /* ------------------------------------------------------------------ */
  function freshState() {
    var d = DATA.DEFAULT;
    return {
      sensors: { glucose: d.sensors.glucose, hr: d.sensors.hr, sleep: d.sensors.sleep, syncedAt: 0 },
      profile: clone(d.profile),
      habits: clone(d.habits),
      view: 1,
      mode: 'current',
      activeDay: 0,
      planSeed: 0,
      result: null,
      plan: null,
      analysing: false,
      selectedRisk: null
    };
  }

  /* ------------------------------------------------------------------ */
  /* Rendu                                                              */
  /* ------------------------------------------------------------------ */
  function setHtml(step, html) {
    var host = q('[data-step="' + step + '"]');
    if (host) host.innerHTML = html;
    return host;
  }

  function renderAll() {
    if (!root) return;
    clearTimers();
    scanToken += 1;
    state.analysing = false;

    root.innerHTML = TPL.shell(state);
    setHtml(1, TPL.step1(state));
    setHtml(2, TPL.scanner(state));
    if (state.result) setHtml(3, TPL.results(state.result, state.mode));
    if (state.plan && state.result) {
      state.plan.activeDay = state.activeDay;
      setHtml(4, TPL.plan(state.plan, state.result, state));
    }

    paintRanges();
    applyView();
    refreshNeeds();
    updateSyncStamp();

    if (state.view === 2) {
      if (state.result) paintScanComplete();
      else startScan();
    }
    if (state.view === 3 && state.result) {
      animateResults();
    }
    if (state.view === 4 && state.plan) {
      positionInk();
      var step4 = q('[data-step="4"]');
      if (step4) CHARTS.animate(step4);
    }
  }

  function applyView() {
    var view = state.view;
    qa('.aip-step').forEach(function (section) {
      var isActive = Number(section.getAttribute('data-step')) === view;
      section.classList.toggle('is-active', isActive);
      section.setAttribute('aria-hidden', String(!isActive));
    });
    qa('.aip-step-tab').forEach(function (tab) {
      var isActive = Number(tab.getAttribute('data-goto')) === view;
      tab.classList.toggle('is-active', isActive);
      tab.classList.toggle('is-done', Number(tab.getAttribute('data-goto')) < view);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
  }

  function refreshNeeds() {
    qa('[data-needs="result"]').forEach(function (btn) {
      btn.disabled = !state.result;
    });
  }

  function scrollToModule() {
    if (!root || typeof root.scrollIntoView !== 'function') return;
    try { root.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* older engines */ }
  }

  /* Curseurs : remplissage de la piste (--fill) et qualificatif coloré. */
  function paintRanges() {
    qa('input[type="range"][data-field]').forEach(function (input) {
      var min = Number(input.min), max = Number(input.max), val = Number(input.value);
      var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
      input.style.setProperty('--fill', Math.max(0, Math.min(100, pct)).toFixed(1) + '%');
      updateQualityChip(input);
    });
  }

  function updateQualityChip(input) {
    var control = input.closest('.aip-control');
    if (!control) return;
    var field = input.getAttribute('data-field') || '';
    var chip = control.querySelector('.aip-quality');
    if (!chip) return;
    var quality = MODEL.quality(field.split('.')[1], Number(input.value));
    chip.className = 'aip-quality aip-quality--' + quality;
    chip.setAttribute('data-quality-key', quality);
    chip.textContent = t('ai.q.' + quality);
  }

  /* ------------------------------------------------------------------ */
  /* Navigation entre les étapes                                        */
  /* ------------------------------------------------------------------ */
  function goStep(step, opts) {
    step = Math.max(1, Math.min(4, Number(step) || 1));

    if (step >= 3 && !state.result) analyseNow(false);
    if (step === 3 && state.result && !q('[data-step="3"] .aip-results')) {
      /* Le résultat peut venir du scanner (pas d’analyse à relancer) : il faut
         simplement peindre l’étape 3. */
      setHtml(3, TPL.results(state.result, state.mode));
    }
    if (step === 4 && state.result && !state.plan) buildPlan(false);

    state.view = step;
    applyView();
    refreshNeeds();

    if (step === 2) {
      if (state.result && !state.analysing) paintScanComplete();
      else if (!state.analysing) startScan();
    }
    if (step === 3 && state.result) animateResults();
    if (step === 4 && state.plan) {
      CHARTS.animate(q('[data-step="4"]'));
      raf(positionInk);
    }
    if (!opts || !opts.silent) scrollToModule();
  }

  /* ------------------------------------------------------------------ */
  /* Capteurs                                                           */
  /* ------------------------------------------------------------------ */
  function sensorTargets() {
    /* Les mesures simulées dépendent des habitudes : le glucomètre “suit”
       la consommation de sucres, l’IMC et les fibres. */
    var m = MODEL.derived(state);
    var h = state.habits;
    var jitter = function (x) { return (Math.random() - 0.5) * x; };
    var glucose = 78 + h.sugar * 0.42 + Math.max(0, m.bmi - 21) * 1.5 - h.fiber * 2.2 + jitter(9);
    var hr = 58 + Math.max(0, m.bmi - 20) * 0.7 + (100 - state.sensors.sleep) * 0.16 + jitter(6);
    var sleep = 88 - h.sugar * 0.1 - Math.max(0, h.satFat - 10) * 0.8 + jitter(7);
    return {
      glucose: Math.round(Math.max(72, Math.min(190, glucose))),
      hr: Math.round(Math.max(48, Math.min(104, hr))),
      sleep: Math.round(Math.max(38, Math.min(99, sleep)))
    };
  }

  function syncSensors() {
    var btn = q('[data-sync]');
    var label = q('[data-sync-label]');
    var stamp = q('[data-sync-stamp]');
    if (btn) btn.classList.add('is-loading');
    if (btn) btn.disabled = true;
    if (label) label.textContent = t('ai.sensors.syncing');
    if (stamp) stamp.textContent = t('ai.sensors.syncing');

    qa('.aip-sensor').forEach(function (card) { card.classList.add('is-syncing'); });

    var targets = sensorTargets();
    var from = {
      glucose: state.sensors.glucose,
      hr: state.sensors.hr,
      sleep: state.sensors.sleep
    };
    var start = null;
    var duration = 780;
    var settled = false;

    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      ['glucose', 'hr', 'sleep'].forEach(function (key) {
        var val = Math.round(from[key] + (targets[key] - from[key]) * eased);
        paintSensorValue(key, val);
      });
      if (p < 1) raf(step);
      else finish();
    }

    function finish() {
      if (settled) return;
      settled = true;
      state.sensors.glucose = targets.glucose;
      state.sensors.hr = targets.hr;
      state.sensors.sleep = targets.sleep;
      state.sensors.syncedAt = Date.now();
      ['glucose', 'hr', 'sleep'].forEach(function (key) { paintSensorValue(key, state.sensors[key]); });
      /* Re-rendu du bloc : les mini-courbes repartent des nouvelles mesures. */
      var host = q('[data-panel="sensors"] .aip-sensors');
      if (host) host.innerHTML = TPL.sensors(state);
      qa('.aip-sensor').forEach(function (card) { card.classList.remove('is-syncing'); card.classList.add('is-synced'); });
      if (btn) { btn.classList.remove('is-loading'); btn.disabled = false; }
      if (label) label.textContent = t('ai.sensors.sync');
      refreshNeeds();
      updateSyncStamp();
      flash(t('ai.toast.synced'));
      later(function () { qa('.aip-sensor').forEach(function (c) { c.classList.remove('is-synced'); }); }, 1600);
    }

    raf(step);
    /* Filet de sécurité : si les rAF sont suspendus, la synchro aboutit quand même. */
    later(finish, duration + 350);
  }

  function paintSensorValue(key, value) {
    var card = q('[data-sensor="' + key + '"]');
    if (!card) return;
    var out = card.querySelector('[data-sensor-value="' + key + '"]');
    if (out) out.textContent = String(value);
    var quality = MODEL.quality(key, value);
    var chip = card.querySelector('[data-sensor-quality]');
    if (chip) {
      chip.className = 'aip-quality aip-quality--' + quality;
      chip.textContent = t('ai.quality.' + quality);
    }
    var meter = card.querySelector('.aip-sensor__meter i');
    if (meter) {
      var max = key === 'glucose' ? 200 : (key === 'hr' ? 120 : 100);
      meter.style.width = Math.max(2, Math.min(100, (value / max) * 100)).toFixed(1) + '%';
    }
  }

  function updateSyncStamp() {
    var stamp = q('[data-sync-stamp]');
    if (!stamp) return;
    if (!state.sensors.syncedAt) {
      stamp.textContent = t('ai.sensors.never');
      return;
    }
    var seconds = Math.max(0, Math.round((Date.now() - state.sensors.syncedAt) / 1000));
    stamp.textContent = t('ai.sensors.updated', { s: seconds });
  }

  /* ------------------------------------------------------------------ */
  /* Scanner IA                                                         */
  /* ------------------------------------------------------------------ */
  var LOG_KEYS = ['ai.scan.log1', 'ai.scan.log2', 'ai.scan.log3', 'ai.scan.log4', 'ai.scan.log5', 'ai.scan.log6'];
  var STAGE_KEYS = ['ai.scan.stage.biomarkers', 'ai.scan.stage.correlation', 'ai.scan.stage.projection', 'ai.scan.stage.protocol'];

  function signalsHtml(list) {
    return list.map(function (sig, i) {
      var driver = DATA.DRIVERS[sig.key];
      if (!driver) return '';
      return '<span class="aip-signal" style="--d:' + (i * 80) + 'ms">' +
        CHARTS.icon('spark') +
        '<span>' + t(driver.labelKey) + '</span>' +
        '<b>' + sig.value + (sig.unitKey ? ' ' + t(sig.unitKey) : '') + '</b>' +
      '</span>';
    }).join('');
  }

  function startScan() {
    var scan = q('[data-scan]');
    if (!scan) return;
    var logEl = q('[data-scan-log]');
    var barEl = q('[data-scan-bar]');
    var pctEl = q('[data-scan-percent]');
    var stageEl = q('[data-scan-stage]');
    var sigEl = q('[data-scan-signals]');

    scanToken += 1;
    var token = scanToken;
    state.analysing = true;
    state.result = MODEL.analyse(state);
    state.plan = null;
    state.selectedRisk = null;

    scan.classList.add('is-running');
    scan.classList.remove('is-done');
    if (logEl) logEl.innerHTML = '';
    if (barEl) barEl.style.width = '0%';
    if (pctEl) pctEl.textContent = '0';
    if (stageEl) stageEl.textContent = t(STAGE_KEYS[0]);
    if (sigEl) sigEl.innerHTML = '<p class="aip-muted">' + t('ai.scan.waiting') + '</p>';

    var index = 0;

    function pushLine() {
      if (token !== scanToken || !logEl) return;
      var li = document.createElement('li');
      li.className = 'aip-scan__line';
      li.innerHTML = '<span class="aip-scan__line-dot"></span><span>' + t(LOG_KEYS[index]) + '</span>';
      logEl.appendChild(li);
      logEl.scrollTop = logEl.scrollHeight;

      var progress = Math.round(((index + 1) / LOG_KEYS.length) * 100);
      if (barEl) barEl.style.width = progress + '%';
      if (pctEl) pctEl.textContent = String(progress);
      if (stageEl) stageEl.textContent = t(STAGE_KEYS[Math.min(STAGE_KEYS.length - 1, Math.floor(index / 1.5))]);

      if (index === 3 && sigEl && state.result) {
        sigEl.innerHTML = signalsHtml(state.result.signals);
      }

      index += 1;
      if (index < LOG_KEYS.length) {
        later(pushLine, 560);
      } else {
        later(finish, 620);
      }
    }

    function finish() {
      if (token !== scanToken) return;
      state.analysing = false;
      scan.classList.remove('is-running');
      scan.classList.add('is-done');
      if (barEl) barEl.style.width = '100%';
      if (pctEl) pctEl.textContent = '100';
      if (stageEl && state.result) stageEl.textContent = t('ai.scan.done', { n: state.result.signals.length });
      if (sigEl && state.result) sigEl.innerHTML = signalsHtml(state.result.signals);
      refreshNeeds();
      flash(t('ai.toast.analysed'));
      later(function () {
        if (token === scanToken && state.view === 2) goStep(3, { silent: true });
      }, 1200);
    }

    later(pushLine, 260);
  }

  function paintScanComplete() {
    var scan = q('[data-scan]');
    if (!scan || !state.result) return;
    var logEl = q('[data-scan-log]');
    var barEl = q('[data-scan-bar]');
    var pctEl = q('[data-scan-percent]');
    var stageEl = q('[data-scan-stage]');
    var sigEl = q('[data-scan-signals]');

    scan.classList.remove('is-running');
    scan.classList.add('is-done');
    if (logEl) {
      logEl.innerHTML = LOG_KEYS.map(function (key) {
        return '<li class="aip-scan__line"><span class="aip-scan__line-dot"></span><span>' + t(key) + '</span></li>';
      }).join('');
    }
    if (barEl) barEl.style.width = '100%';
    if (pctEl) pctEl.textContent = '100';
    if (stageEl) stageEl.textContent = t('ai.scan.done', { n: state.result.signals.length });
    if (sigEl) sigEl.innerHTML = signalsHtml(state.result.signals);
  }

  /* ------------------------------------------------------------------ */
  /* Analyse & résultats                                                */
  /* ------------------------------------------------------------------ */
  function analyseNow(show) {
    state.result = MODEL.analyse(state);
    state.plan = null;
    state.selectedRisk = state.selectedRisk || state.result.risks[0].id;
    setHtml(3, TPL.results(state.result, state.mode));
    refreshNeeds();
    if (show !== false && state.view === 3) animateResults();
    return state.result;
  }

  function animateResults() {
    var host = q('[data-step="3"]');
    if (!host) return;
    CHARTS.animate(host);
    if (state.selectedRisk) selectRisk(state.selectedRisk);
    var active = host.querySelector('.aip-risk.is-selected');
    if (!active) {
      var first = host.querySelector('.aip-risk');
      if (first) selectRisk(first.getAttribute('data-risk'));
    }
  }

  function selectRisk(id) {
    if (!state.result) return;
    var risk = state.result.risks.filter(function (r) { return r.id === id; })[0];
    if (!risk) return;
    state.selectedRisk = id;

    qa('.aip-risk').forEach(function (card) {
      var on = card.getAttribute('data-risk') === id;
      card.classList.toggle('is-selected', on);
      card.setAttribute('aria-pressed', String(on));
    });
    qa('[data-tl-row]').forEach(function (row) {
      row.classList.toggle('is-selected', row.getAttribute('data-tl-row') === id);
    });

    var host = q('[data-tl-detail]');
    if (host) host.innerHTML = TPL.timelineDetail(risk, state.mode);
  }

  function clearDetail() {
    var host = q('[data-tl-detail]');
    if (!host) return;
    host.innerHTML = '<div class="aip-tl__empty">' + CHARTS.icon('info') + '<span>' + t('ai.timeline.select') + '</span></div>';
    qa('.aip-risk').forEach(function (c) { c.classList.remove('is-selected'); c.setAttribute('aria-pressed', 'false'); });
    qa('[data-tl-row]').forEach(function (r) { r.classList.remove('is-selected'); });
    state.selectedRisk = null;
  }

  function setMode(mode) {
    mode = mode === 'corrected' ? 'corrected' : 'current';
    if (state.mode === mode) return;
    state.mode = mode;
    if (!state.result) return;
    setHtml(3, TPL.results(state.result, state.mode));
    animateResults();
  }

  /* ------------------------------------------------------------------ */
  /* Programme nutritionnel                                             */
  /* ------------------------------------------------------------------ */
  function buildPlan(withFlash) {
    if (!state.result) analyseNow(false);
    /* On conserve le jour consulté lors d’une régénération. */
    var keepDay = state.plan ? state.activeDay : 0;
    state.plan = MODEL.buildPlan(state, state.result);
    state.plan.activeDay = keepDay;
    state.activeDay = keepDay;
    setHtml(4, TPL.plan(state.plan, state.result, state));
    qa('[data-needs="result"]').forEach(function (btn) { btn.disabled = false; });
    if (state.view === 4) {
      CHARTS.animate(q('[data-step="4"]'));
      raf(positionInk);
    }
    if (withFlash) flash(t('ai.toast.plan'));
  }

  function positionInk() {
    var ink = q('[data-day-ink]');
    if (!ink) return;
    var active = q('[data-day-tab="' + state.activeDay + '"]');
    ink.style.setProperty('--i', String(state.activeDay));
    if (active && active.offsetWidth) {
      ink.style.width = active.offsetWidth + 'px';
      ink.style.left = active.offsetLeft + 'px';
      ink.style.transform = 'none';
    } else {
      ink.style.width = '';
      ink.style.left = '';
      ink.style.transform = '';
    }
  }

  function setDay(index) {
    if (!state.plan) return;
    index = Math.max(0, Math.min(6, Number(index) || 0));
    state.activeDay = index;
    state.plan.activeDay = index;

    var wrap = q('[data-daywrap]');
    if (wrap) {
      wrap.innerHTML = TPL.dayPanel(state.plan, index);
      wrap.classList.remove('is-enter');
      /* Reflow volontaire : relance l’animation d’entrée en cascade. */
      void wrap.offsetWidth;
      wrap.classList.add('is-enter');
    }
    qa('[data-day-tab]').forEach(function (tab) {
      var on = Number(tab.getAttribute('data-day-tab')) === index;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    var chartHost = q('[data-week-chart]');
    if (chartHost) chartHost.innerHTML = TPL.weekChartBlock(state.plan);
    positionInk();
  }

  function printPlan() {
    if (!state.plan) return;
    document.body.classList.add('aip-printing');
    flash(t('ai.toast.print'));
    later(function () {
      try { global.print(); } catch (e) { /* print indisponible (iframe, tests) */ }
      later(function () { document.body.classList.remove('aip-printing'); }, 600);
    }, 120);
  }

  /* ------------------------------------------------------------------ */
  /* Champs                                                             */
  /* ------------------------------------------------------------------ */
  function setField(path, rawValue, input) {
    var value = Number(rawValue);
    if (!isFinite(value)) return;
    var parts = path.split('.');
    var group = parts[0], key = parts[1];
    if (group === 'profile') {
      if (key === 'height') value = Math.max(120, Math.min(215, value));
      if (key === 'weight') value = Math.max(35, Math.min(200, value));
      state.profile[key] = value;
      if (input) input.value = String(value);
      refreshBmi();
    } else if (group === 'habits') {
      state.habits[key] = value;
    } else {
      return;
    }
    if (input) updateControl(input);
    invalidateResults();
  }

  function updateControl(input) {
    var control = input.closest('.aip-control');
    if (!control) return;
    var field = input.getAttribute('data-field');
    var value = Number(input.value);
    var min = Number(input.min), max = Number(input.max);
    input.style.setProperty('--fill', (((value - min) / (max - min)) * 100).toFixed(1) + '%');

    var out = control.querySelector('[data-out]');
    if (out) {
      var decimals = field === 'habits.fiber' || field === 'habits.water' ? 1 : 0;
      out.textContent = fmt(value, decimals);
    }
    updateQualityChip(input);
  }

  function refreshBmi() {
    var m = MODEL.derived(state);
    var valueEl = q('[data-bmi-value]');
    var bandEl = q('[data-bmi-band]');
    var box = q('[data-bmi]');
    if (valueEl) valueEl.textContent = fmt(m.bmiRounded, 1);
    if (bandEl) bandEl.textContent = t('ai.bmi.' + MODEL.bmiBand(m.bmi));
    if (box) box.setAttribute('data-band', MODEL.bmiBand(m.bmi));
  }

  function setSex(sex) {
    state.profile.sex = sex === 'male' ? 'male' : 'female';
    qa('[data-sex]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-sex') === state.profile.sex);
    });
    invalidateResults();
  }

  /* Toute modification invalide les prédictions : elles seront recalculées
     automatiquement à l’entrée dans l’étape 3. */
  function invalidateResults() {
    if (!state.result) return;
    state.result = null;
    state.plan = null;
    state.selectedRisk = null;
    refreshNeeds();
  }

  /* ------------------------------------------------------------------ */
  /* Profils de démonstration                                           */
  /* ------------------------------------------------------------------ */
  function applyPreset(name) {
    var preset = DATA.PRESETS[name];
    if (!preset) return;
    state = freshState();
    state.sensors.glucose = preset.sensors.glucose;
    state.sensors.hr = preset.sensors.hr;
    state.sensors.sleep = preset.sensors.sleep;
    state.sensors.syncedAt = Date.now();
    state.profile = clone(preset.profile);
    state.habits = clone(preset.habits);
    renderAll();
    goStep(1, { silent: true });
    flash(t('ai.toast.preset'));
  }

  function resetAll() {
    state = freshState();
    renderAll();
    goStep(1, { silent: true });
    flash(t('ai.toast.reset'));
  }

  /* ------------------------------------------------------------------ */
  /* Notifications internes                                             */
  /* ------------------------------------------------------------------ */
  function flash(message) {
    if (!root || !message) return;
    var existing = root.querySelector('.aip-toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.className = 'aip-toast';
    el.setAttribute('role', 'status');
    el.innerHTML = CHARTS.icon('check') + '<span>' + message + '</span>';
    root.appendChild(el);
    raf(function () { el.classList.add('is-on'); });
    later(function () {
      el.classList.remove('is-on');
      later(function () { el.remove(); }, 320);
    }, 2300);
  }

  /* ------------------------------------------------------------------ */
  /* Événements                                                         */
  /* ------------------------------------------------------------------ */
  function onClick(event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var lang = target.closest('[data-aip-lang]');
    if (lang) { setModuleLang(lang.getAttribute('data-aip-lang')); return; }

    var preset = target.closest('[data-preset]');
    if (preset) { applyPreset(preset.getAttribute('data-preset')); return; }

    if (target.closest('[data-reset]')) { resetAll(); return; }

    if (target.closest('[data-sync]')) { syncSensors(); return; }

    if (target.closest('[data-analyse]')) { goStep(2); return; }

    var sex = target.closest('[data-sex]');
    if (sex) { setSex(sex.getAttribute('data-sex')); return; }

    var mode = target.closest('[data-mode]');
    if (mode) { setMode(mode.getAttribute('data-mode')); return; }

    var marker = target.closest('[data-tl-select]');
    if (marker) {
      goStep(3, { silent: true });
      selectRisk(marker.getAttribute('data-tl-select'));
      return;
    }

    if (target.closest('[data-tl-close]')) { clearDetail(); return; }

    var dayTab = target.closest('[data-day-tab]');
    if (dayTab) { setDay(dayTab.getAttribute('data-day-tab')); return; }

    if (target.closest('[data-regenerate]')) {
      state.planSeed = (state.planSeed || 0) + 1;
      buildPlan(true);
      return;
    }

    if (target.closest('[data-print]')) { printPlan(); return; }

    var riskCard = target.closest('.aip-risk');
    if (riskCard) { selectRisk(riskCard.getAttribute('data-risk')); return; }

    var nav = target.closest('[data-goto]');
    if (nav && !nav.disabled) { goStep(nav.getAttribute('data-goto')); return; }
  }

  /* Choix explicite FR / EN dans l’en-tête du module : on aligne aussi la
     plateforme, sinon la couche i18n institutionnelle (active dès que la
     plateforme n’est pas en français) retraduirait nos textes français. */
  function setModuleLang(code) {
    code = code === 'fr' ? 'fr' : 'en';
    I18N.setLang(code);
    try {
      if (global.NUTRI_I18N && typeof global.NUTRI_I18N.setLocale === 'function') {
        if (String(global.NUTRI_I18N.locale || '').toLowerCase().indexOf(code) !== 0) {
          global.NUTRI_I18N.setLocale(code, false);
        }
      }
      var select = document.getElementById('language') || document.getElementById('lang');
      if (select && select.querySelector('option[value="' + code + '"]')) select.value = code;
      global.localStorage.setItem('nutri_language', code);
    } catch (e) { /* plateforme absente (module autonome) */ }
    if (I18N.markPlatformAligned) I18N.markPlatformAligned(code);
  }

  function onInput(event) {
    var input = event.target;
    if (!input || input.tagName !== 'INPUT') return;
    if (input.type === 'number') return; /* validé sur change (saisie partielle) */
    var field = input.getAttribute('data-field');
    if (!field) return;
    setField(field, input.value, input);
  }

  function onChange(event) {
    var input = event.target;
    if (!input || input.tagName !== 'INPUT' || input.type !== 'number') return;
    var field = input.getAttribute('data-field');
    if (!field) return;
    setField(field, input.value, input);
  }

  function onKeyDown(event) {
    var target = event.target;
    if (!target) return;

    var dayTab = target.closest && target.closest('[data-day-tab]');
    if (dayTab && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      event.preventDefault();
      var next = state.activeDay + (event.key === 'ArrowRight' ? 1 : -1);
      if (next < 0) next = 6;
      if (next > 6) next = 0;
      setDay(next);
      var focusTarget = q('[data-day-tab="' + next + '"]');
      if (focusTarget) focusTarget.focus();
      return;
    }

    var card = target.closest && target.closest('.aip-risk');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      selectRisk(card.getAttribute('data-risk'));
    }
  }

  function bind() {
    if (bound || !root) return;
    bound = true;
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    root.addEventListener('keydown', onKeyDown);
  }

  /* ------------------------------------------------------------------ */
  /* Cycle de vie                                                       */
  /* ------------------------------------------------------------------ */
  function mount() {
    root = document.getElementById('aiPrevention');
    if (!root || root.getAttribute('data-aip-ready') === '1') return;

    I18N.boot();
    state = freshState();
    root.setAttribute('data-aip-ready', '1');
    root.setAttribute('data-aip-locale', I18N.lang);
    root.innerHTML = TPL.shell(state);
    setHtml(1, TPL.step1(state));
    setHtml(2, TPL.scanner(state));
    bind();
    paintRanges();
    applyView();

    /* Le module est monté une seule fois : les re-rendus suivants passent par
       renderAll() (changement de langue, profils de démonstration, reset). */
    I18N.onChange(function (lang) {
      if (!root) return;
      root.setAttribute('data-aip-locale', lang);
      renderAll();
    });

    /* La plateforme dispatche cet événement à chaque changement de langue. */
    document.addEventListener('nutri:i18nChanged', function () {
      if (I18N.syncFromPlatform) I18N.syncFromPlatform();
      else I18N.follow();
    });

    /* Repositionnement de l’onglet actif du programme au redimensionnement. */
    var resizeTimer = null;
    global.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (state && state.view === 4 && state.plan) positionInk();
      }, 160);
    });

    /* Horodatage relatif des capteurs (rafraîchi toutes les 10 s). */
    setInterval(function () {
      if (document.hidden) return;
      updateSyncStamp();
    }, 10000);
  }

  try {
    if (document.readyState === 'loading') {
      mount();
      document.addEventListener('DOMContentLoaded', function () { if (!root) mount(); });
    } else {
      mount();
    }
  } catch (err) {
    if (global.console && global.console.error) global.console.error('[AIP] initialisation', err);
  }

  /* ------------------------------------------------------------------ */
  /* API publique (démonstration, tests, intégration)                   */
  /* ------------------------------------------------------------------ */
  global.AIPrevention = {
    version: '1.0.0',
    get state() { return state; },
    get root() { return root; },
    mount: mount,
    render: renderAll,
    go: goStep,
    analyse: analyseNow,
    build: buildPlan,
    sync: syncSensors,
    setDay: setDay,
    setMode: setMode,
    selectRisk: selectRisk,
    preset: applyPreset,
    reset: resetAll,
    model: MODEL,
    charts: CHARTS
  };

  /* Compatibilité avec l’ancien bouton « Generate personalized plan ». */
  global.generatePlan = function () {
    if (!root) mount();
    if (!state) return;
    if (!state.result) analyseNow(false);
    buildPlan(false);
    goStep(4);
  };
})(window);
