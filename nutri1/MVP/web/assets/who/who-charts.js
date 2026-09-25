/* ============================================================================
   NUTRI.N°1 — WHO NUTRITION SURVEILLANCE · AFRIQUE DE L'OUEST
   who-charts.js — micro-bibliothèque de graphiques 100 % Canvas API.

   • Zéro framework, zéro dépendance (Chart.js n'est PAS utilisé ici).
   • Chaque fonction renvoie un contrôleur { update, repaint, destroy }.
   • Convention d'animation : draw(ctx, p) où p ∈ [0,1] est la progression.
     p = 1 => état final. update() rejoue l'animation, repaint() dessine
     immédiatement l'état final (survol, redimensionnement).
   • Toutes les animations sont pilotées par requestAnimationFrame (60 fps).
   • Un seul élément tooltip est partagé par tous les graphiques.
   ==========================================================================*/
(function (root) {
  "use strict";

  const DPR = () => Math.min(root.devicePixelRatio || 1, 2);
  const DUR = 950; /* durée d'animation par défaut (ms) */
  const FONT = (w, s) => (w ? w + " " : "") + s + "px Inter, system-ui, Arial, sans-serif";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBounce = (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  };

  /* Progression décalée : l'élément i démarre après les précédents.
     overlap = part de la timeline occupée par chaque élément.            */
  function stagger(i, n, p, overlap) {
    const ov = overlap === undefined ? 0.14 : overlap;
    const span = 1 - ov * Math.max(0, n - 1);
    const start = ov * i;
    return clamp((p - start) / (span || 1), 0, 1);
  }

  /* ------------------------------------------------------------- tooltip */
  let tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "wsv-tip";
      tipEl.style.display = "none";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(html, ev) {
    const t = tip();
    t.innerHTML = html;
    t.style.display = "block";
    const pad = 14;
    const r = t.getBoundingClientRect();
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + r.width > root.innerWidth - 8) x = ev.clientX - r.width - pad;
    if (y + r.height > root.innerHeight - 8) y = ev.clientY - r.height - pad;
    t.style.left = Math.max(8, x) + "px";
    t.style.top = Math.max(8, y) + "px";
  }
  function hideTip() { if (tipEl) tipEl.style.display = "none"; }

  /* ------------------------------------------------------------- contexte */
  function ctxOf(canvas) {
    const dpr = DPR(), w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  const REG = [];
  function onResize(canvas, draw) {
    const o = { canvas: canvas, draw: draw };
    REG.push(o);
    return o;
  }
  function repaintAll() {
    REG.forEach(function (o) { if (o.canvas.isConnected) o.draw(1); });
  }
  let rt = 0;
  root.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(repaintAll, 120);
  });

  function tween(canvas, dur, frame, done) {
    if (canvas.__raf) cancelAnimationFrame(canvas.__raf);
    const t0 = performance.now();
    const step = function (t) {
      const p = clamp((t - t0) / dur, 0, 1);
      frame(easeOut(p));
      if (p < 1) canvas.__raf = requestAnimationFrame(step);
      else { canvas.__raf = 0; if (done) done(); }
    };
    canvas.__raf = requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------- primitives */
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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
  function rightRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w), Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }
  function smooth(ctx, pts, tension) {
    const k = tension === undefined ? 1 : tension;
    if (!pts.length) return;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      ctx.bezierCurveTo(
        p1.x + (p2.x - p0.x) / 6 * k, p1.y + (p2.y - p0.y) / 6 * k,
        p2.x - (p3.x - p1.x) / 6 * k, p2.y - (p3.y - p1.y) / 6 * k,
        p2.x, p2.y
      );
    }
  }
  const hex2rgb = (hex) => {
    const h = String(hex).replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgba = (hex, a) => { const c = hex2rgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; };
  const lighten = (hex, amt) => {
    const c = hex2rgb(hex);
    return "rgb(" + c.map((v) => Math.round(v + (255 - v) * amt)).join(",") + ")";
  };
  const TICKS = (min, max, n) => {
    const out = [], step = (max - min) / n;
    for (let i = 0; i <= n; i++) out.push(min + step * i);
    return out;
  };
  /* Graduations "rondes" (1 / 2 / 5 x 10^n) : évite les 41,6 % ou 24,8 % */
  function niceTicks(min, max, count) {
    const span = max - min;
    if (!isFinite(span) || span <= 0) return [min];
    const step0 = span / (count || 5);
    const mag = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10));
    const norm = step0 / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) {
      out.push(Math.round(v * 1e6) / 1e6);
    }
    return out.length ? out : [min, max];
  }

  /* Attache les gestionnaires de survol ; fn(ev, mx, my) en coordonnées canvas */
  function hit(canvas, fn) {
    const h = function (ev) {
      const r = canvas.getBoundingClientRect();
      fn(ev, ev.clientX - r.left, ev.clientY - r.top);
    };
    canvas.addEventListener("mousemove", h);
    canvas.addEventListener("mouseleave", function () {
      hideTip();
      if (canvas.__hoverClear) canvas.__hoverClear();
    });
    return h;
  }

  /* ------------------------------------------------------------- montage */
  /* draw(c, p) : p = progression 0→1. Le montage joue l'animation
     d'entrée, puis expose update() (rejoue) et repaint() (état final).   */
  function mount(canvas, cfg, draw) {
    if (!canvas) return { update: function () {}, repaint: function () {}, destroy: function () {} };
    const reg = onResize(canvas, function (p) {
      const c = ctxOf(canvas);
      if (c) draw(c, p);
    });
    const api = {
      update: function (cfg2) {
        /* La config est remplacée EN PLACE : les fonctions draw() et les
           gestionnaires de survol lisent l'objet cfg capturé à la création.
           (Réassigner la variable locale ne suffisait pas : update() rejouait
           l'animation avec les anciennes données.) Chaque graphique travaille
           sur une copie privée (voir own()), les données de l'appelant ne
           sont donc jamais modifiées.                                        */
        if (cfg2 !== undefined && cfg2 !== cfg) {
          Object.keys(cfg).forEach(function (k) { delete cfg[k]; });
          Object.assign(cfg, cfg2);
        }
        const c0 = ctxOf(canvas);
        if (!c0) return;
        tween(canvas, DUR, function (p) {
          const c = ctxOf(canvas);
          if (c) draw(c, p);
        });
      },
      repaint: function () {
        const c = ctxOf(canvas);
        if (c) draw(c, 1);
      },
      destroy: function () {
        const i = REG.indexOf(reg);
        if (i > -1) REG.splice(i, 1);
        if (canvas.__raf) cancelAnimationFrame(canvas.__raf);
      },
    };
    api.update(cfg); /* animation d'entrée */
    return api;
  }

  /* ===================================================================== */
  /* 1 — Multi-lignes + aires (Évolution stunting 2014-2024)               */
  /* ===================================================================== */
  function multiLine(canvas, cfg) {
    const st = { hover: -1 };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const P = { l: 40, r: 16, t: 16, b: 28 };
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const labels = cfg.labels;
      const vis = cfg.series.filter(function (s) { return s.visible !== false; });
      const yMax = cfg.yMax || 55, yMin = cfg.yMin || 0;
      const X = (i) => P.l + (labels.length === 1 ? pw / 2 : (i / (labels.length - 1)) * pw);
      const Y = (v) => P.t + ph - ((v - yMin) / (yMax - yMin)) * ph;

      /* grille + axe Y */
      ctx.font = FONT(500, 10);
      ctx.fillStyle = "#94A3B8";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      niceTicks(yMin, yMax, 5).forEach(function (v) {
        const y = Y(v);
        ctx.strokeStyle = "rgba(148,163,184,.20)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(P.l, y);
        ctx.lineTo(w - P.r, y);
        ctx.stroke();
        ctx.fillText(Math.round(v) + "%", P.l - 7, y);
      });
      /* axe X */
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      labels.forEach(function (lb, i) {
        if (labels.length > 8 && i % 2 === 1) return;
        ctx.fillStyle = "#94A3B8";
        ctx.fillText(String(lb), X(i), P.t + ph + 8);
      });

      /* zone COVID */
      if (cfg.zone) {
        const i0 = labels.indexOf(cfg.zone.x0), i1 = labels.indexOf(cfg.zone.x1);
        if (i0 > -1 && i1 > -1) {
          const step = pw / (labels.length - 1);
          const x0 = X(i0) - step / 2, x1 = X(i1) + step / 2;
          ctx.fillStyle = "rgba(100,116,139,.10)";
          ctx.fillRect(x0, P.t, x1 - x0, ph);
          ctx.fillStyle = "#64748B";
          ctx.font = FONT(700, 9.5);
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(cfg.zone.label, (x0 + x1) / 2, P.t + 4);
        }
      }

      /* seuil OMS */
      if (cfg.threshold) {
        const y = Y(cfg.threshold.value);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(P.l, y);
        ctx.lineTo(w - P.r, y);
        ctx.stroke();
        ctx.restore();
      }

      /* courbes : tracé séquentiel gauche → droite */
      vis.forEach(function (s, si) {
        const pts = s.data.map(function (v, i) { return { x: X(i), y: Y(v) }; });
        const prog = stagger(si, vis.length, p, 0.14);
        if (prog <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l - 1, P.t - 6, pw * prog + 2, ph + 12);
        ctx.clip();
        /* aire dégradée */
        const g = ctx.createLinearGradient(0, P.t, 0, P.t + ph);
        g.addColorStop(0, rgba(s.color, 0.20));
        g.addColorStop(1, rgba(s.color, 0.02));
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.lineTo(pts[pts.length - 1].x, P.t + ph);
        ctx.lineTo(pts[0].x, P.t + ph);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        /* trait */
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
        /* points */
        pts.forEach(function (pt, i) {
          if (i < pts.length - 1 && pw * prog < pt.x - P.l) return;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = s.color;
          ctx.stroke();
        });
      });

      /* libellé du seuil : dessiné APRÈS les courbes, avec un halo blanc,
         pour rester lisible quand une courbe le croise.
         threshold.align = "left" le place au début de l'axe.            */
      if (cfg.threshold && cfg.threshold.label) {
        const y = Y(cfg.threshold.value);
        const left = cfg.threshold.align === "left";
        ctx.font = FONT(700, 9.5);
        ctx.textAlign = left ? "left" : "right";
        ctx.textBaseline = "bottom";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(255,255,255,.92)";
        const tx = left ? P.l + 6 : w - P.r - 2;
        if (cfg.threshold.pill) {
          /* pastille blanche : lisible même si une courbe passe dessous */
          const tw = ctx.measureText(cfg.threshold.label).width;
          const bx = left ? tx - 5 : tx - tw - 5;
          ctx.fillStyle = "rgba(255,255,255,.96)";
          roundRect(ctx, bx, y - 18, tw + 10, 15, 7.5);
          ctx.fill();
          ctx.strokeStyle = "rgba(239,68,68,.45)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.strokeText(cfg.threshold.label, tx, y - 3);
        }
        ctx.fillStyle = "#EF4444";
        ctx.fillText(cfg.threshold.label, tx, cfg.threshold.pill ? y - 5.5 : y - 3);
      }

      /* survol */
      if (st.hover > -1 && st.hover < labels.length) {
        const x = X(st.hover);
        ctx.save();
        ctx.strokeStyle = "rgba(100,116,139,.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, P.t);
        ctx.lineTo(x, P.t + ph);
        ctx.stroke();
        ctx.restore();
        vis.forEach(function (s) {
          const py = Y(s.data[st.hover]);
          ctx.beginPath();
          ctx.arc(x, py, 8, 0, Math.PI * 2);
          ctx.fillStyle = rgba(s.color, 0.18);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        });
      }
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx) {
      const labels = cfg.labels;
      const P = { l: 40, r: 16 };
      const pw = canvas.clientWidth - P.l - P.r;
      const i = Math.round(((mx - P.l) / pw) * (labels.length - 1));
      if (i < 0 || i >= labels.length) { st.hover = -1; hideTip(); ctrl.repaint(); return; }
      st.hover = i;
      ctrl.repaint();
      const vis = cfg.series.filter(function (s) { return s.visible !== false; });
      let html = '<div class="wsv-tip-t">' + labels[i] + "</div>";
      vis.forEach(function (s) {
        html += '<div class="wsv-tip-r"><i style="background:' + s.color + '"></i>' + s.name +
          "<b>" + s.data[i] + "%</b></div>";
      });
      showTip(html, ev);
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 2 — Barres horizontales classées                                      */
  /* ===================================================================== */
  function hbar(canvas, cfg) {
    const st = { hover: -1 };
    /* Bandes de couleur : par défaut celles du brief (stunting) ; un
       indicateur peut fournir les siennes via cfg.bands = [{min, color}]
       triées par seuil décroissant (ex. obésité, hypertension, diabète). */
    const colorFor = function (v) {
      if (cfg.bands && cfg.bands.length) {
        for (let i = 0; i < cfg.bands.length; i++) if (v >= cfg.bands[i].min) return cfg.bands[i].color;
        return cfg.bands[cfg.bands.length - 1].color;
      }
      if (v > 35) return "#EF4444";
      if (v >= 20) return "#F59E0B";
      if (v >= 10) return "#10B981";
      return "#0066CC";
    };
    const fmt = function (v) { return cfg.fmt ? cfg.fmt(v) : v + (cfg.unit || "%"); };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const rows = cfg.rows, n = rows.length;
      const L = 116, R = 46, T = 20, B = 8;
      const pw = w - L - R, ph = h - T - B;
      const slot = ph / n, bh = Math.min(22, slot - 8);
      const max = cfg.max || 50;
      const X = (v) => L + (v / max) * pw;

      if (cfg.threshold) {
        const x = X(cfg.threshold.value);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, T - 8);
        ctx.lineTo(x, T + ph);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#EF4444";
        ctx.font = FONT(700, 9.5);
        ctx.textBaseline = "top";
        /* libellé à droite du repère, ou à gauche s'il sortirait du cadre */
        const tw = ctx.measureText(cfg.threshold.label).width;
        const flip = x + 5 + tw > w - 2;
        ctx.textAlign = flip ? "right" : "left";
        ctx.fillText(cfg.threshold.label, flip ? x - 5 : x + 5, T - 12);
      }

      rows.forEach(function (r, i) {
        const y = T + i * slot + (slot - bh) / 2;
        const col = colorFor(r.value);
        const prog = stagger(i, n, p, 0.05);
        /* piste */
        ctx.fillStyle = "#F4F8FE";
        rightRect(ctx, L, y, pw, bh, 4);
        ctx.fill();
        /* barre */
        const bw = (r.value / max) * pw * prog;
        ctx.fillStyle = st.hover === i ? lighten(col, 0.2) : col;
        rightRect(ctx, L, y, Math.max(1, bw), bh, 4);
        ctx.fill();
        /* drapeau + pays */
        ctx.font = FONT(600, 11);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#334155";
        const name = r.label.length > 13 ? r.label.slice(0, 12) + "…" : r.label;
        ctx.fillText((r.flag || "") + " " + name, 4, y + bh / 2);
        /* valeur */
        if (prog > 0.55) {
          ctx.font = FONT(800, 11);
          ctx.fillStyle = col;
          ctx.textAlign = "left";
          ctx.fillText(fmt(r.value), L + (r.value / max) * pw + 7, y + bh / 2);
        }
      });
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const rows = cfg.rows, n = rows.length;
      const T = 20, B = 8;
      const ph = canvas.clientHeight - T - B;
      const slot = ph / n;
      const i = Math.floor((my - T) / slot);
      if (i < 0 || i >= n) { st.hover = -1; hideTip(); ctrl.repaint(); return; }
      st.hover = i;
      ctrl.repaint();
      const r = rows[i];
      showTip(
        '<div class="wsv-tip-t">' + r.flag + " " + r.label + "</div>" +
        '<div class="wsv-tip-r"><i style="background:' + colorFor(r.value) + '"></i>' + cfg.title +
        "<b>" + fmt(r.value) + "</b></div>" +
        '<div class="wsv-tip-s">Rang régional : ' + r.rank + "/" + cfg.total +
        (cfg.note ? " · " + cfg.note : "") + "</div>", ev
      );
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 3 — Radar / spider chart                                              */
  /* ===================================================================== */
  function radar(canvas, cfg) {
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const cx = w / 2, cy = h / 2 + 4;
      const R = Math.min(w, h) / 2 - 42;
      const axes = cfg.axes, n = axes.length;
      const ang = (i) => -Math.PI / 2 + (i / n) * Math.PI * 2;
      const pt = (i, v) => ({ x: cx + Math.cos(ang(i)) * (v / 100) * R, y: cy + Math.sin(ang(i)) * (v / 100) * R });

      for (let lv = 1; lv <= 5; lv++) {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const q = pt(i % n, (lv / 5) * 100);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        }
        ctx.closePath();
        ctx.strokeStyle = lv === 5 ? "rgba(148,163,184,.45)" : "rgba(148,163,184,.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.font = FONT(700, 10.5);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < n; i++) {
        const q = pt(i, 100);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = "rgba(148,163,184,.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        const lp = pt(i, 120);
        const a = ang(i);
        ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? "center" : (Math.cos(a) > 0 ? "left" : "right");
        ctx.fillStyle = "#475569";
        /* on borne le libellé dans le canvas pour ne jamais le couper */
        const short = axes[i].length > 15 ? axes[i].slice(0, 14) + "…" : axes[i];
        const tw2 = ctx.measureText(short).width;
        let lx = lp.x;
        if (ctx.textAlign === "left") lx = Math.min(lx, w - tw2 - 2);
        if (ctx.textAlign === "right") lx = Math.max(lx, tw2 + 2);
        ctx.fillText(short, lx, lp.y);
      }

      if (cfg.benchmark) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const q = pt(i % n, cfg.benchmark[i % n]);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        }
        ctx.closePath();
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }

      cfg.series.forEach(function (s, si) {
        const prog = stagger(si, cfg.series.length, p, 0.16);
        if (prog <= 0) return;
        const vals = s.values.map(function (v, i) {
          const p0 = { x: cx, y: cy }, p1 = pt(i, v);
          return { x: p0.x + (p1.x - p0.x) * prog, y: p0.y + (p1.y - p0.y) * prog };
        });
        ctx.beginPath();
        vals.forEach(function (q, i) { i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
        ctx.closePath();
        ctx.fillStyle = rgba(s.color, 0.18);
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.stroke();
        vals.forEach(function (q) {
          ctx.beginPath();
          ctx.arc(q.x, q.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
        });
      });

      if (cfg.center) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#94A3B8";
        ctx.font = FONT(600, 9);
        ctx.fillText(cfg.center.label, cx, cy - 24);
        ctx.fillStyle = "#0066CC";
        ctx.font = FONT(900, 20);
        ctx.fillText(cfg.center.value, cx, cy + 2);
      }
    };
    return mount(canvas, cfg, draw);
  }

  /* ===================================================================== */
  /* 4 — Double aire mensuelle + bande de soudure                          */
  /* ===================================================================== */
  function dualArea(canvas, cfg) {
    const st = { hover: -1 };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const P = { l: 38, r: 12, t: 22, b: 24 };
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const labels = cfg.labels;
      const all = cfg.series.reduce(function (a, s) { return a.concat(s.data); }, []);
      const yMin = Math.floor((Math.min.apply(null, all) - 8) / 10) * 10;
      const yMax = Math.ceil((Math.max.apply(null, all) + 10) / 10) * 10;
      const X = (i) => P.l + (i / (labels.length - 1)) * pw;
      const Y = (v) => P.t + ph - ((v - yMin) / (yMax - yMin)) * ph;

      ctx.font = FONT(500, 10);
      ctx.fillStyle = "#94A3B8";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      niceTicks(yMin, yMax, 4).forEach(function (v) {
        const y = Y(v);
        ctx.strokeStyle = "rgba(148,163,184,.18)";
        ctx.beginPath();
        ctx.moveTo(P.l, y);
        ctx.lineTo(w - P.r, y);
        ctx.stroke();
        ctx.fillText(Math.round(v), P.l - 6, y);
      });
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      labels.forEach(function (lb, i) { ctx.fillText(lb, X(i), P.t + ph + 7); });

      if (cfg.band) {
        const step = pw / (labels.length - 1);
        const x0 = X(cfg.band.from) - step / 2;
        const x1 = X(cfg.band.to) + step / 2;
        ctx.fillStyle = "#FFF7ED";
        ctx.fillRect(x0, P.t, x1 - x0, ph);
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x0, P.t);
        ctx.lineTo(x1, P.t);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#C2410C";
        ctx.font = FONT(700, 9.5);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(cfg.band.label, x0 + 6, P.t + 4);
      }

      cfg.series.forEach(function (s) {
        const pts = s.data.map(function (v, i) { return { x: X(i), y: Y(v) }; });
        const prog = clamp(p, 0, 1);
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l - 1, P.t - 8, pw * prog + 2, ph + 16);
        ctx.clip();
        const g = ctx.createLinearGradient(0, P.t, 0, P.t + ph);
        g.addColorStop(0, rgba(s.color, s.fill));
        g.addColorStop(1, rgba(s.color, 0.01));
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.lineTo(pts[pts.length - 1].x, P.t + ph);
        ctx.lineTo(pts[0].x, P.t + ph);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width || 2.4;
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      });

      if (cfg.peak) {
        const s = cfg.series[1] || cfg.series[0];
        const i = cfg.peak.index;
        const x = X(i), y = Y(s.data[i]);
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = rgba("#0066CC", 0.15);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#0066CC";
        ctx.fill();
        const label = cfg.peak.label;
        ctx.font = FONT(800, 10);
        const tw = ctx.measureText(label).width + 14;
        const bx = clamp(x - tw / 2, P.l, w - P.r - tw), by = y - 26;
        ctx.fillStyle = "#0066CC";
        roundRect(ctx, bx, by, tw, 18, 9);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bx + tw / 2, by + 9);
      }

      if (st.hover > -1) {
        const x = X(st.hover);
        ctx.save();
        ctx.strokeStyle = "rgba(100,116,139,.45)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, P.t);
        ctx.lineTo(x, P.t + ph);
        ctx.stroke();
        ctx.restore();
        cfg.series.forEach(function (s) {
          ctx.beginPath();
          ctx.arc(x, Y(s.data[st.hover]), 4, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        });
      }
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx) {
      const P = { l: 38, r: 12 };
      const pw = canvas.clientWidth - P.l - P.r;
      const i = Math.round(((mx - P.l) / pw) * (cfg.labels.length - 1));
      if (i < 0 || i >= cfg.labels.length) { st.hover = -1; hideTip(); ctrl.repaint(); return; }
      st.hover = i;
      ctrl.repaint();
      let html = '<div class="wsv-tip-t">' + cfg.labels[i] + " 2024</div>";
      cfg.series.forEach(function (s) {
        html += '<div class="wsv-tip-r"><i style="background:' + s.color + '"></i>' + s.name + "<b>" + s.data[i] + "</b></div>";
      });
      const d = cfg.series[1].data[i] - cfg.series[0].data[i];
      html += '<div class="wsv-tip-s">Variation : ' + (d > 0 ? "+" : "") + d + " pts vs 2023</div>";
      showTip(html, ev);
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 5 — Donut avancé                                                      */
  /* ===================================================================== */
  function donut(canvas, cfg) {
    const st = { hover: -1 };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) / 2 - 10, th = cfg.thickness || 32;
      const total = cfg.segments.reduce(function (a, s) { return a + s.value; }, 0);
      /* entrée : rotation de 360° jusqu'à la position finale */
      let a0 = -Math.PI / 2 + (1 - p) * Math.PI * 2;
      cfg.segments.forEach(function (s, i) {
        const ang = (s.value / total) * Math.PI * 2;
        const off = st.hover === i ? 6 : 0;
        const mx = cx + Math.cos(a0 + ang / 2) * off, my = cy + Math.sin(a0 + ang / 2) * off;
        ctx.beginPath();
        ctx.arc(mx, my, R - th / 2, a0, a0 + ang);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = th;
        ctx.stroke();
        a0 += ang;
      });
      if (cfg.center) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#94A3B8";
        ctx.font = FONT(600, 10);
        ctx.fillText(cfg.center.top, cx, cy - 18);
        ctx.fillStyle = "#0066CC";
        ctx.font = FONT(900, 26);
        ctx.fillText(cfg.center.value, cx, cy + 2);
        ctx.fillStyle = "#94A3B8";
        ctx.font = FONT(500, 10);
        ctx.fillText(cfg.center.bottom, cx, cy + 22);
      }
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
      const R = Math.min(canvas.clientWidth, canvas.clientHeight) / 2 - 10, th = cfg.thickness || 32;
      const dx = mx - cx, dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > R || dist < R - th) { st.hover = -1; hideTip(); ctrl.repaint(); return; }
      let a = Math.atan2(dy, dx) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      const total = cfg.segments.reduce(function (x, s) { return x + s.value; }, 0);
      let acc = 0, idx = -1;
      for (let i = 0; i < cfg.segments.length; i++) {
        acc += (cfg.segments[i].value / total) * Math.PI * 2;
        if (a <= acc) { idx = i; break; }
      }
      if (idx < 0) idx = cfg.segments.length - 1;
      st.hover = idx;
      ctrl.repaint();
      const s = cfg.segments[idx];
      showTip('<div class="wsv-tip-t"><i style="background:' + s.color + '"></i>' + s.label + "</div>" +
        '<div class="wsv-tip-r">Prévalence<b>' + s.value + " %</b></div>" +
        '<div class="wsv-tip-s">' + s.children + " d'enfants concernés</div>", ev);
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 6 — Bulles (PIB vs nutrition) + régression + zoom/pan                 */
  /* ===================================================================== */
  function bubble(canvas, cfg) {
    const st = { hover: -1, k: 1, ox: 0, oy: 0 };
    const P = { l: 52, r: 18, t: 18, b: 40 };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const x0 = cfg.xDomain[0], x1 = cfg.xDomain[1], y0 = cfg.yDomain[0], y1 = cfg.yDomain[1];
      const K = st.k;
      const X = (v) => P.l + st.ox + ((v - x0) / (x1 - x0)) * pw * K;
      const Y = (v) => P.t + ph - st.oy - ((v - y0) / (y1 - y0)) * ph * K;

      if (cfg.quadrants) {
        cfg.quadrants.forEach(function (q) {
          const qx0 = clamp(X(q.x0), P.l, P.l + pw), qx1 = clamp(X(q.x1), P.l, P.l + pw);
          const qy0 = clamp(Y(q.y1), P.t, P.t + ph), qy1 = clamp(Y(q.y0), P.t, P.t + ph);
          ctx.fillStyle = q.color;
          ctx.fillRect(qx0, qy0, qx1 - qx0, qy1 - qy0);
          ctx.fillStyle = "rgba(15,23,42,.35)";
          ctx.font = FONT(700, 9);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(q.label, (qx0 + qx1) / 2, (qy0 + qy1) / 2);
        });
      }

      ctx.font = FONT(500, 10);
      ctx.fillStyle = "#94A3B8";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      niceTicks(y0, y1, 5).forEach(function (v) {
        const y = Y(v);
        if (y < P.t - 2 || y > P.t + ph + 2) return;
        ctx.strokeStyle = "rgba(148,163,184,.20)";
        ctx.beginPath();
        ctx.moveTo(P.l, y);
        ctx.lineTo(P.l + pw, y);
        ctx.stroke();
        ctx.fillText(v + "%", P.l - 6, y);
      });
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(x0, x1, 5).forEach(function (v) {
        const x = X(v);
        if (x < P.l - 2 || x > P.l + pw + 2) return;
        ctx.fillText(v + "$", x, P.t + ph + 7);
      });
      ctx.fillStyle = "#64748B";
      ctx.font = FONT(700, 10);
      ctx.textAlign = "center";
      ctx.fillText(cfg.xLabel, P.l + pw / 2, h - 12);
      ctx.save();
      ctx.translate(13, P.t + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(cfg.yLabel, 0, 0);
      ctx.restore();

      /* régression tracée après les bulles */
      if (cfg.regression) {
        const rg = cfg.regression;
        const yA = rg.a * x0 + rg.b, yB = rg.a * x1 + rg.b;
        const prog = clamp((p - 0.55) / 0.45, 0, 1);
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = "#0F172A";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(X(x0), Y(yA));
        ctx.lineTo(X(x0) + (X(x1) - X(x0)) * prog, Y(yA) + (Y(yB) - Y(yA)) * prog);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#0F172A";
        ctx.font = FONT(800, 10);
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("R² = " + rg.r2, P.l + pw - 4, P.t + 12);
      }

      cfg.points.forEach(function (pt, i) {
        const prog = easeOutBounce(stagger(i, cfg.points.length, p, 0.04));
        const r = pt.r * (st.hover === i ? 1.2 : 1) * (0.3 + 0.7 * prog);
        if (r <= 0.3) return;
        const x = X(pt.x), y = Y(pt.y);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(pt.color, st.hover === i ? 0.55 : 0.38);
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = pt.color;
        ctx.stroke();
        ctx.fillStyle = "#1E293B";
        ctx.font = FONT(700, 9.5);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        if (pt.r > 12 || st.hover === i) ctx.fillText(pt.name, x, y + r + 3);
      });
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const pw = canvas.clientWidth - P.l - P.r, ph = canvas.clientHeight - P.t - P.b;
      const x0 = cfg.xDomain[0], x1 = cfg.xDomain[1], y0 = cfg.yDomain[0], y1 = cfg.yDomain[1];
      const X = (v) => P.l + st.ox + ((v - x0) / (x1 - x0)) * pw * st.k;
      const Y = (v) => P.t + ph - st.oy - ((v - y0) / (y1 - y0)) * ph * st.k;
      let idx = -1;
      cfg.points.forEach(function (pt, i) {
        const d = Math.hypot(mx - X(pt.x), my - Y(pt.y));
        if (d < pt.r + 6) idx = i;
      });
      st.hover = idx;
      ctrl.repaint();
      if (idx < 0) { hideTip(); return; }
      const pt = cfg.points[idx];
      showTip('<div class="wsv-tip-t">' + pt.flag + " " + pt.name + "</div>" +
        '<div class="wsv-tip-r">PIB / habitant<b>' + pt.x + " $</b></div>" +
        '<div class="wsv-tip-r">Stunting<b>' + pt.y + " %</b></div>" +
        '<div class="wsv-tip-r">Enfants &lt; 5 ans<b>' + pt.popLabel + "</b></div>" +
        '<div class="wsv-tip-s">Sous-région : ' + pt.subregion + "</div>", ev);
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    canvas.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      const r = canvas.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      const pw = canvas.clientWidth - P.l - P.r, ph = canvas.clientHeight - P.t - P.b;
      const fx = (mx - P.l - st.ox) / (pw * st.k), fy = (P.t + ph - st.oy - my) / (ph * st.k);
      st.k = clamp(st.k * (ev.deltaY < 0 ? 1.12 : 0.89), 1, 4);
      st.ox = mx - P.l - fx * pw * st.k;
      st.oy = P.t + ph - my - fy * ph * st.k;
      st.ox = clamp(st.ox, -pw * (st.k - 1), 0);
      st.oy = clamp(st.oy, -ph * (st.k - 1), 0);
      ctrl.repaint();
    }, { passive: false });
    let drag = null;
    canvas.addEventListener("mousedown", function (ev) { drag = { x: ev.clientX, y: ev.clientY, ox: st.ox, oy: st.oy }; canvas.style.cursor = "grabbing"; });
    root.addEventListener("mouseup", function () { drag = null; canvas.style.cursor = "grab"; });
    canvas.addEventListener("mousemove", function (ev) {
      if (!drag) return;
      const pw = canvas.clientWidth - P.l - P.r, ph = canvas.clientHeight - P.t - P.b;
      st.ox = clamp(drag.ox + (ev.clientX - drag.x), -pw * (st.k - 1), 0);
      st.oy = clamp(drag.oy - (ev.clientY - drag.y), -ph * (st.k - 1), 0);
      ctrl.repaint();
    });
    canvas.style.cursor = "grab";
    ctrl.reset = function () { st.k = 1; st.ox = 0; st.oy = 0; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 7 — Waterfall horizontal                                              */
  /* ===================================================================== */
  function waterfall(canvas, cfg) {
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const rows = [cfg.start].concat(cfg.steps).concat([cfg.end]);
      const n = rows.length;
      const L = 176, R = 44, T = 12, B = 26;
      const pw = w - L - R, ph = h - T - B;
      const slot = ph / n, bh = Math.min(24, slot - 9);
      const max = 50;
      const X = (v) => L + (v / max) * pw;

      ctx.save();
      ctx.strokeStyle = "rgba(100,116,139,.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(0), T - 4);
      ctx.lineTo(X(0), T + ph);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#94A3B8";
      ctx.font = FONT(600, 9.5);
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("0 %", X(0) - 4, T + ph + 6);

      let cum = 0;
      const rects = rows.map(function (r, i) {
        const isEnd = i === n - 1, isStart = i === 0;
        let from, to;
        if (isStart) { from = 0; to = r.value; cum = r.value; }
        else if (isEnd) { from = 0; to = r.value; }
        else { from = cum; to = cum + r.value; cum = to; }
        return { from: from, to: to, r: r, i: i };
      });

      rects.forEach(function (rc) {
        const prog = stagger(rc.i, n, p, 0.09);
        if (prog <= 0) return;
        const y = T + rc.i * slot + (slot - bh) / 2;
        /* les barres tombent du haut vers le bas */
        const drop = (1 - prog) * -16;
        const x0 = X(Math.min(rc.from, rc.to)), x1 = X(Math.max(rc.from, rc.to));
        const bw = Math.max(2, x1 - x0);
        const color = rc.i === 0 ? "#EF4444" : (rc.i === n - 1 ? "#0066CC" : "#10B981");
        ctx.fillStyle = color;
        roundRect(ctx, x0, y + drop, bw, bh, 4);
        ctx.fill();
        const val = rc.i === 0 || rc.i === n - 1 ? rc.r.value + "%" : (rc.r.value > 0 ? "+" : "") + rc.r.value + "%";
        ctx.fillStyle = color;
        ctx.font = FONT(800, 10.5);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(val, x1 + 6, y + bh / 2 + drop);
        ctx.fillStyle = "#334155";
        ctx.font = FONT(600, 10.5);
        ctx.textAlign = "right";
        const lb = rc.r.label.length > 28 ? rc.r.label.slice(0, 27) + "…" : rc.r.label;
        ctx.fillText(lb, L - 10, y + bh / 2 + drop);
        if (rc.i < n - 1) {
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "rgba(100,116,139,.5)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x1, y + bh + drop);
          ctx.lineTo(x1, y + slot + drop);
          ctx.stroke();
          ctx.restore();
        }
      });
    };
    return mount(canvas, cfg, draw);
  }

  /* ===================================================================== */
  /* 8 — Heatmap pays × indicateurs                                         */
  /* ===================================================================== */
  function heatmap(canvas, cfg) {
    const st = { hover: null };
    const colorFor = function (score) {
      if (score <= 25) return ["#DCFCE7", "#166534"];
      if (score <= 50) return ["#FEF3C7", "#92400E"];
      if (score <= 75) return ["#FED7AA", "#9A3412"];
      if (score <= 100) return ["#FECACA", "#991B1B"];
      return ["#DC2626", "#FFFFFF"];
    };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const L = 128, T = 34, R = 8, B = 8;
      const cols = cfg.indicators.length;
      const rows = cfg.rows.length + 1;
      const cw = (w - L - R) / cols;
      const ch = (h - T - B) / rows;

      ctx.font = FONT(700, 9.5);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      cfg.indicators.forEach(function (ind, j) {
        const x = L + j * cw + cw / 2;
        ctx.fillStyle = "#475569";
        ctx.fillText(ind.label, x, T - 18);
        ctx.fillStyle = "#94A3B8";
        ctx.font = FONT(600, 8.5);
        ctx.fillText(ind.thresholdLabel, x, T - 6);
        ctx.font = FONT(700, 9.5);
      });

      const my0 = T;
      ctx.fillStyle = "rgba(0,102,204,.06)";
      ctx.fillRect(L, my0, w - L - R, ch);
      ctx.fillStyle = "#0066CC";
      ctx.font = FONT(800, 10);
      ctx.textAlign = "left";
      ctx.fillText("Moyenne régionale", 6, my0 + ch / 2);
      cfg.regional.forEach(function (cell, j) {
        const cc = colorFor(cell.score);
        ctx.fillStyle = cc[0];
        ctx.fillRect(L + j * cw + 1, my0 + 2, cw - 2, ch - 4);
        ctx.fillStyle = cc[1];
        ctx.font = FONT(800, 9.5);
        ctx.textAlign = "center";
        ctx.fillText(cell.text, L + j * cw + cw / 2, my0 + ch / 2);
      });

      /* cellules : apparition ligne par ligne (30 ms de décalage) */
      cfg.rows.forEach(function (row, i) {
        const prog = stagger(i, cfg.rows.length, p, 0.03);
        const y = T + (i + 1) * ch;
        ctx.globalAlpha = 0.15 + 0.85 * prog;
        ctx.fillStyle = "#334155";
        ctx.font = FONT(600, 10);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(row.flag + " " + row.name, 6, y + ch / 2);
        row.cells.forEach(function (cell, j) {
          const cc = colorFor(cell.score);
          const hovered = st.hover && st.hover.r === i && st.hover.c === j;
          ctx.fillStyle = cc[0];
          ctx.fillRect(L + j * cw + 1, y + 2, cw - 2, ch - 4);
          if (hovered) {
            ctx.fillStyle = "rgba(255,255,255,.35)";
            ctx.fillRect(L + j * cw + 1, y + 2, cw - 2, ch - 4);
          }
          ctx.fillStyle = cc[1];
          ctx.font = FONT(700, 9.5);
          ctx.textAlign = "center";
          ctx.fillText(cell.text, L + j * cw + cw / 2, y + ch / 2);
        });
        ctx.globalAlpha = 1;
      });
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const L = 128, T = 34, R = 8, B = 8;
      const cols = cfg.indicators.length, rows = cfg.rows.length + 1;
      const cw = (canvas.clientWidth - L - R) / cols;
      const ch = (canvas.clientHeight - T - B) / rows;
      const j = Math.floor((mx - L) / cw), i = Math.floor((my - T) / ch) - 1;
      if (i < 0 || i >= cfg.rows.length || j < 0 || j >= cols) {
        if (st.hover) { st.hover = null; ctrl.repaint(); hideTip(); }
        return;
      }
      st.hover = { r: i, c: j };
      ctrl.repaint();
      const row = cfg.rows[i], ind = cfg.indicators[j], cell = row.cells[j];
      showTip(
        '<div class="wsv-tip-t">' + row.flag + " " + row.name + " · " + ind.label + "</div>" +
        '<div class="wsv-tip-r">Valeur<b>' + cell.text + "</b></div>" +
        '<div class="wsv-tip-r">Rang régional<b>' + cell.rank + "/" + (cfg.total || cfg.rows.length) + "</b></div>" +
        '<div class="wsv-tip-r">' + ind.thresholdLabel + "</div>" +
        '<div class="wsv-tip-s">STATUT : ' + cell.status + "</div>", ev
      );
    });
    canvas.__hoverClear = function () { st.hover = null; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 9 — Barres horizontales groupées (ANJE)                               */
  /* ===================================================================== */
  function groupedHBar(canvas, cfg) {
    const st = { hover: null };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const L = 176, R = 30, T = 8, B = 8;
      const pw = w - L - R, ph = h - T - B;
      const n = cfg.indicators.length, m = cfg.countries.length;
      const slot = ph / n;
      const bh = Math.min(11, (slot - 12) / m);
      const max = 100;
      const X = (v) => L + (v / max) * pw;

      cfg.indicators.forEach(function (ind, i) {
        const gy = T + i * slot;
        ctx.fillStyle = "#334155";
        ctx.font = FONT(700, 10);
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        const lb = ind.label.length > 28 ? ind.label.slice(0, 27) + "…" : ind.label;
        ctx.fillText(lb, L - 10, gy + slot / 2 - 5);
        ctx.fillStyle = "#94A3B8";
        ctx.font = FONT(600, 8.5);
        ctx.fillText("Objectif " + ind.objective + "%", L - 10, gy + slot / 2 + 6);
        ctx.fillStyle = "#F7FAFF";
        ctx.fillRect(L, gy + 4, pw, slot - 8);
        cfg.countries.forEach(function (co, k) {
          const v = ind.values[co.code];
          const y = gy + 6 + k * (bh + 1.5);
          const prog = stagger(i * m + k, n * m, p, 0.03);
          ctx.fillStyle = st.hover && st.hover.i === i && st.hover.k === k ? lighten(co.color, 0.2) : co.color;
          rightRect(ctx, L, y, Math.max(1, (v / max) * pw * prog), bh, 3);
          ctx.fill();
        });
        ctx.save();
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(X(ind.objective), gy + 2);
        ctx.lineTo(X(ind.objective), gy + slot - 2);
        ctx.stroke();
        ctx.restore();
      });
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const L = 176, R = 30, T = 8, B = 8;
      const ph = canvas.clientHeight - T - B;
      const n = cfg.indicators.length, m = cfg.countries.length;
      const slot = ph / n;
      const bh = Math.min(11, (slot - 12) / m);
      const i = Math.floor((my - T) / slot);
      if (i < 0 || i >= n) { st.hover = null; hideTip(); ctrl.repaint(); return; }
      const gy = T + i * slot;
      const k = Math.floor((my - gy - 6) / (bh + 1.5));
      if (k < 0 || k >= m) { st.hover = null; hideTip(); ctrl.repaint(); return; }
      st.hover = { i: i, k: k };
      ctrl.repaint();
      const ind = cfg.indicators[i], co = cfg.countries[k];
      const v = ind.values[co.code];
      const gap = v - ind.objective;
      showTip('<div class="wsv-tip-t">' + ind.label + "</div>" +
        '<div class="wsv-tip-r"><i style="background:' + co.color + '"></i>' + co.name + "<b>" + v + "%</b></div>" +
        '<div class="wsv-tip-r">Objectif OMS<b>' + ind.objective + "%</b></div>" +
        '<div class="wsv-tip-s">Écart : ' + (gap > 0 ? "+" : "") + gap + " pts" + (ind.invert ? " (à réduire)" : "") + "</div>", ev);
    });
    canvas.__hoverClear = function () { st.hover = null; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 10 — Aires empilées (anémie 2017-2024)                                */
  /* ===================================================================== */
  function stackedArea(canvas, cfg) {
    const st = { hover: -1 };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const P = { l: 38, r: 12, t: 16, b: 24 };
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const years = cfg.years;
      const sums = years.map(function (_, i) {
        return cfg.series.reduce(function (a, s) { return a + s.data[i]; }, 0);
      });
      const yMax = Math.max.apply(null, sums) * 1.08;
      const X = (i) => P.l + (i / (years.length - 1)) * pw;
      const Y = (v) => P.t + ph - (v / yMax) * ph;

      ctx.font = FONT(500, 10);
      ctx.fillStyle = "#94A3B8";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      niceTicks(0, yMax, 5).forEach(function (v) {
        const y = Y(v);
        ctx.strokeStyle = "rgba(148,163,184,.18)";
        ctx.beginPath();
        ctx.moveTo(P.l, y);
        ctx.lineTo(w - P.r, y);
        ctx.stroke();
        ctx.fillText(Math.round(v) + "%", P.l - 6, y);
      });
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      years.forEach(function (y, i) { ctx.fillText(y, X(i), P.t + ph + 7); });

      if (cfg.objective) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#0066CC";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(P.l, Y(cfg.objective.value));
        ctx.lineTo(w - P.r, Y(cfg.objective.value));
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#0066CC";
        ctx.font = FONT(700, 9);
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(cfg.objective.label, P.l + 4, Y(cfg.objective.value) - 3);
      }

      let base = years.map(function () { return 0; });
      cfg.series.forEach(function (s, si) {
        const pts = s.data.map(function (v, i) { return { x: X(i), y: Y(base[i] + v) }; });
        const prog = stagger(si, cfg.series.length, p, 0.16);
        if (prog <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(P.l - 1, P.t - 6, pw * prog + 2, ph + 12);
        ctx.clip();
        const g = ctx.createLinearGradient(0, P.t, 0, P.t + ph);
        g.addColorStop(0, rgba(s.color, 0.7));
        g.addColorStop(1, rgba(s.color, 0.3));
        ctx.beginPath();
        smooth(ctx, pts);
        for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(X(i), Y(base[i]));
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        smooth(ctx, pts);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
        base = base.map(function (b, i) { return b + s.data[i]; });
      });

      if (st.hover > -1) {
        const x = X(st.hover);
        ctx.save();
        ctx.strokeStyle = "rgba(100,116,139,.5)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, P.t);
        ctx.lineTo(x, P.t + ph);
        ctx.stroke();
        ctx.restore();
        cfg.series.forEach(function (s) {
          ctx.beginPath();
          ctx.arc(x, Y(s.data[st.hover]), 3.5, 0, Math.PI * 2);
          ctx.fillStyle = s.color;
          ctx.fill();
        });
      }
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx) {
      const P = { l: 38, r: 12 };
      const pw = canvas.clientWidth - P.l - P.r;
      const i = Math.round(((mx - P.l) / pw) * (cfg.years.length - 1));
      if (i < 0 || i >= cfg.years.length) { st.hover = -1; hideTip(); ctrl.repaint(); return; }
      st.hover = i;
      ctrl.repaint();
      let html = '<div class="wsv-tip-t">' + cfg.years[i] + "</div>";
      cfg.series.forEach(function (s) {
        html += '<div class="wsv-tip-r"><i style="background:' + s.color + '"></i>' + s.name + "<b>" + s.data[i] + "%</b></div>";
      });
      showTip(html, ev);
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 11 — Diagramme polaire / rose                                         */
  /* ===================================================================== */
  function polar(canvas, cfg) {
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const cx = w / 2, cy = h / 2 + 2;
      const R = Math.min(w, h) / 2 - 24;
      const max = Math.max.apply(null, cfg.series[cfg.series.length - 1].data) * 1.12;
      /* rotation d'entrée */
      const rot = -(1 - p) * Math.PI * 0.5;
      const step = (Math.PI * 2) / cfg.series[0].data.length;

      ctx.strokeStyle = "rgba(148,163,184,.25)";
      ctx.lineWidth = 1;
      [0.33, 0.66, 1].forEach(function (f) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.stroke();
      });

      cfg.series.forEach(function (s) {
        ctx.beginPath();
        s.data.forEach(function (v, i) {
          const r = (v / max) * R;
          const a = rot + i * step;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, rgba(s.color, s.alpha));
        g.addColorStop(1, rgba(s.color, s.alpha * 0.5));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = rgba(s.color, Math.min(1, s.alpha + 0.35));
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });

      const cur = cfg.series[cfg.series.length - 1];
      cur.data.forEach(function (v, i) {
        const r = (v / max) * R;
        const a = rot + i * step;
        const hot = cfg.highlight && cfg.highlight.indexOf(i) > -1;
        const col = hot ? "#EF4444" : (v > 150 ? "#EF4444" : v > 115 ? "#F59E0B" : "#10B981");
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, a, a + step);
        ctx.closePath();
        ctx.fillStyle = rgba(col, 0.55);
        ctx.fill();
        ctx.strokeStyle = rgba(col, 0.9);
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      ctx.font = FONT(700, 9);
      ctx.fillStyle = "#475569";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      cfg.labels.forEach(function (lb, i) {
        const a = rot + i * step + step / 2;
        ctx.fillText(lb, cx + Math.cos(a) * (R + 13), cy + Math.sin(a) * (R + 13));
      });
    };
    return mount(canvas, cfg, draw);
  }

  /* ===================================================================== */
  /* 12 — Nuage de points WASH × stunting (4 quadrants)                    */
  /* ===================================================================== */
  function scatter(canvas, cfg) {
    const st = { hover: -1 };
    const P = { l: 46, r: 16, t: 18, b: 38 };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const x0 = cfg.xDomain[0], x1 = cfg.xDomain[1], y0 = cfg.yDomain[0], y1 = cfg.yDomain[1];
      const X = (v) => P.l + ((v - x0) / (x1 - x0)) * pw;
      const Y = (v) => P.t + ph - ((v - y0) / (y1 - y0)) * ph;

      cfg.quadrants.forEach(function (q) {
        const qx0 = clamp(X(q.x0), P.l, P.l + pw), qx1 = clamp(X(q.x1), P.l, P.l + pw);
        const qy0 = clamp(Y(q.y1), P.t, P.t + ph), qy1 = clamp(Y(q.y0), P.t, P.t + ph);
        ctx.fillStyle = q.color;
        ctx.fillRect(qx0, qy0, qx1 - qx0, qy1 - qy0);
        ctx.fillStyle = q.ink || "rgba(15,23,42,.32)";
        ctx.font = FONT(700, 8.5);
        if (cfg.quadCorner) {
          /* coin extérieur du quadrant : zone généralement vide de points */
          const left = q.x0 <= x0, bottom = q.y0 <= y0;
          ctx.textAlign = left ? "left" : "right";
          ctx.textBaseline = bottom ? "bottom" : "top";
          ctx.fillText(q.label, left ? qx0 + 7 : qx1 - 7, bottom ? qy1 - 6 : qy0 + 6);
        } else {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(q.label, (qx0 + qx1) / 2, (qy0 + qy1) / 2);
        }
      });

      ctx.font = FONT(500, 9.5);
      ctx.fillStyle = "#94A3B8";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      niceTicks(y0, y1, 4).forEach(function (v) {
        const y = Y(v);
        ctx.strokeStyle = "rgba(148,163,184,.18)";
        ctx.beginPath();
        ctx.moveTo(P.l, y);
        ctx.lineTo(P.l + pw, y);
        ctx.stroke();
        ctx.fillText(v + "%", P.l - 5, y);
      });
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(x0, x1, cfg.xTicks || 4).forEach(function (v) { ctx.fillText(v + "%", X(v), P.t + ph + 6); });
      ctx.fillStyle = "#64748B";
      ctx.font = FONT(700, 9.5);
      ctx.fillText(cfg.xLabel, P.l + pw / 2, h - 11);
      if (cfg.yLabel) {
        ctx.save();
        ctx.translate(9, P.t + ph / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cfg.yLabel, 0, 0);
        ctx.restore();
      }

      if (cfg.regression) {
        const rg = cfg.regression;
        const yA = rg.a * x0 + rg.b, yB = rg.a * x1 + rg.b;
        const prog = clamp((p - 0.5) / 0.5, 0, 1);
        ctx.save();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = "#0F172A";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(X(x0), Y(yA));
        ctx.lineTo(X(x0) + (X(x1) - X(x0)) * prog, Y(yA) + (Y(yB) - Y(yA)) * prog);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#0F172A";
        ctx.font = FONT(800, 9.5);
        ctx.textAlign = "right";
        ctx.fillText("R² = " + rg.r2, P.l + pw - 3, P.t + 10);
      }

      cfg.points.forEach(function (pt, i) {
        const prog = clamp(stagger(i, cfg.points.length, p, 0.05), 0, 1);
        const r = pt.r * (st.hover === i ? 1.35 : 1) * (0.4 + 0.6 * prog);
        if (r <= 0.3) return;
        const x = X(pt.x), y = Y(pt.y);
        ctx.globalAlpha = pt.dim && st.hover !== i ? 0.22 : 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(pt.color, st.hover === i ? 0.6 : 0.45);
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = pt.color;
        ctx.stroke();
        if (st.hover === i || pt.big) {
          ctx.fillStyle = "#1E293B";
          ctx.font = FONT(700, 8.5);
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(pt.name, x, y + r + 2);
        }
        ctx.globalAlpha = 1;
      });
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const pw = canvas.clientWidth - P.l - P.r, ph = canvas.clientHeight - P.t - P.b;
      const X = (v) => P.l + ((v - cfg.xDomain[0]) / (cfg.xDomain[1] - cfg.xDomain[0])) * pw;
      const Y = (v) => P.t + ph - ((v - cfg.yDomain[0]) / (cfg.yDomain[1] - cfg.yDomain[0])) * ph;
      let idx = -1;
      cfg.points.forEach(function (pt, i) {
        if (Math.hypot(mx - X(pt.x), my - Y(pt.y)) < pt.r + 5) idx = i;
      });
      st.hover = idx;
      ctrl.repaint();
      if (idx < 0) { hideTip(); return; }
      const pt = cfg.points[idx];
      const f = cfg.fmt || function (v) { return v + "%"; };
      showTip('<div class="wsv-tip-t">' + pt.flag + " " + pt.name + "</div>" +
        '<div class="wsv-tip-r">' + (cfg.tipX || "Eau potable") + "<b>" + f(pt.x) + "</b></div>" +
        '<div class="wsv-tip-r">' + (cfg.tipY || "Stunting") + "<b>" + f(pt.y) + "</b></div>" +
        (pt.tip || "") +
        '<div class="wsv-tip-s">' + (pt.note || pt.subregion) + "</div>", ev);
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 13 — Timeline des 1000 jours                                          */
  /* ===================================================================== */
  function timeline(canvas, cfg) {
    const st = { hover: null };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const L = 30, R = 30;
      const pw = w - L - R;
      const axisY = 84;
      const X = (d) => L + (d / cfg.maxDay) * pw;

      /* zone dorée "fenêtre des 1000 jours" */
      const g = ctx.createLinearGradient(L, 0, L + pw, 0);
      g.addColorStop(0, "rgba(245,158,11,.18)");
      g.addColorStop(0.5, "rgba(245,158,11,.08)");
      g.addColorStop(1, "rgba(245,158,11,.18)");
      ctx.fillStyle = g;
      ctx.fillRect(L, axisY - 30, pw * p, 60);
      ctx.fillStyle = "#B45309";
      ctx.font = FONT(800, 9);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("Fenêtre des 1000 jours", L + pw / 2, 6);

      /* axe */
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(L, axisY);
      ctx.lineTo(L + pw * p, axisY);
      ctx.stroke();

      /* graduations en jours, sous l'axe */
      ctx.font = FONT(600, 8.5);
      ctx.fillStyle = "#94A3B8";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      [0, 270, 450, 635, 1000].forEach(function (d) {
        const x = X(d);
        ctx.beginPath();
        ctx.moveTo(x, axisY - 4);
        ctx.lineTo(x, axisY + 4);
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillText(d + " j", x, axisY + 8);
      });

      /* interventions : points + libellés sur deux niveaux */
      cfg.interventions.forEach(function (iv, i) {
        const x = X(iv.day) * (0.02 + 0.98 * p);
        ctx.beginPath();
        ctx.arc(x, axisY + 28, 5, 0, Math.PI * 2);
        ctx.fillStyle = iv.color;
        ctx.fill();
        ctx.fillStyle = "#475569";
        ctx.font = FONT(700, 8.5);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const lb = iv.label.length > 19 ? iv.label.slice(0, 18) + "…" : iv.label;
        ctx.fillText(lb, clamp(x, L + 34, L + pw - 34), axisY + 38 + (i % 2) * 12);
      });

      /* jalons : titres sur deux niveaux pour éviter tout chevauchement */
      cfg.milestones.forEach(function (m, i) {
        const x = X(m.day) * (0.02 + 0.98 * p);
        const hov = st.hover === i;
        const lvl = i % 2;
        ctx.beginPath();
        ctx.arc(x, axisY, hov ? 9 : 7, 0, Math.PI * 2);
        ctx.fillStyle = hov ? "#0066CC" : "#fff";
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = "#0066CC";
        ctx.stroke();
        const tx = clamp(x, L + 32, L + pw - 32);
        ctx.fillStyle = "#0F172A";
        ctx.font = FONT(800, 9.5);
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(m.title, tx, axisY - 16 - lvl * 17);
        ctx.fillStyle = "#94A3B8";
        ctx.font = FONT(700, 8.5);
        ctx.fillText(m.short || m.label, tx, axisY - 27 - lvl * 17);
      });

      /* courbe d'impact sous la timeline */
      const baseY = h - 16, amp = 24;
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const d = t * cfg.maxDay;
        const x = L + t * pw;
        const impact = 0.2 * Math.exp(-Math.pow((d - 520) / 340, 2));
        pts.push({ x: x, y: baseY - amp * impact * p });
      }
      const gg = ctx.createLinearGradient(0, baseY - amp, 0, baseY);
      gg.addColorStop(0, "rgba(0,102,204,.35)");
      gg.addColorStop(1, "rgba(0,102,204,0)");
      ctx.beginPath();
      smooth(ctx, pts);
      ctx.lineTo(pts[pts.length - 1].x, baseY);
      ctx.lineTo(pts[0].x, baseY);
      ctx.closePath();
      ctx.fillStyle = gg;
      ctx.fill();
      ctx.beginPath();
      smooth(ctx, pts);
      ctx.strokeStyle = "#0066CC";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.font = FONT(700, 9);
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("Impact d'une intervention complète sur le stunting", L, baseY - amp - 2);
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const L = 30, R = 30;
      const pw = canvas.clientWidth - L - R;
      const axisY = 84;
      let idx = -1;
      cfg.milestones.forEach(function (m, i) {
        const x = L + (m.day / cfg.maxDay) * pw;
        if (Math.abs(mx - x) < 18 && Math.abs(my - axisY) < 26) idx = i;
      });
      if (idx === st.hover) return;
      st.hover = idx;
      ctrl.repaint();
      if (idx < 0) { hideTip(); return; }
      const m = cfg.milestones[idx];
      showTip('<div class="wsv-tip-t">' + m.title + " · " + m.label + "</div>" +
        '<div class="wsv-tip-s">' + m.detail + "</div>", ev);
    });
    canvas.__hoverClear = function () { st.hover = null; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* 14 — Jauges semi-circulaires multiples                                */
  /* ===================================================================== */
  function gauges(canvas, cfg) {
    const st = { hover: null };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const cols = 3, rows = Math.ceil(cfg.gauges.length / cols);
      const cw = w / cols, chh = h / rows;
      const obj = cfg.objective || 80;
      const col = (v) => (v < 50 ? "#EF4444" : v < 75 ? "#F59E0B" : "#10B981");
      cfg.gauges.forEach(function (g, i) {
        const cx = (i % cols) * cw + cw / 2;
        const cy = Math.floor(i / cols) * chh + chh / 2 + 6;
        const R = Math.min(cw, chh) / 2 - 20;
        const a0 = Math.PI, a1 = Math.PI * 2;
        const prog = stagger(i, cfg.gauges.length, p, 0.1);
        const hov = st.hover === i;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a1);
        ctx.strokeStyle = "#E8EEF7";
        ctx.lineWidth = 11;
        ctx.lineCap = "round";
        ctx.stroke();
        if (prog > 0) {
          const ang = a0 + (g.value / 100) * Math.PI * prog;
          ctx.beginPath();
          ctx.arc(cx, cy, R, a0, ang);
          ctx.strokeStyle = hov ? lighten(col(g.value), 0.2) : col(g.value);
          ctx.lineWidth = 11;
          ctx.stroke();
        }
        const oa = a0 + (obj / 100) * Math.PI;
        ctx.save();
        ctx.strokeStyle = "#0F172A";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(oa) * (R - 8), cy + Math.sin(oa) * (R - 8));
        ctx.lineTo(cx + Math.cos(oa) * (R + 8), cy + Math.sin(oa) * (R + 8));
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#0F172A";
        ctx.font = FONT(900, 17);
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(Math.round(g.value * prog) + "%", cx, cy - 2);
        ctx.fillStyle = "#64748B";
        ctx.font = FONT(600, 8.5);
        ctx.textBaseline = "top";
        const lb = g.label.length > 27 ? g.label.slice(0, 26) + "…" : g.label;
        ctx.fillText(lb, cx, cy + 10);
        ctx.fillStyle = "#94A3B8";
        ctx.font = FONT(600, 8);
        ctx.fillText("Objectif " + obj + "%", cx, cy + 22);
      });
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const cols = 3, rows = Math.ceil(cfg.gauges.length / cols);
      const cw = canvas.clientWidth / cols, chh = canvas.clientHeight / rows;
      const j = Math.floor(mx / cw), i = Math.floor(my / chh);
      const idx = i * cols + j;
      if (idx < 0 || idx >= cfg.gauges.length) { st.hover = null; hideTip(); ctrl.repaint(); return; }
      st.hover = idx;
      ctrl.repaint();
      const g = cfg.gauges[idx];
      const gap = g.value - (cfg.objective || 80);
      showTip('<div class="wsv-tip-t">' + g.label + "</div>" +
        '<div class="wsv-tip-r">Couverture<b>' + g.value + "%</b></div>" +
        '<div class="wsv-tip-r">Objectif OMS<b>' + (cfg.objective || 80) + "%</b></div>" +
        '<div class="wsv-tip-s">Écart : ' + (gap > 0 ? "+" : "") + gap + " pts · " + (gap < -25 ? "CRITIQUE" : gap < -5 ? "À renforcer" : "Conforme") + "</div>", ev);
    });
    canvas.__hoverClear = function () { st.hover = null; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* MNT 1 — Haltères (dumbbell) : écart femmes / hommes                   */
  /* cfg.rows = [{code, label, flag, a, b, mid, extra}] · a = hommes,      */
  /* b = femmes, mid = ensemble · cfg.means = {a, b} · cfg.focus = code    */
  /* ===================================================================== */
  const frNum = function (v, d) {
    const k = d === undefined ? 1 : d;
    return (Math.round(v * Math.pow(10, k)) / Math.pow(10, k)).toFixed(k).replace(".", ",");
  };

  function dumbbell(canvas, cfg) {
    const st = { hover: -1 };
    const L = 124, R = 48, T = 30, B = 20;
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const rows = cfg.rows, n = rows.length;
      const pw = w - L - R, ph = h - T - B;
      const slot = ph / Math.max(1, n);
      const max = cfg.max || 40;
      const X = (v) => L + (clamp(v, 0, max) / max) * pw;
      const ca = cfg.aColor || "#0066CC", cb = cfg.bColor || "#7C3AED";

      /* grille verticale + graduations */
      ctx.font = FONT(500, 9.5);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      niceTicks(0, max, 4).forEach(function (v) {
        const x = X(v);
        ctx.strokeStyle = "rgba(148,163,184,.20)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, T - 4);
        ctx.lineTo(x, T + ph);
        ctx.stroke();
        ctx.fillStyle = "#94A3B8";
        ctx.fillText(Math.round(v) + "%", x, T + ph + 5);
      });

      /* moyennes régionales (pointillés) */
      if (cfg.means) {
        [["a", ca, "right", cfg.aShort || "H"], ["b", cb, "left", cfg.bShort || "F"]].forEach(function (m) {
          const v = cfg.means[m[0]];
          if (v === undefined || v === null) return;
          const x = X(v);
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = rgba(m[1], 0.55);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x, T - 8);
          ctx.lineTo(x, T + ph);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = m[1];
          ctx.font = FONT(800, 9);
          ctx.textAlign = m[2];
          ctx.textBaseline = "bottom";
          ctx.fillText("Moy. " + m[3] + " " + frNum(v) + " %", x + (m[2] === "left" ? 4 : -4), T - 10);
        });
      }

      rows.forEach(function (r, i) {
        const y = T + i * slot + slot / 2;
        const prog = stagger(i, n, p, 0.03);
        const isFocus = !!cfg.focus && cfg.focus === r.code;
        const dim = !!cfg.focus && !isFocus && st.hover !== i;
        ctx.globalAlpha = dim ? 0.28 : 1;
        if (st.hover === i || isFocus) {
          ctx.fillStyle = isFocus ? "rgba(0,102,204,.09)" : "rgba(0,102,204,.05)";
          ctx.fillRect(0, y - slot / 2 + 1, w, slot - 2);
        }
        /* drapeau + pays */
        ctx.fillStyle = "#334155";
        ctx.font = FONT(isFocus ? 800 : 600, 10.5);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const name = r.label.length > 14 ? r.label.slice(0, 13) + "…" : r.label;
        ctx.fillText((r.flag ? r.flag + " " : "") + name, 4, y);

        /* les deux points partent de la valeur « ensemble » et s'écartent */
        const mid = r.mid !== undefined ? r.mid : (r.a + r.b) / 2;
        const xa = X(mid + (r.a - mid) * prog), xb = X(mid + (r.b - mid) * prog);
        const g = ctx.createLinearGradient(Math.min(xa, xb), 0, Math.max(xa, xb) + 1, 0);
        g.addColorStop(0, rgba(xa <= xb ? ca : cb, 0.45));
        g.addColorStop(1, rgba(xa <= xb ? cb : ca, 0.45));
        ctx.strokeStyle = g;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(xa, y);
        ctx.lineTo(xb, y);
        ctx.stroke();
        ctx.lineCap = "butt";
        /* repère « ensemble » */
        ctx.beginPath();
        ctx.arc(X(mid), y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "#0F172A";
        ctx.fill();
        const big = st.hover === i || isFocus;
        [[xa, ca], [xb, cb]].forEach(function (d) {
          ctx.beginPath();
          ctx.arc(d[0], y, big ? 6 : 5, 0, Math.PI * 2);
          ctx.fillStyle = d[1];
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
        });
        /* valeurs : la plus forte à droite, la plus faible à gauche */
        if (prog > 0.6) {
          const hiB = r.b >= r.a;
          ctx.font = FONT(800, 9.5);
          ctx.textBaseline = "middle";
          ctx.lineWidth = 3;
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#fff";
          ctx.fillStyle = hiB ? cb : ca;
          ctx.textAlign = "left";
          const tHi = frNum(Math.max(r.a, r.b)) + " %", tLo = frNum(Math.min(r.a, r.b));
          ctx.strokeText(tHi, Math.max(xa, xb) + 9, y);
          ctx.fillText(tHi, Math.max(xa, xb) + 9, y);
          ctx.fillStyle = hiB ? ca : cb;
          ctx.textAlign = "right";
          ctx.strokeText(tLo, Math.min(xa, xb) - 9, y);
          ctx.fillText(tLo, Math.min(xa, xb) - 9, y);
        }
        ctx.globalAlpha = 1;
      });
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx, my) {
      const n = cfg.rows.length;
      const slot = (canvas.clientHeight - T - B) / Math.max(1, n);
      const i = Math.floor((my - T) / slot);
      if (i < 0 || i >= n) {
        if (st.hover !== -1) { st.hover = -1; ctrl.repaint(); }
        hideTip();
        return;
      }
      if (st.hover !== i) { st.hover = i; ctrl.repaint(); }
      const r = cfg.rows[i];
      const ratio = r.a > 0 ? Math.max(r.a, r.b) / Math.min(r.a, r.b) : 0;
      showTip(
        '<div class="wsv-tip-t">' + (r.flag || "") + " " + r.label + "</div>" +
        '<div class="wsv-tip-r"><span><i style="background:' + (cfg.bColor || "#7C3AED") + '"></i>' + (cfg.bName || "Femmes") + "</span><b>" + frNum(r.b) + " %</b></div>" +
        '<div class="wsv-tip-r"><span><i style="background:' + (cfg.aColor || "#0066CC") + '"></i>' + (cfg.aName || "Hommes") + "</span><b>" + frNum(r.a) + " %</b></div>" +
        (r.mid !== undefined ? '<div class="wsv-tip-r"><span><i style="background:#0F172A"></i>' + (cfg.midName || "Ensemble") + "</span><b>" + frNum(r.mid) + " %</b></div>" : "") +
        '<div class="wsv-tip-s">Écart ' + (r.b >= r.a ? "F/H" : "H/F") + " : ×" + frNum(ratio) + (r.extra ? "<br>" + r.extra : "") + "</div>", ev
      );
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* MNT 2 — Cascade de soins (diagnostic → traitement → contrôle)          */
  /* cfg.steps = [{label, sub, value, color, ink, note}] (en % de la base)  */
  /* cfg.ghost = repères mondiaux · cfg.compare = repères régionaux         */
  /* cfg.target = {index, value, label}                                     */
  /* ===================================================================== */
  function fitText(ctx, txt, x, y, maxW, weight, size) {
    let sz = size, t = String(txt);
    ctx.font = FONT(weight, sz);
    while (ctx.measureText(t).width > maxW && sz > 7) { sz -= 0.5; ctx.font = FONT(weight, sz); }
    while (ctx.measureText(t).width > maxW && t.length > 2) t = t.slice(0, -2) + "…";
    ctx.fillText(t, x, y);
  }

  function topRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h));
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  function cascade(canvas, cfg) {
    const st = { hover: -1 };
    const P = { l: 38, r: 10, t: 30, b: 44 };
    const geo = function (w, h) {
      const n = cfg.steps.length;
      const pw = w - P.l - P.r, ph = h - P.t - P.b;
      const slot = pw / Math.max(1, n);
      const bw = Math.min(70, slot * 0.44);
      return {
        n: n, pw: pw, ph: ph, slot: slot, bw: bw,
        X: (i) => P.l + i * slot + (slot - bw) / 2,
        Y: (v) => P.t + ph - (clamp(v, 0, 100) / 100) * ph,
      };
    };
    const draw = function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const G = geo(w, h);
      const steps = cfg.steps;

      /* axe Y 0-100 % */
      ctx.font = FONT(500, 9.5);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      [0, 25, 50, 75, 100].forEach(function (v) {
        const y = G.Y(v);
        ctx.strokeStyle = "rgba(148,163,184,.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(P.l, y);
        ctx.lineTo(w - P.r, y);
        ctx.stroke();
        ctx.fillStyle = "#94A3B8";
        ctx.fillText(v + "%", P.l - 6, y);
      });

      /* cible (ex. pays performants ≥ 50 % contrôlés) */
      if (cfg.target) {
        const t = cfg.target;
        const x0 = P.l + t.index * G.slot + 4, x1 = P.l + (t.index + 1) * G.slot - 4, y = G.Y(t.value);
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "#047857";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "#047857";
        ctx.font = FONT(800, 9);
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const tw = ctx.measureText(t.label).width;
        const tx = clamp((x0 + x1) / 2, P.l + tw / 2 + 2, w - P.r - tw / 2 - 2);
        ctx.fillText(t.label, tx, y - 4);
      }

      steps.forEach(function (s, i) {
        const prog = stagger(i, steps.length, p, 0.12);
        const x = G.X(i), y0 = G.Y(0);
        const bh = (clamp(s.value, 0, 100) / 100) * G.ph * prog;
        const g = ctx.createLinearGradient(0, y0 - Math.max(bh, 1), 0, y0);
        g.addColorStop(0, st.hover === i ? lighten(s.color, 0.12) : s.color);
        g.addColorStop(1, rgba(s.color, 0.55));
        ctx.fillStyle = g;
        topRect(ctx, x, y0 - bh, G.bw, bh, 7);
        ctx.fill();

        /* repère régional (quand un pays est filtré) : pointillés bleus */
        if (cfg.compare && cfg.compare[i] !== undefined && prog > 0.5) {
          const yc = G.Y(cfg.compare[i]);
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "#0066CC";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 7, yc);
          ctx.lineTo(x + G.bw + 7, yc);
          ctx.stroke();
          ctx.restore();
        }
        /* repère mondial : trait plein ardoise + losange */
        if (cfg.ghost && cfg.ghost[i] !== undefined && prog > 0.5) {
          const yg = G.Y(cfg.ghost[i]);
          ctx.strokeStyle = "#0F172A";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 7, yg);
          ctx.lineTo(x + G.bw + 7, yg);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + G.bw + 7, yg - 3.5);
          ctx.lineTo(x + G.bw + 10.5, yg);
          ctx.lineTo(x + G.bw + 7, yg + 3.5);
          ctx.lineTo(x + G.bw + 3.5, yg);
          ctx.closePath();
          ctx.fillStyle = "#0F172A";
          ctx.fill();
        }
        /* valeur au-dessus de la barre */
        if (prog > 0.55) {
          const txt = (s.value >= 100 ? "100" : frNum(s.value)) + " %";
          const ty = Math.max(P.t - 2, y0 - bh - 6);
          ctx.font = FONT(900, 13);
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.lineWidth = 4;
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#fff";
          ctx.strokeText(txt, x + G.bw / 2, ty);
          ctx.fillStyle = s.ink || s.color;
          ctx.fillText(txt, x + G.bw / 2, ty);
        }
        /* libellés */
        const cx = P.l + i * G.slot + G.slot / 2;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#334155";
        fitText(ctx, s.label, cx, y0 + 8, G.slot - 6, 800, 10.5);
        if (s.sub) {
          ctx.fillStyle = "#94A3B8";
          fitText(ctx, s.sub, cx, y0 + 22, G.slot - 6, 600, 9);
        }
      });

      /* pertes entre étapes : pastille rouge « −x pts » */
      if (p > 0.72) {
        ctx.globalAlpha = clamp((p - 0.72) / 0.28, 0, 1);
        for (let i = 0; i < steps.length - 1; i++) {
          const loss = steps[i].value - steps[i + 1].value;
          if (loss <= 0) continue;
          const xa = G.X(i) + G.bw, xb = G.X(i + 1);
          const ya = G.Y(steps[i].value), yb = G.Y(steps[i + 1].value);
          ctx.save();
          ctx.setLineDash([2, 3]);
          ctx.strokeStyle = "rgba(239,68,68,.55)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(xa, ya);
          ctx.lineTo(xb, yb);
          ctx.stroke();
          ctx.restore();
          /* la pastille doit tenir dans l'intervalle entre deux barres, sans
             mordre sur les valeurs : texte court si la place manque */
          const gap = xb - xa;
          ctx.font = FONT(800, 9);
          let txt = "−" + frNum(loss) + " pts";
          if (ctx.measureText(txt).width + 10 > gap - 4) { txt = "−" + frNum(loss); ctx.font = FONT(800, 8.5); }
          const tw = ctx.measureText(txt).width + 10;
          const px = (xa + xb) / 2, py = (ya + yb) / 2;
          ctx.fillStyle = "#FEF2F2";
          roundRect(ctx, px - tw / 2, py - 8, tw, 16, 8);
          ctx.fill();
          ctx.strokeStyle = "rgba(239,68,68,.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = "#B91C1C";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(txt, px, py + 0.5);
        }
        ctx.globalAlpha = 1;
      }
    };
    const ctrl = mount(canvas, cfg, draw);
    hit(canvas, function (ev, mx) {
      const G = geo(canvas.clientWidth, canvas.clientHeight);
      const i = Math.floor((mx - P.l) / G.slot);
      if (i < 0 || i >= G.n) {
        if (st.hover !== -1) { st.hover = -1; ctrl.repaint(); }
        hideTip();
        return;
      }
      if (st.hover !== i) { st.hover = i; ctrl.repaint(); }
      const s = cfg.steps[i];
      const prev = i > 0 ? cfg.steps[i - 1] : null;
      showTip(
        '<div class="wsv-tip-t">' + s.label + (s.sub ? " · " + s.sub : "") + "</div>" +
        '<div class="wsv-tip-r"><span><i style="background:' + s.color + '"></i>' + (cfg.scopeLabel || "Valeur") + "</span><b>" + frNum(s.value) + " %</b></div>" +
        (cfg.compare && cfg.compare[i] !== undefined ? '<div class="wsv-tip-r"><span><i style="background:#0066CC"></i>' + (cfg.compareLabel || "Moyenne régionale") + "</span><b>" + frNum(cfg.compare[i]) + " %</b></div>" : "") +
        (cfg.ghost && cfg.ghost[i] !== undefined ? '<div class="wsv-tip-r"><span><i style="background:#0F172A"></i>' + (cfg.ghostLabel || "Référence") + "</span><b>" + frNum(cfg.ghost[i]) + " %</b></div>" : "") +
        '<div class="wsv-tip-s">' + (s.note || "") + (prev ? (s.note ? " · " : "") + "perte : −" + frNum(prev.value - s.value) + " pts" : "") + "</div>", ev
      );
    });
    canvas.__hoverClear = function () { st.hover = -1; ctrl.repaint(); };
    return ctrl;
  }

  /* ===================================================================== */
  /* Mini-graphiques KPI                                                   */
  /* ===================================================================== */
  function sparkBars(canvas, cfg) {
    return mount(canvas, cfg, function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const d = cfg.data, n = d.length;
      const max = Math.max.apply(null, d), min = Math.min.apply(null, d);
      const bw = w / n;
      d.forEach(function (v, i) {
        const bh = 4 + ((v - min) / (max - min || 1)) * (h - 6);
        const x = i * bw + bw * 0.18;
        const last = i === n - 1;
        const g = ctx.createLinearGradient(0, h - bh, 0, h);
        g.addColorStop(0, cfg.color);
        g.addColorStop(1, rgba(cfg.color, 0.25));
        ctx.fillStyle = last ? cfg.color : g;
        const prog = stagger(i, n, p, 0.06);
        roundRect(ctx, x, h - bh * prog, bw * 0.64, bh * prog, 2);
        ctx.fill();
      });
    });
  }

  function arcGauge(canvas, cfg) {
    return mount(canvas, cfg, function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      /* Un arc de 270° occupe 1,707 × R en hauteur (R au-dessus du centre,
         R·sin 45° en dessous) : l'ancien calcul (R = h - 8) débordait des
         mini-canvas de 44 px et la jauge apparaissait rognée.            */
      const lw = 8;
      const R = Math.max(6, Math.min(w / 2 - lw, (h - lw - 2) / 1.7071));
      const cx = w / 2, cy = lw / 2 + 1 + R;
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.strokeStyle = "#E8EEF7";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();
      const ang = a0 + (cfg.value / cfg.max) * (a1 - a0) * p;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, ang);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 8;
      ctx.stroke();
      const ta = a0 + (cfg.threshold / cfg.max) * (a1 - a0);
      ctx.save();
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ta) * (R - 6), cy + Math.sin(ta) * (R - 6));
      ctx.lineTo(cx + Math.cos(ta) * (R + 6), cy + Math.sin(ta) * (R + 6));
      ctx.stroke();
      ctx.restore();
    });
  }

  function miniBars(canvas, cfg) {
    return mount(canvas, cfg, function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const rows = cfg.rows, n = rows.length;
      const slot = h / n, bh = Math.min(9, slot - 5);
      const L = cfg.labelW || 52, R = cfg.valueW || 30;
      const pw = w - L - R;
      const max = cfg.max || 100;
      rows.forEach(function (r, i) {
        const y = i * slot + (slot - bh) / 2;
        ctx.fillStyle = "#64748B";
        ctx.font = FONT(600, 9);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(r.label, 0, y + bh / 2);
        ctx.fillStyle = "#EEF4FF";
        roundRect(ctx, L, y, pw, bh, 3);
        ctx.fill();
        const prog = stagger(i, n, p, 0.08);
        const col = r.color || cfg.color; /* couleur par ligne optionnelle */
        const g = ctx.createLinearGradient(L, 0, L + pw, 0);
        g.addColorStop(0, rgba(col, 0.75));
        g.addColorStop(1, col);
        ctx.fillStyle = g;
        roundRect(ctx, L, y, Math.max(1, (r.value / max) * pw * prog), bh, 3);
        ctx.fill();
        ctx.fillStyle = "#0F172A";
        ctx.font = FONT(800, 9);
        ctx.textAlign = "left";
        ctx.fillText(cfg.fmt ? cfg.fmt(r.value) : r.value + "%", L + pw + 5, y + bh / 2);
      });
    });
  }

  function progressBar(canvas, cfg) {
    return mount(canvas, cfg, function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const bh = 12, y = (h - bh) / 2;
      const R = bh / 2;
      ctx.fillStyle = "#E8F5E9";
      roundRect(ctx, 0, y, w, bh, R);
      ctx.fill();
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, "#00A86B");
      g.addColorStop(1, "#34D399");
      ctx.fillStyle = g;
      roundRect(ctx, 0, y, Math.max(2, (cfg.value / 100) * w * p), bh, R);
      ctx.fill();
      const x = (cfg.objective / 100) * w;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + bh + 4);
      ctx.stroke();
      ctx.restore();
    });
  }

  function donutMini(canvas, cfg) {
    return mount(canvas, cfg, function (c, p) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) / 2 - 3, th = cfg.thickness || 11;
      const total = cfg.segments.reduce(function (a, s) { return a + s.value; }, 0);
      let a0 = -Math.PI / 2 + (1 - p) * Math.PI * 0.9;
      cfg.segments.forEach(function (s) {
        const ang = (s.value / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R - th / 2, a0, a0 + ang);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = th;
        ctx.stroke();
        a0 += ang;
      });
      ctx.fillStyle = "#0F172A";
      ctx.font = FONT(900, 12);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const mid = cfg.center !== undefined
        ? cfg.center
        : String(cfg.segments.filter(function (s) { return s.value > 0; }).length);
      ctx.fillText(String(mid), cx, cy);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mini-graphiques du tableau de bord                                 */
  /* ------------------------------------------------------------------ */
  function sparkLine(canvas, cfg) {
    return mount(canvas, cfg, function (c) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const d = cfg.data, n = d.length;
      const max = Math.max.apply(null, d), min = Math.min.apply(null, d);
      const X = (i) => 2 + (i / (n - 1)) * (w - 6);
      const Y = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 8);
      const pts = d.map(function (v, i) { return { x: X(i), y: Y(v) }; });
      ctx.beginPath();
      smooth(ctx, pts, 0.8);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.stroke();
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = cfg.color;
      ctx.fill();
    });
  }

  function bullet(canvas, cfg) {
    return mount(canvas, cfg, function (c) {
      const ctx = c.ctx, w = c.w, h = c.h;
      const bh = 8, y = (h - bh) / 2;
      ctx.fillStyle = "#EDF2F9";
      roundRect(ctx, 0, y, w, bh, 4);
      ctx.fill();
      const col = cfg.value >= 70 ? "#10B981" : cfg.value >= 50 ? "#F59E0B" : "#EF4444";
      ctx.fillStyle = col;
      roundRect(ctx, 0, y, Math.max(2, (cfg.value / cfg.max) * w), bh, 4);
      ctx.fill();
      const x = (cfg.objective / cfg.max) * w;
      ctx.save();
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.lineTo(x, y + bh + 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  /* Chaque graphique reçoit une copie superficielle privée de sa config :
     update() peut la remplacer en place sans jamais toucher aux objets de
     l'appelant (ex. WHO_SURV.WATERFALL passé tel quel).                    */
  const own = function (fn) {
    return function (canvas, cfg) { return fn(canvas, Object.assign({}, cfg || {})); };
  };

  root.WHOCharts = {
    multiLine: own(multiLine),
    hbar: own(hbar),
    radar: own(radar),
    dualArea: own(dualArea),
    donut: own(donut),
    bubble: own(bubble),
    waterfall: own(waterfall),
    heatmap: own(heatmap),
    groupedHBar: own(groupedHBar),
    stackedArea: own(stackedArea),
    polar: own(polar),
    scatter: own(scatter),
    timeline: own(timeline),
    gauges: own(gauges),
    sparkBars: own(sparkBars),
    arcGauge: own(arcGauge),
    miniBars: own(miniBars),
    progressBar: own(progressBar),
    donutMini: own(donutMini),
    sparkLine: own(sparkLine),
    bullet: own(bullet),
    dumbbell: own(dumbbell),
    cascade: own(cascade),
    repaintAll: repaintAll,
    colorForScore: function (s) {
      if (s <= 25) return ["#DCFCE7", "#166534"];
      if (s <= 50) return ["#FEF3C7", "#92400E"];
      if (s <= 75) return ["#FED7AA", "#9A3412"];
      if (s <= 100) return ["#FECACA", "#991B1B"];
      return ["#DC2626", "#FFFFFF"];
    },
  };
})(typeof window !== "undefined" ? window : this);
