/* ============================================================================
   NUTRI.N°1 — NUTRI CORE · BOÎTE À OUTILS UI PARTAGÉE  (v59)
   ---------------------------------------------------------------------------
   window.NX.ui — briques d'interface réutilisables par TOUTES les sections
   institutionnelles (#agri, #health, #fao, #fao, #unicef, #who…) :

     Mise en page : card(), kpiBand(), kpi(), meter(), note(), flow()
     Contrôles    : field(), select(), segmented(), slider(), toggle(), btn()
     Données      : dataTable()
     Graphiques   : chart(), chartHost()   (enveloppe des graphiques SVG du noyau)
     Animations   : animateKpis()

   Aucune dépendance : uniquement NX (DOM, formats, statistiques, graphiques).
   Aucune règle globale : tout s'appuie sur les classes .nx-* du noyau.
   ========================================================================== */
(function (w, d) {
  'use strict';
  if (!w.NX || w.NX.ui) return;
  const NX = w.NX;
  const { h, fmt, charts: C } = NX;

  /* --------------------------------------------------------------- libellés */
  function T(fr, en) { return NX.lang() === 'en' ? en : fr; }

  /* ------------------------------------------------- grille de tuiles (KPI) */
  /**
   * Rangée de tuiles d'indicateurs en pleine largeur.
   * `.nx-kpi-row` applique auto-fit / minmax : les tuiles gardent une largeur
   * lisible au lieu d'être écrasées en colonnes « bâton ».
   */
  function kpiBand(extraCls) {
    return h('div', { class: 'nx-grid g-6 nx-kpi-band nx-kpi-row ' + (extraCls || '') });
  }

  /* --------------------------------------------------------------- graphiques */
  const controllers = new WeakMap();
  function chart(kind, host, cfg) {
    if (!host) return null;
    const prev = controllers.get(host);
    if (prev && prev.destroy) { try { prev.destroy(); } catch (e) { } }
    host.classList.add('nx-chart');
    const c = C[kind] ? C[kind](host, cfg) : null;
    if (c) controllers.set(host, c);
    return c;
  }
  function chartHost(cls, height) {
    return h('div', { class: 'nx-chart ' + (cls || ''), style: height ? { '--nx-chart-h': height + 'px' } : null });
  }

  /* -------------------------------------------------------------------- carte */
  /**
   * Carte de contenu. opts : {title, sub, icon, actions[], span, accent, flat, cls}
   * span → classe .nx-span-N (1..6) dans une grille .nx-grid.g-6.
   */
  function card(opts) {
    const o = Object.assign({ title: '', sub: '', icon: '', actions: [], span: 0, accent: false, flat: false, cls: '', right: null }, opts);
    const body = h('div.nx-card-body');
    const head = (o.title || o.actions.length || o.right) ? h('div.nx-card-head', null, [
      h('div.nx-title', null, [
        o.title ? h('h3.nx-h3', null, [o.icon ? h('span', { text: o.icon + ' ' }) : null, o.title]) : null,
        o.sub ? h('div.nx-mini.nx-dim', { text: o.sub }) : null
      ]),
      o.actions.length ? h('div.nx-card-actions', null, o.actions) : o.right
    ]) : null;
    const el = h('div', { class: 'nx-card ' + (o.accent ? 'accent ' : '') + (o.flat ? 'flat ' : '') + o.cls + (o.span ? ' nx-span-' + o.span : '') }, [head, body]);
    return { el, body, head };
  }

  /* ---------------------------------------------------------------------- KPI */
  /**
   * Tuile d'indicateur. opts : {label, value, unit, delta, foot, tone, spark,
   * sparkColor, source:'modelled'|'reported', hint}
   * source:null masque l'étiquette de provenance (ex. indicateur de service).
   */
  function kpi(opts) {
    const o = Object.assign({ label: '', value: '', unit: '', delta: null, foot: '', tone: '', spark: null, sparkColor: '#c9ee59', source: 'modelled', hint: '' }, opts);
    const val = h('div.nx-kpi-value', { html: o.value + (o.unit ? ' <small>' + NX.esc(o.unit) + '</small>' : '') });
    const el = h('div', { class: 'nx-kpi ' + (o.tone || ''), title: o.hint || '' }, [
      h('div.nx-kpi-label', { text: o.label }),
      val,
      h('div.nx-kpi-foot', null, [
        h('span', { text: o.foot || '' }),
        o.delta != null ? h('span', { class: 'nx-delta ' + (o.delta > 0 ? 'up' : o.delta < 0 ? 'down' : 'flat'), text: (o.delta > 0 ? '▲ ' : o.delta < 0 ? '▼ ' : '■ ') + fmt.signed(o.delta, 1) + ' %' }) : null
      ]),
      o.spark ? h('div.nx-spark', null, (function () { const s = h('div', { style: { height: '100%' } }); setTimeout(() => C.spark(s, { data: o.spark, color: o.sparkColor }), 0); return s; })()) : null,
      o.source ? h('span.nx-src', { text: o.source === 'reported' ? T('publié', 'reported') : T('modélisé', 'modelled') }) : null
    ]);
    el._setValue = function (v, u) { val.innerHTML = v + (u ? ' <small>' + NX.esc(u) + '</small>' : ''); };
    return el;
  }

  /**
   * Animation de comptage des tuiles d'un bandeau : relit la valeur affichée
   * (séparateurs locaux), l'anime, puis restaure exactement le HTML d'origine.
   * Respecte « prefers-reduced-motion ».
   */
  function animateKpis(row, opts) {
    const o = Object.assign({ ms: 750, hold: 900 }, opts || {});
    if (!row || (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const decSep = NX.lang() === 'fr' ? ',' : '.';
    row.querySelectorAll('.nx-kpi-value').forEach(node => {
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
      if (small) { node.appendChild(d.createTextNode(' ')); node.appendChild(small); }
      NX.countUp(out, n, { dec, ms: o.ms });
      setTimeout(() => { node.innerHTML = html; }, o.hold + o.ms * .2);
    });
  }

  /* ----------------------------------------------------------------- contrôles */
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
    const o = Object.assign({ variant: 'ghost', onClick: null, icon: '', title: '', disabled: false }, opts);
    return h('button', { type: 'button', class: 'nx-btn ' + o.variant, title: o.title, disabled: o.disabled ? 'disabled' : null, onclick: e => { e.preventDefault(); o.onClick && o.onClick(e); } }, [o.icon ? h('span', { text: o.icon }) : null, h('span', { text: label })]);
  }

  /* ------------------------------------------------------------- visualisation */
  function meter(label, value, max, opts) {
    const o = Object.assign({ format: v => fmt.num(v, 1), tone: '', suffix: '' }, opts || {});
    const pctv = Math.max(0, Math.min(100, (value / (max || 100)) * 100));
    const fill = h('i', { style: { width: '0%' }, class: o.tone });
    const bar = h('div.nx-bar-track', null, [fill]);
    setTimeout(() => { fill.style.width = pctv + '%'; }, 30);
    return h('div.nx-meter', null, [
      h('div.nx-meter-head', null, [h('span', { text: label }), h('b', { text: o.format(value) + o.suffix })]),
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
   * Tableau de données générique (grille thémable, triable, paginée).
   * opts : {columns:[{id,label,width,align,format(row,value),bar(row),html(row,value),sortable}],
   *         rows, sort, getSort, onSort, onRow, isSelected, pageSize, empty}
   */
  function dataTable(host, opts) {
    const o = Object.assign({ columns: [], rows: [], sort: null, getSort: null, onSort: null, onRow: null, isSelected: null, pageSize: 12, empty: '—' }, opts);
    host.classList.add('nx-table');
    let page = 0;
    function sortState() { return o.getSort ? o.getSort() : o.sort; }
    function sortVal(r, id) { const v = r[id]; return typeof v === 'string' ? v.toLowerCase() : (v == null ? -Infinity : v); }
    function render() {
      const cols = o.columns;
      const sort = sortState();
      host.innerHTML = '';
      const rowsHost = h('div');      /* recréé à chaque rendu : pas d'accumulation de lignes */
      const grid = cols.map(c => c.width || '1fr').join(' ');
      const head = h('div.nx-thead', { style: { gridTemplateColumns: grid } });
      cols.forEach(c => {
        head.appendChild(h('div', {
          class: 'nx-th' + (c.sortable !== false ? ' sort' : '') + (sort && sort.id === c.id ? ' ' + sort.dir : ''),
          style: { textAlign: c.align || 'left' },
          text: c.label,
          onclick: () => { if (c.sortable === false || !o.onSort) return; o.onSort(c.id, sort && sort.id === c.id && sort.dir === 'asc' ? 'desc' : 'asc'); }
        }));
      });
      host.appendChild(head);
      let rows = o.rows.slice();
      if (sort) {
        const dir = sort.dir === 'asc' ? 1 : -1;
        rows.sort((a, b) => { const va = sortVal(a, sort.id), vb = sortVal(b, sort.id); return (va === vb ? 0 : va > vb ? 1 : -1) * dir; });
      }
      const pages = Math.max(1, Math.ceil(rows.length / o.pageSize));
      page = Math.min(page, pages - 1);
      rows.slice(page * o.pageSize, page * o.pageSize + o.pageSize).forEach(r => {
        const tr = h('div', {
          class: 'nx-tr' + (o.onRow ? ' click' : '') + (o.isSelected && o.isSelected(r) ? ' sel' : ''),
          style: { gridTemplateColumns: grid },
          onclick: () => o.onRow && o.onRow(r)
        });
        cols.forEach(c => {
          const raw = c.value ? c.value(r) : r[c.id];
          const td = h('div.nx-td' + (c.align === 'right' ? ' r' : ''), { style: { textAlign: c.align || 'left' } });
          if (c.bar) {
            td.appendChild(h('div', { text: c.format ? c.format(r, raw) : String(raw == null ? o.empty : raw) }));
            td.appendChild(h('div.nx-bar', null, [h('i', { style: { width: Math.max(0, Math.min(100, c.bar(r))) + '%' } })]));
          } else if (c.html) td.innerHTML = c.html(r, raw);
          else td.textContent = c.format ? c.format(r, raw) : (raw == null ? o.empty : String(raw));
          tr.appendChild(td);
        });
        rowsHost.appendChild(tr);
      });
      host.appendChild(rowsHost);
      if (pages > 1) {
        host.appendChild(h('div.nx-pager', { style: { padding: '8px 12px' } }, [
          h('span', { text: (page + 1) + ' / ' + pages }),
          h('button.nx-btn.sm', { type: 'button', text: '‹', onclick: () => { page = Math.max(0, page - 1); render(); } }),
          h('button.nx-btn.sm', { type: 'button', text: '›', onclick: () => { page = Math.min(pages - 1, page + 1); render(); } })
        ]));
      }
    }
    render();
    return { render, setRows(rows) { o.rows = rows; render(); } };
  }

  NX.ui = {
    __v59: true,
    T, card, kpi, kpiBand, animateKpis, field, select, segmented, slider, toggle, btn,
    meter, note, flow, dataTable, chart, chartHost, controllers
  };
})(window, document);
