/* =====================================================================
 * AgriNutri · Graphiques « Marchés & Prix »
 *   G2  Heatmap des prix (6 commodités × 12 mois, ratio prix / normale)
 *   G7  Dual-axis : prix du mil vs insécurité alimentaire (24 mois, R² ≈ 0,71)
 *   G14 Dumbbell : évolution des prix 2020 → 2024 (8 commodités)
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AgriCore;
  const C = AC.C;
  const D = window.AgriNutriData;
  window.AgriCharts = window.AgriCharts || {};

  /* Interpolation de couleur : vert (prix bas) → ambre (normal) → rouge (flambée) */
  function hexToRgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  const STOPS = [
    { t: 0.0, c: hexToRgb('#86EFAC') },
    { t: 0.5, c: hexToRgb('#FEF3C7') },
    { t: 0.8, c: hexToRgb('#FDBA74') },
    { t: 1.0, c: hexToRgb('#DC2626') }
  ];
  function heatColor(ratio) {
    // ratio 0.8 → 1.25 mappé sur [0, 1]
    const t = Math.max(0, Math.min(1, (ratio - 0.8) / 0.45));
    let a = STOPS[0], b = STOPS[STOPS.length - 1];
    for (let i = 0; i < STOPS.length - 1; i++) {
      if (t >= STOPS[i].t && t <= STOPS[i + 1].t) { a = STOPS[i]; b = STOPS[i + 1]; break; }
    }
    const k = (t - a.t) / ((b.t - a.t) || 1);
    const c = a.c.map(function (v, i) { return Math.round(v + (b.c[i] - v) * k); });
    return 'rgb(' + c.join(',') + ')';
  }

  /* Géométrie de la grille : colonne libellés à gauche, en-tête mois en haut */
  function gridGeom(L) {
    const x0 = 96, y0 = 30;
    const cw = (L.w - x0 - 8) / 12;
    const ch = Math.min(52, (L.h - y0 - 8) / 6);
    return { x0: x0, y0: y0, cw: cw, ch: ch };
  }

  /* ---------- G2 · Heatmap des prix ---------- */
  window.AgriCharts.priceHeatmap = function (canvas) {
    return AC.mount(canvas, {
      height: 330,
      hit: function (x, y, L, rows) {
        const g = gridGeom(L);
        const c = Math.floor((x - g.x0) / g.cw), r = Math.floor((y - g.y0) / g.ch);
        if (c < 0 || c > 11 || r < 0 || r >= rows.length) return null;
        return r * 12 + c;
      },
      render: function (g, L, p, hover, rows) {
        const geo = gridGeom(L);
        g.save();
        g.font = AC.font(11, 600);
        g.textBaseline = 'middle';
        // En-tête mois
        g.textAlign = 'center';
        g.fillStyle = '#64748B';
        D.MONTHS.forEach(function (m, c) { g.fillText(m, geo.x0 + c * geo.cw + geo.cw / 2, geo.y0 - 12); });
        rows.forEach(function (row, r) {
          // Libellé commodité
          g.textAlign = 'right';
          g.fillStyle = '#334155';
          g.font = AC.font(12, 600);
          g.fillText(row.name, geo.x0 - 10, geo.y0 + r * geo.ch + geo.ch / 2);
          row.values.forEach(function (v, c) {
            const idx = r * 12 + c;
            const appear = Math.max(0, Math.min(1, p * 1.6 - c * 0.07));
            const x = geo.x0 + c * geo.cw + 2, y = geo.y0 + r * geo.ch + 2;
            const w = geo.cw - 4, h = geo.ch - 4;
            g.globalAlpha = (hover !== null && hover !== idx ? 0.35 : 1) * appear;
            g.fillStyle = heatColor(v);
            AC.roundRect(g, x, y, w, h, 6);
            g.fill();
            if (hover === idx) { g.strokeStyle = '#0F172A'; g.lineWidth = 2; g.stroke(); }
            g.globalAlpha = appear * (hover !== null && hover !== idx ? 0.35 : 1);
            // Valeur numérique
            g.fillStyle = v > 1.12 ? '#FFFFFF' : '#14532D';
            g.font = AC.font(10, 700);
            g.textAlign = 'center';
            g.fillText(v.toFixed(2), x + w / 2, y + h / 2 + 6);
            // Icône d'épi : mois de récolte
            if (row.harvest.indexOf(c) >= 0) {
              g.font = AC.font(10, 600);
              g.fillText('🌾', x + w / 2, y + 9);
            }
          });
          g.globalAlpha = 1;
        });
        g.restore();
      },
      tip: function (idx, L, rows) {
        const r = Math.floor(idx / 12), c = idx % 12;
        const row = rows[r];
        const v = row.values[c];
        const harvest = row.harvest.indexOf(c) >= 0;
        return { color: v > 1.05 ? C.danger : C.success, title: row.name + ' · ' + D.MONTHS[c], rows: [
          { k: 'Ratio prix / normale', v: AC.fmt(v, 2), c: C.ink },
          { k: 'Écart vs normale', v: (v >= 1 ? '+' : '') + AC.fmt((v - 1) * 100, 0) + ' %', c: v > 1 ? C.danger : C.success },
          { k: 'Période', v: harvest ? '🌾 Récolte' : 'Hors récolte', c: C.muted }
        ] };
      }
    });
  };

  /* ---------- G7 · Dual-axis prix / insécurité ---------- */
  window.AgriCharts.priceInsecurity = function (canvas) {
    const PRICE = C.secondary, INSEC = C.danger;
    function xs(L, n) { const pl = AC.plot(L, { t: 40, r: 56, b: 30, l: 56 }); return { pl: pl, x: function (i) { return pl.x + i / (n - 1) * pl.w; } }; }
    return AC.mount(canvas, {
      height: 300,
      hit: function (x, y, L, d) {
        const s = xs(L, d.labels.length);
        if (x < s.pl.x - 6 || x > s.pl.x + s.pl.w + 6) return null;
        return Math.max(0, Math.min(d.labels.length - 1, Math.round((x - s.pl.x) / s.pl.w * (d.labels.length - 1))));
      },
      render: function (g, L, p, hover, d) {
        const n = d.labels.length;
        const s = xs(L, n);
        const pl = s.pl;
        const pS = AC.niceScale(Math.min.apply(null, d.price) * 0.9, Math.max.apply(null, d.price) * 1.05, 5);
        const iS = AC.niceScale(Math.min.apply(null, d.insecurity) * 0.8, Math.max.apply(null, d.insecurity) * 1.1, 5);
        const yP = AC.linear(pS.min, pS.max, pl.y + pl.h, pl.y);
        const yI = AC.linear(iS.min, iS.max, pl.y + pl.h, pl.y);
        AC.gridY(g, pl, pS, function (v) { return AC.fmt(v, 0); }, PRICE);
        // Axe droit : insécurité (%)
        g.save();
        g.font = AC.font(11, 500);
        g.fillStyle = INSEC;
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        for (let v = iS.min; v <= iS.max + 1e-9; v += iS.step) g.fillText(AC.fmt(v, 0) + '%', pl.x + pl.w + 8, yI(v));
        g.restore();
        AC.legend(g, [{ label: 'Prix du mil (FCFA/kg, axe gauche)', color: PRICE }, { label: 'Insécurité alimentaire (%, axe droit)', color: INSEC }], pl.x, 14);
        // Coefficient de corrélation affiché en filigrane
        g.save();
        g.font = AC.font(11, 700);
        g.fillStyle = '#64748B';
        g.textAlign = 'right';
        g.fillText('R² = 0,71', pl.x + pl.w, 14);
        g.restore();
        // Zone clippée : révélation de gauche à droite pendant l'animation
        g.save();
        g.beginPath();
        g.rect(pl.x - 4, 0, (pl.w + 8) * p + 4, L.h);
        g.clip();
        const pricePts = d.price.map(function (v, i) { return { x: s.x(i), y: yP(v) }; });
        const insPts = d.insecurity.map(function (v, i) { return { x: s.x(i), y: yI(v) }; });
        // Aire sous le prix
        const grad = g.createLinearGradient(0, pl.y, 0, pl.y + pl.h);
        grad.addColorStop(0, 'rgba(180,83,9,0.28)');
        grad.addColorStop(1, 'rgba(180,83,9,0)');
        g.beginPath();
        AC.smoothPath(g, pricePts, 0.5);
        g.lineTo(pl.x + pl.w, pl.y + pl.h);
        g.lineTo(pl.x, pl.y + pl.h);
        g.closePath();
        g.fillStyle = grad;
        g.fill();
        // Lignes lissées
        [[pricePts, PRICE], [insPts, INSEC]].forEach(function (pair) {
          g.beginPath();
          AC.smoothPath(g, pair[0], 0.5);
          g.strokeStyle = pair[1];
          g.lineWidth = 2.5;
          g.lineJoin = 'round';
          g.stroke();
        });
        g.restore();
        // Axe X (un libellé sur deux)
        AC.labelsX(g, d.labels, d.labels.map(function (_, i) { return s.x(i); }), pl.y + pl.h + 8, '#94A3B8', 2);
        // Survol
        if (hover !== null) {
          g.save();
          g.strokeStyle = 'rgba(15,23,42,0.3)';
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(s.x(hover), pl.y);
          g.lineTo(s.x(hover), pl.y + pl.h);
          g.stroke();
          g.restore();
          g.save();
          [[pricePts[hover], PRICE], [insPts[hover], INSEC]].forEach(function (pair) {
            g.beginPath();
            g.arc(pair[0].x, pair[0].y, 5, 0, Math.PI * 2);
            g.fillStyle = '#FFFFFF';
            g.fill();
            g.lineWidth = 2.5;
            g.strokeStyle = pair[1];
            g.stroke();
          });
          g.restore();
        }
      },
      tip: function (i, L, d) {
        const prev = i >= 12 ? d.price[i - 12] : null;
        const yoy = prev ? (d.price[i] / prev - 1) * 100 : null;
        return { color: C.secondary, title: d.labels[i], rows: [
          { k: 'Prix du mil', v: AC.fmt(d.price[i], 0) + ' FCFA/kg', c: C.secondary },
          { k: 'Écart vs an passé', v: yoy === null ? '—' : (yoy >= 0 ? '+' : '') + AC.fmt(yoy, 1) + ' %', c: yoy !== null && yoy > 0 ? C.danger : C.success },
          { k: 'Insécurité alimentaire', v: AC.fmt(d.insecurity[i], 1) + ' %', c: C.danger }
        ] };
      }
    });
  };

  /* ---------- G14 · Dumbbell prix 2020 → 2024 ---------- */
  window.AgriCharts.priceDumbbell = function (canvas) {
    const LAB_W = 130;
    return AC.mount(canvas, {
      height: 320,
      hit: function (x, y, L, rows) {
        const pl = AC.plot(L, { t: 28, l: LAB_W, r: 64, b: 24 });
        const rh = pl.h / rows.length;
        const r = Math.floor((y - pl.y) / rh);
        return r >= 0 && r < rows.length && y >= pl.y ? r : null;
      },
      render: function (g, L, p, hover, rows) {
        const pl = AC.plot(L, { t: 28, l: LAB_W, r: 64, b: 24 });
        const maxV = Math.max.apply(null, rows.map(function (r) { return r.p2024; })) * 1.08;
        const sc = AC.niceScale(0, maxV, 5);
        const xS = AC.linear(sc.min, sc.max, pl.x, pl.x + pl.w);
        // Grille verticale
        g.save();
        g.font = AC.font(11, 500);
        g.fillStyle = '#94A3B8';
        g.textAlign = 'center';
        g.textBaseline = 'top';
        for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
          g.strokeStyle = 'rgba(148,163,184,0.22)';
          g.beginPath(); g.moveTo(xS(v), pl.y); g.lineTo(xS(v), pl.y + pl.h); g.stroke();
          g.fillText(AC.fmt(v, 0), xS(v), pl.y + pl.h + 6);
        }
        g.restore();
        AC.legend(g, [{ label: '2020', color: C.grey }, { label: '2024 (hausse)', color: C.danger }], pl.x, 12);
        const rh = pl.h / rows.length;
        rows.forEach(function (r, i) {
          const cy = pl.y + rh * i + rh / 2;
          const dim = hover !== null && hover !== i;
          const x1 = xS(r.p2020);
          const x2 = xS(r.p2020 + (r.p2024 - r.p2020) * p);
          g.save();
          g.globalAlpha = dim ? 0.35 : 1;
          // Libellé
          g.font = AC.font(12, 600);
          g.fillStyle = '#334155';
          g.textAlign = 'right';
          g.textBaseline = 'middle';
          g.fillText(r.name, pl.x - 12, cy);
          // Connecteur
          g.strokeStyle = 'rgba(220,38,38,0.45)';
          g.lineWidth = 4;
          g.lineCap = 'round';
          g.beginPath(); g.moveTo(x1, cy); g.lineTo(x2, cy); g.stroke();
          // Point 2020
          g.fillStyle = C.grey;
          g.beginPath(); g.arc(x1, cy, 6, 0, Math.PI * 2); g.fill();
          // Point 2024
          g.fillStyle = C.danger;
          g.beginPath(); g.arc(x2, cy, hover === i ? 8 : 6.5, 0, Math.PI * 2); g.fill();
          // Variation en %
          const pct = (r.p2024 / r.p2020 - 1) * 100;
          g.font = AC.font(11, 700);
          g.fillStyle = C.danger;
          g.textAlign = 'left';
          g.fillText('+' + AC.fmt(pct, 0) + '%', pl.x + pl.w + 8, cy);
          g.restore();
        });
      },
      tip: function (i, L, rows) {
        const r = rows[i];
        const pct = (r.p2024 / r.p2020 - 1) * 100;
        return { color: C.danger, title: r.name, rows: [
          { k: 'Prix 2020', v: AC.fmt(r.p2020, 0) + ' FCFA/kg', c: C.muted },
          { k: 'Prix 2024', v: AC.fmt(r.p2024, 0) + ' FCFA/kg', c: C.ink },
          { k: 'Inflation', v: '+' + AC.fmt(pct, 1) + ' %', c: C.danger }
        ] };
      }
    });
  };
})();
