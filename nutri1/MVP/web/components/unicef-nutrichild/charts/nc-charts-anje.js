/* ============================================================================
 * UNICEF NutriChild · charts/nc-charts-anje.js
 * Graphiques ANJE (alimentation du nourrisson et du jeune enfant) :
 *   G3  radarANJE   — Profil radar octogonal (8 indicateurs OMS)
 *   G6  heatmapANJE — Matrice pratiques ANJE × pays / districts
 *   G12 barresANJE  — Barres groupées des 5 pratiques essentielles par zone
 * 100 % Canvas 2D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  const C = NC.COLORS;

  /* =========================================================================
   * G3 — PROFIL RADAR ANJE (8 AXES OMS)
   * ======================================================================= */
  NC.registerChart('radarANJE', {
    label: 'Profil radar des huit indicateurs ANJE',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const axes = d.axes;
      const n = axes.length;
      const cx = W / 2, cy = H / 2 + 8;
      const R = Math.min(W / 2 - 106, H / 2 - 44);
      const MAXLAB = Math.max(70, W / 2 - 14);
      const MAX = 100;
      const ang = (i) => -Math.PI / 2 + (i * Math.PI * 2) / n;
      const rOf = (v) => (NC.clamp(v, 0, MAX) / MAX) * R;

      /* Anneaux de la grille (20 / 40 / 60 / 80 / 100) */
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      for (let t = 1; t <= 5; t++) {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = ang(i % n), r = (R * t) / 5;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      /* Rayons */
      axes.forEach((a, i) => {
        const an = ang(i);
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R);
        ctx.stroke();
      });
      /* Cercle de l'objectif OMS (repère de référence) */
      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = NC.hexA(C.primary, 0.5); ctx.lineWidth = 1.4;
      ctx.arc(cx, cy, (60 / MAX) * R, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      /* Libellés des axes (positionnés à l'extérieur, alignés dynamiquement) */
      ctx.save();
      ctx.font = NC.font(10.5, 600); ctx.fillStyle = C.label;
      axes.forEach((a, i) => {
        const an = ang(i);
        const cos = Math.cos(an), sin = Math.sin(an);
        /* L'ancrage s'écarte davantage en haut/bas qu'à l'horizontale, où la
         * place manque : le libellé est ensuite ramené dans le canvas. */
        const off = 30 - 15 * Math.abs(cos);
        let lx = cx + cos * (R + off);
        const ly = cy + sin * (R + 22);
        ctx.fillStyle = C.value;
        ctx.font = NC.font(10, 600);
        const label = NC.ellipsis(ctx, a.short, MAXLAB);
        const tw = ctx.measureText(label).width;
        ctx.textAlign = Math.abs(cos) < 0.28 ? 'center' : cos > 0 ? 'left' : 'right';
        ctx.textBaseline = sin > 0.5 ? 'top' : sin < -0.5 ? 'bottom' : 'middle';
        if (ctx.textAlign === 'left') lx = Math.min(lx, W - 8 - tw);
        if (ctx.textAlign === 'right') lx = Math.max(lx, 8 + tw);
        lx = NC.clamp(lx, 8, W - 8);
        ctx.fillText(label, lx, ly);
        /* Objectif OMS compact sous le libellé */
        ctx.font = NC.font(8.5, 600); ctx.fillStyle = NC.hexA(C.primary, 0.85);
        const ty = ly + (ctx.textBaseline === 'top' ? 11 : ctx.textBaseline === 'bottom' ? -11 : 11);
        ctx.fillText('OMS ' + a.oms + '%', lx, ty);
      });
      ctx.restore();

      /* Zones réactives : une par axe (bande radiale) */
      axes.forEach((a, i) => {
        const an = ang(i), half = Math.PI / n;
        ch.hit({
          type: 'arc', key: 'ax' + i, cx: cx, cy: cy, r0: 0, r1: R + 26, a0: an - half, a1: an + half,
          tip: {
            title: a.label,
            sub: 'Objectif OMS : ' + a.oms + ' %',
            color: C.primary,
            rows: d.series.map((s) => ({
              color: s.color, label: s.label, value: NC.fmtDec(s.values[i], 0) + ' %'
            })),
            note: 'Source : questionnaires ménages saisis dans l’App'
          }
        });
      });

      /* Polygones des séries */
      d.series.forEach((s, si) => {
        if (ch.hidden.has(s.key)) return;
        const grow = NC.stagger(p, si, d.series.length, 0.4);
        const pts = s.values.map((v, i) => {
          const a = ang(i), r = rOf(v) * (0.5 + 0.5 * grow);
          return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, v: v, i: i };
        });
        ctx.save();
        ctx.beginPath();
        pts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
        ctx.closePath();
        ctx.fillStyle = NC.hexA(s.color, s.dashed ? 0.05 : 0.10 * grow);
        ctx.fill();
        ctx.strokeStyle = NC.hexA(s.color, s.dashed ? 0.75 : 0.95);
        ctx.lineWidth = s.dashed ? 1.6 : 2.4;
        if (s.dashed) ctx.setLineDash([6, 4]);
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.setLineDash([]);
        /* Sommets : cercles + halo au survol */
        pts.forEach((pt) => {
          const key = 'v' + si + '-' + pt.i;
          const hov = ch.hover === key;
          NC.point(ctx, pt.x, pt.y, s.color, hov ? 1 : 0, s.dashed ? 3 : 4);
          ch.hit({
            type: 'pt', key: key, x: pt.x, y: pt.y, r: 12,
            tip: {
              title: s.label, sub: axes[pt.i].label,
              color: s.color,
              rows: [
                { label: 'Valeur mesurée', value: NC.fmtDec(pt.v, 0) + ' %' },
                { label: 'Objectif OMS', value: axes[pt.i].oms + ' %' },
                { label: 'Écart à l’objectif', value: (pt.v >= axes[pt.i].oms ? '+' : '−') + NC.fmtDec(Math.abs(pt.v - axes[pt.i].oms), 0) + ' pts' }
              ]
            }
          });
        });
        ctx.restore();
      });

      /* Score composite au centre (sur un disque blanc : la grille radiale
       * ne vient plus brouiller la lecture du chiffre) */
      let sc = 0;
      const first = d.series.filter((s) => !s.dashed)[0] || d.series[0];
      if (first) first.values.forEach((v) => { sc += v; });
      sc = first ? sc / first.values.length : 0;
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = NC.font(9.5, 700); ctx.fillStyle = C.label;
      ctx.fillText('SCORE ANJE', cx, cy - 14);
      ctx.font = NC.font(17, 800); ctx.fillStyle = NC.scaleRG(sc / 100);
      ctx.fillText(NC.fmtDec(sc, 0), cx, cy + 2);
      ctx.restore();
    }
  });

  /* =========================================================================
   * G6 — HEATMAP MATRICE ANJE (PAYS / DISTRICTS × 8 INDICATEURS)
   * ======================================================================= */
  NC.registerChart('heatmapANJE', {
    label: 'Matrice colorée des pratiques ANJE par pays ou district',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const labelW = Math.min(140, W * 0.26);
      const headH = 52;
      const plot = { x: labelW, y: headH, w: W - labelW - 8, h: H - headH - 22 };
      const rows = d.rows, cols = d.cols;
      const cw = plot.w / cols.length;
      const rh = Math.min(30, plot.h / rows.length);

      /* En-têtes de colonnes (indicateurs ANJE) */
      ctx.save();
      cols.forEach((c, j) => {
        const x = plot.x + j * cw + cw / 2;
        ctx.save();
        ctx.translate(x, headH - 8);
        ctx.rotate(-Math.PI / 3.2);
        ctx.font = NC.font(10, 600); ctx.fillStyle = C.value;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(c.short, 0, 0);
        ctx.font = NC.font(9, 600); ctx.fillStyle = NC.hexA(C.primary, 0.9);
        ctx.fillText('OMS ' + c.oms + '%', 0, 12);
        ctx.restore();
      });
      ctx.restore();

      /* Cellules : couleur = écart à l'objectif OMS (0 → rouge, 1 → vert) */
      rows.forEach((r, i) => {
        const y = plot.y + i * rh;
        /* Libellé de ligne */
        ctx.save();
        ctx.font = NC.font(rh > 24 ? 11 : 10, 600);
        ctx.fillStyle = ch.hover === 'row' + i ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(NC.ellipsis(ctx, r.label, labelW - 14), labelW - 10, y + rh / 2);
        ctx.restore();

        r.values.forEach((v, j) => {
          const t = v / cols[j].oms;                       // 1 = objectif atteint
          const grow = NC.stagger(p, i, Math.max(rows.length, 10), 0.5);
          const key = 'c' + i + '-' + j;
          const isHover = ch.hover === key;
          const x = plot.x + j * cw;
          const w = cw - 2, h = rh - 2;
          ctx.save();
          /* Révélation progressive : les cellules s'ouvrent en diagonale */
          const sw = Math.max(0.5, w * grow);
          ctx.fillStyle = NC.scaleRG(NC.clamp(t, 0, 1.15) / 1.15);
          ctx.globalAlpha = isHover ? 1 : 0.88;
          NC.roundRect(ctx, x + 1, y + 1, sw, h, 4);
          ctx.fill();
          ctx.globalAlpha = 1;
          if (isHover) { ctx.strokeStyle = C.title; ctx.lineWidth = 1.6; ctx.stroke(); }
          /* Valeur affichée si la cellule est assez large */
          if (cw > 34 && rh > 18) {
            ctx.font = NC.font(9.5, 700);
            ctx.fillStyle = t < 0.55 ? '#fff' : '#1E293B';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(v + '', x + cw / 2, y + rh / 2);
          }
          ctx.restore();
          ch.hit({
            type: 'rect', key: key, x: x, y: y, w: cw, h: rh, clickable: true, index: i, col: j,
            tip: {
              title: r.label,
              sub: cols[j].label + ' · objectif OMS ' + cols[j].oms + ' %',
              color: NC.scaleRG(NC.clamp(t, 0, 1.15) / 1.15),
              rows: [
                { label: 'Valeur enregistrée', value: v + ' %' },
                { label: 'Objectif OMS', value: cols[j].oms + ' %' },
                { label: 'Écart', value: (v >= cols[j].oms ? '+' : '−') + Math.abs(v - cols[j].oms) + ' pts' },
                { label: 'Niveau d’atteinte', value: Math.round(t * 100) + ' % de l’objectif' }
              ],
              note: t >= 1 ? '✓ Objectif OMS atteint' : t >= 0.8 ? '≈ Proche de l’objectif' : '⚠ Écart important à l’objectif'
            }
          });
        });
      });

      /* Échelle de couleur en pied de graphique : libellé | barre | repères */
      ctx.save();
      const sy = plot.y + rows.length * rh + 11;
      ctx.textBaseline = 'middle';
      ctx.font = NC.font(10, 700); ctx.fillStyle = C.label;
      ctx.textAlign = 'left';
      const title = 'Écart à l’objectif OMS';
      ctx.fillText(title, 10, sy);
      const tW = ctx.measureText(title).width;
      const bx = 10 + tW + 62, bw = Math.max(90, Math.min(210, plot.x + plot.w - bx - 70));
      /* Repères avant/après la barre */
      ctx.font = NC.font(9.5, 700); ctx.fillStyle = C.danger;
      ctx.textAlign = 'right';
      ctx.fillText('Critique', bx - 7, sy);
      for (let i = 0; i < bw; i++) {
        ctx.fillStyle = NC.scaleRG(i / bw);
        ctx.fillRect(bx + i, sy - 6, 1.5, 12);
      }
      ctx.fillStyle = C.secondary; ctx.textAlign = 'left';
      ctx.fillText('Atteint', bx + bw + 7, sy);
      ctx.restore();

      /* Trait de séparation sous les en-têtes */
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plot.x, headH - 2.5); ctx.lineTo(plot.x + plot.w, headH - 2.5); ctx.stroke();
      ctx.restore();
    }
  });

  /* =========================================================================
   * G12 — BARRES GROUPÉES : 5 PRATIQUES ANJE ESSENTIELLES PAR ZONE
   * ======================================================================= */
  NC.registerChart('barresANJE', {
    label: 'Barres groupées des pratiques nutritionnelles essentielles par zone',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const axes = d.axes;                        // 5 pratiques
      const groups = d.groups;                    // zones
      const labelW = 158;
      const plot = { x: labelW, y: 22, w: Math.max(60, W - labelW - 46), h: H - 22 - 30 };
      const nG = groups.length;
      const rowH = plot.h / axes.length;
      const groupH = Math.min(rowH * 0.92, 12 * nG + 8);
      const barH = Math.max(5, Math.min(11, groupH / nG - 1.5));
      const xOf = (v) => plot.x + (NC.clamp(v, 0, 100) / 100) * plot.w;

      /* Grille verticale 0-100 % */
      ctx.save();
      ctx.font = NC.font(10.5, 500); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      [0, 25, 50, 75, 100].forEach((v) => {
        const x = xOf(v);
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
        ctx.fillStyle = C.label;
        ctx.fillText(v + '%', x, plot.y + plot.h + 6);
      });
      ctx.restore();

      axes.forEach((a, i) => {
        const y0 = plot.y + i * rowH;
        /* Libellé de la pratique (axe gauche) */
        ctx.save();
        ctx.font = NC.font(11, 600); ctx.fillStyle = C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(NC.ellipsis(ctx, a.label, labelW - 22), labelW - 12, y0 + rowH / 2 - 4);
        /* Objectif OMS sous le libellé */
        ctx.font = NC.font(9.5, 700); ctx.fillStyle = NC.hexA(C.primary, 0.85);
        ctx.fillText('Cible OMS ' + a.oms + '%', labelW - 12, y0 + rowH / 2 + 10);
        ctx.restore();

        const totalH = barH * nG + 1.5 * (nG - 1);
        let by = y0 + (rowH - totalH) / 2;

        groups.forEach((g, gi) => {
          const v = g.values[i];
          const grow = NC.stagger(p, gi, nG, 0.4);
          const bw = Math.max(2, (xOf(v) - plot.x) * grow);
          const key = 'g' + gi + '-' + i;
          const isHover = ch.hover === key;
          ctx.save();
          ctx.fillStyle = NC.hexA(g.color, isHover ? 1 : 0.82);
          NC.roundRight(ctx, plot.x, by, bw, barH, 6);
          ctx.fill();
          if (isHover) { ctx.strokeStyle = C.title; ctx.lineWidth = 1.2; ctx.stroke(); }
          ctx.restore();
          ch.hit({
            type: 'rect', key: key, x: plot.x, y: by - 1, w: plot.w, h: barH + 2,
            tip: {
              title: g.label, sub: a.label,
              color: g.color,
              rows: [
                { label: 'Valeur mesurée', value: NC.fmtDec(v, 1) + ' %' },
                { label: 'Objectif OMS', value: a.oms + ' %' },
                { label: 'Écart', value: (v >= a.oms ? '+' : '−') + NC.fmtDec(Math.abs(v - a.oms), 1) + ' pts' }
              ],
              note: v >= a.oms ? '✓ Pratique conforme au benchmark OMS' : '⚠ Sous le benchmark OMS'
            }
          });
          by += barH + 1.5;
        });

        /* Ligne de repère de l'objectif OMS (traversante) */
        ctx.save();
        ctx.strokeStyle = NC.hexA(C.primary, 0.85); ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(xOf(a.oms), y0 + 3); ctx.lineTo(xOf(a.oms), y0 + rowH - 3);
        ctx.stroke();
        ctx.restore();
      });

      /* Légende des zones (pied de card) */
      ctx.save();
      let lx = plot.x - labelW + 6;
      const ly = plot.y + plot.h + 20;
      ctx.font = NC.font(10, 600); ctx.textBaseline = 'middle';
      groups.forEach((g) => {
        ctx.beginPath(); ctx.fillStyle = NC.hexA(g.color, 0.85); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.label; ctx.textAlign = 'left';
        const label = NC.ellipsis(ctx, g.label, 96);
        ctx.fillText(label, lx + 9, ly);
        lx += 9 + ctx.measureText(label).width + 16;
      });
      ctx.restore();
    }
  });
})(window);
