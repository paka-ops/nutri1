/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : charts/ha-charts-admissions.js
 * Rôle    : Graphiques du parcours CRENAS —
 *           G1  « admissionsDual » : Dual Area Chart 2024 vs 2023 (24 mois
 *               comparés sur 12 mois) + surlignage ambre de la soudure.
 *           G12 « channels »       : Multi-line des canaux de dépistage.
 *           G10 « smallMultiples » : grille de 6 mini-aires de tendance.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = global.HealthNutriApp;
  const C = HA.COLORS;

  /* ======================================================================
   * G1 — Admissions CRENAS saisies dans NutriApp (2024 vs 2023)
   * Area violet 2024 + area grise 2023, bande soudure juin → septembre.
   * ====================================================================== */
  HA.registerChart('admissionsDual', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; // { m2023:[12], m2024:[12], months:[12] }
      const hid = ch.hidden;
      const plot = { x: 52, y: 14, w: W - 66, h: H - 52 };
      const maxV = Math.max(...d.m2024, ...d.m2023);
      const sc = HA.niceScale(0, maxV * 1.08, 5);
      const xOf = (i) => plot.x + (i / 11) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;

      /* Bande de soudure (juin → septembre) en fond ambre */
      ctx.save();
      ctx.fillStyle = HA.hexA(C.quaternary, 0.10);
      const sx0 = xOf(5) - (xOf(1) - xOf(0)) / 2, sx1 = xOf(8) + (xOf(1) - xOf(0)) / 2;
      ctx.fillRect(sx0, plot.y, sx1 - sx0, plot.h);
      ctx.fillStyle = '#B45309';
      ctx.font = HA.font(10, 700);
      ctx.textAlign = 'center';
      ctx.fillText('SOUDURE', (sx0 + sx1) / 2, plot.y + 12);
      ctx.restore();

      HA.drawYGrid(ctx, plot, sc, (v) => HA.fmtCompact(v));

      const series = [
        { key: 'y23', values: d.m2023, color: '#CBD5E1', width: 2, fill: 0.10, label: '2023' },
        { key: 'y24', values: d.m2024, color: C.primary, width: 3, fill: 0.26, label: '2024' }
      ];
      /* Révélation progressive de gauche à droite (clip animé) */
      const reveal = HA.ease(HA.clamp(p, 0, 1));
      series.forEach((s) => {
        if (hid.has(s.key)) return;
        const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        ctx.save();
        ctx.beginPath();
        ctx.rect(plot.x, 0, plot.w * reveal + 2, H);
        ctx.clip();
        /* Aire : dégradé vertical couleur → transparence totale */
        ctx.beginPath();
        HA.smoothPath(ctx, pts);
        ctx.lineTo(xOf(11), plot.y + plot.h);
        ctx.lineTo(xOf(0), plot.y + plot.h);
        ctx.closePath();
        ctx.fillStyle = HA.vGradient(ctx, plot.y, plot.y + plot.h, s.color, s.fill, 0);
        ctx.fill();
        /* Courbe bézier ultra-lisse */
        ctx.beginPath();
        HA.smoothPath(ctx, pts);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      });

      /* Points 2024 + hit-testing par mois (bande verticale) */
      const bw = (xOf(1) - xOf(0));
      d.months.forEach((m, i) => {
        const v24 = d.m2024[i], v23 = d.m2023[i];
        const delta = v24 - v23, pct = (delta / v23 * 100);
        const hov = ch.hover === 'm' + i;
        if (!hid.has('y24')) HA.point(ctx, xOf(i), yOf(v24), C.primary, hov ? Math.max(ch.hoverT, 0.6) : 0);
        ch.hit({
          type: 'rect', key: 'm' + i, x: xOf(i) - bw / 2, y: plot.y, w: bw, h: plot.h,
          tip: {
            title: m + ' · Admissions CRENAS', color: C.primary,
            sub: i >= 5 && i <= 8 ? 'Période de soudure' : 'Hors soudure',
            rows: [
              { color: C.primary, label: '2024', value: HA.fmtInt(v24) },
              { color: '#94A3B8', label: '2023', value: HA.fmtInt(v23) },
              { color: delta >= 0 ? C.tertiary : C.danger, label: 'Écart', value: (delta >= 0 ? '+' : '−') + HA.fmtInt(Math.abs(delta)) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1).replace('.', ',') + ' %)' }
            ]
          }
        });
      });
      if (ch.hover && ch.hover[0] === 'm') {
        const i = +ch.hover.slice(1);
        ctx.save();
        ctx.strokeStyle = HA.hexA(C.primary, 0.35);
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(xOf(i), plot.y); ctx.lineTo(xOf(i), plot.y + plot.h); ctx.stroke();
        ctx.restore();
      }
      HA.drawXLabels(ctx, plot, d.months, xOf);
    }
  });

  /* ======================================================================
   * G12 — Évolution des canaux de dépistage NutriApp (2018 → 2024)
   * Multi-line : CPN, pédiatrie, PB communautaire, auto-dépistage.
   * ====================================================================== */
  HA.registerChart('channels', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; // { years:[], cpn:[], pedi:[], pb:[], auto:[] }
      const hid = ch.hidden;
      const plot = { x: 46, y: 14, w: W - 60, h: H - 52 };
      const sc = HA.niceScale(0, 42, 6);
      const n = d.years.length;
      const xOf = (i) => plot.x + (i / (n - 1)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;
      HA.drawYGrid(ctx, plot, sc, (v) => v + ' %');

      const series = [
        { key: 'cpn', label: 'CPN', color: C.primary, values: d.cpn },
        { key: 'pedi', label: 'Pédiatrie', color: C.secondary, values: d.pedi },
        { key: 'pb', label: 'PB communautaire', color: C.tertiary, values: d.pb },
        { key: 'auto', label: 'Auto-dépistage', color: C.quaternary, values: d.auto }
      ];
      const reveal = HA.ease(HA.clamp(p, 0, 1));
      series.forEach((s) => {
        if (hid.has(s.key)) return;
        const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        ctx.save();
        ctx.beginPath(); ctx.rect(plot.x, 0, plot.w * reveal + 2, H); ctx.clip();
        ctx.beginPath();
        HA.smoothPath(ctx, pts);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
        /* Pastille de fin de série avec étiquette */
        const last = pts[n - 1];
        const a = HA.stagger(p, 1, 2);
        if (reveal > 0.95) {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = s.color; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(last.x, last.y, 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      });

      /* Hit-testing : pastilles par année et par série */
      series.forEach((s) => {
        if (hid.has(s.key)) return;
        s.values.forEach((v, i) => {
          const hov = ch.hover === s.key + i;
          if (hov) HA.point(ctx, xOf(i), yOf(v), s.color, Math.max(ch.hoverT, 0.7));
          ch.hit({
            type: 'pt', key: s.key + i, x: xOf(i), y: yOf(v), r: 12,
            tip: {
              title: s.label + ' · ' + d.years[i], color: s.color,
              rows: [{ color: s.color, label: 'Part des dépistages', value: String(v).replace('.', ',') + ' %' }],
              note: i === n - 1 ? 'Dernière année disponible' : null
            }
          });
        });
      });
      HA.drawXLabels(ctx, plot, d.years.map(String), xOf);
    }
  });

  /* ======================================================================
   * G10 — Small multiples : tendances des 6 métriques NutriApp.
   * Grille de mini-aires avec pastille de tendance directionnelle.
   * ====================================================================== */
  HA.registerChart('smallMultiples', {
    draw(ch, ctx, W, H, p) {
      const items = ch.data; // [{ label, values, color, fmt }]
      const cols = W > 700 ? 3 : W > 260 ? 2 : 1; // 2×3 en carte tiers, 3×2 en pleine largeur
      const rows = Math.ceil(items.length / cols);
      const gap = 12;
      const cw = (W - gap * (cols - 1)) / cols;
      const rh = (H - gap * (rows - 1)) / rows;
      ctx.save();
      items.forEach((it, k) => {
        const cx = (k % cols) * (cw + gap);
        const cy = Math.floor(k / cols) * (rh + gap);
        const hov = ch.hover === 'sm' + k;
        /* Fond de tuile */
        ctx.fillStyle = hov ? '#F5F3FF' : '#FAF5FF';
        HA.roundRect(ctx, cx, cy, cw, rh, 12); ctx.fill();
        ctx.strokeStyle = hov ? C.primary : '#EDE9FE';
        ctx.lineWidth = hov ? 1.5 : 1; ctx.stroke();

        const vals = it.values;
        const first = vals[0], last = vals[vals.length - 1];
        const up = last >= first;
        const good = it.label.indexOf('Ruptures') === 0 || it.label.indexOf('Anémie') === 0 ? !up : up;
        const tColor = good ? C.tertiary : C.danger;

        /* Libellé + valeur + flèche de tendance */
        ctx.fillStyle = C.label; ctx.font = HA.font(10, 600);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(HA.ellipsis(ctx, it.label.toUpperCase(), cw - 60), cx + 10, cy + 8);
        ctx.fillStyle = C.title; ctx.font = HA.font(16, 800);
        const vTxt = it.fmt === 'pct' ? String(last).replace('.', ',') + ' %' : HA.fmtInt(last);
        ctx.fillText(vTxt, cx + 10, cy + 24);
        /* Pastille directionnelle */
        ctx.beginPath(); ctx.arc(cx + cw - 20, cy + 22, 11, 0, Math.PI * 2);
        ctx.fillStyle = HA.hexA(tColor, 0.14); ctx.fill();
        ctx.fillStyle = tColor; ctx.font = HA.font(12, 800);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(up ? '↗' : '↘', cx + cw - 20, cy + 23);

        /* Mini-aire */
        const px = cx + 10, pw = cw - 20, py = cy + 50, ph = rh - 58;
        if (ph > 14) {
          const min = Math.min(...vals), max = Math.max(...vals);
          const span = max - min || 1;
          const pts = vals.map((v, i) => ({ x: px + (i / (vals.length - 1)) * pw, y: py + ph - ((v - min) / span) * (ph - 4) - 2 }));
          const a = HA.stagger(p, k, items.length);
          ctx.save();
          ctx.beginPath(); ctx.rect(px, cy, pw * a + 2, rh); ctx.clip();
          ctx.beginPath();
          HA.smoothPath(ctx, pts);
          ctx.lineTo(pts[pts.length - 1].x, py + ph);
          ctx.lineTo(pts[0].x, py + ph);
          ctx.closePath();
          ctx.fillStyle = HA.vGradient(ctx, py, py + ph, it.color, 0.30, 0);
          ctx.fill();
          ctx.beginPath(); HA.smoothPath(ctx, pts);
          ctx.strokeStyle = it.color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
          ctx.restore();
          ctx.beginPath(); ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = it.color; ctx.fill();
        }
        ch.hit({
          type: 'rect', key: 'sm' + k, x: cx, y: cy, w: cw, h: rh,
          tip: {
            title: it.label, color: it.color, sub: '12 derniers mois · NutriApp',
            rows: [
              { color: it.color, label: 'Actuel', value: vTxt },
              { color: tColor, label: 'Tendance', value: (up ? '+' : '') + (it.fmt === 'pct' ? (last - first).toFixed(1).replace('.', ',') + ' pts' : HA.fmtInt(last - first)) }
            ]
          }
        });
      });
      ctx.restore();
    }
  });
})(window);
