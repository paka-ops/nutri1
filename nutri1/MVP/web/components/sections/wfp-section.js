/* ============================================================================
 * WFP NutriTracker · wfp-section.js
 * Fichier : components/sections/wfp-section.js
 * Rôle    : Composant de section wfp — extrait de index.html pour alléger la
 *           page principale. Injecte le HTML de la section (tableau de bord
 *           Shadow DOM + modules historiques) et expose les fonctions de rendu
 *           globales attendues par index.html (renderWFP).
 *           Langue : FR (source) ↔ EN via components/i18n/sections-i18n.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const I18N = global.NutriSectionsI18N;

  /* ------------------------------------------------------------------ */
  /* Gabarit HTML de la section                                          */
  /* ------------------------------------------------------------------ */
  const HTML = `
<!-- WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest — composant autonome (Shadow DOM).
     Code : components/wfp-nutritracker/ · les modules WFP Food Security ci-dessous restent dans le DOM (masqués). -->
<wfp-nutritracker-dashboard id="wfpNutriTracker" aria-label="WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest"></wfp-nutritracker-dashboard>
  <div class="hero institution-hero"><span class="pill">WFP • FOOD SECURITY & NUTRITION</span>
  <h1>🍚 WFP Food Security Intelligence Center</h1>
  <p>Localized intelligence connecting food access, markets, vulnerability, nutrition, climate shocks and program impact — complementary to existing WFP global systems.</p></div>
  <div class="card"><div class="section-head"><div><h2>🌍 Country & Food Security Explorer</h2><p class="muted">Explore food-security indicators by country and geography.</p></div>
  <div class="institution-filters"><label>Country<select id="wfpCountry" onchange="renderWFP()"></select></label><label>Level<select id="wfpLevel" onchange="renderWFP()"><option>National</option><option>Region</option><option>District</option><option>Market</option></select></label><label>Year<select id="wfpYear" onchange="renderWFP()"><option>2026</option><option>2025</option><option>2024</option><option>2023</option></select></label></div></div></div>
  <div class="institution-kpis">
    <div class="card inst-kpi"><span>Food Security Risk</span><b id="wfpRisk">—</b></div>
    <div class="card inst-kpi"><span>Healthy Diet Affordability</span><b id="wfpAfford">—</b></div>
    <div class="card inst-kpi"><span>Dietary Diversity</span><b id="wfpDiversity">—</b></div>
    <div class="card inst-kpi"><span>Price Pressure</span><b id="wfpPrice">—</b></div>
    <div class="card inst-kpi"><span>Nutrition Risk</span><b id="wfpNutrition">—</b></div>
  </div>
  <div class="grid3">
    <div class="card"><h3>🚨 Food Security Early Warning</h3><div id="wfpEarly"></div></div>
    <div class="card"><h3>💰 Food Price & Access</h3><div id="wfpMarket"></div></div>
    <div class="card"><h3>🥗 Food Consumption & Nutrition</h3><div id="wfpDiet"></div></div>
  </div>
  <div class="grid2">
    <div class="card"><h3>🏫 School Feeding & Local Procurement</h3><div id="wfpSchool"></div></div>
    <div class="card"><h3>🌦️ Climate → Food Security Risk</h3><div id="wfpClimate"></div></div>
  </div>
  <div class="card"><h3>🗺️ Vulnerability & Priority Intervention Map</h3><div class="gis-demo" id="wfpGIS"></div></div>
  <div class="card"><h3>📊 WFP Program Impact Engine</h3><div id="wfpImpact"></div></div>
  <div class="card"><h3>📦 WFP Data Products</h3>
  <table><tr><th>Product</th><th>Data generated</th><th>Operational use</th></tr>
  <tr><td>Household Food Security Monitor</td><td>Consumption, diversity, access, coping</td><td>Vulnerability targeting</td></tr>
  <tr><td>Food Price Intelligence</td><td>Prices, availability, anomalies</td><td>Market monitoring</td></tr>
  <tr><td>Healthy Diet Affordability</td><td>Food basket cost + access gap</td><td>Program design</td></tr>
  <tr><td>School Feeding Intelligence</td><td>Meals, quality, local sourcing, waste</td><td>School meal optimization</td></tr>
  <tr><td>Climate Food-Security Early Warning</td><td>Shock signals + localized risk</td><td>Early action</td></tr>
  <tr><td>Intervention Impact</td><td>Baseline, follow-up, outcomes</td><td>Evaluation & scale-up</td></tr>
  </table></div>
`;

  class WfpSection extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      this.innerHTML = HTML;
      if (I18N) I18N.translateTree(this);
    }
  }
  if (!customElements.get('wfp-section')) customElements.define('wfp-section', WfpSection);

  /* Libellés bilingues FR/EN des éléments <dashboard> (aria-label) */
  const ARIACode = {'wfpNutriTracker': {'fr': 'WFP NutriTracker · Surveillance Communautaire Afrique de l’Ouest', 'en': 'WFP NutriTracker · West Africa Community Surveillance'}};
  function syncAria() {
    if (!I18N) return;
    const fr = I18N.getLang() !== 'en';
    Object.keys(ARIACode).forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute('aria-label', fr ? ARIACode[sel].fr : ARIACode[sel].en);
    });
  }
  if (I18N) { I18N.onChange(syncAria); syncAria(); }


  /* ------------------------------------------------------------------ */
  /* Modules WFP Food Security historiques (déplacés depuis index.html)  */
  /* ------------------------------------------------------------------ */
  function renderWFP(){
 const c=document.getElementById('wfpCountry')?.value||'TG',m=demoCountryMetrics[c]||demoCountryMetrics.default;
 const risk=Math.min(95,Math.round((m.obesity+m.diabetes+m.hypertension)*1.15));
 const afford=Math.max(28,Math.round(100-m.obesity*1.2-m.diabetes*.5));
 const diversity=Math.max(35,Math.round(82-m.obesity*.7));
 const price=Math.min(95,Math.round(28+m.obesity*.9));
 const nutr=Math.min(95,Math.round((m.stunting||18)*1.5));
 document.getElementById('wfpRisk').textContent=risk+' / 100';
 document.getElementById('wfpAfford').textContent=afford+' / 100';
 document.getElementById('wfpDiversity').textContent=diversity+' / 100';
 document.getElementById('wfpPrice').textContent=price+' / 100';
 document.getElementById('wfpNutrition').textContent=nutr+' / 100';
 document.getElementById('wfpEarly').innerHTML=`<div class="risk-row"><span>Overall signal</span><b>${risk>70?'🔴 High':'🟠 Monitor'}</b></div><div class="risk-row"><span>Price anomaly</span><b>${price>65?'Detected':'Stable'}</b></div><div class="risk-row"><span>Climate shock</span><b>Watch</b></div>`;
 document.getElementById('wfpMarket').innerHTML=`<div class="risk-row"><span>Healthy diet affordability</span><b>${afford}/100</b></div><div class="risk-row"><span>Market availability</span><b>Monitored</b></div><div class="risk-row"><span>Price trend</span><b>${price>60?'Rising':'Stable'}</b></div>`;
 document.getElementById('wfpDiet').innerHTML=`<div class="risk-row"><span>Dietary diversity</span><b>${diversity}/100</b></div><div class="risk-row"><span>Food consumption</span><b>Monitored</b></div><div class="risk-row"><span>Nutrition risk</span><b>${nutr}/100</b></div>`;
 document.getElementById('wfpSchool').innerHTML=`<div class="risk-row"><span>Meals tracked</span><b>Active</b></div><div class="risk-row"><span>Local procurement</span><b>Opportunities mapped</b></div><div class="risk-row"><span>Meal quality</span><b>Scored</b></div>`;
 document.getElementById('wfpClimate').innerHTML=`<div class="risk-row"><span>Production shock</span><b>Monitored</b></div><div class="risk-row"><span>Food-price transmission</span><b>Analyzed</b></div><div class="risk-row"><span>Early action signal</span><b>${risk>70?'Priority':'Watch'}</b></div>`;
 document.getElementById('wfpGIS').innerHTML=`<div class="map"><span class="pin" style="left:16%;top:42%">Priority A</span><span class="pin" style="left:48%;top:25%">Market B</span><span class="pin" style="left:71%;top:58%">Nutrition C</span></div>`;
 document.getElementById('wfpImpact').innerHTML=`<div class="grid3"><div class="reference good"><b>Baseline</b><br>Food security indicators established</div><div class="reference info"><b>Follow-up</b><br>Consumption and access tracked</div><div class="reference warn"><b>Outcome</b><br>Program impact calculated</div></div>`;
}

  global.renderWFP = renderWFP;
})(window);
