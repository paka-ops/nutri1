/* ============================================================================
   NUTRI.N°1 — CITIZEN 360 · modèle de calcul (fonctions pures)
   ----------------------------------------------------------------------------
   Aucun accès au DOM. Calculs anthropométriques, indices normalisés, score de
   nutrition, formatage FR/EN et sélection d'aliments locaux.
   ⚠️ Indicateurs indicatifs de démonstration : jamais un diagnostic médical.
   ========================================================================== */
(function (global) {
  'use strict';

  var DATA = global.C360_DATA;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function round(v, d) { var p = Math.pow(10, d || 0); return Math.round(v * p) / p; }

  function localeTag(lang) { return lang === 'fr' ? 'fr-FR' : 'en-US'; }

  function fmt(v, decimals, lang) {
    if (v == null || isNaN(Number(v))) return '—';
    return new Intl.NumberFormat(localeTag(lang), {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    }).format(Number(v));
  }

  function dateLabel(offset, lang, opts) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + (offset || 0));
    try {
      return new Intl.DateTimeFormat(localeTag(lang), opts || { day: '2-digit', month: 'short' }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function weekdayLabel(offset, lang) {
    return dateLabel(offset, lang, { weekday: 'short' });
  }

  /* ------------------------------------------------------------ mesures */
  function bmi(weight, height) {
    var w = Number(weight), h = Number(height) / 100;
    if (!w || !h || w <= 0 || h <= 0) return null;
    return w / (h * h);
  }

  function bmiStatus(value, profile) {
    if (value == null) return 'unknown';
    if (profile === 'child') return value < 14 ? 'watch' : value > 21 ? 'watch' : 'good';
    if (value < 18.5) return 'watch';
    if (value < 25) return 'good';
    if (value < 30) return 'watch';
    return 'high';
  }

  function whtr(waist, height) {
    var w = Number(waist), h = Number(height);
    if (!w || !h) return null;
    return w / h;
  }

  function whr(waist, hip) {
    var w = Number(waist), h = Number(hip);
    if (!w || !h) return null;
    return w / h;
  }

  function mapPressure(sys, dia) {
    var s = Number(sys), d = Number(dia);
    if (!s || !d) return null;
    return (s + 2 * d) / 3;
  }

  function bpStatus(sys, dia) {
    var s = Number(sys), d = Number(dia);
    if (!s || !d) return 'unknown';
    if (s >= 140 || d >= 90) return 'high';
    if (s >= 130 || d >= 85) return 'watch';
    return 'good';
  }

  function glucoseStatus(value) {
    var g = Number(value);
    if (!g) return 'unknown';
    if (g < 3.9) return 'watch';
    if (g <= 5.5) return 'good';
    if (g < 7) return 'watch';
    return 'high';
  }

  /* Score composite : anthropométrie + métabolisme + tension + lipides. */
  function nutritionScore(m, series) {
    var b = bmi(m.weight, m.height);
    var adherence = series && series.adherence && series.adherence.length
      ? series.adherence[series.adherence.length - 1] : 86;
    var diversity = series && series.diversity && series.diversity.length
      ? series.diversity[series.diversity.length - 1] : 78;
    var penalty = 0;
    if (b != null) penalty += Math.abs(b - 22) * 2.6;
    penalty += Math.max(0, Number(m.glucose) - 5.5) * 8;
    penalty += Math.max(0, Number(m.hba1c) - 5.7) * 6;
    penalty += Math.max(0, Number(m.systolic) - 120) * .22;
    penalty += Math.max(0, Number(m.diastolic) - 80) * .28;
    penalty += Math.max(0, Number(m.cholesterol) - 5.2) * 3.5;
    var wh = whtr(m.waist, m.height);
    if (wh != null) penalty += Math.max(0, wh - .5) * 90;
    var bonus = (diversity - 70) * .18 + (adherence - 80) * .12;
    return Math.round(clamp(86 - penalty + bonus, 38, 98));
  }

  function scoreBreakdown(score, series) {
    var adherence = series && series.adherence && series.adherence.length
      ? series.adherence[series.adherence.length - 1] : 86;
    var diversity = series && series.diversity && series.diversity.length
      ? series.diversity[series.diversity.length - 1] : 78;
    return [
      { key: 'hero.legend.diet', value: Math.round(clamp(diversity + 4, 0, 100)), color: '#c9ee59' },
      { key: 'hero.legend.metabolic', value: Math.round(clamp(score - 3, 0, 100)), color: '#34d399' },
      { key: 'hero.legend.adherence', value: Math.round(clamp(adherence, 0, 100)), color: '#5cc8ff' }
    ];
  }

  function scoreLabel(score, lang) {
    if (score >= 85) return lang === 'fr' ? 'Excellent' : 'Excellent';
    if (score >= 70) return lang === 'fr' ? 'Solide' : 'Strong';
    if (score >= 55) return lang === 'fr' ? 'À améliorer' : 'Needs work';
    return lang === 'fr' ? 'Prioritaire' : 'Priority';
  }

  /* Normalise une série en indice base 100 pour comparer des unités différentes. */
  function normalize(values) {
    if (!values || !values.length) return [];
    var base = Number(values[0]) || 1;
    return values.map(function (v) { return round((Number(v) / base) * 100, 1); });
  }

  /* Sous-échantillonnage propre pour les graphiques en barres. */
  function energyBars(series, maxBars) {
    var n = series.energy.length;
    var limit = maxBars || 12;
    var step = Math.max(1, Math.ceil(n / limit));
    var out = [];
    for (var i = n - 1; i >= 0; i -= step) {
      out.push({ offset: series.labels[i], parts: series.meals[i], total: series.energy[i] });
    }
    return out.reverse();
  }

  var SERIES_META = {
    weight: { color: '#c9ee59', unit: 'kg', decimals: 1 },
    glucose: { color: '#5cc8ff', unit: 'mmol/L', decimals: 2 },
    systolic: { color: '#a78bfa', unit: 'mmHg', decimals: 0 },
    diversity: { color: '#34d399', unit: '/100', decimals: 0 }
  };

  function clinicalSeries(series, active) {
    return Object.keys(SERIES_META).filter(function (key) {
      return !active || active.indexOf(key) !== -1;
    }).map(function (key) {
      var meta = SERIES_META[key];
      var raw = series[key] || [];
      return {
        key: key,
        color: meta.color,
        unit: meta.unit,
        decimals: meta.decimals,
        latest: raw.length ? raw[raw.length - 1] : null,
        values: normalize(raw)
      };
    });
  }

  function localForCountry(code) {
    if (!code) return DATA.defaultFoods;
    var found = DATA.localFoods[String(code).toUpperCase()];
    if (found) return found;
    var copy = { country: { fr: code, en: code }, items: DATA.defaultFoods.items };
    return copy;
  }

  function countryName(code) {
    try {
      var sel = document.getElementById('country');
      if (sel && sel.value === code && sel.options && sel.selectedIndex >= 0) {
        return sel.options[sel.selectedIndex].textContent;
      }
    } catch (e) { /* repli ci-dessous */ }
    return localForCountry(code).country;
  }

  var MODEL = {
    esc: esc,
    clamp: clamp,
    round: round,
    fmt: fmt,
    dateLabel: dateLabel,
    weekdayLabel: weekdayLabel,
    bmi: bmi,
    bmiStatus: bmiStatus,
    whtr: whtr,
    whr: whr,
    mapPressure: mapPressure,
    bpStatus: bpStatus,
    glucoseStatus: glucoseStatus,
    nutritionScore: nutritionScore,
    scoreBreakdown: scoreBreakdown,
    scoreLabel: scoreLabel,
    normalize: normalize,
    energyBars: energyBars,
    clinicalSeries: clinicalSeries,
    seriesMeta: SERIES_META,
    localForCountry: localForCountry,
    countryName: countryName
  };

  global.C360_MODEL = MODEL;
})(window);
