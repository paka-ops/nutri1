/* ============================================================================
 * NutriApp Santé · moh-charts-analytics.js
 * Graphiques 11 à 15 (treemap, multi-line, lollipop, stacked, scorecard).
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = global.MOHNutriApp;
  if (!MOH || !MOH.charts) { console.error('[MOH charts-analytics] dépendances manquantes'); return; }
  const C = MOH.COLORS;

  /* Algorithme Treemap "squarified" simplifié */
  function treemap(items, x, y, w, h) {
    const total = items.reduce((s, it) => s + it.value, 0);
    const out = [];
    let cx = x, cy = y, cw = w, ch = h;
    items.forEach(it => {
      const ratio = it.value / total;
      if (cw >= ch) {
        const iw = cw * ratio;
        out.push({ ...it, x: cx, y: cy, w: iw, h: ch });
        cx += iw; cw -= iw;
      } else {
        const ih = ch * ratio;
        out.push({ ...it, x: cx, y: cy, w: cw, h: ih });
        cy += ih; ch -= ih;
      }
    });
    return out;
  }

  /* =========================================================================
   * Graphique 11 — Treemap comorbidités
   * ========================================================================= */
  MOH.charts.g11 = function (ctx) {
    const data = MOH.COMORBIDITIES;
    const m = this.margins;
    const boxes = treemap(data.slice().sort((a, b) => b.value - a.value), m.l + 2, m.t + 2, this.pw - 4, this.ph - 4);
    const v = this.visible;
    const hover = this.hover;
    boxes.forEach((b, i) => {
      ctx.globalAlpha = v;
      ctx.fillStyle = b.color;
      MOH.roundRect(ctx, b.x, b.y, b.w * v + (1 - v) * 2, b.h, 8); ctx.fill();
      if (hover && hover.i === i) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        MOH.roundRect(ctx, b.x - 2, b.y - 2, b.w + 4, b.h + 4, 10); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (b.w > 50 && b.h > 28) {
        ctx.fillStyle = '#fff'; ctx.font = MOH.font(12, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(b.label, b.x + 10, b.y + 10);
        ctx.font = MOH.font(14, 800); ctx.fillText(b.value + '%', b.x + 10, b.y + 26);
      } else if (b.w > 30 && b.h > 18) {
        ctx.fillStyle = '#fff'; ctx.font = MOH.font(10, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.value + '%', b.x + b.w / 2, b.y + b.h / 2);
      }
    });
    ctx.globalAlpha = 1;
    this.hit = (mx, my) => {
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          return { color: b.color, html: '<b>' + MOH.escape(b.label) + '</b><br>Part des cas : <b>' + b.value + '%</b>' };
        }
      }
      return null;
    };
  };

  /* =========================================================================
   * Graphique 12 — Multi-line chart canaux de dépistage
   * ========================================================================= */
  MOH.charts.g12 = function (ctx) {
    const channels = MOH.CHANNELS;
    const years = MOH.CHANNELS_YEARS;
    const v = this.visible;
    const m = this.margins;
    const yMax = 80;
    const ys = MOH.niceScale(0, yMax, 5);
    this.drawAxes({ min: 0, max: years.length - 1 }, ys, { yFmt: tv => tv + '%' });

    // Labels X
    ctx.fillStyle = C.label; ctx.font = MOH.font(11, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    years.forEach((yr, i) => {
      ctx.fillText(yr, this.gridX(i, 0, years.length - 1), m.t + this.ph + 6);
    });

    const hover = this.hover;
    const hit = [];
    channels.forEach(ch => {
      const pts = ch.data.map((val, i) => ({ x: this.gridX(i, 0, years.length - 1), y: this.gridY(val * v, 0, yMax), val, i }));
      // Aire
      const grad = ctx.createLinearGradient(0, m.t, 0, m.t + this.ph);
      grad.addColorStop(0, MOH.hexA(ch.color, 0.25));
      grad.addColorStop(1, MOH.hexA(ch.color, 0));
      ctx.fillStyle = grad; ctx.beginPath();
      MOH.smoothPath(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, m.t + this.ph);
      ctx.lineTo(pts[0].x, m.t + this.ph); ctx.closePath(); ctx.fill();
      // Ligne
      ctx.strokeStyle = ch.color; ctx.lineWidth = 2.5; ctx.beginPath(); MOH.smoothPath(ctx, pts); ctx.stroke();
      // Points
      pts.forEach((p, i) => {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ch.color; ctx.lineWidth = 2; ctx.stroke();
        hit.push({ ...p, r: 12, color: ch.color, label: ch.label, year: years[i] });
      });
    });

    if (hover) {
      ctx.fillStyle = MOH.hexA(hover.color, 0.18);
      ctx.beginPath(); ctx.arc(hover.x, hover.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hover.color;
      ctx.beginPath(); ctx.arc(hover.x, hover.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hover.x, hover.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    this.hit = (mx, my) => {
      for (const p of hit) {
        const dx = mx - p.x, dy = my - p.y;
        if (dx * dx + dy * dy < p.r * p.r) {
          return { color: p.color, html: '<b>' + MOH.escape(p.label) + '</b><br>' + p.year + ' : <b>' + p.val + '%</b>' };
        }
      }
      return null;
    };

    // Légende
    if (this.host.parentElement) {
      const foot = this.host.parentElement.querySelector('[data-foot]');
      if (foot && !foot.innerHTML) {
        foot.innerHTML = '<div class="moh-legend">' + channels.map(ch => '<span class="moh-legend-item"><span class="moh-legend-dot" style="background:' + ch.color + '"></span>' + ch.label + '</span>').join('') + '</div>';
      }
    }
  };

  /* =========================================================================
   * Graphique 13 — Lollipop chart score composite
   * ========================================================================= */
  MOH.charts.g13 = function (ctx) {
    const data = MOH.LOLLIPOP;
    const v = this.visible;
    const m = this.margins;
    const labelW = 70;
    const left = m.l + labelW;
    const w = this.pw - labelW;
    const xMax = 100;
    const ys = MOH.niceScale(0, xMax, 5);
    // Grille
    ctx.strokeStyle = C.grid; ctx.fillStyle = C.label; ctx.font = MOH.font(10, 500);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ys.ticks.forEach(tv => {
      const x = left + (tv / xMax) * w;
      ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, m.t + this.ph); ctx.stroke();
      ctx.fillText(tv, x, m.t - 2);
    });
    const rowH = this.ph / data.length;
    // Objectif 70
    const goalX = left + (70 / xMax) * w;
    ctx.strokeStyle = C.quaternary; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(goalX, m.t); ctx.lineTo(goalX, m.t + this.ph); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.quaternary; ctx.font = MOH.font(9, 700); ctx.textAlign = 'left';
    ctx.fillText('Objectif 70', goalX + 3, m.t + 10);

    const hit = [];
    const hover = this.hover;
    data.forEach((d, i) => {
      const y = m.t + i * rowH + rowH / 2;
      const xe = left + (d.score / xMax) * w * v;
      const color = d.score >= 70 ? C.tertiary : d.score >= 50 ? C.quaternary : C.danger;
      ctx.strokeStyle = MOH.hexA(color, 0.35); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(xe, y); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(xe, y, hover && hover.i === i ? 8 : 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.value; ctx.font = MOH.font(10, 500); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(d.label, left - 6, y);
      ctx.fillStyle = color; ctx.font = MOH.font(10, 700); ctx.textAlign = 'left';
      ctx.fillText(d.score, xe + 8, y);
      hit.push({ x: left - 10, y: y - rowH / 2, w: w + 20, h: rowH, i, label: d.label, score: d.score, color });
    });
    this.hit = (mx, my) => {
      for (const h of hit) {
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          return { color: h.color, html: '<b>' + MOH.escape(h.label) + '</b><br>Score composite : <b>' + h.score + '/100</b>' };
        }
      }
      return null;
    };
  };

  /* =========================================================================
   * Graphique 14 — Stacked 100% profils nutritionnels
   * ========================================================================= */
  MOH.charts.g14 = function (ctx) {
    const data = MOH.PROFILES;
    const v = this.visible;
    const m = this.margins;
    const labelW = 70;
    const left = m.l + labelW;
    const w = this.pw - labelW;
    const bw = Math.min(30, (this.ph / data.length) * 0.6);
    const cats = [
      { key: 'mas',      label: 'MAS',      color: C.danger },
      { key: 'mam',      label: 'MAM',      color: '#F97316' },
      { key: 'risque',   label: 'Risque',   color: C.quaternary },
      { key: 'normal',   label: 'Normal',   color: C.tertiary },
      { key: 'surpoids', label: 'Surpoids', color: '#8B5CF6' },
      { key: 'obesite',  label: 'Obésité',  color: C.primary }
    ];
    const hit = [];
    data.forEach((d, i) => {
      const y = m.t + i * (this.ph / data.length) + 6;
      const bh = bw;
      let cx = left;
      const tot = cats.reduce((s, c) => s + d[c.key], 0);
      cats.forEach(c => {
        const cw = (d[c.key] / tot) * w * v;
        ctx.fillStyle = c.color;
        if (c.key === 'mas') {
          MOH.roundRight(ctx, cx, y, 0, bh, 0); /* reset */
          ctx.fillRect(cx, y, cw, bh);
        } else {
          ctx.fillRect(cx, y, cw, bh);
        }
        hit.push({ x: cx, y, w: cw, h: bh, label: c.label, val: d[c.key], color: c.color, zone: d.zone });
        cx += cw;
      });
      ctx.fillStyle = C.value; ctx.font = MOH.font(10, 500); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(d.zone, left - 6, y + bh / 2);
    });

    // Légende
    if (this.host.parentElement) {
      const foot = this.host.parentElement.querySelector('[data-foot]');
      if (foot && !foot.innerHTML) {
        foot.innerHTML = '<div class="moh-legend">' + cats.map(c => '<span class="moh-legend-item"><span class="moh-legend-dot" style="background:' + c.color + '"></span>' + c.label + '</span>').join('') + '</div>';
      }
    }
    this.hit = (mx, my) => {
      for (const h of hit) {
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          return { color: h.color, html: '<b>' + MOH.escape(h.zone) + '</b><br>' + MOH.escape(h.label) + ' : <b>' + h.val + '%</b>' };
        }
      }
      return null;
    };
  };

  /* =========================================================================
   * Graphique 15 — Scorecard tableau (rendu HTML avec sparklines canvas)
   * Rendu principal : HTML table injectée + sparklines dans <td>.
   * ========================================================================= */
  MOH.charts.g15 = null; // Pas de canvas principal — rendu côté dashboard

  /* =========================================================================
   * Sparkline (petite courbe) pour le tableau
   * ========================================================================= */
  MOH.drawSparkline = function (canvas, color) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    const rng = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    const r = rng(color.charCodeAt(1) + 31);
    const pts = [];
    let cur = 0.4 + r() * 0.2;
    for (let i = 0; i < 12; i++) { cur += (r() - 0.45) * 0.15; cur = Math.max(0.1, Math.min(0.9, cur)); pts.push(cur); }
    const pathPts = pts.map((val, j) => ({ x: (j / 11) * w, y: h - val * (h - 4) - 2 }));
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, MOH.hexA(color, 0.4));
    grad.addColorStop(1, MOH.hexA(color, 0));
    ctx.fillStyle = grad; ctx.beginPath();
    MOH.smoothPath(ctx, pathPts);
    ctx.lineTo(pathPts[pathPts.length - 1].x, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); MOH.smoothPath(ctx, pathPts); ctx.stroke();
    const last = pathPts[pathPts.length - 1];
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2); ctx.fill();
  };
})(window);
