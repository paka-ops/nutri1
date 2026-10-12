/* ============================================================================
 * NutriApp Santé · moh-nutriapp-kpi-charts.js
 * Rendu des mini-visualisations dans les cartes KPI :
 *   - Sparklines 12 mois adm/sync
 *   - Gauges circulaires mini (taux guérison, CPN)
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = global.MOHNutriApp;
  if (!MOH) return;
  const C = MOH.COLORS;

  MOH.kpiCharts = {};

  MOH.kpiCharts.sparkAdm = function (canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height;
    // 12 mini-barres (courbe saisonnière)
    const data = [0.55, 0.50, 0.55, 0.65, 0.85, 1.28, 1.55, 1.48, 1.18, 0.85, 0.68, 0.58];
    const maxV = Math.max(...data);
    const bw = w / data.length - 2;
    data.forEach((v, i) => {
      const bh = (v / maxV) * (h - 4);
      const x = i * (w / data.length) + 1;
      const y = h - bh - 2;
      ctx.fillStyle = v > 1.2 ? C.quaternary : C.primary;
      MOH.roundTop(ctx, x, y, bw, bh, 2); ctx.fill();
    });
  };

  MOH.kpiCharts.sparkSync = function (canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height;
    // Mini barres de complétude (12 régions à ~72% en moyenne)
    const n = 12;
    const data = [0.88, 0.91, 0.78, 0.55, 0.68, 0.62, 0.48, 0.51, 0.80, 0.66, 0.71, 0.85];
    const bw = w / n - 2;
    data.forEach((v, i) => {
      const bh = v * (h - 4);
      const x = i * (w / n) + 1;
      const y = h - bh - 2;
      const color = v >= 0.75 ? C.secondary : v >= 0.6 ? C.quaternary : C.danger;
      ctx.fillStyle = color;
      MOH.roundTop(ctx, x, y, bw, bh, 2); ctx.fill();
    });
  };

  MOH.kpiCharts.gauge = function (canvas, pct, color) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = r.width, h = r.height;
    const cx = w / 2, cy = h * 0.9;
    const rad = Math.min(w, h) * 0.8;
    const startAng = Math.PI, endAng = 2 * Math.PI;
    // Track
    ctx.strokeStyle = '#F1F5F9'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, rad / 2 - 4, startAng, endAng); ctx.stroke();
    // Seuil Sphère 75%
    const thrAng = startAng + 0.75 * Math.PI;
    ctx.strokeStyle = MOH.hexA(C.tertiary, 0.4); ctx.lineWidth = 2; ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(thrAng) * (rad / 2 - 14), cy + Math.sin(thrAng) * (rad / 2 - 14));
    ctx.lineTo(cx + Math.cos(thrAng) * (rad / 2 + 6), cy + Math.sin(thrAng) * (rad / 2 + 6));
    ctx.stroke();
    ctx.setLineDash([]);
    // Valeur
    ctx.strokeStyle = color; ctx.lineWidth = 8;
    const valAng = startAng + pct * Math.PI;
    ctx.beginPath(); ctx.arc(cx, cy, rad / 2 - 4, startAng, valAng); ctx.stroke();
    // Center texte
    ctx.fillStyle = color; ctx.font = MOH.font(14, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(pct * 100) + '%', cx, cy - 6);
  };
})(window);
