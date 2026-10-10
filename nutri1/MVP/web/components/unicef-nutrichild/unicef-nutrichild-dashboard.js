/* ============================================================================
 * UNICEF NutriChildApp · Custom Element <unicef-nutrichild-dashboard>
 * ----------------------------------------------------------------------------
 * Orchestration : état des filtres → modèle de vue → KPI, tableau et 15
 * graphiques Canvas. Tout le DOM du tableau de bord vit dans un Shadow DOM,
 * ce qui isole le composant des styles et scripts de la page principale.
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;
  if (!NS || !NS.DATA || !NS.model || !NS.template || !NS.Chart || !NS.Tooltip) return;

  const D = NS.DATA;
  const fmt = NS.fmt;
  const CHART_IDS = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G13', 'G14'];

  /** Cartes rattachées à chaque entrée de la sidebar (défilement + surbrillance). */
  const SECTION_CARDS = {
    malnutrition: ['G1', 'G2', 'G9'],
    anje: ['G3', 'G6', 'G8', 'G12'],
    crenas: ['G4', 'G15'],
    campagnes: ['G5', 'G14'],
    wash: ['G7', 'G11'],
    tendances: ['G10', 'G13']
  };

  /** Ton (couleur sémantique) d'une valeur de guérison selon le seuil Sphère. */
  const guerTone = (v) => (v >= D.target.guer ? 'ok' : v >= 60 ? 'warn' : 'danger');

  /**
   * Anime un nombre affiché dans un élément : interpolation ease-out sur rAF.
   * Un nouvel appel annule l'animation précédente de cet élément.
   */
  function tween(el, to, render, duration) {
    const from = typeof el._val === 'number' ? el._val : to;
    const token = (el._tween = (el._tween || 0) + 1);
    const dur = duration || 700;
    let t0 = null;
    const step = (ts) => {
      if (el._tween !== token) return;
      if (t0 == null) t0 = ts;
      const t = Math.min(1, (ts - t0) / dur);
      const v = from + (to - from) * NS.U.easeOutCubic(t);
      el.textContent = render(v);
      if (t < 1) requestAnimationFrame(step);
      else el._val = to;
    };
    if (from === to) {
      el.textContent = render(to);
      el._val = to;
      return;
    }
    requestAnimationFrame(step);
  }

  class UNICEFNutriChildDashboard extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._boot();
    }

    /** Construit le Shadow DOM, les graphiques et les écouteurs. */
    _boot() {
      this._booted = true;
      this.root = this.attachShadow({ mode: 'open' });

      // Feuille de style du composant (chargée dans le Shadow DOM).
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'components/unicef-nutrichild/unicef-nutrichild.css';
      this.root.appendChild(stylesheet);

      const template = document.createElement('template');
      template.innerHTML = NS.template();
      this.root.appendChild(template.content.cloneNode(true));

      this.$ = (selector) => this.root.querySelector(selector);
      this.$$ = (selector) => Array.from(this.root.querySelectorAll(selector));

      this.state = {
        mode: 'global',
        country: 'NE',
        zones: D.zones.map((z) => z.id),
        period: 'monthly',
        sex: 'F',
        metric: 'poids',
        bullet: 'guerison'
      };

      this.tip = new NS.Tooltip(this.$('.uni-app'));

      // Graphiques : un moteur par canvas (G1 → G14), mini-graphiques KPI.
      this.charts = {};
      CHART_IDS.forEach((id) => {
        const canvas = this.$('canvas[data-chart="' + id + '"]');
        if (canvas && NS.charts[id]) this.charts[id] = new NS.charts[id](canvas, { tip: this.tip });
      });
      this.kpiCharts = {
        mas: new NS.charts.MiniBars(this.$('canvas[data-chart="kpi-mas"]'), { tip: this.tip }),
        allait: new NS.charts.Gauge(this.$('canvas[data-chart="kpi-allait"]'), { tip: this.tip }),
        guer: new NS.charts.Sparkline(this.$('canvas[data-chart="kpi-guer"]'), { tip: this.tip }),
        adm: new NS.charts.MiniBars(this.$('canvas[data-chart="kpi-adm"]'), { tip: this.tip })
      };
      this.sparks = [];

      // Liste des pays pour le sélecteur.
      this.$('[data-country]').innerHTML = D.countries
        .map((c) => '<option value="' + c.code + '">' + NS.U.esc(c.name) + '</option>').join('');

      this._bind();
      this.refresh();
    }

    /** Délégation d'événements : une seule écoute par type sur la racine. */
    _bind() {
      this.root.addEventListener('click', (e) => {
        const el = e.target.closest('[data-mode],[data-period],[data-sex],[data-metric],[data-bullet],[data-zone],[data-country-chip],[data-nav],[data-action],[data-row-code]');
        if (!el) return;
        if (el.dataset.mode) return this.setState({ mode: el.dataset.mode });
        if (el.dataset.period) return this.setState({ period: el.dataset.period });
        if (el.dataset.sex) return this.setState({ sex: el.dataset.sex });
        if (el.dataset.metric) return this.setState({ metric: el.dataset.metric });
        if (el.dataset.bullet) return this.setState({ bullet: el.dataset.bullet });
        if (el.dataset.zone) return this._toggleZone(el.dataset.zone);
        if (el.dataset.countryChip) return this.setState({ country: el.dataset.countryChip, mode: 'country' });
        if (el.dataset.rowCode) return this.setState({ country: el.dataset.rowCode, mode: 'country' });
        if (el.dataset.nav) return this._scrollToSection(el.dataset.nav, el);
        if (el.dataset.action === 'report') return this._downloadReport();
      });
      this.$('[data-country]').addEventListener('change', (e) => this.setState({ country: e.target.value, mode: 'country' }));
    }

    /** Active / désactive une zone ; au moins une zone reste active. */
    _toggleZone(id) {
      const set = new Set(this.state.zones);
      if (set.has(id)) {
        if (set.size === 1) return this._toast('Au moins une zone doit rester active');
        set.delete(id);
      } else {
        set.add(id);
      }
      // Un filtre de zone n'a de sens qu'en vue régionale : on bascule en Global.
      this.setState({ mode: 'global', zones: D.zones.map((z) => z.id).filter((z) => set.has(z)) });
    }

    /** Met à jour l'état puis recalcule toute la vue. */
    setState(patch) {
      this.state = Object.assign({}, this.state, patch);
      this.refresh();
    }

    /** Recalcule le modèle et rafraîchit chaque partie du tableau de bord. */
    refresh() {
      const view = NS.model.build(this.state);
      this.view = view;
      this._renderHeader(view);
      this._renderKpis(view);
      this._renderCharts(view);
      this._renderScorecard(view);
      this._syncControls();
    }

    _renderHeader(v) {
      const crumb = this.$('[data-bind="crumb"]');
      crumb.textContent = v.breadcrumb;
      this.$('[data-bind="sync"]').textContent = 'Dernière synchro app : il y a ' + D.sync.minutesAgo +
        ' min (' + fmt.int(D.sync.childrenMonth) + ' enfants dépistés ce mois)';
      this.$$('[data-zone]').forEach((b) => {
        const on = v.zones.indexOf(b.dataset.zone) !== -1;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('is-disabled', v.mode === 'country');
      });
      this.$$('[data-country-chip]').forEach((b) => {
        const on = v.mode === 'country' && b.dataset.countryChip === v.country.code;
        b.setAttribute('aria-pressed', String(on));
      });
      this.$('[data-country]').value = v.country.code;
      this.$('[data-country-wrap]').classList.toggle('is-hidden', v.mode !== 'country');
    }

    _syncControls() {
      const s = this.state;
      this.$$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode)));
      this.$$('[data-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.period === s.period)));
      this.$$('[data-sex]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sex === s.sex)));
      this.$$('[data-metric]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.metric === s.metric)));
      this.$$('[data-bullet]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bullet === s.bullet)));
      this.$('[data-bind="score-head-name"]').textContent = this.state.mode === 'country' ? 'District' : 'Pays';
    }

    /** Cinq KPI : valeurs animées, badges, mini-graphiques. */
    _renderKpis(v) {
      const k = v.kpi;
      const setBadge = (key, badge) => {
        const el = this.$('[data-bind="kpi-' + key + '-badge"]');
        el.textContent = badge.text;
        el.className = 'kpi-badge tone-' + badge.tone + (badge.blink ? ' blink' : '');
      };

      // KPI 1 : enfants MAS dépistés (milliers → K / M).
      tween(this.$('[data-bind="kpi-mas-value"]'), k.mas.value, (x) => fmt.k(x), 800);
      this.$('[data-bind="kpi-mas-sub"]').textContent = k.mas.sub;
      setBadge('mas', k.mas.badge);
      // Libellés courts : premier mot de la zone (ou du district) pour éviter les chevauchements.
      this.kpiCharts.mas.update({
        labels: k.mas.mini.map((m) => m.label.split(' ')[0]),
        values: k.mas.mini.map((m) => m.value),
        color: D.brand.danger,
        unitLabel: 'MAS dépistés',
        format: (x) => fmt.k(x),
        highlight: undefined
      });

      // KPI 2 : allaitement exclusif (jauge rouge-orange).
      tween(this.$('[data-bind="kpi-allait-value"]'), k.allait.value, (x) => Math.round(x) + '%', 800);
      this.$('[data-bind="kpi-allait-sub"]').textContent = k.allait.sub;
      setBadge('allait', k.allait.badge);
      this.kpiCharts.allait.update({ value: k.allait.gauge });

      // KPI 3 : taux de guérison (sparkline 12 mois).
      tween(this.$('[data-bind="kpi-guer-value"]'), k.guer.value, (x) => x.toFixed(1) + '%', 800);
      this.$('[data-bind="kpi-guer-sub"]').textContent = k.guer.sub;
      setBadge('guer', k.guer.badge);
      this.kpiCharts.guer.update({
        values: k.guer.spark,
        labels: D.months,
        color: D.brand.secondary,
        unitLabel: 'Guérison',
        format: (x) => x.toFixed(1) + '%'
      });

      // KPI 4 : vitamine A avec progression et objectif 80 %.
      tween(this.$('[data-bind="kpi-vit-value"]'), k.vit.value, (x) => Math.round(x) + '%', 800);
      this.$('[data-bind="kpi-vit-sub"]').textContent = k.vit.sub;
      this.$('[data-bind="kpi-vit-badge"]').textContent = k.vit.value >= D.target.vitA ? 'Objectif atteint' : 'Sous objectif';
      this.$('[data-bind="kpi-vit-badge"]').className = 'kpi-badge tone-' + (k.vit.value >= D.target.vitA ? 'ok' : 'warn');
      const fill = this.$('[data-bind="kpi-vit-fill"]');
      fill.style.width = Math.min(100, k.vit.value) + '%';

      // KPI 5 : admissions du mois (ou du trimestre) et variation.
      tween(this.$('[data-bind="kpi-adm-value"]'), k.adm.value, (x) => fmt.int(x), 900);
      this.$('[data-bind="kpi-adm-label"]').textContent = k.adm.label;
      setBadge('adm', k.adm.badge);
      // Douze mois : initiale seule (J F M A…) ; trimestres : libellé complet.
      const admLabels = k.adm.mini.labels.length === 12
        ? k.adm.mini.labels.map((l) => l.charAt(0).toUpperCase())
        : k.adm.mini.labels;
      this.kpiCharts.adm.update({
        labels: admLabels,
        values: k.adm.mini.values,
        color: D.brand.primary,
        highlight: k.adm.mini.highlight,
        unitLabel: 'Admissions',
        format: (x) => fmt.int(x)
      });
    }

    /** Met à jour les 14 graphiques Canvas avec la vue courante. */
    _renderCharts(v) {
      Object.keys(this.charts).forEach((id) => this.charts[id].update(v));
    }

    /** Tableau de synthèse (G15) : lignes HTML, sparklines Canvas dans chaque ligne. */
    _renderScorecard(v) {
      this.sparks.forEach((s) => s.destroy());
      this.sparks = [];
      const tbody = this.$('[data-bind="score"]');
      tbody.innerHTML = v.scorecard.map((r) => {
        const tone = guerTone(r.guer);
        return '<tr' + (r.code ? ' data-row-code="' + r.code + '"' : '') + (r.national ? ' class="is-total"' : '') + '>' +
          '<td class="name">' + NS.U.esc(r.name) + '</td>' +
          '<td class="num">' + fmt.int(r.adm * 1000) + '</td>' +
          '<td class="num"><span class="pill tone-' + tone + '">' + r.guer.toFixed(1) + '%</span></td>' +
          '<td class="num">' + r.abandon.toFixed(1) + '%</td>' +
          '<td class="num">' + r.deces.toFixed(1) + '%</td>' +
          '<td><span class="pill tone-' + r.stock.tone + '">' + r.stock.label + '</span><small class="muted-sm">' + r.atpe.toFixed(1) + ' mois</small></td>' +
          '<td><div class="spark-box"><canvas data-spark role="img" aria-label="Tendance de guérison de ' + NS.U.esc(r.name) + '"></canvas></div></td>' +
          '</tr>';
      }).join('');
      tbody.querySelectorAll('canvas[data-spark]').forEach((cv, i) => {
        const spark = new NS.charts.Sparkline(cv, { tip: this.tip, height: 28 });
        spark.update({
          values: v.scorecard[i].trend,
          labels: D.months,
          color: v.scorecard[i].national ? D.brand.navy : D.brand.primary,
          unitLabel: 'Guérison',
          format: (x) => x.toFixed(1) + '%'
        });
        this.sparks.push(spark);
      });
    }

    /** Défilement vers une section de la sidebar, avec surbrillance temporaire. */
    _scrollToSection(section, btn) {
      this.$$('[data-nav]').forEach((b) => b.classList.toggle('on', b === btn));
      const ids = SECTION_CARDS[section] || [];
      const cards = ids.map((id) => this.$('#uni-' + id)).filter(Boolean);
      if (!cards.length) return;
      cards[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      cards.forEach((c) => {
        c.classList.add('flash');
        setTimeout(() => c.classList.remove('flash'), 1400);
      });
    }

    /** Petite notification temporaire (rapport généré, avertissement). */
    _toast(message) {
      const el = this.$('[data-bind="toast"]');
      el.textContent = message;
      el.classList.add('on');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
    }

    /** Rapport CSV du périmètre courant (KPI + tableau de synthèse), format FR (point-virgule). */
    _downloadReport() {
      const v = this.view;
      const k = v.kpi;
      const rows = [
        ['UNICEF NutriChildApp · Surveillance Nutritionnelle Infantile'],
        ['Périmètre', v.breadcrumb],
        ['Période', v.quarterly ? 'Trimestriel' : 'Mensuel', v.periodName],
        ['Avertissement', 'Données de démonstration : à valider avant décision'],
        [],
        ['Indicateur', 'Valeur', 'Commentaire'],
        ['Enfants MAS dépistés', fmt.k(k.mas.value), k.mas.sub],
        ['Allaitement exclusif', Math.round(k.allait.value) + '%', k.allait.sub],
        ['Taux de guérison CRENAS', k.guer.value.toFixed(1) + '%', k.guer.sub],
        ['Couverture vitamine A', Math.round(k.vit.value) + '%', k.vit.sub],
        ['Admissions (période en cours)', fmt.int(k.adm.value), k.adm.badge.text],
        [],
        ['Pays / district', 'Admissions / an', 'Guérison %', 'Abandon %', 'Décès %', 'Stock ATPE (mois)', 'Statut stock']
      ];
      v.scorecard.forEach((r) => rows.push([r.name, fmt.int(r.adm * 1000), r.guer.toFixed(1), r.abandon.toFixed(1), r.deces.toFixed(1), r.atpe.toFixed(1), r.stock.label]));
      const csv = '\uFEFF' + rows.map((row) => row.map((cell) => '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const scopeName = v.mode === 'global' ? 'regional' : v.country.code;
      link.download = 'unicef-nutrichild-' + scopeName + '-' + (v.quarterly ? 'trimestre' : 'mois') + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      global.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this._toast('Rapport CSV généré pour ' + v.breadcrumb);
    }
  }

  customElements.define('unicef-nutrichild-dashboard', UNICEFNutriChildDashboard);
})(window);
