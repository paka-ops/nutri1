/* ============================================================================
 * UNICEF NutriChild · Surveillance Nutritionnelle Infantile
 * Fichier : unicef-nutrichild-chart-core.js
 * Rôle    : Moteur de rendu Canvas 2D PUR (zéro bibliothèque externe).
 *
 *  · NC.Chart — classe de base d'un graphique :
 *      - gestion HiDPI (devicePixelRatio plafonné à 2,5) + ResizeObserver
 *      - animation d'entrée 800 ms ease-out pilotée par requestAnimationFrame
 *      - déclenchement au scroll via un IntersectionObserver partagé
 *      - hit-testing générique (points, rectangles, arcs, bandes verticales)
 *      - tooltip HTML : card blanche, ombre portée, liseré gauche 3 px couleur
 *      - halo de survol animé sur ~160 ms
 *      - ordonnanceur : tous les rendus d'une frame sont regroupés (60 fps)
 *  · Helpers : grilles, axes, courbes bézier monotones (Fritsch–Carlson),
 *    barres arrondies 6 px, dégradés d'aire, échelles « nice », formats FR,
 *    arcs/donuts, gauges, échelles de couleur (heatmap, polar).
 *
 *  Budget performance : rendu à la demande uniquement → 0 % CPU au repos,
 *  60 fps pendant les animations et les transitions de périmètre.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = (global.NutriChild = global.NutriChild || {});

  /* ---------------------------------------------------------------------
   * Charte graphique UNICEF (couleurs exclusives du composant)
   * ------------------------------------------------------------------- */
  NC.COLORS = {
    primary: '#1CABE2',      // cyan UNICEF officiel
    primary2: '#38BDF8',     // accent dégradé KPI
    secondary: '#80BD41',    // vert tendre
    tertiary: '#F26A21',     // orange chaleureux
    quaternary: '#DDA63A',   // doré enfance
    danger: '#E5243B',       // rouge urgence UNICEF
    night: '#002952',        // bleu nuit (sidebar)
    success: '#80BD41',
    amber: '#DDA63A',
    /* Neutres de la charte */
    grid: '#F1F5F9', axis: '#E2E8F0', label: '#94A3B8',
    value: '#334155', title: '#1E293B', body: '#64748B',
    border: '#BAE6FD', bg: '#F0F9FF'
  };
  const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
  NC.FONT = FONT;
  NC.font = function (size, weight) { return (weight || 500) + ' ' + size + 'px ' + FONT; };
  NC.ANIM_MS = 800;          // durée d'entrée progressive exigée par le brief
  NC.HOVER_MS = 160;         // animation de halo au survol

  /* ---------------------------------------------------------------------
   * Utilitaires numériques & couleurs
   * ------------------------------------------------------------------- */
  NC.ease = (t) => 1 - Math.pow(1 - t, 3);                       // easeOutCubic
  NC.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  NC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  NC.lerp = (a, b, t) => a + (b - a) * t;
  NC.sum = (a) => a.reduce((s, v) => s + v, 0);
  /* Décalage échelonné : l'élément i démarre après (i/n × spread) de l'animation */
  NC.stagger = function (p, i, n, spread) {
    const s = spread == null ? 0.45 : spread;
    const start = n <= 1 ? 0 : (i / (n - 1)) * s;
    return NC.ease(NC.clamp((p - start) / (1 - s), 0, 1));
  };
  NC.hexA = function (hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  NC.mix = function (c1, c2, t) {
    const p = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = p(c1), b = p(c2);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };
  /* Échelle de couleurs multi-arrêts (heatmap, polar, bulles) */
  NC.scaleColor = function (stops, t) {
    t = NC.clamp(t, 0, 1);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const t0 = stops[i - 1][0], c0 = stops[i - 1][1], t1 = stops[i][0], c1 = stops[i][1];
        return NC.mix(c0, c1, (t - t0) / ((t1 - t0) || 1));
      }
    }
    return stops[stops.length - 1][1];
  };
  /* Échelle « rouge → vert » utilisée pour l'écart à l'objectif OMS */
  const SCALE_RG = [[0, '#E5243B'], [0.35, '#F26A21'], [0.6, '#DDA63A'], [0.85, '#9CCB5B'], [1, '#80BD41']];
  NC.scaleRG = (t) => NC.scaleColor(SCALE_RG, t);

  /* Formats français : espace fine pour les milliers, virgule décimale */
  NC.fmtInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  NC.fmtDec = (v, d) => (+v).toFixed(d == null ? 1 : d).replace('.', ',');
  NC.fmtPct = (v, d) => NC.fmtDec(v, d == null ? 1 : d) + '%';
  NC.fmtCompact = function (n, dec) {
    const d = dec == null ? 1 : dec;
    if (Math.abs(n) >= 1e6) return NC.fmtDec(n / 1e6, d) + ' M';
    if (Math.abs(n) >= 1e3) return NC.fmtDec(n / 1e3, Math.abs(n) >= 1e4 && !dec ? 0 : d) + ' k';
    return NC.fmtInt(n);
  };
  NC.escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Échelle « nice » : bornes et graduations rondes */
  NC.niceScale = function (min, max, ticks) {
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
    return { min: nMin, max: nMax, step: step, ticks: out };
  };

  /* ---------------------------------------------------------------------
   * Primitives de dessin
   * ------------------------------------------------------------------- */
  /* Barre arrondie uniquement en haut (barres verticales) */
  NC.roundTop = function (ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h));
    if (h < 0) { y += h; h = -h; }
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  };
  /* Barre arrondie uniquement à droite (barres horizontales) */
  NC.roundRight = function (ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(h) / 2, Math.abs(w));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  };
  NC.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  /* Segment d'anneau (donut, gauge, polar) */
  NC.arcSeg = function (ctx, cx, cy, r0, r1, a0, a1) {
    ctx.beginPath();
    ctx.arc(cx, cy, r1, a0, a1);
    ctx.arc(cx, cy, r0, a1, a0, true);
    ctx.closePath();
  };

  /* Courbe bézier cubique monotone (Fritsch–Carlson) : lisse et sans
   * dépassement au-dessus/au-dessous des points réels — exigence médicale
   * pour les courbes de croissance. */
  NC.smoothPath = function (ctx, pts, moveTo) {
    const n = pts.length;
    if (!n) return;
    if (moveTo !== false) ctx.moveTo(pts[0].x, pts[0].y); else ctx.lineTo(pts[0].x, pts[0].y);
    if (n < 3) { for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y); return; }
    const dx = [], dy = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) {
      const hx = pts[i + 1].x - pts[i].x, hy = pts[i + 1].y - pts[i].y;
      dx.push(hx); dy.push(hy);
      m.push(hx === 0 ? 0 : hy / hx);
    }
    t.push(m[0]);
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) t.push(0);
      else {
        const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        t.push((w1 + w2) / (w1 / m[i - 1] + w2 / m[i]));
      }
    }
    t.push(m[m.length - 1]);
    for (let i = 0; i < n - 1; i++) {
      const x0 = pts[i].x, y0 = pts[i].y, x1 = pts[i + 1].x, y1 = pts[i + 1].y, dxc = dx[i] / 3;
      ctx.bezierCurveTo(x0 + dxc, y0 + t[i] * dxc, x1 - dxc, y1 - t[i + 1] * dxc, x1, y1);
    }
  };

  /* Grille horizontale + libellé de l'axe Y */
  NC.drawYGrid = function (ctx, plot, scale, fmt, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = NC.font(11, 500); ctx.fillStyle = NC.COLORS.label;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    scale.ticks.forEach((v) => {
      const y = plot.y + plot.h - ((v - scale.min) / (scale.max - scale.min)) * plot.h;
      if (y < plot.y - 1 || y > plot.y + plot.h + 1) return;
      ctx.strokeStyle = opts.grid === false ? 'transparent' : NC.COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(plot.x, Math.round(y) + 0.5); ctx.lineTo(plot.x + plot.w, Math.round(y) + 0.5); ctx.stroke();
      ctx.fillStyle = NC.COLORS.label;
      ctx.fillText(fmt ? fmt(v) : String(v), plot.x - 8, y);
    });
    ctx.restore();
  };
  /* Grille verticale */
  NC.drawXGrid = function (ctx, plot, scale, fmt, opts) {
    opts = opts || {};
    ctx.save();
    ctx.strokeStyle = NC.COLORS.grid; ctx.lineWidth = 1;
    scale.ticks.forEach((v) => {
      const x = plot.x + ((v - scale.min) / (scale.max - scale.min)) * plot.w;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
    });
    ctx.restore();
  };
  /* Libellés de l'axe X, avec mise en évidence de l'index actif */
  NC.drawXLabels = function (ctx, plot, labels, xOf, opts) {
    opts = opts || {};
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const every = opts.every || 1;
    labels.forEach((l, i) => {
      if (i % every !== 0 && i !== labels.length - 1) return;
      const active = opts.activeIndex === i;
      ctx.font = NC.font(active ? 11.5 : 11, active ? 700 : 500);
      ctx.fillStyle = active ? NC.COLORS.title : NC.COLORS.label;
      ctx.fillText(l, xOf(i), plot.y + plot.h + 9);
      if (active) {
        ctx.beginPath();
        ctx.fillStyle = NC.COLORS.primary;
        ctx.arc(xOf(i), plot.y + plot.h + 24, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  };
  /* Ligne de seuil en pointillé + étiquette flottante */
  NC.dashedLine = function (ctx, x1, y1, x2, y2, color, label, align) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.font = NC.font(10, 700);
      const tw = ctx.measureText(label).width + 12;
      const lx = align === 'right' ? x2 - tw : align === 'center' ? (x1 + x2) / 2 - tw / 2 : x1 + 2;
      const ly = y1 - 16;
      ctx.fillStyle = color;
      NC.roundRect(ctx, lx, ly, tw, 16, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + 6, ly + 8.5);
    }
    ctx.restore();
  };
  /* Dégradé vertical (aire sous courbe) : couleur opaque → transparent */
  NC.vGradient = function (ctx, y0, y1, color, a0, a1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, NC.hexA(color, a0));
    g.addColorStop(1, NC.hexA(color, a1));
    return g;
  };
  /* Point de courbe : cercle 5 px + halo 12 px au survol */
  NC.point = function (ctx, x, y, color, hoverT, r) {
    const base = r || 5;
    if (hoverT) {
      ctx.beginPath();
      ctx.fillStyle = NC.hexA(color, 0.16 * hoverT);
      ctx.arc(x, y, 12 * (0.6 + 0.4 * hoverT), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = NC.hexA(color, 0.28 * hoverT);
      ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
    ctx.arc(x, y, base + (hoverT || 0) * 1.6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  };
  /* Texte tronqué avec ellipse */
  NC.ellipsis = function (ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  };

  /* ---------------------------------------------------------------------
   * IntersectionObserver partagé : l'animation d'entrée se déclenche la
   * première fois que le graphique devient visible au scroll.
   * ------------------------------------------------------------------- */
  const ioTargets = new Map();
  const io = 'IntersectionObserver' in global
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          const ch = ioTargets.get(e.target);
          if (!ch) return;
          ch.visible = e.isIntersecting;
          if (e.isIntersecting && ch.pending) ch.play();
        });
      }, { threshold: 0.15 })
    : null;

  /* Ordonnanceur : un seul passage rAF par frame, quel que soit le nombre
   * de graphiques à redessiner. */
  const dirty = new Set();
  let rafId = 0;
  function flush(now) {
    rafId = 0;
    const list = Array.from(dirty); dirty.clear();
    list.forEach((ch) => ch._frame(now));
  }
  function schedule(ch) { dirty.add(ch); if (!rafId) rafId = requestAnimationFrame(flush); }

  /* =======================================================================
   * Classe NC.Chart
   *   host : conteneur (position:relative, hauteur définie en CSS)
   *   def  : { draw(ch, ctx, W, H, p), onClick?(hit, ch) }
   * ===================================================================== */
  class Chart {
    constructor(host, def) {
      this.host = host;
      this.def = def;
      this.canvas = document.createElement('canvas');
      this.canvas.setAttribute('role', 'img');
      this.canvas.setAttribute('aria-label', (def && def.label) || 'Graphique');
      this.ctx = this.canvas.getContext('2d');
      this.tip = document.createElement('div');
      this.tip.className = 'nc-tooltip';
      host.appendChild(this.canvas);
      host.appendChild(this.tip);
      this.W = 0; this.H = 0; this.dpr = 1;
      this.p = 0;                 // progression d'animation 0 → 1
      this.hover = null;          // clé de l'élément survolé
      this.hoverT = 0;            // progression du halo de survol
      this.hits = [];             // zones interactives (remplies pendant draw)
      this.hidden = new Set();    // séries masquées via la légende
      this.visible = false;
      this.pending = true;
      this.animStart = 0;
      this.hoverStart = 0;
      this.data = null;
      /* Espace horizontal disponible au-delà du canvas (le tooltip peut
       * déborder dans la marge de la card : les libellés longs restent lisibles). */
      this.padX = (def && def.padX) || 0;

      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(host);
      if (io) { ioTargets.set(host, this); io.observe(host); } else { this.visible = true; }

      this.canvas.addEventListener('pointermove', (e) => this._onMove(e));
      this.canvas.addEventListener('pointerleave', () => this._setHover(null));
      this.canvas.addEventListener('click', (e) => {
        const hit = this._hitAt(e);
        if (hit && this.def.onClick) this.def.onClick(hit, this);
      });
    }

    /* Nouvelles données : réanimation complète (ou rendu immédiat si instant) */
    setData(data, opts) {
      this.data = data;
      this.hover = null;
      this._tipKey = null;
      this.tip.classList.remove('on');
      if (opts && opts.instant) { this.p = 1; this.render(); return; }
      this.pending = true;
      if (this.visible && this.W > 0) this.play(); else this.render();
    }
    play() { this.pending = false; this.animStart = performance.now(); this.p = 0; schedule(this); }
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
        const t = NC.clamp((now - this.animStart) / NC.ANIM_MS, 0, 1);
        this.p = t;
        if (t < 1) again = true; else this.animStart = 0;
      }
      if (this.hoverStart) {
        const t = NC.clamp((now - this.hoverStart) / NC.HOVER_MS, 0, 1);
        this.hoverT = NC.ease(t);
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
      catch (err) { console.error('[NutriChild] rendu graphique :', err); }
    }

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

    /* Tooltip : card blanche, ombre portée, liseré gauche 3 px couleur série */
    _showTip(hit, e) {
      const t = hit.tip;
      if (this._tipKey !== hit.key) {
        this._tipKey = hit.key;
        let html = '<div class="nc-tip-title">' + NC.escape(t.title) + '</div>';
        if (t.sub) html += '<div class="nc-tip-sub">' + NC.escape(t.sub) + '</div>';
        (t.rows || []).forEach((r) => {
          html += '<div class="nc-tip-row">' + (r.color ? '<i style="background:' + r.color + '"></i>' : '') +
            '<span>' + NC.escape(r.label) + '</span><b>' + NC.escape(r.value) + '</b></div>';
        });
        if (t.note) html += '<div class="nc-tip-note">' + NC.escape(t.note) + '</div>';
        this.tip.innerHTML = html;
        this.tip.style.borderLeftColor = t.color || NC.COLORS.primary;
      }
      const r = this.canvas.getBoundingClientRect();
      const x = e ? e.clientX - r.left : hit.mx, y = e ? e.clientY - r.top : hit.my;
      const tw = this.tip.offsetWidth || 200, th = this.tip.offsetHeight || 70;
      let left = x + 16, top = y - th / 2;
      if (left + tw > this.W - 4) left = x - tw - 16;
      /* Si le tooltip ne tient toujours pas, on l'autorise à déborder dans la
       * marge de la card (padX) avant de revenir au bord gauche du canvas. */
      const maxLeft = Math.max(4, this.W + this.padX - tw - 4);
      if (left > maxLeft) left = maxLeft;
      if (left < 4) left = 4;
      top = NC.clamp(top, -10, this.H - th + 10);
      this.tip.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
      this.tip.classList.add('on');
    }

    destroy() {
      this._ro.disconnect();
      if (io) { io.unobserve(this.host); ioTargets.delete(this.host); }
      dirty.delete(this);
    }
  }
  NC.Chart = Chart;

  /* Registre des définitions de graphiques (rempli par les fichiers charts-*) */
  NC.charts = NC.charts || {};
  NC.registerChart = function (name, def) { NC.charts[name] = def; };

  /* Compteur animé (KPI) en requestAnimationFrame — 800 ms ease-out */
  NC.countUp = function (el, to, opts) {
    opts = opts || {};
    const from = el._ncVal || 0;
    const dec = opts.decimals || 0;
    const fmt = opts.format || ((v) => NC.fmtInt(v));
    const t0 = performance.now();
    if (el._ncRaf) cancelAnimationFrame(el._ncRaf);
    const step = (now) => {
      const t = NC.clamp((now - t0) / NC.ANIM_MS, 0, 1);
      const v = from + (to - from) * NC.ease(t);
      el.textContent = fmt(v) + (opts.suffix || '');
      if (t < 1) el._ncRaf = requestAnimationFrame(step);
      else { el._ncVal = to; el._ncRaf = 0; el.textContent = fmt(to) + (opts.suffix || ''); }
    };
    el._ncRaf = requestAnimationFrame(step);
  };

  /* Barre de progression animée (KPI 4 — Vitamine A) */
  NC.animateWidth = function (el, pct, ms) {
    const t0 = performance.now();
    const from = el._ncW || 0;
    if (el._ncRaf) cancelAnimationFrame(el._ncRaf);
    const step = (now) => {
      const t = NC.clamp((now - t0) / (ms || NC.ANIM_MS), 0, 1);
      const v = from + (pct - from) * NC.ease(t);
      el.style.width = v + '%';
      if (t < 1) el._ncRaf = requestAnimationFrame(step); else { el._ncW = pct; el._ncRaf = 0; }
    };
    el._ncRaf = requestAnimationFrame(step);
  };
})(window);
