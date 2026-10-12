/* ============================================================================
 * NutriApp Santé · charts/hn-charts-analytics.js
 * Graphiques analytiques (tendances, parcours de soins, classements) :
 *   G9  Funnel vertical — dépistage CPN dans NutriApp (gap mis en évidence)
 *   G10 Small multiples — 6 mini-aires avec badges de tendance
 *   G11 Treemap — comorbidités associées à la malnutrition (squarified)
 *   G12 Multi-lignes — évolution des canaux de dépistage 2018–2024
 *   G13 Lollipop — score composite par zone, objectif 70 points
 *   G14 Stacked bar 100 % — profil nutritionnel (sous- et sur-nutrition)
 *   + drawSpark : mini-sparklines du scorecard G15
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;
  const D = NH.draw;
  const T = NH.THEME;

  /* ---------------------------------------------------------------------
   * G9 — Funnel CPN : 100 % des consultations → prises en charge
   * --------------------------------------------------------------------- */
  NH.charts.g9 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const cpn = v.agg.cpn;
    /* Ratios de conversion issus du parcours de référence (17 / 41 / 11 / 9) */
    const stages = [
      { label: 'Consultations CPN saisies', pct: 100, col: '#4C1D95' },
      { label: 'Dépistées malnutrition (App)', pct: cpn, col: T.primary },
      { label: 'Positives', pct: cpn * (17 / 41), col: '#8B5CF6' },
      { label: 'Référées', pct: cpn * (11 / 41), col: '#A78BFA' },
      { label: 'Prises en charge', pct: cpn * (9 / 41), col: T.purpleLight }
    ];
    const padT = 6, padB = 6;
    const n = stages.length;
    const sh = (H - padT - padB) / n;
    const maxW = W - 24;
    const wOf = (pct) => Math.max(0.12, pct / 100) * maxW;
    const cx = W / 2;

    stages.forEach((s, i) => {
      const yT = padT + i * sh + 3;
      const hh = sh - 8;
      const wTop = wOf(s.pct) * p;
      const wBot = (i < n - 1 ? wOf(stages[i + 1].pct) : wOf(s.pct) * 0.8) * p;
      /* Trapèze entre cet étage et le suivant */
      ctx.beginPath();
      ctx.moveTo(cx - wTop / 2, yT);
      ctx.lineTo(cx + wTop / 2, yT);
      ctx.lineTo(cx + wBot / 2, yT + hh);
      ctx.lineTo(cx - wBot / 2, yT + hh);
      ctx.closePath();
      ctx.fillStyle = NH.rgba(s.col, 0.9);
      ctx.fill();
      if (p > 0.6) {
        D.text(ctx, s.label, cx, yT + hh / 2 - 8, { align: 'center', size: 11, weight: 600, color: '#FFFFFF' });
        D.text(ctx, NH.fmt(s.pct, 0) + '% ', cx, yT + hh / 2 + 9, { align: 'center', size: 13, weight: 800, color: '#FFFFFF' });
      }
      ch.hit({
        x0: cx - wTop / 2 - 4, x1: cx + wTop / 2 + 4, y0: yT, y1: yT + hh, color: s.col,
        title: s.label,
        rows: [['Part des consultations', NH.pct(s.pct, 1), s.col], ['Écart vs étape précédente', i === 0 ? '—' : NH.fmt(s.pct - stages[i - 1].pct, 1) + ' pts']],
        note: 'Source : consultations CPN saisies dans NutriApp'
      });
    });

    /* Gap de dépistage mis en évidence (flèche rouge à droite) */
    if (p > 0.8) {
      const gap = 100 - cpn;
      const yG = padT + sh * 0.5 + 3;
      ctx.save();
      ctx.globalAlpha = (p - 0.8) / 0.2;
      ctx.strokeStyle = T.danger; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx + wOf(100) / 2 + 4, padT + 6); ctx.lineTo(cx + wOf(cpn) / 2 + 10, padT + sh + 2); ctx.stroke();
      ctx.setLineDash([]);
      D.text(ctx, 'Gap dépistage', W - 6, yG - 4, { align: 'right', size: 11, weight: 700, color: '#B91C1C' });
      D.text(ctx, NH.fmt(gap, 0) + ' pts non dépistés', W - 6, yG + 10, { align: 'right', size: 10, color: '#B91C1C' });
      ctx.restore();
    }
  };

  /* ---------------------------------------------------------------------
   * G10 — Small multiples : 6 mini-aires avec badges de tendance
   * --------------------------------------------------------------------- */
  NH.charts.g10 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const cols = 3, rowsN = 2, gap = 14;
    const pw = (W - gap * (cols - 1)) / cols;
    const ph = (H - gap * (rowsN - 1)) / rowsN;
    /* Sens « bon » : +1 quand la hausse est favorable, −1 sinon */
    const dirOf = { mas: -1, guer: 1, ab: -1, dc: -1, stock: 1, cpn: 1 };

    NH.SMALL_MULTIPLES.forEach((m, idx) => {
      const series = v.sm[m.key];
      const cx = (idx % cols) * (pw + gap), cy = Math.floor(idx / cols) * (ph + gap);
      const last = series[series.length - 1], first = series[0];
      const delta = ((last - first) / Math.max(0.0001, Math.abs(first))) * 100;
      const good = delta * dirOf[m.key] >= 0;
      const badgeCol = good ? T.tertiary : T.danger;

      /* Titre + valeur */
      D.text(ctx, m.label, cx + 2, cy + 12, { size: 11, weight: 500, color: T.body });
      const valTxt = (m.key === 'mas' ? NH.fmt(last, 0) : NH.fmt(last, 1) + (m.unit === 'j' ? ' j' : ' %'));
      D.text(ctx, valTxt, cx + 2, cy + 34, { size: 18, weight: 800, color: T.title });
      /* Badge de tendance */
      const bt = (delta >= 0 ? '▲ +' : '▼ ') + NH.fmt(Math.abs(delta), 1) + '%';
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      const bw = ctx.measureText(bt).width + 12;
      ctx.save();
      ctx.fillStyle = NH.rgba(badgeCol, 0.12);
      D.roundRect(ctx, cx + pw - bw - 2, cy + 22, bw, 18, 9); ctx.fill();
      ctx.restore();
      D.text(ctx, bt, cx + pw - bw / 2 - 2, cy + 31, { align: 'center', size: 10, weight: 600, color: badgeCol });

      /* Mini aire (zone basse de la cellule) */
      const ax0 = cx + 2, ax1 = cx + pw - 2, ay0 = cy + 50, ay1 = cy + ph - 6;
      const mn = Math.min.apply(null, series), mx = Math.max.apply(null, series);
      const span = mx - mn || 1;
      const xAt = (i) => ax0 + ((ax1 - ax0) * i) / (series.length - 1);
      const yAt = (val) => ay1 - ((val - mn) / span) * (ay1 - ay0) * 0.9 - (ay1 - ay0) * 0.05;
      const pts = series.map((val, i) => ({ x: xAt(i), y: ay1 - (ay1 - yAt(val)) * p, v: val }));
      /* Aire */
      const g = ctx.createLinearGradient(0, ay0, 0, ay1);
      g.addColorStop(0, NH.rgba(m.color, 0.28));
      g.addColorStop(1, NH.rgba(m.color, 0));
      ctx.beginPath();
      D.smooth(ctx, pts);
      ctx.lineTo(ax1, ay1); ctx.lineTo(ax0, ay1); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); D.smooth(ctx, pts);
      ctx.strokeStyle = m.color; ctx.lineWidth = 2; ctx.stroke();
      /* Zones de survol par mois */
      series.forEach((val, i) => {
        const x = xAt(i);
        const half = (ax1 - ax0) / (series.length - 1) / 2;
        ch.hit({
          x0: x - half, x1: x + half, y0: cy, y1: cy + ph, color: m.color,
          title: m.label + ' · ' + NH.MONTHS[i] + ' 2024',
          rows: [[m.label, (m.key === 'mas' ? NH.fmt(val, 0) : NH.fmt(val, 1) + (m.unit === 'j' ? ' j' : ' %')), m.color]],
          note: 'Tendance annuelle : ' + (delta >= 0 ? '+' : '') + NH.fmt(delta, 1) + ' %'
        });
      });
    });
  };

  /* ---------------------------------------------------------------------
   * G11 — Treemap squarifié : comorbidités associées
   * --------------------------------------------------------------------- */
  function worst(row, side) {
    const s = NH.sum(row.map((r) => r.area));
    const mx = Math.max.apply(null, row.map((r) => r.area));
    const mn = Math.min.apply(null, row.map((r) => r.area));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  }
  /* Algorithme squarified (Bruls et al.) : rectangles les plus carrés possibles */
  function squarify(items, x, y, w, h) {
    const out = [];
    let rest = items.slice();
    while (rest.length) {
      const side = Math.min(w, h);
      let row = [rest[0]];
      let i = 1;
      while (i < rest.length && worst(row.concat([rest[i]]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      const sA = NH.sum(row.map((r) => r.area));
      if (w >= h) {
        const cw = sA / h; let yy = y;
        row.forEach((r) => { const rh = r.area / cw; out.push(Object.assign({}, r, { x: x, y: yy, w: cw, h: rh })); yy += rh; });
        x += cw; w -= cw;
      } else {
        const rh = sA / w; let xx = x;
        row.forEach((r) => { const cw = r.area / rh; out.push(Object.assign({}, r, { x: xx, y: y, w: cw, h: rh })); xx += cw; });
        y += rh; h -= rh;
      }
      rest = rest.slice(row.length);
    }
    return out;
  }
  NH.squarify = squarify;

  NH.charts.g11 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const items = v.comorb.slice().sort((a, b) => b.value - a.value);
    const total = NH.sum(items.map((x) => x.value));
    const area = W * H;
    const laid = squarify(items.map((x) => Object.assign({}, x, { area: (x.value / total) * area })), 0, 0, W, H);
    laid.forEach((r, i) => {
      /* Apparition échelonnée des blocs */
      const k = NH.clamp(p * 1.5 - i * 0.12, 0, 1);
      const pad = 3;
      const x = r.x + pad, y = r.y + pad, w = r.w - pad * 2, h = r.h - pad * 2;
      ctx.save();
      ctx.globalAlpha = k;
      D.roundRect(ctx, x, y, w, h, 10);
      ctx.fillStyle = NH.rgba(r.color, 0.9);
      ctx.fill();
      ctx.restore();
      if (k > 0.6 && w > 60 && h > 36) {
        D.text(ctx, r.label, x + 10, y + 16, { size: 12, weight: 700, color: '#FFFFFF' });
        D.text(ctx, NH.fmt(r.value, 0) + ' %', x + 10, y + 34, { size: 16, weight: 800, color: '#FFFFFF' });
      }
      ch.hit({
        x0: x, x1: x + w, y0: y, y1: y + h, color: r.color,
        title: r.label,
        rows: [['Part des facteurs', NH.pct(r.value, 0), r.color], ['Cas estimés (2024)', NH.fmt(Math.round(v.agg.adm * r.value / 100))]],
        note: 'Facteurs associés enregistrés dans NutriApp'
      });
    });
  };

  /* ---------------------------------------------------------------------
   * G12 — Multi-lignes : canaux de dépistage 2018–2024
   * --------------------------------------------------------------------- */
  NH.charts.g12 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const padL = 42, padR = 18, padT = 18, padB = 30;
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const maxV = 100;
    const yAt = (val) => y1 - (val / maxV) * (y1 - y0);
    const n = NH.YEARS.length;
    const xAt = (i) => x0 + ((x1 - x0) * i) / (n - 1);
    for (let k = 0; k <= 4; k++) {
      const val = 25 * k;
      D.gridY(ctx, x0, x1, yAt(val));
      D.text(ctx, val + '%', x0 - 8, yAt(val), { align: 'right', size: 11 });
    }
    NH.YEARS.forEach((y, i) => D.text(ctx, String(y), xAt(i), y1 + 14, { align: 'center', size: 11 }));

    NH.CANAUX.forEach((c) => {
      if (!ch.on(c.key)) return;
      const series = v.canaux[c.key];
      const pts = series.map((val, i) => ({ x: xAt(i), y: y1 - (y1 - yAt(val)) * p, v: val, i: i }));
      ctx.beginPath(); D.smooth(ctx, pts);
      ctx.strokeStyle = c.color; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
      pts.forEach((q) => {
        D.dot(ctx, q.x, q.y, 3.6, c.color, true);
        ch.hit({
          px: q.x, py: q.y, r: 10, color: c.color,
          title: c.label + ' · ' + NH.YEARS[q.i],
          rows: [['Taux de dépistage', NH.pct(q.v, 1), c.color]]
        });
      });
      /* Étiquette de fin de ligne */
      const last = pts[pts.length - 1];
      if (p > 0.9) D.text(ctx, NH.fmt(last.v, 0) + '%', last.x + 8, last.y, { size: 11, weight: 700, color: c.color });
    });
  };
  NH.CHART_LEGEND_G12 = NH.CANAUX.map((c) => ({ key: c.key, label: c.label, color: c.color }));

  /* ---------------------------------------------------------------------
   * G13 — Lollipop : score composite par zone, objectif 70 points
   * --------------------------------------------------------------------- */
  NH.charts.g13 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const rows = v.rows.slice().sort((a, b) => b.score - a.score);
    const labW = 104, padR = 44, padT = 8, padB = 22;
    const x0 = labW, x1 = W - padR, y0 = padT, y1 = H - padB;
    const xAt = (val) => x0 + (val / 100) * (x1 - x0);
    const rh = (y1 - y0) / rows.length;
    /* Axe 0-100 */
    [0, 25, 50, 75, 100].forEach((val) => {
      ctx.save(); ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(xAt(val), y0); ctx.lineTo(xAt(val), y1); ctx.stroke(); ctx.restore();
      D.text(ctx, val, xAt(val), y1 + 12, { align: 'center', size: 10 });
    });
    /* Objectif 70 points */
    const xo = xAt(NH.OBJECTIF_SCORE);
    ctx.save(); ctx.strokeStyle = T.primary; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xo, y0 - 2); ctx.lineTo(xo, y1); ctx.stroke(); ctx.restore();
    D.text(ctx, 'Objectif 70 pts', xo + 4, y0 - 2, { size: 10, weight: 600, color: T.primary, base: 'bottom' });

    rows.forEach((r, i) => {
      const cy = y0 + rh * (i + 0.5);
      const col = r.score >= NH.OBJECTIF_SCORE ? T.tertiary : r.score >= 50 ? T.quaternary : T.danger;
      const lab = r.label.length > 14 ? r.label.slice(0, 13) + '…' : r.label;
      D.text(ctx, lab, labW - 8, cy, { align: 'right', size: 11, weight: 600, color: T.value });
      const xe = x0 + (xAt(r.score) - x0) * p;
      ctx.save(); ctx.strokeStyle = NH.rgba(col, 0.55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(xe, cy); ctx.stroke(); ctx.restore();
      D.dot(ctx, xe, cy, 6, col, true);
      if (p > 0.9) D.text(ctx, NH.fmt(r.score, 0), xe + 10, cy, { size: 11, weight: 700, color: col });
      ch.hit({
        x0: x0, x1: W, y0: y0 + rh * i, y1: y0 + rh * (i + 1), color: col,
        title: r.label,
        rows: [['Score composite', NH.fmt(r.score, 0) + ' / 100', col], ['Écart à l\u2019objectif', (r.score - NH.OBJECTIF_SCORE >= 0 ? '+' : '') + NH.fmt(r.score - NH.OBJECTIF_SCORE, 0) + ' pts']]
      });
    });
  };

  /* ---------------------------------------------------------------------
   * G14 — Stacked bar 100 % : profil nutritionnel complet
   * --------------------------------------------------------------------- */
  const PROF_SEG = [
    { key: 'mas', label: 'MAS', color: '#EF4444' },
    { key: 'mam', label: 'MAM', color: '#F59E0B' },
    { key: 'risque', label: 'Risque', color: '#FCD34D' },
    { key: 'normal', label: 'Normal', color: '#E2E8F0' },
    { key: 'surp', label: 'Surpoids', color: '#06B6D4' },
    { key: 'obes', label: 'Obésité', color: '#7C3AED' }
  ];
  NH.PROF_SEG = PROF_SEG;
  NH.CHART_LEGEND_G14 = PROF_SEG.map((s) => ({ key: s.key, label: s.label, color: s.color }));

  NH.charts.g14 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const rows = v.rows;
    const labW = 104, padT = 4, padB = 4;
    const x0 = labW, x1 = W - 8;
    const rh = Math.min(28, (H - padT - padB) / rows.length);
    const bh = rh * 0.62;
    rows.forEach((r, i) => {
      const cy = padT + i * rh + rh / 2;
      const lab = r.label.length > 14 ? r.label.slice(0, 13) + '…' : r.label;
      D.text(ctx, lab, labW - 8, cy, { align: 'right', size: 11, weight: 600, color: T.value });
      /* Valeurs par segment (le « Normal » complète jusqu'à 100 %) */
      const raw = PROF_SEG.map((s) => {
        if (s.key === 'normal') return Math.max(0, 100 - NH.sum(r.prof));
        const idx = { mas: 0, mam: 1, risque: 2, surp: 3, obes: 4 }[s.key];
        return r.prof[idx];
      });
      const vis = PROF_SEG.map((s, k) => (ch.on(s.key) ? raw[k] : 0));
      const tot = NH.sum(vis) || 1;
      let xc = x0;
      PROF_SEG.forEach((s, k) => {
        const w = (vis[k] / tot) * (x1 - x0) * p;
        if (w <= 0.2) return;
        ctx.fillStyle = s.color;
        ctx.fillRect(xc, cy - bh / 2, w, bh);
        if (w > 34 && p > 0.9) {
          D.text(ctx, NH.fmt(vis[k] / tot * 100, 0) + '%', xc + w / 2, cy, { align: 'center', size: 10, weight: 700, color: s.key === 'normal' || s.key === 'risque' ? T.value : '#FFFFFF' });
        }
        ch.hit({
          x0: xc, x1: xc + w, y0: cy - rh / 2, y1: cy + rh / 2, color: s.color,
          title: r.label + ' · ' + s.label,
          rows: [[s.label, NH.pct(raw[k], 1), s.color], ['Sous-nutrition (MAS+MAM+risque)', NH.pct(raw[0] + raw[1] + raw[2], 1)], ['Sur-nutrition (surpoids+obésité)', NH.pct(raw[4] + raw[3], 1)]]
        });
        xc += w;
      });
    });
  };

  /* ---------------------------------------------------------------------
   * Mini-sparkline (scorecard G15) — dessinée une fois, sans animation
   * --------------------------------------------------------------------- */
  NH.drawSpark = function (canvas, values, color) {
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const W = canvas.clientWidth || 72, H = canvas.clientHeight || 22;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!values || values.length < 2) return;
    const mn = Math.min.apply(null, values), mx = Math.max.apply(null, values), span = mx - mn || 1;
    const pts = values.map((val, i) => ({ x: 1 + ((W - 2) * i) / (values.length - 1), y: H - 2 - ((val - mn) / span) * (H - 4) }));
    ctx.beginPath(); D.smooth(ctx, pts);
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke();
    const last = pts[pts.length - 1];
    D.dot(ctx, last.x, last.y, 2.2, color);
  };
})(typeof window !== 'undefined' ? window : globalThis);
