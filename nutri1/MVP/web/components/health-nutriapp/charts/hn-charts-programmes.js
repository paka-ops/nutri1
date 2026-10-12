/* ============================================================================
 * NutriApp Santé · charts/hn-charts-programmes.js
 * Graphiques « Tendances », « Anémie » et « Synchronisation » :
 *   G5  Polar / Rose chart — saisonnalité des signalements (12 secteurs, 3 ans)
 *   G6  Combo — prévalence de l'anémie (barres) vs couverture suppléments (ligne)
 *   G7  Calendar heatmap — 52 semaines × lignes (synchro NutriApp)
 *   G8  Dumbbell — évolution 2015 → 2024 de 4 indicateurs
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;
  const D = NH.draw;
  const T = NH.THEME;

  /* ---------------------------------------------------------------------
   * G5 — Rose chart : 12 secteurs (mois) × 3 années
   * --------------------------------------------------------------------- */
  NH.charts.g5 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const cx = W / 2, cy = H / 2 + 6;
    const R = Math.min(W, H) / 2 - 36;
    const r0 = 18;
    /* Trois années : 2022 estimé à partir de 2023 (tendance -10 %), 2023, 2024 */
    const years = [
      { key: 'y22', label: '2022', color: '#A5B4FC', vals: v.m23.map((x) => x * 0.9) },
      { key: 'y23', label: '2023', color: '#06B6D4', vals: v.m23 },
      { key: 'y24', label: '2024', color: T.primary, vals: v.m24 }
    ];
    const maxV = Math.max.apply(null, [].concat.apply([], years.map((y) => y.vals)));
    const sectorA = (Math.PI * 2) / 12;
    const start = -Math.PI / 2;

    /* Anneaux de référence */
    ctx.save();
    ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      ctx.beginPath(); ctx.arc(cx, cy, r0 + (R - r0) * f, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.restore();

    /* Secteurs : rayon ∝ √(valeur) pour une lecture d'aire fidèle */
    years.forEach((y) => {
      if (!ch.on(y.key)) return;
      y.vals.forEach((val, i) => {
        const rr = r0 + (R - r0) * Math.sqrt(val / maxV) * p;
        const a0 = start + i * sectorA + 0.04, a1 = start + (i + 1) * sectorA - 0.04;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, rr, a0, a1);
        ctx.closePath();
        ctx.fillStyle = NH.rgba(y.color, y.key === 'y24' ? 0.62 : 0.34);
        ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = NH.rgba(y.color, 0.9); ctx.stroke();
        const am = a0 + (a1 - a0) / 2;
        const tipR = Math.max(rr, r0 + 4);
        ch.hit({
          px: cx + Math.cos(am) * (tipR * 0.75), py: cy + Math.sin(am) * (tipR * 0.75), r: 16,
          color: y.color, title: NH.MONTHS[i] + ' · ' + y.label,
          rows: [['Cas dépistés (NutriApp)', NH.fmt(val), y.color], ['Part de l\u2019année', NH.fmt((val / y.vals.reduce((a, b) => a + b, 0)) * 100, 1) + ' %']]
        });
      });
    });

    /* Étiquettes des mois */
    NH.MONTHS.forEach((m, i) => {
      const a = start + (i + 0.5) * sectorA;
      D.text(ctx, m, cx + Math.cos(a) * (R + 16), cy + Math.sin(a) * (R + 16), { align: 'center', size: 11, weight: 500 });
    });
    /* Centre : total 2024 */
    const tot = v.m24.reduce((a, b) => a + b, 0);
    D.text(ctx, NH.fmt(tot * p, 0), cx, cy - 6, { align: 'center', size: 13, weight: 700, color: T.title });
    D.text(ctx, 'cas 2024', cx, cy + 10, { align: 'center', size: 10 });
  };
  NH.CHART_LEGEND_G5 = [
    { key: 'y22', label: '2022', color: '#A5B4FC' },
    { key: 'y23', label: '2023', color: '#06B6D4' },
    { key: 'y24', label: '2024', color: T.primary }
  ];

  /* ---------------------------------------------------------------------
   * G6 — Combo : barres (prévalence anémie) + ligne verte (suppléments)
   * --------------------------------------------------------------------- */
  NH.charts.g6 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const padL = 46, padR = 18, padT = 18, padB = 36;
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const g = NH.ANEMIE_GROUPES.length;
    const prev24 = v.agg.anem;
    const prev23 = v.agg.anem.map((x) => x * 1.06);
    const suppl = [v.agg.suppl * 1.12, v.agg.suppl * 0.98, v.agg.suppl * 0.9].map((x) => NH.clamp(x, 5, 100));
    const maxV = 100;
    const yAt = (val) => y1 - (val / maxV) * (y1 - y0);
    const gw = (x1 - x0) / g;
    const bw = Math.min(42, gw * 0.26);

    for (let k = 0; k <= 4; k++) {
      const val = 25 * k;
      D.gridY(ctx, x0, x1, yAt(val));
      D.text(ctx, val + '%', x0 - 8, yAt(val), { align: 'right', size: 11 });
    }

    /* Barres groupées : 2023 (gris) puis 2024 (violet) */
    NH.ANEMIE_GROUPES.forEach((lab, i) => {
      const cx = x0 + gw * (i + 0.5);
      [['y23', prev23[i], '#CBD5E1', '2023'], ['y24', prev24[i], T.primary, '2024']].forEach(([key, val, col, yr], k) => {
        if (!ch.on(key)) return;
        const bx = cx + (k === 0 ? -bw - 3 : 3);
        const h = (y1 - yAt(val)) * p;
        D.roundRect(ctx, bx, y1 - h, bw, h, 6, true);
        ctx.fillStyle = col; ctx.fill();
        if (p > 0.9) D.text(ctx, NH.fmt(val, 1) + '%', bx + bw / 2, y1 - h - 10, { align: 'center', size: 11, weight: 600, color: T.value });
        ch.hit({
          x0: bx, x1: bx + bw, y0: y0, y1: y1, color: key === 'y24' ? T.primary : '#94A3B8',
          title: lab + ' · ' + yr,
          rows: [['Prévalence anémie', NH.pct(val), key === 'y24' ? T.primary : '#94A3B8']],
          note: 'Enquêtes NutriApp (hémoglobine capillaire)'
        });
      });
    });

    /* Ligne verte : taux de distribution des suppléments fer / acide folique */
    if (ch.on('suppl')) {
      const pts = suppl.map((val, i) => ({ x: x0 + gw * (i + 0.5), y: yAt(val), v: val }));
      ctx.beginPath();
      D.smooth(ctx, pts.map((q, i) => ({ x: q.x, y: y1 - (y1 - q.y) * p })));
      ctx.strokeStyle = T.tertiary; ctx.lineWidth = 2.5; ctx.stroke();
      pts.forEach((q, i) => {
        const py = y1 - (y1 - q.y) * p;
        D.dot(ctx, q.x, py, 5, T.tertiary, true);
        D.text(ctx, NH.fmt(q.v, 0) + '%', q.x, py - 12, { align: 'center', size: 11, weight: 600, color: '#047857' });
        ch.hit({
          px: q.x, py: py, r: 12, color: T.tertiary,
          title: NH.ANEMIE_GROUPES[i],
          rows: [['Distribution suppléments', NH.pct(q.v), T.tertiary]],
          note: 'Fer / acide folique enregistrés dans NutriApp'
        });
      });
    }

    /* Étiquettes des groupes */
    NH.ANEMIE_GROUPES.forEach((lab, i) => {
      D.text(ctx, lab, x0 + gw * (i + 0.5), y1 + 16, { align: 'center', size: 11, weight: 500 });
    });
  };
  NH.CHART_LEGEND_G6 = [
    { key: 'y23', label: 'Anémie 2023', color: '#CBD5E1' },
    { key: 'y24', label: 'Anémie 2024', color: T.primary },
    { key: 'suppl', label: 'Couverture suppléments', color: T.tertiary }
  ];

  /* ---------------------------------------------------------------------
   * G7 — Calendar heatmap : 52 semaines × lignes (vert 100 % → rouge < 40 %)
   * --------------------------------------------------------------------- */
  NH.charts.g7 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const rows = v.rows;
    const labW = 92, hdrH = 18;
    const cw = (W - labW - 4) / 52;
    const rh = Math.max(10, Math.min(24, (H - hdrH - 4) / rows.length));
    /* Couleur : t = (valeur − 40) / 60 → rouge → ambre → vert */
    const colorOf = (val) => NH.scoreColor(NH.clamp((val - 40) / 60, 0, 1));

    /* Mois en tête (repères tous les ~4,3 semaines) */
    NH.MONTHS.forEach((m, i) => {
      const wk = Math.round(i * 4.33);
      D.text(ctx, m, labW + cw * wk, hdrH / 2, { size: 10, weight: 500 });
    });

    rows.forEach((r, i) => {
      const y = hdrH + i * rh;
      D.text(ctx, r.label.length > 12 ? r.label.slice(0, 11) + '…' : r.label, 2, y + rh / 2, { size: 10, weight: 600, color: T.value });
      r.weekly.forEach((val, w) => {
        const x = labW + cw * w;
        const reveal = NH.clamp(p * 1.6 - (w / 52) * 0.6, 0, 1);
        ctx.save();
        ctx.globalAlpha = reveal;
        ctx.fillStyle = colorOf(val);
        D.roundRect(ctx, x + 1, y + 1, cw - 2, rh - 2, 2);
        ctx.fill();
        ctx.restore();
        ch.hit({
          x0: x, x1: x + cw, y0: y, y1: y + rh, color: colorOf(val),
          title: r.label + ' · Semaine ' + (w + 1),
          rows: [['Synchronisation', NH.fmt(val, 0) + ' %', colorOf(val)], ['Statut', val >= 90 ? 'Excellent' : val >= 70 ? 'Correct' : val >= 40 ? 'Irrégulier' : 'Critique']]
        });
      });
    });
  };

  /* ---------------------------------------------------------------------
   * G8 — Dumbbell : évolution 2015 → 2024 (connected dot chart)
   * --------------------------------------------------------------------- */
  NH.charts.g8 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const padL = 92, padR = 26, padT = 14, padB = 30;
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const maxV = 50;
    const xAt = (val) => x0 + (val / maxV) * (x1 - x0);
    /* Ajustement léger au périmètre pays (score relatif à la moyenne régionale) */
    const f = v.mode === 'country' ? 1 + (v.regional.score - v.agg.score) / 220 : 1;
    const rowH = (y1 - y0) / NH.DUMBBELL.length;

    for (let k = 0; k <= 5; k++) {
      const val = (maxV / 5) * k;
      ctx.save(); ctx.strokeStyle = T.grid; ctx.beginPath();
      ctx.moveTo(xAt(val), y0); ctx.lineTo(xAt(val), y1); ctx.stroke(); ctx.restore();
      D.text(ctx, NH.fmt(val, 0) + '%', xAt(val), y1 + 14, { align: 'center', size: 11 });
    }

    NH.DUMBBELL.forEach((d, i) => {
      const cy = y0 + rowH * (i + 0.5);
      const a = d.v2015;
      const b = d.v2024 * f;
      const xa = xAt(a), xb = xAt(b * p + a * (1 - p));
      const showA = ch.on('v2015'), showB = ch.on('v2024');
      D.text(ctx, d.label, padL - 12, cy, { align: 'right', size: 12, weight: 600, color: T.value });
      /* Liaison (segment) : visible seulement si les deux séries le sont */
      if (showA && showB) {
        ctx.save();
        ctx.strokeStyle = NH.rgba(T.primary, 0.28); ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(xa, cy); ctx.lineTo(xb, cy); ctx.stroke();
        ctx.restore();
      }
      const down = b < a;
      const delta = b - a;
      /* Point 2015 (creux) et point 2024 (plein) */
      if (showA) {
        ctx.save();
        ctx.beginPath(); ctx.arc(xa, cy, 6, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#94A3B8'; ctx.stroke();
        ctx.restore();
        D.text(ctx, NH.fmt(a, 1) + '%', xa, cy - 15, { align: 'center', size: 11, color: '#94A3B8', weight: 600 });
      }
      if (showB) {
        D.dot(ctx, xb, cy, 6.5, down ? T.tertiary : T.danger, true);
        D.text(ctx, NH.fmt(b, 1) + '%', xb, cy + 17, { align: 'center', size: 11, color: down ? '#047857' : '#B91C1C', weight: 700 });
      }

      ch.hit({
        px: xb, py: cy, r: 12, color: down ? T.tertiary : T.danger,
        title: d.label,
        rows: [['2015', NH.pct(a)], ['2024', NH.pct(b), down ? T.tertiary : T.danger], ['Évolution', (delta >= 0 ? '+' : '') + NH.fmt(delta, 1) + ' pts', down ? T.tertiary : T.danger]],
        note: down ? 'Amélioration' : 'Dégradation à surveiller'
      });
    });
  };
  NH.CHART_LEGEND_G8 = [
    { key: 'v2015', label: '2015', color: '#94A3B8' },
    { key: 'v2024', label: '2024', color: T.primary }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
