/* =====================================================================
 * AgriNutri · Moteur Canvas 2D partagé (zéro framework)
 * ---------------------------------------------------------------------
 * - Rendu HiDPI (devicePixelRatio plafonné à 2) et redimensionnement via
 *   ResizeObserver, redessin groupé par requestAnimationFrame.
 * - Animation d'entrée de 800 ms (easeOutCubic) déclenchée par
 *   IntersectionObserver : elle ne démarre que lorsque la carte est visible.
 * - Survol : mise en surbrillance de l'élément ciblé, tooltip natif Canvas
 *   (carte blanche, ombre, bordure gauche 4 px à la couleur de la métrique).
 * - Utilitaires de dessin : courbes de Bézier cubiques lissées (Catmull-Rom),
 *   barres à coins supérieurs arrondis, grille d'axes, formatage français.
 *
 * Expose : window.AgriCore
 * Usage  : AgriCore.create(canvas, { height, render, hit, tip, onClick })
 * ===================================================================== */
(function () {
  'use strict';

  const CFG = { duration: 800 };

  /* Fonction d'atténuation : départ rapide, arrivée douce */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* Formatage nombre à la française (espace fine insécable comme séparateur) */
  function fmt(n, digits) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: digits == null ? 1 : digits, minimumFractionDigits: 0 });
  }

  /* Police Inter avec repli système */
  function font(size, weight) {
    return (weight || 500) + ' ' + size + 'px Inter, system-ui, -apple-system, Segoe UI, sans-serif';
  }

  /* Échelle linéaire d1→r1 (domaine → intervalle pixel) */
  function linear(d0, d1, r0, r1) {
    const span = (d1 - d0) || 1;
    return function (v) { return r0 + ((v - d0) / span) * (r1 - r0); };
  }

  /* Échelle « jolie » : retourne min, max et pas arrondis */
  function niceScale(min, max, count) {
    count = count || 5;
    const range = (max - min) || 1;
    const rough = range / count;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step: step };
  }

  /* Zone de tracé : marges t/r/b/l réservées aux axes */
  function plot(L, pad) {
    pad = Object.assign({ t: 16, r: 16, b: 30, l: 48 }, pad || {});
    return { x: pad.l, y: pad.t, w: Math.max(10, L.w - pad.l - pad.r), h: Math.max(10, L.h - pad.t - pad.b), pad: pad };
  }

  /* Chemin lisse passant par les points : Bézier cubiques (Catmull-Rom, tension 0.5) */
  function smoothPath(g, pts, tension, continuePath) {
    if (!pts.length) return;
    const t = tension == null ? 0.5 : tension;
    if (continuePath) g.lineTo(pts[0].x, pts[0].y);
    else g.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) * t / 3;
      const c1y = p1.y + (p2.y - p0.y) * t / 3;
      const c2x = p2.x - (p3.x - p1.x) * t / 3;
      const c2y = p2.y - (p3.y - p1.y) * t / 3;
      g.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }
  }

  /* Rectangle à coins supérieurs arrondis (rayon r, utilisé pour les barres) */
  function roundTop(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, Math.abs(h)));
    if (h <= 0 || r === 0) { g.rect(x, y, w, h); return; }
    g.moveTo(x, y + h);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h);
    g.closePath();
  }

  /* Barre horizontale : coins de droite arrondis (rayon r), gauche à angle droit */
  function barH(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, h / 2, w));
    if (w <= 0) { g.rect(x, y, 0, h); return; }
    g.moveTo(x, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x, y + h);
    g.closePath();
  }

  /* Rectangle arrondi complet (cartes du tooltip, chips, badges) */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* Grille horizontale + étiquettes d'axe Y */
  function gridY(g, pl, scale, fmtFn, color) {
    g.save();
    g.font = font(11, 500);
    g.fillStyle = color || '#94A3B8';
    g.strokeStyle = 'rgba(148,163,184,0.22)';
    g.lineWidth = 1;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    for (let v = scale.min; v <= scale.max + 1e-9; v += scale.step) {
      const y = pl.y + pl.h - ((v - scale.min) / ((scale.max - scale.min) || 1)) * pl.h;
      g.beginPath();
      g.moveTo(pl.x, Math.round(y) + 0.5);
      g.lineTo(pl.x + pl.w, Math.round(y) + 0.5);
      g.stroke();
      g.fillText(fmtFn ? fmtFn(v) : fmt(v, 1), pl.x - 8, y);
    }
    g.restore();
  }

  /* Libellé de l'axe X (mois, pays…) : retire des étiquettes si l'espace manque */
  function labelsX(g, labels, xs, y, color, maxStep) {
    g.save();
    g.font = font(11, 500);
    g.fillStyle = color || '#94A3B8';
    g.textAlign = 'center';
    g.textBaseline = 'top';
    const step = Math.max(1, Math.ceil(maxStep || 1));
    labels.forEach(function (lab, i) {
      if (i % step !== 0) return;
      g.fillText(lab, xs[i], y);
    });
    g.restore();
  }

  /* Tooltip Canvas natif : carte blanche, ombre prononcée, bordure gauche 4 px */
  function drawTooltip(g, L, pos, tip) {
    if (!tip || !tip.rows) return;
    g.save();
    const padX = 12, padY = 10, lineH = 17;
    g.font = font(12, 700);
    let maxW = g.measureText(tip.title || '').width;
    g.font = font(12, 500);
    tip.rows.forEach(function (r) {
      const wL = g.measureText(r.k + ' : ' + r.v).width;
      if (wL > maxW) maxW = wL;
    });
    const w = maxW + padX * 2 + 6;
    const h = padY * 2 + lineH * (tip.rows.length + (tip.title ? 1 : 0));
    let x = pos.x + 14, y = pos.y - h / 2;
    if (x + w > L.w - 4) x = pos.x - w - 14;
    if (y < 4) y = 4;
    if (y + h > L.h - 4) y = L.h - h - 4;
    // Ombre prononcée
    g.shadowColor = 'rgba(15,23,42,0.22)';
    g.shadowBlur = 18;
    g.shadowOffsetY = 6;
    g.fillStyle = '#FFFFFF';
    roundRect(g, x, y, w, h, 10);
    g.fill();
    g.shadowColor = 'transparent';
    g.shadowBlur = 0;
    g.shadowOffsetY = 0;
    // Bordure gauche 4 px couleur de la métrique
    g.save();
    roundRect(g, x, y, w, h, 10);
    g.clip();
    g.fillStyle = tip.color || '#15803D';
    g.fillRect(x, y, 4, h);
    g.restore();
    // Contenu
    let cy = y + padY;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    if (tip.title) {
      g.font = font(12, 700);
      g.fillStyle = '#0F172A';
      g.fillText(tip.title, x + padX + 6, cy + lineH / 2);
      cy += lineH;
    }
    tip.rows.forEach(function (r) {
      g.font = font(12, 500);
      g.fillStyle = '#64748B';
      g.fillText(r.k, x + padX + 6, cy + lineH / 2);
      g.font = font(12, 700);
      g.fillStyle = r.c || '#334155';
      g.textAlign = 'right';
      g.fillText(r.v, x + w - padX, cy + lineH / 2);
      g.textAlign = 'left';
      cy += lineH;
    });
    g.restore();
  }

  /* Classe moteur : un canvas = une instance */
  class AgriChart {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.opts = Object.assign({ height: 280 }, opts || {});
      const _rawCtx = canvas.getContext('2d');
    this.ctx = window.NutriSectionsI18N ? window.NutriSectionsI18N.wrapCtx(_rawCtx) : _rawCtx;
      this.L = { w: 0, h: 0 };
      this.hover = null;
      this.pos = null;
      this.progress = 0;
      this.started = false;
      this.animating = false;
      this.rafDraw = 0;
      this.rafAnim = 0;
      this.disposed = false;
      this.visible = false;

      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = this.opts.height + 'px';
      canvas.style.cursor = this.opts.hit ? 'pointer' : 'default';
      canvas.style.touchAction = 'pan-y';

      const self = this;
      // Redimensionnement : ResizeObserver (élément sans taille = carte masquée, ignoré)
      if (typeof ResizeObserver !== 'undefined') {
        this.ro = new ResizeObserver(function () {
          self.resize();
          // Carte devenue visible et mesurable : on lance l'animation si elle ne l'a pas encore été
          if (self.visible && !self.started && self.L.w > 0) { self.started = true; self.animate(); }
          else self.requestDraw();
        });
        this.ro.observe(canvas);
      }
      // Entrée dans le viewport : lancement de l'animation de 800 ms
      if (typeof IntersectionObserver !== 'undefined') {
        this.io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            self.visible = e.isIntersecting;
            if (e.isIntersecting && !self.started && self.L.w > 0) { self.started = true; self.animate(); }
          });
        }, { threshold: 0.15 });
        this.io.observe(canvas);
      } else {
        this.started = true;
      }
      // Interactions : survol, sortie, clic
      canvas.addEventListener('pointermove', function (ev) { self._onMove(ev); });
      canvas.addEventListener('pointerleave', function () { self.hover = null; self.pos = null; self.requestDraw(); });
      canvas.addEventListener('click', function (ev) {
        if (!self.opts.onClick || self.hover === null) return;
        self.opts.onClick(self.hover, self);
      });
      this.resize();
    }

    /* Recalcule la taille logique et HiDPI à partir de la boîte CSS réelle */
    resize() {
      const cssW = this.canvas.clientWidth;
      const cssH = this.opts.height;
      if (!cssW) { this.L = { w: 0, h: 0 }; return; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.L = { w: cssW, h: cssH };
    }

    /* Redessin groupé sur requestAnimationFrame (plusieurs demandes = un seul rendu) */
    requestDraw() {
      if (this.rafDraw || this.disposed) return;
      const self = this;
      this.rafDraw = requestAnimationFrame(function () {
        self.rafDraw = 0;
        self.draw(self.animating ? self.progress : 1);
      });
    }

    /* Animation d'entrée ou de mise à jour : progression 0 → 1 en `duration` ms */
    animate(duration) {
      const self = this;
      const dur = duration || CFG.duration;
      if (this.rafAnim) cancelAnimationFrame(this.rafAnim);
      this.animating = true;
      const t0 = performance.now();
      const step = function (now) {
        const t = Math.min(1, (now - t0) / dur);
        self.progress = easeOutCubic(t);
        self.draw(self.progress);
        if (t < 1 && !self.disposed) {
          self.rafAnim = requestAnimationFrame(step);
        } else {
          self.animating = false;
          self.rafAnim = 0;
          self.progress = 1;
        }
      };
      this.rafAnim = requestAnimationFrame(step);
    }

    /* Mise à jour des données : on relance l'animation si la carte est déjà visible */
    update(opts) {
      if (opts) Object.assign(this.opts, opts);
      this.resize();
      if (this.started && this.L.w > 0) this.animate(600);
      else this.requestDraw();
    }

    /* Rendu complet : fond, contenu du graphique (avec progression), tooltip */
    draw(p) {
      if (this.disposed) return;
      const L = this.L;
      if (!L.w) return;
      const g = this.ctx;
      g.clearRect(0, 0, L.w, L.h);
      if (this.opts.render) this.opts.render(g, L, p == null ? 1 : p, this.hover, this);
      if (this.hover !== null && this.pos && this.opts.tip) {
        drawTooltip(g, L, this.pos, this.opts.tip(this.hover, L));
      }
    }

    /* Survol : recherche de l'élément ciblé via `hit` puis redessin si changement */
    _onMove(ev) {
      const rect = this.canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      this.pos = { x: x, y: y };
      const idx = this.opts.hit ? this.opts.hit(x, y, this.L, this) : null;
      if (idx !== this.hover || this.opts.tip) {
        this.hover = idx;
        this.requestDraw();
      }
    }

    dispose() {
      this.disposed = true;
      if (this.ro) this.ro.disconnect();
      if (this.io) this.io.disconnect();
      if (this.rafAnim) cancelAnimationFrame(this.rafAnim);
    }
  }

  /* Légende Canvas horizontale : pastilles + libellés, retourne la largeur utilisée */
  function legend(g, items, x, y) {
    g.save();
    g.font = font(11, 600);
    g.textBaseline = 'middle';
    let cx = x;
    items.forEach(function (it) {
      g.fillStyle = it.color;
      if (it.outline) { g.strokeStyle = it.color; g.lineWidth = 2; g.strokeRect(cx, y - 4, 10, 8); }
      else { roundRect(g, cx, y - 4, 10, 8, 2); g.fill(); }
      g.fillStyle = '#334155';
      g.fillText(it.label, cx + 15, y + 0.5);
      cx += 15 + g.measureText(it.label).width + 16;
    });
    g.restore();
    return cx - x;
  }

  /* Mount : enveloppe qui sépare le moteur (canvas) des données (set) — évite de recréer les observateurs */
  function mount(canvas, opts) {
    const st = { data: null };
    const chart = new AgriChart(canvas, Object.assign({}, opts, {
      render: function (g, L, p, hover) { if (st.data && opts.render) opts.render(g, L, p, hover, st.data); },
      hit: opts.hit ? function (x, y, L) { return st.data ? opts.hit(x, y, L, st.data) : null; } : null,
      tip: opts.tip ? function (i, L) { return st.data ? opts.tip(i, L, st.data) : null; } : null,
      onClick: opts.onClick ? function (i) { if (st.data) opts.onClick(i, st.data); } : null
    }));
    return {
      chart: chart,
      set: function (d) { st.data = d; chart.update(); },
      data: function () { return st.data; },
      dispose: function () { chart.dispose(); }
    };
  }

  window.AgriCore = {
    create: function (canvas, opts) { return new AgriChart(canvas, opts); },
    mount: mount,
    legend: legend,
    easeOutCubic: easeOutCubic,
    fmt: fmt,
    font: font,
    linear: linear,
    niceScale: niceScale,
    plot: plot,
    smoothPath: smoothPath,
    roundTop: roundTop,
    barH: barH,
    roundRect: roundRect,
    gridY: gridY,
    labelsX: labelsX,
    drawTooltip: drawTooltip,
    duration: CFG.duration,
    /* Palette de référence (copie locale pour les modules de graphiques) */
    C: { primary: '#15803D', secondary: '#B45309', tertiary: '#0369A1', quaternary: '#A21CAF', success: '#16A34A', danger: '#DC2626', grey: '#94A3B8', ink: '#0F172A', muted: '#64748B', line: '#334155' }
  };
})();
