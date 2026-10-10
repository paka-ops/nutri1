/* ============================================================================
 * WFP NutriTracker · wfp-template.js
 * Gabarit HTML du tableau de bord (injecte dans le Shadow DOM par wfp-dashboard.js).
 * Ne contient que la structure : toute la logique vit dans wfp-dashboard.js,
 * les graphiques dans charts/*.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP = global.WFP || {};

  // Carte graphique : titre, sous-titre, largeur (colonnes sur 12), hauteur du canvas
  function card(key, num, title, sub, span, height, extra) {
    return '' +
      '<article class="wfp-card span-' + span + (extra ? ' ' + extra : '') + '" data-chart="' + key + '" id="card-' + key + '">' +
        '<header class="wfp-card-h">' +
          '<div><span class="wfp-tag">Graphique ' + num + '</span>' +
          '<h3>' + title + '</h3><p class="wfp-sub">' + sub + '</p></div>' +
        '</header>' +
        '<div class="wfp-legend"></div>' +
        '<div class="wfp-cwrap" style="height:' + height + 'px"><canvas></canvas><div class="wfp-tip"></div></div>' +
      '</article>';
  }

  // Carte KPI : valeur, libelle, sous-libelle, badge et zone visuelle propre a chaque KPI
  function kpi(key, icon, label, sub, extraHtml, cls) {
    return '' +
      '<article class="wfp-kpi ' + (cls || '') + '" data-kpi="' + key + '">' +
        '<div class="kpi-top"><span class="kpi-ic">' + icon + '</span><span class="kpi-lbl">' + label + '</span></div>' +
        '<div class="kpi-val" id="kpi-' + key + '-val">—</div>' +
        '<div class="kpi-sub">' + sub + '</div>' +
        extraHtml +
      '</article>';
  }

  // Logo : epi de ble dore stylise + icone smartphone
  const LOGO = '' +
    '<svg class="wfp-logo" viewBox="0 0 40 40" aria-hidden="true">' +
      '<defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FBBF24"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>' +
      '<rect x="24" y="4" width="13" height="26" rx="3" fill="none" stroke="#FBBF24" stroke-width="1.6"/>' +
      '<rect x="26.5" y="8" width="8" height="15" rx="1" fill="#F59E0B" opacity=".25"/>' +
      '<circle cx="30.5" cy="26" r="1" fill="#FBBF24"/>' +
      '<path d="M12 36V15" stroke="url(#wg)" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M12 17c-3-1-5-3-5-6 3 0 5 2 5 6zm0 0c3-1 5-3 5-6-3 0-5 2-5 6zm0 7c-3-1-5-3-5-6 3 0 5 2 5 6zm0 0c3-1 5-3 5-6-3 0-5 2-5 6z" fill="url(#wg)"/>' +
    '</svg>';

  const NAV = [
    ['top', '🏠', 'Tableau de bord'],
    ['secalim', '🍽️', 'Sécurité Alimentaire (mVAM)'],
    ['marches', '💰', 'Marchés & Prix Terrain'],
    ['ops', '🚚', 'Opérations & Distribution App'],
    ['ipc', '📊', 'Indicateurs IPC & Ménages'],
    ['alertes', '⚠️', 'Alertes Précoces App']
  ];

  function html() {
    const nav = NAV.map((n, i) =>
      '<button type="button" class="wfp-nav-btn' + (i === 0 ? ' on' : '') + '" data-target="' + n[0] + '">' +
      '<span class="nav-ic">' + n[1] + '</span><span>' + n[2] + '</span></button>').join('');

    const zoneChips = [['all', 'Toutes les zones'], ['sahel', 'Sahel / AES'], ['golfe', 'Golfe de Guinée'], ['cotiere', 'Côtière Ouest']]
      .map(z => '<button type="button" class="chip' + (z[0] === 'all' ? ' on' : '') + '" data-zone="' + z[0] + '">' + z[1] + '</button>').join('');

    return '' +
    '<div class="wfp-app" id="wfpApp">' +
      // ---------------- SIDEBAR (240px, brun #1C1008) ----------------
      '<aside class="wfp-side" aria-label="Navigation WFP">' +
        '<div class="wfp-brand">' + LOGO +
          '<div><b>WFP NutriTracker</b><span>PAM · Programme Alimentaire Mondial</span></div>' +
        '</div>' +
        '<nav class="wfp-nav">' + nav + '</nav>' +
        '<div class="wfp-side-foot"><span class="dot-live"></span><div><b>Source</b><span>Application mobile terrain PAM/WFP · relais communautaires, mVAM &amp; points de distribution</span></div></div>' +
      '</aside>' +

      '<main class="wfp-main">' +
        // ---------------- HEADER (fil d\'Ariane + double perimetre) ----------------
        '<header class="wfp-head" id="wfpHead">' +
          '<nav class="wfp-crumbs" id="wfpCrumbs" aria-label="Fil d\'Ariane">PAM / WFP NutriTracker / <b>Régional</b></nav>' +
          '<div class="wfp-title-row">' +
            '<div>' +
              '<p class="wfp-eyebrow">WFP NutriTracker · Surveillance Communautaire Afrique de l\'Ouest</p>' +
              '<h2 class="wfp-title">Surveillance Nutritionnelle &amp; Sécurité Alimentaire</h2>' +
              '<p class="wfp-subtitle">Données App Mobile Terrain · Enquêtes mVAM &amp; Relais Communautaires 2024</p>' +
            '</div>' +
            '<button type="button" class="wfp-btn" id="btnReport">📄 Générer Rapport</button>' +
          '</div>' +
          '<div class="wfp-filters">' +
            '<div class="wfp-seg" role="group" aria-label="Mode d\'analyse">' +
              '<button type="button" data-mode="region" class="on">🌍 Afrique de l\'Ouest (Vue Globale)</button>' +
              '<button type="button" data-mode="country">🏳️ Sélectionner un Pays</button>' +
            '</div>' +
            '<label class="wfp-select" id="countryWrap" hidden><span>Pays</span><select id="countrySel"></select></label>' +
            '<div class="wfp-seg small" role="group" aria-label="Période">' +
              '<button type="button" data-period="M" class="on">Mensuel</button>' +
              '<button type="button" data-period="T">Trimestriel</button>' +
            '</div>' +
            '<div class="wfp-sync" title="Dernière synchronisation de l\'application terrain"><span class="pulse" aria-hidden="true"></span><span id="syncText">Synchro App : il y a 8 min (312 400 ménages enquêtés ce mois)</span></div>' +
          '</div>' +
          '<div class="wfp-chips-row"><span class="chips-lbl">Zones</span><div class="chips" id="zoneChips">' + zoneChips + '</div></div>' +
          '<div class="wfp-chips-row" id="countryChipsRow" hidden><span class="chips-lbl">Pays</span><div class="chips" id="countryChips"></div></div>' +
        '</header>' +

        // ---------------- 5 KPI ----------------
        '<section class="wfp-kpis" aria-label="Indicateurs clés">' +
          kpi('insec', '👥', 'Insécurité alimentaire totale', 'Personnes en insécurité alimentaire · dépistage app mobile / enquêtes mVAM ménages',
            '<div class="kpi-badge" id="kpi-insec-badge"></div><canvas class="kpi-spark" id="kpi-insec-spark" height="40"></canvas>', 'k-amber') +
          kpi('fcs', '🥗', 'FCS moyen (Food Consumption Score)', 'Classification : Limite (0-28 Pauvre | 28.5-42 Limite | &gt;42 Acceptable)',
            '<div class="kpi-badge" id="kpi-fcs-badge"></div><div class="gauge" aria-hidden="true"><i class="g-red"></i><i class="g-amb"></i><i class="g-grn"></i><b id="kpi-fcs-cursor"></b></div><div class="gauge-scale"><span>0</span><span>28</span><span>42</span><span>70</span></div>', 'k-amber') +
          kpi('zones', '🚨', 'Pays / districts en crise IPC 3+', 'Zones en phase IPC 3+ (alerte app)',
            '<div class="kpi-badge" id="kpi-zones-badge"></div><div class="tiles" id="kpi-zones-tiles"></div>', 'k-red') +
          kpi('benef', '🤝', 'Bénéficiaires atteints via l\'app', 'Bénéficiaires assistés (scannés / enregistrés app)',
            '<div class="kpi-badge" id="kpi-benef-badge"></div><div class="progress" aria-hidden="true"><i id="kpi-benef-bar"></i><b class="target-line" title="Cible PAM"></b></div><div class="progress-lbl" id="kpi-benef-lbl"></div>', 'k-green') +
          kpi('price', '📈', 'Index prix marchés suivis app', 'Index prix céréales (relevé app marchés)',
            '<div class="kpi-badge" id="kpi-price-badge"></div><canvas class="kpi-spark" id="kpi-price-spark" height="40"></canvas>', 'k-red') +
        '</section>' +

        // ---------------- GRILLE DES 15 GRAPHIQUES (ordre de la sidebar) ----------------
        '<section class="wfp-grid" aria-label="Graphiques">' +
          // Securite alimentaire (mVAM)
          card('ipc', 1, 'Phases IPC (Global Pays vs Districts du Pays)', 'Segments par phase IPC · % population · personnes dépistées', 7, 340) +
          card('fcs', 2, 'Évolution du Score FCS (mVAM App 2020-2024)', 'Lignes lissées · zone de crise surlignée · seuil acceptable 42', 5, 340) +
          // Marches & prix terrain
          card('heat', 3, 'Heatmap Temporelle des Prix du Marché (Relevés App Agents)', 'Écart au prix normal · 8 produits × 24 mois · prix FCFA/kg dans les cellules', 12, 300) +
          card('cereals', 9, 'Évolution des Prix des 5 Céréales Clés (20 Trimestres)', 'Prix moyen collecté sur les marchés régionaux · aires en dégradé', 12, 310) +
          card('dual', 10, 'Disponibilité vs Accès Économique Ménages (Dual Bar)', 'Bleu : kcal/jour (en % des besoins) · ambre : accès économique · rouge : gap', 6, 310) +
          card('scatter', 5, 'Corrélation Prix Marchés vs Malnutrition Aiguë (PB/App)', 'Prix du mil relevé dans l\'app vs MAM dépisté au ruban MUAC', 6, 310) +
          // Operations & distribution app
          card('funnel', 6, 'Funnel de Distribution et Logistique PAM (NutriApp)', 'Bénéficiaires ciblés → confirmés reçus (millions)', 4, 380) +
          card('waterfall', 14, 'Waterfall Financier et Couverture des Opérations PAM', 'Milliards USD · budget requis → gap → budget disponible', 4, 380) +
          card('calendar', 13, 'Matrice des Alertes Nutritionnelles par Mois', 'Signalements d\'urgence · 12 mois × entités', 4, 380) +
          card('bullets', 15, 'Bullet Charts de Performance des Opérations Terrain', '8 indicateurs mesurés via l\'app comparés aux objectifs PAM', 12, 380) +
          // Indicateurs IPC & menages
          card('radar', 4, 'Stratégies d\'Adaptation des Ménages (CSI Radar App)', 'Radar 5 axes · questionnaires ménages mVAM', 4, 290) +
          card('hdds', 11, 'Distribution du Score HDDS (Diversité Alimentaire Ménage)', 'Scores 0 à 12 déclarés par les chefs de ménage', 4, 290) +
          card('dumbbell', 12, 'Dumbbell Chart : Évolution du Score FCS (2020 vs 2024)', 'Gris = 2020 · ambre / rouge = 2024 · vert = amélioration', 4, 290) +
          // Alertes precoces
          card('rose', 7, 'Saisonnalité des Alertes de Nutrition (Rose Chart)', 'Volume d\'alertes de vulnérabilité · surlignage rouge de la soudure (juin–septembre)', 6, 380) +
          card('map', 8, 'Carte Interactive des Alertes IPC (Afrique de l\'Ouest / Districts)', 'Survolez un pays (ou un district en mode Pays) pour la fiche instantanée', 6, 380) +
        '</section>' +

        '<footer class="wfp-foot">Données de démonstration issues de l\'app mobile de suivi terrain PAM 2024 · Les chiffres de référence (16 pays) sont fixés ; les séries et districts sont reconstruits de façon déterministe.</footer>' +
        '<div class="wfp-toast" id="wfpToast" role="status" aria-live="polite"></div>' +
      '</main>' +
    '</div>';
  }

  WFP.template = { html };
})(window);
