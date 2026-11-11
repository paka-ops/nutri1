/* ==========================================================================
   NUTRI.N°1 — Shared sample indicators
   The illustrative country values of the original prototype (demoCountryMetrics),
   used by the institution views (Ministry of Health, UNICEF, …).

   These are NOT official statistics. Six countries have their own sample values;
   every other country falls back to one placeholder set.

   Severity classes (written from memory; check against the current WHO/UNICEF
   publications before real use):
     stunting, children under 5 : <2.5 very low · <10 low · <20 medium · <30 high · ≥30 very high
     wasting,  children under 5 : <2.5 very low · <5 low  · <10 medium · <15 high · ≥15 very high
     anaemia (public-health problem) : <5 none · <20 mild · <40 moderate · ≥40 severe
     exclusive breastfeeding : global target of at least 50 %
   ========================================================================== */
(function (global) {
  'use strict';
  var DATA = {
    TG: { stunting: 18, wasting: 7, anaemia: 42, ebf: 58, diabetes: 5.8, hypertension: 27, obesity: 9, cvd: 14, stroke: 4 },
    GH: { stunting: 16, wasting: 6, anaemia: 39, ebf: 55, diabetes: 6.4, hypertension: 29, obesity: 11, cvd: 15, stroke: 5 },
    SN: { stunting: 17, wasting: 5, anaemia: 41, ebf: 57, diabetes: 6.1, hypertension: 26, obesity: 10, cvd: 13, stroke: 4 },
    NG: { stunting: 29, wasting: 8, anaemia: 46, ebf: 32, diabetes: 7.2, hypertension: 31, obesity: 12, cvd: 17, stroke: 6 },
    BF: { stunting: 25, wasting: 9, anaemia: 45, ebf: 47, diabetes: 5.1, hypertension: 24, obesity: 8, cvd: 12, stroke: 4 },
    CI: { stunting: 22, wasting: 7, anaemia: 43, ebf: 50, diabetes: 6.3, hypertension: 28, obesity: 10, cvd: 14, stroke: 5 }
  };
  var PLACEHOLDER = { stunting: 20, wasting: 7, anaemia: 42, ebf: 55, diabetes: 6, hypertension: 27, obesity: 10, cvd: 14, stroke: 5 };
  /* scale: max of the drawn axis + classes [upper bound (exclusive), label key, tone] */
  var SCALES = {
    stunting: { max: 40, cuts: [[2.5, 'verylow', 'good'], [10, 'low', 'good'], [20, 'medium', 'warn'], [30, 'high', 'bad'], [Infinity, 'veryhigh', 'bad']] },
    wasting: { max: 20, cuts: [[2.5, 'verylow', 'good'], [5, 'low', 'good'], [10, 'medium', 'warn'], [15, 'high', 'bad'], [Infinity, 'veryhigh', 'bad']] },
    anaemia: { max: 60, cuts: [[5, 'none', 'good'], [20, 'mild', 'warn'], [40, 'moderate', 'warn'], [Infinity, 'severe', 'bad']] }
  };
  function severity(k, v) {
    if (k === 'ebf') return v >= 50 ? ['ontarget', 'good'] : ['below', 'warn'];
    var s = SCALES[k];
    if (!s) return null;
    for (var i = 0; i < s.cuts.length; i++) if (v < s.cuts[i][0]) return [s.cuts[i][1], s.cuts[i][2]];
    return null;
  }
  global.NutriSampleIndicators = {
    data: DATA, placeholder: PLACEHOLDER, scales: SCALES, severity: severity,
    countries: Object.keys(DATA),
    has: function (c) { return !!DATA[c]; },
    get: function (c) { return DATA[c] || PLACEHOLDER; }
  };
})(window);
