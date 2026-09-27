/* ============================================================================
   NUTRI.N°1 — FAO · FOOD SYSTEMS INTELLIGENCE · AFRIQUE DE L'OUEST
   fao-charts.js — Moteur de graphiques 100 % Canvas API pure.
   Zéro framework, zéro Chart.js. Tooltip interactif, animation requestAnimationFrame,
   support High-DPI (Retina) et redimensionnement responsive.
   ============================================================================ */

(function (root) {
  "use strict";

  var DUR = 920;
  var TIP_EL = null;
  var REGISTRY = [];

  function dpr() {
    return Math.min(root.devicePixelRatio || 1, 2);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function font(weight, size) {
    return (weight ? weight + " " : "") + size + "px 'Segoe UI', system-ui, Arial, sans-serif";
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
    var rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h)));
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  function initTooltip() {
    if (TIP_EL) return TIP_EL;
    TIP_EL = document.createElement("div");
    TIP_EL.className = "fao-tooltip";
    TIP_EL.style.cssText = [
      "position: fixed",
      "pointer-events: none",
      "z-index: 9999",
      "padding: 9px 12px",
      "background: rgba(5, 46, 22, 0.96)",
      "color: #FFFFFF",
      "border: 1px solid #10B981",
      "border-radius: 8px",
      "box-shadow: 0 10px 25px rgba(5, 46, 22, 0.35)",
      "font: 600 12px/1.35 'Segoe UI', system-ui, sans-serif",
      "opacity: 0",
      "transition: opacity 0.15s ease, transform 0.15s ease",
      "max-width: 280px"
    ].join(";");
    document.body.appendChild(TIP_EL);
    return TIP_EL;
  }

  function showTooltip(html, x, y) {
    var tip = initTooltip();
    tip.innerHTML = html;
    tip.style.opacity = "1";
    var tw = tip.offsetWidth;
    var th = tip.offsetHeight;
    var left = x + 12;
    var top = y - th - 8;
    if (left + tw > window.innerWidth - 12) left = x - tw - 12;
    if (top < 10) top = y + 16;
    tip.style.transform = "translate(" + left + "px," + top + "px)";
  }

  function hideTooltip() {
    if (TIP_EL) TIP_EL.style.opacity = "0";
  }

  function setupCanvas(canvas) {
    var rect = canvas.getBoundingClientRect();
    var d = dpr();
    var w = rect.width || canvas.parentElement.clientWidth || 300;
    var h = rect.height || canvas.parentElement.clientHeight || 200;
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: ctx, w: w, h: h, d: d };
  }

  // ==========================================================================
  // 5 MINI KPI CANVASES
  // ==========================================================================

  function renderMiniKpi1(canvas, data) {
    if (!canvas) return;
    var s = setupCanvas(canvas);
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    var crops = data || [
      { name: "Maïs", val: 16.2, color: "#D97706" },
      { name: "Mil", val: 14.8, color: "#059669" },
      { name: "Riz", val: 10.4, color: "#0891B2" },
      { name: "Sorgho", val: 7.8, color: "#10B981" },
      { name: "Haricots", val: 2.4, color: "#7C3AED" },
      { name: "Fonio", val: 0.8, color: "#EAB308" }
    ];
    var maxVal = 18;
    var n = crops.length;
    var barW = (w - (n - 1) * 4) / n;
    crops.forEach(function (c, i) {
      var x = i * (barW + 4);
      var bh = (c.val / maxVal) * (h - 16);
      var y = h - bh;
      ctx.fillStyle = c.color;
      topRound(ctx, x, y, barW, bh, 3);
      ctx.fill();
      ctx.fillStyle = "#6B7280";
      ctx.font = font("700", 8.5);
      ctx.textAlign = "center";
      ctx.fillText(c.name.slice(0, 3), x + barW / 2, h - 2);
    });
  }

  function renderMiniKpi2(canvas, pct) {
    if (!canvas) return;
    var s = setupCanvas(canvas);
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h - 6;
    var r = Math.min(w / 2 - 8, h - 10);
    var p = (pct || 22) / 100;
    // Track arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#FEE2E2";
    ctx.lineCap = "round";
    ctx.stroke();
    // Fill arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * p);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#DC2626";
    ctx.lineCap = "round";
    ctx.stroke();
    // Needle
    var ang = Math.PI + Math.PI * p;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * (r - 2), cy + Math.sin(ang) * (r - 2));
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#991B1B";
    ctx.stroke();
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#DC2626";
    ctx.fill();
  }

  function renderMiniKpi3(canvas, score) {
    if (!canvas) return;
    var s = setupCanvas(canvas);
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h - 6;
    var r = Math.min(w / 2 - 8, h - 10);
    var sc = score || 4.2;
    var p = clamp(sc / 12, 0, 1);
    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#FEF3C7";
    ctx.lineCap = "round";
    ctx.stroke();
    // Fill
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * p);
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#D97706";
    ctx.lineCap = "round";
    ctx.stroke();
    // Target mark at 6 / 12 (50%)
    var targAng = Math.PI + Math.PI * 0.5;
    var tx = cx + Math.cos(targAng) * r;
    var ty = cy + Math.sin(targAng) * r;
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#059669";
    ctx.fill();
  }

  function renderMiniKpi4(canvas, items) {
    if (!canvas) return;
    var s = setupCanvas(canvas);
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    var list = items || [
      { name: "Sel", pct: 89, color: "#059669" },
      { name: "Farine", pct: 61, color: "#D97706" },
      { name: "Huile", pct: 45, color: "#DC2626" }
    ];
    var barH = 6;
    var gap = (h - list.length * barH) / (list.length + 1);
    list.forEach(function (it, i) {
      var y = gap + i * (barH + gap);
      // bg track
      ctx.fillStyle = "#E5E7EB";
      roundRect(ctx, 42, y, w - 46, barH, 3);
      ctx.fill();
      // fill
      ctx.fillStyle = it.color;
      var fw = (w - 46) * (it.pct / 100);
      roundRect(ctx, 42, y, fw, barH, 3);
      ctx.fill();
      // label
      ctx.fillStyle = "#4B5563";
      ctx.font = font("700", 8.5);
      ctx.textAlign = "left";
      ctx.fillText(it.name, 0, y + barH - 1);
    });
  }

  function renderMiniKpi5(canvas, slices) {
    if (!canvas) return;
    var s = setupCanvas(canvas);
    var ctx = s.ctx, w = s.w, h = s.h;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2;
    var r = Math.min(w, h) / 2 - 4;
    var inR = r * 0.58;
    var data = slices || [
      { val: 6200, color: "#059669" },
      { val: 4800, color: "#DC2626" },
      { val: 19000, color: "#94A3B8" }
    ];
    var total = data.reduce(function (sum, d) { return sum + d.val; }, 0);
    var start = -Math.PI / 2;
    data.forEach(function (d) {
      var angle = (d.val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.arc(cx, cy, inR, start + angle, start, true);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      start += angle;
    });
    // Center label
    ctx.fillStyle = "#052E16";
    ctx.font = font("800", 9);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("6.2k", cx, cy);
  }

  // ==========================================================================
  // GRAPHIQUE 1 : Production vs Besoins par Pays (Grouped Bar + Gap Chart)
  // [Card 60% largeur]
  // ==========================================================================
  function createChart1(canvas, data) {
    var raw = data || window.FAO_DATA.g1Data;
    var animStart = null;
    var hoverIdx = -1;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 45, pRight = 20, pTop = 35, pBottom = 45;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      // Axis max
      var maxVal = 24;
      var n = raw.length;
      var groupW = plotW / n;
      var barW = Math.max(8, Math.min(18, (groupW - 10) / 2));

      // Grid lines
      ctx.strokeStyle = "#E5E7EB";
      ctx.lineWidth = 1;
      [0, 6, 12, 18, 24].forEach(function (val) {
        var y = pTop + plotH - (val / maxVal) * plotH;
        ctx.beginPath();
        ctx.moveTo(pLeft, y);
        ctx.lineTo(w - pRight, y);
        ctx.stroke();

        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 9.5);
        ctx.textAlign = "right";
        ctx.fillText(val + "M", pLeft - 6, y + 3);
      });

      // 100% Autosuffisance reference indicator line (12 Mt indicative avg)
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pLeft, pTop + plotH * 0.45);
      ctx.lineTo(w - pRight, pTop + plotH * 0.45);
      ctx.stroke();
      ctx.restore();

      // Draw groups
      raw.forEach(function (d, i) {
        var gx = pLeft + i * groupW + groupW / 2;
        var isDeficit = d.deficit > 0;
        var isHovered = hoverIdx === i;

        // Animate heights
        var prodH = (d.prod / maxVal) * plotH * progress;
        var besoinH = (d.besoin / maxVal) * plotH * progress;

        var prodX = gx - barW - 2;
        var besoinX = gx + 2;

        var prodY = pTop + plotH - prodH;
        var besoinY = pTop + plotH - besoinH;

        // Prod bar: green if surplus, red if deficit
        ctx.fillStyle = isDeficit ? "#DC2626" : "#059669";
        if (isHovered) ctx.fillStyle = isDeficit ? "#EF4444" : "#10B981";
        topRound(ctx, prodX, prodY, barW, prodH, 4);
        ctx.fill();

        // Besoin bar (outline / grey bar)
        ctx.fillStyle = "rgba(156, 163, 175, 0.25)";
        ctx.strokeStyle = "#9CA3AF";
        ctx.lineWidth = 1.5;
        topRound(ctx, besoinX, besoinY, barW, besoinH, 4);
        ctx.fill();
        ctx.stroke();

        // Arrows: red under bar if deficit, green on top if surplus
        var arrX = gx;
        if (isDeficit) {
          // Red down arrow under the group
          var arrY = pTop + plotH + 4;
          ctx.fillStyle = "#DC2626";
          ctx.beginPath();
          ctx.moveTo(arrX, arrY + 8);
          ctx.lineTo(arrX - 4, arrY + 1);
          ctx.lineTo(arrX + 4, arrY + 1);
          ctx.closePath();
          ctx.fill();
        } else {
          // Green up arrow over the group
          var arrY = Math.min(prodY, besoinY) - 14;
          ctx.fillStyle = "#059669";
          ctx.beginPath();
          ctx.moveTo(arrX, arrY);
          ctx.lineTo(arrX - 4, arrY + 7);
          ctx.lineTo(arrX + 4, arrY + 7);
          ctx.closePath();
          ctx.fill();
        }

        // Autosuffisance % on top of group
        if (progress > 0.8) {
          ctx.fillStyle = isDeficit ? "#B91C1C" : "#047857";
          ctx.font = font("800", 9);
          ctx.textAlign = "center";
          var txtY = Math.min(prodY, besoinY) - 5;
          if (!isDeficit) txtY -= 12;
          ctx.fillText(Math.round(d.auto) + "%", gx, Math.max(pTop - 6, txtY));
        }

        // Country name below
        ctx.fillStyle = isHovered ? "#052E16" : "#4B5563";
        ctx.font = font(isHovered ? "800" : "600", 10);
        ctx.textAlign = "center";
        ctx.fillText(d.code || d.name.slice(0, 4), gx, pTop + plotH + 26);
      });

      // Axis labels
      ctx.fillStyle = "#052E16";
      ctx.font = font("700", 10.5);
      ctx.textAlign = "left";
      ctx.fillText("Production (Mt) vs Besoins", pLeft, pTop - 16);

      // Legend
      ctx.fillStyle = "#059669";
      ctx.fillRect(w - 170, pTop - 22, 10, 10);
      ctx.fillStyle = "#374151";
      ctx.font = font("600", 9.5);
      ctx.textAlign = "left";
      ctx.fillText("Production", w - 156, pTop - 14);

      ctx.strokeStyle = "#9CA3AF";
      ctx.strokeRect(w - 95, pTop - 22, 10, 10);
      ctx.fillText("Besoins", w - 81, pTop - 14);
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 45, pRight = 20, pTop = 35, pBottom = 45;
      var plotW = r.width - pLeft - pRight;
      var plotH = r.height - pTop - pBottom;

      if (mx < pLeft || mx > r.width - pRight || my < pTop - 15 || my > r.height - pBottom + 20) {
        if (hoverIdx !== -1) {
          hoverIdx = -1;
          draw(1);
          hideTooltip();
        }
        return;
      }

      var groupW = plotW / raw.length;
      var idx = Math.floor((mx - pLeft) / groupW);
      if (idx >= 0 && idx < raw.length) {
        if (hoverIdx !== idx) {
          hoverIdx = idx;
          draw(1);
          var d = raw[idx];
          var gapTxt = d.deficit > 0 ? "Déficit : -" + d.deficit + " Mt" : "Surplus : +" + d.surplus + " Mt";
          var gapColor = d.deficit > 0 ? "#DC2626" : "#059669";
          var html = "<b>" + d.name + " (" + d.code + ")</b><br>" +
            "🌾 Production : <b>" + d.prod + " Mt</b><br>" +
            "🍽️ Besoins : <b>" + d.besoin + " Mt</b><br>" +
            "<span style='color:" + gapColor + "'>● " + gapTxt + "</span><br>" +
            "🎯 Autosuffisance : <b>" + d.auto + "%</b>";
          showTooltip(html, e.clientX, e.clientY);
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverIdx = -1;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function (d) { if (d) raw = d; animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 2 : Heatmap Nutritive Aliments
  // [Card 40% largeur]
  // ==========================================================================
  function createChart2(canvas) {
    var nutrients = window.FAO_DATA.g2Nutrients;
    var foods = window.FAO_DATA.g2Foods.slice().sort(function (a, b) { return b.score - a.score; });
    var animStart = null;
    var hoverCell = null;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 110, pRight = 10, pTop = 40, pBottom = 15;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var rows = foods.length;
      var cols = nutrients.length;
      var cellW = plotW / cols;
      var cellH = plotH / rows;

      // Header column labels (nutrients)
      nutrients.forEach(function (nu, c) {
        var x = pLeft + c * cellW + cellW / 2;
        ctx.fillStyle = "#052E16";
        ctx.font = font("700", 9);
        ctx.textAlign = "center";
        ctx.fillText(nu.label, x, pTop - 12);
        ctx.fillStyle = "#6B7280";
        ctx.font = font("500", 7.5);
        ctx.fillText(nu.unit, x, pTop - 2);
      });

      // Draw rows
      foods.forEach(function (f, r) {
        var rowProgress = clamp((progress * (rows + 4) - r) / 4, 0, 1);
        if (rowProgress <= 0) return;

        var y = pTop + r * cellH;

        // Food label on Y axis
        ctx.fillStyle = f.super ? "#B45309" : "#1F2937";
        ctx.font = font(f.super ? "800" : "600", 9.5);
        ctx.textAlign = "right";
        var labelTxt = f.name;
        if (labelTxt.length > 15) labelTxt = labelTxt.slice(0, 14) + "…";
        ctx.fillText((f.super ? "⭐ " : "") + labelTxt, pLeft - 6, y + cellH / 2 + 3);

        nutrients.forEach(function (nu, c) {
          var x = pLeft + c * cellW;
          var val = f.vals[nu.key] || 0;
          var norm = clamp(val / nu.max, 0, 1);
          var isHover = hoverCell && hoverCell.r === r && hoverCell.c === c;

          // Color: white -> #059669
          var bgAlpha = norm * 0.85 + (isHover ? 0.15 : 0.05);
          ctx.fillStyle = "rgba(5, 150, 105, " + (bgAlpha * rowProgress) + ")";
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

          // Golden border for super foods
          if (f.super) {
            ctx.strokeStyle = "rgba(217, 119, 6, 0.55)";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
          }

          if (isHover) {
            ctx.strokeStyle = "#052E16";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellW, cellH);
          }

          // Value inside cell
          if (cellW > 28 && cellH > 11) {
            ctx.fillStyle = norm > 0.55 ? "#FFFFFF" : "#111827";
            ctx.font = font(isHover ? "800" : "600", Math.min(8.5, cellH * 0.65));
            ctx.textAlign = "center";
            var displayVal = val >= 100 ? Math.round(val) : (Math.round(val * 10) / 10);
            ctx.fillText(displayVal, x + cellW / 2, y + cellH / 2 + 3);
          }
        });
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 110, pRight = 10, pTop = 40, pBottom = 15;
      var plotW = r.width - pLeft - pRight;
      var plotH = r.height - pTop - pBottom;

      if (mx < pLeft || mx > r.width - pRight || my < pTop || my > r.height - pBottom) {
        if (hoverCell) {
          hoverCell = null;
          draw(1);
          hideTooltip();
        }
        return;
      }

      var c = Math.floor((mx - pLeft) / (plotW / nutrients.length));
      var row = Math.floor((my - pTop) / (plotH / foods.length));

      if (row >= 0 && row < foods.length && c >= 0 && c < nutrients.length) {
        if (!hoverCell || hoverCell.r !== row || hoverCell.c !== c) {
          hoverCell = { r: row, c: c };
          draw(1);
          var fd = foods[row];
          var nu = nutrients[c];
          var val = fd.vals[nu.key] || 0;
          var rdaPct = Math.round((val / nu.rda) * 100);
          var html = "<b>" + (fd.super ? "⭐ " : "") + fd.name + "</b><br>" +
            "Nutriment : <b>" + nu.label + "</b><br>" +
            "Teneur : <b>" + val + " " + nu.unit + " / 100g</b><br>" +
            "Apport recommandé : <b>" + rdaPct + "%</b> des besoins journaliers<br>" +
            (fd.super ? "<span style='color:#F59E0B'>⭐ Super-aliment local d'Afrique de l'Ouest</span>" : "");
          showTooltip(html, e.clientX, e.clientY);
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverCell = null;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 3 : Calendrier Agricole Gantt
  // [Card pleine largeur - 100%]
  // ==========================================================================
  function createChart3(canvas, countryCode) {
    var cCode = countryCode || "NER";
    var cData = window.FAO_DATA.g3Countries[cCode] || window.FAO_DATA.g3Countries["NER"];
    var months = window.FAO_DATA.g3Months;
    var activities = window.FAO_DATA.g3Activities;
    var animStart = null;
    var hoverSeg = null;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 140, pRight = 55, pTop = 35, pBottom = 45;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var numCrops = cData.crops.length;
      var totalRows = numCrops + 1; // + 1 for Malnutrition row
      var rowH = plotH / totalRows;

      // 1. Zone soudure alimentaire (Mai à Août : mois index 4 à 8)
      var soudureStart = pLeft + (4 / 12) * plotW;
      var soudureEnd = pLeft + (8 / 12) * plotW;
      ctx.fillStyle = "rgba(217, 119, 6, 0.12)";
      ctx.fillRect(soudureStart, pTop, soudureEnd - soudureStart, plotH);

      // Soudure label watermark on top
      ctx.fillStyle = "#D97706";
      ctx.font = font("800", 10.5);
      ctx.textAlign = "center";
      ctx.fillText("⚠️ PÉRIODE DE SOUDURE ALIMENTAIRE (MAI - AOÛT)", (soudureStart + soudureEnd) / 2, pTop - 12);

      // 2. Month columns & vertical grid
      months.forEach(function (m, i) {
        var x = pLeft + (i / 12) * plotW;
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, pTop);
        ctx.lineTo(x, pTop + plotH);
        ctx.stroke();

        ctx.fillStyle = (i >= 4 && i <= 7) ? "#D97706" : "#4B5563";
        ctx.font = font((i >= 4 && i <= 7) ? "800" : "600", 10);
        ctx.textAlign = "center";
        ctx.fillText(m, x + (plotW / 24), pTop + plotH + 18);
      });

      // 3. Gantt bars for crops
      cData.crops.forEach(function (crop, r) {
        var y = pTop + r * rowH;

        // Row background striping
        if (r % 2 === 1) {
          ctx.fillStyle = "rgba(240, 253, 244, 0.6)";
          ctx.fillRect(pLeft, y, plotW, rowH);
        }

        // Crop label
        ctx.fillStyle = "#052E16";
        ctx.font = font("700", 10);
        ctx.textAlign = "right";
        ctx.fillText(crop.name, pLeft - 10, y + rowH / 2 + 3);

        // Segments
        crop.segs.forEach(function (seg) {
          var act = activities[seg.a] || { color: "#BBF7D0", label: seg.a };
          var sx = pLeft + (seg.s / 12) * plotW;
          var ex = pLeft + (seg.e / 12) * plotW;
          var sw = ex - sx;

          // Reveal animation from left to right
          var visibleW = Math.max(0, Math.min(sw, (plotW * progress) - (seg.s / 12) * plotW));
          if (visibleW <= 0) return;

          var barPad = Math.max(2, rowH * 0.18);
          var bh = rowH - barPad * 2;
          var by = y + barPad;

          ctx.fillStyle = act.color;
          roundRect(ctx, sx, by, visibleW, bh, 4);
          ctx.fill();

          ctx.strokeStyle = "rgba(0,0,0,0.08)";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });

      // 4. Ligne "Malnutrition" row in Gantt
      var malY = pTop + numCrops * rowH;
      ctx.fillStyle = "#DC2626";
      ctx.font = font("800", 10);
      ctx.textAlign = "right";
      ctx.fillText("Index Malnutrition", pLeft - 10, malY + rowH / 2 + 3);

      // 5. Pluies (Rainfall curve - blue) on secondary Y-axis
      var maxRain = 300;
      ctx.beginPath();
      cData.rain.forEach(function (rn, i) {
        var x = pLeft + ((i + 0.5) / 12) * plotW;
        var y = pTop + plotH - (rn / maxRain) * (plotH * 0.85) * progress;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#0891B2";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 6. Malnutrition curve - red superposée
      ctx.beginPath();
      cData.malnutrition.forEach(function (ml, i) {
        var x = pLeft + ((i + 0.5) / 12) * plotW;
        var y = pTop + plotH - (ml / 100) * (plotH * 0.75) * progress;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#DC2626";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Dots on malnutrition peaks
      cData.malnutrition.forEach(function (ml, i) {
        var x = pLeft + ((i + 0.5) / 12) * plotW;
        var y = pTop + plotH - (ml / 100) * (plotH * 0.75) * progress;
        ctx.beginPath();
        ctx.arc(x, y, (i >= 5 && i <= 7) ? 5 : 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = (i >= 5 && i <= 7) ? "#DC2626" : "#FFFFFF";
        ctx.fill();
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Secondary axis legend on the right
      ctx.fillStyle = "#0891B2";
      ctx.font = font("700", 9);
      ctx.textAlign = "left";
      ctx.fillText("💧 Pluies (mm)", w - pRight + 6, pTop + 14);

      ctx.fillStyle = "#DC2626";
      ctx.fillText("📈 Malnutrition", w - pRight + 6, pTop + 30);
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 140, pRight = 55, pTop = 35, pBottom = 45;
      var plotW = r.width - pLeft - pRight;
      var plotH = r.height - pTop - pBottom;

      if (mx < pLeft || mx > r.width - pRight || my < pTop || my > r.height - pBottom) {
        hideTooltip();
        return;
      }

      var mIdx = Math.floor(((mx - pLeft) / plotW) * 12);
      mIdx = clamp(mIdx, 0, 11);
      var mName = months[mIdx];
      var rn = cData.rain[mIdx];
      var ml = cData.malnutrition[mIdx];

      var rowH = plotH / (cData.crops.length + 1);
      var cIdx = Math.floor((my - pTop) / rowH);

      var detail = "";
      if (cIdx < cData.crops.length) {
        var cr = cData.crops[cIdx];
        var monthVal = mIdx + 0.5;
        var curSeg = cr.segs.find(function (s) { return monthVal >= s.s && monthVal <= s.e; });
        if (curSeg) {
          var actInfo = activities[curSeg.a] || { label: curSeg.a };
          detail = "<br>🌱 <b>" + cr.name + "</b> : " + actInfo.label;
        } else {
          detail = "<br>🌱 <b>" + cr.name + "</b> : Hors cycle";
        }
      }

      var html = "<b>" + mName + " (" + cData.name + ")</b>" +
        detail + "<br>" +
        "💧 Pluviométrie : <b>" + rn + " mm</b><br>" +
        "🔴 Index malnutrition : <b>" + ml + " / 100</b>" +
        (mIdx >= 4 && mIdx <= 7 ? "<br><span style='color:#F59E0B'>⚠️ Période de soudure active</span>" : "");
      showTooltip(html, e.clientX, e.clientY);
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", hideTooltip);

    requestAnimationFrame(animate);

    return {
      setCountry: function (code) {
        cCode = code;
        cData = window.FAO_DATA.g3Countries[code] || window.FAO_DATA.g3Countries["NER"];
        animStart = null;
        requestAnimationFrame(animate);
      },
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 4 : Sankey Chaîne de Valeur (Alluvial avec particules animées)
  // [Card 55% largeur]
  // ==========================================================================
  function createChart4(canvas) {
    var sankey = window.FAO_DATA.g4Sankey;
    var animStart = null;
    var running = true;
    var hoverLink = null;
    var hoverNode = null;
    var particles = [];

    // Initialize 60 flowing particles
    for (var i = 0; i < 60; i++) {
      particles.push({
        linkIdx: Math.floor(Math.random() * sankey.links.length),
        t: Math.random(),
        speed: 0.003 + Math.random() * 0.004,
        size: 2.2 + Math.random() * 2.2
      });
    }

    function getNodePos(nodeId, colsMeta) {
      for (var c = 0; c < colsMeta.length; c++) {
        var col = colsMeta[c];
        for (var n = 0; n < col.nodes.length; n++) {
          if (col.nodes[n].id === nodeId) {
            return col.nodes[n];
          }
        }
      }
      return null;
    }

    function computeLayout(w, h) {
      var pLeft = 20, pRight = 20, pTop = 30, pBottom = 25;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var numCols = sankey.cols.length;
      var colSpacing = plotW / (numCols - 1);
      var nodeW = 16;

      var colsMeta = [];
      sankey.cols.forEach(function (col, c) {
        var cx = pLeft + c * colSpacing;
        if (c === numCols - 1) cx -= nodeW;
        else if (c > 0) cx -= nodeW / 2;

        var totalVal = col.nodes.reduce(function (sum, d) { return sum + d.val; }, 0);
        var gap = 12;
        var availH = plotH - (col.nodes.length - 1) * gap;

        var currY = pTop;
        var nodesMeta = col.nodes.map(function (n) {
          var nh = Math.max(16, (n.val / totalVal) * availH);
          var meta = {
            id: n.id,
            label: n.label,
            val: n.val,
            color: n.color,
            x: cx,
            y: currY,
            w: nodeW,
            h: nh,
            colIdx: c
          };
          currY += nh + gap;
          return meta;
        });

        colsMeta.push({ name: col.name, x: cx, nodes: nodesMeta });
      });

      return colsMeta;
    }

    function draw() {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var colsMeta = computeLayout(w, h);

      // Column headers
      colsMeta.forEach(function (col, i) {
        ctx.fillStyle = "#052E16";
        ctx.font = font("800", 9.5);
        ctx.textAlign = i === 0 ? "left" : (i === colsMeta.length - 1 ? "right" : "center");
        ctx.fillText(col.name, col.x + (i === 0 ? 0 : (i === colsMeta.length - 1 ? 16 : 8)), 16);
      });

      // Draw links
      sankey.links.forEach(function (l, idx) {
        var sn = getNodePos(l.source, colsMeta);
        var tn = getNodePos(l.target, colsMeta);
        if (!sn || !tn) return;

        var sx = sn.x + sn.w;
        var sy = sn.y + sn.h * 0.45;
        var tx = tn.x;
        var ty = tn.y + tn.h * 0.45;

        var linkThickness = Math.max(2.5, Math.min(22, l.val * 1.3));
        var cpx1 = sx + (tx - sx) * 0.45;
        var cpx2 = sx + (tx - sx) * 0.55;

        var isHover = hoverLink === idx;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(cpx1, sy, cpx2, ty, tx, ty);
        ctx.lineWidth = linkThickness;
        ctx.strokeStyle = isHover ? rgba(l.color, 0.75) : rgba(l.color, 0.28);
        ctx.stroke();

        l._curve = { sx: sx, sy: sy, cpx1: cpx1, cpx2: cpx2, tx: tx, ty: ty };
      });

      // Flowing particles along the links
      particles.forEach(function (p) {
        p.t += p.speed;
        if (p.t > 1) {
          p.t = 0;
          p.linkIdx = Math.floor(Math.random() * sankey.links.length);
        }
        var l = sankey.links[p.linkIdx];
        if (!l || !l._curve) return;
        var c = l._curve;

        // Cubic bezier point at p.t
        var t = p.t;
        var mt = 1 - t;
        var px = mt * mt * mt * c.sx + 3 * mt * mt * t * c.cpx1 + 3 * mt * t * t * c.cpx2 + t * t * t * c.tx;
        var py = mt * mt * mt * c.sy + 3 * mt * mt * t * c.sy + 3 * mt * t * t * c.ty + t * t * t * c.ty;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, 2 * Math.PI);
        ctx.fillStyle = l.color;
        ctx.fill();
      });

      // Draw nodes
      colsMeta.forEach(function (col) {
        col.nodes.forEach(function (node) {
          var isHover = hoverNode && hoverNode.id === node.id;
          ctx.fillStyle = node.color;
          roundRect(ctx, node.x, node.y, node.w, node.h, 4);
          ctx.fill();

          if (isHover) {
            ctx.strokeStyle = "#052E16";
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Node label
          ctx.fillStyle = "#1F2937";
          ctx.font = font("700", 9);
          if (node.colIdx === 0) {
            ctx.textAlign = "left";
            ctx.fillText(node.label + " (" + node.val + "Mt)", node.x + node.w + 6, node.y + node.h / 2 + 3);
          } else if (node.colIdx === colsMeta.length - 1) {
            ctx.textAlign = "right";
            ctx.fillText(node.label + " (" + node.val + "Mt)", node.x - 6, node.y + node.h / 2 + 3);
          } else {
            ctx.textAlign = "center";
            ctx.fillText(node.label, node.x + node.w / 2, node.y - 4);
          }
        });
      });
    }

    function loop() {
      if (!running) return;
      draw();
      requestAnimationFrame(loop);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var colsMeta = computeLayout(r.width, r.height);

      // Check node hover
      var foundNode = null;
      for (var c = 0; c < colsMeta.length; c++) {
        for (var n = 0; n < colsMeta[c].nodes.length; n++) {
          var nd = colsMeta[c].nodes[n];
          if (mx >= nd.x - 4 && mx <= nd.x + nd.w + 4 && my >= nd.y && my <= nd.y + nd.h) {
            foundNode = nd;
            break;
          }
        }
        if (foundNode) break;
      }

      if (foundNode) {
        hoverNode = foundNode;
        hoverLink = null;
        var html = "<b>Étape : " + foundNode.label + "</b><br>" +
          "Volume : <b>" + foundNode.val + " Mt</b><br>" +
          "Part dans le flux : <b>" + Math.round((foundNode.val / 52.4) * 100) + "%</b>";
        showTooltip(html, e.clientX, e.clientY);
        return;
      }

      hoverNode = null;
      // Check link hover
      var foundLink = null;
      for (var i = 0; i < sankey.links.length; i++) {
        var l = sankey.links[i];
        if (!l._curve) continue;
        var c = l._curve;
        if (mx >= c.sx && mx <= c.tx) {
          var t = (mx - c.sx) / (c.tx - c.sx);
          var expectedY = (1 - t) * c.sy + t * c.ty;
          if (Math.abs(my - expectedY) < 14) {
            foundLink = i;
            break;
          }
        }
      }

      if (foundLink !== null) {
        hoverLink = foundLink;
        var linkObj = sankey.links[foundLink];
        var html = "<b>Flux : " + linkObj.crop + "</b><br>" +
          "Volume transit : <b>" + linkObj.val + " Mt</b><br>" +
          "<span style='color:#DC2626'>Pertes estimées : " + linkObj.lossPct + "% à cette étape</span>";
        showTooltip(html, e.clientX, e.clientY);
      } else {
        hoverLink = null;
        hideTooltip();
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverLink = null;
      hoverNode = null;
      hideTooltip();
    });

    requestAnimationFrame(loop);

    return {
      update: function () {},
      repaint: function () { draw(); },
      destroy: function () {
        running = false;
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 5 : HDDS Dot Plot Pays (Jitter Dot Plot)
  // [Card 45% largeur]
  // ==========================================================================
  function createChart5(canvas) {
    var raw = window.FAO_DATA.g5Hdds;
    var animStart = null;
    var hoverIdx = -1;

    // Generate deterministic jitter dots
    var jitterCache = raw.map(function (d, i) {
      var pts = [];
      for (var j = 0; j < 24; j++) {
        var jx = (Math.random() - 0.5) * (d.std * 1.8);
        pts.push({
          score: clamp(d.score + jx, 1, 11.5),
          offsetY: (Math.random() - 0.5) * 8
        });
      }
      return pts;
    });

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 90, pRight = 25, pTop = 25, pBottom = 35;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var numRows = raw.length;
      var rowH = plotH / numRows;

      // X scale: 0 to 12
      function getX(score) {
        return pLeft + (score / 12) * plotW;
      }

      // 1. Vertical reference lines
      // Urgence 3 (rouge)
      var urgX = getX(3);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#DC2626";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(urgX, pTop);
      ctx.lineTo(urgX, pTop + plotH);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#DC2626";
      ctx.font = font("700", 8.5);
      ctx.textAlign = "center";
      ctx.fillText("Urgence (3)", urgX, pTop - 8);

      // Objectif 6 (vert)
      var objX = getX(6);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(objX, pTop);
      ctx.lineTo(objX, pTop + plotH);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#059669";
      ctx.font = font("700", 8.5);
      ctx.textAlign = "center";
      ctx.fillText("Objectif OMS (6)", objX, pTop - 8);

      // X Axis ticks (0, 2, 4, 6, 8, 10, 12)
      [0, 2, 4, 6, 8, 10, 12].forEach(function (tick) {
        var tx = getX(tick);
        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 9);
        ctx.textAlign = "center";
        ctx.fillText(tick, tx, pTop + plotH + 18);
      });

      // 2. Rows
      raw.forEach(function (d, r) {
        var cy = pTop + r * rowH + rowH / 2;
        var isHover = hoverIdx === r;

        // Baseline row track
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pLeft, cy);
        ctx.lineTo(pLeft + plotW, cy);
        ctx.stroke();

        // Country label
        ctx.fillStyle = isHover ? "#052E16" : "#374151";
        ctx.font = font(isHover ? "800" : "600", 9.5);
        ctx.textAlign = "right";
        ctx.fillText(d.name, pLeft - 8, cy + 3.5);

        // Color coding by score
        var col = "#DC2626";
        if (d.score >= 6) col = "#059669";
        else if (d.score >= 5) col = "#EAB308";
        else if (d.score >= 4) col = "#D97706";

        // Jitter dots (household samples)
        var jpts = jitterCache[r];
        jpts.forEach(function (pt) {
          var px = getX(pt.score * progress);
          ctx.beginPath();
          ctx.arc(px, cy + pt.offsetY, 2.2, 0, 2 * Math.PI);
          ctx.fillStyle = rgba(col, 0.28);
          ctx.fill();
        });

        // Grand point principal (country mean score)
        var mx = getX(d.score * progress);
        ctx.beginPath();
        ctx.arc(mx, cy, isHover ? 8 : 6, 0, 2 * Math.PI);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (isHover) {
          ctx.fillStyle = "#111827";
          ctx.font = font("800", 9.5);
          ctx.textAlign = "left";
          ctx.fillText(d.score.toFixed(1), mx + 10, cy + 3);
        }
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutBack(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 90, pRight = 25, pTop = 25, pBottom = 35;
      var plotH = r.height - pTop - pBottom;

      if (mx < pLeft - 20 || mx > r.width || my < pTop || my > r.height - pBottom) {
        if (hoverIdx !== -1) {
          hoverIdx = -1;
          draw(1);
          hideTooltip();
        }
        return;
      }

      var rowH = plotH / raw.length;
      var idx = Math.floor((my - pTop) / rowH);

      if (idx >= 0 && idx < raw.length) {
        if (hoverIdx !== idx) {
          hoverIdx = idx;
          draw(1);
          var d = raw[idx];
          var status = d.score >= 6 ? "Diversifié" : (d.score >= 4 ? "Moyen" : "Critique / Pauvre");
          var html = "<b>" + d.name + " (" + d.code + ")</b><br>" +
            "Score HDDS moyen : <b>" + d.score + " / 12</b><br>" +
            "Rang régional : <b>" + d.rank + " / 14</b><br>" +
            "Statut diversité : <b>" + status + "</b>";
          showTooltip(html, e.clientX, e.clientY);
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverIdx = -1;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 6 : Gauges Fortification (5 semi-gauges)
  // [Card 1/3 largeur]
  // ==========================================================================
  function createChart6(canvas) {
    var raw = window.FAO_DATA.g6Fortification;
    var animStart = null;
    var hoverIdx = -1;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var n = raw.length;
      // 5 semi-gauges arranged in 2 rows (3 top, 2 bottom)
      var colsTop = 3;
      var colsBot = 2;

      raw.forEach(function (d, i) {
        var isTop = i < colsTop;
        var cx, cy, availW;

        if (isTop) {
          availW = w / colsTop;
          cx = i * availW + availW / 2;
          cy = h * 0.35;
        } else {
          availW = w / colsBot;
          cx = (i - colsTop) * availW + availW / 2;
          cy = h * 0.78;
        }

        var r = Math.min(availW * 0.36, 44);
        var p = (d.pct / 100) * progress;
        var thick = 12;

        // Track background #E2E8F0
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
        ctx.lineWidth = thick;
        ctx.strokeStyle = "#E2E8F0";
        ctx.lineCap = "round";
        ctx.stroke();

        // Target mark at 80% (or d.target)
        var targAng = Math.PI + Math.PI * (d.target / 100);
        var tx1 = cx + Math.cos(targAng) * (r - thick / 2 - 2);
        var ty1 = cy + Math.sin(targAng) * (r - thick / 2 - 2);
        var tx2 = cx + Math.cos(targAng) * (r + thick / 2 + 2);
        var ty2 = cy + Math.sin(targAng) * (r + thick / 2 + 2);
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.strokeStyle = "#052E16";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Colored arc
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * p);
        ctx.lineWidth = thick;
        ctx.strokeStyle = d.color;
        ctx.lineCap = "round";
        ctx.stroke();

        // % at center (24px bold)
        ctx.fillStyle = d.color;
        ctx.font = font("850", Math.min(20, r * 0.52));
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(Math.round(d.pct * progress) + "%", cx, cy - 2);

        // Commodity label below
        ctx.fillStyle = "#1F2937";
        ctx.font = font("700", 9.5);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(d.name, cx, cy + 6);
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;

      var idx = -1;
      if (my < r.height * 0.55) {
        idx = Math.floor(mx / (r.width / 3));
      } else {
        idx = 3 + Math.floor(mx / (r.width / 2));
      }

      if (idx >= 0 && idx < raw.length) {
        if (hoverIdx !== idx) {
          hoverIdx = idx;
          var d = raw[idx];
          var html = "<b>" + d.name + "</b><br>" +
            "Couverture : <b>" + d.pct + "%</b><br>" +
            "Objectif : <b>" + d.target + "%</b><br>" +
            "GAP restant : <b>" + d.gap + " point(s)</b><br>" +
            "Statut : <b>" + d.status + "</b>";
          showTooltip(html, e.clientX, e.clientY);
        }
      } else {
        hoverIdx = -1;
        hideTooltip();
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverIdx = -1;
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 7 : Waterfall Pertes Post-Récolte (Cascade)
  // [Card 1/3 largeur]
  // ==========================================================================
  function createChart7(canvas) {
    var raw = window.FAO_DATA.g7Waterfall;
    var animStart = null;
    var hoverIdx = -1;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 35, pRight = 15, pTop = 30, pBottom = 55;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var n = raw.length;
      var colW = plotW / n;
      var barW = Math.max(12, colW * 0.65);

      // Y Scale: 0 to 110%
      function getY(pct) {
        return pTop + plotH - (pct / 110) * plotH;
      }

      // Grid
      [0, 25, 50, 75, 100].forEach(function (tick) {
        var ty = getY(tick);
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pLeft, ty);
        ctx.lineTo(w - pRight, ty);
        ctx.stroke();

        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 8.5);
        ctx.textAlign = "right";
        ctx.fillText(tick + "%", pLeft - 4, ty + 3);
      });

      var currentTop = 100;

      raw.forEach(function (d, i) {
        var stepProgress = clamp((progress * (n + 2) - i) / 2, 0, 1);
        if (stepProgress <= 0) return;

        var x = pLeft + i * colW + (colW - barW) / 2;
        var isHover = hoverIdx === i;

        var by, bh;
        if (d.type === "total" || d.type === "final") {
          by = getY(d.pct * stepProgress);
          bh = getY(0) - by;
        } else {
          // Floating loss bar
          var startPct = currentTop;
          var endPct = currentTop + d.delta;
          by = getY(startPct);
          bh = (getY(endPct) - getY(startPct)) * stepProgress;
        }

        ctx.fillStyle = d.color;
        if (isHover) ctx.fillStyle = d.type === "loss" ? "#EF4444" : "#10B981";
        roundRect(ctx, x, by, barW, Math.abs(bh), 3);
        ctx.fill();

        // Dotted connector to previous step
        if (i > 0 && d.type === "loss") {
          ctx.save();
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = "#9CA3AF";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - (colW - barW), by);
          ctx.lineTo(x, by);
          ctx.stroke();
          ctx.restore();
        }

        // Value on bar
        ctx.fillStyle = "#FFFFFF";
        ctx.font = font("700", 8.5);
        ctx.textAlign = "center";
        var txt = d.type === "loss" ? d.delta + "%" : d.pct + "%";
        if (Math.abs(bh) > 16) {
          ctx.fillText(txt, x + barW / 2, by + Math.abs(bh) / 2 + 3);
        }

        // Step label on X axis (rotated slightly)
        ctx.save();
        ctx.translate(x + barW / 2, pTop + plotH + 8);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = isHover ? "#052E16" : "#4B5563";
        ctx.font = font(isHover ? "800" : "600", 8.5);
        ctx.textAlign = "right";
        ctx.fillText(d.label, 0, 0);
        ctx.restore();

        if (d.type === "loss") {
          currentTop += d.delta;
        }
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var pLeft = 35, pRight = 15;
      var plotW = r.width - pLeft - pRight;
      var colW = plotW / raw.length;

      var idx = Math.floor((mx - pLeft) / colW);
      if (idx >= 0 && idx < raw.length) {
        if (hoverIdx !== idx) {
          hoverIdx = idx;
          draw(1);
          var d = raw[idx];
          var html = "<b>" + d.label + "</b><br>" +
            "Variation : <b>" + (d.delta > 0 ? "+" + d.delta : d.delta) + "%</b><br>" +
            "Volume équivalent : <b>" + d.vol + "</b>";
          showTooltip(html, e.clientX, e.clientY);
        }
      } else {
        hoverIdx = -1;
        draw(1);
        hideTooltip();
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverIdx = -1;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 8 : Scatter Diversité Cultures / HDDS
  // [Card 1/3 largeur]
  // ==========================================================================
  function createChart8(canvas) {
    var raw = window.FAO_DATA.g8Scatter;
    var animStart = null;
    var hoverPt = null;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 35, pRight = 20, pTop = 25, pBottom = 35;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var minX = 0, maxX = 10;
      var minY = 1, maxY = 9;

      function getX(x) { return pLeft + ((x - minX) / (maxX - minX)) * plotW; }
      function getY(y) { return pTop + plotH - ((y - minY) / (maxY - minY)) * plotH; }

      var midX = getX(5.5);
      var midY = getY(5.0);

      // 4 Quadrants
      // Top-Right : Bon (vert très clair)
      ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
      ctx.fillRect(midX, pTop, w - pRight - midX, midY - pTop);

      // Bottom-Left : Critique (rouge très clair)
      ctx.fillStyle = "rgba(220, 38, 38, 0.07)";
      ctx.fillRect(pLeft, midY, midX - pLeft, pTop + plotH - midY);

      // Top-Left : Paradoxe (orange clair)
      ctx.fillStyle = "rgba(217, 119, 6, 0.07)";
      ctx.fillRect(pLeft, pTop, midX - pLeft, midY - pTop);

      // Bottom-Right : Inattendu (jaune clair)
      ctx.fillStyle = "rgba(234, 179, 8, 0.07)";
      ctx.fillRect(midX, midY, w - pRight - midX, pTop + plotH - midY);

      // Quadrant labels
      ctx.font = font("700", 8);
      ctx.fillStyle = "#047857";
      ctx.fillText("↗ Bon", w - pRight - 36, pTop + 14);
      ctx.fillStyle = "#B91C1C";
      ctx.fillText("↙ Critique", pLeft + 8, pTop + plotH - 8);
      ctx.fillStyle = "#B45309";
      ctx.fillText("↖ Paradoxe", pLeft + 8, pTop + 14);
      ctx.fillStyle = "#A16207";
      ctx.fillText("↘ Inattendu", w - pRight - 46, pTop + plotH - 8);

      // Grid
      [2, 4, 6, 8, 10].forEach(function (tx) {
        var x = getX(tx);
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, pTop);
        ctx.lineTo(x, pTop + plotH);
        ctx.stroke();

        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 8.5);
        ctx.textAlign = "center";
        ctx.fillText(tx, x, pTop + plotH + 16);
      });

      [2, 4, 6, 8].forEach(function (ty) {
        var y = getY(ty);
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pLeft, y);
        ctx.lineTo(w - pRight, y);
        ctx.stroke();

        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 8.5);
        ctx.textAlign = "right";
        ctx.fillText(ty, pLeft - 4, y + 3);
      });

      // Regression line: Y = 2.0 + 0.58 * X
      ctx.save();
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 2;
      ctx.beginPath();
      var rx1 = getX(1.5), ry1 = getY(2.0 + 0.58 * 1.5);
      var rx2 = getX(9.2), ry2 = getY(2.0 + 0.58 * 9.2);
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx1 + (rx2 - rx1) * progress, ry1 + (ry2 - ry1) * progress);
      ctx.stroke();
      ctx.restore();

      // Regression stats badge
      ctx.fillStyle = "#052E16";
      ctx.font = font("800", 9);
      ctx.textAlign = "right";
      ctx.fillText("R² = 0.67 · p < 0.001", w - pRight, pTop - 8);

      // Points
      raw.forEach(function (pt) {
        var px = getX(pt.x);
        var py = getY(minY + (pt.y - minY) * progress);
        var pr = Math.max(2.5, Math.min(6, (pt.hhs / 160) * 6));

        ctx.beginPath();
        ctx.arc(px, py, pr, 0, 2 * Math.PI);
        ctx.fillStyle = rgba(pt.color, 0.7);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (hoverPt === pt) {
          ctx.beginPath();
          ctx.arc(px, py, pr + 3, 0, 2 * Math.PI);
          ctx.strokeStyle = "#052E16";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutBack(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 35, pRight = 20, pTop = 25, pBottom = 35;
      var plotW = r.width - pLeft - pRight;
      var plotH = r.height - pTop - pBottom;

      var found = null;
      var minDist = 12;

      raw.forEach(function (pt) {
        var px = pLeft + ((pt.x) / 10) * plotW;
        var py = pTop + plotH - ((pt.y - 1) / 8) * plotH;
        var dist = Math.hypot(mx - px, my - py);
        if (dist < minDist) {
          minDist = dist;
          found = pt;
        }
      });

      if (found) {
        hoverPt = found;
        draw(1);
        var html = "<b>" + found.loc + "</b><br>" +
          "🌾 Indice diversité cultures : <b>" + found.x + " / 10</b><br>" +
          "🍽️ Score HDDS moyen : <b>" + found.y + " / 12</b><br>" +
          "👥 Échantillon ménages : <b>" + found.hhs + "</b>";
        showTooltip(html, e.clientX, e.clientY);
      } else {
        if (hoverPt) {
          hoverPt = null;
          draw(1);
          hideTooltip();
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverPt = null;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 9 : Area Chart Production 10 ans (Stacked Area 2014->2024)
  // [Card 50% largeur]
  // ==========================================================================
  function createChart9(canvas) {
    var years = window.FAO_DATA.g9Years;
    var crops = window.FAO_DATA.g9Crops;
    var animStart = null;
    var hoverYearIdx = -1;
    var activeCrops = { mais: true, mil: true, sorgho: true, riz: true, haricots: true, autres: true };

    function getStackedTotals() {
      var nYears = years.length;
      var layers = [];
      var currBottom = new Array(nYears).fill(0);

      crops.forEach(function (crop) {
        if (!activeCrops[crop.key]) return;
        var layer = {
          crop: crop,
          bottom: currBottom.slice(),
          top: []
        };
        for (var i = 0; i < nYears; i++) {
          currBottom[i] += crop.vals[i];
          layer.top.push(currBottom[i]);
        }
        layers.push(layer);
      });
      return { layers: layers, maxVal: Math.max(56, Math.max.apply(null, currBottom)) };
    }

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 40, pRight = 20, pTop = 30, pBottom = 50;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var stack = getStackedTotals();
      var maxVal = stack.maxVal;

      function getX(yearIdx) {
        return pLeft + (yearIdx / (years.length - 1)) * plotW;
      }
      function getY(val) {
        return pTop + plotH - (val / maxVal) * plotH * progress;
      }

      // Grid
      [0, 15, 30, 45, 60].forEach(function (v) {
        var y = getY(v);
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pLeft, y);
        ctx.lineTo(w - pRight, y);
        ctx.stroke();

        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 9);
        ctx.textAlign = "right";
        ctx.fillText(v + " Mt", pLeft - 4, y + 3);
      });

      // Stacked Areas
      stack.layers.forEach(function (l) {
        ctx.beginPath();
        // Top curve forward
        for (var i = 0; i < years.length; i++) {
          var x = getX(i);
          var y = getY(l.top[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Bottom curve backward
        for (var j = years.length - 1; j >= 0; j--) {
          var bx = getX(j);
          var by = getY(l.bottom[j]);
          ctx.lineTo(bx, by);
        }
        ctx.closePath();
        ctx.fillStyle = rgba(l.crop.color, 0.75);
        ctx.fill();

        ctx.strokeStyle = l.crop.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Year labels on X axis
      years.forEach(function (yr, i) {
        var x = getX(i);
        ctx.fillStyle = (hoverYearIdx === i) ? "#052E16" : "#6B7280";
        ctx.font = font(hoverYearIdx === i ? "800" : "600", 9);
        ctx.textAlign = "center";
        ctx.fillText(yr, x, pTop + plotH + 16);
      });

      // Vertical guide on hover
      if (hoverYearIdx >= 0) {
        var hx = getX(hoverYearIdx);
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx, pTop);
        ctx.lineTo(hx, pTop + plotH);
        ctx.stroke();
        ctx.restore();
      }

      // Interactive legend row below
      var legX = pLeft;
      var legY = pTop + plotH + 34;
      crops.forEach(function (crop) {
        var isOn = activeCrops[crop.key];
        ctx.fillStyle = isOn ? crop.color : "#9CA3AF";
        ctx.fillRect(legX, legY, 9, 9);

        ctx.fillStyle = isOn ? "#1F2937" : "#9CA3AF";
        ctx.font = font(isOn ? "700" : "500", 8.5);
        ctx.textAlign = "left";
        ctx.fillText(crop.label, legX + 13, legY + 8);

        legX += ctx.measureText(crop.label).width + 24;
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var pLeft = 40, pRight = 20;
      var plotW = r.width - pLeft - pRight;

      var yrIdx = Math.round(((mx - pLeft) / plotW) * (years.length - 1));
      if (yrIdx >= 0 && yrIdx < years.length) {
        if (hoverYearIdx !== yrIdx) {
          hoverYearIdx = yrIdx;
          draw(1);
          var yr = years[yrIdx];
          var total = 0;
          var lines = crops.map(function (c) {
            if (!activeCrops[c.key]) return "";
            var v = c.vals[yrIdx];
            total += v;
            return "● " + c.label + " : <b>" + v + " Mt</b>";
          }).filter(Boolean).join("<br>");

          var html = "<b>Année " + yr + "</b><br>" + lines + "<br><b>Total : " + (Math.round(total * 10) / 10) + " Mt</b>";
          showTooltip(html, e.clientX, e.clientY);
        }
      } else {
        hoverYearIdx = -1;
        draw(1);
        hideTooltip();
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverYearIdx = -1;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      toggleCrop: function (key) {
        activeCrops[key] = !activeCrops[key];
        draw(1);
      },
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 10 : Radar Systèmes Alimentaires (7 axes)
  // [Card 50% largeur]
  // ==========================================================================
  function createChart10(canvas, selectedCountry) {
    var axes = window.FAO_DATA.g10Axes;
    var allCountries = window.FAO_DATA.g10Countries;
    var cKey = selectedCountry || "ALL"; // ALL or specific country
    var animStart = null;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var cx = w / 2;
      var cy = h / 2 + 6;
      var r = Math.min(w, h) * 0.38;
      var numAxes = axes.length;

      // Concentric web rings (20, 40, 60, 80, 100)
      [20, 40, 60, 80, 100].forEach(function (level) {
        var lr = (level / 100) * r;
        ctx.beginPath();
        for (var i = 0; i < numAxes; i++) {
          var ang = -Math.PI / 2 + (i / numAxes) * 2 * Math.PI;
          var x = cx + Math.cos(ang) * lr;
          var y = cy + Math.sin(ang) * lr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = level === 100 ? "#BBF7D0" : "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#9CA3AF";
        ctx.font = font("500", 7.5);
        ctx.fillText(level, cx + 4, cy - lr - 2);
      });

      // Axis spokes & Labels
      axes.forEach(function (ax, i) {
        var ang = -Math.PI / 2 + (i / numAxes) * 2 * Math.PI;
        var ex = cx + Math.cos(ang) * r;
        var ey = cy + Math.sin(ang) * r;

        ctx.strokeStyle = "#D1D5DB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Label
        var lx = cx + Math.cos(ang) * (r + 18);
        var ly = cy + Math.sin(ang) * (r + 18);
        ctx.fillStyle = "#052E16";
        ctx.font = font("700", 9.5);
        ctx.textAlign = Math.abs(Math.cos(ang)) < 0.2 ? "center" : (Math.cos(ang) > 0 ? "left" : "right");
        ctx.textBaseline = "middle";
        ctx.fillText(ax, lx, ly);
      });

      // Polygons for countries
      var keys = cKey === "ALL" ? Object.keys(allCountries) : [cKey];
      keys.forEach(function (k) {
        var ct = allCountries[k];
        if (!ct) return;

        ctx.beginPath();
        ct.vals.forEach(function (val, i) {
          var ang = -Math.PI / 2 + (i / numAxes) * 2 * Math.PI;
          var vr = (val / 100) * r * progress;
          var x = cx + Math.cos(ang) * vr;
          var y = cy + Math.sin(ang) * vr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = rgba(ct.color, cKey === "ALL" ? 0.18 : 0.35);
        ctx.fill();

        ctx.strokeStyle = ct.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dots on vertices
        ct.vals.forEach(function (val, i) {
          var ang = -Math.PI / 2 + (i / numAxes) * 2 * Math.PI;
          var vr = (val / 100) * r * progress;
          var x = cx + Math.cos(ang) * vr;
          var y = cy + Math.sin(ang) * vr;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = ct.color;
          ctx.fill();
        });
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);

    return {
      setCountry: function (k) {
        cKey = k;
        animStart = null;
        requestAnimationFrame(animate);
      },
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {}
    };
  }

  // ==========================================================================
  // GRAPHIQUE 11 : Bar Chart Valeur Nutritive (Mil vs Maïs vs Riz)
  // [Card 1/3 largeur]
  // ==========================================================================
  function createChart11(canvas) {
    var raw = window.FAO_DATA.g11Grains;
    var animStart = null;
    var hoverIdx = -1;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 65, pRight = 20, pTop = 30, pBottom = 25;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var numGroups = raw.length;
      var groupH = plotH / numGroups;
      var barH = Math.max(4, (groupH - 8) / 3);

      raw.forEach(function (d, g) {
        var gy = pTop + g * groupH;

        // Group label (Nutrient)
        ctx.fillStyle = "#052E16";
        ctx.font = font("700", 9.5);
        ctx.textAlign = "right";
        ctx.fillText(d.nutrient, pLeft - 8, gy + groupH / 2 + 3);

        // Normalize bar max within nutrient context
        var maxInGroup = Math.max(d.mil, d.mais, d.riz, d.rdaPortion);

        // 3 Bars: Mil (#059669), Maïs (#D97706), Riz (#0891B2)
        var bars = [
          { name: "Mil", val: d.mil, color: "#059669" },
          { name: "Maïs", val: d.mais, color: "#D97706" },
          { name: "Riz", val: d.riz, color: "#0891B2" }
        ];

        bars.forEach(function (b, bi) {
          var by = gy + 3 + bi * (barH + 2);
          var bw = (b.val / maxInGroup) * plotW * progress;

          ctx.fillStyle = b.color;
          roundRect(ctx, pLeft, by, bw, barH, 2);
          ctx.fill();

          // Value label
          ctx.fillStyle = "#374151";
          ctx.font = font("700", 8);
          ctx.textAlign = "left";
          ctx.fillText(b.val + " " + d.unit, pLeft + bw + 4, by + barH - 1);
        });

        // Recommended intake dashed tick
        var rdaX = pLeft + (d.rdaPortion / maxInGroup) * plotW;
        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = "#DC2626";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rdaX, gy + 2);
        ctx.lineTo(rdaX, gy + groupH - 2);
        ctx.stroke();
        ctx.restore();
      });

      // Legend on top
      ctx.fillStyle = "#059669";
      ctx.fillRect(pLeft, pTop - 18, 8, 8);
      ctx.fillStyle = "#374151";
      ctx.font = font("700", 8.5);
      ctx.fillText("Mil", pLeft + 12, pTop - 11);

      ctx.fillStyle = "#D97706";
      ctx.fillRect(pLeft + 45, pTop - 18, 8, 8);
      ctx.fillText("Maïs", pLeft + 57, pTop - 11);

      ctx.fillStyle = "#0891B2";
      ctx.fillRect(pLeft + 95, pTop - 18, 8, 8);
      ctx.fillText("Riz", pLeft + 107, pTop - 11);
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var my = e.clientY - r.top;
      var pTop = 30, pBottom = 25;
      var groupH = (r.height - pTop - pBottom) / raw.length;
      var idx = Math.floor((my - pTop) / groupH);

      if (idx >= 0 && idx < raw.length) {
        if (hoverIdx !== idx) {
          hoverIdx = idx;
          var d = raw[idx];
          var html = "<b>" + d.nutrient + " (" + d.unit + ")</b><br>" +
            "🌾 Mil : <b>" + d.mil + "</b><br>" +
            "🌽 Maïs : <b>" + d.mais + "</b><br>" +
            "🍚 Riz : <b>" + d.riz + "</b><br>" +
            "🎯 Apport recommandé (portion) : <b>" + d.rdaPortion + " " + d.unit + "</b><br>" +
            "<span style='color:#059669'>● " + d.comment + "</span>";
          showTooltip(html, e.clientX, e.clientY);
        }
      } else {
        hoverIdx = -1;
        hideTooltip();
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverIdx = -1;
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 12 : Heatmap Prix Marchés 2024
  // [Card 1/3 largeur]
  // ==========================================================================
  function createChart12(canvas, selectedCountry) {
    var cKey = selectedCountry || "NER";
    var cData = window.FAO_DATA.g12Countries[cKey] || window.FAO_DATA.g12Countries["NER"];
    var months = window.FAO_DATA.g12Months;
    var animStart = null;
    var hoverCell = null;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 65, pRight = 10, pTop = 30, pBottom = 20;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var rows = cData.crops.length;
      var cols = 12;
      var cellW = plotW / cols;
      var cellH = plotH / rows;

      // Month headers
      months.forEach(function (m, i) {
        var x = pLeft + i * cellW + cellW / 2;
        ctx.fillStyle = "#4B5563";
        ctx.font = font("700", 7.5);
        ctx.textAlign = "center";
        ctx.fillText(m, x, pTop - 8);
      });

      // Crop rows
      cData.crops.forEach(function (crop, r) {
        var y = pTop + r * cellH;

        // Crop label
        ctx.fillStyle = "#052E16";
        ctx.font = font("700", 9);
        ctx.textAlign = "right";
        ctx.fillText(crop.name, pLeft - 6, y + cellH / 2 + 3);

        crop.prices.forEach(function (price, c) {
          var x = pLeft + c * cellW;
          var dev = (price - crop.baseline) / crop.baseline; // % deviation
          var isHarvest = crop.harvestMonths.indexOf(c) !== -1;
          var isHover = hoverCell && hoverCell.r === r && hoverCell.c === c;

          // Color by deviation
          var bgCol = "rgba(5, 150, 105, 0.4)"; // Normal/low (green)
          if (dev >= 0.50) bgCol = "rgba(220, 38, 38, 0.75)"; // Red > 50%
          else if (dev >= 0.20) bgCol = "rgba(217, 119, 6, 0.65)"; // Amber +20-50%
          else if (dev > 0.05) bgCol = "rgba(16, 185, 129, 0.45)";

          ctx.fillStyle = bgCol;
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);

          if (isHover) {
            ctx.strokeStyle = "#052E16";
            ctx.lineWidth = 1.8;
            ctx.strokeRect(x, y, cellW, cellH);
          }

          // Price value inside cell
          ctx.fillStyle = dev >= 0.20 ? "#FFFFFF" : "#111827";
          ctx.font = font("700", Math.min(8, cellH * 0.45));
          ctx.textAlign = "center";
          ctx.fillText(price, x + cellW / 2, y + cellH / 2 + (isHarvest ? -2 : 3));

          // 🌾 Icon on harvest months
          if (isHarvest && cellH > 20) {
            ctx.font = font("500", 7);
            ctx.fillText("🌾", x + cellW / 2, y + cellH - 3);
          }
        });
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 65, pRight = 10, pTop = 30, pBottom = 20;
      var plotW = r.width - pLeft - pRight;
      var plotH = r.height - pTop - pBottom;

      if (mx < pLeft || mx > r.width - pRight || my < pTop || my > r.height - pBottom) {
        if (hoverCell) {
          hoverCell = null;
          draw(1);
          hideTooltip();
        }
        return;
      }

      var c = Math.floor((mx - pLeft) / (plotW / 12));
      var row = Math.floor((my - pTop) / (plotH / cData.crops.length));

      if (row >= 0 && row < cData.crops.length && c >= 0 && c < 12) {
        if (!hoverCell || hoverCell.r !== row || hoverCell.c !== c) {
          hoverCell = { r: row, c: c };
          draw(1);
          var cr = cData.crops[row];
          var pr = cr.prices[c];
          var devPct = Math.round(((pr - cr.baseline) / cr.baseline) * 100);
          var isH = cr.harvestMonths.indexOf(c) !== -1;
          var html = "<b>" + cr.name + " · " + months[c] + " (" + cData.name + ")</b><br>" +
            "Prix observé : <b>" + pr + " " + cData.currency + "</b><br>" +
            "Normale saisonnière : " + cr.baseline + " " + cData.currency + "<br>" +
            "Écart : <b>" + (devPct > 0 ? "+" + devPct : devPct) + "%</b>" +
            (isH ? "<br><span style='color:#059669'>🌾 Mois de récolte</span>" : "");
          showTooltip(html, e.clientX, e.clientY);
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverCell = null;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      setCountry: function (k) {
        cKey = k;
        cData = window.FAO_DATA.g12Countries[k] || window.FAO_DATA.g12Countries["NER"];
        animStart = null;
        requestAnimationFrame(animate);
      },
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 13 : Lollipop HDDS Objectifs (14 pays)
  // [Card 1/3 largeur]
  // ==========================================================================
  function createChart13(canvas) {
    var raw = window.FAO_DATA.g5Hdds;
    var animStart = null;
    var hoverIdx = -1;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 85, pRight = 45, pTop = 25, pBottom = 25;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var numRows = raw.length;
      var rowH = plotH / numRows;

      function getX(score) {
        return pLeft + (score / 12) * plotW;
      }

      // Vertical Target line at 6.0
      var objX = getX(6.0);
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(objX, pTop);
      ctx.lineTo(objX, pTop + plotH);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#059669";
      ctx.font = font("700", 8.5);
      ctx.textAlign = "center";
      ctx.fillText("Cible 6.0", objX, pTop - 8);

      raw.forEach(function (d, r) {
        var cy = pTop + r * rowH + rowH / 2;
        var isHover = hoverIdx === r;

        // Color by gap
        var col = "#DC2626";
        if (d.score >= 5.5) col = "#059669";
        else if (d.score >= 4.5) col = "#EAB308";
        else if (d.score >= 4.0) col = "#D97706";

        // Country name
        ctx.fillStyle = isHover ? "#052E16" : "#4B5563";
        ctx.font = font(isHover ? "800" : "600", 9);
        ctx.textAlign = "right";
        ctx.fillText(d.name, pLeft - 8, cy + 3);

        // Stem (tige) grows from left
        var targetX = getX(d.score);
        var stemX = pLeft + (targetX - pLeft) * progress;

        ctx.strokeStyle = isHover ? col : "#D1D5DB";
        ctx.lineWidth = isHover ? 2.5 : 1.8;
        ctx.beginPath();
        ctx.moveTo(pLeft, cy);
        ctx.lineTo(stemX, cy);
        ctx.stroke();

        // Head (cercle) arrives
        if (progress > 0.4) {
          ctx.beginPath();
          ctx.arc(stemX, cy, isHover ? 6.5 : 4.5, 0, 2 * Math.PI);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Distance / Gap to target annotation
        if (progress > 0.8) {
          var gap = Math.round((d.score - 6.0) * 10) / 10;
          ctx.fillStyle = gap >= 0 ? "#047857" : "#B91C1C";
          ctx.font = font("700", 8);
          ctx.textAlign = "left";
          ctx.fillText((gap > 0 ? "+" : "") + gap, stemX + 7, cy + 3);
        }
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutBack(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var my = e.clientY - r.top;
      var pTop = 25, pBottom = 25;
      var plotH = r.height - pTop - pBottom;
      var rowH = plotH / raw.length;

      var idx = Math.floor((my - pTop) / rowH);
      if (idx >= 0 && idx < raw.length) {
        if (hoverIdx !== idx) {
          hoverIdx = idx;
          draw(1);
          var d = raw[idx];
          var gap = Math.round((d.score - 6.0) * 10) / 10;
          var html = "<b>" + d.name + "</b><br>" +
            "HDDS : <b>" + d.score + " / 12</b><br>" +
            "Gap pour atteindre objectif : <b>" + gap + "</b>";
          showTooltip(html, e.clientX, e.clientY);
        }
      } else {
        hoverIdx = -1;
        draw(1);
        hideTooltip();
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverIdx = -1;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 14 : Bubble Pertes × Revenus
  // [Card 50% largeur]
  // ==========================================================================
  function createChart14(canvas) {
    var raw = window.FAO_DATA.g14Bubbles;
    var animStart = null;
    var hoverIdx = -1;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 55, pRight = 25, pTop = 30, pBottom = 40;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var minX = 10, maxX = 32;
      var minY = 200, maxY = 1100;

      function getX(val) { return pLeft + ((val - minX) / (maxX - minX)) * plotW; }
      function getY(val) { return pTop + plotH - ((val - minY) / (maxY - minY)) * plotH; }

      // Grid
      [10, 15, 20, 25, 30].forEach(function (v) {
        var x = getX(v);
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, pTop);
        ctx.lineTo(x, pTop + plotH);
        ctx.stroke();

        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 9);
        ctx.textAlign = "center";
        ctx.fillText(v + "%", x, pTop + plotH + 18);
      });

      [200, 400, 600, 800, 1000].forEach(function (v) {
        var y = getY(v);
        ctx.strokeStyle = "#E5E7EB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pLeft, y);
        ctx.lineTo(w - pRight, y);
        ctx.stroke();

        ctx.fillStyle = "#6B7280";
        ctx.font = font("600", 9);
        ctx.textAlign = "right";
        ctx.fillText(v + "$", pLeft - 6, y + 3);
      });

      // Axis labels
      ctx.fillStyle = "#052E16";
      ctx.font = font("700", 9.5);
      ctx.textAlign = "center";
      ctx.fillText("% Pertes post-récolte →", pLeft + plotW / 2, pTop + plotH + 34);

      // Negative correlation regression line
      ctx.save();
      ctx.strokeStyle = "#DC2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      var rx1 = getX(12), ry1 = getY(1040);
      var rx2 = getX(30), ry2 = getY(260);
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx1 + (rx2 - rx1) * progress, ry1 + (ry2 - ry1) * progress);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#DC2626";
      ctx.font = font("700", 9);
      ctx.textAlign = "right";
      ctx.fillText("Corrélation négative (Moins de pertes = Plus de revenus)", w - pRight, pTop - 12);

      // Bubbles
      raw.forEach(function (d, i) {
        var bx = getX(d.pertes);
        var by = getY(minY + (d.revenus - minY) * progress);
        var br = Math.max(6, Math.min(26, (d.prod / 18.4) * 26));
        var isHover = hoverIdx === i;

        ctx.beginPath();
        ctx.arc(bx, by, br, 0, 2 * Math.PI);
        ctx.fillStyle = rgba(d.color, isHover ? 0.85 : 0.65);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Country name inside or next to bubble
        ctx.fillStyle = "#111827";
        ctx.font = font("800", 9);
        ctx.textAlign = "center";
        ctx.fillText(d.name, bx, by + br + 11);
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutBack(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 55, pRight = 25, pTop = 30, pBottom = 40;
      var plotW = r.width - pLeft - pRight;
      var plotH = r.height - pTop - pBottom;

      var found = -1;
      var minDist = 18;

      raw.forEach(function (d, i) {
        var bx = pLeft + ((d.pertes - 10) / 22) * plotW;
        var by = pTop + plotH - ((d.revenus - 200) / 900) * plotH;
        var dist = Math.hypot(mx - bx, my - by);
        if (dist < minDist) {
          minDist = dist;
          found = i;
        }
      });

      if (found !== -1) {
        hoverIdx = found;
        draw(1);
        var d = raw[found];
        var html = "<b>" + d.name + "</b><br>" +
          "📉 Pertes post-récolte : <b>" + d.pertes + "%</b><br>" +
          "💵 Revenu moyen producteur : <b>" + d.revenus + " $/an</b><br>" +
          "🌾 Volume de production : <b>" + d.prod + " Mt</b>";
        showTooltip(html, e.clientX, e.clientY);
      } else {
        if (hoverIdx !== -1) {
          hoverIdx = -1;
          draw(1);
          hideTooltip();
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverIdx = -1;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // GRAPHIQUE 15 : Scorecard Nutrition-Agriculture (Bullet Chart Grid)
  // [Card 50% largeur]
  // ==========================================================================
  function createChart15(canvas) {
    var scorecard = window.FAO_DATA.g15Scorecard;
    var animStart = null;
    var hoverCell = null;

    function draw(progress) {
      var s = setupCanvas(canvas);
      var ctx = s.ctx, w = s.w, h = s.h;
      ctx.clearRect(0, 0, w, h);

      var pLeft = 85, pRight = 15, pTop = 35, pBottom = 15;
      var plotW = w - pLeft - pRight;
      var plotH = h - pTop - pBottom;

      var numRows = scorecard.countries.length;
      var numCols = scorecard.indicators.length;
      var rowH = plotH / numRows;
      var colW = plotW / numCols;

      // Indicator column headers
      scorecard.indicators.forEach(function (ind, c) {
        var x = pLeft + c * colW + colW / 2;
        ctx.fillStyle = "#052E16";
        ctx.font = font("700", 8.5);
        ctx.textAlign = "center";
        ctx.fillText(ind.label, x, pTop - 12);
        ctx.fillStyle = "#6B7280";
        ctx.font = font("500", 7.5);
        ctx.fillText("Obj: " + ind.target + ind.unit, x, pTop - 2);
      });

      // Rows for countries
      scorecard.countries.forEach(function (ct, r) {
        var y = pTop + r * rowH;

        // Country header
        ctx.fillStyle = "#052E16";
        ctx.font = font("800", 9.5);
        ctx.textAlign = "right";
        ctx.fillText(ct.flag + " " + ct.name, pLeft - 8, y + rowH / 2 + 3);

        scorecard.indicators.forEach(function (ind, c) {
          var x = pLeft + c * colW;
          var val = ct.data[ind.key];
          var isHover = hoverCell && hoverCell.r === r && hoverCell.c === c;

          // Mini bullet chart within cell
          var padX = 6;
          var barY = y + rowH * 0.45;
          var barH = 7;
          var maxRangeW = colW - padX * 2;

          // Qualitative context band #E5E7EB
          ctx.fillStyle = "#F3F4F6";
          roundRect(ctx, x + padX, barY - 2, maxRangeW, barH + 4, 3);
          ctx.fill();

          // Performance status (good/warn/bad)
          var isGood = ind.higherBetter ? (val >= ind.target) : (val <= ind.target);
          var barCol = isGood ? "#059669" : "#DC2626";

          // Value bar
          var valW = clamp((val / ind.max), 0, 1) * maxRangeW * progress;
          ctx.fillStyle = barCol;
          roundRect(ctx, x + padX, barY, valW, barH, 2);
          ctx.fill();

          // Target line
          var targX = x + padX + clamp((ind.target / ind.max), 0, 1) * maxRangeW;
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(targX, barY - 3);
          ctx.lineTo(targX, barY + barH + 3);
          ctx.stroke();

          // Value text
          ctx.fillStyle = barCol;
          ctx.font = font("700", 8);
          ctx.textAlign = "center";
          ctx.fillText(val + " " + ind.unit, x + colW / 2, y + rowH - 3);

          if (isHover) {
            ctx.strokeStyle = "#052E16";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x + 2, y + 2, colW - 4, rowH - 4);
          }
        });
      });
    }

    function animate(t) {
      if (!animStart) animStart = t;
      var el = (t - animStart) / DUR;
      var prog = clamp(easeOutCubic(el), 0, 1);
      draw(prog);
      if (el < 1) requestAnimationFrame(animate);
    }

    function onMouseMove(e) {
      var r = canvas.getBoundingClientRect();
      var mx = e.clientX - r.left;
      var my = e.clientY - r.top;
      var pLeft = 85, pRight = 15, pTop = 35, pBottom = 15;
      var plotW = r.width - pLeft - pRight;
      var plotH = r.height - pTop - pBottom;

      if (mx < pLeft || mx > r.width - pRight || my < pTop || my > r.height - pBottom) {
        if (hoverCell) {
          hoverCell = null;
          draw(1);
          hideTooltip();
        }
        return;
      }

      var c = Math.floor((mx - pLeft) / (plotW / scorecard.indicators.length));
      var row = Math.floor((my - pTop) / (plotH / scorecard.countries.length));

      if (row >= 0 && row < scorecard.countries.length && c >= 0 && c < scorecard.indicators.length) {
        if (!hoverCell || hoverCell.r !== row || hoverCell.c !== c) {
          hoverCell = { r: row, c: c };
          draw(1);
          var ct = scorecard.countries[row];
          var ind = scorecard.indicators[c];
          var val = ct.data[ind.key];
          var isGood = ind.higherBetter ? (val >= ind.target) : (val <= ind.target);
          var html = "<b>" + ct.flag + " " + ct.name + " · " + ind.label + "</b><br>" +
            "Valeur mesurée : <b>" + val + " " + ind.unit + "</b><br>" +
            "Cible FAO : <b>" + ind.target + " " + ind.unit + "</b><br>" +
            "Évaluation : <span style='color:" + (isGood ? "#059669" : "#DC2626") + "'>" + (isGood ? "● Objectif atteint" : "● En retard") + "</span>";
          showTooltip(html, e.clientX, e.clientY);
        }
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", function () {
      hoverCell = null;
      draw(1);
      hideTooltip();
    });

    requestAnimationFrame(animate);

    return {
      update: function () { animStart = null; requestAnimationFrame(animate); },
      repaint: function () { draw(1); },
      destroy: function () {
        canvas.removeEventListener("mousemove", onMouseMove);
        hideTooltip();
      }
    };
  }

  // ==========================================================================
  // EXPORT GLOBAL FAO_CHARTS
  // ==========================================================================
  root.FAO_CHARTS = {
    renderMiniKpi1: renderMiniKpi1,
    renderMiniKpi2: renderMiniKpi2,
    renderMiniKpi3: renderMiniKpi3,
    renderMiniKpi4: renderMiniKpi4,
    renderMiniKpi5: renderMiniKpi5,

    createChart1: createChart1,
    createChart2: createChart2,
    createChart3: createChart3,
    createChart4: createChart4,
    createChart5: createChart5,
    createChart6: createChart6,
    createChart7: createChart7,
    createChart8: createChart8,
    createChart9: createChart9,
    createChart10: createChart10,
    createChart11: createChart11,
    createChart12: createChart12,
    createChart13: createChart13,
    createChart14: createChart14,
    createChart15: createChart15,

    repaintAll: function () {
      REGISTRY.forEach(function (inst) {
        if (inst && typeof inst.repaint === "function") inst.repaint();
      });
    },

    register: function (inst) {
      if (inst) REGISTRY.push(inst);
      return inst;
    },

    clear: function () {
      REGISTRY.forEach(function (inst) {
        if (inst && typeof inst.destroy === "function") inst.destroy();
      });
      REGISTRY = [];
    }
  };

})(typeof window !== "undefined" ? window : this);
