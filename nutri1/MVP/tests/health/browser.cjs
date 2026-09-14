// Integration and visual-parity checks. See README for the optional browser configuration.
const { chromium } = require(
  process.env.HEALTH_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const launch = { headless: true };
  if (process.env.HEALTH_CHROMIUM_MODULE) {
    const pkg = (await import(process.env.HEALTH_CHROMIUM_MODULE)).default;
    launch.executablePath = await pkg.executablePath();
    launch.args = pkg.args;
  } else if (process.env.HEALTH_CHROMIUM_EXECUTABLE)
    launch.executablePath = process.env.HEALTH_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(launch),
    context = await browser.newContext({
      viewport: { width: 1512, height: 1050 },
    }),
    page = await context.newPage();
  let errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.HEALTH_URL || "http://127.0.0.1:8000/nutri1/MVP/web/index.html",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(1600);
  console.log("Existing global startup errors:", errors);
  errors = [];
  const health = page.locator("#health"),
    modal = page.locator("#healthCockpit");
  async function navigate(id) {
    await page.locator(`.nav button[onclick*="'${id}'"]`).click();
    await page.waitForTimeout(600);
  }
  async function clean() {
    for (const s of [
      "#v51Live.show",
      "#v52Overlay.show",
      "#v53Shell.show",
      "#v54Overlay.show",
      "#v56overlay",
      "#v57ExactShell",
    ])
      assert.equal(
        await page.locator(s).filter({ visible: true }).count(),
        0,
        "Legacy panel: " + s,
      );
    assert.equal(await page.locator("#healthCockpit").count(), 1);
  }
  async function screenshot(name) {
    if (process.env.HEALTH_SCREENSHOT_DIR)
      await page.screenshot({
        path: process.env.HEALTH_SCREENSHOT_DIR + "/" + name + ".png",
      });
  }
  const probes = [
    ["hero", ["padding", "borderRadius", "backgroundImage", "boxShadow"]],
    [
      "hero h2",
      ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "color"],
    ],
    ["kpi", ["padding", "borderRadius", "backgroundColor", "boxShadow"]],
    ["deck", ["padding", "borderRadius", "backgroundImage", "boxShadow"]],
    ["lever", ["padding", "borderRadius", "backgroundColor"]],
    [
      "btn.primary",
      ["padding", "borderRadius", "backgroundImage", "fontWeight"],
    ],
    ["card", ["padding", "borderRadius", "backgroundColor", "boxShadow"]],
    ["module", ["padding", "borderRadius", "backgroundColor"]],
    ["kpis", ["gridTemplateColumns", "gap"]],
    ["levers", ["gridTemplateColumns", "gap"]],
  ];
  async function style(root, prefix, selector, props) {
    return page
      .locator(`${root} .${prefix}-${selector}`)
      .first()
      .evaluate((el, keys) => {
        const s = getComputedStyle(el);
        return Object.fromEntries(keys.map((k) => [k, s[k]]));
      }, props);
  }
  await navigate("agri");
  const reference = [];
  for (const [selector, props] of probes)
    reference.push(await style("#agri", "ag", selector, props));
  await page.locator('#agri [data-ag-act="cockpit"]').click();
  await page.waitForTimeout(300);
  const modalReference = await page
    .locator("#agriCockpit .agc-window")
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        width: s.width,
        height: s.height,
        borderRadius: s.borderRadius,
        backgroundImage: s.backgroundImage,
        padding: s.padding,
      };
    });
  await page.evaluate(() => window.NUTRI_AGRI.close());
  await navigate("health");
  for (let i = 0; i < probes.length; i++) {
    const [selector, props] = probes[i];
    assert.deepEqual(
      await style("#health", "hg", selector, props),
      reference[i],
      "Visual mismatch: " + selector,
    );
  }
  assert.equal(await health.locator(".hg-hero-stat").count(), 4);
  assert.equal(await health.locator(".hg-kpi").count(), 12);
  assert.equal(await health.locator(".hg-module").count(), 9);
  assert.equal(await health.locator(".hg-step").count(), 6);
  await clean();
  await screenshot("health-agri-matched-main");
  const initial = await page.locator("#hc-kpis").innerText();
  for (const preset of [
    "reference",
    "national",
    "prevention",
    "maternal",
    "crisis",
  ]) {
    const button = health.locator(`.hg-presets [data-hc-preset="${preset}"]`);
    await button.click();
    assert.equal(await button.getAttribute("aria-pressed"), "true");
    assert.ok(!/NaN|Infinity/.test(await page.locator("#hc-kpis").innerText()));
    await clean();
  }
  await health.locator('[data-hc-action="reset"]').click();
  assert.equal(await page.locator("#hc-kpis").innerText(), initial);
  await page.locator("#hc-screening").fill("95");
  await page.waitForFunction(
    (before) => document.querySelector("#hc-kpis").innerText !== before,
    initial,
  );
  assert.notEqual(await page.locator("#hc-kpis").innerText(), initial);
  await health.locator('[data-hc-horizon="10"]').click();
  await page.locator("#hc-population").selectOption("500000");
  const overflowBefore = await page.evaluate(
    () => document.body.style.overflow,
  );
  await health.locator('[data-hc-action="cockpit"]').click();
  assert.equal(await modal.evaluate((d) => d.open), true);
  const actualModal = await modal.locator(".hgc-window").evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      width: s.width,
      height: s.height,
      borderRadius: s.borderRadius,
      backgroundImage: s.backgroundImage,
      padding: s.padding,
    };
  });
  assert.deepEqual(actualModal, modalReference, "Modal must match Agriculture");
  await screenshot("health-agri-matched-cockpit");
  for (const tab of [
    "overview",
    "population",
    "care",
    "investment",
    "resilience",
    "territories",
    "method",
  ]) {
    await modal.locator(`[data-hc-tab="${tab}"]`).click();
    assert.equal(
      await modal
        .locator(`[data-hc-tab="${tab}"]`)
        .getAttribute("aria-selected"),
      "true",
    );
    assert.ok((await page.locator("#hc-pane").innerText()).length > 200);
    await clean();
  }
  await modal.locator('[data-hc-tab="territories"]').click();
  await modal.locator('[data-hc-region="4"]').click();
  assert.ok(
    (await modal.locator(".hc-region-detail").innerText()).includes("05"),
  );
  await modal.locator('[data-hc-tab="method"]').click();
  await page.locator("#hc-unitSaving").fill("3000");
  await page.locator("#hc-discount").fill("10");
  await page.waitForTimeout(100);
  const jsonPromise = page.waitForEvent("download");
  await modal.locator('[data-hc-action="json"]').click();
  const exported = JSON.parse(
    fs.readFileSync(await (await jsonPromise).path(), "utf8"),
  );
  assert.equal(exported.inputs.unitSaving, 3000);
  assert.equal(exported.inputs.discount, 10);
  assert.equal(exported.annual.length, 11);
  assert.equal(exported.synthetic, true);
  const csvPromise = page.waitForEvent("download");
  await modal.locator('[data-hc-action="export"]').first().click();
  assert.ok(
    fs
      .readFileSync(await (await csvPromise).path(), "utf8")
      .includes("Programme events / 1000"),
  );
  await modal.locator('[data-hc-tab="overview"]').click();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await modal
      .locator('[data-hc-tab="population"]')
      .getAttribute("aria-selected"),
    "true",
  );
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    assert.equal(
      await modal.evaluate((d) => d.contains(document.activeElement)),
      true,
      "Focus escaped modal",
    );
  }
  await page.keyboard.press("Escape");
  assert.equal(await modal.evaluate((d) => d.open), false);
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    overflowBefore,
  );
  assert.equal(
    await health
      .locator('[data-hc-action="cockpit"]')
      .evaluate((el) => el === document.activeElement),
    true,
    "Focus should return to trigger",
  );
  for (let i = 0; i < 3; i++) {
    await health.locator('[data-hc-action="cockpit"]').click();
    await modal.locator('[data-hc-open="population"]').first().click();
    await clean();
    await modal.locator('[data-hc-action="close"]').click();
  }
  await health.locator('[data-hc-action="cockpit"]').click();
  await page.mouse.click(10, 10);
  assert.equal(await modal.evaluate((d) => d.open), false, "Backdrop close");
  await health.locator('.hg-hero [data-hc-action="run"]').click();
  await page.waitForTimeout(1800);
  assert.equal(await health.locator(".hg-step.done").count(), 6);
  await clean();
  await modal.locator('[data-hc-action="tour"]').click();
  assert.equal(
    await modal.locator("#hc-tour").getAttribute("aria-pressed"),
    "true",
  );
  await page.keyboard.press("Escape");
  assert.equal(await modal.evaluate((d) => d.open), false);
  await page.locator("#hc-language").selectOption("en");
  await page.waitForTimeout(900);
  assert.equal(await page.locator("#hc-language option").count(), 2);
  assert.ok(
    (await page.locator("#hc-kpis").innerText())
      .toLowerCase()
      .includes("adults screened"),
  );
  await page.locator("#hc-language").selectOption("fr");
  await health.locator('[data-hc-action="reset"]').click();
  await health.locator("#hc-card-children summary").click();
  assert.equal(
    await health.locator("#hc-card-children details").getAttribute("open"),
    "",
  );
  await clean();
  // All main and modal IDs must be unique, including generated SVG gradients.
  const duplicates = await health.evaluate((root) => {
    const ids = [...root.querySelectorAll("[id]")].map((e) => e.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i);
  });
  assert.deepEqual(duplicates, []);
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    let size = await health
      .locator("#hcShell")
      .evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    assert.equal(size.client, size.scroll, `Dashboard overflow at ${width}`);
    await health.locator('[data-hc-action="cockpit"]').click();
    for (const tab of [
      "overview",
      "population",
      "investment",
      "territories",
      "method",
    ]) {
      await modal.locator(`[data-hc-tab="${tab}"]`).click();
      const bounds = await modal
        .locator(".hgc-body")
        .evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
      assert.equal(
        bounds.client,
        bounds.scroll,
        `Modal ${tab} overflow at ${width}`,
      );
    }
    if (width === 390) await screenshot("health-agri-matched-mobile");
    await page.keyboard.press("Escape");
    await clean();
  }
  await page.setViewportSize({ width: 1512, height: 1050 });
  await navigate("agri");
  await page.locator('#agri [data-ag-act="cockpit"]').click();
  assert.equal(await page.locator("#agriCockpit").isVisible(), true);
  await page.evaluate(() => window.NUTRI_AGRI.close());
  await navigate("health");
  await clean();
  console.log("Interaction errors:", errors);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Agriculture style parity, 7 layers, simulation, focus, exports, mobile and isolation",
  );
  await browser.close();
})();
