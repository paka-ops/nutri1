/* ============================================================================
 * WFP NutriTracker · charts/wfp-charts-markets.js
 * Graphiques « Marchés & Prix terrain » — Canvas API pure :
 *   G3  priceHeatmap — Heatmap temporelle des prix (24 mois × 8 produits)
 *   G5  priceMuac    — Scatter + régression : prix du mil vs malnutrition aigüe
 *   G9  cerealTrend  — Multi-line area : prix des 5 céréales (20 trimestres)
 *   G10 availAccess  — Dual bar : disponibilité kcal vs accès économique
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFPTracker;
  const C = WFP.COLORS;

  /* Échelle de couleur « écart à la normale » : < 0.8 vert → > 2.0 rouge */
  const RATIO_STOPS = [[0, '#10B981'], [0.35, '#84CC16'], [0.5, '#FCD34D'], [0.68, '#F59E0B'], [0.85, '#F97316'], [1, '#EF4444']];
  const ratioT = (r) => WFP.clamp((r - 0.8) / (2.0 - 0.8), 0, 1);

  /* =========================================================================
   * G3 — Heatmap temporelle des prix du marché (relevés App agents)
   * ======================================================================= */
  WFP.registerChart('priceHeatmap', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const rows = d.rows.length, cols = d.cols.length;
      const labelW = Math.min(110, Math.max(72, W * 0.14));
      const legendH = 34;
      const plot = { x: labelW, y: 24, w: W - labelW - 10, h: H - 24 - legendH };
      const cw = plot.w / cols, chh = plot.h / rows;
      const showPrice = cw > 34 && chh > 17;

      /* En-têtes mois (tous les 2 mois si peu de place) */
      ctx.save();
      ctx.font = WFP.font(9.5, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      d.cols.forEach((m, i) => {
        if (i % (cw < 30 ? 3 : cw < 44 ? 2 : 1)) return;
        ctx.fillStyle = i === d.currentCol ? C.primary : C.label;
        ctx.fillText(m, plot.x + i * cw + cw / 2, plot.y - 6);
      });
      ctx.restore();

      d.cells.forEach((row, ri) => {
        const y = plot.y + ri * chh;
        ctx.save();
        ctx.font = WFP.font(10.5, 600);
        ctx.fillStyle = C.value; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, d.rows[ri], labelW - 10), labelW - 9, y + chh / 2);
        ctx.restore();

        row.forEach((cell, ci) => {
          const x = plot.x + ci * cw;
          const t = ratioT(cell.ratio);
          const prog = WFP.stagger(p, (ci / cols) * 0.7 + (ri / rows) * 0.3, 1, 0.5);
          const hovered = ch.hover === 'c' + ri + '_' + ci;
          ctx.save();
          WFP.roundRect(ctx, x + 1, y + 1, cw - 2, chh - 2, 4);
          ctx.fillStyle = WFP.scaleColor(RATIO_STOPS, t);
          ctx.globalAlpha = 0.2 + 0.8 * prog;
          ctx.fill();
          ctx.globalAlpha = 1;
          if (hovered) { ctx.strokeStyle = C.title; ctx.lineWidth = 1.6; ctx.stroke(); }
          else if (ci === d.currentCol) { ctx.strokeStyle = 'rgba(245,158,11,0.8)'; ctx.lineWidth = 1.2; ctx.stroke(); }
          ctx.restore();

          if (showPrice && prog > 0.8) {
            ctx.save();
            ctx.font = WFP.font(cw > 46 ? 10 : 9, 700);
            ctx.fillStyle = t > 0.55 ? 'rgba(255,255,255,0.96)' : 'rgba(120,53,15,0.85)';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(WFP.fmtInt(cell.price), x + cw / 2, y + chh / 2);
            ctx.restore();
          }

          ch.hit({
            type: 'rect', key: 'c' + ri + '_' + ci, x: x, y: y, w: cw, h: chh,
            tip: {
              title: cell.product + ' · ' + cell.month, sub: 'Relevé de prix App terrain', color: WFP.scaleColor(RATIO_STOPS, t),
              rows: [
                { label: 'Prix moyen', value: WFP.fmtInt(cell.price) + ' FCFA/kg' },
                { label: 'Écart à la normale', value: '×' + cell.ratio.toFixed(2) },
                { label: 'Écart en %', value: (cell.ratio >= 1 ? '+' : '−') + Math.abs(Math.round((cell.ratio - 1) * 100)) + ' %' },
                { label: 'Niveau d’alerte', value: cell.ratio > 1.6 ? 'Critique' : cell.ratio > 1.25 ? 'Élevé' : cell.ratio > 1.05 ? 'Modéré' : 'Normal' }
              ],
              note: 'Collecté par les agents marchés de l’App PAM'
            }
          });
        });
      });

      /* Légende continue : ×0.8 → ×2.0 */
      const lw = Math.min(220, W * 0.4), lx = W - lw - 12, ly = H - legendH + 14;
      const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
      for (let i = 0; i <= 10; i++) grad.addColorStop(i / 10, WFP.scaleColor(RATIO_STOPS, i / 10));
      ctx.save();
      ctx.font = WFP.font(9.5, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Écart au prix normal', lx, ly - 12);
      ctx.fillStyle = grad;
      WFP.roundRect(ctx, lx, ly, lw, 9, 4.5); ctx.fill();
      ctx.fillStyle = C.label; ctx.textBaseline = 'top';
      ctx.fillText('×0.8', lx, ly + 11);
      ctx.textAlign = 'center'; ctx.fillText('×1.4', lx + lw / 2, ly + 11);
      ctx.textAlign = 'right'; ctx.fillText('×2.0+', lx + lw, ly + 11);
      ctx.restore();
    }
  });

  /* =========================================================================
   * G5 — Corrélation prix marchés vs malnutrition aigüe (scatter)
   * ======================================================================= */
  WFP.registerChart('priceMuac', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const pts = d.points;
      const plot = { x: 46, y: 16, w: W - 46 - 18, h: H - 16 - 44 };
      const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
      const scX = WFP.niceScale(Math.min.apply(null, xs) - 12, Math.max.apply(null, xs) + 12, 5);
      const scY = WFP.niceScale(0, Math.max.apply(null, ys) + 2, 5);
      const xOf = (v) => plot.x + ((v - scX.min) / (scX.max - scX.min)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - scY.min) / (scY.max - scY.min)) * plot.h;
      const e = ch.e;

      WFP.drawYGrid(ctx, plot, scY, (v) => v + '%');
      WFP.drawXGrid(ctx, plot, scX, (v) => WFP.fmtInt(v));

      /* Titres d'axes */
      ctx.save();
      ctx.font = WFP.font(10, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(d.xLabel, plot.x + plot.w / 2, H - 4);
      ctx.save();
      ctx.translate(12, plot.y + plot.h / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText(d.yLabel, 0, 0);
      ctx.restore();
      ctx.restore();

      /* Ligne de régression linéaire (ambre) */
      const reg = d.regression;
      ctx.save();
      ctx.strokeStyle = C.primary; ctx.lineWidth = 2.4; ctx.setLineDash([9, 5]);
      ctx.globalAlpha = e;
      ctx.beginPath();
      ctx.moveTo(xOf(reg.x0), yOf(reg.y0));
      ctx.lineTo(WFP.lerp(xOf(reg.x0), xOf(reg.x1), e), yOf(reg.y0 + (reg.y1 - reg.y0) * e));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
      if (e > 0.8) {
        ctx.save();
        ctx.font = WFP.font(10, 700); ctx.fillStyle = C.primary;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('r = ' + reg.r.toFixed(2) + ' · +100 FCFA ⇒ +' + (reg.a * 100).toFixed(1) + ' pts MUAC', plot.x + 6, plot.y + 4);
        ctx.restore();
      }

      /* Points (taille = population, couleur = phase IPC) */
      pts.forEach((q, i) => {
        const prog = WFP.stagger(p, i, pts.length, 0.6);
        const hov = ch.hover === 'p' + i;
        const r = q.r * (hov ? 1.25 : 1) * prog;
        ctx.save();
        if (hov) { ctx.beginPath(); ctx.arc(xOf(q.x), yOf(q.y), r + 6, 0, Math.PI * 2); ctx.fillStyle = WFP.hexA(q.color, 0.18); ctx.fill(); }
        ctx.beginPath(); ctx.arc(xOf(q.x), yOf(q.y), r, 0, Math.PI * 2);
        ctx.fillStyle = WFP.hexA(q.color, hov ? 0.9 : 0.55); ctx.fill();
        ctx.lineWidth = hov ? 2.4 : 1.4;
        ctx.strokeStyle = hov ? C.title : WFP.hexA(q.color, 0.95);
        ctx.stroke();
        ctx.restore();
        ch.hit({
          type: 'pt', key: 'p' + i, x: xOf(q.x), y: yOf(q.y), r: Math.max(10, r + 4),
          tip: {
            title: q.label + ' · ' + q.sub, sub: 'Relevé terrain App PAM', color: q.color,
            rows: [
              { label: 'Prix du mil', value: WFP.fmtInt(q.x) + ' FCFA/kg' },
              { label: 'Malnutrition aigüe (MUAC)', value: q.y.toFixed(1) + ' %' },
              { label: 'Phase IPC', value: 'IPC ' + q.ipc },
              { label: 'Ménages enquêtés', value: WFP.fmtInt(q.households) }
            ],
            note: 'Taille du point ∝ population'
          }
        });
      });
    }
  });

  /* =========================================================================
   * G9 — Prix des 5 céréales clés (20 trimestres) — multi-line area
   * ======================================================================= */
  WFP.registerChart('cerealTrend', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const n = d.labels.length;
      const plot = { x: 52, y: 18, w: W - 52 - 16, h: H - 18 - 34 };
      const all = series.reduce((a, s) => a.concat(s.values), [0]);
      const sc = WFP.niceScale(Math.max(0, Math.min.apply(null, all) - 40), Math.max.apply(null, all) + 60, 5);
      const xOf = (i) => plot.x + (i / (n - 1)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;
      const e = ch.e;

      WFP.drawYGrid(ctx, plot, sc, (v) => WFP.fmtInt(v));
      WFP.drawXLabels(ctx, plot, d.labels, xOf, { every: W < 620 ? 4 : 2 });

      /* Bandes années (alternance discrète) */
      ctx.save();
      ctx.fillStyle = 'rgba(245,158,11,0.035)';
      for (let i = 0; i < n; i += 8) {
        const x0 = xOf(i) - (plot.w / (n - 1)) / 2;
        const x1 = xOf(Math.min(n - 1, i + 3)) + (plot.w / (n - 1)) / 2;
        ctx.fillRect(x0, plot.y, x1 - x0, plot.h);
      }
      ctx.restore();

      ctx.save();
      ctx.beginPath(); ctx.rect(plot.x - 10, 0, (plot.w + 20) * e, H); ctx.clip();
      series.forEach((s) => {
        const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        ctx.beginPath();
        WFP.smoothPath(ctx, pts);
        ctx.lineTo(pts[n - 1].x, plot.y + plot.h); ctx.lineTo(pts[0].x, plot.y + plot.h); ctx.closePath();
        ctx.fillStyle = WFP.vGradient(ctx, plot.y, plot.y + plot.h, s.color, series.length > 2 ? 0.16 : 0.26, 0.02);
        ctx.fill();
        ctx.beginPath(); WFP.smoothPath(ctx, pts);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.globalAlpha = ch.hoverSeries && ch.hoverSeries !== s.key ? 0.3 : 1;
        ctx.stroke(); ctx.globalAlpha = 1;
      });
      ctx.restore();

      const hi = ch.hover && ch.hover[0] === 'x' ? +ch.hover.slice(1) : -1;
      if (hi >= 0 && p >= 0.99) {
        WFP.hoverLine(ctx, xOf(hi), plot);
        series.forEach((s) => WFP.point(ctx, xOf(hi), yOf(s.values[hi]), s.color, ch.hoverT));
      }

      /* Bandes de survol */
      for (let i = 0; i < n; i++) {
        const x0 = i === 0 ? plot.x - 4 : (xOf(i - 1) + xOf(i)) / 2;
        const x1 = i === n - 1 ? plot.x + plot.w + 4 : (xOf(i) + xOf(i + 1)) / 2;
        ch.hit({
          type: 'rect', key: 'x' + i, x: x0, y: plot.y - 6, w: x1 - x0, h: plot.h + 12,
          tip: {
            title: d.labels[i], sub: 'Prix moyen marchés · ' + d.unit, color: C.primary,
            rows: series.map((s) => ({ color: s.color, label: s.label, value: WFP.fmtInt(s.values[i]) + ' ' + d.unit })),
            note: 'Relevés hebdomadaires agrégés (App PAM)'
          }
        });
      }
    }
  });

  /* =========================================================================
   * G10 — Disponibilité vs accès économique (dual bar)
   * ======================================================================= */
  WFP.registerChart('availAccess', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const n = d.zones.length;
      const plot = { x: 44, y: 18, w: W - 44 - 14, h: H - 18 - 52 };
      const sc = WFP.niceScale(0, Math.max(100, Math.max.apply(null, d.availability.map((v) => (v / d.availabilityNorm) * 100)) + 8), 5);
      const groupW = plot.w / n;
      const barW = Math.min(15, groupW * 0.3);
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;

      WFP.drawYGrid(ctx, plot, sc, (v) => v + '%');

      d.zones.forEach((z, i) => {
        const cx = plot.x + i * groupW + groupW / 2;
        const avail = (d.availability[i] / d.availabilityNorm) * 100;
        const access = d.access[i];
        const gap = d.gap[i];
        const prog = WFP.stagger(p, i, n, 0.5);
        const hov = ch.hover === 'z' + i;

        /* Surlignage du « gap d'accès économique » */
        if (gap > 8) {
          const yTop = yOf(Math.max(avail, access)), yBot = yOf(Math.min(avail, access));
          ctx.save();
          ctx.fillStyle = 'rgba(239,68,68,' + (0.1 + 0.1 * prog) + ')';
          ctx.fillRect(cx - groupW / 2 + 2, yTop, groupW - 4, Math.max(0, yBot - yTop));
          ctx.restore();
        }

        /* Barre disponibilité (bleue) */
        const h1 = (yOf(0) - yOf(avail)) * prog;
        ctx.save();
        WFP.roundTop(ctx, cx - barW - 2, yOf(0) - h1, barW, h1, 6);
        ctx.fillStyle = hov ? '#2563EB' : C.info; ctx.fill();
        ctx.restore();
        /* Barre accès économique (ambre) */
        const h2 = (yOf(0) - yOf(access)) * prog;
        ctx.save();
        WFP.roundTop(ctx, cx + 2, yOf(0) - h2, barW, h2, 6);
        ctx.fillStyle = hov ? '#D97706' : C.primary; ctx.fill();
        ctx.restore();

        /* Étiquette du gap */
        if (gap > 8 && prog > 0.8) {
          ctx.save();
          ctx.font = WFP.font(9.5, 700); ctx.fillStyle = C.danger;
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText('−' + gap + ' pts', cx, Math.min(yOf(avail), yOf(access)) - 4);
          ctx.restore();
        }

        /* Libellé zone (incliné) */
        ctx.save();
        ctx.font = WFP.font(10, hov ? 700 : 500);
        ctx.fillStyle = hov ? C.title : C.label;
        ctx.translate(cx, plot.y + plot.h + 9);
        ctx.rotate(-0.5);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, z, 78), 0, 0);
        ctx.restore();

        ch.hit({
          type: 'rect', key: 'z' + i, x: cx - groupW / 2, y: plot.y, w: groupW, h: plot.h,
          tip: {
            title: z, sub: 'Disponibilité vs accès économique', color: gap > 8 ? C.danger : C.tertiary,
            rows: [
              { color: C.info, label: 'Disponibilité', value: WFP.fmtInt(d.availability[i]) + ' kcal/j (' + avail.toFixed(0) + '% des besoins)' },
              { color: C.primary, label: 'Accès économique', value: access + ' % des ménages' },
              { label: 'Gap d’accès', value: (gap > 0 ? '−' : '+') + Math.abs(gap) + ' points' }
            ],
            note: gap > 8 ? 'La nourriture existe mais n’est pas achetable' : 'Accès globalement aligné sur la disponibilité'
          }
        });
      });
    }
  });
})(window);
