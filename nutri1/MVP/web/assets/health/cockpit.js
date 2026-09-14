/* Health-only UI: Agriculture-matched UI, one native dialog and scoped events.
 * Window capture precedes the legacy document delegates; nothing outside #health
 * is stopped, restyled, closed or otherwise modified. */
(function () {
  "use strict";
  const root = document.getElementById("health"),
    shell = document.getElementById("hcShell"),
    M = window.NutriHealthModel;
  if (!root || !shell || !M) return;
  const $ = (s) => shell.querySelector(s),
    $$ = (s) => [...shell.querySelectorAll(s)];
  const C = {
    programme: "#c3f277",
    baseline: "#78b9ff",
    teal: "#53d9bd",
    amber: "#ffc477",
    rose: "#ff9094",
    muted: "#a7c2c0",
  };
  const state = { ...M.defaults };
  let svgSerial = 0;
  let chartSurface = "main",
    returnFocus = null,
    previousOverflow = "";
  let locale = "fr",
    tab = "overview",
    preset = "national",
    region = 0,
    sim,
    frame,
    runTimer,
    runStep = 0,
    tourTimer,
    tourIndex = 0;
  const t = (fr, en) => (locale === "fr" ? fr : en);
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const n = (v, decimals = 0) =>
    Number(v).toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
  const money = (v) => `${n(v / 1e6, 2)} M$`;
  const pct = (v) => n(v, 1) + " %";
  const country = () =>
    document
      .getElementById("country")
      ?.selectedOptions?.[0]?.textContent?.trim() || "Togo";
  const tabDefs = () => [
    ["overview", t("Vue d’ensemble", "Overview")],
    ["population", t("Populations", "Populations")],
    ["care", t("Parcours de soins", "Care pathways")],
    ["investment", t("Investissement", "Investment")],
    ["resilience", t("Résilience", "Resilience")],
    ["territories", t("Géospatial", "Geospatial")],
    ["method", t("Audit & méthode", "Audit & method")],
  ];
  const presetDefs = () => [
    ["reference", t("Statu quo", "Status quo")],
    ["national", t("Plan national", "National plan")],
    ["prevention", t("Prévention +", "Prevention +")],
    ["maternal", t("Mère & enfant", "Mother & child")],
    ["crisis", t("Stress-test", "Stress test")],
  ];
  const allocations = () => [
    t("Dépistage", "Screening"),
    t("Suivi clinique", "Clinical follow-up"),
    t("Nutrition", "Nutrition"),
    t("Santé maternelle", "Maternal health"),
    t("Socle numérique & terrain", "Digital & field capacity"),
  ];
  const colors = [C.programme, C.teal, C.baseline, C.amber, C.rose];
  const levers = () => [
    [
      "budget",
      t("Budget annuel plafond", "Annual budget ceiling"),
      t(
        "Un financement limité réduit le déploiement.",
        "Limited funding reduces deployment.",
      ),
      0,
      30,
      0.5,
      " M$",
    ],
    [
      "screening",
      t("Couverture du dépistage", "Screening coverage"),
      t(
        "Part des adultes ciblés chaque année.",
        "Share of adults targeted each year.",
      ),
      0,
      100,
      5,
      " %",
    ],
    [
      "followup",
      t("Adhésion au suivi", "Follow-up adherence"),
      t(
        "Continuité du parcours après dépistage.",
        "Continuity of care after screening.",
      ),
      0,
      100,
      5,
      " %",
    ],
    [
      "nutrition",
      t("Prévention nutritionnelle", "Nutrition prevention"),
      t(
        "Accompagnement des cohortes prioritaires.",
        "Support for priority cohorts.",
      ),
      0,
      100,
      5,
      " %",
    ],
    [
      "maternal",
      t("Programme mère & enfant", "Mother & child programme"),
      t(
        "Intensité de la prise en charge maternelle.",
        "Intensity of maternal support.",
      ),
      0,
      100,
      5,
      " %",
    ],
    [
      "capacity",
      t("Capacité numérique & terrain", "Digital & field capacity"),
      t(
        "Capacité opérationnelle de NUTRI.N°1.",
        "NUTRI.N°1 operational capacity.",
      ),
      0,
      100,
      5,
      " %",
    ],
  ];
  function control(k, label, hint, min, max, step, unit) {
    return `<div class="hg-lever"><label for="hc-${k}"><span class="hg-lever-top"><b>${label}</b><output id="hc-out-${k}" for="hc-${k}">${n(state[k], step < 1 ? 1 : 0)}${unit}</output></span><small id="hc-hint-${k}">${hint}</small></label><input class="hg-range" id="hc-${k}" data-hc-lever="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${state[k]}" aria-describedby="hc-hint-${k}" style="--hg-fill:${((state[k] - min) / (max - min)) * 100}%"></div>`;
  }
  function build() {
    closeCockpit(false);
    shell.lang = locale;
    shell.className = "hc-shell hg-shell";
    shell.innerHTML = `
    <div class="hg-hero"><div class="hg-hero-top"><div>
      <span class="hg-kicker"><i></i>${t("SIMULATION D’INVESTISSEMENT EN SANTÉ • DÉMONSTRATION", "HEALTH INVESTMENT SIMULATION • DEMO")}</span>
      <h2>${t("🏥 Cockpit d’investissement Santé & Prévention", "🏥 Health & Prevention Investment Cockpit")}<br><b>${t("De l’intelligence nutritionnelle à la décision de santé publique", "From nutrition intelligence to public-health investment decisions")}</b></h2>
      <div class="hg-hero-live"><b>${t("INTELLIGENCE SANTÉ", "HEALTH INTELLIGENCE")} &nbsp; ${t("MODÈLE LOCAL", "LOCAL MODEL")}</b><span>${t("Données fictives · aucun flux clinique connecté", "Synthetic data · no clinical feeds connected")}</span></div>
      <p>${t("Un moteur déterministe réconcilie dépistage, nutrition, santé maternelle, capacité de soins et pression sanitaire dans un seul dossier d’investissement : budget, valeur actuelle nette, couverture et impact sanitaire — scénario par scénario, levier par levier.", "One deterministic engine reconciles screening, nutrition, maternal health, care capacity and system pressure into a single investment case: budget, net present value, coverage and health impact — scenario by scenario, lever by lever.")}</p>
      <div class="hg-chips"><span class="hg-chip lime">● ${t("Modèle simulé", "Simulated model")}</span><span class="hg-chip" id="hc-country"></span><span class="hg-chip" id="hc-cohort"></span><span class="hg-chip blue">NUTRI.HEALTH v1.0 • ${t("moteur déterministe", "deterministic engine")}</span><span class="hg-chip lime">✓ ${t("Une seule surface de simulation — aucune superposition", "One simulation surface — no stacked panels")}</span></div>
    </div><div class="hg-hero-actions">
      <button type="button" class="hg-btn primary" data-hc-action="run">⚡ ${t("Lancer la simulation", "Run the simulation")}</button>
      <button type="button" class="hg-btn" data-hc-action="cockpit">🏛 ${t("Ouvrir le cockpit", "Open investment cockpit")}</button>
      <button type="button" class="hg-btn ghost" data-hc-action="export">⇩ ${t("Exporter le modèle", "Export model")}</button>
      <button type="button" class="hg-btn ghost" data-hc-action="reset">↻ ${t("Réinitialiser", "Reset levers")}</button>

    </div></div><div class="hg-hero-stats" id="hc-hero-stats"></div></div>
    <div class="hg-kpis" id="hc-kpis"></div>
    <div class="hg-deck"><div class="hg-deck-head"><div><h3>🎛 ${t("Leviers d’investissement — concevez le programme national", "Investment levers — design the national programme")}</h3><p>${t("Chaque levier est chiffré, déployé et traduit en couverture, prévention, soins et flux financiers. Modifiez un levier : tout le modèle se recalcule.", "Every lever is priced, deployed and translated into coverage, prevention, care and cash flows. Move a lever: the whole model recomputes.")}</p></div><div class="hg-presets">${presetDefs()
      .map(
        ([key, label]) =>
          `<button type="button" class="hg-preset hc-preset ${preset === key ? "on" : ""}" data-hc-preset="${key}" aria-pressed="${preset === key}">${label}</button>`,
      )
      .join("")}</div></div>
    <div class="hg-levers">${levers()
      .map((l) => control(...l))
      .join("")}</div>
    <div class="hg-deck-foot"><div class="hg-seg" aria-label="${t("Horizon du programme", "Programme horizon")}">${[3, 5, 10].map((y) => `<button type="button" data-hc-horizon="${y}" class="${state.horizon === y ? "on" : ""}" aria-pressed="${state.horizon === y}">${y} ${t("ans", "yrs")}</button>`).join("")}</div><div class="hg-deck-readout" id="hc-readout"></div>
    <div class="hc-context"><label for="hc-population">${t("Cohorte fictive", "Synthetic cohort")}<select id="hc-population">${[100000, 500000, 1000000, 5000000, 10000000].map((p) => `<option value="${p}" ${state.population === p ? "selected" : ""}>${n(p)}</option>`).join("")}</select></label>${control("shock", t("Pression sanitaire", "System pressure"), t("0 : nominal · 100 : choc maximal", "0: nominal · 100: maximum shock"), 0, 100, 5, " %")}<button type="button" class="hg-btn primary" data-hc-action="run">⚡ ${t("Lancer la simulation", "Run the simulation")}</button></div></div><div class="hc-budget-note" id="hc-budget-note"></div></div>
    <div class="hg-pipe">${[
      [
        t("Cohortes & données", "Cohorts & evidence"),
        t(
          "population • hypothèses • coûts",
          "population • assumptions • costs",
        ),
      ],
      [
        t("Dépistage & suivi", "Screening & follow-up"),
        t("leviers → parcours de soins", "levers → care pathway"),
      ],
      [
        t("Nutrition & maternité", "Nutrition & maternity"),
        t("enfants • mères • prévention", "children • mothers • prevention"),
      ],
      [
        t("Capacité & pression", "Capacity & pressure"),
        t(
          "financement • terrain • résilience",
          "funding • field capacity • resilience",
        ),
      ],
      [
        t("Dossier d’investissement", "Investment case"),
        t("coûts • VAN • bénéfice / coût", "costs • NPV • benefit / cost"),
      ],
      [
        t("Dossier de décision", "Decision package"),
        t("priorités • suivi • exports", "priorities • monitoring • exports"),
      ],
    ]
      .map(
        ([label, sub], i) =>
          `<div class="hg-step hc-step" data-hc-step="${i}"><i>${i + 1}</i><b>${label}</b><small>${sub}</small></div>`,
      )
      .join("")}</div>
    <div class="hg-note-ok"><b>✓</b><span>${t("Surface unifiée : les anciens panneaux de cette section sont remplacés par un cockpit unique. Données fictives ; hypothèses auditables avant toute décision.", "Unified surface: legacy panels in this section are replaced by one cockpit. Synthetic data; auditable assumptions before any decision.")}</span></div>
    <div class="hc-dashboard" id="hc-dashboard"></div><div class="hc-status" id="hc-status" role="status" aria-live="polite"></div>
    <footer class="hc-footer"><span>NUTRI.N°1 • HEALTH INVESTMENT INTELLIGENCE</span><label><select id="hc-language" data-v49="1" aria-label="${t("Langue du cockpit", "Cockpit language")}"><option value="fr" ${locale === "fr" ? "selected" : ""}>FR</option><option value="en" ${locale === "en" ? "selected" : ""}>EN</option></select></label><span>${t("Simulation illustrative • aucune prévision officielle ni promesse de rendement", "Illustrative simulation • not an official forecast or promise of returns")}</span></footer>
    <dialog id="healthCockpit" aria-labelledby="hc-dialog-title" aria-describedby="hc-dialog-sub"><div class="hgc-window"><div class="hgc-head"><div><span class="hg-kicker"><i></i>${t("SIMULATION D’INVESTISSEMENT EN SANTÉ", "HEALTH INVESTMENT SIMULATION")}</span><h2 id="hc-dialog-title">${t("Cockpit d’investissement Santé & Prévention", "Health & Prevention Investment Cockpit")}</h2><p id="hc-dialog-sub">${t("Une seule surface, plusieurs dimensions — le dossier national de prévention", "One surface, multiple dimensions — the national prevention investment case")}</p></div><div class="hgc-actions"><button type="button" class="hgc-btn" data-hc-action="tour" id="hc-tour">▶ ${t("Présentation", "Presentation")}</button><button type="button" class="hgc-btn" data-hc-action="export">⇩ ${t("Exporter CSV", "Export CSV")}</button><button type="button" class="hgc-btn x" data-hc-action="close" aria-label="${t("Fermer le cockpit", "Close cockpit")}">✕</button></div></div>
    <div class="hgc-deck" role="tablist" aria-label="${t("Dimensions du cockpit", "Cockpit layers")}">${tabDefs()
      .map(
        ([id, label]) =>
          `<button type="button" class="hgc-layer-tab hc-tab ${tab === id ? "on" : ""}" role="tab" id="hc-tab-${id}" data-hc-tab="${id}" aria-selected="${tab === id}" aria-controls="hc-pane" tabindex="${tab === id ? 0 : -1}">${label}</button>`,
      )
      .join("")}</div>
    <div class="hgc-body" id="hc-cockpit-body"><div id="hc-pane" class="hgc-pane on" role="tabpanel" tabindex="0" aria-labelledby="hc-tab-${tab}"></div></div><div class="hgc-foot"><span class="hgc-status"><i></i><span id="hc-dialog-status">${t("Modèle à jour", "Model up to date")}</span></span><span class="hgc-progress"><i id="hc-progress"></i></span><span id="hc-dialog-meta"></span></div></div></dialog>`;
    $("#healthCockpit").addEventListener("cancel", (e) => {
      e.preventDefault();
      closeCockpit();
    });
    render();
  }
  function legend(series) {
    return `<div class="hc-legend">${series.map((s) => `<span><i style="--color:${s.color}"></i>${s.dash ? "┄ " : ""}${esc(s.name)}</span>`).join("")}</div>`;
  }
  function svg(title, body, w = 640, h = 290) {
    return `<div class="hc-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg></div>`;
  }
  function table(headers, rows) {
    return `<div class="hc-table-wrap" tabindex="0" role="region" aria-label="${t("Données détaillées", "Detailed data")}"><table class="${chartSurface === "modal" ? "hgc-table" : "hg-table"}"><thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => (i === 0 ? `<th scope="row">${esc(v)}</th>` : `<td>${esc(v)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function dataDetails(headers, rows) {
    return `<details><summary class="hc-data-toggle">${t("Valeurs & version accessible", "Values & accessible version")}</summary>${table(headers, rows)}</details>`;
  }
  function card(id, kicker, title, sub, body, note, open) {
    const modal = chartSurface === "modal";
    return `<article class="${modal ? "hgc-card" : "hg-card"} hc-chart-card" id="hc-card-${modal ? "modal-" : ""}${id}"><div class="hg-card-head"><div><div class="hg-card-kicker">${kicker}</div><h3>${title}</h3>${sub ? `<p class="hg-card-sub">${sub}</p>` : ""}</div>${open ? `<button type="button" class="hg-open" data-hc-open="${open}" aria-label="${esc(t("Ouvrir dans le cockpit : ", "Open in cockpit: ") + title)}">⤢</button>` : ""}</div>${body}${note ? `<div class="hc-chart-note">${note}</div>` : ""}</article>`;
  }
  function line(title, labels, series, unit) {
    const w = 640,
      h = 290,
      left = 52,
      right = 30,
      top = 24,
      bottom = 48;
    const values = series.flatMap((s) => s.values),
      max = Math.max(1, ...values) * 1.16,
      min = Math.min(0, ...values) * 1.15;
    const x = (i) => left + (i * (w - left - right)) / (labels.length - 1 || 1),
      y = (v) => h - bottom - ((v - min) / (max - min)) * (h - top - bottom);
    let body = "";
    for (let i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4,
        yy = y(v);
      body += `<line x1="${left}" x2="${w - right}" y1="${yy}" y2="${yy}" stroke="var(--hc-grid)"/><text x="${left - 9}" y="${yy + 4}" text-anchor="end">${n(v, Math.abs(max - min) < 10 ? 1 : 0)}</text>`;
    }
    if (min < 0)
      body += `<line x1="${left}" x2="${w - right}" y1="${y(0)}" y2="${y(0)}" stroke="var(--hc-zero)" stroke-dasharray="4 4"/>`;
    labels.forEach((label, i) => {
      if (labels.length <= 7 || i % 2 === 0 || i === labels.length - 1)
        body += `<text x="${x(i)}" y="${h - 21}" text-anchor="middle">${esc(label)}</text>`;
    });
    series.forEach((s, si) => {
      const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      if (si === series.length - 1) {
        const gradient = "hc-area-" + ++svgSerial;
        body += `<defs><linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".45"/><stop offset="1" stop-color="${s.color}" stop-opacity=".025"/></linearGradient></defs><polygon points="${x(0)},${y(0)} ${points} ${x(labels.length - 1)},${y(0)}" fill="url(#${gradient})"/>`;
      }
      body += `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="7 5"' : ""}/>`;
      s.values.forEach((v, i) => {
        body += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${s.color}" stroke="var(--hc-panel)" stroke-width="1.5"><title>${esc(s.name)} · ${labels[i]} : ${n(v, 2)} ${esc(unit)}</title></circle>`;
      });
    });
    return (
      svg(title + " — " + unit, body) +
      legend(series) +
      dataDetails(
        [t("Année", "Year"), ...series.map((s) => s.name + " (" + unit + ")")],
        labels.map((v, i) => [v, ...series.map((s) => n(s.values[i], 2))]),
      )
    );
  }
  function bars(title, labels, series, unit, maxValue) {
    const max =
      maxValue || Math.max(1, ...series.flatMap((s) => s.values)) * 1.12;
    const chart = `<div class="hc-bars" role="img" aria-label="${esc(title + " — " + unit)}"><div class="hc-bar-scale"><span>0</span><span>${n(max / 2, 1)}</span><span>${n(max, 1)} ${esc(unit)}</span></div>${labels.map((label, i) => `<div class="hc-bar-group"><div class="hc-bar-label">${esc(label)}</div>${series.map((s) => `<div class="hc-bar-row"><div class="hc-bar-track"><div class="hc-bar-fill ${s.dash ? "hc-reference" : ""}" style="width:${(s.values[i] / max) * 100}%;--bar-color:${s.color}"></div></div><b>${n(s.values[i], 1)}</b></div>`).join("")}</div>`).join("")}</div>`;
    return (
      chart +
      legend(series) +
      dataDetails(
        [
          t("Indicateur", "Indicator"),
          ...series.map((s) => s.name + " (" + unit + ")"),
        ],
        labels.map((label, i) => [
          label,
          ...series.map((s) => n(s.values[i], 2)),
        ]),
      )
    );
  }
  function allocationChart() {
    const total = sim.allocations.reduce((a, b) => a + b, 0),
      r = 71,
      circ = 2 * Math.PI * r;
    let offset = 0;
    let body = `<circle cx="110" cy="110" r="${r}" fill="none" stroke="var(--hc-grid)" stroke-width="23"/>`;
    sim.allocations.forEach((v, i) => {
      const len = total ? (v / total) * circ : 0;
      body += `<circle cx="110" cy="110" r="${r}" fill="none" stroke="${colors[i]}" stroke-width="23" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"><title>${esc(allocations()[i])}: ${money(v)}</title></circle>`;
      offset += len;
    });
    body += `<text x="110" y="108" text-anchor="middle" class="hc-value-label" style="font-size:30px">${n(total / 1e6, 2)}</text><text x="110" y="131" text-anchor="middle" style="font-size:13px">M$ / ${t("an", "yr")}</text>`;
    return (
      `<div class="hc-allocation">${svg(t("Répartition du budget déployé", "Deployed budget allocation"), body, 220, 220)}<div class="hc-allocation-key">${allocations()
        .map(
          (label, i) =>
            `<div><i style="background:${colors[i]}"></i><span>${esc(label)}</span><b>${total ? n((sim.allocations[i] / total) * 100) : "0"} %</b></div>`,
        )
        .join("")}</div></div>` +
      dataDetails(
        [
          t("Programme", "Programme"),
          t("Coût annuel à maturité (USD)", "Mature annual cost (USD)"),
        ],
        allocations().map((a, i) => [a, n(sim.allocations[i])]),
      )
    );
  }
  function columns(title, labels, series, unit, maxValue) {
    const w = 640,
      h = 320,
      left = 48,
      right = 20,
      top = 20,
      bottom = 55,
      max = maxValue || Math.max(1, ...series.flatMap((s) => s.values)) * 1.15,
      plotH = h - top - bottom,
      groupW = (w - left - right) / labels.length,
      barW = Math.min(40, groupW / (series.length + 1));
    const y = (v) => h - bottom - (v / max) * plotH;
    let body = "";
    for (let i = 0; i <= 4; i++) {
      const v = (max * i) / 4;
      body += `<line x1="${left}" x2="${w - right}" y1="${y(v)}" y2="${y(v)}" stroke="var(--hc-grid)"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end">${n(v)}${unit === "%" ? " %" : ""}</text>`;
    }
    labels.forEach((label, i) => {
      const center = left + groupW * (i + 0.5);
      series.forEach((s, j) => {
        const value = s.values[i],
          x = center - (series.length * barW) / 2 + j * barW;
        body += `<rect x="${x}" y="${y(value)}" width="${barW - 3}" height="${(value / max) * plotH}" rx="4" fill="${s.color}" opacity="${s.dash ? 0.65 : 1}"><title>${esc(label)} · ${esc(s.name)} : ${n(value, 1)} ${unit}</title></rect><text class="hc-value-label" x="${x + (barW - 3) / 2}" y="${y(value) - 7}" text-anchor="middle" style="font-size:12px">${n(value, 1)}</text>`;
      });
      body += `<text x="${center}" y="${h - 29}" text-anchor="middle" style="font-size:13px">${esc(label)}</text>`;
    });
    return (
      svg(title + " — " + unit, body, w, h) +
      legend(series) +
      dataDetails(
        [
          t("Indicateur", "Indicator"),
          ...series.map((s) => s.name + " (" + unit + ")"),
        ],
        labels.map((label, i) => [
          label,
          ...series.map((s) => n(s.values[i], 2)),
        ]),
      )
    );
  }
  function childrenCard() {
    return card(
      "children",
      t("NUTRITION INFANTILE", "CHILD NUTRITION"),
      t("Enfants : le double fardeau", "Children: the double burden"),
      t(
        "Prévalence fictive dans les cohortes concernées (%)",
        "Synthetic prevalence in the relevant cohorts (%)",
      ),
      columns(
        "Children",
        [
          t("Retard de croissance", "Stunting"),
          t("Émaciation", "Wasting"),
          t("Surpoids", "Overweight"),
        ],
        [
          {
            name: t("Référence", "Baseline"),
            color: C.baseline,
            values: sim.childrenBase,
            dash: true,
          },
          {
            name: t("Programme", "Programme"),
            color: C.programme,
            values: sim.children,
          },
        ],
        "%",
        40,
      ),
      t(
        "Indicateurs distincts, non additionnables. Effet nutritionnel supposé, non validé.",
        "Separate, non-additive indicators. Assumed nutrition effect, not validated.",
      ),
      "population",
    );
  }
  function womenCard() {
    return card(
      "women",
      t("SANTÉ MATERNELLE", "MATERNAL HEALTH"),
      t("Protéger les mères, plus tôt", "Protect mothers, earlier"),
      t(
        "Prévalence fictive par groupe (%) · année finale",
        "Synthetic prevalence by group (%) · final year",
      ),
      bars(
        "Maternal",
        [
          t("Anémie · grossesse", "Anaemia · pregnancy"),
          t("Anémie · allaitement", "Anaemia · lactation"),
          t("Insuffisance pondérale", "Underweight"),
        ],
        [
          {
            name: t("Référence", "Baseline"),
            color: C.baseline,
            values: sim.womenBase,
            dash: true,
          },
          {
            name: t("Programme", "Programme"),
            color: C.teal,
            values: sim.women,
          },
        ],
        "%",
        50,
      ),
      t(
        "Groupes distincts. Les gains maternels ne sont pas monétisés dans le bilan.",
        "Distinct groups. Maternal gains are not monetised in the financial case.",
      ),
      "population",
    );
  }
  function trajectoryCard() {
    return card(
      "trajectory",
      t("TRAJECTOIRE SANITAIRE", "HEALTH TRAJECTORY"),
      t("Infléchir la courbe des MNT", "Bend the NCD curve"),
      t(
        "Événements annuels / 1 000 adultes · référence vs programme",
        "Annual events / 1,000 adults · baseline vs programme",
      ),
      line(
        "NCD trajectory",
        sim.annual.map((r) => r.year),
        [
          {
            name: t(
              "Statu quo sous même pression",
              "Status quo under same pressure",
            ),
            color: C.baseline,
            values: sim.annual.map((r) => r.baseline),
            dash: true,
          },
          {
            name: "NUTRI.N°1",
            color: C.programme,
            values: sim.annual.map((r) => r.programme),
          },
        ],
        t("événements / 1 000", "events / 1,000"),
      ),
      t(
        "Montée en charge sur 3 ans. Les événements ne représentent pas des personnes uniques.",
        "Three-year ramp-up. Events do not represent unique people.",
      ),
      "population",
    );
  }
  function allocationCard() {
    return card(
      "allocation",
      t("RESSOURCES", "RESOURCES"),
      t("Chaque dollar, une mission", "Every dollar, a purpose"),
      t(
        "Dépense annuelle à plein déploiement · USD",
        "Annual spend at full deployment · USD",
      ),
      allocationChart(),
      t(
        "La ventilation suit les leviers. Le plafond non consommé n’est pas une dépense.",
        "Allocation follows the levers. Unused budget is not treated as spending.",
      ),
      "investment",
    );
  }
  function financeCard() {
    return card(
      "finance",
      t("VALEUR PUBLIQUE", "PUBLIC VALUE"),
      t(
        "Le coût et la valeur de la prévention",
        "The cost and value of prevention",
      ),
      t(
        "Flux annuels nominaux · millions USD",
        "Annual nominal flows · million USD",
      ),
      line(
        "Financial trajectory",
        sim.annual.map((r) => r.year),
        [
          {
            name: t("Dépenses", "Costs"),
            color: C.amber,
            values: sim.annual.map((r) => r.cost / 1e6),
            dash: true,
          },
          {
            name: t("Coûts de soins évités", "Avoided care costs"),
            color: C.teal,
            values: sim.annual.map((r) => r.benefit / 1e6),
          },
        ],
        "M$",
      ),
      t(
        "Valeur sanitaire potentielle, pas un chiffre d’affaires ni un rendement investisseur.",
        "Potential health-system value, not revenue or investor return.",
      ),
      "investment",
    );
  }
  function cascadeCard() {
    return card(
      "cascade",
      t("CONTINUITÉ DES SOINS", "CONTINUITY OF CARE"),
      t(
        "Du dépistage au suivi effectif",
        "From screening to effective follow-up",
      ),
      t(
        "Adultes · parcours annuel à plein déploiement",
        "Adults · annual pathway at full deployment",
      ),
      bars(
        "Care cascade",
        [
          t("Dépistés", "Screened"),
          t("À risque (20 %)", "At risk (20%)"),
          t("Suivis", "Followed up"),
          t("Contrôlés (hypothèse)", "Controlled (assumed)"),
        ],
        [
          {
            name: t("Cohorte du programme", "Programme cohort"),
            color: C.teal,
            values: [
              sim.screened,
              sim.flagged,
              sim.followed,
              sim.controlled,
            ].map((v) => v / 1000),
          },
        ],
        t("milliers de personnes", "thousand people"),
      ),
      t(
        "Les étapes sont imbriquées : ne pas additionner les effectifs.",
        "Nested stages: do not add the counts together.",
      ),
      "population",
    );
  }
  function sensitivityCard() {
    const variants = [
      [-25, 0.75],
      [0, 1],
      [25, 1.25],
    ].map(([label, factor]) => ({
      label: (label > 0 ? "+" : "") + label + " %",
      npv: sim.pvBenefit * factor - sim.pvCost,
    }));
    const max =
        Math.max(1, ...variants.map((v) => Math.abs(v.npv / 1e6))) * 1.2,
      center = 350,
      scale = 205 / max;
    let body = `<line x1="${center}" x2="${center}" y1="8" y2="190" stroke="var(--hc-zero)"/><text x="${center}" y="216" text-anchor="middle">0 M$</text>`;
    variants.forEach((v, i) => {
      const y = 25 + i * 55,
        val = v.npv / 1e6,
        width = Math.abs(val) * scale;
      body += `<text x="0" y="${y + 16}">${esc(v.label)} ${t("bénéfices", "benefits")}</text><rect x="${val < 0 ? center - width : center}" y="${y}" width="${width}" height="23" rx="3" fill="${val < 0 ? C.amber : C.teal}"/><text class="hc-value-label" x="${val < 0 ? center + 10 : center - 10}" text-anchor="${val < 0 ? "start" : "end"}" y="${y + 16}">${n(val, 2)} M$</text>`;
    });
    return card(
      "sensitivity",
      t("ROBUSTESSE DU BILAN", "CASE ROBUSTNESS"),
      t(
        "Et si les bénéfices étaient plus faibles ?",
        "What if benefits were lower?",
      ),
      t(
        "VAN publique · bénéfices −25 %, centraux, +25 %",
        "Public NPV · −25%, central, +25% benefits",
      ),
      svg("NPV sensitivity", body, 640, 235) +
        dataDetails(
          [t("Scénario", "Scenario"), "VAN / NPV (USD)"],
          variants.map((v) => [v.label, n(v.npv)]),
        ),
      t(
        "Analyse de sensibilité, pas un intervalle de confiance statistique.",
        "Sensitivity analysis, not a statistical confidence interval.",
      ),
      "method",
    );
  }
  function summary() {
    return `<div class="hc-summary"><span class="hc-summary-icon">↗</span><div><h3>${t("Lecture pour le décideur", "Decision-maker brief")}</h3><p>${t(`Sur ${state.horizon} ans, le scénario projette ${n(sim.totalAvoided)} événements MNT évités pour ${money(sim.cost)} de dépenses. ${sim.npv < 0 ? "La valeur actualisée reste inférieure au coût : ajustez le ciblage et testez les hypothèses." : "Les bénéfices sanitaires monétisés dépassent les coûts dans ces hypothèses, à valider par un pilote."}`, `Over ${state.horizon} years, this scenario projects ${n(sim.totalAvoided)} avoided NCD events for ${money(sim.cost)} in spending. ${sim.npv < 0 ? "Discounted value remains below cost: adjust targeting and test assumptions." : "Monetised health benefits exceed costs under these assumptions; a pilot must validate them."}`)}</p></div></div>`;
  }
  function modules() {
    const items = [
      [
        "population",
        "🩸",
        t("Prévention MNT", "NCD prevention"),
        n(sim.totalAvoided),
        t("événements évités • cumul", "avoided events • cumulative"),
        sim.annual.map((r) => r.avoided),
      ],
      [
        "care",
        "📱",
        t("Dépistage & orientation", "Screening & referral"),
        n(sim.screened),
        t("adultes dépistés / an", "adults screened / year"),
        sim.annual.map((r) => sim.screened * r.ramp),
      ],
      [
        "care",
        "❤️",
        t("Suivi des personnes à risque", "At-risk follow-up"),
        n(sim.followed),
        t("adultes suivis / an", "adults followed up / year"),
        sim.annual.map((r) => sim.followed * r.ramp),
      ],
      [
        "population",
        "🧒",
        t("Nutrition infantile", "Child nutrition"),
        pct(sim.children[0]),
        t("retard de croissance fictif", "synthetic stunting prevalence"),
        sim.annual.map((r) => 24 - (24 - sim.children[0]) * r.ramp),
      ],
      [
        "population",
        "🤰",
        t("Nutrition maternelle", "Maternal nutrition"),
        pct(sim.women[0]),
        t("anémie de grossesse fictive", "synthetic pregnancy anaemia"),
        sim.annual.map((r) => 36 - (36 - sim.women[0]) * r.ramp),
      ],
      [
        "resilience",
        "🛡",
        t("Capacité des services", "Service capacity"),
        pct(sim.delivery * 100),
        t("capacité effective simulée", "simulated effective capacity"),
        sim.annual.map((r) => sim.delivery * r.ramp),
      ],
      [
        "territories",
        "🗺",
        t("Priorités territoriales", "Territorial priorities"),
        pct(sim.regions[0].coverage),
        t("couverture • territoire 01", "coverage • territory 01"),
        sim.annual.map((r) => sim.regions[0].coverage * r.ramp),
      ],
      [
        "investment",
        "📈",
        t("Évaluation de l’impact", "Impact evaluation"),
        money(sim.npv),
        t("valeur publique actualisée", "discounted public value"),
        sim.annual.map((r) => r.cumulative),
      ],
      [
        "method",
        "📦",
        t("Données & hypothèses", "Data & assumptions"),
        n(state.population),
        t("personnes de la cohorte fictive", "people in the synthetic cohort"),
        sim.annual.map(() => state.population),
      ],
    ];
    return `<div class="hg-modules">${items.map(([id, icon, title, value, sub, values]) => `<button type="button" class="hg-module" data-hc-open="${id}"><span class="hg-module-top"><b>${icon} ${title}</b><span class="hg-badge lime">${t("modèle", "model")}</span></span><p>${t("Ouvrir cette dimension du cockpit unique.", "Open this layer of the unified cockpit.")}</p><span class="hg-metric"><em>${value}</em></span><p>${sub}</p><span class="hg-spark">${spark(values)}</span></button>`).join("")}</div>`;
  }
  function territoryCard() {
    const r = sim.regions[region];
    return card(
      "territories",
      t("GÉOSPATIAL", "GEOSPATIAL"),
      t(
        "Carte de chaleur — priorités territoriales",
        "Regional priority heatmap",
      ),
      t(
        "6 territoires fictifs • risque initial et couverture simulée",
        "6 synthetic territories • baseline risk and simulated coverage",
      ),
      `<div class="hc-tiles">${sim.regions.map((v, i) => `<button type="button" class="hc-territory" data-hc-region="${i}" aria-pressed="${region === i}" style="--tile:${["#704531", "#654c2e", "#49623b", "#2c6744", "#1e5850", "#25494e"][i]}"><small>${t("TERRITOIRE", "TERRITORY")} 0${i + 1}</small><b>${n(v.risk, 1)}</b><small>${t("événements / 1 000", "events / 1,000")}</small><small>${t("Couverture", "Coverage")} : ${pct(v.coverage)}</small></button>`).join("")}</div><div class="hc-region-detail"><h3>${t("Territoire", "Territory")} 0${region + 1} • ${t("fiche d’arbitrage", "decision brief")}</h3><p>${t("Incidence fictive :", "Synthetic incidence:")} ${n(r.risk, 1)} → ${n(r.after, 1)} / 1 000</p><p>${t("Allocation annuelle indicative :", "Indicative annual allocation:")} ${money(r.allocation)} · ${t("Couverture :", "Coverage:")} ${pct(r.coverage)}</p></div>`,
      t(
        "Schéma analytique, pas une carte GIS. Territoires de poids égal ; allocations proportionnelles au risque fictif.",
        "Analytical schematic, not a GIS map. Equal-size territories; allocations proportional to synthetic risk.",
      ),
      "territories",
    );
  }
  function geo() {
    return `<div class="hgc-grid c2">${territoryCard()}${card("priorities", t("ALLOCATION CIBLÉE", "TARGETED ALLOCATION"), t("Financer selon le besoin", "Fund according to need"), t("Budget réparti au prorata du risque fictif", "Budget allocated in proportion to synthetic risk"), sim.regions.map((r, i) => `<div class="hc-priority"><i>0${i + 1}</i><div><strong>${t("Territoire", "Territory")} 0${i + 1}</strong><small>${t("Couverture", "Coverage")} ${pct(r.coverage)} · ${n(r.risk, 1)} / 1 000</small></div><b>${money(r.allocation)}</b></div>`).join(""), t("Les variations territoriales sont illustratives et ne recalculent pas le modèle national.", "Territorial variations are illustrative and do not recalculate the national model."))}</div>${summary()}`;
  }
  function method() {
    return `<div class="hc-method"><article><div class="hg-card-kicker">01 / ${t("STATUT DES DONNÉES", "DATA STATUS")}</div><h3>${t("Une démonstration transparente", "A transparent demonstration")}</h3><p>${t("Toutes les cohortes, prévalences, incidences et unités de coût sont fictives. Le pays affiché donne un contexte de présentation ; il ne change pas les hypothèses et ne constitue pas une estimation nationale.", "All cohorts, prevalences, incidence rates and unit costs are synthetic. The displayed country provides presentation context; it does not change assumptions or represent a national estimate.")}</p><ul><li>${t("Population adulte : 60 % de la cohorte. Incidence initiale : 28 événements MNT / 1 000 adultes / an ; tendance : +1,5 % / an.", "Adults: 60% of the cohort. Initial incidence: 28 NCD events / 1,000 adults / year; trend: +1.5% / year.")}</li><li>${t("Aucun raccordement à un registre patient, ministère, OMS ou flux temps réel.", "No patient registry, ministry, WHO or real-time feed is connected.")}</li><li>${t("Pas de diagnostic, de causalité démontrée ou d’impact clinique validé.", "No diagnosis, demonstrated causality or validated clinical impact.")}</li></ul></article>
    <article><div class="hg-card-kicker">02 / ${t("HYPOTHÈSES FINANCIÈRES", "FINANCIAL ASSUMPTIONS")}</div><h3>${t("Tester la valeur, pas la promettre", "Test value, do not promise it")}</h3><p>${t("Dépistage : 6 $/adulte ; suivi : 45 $/adulte à risque adhérent ; nutrition : 24 $ × 12 % de la cohorte ; maternité : 55 $ × 4 % ; infrastructure : 1,20 $/personne. Chaque coût est multiplié par son levier.", "Screening: $6/adult; follow-up: $45/adherent at-risk adult; nutrition: $24 × 12% of cohort; maternity: $55 × 4%; infrastructure: $1.20/person. Each cost is multiplied by its lever.")}</p>${control("discount", t("Taux d’actualisation", "Discount rate"), t("Appliqué aux coûts et aux bénéfices.", "Applied to both costs and benefits."), 0, 20, 1, " %")}${control("unitSaving", t("Coût évitable par événement", "Avoidable cost per event"), t("USD · hypothèse économique, non documentée cliniquement.", "USD · economic assumption, not clinically substantiated."), 0, 10000, 100, " $")}</article>
    <article><div class="hg-card-kicker">03 / ${t("MOTEUR REPRODUCTIBLE", "REPRODUCIBLE ENGINE")}</div><h3>${t("Du levier au résultat", "From lever to result")}</h3><p>${t("Financement = min(1, budget / besoin). Capacité = (0,4 + 0,6 × numérique) × (1 − 0,45 × pression). La pression augmente aussi l’incidence de référence de 25 % au maximum.", "Funding = min(1, budget / need). Capacity = (0.4 + 0.6 × digital) × (1 − 0.45 × pressure). Pressure also increases baseline incidence by up to 25%.")}</p><code>${t("Réduction MNT", "NCD reduction")} = min(45 %, (0,24 × screening × followup + 0,18 × nutrition) × funding × capacity)</code><p>${t("Leviers normalisés de 0 à 1. Déploiement : ⅓, ⅔, puis 100 %. Prévalence enfant réduite de (28 %, 34 %, 20 %) × nutrition × financement × capacité ; maternelle de (32 %, 28 %, 25 %) × maternité × financement × capacité.", "Levers normalised from 0 to 1. Ramp-up: ⅓, ⅔, then 100%. Child prevalence reduced by (28%, 34%, 20%) × nutrition × funding × capacity; maternal by (32%, 28%, 25%) × maternity × funding × capacity.")}</p><p>${t("Parcours : adultes × dépistage × financement × capacité ; 20 % à risque ; suivi × adhésion ; contrôle × (0,45 + 0,30 × nutrition). Aucun tirage aléatoire.", "Care pathway: adults × screening × funding × capacity; 20% at risk; follow-up × adherence; control × (0.45 + 0.30 × nutrition). No random sampling.")}</p></article>
    <article><div class="hg-card-kicker">04 / ${t("BILAN & LIMITES", "CASE & LIMITATIONS")}</div><h3>${t("Une valeur publique, pas un rendement privé", "Public value, not private return")}</h3><code>VAN / NPV = Σ (benefitₜ − costₜ) / (1 + discount)ᵗ − setup</code><p>${t("Installation initiale : 15 % du plafond annuel si un programme est demandé. Bénéfice = événements MNT évités × coût évitable. Ratio bénéfice/coût = bénéfices actualisés / coûts actualisés. Retour simple : première année où le solde nominal cumulé devient positif.", "Initial setup: 15% of annual ceiling when a programme is requested. Benefit = avoided NCD events × avoidable cost. Benefit-cost ratio = discounted benefits / discounted costs. Simple payback: first year with non-negative nominal cumulative balance.")}</p><p>${t("Les bénéfices maternels et infantiles ne sont pas monétisés pour éviter un double comptage. Aucune modélisation des décès, des DALY, des recettes privées ou de l’inflation. Le stress-test ±25 % n’est pas un intervalle statistique.", "Maternal and child benefits are not monetised to avoid double counting. No modelling of mortality, DALYs, private revenue or inflation. The ±25% stress test is not a statistical interval.")}</p></article></div>
    <div class="hc-summary"><span class="hc-summary-icon">▤</span><div><h3>${t("Prochaine étape : un pilote auditable", "Next step: an auditable pilot")}</h3><p>${t("Calibrer avec des données consenties et agrégées, documenter les coûts locaux, valider les effets avec des experts de santé publique et comparer les résultats à un groupe de référence.", "Calibrate with consented, aggregated data; document local costs; validate effects with public-health experts; and compare outcomes to a reference group.")}</p></div></div><div class="hc-actions"><button type="button" class="hgc-btn primary" data-hc-action="json">↓ ${t("Modèle & hypothèses · JSON", "Model & assumptions · JSON")}</button><button type="button" class="hgc-btn" data-hc-action="export">↓ ${t("Bilan & séries · CSV", "Case & time series · CSV")}</button></div>`;
  }
  function spark(values, color = C.programme) {
    const min = Math.min(0, ...values),
      max = Math.max(1, ...values),
      points = values
        .map(
          (v, i) =>
            `${(i * 150) / (values.length - 1 || 1)},${32 - ((v - min) / (max - min)) * 28}`,
        )
        .join(" "),
      id = "hc-spark-" + ++svgSerial;
    return `<svg class="hc-spark" viewBox="0 0 150 34" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".7"/><stop offset="1" stop-color="${color}" stop-opacity=".035"/></linearGradient></defs><polygon points="0,34 ${points} 150,34" fill="url(#${id})"/><polyline points="${points}" stroke="${color}" stroke-width="1.5" fill="none"/></svg>`;
  }
  function headlineMetrics() {
    return [
      [
        t("Budget du programme", "Programme budget"),
        money(state.budget * 1e6),
        t("plafond annuel • USD", "annual ceiling • USD"),
      ],
      [
        t("Valeur actuelle nette", "Net present value"),
        money(sim.npv),
        t("valeur publique actualisée à ", "public value discounted at ") +
          state.discount +
          " %",
      ],
      [
        t("Profil bénéfice / coût", "Benefit / cost profile"),
        sim.bcr === null ? "—" : n(sim.bcr, 2) + "×",
        t("Équilibre : ", "Payback: ") +
          (sim.payback || t("hors horizon", "outside horizon")),
      ],
      [
        t("Prévention / couverture", "Prevention / coverage"),
        n(sim.totalAvoided) + " / " + n(sim.screened / 1000, 1) + "k",
        t(
          "événements évités / adultes dépistés",
          "avoided events / adults screened",
        ),
      ],
    ];
  }
  function renderMetrics() {
    $("#hc-hero-stats").innerHTML = headlineMetrics()
      .map(
        ([label, value, sub], i) =>
          `<div class="hg-hero-stat ${i === 0 ? "good" : ""}"><small>${label}</small><b>${value}</b><span>${sub}</span></div>`,
      )
      .join("");
    const rows = [
      [
        t("Adultes dépistés", "Adults screened"),
        n(sim.screened),
        pct(state.screening),
        t("par an, à maturité", "per year, at maturity"),
        sim.annual.map((r) => sim.screened * r.ramp),
        "",
      ],
      [
        t("Couverture financée", "Funded coverage"),
        pct(sim.funding * 100),
        money(sim.demand),
        t("besoin annuel du programme", "annual programme need"),
        sim.annual.map((r) => sim.funding * r.ramp),
        "warn",
      ],
      [
        t("Événements MNT évités", "Avoided NCD events"),
        n(sim.totalAvoided),
        "−" + pct(sim.reduction * 100),
        t("cumul, non-personnes uniques", "cumulative, not unique people"),
        sim.annual.map((r) => r.avoided),
        "",
      ],
      [
        t("Soins évités • valeur", "Avoided care • value"),
        money(sim.benefit),
        state.horizon + " " + t("ans", "years"),
        t("bénéfices nominaux simulés", "simulated nominal benefits"),
        sim.annual.map((r) => r.benefit),
        "",
      ],
      [
        t("Dépenses du programme", "Programme spending"),
        money(sim.cost),
        money(sim.setup),
        t("dont installation initiale", "including initial setup"),
        sim.annual.map((r) => r.cost),
        "warn",
      ],
      [
        t("Valeur actuelle nette", "Net present value"),
        money(sim.npv),
        t("à ", "at ") + state.discount + " %",
        t("coûts et bénéfices actualisés", "discounted costs and benefits"),
        sim.annual.map((r) => r.cumulative),
        sim.npv < 0 ? "bad" : "",
      ],
      [
        t("Ratio bénéfice / coût", "Benefit / cost ratio"),
        sim.bcr === null ? "—" : n(sim.bcr, 2) + "×",
        t("seuil : 1×", "threshold: 1×"),
        t("pas un rendement privé", "not a private return"),
        sim.annual.map((r, i) => (i && r.cost ? r.benefit / r.cost : 0)),
        sim.bcr < 1 ? "warn" : "",
      ],
      [
        t("Année d’équilibre", "Payback year"),
        sim.payback || "—",
        t("solde nominal cumulé", "nominal cumulative balance"),
        t("sur l’horizon choisi", "within selected horizon"),
        sim.annual.map((r) => r.cumulative),
        "",
      ],
      [
        t("Adultes suivis", "Adults followed up"),
        n(sim.followed),
        pct(state.followup),
        t("adhésion après dépistage", "adherence after screening"),
        sim.annual.map((r) => sim.followed * r.ramp),
        "",
      ],
      [
        t("Anémie • grossesse", "Anaemia • pregnancy"),
        pct(sim.women[0]),
        "−" + n(sim.womenBase[0] - sim.women[0], 1) + " pts",
        t("prévalence fictive finale", "final synthetic prevalence"),
        sim.annual.map(
          (r) => sim.womenBase[0] - (sim.womenBase[0] - sim.women[0]) * r.ramp,
        ),
        "info",
      ],
      [
        t("Retard de croissance", "Child stunting"),
        pct(sim.children[0]),
        "−" + n(sim.childrenBase[0] - sim.children[0], 1) + " pts",
        t("cohorte enfant fictive", "synthetic child cohort"),
        sim.annual.map(
          (r) =>
            sim.childrenBase[0] -
            (sim.childrenBase[0] - sim.children[0]) * r.ramp,
        ),
        "",
      ],
      [
        t("Capacité effective", "Effective capacity"),
        pct(sim.delivery * 100),
        t("pression : ", "pressure: ") + state.shock + " %",
        t("terrain + numérique", "field + digital"),
        sim.annual.map((r) => sim.delivery * r.ramp),
        "info",
      ],
    ];
    $("#hc-kpis").innerHTML = rows
      .map(
        ([label, value, delta, sub, values, kind]) =>
          `<div class="hg-kpi ${kind}"><small>${label}</small><b>${value}</b><span class="hg-kpi-delta ${kind === "bad" ? "down" : "up"}">${delta}</span><div class="hc-kpi-note">${sub}</div>${spark(values, kind === "bad" ? C.rose : C.programme)}</div>`,
      )
      .join("");
    $("#hc-readout").innerHTML =
      `<span>${t("Budget annuel", "Annual budget")} <b>${money(state.budget * 1e6)}</b></span><span>${t("Bénéfices projetés", "Projected benefits")} <b>${money(sim.benefit)}</b></span><span>${t("Réduction MNT", "NCD reduction")} <b>${pct(sim.reduction * 100)}</b></span>`;
  }
  function gaugeCard(id, title, value, sub, open) {
    const v = Math.max(0, Math.min(100, value));
    const body = svg(
      title,
      `<path d="M50 155 A100 100 0 0 1 250 155" fill="none" stroke="var(--hc-grid)" stroke-width="24" stroke-linecap="round"/><path d="M50 155 A100 100 0 0 1 250 155" fill="none" stroke="${C.programme}" stroke-width="24" stroke-linecap="round" pathLength="100" stroke-dasharray="${v} 100"/><text x="150" y="134" text-anchor="middle" class="hc-value-label" style="font-size:32px">${pct(v)}</text><text x="150" y="163" text-anchor="middle">${t("projection", "projection")}</text><text x="28" y="188">0 %</text><text x="230" y="188">100 %</text>`,
      300,
      200,
    );
    return card(
      id,
      t("COUVERTURE & IMPACT", "COVERAGE & IMPACT"),
      title,
      sub,
      `<div class="hc-gauge">${body}</div>`,
      "",
      open,
    );
  }
  function cumulativeCard() {
    return card(
      "cumulative",
      t("CASH-FLOW", "CASH-FLOW"),
      t("Bénéfice net cumulé & équilibre", "Cumulative net benefit & payback"),
      t("Solde nominal • millions USD", "Nominal balance • million USD"),
      line(
        "Cumulative balance",
        sim.annual.map((r) => r.year),
        [
          {
            name: t("Bénéfices − coûts cumulés", "Cumulative benefits − costs"),
            color: C.programme,
            values: sim.annual.map((r) => r.cumulative / 1e6),
          },
        ],
        "M$",
      ),
      sim.payback
        ? t("Équilibre projeté en ", "Projected payback in ") + sim.payback
        : t(
            "Équilibre non atteint sur cet horizon.",
            "Payback not reached within this horizon.",
          ),
      "investment",
    );
  }
  function radarCard() {
    const labels = [
        t("Dépistage", "Screening"),
        t("Suivi", "Follow-up"),
        t("Nutrition", "Nutrition"),
        t("Maternité", "Maternity"),
        t("Capacité", "Capacity"),
        t("Financement", "Funding"),
      ],
      values = [
        state.screening,
        state.followup,
        state.nutrition,
        state.maternal,
        state.capacity,
        sim.funding * 100,
      ],
      cx = 180,
      cy = 140,
      r = 86;
    const point = (i, v) => [
      cx + (Math.sin((i * Math.PI) / 3) * r * v) / 100,
      cy - (Math.cos((i * Math.PI) / 3) * r * v) / 100,
    ];
    let body = "";
    [25, 50, 75, 100].forEach((v) => {
      body += `<polygon points="${labels.map((_, i) => point(i, v).join(",")).join(" ")}" fill="none" stroke="var(--hc-grid)"/>`;
    });
    labels.forEach((label, i) => {
      const [x, y] = point(i, 100),
        [tx, ty] = point(i, 135);
      body += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--hc-grid)"/><text x="${tx}" y="${ty + 4}" text-anchor="middle" style="font-size:10px">${label}</text>`;
    });
    body += `<polygon points="${values.map((v, i) => point(i, v).join(",")).join(" ")}" fill="${C.programme}" fill-opacity=".16" stroke="${C.programme}" stroke-width="2"/>`;
    return card(
      "radar",
      t("CAPACITÉS", "CAPABILITIES"),
      t("Profil de déploiement du programme", "Programme deployment profile"),
      t("Leviers et financement • %", "Levers and funding • %"),
      svg("Programme deployment profile", body, 360, 290) +
        dataDetails(
          [t("Dimension", "Dimension"), "%"],
          labels.map((v, i) => [v, n(values[i], 1)]),
        ),
      t(
        "Capacités simulées, pas un score clinique.",
        "Simulated capabilities, not a clinical score.",
      ),
      "resilience",
    );
  }
  function dropoffCard() {
    const vals = [
      sim.screened - sim.flagged,
      sim.flagged - sim.followed,
      sim.followed - sim.controlled,
      sim.controlled,
    ].map((v) => v / 1000);
    return card(
      "dropoff",
      t("PARCOURS DE SOINS", "CARE PATHWAY"),
      t(
        "Où se situent les ruptures du parcours ?",
        "Where are the care-pathway gaps?",
      ),
      t(
        "Répartition des adultes dépistés • milliers",
        "Distribution of screened adults • thousands",
      ),
      bars(
        "Care-pathway breakdown",
        [
          t("Sans alerte", "No alert"),
          t("À risque, non suivis", "At risk, not followed"),
          t("Suivis, non contrôlés", "Followed, not controlled"),
          t("Contrôlés", "Controlled"),
        ],
        [
          {
            name: t("Adultes dépistés", "Screened adults"),
            color: C.teal,
            values: vals,
          },
        ],
        t("milliers", "thousands"),
      ),
      t(
        "Catégories disjointes : leur somme égale les adultes dépistés.",
        "Disjoint categories: sum equals screened adults.",
      ),
      "care",
    );
  }
  function shockCard() {
    const shocks = [0, state.shock, 100],
      values = shocks.map(
        (shock) => M.simulate({ ...state, shock }).reduction * 100,
      );
    return card(
      "shock",
      t("RÉSILIENCE", "RESILIENCE"),
      t("La prévention sous pression", "Prevention under pressure"),
      t(
        "Réduction relative d’incidence MNT • %",
        "Relative NCD incidence reduction • %",
      ),
      bars(
        "System pressure",
        [
          t("Sans choc", "No shock"),
          t("Scénario actuel", "Current scenario"),
          t("Choc maximal", "Maximum shock"),
        ],
        [
          {
            name: t("Réduction projetée", "Projected reduction"),
            color: C.amber,
            values,
          },
        ],
        "%",
        45,
      ),
      t(
        "Même budget et mêmes leviers ; seule la pression change.",
        "Same budget and levers; only pressure changes.",
      ),
      "resilience",
    );
  }
  function costsCard() {
    return card(
      "costs",
      t("PROGRAMMES", "PROGRAMMES"),
      t("Coût annuel par programme", "Annual programme cost"),
      t(
        "Allocation à plein déploiement • millions USD",
        "Allocation at full deployment • million USD",
      ),
      bars(
        "Programme costs",
        allocations(),
        [
          {
            name: t("Coût annuel", "Annual cost"),
            color: C.programme,
            values: sim.allocations.map((v) => v / 1e6),
          },
        ],
        "M$",
      ),
      t(
        "Dépenses limitées par le budget disponible.",
        "Spending is capped by available budget.",
      ),
      "investment",
    );
  }
  function scenarioCard() {
    const list = presetDefs().map(([key, label]) => ({
      key,
      label,
      s: M.simulate({ ...state, ...M.presets[key] }),
    }));
    const max = Math.max(1, ...list.map((v) => Math.abs(v.s.npv / 1e6))),
      center = 340,
      scale = 220 / max;
    let body = `<line x1="${center}" x2="${center}" y1="5" y2="220" stroke="var(--hc-zero)"/><text x="${center}" y="243" text-anchor="middle">0 M$</text>`;
    list.forEach(({ label, s }, i) => {
      const v = s.npv / 1e6,
        y = 12 + i * 42,
        width = Math.abs(v) * scale;
      body += `<text x="2" y="${y + 15}" style="font-size:12px">${esc(label)}</text><rect x="${v < 0 ? center - width : center}" y="${y}" width="${width}" height="24" rx="3" fill="${v < 0 ? C.amber : C.programme}"/><text x="${v < 0 ? center + 6 : center - 6}" y="${y + 16}" text-anchor="${v < 0 ? "start" : "end"}" class="hc-value-label">${n(v, 2)}</text>`;
    });
    return card(
      "scenarios",
      t("SCÉNARIOS", "SCENARIOS"),
      t(
        "Comparer les scénarios — valeur actuelle nette",
        "Scenario comparison — net present value",
      ),
      t(
        "Cinq programmes chiffrés par le même moteur",
        "Five programmes priced by the same engine",
      ),
      svg("Scenario NPV comparison", body, 640, 255) +
        table(
          [
            t("Scénario", "Scenario"),
            t("Coûts", "Costs"),
            "VAN / NPV",
            t("Événements évités", "Avoided events"),
          ],
          list.map((v) => [
            v.label,
            money(v.s.cost),
            money(v.s.npv),
            n(v.s.totalAvoided),
          ]),
        ) +
        `<div class="hc-scenario-picks">${list.map((v) => `<button type="button" data-hc-preset="${v.key}">${v.label}</button>`).join("")}</div>`,
      t(
        "Cohorte, horizon, taux et coût évitable communs ; budget, leviers et pression propres à chaque scénario.",
        "Shared cohort, horizon, discount and unit saving; each preset has its own budget, levers and pressure.",
      ),
      "investment",
    );
  }
  function cashflowsCard() {
    return card(
      "cashflows",
      t("BILAN DU PROGRAMME", "PROGRAMME BALANCE SHEET"),
      t("Le bilan, année par année", "The case, year by year"),
      t(
        "USD constants • hypothèses et résultats exportables",
        "Constant USD • exportable assumptions and results",
      ),
      table(
        [
          t("Année", "Year"),
          t("Événements évités", "Avoided events"),
          t("Coûts ($)", "Costs ($)"),
          t("Bénéfices ($)", "Benefits ($)"),
          t("Solde cumulé ($)", "Cumulative balance ($)"),
        ],
        sim.annual.map((r) => [
          r.year,
          n(r.avoided),
          n(r.cost),
          n(r.benefit),
          n(r.cumulative),
        ]),
      ),
      t(
        "Le CSV conserve les valeurs non arrondies.",
        "CSV preserves unrounded values.",
      ),
      "investment",
    );
  }
  function programmeTable() {
    return card(
      "programmes",
      t("PROGRAMME D’INVESTISSEMENT", "INVESTMENT PROGRAMME"),
      t("Portefeuille de déploiement", "Deployment portfolio"),
      t(
        "Coûts, intensité et objectif de chaque programme",
        "Cost, intensity and objective of each programme",
      ),
      table(
        [
          t("Programme", "Programme"),
          t("Intensité", "Intensity"),
          t("Coût annuel", "Annual cost"),
          t("Finalité", "Purpose"),
        ],
        allocations().map((name, i) => [
          name,
          pct(
            [
              state.screening,
              state.followup,
              state.nutrition,
              state.maternal,
              state.capacity,
            ][i],
          ),
          money(sim.allocations[i]),
          [
            t("Identifier le risque", "Identify risk"),
            t("Assurer la continuité", "Maintain continuity"),
            t("Prévenir le double fardeau", "Prevent double burden"),
            t("Accompagner les mères", "Support mothers"),
            t("Déployer et suivre", "Deploy and monitor"),
          ][i],
        ]),
      ),
      t(
        "À valider lors d’un pilote local avant financement.",
        "Validate in a local pilot before funding.",
      ),
      "method",
    );
  }
  function feedCard() {
    return card(
      "feed",
      t("AIDE À LA DÉCISION", "DECISION SUPPORT"),
      t("Ce que recommande le modèle", "What the model recommends"),
      "",
      `<div class="hg-feed" tabindex="0" role="region" aria-label="${t("Recommandations du modèle", "Model recommendations")}"><div class="hg-feed-item ${sim.funding < 1 ? "warn" : ""}"><b>${t("Dimensionner le financement", "Size the funding")}</b>${t("Le programme couvre ", "The programme funds ")}${pct(sim.funding * 100)} ${t("de son besoin annuel.", "of its annual need.")}</div><div class="hg-feed-item ${sim.npv < 0 ? "warn" : ""}"><b>${t("Tester la valeur publique", "Test public value")}</b>VAN / NPV : ${money(sim.npv)}. ${t("Confronter les coûts évitables aux données locales.", "Validate avoidable costs against local evidence.")}</div><div class="hg-feed-item"><b>${t("Suivre le parcours", "Monitor the pathway")}</b>${n(sim.followed)} ${t("adultes suivis, à maturité.", "adults followed up at maturity.")}</div><div class="hg-feed-item"><b>${t("Valider avant de généraliser", "Validate before scaling")}</b>${t("Données fictives : calibration, évaluation et revue de santé publique requises.", "Synthetic data: calibration, evaluation and public-health review required.")}</div></div>`,
      "",
      "method",
    );
  }
  function renderDashboard() {
    chartSurface = "main";
    setChartTheme(false);
    $("#hc-dashboard").innerHTML =
      `<div class="hg-grid c2-1">${childrenCard()}${womenCard()}</div><div class="hg-grid c2">${trajectoryCard()}${cascadeCard()}</div><div class="hg-grid c3">${gaugeCard("funding", t("Couverture du financement", "Funding coverage"), sim.funding * 100, t("Part du besoin annuel financée", "Share of annual need funded"), "investment")}${allocationCard()}${gaugeCard("reduction", t("Impact préventif du programme", "Programme prevention impact"), sim.reduction * 100, t("Réduction d’incidence MNT en année finale", "Final-year NCD incidence reduction"), "population")}</div><div class="hg-grid c2">${cumulativeCard()}${sensitivityCard()}</div><div class="hg-grid c3">${radarCard()}${dropoffCard()}${shockCard()}</div><div class="hg-grid c2-1">${territoryCard()}${costsCard()}</div><div class="hg-grid c2-1">${scenarioCard()}${financeCard()}</div>${card("modules", t("CAPACITÉS DU MINISTÈRE", "MINISTRY CAPABILITY LAYERS"), t("Neuf modules d’intelligence santé — connectés au même modèle", "Nine health intelligence modules — connected to one model"), t("Chaque module porte un indicateur et une trajectoire. Ouvrez sa dimension dans le cockpit unique.", "Every module carries an indicator and a trend. Open its layer in the unified cockpit."), modules(), "")}
    <div class="hg-grid c2-1">${programmeTable()}${feedCard()}</div><div class="hg-grid c2-1">${cashflowsCard()}${card("method", t("MÉTHODE & LIMITES", "METHOD & LIMITATIONS"), t("Un modèle explicable, pas une promesse", "An explainable model, not a promise"), "", `<p class="hg-note">${t("Toutes les cohortes et hypothèses sont fictives. Le pays sert de contexte, pas de source statistique. La VAN représente des coûts de soins potentiellement évités, pas un rendement privé. Les effets maternels et infantiles ne sont pas monétisés.", "All cohorts and assumptions are synthetic. Country is context, not a statistical source. NPV represents potentially avoided care costs, not private returns. Maternal and child effects are not monetised.")}</p><button type="button" class="hg-open" data-hc-open="method" aria-label="${t("Ouvrir les hypothèses", "Open assumptions")}">⤢</button>`, t("Hypothèses détaillées et exports dans le cockpit.", "Detailed assumptions and exports in the cockpit."), "method")}</div>`;
  }
  function setChartTheme(dark) {
    Object.assign(
      C,
      dark
        ? {
            programme: "#c9ee59",
            baseline: "#7fb5ff",
            teal: "#53d9bd",
            amber: "#ffc477",
            rose: "#ff9094",
            muted: "#bfe4d0",
          }
        : {
            programme: "#08733f",
            baseline: "#2f80ed",
            teal: "#0a9364",
            amber: "#c67b1a",
            rose: "#d64550",
            muted: "#52675a",
          },
    );
    colors.splice(
      0,
      colors.length,
      C.programme,
      C.teal,
      C.baseline,
      C.amber,
      C.rose,
    );
  }
  function isCockpitOpen() {
    return !!$("#healthCockpit")?.open;
  }
  function openCockpit(layer = "overview") {
    const dialog = $("#healthCockpit");
    if (!dialog.open) {
      returnFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      dialog.classList.add("show");
      dialog.showModal();
      document.body.style.overflow = "hidden";
    }
    selectTab(layer, true);
  }
  function closeCockpit(restoreFocus = true) {
    const dialog = $("#healthCockpit");
    if (!dialog?.open) return;
    stopTour();
    stopRun();
    dialog.close();
    dialog.classList.remove("show");
    document.body.style.overflow = previousOverflow;
    if (restoreFocus)
      (returnFocus?.isConnected
        ? returnFocus
        : $('[data-hc-action="cockpit"]')
      ).focus({ preventScroll: true });
    returnFocus = null;
  }
  function renderPane() {
    const pane = $("#hc-pane");
    chartSurface = "modal";
    setChartTheme(true);
    pane.setAttribute("aria-labelledby", "hc-tab-" + tab);
    const metrics = `<div class="hgc-grid c4">${headlineMetrics()
      .map(
        ([label, value, sub], i) =>
          `<div class="hgc-kpi"><small>${label}</small><b class="${i === 1 && sim.npv < 0 ? "hc-negative" : ""}">${value}</b><span>${sub}</span></div>`,
      )
      .join("")}</div>`;
    if (tab === "overview")
      pane.innerHTML = `${metrics}<div class="hgc-grid c2">${trajectoryCard()}${childrenCard()}</div><div class="hgc-grid c2">${programmeTable()}${feedCard()}</div>`;
    if (tab === "population")
      pane.innerHTML = `<div class="hgc-grid c2">${childrenCard()}${womenCard()}</div><div class="hgc-grid c2">${trajectoryCard()}${gaugeCard("reduction", t("Impact préventif", "Prevention impact"), sim.reduction * 100, t("Réduction MNT finale", "Final NCD reduction"), "population")}</div>${summary()}`;
    if (tab === "care")
      pane.innerHTML = `<div class="hgc-grid c2">${cascadeCard()}${dropoffCard()}</div><div class="hgc-grid c2">${radarCard()}${costsCard()}</div>${summary()}`;
    if (tab === "resilience")
      pane.innerHTML = `<div class="hgc-grid c2">${radarCard()}${shockCard()}</div><div class="hgc-grid c2">${gaugeCard("funding", t("Financement mobilisé", "Funding mobilised"), sim.funding * 100, t("Part du besoin financée", "Share of need funded"), "investment")}${sensitivityCard()}</div>`;
    if (tab === "territories") pane.innerHTML = geo();
    if (tab === "investment")
      pane.innerHTML = `${metrics}<div class="hgc-grid c2">${cumulativeCard()}${sensitivityCard()}</div><div class="hgc-grid c2">${scenarioCard()}${allocationCard()}</div>${cashflowsCard()}`;
    if (tab === "method") pane.innerHTML = method();
    $("#hc-dialog-meta").textContent =
      t("Dimension ", "Layer ") +
      (tabDefs().findIndex(([id]) => id === tab) + 1) +
      " / " +
      tabDefs().length +
      " • " +
      country();
    $("#hc-dialog-status").textContent =
      t("Modèle à jour • ", "Model up to date • ") +
      tabDefs().find(([id]) => id === tab)[1];
    chartSurface = "main";
    setChartTheme(false);
  }
  function render(rebuildPane = true) {
    sim = M.simulate(state);
    chartSurface = "main";
    setChartTheme(false);
    $("#hc-country").textContent = "🌍 " + country();
    $("#hc-cohort").textContent =
      "🗓 " +
      state.horizon +
      " " +
      t("ans", "years") +
      " • " +
      n(state.population) +
      " " +
      t("personnes fictives", "synthetic people");
    renderMetrics();
    $("#hc-budget-note").textContent =
      (sim.funding < 0.999 && sim.demand ? "⚠ " : "✓ ") +
      t(
        `Besoin annuel : ${money(sim.demand)} · financé : ${pct(sim.funding * 100)} · capacité effective : ${pct(sim.delivery * 100)}. ${sim.funding < 0.999 && sim.demand ? "Les effets sont ajustés au budget disponible." : "Seuls les moyens réellement déployés sont comptabilisés."}`,
        `Annual need: ${money(sim.demand)} · funded: ${pct(sim.funding * 100)} · effective capacity: ${pct(sim.delivery * 100)}. ${sim.funding < 0.999 && sim.demand ? "Effects are adjusted to available funding." : "Only deployed resources are counted as spending."}`,
      );
    renderDashboard();
    if (isCockpitOpen() && rebuildPane) renderPane();
  }
  function syncControls() {
    $$("[data-hc-lever]").forEach((input) => {
      const k = input.dataset.hcLever,
        unit = k === "budget" ? " M$" : k === "unitSaving" ? " $" : " %";
      input.value = state[k];
      input.style.setProperty(
        "--hg-fill",
        ((state[k] - Number(input.min)) /
          (Number(input.max) - Number(input.min))) *
          100 +
          "%",
      );
      $("#hc-out-" + k).textContent =
        n(state[k], Number(input.step) < 1 ? 1 : 0) + unit;
      input.setAttribute("aria-valuetext", n(state[k]) + unit);
    });
    $$(".hc-preset").forEach((b) => {
      const on = b.dataset.hcPreset === preset;
      b.setAttribute("aria-pressed", on);
      b.classList.toggle("on", on);
    });
    $$("[data-hc-horizon]").forEach((b) => {
      const on = Number(b.dataset.hcHorizon) === state.horizon;
      b.setAttribute("aria-pressed", on);
      b.classList.toggle("on", on);
    });
  }
  function status(text) {
    $("#hc-status").textContent = text;
    $("#hc-dialog-status").textContent = text;
  }
  function selectTab(id, focus = false) {
    if (!tabDefs().some(([key]) => key === id)) return;
    tab = id;
    $$(".hc-tab").forEach((b) => {
      const on = b.dataset.hcTab === id;
      b.setAttribute("aria-selected", on);
      b.classList.toggle("on", on);
      b.tabIndex = on ? 0 : -1;
    });
    renderPane();
    $("#hc-cockpit-body").scrollTop = 0;
    if (focus) $("#hc-tab-" + id).focus({ preventScroll: true });
  }
  function stopRun() {
    clearTimeout(runTimer);
    runTimer = null;
    $$('[data-hc-action="run"]').forEach((b) => (b.disabled = false));
    $$(".hg-step.run").forEach((el) => el.classList.remove("run"));
  }
  function run() {
    stopRun();
    openCockpit("overview");
    runStep = 0;
    $$(".hg-step").forEach((el) => el.classList.remove("done"));
    $$('[data-hc-action="run"]').forEach((b) => (b.disabled = true));
    function tick() {
      if (!root.classList.contains("on") || !isCockpitOpen()) {
        stopRun();
        return;
      }
      const steps = $$(".hg-step");
      steps.forEach((el) => el.classList.remove("run"));
      if (runStep > 0) steps[runStep - 1].classList.add("done");
      $("#hc-progress").style.width = (runStep / 6) * 100 + "%";
      if (runStep < 6) {
        steps[runStep].classList.add("run");
        status(
          t("Calcul local : ", "Local calculation: ") +
            steps[runStep].querySelector("b").textContent,
        );
        runStep++;
        runTimer = setTimeout(tick, 250);
      } else {
        render();
        stopRun();
        status(
          t(
            "Simulation recalculée • données fictives • modèle à jour",
            "Simulation recomputed • synthetic data • model up to date",
          ),
        );
      }
    }
    tick();
  }
  function stopTour() {
    clearInterval(tourTimer);
    tourTimer = null;
    const b = $("#hc-tour");
    if (b) {
      b.textContent = "▶ " + t("Présentation", "Presentation");
      b.setAttribute("aria-pressed", "false");
    }
  }
  function toggleTour() {
    if (tourTimer) {
      stopTour();
      return;
    }
    if (!isCockpitOpen()) openCockpit();
    tourIndex = 0;
    const steps = tabDefs().map(([id]) => id);
    const step = () => {
      selectTab(steps[tourIndex], true);
      status(
        t("Présentation guidée", "Guided presentation") +
          ` • ${tourIndex + 1}/${steps.length}`,
      );
      $("#hc-progress").style.width =
        ((tourIndex + 1) / steps.length) * 100 + "%";
      tourIndex++;
      if (tourIndex === steps.length) stopTour();
    };
    step();
    $("#hc-tour").textContent = "Ⅱ " + t("Arrêter", "Stop");
    $("#hc-tour").setAttribute("aria-pressed", "true");
    tourTimer = setInterval(step, 9000);
  }
  function download(type) {
    render(false);
    const context = {
      country: country(),
      countryIsPresentationContextOnly: true,
      synthetic: true,
      model: M.version,
      notice:
        "Illustrative synthetic planning scenario. Not a national estimate, clinical forecast or investment return. All costs in constant USD.",
      coefficients: {
        adultShare: 0.6,
        baselineEventsPer1000: 28,
        annualIncidenceGrowth: 0.015,
        screeningUnitCost: 6,
        atRiskShare: 0.2,
        followupUnitCost: 45,
        nutritionCohortShare: 0.12,
        nutritionUnitCost: 24,
        maternalCohortShare: 0.04,
        maternalUnitCost: 55,
        digitalCostPerPerson: 1.2,
        setupShareOfAnnualBudget: 0.15,
        rampYears: 3,
        reductionScreenFollow: 0.24,
        reductionNutrition: 0.18,
        reductionCap: 0.45,
        deliveryBase: 0.4,
        deliveryCapacity: 0.6,
        shockDeliveryPenalty: 0.45,
        shockIncidenceIncrease: 0.25,
        childrenReduction: [0.28, 0.34, 0.2],
        maternalReduction: [0.32, 0.28, 0.25],
        controlBase: 0.45,
        controlNutrition: 0.3,
        territoryRiskMultipliers: [1.3, 1.18, 1.08, 0.97, 0.84, 0.63],
      },
      financialDefinitions: {
        npv: "Discounted benefits minus discounted costs, including setup",
        bcr: "Discounted benefits / discounted costs",
        benefit: "Avoided NCD events * unitSaving",
        payback: "First nonnegative nominal cumulative year",
        sensitivity:
          "Benefit multiplier 0.75 / 1 / 1.25; not a confidence interval",
      },
      ...sim,
    };
    let data, mime;
    if (type === "json") {
      data = JSON.stringify(context, null, 2);
      mime = "application/json";
    } else {
      const rows = [
        ["NUTRI.N°1 Health Lab", M.version],
        ["Status", context.notice],
        ["Country (presentation only)", country()],
        [],
        ["Input", "Value"],
        ...Object.entries(state),
        [],
        ["Coefficient", "Value"],
        ...Object.entries(context.coefficients).map(([k, v]) => [
          k,
          Array.isArray(v) ? JSON.stringify(v) : v,
        ]),
        [],
        ["Summary", "USD unless specified"],
        ...[
          "cost",
          "benefit",
          "pvCost",
          "pvBenefit",
          "npv",
          "bcr",
          "totalAvoided",
          "payback",
          "funding",
          "delivery",
          "reduction",
        ].map((k) => [k, sim[k]]),
        [],
        [
          "Year",
          "Baseline events / 1000",
          "Programme events / 1000",
          "Avoided events",
          "Cost USD",
          "Benefit USD",
          "Net USD",
          "Cumulative USD",
        ],
        ...sim.annual.map((r) => [
          r.year,
          r.baseline,
          r.programme,
          r.avoided,
          r.cost,
          r.benefit,
          r.net,
          r.cumulative,
        ]),
        [],
        ["Allocation", "Annual USD"],
        ...allocations().map((a, i) => [a, sim.allocations[i]]),
        [],
        ["Population indicator", "Baseline %", "Programme %"],
        ...["Stunting", "Wasting", "Child overweight"].map((a, i) => [
          a,
          sim.childrenBase[i],
          sim.children[i],
        ]),
        ...[
          "Pregnancy anaemia",
          "Lactation anaemia",
          "Maternal underweight",
        ].map((a, i) => [a, sim.womenBase[i], sim.women[i]]),
        [],
        ["Care pathway", "People"],
        ...["screened", "flagged", "followed", "controlled"].map((k) => [
          k,
          sim[k],
        ]),
        [],
        [
          "Synthetic territory",
          "Baseline per 1000",
          "Programme per 1000",
          "Coverage %",
          "Annual USD",
        ],
        ...sim.regions.map((r) => [
          r.id + 1,
          r.risk,
          r.after,
          r.coverage,
          r.allocation,
        ]),
      ];
      const safe = (v) => {
        let text = String(v ?? "");
        if (typeof v === "string" && /^[=+\-@]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
      };
      data = "\uFEFF" + rows.map((r) => r.map(safe).join(",")).join("\r\n");
      mime = "text/csv";
    }
    const url = URL.createObjectURL(
        new Blob([data], { type: mime + ";charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "nutri-health-simulation." + type;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status(
      t(
        "Export téléchargé : données, projections et hypothèses du scénario.",
        "Export downloaded: scenario data, projections and assumptions.",
      ),
    );
  }
  function onClick(e) {
    if (e.target === $("#healthCockpit")) {
      closeCockpit();
      return;
    }
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.hcTab) {
      stopTour();
      selectTab(b.dataset.hcTab);
      return;
    }
    if (b.dataset.hcOpen) {
      stopTour();
      openCockpit(b.dataset.hcOpen);
      return;
    }
    if (b.dataset.hcRegion !== undefined) {
      const inModal = !!b.closest("#healthCockpit");
      region = Number(b.dataset.hcRegion);
      renderDashboard();
      if (isCockpitOpen()) renderPane();
      (inModal ? $("#hc-pane") : $("#hc-dashboard"))
        .querySelector(`[data-hc-region="${region}"]`)
        .focus({ preventScroll: true });
      return;
    }
    if (b.dataset.hcHorizon) {
      state.horizon = Number(b.dataset.hcHorizon);
      stopTour();
      stopRun();
      syncControls();
      render();
      return;
    }
    if (b.dataset.hcPreset) {
      stopTour();
      stopRun();
      preset = b.dataset.hcPreset;
      Object.assign(state, M.presets[preset]);
      syncControls();
      render();
      status(t("Scénario appliqué : ", "Scenario applied: ") + b.textContent);
      if (isCockpitOpen()) $("#hc-tab-" + tab).focus({ preventScroll: true });
      else
        $('.hg-presets [data-hc-preset="' + preset + '"]').focus({
          preventScroll: true,
        });
      return;
    }
    const action = b.dataset.hcAction;
    if (action === "run") run();
    if (action === "cockpit") openCockpit("overview");
    if (action === "close") closeCockpit();
    if (action === "tour") toggleTour();
    if (action === "export" || action === "json")
      download(action === "json" ? "json" : "csv");
    if (action === "reset") {
      stopTour();
      stopRun();
      Object.assign(state, M.defaults);
      preset = "national";
      build();
      $('[data-hc-action="reset"]').focus({ preventScroll: true });
      status(
        t("Hypothèses initiales restaurées.", "Initial assumptions restored."),
      );
    }
  }
  function onInput(e) {
    const k = e.target.dataset.hcLever;
    if (!k) return;
    stopTour();
    stopRun();
    state[k] = Number(e.target.value);
    preset = "";
    syncControls();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      render(tab !== "method");
      status(t("Projections mises à jour.", "Projections updated."));
    });
  }
  function onChange(e) {
    const id = e.target.id;
    if (id === "hc-language") {
      locale = e.target.value;
      stopTour();
      stopRun();
      build();
      $("#hc-language").focus();
    }
    if (id === "hc-horizon" || id === "hc-population") {
      stopTour();
      stopRun();
      state[id.slice(3)] = Number(e.target.value);
      render();
    }
  }
  // Capture at WINDOW to get ahead of all legacy document-level click handlers.
  // Native defaults (sliders, selects, details, keyboard button activation) remain.
  ["click", "input", "change"].forEach((type) =>
    window.addEventListener(
      type,
      (e) => {
        if (!root.contains(e.target)) return;
        if (type === "click") onClick(e);
        if (type === "input") onInput(e);
        if (type === "change") onChange(e);
        e.stopImmediatePropagation();
      },
      true,
    ),
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (!root.contains(e.target)) return;
      if (e.key === "Tab" && isCockpitOpen()) {
        const dialog = $("#healthCockpit");
        const targets = [
          ...dialog.querySelectorAll(
            "button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],summary,[tabindex]",
          ),
        ].filter((el) => el.tabIndex >= 0 && el.getClientRects().length);
        const first = targets[0],
          last = targets[targets.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeCockpit();
        status(t("Cockpit fermé.", "Cockpit closed."));
      }
      const b = e.target.closest('[role="tab"]');
      if (b && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const ids = tabDefs().map(([id]) => id),
          i = ids.indexOf(b.dataset.hcTab);
        const next =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? ids.length - 1
              : (i + (e.key === "ArrowRight" ? 1 : -1) + ids.length) %
                ids.length;
        stopTour();
        selectTab(ids[next], true);
      }
      e.stopImmediatePropagation();
    },
    true,
  );
  // Observe only navigation visibility, never mutate the shared router or other views.
  new MutationObserver(() => {
    if (!root.classList.contains("on")) {
      closeCockpit(false);
      stopRun();
      stopTour();
    } else render(false);
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("nutri:countryChanged", () => render(false));
  document.addEventListener("nutri:i18nChanged", () => {
    const value = document.getElementById("language")?.value;
    if ((value === "fr" || value === "en") && value !== locale) {
      locale = value;
      stopTour();
      stopRun();
      build();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopRun();
      stopTour();
    }
  });
  build();
})();
