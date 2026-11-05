/* ============================================================================
 * NUTRI.N°1 — Citizen Health & Nutrition Dashboard 360° · contrôleur
 * ----------------------------------------------------------------------------
 * Monte l'expérience premium dans la section #citizen de la vitrine.
 *
 * Principes
 *  · Un seul écouteur délégué sur la racine (#czdRoot) : le module peut être
 *    entièrement re-rendu lors d'un changement de langue, d'onglet ou de
 *    profil sans perdre ses interactions.
 *  · Un état sérialisable unique (state) persisté dans localStorage ; le moteur
 *    de calcul (CZD_MODEL) ne touche jamais au DOM.
 *  · Les actions du module sont exposées sur window (compatibilité avec les
 *    boutons historiques de index.html : updateReferences, saveCitizen,
 *    generateRecommendations, loadFamilyChildDashboard…).
 *  · Accessibilité : rôles ARIA, navigation clavier des onglets, focus visible,
 *    prefers-reduced-motion respecté dans la feuille CSS.
 * ========================================================================== */
(function (global) {
  'use strict';

  var D = global.CZD_DATA;
  var M = global.CZD_MODEL;
  var C = global.CZD_CHARTS;
  var TPL = global.CZD_TEMPLATE || global.CZD_TPL;
  var I18N = global.CZD_I18N;

  if (!D || !M || !C || !TPL || !I18N) {
    if (global.console) global.console.warn('[CZD] dépendances manquantes');
    return;
  }

  var STORAGE = 'nutri_czd_state_v1';
  var root = null;
  var section = null;
  var state = null;
  var bound = false;
  var timers = [];
  var modalOpen = false;
  var lastFocus = null;
  var lastInput = null;
  var lastInputAt = 0;

  function q(sel) { return root ? root.querySelector(sel) : null; }
  function qa(sel) { return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : []; }
  function t(k, p) { return I18N.t(k, p); }
  function n(v, d) { return I18N.num(v, d); }
  function esc(s) { return C.esc(s); }

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  /* ------------------------------------------------------------------ */
  /* État                                                               */
  /* ------------------------------------------------------------------ */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function freshState() {
    return {
      profile: clone(D.DEFAULTS.profile),
      habits: clone(D.DEFAULTS.habits),
      sync: { last: 0, source: 'watch' },
      familyAccess: false,
      activeChild: 'child1',
      activeTab: 'overview',
      activeDay: 0,
      preset: 'balanced',
      planSeed: 0,
      childDiversity: { child1: ['cereals', 'legumes', 'vegetables', 'animal'], child2: ['cereals', 'vegetables'] },
      eaten: {},
      countries: (typeof countries !== 'undefined' && countries) ? countries.map(function (c) { return [c[0], c[1]]; }) : [['TG', 'Togo']]
    };
  }

  function load() {
    var base = freshState();
    var raw = null;
    try { raw = global.localStorage.getItem(STORAGE); } catch (e) {}
    if (raw) {
      try {
        var saved = JSON.parse(raw);
        ['profile', 'habits', 'familyAccess', 'activeChild', 'activeTab', 'activeDay', 'preset', 'eaten', 'childDiversity', 'sync'].forEach(function (k) {
          if (saved[k] != null) base[k] = saved[k];
        });
      } catch (e) { /* état corrompu : repartir des valeurs par défaut */ }
    }
    /* Les dates de synchronisation ne survivent pas : marquage « jamais ». */
    base.sync = { last: 0, source: 'watch' };
    /* Validation : un état ancien ou édité ne doit pas casser le rendu. */
    if (['overview', 'plan', 'clinical', 'family'].indexOf(base.activeTab) === -1) base.activeTab = 'overview';
    if (!D.CHILD_REFS[base.activeChild]) base.activeChild = 'child1';
    if (!D.PRESETS[base.preset]) base.preset = 'balanced';
    base.activeDay = Math.max(0, Math.min(6, Number(base.activeDay) || 0));
    if (!base.childDiversity || typeof base.childDiversity !== 'object') base.childDiversity = freshState().childDiversity;
    if (!base.eaten || typeof base.eaten !== 'object') base.eaten = {};
    return base;
  }

  function save() {
    try {
      global.localStorage.setItem(STORAGE, JSON.stringify({
        profile: state.profile,
        habits: state.habits,
        familyAccess: state.familyAccess,
        activeChild: state.activeChild,
        activeTab: state.activeTab,
        activeDay: state.activeDay,
        preset: state.preset,
        eaten: state.eaten,
        childDiversity: state.childDiversity
      }));
    } catch (e) { /* quota / mode privé : la session reste fonctionnelle */ }
  }

  /* Recalcule toutes les valeurs dérivées : aucun rendu ici. */
  function compute() {
    state.indicator = M.indicator(state.profile);
    state.vitals = M.vitals(state.profile);
    state.energy = M.energy(state.profile);
    state.history = D.historyFor(state.profile, state.profile.name + state.profile.goal);
    if (!state.plan || state.planSeed !== state._builtSeed) {
      state.plan = M.buildPlan(state.profile, state.habits, { seed: state.profile.name + state.profile.goal + state.planSeed });
      state._builtSeed = state.planSeed;
      /* Réinjecte l'état « repas consommé ». */
      state.plan.days.forEach(function (d, i) {
        d.eaten = d.eaten || {};
        D.MEAL_SLOTS.forEach(function (slot) {
          d.eaten[slot] = !!state.eaten[i + ':' + slot];
        });
      });
    }
    state.scores = M.scores(state.profile, state.habits, state.plan, state.energy);
    state.risks = M.risks(state.profile, state.habits);
    state.priorities = M.priorities(state.profile, state.habits, state.plan);
    state.notes = M.clinicalNotes(state.profile, state.habits);
    /* Le jour actif peut dépasser si le plan vient d'être régénéré. */
    if (state.activeDay > state.plan.days.length - 1) state.activeDay = 0;
  }

  /* ------------------------------------------------------------------ */
  /* Rendu                                                              */
  /* ------------------------------------------------------------------ */
  function renderAll() {
    if (!root) return;
    clearTimers();
    root.innerHTML = TPL.shell(state);
    C.animate(root);
    moveInk();
    syncLegacyFields();
  }

  /* Re-rendu partiel : garde le focus des champs du formulaire clinique. */
  function paint(scope) {
    if (!root) return;
    compute();
    scope = scope || 'all';
    if (scope === 'all' || scope === 'overview') {
      var ov = q('[data-czd-panel="overview"]');
      if (ov) { ov.innerHTML = TPL.overview(state); C.animate(ov); }
    }
    if (scope === 'all' || scope === 'plan') {
      var pl = q('[data-czd-panel="plan"]');
      if (pl) { pl.innerHTML = TPL.planPanel(state); C.animate(pl); }
    }
    if (scope === 'all' || scope === 'clinical') {
      paintClinicalDerived();
      var form = q('[data-czd-panel="clinical"] [data-czd-form]');
      if (form) syncForm();
    }
    if (scope === 'all' || scope === 'family') {
      var fam = q('[data-czd-panel="family"]');
      if (fam) { fam.innerHTML = TPL.familyPanel(state); C.animate(fam); }
    }
    syncLegacyFields();
    /* En-tête : chip de score + libellé de synchronisation. */
    var hero = q('.czd-hero');
    if (hero) {
      var fresh = document.createElement('div');
      fresh.innerHTML = TPL.header(state);
      var newHero = fresh.firstElementChild;
      hero.parentNode.replaceChild(newHero, hero);
    }
    if (scope === 'all') moveInk();
    save();
  }

  /* Compatibilité : certains scripts / tests de la page lisent encore les
     anciens identifiants (#bmi, #weight, #waist, #bp) et #recs. */
  function syncLegacyFields() {
    var p = state.profile;
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    set('bmi', state.indicator.bmi != null ? String(state.indicator.bmi).replace('.', ',') : '—');
    set('weight', p.weight ? n(p.weight, 1) + ' kg' : '—');
    set('waist', p.waist ? n(p.waist, 0) + ' cm' : '—');
    set('bp', (p.sys || '—') + '/' + (p.dia || '—'));
    var recs = document.getElementById('recs');
    if (recs && state.priorities && state.priorities.length) {
      recs.innerHTML = state.priorities.map(function (pr) {
        return '<p>' + esc(t('czd.priority.' + pr.key, { n: pr.n })) + '</p>';
      }).join('');
    }
  }

  function paintClinicalDerived() {
    if (!root) return;
    var side = q('[data-czd-derived="side"]');
    if (side) { side.innerHTML = TPL.clinicalSide(state); C.animate(side); }
    var charts = q('[data-czd-derived="charts"]');
    if (charts) { charts.innerHTML = TPL.clinicalCharts(state); C.animate(charts); }
    var stamp = q('[data-czd-stamp]');
    if (stamp) stamp.textContent = t('czd.clin.live.at', { t: I18N.date(Date.now()) });
  }

  function syncForm() {
    /* Pendant une saisie, le champ actif est la source de vérité : on ne le
       réécrit jamais depuis l'état (sinon la valeur tapée serait tronquée). */
    var editing = lastInput && Date.now() - lastInputAt < 1200 ? lastInput : null;
    var p = state.profile;
    var unit = p.glucoseUnit || 'mmol';
    var map = {
      sex: p.sex, age: p.age, height: p.height, weight: p.weight, waist: p.waist, hip: p.hip,
      glucose: unit === 'mgdl' ? Math.round((Number(state.vitals.glucose) || 0) * 18) : state.vitals.glucose,
      glucoseUnit: unit, hba1c: p.hba1c,
      sys: p.sys, dia: p.dia, chol: p.chol, creatinine: p.creatinine, activity: p.activity
    };
    Object.keys(map).forEach(function (k) {
      var el = q('[data-czd-input="' + k + '"]');
      if (!el || el === editing) return;
      if (document.activeElement === el) return;
      if (String(el.value) !== String(map[k])) el.value = map[k];
    });
  }

  /* Encre animée sous l'onglet actif. */
  function moveInk() {
    var ink = q('[data-czd-ink]');
    var active = q('.czd-tab.is-on');
    if (!ink || !active) return;
    var tabs = q('.czd-tabs');
    if (!tabs) return;
    var tw = tabs.getBoundingClientRect();
    var aw = active.getBoundingClientRect();
    if (!tw.width) return;
    ink.style.width = aw.width + 'px';
    ink.style.transform = 'translateX(' + (aw.left - tw.left) + 'px)';
  }

  /* ------------------------------------------------------------------ */
  /* Notifications                                                      */
  /* ------------------------------------------------------------------ */
  function toast(message, tone) {
    if (!root) return;
    var host = q('.czd-toasts');
    if (!host) {
      host = document.createElement('div');
      host.className = 'czd-toasts';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      root.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'czd-toast' + (tone ? ' czd-toast--' + tone : '');
    el.innerHTML = C.icon(tone === 'warn' ? 'alert' : 'check') + '<span>' + esc(message) + '</span>';
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    later(function () {
      el.classList.remove('is-on');
      later(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                            */
  /* ------------------------------------------------------------------ */
  var ACTIONS = {
    tab: function (el, data) {
      setTab(data.czdTarget);
    },
    'plan-generate': function () {
      state.planSeed += 1;
      state.activeDay = 0;
      state.eaten = {};
      state._builtSeed = null;
      paint('plan');
      paint('overview');
      toast(t('czd.plan.generated'));
    },
    'plan-csv': function () {
      exportPlanCSV();
    },
    day: function (el, data) {
      state.activeDay = Number(data.czdDay) || 0;
      paint('plan');
    },
    'toggle-meal': function (el, data) {
      var slot = data.czdSlot;
      var day = state.plan.days[state.activeDay];
      var on = !(day.eaten && day.eaten[slot]);
      day.eaten[slot] = on;
      var key = state.activeDay + ':' + slot;
      if (on) state.eaten[key] = 1; else delete state.eaten[key];
      if (on) {
        var kcal = (day.meals[slot] || []).reduce(function (a, it) { return a + D.FOODS[it.id].kcal * it.portion; }, 0);
        toast(t('czd.toast.meal', { v: n(Math.round(kcal), 0) }));
      } else {
        toast(t('czd.toast.mealUndo'), 'warn');
      }
      paint('plan');
      paint('overview');
    },
    'toggle-heat': function (el, data) {
      var d = Number(data.czdDay), slot = data.czdSlot;
      var day = state.plan.days[d];
      if (!day) return;
      day.eaten = day.eaten || {};
      var on = !day.eaten[slot];
      day.eaten[slot] = on;
      var key = d + ':' + slot;
      if (on) state.eaten[key] = 1; else delete state.eaten[key];
      if (on) {
        var kcal = (day.meals[slot] || []).reduce(function (a, it) { return a + D.FOODS[it.id].kcal * it.portion; }, 0);
        toast(t('czd.toast.meal', { v: n(Math.round(kcal), 0) }));
      }
      paint('plan');
      paint('overview');
    },
    'habit+': function (el, data) {
      adjustHabit(data.czdHabitkey, +1);
    },
    'habit-': function (el, data) {
      adjustHabit(data.czdHabitkey, -1);
    },
    'add-water': function (el, data) {
      adjustHabit('water', Number(data.czdAmount || 1));
    },
    'steps+': function (el, data) {
      var amount = Number(data.czdAmount || 1000);
      state.habits.steps = Math.max(0, (state.habits.steps || 0) + amount);
      toast(t('czd.toast.steps', { v: n(state.habits.steps, 0) }));
      paint('overview');
    },
    'log-meal': function () {
      var day = state.plan.days[state.activeDay];
      var slot = null;
      for (var i = 0; i < D.MEAL_SLOTS.length; i++) {
        if (!(day.eaten && day.eaten[D.MEAL_SLOTS[i]])) { slot = D.MEAL_SLOTS[i]; break; }
      }
      if (!slot) { toast(t('czd.plan.onTarget')); return; }
      ACTIONS['toggle-meal'](null, { czdSlot: slot });
    },
    sync: function (el) {
      if (el.getAttribute('aria-busy') === 'true') return;
      el.setAttribute('aria-busy', 'true');
      el.classList.add('is-busy');
      var label = el.querySelector('.czd-btn__label');
      var original = el.getAttribute('data-czd-idle') || t('czd.sync');
      if (label) label.textContent = t('czd.syncing');
      later(function () {
        state.sync.last = Date.now();
        state.habits.steps = Math.round((state.habits.steps || 0) + 320);
        state.habits.sleep = Math.min(9, +((state.habits.sleep || 7) + 0.2).toFixed(1));
        el.removeAttribute('aria-busy');
        el.classList.remove('is-busy');
        if (label) label.textContent = original;
        var st = q('[data-czd-sync]');
        if (st) st.textContent = t('czd.sync.synced') + ' · ' + I18N.date(state.sync.last);
        toast(t('czd.sync.synced') + ' · ' + t('czd.badge.local'));
        paint('overview');
      }, 1300);
    },
    export: function () {
      exportJSON();
    },
    print: function () {
      try { global.print(); } catch (e) { toast(t('czd.toast.exportBlocked'), 'warn'); }
    },
    reset: function () {
      state = freshState();
      state.baseline = { profile: clone(state.profile), habits: clone(state.habits) };
      state.planSeed = 0;
      compute();
      renderAll();
      save();
      toast(t('czd.reset.done'));
    },
    save: function () {
      save();
      paint('clinical');
      toast(t('czd.clin.saved'));
    },
    'form-reset': function () {
      var base = state.baseline || { profile: D.DEFAULTS.profile, habits: D.DEFAULTS.habits };
      state.profile = Object.assign(clone(D.DEFAULTS.profile), clone(base.profile));
      state.habits = Object.assign(clone(D.DEFAULTS.habits), clone(base.habits));
      state._builtSeed = null;
      compute();
      renderAll();
      save();
      toast(t('czd.reset.done'));
    },
    consent: function () {
      state.familyAccess = !state.familyAccess;
      paint('family');
      toast(state.familyAccess ? t('czd.family.requested') : t('czd.family.revoked'), state.familyAccess ? '' : 'warn');
    },
    'child-plan': function () {
      toast(t('czd.family.plan.done'));
    },
    'child-full': function () {
      toast(t('czd.family.full.done'));
    },
    explain: function (el, data) {
      openModal(data.czdTopic || 'score');
    },
    'modal-close': function () {
      closeModal();
    }
  };

  function adjustHabit(key, delta) {
    var h = state.habits;
    if (key === 'water') {
      h.water = Math.max(0, Math.min((h.waterGoal || 8) + 4, (h.water || 0) + delta));
      if (h.water >= (h.waterGoal || 8) && delta > 0) toast(t('czd.toast.water.max'));
      else toast(t('czd.toast.water', { a: h.water, b: h.waterGoal || 8 }));
    } else if (key === 'veggies') {
      h.veggies = Math.max(0, Math.min(10, (h.veggies || 0) + delta));
      toast(t('czd.habit.veggies.unit', { a: h.veggies, b: h.veggiesGoal || 5 }));
    } else {
      return;
    }
    /* Journalisation logique : les fibres suivent les portions ajoutées. */
    if (key === 'veggies') h.fiber = Math.max(0, Math.round((h.fiber || 0) + delta * 2.4));
    paint('overview');
    paint('plan');
  }

  function setTab(tab) {
    if (!tab) return;
    state.activeTab = tab;
    qa('[data-czd-tab]').forEach(function (el) {
      var on = el.getAttribute('data-czd-tab') === tab;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-selected', String(on));
      el.setAttribute('tabindex', on ? '0' : '-1');
    });
    qa('[data-czd-panel]').forEach(function (el) {
      var on = el.getAttribute('data-czd-panel') === tab;
      el.classList.toggle('is-on', on);
      if (on) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    });
    moveInk();
    save();
    var panel = q('[data-czd-panel="' + tab + '"]');
    if (panel) C.animate(panel);
  }

  function applyPreset(key) {
    var preset = D.PRESETS[key];
    if (!preset) return;
    state.preset = key;
    state.baseline = { profile: clone(preset.profile), habits: clone(preset.habits) };
    state.profile = Object.assign(clone(D.DEFAULTS.profile), clone(preset.profile));
    state.habits = Object.assign(clone(D.DEFAULTS.habits), clone(preset.habits));
    state._builtSeed = null;
    state.eaten = {};
    state.activeDay = 0;
    compute();
    renderAll();
    save();
    toast(t('czd.preset.applied', { name: preset.profile.name }));
  }

  /* ------------------------------------------------------------------ */
  /* Modale                                                             */
  /* ------------------------------------------------------------------ */
  function openModal(topic) {
    closeModal();
    lastFocus = document.activeElement;
    var wrap = document.createElement('div');
    wrap.className = 'czd-modals';
    wrap.innerHTML = TPL.modal(topic);
    root.appendChild(wrap);
    modalOpen = true;
    requestAnimationFrame(function () { wrap.classList.add('is-on'); });
    var btn = wrap.querySelector('.czd-modal__close');
    if (btn) btn.focus();
    var host = q('[data-czd-panel="' + state.activeTab + '"]');
    if (host) host.setAttribute('aria-hidden', 'true');
  }

  function closeModal() {
    var wrap = q('.czd-modals');
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    modalOpen = false;
    var host = q('[data-czd-panel="' + state.activeTab + '"]');
    if (host) host.removeAttribute('aria-hidden');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  /* ------------------------------------------------------------------ */
  /* Export                                                             */
  /* ------------------------------------------------------------------ */
  function download(filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 1200);
      return true;
    } catch (e) {
      return false;
    }
  }

  function exportJSON() {
    var payload = {
      module: 'NUTRI.N°1 — Citizen Dashboard 360°',
      exportedAt: new Date().toISOString(),
      language: I18N.lang,
      profile: state.profile,
      habits: state.habits,
      indicators: {
        bmi: state.indicator.bmi, waist: state.profile.waist, whtr: state.indicator.whtr,
        glucose: state.vitals.glucose, hba1c: state.vitals.hba1c, bp: state.profile.sys + '/' + state.profile.dia,
        bmr: state.energy.bmr, tdee: state.energy.tdee
      },
      scores: state.scores,
      risks: state.risks,
      plan: state.plan ? state.plan.days.map(function (d) {
        return {
          day: d.index + 1,
          totals: d.totals,
          glycaemicLoad: M.glycemicLoad(d),
          meals: D.MEAL_SLOTS.reduce(function (acc, slot) {
            acc[slot] = d.meals[slot].map(function (it) { return { food: D.FOODS[it.id].name.en, portion: it.portion }; });
            return acc;
          }, {})
        };
      }) : null,
      disclaimer: 'Educational demonstration data generated locally. Not a medical diagnosis.'
    };
    var ok = download('nutri1-citizen-360-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(payload, null, 2), 'application/json');
    toast(ok ? t('czd.export.done') : t('czd.toast.exportBlocked'), ok ? '' : 'warn');
  }

  function exportPlanCSV() {
    if (!state.plan) return;
    var rows = [['Day', 'Meal', 'Food', 'Portion', 'kcal', 'Protein (g)', 'Fiber (g)', 'Iron (mg)', 'Vitamin A (ug)', 'Glycaemic load']];
    state.plan.days.forEach(function (d, i) {
      D.MEAL_SLOTS.forEach(function (slot) {
        (d.meals[slot] || []).forEach(function (it) {
          var f = D.FOODS[it.id];
          rows.push([
            'Day ' + (i + 1), slot, f.name.en, it.portion,
            Math.round(f.kcal * it.portion), Math.round(f.protein * it.portion), Math.round(f.fiber * it.portion),
            (f.iron * it.portion).toFixed(1), Math.round(f.vitA * it.portion), M.glycemicLoad(d)
          ]);
        });
      });
      rows.push(['Day ' + (i + 1), 'TOTAL', '', '', Math.round(d.totals.kcal), Math.round(d.totals.protein), Math.round(d.totals.fiber), d.totals.iron.toFixed(1), Math.round(d.totals.vitA), M.glycemicLoad(d)]);
    });
    var csv = '\ufeff' + rows.map(function (r) {
      return r.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\r\n');
    var ok = download('nutri1-plan-7-jours.csv', csv, 'text/csv;charset=utf-8');
    toast(ok ? t('czd.csv.done') : t('czd.toast.exportBlocked'), ok ? '' : 'warn');
  }

  /* ------------------------------------------------------------------ */
  /* Délégation d'événements                                            */
  /* ------------------------------------------------------------------ */
  function onRootClick(e) {
    var actEl = e.target.closest && e.target.closest('[data-czd-act]');
    if (actEl) {
      var act = actEl.getAttribute('data-czd-act');
      if (ACTIONS[act]) {
        e.preventDefault();
        ACTIONS[act](actEl, actEl.dataset);
        return;
      }
    }
    var tab = e.target.closest && e.target.closest('[data-czd-tab]');
    if (tab) { e.preventDefault(); setTab(tab.getAttribute('data-czd-tab')); return; }
    var preset = e.target.closest && e.target.closest('[data-czd-preset]');
    if (preset) { e.preventDefault(); applyPreset(preset.getAttribute('data-czd-preset')); return; }
    var lang = e.target.closest && e.target.closest('[data-czd-lang]');
    if (lang) { e.preventDefault(); switchLang(lang.getAttribute('data-czd-lang')); return; }
    var child = e.target.closest && e.target.closest('[data-czd-child]');
    if (child) { e.preventDefault(); state.activeChild = child.getAttribute('data-czd-child'); paint('family'); save(); return; }
    var group = e.target.closest && e.target.closest('[data-czd-group]');
    if (group) {
      e.preventDefault();
      var list = state.childDiversity[state.activeChild] || [];
      var g = group.getAttribute('data-czd-group');
      var idx = list.indexOf(g);
      if (idx === -1) list.push(g); else list.splice(idx, 1);
      state.childDiversity[state.activeChild] = list;
      paint('family');
      save();
      return;
    }
    var dbtn = e.target.closest && e.target.closest('[data-czd-day]');
    if (dbtn && dbtn.classList.contains('czd-day')) {
      state.activeDay = Number(dbtn.getAttribute('data-czd-day')) || 0;
      paint('plan');
      return;
    }
  }

  function onRootChange(e) {
    var el = e.target;
    var key = el && el.getAttribute && el.getAttribute('data-czd-input');
    if (!key) return;
    if (key === 'goal' || key === 'country' || key === 'activity' || key === 'sex' || key === 'glucoseUnit') {
      state.profile[key] = el.value;
      state._builtSeed = null;
      compute();
      paint('all');
      if (key === 'goal') toast(t('czd.toast.goal', { v: t('czd.goal.' + el.value) }));
      return;
    }
  }

  function onRootInput(e) {
    var el = e.target;
    var key = el && el.getAttribute && el.getAttribute('data-czd-input');
    if (!key) return;
    if (['goal', 'country', 'activity', 'sex', 'glucoseUnit'].indexOf(key) !== -1) return;
    lastInput = el;
    lastInputAt = Date.now();
    var v = parseFloat(el.value);
    if (isNaN(v)) return;
    state.profile[key] = v;
    if (key === 'glucose' && (state.profile.glucoseUnit || 'mmol') === 'mgdl') {
      state.profile.glucose = v; /* stocké en mg/dL, converti par le modèle */
    }
    state._builtSeed = null;
    clearTimeout(el._czdT);
    el._czdT = setTimeout(function () {
      compute();
      paint('overview');
      paintClinicalDerived();
      save();
    }, 140);
  }

  function onKeydown(e) {
    /* Navigation clavier des onglets principaux. */
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-czd-tab')) {
      var order = ['overview', 'plan', 'clinical', 'family'];
      var i = order.indexOf(e.target.getAttribute('data-czd-tab'));
      var next = null;
      if (e.key === 'ArrowRight') next = order[(i + 1) % order.length];
      if (e.key === 'ArrowLeft') next = order[(i - 1 + order.length) % order.length];
      if (e.key === 'Home') next = order[0];
      if (e.key === 'End') next = order[order.length - 1];
      if (next) {
        e.preventDefault();
        setTab(next);
        var btn = q('[data-czd-tab="' + next + '"]');
        if (btn) btn.focus();
      }
    }
    if (e.key === 'Escape' && modalOpen) {
      e.preventDefault();
      closeModal();
    }
  }

  function switchLang(lang) {
    I18N.setLang(lang);
    /* Aligne la plateforme pour que le reste de la vitrine suive le choix. */
    try {
      if (global.NUTRI_I18N && global.NUTRI_I18N.setLocale) global.NUTRI_I18N.setLocale(lang, false);
      var sel = document.getElementById('language');
      if (sel && sel.value !== lang) sel.value = lang;
    } catch (e) {}
    compute();
    renderAll();
    toast(I18N.lang === 'fr' ? 'Interface en français' : 'Interface in English');
  }

  /* ------------------------------------------------------------------ */
  /* Montage                                                            */
  /* ------------------------------------------------------------------ */
  function mount(force) {
    section = document.getElementById('citizen');
    if (!section) return false;
    root = document.getElementById('czdRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'czdRoot';
      root.className = 'czd-root';
      root.setAttribute('data-czd-noscan', '');
      section.appendChild(root);
    }
    /* Montage idempotent : un second appel ne doit jamais réinitialiser l'état
       en cours de session (le module peut être rappelé par la sécurité de boot). */
    if (!force && state && root.querySelector('.czd-hero')) {
      hideLegacy();
      bind();
      markReady();
      return true;
    }
    hideLegacy();
    state = load();
    state.baseline = { profile: clone(state.profile), habits: clone(state.habits) };
    compute();
    renderAll();
    bind();
    /* Le contenu historique (famille, KPI, formulaires) est conservé dans le
       DOM — d'autres scripts (v39/v44/v45) l'interrogent — mais masqué. */
    later(hideLegacy, 600);
    later(hideLegacy, 1800);
    markReady();
    return true;
  }

  function hideLegacy() {
    if (!section || !root) return;
    Array.prototype.forEach.call(section.children, function (child) {
      if (child === root) return;
      if (child.tagName === 'NOSCRIPT') return;
      if (!child.hasAttribute('data-czd-legacy')) child.setAttribute('data-czd-legacy', '');
    });
  }

  var wasVisible = false;
  var visibilityWatch = null;

  /* Rejoue les animations quand la section devient visible : le module est
     rendu au chargement alors que #citizen est encore masquée. */
  function watchVisibility() {
    if (!root || visibilityWatch) return;
    if (typeof global.IntersectionObserver === 'function') {
      visibilityWatch = new global.IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !wasVisible) {
            wasVisible = true;
            C.resetAnimation(root);
            C.animate(root);
            moveInk();
          } else if (!en.isIntersecting) {
            wasVisible = false;
          }
        });
      }, { threshold: 0.02 });
      visibilityWatch.observe(root);
    } else {
      document.addEventListener('click', function () {
        setTimeout(function () {
          if (root && root.offsetParent !== null) {
            C.resetAnimation(root);
            C.animate(root);
            moveInk();
          }
        }, 90);
      }, true);
    }
    /* Recentrage de l'encre des onglets au redimensionnement du module. */
    if (typeof global.ResizeObserver === 'function') {
      var ro = new global.ResizeObserver(function () { moveInk(); });
      ro.observe(root);
    }
  }

  function bindCountry() {
    var sel = document.getElementById('country');
    if (!sel) return;
    var apply = function () {
      if (sel.value && sel.value !== state.profile.country) {
        state.profile.country = sel.value;
        state._builtSeed = null;
        compute();
        if (root) { paint('overview'); paint('plan'); }
        save();
      }
    };
    sel.addEventListener('change', function () { setTimeout(apply, 60); });
    apply();
  }

  function bind() {
    if (bound) return;
    bound = true;
    watchVisibility();
    bindCountry();
    root.addEventListener('click', onRootClick);
    root.addEventListener('change', onRootChange);
    root.addEventListener('input', onRootInput);
    root.addEventListener('keydown', onKeydown);
    /* Recalcul de l'encre au redimensionnement. */
    global.addEventListener('resize', function () { moveInk(); });
    /* Suivi de la langue de la plateforme. */
    document.addEventListener('nutri:i18nChanged', function () {
      clearTimeout(global.__czdLangT);
      global.__czdLangT = setTimeout(function () {
        if (I18N.syncFromPlatform()) {
          compute();
          renderAll();
        }
      }, 120);
    });
  }

  function markReady() {
    section.classList.add('czd-ready');
  }

  /* ------------------------------------------------------------------ */
  /* API publique (compatibilité avec les boutons historiques)          */
  /* ------------------------------------------------------------------ */
  function ensureState() {
    if (!state) state = load();
    if (!state.plan) compute();
    return state;
  }

  global.NUTRI_CITIZEN = {
    mount: mount,
    render: function () { if (!root) { mount(); return; } compute(); renderAll(); },
    setTab: setTab,
    setProfile: function (patch) {
      ensureState();
      Object.assign(state.profile, patch || {});
      state._builtSeed = null;
      compute();
      if (root) paint('all');
      return state.profile;
    },
    getProfile: function () { return ensureState().profile; },
    getState: function () { return ensureState(); },
    toast: toast
  };

  if (typeof global.updateReferences !== 'function') {
    global.updateReferences = function () { global.NUTRI_CITIZEN.render(); };
  }
  if (typeof global.saveCitizen !== 'function') {
    global.saveCitizen = function () {
      ensureState();
      save();
      if (root) paint('clinical');
      toast(t('czd.clin.saved'));
    };
  }
  if (typeof global.generateRecommendations !== 'function') {
    global.generateRecommendations = function () {
      ensureState();
      state.planSeed += 1;
      state._builtSeed = null;
      compute();
      if (root) { paint('all'); setTab('plan'); }
      toast(t('czd.plan.generated'));
    };
  }
  if (typeof global.loadFamilyChildDashboard !== 'function') {
    global.loadFamilyChildDashboard = function (id) {
      ensureState();
      var el = document.getElementById('familyMember');
      var key = id || (el && el.value) || state.activeChild;
      if (D.CHILD_REFS[key]) state.activeChild = key;
      if (root) { paint('family'); setTab('family'); }
    };
  }
  if (typeof global.requestChildAccess !== 'function') {
    global.requestChildAccess = function () {
      ensureState();
      state.familyAccess = true;
      if (root) paint('family');
      save();
      toast(t('czd.family.requested'));
    };
  }
  if (typeof global.openChildNutritionPlan !== 'function') {
    global.openChildNutritionPlan = function () {
      ensureState();
      if (root) setTab('plan');
      toast(t('czd.family.plan.done'));
    };
  }

  /* Boot : après le reste de la page pour ne masquer que le legacy complet. */
  function boot() {
    if (!mount()) {
      setTimeout(function () { mount(); }, 500);
      return;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 60); });
  } else {
    setTimeout(boot, 60);
  }
  /* Filet de sécurité (modules dynamiques / navigation par hash). */
  setTimeout(function () { if (!root || !root.firstElementChild) boot(); }, 1400);
})(window);
