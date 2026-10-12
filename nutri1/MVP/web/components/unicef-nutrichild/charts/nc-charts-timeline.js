/* ============================================================================
 * UNICEF NutriChild · charts/nc-charts-timeline.js
 *   G8  timeline1000 — Infographie chronologique des 1000 premiers jours
 *                      (jalons + interventions tracées dans l'App + impact cumulé)
 * 100 % Canvas 2D · pleine largeur.
 * ========================================================================== */
(function (global) {
  'use strict';
  const NC = global.NutriChild;
  const C = NC.COLORS;

  NC.registerChart('timeline1000', {
    label: 'Infographie des 1000 premiers jours de l’enfant et impact cumulé',
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = NC.ease(p);
      const labelW = 158;
      const topH = 58;                    // bandeau des jalons (2 lignes de libellés)
      const plot = { x: labelW, y: topH, w: Math.max(80, W - labelW - 22), h: H - topH - 92 };
      const nI = d.interventions.length;
      const stepH = plot.h / (nI + 0.4);
      const barH = Math.min(24, stepH * 0.56);
      const xOf = (day) => plot.x + (day / d.jours) * plot.w;

      /* ---------------------------------------------------------------
       * Axe des jalons (0 → 1000 jours) avec liseré dégradé
       * ------------------------------------------------------------- */
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plot.x, topH - 6.5); ctx.lineTo(plot.x + plot.w, topH - 6.5); ctx.stroke();
      const g = ctx.createLinearGradient(plot.x, 0, plot.x + plot.w, 0);
      g.addColorStop(0, NC.hexA('#E5243B', 0.5));
      g.addColorStop(0.28, NC.hexA('#F26A21', 0.5));
      g.addColorStop(0.55, NC.hexA('#DDA63A', 0.5));
      g.addColorStop(1, NC.hexA('#80BD41', 0.5));
      ctx.strokeStyle = g; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(plot.x, topH - 6.5); ctx.lineTo(plot.x + plot.w * e, topH - 6.5); ctx.stroke();
      ctx.restore();

      /* Jalons : repères verticaux + libellés alternés haut/bas */
      ctx.save();
      const lastShort = [-1e9, -1e9], lastDesc = [-1e9, -1e9];
      d.jalons.forEach((j, i) => {
        const x = xOf(j.day);
        const active = ch.hover === 'j' + i;
        ctx.strokeStyle = active ? C.primary : NC.hexA(C.label, 0.5);
        ctx.lineWidth = active ? 2 : 1;
        ctx.setLineDash(active ? [] : [3, 3]);
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, topH - 10); ctx.lineTo(Math.round(x) + 0.5, plot.y + plot.h); ctx.stroke();
        ctx.setLineDash([]);
        /* Pastille du jalon */
        ctx.beginPath();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = active ? C.primary : NC.hexA(C.label, 0.8); ctx.lineWidth = 2;
        ctx.arc(x, topH - 6, active ? 6 : 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        /* Libellé : au-dessus pour les jalons pairs, en dessous pour les impairs.
         * Les jalons 0-280 jours sont très serrés : on saute un libellé quand il
         * n'y a pas la place (24 px pour la pastille, 62 px pour le descriptif). */
        const up = i % 2 === 0;
        ctx.font = NC.font(active ? 10.5 : 10, active ? 800 : 600);
        ctx.fillStyle = active ? C.title : C.value;
        ctx.textAlign = 'center';
        ctx.textBaseline = up ? 'bottom' : 'top';
        const ly = up ? topH - 18 : topH + 5;
        if (x - lastShort[up ? 0 : 1] >= 24) {
          ctx.fillText(j.court, x, ly);
          lastShort[up ? 0 : 1] = x;
        }
        /* Seuls les jalons majeurs (conception, naissance, 6/12/24/36 mois) portent
         * un descriptif : la fenêtre 0-280 jours est trop dense pour les afficher tous. */
        const majeur = [0, 280, 365, 540, 730, 1000].indexOf(j.day) >= 0;
        const desc = active || (majeur && W > 620);
        if (active) {
          ctx.font = NC.font(9.5, 700); ctx.fillStyle = C.primary;
          ctx.fillText(NC.ellipsis(ctx, j.label, 92), x, up ? ly - 13 : ly + 13);
          lastDesc[up ? 0 : 1] = x;
        } else if (desc && x - lastDesc[up ? 0 : 1] >= 62) {
          ctx.font = NC.font(9, 500); ctx.fillStyle = C.label;
          ctx.fillText(NC.ellipsis(ctx, j.label, 82), x, up ? ly - 12 : ly + 12);
          lastDesc[up ? 0 : 1] = x;
        }
        ctx.restore(); ctx.save();
        ch.hit({
          type: 'pt', key: 'j' + i, x: x, y: topH - 6, r: 14,
          tip: {
            title: j.icone + ' ' + j.label + ' · jour ' + j.day,
            sub: j.note, color: C.primary,
            rows: [
              { label: 'Fenêtre', value: 'Jour ' + j.day + ' / ' + d.jours },
              { label: 'Interventions actives', value: d.interventions.filter((it) => j.day >= it.start && j.day <= it.end).map((it) => it.label).join(', ') || '—' }
            ]
          }
        });
      });
      ctx.restore();

      /* ---------------------------------------------------------------
       * Barres d'interventions (durée + couverture enregistrée par l'App)
       * ------------------------------------------------------------- */
      d.interventions.forEach((it, i) => {
        const y = plot.y + i * stepH + (stepH - barH) / 2;
        const x0 = xOf(it.start), x1 = xOf(it.end);
        const grow = NC.stagger(p, i, nI, 0.5);
        const key = 'i' + i;
        const isHover = ch.hover === key;
        const w = Math.max(4, (x1 - x0) * grow);
        ctx.save();
        /* Piste */
        ctx.fillStyle = '#F1F5F9';
        NC.roundRight(ctx, x0, y, x1 - x0, barH, 6); ctx.fill();
        /* Barre de couverture : longueur = couverture réelle */
        ctx.fillStyle = NC.hexA(it.color, isHover ? 1 : 0.88);
        NC.roundRight(ctx, x0, y, (x1 - x0) * (it.coverage / 100), barH, 6); ctx.fill();
        /* Bord de la fenêtre d'intervention */
        ctx.strokeStyle = NC.hexA(it.color, 0.55); ctx.lineWidth = 1;
        NC.roundRight(ctx, x0, y, x1 - x0, barH, 6); ctx.stroke();
        /* Pourcentage : à l'intérieur de la barre si la place le permet */
        const cov = it.coverage;
        const filled = (x1 - x0) * (cov / 100);
        ctx.font = NC.font(10.5, 800);
        ctx.textBaseline = 'middle';
        if (filled > 46) {
          /* Sur la partie remplie : texte blanc lisible */
          ctx.fillStyle = 'rgba(255,255,255,0.96)';
          ctx.textAlign = 'right';
          ctx.fillText(cov + '%', x0 + filled - 9, y + barH / 2);
        } else {
          ctx.fillStyle = cov >= 70 ? C.secondary : cov >= 50 ? C.quaternary : C.danger;
          ctx.textAlign = 'left';
          ctx.fillText(cov + '%', x1 + 7, y + barH / 2);
        }
        /* Libellé de l'intervention */
        ctx.font = NC.font(11, isHover ? 700 : 600);
        ctx.fillStyle = isHover ? C.title : C.value;
        ctx.textAlign = 'right';
        ctx.fillText(NC.ellipsis(ctx, it.label, labelW - 24), labelW - 14, y + barH / 2);
        ctx.restore();
        ch.hit({
          type: 'rect', key: key, x: plot.x - 140, y: y - 2, w: plot.w + 200, h: barH + 4, index: i,
          tip: {
            title: it.label,
            sub: 'Fenêtre jour ' + it.start + ' → ' + it.end,
            color: it.color,
            rows: [
              { label: 'Couverture enregistrée', value: it.coverage + ' %' },
              { label: 'Durée de la fenêtre', value: (it.end - it.start) + ' jours' },
              { label: 'Statut', value: it.coverage >= 70 ? '✓ Couverture satisfaisante' : it.coverage >= 50 ? '≈ Couverture partielle' : '⚠ Couverture insuffisante' }
            ],
            note: 'Suivi des rappels automatiques envoyés aux agents par l’App'
          }
        });
      });

      /* ---------------------------------------------------------------
       * Impact cumulé : réduction potentielle du stunting (sous le graphe)
       * ------------------------------------------------------------- */
      const impH = 56;
      const impY = plot.y + plot.h + 22;
      const imp = d.impact;
      const impMax = Math.min.apply(null, imp);       // valeur la plus négative
      const iy = (v) => impY + impH - (v / impMax) * (impH - 6);
      const ix = (i) => xOf((i / (imp.length - 1)) * d.jours);
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(plot.x, iy(0) + 0.5); ctx.lineTo(plot.x + plot.w, iy(0) + 0.5); ctx.stroke();
      /* Aire + courbe de l'impact */
      ctx.beginPath();
      NC.smoothPath(ctx, imp.map((v, i) => ({ x: ix(i), y: iy(v) })));
      ctx.lineTo(ix(imp.length - 1), iy(0)); ctx.lineTo(ix(0), iy(0)); ctx.closePath();
      ctx.fillStyle = NC.vGradient(ctx, iy(impMax), iy(0), C.secondary, 0.30, 0.02);
      ctx.fill();
      ctx.beginPath();
      NC.smoothPath(ctx, imp.map((v, i) => ({ x: ix(i), y: iy(v) })));
      ctx.strokeStyle = C.secondary; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
      ctx.stroke();
      /* Étiquette d'impact final */
      const lastX = ix(imp.length - 1), lastY = iy(imp[imp.length - 1]);
      const tag = '−20 % de stunting évitable';
      ctx.font = NC.font(11, 800);
      const tagW = ctx.measureText(tag).width + 18;
      const tagX = Math.min(lastX, plot.x + plot.w) - tagW, tagY = lastY - 26;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      NC.roundRect(ctx, tagX, tagY, tagW, 21, 9); ctx.fill();
      ctx.strokeStyle = NC.hexA(C.secondary, 0.5); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.secondary; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tag, tagX + tagW / 2, tagY + 11);
      /* Repères de pourcentage d'impact */
      ctx.font = NC.font(9.5, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('Impact cumulé', plot.x - 128, impY + 8);
      ctx.fillText('des interventions', plot.x - 128, impY + 21);
      ctx.fillText('sur le stunting', plot.x - 128, impY + 34);
      /* Zone de survol par jalon de l'impact */
      imp.forEach((v, i) => {
        const x = ix(i), day = Math.round((i / (imp.length - 1)) * d.jours);
        ch.hit({
          type: 'pt', key: 'im' + i, x: x, y: iy(v), r: 12,
          tip: {
            title: 'Impact cumulé · jour ' + day,
            sub: 'Réduction potentielle du retard de croissance',
            color: C.secondary,
            rows: [
              { label: 'Réduction du stunting', value: (v > 0 ? '+' : '') + NC.fmtDec(v, 1) + ' pts' },
              { label: 'Interventions cumulées', value: d.interventions.filter((it) => day >= it.start).length + ' / ' + d.interventions.length },
              { label: 'Jalon de la fenêtre', value: day >= 1000 ? 'Fenêtre d’opportunité complète' : 'En cours — jour ' + day }
            ],
            note: 'Modélisation de l’effet cumulé des interventions tracées'
          }
        });
        if (i === imp.length - 1) NC.point(ctx, x, iy(v), C.secondary, 0, 4);
      });
      ctx.restore();

      /* Bandeau « fenêtre des 1000 premiers jours » */
      ctx.save();
      ctx.font = NC.font(10, 700); ctx.fillStyle = C.primary;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('● De la conception au 3ᵉ anniversaire — la fenêtre d’opportunité nutritionnelle', plot.x - 130, 4);
      ctx.restore();
    }
  });
})(window);
