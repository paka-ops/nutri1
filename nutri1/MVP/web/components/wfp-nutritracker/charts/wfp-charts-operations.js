/* ============================================================================
 * WFP NutriTracker · charts/wfp-charts-operations.js
 * Graphiques « Opérations, logistique & financement » — Canvas API pure :
 *   G6  funnel       — Entonnoir vertical de distribution (NutriApp)
 *   G14 waterfall    — Waterfall financier & couverture des opérations
 *   G15 bullets      — Bullet charts de performance terrain (mesuré vs cible)
 *  + 5 mini-graphiques de KPI :
 *   kpiBars (activité collecteurs) · kpiGauge (FCS) · kpiGrid (zones IPC)
 *   kpiProgress (bénéficiaires vs cible) · kpiLine (index prix 12 mois)
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFPTracker;
  const C = WFP.COLORS;

  /* =========================================================================
   * G6 — Funnel de distribution et logistique PAM
   * ======================================================================= */
  WFP.registerChart('funnel', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const steps = d.steps;
      const n = steps.length;
      const padTop = 12, padBottom = 12;
      const rowH = (H - padTop - padBottom) / n;
      const maxW = W * 0.52;
      const cx = W / 2;
      const maxV = steps[0].value;
      const e = ch.e;

      steps.forEach((s, i) => {
        const wTop = (steps[i].value / maxV) * maxW;
        const wBot = (i < n - 1 ? steps[i + 1].value / maxV : steps[i].value * 0.94 / maxV) * maxW;
        const y = padTop + i * rowH + 3;
        const h = rowH - 8;
        const prog = WFP.stagger(p, i, n, 0.5);
        const hov = ch.hover === 's' + i;
        const t = i / (n - 1);
        const color = WFP.mix('#F59E0B', '#10B981', t);

        /* Trapèze */
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - (wTop / 2) * prog, y);
        ctx.lineTo(cx + (wTop / 2) * prog, y);
        ctx.lineTo(cx + (wBot / 2) * prog, y + h);
        ctx.lineTo(cx - (wBot / 2) * prog, y + h);
        ctx.closePath();
        const g = ctx.createLinearGradient(cx - wTop / 2, 0, cx + wTop / 2, 0);
        g.addColorStop(0, WFP.hexA(color, hov ? 0.98 : 0.82));
        g.addColorStop(1, WFP.hexA(color, hov ? 0.8 : 0.6));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();

        /* Valeur au centre du trapèze */
        if (prog > 0.55) {
          ctx.save();
          ctx.globalAlpha = (prog - 0.55) / 0.45;
          ctx.font = WFP.font(12, 800); ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.value.toFixed(1) + ' M', cx, y + h / 2);
          ctx.restore();
        }

        /* Libellé à gauche, conversion à droite */
        ctx.save();
        ctx.font = WFP.font(10.5, hov ? 700 : 600);
        ctx.fillStyle = hov ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, s.label, cx - maxW / 2 - 14), cx - maxW / 2 - 10, y + h / 2);
        ctx.restore();
        if (i > 0 && prog > 0.7) {
          ctx.save();
          ctx.font = WFP.font(9.5, 700);
          const conv = (steps[i].value / steps[i - 1].value) * 100;
          ctx.fillStyle = conv > 92 ? C.tertiary : conv > 85 ? C.primary : C.danger;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText('↓ ' + conv.toFixed(1) + '%', cx + maxW / 2 + 10, y + h / 2);
          ctx.restore();
        }

        ch.hit({
          type: 'rect', key: 's' + i, x: cx - maxW / 2 - 10, y: y, w: maxW + 20, h: h,
          tip: {
            title: s.label, sub: s.note, color: color,
            rows: [
              { label: 'Volume', value: s.value.toFixed(2) + ' M personnes' },
              { label: 'Part de la cible', value: s.share.toFixed(1) + ' %' },
              { label: i > 0 ? 'Conversion étape précédente' : 'Étape initiale', value: i > 0 ? ((steps[i].value / steps[i - 1].value) * 100).toFixed(1) + ' %' : '—' }
            ],
            note: 'Pertes : doublons, déplacements, ruptures de stock, échec de scan'
          }
        });
      });
      void e;
    }
  });

  /* =========================================================================
   * G14 — Waterfall financier des opérations PAM
   * ======================================================================= */
  WFP.registerChart('waterfall', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const steps = d.steps;
      const n = steps.length;
      const plot = { x: 46, y: 18, w: W - 46 - 12, h: H - 18 - 46 };
      /* Construction des niveaux cumulés */
      let running = 0;
      const bars = steps.map((s) => {
        if (s.type === 'total') { const b = { from: 0, to: s.value }; running = s.value; return b; }
        const from = running;
        running = Math.max(0, running + s.value);
        return { from, to: running };
      });
      const maxV = Math.max.apply(null, bars.map((b) => Math.max(b.from, b.to))) * 1.15;
      const sc = WFP.niceScale(0, maxV, 4);
      const slot = plot.w / n;
      const barW = Math.min(34, slot * 0.6);
      const yOf = (v) => plot.y + plot.h - (v / sc.max) * plot.h;
      const e = ch.e;

      WFP.drawYGrid(ctx, plot, sc, (v) => v.toFixed(1));

      bars.forEach((b, i) => {
        const s = steps[i];
        const x = plot.x + i * slot + (slot - barW) / 2;
        const prog = WFP.stagger(p, i, n, 0.45);
        const hov = ch.hover === 's' + i;
        const color = s.type === 'total' ? C.info : s.type === 'gap' ? C.danger : s.value >= 0 ? C.tertiary : C.primary;
        const yTop = yOf(Math.max(b.from, b.to) * prog);
        const yBot = yOf(Math.min(b.from, b.to) * prog);

        /* Connecteur vers la barre suivante */
        if (i < n - 1) {
          ctx.save();
          ctx.strokeStyle = '#CBD5E1'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + barW, yOf(b.to)); ctx.lineTo(plot.x + (i + 1) * slot + (slot - barW) / 2, yOf(b.to)); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        ctx.save();
        WFP.roundRect(ctx, x, yTop, barW, Math.max(2, yBot - yTop), 5);
        ctx.fillStyle = hov ? WFP.mix(color, '#000000', 0.12) : color;
        ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();

        /* Valeur au-dessus */
        if (prog > 0.8) {
          ctx.save();
          ctx.font = WFP.font(10, 800); ctx.fillStyle = color;
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          const txt = s.type === 'total' ? s.value.toFixed(1) : (s.value >= 0 ? '+' : '−') + Math.abs(s.value).toFixed(1);
          ctx.fillText(txt, x + barW / 2, yTop - 4);
          ctx.restore();
        }
        /* Libellé (incliné) */
        ctx.save();
        ctx.font = WFP.font(9.5, hov ? 700 : 500);
        ctx.fillStyle = hov ? C.title : C.label;
        ctx.translate(x + barW / 2, plot.y + plot.h + 9);
        ctx.rotate(-0.42);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, s.label, 74), 0, 0);
        ctx.restore();

        ch.hit({
          type: 'rect', key: 's' + i, x: plot.x + i * slot, y: plot.y, w: slot, h: plot.h,
          tip: {
            title: s.label, sub: s.note, color: color,
            rows: [
              { label: 'Montant', value: (s.value >= 0 && s.type !== 'total' ? '+' : '') + s.value.toFixed(2) + ' ' + d.unit },
              { label: s.type === 'total' ? 'Niveau' : 'Cumul après étape', value: b.to.toFixed(2) + ' ' + d.unit },
              { label: 'Couverture du besoin', value: Math.round((b.to / steps[0].value) * 100) + ' %' }
            ],
            note: s.type === 'gap' ? 'Financement à mobiliser auprès des bailleurs' : 'Suivi financier des opérations PAM'
          }
        });
      });
    }
  });

  /* =========================================================================
   * G15 — Bullet charts de performance des opérations terrain
   * ======================================================================= */
  WFP.registerChart('bullets', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const rows = d.rows;
      const n = rows.length;
      const labelW = Math.min(170, Math.max(120, W * 0.22));
      const plot = { x: labelW, y: 14, w: W - labelW - 62, h: H - 14 - 12 };
      const rowH = plot.h / n;
      const barH = Math.min(13, rowH * 0.42);
      const e = ch.e;

      rows.forEach((r, i) => {
        const y = plot.y + i * rowH + rowH / 2;
        const prog = WFP.stagger(p, i, n, 0.5);
        const hov = ch.hover === 'r' + i;
        const ratio = WFP.clamp(r.value / r.max, 0, 1);
        /* Performance relative à la cible (sens selon higherIsBetter) */
        const perf = r.higherIsBetter ? r.value / r.target : r.target / (r.value || 1);
        const good = perf >= 1;
        const near = perf >= 0.85;
        const color = good ? C.tertiary : near ? C.primary : C.danger;

        /* Plages qualitatives (fond) */
        ctx.save();
        [[0.5, '#F8FAFC'], [0.75, '#F1F5F9'], [1, '#E2E8F0']].forEach((band) => {
          ctx.fillStyle = band[1];
          WFP.roundRect(ctx, plot.x, y - barH / 2, plot.w * band[0], barH, 4);
          ctx.fill();
        });
        ctx.restore();

        /* Barre de valeur */
        ctx.save();
        WFP.roundRight(ctx, plot.x, y - barH / 2, plot.w * ratio * prog, barH, 4);
        ctx.fillStyle = hov ? WFP.mix(color, '#000000', 0.12) : color;
        ctx.fill();
        ctx.restore();

        /* Trait de cible */
        const xt = plot.x + plot.w * WFP.clamp(r.target / r.max, 0, 1);
        ctx.save();
        ctx.strokeStyle = C.title; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(xt, y - barH / 2 - 4); ctx.lineTo(xt, y + barH / 2 + 4); ctx.stroke();
        ctx.restore();

        /* Libellé + valeur */
        ctx.save();
        ctx.font = WFP.font(10.5, hov ? 700 : 600);
        ctx.fillStyle = hov ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, r.label, labelW - 14), labelW - 10, y);
        ctx.font = WFP.font(11, 800); ctx.fillStyle = color; ctx.textAlign = 'left';
        ctx.fillText(r.value + r.unit, plot.x + plot.w + 8, y);
        ctx.restore();

        ch.hit({
          type: 'rect', key: 'r' + i, x: 0, y: y - rowH / 2, w: W, h: rowH,
          tip: {
            title: r.label, sub: r.note, color: color,
            rows: [
              { label: 'Mesuré (App terrain)', value: r.value + r.unit },
              { label: 'Objectif PAM', value: r.target + r.unit },
              { label: 'Performance', value: Math.round(perf * 100) + ' % de la cible' },
              { label: 'Statut', value: good ? 'Cible atteinte' : near ? 'Proche de la cible' : 'Sous-performance' }
            ]
          }
        });
      });
      void e;
    }
  });

  /* =========================================================================
   * MINI-GRAPHIQUES DE KPI
   * ======================================================================= */

  /* KPI 1 — mini barres d'activité mensuelle des collecteurs terrain */
  WFP.registerChart('kpiBars', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const vals = d.values;
      const n = vals.length;
      const maxV = Math.max.apply(null, vals) * 1.1 || 1;
      const slot = W / n;
      const bw = Math.min(11, slot * 0.62);
      vals.forEach((v, i) => {
        const prog = WFP.stagger(p, i, n, 0.55);
        const h = (v / maxV) * (H - 4) * prog;
        const hov = ch.hover === 'b' + i;
        ctx.save();
        WFP.roundTop(ctx, i * slot + (slot - bw) / 2, H - h - 1, bw, h, 4);
        ctx.fillStyle = hov ? C.primary : WFP.hexA(d.color || C.primary, 0.45 + 0.5 * (v / maxV));
        ctx.fill();
        ctx.restore();
        ch.hit({
          type: 'rect', key: 'b' + i, x: i * slot, y: 0, w: slot, h: H,
          tip: {
            title: d.labels[i], sub: 'Activité des collecteurs terrain', color: d.color || C.primary,
            rows: [{ label: 'Fiches ménages transmises', value: WFP.fmtInt(v) }]
          }
        });
      });
    }
  });

  /* KPI 2 — jauge horizontale FCS avec curseur */
  WFP.registerChart('kpiGauge', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const y = H / 2 + 2;
      const bh = 9;
      const xOf = (v) => (v / d.max) * (W - 4) + 2;
      /* Zones de classification */
      d.zones.forEach((z) => {
        ctx.save();
        WFP.roundRect(ctx, xOf(z[0]), y - bh / 2, xOf(z[1]) - xOf(z[0]), bh, 4.5);
        ctx.fillStyle = WFP.hexA(z[2], 0.28);
        ctx.fill();
        ctx.restore();
      });
      /* Curseur */
      const xv = xOf(d.value) * ch.e + 2 * (1 - ch.e);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xv, y - bh / 2 - 6);
      ctx.lineTo(xv - 4.5, y - bh / 2 - 13);
      ctx.lineTo(xv + 4.5, y - bh / 2 - 13);
      ctx.closePath();
      ctx.fillStyle = C.title; ctx.fill();
      ctx.beginPath(); ctx.arc(xv, y, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = d.value >= 42 ? C.tertiary : d.value >= 28 ? C.primary : C.danger;
      ctx.stroke();
      ctx.restore();
      /* Étiquettes de zones */
      ctx.save();
      ctx.font = WFP.font(8.5, 600); ctx.textBaseline = 'top';
      d.zones.forEach((z) => {
        ctx.fillStyle = WFP.hexA(z[2], 0.9);
        ctx.textAlign = z[0] === 0 ? 'left' : z[1] === d.max ? 'right' : 'center';
        ctx.fillText(z[3], xOf((z[0] + z[1]) / 2), y + bh / 2 + 3);
      });
      ctx.restore();
      ch.hit({
        type: 'rect', key: 'g', x: 0, y: 0, w: W, h: H,
        tip: {
          title: 'Food Consumption Score', sub: 'Valeur de la période : ' + d.value.toFixed(1), color: C.primary,
          rows: d.zones.map((z) => ({ color: z[2], label: z[3], value: z[0] + ' – ' + z[1] })),
          note: 'Source : enquêtes mVAM ménages (App PAM)'
        }
      });
    }
  });

  /* KPI 3 — mini grille des zones avec code couleur IPC */
  WFP.registerChart('kpiGrid', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const cells = d.cells;
      const n = cells.length;
      const cols = Math.ceil(Math.sqrt(n * (W / Math.max(1, H))));
      const rows = Math.ceil(n / cols);
      const cw = W / cols, chh = H / rows;
      cells.forEach((c, i) => {
        const x = (i % cols) * cw, y = Math.floor(i / cols) * chh;
        const prog = WFP.stagger(p, i, n, 0.5);
        const hov = ch.hover === 'c' + i;
        ctx.save();
        WFP.roundRect(ctx, x + 1.5, y + 1.5, cw - 3, chh - 3, 4);
        ctx.fillStyle = WFP.ipcColor((c.ipc - 1) / 4);
        ctx.globalAlpha = (0.35 + 0.65 * prog) * (hov ? 1 : 0.92);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (hov) { ctx.strokeStyle = C.title; ctx.lineWidth = 1.4; ctx.stroke(); }
        ctx.restore();
        ch.hit({
          type: 'rect', key: 'c' + i, x: x, y: y, w: cw, h: chh,
          tip: { title: c.name, sub: 'Phase IPC ' + c.ipc, color: WFP.ipcColor((c.ipc - 1) / 4), rows: [{ label: 'Classification', value: WFP.DATA.ipcProfiles[c.ipc].label }] }
        });
      });
    }
  });

  /* KPI 4 — barre de progression bénéficiaires + trait d'objectif */
  WFP.registerChart('kpiProgress', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const bh = 12;
      const y = H / 2 - bh / 2 + 3;
      const max = d.target * 1.05;
      const xOf = (v) => (v / max) * (W - 4) + 2;
      const e = ch.e;
      /* Piste */
      ctx.save();
      WFP.roundRect(ctx, 2, y, W - 4, bh, 6);
      ctx.fillStyle = '#F1F5F9'; ctx.fill();
      ctx.restore();
      /* Progression dégradée ambre → vert */
      const w = (xOf(d.value) - 2) * e;
      if (w > 2) {
        ctx.save();
        WFP.roundRight(ctx, 2, y, w, bh, 6);
        const g = ctx.createLinearGradient(2, 0, 2 + w, 0);
        g.addColorStop(0, C.primary); g.addColorStop(1, C.tertiary);
        ctx.fillStyle = g; ctx.fill();
        ctx.restore();
      }
      /* Trait pointillé d'objectif */
      ctx.save();
      ctx.strokeStyle = C.title; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(xOf(d.target), y - 5); ctx.lineTo(xOf(d.target), y + bh + 5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = WFP.font(8.5, 700); ctx.fillStyle = C.value;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('Cible ' + d.target.toFixed(1) + 'M', xOf(d.target), y - 7);
      ctx.restore();
      ch.hit({
        type: 'rect', key: 'p', x: 0, y: 0, w: W, h: H,
        tip: {
          title: 'Bénéficiaires assistés', sub: 'Scannés / enregistrés dans l’App', color: C.tertiary,
          rows: [
            { label: 'Atteint', value: d.value.toFixed(2) + ' M' },
            { label: 'Cible PAM', value: d.target.toFixed(1) + ' M' },
            { label: 'Exécution', value: Math.round((d.value / d.target) * 100) + ' %' }
          ]
        }
      });
    }
  });

  /* KPI 5 — mini line chart index prix (12 mois ou 4 trimestres) */
  WFP.registerChart('kpiLine', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const vals = d.values;
      const n = vals.length;
      const min = Math.min.apply(null, vals.concat([d.baseline || 100])) * 0.96;
      const max = Math.max.apply(null, vals) * 1.04;
      const xOf = (i) => 2 + (i / (n - 1)) * (W - 4);
      const yOf = (v) => (H - 6) - ((v - min) / (max - min)) * (H - 10);
      const e = ch.e;
      /* Ligne de base 100 */
      if (d.baseline) {
        ctx.save();
        ctx.strokeStyle = '#CBD5E1'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, yOf(d.baseline)); ctx.lineTo(W, yOf(d.baseline)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W * e, H); ctx.clip();
      /* Aire */
      ctx.beginPath(); WFP.smoothPath(ctx, pts);
      ctx.lineTo(pts[n - 1].x, H); ctx.lineTo(pts[0].x, H); ctx.closePath();
      ctx.fillStyle = WFP.vGradient(ctx, 0, H, d.color, 0.28, 0);
      ctx.fill();
      /* Courbe */
      ctx.beginPath(); WFP.smoothPath(ctx, pts);
      ctx.strokeStyle = d.color; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      /* Dernier point */
      if (p > 0.9) WFP.point(ctx, pts[n - 1].x, pts[n - 1].y, d.color, ch.hoverT);
      for (let i = 0; i < n; i++) {
        ch.hit({
          type: 'pt', key: 'p' + i, x: pts[i].x, y: pts[i].y, r: 10,
          tip: {
            title: String(d.labels[i] != null ? d.labels[i] : 'Période ' + (i + 1)), sub: 'Index prix céréales (base 100)', color: d.color,
            rows: [
              { label: 'Index', value: vals[i].toFixed(1) },
              { label: 'Écart à la base', value: (vals[i] >= 100 ? '+' : '−') + Math.abs(Math.round(vals[i] - 100)) + ' %' }
            ]
          }
        });
      }
    }
  });
})(window);
