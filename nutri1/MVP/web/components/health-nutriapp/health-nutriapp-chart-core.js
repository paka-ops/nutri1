/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : health-nutriapp-chart-core.js
 * Rôle    : Moteur de rendu Canvas 2D pur (aucune librairie externe).
 *
 *  - HA.Chart : classe de base d'un graphique
 *      · gestion HiDPI (devicePixelRatio) + ResizeObserver
 *      · animation d'entrée 800 ms ease-out via requestAnimationFrame
 *      · déclenchement au scroll via IntersectionObserver (instance unique)
 *      · hit-testing générique (points, rectangles, arcs)
 *      · tooltip HTML (card blanche, ombre, liseré gauche 4px couleur série)
 *      · animation de survol (halo) en ~160 ms
 *  - Helpers de dessin : grilles, axes, courbes bézier monotones
 *    (Fritsch–Carlson), barres arrondies, dégradés, échelles « nice ».
 *
 *  Performance : rendu à la demande uniquement (pas de boucle permanente),
 *  donc 0 coût CPU au repos et 60 fps pendant les animations.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = (global.HealthNutriApp = global.HealthNutriApp || {});

  /* ---------- Charte graphique Min. Santé ---------- */
  HA.COLORS = {
    primary: '#7C3AED', primary2: '#A855F7', secondary: '#06B6D4',
    tertiary: '#10B981', quaternary: '#F59E0B',
    danger: '#EF4444', success: '#10B981', amber: '#F59E0B',
    grid: '#F5F3FF', axis: '#DDD6FE', label: '#94A3B8', value: '#334155', title: '#1E293B', body: '#64748B'
  };
  const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  HA.font = (size, weight) => (weight || 500) + ' ' + size + 'px ' + FONT;
  HA.ANIM_MS = 800;

  /* ---------- Fonctions utilitaires ---------- */
  HA.ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
  HA.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  HA.lerp = (a, b, t) => a + (b - a) * t;
  /* Progression échelonnée : chaque élément i/n démarre un peu après le précédent */
  HA.stagger = (p, i, n, spread) => {
    const s = spread == null ? 0.45 : spread;
    const start = n <= 1 ? 0 : (i / (n - 1)) * s;
    return HA.ease(HA.clamp((p - start) / (1 - s), 0, 1));
  };
  HA.hexA = (hex, a) => {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  /* Interpolation entre deux couleurs hex */
  HA.mix = (c1, c2, t) => {
    const p = (c) => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = p(c1), b = p(c2);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };
  /* Échelle de couleurs multi-arrêts (heatmap, polar…) */
  HA.scaleColor = (stops, t) => {
    t = HA.clamp(t, 0, 1);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
        return HA.mix(c0, c1, (t - t0) / (t1 - t0 || 1));
      }
    }
    return stops[stops.length - 1][1];
  };
  /* Formats : milliers séparés par espace fine, décimales, compacts */
  HA.fmtInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  HA.fmtPct = (v, d) => (+v).toFixed(d == null ? 1 : d) + ' %';
  HA.fmtCompact = (n) => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + ' k' : Math.round(n) + '');
  HA.escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Échelle « nice » (graduations rondes) */
  HA.niceScale = (min, max, ticks) => {
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

  /* ---------- Primitives de dessin ---------- */
  /* Rectangle arrondi seulement en haut (barres verticales, rayon 6px) */
  HA.roundTop = (ctx, x, y, w, h, r) => {
    r = Math.min(r == null ? 6 : r, w / 2, Math.abs(h));
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };
  /* Rectangle arrondi seulement à droite (barres horizontales) */
  HA.roundRight = (ctx, x, y, w, h, r) => {
    r = Math.min(r == null ? 6 : r, h / 2, Math.abs(w));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  HA.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /* Courbe bézier cubique monotone (Fritsch–Carlson) : ultra-lisse, sans
   * dépassement au-dessus/au-dessous des points réels. */
  HA.smoothPath = (ctx, pts, moveTo) => {
    const n = pts.length;
    if (!n) return;
    if (moveTo !== false) ctx.moveTo(pts[0].x, pts[0].y); else ctx.lineTo(pts[0].x, pts[0].y);
    if (n < 3) { for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y); return; }
    const dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; dy[i] = pts[i + 1].y - pts[i].y; m[i] = dy[i] / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      ctx.bezierCurveTo(pts[i].x + h, pts[i].y + h * t[i], pts[i + 1].x - h, pts[i + 1].y - h * t[i + 1], pts[i + 1].x, pts[i + 1].y);
    }
  };

  /* Grille horizontale + labels de l'axe Y */
  HA.drawYGrid = (ctx, plot, scale, fmt, opts) => {
    opts = opts || {};
    ctx.save();
    ctx.font = HA.font(11, 500);
    ctx.fillStyle = HA.COLORS.label;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    scale.ticks.forEach((v) => {
      const y = Math.round(plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h) + 0.5;
      ctx.strokeStyle = v === scale.min ? HA.COLORS.axis : HA.COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.w, y); ctx.stroke();
      if (!opts.noLabels) ctx.fillText(fmt ? fmt(v) : v, plot.x - 10, y);
    });
    ctx.restore();
  };
  /* Grille verticale + labels de l'axe X (scatter, bullet horizontal…) */
  HA.drawXGrid = (ctx, plot, scale, fmt, opts) => {
    opts = opts || {};
    ctx.save();
    ctx.font = HA.font(11, 500);
    ctx.fillStyle = HA.COLORS.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    scale.ticks.forEach((v) => {
      const x = Math.round(plot.x + ((v - scale.min) / (scale.max - scale.min)) * plot.w) + 0.5;
      ctx.strokeStyle = v === scale.min ? HA.COLORS.axis : HA.COLORS.grid;
      ctx.beginPath(); ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.h); ctx.stroke();
      if (!opts.noLabels) ctx.fillText(fmt ? fmt(v) : v, x, plot.y + plot.h + 8);
    });
    ctx.restore();
  };
  HA.drawXLabels = (ctx, plot, labels, xOf, opts) => {
    opts = opts || {};
    ctx.save();
    ctx.font = HA.font(11, 500);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const every = opts.every || 1;
    labels.forEach((l, i) => {
      if (i % every) return;
      ctx.fillStyle = opts.activeIndex === i ? HA.COLORS.primary : HA.COLORS.label;
      if (opts.activeIndex === i) ctx.font = HA.font(11, 700);
      ctx.fillText(l, xOf(i), plot.y + plot.h + 10);
      ctx.font = HA.font(11, 500);
    });
    ctx.restore();
  };
  /* Ligne pointillée avec étiquette (seuils Sphère, cibles…) */
  HA.dashedLine = (ctx, x1, y1, x2, y2, color, label, align) => {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.font = HA.font(11, 600);
      const tw = ctx.measureText(label).width + 12;
      let lx = align === 'start' ? x1 + 4 : align === 'top' ? x1 - tw / 2 : x2 - tw - 4;
      let ly = align === 'top' ? y1 - 4 : y1 - 22;
      if (align === 'top') ly = y1 - 2;
      ctx.fillStyle = '#FFFFFF';
      HA.roundRect(ctx, lx, ly, tw, 18, 9); ctx.fill();
      ctx.strokeStyle = HA.hexA(color, 0.35); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + 6, ly + 9.5);
    }
    ctx.restore();
  };
  /* Dégradé vertical couleur → transparent (area charts) */
  HA.vGradient = (ctx, y0, y1, color, a0, a1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, HA.hexA(color, a0 == null ? 0.28 : a0));
    g.addColorStop(1, HA.hexA(color, a1 == null ? 0 : a1));
    return g;
  };
  /* Point de courbe : cercle + halo au survol */
  HA.point = (ctx, x, y, color, hoverT) => {
    if (hoverT > 0) {
      ctx.beginPath(); ctx.arc(x, y, 5 + 7 * hoverT, 0, Math.PI * 2);
      ctx.fillStyle = HA.hexA(color, 0.18 * hoverT); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, hoverT > 0 ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.stroke();
  };
  /* Texte tronqué avec ellipse */
  HA.ellipsis = (ctx, text, maxW) => {
    text = (global.NutriSectionsI18N ? global.NutriSectionsI18N.t(text) : text);
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  };

  /* ---------- IntersectionObserver partagé ----------
   * Déclenche l'animation d'entrée la première fois qu'un graphique devient
   * visible (scroll), et à chaque réapparition après changement de données. */
  const ioTargets = new Map();
  const io = 'IntersectionObserver' in global
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const ch = ioTargets.get(e.target);
          if (!ch) return;
          ch.visible = e.isIntersecting;
          if (e.isIntersecting && ch.pending) ch.play();
        });
      }, { threshold: 0.15 })
    : null;

  /* Petit planificateur : regroupe tous les rendus d'une frame en un seul
   * passage requestAnimationFrame (évite les rendus redondants). */
  const dirty = new Set();
  let rafId = 0;
  function flush(now) {
    rafId = 0;
    const list = Array.from(dirty); dirty.clear();
    list.forEach((ch) => ch._frame(now));
  }
  function schedule(ch) { dirty.add(ch); if (!rafId) rafId = requestAnimationFrame(flush); }

  /* ======================================================================
   * Classe HA.Chart
   *   host : élément conteneur (position:relative, hauteur CSS définie)
   *   def  : { draw(ch, ctx, W, H, p), onClick?(hit, ch) }
   * ====================================================================== */
  class Chart {
    constructor(host, def) {
      this.host = host;
      this.def = def;
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('role', 'img');
      const _rawCtx = this.canvas.getContext('2d');
      this.ctx = global.NutriSectionsI18N ? global.NutriSectionsI18N.wrapCtx(_rawCtx) : _rawCtx;
      this.tip = document.createElement('div');
      this.tip.className = 'ha-tooltip';
      host.appendChild(this.canvas);
      host.appendChild(this.tip);
      this.W = 0; this.H = 0; this.dpr = 1;
      this.p = 0;            // progression d'animation (0 → 1)
      this.hover = null;     // clé de l'élément survolé
      this.hoverT = 0;       // progression de l'animation de survol
      this.hits = [];        // zones interactives remplies pendant draw()
      this.hidden = new Set(); // séries masquées via la légende
      this.visible = false;
      this.pending = true;
      this.animStart = 0;
      this.hoverStart = 0;
      this.data = null;

      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(host);
      if (io) { ioTargets.set(host, this); io.observe(host); } else { this.visible = true; }

      /* Pointer events : souris + tactile (tablette) */
      this.canvas.addEventListener('pointermove', (e) => this._onMove(e));
      this.canvas.addEventListener('pointerleave', () => this._setHover(null));
      this.canvas.addEventListener('click', (e) => {
        const hit = this._hitAt(e);
        if (hit && this.def.onClick) this.def.onClick(hit, this);
      });
    }

    /* Nouvelles données → réanimation complète (entrée 800 ms) */
    setData(data, opts) {
      this.data = data;
      this.hover = null;
      this.tip.classList.remove('on');
      if (opts && opts.instant) { this.p = 1; this.render(); return; }
      this.pending = true;
      if (this.visible && this.W > 0) this.play(); else this.render();
    }
    play() {
      this.pending = false;
      this.animStart = performance.now();
      this.p = 0;
      schedule(this);
    }
    /* Redessin sans réanimation (ex : toggle de légende) */
    refresh() { schedule(this); }

    resize() {
      const r = this.host.getBoundingClientRect();
      const W = Math.round(r.width), H = Math.round(r.height);
      if (!W || !H) return;
      const dpr = Math.min(global.devicePixelRatio || 1, 2.5);
      if (W === this.W && H === this.H && dpr === this.dpr) return;
      this.W = W; this.H = H; this.dpr = dpr;
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.canvas.style.width = W + 'px';
      this.canvas.style.height = H + 'px';
      if (this.pending && this.visible) this.play(); else this.render();
    }

    _frame(now) {
      let again = false;
      if (this.animStart) {
        const t = HA.clamp((now - this.animStart) / HA.ANIM_MS, 0, 1);
        this.p = t; // l'easing est appliqué dans chaque draw (stagger)
        if (t < 1) again = true; else this.animStart = 0;
      }
      if (this.hoverStart) {
        const t = HA.clamp((now - this.hoverStart) / 160, 0, 1);
        this.hoverT = HA.ease(t);
        if (t < 1) again = true; else this.hoverStart = 0;
      }
      this.render();
      if (again) schedule(this);
    }

    render() {
      if (!this.W || !this.data) return;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      this.hits = [];
      try { this.def.draw(this, ctx, this.W, this.H, this.p); }
      catch (err) { console.error('[HealthNutriApp] rendu graphique', err); }
    }

    /* Enregistre une zone interactive (appelé depuis draw) */
    hit(h) { this.hits.push(h); }

    _hitAt(e) {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bestD = Infinity;
      for (let i = this.hits.length - 1; i >= 0; i--) {
        const h = this.hits[i];
        if (h.type === 'rect') {
          if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return Object.assign({ mx: x, my: y }, h);
        } else if (h.type === 'pt') {
          const d = Math.hypot(x - h.x, y - h.y);
          if (d <= (h.r || 10) && d < bestD) { best = h; bestD = d; }
        } else if (h.type === 'arc') {
          const d = Math.hypot(x - h.cx, y - h.cy);
          let a = Math.atan2(y - h.cy, x - h.cx);
          const norm = (v) => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const a0 = norm(h.a0), span = h.a1 - h.a0; a = norm(a);
          const inside = span >= Math.PI * 2 - 1e-6 || norm(a - a0) <= span;
          if (d >= h.r0 && d <= h.r1 && inside) return Object.assign({ mx: x, my: y }, h);
        }
      }
      return best ? Object.assign({ mx: x, my: y }, best) : null;
    }

    _onMove(e) {
      const hit = this._hitAt(e);
      this.canvas.style.cursor = hit && (hit.clickable || this.def.onClick) ? 'pointer' : hit ? 'crosshair' : 'default';
      this._setHover(hit, e);
    }

    _setHover(hit, e) {
      const key = hit ? hit.key : null;
      if (key !== this.hover) {
        this.hover = key;
        this.hoverT = 0;
        this.hoverStart = performance.now();
        schedule(this);
      }
      if (hit && hit.tip) this._showTip(hit, e); else this.tip.classList.remove('on');
    }

    /* Tooltip : card blanche, ombre, liseré gauche couleur de la série */
    _showTip(hit, e) {
      const t = hit.tip;
      const _lang = global.NutriSectionsI18N ? global.NutriSectionsI18N.getLang() : '';
      if (this._tipKey !== hit.key || this._tipLang !== _lang) {
        this._tipLang = _lang;
        this._tipKey = hit.key;
        let html = '<div class="ha-tip-title">' + HA.escape(t.title) + '</div>';
        if (t.sub) html += '<div class="ha-tip-sub">' + HA.escape(t.sub) + '</div>';
        (t.rows || []).forEach((r) => {
          html += '<div class="ha-tip-row">' + (r.color ? '<i style="background:' + r.color + '"></i>' : '') +
            '<span>' + HA.escape(r.label) + '</span><b>' + HA.escape(r.value) + '</b></div>';
        });
        if (t.note) html += '<div class="ha-tip-note">' + HA.escape(t.note) + '</div>';
        this.tip.innerHTML = global.NutriSectionsI18N ? global.NutriSectionsI18N.translateHtml(html) : html;
        this.tip.style.borderLeftColor = t.color || HA.COLORS.primary;
      }
      const r = this.canvas.getBoundingClientRect();
      const x = e ? e.clientX - r.left : hit.mx, y = e ? e.clientY - r.top : hit.my;
      const tw = this.tip.offsetWidth || 180, th = this.tip.offsetHeight || 60;
      let left = x + 16, top = y - th / 2;
      if (left + tw > this.W - 4) left = x - tw - 16;
      if (left < 4) left = 4;
      top = HA.clamp(top, -10, this.H - th + 10);
      this.tip.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
      this.tip.classList.add('on');
    }

    destroy() {
      this._ro.disconnect();
      if (io) { io.unobserve(this.host); ioTargets.delete(this.host); }
      dirty.delete(this);
    }
  }
  HA.Chart = Chart;

  /* Registre des définitions de graphiques (remplies par charts/ha-*) */
  HA.charts = HA.charts || {};
  HA.registerChart = (name, def) => { HA.charts[name] = def; };

  /* Compteur animé (KPI) en requestAnimationFrame */
  HA.countUp = (el, to, opts) => {
    opts = opts || {};
    const from = el._haVal || 0;
    const dec = opts.decimals || 0;
    const fmt = opts.format || ((v) => (dec ? v.toFixed(dec).replace('.', ',') : HA.fmtInt(v)));
    const t0 = performance.now();
    if (el._haRaf) cancelAnimationFrame(el._haRaf);
    const step = (now) => {
      const t = HA.clamp((now - t0) / HA.ANIM_MS, 0, 1);
      const v = from + (to - from) * HA.ease(t);
      el.innerHTML = fmt(v) + (opts.suffix || ''); // innerHTML : certains formats incluent du balisage (<small>)
      if (t < 1) el._haRaf = requestAnimationFrame(step); else { el._haVal = to; el._haRaf = 0; }
    };
    el._haRaf = requestAnimationFrame(step);
  };
})(window);
