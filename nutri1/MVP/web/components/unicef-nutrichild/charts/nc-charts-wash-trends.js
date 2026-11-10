/* ============================================================================
 * UNICEF NutriChild · charts/nc-charts-wash-trends.js
 * Graphiques d'analyse causale et temporelle :
 *   G7  scatterWASH  — Nuage WASH (eau/hygiène) vs retard de croissance + régression
 *   G10 historiqueMAS— Multi-line area chart de la MAS 2016 → 2024 (zones d'alerte)
 *   G11 donutCauses  — Donut à double anneau des déterminants de la malnutrition
 * 100 % Canvas 2D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  const C = NC.COLORS;

  /* =========================================================================
   * G7 — SCATTER : ACCÈS EAU/HYGIÈNE (WASH) vs RETARD DE CROISSANCE
   * ======================================================================= */
  NC.registerChart('scatterWASH', {
    label: 'Nuage de points WASH et retard de croissance avec droite de régression',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const plot = { x: 46, y: 22, w: W - 46 - 20, h: H - 22 - 40 };
      const pts = d.points;
      const xs = pts.map((o) => o.x), ys = pts.map((o) => o.y);
      const scX = NC.niceScale(Math.max(0, Math.min.apply(null, xs) - 6), Math.min(100, Math.max.apply(null, xs) + 6), 4);
      const scY = NC.niceScale(Math.max(0, Math.min.apply(null, ys) - 4), Math.max.apply(null, ys) + 4, 4);
      const xOf = (v) => plot.x + ((v - scX.min) / (scX.max - scX.min)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - scY.min) / (scY.max - scY.min)) * plot.h;

      /* Quadrants : repères aux médianes des deux variables */
      const medX = scX.min + (scX.max - scX.min) * 0.5;
      const medY = scY.min + (scY.max - scY.min) * 0.5;
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xOf(medX), plot.y); ctx.lineTo(xOf(medX), plot.y + plot.h);
      ctx.moveTo(plot.x, yOf(medY)); ctx.lineTo(plot.x + plot.w, yOf(medY));
      ctx.stroke();
      /* Étiquettes des quadrants */
      ctx.font = NC.font(10, 700);
      const quad = [
        ['Accès faible · Stunting élevé', plot.x + 8, plot.y + 14, C.danger, 'left'],
        ['Accès élevé · Stunting élevé', plot.x + plot.w - 8, plot.y + 14, C.tertiary, 'right'],
        ['Accès faible · Stunting faible', plot.x + 8, plot.y + plot.h - 10, C.quaternary, 'left'],
        ['Accès élevé · Stunting faible', plot.x + plot.w - 8, plot.y + plot.h - 10, C.secondary, 'right']
      ];
      ctx.globalAlpha = 0.75;
      quad.forEach((q) => { ctx.fillStyle = q[3]; ctx.textAlign = q[4]; ctx.fillText(q[0], q[1], q[2] - (q[2] > medY ? 0 : 18)); });
      ctx.globalAlpha = 1;
      ctx.restore();

      NC.drawYGrid(ctx, plot, scY, (v) => v + '%');
      NC.drawXGrid(ctx, plot, scX, null);
      ctx.save();
      ctx.font = NC.font(10.5, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = C.value;
      ctx.fillText('Score WASH du ménage (%)  →', plot.x, plot.y + plot.h + 12);
      ctx.textAlign = 'right';
      ctx.fillText('Stunting (%)', plot.x + plot.w, plot.y + plot.h + 12);
      ctx.restore();

      /* Droite de régression animée (révélation de la gauche vers la droite) */
      const r = d.regression;
      const xA = scX.min, xB = scX.max;
      const yA = r.a * xA + r.b, yB = r.a * xB + r.b;
      const xMid = xA + (xB - xA) * e;
      const yMid = r.a * xMid + r.b;
      ctx.save();
      ctx.strokeStyle = NC.hexA(C.danger, 0.85); ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(xOf(xA), yOf(yA)); ctx.lineTo(xOf(xMid), yOf(yMid)); ctx.stroke();
      ctx.restore();
      /* Badge de régression (bas centre du graphique : n'occulte aucune donnée) */
      ctx.save();
      const bw2 = 214, bh2 = 40;
      const lx = plot.x + plot.w / 2 - bw2 / 2, ly = plot.y + plot.h - bh2 - 8;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      NC.roundRect(ctx, lx, ly, bw2, bh2, 10); ctx.fill();
      ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.title; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = NC.font(11, 800);
      ctx.fillText('R² = ' + NC.fmtDec(r.r2, 2), lx + 11, ly + 13);
      ctx.font = NC.font(9.5, 600); ctx.fillStyle = C.body;
      ctx.fillText('y = ' + NC.fmtDec(r.a, 2) + 'x + ' + NC.fmtDec(r.b, 1) + ' · ' + pts.length + ' entités', lx + 11, ly + 28);
      ctx.restore();

      /* Points (pays ou districts) */
      pts.forEach((pt, i) => {
        const st = NC.stagger(p, i, pts.length, 0.6);
        if (st <= 0) return;
        const x = xOf(pt.x), y = yOf(pt.y);
        const rad = Math.max(4, (pt.r || 5) * (0.5 + 0.5 * st));
        const key = 's' + i;
        const isHover = ch.hover === key;
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = NC.hexA(pt.mas > 10 ? C.danger : pt.mas > 5 ? C.tertiary : C.primary, isHover ? 0.95 : 0.55);
        ctx.arc(x, y, isHover ? rad + 2 : rad, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        if (isHover) {
          ctx.font = NC.font(11, 700); ctx.fillStyle = C.title;
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(pt.label, x, y - rad - 6);
        }
        ctx.restore();
        ch.hit({
          type: 'pt', key: key, x: x, y: y, r: Math.max(rad + 6, 12),
          tip: {
            title: pt.label, sub: 'Corrélation WASH × retard de croissance',
            color: C.primary,
            rows: [
              { label: 'Score WASH (eau/latrines/mains)', value: NC.fmtDec(pt.x, 0) + ' %' },
              { label: 'Prévalence du stunting', value: NC.fmtDec(pt.y, 1) + ' %' },
              { label: 'Prévalence MAS', value: NC.fmtDec(pt.mas, 1) + ' %' },
              { label: 'Position', value: (pt.x >= medX ? 'Accès WASH élevé' : 'Accès WASH faible') + ' · ' + (pt.y >= medY ? 'stunting élevé' : 'stunting maîtrisé') }
            ],
            note: 'Régression linéaire : R² = ' + NC.fmtDec(r.r2, 2) + ' · pente ' + NC.fmtDec(r.a, 2)
          }
        });
      });

      /* Rappel du coefficient de corrélation */
      ctx.save();
      ctx.font = NC.font(10, 700); ctx.fillStyle = C.primary;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('● ' + pts.length + ' entités · corrélation WASH → stunting (R² = ' + NC.fmtDec(r.r2, 2) + ')', plot.x - 40, 4);
      ctx.restore();
    }
  });

  /* =========================================================================
   * G10 — ÉVOLUTION HISTORIQUE DE LA MALNUTRITION AIGÜE (2016 → 2024)
   * ======================================================================= */
  NC.registerChart('historiqueMAS', {
    label: 'Évolution historique de la malnutrition aigüe sévère par pays',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const years = d.years;
      const n = years.length;
      const plot = { x: 44, y: 24, w: W - 44 - 16, h: H - 24 - 36 };
      const maxV = Math.max(d.severe + 3, Math.max.apply(null, series.length ? series[0].values : [0]) + 2,
        ...series.map((s) => Math.max.apply(null, s.values))) + 1;
      const sc = NC.niceScale(0, maxV, 5);
      const xOf = (i) => plot.x + (i / (n - 1)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;

      /* Zones d'alerte OMS : > 10 % (urgence) et > 15 % (critique) */
      ctx.save();
      ctx.fillStyle = NC.hexA(C.tertiary, 0.09);
      ctx.fillRect(plot.x, yOf(d.severe), plot.w, yOf(d.alert) - yOf(d.severe));
      ctx.fillStyle = NC.hexA(C.danger, 0.10);
      ctx.fillRect(plot.x, yOf(sc.max), plot.w, yOf(d.severe) - yOf(sc.max));
      ctx.restore();

      NC.drawYGrid(ctx, plot, sc, (v) => v + '%');
      NC.drawXLabels(ctx, plot, years.map(String), xOf, { every: W < 460 ? 2 : 1, activeIndex: n - 1 });

      /* Seuils */
      NC.dashedLine(ctx, plot.x, yOf(d.alert), plot.x + plot.w, yOf(d.alert), C.tertiary, 'Seuil d’urgence OMS 10%');
      NC.dashedLine(ctx, plot.x, yOf(d.severe), plot.x + plot.w, yOf(d.severe), C.danger, 'Seuil critique 15%', 'right');

      /* Zone de crise 2020-2021 */
      const i0 = years.indexOf(2020), i1 = years.indexOf(2021);
      if (i0 >= 0 && i1 >= 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(148,163,184,0.12)';
        ctx.fillRect(xOf(i0) - 4, plot.y, xOf(i1) - xOf(i0) + 8, plot.h);
        ctx.font = NC.font(9.5, 600); ctx.fillStyle = C.body;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('Impact crise /', (xOf(i0) + xOf(i1)) / 2, plot.y + 6);
        ctx.fillText('rupture de suivi', (xOf(i0) + xOf(i1)) / 2, plot.y + 18);
        ctx.restore();
      }

      /* Courbes + aires */
      ctx.save();
      ctx.beginPath(); ctx.rect(plot.x - 6, 0, (plot.w + 12) * e, H); ctx.clip();
      series.forEach((s) => {
        const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        if (!s.dashed) {
          ctx.beginPath(); NC.smoothPath(ctx, pts);
          ctx.lineTo(pts[pts.length - 1].x, plot.y + plot.h);
          ctx.lineTo(pts[0].x, plot.y + plot.h); ctx.closePath();
          ctx.fillStyle = NC.vGradient(ctx, plot.y, plot.y + plot.h, s.color, 0.16, 0);
          ctx.fill();
        }
        ctx.beginPath(); NC.smoothPath(ctx, pts);
        ctx.strokeStyle = NC.hexA(s.color, s.dashed ? 0.8 : 1);
        ctx.lineWidth = s.dashed ? 1.8 : 2.6;
        if (s.dashed) ctx.setLineDash([6, 4]);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke(); ctx.setLineDash([]);
        /* Points + zones de survol */
        pts.forEach((pt, i) => {
          const key = 'p' + i + '-' + s.key;
          const hov = ch.hover === key;
          if (i === pts.length - 1 || hov) NC.point(ctx, pt.x, pt.y, s.color, hov ? 1 : 0, hov ? 5 : 4);
          ch.hit({
            type: 'pt', key: key, x: pt.x, y: pt.y, r: 11,
            tip: {
              title: s.label, sub: 'Prévalence MAS · ' + years[i],
              color: s.color,
              rows: [
                { label: 'Prévalence MAS', value: NC.fmtDec(s.values[i], 2) + ' %' },
                { label: 'Statut OMS', value: s.values[i] > d.severe ? 'Urgence critique (> 15%)' : s.values[i] > d.alert ? 'Urgence (> 10%)' : 'Sous le seuil d’alerte' },
                { label: 'Évolution vs 2023', value: i > 0 ? ((s.values[i] - s.values[i - 1] >= 0 ? '+' : '') + NC.fmtDec(s.values[i] - s.values[i - 1], 2) + ' pts') : '—' }
              ],
              note: 'Séries issues des dépistages MUAC consolidés'
            }
          });
        });
      });
      ctx.restore();

      /* Repère vertical sur l'année survolée */
      if (ch.hover && ch.hover.charAt(0) === 'p') {
        const i = parseInt(ch.hover.slice(1).split('-')[0], 10);
        if (!isNaN(i) && i >= 0 && i < n) {
          ctx.save();
          ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(Math.round(xOf(i)) + 0.5, plot.y); ctx.lineTo(Math.round(xOf(i)) + 0.5, plot.y + plot.h); ctx.stroke();
          ctx.restore();
        }
      }
    }
  });

  /* =========================================================================
   * G11 — DONUT À DOUBLE ANNEAU : DÉTERMINANTS DE LA MALNUTRITION
   * ======================================================================= */
  NC.registerChart('donutCauses', {
    label: 'Donut à double anneau des causes directes et sous-jacentes de la malnutrition',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      /* Le donut occupe la partie haute ; les deux légendes se placent en bas */
      const legendH = Math.max(d.externe.length, d.interne.length) * 12 + 34;
      const cx = W / 2, cy = Math.max(96, (H - legendH) / 2 + 6);
      const R = Math.max(52, Math.min(W / 2 - 44, (H - legendH) / 2 - 6));
      const rExt0 = R * 0.72, rExt1 = R * 0.98;
      const rInt0 = R * 0.42, rInt1 = R * 0.66;

      /* Anneau extérieur : causes directes */
      let a = -Math.PI / 2;
      d.externe.forEach((s, i) => {
        const span = (s.value / 100) * Math.PI * 2;
        const grow = NC.stagger(p, i, d.externe.length, 0.45);
        const a1 = a + span * grow;
        const key = 'ext' + i;
        const hov = ch.hover === key;
        ctx.save();
        ctx.fillStyle = NC.hexA(s.color, hov ? 1 : 0.86);
        NC.arcSeg(ctx, cx, cy, rExt0, rExt1 + (hov ? 3 : 0), a, a1);
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        /* Libellé externe si le segment est suffisant */
        if (s.value >= 10) {
          const am = a + span / 2;
          ctx.save();
          ctx.font = NC.font(hov ? 11 : 10, hov ? 800 : 600);
          ctx.fillStyle = hov ? C.title : C.value;
          ctx.textAlign = Math.cos(am) > 0 ? 'left' : 'right';
          ctx.textBaseline = 'middle';
          const lx = cx + Math.cos(am) * (rExt1 + 8), ly = cy + Math.sin(am) * (rExt1 + 8);
          ctx.fillText(NC.fmtDec(s.value, 0) + '%', lx, ly);
          ctx.restore();
        }
        ch.hit({
          type: 'arc', key: key, cx: cx, cy: cy, r0: rExt0, r1: rExt1 + 4, a0: a, a1: a + span,
          tip: {
            title: s.label, sub: 'Cause directe de la malnutrition',
            color: s.color,
            rows: [
              { label: 'Contribution relative', value: NC.fmtDec(s.value, 0) + ' %' },
              { label: 'Anneau', value: 'Extérieur — causes immédiates' }
            ],
            note: 'Modèle UNICEF des causes de la malnutrition'
          }
        });
        a += span;
      });

      /* Anneau intérieur : causes sous-jacentes */
      a = -Math.PI / 2;
      d.interne.forEach((s, i) => {
        const span = (s.value / 100) * Math.PI * 2;
        const grow = NC.stagger(p, i, d.interne.length, 0.45);
        const a1 = a + span * grow;
        const key = 'int' + i;
        const hov = ch.hover === key;
        ctx.save();
        ctx.fillStyle = NC.hexA(s.color, hov ? 1 : 0.8);
        NC.arcSeg(ctx, cx, cy, rInt0, rInt1 + (hov ? 2.5 : 0), a, a1);
        ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.restore();
        ch.hit({
          type: 'arc', key: key, cx: cx, cy: cy, r0: rInt0, r1: rInt1 + 3, a0: a, a1: a + span,
          tip: {
            title: s.label, sub: 'Cause sous-jacente (enquêtes terrain)',
            color: s.color,
            rows: [
              { label: 'Contribution relative', value: NC.fmtDec(s.value, 0) + ' %' },
              { label: 'Anneau', value: 'Intérieur — causes structurelles' }
            ],
            note: 'Identifiée dans les questionnaires ménages de l’App'
          }
        });
        a += span;
      });

      /* Centre : message clé */
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = NC.font(9.5, 700); ctx.fillStyle = C.label;
      ctx.fillText('CAUSES', cx, cy - 12);
      ctx.font = NC.font(11, 800); ctx.fillStyle = C.title;
      ctx.fillText('MULTIPLES', cx, cy + 1);
      ctx.font = NC.font(9, 600); ctx.fillStyle = C.body;
      ctx.fillText('agir sur les 1000 jours', cx, cy + 14);
      ctx.restore();

      /* Légendes en pied de graphique : causes directes | causes sous-jacentes */
      ctx.save();
      ctx.textBaseline = 'middle';
      const colW = W / 2;
      const baseY = Math.max(cy + R + 16, H - legendH + 6);
      const drawLegend = (items, x0, y0, title, maxW) => {
        ctx.font = NC.font(9, 800); ctx.fillStyle = C.label;
        ctx.textAlign = 'left';
        ctx.fillText(title, x0, y0 - 10);
        items.forEach((s, i) => {
          const y = y0 + i * 12;
          ctx.beginPath(); ctx.fillStyle = NC.hexA(s.color, 0.9); ctx.arc(x0 + 4, y, 3.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = C.body; ctx.font = NC.font(9.5, 600); ctx.textAlign = 'left';
          ctx.fillText(NC.ellipsis(ctx, s.label, maxW - 34) + ' · ' + s.value + '%', x0 + 12, y);
        });
      };
      drawLegend(d.externe, 6, baseY + 10, '▲ CAUSES DIRECTES', colW - 12);
      drawLegend(d.interne, colW + 6, baseY + 10, '■ CAUSES SOUS-JACENTES', colW - 12);
      ctx.restore();
    }
  });
})(window);
