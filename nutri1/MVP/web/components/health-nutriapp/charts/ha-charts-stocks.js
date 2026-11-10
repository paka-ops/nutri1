/* ============================================================================
 * NutriApp Santé · Ministère de la Santé
 * Fichier : charts/ha-charts-stocks.js
 * Rôle    : Stocks géolocalisés et régularité des rapports —
 *           G3 « bulletATPE » : bullet chart vertical multi-zones, seuil
 *               critique de rupture à 30 jours (ligne rouge fixe).
 *           G7 « syncHeat »   : grille calendaire 52 semaines de la
 *               régularité des rapports transmis par les relais mobiles.
 *           G5 « polarSeason »: rose des saisons — 12 secteurs mensuels
 *               sur 3 cycles annuels de cas dépistés.
 * ========================================================================== */
(function (global) {
  'use strict';
  const HA = global.HealthNutriApp;
  const C = HA.COLORS;
  const SEV_STOPS = [[0, '#10B981'], [0.25, '#A3E635'], [0.5, '#FACC15'], [0.75, '#FB923C'], [1, '#EF4444']];

  /* ======================================================================
   * G3 — Niveaux de stocks ATPE géolocalisés dans NutriApp.
   * Barres verticales par zone sur fond multi-zones d'alerte.
   * ====================================================================== */
  HA.registerChart('bulletATPE', {
    draw(ch, ctx, W, H, p) {
      const zones = ch.data; // [{ name, code, stockDays, ruptures }]
      const plot = { x: 52, y: 14, w: W - 66, h: H - 78 };
      const sc = HA.niceScale(0, Math.max(75, ...zones.map((z) => z.stockDays)) * 1.05, 6);
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;

      /* Fond multi-zones : rupture / tension / correct / confortable */
      const bands = [
        { from: 0, to: 30, color: HA.hexA(C.danger, 0.08), label: 'RUPTURE' },
        { from: 30, to: 45, color: HA.hexA(C.quaternary, 0.08), label: 'TENSION' },
        { from: 45, to: 60, color: HA.hexA(C.secondary, 0.07), label: 'CORRECT' },
        { from: 60, to: sc.max, color: HA.hexA(C.tertiary, 0.07), label: 'CONFORT' }
      ];
      bands.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.fillRect(plot.x, yOf(Math.min(b.to, sc.max)), plot.w, yOf(b.from) - yOf(Math.min(b.to, sc.max)));
      });
      HA.drawYGrid(ctx, plot, sc, (v) => v + ' j');
      /* Étiquettes de zones à droite */
      ctx.save();
      ctx.font = HA.font(9, 700); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      bands.forEach((b) => {
        const y = (yOf(Math.min(b.to, sc.max)) + yOf(b.from)) / 2;
        if (yOf(b.from) - yOf(Math.min(b.to, sc.max)) < 16) return;
        ctx.fillStyle = 'rgba(100, 116, 139, 0.55)';
        ctx.fillText(b.label, plot.x + plot.w - 8, y);
      });
      ctx.restore();

      /* Seuil critique de rupture à 30 jours (ligne rouge fixe) */
      HA.dashedLine(ctx, plot.x, yOf(30), plot.x + plot.w, yOf(30), C.danger, 'Seuil rupture · 30 j');

      /* Barres par zone */
      const n = zones.length;
      const slot = plot.w / n;
      const bw = Math.min(46, slot * 0.58);
      zones.forEach((z, i) => {
        const cx = plot.x + slot * (i + 0.5);
        const x = cx - bw / 2;
        const col = HA.model.stockColor(z.stockDays);
        const a = HA.stagger(p, i, n);
        const h = Math.max(2, (yOf(0) - yOf(z.stockDays)) * a);
        const y = yOf(0) - h;
        const hov = ch.hover === 's' + i;
        const dim = ch.hover && !hov;
        ctx.save();
        ctx.globalAlpha = dim ? 0.35 : 1; // voisines à 35 % au survol
        if (hov) {
          ctx.fillStyle = HA.hexA(col, 0.12);
          ctx.fillRect(plot.x + slot * i + 1, plot.y, slot - 2, plot.h);
        }
        HA.roundTop(ctx, x, y, bw, h, 6);
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, col);
        g.addColorStop(1, HA.hexA(col, 0.55));
        ctx.fillStyle = g;
        ctx.fill();
        if (hov) { ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke(); }
        /* Valeur au-dessus de la barre */
        ctx.font = HA.font(10, 700); ctx.fillStyle = hov ? C.title : col;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(z.stockDays + ' j', cx, y - 4);
        /* Pastille rupture */
        if (z.ruptures > 0) {
          ctx.beginPath(); ctx.arc(cx + bw / 2 - 2, y + 10, 8, 0, Math.PI * 2);
          ctx.fillStyle = C.danger; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = HA.font(9, 800);
          ctx.textBaseline = 'middle';
          ctx.fillText('!', cx + bw / 2 - 2, y + 10.5);
        }
        ctx.restore();
        /* Étiquette zone (rotation si dense) */
        ctx.save();
        ctx.font = HA.font(n > 10 ? 9 : 10, hov ? 700 : 500);
        ctx.fillStyle = hov ? C.primary : C.label;
        ctx.textAlign = n > 10 ? 'right' : 'center';
        ctx.textBaseline = n > 10 ? 'middle' : 'top';
        const lbl = n > 10 ? z.code : HA.ellipsis(ctx, z.name, slot + 20);
        if (n > 10) {
          ctx.translate(cx, plot.y + plot.h + 10);
          ctx.rotate(-Math.PI / 5);
          ctx.fillText(lbl, 0, 0);
        } else {
          ctx.fillText(lbl, cx, plot.y + plot.h + 8);
        }
        ctx.restore();
        ch.hit({
          type: 'rect', key: 's' + i, x: plot.x + slot * i, y: plot.y, w: slot, h: plot.h,
          tip: {
            title: z.name, color: col, sub: 'Inventaire ATPE NutriApp',
            rows: [
              { color: col, label: 'Stock disponible', value: z.stockDays + ' jours' },
              { color: C.danger, label: 'Structures en rupture', value: String(z.ruptures) },
              { color: C.primary, label: 'Seuil critique', value: '30 jours' }
            ],
            note: z.stockDays < 30 ? '⚠ Réapprovisionnement urgent requis' : z.stockDays < 45 ? 'Surveillance renforcée' : 'Niveau satisfaisant'
          }
        });
      });
    }
  });

  /* ======================================================================
   * G7 — Heatmap de synchronisation hebdomadaire NutriApp (52 semaines).
   * Grille calendaire : vert = rapports à l'heure, rouge = décrochage.
   * ====================================================================== */
  HA.registerChart('syncHeat', {
    draw(ch, ctx, W, H, p) {
      const weeks = ch.data; // [52] pourcentages
      const cols = 13, rows = 4;
      const plot = { x: 8, y: 30, w: W - 16, h: H - 62 };
      const gap = 5;
      const cw = (plot.w - gap * (cols - 1)) / cols;
      const rh = (plot.h - gap * (rows - 1)) / rows;
      /* Libellés de mois en tête (approximation : 13 blocs ≈ 12 mois) */
      const monthAt = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      ctx.save();
      ctx.font = HA.font(9, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      monthAt.forEach((m, i) => {
        const x = plot.x + (i + 0.5) * (plot.w / 12);
        ctx.fillText(m, x, plot.y - 6);
      });
      ctx.restore();
      weeks.forEach((v, w) => {
        const cx = plot.x + (w % cols) * (cw + gap);
        const cy = plot.y + Math.floor(w / cols) * (rh + gap);
        const a = HA.stagger(p, w, weeks.length, 0.6);
        const t = 1 - (v - 25) / 74; // 0 = bon → 1 = critique
        const col = HA.scaleColor(SEV_STOPS, t);
        const hov = ch.hover === 'w' + w;
        ctx.save();
        ctx.globalAlpha = a;
        if (hov) {
          ctx.shadowColor = col; ctx.shadowBlur = 10;
        }
        HA.roundRect(ctx, cx, cy, cw, rh, 5);
        ctx.fillStyle = col; ctx.fill();
        ctx.shadowBlur = 0;
        if (hov) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
        ctx.restore();
        ch.hit({
          type: 'rect', key: 'w' + w, x: cx - 1, y: cy - 1, w: cw + 2, h: rh + 2,
          tip: {
            title: 'Semaine ' + (w + 1) + ' · 2024', color: col,
            rows: [{ color: col, label: 'Fiches synchro < 24 h', value: v + ' %' }],
            note: v >= 80 ? 'Régularité exemplaire' : v >= 65 ? 'Rythme nominal' : '⚠ Relais à relancer'
          }
        });
      });
      /* Légende basse */
      ctx.save();
      ctx.font = HA.font(10, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Faible', plot.x, plot.y + plot.h + 10);
      ctx.textAlign = 'right';
      ctx.fillText('Excellente', plot.x + plot.w, plot.y + plot.h + 10);
      const lx = plot.x + 48, lw = plot.w - 150;
      const g = ctx.createLinearGradient(lx, 0, lx + lw, 0);
      g.addColorStop(0, '#EF4444'); g.addColorStop(0.5, '#FACC15'); g.addColorStop(1, '#10B981');
      HA.roundRect(ctx, lx, plot.y + plot.h + 10, lw, 8, 4);
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    }
  });

  /* ======================================================================
   * G5 — Saisonnalité des signalements NutriApp (rose des saisons).
   * 12 secteurs mensuels × 3 cycles annuels concentriques.
   * ====================================================================== */
  HA.registerChart('polarSeason', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; // { m2022:[12], m2023:[12], m2024:[12] }
      const cx = W / 2, cy = H / 2 + 4;
      const R = Math.min(W, H) / 2 - 34;
      const r0 = R * 0.22;
      const cycles = [
        { key: 'y22', values: d.m2022, color: '#DDD6FE', label: '2022', width: 0.24 },
        { key: 'y23', values: d.m2023, color: '#A78BFA', label: '2023', width: 0.26 },
        { key: 'y24', values: d.m2024, color: C.primary, label: '2024', width: 0.28 }
      ];
      const maxV = Math.max(...d.m2022, ...d.m2023, ...d.m2024);
      const a0 = (m) => -Math.PI / 2 + (m / 12) * Math.PI * 2 + 0.018;
      const a1 = (m) => -Math.PI / 2 + ((m + 1) / 12) * Math.PI * 2 - 0.018;
      /* Anneaux de fond + cercles de référence */
      ctx.save();
      [0.33, 0.66, 1].forEach((f) => {
        ctx.beginPath(); ctx.arc(cx, cy, r0 + (R - r0) * f, 0, Math.PI * 2);
        ctx.strokeStyle = '#EDE9FE'; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.restore();

      let rr = r0;
      const ringR = [];
      cycles.forEach((cy3) => {
        const w = (R - r0) * cy3.width / 0.78;
        ringR.push([rr, rr + w]);
        rr += w;
      });
      const grow = HA.ease(HA.clamp(p * 1.2, 0, 1));
      cycles.forEach((cy3, k) => {
        if (ch.hidden.has(cy3.key)) return;
        const [base0, base1] = ringR[k];
        cy3.values.forEach((v, m) => {
          const frac = 0.25 + 0.75 * (v / maxV);
          const rOuter = base0 + (base1 - base0) * frac * grow + (base1 - base0) * (1 - grow) * 0;
          const hov = ch.hover === 'p' + k + '-' + m;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(base0 + 1, rOuter), a0(m), a1(m));
          ctx.arc(cx, cy, base0, a1(m), a0(m), true);
          ctx.closePath();
          const isSoudure = m >= 5 && m <= 8;
          let fill = cy3.color;
          if (k === 2 && isSoudure) fill = C.quaternary; // soudure en ambre sur 2024
          ctx.fillStyle = HA.hexA(fill, hov ? 0.95 : k === 2 ? 0.85 : 0.55);
          if (hov) { ctx.shadowColor = fill; ctx.shadowBlur = 12; }
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
          ch.hit({
            type: 'arc', key: 'p' + k + '-' + m, cx, cy, r0: base0, r1: base1, a0: a0(m), a1: a1(m),
            tip: {
              title: HA.MONTHS[m] + ' ' + cy3.label, color: fill,
              sub: isSoudure ? 'Période de soudure' : 'Hors soudure',
              rows: [{ color: fill, label: 'Cas dépistés (App)', value: HA.fmtInt(v) }]
            }
          });
        });
      });
      /* Étiquettes mensuelles autour du cercle */
      ctx.save();
      ctx.font = HA.font(10, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      HA.MONTHS.forEach((m, i) => {
        const mid = -Math.PI / 2 + ((i + 0.5) / 12) * Math.PI * 2;
        const lx = cx + Math.cos(mid) * (R + 16);
        const ly = cy + Math.sin(mid) * (R + 16);
        ctx.fillStyle = i >= 5 && i <= 8 ? '#B45309' : C.label;
        ctx.fillText(m, lx, ly);
      });
      /* Total au centre */
      const tot = d.m2024.reduce((s, v) => s + v, 0);
      ctx.fillStyle = C.title; ctx.font = HA.font(17, 800);
      ctx.fillText(HA.fmtCompact(tot), cx, cy - 6);
      ctx.fillStyle = C.label; ctx.font = HA.font(10, 500);
      ctx.fillText('cas · 2024', cx, cy + 11);
      ctx.restore();
    }
  });
})(window);
