/* ============================================================================
 * FAO AgriNutriApp · Gabarit Shadow DOM (navigation, filtres, KPI et 15 cartes).
 * Le contenu des graphiques est généré séparément par Canvas 2D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = (global.FAONutriTracker = global.FAONutriTracker || {});

  const icon = (path) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  const icons = {
    field: icon('<path d="M3 20h18M5 20c1-5 3.4-8 7-10 3.6 2 6 5 7 10"/><path d="M12 10V4M12 7c-3.4 0-5-1.6-5-4 2.8-.2 5 .9 5 4ZM12 8c3.4 0 5-1.6 5-4-2.8-.2-5 .9-5 4Z"/>'),
    plate: icon('<circle cx="12" cy="12" r="9"/><path d="M12 4v16M7.5 7.5c1.5 1.8 1.5 7.2 0 9M16.5 7.5c-1.5 1.8-1.5 7.2 0 9"/>'),
    microscope: icon('<path d="m8 4 5 5-2 2-5-5zM11 11l-2 2a5 5 0 0 0 7 7l2-2M15 8l4 4M16 14h4M4 21h16M8 17H5"/>'),
    calendar: icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 17h3"/>'),
    chain: icon('<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 7h5a4.5 4.5 0 0 1 0 9h-3M15.5 17h-5a4.5 4.5 0 0 1 0-9h3"/>'),
    shield: icon('<path d="M12 3 20 6v5c0 5-3.3 8.2-8 10-4.7-1.8-8-5-8-10V6z"/><path d="m8 12 2.5 2.5L16 9"/>'),
    download: icon('<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>'),
    expand: icon('<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>'),
    phone: icon('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10 5h4M11 18.5h2"/>'),
    grain: icon('<path d="M12 21V4M12 8c-3 0-4.5-1.5-4.5-4 2.4-.3 4.5.8 4.5 4ZM12 12c-3 0-4.5-1.5-4.5-4 2.4-.3 4.5.8 4.5 4ZM12 16c-3 0-4.5-1.5-4.5-4 2.4-.3 4.5.8 4.5 4ZM12 8c3 0 4.5-1.5 4.5-4-2.4-.3-4.5.8-4.5 4ZM12 12c3 0 4.5-1.5 4.5-4-2.4-.3-4.5.8-4.5 4ZM12 16c3 0 4.5-1.5 4.5-4-2.4-.3-4.5.8-4.5 4Z"/>')
  };

  const navItems = [
    { id: 'sec-production', icon: 'field', label: 'Production Agricole (App)' },
    { id: 'sec-households', icon: 'plate', label: 'Systèmes Alimentaires & Ménages' },
    { id: 'sec-composition', icon: 'microscope', label: 'Composition Nutritive (Terrain)' },
    { id: 'sec-calendar', icon: 'calendar', label: 'Calendriers Agricoles Saisis' },
    { id: 'sec-valuechain', icon: 'chain', label: 'Chaîne de Valeur & Pertes' },
    { id: 'sec-fortification', icon: 'shield', label: 'Fortification & Consommation' }
  ];

  function chartCard(id, title, subtitle, span, height, legendItems) {
    const legend = (legendItems || []).map((item) =>
      '<button class="ft-legend-item" type="button" data-legend-chart="' + id + '" data-legend="' + item.key + '" aria-pressed="true"><i style="--legend-color:' + item.color + '"></i>' + item.label + '</button>'
    ).join('');
    return '<article class="ft-card ft-chart-card ft-reveal ' + span + '" id="card-' + id + '" data-card="' + id + '">' +
      '<header class="ft-card-head"><div class="ft-chart-heading"><span class="ft-chart-index">' + id.toUpperCase() + '</span>' +
      '<div><h3>' + title + '</h3><p>' + subtitle + '</p></div></div>' +
      (legend ? '<div class="ft-legend" aria-label="Afficher ou masquer une série">' + legend + '</div>' : '') + '</header>' +
      '<div class="ft-canvas-host" data-chart="' + id + '" style="height:' + height + 'px" role="img" aria-label="' + title + '"></div>' +
      '</article>';
  }

  function section(id, number, title, description, cards) {
    return '<section class="ft-section" id="' + id + '"><div class="ft-section-title ft-reveal"><span>' + number + '</span><div><h2>' + title + '</h2><p>' + description + '</p></div></div>' +
      '<div class="ft-grid">' + cards + '</div></section>';
  }

  function kpiCard(kpi) {
    const symbols = { production: '🌾', loss: '↘', hdds: '◉', fortification: '＋', biodiversity: '✳' };
    return '<article class="ft-kpi ft-kpi-' + kpi.tone + ' ft-reveal" data-kpi="' + kpi.id + '">' +
      '<div class="ft-kpi-top"><span class="ft-kpi-icon" aria-hidden="true">' + symbols[kpi.id] + '</span><span class="ft-kpi-badge" data-badge></span></div>' +
      '<strong class="ft-kpi-value" data-value>—</strong><span class="ft-kpi-label" data-label>' + kpi.label + '</span>' +
      '<span class="ft-kpi-sub" data-sub></span><div class="ft-kpi-viz" data-kpi-chart="' + kpi.id + '"></div></article>';
  }

  FAO.template = function () {
    const navigation = navItems.map((item, index) => '<button class="ft-nav-item' + (index === 0 ? ' is-active' : '') + '" type="button" data-nav="' + item.id + '" title="' + item.label + '">' + icons[item.icon] + '<span>' + item.label + '</span></button>').join('');
    const legends = {
      g1: [{ key: 'production', color: '#059669', label: 'Production app' }, { key: 'needs', color: '#94A3B8', label: 'Besoins ménages' }],
      g3: [{ key: 'rain', color: '#0891B2', label: 'Pluviométrie' }, { key: 'risk', color: '#DC2626', label: 'Vulnérabilité' }],
      g4: [{ key: 'cereals', color: '#059669', label: 'Céréales' }, { key: 'legumes', color: '#D97706', label: 'Légumineuses' }, { key: 'roots', color: '#0891B2', label: 'Racines & tubercules' }],
      g6: [{ key: 'salt', color: '#059669', label: 'Sel' }, { key: 'flour', color: '#D97706', label: 'Farine' }, { key: 'oil', color: '#0891B2', label: 'Huile' }, { key: 'semolina', color: '#7C3AED', label: 'Semoule' }, { key: 'milk', color: '#DC2626', label: 'Lait' }],
      g7: [{ key: 'harvest', color: '#D97706', label: 'Étapes de perte' }],
      g9: [{ key: 'mil', color: '#059669', label: 'Mil' }, { key: 'maize', color: '#10B981', label: 'Maïs' }, { key: 'rice', color: '#0891B2', label: 'Riz' }, { key: 'sorghum', color: '#D97706', label: 'Sorgho' }, { key: 'legumes', color: '#7C3AED', label: 'Légumineuses' }],
      g10: [{ key: 'active', color: '#059669', label: 'Zone active' }, { key: 'regional', color: '#94A3B8', label: 'Référence régionale' }],
      g11: [{ key: 'millet', color: '#059669', label: 'Mil' }, { key: 'maize', color: '#D97706', label: 'Maïs' }, { key: 'rice', color: '#0891B2', label: 'Riz' }],
      g14: [{ key: 'bubbles', color: '#059669', label: 'Exploitations suivies' }],
      g15: [{ key: 'bullet', color: '#059669', label: 'Valeur mesurée' }]
    };

    const cards = {
      g1: chartCard('g1', 'Production vs besoins céréaliers', 'Pays d’Afrique de l’Ouest ou districts du pays sélectionné · ratio d’autosuffisance', 'ft-span-7', 450, legends.g1),
      g2: chartCard('g2', 'Matrice nutritive des aliments locaux', 'Densité nutritive relative (0–100) · bordure dorée : super-aliment signalé par les relais', 'ft-span-7', 395, []),
      g3: chartCard('g3', 'Calendrier agricole & périodes de soudure', 'Saisons de culture saisies dans l’app · pluies et indice de vulnérabilité communautaire', 'ft-span-12', 390, legends.g3),
      g4: chartCard('g4', 'Chaîne de valeur & pertes post-récolte', 'Flux estimés de la production à la consommation · particules animées sur les flux', 'ft-span-7', 360, legends.g4),
      g5: chartCard('g5', 'Distribution du score HDDS', 'Dispersion simulée des ménages enquêtés · point large : moyenne de la zone', 'ft-span-5', 435, []),
      g6: chartCard('g6', 'Couverture de la fortification', 'Taux observé sur les marchés comparé au seuil de référence de 80–90 %', 'ft-span-4', 315, legends.g6),
      g7: chartCard('g7', 'Cascade des pertes post-récolte', 'Part de la récolte restante après chaque étape de la chaîne', 'ft-span-4', 315, legends.g7),
      g8: chartCard('g8', 'Diversité cultivée vs HDDS', 'Corrélation entre diversité des cultures déclarées et diversité alimentaire des ménages', 'ft-span-4', 315, []),
      g9: chartCard('g9', 'Évolution de la production sur 10 ans', 'Volumes cumulés estimés des principales cultures · campagne 2015–2024', 'ft-span-5', 335, legends.g9),
      g10: chartCard('g10', 'Radar des systèmes alimentaires durables', 'Lecture de résilience à 7 dimensions · comparaison à la référence régionale', 'ft-span-4', 335, legends.g10),
      g11: chartCard('g11', 'Valeur nutritive des céréales', 'Comparatif relatif pour 100 g · fer, zinc, protéines et calcium', 'ft-span-5', 325, legends.g11),
      g12: chartCard('g12', 'Prix des céréales sur les marchés', 'Indice mensuel observé vs normale saisonnière (base 100)', 'ft-span-4', 315, []),
      g13: chartCard('g13', 'Écart au score HDDS cible', 'Distance de la moyenne observée au seuil de diversité alimentaire de 6 groupes', 'ft-span-5', 350, []),
      g14: chartCard('g14', 'Pertes post-récolte vs revenus', 'Taille de bulle : volume de production suivi · chaque point représente une zone', 'ft-span-6', 350, legends.g14),
      g15: chartCard('g15', 'Scorecard agriculture–nutrition', 'Six indicateurs synthétiques · le repère vertical indique la cible de référence', 'ft-span-6', 350, legends.g15)
    };

    return '<div class="ft-app" lang="fr">' +
      '<aside class="ft-sidebar" aria-label="Navigation FAO AgriNutriApp">' +
        '<div class="ft-brand"><span class="ft-brand-mark"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="6" width="19" height="35" rx="4" fill="#059669"/><rect x="5" y="10" width="13" height="23" rx="2" fill="#052E16"/><circle cx="11.5" cy="37" r="1.4" fill="#BBF7D0"/><path d="M34 42V12M34 20c-5 0-7-2.5-7-6 4-.4 7 1.3 7 6Zm0 8c5 0 7-2.5 7-6-4-.4-7 1.3-7 6Zm0 0c-5 0-7-2.5-7-6 4-.4 7 1.3 7 6Zm0 8c5 0 7-2.5 7-6-4-.4-7 1.3-7 6Z" fill="none" stroke="#34D399" stroke-width="2" stroke-linecap="round"/></svg></span><span><b>FAO AgriNutri</b><small>Surveillance terrain · Afrique de l’Ouest</small></span></div>' +
        '<div class="ft-nav-label">ESPACE D’ANALYSE</div><nav class="ft-nav">' + navigation + '</nav>' +
        '<div class="ft-sidebar-bottom"><div class="ft-source-box"><span class="ft-source-mark">' + icons.phone + '</span><div><b>Collecte mobile</b><small>Relais communautaires & agents agricoles</small></div><span class="ft-pulse"></span></div><div class="ft-sidebar-caption">FAO · systèmes alimentaires résilients</div></div>' +
      '</aside>' +
      '<div class="ft-main">' +
        '<header class="ft-header">' +
          '<div class="ft-header-top"><nav class="ft-breadcrumb" aria-label="Fil d’Ariane"><span>FAO</span><i>/</i><span>AgriNutriApp</span><i>/</i><b data-crumb>Mode : Régional</b></nav>' +
          '<button class="ft-sync" type="button" data-action="sync" title="Simuler une synchronisation des formulaires terrain"><span class="ft-pulse"></span><span data-sync-label>Dernière synchro app : il y a 6 min · 184 200 exploitations / ménages suivis</span></button></div>' +
          '<div class="ft-header-main"><div><h1>Intelligence des Systèmes Alimentaires &amp; Nutrition</h1><p>Données App Mobile Terrain · Enquêtes Ménages &amp; Relais Agricoles 2024</p></div><div class="ft-header-actions"><button class="ft-icon-button" type="button" data-action="fullscreen" aria-label="Plein écran" title="Plein écran">' + icons.expand + '</button><button class="ft-report-button" type="button" data-action="report">' + icons.download + '<span>Générer Rapport Agrégé</span></button></div></div>' +
          '<div class="ft-filters"><div class="ft-mode-switch" role="group" aria-label="Périmètre d’analyse"><button type="button" class="is-active" data-mode="region">🌍 Afrique de l’Ouest <small>Vue globale</small></button><button type="button" data-mode="country">🏳️ Sélectionner un pays</button></div>' +
          '<label class="ft-filter"><span>Pays</span><select data-country aria-label="Pays analysé" disabled></select></label>' +
          '<label class="ft-filter ft-year-filter"><span>Campagne</span><select data-year aria-label="Campagne"><option value="2024" selected>2024</option><option value="2023">2023</option></select></label>' +
          '<div class="ft-granularity" role="group" aria-label="Granularité"><button type="button" class="is-active" data-granularity="annual">Annuel</button><button type="button" data-granularity="quarterly">Trimestriel</button></div>' +
          '<label class="ft-filter ft-quarter-filter" hidden><span>Trimestre</span><select data-quarter aria-label="Trimestre"><option value="1">T1 · Jan–Mar</option><option value="2">T2 · Avr–Juin</option><option value="3" selected>T3 · Juil–Sep</option><option value="4">T4 · Oct–Déc</option></select></label></div>' +
        '</header>' +
        '<main class="ft-content">' +
          '<section class="ft-hero ft-reveal" id="sec-overview"><div><span class="ft-eyebrow">TABLEAU DE BORD RÉGIONAL · 2024</span><h2 data-scope-title>Surveillance des systèmes alimentaires</h2><p data-scope-copy>Une lecture intégrée des rendements, marchés, pertes après récolte et diversité alimentaire, à partir des remontées de terrain.</p></div><div class="ft-hero-stat"><span class="ft-hero-stat-icon">' + icons.grain + '</span><span><b data-hero-country-count>16 pays</b><small data-hero-sample>184 200 ménages / exploitations suivis</small></span></div></section>' +
          '<div class="ft-zone-filter"><div class="ft-zone-heading"><div><b data-zone-title>Pays suivis</b><span data-zone-caption>Choisissez un pays pour ouvrir la vue détaillée et ses districts.</span></div><span class="ft-zone-count" data-zone-count>16 pays</span></div><div class="ft-zone-chips" data-zone-chips aria-label="Filtres de pays et de zones"></div></div>' +
          '<section class="ft-kpi-section" id="sec-kpis"><div class="ft-section-title ft-section-title-compact"><span>00</span><div><h2>Indicateurs clés</h2><p>Mesures principales du périmètre sélectionné · comparaison régionale en vue pays.</p></div><span class="ft-scope-tag" data-scope-tag>Afrique de l’Ouest · 2024</span></div><div class="ft-kpi-grid">' +
          ['production', 'loss', 'hdds', 'fortification', 'biodiversity'].map((id) => kpiCard({ id, tone: { production: 'green', loss: 'red', hdds: 'amber', fortification: 'cyan', biodiversity: 'violet' }[id], label: { production: 'Production céréalière estimée (App)', loss: 'Pertes post-récolte (suivi App)', hdds: 'Diversité alimentaire des ménages (HDDS)', fortification: 'Fortification des denrées de base', biodiversity: 'Espèces & variétés documentées par l’App' }[id] })).join('') +
          '</div></section>' +
          section('sec-production', '01', 'Production agricole saisie dans l’app', 'Volumes déclarés, besoins estimés et trajectoire des principales cultures.',
            cards.g1 + cards.g9) +
          section('sec-households', '02', 'Systèmes alimentaires & ménages', 'Diversité alimentaire observée, pratiques de culture et progression vers les cibles nutritionnelles.',
            cards.g5 + cards.g8 + cards.g13 + cards.g15) +
          section('sec-composition', '03', 'Composition nutritive des aliments locaux', 'Lecture comparée de la densité nutritive des denrées locales suivies par les relais.',
            cards.g2 + cards.g11) +
          section('sec-calendar', '04', 'Calendriers agricoles & marchés', 'Saisonnalité des cultures, périodes de soudure et évolution des prix sur les marchés locaux.',
            cards.g3 + cards.g12) +
          section('sec-valuechain', '05', 'Chaîne de valeur & pertes', 'Flux entre production, transformation et consommation ; points de pertes et revenus agricoles.',
            cards.g4 + cards.g7 + cards.g14) +
          section('sec-fortification', '06', 'Fortification & résilience des systèmes alimentaires', 'Couverture des aliments fortifiés et lecture multidimensionnelle de la résilience locale.',
            cards.g6 + cards.g10) +
          '<footer class="ft-footer"><span class="ft-footer-dot"></span><span><b>Source de démonstration :</b> Application Mobile Terrain FAO &amp; relais communautaires · enquêtes ménages et rendements saisis en ligne.</span><span class="ft-footer-note">Démo : agrégat régional et déclarations pays sont des bases distinctes ; valider avant décision.</span></footer>' +
        '</main>' +
      '</div>' +
      '<div class="ft-toast" role="status" aria-live="polite" data-toast></div>' +
    '</div>';
  };
})(window);
