/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : health-nutriapp-dashboard.js
 * Rôle    : Web Component <health-nutriapp-dashboard> (Custom Element +
 *           Shadow DOM).
 *
 *  - Encapsulation complète : le Shadow DOM isole les styles et le DOM du
 *    tableau de bord du reste de index.html (nombreux scripts globaux).
 *  - Gère l'état des filtres (mode Région/Pays, pays, recherche, tri),
 *    reconstruit la « vue » via HealthNutriApp.model.build() et réanime
 *    les 15 graphiques + 5 KPI à chaque changement.
 *  - Navigation latérale (scroll animé + scrollspy), export PDF/CSV,
 *    plein écran (Fullscreen API), journal synchro, fiche détaillée.
 *
 *  Dépendances (chargées avant ce fichier, voir index.html) :
 *    health-nutriapp-data.js · health-nutriapp-model.js
 *    health-nutriapp-chart-core.js · charts/ha-*.js
 *    health-nutriapp-kpi-charts.js · health-nutriapp-template.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = global.HealthNutriApp;
  if (!HA || !HA.model || !HA.Chart || !HA.template) {
    console.error('[HealthNutriApp] dépendances manquantes : vérifier l’ordre des <script> dans index.html');
    return;
  }
  const M = HA.model;
  const esc = HA.escape;

  /* Dossier du composant (pour charger la feuille de style en Shadow DOM) */
  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, '') : 'components/health-nutriapp/';

  /* Association card → définition Canvas */
  const CHART_MAP = {
    g1: 'admissionsDual', g2: 'sphereScatter', g3: 'bulletATPE', g4: 'matrix',
    g5: 'polarSeason', g6: 'anemiaIron', g7: 'syncHeat', g8: 'dumbbell',
    g9: 'funnelCPN', g10: 'smallMultiples', g11: 'treemap', g12: 'channels',
    g13: 'lollipop', g14: 'burden100'
  };
  /* Barème de gravité partagé (légende KPI / scatter) */
  const sum = (a) => a.reduce((s, v) => s + v, 0);

  class HealthNutriAppDashboard extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      const root = this.attachShadow({ mode: 'open' });
      this.root = root;

      /* Feuille de style encapsulée */
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = BASE + 'health-nutriapp.css';
      link.onload = link.onerror = () => { this.classList.add('ha-ready'); this.refreshAll(); };
      root.appendChild(link);
      const tpl = document.createElement('template');
      tpl.innerHTML = HA.template();
      root.appendChild(tpl.content);
      setTimeout(() => this.classList.add('ha-ready'), 1500); // filet de sécurité

      this.$ = (q) => root.querySelector(q);
      this.$$ = (q) => Array.from(root.querySelectorAll(q));

      /* État initial des filtres */
      this.state = { mode: 'region', country: 'NE', search: '', sort: { key: 'score', dir: -1 } };
      this.syncMinutes = 8;
      this.sparks = [];

      /* Prise de contrôle de la section #health : les anciens modules sont
       * masqués (CSS hôte) mais conservés pour les scripts existants. */
      this.section = this.closest('section');
      if (this.section) this.section.classList.add('ha-takeover');

      /* Rangs régionaux (badges de comparaison en mode pays) */
      this.ranks = {};
      ['admissions', 'obesity', 'hyper', 'sync', 'score'].forEach((k) => {
        const sorted = HA.DATA.countries.slice().sort((a, b) => (k === 'sync' || k === 'score' ? b[k] - a[k] : b[k] - a[k]));
        sorted.forEach((c, i) => { (this.ranks[c.code] = this.ranks[c.code] || {})[k] = i + 1; });
      });

      this.initCharts();
      this.bindEvents();
      this.buildPicker();
      this.update();
      this.observeCards();
      this.scrollSpy();
      this.startClock();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.refreshAll());
    }

    disconnectedCallback() { clearInterval(this._clock); }

    /* ------------------------------------------------------------------ */
    /* Initialisation des instances Canvas                                 */
    /* ------------------------------------------------------------------ */
    initCharts() {
      this.charts = {};
      this.$$('[data-chart]').forEach((host) => {
        const id = host.dataset.chart;
        const def = Object.assign({}, HA.charts[CHART_MAP[id]]);
        /* Clic sur une bulle G2 en vue globale = zoom vers le pays */
        if (id === 'g2') def.onClick = (hit) => { if (this.state.mode === 'region' && hit.item && hit.item.code) this.selectCountry(hit.item.code); };
        this.charts[id] = new HA.Chart(host, def);
      });
      this.kpiCharts = {};
      this.$$('[data-kpi-chart]').forEach((host) => {
        const name = host.dataset.kpiChart;
        this.kpiCharts[name] = new HA.Chart(host, Object.assign({}, HA.charts[name]));
      });
    }
    refreshAll() {
      if (!this.charts) return;
      Object.values(this.charts).concat(Object.values(this.kpiCharts)).concat(this.sparks).forEach((c) => { c.resize(); c.refresh(); });
    }

    /* ------------------------------------------------------------------ */
    /* Événements                                                          */
    /* ------------------------------------------------------------------ */
    bindEvents() {
      const root = this.root;
      /* Délégation des clics dans le Shadow DOM */
      root.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action],[data-mode],[data-nav],[data-leg],[data-sort],[data-detail],[data-status],[data-country-item]');
        if (!e.target.closest('.ha-picker')) this.togglePop('picker', false);
        if (!e.target.closest('.ha-menu')) this.togglePop('export', false);
        if (!t) { if (e.target.matches('[data-modal]')) this.closeModal(); return; }
        if (t.dataset.mode) return this.setMode(t.dataset.mode);
        if (t.dataset.nav) return this.navigate(t.dataset.nav);
        if (t.dataset.leg) return this.toggleSeries(t);
        if (t.dataset.sort) return this.sortTable(t.dataset.sort);
        if (t.dataset.countryItem) { this.togglePop('picker', false); return this.selectCountry(t.dataset.countryItem); }
        if (t.dataset.detail || t.dataset.status) return this.openDetail(t.dataset.detail || t.dataset.status);
        switch (t.dataset.action) {
          case 'picker': if (this.state.mode !== 'country') this.setMode('country'); else this.togglePop('picker'); break;
          case 'export-menu': this.togglePop('export'); break;
          case 'export-pdf': this.togglePop('export', false); this.exportPDF(); break;
          case 'export-csv': this.togglePop('export', false); this.exportCSV(); break;
          case 'fullscreen': this.toggleFullscreen(); break;
          case 'sync': this.forceSync(); break;
          case 'close-modal': this.closeModal(); break;
          case 'legacy': this.toggleLegacy(); break;
          case 'back-region': this.setMode('region'); break;
          default: break;
        }
      });
      /* Recherche pays (picker) + recherche zone (scorecard) */
      const ps = this.$('[data-picker-search]');
      if (ps) ps.addEventListener('input', () => this.buildPicker(ps.value));
      const s = this.$('[data-search]');
      if (s) s.addEventListener('input', () => { this.state.search = s.value; this.renderTable(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });
      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) this.removeAttribute('fullscreen');
      });
    }

    togglePop(which, force) {
      const pop = this.$('[data-pop="' + which + '"]');
      if (!pop) return;
      const open = force !== undefined ? force : !pop.classList.contains('open');
      this.$$('[data-pop]').forEach((p) => p.classList.remove('open'));
      if (open) pop.classList.add('open');
    }
    toggleSeries(btn) {
      const [id, key] = btn.dataset.leg.split(':');
      const chart = this.charts[id];
      if (!chart) return;
      if (chart.hidden.has(key)) { chart.hidden.delete(key); btn.classList.remove('off'); }
      else { chart.hidden.add(key); btn.classList.add('off'); }
      chart.refresh();
    }

    /* ------------------------------------------------------------------ */
    /* Filtres : mode Région/Pays + sélecteur pays                         */
    /* ------------------------------------------------------------------ */
    setMode(mode) {
      this.state.mode = mode;
      this.$$('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
      this.$('[data-picker]').classList.toggle('disabled', mode !== 'country');
      if (mode === 'country') this.togglePop('picker', true);
      this.update();
    }
    selectCountry(code) {
      if (!HA.byCode[code]) return;
      this.state.country = code;
      if (this.state.mode !== 'country') {
        this.state.mode = 'country';
        this.$$('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === 'country'));
        this.$('[data-picker]').classList.remove('disabled');
      }
      this.update();
      this.toast(HA.byCode[code].name + ' sélectionné — KPI et graphiques actualisés');
    }
    buildPicker(filter) {
      const list = this.$('[data-picker-list]');
      if (!list) return;
      const q = (filter || '').toLowerCase();
      const maxAdm = Math.max(...HA.DATA.countries.map((c) => c.admissions));
      list.innerHTML = HA.DATA.countries
        .filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
        .map((c) => '<button class="ha-pop-item' + (c.code === this.state.country ? ' on' : '') + '" data-country-item="' + c.code + '">' +
          '<span class="code">' + c.code + '</span><span>' + esc(c.name) + '</span>' +
          '<span class="bar"><i style="width:' + Math.round(c.admissions / maxAdm * 100) + '%;background:linear-gradient(90deg,#7C3AED,#A855F7)"></i></span>' +
          '<span class="val">' + c.score + ' pts</span></button>').join('') || '<div class="ha-empty">Aucun pays trouvé</div>';
    }

    /* ------------------------------------------------------------------ */
    /* Mise à jour complète de la vue                                      */
    /* ------------------------------------------------------------------ */
    update() {
      const view = M.build(this.state);
      this.view = view;
      this.renderHeader(view);
      this.renderBanner(view);
      this.renderKPIs(view);
      this.renderCharts(view);
      this.renderLegends(view);
      this.renderFoots(view);
      this.renderProtocol(view);
      this.renderSyncPanel(view);
      this.renderTable();
      this.buildPicker(this.$('[data-picker-search]') ? this.$('[data-picker-search]').value : '');
    }

    renderHeader(view) {
      const isR = view.isRegion;
      this.$('[data-crumb]').textContent = isR ? 'Vue Globale' : view.country.name;
      this.$('[data-subtitle]').innerHTML = isR
        ? 'Afrique de l’Ouest · Données NutriApp 2024 · <b>16 pays</b>'
        : '<b>' + esc(view.country.name) + '</b> · Données NutriApp 2024 · <b>' + esc(view.zonesLabel) + '</b> · cliniques mobiles & agents';
      this.$('[data-picker-code]').textContent = view.country.code;
      this.$('[data-picker-name]').textContent = view.country.name;
      this.$('[data-export-label]').textContent = isR ? 'Exporter Rapport Région' : 'Exporter Rapport ' + view.country.name;
    }

    renderBanner(view) {
      const b = this.$('[data-banner]');
      if (view.isRegion) { b.classList.remove('on'); b.innerHTML = ''; return; }
      const c = view.country;
      b.classList.add('on');
      b.innerHTML = '<span class="code">' + c.code + '</span><div><h3>' + esc(c.name) + ' — détail par ' + esc(view.zonesLabel) + '</h3>' +
        '<p>Tous les KPI et graphiques reflètent ce pays · cliquez un pays du sélecteur ou une bulle G2 pour changer</p></div>' +
        '<div class="stats"><div>Admissions<b>' + HA.fmtInt(c.admissions) + '</b></div>' +
        '<div>Score composite<b>' + c.score + ' pts</b></div>' +
        '<div>Synchro<b>' + c.sync + ' %</b></div></div>' +
        '<button class="ha-btn" data-action="back-region">← Région</button>';
    }

    /* ----- Les 5 KPI dynamiques (Région / Pays + badges comparatifs) ----- */
    renderKPIs(view) {
      const k = view.kpis, isR = view.isRegion, c = view.country;
      const R = HA.DATA.regional;
      const set = (cls, fn) => { const el = this.$('[data-kpi="' + cls + '"]'); if (el) fn(el); };
      const badge = (el, txt, tone) => {
        const b = el.querySelector('[data-badge]');
        b.className = 'ha-badge ' + tone;
        b.innerHTML = txt;
      };
      const share = (v, tot) => (v / tot * 100).toFixed(1).replace('.', ',') + ' %';

      /* KPI 1 — Admissions CRENAS */
      set('k-admissions', (el) => {
        HA.countUp(el.querySelector('[data-value]'), k.admissions, {});
        el.querySelector('[data-label]').textContent = 'Admissions CRENAS saisies dans NutriApp';
        el.querySelector('[data-sublabel]').textContent = "Enfants dépistés & pris en charge via l'application mobile";
        badge(el, isR ? '↑ +12 % vs 2023' : '#' + this.ranks[c.code].admissions + '/16 · ' + share(k.admissions, R.admissions) + ' région', isR ? 'good' : 'neutral');
        el.querySelector('[data-foot]').innerHTML = '<span>Pic soudure : <b>+67 %</b></span><span>Total 2023 : <b>' + HA.fmtInt(k.admissionsPrev) + '</b></span>';
        this.kpiCharts.kpiSpark.setData({ values: view.g1.m2024 });
      });
      /* KPI 2 — Obésité adulte */
      set('k-obesity', (el) => {
        HA.countUp(el.querySelector('[data-value]'), k.obesity, { decimals: 1, suffix: ' %' });
        el.querySelector('[data-label]').textContent = 'Prévalence de l’obésité adulte (double fardeau)';
        el.querySelector('[data-sublabel]').textContent = 'Surpoids & obésité urbaine · Enquêtes ménages NutriApp';
        const dPts = (k.obesity - k.obesityPrev).toFixed(1).replace('.', ',');
        badge(el, isR ? '↑ +' + dPts + ' pts vs 2023' : '#' + this.ranks[c.code].obesity + '/16 région', isR ? 'warn' : 'neutral');
        el.querySelector('[data-foot]').innerHTML = '<span>Coexistence sous-/sur-nutrition</span>';
        this.kpiCharts.kpiBars.setData({ values: [k.obesity - 3.4, k.obesity - 2.9, k.obesity - 2.4, k.obesityPrev, k.obesity] });
      });
      /* KPI 3 — Hypertension liée au sel */
      set('k-hyper', (el) => {
        HA.countUp(el.querySelector('[data-value]'), k.hyper, { decimals: 1, suffix: ' %' });
        el.querySelector('[data-label]').textContent = 'Hypertension liée à la consommation excessive de sel';
        el.querySelector('[data-sublabel]').textContent = 'Adultes hypertendus identifiés · Sel > 9 g/j';
        badge(el, isR ? '⚠ Risque cardiovasculaire élevé' : '#' + this.ranks[c.code].hyper + '/16 · Sel ' + String(k.salt).replace('.', ',') + ' g/j', 'bad');
        el.querySelector('[data-foot]').innerHTML = '<span>Sel moyen : <b>' + String(k.salt).replace('.', ',') + ' g/j</b></span><span>Objectif OMS : <b>&lt; 5 g/j</b></span>';
        el.querySelector('[data-kpi-side="hyper"]').innerHTML = 'Seuil d’alerte : <b>25 %</b><br>Écart : <b>' + (k.hyper >= 25 ? '+' : '') + (k.hyper - 25).toFixed(1).replace('.', ',') + ' pts</b>';
        this.kpiCharts.kpiGauge.setData({ value: k.hyper });
      });
      /* KPI 4 — Ruptures ATPE (badge pulsant rouge) */
      set('k-rupture', (el) => {
        HA.countUp(el.querySelector('[data-value]'), k.ruptures, { format: (v) => Math.round(v) + ' <small>structures</small>' });
        el.querySelector('[data-label]').textContent = 'Structures en rupture ATPE';
        el.querySelector('[data-sublabel]').textContent = 'Sur ' + HA.fmtInt(k.structures) + ' points suivis (' + (k.ruptures / k.structures * 100).toFixed(1).replace('.', ',') + ' %)';
        badge(el, '⚠ URGENT RÉAPPRO', 'urgent');
        el.querySelector('[data-foot]').innerHTML = '<span>Inventaire NutriApp</span><span>Seuil : <b>30 j</b></span>';
        this.kpiCharts.kpiAlert.setData({ ruptures: k.ruptures, structures: k.structures });
      });
      /* KPI 5 — Synchro terrain */
      set('k-sync', (el) => {
        HA.countUp(el.querySelector('[data-value]'), k.sync, { decimals: 0, suffix: ' %' });
        el.querySelector('[data-label]').textContent = 'Taux de synchronisation NutriApp terrain';
        el.querySelector('[data-sublabel]').textContent = 'Fiches d’enquêtes synchronisées dans les 24 h';
        badge(el, isR ? 'Réseau actif 16 pays' : '#' + this.ranks[c.code].sync + '/16 région', 'info');
        el.querySelector('[data-foot]').innerHTML = '<span>Agents & cliniques mobiles</span>';
        el.querySelector('[data-kpi-side="sync"]').innerHTML = 'Cible : <b>80 %</b><br>Écart : <b>' + (k.sync - 80) + ' pts</b>';
        this.kpiCharts.kpiDonut.setData({ value: k.sync });
      });
    }

    /* ----- Données des 14 graphiques Canvas (G15 = tableau HTML) ----- */
    renderCharts(view) {
      const zones = view.zones;
      this.charts.g1.setData({ months: HA.MONTHS, m2023: view.g1.m2023, m2024: view.g1.m2024 });
      this.charts.g2.setData(zones.map((z) => ({ name: z.name, code: z.code, recovery: z.recovery, dropout: z.dropout, admissions: z.admissions })));
      this.charts.g3.setData(zones.map((z) => ({ name: z.name, code: z.code.length <= 3 ? z.code : z.name.slice(0, 3).toUpperCase(), stockDays: z.stockDays, ruptures: z.ruptures })));
      this.charts.g4.setData({ cols: M.MATRIX_COLS, rows: zones.map((z) => ({ name: z.name, values: { recovery: z.recovery, dropout: z.dropout, stockDays: z.stockDays, aneC: z.aneC, iron: z.iron, sync: z.sync, cpnCov: z.cpnCov, score: z.score } })) });
      this.charts.g5.setData(view.g5);
      const a = view.g6;
      this.charts.g6.setData({
        cats: a.cats, v2024: a.values,
        v2023: a.values.map((v) => Math.round(v * 1.06)),
        iron: [a.iron - 4, a.iron + 3, a.iron + 1, a.iron - 2].map((v) => Math.max(10, Math.min(98, v)))
      });
      this.charts.g7.setData(view.g7);
      this.charts.g8.setData(view.g8);
      this.charts.g9.setData(view.g9);
      this.charts.g10.setData(view.g10);
      this.charts.g11.setData(view.g11);
      this.charts.g12.setData(view.g12);
      this.charts.g13.setData({ target: 70, zones: zones.slice().sort((x, y) => y.score - x.score).map((z) => ({ name: z.name, score: z.score })) });
      this.charts.g14.setData(view.g14);
    }

    /* ----- Légendes (cliquables = toggle de séries) ----- */
    renderLegends(view) {
      const leg = (id, items, staticMode) => {
        const host = this.$('[data-legend="' + id + '"]');
        if (!host) return;
        host.innerHTML = items.map((it) =>
          '<button class="' + (this.charts[id] && this.charts[id].hidden.has(it.key) ? 'off' : '') + '"' + (staticMode ? '' : ' data-leg="' + id + ':' + it.key + '"') + '>' +
          '<i style="background:' + it.color + '"></i><span>' + esc(it.label) + '</span></button>').join('');
      };
      leg('g1', [{ key: 'y24', color: '#7C3AED', label: '2024' }, { key: 'y23', color: '#CBD5E1', label: '2023' }]);
      leg('g2', [{ key: 'a', color: '#10B981', label: 'Cibles Sphère' }, { key: 'b', color: '#F59E0B', label: 'Partiel' }, { key: 'c', color: '#EF4444', label: 'Hors cibles' }], true);
      leg('g5', [{ key: 'y24', color: '#7C3AED', label: '2024' }, { key: 'y23', color: '#A78BFA', label: '2023' }, { key: 'y22', color: '#DDD6FE', label: '2022' }]);
      leg('g6', [{ key: 'a24', color: '#7C3AED', label: 'Anémie 2024' }, { key: 'a23', color: '#CBD5E1', label: 'Anémie 2023' }, { key: 'iron', color: '#06B6D4', label: 'Fer' }]);
      leg('g11', [{ key: 'a', color: '#7C3AED', label: 'MNT' }, { key: 'b', color: '#06B6D4', label: 'Infectieux' }, { key: 'c', color: '#F59E0B', label: 'Nutrition' }], true);
      leg('g12', [{ key: 'cpn', color: '#7C3AED', label: 'CPN' }, { key: 'pedi', color: '#06B6D4', label: 'Pédiatrie' }, { key: 'pb', color: '#10B981', label: 'PB communautaire' }, { key: 'auto', color: '#F59E0B', label: 'Auto-dépistage' }]);
      leg('g14', [{ key: 'mas', color: '#DC2626', label: 'MAS' }, { key: 'mam', color: '#F59E0B', label: 'MAM' }, { key: 'overw', color: '#06B6D4', label: 'Surpoids' }, { key: 'obes', color: '#7C3AED', label: 'Obésité' }, { key: 'hta', color: '#9F1239', label: 'Risque HTA' }]);
    }

    /* ----- Pieds de cards : chiffres clés ----- */
    renderFoots(view) {
      const foot = (id, html) => { const f = this.$('[data-foot="' + id + '"]'); if (f) f.innerHTML = html; };
      const t24 = sum(view.g1.m2024), t23 = sum(view.g1.m2023);
      const soud = view.g1.m2024.slice(5, 9);
      foot('g1', '<span>Total 2024 : <b>' + HA.fmtInt(t24) + '</b></span><span>Total 2023 : <b>' + HA.fmtInt(t23) + '</b></span><span>Pic soudure (août) : <b>' + HA.fmtInt(Math.max(...soud)) + '</b></span><span class="ha-mode-tag">' + (view.isRegion ? 'Région · 16 pays' : esc(view.country.name)) + '</span>');
      const ok = view.zones.filter((z) => z.recovery >= 75 && z.dropout <= 15).length;
      foot('g2', '<span>Zones aux cibles Sphère : <b>' + ok + ' / ' + view.zones.length + '</b></span><span>Réf. : <b>guérison ≥ 75 % · abandon ≤ 15 %</b></span>');
      const rupt = view.zones.filter((z) => z.stockDays < 30).length;
      const med = view.zones.map((z) => z.stockDays).sort((a2, b2) => a2 - b2)[Math.floor(view.zones.length / 2)];
      foot('g3', '<span>Zones sous le seuil : <b>' + rupt + '</b></span><span>Stock médian : <b>' + med + ' jours</b></span><span>Seuil critique : <b>30 jours</b></span>');
      foot('g4', '<span>' + view.zones.length + ' zones × 8 indicateurs</span><span>Source : <b>saisies NutriApp 2024</b></span>');
      foot('g5', '<span>Cas 2024 : <b>' + HA.fmtInt(sum(view.g5.m2024)) + '</b></span><span>Soudure : <b>juin → septembre</b></span>');
      foot('g6', '<span>Fer (moy.) : <b>' + view.g6.iron + ' %</b></span><span>Cible : <b>80 %</b></span>');
      const w = view.g7;
      foot('g7', '<span>Moyenne 52 sem. : <b>' + Math.round(sum(w) / w.length) + ' %</b></span><span>Meilleure semaine : <b>' + Math.max(...w) + ' %</b></span>');
      foot('g8', '<span>Source : <b>enquêtes ménages NutriApp 2015 → 2024</b></span>');
      const f = view.g9;
      foot('g9', '<span>Gap de dépistage : <b>' + (100 - Math.round(f[1].value / f[0].value * 100)) + ' %</b></span><span>Cohorte : <b>' + HA.fmtInt(f[0].value) + '</b></span>');
      foot('g10', '<span>Fenêtre : <b>12 derniers mois</b></span>');
      foot('g11', '<span>Cas totaux : <b>' + HA.fmtInt(sum(view.g11.map((t) => t.value))) + '</b></span>');
      const ch = view.g12, li = ch.years.length - 1;
      foot('g12', '<span>2024 — PB communautaire : <b>' + String(ch.pb[li]).replace('.', ',') + ' %</b></span><span>CPN : <b>' + String(ch.cpn[li]).replace('.', ',') + ' %</b></span>');
      const above = view.zones.filter((z) => z.score >= 70).length;
      foot('g13', '<span>Zones ≥ 70 pts : <b>' + above + ' / ' + view.zones.length + '</b></span>');
      foot('g14', '<span>Lecture : <b>chaque barre = 100 % du fardeau de la zone</b></span>');
      const sub = (id, txt) => { const s2 = this.$('[data-sub="' + id + '"]'); if (s2 && txt) s2.textContent = txt; };
      sub('g3', view.isRegion ? '16 pays · médiane des inventaires ATPE par pays' : 'Districts de ' + view.country.name + ' · inventaires ATPE');
      sub('g4', view.isRegion ? '16 pays × 8 indicateurs clés NutriApp' : 'Districts de ' + view.country.name + ' × 8 indicateurs');
    }

    /* ----- Protocole fer (carte info anémie) ----- */
    renderProtocol(view) {
      const host = this.$('[data-anemia-protocol]');
      if (!host) return;
      const a = view.g6;
      const rows = [
        { ic: '🩸', bg: 'linear-gradient(135deg,#EF4444,#F87171)', t: 'Dépistage Hb systématique', s: 'Femmes enceintes vues en CPN', v: a.values[1] + ' %' },
        { ic: '💊', bg: 'linear-gradient(135deg,#7C3AED,#A855F7)', t: 'Fer / acide folique', s: 'Couverture des supplémentations', v: a.iron + ' %' },
        { ic: '🔔', bg: 'linear-gradient(135deg,#F59E0B,#FBBF24)', t: 'Rappels agents', s: 'Relances automatiques NutriApp', v: view.kpis.sync + ' %' },
        { ic: '📋', bg: 'linear-gradient(135deg,#06B6D4,#22D3EE)', t: 'Suivi à 30 jours', s: 'Observance contrôlée', v: Math.max(28, a.iron - 12) + ' %' }
      ];
      host.innerHTML = rows.map((r) =>
        '<div class="ha-synth-row"><span class="ic" style="background:' + r.bg + '">' + r.ic + '</span>' +
        '<div><b>' + esc(r.t) + '</b><span>' + esc(r.s) + '</span></div><span class="v">' + esc(r.v) + '</span></div>').join('');
    }

    /* ----- Journal de synchronisation (panneau LIVE) ----- */
    renderSyncPanel(view) {
      const host = this.$('[data-sync-list]');
      if (!host) return;
      const zones = view.zones.slice().sort((a2, b2) => b2.sync - a2.sync).slice(0, 6);
      const kinds = ['lot CRENAS', 'enquête ménages', 'inventaire ATPE', 'dépistage PB', 'fiches CPN', 'clinique mobile'];
      host.innerHTML = zones.map((z, i) => {
        const n = 40 + ((z.admissions * (i + 3)) % 320);
        const mins = 2 + ((z.sync * 7 + i * 11) % 58);
        const hue = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 6];
        return '<div class="ha-synth-row"><span class="ic" style="background:' + hue + ';font-size:11px;font-weight:800">' + esc(z.code.slice(0, 3)) + '</span>' +
          '<div><b>' + esc(z.name) + ' — ' + kinds[i % kinds.length] + '</b><span>' + HA.fmtInt(n) + ' fiches · synchro ' + z.sync + ' %</span></div>' +
          '<span class="v" style="font-size:12px;color:#64748B">il y a ' + mins + ' min</span></div>';
      }).join('');
    }

    /* ------------------------------------------------------------------ */
    /* Scorecard G15 : tableau triable + recherche + sparklines + statuts  */
    /* ------------------------------------------------------------------ */
    sortTable(key) {
      const s = this.state.sort;
      if (s.key === key) s.dir *= -1; else { s.key = key; s.dir = key === 'name' ? 1 : -1; }
      this.renderTable();
    }
    renderTable() {
      const table = this.$('[data-table]');
      if (!table || !this.view) return;
      const view = this.view;
      const q = this.state.search.toLowerCase();
      let rows = view.rows.filter((r) => !q || r.name.toLowerCase().includes(q));
      const { key, dir } = this.state.sort;
      rows = rows.slice().sort((a, b) => {
        const va = key === 'name' ? a.name : a[key];
        const vb = key === 'name' ? b.name : b[key];
        return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
      });
      const cols = [
        { key: 'name', label: 'Zone' }, { key: 'admissions', label: 'Admissions' },
        { key: 'recovery', label: 'Guérison' }, { key: 'dropout', label: 'Abandon' },
        { key: 'stockDays', label: 'Stock' }, { key: 'aneC', label: 'Anémie' },
        { key: 'obesity', label: 'Obésité' }, { key: 'hyper', label: 'HTA-sel' },
        { key: 'sync', label: 'Synchro' }, { key: 'score', label: 'Score' }
      ];
      table.querySelector('thead').innerHTML = '<tr>' + cols.map((c) =>
        '<th data-sort="' + c.key + '" class="' + (key === c.key ? 'sorted' : '') + '">' + c.label +
        (key === c.key ? '<span class="arr">' + (dir === 1 ? ' ▲' : ' ▼') + '</span>' : '') + '</th>').join('') +
        '<th>Tendance</th><th>Statut</th><th></th></tr>';
      const dot = (v, good, warn) => v >= good ? '#10B981' : v >= warn ? '#F59E0B' : '#EF4444';
      const rdot = (v, bad, warn) => v >= bad ? '#EF4444' : v >= warn ? '#F59E0B' : '#10B981';
      /* Détruit les sparklines précédentes avant re-rendu */
      this.sparks.forEach((sp) => sp.destroy());
      this.sparks = [];
      const tb = table.querySelector('tbody');
      tb.innerHTML = rows.map((r, i) =>
        '<tr><td><span class="zone"><span class="rank">' + (i + 1) + '</span><span class="code">' + esc(r.code.length <= 3 ? r.code : r.code) + '</span>' + esc(r.name) + '</span></td>' +
        '<td>' + HA.fmtInt(r.admissions) + '</td>' +
        '<td><span class="ha-cell"><i class="dot" style="background:' + dot(r.recovery, 75, 65) + '"></i>' + r.recovery + ' %</span></td>' +
        '<td><span class="ha-cell"><i class="dot" style="background:' + rdot(r.dropout, 15, 10) + '"></i>' + String(r.dropout).replace('.', ',') + ' %</span></td>' +
        '<td><span class="ha-cell"><i class="dot" style="background:' + M.stockColor(r.stockDays) + '"></i>' + r.stockDays + ' j</span></td>' +
        '<td>' + r.aneC + ' %</td><td>' + String(r.obesity).replace('.', ',') + ' %</td><td>' + String(r.hyper).replace('.', ',') + ' %</td>' +
        '<td>' + r.sync + ' %</td>' +
        '<td><span class="ha-score"><span class="track"><i style="width:' + r.score + '%;background:' + dot(r.score, 70, 55) + '"></i></span>' + r.score + '</span></td>' +
        '<td><div class="ha-spark" data-spark="' + i + '"></div></td>' +
        '<td><button class="ha-status ' + r.status.tone + '" data-status="' + esc(r.name) + '">' + r.status.label + '</button></td>' +
        '<td><button class="ha-link" data-detail="' + esc(r.name) + '">Détail →</button></td></tr>').join('') ||
        '<tr><td colspan="13"><div class="ha-empty">Aucune zone ne correspond à « ' + esc(this.state.search) + ' »</div></td></tr>';
      /* Sparklines Canvas par ligne */
      const self = this;
      tb.querySelectorAll('[data-spark]').forEach((host) => {
        const r = rows[+host.dataset.spark];
        const sp = new HA.Chart(host, Object.assign({}, HA.charts.scoreSpark));
        sp.setData({ values: r.scoreTrend, color: r.score >= 70 ? '#10B981' : r.score >= 55 ? '#F59E0B' : '#EF4444' }, { instant: true });
        self.sparks.push(sp);
      });
      const avg = (k) => (rows.reduce((s2, r) => s2 + r[k], 0) / (rows.length || 1));
      this.$('[data-table-foot]').innerHTML = '<span>' + rows.length + ' zones · Guérison moy. <b>' + avg('recovery').toFixed(1).replace('.', ',') + ' %</b> · Synchro moy. <b>' + Math.round(avg('sync')) + ' %</b></span><span>Cliquez un statut ou « Détail » pour la fiche zone</span>';
    }

    /* ------------------------------------------------------------------ */
    /* Fiche détaillée (modal)                                             */
    /* ------------------------------------------------------------------ */
    openDetail(name) {
      const z = this.view.zones.find((x) => x.name === name);
      if (!z) return;
      const st = M.statusOf(z.score);
      this.$('[data-modal-title]').textContent = z.name + ' — fiche unité NutriApp';
      this.$('[data-modal-sub]').textContent = (this.view.isRegion ? 'Pays · Afrique de l’Ouest' : 'District · ' + this.view.country.name) + ' · Données 2024';
      const row = (l, v, hint, color) => '<div class="ha-mrow"><span>' + l + '</span><b>' + v + '</b>' + (hint ? '<em style="color:' + (color || '#7C3AED') + '">' + hint + '</em>' : '') + '</div>';
      this.$('[data-modal-body]').innerHTML = '<div>' +
        row('Admissions CRENAS', HA.fmtInt(z.admissions), 'Saisies agents & cliniques mobiles') +
        row('Guérison / Abandon', z.recovery + ' % / ' + String(z.dropout).replace('.', ',') + ' %', z.recovery >= 75 && z.dropout <= 15 ? 'Cibles Sphère atteintes' : 'Sous les cibles Sphère (75 % / 15 %)', z.recovery >= 75 && z.dropout <= 15 ? '#10B981' : '#EF4444') +
        row('Stock ATPE médian', z.stockDays + ' jours', z.stockDays < 30 ? '⚠ Sous le seuil critique de 30 j — réappro urgent' : 'Niveau sous surveillance', z.stockDays < 30 ? '#EF4444' : '#059669') +
        row('Ruptures / Structures', z.ruptures + ' / ' + HA.fmtInt(z.structures || 0)) +
        row('Anémie enfants', z.aneC + ' %', 'Dépistages Hb NutriApp') +
        row('Couverture fer', z.iron + ' %', z.iron >= 80 ? 'Cible 80 % atteinte' : 'Sous la cible de 80 %', z.iron >= 80 ? '#10B981' : '#F59E0B') +
        '</div><div>' +
        row('Obésité adulte', String(z.obesity).replace('.', ',') + ' %', 'Double fardeau nutritionnel') +
        row('HTA liée au sel', String(z.hyper).replace('.', ',') + ' %', 'Sel moyen : ' + String(z.salt || '—').replace('.', ',') + ' g/j (objectif OMS < 5)') +
        row('Diabète type 2', String(z.diabetes).replace('.', ',') + ' %') +
        row('Dépistage CPN', (z.cpnCov != null ? z.cpnCov : '—') + (z.cpnCov != null ? ' %' : '')) +
        row('Synchro < 24 h', z.sync + ' %', z.sync >= 80 ? 'Régularité exemplaire' : 'Relais à accompagner', z.sync >= 80 ? '#10B981' : '#F59E0B') +
        row('Score composite', z.score + ' pts', 'Statut : ' + st.label, st.tone === 'success' ? '#10B981' : st.tone === 'danger' ? '#EF4444' : '#F59E0B') +
        '</div>';
      this.$('[data-modal]').classList.add('open');
    }
    closeModal() { const m = this.$('[data-modal]'); if (m) m.classList.remove('open'); }

    /* ------------------------------------------------------------------ */
    /* Plein écran natif (Fullscreen API) + exports                        */
    /* ------------------------------------------------------------------ */
    toggleFullscreen() {
      const el = this;
      if (!document.fullscreenElement) {
        this.setAttribute('fullscreen', '');
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
        this.toast('Mode immersif investisseur — Échap pour quitter');
      } else {
        document.exitFullscreen().catch(() => {});
        this.removeAttribute('fullscreen');
      }
      setTimeout(() => this.refreshAll(), 350);
    }
    exportCSV() {
      const rows = this.view.rows;
      const head = 'Zone;Admissions;Guerison_%;Abandon_%;Stock_jours;Anemie_%;Fer_%;Obesite_%;HTA_sel_%;Diabete_%;Synchro_%;Score;Statut';
      const lines = rows.map((r) => [r.name, r.admissions, r.recovery, r.dropout, r.stockDays, r.aneC, r.iron, r.obesity, r.hyper, r.diabetes, r.sync, r.score, r.status.label].join(';'));
      const blob = new Blob(['﻿' + head + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nutriapp-sante-scorecard-' + (this.view.isRegion ? 'region' : this.view.country.code) + '-2024.csv';
      document.body.appendChild(a); a.click(); a.remove();
      this.toast('Export CSV téléchargé — ' + rows.length + ' zones');
    }
    exportPDF() {
      /* Rapport imprimable (PDF via la boîte de dialogue d'impression) */
      const view = this.view, k = view.kpis;
      const w = window.open('', '_blank', 'width=900,height=700');
      if (!w) { this.toast('Autorisez les fenêtres pop-up pour le rapport PDF'); return; }
      const rows = view.rows.map((r, i) =>
        '<tr><td>' + (i + 1) + '</td><td><b>' + esc(r.name) + '</b></td><td>' + HA.fmtInt(r.admissions) + '</td><td>' + r.recovery + ' %</td><td>' + r.stockDays + ' j</td><td>' + r.sync + ' %</td><td>' + r.score + '</td><td>' + r.status.label + '</td></tr>').join('');
      w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>NutriApp Santé — Rapport ' + (view.isRegion ? 'Région' : esc(view.country.name)) + '</title>' +
        '<style>body{font:13px Inter,Arial;color:#1E293B;padding:32px}h1{font-size:22px;color:#7C3AED}h2{font-size:15px;margin-top:26px;color:#1E0A3C}.kpis{display:flex;gap:12px;margin:16px 0}.kpi{flex:1;border:1px solid #DDD6FE;border-radius:12px;padding:12px}.kpi b{font-size:20px;color:#7C3AED}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border-bottom:1px solid #EDE9FE;padding:7px;text-align:left;font-size:12px}th{background:#F5F3FF;color:#7C3AED}.foot{margin-top:18px;color:#94A3B8;font-size:11px}</style></head><body>' +
        '<h1>NutriApp · Surveillance Nutritionnelle — ' + (view.isRegion ? 'Afrique de l’Ouest (16 pays)' : esc(view.country.name)) + '</h1>' +
        '<p>Ministère de la Santé · Données NutriApp 2024 · généré le ' + new Date().toLocaleDateString('fr-FR') + '</p>' +
        '<div class="kpis"><div class="kpi"><b>' + HA.fmtInt(k.admissions) + '</b><br>Admissions CRENAS</div>' +
        '<div class="kpi"><b>' + String(k.obesity).replace('.', ',') + ' %</b><br>Obésité adulte</div>' +
        '<div class="kpi"><b>' + String(k.hyper).replace('.', ',') + ' %</b><br>HTA liée au sel</div>' +
        '<div class="kpi"><b>' + k.ruptures + '</b><br>Ruptures ATPE</div>' +
        '<div class="kpi"><b>' + k.sync + ' %</b><br>Synchro &lt; 24 h</div></div>' +
        '<h2>Scorecard des unités (' + view.rows.length + ' zones)</h2>' +
        '<table><tr><th>#</th><th>Zone</th><th>Admissions</th><th>Guérison</th><th>Stock</th><th>Synchro</th><th>Score</th><th>Statut</th></tr>' + rows + '</table>' +
        '<p class="foot">Source : application mobile de suivi terrain NutriApp (agents communautaires, cliniques mobiles, dépistages PB/MUAC, enquêtes ménages, inventaires ATPE) · données de démonstration.</p>' +
        '<script>window.onload=function(){window.print()}<\/script></body></html>');
      w.document.close();
      this.toast('Rapport PDF — utilisez « Enregistrer au format PDF »');
    }

    /* ------------------------------------------------------------------ */
    /* Navigation, scrollspy, apparition des cards, horloge synchro        */
    /* ------------------------------------------------------------------ */
    navigate(id) {
      const item = HA.NAV.find((n) => n.id === id);
      if (!item) return;
      const target = this.$('#' + item.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.$$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === id));
      if (id === 'country' || id === 'overview') { /* les deux ancrent la vue globale */ }
    }
    observeCards() {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.08 });
      this.$$('[data-card], #card-syncpanel, #card-anemia-info').forEach((c) => io.observe(c));
    }
    scrollSpy() {
      const map = {};
      HA.NAV.forEach((n) => (map[n.target] = n.id));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && map[e.target.id]) {
            this.$$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === map[e.target.id]));
          }
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      Object.keys(map).forEach((id) => { const el = this.$('#' + id); if (el) io.observe(el); });
    }
    startClock() {
      this._clock = setInterval(() => {
        this.syncMinutes += 1;
        const el = this.$('[data-sync-text]');
        if (el) el.textContent = 'Synchro NutriApp LIVE · il y a ' + this.syncMinutes + ' min';
      }, 60000);
    }
    forceSync() {
      const btn = this.$('.ha-live');
      if (btn) btn.classList.add('syncing');
      this.toast('Synchronisation NutriApp en cours…');
      setTimeout(() => {
        this.syncMinutes = 0;
        if (btn) btn.classList.remove('syncing');
        const el = this.$('[data-sync-text]');
        if (el) el.textContent = 'Synchro NutriApp LIVE · à l’instant';
        this.renderSyncPanel(this.view);
        this.toast('Synchro terminée — fiches terrain à jour');
      }, 1200);
    }
    toggleLegacy() {
      if (!this.section) return;
      this.section.classList.toggle('ha-show-legacy');
      const on = this.section.classList.contains('ha-show-legacy');
      this.$('[data-action="legacy"]').textContent = on ? 'Masquer les modules Santé historiques' : 'Afficher les modules Santé historiques';
    }
    toast(msg) {
      const t = this.$('[data-toast]');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('on');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove('on'), 2600);
    }
  }

  customElements.define('health-nutriapp-dashboard', HealthNutriAppDashboard);
})(window);
