/* ============================================================================
   NUTRI.N°1 — CITIZEN 360 · contrôleur
   ----------------------------------------------------------------------------
   Monte le dashboard premium dans un Shadow DOM isolé, assemble données →
   modèle → graphiques → gabarits, et gère toutes les interactions par
   délégation d'événements.

   Compatibilité plateforme
     · Suit la langue (nutri:i18nChanged, #language) et le pays (#country,
       nutri:countryChanged) sans toucher aux autres vues.
     · Fournit un bouclier pour les couches V39/V44/V45 (voir host CSS).
     · Re-route les anciens globals saveCitizen / generateRecommendations /
       loadFamilyChildDashboard vers ce module.
   ========================================================================== */
(function (global) {
  'use strict';

  var D = global.C360_DATA;
  var I = global.C360_I18N;
  var M = global.C360_MODEL;
  var C = global.C360_CHARTS;
  var T = global.C360_TEMPLATE;

  if (!D || !I || !M || !C || !T) {
    if (global.console) global.console.warn('[C360] dépendances manquantes');
    return;
  }

  var CSS_HREF = 'components/citizen-360/citizen-360.css';
  var host = document.getElementById('citizen360');
  if (!host) return;
  if (host.shadowRoot || host.dataset.c360Mounted === '1') return;
  host.dataset.c360Mounted = '1';

  var shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<link rel="stylesheet" href="' + CSS_HREF + '"><div data-c360-mount></div>';
  var mount = shadow.querySelector('[data-c360-mount]');
  var SECTION = host.closest('section') || host.parentElement;

  var state = null;
  var booted = false;
  var toastTimers = [];

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function $(sel) { return shadow.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(shadow.querySelectorAll(sel)); }
  function t(k, p) { return I.t(k, p); }
  function loc(o) { return I.loc(o); }

  function timeLabel() {
    try {
      return new Intl.DateTimeFormat(state && state.lang === 'fr' ? 'fr-FR' : 'en-US', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      }).format(new Date());
    } catch (e) { return new Date().toLocaleString(); }
  }

  function countryInfo() {
    var code = 'TG', label = '';
    try {
      var sel = document.getElementById('country');
      if (sel && sel.value) code = String(sel.value).toUpperCase();
      if (sel && sel.options && sel.selectedIndex >= 0) label = sel.options[sel.selectedIndex].textContent.trim();
    } catch (e) { /* repli */ }
    if (!label) label = loc(M.localForCountry(code).country);
    return { code: code, label: label };
  }

  function freshState() {
    var c = countryInfo();
    return {
      lang: I.lang,
      period: 30,
      revision: 0,
      country: c.code,
      countryLabel: c.label,
      measures: clone(D.baseMeasures),
      activeSeries: ['weight', 'glucose', 'systolic', 'diversity'],
      child: 'child1',
      updatedLabel: '',
      series: null,
      hydration: null,
      score: 0,
      scoreRings: [],
      scoreLabel: ''
    };
  }

  function refreshState() {
    if (!state) return;
    state.lang = I.lang;
    state.series = D.series(state.period, state.revision);
    state.hydration = D.hydration(state.revision);
    state.score = M.nutritionScore(state.measures, state.series);
    state.scoreRings = M.scoreBreakdown(state.score, state.series);
    state.scoreLabel = M.scoreLabel(state.score, state.lang);
    state.updatedLabel = timeLabel();
  }

  /* -------------------------------------------------------------- rendu */
  function render() {
    if (!state || !mount) return;
    refreshState();
    mount.innerHTML = T.shell(state);
    var root = $('[data-c360-root]');
    if (root && sectionVisible()) root.classList.add('is-visible');
    try { C.activate(mount); } catch (e) {
      if (global.console) global.console.warn('[C360] tooltips', e);
    }
  }

  function sectionVisible() {
    if (!SECTION || !SECTION.classList) return true;
    return SECTION.classList.contains('on');
  }

  function onSectionVisible() {
    if (!sectionVisible()) return;
    var root = $('[data-c360-root]');
    if (root) root.classList.add('is-visible');
    syncLocale(true);
    syncCountry(true);
  }

  /* -------------------------------------------------------------- toast */
  function toast(key) {
    var box = $('[data-c360-toasts]');
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'c360-toast';
    el.textContent = t(key);
    box.appendChild(el);
    var timer = setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, 2500);
    toastTimers.push(timer);
  }

  /* ------------------------------------------- calculs dérivés du formulaire */
  function statusText(status) { return t('section.measure.status.' + status); }

  function setCalc(name, value, unit, status) {
    var item = $('[data-c360-calc="' + name + '"]');
    if (!item) return;
    var b = item.querySelector('[data-c360-calc-value]');
    var s = item.querySelector('[data-c360-calc-status]');
    if (b) b.innerHTML = M.esc(value) + (unit ? ' <small style="font-size:10px;color:var(--c360-faint)">' + M.esc(unit) + '</small>' : '');
    if (s) {
      s.className = 'is-' + status;
      s.textContent = statusText(status);
    }
  }

  function updateDerived() {
    var m = state.measures;
    var b = M.bmi(m.weight, m.height);
    var wh = M.whtr(m.waist, m.height);
    var mp = M.mapPressure(m.systolic, m.diastolic);
    var wr = M.whr(m.waist, m.hip);
    var lang = state.lang;
    setCalc('bmi', b == null ? '—' : M.fmt(b, 1, lang), 'kg/m²', M.bmiStatus(b, m.profile));
    setCalc('whtr', wh == null ? '—' : M.fmt(wh, 2, lang), '', wh == null ? 'unknown' : (wh <= .5 ? 'good' : wh <= .58 ? 'watch' : 'high'));
    setCalc('map', mp == null ? '—' : M.fmt(mp, 0, lang), 'mmHg', M.bpStatus(m.systolic, m.diastolic));
    setCalc('whr', wr == null ? '—' : M.fmt(wr, 2, lang), '', wr == null ? 'unknown' : (wr <= .85 ? 'good' : wr <= .95 ? 'watch' : 'high'));

    var score = M.nutritionScore(m, state.series);
    var tag = $('.c360-form-actions .c360-tag');
    if (tag) tag.textContent = t('hero.scoreLabel') + ' · ' + M.fmt(score, 0, lang) + '/100';
  }

  function saveMeasures() {
    refreshState();
    render();
    toast('toast.saved');
  }

  /* -------------------------------------------------------------- export */
  function exportCsv() {
    var s = state.series;
    var sep = ';';
    var head = [
      'Date', 'Energie (kcal)', 'Cible (kcal)', 'Poids (kg)', 'Glycemie (mmol/L)',
      'Systolique (mmHg)', 'Diastolique (mmHg)', 'Hydratation (L)', 'Diversite (/100)', 'Assiduite (%)'
    ].join(sep);
    var rows = s.labels.map(function (off, i) {
      return [
        M.dateLabel(off, 'en', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        s.energy[i], s.target[i], s.weight[i], s.glucose[i],
        s.systolic[i], s.diastolic[i], s.hydration[i], s.diversity[i], s.adherence[i]
      ].map(function (v) {
        var str = String(v == null ? '' : v).replace(/"/g, '""');
        return '"' + str + '"';
      }).join(sep);
    });
    var csv = '\ufeff' + head + '\r\n' + rows.join('\r\n');
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'nutri-citizen360-' + state.period + 'd.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('toast.export');
    } catch (e) {
      if (global.console) global.console.warn('[C360] export', e);
      toast('toast.export');
    }
  }

  function printReport() {
    toast('toast.pdf');
    setTimeout(function () { try { global.print(); } catch (e) {} }, 260);
  }

  /* ------------------------------------------------------ synchronisation */
  function syncLocale() {
    if (!state) return;
    /* syncFromPlatform() déclenche I.onChange → render() quand la langue change. */
    I.syncFromPlatform();
    if (state.lang !== I.lang) {
      state.lang = I.lang;
      refreshState();
      render();
    }
  }

  function syncCountry(silent) {
    if (!state) return;
    var c = countryInfo();
    if (c.code !== state.country || c.label !== state.countryLabel) {
      state.country = c.code;
      state.countryLabel = c.label;
      render();
      if (!silent && global.console) global.console.debug('[C360] pays', c.code);
    }
  }

  function watchPlatform() {
    document.addEventListener('nutri:i18nChanged', function () { setTimeout(function () { syncLocale(true); }, 60); });
    document.addEventListener('nutri:countryChanged', function () { setTimeout(function () { syncCountry(true); }, 80); });

    var langSel = document.getElementById('language');
    if (langSel && !langSel.dataset.c360LangWatch) {
      langSel.dataset.c360LangWatch = '1';
      langSel.addEventListener('change', function () { setTimeout(function () { syncLocale(true); }, 140); });
    }
    var countrySel = document.getElementById('country');
    if (countrySel && !countrySel.dataset.c360CountryWatch) {
      countrySel.dataset.c360CountryWatch = '1';
      countrySel.addEventListener('change', function () { setTimeout(function () { syncCountry(true); syncLocale(true); }, 140); });
    }
  }

  /* ------------------------------------------------------------ événements */
  function onClick(e) {
    var periodBtn = e.target.closest('[data-c360-period]');
    if (periodBtn) {
      var p = Number(periodBtn.getAttribute('data-c360-period'));
      if (D.periods.indexOf(p) >= 0 && p !== state.period) {
        state.period = p;
        render();
      }
      return;
    }

    var langBtn = e.target.closest('[data-c360-lang]');
    if (langBtn) {
      I.setLang(langBtn.getAttribute('data-c360-lang'));
      return;
    }

    var seriesBtn = e.target.closest('[data-series]');
    if (seriesBtn) {
      var key = seriesBtn.getAttribute('data-series');
      var idx = state.activeSeries.indexOf(key);
      if (idx >= 0) {
        if (state.activeSeries.length > 1) state.activeSeries.splice(idx, 1);
      } else {
        state.activeSeries.push(key);
      }
      render();
      return;
    }

    var actionEl = e.target.closest('[data-c360-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-c360-action');
    switch (action) {
      case 'refresh':
        state.revision += 1;
        render();
        toast('toast.refresh');
        break;
      case 'export-csv': exportCsv(); break;
      case 'export-pdf': printReport(); break;
      case 'print': toast('toast.print'); setTimeout(function () { try { global.print(); } catch (e2) {} }, 200); break;
      case 'save': saveMeasures(); break;
      case 'plan': toast('toast.plan'); break;
      case 'consult': toast('toast.consult'); break;
      case 'add-meal': toast('toast.mealAdded'); break;
      case 'family-access': toast('toast.familyAccess'); break;
      case 'family-plan': toast('toast.familyPlan'); break;
      case 'rec': toast('toast.plan'); break;
      default: break;
    }
  }

  function onChange(e) {
    var childSel = e.target.closest('[data-c360-child]');
    if (childSel) {
      state.child = childSel.value;
      render();
      return;
    }
    var field = e.target.closest('[data-c360-field]');
    if (field && field.getAttribute('data-c360-field') === 'profile') {
      state.measures.profile = field.value;
      updateDerived();
    }
  }

  function onInput(e) {
    var field = e.target.closest('[data-c360-field]');
    if (!field) return;
    var name = field.getAttribute('data-c360-field');
    if (name === 'profile') return;
    var value = field.value === '' ? null : Number(field.value);
    if (value != null && isNaN(value)) return;
    state.measures[name] = value;
    updateDerived();
  }

  function bind() {
    shadow.addEventListener('click', onClick);
    shadow.addEventListener('change', onChange);
    shadow.addEventListener('input', onInput);

    I.onChange(function (lang) {
      state.lang = lang;
      refreshState();
      render();
    });

    watchPlatform();

    if (SECTION && SECTION.classList && global.MutationObserver) {
      var vis = new MutationObserver(function () { onSectionVisible(); });
      vis.observe(SECTION, { attributes: true, attributeFilter: ['class'] });
    }

    /* La plateforme initialise pays/langues après nous : deux rafraîchissements
       tardifs garantissent un libellé et une langue exacts au premier rendu. */
    setTimeout(function () { syncLocale(true); }, 900);
    setTimeout(function () { syncCountry(true); }, 1300);
  }

  /* --------------------------------------------------- compatibilité V50 */
  function legacyBridge() {
    global.saveCitizen = function () { saveMeasures(); };
    global.generateRecommendations = function () { toast('toast.plan'); };
    global.requestChildAccess = function () { toast('toast.familyAccess'); };
    global.openChildNutritionPlan = function () { toast('toast.familyPlan'); };
    global.loadFamilyChildDashboard = function () { if (SECTION) SECTION.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

    global.Citizen360 = {
      version: D.version,
      get state() { return state; },
      get root() { return shadow; },
      render: render,
      refresh: function () { state.revision += 1; render(); },
      exportCsv: exportCsv,
      setPeriod: function (p) { if (D.periods.indexOf(p) >= 0) { state.period = p; render(); } },
      setLanguage: function (l) { I.setLang(l); },
      setCountry: function (code) {
        state.country = String(code).toUpperCase();
        state.countryLabel = loc(M.localForCountry(state.country).country);
        render();
      },
      save: saveMeasures,
      toast: toast
    };
  }

  /* -------------------------------------------------------------- boot */
  function boot() {
    if (booted) return;
    booted = true;
    I.boot();
    state = freshState();
    refreshState();
    render();
    bind();
    legacyBridge();
    onSectionVisible();
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  } catch (err) {
    if (global.console) global.console.error('[C360] initialisation', err);
  }
})(window);
