/* ============================================================================
   NUTRI.N°1 — WHO NUTRITION SURVEILLANCE · AFRIQUE DE L'OUEST
   who-surveillance.js — composant injecté dans la section #who de index.html.

   Pourquoi ce fichier ? La page index.html fait déjà ~39 000 lignes : tout le
   module OMS (structure, interactions, 15 graphiques Canvas) vit ici, dans des
   fichiers séparés, et n'est relié à index.html que par 4 balises (1 CSS + 3 JS).
   ==========================================================================*/
(function () {
  "use strict";

  var root = document.getElementById("who");
  var D = window.WHO_SURV;
  var CH = window.WHOCharts;
  if (!root || !D || !CH) return;
  if (root.getAttribute("data-wsv-ready") === "1") return;
  root.setAttribute("data-wsv-ready", "1");

  /* ------------------------------------------------------------- icônes SVG */
  var S = function (p, extra) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + ">" + p + "</svg>";
  };
  var ICO = {
    child: S('<path d="M12 3a3 3 0 0 1 3 3v1a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3z"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/><path d="M3 12h3M18 12h3"/>'),
    scale: S('<path d="M12 4v16"/><path d="M5 8h14"/><path d="M5 8l-2 6h4z"/><path d="M19 8l-2 6h4z"/>'),
    drop: S('<path d="M12 3s6 6.5 6 10.5A6 6 0 0 1 6 13.5C6 9.5 12 3 12 3z"/>'),
    pill: S('<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9v6"/>'),
    balance: S('<path d="M12 4v16"/><path d="M6 20h12"/><path d="M4 8h16"/><path d="M4 8l-2 5h4z"/><path d="M20 8l-2 5h4z"/>'),
    overview: S('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    ruler: S('<path d="M3 14h18"/><path d="M7 14V9M11 14V7M15 14v-4M19 14V11"/>'),
    micro: S('<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="4"/>'),
    baby: S('<circle cx="12" cy="8" r="3.2"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><path d="M9.5 8h.01M14.5 8h.01"/>'),
    map: S('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
    report: S('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>'),
    cross: S('<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z" fill="#fff" stroke="none"/>'),
    pdf: S('<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 19h16"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    trend: S('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  };

  /* ---------------------------------------------------------------- helpers */
  var $ = function (s, p) { return (p || root).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || root).querySelectorAll(s)); };
  var nf = function (v, d) {
    return Number(v).toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };
  /* 47 -> "47" mais 28.4 -> "28,4" : pas de décimale inutile */
  var fmtPct = function (v) {
    return nf(v, Math.round(v * 10) % 10 === 0 ? 0 : 1);
  };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var toast = function (msg) {
    if (typeof window.toast === "function") window.toast(msg);
    else console.log("[WHO]", msg);
  };

  /* ------------------------------------------------------------------ état */
  var state = {
    country: "ALL",
    year: 2024,
    nav: "overview",
    rank: "stunting",
    radar: ["NE", "SN", "GH"],
    heatSort: null,
    sortKey: "score",
    sortDir: -1,
    q: "",
    hidden1: {},
    ready: false,
  };

  var C = {
    blue: "#0066CC", blue2: "#0099FF", emerald: "#00A86B", orange: "#FF6B35",
    violet: "#7C3AED", danger: "#EF4444", success: "#10B981", amber: "#F59E0B",
    slate: "#94A3B8", pink: "#F472B6",
  };
  var SERIES_COLORS = { NE: C.blue, ML: C.orange, BF: C.violet, SN: C.emerald, NG: C.amber };

  var CHIP_COUNTRIES = ["NE", "ML", "BF", "SN", "NG"];
  var OTHER_COUNTRIES = D.COUNTRIES.filter(function (c) { return CHIP_COUNTRIES.indexOf(c.code) === -1; });

  /* =============================================================== MARKUP */
  function kpiCard(o) {
    return (
      '<div class="wsv-kpi" style="animation-delay:' + o.delay + 'ms">' +
      '<div class="wsv-kpi-top">' +
      '<span class="wsv-kpi-ico">' + o.icon + "</span>" +
      '<div class="wsv-kpi-val" id="' + o.id + 'Val">' + o.value + "</div>" +
      "</div>" +
      '<div class="wsv-kpi-lab">' + o.label + "</div>" +
      '<div class="wsv-kpi-sub" id="' + o.id + 'Sub">' + o.sub + "</div>" +
      '<span class="wsv-badge ' + o.badgeCls + '" id="' + o.id + 'Badge">' + o.badge + "</span>" +
      '<div class="wsv-kpi-mini"><canvas id="' + o.id + 'Mini"></canvas></div>' +
      '<div class="wsv-kpi-foot">' + o.foot + "</div>" +
      "</div>"
    );
  }

  function cardHead(title, sub, icon, tools, id) {
    return (
      '<div class="wsv-card-head"><div><h3>' + (icon ? "<i>" + icon + "</i>" : "") + title + "</h3>" +
      "<p>" + sub + "</p></div>" +
      (tools ? '<div class="wsv-card-tools">' + tools + "</div>" : "") + "</div>"
    );
  }

  var MARKUP =
    '<div class="wsv-shell">' +

    /* ---------------------------------------------------------- sidebar */
    '<aside class="wsv-side">' +
    '<div class="wsv-brand"><span class="wsv-logo">' + ICO.cross + "</span>" +
    '<span class="wsv-brand-txt"><b>WHO NutriData</b><span>Surveillance</span></span></div>' +
    '<nav class="wsv-nav" id="wsvNav">' +
    '<button type="button" class="on" data-target="top">' + ICO.overview + "<span>Vue d'ensemble</span></button>" +
    '<button type="button" data-target="g1">' + ICO.ruler + "<span>Anthropométrie</span></button>" +
    '<button type="button" data-target="g14">' + ICO.micro + "<span>Micronutriments</span></button>" +
    '<button type="button" data-target="g9">' + ICO.baby + "<span>Nutrition ANJE</span></button>" +
    '<button type="button" data-target="g12">' + ICO.map + "<span>Carte régionale</span></button>" +
    '<button type="button" data-target="g15">' + ICO.report + "<span>Rapports</span></button>" +
    "</nav>" +
    '<div class="wsv-side-foot">' +
    '<button type="button" class="wsv-side-btn" id="wsvOpenCockpit">' + ICO.trend + "<span>Cockpit investissement OMS</span></button>" +
    '<p class="wsv-side-note">Données illustratives de surveillance · cadres OMS / UNICEF · 16 pays d\'Afrique de l\'Ouest · mise à jour ' + D.REGION.year + ".</p>" +
    "</div>" +
    "</aside>" +

    /* ------------------------------------------------------------ corps */
    '<div class="wsv-body">' +

    /* header */
    '<header class="wsv-top" id="wsvTop">' +
    '<div class="wsv-top-row"><div>' +
    '<div class="wsv-crumb">OMS <span>/</span> Afrique de l\'Ouest <span>/</span> <b id="wsvCrumbYear">' + state.year + "</b></div>" +
    "<h2>Surveillance <em>Nutritionnelle</em></h2>" +
    '<p class="wsv-sub" id="wsvScope">Afrique de l\'Ouest · 16 pays · Données ' + state.year + "</p>" +
    "</div>" +
    '<div class="wsv-top-actions">' +
    '<span class="wsv-live"><i></i><span id="wsvLive">Mis à jour</span></span>' +
    '<select class="wsv-select" id="wsvPeriod" aria-label="Période">' +
    "<option>2024</option><option>2023</option><option>2022</option>" +
    "</select>" +
    '<button type="button" class="wsv-btn" id="wsvExport">' + ICO.pdf + "Exporter PDF</button>" +
    "</div></div>" +
    '<div class="wsv-filters">' +
    '<span class="wsv-filters-label">Filtre pays</span>' +
    '<button type="button" class="wsv-chip on" data-country="ALL">Tous ▾</button>' +
    CHIP_COUNTRIES.map(function (code) {
      var c = D.BY_CODE[code];
      return '<button type="button" class="wsv-chip" data-country="' + code + '">' + c.flag + " " + c.name + "</button>";
    }).join("") +
    '<select class="wsv-select" id="wsvMoreCountries" aria-label="Autres pays"><option>+ 11 pays</option>' +
    OTHER_COUNTRIES.map(function (c) { return "<option>" + c.flag + " " + c.name + "</option>"; }).join("") +
    "</select>" +
    '<span class="wsv-tag grey" id="wsvActiveFilter">Vue régionale</span>' +
    "</div>" +
    "</header>" +

    /* KPI */
    '<div class="wsv-kpis" id="wsvKpis">' +
    kpiCard({
      id: "wsvK1", delay: 0, icon: ICO.child, value: "28.4<small>%</small>",
      label: "Retard de croissance", sub: "Enfants &lt; 5 ans · Région",
      badge: "↓ −2,1 pts vs 2023", badgeCls: "down",
      foot: "<span>Prévalence régionale</span><b>Objectif OMS &lt; 20 %</b>",
    }) +
    kpiCard({
      id: "wsvK2", delay: 60, icon: ICO.scale, value: "8.9<small>%</small>",
      label: "Malnutrition aigüe globale", sub: "Seuil urgence OMS : &gt; 10 %",
      badge: "↑ +0,3 pt", badgeCls: "up",
      foot: "<span>Pic admissions CRENAS</span><b>Index 180 · août</b>",
    }) +
    kpiCard({
      id: "wsvK3", delay: 120, icon: ICO.drop, value: "52.7<small>%</small>",
      label: "Anémie — femmes 15-49 ans", sub: "16 pays · Afrique de l\'Ouest",
      badge: "→ Stable", badgeCls: "flat",
      foot: "<span>Objectif OMS 40 %</span><b>Écart 12,7 pts</b>",
    }) +
    kpiCard({
      id: "wsvK4", delay: 180, icon: ICO.pill, value: "67.3<small>%</small>",
      label: "Vitamine A — 6-59 mois", sub: "Objectif OMS : 80 %",
      badge: "↑ +4,2 pts", badgeCls: "good",
      foot: '<span id="wsvK4Foot">Pays &gt; 80 %</span><b id="wsvK4FootVal">2 pays</b>',
    }) +
    kpiCard({
      id: "wsvK5", delay: 240, icon: ICO.balance, value: '11<small> pays</small>',
      label: "Double fardeau nutritionnel", sub: "Sous-nutrition + obésité coexistent",
      badge: "↑ +2 pays", badgeCls: "warn",
      foot: "<span>Sévère 5 · modéré 6</span><b>Non concernés 5</b>",
    }) +
    "</div>" +

    /* ------------------------------------------------------- graphiques */
    '<div class="wsv-grid">' +

    /* 1 */
    '<section class="wsv-card wsv-c7" id="g1" style="animation-delay:280ms">' +
    cardHead("Évolution Stunting 2014-2024", "Prévalence du retard de croissance · 5 pays suivis", ICO.trend,
      CHIP_COUNTRIES.map(function (code, i) {
        var c = D.BY_CODE[code];
        return '<button type="button" class="wsv-chip on" data-series="' + code + '" style="border-color:' + SERIES_COLORS[code] + ';color:' + SERIES_COLORS[code] + '"><i style="width:8px;height:8px;border-radius:3px;background:' + SERIES_COLORS[code] + ';display:inline-block"></i>' + c.name + "</button>";
      }).join("")) +
    '<div class="wsv-canvas h320"><canvas id="wsvChart1"></canvas></div>' +
    '<div class="wsv-card-foot"><span>Zone grisée 2020-2021 : impact COVID-19 · seuil d\'urgence OMS 20 %</span><span>Animation séquentielle des courbes</span></div>' +
    "</section>" +

    /* 2 */
    '<section class="wsv-card wsv-c5" id="g2" style="animation-delay:320ms">' +
    cardHead("Prévalence par pays 2024", "Classement régional · 16 pays", ICO.ruler,
      '<select class="wsv-select" id="wsvRankSel">' +
      '<option value="stunting">Stunting</option><option value="wasting">Wasting</option>' +
      '<option value="anemia">Anémie</option><option value="vitA">Vit. A</option></select>') +
    '<div class="wsv-canvas h320"><canvas id="wsvChart2"></canvas></div>' +
    '<div class="wsv-card-foot"><span>Rouge &gt; 35 % · orange 20-35 % · vert 10-20 % · bleu &lt; 10 %</span></div>' +
    "</section>" +

    /* 3 */
    '<section class="wsv-card wsv-c4" id="g3" style="animation-delay:360ms">' +
    cardHead("Radar nutritionnel multi-pays", "Profil comparé · 100 = situation la plus défavorable", ICO.micro,
      '<select class="wsv-select wsv-radar" data-slot="0"></select>' +
      '<select class="wsv-select wsv-radar" data-slot="1"></select>' +
      '<select class="wsv-select wsv-radar" data-slot="2"></select>') +
    '<div class="wsv-canvas h260"><canvas id="wsvChart3"></canvas></div>' +
    '<div class="wsv-card-foot"><span class="wsv-legend-inline" id="wsvRadarLegend"></span></div>' +
    "</section>" +

    /* 4 */
    '<section class="wsv-card wsv-c4" id="g4" style="animation-delay:400ms">' +
    cardHead("Saisonnalité de la malnutrition", "Index des admissions CRENAS (base 100) · 2023 vs 2024", ICO.clock,
      '<span class="wsv-tag orange">Soudure Juin-Août</span>') +
    '<div class="wsv-canvas h260"><canvas id="wsvChart4"></canvas></div>' +
    '<div class="wsv-card-foot"><span class="wsv-legend-inline"><span><i style="background:#94A3B8"></i>2023</span><span><i style="background:#0066CC"></i>2024</span></span></div>' +
    "</section>" +

    /* 5 */
    '<section class="wsv-card wsv-c4" id="g5" style="animation-delay:440ms">' +
    cardHead("Distribution de la malnutrition", "Enfants de moins de 5 ans · Afrique de l\'Ouest", ICO.child,
      '<span class="wsv-tag">22,8 % au total</span>') +
    '<div class="wsv-canvas h210"><canvas id="wsvChart5"></canvas></div>' +
    '<div class="wsv-legend" id="wsvDonutLegend"></div>' +
    "</section>" +

    /* 6 */
    '<section class="wsv-card wsv-c6" id="g6" style="animation-delay:480ms">' +
    cardHead("PIB par habitant vs nutrition", "Bulles = population d\'enfants &lt; 5 ans · zoom molette, glisser pour panoramiquer", ICO.trend,
      '<button type="button" class="wsv-chip" id="wsvBubbleReset">Réinitialiser</button>') +
    '<div class="wsv-canvas h300"><canvas id="wsvChart6"></canvas></div>' +
    '<div class="wsv-card-foot"><span class="wsv-legend-inline">' +
    '<span><i style="background:#EF4444"></i>Sahel</span><span><i style="background:#3B82F6"></i>Côtier</span><span><i style="background:#10B981"></i>Insulaire</span>' +
    "</span><span>Régression : relation inverse PIB / stunting</span></div>" +
    "</section>" +

    /* 7 */
    '<section class="wsv-card wsv-c6" id="g7" style="animation-delay:520ms">' +
    cardHead("Impact des interventions", "Waterfall des réductions de stunting · 2015 → 2024", ICO.trend,
      '<span class="wsv-tag">Total −9 pts</span>') +
    '<div class="wsv-canvas h300"><canvas id="wsvChart7"></canvas></div>' +
    '<div class="wsv-card-foot"><span>Barre rouge : départ 2015 (47 %) · barre bleue : résultat 2024 (38 %)</span></div>' +
    "</section>" +

    /* 8 */
    '<section class="wsv-card wsv-c12" id="g8" style="animation-delay:560ms">' +
    cardHead("Heatmap pays × indicateurs", "Score de sévérité OMS · 16 pays × 8 indicateurs · cliquez sur une colonne pour trier", ICO.map,
      '<span class="wsv-tag grey" id="wsvHeatInfo">Tri : par défaut</span>') +
    '<div class="wsv-canvas h380"><canvas id="wsvChart8"></canvas></div>' +
    '<div class="wsv-heat-legend">' +
    "<span>Faible</span><i style=\"background:#DCFCE7\"></i><i style=\"background:#FEF3C7\"></i>" +
    "<i style=\"background:#FED7AA\"></i><i style=\"background:#FECACA\"></i><i style=\"background:#DC2626\"></i>" +
    "<span>Critique</span><span style=\"margin-left:10px\">Score : 0 = meilleure situation régionale · 100 = la plus défavorable · &gt;100 = dépassement majeur du seuil OMS</span>" +
    "</div>" +
    "</section>" +

    /* 9 */
    '<section class="wsv-card wsv-c7" id="g9" style="animation-delay:600ms">' +
    cardHead("Indicateurs ANJE par pays", "Pratiques d\'alimentation du nourrisson et du jeune enfant", ICO.baby,
      '<span class="wsv-legend-inline">' + D.ANJE_COUNTRIES.map(function (c) {
        return '<span><i style="background:' + c.color + '"></i>' + c.name + "</span>";
      }).join("") + "</span>") +
    '<div class="wsv-canvas h340"><canvas id="wsvChart9"></canvas></div>' +
    '<div class="wsv-card-foot"><span>Trait rouge pointillé : objectif OMS par indicateur</span></div>' +
    "</section>" +

    /* 10 */
    '<section class="wsv-card wsv-c5" id="g10" style="animation-delay:640ms">' +
    cardHead("Tendance de l\'anémie", "Prévalence empilée par groupe · 2017-2024", ICO.drop,
      '<span class="wsv-tag orange">Objectif 20 %</span>') +
    '<div class="wsv-canvas h340"><canvas id="wsvChart10"></canvas></div>' +
    '<div class="wsv-card-foot"><span class="wsv-legend-inline">' +
    D.ANEMIA_TREND.series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + s.name + "</span>"; }).join("") +
    "</span></div>" +
    "</section>" +

    /* 11 */
    '<section class="wsv-card wsv-c4" id="g11" style="animation-delay:680ms">' +
    cardHead("Polar — saisonnalité", "Admissions malnutrition par mois · 3 années superposées", ICO.clock,
      '<span class="wsv-tag grey">Jun-Sep</span>') +
    '<div class="wsv-canvas h260"><canvas id="wsvChart11"></canvas></div>' +
    '<div class="wsv-card-foot"><span class="wsv-legend-inline"><span><i style="background:#94A3B8"></i>2021</span><span><i style="background:#38BDF8"></i>2023</span><span><i style="background:#0066CC"></i>2024</span></span></div>' +
    "</section>" +

    /* 12 */
    '<section class="wsv-card wsv-c4" id="g12" style="animation-delay:720ms">' +
    cardHead("Eau &amp; assainissement × stunting", "Accès à l\'eau potable vs retard de croissance · R² = 0,61", ICO.map,
      '<span class="wsv-tag">WASH</span>') +
    '<div class="wsv-canvas h260"><canvas id="wsvChart12"></canvas></div>' +
    '<div class="wsv-card-foot"><span>4 quadrants de vulnérabilité · taille des points = population</span></div>' +
    "</section>" +

    /* 13 */
    '<section class="wsv-card wsv-c4" id="g13" style="animation-delay:760ms">' +
    cardHead("Timeline des 1000 jours", "De la conception à 24 mois · fenêtre d\'or de l\'intervention", ICO.baby,
      '<span class="wsv-tag orange">−20 % stunting</span>') +
    '<div class="wsv-canvas h260"><canvas id="wsvChart13"></canvas></div>' +
    '<div class="wsv-card-foot"><span>Survolez les jalons pour le détail des interventions</span></div>' +
    "</section>" +

    /* 14 */
    '<section class="wsv-card wsv-c6" id="g14" style="animation-delay:800ms">' +
    cardHead("Jauges micronutriments", "Couverture des suppléments · objectif OMS 80 %", ICO.pill,
      '<span class="wsv-tag">2 conformes / 6</span>') +
    '<div class="wsv-canvas h260"><canvas id="wsvChart14"></canvas></div>' +
    '<div class="wsv-card-foot"><span>Rouge &lt; 50 % · orange 50-75 % · vert &gt; 75 %</span></div>' +
    "</section>" +

    /* référence seuils */
    '<section class="wsv-card wsv-c6" id="gref" style="animation-delay:840ms">' +
    cardHead("Seuils &amp; objectifs OMS", "Référentiel utilisé par l\'ensemble des graphiques", ICO.info) +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 14px;font-size:11.5px;color:#334155">' +
    refRow("Stunting", "&lt; 20 %", "Seuil d\'acceptabilité", C.blue) +
    refRow("Wasting", "&lt; 10 %", "Seuil d\'urgence", C.danger) +
    refRow("Anémie (femmes)", "&lt; 40 %", "Objectif 2025", C.orange) +
    refRow("Vitamine A", "≥ 80 %", "Couverture 6-59 mois", C.emerald) +
    refRow("Sel iodé", "≥ 90 %", "Ménages", C.emerald) +
    refRow("Allaitement exclusif", "≥ 60 %", "0-5 mois", C.emerald) +
    refRow("Fer + acide folique", "≥ 80 %", "Femmes enceintes", C.danger) +
    refRow("MAM", "&lt; 5 %", "Enfants &lt; 5 ans", C.amber) +
    "</div>" +
    '<div class="wsv-card-foot"><span>Sources : cadres de surveillance OMS, UNICEF, WFP (données illustratives)</span></div>' +
    "</section>" +

    /* 15 */
    '<section class="wsv-card wsv-c12" id="g15" style="animation-delay:880ms">' +
    cardHead("Scorecard régional complet", "16 pays · tri par en-tête · recherche instantanée", ICO.report,
      '<button type="button" class="wsv-chip" id="wsvCsv">Exporter CSV</button>') +
    '<div class="wsv-table-tools">' +
    '<div class="wsv-search"><input type="search" id="wsvSearch" placeholder="Rechercher un pays…" aria-label="Rechercher un pays"></div>' +
    '<span class="wsv-tag grey" id="wsvTableCount">16 pays</span>' +
    "</div>" +
    '<div class="wsv-table-wrap"><table class="wsv-table"><thead><tr>' +
    th("pays", "Pays") + th("stunting", "Stunting") + th("wasting", "Wasting") + th("anemia", "Anémie") +
    th("vitA", "Vit. A") + th("score", "Score") + th("trend", "Tendance") + th("status", "Statut") +
    '<th>Action</th>' +
    "</tr></thead>" +
    '<tbody id="wsvTableBody"></tbody>' +
    "</table></div>" +
    '<div class="wsv-card-foot"><span>Score composite 0-100 (100 = meilleure situation) · trait noir = objectif 70</span>' +
    "<span>Survolez une ligne pour la mettre en évidence</span></div>" +
    "</section>" +

    "</div>" + // grid
    "</div>" + // body
    "</div>"; // shell

  function refRow(name, target, note, color) {
    return (
      '<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid #E0EEFF;border-radius:10px;background:#F7FBFF">' +
      '<i style="width:6px;height:26px;border-radius:3px;background:' + color + ';display:block;flex:0 0 6px"></i>' +
      "<div><b style=\"font-size:11.5px;color:#0F172A\">" + name + "</b>" +
      '<div style="font-size:9.5px;color:#64748B">' + note + "</div></div>" +
      '<b style="margin-left:auto;font-size:12px;color:' + color + '">' + target + "</b></div>"
    );
  }
  function th(key, label) {
    return '<th data-key="' + key + '">' + label + ' <span class="wsv-arrow"></span></th>';
  }

  /* ============================================================ RENDU KPI */
  var kpiCharts = {};
  function renderKpis() {
    var isAll = state.country === "ALL";
    var k = D.KPI_BY_YEAR[state.year];
    var c = isAll ? null : D.BY_CODE[state.country];
    var stunting = isAll ? k.stunting : c.stunting;
    var wasting = isAll ? k.wasting : c.wasting;
    var anemia = isAll ? k.anemia : c.anemia;
    var vitA = isAll ? k.vitA : c.vitA;

    $("#wsvK1Val").innerHTML = fmtPct(stunting) + "<small>%</small>";
    $("#wsvK1Sub").innerHTML = isAll ? "Enfants &lt; 5 ans · Région" : "Enfants &lt; 5 ans · " + esc(c.name);
    $("#wsvK1Badge").className = "wsv-badge down";
    $("#wsvK1Badge").innerHTML = "↓ −2,1 pts vs " + (state.year - 1);

    $("#wsvK2Val").innerHTML = fmtPct(wasting) + "<small>%</small>";
    $("#wsvK2Sub").innerHTML = "Seuil urgence OMS : &gt; 10 %" + (isAll ? "" : " · " + esc(c.name));
    $("#wsvK2Badge").className = "wsv-badge " + (wasting >= 10 ? "up" : "warn");
    $("#wsvK2Badge").innerHTML = wasting >= 10 ? "↑ Au-dessus du seuil" : "↑ +0,3 pt vs " + (state.year - 1);

    $("#wsvK3Val").innerHTML = fmtPct(anemia) + "<small>%</small>";
    $("#wsvK3Sub").innerHTML = isAll ? "16 pays · Afrique de l'Ouest" : "Femmes 15-49 ans · " + esc(c.name);
    $("#wsvK3Badge").className = "wsv-badge flat";
    $("#wsvK3Badge").innerHTML = "→ Stable vs " + (state.year - 1);

    $("#wsvK4Val").innerHTML = fmtPct(vitA) + "<small>%</small>";
    $("#wsvK4Sub").innerHTML = "Enfants 6-59 mois supplémentés" + (isAll ? "" : " · " + esc(c.name));
    $("#wsvK4Badge").className = "wsv-badge good";
    $("#wsvK4Badge").innerHTML = "↑ +4,2 pts vs " + (state.year - 1);
    var above = D.COUNTRIES.filter(function (x) { return x.vitA > 80; }).length;
    $("#wsvK4Foot").innerHTML = "Pays &gt; 80 %";
    $("#wsvK4FootVal").innerHTML = above + " pays";

    if (isAll) {
      $("#wsvK5Val").innerHTML = k.doubleBurden + "<small> pays</small>";
      $("#wsvK5Sub").innerHTML = "Sous-nutrition + obésité coexistent";
      $("#wsvK5Badge").className = "wsv-badge warn";
      $("#wsvK5Badge").innerHTML = "↑ +2 pays vs " + (state.year - 1);
    } else {
      $("#wsvK5Val").innerHTML = c.db ? "Oui" : "Non";
      $("#wsvK5Sub").innerHTML = c.db
        ? "Double fardeau · niveau " + (c.dbLevel === "severe" ? "sévère" : "modéré")
        : "Aucun double fardeau détecté";
      $("#wsvK5Badge").className = "wsv-badge " + (c.db ? "warn" : "good");
      $("#wsvK5Badge").innerHTML = c.db ? "Surveillance renforcée" : "Hors périmètre";
    }

    if (!state.ready) return;
    /* mini-graphiques */
    if (kpiCharts.k1) kpiCharts.k1.update({ data: sparkFor(stunting), color: C.blue });
    if (kpiCharts.k2) kpiCharts.k2.update({ value: wasting, max: 15, color: C.orange, threshold: 10 });
    if (kpiCharts.k3) kpiCharts.k3.update({ rows: isAll ? D.ANEMIA_TOP5 : [{ label: c.name.slice(0, 8), value: anemia }], max: 100, color: C.danger });
    if (kpiCharts.k4) kpiCharts.k4.update({ value: vitA, objective: 80 });
  }

  function sparkFor(v) {
    var base = D.seeded("kpi" + Math.round(v * 10)) - 0.5;
    return D.STUNTING_MONTHLY.map(function (x, i) {
      return Math.round((x * (v / 28.4) + base * i * 0.05) * 10) / 10;
    });
  }

  /* ============================================================ TABLEAU */
  function tableRows() {
    var rows = D.COUNTRIES.slice();
    if (state.country !== "ALL") rows = rows.filter(function (r) { return r.code === state.country; });
    if (state.q) {
      var q = state.q.toLowerCase();
      rows = rows.filter(function (r) { return r.name.toLowerCase().indexOf(q) > -1 || r.code.toLowerCase().indexOf(q) > -1; });
    }
    var k = state.sortKey, dir = state.sortDir;
    rows.sort(function (a, b) {
      var va = a[k], vb = b[k];
      if (typeof va === "string") return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
    return rows;
  }

  var miniCharts = [];
  function renderTable() {
    var rows = tableRows();
    var tb = $("#wsvTableBody");
    miniCharts.forEach(function (m) { m.destroy && m.destroy(); });
    miniCharts = [];
    var html = rows.map(function (c) {
      var st = D.statusOf(c.score);
      var trendUp = c.spark[c.spark.length - 1] > c.spark[0];
      var cls = function (v, good, bad) { return v < good ? "wsv-good" : v < bad ? "wsv-warn" : "wsv-alert"; };
      return (
        "<tr>" +
        '<td><span class="wsv-flag">' + c.flag + "</span> <b>" + esc(c.name) + "</b></td>" +
        '<td class="wsv-cell-val ' + cls(c.stunting, 20, 35) + '">' + nf(c.stunting, 0) + " %</td>" +
        '<td class="wsv-cell-val ' + cls(c.wasting, 5, 10) + '">' + nf(c.wasting, 1) + " %</td>" +
        '<td class="wsv-cell-val ' + cls(c.anemia, 40, 55) + '">' + nf(c.anemia, 0) + " %</td>" +
        '<td class="wsv-cell-val ' + cls(100 - c.vitA, 15, 30) + '">' + nf(c.vitA, 0) + " %</td>" +
        "<td><b>" + c.score + "</b></td>" +
        '<td><div class="wsv-mini-cell"><canvas data-spark="' + c.code + '"></canvas></div></td>' +
        "<td>" + (trendUp
          ? '<span style="color:#B91C1C;font-weight:800">▲ hausse</span>'
          : '<span style="color:#047857;font-weight:800">▼ baisse</span>') + "</td>" +
        '<td><span class="wsv-pill ' + st.cls + '">' + st.label + "</span></td>" +
        '<td><button type="button" class="wsv-link" data-report="' + c.code + '">Voir rapport</button></td>' +
        "</tr>"
      );
    }).join("");
    /* moyenne */
    var avg = function (key) {
      return rows.length ? rows.reduce(function (s, r) { return s + r[key]; }, 0) / rows.length : 0;
    };
    html +=
      '<tr class="total"><td>Moyenne régionale</td>' +
      "<td>" + nf(avg("stunting"), 1) + " %</td><td>" + nf(avg("wasting"), 1) + " %</td>" +
      "<td>" + nf(avg("anemia"), 1) + " %</td><td>" + nf(avg("vitA"), 1) + " %</td>" +
      "<td>" + nf(avg("score"), 0) + "</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>";
    tb.innerHTML = html;
    $("#wsvTableCount").textContent = rows.length + (rows.length > 1 ? " pays" : " pays");
    /* mini canvas */
    $$("canvas[data-spark]", tb).forEach(function (cv) {
      var c = D.BY_CODE[cv.getAttribute("data-spark")];
      var up = c.spark[c.spark.length - 1] > c.spark[0];
      miniCharts.push(CH.sparkLine(cv, { data: c.spark, color: up ? C.danger : C.success }));
    });
    /* en-têtes triés */
    $$("#g15 thead th").forEach(function (thEl) {
      var key = thEl.getAttribute("data-key");
      thEl.classList.toggle("sorted", key === state.sortKey);
      var arrow = thEl.querySelector(".wsv-arrow");
      if (arrow) arrow.textContent = key === state.sortKey ? (state.sortDir === 1 ? "▲" : "▼") : "";
    });
  }

  /* ============================================================ HEATMAP */
  function heatCfg() {
    var rows = D.COUNTRIES.slice();
    if (state.country !== "ALL") rows = rows.filter(function (r) { return r.code === state.country; });
    if (state.heatSort) {
      var ind = D.HEAT_INDICATORS[state.heatSort.j];
      var dir = state.heatSort.dir;
      rows.sort(function (a, b) {
        var sa = severity(ind, a[ind.key]), sb = severity(ind, b[ind.key]);
        return (sa - sb) * dir;
      });
    }
    return {
      indicators: D.HEAT_INDICATORS,
      regional: D.HEAT_INDICATORS.map(function (ind) {
        var vals = D.COUNTRIES.map(function (c) { return c[ind.key]; });
        var m = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
        return { text: nf(m, 1) + (ind.key === "mam" || ind.key === "overweight" ? "" : "%"), score: severity(ind, m) };
      }),
      rows: rows.map(function (c) {
        return {
          name: c.name, flag: c.flag,
          cells: D.HEAT_INDICATORS.map(function (ind) {
            var v = c[ind.key];
            var s = severity(ind, v);
            return {
              text: nf(v, 1) + (ind.key === "mam" || ind.key === "overweight" ? "" : "%"),
              score: s,
              rank: rankOf(ind, v),
              status: s > 100 ? "CRITIQUE" : s > 75 ? "ALERTE" : s > 50 ? "VIGILANCE" : "ACCEPTABLE",
            };
          }),
        };
      }),
    };
  }
  /* Score de severite 0-100 :
     0   = meilleure situation observée dans la région
     100 = situation la plus défavorable de la région
     >100 = dépassement majeur du seuil OMS (bande "urgence")
     Les indicateurs de couverture (vit. A, iode, allaitement) sont inversés :
     une couverture faible est une situation défavorable.                       */
  function severity(ind, v) {
    var vals = D.COUNTRIES.map(function (c) { return c[ind.key]; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var s = ind.dir === "low"
      ? ((max - v) / (max - min || 1)) * 100
      : ((v - min) / (max - min || 1)) * 100;
    var breach = ind.dir === "low" ? v <= ind.threshold * 0.6 : v >= ind.threshold * 1.5;
    if (breach) s = Math.max(s, 105);
    return s;
  }

  /* Rang régional 1..16 (1 = situation la plus défavorable) */
  function rankOf(ind, v) {
    var sorted = D.COUNTRIES.slice().sort(function (a, b) {
      return severity(ind, b[ind.key]) - severity(ind, a[ind.key]);
    });
    for (var i = 0; i < sorted.length; i++) if (sorted[i][ind.key] === v) return i + 1;
    return 1;
  }

  /* ============================================================ CHARTS */
  var charts = {};

  function buildCharts() {
    var yr = D.YEARS.indexOf(state.year);
    var labels = D.YEARS.slice(0, yr + 1);

    /* --- KPI mini --- */
    kpiCharts.k1 = CH.sparkBars($("#wsvK1Mini"), { data: sparkFor(D.KPI_BY_YEAR[state.year].stunting), color: C.blue });
    kpiCharts.k2 = CH.arcGauge($("#wsvK2Mini"), { value: D.KPI_BY_YEAR[state.year].wasting, max: 15, color: C.orange, threshold: 10 });
    kpiCharts.k3 = CH.miniBars($("#wsvK3Mini"), { rows: D.ANEMIA_TOP5, max: 100, color: C.danger });
    kpiCharts.k4 = CH.progressBar($("#wsvK4Mini"), { value: D.KPI_BY_YEAR[state.year].vitA, objective: 80 });
    kpiCharts.k5 = CH.donutMini($("#wsvK5Mini"), {
      thickness: 11,
      center: String(D.KPI_BY_YEAR[state.year].doubleBurden),
      segments: [
        { value: 5, color: C.danger },
        { value: 6, color: C.orange },
        { value: 5, color: C.success },
      ],
    });

    /* --- 1 : multi-lignes --- */
    charts.g1 = CH.multiLine($("#wsvChart1"), {
      labels: labels,
      series: CHIP_COUNTRIES.map(function (code) {
        var c = D.BY_CODE[code];
        return { name: c.name, color: SERIES_COLORS[code], data: c.series.slice(0, yr + 1), visible: state.hidden1[code] !== true };
      }),
      yMax: 55, yMin: 0,
      threshold: { value: 20, label: "Seuil urgence OMS 20 %" },
      zone: { x0: 2020, x1: 2021, label: "Impact COVID" },
    });

    /* --- 2 : barres horizontales --- */
    charts.g2 = CH.hbar($("#wsvChart2"), rankCfg());

    /* --- 3 : radar --- */
    charts.g3 = CH.radar($("#wsvChart3"), radarCfg());

    /* --- 4 : double aire --- */
    charts.g4 = CH.dualArea($("#wsvChart4"), {
      labels: D.MONTHS,
      series: [
        { name: "2023", color: C.slate, fill: 0.08, data: D.SEASON[2023], order: 0, width: 2 },
        { name: "2024", color: C.blue, fill: 0.15, data: D.SEASON[2024], order: 1, width: 2.6 },
      ],
      band: { from: 5, to: 7, label: "Période de soudure" },
      peak: { index: 7, label: "Pic : +80 %" },
    });

    /* --- 5 : donut --- */
    charts.g5 = CH.donut($("#wsvChart5"), {
      segments: D.DONUT, thickness: 32,
      center: { top: "Malnutrition totale", value: "22,8 %", bottom: "Afrique de l'Ouest" },
    });
    $("#wsvDonutLegend").innerHTML = D.DONUT.map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + s.label + " · <b>" + nf(s.value, 1) + " %</b> · " + s.children + "</span>";
    }).join("");

    /* --- 6 : bulles --- */
    charts.g6 = CH.bubble($("#wsvChart6"), bubbleCfg());

    /* --- 7 : waterfall --- */
    charts.g7 = CH.waterfall($("#wsvChart7"), D.WATERFALL);

    /* --- 8 : heatmap --- */
    charts.g8 = CH.heatmap($("#wsvChart8"), heatCfg());

    /* --- 9 : ANJE --- */
    charts.g9 = CH.groupedHBar($("#wsvChart9"), {
      indicators: D.ANJE_INDICATORS, countries: D.ANJE_COUNTRIES,
    });

    /* --- 10 : aires empilées --- */
    charts.g10 = CH.stackedArea($("#wsvChart10"), {
      years: D.ANEMIA_TREND.years, series: D.ANEMIA_TREND.series,
      objective: { value: 20, label: "Objectif OMS enfants 20 %" },
    });

    /* --- 11 : polaire --- */
    charts.g11 = CH.polar($("#wsvChart11"), {
      labels: D.MONTHS,
      series: [
        { name: "2021", color: C.slate, alpha: 0.12, data: D.SEASON[2023].map(function (v) { return v * 0.94; }) },
        { name: "2023", color: "#38BDF8", alpha: 0.16, data: D.SEASON[2023] },
        { name: "2024", color: C.blue, alpha: 0.5, data: D.SEASON[2024] },
      ],
      highlight: [5, 6, 7, 8],
    });

    /* --- 12 : scatter WASH --- */
    charts.g12 = CH.scatter($("#wsvChart12"), {
      points: D.COUNTRIES.map(function (c) {
        return {
          name: c.name, flag: c.flag, x: c.water, y: c.stunting, color: D.BUBBLE_COLORS[c.subregion],
          r: 5 + Math.sqrt(c.pop) * 2.4, subregion: c.subregion, big: c.pop > 3,
        };
      }),
      xDomain: [30, 90], yDomain: [8, 50],
      xLabel: "% accès eau potable",
      quadrants: [
        { x0: 60, x1: 90, y0: 8, y1: 25, color: "rgba(16,185,129,.07)", label: "↙ Double OK" },
        { x0: 30, x1: 60, y0: 25, y1: 50, color: "rgba(239,68,68,.07)", label: "↗ Double NOK" },
        { x0: 30, x1: 60, y0: 8, y1: 25, color: "rgba(0,102,204,.07)", label: "↘ Eau NOK / Nutrition OK" },
        { x0: 60, x1: 90, y0: 25, y1: 50, color: "rgba(255,107,53,.07)", label: "↖ Eau OK / Nutrition NOK" },
      ],
      regression: regression(D.COUNTRIES.map(function (c) { return [c.water, c.stunting]; }), 0.61),
    });

    /* --- 13 : timeline --- */
    charts.g13 = CH.timeline($("#wsvChart13"), {
      milestones: D.TIMELINE.milestones, interventions: D.TIMELINE.interventions, maxDay: 1000,
    });

    /* --- 14 : jauges --- */
    charts.g14 = CH.gauges($("#wsvChart14"), {
      gauges: D.GAUGES, objective: D.GAUGE_OBJECTIVE,
    });
  }

  function rankCfg() {
    var id = state.rank;
    var ind = D.RANK_INDICATORS[id];
    var maxVal = D.RANK_ROWS[id].reduce(function (m, r) { return Math.max(m, r.value); }, 0);
    return {
      rows: D.RANK_ROWS[id],
      max: Math.ceil((maxVal * 1.18) / 5) * 5,
      unit: "%",
      title: ind.label,
      total: D.COUNTRIES.length,
      threshold: { value: ind.threshold, label: ind.thresholdLabel },
    };
  }

  function radarCfg() {
    var sel = state.radar;
    var colors = [C.blue, C.emerald, C.orange];
    var series = sel.map(function (code, i) {
      var c = D.BY_CODE[code];
      return { name: c.name, color: colors[i], values: c.radar };
    });
    var avg = D.RADAR_AXES.map(function (_, i) {
      return D.COUNTRIES.reduce(function (s, c) { return s + c.radar[i]; }, 0) / D.COUNTRIES.length;
    });
    var mean = avg.reduce(function (a, b) { return a + b; }, 0) / avg.length;
    return {
      axes: D.RADAR_AXES,
      series: series,
      benchmark: D.RADAR_BENCHMARK,
      center: { label: "Score moyen régional", value: nf(mean, 0) + "/100" },
    };
  }

  function bubbleCfg() {
    var pts = D.COUNTRIES.map(function (c) {
      return {
        name: c.name, flag: c.flag, x: c.gdp, y: c.stunting, pop: c.pop,
        popLabel: nf(c.pop, 1).replace(".", ",") + " M",
        color: D.BUBBLE_COLORS[c.subregion], subregion: c.subregion,
        r: 6 + Math.sqrt(c.pop) * 3.4,
      };
    });
    return {
      points: pts,
      xDomain: [400, 2400], yDomain: [8, 50],
      xLabel: "PIB par habitant (USD)",
      yLabel: "Prévalence stunting",
      regression: regression(D.COUNTRIES.map(function (c) { return [c.gdp, c.stunting]; }), 0.58),
      quadrants: [
        { x0: 400, x1: 1200, y0: 30, y1: 50, color: "rgba(239,68,68,.07)", label: "Pays les plus vulnérables" },
        { x0: 1200, x1: 2400, y0: 8, y1: 30, color: "rgba(16,185,129,.06)", label: "Pays les plus résilients" },
      ],
    };
  }

  function regression(pts, fixedR2) {
    var n = pts.length;
    var sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxy += p[0] * p[1]; sxx += p[0] * p[0]; syy += p[1] * p[1]; });
    var a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    var b = (sy - a * sx) / n;
    var num = n * sxy - sx * sy;
    var den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
    var r2 = den ? (num / den) * (num / den) : 0;
    return { a: a, b: b, r2: fixedR2 !== undefined ? fixedR2 : nf(r2, 2).replace(".", ",") };
  }

  /* ============================================================ ÉVÉNEMENTS */
  function wire() {
    /* sidebar */
    $$("#wsvNav button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#wsvNav button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        var t = document.getElementById(b.getAttribute("data-target"));
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    var oc = $("#wsvOpenCockpit");
    if (oc) oc.addEventListener("click", function () {
      if (typeof window.openInvestment === "function") window.openInvestment("who");
      else toast("Cockpit investissement OMS — Projects, Surveys & Nutrition Surveillance");
    });

    /* période */
    $("#wsvPeriod").addEventListener("change", function (e) {
      state.year = parseInt(e.target.value, 10);
      $("#wsvCrumbYear").textContent = state.year;
      applyYear();
    });

    /* export PDF */
    $("#wsvExport").addEventListener("click", function () {
      toast("Préparation de l'export PDF — utilisez « Enregistrer au format PDF »");
      setTimeout(function () { window.print(); }, 350);
    });

    /* export CSV */
    $("#wsvCsv").addEventListener("click", function () {
      var rows = tableRows();
      var head = ["Pays", "Stunting %", "Wasting %", "Anemie %", "VitA %", "Score", "Statut"];
      var body = rows.map(function (c) {
        return [c.name, c.stunting, c.wasting, c.anemia, c.vitA, c.score, D.statusOf(c.score).label];
      });
      var csv = [head].concat(body).map(function (r) { return r.join(";"); }).join("\n");
      var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "who-nutrition-scorecard-" + state.year + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast("Scorecard exportée en CSV (" + rows.length + " pays)");
    });

    /* filtre pays (chips + select) */
    $$(".wsv-filters [data-country]").forEach(function (b) {
      b.addEventListener("click", function () { setCountry(b.getAttribute("data-country")); });
    });
    $("#wsvMoreCountries").addEventListener("change", function (e) {
      var name = e.target.value.replace(/^[^\p{L}]+/u, "").trim();
      var found = D.COUNTRIES.filter(function (c) { return c.name === name; })[0];
      if (found) setCountry(found.code);
    });

    /* chips séries graphique 1 */
    $$("#g1 [data-series]").forEach(function (b) {
      b.addEventListener("click", function () {
        var code = b.getAttribute("data-series");
        var on = !state.hidden1[code];
        state.hidden1[code] = on;
        b.classList.toggle("on", !on);
        b.style.opacity = on ? 0.45 : 1;
        applySeries();
      });
    });

    /* sélecteur graphique 2 */
    $("#wsvRankSel").addEventListener("change", function (e) {
      state.rank = e.target.value;
      charts.g2.update(rankCfg());
    });

    /* selects radar */
    var radarSel = $$(".wsv-radar");
    radarSel.forEach(function (sel) {
      sel.innerHTML = D.COUNTRIES.map(function (c) { return "<option>" + c.name + "</option>"; }).join("");
      sel.addEventListener("change", function () {
        state.radar[parseInt(sel.getAttribute("data-slot"), 10)] =
          D.COUNTRIES.filter(function (c) { return c.name === sel.value; })[0].code;
        charts.g3.update(radarCfg());
        renderRadarLegend();
      });
    });
    radarSel.forEach(function (sel, i) {
      sel.value = D.BY_CODE[state.radar[i]].name;
    });

    /* tri heatmap : clic sur l'en-tête de colonne du canvas */
    var hc = $("#wsvChart8");
    if (hc) {
      hc.addEventListener("click", function (ev) {
        var r = hc.getBoundingClientRect();
        var my = ev.clientY - r.top;
        if (my > 34) return;
        var L = 128, R = 8;
        var cw = (hc.clientWidth - L - R) / D.HEAT_INDICATORS.length;
        var j = Math.floor((ev.clientX - r.left - L) / cw);
        if (j < 0 || j >= D.HEAT_INDICATORS.length) return;
        state.heatSort = state.heatSort && state.heatSort.j === j ? { j: j, dir: -state.heatSort.dir } : { j: j, dir: -1 };
        charts.g8.update(heatCfg());
        $("#wsvHeatInfo").textContent = "Tri : " + D.HEAT_INDICATORS[j].label + (state.heatSort.dir === -1 ? " ▼" : " ▲");
      });
      hc.style.cursor = "pointer";
    }

    /* tri tableau */
    $$("#g15 thead th[data-key]").forEach(function (thEl) {
      thEl.addEventListener("click", function () {
        var k = thEl.getAttribute("data-key");
        if (state.sortKey === k) state.sortDir *= -1;
        else { state.sortKey = k; state.sortDir = k === "name" ? 1 : -1; }
        renderTable();
      });
    });

    /* recherche */
    $("#wsvSearch").addEventListener("input", function (e) {
      state.q = e.target.value.trim();
      renderTable();
    });

    /* rapports par pays */
    $("#wsvTableBody").addEventListener("click", function (e) {
      var b = e.target.closest("[data-report]");
      if (!b) return;
      var c = D.BY_CODE[b.getAttribute("data-report")];
      toast("Rapport " + c.name + " — stunting " + c.stunting + " %, wasting " + c.wasting + " %, score " + c.score + "/100");
    });

    /* reset bulles */
    var br = $("#wsvBubbleReset");
    if (br && charts.g6 && charts.g6.reset) br.addEventListener("click", function () { charts.g6.reset(); });

    /* LIVE */
    tickLive();
    setInterval(tickLive, 30000);
  }

  function tickLive() {
    var el = $("#wsvLive");
    if (!el) return;
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    el.textContent = "Mis à jour " + hh;
  }

  function renderRadarLegend() {
    var colors = [C.blue, C.emerald, C.orange];
    $("#wsvRadarLegend").innerHTML = state.radar.map(function (code, i) {
      return '<span><i style="background:' + colors[i] + '"></i>' + D.BY_CODE[code].name + "</span>";
    }).join("") + '<span><i style="background:#EF4444"></i>Cibles OMS</span>';
  }

  function setCountry(code) {
    if (state.country === code && code !== "ALL") code = "ALL"; /* re-clic = on désélectionne */
    state.country = code;
    $$(".wsv-filters [data-country]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-country") === code);
    });
    var c = code === "ALL" ? null : D.BY_CODE[code];
    var more = $("#wsvMoreCountries");
    if (more && code === "ALL") more.selectedIndex = 0;
    $("#wsvScope").textContent = c
      ? c.name + " · données " + state.year + " · " + c.subregion
      : "Afrique de l'Ouest · 16 pays · Données " + state.year;
    $("#wsvActiveFilter").textContent = c ? "Filtre : " + c.name : "Vue régionale";
    renderKpis();
    applySeries();
    renderTable();
    if (state.ready && charts.g8) charts.g8.update(heatCfg());
  }

  function applySeries() {
    if (!state.ready || !charts.g1) return;
    var yr = D.YEARS.indexOf(state.year);
    charts.g1.update({
      labels: D.YEARS.slice(0, yr + 1),
      series: CHIP_COUNTRIES.map(function (code) {
        var c = D.BY_CODE[code];
        return {
          name: c.name, color: SERIES_COLORS[code],
          data: c.series.slice(0, yr + 1),
          visible: state.hidden1[code] !== true && (state.country === "ALL" || state.country === code),
        };
      }),
      yMax: 55, yMin: 0,
      threshold: { value: 20, label: "Seuil urgence OMS 20 %" },
      zone: { x0: 2020, x1: 2021, label: "Impact COVID" },
    });
  }

  function applyYear() {
    renderKpis();
    applySeries();
    renderTable();
  }

  /* ============================================================== BOOT */
  function isVisible() { return root.classList.contains("on"); }

  function init() {
    if (state.ready) return;
    root.innerHTML = MARKUP;
    renderRadarLegend();
    renderKpis();
    renderTable();
    wire();
    buildCharts();
    state.ready = true;
    /* second passage : les polices peuvent décaler la largeur des canvas */
    setTimeout(function () { CH.repaintAll(); }, 350);
    setTimeout(function () { CH.repaintAll(); }, 1200);
  }

  /* Démarrage paresseux : le module ne se construit qu'au premier affichage de
     la vue #who (un canvas a besoin d'une largeur réelle pour se dessiner).
     Double déclencheur — MutationObserver + surveillance légère — pour rester
     robuste quel que soit l'environnement.                                */
  function boot() {
    if (state.ready) return;
    if (isVisible()) { setTimeout(init, 60); return; }

    var obs = null, poll = null, started = false;
    var start = function () {
      if (started || state.ready) return;
      started = true;
      if (obs) { try { obs.disconnect(); } catch (e) {} }
      if (poll) clearInterval(poll);
      setTimeout(init, 60);
    };

    if (typeof MutationObserver === "function") {
      obs = new MutationObserver(function () { if (isVisible()) start(); });
      obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    }
    /* filet de sécurité : 4 contrôles par seconde, coût négligeable */
    poll = setInterval(function () { if (isVisible()) start(); }, 250);
  }
  boot();
})();
