/* ============================================================================
 * UNICEF NutriChildApp · Moteur Canvas partagé (Canvas 2D pur, zéro librairie)
 * ----------------------------------------------------------------------------
 * - Rendu HiDPI (devicePixelRatio plafonné à 2) et redimensionnement par
 *   ResizeObserver.
 * - Animation d'entrée de 800 ms en ease-out, déclenchée par
 *   IntersectionObserver quand le graphique entre dans la vue.
 * - Boucle requestAnimationFrame : une seule frame par graphique et par
 *   changement, sans recalcul inutile hors animation.
 * - Zones de survol (rectangles, cercles, arcs) : info-bulle, halo, clic.
 * - Légendes dessinées sur le canvas : pastilles 8 px, clic = masquer/afficher.
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = (global.UNICEFNutriChild = global.UNICEFNutriChild || {});
  const TAU = Math.PI * 2;

  /** Utilitaires de dessin et de formatage partagés par les graphiques. */
  const U = {
    easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    },

    clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    },

    /** Échappe le HTML des info-bulles. */
    esc(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /** Mélange deux couleurs hexadécimales (t = 0 → a, t = 1 → b). */
    mix(a, b, t) {
      const pa = U.hex(a);
      const pb = U.hex(b);
      const k = U.clamp(t, 0, 1);
      const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
      return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    },

    /** Convertit #RRGGBB en tableau [r, g, b]. */
    hex(color) {
      const m = /^#?([0-9a-f]{6})$/i.exec(color);
      if (!m) return [100, 116, 139];
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },

    /** Couleur hexadécimale → rgba avec opacité. */
    rgba(color, alpha) {
      const c = U.hex(color);
      return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
    },

    /** Graduations « rondes » entre min et max. */
    niceTicks(min, max, count) {
      const span = Math.max(max - min, 1e-9);
      const rough = span / Math.max(count, 1);
      const mag = Math.pow(10, Math.floor(Math.log10(rough)));
      const norm = rough / mag;
      const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
      const start = Math.ceil(min / step) * step;
      const ticks = [];
      for (let v = start; v <= max + step * 0.001; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
      return ticks;
    },

    /** Rectangle arrondi (tous les coins). */
    roundRect(ctx, x, y, w, h, r) {
      const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    },

    /** Barre arrondie uniquement en haut (rayon 6 px par défaut). */
    topBar(ctx, x, y, w, h, r) {
      if (w <= 0 || h <= 0) return;
      const rr = Math.min(r == null ? 6 : r, w / 2, h);
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + rr);
      ctx.arcTo(x, y, x + rr, y, rr);
      ctx.lineTo(x + w - rr, y);
      ctx.arcTo(x + w, y, x + w, y + rr, rr);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    },

    /** Texte avec police Inter (fallback système). */
    text(ctx, str, x, y, o) {
      const opt = o || {};
      ctx.save();
      ctx.font = (opt.weight || 500) + ' ' + (opt.size || 11) + 'px Inter, system-ui, sans-serif';
      ctx.fillStyle = opt.color || U.colors.muted;
      ctx.textAlign = opt.align || 'left';
      ctx.textBaseline = opt.baseline || 'middle';
      if (opt.maxWidth) ctx.fillText(String(str), x, y, opt.maxWidth);
      else ctx.fillText(String(str), x, y);
      ctx.restore();
    },

    /** Mesure la largeur d'un texte dans la police donnée. */
    measure(ctx, str, size, weight) {
      ctx.save();
      ctx.font = (weight || 500) + ' ' + (size || 11) + 'px Inter, system-ui, sans-serif';
      const w = ctx.measureText(String(str)).width;
      ctx.restore();
      return w;
    },

    /** Trait (grille, axes, repères) avec pointillés optionnels. */
    line(ctx, x1, y1, x2, y2, color, width, dash) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = color || U.colors.axis;
      ctx.lineWidth = width || 1;
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.restore();
    },

    /** Pastille ronde (légende, points). */
    dot(ctx, x, y, r, fill, stroke, lw) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0, r), 0, TAU);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
    },

    /** Contenu HTML d'une info-bulle : titre + lignes libellé / valeur. */
    tip(title, rows) {
      const body = (rows || []).map((r) =>
        '<div class="uni-tip-row"><span>' + U.esc(r[0]) + '</span><b>' + U.esc(r[1]) + '</b></div>'
      ).join('');
      return '<div class="uni-tip-title">' + U.esc(title) + '</div>' + body;
    }
  };

  /** Palette de texte et de trait de la charte (accès rapide). */
  U.colors = {
    primary: '#1CABE2', secondary: '#80BD41', tertiary: '#F26A21', quaternary: '#DDA63A',
    danger: '#E5243B', navy: '#002952', text: '#1E293B', body: '#64748B', muted: '#94A3B8',
    grid: '#F1F5F9', axis: '#E2E8F0'
  };
  NS.U = U;

  /**
   * Info-bulle partagée : une seule par composant, positionnée dans le
   * conteneur racine (position: relative).
   */
  class Tooltip {
    constructor(host) {
      this.host = host;
      this.el = document.createElement('div');
      this.el.className = 'uni-tip';
      this.el.setAttribute('role', 'tooltip');
      host.appendChild(this.el);
    }

    show(html, clientX, clientY, color) {
      const r = this.host.getBoundingClientRect();
      this.el.innerHTML = html;
      this.el.style.borderLeftColor = color || U.colors.primary;
      this.el.classList.add('on');
      const tw = this.el.offsetWidth;
      const th = this.el.offsetHeight;
      let x = clientX - r.left + 16;
      let y = clientY - r.top + 16;
      if (x + tw > r.width - 8) x = clientX - r.left - tw - 16;
      if (y + th > r.height - 8) y = clientY - r.top - th - 16;
      this.el.style.transform = 'translate(' + Math.max(8, x) + 'px,' + Math.max(8, y) + 'px)';
    }

    hide() {
      this.el.classList.remove('on');
    }
  }
  NS.Tooltip = Tooltip;

  /** Test d'appartenance d'un point à une zone de survol. */
  function hitContains(h, x, y) {
    if (h.type === 'rect') return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
    if (h.type === 'circle') return (x - h.x) * (x - h.x) + (y - h.y) * (y - h.y) <= (h.r + 3) * (h.r + 3);
    if (h.type === 'arc') {
      const dx = x - h.cx;
      const dy = y - h.cy;
      const d = Math.hypot(dx, dy);
      if (d < h.r0 || d > h.r1) return false;
      let rel = (Math.atan2(dy, dx) - h.a0) % TAU;
      if (rel < 0) rel += TAU;
      return rel <= h.span;
    }
    return false;
  }

  /**
   * Classe de base des graphiques. Une sous-classe implémente :
   *   select(view)              → renvoie la tranche de données utile au graphique
   *   render(ctx, W, H, p)      → dessine avec la progression p (0 → 1)
   * et peut ajouter des zones de survol via this.hit({...}).
   */
  class Chart {
    /**
     * @param {HTMLCanvasElement} canvas  canvas placé dans un conteneur de taille fixe
     * @param {object} opts  { tip: Tooltip, height: px (sinon hauteur du conteneur) }
     */
    constructor(canvas, opts) {
      const o = opts || {};
      this.canvas = canvas;
      this.box = canvas.parentElement;
      this.ctx = canvas.getContext('2d');
      this.tip = o.tip || null;
      this.fixedHeight = o.height || 0;
      this.data = null;
      this.p = 0;
      this.animating = false;
      this.duration = 800;
      this.t0 = null;
      this.frameId = 0;
      this.visible = false;
      this.width = 0;
      this.cssHeight = 0;
      this.dpr = 1;
      this.hits = [];
      this.hover = -1;
      this.hidden = {};

      canvas.addEventListener('pointermove', (e) => this._onMove(e));
      canvas.addEventListener('pointerleave', () => this._onLeave());
      canvas.addEventListener('click', (e) => this._onClick(e));

      this.ro = new ResizeObserver(() => this._resize());
      this.ro.observe(this.box);
      this.io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          this.visible = en.isIntersecting;
          // Animation d'entrée au premier affichage (ou après un changement hors écran).
          if (this.visible && this.data && this.p < 1 && !this.animating) this.play(this.duration);
        });
      }, { threshold: 0.12 });
      this.io.observe(canvas);
    }

    /** Surcharge : tranche du modèle utile à ce graphique. */
    select(view) { return view; }

    /** Surcharge : dessin. */
    render() {}

    /** Met à jour les données et relance l'animation si le graphique est visible. */
    update(view) {
      this.data = this.select(view);
      this.play(this.duration);
    }

    /** Relance l'animation de 0 à 1 (ou dessine directement si hors écran). */
    play(duration) {
      this.duration = duration || 800;
      this.p = 0;
      if (!this.data || !this.width || !this.visible) {
        this.animating = false;
        this.draw();
        return;
      }
      this.animating = true;
      this.t0 = null;
      this._request();
    }

    /** Animation (masquer/afficher une série) : relance rapide sans remise à zéro complète. */
    toggle(key) {
      this.hidden[key] = !this.hidden[key];
      this.hover = -1;
      this.play(600);
    }

    /** Ajoute une zone de survol cliquable/infobulle, renvoie son index. */
    hit(zone) {
      this.hits.push(zone);
      return this.hits.length - 1;
    }

    /** Légende horizontale cliquable (pastilles 8 px + texte). Renvoie la largeur utilisée. */
    legend(ctx, items, x, y) {
      let cx = x;
      items.forEach((it) => {
        const off = !!this.hidden[it.key];
        ctx.save();
        ctx.globalAlpha = off ? 0.35 : 1;
        U.dot(ctx, cx + 4, y, 4, it.color);
        ctx.restore();
        U.text(ctx, it.label, cx + 13, y, { size: 11, weight: 500, color: U.colors.body });
        const w = 13 + U.measure(ctx, it.label, 11, 500) + 16;
        this.hit({
          type: 'rect', x: cx - 2, y: y - 9, w: w, h: 18,
          tip: U.tip(it.label, [['État', off ? 'masquée · cliquer pour afficher' : 'affichée · cliquer pour masquer']]),
          color: it.color,
          onClick: () => this.toggle(it.key)
        });
        cx += w;
      });
      return cx - x;
    }

    /** Cadre de dessin (zone de tracé) avec marges standard. */
    plotArea(W, H, m) {
      const margin = Object.assign({ top: 16, right: 16, bottom: 28, left: 44 }, m || {});
      return { x: margin.left, y: margin.top, w: W - margin.left - margin.right, h: H - margin.top - margin.bottom };
    }

    /** Dessin global : efface, prépare le HiDPI et délègue à render(). */
    draw() {
      if (!this.width || !this.cssHeight) return;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.cssHeight);
      this.hits = [];
      if (this.data) this.render(ctx, this.width, this.cssHeight, this.p);
    }

    _request() {
      if (!this.frameId) this.frameId = requestAnimationFrame((ts) => this._frame(ts));
    }

    _frame(ts) {
      this.frameId = 0;
      if (this.animating) {
        if (this.t0 == null) this.t0 = ts;
        const t = Math.min(1, (ts - this.t0) / this.duration);
        this.p = U.easeOutCubic(t);
        if (t >= 1) this.animating = false;
      }
      this.draw();
      if (this.animating) this._request();
    }

    _resize() {
      const w = Math.floor(this.box.clientWidth);
      const h = this.fixedHeight || Math.floor(this.box.clientHeight);
      if (!w || !h) {
        this.width = 0;
        return;
      }
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      if (w === this.width && h === this.cssHeight && dpr === this.dpr) return;
      this.width = w;
      this.cssHeight = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      if (this.visible && this.data && this.p === 0 && !this.animating) this.play(this.duration);
      else this.draw();
    }

    _pointer(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY };
    }

    _onMove(e) {
      const pt = this._pointer(e);
      let idx = -1;
      for (let i = this.hits.length - 1; i >= 0; i--) {
        if (hitContains(this.hits[i], pt.x, pt.y)) { idx = i; break; }
      }
      if (idx !== this.hover) {
        this.hover = idx;
        this.draw();
      }
      const hit = idx >= 0 ? this.hits[idx] : null;
      this.canvas.style.cursor = hit && hit.onClick ? 'pointer' : 'default';
      // L'info-bulle peut être une chaîne HTML ou une fonction du pointeur (survol par colonne).
      const html = hit ? (typeof hit.tip === 'function' ? hit.tip(pt) : hit.tip) : null;
      if (html && this.tip) this.tip.show(html, pt.cx, pt.cy, hit.color);
      else if (this.tip) this.tip.hide();
    }

    _onLeave() {
      if (this.tip) this.tip.hide();
      if (this.hover !== -1) {
        this.hover = -1;
        this.draw();
      }
    }

    _onClick(e) {
      const pt = this._pointer(e);
      for (let i = this.hits.length - 1; i >= 0; i--) {
        if (hitContains(this.hits[i], pt.x, pt.y)) {
          if (this.hits[i].onClick) this.hits[i].onClick();
          return;
        }
      }
    }

    /** Libère les observateurs (si le composant est retiré du DOM). */
    destroy() {
      this.ro.disconnect();
      this.io.disconnect();
    }
  }

  NS.Chart = Chart;
  NS.charts = NS.charts || {};
})(window);
