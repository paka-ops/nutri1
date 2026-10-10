/* ============================================================================
 * UNICEF NutriChildApp · Mini-graphiques Canvas des KPI et du tableau
 *   MiniBars  · barres de répartition (KPI 1 par zone/district, KPI 5 mensuel)
 *   Gauge     · jauge circulaire rouge-orange (KPI 2, allaitement exclusif)
 *   Sparkline · courbe 12 mois (KPI 3 et tendance du tableau de synthèse)
 * Chaque mini-graphique hérite du moteur partagé (HiDPI, animation, survol).
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;
  const { Chart, U } = NS;
  const C = U.colors;
  const TAU = Math.PI * 2;

  /** Barres verticales compactes ; la barre en surbrillance est pleine. */
  class MiniBars extends Chart {
    render(ctx, W, H, p) {
      const d = this.data;
      const n = d.values.length;
      if (!n) return;
      const labelH = 16;
      const top = 6;
      const areaH = H - labelH - top;
      const max = Math.max.apply(null, d.values) || 1;
      const slot = W / n;
      const barW = Math.max(4, slot * 0.6);
      d.values.forEach((v, i) => {
        const h = Math.max(2, (v / max) * areaH * p);
        const x = i * slot + (slot - barW) / 2;
        const y = top + areaH - h;
        const hi = d.highlight === i || d.highlight === undefined;
        U.topBar(ctx, x, y, barW, h, 4);
        ctx.fillStyle = hi ? d.color : U.rgba(d.color, 0.38);
        ctx.fill();
        // Étiquettes : toutes si peu de barres, une sur deux sinon.
        const every = n > 8 ? 2 : 1;
        if (i % every === 0 || i === n - 1) {
          U.text(ctx, d.labels[i], x + barW / 2, H - 6, { size: 9, color: C.muted, align: 'center', maxWidth: slot * every });
        }
        this.hit({
          type: 'rect', x: i * slot, y: 0, w: slot, h: H, color: d.color,
          tip: U.tip(d.labels[i], [[d.unitLabel || 'Valeur', d.format ? d.format(v) : NS.fmt.int(v)]])
        });
      });
    }
  }

  /** Jauge circulaire sur 270° : valeur en pourcentage, couleur rouge → orange. */
  class Gauge extends Chart {
    render(ctx, W, H, p) {
      const d = this.data;
      const size = Math.min(W, H);
      const cx = W / 2;
      const cy = H / 2;
      const r = size / 2 - 7;
      const start = Math.PI * 0.75;
      const span = Math.PI * 1.5;
      const value = U.clamp(d.value, 0, 100);

      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + span);
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + span * (value / 100) * p);
      ctx.strokeStyle = U.mix(C.danger, C.tertiary, value / 100);
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.lineCap = 'butt';

      U.text(ctx, Math.round(value) + '%', cx, cy - 2, { size: Math.max(12, size * 0.2), weight: 800, color: C.text, align: 'center' });
      U.text(ctx, 'de l’objectif', cx, cy + size * 0.18, { size: 9, weight: 500, color: C.muted, align: 'center' });
      this.hit({
        type: 'rect', x: 0, y: 0, w: W, h: H, color: C.danger,
        tip: U.tip('Allaitement exclusif', [['Valeur', value + '%'], ['Objectif OMS', '70%']])
      });
    }
  }

  /** Courbe lissée (Bézier via points médians) avec aire dégradée et point final. */
  class Sparkline extends Chart {
    render(ctx, W, H, p) {
      const d = this.data;
      const vals = d.values;
      const n = vals.length;
      if (!n) return;
      const pad = 3;
      const min = Math.min.apply(null, vals) - 0.5;
      const max = Math.max.apply(null, vals) + 0.5;
      const xOf = (i) => pad + (i / (n - 1)) * (W - pad * 2);
      const yOf = (v) => pad + (H - pad * 2) * (1 - (v - min) / (max - min || 1));
      const pts = vals.map((v, i) => [xOf(i), yOf(v)]);

      // Chemin lissé : courbe quadratique passant par les milieux des segments.
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n - 1; i++) {
          const mx = (pts[i][0] + pts[i + 1][0]) / 2;
          const my = (pts[i][1] + pts[i + 1][1]) / 2;
          ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
        }
        ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W * p + 1, H);
      ctx.clip();
      path();
      ctx.lineTo(pts[n - 1][0], H);
      ctx.lineTo(pts[0][0], H);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, U.rgba(d.color, 0.28));
      grad.addColorStop(1, U.rgba(d.color, 0));
      ctx.fillStyle = grad;
      ctx.fill();
      path();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (p > 0.95) U.dot(ctx, pts[n - 1][0], pts[n - 1][1], 3, d.color, '#fff', 1.4);

      // Survol : mois (ou index) et valeur.
      const labels = d.labels || NS.DATA.months;
      pts.forEach((pt, i) => {
        this.hit({
          type: 'rect', x: pt[0] - W / (2 * n), y: 0, w: W / n, h: H, color: d.color,
          tip: U.tip(labels[i] || 'Point ' + (i + 1), [[d.unitLabel || 'Valeur', d.format ? d.format(vals[i]) : vals[i].toFixed(1) + '%']])
        });
      });
    }
  }

  NS.charts.MiniBars = MiniBars;
  NS.charts.Gauge = Gauge;
  NS.charts.Sparkline = Sparkline;
})(window);
