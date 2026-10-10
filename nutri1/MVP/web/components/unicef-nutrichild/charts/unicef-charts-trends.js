/* ============================================================================
 * UNICEF NutriChildApp · Graphiques « tendances et géographie »
 *   G9  · Cartographie des bulles : prévalence et volume de MAS (Canvas)
 *   G10 · Évolution historique de la MAS 2016-2024, aires multi-lignes (Canvas)
 *   G13 · Rose polaire : saisonnalité des admissions CRENAS (Canvas)
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;
  const { Chart, U } = NS;
  const C = U.colors;
  const TAU = Math.PI * 2;

  /* --------------------------------------------------------------------------
   * G9 · Bulles géographiques. Position = capitale (projection simple, schéma).
   * Taille = enfants MAS dépistés ; couleur = prévalence MAS.
   * ------------------------------------------------------------------------ */
  class BubbleMapChart extends Chart {
    select(view) {
      return view.bubbles;
    }

    render(ctx, W, H, p) {
      const list = this.data;
      const B = NS.DATA.mapBounds;
      const legendH = 40;
      const A = { x: 8, y: 26, w: W - 16, h: H - legendH - 30 };
      const k = Math.min(A.w / (B.lonMax - B.lonMin), A.h / (B.latMax - B.latMin));
      const ox = A.x + (A.w - k * (B.lonMax - B.lonMin)) / 2;
      const oy = A.y + (A.h - k * (B.latMax - B.latMin)) / 2;
      const px = (lon) => ox + (lon - B.lonMin) * k;
      const py = (lat) => oy + (B.latMax - lat) * k;

      U.text(ctx, 'Positionnement schématique des capitales', A.x, 12, { size: 10, weight: 600, color: C.muted });

      // Trame de fond discrète (graticule).
      ctx.fillStyle = 'rgba(186,230,253,0.45)';
      for (let lon = B.lonMin; lon <= B.lonMax; lon += 4) {
        for (let lat = B.latMin; lat <= B.latMax; lat += 4) {
          ctx.beginPath();
          ctx.arc(px(lon), py(lat), 1.2, 0, TAU);
          ctx.fill();
        }
      }

      const maxM = Math.max.apply(null, list.map((b) => b.mdk)) || 1;
      const sorted = list.slice().sort((a, b) => b.mdk - a.mdk);
      sorted.forEach((b) => {
        const r = (6 + 34 * Math.sqrt(b.mdk / maxM)) * p;
        const x = px(b.lon);
        const y = py(b.lat);
        const idx = this.hit({
          type: 'circle', x, y, r: Math.max(r, 4), color: b.color,
          tip: U.tip(b.name, [
            ['Prévalence MAS', b.mas.toFixed(1) + '%'],
            ['Enfants MAS dépistés', NS.fmt.k(b.mdk)],
            ['Classe', b.mas < 5 ? 'Faible (< 5 %)' : b.mas <= 10 ? 'Modérée (5-10 %)' : 'Élevée (> 10 %)']
          ])
        });
        ctx.save();
        ctx.globalAlpha = b.faded ? 0.28 : 0.82;
        U.dot(ctx, x, y, Math.max(r, 2), b.color, '#fff', 1.4);
        ctx.restore();
        if (b.selected) U.dot(ctx, x, y, Math.max(r, 2) + 4, 'rgba(0,0,0,0)', C.navy, 2.2);
        if (this.hover === idx) U.dot(ctx, x, y, Math.max(r, 2) + 6, U.rgba(b.color, 0.2));
        if (p > 0.85 && (r > 14 || b.selected)) {
          U.text(ctx, b.code, x, y, { size: 10, weight: 700, color: '#fff', align: 'center' });
        } else if (p > 0.85) {
          U.text(ctx, b.code, x + Math.max(r, 2) + 4, y, { size: 10, weight: 600, color: b.faded ? C.muted : C.body });
        }
      });

      // Légende : classes de prévalence et taille.
      // Légende statique (pas de masquage : les classes sont des repères de couleur).
      const ly = H - 18;
      let lx = 8;
      [['< 5 % (vert)', C.secondary], ['5-10 % (orange)', C.tertiary], ['> 10 % (rouge)', C.danger]].forEach(([label, color]) => {
        U.dot(ctx, lx + 4, ly, 4, color);
        U.text(ctx, label, lx + 13, ly, { size: 11, weight: 500, color: C.body });
        lx += 13 + U.measure(ctx, label, 11, 500) + 18;
      });
      U.text(ctx, 'Taille de bulle = enfants MAS dépistés', W - 8, ly, { size: 10, color: C.muted, align: 'right' });
    }
  }

  /* --------------------------------------------------------------------------
   * G10 · Multi-lignes avec aire : prévalence MAS 2016-2024 par pays / district.
   * Zone rouge au-delà du seuil d'urgence OMS (10 %).
   * ------------------------------------------------------------------------ */
  class HistoryChart extends Chart {
    select(view) {
      return view.history;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const years = d.years;
      const n = years.length;
      const A = this.plotArea(W, H, { top: 46, left: 46, right: 18, bottom: 28 });
      const visible = d.series.filter((s) => !this.hidden[s.key]);
      const legendItems = d.series.map((s) => ({ key: s.key, label: s.label, color: s.color }));
      this.legend(ctx, legendItems, A.x, 14);

      const maxVal = Math.max(12, Math.max.apply(null, [].concat.apply([], visible.map((s) => s.values))) * 1.1);
      const yMax = Math.ceil(maxVal / 2) * 2;
      const ticks = U.niceTicks(0, yMax, 5);
      const xOf = (i) => A.x + (i / (n - 1)) * A.w;
      const yOf = (v) => A.y + A.h - (v / yMax) * A.h;

      ticks.forEach((t) => {
        U.line(ctx, A.x, yOf(t), A.x + A.w, yOf(t), C.grid, 1);
        U.text(ctx, t + '%', A.x - 8, yOf(t), { size: 11, color: C.muted, align: 'right' });
      });
      years.forEach((y, i) => U.text(ctx, y, xOf(i), A.y + A.h + 14, { size: 11, color: C.muted, align: 'center' }));

      // Zone d'alerte OMS (> 10 %).
      if (yMax > d.threshold) {
        ctx.fillStyle = 'rgba(229,36,59,0.07)';
        ctx.fillRect(A.x, A.y, A.w, yOf(d.threshold) - A.y);
        U.line(ctx, A.x, yOf(d.threshold), A.x + A.w, yOf(d.threshold), C.danger, 1.2, [6, 4]);
        U.text(ctx, 'Seuil d’urgence OMS (10 %)', A.x + A.w - 6, yOf(d.threshold) - 8, { size: 10, weight: 600, color: C.danger, align: 'right' });
      }

      // Séries : aire dégradée + ligne, révélées par balayage (clip p).
      ctx.save();
      ctx.beginPath();
      ctx.rect(A.x - 4, A.y - 4, A.w * p + 8, A.h + 8);
      ctx.clip();
      visible.forEach((s) => {
        const pts = s.values.map((v, i) => [xOf(i), yOf(v)]);
        ctx.beginPath();
        pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.lineTo(xOf(n - 1), A.y + A.h);
        ctx.lineTo(xOf(0), A.y + A.h);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, A.y, 0, A.y + A.h);
        grad.addColorStop(0, U.rgba(s.color, 0.2));
        grad.addColorStop(1, U.rgba(s.color, 0));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width || 2;
        ctx.stroke();
      });
      ctx.restore();

      // Points par année et étiquette de fin de série (après l'animation).
      visible.forEach((s) => {
        s.values.forEach((v, i) => {
          if (p < (i / (n - 1)) * 0.98) return;
          U.dot(ctx, xOf(i), yOf(v), 3, '#fff', s.color, 1.6);
        });
        if (p > 0.96) {
          U.text(ctx, s.label, xOf(n - 1) + 6, yOf(s.values[n - 1]), { size: 10, weight: 600, color: s.color });
        }
      });

      // Survol par année : toutes les séries visibles.
      const step = A.w / (n - 1);
      years.forEach((y, i) => {
        this.hit({
          type: 'rect', x: xOf(i) - step / 2, y: A.y, w: step, h: A.h, color: C.primary,
          tip: U.tip(String(y), visible.map((s) => [s.label, s.values[i].toFixed(1) + '%']))
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
   * G13 · Rose polaire : rayon proportionnel à la racine des admissions.
   * Les secteurs de la période de soudure (juin → septembre) sont en rouge.
   * ------------------------------------------------------------------------ */
  class PolarChart extends Chart {
    select(view) {
      return view.polar;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const n = d.values.length;
      const cx = W / 2;
      const cy = H / 2 + 4;
      const R = Math.max(40, Math.min(W, H) / 2 - 34);
      const max = Math.max.apply(null, d.values) || 1;
      const total = d.values.reduce((s, v) => s + v, 0) || 1;
      const isHi = (i) => d.highlight.indexOf(i) !== -1;

      // Cercles de référence (25 / 50 / 75 / 100 % du maximum).
      [0.25, 0.5, 0.75, 1].forEach((f) => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * Math.sqrt(f), 0, TAU);
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const gap = 0.035;
      d.values.forEach((v, i) => {
        const a0 = -Math.PI / 2 + (i * TAU) / n + gap / 2;
        const a1 = a0 + TAU / n - gap;
        const r = R * Math.sqrt(v / max) * p;
        const color = isHi(i) ? C.danger : U.mix('#9BDCF4', C.primary, v / max);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, Math.max(r, 0.01), a0, a1);
        ctx.closePath();
        ctx.fillStyle = isHi(i) ? U.rgba(C.danger, 0.85) : color;
        ctx.fill();

        const idx = this.hit({
          type: 'arc', cx, cy, r0: 0, r1: R, a0, span: a1 - a0, color: isHi(i) ? C.danger : C.primary,
          tip: U.tip(d.labels[i] + (isHi(i) ? ' · soudure' : ''), [
            ['Admissions', NS.fmt.int(v)],
            ['Part de l’année', ((v / total) * 100).toFixed(1) + '%']
          ])
        });
        if (this.hover === idx) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 4, a0, a1);
          ctx.strokeStyle = C.navy;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        const am = (a0 + a1) / 2;
        const lx = cx + Math.cos(am) * (R + 16);
        const ly = cy + Math.sin(am) * (R + 16);
        U.text(ctx, d.labels[i], lx, ly, {
          size: 10, weight: isHi(i) ? 700 : 600, color: isHi(i) ? C.danger : C.body,
          align: Math.cos(am) > 0.3 ? 'left' : Math.cos(am) < -0.3 ? 'right' : 'center'
        });
      });

      // Légende et note de lecture.
      U.text(ctx, 'Rouge = période de soudure', 8, 12, { size: 10, weight: 600, color: C.danger });
      U.text(ctx, 'Rayon ∝ √admissions', W - 8, 12, { size: 10, weight: 500, color: C.muted, align: 'right' });
    }
  }

  NS.charts.G9 = BubbleMapChart;
  NS.charts.G10 = HistoryChart;
  NS.charts.G13 = PolarChart;
})(window);
