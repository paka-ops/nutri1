/* ============================================================================
   NUTRI.N°1 — UNICEF · CHILD NUTRITION ANALYTICS · AFRIQUE DE L'OUEST
   unicef-dashboard.js — composant injecté dans la section #unicef de index.html.

   Pourquoi ce fichier ? index.html fait déjà ~39 000 lignes / 2,9 Mo. Tout le
   tableau de bord UNICEF (barre latérale, 5 KPI, 15 graphiques, scorecard,
   rapport) vit ici et n'est relié à la page que par quatre balises :
     1 CSS + 3 JS  (voir assets/unicef/README.md)
   Zéro framework : Canvas uniquement (unicef-charts.js).
   ============================================================================ */
(function () {
  "use strict";

  var root = document.getElementById("unicef");
  var D = window.UNICEF_DATA;
  var CH = window.UNICEFCharts;
  if (!root || !D || !CH) return;
  if (root.getAttribute("data-unicef-analytics") === "1") return;
  root.setAttribute("data-unicef-analytics", "1");

  /* Les scripts historiques de la page ouvrent une simulation dès qu'un clic
     remonte hors de #unicef : on coupe cette remontée pour que les filtres,
     les tris et les graphiques du module restent utilisables. */
  ["click", "change", "input", "pointerdown", "mousedown", "contextmenu"].forEach(function (type) {
    root.addEventListener(type, function (e) {
      if (e.target && e.target.closest && e.target.closest("#unicef")) e.stopPropagation();
    });
  });

  var $ = function (s, p) { return (p || root).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || root).querySelectorAll(s)); };
  var nf = CH.nf;
  var fmt = CH.fmt;
  var esc = CH.esc;
  var C = D.COLORS;
  var K = D.KPI;
  var SPHERE = D.SPHERE;

  /* ------------------------------------------------------------------ état */
  var state = {
    scope: "tous",          /* tous | sahel | cotier */
    growthSex: "boys",
    growthMetric: "weight",
    bullet: "cure",
    heatSort: { col: null, dir: -1 },
    tableSort: { key: "admissions", dir: -1 },
    ready: false,
  };
  var charts = {};
  var tableCharts = [];

  /* ------------------------------------------------------------- icônes SVG */
  function S(p, extra) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + ">" + p + "</svg>";
  }
  var ICO = {
    alert: S('<path d="M12 3l9.5 17H2.5L12 3z"/><path d="M12 10v5M12 18h.01"/>'),
    breast: S('<path d="M12 3c1.8 2.2 3.4 4.1 3.4 6a3.4 3.4 0 1 1-6.8 0c0-1.9 1.6-3.8 3.4-6z"/><path d="M6 18.5c1.6-1.5 3.6-2.2 6-2.2s4.4.7 6 2.2"/>'),
    hospital: S('<path d="M4 21V9l8-6 8 6v12"/><path d="M12 10v6M9 13h6"/><path d="M2 21h20"/>'),
    pill: S('<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9v6"/>'),
    calendar: S('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    csv: S('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h4"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  };
  var LOGO =
    '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
    '<circle cx="16" cy="16" r="13.6" stroke="#7FD8FF" stroke-width="1.4"/>' +
    '<path d="M2.4 16h27.2M16 2.4c3.7 3.8 3.7 23.4 0 27.2M16 2.4c-3.7 3.8-3.7 23.4 0 27.2" stroke="#7FD8FF" stroke-width="1" opacity=".65"/>' +
    '<circle cx="16" cy="12.4" r="3.1" fill="#1CABE2"/>' +
    '<path d="M10.2 22.8c0-3.3 2.6-5.8 5.8-5.8s5.8 2.5 5.8 5.8z" fill="#1CABE2"/>' +
    '<path d="M12.6 25.4 16 28.6l3.4-3.2" stroke="#80BD41" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  /* ------------------------------------------- helpers pays / agrégations */
  function inScope(c) {
    if (!c) return false;
    if (state.scope === "tous") return true;
    return c.zone === state.scope;
  }
  function panelRows() { return D.SCORECARD.filter(inScope); }
  function scopeList(list) {
    return list.filter(function (r) { return inScope(D.BY_CODE[r.code] || r); });
  }
  /* Taux de guérison consolidé : moyenne des cohortes pondérée par les
     admissions du panel — 84,7 % sur le panel complet (10 pays). */
  function cureRate(rows) {
    var num = 0, den = 0;
    rows.forEach(function (c) {
      if (c && c.admissions) { num += c.admissions * c.cure; den += c.admissions; }
    });
    return den ? num / den : 0;
  }
  function admissionTotal(rows) {
    return rows.reduce(function (a, c) { return a + (c.admissions || 0); }, 0);
  }
  function statusOf(c) {
    var ok = 0;
    if (c.cure > SPHERE.cure) ok++;
    if (c.abandon < SPHERE.abandon) ok++;
    if (c.death < SPHERE.death) ok++;
    return ok === 3
      ? { label: "✓ Conforme", cls: "ok" }
      : ok === 2
        ? { label: "À renforcer", cls: "warn" }
        : { label: "Alerte", cls: "danger" };
  }

  /* ------------------------------------------------ fabriques de balisage */
  function card(o) {
    return (
      '<section class="un-card ' + o.cls + '" id="' + o.id + '" style="animation-delay:' + (o.delay || 0) + 'ms">' +
      '<div class="un-card-head"><div><h3>' + o.title + "</h3><p>" + o.sub + "</p></div>" +
      (o.tools ? '<div class="un-card-tools">' + o.tools + "</div>" : "") +
      "</div>" +
      (o.canvas
        ? '<div class="un-canvas ' + (o.canvasCls || "") + '"><canvas id="' + o.canvas + '"></canvas></div>'
        : (o.body || "")) +
      (o.legend ? '<div class="un-legend">' + o.legend + "</div>" : "") +
      (o.foot ? '<div class="un-card-foot">' + o.foot + "</div>" : "") +
      "</section>"
    );
  }
  function li(color, label, shape) {
    return "<span><i class='" + (shape || "") + "' style='background:" + color + "'></i>" + label + "</span>";
  }

  /* ============================== 5 CARTES KPI ========================== */
  function cmpBars() {
    /* Mini comparaison 5 pays du KPI « allaitement exclusif ». */
    return '<span class="un-cmp">' + ["NE", "ML", "BF", "SN", "GH"].map(function (code) {
      var c = D.BY_CODE[code];
      return '<span title="' + esc(c.name) + " · " + c.ebf + ' %"><b>' + code + "</b>" +
        "<i><u style=\"width:" + Math.round((c.ebf / K.ebf.target) * 100) + '%"></u></i><em>' + c.ebf + "</em></span>";
    }).join("") + "</span>";
  }

  function kpiCards() {
    var rows = panelRows();
    var cure = cureRate(rows);
    var admTotal = admissionTotal(rows);
    var series = K.admissions.series;
    var last = series[series.length - 1], prev = series[series.length - 2];
    var delta = ((last - prev) / prev) * 100;
    return (
      /* --- KPI 1 — ENFANTS MAS ------------------------------------------ */
      '<article class="un-kpi un-kpi-danger" id="unKpi1">' +
        '<div class="un-kpi-top"><span class="un-kpi-ico" style="color:' + C.danger + '">' + ICO.alert + "</span>" +
        '<div class="un-kpi-val" style="color:' + C.danger + '" id="unK1Val">' + nf(K.sam.total, 1) + " M</div></div>" +
        '<div class="un-kpi-lab">' + K.sam.label + "</div>" +
        '<div class="un-kpi-sub">' + K.sam.sub + "</div>" +
        '<span class="un-kpi-badge danger">URGENCE</span>' +
        '<div class="un-kpi-mini"><canvas id="unK1Mini"></canvas></div>' +
        '<div class="un-kpi-foot"><span>Prévalence MAS · 6 pays prioritaires</span>' +
        '<b style="color:' + C.danger + '">Niger 14,8 %</b></div>' +
      "</article>" +
      /* --- KPI 2 — ALLAITEMENT EXCLUSIF --------------------------------- */
      '<article class="un-kpi un-kpi-warn" id="unKpi2">' +
        '<div class="un-kpi-top"><span class="un-kpi-ico" style="color:' + C.orange + '">' + ICO.breast + "</span>" +
        '<div class="un-kpi-val" style="color:' + C.orange + '" id="unK2Val">' + fmt(K.ebf.regional, 0) + " %</div></div>" +
        '<div class="un-kpi-lab">Allaitement exclusif 0-6 mois</div>' +
        '<div class="un-kpi-sub">Objectif OMS : ' + K.ebf.target + " %</div>" +
        '<span class="un-kpi-badge warn">Gap −' + (K.ebf.target - K.ebf.regional) + " points de l'objectif</span>" +
        '<div class="un-kpi-mini"><canvas id="unK2Mini"></canvas></div>' +
        '<div class="un-kpi-foot" style="padding-top:5px"><span style="flex:1 1 100%">Comparaison 5 pays (%)</span>' +
        cmpBars() + "</div>" +
      "</article>" +
      /* --- KPI 3 — TAUX DE GUÉRISON CRENAS ------------------------------ */
      '<article class="un-kpi un-kpi-ok" id="unKpi3">' +
        '<div class="un-kpi-top"><span class="un-kpi-ico" style="color:' + C.green + '">' + ICO.hospital + "</span>" +
        '<div class="un-kpi-val" style="color:' + C.green + '" id="unK3Val">' + fmt(cure, 1) + " %</div></div>" +
        '<div class="un-kpi-lab">Taux de guérison CRENAS</div>' +
        '<div class="un-kpi-sub">Seuil Sphère : ' + SPHERE.cure + " %</div>" +
        '<span class="un-kpi-badge ok">✓ Conforme Sphère</span>' +
        '<div class="un-kpi-mini"><canvas id="unK3Mini"></canvas></div>' +
        '<div class="un-kpi-foot"><span id="unK3Foot">Panel CRENAS · ' + rows.length + " pays</span>" +
        '<b class="up" id="unK3Delta">+' + fmt(cure - SPHERE.cure, 1) + " pts</b></div>" +
      "</article>" +
      /* --- KPI 4 — COUVERTURE VITAMINE A -------------------------------- */
      '<article class="un-kpi un-kpi-info" id="unKpi4">' +
        '<div class="un-kpi-top"><span class="un-kpi-ico" style="color:' + C.cyan + '">' + ICO.pill + "</span>" +
        '<div class="un-kpi-val" style="color:' + C.cyan + '">' + fmt(K.vita.regional, 0) + " %</div></div>" +
        '<div class="un-kpi-lab">Couverture vitamine A</div>' +
        '<div class="un-kpi-sub">Objectif : ' + K.vita.target + " % · écart −" + (K.vita.target - K.vita.regional) + " pts</div>" +
        '<div class="un-kpi-progress" title="Progression vers l\'objectif de 80 %"><i id="unK4Bar" style="width:' + K.vita.regional + '%"></i></div>' +
        '<div class="un-kpi-mini" style="height:26px"><canvas id="unK4Mini" style="height:26px"></canvas></div>' +
        '<div class="un-kpi-foot"><span>Barre de progression cyan</span>' +
        '<b style="color:' + C.cyan + '">' + K.vita.over80.length + " pays &gt; 80 %</b></div>" +
      "</article>" +
      /* --- KPI 5 — ADMISSIONS CRENAS CE MOIS ---------------------------- */
      '<article class="un-kpi un-kpi-gold" id="unKpi5">' +
        '<div class="un-kpi-top"><span class="un-kpi-ico" style="color:' + C.gold + '">' + ICO.calendar + "</span>" +
        '<div class="un-kpi-val" style="color:' + C.cyan + '" id="unK5Val">' + nf(admTotal, 0) + "</div></div>" +
        '<div class="un-kpi-lab">Admissions CRENAS ce mois</div>' +
        '<div class="un-kpi-sub" id="unK5Sub">Panel CRENAS · ' + rows.length + " pays</div>" +
        '<span class="un-kpi-badge info">' + (delta >= 0 ? "+" : "−") + fmt(Math.abs(delta), 0) + " % vs mois passé</span>" +
        '<div class="un-kpi-mini"><canvas id="unK5Mini"></canvas></div>' +
        '<div class="un-kpi-foot"><span>12 derniers mois</span>' +
        '<b class="' + (delta >= 0 ? "up" : "down") + '">' + (delta >= 0 ? "+" : "−") + fmt(Math.abs(delta), 1) + " %</b></div>" +
      "</article>"
    );
  }

  /* ================================ 15 CARTES =========================== */
  var GROWTH_TOOLS =
    '<button type="button" class="un-tool on" data-sex="boys">Garçon</button>' +
    '<button type="button" class="un-tool" data-sex="girls">Fille</button>' +
    '<span style="width:1px;height:18px;background:' + C.line + '"></span>' +
    '<button type="button" class="un-tool on" data-metric="weight">Poids</button>' +
    '<button type="button" class="un-tool" data-metric="height">Taille</button>' +
    '<button type="button" class="un-tool" data-metric="pb">PB</button>';

  function chartCards() {
    return (
      /* 01 — COURBES DE CROISSANCE OMS ----------------------------------- */
      card({
        id: "unG1", cls: "un-c55", delay: 40, canvas: "unC1", canvasCls: "xtall", tools: GROWTH_TOOLS,
        title: "01 · Courbes de croissance OMS",
        sub: "Percentiles P3 → P97, 0-60 mois · référence OMS 2006 (garçons / filles)",
        legend: ["p3", "p15", "p50", "p85", "p97"].map(function (k) {
          return li(D.GROWTH.percentileColors[k], D.GROWTH.percentileLabels[k], "line");
        }).join("") + li("#082F49", "Enfant suivi", "line"),
        foot: "<span>Couloirs : <b style=\"color:#B3123A\">&lt; P3</b> · <b style=\"color:#9A3412\">P85-P97</b> · " +
              "<b style=\"color:#4D7C0F\">P15-P85</b> · <b style=\"color:#B3123A\">&gt; P97</b></span>" +
              '<span class="un-badge info">OMS 2006 · 14 âges repères</span>',
      }) +
      /* 02 — TUNNEL MAS --------------------------------------------------- */
      card({
        id: "unG2", cls: "un-c45", delay: 80, canvas: "unC2", canvasCls: "xtall",
        title: "02 · Tunnel MAS — prise en charge",
        sub: "De l'enfant dépisté à l'enfant guéri · 6 étapes et pertes inter-étapes",
        foot: '<span class="un-badge danger">Gap critique : 78 % non traités</span>' +
              "<span>Dépistage communautaire — maillon décisif</span>",
      }) +
      /* 03 — RADAR ANJE --------------------------------------------------- */
      card({
        id: "unG3", cls: "un-c33", delay: 120, canvas: "unC3", canvasCls: "tall",
        title: "03 · Radar ANJE — 8 indicateurs",
        sub: "4 pays comparés au benchmark OMS (rouge pointillé)",
        legend: li(C.cyan, "Niger", "dot") + li(C.green, "Burkina", "dot") +
                li(C.orange, "Sénégal", "dot") + li(C.gold, "Ghana", "dot") + li(C.danger, "Benchmark OMS", "line"),
        foot: "<span>Axe « biberon » inversé : une valeur basse est favorable</span>",
      }) +
      /* 04 — BULLET CHART CRENAS ------------------------------------------ */
      card({
        id: "unG4", cls: "un-c33", delay: 160, canvas: "unC4", canvasCls: "tall",
        title: "04 · Bullet chart CRENAS par pays",
        sub: "10 pays · seuil Sphère (trait noir) · point blanc = valeur 2023",
        tools: '<button type="button" class="un-tool on" data-bullet="cure">Guérison %</button>' +
               '<button type="button" class="un-tool" data-bullet="abandon">Abandon %</button>' +
               '<button type="button" class="un-tool" data-bullet="death">Décès %</button>',
        foot: '<span id="unC4Scale">Échelle 0-100 %</span>' +
              '<span class="un-badge ok">Sphère : &gt; 75 % / &lt; 15 % / &lt; 10 %</span>',
      }) +
      /* 05 — AIRES DE SUPPLÉMENTATION ------------------------------------- */
      card({
        id: "unG5", cls: "un-c33b", delay: 200, canvas: "unC5", canvasCls: "tall",
        title: "05 · Supplémentation — 8 campagnes",
        sub: "Couverture des enfants par campagne, 2017 → 2024 · objectif 80 %",
        legend: D.SUPPLEMENTATION.series.map(function (s) { return li(s.color, s.name, "line"); }).join("") +
                li(C.danger, "Objectif 80 %", "line"),
        foot: "<span>Aires translucides superposées (échelle 0-100 %)</span>",
      }) +
      /* 06 — HEATMAP PAYS × ANJE ------------------------------------------ */
      card({
        id: "unG6", cls: "un-c60", delay: 240, canvas: "unC6", canvasCls: "tall",
        title: "06 · Heatmap Pays × ANJE",
        sub: "Performance vs objectif OMS / UNICEF · cliquer une colonne pour trier les pays",
        legend: [["#DCFCE7", "&gt; 90 % de l'objectif"], ["#FEF9C3", "70-90 %"], ["#FED7AA", "50-70 %"], ["#FECACA", "&lt; 50 %"]]
          .map(function (b) { return li(b[0], b[1]); }).join("") +
          '<span><i style="background:linear-gradient(90deg,' + C.danger + "," + C.green + ')"></i>Score ANJE</span>',
        foot: "<span>Trier par colonne ANJE ou par score composite</span>" +
              '<span class="un-tool" id="unHeatReset">Réinitialiser le tri</span>',
      }) +
      /* 07 — NUAGE WASH × STUNTING ---------------------------------------- */
      card({
        id: "unG7", cls: "un-c40", delay: 280, canvas: "unC7", canvasCls: "tall",
        title: "07 · Scatter WASH × retard de croissance",
        sub: "15 pays · % de ménages avec eau potable × prévalence du stunting",
        legend: li(C.orange, "Sahel", "dot") + li(C.cyan, "Zone côtière", "dot") + li("#082F49", "Régression", "line"),
        foot: "<span>Quadrants : coupe WASH 65 % · coupe stunting 30 %</span>",
      }) +
      /* 08 — TIMELINE 1000 JOURS ------------------------------------------ */
      card({
        id: "unG8", cls: "un-cfull", delay: 320, canvas: "unC8", canvasCls: "xtall",
        title: "08 · Fenêtre des 1000 jours",
        sub: "Jalons, interventions et impact cumulé sur le retard de croissance (J0 → J1000)",
        legend: D.TIMELINE.interventions.map(function (iv) { return li(iv.color, iv.label, "dot"); }).join(""),
        foot: '<span class="un-badge info">−20 % de retard de croissance avec un paquet complet</span>' +
              "<span>ANJE + supplémentation + WASH + soins de santé primaires</span>",
      }) +
      /* 09 — BULLES MAS --------------------------------------------------- */
      card({
        id: "unG9", cls: "un-c50", delay: 360, canvas: "unC9", canvasCls: "tall",
        title: "09 · Bulles MAS — carte schématique",
        sub: "Taille = enfants MAS · couleur = prévalence (vert &lt; 5 % · orange 5-10 % · rouge &gt; 10 %)",
        foot: "<span>Disposition approximative des pays d'Afrique de l'Ouest</span>" +
              '<span class="un-badge warn">Niger &amp; Mauritanie &gt; 14 %</span>',
      }) +
      /* 10 — MULTI-LIGNES MAS --------------------------------------------- */
      card({
        id: "unG10", cls: "un-c50", delay: 400, canvas: "unC10", canvasCls: "tall",
        title: "10 · Évolution de la MAS · 2016 → 2024",
        sub: "5 pays · zones d'urgence OMS (&gt; 10 %) et d'alerte (5-10 %)",
        legend: D.MAS_EVOLUTION.series.map(function (s) { return li(s.color, s.name, "line"); }).join(""),
        foot: "<span>Survolez une année pour comparer les 5 pays</span>",
      }) +
      /* 11 — DONUT CAUSES ------------------------------------------------- */
      card({
        id: "unG11", cls: "un-c33", delay: 440, canvas: "unC11", canvasCls: "tall",
        title: "11 · Causes de la malnutrition",
        sub: "Double anneau : causes directes (extérieur) et sous-jacentes (intérieur)",
        legend: D.CAUSES.outer.map(function (s) { return li(s.color, s.name + " " + s.value + "%"); }).join("") +
                D.CAUSES.inner.map(function (s) { return li(s.color, s.name + " " + s.value + "%", "dot"); }).join(""),
        foot: "<span>Cadre conceptuel UNICEF des causes de la malnutrition</span>",
      }) +
      /* 12 — BARRES GROUPÉES ANJE ----------------------------------------- */
      card({
        id: "unG12", cls: "un-c33", delay: 480, canvas: "unC12", canvasCls: "tall",
        title: "12 · ANJE — 5 indicateurs, 5 pays",
        sub: "Trait rouge = objectif OMS de l'indicateur",
        legend: D.GROUPED_ANJE.countries.map(function (code, i) {
          return li([C.cyan, C.orange, C.green, C.gold, C.violet][i], D.BY_CODE[code].name);
        }).join(""),
        foot: "<span>Barres groupées horizontales · valeurs en % des enfants</span>",
      }) +
      /* 13 — ROSE POLAIRE SAISONNALITÉ ------------------------------------ */
      card({
        id: "unG13", cls: "un-c33b", delay: 520, canvas: "unC13", canvasCls: "tall",
        title: "13 · Saisonnalité des admissions",
        sub: "12 secteurs mensuels · base 100 = moyenne annuelle des admissions",
        legend: D.SEASONALITY.years.map(function (y) { return li(y.color, y.year, "line"); }).join(""),
        foot: '<span class="un-badge danger">Zone de soudure : juin → septembre</span>',
      }) +
      /* 14 — LOLLIPOP VITAMINE A ------------------------------------------ */
      card({
        id: "unG14", cls: "un-c50", delay: 560, canvas: "unC14", canvasCls: "xtall",
        title: "14 · Lollipop couverture vitamine A",
        sub: "14 pays · 2022 (repère blanc) → 2024 (tête colorée) · objectif 80 %",
        legend: li("#94A3B8", "2022", "dot") + li(C.cyan, "2024 — sous l'objectif", "dot") +
                li(C.green, "2024 — objectif atteint", "dot"),
        foot: '<span id="unC14Foot">Panel continental · 14 pays</span>' +
              '<span class="un-badge info">' + K.vita.over80.length + " pays ≥ 80 % (panel WCARO)</span>",
      }) +
      /* 15 — SCORECARD CRENAS (tableau HTML + sparklines Canvas) ---------- */
      '<section class="un-card un-c50" id="unG15" style="animation-delay:600ms">' +
        '<div class="un-card-head"><div><h3>15 · Scorecard CRENAS complet</h3>' +
        "<p>10 pays · cohortes, stocks ATPE, tendance et statut · seuils Sphère mis en évidence</p></div>" +
        '<div class="un-card-tools"><span class="un-tool" id="unCsv">' + ICO.csv + " Exporter CSV</span></div></div>" +
        '<div class="un-table-wrap" id="unTableWrap"></div>' +
        '<div class="un-card-foot"><span>Trier une colonne en cliquant son en-tête</span>' +
        "<span>Sphère : guérison &gt; 75 % · abandon &lt; 15 % · décès &lt; 10 %</span></div>" +
      "</section>"
    );
  }

  /* ============================================================== MARKUP */
  var MARKUP =
    '<div class="un-shell">' +
      /* ------------------------------------------------------- sidebar -- */
      '<aside class="un-side">' +
        '<div class="un-brand"><span class="un-logo">' + LOGO + "</span>" +
        "<span><b>UNICEF NutriChild</b><span>Child Nutrition</span></span></div>" +
        '<nav class="un-nav" id="unNav" aria-label="Navigation UNICEF">' +
          D.NAV.map(function (n, i) {
            return '<button type="button"' + (i === 0 ? ' class="on"' : "") + ' data-nav="' + n.id + '" data-target="' + n.targets[0] + '">' +
              "<em>" + n.icon + "</em><span>" + n.label + "<small>" + n.note + "</small></span></button>";
          }).join("") +
        "</nav>" +
        '<div class="un-side-foot">' +
          '<button type="button" class="un-side-btn" id="unOpenCockpit">Cockpit investissement UNICEF</button>' +
          "<p class=\"un-side-note\">Données illustratives, alignées sur les cadres UNICEF / OMS (SMART, ANJE, " +
          "CRENAS-CRENAM, Sphère, 1000 jours) · " + D.COUNTRIES.length + " pays d'Afrique de l'Ouest · " +
          "aucun appel réseau. Ne remplace pas les chiffres officiels de l'UNICEF.</p>" +
        "</div>" +
      "</aside>" +
      /* ---------------------------------------------------------- corps -- */
      '<div class="un-body">' +
        '<header class="un-top" id="unKpisTop">' +
          '<div class="un-top-row">' +
            "<div>" +
              '<div class="un-crumb">UNICEF <span>/</span> Child Nutrition Analytics <span>/</span> <b>Afrique de l\'Ouest</b></div>' +
              '<h2>Child Nutrition Analytics · <em>Afrique de l\'Ouest</em></h2>' +
              '<p class="un-sub" id="unScope">15 pays · panel régional complet · données 2024</p>' +
            "</div>" +
            '<div class="un-top-actions">' +
              '<span class="un-alert" id="unAlert"><i></i><span id="unAlertTxt">URGENCE · ' + nf(K.sam.total, 1) + " M enfants MAS</span></span>" +
              '<select class="un-select" id="unScopeSel" aria-label="Portée géographique">' +
                '<option value="tous">Afrique de l\'Ouest · 15 pays</option>' +
                '<option value="sahel">Sahel · 6 pays</option>' +
                '<option value="cotier">Zone côtière · 9 pays</option>' +
              "</select>" +
              '<button type="button" class="un-btn" id="unPrint">Imprimer</button>' +
              '<button type="button" class="un-btn primary" id="unReportBtn">Rapport régional</button>' +
            "</div>" +
          "</div>" +
        "</header>" +
        '<div class="un-kpis" id="unKpis">' + kpiCards() + "</div>" +
        '<div class="un-grid" id="unGrid">' + chartCards() + "</div>" +
      "</div>" +
    "</div>" +
    /* -------------------------------------------------- modale rapport -- */
    '<div class="un-modal" id="unReport" hidden>' +
      '<div class="un-modal-win">' +
        '<div class="un-modal-head"><div><h3>Rapport régional · Child Nutrition Analytics</h3>' +
        "<p id=\"unReportSub\">Synthèse UNICEF Afrique de l'Ouest · données 2024</p></div>" +
        '<div class="un-card-tools"><button type="button" class="un-btn" id="unReportPrint">Imprimer / PDF</button>' +
        '<button type="button" class="un-btn" id="unReportClose">Fermer</button></div></div>' +
        '<div class="un-modal-body" id="unReportBody"></div>' +
      "</div>" +
    "</div>";

  /* =================================================== CONFIGS GRAPHIQUES */
  /* 12 pays de la heatmap ANJE (graphique 6) */
  var HEAT_CODES = ["NE", "ML", "BF", "SN", "NG", "GH", "GN", "MR", "SL", "CI", "LR", "GM"];
  /* 5 pays des barres groupées ANJE (graphique 12) */
  var GROUP_COLORS = [C.cyan, C.orange, C.green, C.gold, C.violet];

  function growthCfg() {
    return { sex: state.growthSex, metric: state.growthMetric };
  }
  function radarCfg() {
    var set = [["NE", C.cyan], ["BF", C.green], ["SN", C.orange], ["GH", C.gold]];
    return {
      axes: D.ANJE,
      benchmark: D.ANJE_BENCHMARK,
      series: set.map(function (s) {
        var c = D.BY_CODE[s[0]];
        return { code: c.code, name: c.name, color: s[1], values: c.anje };
      }),
    };
  }
  function bulletCfg() {
    var ind = D.BULLET_METRICS[0];
    D.BULLET_METRICS.forEach(function (m) { if (m.id === state.bullet) ind = m; });
    var rows = panelRows().map(function (c) {
      var v = c[ind.id];
      return {
        name: c.flag + " " + c.short,
        value: v,
        prev: ind.id === "cure" ? c.curePrev : null,
        ok: ind.better === "high" ? v > ind.target : v < ind.target,
      };
    });
    return {
      rows: rows,
      ind: {
        label: ind.label, target: ind.target, unit: ind.unit, decimals: ind.decimals,
        better: ind.better, prevKey: ind.id === "cure",
        min: 0, max: ind.id === "cure" ? 100 : ind.id === "abandon" ? 25 : 15,
      },
    };
  }
  function heatRows() {
    var rows = scopeList(HEAT_CODES.map(function (code) {
      var c = D.BY_CODE[code];
      return { code: code, name: c.name, short: c.short, flag: c.flag, values: c.anje, score: c.score };
    }));
    var s = state.heatSort;
    if (s.col === "score") {
      rows.sort(function (a, b) { return (a.score - b.score) * s.dir; });
    } else if (s.col != null) {
      var ind = D.ANJE[s.col];
      rows.sort(function (a, b) {
        return (CH.attain(a.values[s.col], ind) - CH.attain(b.values[s.col], ind)) * s.dir;
      });
    }
    return rows;
  }
  function heatCfg() { return { rows: heatRows(), cols: D.ANJE, sort: state.heatSort }; }
  function scatterCfg() {
    return {
      xCut: 65, yCut: 30,
      points: D.COUNTRIES.map(function (c) {
        return {
          name: c.short, water: c.water, stunting: c.stunting, zone: c.zone,
          pop: Math.min(4, Math.sqrt(c.u5) / 2),
        };
      }),
    };
  }
  function multiLineCfg() {
    return {
      years: D.MAS_EVOLUTION.years, series: D.MAS_EVOLUTION.series,
      urgency: D.MAS_EVOLUTION.urgency, alert: D.MAS_EVOLUTION.alert,
    };
  }
  function donutCfg() { return { inner: D.CAUSES.inner, outer: D.CAUSES.outer, center: D.CAUSES.center }; }
  function groupedCfg() {
    return {
      rows: D.GROUPED_ANJE.rows,
      countries: D.GROUPED_ANJE.countries.map(function (code, i) {
        var c = D.BY_CODE[code];
        return { code: code, name: c.name, short: c.short, color: GROUP_COLORS[i] };
      }),
    };
  }
  function polarCfg() {
    return { months: D.SEASONALITY.months, years: D.SEASONALITY.years, soudure: D.SEASONALITY.soudure };
  }
  function lollipopCfg() {
    return { rows: scopeList(D.LOLLIPOP), objective: D.LOLLIPOP_OBJECTIVE };
  }

  /* ==================================================== SÉRIE DES GRAPHES */
  function buildCharts() {
    charts.c1 = CH.growth($("#unC1"), growthCfg());
    charts.c2 = CH.funnel($("#unC2"), { steps: D.FUNNEL });
    charts.c3 = CH.radar($("#unC3"), radarCfg());
    charts.c4 = CH.bullets($("#unC4"), bulletCfg());
    charts.c5 = CH.stackedArea($("#unC5"), {
      years: D.SUPPLEMENTATION.years, series: D.SUPPLEMENTATION.series, objective: D.SUPPLEMENTATION.objective,
    });
    charts.c6 = CH.heatmap($("#unC6"), heatCfg());
    charts.c7 = CH.scatter($("#unC7"), scatterCfg());
    charts.c8 = CH.timeline($("#unC8"), { data: D.TIMELINE });
    charts.c9 = CH.bubbles($("#unC9"), { points: D.BUBBLES });
    charts.c10 = CH.multiLine($("#unC10"), multiLineCfg());
    charts.c11 = CH.donut($("#unC11"), donutCfg());
    charts.c12 = CH.groupedBar($("#unC12"), groupedCfg());
    charts.c13 = CH.polar($("#unC13"), polarCfg());
    charts.c14 = CH.lollipop($("#unC14"), lollipopCfg());

    /* minis des 5 cartes KPI */
    charts.k1 = CH.miniBars($("#unK1Mini"), { rows: K.samBars });
    charts.k2 = CH.miniGauge($("#unK2Mini"), { value: K.ebf.regional, target: K.ebf.target, max: 100 });
    charts.k3 = CH.sparkline($("#unK3Mini"), {
      data: K.cure.spark, color: C.green, unit: " %", title: "Taux de guérison CRENAS",
      labels: D.MONTHS_SHORT, hits: true,
    });
    charts.k4 = CH.miniBars($("#unK4Mini"), {
      rows: K.vita.over80.map(function (p) { return { name: p.name, flag: "", value: p.value }; }),
      color: C.cyan,
    });
    charts.k5 = CH.miniBars($("#unK5Mini"), {
      rows: K.admissions.months.map(function (m, i) {
        return { name: m, flag: "", value: K.admissions.series[i] };
      }),
      color: C.cyan,
    });
  }

  /* ======================================================= SCORECARD HTML */
  var TABLE_COLS = [
    { key: "name", label: "Pays", cls: "", text: function (c) { return c.flag + " " + c.name; },
      num: function (c) { return c.name; } },
    { key: "admissions", label: "Admissions", cls: "num", text: function (c) { return nf(c.admissions, 0); },
      num: function (c) { return c.admissions || 0; } },
    { key: "cure", label: "Guérison %", cls: "num", text: function (c) { return fmt(c.cure, 1) + " %"; },
      num: function (c) { return c.cure; }, judge: function (c) { return c.cure > SPHERE.cure; } },
    { key: "abandon", label: "Abandon %", cls: "num", text: function (c) { return fmt(c.abandon, 1) + " %"; },
      num: function (c) { return c.abandon; }, judge: function (c) { return c.abandon < SPHERE.abandon; } },
    { key: "death", label: "Décès %", cls: "num", text: function (c) { return fmt(c.death, 1) + " %"; },
      num: function (c) { return c.death; }, judge: function (c) { return c.death < SPHERE.death; } },
    { key: "stock", label: "Stock ATPE", cls: "mid", canvas: "stock", num: function (c) { return c.stock; } },
    { key: "trend", label: "Tendance", cls: "mid", canvas: "trend", num: function (c) { return c.cure - c.trend[0]; } },
    { key: "status", label: "Statut", cls: "mid", text: function (c) { return statusOf(c).label; },
      badge: true, num: function (c) { var s = statusOf(c); return s.cls === "ok" ? 3 : s.cls === "warn" ? 2 : 1; } },
  ];

  function renderTable() {
    tableCharts.forEach(function (ch) { if (ch && ch.destroy) ch.destroy(); });
    tableCharts = [];
    var wrap = $("#unTableWrap");
    if (!wrap) return;
    var rows = panelRows().slice();
    var s = state.tableSort;
    rows.sort(function (a, b) {
      var col = null;
      TABLE_COLS.forEach(function (x) { if (x.key === s.key) col = x; });
      if (!col) return 0;
      var va = col.num(a), vb = col.num(b);
      if (typeof va === "string") return va.localeCompare(vb) * s.dir;
      return (va - vb) * s.dir;
    });

    var head = TABLE_COLS.map(function (col) {
      var arrow = s.key === col.key ? '<span class="arrow">' + (s.dir > 0 ? "▲" : "▼") + "</span>" : "";
      return '<th class="' + col.cls + '" data-key="' + col.key + '" tabindex="0">' + col.label + " " + arrow + "</th>";
    }).join("");

    var body = rows.map(function (c, ri) {
      var cells = TABLE_COLS.map(function (col) {
        if (col.canvas === "trend") {
          return '<td class="' + col.cls + '"><canvas class="cell-canvas" id="unTrend' + ri + '"></canvas></td>';
        }
        if (col.canvas === "stock") {
          return '<td class="' + col.cls + '"><canvas class="cell-canvas stock" id="unStock' + ri + '"></canvas></td>';
        }
        if (col.badge) {
          var st = statusOf(c);
          return '<td class="' + col.cls + '"><span class="un-badge ' + st.cls + '">' + st.label + "</span></td>";
        }
        var cls = col.cls;
        if (col.judge) cls += col.judge(c) ? " ok" : " bad";
        return '<td class="' + cls + '">' + col.text(c) + "</td>";
      }).join("");
      return "<tr>" + cells + "</tr>";
    }).join("");

    wrap.innerHTML = "<table class=\"un-table\"><caption>" + rows.length + " pays du panel CRENAS · " +
      "admissions du mois : " + nf(admissionTotal(rows), 0) + " · cohortes 2024</caption>" +
      "<thead><tr>" + head + "</tr></thead><tbody>" + body + "</tbody></table>";

    /* sparkline de tendance + mini-bullet de stock, un canvas par ligne */
    rows.forEach(function (c, ri) {
      var tc = document.getElementById("unTrend" + ri);
      if (tc) {
        tableCharts.push(CH.sparkline(tc, {
          data: c.trend, color: c.trend[8] >= c.trend[0] ? C.green : C.danger, unit: " %",
          title: "Guérison " + c.name,
          labels: ["2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
          hits: true,
        }));
      }
      var sc = document.getElementById("unStock" + ri);
      if (sc) {
        tableCharts.push(CH.miniBullet(sc, {
          value: c.stock, target: SPHERE.stock, prev: c.stockPrev, name: c.name,
        }));
      }
    });
  }

  /* ================================================== PORTÉE GÉOGRAPHIQUE */
  var SCOPE_LABEL = {
    tous: "15 pays · panel régional complet · données 2024",
    sahel: "Sahel · 6 pays · données 2024",
    cotier: "Zone côtière · 9 pays · données 2024",
  };
  function refreshScope() {
    var rows = panelRows();
    var cure = cureRate(rows);
    $("#unScope").textContent = SCOPE_LABEL[state.scope] || SCOPE_LABEL.tous;
    $("#unAlertTxt").textContent = state.scope === "tous"
      ? "URGENCE · " + nf(K.sam.total, 1) + " M enfants MAS"
      : "URGENCE · " + rows.length + " pays suivis";
    $("#unK3Val").textContent = fmt(cure, 1) + " %";
    $("#unK3Delta").textContent = "+" + fmt(cure - SPHERE.cure, 1) + " pts";
    $("#unK3Foot").textContent = "Panel CRENAS · " + rows.length + " pays";
    $("#unK5Val").textContent = nf(admissionTotal(rows), 0);
    $("#unK5Sub").textContent = "Panel CRENAS · " + rows.length + " pays";
    var foot = $("#unC14Foot");
    if (foot) {
      foot.textContent = "Panel " + (state.scope === "tous" ? "continental · " : state.scope === "sahel" ? "Sahel · " : "côtier · ") +
        scopeList(D.LOLLIPOP).length + " pays";
    }
    if (charts.c4) charts.c4.update(bulletCfg());
    if (charts.c6) charts.c6.update(heatCfg());
    if (charts.c14) charts.c14.update(lollipopCfg());
    renderTable();
  }

  /* ================================================== RAPPORT & EXPORT CSV */
  function toast(msg) {
    if (typeof window.toast === "function") window.toast(msg);
    else console.log("[UNICEF]", msg);
  }
  function reportHTML() {
    var rows = panelRows();
    var cure = cureRate(rows);
    var priorities = rows.slice().sort(function (a, b) { return b.mas - a.mas; }).slice(0, 5);
    var anjeGaps = D.ANJE.map(function (a, i) {
      var min = null;
      D.COUNTRIES.forEach(function (c) {
        if (!inScope(c)) return;
        if (min === null || c.anje[i] < min.value) min = { name: c.name, value: c.anje[i] };
      });
      return { ind: a, min: min };
    }).filter(function (x) { return x.min; });
    return (
      '<div class="un-report-grid">' +
        '<div class="un-report-block"><h4>Synthèse régionale</h4><div class="un-report-kpis">' +
          "<div><b>" + nf(K.sam.total, 1) + " M</b>enfants MAS (estimation consolidée)</div>" +
          "<div><b>" + fmt(K.ebf.regional, 0) + " %</b>allaitement exclusif · objectif " + K.ebf.target + " %</div>" +
          "<div><b>" + fmt(cure, 1) + " %</b>guérison CRENAS · seuil Sphère " + SPHERE.cure + " %</div>" +
          "<div><b>" + fmt(K.vita.regional, 0) + " %</b>couverture vitamine A · objectif " + K.vita.target + " %</div>" +
          "<div><b>" + nf(admissionTotal(rows), 0) + "</b>admissions CRENAS ce mois</div>" +
          "<div><b>" + K.vita.over80.length + "</b>pays ≥ 80 % de couverture vitamine A</div>" +
        "</div></div>" +
        "<div class=\"un-report-block\"><h4>Priorités immédiates</h4><ul>" +
          priorities.map(function (c) {
            return "<li><b>" + esc(c.name) + "</b> — MAS " + fmt(c.mas, 1) + " % · guérison " + fmt(c.cure, 0) +
              " % · stock ATPE " + c.stock + " %</li>";
          }).join("") +
        "</ul></div>" +
        "<div class=\"un-report-block\"><h4>Écarts ANJE les plus marqués</h4><ul>" +
          anjeGaps.slice(0, 6).map(function (x) {
            return "<li>" + esc(x.ind.label) + " — plancher <b>" + fmt(x.min.value, 0) + " %</b> (" + esc(x.min.name) +
              ") pour une cible de " + x.ind.target + " %</li>";
          }).join("") +
        "</ul></div>" +
        "<div class=\"un-report-block\"><h4>Lecture opérationnelle</h4><ul>" +
          "<li>Tunnel MAS : seulement 22 % des enfants atteignent la guérison — le dépistage communautaire reste le maillon limitant.</li>" +
          "<li>84,7 % de guérison dépassent le seuil Sphère, mais l'abandon reste critique au Nigeria et au Mali.</li>" +
          "<li>Vitamine A : " + K.vita.over80.length + " pays atteignent 80 % ; l'objectif régional reste à " + (K.vita.target - K.vita.regional) + " points.</li>" +
          "<li>WASH : les pays sous 65 % d'accès à l'eau cumulent les prévalences de retard de croissance les plus élevées.</li>" +
          "<li>Fenêtre des 1000 jours : la saisonnalité des admissions culmine en juin-septembre (zone de soudure).</li>" +
        "</ul></div>" +
      "</div>"
    );
  }
  function openReport() {
    $("#unReportSub").textContent = "Synthèse UNICEF Afrique de l'Ouest · " + (SCOPE_LABEL[state.scope] || "");
    $("#unReportBody").innerHTML = reportHTML();
    $("#unReport").hidden = false;
  }
  function exportCsv() {
    var cols = ["Pays", "Code", "Admissions", "Guérison %", "Abandon %", "Décès %", "Stock ATPE 2024 %",
      "Stock ATPE 2023 %", "MAS %", "Allaitement exclusif %", "Vitamine A %", "Score ANJE", "Statut"];
    var lines = [cols.join(";")];
    panelRows().forEach(function (c) {
      lines.push([
        c.name, c.code, c.admissions == null ? "" : c.admissions, fmt(c.cure, 1), fmt(c.abandon, 1), fmt(c.death, 1),
        c.stock, c.stockPrev, fmt(c.mas, 1), c.ebf, c.vitA, c.score, statusOf(c).label,
      ].join(";"));
    });
    var csv = "\uFEFF" + lines.join("\r\n");
    try {
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "unicef-scorecard-crenas-afrique-ouest.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast("Scorecard CRENAS exportée (CSV)");
    } catch (e) {
      toast("Export CSV indisponible dans ce navigateur");
    }
  }

  /* ======================================================= INTERACTIONS */
  function wire() {
    /* barre latérale : navigation par ancres */
    $$("#unNav button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$("#unNav button").forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        var target = document.getElementById(btn.getAttribute("data-target"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    var cockpit = $("#unOpenCockpit");
    if (cockpit) {
      cockpit.addEventListener("click", function () {
        if (typeof window.openInvestment === "function") window.openInvestment("unicef");
        else toast("Cockpit d'investissement UNICEF indisponible");
      });
    }

    /* portée géographique */
    $("#unScopeSel").addEventListener("change", function (e) {
      state.scope = e.target.value;
      refreshScope();
      CH.repaintAll();
    });

    /* graphique 1 : bascules sexe / métrique */
    $$("#unG1 .un-tool").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var sex = btn.getAttribute("data-sex");
        var metric = btn.getAttribute("data-metric");
        if (sex) {
          state.growthSex = sex;
          $$("#unG1 .un-tool[data-sex]").forEach(function (b) { b.classList.toggle("on", b === btn); });
        }
        if (metric) {
          state.growthMetric = metric;
          $$("#unG1 .un-tool[data-metric]").forEach(function (b) { b.classList.toggle("on", b === btn); });
        }
        if (charts.c1) charts.c1.update(growthCfg());
      });
    });

    /* graphique 4 : choix de la métrique */
    $$("#unG4 .un-tool").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.bullet = btn.getAttribute("data-bullet");
        $$("#unG4 .un-tool").forEach(function (b) { b.classList.toggle("on", b === btn); });
        var cfg = bulletCfg();
        var scale = $("#unC4Scale");
        if (scale) scale.textContent = "Échelle 0-" + cfg.ind.max + " % · seuil Sphère " + cfg.ind.target + " %";
        if (charts.c4) charts.c4.update(cfg);
      });
    });
    var scale0 = $("#unC4Scale");
    if (scale0) scale0.textContent = "Échelle 0-" + bulletCfg().ind.max + " % · seuil Sphère " + bulletCfg().ind.target + " %";

    /* graphique 6 : tri par colonne au clic sur l'en-tête */
    var heat = $("#unC6");
    if (heat) {
      heat.addEventListener("click", function (ev) {
        var hit = CH.pick(heat, ev);
        if (!hit || !/^h/.test(hit.key)) return;
        var col = hit.key === "hscore" ? "score" : parseInt(hit.key.slice(1), 10);
        var s = state.heatSort;
        if (s.col === col) s.dir = -s.dir;
        else { s.col = col; s.dir = -1; }
        if (charts.c6) charts.c6.update(heatCfg());
        toast("Tri par " + (col === "score" ? "score ANJE" : D.ANJE[col].short) + (s.dir < 0 ? " (décroissant)" : " (croissant)"));
      });
    }
    var reset = $("#unHeatReset");
    if (reset) {
      reset.addEventListener("click", function () {
        state.heatSort = { col: null, dir: -1 };
        if (charts.c6) charts.c6.update(heatCfg());
        toast("Tri de la heatmap réinitialisé");
      });
    }

    /* graphique 15 : tri du scorecard */
    var tw = $("#unTableWrap");
    if (tw) {
      tw.addEventListener("click", function (ev) {
        var th = ev.target.closest ? ev.target.closest("th[data-key]") : null;
        if (!th) return;
        var key = th.getAttribute("data-key");
        var s = state.tableSort;
        if (s.key === key) s.dir = -s.dir;
        else { s.key = key; s.dir = key === "name" ? 1 : -1; }
        renderTable();
      });
      tw.addEventListener("keydown", function (ev) {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        var th = ev.target.closest ? ev.target.closest("th[data-key]") : null;
        if (!th) return;
        ev.preventDefault();
        th.click();
      });
    }
    var csv = $("#unCsv");
    if (csv) csv.addEventListener("click", exportCsv);

    /* rapport régional */
    var report = $("#unReport");
    $("#unReportBtn").addEventListener("click", openReport);
    $("#unReportClose").addEventListener("click", function () { report.hidden = true; });
    $("#unReportPrint").addEventListener("click", function () { window.print(); });
    report.addEventListener("click", function (e) { if (e.target === report) report.hidden = true; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && report && !report.hidden) {
        report.hidden = true;
        e.stopPropagation();
      }
    });
    $("#unPrint").addEventListener("click", function () { window.print(); });
  }

  /* ============================================================== BOOT */
  function isVisible() { return root.classList.contains("on"); }

  function init() {
    if (state.ready) return;
    root.innerHTML = MARKUP;
    buildCharts();
    renderTable();
    wire();
    state.ready = true;
    root.setAttribute("data-unicef-init", "1");
    /* second passage : les polices peuvent décaler la largeur des canvas */
    setTimeout(function () { CH.repaintAll(); }, 300);
    setTimeout(function () { CH.repaintAll(); }, 1000);
    /* au retour dans la vue, les canvas sont redessinés (bitmap caduc après
       un passage en display:none) */
    if (typeof MutationObserver === "function") {
      new MutationObserver(function () {
        if (!root.classList.contains("on")) return;
        setTimeout(function () { CH.repaintAll(); }, 80);
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
    }
  }

  /* Démarrage paresseux : le tableau de bord n'est construit qu'au premier
     affichage de la vue #unicef (un canvas a besoin d'une largeur réelle).
     Double déclencheur — MutationObserver + surveillance légère. */
  function boot() {
    if (state.ready) return;
    if (isVisible()) { setTimeout(init, 60); return; }
    var started = false;
    var start = function () {
      if (started || state.ready) return;
      started = true;
      if (poll) clearInterval(poll);
      setTimeout(init, 60);
    };
    var poll = setInterval(function () { if (isVisible()) start(); }, 250);
    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(function () { if (isVisible()) start(); });
      obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    }
  }
  boot();

  /* ---------------------------------------------------------- API légère */
  window.UNICEFDash = {
    root: root,
    isReady: function () { return state.ready; },
    getState: function () {
      return {
        scope: state.scope, growthSex: state.growthSex, growthMetric: state.growthMetric,
        bullet: state.bullet, heatSort: state.heatSort, tableSort: state.tableSort,
      };
    },
    setScope: function (id) {
      var sel = root.querySelector("#unScopeSel");
      if (!sel) return;
      sel.value = id;
      sel.dispatchEvent(new Event("change"));
    },
    charts: charts,
  };
})();
