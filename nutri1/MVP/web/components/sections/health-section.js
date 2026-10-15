/* ============================================================================
 * NutriApp Santé · health-section.js
 * Fichier : components/sections/health-section.js
 * Rôle    : Composant de section health — extrait de index.html pour alléger la
 *           page principale. Injecte le HTML de la section (tableau de bord
 *           Shadow DOM + modules historiques) et expose les fonctions de rendu
 *           globales attendues par index.html (—).
 *           Langue : FR (source) ↔ EN via components/i18n/sections-i18n.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const I18N = global.NutriSectionsI18N;

  /* ------------------------------------------------------------------ */
  /* Gabarit HTML de la section                                          */
  /* ------------------------------------------------------------------ */
  const HTML = `
<!-- NutriApp Santé · Surveillance Nutritionnelle Clinique, Communautaire & MNT — composant autonome (Shadow DOM).
     Code : components/health-nutriapp/ · les modules Santé historiques ci-dessous restent dans le DOM (masqués). -->
<health-nutriapp-dashboard id="healthNutriApp" aria-label="NutriApp Santé · Surveillance Nutritionnelle Clinique, Communautaire et Maladies Chroniques"></health-nutriapp-dashboard>
<div class="card"><h2 data-i18n="ui.ministry_of_health_command_center">🏥 Ministry of Health Command Center</h2><div class="grid"><div class="card">Children<div class="metric">—</div><span class="pill" data-i18n="ui.double_burden">double burden</span></div><div class="card">Pregnant women<div class="metric">—</div></div><div class="card">Lactating women<div class="metric">—</div></div><div class="card">NCDs<div class="metric">—</div></div></div>
<div class="grid2"><div class="card"><h3 data-i18n="ui.children_double_burden">Children — double burden</h3><div class="chart"><canvas id="hChildren"></canvas></div></div><div class="card"><h3 data-i18n="ui.pregnant_lactating_women">Pregnant & lactating women</h3><div class="chart"><canvas id="hWomen"></canvas></div></div></div>
<div class="grid2"><div class="card"><h3 data-i18n="ui.ncd_trends">NCD trends</h3><div class="chart"><canvas id="hNcd"></canvas></div></div><div class="card"><h3 data-i18n="ui.health_gis">Health GIS</h3><div class="map"><span class="pin" style="left:15%;top:40%" data-i18n="ui.region_a">Region A</span><span class="pin" style="left:48%;top:23%" data-i18n="ui.region_b">Region B</span><span class="pin" style="left:70%;top:55%" data-i18n="ui.region_c">Region C</span></div></div></div>
<div class="card"><h3 data-i18n="ui.priority_ncd_modules">Priority NCD modules</h3><div class="grid3"><div data-i18n="ui.diabetes_2">🩸 Diabetes</div><div data-i18n="ui.hypertension_2">❤️ Hypertension</div><div data-i18n="ui.cardiovascular_disease_2">🫀 Cardiovascular disease</div><div data-i18n="ui.cancers">🎗 Cancers</div><div data-i18n="ui.kidney_disease_2">🫘 Kidney disease</div><div data-i18n="ui.other_priority_ncds">➕ Other priority NCDs</div></div></div></div>
<div class="card institutional-module">
  <div class="section-head"><div><h2>🩺 Nutrition → NCD Intelligence</h2><p class="muted">Population and service intelligence focused on diet-related noncommunicable diseases.</p></div><span class="pill">MINISTRY OF HEALTH</span></div>
  <div class="module-grid">
    <div><b>🩸 Diabetes Prevention</b><span>Food quality, physical activity, BMI, glucose/HbA1c where available, follow-up and trends.</span></div>
    <div><b>❤️ Hypertension & CVD</b><span>Blood pressure, sodium exposure, weight, activity and cardiovascular risk factors.</span></div>
    <div><b>🍬 Sugar Intelligence</b><span>Estimated free-sugar exposure, sweetened beverages and population trends.</span></div>
    <div><b>🧂 Sodium Intelligence</b><span>Estimated sodium exposure, food sources and reduction-program monitoring.</span></div>
    <div><b>⚖️ Obesity Observatory</b><span>Overweight, obesity, waist circumference, dietary patterns and activity.</span></div>
    <div><b>📱 Screening & Follow-up</b><span>Campaign collection, professional review, referral and longitudinal monitoring.</span></div>
    <div><b>🚨 NCD Early Warning</b><span>Emerging dietary and metabolic risk signals for investigation and public-health action.</span></div>
    <div><b>📈 Intervention Impact</b><span>Baseline → intervention → follow-up → outcome reporting for prevention programs.</span></div>
  </div>
</div>
<div class="card"><h3>📦 Ministry of Health Data Products</h3>
<table><tr><th>Product</th><th>Primary output</th><th>Decision use</th></tr>
<tr><td>National Nutrition & NCD Observatory</td><td>Risk-factor trends + GIS</td><td>National planning</td></tr>
<tr><td>Diabetes & Hypertension Monitor</td><td>Control/follow-up indicators</td><td>Care improvement</td></tr>
<tr><td>Food-NCD Risk Engine</td><td>Dietary risk profiles</td><td>Prevention targeting</td></tr>
<tr><td>Screening Campaign Platform</td><td>Aggregated screening intelligence</td><td>Campaign management</td></tr>
<tr><td>Prevention Impact Engine</td><td>Before/after outcomes</td><td>Program evaluation</td></tr>
</table></div>
`;

  class HealthSection extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      this.innerHTML = HTML;
      if (I18N) I18N.translateTree(this);
    }
  }
  if (!customElements.get('health-section')) customElements.define('health-section', HealthSection);

  /* Libellés bilingues FR/EN des éléments <dashboard> (aria-label) */
  const ARIACode = {'healthNutriApp': {'fr': 'NutriApp Santé · Surveillance Nutritionnelle Clinique, Communautaire et Maladies Chroniques', 'en': 'NutriApp Health · Clinical, Community and Chronic Disease Nutrition Surveillance'}};
  function syncAria() {
    if (!I18N) return;
    const fr = I18N.getLang() !== 'en';
    Object.keys(ARIACode).forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute('aria-label', fr ? ARIACode[sel].fr : ARIACode[sel].en);
    });
  }
  if (I18N) { I18N.onChange(syncAria); syncAria(); }


})(window);
