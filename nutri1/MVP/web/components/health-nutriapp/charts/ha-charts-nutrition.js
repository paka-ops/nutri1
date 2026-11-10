/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : charts/ha-charts-nutrition.js
 * Rôle    : Nutrition et double fardeau —
 *           G4  « matrix »   : heatmap Zones × 8 indicateurs NutriApp.
 *           G6  « anemiaIro »: barres groupées anémie + courbe fer.
 *           G14 « burden100 »: barres empilées 100 % du double fardeau.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = global.HealthNutriApp;
  const C = HA.COLORS;
  const SEV_STOPS = [[0, '#10B981'], [0.25, '#A3E635'], [0.5, '#FACC15'], [0.75, '#FB923C'], [1, '#EF4444']];

  /* ======================================================================
   * G4 — Matrice de performance des districts NutriApp.
   * Lignes = zones (pays ou districts), colonnes = 8 indicateurs clés.
   * ====================================================================== */
  HA.registerChart('matrix', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; // { rows:[{name, values:{key:val}}], cols:[{key,label,sev,fmt}] }
      const cols = d.cols, rows = d.rows;
      const labelW = 128, topH = 44;
      const plot = { x: labelW, y: topH, w: W - labelW - 8, h: H - topH - 8 };
      const cw = plot.w / cols.length;
      const rh = Math.min(34, plot.h / rows.length);
      const gridH = rh * rows.length;
      const yTop = plot.y + (plot.h - gridH) / 2;

      /* En-têtes de colonnes */
      ctx.save();
      ctx.font = HA.font(10, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      cols.forEach((c, j) => {
        ctx.fillStyle = C.body;
        ctx.fillText(c.label, plot.x + cw * (j + 0.5), plot.y - 8);
      });
      ctx.restore();

      rows.forEach((r, i) => {
        const y = yTop + i * rh;
        /* Nom de zone */
        const hovRow = ch.hover && ch.hover.split('-')[0] === 'm' && +ch.hover.split('-')[1] === i;
        ctx.save();
        ctx.font = HA.font(11, hovRow ? 700 : 500);
        ctx.fillStyle = hovRow ? C.title : C.body;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(HA.ellipsis(ctx, r.name, labelW - 14), plot.x - 8, y + rh / 2);
        ctx.restore();
        cols.forEach((c, j) => {
          const v = r.values[c.key];
          const sev = HA.clamp(c.sev(v), 0, 1);
          const col = HA.scaleColor(SEV_STOPS, sev);
          const a = HA.stagger(p, i * cols.length + j, rows.length * cols.length, 0.65);
          const x = plot.x + j * cw + 2, w = cw - 4, h = rh - 4;
          const hov = ch.hover === 'm' + i + '-' + j;
          ctx.save();
          ctx.globalAlpha = a;
          HA.roundRect(ctx, x, y + 2, w, h, 6);
          ctx.fillStyle = col; ctx.fill();
          if (hov) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.shadowColor = col; }
          /* Valeur lisible si la cellule est assez large */
          if (w > 44) {
            ctx.fillStyle = sev > 0.55 ? '#fff' : '#1E293B';
            ctx.font = HA.font(10, 700);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(c.fmt(v), x + w / 2, y + 2 + h / 2);
          }
          ctx.restore();
          ch.hit({
            type: 'rect', key: 'm' + i + '-' + j, x, y: y + 2, w, h,
            tip: {
              title: r.name + ' · ' + c.label, color: col,
              rows: [
                { color: col, label: 'Valeur', value: c.fmt(v) },
                { color: col, label: 'Niveau', value: sev < 0.25 ? 'Maîtrisé' : sev < 0.5 ? 'À surveiller' : sev < 0.75 ? 'Alerte' : 'Critique' }
              ]
            }
          });
        });
      });
    }
  });

  /* ======================================================================
   * G6 — Prévalence de l'anémie vs couverture en suppléments (App).
   * Barres groupées 2024/2023 par catégorie + courbe de distribution fer.
   * ====================================================================== */
  HA.registerChart('anemiaIron', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; // { cats:[4], v2024:[4], v2023:[4], iron:[4] }
      const hid = ch.hidden;
      const plot = { x: 52, y: 14, w: W - 100, h: H - 54 };
      const scL = HA.niceScale(0, Math.max(...d.v2024, ...d.v2023) * 1.15, 5);
      const scR = HA.niceScale(0, 100, 5);
      const yL = (v) => plot.y + plot.h - ((v - scL.min) / (scL.max - scL.min)) * plot.h;
      const yR = (v) => plot.y + plot.h - ((v - scR.min) / (scR.max - scR.min)) * plot.h;
      HA.drawYGrid(ctx, plot, scL, (v) => v + ' %');
      /* Axe droit (fer) */
      ctx.save();
      ctx.font = HA.font(11, 500); ctx.fillStyle = C.secondary;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      scR.ticks.forEach((v) => { ctx.fillText(v + ' %', plot.x + plot.w + 8, yR(v)); });
      ctx.restore();

      const n = d.cats.length;
      const slot = plot.w / n;
      const bw = Math.min(34, slot * 0.24);
      const series = [
        { key: 'a23', values: d.v2023, color: '#CBD5E1', label: 'Anémie 2023' },
        { key: 'a24', values: d.v2024, color: C.primary, label: 'Anémie 2024' }
      ];
      series.forEach((s, si) => {
        if (hid.has(s.key)) return;
        s.values.forEach((v, i) => {
          const cx = plot.x + slot * (i + 0.5) + (si - 0.5) * (bw + 5);
          const a = HA.stagger(p, i * 2 + si, n * 2);
          const h = Math.max(2, (yL(0) - yL(v)) * a);
          const hov = ch.hover === 'b' + si + '-' + i;
          const dim = ch.hover && ch.hover[0] === 'b' && !hov;
          ctx.save();
          ctx.globalAlpha = dim ? 0.35 : 1;
          HA.roundTop(ctx, cx - bw / 2, yL(0) - h, bw, h, 6);
          ctx.fillStyle = s.color; ctx.fill();
          if (hov) { ctx.lineWidth = 2; ctx.strokeStyle = C.title; ctx.stroke(); }
          ctx.restore();
          ch.hit({
            type: 'rect', key: 'b' + si + '-' + i, x: cx - bw / 2 - 2, y: plot.y, w: bw + 4, h: plot.h,
            tip: {
              title: d.cats[i], color: s.color, sub: s.label,
              rows: [
                { color: C.primary, label: '2024', value: HA.fmtPct(d.v2024[i], 0) },
                { color: '#94A3B8', label: '2023', value: HA.fmtPct(d.v2023[i], 0) },
                { color: C.secondary, label: 'Couverture fer', value: HA.fmtPct(d.iron[i], 0) }
              ]
            }
          });
        });
      });
      /* Courbe de distribution du fer (axe droit) */
      if (!hid.has('iron')) {
        const pts = d.iron.map((v, i) => ({ x: plot.x + slot * (i + 0.5), y: yR(v) }));
        const reveal = HA.ease(HA.clamp(p, 0, 1));
        ctx.save();
        ctx.beginPath(); ctx.rect(plot.x, 0, plot.w * reveal + 2, H); ctx.clip();
        ctx.beginPath(); HA.smoothPath(ctx, pts);
        ctx.strokeStyle = C.secondary; ctx.lineWidth = 3;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
        d.iron.forEach((v, i) => {
          const hov = ch.hover === 'f' + i;
          HA.point(ctx, pts[i].x, pts[i].y, C.secondary, hov ? 1 : 0);
          ch.hit({
            type: 'pt', key: 'f' + i, x: pts[i].x, y: pts[i].y, r: 12,
            tip: { title: d.cats[i] + ' · Fer', color: C.secondary, rows: [{ color: C.secondary, label: 'Distribution de fer', value: HA.fmtPct(v, 0) }] }
          });
        });
      }
      /* Étiquettes X sur 2 lignes si besoin */
      ctx.save();
      ctx.font = HA.font(10, 500); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      d.cats.forEach((c, i) => {
        const x = plot.x + slot * (i + 0.5);
        const words = c.split(' ');
        if (c.length > 16 && words.length > 1) {
          const mid = Math.ceil(words.length / 2);
          ctx.fillText(words.slice(0, mid).join(' '), x, plot.y + plot.h + 8);
          ctx.fillText(words.slice(mid).join(' '), x, plot.y + plot.h + 21);
        } else ctx.fillText(c, x, plot.y + plot.h + 8);
      });
      ctx.restore();
    }
  });

  /* ======================================================================
   * G14 — Stacked Bar 100 % : le double fardeau nutritionnel.
   * Sous-nutrition (MAS/MAM) vs sur-nutrition & risque HTA, par zone.
   * ====================================================================== */
  HA.registerChart('burden100', {
    draw(ch, ctx, W, H, p) {
      const zones = ch.data; // [{ name, mas, mam, overw, obes, hta }]
      const list = zones.slice(0, 12);
      const hid = ch.hidden;
      const plot = { x: 118, y: 10, w: W - 168, h: H - 40 };
      const segs = [
        { key: 'mas', label: 'MAS', color: '#DC2626' },
        { key: 'mam', label: 'MAM', color: C.quaternary },
        { key: 'overw', label: 'Surpoids', color: C.secondary },
        { key: 'obes', label: 'Obésité', color: C.primary },
        { key: 'hta', label: 'Risque HTA', color: '#9F1239' }
      ];
      const xOf = (v) => plot.x + (v / 100) * plot.w;
      const rowH = plot.h / list.length;
      /* Graduation 0 → 100 % */
      ctx.save();
      ctx.font = HA.font(10, 500); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      [0, 25, 50, 75, 100].forEach((v) => {
        ctx.fillText(v + ' %', xOf(v), plot.y + plot.h + 6);
        ctx.strokeStyle = v === 0 ? C.axis : C.grid;
        ctx.beginPath(); ctx.moveTo(xOf(v), plot.y); ctx.lineTo(xOf(v), plot.y + plot.h); ctx.stroke();
      });
      ctx.restore();
      /* Séparateur visuel sous-nutrition / sur-nutrition à ~45 % */
      ctx.save();
      ctx.strokeStyle = HA.hexA(C.title, 0.25); ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(xOf(45), plot.y - 4); ctx.lineTo(xOf(45), plot.y + plot.h); ctx.stroke();
      ctx.restore();

      list.forEach((z, i) => {
        const y = plot.y + rowH * i + (rowH - 18) / 2;
        const vis = segs.filter((s) => !hid.has(s.key));
        const tot = vis.reduce((s, sg) => s + z[sg.key], 0) || 1;
        let acc = 0;
        /* Nom de zone */
        ctx.save();
        ctx.font = HA.font(11, 500); ctx.fillStyle = C.body;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(HA.ellipsis(ctx, z.name, 108), plot.x - 8, y + 9);
        ctx.restore();
        vis.forEach((sg, k) => {
          const frac = z[sg.key] / tot;
          const a = HA.stagger(p, i, list.length);
          const w = (xOf(acc + frac * 100) - xOf(acc)) * a;
          const x = xOf(acc);
          const hov = ch.hover === 'g' + i + '-' + sg.key;
          const dim = ch.hover && !hov;
          ctx.save();
          ctx.globalAlpha = (dim ? 0.35 : 1) * a;
          /* Coins arrondis aux extrémités de la barre */
          const first = k === 0, last = k === vis.length - 1;
          ctx.beginPath();
          if (first && last) { HA.roundRect(ctx, x, y, Math.max(w, 2), 18, 9); }
          else if (first) { ctx.moveTo(x + 9, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + 18); ctx.lineTo(x + 9, y + 18); ctx.quadraticCurveTo(x, y + 18, x, y + 9); ctx.quadraticCurveTo(x, y, x + 9, y); ctx.closePath(); }
          else if (last) { ctx.moveTo(x, y); ctx.lineTo(x + w - 9, y); ctx.quadraticCurveTo(x + w, y, x + w, y + 9); ctx.quadraticCurveTo(x + w, y + 18, x + w - 9, y + 18); ctx.lineTo(x, y + 18); ctx.closePath(); }
          else { ctx.rect(x, y, w, 18); }
          ctx.fillStyle = sg.color; ctx.fill();
          if (hov) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          /* % à l'intérieur des segments larges */
          if (w > 34) {
            ctx.fillStyle = '#fff'; ctx.font = HA.font(10, 700);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(frac * 100) + '', x + w / 2, y + 9.5);
          }
          ctx.restore();
          ch.hit({
            type: 'rect', key: 'g' + i + '-' + sg.key, x, y, w: Math.max(w, 3), h: 18,
            tip: {
              title: z.name + ' · ' + sg.label, color: sg.color,
              rows: [
                { color: sg.color, label: 'Part du fardeau', value: (frac * 100).toFixed(1).replace('.', ',') + ' %' },
                { color: C.body, label: 'Sous-nutrition (MAS+MAM)', value: (z.mas + z.mam).toFixed(1).replace('.', ',') + ' %' },
                { color: C.primary, label: 'Sur-nutrition + HTA', value: (100 - z.mas - z.mam).toFixed(1).replace('.', ',') + ' %' }
              ],
              note: z.mas + z.mam >= 45 ? 'Double fardeau : dominance sous-nutrition' : 'Double fardeau : transition nutritionnelle'
            }
          });
          acc += frac * 100;
        });
      });
    }
  });
})(window);
