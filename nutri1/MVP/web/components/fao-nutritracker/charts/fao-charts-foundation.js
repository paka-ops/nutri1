/* ============================================================================
 * Graphiques FAO G1–G3 : autosuffisance, matrice nutritive et calendrier.
 * Tous les dessins s'appuient exclusivement sur l'API Canvas 2D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = global.FAONutriTracker;
  const U = FAO.util;
  const C = U.colors;
  FAO.charts = FAO.charts || {};

  const shortName = (name, max) => { name = (global.NutriSectionsI18N ? global.NutriSectionsI18N.t(name) : name); return name.length > max ? name.slice(0, max - 1) + '…' : name; };
  const monthRange = (start, end) => FAO.DATA.months[start] + '–' + FAO.DATA.months[Math.max(start, end - 1)];

  /* G1 — Barres horizontales normalisées sur les besoins estimés. */
  FAO.charts.g1 = function (ctx, width, height, data, chart, progress) {
    const rows = data.rows || [];
    const left = Math.min(106, Math.max(82, width * .19));
    const right = Math.min(68, Math.max(48, width * .12));
    const top = 34;
    const bottom = 27;
    const plotWidth = Math.max(30, width - left - right);
    const plotHeight = Math.max(20, height - top - bottom);
    const rowHeight = plotHeight / Math.max(1, rows.length);
    const maxRatio = 1.6;
    const xAt = (ratio) => left + plotWidth * ratio / maxRatio;
    const showProduction = !chart.hidden.has('production');
    const showNeeds = !chart.hidden.has('needs');

    [0, .5, 1, 1.5].forEach((ratio) => {
      const x = xAt(ratio);
      U.line(ctx, x, top - 5, x, height - bottom + 1, ratio === 1 ? '#10B981' : '#F1F5F9', ratio === 1 ? 1.5 : 1, ratio === 1 ? [4, 4] : []);
      U.text(ctx, ratio === 1 ? '100 %' : ratio * 100 + ' %', x, height - 10, { size: 8, color: ratio === 1 ? '#059669' : C.muted, align: 'center' });
    });
    U.text(ctx, 'autosuffisance', xAt(1), 10, { size: 8, color: C.primary, weight: 700, align: 'center' });

    rows.forEach((row, index) => {
      const y = top + rowHeight * index;
      const ratio = U.clamp(row.selfSufficiency || (row.production / (row.needs || 1)), 0, maxRatio);
      const barH = Math.max(3, Math.min(7, rowHeight * .28));
      const yProd = y + rowHeight * .20;
      const yNeed = y + rowHeight * .56;
      if (index % 2 === 1) { ctx.fillStyle = 'rgba(241,245,249,.48)'; ctx.fillRect(left, y, plotWidth, rowHeight); }
      U.text(ctx, shortName(row.name, width < 500 ? 13 : 17), left - 7, y + rowHeight * .5, { size: rowHeight < 19 ? 7.5 : 8.5, color: '#475569', align: 'right', weight: row.code === data.meta.countryCode ? 700 : 500 });
      ctx.save();
      ctx.globalAlpha = progress;
      if (showNeeds) {
        const needWidth = plotWidth / maxRatio;
        ctx.beginPath();
        U.roundRect(ctx, left, yNeed, needWidth, barH, 3);
        ctx.fillStyle = '#F8FAFC';
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (showProduction) {
        U.roundedBar(ctx, left, yProd, plotWidth * ratio / maxRatio, barH, ratio >= 1 ? '#059669' : '#10B981', 3);
      }
      ctx.restore();
      const gap = Math.round((ratio - 1) * 100);
      U.text(ctx, (gap > 0 ? '+' : '') + gap + '%', width - right + 5, y + rowHeight * .5, { size: 8, color: gap >= 0 ? '#059669' : '#DC2626', weight: 750 });
      const lines = [
        'Production enregistrée : ' + U.format(row.production, 2) + ' M t',
        'Besoins estimés : ' + U.format(row.needs, 2) + ' M t',
        'Couverture estimée : ' + U.format(row.selfSufficiency * 100, 0) + ' %',
        (gap >= 0 ? 'Surplus estimé : ' : 'Déficit estimé : ') + U.format(Math.abs(row.production - row.needs), 2) + ' M t'
      ];
      U.hitRect(chart, left, y, width - left - 2, rowHeight, row.name, lines, gap >= 0 ? C.primary : C.red, 'g1-' + row.code,
        row.type === 'country' ? () => chart.dashboard.selectCountry(row.code) : null);
    });
  };

  /* G2 — Heatmap nutritive avec contour or pour les aliments à fort intérêt. */
  FAO.charts.g2 = function (ctx, width, height, data, chart, progress) {
    const foods = data.foods || [];
    const nutrients = data.nutrients || [];
    const left = Math.min(112, Math.max(82, width * .23));
    const top = 36;
    const right = 6;
    const bottom = 5;
    const cellWidth = (width - left - right) / Math.max(1, nutrients.length);
    const rowHeight = (height - top - bottom) / Math.max(1, foods.length);
    const nutrientShort = ['Énergie', 'Prot.', 'Fer', 'Zinc', 'Vit.A', 'Vit.C', 'Calc.', 'Folate'];

    nutrientShort.forEach((label, column) => {
      U.text(ctx, label, left + column * cellWidth + cellWidth / 2, 17, { size: width < 500 ? 7 : 8, color: '#64748B', align: 'center', weight: 700 });
    });
    U.text(ctx, 'SCORE RELATIF', left, 30, { size: 7, color: '#94A3B8', weight: 600 });

    foods.forEach((food, row) => {
      const y = top + row * rowHeight;
      U.text(ctx, shortName(food.name, width < 480 ? 16 : 21), left - 7, y + rowHeight * .5, { size: rowHeight < 17 ? 7 : 8, color: '#475569', align: 'right', weight: food.superfood ? 700 : 500 });
      food.values.forEach((value, column) => {
        const x = left + column * cellWidth + 1;
        const cellY = y + 1;
        const cellH = Math.max(5, rowHeight - 2);
        const fill = U.interpolate('#F0FDF4', '#047857', U.clamp(value / 100, 0, 1));
        ctx.save();
        ctx.globalAlpha = progress;
        U.roundRect(ctx, x, cellY, Math.max(3, cellWidth - 2), cellH, 3);
        ctx.fillStyle = fill;
        ctx.fill();
        if (food.superfood) {
          ctx.strokeStyle = '#D4A017';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
        if (cellWidth > 30 && rowHeight > 15) {
          U.text(ctx, value, x + (cellWidth - 2) / 2, cellY + cellH / 2, { size: 7, color: value > 62 ? '#FFFFFF' : '#475569', align: 'center', weight: 700 });
        }
        ctx.restore();
        U.hitRect(chart, x, cellY, Math.max(3, cellWidth - 2), cellH,
          food.name + ' · ' + nutrients[column],
          ['Indice relatif de densité nutritive : ' + value + ' / 100', food.superfood ? 'Aliment signalé par les relais comme super-aliment local' : 'Lecture indicative, non équivalente à une analyse de laboratoire', food.focus ? 'Aliment mis en avant dans le périmètre alimentaire sélectionné' : 'Hors sélection alimentaire prioritaire de la zone'],
          food.superfood ? '#D4A017' : C.primary, 'g2-' + row + '-' + column);
      });
      if (food.superfood) U.circle(ctx, left - 4, y + rowHeight * .5, 2, '#D4A017');
      if (food.focus) {
        U.roundRect(ctx, left + .5, y + 2, 2, Math.max(4, rowHeight - 4), 1);
        ctx.fillStyle = '#047857';
        ctx.fill();
      }
    });
  };

  /* G3 — Gantt des cultures et deux séries temporelles en bande inférieure. */
  FAO.charts.g3 = function (ctx, width, height, data, chart, progress) {
    const left = Math.min(103, Math.max(78, width * .14));
    const right = 18;
    const monthWidth = (width - left - right) / 12;
    const top = 37;
    const lineBandTop = height - 91;
    const ganttBottom = lineBandTop - 13;
    const rows = data.seasons || [];
    const rowHeight = Math.max(13, (ganttBottom - top - 7) / rows.length);
    const sowColor = '#059669';
    const growColor = '#86EFAC';
    const harvestColor = '#D97706';
    const months = data.months;

    /* La fenêtre de soudure est explicitement mise en évidence : mai à août. */
    ctx.save();
    ctx.fillStyle = 'rgba(217,119,6,.09)';
    ctx.fillRect(left + 4 * monthWidth, 22, monthWidth * 4, height - 34);
    ctx.restore();
    U.text(ctx, 'SOUDURE', left + 6 * monthWidth, 12, { size: 7, color: '#B45309', align: 'center', weight: 800 });
    months.forEach((month, index) => {
      const x = left + monthWidth * (index + .5);
      U.line(ctx, left + monthWidth * index, 29, left + monthWidth * index, height - 21, '#F1F5F9', 1);
      U.text(ctx, month, x, 25, { size: 8, color: '#64748B', align: 'center', weight: 600 });
    });
    U.line(ctx, left + monthWidth * 12, 29, left + monthWidth * 12, height - 21, '#F1F5F9', 1);

    rows.forEach((crop, row) => {
      const y = top + row * rowHeight;
      const center = y + rowHeight * .52;
      U.text(ctx, crop.crop, left - 8, center, { size: 8, color: '#475569', align: 'right', weight: 600 });
      U.line(ctx, left, center, width - right, center, '#F8FAFC', 1);
      const stages = [
        { name: 'Semis', period: crop.plant, color: sowColor },
        { name: 'Croissance', period: crop.grow, color: growColor },
        { name: 'Récolte', period: crop.harvest, color: harvestColor }
      ];
      stages.forEach((stage) => {
        const start = stage.period[0];
        const end = stage.period[1];
        const x = left + start * monthWidth + 1;
        const w = Math.max(2, (end - start) * monthWidth - 2);
        const barHeight = Math.max(6, Math.min(11, rowHeight * .48));
        ctx.save();
        ctx.globalAlpha = progress;
        U.roundedBar(ctx, x, center - barHeight / 2, w, barHeight, stage.color, 4);
        ctx.restore();
        U.hitRect(chart, x, center - barHeight, w, barHeight * 2, crop.crop + ' · ' + stage.name,
          ['Période saisie : ' + monthRange(start, end), 'Calendrier agricole de démonstration · à confirmer par zone'], stage.color, 'g3-' + crop.crop + '-' + stage.name);
      });
    });

    const rain = [8, 5, 10, 26, 68, 137, 202, 218, 148, 69, 18, 8];
    const riskBase = 81 - (data.current.hdds || 4) * 4 + (data.current.loss || 20) * .24;
    const risk = [riskBase - 16, riskBase - 14, riskBase - 10, riskBase - 3, riskBase + 8, riskBase + 17, riskBase + 21, riskBase + 16, riskBase + 8, riskBase, riskBase - 9, riskBase - 14].map((value) => U.clamp(value, 15, 100));
    const bandHeight = height - lineBandTop - 28;
    const rainTop = lineBandTop + 8;
    U.line(ctx, left, lineBandTop, width - right, lineBandTop, '#CBD5E1', 1);
    U.text(ctx, 'Pluviométrie / vulnérabilité', 8, rainTop + 4, { size: 7, color: '#64748B', weight: 700 });
    const rainPoints = rain.map((value, index) => ({ x: left + monthWidth * (index + .5), y: rainTop + bandHeight * (1 - value / 240) }));
    const riskPoints = risk.map((value, index) => ({ x: left + monthWidth * (index + .5), y: rainTop + bandHeight * (1 - value / 110) }));
    if (!chart.hidden.has('rain')) {
      U.smoothLine(ctx, rainPoints, '#0891B2', 2.1);
      rainPoints.forEach((point, index) => {
        U.circle(ctx, point.x, point.y, chart.hoverId === 'g3-rain-' + index ? 5.5 : 2.5, '#0891B2');
        U.hitCircle(chart, point.x, point.y, 7, 'Pluviométrie · ' + months[index], [rain[index] + ' mm · estimation saisonnière de démonstration'], '#0891B2', 'g3-rain-' + index);
      });
    }
    if (!chart.hidden.has('risk')) {
      U.smoothLine(ctx, riskPoints, '#DC2626', 2, [4, 3]);
      riskPoints.forEach((point, index) => {
        U.circle(ctx, point.x, point.y, chart.hoverId === 'g3-risk-' + index ? 5.5 : 2.4, '#DC2626');
        U.hitCircle(chart, point.x, point.y, 7, 'Vulnérabilité · ' + months[index], ['Indice communautaire : ' + U.format(risk[index], 0) + ' / 100', 'Pic de soudure : mai à août'], '#DC2626', 'g3-risk-' + index);
      });
    }
    U.line(ctx, left, height - 18, width - right, height - 18, '#CBD5E1', 1);
  };
})(window);
