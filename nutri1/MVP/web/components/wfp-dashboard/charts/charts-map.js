/* ============================================================================
 * WFP NutriTracker · charts/charts-map.js
 * Carte interactive des alertes IPC (Canvas pur, choroplethe vectorielle) :
 *  - Mode Global (region) : 16 pays colores selon la phase IPC dominante ;
 *  - Mode Pays            : le pays zoome, decoupe en districts (diagramme de
 *                           Voronoi rastérise, graines tirees de facon deterministe
 *                           a l'interieur des contours reels du pays) ;
 *  - Survol : fiche instantanee (IPC, FCS, CSI, personnes en insecurite).
 * Projection : equirectangulaire corrigee en longitude (cos 14°) sur Afrique de l'Ouest.
 * Contours : wfp-geo.js (WFP.geo, Natural Earth simplifie).
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFP;
  const C = WFP.C, G = WFP.G;
  const PHASES = WFP.data.PHASES;

  // Emprise de l'Afrique de l'Ouest (degres)
  const BOUNDS = { lon0: -26.5, lon1: 16.5, lat0: 4, lat1: 27.8 };
  const KX = Math.cos(14 * Math.PI / 180);

  // Projection ajustee a une emprise (lon/lat) et a la taille du canvas
  function viewFor(b, w, h, pad) {
    const kx = KX;
    const s = Math.min((w - 2 * pad) / ((b.lon1 - b.lon0) * kx), (h - 2 * pad) / (b.lat1 - b.lat0));
    const ox = (w - (b.lon1 - b.lon0) * kx * s) / 2;
    const oy = (h - (b.lat1 - b.lat0) * s) / 2;
    return {
      s, ox, oy,
      px: (lon, lat) => [ox + (lon - b.lon0) * kx * s, oy + (b.lat1 - lat) * s],
      ll: (x, y) => [b.lon0 + (x - ox) / (kx * s), b.lat1 - (y - oy) / s]
    };
  }

  // Test point-dans-anneau (ray casting) en coordonnees geographiques
  function inRing(ring, lon, lat) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const inCountry = (rings, lon, lat) => rings.some(r => inRing(r, lon, lat));
  function bboxOf(rings) {
    let lon0 = 999, lon1 = -999, lat0 = 999, lat1 = -999;
    rings.forEach(r => r.forEach(([x, y]) => {
      lon0 = Math.min(lon0, x); lon1 = Math.max(lon1, x); lat0 = Math.min(lat0, y); lat1 = Math.max(lat1, y);
    }));
    return { lon0, lon1, lat0, lat1 };
  }
  function centroidOf(rings) {
    let sx = 0, sy = 0, n = 0;
    rings.forEach(r => r.forEach(([x, y]) => { sx += x; sy += y; n++; }));
    return [sx / n, sy / n];
  }

  class MapChart extends WFP.BaseChart {
    legendItems() {
      return PHASES.map((p, k) => ({ key: 'p' + k, label: p.id + ' · ' + p.label, color: p.color }));
    }

    // Vue courante : zoom sur le pays selectionne, sinon Afrique de l'Ouest
    view() {
      const d = this.data;
      if (d.mode === 'country' && WFP.geo[d.name]) {
        const bb = bboxOf(WFP.geo[d.name]);
        return viewFor({ lon0: bb.lon0 - 1, lon1: bb.lon1 + 1, lat0: bb.lat0 - 1, lat1: bb.lat1 + 1 }, this.w, this.h, 14);
      }
      return viewFor(BOUNDS, this.w, this.h, 8);
    }

    draw(ctx, w, h, p) {
      const d = this.data;
      const v = this.view();
      this.geom = { v };
      ctx.save();
      ctx.globalAlpha = p;

      if (d.mode === 'region') {
        this.drawRegion(ctx, v);
      } else {
        this.drawCountry(ctx, v);
      }
      ctx.restore();
    }

    // Pays (dessin des anneaux) avec couleur et contour
    paintRings(ctx, v, rings, fill, stroke, lw) {
      ctx.beginPath();
      rings.forEach(r => {
        r.forEach(([lon, lat], i) => {
          const [x, y] = v.px(lon, lat);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
      });
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
    }

    drawRegion(ctx, v) {
      const d = this.data;
      const phaseHidden = ipc => !!this.hidden['p' + (ipc - 1)];
      d.countries.forEach(c => {
        const rings = WFP.geo[c.name];
        if (!rings) return;
        const hot = this.hover && this.hover.key === c.code;
        const off = !c.inScope || phaseHidden(c.ipc);
        const fill = off ? '#EEF2F7' : WFP.hexA(PHASES[c.ipc - 1].color, hot ? 1 : 0.86);
        this.paintRings(ctx, v, rings, fill, hot ? C.ink : '#FFFFFF', hot ? 2 : 1);
        // Etiquette (code pays) au centre
        const [cx, cy] = centroidOf(rings);
        const [x, y] = v.px(cx, cy);
        const txt = off ? C.light : (c.ipc >= 4 ? '#FFFFFF' : C.ink);
        G.text(ctx, c.code, x, y, { align: 'center', font: '700 10px Inter, sans-serif', color: txt });
      });
    }

    // Raster des districts : grille de 3 px, couleur = IPC du district le plus proche
    buildRaster(v) {
      const d = this.data;
      const rings = WFP.geo[d.name];
      const key = d.name + '|' + this.w + 'x' + this.h + '|' + JSON.stringify(this.hidden);
      if (this._rKey === key && this._raster) return this._raster;

      const step = 3;
      const gw = Math.ceil(this.w / step), gh = Math.ceil(this.h / step);
      const bb = bboxOf(rings);
      const nD = d.districts.length;
      // Graines : tirage deterministe puis echantillonnage "points les plus eloignes"
      const r = WFP.gen.rng(WFP.gen.hash('voronoi:' + d.name));
      const cand = [];
      let guard = 0;
      while (cand.length < 400 && guard++ < 20000) {
        const lon = bb.lon0 + r() * (bb.lon1 - bb.lon0), lat = bb.lat0 + r() * (bb.lat1 - bb.lat0);
        if (inCountry(rings, lon, lat)) cand.push(v.px(lon, lat));
      }
      const seeds = [cand[0]];
      while (seeds.length < nD && cand.length) {
        let best = null, bestD = -1;
        cand.forEach(c => {
          const md = Math.min(...seeds.map(s => Math.hypot(s[0] - c[0], s[1] - c[1])));
          if (md > bestD) { bestD = md; best = c; }
        });
        seeds.push(best);
      }

      // Grille : index du district (ou -1 hors pays)
      const grid = new Int16Array(gw * gh).fill(-1);
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const x = gx * step + step / 2, y = gy * step + step / 2;
          const [lon, lat] = v.ll(x, y);
          if (!inCountry(rings, lon, lat)) continue;
          let bi = 0, bd = Infinity;
          seeds.forEach((s, i) => {
            const dd = (s[0] - x) ** 2 + (s[1] - y) ** 2;
            if (dd < bd) { bd = dd; bi = i; }
          });
          grid[gy * gw + gx] = bi;
        }
      }

      // Rendu hors-ecran (une seule fois) : cellules + bordures blanches entre districts
      const off = document.createElement('canvas');
      off.width = Math.round(this.w * this.dpr); off.height = Math.round(this.h * this.dpr);
      const o = off.getContext('2d');
      o.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const idx = grid[gy * gw + gx];
          if (idx < 0) continue;
          const dist = d.districts[idx];
          if (this.hidden['p' + (dist.ipc - 1)]) continue;
          o.fillStyle = WFP.hexA(PHASES[dist.ipc - 1].color, 0.88);
          o.fillRect(gx * step, gy * step, step, step);
          // Bordure : si le voisin de droite ou du bas est un autre district
          const right = gx + 1 < gw ? grid[gy * gw + gx + 1] : -1;
          const below = gy + 1 < gh ? grid[(gy + 1) * gw + gx] : -1;
          if (right !== idx || below !== idx) {
            o.fillStyle = 'rgba(255,255,255,0.9)';
            if (right !== idx && right >= 0) o.fillRect(gx * step + step - 1, gy * step, 1, step);
            if (below !== idx && below >= 0) o.fillRect(gx * step, gy * step + step - 1, step, 1);
          }
        }
      }
      // Contour du pays
      this.paintRings(o, v, rings, null, WFP.hexA('#1C1008', 0.75), 1.6);

      this._rKey = key;
      this._raster = { canvas: off, grid, gw, gh, step, seeds, names: d.districts.map(x => x.name) };
      return this._raster;
    }

    drawCountry(ctx, v) {
      const d = this.data;
      // Autres pays : fond neutre
      d.countries.forEach(c => {
        if (c.name === d.name) return;
        const rings = WFP.geo[c.name];
        if (rings) this.paintRings(ctx, v, rings, '#F1F5F9', '#FFFFFF', 1);
      });
      const r = this.buildRaster(v);
      ctx.drawImage(r.canvas, 0, 0, this.w, this.h);

      // Etiquettes des districts (aux graines)
      r.seeds.forEach((s, i) => {
        const hot = this.hover && this.hover.i === i;
        if (hot) {
          ctx.beginPath(); ctx.arc(s[0], s[1], 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
        }
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.font = (hot ? '800' : '700') + ' 10px Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.strokeText(r.names[i], s[0], s[1]);
        ctx.fillStyle = hot ? '#000' : C.ink;
        ctx.fillText(r.names[i], s[0], s[1]);
      });
    }

    hitTest(x, y) {
      const d = this.data, v = this.geom && this.geom.v;
      if (!v) return null;
      if (d.mode === 'region') {
        const [lon, lat] = v.ll(x, y);
        // Pays survole : premier pays dont le contour contient le point (ordre d'affichage)
        for (const c of d.countries) {
          const rings = WFP.geo[c.name];
          if (rings && inCountry(rings, lon, lat)) return { key: c.code, code: c.code, i: d.countries.indexOf(c), c };
        }
        return null;
      }
      if (!this._raster) return null;
      const r = this._raster;
      const gx = Math.floor(x / r.step), gy = Math.floor(y / r.step);
      if (gx < 0 || gy < 0 || gx >= r.gw || gy >= r.gh) return null;
      const idx = r.grid[gy * r.gw + gx];
      return idx >= 0 ? { key: 'dist' + idx, i: idx } : null;
    }

    tooltip(hit) {
      const d = this.data;
      if (d.mode === 'region') {
        const c = hit.c;
        const ph = PHASES[c.ipc - 1];
        return WFP.tip(c.name, [
          ['Phase IPC', ph.id + ' · ' + ph.label, ph.color],
          ['Score FCS', WFP.fmt.num(c.fcs, 1)],
          ['CSI', String(c.csi)],
          ['Personnes en insécurité', WFP.fmt.num(c.insec, 1) + ' M']
        ], 'Carte IPC · vue régionale');
      }
      const dist = d.districts[hit.i];
      const ph = PHASES[dist.ipc - 1];
      return WFP.tip(dist.name, [
        ['Phase IPC', ph.id + ' · ' + ph.label, ph.color],
        ['Score FCS', WFP.fmt.num(dist.fcs, 1)],
        ['CSI', String(dist.csi)],
        ['Personnes en insécurité', WFP.fmt.num(dist.insec, 2) + ' M']
      ], d.name + ' · district');
    }

    tipColor(hit) {
      const d = this.data;
      const ipc = d.mode === 'region' ? hit.c.ipc : d.districts[hit.i].ipc;
      return PHASES[ipc - 1].color;
    }
  }

  WFP.charts.map = MapChart;
})(window);
