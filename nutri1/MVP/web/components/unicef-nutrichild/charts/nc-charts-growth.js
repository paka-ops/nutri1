/* ============================================================================
 * UNICEF NutriChild · charts/nc-charts-growth.js
 * Graphiques de croissance, de cascade de soins et de volumétrie :
 *   G1  croissance        — Courbes de croissance OMS vs relevés terrain App
 *   G2  tunnelMAS         — Tunnel d'accompagnement MAS (dépistage → guérison)
 *   G9  bullesMAS         — Cartographie à bulles : prévalence × volume MAS
 * 100 % Canvas 2D, aucune dépendance externe.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  const C = NC.COLORS;

  /* Bandes verticales de survol (une par index X) — utilisé par les courbes */
  function addBands(ch, plot, n, xOf, tipFor) {
    for (let i = 0; i < n; i++) {
      const x0 = i === 0 ? plot.x - 8 : (xOf(i - 1) + xOf(i)) / 2;
      const x1 = i === n - 1 ? plot.x + plot.w + 8 : (xOf(i) + xOf(i + 1)) / 2;
      ch.hit({ type: 'rect', key: 'x' + i, x: x0, y: plot.y - 6, w: x1 - x0, h: plot.h + 12, index: i, tip: tipFor(i) });
    }
  }
  function hoverLine(ctx, x, plot, color) {
    ctx.save();
    ctx.strokeStyle = color || '#CBD5E1'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
    ctx.restore();
  }
  function classerZ(z) {
    if (z < -3) return 'Malnutrition sévère (z < −3)';
    if (z < -2) return 'Malnutrition modérée (−3 ≤ z < −2)';
    if (z <= 2) return 'Croissance normale';
    return 'Croissance élevée (z > +2)';
  }

  /* =========================================================================
   * G1 — COURBES DE CROISSANCE OMS vs RELEVÉS TERRAIN APP
   * ======================================================================= */
  NC.registerChart('croissance', {
    label: 'Courbes de croissance OMS et nuage de points des enfants mesurés',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const plot = { x: 46, y: 26, w: W - 46 - 74, h: H - 26 - 40 };
      const n = d.ages.length;
      const all = d.percentiles.reduce((acc, pc) => acc.concat(pc.values), []).concat(d.points.map((pt) => pt.y));
      const sc = NC.niceScale(Math.max(0, Math.min.apply(null, all) - 1), Math.max.apply(null, all) + 1, 5);
      const xOf = (a) => plot.x + (a / 60) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;
      const byKey = {};
      d.percentiles.forEach((pc) => { byKey[pc.key] = pc; });

      /* --- Zones colorées entre percentiles (code couleur médical) --- */
      const bands = [
        { a: 'P97', b: 'P85', color: '#DDA63A', alpha: 0.13 },
        { a: 'P85', b: 'P50', color: '#80BD41', alpha: 0.13 },
        { a: 'P50', b: 'P15', color: '#F26A21', alpha: 0.10 },
        { a: 'P15', b: 'P3',  color: '#F26A21', alpha: 0.18 },
        { a: 'P3',  b: null,  color: '#E5243B', alpha: 0.14 }   // zone sous P3
      ];
      ctx.save();
      ctx.beginPath(); ctx.rect(plot.x, plot.y, plot.w * e, plot.h); ctx.clip();
      bands.forEach((b) => {
        const top = byKey[b.a];
        const bot = b.b ? byKey[b.b] : null;
        ctx.beginPath();
        NC.smoothPath(ctx, top.values.map((v, i) => ({ x: xOf(d.ages[i]), y: yOf(v) })));
        if (bot) {
          const pts = bot.values.map((v, i) => ({ x: xOf(d.ages[i]), y: yOf(v) }));
          for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y);
        } else {
          ctx.lineTo(xOf(60), plot.y + plot.h); ctx.lineTo(xOf(0), plot.y + plot.h);
        }
        ctx.closePath();
        ctx.fillStyle = NC.hexA(b.color, b.alpha);
        ctx.fill();
      });
      ctx.restore();

      /* --- Grille & axes --- */
      NC.drawYGrid(ctx, plot, sc, (v) => NC.fmtDec(v, d.dec));
      /* Axe des âges en mois */
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plot.x, Math.round(plot.y + plot.h) + 0.5);
      ctx.lineTo(plot.x + plot.w, Math.round(plot.y + plot.h) + 0.5);
      ctx.stroke();
      ctx.restore();
      NC.drawXLabels(ctx, plot, d.ages.map((a) => (a % 6 === 0 ? a + 'm' : '')), xOf, { every: 6 });
      ctx.save();
      ctx.font = NC.font(11, 500); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('Âge (mois)', plot.x + plot.w / 2, plot.y + plot.h + 30);
      ctx.fillStyle = C.value; ctx.font = NC.font(11, 600);
      ctx.textAlign = 'left';
      ctx.fillText(d.measureLabel + ' (' + d.unit + ')', 6, 8);
      ctx.restore();

      /* --- Seuils MUAC de dépistage (mesure périmètre brachial uniquement) --- */
      if (d.seuils) {
        NC.dashedLine(ctx, plot.x, yOf(d.seuils.mam), plot.x + plot.w, yOf(d.seuils.mam), '#F26A21', 'MAM 125 mm');
        NC.dashedLine(ctx, plot.x, yOf(d.seuils.mas), plot.x + plot.w, yOf(d.seuils.mas), '#E5243B', 'MAS 115 mm');
      }

      /* --- Références de survol : bande X + point le plus proche --- */
      addBands(ch, plot, n, (i) => xOf(d.ages[i]), (i) => {
        const rows = d.percentiles.map((pc) => ({ color: pc.color, label: pc.label + ' — ' + pc.zone, value: NC.fmtDec(pc.values[i], d.dec) + ' ' + d.unit }));
        return {
          title: d.ages[i] + ' mois · ' + (d.sex === 'garcon' ? 'Garçon' : 'Fille'),
          sub: 'Références OMS 2006 · ' + d.measureLabel,
          rows: rows, color: C.primary
        };
      });

      /* --- Nuage de points : enfants réels mesurés sur le terrain --- */
      ctx.save();
      ctx.beginPath(); ctx.rect(plot.x - 6, plot.y - 6, (plot.w + 12) * e, plot.h + 12); ctx.clip();
      d.points.forEach((pt, i) => {
        const st = NC.stagger(p, i, d.points.length, 0.75);
        if (st <= 0) return;
        const x = xOf(pt.x), y = yOf(pt.y);
        const severity = pt.z < -3 ? C.danger : pt.z < -2 ? C.tertiary : pt.z > 2 ? C.quaternary : C.primary;
        const key = 'pt' + i;
        const isHover = ch.hover === key;
        ctx.beginPath();
        ctx.fillStyle = NC.hexA(severity, isHover ? 0.95 : 0.42);
        ctx.arc(x, y, (isHover ? 5.6 : 3.1) * (0.6 + 0.4 * st), 0, Math.PI * 2);
        ctx.fill();
        if (isHover) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke(); }
        ch.hit({
          type: 'pt', key: key, x: x, y: y, r: 11,
          tip: {
            title: 'Enfant mesuré · ' + pt.x + ' mois',
            sub: 'Saisie App mobile · ' + d.measureLabel,
            color: severity,
            rows: [
              { label: d.measureLabel, value: NC.fmtDec(pt.y, d.dec) + ' ' + d.unit },
              { label: 'z-score', value: (pt.z > 0 ? '+' : '') + NC.fmtDec(pt.z, 2) },
              { label: 'Classification OMS', value: classerZ(pt.z) }
            ]
          }
        });
      });
      ctx.restore();

      /* --- Courbes de percentiles OMS (par-dessus le nuage) --- */
      if (ch.hover && ch.hover.indexOf('x') === 0) hoverLine(ctx, xOf(d.ages[+ch.hover.slice(1)]), plot, C.primary);
      /* Positions d'étiquettes calculées puis espacées verticalement (17 px min) */
      const labelYs = {};
      (function () {
        const list = d.percentiles.filter((pc) => !ch.hidden.has(pc.key)).map((pc) => ({
          key: pc.key, y: NC.clamp(yOf(pc.values[n - 1]), plot.y + 8, plot.y + plot.h - 4)
        })).sort((a, b) => a.y - b.y);
        let prev = -1e9;
        list.forEach((it) => {
          it.y = Math.max(it.y, prev + 17);
          prev = it.y;
        });
        const overflow = prev - (plot.y + plot.h);
        if (overflow > 0) list.forEach((it) => { it.y -= overflow; });
        list.forEach((it) => { labelYs[it.key] = it.y; });
      })();
      d.percentiles.forEach((pc) => {
        if (ch.hidden.has(pc.key)) return;
        const pts = pc.values.map((v, i) => ({ x: xOf(d.ages[i]), y: yOf(v) }));
        ctx.save();
        ctx.beginPath(); ctx.rect(plot.x - 4, 0, (plot.w + 8) * e, H); ctx.clip();
        ctx.beginPath(); NC.smoothPath(ctx, pts);
        ctx.strokeStyle = pc.key === 'P50' ? pc.color : NC.hexA(pc.color, 0.9);
        ctx.lineWidth = pc.key === 'P50' ? 2.6 : 1.7;
        if (pc.key === 'P50') { ctx.setLineDash([]); } else { ctx.setLineDash([6, 4]); }
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
        /* Étiquette de percentile en bout de courbe */
        ctx.save();
        ctx.font = NC.font(10.5, 700);
        const last = pts[pts.length - 1];
        const lx = last.x + 6, ly = labelYs[pc.key] != null ? labelYs[pc.key] : last.y;
        ctx.fillStyle = pc.color;
        NC.roundRect(ctx, lx, ly - 8, 30, 16, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pc.label, lx + 15, ly + 0.5);
        ctx.restore();
      });

      /* --- Légende des zones de percentiles (bas droite) --- */
      ctx.save();
      ctx.font = NC.font(10, 600); ctx.textBaseline = 'middle';
      let lx = plot.x + 6, ly = plot.y + plot.h - 10;
      [['#E5243B', '< P3'], ['#F26A21', 'P3–P15'], ['#80BD41', 'P15–P85'], ['#DDA63A', '> P85']].forEach((it) => {
        ctx.beginPath(); ctx.fillStyle = NC.hexA(it[0], 0.75); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.label; ctx.textAlign = 'left';
        ctx.fillText(it[1], lx + 8, ly);
        lx += 8 + ctx.measureText(it[1]).width + 14;
      });
      ctx.restore();

      /* Rappel de la prévalence MAS du périmètre (sous le titre de l'axe) */
      if (d.prevalence != null) {
        ctx.save();
        ctx.font = NC.font(10.5, 700); ctx.fillStyle = C.danger;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('Prévalence MAS du périmètre : ' + NC.fmtPct(d.prevalence, 1), 6, 21);
        ctx.restore();
      }
    }
  });

  /* =========================================================================
   * G2 — TUNNEL D'ACCOMPAGNEMENT MAS
   * ======================================================================= */
  NC.registerChart('tunnelMAS', {
    label: 'Tunnel d’accompagnement de la malnutrition aigüe sévère',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const stages = d.stages;
      const n = stages.length;
      const padL = 188, padR = 104, padT = 34, padB = 30;
      const plot = { x: padL, y: padT, w: Math.max(80, W - padL - padR), h: H - padT - padB };
      const stepH = plot.h / n;
      const barH = Math.min(38, stepH * 0.62);
      const maxV = stages[0].value;
      const cx = plot.x + plot.w / 2;
      /* Largeur du barreau : racine carrée pour rester lisible sur les petites étapes */
      const wOf = (v) => plot.w * Math.pow(v / maxV, 0.62);

      /* Repères de pourcentage en fond */
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      [25, 50, 75, 100].forEach((pc) => {
        const x = plot.x + plot.w / 2 - wOf(maxV) / 2 + (wOf(maxV) * pc) / 100;
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, plot.y - 4); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
      });
      ctx.restore();

      stages.forEach((st, i) => {
        const y = plot.y + i * stepH + (stepH - barH) / 2;
        const w = wOf(st.value);
        const grow = NC.stagger(p, i, n, 0.5);
        const bw = Math.max(2, w * grow);
        const x = cx - bw / 2;
        const key = 's' + i;
        const isHover = ch.hover === key;
        const g = ctx.createLinearGradient(x, y, x + bw, y);
        g.addColorStop(0, NC.hexA(st.color, isHover ? 1 : 0.92));
        g.addColorStop(1, NC.hexA(st.color, isHover ? 0.85 : 0.62));
        ctx.save();
        ctx.fillStyle = g;
        NC.roundRect(ctx, x, y, bw, barH + (isHover ? 2 : 0), 6); ctx.fill();
        /* Reflet supérieur */
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        NC.roundRect(ctx, x, y, bw, (barH + (isHover ? 2 : 0)) / 2.4, 6); ctx.fill();
        ctx.restore();

        /* Étiquette gauche : nom de l'étape */
        ctx.save();
        ctx.font = NC.font(11.5, 600); ctx.fillStyle = C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(NC.ellipsis(ctx, st.label, padL - 26), padL - 14, y + barH / 2);
        ctx.restore();

        /* Valeur à droite : nombre + pourcentage */
        ctx.save();
        ctx.font = NC.font(12, 700); ctx.fillStyle = C.title;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(NC.fmtInt(st.value) + ' k', cx + wOf(maxV) / 2 + 12, y + barH / 2 - 6);
        ctx.font = NC.font(10.5, 700); ctx.fillStyle = st.pct <= 32 ? C.danger : st.pct <= 45 ? C.tertiary : C.secondary;
        ctx.fillText(st.pct + ' %', cx + wOf(maxV) / 2 + 12, y + barH / 2 + 8);
        ctx.restore();

        /* Connecteur entre étapes (montre l'entonnoir) */
        if (i < n - 1) {
          ctx.save();
          ctx.strokeStyle = NC.hexA(st.color, 0.35); ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(cx - bw / 2, y + barH);
          ctx.lineTo(cx - wOf(stages[i + 1].value) / 2, y + barH + (stepH - barH));
          ctx.moveTo(cx + bw / 2, y + barH);
          ctx.lineTo(cx + wOf(stages[i + 1].value) / 2, y + barH + (stepH - barH));
          ctx.stroke();
          ctx.restore();
        }

        ch.hit({
          type: 'rect', key: key, x: plot.x, y: y - 2, w: plot.w, h: barH + 6, clickable: true, index: i,
          tip: {
            title: st.label, sub: st.note, color: st.color,
            rows: [
              { label: 'Enfants', value: NC.fmtInt(st.value) + ' 000' },
              { label: 'Part du besoin estimé', value: st.pct + ' %' },
              { label: 'Perte vs étape précédente', value: i === 0 ? '—' : '−' + (stages[i - 1].pct - st.pct) + ' pts' }
            ],
            note: i === 0 ? 'Base 100 % : besoin estimé total' : 'Étape ' + (i + 1) + ' / ' + n
          }
        });
      });

      /* Bandeau du « gap de couverture terrain » (largeur = canvas entier) */
      ctx.save();
      const gh = 26, gy = plot.y + plot.h + 2, gw = W - 8;
      ctx.fillStyle = NC.hexA(C.danger, 0.08);
      NC.roundRect(ctx, 4, gy, gw, gh, 8); ctx.fill();
      ctx.font = NC.font(10.5, 700); ctx.fillStyle = C.danger;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(NC.ellipsis(ctx, '⚠ Gap de couverture terrain : ' + d.gap.pct +
        ' % des enfants MAS estimés (' + NC.fmtInt(d.gap.value) + ' k) restent hors cascade de soins', gw - 18), 13, gy + gh / 2);
      ctx.restore();
    }
  });

  /* =========================================================================
   * G9 — CARTOGRAPHIE À BULLES : PRÉVALENCE × VOLUME DE MAS
   * ======================================================================= */
  NC.registerChart('bullesMAS', {
    label: 'Cartographie à bulles de la prévalence et du volume de MAS',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const plot = { x: 34, y: 20, w: W - 68, h: H - 74 };
      /* Grille de fond discrète (quadrillage de repérage géographique) */
      ctx.save();
      ctx.strokeStyle = '#F8FAFC'; ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        const x = plot.x + (plot.w / 8) * i;
        ctx.beginPath(); ctx.moveTo(x, plot.y); ctx.lineTo(x, plot.y + plot.h); ctx.stroke();
      }
      for (let j = 0; j <= 6; j++) {
        const y = plot.y + (plot.h / 6) * j;
        ctx.beginPath(); ctx.moveTo(plot.x, y); ctx.lineTo(plot.x + plot.w, y); ctx.stroke();
      }
      /* Cadre océan/terres stylisé */
      ctx.fillStyle = 'rgba(28,171,226,0.035)';
      NC.roundRect(ctx, plot.x, plot.y, plot.w, plot.h, 14); ctx.fill();
      ctx.strokeStyle = C.border; ctx.lineWidth = 1;
      NC.roundRect(ctx, plot.x, plot.y, plot.w, plot.h, 14); ctx.stroke();
      ctx.restore();

      /* Échelle de tailles : rayon ∝ racine du volume d'enfants MAS */
      const vols = d.points.map((pt) => pt.cases);
      const maxV = Math.max.apply(null, vols) || 1;
      const rOf = (v) => 6 + Math.sqrt(v / maxV) * (Math.min(W, H) * 0.10);

      const xOf = (v) => plot.x + (v / 100) * plot.w;
      const yOf = (v) => plot.y + (v / 100) * plot.h;

      /* Bulles triées par taille croissante pour que les grosses restent au-dessus */
      const sorted = d.points.map((pt, i) => ({ pt: pt, i: i })).sort((a, b) => a.pt.cases - b.pt.cases);
      sorted.forEach((item, si) => {
        const pt = item.pt, i = item.i;
        const st = NC.stagger(p, si, sorted.length, 0.6);
        const x = xOf(pt.x), y = yOf(pt.y);
        const r = rOf(pt.cases) * (0.35 + 0.65 * st);
        const key = 'b' + i;
        const isHover = ch.hover === key;
        ctx.save();
        /* Halo extérieur */
        ctx.beginPath();
        ctx.fillStyle = NC.hexA(pt.color, isHover ? 0.26 : 0.13);
        ctx.arc(x, y, r + (isHover ? 7 : 3), 0, Math.PI * 2); ctx.fill();
        /* Disque principal */
        ctx.beginPath();
        ctx.fillStyle = NC.hexA(pt.color, isHover ? 0.92 : 0.7);
        ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = isHover ? 2.4 : 1.4; ctx.stroke();
        /* Étiquette : bulles significatives uniquement (évite la surcharge).
         * Bascule sous la bulle quand le haut du graphique est atteint. */
        if (r > 13 || isHover || d.points.length <= 10) {
          ctx.font = NC.font(isHover ? 11.5 : 10.5, isHover ? 700 : 600);
          ctx.fillStyle = C.title; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const label = NC.ellipsis(ctx, pt.label, 110);
          const above = y - r - 9;
          ctx.fillText(label, NC.clamp(x, plot.x + 40, plot.x + plot.w - 40),
            above < plot.y + 10 ? y + r + 11 : above);
        }
        ctx.restore();
        ch.hit({
          type: 'pt', key: key, x: x, y: y, r: Math.max(r, 10), clickable: true,
          tip: {
            title: pt.label, sub: 'Prévalence MAS ' + NC.fmtPct(pt.mas, 1) + ' · ' + NC.fmtInt(pt.u5) + ' k enfants < 5 ans',
            color: pt.color,
            rows: [
              { label: 'Enfants MAS (dépistés App)', value: NC.fmtInt(pt.cases) + ' 000' },
              { label: 'Classe de prévalence', value: pt.mas < 5 ? '< 5% — acceptable' : pt.mas < 10 ? '5–10% — alerte' : pt.mas < 15 ? '10–15% — urgence' : '> 15% — urgence critique' },
              { label: 'Enfants < 5 ans', value: NC.fmtInt(pt.u5) + ' 000' }
            ],
            note: 'Taille de bulle ∝ volume d’enfants MAS'
          }
        });
      });

      /* Légende des classes de prévalence (bas de la card) */
      ctx.save();
      const legends = [
        ['#80BD41', '< 5 %'], ['#F26A21', '5–10 %'], ['#E5243B', '10–15 %'], ['#991B1B', '> 15 %']
      ];
      let lx = plot.x + 4, ly = plot.y + plot.h + 20;
      ctx.font = NC.font(10.5, 600); ctx.textBaseline = 'middle';
      legends.forEach((l) => {
        ctx.beginPath(); ctx.fillStyle = NC.hexA(l[0], 0.75); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.label; ctx.textAlign = 'left';
        ctx.fillText(l[1], lx + 11, ly);
        lx += 11 + ctx.measureText(l[1]).width + 18;
      });
      /* Échelle de volume */
      ctx.textAlign = 'right';
      ctx.fillStyle = C.label; ctx.font = NC.font(10.5, 600);
      ctx.fillText('Volume d’enfants MAS', plot.x + plot.w - 6 - 62, ly);
      [0.25, 0.6, 1].forEach((f, i) => {
        const cx2 = plot.x + plot.w - 58 + i * 22;
        ctx.beginPath(); ctx.fillStyle = NC.hexA(C.primary, 0.6);
        ctx.arc(cx2, ly, 3 + Math.sqrt(f) * 6, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();

      /* Bandeau de périmètre */
      ctx.save();
      ctx.font = NC.font(10, 700); ctx.fillStyle = C.primary;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('● ' + d.scopeLabel + ' · ' + d.points.length + ' entités', plot.x + 2, 4);
      ctx.restore();
    }
  });
})(window);
