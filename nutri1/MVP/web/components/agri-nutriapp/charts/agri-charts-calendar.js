/* =====================================================================
 * AgriNutri · Graphique « Calendrier & Soudure »
 *   G3  Gantt interactif : 10 cultures (semis / récolte), overlay de
 *       pluviométrie (bleu), pic de malnutrition (rouge) et période de
 *       soudure surlignée en ambre.
 * ===================================================================== */
(function () {
  'use strict';
  const AC = window.AgriCore;
  const C = AC.C;
  const D = window.AgriNutriData;
  window.AgriCharts = window.AgriCharts || {};

  const SOW = '#86EFAC', GROW = '#22C55E', HARVEST = '#B45309', AMBER = 'rgba(245,158,11,0.16)', RAIN = '#0369A1', MALN = '#DC2626';

  /* Mois d'un intervalle, en gérant le passage de l'année (ex. [11, 0]) */
  function spanMonths(a, b) {
    const out = [];
    let m = a;
    for (let k = 0; k < 12; k++) { out.push(m); if (m === b) break; m = (m + 1) % 12; }
    return out;
  }

  function geom(L) {
    const pl = AC.plot(L, { t: 62, l: 116, r: 16, b: 96 });
    const rowsH = pl.h * 0.66;
    return { pl: pl, rowH: rowsH / D.CROPS_CALENDAR.length, rowsH: rowsH, bandY: pl.y + rowsH + 8, bandH: pl.h - rowsH - 8 };
  }

  window.AgriCharts.calendar = function (canvas) {
    return AC.mount(canvas, {
      height: 400,
      hit: function (x, y, L, d) {
        const G = geom(L);
        if (y < G.pl.y || y > G.pl.y + G.rowsH) return null;
        const r = Math.floor((y - G.pl.y) / G.rowH);
        return r >= 0 && r < D.CROPS_CALENDAR.length ? r : null;
      },
      render: function (g, L, p, hover, d) {
        const G = geom(L);
        const pl = G.pl;
        const cw = pl.w / 12;
        const X = function (m) { return pl.x + m * cw; };
        // Zone de soudure (juin → septembre) surlignée en ambre
        const s0 = d.leanSeason[0], s1 = d.leanSeason[d.leanSeason.length - 1];
        g.save();
        g.fillStyle = AMBER;
        g.fillRect(X(s0), pl.y - 4, (s1 - s0 + 1) * cw, pl.h + 4);
        g.font = AC.font(10, 700);
        g.fillStyle = '#B45309';
        g.textAlign = 'center';
        g.fillText('SOUDURE', X(s0) + (s1 - s0 + 1) * cw / 2, pl.y - 26);
        g.restore();
        // En-tête mois
        g.save();
        g.font = AC.font(11, 600);
        g.fillStyle = '#64748B';
        g.textAlign = 'center';
        g.textBaseline = 'top';
        D.MONTHS.forEach(function (m, i) { g.fillText(m, X(i) + cw / 2, pl.y - 10); });
        g.restore();
        // Séparateurs verticaux
        g.save();
        g.strokeStyle = 'rgba(148,163,184,0.2)';
        for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(X(i), pl.y); g.lineTo(X(i), pl.y + G.rowsH); g.stroke(); }
        g.restore();
        // Lignes des cultures : barres semis et récolte
        d.crops.forEach(function (c, r) {
          const cy = pl.y + G.rowH * r + G.rowH / 2;
          const dim = hover !== null && hover !== r;
          const bh = Math.min(14, G.rowH * 0.36);
          g.save();
          g.globalAlpha = (dim ? 0.35 : 1) * Math.min(1, p * 1.5 - r * 0.04);
          g.font = AC.font(12, 600);
          g.fillStyle = '#334155';
          g.textAlign = 'right';
          g.textBaseline = 'middle';
          g.fillText(c.name, pl.x - 10, cy);
          // Semis (vert clair)
          spanMonths(c.sow[0], c.sow[1]).forEach(function (m) {
            g.fillStyle = SOW;
            AC.roundRect(g, X(m) + 2, cy - bh - 2, cw - 4, bh, 4); g.fill();
          });
          // Récolte (brun terre)
          spanMonths(c.harvest[0], c.harvest[1]).forEach(function (m) {
            g.fillStyle = HARVEST;
            AC.roundRect(g, X(m) + 2, cy + 2, cw - 4, bh, 4); g.fill();
          });
          // Croissance (entre semis et récolte) : fine barre verte
          const sowEnd = c.sow[1];
          const harvStart = c.harvest[0];
          let m = (sowEnd + 1) % 12;
          let guard = 0;
          while (m !== harvStart && guard++ < 12) {
            g.fillStyle = GROW + '66';
            g.fillRect(X(m) + 2, cy - 2, cw - 4, 4);
            m = (m + 1) % 12;
          }
          g.restore();
        });
        // Bande basse : pluviométrie (bleu) et pic de malnutrition (rouge)
        const maxR = Math.max.apply(null, d.rain);
        const maxM = Math.max.apply(null, d.malnutrition);
        const bandTop = G.bandY, bandBottom = G.bandY + G.bandH;
        g.save();
        g.strokeStyle = 'rgba(148,163,184,0.25)';
        g.beginPath(); g.moveTo(pl.x, bandBottom); g.lineTo(pl.x + pl.w, bandBottom); g.stroke();
        g.restore();
        g.save();
        d.rain.forEach(function (v, m) {
          const h = (v / maxR) * G.bandH * 0.92 * p;
          g.fillStyle = RAIN + (hover !== null ? '40' : '66');
          AC.roundTop(g, X(m) + 6, bandBottom - h, cw - 12, h, 4); g.fill();
        });
        g.restore();
        // Courbe lissée : pic de malnutrition
        const malPts = d.malnutrition.map(function (v, m) {
          return { x: X(m) + cw / 2, y: bandBottom - (v / maxM) * G.bandH * 0.92 * p };
        });
        g.save();
        g.beginPath();
        AC.smoothPath(g, malPts, 0.5);
        g.strokeStyle = MALN;
        g.lineWidth = 2.5;
        g.stroke();
        malPts.forEach(function (pt) { g.fillStyle = MALN; g.beginPath(); g.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2); g.fill(); });
        g.restore();
        // Légende et étiquettes d'overlay
        AC.legend(g, [
          { label: 'Semis', color: SOW }, { label: 'Croissance', color: GROW + '66' }, { label: 'Récolte', color: HARVEST },
          { label: 'Pluviométrie (mm)', color: RAIN }, { label: 'Pic malnutrition (% MAS)', color: MALN }
        ], pl.x, 12);
        g.save();
        g.font = AC.font(10, 600);
        g.fillStyle = '#64748B';
        g.textAlign = 'left';
        g.textBaseline = 'top';
        g.fillText('Pluviométrie & malnutrition', pl.x, bandTop + 2);
        g.restore();
        // Survol : colonne de mois pour la culture ciblée
        if (hover !== null) {
          const c = d.crops[hover];
          g.save();
          g.strokeStyle = 'rgba(15,23,42,0.35)';
          g.setLineDash([4, 4]);
          g.strokeRect(pl.x, pl.y + G.rowH * hover, pl.w, G.rowH);
          g.restore();
        }
      },
      tip: function (r, L, d) {
        const c = d.crops[r];
        const name = function (m) { return D.MONTHS[m]; };
        return { color: C.secondary, title: c.name, rows: [
          { k: 'Semis', v: name(c.sow[0]) + ' → ' + name(c.sow[1]), c: '#15803D' },
          { k: 'Récolte', v: name(c.harvest[0]) + ' → ' + name(c.harvest[1]), c: C.secondary },
          { k: 'Chevauche la soudure', v: c.harvest[0] >= 5 && c.harvest[0] <= 8 ? 'Oui' : 'Non', c: C.ink }
        ] };
      }
    });
  };
})();
