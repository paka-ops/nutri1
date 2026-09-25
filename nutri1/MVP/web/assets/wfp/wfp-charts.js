/* ============================================================================
   NUTRI.N°1 — PAM · FOOD SECURITY ANALYTICS
   wfp-charts.js — graphiques 100 % Canvas API.

   Zéro framework, zéro Chart.js. Chaque fonction renvoie
   { update, repaint, destroy }. update() rejoue l'animation,
   repaint() dessine l'état final (survol, redimensionnement).
   ============================================================================ */
(function (root) {
  "use strict";

  var reduce = false;
  try { reduce = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
  var DUR = 980;
  var REG = [];
  var tipEl = null;

  function dpr() { return Math.min(root.devicePixelRatio || 1, 2); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function font(w, s) { return (w ? w + " " : "") + s + "px 'Segoe UI', system-ui, Arial, sans-serif"; }
  function hex2rgb(hex) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    var c = hex2rgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }
  function lerpColor(a, b, t) {
    var ca = hex2rgb(a), cb = hex2rgb(b);
    return "rgb(" + ca.map(function (v, i) { return Math.round(v + (cb[i] - v) * t); }).join(",") + ")";
  }
  function textOn(hex) {
    var c = hex2rgb(hex);
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 > 0.64 ? "#1C1917" : "#FFFFFF";
  }
  function nf(v, d) {
    var n = Number(v);
    if (!isFinite(n)) return "—";
    if (n === 0) n = 0;
    return n.toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function niceTicks(min, max, count) {
    var span = max - min;
    if (!isFinite(span) || span <= 0) return [min];
    var step0 = span / (count || 5);
    var mag = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10));
    var norm = step0 / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    var out = [], v;
    for (v = Math.ceil((min - step * 1e-6) / step) * step; v <= max + step * 1e-6; v += step) {
      out.push(Math.round(v * 1e6) / 1e6);
    }
    return out.length ? out : [min, max];
  }
  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
  function topRound(ctx, x, y, w, h, r) {
    var rr = Math.max(0, Math.min(r, w / 2, h));
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }
  function smooth(ctx, pts) {
    if (!pts.length) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      ctx.bezierCurveTo(
        p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
        p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
        p2.x, p2.y
      );
    }
  }
  function stagger(i, n, p, overlap) {
    var ov = overlap == null ? 0.12 : overlap;
    var span = 1 - ov * Math.max(0, n - 1);
    return clamp((p - ov * i) / (span || 1), 0, 1);
  }
  function ctxOf(canvas) {
    var ratio = dpr(), w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    var W = Math.round(w * ratio), H = Math.round(h * ratio);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "wfp-tip";
      tipEl.setAttribute("role", "tooltip");
      tipEl.style.display = "none";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(html, ev) {
    var t = tip();
    t.innerHTML = html;
    t.style.display = "block";
    var pad = 14, r = t.getBoundingClientRect();
    var x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > root.innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > root.innerHeight - 8) y = ev.clientY - r.height - pad;
    t.style.left = Math.max(8, x) + "px";
    t.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { if (tipEl) tipEl.style.display = "none"; }
  function tipHTML(title, rows, foot) {
    return '<div class="wfp-tip-t">' + title + "</div>" +
      (rows || []).map(function (r) {
        return '<div class="wfp-tip-r">' + (r.dot ? '<i style="background:' + r.dot + '"></i>' : "") +
          "<span>" + r.k + "</span><b>" + r.v + "</b></div>";
      }).join("") + (foot ? '<div class="wfp-tip-s">' + foot + "</div>" : "");
  }
  function local(ev, canvas) {
    var r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function pip(x, y, poly) {
    var inside = false, i, j;
    for (i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) inside = !inside;
    }
    return inside;
  }
  function hitAt(canvas, x, y) {
    var hits = canvas.__hits || [], i;
    for (i = hits.length - 1; i >= 0; i--) {
      var h = hits[i];
      if (h.poly) { if (pip(x, y, h.poly)) return h; }
      else if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
    }
    return null;
  }
  function bindHover(canvas, api) {
    canvas.addEventListener("mousemove", function (ev) {
      var p = local(ev, canvas);
      var h = hitAt(canvas, p.x, p.y);
      var key = h ? h.key : null;
      if (key !== canvas.__hover) {
        canvas.__hover = key;
        if (!canvas.__raf) api.repaint();
      }
      canvas.style.cursor = h && h.cursor !== "default" ? "pointer" : (h ? "pointer" : "default");
      if (h && h.html) showTip(h.html, ev);
      else hideTip();
    });
    canvas.addEventListener("mouseleave", function () {
      if (canvas.__hover != null) {
        canvas.__hover = null;
        if (!canvas.__raf) api.repaint();
      }
      canvas.style.cursor = "default";
      hideTip();
    });
  }
  function mount(canvas, draw, initial) {
    if (!canvas) return { update: function () {}, repaint: function () {}, destroy: function () {}, cfg: {} };
    var cfg = {};
    var reg = {
      canvas: canvas,
      draw: function (p) {
        var c = ctxOf(canvas);
        if (!c) return;
        canvas.__hits = [];
        draw(c, p, cfg);
      },
    };
    REG.push(reg);
    var tries = 0;
    function animate() {
      if (canvas.__raf) cancelAnimationFrame(canvas.__raf);
      if (!canvas.clientWidth || !canvas.clientHeight) {
        if (tries++ < 40) canvas.__raf = requestAnimationFrame(animate);
        else canvas.__raf = 0;
        return;
      }
      tries = 0;
      if (reduce) { reg.draw(1); canvas.__raf = 0; return; }
      var t0 = performance.now();
      var step = function (t) {
        var raw = clamp((t - t0) / DUR, 0, 1);
        reg.draw(ease(raw));
        if (raw < 1) canvas.__raf = requestAnimationFrame(step);
        else canvas.__raf = 0;
      };
      canvas.__raf = requestAnimationFrame(step);
    }
    var api = {
      cfg: cfg,
      update: function (next) {
        if (next) {
          Object.keys(cfg).forEach(function (k) { delete cfg[k]; });
          Object.keys(next).forEach(function (k) { cfg[k] = next[k]; });
        }
        animate();
      },
      repaint: function () { reg.draw(1); },
      destroy: function () {
        var i = REG.indexOf(reg);
        if (i > -1) REG.splice(i, 1);
        if (canvas.__raf) cancelAnimationFrame(canvas.__raf);
      },
    };
    bindHover(canvas, api);
    api.update(initial || {});
    return api;
  }
  function gridY(ctx, w, P, ph, yMin, yMax, ticks, format) {
    ctx.font = font(600, 10);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ticks.forEach(function (v) {
      var y = P.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
      ctx.strokeStyle = "rgba(120,90,40,.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(P.l, y);
      ctx.lineTo(w - P.r, y);
      ctx.stroke();
      ctx.fillStyle = "#A8A29E";
      ctx.fillText(format ? format(v) : String(v), P.l - 6, y);
    });
  }
  function repaintAll() {
    REG.forEach(function (o) { if (o.canvas && o.canvas.isConnected) o.draw(1); });
  }
  var rt = 0;
  root.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(repaintAll, 120);
  });

  /* ------------------------------------------------------------------ 1. IPC */
  function stackedBar(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var labels = cfg.labels || [];
      var series = cfg.series || [];
      var n = labels.length;
      if (!n || !series.length) return;
      var P = { l: 42, r: 10, t: 22, b: 54 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var gap = Math.min(12, pw / n * 0.22);
      var bw = Math.max(6, (pw - gap * (n - 1)) / n);
      gridY(ctx, w, P, ph, 0, 100, [0, 25, 50, 75, 100], function (v) { return v + " %"; });
      var boundary = [];
      labels.forEach(function (lb, i) {
        var grow = stagger(i, n, p, 0.055);
        var x = P.l + i * (bw + gap);
        var cursor = P.t + ph;
        var last = -1, si;
        for (si = 0; si < series.length; si++) if ((series[si].values[i] || 0) > 0.4) last = si;
        for (si = 0; si < series.length; si++) {
          var share = series[si].values[i] || 0;
          var segH = (share / 100) * ph * grow;
          if (segH < 0.4) { cursor -= segH; continue; }
          var y = cursor - segH;
          if (si === last) topRound(ctx, x, y, bw, segH, 4);
          else ctx.beginPath(), ctx.rect(x, y, bw, segH), ctx.closePath();
          ctx.fillStyle = series[si].color;
          ctx.fill();
          if (canvas.__hover === i + ":" + si) {
            ctx.strokeStyle = "#1C1008";
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }
          if (segH > 13 && grow > 0.7 && bw > 16) {
            ctx.fillStyle = textOn(series[si].color);
            ctx.font = font(800, Math.max(8, Math.min(11, bw * 0.3)));
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(Math.round(share) + "%", x + bw / 2, y + segH / 2);
          }
          var millions = cfg.pops ? cfg.pops[i] * share / 100 : 0;
          canvas.__hits.push({
            key: i + ":" + si, x: x, y: y, w: bw, h: segH,
            html: tipHTML(esc(cfg.names ? cfg.names[i] : lb) + " · " + esc(series[si].name), [
              { k: "Part de la population", v: nf(share, 0) + " %" },
              { k: "Personnes", v: nf(millions, 2) + " M" },
            ], "Phase dominante visible au survol de la barre"),
          });
          if (si === 1) boundary.push({ x: x + bw / 2, y: y });
          cursor = y;
        }
        ctx.save();
        ctx.translate(x + bw / 2, P.t + ph + 8);
        ctx.rotate(-0.62);
        ctx.font = font(700, 10);
        ctx.fillStyle = canvas.__hover && String(canvas.__hover).indexOf(i + ":") === 0 ? "#1C1008" : "#78716C";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(lb, 0, 0);
        ctx.restore();
      });
      if (boundary.length > 1 && p > 0.35) {
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        boundary.forEach(function (pt, i) { i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y); });
        ctx.stroke();
        ctx.restore();
        ctx.font = font(800, 10);
        ctx.fillStyle = "#B91C1C";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("Seuil crise · IPC 3+", w - P.r, P.t - 3);
      }
    }, initial);
  }

  /* --------------------------------------------------------- 2 et 9. lignes */
  function multiLine(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var labels = cfg.labels || [];
      var series = (cfg.series || []).filter(function (s) { return s.visible !== false; });
      var n = labels.length;
      if (n < 2) return;
      var P = { l: cfg.yPad || 42, r: 14, t: 18, b: 28 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var yMin = cfg.yMin, yMax = cfg.yMax;
      var X = function (i) { return P.l + (i / (n - 1)) * pw; };
      var Y = function (v) { return P.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph; };
      gridY(ctx, w, P, ph, yMin, yMax, niceTicks(yMin, yMax, 4), cfg.yFormat || function (v) { return nf(v, 0); });
      ctx.font = font(600, 10);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var step = n > 12 ? 4 : n > 8 ? 2 : 1;
      labels.forEach(function (lb, i) {
        if (i % step !== 0 && i !== n - 1) return;
        ctx.fillStyle = "#A8A29E";
        ctx.fillText(String(lb).replace(" T1", "").replace(/ T[2-4]/, ""), X(i), P.t + ph + 8);
      });
      (cfg.zones || []).forEach(function (z) {
        var x0 = X(z.from) - (n > 1 ? pw / (n - 1) / 2 : 0);
        var x1 = X(z.to) + (n > 1 ? pw / (n - 1) / 2 : 0);
        ctx.fillStyle = z.color;
        ctx.fillRect(x0, P.t, x1 - x0, ph);
        if (z.label && pw > 420) {
          ctx.fillStyle = "#78716C";
          ctx.font = font(700, 9);
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(z.label, (x0 + x1) / 2, P.t + 4);
        }
      });
      if (cfg.threshold) {
        var ty = Y(cfg.threshold.value);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(P.l, ty);
        ctx.lineTo(w - P.r, ty);
        ctx.stroke();
        ctx.restore();
        ctx.font = font(800, 9.5);
        ctx.fillStyle = "#B91C1C";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(cfg.threshold.label || "", w - P.r - 2, ty - 3);
      }
      series.forEach(function (s, si) {
        var prog = stagger(si, series.length, p, 0.1);
        if (prog <= 0) return;
        var pts = s.data.map(function (v, i) { return { x: X(i), y: Y(v) }; });
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l - 2, P.t - 8, pw * prog + 4, ph + 16);
        ctx.clip();
        if (cfg.area !== false) {
          var g = ctx.createLinearGradient(0, P.t, 0, P.t + ph);
          g.addColorStop(0, rgba(s.color, 0.22));
          g.addColorStop(1, rgba(s.color, 0.02));
          ctx.beginPath();
          smooth(ctx, pts);
          ctx.lineTo(pts[pts.length - 1].x, P.t + ph);
          ctx.lineTo(pts[0].x, P.t + ph);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
        pts.forEach(function (pt, i) {
          if (pw * prog < pt.x - P.l - 2 && i < pts.length - 1) return;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, canvas.__hover === "x" + i ? 4.2 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = s.color;
          ctx.stroke();
        });
      });
      var band = pw / Math.max(1, n - 1);
      labels.forEach(function (_, i) {
        var rows = series.map(function (s) {
          return { k: esc(s.name), v: nf(s.data[i], cfg.decimals == null ? 0 : cfg.decimals) + (cfg.unit || ""), dot: s.color };
        });
        canvas.__hits.push({
          key: "x" + i,
          x: X(i) - band / 2, y: P.t, w: band, h: ph,
          html: tipHTML(esc(labels[i]), rows, cfg.tipFoot || ""),
        });
      });
      if (canvas.__hover && String(canvas.__hover).indexOf("x") === 0) {
        var hi = +String(canvas.__hover).slice(1);
        if (hi >= 0 && hi < n) {
          ctx.save();
          ctx.strokeStyle = "rgba(28,16,8,.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(X(hi), P.t);
          ctx.lineTo(X(hi), P.t + ph);
          ctx.stroke();
          ctx.restore();
        }
      }
    }, initial);
  }

  /* --------------------------------------------------------------- 3. heatmap */
  function heatmap(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [], cols = cfg.cols || [];
      if (!rows.length || !cols.length) return;
      var P = { l: 78, r: 8, t: 22, b: 8 };
      var avgW = 46;
      var pw = w - P.l - P.r - avgW, ph = h - P.t - P.b;
      var cw = pw / cols.length, rh = ph / rows.length;
      var D = root.WFP_DATA;
      ctx.font = font(700, 9);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      var every = cols.length > 16 ? 3 : cols.length > 8 ? 2 : 1;
      cols.forEach(function (lb, i) {
        if (i % every !== 0 && i !== cols.length - 1) return;
        ctx.fillStyle = "#A8A29E";
        var text = String(lb).replace("Janv", "Jan").replace("Févr", "Fév").replace("Sept", "Sep").replace("Août", "Aoû");
        ctx.fillText(text, P.l + i * cw + cw / 2, P.t - 5);
      });
      ctx.fillStyle = "#A8A29E";
      ctx.fillText("Moy.", P.l + pw + avgW / 2, P.t - 5);
      rows.forEach(function (row, ri) {
        var vals = row.values;
        var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
        ctx.font = font(700, 11);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1C1917";
        ctx.fillText(row.name, P.l - 8, P.t + ri * rh + rh / 2);
        vals.forEach(function (v, ci) {
          var colP = stagger(ci, vals.length, p, 0.025);
          if (colP <= 0) return;
          var ratio = v / row.normal;
          var x = P.l + ci * cw, y = P.t + ri * rh;
          ctx.globalAlpha = 0.25 + 0.75 * colP;
          ctx.fillStyle = D.ratioColor(ratio);
          ctx.fillRect(x + 1, y + 1, Math.max(0, cw - 2), Math.max(0, rh - 2));
          ctx.globalAlpha = 1;
          if (canvas.__hover === ri + ":" + ci) {
            ctx.strokeStyle = "#1C1008";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
          }
          if (cw > 26 && rh > 16 && colP > 0.65) {
            ctx.fillStyle = ratio > 2 ? "#7F1D1D" : "#44403C";
            ctx.font = font(700, cw > 36 ? 9 : 7.5);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(v >= 1000 ? nf(v / 1000, 1) + "k" : String(Math.round(v)), x + cw / 2, y + rh / 2);
          }
          var prev = ci > 0 ? vals[ci - 1] : v;
          var delta = prev ? (v - prev) / prev * 100 : 0;
          canvas.__hits.push({
            key: ri + ":" + ci, x: x, y: y, w: cw, h: rh,
            html: tipHTML(esc(row.name) + " · " + esc(cols[ci]), [
              { k: "Marché", v: esc(row.market) },
              { k: "Prix", v: nf(v, 0) + " FCFA/kg" },
              { k: "Ratio / normale", v: nf(ratio, 2) + "×" },
              { k: cfg.varLabel || "Variation", v: (delta >= 0 ? "+" : "") + nf(delta, 1) + " %" },
            ], D.ratioLabel(ratio)),
          });
        });
        var ar = avg / row.normal;
        var ax = P.l + pw + 4, ay = P.t + ri * rh;
        ctx.globalAlpha = p;
        ctx.fillStyle = D.ratioColor(ar);
        roundRect(ctx, ax, ay + 2, avgW - 10, rh - 4, 5);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#1C1917";
        ctx.font = font(800, 9);
        ctx.textAlign = "center";
        ctx.fillText(Math.round(avg), ax + (avgW - 10) / 2, ay + rh / 2);
      });
    }, initial);
  }

  /* ----------------------------------------------------------------- 4. radar */
  function radar(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var axes = cfg.axes || [];
      var series = cfg.series || [];
      var m = axes.length;
      if (m < 3) return;
      var cx = w * 0.40, cy = h * 0.52;
      var R = Math.min(w * 0.30, h * 0.38);
      var max = cfg.max || 100;
      function ang(i) { return -Math.PI / 2 + (i / m) * Math.PI * 2; }
      function pt(i, v) {
        var a = ang(i), rr = (v / max) * R;
        return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
      }
      [0.25, 0.5, 0.75, 1].forEach(function (g) {
        ctx.beginPath();
        for (var i = 0; i <= m; i++) {
          var a = ang(i % m), rr = R * g;
          var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = "rgba(120,90,40,.16)";
        ctx.lineWidth = 1;
        ctx.stroke();
        if (g < 1) {
          ctx.fillStyle = "#A8A29E";
          ctx.font = font(600, 8);
          ctx.textAlign = "left";
          ctx.fillText(String(Math.round(max * g)), cx + 4, cy - R * g);
        }
      });
      for (var i = 0; i < m; i++) {
        var a = ang(i);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.strokeStyle = "rgba(120,90,40,.2)";
        ctx.stroke();
        var lx = cx + Math.cos(a) * (R + 16), ly = cy + Math.sin(a) * (R + 16);
        ctx.font = font(700, 9.5);
        ctx.fillStyle = "#44403C";
        ctx.textAlign = Math.cos(a) > 0.3 ? "left" : Math.cos(a) < -0.3 ? "right" : "center";
        ctx.textBaseline = Math.sin(a) > 0.35 ? "top" : Math.sin(a) < -0.35 ? "bottom" : "middle";
        var words = String(axes[i]).split(" ");
        words.forEach(function (word, wi) {
          ctx.fillText(word, lx, ly + (wi - (words.length - 1) / 2) * 11);
        });
      }
      if (cfg.threshold) {
        ctx.beginPath();
        ctx.arc(cx, cy, (cfg.threshold / max) * R, 0, Math.PI * 2);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      series.forEach(function (s, si) {
        var prog = stagger(si, series.length, p, 0.12);
        if (prog <= 0) return;
        ctx.beginPath();
        s.values.forEach(function (v, i) {
          var q = pt(i, v * prog);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.closePath();
        ctx.fillStyle = rgba(s.color, canvas.__hover === "s" + si ? 0.28 : 0.13);
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = canvas.__hover === "s" + si ? 2.6 : 1.8;
        ctx.stroke();
        s.values.forEach(function (v, i) {
          var q = pt(i, v * prog);
          ctx.beginPath();
          ctx.arc(q.x, q.y, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
        });
      });
      /* zone de survol : anneau par pays, point le plus proche */
      series.forEach(function (s, si) {
        s.values.forEach(function (v, i) {
          var q = pt(i, v);
          canvas.__hits.push({
            key: "s" + si, x: q.x - 10, y: q.y - 10, w: 20, h: 20,
            html: tipHTML(esc(s.name), [
              { k: esc(axes[i]), v: String(v), dot: s.color },
              { k: "Seuil critique", v: "60" },
            ], v >= 60 ? "Au-dessus du seuil critique" : "Sous le seuil critique"),
          });
        });
      });
    }, initial);
  }

  /* --------------------------------------------------------------- 5. scatter */
  function scatter(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var pts = cfg.points || [];
      if (!pts.length) return;
      var P = { l: 40, r: 12, t: 16, b: 32 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var x0 = cfg.xMin, x1 = cfg.xMax, y0 = cfg.yMin, y1 = cfg.yMax;
      var X = function (v) { return P.l + ((v - x0) / (x1 - x0)) * pw; };
      var Y = function (v) { return P.t + ph - ((v - y0) / (y1 - y0)) * ph; };
      var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      var quads = [
        { x: P.l, y: P.t, w: X(mx) - P.l, h: Y(my) - P.t, color: "rgba(239,68,68,.06)" },
        { x: X(mx), y: P.t, w: P.l + pw - X(mx), h: Y(my) - P.t, color: "rgba(245,158,11,.07)" },
        { x: P.l, y: Y(my), w: X(mx) - P.l, h: P.t + ph - Y(my), color: "rgba(16,185,129,.07)" },
        { x: X(mx), y: Y(my), w: P.l + pw - X(mx), h: P.t + ph - Y(my), color: "rgba(59,130,246,.06)" },
      ];
      quads.forEach(function (q) { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.w, q.h); });
      gridY(ctx, w, P, ph, y0, y1, niceTicks(y0, y1, 4), function (v) { return nf(v, 0) + "%"; });
      ctx.font = font(600, 10);
      ctx.fillStyle = "#A8A29E";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(x0, x1, 4).forEach(function (v) { ctx.fillText(String(Math.round(v)), X(v), P.t + ph + 8); });
      var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
      pts.forEach(function (pt) { sx += pt.price; sy += pt.mag; sxx += pt.price * pt.price; sxy += pt.price * pt.mag; });
      var den = n * sxx - sx * sx;
      var b = den ? (n * sxy - sx * sy) / den : 0;
      var a = (sy - b * sx) / n;
      var yMean = sy / n, ssTot = 0, ssRes = 0;
      pts.forEach(function (pt) {
        var pred = a + b * pt.price;
        ssTot += Math.pow(pt.mag - yMean, 2);
        ssRes += Math.pow(pt.mag - pred, 2);
      });
      var r2 = ssTot ? 1 - ssRes / ssTot : 0;
      if (p > 0.45) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l, P.t, pw, ph);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(X(x0), Y(a + b * x0));
        ctx.lineTo(X(x1), Y(a + b * x1));
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      var maxPop = 0;
      pts.forEach(function (pt) { if (pt.pop > maxPop) maxPop = pt.pop; });
      pts.forEach(function (pt, i) {
        var prog = stagger(i % 12, 12, p, 0.04);
        if (prog <= 0) return;
        var rad = (4 + (pt.pop / (maxPop || 1)) * 9) * prog;
        var x = X(pt.price), y = Y(pt.mag);
        var on = canvas.__hover === "p" + i;
        ctx.beginPath();
        ctx.arc(x, y, on ? rad + 2 : rad, 0, Math.PI * 2);
        ctx.fillStyle = rgba(pt.color, on ? 0.9 : 0.72);
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        canvas.__hits.push({
          key: "p" + i, x: x - rad - 3, y: y - rad - 3, w: rad * 2 + 6, h: rad * 2 + 6,
          html: tipHTML(esc(pt.name) + " · " + esc(pt.quarter), [
            { k: "Prix du mil", v: nf(pt.price, 0) + " FCFA/kg", dot: pt.color },
            { k: "Prévalence MAG", v: nf(pt.mag, 1) + " %" },
            { k: "Population affectée", v: nf(pt.pop, 1) + " M" },
          ]),
        });
      });
      ctx.font = font(800, 11);
      ctx.fillStyle = "#B45309";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Corrélation forte   R² = " + nf(r2, 2), P.l + 8, P.t + 6);
    }, initial);
  }

  /* ---------------------------------------------------------------- 6. funnel */
  function funnel(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var steps = cfg.steps || [];
      var n = steps.length;
      if (!n) return;
      var P = { l: 6, r: 6, t: 2, b: 20 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var gap = 15;
      var bh = (ph - gap * (n - 1)) / n;
      var maxV = steps[0].value;
      steps.forEach(function (s, i) {
        var grow = stagger(i, n, p, 0.1);
        if (grow <= 0) return;
        var bw = Math.max(54, pw * (s.value / maxV) * grow);
        var x = P.l + (pw - bw) / 2;
        var y = P.t + i * (bh + gap);
        var color = lerpColor("#F59E0B", "#10B981", i / (n - 1));
        if (i > 0) {
          ctx.fillStyle = "#44403C";
          ctx.font = font(700, 9);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          var name = s.label;
          while (name.length > 4 && ctx.measureText(name).width > pw - 8) name = name.slice(0, -2);
          ctx.fillText(name, P.l + pw / 2, y - gap / 2);
        }
        topRound(ctx, x, y, bw, bh, 6);
        ctx.fillStyle = canvas.__hover === "f" + i ? lerpColor(color, "#1C1008", 0.12) : color;
        ctx.fill();
        var ink = textOn(color);
        ctx.fillStyle = ink;
        ctx.textAlign = "center";
        var valueLine = nf(s.value, 1) + " M · " + s.pct + " %";
        if (i === 0 && bh > 22) {
          ctx.textBaseline = "middle";
          ctx.font = font(800, Math.min(11, bh * 0.32));
          ctx.fillText(s.label, x + bw / 2, y + bh * 0.34);
          ctx.font = font(700, Math.min(10, bh * 0.28));
          ctx.fillText(valueLine, x + bw / 2, y + bh * 0.68);
        } else {
          var size = Math.min(12, bh * 0.42);
          ctx.font = font(800, size);
          while (size > 8 && ctx.measureText(valueLine).width > bw - 10) {
            size -= 0.5;
            ctx.font = font(800, size);
          }
          ctx.textBaseline = "middle";
          ctx.fillText(valueLine, x + bw / 2, y + bh / 2);
        }
        canvas.__hits.push({
          key: "f" + i, x: P.l, y: Math.max(P.t, y - gap), w: pw, h: bh + (i ? gap : 0),
          html: tipHTML(esc(s.label), [
            { k: "Volume", v: nf(s.value, 1) + " M" },
            { k: "Part de la cible", v: s.pct + " %" },
          ], esc(s.loss)),
        });
      });
      var lost = steps[0].value - steps[n - 1].value;
      var lostPct = Math.round(lost / steps[0].value * 100);
      ctx.fillStyle = "#B91C1C";
      ctx.font = font(800, 11);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.globalAlpha = p;
      ctx.fillText("Perdu sur le pipeline : " + nf(lost, 1) + " M  (" + lostPct + " %)", w / 2, h - 6);
      ctx.globalAlpha = 1;
    }, initial);
  }

  /* ------------------------------------------------------------- 7. rose */
  function rose(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var labels = cfg.labels || [];
      var years = cfg.years || [];
      var n = labels.length;
      if (!n || !years.length) return;
      var cx = w / 2, cy = h / 2 + 4;
      var maxR = Math.min(w, h) * 0.36;
      var maxV = cfg.max || 60;
      var rot = (1 - Math.min(1, p * 1.35)) * 0.7;
      var radP = clamp((p - 0.12) / 0.88, 0, 1);
      var TAU = Math.PI * 2;
      function colorOf(v) {
        if (v < 40) return "#10B981";
        if (v <= 48) return "#F59E0B";
        return "#EF4444";
      }
      [10, 20, 30, 40, 50].forEach(function (g) {
        if (g > maxV) return;
        var rr = (g / maxV) * maxR;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, TAU);
        ctx.strokeStyle = "rgba(120,90,40,.16)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#A8A29E";
        ctx.font = font(600, 8);
        ctx.textAlign = "left";
        ctx.fillText(g + " M", cx + 3, cy - rr - 1);
      });
      var span = TAU / n;
      var sub = span * 0.86 / years.length;
      years.forEach(function (yr, yi) {
        yr.values.forEach(function (v, i) {
          var a0 = -Math.PI / 2 + rot + i * span + yi * sub + span * 0.06;
          var a1 = a0 + sub * 0.92;
          var rr = (v / maxV) * maxR * radP;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, Math.max(0.5, rr), a0, a1);
          ctx.closePath();
          ctx.fillStyle = rgba(colorOf(v), (yr.opacity == null ? 1 : yr.opacity) * (canvas.__hover === "m" + i ? 1 : 0.88));
          ctx.fill();
          if (canvas.__hover === "m" + i) {
            ctx.strokeStyle = "#1C1008";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });
      labels.forEach(function (lb, i) {
        var a = -Math.PI / 2 + rot + i * span + span / 2;
        var lx = cx + Math.cos(a) * (maxR + 16);
        var ly = cy + Math.sin(a) * (maxR + 16);
        var soudure = cfg.soudure && i >= cfg.soudure[0] && i <= cfg.soudure[1];
        ctx.font = font(soudure ? 800 : 700, 10);
        ctx.fillStyle = soudure ? "#B91C1C" : "#44403C";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(lb, lx, ly);
        var latest = years[years.length - 1].values[i];
        var rows = years.map(function (yr) {
          return { k: String(yr.year), v: nf(yr.values[i], 0) + " M", dot: colorOf(yr.values[i]) };
        });
        var a0 = -Math.PI / 2 + rot + i * span;
        var wedge = [[cx, cy]];
        for (var k = 0; k <= 6; k++) {
          var aw = a0 + span * k / 6;
          wedge.push([cx + Math.cos(aw) * (maxR + 8), cy + Math.sin(aw) * (maxR + 8)]);
        }
        canvas.__hits.push({
          key: "m" + i,
          poly: wedge,
          html: tipHTML(esc(lb) + (soudure ? " · soudure" : ""), rows, "Intensité " + (latest > 48 ? "critique" : latest >= 40 ? "tendue" : "modérée")),
        });
      });
      if (cfg.soudure) {
        ctx.font = font(700, 9);
        ctx.fillStyle = "#B91C1C";
        ctx.textAlign = "left";
        ctx.fillText("Soudure juin–septembre", 8, 14);
      }
    }, initial);
  }

  /* ------------------------------------------------------------------ 8. carte */
  function projector(w, h) {
    var lon0 = -18.6, lon1 = 16.6, lat0 = 3.4, lat1 = 28;
    var pad = 18;
    var iw = w - pad * 2, ih = h - pad * 2 - 8;
    var s = Math.min(iw / (lon1 - lon0), ih / (lat1 - lat0));
    var ox = pad + (iw - s * (lon1 - lon0)) / 2;
    var oy = 8 + pad + (ih - s * (lat1 - lat0)) / 2;
    return function (lon, lat) { return [ox + (lon - lon0) * s, oy + (lat1 - lat) * s]; };
  }
  function choropleth(canvas, initial) {
    var api = mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var countries = cfg.countries || [];
      var proj = projector(w, h);
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#F6E7CF");
      g.addColorStop(0.42, "#E7F1F6");
      g.addColorStop(1, "#D5E7F2");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(120,90,40,.35)";
      ctx.font = font(700, 9);
      ctx.textAlign = "left";
      ctx.fillText("SAHARA", 12, 16);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(30,64,96,.45)";
      ctx.fillText("GOLFE DE GUINÉE", w - 12, h - 10);
        var small = { GM: 1, GW: 1, TG: 1, BJ: 1, SL: 1, LR: 1 };
        var nudge = { GM: [-18, 4], GW: [2, 1], SL: [0, 0], GN: [6, -2], TG: [11, 0], BJ: [9, 2], LR: [0, 2] };
        var labels = [];
      countries.forEach(function (country, i) {
        var prog = stagger(i, countries.length, p, 0.04);
        if (prog <= 0 || !country.poly) return;
        var poly = country.poly.map(function (ll) { return proj(ll[0], ll[1]); });
        ctx.beginPath();
        poly.forEach(function (pt, k) { k ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); });
        ctx.closePath();
        var on = canvas.__hover === country.code;
        ctx.fillStyle = on ? lerpColor(country.color, "#FFFFFF", 0.28) : country.color;
        ctx.globalAlpha = 0.35 + 0.65 * prog;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = on ? 2.2 : 1;
        ctx.strokeStyle = on ? "#F59E0B" : "rgba(28,16,8,.45)";
        ctx.stroke();
        var sx = 0, sy = 0;
        poly.forEach(function (pt) { sx += pt[0]; sy += pt[1]; });
        sx /= poly.length; sy /= poly.length;
        labels.push({ country: country, sx: sx, sy: sy, poly: poly });
      });
      labels.forEach(function (item) {
        var country = item.country;
        var off = nudge[country.code] || [0, 0];
        var label = small[country.code] ? country.code : country.short;
        var lx = item.sx + off[0], ly = item.sy + off[1];
        ctx.font = font(800, small[country.code] ? 8 : 10);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (small[country.code]) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(255,251,240,.94)";
          ctx.strokeText(label, lx, ly);
          ctx.fillStyle = "#1C1917";
        } else {
          ctx.fillStyle = textOn(country.color);
        }
        ctx.fillText(label, lx, ly);
        canvas.__hits.push({
          key: country.code, poly: item.poly, country: country,
          html: tipHTML(esc(country.name), [
            { k: "Phase dominante", v: "IPC " + country.phase, dot: country.color },
            { k: "Population en phase", v: nf(country.phasePop, 2) + " M" },
            { k: "FCS", v: nf(country.fcs, 1) },
            { k: "CSI", v: String(country.csi) },
          ], "Clic ou clic droit · fiche pays"),
        });
      });
    }, initial);
    function pick(ev, kind) {
      var p = local(ev, canvas);
      var h = hitAt(canvas, p.x, p.y);
      if (h && h.country && api.cfg.onPick) api.cfg.onPick(h.country, ev, kind);
    }
    canvas.addEventListener("click", function (ev) { pick(ev, "click"); });
    canvas.addEventListener("contextmenu", function (ev) {
      ev.preventDefault();
      pick(ev, "context");
    });
    return api;
  }

  /* ------------------------------------------------------- 10. double barres */
  function dualBar(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var labels = cfg.labels || [];
      var n = labels.length;
      if (!n) return;
      var P = { l: 42, r: 36, t: 16, b: 46 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var kMin = 1800, kMax = 3000;
      var Xg = function (i) { return P.l + (i + 0.5) * (pw / n); };
      var Yk = function (v) { return P.t + ph - ((v - kMin) / (kMax - kMin)) * ph; };
      var Ya = function (v) { return P.t + ph - (v / 100) * ph; };
      gridY(ctx, w, P, ph, kMin, kMax, [1800, 2100, 2400, 2700, 3000], function (v) { return String(v); });
      ctx.font = font(600, 9);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      [0, 50, 100].forEach(function (v) {
        ctx.fillStyle = "#B45309";
        ctx.fillText(v + "%", w - P.r + 4, Ya(v));
      });
      var fy = Yk(cfg.fao || 2100);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(P.l, fy);
      ctx.lineTo(w - P.r, fy);
      ctx.stroke();
      ctx.restore();
      var slot = pw / n, bw = Math.min(14, slot * 0.22);
      labels.forEach(function (lb, i) {
        var grow = stagger(i, n, p, 0.06);
        var cx = Xg(i);
        var kcal = cfg.kcal[i], acc = cfg.access[i];
        var x1 = cx - bw - 1, x2 = cx + 1;
        var yk = Yk(kcal), hk = (P.t + ph - yk) * grow;
        var ya = Ya(acc), ha = (P.t + ph - ya) * grow;
        var gap = 100 - acc;
        var yg = Ya(100), hg = (ya - yg) * grow;
        ctx.fillStyle = "#3B82F6";
        topRound(ctx, x1, P.t + ph - hk, bw, hk, 3);
        ctx.fill();
        ctx.fillStyle = "#F59E0B";
        ctx.beginPath();
        ctx.rect(x2, P.t + ph - ha, bw, ha);
        ctx.fill();
        if (hg > 0.5) {
          ctx.fillStyle = "rgba(239,68,68,.78)";
          topRound(ctx, x2, P.t + ph - ha - hg, bw, hg, 3);
          ctx.fill();
        }
        ctx.save();
        ctx.translate(cx, P.t + ph + 8);
        ctx.rotate(-0.55);
        ctx.font = font(700, 9.5);
        ctx.fillStyle = "#57534E";
        ctx.textAlign = "right";
        ctx.fillText(lb, 0, 0);
        ctx.restore();
        canvas.__hits.push({
          key: "d" + i, x: x1, y: P.t, w: bw * 2 + 4, h: ph,
          html: tipHTML(esc(cfg.names ? cfg.names[i] : lb), [
            { k: "Disponibilité", v: nf(kcal, 0) + " kcal/j", dot: "#3B82F6" },
            { k: "Accès économique", v: acc + " % ménages", dot: "#F59E0B" },
            { k: "Gap d'accès", v: gap + " %", dot: "#EF4444" },
          ], kcal >= 2100 ? "Disponibilité au-dessus du seuil FAO" : "Sous le seuil FAO 2100 kcal"),
        });
      });
      var tag = "Seuil FAO 2100 kcal";
      ctx.font = font(800, 9);
      var tw = ctx.measureText(tag).width;
      var tx = Math.min(w - P.r - tw - 6, Math.max(P.l + 4, w - P.r - tw - 8));
      var ty = clamp(fy - 16, P.t + 2, P.t + ph - 16);
      ctx.fillStyle = "rgba(255, 251, 240, .94)";
      roundRect(ctx, tx - 5, ty - 2, tw + 10, 15, 4);
      ctx.fill();
      ctx.fillStyle = "#2563EB";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(tag, tx, ty);
    }, initial);
  }

  /* ------------------------------------------------------------ 11. histogramme */
  function histogram(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var bins = cfg.bins || [];
      var n = bins.length;
      if (!n) return;
      var P = { l: 36, r: 12, t: 16, b: 28 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var maxB = 0;
      bins.forEach(function (v) { if (v > maxB) maxB = v; });
      var yMax = Math.max(28, Math.ceil(maxB / 5) * 5 + 4);
      var X = function (i) { return P.l + (i + 0.5) * (pw / n); };
      var Y = function (v) { return P.t + ph - (v / yMax) * ph; };
      function zone(i) { return i < 3 ? "rgba(239,68,68,.10)" : i <= 5 ? "rgba(245,158,11,.12)" : "rgba(16,185,129,.10)"; }
      bins.forEach(function (_, i) {
        ctx.fillStyle = zone(i);
        ctx.fillRect(P.l + i * (pw / n), P.t, pw / n, ph);
      });
      gridY(ctx, w, P, ph, 0, yMax, niceTicks(0, yMax, 4), function (v) { return nf(v, 0) + "%"; });
      var bw = pw / n * 0.72;
      bins.forEach(function (v, i) {
        var grow = stagger(i, n, p, 0.04);
        var bh = (v / yMax) * ph * grow;
        var x = X(i) - bw / 2, y = P.t + ph - bh;
        var col = i < 3 ? "#EF4444" : i <= 5 ? "#F59E0B" : "#10B981";
        topRound(ctx, x, y, bw, bh, 3);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.fillStyle = "#A8A29E";
        ctx.font = font(600, 9);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(i), X(i), P.t + ph + 6);
        canvas.__hits.push({
          key: "h" + i, x: x, y: P.t, w: bw, h: ph,
          html: tipHTML("HDDS " + i, [
            { k: "Ménages", v: nf(v, 1) + " %", dot: col },
          ], i < 3 ? "Crise (HDDS < 3)" : i <= 5 ? "Risque (HDDS 3–5)" : "Acceptable (HDDS > 5)"),
        });
      });
      var mean = 0, tot = 0, i;
      bins.forEach(function (v, idx) { mean += idx * v; tot += v; });
      mean = tot ? mean / tot : 0;
      var varr = 0;
      bins.forEach(function (v, idx) { varr += v * (idx - mean) * (idx - mean); });
      var sd = Math.sqrt(varr / (tot || 1)) || 1;
      if (p > 0.4) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l, P.t, pw, ph);
        ctx.clip();
        ctx.beginPath();
        for (i = 0; i <= 120; i++) {
          var x = i / 120 * 12;
          var z = (x - mean) / sd;
          var pdf = Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI)) * 100;
          var px = P.l + (x / 12) * pw, py = Y(pdf);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.strokeStyle = "#1C1008";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }
      function mark(val, label, color, dy) {
        var x = P.l + (val / 12) * pw;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, P.t);
        ctx.lineTo(x, P.t + ph);
        ctx.stroke();
        ctx.restore();
        ctx.font = font(800, 9);
        var tw = ctx.measureText(label).width;
        var lx = clamp(x - tw / 2, P.l, P.l + pw - tw);
        var ly = P.t + 4 + (dy || 0);
        ctx.fillStyle = "rgba(255, 251, 240, .92)";
        roundRect(ctx, lx - 4, ly - 2, tw + 8, 14, 4);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(label, lx, ly);
      }
      var closeMarks = cfg.mean != null && cfg.median != null && Math.abs(cfg.mean - cfg.median) < 0.9;
      if (closeMarks) mark(cfg.mean, "moy. " + nf(cfg.mean, 1) + " · méd. " + cfg.median, "#1C1008", 0);
      else {
        if (cfg.mean != null) mark(cfg.mean, "moy. " + nf(cfg.mean, 1), "#1C1008", 0);
        if (cfg.median != null) mark(cfg.median, "méd. " + cfg.median, "#7C3AED", 16);
      }
    }, initial);
  }

  /* ------------------------------------------------------------- 12. haltères */
  function dumbbell(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      var n = rows.length;
      if (!n) return;
      var P = { l: 78, r: 16, t: 12, b: 22 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var x0 = cfg.xMin || 24, x1 = cfg.xMax || 60;
      var X = function (v) { return P.l + ((v - x0) / (x1 - x0)) * pw; };
      var rowH = ph / n;
      ctx.font = font(600, 9);
      ctx.fillStyle = "#A8A29E";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(x0, x1, 4).forEach(function (v) { ctx.fillText(String(Math.round(v)), X(v), P.t + ph + 4); });
      var tx = X(cfg.threshold || 42);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = "#10B981";
      ctx.beginPath();
      ctx.moveTo(tx, P.t);
      ctx.lineTo(tx, P.t + ph);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#047857";
      ctx.font = font(800, 8.5);
      ctx.textAlign = "left";
      ctx.fillText("FCS 42", tx + 3, P.t + 2);
      rows.forEach(function (row, i) {
        var grow = stagger(i, n, p, 0.06);
        var y = P.t + (i + 0.5) * rowH;
        var xA = X(row.a), xB = X(row.b);
        var better = row.b >= row.a - 0.05;
        var col = better ? "#10B981" : "#EF4444";
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(xA, y);
        ctx.lineTo(xA + (xB - xA) * grow, y);
        ctx.stroke();
        function dot(x, fill) {
          ctx.beginPath();
          ctx.arc(x, y, grow * 4.6, 0, Math.PI * 2);
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        }
        dot(xA, "#A8A29E");
        dot(xB, row.b >= 42 ? "#F59E0B" : "#EF4444");
        if (grow > 0.72) {
          var delta = row.b - row.a;
          var tag = (delta >= 0 ? "+" : "") + nf(delta, 1);
          ctx.font = font(800, 8.5);
          var tw = ctx.measureText(tag).width;
          var right = Math.max(xA, xB) + 8;
          var lx = right + tw < w - 2 ? right : Math.min(xA, xB) - 8 - tw;
          ctx.fillStyle = col;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(tag, lx, y);
        }
        ctx.font = font(700, 10.5);
        ctx.fillStyle = "#1C1917";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(row.name, P.l - 8, y);
        var delta = row.b - row.a;
        canvas.__hits.push({
          key: "db" + i, x: P.l, y: y - rowH / 2, w: pw, h: rowH,
          html: tipHTML(esc(row.name), [
            { k: "FCS 2020", v: nf(row.a, 1), dot: "#A8A29E" },
            { k: "FCS 2024", v: nf(row.b, 1), dot: col },
            { k: "Variation", v: (delta >= 0 ? "+" : "") + nf(delta, 1) + "  (" + (row.a ? nf(delta / row.a * 100, 1) : "0") + " %)" },
          ], better ? "Amélioration" : "Dégradation"),
        });
      });
    }, initial);
  }

  /* ---------------------------------------------------- 13. calendrier alertes */
  function calendar(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [], cols = cfg.cols || [];
      if (!rows.length || !cols.length) return;
      var P = { l: 72, r: 8, t: 20, b: 8 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var cw = pw / cols.length, rh = ph / rows.length;
      var scale = ["#86EFAC", "#D9F99D", "#FCD34D", "#FB923C", "#EF4444"];
      ctx.font = font(700, 9);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      cols.forEach(function (lb, i) {
        ctx.fillStyle = "#A8A29E";
        ctx.fillText(lb, P.l + i * cw + cw / 2, P.t - 3);
      });
      rows.forEach(function (row, ri) {
        var rowP = stagger(ri, rows.length, p, 0.06);
        ctx.font = font(700, 10);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1C1917";
        ctx.fillText(row.name, P.l - 6, P.t + ri * rh + rh / 2);
        row.values.forEach(function (v, ci) {
          if (rowP <= 0) return;
          var x = P.l + ci * cw, y = P.t + ri * rh;
          ctx.globalAlpha = rowP;
          ctx.fillStyle = scale[clamp(v, 1, 5) - 1];
          roundRect(ctx, x + 1.5, y + 1.5, cw - 3, rh - 3, 4);
          ctx.fill();
          ctx.globalAlpha = 1;
          if (rh > 14 && cw > 14) {
            ctx.fillStyle = v >= 4 ? "#fff" : "#1C1917";
            ctx.font = font(800, Math.min(11, rh * 0.42));
            ctx.textAlign = "center";
            ctx.fillText(String(v), x + cw / 2, y + rh / 2);
          }
          if (canvas.__hover === ri + ":" + ci) {
            ctx.strokeStyle = "#1C1008";
            ctx.lineWidth = 1.4;
            ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
          }
          var level = ["", "Calme", "Veille", "Tension", "Alerte", "Urgence"][v] || "";
          canvas.__hits.push({
            key: ri + ":" + ci, x: x, y: y, w: cw, h: rh,
            html: tipHTML(esc(row.full || row.name) + " · " + esc(cols[ci]) + " 2024", [
              { k: "Niveau d'alerte", v: v + " · " + level, dot: scale[v - 1] },
              { k: "Personnes exposées", v: nf(row.exposed * (0.55 + v * 0.1), 2) + " M" },
            ]),
          });
        });
      });
    }, initial);
  }

  /* ------------------------------------------------------------ 14. waterfall */
  function waterfall(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var items = cfg.items || [];
      var n = items.length;
      if (!n) return;
      var P = { l: 36, r: 10, t: 16, b: 48 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var max = cfg.max || 3.2;
      var Y = function (v) { return P.t + ph - (v / max) * ph; };
      gridY(ctx, w, P, ph, 0, max, [0, 0.7, 1.4, 2.1, 2.8], function (v) { return nf(v, 1); });
      var slot = pw / n, bw = Math.min(36, slot * 0.55);
      var prevX = null, prevY = null, prevEnd = null;
      items.forEach(function (it, i) {
        var grow = stagger(i, n, p, 0.1);
        var x = P.l + i * slot + (slot - bw) / 2;
        var y0 = Y(it.from);
        var y1 = Y(it.from + it.value);
        var top = Math.min(y0, y1);
        var bh = Math.abs(y1 - y0) * grow;
        var y = it.kind === "gap" ? y1 + (y0 - y1) * (1 - grow) : top + (1 - grow) * 18;
        var color = it.kind === "gap" ? "#EF4444" : it.kind === "in" ? "#10B981" : it.kind === "total" ? "#059669" : "#F59E0B";
        ctx.globalAlpha = 0.35 + 0.65 * grow;
        topRound(ctx, x, y, bw, Math.max(2, bh), 4);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (prevEnd != null && Math.abs(prevEnd - it.from) < 0.05 && prevX != null && grow > 0.5) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "rgba(28,16,8,.35)";
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, y + bh);
          ctx.stroke();
          ctx.restore();
        }
        prevEnd = it.from + it.value;
        prevX = x + bw;
        prevY = y;
        ctx.fillStyle = "#44403C";
        ctx.font = font(700, 9);
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(x + bw / 2, P.t + ph + 8);
        ctx.rotate(-0.5);
        ctx.textAlign = "right";
        ctx.fillText(it.label, 0, 0);
        ctx.restore();
        if (grow > 0.75) {
          ctx.fillStyle = "#1C1917";
          ctx.font = font(800, 9);
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          var sign = it.kind === "gap" ? "−" : it.kind === "in" ? "+" : "";
          ctx.fillText(sign + nf(it.value, 1), x + bw / 2, y - 3);
        }
        canvas.__hits.push({
          key: "wf" + i, x: x, y: top, w: bw, h: Math.abs(y1 - y0),
          html: tipHTML(esc(it.label), [
            { k: "Montant", v: (it.kind === "gap" ? "−" : it.kind === "in" ? "+" : "") + nf(it.value, 1) + " Mds USD", dot: color },
            { k: "Position", v: nf(it.from, 1) + " → " + nf(it.from + it.value, 1) },
          ], it.kind === "gap" ? "Financement manquant" : it.kind === "in" ? "Contribution" : "Total"),
        });
      });
    }, initial);
  }

  /* -------------------------------------------------------------- 15. bullets */
  function bullets(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      var ind = cfg.indicator;
      if (!ind || !rows.length) return;
      var P = { l: 62, r: 36, t: 8, b: 6 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var rh = ph / rows.length;
      var min = ind.min, max = ind.max;
      var X = function (v) { return P.l + ((clamp(v, min, max) - min) / (max - min || 1)) * pw; };
      rows.forEach(function (row, i) {
        var grow = stagger(i, rows.length, p, 0.05);
        var y = P.t + i * rh + rh * 0.22;
        var bh = rh * 0.56;
        ctx.fillStyle = "#E7E5E4";
        roundRect(ctx, P.l, y, pw, bh, 4);
        ctx.fill();
        var valW = (X(row.value) - P.l) * grow;
        ctx.fillStyle = row.ok ? "#10B981" : "#EF4444";
        roundRect(ctx, P.l, y + bh * 0.18, Math.max(0, valW), bh * 0.64, 3);
        ctx.fill();
        var tx = X(ind.target);
        ctx.fillStyle = "#1C1917";
        ctx.fillRect(tx - 1, y - 1, 2, bh + 2);
        var px = X(row.prev);
        ctx.beginPath();
        ctx.arc(px, y + bh / 2, 3.1, 0, Math.PI * 2);
        ctx.fillStyle = "#1C1917";
        ctx.fill();
        ctx.font = font(700, 10);
        ctx.fillStyle = "#1C1917";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(row.name, P.l - 6, y + bh / 2);
        ctx.textAlign = "left";
        ctx.font = font(800, 9);
        ctx.fillStyle = row.ok ? "#047857" : "#B91C1C";
        ctx.fillText(nf(row.value, ind.unit === "×" ? 2 : ind.unit === "" && row.value < 20 ? 1 : 0), P.l + pw + 4, y + bh / 2);
        canvas.__hits.push({
          key: "b" + i, x: P.l, y: y - 2, w: pw, h: bh + 4,
          html: tipHTML(esc(ind.label) + " · " + esc(row.name), [
            { k: "Valeur", v: nf(row.value, 1) + (ind.unit || ""), dot: row.ok ? "#10B981" : "#EF4444" },
            { k: "Objectif", v: nf(ind.target, ind.target < 5 ? 1 : 0) + (ind.unit || "") },
            { k: "Année précédente", v: nf(row.prev, 1) + (ind.unit || "") },
          ], row.ok ? "Objectif atteint" : "Sous l'objectif"),
        });
      });
    }, initial);
  }

  /* ----------------------------------------------------------- minis KPI */
  function miniBars(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      if (!rows.length) return;
      var max = 0;
      rows.forEach(function (r) { if (r.value > max) max = r.value; });
      var gap = 3, bw = (w - gap * (rows.length - 1)) / rows.length;
      rows.forEach(function (r, i) {
        var grow = stagger(i, rows.length, p, 0.06);
        var bh = (r.value / (max || 1)) * (h - 2) * grow;
        ctx.fillStyle = i === 0 ? "#F59E0B" : "#FDE68A";
        topRound(ctx, i * (bw + gap), h - bh, bw, bh, 2);
        ctx.fill();
        canvas.__hits.push({
          key: "m" + i, x: i * (bw + gap), y: 0, w: bw, h: h,
          html: tipHTML(esc(r.name), [{ k: "Insécurité", v: nf(r.value, 1) + " M" }]),
        });
      });
    }, initial);
  }
  function miniGauge(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var max = cfg.max || 70;
      var y = h / 2, bh = Math.min(10, h * 0.42);
      var x = 2, pw = w - 4;
      function seg(a, b, color) {
        var x0 = x + (a / max) * pw, x1 = x + (b / max) * pw;
        ctx.fillStyle = color;
        ctx.fillRect(x0, y - bh / 2, Math.max(0, x1 - x0), bh);
      }
      seg(0, 28, "#FECACA");
      seg(28, 42, "#FDE68A");
      seg(42, max, "#BBF7D0");
      var cursor = x + (clamp(cfg.value || 0, 0, max) / max) * pw * p;
      ctx.fillStyle = "#1C1008";
      ctx.beginPath();
      ctx.moveTo(cursor, y - bh / 2 - 3);
      ctx.lineTo(cursor - 4, y - bh / 2 - 8);
      ctx.lineTo(cursor + 4, y - bh / 2 - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(cursor - 1, y - bh / 2 - 2, 2, bh + 4);
      ctx.font = font(700, 8);
      ctx.fillStyle = "#78716C";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Pauvre", 2, y + bh / 2 + 3);
      ctx.textAlign = "center";
      ctx.fillText("Limite", x + ((28 + 42) / 2 / max) * pw, y + bh / 2 + 3);
      ctx.textAlign = "right";
      ctx.fillText("Acceptable", w - 2, y + bh / 2 + 3);
    }, initial);
  }
  function miniLine(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var data = cfg.data || [];
      if (data.length < 2) return;
      var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
      var pad = 3;
      var X = function (i) { return pad + (i / (data.length - 1)) * (w - pad * 2); };
      var Y = function (v) { return h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2); };
      var pts = data.map(function (v, i) { return { x: X(i), y: Y(v) }; });
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w * p, h);
      ctx.clip();
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(239,68,68,.28)");
      g.addColorStop(1, "rgba(239,68,68,.02)");
      ctx.beginPath();
      smooth(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, h);
      ctx.lineTo(pts[0].x, h);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      smooth(ctx, pts);
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
      var last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#EF4444";
      ctx.fill();
    }, initial);
  }

  root.WFPCharts = {
    stackedBar: stackedBar,
    multiLine: multiLine,
    heatmap: heatmap,
    radar: radar,
    scatter: scatter,
    funnel: funnel,
    rose: rose,
    choropleth: choropleth,
    dualBar: dualBar,
    histogram: histogram,
    dumbbell: dumbbell,
    calendar: calendar,
    waterfall: waterfall,
    bullets: bullets,
    miniBars: miniBars,
    miniGauge: miniGauge,
    miniLine: miniLine,
    repaintAll: repaintAll,
    hideTip: hideTip,
    nf: nf,
    esc: esc,
    tipHTML: tipHTML,
  };
})(typeof window !== "undefined" ? window : globalThis);
