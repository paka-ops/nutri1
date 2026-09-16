/* ============================================================================
   NUTRI.N°1 — NUTRI CORE (v58)
   Socle réutilisable : utilitaires DOM, formatage, statistiques/prévision,
   moteur de graphiques SVG (aucune dépendance externe), export, tiroirs,
   animations, registre de modules.

   Usage minimal par une autre section :
     NX.register('health', { mount(root, ctx){ ... }, refresh(){ ... } });
   ========================================================================== */
(function (w, d) {
  'use strict';
  if (w.NX && w.NX.__v58) return;

  /* ------------------------------------------------------------------ DOM -- */
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (sel, root) => (root || d).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || d).querySelectorAll(sel));

  function h(tag, attrs, children) {
    const parts = String(tag).split('.');
    const node = d.createElement(parts.shift());
    if (parts.length) node.className = parts.join(' ');
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class' || k === 'className') node.className = (node.className ? node.className + ' ' : '') + v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else node.setAttribute(k, v);
      }
    }
    append(node, children);
    return node;
  }
  function append(node, children) {
    if (children == null) return node;
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? d.createTextNode(String(c)) : c);
    });
    return node;
  }
  function svg(tag, attrs) {
    const n = d.createElementNS(NS, tag);
    for (const k in (attrs || {})) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v; else n.setAttribute(k, v);
    }
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function debounce(fn, ms) { let t; return function () { const a = arguments, self = this; clearTimeout(t); t = setTimeout(() => fn.apply(self, a), ms || 120); }; }
  function uid(p) { uid.n = (uid.n || 0) + 1; return (p || 'nx') + '-' + uid.n + '-' + Math.random().toString(36).slice(2, 7); }

  /* --------------------------------------------------------------- format -- */
  let LANG = (function () {
    try { return (w.localStorage && w.localStorage.getItem('nutri_language')) || 'fr'; } catch (e) { return 'fr'; }
  })();
  const DEFAULT_FR = { BJ: 1, BF: 1, CI: 1, GW: 1, ML: 1, NE: 1, SN: 1, TG: 1, GN: 1, TD: 1, MR: 1 };
  function locale(withCountry) {
    if (LANG === 'fr') return 'fr-FR';
    if (LANG === 'es') return 'es-ES';
    if (LANG === 'pt') return 'pt-PT';
    return 'en-GB';
  }
  const CURRENCY = {
    BJ: ['XOF', 'FCFA', 610], BF: ['XOF', 'FCFA', 610], CI: ['XOF', 'FCFA', 610], GW: ['XOF', 'FCFA', 610],
    ML: ['XOF', 'FCFA', 610], NE: ['XOF', 'FCFA', 610], SN: ['XOF', 'FCFA', 610], TG: ['XOF', 'FCFA', 610],
    GN: ['GNF', 'GNF', 8600], GM: ['GMD', 'GMD', 71], GH: ['GHS', 'GHS', 15.2], LR: ['LRD', 'LRD', 192],
    NG: ['NGN', '₦', 1550], SL: ['SLE', 'SLE', 22.5], CV: ['CVE', 'CVE', 101], MR: ['MRU', 'MRU', 39.8], TD: ['XAF', 'FCFA', 605]
  };
  const fmt = {
    locale,
    setLocale(l) { LANG = l || LANG; },
    /** nombre avec séparateurs, d = décimales */
    num(v, dec) {
      if (v == null || isNaN(v)) return '—';
      const dd = dec == null ? (Math.abs(v) < 10 && Math.abs(v) > 0 && !Number.isInteger(v) ? 2 : 0) : dec;
      try { return new Intl.NumberFormat(locale(), { minimumFractionDigits: dd, maximumFractionDigits: dd }).format(v); }
      catch (e) { return String(Math.round(v)); }
    },
    int(v) { return fmt.num(v, 0); },
    dec(v, dd) { return fmt.num(v, dd == null ? 1 : dd); },
    /** 1234567 -> « 1,23 M » */
    compact(v, dec) {
      if (v == null || isNaN(v)) return '—';
      const a = Math.abs(v), s = v < 0 ? '-' : '';
      const dd = dec == null ? 2 : dec;
      if (a >= 1e9) return s + fmt.num(a / 1e9, dd) + ' Md';
      if (a >= 1e6) return s + fmt.num(a / 1e6, dd) + ' M';
      if (a >= 1e4) return s + fmt.num(a / 1e3, dd) + ' k';
      if (a >= 1000) return s + fmt.num(a, 0);
      if (a >= 10) return s + fmt.num(a, 0);
      return s + fmt.num(a, a < 1 ? 2 : 1);
    },
    /** tonnes -> t / kt / Mt */
    tons(v, dec) {
      if (v == null || isNaN(v)) return '—';
      const a = Math.abs(v), s = v < 0 ? '-' : '';
      const dd = dec == null ? 2 : dec;
      if (a >= 1e6) return s + fmt.num(a / 1e6, dd) + ' Mt';
      if (a >= 1e3) return s + fmt.num(a / 1e3, dd) + ' kt';
      return s + fmt.num(a, a < 10 ? 1 : 0) + ' t';
    },
    kg(v) { return v >= 1e6 ? fmt.num(v / 1e6, 2) + ' kt' : v >= 1000 ? fmt.num(v / 1000, 2) + ' kt' : fmt.num(v, 0) + ' kg'; },
    pct(v, dec) { return v == null || isNaN(v) ? '—' : fmt.num(v, dec == null ? 1 : dec) + ' %'; },
    signed(v, dec) { return (v > 0 ? '+' : '') + fmt.num(v, dec == null ? 1 : dec); },
    /** valeur USD -> devise locale + USD */
    money(usd, country) {
      if (usd == null || isNaN(usd)) return '—';
      const c = CURRENCY[country] || ['USD', '$', 1];
      return fmt.compact(usd * c[2], 2) + ' ' + c[1];
    },
    usd(v) { return fmt.compact(v, 2) + ' $'; },
    ha(v) { return v >= 1e6 ? fmt.num(v / 1e6, 2) + ' M ha' : v >= 1000 ? fmt.num(v / 1000, 1) + ' k ha' : fmt.num(v, 0) + ' ha'; },
    date(dt, opts) { try { return new Intl.DateTimeFormat(locale(), opts || { day: '2-digit', month: 'short', year: 'numeric' }).format(dt); } catch (e) { return String(dt); } },
    time(dt) { try { return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(dt); } catch (e) { return ''; } }
  };

  /* --------------------------------------------------------------- aléatoire */
  function hash(str) {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = {
    hash,
    /** générateur déterministe : rng.fn('TG|maize|2024') */
    fn(seedStr) { return mulberry(hash(seedStr)); },
    /** valeur déterministe dans [min,max] */
    between(seedStr, min, max) { return min + mulberry(hash(seedStr))() * (max - min); },
    /** bruit gaussien centré */
    gauss(seedStr, sigma) {
      const r = mulberry(hash(seedStr));
      let u = 0, v = 0;
      while (u === 0) u = r(); while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * (sigma || 1);
    },
    pick(seedStr, arr) { return arr[Math.floor(mulberry(hash(seedStr))() * arr.length) % arr.length]; }
  };

  /* ----------------------------------------------------------- statistiques */
  const stats = {
    sum(a) { return a.reduce((x, y) => x + y, 0); },
    mean(a) { return a.length ? stats.sum(a) / a.length : 0; },
    sd(a) {
      if (a.length < 2) return 0;
      const m = stats.mean(a);
      return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1));
    },
    min(a) { return Math.min.apply(null, a); },
    max(a) { return Math.max.apply(null, a); },
    median(a) { return stats.quantile(a, .5); },
    quantile(a, q) {
      if (!a.length) return 0;
      const s = a.slice().sort((x, y) => x - y);
      const pos = (s.length - 1) * q, base = Math.floor(pos), rest = pos - base;
      return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
    },
    /** régression linéaire simple */
    linreg(x, y) {
      const n = Math.min(x.length, y.length);
      if (n < 2) return { slope: 0, intercept: y[0] || 0, r2: 0, n };
      const mx = stats.mean(x.slice(0, n)), my = stats.mean(y.slice(0, n));
      let sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
      const slope = sxx ? sxy / sxx : 0;
      return { slope, intercept: my - slope * mx, r2: syy ? (sxy * sxy) / (sxx * syy) : 0, n, mx, my };
    },
    /** Holt-Winters additif (niveau/tendance/saison) -> prévision + intervalles */
    holtWinters(series, opts) {
      const o = Object.assign({ season: 0, alpha: .42, beta: .16, gamma: .28, damped: true, phi: .94 }, opts || {});
      const y = series.filter(v => v != null && !isNaN(v));
      const n = y.length;
      if (n < 3) return { fitted: y.slice(), level: y[n - 1] || 0, trend: 0, residSd: 0, seasonal: [] };
      const season = o.season > 1 && n >= o.season * 2 ? o.season : 0;
      let level = y[0], trend = (y[n - 1] - y[0]) / Math.max(1, n - 1);
      let seasonal = new Array(season).fill(0), fitted = [];
      if (season) {
        const m = stats.mean(y), sums = new Array(season).fill(0), cnt = new Array(season).fill(0);
        y.forEach((v, i) => { sums[i % season] += v - m; cnt[i % season]++; });
        seasonal = sums.map((s, i) => cnt[i] ? s / cnt[i] : 0);
      }
      for (let i = 0; i < n; i++) {
        const s = season ? seasonal[i % season] : 0;
        const pred = level + (o.damped ? o.phi : 1) * trend + s;
        fitted.push(pred);
        const prevLevel = level;
        level = o.alpha * (y[i] - s) + (1 - o.alpha) * (level + (o.damped ? o.phi : 1) * trend);
        trend = o.beta * (level - prevLevel) + (1 - o.beta) * (o.damped ? o.phi : 1) * trend;
        if (season) seasonal[i % season] = o.gamma * (y[i] - level) + (1 - o.gamma) * s;
      }
      const resid = y.map((v, i) => v - fitted[i]);
      return { fitted, level, trend, seasonal, residSd: stats.sd(resid), resid, season };
    },
    /** prévision avec bandes de confiance (quantiles P10/P50/P90) */
    forecast(series, horizon, opts) {
      const o = opts || {};
      const model = stats.holtWinters(series, o);
      const h = Math.max(1, horizon | 0);
      const out = { point: [], lo80: [], hi80: [], lo95: [], hi95: [], model };
      const sd = model.residSd || Math.abs(model.level) * 0.03 || 1;
      for (let i = 1; i <= h; i++) {
        const s = model.season ? model.seasonal[(series.length + i - 1) % model.season] : 0;
        const phiSum = o.damped === false ? i : (1 - Math.pow(o.phi || .94, i)) / (1 - (o.phi || .94));
        const med = model.level + phiSum * model.trend + s;
        const widen = sd * Math.sqrt(i);
        out.point.push(med);
        out.lo80.push(med - 1.2816 * widen); out.hi80.push(med + 1.2816 * widen);
        out.lo95.push(med - 1.96 * widen); out.hi95.push(med + 1.96 * widen);
      }
      return out;
    },
    /** backtest glissant : MAPE, MAE, R², biais */
    backtest(series, opts) {
      const o = opts || {};
      const holdout = Math.max(1, o.holdout || 3);
      const trainEnd = series.length - holdout;
      if (trainEnd < 3) return { mape: NaN, mae: NaN, r2: NaN, bias: NaN, n: 0, pairs: [] };
      const f = stats.forecast(series.slice(0, trainEnd), holdout, o);
      const actual = series.slice(trainEnd), pred = f.point;
      let ape = 0, ae = 0, bias = 0, cnt = 0, ssTot = 0, ssRes = 0;
      const mean = stats.mean(actual);
      const pairs = [];
      for (let i = 0; i < actual.length; i++) {
        if (actual[i] == null) continue;
        const e = pred[i] - actual[i];
        ape += Math.abs(e / (actual[i] || 1)); ae += Math.abs(e); bias += e; cnt++;
        ssTot += (actual[i] - mean) * (actual[i] - mean); ssRes += e * e;
        pairs.push({ i: trainEnd + i, actual: actual[i], pred: pred[i] });
      }
      return { mape: cnt ? (ape / cnt) * 100 : NaN, mae: cnt ? ae / cnt : NaN, bias: cnt ? bias / cnt : NaN, r2: ssTot ? 1 - ssRes / ssTot : NaN, n: cnt, pairs };
    },
    /** Monte-Carlo : fn(rnd) -> nombre ; renvoie distribution & quantiles */
    monteCarlo(fn, runs) {
      const n = runs || 5000, out = new Array(n);
      const r = mulberry(1234567 ^ (n * 2654435761));
      for (let i = 0; i < n; i++) out[i] = fn(r, i);
      return out;
    },
    histogram(values, bins) {
      const mn = stats.min(values), mx = stats.max(values), k = bins || 22;
      const step = (mx - mn) / k || 1;
      const counts = new Array(k).fill(0), centers = new Array(k);
      for (let i = 0; i < k; i++) centers[i] = mn + step * (i + .5);
      values.forEach(v => { const b = clamp(Math.floor((v - mn) / step), 0, k - 1); counts[b]++; });
      return { counts, centers, step, min: mn, max: mx };
    },
    /** élasticité : pente de log(y) ~ log(x) */
    elasticity(x, y) {
      const lx = [], ly = [];
      for (let i = 0; i < x.length; i++) if (x[i] > 0 && y[i] > 0) { lx.push(Math.log(x[i])); ly.push(Math.log(y[i])); }
      return stats.linreg(lx, ly).slope;
    },
    /** corrélation de Pearson */
    corr(x, y) {
      const n = Math.min(x.length, y.length);
      const mx = stats.mean(x.slice(0, n)), my = stats.mean(y.slice(0, n));
      let sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
      return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    },
    /** moyenne mobile */
    movingAvg(a, k) {
      const out = [];
      for (let i = 0; i < a.length; i++) {
        const s = Math.max(0, i - k + 1);
        out.push(stats.mean(a.slice(s, i + 1)));
      }
      return out;
    },
    clamp, lerp
  };

  /* ==========================================================================
     MOTEUR DE GRAPHIQUES SVG  (aucune dépendance : fonctionne hors-ligne)
     ======================================================================== */
  const PALETTE = ['#c9ee59', '#18d67f', '#3fc8f0', '#f5b642', '#ff6b5e', '#a78bfa', '#f472b6', '#7dd3fc', '#84cc16', '#fb923c'];
  const CH = {
    palette: PALETTE,
    color(i) { return PALETTE[i % PALETTE.length]; },
    /** montage réactif : mesure, dessine, redessine au redimensionnement */
    mount(host, draw, opts) {
      const o = opts || {};
      let raf = null, last = { w: 0, h: 0 };
      function run() {
        const w = Math.max(220, host.clientWidth || 640);
        const h = Math.max(120, host.clientHeight || (o.height || 260));
        if (o.skipSame && last.w === w && last.h === h) return;
        last = { w, h };
        host.innerHTML = '';
        try { draw(host, w, h); } catch (err) { host.innerHTML = '<div class="nx-dim nx-mini" style="padding:10px">Graphique indisponible</div>'; console.error('[NX.charts]', err); }
      }
      run();
      let ro = null;
      if (w.ResizeObserver) { ro = new w.ResizeObserver(debounce(run, 90)); ro.observe(host); }
      else { const onr = debounce(run, 140); w.addEventListener('resize', onr); host.__nxResize = onr; }
      return { redraw: run, destroy() { if (ro) ro.disconnect(); else if (host.__nxResize) w.removeEventListener('resize', host.__nxResize); } };
    },
    _axis(labels, w, pad, maxTicks) {
      const n = labels.length, avail = w - pad.l - pad.r;
      const step = Math.max(1, Math.ceil(n / (maxTicks || Math.max(2, Math.floor(avail / 74)))));
      const ticks = [];
      for (let i = 0; i < n; i += step) ticks.push(i);
      if (ticks[ticks.length - 1] !== n - 1) ticks.push(n - 1);
      return { ticks, x: i => pad.l + (n === 1 ? avail / 2 : (i / (n - 1)) * avail) };
    },
    _tip(host) {
      let t = host.querySelector('.nx-chart-tip');
      if (!t) { t = h('div.nx-chart-tip'); host.appendChild(t); }
      return t;
    },
    _empty(host, msg) { host.appendChild(h('div.nx-dim.nx-mini', { style: { padding: '14px' }, text: msg || 'Aucune donnée' })); },

    /* ------------------------------------------------------------- LIGNE -- */
    line(host, cfg) {
      const c = Object.assign({ labels: [], series: [], legend: true, markers: [], points: true, smooth: true, format: v => fmt.compact(v), zero: false, yTicks: 4 }, cfg);
      return CH.mount(host, function (svgHost, W, H) {
        if (!c.labels.length || !c.series.length) return CH._empty(svgHost);
        const pad = { l: 58, r: c.axisRight ? 58 : 16, t: 14, b: 30 };
        const vals = [];
        c.series.forEach(s => { (s.data || []).forEach(v => { if (v != null && !isNaN(v)) vals.push(v); }); (s.bandLo || []).forEach(v => vals.push(v)); (s.bandHi || []).forEach(v => vals.push(v)); });
        if (c.target != null) vals.push(c.target);
        let mn = c.zero ? 0 : Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
        if (!isFinite(mn) || !isFinite(mx)) { mn = 0; mx = 1; }
        const padV = (mx - mn) * .12 || Math.abs(mx) * .1 || 1;
        mn -= padV; mx += padV; if (c.zero) mn = Math.min(0, mn);
        const sx = i => pad.l + (c.labels.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (c.labels.length - 1)) * (W - pad.l - pad.r));
        const sy = v => H - pad.b - ((v - mn) / (mx - mn || 1)) * (H - pad.t - pad.b);
        const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
        const defs = svg('defs'); root.appendChild(defs);
        // grille + axe Y
        for (let i = 0; i <= c.yTicks; i++) {
          const v = mn + (i / c.yTicks) * (mx - mn), y = sy(v);
          root.appendChild(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, stroke: 'rgba(255,255,255,.08)', 'stroke-dasharray': i ? '3 5' : '0' }));
          root.appendChild(svg('text', { x: pad.l - 9, y: y + 3.5, 'text-anchor': 'end', fill: 'rgba(255,255,255,.42)', 'font-size': 10, 'font-family': 'inherit', text: c.format(v) }));
        }
        // marqueurs d'événements
        (c.markers || []).forEach(m => {
          const x = sx(m.index);
          if (x == null) return;
          root.appendChild(svg('line', { x1: x, x2: x, y1: pad.t, y2: H - pad.b, stroke: m.color || 'rgba(245,182,66,.55)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
          root.appendChild(svg('text', { x: x + 4, y: pad.t + 10, fill: m.color || 'rgba(245,182,66,.85)', 'font-size': 9.5, 'font-family': 'inherit', text: m.label || '' }));
        });
        if (c.target != null) {
          const y = sy(c.target);
          root.appendChild(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, stroke: '#ff6b5e', 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }));
          root.appendChild(svg('text', { x: W - pad.r - 4, y: y - 5, 'text-anchor': 'end', fill: '#ffb0a7', 'font-size': 10, 'font-family': 'inherit', text: c.targetLabel || 'Cible' }));
        }
        // axe X
        const ax = CH._axis(c.labels, W, pad, c.xTicks);
        ax.ticks.forEach(i => {
          root.appendChild(svg('text', { x: ax.x(i), y: H - 9, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.42)', 'font-size': 10, 'font-family': 'inherit', text: c.labels[i] }));
        });
        // séries
        c.series.forEach((s, si) => {
          const col = s.color || CH.color(si);
          const data = s.data || [];
          // bande de confiance
          if (s.bandLo && s.bandHi) {
            let up = '', dn = '';
            for (let i = 0; i < c.labels.length; i++) { const x = sx(i); up += (i ? 'L' : 'M') + x + ' ' + sy(s.bandHi[i]); }
            for (let i = c.labels.length - 1; i >= 0; i--) { const x = sx(i); dn += 'L' + x + ' ' + sy(s.bandLo[i]); }
            const gid = uid('g');
            const lg = svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
            lg.appendChild(svg('stop', { offset: '0%', 'stop-color': col, 'stop-opacity': .34 }));
            lg.appendChild(svg('stop', { offset: '100%', 'stop-color': col, 'stop-opacity': .04 }));
            defs.appendChild(lg);
            root.appendChild(svg('path', { d: up + dn + 'Z', fill: `url(#${gid})`, stroke: 'none' }));
          }
          const pts = data.map((v, i) => v == null ? null : [sx(i), sy(v)]).filter(Boolean);
          if (!pts.length) return;
          let path = '';
          if (s.smooth !== false && pts.length > 2) {
            path = 'M' + pts[0][0] + ' ' + pts[0][1];
            for (let i = 1; i < pts.length; i++) {
              const p0 = pts[i - 1], p1 = pts[i], cx = (p0[0] + p1[0]) / 2;
              path += ' C' + cx + ' ' + p0[1] + ' ' + cx + ' ' + p1[1] + ' ' + p1[0] + ' ' + p1[1];
            }
          } else path = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
          if (s.area) {
            const gid = uid('a');
            const lg = svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
            lg.appendChild(svg('stop', { offset: '0%', 'stop-color': col, 'stop-opacity': .42 }));
            lg.appendChild(svg('stop', { offset: '100%', 'stop-color': col, 'stop-opacity': 0 }));
            defs.appendChild(lg);
            root.appendChild(svg('path', { d: path + ` L${pts[pts.length - 1][0]} ${H - pad.b} L${pts[0][0]} ${H - pad.b} Z`, fill: `url(#${gid})`, stroke: 'none' }));
          }
          const stroke = svg('path', { d: path, fill: 'none', stroke: col, 'stroke-width': s.width || 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'nx-draw', style: `--nx-dash:1600${s.dash ? ';stroke-dasharray:7 6' : ''}` });
          root.appendChild(stroke);
          if (c.points !== false && (s.points || c.labels.length <= 16)) {
            pts.forEach((p, i) => root.appendChild(svg('circle', { cx: p[0], cy: p[1], r: s.dotR || 2.8, fill: '#04100a', stroke: col, 'stroke-width': 1.8 })));
          }
        });
        // interaction
        const cross = svg('line', { x1: 0, x2: 0, y1: pad.t, y2: H - pad.b, stroke: 'rgba(201,238,89,.55)', 'stroke-width': 1, opacity: 0 });
        root.appendChild(cross);
        const dots = svg('g', { opacity: 0 }); root.appendChild(dots);
        const hit = svg('rect', { x: pad.l, y: pad.t, width: Math.max(0, W - pad.l - pad.r), height: Math.max(0, H - pad.t - pad.b), fill: 'transparent', style: 'cursor:crosshair' });
        const tip = CH._tip(svgHost);
        function locate(clientX) {
          const r = svgHost.getBoundingClientRect();
          const rel = (clientX - r.left) * (W / (r.width || W));
          const n = c.labels.length;
          const i = Math.round(((rel - pad.l) / Math.max(1, W - pad.l - pad.r)) * (n - 1));
          return clamp(i, 0, n - 1);
        }
        function show(i) {
          const x = sx(i);
          cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('opacity', 1);
          dots.setAttribute('opacity', 1);
          while (dots.firstChild) dots.removeChild(dots.firstChild);
          let html = '<b>' + esc(c.labels[i]) + '</b>';
          c.series.forEach((s, si) => {
            const v = s.data && s.data[i];
            if (v == null || isNaN(v)) return;
            const col = s.color || CH.color(si);
            dots.appendChild(svg('circle', { cx: x, cy: sy(v), r: 4.2, fill: col, stroke: '#04100a', 'stroke-width': 1.6 }));
            html += '<div class="nx-tip-row"><span><i style="background:' + col + '"></i>' + esc(s.name || '') + '</span><b>' + esc((s.format || c.format)(v)) + '</b></div>';
            if (s.bandLo && s.bandHi) html += '<div class="nx-tip-row nx-dim"><span>P10 – P90</span><b>' + esc(c.format(s.bandLo[i])) + ' – ' + esc(c.format(s.bandHi[i])) + '</b></div>';
          });
          tip.innerHTML = html;
          tip.style.left = clamp((x / W) * 100, 6, 94) + '%';
          tip.style.top = '4%';
          tip.classList.add('on');
          if (c.onPoint) c.onPoint(i);
        }
        function hide() { cross.setAttribute('opacity', 0); dots.setAttribute('opacity', 0); tip.classList.remove('on'); }
        hit.addEventListener('mousemove', e => show(locate(e.clientX)));
        hit.addEventListener('mouseleave', hide);
        hit.addEventListener('touchstart', e => { if (e.touches[0]) show(locate(e.touches[0].clientX)); }, { passive: true });
        hit.addEventListener('touchmove', e => { if (e.touches[0]) show(locate(e.touches[0].clientX)); }, { passive: true });
        root.appendChild(hit);
        // navigation clavier
        root.setAttribute('tabindex', '0');
        root.setAttribute('aria-label', c.aria || 'Graphique');
        let cur = c.labels.length - 1;
        root.addEventListener('keydown', e => {
          if (e.key === 'ArrowRight') { cur = clamp(cur + 1, 0, c.labels.length - 1); show(cur); e.preventDefault(); }
          else if (e.key === 'ArrowLeft') { cur = clamp(cur - 1, 0, c.labels.length - 1); show(cur); e.preventDefault(); }
          else if (e.key === 'Escape') hide();
        });
        root.addEventListener('blur', hide);
        svgHost.appendChild(root);
        // légende
        if (c.legend && c.series.length > 1) {
          const lg = h('div.nx-legend', { style: { marginTop: '6px' } });
          c.series.forEach((s, si) => lg.appendChild(h('span', null, [h('i', { style: { background: s.color || CH.color(si) } }), s.name || ('Série ' + (si + 1))])));
          svgHost.appendChild(lg);
        }
      }, { height: cfg && cfg.height });
    },

    /* -------------------------------------------------------------- BARRES */
    bars(host, cfg) {
      const c = Object.assign({ labels: [], series: [], horizontal: false, stacked: false, legend: true, format: v => fmt.compact(v), target: null, onSelect: null, selected: -1 }, cfg);
      return CH.mount(host, function (svgHost, W, H) {
        if (!c.labels.length || !c.series.length) return CH._empty(svgHost);
        const pad = c.horizontal ? { l: 116, r: 46, t: 10, b: 26 } : { l: 58, r: 14, t: 12, b: 42 };
        const series = c.series;
        const maxima = c.labels.map((_, i) => c.stacked ? series.reduce((s, x) => s + (x.data[i] || 0), 0) : Math.max.apply(null, series.map(x => x.data[i] || 0)));
        let mx = Math.max.apply(null, maxima.concat([c.target || 0])) || 1;
        mx *= 1.08;
        const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
        const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
        const band = plotW / c.labels.length;
        const inner = band * .62;
        const bw = c.stacked ? inner : inner / series.length;
        const valueOf = (seriesIdx, i) => (series[seriesIdx].data[i] || 0);
        // grille
        for (let i = 0; i <= 4; i++) {
          const v = (i / 4) * mx;
          if (c.horizontal) {
            const x = pad.l + (i / 4) * plotW;
            root.appendChild(svg('line', { x1: x, x2: x, y1: pad.t, y2: H - pad.b, stroke: 'rgba(255,255,255,.07)' }));
            root.appendChild(svg('text', { x, y: H - 8, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.4)', 'font-size': 10, text: c.format(v) }));
          } else {
            const y = H - pad.b - (i / 4) * plotH;
            root.appendChild(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, stroke: 'rgba(255,255,255,.07)', 'stroke-dasharray': i ? '3 5' : '0' }));
            root.appendChild(svg('text', { x: pad.l - 9, y: y + 3.5, 'text-anchor': 'end', fill: 'rgba(255,255,255,.42)', 'font-size': 10, text: c.format(v) }));
          }
        }
        c.labels.forEach((lab, i) => {
          const center = pad.l + band * i + band / 2;
          if (!c.horizontal) {
            const short = String(lab).length > 12 ? String(lab).slice(0, 11) + '…' : lab;
            root.appendChild(svg('text', { x: center, y: H - pad.b + 16, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.5)', 'font-size': 10, text: short }));
          } else {
            root.appendChild(svg('text', { x: pad.l - 10, y: center + 3.5, 'text-anchor': 'end', fill: 'rgba(255,255,255,.55)', 'font-size': 10.5, text: String(lab).length > 18 ? String(lab).slice(0, 17) + '…' : lab }));
          }
          let acc = 0;
          series.forEach((s, si) => {
            const v = valueOf(si, i);
            const col = s.color || (series.length > 1 ? CH.color(si) : (c.colorScale ? c.colorScale(v, i) : CH.color(0)));
            const len = (v / mx) * (c.horizontal ? plotW : plotH);
            let x, y, w2, h2;
            if (c.horizontal) {
              x = pad.l + acc; w2 = Math.max(1, len); y = pad.t + (band * .16) + si * (bw + 1); h2 = Math.max(3, bw - 2);
              if (c.stacked) { h2 = Math.max(3, inner - 2); y = pad.t + (band - inner) / 2; }
            } else {
              y = H - pad.b - acc - len; h2 = Math.max(1, len); w2 = Math.max(3, bw - 2);
              x = pad.l + band * i + (band - inner) / 2 + (c.stacked ? 0 : si * bw);
            }
            const gid = uid('b');
            const lg = svg('linearGradient', { id: gid, x1: 0, y1: c.horizontal ? 0 : 1, x2: c.horizontal ? 1 : 0, y2: 0 });
            lg.appendChild(svg('stop', { offset: '0%', 'stop-color': col, 'stop-opacity': .58 }));
            lg.appendChild(svg('stop', { offset: '100%', 'stop-color': col, 'stop-opacity': 1 }));
            root.appendChild(lg);
            const rect = svg('rect', { x, y, width: w2, height: h2, rx: 4, fill: `url(#${gid})`, class: 'nx-grow', style: `transform-origin:${c.horizontal ? 'left' : 'bottom'} center;animation-delay:${Math.min(600, i * 26 + si * 40)}ms` });
            if (i === c.selected) rect.setAttribute('stroke', '#c9ee59'), rect.setAttribute('stroke-width', 1.6);
            root.appendChild(rect);
            acc += c.stacked ? len : 0;
          });
        });
        if (c.target != null) {
          if (c.horizontal) {
            const x = pad.l + (c.target / mx) * plotW;
            root.appendChild(svg('line', { x1: x, x2: x, y1: pad.t, y2: H - pad.b, stroke: '#ff6b5e', 'stroke-width': 1.3, 'stroke-dasharray': '6 4' }));
            root.appendChild(svg('text', { x: x + 4, y: pad.t + 10, 'text-anchor': 'start', fill: '#ffb0a7', 'font-size': 10, text: c.targetLabel || 'Référence' }));
          } else {
            const y = H - pad.b - (c.target / mx) * plotH;
            root.appendChild(svg('line', { x1: pad.l, x2: W - pad.r, y1: y, y2: y, stroke: '#ff6b5e', 'stroke-width': 1.3, 'stroke-dasharray': '6 4' }));
            root.appendChild(svg('text', { x: W - pad.r - 3, y: y - 5, 'text-anchor': 'end', fill: '#ffb0a7', 'font-size': 10, text: c.targetLabel || 'Référence' }));
          }
        }
        const tip = CH._tip(svgHost);
        const hit = svg('rect', { x: pad.l, y: pad.t, width: plotW, height: plotH, fill: 'transparent', style: 'cursor:pointer' });
        function show(e) {
          const r = svgHost.getBoundingClientRect();
          const rel = (e.clientX - r.left) * (W / (r.width || W));
          const i = clamp(Math.floor((rel - pad.l) / band), 0, c.labels.length - 1);
          let html = '<b>' + esc(c.labels[i]) + '</b>';
          series.forEach((s, si) => { html += '<div class="nx-tip-row"><span><i style="background:' + (s.color || CH.color(si)) + '"></i>' + esc(s.name || '') + '</span><b>' + esc(c.format(s.data[i] || 0)) + '</b></div>'; });
          if (c.stacked) html += '<div class="nx-tip-row"><span>Total</span><b>' + esc(c.format(maxima[i])) + '</b></div>';
          tip.innerHTML = html;
          tip.style.left = clamp(((pad.l + band * i + band / 2) / W) * 100, 8, 92) + '%';
          tip.style.top = '6%';
          tip.classList.add('on');
        }
        hit.addEventListener('mousemove', show);
        hit.addEventListener('mouseleave', () => tip.classList.remove('on'));
        hit.addEventListener('click', e => {
          const r = svgHost.getBoundingClientRect();
          const rel = (e.clientX - r.left) * (W / (r.width || W));
          const i = clamp(Math.floor((rel - pad.l) / band), 0, c.labels.length - 1);
          if (c.onSelect) c.onSelect(i, c.labels[i]);
        });
        root.appendChild(hit);
        svgHost.appendChild(root);
        if (c.legend && series.length > 1) {
          const lg = h('div.nx-legend', { style: { marginTop: '6px' } });
          series.forEach((s, si) => lg.appendChild(h('span', null, [h('i', { style: { background: s.color || CH.color(si) } }), s.name || ''])));
          svgHost.appendChild(lg);
        }
      }, { height: cfg && cfg.height });
    },

    /* --------------------------------------------------------------- ANNEAU */
    donut(host, cfg) {
      const c = Object.assign({ items: [], format: v => fmt.compact(v), centerLabel: '', thickness: 0 }, cfg);
      return CH.mount(host, function (svgHost, W, H) {
        const items = c.items.filter(x => x.value > 0);
        if (!items.length) return CH._empty(svgHost);
        const total = stats.sum(items.map(x => x.value)) || 1;
        const R = Math.min(W, H) / 2 - 6, r = R * (c.thickness || .62);
        const cx = W / 2, cy = H / 2;
        const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
        let acc = -Math.PI / 2;
        items.forEach((it, i) => {
          const ang = (it.value / total) * Math.PI * 2 - .02;
          const col = it.color || CH.color(i);
          const large = ang > Math.PI ? 1 : 0;
          const x1 = cx + Math.cos(acc) * R, y1 = cy + Math.sin(acc) * R;
          const x2 = cx + Math.cos(acc + ang) * R, y2 = cy + Math.sin(acc + ang) * R;
          const x3 = cx + Math.cos(acc + ang) * r, y3 = cy + Math.sin(acc + ang) * r;
          const x4 = cx + Math.cos(acc) * r, y4 = cy + Math.sin(acc) * r;
          root.appendChild(svg('path', {
            d: `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`,
            fill: col, opacity: .92, style: 'transition:opacity .2s'
          }));
          acc += (it.value / total) * Math.PI * 2;
        });
        root.appendChild(svg('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', fill: '#fff', 'font-size': Math.max(13, R * .3), 'font-weight': 800, text: c.format(total) }));
        if (c.centerLabel) root.appendChild(svg('text', { x: cx, y: cy + Math.max(12, R * .26), 'text-anchor': 'middle', fill: 'rgba(255,255,255,.55)', 'font-size': 10.5, text: c.centerLabel }));
        svgHost.appendChild(root);
        const lg = h('div.nx-legend', { style: { marginTop: '8px', justifyContent: 'center' } });
        items.forEach((it, i) => lg.appendChild(h('span', null, [h('i', { style: { background: it.color || CH.color(i) } }), it.label + ' · ' + c.format(it.value)])));
        svgHost.appendChild(lg);
      }, { height: cfg && cfg.height });
    },

    /* ----------------------------------------------------------- CASCADE -- */
    waterfall(host, cfg) {
      const c = Object.assign({ items: [], format: v => fmt.compact(v) }, cfg);
      return CH.mount(host, function (svgHost, W, H) {
        if (!c.items.length) return CH._empty(svgHost);
        const pad = { l: 62, r: 12, t: 16, b: 40 };
        const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
        const band = plotW / c.items.length;
        let run = 0, tops = [], bots = [];
        const all = [];
        c.items.forEach(it => {
          if (it.type === 'total') { tops.push(0); bots.push(Math.max(0, Math.abs(it.value))); all.push(Math.abs(it.value)); }
          else { const from = run, to = run + it.value; tops.push(Math.min(from, to)); bots.push(Math.max(from, to)); all.push(from, to); run = to; }
        });
        const mn = Math.min(0, Math.min.apply(null, tops)), mx = Math.max.apply(null, bots.concat(all)) * 1.06 || 1;
        const y = v => H - pad.b - ((v - mn) / (mx - mn || 1)) * plotH;
        const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
        for (let i = 0; i <= 4; i++) {
          const v = mn + (i / 4) * (mx - mn), yy = y(v);
          root.appendChild(svg('line', { x1: pad.l, x2: W - pad.r, y1: yy, y2: yy, stroke: 'rgba(255,255,255,.07)', 'stroke-dasharray': i ? '3 5' : '0' }));
          root.appendChild(svg('text', { x: pad.l - 9, y: yy + 3.5, 'text-anchor': 'end', fill: 'rgba(255,255,255,.42)', 'font-size': 10, text: c.format(v) }));
        }
        c.items.forEach((it, i) => {
          const col = it.color || (it.type === 'total' ? '#c9ee59' : it.value < 0 ? '#ff6b5e' : '#18d67f');
          const x = pad.l + band * i + band * .18, w2 = band * .64;
          const y0 = y(bots[i]), y1 = y(tops[i]);
          root.appendChild(svg('rect', { x, y: y0, width: w2, height: Math.max(2, y1 - y0), rx: 4, fill: col, opacity: .9, class: 'nx-grow' }));
          root.appendChild(svg('text', { x: x + w2 / 2, y: y0 - 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 10.5, 'font-weight': 700, text: c.format(it.value) }));
          const lab = String(it.label).split(' ').slice(0, 2).join(' ');
          root.appendChild(svg('text', { x: x + w2 / 2, y: H - pad.b + 15, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.55)', 'font-size': 10, text: lab }));
          if (String(it.label).split(' ').length > 2) root.appendChild(svg('text', { x: x + w2 / 2, y: H - pad.b + 27, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.4)', 'font-size': 10, text: String(it.label).split(' ').slice(2).join(' ') }));
          if (i < c.items.length - 1 && it.type !== 'total') {
            root.appendChild(svg('line', { x1: x + w2, x2: pad.l + band * (i + 1) + band * .18, y1: y(run), y2: y(run), stroke: 'rgba(255,255,255,.22)', 'stroke-dasharray': '3 3' }));
          }
          if (it.type === 'total') run = Math.abs(it.value);
          else run = bots[i];
        });
        svgHost.appendChild(root);
      }, { height: cfg && cfg.height });
    },

    /* --------------------------------------------------------------- HEAT -- */
    heat(host, cfg) {
      const c = Object.assign({ rows: [], cols: [], values: [], format: v => fmt.num(v, 0), onSelect: null, legend: true }, cfg);
      return CH.mount(host, function (svgHost, W, H) {
        if (!c.rows.length || !c.cols.length) return CH._empty(svgHost);
        const pad = { l: 104, r: 8, t: 26, b: 8 };
        const cw = (W - pad.l - pad.r) / c.cols.length, chh = (H - pad.t - pad.b) / c.rows.length;
        const flat = c.values.flat().filter(v => v != null);
        const mn = Math.min.apply(null, flat), mx = Math.max.apply(null, flat);
        const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
        c.cols.forEach((col, j) => root.appendChild(svg('text', { x: pad.l + cw * j + cw / 2, y: 16, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.55)', 'font-size': 10, text: String(col).length > 12 ? String(col).slice(0, 11) + '…' : col })));
        c.rows.forEach((row, i) => {
          root.appendChild(svg('text', { x: pad.l - 8, y: pad.t + chh * i + chh / 2 + 3.5, 'text-anchor': 'end', fill: 'rgba(255,255,255,.62)', 'font-size': 10.5, text: String(row).length > 18 ? String(row).slice(0, 17) + '…' : row }));
          c.cols.forEach((col, j) => {
            const v = c.values[i][j];
            const t = mx === mn ? .5 : (v - mn) / (mx - mn);
            const col2 = t < .34 ? `rgba(24,214,127,${.14 + t * .5})` : t < .67 ? `rgba(201,238,89,${.2 + t * .5})` : t < .85 ? `rgba(245,182,66,${.25 + t * .5})` : `rgba(255,107,94,${.3 + t * .55})`;
            const rect = svg('rect', { x: pad.l + cw * j + 1.5, y: pad.t + chh * i + 1.5, width: Math.max(2, cw - 3), height: Math.max(2, chh - 3), rx: 5, fill: col2, style: 'cursor:pointer;transition:stroke .15s', stroke: 'rgba(255,255,255,.05)' });
            rect.addEventListener('click', () => c.onSelect && c.onSelect(i, j, row, col, v));
            rect.addEventListener('mouseenter', () => { rect.setAttribute('stroke', '#c9ee59'); rect.setAttribute('stroke-width', 1.6); });
            rect.addEventListener('mouseleave', () => { rect.setAttribute('stroke', 'rgba(255,255,255,.05)'); rect.setAttribute('stroke-width', 1); });
            root.appendChild(rect);
            root.appendChild(svg('text', { x: pad.l + cw * j + cw / 2, y: pad.t + chh * i + chh / 2 + 3.5, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.85)', 'font-size': Math.min(11, chh * .42), 'font-weight': 700, 'pointer-events': 'none', text: v == null ? '—' : c.format(v) }));
          });
        });
        svgHost.appendChild(root);
      }, { height: cfg && cfg.height });
    },

    /* --------------------------------------------------------------- JAUGE -- */
    gauge(host, cfg) {
      const c = Object.assign({ value: 0, max: 100, label: '', format: v => fmt.num(v, 1) + ' %', tone: '#18d67f' }, cfg);
      return CH.mount(host, function (svgHost, W, H) {
        const R = Math.min(W / 2, H) - 12, cx = W / 2, cy = H - 10;
        const t = clamp(c.value / (c.max || 100), 0, 1);
        const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' });
        function arc(from, to, col, width) {
          const a0 = Math.PI + Math.PI * from, a1 = Math.PI + Math.PI * to;
          const x1 = cx + Math.cos(a0) * R, y1 = cy + Math.sin(a0) * R;
          const x2 = cx + Math.cos(a1) * R, y2 = cy + Math.sin(a1) * R;
          return svg('path', { d: `M${x1} ${y1} A${R} ${R} 0 ${to - from > .5 ? 1 : 0} 1 ${x2} ${y2}`, fill: 'none', stroke: col, 'stroke-width': width, 'stroke-linecap': 'round' });
        }
        root.appendChild(arc(0, 1, 'rgba(255,255,255,.09)', 12));
        root.appendChild(arc(0, t, c.tone, 12));
        root.appendChild(svg('text', { x: cx, y: cy - R * .22, 'text-anchor': 'middle', fill: '#fff', 'font-size': Math.max(16, R * .34), 'font-weight': 900, text: c.format(c.value) }));
        if (c.label) root.appendChild(svg('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', fill: 'rgba(255,255,255,.5)', 'font-size': 10.5, text: c.label }));
        svgHost.appendChild(root);
      }, { height: cfg && cfg.height });
    },

    /* ----------------------------------------------------------- SPARKLINE -- */
    spark(host, cfg) {
      const c = Object.assign({ data: [], color: '#c9ee59', fill: true, w: 120, h: 34 }, cfg);
      if (!host || !c.data.length) return null;
      host.innerHTML = '';
      const vals = c.data.filter(v => v != null);
      const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
      const W = c.w, H = c.h, p = 3;
      const x = i => p + (i / Math.max(1, c.data.length - 1)) * (W - 2 * p);
      const y = v => H - p - ((v - mn) / ((mx - mn) || 1)) * (H - 2 * p);
      const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', width: '100%', height: '100%' });
      const pts = c.data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
      if (c.fill) {
        const gid = uid('s');
        const defs = svg('defs');
        const lg = svg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
        lg.appendChild(svg('stop', { offset: '0%', 'stop-color': c.color, 'stop-opacity': .45 }));
        lg.appendChild(svg('stop', { offset: '100%', 'stop-color': c.color, 'stop-opacity': 0 }));
        defs.appendChild(lg); root.appendChild(defs);
        root.appendChild(svg('polygon', { points: `${p},${H - p} ${pts} ${W - p},${H - p}`, fill: `url(#${gid})` }));
      }
      root.appendChild(svg('polyline', { points: pts, fill: 'none', stroke: c.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }));
      host.appendChild(root);
      return root;
    }
  };

  /* ------------------------------------------------------------------ tiroirs */
  const overlay = {
    _drawer: null,
    drawer(opts) {
      const o = Object.assign({ title: '', kicker: '', body: null, width: '' }, opts);
      overlay.closeDrawer();
      const panel = h('div.nx-drawer-panel', null, [
        h('div.nx-drawer-head', null, [
          h('div', null, [h('div.nx-kicker', { text: o.kicker || 'NUTRI.N°1' }), h('h2.nx-h2', { text: o.title })]),
          h('button.nx-close', { type: 'button', 'aria-label': 'Fermer', text: '✕', onclick: overlay.closeDrawer })
        ]),
        o.body
      ]);
      if (o.width) panel.style.width = o.width;
      const root = h('div.nx-drawer', { role: 'dialog', 'aria-modal': 'true' }, panel);
      overlay._drawer = root;
      root.addEventListener('click', e => { if (e.target === root) overlay.closeDrawer(); });
      d.body.appendChild(root);
      requestAnimationFrame(() => root.classList.add('on'));
      d.addEventListener('keydown', overlay._esc);
      return root;
    },
    _esc(e) { if (e.key === 'Escape') { overlay.closeDrawer(); overlay.closeModal(); } },
    closeDrawer() {
      if (!overlay._drawer) return;
      const n = overlay._drawer; overlay._drawer = null;
      n.classList.remove('on');
      setTimeout(() => n.remove(), 260);
    },
    modal(opts) {
      const o = Object.assign({ title: '', kicker: '', body: null }, opts);
      overlay.closeModal();
      const panel = h('div.nx-modal-panel', { role: 'dialog', 'aria-modal': 'true' }, [
        h('div.nx-card-head', null, [
          h('div', null, [h('div.nx-kicker', { text: o.kicker || 'NUTRI.N°1' }), h('h2.nx-h2', { text: o.title })]),
          h('button.nx-close', { type: 'button', 'aria-label': 'Fermer', text: '✕', onclick: overlay.closeModal })
        ]),
        o.body
      ]);
      const root = h('div.nx-modal', null, panel);
      overlay._modal = root;
      root.addEventListener('click', e => { if (e.target === root) overlay.closeModal(); });
      d.body.appendChild(root);
      requestAnimationFrame(() => root.classList.add('on'));
      return root;
    },
    closeModal() {
      if (!overlay._modal) return;
      const n = overlay._modal; overlay._modal = null;
      n.classList.remove('on');
      setTimeout(() => n.remove(), 240);
    },
    toast(msg, ms) {
      let t = $('#nx-toast');
      if (!t) {
        t = h('div', { id: 'nx-toast', style: { position: 'fixed', right: '18px', bottom: '18px', zIndex: 12100, background: 'linear-gradient(120deg,#04231a,#062b1f)', color: '#eaf6ee', padding: '13px 16px', borderRadius: '13px', border: '1px solid rgba(201,238,89,.32)', boxShadow: '0 18px 44px rgba(0,0,0,.42)', font: '700 12.5px "Plus Jakarta Sans",Inter,system-ui,Arial', maxWidth: '380px', opacity: '0', transform: 'translateY(10px)', transition: 'opacity .22s,transform .22s' } });
        d.body.appendChild(t);
      }
      t.innerHTML = msg;
      requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'none'; });
      clearTimeout(overlay._toastT);
      overlay._toastT = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; }, ms || 2800);
      return t;
    }
  };

  /* ------------------------------------------------------------------ export */
  const exporter = {
    toCSV(rows, headers) {
      const cols = headers || (rows[0] ? Object.keys(rows[0]) : []);
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      return [cols.map(q).join(';')].concat(rows.map(r => cols.map(c => q(r[c])).join(';'))).join('\r\n');
    },
    download(filename, content, mime) {
      try {
        const blob = new w.Blob(['\ufeff' + content], { type: (mime || 'text/csv') + ';charset=utf-8' });
        const url = w.URL.createObjectURL(blob);
        const a = h('a', { href: url, download: filename, style: { display: 'none' } });
        d.body.appendChild(a); a.click();
        setTimeout(() => { w.URL.revokeObjectURL(url); a.remove(); }, 1200);
        return true;
      } catch (e) { overlay.toast('Export indisponible dans cet environnement'); return false; }
    },
    csv(filename, rows, headers) { return exporter.download(filename, exporter.toCSV(rows, headers), 'text/csv'); },
    json(filename, obj) { return exporter.download(filename, JSON.stringify(obj, null, 2), 'application/json'); }
  };

  /* -------------------------------------------------------------- animations */
  function countUp(node, to, opts) {
    const o = Object.assign({ ms: 900, dec: 0, prefix: '', suffix: '', from: 0, compact: false }, opts);
    if (!node) return;
    const start = performance.now ? performance.now() : Date.now();
    const from = o.from;
    function frame(now) {
      const t = clamp((now - start) / o.ms, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      node.textContent = o.prefix + (o.compact ? fmt.compact(v, o.dec) : fmt.num(v, o.dec)) + o.suffix;
      if (t < 1) (w.requestAnimationFrame || setTimeout)(frame);
    }
    (w.requestAnimationFrame || setTimeout)(frame);
  }

  /* ---------------------------------------------------------------- registre */
  const registry = { mods: {} };
  function register(id, def) {
    registry.mods[id] = Object.assign({ id }, def);
    return registry.mods[id];
  }
  function get(id) { return registry.mods[id]; }

  /* -------------------------------------------------------------------- bus */
  const bus = {
    handlers: {},
    on(evt, fn) { (bus.handlers[evt] = bus.handlers[evt] || []).push(fn); return () => bus.off(evt, fn); },
    off(evt, fn) { bus.handlers[evt] = (bus.handlers[evt] || []).filter(f => f !== fn); },
    emit(evt, payload) { (bus.handlers[evt] || []).forEach(f => { try { f(payload); } catch (e) { console.error('[NX.bus]', evt, e); } }); }
  };

  /* -------------------------------------------------------------------- API */
  const NX = {
    __v58: true,
    version: '58.0',
    $, $$, h, svg, esc, append, clamp, lerp, debounce, uid, fmt, rng, stats, charts: CH, SVG: CH,
    palette: PALETTE, overlay, exporter, countUp, register, get, bus,
    lang() { return LANG; },
    setLang(l) {
      LANG = (l || 'fr').toLowerCase();
      try { w.localStorage && w.localStorage.setItem('nutri_language', LANG); } catch (e) { }
      bus.emit('lang', LANG);
    },
    /** langue cible d'un module : locale globale, repli FR pour l'Afrique de l'Ouest francophone */
    pickLang(m) {
      const l = LANG;
      if (m && m[l]) return l;
      if (m && m.fr) return 'fr';
      return 'en';
    },
    /** texte bilingue : NX.t({fr:'…',en:'…'}) */
    t(map) { return (map && (map[LANG] || map.fr || map.en)) || ''; },
    /** défile vers un élément de la section courante */
    scrollTo(node, offset) {
      if (!node || !node.scrollIntoView) return;
      try { node.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { node.scrollIntoView(); }
    },
    /** compte à rebours d'étapes de simulation (utilisé par les modules) */
    runSteps(container, steps, opts) {
      const o = Object.assign({ step: 420, done: 220, onDone: null }, opts);
      container.innerHTML = '';
      steps.forEach((s, i) => container.appendChild(h('div.nx-sim-step', { dataset: { i } }, [h('i', { text: String(i + 1) }), h('span', { text: s }), h('em', { text: 'En attente' })])));
      const nodes = $$('.nx-sim-step', container);
      let i = 0;
      function next() {
        if (i >= nodes.length) { o.onDone && o.onDone(); return; }
        const n = nodes[i];
        n.classList.add('run'); n.querySelector('em').textContent = 'Traitement…';
        setTimeout(() => {
          n.classList.remove('run'); n.classList.add('done');
          n.querySelector('i').textContent = '✓';
          n.querySelector('em').textContent = 'Terminé';
          i++; next();
        }, o.step);
      }
      next();
    }
  };
  w.NX = NX;
})(window, document);
