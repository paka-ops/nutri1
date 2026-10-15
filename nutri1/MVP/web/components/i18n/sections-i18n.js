/* ============================================================================
 * NUTRI.N°1 · components/i18n/sections-i18n.js
 * Rôle    : Moteur d'internationalisation FR ↔ EN des composants institutionnels
 *           (sections agri, health, who/oms, fao, wfp et leurs tableaux de bord
 *           Shadow DOM).
 *
 *  Principe :
 *    - Les composants sont écrits en français (langue source).
 *    - Chaque composant enregistre ses chaînes via I18N.register(ns, {exact, phrase}).
 *    - I18N.t(str) traduit une chaîne : d'abord la table exacte, sinon les
 *      phrases (remplacement par sous-chaînes, de la plus longue à la plus
 *      courte) — cela couvre les textes composés dynamiquement.
 *    - I18N.translateTree(root) traduit textes + attributs (title, placeholder,
 *      aria-label, alt) et mémorise l'original (retour en français possible).
 *    - I18N.wrapCtx(ctx) enveloppe un contexte Canvas 2D pour traduire les
 *      libellés dessinés (fillText / strokeText / measureText).
 *    - I18N.watch(root) traduit un sous-arbre (Shadow DOM inclus) et le suit
 *      via MutationObserver (traduction des mises à jour dynamiques).
 *    - La langue suit le sélecteur #language de la page :
 *      « Français » → fr, tout autre choix → en (anglais international).
 *      Événements : nutri:i18nChanged (NUTRI_I18N), change sur #language.
 *
 *  À charger AVANT les dictionnaires (*-i18n.js) et les composants.
 * ========================================================================== */
(function (global) {
  'use strict';

  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  const PHRASE_MIN = 4; // ignore les fragments trop courts (trop risqués)

  /* Tables globales fusionnées */
  const exact = Object.create(null);
  let phraseList = null; // [[fr, en], …] triés par longueur décroissante
  let phraseMap = null;
  let phraseRe = null;
  let wordMap = null; // {mot: en} — remplacement par entités lexicales
  let wordRe = null;
  const namespaces = Object.create(null);

  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Mots (mois, pays, unités) : remplacement GARANTI par limites lexicales
     (jamais au milieu d'un mot) — pour les chaînes dynamiques composées. */
  function rebuildWords() {
    const map = Object.create(null);
    const keys = [];
    for (const ns of Object.keys(namespaces)) {
      const w = namespaces[ns].word || {};
      for (const k of Object.keys(w)) {
        apoVariants(k).forEach((kk) => {
          if (!(kk in map)) { map[kk] = w[k]; keys.push(kk); }
        });
      }
    }
    keys.sort((a, b) => b.length - a.length);
    wordMap = map;
    wordRe = keys.length
      ? new RegExp('(^|[^A-Za-z\\u00C0-\\u024F0-9])(' + keys.map(escRe).join('|') + ')(?=$|[^A-Za-z\\u00C0-\\u024F0-9])', 'g')
      : null;
  }

  function applyWords(str) {
    if (!wordRe) return str;
    wordRe.lastIndex = 0;
    return str.replace(wordRe, (m, pre, w) => pre + wordMap[w]);
  }

  /* Variantes d'apostrophe (’ vs ') : une clé est enregistrée dans ses deux formes */
  function apoVariants(k) {
    const out = [k];
    if (k.indexOf('\u2019') >= 0) out.push(k.split('\u2019').join("'"));
    if (k.indexOf("'") >= 0) out.push(k.split("'").join('\u2019'));
    return out;
  }

  function rebuildPhrases() {
    const seen = Object.create(null);
    const list = [];
    for (const ns of Object.keys(namespaces)) {
      const p = namespaces[ns].phrase || {};
      for (const k of Object.keys(p)) {
        if (k.length < PHRASE_MIN) continue;
        apoVariants(k).forEach((kk) => {
          if (seen[kk]) return;
          seen[kk] = true;
          list.push([kk, p[k]]);
        });
      }
    }
    list.sort((a, b) => b[0].length - a[0].length);
    phraseList = list;
    phraseMap = Object.create(null);
    list.forEach(([kk, en]) => { phraseMap[kk] = en; });
    phraseRe = list.length
      ? new RegExp('(^|[^A-Za-z\\u00C0-\\u024F0-9])(' + list.map((x) => escRe(x[0])).join('|') + ')(?=$|[^A-Za-z\\u00C0-\\u024F0-9])', 'g')
      : null;
  }

  /* ------------------------------------------------------------------ */
  /* Langue courante                                                     */
  /* ------------------------------------------------------------------ */
  let current = null; // 'fr' | 'en'

  function detect() {
    let raw = null;
    try {
      const sel = document.getElementById('language') || document.getElementById('lang') ||
        document.querySelector('select[name="language"]');
      raw = (sel && sel.value) || (global.NUTRI_I18N && global.NUTRI_I18N.locale) ||
        global.localStorage.getItem('nutri_language') || '';
    } catch (e) { raw = ''; }
    const s = String(raw || '').toLowerCase();
    return (s === 'fr' || s === 'fra' || s.indexOf('fran') === 0) ? 'fr' : 'en';
  }

  /* ------------------------------------------------------------------ */
  /* Traduction de chaîne                                                */
  /* ------------------------------------------------------------------ */
  function applyPhrases(str) {
    if (!phraseList || !phraseRe) return str;
    phraseRe.lastIndex = 0;
    return str.replace(phraseRe, (m, pre) => pre + phraseMap[m.slice(pre.length)]);
  }

  function t(str) {
    if (str == null) return str;
    if (current !== 'en') return str;
    const s = String(str);
    const trimmed = s.trim();
    if (!trimmed) return s;
    const hit = exact[trimmed];
    if (hit != null) {
      // préserve les espaces autour
      const lead = s.match(/^\s*/)[0];
      const tail = s.match(/\s*$/)[0];
      return lead + hit + tail;
    }
    const replaced = applyWords(applyPhrases(trimmed));
    if (replaced === trimmed) return s;
    const lead = s.match(/^\s*/)[0];
    const tail = s.match(/\s*$/)[0];
    return lead + replaced + tail;
  }

  /* ------------------------------------------------------------------ */
  /* Traduction DOM (textes + attributs), réversible                     */
  /* ------------------------------------------------------------------ */
  function translateTextNode(node) {
    const orig = node._nsi18n !== undefined ? node._nsi18n : (node._nsi18n = node.nodeValue);
    const next = t(orig);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttrs(el) {
    for (let i = 0; i < ATTRS.length; i++) {
      const name = ATTRS[i];
      if (!el.hasAttribute || !el.hasAttribute(name)) continue;
      if (!el._nsi18nAttrs) el._nsi18nAttrs = Object.create(null);
      if (el._nsi18nAttrs[name] === undefined) el._nsi18nAttrs[name] = el.getAttribute(name);
      const next = t(el._nsi18nAttrs[name]);
      if (el.getAttribute(name) !== next) el.setAttribute(name, next);
    }
  }

  function translateTree(root) {
    if (!root) return;
    const doc = root.ownerDocument || document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === 1) {
          const tag = node.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
        const p = node.parentElement;
        if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'NOSCRIPT')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n = walker.currentNode;
    while (n) {
      if (n.nodeType === 3) translateTextNode(n);
      else translateAttrs(n);
      n = walker.nextNode();
    }
    if (root.nodeType === 1) translateAttrs(root);
  }

  function translateHtml(html) {
    if (current !== 'en') return html;
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    translateTree(tpl.content);
    return tpl.innerHTML;
  }

  /* ------------------------------------------------------------------ */
  /* Contexte Canvas proxyé (libellés de graphiques)                     */
  /* ------------------------------------------------------------------ */
  function wrapCtx(ctx) {
    if (!ctx || ctx.__nsi18n) return ctx;
    const proxy = new Proxy(ctx, {
      get(target, prop) {
        const v = target[prop];
        if (typeof v !== 'function') return v;
        if (prop === 'fillText' || prop === 'strokeText') {
          return function (text, x, y, maxWidth) {
            if (maxWidth === undefined) target[prop](t(text), x, y);
            else target[prop](t(text), x, y, maxWidth);
          };
        }
        if (prop === 'measureText') {
          return function (text) { return target.measureText(t(text)); };
        }
        return v.bind(target);
      },
      /* Indispensable : sans piège 'set', l'affectation (ctx.fillStyle = …) est
         réfléchie avec le Proxy comme récepteur → le contexte natif refuse
         (« Illegal invocation ») et les graphiques ne se dessinent pas. */
      set(target, prop, value) {
        return Reflect.set(target, prop, value, target);
      }
    });
    proxy.__nsi18n = true;
    return proxy;
  }

  /* ------------------------------------------------------------------ */
  /* Observation d'un sous-arbre (Shadow DOM compris)                    */
  /* ------------------------------------------------------------------ */
  const watched = new Set();
  const timers = new WeakMap();

  function watch(root) {
    if (!root || watched.has(root)) return;
    watched.add(root);
    translateTree(root);
    if (!global.MutationObserver) return;
    const mo = new global.MutationObserver(() => {
      if (timers.get(root)) return;
      timers.set(root, setTimeout(() => {
        timers.set(root, null);
        translateTree(root);
      }, 60));
    });
    mo.observe(root, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  /* ------------------------------------------------------------------ */
  /* Changement de langue                                                */
  /* ------------------------------------------------------------------ */
  const listeners = [];

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function applyAll() {
    watched.forEach((root) => translateTree(root));
    listeners.forEach((fn) => {
      try { fn(current); } catch (e) { console.error('[NutriSectionsI18N] onChange', e); }
    });
  }

  function sync() {
    const next = detect();
    if (next === current) return;
    current = next;
    try { global.document.documentElement.setAttribute('data-sections-lang', current); } catch (e) {}
    applyAll();
  }

  /* ------------------------------------------------------------------ */
  /* API publique                                                        */
  /* ------------------------------------------------------------------ */
  const I18N = {
    register(ns, tables) {
      namespaces[ns] = tables || {};
      const ex = (tables && tables.exact) || {};
      for (const k of Object.keys(ex)) {
        apoVariants(k).forEach((kk) => { exact[kk] = ex[k]; });
      }
      rebuildPhrases();
      rebuildWords();
      // re-traduit immédiatement si des racines sont déjà observées
      if (current) applyAll();
    },
    t,
    translateTree,
    translateHtml,
    wrapCtx,
    watch,
    onChange,
    sync,
    getLang() { return current || (current = detect()); },
    /* Alias pratique pour les composants */
    T(str) { return t(str); }
  };

  global.NutriSectionsI18N = I18N;

  /* ------------------------------------------------------------------ */
  /* Câblage automatique avec la page hôte                               */
  /* ------------------------------------------------------------------ */
  function bindHost() {
    sync();
    document.addEventListener('nutri:i18nChanged', () => sync());
    const sel = document.getElementById('language') || document.getElementById('lang') ||
      document.querySelector('select[name="language"]');
    if (sel && !sel._nsi18nBound) {
      sel._nsi18nBound = true;
      sel.addEventListener('change', () => sync());
    }
    // Le sélecteur peut être reconstruit (V34) : on suit les mutations du header.
    if (global.MutationObserver && !I18N._hostObserved) {
      I18N._hostObserved = true;
      const mo = new global.MutationObserver(() => {
        const s = document.getElementById('language') || document.getElementById('lang');
        if (s && !s._nsi18nBound) {
          s._nsi18nBound = true;
          s.addEventListener('change', () => sync());
          sync();
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindHost);
  else bindHost();
})(window);
