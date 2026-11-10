/* ============================================================================
 * NutriTracker · charts/charts-special.js
 * Graphiques spécifiques (Canvas pur) :
 *   G13 timeline1000 — Infographie interactive des 1000 premiers jours
 *   G14 microGauges  — 6 semi-jauges micronutriments (objectif 80 %)
 *   KPI : kpiSpark, kpiGauge (arc 270°), kpiBars, kpiProgress, kpiDonut
 *   G15 : tableSpark (mini-sparklines du tableau scorecard)
 * ========================================================================== */
(function (global) {
  'use strict';
  const NT = global.NutriTracker;
  const C = NT.COLORS;

  /* =========================================================================
   * G13 — Timeline des 1000 premiers jours de l'enfant
   * ======================================================================= */
  const PHASES = [
    { from: 0, to: 270, label: 'Grossesse · 270 j', color: '#EC4899' },
    { from: 270, to: 450, label: '0 – 6 mois', color: '#0066CC' },
    { from: 450, to: 1000, label: '6 – 24 mois', color: '#00A86B' }
  ];
  NT.registerChart('timeline1000', {
    draw(ch, ctx, W, H, p) {
      const ms = ch.data.milestones;
      const pad = 34;
      const lineY = H - 100;
      const xOf = (day) => pad + (day / 1000) * (W - pad * 2);
      const e = NT.ease(p);
      const head = 1000 * e; // progression du "curseur" de suivi

      /* Phases colorées */
      PHASES.forEach((ph) => {
        const x0 = xOf(ph.from), x1 = xOf(ph.to);
        ctx.fillStyle = NT.hexA(ph.color, 0.06);
        NT.roundRect(ctx, x0 + 1, 8, x1 - x0 - 2, lineY + 46, 10); ctx.fill();
        ctx.fillStyle = NT.hexA(ph.color, 0.5); ctx.fillRect(x0 + 1, lineY + 64, x1 - x0 - 2, 2);
        ctx.font = NT.font(10, 700); ctx.fillStyle = NT.hexA(ph.color, 0.9); ctx.textAlign = 'center';
        ctx.fillText(ph.label.toUpperCase(), (x0 + x1) / 2, lineY + 82);
      });
      /* Ligne de fond + ligne de progression en dégradé */
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(xOf(0), lineY); ctx.lineTo(xOf(1000), lineY); ctx.stroke();
      const g = ctx.createLinearGradient(xOf(0), 0, xOf(1000), 0);
      g.addColorStop(0, '#EC4899'); g.addColorStop(0.3, '#0066CC'); g.addColorStop(0.5, '#0099FF'); g.addColorStop(1, '#00A86B');
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(xOf(0), lineY); ctx.lineTo(xOf(head), lineY); ctx.stroke();
      ctx.lineCap = 'butt';

      const maxBarH = lineY - 66;
      ms.forEach((m, i) => {
        const x = xOf(m.day);
        const reached = head >= m.day - 1;
        const k = reached ? NT.clamp((head - m.day) / 140 + (m.day === 1000 && e >= 1 ? 1 : 0), 0, 1) : 0;
        const kk = m.day === 1000 ? (e >= 0.98 ? 1 : 0) : NT.ease(k);
        const isHover = ch.hover === 'm' + i;
        const isSel = ch.selected === i;
        /* Barres doubles : sans / avec rappels automatiques */
        const bw = Math.min(16, (W - pad * 2) / 30);
        const hWithout = (m.without / 100) * maxBarH * kk, hWith = (m.with / 100) * maxBarH * kk;
        ctx.fillStyle = '#CBD5E1'; NT.roundTop(ctx, x - bw - 2, lineY - 22 - hWithout, bw, hWithout, 5); ctx.fill();
        const bg = ctx.createLinearGradient(0, lineY - 22 - hWith, 0, lineY - 22);
        bg.addColorStop(0, '#00A86B'); bg.addColorStop(1, '#34D399');
        ctx.fillStyle = bg; NT.roundTop(ctx, x + 2, lineY - 22 - hWith, bw, hWith, 5); ctx.fill();
        if (kk > 0.6) {
          ctx.font = NT.font(11, 800); ctx.fillStyle = '#047857'; ctx.textAlign = 'center';
          ctx.fillText('+' + (m.with - m.without) + ' pts', x, lineY - 28 - hWith - 4);
        }
        /* Jalon */
        const r = 11 + (isHover ? 3 * ch.hoverT : 0);
        if (isHover || isSel) { ctx.beginPath(); ctx.arc(x, lineY, r + 7, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,102,204,0.15)'; ctx.fill(); }
        ctx.beginPath(); ctx.arc(x, lineY, r, 0, Math.PI * 2);
        ctx.fillStyle = reached ? (isSel ? '#0066CC' : '#FFFFFF') : '#F1F5F9'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = reached ? '#0066CC' : '#CBD5E1'; ctx.stroke();
        ctx.font = NT.font(11, 800); ctx.fillStyle = isSel ? '#FFFFFF' : reached ? '#0066CC' : '#94A3B8';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), x, lineY + 0.5); ctx.textBaseline = 'alphabetic';
        /* Libellés sous la ligne */
        ctx.font = NT.font(11, 700); ctx.fillStyle = C.title;
        ctx.fillText(m.short, x, lineY + 30);
        ctx.font = NT.font(10, 500); ctx.fillStyle = C.label;
        ctx.fillText('J' + m.day, x, lineY + 44);
        ch.hit({ type: 'rect', key: 'm' + i, x: x - 30, y: 0, w: 60, h: lineY + 50, clickable: true, index: i,
          tip: { title: m.label, sub: 'Jour ' + m.day + ' du parcours', color: '#00A86B', rows: [
            { color: '#CBD5E1', label: 'Sans rappels App', value: m.without + '%' },
            { color: '#00A86B', label: 'Avec rappels automatiques', value: m.with + '%' },
            { label: 'Gain', value: '+' + (m.with - m.without) + ' pts' }], note: 'Cliquer pour le détail' } });
      });
      /* Curseur animé (tête de progression) */
      if (e < 1) { ctx.beginPath(); ctx.arc(xOf(head), lineY, 6, 0, Math.PI * 2); ctx.fillStyle = '#0066CC'; ctx.fill(); }
    },
    onClick(hit, ch) {
      if (hit.index == null) return;
      ch.selected = hit.index;
      ch.refresh();
      if (ch.onSelect) ch.onSelect(hit.index);
    }
  });

  /* =========================================================================
   * G14 — Semi-jauges de couverture des micronutriments
   * ======================================================================= */
  const gaugeColor = (v, target) => (v >= target ? '#10B981' : v >= target - 20 ? '#F59E0B' : '#EF4444');
  NT.registerChart('microGauges', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; const n = d.gauges.length;
      const cols = W >= 560 ? 3 : 2;
      const rowsN = Math.ceil(n / cols);
      const cw = W / cols, chh = H / rowsN;
      d.gauges.forEach((gz, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const cx = cw * col + cw / 2;
        const R = Math.min(cw / 2 - 18, chh * 0.62);
        const cy = chh * row + R + 18;
        const k = NT.stagger(p, i, n, 0.4);
        const v = gz.value * k;
        const color = gaugeColor(gz.value, d.target);
        const isHover = ch.hover === 'g' + i;
        const lw = Math.max(10, R * 0.2);
        /* Piste */
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, Math.PI * 2);
        ctx.strokeStyle = '#EEF2F7'; ctx.lineWidth = lw; ctx.stroke();
        /* Remplissage */
        const grad = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
        grad.addColorStop(0, NT.hexA(color, 0.6)); grad.addColorStop(1, color);
        ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * (v / 100));
        ctx.strokeStyle = grad; ctx.lineWidth = lw + (isHover ? 3 * ch.hoverT : 0); ctx.stroke();
        ctx.lineCap = 'butt';
        /* Marqueur objectif 80 % */
        const ta = Math.PI + Math.PI * (d.target / 100);
        ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(ta) * (R - lw / 2 - 4), cy + Math.sin(ta) * (R - lw / 2 - 4));
        ctx.lineTo(cx + Math.cos(ta) * (R + lw / 2 + 4), cy + Math.sin(ta) * (R + lw / 2 + 4)); ctx.stroke();
        ctx.font = NT.font(9, 700); ctx.fillStyle = '#1E293B'; ctx.textAlign = 'left';
        ctx.fillText('80%', cx + Math.cos(ta) * (R + lw / 2 + 6), cy + Math.sin(ta) * (R + lw / 2 + 6) - 2);
        /* Valeur + libellé */
        ctx.textAlign = 'center';
        ctx.font = NT.font(Math.max(16, Math.min(24, R * 0.42)), 800); ctx.fillStyle = C.title;
        ctx.fillText(Math.round(v) + '%', cx, cy - 4);
        ctx.font = NT.font(12, 600); ctx.fillStyle = C.value;
        ctx.fillText(gz.label, cx, cy + 18);
        ctx.font = NT.font(10, 600); ctx.fillStyle = color;
        const gap = Math.round((gz.value - d.target) * 10) / 10;
        ctx.fillText(gap >= 0 ? 'Objectif atteint' : 'Écart : ' + gap + ' pts', cx, cy + 32);
        ch.hit({ type: 'rect', key: 'g' + i, x: cw * col, y: chh * row, w: cw, h: chh,
          tip: { title: gz.label, sub: 'Couverture enregistrée dans l’App', color, rows: [
            { color, label: 'Couverture actuelle', value: gz.value + '%' }, { label: 'Objectif', value: d.target + '%' },
            { label: 'Écart', value: (gap >= 0 ? '+' : '−') + Math.abs(gap) + ' pts' }] } });
      });
    }
  });

  /* =========================================================================
   * KPI 1 — Mini sparkline 12 mois
   * ======================================================================= */
  NT.registerChart('kpiSpark', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data; const v = d.values; const n = v.length;
      const min = Math.min.apply(null, v), max = Math.max.apply(null, v);
      const pad = 6;
      const xOf = (i) => pad + (i / (n - 1)) * (W - pad * 2);
      const yOf = (x) => pad + (1 - (x - min) / (max - min || 1)) * (H - pad * 2);
      const pts = v.map((x, i) => ({ x: xOf(i), y: yOf(x) }));
      const e = NT.ease(p);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * e, H); ctx.clip();
      ctx.beginPath(); NT.smoothPath(ctx, pts); ctx.lineTo(pts[n - 1].x, H); ctx.lineTo(pts[0].x, H); ctx.closePath();
      ctx.fillStyle = NT.vGradient(ctx, 0, H, d.color, 0.25, 0); ctx.fill();
      ctx.beginPath(); NT.smoothPath(ctx, pts); ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      const hi = ch.hover ? +ch.hover.slice(1) : n - 1;
      if (p >= 1) NT.point(ctx, pts[hi].x, pts[hi].y, d.color, ch.hover ? ch.hoverT : 0);
      pts.forEach((pt, i) => ch.hit({ type: 'rect', key: 's' + i, x: pt.x - (W / n) / 2, y: 0, w: W / n, h: H,
        tip: { title: NT.model.MONTHS_LONG[i], color: d.color, rows: [{ color: d.color, label: d.label, value: NT.fmtPct(v[i]) }] } }));
    }
  });

  /* =========================================================================
   * KPI 2 — Mini jauge circulaire (arc 270°) + trait de seuil critique
   * ======================================================================= */
  NT.registerChart('kpiGauge', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const cx = W / 2, cy = H / 2 + 4;
      const R = Math.min(W, H) / 2 - 8;
      const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
      const e = NT.ease(p);
      const frac = NT.clamp(d.value / d.max, 0, 1) * e;
      const color = d.value >= d.threshold ? '#EF4444' : '#FF6B35';
      ctx.lineCap = 'round'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + span); ctx.strokeStyle = '#FFEDD5'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + span * Math.max(0.001, frac)); ctx.strokeStyle = color; ctx.stroke();
      ctx.lineCap = 'butt';
      /* Seuil critique (10 %) */
      const ta = a0 + span * (d.threshold / d.max);
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(ta) * (R - 9), cy + Math.sin(ta) * (R - 9)); ctx.lineTo(cx + Math.cos(ta) * (R + 9), cy + Math.sin(ta) * (R + 9)); ctx.stroke();
      ctx.font = NT.font(12, 800); ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.fillText((d.value * e).toFixed(1), cx, cy + 2);
      ctx.font = NT.font(8, 600); ctx.fillStyle = C.label; ctx.fillText('/ ' + d.max + '%', cx, cy + 13);
      ch.hit({ type: 'rect', key: 'g', x: 0, y: 0, w: W, h: H, tip: { title: 'MAG · dépistage PB', color, rows: [
        { color, label: 'Prévalence', value: NT.fmtPct(d.value) }, { color: '#EF4444', label: 'Seuil d’alerte', value: d.threshold + '%' }] } });
    }
  });

  /* =========================================================================
   * KPI 3 — Mini barres d'activité mensuelle des agents
   * ======================================================================= */
  NT.registerChart('kpiBars', {
    draw(ch, ctx, W, H, p) {
      const v = ch.data.values; const n = v.length;
      const max = Math.max.apply(null, v);
      const gap = 3; const bw = (W - gap * (n - 1)) / n;
      v.forEach((x, i) => {
        const k = NT.stagger(p, i, n, 0.5);
        const h = Math.max(2, (x / max) * (H - 4) * k);
        const isH = ch.hover === 'b' + i;
        ctx.fillStyle = i === n - 1 || isH ? '#0066CC' : NT.hexA('#0066CC', 0.28);
        NT.roundTop(ctx, i * (bw + gap), H - h, bw, h, Math.min(6, bw / 2)); ctx.fill();
        ch.hit({ type: 'rect', key: 'b' + i, x: i * (bw + gap), y: 0, w: bw + gap, h: H,
          tip: { title: NT.model.MONTHS_LONG[i], sub: 'Activité agents terrain', color: '#0066CC', rows: [{ color: '#0066CC', label: 'Visites synchronisées', value: NT.fmtInt(x) }] } });
      });
    }
  });

  /* =========================================================================
   * KPI 4 — Barre de progression arrondie + trait pointillé à la cible
   * ======================================================================= */
  NT.registerChart('kpiProgress', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const y = 10, h = 12;
      ctx.fillStyle = '#E8F5E9'; NT.roundRect(ctx, 0, y, W, h, 6); ctx.fill();
      const w = Math.max(h, (d.value / 100) * W * NT.ease(p));
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#34D399'); g.addColorStop(1, '#00A86B');
      ctx.fillStyle = g; NT.roundRect(ctx, 0, y, w, h, 6); ctx.fill();
      const tx = (d.target / 100) * W;
      ctx.save(); ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(tx, y - 7); ctx.lineTo(tx, y + h + 7); ctx.stroke(); ctx.restore();
      ctx.font = NT.font(10, 700); ctx.fillStyle = '#1E293B'; ctx.textAlign = 'center';
      ctx.fillText('Cible ' + d.target + '%', NT.clamp(tx, 26, W - 26), y + h + 19);
      ch.hit({ type: 'rect', key: 'p', x: 0, y: 0, w: W, h: H, tip: { title: 'Couverture Vitamine A & déparasitage', color: '#00A86B', rows: [
        { color: '#00A86B', label: 'Atteint', value: NT.fmtPct(d.value) }, { label: 'Cible campagne', value: d.target + '%' }, { label: 'Reste à couvrir', value: Math.max(0, d.target - d.value).toFixed(1) + ' pts' }] } });
    }
  });

  /* =========================================================================
   * KPI 5 — Mini donut de sévérité (sévère / modéré / sous contrôle)
   * ======================================================================= */
  NT.registerChart('kpiDonut', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const parts = [
        { key: 'severe', label: 'Sévère', value: d.severe, color: '#EF4444' },
        { key: 'moderate', label: 'Modéré', value: d.moderate, color: '#FF6B35' },
        { key: 'controlled', label: 'Sous contrôle', value: d.controlled, color: '#10B981' }
      ];
      const total = parts.reduce((a, b) => a + b.value, 0) || 1;
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 3, r0 = R * 0.58;
      let a = -Math.PI / 2; const e = NT.ease(p);
      parts.forEach((pt) => {
        const span = (pt.value / total) * Math.PI * 2 * e;
        if (span <= 0) return;
        const isH = ch.hover === pt.key;
        ctx.beginPath(); ctx.arc(cx, cy, R + (isH ? 2 : 0), a + 0.03, a + span - 0.03); ctx.arc(cx, cy, r0, a + span - 0.03, a + 0.03, true); ctx.closePath();
        ctx.fillStyle = pt.color; ctx.fill();
        ch.hit({ type: 'arc', key: pt.key, cx, cy, r0, r1: R + 4, a0: a, a1: a + span,
          tip: { title: pt.label, color: pt.color, rows: [{ color: pt.color, label: 'Zones', value: pt.value + ' / ' + total }] } });
        a += span;
      });
      ctx.font = NT.font(11, 800); ctx.fillStyle = C.title; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(total), cx, cy + 0.5); ctx.textBaseline = 'alphabetic';
    }
  });

  /* =========================================================================
   * G15 — Mini sparkline 5 ans (cellules du tableau scorecard)
   * ======================================================================= */
  NT.registerChart('tableSpark', {
    draw(ch, ctx, W, H, p) {
      const v = ch.data.values; if (!v || v.length < 2) return;
      const n = v.length; const min = Math.min.apply(null, v), max = Math.max.apply(null, v);
      const up = v[n - 1] >= v[0];
      const color = up ? '#10B981' : '#EF4444';
      const xOf = (i) => 4 + (i / (n - 1)) * (W - 8);
      const yOf = (x) => 4 + (1 - (x - min) / (max - min || 1)) * (H - 8);
      const pts = v.map((x, i) => ({ x: xOf(i), y: yOf(x) }));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * NT.ease(p), H); ctx.clip();
      ctx.beginPath(); NT.smoothPath(ctx, pts); ctx.lineTo(pts[n - 1].x, H); ctx.lineTo(pts[0].x, H); ctx.closePath();
      ctx.fillStyle = NT.vGradient(ctx, 0, H, color, 0.22, 0); ctx.fill();
      ctx.beginPath(); NT.smoothPath(ctx, pts); ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.restore();
      if (p >= 1) { ctx.beginPath(); ctx.arc(pts[n - 1].x, pts[n - 1].y, 2.6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
      ch.hit({ type: 'rect', key: 't', x: 0, y: 0, w: W, h: H, tip: { title: 'Score global 2020 → 2024', color,
        rows: v.map((x, i) => ({ label: String(2020 + i), value: String(x) })) } });
    }
  });
})(window);
