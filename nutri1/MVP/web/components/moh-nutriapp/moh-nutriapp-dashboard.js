/* ============================================================================
 * NutriApp Santé · moh-nutriapp-dashboard.js
 * Web Component <moh-nutriapp-dashboard> (Custom Element + Shadow DOM).
 *
 *  - Encapsulation complète (Shadow DOM) pour ne pas perturber index.html.
 *  - Filtres dynamiques (mode régional/pays, pays, période, chips pays).
 *  - 5 KPI et 15 graphiques mis à jour instantanément à chaque changement.
 *  - Navigation latérale avec scrollspy, IntersectionObserver au scroll,
 *    animations en requestAnimationFrame, tooltips HTML.
 *
 * Dépendances (chargées avant) :
 *   moh-nutriapp-data.js · moh-nutriapp-chart-core.js
 *   charts/moh-charts-core.js · charts/moh-charts-operations.js
 *   charts/moh-charts-analytics.js
 *   moh-nutriapp-kpi-charts.js · moh-nutriapp-template.js
 *   moh-nutriapp-model.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = global.MOHNutriApp;
  if (!MOH || !MOH.model || !MOH.Chart || !MOH.template || !MOH.charts) {
    console.error('[MOH-NutriApp] dépendances manquantes'); return;
  }

  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, '') : 'components/moh-nutriapp/';

  const CHART_MAP = {
    g1: MOH.charts.g1, g2: MOH.charts.g2, g3: MOH.charts.g3,
    g4: MOH.charts.g4, g5: MOH.charts.g5, g6: MOH.charts.g6,
    g7: MOH.charts.g7, g8: MOH.charts.g8, g9: MOH.charts.g9,
    g10: MOH.charts.g10, g11: MOH.charts.g11, g12: MOH.charts.g12,
    g13: MOH.charts.g13, g14: MOH.charts.g14
    // g15 est rendu en HTML
  };

  class MOHNutriAppDashboard extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      const root = this.attachShadow({ mode: 'open' });
      this.root = root;

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = BASE + 'moh-nutriapp.css';
      link.onload = link.onerror = () => { this.classList.add('moh-ready'); this.refreshAll(); };
      root.appendChild(link);

      const tpl = document.createElement('template');
      tpl.innerHTML = MOH.template();
      root.appendChild(tpl.content);

      this.$ = (q) => root.querySelector(q);
      this.$$ = (q) => Array.from(root.querySelectorAll(q));

      // État initial
      this.state = { mode: 'region', country: 'NE', period: 'month' };
      this.syncMinutes = 4;
      this.syncFiches = 142800;

      // Prise de contrôle de la section #health
      this.section = this.closest('section');
      if (this.section) this.section.classList.add('moh-takeover');

      this.populateCountrySelect();
      this.populateCountryChips();
      this.bindEvents();
      this.initScorecard();
      this.update();
      this.observeCards();
      this.startClock();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.refreshAll());
      setTimeout(() => this.classList.add('moh-ready'), 1500);
    }

    disconnectedCallback() {
      clearInterval(this._clock);
    }

    /* ------------------------------------------------------------------ */
    /* Peuplement des listes                                               */
    /* ------------------------------------------------------------------ */
    populateCountrySelect() {
      const sel = this.$('[data-country]');
      sel.innerHTML = MOH.COUNTRIES.map(c =>
        '<option value="' + c.code + '"' + (c.code === this.state.country ? ' selected' : '') + '>' + c.name + '</option>'
      ).join('');
    }
    populateCountryChips() {
      const host = this.$('[data-country-chips]');
      const quick = ['NE', 'ML', 'BF', 'SN', 'NG', 'GH', 'CI'];
      host.innerHTML = quick.map(code => {
        const c = MOH.COUNTRIES.find(x => x.code === code);
        return '<button class="moh-chip' + (this.state.mode === 'country' && this.state.country === code ? ' active' : '') + '" data-chip="' + code + '">' + c.name + '</button>';
      }).join('');
    }

    /* ------------------------------------------------------------------ */
    /* Événements                                                          */
    /* ------------------------------------------------------------------ */
    bindEvents() {
      // Segmented mode
      this.$$('[data-mode-val]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.$$('[data-mode-val]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.mode = btn.dataset.modeVal;
          this.$('[data-country-group]').style.display = this.state.mode === 'country' ? 'flex' : 'none';
          this.$$('[data-chip]').forEach(c => c.classList.remove('active'));
          this.update();
        });
      });
      // Segmented period
      this.$$('[data-period-val]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.$$('[data-period-val]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.period = btn.dataset.periodVal;
          this.update();
        });
      });
      // Pays select
      this.$('[data-country]').addEventListener('change', (e) => {
        this.state.country = e.target.value;
        this.$$('[data-chip]').forEach(c => c.classList.toggle('active', c.dataset.chip === this.state.country));
        this.update();
      });
      // Chips pays
      this.$('[data-country-chips]').addEventListener('click', (e) => {
        const chip = e.target.closest('[data-chip]');
        if (!chip) return;
        // Bascule en mode pays si besoin
        this.state.mode = 'country';
        this.$$('[data-mode-val]').forEach(b => b.classList.toggle('active', b.dataset.modeVal === 'country'));
        this.$('[data-country-group]').style.display = 'flex';
        this.state.country = chip.dataset.chip;
        this.$('[data-country]').value = this.state.country;
        this.$$('[data-chip]').forEach(c => c.classList.toggle('active', c === chip));
        this.update();
      });
      // Navigation sidebar (scroll spy)
      this.$$('.moh-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          this.$$('.moh-nav-item').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const sec = this.$('#sec-' + btn.dataset.nav) || this.$('.moh-kpi-grid');
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      // Rapport
      this.$('[data-report]').addEventListener('click', () => {
        this.toast('📄 Rapport NutriApp généré (PDF) — ' + (this.state.mode === 'region' ? 'Vue régionale' : this.state.country));
      });
    }

    toast(msg) {
      let t = this._toast;
      if (!t) {
        t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#1E0A3C;color:#fff;padding:12px 20px;border-radius:12px;font:600 13px Inter, sans-serif;z-index:10000;box-shadow:0 10px 30px rgba(30,10,60,.25);opacity:0;transition:all .25s;pointer-events:none;';
        document.body.appendChild(t);
        this._toast = t;
      }
      t.textContent = msg;
      t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(20px)'; }, 2800);
    }

    /* ------------------------------------------------------------------ */
    /* Horloge synchro                                                     */
    /* ------------------------------------------------------------------ */
    startClock() {
      this._clock = setInterval(() => {
        this.syncMinutes = (this.syncMinutes % 59) + 1;
        const inc = Math.floor(Math.random() * 12);
        this.syncFiches += inc;
        const st = this.$('[data-synctext]');
        if (st) st.textContent = 'Synchro NutriApp : il y a ' + this.syncMinutes + ' min (' + MOH.fmtInt(this.syncFiches) + ' fiches saisies ce mois)';
      }, 45000);
    }

    /* ------------------------------------------------------------------ */
    /* Observation des cards pour animer les graphiques au scroll           */
    /* ------------------------------------------------------------------ */
    observeCards() {
      if (!('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const id = e.target.dataset.card;
            if (this.charts && this.charts[id] && !this.charts[id]._animatedIn) {
              this.charts[id]._animatedIn = true;
              this.charts[id].animateIn();
            }
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      this.$$('.moh-card[data-card]').forEach(c => io.observe(c));
    }

    /* ------------------------------------------------------------------ */
    /* Initialisation / rafraîchissement des graphiques                    */
    /* ------------------------------------------------------------------ */
    refreshAll() {
      if (this._chartsInit) return;
      this._chartsInit = true;
      this.charts = {};
      Object.keys(CHART_MAP).forEach(id => {
        const host = this.$('[data-chart="' + id + '"]');
        if (!host) return;
        const ch = new MOH.Chart(host, CHART_MAP[id]);
        ch._state = this._builtState;
        this.charts[id] = ch;
      });
      this.renderKpis(this._builtState);
    }

    update() {
      const s = MOH.model.build({ mode: this.state.mode, country: this.state.country, period: this.state.period });
      this._builtState = s;
      // Breadcrumb
      this.$('[data-breadcrumb]').textContent = s.breadcrumb;

      // KPI labels/values
      this.renderKpis(s);

      // Graphiques : déjà initialisés -> redessiner avec le nouveau state
      if (this.charts) {
        Object.keys(this.charts).forEach(id => {
          this.charts[id]._state = s;
          this.charts[id].visible = 1; // rejouer les animations
          this.charts[id]._animating = false;
          this.charts[id].animateIn();
        });
      }
      // Scorecard (G15)
      this.renderScorecard(s);
    }

    renderKpis(s) {
      const ids = ['k1', 'k2', 'k3', 'k4', 'k5'];
      ids.forEach((id, i) => {
        const el = this.$('.moh-kpi.' + id);
        if (!el) return;
        const k = s.kpis[id];
        const valEl = el.querySelector('[data-value]');
        const lblEl = el.querySelector('[data-label]');
        const subEl = el.querySelector('[data-sublabel]');
        const badgeEl = el.querySelector('[data-badge]');
        if (valEl) valEl.textContent = k.value;
        if (lblEl) {
          const labels = {
            k1: 'Admissions CRENAS (NutriApp)',
            k2: 'Taux de Guérison ' + (s.mode === 'region' ? 'Régional' : 'National'),
            k3: 'Alerte Rupture ATPE dans NutriApp',
            k4: 'Dépistage Malnutrition CPN (App)',
            k5: 'Complétude des Rapports NutriApp'
          };
          lblEl.textContent = labels[id];
        }
        if (subEl) subEl.textContent = k.subLabel;
        if (badgeEl) {
          badgeEl.textContent = k.badge.text;
          badgeEl.className = 'moh-badge ' + k.badge.kind;
        }
      });
      // Gauge KPI 2 et KPI 4, sparklines KPI1/KPI5 — rendre après premier paint
      requestAnimationFrame(() => {
        const gHost2 = this.$('[data-gauge="guer"]');
        const gHost4 = this.$('[data-gauge="cpn"]');
        if (gHost2 && gHost2.children.length === 0) {
          const c = document.createElement('canvas'); c.style.width='100%'; c.style.height='100%'; c.style.display='block'; gHost2.appendChild(c);
        }
        if (gHost4 && gHost4.children.length === 0) {
          const c = document.createElement('canvas'); c.style.width='100%'; c.style.height='100%'; c.style.display='block'; gHost4.appendChild(c);
        }
        if (gHost2 && gHost2.firstChild) MOH.kpiCharts.gauge(gHost2.firstChild, s.kpis.k2.gauge, s.kpis.k2.gaugeColor);
        if (gHost4 && gHost4.firstChild) MOH.kpiCharts.gauge(gHost4.firstChild, s.kpis.k4.gauge, s.kpis.k4.gaugeColor);

        const sparkAdm = this.$('[data-spark="adm"]');
        const sparkSync = this.$('[data-spark="sync"]');
        if (sparkAdm && sparkAdm.children.length === 0) {
          const c = document.createElement('canvas'); c.style.width='100%'; c.style.height='100%'; c.style.display='block'; sparkAdm.appendChild(c);
        }
        if (sparkSync && sparkSync.children.length === 0) {
          const c = document.createElement('canvas'); c.style.width='100%'; c.style.height='100%'; c.style.display='block'; sparkSync.appendChild(c);
        }
        if (sparkAdm && sparkAdm.firstChild) MOH.kpiCharts.sparkAdm(sparkAdm.firstChild);
        if (sparkSync && sparkSync.firstChild) MOH.kpiCharts.sparkSync(sparkSync.firstChild);
      });
    }

    /* ------------------------------------------------------------------ */
    /* Scorecard HTML (G15)                                                */
    /* ------------------------------------------------------------------ */
    initScorecard() {
      const card = this.$('#card-g15');
      if (!card) return;
      this._scoreHost = document.createElement('div');
      this._scoreHost.style.flex = '1';
      this._scoreHost.style.overflow = 'auto';
      const chart = card.querySelector('.moh-chart');
      if (chart) chart.remove();
      card.appendChild(this._scoreHost);
    }
    renderScorecard(s) {
      if (!this._scoreHost) return;
      const zones = s.mode === 'region' ? MOH.ZONES_SCORECARD :
        MOH.ZONES_SCORECARD.slice(0, 8).map((z, i) => ({ ...z, zone: (s.districts && s.districts[i]) ? s.districts[i].name : z.zone }));
      const rows = zones.map(z => {
        const stCls = z.status === 'ok' ? 'ok' : z.status === 'warn' ? 'warn' : 'crit';
        const stLabel = z.status === 'ok' ? '✓ Conforme' : z.status === 'warn' ? '⚠ À surveiller' : '🚨 Critique';
        return '<tr>' +
          '<td><b>' + MOH.escape(z.zone) + '</b></td>' +
          '<td>' + MOH.fmtInt(z.adm) + '</td>' +
          '<td>' + (z.guer * 100).toFixed(1) + '%</td>' +
          '<td>' + z.rupture + '</td>' +
          '<td>' + Math.round(z.sync * 100) + '%</td>' +
          '<td><canvas class="sparkcell" width="80" height="28"></canvas></td>' +
          '<td><span class="moh-status ' + stCls + '">' + stLabel + '</span></td>' +
          '</tr>';
      }).join('');
      this._scoreHost.innerHTML = '<table class="moh-table">' +
        '<thead><tr><th>Zone</th><th>Admissions</th><th>Guérison</th><th>Ruptures</th><th>Synchro</th><th>Tendance</th><th>Statut</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>';
      requestAnimationFrame(() => {
        const cnv = this._scoreHost.querySelectorAll('canvas.sparkcell');
        const colors = ['#7C3AED','#10B981','#EF4444','#06B6D4','#F59E0B','#7C3AED','#10B981','#EF4444','#06B6D4','#F59E0B'];
        cnv.forEach((c, i) => MOH.drawSparkline(c, colors[i % colors.length]));
      });
    }
  }

  customElements.define('moh-nutriapp-dashboard', MOHNutriAppDashboard);
})(window);
