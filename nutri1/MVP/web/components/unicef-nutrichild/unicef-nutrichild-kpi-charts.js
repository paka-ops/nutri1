/* ============================================================================
 * UNICEF NutriChild · unicef-nutrichild-kpi-charts.js
 * Rôle : micro-visualisations embarquées dans les 5 KPI cards + sparkline
 *        réutilisable par la scorecard (G15).
 *   · kpiBars      — barres de répartition (sous-régions ou districts) — KPI 1
 *   · kpiGauge     — jauge circulaire rouge-orange de l'allaitement exclusif — KPI 2
 *   · kpiSpark     — sparkline 12 mois du taux de guérison CRENAS — KPI 3
 *   · kpiProgress  — barre de progression + trait d'objectif à 80 % — KPI 4
 *   · kpiMonthly   — barres mensuelles des admissions CRENAS — KPI 5
 * 100 % Canvas 2D.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  const C = NC.COLORS;

  /* =========================================================================
   * KPI 1 — Barres de répartition (par sous-région ou par district)
   * ======================================================================= */
  NC.registerChart('kpiBars', {
    label: 'Répartition des enfants dépistés',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const items = d.items.slice(0, 6);
      const n = items.length;
      const maxV = Math.max.apply(null, items.map((i) => i.value)) || 1;
      const labelZone = 23;                       // bande réservée aux libellés
      const gap = 6;
      const bw = Math.max(10, (W - gap * (n - 1)) / n);
      const baseY = H - labelZone;
      /* 13 px réservés au-dessus de la plus haute barre pour la valeur chiffrée */
      const maxH = baseY - 15;
      /* Les libellés restent horizontaux : ils sont volontairement très courts
       * (≤ 7 caractères, fournis par le modèle) pour tenir sous chaque barre. */
      const showValue = bw >= 34;

      items.forEach((it, i) => {
        /* Échelle racine carrée : les petits périmètres (Cap-Vert, Insulaire)
         * restent visibles face aux très gros volumes (Golfe de Guinée). */
        const ratio = Math.sqrt(Math.max(0, it.value) / maxV);
        const h = Math.max(3, ratio * maxH) * NC.stagger(p, i, n, 0.5);
        const x = i * (bw + gap);
        const key = 'k' + i;
        const isHover = ch.hover === key;
        const col = d.color || C.primary;
        ctx.save();
        /* Piste de fond */
        ctx.fillStyle = '#F1F5F9';
        NC.roundTop(ctx, x, 6, bw, baseY - 6, 5); ctx.fill();
        /* Barre animée */
        const g = ctx.createLinearGradient(0, baseY - h, 0, baseY);
        g.addColorStop(0, NC.hexA(col, isHover ? 1 : 0.88));
        g.addColorStop(1, NC.hexA(col, isHover ? 0.78 : 0.42));
        ctx.fillStyle = g;
        NC.roundTop(ctx, x, baseY - h, bw, h, 5); ctx.fill();
        ctx.restore();

        /* Valeur au-dessus de la barre (si la place le permet) */
        if (showValue) {
          ctx.save();
          ctx.font = NC.font(8.5, 800);
          ctx.fillStyle = isHover ? col : NC.hexA(col, 0.85);
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillText(NC.ellipsis(ctx, NC.fmtCompact(it.value, 1), bw + 6), x + bw / 2, baseY - h - 3);
          ctx.restore();
        }
        /* Libellé court sous la barre */
        const short = it.short || (it.label || '').split(' ')[0];
        ctx.save();
        ctx.font = NC.font(9, 600);
        ctx.fillStyle = isHover ? C.title : C.label;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(NC.ellipsis(ctx, short, bw + 4), x + bw / 2, baseY + 4);
        ctx.restore();

        ch.hit({
          type: 'rect', key: key, x: x, y: 4, w: bw, h: baseY - 4,
          tip: {
            title: it.label, sub: d.subtitle || 'Répartition du périmètre',
            color: col,
            rows: [
              { label: d.unit || 'Valeur', value: NC.fmtInt(it.value) + (d.suffix || '') },
              { label: 'Part du total', value: NC.fmtDec((it.value / (items.reduce((s, o) => s + o.value, 0) || 1)) * 100, 1) + ' %' }
            ],
            note: 'Hauteur des barres ∝ racine du volume (lisibilité des petits périmètres)'
          }
        });
      });
    }
  });

  /* =========================================================================
   * KPI 2 — Jauge circulaire (allaitement exclusif, niveau insuffisant)
   * ======================================================================= */
  NC.registerChart('kpiGauge', {
    label: 'Jauge du taux d’allaitement exclusif',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const maxR = Math.min(W - 30, (H - 12) / 2);
      const cx = W / 2, cy = H / 2 + (H > 150 ? 10 : 2);
      const r1 = maxR, r0 = maxR * 0.62;
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;         // 270° de course
      const span = a1 - a0;
      const value = NC.clamp(d.value, 0, 100);
      const target = NC.clamp(d.objective || 70, 0, 100);

      /* Piste de fond */
      ctx.save();
      ctx.strokeStyle = '#EEF2F7';
      ctx.lineWidth = r1 - r0; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(cx, cy, (r0 + r1) / 2, a0, a1); ctx.stroke();
      ctx.restore();

      /* Arc de valeur : dégradé rouge → orange selon le niveau */
      const col = value < 30 ? '#E5243B' : value < 50 ? '#F26A11' : '#F26A21';
      const av = a0 + (value / 100) * span * (0.2 + 0.8 * e);
      ctx.save();
      const g = ctx.createLinearGradient(cx - r1, cy, cx + r1, cy);
      g.addColorStop(0, '#E5243B');
      g.addColorStop(0.55, '#F26A21');
      g.addColorStop(1, '#DDA63A');
      ctx.strokeStyle = g;
      ctx.lineWidth = r1 - r0; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, (r0 + r1) / 2, a0, av); ctx.stroke();
      ctx.restore();

      /* Repère de l'objectif OMS */
      const at = a0 + (target / 100) * span;
      ctx.save();
      ctx.strokeStyle = C.primary; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(at) * (r0 - 2), cy + Math.sin(at) * (r0 - 2));
      ctx.lineTo(cx + Math.cos(at) * (r1 + 2), cy + Math.sin(at) * (r1 + 2));
      ctx.stroke();
      if (maxR > 48) {
        ctx.font = NC.font(9, 700); ctx.fillStyle = C.primary;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('OMS ' + target + '%', cx + Math.cos(at) * (r1 + 18), cy + Math.sin(at) * (r1 + 18));
      }
      ctx.restore();

      /* Valeur au centre — variante compacte dans les KPI cards (anneau réduit) */
      const compact = maxR < 48;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = NC.font(compact ? 17 : 20, 800);
      ctx.fillStyle = col;
      ctx.fillText(NC.fmtDec(d.value, 0) + '%', cx, cy - (compact ? 1 : 4));
      ctx.font = NC.font(compact ? 8 : 9.5, 700); ctx.fillStyle = C.label;
      ctx.fillText(compact ? 'CIBLE ' + target + '%' : 'OBJECTIF ' + target + '%', cx, cy + (compact ? 13 : 14));
      ctx.restore();

      ch.hit({
        type: 'pt', key: 'gauge', x: cx, y: cy, r: r1 + 4,
        tip: {
          title: 'Allaitement exclusif 0-6 mois',
          sub: 'Questionnaire ménage saisi dans l’App',
          color: col,
          rows: [
            { label: 'Taux mesuré', value: NC.fmtDec(value, 0) + ' %' },
            { label: 'Objectif OMS', value: target + ' %' },
            { label: 'Écart', value: '−' + NC.fmtDec(target - value, 0) + ' pts' }
          ],
          note: value < 30 ? 'Niveau insuffisant — priorité de plaidoyer' : 'Progression à soutenir'
        }
      });
    }
  });

  /* =========================================================================
   * KPI 3 — Sparkline du taux de guérison (12 mois)
   * ======================================================================= */
  NC.registerChart('kpiSpark', {
    label: 'Progression du taux de guérison sur 12 mois',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const vals = d.values;
      const n = vals.length;
      const pad = 6;
      const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      const sc = { min: min - (max - min) * 0.5 - 0.4, max: max + (max - min) * 0.5 + 0.4 };
      const xOf = (i) => pad + (i / (n - 1)) * (W - pad * 2);
      const yOf = (v) => H - 6 - ((v - sc.min) / (sc.max - sc.min)) * (H - 14);

      /* Aire dégradée + courbe bézier */
      const pts = vals.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W * (0.15 + 0.85 * e), H); ctx.clip();
      ctx.beginPath(); NC.smoothPath(ctx, pts);
      ctx.lineTo(pts[n - 1].x, H); ctx.lineTo(pts[0].x, H); ctx.closePath();
      ctx.fillStyle = NC.vGradient(ctx, yOf(max), H, C.secondary, 0.28, 0.01);
      ctx.fill();
      ctx.beginPath(); NC.smoothPath(ctx, pts);
      ctx.strokeStyle = C.secondary; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      /* Seuil Sphère 75 % */
      if (sc.min < 75 && sc.max > 75) {
        NC.dashedLine(ctx, pad, yOf(75), W - pad, yOf(75), NC.hexA(C.primary, 0.75), null);
      }

      /* Point terminal mis en avant */
      const last = pts[n - 1];
      NC.point(ctx, last.x, last.y, C.secondary, ch.hover === 'last' ? 1 : 0, 4);

      /* Zone de survol par mois */
      vals.forEach((v, i) => {
        const x0 = i === 0 ? 0 : (xOf(i - 1) + xOf(i)) / 2;
        const x1 = i === n - 1 ? W : (xOf(i) + xOf(i + 1)) / 2;
        ch.hit({
          type: 'rect', key: 's' + i, x: x0, y: 0, w: x1 - x0, h: H,
          tip: {
            title: (d.labels ? d.labels[i] : 'Mois ' + (i + 1)) + ' 2024',
            sub: 'Taux de guérison CRENAS',
            color: C.secondary,
            rows: [
              { label: 'Taux de guérison', value: NC.fmtDec(v, 1) + ' %' },
              { label: 'Seuil d’excellence Sphère', value: '≥ 75 %' },
              { label: 'Statut', value: v >= 75 ? '✓ Conforme' : '⚠ Sous le seuil' }
            ]
          }
        });
      });
    }
  });

  /* =========================================================================
   * KPI 4 — Barre de progression + trait d'objectif (Vitamine A)
   * ======================================================================= */
  NC.registerChart('kpiProgress', {
    label: 'Barre de progression de la couverture Vitamine A',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const y = H / 2 - 5;
      const h = 11;
      const obj = d.objective || 80;

      /* Piste */
      ctx.save();
      ctx.fillStyle = '#E8F6FE';
      NC.roundRect(ctx, 0, y, W, h, 6); ctx.fill();
      /* Progression cyan */
      const w = (W * NC.clamp(d.value, 0, 100)) / 100 * (0.15 + 0.85 * e);
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, C.primary);
      g.addColorStop(1, C.primary2);
      ctx.fillStyle = g;
      NC.roundRect(ctx, 0, y, Math.max(2, w), h, 6); ctx.fill();
      /* Trait pointillé de l'objectif */
      const xt = (W * obj) / 100;
      ctx.strokeStyle = C.tertiary; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(xt, y - 5); ctx.lineTo(xt, y + h + 5); ctx.stroke();
      ctx.setLineDash([]);
      /* Valeur + objectif */
      ctx.font = NC.font(11, 800); ctx.fillStyle = C.title;
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(NC.fmtDec(d.value, 0) + '%', 2, y - 3);
      ctx.font = NC.font(9.5, 700); ctx.fillStyle = C.tertiary;
      ctx.textAlign = 'right';
      ctx.fillText('Objectif ' + obj + '%', W - 2, y - 3);
      /* Étiquette du pays ou de la région en cours */
      if (d.label) {
        ctx.font = NC.font(9.5, 600); ctx.fillStyle = C.label;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(d.label, 2, y + h + 5);
      }
      ctx.restore();

      ch.hit({
        type: 'rect', key: 'prog', x: 0, y: y - 8, w: W, h: h + 16,
        tip: {
          title: 'Supplémentation Vitamine A',
          sub: 'Enfants de 6 à 59 mois · campagne enregistrée dans l’App',
          color: C.primary,
          rows: [
            { label: 'Couverture actuelle', value: NC.fmtDec(d.value, 0) + ' %' },
            { label: 'Objectif régional', value: obj + ' %' },
            { label: 'Écart', value: (d.value >= obj ? '+' : '−') + NC.fmtDec(Math.abs(d.value - obj), 0) + ' pts' },
            { label: 'Pays en conformité', value: (d.conformes || 0) + ' / 16' }
          ]
        }
      });
    }
  });

  /* =========================================================================
   * KPI 5 — Barres mensuelles des admissions (12 derniers mois)
   * ======================================================================= */
  NC.registerChart('kpiMonthly', {
    label: 'Admissions mensuelles CRENAS des douze derniers mois',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const vals = d.values;
      const n = vals.length;
      const gap = 3;
      const bw = Math.max(3, (W - gap * (n - 1)) / n);
      const maxV = Math.max.apply(null, vals) || 1;
      const baseY = H - 12;
      const cur = d.activeIndex == null ? n - 1 : d.activeIndex;

      vals.forEach((v, i) => {
        const h = (v / maxV) * (H - 20) * (0.25 + 0.75 * NC.stagger(p, i, n, 0.6));
        const x = i * (bw + gap);
        const key = 'm' + i;
        const isHover = ch.hover === key;
        const isCur = i === cur;
        const col = isCur ? C.primary : isHover ? C.primary2 : NC.hexA(C.primary, 0.42);
        ctx.save();
        /* Piste */
        ctx.fillStyle = '#F4F9FD';
        NC.roundTop(ctx, x, 6, bw, baseY - 6, 3); ctx.fill();
        ctx.fillStyle = col;
        NC.roundTop(ctx, x, baseY - h, bw, h, 3); ctx.fill();
        /* Mois courant : liseré plein */
        if (isCur) {
          ctx.strokeStyle = NC.hexA(C.primary, 0.9); ctx.lineWidth = 1;
          NC.roundTop(ctx, x, baseY - h, bw, h, 3); ctx.stroke();
        }
        ctx.restore();
        ch.hit({
          type: 'rect', key: key, x: x - 1, y: 0, w: bw + 2, h: baseY,
          tip: {
            title: (d.labels ? d.labels[i] : 'Mois ' + (i + 1)) + ' 2024',
            sub: isCur ? 'Mois en cours · saisies App' : 'Admissions reçues dans l’App',
            color: C.primary,
            rows: [
              { label: 'Admissions CRENAS', value: NC.fmtInt(v) + ' enfants' },
              { label: 'Écart au mois précédent', value: i === 0 ? '—' : ((v - vals[i - 1] >= 0 ? '+' : '') + NC.fmtInt(v - vals[i - 1])) },
              { label: 'Part de l’année', value: NC.fmtDec((v / (vals.reduce((s, o) => s + o, 0) || 1)) * 100, 1) + ' %' }
            ],
            note: d.soudure && d.soudure.indexOf(i) >= 0 ? '⚠ Période de soudure agricole' : undefined
          }
        });
      });

      /* Légende du mois courant */
      ctx.save();
      ctx.font = NC.font(8.5, 700); ctx.fillStyle = C.label;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('Mois en cours', 0, 0);
      ctx.fillStyle = C.primary;
      NC.roundRect(ctx, 62, 1, 14, 6, 3); ctx.fill();
      ctx.restore();
    }
  });

  /* =========================================================================
   * Sparkline autonome (utilisée par la scorecard G15 — canvas miniatures)
   * ======================================================================= */
  NC.sparkline = function (canvas, values, color, opts) {
    opts = opts || {};
    const dpr = Math.min(global.devicePixelRatio || 1, 2.5);
    const W = canvas.clientWidth || opts.width || 90;
    const H = canvas.clientHeight || opts.height || 22;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const n = values.length;
    if (!n) return;
    const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    const pad = 3;
    const xOf = (i) => pad + (i / (n - 1)) * (W - pad * 2);
    const yOf = (v) => H - pad - ((v - min) / ((max - min) || 1)) * (H - pad * 2);
    const pts = values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
    ctx.beginPath(); NC.smoothPath(ctx, pts);
    ctx.lineTo(pts[n - 1].x, H); ctx.lineTo(pts[0].x, H); ctx.closePath();
    ctx.fillStyle = NC.vGradient(ctx, 0, H, color, 0.22, 0);
    ctx.fill();
    ctx.beginPath(); NC.smoothPath(ctx, pts);
    ctx.strokeStyle = color; ctx.lineWidth = opts.width2 || 1.6; ctx.lineJoin = 'round';
    ctx.stroke();
    NC.point(ctx, pts[n - 1].x, pts[n - 1].y, color, 0, 2.6);
    /* Éventuel point marqué (mois courant) */
    if (opts.markIndex != null && pts[opts.markIndex]) {
      NC.point(ctx, pts[opts.markIndex].x, pts[opts.markIndex].y, color, 1, 3);
    }
  };
})(window);
