/* ============================================================================
 * NutriApp Santé · charts/hn-charts-overview.js
 * Graphiques de la « Vue d'ensemble » et du suivi CRENAS/ATPE :
 *   G1  Dual area chart — admissions CRENAS 24 mois (2023 gris / 2024 indigo)
 *   G2  Scatter Sphère — guérison × abandon, 4 quadrants, taille = volume
 *   G3  Bullet chart vertical — niveaux de stocks ATPE en jours
 *   G4  Heatmap — matrice de performance (lignes × 8 indicateurs)
 * Chaque fonction reçoit (ch, ctx, W, H, p) ; p = progression d'animation.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NH = global.NutriHealth;
  const D = NH.draw;
  const T = NH.THEME;

  /* Arrondit une valeur maximale « jolie » pour l'échelle Y */
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const k = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return k * p;
  }
  /* Format compact pour axes : 12 500 → 12,5 k */
  const kfmt = (v) => (v >= 1000 ? NH.fmt(v / 1000, v >= 10000 ? 0 : 1) + ' k' : NH.fmt(v, 0));

  /* ---------------------------------------------------------------------
   * G1 — Dual area chart : admissions CRENAS saisies (24 mois)
   * --------------------------------------------------------------------- */
  NH.charts.g1 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const s = v.series24;
    const n = s.labels.length;
    const padL = 50, padR = 16, padT = 26, padB = 30;
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const stepX = (x1 - x0) / (n - 1);
    const xAt = (i) => x0 + stepX * i;

    const maxV = niceMax(Math.max.apply(null, s.v24.concat(s.v23).filter((x) => x != null)) * 1.12);
    const yAt = (val) => y1 - (val / maxV) * (y1 - y0);

    /* Grille horizontale + échelle */
    for (let k = 0; k <= 4; k++) {
      const val = (maxV / 4) * k;
      D.gridY(ctx, x0, x1, yAt(val));
      D.text(ctx, kfmt(val), x0 - 8, yAt(val), { align: 'right', size: 11, color: T.label });
    }

    /* Surlignage ambre de la zone de soudure (Juin → Septembre) */
    const isM = v.period === 'M';
    const bands = isM ? [[5, 8], [17, 20]] : [[1, 2], [5, 6]];
    bands.forEach(([a, b]) => {
      ctx.save();
      ctx.fillStyle = 'rgba(245,158,11,0.10)';
      ctx.fillRect(xAt(a) - stepX / 2, y0, xAt(b) - xAt(a) + stepX, y1 - y0);
      ctx.restore();
    });
    if (bands.length) D.text(ctx, 'Soudure', xAt(bands[1][0]) - stepX / 2 + 6, y0 + 10, { size: 10, color: '#B45309', weight: 600 });

    /* Animation : révélation de gauche à droite */
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, x0 + (x1 - x0) * p + 4, H);
    ctx.clip();

    /* Courbe + aire pour une série (segments continus non-nuls) */
    const drawSeries = (vals, color, key, fillA, dashed) => {
      if (!ch.on(key)) return;
      const pts = [];
      vals.forEach((val, i) => { if (val != null) pts.push({ x: xAt(i), y: yAt(val), v: val, i: i }); });
      if (pts.length < 2) return;
      /* Aire : dégradé couleur → transparent */
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, NH.rgba(color, fillA));
      g.addColorStop(1, NH.rgba(color, 0));
      ctx.beginPath();
      D.smooth(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, y1);
      ctx.lineTo(pts[0].x, y1);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      /* Ligne Bézier lisse */
      ctx.beginPath();
      D.smooth(ctx, pts);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      if (dashed) ctx.setLineDash([6, 4]);
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.setLineDash([]);
      /* Points 5 px + zones de survol */
      pts.forEach((q) => {
        D.dot(ctx, q.x, q.y, 3.2, color, true);
        ch.hit({
          x0: q.x - stepX / 2, x1: q.x + stepX / 2, y0: y0, y1: y1,
          title: s.labels[q.i], color: color,
          rows: [[key === 'y24' ? '2024' : '2023', NH.fmt(q.v) + ' admissions', color]],
          note: 'Admissions CRENAS saisies dans NutriApp'
        });
      });
    };
    drawSeries(s.v23, '#94A3B8', 'y23', 0.16, true);
    drawSeries(s.v24, T.indigo, 'y24', 0.32, false);
    ctx.restore();

    /* Étiquettes X (une sur deux en mode mensuel) */
    s.labels.forEach((lab, i) => {
      if (isM && i % 2 === 1) return;
      D.text(ctx, lab, xAt(i), y1 + 14, { align: 'center', size: 11, color: T.label });
    });

    /* Annotations interactives (apparaissent en fin d'animation) */
    if (p > 0.85) {
      const a = (p - 0.85) / 0.15;
      ctx.save();
      ctx.globalAlpha = a;
      const peakVals = s.v24.map((x, i) => (x == null ? -1 : x));
      const pk = peakVals.indexOf(Math.max.apply(null, peakVals));
      if (pk >= 0 && ch.on('y24')) {
        const px = xAt(pk), py = yAt(s.v24[pk]);
        const txt = 'Pic soudure (+' + NH.fmt(v.kpi.peakPct, 0) + '%)';
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(txt).width + 16;
        const bx = NH.clamp(px - tw / 2, x0, x1 - tw), by = py - 34;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#FCD34D';
        D.roundRect(ctx, bx, by, tw, 22, 8);
        ctx.fill(); ctx.stroke();
        D.text(ctx, txt, bx + 8, by + 11, { size: 11, weight: 600, color: '#B45309' });
        ctx.strokeStyle = '#F59E0B'; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(px, by + 22); ctx.lineTo(px, py - 6); ctx.stroke(); ctx.setLineDash([]);
      }
      /* Alerte épidémique localisée : deuxième pic (Août 2024 ou T3 24) */
      const ai = isM ? 19 : 6;
      if (s.v24[ai] != null && ch.on('y24')) {
        const px = xAt(ai), py = yAt(s.v24[ai]);
        const txt = 'Alerte épidémique localisée';
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(txt).width + 16;
        const bx = NH.clamp(px - tw / 2, x0, x1 - tw), by = y0 + 2;
        ctx.fillStyle = '#FEF2F2'; ctx.strokeStyle = '#FCA5A5';
        D.roundRect(ctx, bx, by, tw, 20, 8); ctx.fill(); ctx.stroke();
        D.dot(ctx, bx + 9, by + 10, 3, T.danger);
        D.text(ctx, txt, bx + 16, by + 10, { size: 11, weight: 600, color: '#B91C1C' });
      }
      ctx.restore();
    }
  };

  /* ---------------------------------------------------------------------
   * G2 — Scatter Sphère : guérison (X) × abandon (Y), 4 quadrants
   * --------------------------------------------------------------------- */
  NH.charts.g2 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const padL = 48, padR = 18, padT = 14, padB = 40;
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const rows = v.rows.filter((r) => ch.on(r.zone));
    const xMin = Math.floor(Math.min(NH.SPHERE.guerison, Math.min.apply(null, v.rows.map((r) => r.guer))) - 4);
    const xMax = 100;
    const yMax = Math.max(20, Math.ceil(Math.max.apply(null, v.rows.map((r) => r.abandon)) / 5) * 5 + 5);
    const xAt = (val) => x0 + ((val - xMin) / (xMax - xMin)) * (x1 - x0);
    const yAt = (val) => y1 - (val / yMax) * (y1 - y0);
    const maxAdm = Math.max.apply(null, v.rows.map((r) => r.adm));

    /* Quadrant « conforme Sphère » (guérison ≥ 75 %, abandon < 15 %) */
    const xs = xAt(NH.SPHERE.guerison), ys = yAt(NH.SPHERE.abandon);
    ctx.save();
    ctx.fillStyle = 'rgba(16,185,129,0.06)';
    ctx.fillRect(xs, y0, x1 - xs, ys - y0);
    ctx.restore();

    /* Grille + échelles */
    for (let k = 0; k <= 4; k++) {
      const val = (yMax / 4) * k;
      D.gridY(ctx, x0, x1, yAt(val));
      D.text(ctx, NH.fmt(val, 0) + '%', x0 - 8, yAt(val), { align: 'right', size: 11 });
    }
    for (let val = xMin; val <= xMax; val += 5) {
      if (val < xMin) continue;
      D.text(ctx, val + '%', xAt(val), y1 + 14, { align: 'center', size: 11 });
    }
    D.text(ctx, 'Taux de guérison (%)  →', (x0 + x1) / 2, H - 8, { align: 'center', size: 11, weight: 500 });
    ctx.save(); ctx.translate(12, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
    D.text(ctx, 'Taux d\u2019abandon (%)  →', 0, 0, { align: 'center', size: 11, weight: 500 }); ctx.restore();

    /* Lignes de référence Sphère */
    ctx.save();
    ctx.strokeStyle = T.tertiary; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(xs, y0); ctx.lineTo(xs, y1); ctx.stroke();
    ctx.strokeStyle = T.danger;
    ctx.beginPath(); ctx.moveTo(x0, ys); ctx.lineTo(x1, ys); ctx.stroke();
    ctx.restore();
    D.text(ctx, 'Sphère ≥ 75 %', xs + 6, y0 + 10, { size: 10, color: '#047857', weight: 600 });
    D.text(ctx, 'Abandon < 15 %', x1 - 6, ys - 9, { size: 10, color: '#B91C1C', weight: 600, align: 'right' });

    /* Points : rayon ∝ √(volume) — animation : apparition en croissance */
    rows.forEach((r) => {
      const col = NH.ZONE_COLORS[r.zone] || T.primary;
      const rad = (5 + 16 * Math.sqrt(r.adm / maxAdm)) * Math.min(1, p * 1.2);
      const px = xAt(r.guer), py = yAt(r.abandon);
      ctx.save();
      ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fillStyle = NH.rgba(col, 0.72); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
      ctx.restore();
      if (v.mode === 'country' || rad > 9) {
        D.text(ctx, r.label, px + rad + 4, py, { size: 10, color: T.value, weight: 600 });
      }
      ch.hit({
        px: px, py: py, r: rad, color: col,
        title: r.label + (v.mode === 'region' ? '' : ' · ' + v.label),
        rows: [['Guérison', NH.pct(r.guer)], ['Abandon', NH.pct(r.abandon)], ['Admissions', NH.fmt(r.adm), col]],
        note: r.guer >= NH.SPHERE.guerison && r.abandon < NH.SPHERE.abandon ? 'Conforme aux normes Sphère' : 'Sous les seuils Sphère'
      });
    });
  };

  /* ---------------------------------------------------------------------
   * G3 — Bullet chart vertical : stocks ATPE (jours de consommation)
   * --------------------------------------------------------------------- */
  NH.charts.g3 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const padL = 44, padR = 12, padT = 16, padB = 44;
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const maxJ = 90;
    const yAt = (val) => y1 - (val / maxJ) * (y1 - y0);
    /* En mode régional : 12 pays au plus gros volume ; en mode pays : districts */
    const rows = v.mode === 'region'
      ? v.rows.slice().sort((a, b) => b.adm - a.adm).slice(0, 12)
      : v.rows;
    const n = rows.length;
    const colW = (x1 - x0) / n;
    const bw = Math.min(34, colW * 0.5);

    /* Bandes de statut : rouge < 30 j · orange 30–45 · ambre 45–60 · vert > 60 */
    const bands = [[0, 30, 'rgba(239,68,68,0.10)'], [30, 45, 'rgba(249,115,22,0.10)'], [45, 60, 'rgba(245,158,11,0.10)'], [60, maxJ, 'rgba(16,185,129,0.10)']];
    bands.forEach(([a, b, c]) => { ctx.fillStyle = c; ctx.fillRect(x0, yAt(b), x1 - x0, yAt(a) - yAt(b)); });

    /* Échelle */
    [0, 30, 45, 60, 90].forEach((val) => {
      D.gridY(ctx, x0, x1, yAt(val), val === 0 ? null : [2, 3]);
      D.text(ctx, val + ' j', x0 - 6, yAt(val), { align: 'right', size: 10 });
    });

    /* Seuil critique 30 jours (rupture imminente) */
    ctx.save();
    ctx.strokeStyle = T.danger; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(x0, yAt(30)); ctx.lineTo(x1, yAt(30)); ctx.stroke();
    ctx.restore();
    D.text(ctx, 'Seuil rupture imminente · 30 j', x1, yAt(30) - 9, { align: 'right', size: 10, color: '#B91C1C', weight: 600 });

    /* Barres (animées de bas en haut) */
    rows.forEach((r, i) => {
      const cx = x0 + colW * (i + 0.5);
      const val = r.stock;
      const col = val > 60 ? T.tertiary : val >= 45 ? T.quaternary : val >= 30 ? '#F97316' : T.danger;
      const h = (y1 - yAt(val)) * p;
      D.roundRect(ctx, cx - bw / 2, y1 - h, bw, h, 6, true);
      ctx.fillStyle = col; ctx.fill();
      /* Marqueur « cible » : niveau du jour (trait sombre) */
      ctx.save(); ctx.fillStyle = T.value;
      ctx.fillRect(cx - bw / 2 - 3, y1 - h - 1.5, bw + 6, 3); ctx.restore();
      D.text(ctx, NH.fmt(val, 0) + ' j', cx, y1 - h - 12, { align: 'center', size: 11, weight: 600, color: T.value });
      const lab = v.mode === 'region' ? r.code : (r.label.length > 10 ? r.label.slice(0, 9) + '…' : r.label);
      D.text(ctx, lab, cx, y1 + 16, { align: 'center', size: 11 });
      ch.hit({
        x0: x0 + colW * i, x1: x0 + colW * (i + 1), y0: y0, y1: y1,
        title: r.label, color: col,
        rows: [['Stock ATPE', NH.fmt(val, 0) + ' jours', col], ['Statut', val < 30 ? 'Rupture imminente' : val < 45 ? 'Orange' : val <= 60 ? 'Ambre' : 'Conforme', col], ['Structures en rupture', NH.fmt(r.rupture, 0)]]
      });
    });
  };

  /* ---------------------------------------------------------------------
   * G4 — Heatmap matrice de performance (lignes × 8 indicateurs)
   * --------------------------------------------------------------------- */
  const HM_COLS = [
    { key: 'guer', label: 'Guérison %', dir: 1, fmt: (x) => NH.fmt(x, 1) },
    { key: 'abandon', label: 'Abandon %', dir: -1, fmt: (x) => NH.fmt(x, 1) },
    { key: 'deces', label: 'Décès %', dir: -1, fmt: (x) => NH.fmt(x, 1) },
    { key: 'cpn', label: 'Dépistage', dir: 1, fmt: (x) => NH.fmt(x, 0) + '%' },
    { key: 'stock', label: 'Stocks (j)', dir: 1, fmt: (x) => NH.fmt(x, 0) },
    { key: 'dhis2', label: 'Synchro App', dir: 1, fmt: (x) => NH.fmt(x, 0) + '%' },
    { key: 'adm', label: 'Admissions', dir: 1, fmt: (x) => kfmt(x) },
    { key: 'score', label: 'Score', dir: 1, fmt: (x) => NH.fmt(x, 0) }
  ];
  NH.HM_COLS = HM_COLS;

  /* Couleur sémantique : rouge (mauvais) → ambre → vert (bon) */
  function scoreColor(t) {
    const a = [239, 68, 68], b = [245, 158, 11], c = [16, 185, 129];
    const mix = (p, q, k) => p.map((x, i) => Math.round(x + (q[i] - x) * k));
    const rgb = t < 0.5 ? mix(a, b, t * 2) : mix(b, c, (t - 0.5) * 2);
    return 'rgb(' + rgb.join(',') + ')';
  }
  NH.scoreColor = scoreColor;

  NH.charts.g4 = function (ch, ctx, W, H, p) {
    const v = ch.view;
    const rows = v.rows;
    const labW = 118, hdrH = 40;
    const x0 = labW, y0 = hdrH;
    const cw = (W - labW - 4) / HM_COLS.length;
    const rh = Math.min(30, (H - hdrH - 4) / rows.length);
    /* Bornes par colonne (normalisation min→max) */
    const bounds = HM_COLS.map((c) => {
      const vals = rows.map((r) => r[c.key]);
      return { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals) };
    });
    /* En-têtes de colonnes */
    HM_COLS.forEach((c, j) => {
      D.text(ctx, c.label, x0 + cw * j + cw / 2, hdrH / 2, { align: 'center', size: 10, weight: 600, color: T.body });
    });
    rows.forEach((r, i) => {
      const y = y0 + i * rh;
      /* Libellé de ligne ; clic = zoom sur le pays (drill-down) en mode régional */
      const lab = v.mode === 'region' ? r.name || r.label : r.label;
      D.text(ctx, lab.length > 16 ? lab.slice(0, 15) + '…' : lab, 4, y + rh / 2, { size: 11, weight: 600, color: T.value });
      if (v.mode === 'region') {
        ch.hit({ x0: 0, x1: labW - 6, y0: y, y1: y + rh, title: 'Voir le détail de ' + lab, color: T.primary, click: true, drill: r.code, rows: [['Cliquer', 'Ouvrir le détail pays']] });
      }
      HM_COLS.forEach((c, j) => {
        const val = r[c.key];
        const b = bounds[j];
        let t = b.max === b.min ? 0.5 : (val - b.min) / (b.max - b.min);
        if (c.dir < 0) t = 1 - t;
        const cx = x0 + cw * j, cy = y;
        const reveal = NH.clamp((p * 1.4) - (i / rows.length) * 0.4, 0, 1);
        ctx.save();
        ctx.globalAlpha = reveal;
        D.roundRect(ctx, cx + 2, cy + 2, cw - 4, rh - 4, 5);
        ctx.fillStyle = scoreColor(t);
        ctx.globalAlpha = reveal * 0.82;
        ctx.fill();
        ctx.restore();
        D.text(ctx, c.fmt(val), cx + cw / 2, cy + rh / 2, { align: 'center', size: 11, weight: 600, color: '#FFFFFF' });
        ch.hit({
          x0: cx, x1: cx + cw, y0: cy, y1: cy + rh, color: scoreColor(t),
          title: lab, note: c.label + ' · ' + (c.dir > 0 ? 'plus haut = meilleur' : 'plus bas = meilleur'),
          rows: [[c.label, c.fmt(val), scoreColor(t)], ['Min / max colonne', c.fmt(b.min) + ' / ' + c.fmt(b.max)]]
        });
      });
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
