/* ============================================================================
 * Mini-visualisations Canvas des cinq cartes KPI FAO.
 * ========================================================================== */
(function (global) {
  'use strict';
  const FAO = global.FAONutriTracker;
  const U = FAO.util;
  FAO.kpiCharts = {};

  function kpi(data, id) { return data.kpis.items.find((item) => item.id === id); }

  FAO.kpiCharts.production = function (ctx, width, height, data, chart, progress) {
    const item = kpi(data, 'production');
    const values = item.mini.mix || [20, 16, 15, 18, 18, 13];
    const colors = ['#059669', '#10B981', '#0891B2', '#D97706', '#7C3AED', '#84CC16'];
    const labels = ['Mil', 'Maïs', 'Riz', 'Sorgho', 'Lég.', 'Fonio'];
    const gap = 5;
    const barWidth = (width - gap * (values.length - 1) - 6) / values.length;
    const baseline = height - 10;
    U.line(ctx, 2, baseline, width - 2, baseline, '#E2E8F0', 1);
    values.forEach((value, index) => {
      const x = 3 + index * (barWidth + gap);
      const barHeight = Math.max(4, (height - 19) * value / 34 * progress);
      U.topBar(ctx, x, baseline - barHeight, barWidth, barHeight, colors[index], 3);
      U.text(ctx, labels[index], x + barWidth / 2, height - 3, { size: 5.8, color: '#94A3B8', align: 'center', weight: 600 });
      U.hitRect(chart, x, baseline - barHeight - 2, barWidth, barHeight + 4, labels[index], [
        'Part du mix céréalier estimée : ' + U.format(value, 0) + ' %',
        'Remontées de production mobile · valeur indicative'
      ], colors[index], 'kpi-prod-' + index);
    });
  };

  function drawGauge(ctx, width, height, value, max, target, color, chart, id, label) {
    const centerX = width / 2;
    const centerY = height + 4;
    const radius = Math.min(29, width * .25, height * .72);
    const start = Math.PI;
    const end = Math.PI * 2;
    const ratio = U.clamp(value / max, 0, 1);
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, start, end); ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, start, start + (end - start) * ratio * chart.progress); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    const angle = start + (end - start) * target / max;
    U.line(ctx, centerX + Math.cos(angle) * (radius - 4), centerY + Math.sin(angle) * (radius - 4), centerX + Math.cos(angle) * (radius + 4), centerY + Math.sin(angle) * (radius + 4), '#334155', 1.2);
    U.text(ctx, label, centerX, height - 7, { size: 7, color: '#64748B', align: 'center', weight: 700 });
    U.hitCircle(chart, centerX, centerY, radius + 3, label, ['Valeur : ' + U.format(value, 1), 'Repère : ' + U.format(target, 1)], color, id);
  }

  FAO.kpiCharts.loss = function (ctx, width, height, data, chart) {
    const item = kpi(data, 'loss');
    drawGauge(ctx, width, height, item.mini.value, 40, item.mini.target, '#DC2626', chart, 'kpi-loss-gauge', 'Jauge de risque · 0–40 %');
  };

  FAO.kpiCharts.hdds = function (ctx, width, height, data, chart) {
    const item = kpi(data, 'hdds');
    drawGauge(ctx, width, height, item.mini.value, 12, item.mini.target, '#D97706', chart, 'kpi-hdds-gauge', 'HDDS · cible 6 groupes');
  };

  FAO.kpiCharts.fortification = function (ctx, width, height, data, chart, progress) {
    const item = kpi(data, 'fortification');
    const coverage = item.mini.coverage.slice(0, 3);
    const labels = ['Sel', 'Farine', 'Huile'];
    const left = 26;
    const right = 22;
    const rowHeight = height / 3;
    coverage.forEach((entry, index) => {
      const y = rowHeight * (index + .5);
      const value = U.clamp(entry.value, 0, 100);
      U.text(ctx, labels[index], left - 4, y, { size: 7, color: '#64748B', align: 'right', weight: 650 });
      U.roundRect(ctx, left, y - 3, Math.max(10, width - left - right), 6, 4);
      ctx.fillStyle = '#F1F5F9'; ctx.fill();
      U.roundedBar(ctx, left, y - 3, (width - left - right) * value / 100 * progress, 6, ['#059669', '#D97706', '#0891B2'][index], 4);
      U.text(ctx, value + '%', width - 1, y, { size: 7, color: '#475569', align: 'right', weight: 700 });
      U.hitRect(chart, left, y - 7, width - left - right, 14, entry.label, ['Couverture terrain : ' + value + ' %', 'Taux de marché simulé'], ['#059669', '#D97706', '#0891B2'][index], 'kpi-fort-' + entry.key);
    });
  };

  FAO.kpiCharts.biodiversity = function (ctx, width, height, data, chart, progress) {
    const item = kpi(data, 'biodiversity');
    const parts = [item.mini.cultivated, item.mini.decline, item.mini.undocumented];
    const colors = ['#7C3AED', '#DC2626', '#E9D5FF'];
    const labels = ['Documentées / cultivées', 'En régression', 'À documenter'];
    const cx = 28;
    const cy = height / 2;
    const radius = Math.min(18, height * .39);
    const lineWidth = 6;
    let angle = -Math.PI / 2;
    parts.forEach((part, index) => {
      const end = angle + Math.PI * 2 * part / 100 * progress;
      ctx.beginPath(); ctx.arc(cx, cy, radius, angle, end); ctx.strokeStyle = colors[index]; ctx.lineWidth = lineWidth; ctx.lineCap = 'butt'; ctx.stroke();
      U.hitCircle(chart, cx + Math.cos((angle + end) / 2) * radius, cy + Math.sin((angle + end) / 2) * radius, 7, labels[index], [part + ' % de la classification de démonstration'], colors[index], 'kpi-bio-' + index);
      angle += Math.PI * 2 * part / 100;
    });
    U.text(ctx, '6,2k', cx, cy, { size: 7, color: '#6D28D9', align: 'center', weight: 800 });
    const x = 57;
    parts.forEach((part, index) => {
      U.circle(ctx, x, 7 + index * 13, 3, colors[index]);
      U.text(ctx, labels[index] + ' · ' + part + '%', x + 8, 7 + index * 13, { size: 6.5, color: '#64748B', weight: 600, maxWidth: Math.max(30, width - x - 12) });
    });
  };
})(window);
