/* ============================================================================
 * FAO AgriNutriApp · Custom Element et orchestration de la vue.
 * Les filtres recalculent les KPI et les 15 cartes ; les scripts de page hôte
 * restent indépendants grâce au Shadow DOM.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = global.FAONutriTracker;
  if (!FAO || !FAO.DATA || !FAO.model || !FAO.template || !FAO.CanvasChart) return;

  const CHART_IDS = Array.from({ length: 15 }, (_, index) => 'g' + (index + 1));
  const KPI_IDS = ['production', 'loss', 'hdds', 'fortification', 'biodiversity'];
  const KPI_LABELS = {
    production: 'Production céréalière estimée (App)',
    loss: 'Pertes post-récolte (suivi App)',
    hdds: 'Diversité alimentaire des ménages (HDDS)',
    fortification: 'Fortification des denrées de base',
    biodiversity: 'Espèces et variétés documentées par l’App'
  };

  class FAONutriTrackerDashboard extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      if (!this.root) {
        this.root = this.attachShadow({ mode: 'open' });
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = 'components/fao-nutritracker/fao-nutritracker.css';
        stylesheet.onload = () => this.refreshAll();
        this.root.appendChild(stylesheet);
        const template = document.createElement('template');
        template.innerHTML = FAO.template();
        this.root.appendChild(template.content.cloneNode(true));
      }
      this._booted = true;
      this.$ = (selector) => this.root.querySelector(selector);
      this.$$ = (selector) => Array.from(this.root.querySelectorAll(selector));
      this.state = this.state || { mode: 'region', country: 'NE', zone: null, year: '2024', granularity: 'annual', quarter: 3 };
      if (this.syncMinutes == null) this.syncMinutes = 6;
      this.populateCountries();
      this.initCharts();
      if (!this._eventsBound) {
        this.bindEvents();
        this._eventsBound = true;
      } else if (this._onResize) {
        global.addEventListener('resize', this._onResize, { passive: true });
      }
      this.observeReveals();
      this.scrollSpy();
      this.update();
      this.startClock();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.refreshAll());
    }

    disconnectedCallback() {
      if (this._clock) global.clearInterval(this._clock);
      if (this._toastTimer) global.clearTimeout(this._toastTimer);
      if (this._revealObserver) this._revealObserver.disconnect();
      if (this._scrollObserver) this._scrollObserver.disconnect();
      if (this._onResize) global.removeEventListener('resize', this._onResize);
      if (this.charts) Object.values(this.charts).forEach((chart) => chart.destroy());
      if (this.kpiCharts) Object.values(this.kpiCharts).forEach((chart) => chart.destroy());
      this._booted = false;
    }

    populateCountries() {
      const select = this.$('[data-country]');
      if (!select) return;
      select.replaceChildren();
      FAO.DATA.countries.forEach((country) => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        select.appendChild(option);
      });
      select.value = this.state.country;
    }

    initCharts() {
      this.charts = {};
      CHART_IDS.forEach((id) => {
        const host = this.$('[data-chart="' + id + '"]');
        const renderer = FAO.charts && FAO.charts[id];
        if (!host || typeof renderer !== 'function') return;
        this.charts[id] = FAO.createChart(host, id, renderer, this, { continuous: id === 'g4' });
      });
      this.kpiCharts = {};
      KPI_IDS.forEach((id) => {
        const host = this.$('[data-kpi-chart="' + id + '"]');
        const renderer = FAO.kpiCharts && FAO.kpiCharts[id];
        if (!host || typeof renderer !== 'function') return;
        this.kpiCharts[id] = FAO.createChart(host, 'kpi-' + id, renderer, this);
      });
    }

    bindEvents() {
      this.root.addEventListener('click', (event) => {
        const mode = event.target.closest('[data-mode]');
        const action = event.target.closest('[data-action]');
        const nav = event.target.closest('[data-nav]');
        const countryChip = event.target.closest('[data-country-chip]');
        const zoneChip = event.target.closest('[data-zone-chip]');
        const legend = event.target.closest('[data-legend-chart][data-legend]');
        if (mode) return this.setMode(mode.dataset.mode);
        if (nav) return this.navigate(nav.dataset.nav);
        if (countryChip) return this.selectCountry(countryChip.dataset.countryChip);
        if (zoneChip) return this.selectZone(zoneChip.dataset.zoneChip === '__all__' ? null : zoneChip.dataset.zoneChip);
        if (legend) return this.toggleSeries(legend.dataset.legendChart, legend.dataset.legend, legend);
        if (!action) return;
        switch (action.dataset.action) {
          case 'sync': this.forceSync(); break;
          case 'report': this.exportCSV(); break;
          case 'fullscreen': this.toggleFullscreen(); break;
          default: break;
        }
      });

      this.$('[data-country]').addEventListener('change', (event) => {
        this.state.mode = 'country';
        this.state.country = event.target.value;
        this.state.zone = null;
        this.update();
      });
      this.$('[data-year]').addEventListener('change', (event) => {
        this.state.year = event.target.value;
        this.update();
      });
      this.$('[data-quarter]').addEventListener('change', (event) => {
        this.state.quarter = Number(event.target.value) || 3;
        this.update();
      });
      this.$$('[data-granularity]').forEach((button) => button.addEventListener('click', () => {
        this.state.granularity = button.dataset.granularity === 'quarterly' ? 'quarterly' : 'annual';
        this.update();
      }));
      this._onResize = () => this.refreshAll();
      global.addEventListener('resize', this._onResize, { passive: true });
    }

    setMode(mode) {
      this.state.mode = mode === 'country' ? 'country' : 'region';
      this.state.zone = null;
      this.update();
      if (this.state.mode === 'country') {
        const select = this.$('[data-country]');
        if (select) select.focus({ preventScroll: true });
      }
    }

    selectCountry(code) {
      if (!FAO.DATA.byCode[code]) return;
      this.state.mode = 'country';
      this.state.country = code;
      this.state.zone = null;
      this.update();
      this.toast('Vue détaillée activée · ' + FAO.DATA.byCode[code].name);
    }

    selectZone(name) {
      this.state.zone = name || null;
      this.update();
      this.toast(name ? 'Focus de zone · ' + name : 'Toutes les zones du pays sont affichées');
    }

    toggleSeries(chartId, key, button) {
      const chart = this.charts[chartId];
      if (!chart) return;
      if (chart.hidden.has(key)) chart.hidden.delete(key); else chart.hidden.add(key);
      button.classList.toggle('is-off', chart.hidden.has(key));
      button.setAttribute('aria-pressed', String(!chart.hidden.has(key)));
      chart.refresh();
    }

    update() {
      this.view = FAO.model.build(this.state);
      this.renderControls();
      this.renderScope();
      this.renderChips();
      this.renderKpis();
      Object.values(this.charts || {}).forEach((chart) => chart.setData(this.view));
      Object.values(this.kpiCharts || {}).forEach((chart) => chart.setData(this.view));
      this.refreshAll();
    }

    renderControls() {
      this.$$('[data-mode]').forEach((button) => button.classList.toggle('is-active', button.dataset.mode === this.state.mode));
      const country = this.$('[data-country]');
      if (country) {
        country.disabled = this.state.mode !== 'country';
        country.value = this.state.country;
      }
      this.$('[data-year]').value = this.state.year;
      this.$('[data-quarter]').value = String(this.state.quarter);
      this.$$('[data-granularity]').forEach((button) => button.classList.toggle('is-active', button.dataset.granularity === this.state.granularity));
      this.$('.ft-quarter-filter').hidden = this.state.granularity !== 'quarterly';
      this.$('[data-scope-tag]').textContent = this.view.meta.regionLabel + ' · ' + this.view.meta.year + (this.state.granularity === 'quarterly' ? ' · T' + this.state.quarter : '');
      this.renderSync();
    }

    renderScope() {
      const meta = this.view.meta;
      const crumb = this.$('[data-crumb]');
      const title = this.$('[data-scope-title]');
      const copy = this.$('[data-scope-copy]');
      const heroCount = this.$('[data-hero-country-count]');
      const heroSample = this.$('[data-hero-sample]');
      if (crumb) crumb.textContent = meta.mode === 'country' ? 'Mode : ' + meta.regionLabel : 'Mode : Régional';
      if (title) title.textContent = meta.mode === 'country'
        ? 'Systèmes alimentaires · ' + meta.countryName
        : 'Surveillance des systèmes alimentaires';
      if (copy) copy.textContent = meta.mode === 'country'
        ? 'Vue détaillée par régions et districts, avec comparaison à la moyenne régionale et focus sur les remontées des agents de terrain.'
        : 'Une lecture intégrée des rendements, marchés, pertes après récolte et diversité alimentaire, à partir des remontées de terrain.';
      if (heroCount) heroCount.textContent = meta.mode === 'country' ? meta.countryName : '16 pays';
      if (heroSample) heroSample.textContent = FAO.model.format(meta.sampleCount, 0) + (meta.mode === 'country' ? ' ménages / exploitations suivis' : ' ménages / exploitations suivis');
      const zoneTitle = this.$('[data-zone-title]');
      const zoneCaption = this.$('[data-zone-caption]');
      const zoneCount = this.$('[data-zone-count]');
      if (zoneTitle) zoneTitle.textContent = meta.mode === 'country' ? 'Zones de ' + meta.countryName : 'Pays suivis';
      if (zoneCaption) zoneCaption.textContent = meta.mode === 'country'
        ? 'Sélectionnez une région / province pour concentrer les indicateurs et les graphiques.'
        : 'Choisissez un pays pour ouvrir la vue détaillée et ses districts.';
      if (zoneCount) zoneCount.textContent = meta.mode === 'country' ? this.view.districtRows.length + ' zones' : '16 pays';
    }

    renderChips() {
      const container = this.$('[data-zone-chips]');
      if (!container) return;
      container.replaceChildren();
      if (this.state.mode === 'region') {
        FAO.DATA.countries.forEach((country) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'ft-zone-chip' + (this.state.country === country.code && this.state.mode === 'country' ? ' is-active' : '');
          button.dataset.countryChip = country.code;
          button.textContent = country.name;
          button.title = 'Ouvrir la vue détaillée : ' + country.name;
          button.setAttribute('aria-pressed', 'false');
          container.appendChild(button);
        });
      } else {
        const all = document.createElement('button');
        all.type = 'button';
        all.className = 'ft-zone-chip' + (!this.state.zone ? ' is-active' : '');
        all.dataset.zoneChip = '__all__';
        all.textContent = 'Toutes les zones';
        all.setAttribute('aria-pressed', String(!this.state.zone));
        container.appendChild(all);
        this.view.districtRows.forEach((row) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'ft-zone-chip' + (this.state.zone === row.name ? ' is-active' : '');
          button.dataset.zoneChip = row.name;
          button.textContent = row.name;
          button.setAttribute('aria-pressed', String(this.state.zone === row.name));
          container.appendChild(button);
        });
      }
    }

    renderKpis() {
      this.view.kpis.items.forEach((item) => {
        const card = this.$('[data-kpi="' + item.id + '"]');
        if (!card) return;
        const value = card.querySelector('[data-value]');
        const sub = card.querySelector('[data-sub]');
        const badge = card.querySelector('[data-badge]');
        if (value) value.textContent = item.value;
        if (sub) sub.textContent = item.sub;
        if (badge) {
          badge.textContent = item.badge.label;
          badge.classList.toggle('is-negative', item.badge.positive === false);
          badge.classList.toggle('is-neutral', !!item.badge.neutral);
          badge.title = item.badge.label;
        }
        card.setAttribute('aria-label', KPI_LABELS[item.id] + ' : ' + item.value + '. ' + item.sub);
      });
    }

    renderSync() {
      const label = this.$('[data-sync-label]');
      if (!label || !this.view) return;
      const count = FAO.model.format(this.view.meta.sampleCount, 0);
      const age = this.syncMinutes === 0 ? 'à l’instant' : 'il y a ' + this.syncMinutes + ' min';
      label.textContent = 'Dernière synchro app : ' + age + ' · ' + count + ' exploitations / ménages suivis';
    }

    startClock() {
      this._clock = global.setInterval(() => {
        this.syncMinutes = Math.min(59, this.syncMinutes + 1);
        this.renderSync();
      }, 60000);
    }

    forceSync() {
      this.syncMinutes = 0;
      this.renderSync();
      this.toast('Synchronisation de démonstration effectuée · formulaires terrain à jour');
    }

    observeReveals() {
      const elements = this.$$('.ft-reveal');
      if (typeof global.IntersectionObserver !== 'function') {
        elements.forEach((element) => element.classList.add('is-visible'));
        return;
      }
      this._revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -35px 0px', threshold: .04 });
      elements.forEach((element) => this._revealObserver.observe(element));
    }

    scrollSpy() {
      if (typeof global.IntersectionObserver !== 'function') return;
      const sections = this.$$('.ft-section[id]');
      this._scrollObserver = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        this.$$('.ft-nav-item').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === visible.target.id));
      }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
      sections.forEach((section) => this._scrollObserver.observe(section));
    }

    navigate(sectionId) {
      const target = this.$('#' + sectionId);
      if (!target) return;
      this.$$('.ft-nav-item').forEach((button) => button.classList.toggle('is-active', button.dataset.nav === sectionId));
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    refreshAll() {
      if (this.charts) Object.values(this.charts).forEach((chart) => { chart.resize(); chart.refresh(); });
      if (this.kpiCharts) Object.values(this.kpiCharts).forEach((chart) => { chart.resize(); chart.refresh(); });
    }

    toast(message) {
      const element = this.$('[data-toast]');
      if (!element) return;
      element.textContent = message;
      element.classList.add('is-visible');
      global.clearTimeout(this._toastTimer);
      this._toastTimer = global.setTimeout(() => element.classList.remove('is-visible'), 2800);
    }

    toggleFullscreen() {
      if (document.fullscreenElement === this) {
        document.exitFullscreen().catch(() => {});
        return;
      }
      if (!this.requestFullscreen) { this.toast('Le plein écran n’est pas pris en charge par ce navigateur.'); return; }
      this.requestFullscreen().then(() => this.refreshAll()).catch(() => this.toast('Impossible d’ouvrir le plein écran.'));
    }

    exportCSV() {
      const view = this.view;
      const meta = view.meta;
      const rows = [
        ['FAO AgriNutriApp · Rapport agrégé de démonstration'],
        ['Périmètre', meta.regionLabel],
        ['Campagne', meta.year + (meta.granularity === 'quarterly' ? ' · T' + meta.quarter : ' · annuelle')],
        ['Source', 'Application Mobile Terrain FAO & relais communautaires'],
        ['Statut', 'Données simulées à des fins de démonstration — validation requise'],
        [],
        ['Indicateur', 'Valeur', 'Note']
      ];
      view.kpis.items.forEach((item) => rows.push([item.label, item.value, item.sub]));
      rows.push([], ['Zone', 'Production céréalière (Mt)', 'Besoins estimés (Mt)', 'Autosuffisance (%)', 'Pertes (%)', 'HDDS', 'Fortification (%)', 'Revenu annuel moyen (USD)']);
      view.rows.forEach((row) => rows.push([row.name, row.production.toFixed(2), row.needs.toFixed(2), (row.selfSufficiency * 100).toFixed(1), row.loss.toFixed(1), row.hdds.toFixed(1), row.fortification.toFixed(0), row.income]));
      const csv = '\uFEFF' + rows.map((row) => row.map((cell) => '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"').join(';')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'fao-agrinutriapp-' + meta.countryCode + '-' + meta.year + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      global.setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toast('Rapport agrégé CSV généré pour ' + meta.regionLabel);
    }
  }

  customElements.define('fao-nutritracker-dashboard', FAONutriTrackerDashboard);
})(window);
