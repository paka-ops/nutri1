/* =====================================================================
 * AgriNutri · Graphiques « Diversité & Jardins Familiaux »
 *   G4  Scatter diversité des cultures vs score HDDS (4 quadrants, R²)
 *   G6  Barres appariées : consommation par groupe avec / sans jardin
 *   G8  Entonnoir de la fortification alimentaire
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AgriCore;
  const C = AC.C;
  const D = window.AgriNutriData;
  window.AgriCharts = window.AgriCharts || {};

  /* Régression linéaire simple : pente, ordonnée, R² */
  function regression(pts) {
    const n = pts.length;
    const mx = pts.reduce(function (a, p) { return a + p.x; }, 0) / n;
    const my = pts.reduce(function (a, p) { return a + p.y; }, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    pts.forEach(function (p) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) * (p.x - mx); syy += (p.y - my) * (p.y - my); });
    const slope = sxy / (sxx || 1);
    const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
    return { slope: slope, intercept: my - slope * mx, r2: r2, mx: mx, my: my };
  }

  /* ---------- G4 · Scatter 4 quadrants ---------- */
  window.AgriCharts.diversityScatter = function (canvas) {
    const X_MIN = 0, X_MAX = 10, Y_MIN = 2.5, Y_MAX = 5.5;
    return AC.mount(canvas, {
      height: 300,
      hit: function (x, y, L, d) {
        const pl = AC.plot(L, { t: 16, b: 40, l: 46 });
        const xS = AC.linear(X_MIN, X_MAX, pl.x, pl.x + pl.w), yS = AC.linear(Y_MIN, Y_MAX, pl.y + pl.h, pl.y);
        let best = null, bd = 144;
        d.forEach(function (p, i) { const dd = (xS(p.x) - x) * (xS(p.x) - x) + (yS(p.y) - y) * (yS(p.y) - y); if (dd < bd) { bd = dd; best = i; } });
        return best;
      },
      render: function (g, L, p, hover, d) {
        const pl = AC.plot(L, { t: 16, b: 40, l: 46 });
        const xS = AC.linear(X_MIN, X_MAX, pl.x, pl.x + pl.w), yS = AC.linear(Y_MIN, Y_MAX, pl.y + pl.h, pl.y);
        const reg = regression(d.map(function (q) { return { x: q.x, y: q.y }; }));
        // Quadrants : seuils = moyennes (x) et cible HDDS (y)
        const qx = xS(reg.mx), qy = yS(reg.my);
        g.save();
        const quads = [
          { x: pl.x, y: pl.y, w: qx - pl.x, h: qy - pl.y, c: 'rgba(245,158,11,0.07)', t: 'Diversifié · faible HDDS' },
          { x: qx, y: pl.y, w: pl.x + pl.w - qx, h: qy - pl.y, c: 'rgba(22,163,74,0.08)', t: 'Diversifié & nutritif' },
          { x: pl.x, y: qy, w: qx - pl.x, h: pl.y + pl.h - qy, c: 'rgba(220,38,38,0.06)', t: 'Fragile' },
          { x: qx, y: qy, w: pl.x + pl.w - qx, h: pl.y + pl.h - qy, c: 'rgba(3,105,161,0.06)', t: 'Monoculture · HDDS OK' }
        ];
        quads.forEach(function (q) {
          g.fillStyle = q.c;
          g.fillRect(q.x, q.y, q.w, q.h);
        });
        g.font = AC.font(10, 700);
        g.fillStyle = '#64748B';
        g.textBaseline = 'top';
        g.textAlign = 'left'; g.fillText(quads[0].t, pl.x + 6, pl.y + 6);
        g.textAlign = 'right'; g.fillText(quads[1].t, pl.x + pl.w - 6, pl.y + 6);
        g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(quads[2].t, pl.x + 6, pl.y + pl.h - 6);
        g.textAlign = 'right'; g.fillText(quads[3].t, pl.x + pl.w - 6, pl.y + pl.h - 6);
        g.strokeStyle = 'rgba(100,116,139,0.5)';
        g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(qx, pl.y); g.lineTo(qx, pl.y + pl.h); g.moveTo(pl.x, qy); g.lineTo(pl.x + pl.w, qy); g.stroke();
        g.setLineDash([]);
        g.restore();
        // Axes et grille
        AC.gridY(g, pl, { min: Y_MIN, max: Y_MAX, step: 0.5 }, function (v) { return AC.fmt(v, 1); });
        g.save();
        g.font = AC.font(11, 500);
        g.fillStyle = '#94A3B8';
        g.textAlign = 'center';
        g.textBaseline = 'top';
        for (let v = 0; v <= 10; v += 2) g.fillText(String(v), xS(v), pl.y + pl.h + 6);
        g.fillStyle = '#64748B';
        g.font = AC.font(11, 600);
        g.fillText('Indice de diversité des cultures (0-10)', pl.x + pl.w / 2, pl.y + pl.h + 22);
        g.restore();
        // Droite de régression (animée)
        g.save();
        g.strokeStyle = 'rgba(21,128,61,0.55)';
        g.lineWidth = 2;
        g.setLineDash([]);
        g.beginPath();
        g.moveTo(xS(X_MIN), yS(reg.intercept + reg.slope * X_MIN));
        g.lineTo(xS(X_MIN) + (xS(X_MAX) - xS(X_MIN)) * p, yS(reg.intercept + reg.slope * X_MAX));
        g.stroke();
        g.restore();
        // Points
        d.forEach(function (q, i) {
          const good = q.x >= reg.mx && q.y >= reg.my;
          const col = good ? C.success : q.x < reg.mx && q.y >= reg.my ? C.secondary : q.x < reg.mx ? C.danger : C.tertiary;
          const dim = hover !== null && hover !== i;
          g.save();
          g.globalAlpha = (dim ? 0.3 : 0.92) * Math.min(1, p * 1.6);
          g.fillStyle = col;
          g.beginPath();
          g.arc(xS(q.x), yS(q.y), hover === i ? 8 : 6, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#FFFFFF';
          g.lineWidth = 1.5;
          g.stroke();
          g.restore();
        });
        // Badge R²
        g.save();
        g.font = AC.font(11, 700);
        g.fillStyle = '#15803D';
        g.textAlign = 'right';
        g.textBaseline = 'top';
        g.fillText('R² = ' + AC.fmt(reg.r2, 2).replace('.', ',') + ' · pente ' + AC.fmt(reg.slope, 2), pl.x + pl.w - 4, pl.y + pl.h + 22 + 18);
        g.restore();
      },
      tip: function (i, L, d) {
        const q = d[i];
        return { color: C.primary, title: q.label, rows: [
          { k: 'Diversité des cultures', v: AC.fmt(q.x, 1) + ' / 10', c: C.ink },
          { k: 'Score HDDS', v: AC.fmt(q.y, 1), c: C.primary }
        ] };
      }
    });
  };

  /* ---------- G6 · Barres appariées avec / sans jardin ---------- */
  window.AgriCharts.gardenPairs = function (canvas) {
    const LAB_W = 150;
    return AC.mount(canvas, {
      height: 380,
      hit: function (x, y, L, rows) {
        const pl = AC.plot(L, { t: 16, l: LAB_W, r: 60, b: 24 });
        if (y < pl.y || y > pl.y + pl.h) return null;
        return Math.floor((y - pl.y) / (pl.h / rows.length));
      },
      render: function (g, L, p, hover, rows) {
        const pl = AC.plot(L, { t: 16, l: LAB_W, r: 60, b: 24 });
        const xS = AC.linear(0, 100, pl.x, pl.x + pl.w);
        g.save();
        g.font = AC.font(11, 500);
        g.fillStyle = '#94A3B8';
        g.textAlign = 'center';
        g.textBaseline = 'top';
        [0, 25, 50, 75, 100].forEach(function (v) {
          g.strokeStyle = 'rgba(148,163,184,0.22)';
          g.beginPath(); g.moveTo(xS(v), pl.y); g.lineTo(xS(v), pl.y + pl.h); g.stroke();
          g.fillText(v + '%', xS(v), pl.y + pl.h + 6);
        });
        g.restore();
        const gh = pl.h / rows.length;
        rows.forEach(function (r, i) {
          const y0 = pl.y + gh * i;
          const dim = hover !== null && hover !== i;
          const bh = Math.min(12, gh * 0.36);
          g.save();
          g.globalAlpha = dim ? 0.35 : 1;
          g.font = AC.font(12, 600);
          g.fillStyle = '#334155';
          g.textAlign = 'right';
          g.textBaseline = 'middle';
          g.fillText(r.name, pl.x - 10, y0 + gh / 2);
          // Avec jardin (vert plein)
          const wG = (xS(r.garden) - pl.x) * p;
          const gradG = g.createLinearGradient(pl.x, 0, pl.x + wG, 0);
          gradG.addColorStop(0, '#22C55E'); gradG.addColorStop(1, C.primary);
          g.fillStyle = gradG;
          g.beginPath();
          AC.barH(g, pl.x, y0 + gh / 2 - bh - 1, wG, bh, 6);
          g.fill();
          // Sans jardin (contour gris)
          const wN = (xS(r.none) - pl.x) * p;
          g.strokeStyle = C.grey;
          g.lineWidth = 1.5;
          g.beginPath();
          AC.barH(g, pl.x, y0 + gh / 2 + 1, wN, bh, 6);
          g.stroke();
          // Valeurs et gain
          g.font = AC.font(10, 700);
          g.fillStyle = C.primary;
          g.textAlign = 'left';
          g.fillText(AC.fmt(r.garden, 0) + '%', pl.x + wG + 6, y0 + gh / 2 - bh / 2 - 1);
          g.fillStyle = '#64748B';
          g.fillText(AC.fmt(r.none, 0) + '%', pl.x + wN + 6, y0 + gh / 2 + bh / 2 + 1);
          g.restore();
        });
        AC.legend(g, [{ label: 'Ménages avec jardin potager', color: C.primary }, { label: 'Sans jardin', color: C.grey, outline: true }], pl.x, 8);
      },
      tip: function (i, L, rows) {
        const r = rows[i];
        const gain = r.garden - r.none;
        return { color: C.primary, title: r.name, rows: [
          { k: 'Avec jardin', v: AC.fmt(r.garden, 0) + ' %', c: C.primary },
          { k: 'Sans jardin', v: AC.fmt(r.none, 0) + ' %', c: C.muted },
          { k: 'Écart', v: (gain >= 0 ? '+' : '') + AC.fmt(gain, 0) + ' pts', c: gain >= 0 ? C.success : C.danger }
        ] };
      }
    });
  };

  /* ---------- G8 · Entonnoir de fortification ---------- */
  window.AgriCharts.fortificationFunnel = function (canvas) {
    const COLS = [C.quaternary, C.tertiary, C.primary, C.success];
    return AC.mount(canvas, {
      height: 300,
      hit: function (x, y, L, rows) {
        const pl = AC.plot(L, { t: 12, b: 12, l: 12, r: 12 });
        const bh = pl.h / rows.length;
        const r = Math.floor((y - pl.y) / bh);
        return r >= 0 && r < rows.length ? r : null;
      },
      render: function (g, L, p, hover, rows) {
        const pl = AC.plot(L, { t: 12, b: 12, l: 12, r: 12 });
        const bh = pl.h / rows.length;
        const cx = pl.x + pl.w * 0.38;
        const maxW = pl.w * 0.72;
        rows.forEach(function (r, i) {
          const wTop = maxW * r.value / 100 * p;
          const next = rows[i + 1] ? rows[i + 1].value : r.value * 0.8;
          const wBot = maxW * next / 100 * p;
          const y0 = pl.y + i * bh + 4, y1 = pl.y + (i + 1) * bh - 4;
          const dim = hover !== null && hover !== i;
          g.save();
          g.globalAlpha = dim ? 0.35 : 1;
          g.fillStyle = COLS[i];
          g.beginPath();
          g.moveTo(cx - wTop / 2, y0);
          g.lineTo(cx + wTop / 2, y0);
          g.lineTo(cx + wBot / 2, y1);
          g.lineTo(cx - wBot / 2, y1);
          g.closePath();
          g.fill();
          g.restore();
          // Libellé et valeur à droite
          g.save();
          g.globalAlpha = dim ? 0.35 : 1;
          g.font = AC.font(12, 600);
          g.fillStyle = '#334155';
          g.textAlign = 'left';
          g.textBaseline = 'middle';
          g.fillText(r.name, pl.x + pl.w * 0.72 + 4, y0 + (y1 - y0) / 2 - 2);
          g.font = AC.font(16, 800);
          g.fillStyle = COLS[i];
          g.fillText(AC.fmt(r.value, 0) + '%', pl.x + pl.w * 0.72 + 4, y0 + (y1 - y0) / 2 + 14);
          g.restore();
          // Pertes entre étapes
          if (rows[i + 1]) {
            const drop = rows[i + 1].value - r.value;
            g.save();
            g.font = AC.font(10, 700);
            g.fillStyle = C.danger;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText('▼ ' + AC.fmt(drop, 0) + ' pts perdus', cx, y1 + 2);
            g.restore();
          }
        });
      },
      tip: function (i, L, rows) {
        const r = rows[i];
        const prevV = i > 0 ? rows[i - 1].value : 100;
        return { color: COLS[i], title: r.name, rows: [
          { k: 'Efficacité', v: AC.fmt(r.value, 0) + ' %', c: COLS[i] },
          { k: 'Perte vs étape précédente', v: i === 0 ? '—' : '−' + AC.fmt(prevV - r.value, 0) + ' pts', c: C.danger }
        ] };
      }
    });
  };
})();
