/* ============================================================================
 * NutriApp Santé · moh-charts-core.js
 * Fonctions de rendu Canvas pour les 15 graphiques.
 * Chaque fonction est appelée avec le contexte Chart (this = instance MOH.Chart)
 * et reçoit le state (régional ou pays).
 * ========================================================================== */
(function (global) {
  'use strict';
  const MOH = global.MOHNutriApp;
  if (!MOH || !MOH.Chart) { console.error('[MOH charts-core] dépendances manquantes'); return; }
  const C = MOH.COLORS;

  /* ---- Export : toutes les fonctions de rendu ---- */
  MOH.charts = {};

  /* =========================================================================
   * Graphique 1 — Admissions CRENAS 24 mois (dual area chart)
   * ========================================================================= */
  MOH.charts.g1 = function (ctx) {
    const state = this._state;
    const data = MOH.MONTHS_24;
    const y2023 = data.filter(d => d.year === 2023);
    const y2024 = data.filter(d => d.year === 2024);
    const allVals = data.map(d => d.value);
    const yMax = Math.max(...allVals) * 1.1;
    const yMin = 0;
    const ys = MOH.niceScale(yMin, yMax, 5);
    // Concaténer pour l'échelle X (24 positions)
    const n = data.length;
    const xAt = (i) => this.margins.l + (i / (n - 1)) * this.pw;
    const yAt = (v) => this.gridY(v, ys.min, ys.max);
    this.drawAxes({ min: 0, max: n - 1 }, ys);

    const v = this.visible;
    // Zone de soudure Juin->Sept (indices 5..8 en 2024 = 17..20 dans le tableau global)
    const soudureStart = xAt(17); // Juin 2024
    const soudureEnd = xAt(20);   // Sept 2024
    ctx.fillStyle = MOH.hexA(C.quaternary, 0.10);
    ctx.fillRect(soudureStart, this.margins.t, soudureEnd - soudureStart, this.ph);
    ctx.fillStyle = MOH.hexA(C.quaternary, 0.9);
    ctx.font = MOH.font(10, 600);
    ctx.fillText('Zone de soudure', soudureStart + 6, this.margins.t + 12);

    // 2023 (gris)
    const pts23 = y2023.map((d, i) => ({ x: xAt(i), y: yAt(d.value * v) }));
    const pts24 = y2024.map((d, i) => ({ x: xAt(i + 12), y: yAt(d.value * v) }));

    // Aire 2024
    const grad24 = ctx.createLinearGradient(0, this.margins.t, 0, this.margins.t + this.ph);
    grad24.addColorStop(0, MOH.hexA(C.primary, 0.35));
    grad24.addColorStop(1, MOH.hexA(C.primary, 0));
    ctx.fillStyle = grad24;
    ctx.beginPath();
    MOH.smoothPath(ctx, pts24);
    ctx.lineTo(pts24[pts24.length - 1].x, this.margins.t + this.ph);
    ctx.lineTo(pts24[0].x, this.margins.t + this.ph);
    ctx.closePath();
    ctx.fill();

    // Courbe 2023
    ctx.strokeStyle = MOH.hexA('#94A3B8', 0.6); ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); MOH.smoothPath(ctx, pts23); ctx.stroke();
    ctx.setLineDash([]);

    // Courbe 2024
    ctx.strokeStyle = C.primary; ctx.lineWidth = 2.5;
    ctx.beginPath(); MOH.smoothPath(ctx, pts24); ctx.stroke();

    // Points 2024 avec hit-testing
    const hoverI = this.hover && this.hover.i;
    const hit = [];
    pts24.forEach((p, i) => {
      const r = (hoverI === i) ? 6 : 3.5;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = C.primary; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (hoverI === i) {
        ctx.fillStyle = MOH.hexA(C.primary, 0.18);
        ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill();
      }
      hit.push({ x: p.x, y: p.y, r: 14, i, value: y2024[i].value, label: y2024[i].label });
    });

    // Labels X (tous les 2 mois)
    ctx.fillStyle = C.label; ctx.font = MOH.font(11, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    data.forEach((d, i) => {
      if (i % 2 === 0) ctx.fillText(d.label, xAt(i), this.margins.t + this.ph + 6);
    });

    // Annotation pic soudure (Août)
    const peakIdx = 19; // Août 2024
    const px = pts24[peakIdx - 12].x, py = pts24[peakIdx - 12].y;
    ctx.fillStyle = C.quaternary;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.quaternary; ctx.font = MOH.font(11, 600); ctx.textAlign = 'left';
    ctx.fillText('▲ Pic soudure (+124%)', px + 8, py - 4);

    // Hit testing
    this.hit = (mx, my) => {
      for (const p of hit) {
        const dx = mx - p.x, dy = my - p.y;
        if (dx * dx + dy * dy < p.r * p.r) {
          return { color: C.primary, html: '<b>' + MOH.escape(p.label) + '</b><br>Admissions : <b>' + MOH.fmtInt(p.value) + '</b>' };
        }
      }
      return null;
    };

    // Légende
    if (this.host.parentElement) {
      const foot = this.host.parentElement.querySelector('[data-foot]');
      if (foot && !foot.innerHTML) {
        foot.innerHTML = '<div class="moh-legend"><span class="moh-legend-item"><span class="moh-legend-dot" style="background:#7C3AED"></span>2024</span><span class="moh-legend-item"><span class="moh-legend-dot" style="background:#94A3B8"></span>2023</span><span class="moh-legend-item"><span class="moh-legend-dot" style="background:#F59E0B"></span>Zone de soudure (Juin–Sept)</span></div>';
      }
    }
  };

  /* =========================================================================
   * Graphique 2 — Scatter Sphère (4 quadrants)
   * ========================================================================= */
  MOH.charts.g2 = function (ctx) {
    const state = this._state;
    const countries = state.mode === 'region' ? MOH.COUNTRIES : state.districts;
    // En mode pays, simuler des districts à partir du pays sélectionné
    let pts;
    if (state.mode === 'region') {
      pts = countries.map(c => ({
        label: c.name, x: c.guer * 100, y: c.abandon * 100, size: Math.sqrt(c.adm / 200),
        color: c.guer >= 0.75 && c.abandon <= 0.15 ? C.tertiary : (c.abandon > 0.15 ? C.danger : C.quaternary)
      }));
    } else {
      pts = countries.map((d, i) => ({ label: d.name, x: d.guer * 100, y: d.abandon * 100, size: Math.sqrt(d.adm / 20), color: d.guer >= 0.75 && d.abandon <= 0.15 ? C.tertiary : (d.abandon > 0.15 ? C.danger : C.quaternary) }));
    }
    const xMin = 70, xMax = 100, yMin = 0, yMax = 20;
    const xs = { min: xMin, max: xMax, ticks: [70, 80, 90, 100] };
    const ys = { min: yMin, max: yMax, ticks: [0, 5, 10, 15, 20] };
    // Grille
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.label; ctx.font = MOH.font(11, 500); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ys.ticks.forEach(v => {
      const y = this.gridY(v, yMin, yMax);
      ctx.beginPath(); ctx.moveTo(this.margins.l, y); ctx.lineTo(this.margins.l + this.pw, y); ctx.stroke();
      ctx.fillText(v + '%', this.margins.l - 6, y);
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xs.ticks.forEach(v => {
      const x = this.gridX(v, xMin, xMax);
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(x, this.margins.t); ctx.lineTo(x, this.margins.t + this.ph); ctx.stroke();
      ctx.fillStyle = C.label; ctx.fillText(v + '%', x, this.margins.t + this.ph + 6);
    });
    ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(this.margins.l, this.margins.t + this.ph); ctx.lineTo(this.margins.l + this.pw, this.margins.t + this.ph); ctx.stroke();

    // Quadrants : lignes de référence Sphère
    const thX = this.gridX(75, xMin, xMax); // Guérison ≥75%
    const thY = this.gridY(15, yMin, yMax); // Abandon <15%
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = C.tertiary; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(thX, this.margins.t); ctx.lineTo(thX, this.margins.t + this.ph); ctx.stroke();
    ctx.strokeStyle = C.danger;
    ctx.beginPath(); ctx.moveTo(this.margins.l, thY); ctx.lineTo(this.margins.l + this.pw, thY); ctx.stroke();
    ctx.setLineDash([]);
    // Label quadrants
    ctx.fillStyle = MOH.hexA(C.tertiary, 0.7); ctx.font = MOH.font(10, 600); ctx.textAlign = 'left';
    ctx.fillText('✓ Guérison ≥ 75%', thX + 4, this.margins.t + 12);
    ctx.fillStyle = MOH.hexA(C.danger, 0.7); ctx.textAlign = 'right';
    ctx.fillText('⚠ Abandon > 15%', this.margins.l + this.pw - 4, thY - 4);

    const v = this.visible;
    const hover = this.hover;
    const hit = [];
    pts.forEach((p, i) => {
      const px = this.gridX(p.x, xMin, xMax);
      const py = this.gridY(p.y, yMin, yMax);
      const r = Math.max(4, Math.min(18, p.size)) * v;
      const isHover = hover && hover.i === i;
      if (isHover) {
        ctx.fillStyle = MOH.hexA(p.color, 0.18);
        ctx.beginPath(); ctx.arc(px, py, r + 10, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = MOH.hexA(p.color, 0.75);
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      hit.push({ x: px, y: py, r: r + 6, i, label: p.label, g: p.x.toFixed(1), a: p.y.toFixed(1) });
    });
    this.hit = (mx, my) => {
      for (const p of hit) {
        const dx = mx - p.x, dy = my - p.y;
        if (dx * dx + dy * dy < p.r * p.r) {
          return { color: C.primary, html: '<b>' + MOH.escape(p.label) + '</b><br>Guérison : <b>' + p.g + '%</b><br>Abandon : <b>' + p.a + '%</b>' };
        }
      }
      return null;
    };
  };

  /* =========================================================================
   * Graphique 3 — Stocks ATPE (bullet vertical)
   * ========================================================================= */
  MOH.charts.g3 = function (ctx) {
    const state = this._state;
    const zones = state.mode === 'region' ? MOH.ATPE_STOCKS_ZONES : state.stockZones;
    const n = zones.length;
    const m = this.margins;
    const cw = this.pw / n;
    const bw = Math.min(28, cw * 0.55);
    const v = this.visible;

    // Échelle Y 0..100 jours
    const yMax = 100;
    const ys = MOH.niceScale(0, yMax, 5);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.fillStyle = C.label; ctx.font = MOH.font(11, 500);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ys.ticks.forEach(tv => {
      const y = this.gridY(tv, 0, yMax);
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(m.l + this.pw, y); ctx.stroke();
      ctx.fillText(tv + 'j', m.l - 6, y);
    });
    // Ligne rouge critique 30j
    const yCrit = this.gridY(30, 0, yMax);
    ctx.strokeStyle = C.danger; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(m.l, yCrit); ctx.lineTo(m.l + this.pw, yCrit); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.danger; ctx.font = MOH.font(10, 600); ctx.textAlign = 'left';
    ctx.fillText('⚠ Seuil critique 30 jours', m.l + 4, yCrit - 4);

    // Barres
    const hit = [];
    const hover = this.hover;
    zones.forEach((z, i) => {
      const cx = m.l + i * cw + cw / 2;
      const bx = cx - bw / 2;
      const maxH = this.ph;
      // Cible (60j) : barre de fond grise
      const targetH = (z.cible / yMax) * maxH * v;
      ctx.fillStyle = '#F1F5F9';
      MOH.roundTop(ctx, bx, m.t + this.ph - targetH, bw, targetH, 4); ctx.fill();
      // Valeur réelle
      const jour = Math.max(0, Math.min(yMax, z.jours));
      const valH = (jour / yMax) * maxH * v;
      let color;
      if (jour > 60) color = C.tertiary;
      else if (jour >= 45) color = C.quaternary;
      else if (jour >= 30) color = '#F97316';
      else color = C.danger;
      ctx.fillStyle = color;
      MOH.roundTop(ctx, bx, m.t + this.ph - valH, bw, valH, 6); ctx.fill();
      // Label
      ctx.fillStyle = C.label; ctx.font = MOH.font(10, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.save();
      ctx.translate(cx, m.t + this.ph + 6);
      ctx.rotate(-Math.PI / 8);
      ctx.fillText(z.zone, 0, 0);
      ctx.restore();
      // Valeur au sommet
      ctx.fillStyle = color; ctx.font = MOH.font(10, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(Math.round(jour) + 'j', cx, m.t + this.ph - valH - 3);

      hit.push({ x: bx, y: m.t, w: bw, h: this.ph, i, zone: z.zone, jours: z.jours, cible: z.cible, color });
    });

    this.hit = (mx, my) => {
      for (const h of hit) {
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          return { color: h.color, html: '<b>' + MOH.escape(h.zone) + '</b><br>Stock : <b>' + h.jours + ' jours</b><br>Cible : ' + h.cible + ' jours' };
        }
      }
      return null;
    };
  };

  /* =========================================================================
   * Graphique 4 — Heatmap performance districts
   * ========================================================================= */
  MOH.charts.g4 = function (ctx) {
    const state = this._state;
    const rows = state.mode === 'region' ? MOH.COUNTRIES : state.districts;
    const cols = MOH.HEATMAP_INDICATORS;
    const m = this.margins;
    // Laisser de la place aux labels de lignes à gauche
    const labelW = 90;
    const gridLeft = m.l + labelW;
    const gridW = this.w - gridLeft - m.r - 20;
    const cellW = gridW / cols.length;
    const cellH = (this.ph) / rows.length;
    const v = this.visible;

    // En-têtes colonnes
    ctx.fillStyle = C.label; ctx.font = MOH.font(10, 600);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    cols.forEach((c, i) => {
      ctx.save();
      ctx.translate(gridLeft + i * cellW + cellW / 2, m.t - 2);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(c.label, 0, 0);
      ctx.restore();
    });

    // Labels lignes + cellules
    const hover = this.hover;
    const hit = [];
    rows.forEach((r, ri) => {
      ctx.fillStyle = C.value; ctx.font = MOH.font(11, 500);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(r.name || r.code, gridLeft - 8, m.t + ri * cellH + cellH / 2);
      cols.forEach((c, ci) => {
        let val = r[c.key];
        if (val == null) {
          if (c.key === 'admVol') val = r.adm / (state.mode === 'region' ? 2000 : 200);
          else if (c.key === 'abandon') val = r.abandon || 0.12;
          else if (c.key === 'deces') val = r.deces || 0.03;
          else if (c.key === 'stocks') val = r.stocks != null ? r.stocks : (50 + Math.random() * 20);
          else if (c.key === 'depist') val = r.depist;
          else if (c.key === 'dhis2') val = r.dhis2;
          else if (c.key === 'score') val = r.score;
          else if (c.key === 'guer') val = r.guer;
        }
        // Normalisation en 0..1
        let norm;
        if (c.key === 'guer') norm = (val - 0.7) / 0.3;
        else if (c.key === 'abandon') norm = 1 - (val - 0.02) / 0.2;
        else if (c.key === 'deces') norm = 1 - (val) / 0.08;
        else if (c.key === 'depist') norm = val;
        else if (c.key === 'stocks') norm = val / 100;
        else if (c.key === 'dhis2') norm = val;
        else if (c.key === 'admVol') norm = Math.min(1, val / (state.mode === 'region' ? 80 : 100));
        else norm = val / 100;
        norm = Math.max(0, Math.min(1, norm)) * v;
        const color = MOH.scaleColor(MOH.HEATMAP_STOPS, norm);
        const x = gridLeft + ci * cellW + 2, y = m.t + ri * cellH + 2;
        const w = cellW - 4, h = cellH - 4;
        ctx.fillStyle = color;
        MOH.roundRect(ctx, x, y, w, h, 4); ctx.fill();
        if (hover && hover.ri === ri && hover.ci === ci) {
          ctx.strokeStyle = C.primary; ctx.lineWidth = 2;
          MOH.roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 5); ctx.stroke();
        }
        hit.push({ x, y, w, h, ri, ci, name: r.name || r.code, ind: c.label, val, inv: c.inv });
      });
    });

    this.hit = (mx, my) => {
      for (const h of hit) {
        if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
          const displayVal = (h.ind === 'Guérison %' || h.ind === 'Abandon %' || h.ind === 'Décès %' || h.ind === 'Dépistage' || h.ind === 'Synchro %') ? (h.val * 100).toFixed(1) + '%' : (h.ind === 'Stocks j.' ? Math.round(h.val) + ' jours' : (h.ind === 'Score App' ? Math.round(h.val) : MOH.fmtInt(h.val)));
          return { color: C.primary, html: '<b>' + MOH.escape(h.name) + '</b><br>' + MOH.escape(h.ind) + ' : <b>' + displayVal + '</b>' };
        }
      }
      return null;
    };
  };

  /* =========================================================================
   * Graphique 5 — Polar Chart saisonnalité 3 années
   * ========================================================================= */
  MOH.charts.g5 = function (ctx) {
    const v = this.visible;
    const cx = (this.margins.l + this.w - this.margins.r) / 2;
    const cy = (this.margins.t + this.h - this.margins.b) / 2;
    const maxR = Math.min(this.pw, this.ph) / 2 - 20;
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const years = MOH.POLAR_YEARS;
    const colors = [MOH.hexA('#94A3B8', 0.4), MOH.hexA(C.secondary, 0.55), MOH.hexA(C.primary, 0.7)];
    const baseVals = [0.55,0.5,0.55,0.65,0.8,1.2,1.45,1.4,1.15,0.85,0.7,0.6];
    const yearFactor = [1, 1.08, 1.18];
    const allPts = [];

    // Grille circulaire
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(f => {
      ctx.beginPath(); ctx.arc(cx, cy, maxR * f, 0, Math.PI * 2); ctx.stroke();
    });
    // Axes mois
    ctx.strokeStyle = C.grid;
    months.forEach((m, i) => {
      const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR); ctx.stroke();
    });
    // Labels mois
    ctx.fillStyle = C.label; ctx.font = MOH.font(10, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    months.forEach((m, i) => {
      const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
      const lx = cx + Math.cos(a) * (maxR + 12);
      const ly = cy + Math.sin(a) * (maxR + 12);
      ctx.fillText(m, lx, ly);
    });

    years.forEach((yr, yi) => {
      const pts = [];
      months.forEach((m, i) => {
        const val = baseVals[i] * yearFactor[yi];
        const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
        const r = (val / 1.6) * maxR * v;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a, r, m, val, yr });
      });
      allPts.push({ pts, color: colors[yi], yr });
      ctx.fillStyle = colors[yi];
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = colors[yi].replace(/[\d.]+\)$/, '1)'); ctx.lineWidth = 1.8;
      ctx.stroke();
    });

    // Légende
    if (this.host.parentElement) {
      const foot = this.host.parentElement.querySelector('[data-foot]');
      if (foot && !foot.innerHTML) {
        foot.innerHTML = '<div class="moh-legend">' +
          years.map((y, i) => '<span class="moh-legend-item"><span class="moh-legend-dot" style="background:' + [ '#94A3B8', C.secondary, C.primary ][i] + '"></span>' + y + '</span>').join('') +
          '</div>';
      }
    }

    const hover = this.hover;
    if (hover) {
      const p = hover.p;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    this.hit = (mx, my) => {
      const dx = mx - cx, dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxR + 14) return null;
      let ang = Math.atan2(dy, dx) + Math.PI / 2;
      if (ang < 0) ang += Math.PI * 2;
      const mi = Math.floor((ang / (Math.PI * 2)) * 12) % 12;
      // Retourne le mois + l'année la plus récente
      const p = allPts[2].pts[mi];
      return { color: C.primary, html: '<b>' + p.m + ' ' + p.yr + '</b><br>Signalements : <b>' + MOH.fmtInt(p.val * 32000) + '</b>', p };
    };
  };
})(window);
