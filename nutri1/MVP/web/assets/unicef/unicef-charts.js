/* ============================================================================
   NUTRI.N°1 — UNICEF · CHILD NUTRITION ANALYTICS · AFRIQUE DE L'OUEST
   unicef-charts.js — moteur de graphiques 100 % Canvas API.

   Zéro framework, zéro Chart.js. Chaque fabrique renvoie
   { update, repaint, destroy, cfg } :
     update(cfg) réinitialise la configuration puis rejoue l'animation ;
     repaint()   redessine l'état final (survol, redimensionnement) ;
     destroy()   retire le canvas du registre global.
   Les données proviennent de window.UNICEF_DATA (unicef-data.js), chargé
   avant ce fichier.
   ============================================================================ */
(function (root) {
  "use strict";

  var D = root.UNICEF_DATA;
  var C = D ? D.COLORS : {};
  var BANDS = D ? D.BANDS : {};

  var reduce = false;
  try { reduce = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
  var DUR = 1000;
  var REG = [];
  var tipEl = null;
  var lastProbe = null;   /* dernière position du curseur, suivie hors du canvas
                             (le hit-testing des navigateurs est interne au DOM,
                             ce qui n'est pas reproductible en DOM simulé) */

  function dpr() { return Math.min(root.devicePixelRatio || 1, 2); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  /* Graisses normalisées sur les centaines : les moteurs qui n'acceptent pas
     les valeurs intermédiaires (650, 750, 850) les interprètent comme une
     taille de police, ce qui casse le rendu. */
  function font(w, s) {
    var n = w ? Math.max(100, Math.min(900, Math.round(Number(w) / 100) * 100)) : 0;
    return (n ? n + " " : "") + s + "px 'Segoe UI', system-ui, Arial, sans-serif";
  }
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
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 > 0.68 ? C.ink : "#FFFFFF";
  }
  function nf(v, d) {
    var n = Number(v);
    if (!isFinite(n)) return "—";
    if (n === 0) n = 0;
    return n.toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  /* 86 -> "86" mais 84.7 -> "84,7" */
  function fmt(v, dec) {
    var d = dec == null ? (Math.round(v * 10) % 10 === 0 ? 0 : 1) : dec;
    return nf(v, d);
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
  /* Courbe de Bézier lissée passant par tous les points (Catmull-Rom → Bézier) */
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
  /* ------------------------------------------------------------------ tip */
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "un-tip";
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
    return '<div class="un-tip-t">' + title + "</div>" +
      (rows || []).map(function (r) {
        return '<div class="un-tip-r">' + (r.dot ? '<i style="background:' + r.dot + '"></i>' : "") +
          "<span>" + r.k + "</span><b>" + r.v + "</b></div>";
      }).join("") + (foot ? '<div class="un-tip-s">' + foot + "</div>" : "");
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
      canvas.__last = p;
      lastProbe = { canvas: canvas, x: p.x, y: p.y };   /* graphiques qui calculent leur cible au survol */
      var h = hitAt(canvas, p.x, p.y);
      var key = h ? h.key : null;
      if (key !== canvas.__hover) {
        canvas.__hover = key;
        if (!canvas.__raf) api.repaint();
      }
      canvas.style.cursor = h ? "pointer" : "default";
      if (h && h.html) showTip(h.html, ev);
      else {
        var probe = probeTip(canvas, p);
        if (probe) showTip(probe, ev);
        else hideTip();
      }
    });
    canvas.addEventListener("mouseleave", function () {
      if (lastProbe && lastProbe.canvas === canvas) lastProbe = null;
      if (canvas.__hover != null) {
        canvas.__hover = null;
        if (!canvas.__raf) api.repaint();
      }
      canvas.style.cursor = "default";
      hideTip();
    });
  }
  /* Renseigné par les graphiques qui dessinent une infobulle au survol sans
     zone cliquable (courbes, nuages de points). */
  var PROBES = {};
  function probeFor(canvas) { return PROBES[canvas.__unId] || null; }
  function probeTip(canvas, p) {
    var fn = probeFor(canvas);
    if (!fn) return null;
    try { return fn(p) || null; } catch (e) { return null; }
  }
  function regProbe(canvas, fn) {
    if (!canvas.__unId) canvas.__unId = "un" + (++probeSeq);
    PROBES[canvas.__unId] = fn;
  }
  var probeSeq = 0;

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
  function gridY(ctx, w, P, ph, yMin, yMax, ticks, format, color) {
    ctx.font = font(600, 10);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ticks.forEach(function (v) {
      var y = P.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
      ctx.strokeStyle = color || "rgba(28,171,226,.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(P.l, y);
      ctx.lineTo(w - P.r, y);
      ctx.stroke();
      ctx.fillStyle = C.muted;
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
  function dash(ctx, on, off) {
    ctx.setLineDash(off ? [on, off] : [on]);
  }
  function noDash(ctx) { ctx.setLineDash([]); }

  /* ==========================================================================
     1. COURBES DE CROISSANCE OMS  (percentiles P3 → P97)
     cfg : { sex: "boys"|"girls", metric: "weight"|"height"|"pb" }
     ========================================================================== */
  function growth(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var G = D.GROWTH;
      var sex = cfg.sex || "boys";
      var metricId = cfg.metric || "weight";
      var metric = null, i, j;
      G.metrics.forEach(function (m) { if (m.id === metricId) metric = m; });
      if (!metric) return;
      var S = G.series[sex][metricId];
      var months = G.months;
      var keys = G.percentiles;
      var yMin = metric.yMin, yMax = metric.yMax;
      var P = { l: 54, r: 62, t: 16, b: 28 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var X = function (m) { return P.l + (m / 60) * pw; };
      var Y = function (v) { return P.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph; };
      var from = metric.fromMonth || 0;

      function ptsOf(key) {
        var out = [];
        for (var k = 0; k < months.length; k++) {
          var v = S[key][k];
          if (v == null || months[k] < from) continue;
          out.push({ x: X(months[k]), y: Y(v), v: v, m: months[k] });
        }
        return out;
      }
      var PTS = {};
      keys.forEach(function (k) { PTS[k] = ptsOf(k); });

      /* --- zones colorées entre percentiles ------------------------------ */
      function band(lowKey, highKey, fill, top) {
        var a = PTS[lowKey], b = top ? null : PTS[highKey];
        if (!a.length) return;
        ctx.beginPath();
        smooth(ctx, a);
        if (top) {
          ctx.lineTo(a[a.length - 1].x, P.t);
          ctx.lineTo(a[0].x, P.t);
        } else {
          for (var k = b.length - 1; k >= 0; k--) ctx.lineTo(b[k].x, b[k].y);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      }
      band("p3", "p15", BANDS.rose, false);
      band("p15", "p85", BANDS.green, false);
      band("p85", "p97", BANDS.orange, false);
      band("p97", null, BANDS.rose, true);

      /* --- avant 6 mois : zone « non mesuré » pour le PB ------------------ */
      if (from > 0) {
        ctx.fillStyle = "rgba(255,255,255,.72)";
        ctx.fillRect(P.l, P.t, X(from) - P.l, ph);
        ctx.strokeStyle = rgba(C.cyan, 0.35);
        noDash(ctx);
        ctx.lineWidth = 1;
        ctx.strokeRect(P.l + 0.5, P.t + 0.5, X(from) - P.l - 1, ph - 1);
        ctx.save();
        ctx.translate(P.l + (X(from) - P.l) / 2, P.t + ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.font = font(700, 9.5);
        ctx.fillStyle = C.muted;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PB non mesuré avant 6 mois", 0, 0);
        ctx.restore();
      }

      /* --- grille ------------------------------------------------------- */
      var ticks = niceTicks(yMin, yMax, 5);
      gridY(ctx, w, P, ph, yMin, yMax, ticks, function (v) { return fmt(v, 0) + metric.unit.replace(" ", ""); });
      ctx.font = font(600, 10);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (j = 0; j <= 60; j += 6) {
        ctx.fillStyle = C.muted;
        ctx.fillText(j === 0 ? "0" : j + "m", X(j), P.t + ph + 8);
      }
      ctx.strokeStyle = "rgba(28,171,226,.3)";
      ctx.beginPath();
      ctx.moveTo(P.l, P.t + ph);
      ctx.lineTo(w - P.r, P.t + ph);
      ctx.stroke();

      /* --- courbes tracées de gauche à droite, en séquence --------------- */
      keys.forEach(function (key, idx) {
        var pts = PTS[key];
        if (!pts.length) return;
        var prog = stagger(idx, keys.length + 1, p, 0.15);
        if (prog <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l, P.t - 2, Math.max(0.01, pw * prog), ph + 6);
        ctx.clip();
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = G.percentileColors[key];
        ctx.lineWidth = key === "p50" ? 2.4 : 1.5;
        if (key === "p3" || key === "p97") dash(ctx, 4, 3);
        else noDash(ctx);
        ctx.stroke();
        noDash(ctx);
        ctx.restore();
        /* étiquettes de percentile à droite, en fondu */
        var alpha = clamp((prog - 0.72) / 0.28, 0, 1);
        if (alpha > 0) {
          var last = pts[pts.length - 1];
          ctx.globalAlpha = alpha;
          ctx.font = font(800, 10.5);
          ctx.fillStyle = G.percentileColors[key];
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(G.percentileLabels[key], w - P.r + 6, last.y);
          ctx.globalAlpha = 1;
        }
      });

      /* --- survol : valeur au curseur + couloir OMS le plus proche -------- */
      regProbe(canvas, function (probe) {
        var i, best = null, bestD = Infinity;
        for (i = 0; i < months.length; i++) {
          if (months[i] < from) continue;
          var d = Math.abs(X(months[i]) - probe.x);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (best == null || bestD > 26) return null;
        var msel = months[best];
        var rows = keys.map(function (key) {
          return { k: G.percentileLabels[key], v: fmt(S[key][best], metric.dec) + metric.unit, dot: G.percentileColors[key] };
        });
        /* couloir le plus proche verticalement */
        var selKey = "p50", bd2 = Infinity;
        keys.forEach(function (key) {
          if (S[key][best] == null) return;
          var d2 = Math.abs(Y(S[key][best]) - probe.y);
          if (d2 < bd2) { bd2 = d2; selKey = key; }
        });
        var childVal = null;
        for (var c2 = 0; c2 < child.months.length; c2++) {
          if (child.months[c2] === msel) {
            var arr2 = metricId === "height" ? child.height : metricId === "pb" ? child.pb : child.values;
            childVal = arr2 ? arr2[c2] : null;
          }
        }
        var foot = childVal != null
          ? "Enfant suivi : " + fmt(childVal, metric.dec) + metric.unit + " — " + percentileOf(metricId, sex, months, S, childVal, msel)
          : "Couloir " + G.percentileLabels[selKey] + " · référence OMS 2006";
        return tipHTML(metric.label + " · " + msel + " mois", rows, foot);
      });

      /* --- série enfant suivie ------------------------------------------ */
      var child = G.child;
      var seriesKey = metricId === "height" ? "height" : metricId === "pb" ? "pb" : "values";
      var cpts = [];
      for (i = 0; i < child.months.length; i++) {
        if (child.months[i] < from) continue;
        var cv = child[seriesKey] ? child[seriesKey][i] : null;
        if (cv == null) continue;
        cpts.push({ x: X(child.months[i]), y: Y(cv), v: cv, m: child.months[i] });
      }
      if (cpts.length) {
        var cp = stagger(keys.length, keys.length + 1, p, 0.15);
        if (cp > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(P.l, P.t - 2, Math.max(0.01, pw * cp), ph + 6);
          ctx.clip();
          ctx.beginPath();
          smooth(ctx, cpts);
          ctx.strokeStyle = "#082F49";
          ctx.lineWidth = 2.2;
          dash(ctx, 5, 4);
          ctx.stroke();
          noDash(ctx);
          ctx.restore();
          cpts.forEach(function (pt, k) {
            var r = 4.4 + (canvas.__hover === "child" + k ? 1.6 : 0);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
            ctx.lineWidth = 2.2;
            ctx.strokeStyle = "#082F49";
            ctx.stroke();
            canvas.__hits.push({
              key: "child" + k,
              poly: [[pt.x - 9, pt.y - 9], [pt.x + 9, pt.y - 9], [pt.x + 9, pt.y + 9], [pt.x - 9, pt.y + 9]],
              html: tipHTML(esc(child.name), [
                { k: "Âge", v: pt.m + " mois" },
                { k: metric.label, v: fmt(pt.v, metric.dec) + metric.unit, dot: C.cyan },
              ], percentileOf(metricId, sex, months, S, pt.v, pt.m)),
            });
          });
        }
      }

      /* --- légende percentiles ------------------------------------------ */
      ctx.font = font(700, 9.5);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      var lx = P.l + 2;
      keys.forEach(function (key) {
        ctx.fillStyle = G.percentileColors[key];
        ctx.fillRect(lx, P.t + 2, 8, 3);
        ctx.fillStyle = C.muted;
        ctx.fillText(G.percentileLabels[key], lx + 11, P.t + 4);
        lx += 34;
      });
      ctx.fillStyle = C.ink;
      ctx.font = font(700, 9.5);
      ctx.fillText("┄ " + child.name, lx + 4, P.t + 4);
    }, initial);
  }
  /* Position approximative d'une valeur dans les couloirs OMS */
  function percentileOf(metricId, sex, months, S, value, month) {
    var idx = 0;
    for (var i = 0; i < months.length; i++) { if (months[i] <= month) idx = i; }
    var keys = ["p3", "p15", "p50", "p85", "p97"];
    var prevKey = null;
    for (var k = 0; k < keys.length; k++) {
      var ref = S[keys[k]][idx];
      if (ref == null) continue;
      if (value < ref) return prevKey ? "Entre " + prevKey + " et " + keys[k].toUpperCase() : "Sous P3";
      prevKey = keys[k].toUpperCase();
    }
    return "Au-dessus de P97";
  }

  /* ==========================================================================
     2. TUNNEL MAS — PRISE EN CHARGE  (entonnoir horizontal + pertes)
     cfg : { steps: D.FUNNEL }
     ========================================================================== */
  function funnel(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var steps = cfg.steps || D.FUNNEL;
      if (!steps.length) return;
      /* Deux bandes distinctes : les libellés d'étape en haut (2 lignes),
         le cône au centre, les pertes sous le cône. */
      var topH = 30, botH = 44;
      var P = { l: 14, r: 14, t: 4 };
      var pw = w - P.l - P.r;
      var sw = pw / steps.length;
      var coneTop = P.t + topH;
      var coneH = h - topH - botH - P.t;
      if (coneH < 80) coneH = 80;
      var cy = coneTop + coneH / 2;
      var maxHalf = coneH / 2;
      var i, q;

      /* libellés d'étape, au-dessus du cône, sur une ou deux lignes */
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      steps.forEach(function (st, k) {
        var x = P.l + k * sw + sw / 2;
        var lines = wrap(ctx, st.short, sw - 8, 2);
        ctx.font = font(700, 9);
        lines.forEach(function (ln, li) {
          ctx.fillStyle = li === 0 ? C.ink : C.muted;
          ctx.font = li === 0 ? font(700, 9.2) : font(600, 8.6);
          ctx.fillText(ln, x, P.t + 2 + li * 11);
        });
      });

      /* particules de dépistage : elles se raréfient avec la couverture */
      var pr = stagger(0, 1, p, 0.1);
      for (q = 0; q < 46; q++) {
        var t = q / 46;
        var stp = steps[Math.min(steps.length - 1, Math.floor(t * steps.length))];
        var hh = (stp.pct / 100) * maxHalf;
        var x2 = P.l + t * pw;
        var yy = cy + Math.sin(q * 1.9) * Math.max(2, hh * 0.72);
        ctx.beginPath();
        ctx.arc(x2, yy, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = rgba("#FFFFFF", 0.3 * pr);
        ctx.fill();
      }
      function silhouette() {
        ctx.beginPath();
        ctx.moveTo(P.l, cy - maxHalf);
        for (var k = 0; k < steps.length; k++) {
          ctx.lineTo(P.l + (k + 1) * sw, cy - (steps[k].pct / 100) * maxHalf);
        }
        for (var m2 = steps.length - 1; m2 >= 0; m2--) {
          ctx.lineTo(P.l + (m2 + 1) * sw, cy + (steps[m2].pct / 100) * maxHalf);
        }
        ctx.lineTo(P.l, cy + maxHalf);
        ctx.closePath();
      }
      /* silhouette de l'entonnoir, d'un seul tenant */
      silhouette();
      var g = ctx.createLinearGradient(P.l, 0, P.l + pw, 0);
      g.addColorStop(0, "#E5243B");
      g.addColorStop(0.34, "#F26A21");
      g.addColorStop(0.62, "#DDA63A");
      g.addColorStop(1, "#4D9950");
      ctx.fillStyle = rgba("#FFFFFF", 0.5);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = g;
      ctx.fillRect(P.l, cy - maxHalf, pw * clamp(p * 1.1, 0, 1), maxHalf * 2);
      ctx.restore();
      silhouette();
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      /* séparateurs + valeurs */
      steps.forEach(function (st, k) {
        var x0 = P.l + k * sw, x1 = x0 + sw;
        var h1 = (st.pct / 100) * maxHalf;
        var nxt = steps[k + 1];
        var h2 = ((nxt ? nxt.pct : st.pct) / 100) * maxHalf;
        var prog = stagger(k, steps.length, p, 0.11);
        if (prog > 0.6) {
          ctx.beginPath();
          ctx.moveTo(x1, cy - h2);
          ctx.lineTo(x1, cy + h2);
          ctx.strokeStyle = "rgba(255,255,255,.5)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (prog > 0.7) {
          ctx.globalAlpha = clamp((prog - 0.7) / 0.3, 0, 1);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = font(800, 12.5);
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(st.pct + " %", x0 + sw / 2, cy - 6);
          ctx.font = font(700, 9);
          ctx.fillStyle = "rgba(255,255,255,.92)";
          ctx.fillText(compact(st.value), x0 + sw / 2, cy + 8);
          ctx.globalAlpha = 1;
        }
        canvas.__hits.push({
          key: "f" + k,
          poly: [[x0, cy - h1], [x1, cy - h2], [x1, cy + h2], [x0, cy + h1]],
          html: tipHTML(esc(st.name), [
            { k: "Enfants", v: nf(st.value, 0) },
            { k: "Part du total MAS", v: st.pct + " %" },
            { k: k === 0 ? "Perte cumulée" : "Perte vs étape précédente", v: k === 0 ? "—" : "−" + (steps[k - 1].pct - st.pct) + " pts", dot: C.danger },
          ], k === steps.length - 1 ? "Couverture complète de la cohorte" : "Étape " + (k + 1) + " / " + steps.length),
        });
        /* flèche de perte sous le cône, centrée sur le bord de l'étape */
        if (nxt) {
          var loss = st.pct - nxt.pct;
          var gx = x1;
          var maxH = Math.max(h1, h2);
          var gy = cy + maxH + 8;
          if (gy > h - botH + 4) gy = h - botH + 4;
          ctx.globalAlpha = clamp((prog - 0.4) / 0.6, 0, 1);
          ctx.beginPath();
          ctx.moveTo(gx - 4, gy);
          ctx.lineTo(gx + 4, gy);
          ctx.lineTo(gx, gy + 7);
          ctx.closePath();
          ctx.fillStyle = rgba(C.danger, 0.9);
          ctx.fill();
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.font = font(800, 9);
          ctx.fillStyle = C.danger;
          ctx.fillText("−" + loss + " %", gx, gy + 8);
          ctx.font = font(600, 8);
          ctx.fillStyle = C.muted;
          ctx.fillText("non touchés", gx, gy + 19);
          ctx.globalAlpha = 1;
        }
      });
    }, initial);
  }

  function compact(v) {
    if (v >= 1e6) return nf(v / 1e6, v % 1e6 === 0 ? 0 : 1) + " M";
    if (v >= 1e3) return nf(v / 1e3, 0) + " K";
    return nf(v, 0);
  }
  function wrap(ctx, text, maxWidth, maxLines) {
    var words = String(text).split(" "), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && cur) {
        lines.push(cur);
        cur = words[i];
      } else cur = test;
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, "…");
    }
    return lines;
  }

  /* ==========================================================================
     3. RADAR ANJE — 8 INDICATEURS  (octogone, 4 pays + benchmark OMS)
     cfg : { axes: D.ANJE, benchmark: [...], series: [{name,color,values[]}] }
     ========================================================================== */
  function radar(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var axes = cfg.axes || [];
      var series = cfg.series || [];
      var m = axes.length;
      if (!m) return;
      var cx = w / 2, cy = h / 2 + 4;
      var R = Math.min(w * 0.30, h * 0.31);
      var i;
      function ang(i2) { return -Math.PI / 2 + (i2 / m) * Math.PI * 2; }
      function pt(i2, v) {
        var a = ang(i2);
        return { x: cx + Math.cos(a) * (R * clamp(v, 0, 100) / 100), y: cy + Math.sin(a) * (R * clamp(v, 0, 100) / 100) };
      }

      /* anneaux + rayons */
      for (var ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        for (i = 0; i <= m; i++) {
          var q = pt(i % m, ring * 25);
          if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
        ctx.strokeStyle = ring === 4 ? rgba(C.cyan, 0.55) : rgba(C.cyan, 0.2);
        ctx.lineWidth = ring === 4 ? 1.4 : 1;
        ctx.stroke();
      }
      for (i = 0; i < m; i++) {
        var e = pt(i, 100);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(e.x, e.y);
        ctx.strokeStyle = rgba(C.cyan, 0.18);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      /* échelle 0-100 */
      ctx.font = font(600, 8.5);
      ctx.fillStyle = C.muted;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("100", cx - 4, cy - R);
      ctx.fillText("50", cx - 4, cy - R / 2);

      /* benchmark OMS (rouge pointillé) */
      if (cfg.benchmark) {
        for (var st = 0; st < series.length + 1; st++) {
          var progB = stagger(st, series.length + 2, p, 0.1);
          if (progB < 0.5) break;
        }
        ctx.beginPath();
        for (i = 0; i <= m; i++) {
          var b = pt(i % m, cfg.benchmark[i % m]);
          if (i === 0) ctx.moveTo(b.x, b.y); else ctx.lineTo(b.x, b.y);
        }
        ctx.closePath();
        dash(ctx, 5, 4);
        ctx.strokeStyle = C.danger;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        noDash(ctx);
        ctx.fillStyle = rgba(C.danger, 0.05);
        ctx.fill();
      }

      /* pays */
      series.forEach(function (s, si) {
        var prog = stagger(si, series.length, p, 0.12);
        if (prog <= 0) return;
        var poly = [];
        ctx.beginPath();
        for (i = 0; i <= m; i++) {
          var v = s.values[i % m] * prog;
          var q2 = pt(i % m, v);
          poly.push([q2.x, q2.y]);
          if (i === 0) ctx.moveTo(q2.x, q2.y); else ctx.lineTo(q2.x, q2.y);
        }
        ctx.closePath();
        ctx.fillStyle = rgba(s.color, 0.15);
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        for (i = 0; i < m; i++) {
          var q3 = pt(i, s.values[i] * prog);
          ctx.beginPath();
          ctx.arc(q3.x, q3.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
        var hull = [];
        for (i = 0; i < m; i++) hull.push(pt(i, s.values[i]));
        canvas.__hits.push({
          key: "r" + s.name,
          poly: hull,
          html: tipHTML(esc(s.name) + " · ANJE", axes.map(function (a, k) {
            return { k: a.short, v: s.values[k] + " % / " + a.target + " %" };
          }), "Score composite : " + (D.BY_CODE[s.code] ? D.BY_CODE[s.code].score : "—") + " / 100"),
        });
      });

      /* libellés des axes */
      ctx.font = font(700, 9.5);
      for (i = 0; i < m; i++) {
        var a2 = ang(i);
        var lx = cx + Math.cos(a2) * (R + 16);
        var ly = cy + Math.sin(a2) * (R + 16);
        var align = Math.abs(Math.cos(a2)) < 0.25 ? "center" : (Math.cos(a2) > 0 ? "left" : "right");
        ctx.textAlign = align;
        ctx.textBaseline = Math.abs(Math.sin(a2)) > 0.8 ? (Math.sin(a2) > 0 ? "top" : "bottom") : "middle";
        var words = axes[i].short.split(" ");
        var lines = [];
        var cur = "";
        for (var k2 = 0; k2 < words.length; k2++) {
          var test = cur ? cur + " " + words[k2] : words[k2];
          if (ctx.measureText(test).width > 74 && cur) { lines.push(cur); cur = words[k2]; } else cur = test;
        }
        if (cur) lines.push(cur);
        ctx.fillStyle = axes[i].inverse ? C.orange : C.ink;
        lines.forEach(function (ln, kk) {
          ctx.fillText(ln, lx, ly + (kk - (lines.length - 1) / 2) * 10.5);
        });
        ctx.font = font(600, 8.2);
        ctx.fillStyle = C.muted;
        ctx.fillText("cible " + axes[i].target + " %", lx, ly + ((lines.length - 1) / 2 + 1) * 10.5 + 2);
        ctx.font = font(700, 9.5);
      }
    }, initial);
  }

  /* ==========================================================================
     4. BULLET CHART CRENAS — 10 pays, 3 métriques au choix
     cfg : { rows: [{name,value,value2,ok}], ind: {label,target,unit,min,max,decimals} }
     ========================================================================== */
  function bullets(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      var ind = cfg.ind || {};
      if (!rows.length) return;
      var P = { l: 74, r: 42, t: 16, b: 22 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var rh = ph / rows.length;
      var min = ind.min || 0, max = ind.max || 100;
      var X = function (v) { return P.l + ((clamp(v, min, max) - min) / (max - min || 1)) * pw; };

      /* axe */
      ctx.font = font(600, 9);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(min, max, 5).forEach(function (v) {
        ctx.fillStyle = C.muted;
        ctx.fillText(nf(v, 0) + (ind.unit || ""), X(v), P.t + ph + 5);
        ctx.strokeStyle = "rgba(28,171,226,.12)";
        ctx.beginPath();
        ctx.moveTo(X(v), P.t);
        ctx.lineTo(X(v), P.t + ph);
        ctx.stroke();
      });

      rows.forEach(function (row, i) {
        var grow = stagger(i, rows.length, p, 0.05);
        var y = P.t + i * rh + rh * 0.24;
        var bh = Math.max(8, rh * 0.5);
        ctx.fillStyle = "#E4EFF7";
        roundRect(ctx, P.l, y, pw, bh, 4);
        ctx.fill();
        var valW = (X(row.value) - P.l) * grow;
        ctx.fillStyle = row.ok ? C.green : C.danger;
        roundRect(ctx, P.l, y + bh * 0.2, Math.max(0, valW), bh * 0.6, 3);
        ctx.fill();

        /* seuil Sphère */
        var tx = X(ind.target);
        ctx.strokeStyle = "#0B2338";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, y - 3);
        ctx.lineTo(tx, y + bh + 3);
        ctx.stroke();

        /* valeur 2023 : point blanc cerclé */
        if (row.prev != null && ind.prevKey) {
          var px = X(row.prev);
          ctx.beginPath();
          ctx.arc(px, y + bh / 2, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.strokeStyle = C.ink;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        ctx.font = font(700, 10.5);
        ctx.fillStyle = C.ink;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(row.name, P.l - 8, y + bh / 2);

        ctx.font = font(850, 10.5);
        ctx.textAlign = "left";
        ctx.fillStyle = row.ok ? "#4D7C0F" : "#B3123A";
        ctx.fillText(fmt(row.value, ind.decimals) + (ind.unit || ""), P.l + pw + 6, y + bh / 2);

        canvas.__hits.push({
          key: "b" + i,
          x: P.l, y: y - 4, w: pw, h: bh + 8,
          html: tipHTML(esc(row.name) + " · " + esc(ind.label), [
            { k: "Valeur", v: fmt(row.value, ind.decimals) + (ind.unit || ""), dot: row.ok ? C.green : C.danger },
            row.prev != null ? { k: "Valeur 2023", v: fmt(row.prev, ind.decimals) + (ind.unit || "") } : null,
            { k: "Seuil Sphère", v: (ind.better === "low" ? "< " : "> ") + ind.target + (ind.unit || "") },
          ].filter(Boolean), row.ok ? "✓ Conforme au seuil Sphère" : "⚠ Sous le seuil Sphère — plan de rattrapage requis"),
        });
      });

      /* légende du seuil, en haut à gauche */
      ctx.font = font(700, 9);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.strokeStyle = "#0B2338";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(P.l, 4);
      ctx.lineTo(P.l, 12);
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.fillText("Seuil Sphère", P.l + 6, 4);
    }, initial);
  }

  /* ==========================================================================
     5. AIRES EMPILÉES — CAMPAGNES DE SUPPLÉMENTATION (2017 → 2024)
     cfg : { years, series, objective }
     ========================================================================== */
  function stackedArea(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var years = cfg.years || [];
      var series = cfg.series || [];
      var objective = cfg.objective || 80;
      if (!years.length) return;
      var P = { l: 40, r: 34, t: 14, b: 26 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var X = function (i) { return P.l + (i / (years.length - 1)) * pw; };
      var Y = function (v) { return P.t + ph - (clamp(v, 0, 100) / 100) * ph; };

      gridY(ctx, w, P, ph, 0, 100, [0, 20, 40, 60, 80, 100], function (v) { return v + " %"; });

      /* chaque campagne est une colonne : libellé une année sur deux */
      years.forEach(function (yr, i) {
        if (i % 2) return;
        ctx.fillStyle = "rgba(28,171,226,.045)";
        ctx.fillRect(X(i), P.t, i === years.length - 1 ? X(1) - X(0) : X(i + 1) - X(i), ph);
      });
      ctx.font = font(600, 9);
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      years.forEach(function (yr, i) {
        if (i % 2) return;
        ctx.fillText(String(yr), X(i) + (X(1) - X(0)) / 2, P.t + ph + 7);
      });


      /* objectif 80 % */
      ctx.beginPath();
      ctx.moveTo(P.l, Y(objective));
      ctx.lineTo(w - P.r, Y(objective));
      dash(ctx, 6, 4);
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      noDash(ctx);
      ctx.font = font(750, 9.5);
      ctx.fillStyle = C.danger;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("Objectif " + objective + " %", w - P.r, Y(objective) - 3);

      /* aires superposées translucides (échelle 0-100 %) */
      var order = series.slice().sort(function (a, b) { return b.data[b.data.length - 1] - a.data[a.data.length - 1]; });
      order.forEach(function (s, si) {
        var prog = stagger(si, series.length, p, 0.14);
        if (prog <= 0) return;
        var pts = s.data.map(function (v, i) { return { x: X(i), y: Y(v) }; });
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l, P.t, pw * prog, ph + 4);
        ctx.clip();
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.lineTo(pts[pts.length - 1].x, P.t + ph);
        ctx.lineTo(pts[0].x, P.t + ph);
        ctx.closePath();
        var g = ctx.createLinearGradient(0, P.t, 0, P.t + ph);
        g.addColorStop(0, rgba(s.color, 0.7));
        g.addColorStop(1, rgba(s.color, 0.3));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
      });

      /* étiquettes de la dernière campagne, empilées en légende si besoin */
      var last = years.length - 1;
      var ordered = series.slice().sort(function (a, b) { return b.data[last] - a.data[last]; });
      ctx.font = font(700, 9.5);
      var labY = 3;
      ordered.forEach(function (s) {
        var v = s.data[last];
        ctx.beginPath();
        ctx.arc(X(last), Y(v), 3.2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = s.color;
        ctx.fillText(s.name + " " + v + " %", P.l + 34, labY);
        labY += 11;
      });

      /* survol : campagne complète */
      years.forEach(function (yr, i) {
        canvas.__hits.push({
          key: "y" + i, x: X(i) - pw / (years.length * 2), y: P.t, w: pw / years.length, h: ph,
          html: tipHTML("Campagne " + yr, series.map(function (s) {
            return { k: s.name, v: s.data[i] + " %", dot: s.color };
          }), "Objectif régional : " + objective + " %"),
        });
      });
    }, initial);
  }

  /* ==========================================================================
     6. HEATMAP  PAYS × INDICATEURS ANJE  (12 pays, triable par colonne)
     cfg : { rows: [{code,name,flag,values[],score}], sort: {col,dir} }
     ========================================================================== */
  function heatColor(ratio) {
    if (ratio > 0.9) return "#DCFCE7";
    if (ratio >= 0.7) return "#FEF9C3";
    if (ratio >= 0.5) return "#FED7AA";
    return "#FECACA";
  }
  function heatInk(ratio) {
    if (ratio > 0.9) return "#166534";
    if (ratio >= 0.7) return "#854D0E";
    if (ratio >= 0.5) return "#9A3412";
    return "#991B1B";
  }
  function attain(value, ind) {
    if (ind.inverse) return (100 - value) / Math.max(1, 100 - ind.target);
    return value / Math.max(1, ind.target);
  }
  function heatmap(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      var cols = cfg.cols || D.ANJE;
      if (!rows.length || !cols.length) return;
      var SCW = 62;
      var P = { l: 96, r: SCW + 12, t: 42, b: 8 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var cw = pw / cols.length, chh = ph / rows.length;
      var i, j;

      /* en-têtes de colonnes, abrégés sur deux lignes (pas de rotation :
         les libellés restent lisibles quel que soit le moteur de rendu) */
      ctx.font = font(700, 8.8);
      cols.forEach(function (col, k) {
        var x = P.l + k * cw + cw / 2;
        var words = col.short.split(" ");
        var l1 = words[0];
        var l2 = words.length > 1 ? words.slice(1).join(" ") : "";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = cfg.sort && cfg.sort.col === k ? C.cyan : C.ink;
        ctx.font = font(700, 8.8);
        ctx.fillText(l1, x, P.t - 20);
        ctx.fillStyle = C.muted;
        ctx.font = font(600, 8.2);
        if (l2) ctx.fillText(l2, x, P.t - 10);
        canvas.__hits.push({
          key: "h" + k, x: P.l + k * cw, y: P.t - 30, w: cw, h: 26,
          html: tipHTML(esc(col.label), [
            { k: "Cible OMS / UNICEF", v: col.target + " %" },
            { k: "Sens", v: col.inverse ? "Valeur basse favorable" : "Valeur haute favorable" },
          ], "Cliquer pour trier les pays"),
        });
      });

      /* colonne de score */
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = font(700, 8.8);
      ctx.fillStyle = C.ink;
      ctx.fillText("Score ANJE", P.l + pw + 6, P.t - 20);
      canvas.__hits.push({
        key: "hscore", x: P.l + pw + 6, y: P.t - 30, w: SCW, h: 26,
        html: tipHTML("Score composite ANJE", [
          { k: "Échelle", v: "0 → 100" },
          { k: "Calcul", v: "8 indicateurs pondérés" },
        ], "Cliquer pour trier par score"),
      });

      rows.forEach(function (row, ri) {
        var grow = stagger(ri, rows.length, p, 0.05);
        var y = P.t + ri * chh;
        var bh = chh - 3;
        /* nom du pays */
        ctx.font = font(750, 10);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = C.ink;
        ctx.fillText(row.flag + " " + (row.short || row.name), P.l - 8, y + chh / 2);

        cols.forEach(function (col, k) {
          var v = row.values[k];
          var ratio = attain(v, col);
          var x = P.l + k * cw;
          ctx.globalAlpha = grow;
          ctx.fillStyle = heatColor(ratio);
          roundRect(ctx, x + 1.5, y + 1.5, cw - 3, bh, 5);
          ctx.fill();
          if (chh > 14) {
            ctx.font = font(700, Math.min(11, Math.max(8, cw * 0.26)));
            ctx.fillStyle = heatInk(ratio);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(v + "%", x + cw / 2, y + chh / 2);
          }
          ctx.globalAlpha = 1;
          canvas.__hits.push({
            key: "c" + ri + "_" + k,
            x: x + 1, y: y + 1, w: cw - 2, h: bh,
            html: tipHTML(esc(row.name) + " · " + esc(col.label),
              [{ k: "Valeur", v: v + " %", dot: heatColor(ratio) },
               { k: "Objectif OMS / UNICEF", v: col.target + " %" },
               { k: "Performance / objectif", v: Math.round(ratio * 100) + " %" }],
              "GAP : " + (v - col.target > 0 ? "+" : "−") + Math.abs(v - col.target) +
              " pts · STATUT : " + (ratio > 0.9 ? "Conforme" : ratio >= 0.7 ? "En progression" : ratio >= 0.5 ? "Insuffisant" : "Critique")),
          });
        });

        /* score composite, dégradé */
        var sx = P.l + pw + 6;
        var t = clamp(row.score / 100, 0, 1);
        var col2 = lerpColor(C.danger, C.green, t);
        ctx.globalAlpha = grow;
        ctx.fillStyle = rgba(col2, 0.9);
        roundRect(ctx, sx, y + 1.5, SCW, bh, 5);
        ctx.fill();
        ctx.font = font(850, 11);
        ctx.fillStyle = textOn(col2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(row.score, sx + SCW / 2, y + chh / 2);
        ctx.globalAlpha = 1;
      });
    }, initial);
  }

  /* ==========================================================================
     7. NUAGE DE POINTS WASH × RETARD DE CROISSANCE (4 quadrants + régression)
     cfg : { points: [{name,water,stunting,zone}], xCut, yCut }
     ========================================================================== */
  function scatter(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var points = cfg.points || [];
      if (!points.length) return;
      var P = { l: 48, r: 20, t: 18, b: 40 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var xMin = 30, xMax = 90, yMin = 8, yMax = 50;
      var xCut = cfg.xCut || 65, yCut = cfg.yCut || 30;
      var X = function (v) { return P.l + ((v - xMin) / (xMax - xMin)) * pw; };
      var Y = function (v) { return P.t + ph - ((v - yMin) / (yMax - yMin)) * ph; };

      /* quadrants */
      var quads = [
        { x0: xMin, x1: xCut, y0: yMin, y1: yCut, fill: "rgba(242,106,33,.10)", label: "Accès à l'eau à renforcer", ink: "#9A3412", ax: "left", ay: "bottom" },
        { x0: xCut, x1: xMax, y0: yMin, y1: yCut, fill: "rgba(128,189,65,.12)", label: "Situation favorable", ink: "#4D7C0F", ax: "right", ay: "bottom" },
        { x0: xMin, x1: xCut, y0: yCut, y1: yMax, fill: "rgba(229,36,59,.10)", label: "Double fardeau", ink: "#B3123A", ax: "left", ay: "top" },
        { x0: xCut, x1: xMax, y0: yCut, y1: yMax, fill: "rgba(28,171,226,.10)", label: "Retard persistant", ink: "#0E7490", ax: "right", ay: "top" },
      ];
      quads.forEach(function (q) {
        var x = X(q.x0), y = Y(q.y1);
        ctx.fillStyle = q.fill;
        ctx.fillRect(x, y, X(q.x1) - x, Y(q.y0) - y);
        ctx.font = font(750, 9.5);
        ctx.fillStyle = rgba(q.ink, 0.85);
        ctx.textAlign = q.ax === "left" ? "left" : "right";
        ctx.textBaseline = q.ay === "top" ? "top" : "bottom";
        ctx.fillText(q.label, q.ax === "left" ? x + 8 : X(q.x1) - 8, q.ay === "top" ? y + 7 : Y(q.y0) - 7);
      });

      gridY(ctx, w, P, ph, yMin, yMax, niceTicks(yMin, yMax, 5), function (v) { return v + " %"; });
      ctx.font = font(600, 9.5);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(xMin, xMax, 6).forEach(function (v) {
        ctx.fillStyle = C.muted;
        ctx.fillText(v + " %", X(v), P.t + ph + 6);
      });
      ctx.strokeStyle = rgba(C.cyan, 0.4);
      ctx.beginPath();
      ctx.moveTo(P.l, P.t + ph);
      ctx.lineTo(w - P.r, P.t + ph);
      ctx.stroke();
      ctx.font = font(700, 9.5);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "center";
      ctx.fillText("Accès des ménages à l'eau potable (%)", P.l + pw / 2, P.t + ph + 20);
      ctx.save();
      ctx.translate(12, P.t + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("Retard de croissance (%)", 0, 0);
      ctx.restore();
      ctx.textAlign = "center";
      ctx.fillStyle = "#0E7490";
      ctx.font = font(700, 9);
      ctx.fillText("Coupe WASH " + xCut + " %", X(xCut), P.t + ph + 17);

      /* régression linéaire */
      var n = points.length, sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
      points.forEach(function (pt) { sx += pt.water; sy += pt.stunting; sxy += pt.water * pt.stunting; sxx += pt.water * pt.water; syy += pt.stunting * pt.stunting; });
      var Sxx = sxx - sx * sx / n, Sxy = sxy - sx * sy / n, Syy = syy - sy * sy / n;
      var slope = Sxy / (Sxx || 1), intercept = sy / n - slope * sx / n;
      var r2 = (Sxy * Sxy) / ((Sxx || 1) * (Syy || 1));
      var reg = stagger(points.length, points.length + 1, p, 0.05);
      if (reg > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l, P.t, pw * reg, ph + 2);
        ctx.clip();
        ctx.beginPath();
        ctx.moveTo(X(xMin), Y(clamp(slope * xMin + intercept, yMin, yMax)));
        ctx.lineTo(X(xMax), Y(clamp(slope * xMax + intercept, yMin, yMax)));
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        dash(ctx, 6, 4);
        ctx.stroke();
        noDash(ctx);
        ctx.restore();
      }
      ctx.font = font(800, 10);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("Régression linéaire · R² = " + nf(r2, 2), w - P.r, P.t + ph - 2);

      /* repère vertical de la coupe WASH */
      ctx.beginPath();
      ctx.moveTo(X(xCut), P.t);
      ctx.lineTo(X(xCut), P.t + ph);
      ctx.strokeStyle = rgba("#0E7490", 0.5);
      ctx.lineWidth = 1;
      dash(ctx, 4, 4);
      ctx.stroke();
      noDash(ctx);

      /* points + étiquettes : placement glouton (4 candidats par étiquette) */
      var placed = [];
      ctx.font = font(700, 9);
      var order = points.map(function (pt, i) { return i; });
      order.sort(function (a, b) { return points[a].water - points[b].water; });
      order.forEach(function (idx) {
        var pt = points[idx];
        var x = X(pt.water), y = Y(pt.stunting);
        var wLab = ctx.measureText(pt.name).width;
        var cands = [
          { dx: 8, dy: 0, align: "left" },
          { dx: 8, dy: -10, align: "left" },
          { dx: 8, dy: 10, align: "left" },
          { dx: -8, dy: 0, align: "right" },
          { dx: -8, dy: -10, align: "right" },
          { dx: 0, dy: -14, align: "center" },
          { dx: 0, dy: 14, align: "center" },
        ];
        var chosen = cands[0];
        for (var ci = 0; ci < cands.length; ci++) {
          var cd = cands[ci];
          var cx0 = cd.align === "left" ? x + cd.dx : cd.align === "right" ? x + cd.dx - wLab : x + cd.dx - wLab / 2;
          var cy0 = y + cd.dy - 5;
          var box = { x: cx0 - 1, y: cy0, w: wLab + 2, h: 10 };
          var inPlot = box.x > P.l - 4 && box.x + box.w < w - P.r + 4 && box.y > P.t + 2 && box.y + box.h < P.t + ph - 2;
          if (!inPlot) continue;
          var free = placed.every(function (o) { return !(box.x < o.x + o.w && o.x < box.x + box.w && box.y < o.y + o.h && o.y < box.y + box.h); });
          if (free) { chosen = cd; break; }
        }
        placed.push({
          x: (chosen.align === "left" ? x + chosen.dx : chosen.align === "right" ? x + chosen.dx - wLab : x + chosen.dx - wLab / 2) - 1,
          y: y + chosen.dy - 5, w: wLab + 2, h: 10,
        });
        pt.__label = { x: x, y: y, dx: chosen.dx, dy: chosen.dy, align: chosen.align };
      });

      points.forEach(function (pt, i) {
        var grow = stagger(i, points.length, p, 0.06);
        if (grow <= 0) return;
        var x = X(pt.water), y = Y(pt.stunting);
        var col = pt.zone === "sahel" ? C.orange : C.cyan;
        var r = (4.6 + (pt.pop || 0) * 0.5) * grow;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, 0.85);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        var lb = pt.__label;
        if (grow > 0.75 && lb) {
          ctx.globalAlpha = clamp((grow - 0.75) / 0.25, 0, 1);
          ctx.font = font(700, 9);
          ctx.fillStyle = C.ink;
          ctx.textAlign = lb.align;
          ctx.textBaseline = "middle";
          ctx.fillText(pt.name, x + lb.dx, y + lb.dy);
          ctx.globalAlpha = 1;
        }
        canvas.__hits.push({
          key: "s" + i, x: x - 10, y: y - 10, w: 20, h: 20,
          html: tipHTML(esc(pt.name), [
            { k: "Eau potable", v: pt.water + " %", dot: col },
            { k: "Retard de croissance", v: pt.stunting + " %" },
            { k: "Sous-région", v: pt.zone === "sahel" ? "Sahel" : "Côtier" },
          ], "Coupe WASH : " + xCut + " % · coupe stunting : " + yCut + " %"),
        });
      });
    }, initial);
  }

  /* ==========================================================================
     8. TIMELINE DES 1000 JOURS  (jalons + interventions + impact cumulé)
     cfg : { data: D.TIMELINE }
     ========================================================================== */
  function iconHeart(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.28);
    ctx.bezierCurveTo(x, y - s * 0.05, x - s * 0.5, y + s * 0.02, x - s * 0.5, y + s * 0.28);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.62, x, y + s * 0.82, x, y + s * 0.95);
    ctx.bezierCurveTo(x, y + s * 0.82, x + s * 0.5, y + s * 0.62, x + s * 0.5, y + s * 0.28);
    ctx.bezierCurveTo(x + s * 0.5, y + s * 0.02, x, y - s * 0.05, x, y + s * 0.28);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function iconBaby(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.arc(x, y + s * 0.32, s * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y + s * 0.3, s * 0.6, Math.PI * 0.85, Math.PI * 1.15);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.6, s * 0.14);
    ctx.stroke();
  }
  function iconMilk(ctx, x, y, s, color) {
    ctx.beginPath();
    roundRect(ctx, x - s * 0.26, y + s * 0.12, s * 0.52, s * 0.78, s * 0.16);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x - s * 0.2, y + s * 0.42, s * 0.4, s * 0.2);
  }
  function iconSpoon(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.28, s * 0.26, s * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.6);
    ctx.lineTo(x, y + s * 1.05);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.8, s * 0.16);
    ctx.stroke();
  }
  function iconChild(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.arc(x, y + s * 0.24, s * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.5);
    ctx.lineTo(x, y + s * 1.0);
    ctx.moveTo(x - s * 0.32, y + s * 0.66);
    ctx.lineTo(x + s * 0.32, y + s * 0.66);
    ctx.moveTo(x, y + s * 1.0);
    ctx.lineTo(x - s * 0.26, y + s * 1.28);
    ctx.moveTo(x, y + s * 1.0);
    ctx.lineTo(x + s * 0.26, y + s * 1.28);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.6, s * 0.14);
    ctx.stroke();
  }
  var ICONS = { heart: iconHeart, baby: iconBaby, milk: iconMilk, spoon: iconSpoon, child: iconChild };

  function timeline(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var T = cfg.data || D.TIMELINE;
      /* hauteurs calculées : titre, interventions, barre, libellés, impact */
      var P = { l: 30, r: 30 };
      var pw = w - P.l - P.r;
      var yTitle = 8, yChip = 12;
      var yIv = 44;          /* bandeau des interventions */
      var barY = yIv + 40;
      var barH = 26;
      var yMil = barY + barH + 8;
      var impactTop = yMil + 42;
      var impactH = Math.max(40, h - impactTop - 12);
      var X = function (d) { return P.l + (clamp(d, 0, T.days) / T.days) * pw; };

      /* fond doré : fenêtre critique des 1000 jours */
      var g0 = ctx.createLinearGradient(P.l, 0, P.l + pw, 0);
      g0.addColorStop(0, rgba(C.gold, 0.20));
      g0.addColorStop(1, rgba(C.gold, 0.05));
      ctx.fillStyle = g0;
      roundRect(ctx, P.l, yTitle, pw, h - yTitle - 6, 14);
      ctx.fill();
      ctx.strokeStyle = rgba(C.gold, 0.45);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = font(700, 10);
      ctx.fillStyle = "#8A6417";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Fenêtre critique des 1000 jours", P.l + 10, yTitle + 6);

      /* chiffre clé flottant, en haut à droite */
      var chipTxt = T.impact.final;
      ctx.font = font(800, 10.5);
      var chipW = Math.min(pw * 0.66, ctx.measureText(chipTxt).width + 22);
      roundRect(ctx, P.l + pw - chipW - 8, yChip, chipW, 22, 11);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = rgba(C.cyan, 0.55);
      ctx.stroke();
      ctx.fillStyle = C.cyan;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(chipTxt, P.l + pw - chipW / 2 - 8, yChip + 11);

      var prog = stagger(0, 1, p, 0.1);

      /* barre principale : gradient cyan → vert, déploiement gauche → droite */
      var gb = ctx.createLinearGradient(P.l, 0, P.l + pw, 0);
      gb.addColorStop(0, C.cyan);
      gb.addColorStop(0.55, C.cyan2);
      gb.addColorStop(1, C.green);
      roundRect(ctx, P.l, barY, Math.max(2, pw * prog), barH, 13);
      ctx.fillStyle = gb;
      ctx.fill();

      /* fenêtres d'intervention posées SOUS la barre (jamais par-dessus) */
      T.interventions.forEach(function (iv, k) {
        var grow = stagger(k, T.interventions.length, p, 0.07);
        if (grow <= 0) return;
        ctx.globalAlpha = clamp(grow, 0, 1);
        if (iv.from != null) {
          var x0 = X(iv.from), x1 = X(iv.to);
          var bw2 = Math.max(8, (x1 - x0) * grow);
          roundRect(ctx, x0, yIv + 6, bw2, 13, 6);
          ctx.fillStyle = rgba(iv.color, 0.9);
          ctx.fill();
          /* libellé sur la barre du bandeau si la place le permet, sinon à droite */
          ctx.font = font(700, 8.6);
          ctx.fillStyle = C.ink;
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          var txt = iv.label;
          var inside = ctx.measureText(txt).width + 12 <= bw2;
          if (inside) {
            ctx.fillStyle = "#FFFFFF";
            ctx.textBaseline = "middle";
            ctx.fillText(txt, x0 + 6, yIv + 12.5);
          } else {
            ctx.fillText(txt, x0, yIv + 4);
          }
        } else {
          var x = X(iv.day);
          var r = 6 * grow;
          ctx.beginPath();
          ctx.arc(x, yIv + 12, r, 0, Math.PI * 2);
          ctx.fillStyle = iv.color;
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.font = font(700, 8.4);
          ctx.fillStyle = C.ink;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(iv.label, x, yIv + 2);
        }
        var xa = iv.from != null ? X(iv.from) : X(iv.day);
        var wa = iv.from != null ? Math.max(10, X(iv.to) - X(iv.from)) : 20;
        canvas.__hits.push({
          key: "iv" + k, x: xa, y: yIv - 8, w: wa, h: 34,
          html: tipHTML(esc(iv.label), [
            { k: "Fenêtre", v: iv.from != null ? "J" + iv.from + " → J" + iv.to : "J" + iv.day },
            { k: "Cible", v: iv.from != null ? "Femmes enceintes / enfants 0-24 mois" : "Dose ponctuelle du paquet 1000 jours" },
          ], "Période déterminante pour la croissance et le développement"),
        });
        ctx.globalAlpha = 1;
      });

      /* jalons sur la barre */
      T.milestones.forEach(function (ms, k) {
        var grow = stagger(k, T.milestones.length, p, 0.09);
        if (grow <= 0) return;
        var x = X(ms.day);
        ctx.beginPath();
        ctx.arc(x, barY + barH / 2, 13 * grow, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.strokeStyle = C.cyan;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.globalAlpha = clamp((grow - 0.5) / 0.5, 0, 1);
        (ICONS[ms.icon] || iconChild)(ctx, x, barY + barH / 2 - 7, 15, C.cyan);
        ctx.globalAlpha = 1;
        ctx.textAlign = ms.day === 0 ? "left" : ms.day === T.days ? "right" : "center";
        ctx.textBaseline = "top";
        ctx.font = font(700, 10);
        ctx.fillStyle = C.ink;
        ctx.fillText(ms.label, ms.day === 0 ? x - 14 : ms.day === T.days ? x + 14 : x, yMil);
        ctx.font = font(600, 8.6);
        ctx.fillStyle = C.muted;
        ctx.fillText(ms.sub, ms.day === 0 ? x - 14 : ms.day === T.days ? x + 14 : x, yMil + 12);
        canvas.__hits.push({
          key: "t" + k, x: x - 14, y: barY, w: 28, h: barH,
          html: tipHTML(esc(ms.label) + " · " + esc(ms.sub), [
            { k: "Jour", v: nf(ms.day, 0) + " / " + nf(T.days, 0) },
            { k: "Fenêtre", v: "1000 premiers jours" },
          ], "Période déterminante pour la croissance et le développement"),
        });
      });

      /* impact cumulé : aire + courbe, sous les jalons */
      var imp = T.impact;
      var maxRed = Math.max.apply(null, imp.reduction) || 1;
      var IY = function (v) { return impactTop + impactH - (v / (maxRed * 1.2)) * impactH; };
      ctx.font = font(700, 9.5);
      ctx.fillStyle = C.muted;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(imp.label + " (réduction du retard de croissance)", P.l + 2, impactTop - 4);
      var ipts = imp.days.map(function (d, i2) { return { x: X(d), y: IY(imp.reduction[i2]) }; });
      var iprog = stagger(0, 1, p, 0.1);
      ctx.save();
      ctx.beginPath();
      ctx.rect(P.l, impactTop - 6, pw * iprog, impactH + 10);
      ctx.clip();
      ctx.beginPath();
      smooth(ctx, ipts);
      ctx.lineTo(ipts[ipts.length - 1].x, impactTop + impactH);
      ctx.lineTo(ipts[0].x, impactTop + impactH);
      ctx.closePath();
      var gi = ctx.createLinearGradient(0, impactTop, 0, impactTop + impactH);
      gi.addColorStop(0, rgba(C.green, 0.5));
      gi.addColorStop(1, rgba(C.cyan, 0.06));
      ctx.fillStyle = gi;
      ctx.fill();
      ctx.beginPath();
      smooth(ctx, ipts);
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(P.l, impactTop + impactH);
      ctx.lineTo(P.l + pw, impactTop + impactH);
      ctx.strokeStyle = rgba(C.cyan, 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
      var lastP = ipts[ipts.length - 1];
      ctx.beginPath();
      ctx.arc(lastP.x - 6, lastP.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = C.green;
      ctx.fill();
      ctx.font = font(800, 10.5);
      ctx.fillStyle = "#4D7C0F";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("−" + imp.reduction[imp.reduction.length - 1] + " %", lastP.x - 12, lastP.y);
      canvas.__hits.push({
        key: "impact", x: P.l, y: impactTop - 8, w: pw, h: impactH + 8,
        html: tipHTML("Impact cumulé des interventions", imp.days.map(function (d, i3) {
          return { k: "J" + d, v: "−" + imp.reduction[i3] + " % de retard de croissance" };
        }), "Paquet complet : ANJE + supplémentation + WASH + soins"),
      });
    }, initial);
  }

  /* ==========================================================================
     9. BULLES MAS — carte schématique d'Afrique de l'Ouest
     cfg : { points: D.BUBBLES }
     ========================================================================== */
  function bubbles(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var points = cfg.points || [];
      if (!points.length) return;
      var P = { l: 16, r: 16, t: 24, b: 54 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;

      /* fond : trame de points façon carte */
      ctx.fillStyle = rgba(C.cyan, 0.045);
      roundRect(ctx, P.l, P.t, pw, ph, 14);
      ctx.fill();
      ctx.fillStyle = rgba(C.cyan, 0.16);
      for (var gx = P.l + 12; gx < P.l + pw - 6; gx += 22) {
        for (var gy = P.t + 12; gy < P.t + ph - 6; gy += 22) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      var maxAbs = 0;
      points.forEach(function (pt) { if (pt.abs > maxAbs) maxAbs = pt.abs; });
      function colorOf(mas) { return mas >= 10 ? C.danger : mas >= 5 ? C.orange : C.green; }
      function radiusOf(abs, grow) {
        return (7 + Math.sqrt(abs / maxAbs) * 30) * grow;
      }

      var prog = stagger(0, 1, p, 0.08);
      var drawn = [];
      points.forEach(function (pt, i) {
        var grow = stagger(i, points.length, p, 0.07);
        if (grow <= 0) return;
        var x = P.l + (pt.map[0] / 100) * pw;
        var y = P.t + (pt.map[1] / 100) * ph;
        var r = radiusOf(pt.abs, grow);
        var col = colorOf(pt.mas);
        /* halo */
        ctx.beginPath();
        ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, 0.07 * prog);
        ctx.fill();
        /* bulle */
        var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r);
        g.addColorStop(0, lerpColor(col, "#FFFFFF", 0.35));
        g.addColorStop(1, rgba(col, 0.95));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        /* étiquettes tracées en dernier (voir plus bas) : on mémorise la bulle */
        drawn.push({ pt: pt, x: x, y: y, r: r, col: col });
        canvas.__hits.push({
          key: "bb" + i, x: x - r, y: y - r, w: r * 2, h: r * 2,
          html: tipHTML(esc(pt.name), [
            { k: "Prévalence MAS", v: nf(pt.mas, 1) + " %", dot: col },
            { k: "Enfants MAS", v: compact(pt.abs * 1000) },
            { k: "Statut", v: pt.mas >= 10 ? "Urgence (> 10 %)" : pt.mas >= 5 ? "Alerte (5-10 %)" : "Sous contrôle (< 5 %)" },
          ], "UNICEF / SMART — estimation régionale"),
        });
      });

      /* étiquettes des bulles : placement glouton, halo blanc pour la lisibilité */
      var labelBoxes = [];
      ctx.font = font(700, 9.4);
      drawn.forEach(function (d) {
        var txt = d.pt.name + " · " + nf(d.pt.mas, 1) + " %";
        var wLab = ctx.measureText(txt).width;
        var cands = d.r >= 24
          ? [{ dx: 0, dy: 0, align: "center", inBubble: true }]
          : [
              { dx: d.r + 6, dy: 0, align: "left" },
              { dx: d.r + 6, dy: -11, align: "left" },
              { dx: d.r + 6, dy: 11, align: "left" },
              { dx: 0, dy: -d.r - 8, align: "center" },
              { dx: 0, dy: d.r + 8, align: "center" },
              { dx: -d.r - 6, dy: 0, align: "right" },
            ];
        var chosen = null;
        for (var ci = 0; ci < cands.length; ci++) {
          var cd = cands[ci];
          if (cd.inBubble) { chosen = cd; break; }
          var x0 = cd.align === "left" ? d.x + cd.dx : cd.align === "right" ? d.x + cd.dx - wLab : d.x + cd.dx - wLab / 2;
          var y0 = d.y + cd.dy - 5;
          var box = { x: x0 - 2, y: y0, w: wLab + 4, h: 10 };
          var inside = box.x > P.l + 2 && box.x + box.w < P.l + pw - 2 && box.y > P.t + 2 && box.y + box.h < P.t + ph - 2;
          if (!inside) continue;
          /* ne pas écraser une bulle ni une étiquette déjà posée */
          var clear = true;
          for (var bi = 0; bi < drawn.length && clear; bi++) {
            var o = drawn[bi];
            if (o === d) continue;
            var cx2 = clamp(o.x, box.x, box.x + box.w);
            var cy2 = clamp(o.y, box.y, box.y + box.h);
            if (Math.sqrt(Math.pow(cx2 - o.x, 2) + Math.pow(cy2 - o.y, 2)) < o.r * 1.12 + 4) clear = false;
          }
          for (var li = 0; li < labelBoxes.length && clear; li++) {
            var lb = labelBoxes[li];
            if (box.x < lb.x + lb.w && lb.x < box.x + box.w && box.y < lb.y + lb.h && lb.y < box.y + box.h) clear = false;
          }
          if (clear) { chosen = cd; break; }
        }
        if (!chosen) {
          /* repli : au-dessus de la bulle, bord gauche ramené dans le cadre */
          var fb = clamp(d.x - wLab / 2, P.l + 4, P.l + pw - wLab - 4);
          chosen = { dx: 0, dy: -d.r - 8, align: "left", forced: true, fx: fb };
        }
        if (chosen.inBubble) {
          d.inBubble = true;
        } else {
          var lx0 = chosen.forced
            ? chosen.fx   /* fx = bord gauche, cohérent avec align: "left" */
            : chosen.align === "left" ? d.x + chosen.dx : chosen.align === "right" ? d.x + chosen.dx - wLab : d.x + chosen.dx - wLab / 2;
          labelBoxes.push({ x: lx0 - 2, y: d.y + chosen.dy - 5, w: wLab + 4, h: 10 });
          d.label = { x: lx0, y: d.y + chosen.dy, align: chosen.align, txt: txt };
        }
      });
      drawn.forEach(function (d) {
        if (d.inBubble) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = font(800, 10.5);
          ctx.fillStyle = textOn(d.col);
          ctx.fillText(d.pt.name, d.x, d.y - 7);
          ctx.font = font(700, 9.4);
          ctx.fillText(nf(d.pt.mas, 1) + " %", d.x, d.y + 6);
          ctx.font = font(600, 8.4);
          ctx.fillText(compact(d.pt.abs * 1000), d.x, d.y + 17);
        } else if (d.label) {
          ctx.textAlign = d.label.align;
          ctx.textBaseline = "middle";
          ctx.font = font(700, 9.4);
          ctx.lineWidth = 3;
          ctx.strokeStyle = "rgba(255,255,255,.9)";
          ctx.strokeText(d.label.txt, d.label.x, d.label.y);
          ctx.fillStyle = C.ink;
          ctx.fillText(d.label.txt, d.label.x, d.label.y);
        }
      });

      /* légende : taille */
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = font(750, 9);
      ctx.fillStyle = C.ink;
      ctx.fillText("Nombre d'enfants MAS", P.l + 4, h - 44);
      var sizes = [maxAbs, maxAbs / 2, maxAbs / 8];
      var lx = P.l + 6;
      sizes.forEach(function (s, i) {
        var r = radiusOf(s, 1) * 0.5;
        ctx.beginPath();
        ctx.arc(lx + r, h - 22, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(C.cyan, 0.35);
        ctx.fill();
        ctx.strokeStyle = rgba(C.cyan, 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = C.muted;
        ctx.font = font(600, 8.6);
        ctx.textAlign = "center";
        ctx.fillText(compact(s * 1000), lx + r, h - 22);
        lx += r * 2 + 30;
        ctx.textAlign = "left";
      });
      /* légende : couleur */
      var cxL = P.l + pw - 150;
      ctx.font = font(750, 9);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "left";
      ctx.fillText("Prévalence MAS", cxL, h - 44);
      [[C.green, "< 5 %"], [C.orange, "5-10 %"], [C.danger, "> 10 %"]].forEach(function (it, i) {
        var x = cxL + i * 52;
        ctx.beginPath();
        ctx.arc(x + 5, h - 22, 5, 0, Math.PI * 2);
        ctx.fillStyle = it[0];
        ctx.fill();
        ctx.fillStyle = C.muted;
        ctx.font = font(600, 8.6);
        ctx.fillText(it[1], x + 14, h - 22);
      });
    }, initial);
  }

  /* ==========================================================================
     10. MULTI-LIGNES + AIRES — ÉVOLUTION DE LA MAS (2016 → 2024)
     cfg : { years, series, urgency, alert }
     ========================================================================== */
  function multiLine(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var years = cfg.years || [];
      var series = (cfg.series || []).filter(function (s) { return s.visible !== false; });
      if (!years.length) return;
      var P = { l: 42, r: 74, t: 16, b: 30 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var yMin = 0, yMax = 20;
      var X = function (i) { return P.l + (i / (years.length - 1)) * pw; };
      var Y = function (v) { return P.t + ph - ((clamp(v, yMin, yMax) - yMin) / (yMax - yMin)) * ph; };

      /* zones urgence / alerte */
      ctx.fillStyle = "rgba(229,36,59,.09)";
      ctx.fillRect(P.l, Y(yMax), pw, Y(cfg.urgency || 10) - Y(yMax));
      ctx.fillStyle = "rgba(242,106,33,.09)";
      ctx.fillRect(P.l, Y(cfg.urgency || 10), pw, Y(cfg.alert || 5) - Y(cfg.urgency || 10));
      /* libellés de zone, dans la bande haute du graphique (au-dessus des courbes) */
      ctx.font = font(700, 8.8);
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";
      ctx.fillStyle = "#B3123A";
      ctx.fillText("Zone d'urgence OMS (> " + (cfg.urgency || 10) + " %)", P.l + pw - 6, Y(yMax) + 9);
      ctx.fillStyle = "#9A3412";
      ctx.textAlign = "left";
      ctx.fillText("Zone d'alerte (5-10 %)", P.l + 6, Y(cfg.alert || 5) + 9);
      ctx.textAlign = "left";

      gridY(ctx, w, P, ph, yMin, yMax, niceTicks(yMin, yMax, 5), function (v) { return v + " %"; });
      ctx.font = font(600, 9.5);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = C.muted;
      years.forEach(function (yr, i) {
        ctx.fillText(String(yr), X(i), P.t + ph + 6);
      });

      var hoverIdx = -1;
      if (canvas.__hover && /^x\d+$/.test(canvas.__hover)) hoverIdx = parseInt(canvas.__hover.slice(1), 10);
      var prevLabelY = null;

      series.forEach(function (s, si) {
        var grow = stagger(si, series.length, p, 0.12);
        if (grow <= 0) return;
        var pts = s.data.map(function (v, i) { return { x: X(i), y: Y(v) }; });
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l, P.t, pw * grow, ph + 2);
        ctx.clip();
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.lineTo(pts[pts.length - 1].x, P.t + ph);
        ctx.lineTo(pts[0].x, P.t + ph);
        ctx.closePath();
        var g = ctx.createLinearGradient(0, P.t, 0, P.t + ph);
        g.addColorStop(0, rgba(s.color, 0.24));
        g.addColorStop(1, rgba(s.color, 0.02));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
        ctx.font = font(700, 9.6);
        ctx.fillStyle = s.color;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = clamp((grow - 0.7) / 0.3, 0, 1);
        var labY = Math.max(P.t + 6, Y(s.data[s.data.length - 1]));
        if (prevLabelY != null && labY - prevLabelY < 13) labY = prevLabelY + 13;
        prevLabelY = labY;
        ctx.fillText(s.name + " " + nf(s.data[s.data.length - 1], 1), w - P.r + 6, labY);
        ctx.globalAlpha = 1;
      });

      /* curseur vertical + points survolés */
      if (hoverIdx >= 0) {
        ctx.beginPath();
        ctx.moveTo(X(hoverIdx), P.t);
        ctx.lineTo(X(hoverIdx), P.t + ph);
        ctx.strokeStyle = rgba(C.ink, 0.45);
        ctx.lineWidth = 1.2;
        dash(ctx, 4, 3);
        ctx.stroke();
        noDash(ctx);
        series.forEach(function (s) {
          ctx.beginPath();
          ctx.arc(X(hoverIdx), Y(s.data[hoverIdx]), 4.4, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        });
      }
      years.forEach(function (yr, i) {
        canvas.__hits.push({
          key: "x" + i, x: X(i) - pw / (years.length * 2), y: P.t, w: pw / years.length, h: ph,
          html: tipHTML("Évolution MAS · " + yr, series.map(function (s) {
            return { k: s.name, v: nf(s.data[i], 1) + " %", dot: s.color };
          }), "Seuil d'urgence OMS : " + (cfg.urgency || 10) + " %"),
        });
      });
    }, initial);
  }

  /* ==========================================================================
     11. DONUT DOUBLE ANNEAU — CAUSES DE LA MALNUTRITION
     cfg : { inner: [...], outer: [...], center }
     ========================================================================== */
  function donut(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var inner = cfg.inner || [], outer = cfg.outer || [];
      if (!inner.length && !outer.length) return;
      var cx = w / 2, cy = h / 2 - 4;
      var R = Math.min(w, h) * 0.42;
      var rot = (1 - ease(p)) * -0.9;
      var sweep = clamp(p * 1.15, 0, 1);
      var totalI = inner.reduce(function (a, s) { return a + s.value; }, 0) || 1;
      var totalO = outer.reduce(function (a, s) { return a + s.value; }, 0) || 1;
      var a0 = -Math.PI / 2 + rot;

      function ring(items, total, rIn, rOut, hitKey) {
        var acc = 0;
        ctx.save();
        items.forEach(function (s) {
          var span = (s.value / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, rOut, a0 + acc, a0 + acc + span * sweep);
          ctx.arc(cx, cy, rIn, a0 + acc + span * sweep, a0 + acc, true);
          ctx.closePath();
          ctx.fillStyle = s.color;
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();
          if (canvas.__hover === hitKey + s.name) {
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          canvas.__hits.push({
            key: hitKey + s.name,
            x: cx - rOut, y: cy - rOut, w: rOut * 2, h: rOut * 2,
            html: tipHTML(esc(s.name), [
              { k: "Part", v: s.value + " %", dot: s.color },
              { k: "Anneau", v: hitKey === "o" ? "Causes directes" : "Causes sous-jacentes" },
            ], hitKey === "o" ? "Modèle UNICEF des causes de la malnutrition" : "Déterminants structurels"),
          });
          acc += span;
        });
        ctx.restore();
      }
      ring(inner, totalI, R * 0.60, R * 0.82, "i");
      ring(outer, totalO, R * 0.88, R, "o");

      /* centre */
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var lines = String(cfg.center || "").split("\n");
      ctx.font = font(800, 11.5);
      ctx.fillStyle = C.ink;
      lines.forEach(function (ln, i) {
        ctx.fillText(ln, cx, cy + (i - (lines.length - 1) / 2) * 14 - 4);
      });
      ctx.font = font(600, 7.8);
      ctx.fillStyle = C.muted;
      ctx.fillText("Cadre UNICEF", cx, cy + ((lines.length - 1) / 2) * 14 + 8);
    }, initial);
  }

  /* ==========================================================================
     12. BARRES GROUPÉES HORIZONTALES — ANJE, 5 PAYS
     cfg : { rows: [{label,target,values[]}], countries: [{short,name,color}] }
     ========================================================================== */
  function groupedBar(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      var countries = cfg.countries || [];
      if (!rows.length || !countries.length) return;
      var P = { l: 104, r: 34, t: 10, b: 24 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var rh = ph / rows.length;
      var bw = Math.max(5, Math.min(14, (rh * 0.56) / countries.length));
      var X = function (v) { return P.l + (clamp(v, 0, 100) / 100) * pw; };

      /* axe */
      ctx.font = font(600, 9);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(0, 100, 5).forEach(function (v) {
        ctx.fillStyle = C.muted;
        ctx.fillText(v + " %", X(v), P.t + ph + 5);
      });

      rows.forEach(function (row, ri) {
        var band = ri * rh + P.t;
        if (ri % 2) {
          ctx.fillStyle = "rgba(28,171,226,.045)";
          ctx.fillRect(P.l, band, pw, rh);
        }
        ctx.font = font(750, 10);
        ctx.fillStyle = C.ink;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        var lines = wrap(ctx, row.short, P.l - 12, 2);
        lines.forEach(function (ln, k) {
          ctx.fillText(ln, P.l - 10, band + rh / 2 + (k - (lines.length - 1) / 2) * 11);
        });

        var totalH = bw * countries.length + 3 * (countries.length - 1);
        var y0 = band + rh / 2 - totalH / 2;
        countries.forEach(function (ct, ci) {
          var grow = stagger(ri * countries.length + ci, rows.length * countries.length, p, 0.022);
          var v = row.values[ci];
          var y = y0 + ci * (bw + 3);
          ctx.fillStyle = rgba(ct.color, 0.92);
          roundRect(ctx, P.l, y, Math.max(0.5, (X(v) - P.l) * grow), bw, 3);
          ctx.fill();
          if (grow > 0.85 && bw >= 9) {
            ctx.font = font(800, 8.6);
            ctx.fillStyle = "#FFFFFF";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(v + "%", P.l + (X(v) - P.l) * grow - 3, y + bw / 2);
          }
          canvas.__hits.push({
            key: "g" + ri + "_" + ci,
            x: P.l, y: y - 1, w: Math.max(4, X(v) - P.l), h: bw + 2,
            html: tipHTML(esc(ct.name) + " · " + esc(row.label), [
              { k: "Valeur", v: v + " %", dot: ct.color },
              { k: "Objectif OMS", v: row.target + " %" },
              { k: "Écart", v: (v - row.target > 0 ? "+" : "−") + Math.abs(v - row.target) + " pts" },
            ], "Indicateur ANJE (alimentation du nourrisson et du jeune enfant)"),
          });
        });

        /* objectif OMS de l'indicateur */
        ctx.beginPath();
        ctx.moveTo(X(row.target), band + 3);
        ctx.lineTo(X(row.target), band + rh - 3);
        ctx.strokeStyle = C.danger;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.font = font(750, 8.4);
        ctx.fillStyle = C.danger;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("cible " + row.target + "%", X(row.target) + 4, band + 3);
      });
    }, initial);
  }

  /* ==========================================================================
     13. ROSE POLAIRE — SAISONNALITÉ DES ADMISSIONS CRENAS
     cfg : { months, years: [{year,color,data,ring,alpha}], soudure:[a,b] }
     ========================================================================== */
  function polar(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var months = cfg.months || [];
      var years = cfg.years || [];
      if (!months.length) return;
      var cx = w / 2, cy = h / 2 - 4;
      var R = Math.min(w * 0.32, h * 0.34);
      var maxV = 200;
      var m = months.length;
      var step = (Math.PI * 2) / m;
      var rot = -Math.PI / 2 + (1 - ease(p)) * -0.5;
      function ang(i) { return rot + i * step - step / 2; }
      function rr(v) { return (clamp(v, 0, maxV) / maxV) * R; }

      /* secteurs de soudure */
      var s0 = cfg.soudure ? cfg.soudure[0] : 5, s1 = cfg.soudure ? cfg.soudure[1] : 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R * 1.06, ang(s0), ang(s1 + 1));
      ctx.closePath();
      ctx.fillStyle = "rgba(229,36,59,.10)";
      ctx.fill();

      /* anneaux de référence */
      [50, 100, 150, 200].forEach(function (v) {
        ctx.beginPath();
        ctx.arc(cx, cy, rr(v), 0, Math.PI * 2);
        ctx.strokeStyle = v === 100 ? rgba(C.cyan, 0.45) : rgba(C.cyan, 0.18);
        ctx.lineWidth = v === 100 ? 1.4 : 1;
        if (v === 100) dash(ctx, 4, 3);
        ctx.stroke();
        noDash(ctx);
      });
      ctx.font = font(600, 8.6);
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("base 100", cx, cy - rr(100) + 7);

      /* mois */
      ctx.font = font(700, 9.2);
      months.forEach(function (mn, i) {
        var a = ang(i) + step / 2;
        ctx.fillStyle = i >= s0 && i <= s1 ? "#B3123A" : C.ink;
        ctx.textAlign = Math.cos(a) > 0.3 ? "left" : Math.cos(a) < -0.3 ? "right" : "center";
        ctx.textBaseline = Math.sin(a) > 0.3 ? "top" : Math.sin(a) < -0.3 ? "bottom" : "middle";
        ctx.fillText(mn, cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12));
      });

      /* séries : 2024 en pétales pleins, 2022/2023 en anneaux */
      years.forEach(function (yr, yi) {
        var grow = stagger(yi, years.length, p, 0.14);
        if (grow <= 0) return;
        var isFill = !yr.ring;
        yr.data.forEach(function (v, i) {
          var a0 = ang(i), a1 = ang(i) + step * 0.9;
          var r = rr(v * grow);
          if (isFill) {
            var col = v >= 150 ? C.danger : v >= 120 ? C.orange : C.cyan;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, a0, a1);
            ctx.closePath();
            var g = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(6, r));
            g.addColorStop(0, rgba(col, 0.35));
            g.addColorStop(1, rgba(col, yr.alpha));
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = rgba(col, 0.95);
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(3, r), a0, a1);
            ctx.strokeStyle = rgba(yr.color, 0.95);
            ctx.lineWidth = 3.4;
            ctx.stroke();
          }
          canvas.__hits.push({
            key: "m" + yr.year + i,
            x: cx - R, y: cy - R, w: R * 2, h: R * 2,
            html: tipHTML(esc(months[i]) + " · " + yr.year, years.map(function (y) {
              return { k: y.year, v: nf(y.data[i], 0) + " (base 100)", dot: y.year === "2024" ? (y.data[i] >= 150 ? C.danger : y.data[i] >= 120 ? C.orange : C.cyan) : y.color };
            }), i >= s0 && i <= s1 ? "Pic de soudure : admissions CRENAS en forte hausse" : "Admissions CRENAS, base 100 = moyenne annuelle"),
          });
        });
      });

      /* légende : années + zone de soudure */
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(229,36,59,.22)";
      roundRect(ctx, 8, h - 17, 16, 12, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(229,36,59,.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = font(700, 9);
      ctx.fillStyle = "#B3123A";
      ctx.fillText("Soudure juin → sept.", 28, h - 11);
      var lx = w - 150;
      years.forEach(function (yr) {
        ctx.beginPath();
        if (yr.ring) {
          ctx.moveTo(lx, h - 11);
          ctx.lineTo(lx + 14, h - 11);
          ctx.strokeStyle = yr.color;
          ctx.lineWidth = 3.4;
          ctx.stroke();
        } else {
          ctx.arc(lx + 6, h - 11, 5, 0, Math.PI * 2);
          ctx.fillStyle = rgba(yr.color, 0.85);
          ctx.fill();
        }
        ctx.font = font(700, 9);
        ctx.fillStyle = C.muted;
        ctx.fillText(yr.year, lx + 18, h - 11);
        lx += 48;
      });
    }, initial);
  }

  /* ==========================================================================
     14. LOLLIPOP — COUVERTURE VITAMINE A, 2022 → 2024 (14 pays)
     cfg : { rows: [{short,name,from,to}], objective }
     ========================================================================== */
  function lollipop(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      var objective = cfg.objective || 80;
      if (!rows.length) return;
      var P = { l: 86, r: 46, t: 26, b: 22 };
      var pw = w - P.l - P.r, ph = h - P.t - P.b;
      var rh = ph / rows.length;
      var X = function (v) { return P.l + (clamp(v, 0, 100) / 100) * pw; };

      ctx.font = font(600, 9);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(0, 100, 5).forEach(function (v) {
        ctx.fillStyle = C.muted;
        ctx.fillText(v + " %", X(v), P.t + ph + 5);
        ctx.strokeStyle = "rgba(28,171,226,.12)";
        ctx.beginPath();
        ctx.moveTo(X(v), P.t);
        ctx.lineTo(X(v), P.t + ph);
        ctx.stroke();
      });

      /* objectif 80 % */
      ctx.beginPath();
      ctx.moveTo(X(objective), P.t - 6);
      ctx.lineTo(X(objective), P.t + ph);
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 1.8;
      dash(ctx, 5, 4);
      ctx.stroke();
      noDash(ctx);
      ctx.font = font(800, 9);
      ctx.fillStyle = C.danger;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("Objectif " + objective + " %", X(objective) + 5, P.t - 8);

      rows.forEach(function (row, i) {
        var grow = stagger(i, rows.length, p, 0.05);
        var y = P.t + i * rh + rh / 2;
        var ok = row.to >= objective;
        var col = ok ? C.green : C.cyan;
        ctx.font = font(700, 10);
        ctx.fillStyle = C.ink;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(row.flag + " " + (row.short || row.name), P.l - 8, y);
        /* tige 2022 (grise) puis tige 2024 (cyan/vert) */
        var xFrom = X(row.from), xTo = X(row.to);
        var xEnd = xFrom + (xTo - xFrom) * grow;
        ctx.beginPath();
        ctx.moveTo(xFrom, y);
        ctx.lineTo(Math.abs(xEnd - xFrom) < 1 ? xFrom : xEnd, y);
        ctx.strokeStyle = rgba(col, 0.85);
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(xTo, y, 5.4 * grow, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        /* repère 2022 */
        ctx.beginPath();
        ctx.arc(xFrom, y, 3.6 * grow, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.strokeStyle = "#94A3B8";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.font = font(850, 10);
        ctx.fillStyle = ok ? "#4D7C0F" : "#0E7490";
        ctx.textAlign = "left";
        ctx.fillText(row.to + "%", X(row.to) + 9, y);
        canvas.__hits.push({
          key: "l" + i, x: P.l, y: y - rh / 2, w: pw, h: rh,
          html: tipHTML(esc(row.name) + " · couverture vitamine A", [
            { k: "2022", v: row.from + " %", dot: "#94A3B8" },
            { k: "2024", v: row.to + " %", dot: col },
            { k: "Variation", v: (row.to - row.from > 0 ? "+" : "−") + Math.abs(row.to - row.from) + " pts" },
          ], ok ? "✓ Objectif de 80 % atteint" : "Sous l'objectif de 80 %"),
        });
      });
    }, initial);
  }

  /* ==========================================================================
     15. MINIS KPI + SPARKLINES DU SCORECARD
     ========================================================================== */
  function miniBars(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var rows = cfg.rows || [];
      if (!rows.length) return;
      var max = 0;
      rows.forEach(function (r) { if (r.value > max) max = r.value; });
      var gap = 3, bw = (w - gap * (rows.length - 1)) / rows.length;
      var dec = cfg.decimals == null ? 1 : cfg.decimals;
      var unit = cfg.unit || " %";
      var metric = cfg.metric || "Prévalence MAS";
      rows.forEach(function (r, i) {
        var grow = stagger(i, rows.length, p, 0.06);
        var bh = (r.value / (max || 1)) * (h - 3) * grow;
        var col = cfg.color || (i === 0 ? C.danger : r.value >= 10 ? C.orange : C.cyan);
        /* une seule couleur dominante : la dernière barre reste pleine */
        ctx.fillStyle = cfg.color ? (i === rows.length - 1 ? rgba(cfg.color, 0.95) : rgba(cfg.color, 0.45)) : rgba(col, 0.92);
        topRound(ctx, i * (bw + gap), h - bh, bw, bh, 2);
        ctx.fill();
        canvas.__hits.push({
          key: "mb" + i, x: i * (bw + gap), y: 0, w: bw, h: h,
          html: tipHTML(esc((r.flag ? r.flag + " " : "") + r.name), [
            { k: metric, v: nf(r.value, dec) + unit, dot: col },
            rows.length <= 8 ? { k: "Rang", v: "#" + (i + 1) + " / " + rows.length } : null,
          ].filter(Boolean), cfg.foot || "Enfants de moins de 5 ans"),
        });
      });
    }, initial);
  }
  function miniGauge(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var value = cfg.value || 0, max = cfg.max || 100;
      /* jauge compacte : arc 270° à gauche, lecture chiffrée à droite
         (le mini-canvas ne fait que ~42 px de haut) */
      var r = Math.max(8, Math.min(h / 2 - 3, 17));
      var cx = r + 7, cy = h / 2;
      var lw = Math.max(4, r * 0.42);
      var start = Math.PI * 0.75, end = Math.PI * 2.25;
      function seg(a0, a1, color) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a1);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      seg(start, end, "#E4EFF7");
      var col = value >= max * 0.8 ? C.green : value >= max * 0.5 ? C.orange : C.danger;
      seg(start, start + (end - start) * (clamp(value, 0, max) / max) * ease(p), col);
      /* repère de l'objectif */
      var ta = start + (end - start) * ((cfg.target || 0) / max);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ta) * (r - lw * 0.7), cy + Math.sin(ta) * (r - lw * 0.7));
      ctx.lineTo(cx + Math.cos(ta) * (r + lw * 0.7), cy + Math.sin(ta) * (r + lw * 0.7));
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      /* valeur + cible */
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = font(800, Math.min(15, h * 0.34));
      ctx.fillStyle = C.ink;
      ctx.fillText(value + " %", cx + r + 9, cy - h * 0.13);
      ctx.font = font(600, Math.max(8, Math.min(9.5, h * 0.2)));
      ctx.fillStyle = C.muted;
      ctx.fillText("objectif " + cfg.target + " %", cx + r + 9, cy + h * 0.22);
      canvas.__hits.push({
        key: "gauge", x: 0, y: 0, w: w, h: h,
        html: tipHTML("Allaitement exclusif 0-6 mois", [
          { k: "Région", v: value + " %", dot: col },
          { k: "Objectif OMS", v: cfg.target + " %" },
          { k: "Écart", v: "−" + (cfg.target - value) + " points" },
        ], "Gap à combler : " + Math.round((value / cfg.target) * 100) + " % de l'objectif atteint"),
      });
    }, initial);
  }

  function sparkline(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var data = cfg.data || [];
      if (data.length < 2) return;
      var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
      var pad = 3;
      var X = function (i) { return pad + (i / (data.length - 1)) * (w - pad * 2); };
      var Y = function (v) { return h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2); };
      var pts = data.map(function (v, i) { return { x: X(i), y: Y(v) }; });
      var col = cfg.color || C.green;
      var prog = ease(p);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w * prog, h);
      ctx.clip();
      ctx.beginPath();
      smooth(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, h);
      ctx.lineTo(pts[0].x, h);
      ctx.closePath();
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgba(col, 0.35));
      g.addColorStop(1, rgba(col, 0.02));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      smooth(ctx, pts);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
      var last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      if (cfg.hits) {
        canvas.__hits.push({
          key: "sp", x: 0, y: 0, w: w, h: h,
          html: tipHTML(esc(cfg.title || "Tendance"), cfg.labels ? cfg.labels.map(function (lb, i) {
            return { k: lb, v: nf(data[i], 1) + (cfg.unit || "") };
          }) : [{ k: "Première valeur", v: nf(data[0], 1) + (cfg.unit || "") }, { k: "Dernière valeur", v: nf(data[data.length - 1], 1) + (cfg.unit || "") }]),
        });
      }
    }, initial);
  }
  function miniBullet(canvas, initial) {
    return mount(canvas, function (c, p, cfg) {
      var ctx = c.ctx, w = c.w, h = c.h;
      var value = cfg.value || 0, max = 100;
      var bh = Math.min(10, h - 4);
      var y = (h - bh) / 2;
      ctx.fillStyle = "#E4EFF7";
      roundRect(ctx, 0, y, w, bh, bh / 2);
      ctx.fill();
      var ok = value >= (cfg.target || 60);
      var prog = ease(p);
      ctx.fillStyle = ok ? C.green : C.orange;
      roundRect(ctx, 0, y, Math.max(1, (value / max) * w * prog), bh, bh / 2);
      ctx.fill();
      var tx = (cfg.target / max) * w;
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tx, y - 2);
      ctx.lineTo(tx, y + bh + 2);
      ctx.stroke();
      ctx.font = font(800, 9);
      ctx.fillStyle = ok ? "#4D7C0F" : "#B45309";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(value + "%", w - 2, h / 2);
      canvas.__hits.push({
        key: "stk", x: 0, y: 0, w: w, h: h,
        html: tipHTML("Stock ATPE · " + esc(cfg.name || ""), [
          { k: "Couverture des stocks", v: value + " %", dot: ok ? C.green : C.orange },
          { k: "Seuil d'alerte", v: "≥ " + cfg.target + " %" },
          { k: "Évolution", v: (value - (cfg.prev || value) > 0 ? "+" : "−") + Math.abs(value - (cfg.prev || value)) + " pts" },
        ], ok ? "Stock suffisant pour la cohorte courante" : "Rupture partielle : réapprovisionnement ATPE à programmer"),
      });
    }, initial);
  }

  /* ------------------------------------------------------------------ export */
  root.UNICEFCharts = {
    growth: growth,
    funnel: funnel,
    radar: radar,
    bullets: bullets,
    stackedArea: stackedArea,
    heatmap: heatmap,
    scatter: scatter,
    timeline: timeline,
    bubbles: bubbles,
    multiLine: multiLine,
    donut: donut,
    groupedBar: groupedBar,
    polar: polar,
    lollipop: lollipop,
    miniBars: miniBars,
    miniGauge: miniGauge,
    sparkline: sparkline,
    miniBullet: miniBullet,
    /* utilitaires partagés avec unicef-dashboard.js */
    pick: function (canvas, ev) {
      var p = local(ev, canvas);
      canvas.__last = p;
      return hitAt(canvas, p.x, p.y);
    },
    attain: attain,
    heatColor: heatColor,
    repaintAll: repaintAll,
    hideTip: hideTip,
    nf: nf,
    fmt: fmt,
    esc: esc,
    compact: compact,
    tipHTML: tipHTML,
    rgba: rgba,
    C: C,
  };
})(typeof window !== "undefined" ? window : globalThis);
