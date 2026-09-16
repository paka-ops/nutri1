/* ============================================================================
   NUTRI.N°1 — SECTION AGRICULTURE (v58)  ·  MODULE PRINCIPAL
   ---------------------------------------------------------------------------
   « Cellule nationale d'intelligence agro-alimentaire » pour le Ministère de
   l'Agriculture : production, pertes, climat, prévision, nutrition, décision.

   ARCHITECTURE RÉUTILISABLE
     NUTRI_AGRI_KIT  → boîte à outils UI partagée (cartes, KPI, tableaux,
                       curseurs, onglets, tiroirs, export, impression).
     registerTab()   → chaque espace de travail s'enregistre ; une autre section
                       (Santé, FAO, WFP, UNICEF…) peut réutiliser exactement le
                       même socle en déclarant ses propres onglets.
     NUTRI_AGRI_MODELS → couche analytique (cf. agri-models.js), indépendante
                       de l'interface.
   Données : estimations modélisées de démonstration (à calibrer avec le pays).
   ========================================================================== */
(function (w, d) {
  'use strict';
  if (w.NUTRI_AGRI_KIT) return;
  const NX = w.NX, DATA = w.NUTRI_AGRI_DATA, M = w.NUTRI_AGRI_MODELS;
  const { h, fmt, stats: S, charts: C, overlay } = NX;

  /* ------------------------------------------------------------- i18n court */
  function T(fr, en) { return NX.lang() === 'en' ? en : fr; }
  const NUM = { fr: { t: 't', ha: 'ha', pct: '%', usd: '$' }, en: {} };

  /* ------------------------------------------------------------------ état */
  const state = {
    country: (function () {
      try { return localStorage.getItem('nutri_country') || 'TG'; } catch (e) { return 'TG'; }
    })(),
    year: 2026,
    scenario: 'baseline',
    cropId: null,
    region: null,
    nutrient: 'kcal',
    plan: null,
    levers: { harvest: .1, storage: .15, transport: .1, processing: .05, market: .1, coldChain: .1, irrigation: 0, seed: 0, extension: 0, biofort: 0 },
    budget: 45e6,
    priority: 'balanced',
    selected: [],
    mc: null,
    forecastCfg: { cropId: null, horizon: 6, confidence: .8, scenario: 'baseline', seasonal: false, adaptation: 0 },
    climateCfg: { dTemp: 1.5, dRain: -12, adaptation: 20, horizon: 8 },
    lossesLast: null
  };
  let ds = DATA.build(state.country, state.year);

  function rebuild() {
    ds = DATA.build(state.country, state.year);
    if (state.cropId && !ds.crops.some(c => c.id === state.cropId)) state.cropId = null;
    if (state.region && !ds.regions.some(r => r.name === state.region)) state.region = null;
  }

  /* ------------------------------------------------------- helpers graphiques */
  const controllers = new WeakMap();
  function chart(kind, host, cfg) {
    const prev = controllers.get(host);
    if (prev && prev.destroy) { try { prev.destroy(); } catch (e) { } }
    if (!host) return null;
    host.classList.add('nx-chart');
    const c = C[kind] ? C[kind](host, cfg) : null;
    if (c) controllers.set(host, c);
    return c;
  }
  function chartHost(cls, height) {
    return h('div', { class: 'nx-chart ' + (cls || ''), style: height ? { '--nx-chart-h': height + 'px' } : null });
  }

  /* --------------------------------------------------------- kit UI partagé */
  function card(opts) {
    const o = Object.assign({ title: '', sub: '', icon: '', actions: [], span: 0, accent: false, flat: false, cls: '' }, opts);
    const body = h('div.nx-card-body');
    const head = (o.title || o.actions.length) ? h('div.nx-card-head', null, [
      h('div.nx-title', null, [
        h('h3.nx-h3', null, [o.icon ? h('span', { text: o.icon + ' ' }) : null, o.title]),
        o.sub ? h('div.nx-mini.nx-dim', { text: o.sub }) : null
      ]),
      o.actions.length ? h('div.nx-card-actions', null, o.actions) : null
    ]) : null;
    const el = h('div', { class: 'nx-card ' + (o.accent ? 'accent ' : '') + (o.flat ? 'flat ' : '') + o.cls + (o.span ? ' nx-span-' + o.span : '') }, [head, body]);
    return { el, body, head };
  }
  function kpi(opts) {
    const o = Object.assign({ label: '', value: '', unit: '', delta: null, foot: '', tone: '', spark: null, source: 'modelled', hint: '' }, opts);
    const val = h('div.nx-kpi-value', { html: o.value + (o.unit ? ' <small>' + NX.esc(o.unit) + '</small>' : '') });
    const el = h('div', { class: 'nx-kpi ' + (o.tone || ''), title: o.hint || '' }, [
      h('div.nx-kpi-label', { text: o.label }),
      val,
      h('div.nx-kpi-foot', null, [
        h('span', { text: o.foot || '' }),
        o.delta != null ? h('span', { class: 'nx-delta ' + (o.delta > 0 ? 'up' : o.delta < 0 ? 'down' : 'flat'), text: (o.delta > 0 ? '▲ ' : o.delta < 0 ? '▼ ' : '■ ') + fmt.signed(o.delta, 1) + ' %' }) : null
      ]),
      o.spark ? h('div.nx-spark', null, (function () { const s = h('div', { style: { height: '100%' } }); setTimeout(() => C.spark(s, { data: o.spark, color: o.sparkColor || '#c9ee59' }), 0); return s; })()) : null,
      o.source ? h('span.nx-src', { text: o.source === 'reported' ? T('publié', 'reported') : T('modélisé', 'modelled') }) : null
    ]);
    el._setValue = function (v, u) { val.innerHTML = v + (u ? ' <small>' + NX.esc(u) + '</small>' : ''); };
    return el;
  }
  function field(label, node) { return h('label.nx-field', null, [h('span', { text: label }), node]); }
  function select(options, value, onchange, cls) {
    const s = h('select', { class: 'nx-select ' + (cls || ''), onchange: e => onchange(e.target.value, e) });
    options.forEach(o => s.appendChild(h('option', { value: o.value, selected: String(o.value) === String(value) ? 'selected' : null, text: o.label })));
    return s;
  }
  function segmented(items, value, onchange) {
    const wrap = h('div.nx-btn-group', { role: 'tablist' });
    items.forEach(it => {
      const b = h('button', { type: 'button', class: 'nx-btn sm ' + (it.value === value ? 'active' : ''), text: it.label, title: it.hint || '', onclick: () => { wrap.querySelectorAll('.nx-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); onchange(it.value); } });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function slider(opts) {
    const o = Object.assign({ min: 0, max: 100, step: 1, value: 0, label: '', format: v => fmt.num(v, 0), oninput: null }, opts);
    const out = h('span.nx-slider-val', { text: o.format(o.value) });
    const input = h('input.nx-range', { type: 'range', min: o.min, max: o.max, step: o.step, value: o.value, 'aria-label': o.label });
    input.addEventListener('input', () => { const v = parseFloat(input.value); out.textContent = o.format(v); if (o.oninput) o.oninput(v); });
    const wrap = h('div.nx-slider-row', null, [h('span.nx-label', { text: o.label }), out, input]);
    wrap._input = input;
    wrap._set = v => { input.value = v; out.textContent = o.format(v); };
    return wrap;
  }
  function toggle(opts) {
    const o = Object.assign({ label: '', checked: false, onchange: null }, opts);
    const input = h('input', { type: 'checkbox', checked: o.checked ? 'checked' : null });
    input.addEventListener('change', () => o.onchange && o.onchange(input.checked));
    return h('label.nx-switch', null, [input, h('i'), h('span', { text: o.label })]);
  }
  function btn(label, opts) {
    const o = Object.assign({ variant: 'ghost', onClick: null, icon: '', title: '' }, opts);
    return h('button', { type: 'button', class: 'nx-btn ' + o.variant, title: o.title, onclick: e => { e.preventDefault(); o.onClick && o.onClick(e); } }, [o.icon ? h('span', { text: o.icon }) : null, h('span', { text: label })]);
  }
  function meter(label, value, max, opts) {
    const o = Object.assign({ format: v => fmt.num(v, 1), tone: '' }, opts || {});
    const pctv = Math.max(0, Math.min(100, (value / (max || 100)) * 100));
    const fill = h('i', { style: { width: '0%' }, class: o.tone });
    const bar = h('div.nx-bar-track', null, [fill]);
    setTimeout(() => { fill.style.width = pctv + '%'; }, 30);
    return h('div.nx-meter', null, [
      h('div.nx-meter-head', null, [h('span', { text: label }), h('b', { text: o.format(value) + (o.suffix || '') })]),
      bar
    ]);
  }
  function note(text, tone) { return h('div', { class: 'nx-note ' + (tone || ''), html: text }); }
  function flow(steps) {
    return h('div.nx-flow', null, steps.map(s => h('div.nx-flow-step', null, [
      h('small', { text: s.label }),
      h('b', { text: s.value }),
      s.sub ? h('div.nx-flow-sub', { text: s.sub }) : null
    ])));
  }
  /**
   * Tableau de données générique (div-grid : 100 % thémable, triable, paginé).
   * columns: [{id,label,width,align,format(row,value),bar(row),sortable}]
   */
  function dataTable(host, opts) {
      const o = Object.assign({ columns: [], rows: [], sort: null, getSort: null, onSort: null, onRow: null, pageSize: 12, empty: '—', key: 'id' }, opts);
    host.classList.add('nx-table');
    const rowsHost = h('div');
    let page = 0;
    function sortState() { return o.getSort ? o.getSort() : o.sort; }
    function render() {
      const cols = o.columns;
      const sort = sortState();
      host.innerHTML = '';
      const grid = cols.map(c => c.width || '1fr').join(' ');
      const head = h('div.nx-thead', { style: { gridTemplateColumns: grid } });
      cols.forEach(c => {
        const th = h('div', {
          class: 'nx-th' + (c.sortable !== false ? ' sort' : '') + (sort && sort.id === c.id ? ' ' + sort.dir : ''),
          style: { textAlign: c.align || 'left' },
          text: c.label,
          onclick: () => { if (c.sortable === false || !o.onSort) return; o.onSort(c.id, sort && sort.id === c.id && sort.dir === 'asc' ? 'desc' : 'asc'); }
        });
        head.appendChild(th);
      });
      host.appendChild(head);
      let rows = o.rows.slice();
      if (sort) {
        const dir = sort.dir === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
          const va = sortVal(a, sort.id), vb = sortVal(b, sort.id);
          return (va === vb ? 0 : va > vb ? 1 : -1) * dir;
        });
      }
      const pages = Math.max(1, Math.ceil(rows.length / o.pageSize));
      page = Math.min(page, pages - 1);
      const slice = rows.slice(page * o.pageSize, page * o.pageSize + o.pageSize);
      slice.forEach(r => {
        const tr = h('div', {
          class: 'nx-tr' + (o.onRow ? ' click' : '') + (o.isSelected && o.isSelected(r) ? ' sel' : ''),
          style: { gridTemplateColumns: grid },
          onclick: () => o.onRow && o.onRow(r)
        });
        cols.forEach(c => {
          const raw = c.value ? c.value(r) : r[c.id];
          const td = h('div.nx-td' + (c.align === 'right' ? ' r' : ''), { style: { textAlign: c.align || 'left' } });
          if (c.bar) {
            const pctv = Math.max(0, Math.min(100, c.bar(r)));
            td.appendChild(h('div', { text: c.format ? c.format(r, raw) : String(raw == null ? o.empty : raw) }));
            const f = h('i', { style: { width: pctv + '%' } });
            td.appendChild(h('div.nx-bar', null, [f]));
          } else if (c.html) td.innerHTML = c.html(r, raw);
          else td.textContent = c.format ? c.format(r, raw) : (raw == null ? o.empty : String(raw));
          tr.appendChild(td);
        });
        rowsHost.appendChild(tr);
      });
      host.appendChild(rowsHost);
      if (pages > 1) {
        const pager = h('div.nx-pager', { style: { padding: '8px 12px' } }, [
          h('span', { text: (page + 1) + ' / ' + pages }),
          h('button.nx-btn.sm', { type: 'button', text: '‹', onclick: () => { page = Math.max(0, page - 1); render(); } }),
          h('button.nx-btn.sm', { type: 'button', text: '›', onclick: () => { page = Math.min(pages - 1, page + 1); render(); } })
        ]);
        host.appendChild(pager);
      }
    }
    function sortVal(r, id) { const v = r[id]; return typeof v === 'string' ? v.toLowerCase() : (v == null ? -Infinity : v); }
    render();
    return { render, setRows(rows) { o.rows = rows; render(); } };
  }

  /* ------------------------------------------------------------- onglets */
  const TABS = [];
  function registerTab(def) { TABS.push(def); }
  const mounted = {};
  let activeTab = null;
  function showTab(id, opts) {
    const o = opts || {};
    activeTab = id;
    TABS.forEach(t => {
      const p = t.panel; if (!p) return;
      p.classList.toggle('on', t.id === id);
      if (t.button) t.button.classList.toggle('active', t.id === id);
    });
    const tab = TABS.find(t => t.id === id);
    if (tab && !mounted[id] && tab.panel) {
      mounted[id] = tab.mount(tab.panel, api) || {};
    }
    if (mounted[id] && mounted[id].render) mounted[id].render(ds);
    if (o.scroll !== false && root && root.scrollIntoView && root.classList.contains('presenting')) NX.scrollTo(root);
    NX.bus.emit('agri:tab', id);
    try { if (w.location.hash !== '#agri/' + id) history.replaceState(null, '', '#agri/' + id); } catch (e) { }
  }
  function refreshAll() {
    Object.keys(mounted).forEach(k => { if (mounted[k] && mounted[k].render) mounted[k].render(ds); });
    if (renderKpis) renderKpis();
    /* jetons du bandeau haut : pays et millésime courants */
    if (chipCountry) chipCountry.textContent = '🌍 ' + ds.countryName;
    if (chipYear) chipYear.textContent = '📅 ' + ds.year;
  }

  /* --------------------------------------------------------------- API kit */
  const api = {
    T, state, get ds() { return ds; }, models: M, NX, fmt, stats: S, charts: C,
    card, kpi, field, select, segmented, slider, toggle, btn, meter, note, flow, dataTable, chart, chartHost,
    rebuild, refreshAll, showTab, overlay,
    /** applique un plan d'investissement aux calculs de prévision */
    setPlan(plan) { state.plan = plan; NX.bus.emit('agri:plan', plan); },
    toast(msg) { overlay.toast(msg); },
    /** export générique d'un tableau de données */
    exportRows(rows, name) { NX.exporter.csv((name || 'nutri-agri') + '-' + state.country + '-' + state.year + '.csv', rows); },
    exportJSON(obj, name) { NX.exporter.json((name || 'nutri-agri') + '-' + state.country + '-' + state.year + '.json', obj); },
    openDrawer(o) { return overlay.drawer(o); },
    closeDrawer: overlay.closeDrawer,
    runSteps: NX.runSteps,
    scrollTop() { NX.scrollTo(root); }
  };
  api.registerTab = registerTab;
  api.tabs = TABS;
  api.rebuildShell = function (preferredTab) {
    const keep = preferredTab || activeTab;
    mountedKeys().forEach(k => delete mounted[k]);
    shell();
    if (keep && TABS.some(t => t.id === keep)) showTab(keep, { scroll: false });
  };
  function mountedKeys() { return Object.keys(mounted); }
  w.NUTRI_AGRI_KIT = api;
  w.NUTRI_AGRI_REGISTER = registerTab;

  /* ======================================================================= */
  /*  MONTAGE DE LA COQUILLE                                                 */
  /* ======================================================================= */
  let root = null, kpiRow = null, tabsRow = null, renderKpis = null, chipCountry = null, chipYear = null;

  function shell() {
    root = d.getElementById('agriRoot');
    if (!root) return null;
    root.innerHTML = '';
    root.classList.add('nx-scope');
    const wrap = h('div.nx-shell');
    root.appendChild(wrap);

    /* --- barre de commande --------------------------------------------- */
    const countrySel = select(
      DATA.availableCountries().map(c => ({ value: c, label: DATA.COUNTRIES[c].name })),
      state.country,
      v => {
        state.country = v;
        try { localStorage.setItem('nutri_country', v); } catch (e) { }
        const g = d.getElementById('country'); if (g) g.value = v;
        rebuild(); refreshAll();
        d.dispatchEvent(new CustomEvent('nutri:countryChanged', { detail: { country: v } }));
        overlay.toast(T('Pays analysé : ', 'Country: ') + '<b>' + DATA.COUNTRIES[v].name + '</b> — ' + T('modèles recalculés', 'models recomputed'));
      });
    const yearSel = select(DATA.YEARS.slice().reverse().map(y => ({ value: y, label: String(y) })), state.year, v => { state.year = parseInt(v, 10); rebuild(); refreshAll(); });
    const scenSel = select([
      { value: 'baseline', label: T('Scénario : tendance actuelle', 'Scenario: current trend') },
      { value: 'optimistic', label: T('Scénario : adoption accélérée', 'Scenario: accelerated adoption') },
      { value: 'climate', label: T('Scénario : stress climatique', 'Scenario: climate stress') },
      { value: 'plan', label: T('Scénario : plan national', 'Scenario: national plan') }
    ], state.scenario, v => {
      state.scenario = v; state.forecastCfg.scenario = v; refreshAll();
      overlay.toast(T('Scénario appliqué : ', 'Scenario applied: ') + v);
    });

    const liveClock = h('span', { class: 'nx-mini nx-dim' });
    const tick = () => { if (liveClock.isConnected) liveClock.textContent = fmt.time(new Date()) + ' · UTC'; };
    setInterval(tick, 1000); tick();

    const topbar = h('div.nx-card.flat', { style: { gap: '14px' } }, [
      h('div.nx-row.between', { style: { alignItems: 'flex-start' } }, [
        h('div', { style: { minWidth: 'min(520px,100%)' } }, [
          h('div.nx-kicker', { text: '🌾 ' + T('MINISTÈRE DE L’AGRICULTURE — CELLULE DE DONNÉES', 'MINISTRY OF AGRICULTURE — DATA CELL') + ' • NUTRI.N°1' }),
          h('h1.nx-h1', null, [h('span.nx-grad', { text: T('Intelligence agro-alimentaire nationale', 'National agrifood intelligence') })]),
          h('p.nx-mini.nx-muted', { style: { maxWidth: '720px', margin: '6px 0 0' }, text: T(
            'Production, pertes post-récolte, climat, prévision et nutrition réunis en une seule cellule de décision — des données que le Ministère ne possède pas encore aujourd’hui.',
            'Production, post-harvest losses, climate, forecasting and nutrition in a single decision cell — data the Ministry does not yet hold.') }),
          h('div.nx-row', { style: { marginTop: '9px' } }, [
            h('span.nx-live', null, [h('i.nx-dot'), T('modèles actifs', 'models live')]),
            (chipYear = h('span.nx-chip.lime', { text: '📅 ' + ds.year })),
            (chipCountry = h('span.nx-chip', { text: '🌍 ' + ds.countryName })),
            h('span.nx-chip.info', { text: T('30 produits · 7 groupes', '30 products · 7 groups') }),
            h('span.nx-chip.warn', { text: T('données modélisées', 'modelled data') }),
            liveClock
          ])
        ]),
        h('div.nx-stack', { style: { minWidth: '270px' } }, [
          h('div.nx-row', null, [field(T('Pays', 'Country'), countrySel), field(T('Campagne', 'Year'), yearSel)]),
          field(T('Scénario de simulation', 'Simulation scenario'), scenSel),
          h('div.nx-row', null, [
            btn(T('Lancer la simulation', 'Run simulation'), { variant: 'primary', icon: '⚡', onClick: runGlobalSim }),
            btn(T('Mode présentation', 'Presentation mode'), { variant: 'lime', icon: '🎬', onClick: startPresentation })
          ]),
          h('div.nx-row', null, [
            btn(T('Note de décision', 'Decision brief'), { variant: 'info', icon: '📄', onClick: openBrief }),
            btn(T('Exporter', 'Export'), { icon: '⇩', onClick: exportMenu }),
            btn(T('Imprimer', 'Print'), { icon: '🖨', onClick: () => w.print() })
          ])
        ])
      ])
    ]);
    wrap.appendChild(topbar);

    /* --- bandeau KPI --------------------------------------------------- */
    kpiRow = h('div', { class: 'nx-grid g-6 nx-kpi-band nx-kpi-row' });
    wrap.appendChild(kpiRow);

    /* --- onglets -------------------------------------------------------- */
    tabsRow = h('div', { class: 'nx-tabs nx-sticky-tabs', role: 'tablist' });
    wrap.appendChild(tabsRow);

    /* --- panneaux ------------------------------------------------------- */
    const panels = h('div');
    wrap.appendChild(panels);
    TABS.forEach(t => {
      t.panel = h('div.nx-panel', { id: 'nx-panel-' + t.id, role: 'tabpanel', 'aria-label': t.label });
      t.button = h('button.nx-tab', { type: 'button', 'aria-selected': 'false', onclick: () => showTab(t.id) }, [
        h('span.nx-tab-ico', { text: t.icon }), h('span', { text: t.label })
      ]);
      tabsRow.appendChild(t.button);
      panels.appendChild(t.panel);
    });

    /* --- pied de section ------------------------------------------------- */
    wrap.appendChild(h('div.nx-footer', null, [
      h('span', { text: T('NUTRI.N°1 · Cellule agro-alimentaire · v58 — estimations modélisées de démonstration, à calibrer sur les sources nationales (FAOSTAT, DSID, enquêtes agricoles).', 'NUTRI.N°1 · Agrifood cell · v58 — modelled demonstration estimates, to be calibrated with national sources.') }),
      h('span.nx-row', null, [
        h('span.nx-src', { text: T('données publiées', 'reported data') }),
        h('span.nx-src.model', { text: T('données modélisées', 'modelled data') }),
        btn(T('Méthode & qualité des données', 'Method & data quality'), { variant: 'ghost', icon: '🧪', onClick: () => showTab('method') })
      ])
    ]));

    /* --- isolation des événements (aucune interférence avec les couches
           de simulation génériques des autres sections) ------------------- */
    ['click', 'change', 'input', 'keydown', 'mousedown'].forEach(evt => {
      root.addEventListener(evt, e => { e.stopPropagation(); }, false);
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { stopPresentation(); overlay.closeDrawer(); }
      if (e.key === 'ArrowRight' && root.classList.contains('presenting')) nextPresentation(1);
      if (e.key === 'ArrowLeft' && root.classList.contains('presenting')) nextPresentation(-1);
    });

    /* --- recalcul au redimensionnement / affichage ---------------------- */
    if (w.ResizeObserver) {
      const ro = new w.ResizeObserver(NX.debounce(() => { Object.keys(mounted).forEach(k => { const c = mounted[k]; if (c && c.redraw) c.redraw(); }); }, 260));
      ro.observe(root);
    }
    const view = d.getElementById('agri');
    if (view && w.MutationObserver) {
      new w.MutationObserver(() => {
        if (view.classList.contains('on')) {
          const c = mounted[activeTab];
          if (c && c.render) c.render(ds);
        }
      }).observe(view, { attributes: true, attributeFilter: ['class'] });
    }

    /* --- KPI nationaux --------------------------------------------------- */
    renderKpis = function () {
      const t = ds.totals, h0 = ds.history;
      const deltaP = (v) => { const n = h0.productionT[h0.productionT.length - 1], p = h0.productionT[h0.productionT.length - 2] || n; return p ? ((n - p) / p) * 100 : 0; };
      kpiRow.innerHTML = '';
      [
        kpi({
          label: T('Production brute', 'Gross production'), value: fmt.tons(t.productionT).split(' ')[0], unit: fmt.tons(t.productionT).split(' ')[1], delta: deltaP(),
          foot: fmt.ha(t.areaHa) + ' · ' + fmt.num(t.avgYield, 2) + ' t/ha', spark: h0.productionT, source: 'modelled',
          hint: T('Production agricole totale modélisée', 'Modelled total agricultural production')
        }),
        kpi({
          label: T('Pertes post-récolte', 'Post-harvest losses'), value: fmt.tons(t.lossT).split(' ')[0], unit: fmt.tons(t.lossT).split(' ')[1] + ' · ' + fmt.pct(t.lossPct), tone: t.lossPct > 20 ? 'hot' : '',
          foot: T('valeur perdue ', 'lost value ') + fmt.money(t.lossValueUsd, ds.country), spark: h0.lossPct, sparkColor: '#ff6b5e', source: 'modelled'
        }),
        kpi({
          label: T('Autosuffisance alimentaire', 'Food self-sufficiency'), value: fmt.num(t.selfSufficiency, 1), unit: '%', tone: t.selfSufficiency < 90 ? 'hot' : 'good',
          foot: T('disponible / besoins nationaux', 'available / national needs'), spark: h0.kcalPerCap, sparkColor: '#18d67f', source: 'modelled'
        }),
        kpi({
          label: T('Écart alimentaire', 'Food gap'), value: fmt.tons(t.gapT).split(' ')[0], unit: fmt.tons(t.gapT).split(' ')[1], tone: 'hot',
          foot: T('importations ', 'imports ') + fmt.tons(t.importT), spark: h0.gapT, sparkColor: '#f5b642', source: 'modelled'
        }),
        kpi({
          label: T('Valeur de la production', 'Output value'), value: fmt.money(t.valueUsd, ds.country).split(' ')[0], unit: fmt.money(t.valueUsd, ds.country).split(' ')[1],
          foot: T('prix producteur modélisés', 'modelled farmgate prices'), spark: h0.valueUsd, sparkColor: '#3fc8f0', source: 'modelled'
        }),
        kpi({
          label: T('Risque climatique', 'Climate risk'), value: fmt.num(ds.history.climateRisk[ds.history.climateRisk.length - 1], 0), unit: '/100',
          tone: ds.history.climateRisk[ds.history.climateRisk.length - 1] > 60 ? 'hot' : '', foot: '+ ' + fmt.num(ds.climate.tempAnomaly, 2) + ' °C ' + T('vs 1981-2010', 'vs 1981-2010'),
          spark: h0.climateRisk, sparkColor: '#f5b642', source: 'modelled'
        })
      ].forEach(k => kpiRow.appendChild(k));
      /* animation de comptage : on relit le nombre affiché (séparateurs locaux),
         on l'anime, puis on restaure exactement le HTML d'origine. */
      if (!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        const decSep = NX.lang() === 'fr' ? ',' : '.';
        kpiRow.querySelectorAll('.nx-kpi-value').forEach(node => {
          const html = node.innerHTML;
          const small = node.querySelector('small');
          const raw = (small ? (node.textContent || '').replace(small.textContent, '') : node.textContent) || '';
          const clean = raw.replace(/[\s\u00a0\u202f\u2009]/g, '');
          if (!/^-?\d+([.,]\d+)?$/.test(clean)) return;
          const norm = decSep === ',' ? clean.replace(',', '.') : clean.replace(/,/g, '');
          const n = parseFloat(norm);
          if (!isFinite(n) || n === 0) return;
          const dot = norm.indexOf('.');
          const dec = dot < 0 ? 0 : norm.length - dot - 1;
          const out = h('span.nx-kpi-num', { text: '0' });
          node.innerHTML = '';
          node.appendChild(out);
          if (small) { node.appendChild(document.createTextNode(' ')); node.appendChild(small); }
          NX.countUp(out, n, { dec, ms: 750 });
          setTimeout(() => { node.innerHTML = html; }, 900);
        });
      }
    };
    renderKpis();

    const hash = (function () { try { return (location.hash || '').split('/')[1]; } catch (e) { return null; } })();
    const preferred = shell.__preferred && TABS.some(t => t.id === shell.__preferred) ? shell.__preferred : null;
    showTab(preferred || (TABS.some(t => t.id === hash) ? hash : TABS[0].id), { scroll: false });
    return root;
  }

  /* ======================================================================= */
  /*  SIMULATION GLOBALE (tiroir)                                            */
  /* ======================================================================= */
  function runGlobalSim() {
    const body = h('div.nx-stack');
    body.appendChild(note(T('<b>Simulation intégrée</b> — enchaînement complet : ingestion des sources, contrôle qualité, modèle de rendement, pertes, climat, prévision et optimisation budgétaire.', '<b>Integrated simulation</b> — full chain: ingestion, quality control, yield, losses, climate, forecast and budget optimisation.'), 'info'));
    const steps = h('div.nx-sim');
    const progress = h('div.nx-progress', null, [h('i')]);
    const result = h('div');
    body.appendChild(steps); body.appendChild(progress); body.appendChild(result);
    overlay.drawer({ kicker: 'NUTRI.N°1 · ' + T('CELLULE AGRO-ALIMENTAIRE', 'AGRIFOOD CELL'), title: T('Simulation nationale — ', 'National simulation — ') + ds.countryName + ' ' + ds.year, body });
    const list = [
      T('Connexion des sources : registre producteurs, marchés, satellite, météo', 'Source connection: farmer registry, markets, satellite, weather'),
      T('Contrôle qualité, complétude et provenance', 'Quality, completeness and provenance control'),
      T('Modèle de rendement (sol, intrants, climat)', 'Yield model (soil, inputs, climate)'),
      T('Pertes post-récolte par étape et par produit', 'Post-harvest losses by stage and product'),
      T('Scénarios climatiques et prévision 10 ans', 'Climate scenarios and 10-year forecast'),
      T('Monte-Carlo : 10 000 tirages du bilan alimentaire', 'Monte-Carlo: 10,000 food-balance runs'),
      T('Optimisation du portefeuille d’investissement', 'Investment portfolio optimisation'),
      T('Génération des sorties décisionnelles', 'Decision-ready outputs generation')
    ];
    NX.runSteps(steps, list, {
      step: 380,
      onDone: function () {
        const mc = M.monteCarlo(ds, { runs: 4000, horizon: 5, plan: state.plan });
        const cat = M.interventions(ds);
        const opt = M.optimizeBudget(ds, cat, state.budget, { priority: state.priority });
        state.mc = mc;
        progress.querySelector('i').style.width = '100%';
        result.appendChild(h('div.nx-grid.g-3', { style: { marginTop: '12px' } }, [
          kpi({ label: T('Autosuffisance médiane 2031', 'Median self-sufficiency 2031'), value: fmt.num(mc.ss.p50, 1), unit: '%', foot: 'P10 ' + fmt.num(mc.ss.p10, 1) + ' · P90 ' + fmt.num(mc.ss.p90, 1), tone: mc.ss.p50 < 100 ? 'hot' : 'good' }),
          kpi({ label: T('Probabilité de déficit', 'Shortfall probability'), value: fmt.num(mc.probShortfall, 1), unit: '%', tone: mc.probShortfall > 45 ? 'hot' : '', foot: fmt.int(mc.runs) + ' ' + T('tirages', 'runs') }),
          kpi({ label: T('Pertes médianes 2031', 'Median losses 2031'), value: fmt.num(mc.loss.p50, 1), unit: '%', foot: T('cible ', 'target ') + '10 %', tone: mc.loss.p50 > 15 ? 'hot' : '' })
        ]));
        result.appendChild(h('div.nx-grid.g-3', { style: { marginTop: '12px' } }, [
          kpi({ label: T('Production sauvée / an (plan)', 'Saved production / yr (plan)'), value: fmt.tons(opt.savedT), tone: 'good', foot: fmt.money(opt.valueUsd, ds.country) }),
          kpi({ label: T('Budget engagé', 'Budget committed'), value: fmt.money(opt.spentUsd, ds.country), foot: opt.plan.length + ' ' + T('mesures', 'measures') }),
          kpi({ label: T('Emplois induits', 'Induced jobs'), value: fmt.int(opt.jobs), foot: T('investissement + conseil', 'investment + advisory') })
        ]));
        result.appendChild(note(T('<b>Recommandation de la cellule :</b> sécuriser d’abord la chaîne du froid et le stockage dans les régions à pertes élevées, puis l’irrigation et les semences ; la combinaison présente le meilleur rapport bénéfice/coût pour la campagne suivante.', '<b>Cell recommendation:</b> secure cold chain and storage in high-loss regions first, then irrigation and seed; the combination shows the best benefit/cost ratio for the coming season.'), 'ok'));
        result.appendChild(h('div.nx-row', { style: { marginTop: '10px' } }, [
          btn(T('Voir la prévision', 'Open forecast'), { variant: 'primary', icon: '📈', onClick: () => { overlay.closeDrawer(); showTab('forecast'); } }),
          btn(T('Voir le plan d’investissement', 'Open investment plan'), { variant: 'lime', icon: '💰', onClick: () => { overlay.closeDrawer(); showTab('investment'); } }),
          btn(T('Note de décision', 'Decision brief'), { variant: 'info', icon: '📄', onClick: openBrief })
        ]));
      }
    });
  }

  /* ---------------------------------------------------- note de décision */
  function openBrief() {
    const plan = state.plan || M.lossSim(ds, state.levers);
    const mc = state.mc || M.monteCarlo(ds, { runs: 3000, horizon: 5, plan: state.plan });
    const text = M.brief(ds, { lang: NX.lang(), plan, mc });
    const body = h('div.nx-stack');
    const pre = h('div.nx-log', { style: { maxHeight: '46vh' }, text });
    body.appendChild(h('div.nx-row.between', null, [
      h('span.nx-chip.lime', { text: T('Note exécutive', 'Executive brief') }),
      h('span.nx-mini.nx-dim', { text: ds.countryName + ' · ' + ds.year + ' · NUTRI.N°1 v58' })
    ]));
    body.appendChild(pre);
    body.appendChild(h('div.nx-note.warn', { text: T('Document de démonstration : les valeurs sont modélisées. Toute publication officielle doit être recalibrée sur les sources du Ministère.', 'Demonstration document: figures are modelled. Any official release must be recalibrated against Ministry sources.') }));
    body.appendChild(h('div.nx-row', null, [
      btn(T('Imprimer / PDF', 'Print / PDF'), { variant: 'primary', icon: '🖨', onClick: () => w.print() }),
      btn(T('Copier le texte', 'Copy text'), { icon: '⧉', onClick: () => copyText(text) }),
      btn(T('Télécharger (.txt)', 'Download (.txt)'), { icon: '⇩', onClick: () => NX.exporter.download('note-decision-' + ds.country + '-' + ds.year + '.txt', text, 'text/plain') }),
      btn(T('Voir la méthode', 'Methodology'), { icon: '🧪', onClick: () => { overlay.closeDrawer(); showTab('method'); } })
    ]));
    overlay.drawer({ kicker: 'NUTRI.N°1 · ' + T('DÉCISION', 'DECISION'), title: T('Note de décision agro-alimentaire', 'Agrifood decision brief'), body, width: 'min(820px,96vw)' });
  }
  function copyText(txt) {
    try {
      if (navigator.clipboard) navigator.clipboard.writeText(txt);
      else { const ta = h('textarea', { value: txt }); d.body.appendChild(ta); ta.select(); d.execCommand('copy'); ta.remove(); }
      overlay.toast('✓ ' + T('Texte copié', 'Text copied'));
    } catch (e) { overlay.toast(T('Copie indisponible', 'Copy unavailable')); }
  }

  /* ---------------------------------------------------------------- export */
  function exportMenu() {
    const body = h('div.nx-stack');
    body.appendChild(h('div.nx-mini.nx-muted', { text: T('Choisissez le jeu de données à exporter (CSV ouvrable dans Excel, ou JSON complet pour vos analystes).', 'Choose the dataset to export (CSV for Excel, or full JSON for your analysts).') }));
    const rows = ds.crops.map(c => ({
      produit: c.fr, groupe: DATA.GROUPS[c.group].fr, surface_ha: Math.round(c.areaHa), rendement_t_ha: +c.yieldTha.toFixed(2),
      production_t: Math.round(c.productionT), pertes_pct: +c.lossPct.toFixed(1), pertes_t: Math.round(c.lossT),
      disponible_t: Math.round(c.totalAvailT), besoins_t: Math.round(c.needT), ecart_t: Math.round(c.gapT),
      autosuffisance_pct: +c.sufficiency.toFixed(1), prix_usd_kg: +c.priceUsdKg.toFixed(2), valeur_usd: Math.round(c.valueUsd),
      kcal_100g: c.nut.kcal, proteines_g: c.nut.prot, fer_mg: c.nut.fe, vitamineA_ug: c.nut.va, zinc_mg: c.nut.zn
    }));
    const opts = [
      { icon: '🌾', fr: 'Produits & production (CSV)', en: 'Products & production (CSV)', fn: () => NX.exporter.csv('produits-' + ds.country + '-' + ds.year + '.csv', rows) },
      { icon: '🌦️', fr: 'Série climatique mensuelle (CSV)', en: 'Monthly climate series (CSV)', fn: () => NX.exporter.csv('climat-' + ds.country + '-' + ds.year + '.csv', ds.climate.monthly.map(m => ({ mois: m.m, pluie_mm: +m.rain.toFixed(1), temperature_c: +m.temp.toFixed(1), ndvi: +m.ndvi.toFixed(2) }))) },
      { icon: '📈', fr: 'Historique national 2010 → ' + ds.year + ' (CSV)', en: 'National history 2010 → ' + ds.year + ' (CSV)', fn: () => NX.exporter.csv('historique-' + ds.country + '.csv', ds.history.years.map((y, i) => ({ annee: y, production_t: Math.round(ds.history.productionT[i]), surfaces_ha: Math.round(ds.history.areaHa[i]), rendement_t_ha: +ds.history.yieldTha[i].toFixed(2), pertes_pct: +ds.history.lossPct[i].toFixed(1), risque_climatique: Math.round(ds.history.climateRisk[i]), importations_t: Math.round(ds.history.importT[i]), kcal_hab_j: Math.round(ds.history.kcalPerCap[i]) }))) },
      { icon: '🗺️', fr: 'Régions (CSV)', en: 'Regions (CSV)', fn: () => NX.exporter.csv('regions-' + ds.country + '.csv', ds.regions.map(r => ({ region: r.name, production_t: Math.round(r.productionT), pertes_pct: +r.lossPct.toFixed(1), risque_climatique: Math.round(r.climateRisk), stockage_pct: +(r.storage * 100).toFixed(0), froid_pct: +(r.cold * 100).toFixed(0) }))) },
      { icon: '🧪', fr: 'Jeu de données complet (JSON)', en: 'Full dataset (JSON)', fn: () => NX.exporter.json('nutri-agri-' + ds.country + '-' + ds.year + '.json', { dataset: ds, note: 'Estimations modélisées NUTRI.N°1 v58 — démonstration' }) }
    ];
    opts.forEach(o => body.appendChild(h('button.nx-btn', { type: 'button', style: { justifyContent: 'flex-start', padding: '13px' }, onclick: () => { o.fn(); overlay.toast('✓ ' + o.fr); } }, [h('span', { text: o.icon }), h('span', { html: '<b>' + o.fr + '</b>' })])));
    body.appendChild(note(T('Astuce : le CSV utilise le point-virgule comme séparateur (compatible Excel FR).', 'Tip: CSV uses semicolon separators (Excel FR compatible).')));
    overlay.drawer({ kicker: 'NUTRI.N°1 · ' + T('EXPORT', 'EXPORT'), title: T('Exporter les données', 'Export data'), body });
  }

  /* ------------------------------------------------------------ présentation */
  let presentTimer = null, presentIdx = 0, presentPaused = false;
  function startPresentation() {
    root.classList.add('presenting');
    d.body.classList.add('nx-present');
    presentIdx = Math.max(0, TABS.findIndex(t => t.id === activeTab));
    showTab(TABS[presentIdx].id);
    const bar = h('div.nx-progress', { style: { marginTop: '10px' } }, [h('i')]);
    const ctrl = h('div.nx-row.between', { style: { marginTop: '10px' } }, [
      h('span.nx-live', null, [h('i.nx-dot'), T('mode présentation', 'presentation mode')]),
      h('div.nx-row', null, [
        btn('‹', { onClick: () => nextPresentation(-1) }),
        btn(T('Pause', 'Pause'), { onClick: (e) => { presentPaused = !presentPaused; e.target.textContent = presentPaused ? T('Reprendre', 'Resume') : T('Pause'); } }),
        btn('›', { onClick: () => nextPresentation(1) }),
        btn(T('Quitter', 'Exit'), { variant: 'danger', onClick: stopPresentation })
      ])
    ]);
    const barWrap = h('div', null, [bar, ctrl]);
    root.insertBefore(barWrap, root.querySelector('.nx-shell'));
    root.__presentBar = barWrap;
    clearInterval(presentTimer);
    let step = 0;
    presentTimer = setInterval(() => {
      if (presentPaused) return;
      step++;
      const fill = bar.querySelector('i');
      if (fill) fill.style.width = ((step / 35) * 100) + '%';
      if (step >= 35) { step = 0; nextPresentation(1); }
    }, 400);
    if (!startPresentation._bound) {
      startPresentation._bound = true;
      NX.bus.on('agri:tab', id => { presentIdx = Math.max(0, TABS.findIndex(t => t.id === id)); step = 0; });
    }
  }
  function nextPresentation(step) {
    if (!root.classList.contains('presenting')) return;
    presentIdx = (presentIdx + step + TABS.length) % TABS.length;
    showTab(TABS[presentIdx].id, { scroll: false });
  }
  function stopPresentation() {
    if (!root || !root.classList.contains('presenting')) return;
    root.classList.remove('presenting');
    d.body.classList.remove('nx-present');
    clearInterval(presentTimer);
    if (root.__presentBar) { root.__presentBar.remove(); root.__presentBar = null; }
  }

  /* ======================================================================= */
  /*  ONGLET 1 — VUE NATIONALE                                               */
  /* ======================================================================= */
  registerTab({
    id: 'overview', icon: '🛰️', label: T('Vue nationale', 'National overview'),
    mount(host) {
      let indicator = 'productionT';
      const trendCard = card({
        title: T('Trajectoire nationale & projection', 'National trajectory & projection'),
        sub: T('Histoire 2010 → aujourd’hui et projection à 10 ans (modèle Holt-Winters damped)', 'History 2010 → today and 10-year projection (damped Holt-Winters)'),
        span: 3,
        actions: [
          segmented([
            { value: 'productionT', label: T('Production', 'Production') },
            { value: 'yieldTha', label: T('Rendement', 'Yield') },
            { value: 'areaHa', label: T('Surfaces', 'Area') },
            { value: 'lossPct', label: T('Pertes', 'Losses') },
            { value: 'kcalPerCap', label: T('kcal/hab', 'kcal/cap') }
          ], indicator, v => { indicator = v; draw(); })
        ]
      });
      const trendHost = chartHost('xl');
      trendCard.body.appendChild(trendHost);
      const forecastNote = h('div.nx-mini.nx-dim');
      trendCard.body.appendChild(forecastNote);

      const wf = card({ title: T('Bilan alimentaire national', 'National food balance'), sub: T('De la production au disponible réellement consommable', 'From production to what is actually consumable'), span: 3 });
      const wfHost = chartHost('lg');
      wf.body.appendChild(wfHost);

      const topCard = card({ title: T('Top produits', 'Top products'), sub: T('Cliquez un produit pour ouvrir son analyse', 'Click a product to open its analysis'), span: 2 });
      const topHost = chartHost('lg');
      topCard.body.appendChild(topHost);

      const tileCard = card({
        title: T('Carte régionale', 'Regional map'), sub: T('Cartogramme tuilé — cliquez une région', 'Tile cartogram — click a region'), span: 2,
        actions: [segmented([
          { value: 'production', label: T('Production', 'Production') },
          { value: 'loss', label: T('Pertes', 'Losses') },
          { value: 'climate', label: T('Climat', 'Climate') },
          { value: 'gap', label: T('Écart', 'Gap') }
        ], 'production', v => { tileMetric = v; drawTiles(); })]
      });
      let tileMetric = 'production';
      const tilesHost = h('div.nx-tilemap');
      const tileDetail = h('div.nx-note');
      tileCard.body.appendChild(tilesHost); tileCard.body.appendChild(tileDetail);

      const alertCard = card({ title: T('Alertes précoces', 'Early warnings'), sub: T('Signal → priorité → action', 'Signal → priority → action'), span: 2 });
      const alertsHost = h('div.nx-timeline');
      alertCard.body.appendChild(alertsHost);

      const chainCard = card({ title: T('Ferme → Assiette → Santé', 'Farm → Plate → Health'), sub: T('Ce qui est produit, perdu, disponible et réellement nutritif', 'Produced, lost, available and actually nutritious'), span: 3 });
      const chainHost = h('div.nx-stack');
      chainCard.body.appendChild(chainHost);

      const sensCard = card({ title: T('Sensibilité du système', 'System sensitivity'), sub: T('Effet d’une variation de ±10 % des moteurs clés sur la production', 'Effect of ±10% change in key drivers on production'), span: 3 });
      const sensHost = chartHost('sm');
      sensCard.body.appendChild(sensHost);

      let benchMetric = 'selfSufficiency';
      const benchCard = card({
        title: T('Comparaison régionale (CEDEAO + AES)', 'Regional comparison (ECOWAS + AES)'),
        sub: T('Le pays sélectionné face à ses pairs — classement, moyenne régionale, clic pour changer de pays', 'The selected country against its peers — ranking, regional average, click to switch country'), span: 6,
        actions: [segmented([
          { value: 'selfSufficiency', label: T('Autosuffisance', 'Self-sufficiency') },
          { value: 'lossPct', label: T('Pertes', 'Losses') },
          { value: 'avgYield', label: T('Rendement', 'Yield') },
          { value: 'valuePerCap', label: T('Valeur/hab', 'Value/cap') }
        ], benchMetric, v => { benchMetric = v; drawBench(); })]
      });
      const benchHost = chartHost('lg');
      const benchNote = h('div.nx-mini.nx-muted');
      benchCard.body.appendChild(benchHost); benchCard.body.appendChild(benchNote);

      host.appendChild(h('div.nx-grid.g-6', null, [
        trendCard.el, wf.el, topCard.el, tileCard.el, alertCard.el, chainCard.el, sensCard.el, benchCard.el
      ]));

      function drawTrend() {
        const key = indicator;
        const series = ds.history[key];
        const f = M.forecast(ds, { horizon: 10, metric: key, scenario: state.scenario === 'plan' ? 'plan' : state.scenario, planGain: state.plan ? .012 : 0, planLossGain: 0 });
        const labels = f.labels;
        chart('line', trendHost, {
          labels,
          series: [
            { name: T('Réalisé', 'Actual'), data: series.concat(new Array(labels.length - series.length).fill(null)), color: '#c9ee59', area: true, points: false },
            { name: T('Projection', 'Projection'), data: new Array(series.length - 1).fill(null).concat([series[series.length - 1]]).concat(f.future), color: '#3fc8f0', dash: true, points: true, width: 2.4 },
            { name: T('Intervalle 80 %', '80% interval'), data: [], bandLo: series.concat(f.futureLo), bandHi: series.concat(f.futureHi), color: '#3fc8f0', points: false }
          ],
          format: v => key === 'lossPct' ? fmt.num(v, 1) + ' %' : key === 'kcalPerCap' ? fmt.num(v, 0) : key === 'areaHa' ? fmt.ha(v) : key === 'yieldTha' ? fmt.num(v, 2) : fmt.tons(v),
          markers: ds.climate.events.filter(e => e.severity > 55).slice(-4).map(e => ({ index: ds.history.years.indexOf(e.year), label: e.type === 'drought' ? T('sécheresse', 'drought') : e.type === 'flood' ? T('inondation', 'flood') : T('chaleur', 'heat'), color: 'rgba(245,182,66,.75)' })),
          xTicks: 9
        });
        const d = f.diagnostics;
        forecastNote.innerHTML = T(
          'Tendance <b>' + fmt.signed(d.trendPct, 2) + ' %/an</b> · projection ' + fmt.tons(d.targetValue) + ' en ' + f.forecastYears[f.forecastYears.length - 1] + ' · TCMA <b>' + fmt.signed(d.cagr, 2) + ' %</b> · erreur moyenne (backtest) ' + (isFinite(d.mape) ? fmt.pct(d.mape, 1) : 'n/a') + ' · R² ' + (isFinite(d.r2) ? fmt.num(d.r2, 3) : 'n/a'),
          'Trend <b>' + fmt.signed(d.trendPct, 2) + '%/yr</b> · projection ' + fmt.tons(d.targetValue) + ' by ' + f.forecastYears[f.forecastYears.length - 1] + ' · CAGR <b>' + fmt.signed(d.cagr, 2) + '%</b> · backtest MAPE ' + (isFinite(d.mape) ? fmt.pct(d.mape, 1) : 'n/a') + ' · R² ' + (isFinite(d.r2) ? fmt.num(d.r2, 3) : 'n/a'));
      }
      function drawWaterfall() {
        const wfData = M.waterfall(ds);
        chart('waterfall', wfHost, { items: wfData.items, format: v => fmt.tons(v) });
        wf.body.querySelectorAll('.nx-legend').forEach(n => n.remove());
      }
      let peerCache = null, peerYear = null;
      function peers() {
        if (peerCache && peerYear === ds.year) return peerCache;
        peerYear = ds.year;
        peerCache = DATA.availableCountries().map(cc => {
          const d = DATA.build(cc, ds.year);
          return {
            cc, name: DATA.COUNTRIES[cc].name,
            selfSufficiency: d.totals.selfSufficiency,
            lossPct: d.totals.lossPct,
            avgYield: d.totals.avgYield,
            valuePerCap: d.totals.valueUsd / (d.totals.population * 1e6)
          };
        });
        return peerCache;
      }
      function drawBench() {
        const rows = peers().slice().sort((a, b) => (benchMetric === 'lossPct' ? a[benchMetric] - b[benchMetric] : b[benchMetric] - a[benchMetric]));
        const unit = v => benchMetric === 'lossPct' ? fmt.num(v, 1) + ' %'
          : benchMetric === 'avgYield' ? fmt.num(v, 2) + ' t/ha'
            : benchMetric === 'valuePerCap' ? fmt.money(v, ds.country)
              : fmt.pct(v, 0);
        const avg = NX.stats.mean(peers().map(p => p[benchMetric]));
        const mine = peers().find(p => p.cc === ds.country) || rows[0];
        const rank = rows.findIndex(p => p.cc === ds.country) + 1;
        chart('bars', benchHost, {
          horizontal: true,
          labels: rows.map(p => (p.cc === ds.country ? '⭐ ' : '') + p.name),
          series: [{
            name: benchMetric === 'lossPct' ? T('Taux de perte', 'Loss rate') : T('Niveau', 'Level'),
            data: rows.map(p => p[benchMetric]), color: null
          }],
          colorScale: (v, i) => rows[i].cc === ds.country ? '#c9ee59' : 'rgba(63,200,240,.62)',
          target: avg, targetLabel: T('moyenne régionale', 'regional average'),
          format: unit,
          onSelect: i => {
            if (!rows[i] || rows[i].cc === ds.country) return;
            state.country = rows[i].cc; rebuild(); refreshAll();
            overlay.toast('🌍 ' + T('Pays analysé : ', 'Country: ') + '<b>' + rows[i].name + '</b>');
          }
        });
        benchNote.innerHTML = ds.countryName + ' : <b>' + unit(mine[benchMetric]) + '</b> · ' + T('rang ', 'rank ') + '<b>' + rank + '/' + rows.length + '</b> · '
          + T('moyenne régionale ', 'regional average ') + unit(avg) + ' · '
          + (benchMetric === 'lossPct'
            ? (mine.lossPct > avg ? '🔴 ' + T('pertes supérieures à la moyenne régionale', 'losses above the regional average') : '🟢 ' + T('pertes inférieures à la moyenne régionale', 'losses below the regional average'))
            : (mine[benchMetric] >= avg ? '🟢 ' + T('au-dessus de la moyenne régionale', 'above the regional average') : '🟠 ' + T('en dessous de la moyenne régionale', 'below the regional average')));
      }
      function drawTop() {
        const top = ds.crops.slice(0, 12);
        chart('bars', topHost, {
          labels: top.map(c => (NX.lang() === 'en' ? c.en : c.fr)),
          horizontal: true,
          series: [{ name: T('Production', 'Production'), data: top.map(c => c.productionT), color: null }],
          format: v => fmt.tons(v),
          colorScale: (v, i) => DATA.GROUPS[top[i].group].color,
          onSelect: (i) => { state.cropId = top[i].id; overlay.toast('🎯 ' + (NX.lang() === 'en' ? top[i].en : top[i].fr)); showTab('production'); }
        });
      }
      function drawTiles() {
        const val = r => tileMetric === 'production' ? r.productionT : tileMetric === 'loss' ? r.lossPct : tileMetric === 'climate' ? r.climateRisk : r.gapT;
        const vals = ds.regions.map(val);
        const mx = Math.max.apply(null, vals) || 1, mn = Math.min.apply(null, vals);
        tilesHost.innerHTML = '';
        ds.regions.forEach(r => {
          const v = val(r), t = (v - mn) / ((mx - mn) || 1);
          const heat = 'h' + NX.clamp(Math.round(t * 5), 0, 5);
          const b = h('button.nx-tile', {
            type: 'button', class: heat + (state.region === r.name ? ' sel' : ''),
            onclick: () => { state.region = state.region === r.name ? null : r.name; drawTiles(); renderRegionDetail(); }
          }, [
            h('b', { text: r.name }),
            h('small', { text: tileMetric === 'production' ? fmt.tons(v) : tileMetric === 'loss' ? fmt.pct(v) : tileMetric === 'climate' ? fmt.num(v, 0) + '/100' : fmt.tons(v) })
          ]);
          tilesHost.appendChild(b);
        });
        tilesHost.appendChild(h('div.nx-legend-scale', { style: { gridColumn: '1/-1' } }, [
          h('span', { text: T('faible', 'low') }),
          ...[0, 1, 2, 3, 4, 5].map(i => h('i', { class: 'h' + i }))
            .map((n, i) => { n.style.background = ['rgba(24,214,127,.08)', 'rgba(24,214,127,.2)', 'rgba(201,238,89,.24)', 'rgba(245,182,66,.26)', 'rgba(255,107,94,.3)', 'rgba(239,68,68,.42)'][i]; return n; }),
          h('span', { text: T('élevé', 'high') })
        ]));
      }
      function renderRegionDetail() {
        const r = ds.regions.find(x => x.name === state.region);
        if (!r) {
          tileDetail.innerHTML = T('<b>Aucune région sélectionnée.</b> Cliquez une tuile pour cibler une région : les analyses de pertes, de climat et d’investissement s’y recentrent.', '<b>No region selected.</b> Click a tile to focus losses, climate and investment analyses.');
          return;
        }
        tileDetail.innerHTML = T(
          '<b>' + r.name + '</b> — production ' + fmt.tons(r.productionT) + ' · pertes ' + fmt.pct(r.lossPct) + ' · risque climatique ' + fmt.num(r.climateRisk, 0) + '/100 · stockage ' + fmt.pct(r.storage * 100, 0) + ' · froid ' + fmt.pct(r.cold * 100, 1) + ' · écart ' + fmt.tons(r.gapT) +
          '<br><span class="nx-mini nx-dim">' + (r.hotspot === 'loss' ? T('Priorité : réduire les pertes post-récolte', 'Priority: cut post-harvest losses') : r.hotspot === 'climate' ? T('Priorité : résilience climatique', 'Priority: climate resilience') : T('Situation stable — consolider', 'Stable — consolidate')) + '</span>',
          '<b>' + r.name + '</b> — production ' + fmt.tons(r.productionT) + ' · losses ' + fmt.pct(r.lossPct) + ' · climate risk ' + fmt.num(r.climateRisk, 0) + '/100 · gap ' + fmt.tons(r.gapT) +
          '<br><span class="nx-mini nx-dim">' + (r.hotspot === 'loss' ? T('Priority: cut post-harvest losses', 'Priority: cut post-harvest losses') : r.hotspot === 'climate' ? T('Priority: climate resilience', 'Priority: climate resilience') : T('Stable — consolidate', 'Stable — consolidate')) + '</span>');
      }
      function drawAlerts() {
        const out = [];
        if (ds.totals.lossPct > 18) out.push({ tone: 'risk', t: T('Pertes post-récolte', 'Post-harvest losses'), d: fmt.pct(ds.totals.lossPct) + T(' — soit ', ' — i.e. ') + fmt.tons(ds.totals.lossT) + T(' et ', ' and ') + fmt.money(ds.totals.lossValueUsd, ds.country), a: T('Simuler la réduction', 'Simulate reduction'), tab: 'losses' });
        if (ds.totals.selfSufficiency < 95) out.push({ tone: 'warn', t: T('Écart alimentaire', 'Food gap'), d: fmt.tons(ds.totals.gapT) + T(' à couvrir — importations ', ' to close — imports ') + fmt.tons(ds.totals.importT), a: T('Prévoir', 'Forecast'), tab: 'forecast' });
        const hc = ds.history.climateRisk[ds.history.climateRisk.length - 1];
        if (hc > 55) out.push({ tone: 'warn', t: T('Stress climatique', 'Climate stress'), d: T('Indice ', 'Index ') + fmt.num(hc, 0) + '/100 · anomalie ' + fmt.num(ds.climate.tempAnomaly, 2) + ' °C', a: T('Analyser', 'Analyse'), tab: 'climate' });
        const crit = M.nutritionGap(ds).critical;
        if (crit.length) out.push({
          tone: 'risk', t: T('Déficit nutritionnel modélisé', 'Modelled nutrient gap'),
          d: crit.map(x => x.fr.split(' (')[0] + ' : ' + fmt.pct(x.coverageVuln, 0) + ' ' + T('du repère groupes vulnérables', 'of the vulnerable-group reference') + ' (' + fmt.pct(x.coverage, 0) + ' ' + T('repère moyen', 'average reference') + ')').join(' · '),
          a: T('Voir nutrition', 'Open nutrition'), tab: 'nutrition'
        });
        const vol = ds.prices.volatility[ds.prices.volatility.length - 1];
        if (vol > 9) out.push({ tone: 'warn', t: T('Volatilité des prix', 'Price volatility'), d: fmt.pct(vol, 1) + T(' — risque d’accès pour les ménages', ' — household access risk'), a: T('Investir', 'Invest'), tab: 'investment' });
        alertsHost.innerHTML = '';
        if (!out.length) {
          alertsHost.appendChild(h('div.nx-mini.nx-muted', { text: T('Aucune alerte : tous les indicateurs sont dans les seuils.', 'No alerts: all indicators within thresholds.') }));
          return;
        }
        out.forEach(a => {
          alertsHost.appendChild(h('div.nx-tl', null, [
            h('i', { class: 'nx-tl-dot ' + a.tone }),
            h('div', { style: { flex: '1' } }, [
              h('b', { text: a.t }),
              h('div.nx-mini.nx-muted', { text: a.d }),
              h('div', { style: { marginTop: '6px' } }, [btn(a.a, { variant: 'sm', onClick: () => showTab(a.tab) })])
            ])
          ]));
        });
      }
      function drawChain() {
        const ng = M.nutritionGap(ds);
        chainHost.innerHTML = '';
        chainHost.appendChild(flow([
          { label: T('Production', 'Production'), value: fmt.tons(ds.totals.productionT), sub: fmt.ha(ds.totals.areaHa) },
          { label: T('Pertes', 'Losses'), value: '−' + fmt.tons(ds.totals.lossT), sub: fmt.pct(ds.totals.lossPct) },
          { label: T('Disponible', 'Available'), value: fmt.tons(ds.totals.availFoodT), sub: T('+ importations', '+ imports') },
          { label: T('Consommé', 'Consumed'), value: fmt.tons(ds.totals.consumedT || (ds.totals.availFoodT * .94)), sub: T('pertes ménages incluses', 'incl. household waste') },
          { label: T('Nutriments', 'Nutrients'), value: fmt.num(ds.nutrients.kcal, 0) + ' kcal', sub: T('par habitant/jour', 'per capita/day') }
        ]));
        const mHost = h('div.nx-grid.g-2');
        ng.rows.forEach(r => mHost.appendChild(meter(r.fr + ' — ' + fmt.num(r.available, r.unit === 'kcal' ? 0 : 1) + ' / ' + fmt.num(r.need, 0), r.coverage, 100, { format: v => fmt.pct(v, 0), tone: r.coverage < 90 ? 'risk' : r.coverage < 100 ? 'warn' : '' })));
        chainHost.appendChild(mHost);
        chainHost.appendChild(h('div.nx-mini.nx-dim', { text: ng.summary[NX.lang() === 'en' ? 'en' : 'fr'] }));
      }
      function drawSensitivity() {
        const s = M.sensitivity(ds);
        chart('bars', sensHost, {
          labels: s.drivers.slice(0, 7).map(d => NX.lang() === 'en' ? d.en : d.fr),
          horizontal: true,
          series: [{ name: T('Impact sur la production (t)', 'Impact on production (t)'), data: s.drivers.slice(0, 7).map(d => d.delta) }],
          format: v => fmt.tons(Math.abs(v)),
          colorScale: v => v < 0 ? '#ff6b5e' : '#18d67f'
        });
      }
      function draw() { drawTrend(); drawWaterfall(); drawTop(); drawTiles(); renderRegionDetail(); drawAlerts(); drawChain(); drawSensitivity(); drawBench(); }
      return { render: draw, redraw: draw };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 2 — PRODUCTION & PRODUITS                                       */
  /* ======================================================================= */
  registerTab({
    id: 'production', icon: '🌾', label: T('Production & produits', 'Production & products'),
    mount(host) {
      const f = { q: '', group: 'all', sort: { id: 'productionT', dir: 'desc' }, top: 14, unit: 't', view: 'bars' };
      const chartCard = card({ title: T('Production par produit', 'Production by product'), sub: T('Rechercher, filtrer, trier — cliquez une barre pour le détail', 'Search, filter, sort — click a bar for details'), span: 3 });
      const chartHostEl = chartHost('lg');
      const controls = h('div.nx-row.between');
      const search = h('input.nx-input', { type: 'search', placeholder: T('Rechercher un produit…', 'Search a product…'), style: { maxWidth: '230px' } });
      search.addEventListener('input', () => { f.q = search.value.toLowerCase(); draw(); });
      const groupSel = select([{ value: 'all', label: T('Tous les groupes', 'All groups') }].concat(Object.keys(DATA.GROUPS).map(g => ({ value: g, label: DATA.GROUPS[g].icon + ' ' + (NX.lang() === 'en' ? DATA.GROUPS[g].en : DATA.GROUPS[g].fr) }))), 'all', v => { f.group = v; draw(); });
      controls.appendChild(h('div.nx-row', null, [search, groupSel]));
      controls.appendChild(h('div.nx-row', null, [
        segmented([{ value: 'bars', label: T('Barres', 'Bars') }, { value: 'line', label: '📈' }], 'bars', v => { f.view = v; draw(); }),
        segmented([{ value: 't', label: T('Tonnes', 'Tonnes') }, { value: 'value', label: '$' }, { value: 'percap', label: T('kg/hab', 'kg/cap') }], 't', v => { f.unit = v; draw(); })
      ]));
      chartCard.body.appendChild(controls);
      chartCard.body.appendChild(chartHostEl);
      chartCard.body.appendChild(slider({
        label: T('Nombre de produits affichés', 'Products displayed'), min: 5, max: 30, value: f.top, format: v => fmt.num(v, 0), oninput: v => { f.top = v; draw(); }
      }));

      const tableCard = card({
        title: T('Registre des produits', 'Product registry'), sub: T('Triable — cliquez une ligne pour le détail du produit', 'Sortable — click a row for product detail'), span: 3,
        actions: [btn(T('Exporter (CSV)', 'Export (CSV)'), { icon: '⇩', onClick: () => api.exportRows(filtered().map(c => ({ produit: c.fr, groupe: DATA.GROUPS[c.group].fr, production_t: Math.round(c.productionT), surface_ha: Math.round(c.areaHa), rendement_t_ha: +c.yieldTha.toFixed(2), pertes_pct: +c.lossPct.toFixed(1), autosuffisance_pct: +c.sufficiency.toFixed(1), valeur_usd: Math.round(c.valueUsd) })), 'registre-produits') })]
      });
      const tableHost = h('div');
      tableCard.body.appendChild(tableHost);
      let table = null;

      const detailCard = card({ title: T('Détail produit', 'Product detail'), sub: T('Sélectionnez un produit dans le registre', 'Select a product in the registry'), span: 2 });
      const detailBody = h('div.nx-stack');
      detailCard.body.appendChild(detailBody);

      const lossCard = card({ title: T('Pertes par étape (produit sélectionné)', 'Losses by stage (selected product)'), span: 2 });
      const lossHost = chartHost('sm');
      lossCard.body.appendChild(lossHost);

      const dynCard = card({
        title: T('Dynamique 2010 – 2026 (indice 100 = 2010)', 'Dynamics 2010 – 2026 (index 100 = 2010)'),
        sub: T('Production, surfaces et rendement : la productivité progresse-t-elle ?', 'Production, area and yield: is productivity improving?'), span: 3
      });
      const dynHost = chartHost('sm');
      dynCard.body.appendChild(dynHost);
      const dynNote = h('div.nx-mini.nx-muted');
      dynCard.body.appendChild(dynNote);

      const mixCard = card({
        title: T('Concentration de la valeur produite', 'Output value concentration'),
        sub: T('Part des 10 premiers produits dans la valeur totale', 'Share of the top 10 products in total value'), span: 2
      });
      const mixHost = chartHost('sm');
      mixCard.body.appendChild(mixHost);

      const mktCard = card({
        title: T('Marchés, transformation & qualité', 'Markets, processing & quality'),
        sub: T('Prix, volatilité, infrastructure de stockage et couverture laboratoire', 'Prices, volatility, storage infrastructure and laboratory coverage'), span: 3
      });
      const mktHost = chartHost('sm');
      const mktNote = h('div.nx-mini.nx-muted');
      mktCard.body.appendChild(mktHost); mktCard.body.appendChild(mktNote);

      host.appendChild(h('div.nx-grid.g-6', null, [chartCard.el, tableCard.el, detailCard.el, lossCard.el, mixCard.el, dynCard.el, mktCard.el]));

      function filtered() {
        return ds.crops.filter(c => {
          const nm = (NX.lang() === 'en' ? c.en : c.fr).toLowerCase();
          if (f.q && nm.indexOf(f.q) < 0) return false;
          if (f.group !== 'all' && c.group !== f.group) return false;
          return true;
        });
      }
      function val(c) {
        if (f.unit === 'value') return c.valueUsd / 1000;                       // k$ pour la lisibilité des axes
        if (f.unit === 'percap') return (c.productionT * 1000) / (ds.totals.population * 1e6); // kg/hab/an
        return c.productionT;
      }
      function drawChart() {
        const rows = filtered().slice(0, f.top);
        if (f.view === 'line') {
          chart('line', chartHostEl, {
            labels: rows.map(c => NX.lang() === 'en' ? c.en : c.fr),
            series: [{ name: T('Production', 'Production'), data: rows.map(val), color: DATA.GROUPS[rows[0] ? rows[0].group : 'cereals'].color, area: true, points: true }],
            format: v => f.unit === 'value' ? fmt.money(v * 1000, ds.country) : f.unit === 'percap' ? fmt.num(v, 0) + ' kg' : fmt.tons(v)
          });
        } else {
          chart('bars', chartHostEl, {
            labels: rows.map(c => NX.lang() === 'en' ? c.en : c.fr),
            series: [{ name: T('Production', 'Production'), data: rows.map(val) }],
            format: v => f.unit === 'value' ? fmt.money(v * 1000, ds.country) : f.unit === 'percap' ? fmt.num(v, 0) + ' kg' : fmt.tons(v),
            colorScale: (v, i) => DATA.GROUPS[rows[i].group].color,
            selected: rows.findIndex(c => c.id === state.cropId),
            onSelect: i => { state.cropId = rows[i].id; draw(); }
          });
        }
      }
      function drawTable() {
        const opts = {
          columns: [
            { id: 'name', label: T('Produit', 'Product'), width: '1.4fr', value: c => (NX.lang() === 'en' ? c.en : c.fr), format: (c, v) => c.icon + ' ' + v },
            { id: 'group', label: T('Groupe', 'Group'), width: '1fr', value: c => NX.lang() === 'en' ? DATA.GROUPS[c.group].en : DATA.GROUPS[c.group].fr, sortable: false },
            { id: 'areaHa', label: T('Surface', 'Area'), width: '.8fr', align: 'right', format: c => fmt.ha(c.areaHa) },
            { id: 'yieldTha', label: T('Rendement', 'Yield'), width: '.8fr', align: 'right', format: c => fmt.num(c.yieldTha, 2) + ' t/ha' },
            { id: 'productionT', label: T('Production', 'Production'), width: '.9fr', align: 'right', format: c => fmt.tons(c.productionT) },
            { id: 'lossPct', label: T('Pertes', 'Losses'), width: '.8fr', align: 'right', format: c => fmt.pct(c.lossPct, 1), bar: c => c.lossPct, value: c => c.lossPct },
            { id: 'sufficiency', label: T('Autosuffisance', 'Self-suff.'), width: '.9fr', align: 'right', format: c => fmt.pct(c.sufficiency, 0), bar: c => NX.clamp(c.sufficiency, 0, 100) },
            { id: 'valueUsd', label: T('Valeur', 'Value'), width: '.9fr', align: 'right', format: c => fmt.money(c.valueUsd, ds.country) }
          ],
          rows: filtered(), getSort: () => f.sort, pageSize: 10, key: 'id',
          isSelected: c => c.id === state.cropId,
          onSort: (id, dir) => { f.sort = { id, dir }; drawTable(); },
          onRow: c => { state.cropId = c.id; draw(); }
        };
        if (table) table.setRows(opts.rows);
        else table = api.dataTable(tableHost, opts);
      }
      function drawDetail() {
        const c = ds.crops.find(x => x.id === state.cropId);
        detailBody.innerHTML = '';
        if (!c) { detailBody.appendChild(h('div.nx-mini.nx-muted', { text: T('Aucun produit sélectionné.', 'No product selected.') })); lossHost.innerHTML = ''; return; }
        detailBody.appendChild(h('div.nx-row.between', null, [
          h('div', null, [h('h3.nx-h2', { text: c.icon + ' ' + (NX.lang() === 'en' ? c.en : c.fr) }), h('div.nx-mini.nx-dim', { text: (NX.lang() === 'en' ? DATA.GROUPS[c.group].en : DATA.GROUPS[c.group].fr) })]),
          h('span.nx-chip.lime', { text: fmt.pct(c.sufficiency, 0) + ' ' + T('autosuff.', 'self-suff.') })
        ]));
        detailBody.appendChild(h('div.nx-grid.g-2', null, [
          api.kpi({ label: T('Production', 'Production'), value: fmt.tons(c.productionT), foot: fmt.ha(c.areaHa) + ' · ' + fmt.num(c.yieldTha, 2) + ' t/ha' }),
          api.kpi({ label: T('Valeur', 'Value'), value: fmt.money(c.valueUsd, ds.country), foot: fmt.num(c.priceUsdKg, 2) + ' $/kg' }),
          api.kpi({ label: T('Pertes', 'Losses'), value: fmt.pct(c.lossPct, 1), tone: c.lossPct > 20 ? 'hot' : '', foot: fmt.tons(c.lossT) + ' · ' + fmt.money(c.lossValueUsd, ds.country) }),
          api.kpi({ label: T('Écart', 'Gap'), value: fmt.tons(c.gapT), tone: c.gapT > 0 ? 'hot' : 'good', foot: T('besoins ', 'needs ') + fmt.tons(c.needT) })
        ]));
        detailBody.appendChild(h('div.nx-mini.nx-muted', { text: T('Profil nutritionnel (pour 100 g)', 'Nutrition profile (per 100 g)') }));
        detailBody.appendChild(h('div.nx-row', null, [
          h('span.nx-chip', { text: fmt.num(c.nut.kcal, 0) + ' kcal' }),
          h('span.nx-chip.ok', { text: fmt.num(c.nut.prot, 1) + ' g ' + T('prot.', 'prot.') }),
          h('span.nx-chip.risk', { text: fmt.num(c.nut.fe, 1) + ' mg Fe' }),
          h('span.nx-chip.warn', { text: fmt.num(c.nut.va, 0) + ' µg VA' }),
          h('span.nx-chip.info', { text: fmt.num(c.nut.zn, 1) + ' mg Zn' })
        ]));
        detailBody.appendChild(h('div.nx-row', null, [
          btn(T('Prévision de ce produit', 'Forecast this product'), { variant: 'primary', onClick: () => { state.forecastCfg.cropId = c.id; showTab('forecast'); } }),
          btn(T('Réduire ses pertes', 'Reduce its losses'), { onClick: () => showTab('losses') }),
          btn(T('Simuler +1 °C', 'Simulate +1°C'), { onClick: () => { state.climateCfg.dTemp = 1; showTab('climate'); } })
        ]));
        chart('bars', lossHost, {
          labels: Object.keys(c.loss.stages).map(k => ({ harvest: T('Récolte', 'Harvest'), storage: T('Stockage', 'Storage'), transport: T('Transport', 'Transport'), processing: T('Transformation', 'Processing'), market: T('Marché', 'Market') }[k])),
          series: [{ name: T('Perte par étape (t)', 'Loss per stage (t)'), data: Object.keys(c.loss.stages).map(k => c.lossT * c.loss.stages[k] / (c.loss.total || 1)), color: '#ff6b5e' }],
          format: v => fmt.tons(v)
        });
      }
      function drawDynamics() {
        const H = ds.history, y0 = H.years[0];
        const base = k => H[k][0] || 1;
        const idx = k => H[k].map(v => (v / base(k)) * 100);
        chart('line', dynHost, {
          labels: H.years.map(String),
          series: [
            { name: T('Production', 'Production'), data: idx('productionT'), color: '#18d67f', area: true },
            { name: T('Surfaces cultivées', 'Cultivated area'), data: idx('areaHa'), color: '#3fc8f0', dash: true },
            { name: T('Rendement', 'Yield'), data: idx('yieldTha'), color: '#c9ee59' }
          ],
          target: 100, targetLabel: y0, zero: false,
          format: v => fmt.num(v, 0) + ' pts'
        });
        const g = idx('productionT'), a = idx('areaHa'), y = idx('yieldTha');
        const n = g.length - 1;
        dynNote.innerHTML = T(
          'Production <b>+' + fmt.num(g[n] - 100, 0) + ' pts</b>, surfaces <b>+' + fmt.num(a[n] - 100, 0) +
          '</b>, rendement <b>' + (y[n] >= 100 ? '+' : '') + fmt.num(y[n] - 100, 0) + ' pts</b> depuis ' + y0 +
          ' — l’écart entre les deux premières courbes mesure la part de la croissance due à l’extension des terres plutôt qu’à la productivité.',
          'Production <b>+' + fmt.num(g[n] - 100, 0) + ' pts</b>, area <b>+' + fmt.num(a[n] - 100, 0) +
          '</b>, yield <b>' + (y[n] >= 100 ? '+' : '') + fmt.num(y[n] - 100, 0) + ' pts</b> since ' + y0 +
          ' — the gap between the first two curves measures the share of growth coming from land expansion rather than productivity.');
      }
      function drawMix() {
        const sorted = ds.crops.slice().sort((a, b) => b.valueUsd - a.valueUsd);
        const top10 = sorted.slice(0, 10);
        const rest = sorted.slice(10).reduce((x, c) => x + c.valueUsd, 0);
        const items = top10.map(c => ({
          label: (NX.lang() === 'en' ? c.en : c.fr), value: c.valueUsd, color: DATA.GROUPS[c.group].color
        }));
        if (rest > 0) items.push({ label: T('Autres produits', 'Other products'), value: rest, color: 'rgba(255,255,255,.25)' });
        chart('donut', mixHost, {
          items, thickness: .6, centerLabel: T('valeur produite', 'output value'),
          format: v => fmt.money(v, ds.country)
        });
      }
      function drawMarket() {
        const P = ds.prices, y0 = ds.history.years[0], n = P.basketIndex.length;
        chart('line', mktHost, {
          labels: ds.history.years.map(String),
          series: [
            { name: T('Indice des prix du panier', 'Basket price index'), data: P.basketIndex, color: '#f5b642', area: true },
            { name: T('Termes de l’échange', 'Terms of trade'), data: P.termsOfTrade, color: '#3fc8f0', dash: true },
            { name: T('Volatilité (%)', 'Volatility (%)'), data: P.volatility, color: '#ff6b5e', points: true, width: 1.6 }
          ],
          target: 100, targetLabel: T('référence 100', 'reference 100'), zero: false,
          format: v => fmt.num(v, 1)
        });
        const prof = ds.profile;
        mktNote.innerHTML = T(
          'Volatilité 2026 : <b>' + fmt.num(P.volatility[n - 1], 1) + ' %</b> · prix du panier <b>'
          + fmt.num(P.basketIndex[n - 1] - P.basketIndex[0], 1) + ' pts</b> depuis ' + y0
          + ' · stockage structuré <b>' + fmt.pct(prof.storage * 100, 0) + '</b> · chaîne du froid <b>' + fmt.pct(prof.cold * 100, 0)
          + '</b> · réseau routier praticable <b>' + fmt.pct(prof.road * 100, 0) + '</b> · couverture laboratoire <b>'
          + fmt.pct(ds.dataQuality.laboratory, 0) + '</b> — autant de goulots d’étranglement qui se transforment en investissements chiffrés dans l’onglet Investissement.',
          'Volatility 2026: <b>' + fmt.num(P.volatility[n - 1], 1) + '%</b> · basket price <b>'
          + fmt.num(P.basketIndex[n - 1] - P.basketIndex[0], 1) + ' pts</b> since ' + y0
          + ' · structured storage <b>' + fmt.pct(prof.storage * 100, 0) + '</b> · cold chain <b>' + fmt.pct(prof.cold * 100, 0)
          + '</b> · passable road network <b>' + fmt.pct(prof.road * 100, 0) + '</b> · laboratory coverage <b>'
          + fmt.pct(ds.dataQuality.laboratory, 0) + '</b> — bottlenecks that become quantified investments in the Investment tab.');
      }
      function draw() { drawChart(); drawTable(); drawDetail(); drawDynamics(); drawMix(); drawMarket(); }
      return { render: draw, redraw: draw };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 3 — PERTES POST-RÉCOLTE + SIMULATEUR                            */
  /* ======================================================================= */
  registerTab({
    id: 'losses', icon: '📦', label: T('Pertes post-récolte', 'Post-harvest losses'),
    mount(host) {
      const kpis = h('div.nx-grid.g-6.nx-kpi-row');
      const stageCard = card({ title: T('Pertes par étape de la chaîne', 'Losses by supply-chain stage'), sub: T('Où la valeur disparaît — et donc où investir', 'Where value disappears — and where to invest'), span: 3 });
      const stageHost = chartHost('sm');
      stageCard.body.appendChild(stageHost);
      const cropCard = card({ title: T('Taux de perte par produit', 'Loss rate by product'), sub: T('Ligne rouge : cible 10 % — cliquez un produit', 'Red line: 10% target — click a product'), span: 3 });
      const cropHost = chartHost('lg');
      cropCard.body.appendChild(cropHost);

      const simCard = card({
        title: T('Simulateur de réduction des pertes', 'Loss-reduction simulator'), sub: T('Bougez les curseurs : le modèle recalcule pertes, rentabilité et impact nutritionnel', 'Move the sliders: the model recomputes losses, profitability and nutrition impact'), span: 4, accent: true,
        actions: [
          btn(T('Optimiser automatiquement', 'Auto-optimise'), { variant: 'primary', icon: '🎯', onClick: autoOptimize }),
          btn(T('Appliquer au plan national', 'Apply to national plan'), { variant: 'lime', icon: '✓', onClick: applyToPlan }),
          btn(T('Réinitialiser', 'Reset'), { onClick: resetLevers })
        ]
      });
      const simGrid = h('div.nx-grid.g-2');
      const slidersHost = h('div.nx-stack');
      const resultsHost = h('div.nx-stack');
      simGrid.appendChild(slidersHost); simGrid.appendChild(resultsHost);
      simCard.body.appendChild(simGrid);
      const simChartCard = h('div.nx-grid.g-2');
      const simChartHost1 = chartHost('sm'), simChartHost2 = chartHost('sm');
      simChartCard.appendChild(h('div.nx-card.flat', null, [h('h4.nx-h3', { text: T('Avant / après par produit', 'Before / after by product') }), h('div.nx-mini.nx-dim', { text: T('Taux de perte modélisé', 'Modelled loss rate') }), simChartHost1]));
      simChartCard.appendChild(h('div.nx-card.flat', null, [h('h4.nx-h3', { text: T('Rentabilité sur 10 ans', '10-year profitability') }), h('div.nx-mini.nx-dim', { text: T('Bénéfice annuel cumulé vs investissement', 'Cumulative annual benefit vs investment') }), simChartHost2]));
      simCard.body.appendChild(simChartCard);

      const regionCard = card({ title: T('Pertes par région', 'Losses by region'), sub: T('Cibler les zones où le stockage et le froid manquent', 'Target areas lacking storage and cold chain'), span: 2 });
      const regionChartHost = chartHost('sm');
      regionCard.body.appendChild(regionChartHost);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, stageCard.el, cropCard.el, simCard.el, regionCard.el]));

      const LEVERS = [
        { k: 'harvest', fr: 'Formation récolte, battage, tri', en: 'Harvest, threshing, sorting training', icon: '👩🏾‍🌾' },
        { k: 'storage', fr: 'Stockage amélioré (silos, aération)', en: 'Improved storage (silos, aeration)', icon: '🏭' },
        { k: 'transport', fr: 'Transport & pistes rurales', en: 'Transport & rural roads', icon: '🛣️' },
        { k: 'processing', fr: 'Transformation locale', en: 'Local processing', icon: '⚙️' },
        { k: 'market', fr: 'Marchés & contrats acheteurs', en: 'Markets & buyer contracts', icon: '🏪' },
        { k: 'coldChain', fr: 'Chaîne du froid (solaire)', en: 'Cold chain (solar)', icon: '❄️' },
        { k: 'irrigation', fr: 'Irrigation (gain de production)', en: 'Irrigation (yield gain)', icon: '💧' },
        { k: 'seed', fr: 'Semences améliorées', en: 'Improved seed', icon: '🌱' },
        { k: 'extension', fr: 'Conseil numérique', en: 'Digital advisory', icon: '📱' },
        { k: 'biofort', fr: 'Biofortification', en: 'Biofortification', icon: '🧬' }
      ];
      const sliderRefs = {};
      LEVERS.forEach(l => {
        const s = slider({
          label: l.icon + ' ' + T(l.fr, l.en), min: 0, max: 100, value: Math.round((state.levers[l.k] || 0) * 100), step: 5,
          format: v => fmt.num(v, 0) + ' %',
          oninput: v => { state.levers[l.k] = v / 100; queue(); }
        });
        sliderRefs[l.k] = s;
        slidersHost.appendChild(s);
      });
      let inputTimer = null;
      function queue() { clearTimeout(inputTimer); inputTimer = setTimeout(recompute, 190); }

      function autoOptimize() {
        const cat = M.interventions(ds);
        const opt = M.optimizeBudget(ds, cat, state.budget, { priority: state.priority });
        Object.keys(opt.levers).forEach(k => { state.levers[k] = NX.clamp(opt.levers[k], 0, 1); if (sliderRefs[k]) sliderRefs[k]._set(Math.round(state.levers[k] * 100)); });
        recompute();
        overlay.toast('🎯 ' + T('Combinaison optimisée : ', 'Optimised combination: ') + opt.plan.map(p => p.icon).slice(0, 4).join(' '));
        api.setPlan(M.lossSim(ds, state.levers));
      }
      function resetLevers() {
        Object.keys(state.levers).forEach(k => state.levers[k] = 0);
        Object.keys(sliderRefs).forEach(k => sliderRefs[k]._set(0));
        recompute();
      }
      function applyToPlan() {
        const sim = M.lossSim(ds, state.levers);
        api.setPlan(sim);
        state.selected = M.interventions(ds).slice(0, 5).map(i => i.id + '|' + i.region);
        overlay.toast('✓ ' + T('Scénario appliqué aux prévisions et au plan d’investissement', 'Scenario applied to forecasts and investment plan'));
      }
      function recompute() {
        const sim = M.lossSim(ds, state.levers);
        state.lossesLast = sim;
        resultsHost.innerHTML = '';
        resultsHost.appendChild(h('div.nx-grid.g-2', null, [
          api.kpi({ label: T('Pertes évitées', 'Losses avoided'), value: fmt.tons(sim.savedT), unit: '/an', tone: 'good', foot: T('de ', 'from ') + fmt.pct(sim.lossPctBefore, 1) + ' → ' + fmt.pct(sim.lossPctAfter, 1) }),
          api.kpi({ label: T('Valeur récupérée', 'Value recovered'), value: fmt.money(sim.savedValueUsd, ds.country), foot: T('prix producteur', 'farmgate prices'), tone: 'good' }),
          api.kpi({ label: T('Investissement', 'Investment'), value: fmt.money(sim.investmentUsd, ds.country), foot: T('+ exploitation ', '+ O&M ') + fmt.money(sim.omUsd, ds.country) }),
          api.kpi({ label: T('Rentabilité (RAC)', 'Benefit-cost ratio'), value: fmt.num(sim.bcr, 2), unit: '×', tone: sim.bcr > 1.3 ? 'good' : sim.bcr < 1 ? 'hot' : '', foot: 'TRI ' + (isFinite(sim.irr) ? fmt.pct(sim.irr * 100, 0) : 'n/a') + ' · ' + T('retour ', 'payback ') + (sim.payback ? fmt.num(sim.payback, 1) + ' ' + T('ans', 'yrs') : T('au-delà de l’horizon', 'beyond horizon')) }),
          api.kpi({ label: T('Personnes nourries', 'People fed'), value: fmt.int(sim.peopleYear), unit: '/an', foot: T('sur la base de 2100 kcal/j', 'based on 2100 kcal/day') }),
          api.kpi({ label: T('Eau économisée', 'Water saved'), value: fmt.compact(sim.waterSavedM3 / 1e6, 2), unit: 'Mm³', foot: T('empreinte eau évitée', 'avoided water footprint') }),
          api.kpi({ label: T('CO₂ évité', 'CO₂ avoided'), value: fmt.compact(sim.co2AvoidedT, 0), unit: 'tCO₂e', foot: T('pertes évitées × facteur', 'avoided losses × factor') }),
          api.kpi({ label: T('Emplois induits', 'Jobs created'), value: fmt.int(sim.jobs), foot: T('construction + services + conseil', 'construction + services + advisory') })
        ]));
        resultsHost.appendChild(h('div.nx-stack', null, [
          meter(T('Taux de pertes après simulation', 'Loss rate after simulation'), sim.lossPctAfter, 40, { format: v => fmt.pct(v, 1), tone: sim.lossPctAfter < 12 ? '' : 'warn' }),
          meter(T('Couverture des besoins supplémentaires', 'Additional needs coverage'), NX.clamp(sim.kcalK / (ds.totals.needT * 2100 / 1000) * 100, 0, 100), 100, { format: v => fmt.pct(v, 1) })
        ]));
        resultsHost.appendChild(note(T('<b>Lecture :</b> chaque point de perte évité est de la nourriture déjà produite — pas une hectare supplémentaire, pas un litre d’eau de plus. C’est l’investissement le plus rentable de la chaîne.', '<b>Reading:</b> every point of loss avoided is food already produced — no extra hectare, no extra litre of water. It is the cheapest win in the chain.'), 'ok'));
        const top = sim.rows.slice(0, 10);
        chart('bars', simChartHost1, {
          labels: top.map(r => NX.lang() === 'en' ? r.en : r.fr),
          series: [
            { name: T('Avant', 'Before'), data: top.map(r => r.lossPctBefore), color: '#ff6b5e' },
            { name: T('Après', 'After'), data: top.map(r => r.lossPctAfter), color: '#18d67f' }
          ],
          format: v => fmt.pct(v, 1), target: 10, targetLabel: T('cible', 'target')
        });
        const cum = []; let c0 = -sim.investmentUsd;
        for (let y = 1; y <= 10; y++) { c0 += sim.annualBenefit * Math.pow(1.012, y - 1); cum.push(c0); }
        chart('line', simChartHost2, {
          labels: cum.map((v, i) => 'A' + (i + 1)),
          series: [{ name: T('Trésorerie cumulée', 'Cumulative cash'), data: cum, color: cum[cum.length - 1] > 0 ? '#18d67f' : '#ff6b5e', area: true }],
          format: v => fmt.money(v, ds.country), zero: true, target: 0, targetLabel: T('retour sur investissement', 'break-even')
        });
      }
      function draw(ds2) {
        const d2 = ds2 || ds;
        kpis.innerHTML = '';
        const ng = M.nutritionGap(d2);
        [
          api.kpi({ label: T('Pertes totales', 'Total losses'), value: fmt.tons(d2.totals.lossT), unit: '/an', tone: 'hot', foot: fmt.pct(d2.totals.lossPct, 1) + T(' de la production', ' of production') }),
          api.kpi({ label: T('Valeur perdue', 'Lost value'), value: fmt.money(d2.totals.lossValueUsd, d2.country), tone: 'hot', foot: T('prix producteur modélisés', 'modelled farmgate value') }),
          api.kpi({ label: T('Valeur perdue / habitant', 'Lost value per capita'), value: fmt.money(d2.totals.lossValueUsd / (d2.totals.population * 1e6), d2.country), foot: d2.totals.population + ' M ' + T('habitants', 'inhabitants') }),
          api.kpi({ label: T('Écart comble par les pertes', 'Gap covered by losses'), value: fmt.pct(NX.clamp(d2.totals.lossT / Math.max(1, d2.totals.gapT) * 100, 0, 999), 0), tone: 'hot', foot: T('si les pertes étaient nulles', 'if losses were zero') })
        ].forEach(k => kpis.appendChild(k));
        const st = M.lossByStage(d2);
        chart('bars', stageHost, {
          labels: st.map(s => NX.lang() === 'en' ? s.en : s.fr),
          series: [{ name: T('Tonnes perdues', 'Tonnes lost'), data: st.map(s => s.value), color: null }],
          format: v => fmt.tons(v),
          colorScale: v => v < 0 ? '#18d67f' : '#ff6b5e'
        });
        const mc = d2.crops.slice().sort((a, b) => b.lossPct - a.lossPct).slice(0, 12);
        chart('bars', cropHost, {
          labels: mc.map(c => NX.lang() === 'en' ? c.en : c.fr),
          series: [{ name: T('Taux de perte', 'Loss rate'), data: mc.map(c => c.lossPct), color: null }],
          format: v => fmt.pct(v, 1), target: 10, targetLabel: T('cible nationale 10 %', 'national target 10%'),
          colorScale: v => v > 25 ? '#ef4444' : v > 15 ? '#f5b642' : '#18d67f',
          onSelect: i => { state.cropId = mc[i].id; overlay.toast(mc[i].icon + ' ' + (NX.lang() === 'en' ? mc[i].en : mc[i].fr)); }
        });
        chart('bars', regionChartHost, {
          labels: d2.regions.map(r => r.name),
          series: [
            { name: T('Pertes (t)', 'Losses (t)'), data: d2.regions.map(r => r.lossT), color: '#ff6b5e' },
            { name: T('Taux (%)', 'Rate (%)'), data: d2.regions.map(r => r.lossPct), color: '#f5b642' }
          ],
          format: v => fmt.compact(v, 1)
        });
        recompute();
      }
      return { render: draw, redraw: () => { } };
    }
  });

  /* ======================================================================= */
  /*  ONGLET 4 — CLIMAT & RÉSILIENCE                                         */
  /* ======================================================================= */
  registerTab({
    id: 'climate', icon: '🌦️', label: T('Climat & résilience', 'Climate & resilience'),
    mount(host) {
      const kpis = h('div.nx-grid.g-6.nx-kpi-row');
      const monthCard = card({ title: T('Cycle annuel : pluie, température, végétation', 'Annual cycle: rain, temperature, vegetation'), sub: T('Moyennes mensuelles modélisées pour la campagne en cours', 'Modelled monthly averages for the current season'), span: 3 });
      const rainHost = chartHost('sm'), tempHost = chartHost('sm'), ndviHost = chartHost('sm');
      monthCard.body.appendChild(rainHost); monthCard.body.appendChild(tempHost); monthCard.body.appendChild(ndviHost);

      const stressCard = card({
        title: T('Simulateur de stress climatique', 'Climate stress simulator'), span: 3, accent: true,
        sub: T('ΔTempérature et ΔPluviométrie → rendements, production, autosuffisance', 'ΔTemperature and ΔRainfall → yields, production, self-sufficiency'),
        actions: [btn(T('Réinitialiser', 'Reset'), { onClick: () => { state.climateCfg = { dTemp: 1.5, dRain: -12, adaptation: 20, horizon: 8 }; draw(); } })]
      });
      const stressSliders = h('div.nx-grid.g-2');
      const stressOut = h('div.nx-stack');
      stressCard.body.appendChild(stressSliders); stressCard.body.appendChild(stressOut);
      const stressChartHost = chartHost('lg');
      stressCard.body.appendChild(stressChartHost);

      const eventCard = card({ title: T('Événements & chocs climatiques', 'Climate events & shocks'), sub: T('Sécheresses, inondations, vagues de chaleur et ravageurs', 'Droughts, floods, heat waves and pests'), span: 2 });
      const eventHost = h('div.nx-timeline');
      eventCard.body.appendChild(eventHost);

      const riskCard = card({ title: T('Vulnérabilité par culture', 'Vulnerability by crop'), sub: T('Perte de rendement simulée (scénario courant) — cliquez pour cibler', 'Simulated yield loss (current scenario) — click to target'), span: 2 });
      const riskHost = chartHost('lg');
      riskCard.body.appendChild(riskHost);

      const rawCard = card({ title: T('Anomalies pluviométriques (2010 → aujourd’hui)', 'Rainfall anomalies (2010 → today)'), sub: T('Indice de stress : négatif = déficit, positif = excès', 'Stress index: negative = deficit, positive = excess'), span: 2 });
      const rawHost = chartHost('sm');
      rawCard.body.appendChild(rawHost);

      /* --- bilan hydrique : la pluie utile face au besoin des cultures ----- */
      const waterCard = card({
        title: T('Bilan hydrique de la campagne', 'Seasonal water balance'),
        sub: T('Pluie utile (75 % de la pluie) face au besoin en eau des cultures, mois par mois', 'Useful rain (75% of rainfall) against crop water demand, month by month'), span: 3
      });
      const waterHost = chartHost('lg');
      const waterNote = h('div.nx-mini.nx-muted');
      waterCard.body.appendChild(waterHost); waterCard.body.appendChild(waterNote);

      /* --- fenêtres de semis : où et quand semer -------------------------- */
      const sowingCard = card({
        title: T('Fenêtres de semis optimales', 'Optimal sowing windows'),
        sub: T('Adéquation pluie / besoin en eau du cycle selon le mois de semis (déficit comme excès d’eau pénalisent) — cliquez une case', 'Rain / cycle water-need match by sowing month (both deficit and excess are penalised) — click a cell'), span: 3
      });
      const sowingHost = chartHost('lg');
      const sowingNote = h('div.nx-note');
      sowingCard.body.appendChild(sowingHost); sowingCard.body.appendChild(sowingNote);

      /* --- exposition climatique par région ------------------------------- */
      const exposureCard = card({
        title: T('Exposition climatique par région', 'Climate exposure by region'),
        sub: T('Indice composite par région — cliquez une barre pour cibler la région', 'Composite index by region — click a bar to target the region'), span: 6
      });
      const exposureHost = chartHost('sm');
      const exposureNote = h('div.nx-mini.nx-muted');
      exposureCard.body.appendChild(exposureHost); exposureCard.body.appendChild(exposureNote);

      host.appendChild(h('div.nx-grid.g-6', null, [kpis, monthCard.el, stressCard.el, waterCard.el, sowingCard.el, riskCard.el, eventCard.el, rawCard.el, exposureCard.el]));

      let keepSliders = false;
      function buildSliders() {
        if (keepSliders) return; keepSliders = true;
        stressSliders.appendChild(slider({
          label: T('Δ Température (°C)', 'Δ Temperature (°C)'), min: 0, max: 4, step: .1, value: state.climateCfg.dTemp, format: v => '+' + fmt.num(v, 1) + ' °C',
          oninput: v => { state.climateCfg.dTemp = v; stress(); }
        }));
        stressSliders.appendChild(slider({
          label: T('Δ Pluviométrie (%)', 'Δ Rainfall (%)'), min: -40, max: 20, step: 1, value: state.climateCfg.dRain, format: v => fmt.signed(v, 0) + ' %',
          oninput: v => { state.climateCfg.dRain = v; stress(); }
        }));
        stressSliders.appendChild(slider({
          label: T('Effort d’adaptation (irrigation, semences, conseil)', 'Adaptation effort (irrigation, seed, advisory)'), min: 0, max: 100, value: state.climateCfg.adaptation,
          format: v => fmt.num(v, 0) + ' %', oninput: v => { state.climateCfg.adaptation = v; stress(); }
        }));
        stressSliders.appendChild(slider({
          label: T('Horizon (années)', 'Horizon (years)'), min: 2, max: 20, value: state.climateCfg.horizon, format: v => fmt.num(v, 0) + ' ' + T('ans', 'yrs'),
          oninput: v => { state.climateCfg.horizon = v; stress(); }
        }));
      }
      function stress() {
        const s = M.climateStress(ds, state.climateCfg);
        stressOut.innerHTML = '';
        stressOut.appendChild(h('div.nx-grid.g-3', null, [
          api.kpi({ label: T('Impact sur la production', 'Production impact'), value: fmt.tons(s.prodDeltaT), tone: s.prodDeltaT < 0 ? 'hot' : 'good', foot: fmt.signed(s.prodDeltaPct, 1) + ' % ' + T('vs situation actuelle', 'vs current') }),
          api.kpi({ label: T('Valeur en jeu', 'Value at risk'), value: fmt.money(Math.abs(s.valueDeltaUsd), ds.country), tone: s.valueDeltaUsd < 0 ? 'hot' : 'good', foot: T('prix producteur', 'farmgate') }),
          api.kpi({ label: T('Autosuffisance projetée', 'Projected self-sufficiency'), value: fmt.num(s.selfSuffNew, 1), unit: '%', tone: s.selfSuffNew < 90 ? 'hot' : '', foot: T('actuelle ', 'current ') + fmt.num(s.selfSuffBase, 1) + ' %' }),
          api.kpi({ label: T('Cultures vulnérables', 'Vulnerable crops'), value: fmt.int(s.vulnerable), foot: T('perte de rendement > 8 %', 'yield loss > 8%'), tone: s.vulnerable > 8 ? 'hot' : '' }),
          api.kpi({ label: T('Écart supplémentaire', 'Additional gap'), value: fmt.tons(s.extraGapT), tone: 'hot', foot: T('nourriture à importer', 'food to import') }),
          api.kpi({ label: T('Gain d’adaptation', 'Adaptation gain'), value: fmt.tons(s.adaptationGainT), tone: 'good', foot: T('effort ', 'effort ') + fmt.num(state.climateCfg.adaptation, 0) + ' %' })
        ]));
        stressOut.appendChild(note(s.prodDeltaPct < -5
          ? T('<b>Alerte :</b> ce scénario fait basculer le pays sous son seuil d’autosuffisance — l’adaptation (irrigation, semences résilientes, conseil) récupère une partie des pertes.', '<b>Alert:</b> this scenario pushes the country below its self-sufficiency threshold — adaptation recovers part of the loss.')
          : T('<b>Situation :</b> le système absorbe ce choc. Surveiller néanmoins les cultures les plus sensibles et les régions déjà en déficit.', '<b>Status:</b> the system absorbs this shock. Still monitor the most sensitive crops and deficit regions.'), s.prodDeltaPct < -5 ? 'risk' : 'ok'));
        const rows = s.rows.slice(0, 12);
        chart('bars', stressChartHost, {
          labels: rows.map(r => NX.lang() === 'en' ? r.en : r.fr),
          horizontal: true,
          series: [{ name: T('Variation de rendement (%)', 'Yield change (%)'), data: rows.map(r => r.deltaPct) }],
          format: v => fmt.signed(v, 1) + ' %',
          colorScale: v => v < -12 ? '#ef4444' : v < 0 ? '#f5b642' : '#18d67f'
        });
      }
      /* --- bilan hydrique et fenêtres de semis -------------------------------
         Le cycle de chaque culture (cycleDays) est réparti sur des mois pleins à
         partir du mois qui suit le mois le plus sec : c'est la campagne
         pluviale. Le besoin en eau (waterMm, mm sur tout le cycle) est alors
         réparti sur ces mois, pondéré par la part de surface de la culture. */
      function cycleMonths(c) { return Math.max(2, Math.min(12, Math.round(c.cycleDays / 30))); }
      function campaignStart(d2) {
        let dry = 0;
        d2.climate.monthly.forEach((x, i) => { if (x.rain < d2.climate.monthly[dry].rain) dry = i; });
        return (dry + 1) % 12;
      }
      function waterBalance(d2) {
        const M12 = d2.climate.monthly, start = campaignStart(d2);
        const demand = new Array(12).fill(0);
        const areaTot = Math.max(1, d2.totals.areaHa);
        d2.crops.forEach(c => {
          const span = cycleMonths(c), part = (c.areaHa / areaTot) * c.waterMm / span;
          for (let k = 0; k < span; k++) demand[(start + k) % 12] += part;
        });
        const useful = M12.map(x => x.rain * .75);
        const deficitMonths = useful.filter((v, i) => demand[i] > v).length;
        return {
          start, demand, useful,
          rainTotal: M12.reduce((a, x) => a + x.rain, 0),
          needTotal: demand.reduce((a, x) => a + x, 0),
          deficitMonths,
          worst: demand.map((v, i) => ({ i, gap: v - useful[i] })).sort((a, b) => b.gap - a.gap)[0]
        };
      }
      /* Adéquation entre la pluie utile du cycle et le besoin en eau de la
         culture si on la sème ce mois-là. La réponse est une cloche centrée sur
         le besoin : un déficit comme un excès d'eau font baisser la note. On la
         corrige ensuite par la sensibilité thermique propre à la culture. */
      function sowingScore(d2, c, m) {
        const span = cycleMonths(c), M12 = d2.climate.monthly;
        let rain = 0, tsum = 0;
        for (let k = 0; k < span; k++) { const x = M12[(m + k) % 12]; rain += x.rain; tsum += x.temp; }
        const ratio = (rain * .75) / Math.max(60, c.waterMm);
        const water = Math.exp(-Math.pow(Math.log(Math.max(.05, ratio)), 2) / .605);   // σ = 0,55
        const heat = Math.max(.45, 1 - Math.max(0, tsum / span - 30) * (c.climateSensitivity[0] / 100) * .6);
        return Math.round(100 * water * heat);
      }
      function drawWater(d2) {
        const wb = waterBalance(d2);
        chart('bars', waterHost, {
          labels: d2.climate.monthly.map(m => m.m),
          series: [
            { name: T('Pluie utile (mm)', 'Useful rain (mm)'), data: wb.useful.map(v => Math.round(v)), color: '#3fc8f0' },
            { name: T('Besoin en eau des cultures (mm)', 'Crop water demand (mm)'), data: wb.demand.map(v => Math.round(v)), color: '#f5b642' }
          ],
          format: v => fmt.num(v, 0) + ' mm'
        });
        const gap = wb.needTotal - wb.rainTotal * .75;
        waterNote.innerHTML = T(
          'Pluie annuelle <b>' + fmt.num(wb.rainTotal, 0) + ' mm</b> · besoin des cultures <b>' + fmt.num(wb.needTotal, 0) + ' mm</b> · '
          + '<b>' + wb.deficitMonths + ' mois</b> sur 12 en déficit hydrique'
          + (gap > 0 ? ' · déficit annuel <b>' + fmt.num(gap, 0) + ' mm</b> ≈ <b>' + fmt.num(gap * d2.totals.areaHa / 1e6, 2) + ' km³</b> d’eau d’irrigation à mobiliser' : '')
          + '. Mois le plus critique : <b>' + d2.climate.monthly[wb.worst.i].m + '</b>.',
          'Annual rainfall <b>' + fmt.num(wb.rainTotal, 0) + ' mm</b> · crop demand <b>' + fmt.num(wb.needTotal, 0) + ' mm</b> · '
          + '<b>' + wb.deficitMonths + ' of 12 months</b> under water deficit'
          + (gap > 0 ? ' · annual deficit <b>' + fmt.num(gap, 0) + ' mm</b> ≈ <b>' + fmt.num(gap * d2.totals.areaHa / 1e6, 2) + ' km³</b> of irrigation water to mobilise' : '')
          + '. Most critical month: <b>' + d2.climate.monthly[wb.worst.i].m + '</b>.');
      }
      function drawSowing(d2) {
        const crops = d2.crops.slice().sort((a, b) => b.areaHa - a.areaHa).slice(0, 8);
        const months = d2.climate.monthly.map(m => m.m);
        const values = crops.map(c => months.map((_, m) => sowingScore(d2, c, m)));
        chart('heat', sowingHost, {
          rows: crops.map(c => c.icon + ' ' + (NX.lang() === 'en' ? c.en : c.fr)),
          cols: months,
          values,
          format: v => fmt.num(v, 0),
          onSelect: (i, j, row, col, v) => {
            const c = crops[i];
            state.cropId = c.id;
            overlay.toast('🌱 ' + (NX.lang() === 'en' ? c.en : c.fr) + ' · ' + col + ' : <b>' + fmt.num(v, 0) + ' %</b> ' + T('du besoin en eau couvert par la pluie', 'of the water need covered by rain'));
            sowingNote.innerHTML = T(
              '<b>' + (NX.lang() === 'en' ? c.en : c.fr) + '</b> ' + T('semé en', 'sown in') + ' <b>' + col + '</b> : cycle de ' + c.cycleDays + ' jours, besoin de ' + fmt.num(c.waterMm, 0) + ' mm d’eau, indice d’adéquation <b>' + fmt.num(v, 0) + ' %</b> · rendement modélisé '
              + fmt.num(c.yieldTha, 2) + ' t/ha · surface ' + fmt.ha(c.areaHa) + '.',
              '<b>' + (NX.lang() === 'en' ? c.en : c.fr) + '</b> sown in <b>' + col + '</b>: ' + c.cycleDays + '-day cycle, ' + fmt.num(c.waterMm, 0) + ' mm water need, match index <b>' + fmt.num(v, 0) + '%</b> · modelled yield '
              + fmt.num(c.yieldTha, 2) + ' t/ha · area ' + fmt.ha(c.areaHa) + '.');
          }
        });
        const best = crops.map(c => {
          const scores = months.map((_, m) => sowingScore(d2, c, m));
          const bi = scores.indexOf(Math.max.apply(null, scores));
          return { n: NX.lang() === 'en' ? c.en : c.fr, m: months[bi], v: scores[bi] };
        }).sort((a, b) => b.v - a.v).slice(0, 3);
        sowingNote.innerHTML = T('Meilleures fenêtres modélisées : ', 'Best modelled windows: ')
          + best.map(b => '<b>' + b.n + '</b> ' + T('en ', 'in ') + b.m + ' (' + b.v + ' %)').join(' · ') + '.';
      }
      function drawExposure(d2) {
        const rs = d2.regions.slice().sort((a, b) => b.climateRisk - a.climateRisk);
        const price = d2.totals.valueUsd / Math.max(1, d2.totals.productionT);
        const avg = S.mean(rs.map(r => r.climateRisk));
        chart('bars', exposureHost, {
          horizontal: true,
          labels: rs.map(r => r.name),
          series: [{ name: T('Indice de risque climatique', 'Climate risk index'), data: rs.map(r => r.climateRisk), color: null }],
          format: v => fmt.num(v, 0) + '/100',
          target: avg, targetLabel: T('moyenne nationale', 'national average'),
          colorScale: v => v > 60 ? '#ef4444' : v > 45 ? '#f5b642' : '#c9ee59',
          onSelect: i => {
            const r = rs[i]; if (!r) return;
            state.region = state.region === r.name ? null : r.name;
            overlay.toast('📍 ' + r.name + ' — ' + T('risque ', 'risk ') + fmt.num(r.climateRisk, 0) + '/100');
          }
        });
        const top = rs.slice(0, 3);
        exposureNote.innerHTML = T('Régions les plus exposées : ', 'Most exposed regions: ')
          + top.map(r => '<b>' + r.name + '</b> (' + fmt.num(r.climateRisk, 0) + '/100 · ' + fmt.money(r.productionT * price, d2.country) + ' ' + T('de production', 'of production') + ')').join(' · ')
          + ' · ' + T('moyenne nationale ', 'national average ') + fmt.num(avg, 0) + '/100.';
      }
      function draw(pd) {
        const d2 = pd || ds;
        kpis.innerHTML = '';
        const ci = d2.history.climateRisk[d2.history.climateRisk.length - 1];
        [
          api.kpi({ label: T('Indice de risque climatique', 'Climate risk index'), value: fmt.num(ci, 0), unit: '/100', tone: ci > 60 ? 'hot' : '', foot: T('composite : pluie, chaleur, végétation', 'composite: rain, heat, vegetation') }),
          api.kpi({ label: T('Anomalie thermique', 'Temperature anomaly'), value: '+' + fmt.num(d2.climate.tempAnomaly, 2), unit: '°C', foot: T('vs 1981-2010', 'vs 1981-2010') }),
          api.kpi({ label: T('Pluviométrie annuelle', 'Annual rainfall'), value: fmt.num(d2.climate.rainBase, 0), unit: 'mm', foot: T('moyenne pondérée des zones', 'weighted zone average') }),
          api.kpi({ label: T('Événements enregistrés', 'Recorded events'), value: fmt.int(d2.climate.events.length), foot: T('sécheresses, crues, chaleurs', 'droughts, floods, heat') })
        ].forEach(k => kpis.appendChild(k));
        chart('bars', rainHost, {
          labels: d2.climate.monthly.map(m => m.m),
          series: [{ name: T('Pluie (mm)', 'Rain (mm)'), data: d2.climate.monthly.map(m => m.rain), color: '#3fc8f0' }],
          format: v => fmt.num(v, 0) + ' mm'
        });
        chart('line', tempHost, {
          labels: d2.climate.monthly.map(m => m.m),
          series: [{ name: T('Température (°C)', 'Temperature (°C)'), data: d2.climate.monthly.map(m => m.temp), color: '#ff6b5e', area: true }],
          format: v => fmt.num(v, 1) + ' °C', zero: false
        });
        chart('line', ndviHost, {
          labels: d2.climate.monthly.map(m => m.m),
          series: [{ name: T('Indice de végétation (NDVI)', 'Vegetation index (NDVI)'), data: d2.climate.monthly.map(m => m.ndvi), color: '#18d67f', area: true }],
          format: v => fmt.num(v, 2), zero: true
        });
        chart('line', rawHost, {
          labels: d2.history.years.map(String),
          series: [{ name: T('Indice de stress pluviométrique', 'Rainfall stress index'), data: d2.history.climateIndex, color: '#f5b642', area: true }],
          format: v => fmt.signed(v, 2), zero: true, target: 0, targetLabel: T('normale 1981-2010', '1981-2010 normal')
        });
        eventHost.innerHTML = '';
        (d2.climate.events.length ? d2.climate.events : [{ year: d2.year, type: 'none', fr: 'Aucun choc majeur modélisé', en: 'No major modelled shock', severity: 0 }]).slice(-9).reverse().forEach(e => {
          eventHost.appendChild(h('div.nx-tl', null, [
            h('i', { class: 'nx-tl-dot ' + (e.severity > 60 ? 'risk' : e.severity > 35 ? 'warn' : '') }),
            h('div', { style: { flex: '1' } }, [
              h('b', { text: e.year + ' · ' + (NX.lang() === 'en' ? e.en : e.fr) }),
              h('div.nx-mini.nx-muted', { text: T('Sévérité ', 'Severity ') + fmt.num(e.severity, 0) + '/100' + (e.pest ? ' · 🐛 ' + e.pest : '') })
            ])
          ]));
        });
        const cs = M.climateStress(d2, state.climateCfg);
        const vul = cs.rows.filter(r => r.deltaPct < 0).slice(0, 12);
        chart('bars', riskHost, {
          labels: vul.map(r => NX.lang() === 'en' ? r.en : r.fr),
          series: [{ name: T('Baisse de rendement simulée', 'Simulated yield drop'), data: vul.map(r => Math.abs(r.deltaPct)), color: null }],
          format: v => fmt.num(v, 1) + ' %', colorScale: v => v > 15 ? '#ef4444' : v > 8 ? '#f5b642' : '#c9ee59'
        });
        buildSliders(); stress();
        drawWater(d2); drawSowing(d2); drawExposure(d2);
      }
      return { render: draw, redraw: () => { } };
    }
  });

  /* ======================================================================= */
  /*  DÉMARRAGE                                                              */
  /* ======================================================================= */
  function boot() {
    if (!d.getElementById('agriRoot')) { console.warn('[NUTRI_AGRI] #agriRoot absent'); return; }
    try { api.rebuildShell(); }
    catch (e) { console.error('[NUTRI_AGRI] montage impossible', e); }
  }
  d.addEventListener('DOMContentLoaded', () => setTimeout(boot, 320));
  d.addEventListener('nutri:i18nChanged', e => {
    const loc = (e && e.detail && e.detail.locale) || 'fr';
    NX.setLang(loc);
    if (!d.getElementById('agriRoot')) return;
    try { api.rebuildShell(activeTab); } catch (err) { console.error('[NUTRI_AGRI] rebuild langue', err); }
  });
  d.addEventListener('nutri:countryChanged', e => {
    const cc = e && e.detail && e.detail.country;
    if (!cc || cc === state.country || !DATA.COUNTRIES[cc]) return;
    state.country = cc; rebuild(); refreshAll();
  });
})(window, document);
