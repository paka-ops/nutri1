/* ============================================================================
 * Graphiques FAO G6, G11 et G12 : fortification, densité céréalière et prix.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = global.FAONutriTracker;
  const U = FAO.util;
  const C = U.colors;
  FAO.charts = FAO.charts || {};

  /* G6 — Cinq jauges semi-circulaires avec repère de couverture cible. */
  FAO.charts.g6 = function (ctx, width, height, data, chart, progress) {
    const foods = data.coverage || [];
    const cols = 3;
    const cellWidth = width / cols;
    const radius = Math.min(38, cellWidth * .34);
    const firstRowY = 89;
    const secondRowY = Math.min(height - 77, 223);
    const colors = ['#059669', '#D97706', '#0891B2', '#7C3AED', '#DC2626'];
    const rows = data.rows || [];

    foods.forEach((food, index) => {
      if (chart.hidden.has(food.key)) return;
      const row = index < 3 ? 0 : 1;
      const column = index < 3 ? index : index - 3;
      const x = cellWidth * (column + .5);
      const cy = row === 0 ? firstRowY : secondRowY;
      const color = colors[index];
      const value = U.clamp(food.value, 0, 100);
      const start = Math.PI;
      const end = Math.PI * 2;
      const valueEnd = start + (end - start) * value / 100;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, cy, radius, start, end);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, cy, radius, start, start + (valueEnd - start) * progress);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.stroke();
      const targetAngle = start + (end - start) * food.target / 100;
      U.line(ctx, x + Math.cos(targetAngle) * (radius - 6), cy + Math.sin(targetAngle) * (radius - 6), x + Math.cos(targetAngle) * (radius + 7), cy + Math.sin(targetAngle) * (radius + 7), '#334155', 1.5);
      ctx.restore();
      U.text(ctx, value + '%', x, cy + 2, { size: 14, color, align: 'center', weight: 800 });
      U.text(ctx, 'cible ' + food.target + '%', x, cy + 20, { size: 7, color: '#94A3B8', align: 'center', weight: 600 });
      U.text(ctx, food.label, x, cy + 49, { size: 8, color: '#475569', align: 'center', weight: 700, maxWidth: cellWidth - 6 });
      U.hitCircle(chart, x, cy, radius + 8, food.label, [
        'Couverture de marché mesurée : ' + value + ' %',
        'Objectif de référence : ' + food.target + ' %',
        (value >= food.target ? 'Objectif atteint' : 'Écart à la cible : ' + U.format(food.target - value, 0) + ' points')
      ], color, 'g6-' + food.key);
    });
    U.text(ctx, 'Marchés sentinelles · objectif réglementaire indicatif', width / 2, height - 9, { size: 7, color: '#94A3B8', align: 'center' });
  };

  /* G11 — Barres groupées. Les valeurs sont des indices comparatifs relatifs. */
  FAO.charts.g11 = function (ctx, width, height, data, chart, progress) {
    const nutrients = ['Fer', 'Zinc', 'Protéines', 'Calcium'];
    const series = [
      { key: 'millet', label: 'Mil', color: '#059669', values: [76, 62, 78, 44] },
      { key: 'maize', label: 'Maïs', color: '#D97706', values: [61, 72, 65, 39] },
      { key: 'rice', label: 'Riz', color: '#0891B2', values: [28, 47, 49, 53] }
    ];
    const left = 29;
    const right = 8;
    const top = 22;
    const bottom = 47;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const groupWidth = plotWidth / nutrients.length;
    const barWidth = Math.min(13, groupWidth * .21);
    const yAt = (value) => top + plotHeight * (1 - value / 100);

    [0, 25, 50, 75, 100].forEach((value) => {
      const y = yAt(value);
      U.line(ctx, left, y, width - right, y, '#F1F5F9', 1);
      U.text(ctx, value, left - 5, y, { size: 7, color: '#94A3B8', align: 'right' });
    });
    nutrients.forEach((nutrient, group) => {
      const center = left + groupWidth * (group + .5);
      U.text(ctx, nutrient, center, height - 28, { size: width < 420 ? 7 : 8, color: '#64748B', align: 'center', weight: 650 });
      series.forEach((item, seriesIndex) => {
        if (chart.hidden.has(item.key)) return;
        const value = item.values[group];
        const x = center + (seriesIndex - 1) * (barWidth + 2) - barWidth / 2;
        const y = yAt(value);
        const barHeight = top + plotHeight - y;
        ctx.save();
        ctx.globalAlpha = progress;
        U.topBar(ctx, x, y, barWidth, barHeight, item.color, 4);
        ctx.restore();
        U.hitRect(chart, x - 2, y, barWidth + 4, Math.max(8, barHeight), item.label + ' · ' + nutrient,
          ['Indice comparatif relatif : ' + value + ' / 100', 'Lecture normalisée pour le visuel ; vérifier les unités et la source nationale avant comparaison analytique'], item.color, 'g11-' + item.key + '-' + group);
      });
    });
    U.text(ctx, 'Densité nutritive relative · score normalisé', left, height - 8, { size: 7, color: '#94A3B8', weight: 600 });
  };

  /* G12 — Matrice prix × mois avec écart à la normale saisonnière (base 100). */
  FAO.charts.g12 = function (ctx, width, height, data, chart, progress) {
    const series = data.priceHeat || [];
    const months = data.months || [];
    const left = Math.min(68, Math.max(54, width * .19));
    const right = 5;
    const top = 32;
    const bottom = 31;
    const cellW = (width - left - right) / months.length;
    const rowH = (height - top - bottom) / Math.max(1, series.length);

    months.forEach((month, index) => {
      U.text(ctx, month, left + cellW * (index + .5), 17, { size: cellW < 20 ? 6 : 7, color: '#64748B', align: 'center', weight: 600 });
    });
    series.forEach((row, rowIndex) => {
      const y = top + rowH * rowIndex;
      U.text(ctx, row.crop, left - 7, y + rowH * .5, { size: 8, color: '#475569', align: 'right', weight: 600 });
      row.values.forEach((value, monthIndex) => {
        const x = left + monthIndex * cellW + 1;
        const cellY = y + 2;
        const normalized = U.clamp((value - 75) / 75, 0, 1);
        const color = value <= 100
          ? U.interpolate('#DCFCE7', '#059669', U.clamp((100 - value) / 35, 0, 1))
          : U.interpolate('#FEF3C7', '#DC2626', normalized);
        const w = Math.max(2, cellW - 2);
        const h = Math.max(4, rowH - 4);
        ctx.save();
        ctx.globalAlpha = progress;
        U.roundRect(ctx, x, cellY, w, h, 3);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        if (cellW > 18) U.text(ctx, value, x + w / 2, cellY + h / 2, { size: 6.2, color: value > 125 ? '#FFFFFF' : '#475569', align: 'center', weight: 700 });
        U.hitRect(chart, x, cellY, w, h, row.crop + ' · ' + months[monthIndex], [
          'Indice de prix observé : ' + value + ' (base saisonnière 100)',
          (value > 100 ? 'Au-dessus de la normale de ' : 'Sous la normale de ') + U.format(Math.abs(value - 100), 0) + ' points',
          'Saisie de marché de démonstration'
        ], value > 125 ? '#DC2626' : value > 100 ? '#D97706' : '#059669', 'g12-' + rowIndex + '-' + monthIndex);
      });
    });
    const legendY = height - 11;
    const legends = [{ label: 'Sous la normale', color: '#86EFAC' }, { label: 'Normale', color: '#FDE68A' }, { label: 'Pression', color: '#DC2626' }];
    let x = left;
    legends.forEach((item) => {
      U.roundRect(ctx, x, legendY - 4, 9, 8, 2); ctx.fillStyle = item.color; ctx.fill();
      U.text(ctx, item.label, x + 13, legendY, { size: 6.5, color: '#64748B' });
      x += width < 370 ? 72 : 91;
    });
  };
})(window);
