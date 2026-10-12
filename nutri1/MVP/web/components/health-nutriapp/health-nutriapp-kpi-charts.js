/* ============================================================================
 * NutriApp Santé · health-nutriapp-kpi-charts.js
 * Rôle : micro-graphiques Canvas des 5 cartes KPI.
 *   kpi1 : mini barres des 12 mois 2024 (admissions CRENAS)
 *   kpi2 : jauge circulaire verte, seuil Sphère à 75 %
 *   kpi3 : mini aire rouge de la tendance des stocks ATPE
 *   kpi4 : jauge circulaire ambre (progression vers 100 %)
 *   kpi5 : barres de complétude par région / district
 * Chaque fonction suit la signature (ch, ctx, W, H, p) du moteur Chart.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;
  const D = NH.draw;
  const T = NH.THEME;

  NH.charts.kpi1 = function (ch, ctx, W, H, p) {
    const vals = ch.view.m24;
    const mx = Math.max.apply(null, vals) || 1;
    const gap = 4, bw = (W - gap * 11) / 12;
    const peak = vals.indexOf(mx);
    vals.forEach((val, i) => {
      const h = (val / mx) * (H - 4) * p;
      const x = i * (bw + gap);
      D.roundRect(ctx, x, H - h, bw, h, 3, true);
      ctx.fillStyle = i === peak ? T.primary : NH.rgba(T.primary, 0.28 + 0.5 * (val / mx));
      ctx.fill();
      ch.hit({ x0: x - gap / 2, x1: x + bw + gap / 2, y0: 0, y1: H, color: T.primary, title: NH.MONTHS[i] + ' 2024', rows: [['Admissions', NH.fmt(val)]] });
    });
  };

  /* Jauge circulaire (arc de 270°) avec repère de seuil */
  function gauge(ctx, W, H, p, frac, color, seuil) {
    const r = Math.min(W, H) / 2 - 6;
    const cx = W / 2, cy = H / 2 + 2;
    const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.strokeStyle = T.grid;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + span); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + span * NH.clamp(frac * p, 0, 1)); ctx.stroke();
    if (seuil != null) {
      const sa = a0 + span * (seuil / 100);
      ctx.strokeStyle = T.value; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(sa) * (r - 7), cy + Math.sin(sa) * (r - 7));
      ctx.lineTo(cx + Math.cos(sa) * (r + 5), cy + Math.sin(sa) * (r + 5)); ctx.stroke();
    }
  }

  NH.charts.kpi2 = function (ch, ctx, W, H, p) {
    gauge(ctx, W, H, p, ch.view.kpi.guer / 100, T.tertiary, NH.SPHERE.guerison);
  };

  NH.charts.kpi3 = function (ch, ctx, W, H, p) {
    const s = ch.view.sm.stock;
    const mn = Math.min.apply(null, s), mx = Math.max.apply(null, s), span = mx - mn || 1;
    const pts = s.map((v, i) => ({ x: 2 + ((W - 4) * i) / (s.length - 1), y: H - 3 - ((v - mn) / span) * (H - 8) }));
    const base = H - 1;
    ctx.beginPath(); D.smooth(ctx, pts.map((q) => ({ x: q.x, y: base - (base - q.y) * p })));
    ctx.lineTo(W - 2, base); ctx.lineTo(2, base); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, NH.rgba(T.danger, 0.3)); g.addColorStop(1, NH.rgba(T.danger, 0));
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); D.smooth(ctx, pts.map((q) => ({ x: q.x, y: base - (base - q.y) * p })));
    ctx.strokeStyle = T.danger; ctx.lineWidth = 2; ctx.stroke();
  };

  NH.charts.kpi4 = function (ch, ctx, W, H, p) {
    gauge(ctx, W, H, p, ch.view.kpi.cpn / 100, T.quaternary, null);
  };

  NH.charts.kpi5 = function (ch, ctx, W, H, p) {
    const rows = ch.view.rows.slice(0, 16);
    const gap = 3, bw = (W - gap * (rows.length - 1)) / rows.length;
    rows.forEach((r, i) => {
      const h = (r.dhis2 / 100) * (H - 4) * p;
      const x = i * (bw + gap);
      D.roundRect(ctx, x, H - h, bw, h, 2.5, true);
      ctx.fillStyle = r.dhis2 >= 80 ? T.secondary : NH.rgba(T.secondary, 0.45);
      ctx.fill();
      ch.hit({ x0: x - 1, x1: x + bw + 1, y0: 0, y1: H, color: T.secondary, title: r.label, rows: [['Complétude', NH.pct(r.dhis2, 0), T.secondary]] });
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
