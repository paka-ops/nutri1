/* ============================================================================
 * NutriTracker West Africa · Surveillance Communautaire
 * Fichier : nutritracker-dashboard.js
 * Rôle    : Web Component <nutritracker-dashboard> (Custom Element + Shadow DOM)
 *
 *  - Encapsulation complète : le Shadow DOM isole les styles et le DOM du
 *    tableau de bord du reste de index.html (qui contient de nombreux scripts
 *    globaux : MutationObserver, styles sur button/table/canvas, etc.).
 *  - Gère l'état des filtres (mode Région/Pays, pays, année, période,
 *    sélections de chips), reconstruit la "vue" via NutriTracker.model.build()
 *    et réanime les 15 graphiques + 5 KPI à chaque changement.
 *  - Navigation latérale (scroll animé en requestAnimationFrame + scrollspy),
 *    export PDF (rapport imprimable) / CSV, plein écran, fiche détaillée.
 *
 *  Dépendances (chargées avant ce fichier, voir index.html) :
 *    nutritracker-data.js · nutritracker-model.js · nutritracker-chart-core.js
 *    charts/*.js · nutritracker-template.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = global.NutriTracker;
  if (!NT || !NT.model || !NT.Chart || !NT.template) {
    console.error('[NutriTracker] dépendances manquantes : vérifier l’ordre des <script> dans index.html');
    return;
  }
  const M = NT.model;
  const esc = NT.escape;

  /* Dossier du composant (pour charger la feuille de style dans le Shadow DOM) */
  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, '') : 'components/who-nutritracker/';

  /* Association card → définition Canvas */
  const CHART_MAP = {
    g1: 'stuntingTrend', g2: 'ranking', g3: 'radar', g4: 'seasonality', g5: 'muacDonut', g6: 'bubble', g7: 'waterfall',
    g8: 'heatmap', g9: 'anje', g10: 'anemiaStack', g11: 'polarAlerts', g12: 'quadrant', g13: 'timeline1000', g14: 'microGauges'
  };
  const SEV_STUNTING = [
    { color: '#EF4444', label: '> 35%' }, { color: '#F59E0B', label: '20–35%' }, { color: '#10B981', label: '10–20%' }, { color: '#0066CC', label: '< 10%' }
  ];
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const avgOf = (a) => sum(a) / (a.length || 1);
  const signPts = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1) + ' pts';

  class NutriTrackerDashboard extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      const root = this.attachShadow({ mode: 'open' });
      this.root = root;

      /* Feuille de style encapsulée */
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = BASE + 'nutritracker.css';
      link.onload = link.onerror = () => { this.classList.add('nt-ready'); this.refreshAll(); };
      root.appendChild(link);
      const tpl = document.createElement('template');
      tpl.innerHTML = NT.template();
      root.appendChild(tpl.content);
      setTimeout(() => this.classList.add('nt-ready'), 1500); // filet de sécurité

      this.$ = (q) => root.querySelector(q);
      this.$$ = (q) => Array.from(root.querySelectorAll(q));

      /* État initial des filtres */
      this.state = {
        mode: 'region', country: 'NE', year: 2024, period: 'year', gran: 'year',
        g1Sel: ['NE', 'ML', 'BF', 'SN', 'NG'], g2Ind: 'stunting', g3Sel: ['NE', 'SN', 'GH'], g9Sel: ['NE', 'SN', 'GH', 'NG'],
        search: '', sort: { key: 'score', dir: 1 }
      };
      this.syncMinutes = 12;
      this.syncExtra = 0;
      this.sparks = [];

      /* Prise de contrôle de la section #who : les anciens modules sont
       * masqués (CSS hôte) mais conservés pour les scripts existants. */
      this.section = this.closest('section');
      if (this.section) this.section.classList.add('nt-takeover');

      this.initCharts();
      this.bindEvents();
      this.update();
      this.observeCards();
      this.scrollSpy();
      this.startClock();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.refreshAll());
    }

    disconnectedCallback() {
      clearInterval(this._clock);
    }

    /* ------------------------------------------------------------------ */
    /* Initialisation des instances Canvas                                 */
    /* ------------------------------------------------------------------ */
    initCharts() {
      this.charts = {};
      this.$$('[data-chart]').forEach((host) => {
        const id = host.dataset.chart;
        const def = Object.assign({}, NT.charts[CHART_MAP[id]]);
        if (id === 'g2') def.onClick = (hit) => { if (hit.item && hit.item.code) this.selectCountry(hit.item.code, true); };
        this.charts[id] = new NT.Chart(host, def);
      });
      this.charts.g13.selected = 2;
      this.charts.g13.onSelect = (i) => this.renderMilestone(i);
      this.kpiCharts = {};
      this.$$('[data-kpi-chart]').forEach((host) => {
        const name = host.dataset.kpiChart;
        this.kpiCharts[name] = new NT.Chart(host, Object.assign({}, NT.charts[name]));
      });
    }
    refreshAll() {
      if (!this.charts) return;
      Object.values(this.charts).concat(Object.values(this.kpiCharts)).forEach((c) => { c.resize(); c.refresh(); });
    }

    /* ------------------------------------------------------------------ */
    /* Événements                                                          */
    /* ------------------------------------------------------------------ */
    bindEvents() {
      const root = this.root;
      /* Délégation des clics dans le Shadow DOM */
      root.addEventListener('click', (e) => {
        const t = e.target.closest('[data-action],[data-mode],[data-gran],[data-ind],[data-nav],[data-chip],[data-sort],[data-detail],[data-country-item]');
        if (!e.target.closest('.nt-picker')) this.togglePop('picker', false);
        if (!e.target.closest('.nt-menu')) this.togglePop('export', false);
        if (!t) { if (e.target.matches('[data-modal]')) this.closeModal(); return; }
        if (t.dataset.mode) return this.setMode(t.dataset.mode);
        if (t.dataset.gran) return this.setGranularity(t.dataset.gran);
        if (t.dataset.ind) { this.state.g2Ind = t.dataset.ind; this.$$('[data-ind]').forEach((b) => b.classList.toggle('on', b === t)); return this.update({ only: ['g2'] }); }
        if (t.dataset.nav) return this.navigate(t.dataset.nav);
        if (t.dataset.chip) return this.toggleChip(t.dataset.chipGroup, t.dataset.chip);
        if (t.dataset.sort) return this.sortTable(t.dataset.sort);
        if (t.dataset.countryItem) { this.togglePop('picker', false); return this.selectCountry(t.dataset.countryItem); }
        if (t.dataset.detail) return this.openDetail(t.dataset.detail);
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
      /* Filtres année / sous-période */
      this.$('[data-year]').addEventListener('change', (e) => { this.state.year = +e.target.value; this.update(); this.toast('Période : ' + this.view.labels.period); });
      this.$('[data-subperiod]').addEventListener('change', (e) => { this.state.period = e.target.value; this.update(); });
      /* Recherche pays (dropdown) et scorecard (temps réel) */
      this.$('[data-picker-search]').addEventListener('input', (e) => this.renderPicker(e.target.value));
      this.$('[data-search]').addEventListener('input', (e) => { this.state.search = e.target.value; this.renderTable(this.view); });
      /* Clavier : Échap ferme pop-ups / modal / plein écran */
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (this.$('[data-modal]').classList.contains('open')) return this.closeModal();
        this.togglePop('picker', false); this.togglePop('export', false);
        if (this.hasAttribute('fullscreen')) this.toggleFullscreen();
      });
      /* Clic hors du composant → fermer les pop-ups */
      document.addEventListener('click', (e) => { if (!e.composedPath().includes(this)) { this.togglePop('picker', false); this.togglePop('export', false); } });
    }

    togglePop(name, force) {
      const pop = this.$('[data-pop="' + name + '"]');
      if (!pop) return;
      const open = force == null ? !pop.classList.contains('open') : force;
      pop.classList.toggle('open', open);
      if (open && name === 'picker') { this.renderPicker(''); const inp = this.$('[data-picker-search]'); inp.value = ''; setTimeout(() => inp.focus(), 30); }
    }

    /* ------------------------------------------------------------------ */
    /* Actions de filtrage                                                 */
    /* ------------------------------------------------------------------ */
    setMode(mode) {
      if (mode === 'country') {
        const was = this.state.mode;
        this.state.mode = 'country';
        if (was !== 'country') { this.update(); this.toast('Vue pays : ' + this.view.country.name + ' (comparée à la moyenne régionale)'); }
        this.togglePop('picker', true);
      } else {
        if (this.state.mode === 'region') return;
        this.state.mode = 'region';
        this.togglePop('picker', false);
        this.update();
        this.toast('Vue Globale Afrique de l’Ouest · 16 pays');
      }
    }
    selectCountry(code, scrollTop) {
      this.state.country = code;
      this.state.mode = 'country';
      this.state.search = '';
      this.$('[data-search]').value = '';
      this.update();
      this.toast('Vue pays : ' + this.view.country.name + ' · ' + this.view.districts.length + ' districts');
      if (scrollTop) this.scrollToEl(this.$('#sec-overview'));
    }
    setGranularity(g) {
      this.state.gran = g;
      this.$$('[data-gran]').forEach((b) => b.classList.toggle('on', b.dataset.gran === g));
      const wrap = this.$('[data-subperiod-wrap]'), sel = this.$('[data-subperiod]');
      if (g === 'year') { wrap.hidden = true; this.state.period = 'year'; }
      else {
        wrap.hidden = false;
        if (g === 'Q') { sel.innerHTML = [1, 2, 3, 4].map((q) => '<option value="Q' + q + '">T' + q + (q === 3 ? ' · Soudure' : '') + '</option>').join(''); sel.value = 'Q3'; }
        else { sel.innerHTML = M.MONTHS_LONG.map((m, i) => '<option value="M' + (i + 1) + '">' + m + '</option>').join(''); sel.value = 'M8'; }
        this.state.period = sel.value;
      }
      this.update();
    }
    toggleChip(group, code) {
      const max = { g1: 6, g3: 3, g9: 4 }[group];
      const key = group + 'Sel';
      const sel = this.state[key].slice();
      const i = sel.indexOf(code);
      if (i >= 0) {
        if (sel.length <= 1) return this.toast('Au moins un pays doit rester sélectionné');
        sel.splice(i, 1);
      } else {
        if (sel.length >= max) {
          if (group === 'g3') sel.shift(); // radar : remplacement du plus ancien
          else return this.toast(max + ' pays maximum pour ce graphique');
        }
        sel.push(code);
      }
      this.state[key] = sel;
      this.charts[group].hidden.clear();
      this.update({ only: [group] });
    }

    /* ------------------------------------------------------------------ */
    /* Mise à jour globale (recalcule la vue + réanime)                    */
    /* ------------------------------------------------------------------ */
    update(opts) {
      opts = opts || {};
      const V = (this.view = M.build(this.state));
      const scopeKey = V.isCountry + ':' + this.state.country;
      if (scopeKey !== this._scopeKey) {
        Object.values(this.charts).forEach((c) => c.hidden.clear());
        this._scopeKey = scopeKey;
      }
      if (opts.only) { opts.only.forEach((id) => this.renderCard(id, V)); return; }
      this.renderHeader(V);
      this.renderBanner(V);
      this.renderKpis(V);
      Object.keys(CHART_MAP).forEach((id) => this.renderCard(id, V));
      this.renderTable(V);
      this.renderSyncPanel(V);
    }

    /* ---------- Header : fil d'Ariane, sous-titre, synchro ---------- */
    renderHeader(V) {
      const s = this.state;
      this.$('[data-crumb]').textContent = V.isCountry ? V.country.name : 'Mode : Régional';
      this.$('[data-subtitle]').innerHTML = V.isCountry
        ? '<b>' + esc(V.country.name) + '</b> · Données App Mobile ' + V.year + ' · ' + V.districts.length + ' districts · comparaison à la moyenne régionale'
        : 'Afrique de l’Ouest · Données App Mobile ' + V.year + ' · 16 Pays';
      this.$$('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === s.mode));
      this.$('[data-picker]').classList.toggle('disabled', s.mode !== 'country');
      this.$('[data-picker-code]').textContent = s.country;
      this.$('[data-picker-name]').textContent = M.byCode[s.country].name;
      this.$('[data-export-label]').textContent = V.isCountry ? 'Exporter Rapport Pays' : 'Exporter Rapport Région';
      this.renderSyncText();
      this.setNavActive(this._spySection || 'sec-overview');
    }
    renderSyncText() {
      const V = this.view; if (!V) return;
      const when = this.syncMinutes === 0 ? 'à l’instant' : 'il y a ' + this.syncMinutes + ' min';
      const scope = V.period[0] === 'M' ? 'en ' + M.MONTHS_LONG[V.months[0]].toLowerCase() : 'ce mois';
      this.$('[data-sync-text]').innerHTML = 'Dernière synchro app : <b>' + when + '</b> (' + NT.fmtInt(V.sync.screened + this.syncExtra) + ' enfants dépistés ' + scope + ')';
    }
    renderPicker(filter) {
      const f = (filter || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const list = NT.DATA.countries.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'))
        .filter((c) => !f || c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(f) || c.code.toLowerCase().includes(f));
      this.$('[data-picker-list]').innerHTML = list.map((c) =>
        '<button class="nt-pop-item' + (c.code === this.state.country && this.state.mode === 'country' ? ' on' : '') + '" data-country-item="' + c.code + '">' +
        '<span class="code">' + c.code + '</span><span>' + esc(c.name) + '</span>' +
        '<span class="bar"><i style="width:' + Math.min(100, c.stunting * 2) + '%;background:' + M.severityColor('stunting', c.stunting) + '"></i></span>' +
        '<span class="val">' + c.score + '</span></button>').join('') || '<div class="nt-empty">Aucun pays</div>';
    }

    /* ---------- Bandeau du pays sélectionné ---------- */
    renderBanner(V) {
      const el = this.$('[data-banner]');
      el.classList.toggle('on', V.isCountry);
      if (!V.isCountry) { el.innerHTML = ''; return; }
      const c = V.country, st = M.statusOf(c.score);
      el.innerHTML = '<span class="code">' + c.code + '</span><div><h3>' + esc(c.name) + ' · Vue détaillée</h3><p>Toutes les données sont recalculées pour ce pays et comparées à la moyenne régionale · ' + esc(V.labels.period) + '</p></div>' +
        '<div class="stats"><div><b>' + c.score + '/100</b>Score global · ' + st.label + '</div><div><b>' + V.districts.length + '</b>Districts suivis</div><div><b>' + NT.fmtCompact(c.pop5 * 1e6) + '</b>Enfants < 5 ans</div><div><b>' + c.agentCov + '%</b>Couverture agents App</div></div>' +
        '<button class="nt-btn" data-action="back-region">← Vue régionale</button>';
    }

    /* ---------- 5 KPI ---------- */
    renderKpis(V) {
      const K = V.kpi;
      const set = (cls, o) => {
        const card = this.$('[data-kpi="' + cls + '"]');
        const b = card.querySelector('[data-badge]');
        const tone = o.badge.good ? 'good' : o.badge.warn ? 'warn' : 'bad';
        b.className = 'nt-badge ' + (o.neutral ? 'neutral' : tone);
        b.innerHTML = (o.badge.dir === 'down' ? NT.ICONS.arrowDown : NT.ICONS.arrowUp) + '<span>' + esc(o.badge.text) + '</span>';
        card.querySelector('[data-label]').textContent = o.label;
        card.querySelector('[data-sublabel]').textContent = o.sub;
        card.querySelector('[data-foot]').innerHTML = o.foot;
        const val = card.querySelector('[data-value]');
        if (!val.firstChild || val.firstChild.nodeType !== 3) { val.textContent = ''; val.appendChild(document.createTextNode('')); }
        if (o.unit) { let u = val.querySelector('small'); if (!u) { u = document.createElement('small'); val.appendChild(u); } u.textContent = o.unit; }
        else { const u = val.querySelector('small'); if (u) u.remove(); }
        NT.countUp(val.firstChild, o.value, { decimals: o.decimals, suffix: o.suffix || '' });
      };
      set('k-stunting', { value: K.stunting.value, decimals: 1, suffix: '%', label: 'Retard de croissance', sub: 'Enfants < 5 ans mesurés via l’App', badge: K.stunting.badge,
        foot: '<span>Évolution mensuelle des dépistages</span><b>' + V.year + '</b>' });
      set('k-wasting', { value: K.wasting.value, decimals: 1, suffix: '%', label: 'Malnutrition aigüe globale (MAG)', sub: 'Dépistage communautaire · Seuil alerte : >10%', badge: K.wasting.badge,
        foot: '<span>Statut vs seuil d’alerte 10%</span><b style="color:' + (K.wasting.value >= 10 ? '#EF4444' : '#FF6B35') + '">' + (K.wasting.value >= 10 ? 'Seuil dépassé' : 'Sous le seuil') + '</b>' });
      this.$('[data-kpi-side="wasting"]').innerHTML = 'Dépistage PB &lt; 125 mm<br><span style="color:#EF4444">▍</span> Seuil critique : <b>10%</b><br>Échelle : 0 – ' + K.wasting.max + '%';
      set('k-children', { value: K.children.value, label: 'Enfants enregistrés dans l’App', sub: 'Suivi actif ménages & relais terrain', badge: K.children.badge,
        foot: '<span>Taux de synchronisation des données</span><b>' + K.children.sync.toFixed(1) + '%</b>' });
      set('k-vita', { value: K.vitA.value, decimals: 1, suffix: '%', label: 'Suppléments administrés (Suivi App)', sub: 'Cible campagne communautaire : 80%', badge: K.vitA.badge,
        foot: '<span>Districts / Zones en objectif</span><b>' + K.vitA.districts + '</b>' });
      set('k-alerts', { value: K.alerts.value, unit: K.alerts.unit, label: 'Foyers d’alerte sous-nutrition / surpoids', sub: 'Signalements agents terrain en temps réel', badge: K.alerts.badge,
        foot: '<span>' + (V.isCountry ? 'Districts suivis' : 'Pays suivis') + '</span><b>' + K.alerts.total + '</b>' });
      this.$('[data-kpi-side="alerts"]').innerHTML = '<div class="nt-sev-legend"><span><i style="background:#EF4444"></i>Sévère <b>' + K.alerts.severity.severe + '</b></span><span><i style="background:#FF6B35"></i>Modéré <b>' + K.alerts.severity.moderate + '</b></span><span><i style="background:#10B981"></i>Sous contrôle <b>' + K.alerts.severity.controlled + '</b></span></div>';

      this.kpiCharts.kpiSpark.setData({ values: K.stunting.spark, color: '#0066CC', label: 'Stunting dépisté' });
      this.kpiCharts.kpiGauge.setData({ value: K.wasting.value, max: K.wasting.max, threshold: K.wasting.threshold });
      this.kpiCharts.kpiBars.setData({ values: K.children.bars });
      this.kpiCharts.kpiProgress.setData({ value: K.vitA.value, target: K.vitA.target });
      this.kpiCharts.kpiDonut.setData(K.alerts.severity);
    }

    /* ---------- Légende interactive (toggle séries) ---------- */
    legend(id, items, opts) {
      opts = opts || {};
      const host = this.$('[data-legend="' + id + '"]');
      if (!host) return;
      const ch = this.charts[id];
      host.innerHTML = items.map((it) =>
        '<button data-key="' + esc(it.key) + '" class="' + (ch && ch.hidden.has(it.key) ? 'off' : '') + '" title="' + (opts.static ? '' : 'Afficher / masquer') + '">' +
        '<i class="' + (it.dashed ? 'dash' : '') + '" style="background:' + it.color + ';border-color:' + it.color + '"></i>' +
        '<span>' + esc(it.label) + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</span>' + (it.value != null ? '<b>' + esc(it.value) + '</b>' : '') + '</button>').join('');
      if (opts.static || !ch) return;
      host.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.key;
        if (ch.hidden.has(k)) ch.hidden.delete(k);
        else {
          if (items.filter((i) => !ch.hidden.has(i.key)).length <= 1) return this.toast('Au moins une série doit rester visible');
          ch.hidden.add(k);
        }
        b.classList.toggle('off', ch.hidden.has(k));
        ch.refresh();
      }));
    }
    /* ---------- Chips pays ---------- */
    chips(id, selected, palette, label, hint) {
      const host = this.$('[data-chips="' + id + '"]');
      if (!host) return;
      if (this.view.isCountry) { host.style.display = 'none'; return; }
      host.style.display = '';
      host.innerHTML = '<span class="lbl">' + label + '</span>' + NT.DATA.countries.map((c) => {
        const i = selected.indexOf(c.code);
        return '<button class="nt-chip' + (i >= 0 ? ' on' : '') + '" data-chip="' + c.code + '" data-chip-group="' + id + '" style="--chip:' + (i >= 0 ? palette[i % palette.length] : '#CBD5E1') + '"><i></i>' + esc(c.name) + '</button>';
      }).join('') + (hint ? '<span class="hint">' + hint + '</span>' : '');
    }
    setText(attr, id, html) { const el = this.$('[data-' + attr + '="' + id + '"]'); if (el) el.innerHTML = html; }
    foot(id, parts) { this.setText('foot', id, parts.map((p) => '<span>' + p + '</span>').join('')); }

    /* ---------- Rendu de chaque card graphique ---------- */
    renderCard(id, V) {
      const ch = this.charts[id];
      const nm = V.isCountry ? V.country.name : 'Afrique de l’Ouest';
      switch (id) {
        case 'g1': {
          this.setText('sub', 'g1', V.isCountry ? esc(nm) + ' vs Moyenne régionale + 3 plus grands districts' : 'Comparaison multi-pays · données historiques des campagnes App');
          this.chips('g1', this.state.g1Sel, M.PALETTE, 'Comparer', 'max. 6');
          this.legend('g1', V.g1.series.map((s) => ({ key: s.key, label: s.label, color: s.color, dashed: s.dashed })));
          ch.setData(V.g1);
          const first = V.g1.series[0];
          if (V.isCountry) {
            this.foot('g1', ['Évolution 2014 → 2024 : <b>' + signPts(first.values[10] - first.values[0]) + '</b>', 'Écart vs moyenne régionale : <b>' + signPts(V.country.stunting - V.avg.stunting) + '</b>', 'Seuil OMS : <b>' + (V.country.stunting > 20 ? 'dépassé' : 'respecté') + '</b>']);
          } else {
            const drops = V.g1.series.map((s) => ({ s, d: s.values[10] - s.values[0] })).sort((a, b) => a.d - b.d);
            this.foot('g1', ['Plus forte baisse : <b>' + esc(drops[0].s.label) + ' ' + signPts(drops[0].d) + '</b>', 'Pays sous le seuil OMS 20% : <b>' + V.countries.filter((c) => c.stunting < 20).length + ' / 16</b>', 'Moyenne régionale ' + V.year + ' : <b>' + NT.fmtPct(V.avg.stunting) + '</b>']);
          }
          break;
        }
        case 'g2': {
          const meta = V.g2.meta;
          this.setText('title', 'g2', V.isCountry ? 'Classement des Districts · ' + esc(nm) : 'Classement de la Prévalence par Pays');
          this.setText('sub', 'g2', esc(meta.label) + ' · ' + V.g2.items.length + ' ' + V.labels.zoneWord + ' · ' + esc(V.labels.period) + (V.isCountry ? '' : ' · cliquer un pays pour l’explorer'));
          ch.host.style.height = Math.max(300, V.g2.items.length * 26 + 60) + 'px';
          ch.setData(V.g2);
          const vals = V.g2.items.map((i) => i.value);
          const above = V.g2.items.filter((i) => (meta.higherIsWorse ? i.value > meta.threshold : i.value < meta.threshold)).length;
          this.foot('g2', ['Moyenne : <b>' + NT.fmtPct(avgOf(vals)) + '</b>', (meta.higherIsWorse ? 'Au-dessus du seuil : ' : 'Sous la cible : ') + '<b>' + above + ' / ' + vals.length + '</b>', 'Écart max – min : <b>' + (Math.max.apply(null, vals) - Math.min.apply(null, vals)).toFixed(1) + ' pts</b>']);
          break;
        }
        case 'g3': {
          this.chips('g3', this.state.g3Sel, ['#0066CC', '#FF6B35', '#00A86B'], 'Pays', '3 max.');
          this.legend('g3', V.g3.series.map((s) => ({ key: s.key, label: s.label, color: s.color, dashed: s.dashed })));
          ch.setData(V.g3);
          const idx = V.g3.series.map((s) => ({ s, v: avgOf(s.values) })).sort((a, b) => b.v - a.v);
          this.foot('g3', idx.map((x) => esc(x.s.label) + ' : <b>' + Math.round(x.v) + ' / 100</b>'));
          break;
        }
        case 'g4': {
          this.legend('g4', [{ key: 'cur', label: String(V.g4.yearCur), color: '#0066CC' }, { key: 'prev', label: String(V.g4.yearPrev), color: '#7C3AED', dashed: true }]);
          ch.setData(V.g4);
          const tot = sum(V.g4.current), totP = sum(V.g4.previous);
          let mi = 0; V.g4.current.forEach((v, i) => { if (v > V.g4.current[mi]) mi = i; });
          const lean = V.g4.current[5] + V.g4.current[6] + V.g4.current[7];
          this.foot('g4', ['Pic ' + V.g4.yearCur + ' : <b>' + NT.fmtInt(V.g4.current[mi]) + ' cas (' + M.MONTHS_LONG[mi] + ')</b>', 'Soudure : <b>' + NT.fmtPct((lean / tot) * 100, 0) + ' des cas annuels</b>', 'Total : <b>' + NT.fmtInt(tot) + '</b> (' + (tot >= totP ? '+' : '−') + Math.abs(((tot - totP) / totP) * 100).toFixed(1) + '% vs ' + V.g4.yearPrev + ')']);
          break;
        }
        case 'g5': {
          this.legend('g5', V.g5.slices.map((s) => ({ key: s.key, label: s.label, sub: s.sub, color: s.color, value: NT.fmtPct(s.value) })));
          ch.setData(V.g5);
          break;
        }
        case 'g6': {
          this.legend('g6', SEV_STUNTING.map((x, i) => ({ key: 's' + i, label: 'Stunting ' + x.label, color: x.color })), { static: true });
          ch.setData(V.g6);
          const reg = NT.regression(V.g6.points);
          this.foot('g6', reg ? ['Coefficient r² : <b>' + reg.r2.toFixed(2) + '</b>', '+10 pts de couverture App ≈ <b>' + signPts(reg.a * 10) + ' de guérison</b>', V.labels.zoneWordCap + ' : <b>' + V.g6.points.length + '</b>'] : []);
          break;
        }
        case 'g7': {
          ch.setData(V.g7);
          const best = V.g7.steps.slice().sort((a, b) => a.value - b.value)[0];
          this.foot('g7', ['Réduction totale : <b>' + signPts(V.g7.end - V.g7.start) + '</b>', 'Principal levier : <b>' + esc(best.label) + ' (' + signPts(best.value) + ')</b>']);
          break;
        }
        case 'g8': {
          this.setText('sub', 'g8', (V.isCountry ? V.g8.rows.length + ' districts de ' + esc(nm) : '16 pays') + ' × 8 indicateurs de suivi App · cliquer un en-tête pour trier');
          ch.host.style.height = (44 + V.g8.rows.length * 31) + 'px';
          ch.setData(V.g8);
          let crit = 0; V.g8.rows.forEach((r) => r.sev.forEach((s) => { if (s > 0.75) crit++; }));
          const worst = V.g8.rows.map((r) => ({ r, s: avgOf(r.sev) })).sort((a, b) => b.s - a.s)[0];
          this.foot('g8', ['Cellules critiques : <b>' + crit + ' / ' + V.g8.rows.length * 8 + '</b>', 'Zone la plus exposée : <b>' + esc(worst.r.label) + '</b>', 'Zone la plus favorable : <b>' + esc(V.g8.rows.map((r) => ({ r, s: avgOf(r.sev) })).sort((a, b) => a.s - b.s)[0].r.label) + '</b>']);
          break;
        }
        case 'g9': {
          this.setText('sub', 'g9', V.isCountry ? esc(nm) + ' vs moyenne régionale et 2 plus grands districts' : 'Comparaison multi-pays · questionnaires ménages App');
          this.chips('g9', this.state.g9Sel, ['#0066CC', '#FF6B35', '#7C3AED', '#00A86B'], 'Pays', '4 max.');
          this.legend('g9', V.g9.groups.map((g) => ({ key: g.key, label: g.label, color: g.color })));
          ch.setData(V.g9);
          const catAvg = V.g9.categories.map((c, i) => ({ c, v: avgOf(V.g9.groups.map((g) => g.values[i])) })).sort((a, b) => a.v - b.v);
          this.foot('g9', ['Indicateur le plus faible : <b>' + esc(catAvg[0].c) + ' (' + Math.round(catAvg[0].v) + '%)</b>', 'Le plus élevé : <b>' + esc(catAvg[3].c) + ' (' + Math.round(catAvg[3].v) + '%)</b>']);
          break;
        }
        case 'g10': {
          this.legend('g10', V.g10.series.map((s) => ({ key: s.key, label: s.label, color: s.color })));
          ch.setData(V.g10);
          const c = V.g10.series[0].values;
          this.foot('g10', ['Enfants < 5 ans 2024 : <b>' + NT.fmtPct(c[c.length - 1]) + '</b>', 'Évolution 2017 → 2024 : <b>' + signPts(c[c.length - 1] - c[0]) + '</b>']);
          break;
        }
        case 'g11': {
          ch.setData(V.g11);
          const v = V.g11.values; let mi = 0; v.forEach((x, i) => { if (x > v[mi]) mi = i; });
          this.foot('g11', ['Mois le plus actif : <b>' + M.MONTHS_LONG[mi] + ' (' + NT.fmtInt(v[mi]) + ')</b>', 'Soudure : <b>' + NT.fmtPct(((v[5] + v[6] + v[7]) / sum(v)) * 100, 0) + ' des signalements</b>']);
          break;
        }
        case 'g12': {
          ch.setData(V.g12);
          const counts = [0, 0, 0, 0];
          V.g12.points.forEach((q) => counts[q.y >= V.g12.yMid ? (q.x < V.g12.xMid ? 0 : 1) : q.x < V.g12.xMid ? 2 : 3]++);
          this.setText('tools', 'g12', '<div class="nt-legend static">' + NT.QUADS.map((q, i) => '<button><i style="background:' + q.color + '"></i><span>' + q.label.charAt(0) + q.label.slice(1).toLowerCase() + '</span><b>' + counts[i] + '</b></button>').join('') + '</div>');
          this.foot('g12', ['Seuils : <b>WASH 50/100</b> · <b>Stunting 20% (OMS)</b>', 'Priorité critique : <b>' + counts[0] + ' ' + V.labels.zoneWord + '</b>']);
          break;
        }
        case 'g13': {
          ch.setData(V.g13);
          this.renderMilestone(ch.selected);
          const gain = avgOf(V.g13.milestones.map((m) => m.with - m.without));
          this.foot('g13', ['Gain moyen des rappels automatiques : <b>+' + gain.toFixed(1) + ' pts</b>', 'Population suivie : <b>' + esc(nm) + '</b>']);
          break;
        }
        case 'g14': {
          this.legend('g14', [{ key: 'a', label: '≥ 80% objectif', color: '#10B981' }, { key: 'b', label: '60–79%', color: '#F59E0B' }, { key: 'c', label: '< 60%', color: '#EF4444' }], { static: true });
          ch.setData(V.g14);
          const ok = V.g14.gauges.filter((g) => g.value >= V.g14.target).length;
          this.foot('g14', ['Objectifs atteints : <b>' + ok + ' / 6</b>', 'Écart moyen à la cible : <b>' + signPts(avgOf(V.g14.gauges.map((g) => g.value - V.g14.target))) + '</b>']);
          break;
        }
        default: break;
      }
    }

    /* Détail du jalon sélectionné (timeline 1000 jours) */
    renderMilestone(i) {
      const m = this.view.g13.milestones[i];
      if (!m) return;
      this.$('[data-g13-detail]').innerHTML = '<span class="n">' + (i + 1) + '</span><div><h4>' + esc(m.label) + ' · J' + m.day + '</h4><p>' + esc(m.desc) + '</p></div>' +
        '<div class="vals"><div><b>' + m.without + '%</b>Sans rappels</div><div class="g"><b>' + m.with + '%</b>Avec rappels App</div><div class="g"><b>+' + (m.with - m.without) + '</b>pts gagnés</div></div>';
    }

    /* ------------------------------------------------------------------ */
    /* G15 — Tableau scorecard (recherche temps réel + tri + sparklines)   */
    /* ------------------------------------------------------------------ */
    renderTable(V) {
      const COLS = [
        { key: 'name', label: V.isCountry ? 'Zone / District' : 'Pays' }, { key: 'stunting', label: 'Stunting' }, { key: 'wasting', label: 'Émaciation (PB)' },
        { key: 'anemia', label: 'Anémie' }, { key: 'vitA', label: 'Vit.A' }, { key: 'diversity', label: 'Diversité ANJE' }, { key: 'score', label: 'Score Global' },
        { key: 'status', label: 'Statut' }, { key: 'trend', label: 'Tendance 5 ans' }, { key: null, label: 'Fiche Détaillée' }
      ];
      const sort = this.state.sort;
      this.setText('sub', 'g15', (V.isCountry ? 'Régions / districts de ' + esc(V.country.name) : '16 pays d’Afrique de l’Ouest') + ' · recherche temps réel · tri par colonne');
      const thead = this.$('[data-table] thead');
      thead.innerHTML = '<tr>' + COLS.map((c) => '<th' + (c.key && c.key !== 'trend' ? ' data-sort="' + c.key + '"' : '') + ' class="' + (sort.key === c.key ? 'sorted' : '') + '">' + c.label +
        (sort.key === c.key ? '<span class="arr">' + (sort.dir > 0 ? '▲' : '▼') + '</span>' : '') + '</th>').join('') + '</tr>';
      const q = (this.state.search || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const ranked = V.g15.rows.slice().sort((a, b) => b.score - a.score);
      const rankOf = new Map(ranked.map((r, i) => [r.name, i + 1]));
      let rows = V.g15.rows.filter((r) => !q || r.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) || (r.code && r.code.toLowerCase().includes(q)));
      const k = sort.key === 'status' ? 'score' : sort.key;
      rows.sort((a, b) => (k === 'name' ? a.name.localeCompare(b.name, 'fr') : (a[k] - b[k])) * sort.dir * (k === 'name' ? 1 : -1));
      /* Libère les anciennes sparklines */
      this.sparks.forEach((s) => s.destroy());
      this.sparks = [];
      const cell = (ind, v) => '<div class="nt-cell"><span class="dot" style="background:' + M.severityColor(ind, v) + '"></span>' + NT.fmtPct(v) + '</div>';
      const tbody = this.$('[data-table] tbody');
      tbody.innerHTML = rows.length ? rows.map((r) => {
        const sc = r.score >= 70 ? '#10B981' : r.score >= 55 ? '#0EA5E9' : r.score >= 40 ? '#F59E0B' : '#EF4444';
        return '<tr><td><div class="zone"><span class="rank">' + rankOf.get(r.name) + '</span>' + (r.code ? '<span class="code">' + r.code + '</span>' : '') + esc(r.name) + '</div></td>' +
          '<td>' + cell('stunting', r.stunting) + '</td><td>' + cell('wasting', r.wasting) + '</td><td>' + cell('anemia', r.anemia) + '</td><td>' + cell('vitA', r.vitA) + '</td>' +
          '<td>' + NT.fmtPct(r.diversity, 0) + '</td>' +
          '<td><div class="nt-score"><b>' + r.score + '</b><span class="track"><i style="width:' + r.score + '%;background:' + sc + '"></i></span></div></td>' +
          '<td><span class="nt-status ' + r.status.tone + '">' + r.status.label + '</span></td>' +
          '<td><div class="nt-spark" data-spark="' + esc(r.name) + '"></div></td>' +
          '<td><button class="nt-link" data-detail="' + esc(r.code || r.name) + '">' + (V.isCountry ? 'Fiche →' : 'Vue pays →') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="10" class="nt-empty">Aucune zone ne correspond à « ' + esc(this.state.search) + ' »</td></tr>';
      /* Mini-sparklines Canvas (5 ans) */
      tbody.querySelectorAll('[data-spark]').forEach((host) => {
        const r = rows.find((x) => x.name === host.dataset.spark);
        const ch = new NT.Chart(host, Object.assign({}, NT.charts.tableSpark));
        ch.setData({ values: r.trend });
        this.sparks.push(ch);
      });
      const sts = { danger: 0, warning: 0, info: 0, success: 0 };
      V.g15.rows.forEach((r) => sts[r.status.tone]++);
      this.$('[data-table-foot]').innerHTML = '<span>' + rows.length + ' / ' + V.g15.rows.length + ' ' + V.labels.zoneWord + ' affichés</span><span>Critique : <b>' + sts.danger + '</b> · Alerte : <b>' + sts.warning + '</b> · Vigilance : <b>' + sts.info + '</b> · Satisfaisant : <b>' + sts.success + '</b></span>';
    }
    sortTable(key) {
      const s = this.state.sort;
      if (s.key === key) s.dir = -s.dir; else { s.key = key; s.dir = 1; }
      this.renderTable(this.view);
    }

    /* Fiche détaillée : en vue régionale → bascule sur le pays ; en vue pays → modal district */
    openDetail(id) {
      const V = this.view;
      if (!V.isCountry) return this.selectCountry(id, true);
      const d = V.districts.find((x) => x.name === id);
      if (!d) return;
      const c = V.country;
      const rows = [
        ['stunting', 'Retard de croissance', true], ['wasting', 'Émaciation (PB < 125 mm)', true], ['anemia', 'Anémie', true], ['vitA', 'Couverture Vitamine A', false],
        ['diversity', 'Diversité alimentaire min.', false], ['ebf', 'Allaitement exclusif', false], ['wash', 'Score WASH', false], ['agentCov', 'Couverture agents App', false], ['recovery', 'Taux de guérison', false]
      ];
      this.$('[data-modal-title]').textContent = d.name + ' · ' + c.name;
      this.$('[data-modal-sub]').textContent = 'Fiche détaillée district · ' + V.labels.period + ' · ' + NT.fmtInt(d.registered) + ' enfants enregistrés · score ' + d.score + '/100 (' + M.statusOf(d.score).label + ')';
      this.$('[data-modal-body]').innerHTML = '<div>' + rows.map(([k, label, worse]) => {
        const diff = d[k] - c[k]; const good = worse ? diff <= 0 : diff >= 0;
        return '<div class="nt-mrow"><span>' + label + '</span><b>' + (k === 'wash' ? d[k] + ' / 100' : NT.fmtPct(d[k])) + '</b><em style="color:' + (good ? '#047857' : '#B91C1C') + '">' + signPts(diff) + ' vs moyenne nationale (' + (k === 'wash' ? c[k] : NT.fmtPct(c[k])) + ')</em></div>';
      }).join('') + '</div><div><div class="nt-chart" data-modal-chart style="height:320px"></div><div class="nt-legend static" style="justify-content:center;margin-top:6px"><button><i style="background:#7C3AED"></i><span>' + esc(d.name) + '</span></button><button><i style="background:#0066CC"></i><span>' + esc(c.name) + '</span></button><button><i class="dash" style="border-color:#00A86B"></i><span>Cible OMS</span></button></div></div>';
      this.$('[data-modal]').classList.add('open');
      /* Radar comparatif district vs pays vs cible OMS (réutilise le moteur Canvas) */
      if (this.modalChart) this.modalChart.destroy();
      const A = M.RADAR_AXES, T = M.WHO_TARGET;
      const ser = (key, label, color, e, dashed) => ({ key, label, color, dashed, values: A.map((a) => a.norm(e[a.key])), raw: A.map((a) => e[a.key]) });
      this.modalChart = new NT.Chart(this.$('[data-modal-chart]'), Object.assign({}, NT.charts.radar));
      this.modalChart.setData({ axes: A.map((a) => a.label), series: [ser('d', d.name, '#7C3AED', d), ser('c', c.name, '#0066CC', c), ser('t', 'Cible OMS', '#00A86B', T, true)] });
    }
    closeModal() { this.$('[data-modal]').classList.remove('open'); if (this.modalChart) { this.modalChart.destroy(); this.modalChart = null; } }

    /* ------------------------------------------------------------------ */
    /* Journal de synchronisation (flux simulé, déterministe)              */
    /* ------------------------------------------------------------------ */
    renderSyncPanel(V) {
      const K = V.kpi.children;
      const agents = Math.round(K.value / 96);
      const today = Math.round(V.sync.screened / 26);
      this.$('[data-sync-stats]').innerHTML =
        '<div class="nt-sync-stat"><span>Taux de synchro</span><b>' + K.sync.toFixed(1) + '%</b></div>' +
        '<div class="nt-sync-stat"><span>Fiches reçues (24h)</span><b>' + NT.fmtInt(today * 3.4) + '</b></div>' +
        '<div class="nt-sync-stat"><span>Agents actifs</span><b>' + NT.fmtInt(agents) + '</b></div>' +
        '<div class="nt-sync-stat"><span>Appareils hors-ligne</span><b>' + NT.fmtInt(agents * (1 - K.sync / 100)) + '</b></div>';
      this._syncFeed = [];
      for (let i = 0; i < 9; i++) this._syncFeed.push(this.makeSyncRow(i, 2 + i * 3 + (i % 2)));
      this.drawSyncList();
    }
    makeSyncRow(seed, minutes) {
      const V = this.view;
      const zones = V.zones;
      const h = (n) => { const x = Math.sin((seed + 1) * 99.13 + n * 7.7 + V.year) * 10000; return x - Math.floor(x); };
      const z = zones[Math.floor(h(1) * zones.length)];
      const types = [['MUAC', 'dépistages PB', '#FF6B35'], ['ANJE', 'questionnaires ménages', '#7C3AED'], ['PESÉE', 'mesures taille/âge', '#0066CC'], ['VIT.A', 'administrations Vit. A', '#00A86B'], ['ALERTE', 'signalements urgents', '#EF4444']];
      const t = types[Math.floor(h(2) * types.length)];
      return { agent: (V.isCountry ? V.country.code : (z.code || 'AO')) + '-' + (1000 + Math.floor(h(3) * 8999)), zone: z.name, type: t, count: 6 + Math.floor(h(4) * 52), minutes };
    }
    drawSyncList() {
      this.$('[data-sync-list]').innerHTML = this._syncFeed.map((r) =>
        '<div class="nt-sync-row"><span class="av" style="background:' + r.type[2] + '">' + r.type[0].slice(0, 4) + '</span>' +
        '<div><b>Agent ' + esc(r.agent) + ' · ' + esc(r.zone) + '</b><small>' + r.count + ' ' + r.type[1] + ' synchronisés</small></div>' +
        '<span class="nt-status success">Reçu</span><time>' + (r.minutes === 0 ? 'à l’instant' : 'il y a ' + r.minutes + ' min') + '</time></div>').join('');
    }
    startClock() {
      this._clock = setInterval(() => {
        this.syncMinutes++;
        if (this._syncFeed) { this._syncFeed.forEach((r) => r.minutes++); this.drawSyncList(); }
        this.renderSyncText();
      }, 60000);
    }
    forceSync() {
      const live = this.$('.nt-live');
      live.classList.add('syncing');
      this.$('[data-sync-text]').textContent = 'Synchronisation des appareils terrain…';
      setTimeout(() => {
        live.classList.remove('syncing');
        this.syncMinutes = 0;
        const added = 20 + Math.floor(Math.random() * 60);
        this.syncExtra += added;
        this._syncFeed.unshift(this.makeSyncRow(Date.now() % 997, 0));
        this._syncFeed = this._syncFeed.slice(0, 12);
        this.drawSyncList();
        this.renderSyncText();
        this.toast('Synchronisation terminée · ' + added + ' nouvelles fiches reçues');
      }, 1400);
    }

    /* ------------------------------------------------------------------ */
    /* Navigation : scroll animé (rAF) + scrollspy (IntersectionObserver)  */
    /* ------------------------------------------------------------------ */
    navigate(id) {
      const item = NT.NAV.find((n) => n.id === id);
      if (id === 'overview' && this.state.mode !== 'region') this.setMode('region');
      if (id === 'country') { if (this.state.mode !== 'country') this.setMode('country'); else this.togglePop('picker', true); }
      this.scrollToEl(this.$('#' + item.target));
    }
    scroller() { return this.hasAttribute('fullscreen') ? this : document.scrollingElement || document.documentElement; }
    scrollToEl(el) {
      if (!el) return;
      const sc = this.scroller();
      const fs = this.hasAttribute('fullscreen');
      const header = this.$('.nt-header').offsetHeight;
      const start = sc.scrollTop;
      const baseTop = fs ? this.getBoundingClientRect().top : 0;
      const target = Math.max(0, start + el.getBoundingClientRect().top - baseTop - header - 16);
      const t0 = performance.now(), dur = 650;
      cancelAnimationFrame(this._scrollRaf);
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        sc.scrollTop = start + (target - start) * NT.ease(t);
        if (t < 1) this._scrollRaf = requestAnimationFrame(step);
      };
      this._scrollRaf = requestAnimationFrame(step);
    }
    scrollSpy() {
      if (!('IntersectionObserver' in global)) return;
      const ids = ['sec-overview', 'sec-anthro', 'sec-micro', 'sec-anje', 'sec-map', 'sec-sync'];
      const vis = new Map();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => vis.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
        const visible = ids.filter((id) => vis.get(id) != null);
        if (visible.length) { this._spySection = visible[0]; this.setNavActive(visible[0]); }
      }, { rootMargin: '-180px 0px -45% 0px' });
      ids.forEach((id) => io.observe(this.$('#' + id)));
    }
    setNavActive(secId) {
      const map = { 'sec-overview': this.state.mode === 'country' ? 'country' : 'overview', 'sec-anthro': 'anthro', 'sec-micro': 'micro', 'sec-anje': 'anje', 'sec-map': 'map', 'sec-sync': 'sync' };
      const id = map[secId] || 'overview';
      this.$$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === id));
    }
    /* Apparition progressive des cards au scroll */
    observeCards() {
      const cards = this.$$('.nt-card');
      if (!('IntersectionObserver' in global)) { cards.forEach((c) => c.classList.add('in')); return; }
      const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
      cards.forEach((c) => io.observe(c));
    }

    /* ------------------------------------------------------------------ */
    /* Plein écran, modules historiques, toast                             */
    /* ------------------------------------------------------------------ */
    toggleFullscreen() {
      const on = !this.hasAttribute('fullscreen');
      this.toggleAttribute('fullscreen', on);
      document.documentElement.style.overflow = on ? 'hidden' : '';
      this.toast(on ? 'Mode plein écran · Échap pour quitter' : 'Mode intégré');
    }
    toggleLegacy() {
      if (!this.section) return;
      const on = this.section.classList.toggle('nt-show-legacy');
      this.$('[data-action="legacy"]').textContent = on ? 'Masquer les modules WHO NCD' : 'Afficher les modules WHO NCD';
      if (on) {
        if (this.hasAttribute('fullscreen')) this.toggleFullscreen();
        const next = this.nextElementSibling;
        if (next) setTimeout(() => next.scrollIntoView({ block: 'start' }), 50);
      }
    }
    toast(msg) {
      const t = this.$('[data-toast]');
      t.textContent = msg;
      t.classList.add('on');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove('on'), 2600);
    }

    /* ------------------------------------------------------------------ */
    /* Exports                                                             */
    /* ------------------------------------------------------------------ */
    fileBase() {
      const V = this.view;
      const scope = (V.isCountry ? V.country.name : 'Afrique-Ouest').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-');
      return 'NutriTracker_' + scope + '_' + V.labels.period.replace(/\s+/g, '-');
    }
    download(name, content, type) {
      const blob = new Blob([content], { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    exportCSV() {
      const V = this.view;
      const head = ['Zone', 'Code', 'Stunting (%)', 'Emaciation PB (%)', 'Anemie (%)', 'Vitamine A (%)', 'Diversite ANJE (%)', 'Score global', 'Statut', 'Score 2020', 'Score 2021', 'Score 2022', 'Score 2023', 'Score 2024'];
      const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const lines = [head.map(q).join(';')].concat(V.g15.rows.map((r) => [r.name, r.code || '', r.stunting, r.wasting, r.anemia, r.vitA, r.diversity, r.score, r.status.label].concat(r.trend).map((v) => q(typeof v === 'number' ? String(v).replace('.', ',') : v)).join(';')));
      this.download(this.fileBase() + '.csv', '\uFEFF' + lines.join('\r\n'), 'text/csv;charset=utf-8');
      this.toast('Export CSV généré · ' + V.g15.rows.length + ' lignes');
    }
    exportPDF() {
      const V = this.view, K = V.kpi;
      /* Capture des graphiques (rendu final, sans animation) */
      const shots = ['g1', 'g2', 'g3', 'g4', 'g5', 'g7', 'g14', 'g8'].map((id) => {
        const ch = this.charts[id];
        if (!ch.W) return '';
        const prev = ch.p; ch.p = 1; ch.render();
        const url = ch.canvas.toDataURL('image/png');
        if (ch.pending) { ch.p = prev; ch.render(); }
        const title = this.$('[data-title="' + id + '"]').textContent;
        return '<figure class="' + (id === 'g8' || id === 'g1' ? 'wide' : '') + '"><figcaption>' + esc(title) + '</figcaption><img src="' + url + '"></figure>';
      }).join('');
      const kpis = [['Retard de croissance', NT.fmtPct(K.stunting.value), K.stunting.badge.text], ['Malnutrition aigüe (MAG)', NT.fmtPct(K.wasting.value), K.wasting.badge.text],
        ['Enfants enregistrés', NT.fmtInt(K.children.value), K.children.badge.text], ['Vitamine A & déparasitage', NT.fmtPct(K.vitA.value), K.vitA.badge.text], ['Foyers d’alerte', K.alerts.value + ' ' + K.alerts.unit, K.alerts.badge.text]];
      const table = '<table><thead><tr><th>Zone</th><th>Stunting</th><th>Émaciation</th><th>Anémie</th><th>Vit. A</th><th>Diversité</th><th>Score</th><th>Statut</th></tr></thead><tbody>' +
        V.g15.rows.slice().sort((a, b) => a.score - b.score).map((r) => '<tr><td>' + esc(r.name) + '</td><td>' + r.stunting + '%</td><td>' + r.wasting + '%</td><td>' + r.anemia + '%</td><td>' + r.vitA + '%</td><td>' + r.diversity + '%</td><td><b>' + r.score + '</b></td><td>' + r.status.label + '</td></tr>').join('') + '</tbody></table>';
      const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(this.fileBase()) + '</title><style>' +
        '@page{size:A4;margin:14mm}body{font-family:Inter,system-ui,Arial,sans-serif;color:#1E293B;margin:0;padding:24px}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0066CC;padding-bottom:12px;margin-bottom:18px}' +
        'h1{margin:0;font-size:22px}h1 small{display:block;font-size:12px;color:#64748B;font-weight:500;margin-top:4px}.org{font-size:11px;color:#64748B;text-align:right}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px}' +
        '.kpi{border:1px solid #E0EEFF;border-radius:10px;padding:10px}.kpi span{font-size:10px;color:#64748B}.kpi b{display:block;font-size:20px;margin:2px 0}.kpi small{font-size:10px;color:#0066CC}' +
        '.charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0;border:1px solid #E0EEFF;border-radius:10px;padding:10px;break-inside:avoid}figure.wide{grid-column:span 2}figcaption{font-size:12px;font-weight:700;margin-bottom:6px}img{width:100%}' +
        'h2{font-size:15px;margin:20px 0 8px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#F0F6FF;text-align:left;padding:6px}td{padding:5px 6px;border-bottom:1px solid #F1F5F9}footer{margin-top:18px;font-size:10px;color:#94A3B8}' +
        '</style></head><body><header><h1>NutriTracker West Africa · Rapport ' + (V.isCountry ? 'Pays : ' + esc(V.country.name) : 'Régional') + '<small>Surveillance Nutritionnelle Terrain · ' + esc(V.labels.period) + ' · généré le ' + new Date().toLocaleString('fr-FR') + '</small></h1>' +
        '<div class="org">Surveillance Nutritionnelle Indépendante / OMS<br>Source : App Mobile de Suivi Nutritionnel Terrain</div></header>' +
        '<div class="kpis">' + kpis.map((k) => '<div class="kpi"><span>' + esc(k[0]) + '</span><b>' + esc(k[1]) + '</b><small>' + esc(k[2]) + '</small></div>').join('') + '</div>' +
        '<div class="charts">' + shots + '</div><h2>Scorecard · ' + (V.isCountry ? 'districts' : 'pays') + ' (du plus critique au plus favorable)</h2>' + table +
        '<footer>Données de démonstration issues de l’application de suivi communautaire (agents communautaires & ONG).</footer>' +
        '<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>';
      const w = global.open('', '_blank');
      if (w && w.document) {
        w.document.open(); w.document.write(html); w.document.close();
        this.toast('Rapport ouvert · choisissez « Enregistrer en PDF » dans la boîte d’impression');
      } else {
        this.download(this.fileBase() + '.html', html, 'text/html;charset=utf-8');
        this.toast('Pop-up bloquée · rapport téléchargé (ouvrir puis imprimer en PDF)');
      }
    }
  }

  if (!customElements.get('nutritracker-dashboard')) customElements.define('nutritracker-dashboard', NutriTrackerDashboard);
})(window);
