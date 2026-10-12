/* ============================================================================
 * NutriApp Santé · health-nutriapp-template.js
 * Rôle : squelette HTML du tableau de bord (sidebar 240 px, en-tête fixe avec
 *        fil d'Ariane et double périmètre, 5 KPI, 6 sections et 15 cartes
 *        graphiques, scorecard). Le contenu dynamique est injecté ensuite par
 *        le contrôleur health-nutriapp-dashboard.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;

  /* Icônes SVG (trait 1,8 px, style « line ») */
  const svg = (d, w) => '<svg viewBox="0 0 24 24" width="' + (w || 18) + '" height="' + (w || 18) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    logo: '<svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">' +
      '<rect x="8" y="2" width="16" height="28" rx="4" fill="#FFFFFF" opacity="0.14" stroke="#FFFFFF" stroke-width="1.5"/>' +
      '<rect x="12.5" y="6" width="7" height="2" rx="1" fill="#FFFFFF"/>' +
      '<path d="M16 11v8M12 15h8" stroke="#A855F7" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M8.5 22c2.2 1.6 4.4 2.4 7.5 2.4s5.3-.8 7.5-2.4" stroke="#06B6D4" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
      '<circle cx="16" cy="25.6" r="1" fill="#FFFFFF"/></svg>',
    globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', 16),
    flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', 16),
    chevron: svg('<path d="M6 9l6 6 6-6"/>', 14),
    report: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', 16),
    download: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', 15)
  };
  NH.icons = ICON;

  /* Navigation latérale : 6 entrées (emoji + id de section) */
  const NAV = [
    { id: 'vue', icon: '🏥', label: "Vue d'ensemble (NutriApp)" },
    { id: 'crenas', icon: '📊', label: 'CRENAS/CRENAM (Prise en charge)' },
    { id: 'stocks', icon: '💊', label: 'Suivi des Stocks ATPE' },
    { id: 'anemie', icon: '🩸', label: 'Anémie & Micronutriments' },
    { id: 'sync', icon: '📋', label: 'Taux de Synchro & Qualité App' },
    { id: 'tendances', icon: '📈', label: 'Tendances & Prédictions' }
  ];
  NH.NAV = NAV;

  /* Cartes : id graphique, titre, sous-titre, largeur (sur 12 colonnes), légende */
  const CARDS = {
    vue: [
      { id: 'g1', span: 7, title: 'Admissions CRENAS Saisies dans NutriApp (24 mois)', sub: 'Dual area · 2023 vs 2024 · zone de soudure ambre', legend: 'g1' },
      { id: 'g2', span: 5, title: 'Performance des Prises en Charge NutriApp (Scatter Sphère)', sub: 'Guérison × abandon · taille = volume d\u2019admissions', legend: 'g2' },
      { id: 'g4', span: 7, title: 'Heatmap Matrice de Performance des Districts NutriApp', sub: 'Cliquer une ligne pays pour ouvrir son détail', legend: null },
      { id: 'g15', span: 5, title: 'Scorecard Tableau Synthétique des Unités NutriApp', sub: 'Total admissions · guérison · ruptures · complétude · score', legend: null, scorecard: true }
    ],
    crenas: [
      { id: 'g9', span: 4, title: 'Funnel du Dépistage CPN dans NutriApp', sub: 'De la consultation à la prise en charge', legend: null },
      { id: 'g13', span: 4, title: 'Lollipop Chart : Score Composite NutriApp par Zone', sub: 'Objectif fixé à 70 points', legend: null },
      { id: 'g14', span: 4, title: 'Stacked Bar 100% : Profil Nutritionnel Complet (NutriApp)', sub: 'Sous-nutrition et sur-nutrition coexistent', legend: 'g14' }
    ],
    stocks: [
      { id: 'g3', span: 12, title: 'Niveaux de Stocks ATPE Géolocalisés dans NutriApp', sub: 'Jours de consommation · seuil critique 30 jours', legend: null }
    ],
    anemie: [
      { id: 'g6', span: 7, title: 'Prévalence de l\u2019Anémie vs Couverture en Suppléments (App)', sub: 'Barres : prévalence · Ligne verte : distribution fer / acide folique', legend: 'g6' },
      { id: 'g8', span: 5, title: 'Dumbbell Chart : Évolution de la Santé Maternelle & Infantile (2015 vs 2024)', sub: 'Connected dot chart · 4 indicateurs NutriApp', legend: 'g8' }
    ],
    sync: [
      { id: 'g7', span: 5, title: 'Heatmap de Synchronisation Hebdomadaire NutriApp', sub: '52 semaines · vert = 100 % → rouge < 40 %', legend: 'g7' },
      { id: 'g11', span: 7, title: 'Treemap : Comorbidités Associées à la Malnutrition (App Data)', sub: 'Facteurs enregistrés dans NutriApp', legend: null }
    ],
    tendances: [
      { id: 'g5', span: 5, title: 'Saisonnalité des Signalements NutriApp (Polar Chart)', sub: 'Distribution mensuelle des cas · 3 ans', legend: 'g5' },
      { id: 'g12', span: 7, title: 'Évolution des Canaux de Dépistage NutriApp (2018-2024)', sub: 'CPN · pédiatrie · PB/MUAC · auto-dépistage', legend: 'g12' },
      { id: 'g10', span: 12, title: 'Small Multiples : Tendance des 6 Métriques NutriApp', sub: 'Valeurs 2024 et tendance annuelle', legend: null }
    ]
  };
  NH.CARDS = CARDS;

  /* Légendes HTML associées aux graphiques (id → entrées) */
  NH.LEGENDS = {
    g1: [{ key: 'y23', label: '2023', color: '#94A3B8' }, { key: 'y24', label: '2024', color: NH.THEME.indigo }],
    g2: NH.ZONES.slice(1).map((z) => ({ key: z.id, label: z.label, color: z.color })),
    g5: NH.CHART_LEGEND_G5,
    g6: NH.CHART_LEGEND_G6,
    g8: NH.CHART_LEGEND_G8,
    g12: NH.CHART_LEGEND_G12,
    g14: NH.CHART_LEGEND_G14
  };

  /* Carte HTML d'un graphique */
  function card(c, title, sub) {
    const legend = c.legend
      ? '<div class="hn-legend" data-legend="' + c.legend + '"></div>'
      : '';
    const extra = c.id === 'g7'
      ? '<div class="hn-scale"><span>100 %</span><i></i><span>&lt; 40 %</span></div>'
      : '';
    const body = c.scorecard
      ? '<div class="hn-table-wrap"><table class="hn-table" id="hnScoreTable"></table></div>' +
        '<div class="hn-card-f"><button type="button" class="hn-btn-ghost" data-act="csv">' + ICON.download + ' Exporter CSV</button></div>'
      : '<div class="hn-chart" data-chart="' + c.id + '" style="height:' + (c.h || 300) + 'px"></div>';
    return '<article class="hn-card hn-span-' + c.span + '" data-card="' + c.id + '">' +
      '<header class="hn-card-h"><div><h3>' + title + '</h3><p>' + sub + '</p></div></header>' +
      legend + extra + body + '</article>';
  }

  /* Carte KPI : valeur (animée), libellé, sous-libellé, badge, mini graphique */
  function kpi(i, label, sub, color) {
    return '<article class="hn-kpi hn-in" style="--kc:' + color + '" data-kpi="' + i + '">' +
      '<div class="hn-kpi-top"><span class="hn-kpi-lbl">' + label + '</span></div>' +
      '<div class="hn-kpi-val" data-kpi-val="' + i + '">—</div>' +
      '<div class="hn-kpi-sub">' + sub + '</div>' +
      '<div class="hn-badge" data-kpi-badge="' + i + '">—</div>' +
      '<div class="hn-kpi-chart" data-kpi-chart="' + i + '"></div></article>';
  }

  /* Squelette complet */
  NH.template = function () {
    const nav = NAV.map((n, i) =>
      '<button type="button" class="hn-nav-item' + (i === 0 ? ' on' : '') + '" data-nav="' + n.id + '">' +
      '<span class="hn-nav-ico">' + n.icon + '</span><span>' + n.label + '</span></button>').join('');

    const sections = NAV.map((n) => {
      const cards = (CARDS[n.id] || []).map((c) => card(c, c.title, c.sub)).join('');
      const kpis = n.id === 'vue' ? '<div class="hn-kpis">' + KPI_HTML + '</div>' : '';
      return '<section class="hn-section" id="hn-' + n.id + '" data-section="' + n.id + '">' +
        '<div class="hn-sec-h"><span class="hn-sec-ico">' + n.icon + '</span><h2>' + n.label + '</h2></div>' +
        kpis + '<div class="hn-grid">' + cards + '</div></section>';
    }).join('');

    const zones = NH.ZONES.map((z) => '<button type="button" class="hn-chip' + (z.id === 'all' ? ' on' : '') + '" data-zone="' + z.id + '"><i style="background:' + z.color + '"></i>' + z.label + '</button>').join('');
    const countries = NH.COUNTRIES.map((c) => '<button type="button" class="hn-chip hn-chip-c" data-country="' + c.code + '">' + c.name + '</button>').join('');

    return '<div class="hn-app">' +
      '<aside class="hn-side" aria-label="Navigation NutriApp Santé">' +
        '<div class="hn-brand"><div class="hn-logo">' + ICON.logo + '</div><div><b>NutriApp Santé</b><small>Ministère de la Santé</small></div></div>' +
        '<nav class="hn-nav">' + nav + '</nav>' +
        '<div class="hn-side-foot"><div class="hn-side-sync"><span class="hn-pulse"></span>Synchro NutriApp · <b>4 min</b></div><small>Données de démonstration 2024</small></div>' +
      '</aside>' +
      '<div class="hn-main">' +
        '<header class="hn-header">' +
          '<div class="hn-crumbs" id="hnCrumbs"></div>' +
          '<div class="hn-title-row"><div><h1 class="hn-title">Surveillance Nutritionnelle Terrain</h1>' +
          '<p class="hn-sub">Données App Mobile NutriApp · Relais Communautaires &amp; Unités de Soin 2024</p></div>' +
          '<button type="button" class="hn-btn-primary" data-act="report">' + ICON.report + ' Générer Rapport NutriApp</button></div>' +
          '<div class="hn-filters">' +
            '<div class="hn-seg" role="group" aria-label="Mode de périmètre">' +
              '<button type="button" data-mode="region" class="on">' + ICON.globe + ' Afrique de l\u2019Ouest (Vue Globale)</button>' +
              '<button type="button" data-mode="country">' + ICON.flag + ' Sélectionner un Pays ' + ICON.chevron + '</button></div>' +
            '<label class="hn-select" id="hnCountryWrap"><span>Pays</span><select id="hnCountry" aria-label="Choisir un pays"></select></label>' +
            '<div class="hn-seg" role="group" aria-label="Période"><button type="button" data-period="M" class="on">Mensuel</button><button type="button" data-period="T">Trimestriel</button></div>' +
            '<div class="hn-sync" title="Synchronisation NutriApp"><span class="hn-pulse"></span>Synchro NutriApp : il y a ' + NH.SYNC.minutesAgo + ' min (' + NH.fmt(NH.SYNC.fichesMois) + ' fiches saisies ce mois)</div>' +
          '</div>' +
          '<div class="hn-chips-row"><span class="hn-chips-lbl">Zones</span><div class="hn-chips" id="hnZones">' + zones + '</div></div>' +
          '<div class="hn-chips-row"><span class="hn-chips-lbl">Pays</span><div class="hn-chips" id="hnCountries">' + countries + '</div></div>' +
        '</header>' +
        '<main class="hn-content">' + sections +
          '<footer class="hn-foot">Source : Application Mobile Terrain NutriApp (Agents Communautaires, Cliniques Mobiles &amp; Relais Terrain) · Ministère de la Santé / Coordination NutriApp</footer>' +
        '</main>' +
      '</div>' +
    '</div>';
  };

  /* Bloc KPI (5 cartes), rendu avant la grille de la section « Vue d'ensemble » */
  const KPI_HTML = [
    kpi(1, 'Admissions CRENAS (NutriApp)', 'Enfants dépistés &amp; pris en charge via l\u2019application', NH.THEME.primary),
    kpi(2, 'Taux de Guérison National / Régional', 'Seuil d\u2019urgence Sphère : ≥ 75 %', NH.THEME.tertiary),
    kpi(3, 'Alerte Rupture ATPE dans NutriApp', 'Points de distribution suivis dans l\u2019App', NH.THEME.danger),
    kpi(4, 'Dépistage Malnutrition CPN (Saisie App)', 'Objectif national : 100 % des consultations', NH.THEME.quaternary),
    kpi(5, 'Complétude des Rapports NutriApp', 'Fiches d\u2019enquêtes synchronisées dans les 24 h', NH.THEME.secondary)
  ].join('');
  NH.KPI_HTML = KPI_HTML;
})(typeof window !== 'undefined' ? window : globalThis);
