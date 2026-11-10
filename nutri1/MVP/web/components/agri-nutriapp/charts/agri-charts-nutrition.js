/* =====================================================================
 * AgriNutri · Graphique « Double fardeau & MNT »
 *   G13 Radar des systèmes alimentaires (6 axes) : périmètre actif vs région
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AgriCore;
  const C = AC.C;
  window.AgriCharts = window.AgriCharts || {};

  window.AgriCharts.systemsRadar = function (canvas) {
    return AC.mount(canvas, {
      height: 330,
      hit: function (x, y, L, d) {
        // Survol : axe le plus proche de la souris (secteurs angulaires)
        const cx = L.w / 2, cy = L.h / 2 + 4;
        const ang = Math.atan2(y - cy, x - cx);
        const dist = Math.hypot(x - cx, y - cy);
        if (dist > Math.min(L.w, L.h) / 2 - 20) return null;
        const n = d.axes.length;
        let a = ang + Math.PI / 2; // axe 0 en haut
        while (a < 0) a += Math.PI * 2;
        return Math.floor(((a + Math.PI / n) % (Math.PI * 2)) / (Math.PI * 2 / n));
      },
      render: function (g, L, p, hover, d) {
        const n = d.axes.length;
        const cx = L.w / 2, cy = L.h / 2 + 4;
        const R = Math.min(L.w, L.h) / 2 - 46;
        const pt = function (i, v) {
          const a = -Math.PI / 2 + i * (Math.PI * 2 / n);
          const r = R * v / 100;
          return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
        };
        // Anneaux de grille (20 → 100)
        g.save();
        g.strokeStyle = 'rgba(148,163,184,0.35)';
        g.lineWidth = 1;
        [20, 40, 60, 80, 100].forEach(function (lvl) {
          g.beginPath();
          for (let i = 0; i < n; i++) { const q = pt(i, lvl); if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y); }
          g.closePath();
          g.stroke();
        });
        // Rayons + libellés des axes
        g.font = AC.font(11, 600);
        g.fillStyle = '#334155';
        for (let i = 0; i < n; i++) {
          const e = pt(i, 100);
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(e.x, e.y); g.stroke();
          const lab = pt(i, 116);
          g.textAlign = Math.abs(lab.x - cx) < 6 ? 'center' : lab.x > cx ? 'left' : 'right';
          g.textBaseline = lab.y < cy - 6 ? 'bottom' : lab.y > cy + 6 ? 'top' : 'middle';
          g.fillText(d.axes[i], lab.x, lab.y);
        }
        g.restore();
        // Polygone « région » (pointillés gris)
        function poly(values, fill, stroke, dash) {
          g.save();
          g.beginPath();
          values.forEach(function (v, i) {
            const q = pt(i, v * p);
            if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y);
          });
          g.closePath();
          if (fill) { g.fillStyle = fill; g.fill(); }
          g.strokeStyle = stroke;
          g.lineWidth = 2;
          g.setLineDash(dash || []);
          g.lineJoin = 'round';
          g.stroke();
          g.restore();
        }
        poly(d.region, null, C.grey, [5, 4]);
        if (d.current) {
          poly(d.current, 'rgba(21,128,61,0.22)', C.primary, []);
          d.current.forEach(function (v, i) {
            const q = pt(i, v * p);
            g.save();
            g.fillStyle = hover === i ? C.ink : C.primary;
            g.beginPath(); g.arc(q.x, q.y, hover === i ? 6 : 4, 0, Math.PI * 2); g.fill();
            g.restore();
          });
        }
        AC.legend(g, [{ label: d.label, color: C.primary }, { label: 'Moyenne régionale', color: C.grey, outline: true }], 12, 12);
      },
      tip: function (i, L, d) {
        const cur = d.current ? d.current[i] : null;
        const reg = d.region[i];
        return { color: C.primary, title: d.axes[i], rows: [
          { k: d.label, v: AC.fmt(cur === null ? reg : cur, 0) + ' / 100', c: C.primary },
          { k: 'Moyenne régionale', v: AC.fmt(reg, 0) + ' / 100', c: C.muted }
        ] };
      }
    });
  };
})();
