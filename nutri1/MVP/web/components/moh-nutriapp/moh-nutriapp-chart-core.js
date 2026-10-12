/* ============================================================================
 * NutriApp Santé · moh-nutriapp-chart-core.js
 * Moteur de rendu Canvas 2D pur (aucune librairie externe).
 *   - Gestion HiDPI (devicePixelRatio) + ResizeObserver
 *   - Animation d'entrée 800ms ease-out via requestAnimationFrame
 *   - IntersectionObserver : rendu différé jusqu'au scroll
 *   - Tooltip HTML (card blanche + shadow + liseré gauche 3px)
 *   - Hit-testing générique & halo 12px au survol
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = (global.MOHNutriApp = global.MOHNutriApp || {});
  const C = MOH.COLORS;

  const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  MOH.font = (size, weight) => (weight || 500) + ' ' + size + 'px ' + FONT;
  MOH.ANIM_MS = 800;

  /* Utilitaires */
  MOH.ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
  MOH.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  MOH.lerp = (a, b, t) => a + (b - a) * t;
  MOH.stagger = (p, i, n, spread) => {
    const s = spread == null ? 0.5 : spread;
    const start = n <= 1 ? 0 : (i / Math.max(1, n - 1)) * s;
    return MOH.ease(MOH.clamp((p - start) / (1 - s), 0, 1));
  };
  MOH.hexA = (hex, a) => {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  MOH.mix = (c1, c2, t) => {
    const p = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = p(c1), b = p(c2);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };
  MOH.scaleColor = (stops, t) => {
    t = MOH.clamp(t, 0, 1);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
        return MOH.mix(c0, c1, (t - t0) / (t1 - t0 || 1));
      }
    }
    return stops[stops.length - 1][1];
  };
  MOH.fmtInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  MOH.fmtPct = (v, d) => (+v * 100).toFixed(d == null ? 1 : d) + '%';
  MOH.fmtPctRaw = (v, d) => (+v).toFixed(d == null ? 1 : d) + '%';
  MOH.fmtCompact = (n) => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + ' k' : Math.round(n) + '');
  MOH.escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Nice scale */
  MOH.niceScale = (min, max, ticks) => {
    ticks = ticks || 5;
    if (max === min) max = min + 1;
    const range = max - min;
    const rough = range / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const nMin = Math.floor(min / step) * step;
    const nMax = Math.ceil(max / step) * step;
    const out = [];
    for (let v = nMin; v <= nMax + step / 2; v += step) out.push(+v.toFixed(10));
    return { min: nMin, max: nMax, step, ticks: out };
  };

  /* Primitives de dessin */
  MOH.roundTop = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, Math.abs(h));
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };
  MOH.roundRight = (ctx, x, y, w, h, r) => {
    r = Math.min(r, h / 2, Math.abs(w));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  MOH.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /* Courbe de Bézier monotone (lissage) */
  MOH.smoothPath = (ctx, pts, close) => {
    if (pts.length < 2) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const t1x = (p2.x - p0.x) / 6;
      const t1y = (p2.y - p0.y) / 6;
      const t2x = (p3.x - p1.x) / 6;
      const t2y = (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(p1.x + t1x, p1.y + t1y, p2.x - t2x, p2.y - t2y, p2.x, p2.y);
    }
    if (close) ctx.closePath();
  };

  /* =========================================================================
   * CLASSE CHART DE BASE
   * ========================================================================= */
  class Chart {
    constructor(host, renderFn) {
      this.host = host;
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      host.innerHTML = '';
      host.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.renderFn = renderFn;
      this.visible = 0; // progress d'animation 0..1
      this.hover = null;
      this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      this.tooltip = null;
      this.hit = null; // fonction de hit-test à définir par le renderFn
      this.seriesHidden = {};
      this.resize();
      this._ro = new ResizeObserver(() => { this.resize(); this.draw(); });
      this._ro.observe(host);
      this._io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { this.animateIn(); this._io.disconnect(); }
        });
      }, { threshold: 0.15 });
      this._io.observe(host);
      this.canvas.addEventListener('mousemove', e => this.onMove(e));
      this.canvas.addEventListener('mouseleave', () => { this.hover = null; this.draw(); this.hideTip(); });
      // Animation d'entrée dans 30ms si déjà visible (fallback)
      requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) this.animateIn();
      });
    }

    resize() {
      const r = this.host.getBoundingClientRect();
      this.w = Math.max(100, r.width);
      this.h = Math.max(60, r.height);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    animateIn() {
      if (this._animating) return;
      this._animating = true;
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / MOH.ANIM_MS);
        this.visible = MOH.ease(t);
        this.draw();
        if (t < 1) requestAnimationFrame(tick);
        else this._animating = false;
      };
      requestAnimationFrame(tick);
    }

    onMove(e) {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      this.mouse = { x, y };
      this.hover = this.hit ? this.hit(x, y) : null;
      this.draw();
      if (this.hover) this.showTip(this.hover, e.clientX, e.clientY);
      else this.hideTip();
    }

    showTip(data, cx, cy) {
      if (!this._tip) {
        this._tip = document.createElement('div');
        this._tip.className = 'moh-tooltip';
        this._tip.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;background:#fff;box-shadow:0 8px 24px rgba(30,10,60,0.14);border-radius:10px;padding:10px 12px;font:500 12px ' + FONT + ';color:#334155;border-left:3px solid ' + (data.color || C.primary) + ';max-width:260px;transform:translate(-50%, -110%);transition:opacity .12s;opacity:0;';
        document.body.appendChild(this._tip);
      }
      const tip = this._tip;
      tip.innerHTML = data.html;
      tip.style.borderLeftColor = data.color || C.primary;
      tip.style.opacity = '1';
      tip.style.left = cx + 'px';
      tip.style.top = cy + 'px';
    }

    hideTip() {
      if (this._tip) this._tip.style.opacity = '0';
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.margins = { t: 12, r: 14, b: 28, l: 40 };
      this.pw = this.w - this.margins.l - this.margins.r;
      this.ph = this.h - this.margins.t - this.margins.b;
      try { this.renderFn.call(this, ctx); }
      catch (err) { console.error('[MOH chart] erreur rendu', err); }
    }

    /* Helpers communs appelés depuis les fonctions de rendu */
    gridX(v, min, max) { return this.margins.l + ((v - min) / (max - min || 1)) * this.pw; }
    gridY(v, min, max) { return this.margins.t + this.ph - ((v - min) / (max - min || 1)) * this.ph; }

    drawAxes(xScale, yScale, opts) {
      const ctx = this.ctx;
      opts = opts || {};
      const m = this.margins;
      // Grille horizontale + labels Y
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.label;
      ctx.font = MOH.font(11, 500); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      yScale.ticks.forEach((v) => {
        const y = this.gridY(v, yScale.min, yScale.max);
        if (opts.yZeroLine && v === 0) { /* traité par l'appelant */ }
        ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(m.l + this.pw, y); ctx.stroke();
        ctx.fillText(opts.yFmt ? opts.yFmt(v) : MOH.fmtCompact(v), m.l - 6, y);
      });
      // Axe X
      ctx.strokeStyle = C.axis;
      ctx.beginPath(); ctx.moveTo(m.l, m.t + this.ph); ctx.lineTo(m.l + this.pw, m.t + this.ph); ctx.stroke();
    }

    drawXLabels(ticks, opts) {
      const ctx = this.ctx;
      opts = opts || {};
      const m = this.margins;
      ctx.fillStyle = C.label; ctx.font = MOH.font(11, 500);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ticks.forEach((t, i) => {
        const x = this.gridX(t.x, opts.xMin != null ? opts.xMin : 0, opts.xMax != null ? opts.xMax : 1);
        ctx.fillText(t.label, x, m.t + this.ph + 6);
      });
    }
  }

  MOH.Chart = Chart;

  /* =========================================================================
   * REGISTRE — attache une instance Chart par dataset-chart
   * ========================================================================= */
  MOH.initCharts = function (root, chartMap) {
    const charts = {};
    Object.keys(chartMap).forEach((id) => {
      const host = root.querySelector('[data-chart="' + id + '"]');
      if (!host) return;
      charts[id] = new Chart(host, chartMap[id]);
    });
    return charts;
  };

  /* Palette pour heatmap rouge → jaune → vert */
  MOH.HEATMAP_STOPS = [
    [0.0, '#EF4444'], [0.4, '#F59E0B'], [0.6, '#FACC15'],
    [0.8, '#84CC16'], [1.0, '#10B981']
  ];
  /* Palette stock ATPE */
  MOH.STOCK_COLORS = {
    ok: '#10B981', warn: '#F59E0B', orange: '#F97316', critique: '#EF4444'
  };
})(window);
