/* ============================================================================
 * UNICEF NutriChildApp · Gabarit HTML (Shadow DOM)
 * ----------------------------------------------------------------------------
 * Produit le squelette : sidebar 240 px, en-tête collant avec double périmètre
 * (Mode Global / Pays), cinq KPI et la grille des 15 cartes graphiques.
 * Les valeurs sont injectées ensuite par le contrôleur (unicef-nutrichild-dashboard.js).
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;

  /** Carte graphique : identifiant, section de navigation, largeur (ex. c55) et hauteur du canvas. */
  function card(id, section, span, title, subtitle, height, extra) {
    return `
    <section class="uni-card uni-span-${span}" id="uni-${id}" data-card="${id}" data-section="${section}">
      <header class="card-head">
        <div class="card-titles">
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
        ${extra || ''}
      </header>
      <div class="chart-box" style="height:${height}px"><canvas data-chart="${id}" role="img" aria-label="${title}"></canvas></div>
    </section>`;
  }

  /** Cinq cartes KPI. */
  function kpis() {
    return `
    <section class="uni-kpis" aria-label="Indicateurs clés">
      <article class="uni-card kpi kpi-red">
        <div class="kpi-top"><span class="kpi-icon">🧒</span><span class="kpi-badge" data-bind="kpi-mas-badge">—</span></div>
        <div class="kpi-label">Malnutrition Aigüe Sévère (Dépistée)</div>
        <div class="kpi-value" data-bind="kpi-mas-value">—</div>
        <div class="kpi-sub" data-bind="kpi-mas-sub"></div>
        <div class="kpi-chart chart-box" style="height:64px"><canvas data-chart="kpi-mas" role="img" aria-label="Répartition des enfants MAS dépistés"></canvas></div>
      </article>

      <article class="uni-card kpi kpi-orange">
        <div class="kpi-top"><span class="kpi-icon">🤱</span><span class="kpi-badge" data-bind="kpi-allait-badge">—</span></div>
        <div class="kpi-label">Allaitement Exclusif 0-6 mois</div>
        <div class="kpi-value" data-bind="kpi-allait-value">—</div>
        <div class="kpi-sub" data-bind="kpi-allait-sub"></div>
        <div class="kpi-chart chart-box" style="height:84px"><canvas data-chart="kpi-allait" role="img" aria-label="Jauge allaitement exclusif"></canvas></div>
      </article>

      <article class="uni-card kpi kpi-green">
        <div class="kpi-top"><span class="kpi-icon">🏥</span><span class="kpi-badge" data-bind="kpi-guer-badge">—</span></div>
        <div class="kpi-label">Taux de Guérison (Prise en charge CRENAS)</div>
        <div class="kpi-value" data-bind="kpi-guer-value">—</div>
        <div class="kpi-sub" data-bind="kpi-guer-sub"></div>
        <div class="kpi-chart chart-box" style="height:56px"><canvas data-chart="kpi-guer" role="img" aria-label="Progression du taux de guérison sur 12 mois"></canvas></div>
      </article>

      <article class="uni-card kpi kpi-cyan">
        <div class="kpi-top"><span class="kpi-icon">💊</span><span class="kpi-badge" data-bind="kpi-vit-badge">—</span></div>
        <div class="kpi-label">Supplémentation Vitamine A (6-59 mois)</div>
        <div class="kpi-value" data-bind="kpi-vit-value">—</div>
        <div class="kpi-sub" data-bind="kpi-vit-sub"></div>
        <div class="kpi-progress" aria-hidden="true">
          <div class="kpi-progress-fill" data-bind="kpi-vit-fill"></div>
          <div class="kpi-progress-target" style="left:80%"><span>Objectif 80 %</span></div>
        </div>
      </article>

      <article class="uni-card kpi kpi-cyan">
        <div class="kpi-top"><span class="kpi-icon">📋</span><span class="kpi-badge" data-bind="kpi-adm-badge">—</span></div>
        <div class="kpi-label" data-bind="kpi-adm-label">Admissions Reçues dans l'App (Mois en cours)</div>
        <div class="kpi-value" data-bind="kpi-adm-value">—</div>
        <div class="kpi-sub">Saisies App · admissions CRENAS</div>
        <div class="kpi-chart chart-box" style="height:64px"><canvas data-chart="kpi-adm" role="img" aria-label="Admissions mensuelles des 12 derniers mois"></canvas></div>
      </article>
    </section>`;
  }

  /** Grille des 15 graphiques (ordre de lecture = ordre du brief, regroupé par largeur). */
  function grid() {
    const sexSwitch = `
      <div class="seg seg-mini" role="group" aria-label="Sexe de l’enfant">
        <button type="button" data-sex="F">Fille</button>
        <button type="button" data-sex="M">Garçon</button>
      </div>
      <div class="seg seg-mini" role="group" aria-label="Mesure">
        <button type="button" data-metric="poids">Poids</button>
        <button type="button" data-metric="taille">Taille</button>
        <button type="button" data-metric="pb">Périmètre brachial</button>
      </div>`;
    const bulletSwitch = `
      <div class="seg seg-mini" role="group" aria-label="Métrique CRENAS">
        <button type="button" data-bullet="guerison">Guérison</button>
        <button type="button" data-bullet="abandon">Abandon</button>
        <button type="button" data-bullet="deces">Décès</button>
      </div>`;
    return `
    <div class="uni-grid">
      ${card('G1', 'malnutrition', 'c55', 'Courbes de croissance OMS vs relevés terrain App', 'Percentiles P3 → P97 · mesures individuelles de l’App mobile', 360, sexSwitch)}
      ${card('G2', 'malnutrition', 'c45', 'Tunnel d’accompagnement MAS', 'Du dépistage communautaire à la guérison confirmée', 360)}
      ${card('G3', 'anje', 'c33', 'Profil radar ANJE (8 indicateurs)', 'Pays ou zone vs moyenne régionale vs benchmark OMS', 340)}
      ${card('G4', 'crenas', 'c33', 'Bullet charts : performance des CRENAS', 'Comparaison au seuil humanitaire Sphère', 340, bulletSwitch)}
      ${card('G5', 'campagnes', 'c33', 'Campagnes de supplémentation (App)', 'Enfants touchés via les relais, 2017-2024', 340)}
      ${card('G6', 'anje', 'c60', 'Heatmap : pratiques ANJE par pays / districts', 'Couleur = écart à l’objectif OMS · rouge = loin de la cible', 440)}
      ${card('G7', 'wash', 'c40', 'Accès eau / hygiène (WASH) vs retard de croissance', 'Régression linéaire et R² calculés sur les unités affichées', 440)}
      ${card('G8', 'anje', 'c100', 'Les 1000 premiers jours de l’enfant', 'Jalons, interventions enregistrées dans l’App et impact cumulé sur le stunting', 380)}
      ${card('G9', 'malnutrition', 'c50', 'Cartographie des bulles : prévalence et volume de MAS', 'Taille = enfants MAS dépistés · couleur = prévalence', 360)}
      ${card('G10', 'tendances', 'c50', 'Évolution historique de la malnutrition aiguë (2016-2024)', 'Prévalence MAS par pays ou district · zone d’alerte OMS > 10 %', 360)}
      ${card('G11', 'wash', 'c33', 'Déterminants de la malnutrition', 'Anneau extérieur : causes directes · intérieur : causes sous-jacentes', 320)}
      ${card('G12', 'anje', 'c33', 'Indicateurs ANJE clés par zone', 'Barres groupées · repère vert = objectif OMS', 320)}
      ${card('G13', 'tendances', 'c33', 'Saisonnalité des admissions CRENAS', 'Pic de soudure juin → septembre en rouge', 320)}
      ${card('G14', 'campagnes', 'c50', 'Couverture des programmes : 2022 vs 2024', 'Supplémentation en vitamine A · objectif 80 %', 440)}
      <section class="uni-card uni-span-c50" id="uni-G15" data-card="G15" data-section="crenas">
        <header class="card-head">
          <div class="card-titles">
            <h3>Tableau synthétique des centres Nutri / CRENAS</h3>
            <p>Admissions, guérison, abandon, décès, stock d’ATPE et tendance 12 mois</p>
          </div>
        </header>
        <div class="uni-table-wrap">
          <table class="uni-table">
            <thead>
              <tr>
                <th scope="col" data-bind="score-head-name">Pays</th>
                <th scope="col">Admissions / an</th>
                <th scope="col">Guérison</th>
                <th scope="col">Abandon</th>
                <th scope="col">Décès</th>
                <th scope="col">Stock ATPE</th>
                <th scope="col">Tendance 12 m</th>
              </tr>
            </thead>
            <tbody data-bind="score"></tbody>
          </table>
        </div>
      </section>
    </div>`;
  }

  /** Squelette complet du composant. */
  function template() {
    const navItems = [
      { id: 'malnutrition', icon: '👶', label: 'Malnutrition Infantile', sub: 'Dépistage App' },
      { id: 'anje', icon: '🤱', label: 'Pratiques ANJE & Allaitement', sub: 'Questionnaires' },
      { id: 'crenas', icon: '🏥', label: 'Prise en Charge CRENAS/CRENAM', sub: 'Suivi dossier App' },
      { id: 'campagnes', icon: '💊', label: 'Campagnes & Supplémentation', sub: 'Relais communautaires' },
      { id: 'wash', icon: '🌊', label: 'WASH & Nutrition Communautaire', sub: 'Eau, hygiène, déterminants' },
      { id: 'tendances', icon: '📈', label: 'Tendances & Suivi Temporel', sub: 'Historique 2016-2024' }
    ];
    const zoneChips = NS.DATA.zones.map((z) =>
      `<button type="button" class="chip" data-zone="${z.id}" aria-pressed="true"><i style="background:${z.color}"></i>${z.label}</button>`
    ).join('');
    const countryChips = NS.DATA.countries.map((c) =>
      `<button type="button" class="chip chip-country" data-country-chip="${c.code}" aria-pressed="false">${c.name}</button>`
    ).join('');

    return `
    <div class="uni-app">
      <aside class="uni-side" aria-label="Navigation UNICEF NutriChild">
        <div class="uni-brand">
          <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
            <circle cx="22" cy="24" r="18" fill="none" stroke="#1CABE2" stroke-width="2.4"/>
            <ellipse cx="22" cy="24" rx="8" ry="18" fill="none" stroke="#1CABE2" stroke-width="1.4"/>
            <path d="M4 24h36" stroke="#1CABE2" stroke-width="1.4"/>
            <circle cx="20" cy="16" r="4.2" fill="#80BD41"/>
            <path d="M13.5 34c0-6 3-9.5 6.5-9.5s6.5 3.5 6.5 9.5z" fill="#80BD41"/>
            <rect x="31" y="27" width="11" height="18" rx="2.5" fill="#fff" stroke="#1CABE2" stroke-width="1.4"/>
            <circle cx="36.5" cy="41.5" r="0.9" fill="#1CABE2"/>
          </svg>
          <div>
            <b>UNICEF</b>
            <span>NutriChild</span>
          </div>
        </div>
        <nav class="uni-nav" aria-label="Sections du tableau de bord">
          ${navItems.map((n, i) => `
          <button type="button" data-nav="${n.id}" class="${i === 0 ? 'on' : ''}">
            <span class="nav-icon">${n.icon}</span>
            <span class="nav-text"><b>${n.label}</b><small>${n.sub}</small></span>
          </button>`).join('')}
        </nav>
        <div class="uni-side-foot">
          Source : application mobile terrain UNICEF &amp; relais communautaires (MUAC, suivi CRENAS).
          <br><em>Données de démonstration · à valider avant décision.</em>
        </div>
      </aside>

      <div class="uni-main">
        <header class="uni-header">
          <div class="uni-crumbs">
            <span>UNICEF</span><i>/</i><span>NutriChildApp</span><i>/</i>
            <b data-bind="crumb">Afrique de l’Ouest (Vue Régionale)</b>
          </div>
          <div class="uni-bar">
            <div class="uni-bar-titles">
              <h2>Surveillance Nutritionnelle Infantile</h2>
              <p>Données App Mobile Terrain · Agents Communautaires &amp; Centres Nutri 2024</p>
            </div>
            <div class="uni-controls">
              <div class="seg" role="group" aria-label="Mode de périmètre">
                <button type="button" data-mode="global">🌍 Afrique de l’Ouest (Vue Globale)</button>
                <button type="button" data-mode="country">🏳️ Sélectionner un Pays ▾</button>
              </div>
              <label class="uni-select" data-country-wrap>
                <span>Pays</span>
                <select data-country aria-label="Pays"></select>
              </label>
              <div class="seg" role="group" aria-label="Période">
                <button type="button" data-period="monthly">Mensuel</button>
                <button type="button" data-period="quarterly">Trimestriel</button>
              </div>
              <div class="uni-sync" title="Synchronisation des tablettes et téléphones terrain">
                <i class="pulse" aria-hidden="true"></i><span data-bind="sync"></span>
              </div>
              <button type="button" class="uni-btn" data-action="report">Générer Rapport</button>
            </div>
          </div>
          <div class="uni-chips">
            <span class="chips-label">Zones</span>
            ${zoneChips}
            <span class="chips-sep" aria-hidden="true"></span>
            <span class="chips-label">Pays</span>
            ${countryChips}
          </div>
        </header>

        <main class="uni-content">
          ${kpis()}
          ${grid()}
          <p class="uni-foot">Données de démonstration issues de la maquette d’application terrain. Les districts, séries historiques et courbes OMS approchées sont simulés pour l’interface et doivent être rapprochés des enquêtes officielles avant tout usage décisionnel.</p>
        </main>
      </div>
      <div class="uni-toast" role="status" aria-live="polite" data-bind="toast"></div>
    </div>`;
  }

  NS.template = template;
})(window);
