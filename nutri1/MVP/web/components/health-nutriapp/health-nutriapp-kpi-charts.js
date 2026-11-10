/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : health-nutriapp-kpi-charts.js
 * Rôle    : Mini-visualisations Canvas embarquées dans les 5 KPI cards —
 *           sparkline des admissions (fond), barres d'obésité, jauge HTA,
 *           barre d'alerte ruptures ATPE et donut de synchronisation.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = global.HealthNutriApp;
  const C = HA.COLORS;

  /* ----- KPI 1 : sparkline des admissions mensuelles (fond violet) ----- */
  HA.registerChart('kpiSpark', {
    draw(ch, ctx, W, H, p) {
      const vals = ch.data.values;
      const min = Math.min(...vals), span = (Math.max(...vals) - min) || 1;
      const pts = vals.map((v, i) => ({ x: (i / (vals.length - 1)) * W, y: 3 + (1 - (v - min) / span) * (H - 6) }));
      const a = HA.ease(HA.clamp(p * 1.3, 0, 1));
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W * a, H); ctx.clip();
      ctx.beginPath();
      HA.smoothPath(ctx, pts);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = HA.vGradient(ctx, 0, H, C.primary, 0.25, 0);
      ctx.fill();
      ctx.beginPath(); HA.smoothPath(ctx, pts);
      ctx.strokeStyle = C.primary; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
      /* Pic de soudure : pastille ambre sur le maximum */
      const mi = vals.indexOf(Math.max(...vals));
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(pts[mi].x, pts[mi].y, 3, 0, Math.PI * 2);
      ctx.fillStyle = C.quaternary; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.restore();
    }
  });

  /* ----- KPI 2 : micro-barres d'obésité (5 ans) ----- */
  HA.registerChart('kpiBars', {
    draw(ch, ctx, W, H, p) {
      const vals = ch.data.values; // 5 valeurs
      const max = Math.max(...vals) * 1.15;
      const bw = Math.min(18, (W / vals.length) * 0.5);
      vals.forEach((v, i) => {
        const a = HA.stagger(p, i, vals.length);
        const h = Math.max(2, (v / max) * (H - 4) * a);
        const x = (i + 0.5) * (W / vals.length) - bw / 2;
        HA.roundTop(ctx, x, H - h, bw, h, 4);
        ctx.fillStyle = i === vals.length - 1 ? C.quaternary : HA.hexA(C.quaternary, 0.35);
        ctx.fill();
      });
    }
  });

  /* ----- KPI 3 : jauge d'hypertension ----- */
  HA.registerChart('kpiGauge', {
    draw(ch, ctx, W, H, p) {
      const v = ch.data.value; // %
      const cx = W / 2, cy = H - 8, R = Math.min(W / 2 - 6, H - 14);
      const a0 = Math.PI, a1 = Math.PI * 2;
      const a = HA.ease(HA.clamp(p * 1.3, 0, 1));
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1);
      ctx.strokeStyle = '#FEE2E2'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + (a1 - a0) * (v / 50) * a);
      ctx.strokeStyle = C.danger; ctx.lineWidth = 8; ctx.stroke();
      ctx.fillStyle = C.danger; ctx.font = HA.font(11, 800);
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(String(v).replace('.', ',') + ' %', cx, cy + 2);
    }
  });

  /* ----- KPI 4 : barre d'alerte ruptures ATPE ----- */
  HA.registerChart('kpiAlert', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; // { ruptures, structures }
      const frac = d.ruptures / d.structures;
      const a = HA.ease(HA.clamp(p * 1.3, 0, 1));
      const y = H / 2 - 5;
      HA.roundRect(ctx, 0, y, W, 10, 5);
      ctx.fillStyle = '#F1F5F9'; ctx.fill();
      HA.roundRect(ctx, 0, y, Math.max(10, W * frac * 8 * a), 10, 5);
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, C.danger); g.addColorStop(1, C.quaternary);
      ctx.fillStyle = g; ctx.fill();
      ctx.fillStyle = C.danger; ctx.font = HA.font(10, 700);
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(d.ruptures + ' / ' + HA.fmtInt(d.structures), 0, y - 2);
    }
  });

  /* ----- KPI 5 : donut de synchronisation ----- */
  HA.registerChart('kpiDonut', {
    draw(ch, ctx, W, H, p) {
      const v = ch.data.value; // %
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 5;
      const a = HA.ease(HA.clamp(p * 1.3, 0, 1));
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = '#E0F2FE'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (v / 100) * a);
      ctx.strokeStyle = C.secondary; ctx.lineWidth = 8; ctx.stroke();
      ctx.fillStyle = C.title; ctx.font = HA.font(12, 800);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(v * a) + ' %', cx, cy);
    }
  });
})(window);
