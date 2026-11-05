/* Tests déterministes du module, sans serveur et sans CDN.
   Exécution : node tools/nvtest/meal-scanner-suite.js */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const base = path.resolve(
  __dirname,
  "../../nutri1/MVP/web/components/meal-scanner",
);
let assertions = 0;
function check(fn, label) {
  fn();
  assertions++;
  console.log("✓ " + label);
}
async function setup(reduce = false) {
  const dom = new JSDOM(
    '<section id="scanner" class="view on"><div id="mealScanner"></div></section>',
    {
      url: "http://localhost/index.html",
      runScripts: "outside-only",
      pretendToBeVisual: true,
    },
  );
  const w = dom.window;
  const jobs = new Map();
  let id = 0;
  const revoked = [],
    images = [];
  w.matchMedia = () => ({ matches: reduce });
  w.setTimeout = (fn, ms) => {
    jobs.set(++id, { fn, ms });
    return id;
  };
  w.clearTimeout = (n) => jobs.delete(n);
  w.URL.createObjectURL = () => "blob:local-" + (images.length + 1);
  w.URL.revokeObjectURL = (url) => revoked.push(url);
  w.Image = function () {
    images.push(this);
  };
  Object.defineProperty(w.document, "currentScript", {
    value: { src: "http://localhost/components/meal-scanner/meal-scanner.js" },
  });
  for (const file of [
    "meal-scanner-data.js",
    "meal-scanner-template.js",
    "meal-scanner.js",
  ])
    w.eval(fs.readFileSync(path.join(base, file), "utf8"));
  const root = w.document.querySelector("#mealScanner").shadowRoot;
  const q = (sel) => root.querySelector(sel);
  const click = (sel) => q(sel).click();
  const flush = () => {
    const batch = [...jobs.values()].sort((a, b) => a.ms - b.ms);
    jobs.clear();
    batch.forEach((job) => job.fn());
  };
  const changePortion = (generous) => {
    q(`input[value="${generous ? "generous" : "standard"}"]`).checked = true;
    q("input:checked").dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  const upload = (type = "image/jpeg", size = 1024) => {
    Object.defineProperty(q("#meal-file"), "files", {
      configurable: true,
      value: [{ type, size }],
    });
    q("#meal-file").dispatchEvent(new w.Event("change", { bubbles: true }));
  };
  return {
    dom,
    w,
    root,
    q,
    jobs,
    click,
    flush,
    changePortion,
    upload,
    revoked,
    images,
  };
}
(async () => {
  const s = await setup();
  const { q, w, jobs, click, flush, changePortion, upload, images, revoked } =
    s;
  check(() => {
    assert.equal(q(".scanner").dataset.state, "ready");
    assert(q(".results").hidden);
  }, "état initial : aucun résultat prématuré");
  check(() => {
    const normal = w.NUTRI_MEAL_DATA.meal(false),
      generous = w.NUTRI_MEAL_DATA.meal(true);
    assert.equal(normal.totals.kcal, 500);
    assert.equal(generous.totals.kcal, 740);
    assert(normal.balanced);
    assert(!generous.balanced);
    assert.equal(w.NUTRI_MEAL_DATA.meal(false).items[0].grams, 150);
  }, "totaux cohérents, deux bilans distincts, données non mutées");
  check(() => {
    assert(q(".recommendations-content").hidden);
    assert(!q(".recommendations-empty").hidden);
    assert.equal(s.root.querySelectorAll(".timeline li").length, 4);
    assert.equal(s.root.querySelector("article"), null);
  }, "interface de suivi et recommandations en attente avant l’analyse");
  check(() => {
    for (const large of [false, true]) {
      const meal = w.NUTRI_MEAL_DATA.meal(large);
      assert.equal(
        meal.distribution.reduce((sum, group) => sum + group.percent, 0),
        100,
      );
      const advice = w.NUTRI_MEAL_DATA.recommendations(meal);
      assert.equal(advice.items.length, 3);
      assert.equal(advice.adjustable, large);
    }
  }, "moteur : répartition à 100 % et recommandations adaptées aux deux portions");
  click('[data-action="scan"]');
  check(() => {
    assert(q('[data-action="scan"]').disabled);
    assert.equal(jobs.size, 4);
    click('[data-action="scan"]');
    assert.equal(jobs.size, 4);
  }, "capture et protection contre le double-clic");
  flush();
  check(() => {
    assert.equal(q(".scanner").dataset.state, "complete");
    assert.equal(q(".kcal").textContent, "500");
    assert.equal(s.root.querySelectorAll(".ingredient-list tr").length, 3);
    assert.equal(s.root.querySelectorAll(".marker").length, 3);
    assert(!q(".verdict").hidden);
    assert(!q(".verdict").classList.contains("warning"));
    assert.equal(q(".progress").getAttribute("aria-valuenow"), "100");
    assert.equal(q(".analysis-panel").getAttribute("aria-busy"), "false");
  }, "scan complet : ingrédients, repères, macros, calories et bilan");
  check(() => {
    assert(!q(".recommendations-content").hidden);
    assert(q(".recommendations-empty").hidden);
    assert.equal(s.root.querySelectorAll(".recommendation-list li").length, 3);
    assert.match(
      q(".recommendation-list").textContent,
      /Conserver les trois groupes/,
    );
    assert(q(".recommendation-action").hidden);
    assert.equal(s.root.querySelectorAll(".distribution-legend li").length, 3);
    assert.equal(
      s.root.querySelectorAll("table thead th[scope='col']").length,
      3,
    );
  }, "résultats tabulaires, répartition et recommandations visibles après analyse");
  changePortion(true);
  check(() => {
    assert.equal(q(".kcal").textContent, "740");
    assert(q(".verdict").classList.contains("warning"));
    assert.match(q(".ingredient-list").textContent, /300 g/);
  }, "recalcul instantané et conseil pour portion généreuse");
  check(() => {
    assert(!q(".recommendation-action").hidden);
    assert.match(q(".recommendation-list").textContent, /740 à 500 kcal/);
    assert.match(q(".recommendation-list").textContent, /240 kcal/);
    assert(q(".recommendation-summary").classList.contains("warning"));
    assert.match(q(".professional-note").textContent, /professionnel de santé/);
  }, "portion augmentée : recommandation prioritaire chiffrée et limites médicales");
  click('[data-action="adjust-portion"]');
  check(() => {
    assert(q('input[value="standard"]').checked);
    assert.equal(q(".kcal").textContent, "500");
    assert(q(".recommendation-action").hidden);
    assert.match(
      q(".recommendation-list").textContent,
      /Conserver les trois groupes/,
    );
    assert.match(q(".scan-status").textContent, /recommandations recalculés/);
    assert.equal(s.root.activeElement, q("#recommendation-heading"));
  }, "bouton de recommandation : nouvelle simulation cohérente et focus conservé");
  changePortion(false);
  click('[data-action="scan"]');
  changePortion(true);
  check(() => {
    assert.equal(jobs.size, 0);
    assert.equal(q(".scanner").dataset.state, "ready");
    assert(q(".results").hidden);
  }, "changement de portion pendant le scan : séquence annulée");
  check(() => {
    assert(q(".recommendations-content").hidden);
    assert(!q(".recommendations-empty").hidden);
    assert(q(".distribution").hidden);
  }, "aucun conseil périmé affiché après annulation");
  click('[data-action="scan"]');
  w.document.querySelector("#scanner").classList.remove("on");
  await new Promise((resolve) => setImmediate(resolve));
  check(() => {
    assert.equal(jobs.size, 0);
    assert.equal(q(".scanner").dataset.state, "ready");
  }, "navigation hors section : aucun minuteur en arrière-plan");
  w.document.querySelector("#scanner").classList.add("on");
  upload("application/pdf");
  check(
    () => assert.match(q(".upload-feedback").textContent, /JPEG/),
    "fichier non image refusé",
  );
  upload("image/png", 11 * 1024 * 1024);
  check(
    () => assert.equal(images.length, 0),
    "fichier supérieur à 10 Mo refusé",
  );
  upload();
  images.at(-1).onerror();
  check(() => {
    assert.match(q(".upload-feedback").textContent, /illisible/);
    assert.equal(revoked.length, 1);
  }, "fichier image invalide : erreur et URL libérée");
  upload();
  images.at(-1).onload();
  click('[data-action="scan"]');
  flush();
  check(() => {
    assert.equal(s.root.querySelectorAll(".marker").length, 0);
    assert.match(q(".image-tag").textContent, /AUCUNE RECONNAISSANCE/);
    assert.equal(q(".kcal").textContent, "740");
  }, "photo importée : locale, résultats explicitement simulés, aucun faux repère");
  click('[data-action="restore"]');
  check(() => {
    assert.match(q(".meal-photo").src, /african-meal.jpg/);
    assert.equal(q(".scanner").dataset.state, "ready");
    assert.equal(revoked.length, 2);
  }, "retour à l’exemple et libération de la photo locale");
  upload();
  const first = images.at(-1);
  upload();
  const last = images.at(-1);
  last.onload();
  first.onload();
  check(() => {
    assert.equal(q(".meal-photo").getAttribute("src"), "blob:local-4");
    assert(revoked.includes("blob:local-3"));
  }, "imports concurrents : la dernière sélection gagne");
  s.dom.window.close();
  const reduced = await setup(true);
  reduced.click('[data-action="scan"]');
  check(
    () => assert([...reduced.jobs.values()].every((job) => job.ms <= 80)),
    "mouvement réduit : attente et animations réduites",
  );
  reduced.flush();
  check(
    () => assert.equal(reduced.q(".scanner").dataset.state, "complete"),
    "mouvement réduit : le bilan reste complet",
  );
  reduced.dom.window.close();
  const html = fs.readFileSync(path.resolve(base, "../../index.html"), "utf8");
  check(() => {
    assert.equal((html.match(/id="mealScanner"/g) || []).length, 1);
    assert(
      html.indexOf('src="components/meal-scanner/meal-scanner-data.js"') <
        html.indexOf('src="components/meal-scanner/meal-scanner.js"'),
    );
    const section = html.match(/<section id="scanner"[\s\S]*?<\/section>/)[0];
    assert(!section.includes("onclick="));
    assert(section.includes("<noscript>"));
  }, "intégration légère et sans anciens gestionnaires concurrents");
  console.log(`\n${assertions} vérifications réussies.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
