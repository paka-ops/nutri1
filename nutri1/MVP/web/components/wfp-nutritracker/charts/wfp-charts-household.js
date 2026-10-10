/* ============================================================================
 * WFP NutriTracker · charts/wfp-charts-household.js
 * Graphiques « Ménages & stratégies d'adaptation » — Canvas API pure :
 *   G4  csiRadar      — Radar 5 axes des stratégies d'adaptation (CSI)
 *   G7  alertsRose    — Rose chart 12 mois (saisonnalité des alertes)
 *   G11 hddsHistogram — Histogramme + courbe de distribution du score HDDS
 *   G12 fcsDumbbell   — Dumbbell chart FCS 2020 vs 2024
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFPTracker;
  const C = WFP.COLORS;

  /* =========================================================================
   * G4 — Radar CSI (5 axes)
   * ======================================================================= */
  WFP.registerChart('csiRadar', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const axes = d.axes, na = axes.length;
      const cx = W / 2, cy = H / 2 + 4;
      const R = Math.min(W, H) / 2 - 44;
      const maxV = Math.max.apply(null, series.reduce((a, s) => a.concat(s.values), [1])) * 1.15;
      const ang = (i) => -Math.PI / 2 + (i / na) * Math.PI * 2;
      const pt = (i, v) => ({ x: cx + Math.cos(ang(i)) * (v / maxV) * R, y: cy + Math.sin(ang(i)) * (v / maxV) * R });
      const e = ch.e;

      /* Anneaux + grille */
      ctx.save();
      for (let ring = 1; ring <= 4; ring++) {
        const rr = (ring / 4) * R;
        ctx.beginPath();
        for (let i = 0; i <= na; i++) {
          const a = ang(i % na);
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = ring === 4 ? C.axis : C.grid; ctx.lineWidth = 1; ctx.stroke();
      }
      /* Rayons + libellés d'axes */
      ctx.font = WFP.font(10, 600);
      axes.forEach((label, i) => {
        const a = ang(i);
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.strokeStyle = C.grid; ctx.stroke();
        const lx = cx + Math.cos(a) * (R + 16), ly = cy + Math.sin(a) * (R + 14);
        ctx.fillStyle = C.label;
        ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
        ctx.textBaseline = Math.sin(a) > 0.5 ? 'top' : Math.sin(a) < -0.5 ? 'bottom' : 'middle';
        /* Libellé sur 2 lignes si trop long */
        const words = String(label).split(' ');
        if (words.length > 1 && ctx.measureText(label).width > 92) {
          const mid = Math.ceil(words.length / 2);
          ctx.fillText(words.slice(0, mid).join(' '), lx, ly - 6);
          ctx.fillText(words.slice(mid).join(' '), lx, ly + 6);
        } else ctx.fillText(label, lx, ly);
      });
      ctx.restore();

      /* Polygones des séries */
      series.forEach((s, si) => {
        const prog = WFP.stagger(p, si, series.length, 0.35);
        const pts = s.values.map((v, i) => {
          const q = pt(i, v * prog);
          return q;
        });
        ctx.save();
        WFP.poly(ctx, pts);
        ctx.fillStyle = WFP.hexA(s.color, s.dashed ? 0.06 : 0.2);
        ctx.fill();
        ctx.lineWidth = s.dashed ? 1.6 : 2.4;
        ctx.strokeStyle = s.color;
        if (s.dashed) ctx.setLineDash([6, 4]);
        ctx.globalAlpha = ch.hoverSeries && ch.hoverSeries !== s.key ? 0.35 : 1;
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.restore();
        pts.forEach((q, i) => {
          const hov = ch.hover === 's' + si + 'a' + i;
          WFP.point(ctx, q.x, q.y, s.color, hov ? ch.hoverT : 0);
          ch.hit({
            type: 'pt', key: 's' + si + 'a' + i, x: q.x, y: q.y, r: 12,
            tip: {
              title: s.label, sub: axes[i], color: s.color,
              rows: [
                { label: 'Fréquence × sévérité', value: s.values[i].toFixed(1) },
                { label: 'CSI total de la zone', value: (s.values.reduce((a, b) => a + b, 0) / 3).toFixed(1) }
              ],
              note: 'Questionnaires ménages mVAM (App PAM)'
            }
          });
        });
      });

      /* Centre : score CSI de la première série */
      if (series.length && e > 0.6) {
        const total = series[0].values.reduce((a, b) => a + b, 0) / 3;
        ctx.save();
        ctx.font = WFP.font(15, 800); ctx.fillStyle = series[0].color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = (e - 0.6) / 0.4;
        ctx.fillText(total.toFixed(1), cx, cy - 2);
        ctx.font = WFP.font(8.5, 600); ctx.fillStyle = C.label;
        ctx.fillText('rCSI', cx, cy + 11);
        ctx.restore();
      }
    }
  });

  /* =========================================================================
   * G7 — Saisonnalité des alertes (rose chart 12 secteurs)
   * ======================================================================= */
  WFP.registerChart('alertsRose', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const n = d.values.length;
      const cx = W / 2, cy = H / 2 + 6;
      const R = Math.min(W / 2, H / 2) - 34;
      const maxV = Math.max.apply(null, d.values) * 1.05;
      const e = ch.e;

      /* Anneaux de référence */
      ctx.save();
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath(); ctx.arc(cx, cy, (ring / 3) * R, 0, Math.PI * 2);
        ctx.strokeStyle = ring === 3 ? C.axis : C.grid; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();

      /* Zone de soudure agricole (juin → septembre) en halo rouge */
      const aLean0 = ((d.lean[0] - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      const aLean1 = ((d.lean[d.lean.length - 1] + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R + 12, aLean0, aLean1); ctx.closePath();
      ctx.fillStyle = 'rgba(239,68,68,0.07)'; ctx.fill();
      ctx.strokeStyle = 'rgba(239,68,68,0.25)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = WFP.font(9.5, 700); ctx.fillStyle = 'rgba(239,68,68,0.9)';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const amid = (aLean0 + aLean1) / 2;
      ctx.fillText('SOUDURE', cx + Math.cos(amid) * (R + 24), cy + Math.sin(amid) * (R + 24));
      ctx.restore();

      d.values.forEach((v, i) => {
        const a0 = ((i - 0.46) / n) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 0.46) / n) * Math.PI * 2 - Math.PI / 2;
        const prog = WFP.stagger(p, i, n, 0.5);
        const r = (v / maxV) * R * prog;
        const lean = d.lean.indexOf(i) >= 0;
        const hov = ch.hover === 'm' + i;
        const color = lean ? (hov ? '#DC2626' : C.danger) : (hov ? '#D97706' : C.primary);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r + (hov ? 4 : 0), a0, a1); ctx.closePath();
        const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, r + 1);
        g.addColorStop(0, WFP.hexA(color, 0.45));
        g.addColorStop(1, WFP.hexA(color, 0.95));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();

        /* Libellé mois */
        const am = (a0 + a1) / 2;
        ctx.save();
        ctx.font = WFP.font(10, hov || lean ? 700 : 600);
        ctx.fillStyle = hov ? C.title : lean ? 'rgba(185,28,28,0.9)' : C.label;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d.labels[i], cx + Math.cos(am) * (R + 14), cy + Math.sin(am) * (R + 14));
        ctx.restore();

        ch.hit({
          type: 'arc', key: 'm' + i, cx, cy, r0: 0, r1: R + 12, a0: ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2, a1: ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2,
          tip: {
            title: d.labels[i], sub: 'Alertes de vulnérabilité · relais communautaires', color: color,
            rows: [
              { label: 'Alertes transmises', value: WFP.fmtInt(v) },
              { label: 'Part du pic annuel', value: Math.round((v / maxV) * 100) + ' %' },
              { label: 'Total annuel', value: WFP.fmtInt(d.values.reduce((a, b) => a + b, 0)) }
            ],
            note: lean ? 'Période de soudure agricole (juin → septembre)' : 'Hors période de soudure'
          }
        });
      });
      void e;
    }
  });

  /* =========================================================================
   * G11 — Distribution du score HDDS (histogramme + courbe)
   * ======================================================================= */
  WFP.registerChart('hddsHistogram', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const n = d.counts.length;
      const plot = { x: 52, y: 20, w: W - 52 - 16, h: H - 20 - 40 };
      const maxV = Math.max.apply(null, d.counts) * 1.12;
      const sc = WFP.niceScale(0, maxV, 4);
      const slot = plot.w / n;
      const barW = Math.min(26, slot * 0.66);
      const yOf = (v) => plot.y + plot.h - (v / sc.max) * plot.h;
      const e = ch.e;

      WFP.drawYGrid(ctx, plot, sc, (v) => WFP.fmtCompact(v));

      /* Seuil « diversité alimentaire minimale » (score ≥ 6) */
      const xThr = plot.x + 6 * slot;
      ctx.save();
      ctx.fillStyle = 'rgba(16,185,129,0.06)';
      ctx.fillRect(xThr, plot.y, plot.x + plot.w - xThr, plot.h);
      ctx.restore();
      WFP.dashedLine(ctx, xThr, plot.y, xThr, plot.y + plot.h, C.tertiary, 'Diversité minimale ≥ 6', 'start');

      /* Barres (score < 6 ambre, ≥ 6 vert) */
      d.counts.forEach((v, i) => {
        const prog = WFP.stagger(p, i, n, 0.5);
        const x = plot.x + i * slot + (slot - barW) / 2;
        const h = (plot.y + plot.h - yOf(v)) * prog;
        const hov = ch.hover === 's' + i;
        const color = i >= d.threshold ? C.tertiary : i >= 4 ? C.primary : C.danger;
        ctx.save();
        WFP.roundTop(ctx, x, plot.y + plot.h - h, barW, h, 6);
        ctx.fillStyle = hov ? WFP.mix(color, '#000000', 0.15) : color;
        ctx.globalAlpha = hov ? 1 : 0.9;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.font = WFP.font(10, i === Math.round(d.mean) ? 800 : 500);
        ctx.fillStyle = i === Math.round(d.mean) ? C.title : C.label;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(i, plot.x + i * slot + slot / 2, plot.y + plot.h + 9);
        ctx.restore();

        const pct = (v / d.households) * 100;
        ch.hit({
          type: 'rect', key: 's' + i, x: plot.x + i * slot, y: plot.y, w: slot, h: plot.h,
          tip: {
            title: 'Score HDDS ' + i + ' / 12', sub: 'Groupes alimentaires consommés (24 h)', color: color,
            rows: [
              { label: 'Ménages', value: WFP.fmtInt(v) },
              { label: 'Part de l’échantillon', value: pct.toFixed(1) + ' %' },
              { label: 'Classification', value: i >= d.threshold ? 'Diversité minimale atteinte' : i >= 4 ? 'Diversité moyenne' : 'Faible diversité' }
            ],
            note: 'Formulaires ménages remplis dans l’App'
          }
        });
      });

      /* Courbe de distribution lissée */
      const pts = d.counts.map((v, i) => ({ x: plot.x + i * slot + slot / 2, y: yOf(v * e) }));
      ctx.save();
      ctx.beginPath(); WFP.smoothPath(ctx, pts);
      ctx.strokeStyle = C.quaternary; ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();

      /* Marqueur de moyenne */
      const xm = plot.x + d.mean * slot + slot / 2;
      ctx.save();
      ctx.strokeStyle = C.title; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(xm, plot.y - 4); ctx.lineTo(xm, plot.y + plot.h); ctx.stroke();
      ctx.font = WFP.font(10, 700); ctx.fillStyle = C.title;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('Moyenne ' + d.mean.toFixed(1), xm, plot.y - 6);
      ctx.restore();

      /* Axe X : titre */
      ctx.save();
      ctx.font = WFP.font(10, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('Score HDDS (0 → 12 groupes alimentaires)', plot.x + plot.w / 2, H - 4);
      ctx.restore();
    }
  });

  /* =========================================================================
   * G12 — Dumbbell chart : FCS 2020 vs 2024
   * ======================================================================= */
  WFP.registerChart('fcsDumbbell', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const rows = d.rows;
      const n = rows.length;
      const labelW = Math.min(140, Math.max(92, W * 0.24));
      const plot = { x: labelW, y: 22, w: W - labelW - 46, h: H - 22 - 26 };
      const maxV = Math.max(70, Math.max.apply(null, rows.map((r) => Math.max(r.v2020, r.v2024))) * 1.08);
      const rowH = plot.h / n;
      const xOf = (v) => plot.x + (v / maxV) * plot.w;
      const e = ch.e;

      /* Grille verticale + seuil 42 */
      ctx.save();
      ctx.font = WFP.font(10, 500); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      [0, 20, 40, 60].filter((v) => v <= maxV).forEach((v) => {
        const x = Math.round(xOf(v)) + 0.5;
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, plot.y - 4); ctx.lineTo(x, plot.y + plot.h); ctx.stroke();
        ctx.fillText(v, x, plot.y + plot.h + 7);
      });
      ctx.restore();
      WFP.dashedLine(ctx, xOf(42), plot.y - 4, xOf(42), plot.y + plot.h, C.tertiary, 'Seuil 42');

      rows.forEach((r, i) => {
        const y = plot.y + i * rowH + rowH / 2;
        const prog = WFP.stagger(p, i, n, 0.5);
        const hov = ch.hover === 'r' + i;
        const improved = r.v2024 >= r.v2020;
        const color = improved ? C.tertiary : C.danger;
        const x0 = xOf(r.v2020), x1 = xOf(r.v2020 + (r.v2024 - r.v2020) * prog);

        /* Libellé */
        ctx.save();
        ctx.font = WFP.font(10.5, hov ? 700 : 600);
        ctx.fillStyle = hov ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, r.name, labelW - 16), labelW - 12, y);
        ctx.restore();

        /* Trait de liaison */
        ctx.save();
        ctx.strokeStyle = WFP.hexA(color, 0.55); ctx.lineWidth = hov ? 4 : 2.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.restore();

        /* Point 2020 (gris) */
        ctx.save();
        ctx.beginPath(); ctx.arc(x0, y, hov ? 6 : 4.6, 0, Math.PI * 2);
        ctx.fillStyle = '#CBD5E1'; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = '#94A3B8'; ctx.stroke();
        ctx.restore();
        /* Point 2024 (ambre/rouge/vert) */
        ctx.save();
        if (hov) { ctx.beginPath(); ctx.arc(x1, y, 11, 0, Math.PI * 2); ctx.fillStyle = WFP.hexA(color, 0.16); ctx.fill(); }
        ctx.beginPath(); ctx.arc(x1, y, hov ? 7 : 5.4, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
        ctx.restore();

        /* Delta affiché à droite */
        if (prog > 0.85) {
          ctx.save();
          ctx.font = WFP.font(10, 700); ctx.fillStyle = color;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText((r.delta >= 0 ? '+' : '−') + Math.abs(r.delta).toFixed(1), x1 + 10, y);
          ctx.restore();
        }

        ch.hit({
          type: 'rect', key: 'r' + i, x: 0, y: y - rowH / 2, w: W, h: rowH,
          tip: {
            title: r.name, sub: 'Évolution du Food Consumption Score', color: color,
            rows: [
              { color: '#94A3B8', label: 'FCS 2020', value: r.v2020.toFixed(1) },
              { color: color, label: 'FCS 2024', value: r.v2024.toFixed(1) },
              { label: 'Variation', value: (r.delta >= 0 ? '+' : '−') + Math.abs(r.delta).toFixed(1) + ' pts' }
            ],
            note: improved ? 'Amélioration depuis 2020' : 'Dégradation depuis 2020'
          }
        });
      });
      void e;
    }
  });
})(window);
