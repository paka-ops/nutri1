/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : charts/ha-charts-performance.js
 * Rôle    : Graphiques de performance des prises en charge —
 *           G2  « sphereScatter » : corrélations guérison vs abandon,
 *               lignes Sphère (75 % / 15 %), bulles = volume admissions.
 *           G13 « lollipop »       : score composite par zone vs cible 70.
 *           G8  « dumbbell »       : MNT 2015 vs 2024 (points connectés).
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = global.HealthNutriApp;
  const C = HA.COLORS;

  /* Couleur d'une bulle selon le quadrant Sphère atteint */
  function sphereColor(rec, drop) {
    if (rec >= 75 && drop <= 15) return C.tertiary;   // les 2 cibles
    if (rec >= 75 || drop <= 15) return C.quaternary; // 1 cible sur 2
    return C.danger;                                  // hors cibles
  }

  /* ======================================================================
   * G2 — Performance des prises en charge (Scatter 4 quadrants Sphère)
   * X = taux d'abandon (%), Y = taux de guérison (%).
   * ====================================================================== */
  HA.registerChart('sphereScatter', {
    draw(ch, ctx, W, H, p) {
      const zones = ch.data; // [{ name, recovery, dropout, admissions }]
      const plot = { x: 52, y: 16, w: W - 66, h: H - 56 };
      const scX = HA.niceScale(0, Math.max(20, ...zones.map((z) => z.dropout)) * 1.1, 5);
      const scY = HA.niceScale(55, 100, 5);
      const xOf = (v) => plot.x + ((v - scX.min) / (scX.max - scX.min)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - scY.min) / (scY.max - scY.min)) * plot.h;

      /* Fond des 4 quadrants (vert = cibles Sphère atteintes) */
      const qx = xOf(15), qy = yOf(75);
      ctx.save();
      ctx.fillStyle = HA.hexA(C.tertiary, 0.07);
      ctx.fillRect(plot.x, plot.y, qx - plot.x, qy - plot.y);
      ctx.fillStyle = HA.hexA(C.danger, 0.05);
      ctx.fillRect(qx, qy, plot.x + plot.w - qx, plot.y + plot.h - qy);
      ctx.restore();

      HA.drawYGrid(ctx, plot, scY, (v) => v + ' %');
      HA.drawXGrid(ctx, plot, scX, (v) => v + ' %');
      ctx.save();
      ctx.font = HA.font(11, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'center';
      ctx.fillText('Taux d’abandon →', plot.x + plot.w / 2, H - 4);
      ctx.restore();

      /* Lignes de référence Sphère */
      const a = HA.ease(HA.clamp(p * 1.4, 0, 1));
      ctx.save(); ctx.globalAlpha = a;
      HA.dashedLine(ctx, plot.x, qy, plot.x + plot.w, qy, C.tertiary, 'Guérison 75 %');
      HA.dashedLine(ctx, qx, plot.y, qx, plot.y + plot.h, C.quaternary, null);
      ctx.restore();
      ctx.save();
      ctx.font = HA.font(10, 700); ctx.fillStyle = '#B45309';
      ctx.textAlign = 'left';
      ctx.fillText('Abandon 15 %', Math.min(qx + 6, plot.x + plot.w - 76), plot.y + plot.h - 8);
      ctx.restore();

      /* Bulles dimensionnées par les admissions terrain */
      const maxAdm = Math.max(...zones.map((z) => z.admissions));
      zones.forEach((z, i) => {
        const col = sphereColor(z.recovery, z.dropout);
        const r = 5 + 17 * Math.sqrt(z.admissions / maxAdm);
        const grow = HA.stagger(p, i, zones.length);
        const rr = Math.max(0.1, r * grow);
        const hov = ch.hover === 'b' + i;
        const dim = ch.hover && !hov; // opacification des voisines
        ctx.save();
        ctx.globalAlpha = dim ? 0.3 : 1;
        if (hov) {
          ctx.beginPath(); ctx.arc(xOf(z.dropout), yOf(z.recovery), rr + 7 * ch.hoverT + 3, 0, Math.PI * 2);
          ctx.fillStyle = HA.hexA(col, 0.18); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(xOf(z.dropout), yOf(z.recovery), rr, 0, Math.PI * 2);
        ctx.fillStyle = HA.hexA(col, hov ? 0.85 : 0.55); ctx.fill();
        ctx.lineWidth = hov ? 2.5 : 1.5; ctx.strokeStyle = col; ctx.stroke();
        /* Code zone au centre des grandes bulles (initiales pour les districts) */
        if (rr > 13) {
          const tag = z.code.length <= 2 ? z.code : z.name.split(/[\s–-]+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
          ctx.fillStyle = '#fff'; ctx.font = HA.font(9, 800);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(tag, xOf(z.dropout), yOf(z.recovery));
        }
        ctx.restore();
        ch.hit({
          type: 'pt', key: 'b' + i, x: xOf(z.dropout), y: yOf(z.recovery), r: Math.max(r, 10), clickable: true, item: z,
          tip: {
            title: z.name, color: col,
            sub: z.recovery >= 75 && z.dropout <= 15 ? 'Cibles Sphère atteintes' : 'Sous les cibles Sphère',
            rows: [
              { color: C.tertiary, label: 'Guérison', value: HA.fmtPct(z.recovery, 0) },
              { color: C.quaternary, label: 'Abandon', value: HA.fmtPct(z.dropout, 0) },
              { color: C.primary, label: 'Admissions', value: HA.fmtInt(z.admissions) }
            ]
          }
        });
      });
    }
  });

  /* ======================================================================
   * G13 — Lollipop : score composite NutriApp par zone (cible 70 pts).
   * Tiges horizontales + pastilles, triées par score décroissant.
   * ====================================================================== */
  HA.registerChart('lollipop', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; // { zones:[{name, score}], target:70 }
      const list = d.zones.slice(0, 12);
      const plot = { x: 118, y: 10, w: W - 168, h: H - 44 };
      const scX = HA.niceScale(0, 100, 5);
      const xOf = (v) => plot.x + ((v - scX.min) / (scX.max - scX.min)) * plot.w;
      const rowH = plot.h / list.length;
      const yOf = (i) => plot.y + rowH * (i + 0.5);
      HA.drawXGrid(ctx, plot, scX, (v) => v, { noLabels: false });

      /* Ligne d'objectif global 70 pts */
      HA.dashedLine(ctx, xOf(d.target), plot.y - 4, xOf(d.target), plot.y + plot.h, C.primary, 'Cible 70');

      list.forEach((z, i) => {
        const y = yOf(i);
        const hov = ch.hover === 'l' + i;
        const col = z.score >= d.target ? C.tertiary : z.score >= 55 ? C.quaternary : C.danger;
        const a = HA.stagger(p, i, list.length);
        /* Nom de zone */
        ctx.save();
        ctx.font = HA.font(11, hov ? 700 : 500);
        ctx.fillStyle = hov ? C.title : C.body;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(HA.ellipsis(ctx, z.name, 108), plot.x - 8, y);
        ctx.restore();
        /* Tige */
        ctx.save();
        ctx.strokeStyle = HA.hexA(col, hov ? 1 : 0.45);
        ctx.lineWidth = hov ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + (xOf(z.score) - plot.x) * a, y); ctx.stroke();
        /* Pastille */
        ctx.beginPath(); ctx.arc(plot.x + (xOf(z.score) - plot.x) * a, y, hov ? 7 : 5.5, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        /* Valeur */
        ctx.font = HA.font(11, 700); ctx.fillStyle = col;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(z.score + ' pts', xOf(z.score) + 10, y);
        ctx.restore();
        ch.hit({
          type: 'rect', key: 'l' + i, x: 0, y: y - rowH / 2, w: W, h: rowH,
          tip: {
            title: z.name, color: col,
            rows: [
              { color: col, label: 'Score composite', value: z.score + ' pts' },
              { color: C.primary, label: 'Objectif global', value: d.target + ' pts' },
              { color: z.score >= d.target ? C.tertiary : C.danger, label: 'Écart', value: (z.score >= d.target ? '+' : '') + (z.score - d.target) + ' pts' }
            ]
          }
        });
      });
    }
  });

  /* ======================================================================
   * G8 — Dumbbell : maladies chroniques & nutrition (2015 vs 2024).
   * Points connectés mesurant l'évolution de chaque indicateur.
   * ====================================================================== */
  HA.registerChart('dumbbell', {
    draw(ch, ctx, W, H, p) {
      const items = ch.data; // [{ label, v2015, v2024, unit, invert? }]
      const plot = { x: 16, y: 34, w: W - 32, h: H - 66 };
      const maxV = Math.max(...items.map((it) => Math.max(it.v2015, it.v2024)));
      const sc = HA.niceScale(0, maxV * 1.15, 5);
      const xOf = (v) => plot.x + ((v - sc.min) / (sc.max - sc.min)) * plot.w;
      const rowH = plot.h / items.length;
      const yOf = (i) => plot.y + rowH * (i + 0.5);
      HA.drawXGrid(ctx, plot, sc, (v) => v + ' %');

      items.forEach((it, i) => {
        const y = yOf(i);
        const hov = ch.hover === 'd' + i;
        const worse = it.invert ? it.v2024 > it.v2015 : it.v2024 > it.v2015;
        const col = worse ? (it.invert ? C.danger : C.quaternary) : C.tertiary;
        const a = HA.stagger(p, i, items.length);
        /* Libellé */
        ctx.save();
        ctx.font = HA.font(12, 600); ctx.fillStyle = hov ? C.title : C.body;
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(it.label, plot.x, y - 12);
        /* Évolution */
        const evo = it.v2024 - it.v2015;
        ctx.font = HA.font(11, 700); ctx.fillStyle = col; ctx.textAlign = 'right';
        ctx.fillText((evo >= 0 ? '+' : '') + evo.toFixed(1).replace('.', ',') + ' pts', plot.x + plot.w, y - 12);
        ctx.restore();
        /* Connecteur */
        const x0 = xOf(it.v2015), x1 = plot.x + (xOf(it.v2024) - plot.x) * a;
        ctx.save();
        ctx.strokeStyle = HA.hexA(col, hov ? 0.9 : 0.4);
        ctx.lineWidth = hov ? 3 : 2;
        ctx.setLineDash(hov ? [] : [2, 3]);
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.setLineDash([]);
        /* Point 2015 (creux gris) */
        ctx.beginPath(); ctx.arc(x0, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#CBD5E1'; ctx.stroke();
        /* Point 2024 (plein couleur) */
        ctx.beginPath(); ctx.arc(x1, y, hov ? 8 : 6.5, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        /* Valeurs */
        ctx.font = HA.font(10, 600);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(String(it.v2015).replace('.', ','), x0, y + 10);
        ctx.fillStyle = col;
        ctx.fillText(String(it.v2024).replace('.', ','), x1, y + 10);
        ctx.restore();
        ch.hit({
          type: 'rect', key: 'd' + i, x: plot.x, y: y - rowH / 2 + 6, w: plot.w, h: rowH - 6,
          tip: {
            title: it.label, color: col, sub: 'Évolution 2015 → 2024',
            rows: [
              { color: '#94A3B8', label: '2015', value: String(it.v2015).replace('.', ',') + ' %' },
              { color: col, label: '2024', value: String(it.v2024).replace('.', ',') + ' %' },
              { color: col, label: 'Évolution', value: (evo >= 0 ? '+' : '') + evo.toFixed(1).replace('.', ',') + ' pts' }
            ]
          }
        });
      });
    }
  });
})(window);
