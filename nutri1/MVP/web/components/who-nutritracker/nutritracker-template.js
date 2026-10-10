/* ============================================================================
 * NutriTracker West Africa · Surveillance Communautaire
 * Fichier : nutritracker-template.js
 * Rôle    : Squelette HTML du composant (sidebar, header, KPI, 15 cards) +
 *           bibliothèque d'icônes SVG (trait 1.8px, style "line").
 *           Le contenu dynamique (valeurs, légendes, chips, tableau) est
 *           injecté ensuite par nutritracker-dashboard.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = (global.NutriTracker = global.NutriTracker || {});

  /* ---------- Icônes SVG ---------- */
  const s = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
  const ICONS = {
    logo: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.6"/><path d="M10.5 18.5h3"/><path d="M12 13.6s-3-1.8-3-3.9a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2.1-3 3.9-3 3.9z" fill="#fff" stroke="none"/></svg>',
    overview: s('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    flag: s('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
    ruler: s('<path d="M4 20 20 4"/><path d="m7 17 2 2M10 14l1.5 1.5M13 11l2 2M16 8l1.5 1.5"/><rect x="2.5" y="14.5" width="7" height="7" rx="1" transform="rotate(-45 6 18)" opacity="0"/>'),
    drop: s('<path d="M12 3s6 6.4 6 10.6A6 6 0 0 1 6 13.6C6 9.4 12 3 12 3z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'),
    baby: s('<circle cx="12" cy="7" r="3.2"/><path d="M6.5 21v-3.5a5.5 5.5 0 0 1 11 0V21"/><path d="M10.6 7.2h.01M13.4 7.2h.01"/>'),
    map: s('<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    sync: s('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>'),
    download: s('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    expand: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    search: s('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
    globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    /* Icônes KPI */
    kidRuler: s('<circle cx="9" cy="5.5" r="2.3"/><path d="M9 8.5v6M6 11h6M9 14.5 7 20M9 14.5l2 5.5"/><path d="M17 3v18M17 6h2M17 10h2M17 14h2M17 18h2"/>'),
    muac: s('<path d="M3 9.5c3-2 15-2 18 0v5c-3 2-15 2-18 0z"/><path d="M8 8.4v2.2M12 8v3M16 8.4v2.2"/><path d="M3 12h6" stroke="#FDE68A"/><path d="M9 12h5" stroke="#FCA5A5"/>'),
    phoneUsers: s('<rect x="3" y="3" width="9" height="16" rx="2"/><path d="M6.5 16h2"/><circle cx="17.5" cy="10" r="2.3"/><path d="M14 19a3.5 3.5 0 0 1 7 0"/><path d="M5.5 6.5a4 4 0 0 1 4 0"/>'),
    capsule: s('<rect x="2.8" y="8.2" width="18.4" height="7.6" rx="3.8" transform="rotate(-35 12 12)"/><path d="m9.8 8.9 4.4 6.2"/>'),
    bell: s('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M12 2.5v1.5"/>'),
    arrowUp: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/></svg>',
    arrowDown: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5"/></svg>'
  };
  NT.ICONS = ICONS;

  /* Menu latéral : id de navigation → section cible */
  const NAV = [
    { id: 'overview', icon: 'overview', label: 'Vue Globale Régionale', target: 'sec-overview' },
    { id: 'country', icon: 'flag', label: 'Vue Détaillée par Pays', target: 'sec-overview' },
    { id: 'anthro', icon: 'ruler', label: 'Anthropométrie Terrain', target: 'sec-anthro' },
    { id: 'micro', icon: 'drop', label: 'Micronutriments & Suppléments', target: 'sec-micro' },
    { id: 'anje', icon: 'baby', label: 'Pratiques ANJE (Ménages)', target: 'sec-anje' },
    { id: 'map', icon: 'map', label: 'Carte Interactive & Focus Districts', target: 'sec-map' },
    { id: 'sync', icon: 'sync', label: 'Enregistrements & Synchronisation App', target: 'sec-sync' }
  ];
  NT.NAV = NAV;

  /* ---------- Fabrique de card graphique ---------- */
  function card(o) {
    return '<article class="nt-card ' + o.cls + '" id="card-' + o.id + '" data-card="' + o.id + '">' +
      '<div class="nt-card-head"><div class="nt-card-title"><span class="nt-card-num">G' + o.num + '</span><div>' +
      '<h3 data-title="' + o.id + '">' + o.title + '</h3><p class="nt-card-sub" data-sub="' + o.id + '">' + o.sub + '</p></div></div>' +
      '<div class="nt-card-tools" data-tools="' + o.id + '">' + (o.tools || '') + '</div></div>' +
      (o.chips ? '<div class="nt-chips" data-chips="' + o.id + '"></div>' : '') +
      (o.before || '') +
      (o.chart ? '<div class="nt-chart" data-chart="' + o.id + '" style="height:' + o.height + 'px"></div>' : '') +
      (o.after || '') +
      (o.foot !== false ? '<div class="nt-card-foot" data-foot="' + o.id + '"></div>' : '') +
      '</article>';
  }
  function section(id, icon, title, sub) {
    return '<div class="nt-section" id="' + id + '"><span class="num">' + ICONS[icon] + '</span><div><h2>' + title + '</h2><p>' + sub + '</p></div><span class="line"></span></div>';
  }
  function kpi(cls, icon, extraViz) {
    return '<article class="nt-kpi ' + cls + '" data-kpi="' + cls + '">' +
      '<div class="nt-kpi-head"><span class="nt-kpi-icon">' + ICONS[icon] + '</span><span class="nt-badge" data-badge></span></div>' +
      '<div class="nt-kpi-value" data-value>—</div>' +
      '<div class="nt-kpi-label" data-label></div><div class="nt-kpi-sub" data-sublabel></div>' +
      (extraViz || '') +
      '<div class="nt-kpi-foot" data-foot></div></article>';
  }

  /* ---------- Squelette complet ---------- */
  NT.template = function () {
    const nav = NAV.map((n, i) => '<button class="nt-nav-item' + (i === 0 ? ' active' : '') + '" data-nav="' + n.id + '" title="' + n.label + '">' + ICONS[n.icon] + '<span>' + n.label + '</span></button>').join('');
    return '' +
    '<div class="nt-app" part="app">' +
      /* ---------------- Sidebar ---------------- */
      '<aside class="nt-sidebar" aria-label="Navigation NutriTracker">' +
        '<div class="nt-logo"><span class="nt-logo-mark">' + ICONS.logo + '</span><div><b>NutriTracker AO</b><small>Surveillance communautaire</small></div></div>' +
        '<div class="nt-nav-label">TABLEAU DE BORD</div>' +
        '<nav class="nt-nav">' + nav + '</nav>' +
        '<div class="nt-sidebar-foot">' +
          '<div class="nt-org"><b>Surveillance Nutritionnelle Indépendante / OMS</b>Source : App Mobile de Suivi Nutritionnel Terrain (agents communautaires & ONG)<div class="nt-org-sync"><span class="nt-pulse"></span><span data-side-sync>App v4.2 · synchro active</span></div></div>' +
          '<button class="nt-legacy-btn" data-action="legacy" title="Afficher / masquer les modules WHO NCD historiques de la page">Afficher les modules WHO NCD</button>' +
        '</div>' +
      '</aside>' +
      /* ---------------- Zone principale ---------------- */
      '<div class="nt-main">' +
        '<header class="nt-header">' +
          '<div class="nt-header-top">' +
            '<nav class="nt-breadcrumb" aria-label="Fil d’Ariane"><span>NutriTracker</span><span class="sep">/</span><span>Afrique de l’Ouest</span><span class="sep">/</span><b data-crumb>Mode : Régional</b></nav>' +
            '<button class="nt-live" data-action="sync" title="Forcer une synchronisation"><span class="nt-pulse"></span><span data-sync-text>Dernière synchro app : il y a 12 min</span></button>' +
          '</div>' +
          '<div class="nt-header-main">' +
            '<div><h1>Surveillance Nutritionnelle Terrain</h1><p class="nt-subtitle" data-subtitle>Afrique de l’Ouest · Données App Mobile 2024 · 16 Pays</p></div>' +
            '<div class="nt-header-actions">' +
              '<button class="nt-btn icon" data-action="fullscreen" title="Plein écran">' + ICONS.expand + '</button>' +
              '<div class="nt-menu"><button class="nt-btn primary" data-action="export-menu">' + ICONS.download + '<span data-export-label>Exporter Rapport Région</span></button>' +
                '<div class="nt-menu-pop" data-pop="export">' +
                  '<button data-action="export-pdf"><span class="ico" style="background:#EF4444">PDF</span><span>Rapport PDF<small>KPI, graphiques & scorecard (impression)</small></span></button>' +
                  '<button data-action="export-csv"><span class="ico" style="background:#00A86B">CSV</span><span>Données CSV<small>Scorecard complète de la vue courante</small></span></button>' +
                '</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="nt-filters">' +
            '<div class="nt-seg" role="tablist" aria-label="Mode d’affichage">' +
              '<button class="on" data-mode="region">🌍 Vue Globale Afrique de l’Ouest</button>' +
              '<button data-mode="country">🏳️ Sélectionner un Pays ▾</button>' +
            '</div>' +
            '<div class="nt-picker disabled" data-picker>' +
              '<button class="nt-btn nt-picker-btn" data-action="picker"><span class="code" data-picker-code>NE</span><span data-picker-name>Niger</span><span class="chev"></span></button>' +
              '<div class="nt-pop" data-pop="picker"><input type="search" placeholder="Rechercher un pays…" data-picker-search>' +
                '<div class="nt-pop-head"><span></span><span>Pays</span><span>Stunting</span><span>Score</span></div><div class="nt-pop-list" data-picker-list></div></div>' +
            '</div>' +
            '<span class="nt-divider"></span>' +
            '<span class="nt-filter-label">Période</span>' +
            '<label class="nt-select-wrap"><select data-year aria-label="Année"><option value="2024">2024</option><option value="2023">2023</option><option value="2022">2022</option></select></label>' +
            '<div class="nt-seg sm" data-granularity><button class="on" data-gran="year">Année</button><button data-gran="Q">Trimestre</button><button data-gran="M">Mois</button></div>' +
            '<label class="nt-select-wrap" data-subperiod-wrap hidden><select data-subperiod aria-label="Sous-période"></select></label>' +
          '</div>' +
        '</header>' +

        '<div class="nt-content">' +
          /* Bandeau pays */
          '<div class="nt-banner" data-banner></div>' +

          /* ---------------- KPI ---------------- */
          '<section class="nt-kpis" id="sec-overview" aria-label="Indicateurs clés">' +
            kpi('k-stunting', 'kidRuler', '<div class="nt-kpi-viz" data-kpi-chart="kpiSpark"></div>') +
            kpi('k-wasting', 'muac', '<div class="nt-kpi-row"><div class="nt-kpi-viz gauge" data-kpi-chart="kpiGauge"></div><div class="nt-kpi-side" data-kpi-side="wasting"></div></div>') +
            kpi('k-children', 'phoneUsers', '<div class="nt-kpi-viz" data-kpi-chart="kpiBars"></div>') +
            kpi('k-vita', 'capsule', '<div class="nt-kpi-viz" style="height:50px" data-kpi-chart="kpiProgress"></div>') +
            kpi('k-alerts', 'bell', '<div class="nt-kpi-row"><div class="nt-kpi-viz donut" data-kpi-chart="kpiDonut"></div><div class="nt-kpi-side" data-kpi-side="alerts"></div></div>') +
          '</section>' +

          /* ---------------- 1. Anthropométrie ---------------- */
          section('sec-anthro', 'ruler', 'Anthropométrie Terrain', 'Mesures z-score taille/âge et périmètre brachial (MUAC) saisies par les agents') +
          '<div class="nt-grid">' +
            card({ id: 'g1', num: 1, cls: 's-8 md-12', title: 'Évolution du Stunting (2014-2024)', sub: '', chart: true, height: 330, chips: true, tools: '<div class="nt-legend" data-legend="g1"></div>' }) +
            card({ id: 'g5', num: 5, cls: 's-4 md-6', title: 'Répartition de la Malnutrition Aigüe', sub: 'Dépistage périmètre brachial (PB) via l’App', chart: true, height: 280, after: '<div class="nt-legend v" data-legend="g5" style="margin-top:14px"></div>' }) +
            card({ id: 'g2', num: 2, cls: 's-6 md-12', title: 'Classement de la Prévalence', sub: '', chart: true, height: 460, tools: '<div class="nt-seg sm" data-g2ind><button class="on" data-ind="stunting">Stunting</button><button data-ind="wasting">Émaciation (PB)</button><button data-ind="anemia">Anémie</button><button data-ind="vitA">Vit. A</button></div>' }) +
            card({ id: 'g3', num: 3, cls: 's-6 md-6', title: 'Profil Radar Nutritionnel', sub: 'Multi-axes App Data · indice de performance (100 = optimal)', chart: true, height: 372, chips: true, tools: '<div class="nt-legend" data-legend="g3"></div>' }) +
            card({ id: 'g4', num: 4, cls: 's-7 md-12', title: 'Saisonnalité & Pics de Malnutrition', sub: 'Soudure agricole · cas dépistés dans l’App par mois', chart: true, height: 300, tools: '<div class="nt-legend" data-legend="g4"></div>' }) +
            card({ id: 'g7', num: 7, cls: 's-5 md-12', title: 'Cascade d’Impact des Interventions', sub: 'Réduction du stunting attribuée au suivi communautaire App', chart: true, height: 300 }) +
          '</div>' +

          /* ---------------- 2. Micronutriments ---------------- */
          section('sec-micro', 'drop', 'Micronutriments & Suppléments', 'Couvertures enregistrées lors des campagnes et visites communautaires') +
          '<div class="nt-grid">' +
            card({ id: 'g14', num: 14, cls: 's-7 md-12', title: 'Gauges de Couverture des Micronutriments', sub: 'Taux actuel enregistré dans l’App vs objectif 80%', chart: true, height: 330, tools: '<div class="nt-legend static" data-legend="g14"></div>' }) +
            card({ id: 'g10', num: 10, cls: 's-5 md-12', title: 'Évolution Empilée de l’Anémie', sub: 'Suivi santé maternelle App · 2017 → 2024 · prévalences empilées', chart: true, height: 300, after: '<div class="nt-legend" data-legend="g10" style="margin-top:12px"></div>' }) +
          '</div>' +

          /* ---------------- 3. ANJE ---------------- */
          section('sec-anje', 'baby', 'Pratiques ANJE (Ménages)', 'Alimentation du nourrisson et du jeune enfant · questionnaires ménages dans l’App') +
          '<div class="nt-grid">' +
            card({ id: 'g9', num: 9, cls: 's-5 md-12', title: 'Indicateurs ANJE', sub: 'Questionnaires ménages remplis par les agents', chart: true, height: 380, chips: true, tools: '<div class="nt-legend" data-legend="g9"></div>' }) +
            card({ id: 'g13', num: 13, cls: 's-7 md-12', title: 'Timeline des 1000 Premiers Jours de l’Enfant', sub: 'Parcours de suivi App & impact des rappels automatiques à l’agent', chart: true, height: 290, tools: '<div class="nt-legend static"><button><i style="background:#CBD5E1"></i><span>Sans rappels</span></button><button><i style="background:#00A86B"></i><span>Avec rappels App</span></button></div>', after: '<div class="nt-detail" data-g13-detail></div>' }) +
          '</div>' +

          /* ---------------- 4. Carte & districts ---------------- */
          section('sec-map', 'map', 'Carte Interactive & Focus Districts', 'Matrice de gravité et corrélations par zone') +
          '<div class="nt-grid">' +
            card({ id: 'g8', num: 8, cls: 's-12', title: 'Heatmap Matrice : Zones × Indicateurs Nutritionnels', sub: '', chart: true, height: 560, tools: '<div class="nt-scale"><span>Maîtrisé</span><span class="bar"></span><span>Critique</span></div>' }) +
            card({ id: 'g6', num: 6, cls: 's-6 md-12', title: 'Corrélation : Accès aux Relais App vs Taux de Recovery', sub: 'Taille des bulles = population d’enfants < 5 ans', chart: true, height: 360, tools: '<div class="nt-legend static" data-legend="g6"></div>' }) +
            card({ id: 'g12', num: 12, cls: 's-6 md-12', title: 'WASH (Eau/Hygiène Ménage) vs Malnutrition', sub: 'Score WASH évalué dans l’App × prévalence du stunting', chart: true, height: 360, tools: '' }) +
          '</div>' +

          /* ---------------- 5. Enregistrements & synchro ---------------- */
          section('sec-sync', 'sync', 'Enregistrements & Synchronisation App', 'Flux temps réel des agents terrain et scorecard consolidée') +
          '<div class="nt-grid">' +
            card({ id: 'g11', num: 11, cls: 's-5 md-6', title: 'Polar Chart : Signalements Terrain par Mois', sub: 'Volume d’alertes nutritionnelles envoyées par l’App', chart: true, height: 340 }) +
            '<article class="nt-card s-7 md-6" id="card-syncpanel"><div class="nt-card-head"><div class="nt-card-title"><span class="nt-card-num">LIVE</span><div><h3>Journal de synchronisation</h3><p class="nt-card-sub">Derniers lots de fiches reçus des agents communautaires</p></div></div></div>' +
              '<div class="nt-sync-stats" data-sync-stats></div><div class="nt-sync-list" data-sync-list></div></article>' +
            card({ id: 'g15', num: 15, cls: 's-12', title: 'Tableau Scorecard Complet', sub: '', chart: false, foot: false,
              tools: '<label class="nt-search">' + ICONS.search + '<input type="search" placeholder="Rechercher une zone…" data-search></label>',
              after: '<div class="nt-table-wrap"><table class="nt-table" data-table><thead></thead><tbody></tbody></table></div><div class="nt-table-foot" data-table-foot></div>' }) +
          '</div>' +

          '<footer class="nt-footer"><span><b>NutriTracker West Africa · Surveillance Communautaire</b> — Surveillance Nutritionnelle Indépendante / OMS</span>' +
            '<span>Source : Application Mobile de Suivi Nutritionnel Terrain (agents communautaires & ONG) · données de démonstration</span></footer>' +
        '</div>' +
      '</div>' +

      /* Modal fiche détaillée + toast */
      '<div class="nt-modal" data-modal><div class="nt-modal-card" role="dialog" aria-modal="true"><div class="nt-modal-head"><div><h3 data-modal-title></h3><p data-modal-sub></p></div><button class="nt-btn icon" data-action="close-modal" title="Fermer">' + ICONS.close + '</button></div><div class="nt-modal-body" data-modal-body></div></div></div>' +
      '<div class="nt-toast" data-toast></div>' +
    '</div>';
  };
})(window);
