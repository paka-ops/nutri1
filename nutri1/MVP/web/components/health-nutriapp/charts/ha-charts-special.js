/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : charts/ha-charts-special.js
 * Rôle    : Graphiques spéciaux —
 *           G9  « funnelCPN » : entonnoir vertical du dépistage CPN
 *               (gap de 59 % de femmes non dépistées mis en évidence).
 *           G11 « treemap »   : rectangles proportionnels des comorbidités
 *               & MNT (algorithme squarify).
 *           G15 « scoreSpark »: mini-sparkline des cellules du scorecard.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = global.HealthNutriApp;
  const C = HA.COLORS;

  /* ======================================================================
   * G9 — Funnel du dépistage CPN dans NutriApp.
   * ====================================================================== */
  HA.registerChart('funnelCPN', {
    draw(ch, ctx, W, H, p) {
      const steps = ch.data; // [{ label, value }] (5 étapes décroissantes)
      const max = steps[0].value;
      const plot = { x: 12, y: 8, w: W - 150, h: H - 16 };
      const gap = 10;
      const rh = (plot.h - gap * (steps.length - 1)) / steps.length;
      const cx = plot.x + plot.w / 2;

      steps.forEach((s, i) => {
        const frac = s.value / max;
        const w = Math.max(46, plot.w * (0.28 + 0.72 * frac));
        const y = plot.y + i * (rh + gap);
        const a = HA.stagger(p, i, steps.length);
        const hov = ch.hover === 'f' + i;
        const cols = [C.primary, C.primary2, C.secondary, C.tertiary, '#34D399'];
        const col = cols[i % cols.length];
        ctx.save();
        ctx.globalAlpha = a;
        /* Barre d'entonnoir centrée, coins arrondis */
        HA.roundRect(ctx, cx - (w * a) / 2, y, w * a, rh, 10);
        const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        g.addColorStop(0, HA.hexA(col, 0.75));
        g.addColorStop(0.5, col);
        g.addColorStop(1, HA.hexA(col, 0.75));
        ctx.fillStyle = g; ctx.fill();
        if (hov) { ctx.lineWidth = 2.5; ctx.strokeStyle = C.title; ctx.stroke(); }
        /* Valeur + % dans la barre */
        if (w * a > 120) {
          ctx.fillStyle = '#fff';
          ctx.font = HA.font(12, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(HA.fmtInt(s.value), cx, y + rh / 2 - 7);
          ctx.font = HA.font(10, 600);
          ctx.fillText((frac * 100).toFixed(1).replace('.', ',') + ' %', cx, y + rh / 2 + 9);
        }
        ctx.restore();
        /* Libellé à droite + effectif + conversion vs étape précédente */
        ctx.save();
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = HA.font(11, hov ? 700 : 600);
        ctx.fillStyle = hov ? C.title : C.body;
        ctx.fillText(HA.ellipsis(ctx, s.label, 128), plot.x + plot.w + 10, y + rh / 2 - 13);
        ctx.font = HA.font(11, 800); ctx.fillStyle = C.title;
        ctx.fillText(HA.fmtInt(s.value), plot.x + plot.w + 10, y + rh / 2 + 2);
        if (i === 0) {
          ctx.font = HA.font(10, 500); ctx.fillStyle = C.label;
          ctx.fillText('Cohorte de référence', plot.x + plot.w + 10, y + rh / 2 + 15);
        } else {
          const conv = (s.value / steps[i - 1].value) * 100;
          ctx.fillStyle = i === 1 ? C.danger : C.tertiary;
          ctx.font = HA.font(10, 700);
          ctx.fillText('→ ' + conv.toFixed(1).replace('.', ',') + ' %', plot.x + plot.w + 10, y + rh / 2 + 15);
        }
        ctx.restore();
        /* Marqueur du gap 59 % entre étape 1 et 2 */
        if (i === 0) {
          const gapPct = (1 - steps[1].value / steps[0].value) * 100;
          ctx.save();
          ctx.font = HA.font(10, 700); ctx.fillStyle = C.danger;
          ctx.textAlign = 'center';
          ctx.fillText('▼ gap : ' + gapPct.toFixed(0) + ' % non dépistées', cx, y + rh + gap / 2 + 4);
          ctx.restore();
        }
        ch.hit({
          type: 'rect', key: 'f' + i, x: 0, y, w: W, h: rh,
          tip: {
            title: s.label, color: col,
            rows: [
              { color: col, label: 'Effectif', value: HA.fmtInt(s.value) },
              { color: C.body, label: 'Part de la cohorte', value: (frac * 100).toFixed(1).replace('.', ',') + ' %' }
            ].concat(i > 0 ? [{ color: i === 1 ? C.danger : C.tertiary, label: 'Conversion', value: ((s.value / steps[i - 1].value) * 100).toFixed(1).replace('.', ',') + ' %' }] : []),
            note: i === 1 ? '⚠ 59 % de femmes enceintes non dépistées' : null
          }
        });
      });
    }
  });

  /* ======================================================================
   * G11 — Treemap : comorbidités & MNT associées à la nutrition.
   * Mise en page « squarify » (rectangles les plus carrés possible).
   * ====================================================================== */
  const GROUP_COLORS = {
    mnt: ['#7C3AED', '#8B5CF6', '#A855F7', '#C084FC'],
    infect: ['#06B6D4', '#22D3EE', '#0891B2', '#67E8F9'],
    nut: ['#F59E0B', '#FBBF24', '#EF4444', '#FCA5A5']
  };
  function squarify(items, x, y, w, h) {
    /* Découpage hiérarchique alterné (slice-and-dice pondéré) : pour
     * 8 éléments, il produit des rectangles lisibles et stables. */
    const rects = [];
    const sorted = items.slice().sort((a, b) => b.value - a.value);
    const stack = [{ list: sorted, x, y, w, h, horiz: w >= h }];
    while (stack.length) {
      const { list, x: px, y: py, w: pw, h: ph, horiz } = stack.pop();
      if (list.length === 1) { rects.push({ it: list[0], x: px, y: py, w: pw, h: ph }); continue; }
      const sum = list.reduce((s, it) => s + it.value, 0);
      let acc = 0, cut = 1;
      for (let i = 0; i < list.length; i++) { acc += list[i].value; if (acc / sum >= 0.5) { cut = i + 1; break; } }
      const f = acc / sum;
      if (horiz) {
        stack.push({ list: list.slice(0, cut), x: px, y: py, w: pw * f, h: ph, horiz: !horiz });
        stack.push({ list: list.slice(cut), x: px + pw * f, y: py, w: pw * (1 - f), h: ph, horiz: !horiz });
      } else {
        stack.push({ list: list.slice(0, cut), x: px, y: py, w: pw, h: ph * f, horiz: !horiz });
        stack.push({ list: list.slice(cut), x: px, y: py + ph * f, w: pw, h: ph * (1 - f), horiz: !horiz });
      }
    }
    return rects;
  }
  HA.registerChart('treemap', {
    draw(ch, ctx, W, H, p) {
      const items = ch.data; // [{ label, value, group }]
      const total = items.reduce((s, it) => s + it.value, 0) || 1;
      const rects = squarify(items, 4, 4, W - 8, H - 8);
      const groupIdx = { mnt: 0, infect: 0, nut: 0 };
      const colorOf = (it) => {
        const pal = GROUP_COLORS[it.group] || GROUP_COLORS.mnt;
        return pal[groupIdx[it.group]++ % pal.length];
      };
      // Ordre stable des couleurs : tri par groupe puis valeur
      const order = items.slice().sort((a, b) => a.group.localeCompare(b.group) || b.value - a.value);
      const colMap = new Map();
      order.forEach((it) => colMap.set(it.label, colorOf(it)));
      rects.forEach((r, i) => {
        const a = HA.stagger(p, i, rects.length, 0.5);
        const col = colMap.get(r.it.label);
        const hov = ch.hover === 't' + i;
        /* Apparition : fondu + léger zoom depuis le centre du rectangle */
        const zx = r.x + r.w / 2, zy = r.y + r.h / 2;
        const x = zx + (r.x + 2 - zx) * a, y = zy + (r.y + 2 - zy) * a;
        const w = (r.w - 4) * a, h = (r.h - 4) * a;
        ctx.save();
        ctx.globalAlpha = a;
        if (w > 2 && h > 2) {
          HA.roundRect(ctx, x, y, w, h, 8);
          const g = ctx.createLinearGradient(x, y, x, y + h);
          g.addColorStop(0, col); g.addColorStop(1, HA.mix(col, '#000000', 0.18));
          ctx.fillStyle = g; ctx.fill();
          if (hov) { ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          /* Étiquette si la place le permet */
          if (w > 64 && h > 40) {
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.font = HA.font(Math.min(13, w / 9), 700);
            ctx.fillText(HA.ellipsis(ctx, r.it.label, w - 16), x + 10, y + 8);
            ctx.font = HA.font(11, 600);
            ctx.fillText(HA.fmtInt(r.it.value) + ' · ' + (r.it.value / total * 100).toFixed(1).replace('.', ',') + ' %', x + 10, y + 28);
          } else if (w > 30 && h > 24) {
            ctx.fillStyle = '#fff'; ctx.font = HA.font(11, 800);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText((r.it.value / total * 100).toFixed(0) + ' %', x + w / 2, y + h / 2);
          }
        }
        ctx.restore();
        ch.hit({
          type: 'rect', key: 't' + i, x: r.x, y: r.y, w: r.w, h: r.h,
          tip: {
            title: r.it.label, color: col,
            sub: r.it.group === 'mnt' ? 'Maladie non transmissible' : r.it.group === 'nut' ? 'Nutrition' : 'Infectieux associé',
            rows: [
              { color: col, label: 'Cas enregistrés (App)', value: HA.fmtInt(r.it.value) },
              { color: C.body, label: 'Part du total', value: (r.it.value / total * 100).toFixed(1).replace('.', ',') + ' %' }
            ]
          }
        });
      });
    }
  });

  /* ======================================================================
   * G15 — Mini-sparkline des cellules du scorecard (canvas 96×30).
   * ====================================================================== */
  HA.registerChart('scoreSpark', {
    draw(ch, ctx, W, H) {
      const d = ch.data; // { values:[], color }
      const vals = d.values;
      const min = Math.min(...vals), max = Math.max(...vals);
      const span = max - min || 1;
      const pts = vals.map((v, i) => ({ x: 2 + (i / (vals.length - 1)) * (W - 4), y: 2 + (1 - (v - min) / span) * (H - 4) }));
      ctx.beginPath();
      HA.smoothPath(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, H);
      ctx.lineTo(pts[0].x, H);
      ctx.closePath();
      ctx.fillStyle = HA.vGradient(ctx, 0, H, d.color, 0.28, 0);
      ctx.fill();
      ctx.beginPath(); HA.smoothPath(ctx, pts);
      ctx.strokeStyle = d.color; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 2, 0, Math.PI * 2);
      ctx.fillStyle = d.color; ctx.fill();
    }
  });
})(window);
