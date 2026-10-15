/* ============================================================================
 * WHO / OMS · who-section.js
 * Fichier : components/sections/who-section.js
 * Rôle    : Composant de section who — extrait de index.html pour alléger la
 *           page principale. Injecte le HTML de la section (tableau de bord
 *           Shadow DOM + modules historiques) et expose les fonctions de rendu
 *           globales attendues par index.html (renderWHO · selectWHOCondition).
 *           Langue : FR (source) ↔ EN via components/i18n/sections-i18n.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const I18N = global.NutriSectionsI18N;

  /* ------------------------------------------------------------------ */
  /* Gabarit HTML de la section                                          */
  /* ------------------------------------------------------------------ */
  const HTML = `
<!-- NutriTracker West Africa · Surveillance Communautaire — composant autonome (Shadow DOM).
     Code : components/who-nutritracker/ · les modules WHO NCD ci-dessous restent dans le DOM (masqués). -->
<nutritracker-dashboard id="whoNutriTracker" aria-label="NutriTracker West Africa · Surveillance Communautaire"></nutritracker-dashboard>
<div class="hero institution-hero"><span class="pill" data-i18n="ui.who_nutrition_noncommunicable_diseases">WHO • NUTRITION & NONCOMMUNICABLE DISEASES</span><h1 data-i18n="ui.who_nutrition_ncd_intelligence_center">🌍 WHO Nutrition & NCD Intelligence Center</h1><p data-i18n="ui.dynamic_intelligence_on_diet_related_noncommunicable_diseases_and_meta">Dynamic intelligence on diet-related noncommunicable diseases and metabolic risk.</p></div>
<div class="card"><div class="section-head"><div><h2 data-i18n="ui.country_ncd_explorer">🌍 Country & NCD Explorer</h2><p class="muted" data-i18n="ui.explore_population_level_indicators">Explore population-level indicators.</p></div><div class="institution-filters"><label>Country<select id="whoCountry" onchange="renderWHO()"></select></label><label>Level<select id="whoLevel" onchange="renderWHO()"><option data-i18n="ui.national">National</option><option data-i18n="ui.region">Region</option><option data-i18n="ui.district">District</option></select></label><label>Year<select id="whoYear" onchange="renderWHO()"><option>2026</option><option>2025</option><option>2024</option><option>2023</option><option>2022</option></select></label></div></div></div>
<div class="institution-kpis"><div class="card inst-kpi"><span data-i18n="ui.diabetes">Diabetes</span><b id="whoDiabetes">—</b></div><div class="card inst-kpi"><span data-i18n="ui.hypertension">Hypertension</span><b id="whoHypertension">—</b></div><div class="card inst-kpi"><span data-i18n="ui.obesity">Obesity</span><b id="whoObesity">—</b></div><div class="card inst-kpi"><span data-i18n="ui.cardiovascular">Cardiovascular</span><b id="whoCVD">—</b></div><div class="card inst-kpi"><span data-i18n="ui.stroke">Stroke</span><b id="whoStroke">—</b></div></div>
<div class="condition-dashboard-grid"><button class="ncd-card active" onclick="selectWHOCondition('diabetes',this)">🩸<b data-i18n="ui.diabetes">Diabetes</b><small data-i18n="ui.metabolic_health">Metabolic health</small></button><button class="ncd-card" onclick="selectWHOCondition('hypertension',this)">❤️<b data-i18n="ui.hypertension">Hypertension</b></button><button class="ncd-card" onclick="selectWHOCondition('obesity',this)">⚖️<b data-i18n="ui.obesity">Obesity</b></button><button class="ncd-card" onclick="selectWHOCondition('cancer',this)">🎗️<b data-i18n="ui.cancer">Cancer</b></button><button class="ncd-card" onclick="selectWHOCondition('kidney',this)">🫘<b data-i18n="ui.kidney_disease">Kidney disease</b></button><button class="ncd-card" onclick="selectWHOCondition('stroke',this)">🧠<b data-i18n="ui.stroke">Stroke</b></button><button class="ncd-card" onclick="selectWHOCondition('cvd',this)">❤️<b data-i18n="ui.cardiovascular_disease">Cardiovascular disease</b></button><button class="ncd-card" onclick="selectWHOCondition('diet',this)">🥗<b data-i18n="ui.dietary_risk">Dietary risk</b></button></div>
<div class="grid2"><div class="card"><h2 id="whoConditionTitle" data-i18n="ui.diabetes_intelligence">Diabetes Intelligence</h2><div class="big-chart" id="whoTrendChart"></div><p id="whoConditionSummary" class="muted"></p></div><div class="card"><h2 data-i18n="ui.risk_factor_dashboard">📊 Risk Factor Dashboard</h2><div id="whoRiskFactors"></div></div></div>
<div class="card"><div class="section-head"><div><h2 data-i18n="ui.africa_ncd_intelligence_map">🗺️ Africa NCD Intelligence Map</h2><p class="muted" data-i18n="ui.gis_demonstration_layer">GIS demonstration layer.</p></div><button class="btn primary" onclick="toast('WHO NCD GIS layer opened')" data-i18n="ui.explore_gis">Explore GIS</button></div><div class="gis-demo" id="whoGIS"></div></div>
<div class="card alert-panel"><h2 data-i18n="ui.population_health_signals">🚨 Population Health Signals</h2><div id="whoAlerts"></div></div>
<div class="card"><h2 data-i18n="ui.evidence_graph_connection">🔬 Evidence Graph Connection</h2><div class="evidence-flow"><span data-i18n="ui.diet">Diet</span><b data-i18n="ui.text_2">→</b><span data-i18n="ui.nutrients">Nutrients</span><b data-i18n="ui.text_2">→</b><span data-i18n="ui.biomarkers">Biomarkers</span><b data-i18n="ui.text_2">→</b><span data-i18n="ui.risk_factors">Risk factors</span><b data-i18n="ui.text_2">→</b><span data-i18n="ui.ncd_outcomes">NCD outcomes</span></div></div>
`;

  class WhoSection extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      this.innerHTML = HTML;
      if (I18N) I18N.translateTree(this);
    }
  }
  if (!customElements.get('who-section')) customElements.define('who-section', WhoSection);

  /* Libellés bilingues FR/EN des éléments <dashboard> (aria-label) */
  const ARIACode = {'whoNutriTracker': {'fr': 'NutriTracker West Africa · Surveillance Communautaire', 'en': 'NutriTracker West Africa · Community Surveillance'}};
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
  /* Modules WHO NCD historiques (déplacés depuis index.html)            */
  /* ------------------------------------------------------------------ */
  let whoCondition = 'diabetes';

  function selectWHOCondition(c,el){whoCondition=c;document.querySelectorAll('.ncd-card').forEach(x=>x.classList.remove('active'));el.classList.add('active');renderWHO()}

  function renderWHO(){const c=document.getElementById('whoCountry')?.value||'TG',m=demoCountryMetrics[c]||demoCountryMetrics.default;document.getElementById('whoDiabetes').textContent=m.diabetes+'%';document.getElementById('whoHypertension').textContent=m.hypertension+'%';document.getElementById('whoObesity').textContent=m.obesity+'%';document.getElementById('whoCVD').textContent=m.cvd+'%';document.getElementById('whoStroke').textContent=m.stroke+'%';const d={diabetes:[m.diabetes,'Diabetes'],hypertension:[m.hypertension,'Hypertension'],obesity:[m.obesity,'Obesity'],cancer:[4.2,'Cancer'],kidney:[3.8,'Kidney disease'],stroke:[m.stroke,'Stroke'],cvd:[m.cvd,'Cardiovascular disease'],diet:[34,'Dietary risk']}[whoCondition]||[m.diabetes,'Diabetes'];document.getElementById('whoConditionTitle').textContent=d[1]+' Intelligence';document.getElementById('whoConditionSummary').textContent='Population indicator: '+d[0]+'%. Demonstration data — production connects validated authorized datasets.';document.getElementById('whoTrendChart').innerHTML='<div class="trend-bars">'+[d[0]+4,d[0]+2,d[0],d[0]-1,d[0]+1].map(v=>`<i style="height:${Math.max(v,3)*2.5}%"></i>`).join('')+'</div>';document.getElementById('whoRiskFactors').innerHTML=`<div class="risk-row"><span data-i18n="ui.dietary_pattern">Dietary pattern</span><b data-i18n="ui.monitored">Monitored</b></div><div class="risk-row"><span data-i18n="ui.physical_activity">Physical activity</span><b data-i18n="ui.monitored">Monitored</b></div><div class="risk-row"><span data-i18n="ui.obesity">Obesity</span><b data-i18n="ui.m_obesity">${m.obesity}%</b></div><div class="risk-row"><span data-i18n="ui.hypertension">Hypertension</span><b data-i18n="ui.m_hypertension">${m.hypertension}%</b></div><div class="risk-row"><span data-i18n="ui.diabetes">Diabetes</span><b data-i18n="ui.m_diabetes">${m.diabetes}%</b></div>`;document.getElementById('whoAlerts').innerHTML='<div class="alert-row"><strong data-i18n="ui.monitor">🟠 Monitor</strong><span data-i18n="ui.population_health_trend_requires_surveillance">Population health trend requires surveillance.</span></div><div class="alert-row"><strong data-i18n="ui.watch">🟡 Watch</strong><span data-i18n="ui.connect_dietary_and_metabolic_indicators_to_the_evidence_graph">Connect dietary and metabolic indicators to the Evidence Graph.</span></div>'}

  global.whoConditionGet = function () { return whoCondition; };
  global.selectWHOCondition = selectWHOCondition;
  global.renderWHO = renderWHO;
})(window);
