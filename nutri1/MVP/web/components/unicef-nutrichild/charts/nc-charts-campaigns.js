/* ============================================================================
 * UNICEF NutriChild · charts/nc-charts-campaigns.js
 * Graphiques des campagnes de supplémentation :
 *   G5  campagnesStack — Stacked area chart 2017 → 2024 (Vit A / Déparasitage / Zinc)
 *   G14 lollipopCouv   — Double lollipop de couverture 2022 vs 2024
 * 100 % Canvas 2D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  const C = NC.COLORS;

  function addBands(ch, plot, n, xOf, tipFor) {
    for (let i = 0; i < n; i++) {
      const x0 = i === 0 ? plot.x - 8 : (xOf(i - 1) + xOf(i)) / 2;
      const x1 = i === n - 1 ? plot.x + plot.w + 8 : (xOf(i) + xOf(i + 1)) / 2;
      ch.hit({ type: 'rect', key: 'x' + i, x: x0, y: plot.y - 6, w: x1 - x0, h: plot.h + 12, index: i, tip: tipFor(i) });
    }
  }

  /* =========================================================================
   * G5 — ÉVOLUTION EMPILÉE DES CAMPAGNES DE SUPPLÉMENTATION
   * ======================================================================= */
  NC.registerChart('campagnesStack', {
    label: 'Évolution empilée des campagnes de supplémentation 2017-2024',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const years = d.years;
      const n = years.length;
      const plot = { x: 48, y: 20, w: W - 48 - 16, h: H - 20 - 38 };
      const totals = years.map((y, i) => series.reduce((s, sr) => s + sr.values[i], 0));
      const sc = NC.niceScale(0, Math.max.apply(null, totals) * 1.05, 4);
      const xOf = (i) => plot.x + (n === 1 ? plot.w / 2 : (i / (n - 1)) * plot.w);
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;

      NC.drawYGrid(ctx, plot, sc, (v) => NC.fmtDec(v, 0) + ' M');
      NC.drawXLabels(ctx, plot, years.map(String), xOf, { every: W < 420 ? 2 : 1, activeIndex: n - 1 });

      /* Aires empilées, de bas en haut */
      let base = years.map(() => 0);
      ctx.save();
      ctx.beginPath(); ctx.rect(plot.x - 6, 0, (plot.w + 12) * e, H); ctx.clip();
      series.forEach((s) => {
        const lower = base.slice();
        const upper = years.map((y, i) => lower[i] + s.values[i]);
        const ptsTop = upper.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        const ptsBot = lower.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        ctx.beginPath();
        NC.smoothPath(ctx, ptsTop);
        for (let i = ptsBot.length - 1; i >= 0; i--) ctx.lineTo(ptsBot[i].x, ptsBot[i].y);
        ctx.closePath();
        ctx.fillStyle = NC.vGradient(ctx, plot.y, plot.y + plot.h, s.color, 0.85, 0.55);
        ctx.fill();
        /* Ligne supérieure de l'aire */
        ctx.beginPath(); NC.smoothPath(ctx, ptsTop);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.stroke();
        base = upper;
      });
      ctx.restore();

      /* Points de survol : une bande par année */
      addBands(ch, plot, n, (i) => xOf(i), (i) => {
        const tot = series.reduce((s, sr) => s + sr.values[i], 0);
        return {
          title: 'Campagne ' + years[i],
          sub: 'Enfants atteints par les relais communautaires',
          color: C.primary,
          rows: series.map((s) => ({ color: s.color, label: s.label, value: NC.fmtDec(s.values[i], 2) + ' M' }))
            .concat([{ label: 'Total atteint', value: NC.fmtDec(tot, 2) + ' M' }]),
          note: 'Saisie App mobile · interventions des relais communautaires'
        };
      });
      /* Marqueurs sur la dernière année (année en cours) */
      const li = n - 1;
      series.forEach((s) => {
        const v = series.slice(0, series.indexOf(s)).reduce((a, sr) => a + sr.values[li], 0) + s.values[li];
        NC.point(ctx, xOf(li), yOf(v), s.color, 0, 3.4);
      });
      if (ch.hover && ch.hover.indexOf('x') === 0) {
        const i = +ch.hover.slice(1);
        ctx.save();
        ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(Math.round(xOf(i)) + 0.5, plot.y); ctx.lineTo(Math.round(xOf(i)) + 0.5, plot.y + plot.h); ctx.stroke();
        ctx.restore();
      }
    }
  });

  /* =========================================================================
   * G14 — DOUBLE LOLLIPOP : COUVERTURE DES PROGRAMMES 2022 vs 2024
   * ======================================================================= */
  NC.registerChart('lollipopCouv', {
    label: 'Double lollipop de progression de la couverture entre 2022 et 2024',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const rows = d.rows.slice(0, d.maxRows || 12);
      const labelW = 132;
      const plot = { x: labelW, y: 30, w: Math.max(50, W - labelW - 62), h: H - 30 - 34 };
      const n = rows.length;
      const stepH = plot.h / n;
      const xOf = (v) => plot.x + (NC.clamp(v, 0, 100) / 100) * plot.w;

      /* Grille verticale */
      ctx.save();
      ctx.font = NC.font(10.5, 500);
      [0, 25, 50, 75, 100].forEach((v) => {
        const x = xOf(v);
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
        ctx.fillStyle = C.label; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(v + '%', x, plot.y + plot.h + 6);
      });
      ctx.restore();

      /* Ligne d'objectif (80 %) */
      ctx.save();
      ctx.strokeStyle = NC.hexA(C.secondary, 0.9); ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(xOf(d.objective), plot.y - 6); ctx.lineTo(xOf(d.objective), plot.y + plot.h + 4); ctx.stroke();
      ctx.restore();

      rows.forEach((row, i) => {
        const y = plot.y + i * stepH + stepH / 2;
        const grow = NC.stagger(p, i, n, 0.5);
        const x22 = xOf(row.v2022), x24 = xOf(row.v2024);
        const xx24 = plot.x + (x24 - plot.x) * grow;
        const key = 'l' + i;
        const isHover = ch.hover === key;
        const gain = row.v2024 - row.v2022;
        const col = row.v2024 >= d.objective ? C.secondary : row.v2024 >= d.objective - 12 ? C.quaternary : C.tertiary;

        /* Tige de progression 2022 → 2024 (épaisseur colorée) */
        ctx.save();
        ctx.strokeStyle = NC.hexA(col, isHover ? 0.5 : 0.28);
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x22, y); ctx.lineTo(xx24, y); ctx.stroke();
        /* Marqueur 2022 (creux, gris) */
        ctx.beginPath();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 2;
        ctx.arc(x22, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        /* Marqueur 2024 (plein, couleur de performance) */
        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.arc(xx24, y, isHover ? 7.5 : 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        if (isHover) {
          ctx.beginPath(); ctx.fillStyle = NC.hexA(col, 0.18);
          ctx.arc(xx24, y, 13, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        /* Libellé de zone */
        ctx.save();
        ctx.font = NC.font(11, isHover ? 700 : 600);
        ctx.fillStyle = isHover ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(NC.ellipsis(ctx, row.label, labelW - 16), labelW - 12, y - 4);
        ctx.font = NC.font(9.5, 700); ctx.fillStyle = gain >= 0 ? C.secondary : C.danger;
        ctx.fillText((gain >= 0 ? '↑ +' : '↓ ') + NC.fmtDec(Math.abs(gain), 1) + ' pts', labelW - 12, y + 10);
        ctx.restore();

        /* Valeur 2024 en bout */
        ctx.save();
        ctx.font = NC.font(11, 800); ctx.fillStyle = col;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(NC.fmtDec(row.v2024, 1) + '%', xOf(100) + 10, y);
        ctx.restore();

        ch.hit({
          type: 'rect', key: key, x: plot.x - 130, y: y - stepH * 0.45, w: plot.w + 200, h: stepH * 0.9, index: i,
          tip: {
            title: row.label, sub: d.metric + ' · campagne 2022 vs 2024',
            color: col,
            rows: [
              { label: 'Couverture 2022', value: NC.fmtDec(row.v2022, 1) + ' %' },
              { label: 'Couverture 2024', value: NC.fmtDec(row.v2024, 1) + ' %' },
              { label: 'Progression', value: (gain >= 0 ? '+' : '') + NC.fmtDec(gain, 1) + ' pts' },
              { label: 'Objectif régional', value: d.objective + ' %' }
            ],
            note: row.v2024 >= d.objective ? '✓ Objectif atteint' : '⚠ Encore ' + NC.fmtDec(d.objective - row.v2024, 1) + ' pts à combler'
          }
        });
      });

      /* Légende 2022 / 2024 + objectif */
      ctx.save();
      const ly = plot.y + plot.h + 22;
      let lx = plot.x - labelW + 6;
      ctx.font = NC.font(10, 600); ctx.textBaseline = 'middle';
      ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 2;
      ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.label; ctx.textAlign = 'left';
      ctx.fillText('Couverture 2022', lx + 9, ly);
      lx += 9 + ctx.measureText('Couverture 2022').width + 18;
      ctx.beginPath(); ctx.fillStyle = C.primary; ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.label;
      ctx.fillText('Couverture 2024', lx + 9, ly);
      lx += 9 + ctx.measureText('Couverture 2024').width + 18;
      ctx.strokeStyle = NC.hexA(C.secondary, 0.9); ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 18, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.secondary;
      ctx.fillText('Objectif ' + d.objective + '%', lx + 24, ly);
      ctx.restore();
    }
  });
})(window);
