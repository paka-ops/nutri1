/* ============================================================================
 * UNICEF NutriChildApp · Graphiques « malnutrition »
 *   G1 · Courbes de croissance OMS vs relevés terrain (Canvas)
 *   G2 · Tunnel d'accompagnement MAS, du dépistage à la guérison (Canvas)
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;
  const { Chart, U } = NS;
  const D = NS.DATA;
  const C = U.colors;

  /* --------------------------------------------------------------------------
   * G1 · Courbes OMS (P3, P15, P50, P85, P97) et nuage des mesures terrain.
   * Zones colorées : rose hors plage, orange en zone d'alerte, vert normal.
   * ------------------------------------------------------------------------ */
  class GrowthChart extends Chart {
    select(view) {
      return view.growth;
    }

    render(ctx, W, H, p) {
      const g = this.data;
      const meta = g.meta;
      const A = this.plotArea(W, H, { top: 46, left: 46, right: 52, bottom: 30 });
      const xOf = (age) => A.x + (age / 60) * A.w;
      const yOf = (v) => A.y + A.h - U.clamp((v - meta.yMin) / (meta.yMax - meta.yMin), 0, 1) * A.h;

      // Légende : mesures, zones percentiles, courbes.
      this.legend(ctx, [
        { key: 'points', label: 'Mesures terrain (App)', color: C.primary },
        { key: 'bands', label: 'Zones percentiles', color: C.secondary },
        { key: 'curves', label: 'Courbes OMS P3 → P97', color: C.body }
      ], A.x, 14);
      U.text(ctx, meta.unit, A.x, A.y - 16, { size: 10, weight: 600, color: C.muted });

      // Grille horizontale et graduations verticales.
      const ticksY = U.niceTicks(meta.yMin, meta.yMax, 5);
      ticksY.forEach((v) => {
        U.line(ctx, A.x, yOf(v), A.x + A.w, yOf(v), C.grid, 1);
        U.text(ctx, v, A.x - 8, yOf(v), { size: 11, color: C.muted, align: 'right' });
      });
      for (let age = 0; age <= 60; age += 6) {
        U.text(ctx, age, xOf(age), A.y + A.h + 14, { size: 11, color: C.muted, align: 'center' });
      }
      // Titre de l'axe X sur la ligne d'unité (en haut), pour ne pas chevaucher le tick « 60 ».
      U.text(ctx, 'Âge (mois)', A.x + A.w, A.y - 16, { size: 10, weight: 600, color: C.muted, align: 'right' });

      // Zone de dessin animée : tout est découpé à la progression p (balayage gauche → droite).
      ctx.save();
      ctx.beginPath();
      ctx.rect(A.x, A.y - 2, A.w * p + 1, A.h + 4);
      ctx.clip();

      const curve = (key) => g.curves.find((c) => c.key === key).points;
      const pathOf = (pts, fn) => pts.map((pt) => [xOf(pt.x), yOf(fn ? fn(pt) : pt.y)]);
      const fillBetween = (upper, lower, color) => {
        const up = pathOf(upper);
        const low = pathOf(lower).reverse();
        ctx.beginPath();
        up.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        low.forEach((q) => ctx.lineTo(q[0], q[1]));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      };
      const constant = (value) => curve('P50').map((pt) => ({ x: pt.x, y: value }));

      if (!this.hidden.bands) {
        fillBetween(constant(meta.yMax), curve('P97'), 'rgba(229,36,59,0.10)');     // > P97 : rose
        fillBetween(curve('P97'), curve('P85'), 'rgba(242,106,33,0.14)');           // P85-P97 : orange
        fillBetween(curve('P85'), curve('P15'), 'rgba(128,189,65,0.18)');           // P15-P85 : vert
        fillBetween(curve('P15'), curve('P3'), 'rgba(242,106,33,0.14)');            // P3-P15 : orange
        fillBetween(curve('P3'), constant(meta.yMin), 'rgba(229,36,59,0.10)');      // < P3 : rose
      }

      // Courbes percentiles (P50 mise en avant).
      if (!this.hidden.curves) {
        g.curves.forEach((c) => {
          const isMedian = c.key === 'P50';
          const isBound = c.key === 'P3' || c.key === 'P97';
          ctx.beginPath();
          c.points.forEach((pt, i) => {
            const x = xOf(pt.x);
            const y = yOf(pt.y);
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          });
          ctx.strokeStyle = isMedian ? C.primary : isBound ? 'rgba(229,36,59,0.75)' : 'rgba(242,106,33,0.75)';
          ctx.lineWidth = isMedian ? 2.4 : 1.3;
          ctx.setLineDash(isMedian ? [] : [5, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // Nuage des mesures terrain (couleur selon le z-score).
      if (!this.hidden.points) {
        g.points.forEach((pt) => {
          const x = xOf(pt.x);
          const y = yOf(pt.y);
          U.dot(ctx, x, y, 3.2, pt.color, 'rgba(255,255,255,0.9)', 0.8);
        });
      }
      ctx.restore();

      // Libellés des courbes en fin de tracé (après la fin de l'animation).
      if (p > 0.98 && !this.hidden.curves) {
        g.curves.forEach((c) => {
          const last = c.points[c.points.length - 1];
          U.text(ctx, c.key, xOf(60) + 6, yOf(last.y), { size: 10, weight: 600, color: c.key === 'P50' ? C.primary : C.body });
        });
      }

      // Zones de survol : strip par âge (valeurs percentiles) + points individuels.
      this.hit({
        type: 'rect', x: A.x, y: A.y, w: A.w, h: A.h,
        color: C.primary,
        tip: (pt) => {
          const age = U.clamp(Math.round(((pt.x - A.x) / A.w) * 60), 0, 60);
          const rows = g.curves.map((c) => {
            const point = c.points.reduce((best, q) => (Math.abs(q.x - age) < Math.abs(best.x - age) ? q : best), c.points[0]);
            return [c.key, point.y.toFixed(meta.unit === 'kg' ? 2 : 1) + ' ' + meta.unit];
          });
          return U.tip(
            'Âge : ' + age + ' mois · ' + (g.sex === 'F' ? 'Fille' : 'Garçon'),
            rows.concat([['Mesures à cet âge', String(g.points.filter((q) => Math.abs(q.x - age) <= 3).length)]])
          );
        }
      });
      g.points.forEach((pt) => {
        const x = xOf(pt.x);
        const y = yOf(pt.y);
        const idx = this.hit({
          type: 'circle', x, y, r: 3.2,
          color: pt.color,
          tip: U.tip(pt.name, [
            ['Âge', pt.x + ' mois'],
            ['Mesure', pt.y.toFixed(meta.unit === 'kg' ? 2 : 1) + ' ' + meta.unit],
            ['z-score (approx.)', (pt.z >= 0 ? '+' : '') + pt.z.toFixed(2)],
            ['Statut', pt.z < -2 ? 'Émaciation sévère' : pt.z < -1 ? 'Zone d’alerte' : 'Normal']
          ])
        });
        if (this.hover === idx) {
          U.dot(ctx, x, y, 11, U.rgba(pt.color, 0.18));
          U.dot(ctx, x, y, 5.5, pt.color, '#fff', 1.4);
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
   * G2 · Tunnel d'accompagnement MAS : 6 étapes horizontales.
   * Le « gap de couverture terrain » est représenté en rouge pointillé.
   * ------------------------------------------------------------------------ */
  /** Découpe un libellé en au plus deux lignes selon la largeur disponible (mots entiers). */
  function wrapWords(ctx, text, maxW, size, weight) {
    const words = String(text).split(' ');
    const lines = [''];
    words.forEach((w) => {
      const cand = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w;
      if (U.measure(ctx, cand, size, weight) <= maxW || lines.length === 2 || !lines[lines.length - 1]) {
        lines[lines.length - 1] = cand;
      } else {
        lines.push(w);
      }
    });
    return lines;
  }

  class FunnelChart extends Chart {
    select(view) {
      return view.funnel;
    }

    render(ctx, W, H, p) {
      const stages = this.data;
      const n = stages.length;
      const labelW = Math.min(196, W * 0.36);
      const valW = 124;
      const top = 8;
      const bottom = H - 34;
      const rowH = (bottom - top) / n;
      const barH = rowH * 0.62;
      const areaX = labelW + 10;
      const areaW = W - labelW - valW - 18;
      const cx = areaX + areaW / 2;
      const base = stages[0];

      stages.forEach((s, i) => {
        const y = top + i * rowH + (rowH - barH) / 2;
        const w = Math.max(8, areaW * (s.pct / 100) * p);
        const x = cx - w / 2;
        const color = U.mix(C.primary, C.secondary, i / (n - 1));

        // Barre arrondie avec dégradé couleur → plus clair.
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0, color);
        grad.addColorStop(1, U.rgba(C.primary, 0.55));
        U.roundRect(ctx, x, y, w, barH, 8);
        ctx.fillStyle = i === 0 ? U.rgba(C.primary, 0.14) : grad;
        ctx.fill();
        if (i === 0) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = U.rgba(C.primary, 0.5);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Pourcentage à l'intérieur quand la barre est assez large.
        if (w > 60 && p > 0.6) {
          U.text(ctx, s.pct.toFixed(0) + '%', cx, y + barH / 2, { size: 12, weight: 700, color: i === 0 ? C.primary : '#fff', align: 'center' });
        }

        // Libellé de l'étape à gauche.
        // Libellé sur deux lignes au plus (mots entiers), sans compression horizontale.
        const lines = wrapWords(ctx, s.label, labelW - 8, 12, 600);
        lines.forEach((ln, k) => {
          const dy = (k - (lines.length - 1) / 2) * 15;
          U.text(ctx, ln, 0, y + barH / 2 + dy, { size: 12, weight: 600, color: C.text, align: 'left' });
        });

        // Valeur absolue et pourcentage à droite.
        U.text(ctx, NS.fmt.int(s.value * 1000), W - 8, y + barH / 2 - 7, { size: 13, weight: 600, color: '#334155', align: 'right' });
        U.text(ctx, s.pct.toFixed(1) + '% de la base', W - 8, y + barH / 2 + 8, { size: 10, weight: 500, color: C.muted, align: 'right' });

        const prev = i ? stages[i - 1] : null;
        this.hit({
          type: 'rect', x: 4, y: y - 3, w: W - 8, h: barH + 6,
          color,
          tip: U.tip(s.label, [
            ['Enfants', NS.fmt.int(s.value * 1000)],
            ['Part de la base', s.pct.toFixed(1) + '%'],
            ['Conversion', prev ? ((s.value / prev.value) * 100).toFixed(0) + '% de l’étape précédente' : 'Base estimée']
          ])
        });
      });

      // Gap de couverture : partie de la base non dépistée (zone rouge pointillée).
      const gapStart = cx + (areaW * (stages[1].pct / 100) * p) / 2;
      const gapEnd = cx + (areaW * (base.pct / 100) * p) / 2;
      const yGap = top + (rowH - barH) / 2;
      if (p > 0.2) {
        ctx.save();
        ctx.fillStyle = 'rgba(229,36,59,0.10)';
        ctx.strokeStyle = C.danger;
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.2;
        ctx.fillRect(gapStart, yGap, gapEnd - gapStart, barH);
        ctx.strokeRect(gapStart, yGap, gapEnd - gapStart, barH);
        ctx.restore();
      }
      const gapPts = Math.round(100 - stages[1].pct);
      U.text(ctx, '⚠ Gap de couverture terrain : ' + gapPts + ' pts des enfants MAS estimés ne sont pas dépistés (≈ ' +
        NS.fmt.int((base.value - stages[1].value) * 1000) + ' enfants)', areaX, H - 14, { size: 11, weight: 600, color: C.danger });
    }
  }

  NS.charts.G1 = GrowthChart;
  NS.charts.G2 = FunnelChart;
})(window);
