/* ============================================================================
 * NutriApp Santé · health-nutriapp-dashboard.js
 * Rôle : Web Component <health-nutriapp-dashboard> (Custom Element + Shadow DOM).
 *
 *  - Encapsulation : le Shadow DOM isole styles et DOM du tableau de bord.
 *  - État des filtres : mode (Vue Globale / Pays), pays, zone, période.
 *    Chaque changement reconstruit la « vue » (NH.build) puis réanime les
 *    5 KPI et les 15 graphiques avec une transition fluide (rAF, 60 fps).
 *  - Navigation latérale (scroll doux + scrollspy), en-tête fixe, fil d'Ariane.
 *  - Légendes cliquables (séries on/off), tooltips, drill-down (clic sur un
 *    pays de la heatmap), scorecard triable, export CSV, rapport imprimable.
 *
 *  Dépendances (chargées avant ce fichier, voir index.html) :
 *    health-nutriapp-data.js · health-nutriapp-model.js ·
 *    health-nutriapp-chart-core.js · charts/*.js · health-nutriapp-kpi-charts.js ·
 *    health-nutriapp-template.js
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;
  if (!NH || !NH.build || !NH.Chart || !NH.template || !NH.charts.g1) {
    console.error('[NutriHealth] dépendances manquantes : vérifier l’ordre des <script> dans index.html');
    return;
  }
  const T = NH.THEME;
  const SCRIPT = document.currentScript;
  const BASE = SCRIPT && SCRIPT.src ? SCRIPT.src.replace(/[^/]*$/, '') : 'components/health-nutriapp/';

  /* Association carte → fonction de dessin (les cartes sans canvas sont exclues) */
  const CHART_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'g13', 'g14'];
  const KPI_IDS = [1, 2, 3, 4, 5];

  /* Durée d'animation (ms) et compteur des KPI */
  const DUR = 800;

  class NutriHealthDashboard extends HTMLElement {
    /* =====================================================================
     * Initialisation
     * =================================================================== */
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;

      /* État des filtres par défaut : vue globale, période mensuelle */
      this.state = { mode: 'region', code: 'NE', zone: 'all', period: 'M' };
      this.charts = {};
      this.kpiCharts = {};
      this.prev = {};
      this.sort = { key: 'score', dir: -1 };

      const root = this.attachShadow({ mode: 'open' });
      this.root = root;

      /* Feuille de style encapsulée dans le Shadow DOM */
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = BASE + 'health-nutriapp.css';
      link.onload = link.onerror = () => { this.classList.add('hn-ready'); this.refresh(); };
      root.appendChild(link);

      const tpl = document.createElement('template');
      tpl.innerHTML = NH.template();
      root.appendChild(tpl.content);

      /* Prise de contrôle de la section #health : les modules historiques
       * restent dans le DOM (scripts globaux) mais sont masqués. */
      const section = this.closest('section');
      if (section) section.classList.add('hn-takeover');

      this.app = root.querySelector('.hn-app');
      this._buildCharts();
      this._buildLegends();
      this._populateCountries();
      this._wire();
      this._scrollspy();
      requestAnimationFrame(() => this.refresh());
    }

    /* =====================================================================
     * Création des instances de graphiques (moteur NH.Chart)
     * =================================================================== */
    _buildCharts() {
      const self = this;
      CHART_IDS.forEach((id) => {
        const host = this.root.querySelector('[data-chart="' + id + '"]');
        if (!host) return;
        this.charts[id] = new NH.Chart(host, {
          label: id,
          draw: NH.charts[id],
          legend: NH.LEGENDS[id] || null,
          duration: DUR,
          onClick: id === 'g4' ? (hit) => { if (hit && hit.drill) self.setState({ mode: 'country', code: hit.drill }); } : null
        });
      });
      KPI_IDS.forEach((i) => {
        const host = this.root.querySelector('[data-kpi-chart="' + i + '"]');
        if (!host) return;
        this.kpiCharts[i] = new NH.Chart(host, { label: 'kpi' + i, draw: NH.charts['kpi' + i], duration: DUR });
      });
    }

    /* Légendes HTML cliquables : chaque bouton bascule la série du graphique */
    _buildLegends() {
      this.root.querySelectorAll('[data-legend]').forEach((box) => {
        const id = box.getAttribute('data-legend');
        const items = NH.LEGENDS[id] || [];
        box.innerHTML = items.map((s) =>
          '<button type="button" class="hn-leg" data-leg="' + id + '" data-key="' + s.key + '">' +
          '<i style="background:' + s.color + '"></i>' + NH.esc(s.label) + '</button>').join('');
      });
    }

    /* Liste déroulante des pays (ordre de la spécification) */
    _populateCountries() {
      const sel = this.root.getElementById('hnCountry');
      sel.innerHTML = NH.COUNTRIES.map((c) => '<option value="' + c.code + '">' + NH.esc(c.name) + '</option>').join('');
    }

    /* =====================================================================
     * Événements (délégation sur la racine du Shadow DOM)
     * =================================================================== */
    _wire() {
      const root = this.root;
      root.addEventListener('click', (e) => {
        const t = e.target.closest('button, .hn-th');
        if (!t) return;
        if (t.hasAttribute('data-mode')) return this.setState({ mode: t.dataset.mode });
        if (t.hasAttribute('data-period')) return this.setState({ period: t.dataset.period });
        if (t.hasAttribute('data-zone')) return this.setState({ zone: t.dataset.zone, mode: 'region' });
        if (t.hasAttribute('data-country')) return this.setState({ mode: 'country', code: t.dataset.country });
        if (t.hasAttribute('data-nav')) return this._goto(t.dataset.nav, t);
        if (t.hasAttribute('data-leg')) return this._toggleLegend(t);
        if (t.dataset.act === 'report') return this.report();
        if (t.dataset.act === 'csv') return this.exportCSV();
        if (t.classList.contains('hn-th')) return this._sortBy(t.dataset.key);
      });
      root.querySelector('#hnCountry').addEventListener('change', (e) => this.setState({ mode: 'country', code: e.target.value }));
    }

    /* Bascule d'une série depuis la légende (animation de re-tracé) */
    _toggleLegend(btn) {
      const id = btn.dataset.leg;
      const ch = this.charts[id];
      if (!ch) return;
      ch.toggle(btn.dataset.key);
      btn.classList.toggle('off', !ch.on(btn.dataset.key));
    }

    /* Mise à jour de l'état puis rafraîchissement complet */
    setState(patch) {
      Object.assign(this.state, patch);
      this.refresh();
    }

    /* Navigation latérale : défilement doux vers la section */
    _goto(id, btn) {
      const sec = this.root.getElementById('hn-' + id);
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.root.querySelectorAll('.hn-nav-item').forEach((b) => b.classList.toggle('on', b === btn));
    }

    /* Scrollspy : met en surbrillance la section visible dans la sidebar */
    _scrollspy() {
      if (!global.IntersectionObserver) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const id = en.target.dataset.section;
          this.root.querySelectorAll('.hn-nav-item').forEach((b) => b.classList.toggle('on', b.dataset.nav === id));
        });
      }, { rootMargin: '-35% 0px -55% 0px' });
      this.root.querySelectorAll('.hn-section').forEach((s) => io.observe(s));
    }

    /* =====================================================================
     * Rafraîchissement : vue → graphiques → KPI → en-tête → scorecard
     * =================================================================== */
    refresh() {
      if (!this.root) return;
      const view = NH.build(this.state);
      this.view = view;
      Object.keys(this.charts).forEach((k) => this.charts[k].setView(view));
      Object.keys(this.kpiCharts).forEach((k) => this.kpiCharts[k].setView(view));
      this._updateChrome(view);
      this._updateKpis(view);
      this._renderScorecard(view);
    }

    /* En-tête : fil d'Ariane, boutons de mode/période/zone, sélecteur pays */
    _updateChrome(view) {
      const r = this.root;
      const isCountry = view.mode === 'country';
      const modeTxt = isCountry ? view.label : 'Régional';
      r.querySelector('#hnCrumbs').innerHTML =
        '<span>Ministère de la Santé</span><i>/</i><span>NutriApp</span><i>/</i>' +
        '<b>Mode : ' + NH.esc(modeTxt) + (!isCountry && view.zone.id !== 'all' ? ' · ' + NH.esc(view.zone.label) : '') + '</b>';
      r.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === view.mode));
      r.querySelectorAll('[data-period]').forEach((b) => b.classList.toggle('on', b.dataset.period === view.period));
      r.querySelector('#hnCountryWrap').classList.toggle('show', isCountry);
      r.querySelector('#hnCountry').value = isCountry ? view.code : this.state.code;
      r.querySelectorAll('[data-zone]').forEach((b) => {
        b.classList.toggle('on', !isCountry && b.dataset.zone === view.zone.id);
        b.classList.toggle('dis', isCountry);
      });
      r.querySelectorAll('[data-country]').forEach((b) => b.classList.toggle('on', isCountry && b.dataset.country === view.code));
      r.querySelectorAll('.hn-leg').forEach((b) => {
        const ch = this.charts[b.dataset.leg];
        b.classList.toggle('off', !!ch && !ch.on(b.dataset.key));
      });
      const legendTitle = r.querySelector('[data-card="g4"] .hn-card-h p');
      if (legendTitle) legendTitle.textContent = isCountry ? 'Districts de ' + view.label + ' · 8 indicateurs' : 'Pays de la région · cliquer une ligne pour zoomer';
      const g2 = r.querySelector('[data-card="g2"] .hn-card-h p');
      if (g2) g2.textContent = isCountry ? 'Districts de ' + view.label + ' · taille = volume' : 'Guérison × abandon · taille = volume d\u2019admissions';
    }

    /* KPI : valeurs animées (compteur 800 ms) + badges comparatifs */
    _updateKpis(view) {
      const r = this.root;
      const k = view.kpi;
      const isC = view.mode === 'country';
      const cmpTxt = isC ? ' · ' : '';
      const arrow = (v) => (v >= 0 ? '↑ +' : '↓ ') + NH.fmt(Math.abs(v), 1);

      /* KPI 1 — admissions (annuel 2024, périmètre courant) */
      this._count('k1', k.adm, (v) => NH.fmt(v, 0));
      r.querySelector('[data-kpi="1"] .hn-kpi-sub').textContent =
        isC ? 'Enfants dépistés & pris en charge · ' + view.label : 'Enfants dépistés & pris en charge via l\u2019application';
      const b1 = isC && k.admPctVsRegion != null
        ? arrow(k.admPctVsRegion) + '% vs moyenne régionale'
        : arrow(k.admGrowth) + '% vs 2023 · Pic soudure : +' + NH.fmt(k.peakPct, 0) + '% (' + k.peakMonth + ')';
      this._badge(1, b1, k.admGrowth >= 0 ? 'warn' : 'ok');

      /* KPI 2 — guérison (jauge, seuil Sphère 75 %) */
      this._count('k2', k.guer, (v) => NH.fmt(v, 1) + ' %');
      const conform = k.guer >= NH.SPHERE.guerison;
      const dlt = isC ? ' · ' + arrow(k.guerDelta) + ' pts vs région' : '';
      this._badge(2, (conform ? '✓ Conforme Norme Sphère' : '⚠ Sous le seuil Sphère') + dlt, conform ? 'ok' : 'bad');
      r.querySelector('[data-kpi="2"] .hn-kpi-lbl').textContent = isC ? 'Taux de Guérison · ' + view.label : 'Taux de Guérison National / Régional';

      /* KPI 3 — structures en rupture ATPE */
      this._count('k3', k.rupture, (v) => NH.fmt(v, 0));
      r.querySelector('[data-kpi="3"] .hn-kpi-sub').textContent =
        'structures en rupture · sur ' + NH.fmt(k.pdv, 0) + ' points suivis (' + NH.fmt(k.rupRate, 1) + ' %)';
      this._badge(3, k.rupture > 0 ? '⚠ URGENT REAPPRO' : '✓ Aucune rupture signalée', k.rupture > 0 ? 'bad blink' : 'ok');

      /* KPI 4 — dépistage CPN */
      this._count('k4', k.cpn, (v) => NH.fmt(v, 1) + ' %');
      this._badge(4, '↑ ' + (k.cpnDelta >= 0 ? '+' : '') + NH.fmt(k.cpnDelta, 1) + ' pts vs 2023', k.cpnDelta >= 0 ? 'warn' : 'bad');

      /* KPI 5 — complétude (mini barres par unité) */
      this._count('k5', k.dhis2, (v) => NH.fmt(v, 1) + ' %');
      const n80 = view.rows.filter((x) => x.dhis2 >= 80).length;
      this._badge(5, NH.fmt(n80, 0) + ' / ' + view.rows.length + ' unités ≥ 80 %', n80 >= view.rows.length / 2 ? 'ok' : 'warn');
    }

    _badge(i, text, cls) {
      const el = this.root.querySelector('[data-kpi-badge="' + i + '"]');
      if (!el) return;
      el.textContent = text;
      el.className = 'hn-badge ' + cls;
    }

    /* Compteur animé : interpole de la valeur précédente à la nouvelle */
    _count(key, to, fmt) {
      const idx = key.replace('k', '');
      const el = this.root.querySelector('[data-kpi-val="' + idx + '"]');
      if (!el) return;
      const from = this.prev[key] != null ? this.prev[key] : to;
      this.prev[key] = to;
      const t0 = performance.now();
      this._cnt = this._cnt || {};
      if (this._cnt[key]) cancelAnimationFrame(this._cnt[key]);
      const step = (now) => {
        const t = Math.min(1, (now - t0) / DUR);
        const e = 1 - Math.pow(1 - t, 3);   // ease-out cubique
        el.textContent = fmt(from + (to - from) * e);
        this._cnt[key] = t < 1 ? requestAnimationFrame(step) : 0;
      };
      this._cnt[key] = requestAnimationFrame(step);
    }

    /* =====================================================================
     * Scorecard G15 : tableau HTML + mini-sparklines Canvas
     * =================================================================== */
    _renderScorecard(view) {
      const table = this.root.getElementById('hnScoreTable');
      if (!table) return;
      const sk = this.sort.key, sd = this.sort.dir;
      const rows = view.rows.slice().sort((a, b) => {
        const va = sk === 'label' ? a.label : a[sk];
        const vb = sk === 'label' ? b.label : b[sk];
        return (va > vb ? 1 : va < vb ? -1 : 0) * sd;
      });
      const cols = [
        { key: 'label', label: view.mode === 'region' ? 'Pays' : 'District' },
        { key: 'adm', label: 'Adm.' },
        { key: 'guer', label: 'Guér.' },
        { key: 'rupture', label: 'Rupt.' },
        { key: 'dhis2', label: 'Synchro' },
        { key: 'score', label: 'Score' }
      ];
      const head = '<tr>' + cols.map((c) => '<th class="hn-th" data-key="' + c.key + '">' + c.label +
        (sk === c.key ? (sd > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '<th>Statut</th><th>2024</th></tr>';
      const body = rows.map((r, i) => {
        const st = r.score >= NH.OBJECTIF_SCORE ? ['Conforme', 'ok'] : r.score >= 50 ? ['Vigilance', 'warn'] : ['Alerte', 'bad'];
        const col = st[1] === 'ok' ? T.tertiary : st[1] === 'warn' ? T.quaternary : T.danger;
        return '<tr>' +
          '<td><b>' + NH.esc(r.label) + '</b>' + (view.mode === 'region' ? '<small> ' + NH.esc(NH.ZONE_LABELS[r.zone] || '') + '</small>' : '') + '</td>' +
          '<td>' + NH.fmt(r.adm) + '</td>' +
          '<td>' + NH.fmt(r.guer, 0) + ' %</td>' +
          '<td>' + NH.fmt(r.rupture, 0) + '</td>' +
          '<td>' + NH.fmt(r.dhis2, 0) + ' %</td>' +
          '<td><b style="color:' + col + '">' + NH.fmt(r.score, 0) + '</b></td>' +
          '<td><span class="hn-badge ' + st[1] + '">' + st[0] + '</span></td>' +
          '<td><canvas class="hn-spark" data-spark="' + i + '"></canvas></td></tr>';
      }).join('');
      table.innerHTML = '<thead>' + head + '</thead><tbody>' + body + '</tbody>';
      /* Sparklines : dessinées après le layout (tailles CSS réelles) */
      requestAnimationFrame(() => {
        table.querySelectorAll('canvas.hn-spark').forEach((cv) => {
          const r = rows[+cv.dataset.spark];
          const col = r.score >= NH.OBJECTIF_SCORE ? T.tertiary : r.score >= 50 ? T.quaternary : T.danger;
          NH.drawSpark(cv, r.spark, col);
        });
      });
      this._scoreRows = rows;
      this._scoreCols = cols;
    }

    _sortBy(key) {
      if (this.sort.key === key) this.sort.dir *= -1;
      else { this.sort.key = key; this.sort.dir = key === 'label' ? 1 : -1; }
      this._renderScorecard(this.view);
    }

    /* Export CSV du scorecard (séparateur « ; » pour Excel français) */
    exportCSV() {
      const rows = this._scoreRows || [];
      const head = ['Périmètre', 'Admissions', 'Guérison %', 'Ruptures ATPE', 'Synchro %', 'Score'];
      const lines = [head.join(';')].concat(rows.map((r) =>
        [r.label, r.adm, r.guer.toFixed(1), r.rupture, r.dhis2.toFixed(1), r.score.toFixed(0)].join(';')));
      const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = this.root.ownerDocument.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'nutriapp-scorecard-' + (this.view.mode === 'country' ? this.view.code : 'region') + '.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    /* Rapport : KPI + graphiques exportés en PNG, ouvert dans un document imprimable */
    report() {
      const v = this.view;
      const imgs = Object.keys(this.charts).map((id) => {
        const card = this.root.querySelector('[data-card="' + id + '"] h3');
        return { title: card ? card.textContent : id, src: this.charts[id].canvas.toDataURL('image/png') };
      });
      const kpis = [
        ['Admissions CRENAS', NH.fmt(v.kpi.adm, 0)],
        ['Taux de guérison', NH.fmt(v.kpi.guer, 1) + ' %'],
        ['Structures en rupture ATPE', NH.fmt(v.kpi.rupture, 0)],
        ['Dépistage CPN', NH.fmt(v.kpi.cpn, 1) + ' %'],
        ['Complétude NutriApp', NH.fmt(v.kpi.dhis2, 1) + ' %']
      ];
      const w = global.open('', '_blank');
      if (!w) return;
      const esc = NH.esc;
      w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport NutriApp</title>' +
        '<style>body{font:14px Inter,Arial;color:#334155;margin:32px}h1{color:#7C3AED;margin:0}' +
        '.k{display:inline-block;border:1px solid #DDD6FE;border-radius:16px;padding:14px 18px;margin:6px;min-width:170px}' +
        '.k b{display:block;font-size:22px;color:#1E293B}figure{margin:18px 0;break-inside:avoid}img{width:100%;border:1px solid #F1F5F9;border-radius:12px}' +
        'figcaption{font-weight:600;margin-bottom:6px}</style></head><body>' +
        '<h1>NutriApp · Surveillance Nutritionnelle Clinique &amp; Communautaire</h1>' +
        '<p>Ministère de la Santé / Coordination NutriApp · Périmètre : <b>' + esc(v.label) + '</b> · Période : ' + (v.period === 'M' ? 'mensuelle' : 'trimestrielle') + '</p>' +
        kpis.map((k) => '<span class="k">' + esc(k[0]) + '<b>' + esc(k[1]) + '</b></span>').join('') +
        imgs.map((i) => '<figure><figcaption>' + esc(i.title) + '</figcaption><img src="' + i.src + '" alt=""></figure>').join('') +
        '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>');
      w.document.close();
    }
  }

  if (!customElements.get('health-nutriapp-dashboard')) {
    customElements.define('health-nutriapp-dashboard', NutriHealthDashboard);
  }
  NH.Dashboard = NutriHealthDashboard;
})(typeof window !== 'undefined' ? window : globalThis);
