/* Audit de contraste : mini-moteur de cascade CSS sur le DOM réel (jsdom).
   Pour chaque élément contenant du texte dans une section, il calcule la
   couleur gagnante et le premier fond opaque ancêtre, résout les var(),
   puis applique le ratio de contraste WCAG. Signale tout texte illisible. */
const fs = require('fs');
const H = require('./harness');
const path = require('path');
const WEB = process.env.NV_WEB || path.join(__dirname, '..', '..', 'nutri1', 'MVP', 'web');

/* --- parsing CSS --- */
function parseRules(css, mediaStack) {
  css = css.replace(/@import[^;]+;/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const selector = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < n && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const body = css.slice(open + 1, j - 1);
    if (/^@media/i.test(selector)) {
      rules.push(...parseRules(body, (mediaStack || []).concat(selector.replace(/^@media\s*/i, '').trim())));
    } else if (/^@(keyframes|font-face|supports|charset)/i.test(selector)) {
      /* ignoré pour l'audit de couleurs */
    } else if (selector && !/^@/.test(selector)) {
      const decls = {};
      body.split(';').forEach((d) => {
        const k = d.indexOf(':');
        if (k < 0) return;
        const prop = d.slice(0, k).trim().toLowerCase();
        let val = d.slice(k + 1).trim();
        if (!prop) return;
        const imp = /!important$/i.test(val);
        if (imp) val = val.replace(/!important$/i, '').trim();
        if (decls[prop] && decls[prop].important && !imp) return;
        decls[prop] = { value: val, important: imp };
      });
      selector.split(',').forEach((s) => {
        s = s.trim();
        if (s) rules.push({ sel: s, decls, media: (mediaStack || []).join(' and ') });
      });
    }
    i = j;
  }
  return rules;
}
function specificity(sel) {
  let a = 0, b = 0, c = 0;
  const s = sel.replace(/\[([^\]]*)\]/g, (m) => { b++; return ' '; })
    .replace(/::?[a-zA-Z-]+(\([^)]*\))?/g, (m) => { if (m.indexOf('::') === 0) c++; else b++; return ' '; });
  s.split(/[\s>+~]+/).forEach((part) => {
    if (!part) return;
    (part.match(/#[\w-]+/g) || []).forEach(() => a++);
    (part.match(/\.[\w-]+/g) || []).forEach(() => b++);
    (part.match(/(^|[^.\w-])[a-zA-Z][\w-]*/g) || []).forEach(() => c++);
  });
  return a * 10000 + b * 100 + c;
}

/* --- couleurs --- */
function parseColor(str) {
  if (!str) return null;
  str = String(str).trim();
  let m = str.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    if (h.length === 4) h = h.split('').map((x) => x + x).join('').slice(0, 6);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = str.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map((x) => parseFloat(x));
    if (p.length < 3 || p.slice(0, 3).some(isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 && !isNaN(p[3]) ? p[3] : 1 };
  }
  const named = { white: '#ffffff', black: '#000000', transparent: 'rgba(0,0,0,0)' };
  if (named[str.toLowerCase()]) return parseColor(named[str.toLowerCase()]);
  return null;
}
function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function over(fg, bg) { /* composition alpha */
  const a = fg.a == null ? 1 : fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}
function contrast(fg, bg) {
  const l1 = lum(fg), l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

(async () => {
  const SECTION = process.argv[2] || 'citizen';
  const { doc, win } = await H.load();
  /* la section auditée doit être la vue active, sinon tout son contenu est
     considéré comme masqué (display:none sur .view:not(.on)) */
  if (SECTION !== 'citizen' && typeof win.go === 'function') { win.go(SECTION); await H.sleep(1500); }

  /* largeur de référence : la démo investisseur est regardée sur grand écran,
     mais on peut auditer un breakpoint avec NV_W=390 (mobile) */
  const VW = parseInt(process.env.NV_W || '1440', 10);
  function mediaMatches(mq) {
    if (!mq) return true;
    if (/print/i.test(mq)) return false;
    if (/prefers-reduced-motion|prefers-color-scheme/i.test(mq)) return true;
    let ok = true;
    const parts = mq.split(/\s+and\s+/i);
    parts.forEach((part) => {
      const mm = part.replace(/[()]/g, '').trim().match(/^(min|max)-width\s*:\s*(\d+(?:\.\d+)?)(px)?$/i);
      if (!mm) return;
      const v = parseFloat(mm[2]);
      if (mm[1].toLowerCase() === 'min' && VW < v) ok = false;
      if (mm[1].toLowerCase() === 'max' && VW > v) ok = false;
    });
    return ok;
  }

  /* feuilles de style dans l'ordre de la cascade */
  const sheets = [];
  Array.prototype.slice.call(doc.querySelectorAll('style, link[rel="stylesheet"]')).forEach((el) => {
    if (el.tagName === 'STYLE') sheets.push({ name: el.id || 'style-inline', css: el.textContent });
    else {
      const href = el.getAttribute('href');
      if (!href || /^https?:/.test(href)) return;      /* polices/CDN distants : hors audit */
      const f = WEB + '/' + href.replace(/^\.\//, '');
      if (fs.existsSync(f)) sheets.push({ name: href, css: fs.readFileSync(f, 'utf8') });
    }
  });
  const all = [];
  sheets.forEach((sh, si) => parseRules(sh.css).forEach((r) => { r.sheet = si; r.order = all.length; all.push(r); }));
  console.log('feuilles analysées : ' + sheets.map((s) => s.name).join(', ') + ' · règles : ' + all.length);

  /* variables personnalisées : :root puis .nv-scope */
  const varsRoot = {}, varsScope = {};
  all.forEach((r) => {
    const target = r.sel === ':root' || r.sel === 'html' ? varsRoot : (r.sel === '.nv-scope' ? varsScope : null);
    if (!target) return;
    if (!mediaMatches(r.media)) return;
    Object.keys(r.decls).forEach((p) => { if (p.startsWith('--')) target[p] = r.decls[p].value; });
  });
  const VARS = Object.assign({}, varsRoot, varsScope);
  function resolveVars(val, depth) {
    if (depth > 6 || typeof val !== 'string') return val;
    return val.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (m, name, fb) => {
      const v = VARS[name];
      return v != null ? resolveVars(v, depth + 1) : (fb ? resolveVars(fb.trim(), depth + 1) : '');
    });
  }

  /* valeur gagnante d'une propriété pour un élément.
     pseudo=true → inclut les règles « sel::before / sel::after » qui peignent
     réellement le fond (le cockpit sombre de .nv-scope est sur ::before). */
  function winning(el, prop, pseudo) {
    let best = null, bestKey = null;
    for (let i = 0; i < all.length; i++) {
      const r = all[i], d = r.decls[prop];
      if (!d) continue;
      if (!mediaMatches(r.media)) continue;
      let sel = r.sel, isPseudo = false;
      const pm = sel.match(/::?(before|after)$/i);
      if (pm) { isPseudo = true; sel = sel.slice(0, pm.index).trim(); if (!pseudo || !sel) continue; }
      else if (pseudo === 'only') continue;
      let m = false;
      try { m = el.matches(sel); } catch (e) { continue; }
      if (!m) continue;
      if (isPseudo && !r.decls.content) continue;
      const key = [d.important ? 1 : 0, specificity(r.sel), r.order];
      if (!bestKey || key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) {
        bestKey = key; best = { value: d.value, important: d.important, sel: r.sel, sp: key[1], or: r.order, sh: r.sheet };
      }
    }
    if (process.env.DBGSEL && best && global.__dbgEl === el) console.log('     [DBG] ' + prop + ' ← ' + best.sel + '  =  ' + String(best.value).slice(0, 50) + '  (spéc ' + best.sp + ', feuille ' + best.sh + ', ordre ' + best.or + ', imp ' + best.important + ')');
    return best ? resolveVars(best.value, 0) : null;
  }
  function colorsOf(decl) {
    /* tous les arrêts de couleur d'une déclaration background, dans l'ordre CSS
       (la première couche est peinte AU-DESSUS des suivantes) */
    const out = [];
    const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
    let m;
    while ((m = re.exec(decl || ''))) { const c = parseColor(m[0]); if (c) out.push(c); }
    return out;
  }
  /* Fond effectif d'un élément.
     Dans le cockpit (.nv-scope) la toile de fond est peinte par ::before avec
     un dégradé dont la couche basse est opaque et sombre : on prend cette
     couleur comme base, puis on compose les teintes translucides de l'élément
     et de ses ancêtres (panneaux, tuiles, pastilles). */
  function scopeBase(scopeEl) {
    const decls = [winning(scopeEl, 'background', true), winning(scopeEl, 'background-image', true), winning(scopeEl, 'background-color', true)];
    let cols = [];
    decls.forEach((d) => { if (d) colorsOf(d).forEach((c) => cols.push(c)); });
    const opaque = cols.filter((c) => c.a >= 0.99);
    if (!opaque.length) return { r: 4, g: 16, b: 12, a: 1 };
    opaque.sort((x, y) => lum(x) - lum(y));
    return opaque[0];
  }
  function bgOf(el) {
    const scope = el.closest ? el.closest('.nv-scope') : null;
    /* texte en dégradé : son propre fond est la peinture des glyphes, pas le décor */
    let startEl = el;
    if (clipText(el)) startEl = el.parentElement || el;
    const base = scope ? scopeBase(scope) : { r: 238, g: 245, b: 240, a: 1 };  /* thème clair hérité */
    const layers = [];
    let cur = startEl;
    while (cur && cur.nodeType === 1 && cur !== scope) {
      const decls = [];
      const push = (v) => { if (v) decls.push(resolveVars(v, 0)); };
      push(winning(cur, 'background-color'));
      push(winning(cur, 'background'));
      push(winning(cur, 'background-image'));
      const cols = [];
      decls.forEach((d) => colorsOf(d).forEach((c) => cols.push(c)));
      /* les couches d'une même déclaration : la première est au-dessus */
      for (let i = cols.length - 1; i >= 0; i--) layers.push(cols[i]);
      cur = cur.parentElement;
    }
    let out = base;
    for (let i = layers.length - 1; i >= 0; i--) {
      const c = layers[i];
      if (c.a >= 0.999) { out = c; continue; }
      out = over(c, out);
    }
    return out;
  }
  function hidden(el) {
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const d = winning(cur, 'display'), v = winning(cur, 'visibility');
      /* opacity:0 vient des animations d'entrée (non jouées par jsdom) → ignorée */
      if (d === 'none' || v === 'hidden') return true;
      if (cur.style && (cur.style.display === 'none' || cur.style.visibility === 'hidden')) return true;
      cur = cur.parentElement;
    }
    return false;
  }
  function clipText(el) {
    const bc = (winning(el, 'background-clip') || '') + ' ' + (winning(el, '-webkit-background-clip') || '');
    const tf = winning(el, '-webkit-text-fill-color') || '';
    return /text/.test(bc) || tf === 'transparent';
  }

  /* éléments porteurs de texte dans la section */
  const sec = doc.getElementById(SECTION);
  const nodes = [];
  (function walk(el) {
    Array.prototype.slice.call(el.children).forEach(walk);
    const hasText = Array.prototype.slice.call(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (hasText) nodes.push(el);
  })(sec);

  const problems = [];
  let checked = 0, skippedHidden = 0, gradTexts = 0;
  let __n = 0;
  if (process.env.DBGCHIP) {
    const chip = nodes.find((n) => typeof n.className === 'string' && /nv-chip-(warn|ok|risk|good|neutral)/.test(n.className));
    if (chip) {
      console.log('  CHIP:', chip.className, '\u00ab', chip.textContent.trim().slice(0, 40), '\u00bb');
      console.log('   inline:', chip.getAttribute('style'));
      all.forEach((r) => {
        const d = r.decls.color;
        if (!d || !mediaMatches(r.media)) return;
        const sel = r.sel.replace(/::?(before|after)$/i, '');
        try { if (!sel || !chip.matches(sel)) return; } catch (e) { return; }
        console.log('   feuille' + r.sheet + ' #' + r.order + ' spec' + specificity(r.sel) + (d.important ? ' !IMP' : '     ') + ' [' + r.sel + '] -> ' + d.value);
      });
      console.log('   >>> GAGNANT:', winning(chip, 'color'), '| bg:', JSON.stringify(bgOf(chip)));
    }
  }
  nodes.forEach((el) => {
    if (process.env.ONLY && __n++ >= parseInt(process.env.ONLY, 10)) return;
    if (el.closest('canvas,svg')) return;
    if (hidden(el)) {
      skippedHidden++;
      return;
    }
    const cs = winning(el, 'color');
    if (!cs) return;
    const bg = bgOf(el);
    /* texte peint par un dégradé (background-clip:text) : on teste chaque arrêt */
    let fgList;
    if (clipText(el) || resolveVars(cs, 0) === 'transparent') {
      const stops = colorsOf(resolveVars(winning(el, 'background-image') || winning(el, 'background') || '', 0));
      if (!stops.length) return;
      gradTexts++;
      fgList = stops;
    } else {
      const fgRaw = parseColor(resolveVars(cs, 0));
      if (!fgRaw) return;
      fgList = [fgRaw];
    }
    let worst = Infinity, worstFg = null;
    fgList.forEach((c) => { const fg = over(c, bg); const r = contrast(fg, bg); if (r < worst) { worst = r; worstFg = fg; } });
    const fsPx = parseFloat(resolveVars(winning(el, 'font-size') || '14px', 0)) || 14;
    const weight = parseInt(resolveVars(winning(el, 'font-weight') || '400', 0), 10) || 400;
    const large = fsPx >= 24 || (fsPx >= 18.66 && weight >= 700);
    const min = large ? 3.0 : 4.5;
    checked++;
    if (worst < min) {
      problems.push({
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').slice(0, 2).join('.') : ''),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 46),
        fg: 'rgb(' + [worstFg.r, worstFg.g, worstFg.b].map(Math.round).join(',') + ')',
        bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(',') + ')',
        ratio: Math.round(worst * 100) / 100, min, fsPx
      });
    }
  });
  console.log('éléments masqués ignorés : ' + skippedHidden + ' · textes en dégradé : ' + gradTexts);

  console.log('\nsection #' + SECTION + ' · éléments texte analysés : ' + checked);
  console.log('textes sous le seuil WCAG AA : ' + problems.length);
  problems.sort((a, b) => a.ratio - b.ratio).slice(0, 30).forEach((p) => {
    console.log('  ✗ ' + p.ratio + ':1 (min ' + p.min + ') · ' + p.sel + ' · fg=' + p.fg + ' bg=' + p.bg + ' · « ' + p.text + ' »');
  });
  fs.writeFileSync(require('path').join(__dirname, 'contrast-' + SECTION + '.json'), JSON.stringify(problems, null, 1));
  win.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
