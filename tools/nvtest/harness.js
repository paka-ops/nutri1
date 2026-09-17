/* Harness jsdom : charge la page réelle via HTTP (scripts + locales externes).
   jsdom ne fournit ni fetch ni ResizeObserver → polyfills injectés avant parse. */
const { JSDOM, VirtualConsole } = require('jsdom');

const URL_PAGE = process.env.NV_URL || 'http://127.0.0.1:8000/index.html';
const nodeFetch = global.fetch;

function polyfills(win) {
  win.fetch = function (u, o) {
    const abs = typeof u === 'string' ? new URL(u, win.location.href).href : u;
    return nodeFetch(abs, o);
  };
  win.ResizeObserver = function () { this.observe = () => { }; this.unobserve = () => { }; this.disconnect = () => { }; };
  win.IntersectionObserver = function () { this.observe = () => { }; this.unobserve = () => { }; this.disconnect = () => { }; };
  if (!win.matchMedia) win.matchMedia = () => ({ matches: false, addListener() { }, removeListener() { }, addEventListener() { }, removeEventListener() { } });
  try {
    win.URL.createObjectURL = () => 'blob:nv';
    win.URL.revokeObjectURL = () => { };
  } catch (e) { }
  win.Element.prototype.scrollIntoView = function () { };
  win.scrollTo = () => { };
  if (!win.HTMLCanvasElement.prototype.getContext) win.HTMLCanvasElement.prototype.getContext = () => null;
  win.HTMLCanvasElement.prototype.getContext = function () {
    /* Chart.js absent (CDN non chargé) : contexte 2D factice pour éviter les crashs */
    return null;
  };
}

async function load(opt) {
  const o = opt || {};
  const logs = { errors: [], warnings: [], all: [] };
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => logs.errors.push('JSDOM_ERROR ' + (e && e.message ? e.message : String(e))));
  vc.on('error', (...a) => logs.errors.push(a.map(String).join(' ').slice(0, 300)));
  vc.on('warn', (...a) => logs.warnings.push(a.map(String).join(' ').slice(0, 300)));
  vc.on('log', (...a) => logs.all.push(a.map(String).join(' ').slice(0, 200)));
  const dom = await JSDOM.fromURL(URL_PAGE, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse: polyfills
  });
  const win = dom.window;
  /* largeur fixe pour les hôtes de graphique (jsdom renvoie 0) */
  const gBCR = win.Element.prototype.getBoundingClientRect;
  win.Element.prototype.getBoundingClientRect = function () {
    const cls = this.classList;
    if (cls && (cls.contains('nv-chart-host') || cls.contains('nv-chart'))) {
      const hgt = parseFloat(this.style.height) || 240;
      return { width: 720, height: hgt, top: 0, left: 0, right: 720, bottom: hgt, x: 0, y: 0, toJSON() { } };
    }
    return gBCR.call(this);
  };
  await waitFor(() => win.NutriCitizen && win.NutriCitizen.state && win.NutriCitizen.state.mounted, 25000, 'NutriCitizen mounted');
  if (o.view !== false) { await act(win, () => win.go && win.go('citizen')); await sleep(o.settle == null ? 900 : o.settle); }
  return { dom, win, doc: win.document, logs };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function waitFor(fn, ms, what) {
  const t0 = Date.now();
  for (; ;) {
    try { if (fn()) return true; } catch (e) { }
    if (Date.now() - t0 > (ms || 8000)) throw new Error('timeout waiting for ' + (what || 'condition'));
    await sleep(60);
  }
}
async function act(win, fn, settle) { fn(); await sleep(settle == null ? 220 : settle); }
function click(doc, sel) {
  const el = typeof sel === 'string' ? doc.querySelector(sel) : sel;
  if (!el) throw new Error('click: introuvable ' + sel);
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true, view: el.ownerDocument.defaultView }));
  return el;
}
function clickAction(doc, action, arg) {
  const sel = '[data-nv-action="' + action + '"]' + (arg == null ? '' : '[data-nv-arg="' + arg + '"]');
  return click(doc, sel);
}
/* certains contrôles historiques sont des <select> : événement change */
function selectValue(doc, actionOrSel, value) {
  const el = typeof actionOrSel === 'string' && actionOrSel.indexOf('[') === 0
    ? doc.querySelector(actionOrSel)
    : doc.querySelector('[data-nv-action="' + actionOrSel + '"]');
  if (!el) throw new Error('select: introuvable ' + actionOrSel);
  el.value = String(value);
  el.dispatchEvent(new el.ownerDocument.defaultView.Event('change', { bubbles: true }));
  el.dispatchEvent(new el.ownerDocument.defaultView.Event('input', { bubbles: true }));
  return el;
}
function pathPoints(d) {
  const out = [];
  const re = /(-?\d+(?:\.\d+)?)[,\s](-?\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(String(d || '')))) out.push([parseFloat(m[1]), parseFloat(m[2])]);
  return out;
}

module.exports = { load, sleep, waitFor, act, click, clickAction, selectValue, pathPoints };
