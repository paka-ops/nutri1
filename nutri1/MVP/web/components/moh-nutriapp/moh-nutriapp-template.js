/* ============================================================================
 * NutriApp Santé · moh-nutriapp-template.js
 * Squelette HTML du composant : sidebar, header, 5 KPI, 15 cards graphiques.
 * Le contenu dynamique est injecté par moh-nutriapp-dashboard.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = (global.MOHNutriApp = global.MOHNutriApp || {});

  /* Icônes SVG (trait 1.8px, style line) */
  const s = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</svg>';
  const ICONS = {
    logo: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M9 12h6M12 9v6"/><circle cx="12" cy="4.8" r="1" fill="#7C3AED" stroke="#fff"/></svg>',
    overview: s('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    crenas: s('<path d="M9 3h6v4l4 10a4 4 0 0 1-4 5H9a4 4 0 0 1-4-5l4-10z"/><path d="M9 11h6"/>'),
    atpe: s('<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-30 12 12)"/><path d="m9 8.5 6 7"/>'),
    anemie: s('<path d="M12 3s6 6.4 6 10.6A6 6 0 0 1 6 13.6C6 9.4 12 3 12 3z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'),
    synchro: s('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>'),
    trends: s('<path d="M3 17l6-6 4 4 8-9"/><path d="M17 6h4v4"/>'),
    download: s('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
    globe: s('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
    arrowUp: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/></svg>',
    arrowDown: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5"/></svg>',
    check: s('<path d="m5 12 4 4 10-12"/>'),
    alert: s('<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.01"/>'),
    target: s('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
    baby: s('<circle cx="12" cy="7" r="3"/><path d="M6.5 21v-3.5a5.5 5.5 0 0 1 11 0V21"/>'),
    phone: s('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 19h4"/>'),
    funnel: s('<path d="M3 4h18l-7 9v6l-4 2v-8z"/>'),
    layers: s('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5"/>'),
    menu: s('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    bell: s('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>')
  };
  MOH.ICONS = ICONS;

  /* Items de navigation sidebar */
  const NAV = [
    { id: 'overview', icon: 'overview', label: 'Vue d\'ensemble (NutriApp)' },
    { id: 'crenas',   icon: 'crenas',   label: 'CRENAS/CRENAM (Prise en charge)' },
    { id: 'atpe',     icon: 'atpe',     label: 'Suivi des Stocks ATPE' },
    { id: 'anemie',   icon: 'anemie',   label: 'Anémie & Micronutriments' },
    { id: 'synchro',  icon: 'synchro',  label: 'Taux de Synchro & Qualité App' },
    { id: 'trends',   icon: 'trends',   label: 'Tendances & Prédictions' }
  ];
  MOH.NAV = NAV;

  /* Fabrique de card graphique */
  function card(o) {
    const widthCls = o.width ? 'w-' + o.width : 'w-50';
    return '<article class="moh-card ' + widthCls + '" id="card-' + o.id + '" data-card="' + o.id + '">' +
      '<div class="moh-card-head">' +
        '<div class="moh-card-title"><span class="moh-card-num">G' + o.num + '</span>' +
          '<div><h3 data-title="' + o.id + '">' + o.title + '</h3>' +
          '<p class="moh-card-sub" data-sub="' + o.id + '">' + o.sub + '</p></div></div>' +
        '<div class="moh-card-tools" data-tools="' + o.id + '">' + (o.tools || '') + '</div>' +
      '</div>' +
      (o.chips ? '<div class="moh-chips" data-chips="' + o.id + '"></div>' : '') +
      (o.before || '') +
      (o.chart !== false ? '<div class="moh-chart" data-chart="' + o.id + '" style="height:' + o.height + 'px"></div>' : '') +
      (o.after || '') +
      '<div class="moh-card-foot" data-foot="' + o.id + '"></div>' +
      '</article>';
  }

  function kpi(cls, icon, extraViz) {
    return '<article class="moh-kpi ' + cls + '" data-kpi="' + cls + '">' +
      '<div class="moh-kpi-head"><span class="moh-kpi-icon">' + ICONS[icon] + '</span><span class="moh-badge" data-badge></span></div>' +
      '<div class="moh-kpi-value" data-value>—</div>' +
      '<div class="moh-kpi-label" data-label></div>' +
      '<div class="moh-kpi-sub" data-sublabel></div>' +
      (extraViz || '') +
      '<div class="moh-kpi-foot" data-foot></div></article>';
  }

  function section(id, icon, title, sub) {
    return '<div class="moh-section" id="sec-' + id + '"><span class="moh-sec-icon">' + ICONS[icon] + '</span>' +
      '<div><h2>' + title + '</h2><p>' + sub + '</p></div><span class="moh-sec-line"></span></div>';
  }

  MOH.template = function () {
    const nav = NAV.map((n, i) =>
      '<button class="moh-nav-item' + (i === 0 ? ' active' : '') + '" data-nav="' + n.id + '" title="' + n.label + '">' + ICONS[n.icon] + '<span>' + n.label + '</span></button>'
    ).join('');

    return '' +
    '<style></style>' +
    '<div class="moh-app" id="mohRoot">' +

      /* ===== SIDEBAR ===== */
      '<aside class="moh-sidebar">' +
        '<div class="moh-logo">' + ICONS.logo + '<div><b>NutriApp Santé</b><span>Min. Santé · Coordination</span></div></div>' +
        '<nav class="moh-nav">' + nav + '</nav>' +
        '<div class="moh-sidebar-foot">' +
          '<div class="moh-sync-mini"><span class="dot"></span><span>Relais terrain actifs</span><b>2 847</b></div>' +
          '<div class="moh-ver">v5.7 · NutriApp West Africa</div>' +
        '</div>' +
      '</aside>' +

      /* ===== MAIN ===== */
      '<main class="moh-main">' +

        /* HEADER */
        '<header class="moh-header">' +
          '<div class="moh-breadcrumb" data-breadcrumb>Ministère de la Santé / NutriApp / Vue Globale</div>' +
          '<div class="moh-header-row">' +
            '<div>' +
              '<h1 class="moh-title">Surveillance Nutritionnelle Terrain</h1>' +
              '<p class="moh-subtitle">Données App Mobile NutriApp · Relais Communautaires &amp; Unités de Soin 2024</p>' +
            '</div>' +
            '<div class="moh-header-actions">' +
              '<div class="moh-sync-badge"><span class="pulse"></span><span data-synctext>Synchro NutriApp : il y a 4 min (142 800 fiches)</span></div>' +
              '<button class="moh-btn moh-btn-primary" data-report>' + ICONS.download + '<span>Générer Rapport NutriApp</span></button>' +
            '</div>' +
          '</div>' +
          '<div class="moh-filters">' +
            '<div class="moh-filter-group">' +
              '<label>Mode</label>' +
              '<div class="moh-segmented" data-mode>' +
                '<button class="active" data-mode-val="region">🌍 Afrique de l\'Ouest</button>' +
                '<button data-mode-val="country">🏳️ Par pays</button>' +
              '</div>' +
            '</div>' +
            '<div class="moh-filter-group" data-country-group style="display:none">' +
              '<label>Pays</label>' +
              '<select class="moh-select" data-country></select>' +
            '</div>' +
            '<div class="moh-filter-group">' +
              '<label>Période</label>' +
              '<div class="moh-segmented" data-period>' +
                '<button class="active" data-period-val="month">Mensuel</button>' +
                '<button data-period-val="quarter">Trimestriel</button>' +
              '</div>' +
            '</div>' +
            '<div class="moh-filter-chips" data-country-chips></div>' +
          '</div>' +
        '</header>' +

        /* 5 KPI */
        '<section class="moh-kpi-grid">' +
          kpi('k1', 'crenas', '<div class="moh-spark" data-spark="adm" style="height:40px"></div>') +
          kpi('k2', 'check', '<div class="moh-gauge-mini" data-gauge="guer" style="height:48px"></div>') +
          kpi('k3', 'alert', '') +
          kpi('k4', 'target', '<div class="moh-gauge-mini" data-gauge="cpn" style="height:48px"></div>') +
          kpi('k5', 'synchro', '<div class="moh-spark" data-spark="sync" style="height:40px"></div>') +
        '</section>' +

        /* Section Charts */
        section('g1', 'trends', 'Admissions & Performance Clinique', 'Évolution 24 mois, performance Sphère et disponibilité des intrants ATPE') +

        '<div class="moh-grid">' +
          card({ id:'g1', num:1, width:60, title:'Admissions CRENAS saisies dans NutriApp (24 mois)',
            sub:'Comparaison 2023 (gris) vs 2024 (violet) · Zone de soudure Juin-Septembre surlignée', height:260 }) +
          card({ id:'g2', num:2, width:40, title:'Performance des Prises en Charge (Scatter Sphère)',
            sub:'Taux de guérison (X) vs Taux d\'abandon (Y) · Référence Sphère ≥75% / <15%', height:260 }) +
          card({ id:'g3', num:3, width:100, title:'Niveaux de Stocks ATPE Géolocalisés dans NutriApp',
            sub:'Jours de consommation restants · Seuil critique 30 jours · Vert >60 · Ambre 45–60 · Orange 30–45 · Rouge <30', height:280 }) +
        '</div>' +

        section('g4', 'layers', 'Performance Districts & Saisonnalité', 'Matrice comparative et distribution mensuelle des signalements') +

        '<div class="moh-grid">' +
          card({ id:'g4', num:4, width:55, title:'Heatmap Performance des Districts NutriApp',
            sub:'Du rouge (faible) au vert (excellent) sur 8 indicateurs clés', height:360 }) +
          card({ id:'g5', num:5, width:45, title:'Saisonnalité des Signalements (Polar Chart)',
            sub:'Distribution mensuelle des cas dépistés sur 3 années', height:360 }) +
        '</div>' +

        section('g6', 'anemie', 'Anémie & Micronutriments', 'Prévalence et couverture effective en suppléments') +

        '<div class="moh-grid">' +
          card({ id:'g6', num:6, width:60, title:'Prévalence Anémie vs Couverture Suppléments (App)',
            sub:'Barres : prévalence par groupe · Ligne verte : distribution effective Fer/Acide folique', height:280 }) +
          card({ id:'g7', num:7, width:40, title:'Heatmap Synchronisation Hebdomadaire NutriApp',
            sub:'52 semaines × 12 districts · Vert = 100% synchro → Rouge = <40%', height:280 }) +
        '</div>' +

        section('g8', 'baby', 'Parcours de Soins & Tendances', 'Dépistage CPN, évolution santé maternelle et tendances multi-métriques') +

        '<div class="moh-grid">' +
          card({ id:'g8', num:8, width:33, title:'Évolution Santé Maternelle & Infantile (2015 vs 2024)',
            sub:'Dumbbell chart · 4 indicateurs registres NutriApp', height:260 }) +
          card({ id:'g9', num:9, width:33, title:'Funnel du Dépistage CPN dans NutriApp',
            sub:'De la consultation à la prise en charge effective', height:260 }) +
          card({ id:'g10', num:10, width:33, title:'Small Multiples · 6 Métriques NutriApp',
            sub:'Tendances courtes avec badges de variation', height:260 }) +
        '</div>' +

        section('g11', 'crenas', 'Comorbidités & Canaux de Dépistage', 'Décomposition des facteurs associés et évolution des canaux') +

        '<div class="moh-grid">' +
          card({ id:'g11', num:11, width:50, title:'Treemap · Comorbidités Associées à la Malnutrition',
            sub:'Données NutriApp · Clic sur une région pour voir le détail', height:300 }) +
          card({ id:'g12', num:12, width:50, title:'Évolution des Canaux de Dépistage NutriApp (2018-2024)',
            sub:'CPN, Pédiatrie, PB/MUAC communautaire, Auto-dépistage mère', height:300 }) +
        '</div>' +

        section('g13', 'target', 'Scores & Profils Nutritionnels', 'Classement par zone, double fardeau et synthèse') +

        '<div class="moh-grid">' +
          card({ id:'g13', num:13, width:33, title:'Lollipop · Score Composite NutriApp par Zone',
            sub:'Objectif national fixé à 70 points', height:300 }) +
          card({ id:'g14', num:14, width:33, title:'Profil Nutritionnel Complet (Stacked 100%)',
            sub:'Coexistence sous-nutrition (MAS, MAM, Risque) et sur-nutrition (Surpoids, Obésité)', height:300 }) +
          card({ id:'g15', num:15, width:33, title:'Scorecard · Unités NutriApp',
            sub:'Récapitulatif opérationnel par zone avec sparklines et statuts', chart:false, height:'auto' }) +
        '</div>' +

        '<footer class="moh-foot">' +
          '<div>Institution : Ministère de la Santé / Coordination NutriApp</div>' +
          '<div>Source : Application Mobile Terrain NutriApp · Agents Communautaires, Cliniques Mobiles &amp; Relais Terrain · Données 2024</div>' +
        '</footer>' +
      '</main>' +
    '</div>';
  };
})(window);
