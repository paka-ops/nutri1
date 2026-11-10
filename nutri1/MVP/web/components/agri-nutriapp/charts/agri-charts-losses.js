/* =====================================================================
 * AgriNutri · Graphiques « Post-Récolte & Pertes »
 *   G5  Cascade (waterfall) des pertes : de la ferme à la table (8 étapes)
 *   G10 Bubble : pertes post-récolte vs revenu net de l'exploitant
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AgriCore;
  const C = AC.C;
  window.AgriCharts = window.AgriCharts || {};

  /* ---------- G5 · Waterfall des pertes ---------- */
  /* Transforme les pertes par étape en barres flottantes : potentiel (100 %), puis chaque perte */
  function buildBars(rows) {
    let level = 100;
    const out = [{ name: 'Potentiel', from: 0, to: 100, total: true, value: 100 }];
    rows.forEach(function (r) {
      out.push({ name: r.name, from: level, to: level - r.loss, total: false, value: r.loss });
      level -= r.loss;
    });
    return { bars: out, consumed: level };
  }

  window.AgriCharts.wasteWaterfall = function (canvas) {
    return AC.mount(canvas, {
      height: 320,
      hit: function (x, y, L, rows) {
        const pl = AC.plot(L, { t: 34, b: 58 });
        if (x < pl.x || x > pl.x + pl.w) return null;
        return Math.floor((x - pl.x) / (pl.w / buildBars(rows).bars.length));
      },
      render: function (g, L, p, hover, rows) {
        const B = buildBars(rows);
        const pl = AC.plot(L, { t: 34, b: 58 });
        const yS = AC.linear(0, 100, pl.y + pl.h, pl.y);
        AC.gridY(g, pl, { min: 0, max: 100, step: 20 }, function (v) { return AC.fmt(v, 0) + '%'; });
        AC.legend(g, [{ label: 'Potentiel / consommé', color: C.primary }, { label: 'Pertes (pts)', color: C.danger }], pl.x, 12);
        const n = B.bars.length;
        const slot = pl.w / n;
        const bw = Math.min(56, slot * 0.6);
        B.bars.forEach(function (b, i) {
          const cx = pl.x + slot * i + slot / 2;
          const dim = hover !== null && hover !== i;
          // Animation décalée par étape
          const k = Math.max(0, Math.min(1, p * 1.5 - i * 0.1));
          const top = yS(b.to), bot = yS(b.from);
          const hBar = (bot - top) * k;
          const yTop = bot - hBar;
          g.save();
          g.globalAlpha = dim ? 0.35 : 1;
          g.fillStyle = b.total ? C.primary : C.danger;
          g.beginPath();
          AC.roundTop(g, cx - bw / 2, yTop, bw, hBar, 6);
          g.fill();
          // Connecteur pointillé vers la barre suivante
          if (i < n - 1 && k >= 1) {
            g.strokeStyle = 'rgba(100,116,139,0.45)';
            g.setLineDash([3, 3]);
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(cx + bw / 2, yS(b.to));
            g.lineTo(cx + slot - bw / 2, yS(b.to));
            g.stroke();
          }
          // Valeur au-dessus de la barre
          g.font = AC.font(11, 700);
          g.fillStyle = b.total ? C.primary : C.danger;
          g.textAlign = 'center';
          g.textBaseline = 'bottom';
          g.globalAlpha = (dim ? 0.35 : 1) * k;
          g.fillText(b.total ? '100' : '−' + AC.fmt(b.value, 1), cx, yTop - 4);
          // Libellé d'étape
          g.globalAlpha = dim ? 0.35 : 1;
          g.font = AC.font(11, 600);
          g.fillStyle = '#334155';
          g.textBaseline = 'top';
          g.fillText(b.name, cx, pl.y + pl.h + 8);
          g.restore();
        });
        // Résultat final : part consommée
        g.save();
        g.font = AC.font(12, 800);
        g.fillStyle = C.primary;
        g.textAlign = 'right';
        g.textBaseline = 'top';
        g.fillText('Consommé par les ménages : ' + AC.fmt(B.consumed, 1) + ' %  ·  Perdu : ' + AC.fmt(100 - B.consumed, 1) + ' %', pl.x + pl.w, pl.y + pl.h + 32);
        g.restore();
      },
      tip: function (i, L, rows) {
        const b = buildBars(rows).bars[i];
        if (!b) return null;
        return { color: b.total ? C.primary : C.danger, title: b.name, rows: b.total ? [
          { k: 'Potentiel au champ', v: '100 %', c: C.primary }
        ] : [
          { k: 'Perte à cette étape', v: '−' + AC.fmt(b.value, 1) + ' pts', c: C.danger },
          { k: 'Niveau restant', v: AC.fmt(b.to, 1) + ' %', c: C.ink }
        ] };
      }
    });
  };

  /* ---------- G10 · Bubble pertes vs revenu ---------- */
  window.AgriCharts.lossVsIncome = function (canvas) {
    const X_MIN = 10, X_MAX = 30, Y_MIN = 400, Y_MAX = 1700;
    return AC.mount(canvas, {
      height: 320,
      hit: function (x, y, L, d) {
        const pl = AC.plot(L, { t: 20, b: 40, l: 60 });
        const xS = AC.linear(X_MIN, X_MAX, pl.x, pl.x + pl.w), yS = AC.linear(Y_MIN, Y_MAX, pl.y + pl.h, pl.y);
        let best = null, bd = 900;
        d.forEach(function (b, i) {
          const rr = radius(b.r, d);
          const dd = Math.hypot(xS(b.x) - x, yS(b.y) - y) - rr;
          if (dd < 0 && Math.abs(dd) < bd) { bd = Math.abs(dd); best = i; }
        });
        return best;
      },
      render: function (g, L, p, hover, d) {
        const pl = AC.plot(L, { t: 20, b: 40, l: 60 });
        const xS = AC.linear(X_MIN, X_MAX, pl.x, pl.x + pl.w), yS = AC.linear(Y_MIN, Y_MAX, pl.y + pl.h, pl.y);
        AC.gridY(g, pl, { min: Y_MIN, max: Y_MAX, step: 300 }, function (v) { return AC.fmt(v, 0) + ' $'; });
        g.save();
        g.font = AC.font(11, 500);
        g.fillStyle = '#94A3B8';
        g.textAlign = 'center';
        g.textBaseline = 'top';
        for (let v = X_MIN; v <= X_MAX; v += 5) g.fillText(v + '%', xS(v), pl.y + pl.h + 6);
        g.fillStyle = '#64748B';
        g.font = AC.font(11, 600);
        g.fillText('Taux de pertes post-récolte (%)', pl.x + pl.w / 2, pl.y + pl.h + 22);
        g.restore();
        // Bulles triées par taille pour que les petites restent visibles
        const order = d.map(function (b, i) { return i; }).sort(function (a, b) { return d[b].r - d[a].r; });
        order.forEach(function (i) {
          const b = d[i];
          const dim = hover !== null && hover !== i;
          const rr = radius(b.r, d) * p;
          g.save();
          g.globalAlpha = (dim ? 0.3 : 0.6) * Math.min(1, p * 1.5);
          const grad = g.createRadialGradient(xS(b.x), yS(b.y), 0, xS(b.x), yS(b.y), Math.max(1, rr));
          grad.addColorStop(0, '#4ADE80');
          grad.addColorStop(1, C.primary);
          g.fillStyle = grad;
          g.beginPath(); g.arc(xS(b.x), yS(b.y), Math.max(1, rr), 0, Math.PI * 2); g.fill();
          g.globalAlpha = dim ? 0.35 : 1;
          g.strokeStyle = hover === i ? '#0F172A' : C.primary;
          g.lineWidth = hover === i ? 2 : 1;
          g.stroke();
          if (rr > 12 && p > 0.9) {
            g.font = AC.font(10, 700);
            g.fillStyle = '#14532D';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(b.label.slice(0, 3).toUpperCase(), xS(b.x), yS(b.y));
          }
          g.restore();
        });
        // Droite de tendance négative (indicative)
        g.save();
        g.strokeStyle = C.danger;
        g.setLineDash([6, 5]);
        g.lineWidth = 1.5;
        g.globalAlpha = 0.7;
        g.beginPath();
        g.moveTo(xS(X_MIN), yS(1500));
        g.lineTo(xS(X_MIN) + (xS(X_MAX) - xS(X_MIN)) * p, yS(1500) + (yS(700) - yS(1500)) * p);
        g.stroke();
        g.restore();
        AC.legend(g, [{ label: 'Taille = volume produit (Mt)', color: C.primary }, { label: 'Tendance négative', color: C.danger, outline: true }], pl.x, 8);
      },
      tip: function (i, L, d) {
        const b = d[i];
        return { color: C.primary, title: b.label, rows: [
          { k: 'Pertes post-récolte', v: AC.fmt(b.x, 1) + ' %', c: C.danger },
          { k: 'Revenu net / an', v: AC.fmt(b.y, 0) + ' USD', c: C.primary },
          { k: 'Production', v: AC.fmt(b.r, 2) + ' Mt', c: C.muted }
        ] };
      }
    });
  };

  /* Rayon proportionnel à la racine du volume (aire ∝ production) */
  function radius(r, all) {
    const max = Math.max.apply(null, all.map(function (b) { return b.r; })) || 1;
    return 4 + 30 * Math.sqrt(r / max);
  }
})();
