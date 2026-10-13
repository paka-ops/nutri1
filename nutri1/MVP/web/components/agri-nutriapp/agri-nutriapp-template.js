/* =====================================================================
 * AgriNutri · Gabarit HTML
 * ---------------------------------------------------------------------
 * Génère (sans framework) le squelette du tableau de bord : sidebar,
 * en-tête glassmorphism, 5 KPI et les 15 cartes de graphiques, placés
 * sur une grille CSS 12 colonnes (Desktop 1280px+ / Tablette 768px).
 *
 * Expose : window.AgriNutriTemplate
 * ===================================================================== */
(function () {
  'use strict';

  /* Modules de la sidebar : identifiant, libellé, icône SVG (32×32 encapsulée) */
  const MODULES = [
    { id: 'prod', label: 'Production Agricole', tag: 'NutriApp', icon: '<path d="M12 21V11M12 11c-3-1-5-3-5-6 3 0 5 2 5 6zm0 0c3-1 5-3 5-6-3 0-5 2-5 6z"/>' },
    { id: 'marches', label: 'Marchés & Prix Terrain', tag: 'Marchés', icon: '<path d="M4 19h16M6 15l4-4 3 3 5-6"/><circle cx="6" cy="15" r="1"/>' },
    { id: 'cal', label: 'Calendrier & Soudure', tag: 'Calendrier', icon: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>' },
    { id: 'div', label: 'Diversité & Jardins Familiaux', tag: 'Diversité', icon: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>' },
    { id: 'pertes', label: 'Post-Récolte & Pertes', tag: 'Pertes', icon: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>' },
    { id: 'mnt', label: 'Double Fardeau & MNT', tag: 'MNT', icon: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>' }
  ];

  /* Cartes de graphiques : clé de rendu, span sur 12 colonnes, module, hauteur */
  const CARDS = [
    { key: 'prod1', title: 'Production vs Besoins par Pays / Districts', sub: 'Barre verte = production NutriApp · contour gris = besoins · ▲ surplus / ▼ déficit', span: 7, module: 'prod', h: 300 },
    { key: 'heat', title: 'Heatmap des Prix des Marchés Locaux (NutriApp)', sub: 'Matrice 6 commodités × 12 mois · ratio prix / normale · 🌾 mois de récolte', span: 5, module: 'marches', h: 330 },
    { key: 'cal', title: 'Calendrier Agricole & Périodes de Soudure', sub: 'Gantt interactif · 10 cultures · overlay pluviométrie (bleu) et pic de malnutrition (rouge)', span: 12, module: 'cal', h: 400 },
    { key: 'scatter', title: 'Diversité des Cultures vs Score HDDS', sub: 'Quatre quadrants · corrélation entre diversité saisie et HDDS des ménages', span: 4, module: 'div', h: 300 },
    { key: 'waste', title: 'Cascade des Pertes Post-Récolte', sub: 'De la ferme à la table · 8 étapes · pertes mises en évidence', span: 4, module: 'pertes', h: 320 },
    { key: 'garden', title: 'Impact des Jardins Potagers Familiaux', sub: 'Consommation par groupe alimentaire · avec vs sans jardin (+1,4 pt HDDS)', span: 4, module: 'div', h: 380 },
    { key: 'dual', title: 'Prix des Céréales vs Insécurité Alimentaire', sub: 'Courbes combinées sur 24 mois · corrélation prix du mil ↔ insécurité', span: 6, module: 'marches', h: 300 },
    { key: 'dumb', title: 'Évolution des Prix des Produits de Base (2020 vs 2024)', sub: 'Points connectés · impact de l\'inflation sur 8 commodités clés', span: 6, module: 'marches', h: 320 },
    { key: 'hist', title: 'Évolution de la Production (10 ans)', sub: 'Production cumulée 38 → 52 Mt, décomposée par culture sur 11 campagnes', span: 7, module: 'prod', h: 300 },
    { key: 'bubble', title: 'Pertes Post-Récolte vs Revenus Agricoles', sub: 'Corrélation négative · taille de la bulle = volume produit', span: 5, module: 'pertes', h: 320 },
    { key: 'funnel', title: 'Funnel de la Fortification Alimentaire', sub: 'Efficacité : production industrielle → commercialisation → consommation', span: 4, module: 'div', h: 300 },
    { key: 'lolli', title: 'Taux d\'Autosuffisance Alimentaire', sub: 'Tiges et cercles positionnés par rapport à la cible de 100 %', span: 4, module: 'prod', h: 280 },
    { key: 'tree', title: 'Production par Culture (Treemap)', sub: 'Surface ∝ volume (Mt) · teinte = zone agroclimatique', span: 4, module: 'prod', h: 300 },
    { key: 'radar', title: 'Radar des Systèmes Alimentaires & MNT', sub: 'Six axes · périmètre actif comparé à la moyenne régionale', span: 6, module: 'mnt', h: 330 },
    { key: 'score', title: 'Scorecard Synthétique Agriculture-Nutrition', sub: 'Indicateurs, tendance sur 8 ans, progression vers la cible et statut', span: 6, module: 'mnt', h: 0 }
  ];

  /* Cartes KPI : identifiant, couleur d'accent, libellé, sous-label, mini-visuel */
  const KPIS = [
    { key: 'cereal', color: '#15803D', grad: 'linear-gradient(135deg,#15803D,#22C55E)', label: 'Production céréalière', sub: 'Déclarations et relevés des agents agricoles sur le terrain' },
    { key: 'price', color: '#DC2626', grad: 'linear-gradient(135deg,#DC2626,#F97316)', label: 'Prix marché mil', sub: 'Moyenne relevée sur les marchés locaux via NutriApp' },
    { key: 'ss', color: '#B45309', grad: 'linear-gradient(135deg,#B45309,#F59E0B)', label: 'Autosuffisance & diversification', sub: 'Taux moyen · objectif : 100 %' },
    { key: 'mnt', color: '#A21CAF', grad: 'linear-gradient(135deg,#A21CAF,#D946EF)', label: 'Double fardeau & obésité urbaine', sub: 'Enquêtes ménages NutriApp · sous-nutrition / sur-nutrition' },
    { key: 'loss', color: '#DC2626', grad: 'linear-gradient(135deg,#DC2626,#EF4444)', label: 'Index pertes post-récolte', sub: '3,4 Mds USD perdus annuellement · cible < 10 %' }
  ];

  /* Icône SVG d'application NutriApp (smartphone) + feuille/épi, logo de la sidebar */
  const LOGO = '<svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">' +
    '<rect x="2" y="2" width="36" height="36" rx="10" fill="#14532D"/>' +
    '<path d="M20 31V16" stroke="#86EFAC" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M20 22c-4 0-7-3-7-7 4 0 7 3 7 7zM20 18c4 0 7-3 7-7-4 0-7 3-7 7z" fill="#22C55E"/>' +
    '<rect x="26" y="20" width="9" height="15" rx="2" fill="none" stroke="#BBF7D0" stroke-width="1.5"/></svg>';

  const ICON = function (path) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  };

  /* Carte de graphique : en-tête, sous-titre, zone canvas (ou conteneur pour le scorecard) */
  function chartCard(c) {
    const mod = MODULES.find(function (m) { return m.id === c.module; });
    const body = c.key === 'score'
      ? '<div class="sc-host" data-slot="score"></div>'
      : '<div class="chart"><canvas data-chart="' + c.key + '" aria-label="' + c.title + '"></canvas></div>';
    return '<article class="card chart-card" data-module="' + c.module + '" data-key="' + c.key + '" style="grid-column: span ' + c.span + '">' +
      '<header class="card-head"><div><h3>' + c.title + '</h3><p class="sub">' + c.sub + '</p></div>' +
      '<span class="tag tag-' + c.module + '">' + (mod ? mod.tag : '') + '</span></header>' +
      body + '</article>';
  }

  /* Carte KPI : libellé, valeur (38px, 800), badge de comparaison, mini-visuel */
  function kpiCard(k) {
    return '<article class="card kpi" style="--kpi:' + k.color + ';--kpi-grad:' + k.grad + '" data-kpi="' + k.key + '">' +
      '<div class="kpi-label">' + k.label + '</div>' +
      '<div class="kpi-value"><span data-kpi-value="' + k.key + '">—</span><small data-kpi-unit="' + k.key + '"></small></div>' +
      '<p class="sub kpi-sub">' + k.sub + '</p>' +
      '<div class="kpi-badge" data-kpi-badge="' + k.key + '">—</div>' +
      '<div class="kpi-mini" data-kpi-mini="' + k.key + '"></div>' +
      '</article>';
  }

  /* Sidebar : logo, items (icône dans conteneur 32×32), pied de page */
  function sidebar() {
    return '<aside class="sidebar" aria-label="Navigation du tableau de bord">' +
      '<div class="brand">' + LOGO + '<div><b>AgriNutri MS</b><span>Ministère de l\'Agriculture</span></div></div>' +
      '<nav class="nav">' + MODULES.map(function (m) {
        return '<button type="button" class="nav-item" data-nav="' + m.id + '"><span class="nav-ico">' + ICON(m.icon) + '</span><span class="nav-txt">' + m.label + '</span></button>';
      }).join('') + '</nav>' +
      '<div class="side-foot"><div class="side-title">Source</div><div>Télémétrie NutriApp · relevés terrain, enquêtes ménages et prix des marchés</div>' +
      '<div class="side-note">Données de démonstration (16 pays, Afrique de l\'Ouest)</div></div>' +
      '</aside>';
  }

  /* En-tête persistant : fil d'ariane, sélecteur de périmètre, pays, badge LIVE, plein écran */
  function header() {
    return '<header class="topbar">' +
      '<nav class="crumbs" aria-label="Fil d\'ariane"><button type="button" data-crumb="root">AgriNutri</button><span class="sep">›</span>' +
      '<button type="button" data-crumb="scope" class="crumb-scope">Vue Globale</button><span class="sep" data-crumb-sep hidden>›</span>' +
      '<button type="button" data-crumb="module" hidden></button></nav>' +
      '<div class="scope" role="group" aria-label="Périmètre">' +
      '<button type="button" class="seg" data-scope="region" aria-pressed="true">🌍 Vue Globale Afrique de l\'Ouest</button>' +
      '<button type="button" class="seg" data-scope="country" aria-pressed="false">🏳️ Vue Détaillée par Pays ▾</button></div>' +
      '<label class="country-pick" hidden><span>Pays</span><select data-country aria-label="Sélecteur de pays"></select></label>' +
      '<span class="live"><i></i>Synchro NutriApp LIVE <em data-sync>--:--</em></span>' +
      '<button type="button" class="fs" data-fullscreen aria-pressed="false" title="Plein écran (mode immersif investisseur)">⛶ <span>Plein écran</span></button>' +
      '</header>';
  }

  /* Squelette complet */
  function shell() {
    return '<div class="app">' + sidebar() +
      '<div class="main">' + header() +
      '<div class="content">' +
      '<div class="page-title"><div><h1>AgriNutri Intelligence · Surveillance Agricole &amp; Nutritionnelle</h1>' +
      '<p class="sub" data-page-sub>Ministère de l\'Agriculture · NutriApp · 16 pays d\'Afrique de l\'Ouest</p></div>' +
      '<div class="page-actions"><button type="button" class="ghost" data-clear>Tous les modules</button></div></div>' +
      '<section class="kpis" aria-label="Indicateurs clés">' + KPIS.map(kpiCard).join('') + '</section>' +
      '<section class="grid" aria-label="Graphiques">' + CARDS.map(chartCard).join('') + '</section>' +
      '<footer class="foot">Données de démonstration issues de la télémétrie NutriApp (valeurs simulées à partir des indicateurs de référence). Ne constituent pas des statistiques officielles.</footer>' +
      '</div></div></div>';
  }

  window.AgriNutriTemplate = { MODULES: MODULES, CARDS: CARDS, KPIS: KPIS, ICON: ICON, shell: shell };
})();
