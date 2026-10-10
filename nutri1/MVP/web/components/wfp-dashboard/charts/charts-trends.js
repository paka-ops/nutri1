/* ============================================================================
 * WFP NutriTracker · charts/charts-trends.js
 * Graphiques de TENDANCE et de MARCHE (Canvas pur) :
 *   2. Evolution du score FCS 2020-2024 (multi-lignes)   -> FcsLinesChart
 *   3. Heatmap temporelle des prix (8 produits x 24 mois) -> PriceHeatChart
 *   9. Prix des 5 cereales (aires degradees, 20 trimestres) -> CerealsChart
 *  12. Dumbbell FCS 2020 vs 2024 par zone                -> DumbbellChart
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP;
  const C = WFP.C, G = WFP.G;

  /* ---------------------------------------------------------------------
   * Utilitaires partages : echelle "jolie" et projection lineaire
   * ------------------------------------------------------------------- */
  function niceRange(min, max, step) {
    return { lo: Math.floor(min / step) * step, hi: Math.ceil(max / step) * step };
  }

  /* ---------------------------------------------------------------------
   * 2. FCS MULTI-LIGNES : courbes lissees, zone de crise, seuil 42
   * ------------------------------------------------------------------- */
  class FcsLinesChart extends WFP.BaseChart {
    legendItems() {
      return this.data.series.map(s => ({ key: s.key, label: s.label, color: s.color }));
    }

    draw(ctx, w, h, p) {
      const d = this.data;
      const L = { x0: 40, x1: w - 14, y0: 14, y1: h - 30 };
      const pw = L.x1 - L.x0, ph = L.y1 - L.y0;
      const n = d.labels.length;
      const vis = d.series.filter(s => !this.hidden[s.key]);
      const all = vis.flatMap(s => s.values).concat([d.threshold]);
      const r = niceRange(Math.min(...all), Math.max(...all), 5);
      const lo = Math.max(0, r.lo - 2), hi = r.hi + 2;
      const xOf = i => L.x0 + pw * i / (n - 1);
      const yOf = v => L.y1 - ph * (v - lo) / (hi - lo);
      this.geom = { L, n, xOf, pw };

      // Grille et axes
      const ticks = [];
      for (let v = Math.ceil(lo / 5) * 5; v <= hi; v += 5) ticks.push({ y: yOf(v), label: v });
      G.yGrid(ctx, L.x0, L.x1, L.y0, L.y1, ticks);

      // Zone de crise (aire surlignee), dessinee avant les courbes
      const cr = d.crisis;
      ctx.fillStyle = WFP.hexA(C.primary, 0.09 * p);
      ctx.fillRect(xOf(cr.from), L.y0, xOf(cr.to) - xOf(cr.from), ph);
      // Libelle ancre a droite de la zone de crise (evite le depassement du canvas)
      G.text(ctx, 'Crise alimentaire / inflation marchés', xOf(cr.to) - 6, L.y0 + 9, {
        align: 'right', font: '700 10px Inter, sans-serif', color: WFP.hexA('#B45309', p)
      });

      // Libelles de l'axe X (quelques graduations)
      const every = n > 30 ? 12 : n > 12 ? 6 : 2;
      for (let i = 0; i < n; i += every) {
        G.text(ctx, d.labels[i], xOf(i), L.y1 + 12, { align: 'center', font: '500 11px Inter, sans-serif', color: C.light });
      }

      // Seuil FCS acceptable (pointille rouge)
      ctx.save();
      ctx.setLineDash([6, 5]); ctx.strokeStyle = WFP.hexA(C.urgent, 0.85); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(L.x0, yOf(d.threshold)); ctx.lineTo(L.x1, yOf(d.threshold)); ctx.stroke();
      ctx.restore();
      G.text(ctx, 'Seuil FCS Acceptable : ' + d.threshold, L.x1 - 4, yOf(d.threshold) - 8, {
        align: 'right', font: '700 10px Inter, sans-serif', color: C.urgent
      });

      // Courbes : balayage de gauche a droite via clip (animation d'entree)
      ctx.save();
      ctx.beginPath(); ctx.rect(L.x0 - 2, 0, (pw + 4) * p, h); ctx.clip();
      vis.forEach(s => {
        const pts = s.values.map((v, i) => [xOf(i), yOf(v)]);
        if (s.width >= 2 && !s.dash) {
          // aire en degrade couleur -> transparent
          ctx.beginPath(); G.smooth(ctx, pts, 0.5);
          ctx.lineTo(xOf(n - 1), L.y1); ctx.lineTo(xOf(0), L.y1); ctx.closePath();
          const g = ctx.createLinearGradient(0, L.y0, 0, L.y1);
          g.addColorStop(0, WFP.hexA(s.color, 0.16)); g.addColorStop(1, WFP.hexA(s.color, 0));
          ctx.fillStyle = g; ctx.fill();
        }
        ctx.beginPath(); G.smooth(ctx, pts, 0.5);
        ctx.setLineDash(s.dash || []);
        ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.restore();

      // Survol : guide vertical + points (5px) avec halo (12px)
      const hi_ = this.hover && p > 0.98 ? this.hover.i : -1;
      if (hi_ >= 0) {
        const x = xOf(hi_);
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, L.y0); ctx.lineTo(x, L.y1); ctx.stroke();
        vis.forEach(s => {
          const y = yOf(s.values[hi_]);
          ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = WFP.hexA(s.color, 0.2); ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.strokeStyle = s.color; ctx.lineWidth = 2;
          ctx.fill(); ctx.stroke();
        });
      }
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.L.x0 - 10 || x > g.L.x1 + 10 || y < g.L.y0 || y > g.L.y1 + 20) return null;
      const i = Math.round((x - g.L.x0) / g.pw * (g.n - 1));
      return (i >= 0 && i < g.n) ? { key: 't' + i, i } : null;
    }

    tooltip(hit) {
      const d = this.data;
      const rows = d.series.filter(s => !this.hidden[s.key]).map(s => [s.label, WFP.fmt.num(s.values[hit.i], 1), s.color]);
      rows.push(['Seuil acceptable', String(d.threshold), C.urgent]);
      return WFP.tip(d.labels[hit.i], rows, 'Score FCS moyen · app mVAM');
    }

    tipColor(hit) { return C.primary; }
  }

  /* ---------------------------------------------------------------------
   * 3. HEATMAP PRIX : ecart au prix normal, prix FCFA/kg dans chaque cellule
   * ------------------------------------------------------------------- */
  // Echelle de couleur : <0,8 vert -> 1,0 neutre -> 1,5 ambre -> 2,0 rouge -> famine
  const HEAT_STOPS = [
    [0.8, [16, 185, 129]], [1.0, [254, 243, 199]], [1.5, [245, 158, 11]], [2.0, [239, 68, 68]], [2.6, [127, 29, 29]]
  ];
  function heatColor(v) {
    if (v <= HEAT_STOPS[0][0]) return WFP.hexA('#10B981', 1);
    for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
      const [a, ca] = HEAT_STOPS[i], [b, cb] = HEAT_STOPS[i + 1];
      if (v <= b) {
        const t = (v - a) / (b - a);
        const c = ca.map((x, k) => Math.round(WFP.lerp(x, cb[k], t)));
        return 'rgb(' + c.join(',') + ')';
      }
    }
    return 'rgb(127,29,29)';
  }

  class PriceHeatChart extends WFP.BaseChart {
    draw(ctx, w, h, p) {
      const d = this.data;
      const rows = d.rows.length, cols = d.cols.length;
      const x0 = 84, y0 = 20, yb = 30;
      const cw = (w - x0 - 4) / cols, ch = (h - y0 - yb) / rows;
      this.geom = { x0, y0, cw, ch, rows, cols };

      // Libelles de colonnes (tous les 3 mois) et de lignes (produits)
      for (let c = 0; c < cols; c += 3) {
        G.text(ctx, d.cols[c], x0 + cw * (c + 0.5), y0 - 9, { align: 'center', font: '600 10px Inter, sans-serif', color: C.light });
      }
      d.rows.forEach((name, r) => {
        G.text(ctx, name, x0 - 10, y0 + ch * (r + 0.5), { align: 'right', font: '600 11px Inter, sans-serif', color: C.ink2 });
      });

      // Cellules : apparition en vague (colonne par colonne)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = d.values[r][c];
          const a = WFP.clamp(p * 1.5 - c / cols * 0.5, 0, 1);
          if (a <= 0) continue;
          const x = x0 + cw * c + 1.5, y = y0 + ch * r + 1.5;
          const cwIn = cw - 3, chIn = ch - 3;
          ctx.globalAlpha = a;
          ctx.fillStyle = heatColor(v);
          G.rrect(ctx, x, y, cwIn, chIn, 4); ctx.fill();
          // Prix FCFA/kg dans la cellule (si la cellule est assez grande)
          if (cwIn > 26 && chIn > 12) {
            const dark = v > 1.45;
            G.text(ctx, String(d.prices[r][c]), x + cwIn / 2, y + chIn / 2, {
              align: 'center', font: '600 10px Inter, sans-serif', color: dark ? '#FFFFFF' : C.ink2
            });
          }
          ctx.globalAlpha = 1;
          if (this.hover && this.hover.r === r && this.hover.c === c) {
            ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
            G.rrect(ctx, x, y, cwIn, chIn, 4); ctx.stroke();
          }
        }
      }

      // Legende : barre de degrade + graduations
      const lx0 = x0, lx1 = w - 6, ly = h - 14;
      const grad = ctx.createLinearGradient(lx0, 0, lx1, 0);
      HEAT_STOPS.forEach(([v, c]) => grad.addColorStop(WFP.clamp((v - 0.6) / 2.0, 0, 1), 'rgb(' + c.join(',') + ')'));
      ctx.fillStyle = grad; G.rrect(ctx, lx0, ly, lx1 - lx0, 6, 3); ctx.fill();
      [[0.8, '< 0,8'], [1.0, '1,0'], [1.5, '1,5'], [2.0, '2,0'], [2.6, '> 2,0']].forEach(([v, t]) => {
        const x = lx0 + (lx1 - lx0) * WFP.clamp((v - 0.6) / 2.0, 0, 1);
        G.text(ctx, t, x, ly + 16, { align: v === 2.6 ? 'right' : 'center', font: '500 10px Inter, sans-serif', color: C.light });
      });
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.x0 || y < g.y0) return null;
      const c = Math.floor((x - g.x0) / g.cw), r = Math.floor((y - g.y0) / g.ch);
      if (c < 0 || c >= g.cols || r < 0 || r >= g.rows) return null;
      return { key: 'h' + r + '-' + c, r, c };
    }

    tooltip(hit) {
      const d = this.data, v = d.values[hit.r][hit.c], price = d.prices[hit.r][hit.c];
      const ecart = Math.round((v - 1) * 100);
      return WFP.tip(d.rows[hit.r] + ' · ' + d.cols[hit.c], [
        ['Prix relevé', price + ' FCFA/kg'],
        ['Prix normal', d.normal[hit.r] + ' FCFA/kg'],
        ['Écart au normal', 'x' + WFP.fmt.num(v, 2) + ' (' + (ecart >= 0 ? '+' : '') + ecart + ' %)', heatColor(v)]
      ], 'Relevés agents terrain (app)');
    }

    tipColor(hit) { return heatColor(this.data.values[hit.r][hit.c]); }
  }

  /* ---------------------------------------------------------------------
   * 9. CINQ CEREALES : aires degradees multi-lignes
   * ------------------------------------------------------------------- */
  class CerealsChart extends WFP.BaseChart {
    legendItems() {
      return this.data.series.map(s => ({ key: s.key, label: s.label, color: s.color }));
    }

    draw(ctx, w, h, p) {
      const d = this.data;
      const L = { x0: 50, x1: w - 14, y0: 14, y1: h - 30 };
      const pw = L.x1 - L.x0, ph = L.y1 - L.y0;
      const n = d.labels.length;
      const vis = d.series.filter(s => !this.hidden[s.key]);
      const all = vis.flatMap(s => s.values);
      const r = niceRange(Math.min(...all) * 0.92, Math.max(...all) * 1.04, 50);
      const xOf = i => L.x0 + pw * i / (n - 1);
      const yOf = v => L.y1 - ph * (v - r.lo) / (r.hi - r.lo);
      this.geom = { L, n, xOf, pw };

      const ticks = [];
      for (let v = r.lo; v <= r.hi; v += (r.hi - r.lo) / 4) ticks.push({ y: yOf(v), label: Math.round(v) });
      G.yGrid(ctx, L.x0, L.x1, L.y0, L.y1, ticks);
      const every = n > 30 ? 12 : 4;
      for (let i = 0; i < n; i += every) G.text(ctx, d.labels[i], xOf(i), L.y1 + 12, { align: 'center', font: '500 11px Inter, sans-serif', color: C.light });

      ctx.save();
      ctx.beginPath(); ctx.rect(L.x0 - 2, 0, (pw + 4) * p, h); ctx.clip();
      vis.forEach(s => {
        const pts = s.values.map((v, i) => [xOf(i), yOf(v)]);
        // Aire : gradient couleur -> transparent
        ctx.beginPath(); G.smooth(ctx, pts, 0.5);
        ctx.lineTo(xOf(n - 1), L.y1); ctx.lineTo(xOf(0), L.y1); ctx.closePath();
        const g = ctx.createLinearGradient(0, L.y0, 0, L.y1);
        g.addColorStop(0, WFP.hexA(s.color, 0.28)); g.addColorStop(1, WFP.hexA(s.color, 0.02));
        ctx.fillStyle = g; ctx.fill();
        // Trait
        ctx.beginPath(); G.smooth(ctx, pts, 0.5);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
      });
      ctx.restore();

      if (this.hover && p > 0.98) {
        const x = xOf(this.hover.i);
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, L.y0); ctx.lineTo(x, L.y1); ctx.stroke();
        vis.forEach(s => {
          const y = yOf(s.values[this.hover.i]);
          ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = WFP.hexA(s.color, 0.2); ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = s.color; ctx.fill();
        });
      }
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.L.x0 - 10 || x > g.L.x1 + 10 || y < g.L.y0 || y > g.L.y1 + 20) return null;
      const i = Math.round((x - g.L.x0) / g.pw * (g.n - 1));
      return (i >= 0 && i < g.n) ? { key: 'k' + i, i } : null;
    }

    tooltip(hit) {
      const d = this.data;
      const rows = d.series.filter(s => !this.hidden[s.key]).map(s => [s.label, WFP.fmt.num(s.values[hit.i], 0) + ' FCFA/kg', s.color]);
      return WFP.tip(d.labels[hit.i], rows, 'Prix moyen collecté sur les marchés (app)');
    }

    tipColor() { return C.primary; }
  }

  /* ---------------------------------------------------------------------
   * 12. DUMBBELL : FCS 2020 (gris) -> 2024 (ambre si amelioration, rouge sinon)
   *     Trait vert si amelioration, rouge si degradation.
   * ------------------------------------------------------------------- */
  class DumbbellChart extends WFP.BaseChart {
    legendItems() {
      return [
        { key: 'a', label: 'FCS 2020', color: C.light },
        { key: 'up', label: 'Amélioration', color: C.available },
        { key: 'down', label: 'Dégradation', color: C.urgent }
      ];
    }

    draw(ctx, w, h, p) {
      const d = this.data;
      const rows = d.rows.filter(r => !this.hidden[r.b > r.a ? 'up' : 'down']);
      const labelW = 86;
      const L = { x0: labelW, x1: w - 26, y0: 10, y1: h - 24 };
      const all = d.rows.flatMap(r => [r.a, r.b]);
      const r0 = niceRange(Math.min(...all) - 2, Math.max(...all) + 2, 5);
      const xOf = v => L.x0 + (L.x1 - L.x0) * (v - r0.lo) / (r0.hi - r0.lo);
      const n = rows.length || 1;
      const rowH = (L.y1 - L.y0) / n;
      this.geom = { L, rows, rowH, xOf };

      // Graduations horizontales
      for (let v = r0.lo; v <= r0.hi; v += 5) {
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(xOf(v), L.y0); ctx.lineTo(xOf(v), L.y1); ctx.stroke();
        G.text(ctx, String(v), xOf(v), L.y1 + 12, { align: 'center', font: '500 10px Inter, sans-serif', color: C.light });
      }

      rows.forEach((row, i) => {
        const y = L.y0 + rowH * (i + 0.5);
        const improved = row.b > row.a;
        const hot = this.hover && this.hover.i === i;
        const xa = xOf(row.a), xb = xOf(row.a + (row.b - row.a) * p);
        // Trait relie
        ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y);
        ctx.strokeStyle = improved ? C.available : C.urgent;
        ctx.globalAlpha = hot ? 1 : 0.7;
        ctx.lineWidth = hot ? 4 : 3; ctx.lineCap = 'round'; ctx.stroke();
        ctx.globalAlpha = 1;
        // Point 2020 (gris) - masquable
        if (!this.hidden.a) {
          ctx.beginPath(); ctx.arc(xa, y, 5, 0, Math.PI * 2); ctx.fillStyle = C.light; ctx.fill();
        }
        // Point 2024 (ambre si amelioration, rouge si degradation)
        const colB = improved ? C.primary : C.urgent;
        if (hot) { ctx.beginPath(); ctx.arc(xb, y, 11, 0, Math.PI * 2); ctx.fillStyle = WFP.hexA(colB, 0.2); ctx.fill(); }
        ctx.beginPath(); ctx.arc(xb, y, 6, 0, Math.PI * 2); ctx.fillStyle = colB; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        // Libelle de la zone
        G.text(ctx, row.label, labelW - 10, y, { align: 'right', font: '600 10px Inter, sans-serif', color: hot ? C.ink : C.ink2 });
      });
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < 0 || x > this.w || y < g.L.y0 || y > g.L.y1) return null;
      const i = Math.floor((y - g.L.y0) / g.rowH);
      return (i >= 0 && i < g.rows.length) ? { key: 'd' + i, i } : null;
    }

    tooltip(hit) {
      const g = this.geom, row = g.rows[hit.i];
      const delta = Math.round((row.b - row.a) * 10) / 10;
      return WFP.tip(row.name, [
        ['FCS 2020', WFP.fmt.num(row.a, 1), C.light],
        ['FCS 2024', WFP.fmt.num(row.b, 1), row.b > row.a ? C.primary : C.urgent],
        ['Évolution', (delta >= 0 ? '+' : '') + WFP.fmt.num(delta, 1) + ' pts', row.b > row.a ? C.available : C.urgent]
      ], 'Évolution du score FCS 2020 → 2024');
    }

    tipColor(hit) {
      const row = this.geom.rows[hit.i];
      return row.b > row.a ? C.available : C.urgent;
    }
  }

  WFP.charts.fcs = FcsLinesChart;
  WFP.charts.heat = PriceHeatChart;
  WFP.charts.cereals = CerealsChart;
  WFP.charts.dumbbell = DumbbellChart;
  WFP.heatColor = heatColor;
})(window);
