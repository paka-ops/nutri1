/* ============================================================================
   NUTRI.N°1 — NUTRI VISION ENGINE  (assets/nutri-vision.js)
   ----------------------------------------------------------------------------
   Moteur de visualisation / simulation / prédiction RÉUTILISABLE.
   Aucune dépendance externe (pas de Chart.js requis) : rendu SVG natif,
   déterministe (RNG seedé) et respectueux de prefers-reduced-motion.

   Public API  →  window.NutriVision (alias window.NV)

     NV.util    helpers DOM / format / téléchargement
     NV.rng     générateur pseudo-aléatoire seedé + distributions
     NV.stats   statistiques, régression, prévision (Holt + Monte-Carlo),
                chaînes de Markov, risque logistique, attribution, anomalies
     NV.chart   bibliothèque de graphiques SVG (mount/update/destroy)
     NV.ui      composants (modal, toast, stepper, KPI, jauges HTML)
     NV.i18n    dictionnaires multi-modules + détection de langue
     NV.store   persistance localStorage namespacée
     NV.export  CSV / JSON / rapport imprimable
     NV.app     registre de modules + cycle de vie (vues, resize, hash)

   Toute autre section du produit peut l'utiliser :
     NV.app.module({ id:'agri', section:'agri', mount(root){ ... } });
   ========================================================================== */
(function (global) {
  'use strict';

  /* ==========================================================================
     0. UTILITAIRES
     ====================================================================== */
  const Util = {
    qs: (sel, root) => (root || document).querySelector(sel),
    qsa: (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel)),
    isEl: (x) => !!x && x.nodeType === 1,
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (m) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
      );
    },
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    num(v, dflt) {
      const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(',', '.'));
      return isFinite(n) ? n : (dflt == null ? NaN : dflt);
    },
    round(v, d) { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; },
    fmt(v, d) {
      const n = Util.num(v, NaN);
      if (!isFinite(n)) return '—';
      return n.toLocaleString(Util.localeTag(), { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d });
    },
    fmtInt(v) {
      const n = Util.num(v, NaN);
      if (!isFinite(n)) return '—';
      return Math.round(n).toLocaleString(Util.localeTag());
    },
    compact(v) {
      const n = Util.num(v, 0), a = Math.abs(n);
      if (a >= 1e9) return Util.round(n / 1e9, 2) + 'B';
      if (a >= 1e6) return Util.round(n / 1e6, 2) + 'M';
      if (a >= 1e3) return Util.round(n / 1e3, 1) + 'k';
      return Util.round(n, a < 10 ? 1 : 0);
    },
    pct(v, d) { return Util.fmt(v * 100, d == null ? 1 : d) + '%'; },
    signed(v, d) { const n = Util.num(v, 0); return (n > 0 ? '+' : '') + Util.fmt(n, d == null ? 1 : d); },
    localeTag() {
      const l = (document.documentElement.lang || 'en').toLowerCase();
      return l.indexOf('fr') === 0 ? 'fr-FR' : l.indexOf('es') === 0 ? 'es-ES' : 'en-US';
    },
    uid(p) { return (p || 'nv') + '-' + Math.random().toString(36).slice(2, 9); },
    debounce(fn, ms) {
      let t; const d = function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 120); };
      d.cancel = () => clearTimeout(t); return d;
    },
    throttle(fn, ms) {
      let last = 0, t; return function () {
        const now = Date.now(), a = arguments, c = this;
        if (now - last >= ms) { last = now; fn.apply(c, a); }
        else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn.apply(c, a); }, ms - (now - last)); }
      };
    },
    on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt || false); return () => el && el.removeEventListener(ev, fn); },
    attr(el, map) { for (const k in map) { if (map[k] != null) el.setAttribute(k, map[k]); } return el; },
    mk(tag, attrs, html) {
      const ns = ['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'defs', 'linearGradient',
        'radialGradient', 'stop', 'clipPath', 'filter', 'feGaussianBlur', 'feMerge', 'feMergeNode', 'ellipse', 'tspan'].indexOf(tag) >= 0;
      const el = ns ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
      if (attrs) Util.attr(el, attrs);
      if (html != null) el.innerHTML = html;
      return el;
    },
    download(filename, text, mime) {
      try {
        const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
        return true;
      } catch (e) { return false; }
    },
    reducedMotion() {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    },
    width(el) { try { return el.getBoundingClientRect().width || el.clientWidth || 600; } catch (e) { return 600; } },
    daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(12, 0, 0, 0); return d; },
    addMonths(d, m) { const x = new Date(d.getTime()); x.setMonth(x.getMonth() + m); return x; },
    monthLabel(d) {
      const fr = (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0;
      const M = fr ? ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return M[d.getMonth()];
    },
    dateLabel(d) {
      const fr = (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0;
      return String(d.getDate()).padStart(2, '0') + ' ' + Util.monthLabel(d) + (fr ? ' ' + d.getFullYear() : '');
    },
    hash(str) {
      let h = 2166136261;
      const s = String(str);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    }
  };

  /* ==========================================================================
     1. RNG SEEDÉ  (reproductibilité des simulations de démo)
     ====================================================================== */
  function RNG(seed) {
    let a = (typeof seed === 'string' ? Util.hash(seed) : (seed >>> 0)) || 1;
    const next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      seed: a, next,
      float: (min, max) => min + (max - min) * next(),
      int: (min, max) => Math.floor(min + (max - min + 1) * next()),
      chance: (p) => next() < p,
      gauss(mu, sigma) {
        return (mu || 0) + (sigma == null ? 1 : sigma) * this.normal();
      },
      /* tirage gaussien standard (Box-Muller) — utilisé par gauss/beta */
      normal() {
        let u = 0, v = 0;
        while (u === 0) u = next();
        while (v === 0) v = next();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      beta(a1, b1) { // via gamma (Marsaglia-Tsang)
        const self = this;
        const g = (shape) => {
          if (shape < 1) return g(shape + 1) * Math.pow(next(), 1 / shape);
          const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
          for (;;) {
            const x = self.normal();
            let v = 1 + c * x;
            if (v <= 0) continue;
            v = v * v * v;
            const u = next();
            if (u < 1 - 0.0331 * x * x * x * x) return d * v;
            if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
          }
        };
        const x = g(a1), y = g(b1);
        return x / (x + y);
      },
      pick(arr) { return arr[Math.floor(next() * arr.length)]; },
      weighted(pairs) { // [[value, weight], ...]
        const tot = pairs.reduce((s, p) => s + Math.max(0, p[1]), 0) || 1;
        let r = next() * tot;
        for (let i = 0; i < pairs.length; i++) { r -= Math.max(0, pairs[i][1]); if (r <= 0) return pairs[i][0]; }
        return pairs[pairs.length - 1][0];
      },
      shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
      poisson(lambda) {
        const L = Math.exp(-lambda); let k = 0, p = 1;
        do { k++; p *= next(); } while (p > L && k < 200);
        return k - 1;
      }
    };
  }

  /* ==========================================================================
     2. STATISTIQUES / SIMULATION / PRÉDICTION
     ====================================================================== */
  const Stats = {
    sum(a) { let s = 0; for (let i = 0; i < a.length; i++) s += Util.num(a[i], 0); return s; },
    mean(a) { return a && a.length ? Stats.sum(a) / a.length : 0; },
    variance(a) { if (!a || a.length < 2) return 0; const m = Stats.mean(a); let s = 0; for (let i = 0; i < a.length; i++) { const d = Util.num(a[i], 0) - m; s += d * d; } return s / (a.length - 1); },
    sd(a) { return Math.sqrt(Stats.variance(a)); },
    sorted(a) { return a.slice().map((x) => Util.num(x, 0)).sort((x, y) => x - y); },
    quantile(a, p) {
      const s = Stats.sorted(a); if (!s.length) return 0;
      const idx = Util.clamp(p, 0, 1) * (s.length - 1), lo = Math.floor(idx), hi = Math.ceil(idx);
      return lo === hi ? s[lo] : Util.lerp(s[lo], s[hi], idx - lo);
    },
    median(a) { return Stats.quantile(a, 0.5); },
    min(a) { return a.length ? Stats.sorted(a)[0] : 0; },
    max(a) { return a.length ? Stats.sorted(a)[a.length - 1] : 0; },
    zscore(a, v) { const s = Stats.sd(a); return s ? (v - Stats.mean(a)) / s : 0; },
    slope(a) { // pente par régression sur l'index
      const n = a.length; if (n < 2) return 0;
      const xs = a.map((_, i) => i); return Stats.linreg(xs, a).m;
    },
    linreg(xs, ys) {
      const n = Math.min(xs.length, ys.length);
      if (n < 2) return { m: 0, b: Util.num(ys[0], 0), r: 0, r2: 0, predict: () => Util.num(ys[0], 0) };
      let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < n; i++) {
        const x = Util.num(xs[i], 0), y = Util.num(ys[i], 0);
        sx += x; sy += y; sxy += x * y; sxx += x * x; syy += y * y;
      }
      const den = n * sxx - sx * sx;
      const m = den ? (n * sxy - sx * sy) / den : 0;
      const b = (sy - m * sx) / n;
      const rd = Math.sqrt(Math.max(1e-12, (n * sxx - sx * sx) * (n * syy - sy * sy)));
      const r = rd ? (n * sxy - sx * sy) / rd : 0;
      return { m, b, r, r2: r * r, predict: (x) => b + m * x, n };
    },
    ewma(a, alpha) {
      const k = alpha || 0.3; let s = Util.num(a[0], 0); const out = [s];
      for (let i = 1; i < a.length; i++) { s = k * Util.num(a[i], 0) + (1 - k) * s; out.push(s); }
      return out;
    },
    /* Lissage exponentiel double (Holt) + tendance amortie : base de la prévision */
    holt(a, opt) {
      const o = opt || {};
      const alpha = o.alpha == null ? 0.42 : o.alpha, beta = o.beta == null ? 0.18 : o.beta, phi = o.phi == null ? 0.86 : o.phi;
      const s = a.map((x) => Util.num(x, 0));
      if (s.length < 2) return { level: s[0] || 0, trend: 0, fitted: s.slice(), resid: [] };
      let level = s[0], trend = s[1] - s[0];
      const fitted = [level], resid = [];
      for (let i = 1; i < s.length; i++) {
        const prev = level + trend;
        resid.push(s[i] - prev);
        const l = alpha * s[i] + (1 - alpha) * prev;
        trend = beta * (l - level) + (1 - beta) * phi * trend;
        level = l; fitted.push(level);
      }
      return { level, trend, fitted, resid, phi };
    },
    /* Prévision ponctuelle + intervalles (P10/P50/P90) par Monte-Carlo des résidus */
    forecast(a, horizon, opt) {
      const o = opt || {};
      const H = Math.max(1, horizon | 0);
      const fit = Stats.holt(a, o);
      const sdResid = Math.max(1e-6, Stats.sd(fit.resid.length > 2 ? fit.resid : a));
      const trials = o.trials || 600;
      const rng = RNG(o.seed || 'nv-forecast');
      const drift = o.drift == null ? fit.trend : o.drift;           // dérive imposée (scénario)
      const vol = (o.vol == null ? 1 : o.vol) * sdResid;             // volatilité relative
      const phi = fit.phi == null ? 0.86 : fit.phi;
      const paths = [];
      for (let t = 0; t < trials; t++) {
        let v = fit.level; const p = [];
        let damp = 1;
        for (let h = 1; h <= H; h++) {
          damp *= phi;
          v = v + drift * damp + rng.gauss(0, vol * Math.sqrt(h * 0.55 + 0.45));
          if (o.min != null) v = Math.max(o.min, v);
          if (o.max != null) v = Math.min(o.max, v);
          p.push(v);
        }
        paths.push(p);
      }
      const point = [], p10 = [], p90 = [], p25 = [], p75 = [];
      for (let h = 0; h < H; h++) {
        const col = paths.map((p) => p[h]);
        point.push(Stats.median(col));
        p10.push(Stats.quantile(col, 0.10)); p90.push(Stats.quantile(col, 0.90));
        p25.push(Stats.quantile(col, 0.25)); p75.push(Stats.quantile(col, 0.75));
      }
      return { point, p10, p90, p25, p75, level: fit.level, trend: fit.trend, sd: sdResid, trials, horizon: H, paths };
    },
    /* ------------------------------------------------------------------ *
     * PRÉDICTION AVANCÉE — ensemble multi-modèles, backtest walk-forward,
     * pondération par performance, Monte-Carlo et calibration des IC.
     * Chaque étape est tracée (opt.trace) pour pouvoir être montrée à
     * l'utilisateur : la prédiction devient explicable de bout en bout.
     * ------------------------------------------------------------------ */

    /* Nettoyage robuste : trous ignorés, points aberrants (z MAD ≥ 3,5)
       ramenés vers la médiane plutôt que supprimés. */
    clean(a) {
      const raw = (a || []).map((x) => Util.num(x, NaN));
      const fin = raw.filter(isFinite);
      const out = [], idx = [], holes = [];
      let anomalies = [];
      if (!fin.length) return { values: [], indexes: [], anomalies: [], holes: raw.map((_, i) => i), median: 0, mad: 0, repaired: 0 };
      const med = Stats.median(fin);
      const mad = Stats.median(fin.map((x) => Math.abs(x - med))) || Stats.sd(fin) || 1;
      raw.forEach((x, i) => {
        if (!isFinite(x)) { holes.push(i); return; }
        const z = 0.6745 * (x - med) / (mad || 1);
        if (Math.abs(z) >= 3.5) {
          const rep = med + (x - med) * 0.25;
          anomalies.push({ index: i, value: x, z: Util.round(z, 2), repaired: rep });
          out.push(rep);
        } else out.push(x);
        idx.push(i);
      });
      return { values: out, indexes: idx, anomalies, holes, median: med, mad, repaired: anomalies.length };
    },

    /* Caractéristiques extraites de la série (servent aux modèles et à l'UI) */
    features(a) {
      const v = (a || []).map((x) => Util.num(x, 0)), n = v.length;
      if (!n) return { n: 0 };
      const xs = v.map((_, i) => i);
      const lr = Stats.linreg(xs, v);
      const mean = Stats.mean(v), sd = Stats.sd(v);
      const ret = []; for (let i = 1; i < n; i++) ret.push(v[i] - v[i - 1]);
      const ac = (lag) => {
        if (n <= lag + 2) return 0;
        const p = [], q = [];
        for (let i = 0; i + lag < n; i++) { p.push(v[i]); q.push(v[i + lag]); }
        return Stats.linreg(p, q).r;
      };
      const a1 = ac(1), a7 = ac(7), a12 = ac(12);
      const seasonal = Math.abs(a12) >= 0.35 && n > 14 ? 12 : (Math.abs(a7) >= 0.4 && n > 9 ? 7 : 0);
      return {
        n, mean, sd, last: v[n - 1], first: v[0], min: Stats.min(v), max: Stats.max(v),
        cv: mean ? sd / Math.abs(mean) : 0, slope: lr.m, r2: lr.r2, intercept: lr.b,
        ac1: a1, ac7: a7, ac12: a12, seasonal,
        volRet: Stats.sd(ret), driftRet: Stats.mean(ret),
        range: Stats.max(v) - Stats.min(v),
        trendPctMonth: mean ? (lr.m / Math.abs(mean)) * 100 : 0
      };
    },

    /* Zoo de modèles : chacun expose fit(v, features) → { predict(h), info }.
       Réutilisable par n'importe quel module (agri, santé publique, marché…). */
    modelZoo() {
      return [
        {
          id: 'holt', label: 'Holt à tendance amortie', family: 'Lissage exponentiel double', color: '#38f0a5',
          min: 4, info: 'α 0,42 · β 0,18 · φ 0,86',
          fit(v) {
            const f = Stats.holt(v, { alpha: 0.42, beta: 0.18, phi: 0.86 });
            return {
              predict(h) { let s = f.level, d = 1; for (let i = 1; i <= h; i++) { d *= f.phi; s += f.trend * d; } return s; },
              params: { level: f.level, trend: f.trend, phi: f.phi }
            };
          }
        },
        {
          id: 'theta', label: 'Méthode Theta', family: 'Décomposition θ-lines', color: '#22d3ee',
          min: 5, info: 'θ₂ (SES 0,30) ⊕ θ₀ (extrapolation OLS)',
          fit(v) {
            const n = v.length;
            const th2 = []; const ses = Stats.ewma(v, 0.3);
            for (let i = 0; i < n; i++) th2.push(2 * v[i] - ses[i]);
            const l2 = Stats.ewma(th2, 0.3)[n - 1];
            const lr = Stats.linreg(v.map((_, i) => i), v);
            return {
              predict(h) { const i = n - 1 + h; return 0.5 * (l2 + lr.predict(i)); },
              params: { theta2Level: l2, slope: lr.m }
            };
          }
        },
        {
          id: 'drift', label: 'EWMA + dérive amortie', family: 'Niveau local + pente globale', color: '#a3e635',
          min: 4, info: 'EWMA 0,35 + pente OLS amortie (0,88^h)',
          fit(v, f) {
            const n = v.length, lvl = Stats.ewma(v, 0.35)[n - 1], m = (f && f.slope) || 0;
            return { predict(h) { let s = lvl; for (let i = 1; i <= h; i++) s += m * Math.pow(0.88, i); return s; }, params: { level: lvl, slope: m } };
          }
        },
        {
          id: 'ols', label: 'Régression tendancielle', family: 'Moindres carrés', color: '#f5c451',
          min: 4, info: 'y = a + b·t, extrapolation amortie',
          fit(v, f) {
            const n = v.length, lr = Stats.linreg(v.map((_, i) => i), v);
            return { predict(h) { const i = n - 1 + h; return lr.b + lr.m * (n - 1) + lr.m * h * Math.pow(0.9, h * 0.35); }, params: { slope: lr.m, r2: lr.r2, n } };
          }
        },
        {
          id: 'snaive', label: 'Naïf saisonnier', family: 'Répétition de cycle', color: '#818cf8',
          min: 3, info: 'lag détecté par autocorrélation (7 / 12)',
          fit(v, f) {
            const lag = (f && f.seasonal) || 1, n = v.length;
            return { predict(h) { const i = n - 1 + h; return v[((i - lag) % n + n) % n]; }, params: { lag } };
          }
        },
        {
          id: 'ar1', label: 'Retour à la moyenne (AR-1)', family: 'Processus stationnaire', color: '#f472b6',
          min: 5, info: 'ρ estimé sur les écarts à la médiane mobile',
          fit(v) {
            const n = v.length, med = Stats.median(v);
            const d = v.map((x) => x - med);
            const num = d.slice(1).reduce((s, x, i) => s + x * d[i], 0);
            const den = d.slice(0, -1).reduce((s, x) => s + x * x, 0) || 1;
            const rho = Util.clamp(num / den, -0.9, 0.97);
            return { predict(h) { return med + Math.pow(rho, h) * (v[n - 1] - med); }, params: { rho, median: med } };
          }
        }
      ];
    },

    /* Backtest walk-forward (fenêtre expansive) : erreurs par modèle et par
       horizon + prédictions conservées pour la pondération et la calibration. */
    backtest(v, fitted, opt) {
      const o = opt || {}, n = v.length;
      const minTrain = Math.max(o.minTrain || 4, Math.ceil(n * 0.45));
      const hmax = Util.clamp(o.hmax || 3, 1, Math.max(1, n - minTrain));
      const recs = [];
      for (let k = minTrain; k <= n - 1; k++) {
        const train = v.slice(0, k);
        const preds = {};
        fitted.forEach((F) => {
          try {
            const m = F.def.fit(train, Stats.features(train), o);
            preds[F.def.id] = [];
            for (let h = 1; h <= Math.min(hmax, n - k); h++) preds[F.def.id].push(m.predict(h));
          } catch (e) { preds[F.def.id] = []; }
        });
        for (let h = 1; h <= Math.min(hmax, n - k); h++) {
          recs.push({ k, h, actual: v[k + h - 1], preds });
        }
      }
      const perModel = fitted.map((F) => {
        const errs = [];
        recs.forEach((r) => { const p = r.preds[F.def.id] && r.preds[F.def.id][r.h - 1]; if (p != null && isFinite(p)) errs.push(r.actual - p); });
        const ae = errs.map(Math.abs);
        const mae = ae.length ? Stats.mean(ae) : Infinity;
        const rmse = errs.length ? Math.sqrt(Stats.mean(errs.map((e) => e * e))) : Infinity;
        const mape = recs.length ? Stats.mean(recs.map((r) => {
          const p = r.preds[F.def.id] && r.preds[F.def.id][r.h - 1];
          return (p != null && isFinite(p) && r.actual) ? Math.abs((r.actual - p) / r.actual) : 0;
        })) * 100 : Infinity;
        return { id: F.def.id, mae, rmse, mape, n: errs.length };
      });
      return { folds: recs.length, minTrain, hmax, records: recs, perModel };
    },

    /* Prévision d'ensemble : pipeline complet + trace des étapes. */
    ensembleForecast(a, horizon, opt) {
      const o = opt || {};
      const t0 = Date.now();
      const steps = [];
      const step = (id, label, detail, metrics) => { steps.push({ id, label, detail, metrics: metrics || {} }); };
      const H = Math.max(1, horizon | 0);
      const rng = RNG(o.seed || 'nv-ensemble');
      const driftFn = typeof o.drift === 'function' ? o.drift : () => Util.num(o.drift, 0);
      const driftSd = Util.num(o.driftSd, 0);

      /* --- 1. ingestion --------------------------------------------------- */
      const raw = (a || []).map((x) => Util.num(x, NaN));
      const cl = Stats.clean(raw);
      const v = cl.values;
      step('ingest', o.labels && o.labels.ingest || 'Ingestion de la série',
        (o.labels && o.labels.ingestDetail) || 'Lecture des observations, conversion numérique, détection des valeurs manquantes.',
        { points: raw.length, usable: v.length, holes: cl.holes.length });

      if (v.length < 3) {
        const last = isFinite(Util.num(raw[raw.length - 1], NaN)) ? Util.num(raw[raw.length - 1]) : 0;
        const flat = new Array(H).fill(last);
        step('fallback', 'Données insuffisantes', 'Moins de 3 observations exploitables : prévision plate à intervalles larges.', { usable: v.length });
        return {
          point: flat, p10: flat.map((x) => x * 0.85), p90: flat.map((x) => x * 1.15), p25: flat.map((x) => x * 0.94), p75: flat.map((x) => x * 1.06),
          p50: flat, paths: [], models: [], features: Stats.features(v), anomalies: cl.anomalies, calibration: null,
          uncertainty: null, steps, horizon: H, trials: 0, drift: 0, ms: Date.now() - t0, degenerate: true, level: last, trend: 0, sd: 0
        };
      }

      /* --- 2. nettoyage --------------------------------------------------- */
      step('clean', (o.labels && o.labels.clean) || 'Nettoyage & valeurs aberrantes',
        'Écart médian absolu (MAD) : tout point à |z| ≥ 3,5 est ramené de 75 % vers la médiane au lieu d\'être supprimé.',
        { anomalies: cl.anomalies.length, median: Util.round(cl.median, 2), mad: Util.round(cl.mad, 3), holes: cl.holes.length });

      /* --- 3. caractéristiques ------------------------------------------- */
      const f = Stats.features(v);
      step('features', (o.labels && o.labels.features) || 'Extraction de caractéristiques',
        'Tendance (OLS), volatilité des variations, autocorrélation lag 1/7/12, détection de saisonnalité.',
        { slope: Util.round(f.slope, 4), r2: Util.round(f.r2, 3), cv: Util.round(f.cv * 100, 1) + '%', ac1: Util.round(f.ac1, 2), ac7: Util.round(f.ac7, 2), ac12: Util.round(f.ac12, 2), seasonal: f.seasonal || 'aucune' });

      /* --- 4. entraînement des modèles candidats -------------------------- */
      const zoo = Stats.modelZoo().filter((d) => v.length >= (d.min || 3));
      const fitted = [];
      zoo.forEach((d) => { try { const m = d.fit(v, f, o); if (m && typeof m.predict === 'function' && isFinite(m.predict(1))) fitted.push({ def: d, model: m }); } catch (e) { } });
      if (!fitted.length) fitted.push({ def: zoo[0] || Stats.modelZoo()[0], model: { predict: () => f.last } });
      step('train', (o.labels && o.labels.train) || 'Entraînement des modèles candidats',
        fitted.map((F) => F.def.label).join(' · '),
        { candidates: zoo.length, trained: fitted.length, models: fitted.map((F) => F.def.id) });

      /* --- 5. backtest walk-forward -------------------------------------- */
      const bt = Stats.backtest(v, fitted, { hmax: o.btHorizon || 3, minTrain: o.minTrain });
      const valid = bt.perModel.filter((m) => isFinite(m.mae));
      const bestMae = valid.length ? Math.min.apply(null, valid.map((m) => m.mae)) : 0;
      step('backtest', (o.labels && o.labels.backtest) || 'Backtest walk-forward',
        'Fenêtre expansive : chaque modèle est ré-entraîné puis noté sur des données qu\'il n\'a jamais vues.',
        { folds: bt.folds, hmax: bt.hmax, bestMae: Util.round(bestMae, 3), evaluated: valid.length });

      /* --- 6. pondération de l'ensemble ---------------------------------- */
      const T = o.temperature == null ? 0.55 : o.temperature;
      const scored = fitted.map((F) => {
        const pm = bt.perModel.filter((m) => m.id === F.def.id)[0] || { mae: Infinity, rmse: Infinity, mape: Infinity, n: 0 };
        const rel = isFinite(pm.mae) && bestMae > 0 ? pm.mae / bestMae : (isFinite(pm.mae) ? 1 : 99);
        return { F, mae: pm.mae, rmse: pm.rmse, mape: pm.mape, n: pm.n, rel, w: Math.exp(-rel / T) };
      });
      const wSum = scored.reduce((s, x) => s + x.w, 0) || 1;
      scored.forEach((x) => {
        x.weight = Math.max(0.02, x.w / wSum);
        x.dropped = !(x.rel <= (o.dropRatio || 2.6)) || !isFinite(x.mae);
        if (x.dropped) x.weight = 0;
      });
      const kept = scored.filter((x) => !x.dropped);
      const kSum = kept.reduce((s, x) => s + x.weight, 0) || 1;
      kept.forEach((x) => { x.weight = x.weight / kSum; });
      step('weight', (o.labels && o.labels.weight) || 'Pondération par performance',
        'Softmax sur l\'erreur relative (température ' + T + ') ; tout modèle dépassant ' + (o.dropRatio || 2.6) + '× la meilleure erreur est écarté.',
        { retained: kept.length, dropped: scored.length - kept.length, top: (kept.slice().sort((p, q) => q.weight - p.weight)[0] || {}).id });

      /* prédictions individuelles sur l'horizon */
      const preds = {};
      scored.forEach((x) => {
        const arr = [];
        for (let h = 1; h <= H; h++) { let p; try { p = x.F.model.predict(h); } catch (e) { p = f.last; } arr.push(isFinite(p) ? p : f.last); }
        preds[x.F.def.id] = arr;
      });
      const ensPoint = [];
      for (let h = 0; h < H; h++) {
        let s = 0; kept.forEach((x) => { s += x.weight * preds[x.F.def.id][h]; });
        ensPoint.push(s);
      }

      /* --- 7. erreurs d'ensemble (backtest) → σ par horizon -------------- */
      const wOf = (id) => { const x = scored.filter((q) => q.F.def.id === id)[0]; return (x && !x.dropped) ? x.weight : 0; };
      const zByH = {}, zAll = [];
      bt.records.forEach((r) => {
        let p = 0; Object.keys(r.preds).forEach((id) => { const q = r.preds[id][r.h - 1]; if (q != null && isFinite(q)) p += wOf(id) * q; });
        const e = r.actual - p;
        (zByH[r.h] = zByH[r.h] || []).push(e);
        zAll.push({ h: r.h, e });
      });
      const sdByH = {};
      Object.keys(zByH).forEach((h) => { sdByH[h] = Math.max(1e-9, Stats.sd(zByH[h].length > 1 ? zByH[h] : zAll.map((z) => z.e))); });
      const sdGlobal = Math.max(1e-9, Stats.sd(zAll.map((z) => z.e)));
      const sigma = (h) => (sdByH[h] != null && zByH[h] && zByH[h].length > 2 ? sdByH[h] : sdGlobal * Math.sqrt(0.55 * h + 0.45));

      /* --- 8. calibration des intervalles (forme des queues) ------------- */
      const zStd = zAll.map((z) => z.e / (sigma(z.h) || sdGlobal)).filter(isFinite);
      let volScale = 1, coverage = null;
      if (zStd.length > 3) {
        const q10 = Stats.quantile(zStd, 0.10), q90 = Stats.quantile(zStd, 0.90);
        volScale = Util.clamp(((q90 - q10) / 2) / 1.2816, 0.6, 2.2);
        coverage = zStd.filter((z) => Math.abs(z) <= 1.2816).length / zStd.length;
      }
      step('calibrate', (o.labels && o.labels.calibrate) || 'Calibration des intervalles',
        'Les résidus standardisés du backtest mesurent la forme réelle des queues ; le facteur de volatilité corrige l\'intervalle nominal de 80 %.',
        { volScale: Util.round(volScale, 2), coverage: coverage == null ? '—' : Util.round(coverage * 100, 0) + '%', residuals: zStd.length });

      /* --- 9. simulation de Monte-Carlo ---------------------------------- */
      const trials = Util.clamp(o.trials || 800, 40, 6000);
      const rho = o.rho == null ? 0.55 : o.rho;                 // autocorrélation du bruit
      const bnd = { min: o.min == null ? -Infinity : o.min, max: o.max == null ? Infinity : o.max };
      const jitterW = (rngL) => {
        /* tirage Dirichlet approché (gamma) autour des poids retenus */
        const conc = o.weightConcentration == null ? 14 : o.weightConcentration;
        const g = kept.map((x) => Math.max(1e-6, x.weight) * conc);
        const draws = g.map((shape) => {
          /* gamma(shape,1) par Marsaglia-Tsang simplifié (shape ≥ 1 après redressement) */
          const sh = Math.max(1, shape);
          const d = sh - 1 / 3, c = 1 / Math.sqrt(9 * d);
          for (let it = 0; it < 60; it++) {
            const xx = rngL.normal(); let vv = 1 + c * xx;
            if (vv <= 0) continue;
            vv = vv * vv * vv;
            const uu = rngL.next();
            if (uu < 1 - 0.0331 * xx * xx * xx * xx || Math.log(uu) < 0.5 * xx * xx + d * (1 - vv + Math.log(vv))) return d * vv * (shape < 1 ? Math.pow(rngL.next(), 1 / shape) : 1);
          }
          return shape;
        });
        const tot = draws.reduce((s, x) => s + x, 0) || 1;
        return draws.map((x) => x / tot);
      };
      const pool = zStd.length > 2 ? zStd : [0];
      const sampleZ = () => pool[Math.floor(rng.next() * pool.length)] * rng.gauss(1, 0.25) + rng.normal() * 0.35;
      const driftPhi = o.driftPhi == null ? 0.965 : o.driftPhi;
      /* dérive cumulative pré-calculée (O(H) au lieu de O(H²) par trajectoire) */
      const cumDrift = [];
      if (typeof o.drift !== 'function') {
        let acc = 0;
        for (let h = 1; h <= H; h++) { acc += driftFn(h, 0) * Math.pow(driftPhi, h - 1); cumDrift.push(acc); }
      }
      const simulate = (nTrials, useNoise, useWeightJitter, useDriftJitter) => {
        const out = [];
        for (let t = 0; t < nTrials; t++) {
          const wj = useWeightJitter ? jitterW(rng) : null;
          const dJit = useDriftJitter && driftSd > 0 ? rng.gauss(1, driftSd) : 1;
          let z = 0, dAcc = 0; const path = [];
          for (let h = 1; h <= H; h++) {
            let base = 0;
            if (wj) { for (let i = 0; i < kept.length; i++) base += wj[i] * preds[kept[i].F.def.id][h - 1]; }
            else base = ensPoint[h - 1];
            const dr = cumDrift.length ? cumDrift[h - 1] : (dAcc += driftFn(h, base) * Math.pow(driftPhi, h - 1));
            z = rho * z + Math.sqrt(1 - rho * rho) * sampleZ();
            let val = base + dr * dJit + (useNoise ? z * sigma(Math.min(h, bt.hmax)) * volScale * Math.sqrt(0.6 + 0.4 * h) : 0);
            val = Util.clamp(val, bnd.min, bnd.max);
            path.push(val);
          }
          out.push(path);
        }
        return out;
      };
      const paths = simulate(trials, true, o.modelUncertainty !== false, driftSd > 0);
      const point = [], p10 = [], p25 = [], p50 = [], p75 = [], p90 = [];
      for (let h = 0; h < H; h++) {
        const c = paths.map((p) => p[h]);
        point.push(Stats.median(c)); p50.push(Stats.median(c));
        p10.push(Stats.quantile(c, 0.10)); p25.push(Stats.quantile(c, 0.25));
        p75.push(Stats.quantile(c, 0.75)); p90.push(Stats.quantile(c, 0.90));
      }
      step('montecarlo', (o.labels && o.labels.mc) || 'Simulation de Monte-Carlo',
        trials + ' trajectoires : bootstrap des résidus calibrés, bruit autocorrélé (ρ ' + rho + '), tirage des poids (Dirichlet) et dérive de scénario amortie (φ ' + driftPhi + ').',
        { trials, rho, horizon: H, driftPerMonth: Util.round(Util.num(driftFn(1, ensPoint[0]), 0), 4), p50End: Util.round(point[H - 1], 3) });

      /* --- 10. décomposition de l'incertitude ---------------------------- */
      const varAt = (arr) => { const c = arr.map((p) => p[H - 1]); const m = Stats.mean(c); return Stats.mean(c.map((x) => (x - m) * (x - m))); };
      const nSub = Math.min(420, Math.max(80, Math.round(trials / 2)));
      const vTot = varAt(paths);
      const vRes = varAt(simulate(nSub, true, false, false));
      const vMod = o.modelUncertainty === false ? 0 : varAt(simulate(nSub, false, true, false));
      const vDri = driftSd > 0 ? varAt(simulate(nSub, false, false, true)) : 0;
      const sum = (vRes + vMod + vDri) || 1;
      const uncertainty = {
        total: Math.sqrt(Math.max(0, vTot)),
        shares: {
          residual: Util.round((vRes / sum) * 100, 0),
          model: Util.round((vMod / sum) * 100, 0),
          scenario: Util.round((vDri / sum) * 100, 0)
        }
      };
      step('uncertainty', (o.labels && o.labels.unc) || 'Décomposition de l\'incertitude',
        'Trois simulations partielles isolent chaque source : bruit résiduel, désaccord entre modèles, incertitude de scénario.',
        uncertainty.shares);

      /* --- 11. synthèse --------------------------------------------------- */
      const models = scored.map((x) => ({
        id: x.F.def.id, label: x.F.def.label, family: x.F.def.family, color: x.F.def.color, info: x.F.def.info,
        mae: isFinite(x.mae) ? Util.round(x.mae, 4) : null,
        rmse: isFinite(x.rmse) ? Util.round(x.rmse, 4) : null,
        mape: isFinite(x.mape) ? Util.round(x.mape, 2) : null,
        weight: Util.round(x.weight * 100, 1), dropped: !!x.dropped,
        rel: isFinite(x.rel) ? Util.round(x.rel, 2) : null,
        forecast: preds[x.F.def.id], params: (x.F.model.params || {})
      })).sort((p, q) => q.weight - p.weight);
      step('synthesis', (o.labels && o.labels.synthesis) || 'Synthèse & publication',
        'Médiane des trajectoires = P50 ; enveloppe P10–P90 ; contributions des modèles conservées pour l\'explication.',
        { p50: Util.round(point[H - 1], 3), ic80: Util.round(p10[H - 1], 2) + ' → ' + Util.round(p90[H - 1], 2), models: models.length });

      /* prédiction one-step des modèles sur l'historique (pour le graphique de backtest) */
      const chart = { labels: v.map((_, i) => i + 1), actual: v.slice(), series: [] };
      scored.forEach((x) => {
        const data = new Array(v.length).fill(null);
        bt.records.forEach((r) => {
          if (r.h !== 1) return;
          const p = r.preds[x.F.def.id] && r.preds[x.F.def.id][0];
          if (p != null && isFinite(p)) data[r.k] = p;
        });
        chart.series.push({ id: x.F.def.id, label: x.F.def.label, color: x.F.def.color, data, dropped: !!x.dropped, weight: x.weight });
      });

      return {
        point, p10, p25, p50, p75, p90, paths, models, features: f, anomalies: cl.anomalies,
        calibration: { volScale: Util.round(volScale, 3), coverage: coverage == null ? null : Util.round(coverage, 3), residuals: zStd.length, sigmaH: sigma(1) },
        uncertainty, backtest: { folds: bt.folds, hmax: bt.hmax, minTrain: bt.minTrain, chart, perModel: bt.perModel },
        ensemble: ensPoint, steps, horizon: H, trials, drift: Util.num(driftFn(1, ensPoint[0]), 0),
        level: f.last, trend: f.slope, sd: sdGlobal, ms: Date.now() - t0, seed: o.seed || 'nv-ensemble'
      };
    },

    /* Chaîne de Markov : distributions successives + échantillonnage de cohortes */
    markov(P, start, steps) {
      const n = P.length;
      let d = start.slice();
      const out = [d.slice()];
      for (let s = 0; s < steps; s++) {
        const nd = new Array(n).fill(0);
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nd[j] += d[i] * P[i][j];
        const tot = Stats.sum(nd) || 1;
        d = nd.map((x) => x / tot);
        out.push(d.slice());
      }
      return out;
    },
    markovSample(P, startIdx, steps, rng) {
      let i = startIdx; const path = [i];
      for (let s = 0; s < steps; s++) {
        const row = P[i]; let r = rng.next(), j = 0;
        for (; j < row.length; j++) { r -= row[j]; if (r <= 0) break; }
        i = Math.min(j, P.length - 1); path.push(i);
      }
      return path;
    },
    sigmoid(z) { return 1 / (1 + Math.exp(-z)); },
    logit(p) { p = Util.clamp(p, 1e-6, 1 - 1e-6); return Math.log(p / (1 - p)); },
    /* Modèle de risque logistique linéaire explicable :
       base = logit du risque de référence ; chaque facteur ajoute un log-odds.
       Retourne la probabilité + la contribution exacte de chaque facteur. */
    linearRisk(base, factors) {
      let z = Stats.logit(Util.clamp(base, 1e-4, 0.999));
      const z0 = z;
      const contrib = factors.map((f) => { z += Util.num(f.delta, 0); return { key: f.key, label: f.label, delta: Util.num(f.delta, 0), value: f.value, unit: f.unit || '', ref: f.ref || '', tone: f.tone || 'neutral' }; });
      const p = Stats.sigmoid(z);
      const p0 = Stats.sigmoid(z0);
      contrib.forEach((c) => {
        // impact marginal en points de probabilité (ordre d'application)
        c.pp = (Stats.sigmoid(z0 + c.delta) - p0) * 100;
      });
      return { p, p0, z, contributions: contrib.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) };
    },
    /* Intervalle de confiance par bootstrap sur les paramètres du modèle */
    riskCI(base, factors, opt) {
      const o = opt || {}, trials = o.trials || 400, rng = RNG(o.seed || 'nv-ci');
      const out = [];
      for (let t = 0; t < trials; t++) {
        const fs = factors.map((f) => ({ key: f.key, label: f.label, delta: Util.num(f.delta, 0) * rng.gauss(1, o.jitter == null ? 0.22 : o.jitter) + rng.gauss(0, o.bias || 0.06) }));
        out.push(Stats.linearRisk(base, fs).p);
      }
      return [Stats.quantile(out, 0.05), Stats.quantile(out, 0.95)];
    },
    /* Détection d'anomalies (z-score robuste + MAD) */
    anomalies(series, opt) {
      const o = opt || {}, thr = o.threshold == null ? 2.4 : o.threshold;
      const v = series.map((x) => Util.num(x, 0));
      const med = Stats.median(v);
      const mad = Stats.median(v.map((x) => Math.abs(x - med))) || Stats.sd(v) || 1;
      const out = [];
      v.forEach((x, i) => {
        const z = 0.6745 * (x - med) / (mad || 1);
        if (Math.abs(z) >= thr) out.push({ index: i, value: x, z });
      });
      return out;
    },
    /* Corrélation de Pearson */
    corr(xs, ys) { return Stats.linreg(xs, ys).r; },
    /* Espérance de vie « en bonne santé » simplifiée : somme des distributions pondérées */
    healthyYears(dists, weights, fromStep) {
      let y = 0;
      for (let s = (fromStep || 0); s < dists.length - 1; s++) {
        let w = 0;
        for (let i = 0; i < dists[s].length; i++) w += dists[s][i] * (weights[i] == null ? 0 : weights[i]);
        y += w;
      }
      return y;
    }
  };

  /* ==========================================================================
     3. COULEURS / THÈME
     ====================================================================== */
  const Theme = {
    palette: ['#38f0a5', '#22d3ee', '#a3e635', '#f5c451', '#fb7185', '#818cf8', '#f472b6', '#4ade80', '#fbbf24', '#60a5fa'],
    tones: { good: '#38f0a5', ok: '#a3e635', warn: '#f5c451', risk: '#fb7185', info: '#22d3ee', neutral: '#94a3b8' },
    at(i) { return Theme.palette[i % Theme.palette.length]; },
    tone(name) { return Theme.tones[name] || Theme.tones.neutral; },
    /* échelle séquentielle vert→ambre→rouge */
    scale(t) {
      t = Util.clamp(t, 0, 1);
      const stops = [[56, 240, 165], [163, 230, 53], [245, 196, 81], [251, 113, 133]];
      const seg = Util.clamp(Math.floor(t * (stops.length - 1)), 0, stops.length - 2);
      const k = t * (stops.length - 1) - seg;
      const c = stops[seg].map((v, i) => Math.round(Util.lerp(v, stops[seg + 1][i], k)));
      return 'rgb(' + c.join(',') + ')';
    },
    withAlpha(color, a) {
      if (/^#([0-9a-f]{6})$/i.test(color)) {
        const n = parseInt(color.slice(1), 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
      }
      if (/^rgb\(/.test(color)) return color.replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
      return color;
    }
  };

  global.NutriVision = global.NutriVision || {};
  const NV = global.NutriVision;
  NV.util = Util; NV.rng = RNG; NV.stats = Stats; NV.theme = Theme; NV.version = '1.0.0';
  NV.alias = (global.NV = NV);
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================================
   4. MOTEUR DE GRAPHIQUES SVG  (NV.chart)
   ============================================================================ */
(function (global) {
  'use strict';
  const NV = global.NutriVision, Util = NV.util, Theme = NV.theme, Stats = NV.stats;
  let uidCounter = 0;
  const nextId = () => 'nv' + (++uidCounter);

  /* --- tooltip partagé --------------------------------------------------- */
  let tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'nv-tip';
      tipEl.setAttribute('role', 'status');
      (document.body || document.documentElement).appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(html, evt) {
    const t = tip();
    t.innerHTML = html;
    t.classList.add('on');
    const pad = 14, w = t.offsetWidth || 160, h = t.offsetHeight || 60;
    let x = (evt.clientX || 0) + pad, y = (evt.clientY || 0) + pad;
    const vw = global.innerWidth || 1200, vh = global.innerHeight || 800;
    if (x + w > vw - 8) x = (evt.clientX || 0) - w - pad;
    if (y + h > vh - 8) y = (evt.clientY || 0) - h - pad;
    t.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('on'); }
  function tipRow(color, name, value, extra) {
    return '<div class="nv-tip-row"><i style="background:' + color + '"></i><span>' + Util.esc(name) + '</span>' +
      '<b>' + Util.esc(value) + '</b>' + (extra ? '<em>' + Util.esc(extra) + '</em>' : '') + '</div>';
  }

  /* --- échelles / axes --------------------------------------------------- */
  function scale(d0, d1, r0, r1) {
    const f = (v) => r0 + ((Util.num(v, 0) - d0) / ((d1 - d0) || 1)) * (r1 - r0);
    f.invert = (p) => d0 + ((p - r0) / ((r1 - r0) || 1)) * (d1 - d0);
    f.domain = [d0, d1]; f.range = [r0, r1];
    return f;
  }
  function niceTicks(min, max, count) {
    const n = Math.max(2, count || 5), span = (max - min) || 1;
    const raw = span / (n - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const out = [];
    let v = Math.ceil(min / step) * step;
    for (let i = 0; i < 40 && v <= max + step * 0.5; i++) { out.push(Util.round(v, 6)); v += step; }
    return out;
  }
  function domainOf(spec, series, padRatio) {
    const ok = (v) => v != null && v !== '' && isFinite(Util.num(v, NaN));
    let vals = [];
    series.forEach((s) => { (s.data || []).forEach((v) => { if (ok(v)) vals.push(Util.num(v)); }); });
    (spec.cone ? [spec.cone.p10, spec.cone.p90, spec.cone.p25, spec.cone.p75, spec.cone.lo, spec.cone.hi] : []).forEach((a) => { if (a) a.forEach((v) => { if (ok(v)) vals.push(Util.num(v)); }); });
    (spec.zones || []).forEach((z) => { if (isFinite(z.from)) vals.push(z.from); if (isFinite(z.to)) vals.push(z.to); });
    if (spec.goal && isFinite(Util.num(spec.goal.value, NaN))) vals.push(Util.num(spec.goal.value));
    if (spec.markers) spec.markers.forEach((m) => { if (isFinite(Util.num(m.value, NaN))) vals.push(Util.num(m.value)); });
    if (!vals.length) vals = [0, 1];
    let lo = spec.y && spec.y.min != null ? spec.y.min : Math.min.apply(null, vals);
    let hi = spec.y && spec.y.max != null ? spec.y.max : Math.max.apply(null, vals);
    if (spec.y && spec.y.zero) lo = Math.min(0, lo);
    if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * (padRatio == null ? 0.12 : padRatio);
    if (!(spec.y && spec.y.min != null)) lo -= pad;
    if (!(spec.y && spec.y.max != null)) hi += pad;
    return [lo, hi];
  }
  function fmtVal(v, axis) {
    const f = axis && axis.format;
    if (typeof f === 'function') return f(v);
    if (f === 'int') return Util.fmtInt(v);
    if (f === 'pct') return Util.fmt(v, 0) + '%';
    if (f === 'compact') return Util.compact(v);
    const d = axis && axis.digits != null ? axis.digits : (Math.abs(v) >= 100 ? 0 : 1);
    return Util.fmt(v, d) + (axis && axis.unit ? ' ' + axis.unit : '');
  }

  /* --- primitives de tracé ---------------------------------------------- */
  function linePath(pts) {
    if (!pts.length) return '';
    return 'M' + pts.map((p) => Util.round(p[0], 2) + ',' + Util.round(p[1], 2)).join(' L');
  }
  function smoothPath(pts, tension) {
    if (pts.length < 3) return linePath(pts);
    const t = tension == null ? 0.26 : tension;
    let d = 'M' + Util.round(pts[0][0], 2) + ',' + Util.round(pts[0][1], 2);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
      const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
      d += ' C' + Util.round(c1[0], 2) + ',' + Util.round(c1[1], 2) + ' ' + Util.round(c2[0], 2) + ',' + Util.round(c2[1], 2) +
        ' ' + Util.round(p2[0], 2) + ',' + Util.round(p2[1], 2);
    }
    return d;
  }
  function areaFrom(pts, baseY, tension) {
    if (!pts.length) return '';
    return smoothPath(pts, tension) + ' L' + Util.round(pts[pts.length - 1][0], 2) + ',' + baseY +
      ' L' + Util.round(pts[0][0], 2) + ',' + baseY + ' Z';
  }
  function svgEl(tag, attrs) { return Util.mk(tag, attrs); }
  function text(x, y, str, cls, anchor) {
    const t = svgEl('text', { x: Util.round(x, 1), y: Util.round(y, 1), class: cls || 'nv-t' });
    if (anchor) t.setAttribute('text-anchor', anchor);
    t.textContent = str == null ? '' : String(str);
    return t;
  }
  function animatePath(path, delay) {
    if (Util.reducedMotion()) return;
    try {
      const len = path.getTotalLength ? path.getTotalLength() : 0;
      if (!len || !isFinite(len)) return;
      path.style.strokeDasharray = len + ' ' + len;
      path.style.strokeDashoffset = String(len);
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset ' + (delay && delay.dur ? delay.dur : 900) + 'ms cubic-bezier(.22,1,.36,1) ' + ((delay && delay.wait) || 0) + 'ms';
      path.style.strokeDashoffset = '0';
      setTimeout(() => { path.style.transition = ''; if (!(path.dataset.keepDash === '1')) { path.style.strokeDasharray = path.dataset.dash || ''; } }, (delay && delay.dur ? delay.dur : 900) + ((delay && delay.wait) || 0) + 60);
    } catch (e) { /* environnement sans layout SVG */ }
  }

  /* --- rendu ligne / aire / cône de prévision --------------------------- */
  function renderLine(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-line', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const series = (spec.series || []).filter((s) => s && s.data);
    const padL = spec.padL == null ? 46 : spec.padL, padR = spec.y2 ? 46 : (spec.padR == null ? 14 : spec.padR);
    const padT = spec.padT == null ? 14 : spec.padT, padB = spec.padB == null ? 26 : spec.padB;
    const iw = Math.max(40, w - padL - padR), ih = Math.max(30, h - padT - padB);
    const labels = spec.labels || [];
    const n = Math.max(2, labels.length || (series[0] && series[0].data.length) || 2);
    const dom = domainOf(spec, series.filter((s) => s.axis !== 'y2'));
    const x = scale(0, n - 1, padL, padL + iw);
    const y = scale(dom[0], dom[1], padT + ih, padT);
    let y2 = null;
    if (spec.y2) {
      const s2 = series.filter((s) => s.axis === 'y2');
      const d2 = domainOf({ y: spec.y2 }, s2);
      y2 = scale(d2[0], d2[1], padT + ih, padT);
    }

    /* zones de référence (plages horizontales) */
    (spec.zones || []).forEach((z) => {
      const yTop = y(Math.max(Util.num(z.to, dom[1]), Util.num(z.from, dom[0])));
      const yBot = y(Math.min(Util.num(z.to, dom[1]), Util.num(z.from, dom[0])));
      svg.appendChild(svgEl('rect', {
        x: padL, y: Util.round(yTop, 1), width: Util.round(iw, 1), height: Math.max(1, Util.round(yBot - yTop, 1)),
        fill: z.color || Theme.tones.ok, opacity: z.opacity == null ? 0.09 : z.opacity, class: 'nv-zone'
      }));
      if (z.label) svg.appendChild(text(padL + iw - 4, Util.round(yTop, 1) + 12, z.label, 'nv-zone-label', 'end'));
    });

    /* grille + axe Y */
    const ticks = (spec.y && spec.y.ticks) || niceTicks(dom[0], dom[1], h < 150 ? 4 : 5);
    ticks.forEach((tv) => {
      const yy = y(tv);
      if (yy < padT - 2 || yy > padT + ih + 2) return;
      svg.appendChild(svgEl('line', { x1: padL, y1: Util.round(yy, 1), x2: padL + iw, y2: Util.round(yy, 1), class: 'nv-grid' }));
      svg.appendChild(text(padL - 7, yy + 3.5, fmtVal(tv, spec.y), 'nv-t nv-axis', 'end'));
    });
    if (y2) {
      niceTicks(y2.domain[0], y2.domain[1], 4).forEach((tv) => {
        const yy = y2(tv);
        if (yy < padT - 2 || yy > padT + ih + 2) return;
        svg.appendChild(text(padL + iw + 7, yy + 3.5, fmtVal(tv, spec.y2), 'nv-t nv-axis nv-axis2', 'start'));
      });
    }
    /* axe X */
    const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 62))));
    for (let i = 0; i < n; i++) {
      if (i % every !== 0 && i !== n - 1) continue;
      svg.appendChild(text(x(i), h - 8, labels[i] != null ? labels[i] : String(i + 1), 'nv-t nv-axis', 'middle'));
    }
    svg.appendChild(svgEl('line', { x1: padL, y1: padT + ih, x2: padL + iw, y2: padT + ih, class: 'nv-axis-line' }));

    /* Cadre de tracé : tout ce qui suit est découpé (clipPath) afin qu'aucune
       courbe, aire ou marqueur ne puisse sortir du graphique — même si une
       valeur aberrante ou un lissage dépasse le domaine calculé. */
    const clipId = nextId() + '-clip';
    const cp = svgEl('clipPath', { id: clipId });
    cp.appendChild(svgEl('rect', { x: padL - 2, y: padT - 4, width: iw + 4, height: ih + 8, rx: 6 }));
    defs.appendChild(cp);
    const plot = svgEl('g', { 'clip-path': 'url(#' + clipId + ')', class: 'nv-plot' });
    svg.appendChild(plot);

    /* cône d'incertitude (prévision) */
    const cone = spec.cone;
    if (cone && (cone.p10 || cone.lo)) {
      const lo = cone.p10 || cone.lo, hi = cone.p90 || cone.hi;
      const start = cone.start == null ? n - 1 - lo.length : cone.start;
      const up = [], down = [];
      for (let i = 0; i < lo.length; i++) { up.push([x(start + i), y(hi[i])]); down.push([x(start + i), y(lo[i])]); }
      const cid = nextId();
      const g = svgEl('linearGradient', { id: cid, x1: '0', y1: '0', x2: '0', y2: '1' });
      g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': cone.color || Theme.tones.info, 'stop-opacity': '0.30' }));
      g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': cone.color || Theme.tones.info, 'stop-opacity': '0.05' }));
      defs.appendChild(g);
      const d = smoothPath(up) + ' L' + down.slice().reverse().map((p) => Util.round(p[0], 2) + ',' + Util.round(p[1], 2)).join(' L') + ' Z';
      plot.appendChild(svgEl('path', { d, fill: 'url(#' + cid + ')', class: 'nv-cone' }));
      if (cone.p25 && cone.p75) {
        const u2 = [], d2b = [];
        for (let i = 0; i < cone.p25.length; i++) { u2.push([x(start + i), y(cone.p75[i])]); d2b.push([x(start + i), y(cone.p25[i])]); }
        const d25 = smoothPath(u2) + ' L' + d2b.slice().reverse().map((p) => Util.round(p[0], 2) + ',' + Util.round(p[1], 2)).join(' L') + ' Z';
        plot.appendChild(svgEl('path', { d: d25, fill: Theme.withAlpha(cone.color || Theme.tones.info, 0.16), class: 'nv-cone2' }));
      }
      /* frontière passé / prévision */
      if (spec.splitAt != null) {
        plot.appendChild(svgEl('line', { x1: x(spec.splitAt), y1: padT, x2: x(spec.splitAt), y2: padT + ih, class: 'nv-split' }));
        plot.appendChild(text(x(spec.splitAt) + 5, padT + 10, spec.splitLabel || 'forecast', 'nv-t nv-split-label', 'start'));
      }
    }

    /* objectif */
    if (spec.goal && isFinite(Util.num(spec.goal.value, NaN))) {
      const gy = y(Util.num(spec.goal.value));
      plot.appendChild(svgEl('line', { x1: padL, y1: gy, x2: padL + iw, y2: gy, class: 'nv-goal' }));
      if (spec.goal.label) plot.appendChild(text(padL + 4, gy - 5, spec.goal.label, 'nv-t nv-goal-label', 'start'));
    }

    /* Séries.
       Une valeur absente (null / undefined / '') ou non finie ouvre une RUPTURE :
       la courbe s'arrête au lieu de plonger vers 0 — c'est ce qui permet de
       tracer « historique | prévision » sur le même graphique sans artefact. */
    const hasVal = (v) => v != null && v !== '' && isFinite(Util.num(v, NaN));
    const ptsCache = [];
    series.forEach((s, si) => {
      const color = s.color || Theme.at(si);
      const sc = s.axis === 'y2' && y2 ? y2 : y;
      const all = (s.data || []).map((v, i) => ({ ok: hasVal(v), pt: [x(i), sc(Util.num(v, 0))] }));
      const segs = [];
      let cur = [];
      all.forEach((a) => { if (a.ok) { cur.push(a.pt); } else if (cur.length) { segs.push(cur); cur = []; } });
      if (cur.length) segs.push(cur);
      ptsCache.push(all.map((a) => (a.ok ? a.pt : null)));
      if (!segs.length) return;
      const nPts = segs.reduce((k, g) => k + g.length, 0);
      const gid = nextId();
      if (s.fill) {
        const g = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
        g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': s.fillOpacity == null ? 0.34 : s.fillOpacity }));
        g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0.02' }));
        defs.appendChild(g);
        segs.forEach((seg) => plot.appendChild(svgEl('path', { d: areaFrom(seg, padT + ih), fill: 'url(#' + gid + ')', class: 'nv-area' })));
      }
      const filt = s.glow !== false ? 'url(#' + glowFilter(defs) + ')' : null;
      segs.forEach((seg, gi) => {
        const p = svgEl('path', {
          d: (s.smooth === false ? linePath(seg) : smoothPath(seg)), fill: 'none', stroke: color,
          'stroke-width': s.width || 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'nv-series'
        });
        if (s.dash) { p.setAttribute('stroke-dasharray', s.dash); p.dataset.dash = s.dash; p.dataset.keepDash = '1'; }
        if (filt) p.setAttribute('filter', filt);
        plot.appendChild(p);
        animatePath(p, { dur: 900, wait: si * 90 + gi * 60 });
      });
      if (s.points || (nPts <= 24 && s.points !== false)) {
        segs.forEach((seg) => seg.forEach((pt) => {
          const c = svgEl('circle', { cx: pt[0], cy: pt[1], r: nPts > 40 ? 1.8 : 2.8, fill: color, class: 'nv-dot' });
          c.style.opacity = nPts > 60 ? '0' : '1';
          plot.appendChild(c);
        }));
      }
      if (s.lastLabel !== false) {
        const last = segs[segs.length - 1];
        const lp = last[last.length - 1];
        plot.appendChild(svgEl('circle', { cx: lp[0], cy: lp[1], r: 4.6, fill: color, class: 'nv-dot-last' }));
        plot.appendChild(svgEl('circle', { cx: lp[0], cy: lp[1], r: 8.5, fill: 'none', stroke: color, 'stroke-opacity': '.35', class: 'nv-pulse' }));
      }
    });

    /* marqueurs ponctuels */
    (spec.markers || []).forEach((m) => {
      const mx = x(m.index || 0), my = y(Util.num(m.value, 0));
      plot.appendChild(svgEl('circle', { cx: mx, cy: my, r: 4, fill: m.color || Theme.tones.warn, stroke: '#04121c', 'stroke-width': 1.4 }));
      if (m.label) plot.appendChild(text(mx, my - 9, m.label, 'nv-t nv-marker-label', 'middle'));
    });

    /* crosshair + tooltip */
    if (spec.tooltip !== false) {
      const cross = svgEl('line', { x1: 0, y1: padT, x2: 0, y2: padT + ih, class: 'nv-cross' });
      cross.style.opacity = '0'; svg.appendChild(cross);
      const focus = svgEl('g', { class: 'nv-focus' }); focus.style.opacity = '0'; svg.appendChild(focus);
      const overlay = svgEl('rect', { x: padL, y: padT, width: iw, height: ih, fill: 'transparent', class: 'nv-overlay' });
      svg.appendChild(overlay);
      const move = (evt) => {
        const r = svg.getBoundingClientRect();
        const px = ((evt.clientX - r.left) / (r.width || 1)) * w;
        let i = Math.round(x.invert(px));
        i = Util.clamp(i, 0, n - 1);
        const cx = x(i);
        cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.opacity = '1';
        focus.innerHTML = '';
        let html = '<div class="nv-tip-title">' + Util.esc(labels[i] != null ? labels[i] : '#' + (i + 1)) + '</div>';
        series.forEach((s, si) => {
          const v = s.data[i];
          if (v == null || !isFinite(Util.num(v, NaN))) return;
          const sc = s.axis === 'y2' && y2 ? y2 : y;
          focus.appendChild(svgEl('circle', { cx: cx, cy: sc(Util.num(v)), r: 4.2, fill: s.color || Theme.at(si), stroke: '#04121c', 'stroke-width': 1.6 }));
          html += tipRow(s.color || Theme.at(si), s.name || ('S' + (si + 1)), fmtVal(v, s.axis === 'y2' ? spec.y2 : spec.y), s.tipExtra ? s.tipExtra(i) : '');
        });
        if (cone && cone.start != null && i >= cone.start) {
          const k = i - cone.start, lo = (cone.p10 || cone.lo)[k], hi = (cone.p90 || cone.hi)[k];
          if (lo != null && hi != null) html += tipRow(Theme.tones.info, 'P10–P90', fmtVal(lo, spec.y) + ' → ' + fmtVal(hi, spec.y));
        }
        focus.style.opacity = '1';
        showTip(html, evt);
      };
      overlay.addEventListener('mousemove', move);
      overlay.addEventListener('touchmove', (e) => { if (e.touches && e.touches[0]) move(e.touches[0]); }, { passive: true });
      overlay.addEventListener('mouseleave', () => { cross.style.opacity = '0'; focus.style.opacity = '0'; hideTip(); });
      overlay.addEventListener('touchend', hideTip);
    }

    /* légende */
    if (spec.legend !== false && series.length > 1) {
      const lg = svgEl('g', { class: 'nv-legend' });
      let lx = padL;
      series.forEach((s, si) => {
        const color = s.color || Theme.at(si);
        lg.appendChild(svgEl('rect', { x: lx, y: 2, width: 9, height: 9, rx: 2.5, fill: color }));
        const t = text(lx + 13, 10.5, s.name || ('S' + (si + 1)), 'nv-t nv-legend-t', 'start');
        lg.appendChild(t);
        lx += 13 + (s.name || '').length * 6.1 + 14;
      });
      svg.appendChild(lg);
    }
    host.innerHTML = '';
    host.appendChild(svg);
    return svg;
  }

  /* halo lumineux : filtre SVG unique par graphique (aucune collision d'id) */
  const glowCache = new WeakMap();
  function glowFilter(defs) {
    if (glowCache.has(defs)) return glowCache.get(defs);
    const id = nextId() + '-glow';
    const f = svgEl('filter', { id, x: '-25%', y: '-70%', width: '150%', height: '280%' });
    f.appendChild(svgEl('feGaussianBlur', { stdDeviation: '3.1', result: 'b' }));
    const m = svgEl('feMerge');
    m.appendChild(svgEl('feMergeNode', { in: 'b' }));
    m.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }));
    f.appendChild(m);
    defs.appendChild(f);
    glowCache.set(defs, id);
    return id;
  }

  /* --- barre horizontales / verticales ---------------------------------- */
  function renderBars(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-bars', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const labels = spec.labels || [];
    const series = (spec.series || []).filter((s) => s && s.data);
    const horizontal = spec.horizontal !== false;
    const stacked = !!spec.stacked;
    const diverging = !!spec.diverging;
    const n = labels.length;
    if (!n || !series.length) { host.innerHTML = ''; return svg; }

    let vals = [];
    series.forEach((s) => s.data.forEach((v, i) => { vals.push(stacked && i != null ? v : v); }));
    if (stacked) {
      const sums = labels.map((_, i) => series.reduce((a, s) => a + Util.num(s.data[i], 0), 0));
      vals = sums;
    }
    let lo = spec.min != null ? spec.min : Math.min(0, Math.min.apply(null, vals.map((v) => Util.num(v, 0))));
    let hi = spec.max != null ? spec.max : Math.max.apply(null, vals.map((v) => Util.num(v, 0)));
    if (diverging) { const m = Math.max(Math.abs(lo), Math.abs(hi)); lo = -m; hi = m; }
    if (lo === hi) hi = lo + 1;

    if (horizontal) {
      const lw = spec.labelWidth == null ? Math.min(150, Math.max(78, w * 0.28)) : spec.labelWidth;
      const padR = spec.valueWidth == null ? 58 : spec.valueWidth;
      const iw = Math.max(30, w - lw - padR), ih = Math.max(20, h - 16);
      const x = scale(lo, hi, lw, lw + iw);
      const rowH = ih / n;
      const barH = Math.min(spec.barHeight || 16, rowH * 0.62);
      const zero = x(diverging || lo < 0 ? 0 : lo);
      if (spec.grid !== false) {
        niceTicks(lo, hi, 4).forEach((tv) => {
          svg.appendChild(svgEl('line', { x1: x(tv), y1: 4, x2: x(tv), y2: ih + 4, class: 'nv-grid' }));
        });
      }
      labels.forEach((lb, i) => {
        const cy = 8 + rowH * i + rowH / 2;
        svg.appendChild(text(lw - 8, cy + 3.5, String(lb), 'nv-t nv-bar-label', 'end'));
        let acc = 0;
        series.forEach((s, si) => {
          const v = Util.num(s.data[i], 0);
          const color = s.color || (typeof s.colors === 'function' ? s.colors(v, i) : null) || (s.colors && s.colors[i]) || Theme.at(si);
          const x0 = stacked ? x(diverging ? acc : Math.max(lo, acc)) : zero;
          const x1 = x(stacked ? acc + v : v);
          acc += v;
          const bx = Math.min(x0, x1), bw = Math.max(1.5, Math.abs(x1 - x0));
          const gid = nextId();
          const g = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '1', y2: '0' });
          g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.55' }));
          g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '1' }));
          defs.appendChild(g);
          const r = svgEl('rect', {
            x: Util.round(bx, 1), y: Util.round(cy - (stacked ? barH : barH / (series.length > 1 ? 1 : 1)) / 2 - (series.length > 1 && !stacked ? (si - (series.length - 1) / 2) * (barH * 0.42) : 0), 1),
            width: Util.round(bw, 1), height: Util.round(series.length > 1 && !stacked ? barH * 0.38 : barH, 1),
            rx: Math.min(6, barH / 2.6), fill: 'url(#' + gid + ')', class: 'nv-bar'
          });
          r.style.transformOrigin = (diverging ? (x(0) - bx) + 'px 0' : '0 0');
          r.style.transformBox = 'fill-box';
          r.style.transform = 'scaleX(0)';
          r.addEventListener('mouseenter', (e) => showTip('<div class="nv-tip-title">' + Util.esc(lb) + '</div>' + tipRow(color, s.name || lb, fmtVal(v, spec.y)), e));
          r.addEventListener('mousemove', (e) => showTip(tipEl.innerHTML, e));
          r.addEventListener('mouseleave', hideTip);
          svg.appendChild(r);
          requestAnimationFrame(() => { r.style.transition = 'transform .75s cubic-bezier(.22,1,.36,1) ' + (i * 45 + si * 30) + 'ms'; r.style.transform = 'scaleX(1)'; });
          if (spec.showValues !== false && (series.length === 1 || stacked) && si === series.length - 1) {
            const total = stacked ? acc : v;
            const tx = x(total) + (total >= 0 ? 7 : -7);
            const t = text(tx, cy + 3.5, (spec.valueFormat ? spec.valueFormat(total, i) : fmtVal(total, spec.y)), 'nv-t nv-bar-value', total >= 0 ? 'start' : 'end');
            svg.appendChild(t);
          }
        });
      });
      if (diverging) svg.appendChild(svgEl('line', { x1: x(0), y1: 4, x2: x(0), y2: ih + 4, class: 'nv-axis-line' }));
      if (spec.goal != null) svg.appendChild(svgEl('line', { x1: x(Util.num(spec.goal)), y1: 2, x2: x(Util.num(spec.goal)), y2: ih + 6, class: 'nv-goal' }));
    } else {
      const padL = 40, padB = spec.rotateLabels ? 46 : 24, padT = 14;
      const iw = Math.max(30, w - padL - 12), ih = Math.max(30, h - padT - padB);
      const y = scale(lo, hi, padT + ih, padT);
      const band = iw / n;
      const bw = Math.min(spec.barHeight || 26, band * 0.62 / Math.max(1, stacked ? 1 : series.length));
      niceTicks(lo, hi, 4).forEach((tv) => {
        svg.appendChild(svgEl('line', { x1: padL, y1: y(tv), x2: padL + iw, y2: y(tv), class: 'nv-grid' }));
        svg.appendChild(text(padL - 6, y(tv) + 3.5, fmtVal(tv, spec.y), 'nv-t nv-axis', 'end'));
      });
      labels.forEach((lb, i) => {
        const cx = padL + band * i + band / 2;
        let acc = 0;
        series.forEach((s, si) => {
          const v = Util.num(s.data[i], 0);
          const color = s.color || Theme.at(si);
          const yv = y(stacked ? acc + v : v), y0 = y(stacked ? Math.max(lo, acc) : Math.max(lo, 0));
          acc += v;
          const bx = stacked ? cx - bw / 2 : cx - (bw * series.length) / 2 + si * bw;
          const r = svgEl('rect', {
            x: Util.round(bx, 1), y: Util.round(Math.min(yv, y0), 1), width: Util.round(bw - 2, 1),
            height: Math.max(1.5, Util.round(Math.abs(y0 - yv), 1)), rx: 4, fill: color, class: 'nv-bar'
          });
          r.style.transformBox = 'fill-box'; r.style.transformOrigin = 'center bottom'; r.style.transform = 'scaleY(0)';
          r.addEventListener('mouseenter', (e) => showTip('<div class="nv-tip-title">' + Util.esc(lb) + '</div>' + tipRow(color, s.name || lb, fmtVal(v, spec.y)), e));
          r.addEventListener('mouseleave', hideTip);
          svg.appendChild(r);
          requestAnimationFrame(() => { r.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1) ' + (i * 40) + 'ms'; r.style.transform = 'scaleY(1)'; });
        });
        const t = text(cx, h - 8, String(lb), 'nv-t nv-axis', 'middle');
        if (spec.rotateLabels) { t.setAttribute('transform', 'rotate(-28 ' + cx + ' ' + (h - 8) + ')'); t.setAttribute('text-anchor', 'end'); }
        svg.appendChild(t);
      });
      svg.appendChild(svgEl('line', { x1: padL, y1: padT + ih, x2: padL + iw, y2: padT + ih, class: 'nv-axis-line' }));
      if (spec.goal != null) svg.appendChild(svgEl('line', { x1: padL, y1: y(Util.num(spec.goal)), x2: padL + iw, y2: y(Util.num(spec.goal)), class: 'nv-goal' }));
    }
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- donut ------------------------------------------------------------- */
  function polar(cx, cy, r, angle) {
    const a = ((angle - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  function arcPath(cx, cy, r, a0, a1) {
    const p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
    return 'M' + Util.round(p0[0], 2) + ',' + Util.round(p0[1], 2) + ' A' + r + ',' + r + ' 0 ' + large + ' ' + sweep + ' ' + Util.round(p1[0], 2) + ',' + Util.round(p1[1], 2);
  }
  function ringPath(cx, cy, rOut, rIn, a0, a1) {
    const p1 = polar(cx, cy, rOut, a0), p2 = polar(cx, cy, rOut, a1), p3 = polar(cx, cy, rIn, a1), p4 = polar(cx, cy, rIn, a0);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return 'M' + p1.map((v) => Util.round(v, 2)).join(',') +
      ' A' + rOut + ',' + rOut + ' 0 ' + large + ' 1 ' + p2.map((v) => Util.round(v, 2)).join(',') +
      ' L' + p3.map((v) => Util.round(v, 2)).join(',') +
      ' A' + rIn + ',' + rIn + ' 0 ' + large + ' 0 ' + p4.map((v) => Util.round(v, 2)).join(',') + ' Z';
  }
  function renderDonut(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-donut', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const slices = (spec.slices || []).filter((s) => s && isFinite(Util.num(s.value, NaN)));
    const total = spec.total != null ? Util.num(spec.total) : Stats.sum(slices.map((s) => Util.num(s.value, 0))) || 1;
    const cx = w / 2, cy = h / 2;
    const rOut = Math.min(w, h) / 2 - 10, rIn = rOut * (spec.thickness == null ? 0.62 : 1 - spec.thickness);
    let a = spec.startAngle == null ? -90 : spec.startAngle;
    slices.forEach((s, i) => {
      const frac = Util.num(s.value, 0) / total;
      const a1 = a + frac * 360;
      const color = s.color || Theme.at(i);
      const p = svgEl('path', { d: ringPath(cx, cy, rOut, rIn, a + 0.6, Math.max(a + 0.7, a1 - 0.6)), fill: color, class: 'nv-slice' });
      p.style.transformBox = 'fill-box'; p.style.transformOrigin = 'center';
      p.style.opacity = '0'; p.style.transform = 'scale(.86)';
      p.addEventListener('mouseenter', (e) => {
        p.style.transform = 'scale(1.04)';
        showTip('<div class="nv-tip-title">' + Util.esc(s.label) + '</div>' + tipRow(color, spec.valueLabel || 'Part', (spec.valueFormat ? spec.valueFormat(s.value, i) : fmtVal(s.value, spec.y)) + ' · ' + Util.pct(frac * 100, 1)), e);
      });
      p.addEventListener('mousemove', (e) => showTip(tipEl.innerHTML, e));
      p.addEventListener('mouseleave', () => { p.style.transform = 'scale(1)'; hideTip(); });
      svg.appendChild(p);
      requestAnimationFrame(() => { p.style.transition = 'opacity .5s ease ' + (i * 70) + 'ms, transform .5s cubic-bezier(.22,1,.36,1) ' + (i * 70) + 'ms'; p.style.opacity = '1'; p.style.transform = 'scale(1)'; });
      a = a1;
    });
    if (spec.center) {
      svg.appendChild(text(cx, cy - 2, String(spec.center.value == null ? '' : spec.center.value), 'nv-donut-value', 'middle'));
      svg.appendChild(text(cx, cy + 15, String(spec.center.label || ''), 'nv-donut-label', 'middle'));
    }
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- radar ------------------------------------------------------------- */
  function renderRadar(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-radar', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const axes = spec.axes || [];
    const k = axes.length;
    if (k < 3) { host.innerHTML = ''; return svg; }
    const cx = w / 2, cy = h / 2 + 4;
    const R = Math.min(w, h) / 2 - (spec.labelSpace == null ? 46 : spec.labelSpace);
    const rings = spec.rings || 4;
    for (let r = rings; r >= 1; r--) {
      const rr = (R * r) / rings;
      const pts = axes.map((_, i) => polar(cx, cy, rr, (i * 360) / k));
      svg.appendChild(svgEl('polygon', { points: pts.map((p) => p.map((v) => Util.round(v, 1)).join(',')).join(' '), class: r === rings ? 'nv-radar-ring nv-radar-outer' : 'nv-radar-ring' }));
    }
    axes.forEach((ax, i) => {
      const p = polar(cx, cy, R, (i * 360) / k);
      svg.appendChild(svgEl('line', { x1: cx, y1: cy, x2: p[0], y2: p[1], class: 'nv-radar-spoke' }));
      const lp = polar(cx, cy, R + (spec.labelOffset == null ? 20 : spec.labelOffset), (i * 360) / k);
      const anchor = Math.abs(lp[0] - cx) < 6 ? 'middle' : lp[0] > cx ? 'start' : 'end';
      const t = text(lp[0], lp[1] + 3.5, String(ax.label != null ? ax.label : ax), 'nv-t nv-radar-label', anchor);
      svg.appendChild(t);
      if (ax.value != null) svg.appendChild(text(lp[0], lp[1] + 15, String(ax.value), 'nv-t nv-radar-sub', anchor));
    });
    (spec.series || []).forEach((s, si) => {
      const color = s.color || Theme.at(si);
      const pts = axes.map((ax, i) => {
        const max = Util.num(ax.max, 100) || 100;
        const f = Util.clamp(Util.num(s.data[i], 0) / max, 0, 1.35);
        return polar(cx, cy, R * f, (i * 360) / k);
      });
      const gid = nextId();
      const g = svgEl('radialGradient', { id: gid });
      g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.45' }));
      g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '.12' }));
      defs.appendChild(g);
      const poly = svgEl('polygon', { points: pts.map((p) => p.map((v) => Util.round(v, 1)).join(',')).join(' '), fill: s.fill === false ? 'none' : 'url(#' + gid + ')', stroke: color, 'stroke-width': 2, class: 'nv-radar-area' });
      poly.style.transformBox = 'fill-box'; poly.style.transformOrigin = 'center'; poly.style.opacity = '0'; poly.style.transform = 'scale(.5)';
      svg.appendChild(poly);
      requestAnimationFrame(() => { poly.style.transition = 'opacity .6s ease ' + (si * 120) + 'ms, transform .8s cubic-bezier(.22,1,.36,1) ' + (si * 120) + 'ms'; poly.style.opacity = '1'; poly.style.transform = 'scale(1)'; });
      pts.forEach((p, i) => {
        const c = svgEl('circle', { cx: Util.round(p[0], 1), cy: Util.round(p[1], 1), r: 3.4, fill: color, stroke: '#04121c', 'stroke-width': 1.2, class: 'nv-radar-dot' });
        c.addEventListener('mouseenter', (e) => showTip('<div class="nv-tip-title">' + Util.esc(axes[i].label != null ? axes[i].label : axes[i]) + '</div>' +
          tipRow(color, s.name || 'Valeur', fmtVal(s.data[i], spec.y)) + (axes[i].ref ? tipRow(Theme.tones.neutral, 'Référence', axes[i].ref) : ''), e));
        c.addEventListener('mouseleave', hideTip);
        svg.appendChild(c);
      });
    });
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- jauge radiale (270°) --------------------------------------------- */
  function renderGauge(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-gauge', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const min = Util.num(spec.min, 0), max = Util.num(spec.max, 100);
    const v = Util.clamp(Util.num(spec.value, min), min, max);
    const A0 = 225, SWEEP = spec.sweep == null ? 270 : spec.sweep;
    const cx = w / 2, cy = h / 2 + (SWEEP >= 270 ? 6 : 0);
    const R = Math.min(w / 2, h / 2) - (spec.pad == null ? 12 : spec.pad);
    const th = spec.thickness == null ? Math.max(9, R * 0.17) : spec.thickness;
    const frac = (v - min) / ((max - min) || 1);
    const bands = spec.bands && spec.bands.length ? spec.bands : [{ from: min, to: max, color: Theme.tones.good }];
    /* piste */
    svg.appendChild(svgEl('path', { d: arcPath(cx, cy, R, A0, A0 + SWEEP), fill: 'none', stroke: 'rgba(255,255,255,.07)', 'stroke-width': th, 'stroke-linecap': 'round', class: 'nv-gauge-track' }));
    bands.forEach((b) => {
      const f0 = Util.clamp((Util.num(b.from, min) - min) / ((max - min) || 1), 0, 1);
      const f1 = Util.clamp((Util.num(b.to, max) - min) / ((max - min) || 1), 0, 1);
      if (f1 <= f0) return;
      svg.appendChild(svgEl('path', {
        d: arcPath(cx, cy, R, A0 + f0 * SWEEP, A0 + Math.max(f0 + 0.004, f1) * SWEEP), fill: 'none',
        stroke: b.color || Theme.tones.ok, 'stroke-width': th, opacity: b.opacity == null ? 0.22 : b.opacity, 'stroke-linecap': 'butt', class: 'nv-gauge-band'
      }));
      if (b.label && spec.bandLabels !== false) {
        const lp = polar(cx, cy, R + th * 0.5 + 11, A0 + ((f0 + f1) / 2) * SWEEP);
        svg.appendChild(text(lp[0], lp[1] + 3, b.label, 'nv-t nv-gauge-band-label', 'middle'));
      }
    });
    /* graduation */
    const ticks = spec.ticks || 5;
    for (let i = 0; i <= ticks; i++) {
      const f = i / ticks, a = A0 + f * SWEEP;
      const p1 = polar(cx, cy, R - th / 2 - 2, a), p2 = polar(cx, cy, R - th / 2 - (i % 5 === 0 ? 8 : 5), a);
      svg.appendChild(svgEl('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: 'nv-gauge-tick' }));
    }
    /* arc de valeur */
    const gid = nextId();
    const main = spec.color || Theme.scale(1 - frac);
    const g = svgEl('linearGradient', { id: gid, x1: '0', y1: '1', x2: '1', y2: '0' });
    g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': main }));
    g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': spec.colorTo || '#22d3ee' }));
    defs.appendChild(g);
    const filt = glowFilter(defs);
    const arc = svgEl('path', { d: arcPath(cx, cy, R, A0, A0 + Math.max(0.6, frac) * SWEEP), fill: 'none', stroke: 'url(#' + gid + ')', 'stroke-width': th, 'stroke-linecap': 'round', class: 'nv-gauge-value', filter: 'url(#' + filt + ')' });
    svg.appendChild(arc);
    animatePath(arc, { dur: 1100 });
    if (spec.needle !== false) {
      const a = A0 + frac * SWEEP, p = polar(cx, cy, R - th / 2 - 12, a), c = polar(cx, cy, 4.5, a + 90), c2 = polar(cx, cy, 4.5, a - 90);
      svg.appendChild(svgEl('polygon', { points: [p, c, c2].map((q) => q.map((z) => Util.round(z, 1)).join(',')).join(' '), fill: 'rgba(255,255,255,.85)', class: 'nv-gauge-needle' }));
    }
    svg.appendChild(svgEl('circle', { cx, cy, r: 3.4, fill: main, class: 'nv-gauge-hub' }));
    /* valeur centrale */
    const valTxt = text(cx, cy + (spec.sub ? -2 : 6), spec.valueFormat ? spec.valueFormat(v) : Util.fmt(v, spec.digits == null ? 0 : spec.digits), 'nv-gauge-num', 'middle');
    svg.appendChild(valTxt);
    if (spec.unit) svg.appendChild(text(cx, cy + 16, spec.unit, 'nv-t nv-gauge-unit', 'middle'));
    if (spec.sub) svg.appendChild(text(cx, cy + (spec.unit ? 32 : 22), spec.sub, 'nv-t nv-gauge-sub', 'middle'));
    if (spec.label) svg.appendChild(text(cx, cy - R + th + 4, spec.label, 'nv-t nv-gauge-label', 'middle'));
    if (spec.animateValue !== false && !Util.reducedMotion()) {
      const from = min, t0 = performance && performance.now ? performance.now() : Date.now(), dur = 950;
      const step = () => {
        const t = Util.clamp(((performance && performance.now ? performance.now() : Date.now()) - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - t, 3);
        const cur = Util.lerp(from, v, e);
        valTxt.textContent = spec.valueFormat ? spec.valueFormat(cur) : Util.fmt(cur, spec.digits == null ? 0 : spec.digits);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- anneaux concentriques -------------------------------------------- */
  function renderRings(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-rings', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const items = spec.items || [];
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 8;
    const gap = spec.gap == null ? 7 : spec.gap;
    const th = Math.max(5, Math.min(spec.thickness || (R - gap * items.length) / Math.max(1, items.length), 18));
    const A0 = 225, SWEEP = 270;
    items.forEach((it, i) => {
      const r = R - i * (th + gap);
      if (r < 6) return;
      const f = Util.clamp((Util.num(it.value, 0) - Util.num(it.min, 0)) / ((Util.num(it.max, 100) - Util.num(it.min, 0)) || 1), 0, 1);
      const color = it.color || Theme.at(i);
      svg.appendChild(svgEl('path', { d: arcPath(cx, cy, r, A0, A0 + SWEEP), fill: 'none', stroke: 'rgba(255,255,255,.07)', 'stroke-width': th, 'stroke-linecap': 'round' }));
      const p = svgEl('path', { d: arcPath(cx, cy, r, A0, A0 + Math.max(0.8, f) * SWEEP), fill: 'none', stroke: color, 'stroke-width': th, 'stroke-linecap': 'round', class: 'nv-ring-val' });
      p.addEventListener('mouseenter', (e) => showTip('<div class="nv-tip-title">' + Util.esc(it.label || '') + '</div>' + tipRow(color, it.valueLabel || 'Valeur', (it.format ? it.format(it.value) : Util.fmt(it.value, 1)) + (it.unit || '')), e));
      p.addEventListener('mouseleave', hideTip);
      svg.appendChild(p);
      animatePath(p, { dur: 1000, wait: i * 110 });
      const ep = polar(cx, cy, r, A0 + f * SWEEP);
      const dot = svgEl('circle', { cx: ep[0], cy: ep[1], r: th * 0.34, fill: '#04121c', stroke: color, 'stroke-width': 1.6 });
      svg.appendChild(dot);
    });
    if (spec.center) {
      svg.appendChild(text(cx, cy + 2, String(spec.center.value == null ? '' : spec.center.value), 'nv-rings-value', 'middle'));
      svg.appendChild(text(cx, cy + 18, String(spec.center.label || ''), 'nv-t nv-rings-label', 'middle'));
    }
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- heatmap ----------------------------------------------------------- */
  function renderHeatmap(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-heat', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const rows = spec.rows || [], cols = spec.cols || [], data = spec.values || [];
    if (!rows.length || !cols.length) { host.innerHTML = ''; return svg; }
    const padL = spec.labelWidth == null ? Math.min(120, Math.max(58, w * 0.2)) : spec.labelWidth;
    const padT = 20, padB = 6;
    const cw = (w - padL - 6) / cols.length, chh = (h - padT - padB) / rows.length;
    let lo = spec.min != null ? spec.min : Infinity, hi = spec.max != null ? spec.max : -Infinity;
    if (spec.min == null || spec.max == null) {
      data.forEach((r) => r.forEach((v) => { const n = Util.num(v, NaN); if (isFinite(n)) { lo = Math.min(lo, n); hi = Math.max(hi, n); } }));
      if (!isFinite(lo)) { lo = 0; hi = 1; }
    }
    cols.forEach((c, j) => svg.appendChild(text(padL + cw * j + cw / 2, 13, String(c), 'nv-t nv-heat-col', 'middle')));
    rows.forEach((r, i) => {
      svg.appendChild(text(padL - 7, padT + chh * i + chh / 2 + 3.5, String(r), 'nv-t nv-heat-row', 'end'));
      (data[i] || []).forEach((v, j) => {
        const n = Util.num(v, NaN);
        const t = isFinite(n) ? Util.clamp((n - lo) / ((hi - lo) || 1), 0, 1) : 0;
        const color = spec.colorAt ? spec.colorAt(t, n, i, j) : Theme.scale(t);
        const rect = svgEl('rect', {
          x: padL + cw * j + 1, y: padT + chh * i + 1, width: Math.max(1, cw - 2), height: Math.max(1, chh - 2),
          rx: Math.min(5, chh / 3.4), fill: isFinite(n) ? color : 'rgba(255,255,255,.04)', class: 'nv-heat-cell'
        });
        rect.style.opacity = '0';
        rect.addEventListener('mouseenter', (e) => showTip('<div class="nv-tip-title">' + Util.esc(rows[i]) + ' · ' + Util.esc(cols[j]) + '</div>' +
          tipRow(color, spec.valueLabel || 'Valeur', isFinite(n) ? (spec.valueFormat ? spec.valueFormat(n, i, j) : Util.fmt(n, 1)) : '—'), e));
        rect.addEventListener('mouseleave', hideTip);
        svg.appendChild(rect);
        requestAnimationFrame(() => { rect.style.transition = 'opacity .45s ease ' + ((i * cols.length + j) * 6) + 'ms'; rect.style.opacity = '1'; });
        if (chh > 17 && cw > 26 && isFinite(n) && spec.showValues !== false) {
          svg.appendChild(text(padL + cw * j + cw / 2, padT + chh * i + chh / 2 + 3.5, spec.valueFormat ? spec.valueFormat(n, i, j) : Util.fmt(n, 0), 'nv-t nv-heat-val', 'middle'));
        }
      });
    });
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- nuage de points + régression ------------------------------------- */
  function renderScatter(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-scatter', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const pts = (spec.points || []).filter((p) => p && isFinite(Util.num(p.x, NaN)) && isFinite(Util.num(p.y, NaN)));
    const padL = 46, padR = 14, padT = 14, padB = 30;
    const iw = Math.max(30, w - padL - padR), ih = Math.max(30, h - padT - padB);
    let xs = pts.map((p) => Util.num(p.x)), ys = pts.map((p) => Util.num(p.y));
    if (!xs.length) xs = [0, 1], ys = [0, 1];
    const xMin = spec.x && spec.x.min != null ? spec.x.min : Math.min.apply(null, xs), xMax = spec.x && spec.x.max != null ? spec.x.max : Math.max.apply(null, xs);
    const yMin = spec.y && spec.y.min != null ? spec.y.min : Math.min.apply(null, ys), yMax = spec.y && spec.y.max != null ? spec.y.max : Math.max.apply(null, ys);
    const x = scale(xMin, xMax || xMin + 1, padL, padL + iw), y = scale(yMin, yMax || yMin + 1, padT + ih, padT);
    niceTicks(yMin, yMax, 4).forEach((tv) => {
      svg.appendChild(svgEl('line', { x1: padL, y1: y(tv), x2: padL + iw, y2: y(tv), class: 'nv-grid' }));
      svg.appendChild(text(padL - 6, y(tv) + 3.5, fmtVal(tv, spec.y), 'nv-t nv-axis', 'end'));
    });
    niceTicks(xMin, xMax, 5).forEach((tv) => svg.appendChild(text(x(tv), h - 10, fmtVal(tv, spec.x), 'nv-t nv-axis', 'middle')));
    if (spec.x && spec.x.label) svg.appendChild(text(padL + iw / 2, h - 1, spec.x.label, 'nv-t nv-axis-title', 'middle'));
    (spec.quadrants || []).forEach((q) => {
      svg.appendChild(svgEl('rect', { x: x(q.x0), y: y(q.y1), width: Math.abs(x(q.x1) - x(q.x0)), height: Math.abs(y(q.y0) - y(q.y1)), fill: q.color || Theme.tones.ok, opacity: q.opacity == null ? 0.07 : q.opacity }));
      if (q.label) svg.appendChild(text(x(q.x0) + 5, y(q.y1) + 13, q.label, 'nv-t nv-zone-label', 'start'));
    });
    const groups = {};
    pts.forEach((p) => {
      const gname = p.group || spec.name || 'Points';
      const color = p.color || (groups[gname] = groups[gname] || Theme.at(Object.keys(groups).length - 1));
      const c = svgEl('circle', { cx: x(Util.num(p.x)), cy: y(Util.num(p.y)), r: p.r || 4.2, fill: color, 'fill-opacity': p.opacity == null ? 0.72 : p.opacity, stroke: color, 'stroke-opacity': '.9', 'stroke-width': 1, class: 'nv-scatter-dot' });
      c.style.opacity = '0';
      c.addEventListener('mouseenter', (e) => showTip('<div class="nv-tip-title">' + Util.esc(p.label || gname) + '</div>' +
        tipRow(color, (spec.x && spec.x.label) || 'X', fmtVal(p.x, spec.x)) + tipRow(color, (spec.y && spec.y.label) || 'Y', fmtVal(p.y, spec.y)), e));
      c.addEventListener('mouseleave', hideTip);
      svg.appendChild(c);
      requestAnimationFrame(() => { c.style.transition = 'opacity .5s ease'; c.style.opacity = '1'; });
    });
    if (spec.regression !== false && pts.length > 2) {
      const lr = Stats.linreg(xs, ys);
      svg.appendChild(svgEl('line', { x1: x(xMin), y1: y(lr.predict(xMin)), x2: x(xMax), y2: y(lr.predict(xMax)), class: 'nv-regression', stroke: spec.regressionColor || '#ffffff', 'stroke-dasharray': '6 5' }));
      svg.appendChild(text(padL + iw - 4, padT + 12, 'r² = ' + Util.fmt(lr.r2, 2) + '  ·  r = ' + Util.fmt(lr.r, 2), 'nv-t nv-regression-label', 'end'));
    }
    svg.appendChild(svgEl('line', { x1: padL, y1: padT + ih, x2: padL + iw, y2: padT + ih, class: 'nv-axis-line' }));
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- aire empilée (Markov / trajectoires d'états) --------------------- */
  function renderStackedArea(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-stacked', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const series = spec.series || [], labels = spec.labels || [];
    const n = labels.length;
    if (!n || !series.length) { host.innerHTML = ''; return svg; }
    const normalize = spec.normalize !== false;
    const totals = labels.map((_, i) => series.reduce((a, s) => a + Util.num(s.data[i], 0), 0));
    const val = (si, i) => {
      const v = Util.num(series[si].data[i], 0);
      return normalize && totals[i] ? (v / totals[i]) * 100 : v;
    };
    const padL = 42, padR = 12, padT = 12, padB = 26;
    const iw = Math.max(30, w - padL - padR), ih = Math.max(30, h - padT - padB);
    const maxY = normalize ? 100 : Math.max.apply(null, totals) * 1.05 || 1;
    const x = scale(0, n - 1, padL, padL + iw), y = scale(0, maxY, padT + ih, padT);
    niceTicks(0, maxY, 4).forEach((tv) => {
      svg.appendChild(svgEl('line', { x1: padL, y1: y(tv), x2: padL + iw, y2: y(tv), class: 'nv-grid' }));
      svg.appendChild(text(padL - 6, y(tv) + 3.5, normalize ? Util.fmt(tv, 0) + '%' : fmtVal(tv, spec.y), 'nv-t nv-axis', 'end'));
    });
    const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(iw / 58))));
    for (let i = 0; i < n; i++) { if (i % every === 0 || i === n - 1) svg.appendChild(text(x(i), h - 8, labels[i], 'nv-t nv-axis', 'middle')); }
    /* empilement du bas vers le haut */
    const base = new Array(n).fill(0);
    const order = series.map((s, i) => i);
    if (spec.reverse) order.reverse();
    const stacks = [];
    order.forEach((si) => {
      const lower = base.slice();
      for (let i = 0; i < n; i++) base[i] = lower[i] + val(si, i);
      stacks.push({ si, lower, upper: base.slice() });
    });
    stacks.forEach((st, k) => {
      const s = series[st.si], color = s.color || Theme.at(st.si);
      const up = st.upper.map((v, i) => [x(i), y(v)]);
      const down = st.lower.map((v, i) => [x(i), y(v)]).reverse();
      const d = smoothPath(up, 0.2) + ' L' + down.map((p) => Util.round(p[0], 2) + ',' + Util.round(p[1], 2)).join(' L') + ' Z';
      const gid = nextId();
      const g = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
      g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': s.fillOpacity == null ? 0.75 : s.fillOpacity }));
      g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': (s.fillOpacity == null ? 0.75 : s.fillOpacity) * 0.45 }));
      defs.appendChild(g);
      const p = svgEl('path', { d, fill: 'url(#' + gid + ')', stroke: color, 'stroke-width': 1, 'stroke-opacity': '.55', class: 'nv-stack-area' });
      p.style.opacity = '0';
      svg.appendChild(p);
      requestAnimationFrame(() => { p.style.transition = 'opacity .6s ease ' + (k * 90) + 'ms'; p.style.opacity = '1'; });
    });
    if (spec.tooltip !== false) {
      const cross = svgEl('line', { x1: 0, y1: padT, x2: 0, y2: padT + ih, class: 'nv-cross' }); cross.style.opacity = '0'; svg.appendChild(cross);
      const overlay = svgEl('rect', { x: padL, y: padT, width: iw, height: ih, fill: 'transparent' });
      svg.appendChild(overlay);
      const move = (evt) => {
        const r = svg.getBoundingClientRect();
        const px = ((evt.clientX - r.left) / (r.width || 1)) * w;
        const i = Util.clamp(Math.round(x.invert(px)), 0, n - 1);
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.style.opacity = '1';
        let html = '<div class="nv-tip-title">' + Util.esc(labels[i]) + '</div>';
        series.forEach((s, si) => html += tipRow(s.color || Theme.at(si), s.name || ('S' + si), (normalize ? Util.fmt(val(si, i), 1) + '%' : fmtVal(val(si, i), spec.y)) + (s.unit ? ' ' + s.unit : '')));
        showTip(html, evt);
      };
      overlay.addEventListener('mousemove', move);
      overlay.addEventListener('mouseleave', () => { cross.style.opacity = '0'; hideTip(); });
    }
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- sparkline --------------------------------------------------------- */
  function renderSparkline(host, spec, w, h) {
    const svg = svgEl('svg', { class: 'nv-svg nv-spark', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h });
    const defs = svgEl('defs'); svg.appendChild(defs);
    const data = (spec.data || []).map((v) => Util.num(v, 0));
    if (data.length < 2) { host.innerHTML = ''; return svg; }
    const lo = Math.min.apply(null, data), hi = Math.max.apply(null, data);
    const x = scale(0, data.length - 1, 2, w - 3), y = scale(lo, hi === lo ? lo + 1 : hi, h - 3, 3);
    const pts = data.map((v, i) => [x(i), y(v)]);
    const color = spec.color || (data[data.length - 1] >= data[0] ? Theme.tones.good : Theme.tones.risk);
    const gid = nextId();
    const g = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
    g.appendChild(svgEl('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.45' }));
    g.appendChild(svgEl('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(g);
    svg.appendChild(svgEl('path', { d: areaFrom(pts, h - 1, 0.24), fill: 'url(#' + gid + ')' }));
    const p = svgEl('path', { d: smoothPath(pts, 0.24), fill: 'none', stroke: color, 'stroke-width': spec.width || 1.9, 'stroke-linecap': 'round' });
    svg.appendChild(p); animatePath(p, { dur: 700 });
    const last = pts[pts.length - 1];
    svg.appendChild(svgEl('circle', { cx: last[0], cy: last[1], r: 2.6, fill: color }));
    host.innerHTML = ''; host.appendChild(svg);
    return svg;
  }

  /* --- dispatch + cycle de vie ------------------------------------------ */
  const RENDERERS = {
    line: renderLine, area: renderLine, bars: renderBars, bar: renderBars, donut: renderDonut, pie: renderDonut,
    radar: renderRadar, gauge: renderGauge, rings: renderRings, heatmap: renderHeatmap, heat: renderHeatmap,
    scatter: renderScatter, stackedArea: renderStackedArea, stacked: renderStackedArea, sparkline: renderSparkline, spark: renderSparkline
  };
  function draw(inst) {
    const spec = inst.spec || {}, host = inst.host;
    if (!host || !host.isConnected) return;
    const w = Math.max(140, Math.round(Util.width(host)));
    const hgt = Math.max(56, Math.round(spec.height || Util.num(host.dataset.nvHeight, 0) || Util.num(host.style.height, 0) || 220));
    if (!spec.height && !host.style.height) host.style.height = hgt + 'px';
    inst.w = w; inst.h = hgt;
    const fn = RENDERERS[spec.type] || renderLine;
    try {
      fn(host, spec, w, hgt);
    } catch (err) {
      host.innerHTML = '<div class="nv-chart-error">⚠ ' + Util.esc((err && err.message) || 'render error') + '</div>';
      if (global.console) console.warn('[NutriVision] chart render error', err);
    }
  }
  const Chart = {
    renderers: RENDERERS,
    tooltip: { show: showTip, hide: hideTip, row: tipRow },
    mount(target, spec) {
      const host = Util.isEl(target) ? target : Util.qs(target);
      if (!host) return null;
      const inst = {
        host, spec: spec || { type: 'line' }, destroyed: false, ro: null,
        render(s) { if (s) inst.spec = s; if (!inst.destroyed) draw(inst); return inst; },
        update(s) { return inst.render(s); },
        setSpec(patch) { inst.spec = Object.assign({}, inst.spec, patch || {}); return inst.render(); },
        destroy() {
          inst.destroyed = true;
          if (inst.ro) { try { inst.ro.disconnect(); } catch (e) { } inst.ro = null; }
          host.innerHTML = '';
        }
      };
      host.classList.add('nv-chart');
      if (spec && spec.height) host.style.height = spec.height + 'px';
      draw(inst);
      if (global.ResizeObserver) {
        inst.ro = new ResizeObserver(Util.debounce(() => { if (!inst.destroyed && Util.width(host) > 40) draw(inst); }, 140));
        try { inst.ro.observe(host); } catch (e) { }
      }
      return inst;
    },
    /* rendu direct sans observateur (listes courtes, sparklines en ligne) */
    render(target, spec) {
      const host = Util.isEl(target) ? target : Util.qs(target);
      if (!host) return null;
      host.classList.add('nv-chart');
      const w = Math.max(80, Math.round(Util.width(host)));
      const hgt = Math.max(24, Math.round((spec && spec.height) || 40));
      (RENDERERS[(spec && spec.type) || 'sparkline'] || renderSparkline)(host, spec || {}, w, hgt);
      return host.firstElementChild;
    },
    arcPath, ringPath, polar, smoothPath, linePath, niceTicks, scale
  };
  NV.chart = Chart;
})(typeof window !== 'undefined' ? window : globalThis);

/* ============================================================================
   5. BUS D'ÉVÉNEMENTS + COMPOSANTS UI + I18N + STORE + EXPORT + APP
   ============================================================================ */
(function (global) {
  'use strict';
  const NV = global.NutriVision, Util = NV.util, Theme = NV.theme;

  /* --- bus ---------------------------------------------------------------- */
  const Bus = (function () {
    const map = {};
    return {
      on(ev, fn) { (map[ev] = map[ev] || []).push(fn); return () => Bus.off(ev, fn); },
      off(ev, fn) { if (map[ev]) map[ev] = map[ev].filter((f) => f !== fn); },
      emit(ev, data) { (map[ev] || []).forEach((f) => { try { f(data); } catch (e) { console && console.warn('[NV.bus]', ev, e); } }); }
    };
  })();
  NV.bus = Bus;

  /* --- i18n --------------------------------------------------------------- */
  const I18N = (function () {
    const dicts = {};      // { ns: { locale: {key: value} } }
    const listeners = [];
    let forced = null;
    const LANG_MAP = [
      [/^fr|fran/i, 'fr'], [/^es|espa|span/i, 'es'], [/^pt|portu/i, 'pt'],
      [/^ewe|eʋe/i, 'ewe'], [/^kab|kaby/i, 'kab'], [/^ar|العرب/i, 'ar'], [/^en|angl/i, 'en']
    ];
    function detect() {
      if (forced) return forced;
      const sel = document.getElementById('language') || document.getElementById('lang') ||
        document.querySelector('select[name="language"]') || document.querySelector('select[id*="language" i]');
      const raw = (sel && (sel.value || sel.selectedOptions && sel.selectedOptions[0] && sel.selectedOptions[0].textContent)) ||
        (global.NUTRI_I18N && global.NUTRI_I18N.locale) || document.documentElement.lang || 'en';
      const s = String(raw).trim();
      for (let i = 0; i < LANG_MAP.length; i++) if (LANG_MAP[i][0].test(s)) return LANG_MAP[i][1];
      return s.toLowerCase().split(/[-_]/)[0] || 'en';
    }
    function locale() { const l = detect(); return dicts.__any && dicts.__any[l] ? l : (l === 'en' ? 'en' : (dicts.__any && dicts.__any[l] ? l : l)); }
    return {
      add(ns, dict) { dicts[ns] = dicts[ns] || {}; for (const loc in dict) { dicts[ns][loc] = Object.assign(dicts[ns][loc] || {}, dict[loc]); dicts.__any = dicts.__any || {}; dicts.__any[loc] = Object.assign(dicts.__any[loc] || {}, dict[loc]); } },
      set(loc) { forced = loc || null; I18n_emit(); },
      locale,
      get localeCode() { return detect(); },
      t(key, vars) {
        const loc = detect();
        let v = null;
        for (const ns in dicts) {
          if (ns === '__any') continue;
          const d = dicts[ns];
          if (d[loc] && d[loc][key] != null) { v = d[loc][key]; break; }
        }
        if (v == null && dicts.__any && dicts.__any[loc] && dicts.__any[loc][key] != null) v = dicts.__any[loc][key];
        if (v == null && loc !== 'en') { for (const ns in dicts) { if (ns === '__any') continue; if (dicts[ns].en && dicts[ns].en[key] != null) { v = dicts[ns].en[key]; break; } } }
        if (v == null && dicts.__any && dicts.__any.en) v = dicts.__any.en[key];
        if (v == null) v = key;
        if (vars) Object.keys(vars).forEach((k) => { v = String(v).split('{' + k + '}').join(vars[k] == null ? '' : vars[k]); });
        return v;
      },
      onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
      install() {
        const sel = document.getElementById('language') || document.getElementById('lang') || document.querySelector('select[id*="language" i]');
        if (sel) Util.on(sel, 'change', () => setTimeout(I18n_emit, 20));
        Util.on(document, 'nutri:i18nChanged', () => setTimeout(I18n_emit, 20));
      }
    };
    function I18n_emit() { const loc = detect(); listeners.forEach((f) => { try { f(loc); } catch (e) { } }); Bus.emit('lang', loc); }
  })();
  NV.i18n = I18N;

  /* --- store -------------------------------------------------------------- */
  NV.store = {
    ns(name) {
      const p = 'nutri.' + name + '.';
      const ok = (function () { try { global.localStorage.setItem('__nv', '1'); global.localStorage.removeItem('__nv'); return true; } catch (e) { return false; } })();
      const mem = {};
      return {
        get(key, dflt) {
          try {
            const raw = ok ? global.localStorage.getItem(p + key) : mem[p + key];
            if (raw == null) return dflt;
            return JSON.parse(raw);
          } catch (e) { return dflt; }
        },
        set(key, val) {
          const raw = JSON.stringify(val);
          try { if (ok) global.localStorage.setItem(p + key, raw); else mem[p + key] = raw; } catch (e) { mem[p + key] = raw; }
          return val;
        },
        remove(key) { try { if (ok) global.localStorage.removeItem(p + key); else delete mem[p + key]; } catch (e) { } },
        clear() {
          try {
            if (ok) { Object.keys(global.localStorage).filter((k) => k.indexOf(p) === 0).forEach((k) => global.localStorage.removeItem(k)); }
            else Object.keys(mem).forEach((k) => { if (k.indexOf(p) === 0) delete mem[k]; });
          } catch (e) { }
        }
      };
    }
  };

  /* --- export ------------------------------------------------------------- */
  NV.export = {
    csv(rows, columns) {
      const cols = columns || (rows[0] ? Object.keys(rows[0]) : []);
      const esc = (v) => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      return [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c])).join(','))).join('\n');
    },
    downloadCSV(filename, rows, columns) { return Util.download(filename, '\ufeff' + NV.export.csv(rows, columns), 'text/csv;charset=utf-8'); },
    downloadJSON(filename, obj) { return Util.download(filename, JSON.stringify(obj, null, 2), 'application/json;charset=utf-8'); },
    downloadText(filename, text, mime) { return Util.download(filename, text, mime); },
    print(html, title) {
      try {
        const f = document.createElement('iframe');
        f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
        document.body.appendChild(f);
        const d = f.contentWindow.document;
        d.open();
        d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + Util.esc(title || 'Rapport NUTRI.N°1') + '</title>' +
          '<style>body{font:13px/1.55 system-ui,Arial;margin:26px;color:#0f1c14}h1{font-size:20px}h2{font-size:15px;margin-top:20px;border-bottom:1px solid #cfe0d5;padding-bottom:5px}' +
          'table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #d8e5dc;padding:6px 8px;text-align:left;font-size:12px}' +
          '.nv-report-kpi{display:inline-block;min-width:150px;border:1px solid #d8e5dc;border-radius:10px;padding:9px 12px;margin:4px 6px 4px 0}' +
          '.muted{color:#5c6f63}.badge{display:inline-block;border-radius:99px;padding:2px 9px;background:#eef6f0;border:1px solid #cfe0d5;font-size:11px}</style>' +
          '</head><body>' + html + '</body></html>');
        d.close();
        setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { } }, 320);
        setTimeout(() => f.remove(), 2500);
        return true;
      } catch (e) { return false; }
    }
  };

  /* --- composants UI (générateurs HTML + helpers) ------------------------- */
  const UI = {
    /* carte panneau standard : réutilisable dans toutes les sections */
    panel(opt) {
      const o = opt || {};
      return '<section class="nv-panel ' + (o.cls || '') + '" ' + (o.id ? 'id="' + o.id + '"' : '') + (o.tone ? ' data-tone="' + o.tone + '"' : '') + '>' +
        (o.title || o.actions || o.subtitle ? '<header class="nv-panel-head">' +
          '<div class="nv-panel-title">' +
          (o.icon ? '<span class="nv-panel-icon">' + o.icon + '</span>' : '') +
          '<div><h3>' + Util.esc(o.title || '') + '</h3>' + (o.subtitle ? '<p class="nv-sub">' + o.subtitle + '</p>' : '') + '</div>' +
          '</div>' + (o.actions ? '<div class="nv-panel-actions">' + o.actions + '</div>' : '') + '</header>' : '') +
        '<div class="nv-panel-body">' + (o.body || '') + '</div>' +
        (o.footer ? '<footer class="nv-panel-foot">' + o.footer + '</footer>' : '') + '</section>';
    },
    kpi(o) {
      const tone = o.tone || (o.status === 'good' ? 'good' : o.status === 'warn' ? 'warn' : o.status === 'risk' ? 'risk' : 'info');
      return '<div class="nv-kpi" data-tone="' + tone + '" ' + (o.id ? 'id="' + o.id + '"' : '') + (o.title ? ' title="' + Util.esc(o.title) + '"' : '') + '>' +
        '<div class="nv-kpi-top"><span class="nv-kpi-label">' + (o.icon ? '<i>' + o.icon + '</i>' : '') + Util.esc(o.label || '') + '</span>' +
        (o.chip ? '<span class="nv-chip nv-chip-' + tone + '">' + Util.esc(o.chip) + '</span>' : '') + '</div>' +
        '<div class="nv-kpi-value">' + (o.value == null ? '—' : o.value) + (o.unit ? '<small>' + Util.esc(o.unit) + '</small>' : '') + '</div>' +
        (o.delta != null ? '<div class="nv-kpi-delta ' + (Util.num(o.delta, 0) >= 0 ? (o.deltaGood === false ? 'bad' : 'good') : (o.deltaGood === false ? 'good' : 'bad')) + '">' +
          (Util.num(o.delta, 0) >= 0 ? '▲' : '▼') + ' ' + Util.esc(o.deltaText != null ? o.deltaText : Util.fmt(Math.abs(Util.num(o.delta, 0)), 1) + (o.deltaUnit || '')) + '</div>' : '') +
        (o.spark ? '<div class="nv-kpi-spark">' + o.spark + '</div>' : '') +
        (o.hint ? '<div class="nv-kpi-hint">' + o.hint + '</div>' : '') + '</div>';
    },
    meter(o) {
      const v = Util.clamp(Util.num(o.value, 0), 0, 100);
      return '<div class="nv-meter' + (o.compact ? ' nv-meter-compact' : '') + '">' +
        (o.label ? '<div class="nv-meter-head"><span>' + Util.esc(o.label) + '</span><b>' + (o.text != null ? Util.esc(o.text) : Util.fmt(v, 0) + '%') + '</b></div>' : '') +
        '<div class="nv-meter-track"><i style="width:' + v + '%;background:' + (o.color || Theme.scale(1 - v / 100)) + '"></i>' +
        (o.marker != null ? '<u style="left:' + Util.clamp(Util.num(o.marker), 0, 100) + '%" title="' + Util.esc(o.markerLabel || '') + '"></u>' : '') + '</div>' +
        (o.scale ? '<div class="nv-meter-scale">' + o.scale.map((s) => '<span>' + Util.esc(s) + '</span>').join('') + '</div>' : '') + '</div>';
    },
    chip(label, tone, icon) { return '<span class="nv-chip nv-chip-' + (tone || 'neutral') + '">' + (icon ? '<i>' + icon + '</i>' : '') + Util.esc(label) + '</span>'; },
    btn(label, opt) {
      const o = opt || {};
      return '<button class="nv-btn ' + (o.kind || '') + (o.active ? ' active' : '') + '" ' +
        (o.action ? 'data-nv-action="' + Util.esc(o.action) + '"' : '') + (o.arg != null ? ' data-nv-arg="' + Util.esc(o.arg) + '"' : '') +
        (o.id ? ' id="' + o.id + '"' : '') + (o.title ? ' title="' + Util.esc(o.title) + '"' : '') + (o.disabled ? ' disabled' : '') + '>' +
        (o.icon ? '<i>' + o.icon + '</i>' : '') + '<span>' + Util.esc(label) + '</span></button>';
    },
    segmented(items, active, action) {
      return '<div class="nv-seg" ' + (action ? 'data-nv-seg="' + Util.esc(action) + '"' : '') + '>' + items.map((it) =>
        '<button class="nv-seg-btn' + (String(it.id) === String(active) ? ' active' : '') + '" data-nv-action="' + Util.esc(action || 'seg') + '" data-nv-arg="' + Util.esc(it.id) + '"' +
        (it.title ? ' title="' + Util.esc(it.title) + '"' : '') + '>' + Util.esc(it.label) + '</button>').join('') + '</div>';
    },
    slider(o) {
      return '<div class="nv-slider" data-nv-slider="' + Util.esc(o.key) + '">' +
        '<div class="nv-slider-head"><label for="' + Util.esc(o.id) + '">' + (o.icon ? '<i>' + o.icon + '</i>' : '') + Util.esc(o.label) + '</label>' +
        '<output id="' + Util.esc(o.id) + '-out">' + Util.esc(o.display != null ? o.display : String(o.value)) + '</output></div>' +
        '<input id="' + Util.esc(o.id) + '" type="range" min="' + o.min + '" max="' + o.max + '" step="' + (o.step == null ? 1 : o.step) + '" value="' + o.value + '"' +
        ' data-nv-key="' + Util.esc(o.key) + '" data-nv-unit="' + Util.esc(o.unit || '') + '" data-nv-decimals="' + (o.decimals == null ? 0 : o.decimals) + '">' +
        (o.hint ? '<div class="nv-slider-hint">' + Util.esc(o.hint) + '</div>' : '') + '</div>';
    },
    toggle(o) {
      return '<label class="nv-toggle' + (o.on ? ' on' : '') + '" data-nv-toggle="' + Util.esc(o.key) + '">' +
        '<input type="checkbox" ' + (o.on ? 'checked' : '') + ' data-nv-key="' + Util.esc(o.key) + '"><span class="nv-toggle-track"><i></i></span>' +
        '<span class="nv-toggle-label">' + Util.esc(o.label) + '</span></label>';
    },
    table(columns, rows, opt) {
      const o = opt || {};
      return '<div class="nv-table-wrap ' + (o.cls || '') + '"><table class="nv-table">' +
        '<thead><tr>' + columns.map((c) => '<th' + (c.align ? ' style="text-align:' + c.align + '"' : '') + '>' + Util.esc(c.label) + '</th>').join('') + '</tr></thead>' +
        '<tbody>' + rows.map((r, ri) => '<tr' + (r.__tone ? ' data-tone="' + r.__tone + '"' : '') + '>' + columns.map((c) =>
          '<td' + (c.align ? ' style="text-align:' + c.align + '"' : '') + '>' + (c.render ? c.render(r[c.key], r, ri) : Util.esc(r[c.key] == null ? '—' : r[c.key])) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>';
    },
    /* compte animé d'un nombre */
    countUp(el, to, opt) {
      if (!el) return;
      const o = opt || {};
      const from = Util.num(o.from != null ? o.from : (el.textContent || 0), 0);
      const dur = Util.reducedMotion() ? 0 : (o.duration || 700);
      const fmt = o.format || ((v) => Util.fmt(v, o.digits == null ? 1 : o.digits));
      if (!dur) { el.textContent = fmt(to); return; }
      const t0 = Date.now();
      const step = () => {
        const t = Util.clamp((Date.now() - t0) / dur, 0, 1);
        el.textContent = fmt(Util.lerp(from, to, 1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    /* modal réutilisable */
    modal(opt) {
      const o = opt || {};
      const back = document.createElement('div');
      back.className = 'nv-modal-backdrop' + (o.size ? ' nv-modal-' + o.size : '');
      back.innerHTML = '<div class="nv-modal" role="dialog" aria-modal="true">' +
        '<header class="nv-modal-head"><div>' + (o.pill ? '<span class="nv-pill">' + Util.esc(o.pill) + '</span>' : '') +
        '<h2>' + (o.title || '') + '</h2>' + (o.subtitle ? '<p class="nv-sub">' + o.subtitle + '</p>' : '') + '</div>' +
        '<button class="nv-modal-close" data-nv-close aria-label="Fermer">×</button></header>' +
        '<div class="nv-modal-body">' + (o.body || '') + '</div>' +
        (o.actions ? '<footer class="nv-modal-foot">' + o.actions + '</footer>' : '') + '</div>';
      document.body.appendChild(back);
      requestAnimationFrame(() => back.classList.add('on'));
      const api = {
        el: back,
        body: Util.qs('.nv-modal-body', back),
        close() {
          back.classList.remove('on');
          setTimeout(() => back.remove(), 220);
          document.removeEventListener('keydown', onKey);
          if (o.onClose) o.onClose();
        }
      };
      const onKey = (e) => { if (e.key === 'Escape') api.close(); };
      document.addEventListener('keydown', onKey);
      back.addEventListener('click', (e) => { if (e.target === back || e.target.hasAttribute('data-nv-close')) api.close(); });
      (o.onMount || function () { })(api);
      return api;
    },
    /* filets de toast empilés (n'écrase pas le toast legacy) */
    toast(msg, opt) {
      const o = opt || {};
      let host = Util.qs('#nv-toasts');
      if (!host) { host = document.createElement('div'); host.id = 'nv-toasts'; document.body.appendChild(host); }
      const el = document.createElement('div');
      el.className = 'nv-toast' + (o.tone ? ' nv-toast-' + o.tone : '');
      el.innerHTML = (o.icon ? '<i>' + o.icon + '</i>' : '') + '<span>' + msg + '</span>';
      host.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); }, o.duration || 3200);
      return el;
    },
    /* simulateur de pipeline (steps animés) : réutilisable partout */
    stepper(host, steps, opt) {
      const o = opt || {};
      if (!host) return null;
      host.innerHTML = '<div class="nv-stepper">' + steps.map((s, i) =>
        '<div class="nv-step" data-i="' + i + '"><span class="nv-step-dot">' + (i + 1) + '</span><span class="nv-step-label">' + Util.esc(s.label != null ? s.label : s) + '</span>' +
        (s.detail ? '<span class="nv-step-detail">' + Util.esc(s.detail) + '</span>' : '') + '</div>').join('') + '</div>' +
        '<div class="nv-stepper-bar"><i style="width:0%"></i></div><div class="nv-stepper-status">' + Util.esc(o.readyText || '') + '</div>';
      const els = Util.qsa('.nv-step', host), bar = Util.qs('.nv-stepper-bar i', host), status = Util.qs('.nv-stepper-status', host);
      let timers = [];
      const api = {
        clear() { timers.forEach(clearTimeout); timers = []; },
        set(i, text) {
          els.forEach((e, k) => { e.classList.toggle('on', k <= i); e.classList.toggle('active', k === i); });
          if (bar) bar.style.width = ((i + 1) / els.length) * 100 + '%';
          if (status && text != null) status.textContent = text;
        },
        run(opt2) {
          const o2 = opt2 || {};
          api.clear(); api.set(-1);
          const delay = o2.stepMs || (o.stepMs || 420);
          steps.forEach((s, i) => {
            timers.push(setTimeout(() => {
              api.set(i, typeof (s.text || s.detail) === 'function' ? s.text(i) : (s.text || s.detail || (s.label != null ? s.label : s)));
              if (s.onStep) s.onStep(i);
            }, i * delay));
          });
          timers.push(setTimeout(() => {
            els.forEach((e) => e.classList.remove('active'));
            if (status) status.innerHTML = o2.doneText || o.doneText || '✓';
            if (o2.onDone) o2.onDone();
          }, steps.length * delay + 120));
          return api;
        }
      };
      return api;
    },
    /* Pipeline d'inférence : étapes + métriques, rejouable.
       Réutilisable par tout module qui veut montrer « ce que fait l'IA ». */
    pipeline(host, steps, opt) {
      const o = opt || {};
      if (!host) return null;
      const list = (steps || []).map((s, i) => { const c = {}; for (const k in s) c[k] = s[k]; c.i = i; return c; });
      host.classList.add('nv-pipe-host');
      host.innerHTML =
        '<ol class="nv-pipe">' + list.map((s) =>
          '<li class="nv-pipe-step" data-i="' + s.i + '" data-state="idle">' +
          '<span class="nv-pipe-dot"><i>' + Util.esc(s.icon == null ? s.i + 1 : s.icon) + '</i></span>' +
          '<span class="nv-pipe-body">' +
          '<b class="nv-pipe-label">' + Util.esc(s.label || '') + '</b>' +
          (s.detail ? '<span class="nv-pipe-detail">' + Util.esc(s.detail) + '</span>' : '') +
          '<span class="nv-pipe-metrics" data-m></span>' +
          '</span><span class="nv-pipe-state" data-s></span></li>').join('') + '</ol>' +
        '<div class="nv-pipe-bar"><i style="width:0%"></i></div>' +
        (o.status !== false ? '<div class="nv-pipe-status" role="status" aria-live="polite">' + Util.esc(o.readyText || '') + '</div>' : '');
      const els = Util.qsa('.nv-pipe-step', host);
      const bar = Util.qs('.nv-pipe-bar i', host);
      const status = Util.qs('.nv-pipe-status', host);
      const metricHtml = (m, fmtKey) => Object.keys(m || {}).map((k) =>
        '<em>' + Util.esc(fmtKey ? fmtKey(k) : k) + '</em><b>' + Util.esc(String(m[k])) + '</b>').join('');
      const timers = [];
      const api = {
        steps: list,
        clear() { timers.forEach(clearTimeout); timers.length = 0; },
        fmtKey: o.fmtKey || null,
        set(i, html) {
          els.forEach((e, k) => {
            e.dataset.state = k < i ? 'done' : (k === i ? 'active' : 'idle');
            if (k <= i) {
              const m = e.querySelector('[data-m]'); if (m) m.innerHTML = metricHtml(list[k].metrics, api.fmtKey);
              const s = e.querySelector('[data-s]'); if (s) s.textContent = k < i ? '✓' : '●';
            }
          });
          if (bar) bar.style.width = (list.length ? ((i + 1) / list.length) * 100 : 0) + '%';
          if (status && html != null) status.innerHTML = html;
        },
        run(o2) {
          const oo = o2 || {};
          api.clear(); api.set(-1, Util.esc(oo.startText || o.startText || ''));
          const delay = Util.reducedMotion() ? 0 : (oo.stepMs || o.stepMs || 300);
          list.forEach((s, i) => {
            timers.push(setTimeout(() => {
              api.set(i, '<b>' + Util.esc(s.label || '') + '</b>' + (s.detail ? ' — ' + Util.esc(s.detail) : ''));
              if (s.onStep) s.onStep(i);
              if (oo.onStep) oo.onStep(i, s);
            }, i * delay));
          });
          timers.push(setTimeout(() => { api.finish(); if (oo.onDone) oo.onDone(); if (o.onDone) o.onDone(); }, list.length * delay + 150));
          return api;
        },
        finish(doneHtml) {
          api.set(list.length - 1);
          els.forEach((e) => { e.dataset.state = 'done'; const s = e.querySelector('[data-s]'); if (s) s.textContent = '✓'; });
          if (bar) bar.style.width = '100%';
          if (status) status.innerHTML = doneHtml != null ? doneHtml : (o.doneText || '');
        }
      };
      if (o.finish !== false) api.finish(o.doneText);
      return api;
    },
    /* petit bloc "signal" (statut + couleur) */
    signal(label, tone, value) {
      return '<div class="nv-signal" data-tone="' + (tone || 'neutral') + '"><i class="nv-signal-dot"></i><div><span>' + Util.esc(label) + '</span>' +
        (value != null ? '<b>' + Util.esc(value) + '</b>' : '') + '</div></div>';
    },
    avatar(initials, opt) {
      const o = opt || {};
      return '<div class="nv-avatar' + (o.ring ? ' nv-avatar-ring' : '') + '" style="--nv-a:' + (o.color || Theme.tones.good) + '"><span>' + Util.esc(initials) + '</span></div>';
    }
  };
  NV.ui = UI;

  /* --- registre d'applications / cycle de vie ----------------------------- */
  const App = (function () {
    const modules = [];
    let booted = false;
    function sectionOf(def) { return def.section ? document.getElementById(def.section) : null; }
    function bootOne(def) {
      const root = sectionOf(def);
      if (!root || def.__mounted) return;
      try {
        def.__root = root;
        root.classList.add('nv-scope');
        if (def.mount) def.mount(root, api(def));
        def.__mounted = true;
        Bus.emit('module:mounted', { id: def.id, root });
      } catch (err) {
        def.__mounted = false;
        if (global.console) console.error('[NutriVision] module "' + def.id + '" failed:', err);
      }
    }
    function api(def) {
      return {
        id: def.id, root: def.__root, t: I18N.t, util: Util, chart: NV.chart, ui: UI, stats: NV.stats, rng: NV.rng, theme: Theme,
        refresh: (data) => { if (def.refresh) def.refresh(data, def.__root); },
        on: Bus.on, emit: Bus.emit, store: NV.store.ns(def.id)
      };
    }
    return {
      modules,
      module(def) {
        if (!def || !def.id) return null;
        modules.push(def);
        if (booted) bootOne(def);
        return def;
      },
      get(id) { return modules.filter((m) => m.id === id)[0] || null; },
      boot() {
        if (booted) return;
        booted = true;
        I18N.install();
        modules.slice().sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(bootOne);
        /* navigation : on suit go() sans le modifier */
        const navHook = () => {
          if (typeof global.go === 'function' && !global.go.__nvWrapped) {
            const orig = global.go;
            const wrapped = function (id, btn) {
              const r = orig.apply(this, arguments);
              Bus.emit('view', { id });
              document.dispatchEvent(new CustomEvent('nutri:view', { detail: { id } }));
              return r;
            };
            wrapped.__nvWrapped = true;
            global.go = wrapped;
          }
        };
        navHook();
        if (!global.go || !global.go.__nvWrapped) setTimeout(navHook, 600);
        /* deep-link #section */
        const hash = (global.location && global.location.hash || '').replace('#', '');
        if (hash && document.getElementById(hash) && typeof global.go === 'function') {
          setTimeout(() => { try { global.go(hash); } catch (e) { } }, 700);
        }
        Util.on(global, 'hashchange', () => {
          const h = (global.location.hash || '').replace('#', '');
          if (h && document.getElementById(h) && typeof global.go === 'function') { try { global.go(h); } catch (e) { } }
        });
        Bus.emit('boot', {});
      },
      refresh(id, data) {
        const list = id ? modules.filter((m) => m.id === id) : modules;
        list.forEach((m) => { if (m.__mounted && m.refresh) { try { m.refresh(data, m.__root); } catch (e) { console && console.warn('[NV]', e); } } });
      },
      /* ré-applique la langue sur tous les modules montés */
      relang() { modules.forEach((m) => { if (m.__mounted && m.render) { try { m.render(m.__root); } catch (e) { } } }); }
    };
  })();
  /* ==========================================================================
     NV.guard — REPRISE DE CONTRÔLE SUR LES COUCHES DE DÉMONSTRATION HÉRITÉES
     --------------------------------------------------------------------------
     Plusieurs couches historiques de la page (V54 « live overlay », V56
     « intercept », V57 « operational simulation ») écoutent les clics et les
     changements au niveau du document — V56 en phase de capture — et ouvrent des
     fenêtres de démonstration qui masquent les cockpits NutriVision. Elles
     restent utiles sur le reste de la page : on ne les supprime jamais, on les
     empêche seulement d'atteindre les contrôles d'un module, en écoutant plus
     tôt qu'elles (fenêtre + capture) sur le périmètre du module.

     Usage (réutilisable par toute section) :
       const g = NV.guard.scope(root, {
         click:  function (el, e) { ... ; return true; },   // true = consommé
         change: function (el, e) { ... ; return true; }
       });
       NV.guard.mark(legacySelect);   // élément hérité repris par le module
       NV.guard.release(g);           // au démontage
     ========================================================================== */
  const Guard = (function () {
    const DEFAULT_OWNED = '.nv-panel, .nv-hero-panel, .nv-kpis, .nv-kpi, .nv-list, .nv-item, ' +
      '.nv-table, .nv-chart-host, .nv-chart, .nv-seg, .nv-slider, .nv-lever, .nv-stepper, ' +
      '.nv-ring, .nv-gisbar, .nv-uni-gis, .nv-uni-gisbar, .nv-uni-lever, .nv-uni-tile, ' +
      '[data-nv-action], [data-nv-arg], [data-nv-chart], [data-nv-seg], [data-nv-slider], [data-nv-owned]';
    const scopes = [];
    let installed = false;
    function owner(t) {
      for (let i = 0; i < scopes.length; i++) {
        const s = scopes[i];
        if (!s.root || !s.root.contains || !s.root.contains(t)) continue;
        /* les modales vivent hors des sections : les couches héritées les ignorent */
        if (t.closest && t.closest('.nv-modal-backdrop')) continue;
        if ((t.hasAttribute && t.hasAttribute('data-nv-owned')) || t.__nvOwned) return s;
        if (t.closest && t.closest(s.owned || DEFAULT_OWNED)) return s;
      }
      return null;
    }
    function install() {
      if (installed || !global.addEventListener) return;
      installed = true;
      global.addEventListener('click', function (e) {
        const t = e.target;
        if (!t || !t.closest) return;
        const s = owner(t);
        if (!s || typeof s.click !== 'function') return;
        const el = t.closest('[data-nv-action], [data-nv-owned], [role="button"]') || t;
        let done = false;
        try { done = s.click(el, e) !== false; } catch (err) { done = false; }
        if (!done) return;
        e.stopPropagation();                       /* V54 / V56 / V57 ne verront pas ce clic */
        if (el.tagName === 'BUTTON' || (el.hasAttribute && el.hasAttribute('data-nv-action'))) e.preventDefault();
      }, true);
      global.addEventListener('change', function (e) {
        const t = e.target;
        if (!t) return;
        const s = owner(t);
        if (!s || typeof s.change !== 'function') return;
        let done = false;
        try { done = s.change(t, e) !== false; } catch (err) { done = false; }
        if (done) e.stopPropagation();             /* pas de « Context recalculation » V54 */
      }, true);
    }
    return {
      scope(root, opt) {
        if (!root) return null;
        const o = opt || {};
        const s = { root: root, owned: o.owned || DEFAULT_OWNED, click: o.click, change: o.change };
        scopes.push(s);
        install();
        return s;
      },
      release(s) { const i = scopes.indexOf(s); if (i >= 0) scopes.splice(i, 1); },
      mark(el) {
        if (!el) return el;
        el.__nvOwned = true;
        try { el.setAttribute('data-nv-owned', '1'); } catch (e) { }
        return el;
      },
      ownedSelector: DEFAULT_OWNED
    };
  })();
  NV.guard = Guard;

  NV.app = App;

  /* boot automatique */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => App.boot(), 30));
  else setTimeout(() => App.boot(), 30);

  NV.ready = true;
  Bus.emit('ready', { version: NV.version });
})(typeof window !== 'undefined' ? window : globalThis);
