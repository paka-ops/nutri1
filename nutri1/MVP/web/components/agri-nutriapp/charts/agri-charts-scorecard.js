/* =====================================================================
 * AgriNutri · Scorecard synthétique Agriculture-Nutrition (G15)
 * ---------------------------------------------------------------------
 * Tableau HTML stylé dont chaque ligne contient une mini-sparkline Canvas
 * (tendance sur 8 points), un indicateur de statut et une barre de progression
 * vers la cible. Les sparklines sont recréées à chaque mise à jour pour
 * libérer proprement leurs observateurs.
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AgriCore;
  const C = AC.C;
  window.AgriCharts = window.AgriCharts || {};

  const STATUS = {
    good: { label: 'Atteint', color: '#16A34A', bg: '#DCFCE7' },
    warn: { label: 'En progrès', color: '#B45309', bg: '#FEF3C7' },
    bad: { label: 'Critique', color: '#DC2626', bg: '#FEE2E2' }
  };

  /* Sparkline : courbe lissée, aire dégradée, point final mis en évidence */
  function sparkline(canvas, values, color) {
    return AC.create(canvas, {
      height: 36,
      render: function (g, L, p) {
        const pad = 4;
        const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
        const xS = function (i) { return pad + i / (values.length - 1) * (L.w - pad * 2); };
        const yS = AC.linear(min, max || min + 1, L.h - pad, pad);
        const pts = values.map(function (v, i) { return { x: xS(i), y: L.h - (L.h - yS(v)) * p - (1 - p) * 0 }; });
        const grad = g.createLinearGradient(0, 0, 0, L.h);
        grad.addColorStop(0, color + '33');
        grad.addColorStop(1, color + '00');
        g.beginPath();
        AC.smoothPath(g, pts, 0.5);
        g.lineTo(xS(values.length - 1), L.h);
        g.lineTo(xS(0), L.h);
        g.closePath();
        g.fillStyle = grad;
        g.fill();
        g.beginPath();
        AC.smoothPath(g, pts, 0.5);
        g.strokeStyle = color;
        g.lineWidth = 2;
        g.stroke();
        const last = pts[pts.length - 1];
        g.beginPath();
        g.arc(last.x, last.y, 3, 0, Math.PI * 2);
        g.fillStyle = color;
        g.fill();
      }
    });
  }

  /* Rendu du tableau dans `container` ; retourne les instances de sparklines à disposer */
  window.AgriCharts.renderScorecard = function (container, rows, previous) {
    (previous || []).forEach(function (c) { c.dispose(); });
    const charts = [];
    const score = Math.round(rows.reduce(function (a, r) {
      const pr = r.good === 'up' ? r.current / r.target : r.target / r.current;
      return a + Math.min(1, pr);
    }, 0) / rows.length * 100);
    const html = [
      '<div class="sc-head"><div><div class="sc-score">' + score + '<span>/100</span></div>',
      '<div class="sc-sub">Indice global agriculture-nutrition (moyenne des cibles atteintes)</div></div>',
      '<div class="sc-legend"><span class="sc-dot" style="background:#16A34A"></span>Atteint',
      '<span class="sc-dot" style="background:#B45309"></span>En progrès',
      '<span class="sc-dot" style="background:#DC2626"></span>Critique</div></div>',
      '<div class="sc-wrap"><table class="sc-table"><thead><tr>',
      '<th>Indicateur</th><th>Valeur</th><th>Cible</th><th>Tendance 8 ans</th><th>Progression</th><th>Statut</th>',
      '</tr></thead><tbody>'
    ];
    rows.forEach(function (r, i) {
      const pr = Math.max(0, Math.min(1, r.good === 'up' ? r.current / r.target : r.target / r.current));
      const st = STATUS[r.status];
      html.push(
        '<tr><td class="sc-label">' + r.label + '</td>',
        '<td class="sc-val">' + AC.fmt(r.current, r.unit === '%' || r.unit === 'FCFA' ? 0 : 1) + (r.unit ? ' ' + r.unit : '') + '</td>',
        '<td class="sc-tgt">' + AC.fmt(r.target, 0) + (r.unit === '%' ? ' %' : '') + '</td>',
        '<td class="sc-spark"><canvas data-idx="' + i + '"></canvas></td>',
        '<td class="sc-prog"><div class="sc-bar"><i style="width:' + Math.round(pr * 100) + '%;background:' + st.color + '"></i></div><span>' + Math.round(pr * 100) + ' %</span></td>',
        '<td><span class="sc-status" style="color:' + st.color + ';background:' + st.bg + '">' + st.label + '</span></td></tr>'
      );
    });
    html.push('</tbody></table></div>');
    container.innerHTML = html.join('');
    container.querySelectorAll('canvas[data-idx]').forEach(function (cv) {
      const i = Number(cv.getAttribute('data-idx'));
      const r = rows[i];
      const color = STATUS[r.status].color;
      charts.push(sparkline(cv, r.trend, color));
    });
    return charts;
  };
})();
