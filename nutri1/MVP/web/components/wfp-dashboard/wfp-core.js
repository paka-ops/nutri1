/* ============================================================================
 * WFP NutriTracker · wfp-core.js
 * Noyau commun a tous les graphiques Canvas (API Canvas pure, zero librairie) :
 *  - palette PAM, formats, easing, generateur d'animation partage (rAF) ;
 *  - helpers de dessin (courbes de Bezier lissees, barres arrondies en haut,
 *    texte, degrade) ;
 *  - classe de base WFP.BaseChart : HiDPI, redimensionnement (ResizeObserver),
 *    survol + tooltip, legendes cliquables (toggle des series), animation d'entree
 *    800ms ease-out, declenchee seulement quand le graphique devient visible
 *    (IntersectionObserver gere dans wfp-dashboard.js).
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP = global.WFP || {};

  // Dossier du composant (utilise pour charger wfp-dashboard.css dans le Shadow DOM)
  WFP.base = (function () {
    const src = document.currentScript && document.currentScript.src;
    return src ? src.replace(/[^\/]*$/, '') : 'components/wfp-dashboard/';
  })();

  /* ---------- Palette PAM (couleurs exclusives du cahier des charges) ---------- */
  WFP.C = {
    primary: '#F59E0B', amberLight: '#FBBF24', urgent: '#EF4444', available: '#10B981',
    analysis: '#8B5CF6', info: '#3B82F6', sidebar: '#1C1008', bg: '#FFFBF0',
    ink: '#1E293B', ink2: '#334155', muted: '#64748B', light: '#94A3B8',
    grid: '#F1F5F9', axis: '#E2E8F0', border: '#FDE68A', card: '#FFFFFF'
  };

  /* ---------- Formats ---------- */
  WFP.fmt = {
    num: (v, d = 1) => Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }),
    pct: (v, d = 0) => Number(v).toFixed(d).replace('.', ',') + ' %',
    m: v => Number(v).toFixed(1) + 'M'
  };

  /* ---------- Tooltip : carte blanche, ombre, bordure gauche 3px couleur ----------
   * title : titre ; rows : [[libelle, valeur, couleur?], ...] ; sub : sous-titre */
  WFP.tip = function (title, rows, sub) {
    let h = '<div class="tt-h"><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>';
    (rows || []).forEach(r => {
      h += '<div class="tt-r"><span>' + r[0] + '</span><b' + (r[2] ? ' style="color:' + r[2] + '"' : '') + '>' + r[1] + '</b></div>';
    });
    return h;
  };

  /* ---------- Maths ---------- */
  WFP.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  WFP.lerp = (a, b, t) => a + (b - a) * t;
  WFP.easeOut = t => 1 - Math.pow(1 - t, 3);            // ease-out cubique (entree)
  WFP.hexA = (hex, a) => {                                // #RRGGBB -> rgba()
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  // Interpolation de couleur entre deux stops hex
  WFP.mixHex = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = s => Math.round(WFP.lerp(pa >> s & 255, pb >> s & 255, t));
    return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  };

  /* ---------- Boucle d'animation partagee (rAF) ----------
   * Un seul requestAnimationFrame pour tous les graphiques : la boucle s'arrete
   * d'elle-meme quand plus aucune animation n'est en cours (economie CPU). */
  WFP.loop = {
    active: new Set(),
    raf: 0,
    add(chart) {
      this.active.add(chart);
      if (!this.raf) this.raf = requestAnimationFrame(t => this.tick(t));
    },
    tick(now) {
      this.raf = 0;
      this.active.forEach(c => { if (!c.step(now)) this.active.delete(c); });
      if (this.active.size) this.raf = requestAnimationFrame(t => this.tick(t));
    }
  };

  /* ---------- Compteur anime (valeurs KPI) ---------- */
  WFP.countUp = function (el, to, opts) {
    const o = Object.assign({ from: 0, dur: 800, fmt: v => v.toFixed(1) }, opts || {});
    const from = Number.isFinite(o.from) ? o.from : to;
    const t0 = performance.now();
    if (el._raf) cancelAnimationFrame(el._raf);
    const frame = now => {
      const t = WFP.clamp((now - t0) / o.dur, 0, 1);
      el.textContent = o.fmt(WFP.lerp(from, to, WFP.easeOut(t)));
      if (t < 1) el._raf = requestAnimationFrame(frame);
    };
    el._raf = requestAnimationFrame(frame);
  };

  /* ---------- Helpers de dessin ---------- */
  WFP.G = {
    // Courbe lissee : passage par tous les points via Catmull-Rom -> Bezier cubique
    smooth(ctx, pts, tension = 0.5) {
      if (pts.length < 2) return;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6 * tension * 2;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6 * tension * 2;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6 * tension * 2;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6 * tension * 2;
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
      }
    },
    // Rectangle dont seuls les coins superieurs sont arrondis
    roundTop(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h));
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    },
    rrect(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },
    text(ctx, s, x, y, o = {}) {
      ctx.font = o.font || '600 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = o.color || WFP.C.light;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'middle';
      ctx.fillText(s, x, y);
    },
    // Repere : grille horizontale #F1F5F9 et labels d'axe #94A3B8
    yGrid(ctx, x0, x1, y0, y1, ticks, fmt) {
      ctx.lineWidth = 1;
      ticks.forEach(t => {
        const y = t.y;
        ctx.strokeStyle = WFP.C.grid;
        ctx.beginPath(); ctx.moveTo(x0, Math.round(y) + 0.5); ctx.lineTo(x1, Math.round(y) + 0.5); ctx.stroke();
        WFP.G.text(ctx, t.label, x0 - 8, y, { align: 'right', font: '500 11px Inter, sans-serif', color: WFP.C.light });
      });
      ctx.strokeStyle = WFP.C.axis;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    }
  };

  /* ----------------------------------------------------------------------
   * Classe de base des graphiques.
   * Les sous-classes implementent :
   *   draw(ctx, w, h, p)  - dessin ; p in [0,1] = progression de l'animation
   *   hitTest(x, y)       - renvoie un objet "hit" ou null
   *   tooltip(hit)        - HTML du tooltip
   *   legendItems()       - [{key, label, color}] (optionnel)
   * -------------------------------------------------------------------- */
  class BaseChart {
    constructor(card, opts = {}) {
      this.card = card;
      this.id = opts.id || card.dataset.chart;
      this.dur = opts.dur || 800;
      this.canvas = card.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.wrap = card.querySelector('.wfp-cwrap');
      this.tip = card.querySelector('.wfp-tip');
      this.legendEl = card.querySelector('.wfp-legend');
      this.hidden = {};          // series masquees (toggle legende)
      this.data = null;
      this.hover = null;
      this.hoverKey = null;
      this.p = 0;
      this.t0 = null;
      this.visible = false;
      this.w = 0; this.h = 0;
      this.dpr = Math.min(2, global.devicePixelRatio || 1);
      this.bind();
      if (global.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.wrap);
      }
      this.resize();
    }

    bind() {
      this.wrap.addEventListener('mousemove', e => this.onMove(e));
      this.wrap.addEventListener('mouseleave', () => this.onLeave());
      if (this.legendEl) {
        this.legendEl.addEventListener('click', e => {
          const b = e.target.closest('[data-k]');
          if (!b) return;
          const k = b.dataset.k;
          this.hidden[k] = !this.hidden[k];
          b.classList.toggle('off', !!this.hidden[k]);
          b.setAttribute('aria-pressed', String(!this.hidden[k]));
          this.hover = null; this.hideTip();
          this.render();
        });
      }
    }

    // Recalcule la taille du canvas (HiDPI) puis redessine
    resize() {
      const w = Math.floor(this.wrap.clientWidth), h = Math.floor(this.wrap.clientHeight);
      if (!w || !h) return;
      if (w === this.w && h === this.h) return;
      this.w = w; this.h = h;
      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.render();
    }

    // Nouvelles donnees : (re)construit la legende et rejoue l'animation si visible
    setData(data) {
      this.data = data;
      this.buildLegend();
      if (this.visible) this.animate();
    }

    show() {
      if (this.visible) return;
      this.visible = true;
      if (this.data) this.animate();
    }

    animate() {
      this.t0 = null;
      this.p = 0;
      WFP.loop.add(this);
    }

    step(now) {
      if (this.t0 === null) this.t0 = now;
      const t = Math.min(1, (now - this.t0) / this.dur);
      this.p = WFP.easeOut(t);
      this.render();
      return t < 1;
    }

    render() {
      if (!this.data || !this.w || !this.visible) return;
      const ctx = this.ctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.w, this.h);
      this.draw(ctx, this.w, this.h, this.p);
    }

    buildLegend() {
      if (!this.legendEl) return;
      const items = this.legendItems ? this.legendItems() : [];
      this.legendEl.innerHTML = items.map(it =>
        '<button type="button" class="wfp-leg' + (this.hidden[it.key] ? ' off' : '') + '" data-k="' + it.key + '" aria-pressed="' + (!this.hidden[it.key]) + '">' +
        '<i style="background:' + it.color + '"></i>' + it.label + '</button>').join('');
    }

    onMove(e) {
      const r = this.wrap.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const hit = this.visible && this.data ? this.hitTest(x, y) : null;
      const key = hit ? hit.key : null;
      if (key !== this.hoverKey) {
        this.hoverKey = key;
        this.hover = hit;
        this.render();
      } else if (hit) {
        this.hover = hit;
      }
      if (hit && this.tooltip) {
        this.tip.innerHTML = this.tooltip(hit);
        // Couleur de la bordure gauche : propre a chaque graphique (optionnel)
        if (this.tipColor) this.tip.style.borderLeftColor = this.tipColor(hit);
        this.tip.classList.add('on');
        const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
        let tx = x + 16, ty = y - th / 2;
        if (tx + tw > this.w - 6) tx = x - tw - 16;
        ty = WFP.clamp(ty, 4, this.h - th - 4);
        this.tip.style.transform = 'translate(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px)';
      } else {
        this.hideTip();
      }
    }

    onLeave() {
      this.hoverKey = null;
      this.hover = null;
      this.hideTip();
      this.render();
    }

    hideTip() { if (this.tip) this.tip.classList.remove('on'); }
  }
  WFP.BaseChart = BaseChart;

  // Registre des graphiques : chaque module de charts/ s'y enregistre
  WFP.charts = WFP.charts || {};
})(window);
