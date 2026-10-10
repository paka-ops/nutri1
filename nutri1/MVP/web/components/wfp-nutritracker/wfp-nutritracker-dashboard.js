/* ============================================================================
 * WFP NutriTracker · wfp-nutritracker-dashboard.js
 * Rôle    : Web Component <wfp-nutritracker-dashboard> (Custom Element + Shadow DOM)
 *
 *  - Encapsulation complète : le Shadow DOM isole les styles et le DOM du
 *    tableau de bord du reste de index.html (qui contient de nombreux scripts
 *    globaux : MutationObserver, styles sur button/table/canvas, etc.).
 *  - Gère l'état des filtres (mode Région/Pays, pays, granularité Mensuel/
 *    Trimestriel, période de référence, chips radar, recherche et tri du
 *    scorecard), reconstruit la « vue » via WFPTracker.model.build() puis
 *    réanime les 5 KPI et les 15 graphiques.
 *  - Navigation latérale (scroll animé en requestAnimationFrame + scrollspy),
 *    export PDF (impression) / CSV, plein écran, badge de synchro App.
 *
 *  Dépendances (chargées avant ce fichier, voir index.html) :
 *    wfp-nutritracker-data.js · wfp-nutritracker-model.js
 *    wfp-nutritracker-chart-core.js · charts/*.js · wfp-nutritracker-template.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFPTracker;
  if (!WFP || !WFP.model || !WFP.Chart || !WFP.template) {
    console.error('[WFP NutriTracker] dépendances manquantes : vérifier l’ordre des <script> dans index.html');
    return;
  }
  const M = WFP.model;
  const C = WFP.COLORS;
  const esc = WFP.escape;

  /* Dossier du composant (pour charger la feuille de style dans le Shadow DOM) */
  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, '') : 'components/wfp-nutritracker/';

  /* Association card → définition Canvas */
  const CHART_MAP = {
    g1: 'ipcStack', g2: 'fcsTrend', g3: 'priceHeatmap', g4: 'csiRadar', g5: 'priceMuac',
    g6: 'funnel', g7: 'alertsRose', g8: 'ipcMap', g9: 'cerealTrend', g10: 'availAccess',
    g11: 'hddsHistogram', g12: 'fcsDumbbell', g13: 'alertCalendar', g14: 'waterfall', g15: 'bullets'
  };
  const KPI_CHART = { k1: 'kpiBars', k2: 'kpiGauge', k3: 'kpiGrid', k4: 'kpiProgress', k5: 'kpiLine' };
  const CARDS_WITH_LEGEND = ['g1', 'g2', 'g4', 'g9'];

  class WfpNutriTrackerDashboard extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      const root = this.attachShadow({ mode: 'open' });
      this.root = root;

      /* Feuille de style encapsulée */
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = BASE + 'wfp-nutritracker.css';
      link.onload = link.onerror = () => { this.classList.add('wf-ready'); this.refreshAll(); };
      root.appendChild(link);
      const tpl = document.createElement('template');
      tpl.innerHTML = WFP.template();
      root.appendChild(tpl.content);
      setTimeout(() => this.classList.add('wf-ready'), 1500); // filet de sécurité

      this.$ = (q) => root.querySelector(q);
      this.$$ = (q) => Array.from(root.querySelectorAll(q));

      /* État initial des filtres */
      this.state = {
        mode: 'region',
        country: 'NE',
        gran: 'M',
        sub: 12,
        g4Sel: ['NE', 'BF', 'SN'],
        search: '',
        sort: { key: 'insecure', dir: -1 }
      };
      this.syncMinutes = 8;

      /* Prise de contrôle de la section #wfp : les anciens modules sont masqués
       * (CSS hôte) mais conservés dans le DOM pour les scripts existants. */
      this.section = this.closest('section');
      if (this.section) this.section.classList.add('wf-takeover');

      this.initCharts();
      this.bindEvents();
      this.buildSubPeriods();
      this.update();
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
        const name = CHART_MAP[id];
        if (!name || !WFP.charts[name]) return;
        const def = Object.assign({}, WFP.charts[name]);
        if (id === 'g8') def.onClick = (hit, ch) => { if (hit.code && ch.data.mode === 'region') this.selectCountry(hit.code); };
        this.charts[id] = new WFP.Chart(host, def);
      });
      this.kpiCharts = {};
      this.$$('[data-kpi-chart]').forEach((host) => {
        const id = host.dataset.kpiChart;
        const name = KPI_CHART[id];
        if (!name || !WFP.charts[name]) return;
        this.kpiCharts[id] = new WFP.Chart(host, Object.assign({}, WFP.charts[name]));
      });
    }
    refreshAll() {
      if (!this.charts) return;
      Object.keys(this.charts).concat(Object.keys(this.kpiCharts)).forEach((k) => {
        const c = this.charts[k] || this.kpiCharts[k];
        c.resize(); c.refresh();
      });
    }

    /* ------------------------------------------------------------------ */
    /* Événements                                                          */
    /* ------------------------------------------------------------------ */
    bindEvents() {
      const root = this.root;
      root.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action],[data-mode],[data-gran],[data-nav],[data-chip],[data-sort],[data-country-item],[data-legend-item]');
        if (!e.target.closest('.wf-picker')) this.togglePop('picker', false);
        if (!t) return;
        if (t.dataset.mode) return this.setMode(t.dataset.mode);
        if (t.dataset.gran) return this.setGranularity(t.dataset.gran);
        if (t.dataset.nav) return this.navigate(t.dataset.nav);
        if (t.dataset.chip) return this.toggleChip(t.dataset.chip);
        if (t.dataset.sort) return this.sortTable(t.dataset.sort);
        if (t.dataset.countryItem) { this.togglePop('picker', false); return this.selectCountry(t.dataset.countryItem); }
        if (t.dataset.legendItem) return this.toggleSeries(t.dataset.legendItem, t.dataset.legendCard);
        switch (t.dataset.action) {
          case 'picker': if (this.state.mode !== 'country') this.setMode('country'); else this.togglePop('picker'); break;
          case 'sync': this.forceSync(); break;
          case 'fullscreen': this.toggleFullscreen(); break;
          case 'report': this.togglePop('export'); break;
          case 'report-pdf': this.togglePop('export', false); this.exportPDF(); break;
          case 'report-csv': this.togglePop('export', false); this.exportCSV(); break;
          case 'legacy': this.toggleLegacy(); break;
          case 'back-region': this.setMode('region'); break;
          default: break;
        }
      });
      /* Recherche du sélecteur de pays */
      const ps = this.$('[data-picker-search]');
      if (ps) ps.addEventListener('input', () => this.renderPickerList(ps.value));
      /* Recherche du scorecard */
      const ss = this.$('[data-search]');
      if (ss) ss.addEventListener('input', () => { this.state.search = ss.value; this.renderTable(); });
      /* Période de référence */
      const sub = this.$('[data-subperiod]');
      if (sub) sub.addEventListener('change', () => { this.state.sub = +sub.value; this.update(); });
      /* Fermeture des popups au clic extérieur */
      document.addEventListener('click', (e) => { if (!this.contains(e.target)) { this.togglePop('picker', false); this.togglePop('export', false); } });
      /* Redessin au redimensionnement de la fenêtre (le ResizeObserver gère le reste) */
      this._onResize = () => this.refreshAll();
      global.addEventListener('resize', this._onResize);
    }

    togglePop(name, force) {
      const el = this.$('[data-pop="' + name + '"]');
      if (!el) return;
      const show = force == null ? !el.classList.contains('on') : force;
      el.classList.toggle('on', show);
      if (name === 'picker' && show) { const i = this.$('[data-picker-search]'); if (i) i.focus(); }
    }

    /* ------------------------------------------------------------------ */
    /* Filtres                                                             */
    /* ------------------------------------------------------------------ */
    setMode(mode) {
      this.state.mode = mode === 'country' ? 'country' : 'region';
      this.$$('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === this.state.mode));
      const picker = this.$('[data-picker]');
      if (picker) picker.classList.toggle('disabled', this.state.mode !== 'country');
      if (this.state.mode === 'country') this.togglePop('picker', true);
      this.update();
    }
    selectCountry(code) {
      this.state.mode = 'country';
      this.state.country = code;
      this.$$('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === 'country'));
      const picker = this.$('[data-picker]');
      if (picker) picker.classList.remove('disabled');
      this.togglePop('picker', false);
      this.update();
      this.toast('Vue détaillée : ' + (M.byCode[code] ? M.byCode[code].name : code));
    }
    setGranularity(gran) {
      this.state.gran = gran === 'M' ? 'M' : 'Q';
      this.state.sub = this.state.gran === 'M' ? 12 : 4;
      this.$$('[data-gran]').forEach((b) => b.classList.toggle('on', b.dataset.gran === this.state.gran));
      this.buildSubPeriods();
      this.update();
    }
    buildSubPeriods() {
      const sel = this.$('[data-subperiod]');
      if (!sel) return;
      const opts = this.state.gran === 'M'
        ? M.MONTHS_LONG.map((m, i) => '<option value="' + (i + 1) + '"' + (i + 1 === this.state.sub ? ' selected' : '') + '>' + m + ' 2024</option>')
        : M.QUARTERS.map((q, i) => '<option value="' + (i + 1) + '"' + (i + 1 === this.state.sub ? ' selected' : '') + '>' + q + ' 2024</option>');
      sel.innerHTML = opts.join('');
    }
    toggleChip(code) {
      const sel = this.state.g4Sel;
      const i = sel.indexOf(code);
      if (i >= 0) { if (sel.length > 1) sel.splice(i, 1); }
      else if (sel.length < 3) sel.push(code);
      else sel[0] = code;
      this.update({ only: ['g4'] });
      this.renderChips();
      this.renderLegends();
    }
    toggleSeries(key, card) {
      const ch = this.charts[card];
      if (!ch) return;
      if (ch.hidden.has(key)) ch.hidden.delete(key); else ch.hidden.add(key);
      this.$$('[data-legend-item][data-legend-card="' + card + '"]').forEach((b) => b.classList.toggle('off', ch.hidden.has(b.dataset.legendItem)));
      ch.refresh();
    }

    /* ------------------------------------------------------------------ */
    /* Mise à jour complète                                                */
    /* ------------------------------------------------------------------ */
    update(opts) {
      const only = opts && opts.only;
      const view = M.build(this.state);
      this.view = view;
      const meta = view.meta;

      /* Fil d'Ariane + sous-titre */
      const crumb = this.$('[data-crumb]');
      if (crumb) crumb.textContent = meta.mode === 'country' ? meta.countryName : 'Mode : Régional (Afrique de l’Ouest)';

      /* Sélecteur de pays */
      const cc = M.byCode[this.state.country];
      const pc = this.$('[data-picker-code]'), pn = this.$('[data-picker-name]');
      if (pc) pc.textContent = this.state.country;
      if (pn) pn.textContent = cc ? cc.name : '';
      this.renderPickerList(this.$('[data-picker-search]') ? this.$('[data-picker-search]').value : '');

      /* Badge de synchro */
      this.renderSync();

      /* Bandeau de périmètre */
      this.renderBanner();

      /* KPI */
      if (!only) this.renderKpis();

      /* Sous-titres des cards */
      this.setSub('g1', meta.mode === 'country'
        ? 'Districts de ' + meta.countryName + ' · répartition de la population par phase IPC'
        : '16 pays d’Afrique de l’Ouest · répartition de la population par phase IPC');
      this.setSub('g2', meta.granularity === 'M' ? 'Série mensuelle 2023 → 2024 (App mVAM)' : 'Série trimestrielle 2020 → 2024 (App mVAM)');
      this.setSub('g8', meta.mode === 'country'
        ? 'Découpage par districts de ' + meta.countryName + ' · survol pour la fiche IPC / FCS / CSI'
        : 'Afrique de l’Ouest · 16 pays colorés selon la phase IPC dominante (clic pour détailler)');

      /* Données des graphiques */
      const feed = {
        g1: view.g1, g2: view.g2, g3: view.g3, g4: view.g4, g5: view.g5, g6: view.g6, g7: view.g7,
        g8: view.g8, g9: view.g9, g10: view.g10, g11: view.g11, g12: view.g12, g13: view.g13,
        g14: view.g14, g15: view.g15
      };
      Object.keys(feed).forEach((id) => {
        if (only && only.indexOf(id) < 0) return;
        const ch = this.charts[id];
        if (ch) ch.setData(feed[id]);
      });
      if (!only) {
        Object.keys(KPI_CHART).forEach((id) => {
          const ch = this.kpiCharts[id];
          if (ch) ch.setData(view.kpis[id].viz);
        });
      }

      this.renderLegends();
      if (!only) { this.renderChips(); this.renderTable(); this.renderFeet(); }
    }

    setSub(id, txt) {
      const el = this.$('[data-sub="' + id + '"]');
      if (el) el.textContent = txt;
    }

    /* ------------------------------------------------------------------ */
    /* KPI                                                                 */
    /* ------------------------------------------------------------------ */
    renderKpis() {
      const k = this.view.kpis;
      Object.keys(k).forEach((id) => {
        const card = this.$('[data-kpi="' + id + '"]');
        if (!card) return;
        const d = k[id];
        const val = card.querySelector('[data-value]');
        const dec = d.unit === 'M' ? (d.value < 1 ? 2 : 1) : (id === 'k5' ? 1 : id === 'k2' ? 1 : 0);
        if (val) {
          val.style.color = d.color;
          WFP.countUp(val, d.value, {
            decimals: dec, suffix: d.unit,
            format: (v) => WFP.fmtInt(v)
          });
        }
        const lab = card.querySelector('[data-label]'); if (lab) lab.textContent = d.label;
        const sub = card.querySelector('[data-sublabel]'); if (sub) sub.textContent = d.sub;
        const foot = card.querySelector('[data-foot]'); if (foot) foot.textContent = d.foot;
        const badge = card.querySelector('[data-badge]');
        if (badge && d.badge) {
          badge.className = 'wf-badge ' + (d.badge.dir === 'up' ? 'up' : 'down');
          badge.innerHTML = (d.badge.dir === 'up' ? WFP.ICONS.arrowUp : WFP.ICONS.arrowDown) + '<span>' + esc(d.badge.text) + '</span>';
        }
      });
    }

    /* ------------------------------------------------------------------ */
    /* Légendes (pastilles 8 px + toggle séries)                           */
    /* ------------------------------------------------------------------ */
    renderLegends() {
      const v = this.view;
      const sets = {
        g1: v.g1.phases.map((p) => ({ key: 'p' + p.key, label: p.label, color: p.color })),
        g2: v.g2.series.map((s) => ({ key: s.key, label: s.label, color: s.color })),
        g4: v.g4.series.map((s) => ({ key: s.key, label: s.label, color: s.color })),
        g9: v.g9.series.map((s) => ({ key: s.key, label: s.label, color: s.color }))
      };
      CARDS_WITH_LEGEND.forEach((id) => {
        const host = this.$('[data-legend="' + id + '"]');
        if (!host) return;
        const ch = this.charts[id];
        host.innerHTML = (sets[id] || []).map((it) =>
          '<button data-legend-item="' + esc(it.key) + '" data-legend-card="' + id + '"' +
          (ch && ch.hidden.has(it.key) ? ' class="off"' : '') + '>' +
          '<i style="background:' + it.color + '"></i><span>' + esc(it.label) + '</span></button>').join('');
      });
    }

    /* Chips de sélection (radar CSI en vue globale) */
    renderChips() {
      const host = this.$('[data-chips="g4"]');
      if (!host) return;
      if (this.view.meta.mode === 'country') {
        host.innerHTML = '<span class="wf-chip-note">Mode Pays : comparaison ' + esc(this.view.meta.countryName) +
          ' vs moyenne régionale vs cible PAM. Basculez en Vue Globale pour comparer plusieurs pays.</span>';
        return;
      }
      host.innerHTML = '<span class="wf-chip-label">Comparer (3 max) :</span>' +
        M.countries.map((c) => '<button class="wf-chip' + (this.state.g4Sel.indexOf(c.code) >= 0 ? ' on' : '') +
          '" data-chip="' + c.code + '">' + c.flag + ' ' + esc(c.name) + '</button>').join('');
    }

    /* ------------------------------------------------------------------ */
    /* Bandeau de périmètre                                                */
    /* ------------------------------------------------------------------ */
    renderBanner() {
      const el = this.$('[data-banner]');
      if (!el) return;
      const m = this.view.meta;
      const r = m.ref;
      const cls = r.ipc >= 4 ? 'critical' : r.ipc === 3 ? 'high' : 'moderate';
      el.className = 'wf-banner ' + cls;
      el.innerHTML =
        '<div class="wf-banner-main"><span class="wf-banner-flag">' + m.flag + '</span>' +
          '<div><b>' + esc(m.countryName) + '</b>' +
          '<span>' + (m.mode === 'country' ? 'Vue détaillée par pays' : 'Vue globale régionale · 16 pays') +
          ' · ' + esc(m.periodLabel) + ' · ' + (m.gran === 'M' ? 'granularité mensuelle' : 'granularité trimestrielle') + '</span></div></div>' +
        '<div class="wf-banner-stats">' +
          this.bannerStat('Phase IPC', 'IPC ' + r.ipc, WFP.DATA.ipcProfiles[r.ipc].label) +
          this.bannerStat('FCS', r.fcs.toFixed(1), r.fcs >= 42 ? 'Acceptable' : r.fcs >= 28 ? 'Limite' : 'Pauvre') +
          this.bannerStat('CSI', String(r.csi), r.csi > 28 ? 'Stratégies élevées' : 'Stratégies modérées') +
          this.bannerStat('MUAC', r.muac.toFixed(1) + '%', r.muac >= 10 ? 'Urgence nutritionnelle' : 'Sous contrôle') +
          this.bannerStat('Accès éco.', r.access + '%', 'ménages capables d’acheter') +
        '</div>' +
        (m.mode === 'country' ? '<button class="wf-btn ghost" data-action="back-region">← Vue Globale</button>' : '');
    }
    bannerStat(label, value, note) {
      return '<div class="wf-banner-stat"><span>' + esc(label) + '</span><b>' + esc(value) + '</b><small>' + esc(note) + '</small></div>';
    }

    /* ------------------------------------------------------------------ */
    /* Sélecteur de pays                                                   */
    /* ------------------------------------------------------------------ */
    renderPickerList(filter) {
      const host = this.$('[data-picker-list]');
      if (!host) return;
      const f = (filter || '').toLowerCase().trim();
      const list = M.countries.filter((c) => !f || c.name.toLowerCase().indexOf(f) >= 0 || c.code.toLowerCase() === f);
      host.innerHTML = list.map((c) =>
        '<button class="wf-pop-item' + (this.state.country === c.code && this.state.mode === 'country' ? ' on' : '') + '" data-country-item="' + c.code + '">' +
        '<span class="flag">' + c.flag + '</span><span class="name">' + esc(c.name) + '</span>' +
        '<span class="num">' + c.fcs.toFixed(1) + '</span>' +
        '<span class="ipc" style="background:' + WFP.DATA.ipcProfiles[c.ipc].color + '">IPC ' + c.ipc + '</span></button>').join('') ||
        '<div class="wf-pop-empty">Aucun pays ne correspond</div>';
    }

    /* ------------------------------------------------------------------ */
    /* Scorecard (tableau triable)                                         */
    /* ------------------------------------------------------------------ */
    renderTable() {
      const table = this.$('[data-table]');
      if (!table) return;
      const cols = [
        { key: 'name', label: this.view.meta.zoneUnit === 'district' ? 'District' : 'Pays', num: false },
        { key: 'fcs', label: 'FCS 2024', num: true },
        { key: 'fcsPrev', label: 'FCS 2020', num: true },
        { key: 'csi', label: 'CSI', num: true },
        { key: 'ipc', label: 'IPC', num: true },
        { key: 'muac', label: 'MUAC %', num: true },
        { key: 'priceIndex', label: 'Index prix', num: true },
        { key: 'access', label: 'Accès éco. %', num: true },
        { key: 'hdds', label: 'HDDS', num: true },
        { key: 'insecure', label: 'Insécurité (M)', num: true },
        { key: 'beneficiaries', label: 'Assistés (M)', num: true }
      ];
      const st = this.state.sort;
      table.querySelector('thead').innerHTML = '<tr>' + cols.map((c) =>
        '<th' + (c.num ? ' class="num"' : '') + ' data-sort="' + c.key + '">' + esc(c.label) +
        (st.key === c.key ? '<span class="arr">' + (st.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>').join('') + '</tr>';

      const f = this.state.search.toLowerCase().trim();
      let rows = this.view.zones.filter((z) => !f || String(z.name).toLowerCase().indexOf(f) >= 0);
      rows = rows.slice().sort((a, b) => {
        const va = a[st.key], vb = b[st.key];
        if (typeof va === 'string') return va.localeCompare(vb) * st.dir;
        return (va - vb) * st.dir;
      });
      table.querySelector('tbody').innerHTML = rows.map((z) =>
        '<tr>' +
        '<td><span class="cell-zone">' + esc(z.name) + '</span></td>' +
        '<td class="num"><b style="color:' + (z.fcs >= 42 ? C.tertiary : z.fcs >= 28 ? C.primary : C.danger) + '">' + z.fcs.toFixed(1) + '</b></td>' +
        '<td class="num muted">' + z.fcsPrev.toFixed(1) + '</td>' +
        '<td class="num">' + z.csi + '</td>' +
        '<td class="num"><span class="pill-ipc" style="background:' + WFP.DATA.ipcProfiles[z.ipc].color + '">IPC ' + z.ipc + '</span></td>' +
        '<td class="num">' + z.muac.toFixed(1) + '</td>' +
        '<td class="num">' + z.priceIndex.toFixed(1) + '</td>' +
        '<td class="num">' + z.access + '</td>' +
        '<td class="num">' + z.hdds.toFixed(1) + '</td>' +
        '<td class="num">' + z.insecure.toFixed(2) + '</td>' +
        '<td class="num">' + z.beneficiaries.toFixed(2) + '</td>' +
        '</tr>').join('');
      const foot = this.$('[data-table-foot]');
      if (foot) {
        foot.innerHTML = rows.length + ' ' + (this.view.meta.zoneUnit === 'district' ? 'districts' : 'pays') +
          ' · périmètre : ' + esc(this.view.meta.countryName) + ' · ' + esc(this.view.meta.periodLabel);
      }
    }
    sortTable(key) {
      const st = this.state.sort;
      if (st.key === key) st.dir = -st.dir; else { st.key = key; st.dir = key === 'name' ? 1 : -1; }
      this.renderTable();
    }

    /* ------------------------------------------------------------------ */
    /* Pieds de cards (contexte + source)                                  */
    /* ------------------------------------------------------------------ */
    renderFeet() {
      const v = this.view, m = v.meta;
      const feet = {
        g1: (m.zoneUnit === 'district' ? 'Districts de ' + m.countryName : '16 pays') + ' · ' +
          v.g1.zones.filter((z) => z.ipc >= 3).length + ' zone(s) en IPC 3+ · ' +
          WFP.fmtInt(v.g1.zones.reduce((a, z) => a + z.persons, 0)) + ' personnes couvertes',
        g2: 'Seuil acceptable : 42 · Seuil pauvre : 28 · ' + v.g2.labels.length + ' périodes affichées',
        g3: 'Échelle : ×0.8 (vert) → ×2.0 (rouge famine) · ' + v.g3.rows.length + ' produits × ' + v.g3.cols.length + ' mois',
        g4: m.mode === 'country' ? 'Pays vs moyenne régionale vs cible PAM (CSI ≤ 20)' : '3 pays comparés · modifiable via les chips',
        g5: '48 relevés terrain · r = ' + v.g5.regression.r.toFixed(2) + ' (corrélation prix ↔ MUAC)',
        g6: 'Perte totale de la chaîne : ' + (100 - v.g6.steps[v.g6.steps.length - 1].share).toFixed(1) + '% entre la cible et la confirmation de réception',
        g7: 'Total annuel : ' + WFP.fmtInt(v.g7.values.reduce((a, b) => a + b, 0)) + ' alertes · pic en ' +
          M.MONTHS_LONG[v.g7.values.indexOf(Math.max.apply(null, v.g7.values))],
        g8: m.mode === 'country' ? v.g8.zones.length + ' districts cartographiés · clic sur un district pour la fiche' : 'Clic sur un pays : bascule en vue détaillée',
        g9: 'Prix moyen en ' + v.g9.unit + ' · 5 céréales suivies hebdomadairement',
        g10: 'Disponibilité normalisée sur 2 400 kcal/j · gap = disponibilité − accès économique',
        g11: WFP.fmtInt(v.g11.households) + ' ménages enquêtés · moyenne HDDS ' + v.g11.mean.toFixed(1) + '/12',
        g12: v.g12.rows.filter((r) => r.delta >= 0).length + ' zone(s) en amélioration · ' +
          v.g12.rows.filter((r) => r.delta < 0).length + ' en dégradation depuis 2020',
        g13: 'Colonnes : 12 mois · ligne en surbrillance = période sélectionnée (' + esc(m.periodLabel) + ')',
        g14: 'Couverture du besoin : ' + Math.round((v.g14.steps[3].value / v.g14.steps[0].value) * 100) + '% · gap ' +
          Math.abs(v.g14.steps[v.g14.steps.length - 1].value).toFixed(1) + ' ' + v.g14.unit,
        g15: v.g15.rows.filter((r) => (r.higherIsBetter ? r.value >= r.target : r.value <= r.target)).length +
          ' / ' + v.g15.rows.length + ' indicateurs à l’objectif PAM'
      };
      Object.keys(feet).forEach((id) => {
        const el = this.$('[data-foot="' + id + '"]');
        if (el) el.textContent = feet[id];
      });
    }

    /* ------------------------------------------------------------------ */
    /* Navigation, scrollspy, divers                                       */
    /* ------------------------------------------------------------------ */
    /* Le défilement peut être porté par la page hôte (index.html) ou par
     * l'élément hôte lui-même en plein écran : on résout d'abord le conteneur
     * réellement défilant, puis on anime scrollTop en requestAnimationFrame.
     * Les 132 px retranchés correspondent à la hauteur de l'en-tête collant. */
    scrollContainer() {
      /* En plein écran, requestFullscreen() a été appelé sur l'élément hôte :
       * c'est lui qui défile (voir wfp-nutritracker-host.css). Hors plein
       * écran, c'est le document de la page hôte. */
      if (document.fullscreenElement === this && this.scrollHeight > this.clientHeight) return this;
      return global.document.scrollingElement || global.document.documentElement;
    }
    navigate(id) {
      const item = WFP.NAV.filter((n) => n.id === id)[0];
      if (!item) return;
      /* L'item actif est mis à jour immédiatement, avant même le défilement. */
      this.$$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === id));
      const target = this.$('#' + item.target);
      if (!target) return;
      const box = this.scrollContainer();
      /* Repli natif quand le conteneur n'a rien à défiler (hauteur insuffisante
       * ou navigateur sans dimensions de mise en page). */
      if (box.scrollHeight <= box.clientHeight) {
        if (target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      /* Origine du conteneur dans le repère viewport : 0 pour le document,
       * son propre rect.top pour un élément défilant. */
      const isDoc = box === (global.document.scrollingElement || global.document.documentElement);
      const boxTop = isDoc ? 0 : box.getBoundingClientRect().top;
      const to = Math.max(0, box.scrollTop + (target.getBoundingClientRect().top - boxTop) - 132);
      this.scrollTo(box, to);
    }
    /* Défilement animé (ease-out cubique, 520 ms) sur n'importe quel conteneur */
    scrollTo(box, to) {
      if (this._scrollRAF && global.cancelAnimationFrame) { global.cancelAnimationFrame(this._scrollRAF); this._scrollRAF = null; }
      const from = box.scrollTop;
      const delta = to - from;
      if (Math.abs(delta) < 1) return;
      const t0 = global.performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - t0) / 520);
        box.scrollTop = from + delta * (1 - Math.pow(1 - t, 3));
        this._scrollRAF = t < 1 && global.requestAnimationFrame ? global.requestAnimationFrame(step) : null;
      };
      this._scrollRAF = global.requestAnimationFrame ? global.requestAnimationFrame(step) : null;
      if (!this._scrollRAF) box.scrollTop = to;
    }
    /* Scrollspy basé sur getBoundingClientRect : fonctionne quel que soit
     * l'élément qui défile (fenêtre hôte ou conteneur interne). */
    scrollSpy() {
      let ticking = false;
      const compute = () => {
        ticking = false;
        let current = WFP.NAV[0].id;
        WFP.NAV.forEach((n) => {
          const el = this.$('#' + n.target);
          if (el && el.getBoundingClientRect().top <= 160) current = n.id;
        });
        this.$$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === current));
      };
      const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(compute); } };
      global.addEventListener('scroll', onScroll, { passive: true });
      const main = this.$('.wf-main');
      if (main) main.addEventListener('scroll', onScroll, { passive: true });
      /* En plein écran, le conteneur défilant est l'élément hôte lui-même
       * (requestFullscreen porte sur <wfp-nutritracker-dashboard>) : il faut
       * donc aussi écouter son propre défilement pour suivre la section active. */
      this.addEventListener('scroll', onScroll, { passive: true });
    }

    renderSync() {
      const hh = this.view ? WFP.fmtInt(this.view.meta.regional.hhMonth) : '312 400';
      const txt = 'Synchro App : il y a ' + this.syncMinutes + ' min (' + hh + ' ménages enquêtés ce mois)';
      const el = this.$('[data-sync-text]'); if (el) el.textContent = txt;
      const side = this.$('[data-side-sync]');
      if (side) side.textContent = WFP.DATA.meta.appVersion + ' · ' + WFP.fmtInt(this.view ? this.view.meta.regional.collectors : 0) + ' relais équipés';
    }
    startClock() {
      this._clock = setInterval(() => {
        this.syncMinutes = this.syncMinutes >= 59 ? 1 : this.syncMinutes + 1;
        this.renderSync();
      }, 60000);
    }
    forceSync() {
      this.syncMinutes = 0;
      this.renderSync();
      this.toast('Synchronisation forcée · lots App reçus');
      this.update();
    }

    toggleFullscreen() {
      const host = this;
      if (!document.fullscreenElement) {
        if (host.requestFullscreen) host.requestFullscreen().catch(() => this.toast('Plein écran refusé par le navigateur'));
      } else if (document.exitFullscreen) document.exitFullscreen();
    }
    toggleLegacy() {
      if (!this.section) return;
      const show = this.section.classList.toggle('wf-show-legacy');
      const btn = this.$('[data-action="legacy"]');
      if (btn) btn.textContent = show ? 'Masquer les modules WFP historiques' : 'Afficher les modules WFP historiques';
      setTimeout(() => this.refreshAll(), 60);
    }

    /* ------------------------------------------------------------------ */
    /* Exports                                                             */
    /* ------------------------------------------------------------------ */
    exportPDF() {
      this.classList.add('wf-printing');
      this.refreshAll();
      setTimeout(() => {
        global.print();
        setTimeout(() => this.classList.remove('wf-printing'), 600);
      }, 220);
      this.toast('Rapport PDF : fenêtre d’impression ouverte');
    }
    exportCSV() {
      const v = this.view;
      const head = ['Zone', 'FCS 2024', 'FCS 2020', 'CSI', 'IPC', 'MUAC %', 'Index prix', 'Accès économique %', 'HDDS', 'Insécurité (M)', 'Bénéficiaires (M)', 'Population (M)'];
      const lines = [head.join(';')].concat(v.zones.map((z) => [
        z.name, z.fcs, z.fcsPrev, z.csi, z.ipc, z.muac, z.priceIndex, z.access, z.hdds, z.insecure, z.beneficiaries, z.pop
      ].join(';')));
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wfp-nutritracker-' + (v.meta.mode === 'country' ? v.meta.country : 'afrique-ouest') + '-' + v.meta.periodLabel.replace(/\s+/g, '-') + '.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      this.toast('Export CSV : ' + v.zones.length + ' zones');
    }

    toast(msg) {
      const el = this.$('[data-toast]');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('on');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => el.classList.remove('on'), 2600);
    }
  }

  if (!global.customElements.get('wfp-nutritracker-dashboard')) {
    global.customElements.define('wfp-nutritracker-dashboard', WfpNutriTrackerDashboard);
  }
  WFP.Dashboard = WfpNutriTrackerDashboard;
})(window);
