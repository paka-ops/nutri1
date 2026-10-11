/* ============================================================================
 * UNICEF NutriChild · Surveillance Nutritionnelle Infantile
 * Fichier : unicef-nutrichild-dashboard.js
 * Rôle    : Web Component <unicef-nutrichild-dashboard> (Custom Element + Shadow DOM)
 *
 *  - Encapsulation totale : le Shadow DOM isole les styles et le DOM du
 *    tableau de bord du reste de index.html (scripts globaux, styles sur
 *    button/table/canvas, MutationObserver, etc.).
 *  - Gère l'état des filtres (mode Régional / Pays, pays, période, sexe,
 *    mesure de croissance, métrique des bullet charts, séries de tendance),
 *    reconstruit la « vue » via NutriChild.model.build() et réanime les
 *    5 KPI + les 15 graphiques à chaque changement de périmètre.
 *  - Navigation latérale (scroll animé en requestAnimationFrame + scrollspy),
 *    génération de rapport PDF (impression d'un document autonome contenant
 *    les graphiques exportés en PNG) et export CSV de la scorecard.
 *
 *  Dépendances (chargées avant ce fichier, voir index.html) :
 *    unicef-nutrichild-data.js · unicef-nutrichild-model.js ·
 *    unicef-nutrichild-chart-core.js · charts/*.js ·
 *    unicef-nutrichild-kpi-charts.js · unicef-nutrichild-template.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  if (!NC || !NC.DATA || !NC.model || !NC.Chart || !NC.template) {
    console.error('[NutriChild] dépendances manquantes : vérifier l’ordre des <script> dans index.html');
    return;
  }
  const esc = NC.escape;
  const M = NC.model;
  /* Retire les drapeaux (indicateurs régionaux) des libellés destinés
   * aux fichiers CSV / rapports imprimés, où ils s'affichent mal. */
  const strip = (str) => String(str).replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim();

  /* Dossier du composant (chargement de la feuille de style dans le Shadow DOM) */
  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, '') : 'components/unicef-nutrichild/';

  /* Association card → définition Canvas */
  const CHART_MAP = {
    g1: 'croissance', g2: 'tunnelMAS', g3: 'radarANJE', g4: 'bulletsCRENAS', g5: 'campagnesStack',
    g6: 'heatmapANJE', g7: 'scatterWASH', g8: 'timeline1000', g9: 'bullesMAS', g10: 'historiqueMAS',
    g11: 'donutCauses', g12: 'barresANJE', g13: 'polaireSaison', g14: 'lollipopCouv'
  };
  const KPI_CHARTS = { kpiBars: 1, kpiGauge: 1, kpiSpark: 1, kpiProgress: 1, kpiMonthly: 1 };
  const CLASSES_MAS = ['< 5% — acceptable', '5–10% — alerte', '10–15% — urgence', '> 15% — urgence critique'];

  class NutriChildDashboard extends HTMLElement {
    /* =====================================================================
     * Initialisation
     * =================================================================== */
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;

      /* État des filtres */
      this.state = {
        mode: 'region', code: 'NE', period: 'M', year: 2024,
        sex: 'garcon', measure: 'taille', bulletMetric: 'recovery',
        trendPays: ['NE', 'NG', 'ML', 'SN']
      };
      this.charts = {};
      this.kpiCharts = {};
      this.sort = { key: 'admissions', dir: -1 };

      const root = this.attachShadow({ mode: 'open' });
      this.root = root;

      /* Feuille de style encapsulée dans le Shadow DOM */
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = BASE + 'unicef-nutrichild.css';
      link.onload = link.onerror = () => { this.classList.add('nc-ready'); this.refreshAll(); };
      root.appendChild(link);

      const tpl = document.createElement('template');
      tpl.innerHTML = NC.template();
      root.appendChild(tpl.content);

      /* Prise de contrôle de la section #unicef : les modules historiques de
       * index.html restent dans le DOM (d’autres scripts globaux en dépendent)
       * mais sont masqués — même mécanisme que le composant WHO. */
      const section = this.closest('section');
      if (section) section.classList.add('nc-takeover');

      this.host = root.querySelector('.nc-app');
      this.content = root.querySelector('.nc-content');
      this._buildCharts();
      this._wire();
      this._scrollspy();
      requestAnimationFrame(() => this.refreshAll());
    }

    /* =====================================================================
     * Création des instances de graphiques
     * =================================================================== */
    _buildCharts() {
      const self = this;
      Object.keys(CHART_MAP).forEach((id) => {
        const host = this.root.querySelector('[data-chart="' + id + '"]');
        if (!host) return;
        this.charts[id] = new NC.Chart(host, {
          label: id,
          /* Marge de la card (28 px de chaque côté) : le tooltip peut y déborder */
          padX: 52,
          draw: function (ch, ctx, W, H, p) { NC.charts[CHART_MAP[id]].draw(ch, ctx, W, H, p); },
          onClick: function (hit) {
            if (hit && hit.type === 'rect' && hit.col != null) self._onHeatCell(hit);
          }
        });
      });
      Object.keys(KPI_CHARTS).forEach((name) => {
        const host = this.root.querySelector('[data-kpi-chart="' + name + '"]');
        if (!host) return;
        this.kpiCharts[name] = new NC.Chart(host, {
          label: name,
          draw: function (ch, ctx, W, H, p) { NC.charts[name].draw(ch, ctx, W, H, p); }
        });
      });
    }

    /* =====================================================================
     * Câblage des interactions
     * =================================================================== */
    _wire() {
      const self = this;
      const q = (sel) => self.root.querySelector(sel);
      const qa = (sel) => Array.prototype.slice.call(self.root.querySelectorAll(sel));

      /* --- Navigation latérale (scroll animé + scrollspy) --- */
      qa('[data-nav]').forEach((btn) => {
        btn.addEventListener('click', () => self._goto(btn.getAttribute('data-nav')));
      });

      /* --- Mode : Vue Globale / Vue Pays --- */
      qa('[data-mode]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode');
          if (self.state.mode === mode) return;
          self.state.mode = mode;
          qa('[data-mode]').forEach((b) => b.classList.toggle('on', b === btn));
          q('[data-country-wrap]').classList.toggle('disabled', mode !== 'country');
          self.refreshAll();
          self._toast(mode === 'country' ? 'Vue détaillée : ' + M.byCode(self.state.code).name : 'Vue globale Afrique de l’Ouest');
        });
      });

      /* --- Sélecteur de pays --- */
      const countrySel = q('[data-country]');
      countrySel.value = this.state.code;
      countrySel.addEventListener('change', () => {
        self.state.code = countrySel.value;
        if (self.state.mode !== 'country') {
          self.state.mode = 'country';
          qa('[data-mode]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-mode') === 'country'));
          q('[data-country-wrap]').classList.remove('disabled');
        }
        self.refreshAll();
      });

      /* --- Période Mensuel / Trimestriel --- */
      qa('[data-period-btn]').forEach((btn) => {
        btn.addEventListener('click', () => {
          self.state.period = btn.getAttribute('data-period-btn');
          qa('[data-period-btn]').forEach((b) => b.classList.toggle('on', b === btn));
          self.refreshAll();
        });
      });

      /* --- Boutons d'action --- */
      q('[data-action="fullscreen"]').addEventListener('click', () => {
        if (self.hasAttribute('fullscreen')) self.removeAttribute('fullscreen');
        else self.setAttribute('fullscreen', '');
        setTimeout(() => Object.keys(self.charts).forEach((k) => self.charts[k].resize()), 60);
      });
      q('[data-action="sync"]').addEventListener('click', () => self._simulateSync());
      q('[data-action="legacy"]').addEventListener('click', () => {
        const section = self.closest('section');
        if (!section) return;
        section.classList.toggle('nc-show-legacy');
        self._toast(section.classList.contains('nc-show-legacy')
          ? 'Modules UNICEF historiques affichés' : 'Modules UNICEF historiques masqués');
      });
      const reportBtn = q('[data-action="report"]');
      reportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        q('[data-pop="report"]').classList.toggle('open');
      });
      q('[data-action="export-pdf"]').addEventListener('click', () => { q('[data-pop="report"]').classList.remove('open'); self.exportPDF(); });
      q('[data-action="export-csv"]').addEventListener('click', () => { q('[data-pop="report"]').classList.remove('open'); self.exportCSV(); });
      q('[data-action="close-modal"]').addEventListener('click', () => self._closeModal());
      self.root.addEventListener('click', (e) => {
        if (!e.target.closest || !e.target.closest('.nc-menu')) {
          const pop = q('[data-pop="report"]');
          if (pop) pop.classList.remove('open');
        }
      });
      /* Fermeture de la modal par Échap / clic sur le fond */
      self.root.querySelector('[data-modal]').addEventListener('click', (e) => {
        if (e.target.hasAttribute('data-modal')) self._closeModal();
      });

      /* --- Recherche dans la scorecard --- */
      q('[data-search]').addEventListener('input', () => self._renderScorecard());

      /* --- Tri de la scorecard --- */
      self.root.querySelector('[data-table]').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;
        const key = th.getAttribute('data-sort');
        if (self.sort.key === key) self.sort.dir *= -1;
        else self.sort = { key: key, dir: key === 'label' || key === 'atpe' ? 1 : -1 };
        self._renderScorecard();
      });

      /* --- Recalcul au redimensionnement de la fenêtre --- */
      this._onResize = () => Object.keys(this.charts).forEach((k) => this.charts[k].resize());
      global.addEventListener('resize', this._onResize);
    }

    disconnectedCallback() {
      global.removeEventListener('resize', this._onResize);
      Object.keys(this.charts).forEach((k) => this.charts[k].destroy());
      Object.keys(this.kpiCharts).forEach((k) => this.kpiCharts[k].destroy());
    }

    /* =====================================================================
     * Navigation : défilement animé vers une section (rAF, pas de smooth CSS)
     * =================================================================== */
    _goto(navId) {
      const nav = NC.NAV.filter((n) => n.id === navId)[0];
      if (!nav) return;
      const target = this.root.querySelector('#' + nav.target);
      if (!target) return;
      /* En plein écran le composant défile lui-même, sinon c'est la page hôte */
      const container = this.hasAttribute('fullscreen') ? this : (document.scrollingElement || document.documentElement);
      const from = container.scrollTop;
      const to = from + target.getBoundingClientRect().top - 92;
      const t0 = performance.now();
      const dur = 620;
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        container.scrollTop = from + (to - from) * NC.easeInOut(t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      this.root.querySelectorAll('[data-nav]').forEach((b) =>
        b.classList.toggle('active', b.getAttribute('data-nav') === navId));
    }

    _pageScroller() {
      /* En mode plein écran, c'est le composant qui défile ; sinon la page hôte. */
      return this.hasAttribute('fullscreen')
        ? this.root.querySelector('.nc-app')
        : (document.scrollingElement || document.documentElement);
    }

    /* Observation du défilement pour surligner l'entrée de menu active */
    _scrollspy() {
      const self = this;
      if (!('IntersectionObserver' in global)) return;
      const map = {};
      NC.NAV.forEach((n) => { map[n.target] = n.id; });
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          const id = map[en.target.id];
          if (!id) return;
          self.root.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.getAttribute('data-nav') === id));
        });
      }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
      NC.NAV.forEach((n) => {
        const el = self.root.querySelector('#' + n.target);
        if (el) io.observe(el);
      });
      this._spy = io;
    }

    /* =====================================================================
     * Rafraîchissement global : modèle → KPI → graphiques → panneaux
     * =================================================================== */
    refreshAll() {
      const st = this.state;
      const view = M.build({
        mode: st.mode, code: st.code, period: st.period, year: st.year,
        sex: st.sex, measure: st.measure, trendPays: st.trendPays
      });
      this.view = view;

      /* En-tête / fil d'Ariane */
      const q = (sel) => this.root.querySelector(sel);
      q('[data-crumb]').textContent = 'Mode : ' + (view.isRegion ? 'Régional' : view.country.name);
      q('[data-subtitle]').textContent = view.subtitle;
      this._renderSectionCounts();
      this._renderBanner(view);
      this._renderKPIs(view);
      this._renderCharts(view);
      this._renderSync(view);
      this._renderAlerts(view);
      this._renderScorecard();
      this._updateFooters(view);
      /* Les graphiques KPI n'existent qu'après le premier rendu */
      Object.keys(this.kpiCharts).forEach((k) => this.kpiCharts[k].resize());
      Object.keys(this.charts).forEach((k) => this.charts[k].resize());
    }

    /* Compteur de graphiques affiché dans l'en-tête de chaque section */
    _renderSectionCounts() {
      const counts = {
        'sec-malnutrition': [1, 2, 9],
        'sec-anje': [3, 6, 12],
        'sec-crenas': [4, 13],
        'sec-campagnes': [5, 14],
        'sec-wash': [7],
        'sec-tendances': [10, 11, 8]
      };
      Object.keys(counts).forEach((id) => {
        const sec = this.root.querySelector('#' + id);
        if (!sec) return;
        const badge = sec.querySelector('[data-count]');
        if (badge) badge.textContent = counts[id].length + (counts[id].length > 1 ? ' graphiques' : ' graphique');
      });
    }

    /* ---------------- Bandeau de périmètre ---------------- */
    _renderBanner(v) {
      const el = this.root.querySelector('[data-banner]');
      if (v.isRegion) {
        el.innerHTML =
          '<div class="nc-banner-main"><span class="nc-banner-icon">🌍</span><div>' +
          '<b>Vue Globale Afrique de l’Ouest</b>' +
          '<small>' + v.codes.length + ' pays · ' + NC.fmtInt(v.local.u5) + ' k enfants < 5 ans · ' +
          NC.fmtInt(v.local.screened) + ' k enfants dépistés via l’App · ' + NC.fmtInt(v.local.admissions) +
          ' admissions suivies</small></div></div>' +
          '<div class="nc-banner-stats">' +
          this._bannerStat('MAS dépistée', NC.fmtDec(v.local.mas, 1) + '%', v.local.mas > 10 ? 'danger' : 'warn') +
          this._bannerStat('Guérison CRENAS', NC.fmtDec(v.local.recovery, 1) + '%', v.local.recovery >= 75 ? 'ok' : 'danger') +
          this._bannerStat('ANJE', Math.round(v.local.anjeScore) + '/100', v.local.anjeScore >= 50 ? 'ok' : 'warn') +
          this._bannerStat('Score WASH', v.local.washScore + '%', v.local.washScore >= 60 ? 'ok' : 'warn') +
          '</div>';
      } else {
        const c = v.country;
        el.innerHTML =
          '<div class="nc-banner-main"><span class="nc-banner-icon">' + c.flag + '</span><div>' +
          '<b>' + esc(c.name) + ' — ' + esc(c.capitale) + '</b>' +
          '<small>' + v.districts.length + ' districts · ' + NC.fmtInt(c.u5) + ' k enfants < 5 ans · ' +
          NC.fmtInt(c.screened) + ' k dépistés · région ' + esc(c.region) + ' · comparaison à la moyenne régionale</small>' +
          '</div></div>' +
          '<div class="nc-banner-stats">' +
          this._bannerStat('MAS dépistée', NC.fmtDec(v.local.mas, 1) + '%', v.local.mas > v.region.mas ? 'danger' : 'ok') +
          this._bannerStat('Guérison', NC.fmtDec(v.local.recovery, 1) + '%', v.local.recovery >= 75 ? 'ok' : 'danger') +
          this._bannerStat('ANJE', Math.round(v.local.anjeScore) + '/100', v.local.anjeScore >= 50 ? 'ok' : 'warn') +
          this._bannerStat('Vitamine A', Math.round(v.local.vitA) + '%', v.local.vitA >= 80 ? 'ok' : 'warn') +
          '</div>';
      }
    }
    _bannerStat(label, value, tone) {
      return '<div class="nc-bstat ' + tone + '"><span>' + label + '</span><b>' + value + '</b></div>';
    }

    /* ---------------- Les 5 KPI ---------------- */
    _renderKPIs(v) {
      const cards = this.root.querySelectorAll('[data-kpi]');
      const order = ['k-mas', 'k-ebf', 'k-recovery', 'k-vita', 'k-adm'];
      const data = { 'k-mas': v.kpis.mas, 'k-ebf': v.kpis.ebf, 'k-recovery': v.kpis.recovery, 'k-vita': v.kpis.vitA, 'k-adm': v.kpis.admissions };
      cards.forEach((card) => {
        const k = data[card.getAttribute('data-kpi')];
        if (!k) return;
        card.style.setProperty('--nc-kpi-color', k.color);
        const badge = card.querySelector('[data-badge]');
        badge.className = 'nc-badge ' + (k.badge ? k.badge.tone : 'info') + (k.badge && k.badge.blink ? ' blink' : '');
        badge.innerHTML = (k.badge && k.badge.tone === 'ok' ? NC.ICONS.check + ' ' : '') + esc(k.badge ? k.badge.text : '');
        const valEl = card.querySelector('[data-value]');
        /* Compteur animé en requestAnimationFrame */
        NC.countUp(valEl, k.numeric, {
          decimals: k.decimals, suffix: k.suffix,
          format: (x) => (k.decimals ? NC.fmtDec(x, k.decimals) : NC.fmtInt(x))
        });
        card.querySelector('[data-label]').textContent = k.label;
        card.querySelector('[data-sublabel]').textContent = k.sub;
        /* Pied de card : comparaison régionale ou repère */
        const foot = card.querySelector('[data-foot]');
        const parts = [];
        if (k.compare) parts.push('<span class="' + (k.compare.good ? 'good' : 'bad') + '">' + esc(k.compare.label) + '</span>');
        if (k.key === 'mas') parts.push('<span>Moyenne régionale : ' + NC.fmtDec(v.region.mas, 1) + '%</span>');
        if (k.key === 'ebf') parts.push('<span>Écart à l’objectif : ' + k.gap + ' pts</span>');
        if (k.key === 'recovery') parts.push('<span>Seuil Sphère : 75%</span>');
        if (k.key === 'vitA') parts.push('<span>' + k.conformes + ' pays ≥ 80%</span>');
        if (k.key === 'admissions') parts.push('<span>Variation : ' + (k.variation >= 0 ? '+' : '') + NC.fmtDec(k.variation, 1) + '%</span>');
        foot.innerHTML = parts.join('');
      });

      /* Panneau latéral du KPI 2 : comparaison du périmètre */
      const side = this.root.querySelector('[data-kpi-side="ebf"]');
      const best = v.ranking.slice().sort((a, b) => b.ebf - a.ebf)[0];
      const worst = v.ranking.slice().sort((a, b) => a.ebf - b.ebf)[0];
      side.innerHTML =
        '<div class="nc-side-row"><span>Moyenne régionale</span><b>' + NC.fmtDec(v.region.ebf, 0) + '%</b></div>' +
        '<div class="nc-side-row"><span>Meilleur pays</span><b class="ok">' + esc(best.name) + ' ' + NC.fmtDec(best.ebf, 0) + '%</b></div>' +
        '<div class="nc-side-row"><span>Point critique</span><b class="bad">' + esc(worst.name) + ' ' + NC.fmtDec(worst.ebf, 0) + '%</b></div>' +
        '<div class="nc-side-row"><span>Objectif OMS</span><b>70%</b></div>';

      /* Données des micro-graphiques KPI */
      if (this.kpiCharts.kpiBars) this.kpiCharts.kpiBars.setData({
        items: v.kpis.mas.breakdown.map((b) => ({ label: b.label, value: b.value })),
        color: '#E5243B', unit: 'Enfants MAS dépistés', suffix: ' k',
        subtitle: v.isRegion ? 'Répartition par sous-région' : 'Répartition par district'
      });
      if (this.kpiCharts.kpiGauge) this.kpiCharts.kpiGauge.setData({ value: v.kpis.ebf.numeric, objective: 70, color: v.kpis.ebf.color });
      if (this.kpiCharts.kpiSpark) this.kpiCharts.kpiSpark.setData({ values: v.kpis.recovery.spark, labels: NC.MOIS });
      if (this.kpiCharts.kpiProgress) this.kpiCharts.kpiProgress.setData({
        value: v.kpis.vitA.numeric, objective: 80, conformes: v.kpis.vitA.conformes,
        label: (v.isRegion ? 'Afrique de l’Ouest · ' : v.country.name + ' · ') + 'couverture Vitamine A'
      });
      if (this.kpiCharts.kpiMonthly) this.kpiCharts.kpiMonthly.setData({
        values: v.monthly.adm, labels: v.monthly.labels, activeIndex: v.monthly.activeIndex, soudure: NC.DATA.SOUDRURE
      });
    }

    /* ---------------- Les 15 graphiques ---------------- */
    _renderCharts(v) {
      const set = (id, data, instant) => {
        if (this.charts[id]) this.charts[id].setData(data, { instant: instant });
      };
      set('g1', Object.assign({}, v.growth));
      set('g2', v.funnel);
      set('g3', v.radar);
      set('g4', { metrics: v.bullets.metrics, rows: v.bullets.rows, region: v.bullets.region, activeMetric: this.state.bulletMetric, maxRows: v.isRegion ? 10 : 9 });
      set('g5', v.campaigns);
      set('g6', v.heatmap);
      set('g7', v.scatter);
      set('g8', v.timeline1000);
      set('g9', v.bubbles);
      set('g10', v.history);
      set('g11', v.determinants);
      set('g12', v.grouped);
      set('g13', v.polar);
      set('g14', { rows: v.lollipop.rows, objective: v.lollipop.objective, metric: v.lollipop.metric, maxRows: v.isRegion ? 5 : 8 });

      /* Libellés dynamiques des cards (sous-titres contextualisés) */
      this._decorate(v);
    }

    /* Sous-titres dynamiques + puces (chips) contextuelles + légendes */
    _decorate(v) {
      const sub = (id, txt) => {
        const el = this.root.querySelector('[data-sub="' + id + '"]');
        if (el) el.textContent = txt;
      };
      sub('g1', 'Références OMS 2006 (P3 → P97) · ' + (v.growth.sex === 'garcon' ? 'garçons' : 'filles') + ' · ' + v.growth.measureLabel.toLowerCase() +
        ' · ' + NC.fmtInt(v.growth.points.length) + ' enfants mesurés dans l’App');
      sub('g2', v.isRegion ? 'Cascade régionale consolidée · ' + NC.fmtInt(v.funnel.estimated) + ' k enfants MAS estimés'
        : 'Cascade des ' + v.districts.length + ' districts de ' + v.country.name);
      sub('g6', 'Lignes = ' + (v.isRegion ? v.codes.length + ' pays' : v.districts.length + ' districts') + ' · colonnes = 8 indicateurs ANJE · couleur = écart à l’objectif OMS');
      sub('g13', 'Saisonnalité des admissions enregistrées · ' + (v.isRegion ? 'Afrique de l’Ouest' : v.country.name));
      sub('g15', 'Périmètre : ' + (v.isRegion ? v.codes.length + ' pays' : v.districts.length + ' districts de ' + v.country.name) +
        ' · ' + NC.fmtInt(v.scorecardTotals.admissions) + ' admissions suivies · stock ATPE moyen ' + Math.round(v.scorecardTotals.atpe) + '%');

      /* Chips G1 : sexe + mesure */
      const chips1 = this.root.querySelector('[data-chips="g1"]');
      chips1.innerHTML =
        '<div class="nc-seg xs" data-g1sex>' +
          '<button data-sex="garcon" class="' + (v.growth.sex === 'garcon' ? 'on' : '') + '">👦 Garçon</button>' +
          '<button data-sex="fille" class="' + (v.growth.sex === 'fille' ? 'on' : '') + '">👧 Fille</button>' +
        '</div>' +
        '<div class="nc-seg xs" data-g1measure>' +
          '<button data-measure="poids" class="' + (v.growth.measure === 'poids' ? 'on' : '') + '">Poids</button>' +
          '<button data-measure="taille" class="' + (v.growth.measure === 'taille' ? 'on' : '') + '">Taille</button>' +
          '<button data-measure="muac" class="' + (v.growth.measure === 'muac' ? 'on' : '') + '">Périmètre brachial</button>' +
        '</div>';
      const self = this;
      chips1.querySelectorAll('[data-sex]').forEach((b) => b.addEventListener('click', () => {
        self.state.sex = b.getAttribute('data-sex'); self.refreshAll();
      }));
      chips1.querySelectorAll('[data-measure]').forEach((b) => b.addEventListener('click', () => {
        self.state.measure = b.getAttribute('data-measure'); self.refreshAll();
      }));

      /* Légendes interactives (toggle séries) */
      this._legend('g1', v.growth.percentiles.map((p) => ({ key: p.key, label: p.label + ' — ' + p.zone, color: p.color })));
      this._legend('g3', v.radar.series.map((s) => ({ key: s.key, label: s.label, color: s.color })));
      this._legend('g5', v.campaigns.series.map((s) => ({ key: s.key, label: s.label, color: s.color })));
      this._legend('g10', v.history.series.map((s) => ({ key: s.key, label: s.label, color: s.color })));

      /* Chips G4 : choix de la métrique */
      const chips4 = this.root.querySelector('[data-chips="g4"]');
      chips4.innerHTML = '<div class="nc-seg xs" data-g4metric>' + v.bullets.metrics.map((m) =>
        '<button data-metric="' + m.key + '" class="' + (self.state.bulletMetric === m.key ? 'on' : '') + '">' + m.label + '</button>').join('') + '</div>' +
        '<span class="nc-chip-note">Seuil humanitaire Sphère : ' + NC.fmtDec(v.bullets.metrics.filter((m) => m.key === self.state.bulletMetric)[0].target, 0) + '%</span>';
      chips4.querySelectorAll('[data-metric]').forEach((b) => b.addEventListener('click', () => {
        self.state.bulletMetric = b.getAttribute('data-metric'); self.refreshAll();
      }));

      /* Chips G10 : sélection des pays de tendance (mode régional) */
      const chips10 = this.root.querySelector('[data-chips="g10"]');
      if (v.isRegion) {
        chips10.innerHTML = '<span class="nc-chip-label">Séries affichées :</span>' +
          NC.DATA.countries.map((c) => '<button class="nc-chip' + (self.state.trendPays.indexOf(c.code) >= 0 ? ' on' : '') +
            '" data-trend="' + c.code + '">' + c.flag + ' ' + c.name + '</button>').join('') +
          '<span class="nc-chip-note" data-trend-note>' + self.state.trendPays.length + ' séries + moyenne régionale</span>';
        chips10.querySelectorAll('[data-trend]').forEach((b) => b.addEventListener('click', () => {
          const code = b.getAttribute('data-trend');
          const i = self.state.trendPays.indexOf(code);
          if (i >= 0) { if (self.state.trendPays.length > 1) self.state.trendPays.splice(i, 1); }
          else if (self.state.trendPays.length < 6) self.state.trendPays.push(code);
          else self._toast('Maximum 6 séries comparées simultanément');
          self.refreshAll();
        }));
      } else {
        chips10.innerHTML = '<span class="nc-chip-label">Base de comparaison :</span>' +
          '<button class="nc-chip on">' + v.country.flag + ' ' + v.country.name + '</button>' +
          '<button class="nc-chip on" disabled>Moyenne régionale (référence)</button>';
      }
    }

    /* Légende cliquable : chaque pastille masque / affiche sa série */
    _legend(id, items) {
      const host = this.root.querySelector('[data-legend="' + id + '"]');
      if (!host) return;
      const ch = this.charts[id];
      const self = this;
      host.innerHTML = items.map((it) =>
        '<button class="nc-lg' + (it.dashed ? ' dashed' : '') + (ch && ch.hidden.has(it.key) ? ' off' : '') + '" data-key="' + esc(it.key) + '">' +
        '<i style="background:' + it.color + '"></i><span>' + esc(it.label) + '</span></button>').join('');
      host.querySelectorAll('[data-key]').forEach((b) => b.addEventListener('click', () => {
        const key = b.getAttribute('data-key');
        if (!ch) return;
        if (ch.hidden.has(key)) ch.hidden.delete(key); else ch.hidden.add(key);
        b.classList.toggle('off', ch.hidden.has(key));
        ch.refresh();
        self._toast((ch.hidden.has(key) ? 'Série masquée : ' : 'Série affichée : ') + b.textContent.trim());
      }));
    }

    /* Clic sur une cellule de la heatmap : ouvre le détail dans la modal */
    _onHeatCell(hit) {
      const v = this.view;
      const row = v.heatmap.rows[hit.index];
      const col = v.heatmap.cols[hit.col];
      if (!row || !col) return;
      const val = row.values[hit.col];
      const t = Math.round((val / col.oms) * 100);
      this._openModal(
        col.label + ' — ' + row.label,
        'Questionnaire ANJE de l’App · objectif OMS ' + col.oms + '%',
        '<div class="nc-modal-kpis">' +
          '<div class="nc-mk"><span>Valeur mesurée</span><b>' + val + '%</b></div>' +
          '<div class="nc-mk"><span>Objectif OMS</span><b>' + col.oms + '%</b></div>' +
          '<div class="nc-mk"><span>Atteinte</span><b>' + t + '%</b></div>' +
          '<div class="nc-mk ' + (val >= col.oms ? 'ok' : 'bad') + '"><span>Écart</span><b>' + (val >= col.oms ? '+' : '−') + Math.abs(val - col.oms) + ' pts</b></div>' +
        '</div>' +
        '<p class="nc-modal-note">' + (val >= col.oms
          ? 'Pratique conforme au benchmark OMS. Capitaliser via les causeries communautaires.'
          : 'Écart de ' + (col.oms - val) + ' points à l’objectif. Prioriser les rappels automatiques de l’App et le suivi des relais.') + '</p>'
      );
    }

    /* ---------------- Panneau de synchronisation ---------------- */
    _renderSync(v) {
      const stats = this.root.querySelector('[data-sync-stats]');
      const totalLots = v.syncLog.reduce((s, l) => s + l.lots, 0);
      const totalEnfants = v.syncLog.reduce((s, l) => s + l.enfants, 0);
      stats.innerHTML =
        this._bannerStat('Lots reçus (24 h)', NC.fmtInt(totalLots), 'ok') +
        this._bannerStat('Fiches enfants', NC.fmtInt(totalEnfants), 'info') +
        this._bannerStat('Complétude', '92%', 'ok');
      const list = this.root.querySelector('[data-sync-list]');
      list.innerHTML = v.syncLog.map((l) => {
        const tone = l.statut === 'Reçu' ? 'ok' : l.statut === 'Partiel' ? 'warn' : 'info';
        return '<div class="nc-sync-row"><span class="nc-dot ' + tone + '"></span>' +
          '<div><b>' + esc(l.agent) + '</b><small>' + esc(l.type) + ' · ' + l.lots + ' lots · ' + NC.fmtInt(l.enfants) + ' enfants</small></div>' +
          '<span class="nc-tag ' + tone + '">' + esc(l.statut) + '</span></div>';
      }).join('');
      this.root.querySelector('[data-side-sync]').textContent = 'App v4.2 · ' + totalEnfants + ' fiches synchronisées';
    }

    /* ---------------- Signaux d'alerte ---------------- */
    _renderAlerts(v) {
      const host = this.root.querySelector('[data-alerts]');
      host.innerHTML = v.alertes.map((a) =>
        '<div class="nc-alert ' + a.niveau + '" style="--c:' + a.couleur + '">' +
        '<b>' + esc(a.titre) + '</b><p>' + esc(a.texte) + '</p></div>').join('');
    }

    /* ---------------- Pieds de card (notes contextuelles) ---------------- */
    _updateFooters(v) {
      const foot = (id, html) => {
        const el = this.root.querySelector('[data-foot="' + id + '"]');
        if (el) el.innerHTML = html;
      };
      const arrows = (val, invert) => {
        const bad = invert ? val > 0 : val < 0;
        return '<span class="' + (bad ? 'bad' : 'good') + '">' + (val > 0 ? '↑' : val < 0 ? '↓' : '±') + ' ' + NC.fmtDec(Math.abs(val), 1) + '</span>';
      };
      foot('g1', '<span>Prévalence MAS du périmètre : <b class="bad">' + NC.fmtDec(v.local.mas, 1) + '%</b></span>' +
        '<span>Moyenne régionale : <b>' + NC.fmtDec(v.region.mas, 1) + '%</b></span>' +
        '<span>Nuage : <b>' + NC.fmtInt(v.growth.points.length) + ' enfants mesurés via l’App</b></span>');
      const bm = v.bullets.metrics.filter((m) => m.key === this.state.bulletMetric)[0] || v.bullets.metrics[0];
      const conforme = (r) => (bm.key === 'recovery' ? r.recovery >= bm.target : r[bm.key] <= bm.target);
      foot('g4', '<span>' + esc(bm.label) + ' — moyenne régionale : <b>' + NC.fmtDec(v.bullets.region[bm.key], 1) + '%</b></span>' +
        '<span>' + esc(bm.objLabel) + '</span>' +
        '<span>Zones conformes : <b>' + v.bullets.rows.filter(conforme).length + ' / ' + v.bullets.rows.length + '</b></span>');
      foot('g2', '<span>Gap de couverture terrain : <b class="bad">' + v.funnel.gap.pct + '%</b> des enfants MAS estimés hors cascade</span>' +
        '<span>Étape finale : ' + NC.fmtInt(v.funnel.stages[5].value) + ' k enfants guéris confirmés</span>');
      foot('g9', '<span>Enfants MAS dépistés : <b>' + NC.fmtCompact(v.kpis.mas.value, 1) + '</b></span>' +
        '<span>Prévalence la plus élevée : <b class="bad">' + esc(v.ranking[0].name) + ' ' + NC.fmtDec(v.ranking[0].mas, 1) + '%</b></span>');
      foot('g13', '<span>Total annuel : <b>' + NC.fmtInt(v.polar.total) + ' admissions</b></span>' +
        '<span>Soudure (Juin → Sept.) : <b class="bad">' + NC.fmtDec((NC.DATA.SOUDURE.reduce((s, i) => s + v.polar.values[i], 0) / v.polar.total) * 100, 1) + '%</b> des admissions</span>');
      foot('g14', '<span>Couverture moyenne 2024 : <b>' + NC.fmtDec(v.local.vitA, 1) + '%</b></span>' +
        '<span>Objectif régional : <b>80%</b> · ' + v.kpis.vitA.conformes + ' pays en conformité</span>');
      foot('g12', '<span>Score ANJE du périmètre : <b>' + Math.round(v.local.anjeScore) + '/100</b></span>' +
        '<span>Indicateur le plus faible : <b class="bad">' + esc(this._weakestAnje(v)) + '</b></span>');
      foot('g7', '<span>Corrélation WASH → stunting : <b>R² = ' + NC.fmtDec(v.scatter.regression.r2, 2) + '</b></span>' +
        '<span>Pente : <b>' + NC.fmtDec(v.scatter.regression.a, 2) + ' pt de stunting par point de WASH</b></span>');
    }
    _weakestAnje(v) {
      let worst = null;
      Object.keys(v.local.anje).forEach((k) => {
        const axis = NC.DATA.ANJE.filter((a) => a.key === k)[0];
        if (!axis) return;
        const gap = axis.oms - v.local.anje[k];
        if (!worst || gap > worst.gap) worst = { gap: gap, label: axis.label, value: v.local.anje[k] };
      });
      return worst ? worst.label + ' (' + NC.fmtDec(worst.value, 0) + '%)' : '—';
    }

    /* ---------------- Scorecard (G15) ---------------- */
    _renderScorecard() {
      const v = this.view;
      if (!v) return;
      const table = this.root.querySelector('[data-table]');
      const search = (this.root.querySelector('[data-search]').value || '').toLowerCase();
      const cols = [
        { key: 'label', label: 'Zone / Centre Nutri', sort: true },
        { key: 'admissions', label: 'Admissions', sort: true },
        { key: 'recovery', label: 'Guérison', sort: true },
        { key: 'abandon', label: 'Abandon', sort: true },
        { key: 'death', label: 'Décès', sort: true },
        { key: 'atpe', label: 'Stock ATPE', sort: true },
        { key: 'anje', label: 'Score ANJE', sort: true },
        { key: 'mas', label: 'MAS', sort: true },
        { key: 'spark', label: 'Tendance 12 mois', sort: false },
        { key: 'state', label: 'État', sort: false }
      ];
      table.querySelector('thead').innerHTML = '<tr>' + cols.map((c) =>
        '<th' + (c.sort ? ' data-sort="' + c.key + '" class="sortable' + (this.sort.key === c.key ? ' active' : '') + '"' : '') + '>' +
        c.label + (this.sort.key === c.key ? (this.sort.dir < 0 ? ' ↓' : ' ↑') : '') + '</th>').join('') + '</tr>';

      let rows = v.scorecard.filter((r) => !search || r.label.toLowerCase().indexOf(search) >= 0);
      const key = this.sort.key, dir = this.sort.dir;
      rows = rows.slice().sort((a, b) => {
        let x = a[key], y = b[key];
        if (key === 'label') { x = String(x); y = String(y); return dir * x.localeCompare(y); }
        return dir * (x - y);
      });

      const badge = (val, type) => {
        if (type === 'recovery') return '<span class="nc-tag ' + (val >= 75 ? 'ok' : val >= 68 ? 'warn' : 'bad') + '">' + NC.fmtDec(val, 1) + '%</span>';
        if (type === 'abandon') return '<span class="nc-tag ' + (val <= 10 ? 'ok' : val <= 14 ? 'warn' : 'bad') + '">' + NC.fmtDec(val, 1) + '%</span>';
        if (type === 'death') return '<span class="nc-tag ' + (val <= 3 ? 'ok' : val <= 5 ? 'warn' : 'bad') + '">' + NC.fmtDec(val, 1) + '%</span>';
        if (type === 'atpe') return '<span class="nc-tag ' + (val >= 70 ? 'ok' : val >= 40 ? 'warn' : 'bad') + '">' + Math.round(val) + '%</span>';
        return NC.fmtDec(val, 1) + '%';
      };
      table.querySelector('tbody').innerHTML = rows.map((r, i) => {
        const state = r.atpe < 40 ? ['bad', '⚠ Rupture ATPE'] :
          r.abandon > 12 ? ['warn', '⚠ Abandons élevés'] :
          r.recovery >= 75 ? ['ok', '✓ Conforme Sphère'] : ['warn', '≈ À renforcer'];
        return '<tr data-row="' + i + '" class="' + (r.atpe < 40 ? 'critical' : '') + '">' +
          '<td class="zone"><b>' + esc(r.label) + '</b>' + (v.isRegion ? '<small>' + esc(M.byCode(r.code).region) + '</small>' : '') + '</td>' +
          '<td>' + NC.fmtInt(r.admissions) + '</td>' +
          '<td>' + badge(r.recovery, 'recovery') + '</td>' +
          '<td>' + badge(r.abandon, 'abandon') + '</td>' +
          '<td>' + badge(r.death, 'death') + '</td>' +
          '<td>' + badge(r.atpe, 'atpe') + '</td>' +
          '<td>' + Math.round(r.anje) + '</td>' +
          '<td><span class="nc-tag ' + (r.mas > 15 ? 'bad' : r.mas > 10 ? 'warn' : 'ok') + '">' + NC.fmtDec(r.mas, 1) + '%</span></td>' +
          '<td><canvas class="nc-spark" data-spark="' + i + '"></canvas></td>' +
          '<td><span class="nc-tag ' + state[0] + '">' + state[1] + '</span></td></tr>';
      }).join('');

      /* Mini-sparklines Canvas (dessinées après insertion dans le DOM) */
      requestAnimationFrame(() => {
        this.root.querySelectorAll('[data-spark]').forEach((cv) => {
          const r = rows[+cv.getAttribute('data-spark')];
          if (!r) return;
          cv.style.width = '96px'; cv.style.height = '24px';
          const col = r.recovery >= 75 ? '#80BD41' : r.recovery >= 68 ? '#DDA63A' : '#E5243B';
          NC.sparkline(cv, r.spark, col, { markIndex: v.moisCourant });
        });
      });

      const t = v.scorecardTotals;
      this.root.querySelector('[data-table-foot]').innerHTML =
        '<span><b>' + rows.length + '</b> zones affichées' + (search ? ' (filtrées)' : '') + '</span>' +
        '<span>Admissions cumulées : <b>' + NC.fmtInt(t.admissions) + '</b></span>' +
        '<span>Guérison moyenne : <b>' + NC.fmtDec(t.recovery, 1) + '%</b></span>' +
        '<span>Abandon : <b>' + NC.fmtDec(t.abandon, 1) + '%</b></span>' +
        '<span>Décès : <b>' + NC.fmtDec(t.death, 1) + '%</b></span>' +
        '<span>Stock ATPE : <b>' + Math.round(t.atpe) + '%</b></span>';
    }

    /* =====================================================================
     * Modal / toast
     * =================================================================== */
    _openModal(title, sub, body) {
      const m = this.root.querySelector('[data-modal]');
      this.root.querySelector('[data-modal-title]').textContent = title;
      this.root.querySelector('[data-modal-sub]').textContent = sub || '';
      this.root.querySelector('[data-modal-body]').innerHTML = body;
      m.classList.add('on');
    }
    _closeModal() { this.root.querySelector('[data-modal]').classList.remove('on'); }
    _toast(msg) {
      const t = this.root.querySelector('[data-toast]');
      t.textContent = msg;
      t.classList.add('on');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove('on'), 2600);
    }

    /* Simulation de synchronisation de l'app mobile (storytelling produit) */
    _simulateSync() {
      const el = this.root.querySelector('[data-sync-text]');
      const badge = this.root.querySelector('[data-sync-badge]');
      const steps = [
        'Connexion sécurisée à l’App terrain…',
        'Récupération des lots : Maradi, Mopti, Kano…',
        'Validation des mesures MUAC (contrôle de plausibilité)…',
        '528 100 enfants dépistés ce mois agrégés'
      ];
      let i = 0;
      const run = () => {
        if (i < steps.length) {
          el.textContent = steps[i];
          badge.textContent = steps[i] + ' (' + (i + 1) + '/' + steps.length + ')';
          i++;
          this._syncT = setTimeout(run, 620);
        } else {
          el.textContent = 'Dernière synchro app : à l’instant';
          badge.textContent = 'Dernière synchro app : à l’instant (' + NC.fmtInt(NC.DATA.meta.enfantsDepistesMois) + ' enfants dépistés ce mois)';
          this._toast('Synchronisation terminée · ' + NC.fmtInt(NC.DATA.meta.enfantsDepistesMois) + ' enfants dépistés ce mois');
        }
      };
      clearTimeout(this._syncT);
      run();
    }

    /* =====================================================================
     * Exports : rapport PDF (impression) & CSV scorecard
     * =================================================================== */
    exportCSV() {
      const v = this.view;
      const head = ['Zone', 'Pays/Région', 'Admissions CRENAS', 'Taux de guérison (%)', 'Taux d\'abandon (%)',
        'Taux de décès (%)', 'Stock ATPE (%)', 'Score ANJE', 'Prévalence MAS (%)', 'Enfants MAS dépistés (k)'];
      const lines = v.scorecard.map((r) => [
        strip(r.label),
        v.isRegion ? M.byCode(r.code).region : v.country.name,
        r.admissions, NC.fmtDec(r.recovery, 1), NC.fmtDec(r.abandon, 1), NC.fmtDec(r.death, 1),
        r.atpe, r.anje, NC.fmtDec(r.mas, 1), NC.fmtDec(r.detected, 1)
      ].join(';'));
      const csv = '\uFEFF' + head.join(';') + '\n' + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unicef-nutrichild-' + (v.isRegion ? 'afrique-ouest' : v.country.code.toLowerCase()) + '-2024.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this._toast('Export CSV généré · ' + v.scorecard.length + ' lignes');
    }

    /* Rapport autonome : les Canvas sont sérialisés en PNG puis imprimés */
    exportPDF() {
      const v = this.view;
      const self = this;
      const now = new Date();
      const cards = [];
      Object.keys(CHART_MAP).forEach((id) => {
        const ch = this.charts[id];
        const card = this.root.querySelector('#card-' + id);
        if (!ch || !card || !ch.canvas.width) return;
        const title = card.querySelector('h3').textContent;
        const sub = card.querySelector('.nc-card-sub') ? card.querySelector('.nc-card-sub').textContent : '';
        let img = '';
        try { img = ch.canvas.toDataURL('image/png'); } catch (e) { img = ''; }
        cards.push({ title: title, sub: sub, img: img });
      });
      const kpis = Array.prototype.slice.call(this.root.querySelectorAll('[data-kpi]')).map((c) => ({
        label: c.querySelector('[data-label]').textContent,
        value: c.querySelector('[data-value]').textContent,
        sub: c.querySelector('[data-sublabel]').textContent
      }));
      const rows = v.scorecard.slice(0, 24).map((r) =>
        '<tr><td>' + esc(strip(r.label)) + '</td><td>' + NC.fmtInt(r.admissions) + '</td>' +
        '<td>' + NC.fmtDec(r.recovery, 1) + '%</td><td>' + NC.fmtDec(r.abandon, 1) + '%</td>' +
        '<td>' + NC.fmtDec(r.death, 1) + '%</td><td>' + Math.round(r.atpe) + '%</td>' +
        '<td>' + Math.round(r.anje) + '</td><td>' + NC.fmtDec(r.mas, 1) + '%</td></tr>').join('');

      const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
        '<title>UNICEF NutriChild — Rapport ' + esc(v.isRegion ? 'Afrique de l’Ouest' : v.country.name) + ' 2024</title>' +
        '<style>' +
        '@page{size:A4;margin:14mm}' +
        'body{font-family:Inter,system-ui,Segoe UI,Arial;color:#1E293B;margin:0}' +
        '.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #1CABE2;padding-bottom:12px;margin-bottom:18px}' +
        '.hd h1{font-size:21px;margin:0 0 4px}.hd p{margin:2px 0;color:#64748B;font-size:11.5px}' +
        '.hd .logo{font-weight:800;color:#1CABE2;font-size:19px}' +
        '.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:18px}' +
        '.kpi{border:1px solid #BAE6FD;border-radius:12px;padding:10px}' +
        '.kpi span{font-size:9px;color:#94A3B8;text-transform:uppercase;letter-spacing:.04em}' +
        '.kpi b{display:block;font-size:19px;margin:4px 0 2px;color:#0E7490}' +
        '.kpi small{color:#64748B;font-size:9.5px;line-height:1.35;display:block}' +
        'h2{font-size:13px;margin:20px 0 8px;color:#0E7490;border-left:4px solid #1CABE2;padding-left:8px}' +
        '.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
        '.card{border:1px solid #E2E8F0;border-radius:12px;padding:10px;break-inside:avoid}' +
        '.card h3{font-size:11.5px;margin:0 0 3px}.card p{font-size:9.5px;color:#94A3B8;margin:0 0 6px}' +
        '.card img{width:100%;height:auto;border-radius:8px}' +
        'table{width:100%;border-collapse:collapse;font-size:10px;margin-top:6px}' +
        'th,td{border-bottom:1px solid #E2E8F0;padding:5px 6px;text-align:left}' +
        'th{background:#F0F9FF;color:#0E7490}' +
        '.ft{margin-top:18px;border-top:1px solid #E2E8F0;padding-top:8px;font-size:9.5px;color:#94A3B8}' +
        '</style></head><body>' +
        '<div class="hd"><div><h1>UNICEF NutriApp · Surveillance Nutritionnelle Infantile</h1>' +
        '<p>Périmètre : <b>' + esc(v.isRegion ? 'Afrique de l’Ouest — Vue Globale (' + v.codes.length + ' pays)' : v.country.flag + ' ' + v.country.name + ' — ' + v.districts.length + ' districts') + '</b></p>' +
        '<p>' + esc(v.subtitle) + '</p>' +
        '<p>Source : ' + esc(NC.DATA.meta.source) + '</p></div>' +
        '<div style="text-align:right"><div class="logo">UNICEF</div><p>Rapport généré le ' +
        now.toLocaleDateString('fr-FR') + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + '</p></div></div>' +
        '<div class="kpis">' + kpis.map((k) => '<div class="kpi"><span>' + esc(k.label) + '</span><b>' + esc(k.value) + '</b><small>' + esc(k.sub) + '</small></div>').join('') + '</div>' +
        '<h2>Graphiques de surveillance</h2><div class="grid">' +
        cards.map((c) => '<div class="card"><h3>' + esc(c.title) + '</h3><p>' + esc(c.sub) + '</p>' +
          (c.img ? '<img src="' + c.img + '" alt="">' : '<p><i>Graphique non disponible</i></p>') + '</div>').join('') +
        '</div>' +
        '<h2>Scorecard des centres Nutri / CRENAS</h2>' +
        '<table><thead><tr><th>Zone</th><th>Admissions</th><th>Guérison</th><th>Abandon</th><th>Décès</th><th>Stock ATPE</th><th>ANJE</th><th>MAS</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>' +
        '<div class="ft">UNICEF NutriChild · Application Mobile Terrain UNICEF &amp; Relais Communautaires (Dépistages MUAC &amp; Suivi CRENAS) · données de démonstration 2024</div>' +
        '<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script>' +
        '</body></html>';

      const w = global.open('', '_blank');
      if (w) {
        w.document.open(); w.document.write(html); w.document.close();
        this._toast('Rapport PDF généré · ' + cards.length + ' graphiques exportés');
      } else {
        /* Repli si les fenêtres sont bloquées : impression via iframe caché */
        const ifr = document.createElement('iframe');
        ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        document.body.appendChild(ifr);
        ifr.contentDocument.open(); ifr.contentDocument.write(html); ifr.contentDocument.close();
        setTimeout(() => ifr.remove(), 12000);
        this._toast('Rapport prêt dans le cadre d’impression');
      }
    }
  }

  /* Enregistrement du Custom Element */
  if (!customElements.get('unicef-nutrichild-dashboard')) {
    customElements.define('unicef-nutrichild-dashboard', NutriChildDashboard);
  }
  NC.Dashboard = NutriChildDashboard;
})(window);
