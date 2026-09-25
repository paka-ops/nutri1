/* ============================================================================
   NUTRI.N°1 — WHO NutriData · module « Maladies chroniques (MNT) »
   who-ncd.js — obésité, hypertension, diabète, mortalité prématurée.

   Composant autonome : il se greffe sur le tableau de bord #who construit par
   who-surveillance.js, sans le modifier :
     • écoute  wsv:ready  → injecte la section + une entrée de barre latérale
     • écoute  wsv:filter → suit le filtre pays (KPI et 5 graphiques)
     • utilise window.WHOSurv.ui (kpiCard, cardHead…) pour un rendu homogène
   Données réelles : window.WHO_NCD (who-ncd-data.js, OMS GHO).
   Graphiques : window.WHOCharts (Canvas pur, aucune librairie).
   ==========================================================================*/
(function () {
  "use strict";

  var root = document.getElementById("who");
  var N = window.WHO_NCD, D = window.WHO_SURV, CH = window.WHOCharts;
  if (!root || !N || !D || !CH) return;

  var R = N.REGION, G = N.GLOBAL, T = N.TARGETS;
  var mounted = false;
  var charts = {}, kpis = {};
  var heatSort = null; /* { j: colonne, dir: -1 (plus défavorable d'abord) | 1 } */

  /* ------------------------------------------------------------- icônes SVG */
  var svg = function (p) {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + p + "</svg>";
  };
  var ICON = {
    heart: svg('<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/><path d="M8.5 11.5h2l1-2 1.6 3.4 1-1.4h1.4"/>'),
    scale: svg('<path d="M12 4v16M6 20h12M5 8h14"/><path d="M7 8l-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z"/>'),
    drop: svg('<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/><path d="M10 14h4M12 12v4"/>'),
    trend: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
    alert: svg('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
    grid: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    check: svg('<path d="M5 12l5 5L20 7"/>'),
  };

  var COL = { f: "#7C3AED", m: "#0066CC", all: "#FF6B35", ink: "#0F172A", danger: "#EF4444", ok: "#10B981" };
  var SUB_COLORS = D.BUBBLE_COLORS || { Sahel: "#EF4444", "Côtier": "#3B82F6", Insulaire: "#10B981" };
  /* pays étiquetés en permanence sur le nuage diabète (valeurs extrêmes) */
  var DIAB_LABELS = ["BF", "BJ", "GM", "CV", "NE", "NG"];

  /* ---------------------------------------------------------------- helpers */
  var $ = function (s) { return root.querySelector(s); };
  var fr = function (v, d) {
    var k = d === undefined ? 1 : d;
    return Number(v).toLocaleString("fr-FR", { minimumFractionDigits: k, maximumFractionDigits: k });
  };
  var pct = function (v, d) { return fr(v, d) + " %"; };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var html = function (sel, v) { var el = $(sel); if (el) el.innerHTML = v; };
  var focusCode = function () {
    var a = window.WHOSurv;
    var st = a ? a.getState() : { country: "ALL" };
    return st.country && st.country !== "ALL" && N.byCode(st.country) ? st.country : null;
  };
  var focusCountry = function () { var c = focusCode(); return c ? N.byCode(c) : null; };
  /* grand nombre des KPI : 13 -> « 13 », 37.5 -> « 37,5 » */
  var bigVal = function (v) {
    return fr(v, Math.round(v * 10) % 10 === 0 ? 0 : 1) + "<small>%</small>";
  };
  var signed = function (d) { return (d > 0 ? "+" : d < 0 ? "−" : "±") + fr(Math.abs(d)); };

  /* ================================================================ MARKUP */
  function lead(c) {
    var n = c ? c.ncd : R;
    return (c ? "<b>" + esc(c.name) + "</b> — l'obésité adulte" : "<b>Le double fardeau s'installe</b> — l'obésité adulte") +
      " a été multipliée par <b>" + fr(n.obesityX) + "</b> depuis 2000 (" + pct(n.obesity2000) + " → " + pct(n.obesity) + "), " +
      "<b>" + pct(100 - n.htaCtl, 0) + "</b> des hypertendus ne sont pas contrôlés et " +
      "<b>" + pct(100 - n.diabTx, 0) + "</b> des diabétiques de 30 ans et plus ne reçoivent aucun traitement.";
  }

  function markup(ui) {
    var kc = ui.kpiCard, ch = ui.cardHead;
    var legendSub = Object.keys(SUB_COLORS).map(function (k) {
      return '<span><i style="background:' + SUB_COLORS[k] + '"></i>' + esc(k) + "</span>";
    }).join("");
    return (
      /* --- bandeau + 4 KPI --- */
      '<section class="wsv-card wsv-c12 wsv-mnt-head" id="gmnt" style="animation-delay:40ms">' +
      '<div class="wsv-card-head"><div>' +
      '<span class="wsv-mnt-eyebrow">' + ICON.heart + "Module MNT · double fardeau nutritionnel</span>" +
      "<h3>Maladies chroniques liées à la nutrition</h3>" +
      '<p id="wsvMntLead">' + lead(null) + "</p>" +
      '</div><div class="wsv-card-tools">' +
      '<span class="wsv-tag ok">' + ICON.check + "Données officielles OMS</span>" +
      '<span class="wsv-tag grey" id="wsvMntScope">Vue régionale · 16 pays</span>' +
      "</div></div>" +
      '<div class="wsv-kpis wsv-kpis-4">' +
      kc({
        id: "wsvM1", delay: 80, icon: ICON.scale, value: bigVal(R.obesity),
        label: "Obésité adulte (IMC ≥ 30)", sub: "", badge: "", badgeCls: "warn",
        foot: "<span>Moyenne mondiale OMS (2022)</span><b>" + pct(G.obesity, 0) + "</b>",
      }) +
      kc({
        id: "wsvM2", delay: 140, icon: ICON.heart, value: bigVal(R.hta),
        label: "Hypertension · 30-79 ans", sub: "", badge: "", badgeCls: "up",
        foot: "<span>Moyenne mondiale OMS</span><b>" + pct(G.hta, 0) + "</b>",
      }) +
      kc({
        id: "wsvM3", delay: 200, icon: ICON.drop, value: bigVal(R.diab),
        label: "Diabète · adultes 18+", sub: "", badge: "", badgeCls: "up",
        foot: "<span>Moyenne mondiale OMS (2022)</span><b>" + pct(G.diab, 0) + "</b>",
      }) +
      kc({
        id: "wsvM4", delay: 260, icon: ICON.alert, value: bigVal(R.mort),
        label: "Mortalité prématurée MNT", sub: "", badge: "", badgeCls: "down",
        foot: '<span>Cible ODD 3.4 en 2030</span><b id="wsvM4Target">' + pct(R.mortTarget) + "</b>",
      }) +
      "</div>" +
      '<div class="wsv-card-foot"><span>Sources : OMS — Observatoire mondial de la santé (GHO) · NCD-RisC · extraction du ' + esc(N.EXTRACTED) + "</span>" +
      "<span>Dernières estimations publiées : obésité 2024 · diabète 2022 · hypertension 2019 · mortalité 2021</span></div>" +
      "</section>" +

      /* --- M1 : haltères obésité femmes / hommes --- */
      '<section class="wsv-card wsv-c7" id="gm1" style="animation-delay:120ms">' +
      ch("Obésité adulte : l'écart femmes-hommes", "IMC ≥ 30 · adultes 18+ · standardisé sur l'âge · OMS 2024 · trié par obésité féminine", ICON.scale,
        '<span class="wsv-legend-inline"><span><i style="background:' + COL.f + '"></i>Femmes</span>' +
        '<span><i style="background:' + COL.m + '"></i>Hommes</span>' +
        '<span><i style="background:' + COL.ink + ';border-radius:50%;width:6px;height:6px"></i>Ensemble</span></span>') +
      '<div class="wsv-canvas h380"><canvas id="wsvMnt1" aria-label="Obésité adulte par sexe et par pays"></canvas></div>' +
      '<div class="wsv-card-foot"><span id="wsvMnt1Foot"></span><span>Survolez un pays pour le détail</span></div>' +
      "</section>" +

      /* --- M2 : cascade de soins HTA --- */
      '<section class="wsv-card wsv-c5" id="gm2" style="animation-delay:160ms">' +
      ch("Cascade de soins de l'hypertension", "Hypertendus 30-79 ans · diagnostic → traitement → contrôle · OMS 2019", ICON.heart,
        '<span class="wsv-tag orange" id="wsvMnt2Tag"></span>') +
      '<div class="wsv-canvas h300"><canvas id="wsvMnt2" aria-label="Cascade de soins de l\'hypertension"></canvas></div>' +
      '<div class="wsv-mnt-callout" id="wsvMnt2Call"></div>' +
      '<div class="wsv-card-foot"><span class="wsv-legend-inline" id="wsvMnt2Legend"></span></div>' +
      "</section>" +

      /* --- M3 : diabète prévalence × traitement --- */
      '<section class="wsv-card wsv-c6" id="gm3" style="animation-delay:200ms">' +
      ch("Diabète : prévalence vs accès au traitement", "Prévalence 18+ × couverture du traitement 30+ · OMS 2022 · taille = population", ICON.drop,
        '<span class="wsv-tag" id="wsvMnt3Tag"></span>') +
      '<div class="wsv-canvas h300"><canvas id="wsvMnt3" aria-label="Diabète : prévalence et traitement"></canvas></div>' +
      '<div class="wsv-card-foot"><span class="wsv-legend-inline">' + legendSub + "</span>" +
      "<span>Quadrants : moyennes des 16 pays · " + esc(T.diab) + "</span></div>" +
      "</section>" +

      /* --- M4 : transition nutritionnelle --- */
      '<section class="wsv-card wsv-c6" id="gm4" style="animation-delay:240ms">' +
      ch("Transition nutritionnelle : obésité 2000 → 2024", 'Adultes 18+ (IMC ≥ 30) · <span id="wsvMnt4Scope">moyenne des 16 pays</span> · OMS', ICON.trend,
        '<span class="wsv-tag orange" id="wsvMnt4Tag"></span>') +
      '<div class="wsv-canvas h300"><canvas id="wsvMnt4" aria-label="Évolution de l\'obésité adulte depuis 2000"></canvas></div>' +
      '<div class="wsv-card-foot"><span class="wsv-legend-inline">' +
      '<span><i style="background:' + COL.f + '"></i>Femmes</span>' +
      '<span><i style="background:' + COL.all + '"></i>Ensemble</span>' +
      '<span><i style="background:' + COL.m + '"></i>Hommes</span></span>' +
      "<span>Pointillés rouges : niveau 2010 — " + esc(T.obesity) + "</span></div>" +
      "</section>" +

      /* --- M5 : matrice de risque --- */
      '<section class="wsv-card wsv-c12" id="gm5" style="animation-delay:280ms">' +
      ch("Matrice de risque MNT · 16 pays × 7 indicateurs", "Valeurs OMS · couleur = position relative parmi les 16 pays · cliquez sur un en-tête pour trier", ICON.grid,
        '<span class="wsv-tag grey" id="wsvMnt5Sort">Tri : par défaut</span>') +
      '<div class="wsv-canvas h380"><canvas id="wsvMnt5" aria-label="Matrice de risque des maladies chroniques"></canvas></div>' +
      '<div class="wsv-heat-legend">' +
      '<span>Meilleure situation</span><i style="background:#DCFCE7"></i><i style="background:#FEF3C7"></i>' +
      '<i style="background:#FED7AA"></i><i style="background:#FECACA"></i><span>Plus défavorable</span>' +
      '<span class="wsv-note">Score relatif 0-100 calculé entre les 16 pays (ce n\'est pas un seuil OMS) · couverture faible = défavorable</span>' +
      "</div>" +
      "</section>"
    );
  }

  /* ============================================================ CONFIGS */
  function dumbCfg() {
    var code = focusCode();
    var rows = N.COUNTRIES.slice()
      .sort(function (a, b) { return b.ncd.obesityF - a.ncd.obesityF; })
      .map(function (c) {
        return {
          code: c.code, label: c.name, flag: c.flag,
          a: c.ncd.obesityM, b: c.ncd.obesityF, mid: c.ncd.obesity,
          extra: "Ensemble ×" + fr(c.ncd.obesityX) + " depuis 2000 (" + pct(c.ncd.obesity2000) + " → " + pct(c.ncd.obesity) + ")",
        };
      });
    return {
      rows: rows, max: 40, focus: code,
      means: { a: R.obesityM, b: R.obesityF },
      aName: "Hommes", bName: "Femmes", midName: "Ensemble", aShort: "H", bShort: "F",
      aColor: COL.m, bColor: COL.f,
    };
  }

  function cascadeCfg() {
    var c = focusCountry(), n = c ? c.ncd : R;
    return {
      steps: [
        { label: "Hypertendus", sub: pct(n.hta) + " des 30-79 ans", value: 100, color: "#EF4444", ink: "#B91C1C", note: "Base : adultes de 30-79 ans hypertendus" },
        { label: "Diagnostiqués", sub: "diagnostic posé", value: n.htaDx, color: "#FF6B35", ink: "#C2410C", note: "Hypertendus diagnostiqués" },
        { label: "Traités", sub: "sous médicament", value: n.htaTx, color: "#F59E0B", ink: "#B45309", note: "Hypertendus sous traitement" },
        { label: "Contrôlés", sub: "tension < 140/90", value: n.htaCtl, color: "#10B981", ink: "#047857", note: "Hypertendus dont la tension est contrôlée" },
      ],
      ghost: [undefined, G.htaDx, G.htaTx, G.htaCtl],
      ghostLabel: "Moyenne mondiale OMS",
      compare: c ? [undefined, R.htaDx, R.htaTx, R.htaCtl] : undefined,
      compareLabel: "Moyenne 16 pays",
      scopeLabel: c ? c.name : "Moyenne 16 pays",
      target: { index: 3, value: T.htaCtl, label: T.htaCtlLabel },
    };
  }

  function diabCfg() {
    var code = focusCode();
    var X1 = 14.5, Y1 = 35;
    return {
      xDomain: [5, X1], yDomain: [0, Y1], xTicks: 8, quadCorner: true,
      xLabel: "Prévalence du diabète · adultes 18+",
      yLabel: "Sous traitement · diabétiques 30+",
      tipX: "Prévalence (18+)", tipY: "Sous traitement (30+)",
      fmt: function (v) { return pct(v); },
      quadrants: [
        { x0: R.diab, x1: X1, y0: 0, y1: R.diabTx, color: "rgba(239,68,68,.09)", label: "⚠ Priorité : prévalence ↑ · traitement ↓", ink: "rgba(185,28,28,.75)" },
        { x0: 5, x1: R.diab, y0: 0, y1: R.diabTx, color: "rgba(245,158,11,.07)", label: "Traitement faible" },
        { x0: R.diab, x1: X1, y0: R.diabTx, y1: Y1, color: "rgba(255,107,53,.05)", label: "Prévalence élevée" },
        { x0: 5, x1: R.diab, y0: R.diabTx, y1: Y1, color: "rgba(16,185,129,.07)", label: "Relativement favorable" },
      ],
      points: N.COUNTRIES.map(function (c) {
        return {
          x: c.ncd.diab, y: c.ncd.diabTx,
          r: 5 + Math.sqrt(c.pop) * 2.2,
          color: SUB_COLORS[c.subregion] || COL.m,
          name: c.name, flag: c.flag, subregion: c.subregion,
          big: DIAB_LABELS.indexOf(c.code) > -1 || c.code === code,
          dim: !!code && c.code !== code,
          tip: '<div class="wsv-tip-r">Sans traitement (30+)<b>' + pct(100 - c.ncd.diabTx, 0) + "</b></div>",
          note: c.subregion + " · femmes " + pct(c.ncd.diabF) + " · hommes " + pct(c.ncd.diabM),
        };
      }),
    };
  }

  function trendCfg() {
    var c = focusCountry();
    var s = c ? c.ncd.obSeries : R.obSeries;
    var lvl = c ? c.ncd.obesity2010 : R.obesity2010;
    var mx = Math.max.apply(null, s.f.concat(s.m, s.all));
    return {
      labels: N.OB_YEARS,
      series: [
        { name: "Femmes", color: COL.f, data: s.f, visible: true },
        { name: "Ensemble", color: COL.all, data: s.all, visible: true },
        { name: "Hommes", color: COL.m, data: s.m, visible: true },
      ],
      yMin: 0,
      yMax: Math.max(10, Math.ceil((mx * 1.08) / 5) * 5),
      threshold: { value: lvl, label: "Niveau 2010 : " + pct(lvl), align: "left", pill: true },
    };
  }

  /* Score relatif 0-100 entre les 16 pays (100 = plus défavorable) */
  function sev(ind, v) {
    var vals = N.COUNTRIES.map(function (c) { return c.ncd[ind.key]; });
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), span = mx - mn || 1;
    var s = ind.dir === "low" ? ((mx - v) / span) * 100 : ((v - mn) / span) * 100;
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  function statusOf(s) {
    if (s >= 75) return "PARMI LES PLUS DÉFAVORABLES";
    if (s >= 50) return "DÉFAVORABLE";
    if (s >= 25) return "INTERMÉDIAIRE";
    return "PARMI LES MEILLEURS";
  }

  function heatCfg() {
    var inds = N.HEAT_INDICATORS, code = focusCode();
    var rows = N.COUNTRIES.map(function (c) {
      return {
        code: c.code, name: c.name, flag: c.flag,
        cells: inds.map(function (ind) {
          var v = c.ncd[ind.key], s = sev(ind, v);
          return { text: fr(v) + "%", score: s, status: statusOf(s) };
        }),
      };
    });
    /* rang régional par colonne : 1 = situation la plus défavorable */
    inds.forEach(function (ind, j) {
      rows.slice()
        .sort(function (a, b) { return b.cells[j].score - a.cells[j].score; })
        .forEach(function (r, k) { r.cells[j].rank = k + 1; });
    });
    if (heatSort) {
      rows.sort(function (a, b) { return (a.cells[heatSort.j].score - b.cells[heatSort.j].score) * heatSort.dir; });
    }
    if (code) rows = rows.filter(function (r) { return r.code === code; });
    return {
      indicators: inds,
      total: N.COUNTRIES.length,
      regional: inds.map(function (ind) { var v = R[ind.key]; return { text: fr(v) + "%", score: sev(ind, v) }; }),
      rows: rows,
    };
  }

  /* ================================================================ RENDU */
  function renderKpis() {
    var c = focusCountry(), n = c ? c.ncd : R;

    html("#wsvM1Val", bigVal(n.obesity));
    html("#wsvM1Sub", "Femmes " + pct(n.obesityF) + " · hommes " + pct(n.obesityM));
    html("#wsvM1Badge", "↑ ×" + fr(n.obesityX) + " depuis 2000");

    var nc = Math.round((100 - n.htaCtl) / 10);
    html("#wsvM2Val", bigVal(n.hta));
    html("#wsvM2Sub", "Contrôlée chez " + pct(n.htaCtl) + " des hypertendus");
    html("#wsvM2Badge", nc + " hypertendus sur 10 non contrôlés");

    html("#wsvM3Val", bigVal(n.diab));
    html("#wsvM3Sub", "Femmes " + pct(n.diabF) + " · hommes " + pct(n.diabM));
    html("#wsvM3Badge", pct(100 - n.diabTx, 0) + " des diabétiques 30+ non traités");

    var d = Math.round((n.mort - n.mort2015) * 10) / 10;
    html("#wsvM4Val", bigVal(n.mort));
    html("#wsvM4Sub", "Risque de décès entre 30 et 70 ans (MCV, cancers, diabète, respiratoires)");
    var b4 = $("#wsvM4Badge");
    if (b4) {
      b4.textContent = (d <= 0 ? "↓ " : "↑ ") + signed(d) + (Math.abs(d) >= 2 ? " pts" : " pt") + " vs 2015";
      b4.className = "wsv-badge " + (d <= 0 ? "down" : "up");
    }
    html("#wsvM4Target", pct(n.mortTarget));

    var miniFmt = function (v) { return fr(v) + "%"; };
    var cfg1 = { rows: [{ label: "Femmes", value: n.obesityF, color: COL.f }, { label: "Hommes", value: n.obesityM, color: COL.m }], max: 40, color: COL.f, fmt: miniFmt, labelW: 54, valueW: 38 };
    var cfg2 = {
      rows: [
        { label: "Diagnostic", value: n.htaDx, color: "#FF6B35" },
        { label: "Traitement", value: n.htaTx, color: "#F59E0B" },
        { label: "Contrôle", value: n.htaCtl, color: "#10B981" },
      ],
      max: 100, color: COL.danger, fmt: miniFmt, labelW: 64, valueW: 38,
    };
    var cfg3 = { segments: [{ value: n.diabTx, color: COL.ok }, { value: 100 - n.diabTx, color: "#FCA5A5" }], center: fr(n.diabTx, 0) + "%", thickness: 6 };
    var cfg4 = { value: n.mort, max: 30, color: COL.all, threshold: n.mortTarget };

    if (!kpis.m1) {
      kpis.m1 = CH.miniBars($("#wsvM1Mini"), cfg1);
      kpis.m2 = CH.miniBars($("#wsvM2Mini"), cfg2);
      kpis.m3 = CH.donutMini($("#wsvM3Mini"), cfg3);
      kpis.m4 = CH.arcGauge($("#wsvM4Mini"), cfg4);
    } else {
      kpis.m1.update(cfg1);
      kpis.m2.update(cfg2);
      kpis.m3.update(cfg3);
      kpis.m4.update(cfg4);
    }
  }

  function renderTexts() {
    var c = focusCountry(), n = c ? c.ncd : R;
    html("#wsvMntLead", lead(c));
    html("#wsvMntScope", c ? esc(c.name) + " · " + esc(c.subregion) : "Vue régionale · 16 pays");

    html("#wsvMnt1Foot", c
      ? esc(c.name) + " : femmes " + pct(n.obesityF) + " · hommes " + pct(n.obesityM) + " · écart ×" + fr(n.obesityF / n.obesityM)
      : "Moyenne 16 pays : femmes " + pct(R.obesityF) + " · hommes " + pct(R.obesityM) + " · monde " + pct(G.obesity, 0) + " (2022)");

    html("#wsvMnt2Tag", "Contrôle " + pct(n.htaCtl) + " · cible ≥ " + T.htaCtl + " %");
    var worldNot = Math.round((100 - G.htaCtl) / 10);
    html("#wsvMnt2Call", c
      ? "<b>" + esc(c.name) + " : " + pct(100 - n.htaCtl, 0) + " des hypertendus</b> ne sont pas contrôlés — seuls " + pct(n.htaDx) +
        " sont diagnostiqués (moyenne 16 pays : " + pct(R.htaDx) + " · monde : " + pct(G.htaDx, 0) + ")."
      : "<b>" + Math.round((100 - n.htaCtl) / 10) + " hypertendus sur 10</b> ne sont pas contrôlés en Afrique de l'Ouest (monde : " + worldNot + " sur 10). " +
        "<em>" + esc(T.htaImpact) + ".</em>");
    html("#wsvMnt2Legend",
      '<span><i style="background:' + COL.ink + '"></i>Moyenne mondiale OMS</span>' +
      (c ? '<span><i style="background:#0066CC"></i>Moyenne 16 pays</span>' : "") +
      '<span><i style="background:#047857"></i>Cible : pays performants ≥ ' + T.htaCtl + " %</span>");

    html("#wsvMnt3Tag", c
      ? esc(c.name) + " : " + pct(n.diab) + " · traités " + pct(n.diabTx)
      : pct(100 - R.diabTx, 0) + " des diabétiques 30+ sans traitement");

    html("#wsvMnt4Scope", c ? esc(c.name) : "moyenne des 16 pays");
    html("#wsvMnt4Tag", "×" + fr(n.obesityX) + " depuis 2000");
  }

  function refresh() {
    if (!mounted) return;
    renderKpis();
    renderTexts();
    charts.m1.update(dumbCfg());
    charts.m2.update(cascadeCfg());
    charts.m3.update(diabCfg());
    charts.m4.update(trendCfg());
    charts.m5.update(heatCfg());
  }

  /* ============================================================== MONTAGE */
  function addNavEntry(ui) {
    var nav = root.querySelector("#wsvNav");
    if (!nav || nav.querySelector('[data-target="gmnt"]')) return;
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-target", "gmnt");
    b.innerHTML = ICON.heart + "<span>Maladies chroniques</span><em class=\"wsv-nav-new\">MNT</em>";
    var before = nav.querySelector('[data-target="g15"]');
    nav.insertBefore(b, before || null);
  }

  function wireHeatSort() {
    var hc = $("#wsvMnt5");
    if (!hc) return;
    hc.style.cursor = "pointer";
    hc.addEventListener("click", function (ev) {
      var r = hc.getBoundingClientRect();
      if (ev.clientY - r.top > 34) return; /* en-têtes uniquement */
      var inds = N.HEAT_INDICATORS, L = 128, Rm = 8;
      var cw = (hc.clientWidth - L - Rm) / inds.length;
      var j = Math.floor((ev.clientX - r.left - L) / cw);
      if (j < 0 || j >= inds.length) return;
      heatSort = heatSort && heatSort.j === j ? { j: j, dir: -heatSort.dir } : { j: j, dir: -1 };
      charts.m5.update(heatCfg());
      html("#wsvMnt5Sort", "Tri : " + esc(inds[j].label) + (heatSort.dir === -1 ? " ▼" : " ▲"));
    });
  }

  function mount() {
    if (mounted) return;
    var api = window.WHOSurv;
    var grid = root.querySelector(".wsv-grid");
    if (!api || !api.ui || !grid) return;
    mounted = true;

    var anchor = root.querySelector("#g15");
    if (anchor && anchor.parentNode === grid) anchor.insertAdjacentHTML("beforebegin", markup(api.ui));
    else grid.insertAdjacentHTML("beforeend", markup(api.ui));
    addNavEntry(api.ui);

    renderTexts();
    renderKpis();
    charts.m1 = CH.dumbbell($("#wsvMnt1"), dumbCfg());
    charts.m2 = CH.cascade($("#wsvMnt2"), cascadeCfg());
    charts.m3 = CH.scatter($("#wsvMnt3"), diabCfg());
    charts.m4 = CH.multiLine($("#wsvMnt4"), trendCfg());
    charts.m5 = CH.heatmap($("#wsvMnt5"), heatCfg());
    wireHeatSort();
    root.setAttribute("data-wsv-ncd", "1");
  }

  root.addEventListener("wsv:ready", mount);
  root.addEventListener("wsv:filter", refresh);
  /* si le tableau de bord est déjà construit (chargement tardif du script) */
  if (root.getAttribute("data-wsv-init") === "1") mount();

  window.WHONcd = { refresh: refresh, isMounted: function () { return mounted; } };
})();
