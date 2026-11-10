/* ============================================================================
 * WFP NutriTracker · wfp-nutritracker-template.js
 * Rôle    : Squelette HTML du composant (sidebar, header, filtres, 5 KPI,
 *           15 cards graphiques) + bibliothèque d'icônes SVG inline.
 *           Le contenu dynamique (valeurs, légendes, chips, breadcrumb) est
 *           injecté ensuite par wfp-nutritracker-dashboard.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = (global.WFPTracker = global.WFPTracker || {});

  /* ---------- Icônes SVG (trait 1.8 px, style « line ») ---------- */
  const s = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  const ICONS = {
    /* Logo : épi de blé stylisé doré + smartphone */
    logo: '<svg viewBox="0 0 32 32" width="30" height="30" fill="none">' +
      '<rect x="1" y="4" width="14" height="24" rx="3" fill="#F59E0B"/>' +
      '<rect x="3.4" y="7" width="9.2" height="16" rx="1.4" fill="#1C1008"/>' +
      '<circle cx="8" cy="25.4" r="1.1" fill="#FBBF24"/>' +
      '<g stroke="#FBBF24" stroke-width="1.7" stroke-linecap="round" fill="none">' +
      '<path d="M23 28V13"/>' +
      '<path d="M23 15c-3 0-4.4-1.6-4.4-3.6 2.4-.3 4.4.9 4.4 3.6z" fill="#FBBF24" stroke="none"/>' +
      '<path d="M23 15c3 0 4.4-1.6 4.4-3.6-2.4-.3-4.4.9-4.4 3.6z" fill="#FBBF24" stroke="none"/>' +
      '<path d="M23 20c-3 0-4.4-1.6-4.4-3.6 2.4-.3 4.4.9 4.4 3.6z" fill="#FBBF24" stroke="none"/>' +
      '<path d="M23 20c3 0 4.4-1.6 4.4-3.6-2.4-.3-4.4.9 4.4 3.6z" fill="#FBBF24" stroke="none" transform="translate(-4.4 0)"/>' +
      '<path d="M23 25c-3 0-4.4-1.6-4.4-3.6 2.4-.3 4.4.9 4.4 3.6z" fill="#FBBF24" stroke="none"/>' +
      '<path d="M23 25c3 0 4.4-1.6 4.4-3.6-2.4-.3-4.4.9-4.4 3.6z" fill="#FBBF24" stroke="none"/>' +
      '</g></svg>',
    home: s('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>'),
    food: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5v11M8 8.5c1.6 1.4 1.6 5.6 0 7M16 8.5c-1.6 1.4-1.6 5.6 0 7"/>'),
    market: s('<path d="M3 8h18l-1.4 11.2A2 2 0 0 1 17.6 21H6.4a2 2 0 0 1-2-1.8z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><path d="M9 12.5c1.6 1.8 4.4 1.8 6 0"/>'),
    truck: s('<path d="M2 7h11v9H2z"/><path d="M13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>'),
    chart: s('<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="10" width="3" height="7" rx="1"/>'),
    alert: s('<path d="M12 3 2.8 19h18.4z"/><path d="M12 9.5v4.2M12 16.6h.01"/>'),
    map: s('<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    flag: s('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
    download: s('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    expand: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
    search: s('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    print: s('<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>'),
    /* Icônes KPI */
    users: s('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20a5.6 5.6 0 0 0-2-4"/>'),
    bowl: s('<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M8 7.5c0-1.4 1.2-1.8 1.2-3M12 7.5c0-1.4 1.2-1.8 1.2-3M16 7.5c0-1.4 1.2-1.8 1.2-3"/><path d="M6 20.5h12"/>'),
    warnZone: s('<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M12 9v4M12 16h.01"/>'),
    scan: s('<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>'),
    tag: s('<path d="M4 11.5V4h7.5l8 8-7.5 7.5z"/><circle cx="8" cy="8" r="1.4"/>'),
    arrowUp: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/></svg>',
    arrowDown: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5"/></svg>'
  };
  WFP.ICONS = ICONS;

  /* Menu latéral : id → section cible (scroll animé + scrollspy) */
  const NAV = [
    { id: 'overview', icon: 'home', label: 'Tableau de bord', target: 'sec-kpi' },
    { id: 'foodsec', icon: 'food', label: 'Sécurité Alimentaire (mVAM)', target: 'sec-foodsec' },
    { id: 'markets', icon: 'market', label: 'Marchés & Prix Terrain', target: 'sec-markets' },
    { id: 'ops', icon: 'truck', label: 'Opérations & Distribution App', target: 'sec-ops' },
    { id: 'indicators', icon: 'chart', label: 'Indicateurs IPC & Ménages', target: 'sec-indicators' },
    { id: 'alerts', icon: 'alert', label: 'Alertes Précoces App', target: 'sec-alerts' }
  ];
  WFP.NAV = NAV;

  /* ---------- Fabrique de card graphique ---------- */
  function card(o) {
    return '<article class="wf-card ' + (o.cls || '') + '" id="card-' + o.id + '" data-card="' + o.id + '">' +
      '<div class="wf-card-head">' +
        '<div class="wf-card-title"><span class="wf-card-num">G' + o.num + '</span>' +
          '<div><h3 data-title="' + o.id + '">' + o.title + '</h3>' +
          '<p class="wf-card-sub" data-sub="' + o.id + '">' + (o.sub || '') + '</p></div></div>' +
        '<div class="wf-card-tools" data-tools="' + o.id + '">' + (o.tools || '') + '</div>' +
      '</div>' +
      (o.chips ? '<div class="wf-chips" data-chips="' + o.id + '"></div>' : '') +
      (o.before || '') +
      (o.chart ? '<div class="wf-chart" data-chart="' + o.id + '" style="height:' + o.height + 'px"></div>' : '') +
      (o.after || '') +
      (o.foot !== false ? '<div class="wf-card-foot" data-foot="' + o.id + '"></div>' : '') +
      '</article>';
  }
  function section(id, icon, title, sub) {
    return '<div class="wf-section" id="' + id + '"><span class="ico">' + ICONS[icon] + '</span>' +
      '<div><h2>' + title + '</h2><p>' + sub + '</p></div><span class="line"></span></div>';
  }
  /* Card KPI avec mini-graphique Canvas */
  function kpi(cls, icon, viz) {
    return '<article class="wf-kpi ' + cls + '" data-kpi="' + cls + '">' +
      '<div class="wf-kpi-head"><span class="wf-kpi-icon">' + ICONS[icon] + '</span>' +
      '<span class="wf-badge" data-badge></span></div>' +
      '<div class="wf-kpi-value" data-value>—</div>' +
      '<div class="wf-kpi-label" data-label></div>' +
      '<div class="wf-kpi-sub" data-sublabel></div>' +
      '<div class="wf-kpi-viz" data-kpi-chart="' + cls + '"></div>' +
      '<div class="wf-kpi-foot" data-foot></div>' +
      '</article>';
  }

  /* ---------- Squelette complet ---------- */
  WFP.template = function () {
    const nav = NAV.map((n, i) => '<button class="wf-nav-item' + (i === 0 ? ' active' : '') + '" data-nav="' + n.id + '" title="' + n.label + '">' + ICONS[n.icon] + '<span>' + n.label + '</span></button>').join('');
    const ipcLegend = '<div class="wf-legend" data-legend="g1"></div>';

    return '' +
    '<div class="wf-app">' +
      /* ---------------- Sidebar ---------------- */
      '<aside class="wf-sidebar" aria-label="Navigation WFP NutriTracker">' +
        '<div class="wf-logo"><span class="wf-logo-mark">' + ICONS.logo + '</span>' +
          '<div><b>WFP NutriTracker</b><small>Surveillance communautaire AO</small></div></div>' +
        '<div class="wf-nav-label">TABLEAU DE BORD</div>' +
        '<nav class="wf-nav">' + nav + '</nav>' +
        '<div class="wf-sidebar-foot">' +
          '<div class="wf-org"><b>PAM · Programme Alimentaire Mondial</b>' +
            '<span>Source : Application Mobile Terrain PAM/WFP (Relais Communautaires, mVAM &amp; Points de Distribution)</span>' +
            '<div class="wf-org-sync"><span class="wf-pulse"></span><span data-side-sync>NutriApp Terrain v5.1 · synchro active</span></div></div>' +
          '<button class="wf-legacy-btn" data-action="legacy" title="Afficher ou masquer les modules WFP historiques de la page">Afficher les modules WFP historiques</button>' +
        '</div>' +
      '</aside>' +

      /* ---------------- Zone principale ---------------- */
      '<div class="wf-main">' +
        '<header class="wf-header">' +
          '<div class="wf-header-top">' +
            '<nav class="wf-breadcrumb" aria-label="Fil d’Ariane"><span>PAM</span><span class="sep">/</span>' +
              '<span>WFP NutriTracker</span><span class="sep">/</span><b data-crumb>Mode : Régional</b></nav>' +
            '<button class="wf-live" data-action="sync" title="Forcer une synchronisation de l’App">' +
              '<span class="wf-pulse"></span><span data-sync-text>Synchro App : il y a 8 min (312 400 ménages enquêtés ce mois)</span></button>' +
          '</div>' +
          '<div class="wf-header-main">' +
            '<div><h1>Surveillance Nutritionnelle &amp; Sécurité Alimentaire</h1>' +
              '<p class="wf-subtitle">Données App Mobile Terrain · Enquêtes mVAM &amp; Relais Communautaires 2024</p></div>' +
            '<div class="wf-header-actions">' +
              '<button class="wf-btn icon" data-action="fullscreen" title="Plein écran">' + ICONS.expand + '</button>' +
              '<button class="wf-btn primary" data-action="report">' + ICONS.download + '<span>Générer Rapport</span></button>' +
            '</div>' +
          '</div>' +
          /* Barre de filtrage global */
          '<div class="wf-filters">' +
            '<div class="wf-seg" role="tablist" aria-label="Mode d’analyse">' +
              '<button class="on" data-mode="region">🌍 Afrique de l’Ouest (Vue Globale)</button>' +
              '<button data-mode="country">🏳️ Sélectionner un Pays ▾</button>' +
            '</div>' +
            '<div class="wf-picker disabled" data-picker>' +
              '<button class="wf-btn wf-picker-btn" data-action="picker"><span class="code" data-picker-code>NE</span>' +
                '<span data-picker-name>Niger</span><span class="chev"></span></button>' +
              '<div class="wf-pop" data-pop="picker">' +
                '<label class="wf-search">' + ICONS.search + '<input type="search" placeholder="Rechercher un pays…" data-picker-search></label>' +
                '<div class="wf-pop-head"><span></span><span>Pays</span><span>FCS</span><span>IPC</span></div>' +
                '<div class="wf-pop-list" data-picker-list></div>' +
              '</div>' +
            '</div>' +
            '<span class="wf-divider"></span>' +
            '<span class="wf-filter-label">Période</span>' +
            '<div class="wf-seg sm" data-granularity>' +
              '<button class="on" data-gran="M">Mensuel</button><button data-gran="Q">Trimestriel</button>' +
            '</div>' +
            '<label class="wf-select-wrap"><select data-subperiod aria-label="Période de référence"></select></label>' +
          '</div>' +
        '</header>' +

        '<div class="wf-content">' +
          /* Bandeau de périmètre courant */
          '<div class="wf-banner" data-banner></div>' +

          /* ---------------- 5 KPI ---------------- */
          '<section class="wf-kpis" id="sec-kpi" aria-label="Indicateurs clés">' +
            kpi('k1', 'users') +
            kpi('k2', 'bowl') +
            kpi('k3', 'warnZone') +
            kpi('k4', 'scan') +
            kpi('k5', 'tag') +
          '</section>' +

          /* ---------------- 1. Sécurité alimentaire ---------------- */
          section('sec-foodsec', 'food', 'Sécurité Alimentaire & Phases IPC', 'Classification IPC des zones et évolution du score de consommation alimentaire (mVAM)') +
          '<div class="wf-grid">' +
            card({ id: 'g1', num: 1, cls: 's-7 md-12', title: 'Phases IPC (Global Pays vs Districts du Pays)', sub: '', chart: true, height: 400, tools: ipcLegend }) +
            card({ id: 'g2', num: 2, cls: 's-5 md-12', title: 'Évolution du Score FCS (mVAM App)', sub: '', chart: true, height: 400, tools: '<div class="wf-legend" data-legend="g2"></div>' }) +
          '</div>' +

          /* ---------------- 2. Marchés & prix ---------------- */
          section('sec-markets', 'market', 'Marchés & Prix Terrain', 'Relevés de prix collectés par les agents marchés de l’App et corrélation avec la nutrition') +
          '<div class="wf-grid">' +
            card({ id: 'g3', num: 3, cls: 's-12', title: 'Heatmap Temporelle des Prix du Marché (Relevés App Agents)', sub: '24 mois · 8 produits de base · prix en FCFA/kg', chart: true, height: 330 }) +
            card({ id: 'g9', num: 9, cls: 's-12', title: 'Évolution des Prix des 5 Céréales Clés (20 Trimestres)', sub: 'Relevés hebdomadaires agrégés sur les marchés régionaux', chart: true, height: 320, tools: '<div class="wf-legend" data-legend="g9"></div>' }) +
          '</div>' +

          /* ---------------- 3. Opérations & distribution ---------------- */
          section('sec-ops', 'truck', 'Opérations & Distribution App', 'Chaîne logistique scannée, couverture financière et performance des opérations terrain') +
          '<div class="wf-grid">' +
            card({ id: 'g6', num: 6, cls: 's-4 md-6', title: 'Funnel de Distribution et Logistique PAM (NutriApp)', sub: 'De la cible au bénéficiaire confirmé', chart: true, height: 340 }) +
            card({ id: 'g14', num: 14, cls: 's-4 md-6', title: 'Waterfall Financier et Couverture des Opérations PAM', sub: 'Budget requis → contributions → gap de financement', chart: true, height: 340 }) +
            card({ id: 'g15', num: 15, cls: 's-4 md-12', title: 'Bullet Charts de Performance des Opérations Terrain', sub: 'Indicateurs mesurés via l’App vs objectifs PAM', chart: true, height: 340 }) +
          '</div>' +

          /* ---------------- 4. Indicateurs IPC & ménages ---------------- */
          section('sec-indicators', 'chart', 'Indicateurs IPC & Ménages', 'Stratégies d’adaptation, diversité alimentaire, disponibilité vs accès et carte des alertes') +
          '<div class="wf-grid">' +
            card({ id: 'g4', num: 4, cls: 's-4 md-6', title: 'Stratégies d’Adaptation des Ménages (CSI Radar App)', sub: 'Questionnaires ménages mVAM', chart: true, height: 360, chips: true, tools: '<div class="wf-legend" data-legend="g4"></div>' }) +
            card({ id: 'g5', num: 5, cls: 's-4 md-6', title: 'Corrélation Prix Marchés vs Malnutrition Aigüe (PB/App)', sub: '48 relevés terrain · régression linéaire', chart: true, height: 360 }) +
            card({ id: 'g10', num: 10, cls: 's-4 md-6', title: 'Disponibilité vs Accès Économique Ménages', sub: 'Gap d’accès économique surligné en rouge', chart: true, height: 360 }) +
            card({ id: 'g11', num: 11, cls: 's-6 md-12', title: 'Distribution du Score HDDS (Diversité Alimentaire Ménage)', sub: 'Scores 0 → 12 déclarés dans les formulaires mobiles', chart: true, height: 320 }) +
            card({ id: 'g12', num: 12, cls: 's-6 md-12', title: 'Dumbbell Chart : Évolution du Score FCS (2020 vs 2024)', sub: 'Vert = amélioration · Rouge = dégradation', chart: true, height: 320 }) +
            card({ id: 'g8', num: 8, cls: 's-12', title: 'Carte Interactive des Alertes IPC', sub: '', chart: true, height: 470 }) +
          '</div>' +

          /* ---------------- 5. Alertes précoces ---------------- */
          section('sec-alerts', 'alert', 'Alertes Précoces App', 'Saisonnalité des signalements transmis par les relais communautaires et matrice mensuelle') +
          '<div class="wf-grid">' +
            card({ id: 'g7', num: 7, cls: 's-5 md-12', title: 'Saisonnalité des Alertes de Nutrition (Rose Chart)', sub: 'Volume d’alertes transmises par les relais communautaires', chart: true, height: 380 }) +
            card({ id: 'g13', num: 13, cls: 's-7 md-12', title: 'Matrice des Alertes Nutritionnelles par Mois', sub: 'Fréquence des signalements d’urgence envoyés depuis l’App', chart: true, height: 380 }) +
          '</div>' +

          /* ---------------- Scorecard ---------------- */
          '<div class="wf-grid">' +
            card({
              id: 'scorecard', num: '★', cls: 's-12', title: 'Scorecard Consolidée', sub: 'Toutes les zones du périmètre courant · tri et recherche',
              chart: false, foot: false,
              tools: '<label class="wf-search">' + ICONS.search + '<input type="search" placeholder="Rechercher une zone…" data-search></label>',
              after: '<div class="wf-table-wrap"><table class="wf-table" data-table><thead></thead><tbody></tbody></table></div>' +
                     '<div class="wf-table-foot" data-table-foot></div>'
            }) +
          '</div>' +

          '<footer class="wf-footer">' +
            '<span><b>WFP NutriTracker · Surveillance Communautaire Afrique de l’Ouest</b> — PAM / Programme Alimentaire Mondial</span>' +
            '<span>Source : Application Mobile Terrain PAM/WFP (Relais Communautaires, mVAM &amp; Points de Distribution) · données de démonstration</span>' +
          '</footer>' +
        '</div>' +
      '</div>' +

      /* Menu export + toast */
      '<div class="wf-menu-pop" data-pop="export" hidden>' +
        '<button data-action="report-pdf"><span class="ico" style="background:#EF4444">PDF</span><span>Rapport PDF<small>KPI, graphiques &amp; scorecard (impression)</small></span></button>' +
        '<button data-action="report-csv"><span class="ico" style="background:#10B981">CSV</span><span>Données CSV<small>Scorecard complète de la vue courante</small></span></button>' +
      '</div>' +
      '<div class="wf-toast" data-toast></div>' +
    '</div>';
  };
})(window);
