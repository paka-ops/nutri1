/* ============================================================================
 * NutriTracker · charts/charts-compare.js
 * Graphiques de comparaison (Canvas pur) :
 *   G2  ranking  — Bar chart horizontal classé (pays ou districts)
 *   G3  radar    — Spider chart 6 axes (indice de performance normalisé)
 *   G8  heatmap  — Matrice zones × 8 indicateurs (vert → rouge), tri par colonne
 *   G9  anje     — Horizontal grouped bar chart (4 indicateurs ANJE)
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = global.NutriTracker;
  const C = NT.COLORS;

  /* =========================================================================
   * G2 — Classement de la prévalence (pays / districts)
   * ======================================================================= */
  NT.registerChart('ranking', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; const items = d.items; const meta = d.meta;
      const n = items.length;
      ctx.font = NT.font(12, 600);
      const labelW = Math.min(150, Math.max.apply(null, items.map((it) => ctx.measureText(it.label).width)) + 34);
      const plot = { x: labelW, y: 26, w: W - labelW - 54, h: H - 26 - 26 };
      const maxV = Math.max(meta.threshold, Math.max.apply(null, items.map((i) => i.value)));
      const sc = NT.niceScale(0, maxV * 1.05, 5);
      const xOf = (v) => plot.x + (v / sc.max) * plot.w;
      const rowH = plot.h / n;
      const barH = Math.max(6, Math.min(18, rowH * 0.62));
      NT.drawXGrid(ctx, plot, sc, (v) => v + '%');

      items.forEach((it, i) => {
        const y = plot.y + i * rowH + (rowH - barH) / 2;
        const k = NT.stagger(p, i, n, 0.5);
        const isHover = ch.hover === 'r' + i;
        if (isHover) { ctx.fillStyle = 'rgba(0,102,204,0.05)'; NT.roundRect(ctx, 4, plot.y + i * rowH, W - 8, rowH, 8); ctx.fill(); }
        // Rang + libellé
        ctx.textBaseline = 'middle';
        ctx.font = NT.font(10, 700); ctx.fillStyle = i < 3 ? C.danger : C.label; ctx.textAlign = 'right';
        ctx.fillText(String(i + 1), 18, y + barH / 2);
        ctx.font = NT.font(12, isHover ? 700 : 600); ctx.fillStyle = C.value; ctx.textAlign = 'left';
        ctx.fillText(NT.ellipsis(ctx, it.label, labelW - 34), 26, y + barH / 2);
        // Barre (arrondi côté valeur uniquement)
        const w = Math.max(2, (xOf(it.value) - plot.x) * k);
        const g = ctx.createLinearGradient(plot.x, 0, plot.x + w, 0);
        g.addColorStop(0, NT.hexA(it.color, 0.55)); g.addColorStop(1, it.color);
        ctx.fillStyle = g;
        NT.roundRight(ctx, plot.x, y, w, barH, 6); ctx.fill();
        // Valeur
        ctx.font = NT.font(12, 700); ctx.fillStyle = C.value;
        ctx.fillText(NT.fmtPct(it.value * k), plot.x + w + 6, y + barH / 2);
        ctx.textBaseline = 'alphabetic';
        const pos = meta.higherIsWorse ? (it.value > meta.threshold ? 'Au-dessus du seuil' : 'Sous le seuil') : (it.value >= meta.threshold ? 'Cible atteinte' : 'Sous la cible');
        ch.hit({ type: 'rect', key: 'r' + i, x: 0, y: plot.y + i * rowH, w: W, h: rowH, clickable: !!it.code, item: it,
          tip: { title: '#' + (i + 1) + ' · ' + it.label, sub: meta.label + ' · donnée App terrain', color: it.color,
            rows: [{ color: it.color, label: meta.label, value: NT.fmtPct(it.value) }, { label: meta.thresholdLabel, value: pos }],
            note: it.code ? 'Cliquer pour ouvrir la vue pays' : null } });
      });
      /* Seuil d'alerte vertical pointillé */
      const tx = xOf(meta.threshold);
      NT.dashedLine(ctx, tx, plot.y - 4, tx, plot.y + plot.h, C.danger, null);
      ctx.font = NT.font(11, 600);
      const tw = ctx.measureText(meta.thresholdLabel).width + 12;
      const lx = NT.clamp(tx - tw / 2, plot.x, W - tw - 2);
      ctx.fillStyle = '#FEF2F2'; NT.roundRect(ctx, lx, 2, tw, 18, 9); ctx.fill();
      ctx.fillStyle = C.danger; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(meta.thresholdLabel, lx + 6, 11.5); ctx.textBaseline = 'alphabetic';
    }
  });

  /* =========================================================================
   * G3 — Profil radar nutritionnel (6 axes)
   * ======================================================================= */
  NT.registerChart('radar', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const nA = d.axes.length;
      const cx = W / 2, cy = H / 2 + 6;
      const R = Math.max(40, Math.min(W / 2 - 84, H / 2 - 40));
      const ang = (i) => -Math.PI / 2 + (i / nA) * Math.PI * 2;
      /* Toile de fond : 5 anneaux hexagonaux */
      for (let k = 1; k <= 5; k++) {
        ctx.beginPath();
        for (let i = 0; i < nA; i++) {
          const x = cx + Math.cos(ang(i)) * R * (k / 5), y = cy + Math.sin(ang(i)) * R * (k / 5);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = k % 2 ? 'rgba(240,246,255,0.55)' : '#FFFFFF'; ctx.fill();
        ctx.strokeStyle = k === 5 ? C.axis : C.grid; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.font = NT.font(9, 500); ctx.fillStyle = '#CBD5E1'; ctx.textAlign = 'left';
      [20, 40, 60, 80, 100].forEach((v, k) => ctx.fillText(String(v), cx + 3, cy - R * ((k + 1) / 5) + 10));
      /* Axes + libellés */
      for (let i = 0; i < nA; i++) {
        const a = ang(i);
        ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
        const lx = cx + Math.cos(a) * (R + 14), ly = cy + Math.sin(a) * (R + 14);
        ctx.font = NT.font(11, 600); ctx.fillStyle = C.value;
        ctx.textAlign = Math.abs(Math.cos(a)) < 0.2 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right';
        ctx.textBaseline = Math.sin(a) < -0.5 ? 'bottom' : Math.sin(a) > 0.5 ? 'top' : 'middle';
        /* Libellé long → 2 lignes (ex. « Émaciation / (MUAC) ») */
        const words = d.axes[i].split(' ');
        const lines = words.length > 1 && ctx.measureText(d.axes[i]).width > 80 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [d.axes[i]];
        const off = ctx.textBaseline === 'bottom' ? -(lines.length - 1) * 13 : ctx.textBaseline === 'middle' ? -(lines.length - 1) * 6.5 : 0;
        lines.forEach((ln, k) => ctx.fillText(ln, lx, ly + off + k * 13));
      }
      ctx.textBaseline = 'alphabetic';
      /* Polygones semi-transparents, contour 2.5px */
      series.forEach((s, si) => {
        const k = NT.stagger(p, si, series.length, 0.35);
        const pts = s.values.map((v, i) => ({ x: cx + Math.cos(ang(i)) * R * (v / 100) * k, y: cy + Math.sin(ang(i)) * R * (v / 100) * k }));
        const dim = ch.hover && ch.hover.split(':')[0] !== s.key;
        ctx.beginPath(); pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y))); ctx.closePath();
        ctx.fillStyle = NT.hexA(s.color, s.dashed ? 0.04 : dim ? 0.06 : 0.16); ctx.fill();
        ctx.strokeStyle = NT.hexA(s.color, dim ? 0.4 : 1); ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        if (s.dashed) ctx.setLineDash([6, 4]);
        ctx.stroke(); ctx.setLineDash([]);
        pts.forEach((pt, i) => {
          const key = s.key + ':' + i;
          NT.point(ctx, pt.x, pt.y, s.color, ch.hover === key ? ch.hoverT : 0);
          ch.hit({ type: 'pt', key, x: pt.x, y: pt.y, r: 11,
            tip: { title: d.axes[i] + ' · ' + s.label, color: s.color, rows: [
              { color: s.color, label: 'Valeur mesurée', value: NT.fmtPct(s.raw[i]) },
              { label: 'Indice de performance', value: Math.round(s.values[i]) + ' / 100' }] } });
        });
      });
    }
  });

  /* =========================================================================
   * G8 — Heatmap matrice : zones × indicateurs nutritionnels
   * ======================================================================= */
  const HEAT_STOPS = [[0, '#10B981'], [0.35, '#A3E635'], [0.55, '#FACC15'], [0.75, '#FB923C'], [1, '#EF4444']];
  const sevLabel = (s) => (s > 0.75 ? 'Critique' : s > 0.55 ? 'Élevé' : s > 0.35 ? 'Modéré' : 'Maîtrisé');
  NT.registerChart('heatmap', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; const cols = d.cols;
      let rows = d.rows.slice();
      if (ch.sortCol != null) rows.sort((a, b) => (b.sev[ch.sortCol] - a.sev[ch.sortCol]) * (ch.sortDir || 1));
      const labelW = Math.min(150, W * 0.2);
      const headH = 40;
      const gw = (W - labelW - 4) / cols.length;
      const gh = (H - headH - 4) / rows.length;
      /* En-têtes de colonnes (cliquables pour trier) */
      cols.forEach((c, j) => {
        const x = labelW + j * gw;
        const isSort = ch.sortCol === j;
        const isHover = ch.hover === 'h' + j;
        ctx.fillStyle = isSort ? '#E0EEFF' : isHover ? '#F1F5F9' : 'transparent';
        if (isSort || isHover) { NT.roundRect(ctx, x + 2, 2, gw - 4, headH - 8, 8); ctx.fill(); }
        ctx.font = NT.font(gw < 70 ? 10 : 11, 600); ctx.fillStyle = isSort ? C.primary : C.body; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(NT.ellipsis(ctx, c.label + (isSort ? (ch.sortDir > 0 ? ' ↓' : ' ↑') : ''), gw - 6), x + gw / 2, (headH - 6) / 2);
        ch.hit({ type: 'rect', key: 'h' + j, x, y: 0, w: gw, h: headH - 4, clickable: true, sortCol: j,
          tip: { title: c.label, sub: 'Cliquer pour trier par gravité', color: C.primary } });
      });
      ctx.textBaseline = 'middle';
      rows.forEach((r, i) => {
        const y = headH + i * gh;
        const k = NT.stagger(p, i, rows.length, 0.55);
        ctx.font = NT.font(12, 600); ctx.fillStyle = C.value; ctx.textAlign = 'left';
        ctx.fillText(NT.ellipsis(ctx, r.label, labelW - 12), 4, y + gh / 2);
        r.values.forEach((v, j) => {
          const x = labelW + j * gw;
          const s = r.sev[j];
          const key = 'c' + i + ':' + j;
          ctx.globalAlpha = k;
          ctx.fillStyle = NT.scaleColor(HEAT_STOPS, s);
          const pad = 2;
          NT.roundRect(ctx, x + pad, y + pad + (1 - k) * 6, gw - pad * 2, gh - pad * 2, 6); ctx.fill();
          if (ch.hover === key) { ctx.lineWidth = 2; ctx.strokeStyle = '#1E293B'; ctx.stroke(); }
          if (gh >= 18) {
            ctx.font = NT.font(gh < 24 ? 10 : 11, 700);
            ctx.fillStyle = s > 0.62 || s < 0.12 ? '#FFFFFF' : '#1E293B';
            ctx.textAlign = 'center';
            ctx.fillText(cols[j].key === 'wash' ? Math.round(v) : (v % 1 ? v.toFixed(1) : v) + '%', x + gw / 2, y + gh / 2 + 0.5);
          }
          ctx.globalAlpha = 1;
          ch.hit({ type: 'rect', key, x, y, w: gw, h: gh,
            tip: { title: r.label, sub: cols[j].label, color: NT.scaleColor(HEAT_STOPS, s).replace(/rgb\((\d+),(\d+),(\d+)\)/, (m, a, b, c2) => '#' + [a, b, c2].map((n) => (+n).toString(16).padStart(2, '0')).join('')),
              rows: [{ label: 'Valeur', value: cols[j].key === 'wash' ? Math.round(v) + ' / 100' : NT.fmtPct(v) }, { label: 'Niveau de gravité', value: sevLabel(s) }] } });
        });
      });
      ctx.textBaseline = 'alphabetic';
    },
    onClick(hit, ch) {
      if (hit.sortCol == null) return;
      if (ch.sortCol === hit.sortCol) { if (ch.sortDir > 0) ch.sortDir = -1; else { ch.sortCol = null; ch.sortDir = 1; } }
      else { ch.sortCol = hit.sortCol; ch.sortDir = 1; }
      ch.play();
    }
  });
  NT.HEAT_STOPS = HEAT_STOPS;

  /* =========================================================================
   * G9 — Indicateurs ANJE (horizontal grouped bars)
   * ======================================================================= */
  NT.registerChart('anje', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const groups = d.groups.filter((g) => !ch.hidden.has(g.key));
      const nC = d.categories.length;
      const plot = { x: 10, y: 6, w: W - 10 - 46, h: H - 6 - 26 };
      const sc = { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] };
      NT.drawXGrid(ctx, plot, sc, (v) => v + '%');
      const blockH = plot.h / nC;
      const labelH = 20;
      const barGap = 3;
      const barH = Math.max(5, Math.min(14, (blockH - labelH - 12) / Math.max(1, groups.length) - barGap));
      d.categories.forEach((cat, ci) => {
        const by = plot.y + ci * blockH;
        ctx.font = NT.font(12, 600); ctx.fillStyle = C.title; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF'; const tw = ctx.measureText(cat).width + 10;
        ctx.fillRect(plot.x, by + 2, tw, 16);
        ctx.fillStyle = C.title; ctx.fillText(cat, plot.x + 2, by + 10);
        groups.forEach((g, gi) => {
          const y = by + labelH + gi * (barH + barGap);
          const k = NT.stagger(p, ci * groups.length + gi, nC * groups.length, 0.5);
          const v = g.values[ci];
          const w = Math.max(2, (v / 100) * plot.w * k);
          const key = ci + ':' + g.key;
          ctx.globalAlpha = ch.hover && ch.hover !== key ? 0.55 : 1;
          ctx.fillStyle = g.color;
          NT.roundRight(ctx, plot.x, y, w, barH, 6); ctx.fill();
          ctx.globalAlpha = 1;
          if (barH >= 9) { ctx.font = NT.font(11, 700); ctx.fillStyle = C.value; ctx.fillText(Math.round(v * k) + '%', plot.x + w + 6, y + barH / 2 + 0.5); }
          ch.hit({ type: 'rect', key, x: plot.x, y: y - 1, w: Math.max(w + 40, 60), h: barH + 2,
            tip: { title: cat, sub: 'Questionnaire ménage ANJE (App)', color: g.color, rows: groups.map((o) => ({ color: o.color, label: o.label, value: o.values[ci] + '%' })) } });
        });
      });
      ctx.textBaseline = 'alphabetic';
    }
  });
})(window);
