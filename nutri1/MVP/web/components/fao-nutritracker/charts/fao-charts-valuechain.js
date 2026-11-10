/* ============================================================================
 * Graphiques FAO G4 et G7 : flux alluvial et cascade des pertes.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = global.FAONutriTracker;
  const U = FAO.util;
  const C = U.colors;
  FAO.charts = FAO.charts || {};

  function ribbon(ctx, x1, y1, h1, x2, y2, h2, color, alpha) {
    const bend = (x2 - x1) * .46;
    ctx.beginPath();
    ctx.moveTo(x1, y1 - h1 / 2);
    ctx.bezierCurveTo(x1 + bend, y1 - h1 / 2, x2 - bend, y2 - h2 / 2, x2, y2 - h2 / 2);
    ctx.lineTo(x2, y2 + h2 / 2);
    ctx.bezierCurveTo(x2 - bend, y2 + h2 / 2, x1 + bend, y1 + h1 / 2, x1, y1 + h1 / 2);
    ctx.closePath();
    ctx.fillStyle = U.rgba(color, alpha);
    ctx.fill();
    ctx.strokeStyle = U.rgba(color, Math.min(.62, alpha + .22));
    ctx.lineWidth = .75;
    ctx.stroke();
  }

  function cubicPoint(x1, y1, x2, y2, t) {
    const bend = (x2 - x1) * .46;
    const a = 1 - t;
    return {
      x: a * a * a * x1 + 3 * a * a * t * (x1 + bend) + 3 * a * t * t * (x2 - bend) + t * t * t * x2,
      y: a * a * a * y1 + 3 * a * a * t * y1 + 3 * a * t * t * y2 + t * t * t * y2
    };
  }

  /* G4 — Sankey simplifié, avec trois filières, pertes et particules animées. */
  FAO.charts.g4 = function (ctx, width, height, data, chart, progress, timestamp) {
    const left = 12;
    const right = 12;
    const top = 51;
    const bottom = 25;
    const stageX = [left + 33, left + (width - left - right) * .34, left + (width - left - right) * .65, width - right - 37];
    const nodeWidth = Math.min(76, Math.max(56, (width - 92) / 6));
    const availableHeight = height - top - bottom;
    const rows = data.rows || [];
    const mix = data.productionMix || [25, 16, 16, 24, 15, 4];
    const cerealShare = (mix[0] + mix[1] + mix[3] + mix[5]) / 100;
    const legumeShare = mix[4] / 100;
    const rootsShare = Math.max(.07, 1 - cerealShare - legumeShare);
    const shares = [cerealShare, legumeShare, rootsShare];
    const names = ['Céréales', 'Légumineuses', 'Racines & tubercules'];
    const colors = [C.primary, C.amber, C.cyan];
    const keys = ['cereals', 'legumes', 'roots'];
    const visible = keys.map((key) => !chart.hidden.has(key));
    const total = Math.max(1, data.current.production || 52.4);
    const lossRate = U.clamp((data.current.loss || 22) / 100, .05, .42);
    const rowGap = 12;
    const usable = availableHeight - 36;
    const flowTotalHeight = Math.min(usable, 212);
    const flowHeights = shares.map((share) => Math.max(15, flowTotalHeight * share));
    const flowSum = flowHeights.reduce((a, b) => a + b, 0);
    const normalizedHeights = flowHeights.map((value) => value * flowTotalHeight / flowSum);
    const flowAreaTop = top + 17;
    const flowAreaHeight = flowTotalHeight;
    const firstTop = flowAreaTop + Math.max(0, (flowAreaHeight - normalizedHeights.reduce((a, b) => a + b, 0)) / 2);
    const sourceY = [];
    let offsetY = firstTop;
    normalizedHeights.forEach((h) => { sourceY.push(offsetY + h / 2); offsetY += h + rowGap; });
    /* Répartir les noeuds sur les trois premières étapes. */
    const stageYs = [sourceY, sourceY.map((value, i) => value + (i - 1) * 2), sourceY.map((value, i) => value + (1 - i) * 2)];
    const stageTitles = ['Production', 'Transformation', 'Distribution', 'Consommation'];
    stageTitles.forEach((title, index) => {
      U.text(ctx, title, stageX[index], 14, { size: 8, color: '#475569', align: 'center', weight: 750 });
      U.line(ctx, stageX[index], 28, stageX[index], 36, '#BBF7D0', 1.5);
    });
    const flowTargets = [
      { consume: flowAreaTop + 45, loss: flowAreaTop + flowAreaHeight - 18 },
      { consume: flowAreaTop + 94, loss: flowAreaTop + flowAreaHeight - 5 },
      { consume: flowAreaTop + 143, loss: flowAreaTop + flowAreaHeight + 8 }
    ];

    keys.forEach((key, index) => {
      if (!visible[index]) return;
      const share = shares[index];
      const h = normalizedHeights[index];
      const y0 = stageYs[0][index];
      const y1 = stageYs[1][index];
      const y2 = stageYs[2][index];
      const stage1Loss = .035;
      const stage2Loss = .075;
      const yStart = [y0, y1, y2];
      const heights = [h, h * (1 - stage1Loss), h * (1 - stage2Loss)];
      for (let stage = 0; stage < 2; stage += 1) {
        const x1 = stageX[stage] + nodeWidth / 2;
        const x2 = stageX[stage + 1] - nodeWidth / 2;
        ribbon(ctx, x1, yStart[stage], heights[stage], x2, yStart[stage + 1], heights[stage + 1], colors[index], .19 * progress);
        const hitY = Math.min(yStart[stage], yStart[stage + 1]) - Math.max(heights[stage], heights[stage + 1]) / 2;
        U.hitRect(chart, x1, hitY, x2 - x1, Math.max(20, Math.max(heights[stage], heights[stage + 1])), names[index] + ' · ' + (stage === 0 ? 'production → transformation' : 'transformation → marché'),
          ['Part du flux suivi : ' + U.format(share * 100, 0) + ' %', 'Pertes intermédiaires estimées : ' + U.format((stage === 0 ? stage1Loss : stage2Loss) * 100, 1) + ' %'], colors[index], 'g4-' + key + '-' + stage);
        /* Petits marqueurs lumineux : leur phase se décale dans chaque ruban. */
        for (let particle = 0; particle < 3; particle += 1) {
          const t = ((timestamp / 1700 + particle * .31 + index * .17 + stage * .23) % 1);
          const point = cubicPoint(x1, yStart[stage], x2, yStart[stage + 1], t);
          U.circle(ctx, point.x, point.y, particle === 0 ? 2.3 : 1.7, '#FFFFFF', colors[index], .8);
        }
      }
      const flowFrom = stageX[2] + nodeWidth / 2;
      const flowTo = stageX[3] - nodeWidth / 2;
      const consumeHeight = heights[2] * (1 - lossRate);
      const lossHeight = Math.max(4, heights[2] * lossRate);
      ribbon(ctx, flowFrom, y2 - heights[2] * .18, heights[2] * (1 - lossRate), flowTo, flowTargets[index].consume, consumeHeight, colors[index], .23 * progress);
      ribbon(ctx, flowFrom, y2 + heights[2] * .34, lossHeight, flowTo, flowTargets[index].loss, lossHeight, C.red, .19 * progress);
      const volume = total * share;
      U.hitRect(chart, flowFrom, Math.min(y2, flowTargets[index].consume) - heights[2], flowTo - flowFrom, Math.abs(flowTargets[index].consume - y2) + heights[2] * 2,
        names[index] + ' · consommation', ['Volume après pertes : ' + U.format(volume * (1 - lossRate), 2) + ' M t'], colors[index], 'g4-' + key + '-consume');
      U.hitRect(chart, flowFrom, Math.min(y2, flowTargets[index].loss) - heights[2], flowTo - flowFrom, Math.abs(flowTargets[index].loss - y2) + heights[2] * 2,
        names[index] + ' · pertes', ['Volume perdu estimé : ' + U.format(volume * lossRate, 2) + ' M t', 'Taux agrégé du périmètre : ' + U.format(lossRate * 100, 0) + ' %'], C.red, 'g4-' + key + '-loss');
    });

    /* Noeuds des trois premières étapes. */
    for (let stage = 0; stage < 3; stage += 1) {
      keys.forEach((key, index) => {
        if (!visible[index]) return;
        const h = normalizedHeights[index] * (stage === 0 ? 1 : stage === 1 ? .965 : .925);
        const x = stageX[stage] - nodeWidth / 2;
        const y = stageYs[stage][index] - h / 2;
        U.roundRect(ctx, x, y, nodeWidth, h, 5);
        ctx.fillStyle = U.rgba(colors[index], .15);
        ctx.fill();
        ctx.strokeStyle = U.rgba(colors[index], .68);
        ctx.lineWidth = 1;
        ctx.stroke();
        if (h > 17) U.text(ctx, names[index], stageX[stage], stageYs[stage][index], { size: width < 560 ? 6.5 : 7.5, color: '#334155', align: 'center', weight: 700, maxWidth: nodeWidth - 6 });
      });
    }
    const consumptionY = flowAreaTop + 87;
    const consumptionH = 124;
    const lossY = flowAreaTop + flowAreaHeight - 7;
    const lossH = 29;
    U.roundRect(ctx, stageX[3] - nodeWidth / 2, consumptionY, nodeWidth, consumptionH, 7);
    ctx.fillStyle = 'rgba(5,150,105,.10)'; ctx.fill(); ctx.strokeStyle = '#059669'; ctx.lineWidth = 1.2; ctx.stroke();
    U.text(ctx, 'Consommation', stageX[3], consumptionY + consumptionH * .43, { size: 7, color: '#047857', align: 'center', weight: 750 });
    U.text(ctx, U.format((1 - lossRate) * 100, 0) + ' %', stageX[3], consumptionY + consumptionH * .61, { size: 11, color: '#059669', align: 'center', weight: 800 });
    U.roundRect(ctx, stageX[3] - nodeWidth / 2, lossY - lossH / 2, nodeWidth, lossH, 6);
    ctx.fillStyle = 'rgba(220,38,38,.09)'; ctx.fill(); ctx.strokeStyle = '#FCA5A5'; ctx.lineWidth = 1; ctx.stroke();
    U.text(ctx, 'Pertes ' + U.format(lossRate * 100, 0) + '%', stageX[3], lossY, { size: 7, color: '#B91C1C', align: 'center', weight: 750 });
    U.hitRect(chart, stageX[3] - nodeWidth / 2, consumptionY, nodeWidth, consumptionH, 'Consommation finale', ['Part disponible estimée : ' + U.format((1 - lossRate) * 100, 0) + ' %', U.format(total * (1 - lossRate), 2) + ' M t après pertes'], C.primary, 'g4-final-consumption');
    U.hitRect(chart, stageX[3] - nodeWidth / 2, lossY - lossH / 2, nodeWidth, lossH, 'Pertes finales', ['Taux déclaré dans l’app : ' + U.format(lossRate * 100, 0) + ' %', U.format(total * lossRate, 2) + ' M t estimées'], C.red, 'g4-final-loss');
  };

  /* G7 — Waterfall : le volume disponible diminue à chaque étape de la chaîne. */
  FAO.charts.g7 = function (ctx, width, height, data, chart, progress) {
    const labels = ['Départ', 'Récolte', 'Battage', 'Stockage', 'Transport', 'Transfo.', 'Marché', 'Disponible'];
    const baselineLosses = [0, 3.4, 2.6, 6.3, 3.2, 4.1, 2.4];
    const scale = (data.current.loss || 22) / 22;
    const losses = baselineLosses.slice(1).map((value) => value * scale);
    const totalLoss = losses.reduce((a, b) => a + b, 0);
    const start = 100;
    const final = Math.max(0, start - totalLoss);
    const left = 28;
    const right = 10;
    const top = 24;
    const bottom = 62;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const count = labels.length;
    const slot = plotWidth / count;
    const barWidth = Math.min(24, slot * .58);
    const yAt = (value) => top + plotHeight * (1 - value / 100);

    [0, 25, 50, 75, 100].forEach((value) => {
      const y = yAt(value);
      U.line(ctx, left, y, width - right, y, '#F1F5F9', 1);
      U.text(ctx, value + '%', left - 5, y, { size: 7, color: '#94A3B8', align: 'right' });
    });
    if (!chart.hidden.has('harvest')) {
      const bars = [];
      let current = start;
      bars.push({ label: labels[0], from: 0, to: start, value: start, type: 'total', loss: 0 });
      losses.forEach((loss, index) => {
        const before = current;
        current = Math.max(0, current - loss);
        bars.push({ label: labels[index + 1], from: current, to: before, value: loss, type: 'loss', loss });
      });
      bars.push({ label: labels[labels.length - 1], from: 0, to: final, value: final, type: 'final', loss: 0 });
      bars.forEach((bar, index) => {
        const x = left + slot * (index + .5) - barWidth / 2;
        const y = yAt(bar.to);
        const h = Math.max(2, yAt(bar.from) - yAt(bar.to));
        const color = bar.type === 'loss' ? (bar.loss >= 4 ? '#DC2626' : '#D97706') : '#059669';
        ctx.save();
        ctx.globalAlpha = progress;
        U.topBar(ctx, x, y, barWidth, h, color, 4);
        ctx.restore();
        if (index > 0 && index < bars.length - 1) {
          const previous = bars[index - 1];
          const connectorY = yAt(previous.type === 'total' ? previous.to : previous.from);
          U.line(ctx, left + slot * index - barWidth / 2, connectorY, x, connectorY, '#CBD5E1', 1, [3, 3]);
        }
        U.text(ctx, bar.type === 'loss' ? '−' + U.format(bar.loss, 1) + '%' : U.format(bar.value, 0) + '%', x + barWidth / 2, y - 7, { size: 7, color, align: 'center', weight: 750 });
        U.text(ctx, bar.label, left + slot * (index + .5), height - 31, { size: 7, color: '#64748B', align: 'center', weight: 600 });
        U.hitRect(chart, x - 3, y - 3, barWidth + 6, h + 7, bar.type === 'loss' ? 'Perte · ' + bar.label : bar.label,
          bar.type === 'loss' ? ['Perte estimée à cette étape : ' + U.format(bar.loss, 1) + ' % de la récolte initiale', 'Disponible après étape : ' + U.format(bar.from, 1) + ' %'] : ['Volume de référence : ' + U.format(bar.value, 1) + ' %', bar.type === 'final' ? 'Pertes cumulées : ' + U.format(totalLoss, 1) + ' %' : 'Point de départ de la cascade'], color, 'g7-' + index);
      });
    }
    U.text(ctx, 'Part de la récolte initiale disponible', left, height - 10, { size: 7, color: '#94A3B8', weight: 600 });
  };
})(window);
