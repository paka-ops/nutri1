/* ============================================================================
 * NutriApp Santé · health-nutriapp-chart-core.js
 * Rôle : moteur Canvas 2D commun à tous les graphiques (aucune bibliothèque).
 *
 *  - Classe NH.Chart : rendu HiDPI, redimensionnement (ResizeObserver),
 *    animation d'entrée 800 ms ease-out (requestAnimationFrame), démarrage
 *    uniquement lorsque la carte entre dans le viewport (IntersectionObserver),
 *    survol avec halo 12 px, tooltip « card blanche + bordure 3 px », clic.
 *  - Hit-testing : chaque graphique déclare ses zones réactives via
 *    ch.hit({...}) pendant le dessin ; le moteur retrouve l'élément survolé.
 *  - Helpers de dessin : arrondis (rayon haut uniquement), courbes Bézier
 *    cubiques lisses (Catmull-Rom), grilles, textes, dégradés.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;

  /* Easing ease-out cubique : la progression ralentit en fin d'animation */
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* Conversion couleur hexadécimale → rgba */
  NH.rgba = function (hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  /* Échappement HTML (tooltips, tableaux) */
  NH.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Helpers de dessin (exposés dans NH.draw) ---------- */
  NH.draw = {
    /* Rectangle à coins arrondis ; topOnly = arrondi uniquement en haut (barres) */
    roundRect(ctx, x, y, w, h, r, topOnly) {
      r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
      ctx.beginPath();
      if (topOnly) {
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h);
        ctx.closePath();
      } else {
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
    },
    /* Courbe lisse passant par les points : Bézier cubiques (Catmull-Rom) */
    smooth(ctx, pts) {
      if (!pts.length) return;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
      }
    },
    /* Texte aligné avec police Inter */
    text(ctx, str, x, y, o) {
      o = o || {};
      ctx.save();
      ctx.font = (o.weight || 500) + ' ' + (o.size || 11) + 'px Inter, system-ui, sans-serif';
      ctx.fillStyle = o.color || NH.THEME.label;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.base || 'middle';
      ctx.fillText(String(str), x, y);
      ctx.restore();
    },
    /* Lignes de grille horizontales (#F1F5F9, 1 px) */
    gridY(ctx, x0, x1, y, dash) {
      ctx.save();
      ctx.strokeStyle = NH.THEME.grid;
      ctx.lineWidth = 1;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(x0, Math.round(y) + 0.5);
      ctx.lineTo(x1, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.restore();
    },
    /* Axe (trait #E2E8F0) */
    axis(ctx, x0, y0, x1, y1) {
      ctx.save();
      ctx.strokeStyle = NH.THEME.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 + 0.5, y0);
      ctx.lineTo(x1 + 0.5, y1);
      ctx.stroke();
      ctx.restore();
    },
    /* Point : cercle 5 px ; halo 12 px ajouté par le moteur au survol */
    dot(ctx, x, y, r, color, ring) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (ring) { ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); }
    }
  };

  /* =====================================================================
   * Classe Chart
   * ===================================================================== */
  class Chart {
    /* host : conteneur (hauteur fixée par CSS) ; opts :
     *  draw(ch, ctx, W, H, p) · legend : [{key,label,color}] · onClick(hit) ·
     *  height (fallback) · duration (ms) */
    constructor(host, opts) {
      this.host = host;
      this.opts = opts || {};
      this.view = null;          // vue courante (fournie par le contrôleur)
      this.hits = [];            // zones réactives du dernier rendu
      this.hover = null;         // élément survolé
      this.p = 0;                // progression d'animation 0 → 1
      this.series = {};          // visibilité des séries (légendes)
      (this.opts.legend || []).forEach((s) => { this.series[s.key] = true; });

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'hn-canvas';
      this.canvas.setAttribute('role', 'img');
      this.tip = document.createElement('div');
      this.tip.className = 'hn-tip';
      this.host.appendChild(this.canvas);
      this.host.appendChild(this.tip);
      this.ctx = this.canvas.getContext('2d');
      this.dpr = Math.min(2, global.devicePixelRatio || 1);
      this.W = 0; this.H = 0;

      this._raf = 0; this._anim = 0; this._t0 = 0; this._dur = this.opts.duration || 800;
      this._started = false;
      this._tick = this._tick.bind(this);
      this._frame = this._frame.bind(this);

      this.canvas.addEventListener('mousemove', (e) => this._move(e));
      this.canvas.addEventListener('mouseleave', () => this._leave());
      this.canvas.addEventListener('click', (e) => this._click(e));

      if (global.ResizeObserver) {
        this._ro = new ResizeObserver(() => this.resize(true));
        this._ro.observe(this.host);
      }
      if (global.IntersectionObserver) {
        /* Animation d'entrée au scroll : démarre à la première visibilité */
        this._io = new IntersectionObserver((entries) => {
          if (entries[0] && entries[0].isIntersecting && !this._started) {
            this._started = true;
            this.animate(this._dur);
          }
        }, { threshold: 0.12 });
        this._io.observe(this.host);
      } else {
        this._started = true;
      }
      this.resize(false);
    }

    /* Visibilité d'une série (légendes) */
    on(key) { return this.series[key] !== false; }
    toggle(key) { this.series[key] = !this.on(key); this.animate(600); }

    /* Mise à jour de la vue : ré-animation fluide */
    setView(view) {
      this.view = view;
      if (this._started) this.animate(this._dur);
    }

    /* Dimensionnement HiDPI */
    resize(redraw) {
      const W = Math.max(0, Math.floor(this.host.clientWidth));
      const H = Math.max(0, Math.floor(this.host.clientHeight || this.opts.height || 260));
      if (W === this.W && H === this.H && redraw !== false) return;
      this.W = W; this.H = H;
      this.canvas.width = Math.round(W * this.dpr);
      this.canvas.height = Math.round(H * this.dpr);
      this.canvas.style.width = W + 'px';
      this.canvas.style.height = H + 'px';
      if (redraw !== false) this.requestDraw();
    }

    /* Lance l'animation d'entrée (de 0 à 1) */
    animate(dur) {
      if (!this.view) return;
      this._dur = dur || this._dur;
      if (this._anim) { this._t0 = performance.now() - this.p * this._dur; return; }
      this.p = 0;
      this._t0 = performance.now();
      this._anim = requestAnimationFrame(this._tick);
    }

    _tick(now) {
      const t = Math.min(1, (now - this._t0) / this._dur);
      this.p = easeOut(t);
      this._render();
      this._anim = t < 1 ? requestAnimationFrame(this._tick) : 0;
    }

    /* Redessin coalescé (une seule frame par cycle rAF) */
    requestDraw() {
      if (this._raf || this._anim) return;
      this._raf = requestAnimationFrame(this._frame);
    }
    _frame() { this._raf = 0; this._render(); }

    _render() {
      const ctx = this.ctx;
      const W = this.W, H = this.H;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      this.hits = [];
      if (this.view && this.opts.draw && W > 0 && H > 0) {
        this.opts.draw(this, ctx, W, H, this.p);
      }
      /* Halo 12 px sur le point survolé */
      const h = this.hover;
      if (h && h.px != null && this.p > 0.5) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(h.px, h.py, 12, 0, Math.PI * 2);
        ctx.fillStyle = NH.rgba(h.color || NH.THEME.primary, 0.18);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(h.px, h.py, 5, 0, Math.PI * 2);
        ctx.fillStyle = h.color || NH.THEME.primary;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        ctx.restore();
      }
    }

    /* ---- Hit-testing ---- */
    /* Enregistre une zone réactive pendant le dessin.
     * Point : { px, py, r, … } · Colonne/barre : { x0, y0, x1, y1, … }
     * Champs d'info : title, rows [[label, valeur, couleur?]], color */
    hit(h) { this.hits.push(h); return h; }

    _find(x, y) {
      let best = null, bd = Infinity;
      for (const h of this.hits) {
        if (h.px != null) {
          const d = Math.hypot(x - h.px, y - h.py);
          if (d <= (h.r || 9) + 4 && d < bd) { best = h; bd = d; }
        }
      }
      if (best) return best;
      for (const h of this.hits) {
        if (h.px == null && h.x0 != null && x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) {
          const d = Math.abs(x - (h.x0 + h.x1) / 2);
          if (d < bd) { best = h; bd = d; }
        }
      }
      return best;
    }

    _move(e) {
      const r = this.canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const h = this._find(x, y);
      if (h !== this.hover) {
        this.hover = h;
        this.canvas.style.cursor = h && h.click ? 'pointer' : 'default';
        this._showTip(h, x, y);
        this.requestDraw();
      } else if (h) {
        this._placeTip(x, y);
      }
    }

    _leave() {
      this.hover = null;
      this.tip.classList.remove('on');
      this.requestDraw();
    }

    _click(e) {
      if (this.opts.onClick) {
        const r = this.canvas.getBoundingClientRect();
        const h = this._find(e.clientX - r.left, e.clientY - r.top);
        if (h) this.opts.onClick(h, this);
      }
    }

    /* Tooltip : card blanche, ombre, bordure gauche 3 px couleur primaire */
    _showTip(h, x, y) {
      if (!h || !h.title) { this.tip.classList.remove('on'); return; }
      const color = h.color || NH.THEME.primary;
      const rows = (h.rows || []).map((rw) =>
        '<div class="hn-tip-row"><span>' + (rw[2] ? '<i class="hn-dot" style="background:' + rw[2] + '"></i>' : '') + NH.esc(rw[0]) +
        '</span><b>' + NH.esc(rw[1]) + '</b></div>').join('');
      this.tip.style.borderLeftColor = color;
      this.tip.innerHTML = '<div class="hn-tip-title">' + NH.esc(h.title) + '</div>' + rows +
        (h.note ? '<div class="hn-tip-note">' + NH.esc(h.note) + '</div>' : '');
      this.tip.classList.add('on');
      this._placeTip(x, y);
    }

    _placeTip(x, y) {
      const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
      let tx = x + 16, ty = y - th / 2;
      if (tx + tw > this.W - 4) tx = x - tw - 16;
      ty = NH.clamp(ty, 4, Math.max(4, this.H - th - 4));
      this.tip.style.transform = 'translate(' + Math.max(4, tx) + 'px,' + ty + 'px)';
    }

    /* Accès au contexte de dessin pour les graphiques (taille utile) */
    get size() { return { W: this.W, H: this.H }; }
  }

  NH.Chart = Chart;
  NH.charts = NH.charts || {};   // fonctions de dessin, remplies par charts/*.js
})(typeof window !== 'undefined' ? window : globalThis);
