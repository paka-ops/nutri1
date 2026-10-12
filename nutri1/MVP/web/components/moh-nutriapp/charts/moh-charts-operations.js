/* ============================================================================
 * NutriApp Santé · moh-charts-operations.js
 * Graphiques 6 à 10.
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = global.MOHNutriApp;
  if (!MOH || !MOH.charts) { console.error('[MOH charts-ops] dépendances manquantes'); return; }
  const C = MOH.COLORS;

  /* =========================================================================
   * Graphique 6 — Anémie vs suppléments (grouped bar + line)
   * ========================================================================= */
  MOH.charts.g6 = function (ctx) {
    const state = this._state;
    const groups = state.mode === 'region'
      ? [ { label: 'Femmes enceintes', v: 0.62, color: C.primary },
          { label: 'Enfants <5 ans',  v: 0.71, color: C.danger },
          { label: 'Femmes non-enc.', v: 0.54, color: C.quaternary } ]
      : [ { label: 'Femmes enceintes', v: state.country.anemieF || 0.55, color: C.primary },
          { label: 'Enfants <5 ans',  v: state.country.anemieE || 0.65, color: C.danger },
          { label: 'Femmes non-enc.', v: state.country.anemieF ? state.country.anemieF - 0.08 : 0.48, color: C.quaternary } ];
    const couverture = state.mode === 'region' ? 0.58 : (state.country.cpn ? state.country.cpn + 0.18 : 0.55);

    const v = this.visible;
    const m = this.margins;
    const ys = MOH.niceScale(0, 1, 5);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.label; ctx.font = MOH.font(11, 500);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ys.ticks.forEach(tv => {
      const y = this.gridY(tv, 0, 1);
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(m.l + this.pw, y); ctx.stroke();
      ctx.fillText(Math.round(tv * 100) + '%', m.l - 6, y);
    });
    ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(m.l, m.t + this.ph); ctx.lineTo(m.l + this.pw, m.t + this.ph); ctx.stroke();

    const n = groups.length;
    const groupW = this.pw / n;
    const barW = 40;
    groups.forEach((g, i) => {
      const cx = m.l + i * groupW + groupW / 2;
      const bx = cx - barW / 2;
      const h = (g.v * v) * this.ph;
      ctx.fillStyle = g.color;
      MOH.roundTop(ctx, bx, m.t + this.ph - h, barW, h, 6); ctx.fill();
      // Valeur
      ctx.fillStyle = g.color; ctx.font = MOH.font(12, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(Math.round(g.v * 100) + '%', cx, m.t + this.ph - h - 6);
      // Label
      ctx.fillStyle = C.value; ctx.font = MOH.font(11, 500); ctx.textBaseline = 'top';
      ctx.fillText(g.label, cx, m.t + this.ph + 6);
    });

    // Ligne couverture (pointillé vert)
    const ly = this.gridY(couverture * v, 0, 1);
    ctx.strokeStyle = C.tertiary; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(m.l, ly); ctx.lineTo(m.l + this.pw, ly); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.tertiary; ctx.font = MOH.font(10, 600); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('● Couverture suppléments Fer/Af : ' + Math.round(couverture * 100) + '%', m.l + this.pw, ly - 4);

    this.hit = null;
  };

  /* =========================================================================
   * Graphique 7 — Calendar Heatmap synchro 52 semaines × districts
   * ========================================================================= */
  MOH.charts.g7 = function (ctx) {
    const data = MOH.SYNC_HEATMAP; // 52 × 12
    const m = this.margins;
    const labelW = 50; // espace pour label des mois
    const gridLeft = m.l;
    const headerH = 16;
    const top = m.t + headerH;
    const gridTop = top;
    const gridW = this.pw - labelW;
    const cellW = gridW / data.length;
    const cellH = (this.ph - headerH) / data[0].length;
    const v = this.visible;
    const hover = this.hover;

    // Mois (en-tête)
    const mois = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    ctx.fillStyle = C.label; ctx.font = MOH.font(9, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    mois.forEach((mm, i) => {
      ctx.fillText(mm, gridLeft + (i * 4.33 + 2) * cellW, top - 2);
    });

    const hit = [];
    data.forEach((row, wi) => {
      row.forEach((val, di) => {
        const x = gridLeft + wi * cellW + 1;
        const y = gridTop + di * cellH + 1;
        const w = cellW - 2, h = cellH - 2;
        const color = MOH.scaleColor(MOH.HEATMAP_STOPS, val * v);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        if (hover && hover.wi === wi && hover.di === di) {
          ctx.strokeStyle = C.primary; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
        }
        hit.push({ x, y, w, h, wi, di, val });
      });
    });

    this.hit = (mx, my) => {
      for (const h of hit) {
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          return { color: C.primary, html: '<b>Semaine ' + (h.wi + 1) + '</b><br>District ' + (h.di + 1) + '<br>Synchro : <b>' + Math.round(h.val * 100) + '%</b>' };
        }
      }
      return null;
    };

    // Légende dégradée
    const lgW = 100, lgH = 8;
    const lgX = m.l + this.pw - lgW, lgY = this.h - 8;
    const grad = ctx.createLinearGradient(lgX, 0, lgX + lgW, 0);
    grad.addColorStop(0, '#EF4444'); grad.addColorStop(0.4, '#F59E0B'); grad.addColorStop(1, '#10B981');
    ctx.fillStyle = grad; ctx.fillRect(lgX, lgY, lgW, lgH);
    ctx.fillStyle = C.label; ctx.font = MOH.font(9, 500); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('<40%', lgX, lgY + lgH + 1); ctx.textAlign = 'right';
    ctx.fillText('100%', lgX + lgW, lgY + lgH + 1);
  };

  /* =========================================================================
   * Graphique 8 — Dumbbell santé maternelle 2015 vs 2024
   * ========================================================================= */
  MOH.charts.g8 = function (ctx) {
    const data = MOH.DUMBBELL;
    const v = this.visible;
    const m = this.margins;
    const leftLabelW = 110;
    const chartLeft = m.l + leftLabelW;
    const chartW = this.w - chartLeft - m.r;
    const ys = MOH.niceScale(0, 70, 5);
    // Grille
    ctx.strokeStyle = C.grid; ctx.fillStyle = C.label; ctx.font = MOH.font(10, 500);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ys.ticks.forEach(tv => {
      const x = chartLeft + (tv / ys.max) * chartW;
      ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, m.t + this.ph); ctx.stroke();
      ctx.fillStyle = C.label; ctx.fillText(tv + '%', x, m.t - 6);
    });
    ctx.textAlign = 'left';
    const rowH = this.ph / data.length;
    const hit = [];
    data.forEach((d, i) => {
      const y = m.t + i * rowH + rowH / 2;
      // Label
      ctx.fillStyle = C.value; ctx.font = MOH.font(11, 500); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(d.label, chartLeft - 10, y);
      const x15 = chartLeft + (d.v2015 / ys.max) * chartW * v;
      const x24 = chartLeft + (d.v2024 / ys.max) * chartW * v;
      const lineCol = d.worse ? C.danger : C.tertiary;
      ctx.strokeStyle = MOH.hexA(lineCol, 0.4); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x15, y); ctx.lineTo(x24, y); ctx.stroke();
      // Point 2015
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath(); ctx.arc(x15, y, 6, 0, Math.PI * 2); ctx.fill();
      // Point 2024
      ctx.fillStyle = lineCol;
      ctx.beginPath(); ctx.arc(x24, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      // Valeur
      ctx.fillStyle = lineCol; ctx.font = MOH.font(10, 700); ctx.textAlign = 'left';
      ctx.fillText(d.v2024 + '%', x24 + 10, y);
      hit.push({ x: Math.min(x15, x24) - 10, y: y - rowH / 2, w: Math.abs(x24 - x15) + 20, h: rowH, label: d.label, v15: d.v2015, v24: d.v2024, worse: d.worse });
    });
    this.hit = (mx, my) => {
      for (const h of hit) {
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          return { color: h.worse ? C.danger : C.tertiary, html: '<b>' + MOH.escape(h.label) + '</b><br>2015 : <b>' + h.v15 + '%</b><br>2024 : <b>' + h.v24 + '%</b> ' + (h.worse ? '▲ dégradation' : '▼ amélioration') };
        }
      }
      return null;
    };

    // Légende
    if (this.host.parentElement) {
      const foot = this.host.parentElement.querySelector('[data-foot]');
      if (foot && !foot.innerHTML) {
        foot.innerHTML = '<div class="moh-legend"><span class="moh-legend-item"><span class="moh-legend-dot" style="background:#94A3B8"></span>2015</span><span class="moh-legend-item"><span class="moh-legend-dot" style="background:#7C3AED"></span>2024</span><span class="moh-legend-item" style="color:#EF4444">● Dégradation</span><span class="moh-legend-item" style="color:#10B981">● Amélioration</span></div>';
      }
    }
  };

  /* =========================================================================
   * Graphique 9 — Funnel CPN
   * ========================================================================= */
  MOH.charts.g9 = function (ctx) {
    const data = MOH.FUNNEL;
    const v = this.visible;
    const m = this.margins;
    const maxW = this.pw * 0.95;
    const rowH = this.ph / data.length;
    const centerX = m.l + this.pw / 2;
    const hover = this.hover;

    data.forEach((d, i) => {
      const w = (d.pct / 100) * maxW * v;
      const y = m.t + i * rowH + 6;
      const h = rowH - 12;
      const x = centerX - w / 2;
      // Ombre d'accent si point de gap
      ctx.fillStyle = d.color;
      MOH.roundRect(ctx, x, y, w, h, 6); ctx.fill();
      if (hover && hover.i === i) {
        ctx.strokeStyle = C.primary; ctx.lineWidth = 2;
        MOH.roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 8); ctx.stroke();
      }
      // Texte
      ctx.fillStyle = '#fff'; ctx.font = MOH.font(11, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.label + ' · ' + d.pct + '%', centerX, y + h / 2);
    });

    // Gap highlight : entre "Dépistées 41%" et "Positives 17%"
    const gapY = m.t + 1 * rowH + rowH / 2;
    ctx.strokeStyle = C.quaternary; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(m.l + 10, gapY + 14); ctx.lineTo(m.l + this.pw - 10, gapY + 14); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.quaternary; ctx.font = MOH.font(10, 600); ctx.textAlign = 'center';
    ctx.fillText('▲ 24 pts de gap de dépistage non pris en charge', centerX, gapY + 26);

    this.hit = (mx, my) => {
      for (let i = 0; i < data.length; i++) {
        const w = (data[i].pct / 100) * maxW * v;
        const x = centerX - w / 2;
        const y = m.t + i * rowH + 6;
        const h = rowH - 12;
        if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
          return { color: data[i].color, html: '<b>' + MOH.escape(data[i].label) + '</b><br>Conversion : <b>' + data[i].pct + '%</b>' };
        }
      }
      return null;
    };
  };

  /* =========================================================================
   * Graphique 10 — Small multiples (6 sparklines area)
   * ========================================================================= */
  MOH.charts.g10 = function (ctx) {
    const metrics = MOH.SMALL_MULTIPLES;
    const v = this.visible;
    const m = this.margins;
    const cols = 3, rows = 2;
    const gw = this.pw / cols, gh = this.ph / rows;
    const pad = 10;
    metrics.forEach((m_, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x0 = m.l + col * gw + pad;
      const y0 = m.t + row * gh + pad;
      const w = gw - pad * 2;
      const h = gh - pad * 2 - 12;

      // Titre
      ctx.fillStyle = C.value; ctx.font = MOH.font(11, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(m_.label, x0, y0);
      // Badge
      ctx.fillStyle = m_.up ? '#ECFDF5' : '#FEF2F2';
      const badgeTxt = m_.trend;
      ctx.font = MOH.font(9, 700);
      const bw2 = ctx.measureText(badgeTxt).width + 10;
      MOH.roundRect(ctx, x0 + w - bw2, y0, bw2, 14, 7); ctx.fill();
      ctx.fillStyle = m_.up ? '#047857' : '#B91C1C'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(badgeTxt, x0 + w - bw2 / 2, y0 + 7);

      // Mini area chart (12 points aléatoires mais cohérents)
      const rng = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
      const r = rng(i * 7 + 13);
      const pts = [];
      let cur = 0.55 + r() * 0.1;
      for (let j = 0; j < 12; j++) {
        cur += (r() - 0.48) * 0.12;
        cur = Math.max(0.15, Math.min(0.95, cur));
        pts.push(cur);
      }
      const chartTop = y0 + 18;
      const chartH = h - 22;
      const pathPts = pts.map((val, j) => ({ x: x0 + (j / 11) * w, y: chartTop + chartH - val * chartH * v }));
      const grad = ctx.createLinearGradient(0, chartTop, 0, chartTop + chartH);
      grad.addColorStop(0, MOH.hexA(m_.color, 0.45));
      grad.addColorStop(1, MOH.hexA(m_.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      MOH.smoothPath(ctx, pathPts);
      ctx.lineTo(pathPts[pathPts.length - 1].x, chartTop + chartH);
      ctx.lineTo(pathPts[0].x, chartTop + chartH);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = m_.color; ctx.lineWidth = 2;
      ctx.beginPath(); MOH.smoothPath(ctx, pathPts); ctx.stroke();
      // Dernier point
      const last = pathPts[pathPts.length - 1];
      ctx.fillStyle = m_.color; ctx.beginPath(); ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2); ctx.fill();
    });
    this.hit = null;
  };
})(window);
