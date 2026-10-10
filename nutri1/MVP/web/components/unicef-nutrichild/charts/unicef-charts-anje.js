/* ============================================================================
 * UNICEF NutriChildApp · Graphiques « pratiques ANJE »
 *   G3  · Profil radar ANJE à 8 indicateurs (Canvas)
 *   G6  · Heatmap pratiques ANJE par pays / districts (Canvas)
 *   G12 · Barres horizontales groupées des pratiques clés (Canvas)
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;
  const { Chart, U } = NS;
  const C = U.colors;
  const TAU = Math.PI * 2;

  /** Palette rouge → orange → doré → vert clair selon le ratio valeur / objectif OMS. */
  const HEAT_STOPS = [[0, '#E5243B'], [0.5, '#F26A21'], [0.75, '#DDA63A'], [1, '#C5E8A0']];
  function heatColor(ratio) {
    const r = U.clamp(ratio, 0, 1);
    for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
      const [a, ca] = HEAT_STOPS[i];
      const [b, cb] = HEAT_STOPS[i + 1];
      if (r >= a && r <= b) return U.mix(ca, cb, (r - a) / (b - a));
    }
    return HEAT_STOPS[HEAT_STOPS.length - 1][1];
  }

  /* --------------------------------------------------------------------------
   * G3 · Radar à 8 axes. Mode global : meilleur / plus faible pays + région.
   * Mode pays : pays vs moyenne régionale vs benchmark OMS (pointillé).
   * ------------------------------------------------------------------------ */
  class RadarChart extends Chart {
    select(view) {
      return view.radar;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const n = d.axes.length;
      const legendH = 46;
      const cx = W / 2;
      const cy = (H - legendH) / 2 + 4;
      const R = Math.max(40, Math.min(W / 2 - 64, (H - legendH) / 2 - 22));
      const angle = (i) => -Math.PI / 2 + (i * TAU) / n;
      const at = (i, value) => [cx + Math.cos(angle(i)) * R * (value / 100), cy + Math.sin(angle(i)) * R * (value / 100)];

      // Anneaux de grille (20 % → 100 %).
      for (let k = 1; k <= 5; k++) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const [x, y] = at(i, k * 20);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1;
        ctx.stroke();
        U.text(ctx, k * 20, cx + 3, cy - R * (k / 5) - 1, { size: 9, color: C.muted });
      }

      // Axes et libellés (alignement selon l'angle).
      for (let i = 0; i < n; i++) {
        const [x, y] = at(i, 100);
        U.line(ctx, cx, cy, x, y, C.axis, 1);
        const a = angle(i);
        const lx = cx + Math.cos(a) * (R + 16);
        const ly = cy + Math.sin(a) * (R + 16);
        const cos = Math.cos(a);
        const align = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
        U.text(ctx, d.axes[i], lx, ly, { size: 10, weight: 600, color: C.body, align });
      }

      // Séries visibles (animées par p, transparence + contour).
      const visible = d.series.filter((s) => !this.hidden[s.key]);
      visible.forEach((s) => {
        ctx.beginPath();
        s.values.forEach((v, i) => {
          const [x, y] = at(i, v * p);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
        ctx.closePath();
        if (!s.dash) {
          ctx.fillStyle = U.rgba(s.color, 0.14);
          ctx.fill();
        }
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width || 1.8;
        ctx.setLineDash(s.dash || []);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Sommets interactifs (info-bulle par indicateur).
      visible.forEach((s) => {
        if (s.dash) return;
        s.values.forEach((v, i) => {
          const [x, y] = at(i, v);
          const idx = this.hit({
            type: 'circle', x, y, r: 3.4, color: s.color,
            tip: U.tip(s.label, [[d.axes[i], v + '%'], ['Objectif OMS', NS.DATA.anjeOms[i] + '%'], ['Écart', (v - NS.DATA.anjeOms[i] > 0 ? '+' : '−') + Math.abs(v - NS.DATA.anjeOms[i]) + ' pts']])
          });
          const [hx, hy] = at(i, v * p);
          U.dot(ctx, hx, hy, 3.4, s.color, '#fff', 1.2);
          if (this.hover === idx) {
            U.dot(ctx, hx, hy, 9, U.rgba(s.color, 0.2));
          }
        });
      });

      // Légende en bas.
      this.legend(ctx, d.series.map((s) => ({ key: s.key, label: s.label, color: s.color })), 14, H - 14);
    }
  }

  /* --------------------------------------------------------------------------
   * G6 · Heatmap : 8 indicateurs ANJE en colonnes, pays ou districts en lignes.
   * Couleur = écart à l'objectif OMS (rouge = loin de la cible).
   * ------------------------------------------------------------------------ */
  class HeatmapChart extends Chart {
    select(view) {
      return view.heat;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const nC = d.cols.length;
      const nR = d.rows.length;
      const labelW = Math.min(150, W * 0.26);
      const headerH = 50;
      const cellW = (W - labelW - 6) / nC;
      const rowH = Math.min(30, (H - headerH - 6) / nR);

      // En-têtes de colonnes : deux lignes maximum, retour à la ligne automatique.
      for (let c = 0; c < nC; c++) {
        const words = String(d.cols[c]).split(' ');
        const lines = [];
        let cur = '';
        words.forEach((w) => {
          const test = cur ? cur + ' ' + w : w;
          if (U.measure(ctx, test, 10, 600) > cellW - 6 && cur) { lines.push(cur); cur = w; } else cur = test;
        });
        if (cur) lines.push(cur);
        const x = labelW + c * cellW + cellW / 2;
        const shown = lines.slice(0, 2);
        shown.forEach((ln, k) => {
          U.text(ctx, ln, x, headerH - 24 + k * 12 + (shown.length === 1 ? 6 : 0), { size: 10, weight: 600, color: C.body, align: 'center' });
        });
      }

      // Cellules, avec apparition échelonnée par ligne.
      d.rows.forEach((row, r) => {
        const y = headerH + r * rowH;
        const progress = U.clamp(p * 1.6 - (r / nR) * 0.6, 0, 1);
        U.text(ctx, row.name, labelW - 8, y + rowH / 2, { size: 11, weight: row.selected ? 700 : 500, color: row.selected ? C.text : C.body, align: 'right', maxWidth: labelW - 14 });
        row.values.forEach((v, c) => {
          const obj = d.objectives[c];
          const ratio = v / obj;
          const x = labelW + c * cellW;
          const color = heatColor(ratio);
          ctx.save();
          ctx.globalAlpha = progress;
          U.roundRect(ctx, x + 2, y + 2, cellW - 4, rowH - 4, 5);
          ctx.fillStyle = color;
          ctx.fill();
          if (row.selected) {
            ctx.strokeStyle = C.navy;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
          ctx.restore();
          U.text(ctx, v + '%', x + cellW / 2, y + rowH / 2, { size: 11, weight: 600, color: ratio < 0.4 ? '#fff' : C.text, align: 'center' });
          this.hit({
            type: 'rect', x: x + 2, y: y + 2, w: cellW - 4, h: rowH - 4, color,
            tip: U.tip(row.name + ' · ' + d.cols[c], [
              ['Valeur', v + '%'],
              ['Objectif OMS', obj + '%'],
              ['Écart', (v - obj > 0 ? '+' : '−') + Math.abs(v - obj) + ' pts']
            ])
          });
        });
      });

      // Échelle de couleurs (légende discrète en bas).
      const ly = headerH + nR * rowH + 12;
      if (ly < H - 8) {
        const sw = 120;
        const grad = ctx.createLinearGradient(labelW, 0, labelW + sw, 0);
        HEAT_STOPS.forEach(([s, col]) => grad.addColorStop(s, col));
        ctx.fillStyle = grad;
        U.roundRect(ctx, labelW, ly, sw, 8, 4);
        ctx.fill();
        U.text(ctx, 'Loin de la cible', labelW + sw + 8, ly + 4, { size: 10, color: C.body });
        U.text(ctx, 'Objectif atteint', labelW + sw + 110, ly + 4, { size: 10, color: C.body });
      }
    }
  }

  /* --------------------------------------------------------------------------
   * G12 · Barres horizontales groupées : 5 pratiques × zones (ou districts),
   * repère vertical = objectif OMS de chaque pratique.
   * ------------------------------------------------------------------------ */
  class GroupedChart extends Chart {
    select(view) {
      return view.grouped;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const groups = d.groups;
      const nP = d.practices.length;
      const nG = groups.length;
      const top = 40;
      const x0 = 14;
      const x1 = W - 52;
      const sx = (v) => x0 + (U.clamp(v, 0, 100) / 100) * (x1 - x0);
      const blockH = (H - top - 24) / nP;
      const barH = Math.min(12, (blockH - 22) / Math.max(nG, 1));

      this.legend(ctx, groups.map((g, i) => ({ key: 'g' + i, label: g.label, color: g.color })), 14, 14);

      d.practices.forEach((pr, i) => {
        const y0 = top + i * blockH;
        U.text(ctx, pr.label, x0, y0 + 8, { size: 12, weight: 600, color: C.text });
        U.text(ctx, 'Objectif ' + pr.target + '%', x1, y0 + 8, { size: 10, weight: 600, color: C.muted, align: 'right' });
        // Repère de l'objectif OMS.
        U.line(ctx, sx(pr.target), y0 + 16, sx(pr.target), y0 + blockH - 4, C.navy, 1.2, [4, 3]);

        groups.forEach((g, gi) => {
          if (this.hidden['g' + gi]) return;
          const v = g.values[i];
          const y = y0 + 18 + gi * (barH + 4);
          // Rail de fond.
          U.roundRect(ctx, x0, y, x1 - x0, barH, 4);
          ctx.fillStyle = C.grid;
          ctx.fill();
          // Barre animée.
          const w = Math.max(3, (sx(v) - x0) * p);
          U.roundRect(ctx, x0, y, w, barH, 4);
          ctx.fillStyle = v >= pr.target ? g.color : U.rgba(g.color, 0.7);
          ctx.fill();
          if (p > 0.85) {
            U.text(ctx, Math.round(v) + '%', x0 + w + 6, y + barH / 2, { size: 10, weight: 600, color: C.text });
          }
          this.hit({
            type: 'rect', x: x0, y: y - 2, w: x1 - x0, h: barH + 4, color: g.color,
            tip: U.tip(g.label + ' · ' + pr.label, [
              ['Valeur', Math.round(v) + '%'],
              ['Objectif OMS', pr.target + '%'],
              ['Écart', (v - pr.target > 0 ? '+' : '−') + Math.abs(Math.round(v - pr.target)) + ' pts']
            ])
          });
        });
      });

      // Graduations de l'axe.
      [0, 25, 50, 75, 100].forEach((t) => {
        U.text(ctx, t + '%', sx(t), H - 8, { size: 9, color: C.muted, align: 'center' });
      });
    }
  }

  NS.charts.G3 = RadarChart;
  NS.charts.G6 = HeatmapChart;
  NS.charts.G12 = GroupedChart;
  NS.heatColor = heatColor;
})(window);
