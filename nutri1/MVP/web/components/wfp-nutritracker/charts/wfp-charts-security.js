/* ============================================================================
 * WFP NutriTracker · charts/wfp-charts-security.js
 * Graphiques « Sécurité alimentaire & IPC » — Canvas API pure :
 *   G1  ipcStack     — Barres empilées des phases IPC (pays ou districts)
 *   G2  fcsTrend     — Multi-line chart FCS (2020-2024) + seuil acceptable 42
 *   G8  ipcMap       — Carte choroplèthe vectorielle (pays / districts)
 *   G13 alertCalendar— Calendar heatmap des signalements d'urgence
 * ========================================================================== */
(function (global) {
  'use strict';
  const WFP = global.WFPTracker;
  const C = WFP.COLORS;

  /* Bandes verticales de survol pour les graphiques à axe X catégoriel */
  function addBands(ch, plot, n, xOf, xStep, tipFor) {
    for (let i = 0; i < n; i++) {
      const x0 = i === 0 ? plot.x - 4 : (xOf(i - 1) + xOf(i)) / 2;
      const x1 = i === n - 1 ? plot.x + plot.w + 4 : (xOf(i) + xOf(i + 1)) / 2;
      ch.hit({ type: 'rect', key: 'x' + i, x: x0, y: plot.y - 6, w: Math.max(1, x1 - x0), h: plot.h + 12, index: i, tip: tipFor(i) });
      void xStep;
    }
  }

  /* =========================================================================
   * G1 — Phases IPC : barres empilées horizontales
   * ======================================================================= */
  WFP.registerChart('ipcStack', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const zones = d.zones;
      const n = zones.length;
      const labelW = Math.min(150, Math.max(96, W * 0.22));
      const plot = { x: labelW, y: 18, w: W - labelW - 46, h: H - 18 - 26 };
      const rowH = Math.min(30, plot.h / n);
      const barH = Math.min(20, rowH * 0.68);
      const phases = d.phases.filter((ph) => !ch.hidden.has('p' + ph.key));
      const e = ch.e;

      /* Axe : graduations 0 → 100 % */
      const sc = { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] };
      ctx.save();
      ctx.font = WFP.font(10, 500); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      sc.ticks.forEach((v) => {
        const x = Math.round(plot.x + (v / 100) * plot.w) + 0.5;
        ctx.strokeStyle = v === 0 ? C.axis : C.grid; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, plot.y - 4); ctx.lineTo(x, plot.y + plot.h + 2); ctx.stroke();
        ctx.fillText(v + '%', x, plot.y + plot.h + 8);
      });
      ctx.restore();

      zones.forEach((z, i) => {
        const y = plot.y + i * (plot.h / n) + (plot.h / n - barH) / 2;
        const prog = WFP.stagger(p, i, n, 0.5);
        /* Libellé de zone + pastille IPC */
        ctx.save();
        ctx.font = WFP.font(11, 600); ctx.fillStyle = ch.hover === 'z' + i ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, z.name, labelW - 22), labelW - 14, y + barH / 2);
        WFP.dot(ctx, labelW - 8, y + barH / 2, 3.5, WFP.ipcColor((z.ipc - 1) / 4));
        ctx.restore();

        /* Fond de barre */
        ctx.fillStyle = '#F8FAFC';
        WFP.roundRect(ctx, plot.x, y, plot.w, barH, 5); ctx.fill();

        /* Segments IPC empilés */
        let x = plot.x;
        const tot = phases.reduce((s, ph) => s + z.phases[ph.key - 1], 0) || 1;
        phases.forEach((ph, si) => {
          const share = z.phases[ph.key - 1] / tot;
          const w = share * plot.w * prog;
          if (w <= 0.4) return;
          const seg = (phases.length === 1 || si === 0) && si === phases.length - 1;
          ctx.save();
          ctx.beginPath();
          if (phases.length === 1) { WFP.roundRect(ctx, x, y, w, barH, 5); }
          else if (si === 0) { ctx.rect(x, y, w + 1, barH); ctx.moveTo(x + 5, y); ctx.arcTo(x, y, x, y + barH, 5); ctx.arcTo(x, y + barH, x + w + 1, y + barH, 5); ctx.lineTo(x + w + 1, y); ctx.closePath(); }
          else if (si === phases.length - 1) { ctx.moveTo(x, y); ctx.lineTo(x + w - 5, y); ctx.arcTo(x + w, y, x + w, y + 5, 5); ctx.lineTo(x + w, y + barH - 5); ctx.arcTo(x + w, y + barH, x + w - 5, y + barH, 5); ctx.lineTo(x, y + barH); ctx.closePath(); }
          else { ctx.rect(x, y, w + 1, barH); }
          ctx.fillStyle = WFP.hexA(ph.color, ch.hover === 'z' + i ? 1 : 0.92);
          ctx.fill();
          ctx.restore();
          void seg;
          /* % affiché dans le segment s'il est assez large */
          if (w > 30 && prog > 0.6) {
            ctx.save();
            ctx.font = WFP.font(10, 700);
            ctx.fillStyle = ph.key >= 3 ? '#FFFFFF' : 'rgba(30,41,59,0.75)';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(z.phases[ph.key - 1]) + '%', x + w / 2, y + barH / 2 + 0.5);
            ctx.restore();
          }
          /* Zone interactive par segment */
          const persons = Math.round((z.phases[ph.key - 1] / 100) * z.persons);
          ch.hit({
            type: 'rect', key: 'z' + i + 'p' + ph.key, x: x, y: y - 2, w: Math.max(w, 2), h: barH + 4,
            tip: {
              title: z.name, sub: ph.label, color: ph.color,
              rows: [
                { label: 'Part de la population', value: z.phases[ph.key - 1].toFixed(1) + ' %' },
                { label: 'Personnes concernées', value: WFP.fmtInt(persons) },
                { label: 'Personnes dépistées (App)', value: WFP.fmtInt(z.screened) },
                { label: 'Phase dominante de la zone', value: 'IPC ' + z.ipc }
              ],
              note: d.unit === 'district' ? 'District · fiches terrain App PAM' : 'Pays · synthèse mVAM App PAM'
            }
          });
          x += w;
        });
      });
    }
  });

  /* =========================================================================
   * G2 — Évolution du Score FCS (mVAM App)
   * ======================================================================= */
  WFP.registerChart('fcsTrend', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const series = d.series.filter((s) => !ch.hidden.has(s.key));
      const n = d.labels.length;
      const plot = { x: 44, y: 18, w: W - 44 - 16, h: H - 18 - 36 };
      const all = series.reduce((a, s) => a.concat(s.values), []).concat([42, 28]);
      const sc = WFP.niceScale(Math.max(0, Math.min.apply(null, all) - 5), Math.max.apply(null, all) + 4, 5);
      const xOf = (i) => plot.x + (i / (n - 1)) * plot.w;
      const yOf = (v) => plot.y + plot.h - ((v - sc.min) / (sc.max - sc.min)) * plot.h;
      const e = ch.e;

      /* Fenêtre « Crise alimentaire / inflation marchés » */
      if (d.crisis && d.crisis[0] >= 0) {
        const step = plot.w / (n - 1);
        const zx0 = Math.max(plot.x, xOf(d.crisis[0]) - step / 2);
        const zx1 = Math.min(plot.x + plot.w, xOf(d.crisis[1]) + step / 2);
        ctx.save();
        ctx.fillStyle = 'rgba(239,68,68,0.06)';
        ctx.fillRect(zx0, plot.y, zx1 - zx0, plot.h);
        ctx.strokeStyle = 'rgba(239,68,68,0.28)'; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(zx0 + 0.5, plot.y); ctx.lineTo(zx0 + 0.5, plot.y + plot.h);
        ctx.moveTo(zx1 - 0.5, plot.y); ctx.lineTo(zx1 - 0.5, plot.y + plot.h); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = WFP.font(10, 700); ctx.fillStyle = 'rgba(239,68,68,0.85)'; ctx.textAlign = 'center';
        ctx.fillText('Crise alimentaire / inflation marchés', (zx0 + zx1) / 2, plot.y + 11);
        ctx.restore();
      }

      WFP.drawYGrid(ctx, plot, sc, (v) => v);
      WFP.drawXLabels(ctx, plot, d.labels, xOf, { every: W < 560 ? 4 : n > 12 ? 3 : 1 });

      /* Seuil FCS acceptable 42 */
      WFP.dashedLine(ctx, plot.x, yOf(42), plot.x + plot.w, yOf(42), C.success, 'Seuil FCS acceptable : 42');

      /* Révélation gauche → droite */
      ctx.save();
      ctx.beginPath(); ctx.rect(plot.x - 10, 0, (plot.w + 20) * e, H); ctx.clip();
      series.forEach((s) => {
        const pts = s.values.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
        ctx.beginPath();
        WFP.smoothPath(ctx, pts);
        ctx.lineTo(pts[n - 1].x, plot.y + plot.h); ctx.lineTo(pts[0].x, plot.y + plot.h); ctx.closePath();
        ctx.fillStyle = WFP.vGradient(ctx, plot.y, plot.y + plot.h, s.color, series.length > 3 ? 0.1 : 0.2, 0);
        ctx.fill();

        ctx.beginPath(); WFP.smoothPath(ctx, pts);
        ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2.4;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (s.dashed) ctx.setLineDash([7, 5]);
        ctx.globalAlpha = ch.hoverSeries && ch.hoverSeries !== s.key ? 0.3 : 1;
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      });
      ctx.restore();

      /* Points + ligne de survol */
      const hi = ch.hover && ch.hover[0] === 'x' ? +ch.hover.slice(1) : -1;
      if (hi >= 0 && p >= 0.99) {
        WFP.hoverLine(ctx, xOf(hi), plot);
        series.forEach((s) => WFP.point(ctx, xOf(hi), yOf(s.values[hi]), s.color, ch.hoverT));
      } else if (p >= 0.99) {
        series.forEach((s) => WFP.point(ctx, xOf(n - 1), yOf(s.values[n - 1]), s.color, 0));
      }

      addBands(ch, plot, n, xOf, plot.w / (n - 1), (i) => ({
        title: d.labels[i], sub: 'Food Consumption Score · mVAM App', color: C.primary,
        rows: series.map((s) => ({ color: s.color, label: s.label.replace(/^[^\s]+\s/, ''), value: s.values[i].toFixed(1) })),
        note: series[0].values[i] < 28 ? 'Zone « Pauvre » (< 28)' : series[0].values[i] < 42 ? 'Zone « Limite » (28.5-42)' : 'Zone « Acceptable » (> 42)'
      }));
    }
  });

  /* =========================================================================
   * G8 — Carte choroplèthe vectorielle (Canvas)
   * ======================================================================= */
  const GEO = WFP.DATA.geo;

  /* Projection équirectangulaire ajustée au cadre (aspect conservé) */
  function projection(W, H, pad, bbox, box) {
    const lonSpan = bbox.lon1 - bbox.lon0, latSpan = bbox.lat1 - bbox.lat0;
    const bw = (box ? box.w : W - pad * 2), bh = (box ? box.h : H - pad * 2);
    const bx = box ? box.x : pad, by = box ? box.y : pad;
    const scale = Math.min(bw / lonSpan, bh / latSpan);
    const offX = bx + (bw - lonSpan * scale) / 2;
    const offY = by + (bh - latSpan * scale) / 2;
    return (lon, lat) => ({ x: offX + (lon - bbox.lon0) * scale, y: offY + (bbox.lat1 - lat) * scale });
  }

  /* Découpe d'un polygone par un rectangle (Sutherland–Hodgman) */
  function clipRect(poly, x0, y0, x1, y1) {
    const isectX = (a, b, x) => ({ x, y: a.y + (b.y - a.y) * ((x - a.x) / ((b.x - a.x) || 1e-9)) });
    const isectY = (a, b, y) => ({ x: a.x + (b.x - a.x) * ((y - a.y) / ((b.y - a.y) || 1e-9)), y });
    const planes = [
      [(pt) => pt.x >= x0, isectX, x0], [(pt) => pt.x <= x1, isectX, x1],
      [(pt) => pt.y >= y0, isectY, y0], [(pt) => pt.y <= y1, isectY, y1]
    ];
    let out = poly.slice();
    planes.forEach((pl) => {
      const inside = pl[0], inter = pl[1], val = pl[2];
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
        const cIn = inside(cur), pIn = inside(prev);
        if (cIn) { if (!pIn) out.push(inter(prev, cur, val)); out.push(cur); }
        else if (pIn) out.push(inter(prev, cur, val));
      }
      if (out.length < 3) return;
    });
    return out.length >= 3 ? out : null;
  }

  function centroid(pts) {
    let x = 0, y = 0;
    pts.forEach((p) => { x += p.x; y += p.y; });
    return { x: x / pts.length, y: y / pts.length };
  }

  WFP.registerChart('ipcMap', {
    onClick(hit, ch) {
      if (hit.code && ch.onSelectCountry && ch.data.mode === 'region') ch.onSelectCountry(hit.code);
    },
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const e = ch.e;
      const zoneByCode = {};
      d.zones.forEach((z) => (zoneByCode[z.code] = z));
      const colorOf = (z) => WFP.ipcColor((z.ipc - 1) / 4);

      /* Fond « océan » */
      ctx.save();
      WFP.roundRect(ctx, 2, 2, W - 4, H - 4, 14);
      ctx.fillStyle = '#FDF6E7'; ctx.fill();
      ctx.strokeStyle = '#FDE68A'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();

      if (d.mode === 'region') {
        const proj = projection(W, H, 14, GEO.bbox);
        const cvKeys = ['CV', 'CV2', 'CV3'];
        /* ---- Pays continentaux ---- */
        Object.keys(GEO.polygons).forEach((code) => {
          if (cvKeys.indexOf(code) >= 0) return;
          const z = zoneByCode[code];
          if (!z) return;
          const pts = GEO.polygons[code].map((ll) => proj(ll[0], ll[1]));
          const hover = ch.hover === code;
          ctx.save();
          WFP.poly(ctx, pts);
          ctx.fillStyle = WFP.hexA(colorOf(z), 0.35 + 0.6 * e);
          ctx.fill();
          ctx.lineWidth = hover ? 2.4 : 1.1;
          ctx.strokeStyle = hover ? C.title : 'rgba(255,255,255,0.9)';
          ctx.stroke();
          if (hover) { ctx.shadowColor = 'rgba(245,158,11,0.45)'; ctx.shadowBlur = 14; ctx.stroke(); }
          ctx.restore();
          /* Étiquette pays */
          const lp = GEO.labels[code];
          if (lp && e > 0.7) {
            const c = proj(lp[0], lp[1]);
            ctx.save();
            ctx.font = WFP.font(hover ? 11 : 10, hover ? 800 : 600);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillText(code, c.x + 0.8, c.y + 0.8);
            ctx.fillStyle = hover ? '#1E293B' : '#7C2D12';
            ctx.fillText(code, c.x, c.y);
            ctx.restore();
          }
          ch.hit({
            type: 'poly', key: code, code, points: pts, clickable: true,
            tip: {
              title: z.flag + ' ' + z.name, sub: 'Phase IPC ' + z.ipc + ' · ' + WFP.DATA.ipcProfiles[z.ipc].label, color: colorOf(z),
              rows: [
                { label: 'FCS (mVAM App)', value: z.fcs.toFixed(1) },
                { label: 'CSI (rCSI)', value: String(z.csi) },
                { label: 'Malnutrition aigüe (MUAC)', value: z.muac.toFixed(1) + ' %' },
                { label: 'Personnes en insécurité', value: z.insecure.toFixed(1) + ' M' },
                { label: 'Bénéficiaires App', value: z.beneficiaries.toFixed(2) + ' M' }
              ],
              note: 'Clic : ouvrir la vue détaillée du pays'
            }
          });
        });

        /* ---- Encart Cap-Vert ---- */
        const iw = Math.min(112, W * 0.24), ih = iw * 0.9;
        const box = { x: 12, y: 12, w: iw, h: ih };
        ctx.save();
        WFP.roundRect(ctx, box.x, box.y, box.w, box.h, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.fill();
        ctx.strokeStyle = 'rgba(245,158,11,0.35)'; ctx.setLineDash([3, 3]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = WFP.font(9, 700); ctx.fillStyle = '#94A3B8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('CAP-VERT', box.x + 6, box.y + 5);
        ctx.restore();
        const iproj = projection(W, H, 0, GEO.inset, { x: box.x + 8, y: box.y + 18, w: box.w - 16, h: box.h - 26 });
        const cv = zoneByCode.CV;
        cvKeys.forEach((code) => {
          const pts = GEO.polygons[code].map((ll) => iproj(ll[0], ll[1]));
          ctx.save();
          WFP.poly(ctx, pts);
          ctx.fillStyle = cv ? WFP.hexA(colorOf(cv), 0.4 + 0.6 * e) : '#D1FAE5';
          ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
        });
        if (cv) {
          const cc = iproj(-23.9, 15.9);
          ch.hit({
            type: 'pt', key: 'CV', code: 'CV', x: cc.x, y: cc.y, r: 18, clickable: true,
            tip: {
              title: '🇨🇻 Cap-Vert', sub: 'Phase IPC ' + cv.ipc + ' · ' + WFP.DATA.ipcProfiles[cv.ipc].label, color: colorOf(cv),
              rows: [
                { label: 'FCS (mVAM App)', value: cv.fcs.toFixed(1) },
                { label: 'CSI (rCSI)', value: String(cv.csi) },
                { label: 'Malnutrition aigüe (MUAC)', value: cv.muac.toFixed(1) + ' %' },
                { label: 'Bénéficiaires App', value: cv.beneficiaries.toFixed(2) + ' M' }
              ],
              note: 'Clic : ouvrir la vue détaillée du pays'
            }
          });
        }

        /* ---- Légende IPC ---- */
        drawIpcLegend(ctx, W, H);
      } else {
        /* ================= MODE PAYS : découpage par districts ================= */
        const poly = GEO.polygons[d.country] || GEO.polygons.NE;
        const proj = projection(W, H, 26, bboxOf(poly));
        const pts = poly.map((ll) => proj(ll[0], ll[1]));
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        pts.forEach((q) => { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); });

        const n = d.zones.length;
        const cols = Math.ceil(Math.sqrt(n * ((maxX - minX) / Math.max(1, maxY - minY))));
        const rows = Math.ceil(n / cols);
        const cw = (maxX - minX) / cols, chh = (maxY - minY) / rows;

        /* Ombre portée du pays */
        ctx.save();
        WFP.poly(ctx, pts);
        ctx.shadowColor = 'rgba(28,16,8,0.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#FFFFFF'; ctx.fill();
        ctx.restore();

        d.zones.forEach((z, i) => {
          const cx0 = minX + (i % cols) * cw, cy0 = minY + Math.floor(i / cols) * chh;
          const cell = clipRect(pts, cx0 + 1, cy0 + 1, cx0 + cw - 1, cy0 + chh - 1);
          if (!cell) return;
          const hover = ch.hover === z.code;
          const prog = WFP.stagger(p, i, n, 0.5);
          ctx.save();
          WFP.poly(ctx, cell);
          ctx.fillStyle = WFP.hexA(colorOf(z), (0.3 + 0.65 * prog) * (hover ? 1 : 0.94));
          ctx.fill();
          ctx.lineWidth = hover ? 2.2 : 1;
          ctx.strokeStyle = hover ? C.title : 'rgba(255,255,255,0.92)';
          ctx.stroke();
          ctx.restore();

          const c = centroid(cell);
          if (prog > 0.6) {
            ctx.save();
            ctx.font = WFP.font(hover ? 10.5 : 9.5, hover ? 800 : 600);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillText(WFP.ellipsis(ctx, z.name, cw - 10), c.x + 0.7, c.y + 0.7);
            ctx.fillStyle = z.ipc >= 3 ? '#FFFFFF' : '#7C2D12';
            ctx.fillText(WFP.ellipsis(ctx, z.name, cw - 10), c.x, c.y);
            ctx.restore();
          }
          ch.hit({
            type: 'poly', key: z.code, code: z.code, points: cell,
            tip: {
              title: z.name, sub: d.countryName + ' · Phase IPC ' + z.ipc + ' (' + WFP.DATA.ipcProfiles[z.ipc].label + ')', color: colorOf(z),
              rows: [
                { label: 'FCS district', value: z.fcs.toFixed(1) },
                { label: 'CSI (rCSI)', value: String(z.csi) },
                { label: 'Malnutrition aigüe', value: z.muac.toFixed(1) + ' %' },
                { label: 'Personnes en insécurité', value: z.insecure.toFixed(2) + ' M' },
                { label: 'Bénéficiaires assistés', value: z.beneficiaries.toFixed(2) + ' M' }
              ],
              note: 'Fiches terrain : relais communautaires App PAM'
            }
          });
        });

        /* Contour du pays par-dessus */
        ctx.save();
        WFP.poly(ctx, pts);
        ctx.strokeStyle = 'rgba(28,16,8,0.55)'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.restore();
        drawIpcLegend(ctx, W, H);
      }
    }
  });

  /* Cadre géographique d'un polygone (lon/lat) */
  function bboxOf(poly) {
    let lon0 = Infinity, lon1 = -Infinity, lat0 = Infinity, lat1 = -Infinity;
    poly.forEach((ll) => { lon0 = Math.min(lon0, ll[0]); lon1 = Math.max(lon1, ll[0]); lat0 = Math.min(lat0, ll[1]); lat1 = Math.max(lat1, ll[1]); });
    const mx = (lon1 - lon0) * 0.04 || 0.2, my = (lat1 - lat0) * 0.04 || 0.2;
    return { lon0: lon0 - mx, lon1: lon1 + mx, lat0: lat0 - my, lat1: lat1 + my };
  }

  /* Légende IPC commune aux deux modes */
  function drawIpcLegend(ctx, W, H) {
    const items = WFP.DATA.IPC_PHASES;
    const bw = 13, gap = 4;
    ctx.save();
    ctx.font = WFP.font(9.5, 600);
    let total = 0;
    items.forEach((it) => { total += ctx.measureText('IPC' + it.key).width + bw + gap + 12; });
    let x = W - total - 8, y = H - 20;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    items.forEach((it) => {
      WFP.roundRect(ctx, x, y - 5, bw, 10, 3); ctx.fillStyle = it.color; ctx.fill();
      ctx.fillStyle = C.label;
      ctx.fillText('IPC' + it.key, x + bw + 4, y);
      x += ctx.measureText('IPC' + it.key).width + bw + gap + 12;
    });
    ctx.restore();
  }

  /* =========================================================================
   * G13 — Matrice (calendar heatmap) des alertes nutritionnelles
   * ======================================================================= */
  WFP.registerChart('alertCalendar', {
    draw(ch, ctx, W, H, p) {
      const d = ch.data;
      const rows = d.rows, cols = d.cols;
      const labelW = Math.min(132, Math.max(84, W * 0.2));
      const plot = { x: labelW, y: 22, w: W - labelW - 12, h: H - 22 - 22 };
      const cw = plot.w / cols.length, chh = plot.h / rows.length;
      const maxV = Math.max.apply(null, rows.reduce((a, r) => a.concat(r.values), [1]));
      const e = ch.e;

      /* En-têtes mois */
      ctx.save();
      ctx.font = WFP.font(10, 600); ctx.fillStyle = C.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      cols.forEach((m, i) => {
        ctx.fillStyle = i === d.currentCol ? C.primary : C.label;
        ctx.fillText(m, plot.x + i * cw + cw / 2, plot.y - 6);
      });
      ctx.restore();

      rows.forEach((r, ri) => {
        const y = plot.y + ri * chh;
        ctx.save();
        ctx.font = WFP.font(10.5, 600);
        ctx.fillStyle = ch.hover && ch.hover.indexOf('r' + ri) === 0 ? C.title : C.value;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(WFP.ellipsis(ctx, r.name, labelW - 12), labelW - 10, y + chh / 2);
        ctx.restore();

        r.values.forEach((v, ci) => {
          const t = v / maxV;
          const prog = WFP.stagger(p, ri * 0.4 + ci * 0.02, rows.length, 0.4);
          const x = plot.x + ci * cw;
          const hovered = ch.hover === 'r' + ri + 'c' + ci;
          ctx.save();
          WFP.roundRect(ctx, x + 1.5, y + 1.5, cw - 3, chh - 3, 4);
          ctx.fillStyle = WFP.scaleColor([[0, '#FEF3C7'], [0.45, '#FCD34D'], [0.75, '#F59E0B'], [1, '#EF4444']], t);
          ctx.globalAlpha = 0.25 + 0.75 * prog;
          ctx.fill();
          ctx.globalAlpha = 1;
          if (hovered) { ctx.strokeStyle = C.title; ctx.lineWidth = 1.6; ctx.stroke(); }
          else if (ci === d.currentCol) { ctx.strokeStyle = 'rgba(245,158,11,0.75)'; ctx.lineWidth = 1.2; ctx.stroke(); }
          ctx.restore();
          /* Valeur dans la cellule si la place le permet */
          if (cw > 30 && chh > 16 && prog > 0.85) {
            ctx.save();
            ctx.font = WFP.font(9.5, 700);
            ctx.fillStyle = t > 0.6 ? 'rgba(255,255,255,0.95)' : 'rgba(120,53,15,0.8)';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(v, x + cw / 2, y + chh / 2);
            ctx.restore();
          }
          ch.hit({
            type: 'rect', key: 'r' + ri + 'c' + ci, x: x, y: y, w: cw, h: chh,
            tip: {
              title: r.name + ' · ' + cols[ci], sub: 'Signalements d’urgence transmis depuis l’App', color: WFP.scaleColor([[0, '#FCD34D'], [1, '#EF4444']], t),
              rows: [
                { label: 'Alertes du mois', value: String(v) },
                { label: 'Intensité relative', value: Math.round(t * 100) + ' % du pic' },
                { label: 'Total zone (12 mois)', value: WFP.fmtInt(r.values.reduce((a, b) => a + b, 0)) }
              ],
              note: (ci >= 5 && ci <= 8) ? 'Période de soudure agricole' : 'Hors soudure'
            }
          });
        });
      });
      void e;
    }
  });
})(window);
