/* ============================================================================
 * WFP NutriTracker · Surveillance Communautaire Afrique de l'Ouest
 * Fichier : wfp-nutritracker-chart-core.js
 * Rôle    : Moteur de rendu Canvas 2D pur — AUCUNE librairie externe
 *           (pas de Chart.js, pas de D3, pas de Bootstrap).
 *
 *  WFP.Chart : classe de base d'un graphique
 *      · gestion HiDPI (devicePixelRatio) + ResizeObserver
 *      · animation d'entrée 800 ms ease-out via requestAnimationFrame
 *      · déclenchement au scroll via IntersectionObserver (instance unique)
 *      · hit-testing générique (points, rectangles, arcs)
 *      · tooltip HTML (card blanche, ombre, liseré gauche 3px couleur série)
 *      · animation de survol (halo 12 px) en ~160 ms
 *      · regroupement de tous les rendus d'une frame en un seul rAF
 *
 *  Helpers de dessin : grilles, axes, courbes bézier monotones (Fritsch–
 *  Carlson), barres arrondies en haut uniquement, dégradés couleur →
 *  transparent, échelles « nice », formats français.
 *
 *  Performance : rendu à la demande uniquement (aucune boucle permanente) →
 *  0 % de CPU au repos, 60 fps pendant les animations.
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = (global.WFPTracker = global.WFPTracker || {});

  /* ---------- Charte graphique PAM / WFP ---------- */
  WFP.COLORS = {
    primary: '#F59E0B',        // ambre doré PAM
    secondary: '#EF4444',      // rouge urgence
    tertiary: '#10B981',       // vert disponible
    quaternary: '#8B5CF6',     // violet analyse
    info: '#3B82F6',           // bleu info
    orange: '#F97316',
    lime: '#84CC16',
    danger: '#EF4444',
    success: '#10B981',
    amber: '#F59E0B',
    grid: '#F1F5F9', axis: '#E2E8F0', label: '#94A3B8', value: '#334155',
    title: '#1E293B', body: '#64748B', page: '#FFFBF0', card: '#FFFFFF', border: '#FDE68A'
  };
  /* Palette cyclique pour les séries multiples */
  WFP.PALETTE = ['#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#F97316', '#0EA5E9', '#EC4899'];
  const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  WFP.font = (size, weight) => (weight || 500) + ' ' + size + 'px ' + FONT;
  WFP.ANIM_MS = 800;

  /* ---------- Fonctions utilitaires ---------- */
  WFP.ease = (t) => 1 - Math.pow(1 - t, 3);                                    // easeOutCubic
  WFP.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  WFP.lerp = (a, b, t) => a + (b - a) * t;
  /* Progression échelonnée : l'élément i/n démarre légèrement après le précédent */
  WFP.stagger = (p, i, n, spread) => {
    const s = spread == null ? 0.45 : spread;
    const start = n <= 1 ? 0 : (i / (n - 1)) * s;
    return WFP.ease(WFP.clamp((p - start) / (1 - s), 0, 1));
  };
  WFP.hexA = (hex, a) => {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  /* Interpolation entre deux couleurs hex */
  WFP.mix = (c1, c2, t) => {
    const p = (c) => { const n = parseInt(String(c).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = p(c1), b = p(c2);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };
  /* Échelle de couleurs multi-arrêts (heatmap, cartes, jauges…) */
  WFP.scaleColor = (stops, t) => {
    t = WFP.clamp(t, 0, 1);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const a = stops[i - 1], b = stops[i];
        return WFP.mix(a[1], b[1], (t - a[0]) / (b[0] - a[0] || 1));
      }
    }
    return stops[stops.length - 1][1];
  };
  /* Échelle IPC : vert → vert clair → jaune → orange → rouge */
  WFP.IPC_STOPS = [[0, '#10B981'], [0.25, '#84CC16'], [0.5, '#F59E0B'], [0.75, '#F97316'], [1, '#EF4444']];
  WFP.ipcColor = (t) => WFP.scaleColor(WFP.IPC_STOPS, t);

  /* ---------- Formats français ---------- */
  WFP.fmtInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  WFP.fmtPct = (v, d) => (+v).toFixed(d == null ? 1 : d) + '%';
  WFP.fmtCompact = (n) => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(Math.abs(n) >= 1e7 ? 0 : 1) + ' M'
    : Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(Math.abs(n) >= 1e4 ? 0 : 1) + ' k' : Math.round(n) + '');
  WFP.escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Échelle « nice » (graduations rondes) */
  WFP.niceScale = (min, max, ticks) => {
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
  /* Rectangle arrondi seulement en haut (barres verticales) — rayon 6 px */
  WFP.roundTop = (ctx, x, y, w, h, r) => {
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
  /* Rectangle arrondi seulement à droite (barres horizontales) */
  WFP.roundRight = (ctx, x, y, w, h, r) => {
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
  WFP.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  /* Polygone fermé à partir d'une liste de points [{x,y}] */
  WFP.poly = (ctx, pts) => {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  };
  /* Test point-dans-polygone (ray casting) */
  WFP.pointInPoly = (x, y, pts) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) inside = !inside;
    }
    return inside;
  };

  /* Courbe bézier cubique monotone (Fritsch–Carlson) : ultra-lisse, sans
   * dépassement au-dessus / au-dessous des points réels. */
  WFP.smoothPath = (ctx, pts, moveTo) => {
    const n = pts.length;
    if (!n) return;
    if (moveTo !== false) ctx.moveTo(pts[0].x, pts[0].y); else ctx.lineTo(pts[0].x, pts[0].y);
    if (n < 3) { for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y); return; }
    const dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; dy[i] = pts[i + 1].y - pts[i].y; m[i] = dy[i] / (dx[i] || 1e-9); }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      t[i] = m[i - 1] * m[i] <= 0 ? 0
        : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / (m[i - 1] || 1e-9) + (dx[i] + 2 * dx[i - 1]) / (m[i] || 1e-9));
    }
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      ctx.bezierCurveTo(pts[i].x + h, pts[i].y + h * t[i], pts[i + 1].x - h, pts[i + 1].y - h * t[i + 1], pts[i + 1].x, pts[i + 1].y);
    }
  };

  /* Grille horizontale + labels de l'axe Y (lignes #F1F5F9, 1 px) */
  WFP.drawYGrid = (ctx, plot, scale, fmt, opts) => {
    opts = opts || {};
    ctx.save();
    ctx.font = WFP.font(11, 500);
    ctx.fillStyle = WFP.COLORS.label;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    scale.ticks.forEach((v) => {
      const y = Math.round(plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min || 1)) * plot.h) + 0.5;
      ctx.strokeStyle = v === scale.min ? WFP.COLORS.axis : WFP.COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.w, y); ctx.stroke();
      if (!opts.noLabels) ctx.fillText(fmt ? fmt(v) : v, plot.x - 10, y);
    });
    ctx.restore();
  };
  /* Grille verticale + labels de l'axe X */
  WFP.drawXGrid = (ctx, plot, scale, fmt, opts) => {
    opts = opts || {};
    ctx.save();
    ctx.font = WFP.font(11, 500);
    ctx.fillStyle = WFP.COLORS.label;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    scale.ticks.forEach((v) => {
      const x = Math.round(plot.x + ((v - scale.min) / (scale.max - scale.min || 1)) * plot.w) + 0.5;
      ctx.strokeStyle = v === scale.min ? WFP.COLORS.axis : WFP.COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.h); ctx.stroke();
      if (!opts.noLabels) ctx.fillText(fmt ? fmt(v) : v, x, plot.y + plot.h + 8);
    });
    ctx.restore();
  };
  /* Libellés catégoriels de l'axe X */
  WFP.drawXLabels = (ctx, plot, labels, xOf, opts) => {
    opts = opts || {};
    ctx.save();
    ctx.font = WFP.font(11, 500);
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'top';
    const every = opts.every || 1;
    labels.forEach((l, i) => {
      if (i % every) return;
      const active = opts.activeIndex === i;
      ctx.fillStyle = active ? WFP.COLORS.primary : WFP.COLORS.label;
      ctx.font = WFP.font(11, active ? 700 : 500);
      const x = xOf(i);
      if (opts.rotate) {
        ctx.save();
        ctx.translate(x, plot.y + plot.h + 10);
        ctx.rotate(-opts.rotate);
        ctx.textAlign = 'right';
        ctx.fillText(WFP.ellipsis(ctx, l, 70), 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(l, x, plot.y + plot.h + 10);
      }
    });
    ctx.restore();
  };
  /* Ligne pointillée avec pastille d'étiquette (seuils, cibles) */
  WFP.dashedLine = (ctx, x1, y1, x2, y2, color, label, align) => {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.font = WFP.font(11, 600);
      const tw = ctx.measureText(label).width + 12;
      let lx = align === 'start' ? x1 + 4 : align === 'center' ? (x1 + x2) / 2 - tw / 2 : x2 - tw - 4;
      lx = WFP.clamp(lx, x1, Math.max(x1, x2 - tw - 4));
      const ly = y1 - 21;
      ctx.fillStyle = '#FFFFFF';
      WFP.roundRect(ctx, lx, ly, tw, 18, 9); ctx.fill();
      ctx.strokeStyle = WFP.hexA(color, 0.4); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + 6, ly + 9.5);
    }
    ctx.restore();
  };
  /* Dégradé vertical couleur → transparent (area charts) */
  WFP.vGradient = (ctx, y0, y1, color, a0, a1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, WFP.hexA(color, a0 == null ? 0.3 : a0));
    g.addColorStop(1, WFP.hexA(color, a1 == null ? 0 : a1));
    return g;
  };
  /* Point de courbe : cercle 5 px + halo 12 px au survol */
  WFP.point = (ctx, x, y, color, hoverT) => {
    if (hoverT > 0) {
      ctx.beginPath(); ctx.arc(x, y, 6 + 6 * hoverT, 0, Math.PI * 2);
      ctx.fillStyle = WFP.hexA(color, 0.2 * hoverT); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, hoverT > 0 ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = color; ctx.stroke();
  };
  /* Pastille de légende (rond 8 px) */
  WFP.dot = (ctx, x, y, r, color) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  };
  /* Texte tronqué avec ellipse */
  WFP.ellipsis = (ctx, text, maxW) => {
    text = String(text);
    text = (global.NutriSectionsI18N ? global.NutriSectionsI18N.t(text) : text); 
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  };
  /* Ligne verticale de survol */
  WFP.hoverLine = (ctx, x, plot, color) => {
    ctx.save();
    ctx.strokeStyle = color || '#CBD5E1'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
    ctx.restore();
  };

  /* ---------- IntersectionObserver partagé (animations au scroll) ---------- */
  const ioTargets = new Map();
  const io = 'IntersectionObserver' in global
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const ch = ioTargets.get(e.target);
          if (!ch) return;
          ch.visible = e.isIntersecting;
          if (e.isIntersecting && ch.pending) ch.play();
        });
      }, { threshold: 0.12 })
    : null;

  /* Planificateur : regroupe tous les rendus d'une frame en un seul rAF */
  const dirty = new Set();
  let rafId = 0;
  function flush(now) {
    rafId = 0;
    const list = Array.from(dirty); dirty.clear();
    list.forEach((ch) => ch._frame(now));
  }
  function schedule(ch) { dirty.add(ch); if (!rafId) rafId = requestAnimationFrame(flush); }

  /* ======================================================================
   * Classe WFP.Chart
   *   host : élément conteneur (position:relative, hauteur définie en CSS)
   *   def  : { draw(ch, ctx, W, H, p), onClick?(hit, ch), cursor? }
   * ====================================================================== */
  class Chart {
    constructor(host, def) {
      this.host = host;
      this.def = def || {};
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('role', 'img');
      const _rawCtx = this.canvas.getContext('2d');
      this.ctx = global.NutriSectionsI18N ? global.NutriSectionsI18N.wrapCtx(_rawCtx) : _rawCtx;
      this.tip = document.createElement('div');
      this.tip.className = 'wf-tip';
      host.appendChild(this.canvas);
      host.appendChild(this.tip);
      this.W = 0; this.H = 0; this.dpr = 1;
      this.p = 0;                 // progression brute de l'animation (0 → 1)
      this.hover = null;          // clé de l'élément survolé
      this.hoverT = 0;            // progression de l'animation de survol
      this.hits = [];             // zones interactives remplies pendant draw()
      this.hidden = new Set();    // séries masquées via la légende
      this.visible = false;
      this.pending = true;
      this.animStart = 0;
      this.hoverStart = 0;
      this.data = null;

      if ('ResizeObserver' in global) {
        this._ro = new ResizeObserver(() => this.resize());
        this._ro.observe(host);
      }
      if (io) { ioTargets.set(host, this); io.observe(host); } else { this.visible = true; this.pending = false; }

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
      this._tipKey = null;
      this.tip.classList.remove('on');
      if (opts && opts.instant) { this.p = 1; this.render(); return; }
      this.pending = true;
      if (this.visible && this.W > 0) this.play(); else this.render();
    }
    play() {
      this.pending = false;
      this.animStart = (global.performance || Date).now();
      this.p = 0;
      schedule(this);
    }
    /* Redessin sans réanimation (toggle de légende, hover…) */
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

    _now() { return (global.performance || Date).now(); }

    _frame(now) {
      let again = false;
      if (this.animStart) {
        const t = WFP.clamp((now - this.animStart) / WFP.ANIM_MS, 0, 1);
        this.p = t;
        if (t < 1) again = true; else this.animStart = 0;
      }
      if (this.hoverStart) {
        const t = WFP.clamp((now - this.hoverStart) / 160, 0, 1);
        this.hoverT = WFP.ease(t);
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
      catch (err) { console.error('[WFP NutriTracker] rendu graphique', err); }
    }

    /* Enregistre une zone interactive (appelé depuis draw) */
    hit(h) { this.hits.push(h); }
    /* Progression d'animation « easée » (utilisée par les draw) */
    get e() { return WFP.ease(this.p); }

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
          if (d <= (h.r || 12) && d < bestD) { best = h; bestD = d; }
        } else if (h.type === 'poly') {
          if (WFP.pointInPoly(x, y, h.points)) return Object.assign({ mx: x, my: y }, h);
        } else if (h.type === 'arc') {
          const d = Math.hypot(x - h.cx, y - h.cy);
          const norm = (v) => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          let a = norm(Math.atan2(y - h.cy, x - h.cx));
          const a0 = norm(h.a0), span = h.a1 - h.a0;
          if (d >= h.r0 && d <= h.r1 && (span >= Math.PI * 2 - 1e-6 || norm(a - a0) <= span)) return Object.assign({ mx: x, my: y }, h);
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
        this.hoverStart = this._now();
        schedule(this);
      }
      if (hit && hit.tip) this._showTip(hit, e); else { this.tip.classList.remove('on'); this._tipKey = null; }
    }

    /* Tooltip : card blanche, ombre, liseré gauche 3 px couleur de la série */
    _showTip(hit, e) {
      const t = hit.tip;
      const _lang = global.NutriSectionsI18N ? global.NutriSectionsI18N.getLang() : '';
      if (this._tipKey !== hit.key || this._tipLang !== _lang) {
        this._tipLang = _lang;
        this._tipKey = hit.key;
        let html = '<div class="wf-tip-title">' + WFP.escape(t.title) + '</div>';
        if (t.sub) html += '<div class="wf-tip-sub">' + WFP.escape(t.sub) + '</div>';
        (t.rows || []).forEach((r) => {
          html += '<div class="wf-tip-row">' + (r.color ? '<i style="background:' + r.color + '"></i>' : '') +
            '<span>' + WFP.escape(r.label) + '</span><b>' + WFP.escape(r.value) + '</b></div>';
        });
        if (t.note) html += '<div class="wf-tip-note">' + WFP.escape(t.note) + '</div>';
        this.tip.innerHTML = global.NutriSectionsI18N ? global.NutriSectionsI18N.translateHtml(html) : html;
        this.tip.style.borderLeftColor = t.color || WFP.COLORS.primary;
      }
      const r = this.canvas.getBoundingClientRect();
      const x = e ? e.clientX - r.left : hit.mx, y = e ? e.clientY - r.top : hit.my;
      const tw = this.tip.offsetWidth || 180, th = this.tip.offsetHeight || 60;
      let left = x + 16, top = y - th / 2;
      if (left + tw > this.W - 4) left = x - tw - 16;
      if (left < 4) left = 4;
      top = WFP.clamp(top, -10, this.H - th + 10);
      this.tip.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
      this.tip.classList.add('on');
    }

    destroy() {
      if (this._ro) this._ro.disconnect();
      if (io) { io.unobserve(this.host); ioTargets.delete(this.host); }
      dirty.delete(this);
    }
  }
  WFP.Chart = Chart;

  /* Registre des définitions de graphiques (rempli par les fichiers charts/*) */
  WFP.charts = WFP.charts || {};
  WFP.registerChart = (name, def) => { WFP.charts[name] = def; };

  /* Compteur animé (KPI) en requestAnimationFrame */
  WFP.countUp = (el, to, opts) => {
    opts = opts || {};
    const from = el._wfVal == null ? 0 : el._wfVal;
    const dec = opts.decimals != null ? opts.decimals : (Math.abs(to) < 10 ? 1 : 0);
    const fmt = opts.format || ((v) => WFP.fmtInt(v));
    const t0 = (global.performance || Date).now();
    if (el._wfRaf) cancelAnimationFrame(el._wfRaf);
    const step = (now) => {
      const t = WFP.clamp((now - t0) / WFP.ANIM_MS, 0, 1);
      const v = from + (to - from) * WFP.ease(t);
      el.textContent = (dec ? v.toFixed(dec) : fmt(v)) + (opts.suffix || '');
      if (t < 1) el._wfRaf = requestAnimationFrame(step); else { el._wfVal = to; el._wfRaf = 0; }
    };
    el._wfRaf = requestAnimationFrame(step);
  };
})(window);
