/* =====================================================================
 * AgriNutri · Contrôleur du tableau de bord
 * ---------------------------------------------------------------------
 * Custom Element `<agri-nutriapp-dashboard>` avec Shadow DOM : isole les
 * styles du tableau de bord du reste de index.html et évite les conflits.
 *
 * Responsabilités :
 *  - rendu du squelette (gabarit) et montage des graphiques Canvas ;
 *  - périmètre « Vue Globale » ou « Vue Détaillée par Pays » (sélecteur) ;
 *  - mise à jour instantanée des KPI, des graphiques et du fil d'ariane ;
 *  - navigation par module (sidebar) et badge « Synchro NutriApp LIVE » ;
 *  - bouton natif de plein écran (Fullscreen API) sur l'élément hôte.
 * ===================================================================== */
(function () {
  'use strict';

  /* Correspondance : clé de carte → fabrique de graphique et fonction de modèle */
  const CHART_KEYS = {
    prod1: 'productionVsNeeds', heat: 'priceHeatmap', cal: 'calendar', scatter: 'diversityScatter',
    waste: 'wasteWaterfall', garden: 'gardenPairs', dual: 'priceInsecurity', funnel: 'fortificationFunnel',
    hist: 'productionHistory', bubble: 'lossVsIncome', lolli: 'selfSufficiency', tree: 'cropTreemap',
    radar: 'systemsRadar', dumb: 'priceDumbbell'
  };
  /* Badges KPI : sens « bon / mauvais » selon l'indicateur */
  const BAD_IF_UP = { price: true, mnt: true, loss: true };

  class AgriNutriDashboard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mounts = {};
      this._kpiCharts = [];
      this._scoreCharts = [];
      this._booted = false;
      this._onFs = this._onFullscreenChange.bind(this);
    }

    /* Cycle de vie : construction au premier rattachement au DOM */
    connectedCallback() {
      if (!this._booted) {
        this._booted = true;
        this._build();
      }
      document.addEventListener('fullscreenchange', this._onFs);
      this._syncTimer = setInterval(this._tickSync.bind(this), 30000);
      this._tickSync();
    }

    disconnectedCallback() {
      document.removeEventListener('fullscreenchange', this._onFs);
      clearInterval(this._syncTimer);
    }

    /* Accès rapide aux éléments du Shadow DOM */
    $(sel) { return this.shadowRoot.querySelector(sel); }
    $$(sel) { return Array.prototype.slice.call(this.shadowRoot.querySelectorAll(sel)); }

    /* Construction : feuille de style propre + gabarit + montage des graphiques */
    _build() {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'components/agri-nutriapp/agri-nutriapp.css';
      this.shadowRoot.appendChild(link);
      const wrap = document.createElement('div');
      wrap.innerHTML = window.AgriNutriTemplate.shell();
      this.shadowRoot.appendChild(wrap);
      this._fillCountrySelect();
      this._bindEvents();
      this._mountCharts();
      this.refresh();
    }

    /* Liste des pays (16) dans le sélecteur contextuel, triée alphabétiquement */
    _fillCountrySelect() {
      const sel = this.$('[data-country]');
      const list = window.AgriNutriModel.countries().slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });
      sel.innerHTML = list.map(function (c) { return '<option value="' + c.code + '">' + c.name + '</option>'; }).join('');
    }

    /* Événements : périmètre, pays, fil d'ariane, navigation, plein écran */
    _bindEvents() {
      const self = this;
      this.$('.scope').addEventListener('click', function (ev) {
        const b = ev.target.closest('[data-scope]');
        if (!b) return;
        if (b.dataset.scope === 'region') window.AgriNutriModel.setScope('region');
        else window.AgriNutriModel.setScope('country', window.AgriNutriModel.state.code || 'NE');
        self.refresh();
      });
      this.$('[data-country]').addEventListener('change', function (ev) {
        window.AgriNutriModel.setCountry(ev.target.value);
        self.refresh();
      });
      this.$('.crumbs').addEventListener('click', function (ev) {
        const b = ev.target.closest('[data-crumb]');
        if (!b) return;
        if (b.dataset.crumb === 'root' || b.dataset.crumb === 'scope') {
          window.AgriNutriModel.setScope('region');
          self._setModule(null);
          self.refresh();
        }
      });
      this.$('.nav').addEventListener('click', function (ev) {
        const b = ev.target.closest('[data-nav]');
        if (b) self._setModule(b.dataset.nav, true);
      });
      this.$('[data-clear]').addEventListener('click', function () { self._setModule(null); });
      this.$('[data-fullscreen]').addEventListener('click', function () { self._toggleFullscreen(); });
    }

    /* Affiche un module : cartes du module en évidence, autres atténuées, défilement vers la première */
    _setModule(id, scroll) {
      this._activeModule = id;
      this.$$('.chart-card').forEach(function (card) {
        card.classList.toggle('dim', !!id && card.dataset.module !== id);
        card.classList.toggle('hl', !!id && card.dataset.module === id);
      });
      this.$$('.nav-item').forEach(function (b) { b.classList.toggle('on', b.dataset.nav === id); });
      const crumb = this.$('[data-crumb="module"]');
      const sep = this.$('[data-crumb-sep]');
      const mod = window.AgriNutriTemplate.MODULES.find(function (m) { return m.id === id; });
      crumb.hidden = !mod;
      sep.hidden = !mod;
      crumb.textContent = mod ? mod.label : '';
      if (mod && scroll) {
        const first = this.$('.chart-card[data-module="' + id + '"]');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    /* Montage des graphiques Canvas (un par carte) et du scorecard */
    _mountCharts() {
      const A = window.AgriCharts;
      const self = this;
      Object.keys(CHART_KEYS).forEach(function (key) {
        const canvas = self.$('canvas[data-chart="' + key + '"]');
        const factory = A[CHART_KEYS[key]];
        if (canvas && factory) self._mounts[key] = factory(canvas);
      });
    }

    /* Rafraîchissement complet après changement de périmètre */
    refresh() {
      const M = window.AgriNutriModel;
      const scope = M.state.scope;
      const c = M.country();
      // Boutons de périmètre et sélecteur de pays
      this.$$('[data-scope]').forEach(function (b) {
        const on = b.dataset.scope === scope;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('on', on);
      });
      const pick = this.$('.country-pick');
      pick.hidden = !c;
      if (c) this.$('[data-country]').value = c.code;
      const btnCountry = this.$('[data-scope="country"]');
      btnCountry.textContent = c ? '🏳️ ' + c.name + ' ▾' : '🏳️ Vue Détaillée par Pays ▾';
      // Fil d'ariane
      this.$('.crumb-scope').textContent = c ? c.name : 'Vue Globale';
      this.$('[data-page-sub]').textContent = c
        ? c.name + ' · décomposition par ' + (c.regions.length) + ' régions / districts · NutriApp'
        : 'Ministère de l\'Agriculture · NutriApp · 16 pays d\'Afrique de l\'Ouest';
      // Graphiques
      Object.keys(this._mounts).forEach(function (key) {
        this._mounts[key].set(M[CHART_KEYS[key]]());
      }, this);
      // KPI (textes puis mini-visuels recréés)
      this._renderKpis();
      this._renderScorecard();
    }

    /* KPI : valeur, unité, badge de comparaison et mini-graphiques */
    _renderKpis() {
      const M = window.AgriNutriModel;
      const K = M.kpis();
      const S = M.kpiSeries();
      const self = this;
      const fmt = function (v, d) { return window.AgriCore.fmt(v, d == null ? 1 : d); };
      const values = {
        cereal: { v: fmt(K.cereal.value, 1), u: 'Mt' },
        price: { v: fmt(K.price.value, 0), u: 'FCFA/kg' },
        ss: { v: fmt(K.ss.value, 0), u: '%' },
        mnt: { v: fmt(K.mnt.value, 1), u: '%' },
        loss: { v: fmt(K.loss.value, 0), u: '%' }
      };
      Object.keys(values).forEach(function (k) {
        self.$('[data-kpi-value="' + k + '"]').textContent = values[k].v;
        self.$('[data-kpi-unit="' + k + '"]').textContent = ' ' + values[k].u;
        const badge = self.$('[data-kpi-badge="' + k + '"]');
        const b = K[k].badge;
        let cls;
        if (b.dir === 'good') cls = 'good';
        else if (b.dir === 'neutral') cls = 'neutral';
        else if (BAD_IF_UP[k]) cls = b.dir === 'up' ? 'bad' : 'good';
        else cls = b.dir === 'up' ? 'good' : 'bad';
        const arrow = b.dir === 'up' ? '↑ ' : b.dir === 'down' ? '↓ ' : b.dir === 'good' ? '✓ ' : '• ';
        badge.className = 'kpi-badge ' + cls;
        badge.textContent = arrow + b.text;
        if (K[k].target) {
          badge.title = 'Objectif : ' + K[k].target + ' %';
        }
      });
      // Mini-visuels : disposer les anciens puis recréer
      this._kpiCharts.forEach(function (c) { c.dispose(); });
      this._kpiCharts = [];
      const M2 = window.AgriKpiCharts;
      const mini = function (k) { return self.$('[data-kpi-mini="' + k + '"]'); };
      const canvas = function (k) {
        const host = mini(k);
        host.innerHTML = '';
        const cv = document.createElement('canvas');
        cv.setAttribute('aria-hidden', 'true');
        host.appendChild(cv);
        return cv;
      };
      const ssPct = K.ss.value;
      const lossPct = K.loss.value;
      this._kpiCharts.push(M2.cropMix(canvas('cereal'), S.cereal));
      this._kpiCharts.push(M2.priceLine(canvas('price'), S.price));
      this._kpiCharts.push(M2.ssGauge(canvas('ss'), ssPct));
      this._kpiCharts.push(M2.mntLine(canvas('mnt'), S.mnt));
      this._kpiCharts.push(M2.lossGauge(canvas('loss'), lossPct));
    }

    /* Scorecard : tableau et sparklines (recréés à chaque changement) */
    _renderScorecard() {
      const host = this.$('[data-slot="score"]');
      if (!host) return;
      this._scoreCharts = window.AgriCharts.renderScorecard(host, window.AgriNutriModel.scorecard(), this._scoreCharts);
    }

    /* Plein écran : API native sur l'élément hôte (mode immersif investisseur) */
    _toggleFullscreen() {
      if (document.fullscreenElement === this) {
        document.exitFullscreen && document.exitFullscreen();
        return;
      }
      if (this.requestFullscreen) {
        const p = this.requestFullscreen();
        if (p && p.catch) p.catch(function () { /* refus du navigateur : état inchangé */ });
      }
    }

    /* Mise à jour de l'interface après passage plein écran */
    _onFullscreenChange() {
      const on = document.fullscreenElement === this;
      this.classList.toggle('is-fs', on);
      const btn = this.$('[data-fullscreen]');
      btn.setAttribute('aria-pressed', String(on));
      btn.querySelector('span').textContent = on ? 'Quitter le plein écran' : 'Plein écran';
      // Les canvas se redimensionnent via ResizeObserver ; on force un rafraîchissement par sécurité
      window.setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
    }

    /* Horodatage du badge LIVE (mise à jour toutes les 30 s) */
    _tickSync() {
      const d = new Date();
      const t = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      const el = this.$('[data-sync]');
      if (el) el.textContent = 'à ' + t;
    }
  }

  if (!customElements.get('agri-nutriapp-dashboard')) {
    customElements.define('agri-nutriapp-dashboard', AgriNutriDashboard);
  }
})();
