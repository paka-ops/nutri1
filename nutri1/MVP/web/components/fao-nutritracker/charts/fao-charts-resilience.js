/* ============================================================================
 * Graphiques FAO G9, G10, G14 et G15 : tendances, radar, bulles, scorecard.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = global.FAONutriTracker;
  const U = FAO.util;
  const C = U.colors;
  FAO.charts = FAO.charts || {};

  const seriesMeta = [
    { key: 'mil', label: 'Mil', color: '#059669', index: 0 },
    { key: 'maize', label: 'Maïs', color: '#10B981', index: 1 },
    { key: 'rice', label: 'Riz', color: '#0891B2', index: 2 },
    { key: 'sorghum', label: 'Sorgho', color: '#D97706', index: 3 },
    { key: 'legumes', label: 'Légumineuses', color: '#7C3AED', index: 4 }
  ];

  function drawSmoothArea(ctx, upper, lower, color, alpha, progress) {
    if (upper.length < 2) return;
    const midpoint = (a, b) => (a.x + b.x) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(upper[0].x, lower[0].y);
    ctx.lineTo(upper[0].x, upper[0].y);
    for (let i = 1; i < upper.length; i += 1) {
      const previous = upper[i - 1]; const current = upper[i]; const mid = midpoint(previous, current);
      ctx.bezierCurveTo(mid, previous.y, mid, current.y, current.x, current.y);
    }
    ctx.lineTo(lower[lower.length - 1].x, lower[lower.length - 1].y);
    for (let i = lower.length - 1; i > 0; i -= 1) {
      const current = lower[i]; const previous = lower[i - 1]; const mid = midpoint(previous, current);
      ctx.bezierCurveTo(mid, current.y, mid, previous.y, previous.x, previous.y);
    }
    ctx.closePath();
    const topY = Math.min(...upper.map((point) => point.y));
    const bottomY = Math.max(...lower.map((point) => point.y));
    const gradient = ctx.createLinearGradient(0, topY, 0, bottomY);
    gradient.addColorStop(0, U.rgba(color, alpha * progress));
    gradient.addColorStop(1, U.rgba(color, .03 * progress));
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  /* G9 — Superficie empilée des volumes déclarés de 2015 à 2024. */
  FAO.charts.g9 = function (ctx, width, height, data, chart, progress) {
    const history = data.history || [];
    const visibleSeries = seriesMeta.filter((series) => !chart.hidden.has(series.key));
    const left = 39;
    const right = 12;
    const top = 25;
    const bottom = 34;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxValue = U.niceCeil(Math.max(1, ...history.map((year) => year.total)) * 1.05);
    const xAt = (index) => left + plotWidth * index / Math.max(1, history.length - 1);
    const yAt = (value) => top + plotHeight * (1 - value / maxValue);

    [0, .25, .5, .75, 1].forEach((fraction) => {
      const value = maxValue * fraction;
      const y = yAt(value);
      U.line(ctx, left, y, width - right, y, '#F1F5F9', 1);
      U.text(ctx, U.format(value, 0), left - 5, y, { size: 7, color: '#94A3B8', align: 'right' });
    });
    let lower = history.map((_, index) => ({ x: xAt(index), y: yAt(0) }));
    visibleSeries.forEach((series) => {
      const upper = history.map((year, index) => {
        const cumulative = visibleSeries.slice(0, visibleSeries.indexOf(series) + 1)
          .reduce((total, item) => total + (year.values[item.index] || 0), 0);
        return { x: xAt(index), y: yAt(cumulative), value: cumulative };
      });
      drawSmoothArea(ctx, upper, lower, series.color, .32, progress);
      U.smoothLine(ctx, upper, series.color, 1.6);
      lower = upper;
    });
    history.forEach((year, index) => {
      const x = xAt(index);
      U.text(ctx, String(year.year).slice(2), x, height - 17, { size: 7, color: '#94A3B8', align: 'center' });
      const totalVisible = visibleSeries.reduce((total, series) => total + (year.values[series.index] || 0), 0);
      const y = yAt(totalVisible);
      U.circle(ctx, x, y, chart.hoverId === 'g9-year-' + year.year ? 4.5 : 2.4, '#047857');
      U.hitRect(chart, x - 8, top, 16, plotHeight, 'Campagne ' + year.year, [
        'Production affichée (séries visibles) : ' + U.format(totalVisible, 1) + ' M t',
        'Évolution décennale simulée · la sélection du pays recalcule la série'
      ], '#059669', 'g9-year-' + year.year);
    });
  };

  /* G10 — Radar à sept axes, avec repère régional en vue pays. */
  FAO.charts.g10 = function (ctx, width, height, data, chart, progress) {
    const labels = ['Production', 'Environnement', 'Nutrition', 'Économie', 'Équité', 'Culture', 'Gouvernance'];
    const centerX = width / 2;
    const centerY = height / 2 + 4;
    const radius = Math.max(44, Math.min(width * .29, height * .30, 95));
    const angleAt = (index) => -Math.PI / 2 + index * Math.PI * 2 / labels.length;
    const pointAt = (index, value) => ({ x: centerX + Math.cos(angleAt(index)) * radius * value / 100, y: centerY + Math.sin(angleAt(index)) * radius * value / 100 });

    for (let ring = 20; ring <= 100; ring += 20) {
      ctx.beginPath();
      labels.forEach((_, index) => {
        const point = pointAt(index, ring);
        if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.strokeStyle = ring === 100 ? '#CBD5E1' : '#E8F0EA';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (ring === 100) U.text(ctx, '100', centerX + 3, centerY - radius - 5, { size: 6.5, color: '#94A3B8' });
    }
    labels.forEach((label, index) => {
      const angle = angleAt(index);
      const end = pointAt(index, 100);
      U.line(ctx, centerX, centerY, end.x, end.y, '#E2E8F0', 1);
      const labelX = centerX + Math.cos(angle) * (radius + 19);
      const labelY = centerY + Math.sin(angle) * (radius + 19);
      const align = Math.cos(angle) > .36 ? 'left' : Math.cos(angle) < -.36 ? 'right' : 'center';
      U.text(ctx, label, labelX, labelY, { size: width < 380 ? 6.5 : 7.5, color: '#64748B', align, weight: 600, maxWidth: 82 });
    });

    const regional = [62, 58, 49, 57, 52, 72, 61];
    const drawPolygon = (values, color, fill, dashed, idPrefix) => {
      const points = values.map((value, index) => pointAt(index, U.clamp(value, 0, 100)));
      ctx.save();
      ctx.beginPath();
      points.forEach((point, index) => { if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
      ctx.closePath();
      if (fill) { ctx.globalAlpha = fill * progress; ctx.fillStyle = color; ctx.fill(); }
      ctx.globalAlpha = progress;
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.6 : 2.1;
      ctx.setLineDash(dashed ? [4, 3] : []);
      ctx.stroke();
      ctx.restore();
      points.forEach((point, index) => {
        U.circle(ctx, point.x, point.y, chart.hoverId === idPrefix + '-' + index ? 5 : 2.8, color, '#FFFFFF', 1);
        U.hitCircle(chart, point.x, point.y, 7, labels[index], [
          (idPrefix === 'g10-active' ? data.meta.regionLabel : 'Référence régionale') + ' : ' + U.format(values[index], 0) + ' / 100',
          'Dimension d’analyse : ' + labels[index]
        ], color, idPrefix + '-' + index);
      });
    };
    if (!chart.hidden.has('regional') && data.meta.mode === 'country') drawPolygon(regional, '#94A3B8', 0, true, 'g10-regional');
    if (!chart.hidden.has('active')) drawPolygon(data.radar || regional, '#059669', .13, false, 'g10-active');
  };

  /* G14 — Bulles : pertes, revenus et volume d'exploitations suivies. */
  FAO.charts.g14 = function (ctx, width, height, data, chart, progress) {
    const rows = data.rows || [];
    const left = 43;
    const right = 18;
    const top = 22;
    const bottom = 39;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxIncome = Math.max(1200, U.niceCeil(Math.max(...rows.map((row) => row.income), 1000)));
    const xAt = (value) => left + plotWidth * U.clamp(value, 0, 40) / 40;
    const yAt = (value) => top + plotHeight * (1 - U.clamp(value, 0, maxIncome) / maxIncome);
    const targetX = xAt(15);
    const incomeTargetY = yAt(700);

    ctx.fillStyle = 'rgba(254,242,242,.44)'; ctx.fillRect(targetX, top, width - right - targetX, plotHeight);
    ctx.fillStyle = 'rgba(240,253,244,.40)'; ctx.fillRect(left, top, targetX - left, incomeTargetY - top);
    [0, 10, 20, 30, 40].forEach((value) => {
      const x = xAt(value);
      U.line(ctx, x, top, x, top + plotHeight, value === 15 ? '#D97706' : '#F1F5F9', value === 15 ? 1.2 : 1, value === 15 ? [4, 4] : []);
      U.text(ctx, value + '%', x, height - 21, { size: 7, color: value === 15 ? '#B45309' : '#94A3B8', align: 'center' });
    });
    [0, 500, 1000, 1500].filter((value) => value <= maxIncome).forEach((value) => {
      const y = yAt(value);
      U.line(ctx, left, y, width - right, y, '#F1F5F9', 1);
      U.text(ctx, '$' + value, left - 6, y, { size: 7, color: '#94A3B8', align: 'right' });
    });
    U.text(ctx, 'Pertes post-récolte', left + plotWidth / 2, height - 7, { size: 7, color: '#64748B', align: 'center', weight: 600 });
    U.text(ctx, '15 %', targetX, top + 7, { size: 6.5, color: '#B45309', align: 'center', weight: 700 });

    if (!chart.hidden.has('bubbles')) rows.forEach((row, index) => {
      const x = xAt(row.loss);
      const y = yAt(row.income);
      const r = U.clamp(4 + Math.sqrt(row.production || .2) * 1.35, 4.5, data.meta.mode === 'region' ? 11 : 9);
      const color = row.loss > 22 ? '#DC2626' : row.loss > 15 ? '#D97706' : '#059669';
      ctx.save();
      ctx.globalAlpha = .72 * progress;
      U.circle(ctx, x, y, r, color, '#FFFFFF', 1.5);
      ctx.restore();
      if (chart.hoverId === 'g14-' + row.code) U.circle(ctx, x, y, r + 4, null, U.rgba(color, .25), 4);
      U.hitCircle(chart, x, y, r + 2, row.name, [
        'Pertes déclarées : ' + U.format(row.loss, 0) + ' %',
        'Revenu annuel moyen : $' + U.format(row.income, 0),
        'Production suivie : ' + U.format(row.production, 2) + ' M t',
        'Taille de bulle proportionnelle au volume de production'
      ], color, 'g14-' + row.code, row.type === 'country' ? () => chart.dashboard.selectCountry(row.code) : null);
    });
  };

  /* G15 — Bullet charts : valeur courante, bandes de performance et cible. */
  FAO.charts.g15 = function (ctx, width, height, data, chart, progress) {
    const items = data.scorecard || [];
    const left = Math.min(112, Math.max(90, width * .29));
    const right = 31;
    const top = 28;
    const bottom = 14;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const rowH = plotHeight / Math.max(1, items.length);

    items.forEach((item, index) => {
      const y = top + rowH * (index + .5);
      const trackY = y - Math.min(5.5, rowH * .22);
      const trackH = Math.min(11, rowH * .42);
      const value = U.clamp(item.value, 0, item.max);
      const target = U.clamp(item.target, 0, item.max);
      const valueX = left + plotWidth * value / item.max;
      const targetX = left + plotWidth * target / item.max;
      const badColor = '#FEE2E2';
      const midColor = '#FEF3C7';
      const goodColor = '#DCFCE7';
      if (index % 2 === 1) { ctx.fillStyle = 'rgba(248,250,252,.68)'; ctx.fillRect(0, top + index * rowH, width, rowH); }
      U.text(ctx, item.label, left - 8, y, { size: rowH < 28 ? 7 : 8, color: '#475569', align: 'right', weight: 650 });
      const thirds = [0, .42, .70, 1];
      thirds.slice(0, -1).forEach((start, bandIndex) => {
        const x = left + plotWidth * start;
        const w = plotWidth * (thirds[bandIndex + 1] - start);
        const colors = item.reverse ? [goodColor, midColor, badColor] : [badColor, midColor, goodColor];
        U.roundRect(ctx, x, trackY, w, trackH, 4);
        ctx.fillStyle = colors[bandIndex];
        ctx.fill();
      });
      const good = item.reverse ? value <= target : value >= target;
      if (!chart.hidden.has('bullet')) {
        ctx.save();
        ctx.globalAlpha = progress;
        U.roundedBar(ctx, left, trackY + trackH * .3, Math.max(2, valueX - left), trackH * .4, good ? '#059669' : (value >= target * .72 ? '#D97706' : '#DC2626'), 3);
        ctx.restore();
      }
      U.line(ctx, targetX, trackY - 5, targetX, trackY + trackH + 5, '#1E293B', 1.5);
      U.text(ctx, item.display, width - 2, y, { size: 8, color: good ? '#047857' : '#B45309', align: 'right', weight: 750 });
      U.hitRect(chart, left, trackY - 4, plotWidth, trackH + 8, item.label, [
        'Valeur observée : ' + item.display,
        'Repère de référence : ' + (item.key === 'income' ? '$' + U.format(item.target, 0) : item.key === 'hdds' ? U.format(item.target, 0) + ' / 12' : U.format(item.target, 0) + (item.key === 'autosufficiency' ? ' %' : '%')),
        good ? 'Cible atteinte ou dépassée' : 'Écart à suivre dans le périmètre sélectionné'
      ], good ? '#059669' : '#D97706', 'g15-' + item.key);
    });
    U.text(ctx, 'Valeur mesurée', left, height - 4, { size: 7, color: '#94A3B8' });
    U.text(ctx, '│ Cible', left + 68, height - 4, { size: 7, color: '#334155', weight: 600 });
  };
})(window);
