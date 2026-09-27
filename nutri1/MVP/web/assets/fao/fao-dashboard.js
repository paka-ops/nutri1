/* ============================================================================
   NUTRI.N°1 — FAO · FOOD SYSTEMS INTELLIGENCE · AFRIQUE DE L'OUEST
   fao-dashboard.js — Composant dynamique pour la section #fao.
   Zéro framework. Initialisation paresseuse, synchronisation du titre,
   gestion des filtres et instanciation des 15 graphiques Canvas.
   ============================================================================ */

(function () {
  "use strict";

  var root = document.getElementById("fao");
  if (!root) return;

  var state = {
    ready: false,
    country: "NER",
    chartInstances: {}
  };

  var MARKUP = [
    '<div class="fao-shell">',
    '  <!-- ==================== SIDEBAR FAO ==================== -->',
    '  <aside class="fao-sidebar" role="navigation" aria-label="Menu FAO AgriNutri">',
    '    <div class="fao-side-brand">',
    '      <div class="fao-side-logo" aria-hidden="true">',
    '        <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
    '          <path d="M12 22V2M12 2C8 6 4 10 4 15a8 8 0 0 0 16 0C20 10 16 6 12 2z"/>',
    '          <path d="M12 8c2-2 4-2 6 0M12 12c-2-2-4-2-6 0M12 16c2-2 4-2 6 0"/>',
    '        </svg>',
    '      </div>',
    '      <div class="fao-side-titles">',
    '        <b>FAO AgriNutri</b>',
    '        <span>Food Intelligence</span>',
    '      </div>',
    '    </div>',
    '    <nav class="fao-side-nav">',
    '      <button type="button" class="fao-side-item active" data-target="fao-sec-production">',
    '        <span class="fao-ico">🌾</span> Production agricole',
    '      </button>',
    '      <button type="button" class="fao-side-item" data-target="fao-sec-systems">',
    '        <span class="fao-ico">🍽️</span> Systèmes alimentaires',
    '      </button>',
    '      <button type="button" class="fao-side-item" data-target="fao-sec-nutrition">',
    '        <span class="fao-ico">🔬</span> Composition nutritive',
    '      </button>',
    '      <button type="button" class="fao-side-item" data-target="fao-sec-calendars">',
    '        <span class="fao-ico">📅</span> Calendriers agricoles',
    '      </button>',
    '      <button type="button" class="fao-side-item" data-target="fao-sec-valuechain">',
    '        <span class="fao-ico">🏭</span> Chaîne de valeur',
    '      </button>',
    '      <button type="button" class="fao-side-item" data-target="fao-sec-fortification">',
    '        <span class="fao-ico">💊</span> Fortification',
    '      </button>',
    '    </nav>',
    '    <div class="fao-side-foot">',
    '      <button type="button" class="fao-side-btn" onclick="openInvestment(\'fao\')">',
    '        📊 Cockpit d\'investissement S&amp;E →',
    '      </button>',
    '      <button type="button" class="fao-side-btn" id="faoBtnExportReport">',
    '        📄 Exporter synthèse PDF',
    '      </button>',
    '    </div>',
    '  </aside>',
    '',
    '  <!-- ==================== MAIN CONTENT AREA ==================== -->',
    '  <main class="fao-main">',
    '    <!-- Header -->',
    '    <header class="fao-header">',
    '      <div class="fao-header-top">',
    '        <div>',
    '          <span class="fao-badge-inst"><i></i> Institution : FAO · Food and Agriculture Organization</span>',
    '          <h1>Food Systems Intelligence · <span>Afrique de l\'Ouest</span></h1>',
    '          <p>Plateforme intégrée d\'analyse agro-nutritionnelle : bilans céréaliers, pertes post-récolte, calendriers de soudure et biofortification</p>',
    '        </div>',
    '        <div class="fao-header-tools">',
    '          <label style="font-size:11px;font-weight:700;color:#052E16;display:flex;align-items:center;gap:6px;">',
    '            Région :',
    '            <select id="faoCountryFilter" class="fao-select">',
    '              <option value="ALL">Afrique de l\'Ouest (14 pays)</option>',
    '              <option value="NER">Niger</option>',
    '              <option value="MLI">Mali</option>',
    '              <option value="BFA">Burkina Faso</option>',
    '              <option value="SEN">Sénégal</option>',
    '              <option value="NGA">Nigeria</option>',
    '              <option value="GHA">Ghana</option>',
    '              <option value="CIV">Côte d\'Ivoire</option>',
    '            </select>',
    '          </label>',
    '          <button type="button" class="fao-btn-action" id="faoBtnRefresh">🔄 Réactualiser</button>',
    '        </div>',
    '      </div>',
    '    </header>',
    '',
    '    <!-- ==================== 5 KPI CARDS FAO ==================== -->',
    '    <section class="fao-kpis-strip" aria-label="Indicateurs clés FAO">',
    '      <!-- KPI 1 : Production céréalière -->',
    '      <article class="fao-kpi-card" id="faoKpi1">',
    '        <div class="fao-kpi-accent"></div>',
    '        <div class="fao-kpi-head">',
    '          <span class="fao-kpi-title">Production céréalière 2024</span>',
    '          <span class="fao-kpi-badge good">↑ +4.1% vs 2023</span>',
    '        </div>',
    '        <div>',
    '          <div class="fao-kpi-val green">52.4M t</div>',
    '          <div class="fao-kpi-sub">Afrique de l\'Ouest totale</div>',
    '        </div>',
    '        <div class="fao-kpi-canvas"><canvas id="faoKpiCanvas1"></canvas></div>',
    '      </article>',
    '',
    '      <!-- KPI 2 : Pertes post-récolte -->',
    '      <article class="fao-kpi-card kpi-danger" id="faoKpi2">',
    '        <div class="fao-kpi-accent"></div>',
    '        <div class="fao-kpi-head">',
    '          <span class="fao-kpi-title">Pertes post-récolte</span>',
    '          <span class="fao-kpi-badge bad">Urgence 22%</span>',
    '        </div>',
    '        <div>',
    '          <div class="fao-kpi-val red">22%</div>',
    '          <div class="fao-kpi-sub">= 11.5M tonnes perdues</div>',
    '          <div class="fao-kpi-extra">3.4 Milliards USD</div>',
    '        </div>',
    '        <div class="fao-kpi-canvas"><canvas id="faoKpiCanvas2"></canvas></div>',
    '      </article>',
    '',
    '      <!-- KPI 3 : Score HDDS régional -->',
    '      <article class="fao-kpi-card kpi-warn" id="faoKpi3">',
    '        <div class="fao-kpi-accent"></div>',
    '        <div class="fao-kpi-head">',
    '          <span class="fao-kpi-title">Score HDDS Régional</span>',
    '          <span class="fao-kpi-badge warn">Insuffisant</span>',
    '        </div>',
    '        <div>',
    '          <div class="fao-kpi-val orange">4.2 / 12</div>',
    '          <div class="fao-kpi-sub">Diversité alimentaire ménages</div>',
    '          <div class="fao-kpi-extra" style="font-size:10px;color:#D97706">Objectif OMS : ≥ 6 groupes</div>',
    '        </div>',
    '        <div class="fao-kpi-canvas"><canvas id="faoKpiCanvas3"></canvas></div>',
    '      </article>',
    '',
    '      <!-- KPI 4 : Couverture fortification -->',
    '      <article class="fao-kpi-card" id="faoKpi4">',
    '        <div class="fao-kpi-accent"></div>',
    '        <div class="fao-kpi-head">',
    '          <span class="fao-kpi-title">Couverture Fortification</span>',
    '          <span class="fao-kpi-badge good">3 / 5 Cibles</span>',
    '        </div>',
    '        <div>',
    '          <div class="fao-kpi-val green">3 aliments</div>',
    '          <div class="fao-kpi-sub">sur 5 objectifs harmonisés</div>',
    '          <div class="fao-kpi-extra" style="font-size:9.5px;color:#047857">Sel 89% · Farine 61% · Huile 45%</div>',
    '        </div>',
    '        <div class="fao-kpi-canvas"><canvas id="faoKpiCanvas4"></canvas></div>',
    '      </article>',
    '',
    '      <!-- KPI 5 : Biodiversité alimentaire -->',
    '      <article class="fao-kpi-card kpi-info" id="faoKpi5">',
    '        <div class="fao-kpi-accent"></div>',
    '        <div class="fao-kpi-head">',
    '          <span class="fao-kpi-title">Biodiversité alimentaire</span>',
    '          <span class="fao-kpi-badge warn">Sous-exploité</span>',
    '        </div>',
    '        <div>',
    '          <div class="fao-kpi-val cyan">6,200</div>',
    '          <div class="fao-kpi-sub">espèces cultivées documentées</div>',
    '          <div class="fao-kpi-extra" style="font-size:9.5px;color:#0891B2">Sur 30,000 comestibles connues</div>',
    '        </div>',
    '        <div class="fao-kpi-canvas"><canvas id="faoKpiCanvas5"></canvas></div>',
    '      </article>',
    '    </section>',
    '',
    '    <!-- ==================== 15 GRAPHIQUES FAO ==================== -->',
    '    <div class="fao-grid">',
    '      <!-- G1 [Card 60% largeur] : Production vs Besoins par Pays -->',
    '      <article class="fao-card fao-card-60" id="fao-sec-production">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🌾 1. Production vs Besoins par Pays</h3>',
    '            <p>Grouped bar &amp; Gap chart (12 pays) · Barres vertes production (Mt), contour gris besoins (Mt), flèches surplus/déficit</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill green">Autosuffisance 100%</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h300"><canvas id="faoChart1"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G2 [Card 40% largeur] : Heatmap Nutritive Aliments -->',
    '      <article class="fao-card fao-card-40" id="fao-sec-nutrition">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🔬 2. Heatmap Nutritive Aliments</h3>',
    '            <p>Matrice 18 aliments locaux × 8 nutriments majeurs · Bordure dorée pour les super-aliments</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill gold">⭐ Super aliments</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h300"><canvas id="faoChart2"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G3 [Card pleine largeur] : Calendrier Agricole Gantt -->',
    '      <article class="fao-card fao-card-100" id="fao-sec-calendars">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>📅 3. Calendrier Agricole Gantt &amp; Vulnérabilité Saisonnière</h3>',
    '            <p>10 cultures locales sur 12 mois avec courbes superposées de pluie (mm) et index malnutrition (pics de soudure)</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <select id="faoGanttCountrySelect" class="fao-select">',
    '              <option value="NER">Niger (Sahel)</option>',
    '              <option value="MLI">Mali</option>',
    '              <option value="BFA">Burkina Faso</option>',
    '              <option value="SEN">Sénégal</option>',
    '              <option value="GHA">Ghana</option>',
    '              <option value="NGA">Nigeria</option>',
    '              <option value="CIV">Côte d\'Ivoire</option>',
    '            </select>',
    '            <span class="fao-badge-pill gold">Mai-Août Soudure</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h360"><canvas id="faoChart3"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G4 [Card 55% largeur] : Sankey Chaîne de Valeur -->',
    '      <article class="fao-card fao-card-55" id="fao-sec-valuechain">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🏭 4. Sankey Chaîne de Valeur Alimentaire</h3>',
    '            <p>4 étapes clés : Production → Transformation → Distribution → Consommation avec flux de pertes et particules animées</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill red">Pertes 11.5Mt</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h320"><canvas id="faoChart4"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G5 [Card 45% largeur] : HDDS Dot Plot Pays -->',
    '      <article class="fao-card fao-card-45">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🍽️ 5. HDDS Dot Plot Pays (Jitter Plot)</h3>',
    '            <p>Distribution de 14 pays (score moyen + dispersion des ménages enquêtés) vs Cible OMS (6) et Seuil d\'urgence (3)</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill green">Cible ≥ 6</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h320"><canvas id="faoChart5"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G6 [Card 1/3 largeur] : Gauges Fortification -->',
    '      <article class="fao-card fao-card-33" id="fao-sec-fortification">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>💊 6. Jauges Fortification</h3>',
    '            <p>5 semi-gauges de couverture (Sel, Farine, Huile, Semoule, Lait)</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill green">Obj: 80%</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h260"><canvas id="faoChart6"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G7 [Card 1/3 largeur] : Waterfall Pertes Post-Récolte -->',
    '      <article class="fao-card fao-card-33">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>📉 7. Waterfall Pertes Post-Récolte</h3>',
    '            <p>Cascade de déperdition de 100% à 78% disponible final</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill red">-22% total</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h260"><canvas id="faoChart7"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G8 [Card 1/3 largeur] : Scatter Diversité Cultures/HDDS -->',
    '      <article class="fao-card fao-card-33">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🌐 8. Diversité Cultures vs HDDS</h3>',
    '            <p>80+ districts, 4 quadrants d\'analyse et droite de régression</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill green">R² = 0.67</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h260"><canvas id="faoChart8"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G9 [Card 50% largeur] : Area Chart Production 10 ans -->',
    '      <article class="fao-card fao-card-50">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>📈 9. Production Céréalière 10 ans (2014-2024)</h3>',
    '            <p>Stacked area chart des 6 cultures clés : Maïs, Mil, Sorgho, Riz, Haricots, Autres</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill green">+38% en 10 ans</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h300"><canvas id="faoChart9"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G10 [Card 50% largeur] : Radar Systèmes Alimentaires -->',
    '      <article class="fao-card fao-card-50" id="fao-sec-systems">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🎯 10. Radar des Systèmes Alimentaires Durables</h3>',
    '            <p>Comparaison multidimensionnelle 7 axes : Production, Écologie, Nutrition, Économie, Social, Culture, Gouvernance</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <select id="faoRadarCountrySelect" class="fao-select">',
    '              <option value="ALL">Tous les 4 pays phares</option>',
    '              <option value="NER">Niger</option>',
    '              <option value="SEN">Sénégal</option>',
    '              <option value="GHA">Ghana</option>',
    '              <option value="NGA">Nigeria</option>',
    '            </select>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h300"><canvas id="faoChart10"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G11 [Card 1/3 largeur] : Bar Chart Valeur Nutritive -->',
    '      <article class="fao-card fao-card-33">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🌾 11. Comparatif Nutritif Céréales</h3>',
    '            <p>Mil vs Maïs vs Riz sur 5 micronutriments clés</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill gold">⭐ Mil Champion</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h260"><canvas id="faoChart11"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G12 [Card 1/3 largeur] : Heatmap Prix Marchés -->',
    '      <article class="fao-card fao-card-33">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🏷️ 12. Prix des Marchés 2024</h3>',
    '            <p>6 cultures × 12 mois · Déviation par rapport à la normale</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <select id="faoPriceCountrySelect" class="fao-select">',
    '              <option value="NER">Niger</option>',
    '              <option value="BFA">Burkina</option>',
    '              <option value="MLI">Mali</option>',
    '              <option value="SEN">Sénégal</option>',
    '            </select>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h260"><canvas id="faoChart12"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G13 [Card 1/3 largeur] : Lollipop HDDS Objectifs -->',
    '      <article class="fao-card fao-card-33">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>🍭 13. Lollipop HDDS vs Objectif</h3>',
    '            <p>Distance de chaque pays à la cible de diversité (6.0)</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill green">Cible 6.0</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h260"><canvas id="faoChart13"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G14 [Card 50% largeur] : Bubble Pertes × Revenus -->',
    '      <article class="fao-card fao-card-50">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>💸 14. Corrélation Pertes Récolte × Revenus Producteurs</h3>',
    '            <p>Bubble chart (% pertes vs revenus $/an, taille bulle = volume production Mt)</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill red">Corrélation négative</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h300"><canvas id="faoChart14"></canvas></div>',
    '      </article>',
    '',
    '      <!-- G15 [Card 50% largeur] : Scorecard Nutrition-Agriculture -->',
    '      <article class="fao-card fao-card-50">',
    '        <div class="fao-card-header">',
    '          <div class="fao-card-title-group">',
    '            <h3>📋 15. Scorecard Nutrition-Agriculture (Bullet Grid)</h3>',
    '            <p>Grille comparative 5 pays × 6 indicateurs de sécurité alimentaire et nutritionnelle</p>',
    '          </div>',
    '          <div class="fao-card-controls">',
    '            <span class="fao-badge-pill green">CEDEAO 2024</span>',
    '          </div>',
    '        </div>',
    '        <div class="fao-canvas-wrap h300"><canvas id="faoChart15"></canvas></div>',
    '      </article>',
    '    </div>',
    '  </main>',
    '</div>'
  ].join("\n");

  function syncTitle() {
    if (!root.classList.contains("on")) return;
    var titleEl = document.getElementById("title");
    if (titleEl) {
      titleEl.textContent = "Food Systems Intelligence · Afrique de l'Ouest";
    }
  }

  function renderMiniKpis() {
    if (!window.FAO_CHARTS || !window.FAO_DATA) return;
    window.FAO_CHARTS.renderMiniKpi1(document.getElementById("faoKpiCanvas1"), window.FAO_DATA.kpis.production.miniCrops);
    window.FAO_CHARTS.renderMiniKpi2(document.getElementById("faoKpiCanvas2"), window.FAO_DATA.kpis.pertes.numVal);
    window.FAO_CHARTS.renderMiniKpi3(document.getElementById("faoKpiCanvas3"), window.FAO_DATA.kpis.hdds.numVal);
    window.FAO_CHARTS.renderMiniKpi4(document.getElementById("faoKpiCanvas4"), window.FAO_DATA.kpis.fortification.items);
    window.FAO_CHARTS.renderMiniKpi5(document.getElementById("faoKpiCanvas5"), window.FAO_DATA.kpis.biodiversite.donut);
  }

  function initCharts() {
    if (!window.FAO_CHARTS || !window.FAO_DATA) return;
    var CH = window.FAO_CHARTS;

    // Mini KPIs
    renderMiniKpis();

    // 15 Graphiques
    state.chartInstances.c1 = CH.register(CH.createChart1(document.getElementById("faoChart1")));
    state.chartInstances.c2 = CH.register(CH.createChart2(document.getElementById("faoChart2")));
    state.chartInstances.c3 = CH.register(CH.createChart3(document.getElementById("faoChart3"), state.country));
    state.chartInstances.c4 = CH.register(CH.createChart4(document.getElementById("faoChart4")));
    state.chartInstances.c5 = CH.register(CH.createChart5(document.getElementById("faoChart5")));
    state.chartInstances.c6 = CH.register(CH.createChart6(document.getElementById("faoChart6")));
    state.chartInstances.c7 = CH.register(CH.createChart7(document.getElementById("faoChart7")));
    state.chartInstances.c8 = CH.register(CH.createChart8(document.getElementById("faoChart8")));
    state.chartInstances.c9 = CH.register(CH.createChart9(document.getElementById("faoChart9")));
    state.chartInstances.c10 = CH.register(CH.createChart10(document.getElementById("faoChart10"), "ALL"));
    state.chartInstances.c11 = CH.register(CH.createChart11(document.getElementById("faoChart11")));
    state.chartInstances.c12 = CH.register(CH.createChart12(document.getElementById("faoChart12"), state.country));
    state.chartInstances.c13 = CH.register(CH.createChart13(document.getElementById("faoChart13")));
    state.chartInstances.c14 = CH.register(CH.createChart14(document.getElementById("faoChart14")));
    state.chartInstances.c15 = CH.register(CH.createChart15(document.getElementById("faoChart15")));
  }

  function wireInteractions() {
    // Sidebar Navigation scrolling
    root.querySelectorAll(".fao-side-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".fao-side-item").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var tid = btn.getAttribute("data-target");
        if (tid) {
          var targetEl = document.getElementById(tid);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            targetEl.style.boxShadow = "0 0 0 3px #059669, 0 12px 30px rgba(5,150,105,0.2)";
            setTimeout(function () { targetEl.style.boxShadow = ""; }, 1800);
          }
        }
      });
    });

    // Country Filter
    var cFilter = document.getElementById("faoCountryFilter");
    if (cFilter) {
      cFilter.addEventListener("change", function () {
        var val = this.value;
        if (val !== "ALL") {
          state.country = val;
          if (state.chartInstances.c3) state.chartInstances.c3.setCountry(val);
          if (state.chartInstances.c12) state.chartInstances.c12.setCountry(val);
          var ganttSelect = document.getElementById("faoGanttCountrySelect");
          if (ganttSelect) ganttSelect.value = val;
          var priceSelect = document.getElementById("faoPriceCountrySelect");
          if (priceSelect) priceSelect.value = val;
        }
      });
    }

    // Gantt Country Select
    var gSelect = document.getElementById("faoGanttCountrySelect");
    if (gSelect) {
      gSelect.addEventListener("change", function () {
        if (state.chartInstances.c3) state.chartInstances.c3.setCountry(this.value);
      });
    }

    // Radar Country Select
    var rSelect = document.getElementById("faoRadarCountrySelect");
    if (rSelect) {
      rSelect.addEventListener("change", function () {
        if (state.chartInstances.c10) state.chartInstances.c10.setCountry(this.value);
      });
    }

    // Price Heatmap Country Select
    var pSelect = document.getElementById("faoPriceCountrySelect");
    if (pSelect) {
      pSelect.addEventListener("change", function () {
        if (state.chartInstances.c12) state.chartInstances.c12.setCountry(this.value);
      });
    }

    // Refresh Button
    var btnRef = document.getElementById("faoBtnRefresh");
    if (btnRef) {
      btnRef.addEventListener("click", function () {
        renderMiniKpis();
        Object.keys(state.chartInstances).forEach(function (k) {
          var inst = state.chartInstances[k];
          if (inst && typeof inst.update === "function") inst.update();
        });
      });
    }

    // Export PDF Report Button
    var btnExp = document.getElementById("faoBtnExportReport");
    if (btnExp) {
      btnExp.addEventListener("click", function () {
        window.print();
      });
    }

    // ResizeObserver for auto-repaint
    if (typeof ResizeObserver === "function") {
      var ro = new ResizeObserver(function () {
        if (root.classList.contains("on") && window.FAO_CHARTS) {
          renderMiniKpis();
          window.FAO_CHARTS.repaintAll();
        }
      });
      ro.observe(root);
    }
  }

  function init() {
    if (state.ready) return;
    root.innerHTML = MARKUP;
    initCharts();
    wireInteractions();
    state.ready = true;
    root.setAttribute("data-fao-init", "1");
    syncTitle();
    setTimeout(function () {
      renderMiniKpis();
      if (window.FAO_CHARTS) window.FAO_CHARTS.repaintAll();
    }, 280);
    setTimeout(function () {
      renderMiniKpis();
      if (window.FAO_CHARTS) window.FAO_CHARTS.repaintAll();
    }, 900);

    if (typeof MutationObserver === "function") {
      new MutationObserver(function () {
        if (!root.classList.contains("on")) return;
        syncTitle();
        setTimeout(function () {
          renderMiniKpis();
          if (window.FAO_CHARTS) window.FAO_CHARTS.repaintAll();
        }, 80);
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
    }
  }

  function isVisible() {
    return root.classList.contains("on");
  }

  function boot() {
    if (state.ready) return;
    if (isVisible()) {
      setTimeout(init, 60);
      return;
    }
    var started = false;
    var start = function () {
      if (started || state.ready) return;
      started = true;
      setTimeout(init, 60);
    };

    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(function () {
        if (isVisible()) start();
      });
      obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    }

    var poll = setInterval(function () {
      if (isVisible()) {
        clearInterval(poll);
        start();
      }
    }, 250);
  }

  boot();

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && (e.target.closest('[data-inv-shortcut="fao"]') || e.target.closest('button[onclick*="\'fao\'"]'));
      if (btn) {
        setTimeout(function () {
          if (!state.ready) init();
          else {
            syncTitle();
            if (window.FAODash) window.FAODash.repaint();
          }
        }, 50);
      }
    });
  }

  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("hashchange", function () {
      if (location.hash === "#fao") {
        setTimeout(function () {
          if (!state.ready) init();
          else {
            syncTitle();
            if (window.FAODash) window.FAODash.repaint();
          }
        }, 50);
      }
    });
  }

  window.FAODash = {
    root: root,
    state: state,
    init: init,
    repaint: function () {
      renderMiniKpis();
      if (window.FAO_CHARTS) window.FAO_CHARTS.repaintAll();
    }
  };
})();
