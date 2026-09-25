/*
 * WHO Nutrition Surveillance dashboard — vanilla JavaScript only.
 * All visuals are drawn with the Canvas 2D API. The values are hard-coded,
 * illustrative demo data; this page does not call an API or claim to be an
 * official WHO reporting feed. Kept external to the host page to avoid adding
 * another large inline module to MVP/web/index.html.
 */
(function () {
  'use strict';

  var host = document.getElementById('who');
  if (!host || host.dataset.whoSurveillanceMounted === '1') return;
  host.dataset.whoSurveillanceMounted = '1';
  var mount = document.getElementById('whoNutritionMount') || host;

  /* A single injected view keeps the legacy host section and its navigation. */
  mount.innerHTML = `
    <div id="whoNutritionRoot" class="who-app" aria-label="WHO nutrition surveillance dashboard">
      <canvas class="who-particles" id="whoParticles" aria-hidden="true"></canvas>
      <div class="who-shell">
        <header class="who-topline">
          <div class="who-brand">
            <svg class="who-emblem" viewBox="0 0 64 64" role="img" aria-label="Emblème OMS stylisé">
              <circle class="who-orbit" cx="32" cy="32" r="27" fill="none" stroke="#00d4ff" stroke-width="1" opacity=".75" />
              <circle cx="32" cy="32" r="20" fill="rgba(0,212,255,.035)" stroke="#60dff7" stroke-width="1.2" />
              <path d="M15 32h34M32 15v34M19.7 19.7l24.6 24.6m0-24.6L19.7 44.3" fill="none" stroke="#8cecff" stroke-width=".8" opacity=".36" />
              <path d="M32 11v42M24 17h16M24 47h16" fill="none" stroke="#00d4ff" stroke-width="1.15" opacity=".75" />
              <path class="who-serpent" d="M31.8 20.5c-5.4 0-7.6 5.8-3.2 8.6 4.8 3.1 8.1 6.1 4.9 9.8-3.1 3.7-9.1 1-8.2-3.6m6.9-15.1c4.7.3 6.2 4.5 4.9 7.6-.9 2.1-4.7 3.8-6.1 5.4" fill="none" stroke="#00ff88" stroke-width="2.15" stroke-linecap="round" />
              <circle cx="31.8" cy="18" r="2.2" fill="#00d4ff" />
              <path d="M29 53h6m-3-3v6" stroke="#00d4ff" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <div class="who-brand-copy">
              <p class="who-eyebrow">WHO • GLOBAL NUTRITION INTELLIGENCE</p>
              <h1><span id="whoTypeTitle">WHO NUTRITION SURVEILLANCE SYSTEM</span><i class="who-type-caret" aria-hidden="true"></i></h1>
            </div>
          </div>
          <div class="who-header-actions">
            <div class="who-clock" aria-label="Heure UTC"><b id="whoClock">--:--:-- UTC</b></div>
            <div class="who-status"><i class="who-live-dot"></i><span>LIVE · DEMO</span></div>
            <div class="who-region-control">
              <label for="whoRegion">Région</label>
              <select id="whoRegion" aria-label="Sélectionner une région">
                <option value="world">Monde</option>
                <option value="africa">Afrique</option>
                <option value="asia">Asie</option>
                <option value="americas">Amériques</option>
                <option value="europe">Europe</option>
                <option value="eastern-med">Méditerranée orientale</option>
                <option value="western-pacific">Pacifique occidental</option>
              </select>
            </div>
            <button type="button" class="who-btn" id="whoExport" title="Télécharger les indicateurs de démonstration en CSV">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8m0 0 3-3m-3 3L5 7M3 11v2h10v-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Export CSV
            </button>
          </div>
        </header>

        <nav class="who-nav" aria-label="Navigation du tableau de bord">
          <a href="#who-overview">Synthèse</a>
          <a href="#who-globe-section">Globe 3D</a>
          <a href="#who-analytics">Analyses</a>
          <a href="#who-map-section">Carte thermique</a>
          <a href="#who-alerts-section">Alertes</a>
          <a href="#who-compare-section">Comparer</a>
        </nav>

        <main>
          <section id="who-overview" class="who-intro">
            <div>
              <div class="who-kicker">SURVEILLANCE NUTRITIONNELLE · <span id="whoRegionLabel">MONDE</span></div>
              <h2>La nutrition mondiale, en temps réel.</h2>
              <p>Un poste de veille visuel pour explorer les tendances de malnutrition, les disparités régionales et les signaux qui appellent une action coordonnée.</p>
            </div>
            <div class="who-data-note" role="note">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor"/><path d="M8 7v4m0-6h.01" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"/></svg>
              <span>Simulation illustrative — valeurs de démonstration, non officielles et non destinées à la décision clinique.</span>
            </div>
          </section>

          <section class="who-kpis" aria-label="Indicateurs mondiaux de nutrition">
            <article class="who-kpi" data-tilt style="--w-accent:#00d4ff">
              <div class="who-kpi-head"><span class="who-kpi-label">STUNTING GLOBAL</span><span class="who-kpi-icon" aria-hidden="true">↘</span></div>
              <div class="who-kpi-value"><span data-count="stunting" id="whoKpiStunting">0.0</span><small>%</small></div>
              <p class="who-kpi-description">Retard de croissance mondial · enfants &lt; 5 ans</p>
              <div class="who-kpi-chart"><canvas id="whoSparkStunting" aria-label="Tendance décennale du retard de croissance"></canvas></div>
              <div class="who-kpi-foot"><span class="who-delta-good">↘ −4,1 pts / 10 ans</span><span>tendance favorable</span></div>
            </article>
            <article class="who-kpi" id="whoWastingCard" data-tilt style="--w-accent:#00d4ff">
              <div class="who-kpi-head"><span class="who-kpi-label">WASTING ENFANTS</span><span class="who-kpi-icon" aria-hidden="true">◉</span></div>
              <div class="who-kpi-value"><span data-count="wasting" id="whoKpiWasting">0.0</span><small>%</small></div>
              <p class="who-kpi-description">Émaciation chez les enfants de moins de 5 ans</p>
              <div class="who-kpi-chart"><canvas id="whoGaugeWasting" aria-label="Jauge de l'émaciation infantile"></canvas></div>
              <div class="who-kpi-foot"><span class="who-critical-threshold">Seuil d'urgence &gt; 10 %</span><span id="whoWastingStatus">sous le seuil</span></div>
            </article>
            <article class="who-kpi is-violet" data-tilt style="--w-accent:#a47bff">
              <div class="who-kpi-head"><span class="who-kpi-label">ANÉMIE · FEMMES</span><span class="who-kpi-icon" aria-hidden="true">✣</span></div>
              <div class="who-kpi-value"><span data-count="anemia" id="whoKpiAnemia">0.0</span><small>%</small></div>
              <p class="who-kpi-description">Femmes en âge de procréer · comparaison régionale</p>
              <div class="who-kpi-chart"><canvas id="whoRegionBars" aria-label="Comparaison de l'anémie par région"></canvas></div>
              <div class="who-kpi-foot"><span>Écart régional</span><span>mesure simulée</span></div>
            </article>
            <article class="who-kpi is-split" data-tilt style="--w-accent:#ff5476">
              <div class="who-kpi-head"><span class="who-kpi-label">DOUBLE FARDEAU</span><span class="who-kpi-icon" aria-hidden="true">◒</span></div>
              <div class="who-kpi-value"><span data-count="burden" id="whoKpiBurden">0</span><small>pays</small></div>
              <p class="who-kpi-description">Obésité et sous-nutrition coexistent</p>
              <div class="who-kpi-chart who-double-globe"><canvas id="whoDoubleGlobe" aria-label="Pays touchés par le double fardeau"></canvas></div>
              <div class="who-kpi-foot"><span style="color:#ff7891">● NCD</span><span style="color:#00ff88">● sous-nutrition</span></div>
            </article>
            <article class="who-kpi is-gold" data-tilt style="--w-accent:#ffd166">
              <div class="who-kpi-head"><span class="who-kpi-label">CARENCE VITAMINE A</span><span class="who-kpi-icon who-eye" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg></span></div>
              <div class="who-kpi-value"><span data-count="vitA" id="whoKpiVitA">0</span><small>M</small></div>
              <p class="who-kpi-description">Enfants exposés au risque de carence</p>
              <div class="who-kpi-chart"><canvas id="whoSparkVitA" aria-label="Évolution de la population à risque"></canvas></div>
              <div class="who-kpi-foot"><span>enfants concernés</span><span>estimation simulée</span></div>
            </article>
            <article class="who-kpi is-blood" data-tilt style="--w-accent:#ff5364">
              <div class="who-kpi-head"><span class="who-kpi-label">ANÉMIE · ENFANTS</span><span class="who-kpi-icon" aria-hidden="true">◉</span></div>
              <div class="who-kpi-value"><span data-count="childAnemia" id="whoKpiChildAnemia">0.0</span><small>%</small></div>
              <p class="who-kpi-description">Enfants de moins de 5 ans · liquid signal</p>
              <div class="who-kpi-chart"><canvas id="whoLiquid" aria-label="Niveau simulé d'anémie infantile"></canvas></div>
              <div class="who-kpi-foot"><span class="who-delta-warn">● vigilance renforcée</span><span id="whoLiquidLabel">39,8 %</span></div>
            </article>
          </section>

          <section id="who-globe-section" class="who-grid who-grid-globe" aria-label="Globe nutritionnel et signaux clés">
            <article class="who-panel who-panel-pad who-globe-panel">
              <div class="who-card-head">
                <div><div class="who-section-index">01 / GÉOSPATIAL</div><h3>GLOBE NUTRITIONNEL INTERACTIF</h3><p>Prévalence indicative • survolez ou touchez un point pour explorer un pays</p></div>
                <span class="who-pill"><i class="who-live-dot"></i> ROTATION AUTO</span>
              </div>
              <div class="who-globe-stage">
                <canvas class="who-globe-canvas" id="whoGlobe" tabindex="0" aria-label="Globe terrestre interactif. Cliquez sur un point lumineux pour afficher les indicateurs du pays."></canvas>
                <div class="who-globe-overlay"><span class="who-legend-item"><i class="who-gradient-legend"></i> charge faible → critique</span><span class="who-legend-item">● taille = prévalence</span></div>
              </div>
              <p class="who-globe-tipline" id="whoGlobeSelection" aria-live="polite">Sélectionnez un marqueur lumineux pour afficher son profil nutritionnel.</p>
            </article>
            <aside class="who-aside-stack" aria-label="Signaux régionaux">
              <article class="who-panel who-signal-card">
                <div class="who-signal-title"><h3>PROGRÈS VERS LES CIBLES</h3><span class="who-pill green">2030</span></div>
                <div class="who-signal-stat"><span>Retard de croissance</span><b id="whoTargetStunting">—</b></div>
                <div class="who-signal-bar"><i id="whoTargetBar" style="width:0%"></i></div>
                <div class="who-signal-stat"><span>Émaciation</span><b>6,7 <small style="font-size:10px">%</small></b></div>
                <div class="who-signal-bar"><i style="width:38%;background:linear-gradient(90deg,#ff6b35,#ffd166)"></i></div>
                <div class="who-card-foot" style="justify-content:space-between;color:#7896a7;font-size:9px"><span>Trajectoire indicative</span><span>pas une projection officielle</span></div>
              </article>
              <article class="who-panel who-signal-card">
                <div class="who-signal-title"><h3>ANÉMIE PAR RÉGION</h3><span class="who-pill">WRA</span></div>
                <div class="who-region-mini" id="whoRegionMini"></div>
              </article>
              <article class="who-insight">
                <h4>HORIZON · PRIORITÉ DE VEILLE</h4>
                <p>La charge nutritionnelle se superpose aux risques métaboliques. Les moyennes mondiales masquent des écarts importants entre contextes et au sein des pays.</p>
              </article>
            </aside>
          </section>

          <section id="who-analytics" class="who-grid who-grid-analytics" aria-label="Graphiques d'analyse">
            <article class="who-panel who-panel-pad">
              <div class="who-card-head">
                <div><div class="who-section-index">02 / PROFIL MULTIDIMENSIONNEL</div><h3>RADAR · NUTRITION MONDIALE</h3><p>Indice relatif illustratif sur huit dimensions (0–50 %)</p></div>
                <span class="who-pill">2015 — 2024</span>
              </div>
              <div class="who-chart-wrap"><canvas class="who-chart" id="whoRadar" tabindex="0" aria-label="Graphique radar des indicateurs de nutrition entre 2015 et 2024"></canvas></div>
              <div class="who-chart-legend">
                <span class="who-legend-item"><i class="who-key" style="--key:#ffb454"></i>2015</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#a47bff"></i>2020</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#00d4ff"></i>2024</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#00ff88"></i>année sélectionnée</span>
              </div>
              <div class="who-chart-controls"><span>2015</span><div class="who-range-wrap"><input id="whoRadarYear" type="range" min="2015" max="2024" step="1" value="2024" aria-label="Année du profil radar"><span class="who-control-value" id="whoRadarYearLabel">2024</span></div><span>2024</span></div>
            </article>
            <article class="who-panel who-panel-pad">
              <div class="who-card-head">
                <div><div class="who-section-index">03 / TENDANCES LONGITUDINALES</div><h3>ÉVOLUTION · 20 ANS</h3><p>Prévalences sélectionnées et prolongement indicatif jusqu'en 2030</p></div>
                <span class="who-pill">2004—2030</span>
              </div>
              <div class="who-chart-wrap"><canvas class="who-chart" id="whoTimeline" tabindex="0" aria-label="Évolution de quatre indicateurs de nutrition de 2004 à 2030"></canvas></div>
              <div class="who-chart-legend">
                <span class="who-legend-item"><i class="who-key" style="--key:#00d4ff"></i>Stunting</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#ff6b35"></i>Wasting</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#a47bff"></i>Anémie femmes</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#00ff88"></i>Obésité adulte</span>
              </div>
              <div class="who-chart-controls"><span class="who-map-caption">Survolez la courbe pour lire une année et ses valeurs.</span><span class="who-control-value">2030 · pointillés</span></div>
            </article>
          </section>

          <section class="who-grid who-grid-explore" aria-label="Exploration des régions et pays">
            <article class="who-panel who-panel-pad">
              <div class="who-card-head">
                <div><div class="who-section-index">04 / ALLOCATION & CHARGE</div><h3>TREEMAP · RÉGIONS DU MONDE</h3><p>Surface indicative = part relative du fardeau nutritionnel · cliquez pour subdiviser</p></div>
                <button type="button" class="who-btn who-tree-reset" id="whoTreeReset">← Vue monde</button>
              </div>
              <div class="who-tree-stage"><canvas id="whoTreemap" tabindex="0" aria-label="Treemap interactive des régions et de leurs pays"></canvas></div>
              <p class="who-map-caption" id="whoTreeCaption">La couleur représente une intensité relative de malnutrition dans cette simulation.</p>
            </article>
            <article class="who-panel who-panel-pad">
              <div class="who-card-head">
                <div><div class="who-section-index">05 / DISPERSION ÉCONOMIQUE</div><h3>BULLES · PAYS</h3><p>X : PIB / hab. · Y : prévalence · taille : population affectée</p></div>
                <button type="button" class="who-btn" id="whoBubbleReset">Réinitialiser la vue</button>
              </div>
              <div class="who-bubble-stage"><canvas id="whoBubble" tabindex="0" aria-label="Nuage de points interactif des pays par PIB et prévalence"></canvas></div>
              <div class="who-chart-legend">
                <span class="who-legend-item"><i class="who-key" style="--key:#00d4ff"></i>Afrique</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#a47bff"></i>Asie</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#00ff88"></i>Amériques</span>
                <span class="who-legend-item"><i class="who-key" style="--key:#ffb454"></i>Autres régions</span>
                <span>glisser · molette pour zoomer</span>
              </div>
            </article>
          </section>

          <section id="who-map-section" class="who-panel who-panel-pad" style="margin-bottom:14px" aria-label="Carte thermique mondiale">
            <div class="who-card-head">
              <div><div class="who-section-index">06 / GÉOGRAPHIE DES RISQUES</div><h3>CARTE THERMIQUE MONDIALE</h3><p>Projection simplifiée · régions et pays de démonstration · glisser pour déplacer, molette pour zoomer</p></div>
              <div class="who-map-controls">
                <div class="who-heat-indicator"><label class="who-mini-label" for="whoHeatSlider">INDICATEUR</label><span id="whoHeatMetricLabel">Retard de croissance</span><input id="whoHeatSlider" type="range" min="0" max="3" step="1" value="0" aria-label="Faire défiler les indicateurs de la carte thermique"></div>
                <button type="button" class="who-btn" id="whoHeatReset">Recentrer</button>
              </div>
            </div>
            <div class="who-heat-stage"><canvas id="whoHeatmap" tabindex="0" aria-label="Carte thermique interactive de la nutrition mondiale"></canvas></div>
            <div class="who-card-foot" style="justify-content:space-between;gap:10px;margin-top:9px;flex-wrap:wrap">
              <div class="who-chart-legend" style="margin:0"><span>Faible</span><i class="who-gradient-legend"></i><span>Critique</span></div>
              <span class="who-map-caption">Frontières schématiques · le jeu de données sert uniquement à la démonstration.</span>
            </div>
          </section>

          <section id="who-alerts-section" class="who-grid who-grid-action" aria-label="Alertes système et comparateur pays">
            <article class="who-panel who-panel-pad">
              <div class="who-card-head">
                <div><div class="who-section-index">07 / VEILLE AUTOMATISÉE</div><h3>ALERTES SYSTÈME</h3><p>Flux d'événements simulé · saisie progressive</p></div>
                <span class="who-pill green"><i class="who-live-dot"></i> FLUX ACTIF</span>
              </div>
              <div class="who-terminal" id="whoTerminal" role="log" aria-live="polite" aria-label="Journal d'alertes simulées">
                <div class="who-terminal-lines" aria-hidden="true"></div>
                <div class="who-alert-list" id="whoAlertList"></div>
              </div>
              <div class="who-terminal-status"><span>SYS.MONITOR <b>● CONNECTÉ</b></span><span id="whoAlertCount">0 événements</span></div>
            </article>
            <article id="who-compare-section" class="who-panel who-panel-pad who-compare-panel">
              <div class="who-card-head">
                <div><div class="who-section-index">08 / ANALYSE COMPARATIVE</div><h3>COMPARATEUR PAYS</h3><p>Lecture côte à côte sur dix marqueurs nutritionnels</p></div>
                <span class="who-pill">VERSUS</span>
              </div>
              <div class="who-compare-top">
                <div class="who-country-select-wrap"><label for="whoCountryA">Pays A</label><select id="whoCountryA" aria-label="Sélectionner le premier pays"></select></div>
                <div class="who-versus" aria-hidden="true">VS</div>
                <div class="who-country-select-wrap"><label for="whoCountryB">Pays B</label><select id="whoCountryB" aria-label="Sélectionner le second pays"></select></div>
              </div>
              <div class="who-score-row"><span>Score de couverture nutritionnelle · indicatif</span><strong><b id="whoScoreA">—</b> <span style="color:#7492a3">:</span> <b id="whoScoreB">—</b> <small id="whoScoreWinner" style="color:#83a3b4;font-size:9px;font-family:'Rajdhani',sans-serif"></small></strong></div>
              <div class="who-compare-list" id="whoCompareList"></div>
              <div class="who-compare-legend"><span id="whoCountryNameA">Pays A</span><span>mieux orienté par indicateur en vert</span><span id="whoCountryNameB">Pays B</span></div>
            </article>
          </section>

          <footer class="who-footer">
            <div class="who-ticker" aria-label="Indicateurs défilants">
              <div class="who-ticker-track" aria-hidden="true">
                <span><b>STUNTING</b> 22,3 % <em>↓ 4,1 pts</em></span><span><b>WASTING</b> 6,7 %</span><span><b>ANÉMIE WRA</b> 29,9 %</span><span><b>VITAMINE A</b> 190 M enfants</span><span><b>DOUBLE FARDEAU</b> 45 pays</span><span><b>ANÉMIE ENFANTS</b> 39,8 %</span><span><b>OBJECTIF</b> Nutrition 2030</span>
                <span><b>STUNTING</b> 22,3 % <em>↓ 4,1 pts</em></span><span><b>WASTING</b> 6,7 %</span><span><b>ANÉMIE WRA</b> 29,9 %</span><span><b>VITAMINE A</b> 190 M enfants</span><span><b>DOUBLE FARDEAU</b> 45 pays</span><span><b>ANÉMIE ENFANTS</b> 39,8 %</span><span><b>OBJECTIF</b> Nutrition 2030</span>
              </div>
            </div>
            <div class="who-footer-meta">
              <div class="who-footer-status"><span><i class="who-small-dot"></i>API <b>SIMULÉE</b></span><span>CPU <b id="whoCpu">18%</b></span><span>RAM <b id="whoRam">42%</b></span><span>LATENCE <b>24 ms</b></span><span>SYS <b>WHO-NSS · v1.0.4</b></span></div>
              <div class="who-legal">Démonstrateur visuel indépendant · données synthétiques · dernière mise à jour <span id="whoUpdated">—</span> UTC.</div>
            </div>
          </footer>
        </main>
      </div>
      <div class="who-tooltip" id="whoTooltip" role="tooltip"></div>
      <div class="who-cursor" id="whoCursor" aria-hidden="true"></div>
    </div>`;

  var root = document.getElementById('whoNutritionRoot');
  var tooltip = document.getElementById('whoTooltip');
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rafId = 0;
  var lastFrame = 0;
  var lastClockSecond = -1;
  var lastResize = 0;
  var alertTimer = 0;
  var statsTimer = 0;
  var glitchTimer = 0;
  var typeTimer = 0;
  var titleStarted = false;
  var glitchStarted = false;
  var cursor = document.getElementById('whoCursor');

  /* Indicative country records used by the globe, heatmap and bubble plot. */
  var countries = [
    { code:'GH', name:'Ghana', city:'Accra', region:'africa', lat:7.95, lon:-1.02, gdp:3200, pop:34.1, stunting:18.2, wasting:4.0, anemiaWomen:41.8, childAnemia:58.5, vitA:33, obesity:10.2, ebf:52, diversity:27, iodine:74, coverage:47 },
    { code:'NG', name:'Nigeria', city:'Abuja', region:'africa', lat:9.08, lon:8.68, gdp:2180, pop:223.8, stunting:31.5, wasting:6.9, anemiaWomen:54.0, childAnemia:68.0, vitA:40, obesity:10.1, ebf:29, diversity:16, iodine:63, coverage:31 },
    { code:'ET', name:'Éthiopie', city:'Addis-Abeba', region:'africa', lat:9.15, lon:40.49, gdp:1020, pop:126.5, stunting:36.8, wasting:7.3, anemiaWomen:23.0, childAnemia:57.0, vitA:55, obesity:5.0, ebf:59, diversity:13, iodine:89, coverage:28 },
    { code:'CD', name:'R.D. Congo', city:'Kinshasa', region:'africa', lat:-2.88, lon:23.66, gdp:660, pop:102.3, stunting:41.8, wasting:6.4, anemiaWomen:39.0, childAnemia:65.0, vitA:57, obesity:6.0, ebf:37, diversity:8, iodine:31, coverage:21 },
    { code:'NE', name:'Niger', city:'Niamey', region:'africa', lat:17.61, lon:8.08, gdp:620, pop:27.2, stunting:43.0, wasting:10.3, anemiaWomen:46.0, childAnemia:70.0, vitA:62, obesity:4.1, ebf:23, diversity:10, iodine:35, coverage:19 },
    { code:'KE', name:'Kenya', city:'Nairobi', region:'africa', lat:-0.02, lon:37.91, gdp:2100, pop:55.1, stunting:18.0, wasting:4.2, anemiaWomen:26.0, childAnemia:42.0, vitA:20, obesity:11.0, ebf:60, diversity:23, iodine:92, coverage:53 },
    { code:'IN', name:'Inde', city:'New Delhi', region:'asia', lat:22.97, lon:78.65, gdp:2480, pop:1428.6, stunting:35.5, wasting:18.7, anemiaWomen:53.0, childAnemia:58.0, vitA:22, obesity:7.5, ebf:58, diversity:11, iodine:76, coverage:55 },
    { code:'BD', name:'Bangladesh', city:'Dhaka', region:'asia', lat:23.68, lon:90.36, gdp:2680, pop:172.9, stunting:23.6, wasting:9.8, anemiaWomen:40.0, childAnemia:51.0, vitA:32, obesity:5.5, ebf:65, diversity:25, iodine:88, coverage:45 },
    { code:'PK', name:'Pakistan', city:'Islamabad', region:'asia', lat:30.37, lon:69.35, gdp:1360, pop:240.5, stunting:37.6, wasting:7.1, anemiaWomen:41.0, childAnemia:53.0, vitA:38, obesity:8.0, ebf:48, diversity:20, iodine:72, coverage:34 },
    { code:'CN', name:'Chine', city:'Pékin', region:'asia', lat:35.86, lon:104.20, gdp:12600, pop:1410.7, stunting:4.8, wasting:1.7, anemiaWomen:16.0, childAnemia:19.0, vitA:8, obesity:14.0, ebf:30, diversity:52, iodine:95, coverage:76 },
    { code:'BR', name:'Brésil', city:'Brasília', region:'americas', lat:-10.80, lon:-52.90, gdp:10300, pop:216.4, stunting:7.0, wasting:1.3, anemiaWomen:29.0, childAnemia:19.0, vitA:12, obesity:22.0, ebf:45, diversity:55, iodine:94, coverage:68 },
    { code:'PE', name:'Pérou', city:'Lima', region:'americas', lat:-9.19, lon:-75.02, gdp:6700, pop:34.4, stunting:10.1, wasting:0.6, anemiaWomen:20.0, childAnemia:30.0, vitA:7, obesity:20.0, ebf:68, diversity:44, iodine:92, coverage:75 },
    { code:'GT', name:'Guatemala', city:'Guatemala', region:'americas', lat:15.78, lon:-90.23, gdp:5600, pop:18.1, stunting:42.0, wasting:0.7, anemiaWomen:14.0, childAnemia:33.0, vitA:18, obesity:20.0, ebf:53, diversity:34, iodine:78, coverage:38 },
    { code:'US', name:'États-Unis', city:'Washington', region:'americas', lat:39.83, lon:-98.58, gdp:81600, pop:334.9, stunting:2.5, wasting:0.1, anemiaWomen:17.0, childAnemia:7.0, vitA:2, obesity:42.0, ebf:24, diversity:63, iodine:97, coverage:70 },
    { code:'FR', name:'France', city:'Paris', region:'europe', lat:46.23, lon:2.21, gdp:44400, pop:68.2, stunting:2.4, wasting:0.5, anemiaWomen:16.0, childAnemia:8.0, vitA:2, obesity:23.0, ebf:56, diversity:61, iodine:95, coverage:82 },
    { code:'EG', name:'Égypte', city:'Le Caire', region:'eastern-med', lat:26.82, lon:30.80, gdp:3500, pop:112.7, stunting:21.0, wasting:3.0, anemiaWomen:28.0, childAnemia:35.0, vitA:19, obesity:32.0, ebf:39, diversity:37, iodine:89, coverage:61 },
    { code:'PH', name:'Philippines', city:'Manille', region:'western-pacific', lat:12.88, lon:121.77, gdp:3630, pop:117.3, stunting:26.7, wasting:5.6, anemiaWomen:17.0, childAnemia:25.0, vitA:15, obesity:8.0, ebf:34, diversity:22, iodine:80, coverage:48 }
  ];

  var regionFactors = {
    world: { kpi:[1,1,1,1,1,1], radar:[1,1,1,1,1,1,1,1], name:'MONDE', burden:45, pop:1 },
    africa: { kpi:[1.31,1.12,1.17,1.25,1.18,1.28], radar:[1.31,1.12,.74,1.17,1.18,1.12,.84,1.22], name:'AFRIQUE', burden:19, pop:.28 },
    asia: { kpi:[1.05,1.16,1.22,1.08,.94,1.07], radar:[1.05,1.16,1.07,1.22,.94,1.02,1.05,1.12], name:'ASIE', burden:15, pop:.55 },
    americas: { kpi:[.52,.58,.72,.62,.56,.72], radar:[.52,.58,1.44,.72,.56,.9,1.28,.75], name:'AMÉRIQUES', burden:7, pop:.1 },
    europe: { kpi:[.2,.23,.58,.31,.18,.24], radar:[.2,.23,1.6,.58,.18,.56,1.35,.39], name:'EUROPE', burden:1, pop:.04 },
    'eastern-med': { kpi:[1.02,.94,1.13,1.04,1.12,1.09], radar:[1.02,.94,1.62,1.13,1.12,1.04,.98,1.17], name:'MÉDITERRANÉE ORIENTALE', burden:5, pop:.09 },
    'western-pacific': { kpi:[.68,.81,.75,.82,.73,.78], radar:[.68,.81,1.13,.75,.73,.91,1.19,.78], name:'PACIFIQUE OCCIDENTAL', burden:8, pop:.12 }
  };

  var regions = [
    { key:'africa', name:'Afrique', weight:30, burden:33, color:'#00b8d9' },
    { key:'asia', name:'Asie', weight:35, burden:29, color:'#8d56ff' },
    { key:'americas', name:'Amériques', weight:13, burden:18, color:'#00ba83' },
    { key:'europe', name:'Europe', weight:7, burden:8, color:'#f2b84a' },
    { key:'eastern-med', name:'Méditerranée orientale', weight:9, burden:27, color:'#ff7157' },
    { key:'western-pacific', name:'Pacifique occidental', weight:6, burden:16, color:'#4d91ff' }
  ];

  var state = {
    region: 'world',
    radarYear: 2024,
    heatMetric: 'stunting',
    heatZoom: 1,
    heatPanX: 0,
    heatPanY: 0,
    heatDrag: null,
    bubbleZoom: 1,
    bubblePanX: 0,
    bubblePanY: 0,
    bubbleDrag: null,
    treeSelected: null,
    treeHover: null,
    treeStart: 0,
    treeProgress: 1,
    globeAngle: 0,
    globeHover: false,
    globeHitPoints: [],
    globeSelected: null,
    timelineHover: null,
    heatHover: null,
    bubbleHover: null,
    lastClock: 0
  };

  var canvasIds = [
    'whoParticles','whoSparkStunting','whoGaugeWasting','whoRegionBars','whoDoubleGlobe','whoSparkVitA','whoLiquid',
    'whoGlobe','whoRadar','whoTimeline','whoTreemap','whoBubble','whoHeatmap'
  ];
  var canvas = {};
  canvasIds.forEach(function (id) { canvas[id] = document.getElementById(id); });

  function c2d(id) {
    var element = canvas[id] || document.getElementById(id);
    if (!element) return null;
    var rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var pxWidth = Math.max(1, Math.round(rect.width * ratio));
    var pxHeight = Math.max(1, Math.round(rect.height * ratio));
    if (element.width !== pxWidth || element.height !== pxHeight) {
      element.width = pxWidth;
      element.height = pxHeight;
    }
    var ctx = element.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { canvas:element, ctx:ctx, w:rect.width, h:rect.height, dpr:ratio };
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function formatPercent(value) { return Number(value).toLocaleString('fr-FR', { minimumFractionDigits:1, maximumFractionDigits:1 }) + ' %'; }
  function escapeHtml(text) { return String(text).replace(/[&<>"']/g, function (char) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]); }); }
  function activeRegion() { return regionFactors[state.region] || regionFactors.world; }
  function regionCountries(key) { return countries.filter(function (item) { return !key || key === 'world' || item.region === key; }); }
  function showTooltip(title, details, x, y) {
    if (!tooltip) return;
    tooltip.innerHTML = '<strong>' + escapeHtml(title) + '</strong><br>' + escapeHtml(details);
    tooltip.style.display = 'block';
    var left = (typeof x === 'number' ? x : 0) + 14;
    var top = (typeof y === 'number' ? y : 0) + 14;
    var rect = tooltip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth - 8) left = Math.max(8, left - rect.width - 28);
    if (top + rect.height > window.innerHeight - 8) top = Math.max(8, top - rect.height - 28);
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }
  function hideTooltip() { if (tooltip) tooltip.style.display = 'none'; }
  function localPoint(element, event) {
    var rect = element.getBoundingClientRect();
    return { x:event.clientX - rect.left, y:event.clientY - rect.top, rect:rect };
  }

  /* ----- KPI counters and compact Canvas visuals ----- */
  function animateCounter(element, target, decimals, suffix) {
    if (!element) return;
    var started = performance.now();
    var duration = prefersReduced ? 0 : 950;
    var from = Number(element.dataset.current || 0);
    function step(now) {
      var progress = duration ? clamp((now - started) / duration, 0, 1) : 1;
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = lerp(from, target, eased);
      element.textContent = value.toLocaleString('fr-FR', { minimumFractionDigits:decimals, maximumFractionDigits:decimals }) + (suffix || '');
      if (progress < 1) requestAnimationFrame(step);
      else element.dataset.current = String(target);
    }
    requestAnimationFrame(step);
  }

  var sparkStunting = [31.0,30.2,29.4,28.4,27.9,26.7,25.7,24.7,23.6,22.3];
  var sparkVitamin = [225,222,218,214,210,207,202,198,194,190];
  function drawSpark(id, data, color, suffix) {
    var box = c2d(id); if (!box) return;
    var ctx = box.ctx, w = box.w, h = box.h;
    ctx.clearRect(0,0,w,h);
    var min = Math.min.apply(null,data), max = Math.max.apply(null,data), pad = 4;
    var points = data.map(function (v,i) {
      return { x:pad + i*(w-2*pad)/Math.max(1,data.length-1), y:h-pad-((v-min)/(max-min || 1))*(h-2*pad) };
    });
    var fill = ctx.createLinearGradient(0,0,0,h); fill.addColorStop(0,color+'55'); fill.addColorStop(1,color+'00');
    ctx.beginPath(); ctx.moveTo(points[0].x,h); points.forEach(function (p) { ctx.lineTo(p.x,p.y); }); ctx.lineTo(points[points.length-1].x,h); ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
    ctx.beginPath(); points.forEach(function (p,i) { if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
    ctx.lineWidth=1.8; ctx.strokeStyle=color; ctx.shadowColor=color; ctx.shadowBlur=7; ctx.stroke(); ctx.shadowBlur=0;
    var last=points[points.length-1]; ctx.beginPath();ctx.arc(last.x,last.y,2.4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
    if (suffix) { ctx.font='8px Rajdhani';ctx.fillStyle='rgba(177,205,219,.55)';ctx.fillText(suffix,3,9); }
  }

  function drawGauge(value) {
    var box = c2d('whoGaugeWasting'); if (!box) return;
    var ctx=box.ctx,w=box.w,h=box.h,cx=w*.5,cy=h*.57,r=Math.min(h*.39,w*.18);
    ctx.clearRect(0,0,w,h);
    var start=Math.PI*.76,sweep=Math.PI*1.48;
    ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,r,start,start+sweep);ctx.strokeStyle='rgba(255,255,255,.1)';ctx.stroke();
    var color=value>10?'#ff4c3e':'#ff8a50';
    ctx.beginPath();ctx.arc(cx,cy,r,start,start+sweep*clamp(value/15,0,1));ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=8;ctx.stroke();ctx.shadowBlur=0;
    ctx.font='700 9px Orbitron';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(Math.round(value/15*100)+'%',cx,cy+3);
    ctx.font='8px Rajdhani';ctx.fillStyle='rgba(174,195,205,.7)';ctx.fillText('NIVEAU',cx,cy+14);ctx.textAlign='left';
  }

  function drawRegionalBars() {
    var box=c2d('whoRegionBars');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var labels=['AF','AS','AM','EU','MO','PO'];
    var vals=[34.5,29.2,17.7,13.1,33.7,22.4];
    var gap=8,bw=(w-8-gap*(labels.length-1))/labels.length,base=h-9;
    vals.forEach(function (v,i) {
      var x=4+i*(bw+gap),bh=(v/50)*(h-12);
      var grad=ctx.createLinearGradient(0,base-bh,0,base);grad.addColorStop(0,i===0?'#c39bff':'rgba(123,47,255,.75)');grad.addColorStop(1,'rgba(123,47,255,.16)');
      ctx.fillStyle=grad;ctx.fillRect(x,base-bh,bw,bh);
      ctx.fillStyle='rgba(177,196,209,.65)';ctx.font='7px Rajdhani';ctx.textAlign='center';ctx.fillText(labels[i],x+bw/2,h-1);
    });ctx.textAlign='left';
  }

  var doubleDots=[[-.55,-.13],[-.35,.03],[-.04,-.05],[.22,-.12],[.51,.12],[.67,-.03],[-.2,.21],[.12,.28],[.4,.27],[-.66,.21]];
  function drawDoubleGlobe(time) {
    var box=c2d('whoDoubleGlobe');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h,cx=w*.62,cy=h*.53,r=Math.min(h*.47,w*.18);
    ctx.clearRect(0,0,w,h);
    var grad=ctx.createRadialGradient(cx-r*.4,cy-r*.4,1,cx,cy,r*1.25);grad.addColorStop(0,'rgba(0,212,255,.42)');grad.addColorStop(1,'rgba(7,32,52,.15)');
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='rgba(0,212,255,.45)';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx,cy,r*.53,r,0,0,Math.PI*2);ctx.strokeStyle='rgba(0,212,255,.18)';ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx,cy,r,r*.42,0,0,Math.PI*2);ctx.strokeStyle='rgba(0,212,255,.18)';ctx.stroke();
    doubleDots.forEach(function(p,i){var x=cx+p[0]*r,y=cy+p[1]*r, pulse=.9+.25*Math.sin(time/400+i);ctx.beginPath();ctx.arc(x,y,1.6*pulse,0,Math.PI*2);ctx.fillStyle=i%2?'#ff5476':'#00ff88';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=6;ctx.fill();ctx.shadowBlur=0;});
    ctx.font='8px Rajdhani';ctx.fillStyle='rgba(180,199,211,.7)';ctx.fillText('DUAL BURDEN',4,h-2);
  }

  function drawLiquid(time) {
    var box=c2d('whoLiquid');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var level=.52,amp=3.5,phase=time/650;
    ctx.save();ctx.beginPath();ctx.roundRect(1,2,w-2,h-4,6);ctx.clip();
    ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(0,0,w,h);
    var top=h*(1-level);
    ctx.beginPath();ctx.moveTo(0,top);
    for(var x=0;x<=w+4;x+=4)ctx.lineTo(x,top+Math.sin(x/17+phase)*amp);
    ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();
    var grad=ctx.createLinearGradient(0,top,0,h);grad.addColorStop(0,'rgba(255,83,100,.5)');grad.addColorStop(.45,'rgba(255,83,100,.26)');grad.addColorStop(1,'rgba(255,107,53,.12)');ctx.fillStyle=grad;ctx.fill();
    ctx.strokeStyle='#ff7761';ctx.lineWidth=1.4;ctx.stroke();
    ctx.restore();
  }

  /* ----- Shared globe/map geometry ----- */
  function projectGlobe(lat, lon, cx, cy, radius, angle) {
    var phi=lat*Math.PI/180, lam=lon*Math.PI/180+angle;
    var x=Math.cos(phi)*Math.sin(lam), y=Math.sin(phi), z=Math.cos(phi)*Math.cos(lam);
    return {x:cx+x*radius,y:cy-y*radius,z:z};
  }

  var landPolygons=[
    [[-168,70],[-148,72],[-130,55],[-123,48],[-125,34],[-116,28],[-109,22],[-100,20],[-96,16],[-88,16],[-82,9],[-77,9],[-79,20],[-74,26],[-80,32],[-75,39],[-67,45],[-60,51],[-65,59],[-80,63],[-94,69],[-112,72],[-130,72],[-147,75]],
    [[-81,12],[-72,8],[-63,9],[-52,3],[-48,-1],[-45,-8],[-39,-14],[-43,-23],[-48,-29],[-54,-34],[-59,-39],[-67,-55],[-73,-48],[-75,-35],[-78,-18],[-80,-4]],
    [[-11,36],[-10,44],[-5,50],[2,54],[12,58],[22,62],[33,58],[42,54],[39,47],[31,43],[25,37],[15,37],[8,35],[1,38]],
    [[-17,36],[-8,35],[2,37],[12,33],[20,32],[32,31],[35,22],[43,12],[50,10],[43,-1],[41,-12],[36,-20],[31,-28],[23,-34],[17,-35],[12,-28],[10,-17],[4,-10],[-1,4],[-8,5],[-14,14],[-17,25]],
    [[34,30],[42,38],[55,47],[67,54],[80,57],[95,65],[111,62],[126,54],[139,50],[151,59],[163,60],[177,52],[165,44],[148,42],[138,34],[130,30],[122,23],[114,21],[110,11],[104,5],[101,1],[105,-5],[119,-8],[131,-4],[141,-6],[151,-10],[153,-23],[145,-38],[132,-34],[121,-29],[114,-22],[110,-11],[101,-2],[92,9],[83,8],[77,18],[69,23],[59,25],[51,29],[43,33]],
    [[-8,58],[-3,59],[0,55],[-2,51],[-6,50],[-8,54]],
    [[112,-11],[130,-12],[142,-16],[153,-25],[148,-38],[137,-43],[124,-36],[115,-27]],
    [[46,-13],[50,-17],[49,-25],[45,-25],[43,-17]]
  ];

  function drawGlobe(time, delta) {
    var box=c2d('whoGlobe');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var cx=w*.5,cy=h*.51,r=Math.min(h*.405,w*.29);
    if(!state.globeHover && !prefersReduced) state.globeAngle += delta*.000024;
    var halo=ctx.createRadialGradient(cx,cy,r*.48,cx,cy,r*1.38);halo.addColorStop(0,'rgba(0,212,255,.12)');halo.addColorStop(.65,'rgba(0,130,205,.065)');halo.addColorStop(1,'rgba(0,48,85,0)');
    ctx.beginPath();ctx.arc(cx,cy,r*1.38,0,Math.PI*2);ctx.fillStyle=halo;ctx.fill();
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
    var sphere=ctx.createRadialGradient(cx-r*.37,cy-r*.43,r*.05,cx,cy,r*1.18);sphere.addColorStop(0,'#12385a');sphere.addColorStop(.46,'#092744');sphere.addColorStop(.82,'#06172c');sphere.addColorStop(1,'#020a18');ctx.fillStyle=sphere;ctx.fillRect(cx-r,cy-r,2*r,2*r);
    var shade=ctx.createRadialGradient(cx-r*.2,cy-r*.3,r*.35,cx,cy,r*1.08);shade.addColorStop(0,'rgba(0,212,255,.05)');shade.addColorStop(.75,'rgba(1,6,17,.02)');shade.addColorStop(1,'rgba(0,1,8,.75)');ctx.fillStyle=shade;ctx.fillRect(cx-r,cy-r,2*r,2*r);
    ctx.lineWidth=.65;ctx.strokeStyle='rgba(61,190,224,.24)';
    [-60,-30,0,30,60].forEach(function(lat){ctx.beginPath();var open=false;for(var lon=-180;lon<=180;lon+=4){var p=projectGlobe(lat,lon,cx,cy,r,state.globeAngle);if(p.z>0){if(!open){ctx.moveTo(p.x,p.y);open=true;}else ctx.lineTo(p.x,p.y);}else open=false;}ctx.stroke();});
    for(var mer=-150;mer<=180;mer+=30){ctx.beginPath();var openM=false;for(var la=-88;la<=88;la+=3){var q=projectGlobe(la,mer,cx,cy,r,state.globeAngle);if(q.z>0){if(!openM){ctx.moveTo(q.x,q.y);openM=true;}else ctx.lineTo(q.x,q.y);}else openM=false;}ctx.stroke();}
    landPolygons.forEach(function(poly){ctx.beginPath();var opened=false;poly.forEach(function(ll){var p=projectGlobe(ll[1],ll[0],cx,cy,r,state.globeAngle);if(p.z>.02){if(!opened){ctx.moveTo(p.x,p.y);opened=true;}else ctx.lineTo(p.x,p.y);}else if(opened){ctx.strokeStyle='rgba(0,255,185,.52)';ctx.lineWidth=1.35;ctx.stroke();ctx.beginPath();opened=false;}});if(opened){ctx.strokeStyle='rgba(0,255,185,.52)';ctx.lineWidth=1.35;ctx.stroke();}});
    /* Quiet orbital arcs make the schematic globe feel deep without textures. */
    ctx.strokeStyle='rgba(0,212,255,.09)';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(cx,cy,r*.92,r*.38,-.18,0,Math.PI*2);ctx.stroke();
    ctx.restore();
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(0,212,255,.8)';ctx.lineWidth=1.2;ctx.shadowColor='#00d4ff';ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;
    state.globeHitPoints=[];
    var active=regionCountries(state.region);
    countries.forEach(function(country,index){
      var p=projectGlobe(country.lat,country.lon,cx,cy,r,state.globeAngle);
      if(p.z<=.035)return;
      var selected=active.indexOf(country)>=0;
      var radius=clamp(2+country.stunting*.105,2.5,7.4);
      var critical=country.stunting>=35;
      var color=critical?'#ff3d61':country.stunting>=20?'#ffab4c':'#00ff88';
      var pulse=.78+.22*Math.sin(time/360+index*1.7);
      ctx.beginPath();ctx.arc(p.x,p.y,radius*pulse,0,Math.PI*2);
      ctx.fillStyle=color;ctx.globalAlpha=selected?1:.24;ctx.shadowColor=color;ctx.shadowBlur=selected?12:3;ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(p.x,p.y,radius+4,0,Math.PI*2);ctx.strokeStyle=color;ctx.globalAlpha=selected?.15:.04;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
      state.globeHitPoints.push({x:p.x,y:p.y,r:Math.max(10,radius+4),country:country});
    });
    if(state.globeSelected){
      var selectedCountry=countries.filter(function(c){return c.code===state.globeSelected;})[0];
      if(selectedCountry){var sp=projectGlobe(selectedCountry.lat,selectedCountry.lon,cx,cy,r,state.globeAngle);if(sp.z>.03){ctx.beginPath();ctx.arc(sp.x,sp.y,9+Math.sin(time/170)*2,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.globalAlpha=.7;ctx.stroke();ctx.globalAlpha=1;}}
    }
  }

  /* ----- Canvas charts: radar, timeline, treemap, bubble plot, heatmap ----- */
  var radarYears=[2015,2020,2024];
  var radarValues={
    2015:[27.5,8.3,6.0,32.0,35,18,25,14],
    2020:[24.8,7.3,7.2,30.5,30,17,22,13],
    2024:[22.3,6.7,8.3,29.9,27,16,20,12]
  };
  var radarAxes=['Stunting','Wasting','Obésité','Anémie','Vit. A','Zinc','Iode','Maternel'];
  var radarColors=['#00d4ff','#ff6b35','#00ff88','#a47bff','#ffd166','#25c8df','#ff5ba7','#68f3bb'];
  function interpolateRadar(year) {
    var y0=year<=2020?2015:2020,y1=year<=2020?2020:2024;
    var t=clamp((year-y0)/(y1-y0),0,1);
    return radarValues[y0].map(function(v,i){return lerp(v,radarValues[y1][i],t);});
  }
  function drawRadar() {
    var box=c2d('whoRadar');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var cx=w*.5,cy=h*.51,r=Math.min(w*.30,h*.34),n=radarAxes.length;
    for(var k=1;k<=5;k++){
      var rr=r*k/5;ctx.beginPath();
      for(var i=0;i<n;i++){var a=-Math.PI/2+i*Math.PI*2/n,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.strokeStyle=k===5?'rgba(118,179,209,.28)':'rgba(118,179,209,.13)';ctx.lineWidth=.8;ctx.stroke();
      ctx.font='8px Rajdhani';ctx.fillStyle='rgba(137,168,185,.55)';ctx.fillText(String(k*10),cx+4,cy-rr+8);
    }
    for(var axis=0;axis<n;axis++){
      var angle=-Math.PI/2+axis*Math.PI*2/n,ax=cx+Math.cos(angle)*r,ay=cy+Math.sin(angle)*r;
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(ax,ay);ctx.strokeStyle=radarColors[axis]+'65';ctx.lineWidth=.8;ctx.stroke();
      var lx=cx+Math.cos(angle)*(r+17),ly=cy+Math.sin(angle)*(r+17);ctx.font='10px Rajdhani';ctx.fillStyle='#a8c1ce';ctx.textAlign=Math.cos(angle)<-.2?'right':Math.cos(angle)>.2?'left':'center';ctx.textBaseline=Math.sin(angle)<-.35?'bottom':Math.sin(angle)>.35?'top':'middle';ctx.fillText(radarAxes[axis],lx,ly);
    }
    var reg=activeRegion();
    radarYears.forEach(function(year,index){
      var opacity=index===2?.78:index===1?.54:.35;
      ctx.beginPath();radarValues[year].forEach(function(value,i){var angle=-Math.PI/2+i*Math.PI*2/n,adjusted=clamp(value*reg.radar[i],0,50),rr=adjusted/50*r,x=cx+Math.cos(angle)*rr,y=cy+Math.sin(angle)*rr;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();
      var color=index===0?'#ffb454':index===1?'#a47bff':'#00d4ff';ctx.fillStyle=color+(index===2?'16':'0c');ctx.strokeStyle=color;ctx.globalAlpha=opacity;ctx.lineWidth=index===2?1.5:1;ctx.stroke();ctx.fill();ctx.globalAlpha=1;
      if(index===2)radarValues[year].forEach(function(value,i){var angle=-Math.PI/2+i*Math.PI*2/n,rr=clamp(value*reg.radar[i],0,50)/50*r;ctx.beginPath();ctx.arc(cx+Math.cos(angle)*rr,cy+Math.sin(angle)*rr,2.5,0,Math.PI*2);ctx.fillStyle=radarColors[i];ctx.shadowColor=radarColors[i];ctx.shadowBlur=5;ctx.fill();ctx.shadowBlur=0;});
    });
    var interpolated=interpolateRadar(state.radarYear);
    ctx.beginPath();interpolated.forEach(function(value,i){var a=-Math.PI/2+i*Math.PI*2/n,rr=clamp(value*reg.radar[i],0,50)/50*r,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.closePath();ctx.fillStyle='rgba(0,255,136,.07)';ctx.strokeStyle='#00ff88';ctx.lineWidth=1.35;ctx.setLineDash([4,3]);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
  }

  var years=[];
  var timelineSeries={stunting:[],wasting:[],anemia:[],obesity:[]};
  for(var yi=0;yi<=20;yi++){
    years.push(2004+yi);
    var x=yi/20;
    timelineSeries.stunting.push(32.1-9.8*x+Math.sin(yi*1.12)*.38);
    timelineSeries.wasting.push(8.6-1.9*x+Math.sin(yi*.9+.4)*.19);
    timelineSeries.anemia.push(33.8-3.9*x+Math.sin(yi*.72+.6)*.28);
    timelineSeries.obesity.push(8.3+5.6*x+Math.sin(yi*.75)*.4);
  }
  timelineSeries.stunting[20]=22.3;timelineSeries.wasting[20]=6.7;timelineSeries.anemia[20]=29.9;timelineSeries.obesity[20]=13.9;
  function timelineVal(key,year) {
    if(year<=2024){var pos=clamp(year-2004,0,20),lo=Math.floor(pos),hi=Math.min(20,lo+1),t=pos-lo;return lerp(timelineSeries[key][lo],timelineSeries[key][hi],t);}
    var start=timelineSeries[key][20],end=key==='stunting'?19.8:key==='wasting'?5.8:key==='anemia'?27.7:16.1;return lerp(start,end,(year-2024)/6);
  }
  function drawTimeline() {
    var box=c2d('whoTimeline');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var L=38,R=13,T=16,B=30,pw=w-L-R,ph=h-T-B,yMax=50;
    [0,10,20,30,40,50].forEach(function(v){var y=T+ph*(1-v/yMax);ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.strokeStyle='rgba(128,172,193,.12)';ctx.lineWidth=.8;ctx.stroke();ctx.font='8px Rajdhani';ctx.fillStyle='rgba(139,168,184,.62)';ctx.textAlign='right';ctx.fillText(v+'%',L-5,y+3);});
    [2004,2008,2012,2016,2020,2024,2030].forEach(function(year){var x=L+pw*(year-2004)/26;ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,T+ph);ctx.strokeStyle=year===2024?'rgba(0,212,255,.3)':'rgba(128,172,193,.07)';ctx.setLineDash(year>2024?[3,4]:[]);ctx.stroke();ctx.setLineDash([]);ctx.font='8px Rajdhani';ctx.fillStyle='rgba(139,168,184,.68)';ctx.textAlign='center';ctx.fillText(String(year),x,T+ph+15);});
    var colors={stunting:'#00d4ff',wasting:'#ff6b35',anemia:'#a47bff',obesity:'#00ff88'};
    var region=activeRegion();
    var scaled={stunting:region.kpi[0],wasting:region.kpi[1],anemia:region.kpi[2],obesity:state.region==='world'?1.0:(state.region==='africa'?0.8:state.region==='americas'?1.45:1.15)};
    var keys=['stunting','wasting','anemia','obesity'];
    keys.forEach(function(key,seriesIndex){
      var values=[];for(var year=2004;year<=2024;year++)values.push(timelineVal(key,year)*scaled[key]);
      var points=values.map(function(v,i){return{x:L+pw*(i/26),y:T+ph*(1-clamp(v,0,yMax)/yMax)};});
      if(seriesIndex===0){ctx.beginPath();points.forEach(function(p,i){if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.lineTo(points[points.length-1].x,T+ph);ctx.lineTo(points[0].x,T+ph);ctx.closePath();var area=ctx.createLinearGradient(0,T,0,T+ph);area.addColorStop(0,'rgba(0,212,255,.12)');area.addColorStop(1,'rgba(0,212,255,0)');ctx.fillStyle=area;ctx.fill();}
      ctx.beginPath();points.forEach(function(p,i){if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.lineWidth=1.8;ctx.strokeStyle=colors[key];ctx.shadowColor=colors[key];ctx.shadowBlur=6;ctx.stroke();ctx.shadowBlur=0;
      var finalVal=timelineVal(key,2030)*scaled[key],startVal=timelineVal(key,2024)*scaled[key],p0={x:L+pw*20/26,y:T+ph*(1-clamp(startVal,0,yMax)/yMax)},p1={x:L+pw,y:T+ph*(1-clamp(finalVal,0,yMax)/yMax)};
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.setLineDash([4,4]);ctx.strokeStyle=colors[key];ctx.globalAlpha=.62;ctx.lineWidth=1.4;ctx.stroke();ctx.globalAlpha=1;ctx.setLineDash([]);
    });
    if(state.timelineHover!==null){var year=state.timelineHover;var xx=L+pw*(year-2004)/26;ctx.beginPath();ctx.moveTo(xx,T);ctx.lineTo(xx,T+ph);ctx.strokeStyle='rgba(235,251,255,.46)';ctx.setLineDash([2,3]);ctx.stroke();ctx.setLineDash([]);}
    ctx.textAlign='left';
  }

  function treemapSplit(items,x,y,w,h,depth,out){
    if(!items.length)return;
    if(items.length===1){out.push({item:items[0],x:x,y:y,w:w,h:h});return;}
    var total=items.reduce(function(a,b){return a+b.weight;},0),sum=0,cut=1;
    for(var i=0;i<items.length-1;i++){sum+=items[i].weight;if(sum>=total/2){cut=i+1;break;}cut=i+1;}
    var first=items.slice(0,cut),second=items.slice(cut);if(!second.length){first=items.slice(0,items.length-1);second=[items[items.length-1]];}
    var firstWeight=first.reduce(function(a,b){return a+b.weight;},0),ratio=firstWeight/total;
    if(w>=h){var split=w*ratio;treemapSplit(first,x,y,split,h,depth+1,out);treemapSplit(second,x+split,y,w-split,h,depth+1,out);}
    else{var splitH=h*ratio;treemapSplit(first,x,y,w,splitH,depth+1,out);treemapSplit(second,x,y+splitH,w,h-splitH,depth+1,out);}
  }
  function regionColor(burden){
    var stops=[{v:0,c:[0,255,136]},{v:20,c:[255,209,102]},{v:40,c:[255,107,53]},{v:60,c:[255,49,93]}];
    var t=clamp(burden,0,60);for(var i=0;i<stops.length-1;i++){if(t<=stops[i+1].v){var f=(t-stops[i].v)/(stops[i+1].v-stops[i].v),a=stops[i].c,b=stops[i+1].c;return 'rgb('+Math.round(lerp(a[0],b[0],f))+','+Math.round(lerp(a[1],b[1],f))+','+Math.round(lerp(a[2],b[2],f))+')';}}
    return 'rgb(255,49,93)';
  }
  function alphaColor(color,alpha){if(String(color).indexOf('rgb(')!==0)return color;var rgb=String(color).slice(4,-1).split(',');return 'rgba('+rgb[0].trim()+','+rgb[1].trim()+','+rgb[2].trim()+','+alpha+')';}
  function treeItems(){
    if(!state.treeSelected)return regions.map(function(r){return {key:r.key,name:r.name,weight:r.weight,burden:r.burden,color:r.color,region:r.key};});
    var set=regionCountries(state.treeSelected).slice().sort(function(a,b){return b.stunting-a.stunting;});
    var detail=set.slice(0,5).map(function(c){return {key:c.code,name:c.name,weight:Math.max(4,c.pop*c.stunting/100),burden:c.stunting,color:c.region,region:c.region};});
    if(set.length>5)detail.push({key:'other',name:'Autres pays',weight:Math.max(5,set.slice(5).reduce(function(s,c){return s+c.pop*c.stunting/100;},0)),burden:22,color:state.treeSelected,region:state.treeSelected});
    return detail.length?detail:[{key:'demo',name:'Données simulées',weight:1,burden:20,color:state.treeSelected,region:state.treeSelected}];
  }
  function drawTreemap(time){
    var box=c2d('whoTreemap');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var pad=8,items=treeItems(),rects=[];treemapSplit(items,pad,pad,w-pad*2,h-pad*2,0,rects);
    var progress=state.treeProgress;if(progress<1){progress=clamp((time-state.treeStart)/520,0,1);state.treeProgress=progress;}
    var eased=1-Math.pow(1-progress,3),centerX=w/2,centerY=h/2;
    rects.forEach(function(r){
      var x=centerX+(r.x-centerX)*eased,y=centerY+(r.y-centerY)*eased,rw=r.w*eased,rh=r.h*eased;
      var hover=state.treeHover===r.item.key;
      var padGap=3;x+=padGap/2;y+=padGap/2;rw=Math.max(1,rw-padGap);rh=Math.max(1,rh-padGap);
      var color=state.treeSelected?regionColor(r.item.burden):regionColor(r.item.burden);
      ctx.save();ctx.globalAlpha=.45+.55*eased;
      ctx.fillStyle=alphaColor(color,.17);ctx.globalAlpha*=.7;ctx.fillRect(x,y,rw,rh);ctx.globalAlpha=.45+.55*eased;
      ctx.strokeStyle=color;ctx.lineWidth=hover?2:1;ctx.shadowColor=color;ctx.shadowBlur=hover?16:6;ctx.strokeRect(x+.5,y+.5,rw-1,rh-1);ctx.shadowBlur=0;
      var grad=ctx.createLinearGradient(x,y,x+rw,y+rh);grad.addColorStop(0,alphaColor(color,.17));grad.addColorStop(1,'rgba(2,10,24,.04)');ctx.fillStyle=grad;ctx.fillRect(x+1,y+1,rw-2,rh-2);
      if(rw>48&&rh>28){ctx.textAlign='left';ctx.fillStyle='#e9f6ff';ctx.font=(rw<90?'9px':'11px')+' Rajdhani';ctx.fillText(r.item.name,x+8,y+17,Math.max(20,rw-14));if(rh>48){ctx.font='9px Rajdhani';ctx.fillStyle='rgba(195,218,230,.73)';ctx.fillText((state.treeSelected?'Prévalence':'charge relative')+' · '+r.item.burden+'%',x+8,y+32,Math.max(20,rw-14));}}
      ctx.restore();
    });
    if(state.treeSelected){ctx.fillStyle='rgba(3,12,26,.78)';ctx.fillRect(0,0,w,25);ctx.fillStyle='#93eaff';ctx.font='10px Orbitron';ctx.fillText((regions.filter(function(r){return r.key===state.treeSelected;})[0]||{name:'Région'}).name.toUpperCase()+' · SUBDIVISION',10,16);}
  }

  var regionColors={africa:'#00d4ff',asia:'#a47bff',americas:'#00ff88',europe:'#ffd166','eastern-med':'#ff6b35','western-pacific':'#4d91ff'};
  function drawBubble(time){
    var box=c2d('whoBubble');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var L=46,R=16,T=18,B=34,pw=w-L-R,ph=h-T-B;
    var scale=state.bubbleZoom,ox=state.bubblePanX,oy=state.bubblePanY;
    ctx.save();ctx.beginPath();ctx.rect(L,T,pw,ph);ctx.clip();
    for(var g=0;g<=4;g++){var gy=T+ph*g/4;ctx.beginPath();ctx.moveTo(L,gy);ctx.lineTo(L+pw,gy);ctx.strokeStyle='rgba(130,170,190,.12)';ctx.stroke();}
    var ticks=[0,1000,5000,10000,25000,50000,80000];ticks.forEach(function(v){var tx=L+pw*(Math.log10(v+1)/Math.log10(80001));ctx.beginPath();ctx.moveTo(tx,T);ctx.lineTo(tx,T+ph);ctx.strokeStyle='rgba(130,170,190,.1)';ctx.stroke();ctx.fillStyle='rgba(145,174,190,.65)';ctx.font='8px Rajdhani';ctx.textAlign='center';ctx.fillText(v===0?'0':(v/1000)+'k',tx,T+ph+14);});
    [0,15,30,45,60].forEach(function(v,i){ctx.fillStyle='rgba(145,174,190,.65)';ctx.font='8px Rajdhani';ctx.textAlign='right';ctx.fillText(v+'%',L-6,T+ph*i/4+3);});
    state.bubbleHitPoints=[];
    countries.forEach(function(c,index){
      var value=c.stunting*activeRegion().kpi[0];
      var x=L+pw*(Math.log10(c.gdp+1)/Math.log10(80001))*scale+ox,y=T+ph*(1-clamp(value,0,60)/60)*scale+oy;
      var affected=c.pop*value/100,rad=clamp(Math.sqrt(affected)*.56,5,17);
      var float=prefersReduced?0:Math.sin(time/640+index*1.37)*2.3;
      y+=float;
      var color=regionColors[c.region]||'#ffd166';
      ctx.beginPath();ctx.arc(x,y,rad+(state.bubbleHover===c.code?3:0),0,Math.PI*2);ctx.fillStyle=color;ctx.globalAlpha=.72;ctx.shadowColor=color;ctx.shadowBlur=state.bubbleHover===c.code?18:8;ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.strokeStyle='rgba(235,251,255,.65)';ctx.lineWidth=.7;ctx.stroke();
      if(rad>9){ctx.fillStyle='#f4fbff';ctx.font='8px Rajdhani';ctx.textAlign='center';ctx.fillText(c.code,x,y+3);}
      if(state.bubbleHover===c.code){ctx.fillStyle='#f1faff';ctx.font='10px Rajdhani';ctx.textAlign='left';ctx.fillText(c.name,x+rad+4,y-5);}
      state.bubbleHitPoints.push({x:x,y:y,r:rad+5,country:c});
    });
    ctx.restore();
    ctx.fillStyle='rgba(155,182,196,.68)';ctx.font='9px Rajdhani';ctx.textAlign='center';ctx.fillText('PIB / habitant (USD)',L+pw/2,h-5);ctx.save();ctx.translate(10,T+ph/2);ctx.rotate(-Math.PI/2);ctx.fillText('Prévalence du retard de croissance',0,0);ctx.restore();ctx.textAlign='left';
  }

  var heatContinents=[
    [[-168,70],[-140,58],[-128,50],[-124,38],[-112,28],[-97,18],[-83,9],[-78,18],[-82,31],[-70,44],[-60,52],[-80,63],[-105,71],[-137,73]],
    [[-80,11],[-69,7],[-57,2],[-48,-12],[-43,-23],[-52,-33],[-65,-55],[-75,-42],[-77,-20]],
    [[-10,36],[1,43],[16,57],[31,60],[42,49],[34,36],[27,34],[20,32],[10,36]],
    [[-17,36],[3,36],[16,33],[32,30],[41,11],[51,11],[43,-12],[34,-28],[22,-35],[12,-25],[7,-4],[-7,5],[-16,20]],
    [[31,30],[44,42],[65,53],[93,62],[120,53],[144,58],[170,52],[156,40],[140,34],[125,19],[108,9],[99,3],[110,-10],[130,-12],[150,-20],[145,-38],[125,-34],[113,-19],[102,-5],[86,9],[69,22],[50,29]],
    [[112,-11],[131,-12],[151,-23],[147,-38],[133,-43],[116,-33]]
  ];
  function mapXY(lon,lat,w,h){return {x:(lon+180)/360*w,y:(90-lat)/180*h};}
  function heatValue(country){return country[state.heatMetric]||0;}
  function drawHeatmap(time){
    var box=c2d('whoHeatmap');if(!box)return;
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    var zoom=state.heatZoom,ox=state.heatPanX,oy=state.heatPanY;
    var mapW=w*zoom,mapH=h*zoom,baseX=(w-mapW)/2+ox,baseY=(h-mapH)/2+oy;
    function xy(lon,lat){var p=mapXY(lon,lat,mapW,mapH);return {x:baseX+p.x,y:baseY+p.y};}
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
    ctx.fillStyle='rgba(0,10,24,.32)';ctx.fillRect(0,0,w,h);
    for(var mer=-150;mer<=180;mer+=30){var a=xy(mer,90),b=xy(mer,-90);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='rgba(89,151,180,.1)';ctx.lineWidth=.7;ctx.stroke();}
    for(var lat=-60;lat<=60;lat+=30){var c=xy(-180,lat),d=xy(180,lat);ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.strokeStyle='rgba(89,151,180,.1)';ctx.lineWidth=.7;ctx.stroke();}
    heatContinents.forEach(function(poly){ctx.beginPath();poly.forEach(function(ll,i){var p=xy(ll[0],ll[1]);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.closePath();ctx.fillStyle='rgba(32,96,122,.1)';ctx.fill();ctx.strokeStyle='rgba(150,214,233,.3)';ctx.lineWidth=.8;ctx.stroke();});
    /* Light schematic borders across land masses. */
    [[-125,32,-67,32],[-112,50,-70,50],[-100,15,-100,58],[-76,-8,-52,-8],[-68,-25,-57,-25],[-5,5,35,5],[10,-25,10,31],[20,5,40,5],[37,34,125,34],[60,10,60,50],[95,20,145,20],[113,-5,145,-5]].forEach(function(line){var p=xy(line[0],line[1]),q=xy(line[2],line[3]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='rgba(221,246,255,.15)';ctx.lineWidth=.65;ctx.stroke();});
    state.heatHitPoints=[];
    countries.forEach(function(country,index){
      var p=xy(country.lon,country.lat),v=heatValue(country),normalized=clamp(v/55,0,1),color=regionColor(normalized*60),rad=clamp(Math.min(mapW/360,mapH/180)*3.8,6,12),pulse=.82+.18*Math.sin(time/340+index);
      if(v>=30){ctx.beginPath();ctx.arc(p.x,p.y,rad+5*pulse,0,Math.PI*2);ctx.strokeStyle=color;ctx.globalAlpha=.28;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;}
      ctx.beginPath();ctx.arc(p.x,p.y,rad*pulse,0,Math.PI*2);ctx.fillStyle=color;ctx.globalAlpha=.78;ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(p.x,p.y,rad*pulse,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,.74)';ctx.lineWidth=.8;ctx.stroke();
      if(mapW>500){ctx.font='8px Rajdhani';ctx.textAlign='left';ctx.fillStyle='rgba(239,251,255,.83)';ctx.fillText(country.code,p.x+rad+2,p.y+3);}
      state.heatHitPoints.push({x:p.x,y:p.y,r:rad+7,country:country,value:v});
    });
    ctx.restore();
    var grd=ctx.createLinearGradient(w*.28,0,w*.72,0);grd.addColorStop(0,'rgba(0,212,255,.0)');grd.addColorStop(.5,'rgba(0,212,255,.08)');grd.addColorStop(1,'rgba(0,212,255,0)');ctx.fillStyle=grd;ctx.fillRect(0,0,w,2);
  }

  /* ----- Pointer interaction and chart tooltips ----- */
  function nearest(items,x,y){var best=null,dist=Infinity;items.forEach(function(item){var d=Math.hypot(item.x-x,item.y-y);if(d<item.r+2&&d<dist){best=item;dist=d;}});return best;}

  var globe=canvas.whoGlobe;
  globe.addEventListener('pointerenter',function(){state.globeHover=true;});
  globe.addEventListener('pointerleave',function(){state.globeHover=false;hideTooltip();});
  globe.addEventListener('pointermove',function(event){
    var p=localPoint(globe,event),hit=nearest(state.globeHitPoints,p.x,p.y);
    globe.style.touchAction='manipulation';
    if(hit){var c=hit.country;showTooltip(c.name,c.city+' · retard '+formatPercent(c.stunting)+' · émaciation '+formatPercent(c.wasting),event.clientX,event.clientY);}else hideTooltip();
  });
  globe.addEventListener('click',function(event){var p=localPoint(globe,event),hit=nearest(state.globeHitPoints,p.x,p.y);if(!hit)return;var c=hit.country;state.globeSelected=c.code;document.getElementById('whoGlobeSelection').textContent=c.name+' · '+c.city+' · retard de croissance '+formatPercent(c.stunting)+' · émaciation '+formatPercent(c.wasting)+' · données simulées.';showTooltip(c.name,'Anémie femmes '+formatPercent(c.anemiaWomen)+' · Vitamine A à risque '+c.vitA+' %',event.clientX,event.clientY);});
  globe.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();var c=state.globeHitPoints[0]&&state.globeHitPoints[0].country;if(c){state.globeSelected=c.code;document.getElementById('whoGlobeSelection').textContent=c.name+' · '+c.city+' · retard '+formatPercent(c.stunting)+' · émaciation '+formatPercent(c.wasting);}}});

  var timeline=canvas.whoTimeline;
  timeline.addEventListener('pointermove',function(event){var p=localPoint(timeline,event),L=38,R=13,pw=p.rect.width-L-R,year=Math.round(2004+clamp((p.x-L)/pw,0,1)*26);state.timelineHover=clamp(year,2004,2030);var val=state.timelineHover;showTooltip(String(val),['stunting','wasting','anemia','obesity'].map(function(key,i){var label=['Retard','Émaciation','Anémie femmes','Obésité adulte'][i];return label+' '+formatPercent(timelineVal(key,val)*(key==='stunting'?activeRegion().kpi[0]:key==='wasting'?activeRegion().kpi[1]:key==='anemia'?activeRegion().kpi[2]:1));}).join(' · '),event.clientX,event.clientY);});
  timeline.addEventListener('pointerleave',function(){state.timelineHover=null;hideTooltip();});

  var tree=canvas.whoTreemap;
  tree.addEventListener('pointermove',function(event){var p=localPoint(tree,event),items=treeItems(),rects=[];treemapSplit(items,8,8,p.rect.width-16,p.rect.height-16,0,rects);var hit=rects.filter(function(r){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;})[0];state.treeHover=hit?hit.item.key:null;if(hit)showTooltip(hit.item.name,'Intensité relative '+hit.item.burden+' % · surface pondérée',event.clientX,event.clientY);else hideTooltip();});
  tree.addEventListener('pointerleave',function(){state.treeHover=null;hideTooltip();});
  tree.addEventListener('click',function(event){var p=localPoint(tree,event),items=treeItems(),rects=[];treemapSplit(items,8,8,p.rect.width-16,p.rect.height-16,0,rects);var hit=rects.filter(function(r){return p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;})[0];if(!hit)return;if(!state.treeSelected){state.treeSelected=hit.item.key;state.treeStart=performance.now();state.treeProgress=0;document.getElementById('whoTreeReset').classList.add('is-visible');document.getElementById('whoTreeCaption').textContent='Sous-région '+hit.item.name+' : subdivision indicative par pays, classés selon la prévalence simulée.';}else{state.treeSelected=null;state.treeStart=performance.now();state.treeProgress=0;document.getElementById('whoTreeReset').classList.remove('is-visible');document.getElementById('whoTreeCaption').textContent='La couleur représente une intensité relative de malnutrition dans cette simulation.';}});
  document.getElementById('whoTreeReset').addEventListener('click',function(){state.treeSelected=null;state.treeStart=performance.now();state.treeProgress=0;this.classList.remove('is-visible');document.getElementById('whoTreeCaption').textContent='La couleur représente une intensité relative de malnutrition dans cette simulation.';});

  var bubble=canvas.whoBubble;
  bubble.addEventListener('pointerdown',function(event){var p=localPoint(bubble,event);state.bubbleDrag={x:event.clientX,y:event.clientY,ox:state.bubblePanX,oy:state.bubblePanY,moved:false};bubble.setPointerCapture(event.pointerId);bubble.dataset.pointerStartX=String(p.x);});
  bubble.addEventListener('pointermove',function(event){
    var p=localPoint(bubble,event);
    if(state.bubbleDrag){var dx=event.clientX-state.bubbleDrag.x,dy=event.clientY-state.bubbleDrag.y;if(Math.abs(dx)+Math.abs(dy)>4)state.bubbleDrag.moved=true;if(state.bubbleDrag.moved){state.bubblePanX=state.bubbleDrag.ox+dx;state.bubblePanY=state.bubbleDrag.oy+dy;hideTooltip();return;}}
    var hit=nearest(state.bubbleHitPoints,p.x,p.y);state.bubbleHover=hit?hit.country.code:null;if(hit){var c=hit.country;showTooltip(c.name,'PIB / hab. '+c.gdp.toLocaleString('fr-FR')+' USD · retard '+formatPercent(c.stunting)+' · pop. affectée ≈ '+(c.pop*c.stunting/100).toFixed(1)+' M',event.clientX,event.clientY);}else hideTooltip();
  });
  bubble.addEventListener('pointerup',function(){state.bubbleDrag=null;});
  bubble.addEventListener('pointercancel',function(){state.bubbleDrag=null;});
  bubble.addEventListener('pointerleave',function(){if(!state.bubbleDrag)state.bubbleHover=null;hideTooltip();});
  bubble.addEventListener('wheel',function(event){event.preventDefault();var before=state.bubbleZoom;state.bubbleZoom=clamp(before*(event.deltaY<0?1.12:.89),.75,2.7);},{passive:false});
  document.getElementById('whoBubbleReset').addEventListener('click',function(){state.bubbleZoom=1;state.bubblePanX=0;state.bubblePanY=0;});

  var heat=canvas.whoHeatmap;
  heat.addEventListener('pointerdown',function(event){state.heatDrag={x:event.clientX,y:event.clientY,ox:state.heatPanX,oy:state.heatPanY,moved:false};heat.setPointerCapture(event.pointerId);});
  heat.addEventListener('pointermove',function(event){var p=localPoint(heat,event);if(state.heatDrag){var dx=event.clientX-state.heatDrag.x,dy=event.clientY-state.heatDrag.y;if(Math.abs(dx)+Math.abs(dy)>4)state.heatDrag.moved=true;if(state.heatDrag.moved){state.heatPanX=state.heatDrag.ox+dx;state.heatPanY=state.heatDrag.oy+dy;hideTooltip();return;}}var hit=nearest(state.heatHitPoints,p.x,p.y);state.heatHover=hit?hit.country.code:null;if(hit)showTooltip(hit.country.name,heatMetricLabel()+' '+formatPercent(hit.value)+' · valeur illustrative',event.clientX,event.clientY);else hideTooltip();});
  heat.addEventListener('pointerup',function(){state.heatDrag=null;});heat.addEventListener('pointercancel',function(){state.heatDrag=null;});heat.addEventListener('pointerleave',function(){state.heatHover=null;if(!state.heatDrag)hideTooltip();});
  heat.addEventListener('wheel',function(event){event.preventDefault();state.heatZoom=clamp(state.heatZoom*(event.deltaY<0?1.12:.89),.9,2.3);},{passive:false});
  document.getElementById('whoHeatReset').addEventListener('click',function(){state.heatZoom=1;state.heatPanX=0;state.heatPanY=0;});
  var heatMetrics=[{key:'stunting',label:'Retard de croissance'},{key:'wasting',label:'Émaciation'},{key:'anemiaWomen',label:'Anémie femmes'},{key:'vitA',label:'Risque vitamine A'}];
  document.getElementById('whoHeatSlider').addEventListener('input',function(){var item=heatMetrics[Number(this.value)]||heatMetrics[0];state.heatMetric=item.key;document.getElementById('whoHeatMetricLabel').textContent=item.label;});
  function heatMetricLabel(){return {stunting:'Retard de croissance',wasting:'Émaciation',anemiaWomen:'Anémie femmes',vitA:'Risque vitamine A'}[state.heatMetric]||'Indicateur';}

  /* ----- Regional filter, temporal control and scorecard comparator ----- */
  var regionSelect=document.getElementById('whoRegion');
  regionSelect.addEventListener('change',function(){state.region=this.value;document.getElementById('whoRegionLabel').textContent=activeRegion().name;updateKpis();renderRegionMini();drawStaticCharts();});
  document.getElementById('whoRadarYear').addEventListener('input',function(){state.radarYear=Number(this.value);document.getElementById('whoRadarYearLabel').textContent=String(state.radarYear);drawRadar();});

  var kpiBase=[22.3,6.7,29.9,45,190,39.8];
  function updateKpis(){
    var f=activeRegion(),values=kpiBase.map(function(v,i){return v*f.kpi[i];});
    animateCounter(document.getElementById('whoKpiStunting'),values[0],1,'');
    animateCounter(document.getElementById('whoKpiWasting'),values[1],1,'');
    animateCounter(document.getElementById('whoKpiAnemia'),values[2],1,'');
    animateCounter(document.getElementById('whoKpiBurden'),Math.round(f.burden),0,'');
    animateCounter(document.getElementById('whoKpiVitA'),Math.round(values[4]),0,'');
    animateCounter(document.getElementById('whoKpiChildAnemia'),values[5],1,'');
    var wastingCritical=values[1]>10,wastingCard=document.getElementById('whoWastingCard');wastingCard.classList.toggle('is-hot',wastingCritical);wastingCard.style.setProperty('--w-accent',wastingCritical?'#ff6b35':'#00d4ff');
    document.getElementById('whoWastingStatus').textContent=wastingCritical?'SEUIL DÉPASSÉ':'sous le seuil';
    document.getElementById('whoWastingStatus').style.color=wastingCritical?'#ff6b35':'#00ff88';
    document.getElementById('whoLiquidLabel').textContent=Number(values[5]).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})+' %';
    var target=clamp(100-(values[0]/45*100),0,100);document.getElementById('whoTargetStunting').textContent=Math.round(target)+' %';document.getElementById('whoTargetBar').style.width=target+'%';
    drawSpark('whoSparkStunting',sparkStunting.map(function(v){return v*f.kpi[0];}),'#00d4ff','10 ANS');
    drawSpark('whoSparkVitA',sparkVitamin.map(function(v){return v*f.kpi[4];}),'#ffd166','');
    drawGauge(values[1]);drawRegionalBars();drawLiquid(performance.now());
  }
  function renderRegionMini(){
    var data=[['Afrique',34.5],['Asie',29.2],['Amériques',17.7],['Europe',13.1],['Médit. orientale',33.7],['Pacifique O.',22.4]];
    var box=document.getElementById('whoRegionMini');box.innerHTML='';
    data.forEach(function(row){var line=document.createElement('div');line.className='who-region-row';line.innerHTML='<span>'+row[0]+'</span><div class="who-region-track"><i style="width:'+clamp(row[1]/55*100,0,100)+'%"></i></div><b>'+row[1].toFixed(1)+'%</b>';box.appendChild(line);});
  }

  var compareMetrics=[
    {key:'stunting',label:'Retard de croissance',limit:50,unit:'%'},
    {key:'wasting',label:'Émaciation',limit:20,unit:'%'},
    {key:'anemiaWomen',label:'Anémie femmes',limit:60,unit:'%'},
    {key:'childAnemia',label:'Anémie enfants',limit:80,unit:'%'},
    {key:'vitA',label:'Risque vitamine A',limit:70,unit:'%'},
    {key:'obesity',label:'Obésité adulte',limit:50,unit:'%'},
    {key:'ebf',label:'Allaitement exclusif',limit:80,unit:'%'},
    {key:'diversity',label:'Diversité alimentaire',limit:70,unit:'%'},
    {key:'iodine',label:'Sel iodé adéquat',limit:100,unit:'%'},
    {key:'coverage',label:'Couverture programmes',limit:100,unit:'%'}
  ];
  var countryA=document.getElementById('whoCountryA'),countryB=document.getElementById('whoCountryB');
  function fillCountrySelects(){
    var options=countries.slice().sort(function(a,b){return a.name.localeCompare(b.name,'fr');}).map(function(c){return '<option value="'+c.code+'">'+escapeHtml(c.name)+' · '+c.code+'</option>';}).join('');
    countryA.innerHTML=options;countryB.innerHTML=options;countryA.value='GH';countryB.value='IN';
  }
  function coverageScore(country){
    var score=0;compareMetrics.forEach(function(m){var v=country[m.key];var normalized=m.key==='ebf'||m.key==='diversity'||m.key==='iodine'||m.key==='coverage'?clamp(v/m.limit,0,1):1-clamp(v/m.limit,0,1);score+=normalized;});return Math.round(score/compareMetrics.length*100);
  }
  function comparatorDraw(){
    var a=countries.filter(function(c){return c.code===countryA.value;})[0]||countries[0],b=countries.filter(function(c){return c.code===countryB.value;})[0]||countries[1];
    document.getElementById('whoCountryNameA').textContent=a.name;document.getElementById('whoCountryNameB').textContent=b.name;
    var sa=coverageScore(a),sb=coverageScore(b);document.getElementById('whoScoreA').textContent=sa;document.getElementById('whoScoreB').textContent=sb;
    document.getElementById('whoScoreA').classList.toggle('who-winner',sa>sb);document.getElementById('whoScoreB').classList.toggle('who-winner',sb>sa);
    document.getElementById('whoScoreWinner').textContent=sa===sb?'· égalité':(sa>sb?'· avantage '+a.code:'· avantage '+b.code);
    var list=document.getElementById('whoCompareList');
    list.innerHTML=compareMetrics.map(function(m,index){var av=a[m.key],bv=b[m.key],better=(m.key==='ebf'||m.key==='diversity'||m.key==='iodine'||m.key==='coverage')?(av>bv?'a':bv>av?'b':''):(av<bv?'a':bv<av?'b':'');var aw=clamp(av/m.limit*100,3,100),bw=clamp(bv/m.limit*100,3,100);return '<div class="who-compare-row"><div class="who-compare-label">'+m.label+'</div><div class="who-compare-line"><span class="who-compare-val '+(better==='a'?'is-best':'')+'">'+Number(av).toLocaleString('fr-FR',{maximumFractionDigits:1})+m.unit+'</span><div class="who-compare-track" aria-label="Comparaison '+m.label+'"><i class="who-a" style="width:'+aw+'%"></i><i class="who-b" style="width:'+bw+'%"></i></div><span class="who-compare-val '+(better==='b'?'is-best':'')+'">'+Number(bv).toLocaleString('fr-FR',{maximumFractionDigits:1})+m.unit+'</span></div></div>';}).join('');
  }
  fillCountrySelects();comparatorDraw();countryA.addEventListener('change',comparatorDraw);countryB.addEventListener('change',comparatorDraw);

  /* ----- Live-style terminal, system clock and footer telemetry ----- */
  var alertMessages=[
    {level:'WARNING',text:'Écart entre la tendance simulée et la trajectoire nutrition 2030 dans plusieurs zones de veille.'},
    {level:'INFO',text:'Nouveau lot d’indicateurs de démonstration chargé · couverture géographique : 17 profils.'},
    {level:'CRITICAL',text:'Signal prioritaire : niveau d’émaciation supérieur au seuil d’urgence dans le scénario Niger.'},
    {level:'WARNING',text:'Double fardeau nutritionnel détecté dans des profils à transition alimentaire rapide.'},
    {level:'INFO',text:'Contrôle de cohérence terminé · flux pédagogique actif · aucune donnée personnelle.'},
    {level:'WARNING',text:'Attention : données synthétiques, ne pas interpréter comme une notification épidémiologique.'}
  ];
  var alertIndex=0;
  function appendAlert(item){
    var list=document.getElementById('whoAlertList'),terminal=document.getElementById('whoTerminal');
    var row=document.createElement('div');row.className='who-alert is-'+item.level.toLowerCase();
    var time=new Date().toISOString().slice(11,19)+'Z';
    var tag=document.createElement('span');tag.className='who-alert-tag';tag.textContent=item.level;
    var textWrap=document.createElement('span');
    var timeEl=document.createElement('span');timeEl.className='who-alert-time';timeEl.textContent='['+time+'] ';
    var body=document.createElement('span');body.textContent='';textWrap.appendChild(timeEl);textWrap.appendChild(body);row.appendChild(tag);row.appendChild(textWrap);list.appendChild(row);
    var i=0;var full=item.text;var speed=11;
    function printNext(){if(!document.body.contains(body))return;i=Math.min(i+2,full.length);body.textContent=full.slice(0,i);if(i<full.length)setTimeout(printNext,speed);else{terminal.scrollTop=terminal.scrollHeight;}}
    printNext();
    while(list.children.length>8)list.removeChild(list.firstChild);
    terminal.scrollTop=terminal.scrollHeight;
    document.getElementById('whoAlertCount').textContent=list.children.length+' événements';
  }
  function startAlerts(){
    if(alertTimer)return;
    for(var i=0;i<4;i++){appendAlert(alertMessages[i]);alertIndex=i+1;}
    alertTimer=window.setInterval(function(){appendAlert(alertMessages[alertIndex%alertMessages.length]);alertIndex++;},prefersReduced?13000:9200);
  }

  function updateClock(now){
    var date=new Date(now||Date.now()),seconds=date.getUTCSeconds();if(seconds===lastClockSecond)return;lastClockSecond=seconds;
    var time=new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date);
    var dateText=new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}).format(date).toUpperCase();
    document.getElementById('whoClock').textContent=dateText+' · '+time+' UTC';
    document.getElementById('whoUpdated').textContent=time;
  }
  function updateSystemStats(){
    document.getElementById('whoCpu').textContent=(12+Math.round(Math.random()*24))+'%';
    document.getElementById('whoRam').textContent=(38+Math.round(Math.random()*13))+'%';
  }
  function typeTitle(){
    var el=document.getElementById('whoTypeTitle');if(!el)return;
    var text='WHO NUTRITION SURVEILLANCE SYSTEM';el.textContent='';var index=0;
    if(prefersReduced){el.textContent=text;return;}
    typeTimer=window.setInterval(function(){el.textContent=text.slice(0,index++);if(index>text.length){clearInterval(typeTimer);}},24);
  }
  function randomGlitch(){
    if(prefersReduced)return;
    var el=document.getElementById('whoTypeTitle');if(!el)return;
    glitchTimer=window.setInterval(function(){if(Math.random()>.58){el.classList.add('who-glitch');setTimeout(function(){el.classList.remove('who-glitch');},430);}},4300);
  }

  /* ----- Export a compact CSV locally; no external request is made. ----- */
  document.getElementById('whoExport').addEventListener('click',function(){
    var rows=[['WHO Nutrition Surveillance — illustrative demo data'],['Indicator','Value','Unit','Note'],['Global stunting',22.3,'%','Simulated'],['Child wasting',6.7,'%','Simulated'],['Anaemia women',29.9,'%','Simulated'],['Countries with double burden',45,'countries','Simulated'],['Children at risk of vitamin A deficiency',190,'million','Simulated'],['Child anaemia',39.8,'%','Simulated'],[],['Country','Region','GDP per capita USD','Stunting %','Wasting %','Women anaemia %','Child anaemia %']];
    countries.forEach(function(c){rows.push([c.name,c.region,c.gdp,c.stunting,c.wasting,c.anemiaWomen,c.childAnemia]);});
    var csv='\uFEFF'+rows.map(function(row){return row.map(function(value){return '"'+String(value==null?'':value).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='who-nutrition-surveillance-demo.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  });

  /* ----- Ambient particles: a small, bounded set for smooth 60 fps motion. ----- */
  var particles=[];
  function fitParticles(){
    var box=c2d('whoParticles');if(!box)return;
    if(particles.length===0){var count=Math.min(74,Math.max(28,Math.round(box.w*box.h/22000)));for(var i=0;i<count;i++)particles.push({x:Math.random()*box.w,y:Math.random()*box.h,r:.4+Math.random()*1.2,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.16,a:.18+Math.random()*.5,phase:Math.random()*6.28});}
  }
  function drawParticles(time,delta){
    var box=c2d('whoParticles');if(!box)return;
    if(!particles.length)fitParticles();
    var ctx=box.ctx,w=box.w,h=box.h;ctx.clearRect(0,0,w,h);
    particles.forEach(function(p){p.x+=p.vx*delta*.045;p.y+=p.vy*delta*.045;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;var pulse=.68+.32*Math.sin(time/850+p.phase);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(0,212,255,'+(p.a*pulse)+')';ctx.shadowColor='#00d4ff';ctx.shadowBlur=4;ctx.fill();ctx.shadowBlur=0;});
    var maxDist=88;for(var i=0;i<particles.length;i++){for(var j=i+1;j<particles.length;j++){var dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,d=Math.hypot(dx,dy);if(d<maxDist){ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle='rgba(0,212,255,'+((1-d/maxDist)*.075)+')';ctx.lineWidth=.5;ctx.stroke();}}}
  }

  function drawStaticCharts(){drawRadar();drawTimeline();drawTreemap(performance.now());drawBubble(performance.now());drawHeatmap(performance.now());}
  function drawSmallDynamic(time){drawDoubleGlobe(time);drawLiquid(time);}
  function isVisible(){return !!(host.classList.contains('on')&&root&&root.getBoundingClientRect().width>0&&getComputedStyle(host).display!=='none');}
  function frame(time){
    rafId=0;if(!isVisible())return;
    var delta=lastFrame?Math.min(40,time-lastFrame):16;lastFrame=time;
    if(time-lastResize>=(prefersReduced?100:15)){drawParticles(time,delta);drawGlobe(time,delta);drawSmallDynamic(time);drawBubble(time);drawHeatmap(time);if(state.treeProgress<1)drawTreemap(time);lastResize=time;}
    if(Math.floor(time/1000)!==Math.floor((time-delta)/1000))updateClock(Date.now());
    rafId=requestAnimationFrame(frame);
  }
  function startLoop(){
    if(!isVisible()||rafId)return;
    if(!titleStarted){titleStarted=true;typeTitle();}
    if(!glitchStarted){glitchStarted=true;randomGlitch();}
    resizeCanvases();updateKpis();renderRegionMini();drawStaticCharts();fitParticles();startAlerts();updateClock(Date.now());updateSystemStats();
    lastFrame=0;lastResize=0;rafId=requestAnimationFrame(frame);
  }
  function stopLoop(){if(rafId){cancelAnimationFrame(rafId);rafId=0;}hideTooltip();}
  function resizeCanvases(){
    canvasIds.forEach(function(id){var c=canvas[id];if(!c)return;var rect=c.getBoundingClientRect();if(rect.width>0&&rect.height>0)c2d(id);});
    fitParticles();drawStaticCharts();drawGlobe(performance.now(),16);drawSmallDynamic(performance.now());
  }
  function scheduleResize(){window.clearTimeout(scheduleResize.timer);scheduleResize.timer=window.setTimeout(function(){if(isVisible())resizeCanvases();},120);}

  /* Existing page navigation changes .view classes. Wrap it lightly and also
     observe the target section so direct links and host buttons both wake canvases. */
  function wrapNavigation(){
    var previous=window.go;if(typeof previous!=='function'||previous.__whoSurveillanceWrapped)return;
    var wrapped=function(id){var result=previous.apply(this,arguments);window.setTimeout(function(){if(isVisible())startLoop();else if(!host.classList.contains('on'))stopLoop();},65);return result;};
    wrapped.__whoSurveillanceWrapped=true;window.go=wrapped;
  }
  wrapNavigation();
  if(window.MutationObserver){
    var observer=new MutationObserver(function(){if(isVisible())startLoop();else if(!host.classList.contains('on'))stopLoop();});
    observer.observe(host,{attributes:true,attributeFilter:['class']});
  }
  window.addEventListener('resize',scheduleResize,{passive:true});
  document.addEventListener('visibilitychange',function(){if(document.hidden)stopLoop();else if(isVisible())startLoop();});

  /* Fine pointer: a small custom reticle follows the pointer only inside this cockpit. */
  if(cursor){
    root.addEventListener('pointerenter',function(){cursor.classList.add('is-visible');});
    root.addEventListener('pointerleave',function(){cursor.classList.remove('is-visible','is-hover');});
    root.addEventListener('pointermove',function(event){cursor.style.left=event.clientX+'px';cursor.style.top=event.clientY+'px';var interactive=event.target.closest('button,a,canvas,select,input');cursor.classList.toggle('is-hover',!!interactive);},{passive:true});
  }
  root.addEventListener('click',function(event){var link=event.target.closest('.who-nav a');if(!link)return;var target=document.querySelector(link.getAttribute('href'));if(target){event.preventDefault();target.scrollIntoView({behavior:prefersReduced?'auto':'smooth',block:'start'});}});

  /* Tiny tilt on KPI cards; pointer positioning is capped for subtle 3D only. */
  if(!prefersReduced&&window.matchMedia&&window.matchMedia('(pointer:fine)').matches){
    root.querySelectorAll('[data-tilt]').forEach(function(card){card.addEventListener('pointermove',function(event){var r=card.getBoundingClientRect(),x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;card.style.transform='perspective(800px) rotateX('+(-y*3).toFixed(2)+'deg) rotateY('+(x*3).toFixed(2)+'deg) translateY(-3px)';});card.addEventListener('pointerleave',function(){card.style.transform='';});});
  }

  /* Start at DOM ready if the WHO view is already active; otherwise the go()
     wrapper and observer perform the first sizing when the user opens this tab. */
  renderRegionMini();fillCountrySelects();comparatorDraw();updateClock(Date.now());updateSystemStats();
  statsTimer=window.setInterval(updateSystemStats,2200);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){wrapNavigation();if(isVisible())startLoop();});
  else if(isVisible())startLoop();
})();
