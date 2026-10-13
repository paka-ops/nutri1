/* =====================================================================
 * AgriNutri · Graphiques « Production »
 *   G1  Production vs Besoins (barres groupées + écart déficit/surplus)
 *   G9  Évolution empilée de la production sur 11 campagnes (aires)
 *   G11 Lollipop : taux d'autosuffisance face à la cible de 100 %
 *   G12 Treemap : production par culture et par zone agroclimatique
 * Chaque fabrique renvoie { chart, set(data) } (voir AgriCore.mount).
 * ===================================================================== */
(function () {
  'use strict';
  const C = window.AgriCore.C;
  const AC = window.AgriCore;
  window.AgriCharts = window.AgriCharts || {};

  /* ---------- G1 · Production vs Besoins ---------- */
  window.AgriCharts.productionVsNeeds = function (canvas) {
    const barW = 0.34;
    return AC.mount(canvas, {
      height: 300,
      hit: function (x, y, L, rows) {
        const pl = AC.plot(L, { t: 34, b: 44 });
        if (x < pl.x || x > pl.x + pl.w) return null;
        const gw = pl.w / rows.length;
        return Math.floor((x - pl.x) / gw);
      },
      render: function (g, L, p, hover, rows) {
        const pl = AC.plot(L, { t: 34, b: 44 });
        const maxV = Math.max.apply(null, rows.map(function (r) { return Math.max(r.prod, r.needs); }));
        const sc = AC.niceScale(0, maxV * 1.18, 5);
        const y = AC.linear(sc.min, sc.max, pl.y + pl.h, pl.y);
        AC.gridY(g, pl, sc, function (v) { return AC.fmt(v, 0); });
        AC.legend(g, [{ label: 'Production locale (NutriApp)', color: C.primary }, { label: 'Besoins', color: C.grey, outline: true }], pl.x, 14);
        const gw = pl.w / rows.length;
        const bw = Math.min(26, gw * barW);
        g.save();
        rows.forEach(function (r, i) {
          const cx = pl.x + gw * i + gw / 2;
          const dim = hover !== null && hover !== i;
          g.globalAlpha = dim ? 0.35 : 1;
          // Production : barre verte pleine, coins supérieurs arrondis
          const hP = (y(0) - y(r.prod)) * p;
          const grad = g.createLinearGradient(0, y(r.prod), 0, y(0));
          grad.addColorStop(0, '#22C55E');
          grad.addColorStop(1, C.primary);
          g.fillStyle = grad;
          g.beginPath();
          AC.roundTop(g, cx - bw - 2, y(0) - hP, bw, hP, 6);
          g.fill();
          // Besoins : contour gris
          const hN = (y(0) - y(r.needs)) * p;
          g.strokeStyle = C.grey;
          g.lineWidth = 1.6;
          g.beginPath();
          AC.roundTop(g, cx + 2, y(0) - hN, bw, hN, 6);
          g.stroke();
          // Flèche de déficit (rouge) ou surplus (vert) au-dessus du groupe
          const gap = (r.prod - r.needs) / r.needs;
          const top = y(Math.max(r.prod, r.needs)) - 8;
          const surplus = gap >= 0;
          g.fillStyle = surplus ? C.success : C.danger;
          g.beginPath();
          if (surplus) { g.moveTo(cx, top - 9); g.lineTo(cx - 5, top - 2); g.lineTo(cx + 5, top - 2); }
          else { g.moveTo(cx, top - 2); g.lineTo(cx - 5, top - 9); g.lineTo(cx + 5, top - 9); }
          g.closePath();
          g.globalAlpha = (dim ? 0.35 : 1) * Math.min(1, p * 1.5);
          g.fill();
          g.globalAlpha = dim ? 0.35 : 1;
          // Étiquette
          g.font = AC.font(10, 600);
          g.fillStyle = '#64748B';
          g.textAlign = 'center';
          g.textBaseline = 'top';
          const lab = (r.label || '').length > 9 ? r.label.slice(0, 8) + '…' : r.label;
          g.save();
          g.translate(cx, pl.y + pl.h + 8);
          if (rows.length > 8) g.rotate(-Math.PI / 5);
          g.fillText(lab, 0, 0);
          g.restore();
        });
        g.restore();
      },
      tip: function (i, L, rows) {
        const r = rows[i];
        const gap = (r.prod - r.needs) / r.needs * 100;
        return {
          color: gap >= 0 ? C.success : C.danger,
          title: r.name || r.label,
          rows: [
            { k: 'Production', v: AC.fmt(r.prod, 2) + ' Mt', c: C.primary },
            { k: 'Besoins', v: AC.fmt(r.needs, 2) + ' Mt', c: C.muted },
            { k: 'Écart', v: (gap >= 0 ? '+' : '') + AC.fmt(gap, 1) + ' %', c: gap >= 0 ? C.success : C.danger }
          ]
        };
      }
    });
  };

  /* ---------- G9 · Aires empilées 2014-2024 ---------- */
  window.AgriCharts.productionHistory = function (canvas) {
    return AC.mount(canvas, {
      height: 300,
      hit: function (x, y, L, d) {
        const pl = AC.plot(L, { t: 34, b: 30, r: 16 });
        if (x < pl.x || x > pl.x + pl.w) return null;
        return Math.round((x - pl.x) / pl.w * (d.labels.length - 1));
      },
      render: function (g, L, p, hover, d) {
        const pl = AC.plot(L, { t: 34, b: 30, r: 16 });
        const n = d.labels.length;
        const maxV = Math.max.apply(null, d.total);
        const sc = AC.niceScale(0, maxV * 1.1, 5);
        const yS = AC.linear(sc.min, sc.max, pl.y + pl.h, pl.y);
        const xS = function (i) { return pl.x + (i / (n - 1)) * pl.w; };
        AC.gridY(g, pl, sc, function (v) { return AC.fmt(v, 0) + ' Mt'; });
        AC.legend(g, d.series.map(function (s, i) { return { label: s.name, color: PAL[i] }; }), pl.x, 14);
        // Empilement : chaque série est une bande entre la courbe basse et la courbe haute
        const base = d.series.map(function () { return 0; });
        const cum = d.labels.map(function () { return 0; });
        d.series.forEach(function (s, si) {
          const low = cum.slice();
          const top = cum.map(function (v, i) { return v + s.values[i] * p; });
          const topPts = top.map(function (v, i) { return { x: xS(i), y: yS(v) }; });
          const lowPts = low.map(function (v, i) { return { x: xS(i), y: yS(v) }; }).reverse();
          const grad = g.createLinearGradient(0, pl.y, 0, pl.y + pl.h);
          grad.addColorStop(0, PAL[si] + 'EE');
          grad.addColorStop(1, PAL[si] + '66');
          g.save();
          g.beginPath();
          AC.smoothPath(g, topPts, 0.5);
          AC.smoothPath(g, lowPts, 0.5, true);
          g.closePath();
          g.fillStyle = grad;
          g.globalAlpha = hover !== null ? 0.95 : 1;
          g.fill();
          g.restore();
          for (let i = 0; i < n; i++) cum[i] += s.values[i] * p;
        });
        // Axe X
        AC.labelsX(g, d.labels, d.labels.map(function (_, i) { return xS(i); }), pl.y + pl.h + 8, '#94A3B8', 1);
        // Survol : ligne verticale + tooltip
        if (hover !== null) {
          g.save();
          g.strokeStyle = 'rgba(15,23,42,0.35)';
          g.setLineDash([4, 4]);
          g.beginPath();
          g.moveTo(xS(hover), pl.y);
          g.lineTo(xS(hover), pl.y + pl.h);
          g.stroke();
          g.restore();
        }
      },
      tip: function (i, L, d) {
        const rows = d.series.map(function (s, si) { return { k: s.name, v: AC.fmt(s.values[i], 1) + ' Mt', c: PAL[si] }; });
        const prev = i > 0 ? d.total[i] - d.total[i - 1] : 0;
        rows.push({ k: 'Total', v: AC.fmt(d.total[i], 1) + ' Mt' + (i > 0 ? ' (' + (prev >= 0 ? '+' : '') + AC.fmt(prev, 1) + ')' : ''), c: C.ink });
        return { color: C.primary, title: 'Campagne ' + d.labels[i], rows: rows };
      }
    });
  };

  /* Palette des cultures (aires) */
  const PAL = ['#15803D', '#B45309', '#0369A1', '#A21CAF', '#16A34A', '#64748B'];

  /* ---------- G11 · Lollipop autosuffisance ---------- */
  window.AgriCharts.selfSufficiency = function (canvas) {
    return AC.mount(canvas, {
      height: 280,
      hit: function (x, y, L, rows) {
        const pl = AC.plot(L, { t: 16, b: 52 });
        if (x < pl.x || x > pl.x + pl.w) return null;
        return Math.floor((x - pl.x) / (pl.w / rows.length));
      },
      render: function (g, L, p, hover, rows) {
        const pl = AC.plot(L, { t: 16, b: 52 });
        const maxV = Math.max(120, Math.max.apply(null, rows.map(function (r) { return r.value; })));
        const yS = AC.linear(0, maxV, pl.y + pl.h, pl.y);
        AC.gridY(g, pl, { min: 0, max: maxV, step: 20 }, function (v) { return AC.fmt(v, 0) + '%'; });
        // Ligne cible 100 % (pointillés)
        const yT = yS(100);
        g.save();
        g.strokeStyle = C.secondary;
        g.lineWidth = 1.5;
        g.setLineDash([6, 4]);
        g.beginPath();
        g.moveTo(pl.x, yT);
        g.lineTo(pl.x + pl.w, yT);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = C.secondary;
        g.font = AC.font(10, 700);
        g.textAlign = 'right';
        g.textBaseline = 'bottom';
        g.fillText('Cible 100 %', pl.x + pl.w, yT - 4);
        g.restore();
        const gw = pl.w / rows.length;
        rows.forEach(function (r, i) {
          const cx = pl.x + gw * i + gw / 2;
          const col = r.value >= 100 ? C.success : r.value >= 60 ? C.secondary : C.danger;
          const dim = hover !== null && hover !== i;
          g.save();
          g.globalAlpha = dim ? 0.35 : 1;
          // Tige
          g.strokeStyle = col;
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(cx, yS(0));
          g.lineTo(cx, yS(0) + (yS(r.value) - yS(0)) * p);
          g.stroke();
          // Tête (cercle)
          g.fillStyle = col;
          g.beginPath();
          g.arc(cx, yS(0) + (yS(r.value) - yS(0)) * p, hover === i ? 8 : 6.5, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#FFFFFF';
          g.lineWidth = 2;
          g.stroke();
          g.restore();
          // Étiquette
          g.save();
          g.font = AC.font(10, 600);
          g.fillStyle = '#64748B';
          g.textAlign = 'center';
          g.textBaseline = 'top';
          g.translate(cx, pl.y + pl.h + 8);
          g.rotate(-Math.PI / 4);
          g.fillText(r.label, 0, 0);
          g.restore();
        });
      },
      tip: function (i, L, rows) {
        const r = rows[i];
        return { color: r.value >= 100 ? C.success : C.secondary, title: r.name || r.label, rows: [
          { k: 'Autosuffisance', v: AC.fmt(r.value, 0) + ' %', c: C.ink },
          { k: 'Écart à la cible', v: (r.value - 100 >= 0 ? '+' : '') + AC.fmt(r.value - 100, 0) + ' pts', c: r.value >= 100 ? C.success : C.danger }
        ] };
      }
    });
  };

  /* ---------- G12 · Treemap production ---------- */
  /* Découpe binaire récursive : chaque sous-liste est partagée en deux blocs de poids équivalent */
  function layoutTree(items, x, y, w, h) {
    const out = [];
    (function rec(list, x0, y0, w0, h0) {
      if (!list.length) return;
      if (list.length === 1) { out.push({ item: list[0], x: x0, y: y0, w: w0, h: h0 }); return; }
      const total = list.reduce(function (a, it) { return a + it.value; }, 0);
      let acc = 0, k = 0;
      while (k < list.length - 1 && acc + list[k].value <= total / 2) { acc += list[k].value; k++; }
      if (k === 0) { acc = list[0].value; k = 1; }
      const first = list.slice(0, k), second = list.slice(k);
      const ratio = acc / total;
      if (w0 >= h0) { rec(first, x0, y0, w0 * ratio, h0); rec(second, x0 + w0 * ratio, y0, w0 * (1 - ratio), h0); }
      else { rec(first, x0, y0, w0, h0 * ratio); rec(second, x0, y0 + h0 * ratio, w0, h0 * (1 - ratio)); }
    })(items, x, y, w, h);
    return out;
  }

  window.AgriCharts.cropTreemap = function (canvas) {
    const ZONE_ALPHA = ['cc', 'ee', 'ff'];
    function cells(L, d) {
      const pl = { x: 4, y: 4, w: L.w - 8, h: L.h - 8 };
      const sorted = d.slice().sort(function (a, b) { return b.value - a.value; });
      return layoutTree(sorted, pl.x, pl.y, pl.w, pl.h);
    }
    return AC.mount(canvas, {
      height: 300,
      hit: function (x, y, L, d) {
        const hit = cells(L, d).find(function (c) { return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h; });
        return hit ? d.indexOf(hit.item) : null;
      },
      render: function (g, L, p, hover, d) {
        const boxes = cells(L, d);
        boxes.forEach(function (b) {
          const it = b.item;
          const i = d.indexOf(it);
          const dim = hover !== null && hover !== i;
          const zi = ['Sahélienne', 'Soudano-guinéenne', 'Guinéenne'].indexOf(it.zone);
          const inset = 2;
          g.save();
          g.globalAlpha = (dim ? 0.35 : 1) * Math.min(1, p * 1.4);
          g.fillStyle = it.color + ZONE_ALPHA[zi];
          g.strokeStyle = '#FFFFFF';
          g.lineWidth = 2;
          AC.roundRect(g, b.x + inset, b.y + inset, Math.max(0, b.w - inset * 2), Math.max(0, b.h - inset * 2), 6);
          g.fill();
          g.stroke();
          if (b.w > 70 && b.h > 34) {
            g.fillStyle = '#FFFFFF';
            g.font = AC.font(11, 700);
            g.textBaseline = 'top';
            g.fillText(it.crop, b.x + 10, b.y + 9);
            g.font = AC.font(10, 500);
            g.globalAlpha *= 0.9;
            g.fillText(it.zone + ' · ' + AC.fmt(it.value, 1) + ' Mt', b.x + 10, b.y + 25);
          }
          g.restore();
        });
      },
      tip: function (i, L, d) {
        const it = d[i];
        const total = d.reduce(function (a, x) { return a + x.value; }, 0);
        return { color: it.color, title: it.crop + ' · ' + it.zone, rows: [
          { k: 'Volume', v: AC.fmt(it.value, 2) + ' Mt', c: C.ink },
          { k: 'Part du total', v: AC.fmt(it.value / total * 100, 1) + ' %', c: C.muted }
        ] };
      }
    });
  };
})();
