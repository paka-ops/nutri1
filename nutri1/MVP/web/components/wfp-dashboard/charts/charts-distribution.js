/* ============================================================================
 * WFP NutriTracker · charts/charts-distribution.js
 * Graphiques de REPARTITION (Canvas pur) :
 *   1. Phases IPC empilees (barres)            -> classe IpcChart
 *   4. Strategies d'adaptation (radar 5 axes)  -> classe RadarChart
 *   7. Saisonnalite des alertes (rose polaire) -> classe RoseChart
 *  11. Distribution du score HDDS (histogramme + courbe) -> classe HddsChart
 * Chaque classe herite de WFP.BaseChart (wfp-core.js) : survol, tooltip,
 * legendes cliquables et animation d'entree sont geres par la base.
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP;
  const C = WFP.C, G = WFP.G;
  const PHASES = WFP.data.PHASES;

  /* ---------------------------------------------------------------------
   * 1. PHASES IPC : barres empilees (IPC1 en bas -> IPC5 en haut)
   *    Les segments masques (legende) sont retires de la pile.
   * ------------------------------------------------------------------- */
  class IpcChart extends WFP.BaseChart {
    legendItems() {
      return PHASES.map((p, k) => ({ key: 'p' + k, label: p.id + ' · ' + p.label, color: p.color }));
    }

    draw(ctx, w, h, p) {
      const d = this.data;
      const L = { x0: 40, x1: w - 10, y0: 12, y1: h - 42 };
      const pw = L.x1 - L.x0, ph = L.y1 - L.y0;
      const n = d.labels.length;
      const slot = pw / n;
      const bw = Math.min(46, slot * 0.62);
      this.geom = { L, slot, n };

      G.yGrid(ctx, L.x0, L.x1, L.y0, L.y1,
        [0, 25, 50, 75, 100].map(v => ({ y: L.y1 - ph * v / 100, label: v + '%' })));

      for (let i = 0; i < n; i++) {
        const cx = L.x0 + slot * (i + 0.5);
        const x = cx - bw / 2;
        // Survol : fond de colonne leger
        if (this.hover && this.hover.i === i) {
          ctx.fillStyle = 'rgba(245,158,11,0.07)';
          ctx.fillRect(L.x0 + slot * i, L.y0, slot, ph);
        }
        const vis = PHASES.map((_, k) => k).filter(k => !this.hidden['p' + k]);
        const topK = vis[vis.length - 1];
        let yBase = L.y1;
        vis.forEach(k => {
          const segH = ph * d.phases[i][k] / 100 * p;
          if (segH <= 0) return;
          const y = yBase - segH;
          ctx.fillStyle = PHASES[k].color;
          if (k === topK) {
            G.roundTop(ctx, x, y, bw, segH, 6);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, bw, segH);
          }
          yBase = y;
        });
        // Libelle d'axe (tronque pour les districts)
        G.text(ctx, d.labels[i], cx, L.y1 + 12, {
          align: 'center', font: '600 11px Inter, sans-serif',
          color: this.hover && this.hover.i === i ? C.ink : C.light
        });
      }
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.L.x0 || x > g.L.x1 || y < g.L.y0 || y > g.L.y1 + 24) return null;
      const i = Math.floor((x - g.L.x0) / g.slot);
      return (i >= 0 && i < g.n) ? { key: 'c' + i, i } : null;
    }

    tooltip(hit) {
      const d = this.data, i = hit.i;
      // Phase dominante parmi les segments visibles
      let dom = -1, best = -1;
      PHASES.forEach((ph, k) => { if (!this.hidden['p' + k] && d.phases[i][k] > best) { best = d.phases[i][k]; dom = k; } });
      const rows = [
        ['Phase dominante', PHASES[dom] ? PHASES[dom].id + ' · ' + PHASES[dom].label : '—', PHASES[dom] ? PHASES[dom].color : null],
        ['% population', WFP.fmt.pct(best)],
        ['Personnes dépistées', WFP.fmt.num(d.screened[i] / 1000, 2) + ' M']
      ];
      PHASES.forEach((ph, k) => { rows.push([ph.id + ' ' + ph.label, WFP.fmt.num(d.phases[i][k], 1) + ' %']); });
      return WFP.tip(d.names[i], rows, d.zones[i]);
    }

    tipColor(hit) {
      const d = this.data, i = hit.i;
      let dom = 0, best = -1;
      PHASES.forEach((ph, k) => { if (d.phases[i][k] > best) { best = d.phases[i][k]; dom = k; } });
      return PHASES[dom].color;
    }
  }

  /* ---------------------------------------------------------------------
   * 4. RADAR CSI (5 axes) : polygones multi-series
   * ------------------------------------------------------------------- */
  class RadarChart extends WFP.BaseChart {
    legendItems() {
      return this.data.series.map(s => ({ key: s.key, label: s.label, color: s.color }));
    }

    geometry(w, h) {
      const cx = w / 2, cy = h / 2 + 2;
      const R = Math.max(30, Math.min(w, h) / 2 - 40);
      return { cx, cy, R };
    }

    draw(ctx, w, h, p) {
      const d = this.data, n = d.axes.length;
      const { cx, cy, R } = this.geometry(w, h);
      this.geom = { cx, cy, R, n };
      const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;

      // Anneaux (25/50/75/100) et axes
      [25, 50, 75, 100].forEach(v => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = cx + Math.cos(ang(i)) * R * v / 100, y = cy + Math.sin(ang(i)) * R * v / 100;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.stroke();
      });
      for (let i = 0; i < n; i++) {
        const hot = this.hover && this.hover.i === i;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R);
        ctx.strokeStyle = hot ? C.border : C.axis; ctx.stroke();
        // Libelle d'axe
        const lx = cx + Math.cos(ang(i)) * (R + 16), ly = cy + Math.sin(ang(i)) * (R + 16);
        const align = Math.abs(Math.cos(ang(i))) < 0.2 ? 'center' : (Math.cos(ang(i)) > 0 ? 'left' : 'right');
        G.text(ctx, d.axes[i], lx, ly, { align, font: '600 10px Inter, sans-serif', color: hot ? C.ink : C.muted });
      }

      // Series visibles
      d.series.forEach(s => {
        if (this.hidden[s.key]) return;
        const pts = s.values.map((v, i) => [cx + Math.cos(ang(i)) * R * v / 100 * p, cy + Math.sin(ang(i)) * R * v / 100 * p]);
        ctx.beginPath();
        pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
        ctx.closePath();
        ctx.fillStyle = WFP.hexA(s.color, 0.16); ctx.fill();
        ctx.setLineDash(s.dash || []);
        ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
        ctx.setLineDash([]);
        pts.forEach((q, i) => {
          const hot = this.hover && this.hover.i === i;
          if (hot) { ctx.beginPath(); ctx.arc(q[0], q[1], 11, 0, Math.PI * 2); ctx.fillStyle = WFP.hexA(s.color, 0.18); ctx.fill(); }
          ctx.beginPath(); ctx.arc(q[0], q[1], hot ? 5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = s.color; ctx.fill();
        });
      });
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g) return null;
      const dx = x - g.cx, dy = y - g.cy;
      const dist = Math.hypot(dx, dy);
      if (dist > g.R + 44) return null;
      let a = Math.atan2(dy, dx) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      const i = Math.round(a / (2 * Math.PI / g.n)) % g.n;
      return { key: 'a' + i, i };
    }

    tooltip(hit) {
      const d = this.data;
      const rows = d.series.filter(s => !this.hidden[s.key]).map(s => [s.label, s.values[hit.i] + ' %', s.color]);
      return WFP.tip(d.axes[hit.i], rows, '% des ménages recourant à la stratégie');
    }

    tipColor(hit) { return this.data.series[0] ? this.data.series[0].color : C.primary; }
  }

  /* ---------------------------------------------------------------------
   * 7. ROSE POLAIRE : 12 secteurs (mois), rayon = racine du volume d'alertes
   *    Zone de soudure (juin-sept) surlignee en rouge vif.
   * ------------------------------------------------------------------- */
  class RoseChart extends WFP.BaseChart {
    legendItems() {
      return [
        { key: 'soud', label: 'Soudure (Juin–Sept)', color: C.urgent },
        { key: 'autre', label: 'Autres mois', color: C.primary }
      ];
    }

    draw(ctx, w, h, p) {
      const d = this.data, n = 12;
      const cx = w / 2, cy = h / 2;
      const R = Math.max(40, Math.min(w, h) / 2 - 28);
      const vmax = Math.max(...d.values) || 1;
      this.geom = { cx, cy, R, n };
      const step = 2 * Math.PI / n;
      const start = i => -Math.PI / 2 + i * step;

      // Anneaux de reference
      [0.25, 0.5, 0.75, 1].forEach(f => {
        ctx.beginPath(); ctx.arc(cx, cy, R * Math.sqrt(f), 0, Math.PI * 2);
        ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.stroke();
      });

      for (let i = 0; i < n; i++) {
        const soud = d.soudure.includes(i);
        if (this.hidden[soud ? 'soud' : 'autre']) continue;
        const r = R * Math.sqrt(d.values[i] / vmax) * p;
        const a0 = start(i) + 0.02, a1 = start(i + 1) - 0.02;
        const hot = this.hover && this.hover.i === i;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, Math.max(r, 0.01), a0, a1);
        ctx.closePath();
        if (soud) {
          ctx.fillStyle = hot ? '#DC2626' : 'rgba(239,68,68,0.85)';
        } else {
          ctx.fillStyle = hot ? '#D97706' : WFP.hexA(C.primary, 0.55);
        }
        ctx.fill();
        if (hot) { ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke(); }
      }

      // Libelles des mois autour du cercle
      for (let i = 0; i < n; i++) {
        const mid = start(i) + step / 2;
        const soud = d.soudure.includes(i);
        G.text(ctx, d.labels[i], cx + Math.cos(mid) * (R + 14), cy + Math.sin(mid) * (R + 14), {
          align: 'center', font: (soud ? '700' : '600') + ' 10px Inter, sans-serif', color: soud ? C.urgent : C.muted
        });
      }
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g) return null;
      const dx = x - g.cx, dy = y - g.cy;
      if (Math.hypot(dx, dy) > g.R + 10) return null;
      let a = Math.atan2(dy, dx) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      const i = Math.floor(a / (2 * Math.PI / g.n)) % g.n;
      return { key: 'm' + i, i };
    }

    tooltip(hit) {
      const d = this.data, i = hit.i;
      const soud = d.soudure.includes(i);
      return WFP.tip(d.labels[i], [
        ['Alertes transmises', WFP.fmt.num(d.values[i], 0)],
        ['Part du total', WFP.fmt.pct(d.values[i] / d.values.reduce((a, b) => a + b, 0) * 100, 1)],
        ['Période', soud ? 'Soudure agricole' : 'Hors soudure', soud ? C.urgent : C.available]
      ], 'Alertes de vulnérabilité · relais');
    }

    tipColor(hit) { return this.data.soudure.includes(hit.i) ? C.urgent : C.primary; }
  }

  /* ---------------------------------------------------------------------
   * 11. HISTOGRAMME HDDS (0-12) + courbe de distribution (noyau gaussien)
   * ------------------------------------------------------------------- */
  class HddsChart extends WFP.BaseChart {
    legendItems() {
      return [
        { key: 'bars', label: 'Ménages (effectif)', color: C.primary },
        { key: 'curve', label: 'Courbe de distribution', color: C.analysis }
      ];
    }

    draw(ctx, w, h, p) {
      const d = this.data;
      const L = { x0: 40, x1: w - 12, y0: 16, y1: h - 30 };
      const pw = L.x1 - L.x0, ph = L.y1 - L.y0;
      const n = d.bins.length, slot = pw / n, bw = Math.min(30, slot * 0.7);
      const cmax = Math.max(...d.counts, ...d.curve.map(c => c[1] * d.total)) * 1.08;
      const yOf = v => L.y1 - ph * v / cmax;
      this.geom = { L, slot, n };

      const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: yOf(cmax * f), label: Math.round(cmax * f) }));
      G.yGrid(ctx, L.x0, L.x1, L.y0, L.y1, ticks);

      if (!this.hidden.bars) {
        d.counts.forEach((c, k) => {
          const x = L.x0 + slot * (k + 0.5) - bw / 2;
          const hh = ph * c / cmax * p;
          const grad = ctx.createLinearGradient(0, L.y1 - hh, 0, L.y1);
          grad.addColorStop(0, this.hover && this.hover.i === k ? '#D97706' : C.primary);
          grad.addColorStop(1, WFP.hexA(C.primary, 0.35));
          ctx.fillStyle = grad;
          G.roundTop(ctx, x, L.y1 - hh, bw, hh, 6); ctx.fill();
          if (slot < 16 && k % 2 === 1 && k > 0) return; // evite le chevauchement des libelles
          G.text(ctx, String(k), L.x0 + slot * (k + 0.5), L.y1 + 12, {
            align: 'center', font: '600 11px Inter, sans-serif', color: this.hover && this.hover.i === k ? C.ink : C.light
          });
        });
      } else {
        d.bins.forEach(k => G.text(ctx, String(k), L.x0 + slot * (k + 0.5), L.y1 + 12, { align: 'center', font: '600 11px Inter, sans-serif' }));
      }

      // Courbe de distribution (Catmull-Rom) en violet analyse
      if (!this.hidden.curve) {
        const pts = d.curve.map(([x, v]) => [L.x0 + (x + 0.5) * slot, yOf(v * d.total) ]).map(q => [q[0], L.y1 - (L.y1 - q[1]) * p]);
        ctx.beginPath(); G.smooth(ctx, pts, 0.9);
        ctx.strokeStyle = C.analysis; ctx.lineWidth = 2.5; ctx.stroke();
      }

      // Moyenne HDDS : trait pointille + etiquette
      const mx = L.x0 + slot * (d.mean + 0.5);
      ctx.save();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(mx, L.y0); ctx.lineTo(mx, L.y1); ctx.stroke();
      ctx.restore();
      G.text(ctx, 'Moyenne ' + WFP.fmt.num(d.mean, 1), mx + 5, L.y0 + 6, { font: '600 10px Inter, sans-serif', color: C.ink2 });
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.L.x0 || x > g.L.x1 || y < g.L.y0 || y > g.L.y1 + 20) return null;
      const k = Math.floor((x - g.L.x0) / g.slot);
      return (k >= 0 && k < g.n) ? { key: 'h' + k, i: k } : null;
    }

    tooltip(hit) {
      const d = this.data, k = hit.i;
      const pct = d.density[k] * 100;
      return WFP.tip('Score HDDS = ' + k, [
        ['Ménages', WFP.fmt.num(d.counts[k], 0)],
        ['Part de l\'échantillon', WFP.fmt.pct(pct, 1)],
        ['Lecture', k <= 3 ? 'Diversité faible' : k <= 6 ? 'Diversité moyenne' : 'Diversité élevée', k <= 3 ? C.urgent : k <= 6 ? C.primary : C.available]
      ], 'Diversité alimentaire du ménage (0 à 12)');
    }

    tipColor(hit) { return hit.i <= 3 ? C.urgent : hit.i <= 6 ? C.primary : C.available; }
  }

  WFP.charts.ipc = IpcChart;
  WFP.charts.radar = RadarChart;
  WFP.charts.rose = RoseChart;
  WFP.charts.hdds = HddsChart;
})(window);
