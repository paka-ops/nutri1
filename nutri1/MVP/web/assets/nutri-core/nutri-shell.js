/* ============================================================================
   NUTRI.N°1 — NUTRI CORE · COQUILLE DE SECTION  (v59)
   ---------------------------------------------------------------------------
   window.NX.shell(cfg) — construit la coquille commune d'une section
   institutionnelle et renvoie la « boîte à outils » que les onglets utilisent.

   Elle fournit, sans code spécifique à un domaine :
     · en-tête (kicker, titre, sous-titre, jetons, horloge)
     · barre de commande (sélecteurs et boutons fournis par la section)
     · bandeau de KPI pleine largeur (.nx-kpi-band.nx-kpi-row) + animation
     · onglets collants, panneaux montés à la demande, routage #section/onglet
     · tiroirs, modales, notifications (NX.overlay)
     · note de décision et menu d'export (délégués à la section)
     · mode présentation, isolation des événements, recalcul au redimensionnement

   cfg :
     rootId        id du conteneur de la section (ex. 'healthRoot')
     viewId        id de la vue parente (ex. 'health') pour le recalcul à l'affichage
     module        identifiant court (ex. 'health') — bus, hash, export par défaut
     kicker,title,subtitle   textes déjà traduits
     chips         () => [noeuds]  jetons du bandeau
     clock         true|false — horloge UTC
     controls      [noeuds]  lignes de sélecteurs / boutons de la barre de commande
     kpis          (kit) => [noeuds]  tuiles du bandeau (recalculées)
     footerLeft    texte du pied de section
     footerRight   [noeuds]
     rebuild       (kit) => void   recalcul des données après changement de filtre
     brief         (kit) => {kick,title,body}   note de décision (bouton dédié)
     exportMenu    (kit) => noeud                menu d'export (bouton dédié)
     extraButtons  [noeuds]  boutons supplémentaires de la barre de commande
     onShow        (kit, tabId) => void
   ========================================================================== */
(function (w, d) {
  'use strict';
  if (!w.NX || w.NX.shell) return;
  const NX = w.NX;
  const { h, fmt, overlay } = NX;

  function T(fr, en) { return NX.lang() === 'en' ? en : fr; }

  NX.shell = function (cfg) {
    const U = NX.ui;
    const c = Object.assign({
      rootId: '', viewId: '', module: 'module', kicker: '', title: '', subtitle: '',
      chips: null, clock: true, controls: [], kpis: null, footerLeft: '', footerRight: [],
      rebuild: null, brief: null, exportMenu: null, extraButtons: [], onShow: null,
      titleTag: 'h1'
    }, cfg || {});

    /* ------------------------------------------------------------- registre */
    const TABS = [];
    const mounted = {};
    let activeTab = null, root = null, kpiRow = null, tabsRow = null, chipHost = null, liveClock = null;
    const controllers = [];

    const kit = {
      __v59: true, module: c.module, T, NX, ui: U, fmt, stats: NX.stats, charts: NX.charts, overlay,
      card: U.card, kpi: U.kpi, kpiBand: U.kpiBand, field: U.field, select: U.select, segmented: U.segmented,
      slider: U.slider, toggle: U.toggle, btn: U.btn, meter: U.meter, note: U.note, flow: U.flow,
      dataTable: U.dataTable, chart: U.chart, chartHost: U.chartHost,
      get root() { return root; },
      state: null,
      registerTab(def) { TABS.push(def); return def; },
      get tabs() { return TABS; },
      get activeTab() { return activeTab; },
      rebuildShell: function (preferredTab) { rebuildShell(preferredTab); },
      showTab,
      refreshAll,
      toast(msg) { overlay.toast(msg); },
      openDrawer(o) { return overlay.drawer(o); },
      closeDrawer: overlay.closeDrawer,
      runSteps: NX.runSteps,
      scrollTop() { NX.scrollTo(root); },
      exportRows(rows, name, meta) { NX.exporter.csv((name || 'nutri-' + c.module) + '-' + meta + '.csv', rows); },
      exportJSON(obj, name, meta) { NX.exporter.json((name || 'nutri-' + c.module) + '-' + meta + '.json', obj); },
      present: { start: startPresentation, stop: stopPresentation, next: (s) => nextPresentation(s) }
    };

    /* ------------------------------------------------------------------ onglets */
    function showTab(id, opts) {
      const o = opts || {};
      activeTab = id;
      TABS.forEach(t => {
        const p = t.panel; if (!p) return;
        p.classList.toggle('on', t.id === id);
        if (t.button) t.button.classList.toggle('active', t.id === id);
      });
      const tab = TABS.find(t => t.id === id);
      if (tab && !mounted[id] && tab.panel) mounted[id] = tab.mount(tab.panel, kit) || {};
      if (mounted[id] && mounted[id].render) mounted[id].render(kit.ds);
      if (o.scroll !== false && root && root.classList.contains('presenting')) NX.scrollTo(root);
      NX.bus.emit(c.module + ':tab', id);
      try { if (w.location.hash !== '#' + c.module + '/' + id) history.replaceState(null, '', '#' + c.module + '/' + id); } catch (e) { }
      if (c.onShow) c.onShow(kit, id);
    }

    function renderKpis() {
      if (!kpiRow || !c.kpis) return;
      kpiRow.innerHTML = '';
      (c.kpis(kit) || []).forEach(k => k && kpiRow.appendChild(k));
      U.animateKpis(kpiRow);
    }

    function refreshAll() {
      if (c.rebuild) c.rebuild(kit);
      Object.keys(mounted).forEach(k => { if (mounted[k] && mounted[k].render) mounted[k].render(kit.ds); });
      renderKpis();
      if (chipHost && c.chips) { chipHost.innerHTML = ''; (c.chips(kit) || []).forEach(n => n && chipHost.appendChild(n)); }
    }

    /* ------------------------------------------------------------------ coquille */
    function shell() {
      root = d.getElementById(c.rootId);
      if (!root) return null;
      root.innerHTML = '';
      root.classList.add('nx-scope');
      const wrap = h('div.nx-shell');
      root.appendChild(wrap);

      /* --- bandeau supérieur ------------------------------------------- */
      const chipRow = h('div.nx-row', { style: { marginTop: '9px' } });
      if (c.clock) {
        liveClock = h('span', { class: 'nx-mini nx-dim' });
        const tick = () => { if (liveClock.isConnected) liveClock.textContent = fmt.time(new Date()) + ' · UTC'; };
        controllers.push(setInterval(tick, 1000)); tick();
      }
      chipHost = chipRow;
      chipRow.appendChild(h('span.nx-live', null, [h('i.nx-dot'), T('modèles actifs', 'models live')]));
      (c.chips ? c.chips(kit) : []).forEach(n => n && chipRow.appendChild(n));
      if (liveClock) chipRow.appendChild(liveClock);

      const topbar = h('div.nx-card.flat', { style: { gap: '14px' } }, [
        h('div.nx-row.between', { style: { alignItems: 'flex-start' } }, [
          h('div', { style: { minWidth: 'min(520px,100%)' } }, [
            h('div.nx-kicker', { text: c.kicker }),
            h(c.titleTag + '.nx-h1', null, [h('span.nx-grad', { text: c.title })]),
            h('p.nx-mini.nx-muted', { style: { maxWidth: '760px', margin: '6px 0 0' }, text: c.subtitle }),
            chipRow
          ]),
          h('div.nx-stack', { style: { minWidth: '270px' } }, c.controls)
        ])
      ]);
      wrap.appendChild(topbar);

      /* --- bandeau de KPI (pleine largeur) ------------------------------ */
      kpiRow = U.kpiBand();
      wrap.appendChild(kpiRow);

      /* --- onglets ------------------------------------------------------ */
      tabsRow = h('div', { class: 'nx-tabs nx-sticky-tabs', role: 'tablist' });
      wrap.appendChild(tabsRow);
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

      /* --- pied de section ---------------------------------------------- */
      wrap.appendChild(h('div.nx-footer', null, [
        h('span', { text: c.footerLeft }),
        h('span.nx-row', null, c.footerRight)
      ]));

      /* --- isolation : la section ne laisse pas fuir ses événements ------- */
      ['click', 'change', 'input', 'keydown', 'mousedown'].forEach(evt => {
        root.addEventListener(evt, e => { e.stopPropagation(); }, false);
      });
      root.addEventListener('keydown', e => {
        if (e.key === 'Escape') { stopPresentation(); overlay.closeDrawer(); }
        if (e.key === 'ArrowRight' && root.classList.contains('presenting')) nextPresentation(1);
        if (e.key === 'ArrowLeft' && root.classList.contains('presenting')) nextPresentation(-1);
      });

      if (w.ResizeObserver) {
        const ro = new w.ResizeObserver(NX.debounce(() => { Object.keys(mounted).forEach(k => { const m = mounted[k]; if (m && m.redraw) m.redraw(); }); }, 260));
        ro.observe(root);
        controllers.push(ro);
      }
      const view = c.viewId ? d.getElementById(c.viewId) : null;
      if (view && w.MutationObserver) {
        new w.MutationObserver(() => {
          if (!view.classList.contains('on')) return;
          const m = mounted[activeTab];
          if (m && m.render) m.render(kit.ds);
        }).observe(view, { attributes: true, attributeFilter: ['class'] });
      }
      return root;
    }

    function rebuildShell(preferredTab) {
      const keep = preferredTab || activeTab;
      Object.keys(mounted).forEach(k => delete mounted[k]);
      shell();
      renderKpis();
      const hash = (function () { try { return (location.hash || '').split('/')[1]; } catch (e) { return null; } })();
      const first = keep && TABS.some(t => t.id === keep) ? keep : (TABS.some(t => t.id === hash) ? hash : (TABS[0] && TABS[0].id));
      if (first) showTab(first, { scroll: false });
      return root;
    }

    /* ------------------------------------------------------------- présentation */
    let presentTimer = null, presentIdx = 0, presentPaused = false;
    function startPresentation() {
      if (!root) return;
      root.classList.add('presenting');
      d.body.classList.add('nx-present');
      presentIdx = Math.max(0, TABS.findIndex(t => t.id === activeTab));
      if (TABS[presentIdx]) showTab(TABS[presentIdx].id);
      const bar = h('div.nx-progress', { style: { marginTop: '10px' } }, [h('i')]);
      const ctrl = h('div.nx-row.between', { style: { marginTop: '10px' } }, [
        h('span.nx-live', null, [h('i.nx-dot'), T('mode présentation', 'presentation mode')]),
        h('div.nx-row', null, [
          U.btn('‹', { onClick: () => nextPresentation(-1) }),
          U.btn(T('Pause', 'Pause'), { onClick: (e) => { presentPaused = !presentPaused; e.target.textContent = presentPaused ? T('Reprendre', 'Resume') : T('Pause'); } }),
          U.btn('›', { onClick: () => nextPresentation(1) }),
          U.btn(T('Quitter', 'Exit'), { variant: 'danger', onClick: stopPresentation })
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
        NX.bus.on(c.module + ':tab', id => { presentIdx = Math.max(0, TABS.findIndex(t => t.id === id)); step = 0; });
      }
    }
    function nextPresentation(step) {
      if (!root || !root.classList.contains('presenting') || !TABS.length) return;
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

    /* -------------------------------------------------- note de décision / export */
    kit.openBrief = function () {
      if (!c.brief) return null;
      const b = c.brief(kit);
      if (!b) return null;
      const body = h('div.nx-stack');
      body.appendChild(h('div.nx-row.between', null, [
        h('span.nx-chip.lime', { text: b.chip || T('Note exécutive', 'Executive brief') }),
        h('span.nx-mini.nx-dim', { text: b.meta || '' })
      ]));
      body.appendChild(h('div.nx-log', { style: { maxHeight: '46vh' }, text: b.text || '' }));
      body.appendChild(h('div.nx-note.warn', { text: T('Document de démonstration : les valeurs sont modélisées. Toute publication officielle doit être recalibrée sur les sources nationales.', 'Demonstration document: figures are modelled. Any official release must be recalibrated against national sources.') }));
      body.appendChild(h('div.nx-row', null, [
        U.btn(T('Imprimer / PDF', 'Print / PDF'), { variant: 'primary', icon: '🖨', onClick: () => w.print() }),
        U.btn(T('Copier le texte', 'Copy text'), { icon: '⧉', onClick: () => copyText(b.text || '') }),
        U.btn(T('Télécharger (.txt)', 'Download (.txt)'), { icon: '⇩', onClick: () => NX.exporter.download((b.file || 'note') + '.txt', b.text || '', 'text/plain') }),
        b.gotoTab ? U.btn(T('Voir la méthode', 'Methodology'), { icon: '🧪', onClick: () => { overlay.closeDrawer(); showTab(b.gotoTab); } }) : null
      ]));
      return overlay.drawer({ kicker: c.kicker, title: b.title || T('Note de décision', 'Decision brief'), body, width: 'min(840px,96vw)' });
    };
    kit.openExport = function () {
      if (!c.exportMenu) return null;
      return overlay.drawer({ kicker: c.kicker, title: T('Exporter les données', 'Export data'), body: c.exportMenu(kit) });
    };
    function copyText(txt) {
      try {
        if (w.navigator.clipboard) w.navigator.clipboard.writeText(txt);
        else { const ta = h('textarea', { value: txt }); d.body.appendChild(ta); ta.select(); d.execCommand('copy'); ta.remove(); }
        overlay.toast('✓ ' + T('Texte copié', 'Text copied'));
      } catch (e) { overlay.toast(T('Copie indisponible', 'Copy unavailable')); }
    }
    kit.copyText = copyText;

    /* -------------------------------------------------------------- démarrage */
    kit.boot = function () {
      if (!d.getElementById(c.rootId)) { console.warn('[NUTRI_CORE] conteneur #' + c.rootId + ' absent'); return null; }
      try { rebuildShell(); } catch (e) { console.error('[NUTRI_CORE] montage impossible (' + c.module + ')', e); }
      return root;
    };
    kit.refresh = refreshAll;
    return kit;
  };
})(window, document);
