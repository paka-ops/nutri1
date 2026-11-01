/* ============================================================================
 * NUTRI.N°1 — Engine for the institutional FR → EN layer.
 * Non-destructive by design:
 *   - Original French strings are cached and restored when French is selected.
 *   - Component files, models, data and logic are never modified.
 *   - Activation only when the platform locale is not French.
 * ========================================================================== */
(function (global) {
  'use strict';
  var INST = global.NUTRI_INST_I18N;
  if (!INST || !INST.dict) return;

  /* ---------- Compiled longest-first matchers (word-boundary safe) ---------- */
  var KEYS = Object.keys(INST.dict).sort(function (a, b) { return b.length - a.length; });
  var RULES = KEYS.map(function (k) {
    var safe = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    /* Boundaries only where the key itself borders on a letter, so trailing-space
       keys such as "Rapport " can attach to the word that follows. */
    var lb = /^[A-Za-zÀ-ÿ]/.test(k) ? "(?<![A-Za-zÀ-ÿ])" : "";
    var rb = /[A-Za-zÀ-ÿ]$/.test(k) ? "(?![A-Za-zÀ-ÿ])" : "";
    return [new RegExp(lb + safe + rb, "g"), INST.dict[k]];
  });
  /* Dictionary keys also accept typographic apostrophes / narrow spaces, since the
     rendered components use French typography while some keys were authored with
     plain ASCII quotes. */
  var EXACT = {};
  KEYS.forEach(function (k) {
    EXACT[k] = INST.dict[k];
    var nk = k.replace(/'/g, "\u2019").replace(/[\u202f\u00a0]/g, " ");
    if (nk !== k && !(nk in EXACT)) EXACT[nk] = INST.dict[k];
  });
  var MEMO = new Map();
  var PLAIN_RE = /^\s*[0-9\u202f .,%°+\-–—:×/()'"|▪●▲▼⚠✓✗←→↕↑↓►°#*_]*$/;

  function matchCase(src, rep) {
    if (src && rep && src.charAt(0) !== rep.charAt(0) &&
        src.charAt(0).toLowerCase() === rep.charAt(0).toLowerCase()) {
      return src.charAt(0) + rep.slice(1);
    }
    return rep;
  }

  function translate(raw, noCap) {
    if (raw == null) return raw;
    var s = String(raw);
    if (!s || (!noCap && s.length > 800)) return s;
    if (PLAIN_RE.test(s)) return s;
    /* French typography: narrow no-break spaces and typographic apostrophes are
       normalized so dictionary keys always match the rendered text. */
    if (/[\u202f\u00a0']/.test(s)) {
      s = s.replace(/[\u202f\u00a0]/g, " ").replace(/'/g, "\u2019");
      if (Object.prototype.hasOwnProperty.call(EXACT, s)) return EXACT[s];
      var norm = s;
      for (var k = 0; k < RULES.length; k++) {
        var rr = RULES[k];
        if (rr[0].test(norm)) norm = norm.replace(rr[0], function (m) { return matchCase(m, rr[1]); });
        rr[0].lastIndex = 0;
      }
      MEMO.set(String(raw), norm);
      return norm;
    }
    if (MEMO.has(s)) return MEMO.get(s);
    var out;
    if (Object.prototype.hasOwnProperty.call(EXACT, s)) {
      out = EXACT[s];
    } else {
      out = s;
      for (var i = 0; i < RULES.length; i++) {
        var re = RULES[i];
        if (re[0].test(out)) out = out.replace(re[0], function (m) { return matchCase(m, re[1]); });
        re[0].lastIndex = 0;
      }
    }
    MEMO.set(s, out);
    return out;
  }
  INST.translateDeep = translate;

  /* ---------- Locale detection ---------- */
  function currentLocale() {
    try {
      if (global.NUTRI_I18N && global.NUTRI_I18N.locale) return String(global.NUTRI_I18N.locale).toLowerCase();
      return String(localStorage.getItem('nutri_language') || 'en').toLowerCase();
    } catch (e) { return 'en'; }
  }
  function shouldBeActive() { return currentLocale() !== 'fr'; }

  /* ---------- DOM translation with original caching ---------- */
  var textOriginals = new WeakMap();
  var attrOriginals = new WeakMap();

  function visitText(node) {
    var raw = node.nodeValue;
    if (!raw || !raw.trim()) return;
    if (INST.active) {
      if (!textOriginals.has(node)) textOriginals.set(node, raw);
      var t = translate(raw);
      if (t !== raw) node.nodeValue = t;
    } else if (textOriginals.has(node)) {
      node.nodeValue = textOriginals.get(node);
      textOriginals.delete(node);
    }
  }

  function visitAttrs(el) {
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name !== 'placeholder' && a.name !== 'title' && a.name !== 'aria-label') continue;
      var store = attrOriginals.get(el);
      if (!store) { store = {}; attrOriginals.set(el, store); }
      if (!(a.name in store)) store[a.name] = a.value;
      if (INST.active) {
        var t = translate(store[a.name]);
        if (t !== a.value) el.setAttribute(a.name, t);
      } else if (a.value !== store[a.name]) {
        el.setAttribute(a.name, store[a.name]);
      }
    }
  }

  function walk(root) {
    if (!root) return;
    var w;
    try { w = document.createTreeWalker(root, global.NodeFilter ? global.NodeFilter.SHOW_TEXT : 4, null); } catch (e) { return; }
    var texts = [];
    var n;
    while ((n = w.nextNode())) {
      var p = n.parentElement;
      if (!p) continue;
      var tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
      texts.push(n);
    }
    for (var i = 0; i < texts.length; i++) visitText(texts[i]);
    var els;
    try { els = root.querySelectorAll('[placeholder],[title],[aria-label]'); } catch (e) { els = []; }
    for (var j = 0; j < els.length; j++) visitAttrs(els[j]);
  }

  /* ---------- Redraw the six dashboards so Canvas text follows the locale ---------- */
  function refreshDashboards() {
    var ids = ['whoNutriTracker', 'wfpNutriTracker', 'faoNutriTracker', 'unicefNutriChild', 'healthNutriApp', 'agriNutriApp'];
    setTimeout(function () {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        try { if (typeof el.refreshAll === 'function') el.refreshAll(); } catch (e) {}
        try { if (typeof el.refresh === 'function') el.refresh(); } catch (e) {}
      });
    }, 40);
  }

  /* ---------- Observer wiring (document + each Shadow DOM) ---------- */
  var timer = null;
  function schedulePass() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      walk(document.body);
      /* Re-walk every known Shadow DOM: components re-render their content on
         every filter change, and tooltip DOM is created on hover. Charts are
         NOT redrawn here — they only redraw on a real language change, so the
         components keep full control of their own render cycle. */
      attachShadows();
      observedShadows.forEach(walk);
    }, 60);
  }

  var observedShadows = [];
  function attachShadows() {
    var ids = ['whoNutriTracker', 'wfpNutriTracker', 'faoNutriTracker', 'unicefNutriChild', 'healthNutriApp', 'agriNutriApp'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.shadowRoot || observedShadows.indexOf(el.shadowRoot) !== -1) return;
      observedShadows.push(el.shadowRoot);
      walk(el.shadowRoot);
      new MutationObserver(schedulePass).observe(el.shadowRoot, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ---------- Canvas patch ---------- */
  function patchCanvas() {
    if (!global.CanvasRenderingContext2D || global.CanvasRenderingContext2D.prototype.__instI18n) return;
    var proto = global.CanvasRenderingContext2D.prototype;
    proto.__instI18n = true;
    ['fillText', 'strokeText'].forEach(function (fn) {
      var orig = proto[fn];
      if (typeof orig !== 'function') return;
      proto[fn] = function (text) {
        var args = Array.prototype.slice.call(arguments);
        if (INST.active && typeof args[0] === 'string') args[0] = translate(args[0]);
        return orig.apply(this, args);
      };
    });
  }

  /* ---------- CSV (Blob) + PDF (window.open → document.write) patches ---------- */
  function patchBlob() {
    if (!global.Blob || global.Blob.__instI18n) return;
    var Orig = global.Blob;
    function Patched(parts, opts) {
      if (INST.active && parts) {
        parts = parts.map(function (p) {
          return (typeof p === 'string') ? translate(p, true) : p;
        });
      }
      return new Orig(parts, opts);
    }
    Patched.prototype = Orig.prototype;
    global.Blob = Patched;
  }

  function patchOpen() {
    if (global.open.__instI18n) return;
    var origOpen = global.open.bind(global);
    var patched = function (url, target, features) {
      var w = origOpen(url, target, features);
      if (INST.active && w) {
        try {
          var doc = w.document;
          var origWrite = doc.write.bind(doc);
          doc.write = function (html) {
            if (typeof html !== 'string') return origWrite(html);
            if (/lang="fr"/.test(html)) html = html.replace(/lang="fr"/g, 'lang="en"');
            return origWrite(translate(html, true));
          };
        } catch (e) {}
      }
      return w;
    };
    patched.__instI18n = true;
    try { global.open = patched; } catch (e) {}
  }

  /* ---------- fr-FR number formatting → English ---------- */
  function patchIntl() {
    try {
      if (global.Intl && global.Intl.NumberFormat && !global.Intl.NumberFormat.__instI18n) {
        var OrigNF = global.Intl.NumberFormat;
        function NF(locales, opts) {
          if (INST.active && (locales === 'fr-FR' || locales === 'fr' || locales === 'fr-CA')) locales = 'en-US';
          return new OrigNF(locales, opts);
        }
        NF.__instI18n = true;
        NF.supportedLocalesOf = OrigNF.supportedLocalesOf;
        global.Intl.NumberFormat = NF;
      }
      var Num = global.Number.prototype, Dat = global.Date.prototype;
      if (!Num.__instI18n) {
        Num.__instI18n = true;
        var nts = Num.toLocaleString;
        Num.toLocaleString = function () {
          var a = arguments;
          if (INST.active && a.length && typeof a[0] === 'string' && /^fr\b|fr-FR/.test(a[0])) {
            a = ['en-US'].concat(Array.prototype.slice.call(a, 1));
          }
          return nts.apply(this, a);
        };
      }
      if (!Dat.__instI18n) {
        Dat.__instI18n = true;
        var dts = Dat.toLocaleDateString;
        Dat.toLocaleDateString = function () {
          var a = arguments;
          if (INST.active && a.length && typeof a[0] === 'string' && /^fr\b|fr-FR/.test(a[0])) {
            a = ['en-US'].concat(Array.prototype.slice.call(a, 1));
          }
          return dts.apply(this, a);
        };
      }
    } catch (e) {}
  }

  /* ---------- Language change handling ---------- */
  function apply(initial) {
    var next = shouldBeActive();
    var changed = next !== INST.active;
    INST.active = next;
    if (changed && !initial) {
      /* Real language switch: restore/translate text, then let each dashboard
         redraw so its Canvas labels follow the locale. */
      walk(document.body);
      attachShadows();
      observedShadows.forEach(walk);
      refreshDashboards();
    } else if (initial) {
      walk(document.body);
      attachShadows();
    }
  }

  function boot() {
    patchCanvas();
    patchBlob();
    patchOpen();
    patchIntl();
    apply(true);
    new MutationObserver(schedulePass).observe(document.body, { childList: true, characterData: true, subtree: true });
    document.addEventListener('nutri:i18nChanged', function () { setTimeout(function () { apply(false); }, 30); });
    /* Safety poll for environments that bypass the i18n change event. */
    setInterval(function () { if (shouldBeActive() !== INST.active) apply(false); }, 700);
    /* Late-booting shadow roots (components mount ~1.5s after load). */
    [400, 900, 1500, 2200, 3000, 4000].forEach(function (ms) {
      setTimeout(function () { attachShadows(); if (INST.active) { walk(document.body); observedShadows.forEach(walk); } }, ms);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
