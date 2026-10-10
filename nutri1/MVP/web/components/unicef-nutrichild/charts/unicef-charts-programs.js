/* ============================================================================
 * UNICEF NutriChildApp · Graphiques « programmes et CRENAS »
 *   G4  · Bullet charts : performance des centres par rapport au seuil Sphère (Canvas)
 *   G5  · Aires empilées : campagnes de supplémentation 2017-2024 (Canvas)
 *   G14 · Sucettes : couverture de supplémentation 2022 vs 2024 (Canvas)
 * ========================================================================== */
(function (global) {
  'use strict';

  const NS = global.UNICEFNutriChild;
  const { Chart, U } = NS;
  const C = U.colors;

  /** Couleurs des zones qualitatives (bullet) et du statut associé. */
  const BAND_FILL = { good: '#E3F4D2', ok: '#FCEFCB', poor: '#F9D9DC' };
  const STATUS_COLOR = { good: C.secondary, ok: C.quaternary, poor: C.danger };

  /* --------------------------------------------------------------------------
   * G4 · Bullet charts. Une ligne par pays (vue globale) ou district (vue pays).
   * Le repère noir = seuil Sphère. Changement de métrique via le sélecteur HTML.
   * ------------------------------------------------------------------------ */
  class BulletChart extends Chart {
    select(view) {
      return view.bullet;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const def = d.def;
      const rows = d.rows;
      const n = rows.length;
      if (!n) return;
      const top = 30;
      const labelW = Math.min(132, W * 0.3);
      const valW = 50;
      const x0 = labelW;
      const x1 = W - valW - 10;
      const max = def.max;
      const sx = (v) => x0 + (U.clamp(v, 0, max) / max) * (x1 - x0);
      const rowH = Math.min(36, (H - top - 26) / n);
      const toneOf = (v) => {
        // Bandes triées par seuil croissant : la première bande dont le seuil couvre la valeur.
        const band = def.bands.find((b) => v <= b.to);
        return band ? band.tone : 'poor';
      };

      U.text(ctx, def.note, x0, 12, { size: 11, weight: 600, color: C.body });
      U.text(ctx, 'Repère = seuil Sphère', x1, 12, { size: 10, weight: 500, color: C.muted, align: 'right' });

      rows.forEach((row, i) => {
        const y = top + i * rowH;
        const bh = rowH * 0.7;
        const by = y + (rowH - bh) / 2;
        // Zones qualitatives en arrière-plan.
        let prev = 0;
        def.bands.forEach((b) => {
          const from = sx(prev);
          const to = sx(b.to);
          ctx.fillStyle = BAND_FILL[b.tone];
          ctx.fillRect(from, by, to - from, bh);
          prev = b.to;
        });
        // Barre de valeur animée.
        const tone = toneOf(row.value);
        const barW = Math.max(3, (sx(row.value) - x0) * p);
        U.roundRect(ctx, x0, by + bh * 0.3, barW, bh * 0.4, 3);
        ctx.fillStyle = STATUS_COLOR[tone];
        ctx.fill();
        // Repère du seuil.
        U.line(ctx, sx(def.target), by - 2, sx(def.target), by + bh + 2, C.text, 2);
        U.text(ctx, row.name, x0 - 8, y + rowH / 2, { size: 11, weight: 500, color: C.body, align: 'right', maxWidth: labelW - 12 });
        if (p > 0.85) {
          U.text(ctx, row.value.toFixed(1) + '%', x1 + 8, y + rowH / 2, { size: 11, weight: 600, color: C.text });
        }
        this.hit({
          type: 'rect', x: 0, y, w: W, h: rowH, color: STATUS_COLOR[tone],
          tip: U.tip(row.name, [
            [def.label.replace(' (%)', ''), row.value.toFixed(1) + '%'],
            ['Seuil Sphère', def.target + '%'],
            ['Statut', tone === 'good' ? 'Conforme' : tone === 'ok' ? 'À surveiller' : 'Hors norme']
          ])
        });
      });

      // Graduations.
      U.niceTicks(0, max, 5).forEach((t) => {
        U.text(ctx, t + '%', sx(t), H - 10, { size: 9, color: C.muted, align: 'center' });
      });
    }
  }

  /* --------------------------------------------------------------------------
   * G5 · Aires empilées : enfants touchés par les relais (millions) pour 3
   * interventions. Les séries masquées sont retirées de l'empilement.
   * ------------------------------------------------------------------------ */
  class StackedAreaChart extends Chart {
    select(view) {
      return view.stacked;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const years = d.years;
      const n = years.length;
      const A = this.plotArea(W, H, { top: 44, left: 46, right: 16, bottom: 28 });
      this.legend(ctx, d.series.map((s) => ({ key: s.key, label: s.label, color: s.color })), A.x, 14);
      U.text(ctx, 'Millions d’enfants touchés', A.x, A.y - 16, { size: 10, weight: 600, color: C.muted });

      const visible = d.series.filter((s) => !this.hidden[s.key]);
      const totals = years.map((_, i) => visible.reduce((s, ser) => s + ser.values[i], 0));
      const yMax = Math.max(1, Math.max.apply(null, totals) * 1.12);
      const ticks = U.niceTicks(0, yMax, 4);
      const yOf = (v) => A.y + A.h - (v / yMax) * A.h;
      const xOf = (i) => A.x + (i / (n - 1)) * A.w;

      ticks.forEach((t) => {
        U.line(ctx, A.x, yOf(t), A.x + A.w, yOf(t), C.grid, 1);
        U.text(ctx, t, A.x - 8, yOf(t), { size: 11, color: C.muted, align: 'right' });
      });
      years.forEach((y, i) => U.text(ctx, y, xOf(i), A.y + A.h + 14, { size: 11, color: C.muted, align: 'center' }));

      // Empilement : chaque série se pose sur la précédente, animé par p.
      const base = new Array(n).fill(0);
      visible.forEach((s) => {
        const low = base.slice();
        const high = base.map((b, i) => b + s.values[i] * p);
        ctx.beginPath();
        high.forEach((v, i) => (i ? ctx.lineTo(xOf(i), yOf(v)) : ctx.moveTo(xOf(i), yOf(v))));
        for (let i = n - 1; i >= 0; i--) ctx.lineTo(xOf(i), yOf(low[i]));
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, A.y, 0, A.y + A.h);
        grad.addColorStop(0, U.rgba(s.color, 0.85));
        grad.addColorStop(1, U.rgba(s.color, 0.45));
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        high.forEach((v, i) => (i ? ctx.lineTo(xOf(i), yOf(v)) : ctx.moveTo(xOf(i), yOf(v))));
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (let i = 0; i < n; i++) base[i] += s.values[i] * p;
      });

      // Survol par année : détail de chaque série et total.
      const step = A.w / (n - 1);
      years.forEach((y, i) => {
        this.hit({
          type: 'rect', x: xOf(i) - step / 2, y: A.y, w: step, h: A.h, color: C.primary,
          tip: U.tip('Campagne ' + y, visible.map((s) => [s.label, s.values[i].toFixed(1) + ' M']).concat([
            ['Total', totals[i].toFixed(1) + ' M']
          ]))
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
   * G14 · Sucettes : couverture 2022 (cercle creux) et 2024 (point plein),
   * la tige s'allonge pendant l'animation. Repère = objectif 80 %.
   * ------------------------------------------------------------------------ */
  class LollipopChart extends Chart {
    select(view) {
      return view.lollipop;
    }

    render(ctx, W, H, p) {
      const d = this.data;
      const rows = d.rows;
      const n = rows.length;
      if (!n) return;
      const top = 44;
      const labelW = Math.min(132, W * 0.3);
      const x0 = labelW;
      const x1 = W - 40;
      const sx = (v) => x0 + (U.clamp(v, 0, 100) / 100) * (x1 - x0);
      const rowH = Math.min(30, (H - top - 22) / n);

      // Légende personnalisée (années).
      ctx.save();
      U.dot(ctx, x0 + 4, 14, 4.5, '#fff', C.muted, 1.6);
      ctx.restore();
      U.text(ctx, '2022', x0 + 13, 14, { size: 11, weight: 500, color: C.body });
      U.dot(ctx, x0 + 64, 14, 4.5, C.primary);
      U.text(ctx, '2024', x0 + 73, 14, { size: 11, weight: 500, color: C.body });
      U.text(ctx, 'Objectif 80 %', x1, 14, { size: 10, weight: 600, color: C.navy, align: 'right' });

      // Repère de l'objectif.
      U.line(ctx, sx(d.target), top - 8, sx(d.target), top + n * rowH, C.navy, 1.2, [4, 4]);

      rows.forEach((r, i) => {
        const y = top + i * rowH + rowH / 2;
        const v24Now = r.v22 + (r.v24 - r.v22) * p;
        const improved = r.v24 >= r.v22;
        ctx.beginPath();
        ctx.moveTo(sx(r.v22), y);
        ctx.lineTo(sx(v24Now), y);
        ctx.strokeStyle = improved ? U.rgba(C.secondary, 0.85) : U.rgba(C.danger, 0.85);
        ctx.lineWidth = 2.4;
        ctx.stroke();
        U.dot(ctx, sx(r.v22), y, 4.5, '#fff', C.muted, 1.6);
        U.dot(ctx, sx(v24Now), y, 6, C.primary, '#fff', 1.2);
        U.text(ctx, r.name, x0 - 8, y, { size: 11, weight: 500, color: C.body, align: 'right', maxWidth: labelW - 12 });
        if (p > 0.85) {
          U.text(ctx, Math.round(r.v24) + '%', sx(r.v24) + 11, y, { size: 10, weight: 600, color: C.text });
        }
        const delta = r.v24 - r.v22;
        const hitIdx = this.hit({
          type: 'circle', x: sx(v24Now), y, r: 6, color: C.primary,
          tip: U.tip(r.name, [
            ['Couverture 2022', Math.round(r.v22) + '%'],
            ['Couverture 2024', Math.round(r.v24) + '%'],
            ['Évolution', (delta >= 0 ? '+' : '−') + Math.abs(delta).toFixed(0) + ' pts'],
            ['Objectif', d.target + '%']
          ])
        });
        if (this.hover === hitIdx) U.dot(ctx, sx(v24Now), y, 11, U.rgba(C.primary, 0.2));
      });

      // Graduations.
      [0, 25, 50, 75, 100].forEach((t) => {
        U.text(ctx, t + '%', sx(t), H - 8, { size: 9, color: C.muted, align: 'center' });
      });
    }
  }

  NS.charts.G4 = BulletChart;
  NS.charts.G5 = StackedAreaChart;
  NS.charts.G14 = LollipopChart;
})(window);
