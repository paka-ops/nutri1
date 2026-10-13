/* =====================================================================
 * AgriNutri · Mini-graphiques intégrés aux 5 KPI
 *   KPI 1 : mini barres de répartition par culture
 *   KPI 2 : mini courbe 12 mois (rouge)
 *   KPI 3 : jauge circulaire ambre (autosuffisance)
 *   KPI 4 : mini tendance violette (double fardeau)
 *   KPI 5 : mini jauge rouge (pertes post-récolte)
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AgriCore;
  const C = AC.C;
  window.AgriCharts = window.AgriCharts || {};

  /* Jauge en arc : valeur (%) animée, couleur d'accent */
  function gauge(canvas, valuePct, color, opts) {
    const o = Object.assign({ start: Math.PI * 0.75, span: Math.PI * 1.5 }, opts || {});
    return AC.create(canvas, {
      height: opts && opts.height || 110,
      render: function (g, L, p) {
        const cx = L.w / 2, cy = L.h * 0.62;
        const R = Math.min(L.w / 2, L.h) - 12;
        g.lineCap = 'round';
        g.lineWidth = 11;
        g.strokeStyle = 'rgba(148,163,184,0.22)';
        g.beginPath(); g.arc(cx, cy, R, o.start, o.start + o.span); g.stroke();
        const frac = Math.max(0, Math.min(1, valuePct / 100));
        g.strokeStyle = color;
        g.beginPath(); g.arc(cx, cy, R, o.start, o.start + o.span * frac * p); g.stroke();
        g.font = AC.font(18, 800);
        g.fillStyle = color;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(Math.round(valuePct * p) + '%', cx, cy - 2);
      }
    });
  }

  /* KPI 1 : barres horizontales empilées de répartition par culture */
  function cropMix(canvas, rows) {
    const total = rows.reduce(function (a, r) { return a + r.value; }, 0);
    return AC.create(canvas, {
      height: 44,
      render: function (g, L, p) {
        let x = 0;
        rows.forEach(function (r, i) {
          const w = (r.value / total) * L.w * p;
          g.fillStyle = r.color;
          g.beginPath();
          if (i === 0) AC.roundRect(g, x, 8, Math.max(0, w), 14, 7);
          else g.rect(x, 8, Math.max(0, w), 14);
          g.fill();
          x += w;
        });
        g.font = AC.font(10, 600);
        g.fillStyle = '#64748B';
        g.textBaseline = 'top';
        g.textAlign = 'left';
        let lx = 0;
        rows.forEach(function (r) {
          const txt = r.name + ' ' + AC.fmt((r.value / total) * 100, 0) + '%';
          g.fillText(txt, lx, 28);
          lx += g.measureText(txt).width + 12;
        });
      }
    });
  }

  /* Mini courbe (KPI 2 et 4) : aire + ligne lissée, couleur d'accent */
  function miniLine(canvas, values, color, h) {
    return AC.create(canvas, {
      height: h || 56,
      render: function (g, L, p) {
        const pad = 3;
        const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
        const xS = function (i) { return pad + i / (values.length - 1) * (L.w - pad * 2); };
        const yS = AC.linear(min, max || min + 1, L.h - pad, pad);
        const pts = values.map(function (v, i) { return { x: xS(i), y: L.h - (L.h - yS(v)) * p }; });
        const grad = g.createLinearGradient(0, 0, 0, L.h);
        grad.addColorStop(0, color + '40');
        grad.addColorStop(1, color + '00');
        g.beginPath();
        AC.smoothPath(g, pts, 0.5);
        g.lineTo(xS(values.length - 1), L.h); g.lineTo(xS(0), L.h); g.closePath();
        g.fillStyle = grad; g.fill();
        g.beginPath();
        AC.smoothPath(g, pts, 0.5);
        g.strokeStyle = color; g.lineWidth = 2; g.stroke();
      }
    });
  }

  /* API publique : chaque fonction reçoit un élément canvas et des valeurs */
  window.AgriKpiCharts = {
    cropMix: cropMix,
    priceLine: function (canvas, values) { return miniLine(canvas, values, C.danger, 56); },
    ssGauge: function (canvas, pct) { return gauge(canvas, pct, C.secondary, { height: 110 }); },
    mntLine: function (canvas, values) { return miniLine(canvas, values, C.quaternary, 44); },
    lossGauge: function (canvas, pct) { return gauge(canvas, Math.min(100, pct * 3), C.danger, { height: 80, start: Math.PI * 0.8, span: Math.PI * 1.4 }); }
  };
})();
