/* Health-only UI: native SVG charts, a single inline workspace and scoped events.
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
    ["population", t("Populations & parcours", "Populations & care")],
    ["territories", t("Équité territoriale", "Territorial equity")],
    ["investment", t("Bilan d’investissement", "Investment case")],
    ["method", t("Hypothèses & preuves", "Assumptions & evidence")],
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
    return `<div class="hc-control"><label for="hc-${k}">${label}<output id="hc-out-${k}" for="hc-${k}">${n(state[k], step < 1 ? 1 : 0)}${unit}</output></label><input id="hc-${k}" data-hc-lever="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${state[k]}" aria-describedby="hc-hint-${k}" style="--fill:${((state[k] - min) / (max - min)) * 100}%"><small id="hc-hint-${k}">${hint}</small></div>`;
  }
  function build() {
    shell.lang = locale;
    shell.innerHTML = `
      <div class="hc-topline"><div class="hc-wordmark">NUTRI.<b>N°1</b> <span style="font-weight:400;color:#a7c2c0"> / HEALTH LAB</span></div><span>${t("L’INTELLIGENCE AU SERVICE DE LA PRÉVENTION", "INTELLIGENCE FOR PREVENTION")}</span><label><select id="hc-language" data-v49="1" aria-label="${t("Langue du cockpit", "Cockpit language")}"><option value="fr" ${locale === "fr" ? "selected" : ""}>FR</option><option value="en" ${locale === "en" ? "selected" : ""}>EN</option></select></label></div>
      <header class="hc-hero"><div class="hc-hero-main"><div><div class="hc-eyebrow">${t("SANTÉ PUBLIQUE / LABORATOIRE D’INVESTISSEMENT", "PUBLIC HEALTH / INVESTMENT LABORATORY")}</div><h2>${t("Investir dans la prévention.<br><em>Visualiser l’impact.</em>", "Invest in prevention.<br><em>See the impact.</em>")}</h2><p>${t("Du signal nutritionnel à la décision publique. Concevez un programme, explorez ses effets sur la santé et confrontez son coût à ses bénéfices potentiels — dans un seul espace de simulation.", "From nutrition signals to public decisions. Design a programme, explore its health effects and weigh costs against potential benefits — in one simulation workspace.")}</p><div class="hc-actions"><button type="button" class="hc-btn primary" data-hc-action="run">▷ ${t("Lancer la simulation", "Run simulation")}</button><button type="button" class="hc-btn" data-hc-action="tour" id="hc-tour">▶ ${t("Parcours décideur", "Decision-maker tour")}</button><button type="button" class="hc-btn ghost" data-hc-action="export">↓ ${t("Exporter le bilan", "Export the case")}</button></div></div>
      <div class="hc-orbit" aria-hidden="true"><svg viewBox="0 0 300 300"><defs><linearGradient id="hc-orbit-gradient"><stop stop-color="#53d9bd"/><stop offset="1" stop-color="#c3f277"/></linearGradient></defs><circle cx="150" cy="150" r="143" fill="none" stroke="#ffffff10"/><circle cx="150" cy="150" r="126" fill="none" stroke="#ffffff12" stroke-dasharray="2 7"/><circle cx="150" cy="150" r="107" fill="#153e3544" stroke="#ffffff0c" stroke-width="18"/><circle id="hc-ring" cx="150" cy="150" r="107" fill="none" stroke="url(#hc-orbit-gradient)" stroke-width="5" stroke-linecap="round" stroke-dasharray="350 673" transform="rotate(-90 150 150)"/><path d="M8 150h22m240 0h22M150 8v22m0 240v22" stroke="#53d9bd66"/><circle cx="261" cy="89" r="5" fill="#c3f277"/></svg><div class="hc-orbit-core"><small>${t("Réduction simulée", "Simulated reduction")}</small><strong id="hc-orbit-value">—</strong><span>${t("Incidence MNT • année finale", "NCD incidence • final year")}</span></div></div></div>
      <div class="hc-hero-foot"><span class="hc-chip amber">${t("DONNÉES FICTIVES · AUCUNE CONNEXION CLINIQUE", "SYNTHETIC DATA · NO CLINICAL CONNECTION")}</span><span class="hc-chip" id="hc-country"></span><span class="hc-chip" id="hc-cohort"></span><span class="hc-chip">${t("Moteur déterministe · v1.0", "Deterministic engine · v1.0")}</span></div></header>
      <div class="hc-content"><div class="hc-kpis" id="hc-kpis"></div>
      <div class="hc-deck"><div class="hc-deck-head"><div><div class="hc-eyebrow">01 / ${t("CONCEVOIR", "DESIGN")}</div><h3>${t("Votre politique de prévention, en six leviers.", "Your prevention policy, in six levers.")}</h3><p>${t("Chaque réglage recalcule les coûts, la couverture et les projections.", "Every adjustment recomputes costs, coverage and projections.")}</p></div><div class="hc-presets">${presetDefs()
        .map(
          ([key, label]) =>
            `<button type="button" class="hc-preset" data-hc-preset="${key}" aria-pressed="${preset === key}">${label}</button>`,
        )
        .join("")}</div></div><div class="hc-controls">${levers()
        .map((l) => control(...l))
        .join("")}</div>
      <div class="hc-context"><label for="hc-horizon">${t("Horizon", "Horizon")}<select id="hc-horizon">${[3, 5, 10].map((y) => `<option value="${y}" ${state.horizon === y ? "selected" : ""}>${y} ${t("ans", "years")}</option>`).join("")}</select></label><label for="hc-population">${t("Cohorte fictive", "Synthetic cohort")}<select id="hc-population">${[100000, 500000, 1000000, 5000000, 10000000].map((p) => `<option value="${p}" ${state.population === p ? "selected" : ""}>${n(p)}</option>`).join("")}</select></label><button type="button" class="hc-btn ghost" data-hc-action="reset">↺ ${t("Réinitialiser", "Reset")}</button>${control("shock", t("Pression sur le système", "System pressure"), t("0 = nominal · 100 = choc maximal", "0 = nominal · 100 = maximum shock"), 0, 100, 5, " %")}</div><div id="hc-budget-note" class="hc-budget-note"></div></div>
      <div class="hc-pipeline" aria-label="${t("Étapes du calcul local", "Local calculation stages")}">${[t("Cohorte & hypothèses", "Cohort & assumptions"), t("Déploiement & capacité", "Deployment & capacity"), t("Projections sanitaires", "Health projections"), t("Bilan & arbitrages", "Case & trade-offs")].map((label, i) => `<div class="hc-step" data-hc-step="${i}"><i>${i + 1}</i><span>${label}</span></div>`).join("")}</div>
      <div class="hc-workspace" id="hc-workspace"><div class="hc-work-head"><div><div class="hc-eyebrow">02 / ${t("EXPLORER & DÉCIDER", "EXPLORE & DECIDE")}</div><h3>${t("Un programme. Toutes ses dimensions.", "One programme. Every dimension.")}</h3></div><div class="hc-live"><i></i> ${t("CALCUL LOCAL · SANS PANNEAUX SUPERPOSÉS", "LOCAL MODEL · NO STACKED PANELS")}</div></div><div class="hc-tabs" role="tablist" aria-label="${t("Dimensions de la simulation", "Simulation dimensions")}">${tabDefs()
        .map(
          ([id, label]) =>
            `<button type="button" class="hc-tab" role="tab" id="hc-tab-${id}" data-hc-tab="${id}" aria-selected="${tab === id}" aria-controls="hc-pane" tabindex="${tab === id ? 0 : -1}">${label}</button>`,
        )
        .join(
          "",
        )}</div><div id="hc-pane" role="tabpanel" tabindex="0" aria-labelledby="hc-tab-${tab}"></div></div>
      <div class="hc-status" id="hc-status" role="status" aria-live="polite"></div><footer class="hc-footer"><span>NUTRI.N°1 / HEALTH INTELLIGENCE INFRASTRUCTURE</span><span>${t("Prototype de planification · ni prévision officielle, ni avis médical, ni promesse de rendement.", "Planning prototype · not an official forecast, medical advice or a promise of returns.")}</span></footer></div>`;
    render();
  }
  function legend(series) {
    return `<div class="hc-legend">${series.map((s) => `<span><i style="--color:${s.color}"></i>${s.dash ? "┄ " : ""}${esc(s.name)}</span>`).join("")}</div>`;
  }
  function svg(title, body, w = 640, h = 290) {
    return `<div class="hc-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg></div>`;
  }
  function table(headers, rows) {
    return `<div class="hc-table-wrap"><table><thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => (i === 0 ? `<th scope="row">${esc(v)}</th>` : `<td>${esc(v)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function dataDetails(headers, rows) {
    return `<details><summary class="hc-data-toggle">${t("Valeurs & version accessible", "Values & accessible version")}</summary>${table(headers, rows)}</details>`;
  }
  function card(id, kicker, title, sub, body, note, open) {
    return `<article class="hc-chart-card" id="hc-card-${id}"><div class="hc-card-top"><div><div class="hc-eyebrow">${kicker}</div><h3>${title}</h3><p class="hc-sub">${sub}</p></div>${open ? `<button type="button" class="hc-icon-btn" data-hc-open="${open}" aria-label="${esc(t("Explorer : ", "Explore: ") + title)}">↗</button>` : ""}</div>${body}${note ? `<div class="hc-chart-note">${note}</div>` : ""}</article>`;
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
      body += `<line x1="${left}" x2="${w - right}" y1="${yy}" y2="${yy}" stroke="#ffffff12"/><text x="${left - 9}" y="${yy + 4}" text-anchor="end">${n(v, Math.abs(max - min) < 10 ? 1 : 0)}</text>`;
    }
    if (min < 0)
      body += `<line x1="${left}" x2="${w - right}" y1="${y(0)}" y2="${y(0)}" stroke="#ffffff60" stroke-dasharray="4 4"/>`;
    labels.forEach((label, i) => {
      if (labels.length <= 7 || i % 2 === 0 || i === labels.length - 1)
        body += `<text x="${x(i)}" y="${h - 21}" text-anchor="middle">${esc(label)}</text>`;
    });
    series.forEach((s, si) => {
      const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      if (si === series.length - 1)
        body += `<polygon points="${x(0)},${y(0)} ${points} ${x(labels.length - 1)},${y(0)}" fill="${s.color}" opacity=".055"/>`;
      body += `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="7 5"' : ""}/>`;
      s.values.forEach((v, i) => {
        body += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${s.color}" stroke="#0b2527" stroke-width="1.5"><title>${esc(s.name)} · ${labels[i]} : ${n(v, 2)} ${esc(unit)}</title></circle>`;
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
    let body = `<circle cx="110" cy="110" r="${r}" fill="none" stroke="#ffffff10" stroke-width="23"/>`;
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
  function childrenCard() {
    return card(
      "children",
      t("NUTRITION INFANTILE", "CHILD NUTRITION"),
      t("Enfants : le double fardeau", "Children: the double burden"),
      t(
        "Prévalence fictive dans les cohortes concernées (%)",
        "Synthetic prevalence in the relevant cohorts (%)",
      ),
      bars(
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
    let body = `<line x1="${center}" x2="${center}" y1="8" y2="190" stroke="#ffffff65"/><text x="${center}" y="216" text-anchor="middle">0 M$</text>`;
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
    return `<div class="hc-modules">${[
      [
        "population",
        "◎",
        t("Diabète & hypertension", "Diabetes & hypertension"),
        t(
          "Parcours de dépistage et suivi →",
          "Screening and follow-up pathway →",
        ),
      ],
      [
        "population",
        "♡",
        t("Nutrition mère & enfant", "Mother & child nutrition"),
        t("Double fardeau et anémie →", "Double burden and anaemia →"),
      ],
      [
        "territories",
        "⌖",
        t("Priorités territoriales", "Territorial priorities"),
        t(
          "Risque, couverture et allocation →",
          "Risk, coverage and allocation →",
        ),
      ],
      [
        "method",
        "▤",
        t("Produits de données", "Data products"),
        t("Hypothèses, modèle et export →", "Assumptions, model and export →"),
      ],
    ]
      .map(
        ([id, icon, title, sub]) =>
          `<button type="button" class="hc-module" data-hc-open="${id}"><span>${icon}</span><b>${title}</b><small>${sub}</small></button>`,
      )
      .join("")}</div>`;
  }
  function geo() {
    const r = sim.regions[region];
    return `<div class="hc-grid">${card("territories", t("OBSERVATOIRE TERRITORIAL", "TERRITORIAL OBSERVATORY"), t("Voir où agir en priorité", "See where action matters most"), t("6 territoires fictifs · schéma analytique, pas une carte GIS", "6 synthetic territories · analytical schematic, not a GIS map"), `<div class="hc-tiles">${sim.regions.map((v, i) => `<button type="button" class="hc-territory" data-hc-region="${i}" aria-pressed="${region === i}" style="--tile:${["#603d32", "#544332", "#3a4c36", "#214d40", "#1e4545", "#233d46"][i]}"><small>${t("TERRITOIRE", "TERRITORY")} ${String(i + 1).padStart(2, "0")}</small><b>${n(v.risk, 1)}</b><small>${t("événements / 1 000", "events / 1,000")}</small><small>${t("Couverture", "Coverage")} : ${pct(v.coverage)}</small></button>`).join("")}</div><div class="hc-region-detail"><h3>${t("Territoire", "Territory")} ${String(region + 1).padStart(2, "0")} / ${t("fiche d’arbitrage", "decision brief")}</h3><p class="hc-sub">${t("Incidence fictive :", "Synthetic incidence:")} ${n(r.risk, 1)} → ${n(r.after, 1)} / 1 000</p><p class="hc-sub">${t("Allocation annuelle indicative :", "Indicative annual allocation:")} <b>${money(r.allocation)}</b> · ${t("Couverture :", "Coverage:")} ${pct(r.coverage)}</p><p class="hc-sub">${t("Action proposée : cibler les adultes à risque et renforcer le relais communautaire. À confronter aux données locales avant toute décision.", "Suggested action: target at-risk adults and strengthen community follow-up. Validate against local data before any decision.")}</p></div>`, t("La couleur code le niveau de risque initial. Cliquez sur un territoire pour son détail.", "Colour encodes baseline risk. Select a territory for details."))}
    ${card("priorities", t("ALLOCATION CIBLÉE", "TARGETED ALLOCATION"), t("Financer selon le besoin", "Fund according to need"), t("Budget réparti au prorata du risque fictif", "Budget allocated in proportion to synthetic risk"), sim.regions.map((r, i) => `<div class="hc-priority"><i>0${i + 1}</i><div><strong>${t("Territoire", "Territory")} 0${i + 1}</strong><small>${t("Couverture", "Coverage")} ${pct(r.coverage)} · ${n(r.risk, 1)} / 1 000</small></div><b>${money(r.allocation)}</b></div>`).join(""), t("Territoires de poids égal. Les écarts territoriaux sont illustratifs et ne recalculent pas le modèle national.", "Equal-size territories. Territorial differences are illustrative and do not recalculate the national model."))}</div>${summary()}`;
  }
  function method() {
    return `<div class="hc-method"><article><div class="hc-eyebrow">01 / ${t("STATUT DES DONNÉES", "DATA STATUS")}</div><h3>${t("Une démonstration transparente", "A transparent demonstration")}</h3><p>${t("Toutes les cohortes, prévalences, incidences et unités de coût sont fictives. Le pays affiché donne un contexte de présentation ; il ne change pas les hypothèses et ne constitue pas une estimation nationale.", "All cohorts, prevalences, incidence rates and unit costs are synthetic. The displayed country provides presentation context; it does not change assumptions or represent a national estimate.")}</p><ul><li>${t("Population adulte : 60 % de la cohorte. Incidence initiale : 28 événements MNT / 1 000 adultes / an ; tendance : +1,5 % / an.", "Adults: 60% of the cohort. Initial incidence: 28 NCD events / 1,000 adults / year; trend: +1.5% / year.")}</li><li>${t("Aucun raccordement à un registre patient, ministère, OMS ou flux temps réel.", "No patient registry, ministry, WHO or real-time feed is connected.")}</li><li>${t("Pas de diagnostic, de causalité démontrée ou d’impact clinique validé.", "No diagnosis, demonstrated causality or validated clinical impact.")}</li></ul></article>
    <article><div class="hc-eyebrow">02 / ${t("HYPOTHÈSES FINANCIÈRES", "FINANCIAL ASSUMPTIONS")}</div><h3>${t("Tester la valeur, pas la promettre", "Test value, do not promise it")}</h3><p>${t("Dépistage : 6 $/adulte ; suivi : 45 $/adulte à risque adhérent ; nutrition : 24 $ × 12 % de la cohorte ; maternité : 55 $ × 4 % ; infrastructure : 1,20 $/personne. Chaque coût est multiplié par son levier.", "Screening: $6/adult; follow-up: $45/adherent at-risk adult; nutrition: $24 × 12% of cohort; maternity: $55 × 4%; infrastructure: $1.20/person. Each cost is multiplied by its lever.")}</p>${control("discount", t("Taux d’actualisation", "Discount rate"), t("Appliqué aux coûts et aux bénéfices.", "Applied to both costs and benefits."), 0, 20, 1, " %")}${control("unitSaving", t("Coût évitable par événement", "Avoidable cost per event"), t("USD · hypothèse économique, non documentée cliniquement.", "USD · economic assumption, not clinically substantiated."), 0, 10000, 100, " $")}</article>
    <article><div class="hc-eyebrow">03 / ${t("MOTEUR REPRODUCTIBLE", "REPRODUCIBLE ENGINE")}</div><h3>${t("Du levier au résultat", "From lever to result")}</h3><p>${t("Financement = min(1, budget / besoin). Capacité = (0,4 + 0,6 × numérique) × (1 − 0,45 × pression). La pression augmente aussi l’incidence de référence de 25 % au maximum.", "Funding = min(1, budget / need). Capacity = (0.4 + 0.6 × digital) × (1 − 0.45 × pressure). Pressure also increases baseline incidence by up to 25%.")}</p><code>${t("Réduction MNT", "NCD reduction")} = min(45 %, (0,24 × screening × followup + 0,18 × nutrition) × funding × capacity)</code><p>${t("Leviers normalisés de 0 à 1. Déploiement : ⅓, ⅔, puis 100 %. Prévalence enfant réduite de (28 %, 34 %, 20 %) × nutrition × financement × capacité ; maternelle de (32 %, 28 %, 25 %) × maternité × financement × capacité.", "Levers normalised from 0 to 1. Ramp-up: ⅓, ⅔, then 100%. Child prevalence reduced by (28%, 34%, 20%) × nutrition × funding × capacity; maternal by (32%, 28%, 25%) × maternity × funding × capacity.")}</p><p>${t("Parcours : adultes × dépistage × financement × capacité ; 20 % à risque ; suivi × adhésion ; contrôle × (0,45 + 0,30 × nutrition). Aucun tirage aléatoire.", "Care pathway: adults × screening × funding × capacity; 20% at risk; follow-up × adherence; control × (0.45 + 0.30 × nutrition). No random sampling.")}</p></article>
    <article><div class="hc-eyebrow">04 / ${t("BILAN & LIMITES", "CASE & LIMITATIONS")}</div><h3>${t("Une valeur publique, pas un rendement privé", "Public value, not private return")}</h3><code>VAN / NPV = Σ (benefitₜ − costₜ) / (1 + discount)ᵗ − setup</code><p>${t("Installation initiale : 15 % du plafond annuel si un programme est demandé. Bénéfice = événements MNT évités × coût évitable. Ratio bénéfice/coût = bénéfices actualisés / coûts actualisés. Retour simple : première année où le solde nominal cumulé devient positif.", "Initial setup: 15% of annual ceiling when a programme is requested. Benefit = avoided NCD events × avoidable cost. Benefit-cost ratio = discounted benefits / discounted costs. Simple payback: first year with non-negative nominal cumulative balance.")}</p><p>${t("Les bénéfices maternels et infantiles ne sont pas monétisés pour éviter un double comptage. Aucune modélisation des décès, des DALY, des recettes privées ou de l’inflation. Le stress-test ±25 % n’est pas un intervalle statistique.", "Maternal and child benefits are not monetised to avoid double counting. No modelling of mortality, DALYs, private revenue or inflation. The ±25% stress test is not a statistical interval.")}</p></article></div>
    <div class="hc-summary"><span class="hc-summary-icon">▤</span><div><h3>${t("Prochaine étape : un pilote auditable", "Next step: an auditable pilot")}</h3><p>${t("Calibrer avec des données consenties et agrégées, documenter les coûts locaux, valider les effets avec des experts de santé publique et comparer les résultats à un groupe de référence.", "Calibrate with consented, aggregated data; document local costs; validate effects with public-health experts; and compare outcomes to a reference group.")}</p></div></div><div class="hc-actions"><button type="button" class="hc-btn primary" data-hc-action="json">↓ ${t("Modèle & hypothèses · JSON", "Model & assumptions · JSON")}</button><button type="button" class="hc-btn" data-hc-action="export">↓ ${t("Bilan & séries · CSV", "Case & time series · CSV")}</button></div>`;
  }
  function renderPane() {
    const pane = $("#hc-pane");
    pane.setAttribute("aria-labelledby", "hc-tab-" + tab);
    if (tab === "overview")
      pane.innerHTML = `<div class="hc-grid flagship">${trajectoryCard()}${allocationCard()}</div>${summary()}<div class="hc-grid">${childrenCard()}${womenCard()}</div><div class="hc-grid">${financeCard()}${cascadeCard()}</div>${modules()}`;
    if (tab === "population")
      pane.innerHTML = `<div class="hc-grid">${childrenCard()}${womenCard()}</div><div class="hc-grid">${trajectoryCard()}${cascadeCard()}</div>${summary()}`;
    if (tab === "territories") pane.innerHTML = geo();
    if (tab === "investment")
      pane.innerHTML = `${summary()}<div class="hc-grid">${financeCard()}${sensitivityCard()}</div><div class="hc-grid">${allocationCard()}${card(
        "cumulative",
        t("TRAJECTOIRE NETTE", "NET TRAJECTORY"),
        t(
          "Quand le programme s’équilibre-t-il ?",
          "When does the programme break even?",
        ),
        t(
          "Solde cumulé nominal · millions USD",
          "Nominal cumulative balance · million USD",
        ),
        line(
          "Cumulative balance",
          sim.annual.map((r) => r.year),
          [
            {
              name: t(
                "Bénéfices − coûts cumulés",
                "Cumulative benefits − costs",
              ),
              color: C.programme,
              values: sim.annual.map((r) => r.cumulative / 1e6),
            },
          ],
          "M$",
        ),
        sim.payback
          ? t("Équilibre simple projeté en ", "Projected simple payback in ") +
              sim.payback
          : t(
              "Équilibre non atteint sur cet horizon.",
              "Payback not reached within this horizon.",
            ),
      )}</div>${card(
        "cashflows",
        t("AUDIT FINANCIER", "FINANCIAL AUDIT"),
        t("Le bilan, année par année", "The case, year by year"),
        t(
          "USD constants · événements évités non arrondis dans le moteur",
          "Constant USD · engine uses unrounded avoided events",
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
          "Le CSV conserve les valeurs non arrondies et toutes les hypothèses d’entrée.",
          "CSV preserves unrounded values and all input assumptions.",
        ),
      )}`;
    if (tab === "method") pane.innerHTML = method();
  }
  function render(rebuildPane = true) {
    sim = M.simulate(state);
    $("#hc-orbit-value").textContent = "−" + pct(sim.reduction * 100);
    $("#hc-ring").setAttribute(
      "stroke-dasharray",
      `${sim.reduction * 673} 673`,
    );
    $("#hc-country").textContent =
      country() + " · " + t("contexte de démonstration", "demo context");
    $("#hc-cohort").textContent =
      n(state.population) +
      " " +
      t("personnes fictives", "synthetic people") +
      " · " +
      state.horizon +
      " " +
      t("ans", "years");
    $("#hc-kpis").innerHTML = [
      [
        t("Événements MNT évités", "Avoided NCD events"),
        n(sim.totalAvoided),
        t(
          `cumulés sur ${state.horizon} ans · non uniques`,
          `over ${state.horizon} years · not unique people`,
        ),
        false,
      ],
      [
        t("Coûts de soins évités", "Avoided care costs"),
        money(sim.benefit),
        t(
          "bénéfices bruts nominaux simulés",
          "simulated nominal gross benefits",
        ),
        false,
      ],
      [
        t("Valeur actuelle nette publique", "Public net present value"),
        money(sim.npv),
        t("actualisée à ", "discounted at ") + state.discount + " %",
        sim.npv < 0,
      ],
      [
        t("Ratio bénéfice / coût", "Benefit / cost ratio"),
        sim.bcr === null ? "—" : n(sim.bcr, 2) + "×",
        t(
          "valeurs actualisées · seuil : 1×",
          "discounted values · threshold: 1×",
        ),
        sim.bcr !== null && sim.bcr < 1,
      ],
    ]
      .map(
        ([label, value, sub, negative]) =>
          `<div class="hc-kpi ${negative ? "hc-negative" : ""}"><small>${label}</small><b>${value}</b><span>${sub}</span></div>`,
      )
      .join("");
    $("#hc-budget-note").textContent =
      (sim.funding < 0.999 && sim.demand ? "⚠ " : "✓ ") +
      t(
        `Besoin annuel : ${money(sim.demand)} · financé : ${pct(sim.funding * 100)} · capacité effective : ${pct(sim.delivery * 100)}. ${sim.funding < 0.999 && sim.demand ? "Les ambitions dépassent le budget : les effets sont réduits proportionnellement." : "Le budget reste un plafond ; seuls les moyens mobilisés sont comptabilisés."}`,
        `Annual need: ${money(sim.demand)} · funded: ${pct(sim.funding * 100)} · effective capacity: ${pct(sim.delivery * 100)}. ${sim.funding < 0.999 && sim.demand ? "Ambitions exceed the budget: effects are proportionally reduced." : "Budget is a ceiling; only deployed resources count as costs."}`,
      );
    if (rebuildPane) renderPane();
  }
  function syncControls() {
    $$("[data-hc-lever]").forEach((input) => {
      const k = input.dataset.hcLever,
        unit = k === "budget" ? " M$" : k === "unitSaving" ? " $" : " %";
      input.value = state[k];
      input.style.setProperty(
        "--fill",
        ((state[k] - Number(input.min)) /
          (Number(input.max) - Number(input.min))) *
          100 +
          "%",
      );
      $("#hc-out-" + k).textContent =
        n(state[k], Number(input.step) < 1 ? 1 : 0) + unit;
      input.setAttribute("aria-valuetext", n(state[k]) + unit);
    });
    $$(".hc-preset").forEach((b) =>
      b.setAttribute("aria-pressed", b.dataset.hcPreset === preset),
    );
  }
  function status(text) {
    $("#hc-status").textContent = text;
  }
  function selectTab(id, focus = false, scroll = false) {
    if (!tabDefs().some(([key]) => key === id)) return;
    tab = id;
    $$(".hc-tab").forEach((b) => {
      const on = b.dataset.hcTab === tab;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
    });
    renderPane();
    if (focus) $("#hc-tab-" + tab).focus({ preventScroll: true });
    if (scroll)
      $("#hc-workspace").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  }
  function stopRun() {
    clearTimeout(runTimer);
    runTimer = null;
    $$('[data-hc-action="run"]').forEach((b) => (b.disabled = false));
  }
  function run() {
    stopRun();
    runStep = 0;
    $$(".hc-step").forEach((e) => e.classList.remove("done"));
    $$('[data-hc-action="run"]').forEach((b) => (b.disabled = true));
    status(t("Recalcul local du scénario…", "Recomputing local scenario…"));
    function tick() {
      if (!root.classList.contains("on")) {
        stopRun();
        return;
      }
      $$(".hc-step")[runStep]?.classList.add("done");
      runStep++;
      if (runStep < 4) {
        runTimer = setTimeout(tick, 300);
      } else {
        render();
        stopRun();
        selectTab("overview", false, true);
        status(
          t(
            "Simulation recalculée. Toutes les vues utilisent les mêmes hypothèses.",
            "Simulation recomputed. All views use the same assumptions.",
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
      b.textContent = "▶ " + t("Parcours décideur", "Decision-maker tour");
      b.setAttribute("aria-pressed", "false");
    }
  }
  function toggleTour() {
    if (tourTimer) {
      stopTour();
      return;
    }
    tourIndex = 0;
    const steps = [
      "overview",
      "population",
      "territories",
      "investment",
      "method",
    ];
    const step = () => {
      selectTab(steps[tourIndex], false, true);
      status(
        t("Présentation guidée", "Guided presentation") +
          ` · ${tourIndex + 1}/5 · ` +
          tabDefs().find(([id]) => id === tab)[1],
      );
      tourIndex++;
      if (tourIndex === steps.length) stopTour();
    };
    step();
    $("#hc-tour").textContent =
      "Ⅱ " + t("Arrêter le parcours", "Stop the tour");
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
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.hcTab) {
      stopTour();
      selectTab(b.dataset.hcTab);
      return;
    }
    if (b.dataset.hcOpen) {
      stopTour();
      selectTab(b.dataset.hcOpen, true, true);
      return;
    }
    if (b.dataset.hcRegion !== undefined) {
      region = Number(b.dataset.hcRegion);
      renderPane();
      $(`[data-hc-region="${region}"]`).focus({ preventScroll: true });
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
      return;
    }
    const action = b.dataset.hcAction;
    if (action === "run") run();
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
      if (e.key === "Escape") {
        stopTour();
        stopRun();
        status(t("Présentation interrompue.", "Presentation stopped."));
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
