/* ============================================================================
 * WFP NutriTracker · wfp-dashboard.js
 * Web Component <wfp-dashboard> (Custom Element + Shadow DOM).
 *
 *  - Monte le gabarit (wfp-template.js), charge la feuille wfp-dashboard.css
 *    et instancie les 15 graphiques Canvas (charts/*.js) ;
 *  - Gere l'etat des filtres : Vue Globale <-> Vue Pays, zones (chips),
 *    pays (liste + chips), periode (mensuel / trimestriel) ;
 *  - Recalcule la vue (wfp-model.js) et met a jour les 5 KPI (compteurs animes)
 *    et les 15 graphiques (animation d'entree 800 ms, rAF) ;
 *  - IntersectionObserver : une animation ne se lance qu'a l'arrivee a l'ecran ;
 *  - Navigation latérale (scrollspy), export CSV du rapport.
 *
 * Dependances (chargees avant ce fichier, voir index.html) :
 *   wfp-core.js · wfp-data.js · wfp-geo.js · wfp-model.js · charts/*.js · wfp-template.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP;
  if (!WFP || !WFP.model || !WFP.template || !WFP.BaseChart) {
    console.error('[WFP] dependances manquantes : verifier l\'ordre des <script> dans index.html');
    return;
  }
  const D = WFP.data, C = WFP.C;

  // Cartes graphiques (data-chart du gabarit) -> cle du modele de vue
  const CHART_VIEW = {
    ipc: 'ipc', fcs: 'fcsLines', heat: 'heat', radar: 'radar', scatter: 'scatter', funnel: 'funnel',
    rose: 'rose', map: 'map', cereals: 'cereals', dual: 'dual', hdds: 'hdds', dumbbell: 'dumbbell',
    calendar: 'calendar', waterfall: 'waterfall', bullets: 'bullets'
  };
  // Cibles de la navigation laterale (ordre de la sidebar)
  const NAV_TARGET = {
    top: '.wfp-kpis', secalim: '#card-ipc', marches: '#card-heat',
    ops: '#card-funnel', ipc: '#card-radar', alertes: '#card-rose'
  };
  const PHASE_LABEL = i => D.PHASES[i - 1] ? D.PHASES[i - 1].id + ' · ' + D.PHASES[i - 1].label : '—';

  class WfpDashboard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.state = { mode: 'region', country: 'NE', zone: 'all', period: 'M' };
      this.charts = {};
      this.prev = {};          // valeurs KPI precedentes (pour l'animation de compteur)
      this.minutes = D.REGION.syncMinutes;
    }

    /* ------------------------------------------------------------------
     * Cycle de vie
     * ---------------------------------------------------------------- */
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      const root = this.shadowRoot;
      root.innerHTML = '<link rel="stylesheet" href="' + WFP.base + 'wfp-dashboard.css">' + WFP.template.html();
      this.$ = id => root.getElementById(id);
      this.buildFilters();
      this.mountCharts();
      this.bindUI();
      this.renderAll();
      this.observeVisibility();
      this.startSync();
    }

    disconnectedCallback() {
      clearInterval(this._syncTimer);
      if (this._io) this._io.disconnect();
      if (this._roKpi) this._roKpi.disconnect();
    }

    /* ------------------------------------------------------------------
     * Construction de l'interface
     * ---------------------------------------------------------------- */
    buildFilters() {
      const sel = this.$('countrySel');
      sel.innerHTML = D.COUNTRIES.map(c => '<option value="' + c.code + '">' + c.name + '</option>').join('');
      sel.value = this.state.country;
      const chips = this.$('countryChips');
      chips.innerHTML = D.COUNTRIES.map(c =>
        '<button type="button" class="chip" data-country="' + c.code + '">' + c.name + '</button>').join('');
    }

    mountCharts() {
      this.shadowRoot.querySelectorAll('.wfp-card[data-chart]').forEach(card => {
        const key = card.dataset.chart;
        const Cls = WFP.charts[key];
        if (Cls) this.charts[key] = new Cls(card);
      });
    }

    bindUI() {
      const root = this.shadowRoot;
      // Mode : Vue Globale / Pays
      root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        this.state.mode = b.dataset.mode;
        this.renderAll();
      }));
      // Pays (liste deroulante et chips)
      this.$('countrySel').addEventListener('change', e => {
        this.state.country = e.target.value; this.state.mode = 'country'; this.renderAll();
      });
      this.$('countryChips').addEventListener('click', e => {
        const b = e.target.closest('[data-country]');
        if (!b) return;
        this.state.country = b.dataset.country; this.state.mode = 'country'; this.renderAll();
      });
      // Zones (chips) : ne s'appliquent qu'a la Vue Globale
      this.$('zoneChips').addEventListener('click', e => {
        const b = e.target.closest('[data-zone]');
        if (!b || this.state.mode === 'country') return;
        this.state.zone = b.dataset.zone; this.renderAll();
      });
      // Periode
      root.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => {
        this.state.period = b.dataset.period; this.renderAll();
      }));
      // Rapport
      this.$('btnReport').addEventListener('click', () => this.exportReport());
      // Navigation laterale
      root.querySelectorAll('.wfp-nav-btn').forEach(b => b.addEventListener('click', () => this.scrollToNav(b.dataset.target)));
      // Scrollspy (suivi de la section visible)
      this._spy = false;
      global.addEventListener('scroll', () => this.onScroll(), { passive: true });
      // Sparks KPI : redessines quand le conteneur change de taille
      if (global.ResizeObserver) {
        this._roKpi = new ResizeObserver(() => this.drawSparks());
        this._roKpi.observe(root.querySelector('.wfp-kpis'));
      }
    }

    /* ------------------------------------------------------------------
     * Rendu complet a partir de l'etat courant
     * ---------------------------------------------------------------- */
    renderAll() {
      const st = this.state;
      const view = this.view = WFP.model.build(st);
      const isCountry = st.mode === 'country';

      // Boutons de mode, de periode et de zone
      this.shadowRoot.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === st.mode));
      this.shadowRoot.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('on', b.dataset.period === st.period));
      this.shadowRoot.querySelectorAll('[data-zone]').forEach(b => {
        b.classList.toggle('on', b.dataset.zone === st.zone);
        b.disabled = isCountry;
      });
      this.$('countryWrap').hidden = !isCountry;
      this.$('countryChipsRow').hidden = !isCountry;
      this.$('countrySel').value = st.country;
      this.shadowRoot.querySelectorAll('[data-country]').forEach(b => b.classList.toggle('on', isCountry && b.dataset.country === st.country));

      // Fil d'Ariane dynamique : Mode : Regional OU Nom du pays
      const modeLabel = isCountry ? D.countryByCode[st.country].name : 'Régional';
      this.$('wfpCrumbs').innerHTML = 'PAM / WFP NutriTracker / Mode : <b>' + modeLabel + '</b>';

      this.updateKpis(view);
      // Donnees des graphiques (animation rejouee si visibles)
      Object.keys(this.charts).forEach(key => {
        const vKey = CHART_VIEW[key];
        if (vKey && view.charts[vKey] !== undefined) this.charts[key].setData(view.charts[vKey]);
      });
    }

    /* ------------------------------------------------------------------
     * KPI (5 cartes dynamiques)
     * ---------------------------------------------------------------- */
    updateKpis(view) {
      const k = view.kpi, st = this.state, isCountry = st.mode === 'country';
      const isAll = !isCountry && st.zone === 'all';
      const $ = id => this.$(id);

      // KPI 1 : insecurite alimentaire
      const insecVal = k.insec.value;
      this.countTo('kpi-insec-val', insecVal, v => v.toFixed(1) + 'M', 'insec');
      this.setBadge('kpi-insec-badge', k.insec.badge, k.insec.badgeKind);

      // KPI 2 : FCS (gauge horizontale, curseur sur la valeur)
      const fcs = k.fcs.value;
      this.countTo('kpi-fcs-val', fcs, v => v.toFixed(1), 'fcs');
      this.setBadge('kpi-fcs-badge', k.fcs.badge, (isCountry && fcs < k.fcs.regional) ? 'up' : 'info');
      $('kpi-fcs-cursor').style.left = WFP.clamp(fcs / 70 * 100, 0, 100) + '%';

      // KPI 3 : pays / districts en crise IPC 3+
      const z = k.zones;
      this.setText('kpi-zones-val', z.value + ' ' + z.unit);
      this.setBadge('kpi-zones-badge', 'Alertes terrain actives', 'up');
      $('kpi-zones-tiles').innerHTML = z.tiles.map(t => {
        const ph = D.PHASES[t.ipc - 1];
        return '<span class="tile" title="' + t.name + ' · ' + PHASE_LABEL(t.ipc) + '" style="background:' + ph.color + '">' + (t.name.length > 4 ? t.name.slice(0, 3) : t.name) + '</span>';
      }).join('');

      // KPI 4 : beneficiaires atteints (barre vers la cible)
      const benef = k.benef.value, target = k.benef.target;
      const pct = Math.round(benef / target * 100);
      this.countTo('kpi-benef-val', benef, v => v.toFixed(1) + 'M', 'benef');
      this.setBadge('kpi-benef-badge', pct + '% d\'exécution', 'down');
      $('kpi-benef-bar').style.width = WFP.clamp(pct, 0, 100) + '%';
      this.setText('kpi-benef-lbl', 'Cible PAM : ' + target.toFixed(1) + 'M (' + pct + '% d\'exécution)');

      // KPI 5 : index prix
      const px = k.price.value;
      this.countTo('kpi-price-val', px, v => v.toFixed(1), 'price');
      const trend = isAll ? D.REGION.priceTrend : Math.round(px - 100);
      this.setBadge('kpi-price-badge', '↑ +' + trend + '% vs normale saisonnière', 'up');
      this._sparkPrice = k.price.spark;
      this._sparkInsec = k.insec.spark;
      this.drawSparks();
    }

    countTo(id, to, fmt, key) {
      const el = this.$(id);
      const from = this.prev[key] === undefined ? to : this.prev[key];
      this.prev[key] = to;
      WFP.countUp(el, to, { from, fmt, dur: 800 });
    }

    setText(id, txt) { const el = this.$(id); if (el) el.textContent = txt; }

    setBadge(id, txt, kind) {
      const el = this.$(id);
      if (!el) return;
      el.textContent = txt;
      el.className = 'kpi-badge' + (kind && kind !== 'amber' ? ' ' + kind : '');
    }

    // Mini graphiques KPI 1 et KPI 5 (Canvas, HiDPI)
    drawSparks() {
      this.spark(this.$('kpi-insec-spark'), this._sparkInsec, '#F59E0B');
      this.spark(this.$('kpi-price-spark'), this._sparkPrice, '#EF4444');
    }

    spark(canvas, values, color) {
      if (!canvas || !values) return;
      const w = canvas.clientWidth, h = canvas.clientHeight || 40;
      if (!w) return;
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const mn = Math.min(...values), mx = Math.max(...values);
      const pts = values.map((v, i) => [i / (values.length - 1) * (w - 4) + 2, h - 4 - (v - mn) / (mx - mn || 1) * (h - 10)]);
      ctx.beginPath(); WFP.G.smooth(ctx, pts, 0.5);
      ctx.lineTo(w - 2, h); ctx.lineTo(2, h); ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, WFP.hexA(color, 0.28)); g.addColorStop(1, WFP.hexA(color, 0));
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); WFP.G.smooth(ctx, pts, 0.5);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      const last = pts[pts.length - 1];
      ctx.beginPath(); ctx.arc(last[0], last[1], 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    }

    /* ------------------------------------------------------------------
     * Visibilite : animation seulement quand le graphique entre dans l'ecran
     * ---------------------------------------------------------------- */
    observeVisibility() {
      if (!global.IntersectionObserver) {
        Object.values(this.charts).forEach(c => c.show());
        return;
      }
      this._io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const chart = Object.values(this.charts).find(c => c.card === en.target);
          if (chart) chart.show();
          this._io.unobserve(en.target);
        });
      }, { threshold: 0.12 });
      this.shadowRoot.querySelectorAll('.wfp-card[data-chart]').forEach(card => this._io.observe(card));
    }

    /* ------------------------------------------------------------------
     * Navigation : defilement doux et scrollspy
     * ---------------------------------------------------------------- */
    headerOffset() {
      const head = this.$('wfpHead');
      return (head ? head.offsetHeight : 160) + 12;
    }

    scrollToNav(target) {
      const el = this.shadowRoot.querySelector(NAV_TARGET[target]);
      if (!el) return;
      const top = el.getBoundingClientRect().top + global.scrollY - this.headerOffset();
      global.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    onScroll() {
      if (this._spy) return;
      this._spy = true;
      global.requestAnimationFrame(() => {
        this._spy = false;
        const off = this.headerOffset() + 40;
        let active = 'top';
        Object.keys(NAV_TARGET).forEach(key => {
          const el = this.shadowRoot.querySelector(NAV_TARGET[key]);
          if (el && el.getBoundingClientRect().top <= off) active = key;
        });
        this.shadowRoot.querySelectorAll('.wfp-nav-btn').forEach(b => b.classList.toggle('on', b.dataset.target === active));
      });
    }

    /* ------------------------------------------------------------------
     * Synchronisation affichee (badge) : minute mise a jour chaque minute
     * ---------------------------------------------------------------- */
    startSync() {
      const paint = () => {
        this.setText('syncText', 'Synchro App : il y a ' + this.minutes + ' min (' +
          WFP.fmt.num(D.REGION.householdsMonth, 0) + ' ménages enquêtés ce mois)');
      };
      paint();
      this._syncTimer = setInterval(() => { this.minutes += 1; paint(); }, 60000);
    }

    /* ------------------------------------------------------------------
     * Rapport : export CSV du perimetre courant (KPI + tableaux des graphiques)
     * ---------------------------------------------------------------- */
    exportReport() {
      const v = this.view, st = this.state, k = v.kpi, ch = v.charts;
      const isCountry = st.mode === 'country';
      const scope = isCountry ? D.countryByCode[st.country].name : (st.zone === 'all' ? 'Afrique de l\'Ouest' : D.ZONES[st.zone].label);
      const q = s => '"' + String(s).replace(/"/g, '""') + '"';
      const rows = [];
      const today = new Date().toISOString().slice(0, 10);
      rows.push(['WFP NutriTracker · Rapport de surveillance nutritionnelle et sécurité alimentaire']);
      rows.push(['Périmètre', scope], ['Période', st.period === 'M' ? 'Mensuel' : 'Trimestriel'], ['Date d\'export', today], []);
      rows.push(['INDICATEURS CLÉS']);
      rows.push(['Indicateur', 'Valeur', 'Commentaire']);
      rows.push(['Insécurité alimentaire (M)', k.insec.value, k.insec.badge]);
      rows.push(['FCS moyen', k.fcs.value, k.fcs.badge]);
      rows.push(['Zones en IPC 3+', k.zones.value, k.zones.unit]);
      rows.push(['Bénéficiaires (M)', k.benef.value, 'Cible ' + k.benef.target + ' M']);
      rows.push(['Index prix céréales', k.price.value, 'Base 100 (2020)']);
      rows.push([]);
      rows.push(['PHASES IPC (% population)']);
      rows.push(['Entité', 'Zone', ...D.PHASES.map(p => p.id), 'Personnes dépistées (k)']);
      ch.ipc.labels.forEach((l, i) => rows.push([ch.ipc.names[i], ch.ipc.zones[i], ...ch.ipc.phases[i], ch.ipc.screened[i]]));
      rows.push([]);
      rows.push(['SCORE FCS (série mensuelle ou trimestrielle)']);
      rows.push(['Période', ...ch.fcsLines.series.map(s => s.label)]);
      ch.fcsLines.labels.forEach((l, i) => rows.push([l, ...ch.fcsLines.series.map(s => s.values[i])]));
      rows.push([]);
      rows.push(['PERFORMANCE TERRAIN (bullet charts)']);
      rows.push(['Indicateur', 'Mesure', 'Objectif PAM', 'Unité']);
      ch.bullets.forEach(b => rows.push([b.label, b.value, b.target, b.unit || '']));
      rows.push([]);
      rows.push(['FINANCEMENT (Mds USD)']);
      ch.waterfall.steps.forEach(s => rows.push([s.label, s.value]));

      const csv = '\uFEFF' + rows.map(r => r.map(c => (typeof c === 'number' ? String(c).replace('.', ',') : q(c === undefined ? '' : c))).join(';')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wfp-nutritracker-' + scope.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + today + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toast('Rapport généré : ' + a.download);
    }

    toast(msg) {
      const t = this.$('wfpToast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('on');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove('on'), 2600);
    }
  }

  if (!customElements.get('wfp-dashboard')) customElements.define('wfp-dashboard', WfpDashboard);
})(window);
