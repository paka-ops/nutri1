/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : health-nutriapp-template.js
 * Rôle    : Squelette HTML du composant (sidebar, header, KPI, 15 cards) +
 *           bibliothèque d'icônes SVG (trait 1.8px, style « line »).
 *           Le contenu dynamique (valeurs, légendes, tableau, journal
 *           synchro) est injecté ensuite par health-nutriapp-dashboard.js.
 *
 *  Ordre des cartes : ordre de la spécification (G1 → G15), regroupées
 *  sous 6 sections thématiques correspondant à la sidebar. Les largeurs
 *  suivent la spec (60/40, 55/45, 1/3, 50/50, pleine largeur) ; la rangée
 *  G13/G14 occupe toute la ligne (5/7) pour une lisibilité optimale.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = (global.HealthNutriApp = global.HealthNutriApp || {});

  /* ---------- Icônes SVG ---------- */
  const s = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
  const ICONS = {
    /* Logo : croix médicale + smartphone NutriApp */
    logo: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M10.5 18.6h3"/><path d="M12 7.2v5.6M9.2 10h5.6" stroke-width="2.2"/></svg>',
    overview: s('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    care: s('<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M12 9.5v6M9 12.5h6"/>'),
    stocks: s('<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5V20"/>'),
    drop: s('<path d="M12 3s6 6.4 6 10.6A6 6 0 0 1 6 13.6C6 9.4 12 3 12 3z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'),
    scale: s('<path d="M12 4v16M7 20h10"/><path d="M4 7h16"/><path d="M6.5 7 4 13.5a2.6 2.6 0 0 0 5 0L6.5 7zM17.5 7 15 13.5a2.6 2.6 0 0 0 5 0L17.5 7z"/>'),
    sync: s('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>'),
    download: s('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    expand: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    search: s('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
    globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    /* Icônes KPI */
    kids: s('<circle cx="8" cy="7" r="2.6"/><path d="M3.5 20v-4a4.5 4.5 0 0 1 9 0v4"/><circle cx="17" cy="9" r="2.1"/><path d="M15.5 14.2a3.6 3.6 0 0 1 5 3.3V20"/>'),
    person: s('<circle cx="12" cy="6" r="2.8"/><path d="M12 9.5c-3.4 0-5.5 1.7-5.5 4.7 0 3.4 2.4 6.3 5.5 6.3s5.5-2.9 5.5-6.3c0-3-2.1-4.7-5.5-4.7z"/>'),
    heart: s('<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/><path d="M7 12h3l1.5-2.5L13 13l1.2-1H17"/>'),
    alertBox: s('<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M12 9v4"/><path d="M12 16.2h.01"/>'),
    refresh: s('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>'),
    arrowUp: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/></svg>',
    arrowDown: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5"/></svg>'
  };
  HA.ICONS = ICONS;

  /* Menu latéral : id de navigation → section cible */
  const NAV = [
    { id: 'overview', icon: 'overview', label: "Vue d'ensemble (NutriApp)", target: 'sec-overview' },
    { id: 'care', icon: 'care', label: 'CRENAS/CRENAM (Prise en charge)', target: 'sec-care' },
    { id: 'stocks', icon: 'stocks', label: 'Suivi des Stocks ATPE', target: 'sec-stocks' },
    { id: 'anemia', icon: 'drop', label: 'Anémie & Micronutriments', target: 'sec-anemia' },
    { id: 'mnt', icon: 'scale', label: 'Double Fardeau & MNT', target: 'sec-mnt' },
    { id: 'sync', icon: 'sync', label: 'Taux de Synchro & Qualité App', target: 'sec-sync' }
  ];
  HA.NAV = NAV;

  /* ---------- Fabrique de card graphique ---------- */
  function card(o) {
    return '<article class="ha-card ' + o.cls + '" id="card-' + o.id + '" data-card="' + o.id + '">' +
      '<div class="ha-card-head"><div class="ha-card-title"><span class="ha-card-num">G' + o.num + '</span><div>' +
      '<h3 data-title="' + o.id + '">' + o.title + '</h3><p class="ha-card-sub" data-sub="' + o.id + '">' + o.sub + '</p></div></div>' +
      '<div class="ha-card-tools" data-tools="' + o.id + '">' + (o.tools || '') + '</div></div>' +
      (o.before || '') +
      (o.chart ? '<div class="ha-chart" data-chart="' + o.id + '" style="height:' + o.height + 'px"></div>' : '') +
      (o.after || '') +
      (o.foot !== false ? '<div class="ha-card-foot" data-foot="' + o.id + '"></div>' : '') +
      '</article>';
  }
  function section(id, icon, title, sub) {
    return '<div class="ha-section" id="' + id + '"><span class="num">' + ICONS[icon] + '</span><div><h2>' + title + '</h2><p>' + sub + '</p></div><span class="line"></span></div>';
  }
  function kpi(cls, icon, extraViz) {
    return '<article class="ha-kpi ' + cls + '" data-kpi="' + cls + '">' +
      '<div class="ha-kpi-head"><span class="ha-kpi-icon">' + ICONS[icon] + '</span><span class="ha-badge" data-badge></span></div>' +
      '<div class="ha-kpi-value" data-value>—</div>' +
      '<div class="ha-kpi-label" data-label></div><div class="ha-kpi-sub" data-sublabel></div>' +
      (extraViz || '') +
      '<div class="ha-kpi-foot" data-foot></div></article>';
  }

  /* ---------- Squelette complet ---------- */
  HA.template = function () {
    const nav = NAV.map((n, i) => '<button class="ha-nav-item' + (i === 0 ? ' active' : '') + '" data-nav="' + n.id + '" title="' + n.label + '">' + ICONS[n.icon] + '<span>' + n.label + '</span></button>').join('');
    return '' +
    '<div class="ha-app" part="app">' +
      /* ---------------- Sidebar ---------------- */
      '<aside class="ha-sidebar" aria-label="Navigation NutriApp Santé">' +
        '<div class="ha-logo"><span class="ha-logo-mark">' + ICONS.logo + '</span><div><b>NutriApp Santé</b><small>Min. Santé · Surveillance</small></div></div>' +
        '<div class="ha-nav-label">TABLEAU DE BORD</div>' +
        '<nav class="ha-nav">' + nav + '</nav>' +
        '<div class="ha-sidebar-foot">' +
          '<div class="ha-org"><b>Ministère de la Santé / NutriApp</b>Agents communautaires · Cliniques mobiles · PB/MUAC · Enquêtes ménages · Inventaires ATPE<div class="ha-org-sync"><span class="ha-pulse"></span><span data-side-sync>NutriApp v4.2 · synchro active</span></div></div>' +
          '<button class="ha-legacy-btn" data-action="legacy" title="Afficher / masquer les modules Santé historiques de la page">Afficher les modules Santé historiques</button>' +
        '</div>' +
      '</aside>' +
      /* ---------------- Zone principale ---------------- */
      '<div class="ha-main">' +
        '<header class="ha-header">' +
          '<div class="ha-header-top">' +
            '<nav class="ha-breadcrumb" aria-label="Fil d’Ariane"><button data-action="back-region">NutriApp</button><span class="sep">/</span><button data-action="back-region">Afrique de l’Ouest</button><span class="sep">/</span><b data-crumb>Vue Globale</b></nav>' +
            '<button class="ha-live" data-action="sync" title="Forcer une synchronisation"><span class="ha-pulse"></span><span data-sync-text>Synchro NutriApp LIVE · il y a 8 min</span></button>' +
          '</div>' +
          '<div class="ha-header-main">' +
            '<div><h1>NutriApp · Surveillance Nutritionnelle Clinique, Communautaire &amp; MNT</h1><p class="ha-subtitle" data-subtitle>Afrique de l’Ouest · Données NutriApp 2024 · 16 pays</p></div>' +
            '<div class="ha-header-actions">' +
              '<button class="ha-btn icon" data-action="fullscreen" title="Plein écran — mode immersif investisseur">' + ICONS.expand + '</button>' +
              '<div class="ha-menu"><button class="ha-btn primary" data-action="export-menu">' + ICONS.download + '<span data-export-label>Exporter Rapport Région</span></button>' +
                '<div class="ha-menu-pop" data-pop="export">' +
                  '<button data-action="export-pdf"><span class="ico" style="background:#EF4444">PDF</span><span>Rapport PDF<small>KPI, graphiques &amp; scorecard (impression)</small></span></button>' +
                  '<button data-action="export-csv"><span class="ico" style="background:#10B981">CSV</span><span>Données CSV<small>Scorecard complète de la vue courante</small></span></button>' +
                '</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="ha-filters">' +
            '<div class="ha-seg" role="tablist" aria-label="Mode de périmètre">' +
              '<button class="on" data-mode="region">🌍 Vue Globale Afrique de l’Ouest</button>' +
              '<button data-mode="country">🏳️ Vue Détaillée par Pays ▾</button>' +
            '</div>' +
            '<div class="ha-picker disabled" data-picker>' +
              '<button class="ha-btn ha-picker-btn" data-action="picker"><span class="code" data-picker-code>NE</span><span data-picker-name>Niger</span><span class="chev"></span></button>' +
              '<div class="ha-pop" data-pop="picker"><input type="search" placeholder="Rechercher un pays…" data-picker-search>' +
                '<div class="ha-pop-head"><span></span><span>Pays</span><span>Admissions</span><span>Score</span></div><div class="ha-pop-list" data-picker-list></div></div>' +
            '</div>' +
          '</div>' +
        '</header>' +

        '<div class="ha-content">' +
          /* Bandeau pays */
          '<div class="ha-banner" data-banner></div>' +

          /* ---------------- KPI ---------------- */
          '<section class="ha-kpis" id="sec-overview-kpis" aria-label="Indicateurs clés">' +
            kpi('k-admissions', 'kids', '<div class="ha-kpi-viz" data-kpi-chart="kpiSpark"></div>') +
            kpi('k-obesity', 'person', '<div class="ha-kpi-viz" data-kpi-chart="kpiBars"></div>') +
            kpi('k-hyper', 'heart', '<div class="ha-kpi-row"><div class="ha-kpi-viz gauge" data-kpi-chart="kpiGauge"></div><div class="ha-kpi-side" data-kpi-side="hyper"></div></div>') +
            kpi('k-rupture', 'alertBox', '<div class="ha-kpi-viz" style="height:52px" data-kpi-chart="kpiAlert"></div>') +
            kpi('k-sync', 'refresh', '<div class="ha-kpi-row"><div class="ha-kpi-viz donut" data-kpi-chart="kpiDonut"></div><div class="ha-kpi-side" data-kpi-side="sync"></div></div>') +
          '</section>' +

          /* ---------------- Vue d'ensemble : G1 + G2 ---------------- */
          section('sec-overview', 'overview', "Vue d'ensemble", 'Admissions CRENAS et performance des prises en charge (références Sphère)') +
          '<div class="ha-grid">' +
            card({ id: 'g1', num: 1, cls: 's-7 md-12', title: 'Admissions CRENAS Saisies dans NutriApp (24 mois)', sub: 'Comparaison 2024 vs 2023 · période de soudure surlignée', chart: true, height: 330, tools: '<div class="ha-legend" data-legend="g1"></div>' }) +
            card({ id: 'g2', num: 2, cls: 's-5 md-12', title: 'Performance des Prises en Charge (Sphère)', sub: 'Guérison vs abandon · bulles = admissions (clic = zoom pays)', chart: true, height: 330, tools: '<div class="ha-legend static" data-legend="g2"></div>' }) +
          '</div>' +

          /* ---------------- Stocks ATPE : G3 ---------------- */
          section('sec-stocks', 'stocks', 'Suivi des Stocks ATPE', 'Inventaires géolocalisés NutriApp · seuil critique de rupture à 30 jours') +
          '<div class="ha-grid">' +
            card({ id: 'g3', num: 3, cls: 's-12', title: 'Niveaux de Stocks ATPE Géolocalisés dans NutriApp', sub: '', chart: true, height: 340 }) +
          '</div>' +

          /* ---------------- CRENAS/CRENAM : G4 + G5 ---------------- */
          section('sec-care', 'care', 'CRENAS / CRENAM — Prise en charge', 'Performance des zones et saisonnalité des signalements terrain') +
          '<div class="ha-grid">' +
            card({ id: 'g4', num: 4, cls: 's-7 md-12', title: 'Matrice de Performance des Districts NutriApp', sub: '', chart: true, height: 560, tools: '<div class="ha-scale"><span>Maîtrisé</span><span class="bar"></span><span>Critique</span></div>' }) +
            card({ id: 'g5', num: 5, cls: 's-5 md-12', title: 'Saisonnalité des Signalements (Rose)', sub: 'Distribution mensuelle des cas dépistés · 3 cycles', chart: true, height: 420, tools: '<div class="ha-legend" data-legend="g5"></div>' }) +
          '</div>' +

          /* ---------------- Anémie : G6 ---------------- */
          section('sec-anemia', 'drop', 'Anémie & Micronutriments', 'Prévalences par population et couverture en suppléments de fer') +
          '<div class="ha-grid">' +
            card({ id: 'g6', num: 6, cls: 's-7 md-12', title: 'Prévalence de l’Anémie vs Couverture en Suppléments', sub: 'Anémie par catégorie (barres) + distribution de fer (courbe)', chart: true, height: 330, tools: '<div class="ha-legend" data-legend="g6"></div>' }) +
            '<article class="ha-card s-5 md-12" id="card-anemia-info"><div class="ha-card-head"><div class="ha-card-title"><span class="ha-card-num">PROTOCOLE</span><div><h3>Protocole Fer — Suivi App</h3><p class="ha-card-sub">Rappels automatiques aux agents NutriApp</p></div></div></div>' +
              '<div class="ha-synthesis" data-anemia-protocol></div></article>' +
          '</div>' +

          /* ---------------- Synchro : G7 + journal ---------------- */
          section('sec-sync', 'sync', 'Taux de Synchro & Qualité App', 'Régularité des rapports des relais mobiles et journal temps réel') +
          '<div class="ha-grid">' +
            card({ id: 'g7', num: 7, cls: 's-5 md-12', title: 'Heatmap de Synchronisation Hebdomadaire', sub: 'Régularité des rapports transmis (52 semaines)', chart: true, height: 300 }) +
            '<article class="ha-card s-7 md-12" id="card-syncpanel"><div class="ha-card-head"><div class="ha-card-title"><span class="ha-card-num">LIVE</span><div><h3>Journal de synchronisation</h3><p class="ha-card-sub">Derniers lots de fiches reçus des agents et cliniques mobiles</p></div></div></div>' +
              '<div class="ha-synthesis" data-sync-list></div></article>' +
          '</div>' +

          /* ---------------- MNT & parcours : G8 → G14 ---------------- */
          section('sec-mnt', 'scale', 'Double Fardeau, MNT & Parcours de soins', 'Maladies chroniques liées à la nutrition, dépistage CPN et canaux') +
          '<div class="ha-grid">' +
            card({ id: 'g8', num: 8, cls: 's-4 md-12', title: 'Maladies Chroniques & Nutrition (2015 vs 2024)', sub: 'HTA-sel, diabète, obésité, malnutrition chronique', chart: true, height: 360 }) +
            card({ id: 'g9', num: 9, cls: 's-4 md-12', title: 'Funnel du Dépistage CPN dans NutriApp', sub: 'Entonnoir de conversion · gap de femmes non dépistées', chart: true, height: 360 }) +
            card({ id: 'g10', num: 10, cls: 's-4 md-12', title: 'Tendances des 6 Métriques NutriApp', sub: 'Small multiples · 12 derniers mois', chart: true, height: 360 }) +
            card({ id: 'g11', num: 11, cls: 's-6 md-12', title: 'Comorbidités & MNT Associées (App Data)', sub: 'Rectangles proportionnels aux cas enregistrés', chart: true, height: 330, tools: '<div class="ha-legend static" data-legend="g11"></div>' }) +
            card({ id: 'g12', num: 12, cls: 's-6 md-12', title: 'Évolution des Canaux de Dépistage (2018-2024)', sub: 'CPN, pédiatrie, PB communautaire, auto-dépistage', chart: true, height: 330, tools: '<div class="ha-legend" data-legend="g12"></div>' }) +
            card({ id: 'g13', num: 13, cls: 's-5 md-12', title: 'Score Composite NutriApp par Zone', sub: 'Classement vs objectif global de 70 points', chart: true, height: 400 }) +
            card({ id: 'g14', num: 14, cls: 's-7 md-12', title: 'Le Double Fardeau Nutritionnel (100 %)', sub: 'Sous-nutrition vs sur-nutrition & risque HTA', chart: true, height: 400, tools: '<div class="ha-legend" data-legend="g14"></div>' }) +
          '</div>' +

          /* ---------------- Scorecard : G15 ---------------- */
          section('sec-scorecard', 'overview', 'Scorecard des Unités NutriApp', 'Tableau synthétique avec sparklines et badges de statut (incluant MNT)') +
          '<div class="ha-grid">' +
            card({ id: 'g15', num: 15, cls: 's-12', title: 'Tableau Synthétique des Unités NutriApp', sub: '', chart: false, foot: false,
              tools: '<label class="ha-search">' + ICONS.search + '<input type="search" placeholder="Rechercher une zone…" data-search></label>',
              after: '<div class="ha-table-wrap"><table class="ha-table" data-table><thead></thead><tbody></tbody></table></div><div class="ha-table-foot" data-table-foot></div>' }) +
          '</div>' +

          '<footer class="ha-footer"><span><b>NutriApp · Surveillance Nutritionnelle Clinique, Communautaire &amp; MNT</b> — Ministère de la Santé</span>' +
            '<span>Source : application mobile de suivi terrain NutriApp · données de démonstration 2024</span></footer>' +
        '</div>' +
      '</div>' +

      /* Modal fiche détaillée + toast */
      '<div class="ha-modal" data-modal><div class="ha-modal-card" role="dialog" aria-modal="true"><div class="ha-modal-head"><div><h3 data-modal-title></h3><p data-modal-sub></p></div><button class="ha-btn icon" data-action="close-modal" title="Fermer">' + ICONS.close + '</button></div><div class="ha-modal-body" data-modal-body></div></div></div>' +
      '<div class="ha-toast" data-toast></div>' +
    '</div>';
  };
})(window);
