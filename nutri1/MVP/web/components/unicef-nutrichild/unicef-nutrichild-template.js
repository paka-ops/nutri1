/* ============================================================================
 * UNICEF NutriChild · unicef-nutrichild-template.js
 * Rôle : squelette HTML du tableau de bord (sidebar, header, 5 KPI, 6 sections
 *        et 15 cards graphiques) + bibliothèque d'icônes SVG (trait 1,8 px).
 *        Le contenu dynamique est injecté ensuite par le contrôleur
 *        unicef-nutrichild-dashboard.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = (global.NutriChild = global.NutriChild || {});

  /* ---------- Icônes SVG (style « line », tracé 1,8 px) ---------- */
  const s = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';

  const ICONS = {
    /* Logo : silhouette d'enfant + globe + smartphone (app mobile UNICEF) */
    logo: '<svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="16" cy="16" r="12.4" opacity="0.92"/>' +
      '<path d="M3.6 16h24.8M16 3.6a19 19 0 0 1 0 24.8M16 3.6a19 19 0 0 0 0 24.8" opacity="0.55"/>' +
      '<circle cx="12.6" cy="12.2" r="2.5" fill="#fff" stroke="none"/>' +
      '<path d="M8.6 20.4v-2.2a4 4 0 0 1 8 0v2.2" fill="#fff" stroke="none"/>' +
      '<rect x="19.6" y="13.4" width="6.4" height="10.6" rx="1.7" fill="#002952" stroke="#fff" stroke-width="1.4"/>' +
      '<path d="M21.9 21.4h1.9" stroke="#fff" stroke-width="1.4"/></svg>',
    /* Navigation */
    kid: s('<circle cx="10" cy="5.6" r="2.6"/><path d="M10 8.6v6.2M6.6 11.2h6.8M10 14.8 8 20.4M10 14.8l2 5.6"/><path d="M18.6 4v16M18.6 7h2.4M18.6 11h2.4M18.6 15h2.4"/>'),
    anje: s('<circle cx="12" cy="7.2" r="3.2"/><path d="M6.6 21v-3.4a5.4 5.4 0 0 1 10.8 0V21"/><path d="M10.7 7.4h.01M13.3 7.4h.01"/><path d="M9.2 12.4h5.6"/>'),
    hospital: s('<path d="M4 21V8.4L12 3l8 5.4V21"/><path d="M9.6 21v-5.4h4.8V21"/><path d="M12 8.4v4M10 10.4h4"/>'),
    pills: s('<rect x="2.8" y="8.2" width="18.4" height="7.6" rx="3.8" transform="rotate(-35 12 12)"/><path d="m9.8 8.9 4.4 6.2"/><path d="M18.6 17.4h2.8v3.4h-2.8z"/>'),
    water: s('<path d="M12 3s6 6.4 6 10.6A6 6 0 0 1 6 13.6C6 9.4 12 3 12 3z"/><path d="M9.6 14.4a2.4 2.4 0 0 0 2.4 2.4"/>'),
    trend: s('<path d="M3 20h18"/><path d="M5 16.4 9.4 11l3.4 2.8L20 6"/><path d="M20 6h-4.2M20 6v4.2"/>'),
    /* Actions */
    sync: s('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>'),
    download: s('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    expand: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    search: s('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
    close: s('<path d="M6 6l12 12M18 6 6 18"/>'),
    globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    doc: s('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>'),
    alert: s('<path d="M12 4 2.8 20h18.4z"/><path d="M12 9.6v4.6M12 17.2h.01"/>'),
    ruler: s('<path d="M4 20 20 4"/><path d="m7 17 2 2M10 14l1.5 1.5M13 11l2 2M16 8l1.5 1.5"/>'),
    calendar: s('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.6h17M8.4 3v4M15.6 3v4"/>'),
    arrowUp: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/></svg>',
    arrowDown: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5"/></svg>',
    check: '<svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m2.6 7.4 3 3L11.4 4"/></svg>'
  };
  NC.ICONS = ICONS;

  /* ---------- Menu latéral : 6 entrées demandées par le brief ---------- */
  const NAV = [
    { id: 'malnutrition', icon: 'kid',      label: 'Malnutrition Infantile',   sub: 'Dépistage App',            target: 'sec-malnutrition' },
    { id: 'anje',         icon: 'anje',     label: 'Pratiques ANJE & Allaitement', sub: 'Questionnaires ménages', target: 'sec-anje' },
    { id: 'crenas',       icon: 'hospital', label: 'Prise en Charge CRENAS/CRENAM', sub: 'Suivi des dossiers',   target: 'sec-crenas' },
    { id: 'campagnes',    icon: 'pills',    label: 'Campagnes & Supplémentation', sub: 'Vitamine A · Zinc',      target: 'sec-campagnes' },
    { id: 'wash',         icon: 'water',    label: 'WASH & Nutrition Communautaire', sub: 'Eau · hygiène',      target: 'sec-wash' },
    { id: 'tendances',    icon: 'trend',    label: 'Tendances & Suivi Temporel', sub: 'Historique 2016-2024',    target: 'sec-tendances' }
  ];
  NC.NAV = NAV;

  /* ---------- Fabrique de card graphique ---------- */
  function card(o) {
    return '<article class="nc-card ' + (o.cls || '') + '" id="card-' + o.id + '" data-card="' + o.id + '">' +
      '<div class="nc-card-head"><div class="nc-card-title"><span class="nc-card-num">G' + o.num + '</span><div>' +
      '<h3 data-title="' + o.id + '">' + o.title + '</h3>' +
      '<p class="nc-card-sub" data-sub="' + o.id + '">' + (o.sub || '') + '</p></div></div>' +
      '<div class="nc-card-tools" data-tools="' + o.id + '">' + (o.tools || '') + '</div></div>' +
      (o.chips ? '<div class="nc-chips" data-chips="' + o.id + '"></div>' : '') +
      (o.before || '') +
      (o.chart ? '<div class="nc-chart" data-chart="' + o.id + '" style="height:' + o.height + 'px"></div>' : '') +
      (o.after || '') +
      (o.foot !== false ? '<div class="nc-card-foot" data-foot="' + o.id + '"></div>' : '') +
      '</article>';
  }
  function kpi(cls, icon, viz) {
    return '<article class="nc-kpi ' + cls + '" data-kpi="' + cls + '">' +
      '<div class="nc-kpi-head"><span class="nc-kpi-icon">' + ICONS[icon] + '</span><span class="nc-badge" data-badge></span></div>' +
      '<div class="nc-kpi-value" data-value>—</div>' +
      '<div class="nc-kpi-label" data-label></div>' +
      '<div class="nc-kpi-sub" data-sublabel></div>' +
      (viz || '') +
      '<div class="nc-kpi-foot" data-foot></div></article>';
  }
  function section(id, icon, title, sub) {
    return '<div class="nc-section" id="' + id + '"><span class="num">' + ICONS[icon] + '</span>' +
      '<div><h2>' + title + '</h2><p>' + sub + '</p></div><span class="line"></span>' +
      '<span class="nc-section-count" data-count></span></div>';
  }

  /* ---------- Squelette complet ---------- */
  NC.template = function () {
    const nav = NAV.map((n, i) => '<button class="nc-nav-item' + (i === 0 ? ' active' : '') + '" data-nav="' + n.id + '" title="' + n.label + '">' +
      ICONS[n.icon] + '<span>' + n.label + '<small>' + n.sub + '</small></span></button>').join('');

    const countryOptions = NC.DATA.countries.map((c) =>
      '<option value="' + c.code + '">' + c.flag + ' ' + c.name + '</option>').join('');

    return '' +
    '<div class="nc-app" part="app">' +

      /* ============================ SIDEBAR ============================ */
      '<aside class="nc-sidebar" aria-label="Navigation UNICEF NutriChild">' +
        '<div class="nc-logo"><span class="nc-logo-mark">' + ICONS.logo + '</span>' +
          '<div><b>UNICEF NutriChild</b><small>Surveillance nutritionnelle</small></div></div>' +
        '<div class="nc-nav-label">TABLEAU DE BORD</div>' +
        '<nav class="nc-nav">' + nav + '</nav>' +
        '<div class="nc-sidebar-foot">' +
          '<div class="nc-org"><b>UNICEF · Nutrition Infantile</b>' +
            'Source : Application Mobile Terrain UNICEF &amp; Relais Communautaires (Dépistages MUAC &amp; Suivi CRENAS)' +
            '<div class="nc-org-sync"><span class="nc-pulse"></span><span data-side-sync>App v4.2 · synchro active</span></div>' +
          '</div>' +
          '<button class="nc-legacy-btn" data-action="legacy" title="Afficher / masquer les modules UNICEF historiques de la page">Afficher les modules UNICEF historiques</button>' +
        '</div>' +
      '</aside>' +

      /* ============================ ZONE PRINCIPALE ============================ */
      '<div class="nc-main">' +
        '<header class="nc-header">' +
          '<div class="nc-header-top">' +
            '<nav class="nc-breadcrumb" aria-label="Fil d’Ariane">' +
              '<span>UNICEF</span><span class="sep">/</span><span>NutriChildApp</span><span class="sep">/</span>' +
              '<b data-crumb>Mode : Régional</b></nav>' +
            '<button class="nc-live" data-action="sync" title="Forcer une synchronisation avec l’app mobile">' +
              '<span class="nc-pulse"></span><span data-sync-text>Dernière synchro app : il y a 5 min</span></button>' +
          '</div>' +
          '<div class="nc-header-main">' +
            '<div><h1>Surveillance Nutritionnelle Infantile</h1>' +
              '<p class="nc-subtitle" data-subtitle>Données App Mobile Terrain · Agents Communautaires &amp; Centres Nutri 2024</p></div>' +
            '<div class="nc-header-actions">' +
              '<button class="nc-btn icon" data-action="fullscreen" title="Plein écran">' + ICONS.expand + '</button>' +
              '<div class="nc-menu">' +
                '<button class="nc-btn primary" data-action="report">' + ICONS.doc + '<span>Générer Rapport</span></button>' +
                '<div class="nc-menu-pop" data-pop="report">' +
                  '<button data-action="export-pdf"><span class="ico" style="background:#E5243B">PDF</span><span>Rapport PDF<small>KPI, 15 graphiques &amp; scorecard (impression)</small></span></button>' +
                  '<button data-action="export-csv"><span class="ico" style="background:#80BD41">CSV</span><span>Données CSV<small>Scorecard complète de la vue courante</small></span></button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="nc-filters">' +
            '<div class="nc-seg" role="tablist" aria-label="Périmètre d’analyse">' +
              '<button class="on" data-mode="region">🌍 Afrique de l’Ouest (Vue Globale)</button>' +
              '<button data-mode="country">🏳️ Sélectionner un Pays ▾</button>' +
            '</div>' +
            '<label class="nc-select-wrap nc-country" data-country-wrap><select data-country aria-label="Pays">' + countryOptions + '</select></label>' +
            '<span class="nc-divider"></span>' +
            '<span class="nc-filter-label">Période</span>' +
            '<div class="nc-seg sm" data-period>' +
              '<button class="on" data-period-btn="M">Mensuel</button>' +
              '<button data-period-btn="T">Trimestriel</button>' +
            '</div>' +
            '<span class="nc-sync-badge"><span class="nc-pulse"></span><span data-sync-badge>Dernière synchro app : il y a 5 min (528 100 enfants dépistés ce mois)</span></span>' +
          '</div>' +
        '</header>' +

        '<div class="nc-content">' +
          '<div class="nc-banner" data-banner></div>' +

          /* ============================ 5 KPI ============================ */
          '<section class="nc-kpis" id="sec-overview" aria-label="Indicateurs clés">' +
            kpi('k-mas', 'alert', '<div class="nc-kpi-viz" style="height:98px" data-kpi-chart="kpiBars"></div>') +
            kpi('k-ebf', 'anje', '<div class="nc-kpi-row"><div class="nc-kpi-viz gauge" data-kpi-chart="kpiGauge"></div><div class="nc-kpi-side" data-kpi-side="ebf"></div></div>') +
            kpi('k-recovery', 'hospital', '<div class="nc-kpi-viz" style="height:62px" data-kpi-chart="kpiSpark"></div>') +
            kpi('k-vita', 'pills', '<div class="nc-kpi-viz" style="height:62px" data-kpi-chart="kpiProgress"></div>') +
            kpi('k-adm', 'sync', '<div class="nc-kpi-viz" style="height:68px" data-kpi-chart="kpiMonthly"></div>') +
          '</section>' +

          /* ==================== 1. MALNUTRITION INFANTILE ==================== */
          section('sec-malnutrition', 'kid', 'Malnutrition Infantile — Dépistage App',
            'Mesures MUAC / poids / taille saisies par les agents communautaires sur l’application mobile') +
          '<div class="nc-grid">' +
            card({ id: 'g1', num: 1, cls: 's-7 md-12', height: 372, chips: true,
              title: 'Courbes de Croissance OMS vs Relevés Terrain App',
              sub: 'Références OMS 2006 (P3 → P97) et nuage des enfants réellement mesurés sur le terrain',
              chart: true, tools: '<div class="nc-legend" data-legend="g1"></div>' }) +
            card({ id: 'g2', num: 2, cls: 's-5 md-12', height: 372,
              title: 'Tunnel d’Accompagnement MAS (Dépistage App à la Guérison)',
              sub: 'Cascade de soins : du dépistage communautaire à la guérison confirmée dans l’App',
              chart: true, foot: true }) +
            card({ id: 'g9', num: 9, cls: 's-7 md-12', height: 330,
              title: 'Cartographie des Bulles : Prévalence et Volume de MAS',
              sub: 'Taille de bulle = enfants MAS dépistés · couleur = classe de prévalence',
              chart: true, foot: true }) +
            '<article class="nc-card s-5 md-12" id="card-syncpanel">' +
              '<div class="nc-card-head"><div class="nc-card-title"><span class="nc-card-num">LIVE</span><div>' +
              '<h3>Flux de Synchronisation App</h3><p class="nc-card-sub">Derniers lots reçus des relais communautaires et centres Nutri</p></div></div></div>' +
              '<div class="nc-sync-stats" data-sync-stats></div><div class="nc-sync-list" data-sync-list></div></article>' +
          '</div>' +

          /* ==================== 2. PRATIQUES ANJE ==================== */
          section('sec-anje', 'anje', 'Pratiques ANJE & Allaitement',
            'Alimentation du nourrisson et du jeune enfant · questionnaires ménages collectés dans l’App') +
          '<div class="nc-grid">' +
            card({ id: 'g3', num: 3, cls: 's-5 md-12', height: 412, chips: true,
              title: 'Profil Radar ANJE (8 Indicateurs OMS / App Ménages)',
              sub: 'Comparaison multi-périmètres · indicateurs normalisés de 0 à 100',
              chart: true, tools: '<div class="nc-legend" data-legend="g3"></div>' }) +
            card({ id: 'g6', num: 6, cls: 's-7 md-12', height: 502,
              title: 'Heatmap Matrice : Pratiques ANJE par Pays / Districts',
              sub: '8 indicateurs ANJE × périmètre courant · couleur = écart à l’objectif OMS',
              chart: true }) +
            card({ id: 'g12', num: 12, cls: 's-12 md-12', height: 356,
              title: 'Grouped Bar Chart : Indicateurs ANJE Clés',
              sub: '5 pratiques nutritionnelles essentielles comparées entre zones · repère = objectif OMS',
              chart: true, foot: true }) +
          '</div>' +

          /* ==================== 3. PRISE EN CHARGE CRENAS ==================== */
          section('sec-crenas', 'hospital', 'Prise en Charge CRENAS / CRENAM (App)',
            'Dossiers d’admission, protocoles thérapeutiques et statuts de sortie suivis dans l’application') +
          '<div class="nc-grid">' +
            card({ id: 'g4', num: 4, cls: 's-6 md-12', height: 404,
              title: 'Bullet Charts : Performance des CRENAS par Zone',
              sub: 'Performance comparée au seuil humanitaire Sphère · 3 métriques au choix',
              chart: true, chips: true }) +
            card({ id: 'g13', num: 13, cls: 's-6 md-12', height: 404,
              title: 'Polar Chart : Saisonnalité des Admissions CRENAS (Soudure)',
              sub: 'Pics mensuels d’admissions d’enfants sévèrement émaciés · soudure Juin → Septembre',
              chart: true, foot: true }) +
            card({ id: 'g15', num: 15, cls: 's-12 md-12', chart: false, foot: false,
              title: 'Scorecard Tableau Synthétique des Centres Nutri / CRENAS',
              sub: 'Admissions, guérison, abandon, décès, stock d’ATPE et tendance des 12 derniers mois',
              tools: '<label class="nc-search">' + ICONS.search + '<input type="search" placeholder="Rechercher une zone…" data-search></label>',
              after: '<div class="nc-table-wrap"><table class="nc-table" data-table><thead></thead><tbody></tbody></table></div>' +
                     '<div class="nc-table-foot" data-table-foot></div>' }) +
          '</div>' +

          /* ==================== 4. CAMPAGNES & SUPPLÉMENTATION ==================== */
          section('sec-campagnes', 'pills', 'Campagnes & Supplémentation',
            'Couverture des interventions de masse enregistrée par les relais communautaires sur mobile') +
          '<div class="nc-grid">' +
            card({ id: 'g5', num: 5, cls: 's-7 md-12', height: 348,
              title: 'Évolution Empilée des Campagnes de Supplémentation (App)',
              sub: 'Enfants atteints par les relais communautaires · 8 campagnes de 2017 à 2024',
              chart: true, tools: '<div class="nc-legend" data-legend="g5"></div>' }) +
            card({ id: 'g14', num: 14, cls: 's-5 md-12', height: 348,
              title: 'Lollipop Chart : Évolution de la Couverture des Programmes (2022 vs 2024)',
              sub: 'Progression des taux de couverture par zone entre les deux campagnes',
              chart: true, foot: true }) +
          '</div>' +

          /* ==================== 5. WASH ==================== */
          section('sec-wash', 'water', 'WASH & Nutrition Communautaire',
            'Accès à l’eau potable, à l’assainissement et à l’hygiène des ménages enquêtés dans l’App') +
          '<div class="nc-grid">' +
            card({ id: 'g7', num: 7, cls: 's-7 md-12', height: 392,
              title: 'Scatter Plot : Accès Eau/Hygiène (WASH) vs Retard de Croissance',
              sub: 'Corrélation entre le score WASH des ménages et la prévalence du stunting',
              chart: true, foot: true }) +
            '<article class="nc-card s-5 md-12" id="card-alertes">' +
              '<div class="nc-card-head"><div class="nc-card-title"><span class="nc-card-num">ALERTE</span><div>' +
              '<h3>Signaux d’Alerte Nutritionnelle</h3><p class="nc-card-sub">Remontées automatiques des agents et des centres Nutri</p></div></div></div>' +
              '<div class="nc-alerts" data-alerts></div></article>' +
          '</div>' +

          /* ==================== 6. TENDANCES ==================== */
          section('sec-tendances', 'trend', 'Tendances & Suivi Temporel',
            'Séries historiques consolidées et lecture longitudinale de la fenêtre des 1000 premiers jours') +
          '<div class="nc-grid">' +
            card({ id: 'g10', num: 10, cls: 's-6 md-12', height: 372, chips: true,
              title: 'Évolution Historique de la Malnutrition Aigüe (2016-2024)',
              sub: 'Séries annuelles de prévalence MAS · zones d’alerte OMS (> 10 % et > 15 %)',
              chart: true, tools: '<div class="nc-legend" data-legend="g10"></div>' }) +
            card({ id: 'g11', num: 11, cls: 's-6 md-12', height: 396,
              title: 'Donut Double Anneau : Déterminants de la Malnutrition',
              sub: 'Causes directes (anneau externe) et causes sous-jacentes (anneau interne)',
              chart: true }) +
            card({ id: 'g8', num: 8, cls: 's-12 md-12', height: 366,
              title: 'Infographie Chronologique : Les 1000 Premiers Jours de l’Enfant',
              sub: 'Jalons, interventions tracées dans l’App et impact cumulé sur le retard de croissance',
              chart: true }) +
          '</div>' +

          '<footer class="nc-footer">' +
            '<span><b>UNICEF NutriChild · Surveillance Nutritionnelle Infantile</b> — UNICEF · Section Nutrition</span>' +
            '<span>Source : Application Mobile Terrain UNICEF &amp; Relais Communautaires (Dépistages MUAC &amp; Suivi CRENAS) · données de démonstration 2024</span>' +
          '</footer>' +
        '</div>' +
      '</div>' +

      /* Modal « Générer Rapport » + toast + impression */
      '<div class="nc-modal" data-modal><div class="nc-modal-card" role="dialog" aria-modal="true">' +
        '<div class="nc-modal-head"><div><h3 data-modal-title>Générer un rapport</h3><p data-modal-sub></p></div>' +
        '<button class="nc-btn icon" data-action="close-modal" title="Fermer">' + ICONS.close + '</button></div>' +
        '<div class="nc-modal-body" data-modal-body></div>' +
      '</div></div>' +
      '<div class="nc-toast" data-toast></div>' +
    '</div>';
  };
})(window);
