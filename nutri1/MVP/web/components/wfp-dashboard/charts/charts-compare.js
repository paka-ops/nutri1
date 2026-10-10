/* ============================================================================
 * WFP NutriTracker · charts/charts-compare.js
 * Graphiques de COMPARAISON, LOGISTIQUE et PERFORMANCE (Canvas pur) :
 *   5. Prix du mil vs malnutrition aigue (nuage + regression) -> ScatterChart
 *   6. Entonnoir de distribution PAM (NutriApp)               -> FunnelChart
 *  10. Disponibilite vs acces economique (double barres)      -> DualBarChart
 *  13. Matrice calendaire des alertes par mois                -> CalendarChart
 *  14. Cascade financiere (budget requis -> disponible)       -> WaterfallChart
 *  15. Bullet charts de performance terrain (8 indicateurs)   -> BulletChart
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP;
  const C = WFP.C, G = WFP.G;

  /* ---------------------------------------------------------------------
   * 5. NUAGE DE POINTS : prix du mil (FCFA/kg) vs MAM (%) + droite ambre
   * ------------------------------------------------------------------- */
  class ScatterChart extends WFP.BaseChart {
    legendItems() {
      const d = this.data;
      return [
        { key: 'pts', label: 'Marchés / ménages (n = ' + d.n + ')', color: C.analysis },
        { key: 'reg', label: 'Régression · r² ' + WFP.fmt.num(d.r2, 2), color: C.primary }
      ];
    }

    draw(ctx, w, h, p) {
      const d = this.data;
      const L = { x0: 44, x1: w - 14, y0: 12, y1: h - 34 };
      const pw = L.x1 - L.x0, ph = L.y1 - L.y0;
      const [xa, xb] = d.xr, [ya, yb] = [0, Math.ceil(d.yr[1] / 2) * 2];
      const xOf = v => L.x0 + pw * (v - xa) / (xb - xa);
      const yOf = v => L.y1 - ph * (v - ya) / (yb - ya);
      this.geom = { L, xOf, yOf };

      const yt = [];
      for (let v = 0; v <= yb; v += 4) yt.push({ y: yOf(v), label: v + '%' });
      G.yGrid(ctx, L.x0, L.x1, L.y0, L.y1, yt);
      for (let v = Math.ceil(xa / 40) * 40; v <= xb; v += 40) {
        G.text(ctx, String(v), xOf(v), L.y1 + 12, { align: 'center', font: '500 11px Inter, sans-serif', color: C.light });
      }
      G.text(ctx, 'Prix du mil (FCFA/kg) →', L.x1, L.y1 + 26, { align: 'right', font: '600 10px Inter, sans-serif', color: C.muted });

      // Points : apparition echelonnee
      d.points.forEach((pt, i) => {
        if (this.hidden.pts) return;
        const a = WFP.clamp(p * 1.4 - i / d.points.length * 0.4, 0, 1);
        if (a <= 0) return;
        const hot = this.hover && this.hover.i === i;
        ctx.globalAlpha = a * (hot ? 1 : 0.72);
        if (hot) { ctx.beginPath(); ctx.arc(xOf(pt.x), yOf(pt.y), 12, 0, Math.PI * 2); ctx.fillStyle = WFP.hexA(C.analysis, 0.18); ctx.fill(); }
        ctx.beginPath(); ctx.arc(xOf(pt.x), yOf(pt.y), hot ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = C.analysis; ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Droite de regression (ambre), tracee progressivement
      if (!this.hidden.reg) {
        const x1 = xa, x2 = xa + (xb - xa) * p;
        ctx.beginPath();
        ctx.moveTo(xOf(x1), yOf(d.intercept + d.slope * x1));
        ctx.lineTo(xOf(x2), yOf(d.intercept + d.slope * x2));
        ctx.strokeStyle = C.primary; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
      }
    }

    hitTest(x, y) {
      const g = this.geom, d = this.data;
      if (!g) return null;
      let best = -1, bd = 12;
      d.points.forEach((pt, i) => {
        const dd = Math.hypot(g.xOf(pt.x) - x, g.yOf(pt.y) - y);
        if (dd < bd) { bd = dd; best = i; }
      });
      return best >= 0 ? { key: 's' + best, i: best } : null;
    }

    tooltip(hit) {
      const d = this.data, pt = d.points[hit.i];
      const pred = d.intercept + d.slope * pt.x;
      return WFP.tip(pt.label, [
        ['Prix du mil', pt.x + ' FCFA/kg'],
        ['MAM dépisté (MUAC)', WFP.fmt.num(pt.y, 1) + ' %', C.urgent],
        ['MAM prédit (régression)', WFP.fmt.num(pred, 1) + ' %', C.primary]
      ], pt.zone);
    }

    tipColor() { return C.analysis; }
  }

  /* ---------------------------------------------------------------------
   * 6. ENTONNOIR VERTICAL : 6 etapes, barres centrees, taux de conversion
   * ------------------------------------------------------------------- */
  class FunnelChart extends WFP.BaseChart {
    draw(ctx, w, h, p) {
      const d = this.data, n = d.stages.length;
      const top = 6, rowH = (h - top - 8) / n;
      const cx = w / 2;
      const maxW = (w - 36) * 0.96;
      const v0 = d.stages[0].value;
      this.geom = { top, rowH, n, cx };

      d.stages.forEach((s, i) => {
        const y = top + rowH * i;
        const hot = this.hover && this.hover.i === i;
        const bw = Math.max(20, maxW * s.value / v0 * p);
        const bh = Math.min(26, rowH * 0.5);
        const by = y + rowH * 0.42;
        const col = WFP.mixHex(C.primary, C.available, n > 1 ? i / (n - 1) : 0);
        // Libelle de l'etape (gauche) et conversion (droite)
        G.text(ctx, s.label, 14, y + rowH * 0.22, { font: (hot ? '700' : '600') + ' 11px Inter, sans-serif', color: hot ? C.ink : C.ink2 });
        if (i > 0) {
          const conv = Math.round(s.value / d.stages[i - 1].value * 100);
          G.text(ctx, '↓ ' + conv + ' %', w - 14, y + rowH * 0.22, { align: 'right', font: '700 10px Inter, sans-serif', color: conv < 92 ? C.urgent : C.muted });
        }
        // Barre centree arrondie
        ctx.fillStyle = hot ? WFP.mixHex(col, '#000000', 0.12) : col;
        G.rrect(ctx, cx - bw / 2, by, bw, bh, 8); ctx.fill();
        if (bw > 60) {
          G.text(ctx, WFP.fmt.num(s.value, 1) + ' ' + d.unit, cx, by + bh / 2, { align: 'center', font: '700 12px Inter, sans-serif', color: '#FFFFFF' });
        }
      });
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g) return null;
      const i = Math.floor((y - g.top) / g.rowH);
      return (i >= 0 && i < g.n) ? { key: 'f' + i, i } : null;
    }

    tooltip(hit) {
      const d = this.data, s = d.stages[hit.i];
      const prev = hit.i > 0 ? d.stages[hit.i - 1].value : null;
      const rows = [
        ['Effectif', WFP.fmt.num(s.value, 1) + ' ' + d.unit],
        ['Part des ciblés', WFP.fmt.pct(s.value / d.stages[0].value * 100, 1)]
      ];
      if (prev !== null) rows.push(['Perte vs étape précédente', WFP.fmt.num(prev - s.value, 1) + ' ' + d.unit, C.urgent]);
      return WFP.tip(s.label, rows, 'Chaîne de distribution PAM · NutriApp');
    }

    tipColor(hit) { return WFP.mixHex(C.primary, C.available, this.data.stages.length > 1 ? hit.i / (this.data.stages.length - 1) : 0); }
  }

  /* ---------------------------------------------------------------------
   * 10. DOUBLE BARRES : disponibilite (kcal, en % des besoins) vs acces (%)
   *     Gap d'acces surligne en rouge (partie de la disponibilite non accessible)
   * ------------------------------------------------------------------- */
  class DualBarChart extends WFP.BaseChart {
    legendItems() {
      return [
        { key: 'av', label: 'Disponibilité kcal/jour', color: C.info },
        { key: 'ac', label: 'Accès économique (% ménages)', color: C.primary },
        { key: 'gap', label: 'Gap d\'accès', color: C.urgent }
      ];
    }

    draw(ctx, w, h, p) {
      const d = this.data, n = d.labels.length;
      const L = { x0: 40, x1: w - 10, y0: 12, y1: h - 40 };
      const pw = L.x1 - L.x0, ph = L.y1 - L.y0;
      const YMAX = 140;
      const yOf = v => L.y1 - ph * v / YMAX;
      const slot = pw / n, bw = Math.min(20, slot * 0.36);
      this.geom = { L, slot, n };

      const ticks = [];
      for (let v = 0; v <= YMAX; v += 20) ticks.push({ y: yOf(v), label: v + '%' });
      G.yGrid(ctx, L.x0, L.x1, L.y0, L.y1, ticks);

      // Ligne de besoin 100 % (2100 kcal)
      ctx.save();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = C.ink2; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L.x0, yOf(100)); ctx.lineTo(L.x1, yOf(100)); ctx.stroke();
      ctx.restore();
      G.text(ctx, 'Besoin 2 100 kcal', L.x1 - 2, yOf(100) - 8, { align: 'right', font: '600 10px Inter, sans-serif', color: C.ink2 });

      for (let i = 0; i < n; i++) {
        const cx = L.x0 + slot * (i + 0.5);
        const av = d.avail[i], ac = d.access[i];
        const hot = this.hover && this.hover.i === i;
        if (hot) { ctx.fillStyle = 'rgba(245,158,11,0.07)'; ctx.fillRect(L.x0 + slot * i, L.y0, slot, ph); }
        // Barre bleue : disponibilite
        if (!this.hidden.av) {
          const hh = ph * av.pct / YMAX * p;
          ctx.fillStyle = hot ? '#2563EB' : C.info;
          G.roundTop(ctx, cx - bw - 1, L.y1 - hh, bw, hh, 5); ctx.fill();
        }
        // Barre ambre : acces economique
        if (!this.hidden.ac) {
          const hh = ph * ac / YMAX * p;
          ctx.fillStyle = hot ? '#D97706' : C.primary;
          G.roundTop(ctx, cx + 1, L.y1 - hh, bw, hh, 5); ctx.fill();
        }
        // Gap d'acces : zone entre le haut de la barre d'acces et la disponibilite
        if (!this.hidden.gap && !this.hidden.ac && av.pct > ac) {
          const top = yOf(av.pct * p), bot = yOf(ac * p);
          if (bot > top) {
            ctx.fillStyle = 'rgba(239,68,68,0.22)';
            ctx.fillRect(cx + 1, top, bw, bot - top);
            ctx.strokeStyle = C.urgent; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
            ctx.strokeRect(cx + 1.5, top + 0.5, bw - 1, bot - top - 1); ctx.setLineDash([]);
          }
        }
        G.text(ctx, d.labels[i], cx, L.y1 + 12, { align: 'center', font: '600 11px Inter, sans-serif', color: hot ? C.ink : C.light });
      }
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.L.x0 || x > g.L.x1 || y < g.L.y0 || y > g.L.y1 + 20) return null;
      const i = Math.floor((x - g.L.x0) / g.slot);
      return (i >= 0 && i < g.n) ? { key: 'd' + i, i } : null;
    }

    tooltip(hit) {
      const d = this.data, i = hit.i;
      const gap = Math.max(0, Math.round(d.avail[i].pct - d.access[i]));
      return WFP.tip(d.names[i], [
        ['Disponibilité', WFP.fmt.num(d.avail[i].kcal, 0) + ' kcal/jour', C.info],
        ['Couverture des besoins', WFP.fmt.pct(d.avail[i].pct, 0)],
        ['Accès économique', WFP.fmt.pct(d.access[i], 0), C.primary],
        ['Gap d\'accès', gap + ' pts', gap > 40 ? C.urgent : C.muted]
      ], 'Disponibilité vs accès · ménages');
    }

    tipColor(hit) { return this.data.access[hit.i] < 50 ? C.urgent : C.primary; }
  }

  /* ---------------------------------------------------------------------
   * 13. MATRICE CALENDAIRE : mois x entites, frequence des signalements d'urgence
   * ------------------------------------------------------------------- */
  const CAL_STOPS = [[0, [255, 251, 240]], [6, [253, 224, 138]], [12, [245, 158, 11]], [20, [185, 28, 28]]];
  function calColor(v) {
    for (let i = 0; i < CAL_STOPS.length - 1; i++) {
      const [a, ca] = CAL_STOPS[i], [b, cb] = CAL_STOPS[i + 1];
      if (v <= b) {
        const t = (v - a) / (b - a);
        return 'rgb(' + ca.map((x, k) => Math.round(WFP.lerp(x, cb[k], t))).join(',') + ')';
      }
    }
    return 'rgb(185,28,28)';
  }

  class CalendarChart extends WFP.BaseChart {
    draw(ctx, w, h, p) {
      const d = this.data;
      const rows = d.rows.length, cols = 12;
      const x0 = 74, y0 = 22;
      const cw = (w - x0 - 4) / cols;
      const ch = Math.min(28, (h - y0 - 6) / rows);
      this.geom = { x0, y0, cw, ch, rows, cols };

      d.cols.forEach((m, c) => {
        const soud = c >= 5 && c <= 8;
        G.text(ctx, m, x0 + cw * (c + 0.5), y0 - 9, { align: 'center', font: (soud ? '700' : '600') + ' 10px Inter, sans-serif', color: soud ? C.urgent : C.light });
      });
      d.rows.forEach((name, r) => {
        const hot = this.hover && this.hover.r === r;
        G.text(ctx, name, x0 - 8, y0 + ch * (r + 0.5), { align: 'right', font: '600 10px Inter, sans-serif', color: hot ? C.ink : C.ink2 });
      });

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = d.values[r][c];
          const a = WFP.clamp(p * 1.6 - c / cols * 0.6, 0, 1);
          if (a <= 0) continue;
          const x = x0 + cw * c + 1.5, y = y0 + ch * r + 1.5;
          ctx.globalAlpha = a;
          ctx.fillStyle = calColor(v);
          G.rrect(ctx, x, y, cw - 3, ch - 3, 4); ctx.fill();
          if (cw > 22 && ch > 14) {
            G.text(ctx, String(v), x + (cw - 3) / 2, y + (ch - 3) / 2, { align: 'center', font: '600 10px Inter, sans-serif', color: v > 12 ? '#FFFFFF' : C.ink2 });
          }
          ctx.globalAlpha = 1;
          if (this.hover && this.hover.r === r && this.hover.c === c) {
            ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; G.rrect(ctx, x, y, cw - 3, ch - 3, 4); ctx.stroke();
          }
        }
      }
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.x0 || y < g.y0) return null;
      const c = Math.floor((x - g.x0) / g.cw), r = Math.floor((y - g.y0) / g.ch);
      if (c < 0 || c >= g.cols || r < 0 || r >= g.rows) return null;
      return { key: 'cal' + r + '-' + c, r, c };
    }

    tooltip(hit) {
      const d = this.data, v = d.values[hit.r][hit.c];
      const soud = hit.c >= 5 && hit.c <= 8;
      return WFP.tip(d.names[hit.r] + ' · ' + d.cols[hit.c], [
        ['Signalements d\'urgence', WFP.fmt.num(v, 0)],
        ['Période', soud ? 'Soudure agricole' : 'Hors soudure', soud ? C.urgent : C.available]
      ], 'Alertes envoyées depuis l\'app mobile');
    }

    tipColor(hit) { return calColor(this.data.values[hit.r][hit.c]); }
  }

  /* ---------------------------------------------------------------------
   * 14. CASCADE FINANCIERE : Budget requis -> Gap -> Budget disponible
   * ------------------------------------------------------------------- */
  class WaterfallChart extends WFP.BaseChart {
    draw(ctx, w, h, p) {
      const d = this.data, steps = d.steps;
      const L = { x0: 44, x1: w - 14, y0: 26, y1: h - 40 };
      const pw = L.x1 - L.x0, ph = L.y1 - L.y0;
      const vmax = Math.max(...steps.map(s => Math.max(s.from, s.to))) * 1.15;
      const yOf = v => L.y1 - ph * v / vmax;
      const slot = pw / steps.length, bw = Math.min(64, slot * 0.56);
      this.geom = { L, slot, n: steps.length, yOf };

      const tks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: yOf(vmax * f), label: WFP.fmt.num(vmax * f, 1) }));
      G.yGrid(ctx, L.x0, L.x1, L.y0, L.y1, tks);

      steps.forEach((s, i) => {
        const cx = L.x0 + slot * (i + 0.5);
        const x = cx - bw / 2;
        const hot = this.hover && this.hover.i === i;
        ctx.globalAlpha = hot ? 1 : 0.92;
        if (s.kind === 'total') {
          const top = yOf(s.value * p), bot = yOf(0);
          ctx.fillStyle = s.color;
          G.roundTop(ctx, x, top, bw, bot - top, 6); ctx.fill();
          G.text(ctx, WFP.fmt.num(s.value, 2) + ' ' + d.unit, cx, top - 10, { align: 'center', font: '700 12px Inter, sans-serif', color: C.ink });
        } else {
          // Ecart flottant (rouge) : de "from" vers "to" (valeur negative)
          const yFrom = yOf(s.from), yTo = yOf(WFP.lerp(s.from, s.to, p));
          ctx.fillStyle = s.color;
          ctx.fillRect(x, Math.min(yFrom, yTo), bw, Math.abs(yTo - yFrom));
          G.text(ctx, (s.value >= 0 ? '+' : '−') + WFP.fmt.num(Math.abs(s.value), 2) + ' ' + d.unit, cx, Math.min(yFrom, yTo) - 10, {
            align: 'center', font: '700 12px Inter, sans-serif', color: C.urgent
          });
        }
        ctx.globalAlpha = 1;
        G.text(ctx, s.label, cx, L.y1 + 16, { align: 'center', font: '600 11px Inter, sans-serif', color: hot ? C.ink : C.ink2 });

        // Connecteur pointille vers l'etape suivante
        if (i < steps.length - 1 && p > 0.9) {
          const lvl = s.kind === 'total' ? s.value : s.to;
          ctx.save();
          ctx.setLineDash([4, 3]); ctx.strokeStyle = C.light; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx + bw / 2, yOf(lvl)); ctx.lineTo(cx + slot - bw / 2, yOf(lvl)); ctx.stroke();
          ctx.restore();
        }
      });
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g || x < g.L.x0 || x > g.L.x1 || y < g.L.y0 - 20 || y > g.L.y1 + 30) return null;
      const i = Math.floor((x - g.L.x0) / g.slot);
      return (i >= 0 && i < g.n) ? { key: 'w' + i, i } : null;
    }

    tooltip(hit) {
      const d = this.data, s = d.steps[hit.i];
      const rows = [];
      if (s.kind === 'total') {
        rows.push(['Montant', WFP.fmt.num(s.value, 2) + ' ' + d.unit, s.color]);
      } else {
        rows.push(['Écart', WFP.fmt.num(s.value, 2) + ' ' + d.unit, C.urgent]);
        rows.push(['Taux de couverture', WFP.fmt.pct(Math.round(s.to / s.from * 100), 0)]);
      }
      rows.push(['Contributions bailleurs', WFP.fmt.num(d.contributions, 2) + ' ' + d.unit]);
      return WFP.tip(s.label, rows, 'Financement des opérations PAM');
    }

    tipColor(hit) { return this.data.steps[hit.i].color; }
  }

  /* ---------------------------------------------------------------------
   * 15. BULLET CHARTS : 8 indicateurs terrain vs objectifs PAM (grille)
   * ------------------------------------------------------------------- */
  // Zones de performance : (haut = bon)  rouge < 70 % cible, ambre < cible, vert >= cible
  function bands(b) {
    const T = b.target, M = b.max;
    if (!b.inverse) {
      return [{ to: T * 0.7, c: C.urgent }, { to: T, c: C.primary }, { to: M, c: C.available }];
    }
    // Indicateur "plus bas = mieux" : vert jusqu'a la cible, rouge au-dela de 130 %
    return [{ to: T, c: C.available }, { to: T * 1.3, c: C.primary }, { to: M, c: C.urgent }];
  }
  function bandOf(b, v) {
    const bs = bands(b);
    let prev = 0;
    for (const bd of bs) { if (v <= bd.to) return bd.c; prev = bd.to; }
    return bs[bs.length - 1].c;
  }

  class BulletChart extends WFP.BaseChart {
    draw(ctx, w, h, p) {
      const items = this.data;
      const cols = w > 560 ? 4 : 2;
      const rows = Math.ceil(items.length / cols);
      const padX = 18, padY = 8;
      const cw = (w - padX * 2) / cols, ch = (h - padY * 2) / rows;
      this.geom = { cols, rows, cw, ch, padX, padY };

      items.forEach((b, i) => {
        const cx0 = padX + (i % cols) * cw, cy0 = padY + Math.floor(i / cols) * ch;
        const hot = this.hover && this.hover.i === i;
        if (hot) { ctx.fillStyle = 'rgba(245,158,11,0.06)'; G.rrect(ctx, cx0 + 4, cy0 + 2, cw - 8, ch - 4, 10); ctx.fill(); }
        const bx = cx0 + 12, bw = cw - 24;
        const by = cy0 + ch * 0.55, bh = 14;
        const vcur = bandOf(b, b.value);

        // Libelle + valeur actuelle
        G.text(ctx, b.label, bx, cy0 + ch * 0.22, { font: '600 11px Inter, sans-serif', color: C.ink2 });
        G.text(ctx, WFP.fmt.num(b.value, b.unit === '%' ? 0 : 1) + b.unit, bx + bw, cy0 + ch * 0.22, { align: 'right', font: '800 14px Inter, sans-serif', color: vcur });

        // Fonds de performance (3 bandes)
        let x = bx, prev = 0;
        bands(b).forEach(bd => {
          const to = WFP.clamp(bd.to / b.max, 0, 1);
          const wpx = bw * (to - prev);
          ctx.fillStyle = WFP.hexA(bd.c, 0.22);
          ctx.fillRect(x, by, wpx, bh);
          x += wpx; prev = to;
        });
        // Barre de valeur (fine, sombre), animee
        const vw = bw * WFP.clamp(b.value / b.max, 0, 1) * p;
        ctx.fillStyle = C.ink;
        G.rrect(ctx, bx, by + bh * 0.35, Math.max(0, vw), bh * 0.3, 2); ctx.fill();
        // Marqueur de cible
        const tx = bx + bw * WFP.clamp(b.target / b.max, 0, 1);
        ctx.fillStyle = C.urgent;
        ctx.fillRect(tx - 1, by - 4, 2, bh + 8);
        G.text(ctx, 'Cible ' + b.target + b.unit, tx, by + bh + 12, { align: 'center', font: '600 9px Inter, sans-serif', color: C.urgent });
      });
    }

    hitTest(x, y) {
      const g = this.geom;
      if (!g) return null;
      const c = Math.floor((x - g.padX) / g.cw), r = Math.floor((y - g.padY) / g.ch);
      if (c < 0 || c >= g.cols || r < 0 || r >= g.rows) return null;
      const i = r * g.cols + c;
      return i < this.data.length ? { key: 'b' + i, i } : null;
    }

    tooltip(hit) {
      const b = this.data[hit.i];
      const ecart = b.value - b.target;
      return WFP.tip(b.label, [
        ['Valeur mesurée (app)', WFP.fmt.num(b.value, 1) + b.unit, bandOf(b, b.value)],
        ['Objectif PAM', WFP.fmt.num(b.target, 1) + b.unit],
        ['Écart à l\'objectif', (ecart >= 0 ? '+' : '') + WFP.fmt.num(ecart, 1) + b.unit, bandOf(b, b.value)]
      ], b.inverse ? 'Indicateur : plus bas = mieux' : 'Indicateur : plus haut = mieux');
    }

    tipColor(hit) { return bandOf(this.data[hit.i], this.data[hit.i].value); }
  }

  WFP.charts.scatter = ScatterChart;
  WFP.charts.funnel = FunnelChart;
  WFP.charts.dual = DualBarChart;
  WFP.charts.calendar = CalendarChart;
  WFP.charts.waterfall = WaterfallChart;
  WFP.charts.bullets = BulletChart;
})(window);
