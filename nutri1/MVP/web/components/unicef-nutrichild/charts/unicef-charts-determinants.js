/* ============================================================================
 * UNICEF NutriChildApp · Graphiques « déterminants et 1000 jours »
 *   G7  · Nuage WASH (eau/hygiène) vs retard de croissance, 4 quadrants (Canvas)
 *   G8  · Frise chronologique des 1000 premiers jours + impact cumulé (Canvas)
 *   G11 · Donut à double anneau : déterminants de la malnutrition (Canvas)
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;
  const { Chart, U } = NS;
  const C = U.colors;
  const TAU = Math.PI * 2;

  /* --------------------------------------------------------------------------
   * G7 · Nuage de points : X = accès à l'eau potable (%), Y = retard de croissance (%).
   * Régression linéaire animée et coefficient R² calculé sur les points affichés.
   * ------------------------------------------------------------------------ */
  class ScatterChart extends Chart {
    select(view) {
      return view.scatter;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const A = this.plotArea(W, H, { top: 36, left: 52, right: 18, bottom: 40 });
      const X = { min: 40, max: 100 };
      const Y = { min: 0, max: 50 };
      const xOf = (v) => A.x + ((v - X.min) / (X.max - X.min)) * A.w;
      const yOf = (v) => A.y + A.h - ((v - Y.min) / (Y.max - Y.min)) * A.h;
      const xSplit = 70;
      const ySplit = 20;

      // Quadrants : la zone « accès faible + retard élevé » est mise en évidence.
      ctx.fillStyle = 'rgba(229,36,59,0.06)';
      ctx.fillRect(A.x, yOf(ySplit), xOf(xSplit) - A.x, A.y + A.h - yOf(ySplit));
      ctx.fillStyle = 'rgba(128,189,65,0.08)';
      ctx.fillRect(xOf(xSplit), A.y, A.x + A.w - xOf(xSplit), yOf(ySplit) - A.y);
      U.line(ctx, xOf(xSplit), A.y, xOf(xSplit), A.y + A.h, C.muted, 1, [4, 4]);
      U.line(ctx, A.x, yOf(ySplit), A.x + A.w, yOf(ySplit), C.muted, 1, [4, 4]);

      // Graduations.
      for (let v = 40; v <= 100; v += 10) {
        U.text(ctx, v, xOf(v), A.y + A.h + 14, { size: 11, color: C.muted, align: 'center' });
      }
      for (let v = 0; v <= 50; v += 10) {
        U.line(ctx, A.x, yOf(v), A.x + A.w, yOf(v), C.grid, 1);
        U.text(ctx, v + '%', A.x - 8, yOf(v), { size: 11, color: C.muted, align: 'right' });
      }
      U.text(ctx, 'Accès à l’eau potable dans le ménage (%)', A.x + A.w, A.y + A.h + 30, { size: 10, weight: 600, color: C.muted, align: 'right' });
      U.text(ctx, 'Retard de croissance (%)', A.x, A.y - 16, { size: 10, weight: 600, color: C.muted });

      // Étiquettes des quadrants.
      U.text(ctx, 'Accès faible · retard élevé', A.x + 8, A.y + A.h - 10, { size: 10, weight: 600, color: C.danger });
      U.text(ctx, 'Accès élevé · retard maîtrisé', A.x + A.w - 8, A.y + 10, { size: 10, weight: 600, color: C.secondary, align: 'right' });

      // Régression animée (balayage gauche → droite).
      if (d.points.length > 1 && p > 0) {
        const x1 = X.min;
        const x2 = X.min + (X.max - X.min) * p;
        ctx.beginPath();
        ctx.moveTo(xOf(x1), yOf(d.slope * x1 + d.intercept));
        ctx.lineTo(xOf(x2), yOf(d.slope * x2 + d.intercept));
        ctx.strokeStyle = C.navy;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        if (p > 0.9) {
          U.text(ctx, 'Régression · R² = ' + d.r2.toFixed(2), A.x + A.w - 8, A.y + A.h - 10, { size: 11, weight: 700, color: C.navy, align: 'right' });
        }
      }

      // Points pays / districts (apparition progressive).
      d.points.forEach((pt) => {
        const x = xOf(pt.x);
        const y = yOf(pt.y);
        const idx = this.hit({
          type: 'circle', x, y, r: 6, color: pt.color,
          tip: U.tip(pt.name, [
            ['Eau potable', pt.x.toFixed(0) + '%'],
            ['Retard de croissance', pt.y.toFixed(1) + '%'],
            ['Régression (valeur ajustée)', (d.slope * pt.x + d.intercept).toFixed(1) + '%']
          ])
        });
        ctx.save();
        ctx.globalAlpha = p;
        U.dot(ctx, x, y, this.hover === idx ? 9 : 6, pt.color, '#fff', 1.4);
        ctx.restore();
        if (p > 0.6) {
          U.text(ctx, pt.code || pt.name.slice(0, 3).toUpperCase(), x + 9, y - 6, { size: 9, weight: 600, color: C.body });
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
   * G8 · Frise des 1000 premiers jours (de la conception à 24 mois).
   * Haut : jalons et interventions renseignés dans l'App (taux de couverture).
   * Bas : impact cumulé estimé sur le retard de croissance (-20 % en régional).
   * ------------------------------------------------------------------------ */
  class TimelineChart extends Chart {
    select(view) {
      return view.timeline;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const labelW = Math.min(190, W * 0.3);
      const x0 = labelW;
      const x1 = W - 24;
      const xOfDay = (day) => x0 + ((day - d.min) / (d.max - d.min)) * (x1 - x0);
      const top = 42;
      const rowH = 28;
      const rowsEnd = top + d.rows.length * rowH;

      // Jalons (lignes verticales) et libellés.
      d.milestones.forEach((m) => {
        const x = xOfDay(m.day);
        U.line(ctx, x, top - 10, x, H - 40, m.day === 0 ? C.text : C.axis, m.day === 0 ? 1.4 : 1, [5, 4]);
        U.text(ctx, m.label, x + 4, 14, { size: 11, weight: 600, color: m.day === 0 ? C.text : C.body });
      });

      // Interventions : barres arrondies dont la longueur grandit avec p.
      d.rows.forEach((r, i) => {
        const y = top + i * rowH;
        const xs = xOfDay(r.from);
        const xe = xOfDay(r.to);
        const w = Math.max(10, (xe - xs) * p);
        U.text(ctx, r.label, x0 - 10, y + rowH / 2 - 2, { size: 11, weight: 500, color: C.body, align: 'right', maxWidth: labelW - 14 });
        U.roundRect(ctx, xs, y + 4, w, rowH - 8, 8);
        ctx.fillStyle = r.color;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p > 0.8) {
          U.text(ctx, Math.round(r.value) + '%', xs + 10, y + rowH / 2, { size: 11, weight: 700, color: '#fff' });
        }
        this.hit({
          type: 'rect', x: xs, y: y + 4, w: Math.max(w, 20), h: rowH - 8, color: r.color,
          tip: U.tip(r.label, [
            ['Couverture App', Math.round(r.value) + '%'],
            ['Fenêtre', (r.from > 0 ? '+' : '') + r.from + ' → ' + (r.to > 0 ? '+' : '') + r.to + ' jours']
          ])
        });
      });

      // Zone d'impact cumulé.
      const zTop = rowsEnd + 22;
      const zBottom = H - 34;
      const zH = zBottom - zTop;
      const impactAt = (day) => {
        if (day <= 0) return 0;
        const f = (1 - Math.exp(-day / 300)) / (1 - Math.exp(-730 / 300));
        return d.impact * Math.min(1, f);
      };
      const yImp = (v) => zBottom - (v / 25) * zH;
      U.text(ctx, 'Impact cumulé sur le retard de croissance (réduction potentielle)', x0, zTop - 10, { size: 10, weight: 600, color: C.muted });
      U.line(ctx, x0, zBottom, x1, zBottom, C.axis, 1);
      [0, 10, 20].forEach((t) => {
        U.line(ctx, x0, yImp(t), x1, yImp(t), C.grid, 1);
        U.text(ctx, '−' + t + '%', x0 - 8, yImp(t), { size: 10, color: C.muted, align: 'right' });
      });

      const endDay = d.min + (d.max - d.min) * p;
      ctx.beginPath();
      ctx.moveTo(xOfDay(0), zBottom);
      for (let day = 0; day <= 730; day += 10) {
        if (day > endDay) break;
        ctx.lineTo(xOfDay(day), yImp(impactAt(day)));
      }
      ctx.lineTo(xOfDay(Math.min(730, Math.max(0, endDay))), zBottom);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, zTop, 0, zBottom);
      grad.addColorStop(0, U.rgba(C.secondary, 0.55));
      grad.addColorStop(1, U.rgba(C.primary, 0.08));
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      for (let day = 0; day <= 730; day += 10) {
        if (day > endDay) break;
        if (day === 0) ctx.moveTo(xOfDay(day), yImp(impactAt(day)));
        else ctx.lineTo(xOfDay(day), yImp(impactAt(day)));
      }
      ctx.strokeStyle = C.secondary;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Libellé final et survol de la courbe (valeur à chaque jour).
      if (p > 0.95) {
        U.text(ctx, '−' + d.impact.toFixed(0) + '% à 24 mois', xOfDay(730) - 6, yImp(d.impact) - 12, { size: 12, weight: 700, color: C.secondary, align: 'right' });
      }
      this.hit({
        type: 'rect', x: x0, y: zTop, w: x1 - x0, h: zBottom - zTop, color: C.secondary,
        tip: (pt) => {
          const day = Math.round(d.min + ((pt.x - x0) / (x1 - x0)) * (d.max - d.min));
          const day2 = U.clamp(day, 0, 730);
          return U.tip('Jour ' + (day > 0 ? '+' : '') + day, [
            ['Réduction cumulée', '−' + impactAt(day2).toFixed(1) + '%'],
            ['Étape', day < 0 ? 'Grossesse' : day < 180 ? 'Nouveau-né' : day < 365 ? 'Nourrisson' : 'Jeune enfant']
          ]);
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
   * G11 · Donut à double anneau : anneau extérieur = causes directes,
   * anneau intérieur = causes sous-jacentes. Survol par arc.
   * ------------------------------------------------------------------------ */
  class DonutChart extends Chart {
    select(view) {
      return view.donut;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const legendW = Math.min(190, W * 0.42);
      const availW = W - legendW - 12;
      const R = Math.max(40, Math.min(availW / 2, H / 2) - 14);
      const cx = availW / 2;
      const cy = H / 2;
      const rings = [
        { items: d.outer, r0: R * 0.70, r1: R, title: 'Causes directes' },
        { items: d.inner, r0: R * 0.36, r1: R * 0.66, title: 'Causes sous-jacentes' }
      ];

      rings.forEach((ring) => {
        let a = -Math.PI / 2;
        ring.items.forEach((it, i) => {
          const span = (it.value / 100) * TAU * p;
          if (span <= 0) { a += (it.value / 100) * TAU; return; }
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r1, a, a + span);
          ctx.arc(cx, cy, ring.r0, a + span, a, true);
          ctx.closePath();
          ctx.fillStyle = it.color;
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          const idx = this.hit({
            type: 'arc', cx, cy, r0: ring.r0, r1: ring.r1, a0: a, span: (it.value / 100) * TAU, color: it.color,
            tip: U.tip(it.label, [['Part', it.value + '%'], ['Niveau', ring.title]])
          });
          if (this.hover === idx) {
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r1 + 3, a, a + span);
            ctx.strokeStyle = U.rgba(it.color, 0.5);
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          a += span;
        });
      });

      // Centre : valeur clé (prévalence MAS).
      U.text(ctx, d.centerValue, cx, cy - 6, { size: Math.max(16, R * 0.2), weight: 800, color: C.text, align: 'center' });
      U.text(ctx, d.centerLabel, cx, cy + Math.max(12, R * 0.13), { size: 10, weight: 500, color: C.muted, align: 'center' });

      // Légende à droite : anneau extérieur puis intérieur.
      const lx = availW + 6;
      let ly = Math.max(24, cy - (d.outer.length + d.inner.length) * 9);
      U.text(ctx, 'Causes directes', lx, ly, { size: 10, weight: 700, color: C.muted });
      ly += 18;
      d.outer.forEach((it) => {
        U.dot(ctx, lx + 4, ly, 4, it.color);
        U.text(ctx, it.label, lx + 14, ly, { size: 11, weight: 500, color: C.body, maxWidth: legendW - 60 });
        U.text(ctx, it.value + '%', W - 4, ly, { size: 11, weight: 700, color: C.text, align: 'right' });
        ly += 18;
      });
      ly += 8;
      U.text(ctx, 'Causes sous-jacentes', lx, ly, { size: 10, weight: 700, color: C.muted });
      ly += 18;
      d.inner.forEach((it) => {
        U.dot(ctx, lx + 4, ly, 4, it.color);
        U.text(ctx, it.label, lx + 14, ly, { size: 11, weight: 500, color: C.body, maxWidth: legendW - 60 });
        U.text(ctx, it.value + '%', W - 4, ly, { size: 11, weight: 700, color: C.text, align: 'right' });
        ly += 18;
      });
    }
  }

  NS.charts.G7 = ScatterChart;
  NS.charts.G8 = TimelineChart;
  NS.charts.G11 = DonutChart;
})(window);
