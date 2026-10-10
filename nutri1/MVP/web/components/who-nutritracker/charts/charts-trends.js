/* ============================================================================
 * NutriTracker · charts/charts-trends.js
 * Graphiques temporels (Canvas pur) :
 *   G1  stuntingTrend  — Multi-line area chart 2014-2024 (zone crise, seuil OMS)
 *   G4  seasonality    — Dual area chart mensuel N vs N-1 (période de soudure)
 *   G10 anemiaStack    — Stacked area chart 2017-2024 (3 groupes)
 *   G11 polarAlerts    — Rose / polar chart à 12 secteurs (signalements)
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = global.NutriTracker;
  const C = NT.COLORS;

  /* -------------------------------------------------------------------------
   * Utilitaire commun aux courbes : bandes verticales de survol par index X
   * ----------------------------------------------------------------------- */
  function addBands(ch, plot, n, xOf, tipFor) {
    for (let i = 0; i < n; i++) {
      const x0 = i === 0 ? plot.x - 8 : (xOf(i - 1) + xOf(i)) / 2;
      const x1 = i === n - 1 ? plot.x + plot.w + 8 : (xOf(i) + xOf(i + 1)) / 2;
      ch.hit({ type: 'rect', key: 'x' + i, x: x0, y: plot.y - 6, w: x1 - x0, h: plot.h + 12, index: i, tip: tipFor(i) });
    }
  }
  /* Ligne verticale de survol */
  function hoverLine(ctx, x, plot) {
    ctx.save();
    ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================================
   * G1 — Évolution du Stunting (2014-2024)
   * ======================================================================= */
  NT.registerChart('stuntingTrend', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const n = d.years.length;
      const plot = { x: 46, y: 20, w: W - 46 - 18, h: H - 20 - 34 };
      const all = series.flatMap((s) => s.values).concat([20]);
      const sc = NT.niceScale(Math.max(0, Math.min.apply(null, all) - 4), Math.max.apply(null, all) + 3, 5);
      const xOf = (i) => plot.x + (i / (n - 1)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;
      const e = NT.ease(p);

      /* Zone grisée 2020-2021 : impact crise / rupture synchro App */
      const i20 = d.years.indexOf(2020), i21 = d.years.indexOf(2021);
      const zx0 = xOf(i20) - plot.w / (n - 1) / 2, zx1 = xOf(i21) + plot.w / (n - 1) / 2;
      ctx.fillStyle = 'rgba(148,163,184,0.12)';
      ctx.fillRect(zx0, plot.y, zx1 - zx0, plot.h);
      ctx.save();
      ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(zx0 + 0.5, plot.y); ctx.lineTo(zx0 + 0.5, plot.y + plot.h); ctx.moveTo(zx1 - 0.5, plot.y); ctx.lineTo(zx1 - 0.5, plot.y + plot.h); ctx.stroke();
      ctx.restore();
      ctx.font = NT.font(10, 600); ctx.fillStyle = '#64748B'; ctx.textAlign = 'center';
      ctx.fillText('Impact crise /', (zx0 + zx1) / 2, plot.y + 12);
      ctx.fillText('Rupture synchro App', (zx0 + zx1) / 2, plot.y + 25);

      NT.drawYGrid(ctx, plot, sc, (v) => v + '%');
      const yearIdx = d.years.indexOf(d.selectedYear);
      NT.drawXLabels(ctx, plot, d.years.map(String), xOf, { every: W < 520 ? 2 : 1, activeIndex: yearIdx });

      /* Seuil d'urgence OMS 20% */
      NT.dashedLine(ctx, plot.x, yOf(20), plot.x + plot.w, yOf(20), C.danger, 'Seuil d’urgence OMS 20%');

      /* Révélation gauche → droite (clip animé) */
      ctx.save();
      ctx.beginPath(); ctx.rect(plot.x - 10, 0, (plot.w + 20) * e, H); ctx.clip();
      series.forEach((s, si) => {
        const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        // Aire dégradée sous la courbe
        ctx.beginPath();
        NT.smoothPath(ctx, pts);
        ctx.lineTo(pts[n - 1].x, plot.y + plot.h); ctx.lineTo(pts[0].x, plot.y + plot.h); ctx.closePath();
        ctx.fillStyle = NT.vGradient(ctx, plot.y, plot.y + plot.h, s.color, series.length > 3 ? 0.12 : 0.2, 0);
        ctx.fill();
        // Courbe
        ctx.beginPath(); NT.smoothPath(ctx, pts);
        ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (s.dashed) ctx.setLineDash([7, 5]);
        ctx.globalAlpha = ch.hover && ch.hoverSeries && ch.hoverSeries !== s.key ? 0.35 : 1;
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        void si;
      });
      ctx.restore();

      /* Points + halo sur l'index survolé */
      const hi = ch.hover ? +ch.hover.slice(1) : -1;
      if (hi >= 0 && p >= 1) {
        hoverLine(ctx, xOf(hi), plot);
        series.forEach((s) => NT.point(ctx, xOf(hi), yOf(s.values[hi]), s.color, ch.hoverT));
      } else if (p >= 1) {
        // Derniers points (2024) toujours visibles
        series.forEach((s) => NT.point(ctx, xOf(n - 1), yOf(s.values[n - 1]), s.color, 0));
      }

      addBands(ch, plot, n, xOf, (i) => ({
        title: 'Stunting · ' + d.years[i],
        sub: d.years[i] === 2020 || d.years[i] === 2021 ? 'Période de rupture de synchronisation' : 'Dépistages taille/âge via l’App',
        color: series[0] ? series[0].color : C.primary,
        rows: series.slice().sort((a, b) => b.values[i] - a.values[i]).map((s) => ({ color: s.color, label: s.label, value: NT.fmtPct(s.values[i]) }))
      }));
    }
  });

  /* =========================================================================
   * G4 — Saisonnalité & Pics de malnutrition (soudure agricole)
   * ======================================================================= */
  NT.registerChart('seasonality', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const plot = { x: 52, y: 26, w: W - 52 - 18, h: H - 26 - 34 };
      const series = [
        { key: 'prev', label: String(d.yearPrev), color: '#7C3AED', values: d.previous, dashed: true },
        { key: 'cur', label: String(d.yearCur), color: '#0066CC', values: d.current }
      ].filter((s) => !ch.hidden.has(s.key));
      const all = d.current.concat(d.previous);
      const sc = NT.niceScale(0, Math.max.apply(null, all) * 1.3, 5);
      const xOf = (i) => plot.x + (i / 11) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;
      const e = NT.ease(p);
      const step = plot.w / 11;

      /* Période sélectionnée (trimestre / mois) */
      if (d.highlight) {
        const a = Math.min.apply(null, d.highlight), b = Math.max.apply(null, d.highlight);
        ctx.fillStyle = 'rgba(0,102,204,0.06)';
        ctx.fillRect(xOf(a) - step / 2, plot.y, (b - a + 1) * step, plot.h);
      }
      /* Période de soudure Juin → Août : rectangle orange transparent */
      const sx0 = xOf(5) - step / 2, sx1 = xOf(7) + step / 2;
      ctx.fillStyle = '#FFF7ED'; ctx.fillRect(sx0, plot.y, sx1 - sx0, plot.h);
      ctx.fillStyle = 'rgba(255,107,53,0.55)'; ctx.fillRect(sx0, plot.y, sx1 - sx0, 2);
      ctx.font = NT.font(10, 700); ctx.fillStyle = '#C2410C'; ctx.textAlign = 'center';
      ctx.fillText('PÉRIODE DE SOUDURE', (sx0 + sx1) / 2, plot.y - 8);

      NT.drawYGrid(ctx, plot, sc, (v) => NT.fmtCompact(v));
      NT.drawXLabels(ctx, plot, d.months, xOf);

      series.forEach((s) => {
        const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(sc.min + (v - sc.min) * e) }));
        ctx.beginPath(); NT.smoothPath(ctx, pts);
        ctx.lineTo(pts[11].x, plot.y + plot.h); ctx.lineTo(pts[0].x, plot.y + plot.h); ctx.closePath();
        ctx.fillStyle = NT.vGradient(ctx, plot.y, plot.y + plot.h, s.color, s.key === 'cur' ? 0.26 : 0.12, 0);
        ctx.fill();
        ctx.beginPath(); NT.smoothPath(ctx, pts);
        ctx.strokeStyle = s.color; ctx.lineWidth = s.key === 'cur' ? 3 : 2;
        if (s.dashed) ctx.setLineDash([6, 5]);
        ctx.stroke(); ctx.setLineDash([]);
      });

      /* Marqueur du pic de dépistage (série courante) */
      if (!ch.hidden.has('cur') && p >= 0.6) {
        const a = NT.clamp((p - 0.6) / 0.4, 0, 1);
        let mi = 0; d.current.forEach((v, i) => { if (v > d.current[mi]) mi = i; });
        const px = xOf(mi), py = yOf(d.current[mi]);
        ctx.globalAlpha = a;
        const label = 'Pic : ' + NT.fmtInt(d.current[mi]) + ' cas · ' + d.months[mi];
        ctx.font = NT.font(11, 700);
        const tw = ctx.measureText(label).width + 16;
        let bx = NT.clamp(px - tw / 2, plot.x, plot.x + plot.w - tw), by = py - 38;
        if (by < plot.y + 4) by = py + 14;
        ctx.fillStyle = '#1E293B'; NT.roundRect(ctx, bx, by, tw, 22, 11); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + 8, by + 11.5); ctx.textBaseline = 'alphabetic';
        ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, by + (by < py ? 22 : 0)); ctx.lineTo(px, py + (by < py ? -6 : 6)); ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fillStyle = '#FF6B35'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const hi = ch.hover ? +ch.hover.slice(1) : -1;
      if (hi >= 0 && p >= 1) {
        hoverLine(ctx, xOf(hi), plot);
        series.forEach((s) => NT.point(ctx, xOf(hi), yOf(s.values[hi]), s.color, ch.hoverT));
      }
      addBands(ch, plot, 12, xOf, (i) => {
        const diff = d.previous[i] ? ((d.current[i] - d.previous[i]) / d.previous[i]) * 100 : 0;
        return {
          title: NT.model.MONTHS_LONG[i] + (i >= 5 && i <= 7 ? ' · Soudure' : ''),
          sub: 'Cas de malnutrition aiguë dépistés (App)',
          color: i >= 5 && i <= 7 ? C.tertiary : C.primary,
          rows: [
            { color: '#0066CC', label: String(d.yearCur), value: NT.fmtInt(d.current[i]) + ' cas' },
            { color: '#7C3AED', label: String(d.yearPrev), value: NT.fmtInt(d.previous[i]) + ' cas' },
            { label: 'Variation', value: (diff >= 0 ? '+' : '−') + Math.abs(diff).toFixed(1) + '%' }
          ]
        };
      });
    }
  });

  /* =========================================================================
   * G10 — Évolution empilée de l'anémie (3 groupes suivis dans l'App)
   * ======================================================================= */
  NT.registerChart('anemiaStack', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const n = d.years.length;
      const plot = { x: 46, y: 16, w: W - 46 - 18, h: H - 16 - 34 };
      const e = NT.ease(p);
      // Cumuls (empilement)
      const stacks = []; let acc = new Array(n).fill(0);
      series.forEach((s) => { const lo = acc.slice(); acc = acc.map((v, i) => v + s.values[i]); stacks.push({ s, lo, hi: acc.slice() }); });
      const sc = NT.niceScale(0, Math.max(10, Math.max.apply(null, acc)) * 1.08, 5);
      const xOf = (i) => plot.x + (i / (n - 1)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;
      NT.drawYGrid(ctx, plot, sc, (v) => v + '%');
      NT.drawXLabels(ctx, plot, d.years.map(String), xOf, { activeIndex: d.years.indexOf(d.selectedYear) });

      /* Aires du haut vers le bas pour un rendu net */
      for (let k = stacks.length - 1; k >= 0; k--) {
        const { s, lo, hi } = stacks[k];
        const top = hi.map((v, i) => ({ x: xOf(i), y: yOf(v * e) }));
        const bot = lo.map((v, i) => ({ x: xOf(i), y: yOf(v * e) })).reverse();
        ctx.beginPath(); NT.smoothPath(ctx, top);
        if (k === 0) { ctx.lineTo(top[n - 1].x, plot.y + plot.h); ctx.lineTo(top[0].x, plot.y + plot.h); }
        else NT.smoothPath(ctx, bot, false);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, plot.y, 0, plot.y + plot.h);
        g.addColorStop(0, NT.hexA(s.color, 0.55)); g.addColorStop(1, NT.hexA(s.color, 0.18));
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); NT.smoothPath(ctx, top);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
      }
      const hi = ch.hover ? +ch.hover.slice(1) : -1;
      if (hi >= 0 && p >= 1) {
        hoverLine(ctx, xOf(hi), plot);
        stacks.forEach(({ s, hi: h }) => NT.point(ctx, xOf(hi), yOf(h[hi]), s.color, ch.hoverT));
      }
      addBands(ch, plot, n, xOf, (i) => ({
        title: 'Anémie · ' + d.years[i], sub: 'Prévalence par groupe suivi (App santé maternelle)', color: '#7C3AED',
        rows: series.map((s) => ({ color: s.color, label: s.label, value: NT.fmtPct(s.values[i]) }))
      }));
    }
  });

  /* =========================================================================
   * G11 — Polar chart : fréquence des signalements terrain par mois
   * ======================================================================= */
  const POLAR_STOPS = [[0, '#93C5FD'], [0.45, '#0066CC'], [0.7, '#FF6B35'], [1, '#EF4444']];
  NT.registerChart('polarAlerts', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const cx = W / 2, cy = H / 2 + 4;
      const R = Math.min(W, H) / 2 - 30;
      const r0 = R * 0.24;
      const max = Math.max.apply(null, d.values);
      const sc = NT.niceScale(0, max, 4);
      const rOf = (v) => r0 + Math.sqrt(v / sc.max) * (R - r0);
      const slice = (Math.PI * 2) / 12;
      const total = d.values.reduce((a, b) => a + b, 0);

      /* Anneaux de graduation */
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      sc.ticks.slice(1).forEach((v) => { ctx.beginPath(); ctx.arc(cx, cy, rOf(v), 0, Math.PI * 2); ctx.stroke(); });
      ctx.font = NT.font(10, 500); ctx.fillStyle = C.label; ctx.textAlign = 'left';
      /* Libellés espacés d'au moins 16 px (l'échelle racine resserre les anneaux extérieurs) */
      let lastR = -99;
      sc.ticks.slice(1).reverse().forEach((v) => { const rr = rOf(v); if (Math.abs(lastR - rr) < 16) return; lastR = rr; ctx.fillText(NT.fmtInt(v), cx + 4, cy - rr + 11); });
      ctx.restore();

      d.values.forEach((v, i) => {
        const a0 = -Math.PI / 2 + i * slice + 0.025, a1 = a0 + slice - 0.05;
        const k = NT.stagger(p, i, 12, 0.5);
        const isHover = ch.hover === 'm' + i;
        const r = r0 + (rOf(v) - r0) * k + (isHover ? 6 * ch.hoverT : 0);
        const dim = d.highlight && d.highlight.indexOf(i) < 0;
        const col = NT.scaleColor(POLAR_STOPS, v / max);
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath();
        const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, Math.max(r, r0 + 1));
        g.addColorStop(0, NT.hexA('#E0EEFF', dim ? 0.3 : 0.9));
        g.addColorStop(1, col.replace('rgb', 'rgba').replace(')', dim ? ',0.3)' : ',0.95)'));
        ctx.fillStyle = g; ctx.fill();
        if (isHover) { ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke(); }
        // Labels mois
        const am = (a0 + a1) / 2;
        ctx.font = NT.font(11, i >= 5 && i <= 7 ? 700 : 500);
        ctx.fillStyle = i >= 5 && i <= 7 ? '#C2410C' : C.label;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d.months[i], cx + Math.cos(am) * (R + 16), cy + Math.sin(am) * (R + 16));
        ctx.textBaseline = 'alphabetic';
        ch.hit({ type: 'arc', key: 'm' + i, cx, cy, r0, r1: Math.max(rOf(v), r0 + 14) + 6, a0, a1,
          tip: { title: NT.model.MONTHS_LONG[i], sub: 'Alertes nutritionnelles envoyées par l’App', color: v / max > 0.6 ? '#FF6B35' : '#0066CC',
            rows: [{ label: 'Signalements', value: NT.fmtInt(v) }, { label: 'Part annuelle', value: NT.fmtPct((v / total) * 100) }] } });
      });
      /* Centre : total annuel */
      ctx.beginPath(); ctx.arc(cx, cy, r0 - 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'rgba(15,23,42,0.08)'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      ctx.textAlign = 'center'; ctx.fillStyle = C.title;
      ctx.font = NT.font(Math.max(13, Math.min(18, r0 * 0.42)), 800);
      ctx.fillText(NT.fmtInt(Math.round(total * NT.ease(p))), cx, cy + 2);
      ctx.font = NT.font(9, 600); ctx.fillStyle = C.label;
      ctx.fillText('ALERTES/AN', cx, cy + 15);
    }
  });
})(window);
