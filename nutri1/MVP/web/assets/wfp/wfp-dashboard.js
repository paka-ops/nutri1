/* ============================================================================
   NUTRI.N°1 — PAM · FOOD SECURITY ANALYTICS · AFRIQUE DE L'OUEST
   wfp-dashboard.js — composant injecté dans la section #wfp de index.html.

   La page index.html est déjà très volumineuse : le tableau de bord vit ici,
   et n'est relié à la page que par une feuille CSS et trois scripts.
   Zéro framework. Canvas uniquement (voir wfp-charts.js).
   ============================================================================ */
(function () {
  "use strict";

  var root = document.getElementById("wfp");
  var D = window.WFP_DATA;
  var CH = window.WFPCharts;
  if (!root || !D || !CH) return;
  if (root.getAttribute("data-wfp-analytics") === "1") return;
  root.setAttribute("data-wfp-analytics", "1");

  /* Les scripts historiques de la page ouvrent une simulation dès qu'un clic
     ou un changement remonte hors de #wfp. On coupe cette remontée pour que
     les filtres et les graphiques restent dans le module. */
  ["click", "change", "input", "pointerdown", "mousedown", "contextmenu"].forEach(function (type) {
    root.addEventListener(type, function (e) {
      if (e.target && e.target.closest && e.target.closest("#wfp")) e.stopPropagation();
    });
  });

  var $ = function (s, p) { return (p || root).querySelector(s); };
  var $$ = function (s, p) { return Array.prototype.slice.call((p || root).querySelectorAll(s)); };
  var nf = CH.nf;
  var esc = CH.esc;

  var state = {
    region: "tous",
    period: "mois",
    mapMode: "2024",
    hddsCountry: "NE",
    hddsScope: "pays",
    ready: false,
  };
  var charts = {};
  var hiddenCereal = {};

  var WHEAT =
    '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<path d="M16 30V13" stroke="#FBBF24" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<g fill="#F59E0B">' +
    '<ellipse cx="16" cy="7.2" rx="2.3" ry="3.5"/>' +
    '<ellipse cx="12.1" cy="10.4" rx="1.8" ry="2.9" transform="rotate(-32 12.1 10.4)"/>' +
    '<ellipse cx="19.9" cy="10.4" rx="1.8" ry="2.9" transform="rotate(32 19.9 10.4)"/>' +
    '<ellipse cx="11.3" cy="14.6" rx="1.7" ry="2.6" transform="rotate(-28 11.3 14.6)"/>' +
    '<ellipse cx="20.7" cy="14.6" rx="1.7" ry="2.6" transform="rotate(28 20.7 14.6)"/>' +
    '<ellipse cx="12" cy="18.4" rx="1.5" ry="2.3" transform="rotate(-22 12 18.4)"/>' +
    '<ellipse cx="20" cy="18.4" rx="1.5" ry="2.3" transform="rotate(22 20 18.4)"/>' +
    "</g>" +
    '<path d="M16 24c-5 1.2-7 4-7.4 5.2" stroke="#FBBF24" fill="none" stroke-width="1.2" stroke-linecap="round"/>' +
    '<path d="M16 22.5c5 1.2 7 4.2 7.4 5.4" stroke="#FBBF24" fill="none" stroke-width="1.2" stroke-linecap="round"/>' +
    "</svg>";

  function card(id, cls, title, sub, tools, canvasId, canvasCls, foot) {
    return (
      '<section class="wfp-card ' + cls + '" id="' + id + '">' +
      '<div class="wfp-card-head"><div><h3>' + title + "</h3><p>" + sub + "</p></div>" +
      (tools ? '<div class="wfp-card-tools">' + tools + "</div>" : "") +
      "</div>" +
      '<div class="wfp-canvas ' + (canvasCls || "") + '"><canvas id="' + canvasId + '"></canvas></div>' +
      (foot ? '<div class="wfp-card-foot">' + foot + "</div>" : "") +
      "</section>"
    );
  }

  var MARKUP =
    '<div class="wfp-shell">' +
    '<aside class="wfp-side">' +
    '<div class="wfp-brand"><span class="wfp-logo">' + WHEAT + "</span>" +
    '<span><b>WFP DataHub</b><span>Food Security</span></span></div>' +
    '<nav class="wfp-nav" id="wfpNav" aria-label="Navigation PAM">' +
    '<button type="button" class="on" data-target="wfpTop">🏠 <span>Tableau de bord</span></button>' +
    '<button type="button" data-target="wfpG1">🍽️ <span>Sécurité alimentaire</span></button>' +
    '<button type="button" data-target="wfpG3">💰 <span>Marchés &amp; Prix</span></button>' +
    '<button type="button" data-target="wfpG6">🚚 <span>Opérations terrain</span></button>' +
    '<button type="button" data-target="wfpG8">📊 <span>Indicateurs IPC</span></button>' +
    '<button type="button" data-target="wfpG13">⚠️ <span>Alertes précoces</span></button>' +
    "</nav>" +
    '<div class="wfp-side-foot">' +
    '<button type="button" class="wfp-side-btn" id="wfpOpenCockpit">Cockpit investissement PAM</button>' +
    '<p class="wfp-side-note">Données illustratives · cadres IPC, FCS, CSI et HDDS · 15 pays d\'Afrique de l\'Ouest · campagne 2024. Ne remplace pas les chiffres officiels du PAM.</p>' +
    "</div></aside>" +

    '<div class="wfp-body">' +
    '<header class="wfp-top" id="wfpTop">' +
    '<div class="wfp-top-row"><div>' +
    '<div class="wfp-crumb">PAM <span>/</span> Food Security Analytics <span>/</span> <b>Afrique de l\'Ouest</b></div>' +
    "<h2>Sécurité Alimentaire · <em>Afrique de l'Ouest</em></h2>" +
    '<p class="wfp-sub" id="wfpScope">15 pays · campagne 2024 · données illustratives</p>' +
    "</div>" +
    '<div class="wfp-top-actions">' +
    '<span class="wfp-alert" id="wfpPhaseBadge"><i></i><span id="wfpPhaseBadgeTxt">⚠ 3 pays IPC Phase 4</span></span>' +
    '<select class="wfp-select" id="wfpPeriod" aria-label="Périodicité">' +
    '<option value="mois">Mensuel</option><option value="trimestre">Trimestriel</option><option value="annee">Annuel</option>' +
    "</select>" +
    '<div class="wfp-seg" role="group" aria-label="Région">' +
    '<button type="button" data-region="sahel">Sahel</button>' +
    '<button type="button" data-region="cotier">Côtier</button>' +
    '<button type="button" class="on" data-region="tous">Tous</button>' +
    "</div>" +
    '<button type="button" class="wfp-btn" id="wfpReportBtn">Générer rapport</button>' +
    "</div></div></header>" +

    '<div class="wfp-kpis" id="wfpKpis">' +
    kpi("wfpK1", "Insécurité alimentaire", "#F59E0B") +
    kpi("wfpK2", "FCS moyen régional", "#EA580C") +
    kpi("wfpK3", "Pays en crise IPC 3+", "#EF4444") +
    kpi("wfpK4", "Bénéficiaires atteints", "#10B981") +
    kpi("wfpK5", "Prix céréales — index", "#EF4444") +
    "</div>" +

    '<div class="wfp-grid">' +
    card("wfpG1", "wfp-c7", "Phases IPC par pays 2024", "Chaque barre = 100 % de la population · 12 pays suivis",
      '<div class="wfp-legend" id="wfpIpcLegend"></div>', "wfpC1", "h340",
      '<span>La ligne rouge marque le passage en IPC 3+ (crise).</span><span>Survol : phase, part et effectif</span>') +
    card("wfpG2", "wfp-c5", "Évolution FCS 2020-2024", "Food Consumption Score · 6 pays · points trimestriels",
      "", "wfpC2", "h340",
      '<span>Zone grise : COVID · zone ambre : crise du Sahel</span><span id="wfpFcsNote">Seuil acceptable : 42</span>') +
    card("wfpG3", "wfp-c12", "Prix des marchés céréaliers", "Ratio prix / normale saisonnière · Jan 2023 → Déc 2024 · FCFA/kg",
      '<span class="wfp-tag" id="wfpHeatPeriod">Vue mensuelle</span>', "wfpC3", "h340 scroll",
      '<div class="wfp-scale" id="wfpPriceScale"></div><span>Colonne de droite : moyenne de la période</span>') +
    card("wfpG4", "wfp-c4", "Stratégies de survie (CSI)", "Cinq axes · 100 = stratégie extrême",
      "", "wfpC4", "h300",
      '<span id="wfpRadarLegend" class="wfp-legend"></span><span>Cercle rouge : seuil critique 60</span>') +
    card("wfpG5", "wfp-c4", "Corrélation prix / MAG", "Prix du mil et prévalence de malnutrition aiguë · 48 points",
      "", "wfpC5", "h300",
      '<span>Taille du point = population affectée</span><span>Quadrants prix × MAG</span>') +
    card("wfpG6", "wfp-c4", "Funnel pipeline PAM", "De la cible à la confirmation de réception",
      '<span class="wfp-tag">Vue programme régional</span>', "wfpC6", "h340",
      '<span>Ambre = ciblage · vert = réception confirmée</span><span>6,4 M perdus hors du pipeline (35 %)</span>') +
    card("wfpG7", "wfp-c6", "Saisonnalité de l'insécurité", "Personnes en insécurité, millions · 2022, 2023 et 2024",
      '<span class="wfp-tag">Soudure juin–septembre</span>', "wfpC7", "h380",
      '<span>&lt; 40 M vert · 40–48 M ambre · &gt; 48 M rouge</span><span>Trois années côte à côte dans chaque mois</span>') +
    '<section class="wfp-card wfp-c6" id="wfpG8">' +
    '<div class="wfp-card-head"><div><h3>Carte choroplèthe IPC</h3><p id="wfpMapSub">Couleur = phase IPC dominante · Afrique de l\'Ouest</p></div>' +
    '<div class="wfp-card-tools"><select class="wfp-select" id="wfpMapMode" aria-label="Couche IPC">' +
    '<option value="2024">IPC 2024</option><option value="2023">IPC 2023</option><option value="delta">Évolution</option>' +
    "</select></div></div>" +
    '<div class="wfp-map-wrap"><div class="wfp-canvas h380"><canvas id="wfpC8"></canvas></div>' +
    '<aside class="wfp-detail" id="wfpDetail" hidden><button type="button" class="wfp-detail-x" id="wfpDetailClose" aria-label="Fermer la fiche">×</button><div id="wfpDetailBody"></div></aside></div>' +
    '<div class="wfp-card-foot"><div class="wfp-legend" id="wfpMapLegend"></div><span>Clic ou clic droit : fiche pays</span></div></section>' +
    card("wfpG9", "wfp-c12", "Évolution des prix — 5 céréales", "FCFA/kg · 20 trimestres 2020-2024 · courbes de Bézier",
      '<div class="wfp-legend" id="wfpC9Toggles"></div>', "wfpC9", "h340",
      '<span>Bandes : COVID, crise Ukraine, crise du Sahel</span><span>Cliquer une céréale pour l\'afficher ou la masquer</span>') +
    card("wfpG10", "wfp-c6", "Accès vs disponibilité", "kcal/jour disponibles et part des ménages qui y accèdent",
      "", "wfpC10", "h320",
      '<span class="lg"><i class="sw" style="background:#3B82F6"></i>Disponibilité</span><span class="lg"><i class="sw" style="background:#F59E0B"></i>Accès économique</span><span class="lg"><i class="sw" style="background:#EF4444"></i>Gap d\'accès</span>') +
    card("wfpG11", "wfp-c6", "Distribution HDDS des ménages", "Score de diversité alimentaire 0 à 12",
      '<select class="wfp-select" id="wfpHddsCountry" aria-label="Pays HDDS"></select>' +
      '<div class="wfp-seg" id="wfpHddsScope"><button type="button" class="on" data-scope="pays">Pays</button><button type="button" data-scope="region">Région</button></div>',
      "wfpC11", "h320",
      '<span>Rouge &lt; 3 crise · ambre 3–5 risque · vert &gt; 5 acceptable</span><span>Courbe : distribution normale ajustée</span>') +
    card("wfpG12", "wfp-c4", "FCS 2020 → 2024", "Point gris = 2020 · point coloré = 2024",
      "", "wfpC12", "h340",
      '<span class="lg"><i class="sw" style="background:#10B981"></i>Amélioration</span><span class="lg"><i class="sw" style="background:#EF4444"></i>Dégradation</span>') +
    card("wfpG13", "wfp-c4", "Carte thermique des alertes", "Niveau 1 calme → 5 urgence · 12 mois 2024",
      "", "wfpC13", "h340",
      '<div class="wfp-scale" id="wfpAlertScale"></div>') +
    card("wfpG14", "wfp-c4", "Waterfall budget PAM", "Besoin 2,8 Mds USD · disponible 2,1 · gap 0,7",
      '<span class="wfp-tag">Vue programme régional</span>', "wfpC14", "h340",
      '<span class="lg"><i class="sw" style="background:#10B981"></i>Apports</span><span class="lg"><i class="sw" style="background:#EF4444"></i>Manque</span><span class="lg"><i class="sw" style="background:#F59E0B"></i>Besoin</span>') +
    '<section class="wfp-card wfp-c12" id="wfpG15">' +
    '<div class="wfp-card-head"><div><h3>Bullet charts de performance</h3><p>8 indicateurs · barre colorée = valeur, trait noir = objectif, point = année précédente</p></div>' +
    '<span class="wfp-tag" id="wfpBulletScope">12 pays</span></div>' +
    '<div class="wfp-bullets" id="wfpBullets"></div>' +
    '<div class="wfp-card-foot"><span>Vert = objectif atteint · rouge = en dessous (ou au-dessus, si l\'indicateur doit baisser)</span></div>' +
    "</section>" +
    "</div></div>" +

    '<div class="wfp-modal" id="wfpReport" hidden>' +
    '<div class="wfp-modal-card" role="dialog" aria-modal="true" aria-labelledby="wfpReportTitle">' +
    '<div class="wfp-modal-head"><div class="wfp-kicker">PAM · WFP DataHub</div>' +
    '<h3 id="wfpReportTitle">Rapport de sécurité alimentaire</h3>' +
    '<p id="wfpReportMeta"></p></div>' +
    '<div class="wfp-report-grid" id="wfpReportKpis"></div>' +
    '<div class="wfp-report-body" id="wfpReportBody"></div>' +
    '<p class="wfp-disclaimer">Chiffres illustratifs, alignés sur les cadres IPC / FCS / CSI / HDDS pour une démonstration. Ils ne constituent pas une publication officielle du Programme alimentaire mondial.</p>' +
    '<div class="wfp-modal-actions">' +
    '<button type="button" class="wfp-btn ghost" id="wfpReportClose">Fermer</button>' +
    '<button type="button" class="wfp-btn" id="wfpPrint">Imprimer</button>' +
    "</div></div></div>" +
    "</div>";

  function kpi(id, kicker, color) {
    return (
      '<article class="wfp-kpi" id="' + id + '">' +
      '<div class="wfp-kpi-kicker">' + kicker + "</div>" +
      '<div class="wfp-kpi-val" id="' + id + 'Val" style="color:' + color + '">—</div>' +
      '<div class="wfp-kpi-lab" id="' + id + 'Lab"></div>' +
      '<div class="wfp-kpi-sub" id="' + id + 'Sub"></div>' +
      '<span class="wfp-badge" id="' + id + 'Badge"></span>' +
      '<div class="wfp-kpi-mini" id="' + id + 'Mini"></div>' +
      '<div class="wfp-kpi-foot" id="' + id + 'Foot"></div>' +
      "</article>"
    );
  }

  function list() { return D.regionOf(state.region); }

  function sum(rows, key) {
    return rows.reduce(function (s, c) { return s + c[key]; }, 0);
  }

  function model() {
    var rows = list();
    var all = state.region === "tous";
    var benef = sum(rows, "benef");
    var target = sum(rows, "target");
    return {
      rows: rows,
      all: all,
      insecure: all ? D.HEADLINE.insecure : sum(rows, "insecure"),
      delta: all ? D.HEADLINE.insecureDelta : sum(rows, "insecureDelta"),
      fcs: all ? D.HEADLINE.fcs : D.weighted(rows, "fcs", "insecure"),
      crisis: rows.filter(function (c) { return c.ipc3share >= 20; }),
      phase4: rows.filter(function (c) { return c.phase4; }),
      benef: all ? D.HEADLINE.benef : benef,
      target: all ? D.HEADLINE.target : target,
      price: all ? D.HEADLINE.priceIndex : D.weighted(rows, "fpi", "pop"),
    };
  }

  function regionName() {
    return state.region === "sahel" ? "Sahel" : state.region === "cotier" ? "Pays côtiers" : "Afrique de l'Ouest";
  }

  function pick(codes, rows, max) {
    var wanted = codes.map(function (code) { return D.BY_CODE[code]; }).filter(function (c) {
      return c && rows.some(function (r) { return r.code === c.code; });
    });
    if (wanted.length) return wanted.slice(0, max || wanted.length);
    return rows.slice(0, max || rows.length);
  }

  function gridColor(c) {
    if (c.phase4 || c.ipc >= 4) return "#EF4444";
    if (c.ipc === 3) return "#FB923C";
    if (c.ipc === 2) return "#FDE68A";
    return "#86EFAC";
  }

  function setText(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  function renderKpis() {
    var m = model();
    var pct = m.target ? Math.round(m.benef / m.target * 100) : 0;
    var klass = D.fcsClass(m.fcs);
    $("#wfpScope").textContent = regionName() + " · " + m.rows.length + " pays · campagne 2024 · données illustratives";
    var badge = $("#wfpPhaseBadge");
    var n4 = m.phase4.length;
    badge.classList.toggle("ok", n4 === 0);
    $("#wfpPhaseBadgeTxt").textContent = n4
      ? "⚠ " + n4 + " pays IPC Phase 4"
      : "Aucun pays IPC Phase 4";

    setText("#wfpK1Val", nf(m.insecure, 1) + "<small>M</small>");
    setText("#wfpK1Lab", "Personnes en insécurité alimentaire");
    setText("#wfpK1Sub", regionName() + " · 2024");
    setText("#wfpK1Badge", "↑ +" + nf(m.delta, 1) + " M vs T3 2023");
    $("#wfpK1Badge").className = "wfp-badge bad";
    var top = m.rows.slice().sort(function (a, b) { return b.insecure - a.insecure; }).slice(0, 8);
    $("#wfpK1Mini").innerHTML = '<canvas id="wfpK1Canvas"></canvas>';
    $("#wfpK1Foot").innerHTML = "<span>" + top.length + " premiers pays</span><b>" + esc(top[0].short) + " " + nf(top[0].insecure, 1) + " M</b>";

    setText("#wfpK2Val", nf(m.fcs, 1));
    setText("#wfpK2Lab", "Food Consumption Score");
    setText("#wfpK2Sub", "Classification : " + klass);
    setText("#wfpK2Badge", klass === "Acceptable" ? "Au-dessus de 42" : "Sous le seuil acceptable");
    $("#wfpK2Badge").className = "wfp-badge " + (klass === "Acceptable" ? "good" : "warn");
    $("#wfpK2Mini").innerHTML = '<canvas id="wfpK2Canvas"></canvas>';
    $("#wfpK2Foot").innerHTML = "<span>Pauvre 0–28</span><b>Limite 28–42 · Acceptable 42+</b>";

    setText("#wfpK3Val", String(m.crisis.length) + "<small> pays</small>");
    setText("#wfpK3Lab", "Phase IPC 3 ou supérieure");
    setText("#wfpK3Sub", "Part de population en crise ≥ 20 %");
    setText("#wfpK3Badge", m.crisis.length ? "Urgence alimentaire active" : "Pas de seuil de crise");
    $("#wfpK3Badge").className = "wfp-badge " + (m.crisis.length ? "bad" : "good");
    $("#wfpK3Mini").innerHTML = '<div class="wfp-ipc-grid" id="wfpK3Grid">' + m.rows.map(function (c) {
      return '<i data-code="' + c.code + '" title="' + esc(c.name) + " · IPC " + c.ipc + '" style="background:' + gridColor(c) + '"></i>';
    }).join("") + "</div>";
    $("#wfpK3Foot").innerHTML = m.phase4.length
      ? "<span>Alerte phase 4</span><b>" + m.phase4.map(function (c) { return esc(c.short); }).join(" · ") + "</b>"
      : "<span>Aucune alerte phase 4</span><b>—</b>";

    setText("#wfpK4Val", nf(m.benef, 1) + "<small>M</small>");
    setText("#wfpK4Lab", "Bénéficiaires assistés PAM");
    setText("#wfpK4Sub", "Objectif " + nf(m.target, 1) + " M · " + pct + " % atteint");
    setText("#wfpK4Badge", m.all ? "↑ +8 % vs 2023" : pct + " % de l'objectif régional");
    $("#wfpK4Badge").className = "wfp-badge good";
    $("#wfpK4Mini").innerHTML = '<div class="wfp-prog" aria-hidden="true"><b id="wfpK4Bar"></b></div>';
    $("#wfpK4Foot").innerHTML = "<span>Cible du plan de réponse</span><b>" + pct + " %</b>";
    requestAnimationFrame(function () {
      var bar = $("#wfpK4Bar");
      if (bar) bar.style.width = Math.min(100, pct) + "%";
    });

    var vs = m.all ? 28 : Math.max(0, Math.round(m.price - 100));
    setText("#wfpK5Val", nf(m.price, 1));
    setText("#wfpK5Lab", "Index prix alimentaires");
    setText("#wfpK5Sub", "Base 100 = 2015");
    setText("#wfpK5Badge", "↑ +" + vs + " % vs " + (m.all ? "normale saisonnière" : "base 2015"));
    $("#wfpK5Badge").className = "wfp-badge bad";
    $("#wfpK5Mini").innerHTML = '<canvas id="wfpK5Canvas"></canvas>';
    $("#wfpK5Foot").innerHTML = "<span>12 derniers mois</span><b>Hausse</b>";

    ["k1", "k2", "k5"].forEach(function (k) {
      if (charts[k] && charts[k].destroy) charts[k].destroy();
      charts[k] = null;
    });
    var end = D.PRICE_INDEX[D.PRICE_INDEX.length - 1];
    var spark = D.PRICE_INDEX.map(function (v) { return v * (m.price / end); });
    charts.k1 = CH.miniBars($("#wfpK1Canvas"), { rows: top.map(function (c) { return { name: c.name, value: c.insecure }; }) });
    charts.k2 = CH.miniGauge($("#wfpK2Canvas"), { value: m.fcs, max: 70 });
    charts.k5 = CH.miniLine($("#wfpK5Canvas"), { data: spark });
  }

  function ensure(key, id, fn, cfg) {
    var canvas = document.getElementById(id);
    if (!canvas) return;
    if (!charts[key]) charts[key] = fn(canvas, cfg);
    else charts[key].update(cfg);
  }

  function ipcCountries() {
    var order = ["NE", "ML", "BF", "SN", "NG", "GH", "CI", "MR", "GN", "SL", "BJ", "TG"];
    var rows = list();
    var picked = order.map(function (code) { return D.BY_CODE[code]; }).filter(function (c) {
      return rows.some(function (r) { return r.code === c.code; });
    });
    return picked.length ? picked : rows;
  }

  function updateCharts() {
    var m = model();
    var rows = m.rows;
    var codes = {};
    rows.forEach(function (c) { codes[c.code] = true; });

    var ipc = ipcCountries();
    ensure("c1", "wfpC1", CH.stackedBar, {
      labels: ipc.map(function (c) { return c.short; }),
      names: ipc.map(function (c) { return c.name; }),
      pops: ipc.map(function (c) { return c.pop; }),
      series: D.PHASES.map(function (ph, i) {
        return { name: ph.label, color: ph.color, values: ipc.map(function (c) { return c.phases[i]; }) };
      }),
    });

    var fcsSeries = D.FCS_SERIES.series.filter(function (s) { return state.region === "tous" || codes[s.code]; });
    if (!fcsSeries.length) fcsSeries = D.FCS_SERIES.series;
    ensure("c2", "wfpC2", CH.multiLine, {
      labels: D.FCS_SERIES.labels,
      series: fcsSeries,
      yMin: 20, yMax: 62,
      threshold: { value: 42, label: "FCS acceptable : 42" },
      zones: [
        { from: D.FCS_SERIES.covid[0], to: D.FCS_SERIES.covid[1], color: "rgba(100,116,139,.12)", label: "COVID" },
        { from: D.FCS_SERIES.sahel[0], to: D.FCS_SERIES.sahel[1], color: "rgba(245,158,11,.13)", label: "Crise Sahel" },
      ],
      area: true,
      decimals: 0,
    });

    var heatRows = D.COMMODITIES.filter(function (c) {
      return state.region === "tous" || c.region === state.region || c.region === "tous";
    }).map(function (c) {
      return { name: c.name, market: c.market, normal: c.normal, values: D.aggregateMonthly(c.monthly, state.period) };
    });
    ensure("c3", "wfpC3", CH.heatmap, {
      rows: heatRows,
      cols: D.periodLabels(state.period),
      varLabel: state.period === "annee" ? "Variation annuelle" : state.period === "trimestre" ? "Variation trimestrielle" : "Variation mensuelle",
    });
    var periodLabel = state.period === "annee" ? "Vue annuelle" : state.period === "trimestre" ? "Vue trimestrielle" : "Vue mensuelle";
    $("#wfpHeatPeriod").textContent = periodLabel;

    var radarSeries = D.CSI.countries.filter(function (s) { return codes[s.code]; });
    if (radarSeries.length < 3) radarSeries = D.CSI.countries;
    ensure("c4", "wfpC4", CH.radar, {
      axes: D.CSI.axes,
      series: radarSeries.map(function (s) { return { name: s.name, color: s.color, values: s.values }; }),
      max: 100,
      threshold: 60,
    });
    $("#wfpRadarLegend").innerHTML = radarSeries.map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + "</span>";
    }).join("") + '<span><i style="background:#EF4444"></i>Seuil 60</span>';

    ensure("c5", "wfpC5", CH.scatter, {
      points: D.SCATTER.filter(function (p) { return state.region === "tous" || codes[p.code]; }),
      xMin: 100, xMax: 500, yMin: 4, yMax: 18,
    });

    ensure("c6", "wfpC6", CH.funnel, { steps: D.FUNNEL });
    ensure("c7", "wfpC7", CH.rose, {
      labels: D.SEASON.labels,
      years: D.SEASON.years,
      max: 60,
      soudure: D.SEASON.soudure,
    });

    var year = state.mapMode === "2023" ? 2023 : 2024;
    ensure("c8", "wfpC8", CH.choropleth, {
      countries: rows.map(function (c) {
        var phases = state.mapMode === "2023" ? c.phases2023 : c.phases;
        var phase = state.mapMode === "2023" ? c.dominant2023 : c.dominant;
        var delta = c.ipc3share - c.ipc3share2023;
        var color = state.mapMode === "delta"
          ? (delta > 3 ? "#EF4444" : delta > 0.4 ? "#FB923C" : delta < -3 ? "#10B981" : "#86EFAC")
          : D.ipcColor(phase);
        return {
          code: c.code, name: c.name, short: c.short, poly: c.poly, color: color, phase: phase,
          phasePop: c.pop * phases[phase - 1] / 100, fcs: c.fcs, csi: c.csi,
        };
      }),
      onPick: showDetail,
    });
    $("#wfpMapSub").textContent = state.mapMode === "delta"
      ? "Évolution de la part IPC 3+ entre 2023 et 2024"
      : "Couleur = phase IPC dominante · " + regionName() + " · " + year;
    var legend = state.mapMode === "delta"
      ? [{ color: "#10B981", label: "IPC 3+ en baisse" }, { color: "#86EFAC", label: "Stable" }, { color: "#FB923C", label: "Hausse légère" }, { color: "#EF4444", label: "Hausse marquée" }]
      : D.PHASES.map(function (ph, i) {
        return { color: ph.color, label: ph.short + " · " + nf(D.phasePopulation(rows, year)[i], 1) + " M" };
      });
    $("#wfpMapLegend").innerHTML = legend.map(function (item) {
      return '<span><i style="background:' + item.color + '"></i>' + esc(item.label) + "</span>";
    }).join("");

    if (!charts.c9) {
      ensure("c9", "wfpC9", CH.multiLine, cerealCfg());
    }

    var access = pick(["NE", "ML", "BF", "SN", "GH", "NG", "CI", "MR", "GN", "BJ"], rows, 10);
    ensure("c10", "wfpC10", CH.dualBar, {
      labels: access.map(function (c) { return c.short; }),
      names: access.map(function (c) { return c.name; }),
      kcal: access.map(function (c) { return c.kcal; }),
      access: access.map(function (c) { return c.access; }),
      fao: 2100,
    });

    ensure("c11", "wfpC11", CH.histogram, hddsCfg());

    var dumb = pick(["NE", "ML", "BF", "MR", "NG", "SL", "GW", "SN", "GH", "CI"], rows, 10)
      .slice().sort(function (a, b) { return (a.fcs - a.fcs2020) - (b.fcs - b.fcs2020); });
    ensure("c12", "wfpC12", CH.dumbbell, {
      rows: dumb.map(function (c) { return { name: c.short, a: c.fcs2020, b: c.fcs }; }),
      xMin: 24, xMax: 62, threshold: 42,
    });

    var alerts = pick(["NE", "ML", "BF", "MR", "NG", "SL", "GW", "SN", "GN", "CI"], rows, 8);
    ensure("c13", "wfpC13", CH.calendar, {
      cols: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      rows: alerts.map(function (c) {
        return { name: c.short, full: c.name, values: c.alerts, exposed: c.insecure };
      }),
    });

    ensure("c14", "wfpC14", CH.waterfall, { items: D.BUDGET.items, max: 3.2 });
    renderBullets(rows.slice().sort(function (a, b) { return b.insecure - a.insecure; }).slice(0, 12));
  }

  function cerealCfg() {
    return {
      labels: D.CEREALS.labels,
      series: D.CEREALS.series.map(function (s) {
        return { id: s.id, name: s.name, color: s.color, data: s.data, visible: !hiddenCereal[s.id] };
      }),
      yMin: 100, yMax: 680,
      yFormat: function (v) { return nf(v, 0); },
      zones: D.CEREALS.zones,
      area: true,
      unit: " FCFA",
      decimals: 0,
      yPad: 46,
    };
  }

  function hddsCfg() {
    if (state.hddsScope === "region") {
      var rows = list();
      return { bins: D.aggregateHdds(rows), mean: D.weighted(rows, "hddsMean", "pop"), median: null };
    }
    var c = D.BY_CODE[state.hddsCountry];
    if (!c || (state.region !== "tous" && c.region !== state.region)) c = list()[0];
    state.hddsCountry = c.code;
    var sel = $("#wfpHddsCountry");
    if (sel && sel.value !== c.code) sel.value = c.code;
    return { bins: c.hdds, mean: c.hddsMean, median: c.hddsMedian };
  }

  function renderBullets(rows) {
    var host = $("#wfpBullets");
    if (!host.childElementCount) {
      host.innerHTML = D.INDICATORS.map(function (ind, i) {
        return '<div class="wfp-bullet"><div class="wfp-bullet-h"><b>' + esc(ind.label) + "</b><span>obj. " +
          (ind.target < 5 ? nf(ind.target, ind.target < 2 ? 0 : 0) : ind.target) + esc(ind.unit) +
          "</span></div><div class=\"wfp-canvas\" id=\"wfpBwrap" + i + "\"><canvas id=\"wfpB" + i + "\"></canvas></div></div>";
      }).join("");
    }
    var h = Math.max(132, rows.length * 22 + 10);
    $("#wfpBulletScope").textContent = rows.length + " pays";
    D.INDICATORS.forEach(function (ind, i) {
      var wrap = document.getElementById("wfpBwrap" + i);
      if (wrap) wrap.style.height = h + "px";
      var canvas = document.getElementById("wfpB" + i);
      var cfg = {
        indicator: ind,
        rows: rows.map(function (c) {
          var value = ind.get(c);
          return {
            name: c.short,
            value: value,
            prev: ind.prev(c),
            ok: ind.higher ? value >= ind.target : value <= ind.target,
          };
        }),
      };
      if (!charts["b" + i]) charts["b" + i] = CH.bullets(canvas, cfg);
      else charts["b" + i].update(cfg);
    });
  }

  function showDetail(hit) {
    var c = D.BY_CODE[hit.code || hit];
    if (!c) return;
    var panel = $("#wfpDetail");
    panel.hidden = false;
    var stack = D.PHASES.map(function (ph, i) {
      return '<i style="width:' + c.phases[i] + "%;background:" + ph.color + '"></i>';
    }).join("");
    $("#wfpDetailBody").innerHTML =
      "<h4>" + c.flag + " " + esc(c.name) + "</h4>" +
      '<p class="wfp-dsub">' + (c.region === "sahel" ? "Sahel" : "Côtier") + " · phase classée IPC " + c.ipc +
      (c.phase4 ? " · alerte phase 4" : "") + "</p>" +
      '<div class="wfp-stack" title="Répartition IPC 1 à 5">' + stack + "</div>" +
      '<div class="wfp-drows">' +
      row("Population", nf(c.pop, 1) + " M") +
      row("Insécurité", nf(c.insecure, 1) + " M") +
      row("Part IPC 3+", c.ipc3share + " %") +
      row("Phase dominante", "IPC " + c.dominant) +
      row("FCS", nf(c.fcs, 1) + " · " + D.fcsClass(c.fcs)) +
      row("CSI", String(c.csi)) +
      row("HDDS moyen", nf(c.hddsMean, 1)) +
      row("Bénéficiaires", nf(c.benef, 2) + " M") +
      row("Prix / normale", nf(c.priceRatio, 2) + "×") +
      row("Alerte août 2024", String(c.alerts[7]) + " / 5") +
      "</div>";
  }
  function row(k, v) { return "<div><span>" + k + "</span><b>" + v + "</b></div>"; }

  function fillHddsCountries() {
    var sel = $("#wfpHddsCountry");
    var rows = list();
    var current = state.hddsCountry;
    sel.innerHTML = rows.map(function (c) {
      return '<option value="' + c.code + '">' + c.flag + " " + esc(c.name) + "</option>";
    }).join("");
    if (!rows.some(function (c) { return c.code === current; })) current = rows[0].code;
    state.hddsCountry = current;
    sel.value = current;
  }

  function legendDots(items) {
    return items.map(function (it) {
      return '<span><i style="background:' + it.color + '"></i>' + esc(it.label) + "</span>";
    }).join("");
  }

  function staticLegends() {
    $("#wfpIpcLegend").innerHTML = legendDots(D.PHASES.map(function (ph) {
      return { color: ph.color, label: ph.short };
    }));
    $("#wfpPriceScale").innerHTML = legendDots([
      { color: "#DCFCE7", label: "< 0,8" },
      { color: "#F0FDF4", label: "0,8–1" },
      { color: "#FFFBEB", label: "1–1,2" },
      { color: "#FEF3C7", label: "1,2–1,5" },
      { color: "#FED7AA", label: "1,5–2" },
      { color: "#FCA5A5", label: "> 2 crise" },
    ]);
    $("#wfpAlertScale").innerHTML = legendDots([
      { color: "#86EFAC", label: "1" },
      { color: "#D9F99D", label: "2" },
      { color: "#FCD34D", label: "3" },
      { color: "#FB923C", label: "4" },
      { color: "#EF4444", label: "5" },
    ]);
    $("#wfpC9Toggles").innerHTML = D.CEREALS.series.map(function (s) {
      return '<button type="button" class="wfp-chip on" data-cereal="' + s.id + '"><i style="background:' + s.color + '"></i>' + esc(s.name) + "</button>";
    }).join("");
  }

  function openReport() {
    var m = model();
    var pct = m.target ? Math.round(m.benef / m.target * 100) : 0;
    var when = new Date();
    var stamp = when.toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    $("#wfpReportMeta").textContent = regionName() + " · " + (state.period === "mois" ? "mensuel" : state.period === "trimestre" ? "trimestriel" : "annuel") + " · généré le " + stamp;
    $("#wfpReportKpis").innerHTML = [
      ["Insécurité", nf(m.insecure, 1) + " M"],
      ["FCS", nf(m.fcs, 1) + " · " + D.fcsClass(m.fcs)],
      ["Pays IPC 3+", String(m.crisis.length)],
      ["Phase 4", String(m.phase4.length)],
      ["Bénéficiaires", nf(m.benef, 1) + " M · " + pct + " %"],
      ["Indice prix", nf(m.price, 1)],
    ].map(function (x) { return "<div><small>" + x[0] + "</small><b>" + x[1] + "</b></div>"; }).join("");
    var crisis = m.crisis.slice().sort(function (a, b) { return b.ipc3share - a.ipc3share; });
    var hot = D.COMMODITIES.map(function (c) {
      return { name: c.name, market: c.market, ratio: c.monthly[23] / c.normal, price: c.monthly[23] };
    }).filter(function (c) { return c.ratio >= 1.5; }).sort(function (a, b) { return b.ratio - a.ratio; });
    $("#wfpReportBody").innerHTML =
      "<p><b>" + esc(regionName()) + ", campagne 2024.</b> " + nf(m.insecure, 1) +
      " millions de personnes sont en insécurité alimentaire" +
      (m.delta ? " (+" + nf(m.delta, 1) + " M par rapport au troisième trimestre 2023)" : "") +
      ". Le FCS " + (m.all ? "régional" : "de la sélection") + " s'établit à <b>" + nf(m.fcs, 1) +
      "</b>, soit une classe <b>" + D.fcsClass(m.fcs) + "</b>" +
      (m.fcs < 42 ? " — juste sous le seuil acceptable de 42." : ".") + "</p>" +
      "<p>" + m.crisis.length + " pays ont au moins 20 % de leur population en phase IPC 3 ou plus" +
      (m.phase4.length ? ", dont " + m.phase4.map(function (c) { return c.name; }).join(", ") + " en alerte phase 4." : ".") +
      " Le PAM atteint " + nf(m.benef, 1) + " millions de bénéficiaires sur un objectif de " + nf(m.target, 1) +
      " millions (" + pct + " %). L'indice des prix alimentaires est à " + nf(m.price, 1) +
      (m.all ? ", soit +28 % au-dessus de la normale saisonnière." : ".") + "</p>" +
      "<p><b>Pays en crise</b></p><ul>" + crisis.map(function (c) {
        return "<li>" + esc(c.name) + " — IPC " + c.ipc + ", " + c.ipc3share + " % en phase 3+, FCS " + nf(c.fcs, 1) + ", " + nf(c.insecure, 1) + " M de personnes</li>";
      }).join("") + "</ul>" +
      "<p><b>Marchés en tension (ratio ≥ 1,5)</b></p><ul>" + hot.map(function (c) {
        return "<li>" + esc(c.name) + " (" + esc(c.market) + ") — " + nf(c.price, 0) + " FCFA/kg, " + nf(c.ratio, 2) + "× la normale</li>";
      }).join("") + "</ul>";
    $("#wfpReport").hidden = false;
  }

  function wire() {
    $$("#wfpNav button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var el = document.getElementById(btn.getAttribute("data-target"));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        $$("#wfpNav button").forEach(function (b) { b.classList.toggle("on", b === btn); });
      });
    });
    $$("[data-region]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.region = btn.getAttribute("data-region");
        $$("[data-region]").forEach(function (b) { b.classList.toggle("on", b === btn); });
        fillHddsCountries();
        $("#wfpDetail").hidden = true;
        renderKpis();
        updateCharts();
      });
    });
    $("#wfpPeriod").addEventListener("change", function (e) {
      state.period = e.target.value;
      updateCharts();
    });
    $("#wfpMapMode").addEventListener("change", function (e) {
      state.mapMode = e.target.value;
      updateCharts();
    });
    $("#wfpHddsCountry").addEventListener("change", function (e) {
      state.hddsCountry = e.target.value;
      state.hddsScope = "pays";
      $$("#wfpHddsScope button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-scope") === "pays"); });
      if (charts.c11) charts.c11.update(hddsCfg());
    });
    $$("#wfpHddsScope button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.hddsScope = btn.getAttribute("data-scope");
        $$("#wfpHddsScope button").forEach(function (b) { b.classList.toggle("on", b === btn); });
        if (charts.c11) charts.c11.update(hddsCfg());
      });
    });
    $("#wfpC9Toggles").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cereal]");
      if (!btn || !charts.c9) return;
      var id = btn.getAttribute("data-cereal");
      hiddenCereal[id] = !hiddenCereal[id];
      btn.classList.toggle("on", !hiddenCereal[id]);
      btn.classList.toggle("off", !!hiddenCereal[id]);
      var series = charts.c9.cfg.series || [];
      series.forEach(function (s) { if (s.id === id) s.visible = !hiddenCereal[id]; });
      charts.c9.repaint();
    });
    $("#wfpK3Mini").addEventListener("click", function (e) {
      var cell = e.target.closest("[data-code]");
      if (!cell) return;
      showDetail(D.BY_CODE[cell.getAttribute("data-code")]);
      var map = document.getElementById("wfpG8");
      if (map) map.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    $("#wfpDetailClose").addEventListener("click", function () { $("#wfpDetail").hidden = true; });
    $("#wfpReportBtn").addEventListener("click", openReport);
    $("#wfpReportClose").addEventListener("click", function () { $("#wfpReport").hidden = true; });
    $("#wfpReport").addEventListener("click", function (e) { if (e.target === $("#wfpReport")) $("#wfpReport").hidden = true; });
    $("#wfpPrint").addEventListener("click", function () { window.print(); });
    $("#wfpOpenCockpit").addEventListener("click", function () {
      if (typeof window.openInvestment === "function") window.openInvestment("wfp");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $("#wfpReport") && !$("#wfpReport").hidden) {
        $("#wfpReport").hidden = true;
        e.stopPropagation();
      }
    });
  }

  function syncTitle() {
    if (!root.classList.contains("on")) return;
    var titleEl = document.getElementById("title");
    if (titleEl) titleEl.textContent = "Sécurité Alimentaire · Afrique de l'Ouest";
  }

  function init() {
    if (state.ready) return;
    root.innerHTML = MARKUP;
    staticLegends();
    fillHddsCountries();
    renderKpis();
    updateCharts();
    wire();
    state.ready = true;
    root.setAttribute("data-wfp-init", "1");
    syncTitle();
    setTimeout(function () { CH.repaintAll(); }, 280);
    setTimeout(function () { CH.repaintAll(); }, 900);
    if (typeof MutationObserver === "function") {
      new MutationObserver(function () {
        if (!root.classList.contains("on")) return;
        syncTitle();
        setTimeout(function () { CH.repaintAll(); }, 80);
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
    }
  }

  function isVisible() { return root.classList.contains("on"); }
  function boot() {
    if (state.ready) return;
    if (isVisible()) { setTimeout(init, 60); return; }
    var started = false;
    var start = function () {
      if (started || state.ready) return;
      started = true;
      setTimeout(init, 60);
    };
    if (typeof MutationObserver === "function") {
      var obs = new MutationObserver(function () { if (isVisible()) start(); });
      obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    }
    var poll = setInterval(function () {
      if (isVisible()) { clearInterval(poll); start(); }
    }, 250);
  }
  boot();

  window.WFPDash = {
    root: root,
    getState: function () { return { region: state.region, period: state.period, mapMode: state.mapMode }; },
    setRegion: function (id) {
      var btn = root.querySelector('[data-region="' + id + '"]');
      if (btn) btn.click();
    },
  };
})();
