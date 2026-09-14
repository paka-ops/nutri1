// Health-only integration checks. Requires a running static server and Playwright.
// See README.md for dependencies and optional browser/screenshot configuration.
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
  const browser = await chromium.launch(launch);
  const page = await browser.newPage({
    viewport: { width: 1512, height: 1100 },
  });
  let errors = [];
  page.on("pageerror", (e) => errors.push(e.stack));
  await page.goto(
    process.env.HEALTH_URL || "http://127.0.0.1:8000/nutri1/MVP/web/index.html",
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForTimeout(1600);
  console.log("Initial errors:", errors);
  errors = [];
  await page.locator('.nav button[onclick*="health"]').click();
  await page.waitForTimeout(1400);
  const overlays = [
    "#v51Live.show",
    "#v52Overlay.show",
    "#v53Shell.show",
    "#v54Overlay.show",
    "#v56overlay",
    "#v57ExactShell",
  ];
  async function noOverlay() {
    for (const s of overlays)
      assert.equal(
        await page.locator(s).filter({ visible: true }).count(),
        0,
        "Stacked panel: " + s,
      );
    assert.equal(await page.locator('#health [role="tabpanel"]').count(), 1);
  }
  await noOverlay();
  const base = await page.locator("#hc-kpis").innerText();
  for (const preset of [
    "reference",
    "national",
    "prevention",
    "maternal",
    "crisis",
  ]) {
    await page.locator('[data-hc-preset="' + preset + '"]').click();
    await noOverlay();
    assert.equal(
      await page
        .locator('[data-hc-preset="' + preset + '"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.ok(!/NaN|Infinity/.test(await page.locator("#hc-kpis").innerText()));
  }
  await page.locator('[data-hc-action="reset"]').click();
  assert.equal(await page.locator("#hc-kpis").innerText(), base);
  await page.locator("#hc-screening").fill("95");
  await page.waitForTimeout(70);
  assert.notEqual(await page.locator("#hc-kpis").innerText(), base);
  await noOverlay();
  await page.locator("#hc-horizon").selectOption("10");
  await page.locator("#hc-population").selectOption("500000");
  await noOverlay();
  for (const tab of [
    "population",
    "territories",
    "investment",
    "method",
    "overview",
  ]) {
    await page.locator('[data-hc-tab="' + tab + '"]').click();
    await noOverlay();
    assert.ok((await page.locator("#hc-pane").innerText()).length > 200);
  }
  await page.locator('[data-hc-tab="territories"]').click();
  await page.locator('[data-hc-region="4"]').click();
  assert.ok(
    (await page.locator(".hc-region-detail").innerText()).includes("05"),
  );
  await noOverlay();
  await page.locator('[data-hc-tab="method"]').click();
  await page.locator("#hc-unitSaving").fill("3000");
  await page.locator("#hc-discount").fill("10");
  await page.waitForTimeout(70);
  const jp = page.waitForEvent("download");
  await page.locator('[data-hc-action="json"]').click();
  const j = await jp;
  const jfile = await j.path();
  const model = JSON.parse(fs.readFileSync(jfile, "utf8"));
  assert.equal(model.inputs.unitSaving, 3000);
  assert.equal(model.inputs.discount, 10);
  assert.equal(model.annual.length, 11);
  assert.equal(model.synthetic, true);
  const cp = page.waitForEvent("download");
  await page.locator('[data-hc-action="export"]').last().click();
  const c = await cp;
  assert.ok(
    fs.readFileSync(await c.path(), "utf8").includes("Programme events / 1000"),
  );
  await page.locator("#hc-language").selectOption("en");
  assert.equal(await page.locator("#hc-language option").count(), 2);
  await page.waitForTimeout(900);
  assert.equal(await page.locator("#hc-language option").count(), 2);
  assert.ok(
    (await page.locator("#hc-kpis").innerText()).includes("Avoided NCD events"),
  );
  await page.locator("#hc-tab-overview").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator("#hc-tab-population").getAttribute("aria-selected"),
    "true",
  );
  await page.locator("#hc-language").selectOption("fr");
  await page.locator('[data-hc-action="run"]').click();
  await page.waitForTimeout(1300);
  assert.equal(await page.locator(".hc-step.done").count(), 4);
  await noOverlay();
  await page.locator("#hc-card-trajectory summary").click();
  assert.equal(
    await page.locator("#hc-card-trajectory details").getAttribute("open"),
    "",
  );
  await noOverlay();
  await page.locator('[data-hc-action="tour"]').click();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#hc-tour").getAttribute("aria-pressed"),
    "false",
  );
  await page.locator('[data-hc-action="reset"]').click();
  await page.locator('[data-hc-tab="overview"]').click();
  if (process.env.HEALTH_SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.HEALTH_SCREENSHOT_DIR + "/health-desktop.png",
      fullPage: true,
    });
  await page.locator('[data-hc-tab="investment"]').click();
  if (process.env.HEALTH_SCREENSHOT_DIR)
    await page.screenshot({
      path: process.env.HEALTH_SCREENSHOT_DIR + "/health-investment.png",
      fullPage: true,
    });
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('[data-hc-tab="overview"]').click();
    await page.waitForTimeout(200);
    const bounds = await page
      .locator("#hcShell")
      .evaluate((el) => ({
        client: el.clientWidth,
        scroll: el.scrollWidth,
        documentWidth: document.documentElement.clientWidth,
        documentScroll: document.documentElement.scrollWidth,
      }));
    console.log(width, bounds);
    assert.equal(bounds.scroll, bounds.client, "Health horizontal overflow");
    if (width === 390 && process.env.HEALTH_SCREENSHOT_DIR)
      await page.screenshot({
        path: process.env.HEALTH_SCREENSHOT_DIR + "/health-mobile.png",
        fullPage: true,
      });
    await noOverlay();
  }
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.locator('.nav button[onclick*="agri"]').click();
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#agri").getAttribute("class"), "view on");
  await page.locator('#agri [data-ag-act="cockpit"]').click();
  await page.waitForTimeout(400);
  console.log(
    "Agri cockpit visible:",
    await page.locator("#agriCockpit").isVisible(),
  );
  await page.evaluate(() => window.NUTRI_AGRI.close());
  await page.locator('.nav button[onclick*="health"]').click();
  await noOverlay();
  console.log("Interaction errors:", errors);
  assert.ok(!errors.some((e) => /assets\/health/.test(e)), "New health error");
  console.log("PASS all health smoke checks");
  await browser.close();
})();
