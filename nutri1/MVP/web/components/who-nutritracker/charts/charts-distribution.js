/* ============================================================================
 * NutriTracker · charts/charts-distribution.js
 * Graphiques de répartition / corrélation (Canvas pur) :
 *   G5  muacDonut   — Donut interactif (MAS / MAM / risque / normal)
 *   G6  bubble      — Scatter/Bubble couverture agents App vs guérison + régression
 *   G7  waterfall   — Cascade horizontale d'impact des interventions
 *   G12 quadrant    — Scatter 4 quadrants WASH vs stunting
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = global.NutriTracker;
  const C = NT.COLORS;

  /* Régression linéaire (moindres carrés) + coefficient r² */
  function regression(pts) {
    const n = pts.length; if (n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    pts.forEach((p) => { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; syy += p.y * p.y; });
    const den = n * sxx - sx * sx; if (!den) return null;
    const a = (n * sxy - sx * sy) / den, b = (sy - a * sx) / n;
    const r = (n * sxy - sx * sy) / Math.sqrt(den * (n * syy - sy * sy) || 1);
    return { a, b, r2: r * r };
  }
  NT.regression = regression;

  /* =========================================================================
   * G5 — Répartition de la malnutrition aiguë (dépistage PB)
   * ======================================================================= */
  NT.registerChart('muacDonut', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const slices = d.slices.filter((s) => !ch.hidden.has(s.key));
      const total = slices.reduce((a, s) => a + s.value, 0) || 1;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) / 2 - 12;
      const r0 = R * 0.66;
      const e = NT.ease(p);
      const gap = slices.length > 1 ? 0.025 : 0;
      let a = -Math.PI / 2;
      /* Piste de fond */
      ctx.beginPath(); ctx.arc(cx, cy, (R + r0) / 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#F1F5F9'; ctx.lineWidth = R - r0; ctx.stroke();
      slices.forEach((s) => {
        const span = (s.value / total) * Math.PI * 2 * e;
        const isHover = ch.hover === s.key;
        const off = isHover ? 7 * ch.hoverT : 0;
        const mid = a + span / 2;
        const ox = Math.cos(mid) * off, oy = Math.sin(mid) * off;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, R, a + gap / 2, a + span - gap / 2);
        ctx.arc(cx + ox, cy + oy, r0, a + span - gap / 2, a + gap / 2, true);
        ctx.closePath();
        ctx.fillStyle = s.color;
        if (isHover) { ctx.shadowColor = NT.hexA(s.color, 0.45); ctx.shadowBlur = 16; }
        ctx.fill(); ctx.shadowBlur = 0;
        /* Pourcentage sur la tranche si assez large */
        if (span > 0.35 && p >= 1) {
          ctx.font = NT.font(12, 800); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.value.toFixed(1) + '%', cx + ox + Math.cos(mid) * (R + r0) / 2, cy + oy + Math.sin(mid) * (R + r0) / 2);
          ctx.textBaseline = 'alphabetic';
        }
        ch.hit({ type: 'arc', key: s.key, cx, cy, r0, r1: R + 8, a0: a, a1: a + span,
          tip: { title: s.label, sub: s.sub, color: s.color, rows: [
            { color: s.color, label: 'Part des enfants', value: NT.fmtPct(s.value) },
            { label: 'Enfants estimés', value: NT.fmtInt((d.total * s.value) / 100) }] } });
        a += span;
      });
      /* Centre : nombre total d'enfants mesurés */
      const hov = slices.find((s) => s.key === ch.hover);
      ctx.textAlign = 'center';
      ctx.font = NT.font(Math.max(16, Math.min(26, r0 * 0.3)), 800);
      ctx.fillStyle = hov ? hov.color : C.title;
      ctx.fillText(hov ? NT.fmtPct(hov.value) : NT.fmtInt(d.total * e), cx, cy + 4);
      ctx.font = NT.font(11, 600); ctx.fillStyle = C.label;
      ctx.fillText(hov ? hov.label : 'enfants mesurés', cx, cy + 22);
      if (!hov) { ctx.font = NT.font(10, 500); ctx.fillText('Périmètre brachial · App', cx, cy - r0 * 0.38); }
    }
  });

  /* =========================================================================
   * Scatter générique (G6 bulles, G12 quadrants)
   * ======================================================================= */
  function scatter(ch, ctx, W, H, p, cfg) {
    const d = ch.data; const pts = d.points;
    const plot = { x: 48, y: 16, w: W - 48 - 20, h: H - 16 - 42 };
    const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
    const sx = cfg.xScale || NT.niceScale(Math.max(0, Math.min.apply(null, xs) - 8), Math.min(100, Math.max.apply(null, xs) + 6), 5);
    const sy = cfg.yScale || NT.niceScale(Math.max(0, Math.min.apply(null, ys) - 6), Math.min(cfg.yCap || 1e9, Math.max.apply(null, ys) + 6), 5);
    const xOf = (v) => plot.x + ((v - sx.min) / (sx.max - sx.min)) * plot.w;
    const yOf = (v) => plot.y + plot.h - ((v - sy.min) / (sy.max - sy.min)) * plot.h;
    if (cfg.background) cfg.background(ctx, plot, xOf, yOf, sx, sy);
    NT.drawYGrid(ctx, plot, sy, (v) => v + '%');
    NT.drawXGrid(ctx, plot, sx, (v) => v + (cfg.xUnit || '%'), { noLabels: false });
    ctx.font = NT.font(11, 600); ctx.fillStyle = C.body; ctx.textAlign = 'center';
    ctx.fillText(cfg.xTitle, plot.x + plot.w / 2, H - 4);
    ctx.save(); ctx.translate(11, plot.y + plot.h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(cfg.yTitle, 0, 0); ctx.restore();
    if (cfg.foreground) cfg.foreground(ctx, plot, xOf, yOf, sx, sy);

    const maxS = Math.max.apply(null, pts.map((q) => q.size || 1));
    const minR = cfg.minR || 5, maxR = cfg.maxR || Math.min(30, plot.w / 16);
    const order = pts.map((q, i) => i).sort((a, b) => (pts[b].size || 0) - (pts[a].size || 0)); // grosses bulles derrière
    order.forEach((i, rank) => {
      const q = pts[i];
      const k = NT.stagger(p, rank, pts.length, 0.55);
      const r = (cfg.fixedR || minR + Math.sqrt((q.size || 1) / maxS) * (maxR - minR)) * k;
      const x = xOf(q.x), y = yOf(q.y);
      const key = 'p' + i;
      const isHover = ch.hover === key;
      const col = cfg.colorOf ? cfg.colorOf(q) : q.color || C.primary;
      if (isHover) { ctx.beginPath(); ctx.arc(x, y, r + 7 * ch.hoverT, 0, Math.PI * 2); ctx.fillStyle = NT.hexA(col, 0.16); ctx.fill(); }
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
      ctx.fillStyle = NT.hexA(col, isHover ? 0.8 : 0.5); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.stroke();
      ch.hit({ type: 'pt', key, x, y, r: Math.max(r, 8), tip: cfg.tip(q, col) });
    });
    /* Libellés des points avec anti-chevauchement : les plus grosses bulles
     * (puis le point survolé) sont étiquetées en priorité. */
    if (p >= 1) {
      ctx.font = NT.font(10, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const placed = [];
      const hovIdx = ch.hover ? +ch.hover.slice(1) : -1;
      const labelOrder = (hovIdx >= 0 ? [hovIdx] : []).concat(order.filter((i) => i !== hovIdx));
      labelOrder.forEach((i) => {
        const q = pts[i];
        const r = cfg.fixedR || minR + Math.sqrt((q.size || 1) / maxS) * (maxR - minR);
        const label = q.label.length > 14 ? q.label.slice(0, 13) + '…' : q.label;
        const w = ctx.measureText(label).width + 4;
        let x = xOf(q.x) + r + 4; const y = yOf(q.y);
        if (x + w > plot.x + plot.w + 16) x = xOf(q.x) - r - 4 - w;
        const box = { x: x - 2, y: y - 7, w, h: 14 };
        if (placed.some((b) => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) return;
        placed.push(box);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = hovIdx === i ? C.title : C.body;
        ctx.fillText(label, x, y);
      });
      ctx.textBaseline = 'alphabetic';
    }
    return { plot, xOf, yOf, sx, sy };
  }

  /* =========================================================================
   * G6 — Corrélation : accès aux relais App vs taux de guérison
   * ======================================================================= */
  NT.registerChart('bubble', {
    draw(ch, ctx, W, H, p) {
      const pts = ch.data.points;
      const reg = regression(pts);
      ch.data.r2 = reg ? reg.r2 : 0;
      scatter(ch, ctx, W, H, p, {
        xTitle: 'Couverture agents équipés de l’App (%)', yTitle: 'Taux de guérison (%)', yCap: 100,
        foreground(ctx2, plot, xOf, yOf, sx) {
          if (!reg) return;
          const e = NT.ease(p);
          const x0 = sx.min, x1 = sx.min + (sx.max - sx.min) * e;
          ctx2.save();
          ctx2.beginPath(); ctx2.rect(plot.x, plot.y, plot.w, plot.h); ctx2.clip();
          ctx2.strokeStyle = C.quaternary; ctx2.lineWidth = 2; ctx2.setLineDash([8, 6]);
          ctx2.beginPath(); ctx2.moveTo(xOf(x0), yOf(reg.a * x0 + reg.b)); ctx2.lineTo(xOf(x1), yOf(reg.a * x1 + reg.b)); ctx2.stroke();
          ctx2.restore();
          /* Badge statistique */
          const label = 'Tendance : +' + reg.a.toFixed(2) + ' pt / pt · r² = ' + reg.r2.toFixed(2);
          ctx2.font = NT.font(11, 700);
          const tw = ctx2.measureText(label).width + 16;
          ctx2.fillStyle = '#F5F3FF'; NT.roundRect(ctx2, plot.x + 8, plot.y + 4, tw, 22, 11); ctx2.fill();
          ctx2.fillStyle = C.quaternary; ctx2.textAlign = 'left'; ctx2.textBaseline = 'middle';
          ctx2.fillText(label, plot.x + 16, plot.y + 15.5); ctx2.textBaseline = 'alphabetic';
        },
        tip: (q, col) => ({ title: q.label, sub: 'Couverture App × prise en charge', color: col, rows: [
          { label: 'Couverture agents App', value: q.x + '%' },
          { label: 'Taux de guérison', value: q.y + '%' },
          { label: 'Population < 5 ans', value: q.sizeLabel }] })
      });
    }
  });

  /* =========================================================================
   * G12 — Scatter 4 quadrants : WASH vs malnutrition chronique
   * ======================================================================= */
  const QUADS = [
    { key: 'tl', label: 'PRIORITÉ CRITIQUE', sub: 'WASH faible · stunting élevé', color: '#EF4444' },
    { key: 'tr', label: 'VIGILANCE NUTRITION', sub: 'WASH correct · stunting élevé', color: '#F59E0B' },
    { key: 'bl', label: 'RISQUE WASH', sub: 'WASH faible · stunting maîtrisé', color: '#0066CC' },
    { key: 'br', label: 'SITUATION FAVORABLE', sub: 'WASH correct · stunting maîtrisé', color: '#10B981' }
  ];
  NT.registerChart('quadrant', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const ys = d.points.map((q) => q.y);
      const yScale = NT.niceScale(0, Math.max(d.yMid + 10, Math.max.apply(null, ys) + 6), 5);
      const quadOf = (q) => (q.y >= d.yMid ? (q.x < d.xMid ? 0 : 1) : q.x < d.xMid ? 2 : 3);
      scatter(ch, ctx, W, H, p, {
        xTitle: 'Score accès eau potable / hygiène du ménage (évalué App)', yTitle: 'Stunting (%)', xUnit: '',
        xScale: { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] }, yScale, fixedR: W < 520 ? 6 : 7,
        colorOf: (q) => QUADS[quadOf(q)].color,
        background(ctx2, plot, xOf, yOf) {
          const mx = xOf(d.xMid), my = yOf(d.yMid);
          const rects = [[plot.x, plot.y, mx - plot.x, my - plot.y], [mx, plot.y, plot.x + plot.w - mx, my - plot.y],
            [plot.x, my, mx - plot.x, plot.y + plot.h - my], [mx, my, plot.x + plot.w - mx, plot.y + plot.h - my]];
          rects.forEach((r, i) => {
            ctx2.fillStyle = NT.hexA(QUADS[i].color, 0.05); ctx2.fillRect(r[0], r[1], r[2], r[3]);
            ctx2.font = NT.font(10, 800); ctx2.fillStyle = NT.hexA(QUADS[i].color, 0.75);
            ctx2.textAlign = i % 2 ? 'right' : 'left';
            const tx = i % 2 ? r[0] + r[2] - 8 : r[0] + 8;
            const ty = i < 2 ? r[1] + 16 : r[1] + r[3] - 10;
            ctx2.fillText(QUADS[i].label, tx, ty);
          });
        },
        foreground(ctx2, plot, xOf, yOf) {
          NT.dashedLine(ctx2, xOf(d.xMid), plot.y, xOf(d.xMid), plot.y + plot.h, '#94A3B8', null);
          NT.dashedLine(ctx2, plot.x, yOf(d.yMid), plot.x + plot.w, yOf(d.yMid), C.danger, 'Seuil OMS 20%', 'start');
        },
        tip: (q, col) => ({ title: q.label, sub: QUADS[quadOf(q)].sub, color: col, rows: [
          { label: 'Score WASH', value: q.x + ' / 100' }, { label: 'Stunting', value: NT.fmtPct(q.y) }, { label: 'Quadrant', value: QUADS[quadOf(q)].label.toLowerCase() }] })
      });
      /* Compteurs par quadrant (exposés pour la légende HTML) */
      ch.data.counts = [0, 0, 0, 0]; d.points.forEach((q) => ch.data.counts[quadOf(q)]++);
    }
  });
  NT.QUADS = QUADS;

  /* =========================================================================
   * G7 — Cascade d'impact des interventions communautaires (waterfall)
   * ======================================================================= */
  NT.registerChart('waterfall', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const rows = [{ label: d.startLabel, type: 'total', from: 0, to: d.start }];
      let cur = d.start;
      d.steps.forEach((s) => { rows.push({ label: s.label, type: 'step', from: cur, to: cur + s.value, value: s.value }); cur += s.value; });
      rows.push({ label: d.endLabel, type: 'end', from: 0, to: d.end });
      ctx.font = NT.font(12, 600);
      const labelW = Math.min(170, Math.max.apply(null, rows.map((r) => ctx.measureText(r.label).width)) + 16);
      const plot = { x: labelW, y: 8, w: W - labelW - 60, h: H - 8 - 28 };
      const range = d.start - d.end;
      const lo = Math.max(0, Math.floor((Math.min(d.start, d.end) - Math.max(2, Math.abs(range)) * 0.9) / 5) * 5);
      const sc = NT.niceScale(lo, Math.max(d.start, d.end) + 1, 5);
      const xOf = (v) => plot.x + ((v - sc.min) / (sc.max - sc.min)) * plot.w;
      NT.drawXGrid(ctx, plot, sc, (v) => v + '%');
      /* Indicateur d'axe tronqué */
      if (sc.min > 0) {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(plot.x - 4, plot.y + plot.h - 4, 8, 8);
        ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(plot.x - 5, plot.y + plot.h + 3); ctx.lineTo(plot.x - 1, plot.y + plot.h - 3); ctx.moveTo(plot.x + 1, plot.y + plot.h + 3); ctx.lineTo(plot.x + 5, plot.y + plot.h - 3); ctx.stroke();
      }
      const rowH = plot.h / rows.length;
      const barH = Math.min(26, rowH * 0.6);
      rows.forEach((r, i) => {
        const y = plot.y + i * rowH + (rowH - barH) / 2;
        const k = NT.stagger(p, i, rows.length, 0.6);
        const a = r.type === 'step' ? Math.min(r.from, r.to) : sc.min;
        const b = r.type === 'step' ? Math.max(r.from, r.to) : r.to;
        let x0 = xOf(a), x1 = xOf(b);
        if (r.type === 'step') { const full = x1 - x0; x0 = x1 - full * k; } // les baisses "se rétractent" vers la gauche
        else x1 = x0 + (x1 - x0) * k;
        const isHover = ch.hover === 'w' + i;
        let fill;
        if (r.type === 'total') { fill = ctx.createLinearGradient(x0, 0, x1, 0); fill.addColorStop(0, '#0099FF'); fill.addColorStop(1, '#0066CC'); }
        else if (r.type === 'end') { fill = ctx.createLinearGradient(x0, 0, x1, 0); fill.addColorStop(0, '#A78BFA'); fill.addColorStop(1, '#7C3AED'); }
        else fill = r.value <= 0 ? '#10B981' : '#EF4444';
        ctx.fillStyle = fill;
        if (isHover) { ctx.shadowColor = 'rgba(15,23,42,0.18)'; ctx.shadowBlur = 12; }
        NT.roundRect(ctx, x0, y, Math.max(2, x1 - x0), barH, 6); ctx.fill(); ctx.shadowBlur = 0;
        /* Libellé ligne */
        ctx.font = NT.font(12, r.type === 'step' ? 500 : 700); ctx.fillStyle = r.type === 'step' ? C.body : C.title;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(NT.ellipsis(ctx, r.label, labelW - 12), 0, y + barH / 2);
        /* Valeur */
        ctx.font = NT.font(12, 700);
        if (k > 0.2) {
          ctx.fillStyle = r.type === 'step' ? '#047857' : C.value;
          const txt = r.type === 'step' ? (r.value <= 0 ? '−' : '+') + Math.abs(r.value).toFixed(1) + ' pts' : r.to.toFixed(1) + '%';
          ctx.fillText(txt, Math.max(x0, x1) + 8, y + barH / 2);
        }
        ctx.textBaseline = 'alphabetic';
        /* Connecteur pointillé vers la ligne suivante */
        if (i < rows.length - 1 && p >= 1) {
          const nx = xOf(r.type === 'step' ? r.to : r.to);
          ctx.save(); ctx.strokeStyle = '#CBD5E1'; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(nx + 0.5, y + barH); ctx.lineTo(nx + 0.5, y + rowH); ctx.stroke(); ctx.restore();
        }
        ch.hit({ type: 'rect', key: 'w' + i, x: 0, y: plot.y + i * rowH, w: W, h: rowH,
          tip: { title: r.label, color: r.type === 'step' ? '#10B981' : r.type === 'end' ? '#7C3AED' : '#0066CC',
            sub: r.type === 'step' ? 'Contribution estimée (suivi App)' : 'Prévalence du retard de croissance',
            rows: r.type === 'step'
              ? [{ label: 'Impact', value: (r.value <= 0 ? '−' : '+') + Math.abs(r.value).toFixed(1) + ' pts' }, { label: 'Après intervention', value: NT.fmtPct(r.to) }, { label: 'Part de la baisse totale', value: NT.fmtPct((Math.abs(r.value) / Math.abs(range || 1)) * 100, 0) }]
              : [{ label: 'Stunting', value: NT.fmtPct(r.to) }] } });
      });
    }
  });
})(window);
