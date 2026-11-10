/* ============================================================================
 * UNICEF NutriChild · charts/nc-charts-care.js
 * Graphiques de prise en charge CRENAS / CRENAM :
 *   G4  bulletsCRENAS — Bullet charts multi-zones vs seuils Sphère
 *   G13 polaireSaison — Polar chart 12 secteurs (saisonnalité / soudure)
 * 100 % Canvas 2D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  const C = NC.COLORS;

  /* =========================================================================
   * G4 — BULLET CHARTS : PERFORMANCE DES CENTRES CRENAS PAR ZONE
   * ======================================================================= */
  NC.registerChart('bulletsCRENAS', {
    label: 'Bullet charts des taux de guérison, d’abandon et de décès par zone',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const metric = d.metrics.filter((m) => m.key === d.activeMetric)[0] || d.metrics[0];
      const rows = d.rows.slice(0, d.maxRows || 12);
      const e = NC.ease(p);
      const plot = { x: 150, y: 32, w: Math.max(60, W - 150 - 62), h: H - 32 - 34 };
      const n = rows.length;
      const stepH = plot.h / n;
      const barH = Math.min(20, stepH * 0.56);

      /* Domaine de l'axe : 0 → 100 % pour la guérison ; 0 → 20 % pour les
       * taux d'échec (abandon / décès) afin de garder de la lisibilité. */
      const maxV = metric.key === 'recovery' ? 100 : 20;
      const xOf = (v) => plot.x + (NC.clamp(v, 0, maxV) / maxV) * plot.w;

      /* Bandes de qualité (ranges) selon la métrique */
      const ranges = metric.key === 'recovery'
        ? [{ to: 50, color: '#E5243B', label: 'Insuffisant' }, { to: 75, color: '#DDA63A', label: 'Acceptable' }, { to: 100, color: '#80BD41', label: 'Sphère atteint' }]
        : metric.key === 'abandon'
          ? [{ to: 10, color: '#80BD41', label: 'Sphère ≤ 10%' }, { to: 15, color: '#DDA63A', label: 'Limite' }, { to: 20, color: '#E5243B', label: 'Critique' }]
          : [{ to: 3, color: '#80BD41', label: 'Sphère ≤ 3%' }, { to: 6, color: '#DDA63A', label: 'Limite' }, { to: 20, color: '#E5243B', label: 'Critique' }];

      /* Fond des bandes sur toute la hauteur du graphique */
      ctx.save();
      let prev = 0;
      ranges.forEach((r) => {
        const x0 = xOf(prev), x1 = xOf(r.to);
        ctx.fillStyle = NC.hexA(r.color, 0.055);
        ctx.fillRect(x0, plot.y, x1 - x0, plot.h);
        prev = r.to;
      });
      ctx.restore();

      /* Graduations de l'axe X */
      ctx.save();
      ctx.font = NC.font(10.5, 500); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const ticks = metric.key === 'recovery' ? [0, 25, 50, 75, 100] : [0, 5, 10, 15, 20];
      ticks.forEach((v) => {
        const x = xOf(v);
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h + 4); ctx.stroke();
        ctx.fillStyle = C.label;
        ctx.fillText(v + '%', x, plot.y + plot.h + 7);
      });
      ctx.restore();

      rows.forEach((row, i) => {
        const y = plot.y + i * stepH + (stepH - barH) / 2;
        const v = row[metric.key];
        const grow = NC.stagger(p, i, n, 0.55);
        const bw = Math.max(2, (xOf(v) - plot.x) * grow);
        const key = 'r' + i;
        const isHover = ch.hover === key;
        const col = metric.invert ? (v <= metric.target ? C.secondary : v <= metric.target * 1.5 ? C.quaternary : C.danger)
                                  : (v >= metric.target ? C.secondary : v >= metric.target * 0.9 ? C.quaternary : C.danger);

        /* Trace de la barre (piste grise) */
        ctx.save();
        ctx.fillStyle = '#F1F5F9';
        NC.roundRight(ctx, plot.x, y, plot.w, barH, 6); ctx.fill();
        /* Barre de valeur : dégradé de la couleur de performance */
        const g = ctx.createLinearGradient(plot.x, y, plot.x + bw, y);
        g.addColorStop(0, NC.hexA(col, 0.55));
        g.addColorStop(1, NC.hexA(col, isHover ? 1 : 0.92));
        ctx.fillStyle = g;
        NC.roundRight(ctx, plot.x, y, bw, barH, 6); ctx.fill();
        /* Marqueur de la cible Sphère (trait vertical épais) */
        const tx = xOf(metric.target);
        ctx.strokeStyle = C.title; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(Math.round(tx) + 0.5, y - 3);
        ctx.lineTo(Math.round(tx) + 0.5, y + barH + 3);
        ctx.stroke();
        ctx.restore();

        /* Libellé de la zone */
        ctx.save();
        ctx.font = NC.font(11, isHover ? 700 : 600);
        ctx.fillStyle = isHover ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(NC.ellipsis(ctx, row.label, plot.x - 24), plot.x - 12, y + barH / 2);
        /* Valeur en bout de barre */
        ctx.font = NC.font(11, 800);
        ctx.fillStyle = col; ctx.textAlign = 'left';
        ctx.fillText(NC.fmtDec(v, 1) + ' %', plot.x + bw + 8, y + barH / 2);
        ctx.restore();

        ch.hit({
          type: 'rect', key: key, x: plot.x - 130, y: y - 3, w: plot.w + 200, h: barH + 8, index: i, clickable: true,
          tip: {
            title: row.label,
            sub: metric.label + ' · seuil Sphère ' + metric.target + ' %',
            color: col,
            rows: [
              { label: metric.label, value: NC.fmtDec(v, 1) + ' %' },
              { label: 'Seuil humanitaire Sphère', value: metric.target + ' %' },
              { label: 'Écart au seuil', value: (v >= metric.target ? '+' : '−') + NC.fmtDec(Math.abs(v - metric.target), 1) + ' pts' },
              { label: 'Admissions enregistrées', value: NC.fmtInt(row.admissions) + ' dossiers' }
            ],
            note: v >= metric.target ? '✓ Performance conforme aux standards Sphère' : '⚠ Performance sous le seuil d’excellence'
          }
        });
      });

      /* Étiquette de la cible en haut */
      ctx.save();
      ctx.font = NC.font(10, 700); ctx.fillStyle = C.title;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(metric.objLabel, xOf(metric.target), plot.y - 8);
      ctx.restore();

      /* Nombre de zones tracées (rappel discret en haut à gauche, sous l'axe) */
      ctx.save();
      ctx.font = NC.font(10, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(rows.length + ' zones classées par performance croissante', 6, plot.y - 10);
      ctx.restore();
    }
  });

  /* =========================================================================
   * G13 — POLAR CHART : SAISONNALITÉ DES ADMISSIONS (SOUDURE)
   * ======================================================================= */
  NC.registerChart('polaireSaison', {
    label: 'Rose des admissions CRENAS par mois avec mise en évidence de la soudure',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const cx = W / 2, cy = H / 2 + 6;
      const R = Math.min(W, H) / 2 - 40;
      const r0 = R * 0.24;
      const n = 12;
      const maxV = d.max;
      const slot = (Math.PI * 2) / n;

      /* Cercles de référence */
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1].forEach((f) => {
        ctx.beginPath(); ctx.arc(cx, cy, r0 + (R - r0) * f, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();

      d.values.forEach((v, i) => {
        const a0 = -Math.PI / 2 + i * slot + slot * 0.06;
        const a1 = a0 + slot * 0.88;
        const grow = NC.stagger(p, i, n, 0.5);
        const rr = r0 + (R - r0) * (v / maxV) * (0.35 + 0.65 * grow);
        const soudure = d.soudure.indexOf(i) >= 0;
        const key = 'm' + i;
        const isHover = ch.hover === key;
        const col = soudure ? C.danger : '#1CABE2';
        ctx.save();
        const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, Math.max(rr, r0 + 1));
        g.addColorStop(0, NC.hexA(col, isHover ? 0.95 : 0.75));
        g.addColorStop(1, NC.hexA(col, isHover ? 0.7 : 0.35));
        ctx.fillStyle = g;
        NC.arcSeg(ctx, cx, cy, r0, rr, a0, a1); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = isHover ? 2 : 1;
        ctx.stroke();
        ctx.restore();

        /* Étiquette du mois autour du cercle */
        const am = (a0 + a1) / 2;
        const lx = cx + Math.cos(am) * (R + 14), ly = cy + Math.sin(am) * (R + 14);
        ctx.save();
        ctx.font = NC.font(isHover || soudure ? 10.5 : 10, isHover ? 800 : 600);
        ctx.fillStyle = isHover ? C.title : (soudure ? C.danger : C.label);
        ctx.textAlign = Math.abs(Math.cos(am)) < 0.3 ? 'center' : (Math.cos(am) > 0 ? 'left' : 'right');
        ctx.textBaseline = 'middle';
        ctx.fillText(d.labels[i], lx, ly);
        ctx.restore();

        ch.hit({
          type: 'arc', key: key, cx: cx, cy: cy, r0: r0, r1: Math.max(rr, r0 + 6), a0: a0, a1: a1,
          tip: {
            title: d.labels[i] + ' 2024',
            sub: soudure ? '⚠ Période de soudure agricole' : 'Période de disponibilité alimentaire',
            color: col,
            rows: [
              { label: 'Admissions CRENAS', value: NC.fmtInt(v) + ' enfants' },
              { label: 'Part de l’année', value: NC.fmtDec((v / d.total) * 100, 1) + ' %' },
              { label: 'Écart au pic', value: v === maxV ? 'Pic annuel' : '−' + NC.fmtInt(maxV - v) + ' enfants' }
            ],
            note: 'Cumul annuel : ' + NC.fmtInt(d.total) + ' admissions'
          }
        });
      });

      /* Centre : total annuel */
      ctx.save();
      ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(cx, cy, r0 - 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = NC.font(9.5, 700); ctx.fillStyle = C.label;
      ctx.fillText('ADMISSIONS', cx, cy - 16);
      ctx.font = NC.font(15, 800); ctx.fillStyle = C.title;
      ctx.fillText(NC.fmtCompact(d.total, 1), cx, cy - 2);
      ctx.font = NC.font(9.5, 600); ctx.fillStyle = soudureColor(ctx) || C.danger;
      ctx.fillText('Pic : ' + d.labels[d.peakMonth], cx, cy + 14);
      ctx.restore();

      function soudureColor() { return C.danger; }

      /* Bandeau soudure */
      ctx.save();
      ctx.font = NC.font(10, 700); ctx.fillStyle = C.danger;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('● Soudure Juin → Septembre : ' +
        NC.fmtDec((d.soudure.reduce((s, i) => s + d.values[i], 0) / d.total) * 100, 1) + ' % des admissions annuelles', 4, 4);
      ctx.restore();
    }
  });
})(window);
