/* ============================================================================
 * FAO AgriNutriApp · fao-section.js
 * Fichier : components/sections/fao-section.js
 * Rôle    : Composant de section fao — extrait de index.html pour alléger la
 *           page principale. Injecte le HTML de la section (tableau de bord
 *           Shadow DOM + modules historiques) et expose les fonctions de rendu
 *           globales attendues par index.html (renderFAO).
 *           Langue : FR (source) ↔ EN via components/i18n/sections-i18n.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const I18N = global.NutriSectionsI18N;

  /* ------------------------------------------------------------------ */
  /* Gabarit HTML de la section                                          */
  /* ------------------------------------------------------------------ */
  const HTML = `
<h1 hidden>FAO AgriNutriApp · Surveillance des systèmes alimentaires (Afrique de l’Ouest)</h1>
<!-- FAO AgriNutriApp · tableau de bord autonome en Custom Element (Shadow DOM). -->
<fao-nutritracker-dashboard id="faoNutriTracker" aria-label="FAO AgriNutriApp · Surveillance des systèmes alimentaires en Afrique de l’Ouest"></fao-nutritracker-dashboard>
`;

  class FaoSection extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      this.innerHTML = HTML;
      if (I18N) I18N.translateTree(this);
    }
  }
  if (!customElements.get('fao-section')) customElements.define('fao-section', FaoSection);

  /* Libellés bilingues FR/EN des éléments <dashboard> (aria-label) */
  const ARIACode = {'faoNutriTracker': {'fr': 'FAO AgriNutriApp · Surveillance des systèmes alimentaires en Afrique de l’Ouest', 'en': 'FAO AgriNutriApp · Food Systems Surveillance in West Africa'}};
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
  /* Rendu FAO (déplacé depuis index.html ; no-op si modules absents)    */
  /* ------------------------------------------------------------------ */
  function renderFAO(){if(!document.getElementById('faoProduction'))return;const c=document.getElementById('faoCountry')?.value||'TG',m=demoCountryMetrics[c]||demoCountryMetrics.default;const prod=Math.max(55,Math.round(100-m.stunting*.7)),loss=Math.min(35,Math.round(8+m.wasting*.7)),price=Math.min(95,Math.round(35+m.obesity*1.2)),avail=Math.max(45,Math.round(86-m.diabetes*.8)),safety=m.anaemia>44?'Watch':'Stable';document.getElementById('faoProduction').textContent=prod+'/100';document.getElementById('faoLoss').textContent=loss+'%';document.getElementById('faoPrice').textContent=price+'/100';document.getElementById('faoAvailability').textContent=avail+'/100';document.getElementById('faoSafety').textContent=safety;document.getElementById('faoProductionPanel').innerHTML=`<div class="risk-row"><span>Crop forecast</span><b>${prod}/100</b></div><div class="risk-row"><span>Yield monitoring</span><b>Active</b></div><div class="risk-row"><span>Production gap</span><b>${prod<70?'High':'Moderate'}</b></div>`;document.getElementById('faoLossPanel').innerHTML=`<div class="risk-row"><span>Estimated loss signal</span><b>${loss}%</b></div><div class="risk-row"><span>Loss hotspots</span><b>Mapped</b></div><div class="risk-row"><span>Main stages</span><b>Storage · transport · processing</b></div>`;document.getElementById('faoMarketPanel').innerHTML=`<div class="risk-row"><span>Price pressure</span><b>${price}/100</b></div><div class="risk-row"><span>Market availability</span><b>Monitored</b></div><div class="risk-row"><span>Anomaly detection</span><b>${price>60?'Triggered':'Stable'}</b></div>`;document.getElementById('faoNutritionPanel').innerHTML=`<div class="risk-row"><span>Diverse food availability</span><b>${avail}/100</b></div><div class="risk-row"><span>Biofortified crops</span><b>Tracked</b></div><div class="risk-row"><span>Healthy food basket</span><b>Modeled</b></div>`;document.getElementById('faoSafetyPanel').innerHTML=`<div class="risk-row"><span>Laboratory results</span><b>Integrated</b></div><div class="risk-row"><span>Aflatoxin / microbiology</span><b>Monitored</b></div><div class="risk-row"><span>Traceability</span><b>Lot → market</b></div>`;document.getElementById('faoClimatePanel').innerHTML=`<div class="risk-row"><span>Drought / flood</span><b>Monitored</b></div><div class="risk-row"><span>Crop stress</span><b>Satellite / field</b></div><div class="risk-row"><span>Early action</span><b>${prod<70?'Priority':'Watch'}</b></div>`;document.getElementById('faoValuePanel').innerHTML=`<div class="risk-row"><span>Processing yield</span><b>Tracked</b></div><div class="risk-row"><span>Value addition</span><b>Modeled</b></div><div class="risk-row"><span>Local transformation</span><b>Mapped</b></div>`;document.getElementById('faoGIS').innerHTML='<div class="map"><span class="pin" style="left:15%;top:55%">Production</span><span class="pin" style="left:44%;top:28%">Loss hotspot</span><span class="pin" style="left:70%;top:62%">Market</span></div>'}

  /* Titre accessible bilingue du tableau de bord */
  const h1 = {
    fr: 'FAO AgriNutriApp · Surveillance des systèmes alimentaires (Afrique de l’Ouest)',
    en: 'FAO AgriNutriApp · Food Systems Surveillance (West Africa)'
  };
  function syncH1() {
    const el = document.querySelector('#fao h1');
    if (el) el.textContent = I18N && I18N.getLang() === 'en' ? h1.en : h1.fr;
  }
  if (I18N) { I18N.onChange(syncH1); syncH1(); }

  global.renderFAO = renderFAO;
})(window);
