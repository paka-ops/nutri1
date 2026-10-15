/* ============================================================================
 * Graphiques FAO G5, G8 et G13 : HDDS, diversité des cultures et cible ménages.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = global.FAONutriTracker;
  const U = FAO.util;
  const C = U.colors;
  FAO.charts = FAO.charts || {};

  function shortLabel(value, max) { value = (global.NutriSectionsI18N ? global.NutriSectionsI18N.t(value) : value); return value.length > max ? value.slice(0, max - 1) + '…' : value; }
  function countryAction(row, chart) {
    return row.type === 'country' ? () => chart.dashboard.selectCountry(row.code) : null;
  }

  /* G5 — Nuage de points avec dispersion simulée autour de la moyenne HDDS. */
  FAO.charts.g5 = function (ctx, width, height, data, chart, progress) {
    const rows = data.rows || [];
    const left = Math.min(100, Math.max(78, width * .22));
    const right = 14;
    const top = 24;
    const bottom = 35;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const rowHeight = plotHeight / Math.max(1, rows.length);
    const xAt = (score) => left + plotWidth * score / 12;
    const yTarget = xAt(6);
    U.line(ctx, yTarget, top, yTarget, height - bottom, '#D97706', 1.3, [4, 4]);
    U.text(ctx, 'Cible 6', yTarget, 10, { size: 8, color: '#B45309', align: 'center', weight: 750 });
    [0, 3, 6, 9, 12].forEach((score) => {
      const x = xAt(score);
      U.line(ctx, x, height - bottom, x, height - bottom + 4, '#CBD5E1', 1);
      U.text(ctx, score, x, height - 14, { size: 8, color: '#94A3B8', align: 'center' });
    });
    U.line(ctx, left, height - bottom, width - right, height - bottom, '#CBD5E1', 1);

    rows.forEach((row, rowIndex) => {
      const baseY = top + rowHeight * (rowIndex + .5);
      const mean = U.clamp(row.hdds, 0, 12);
      const jitterSpan = Math.min(7.5, rowHeight * .34);
      if (rowIndex % 2 === 1) { ctx.fillStyle = 'rgba(248,250,252,.75)'; ctx.fillRect(left, top + rowHeight * rowIndex, plotWidth, rowHeight); }
      U.text(ctx, shortLabel(row.name, width < 480 ? 13 : 18), left - 7, baseY, { size: rowHeight < 17 ? 7 : 8, color: '#475569', align: 'right', weight: 500 });
      for (let dot = 0; dot < 9; dot += 1) {
        const spread = Math.sin((rowIndex + 2) * 4.2 + dot * 2.13) * 1.25 + Math.cos((rowIndex + 1) * 2.7 + dot * 1.81) * .62;
        const score = U.clamp(mean + spread, 0, 12);
        const jitter = Math.sin(dot * 2.31 + rowIndex * 1.13) * jitterSpan;
        const x = xAt(score);
        const y = baseY + jitter;
        const id = 'g5-dot-' + row.code + '-' + dot;
        U.circle(ctx, x, y, 2.2, dot % 3 === 0 ? '#86EFAC' : '#A7F3D0');
        U.hitCircle(chart, x, y, 4.4, row.name + ' · ménage enquêté', [
          'Score HDDS simulé : ' + U.format(score, 1) + ' / 12',
          'Moyenne de la zone : ' + U.format(mean, 1) + ' / 12',
          'Échantillon de démonstration : ' + U.format(row.households, 0) + ' ménages'
        ], '#059669', id, countryAction(row, chart));
      }
      const xMean = xAt(mean);
      const avgId = 'g5-mean-' + row.code;
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.beginPath();
      ctx.moveTo(xMean, baseY - 7);
      ctx.lineTo(xMean + 6, baseY);
      ctx.lineTo(xMean, baseY + 7);
      ctx.lineTo(xMean - 6, baseY);
      ctx.closePath();
      ctx.fillStyle = mean >= 6 ? '#059669' : '#D97706';
      ctx.fill();
      ctx.restore();
      U.hitCircle(chart, xMean, baseY, 7, row.name + ' · score moyen HDDS', [
        'Moyenne : ' + U.format(mean, 1) + ' / 12',
        'Écart à la cible FAO ≥ 6 : ' + (mean >= 6 ? '+' : '−') + U.format(Math.abs(mean - 6), 1) + ' point',
        'Base enquêtée (simulation) : ' + U.format(row.households, 0) + ' ménages'
      ], mean >= 6 ? '#059669' : '#D97706', avgId, countryAction(row, chart));
    });
  };

  /* G8 — Relation entre diversité des cultures et diversité alimentaire. */
  FAO.charts.g8 = function (ctx, width, height, data, chart, progress) {
    const rows = data.rows || [];
    const left = 35;
    const right = 13;
    const top = 25;
    const bottom = 41;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xAt = (value) => left + plotWidth * (value - 1) / 7;
    const yAt = (value) => top + plotHeight * (1 - value / 12);
    const xMid = xAt(4.5);
    const yMid = yAt(6);

    ctx.fillStyle = 'rgba(254,242,242,.55)'; ctx.fillRect(left, top, xMid - left, yMid - top);
    ctx.fillStyle = 'rgba(240,253,244,.7)'; ctx.fillRect(xMid, top, left + plotWidth - xMid, yMid - top);
    ctx.fillStyle = 'rgba(255,251,235,.48)'; ctx.fillRect(left, yMid, xMid - left, top + plotHeight - yMid);
    ctx.fillStyle = 'rgba(236,253,245,.44)'; ctx.fillRect(xMid, yMid, left + plotWidth - xMid, top + plotHeight - yMid);
    [0, 3, 6, 9, 12].forEach((score) => {
      const y = yAt(score);
      U.line(ctx, left, y, left + plotWidth, y, score === 6 ? '#D97706' : '#F1F5F9', score === 6 ? 1.3 : 1, score === 6 ? [4, 4] : []);
      U.text(ctx, score, left - 7, y, { size: 7, color: '#94A3B8', align: 'right' });
    });
    [1, 3, 5, 7, 8].forEach((value) => {
      const x = xAt(value);
      U.line(ctx, x, top, x, top + plotHeight, value === 4.5 ? '#CBD5E1' : '#F1F5F9', 1, value === 4.5 ? [3, 4] : []);
      U.text(ctx, value, x, top + plotHeight + 12, { size: 7, color: '#94A3B8', align: 'center' });
    });
    U.text(ctx, 'HDDS', 5, 13, { size: 7, color: '#64748B', weight: 700 });
    U.text(ctx, 'Diversité des cultures cultivées', left + plotWidth / 2, height - 8, { size: 7, color: '#64748B', align: 'center', weight: 600 });
    U.text(ctx, 'Cultures diversifiées', xMid + (left + plotWidth - xMid) / 2, top + 10, { size: 6.5, color: '#059669', align: 'center', weight: 600 });

    const meanX = rows.reduce((total, row) => total + row.diversity, 0) / Math.max(1, rows.length);
    const meanY = rows.reduce((total, row) => total + row.hdds, 0) / Math.max(1, rows.length);
    const covariance = rows.reduce((total, row) => total + (row.diversity - meanX) * (row.hdds - meanY), 0);
    const variance = rows.reduce((total, row) => total + Math.pow(row.diversity - meanX, 2), 0) || 1;
    const slope = covariance / variance;
    const regression = [
      { x: xAt(1), y: yAt(U.clamp(meanY + slope * (1 - meanX), 0, 12)) },
      { x: xAt(8), y: yAt(U.clamp(meanY + slope * (8 - meanX), 0, 12)) }
    ];
    U.smoothLine(ctx, regression, '#059669', 1.5, [5, 4]);

    rows.forEach((row, index) => {
      const x = xAt(row.diversity);
      const y = yAt(row.hdds);
      const radius = data.meta.mode === 'region' ? 4.5 + Math.min(3, Math.sqrt(row.production) * .28) : 5.2;
      ctx.save();
      ctx.globalAlpha = progress;
      U.circle(ctx, x, y, radius, U.rgba(row.hdds >= 6 ? '#059669' : '#D97706', .78), '#FFFFFF', 1.4);
      if (chart.hoverId === 'g8-' + row.code) U.circle(ctx, x, y, radius + 4, null, U.rgba('#059669', .28), 4);
      ctx.restore();
      U.hitCircle(chart, x, y, radius + 2, row.name, [
        'Diversité culturale : ' + U.format(row.diversity, 1) + ' cultures indicatrices',
        'Score HDDS moyen : ' + U.format(row.hdds, 1) + ' / 12',
        'Pertes déclarées : ' + U.format(row.loss, 0) + ' %',
        'Revenu moyen suivi : $' + U.format(row.income, 0) + ' / an'
      ], row.hdds >= 6 ? '#059669' : '#D97706', 'g8-' + row.code, countryAction(row, chart));
    });
  };

  /* G13 — Lollipop du score HDDS à la cible de 6 groupes alimentaires. */
  FAO.charts.g13 = function (ctx, width, height, data, chart, progress) {
    const rows = data.rows || [];
    const left = Math.min(106, Math.max(83, width * .22));
    const right = 18;
    const top = 25;
    const bottom = 27;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const rowHeight = plotHeight / Math.max(1, rows.length);
    const xAt = (score) => left + plotWidth * score / 8;
    const targetX = xAt(6);

    [0, 2, 4, 6, 8].forEach((value) => {
      const x = xAt(value);
      U.line(ctx, x, top, x, height - bottom, value === 6 ? '#D97706' : '#F1F5F9', value === 6 ? 1.4 : 1, value === 6 ? [4, 4] : []);
      U.text(ctx, value, x, height - 11, { size: 8, color: value === 6 ? '#B45309' : '#94A3B8', align: 'center', weight: value === 6 ? 750 : 500 });
    });
    U.text(ctx, 'CIBLE ≥ 6', targetX, 11, { size: 7, color: '#B45309', align: 'center', weight: 800 });
    rows.forEach((row, index) => {
      const mean = U.clamp(row.hdds, 0, 8);
      const y = top + rowHeight * (index + .5);
      const x = xAt(mean);
      const color = mean >= 6 ? '#059669' : mean >= 4.5 ? '#D97706' : '#DC2626';
      if (index % 2 === 1) { ctx.fillStyle = 'rgba(248,250,252,.7)'; ctx.fillRect(left, top + index * rowHeight, plotWidth, rowHeight); }
      U.text(ctx, (function(n){ n = (global.NutriSectionsI18N ? global.NutriSectionsI18N.t(n) : n); return n.length > 14 ? n.slice(0, 13) + '…' : n; })(row.name), left - 7, y, { size: rowHeight < 16 ? 7 : 8, color: '#475569', align: 'right' });
      U.line(ctx, Math.min(targetX, x), y, Math.max(targetX, x), y, color, 1.8);
      U.circle(ctx, x, y, chart.hoverId === 'g13-' + row.code ? 6 : 4.2, color, '#FFFFFF', 1);
      U.hitCircle(chart, x, y, 7, row.name + ' · HDDS', [
        'Moyenne mesurée (simulation) : ' + U.format(mean, 1) + ' / 12',
        (mean >= 6 ? 'Au-dessus de la cible de ' : 'Écart à la cible : ') + U.format(Math.abs(mean - 6), 1) + ' point(s)',
        'Ménages suivis : ' + U.format(row.households, 0)
      ], color, 'g13-' + row.code, countryAction(row, chart));
    });
  };
})(window);
