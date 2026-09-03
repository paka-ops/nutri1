/* NUTRI.N°1 — Holographic Africa map with animated flows from Togo to the whole continent.
   Pure SVG (resolution independent → crisp at 4K). Injected into any element with class "holoMap".
   Set data-lang="fr" for French labels.

   v2 — solid (non-dashed) arrows, sequential emission every 2 s from the hub,
   smooth draw / impact ring / hold / fade-out, looping forever across all targets. */
(function () {
    'use strict';

    // --- Geography (lon, lat) --------------------------------------------------
    var AFRICA = [
        [-5.8, 35.8], [-2.2, 35.1], [3, 36.8], [7.5, 37], [10.2, 37.3], [11.1, 36.9], [10.6, 35.5], [10.2, 34], [11.1, 33.2],
        [13.2, 32.9], [15.5, 31.5], [17.8, 30.8], [20, 32.1], [22, 32.9], [24, 32], [25.2, 31.6], [27.5, 31.2], [30, 31.4],
        [32.3, 31.3], [34.2, 31.3], [34.9, 29.5], [34.3, 27.8], [33.6, 28.1], [32.6, 29.9], [33.8, 27], [35.5, 24],
        [37, 21], [38.5, 18], [39.5, 15.5], [41.2, 14.5], [43, 12.5], [43.3, 11.5], [45, 10.5], [48.5, 11.3], [51.3, 11.8],
        [50.8, 10], [49, 7], [46.5, 3], [44, 1.5], [41.5, -1.7], [40, -3.5], [39.3, -5], [39.3, -7], [39.5, -9.5],
        [40.5, -11], [40.6, -14.5], [39, -17], [36.5, -18.5], [35, -22], [35.5, -24], [32.9, -26], [32.5, -28.5],
        [30.5, -31], [28, -33], [26, -34], [22, -34.2], [20, -34.8], [18.4, -34.3], [18, -32], [17, -29.5],
        [15.5, -27], [15, -24], [13.5, -21], [12, -17.5], [13.2, -15.5], [12.2, -13], [13.5, -10.5], [12.5, -6.5],
        [12, -5.5], [10, -3], [9.5, -1], [9, 0.5], [9.5, 2.5], [8.7, 4.5], [7, 4.3], [5.5, 4.7], [5, 5.7], [4, 6.3],
        [2, 6.3], [1.2, 6.1], [0, 5.7], [-1.5, 5], [-3, 5.1], [-4.5, 5.2], [-7, 4.4], [-8.5, 4.6], [-10, 6.2],
        [-11.5, 7], [-13.2, 8.5], [-13.7, 9.6], [-15, 11], [-16.7, 12.3], [-17.5, 14.7], [-16.5, 17], [-16, 19.5],
        [-17, 21], [-15.5, 24], [-14.5, 26], [-13, 27.7], [-11, 28.5], [-9.8, 30.5], [-9.2, 32.5], [-7.5, 33.6],
        [-6.8, 34.2]
    ];
    var MADAGASCAR = [
        [49.3, -12], [50.4, -15.5], [49.8, -17.5], [49.4, -19.5], [48, -22.5], [47, -25.1], [45.2, -25.5], [44, -24],
        [43.3, -22], [44.3, -19], [44, -16.5], [46, -15.5], [47.7, -13.5]
    ];
    var TOGO = { name: 'Togo', city: 'Lomé', lon: 1.22, lat: 6.13 };

    /* Each target uses a cubic Bezier (c1, c2 perpendicular offsets along the path).
       bend values are in degrees of lon, multiplied by S for screen units.
       Short nearby arcs use small symmetric bends; long east/south arcs lift over the continent. */
    var TARGETS = [
        // West Africa (existing, tuned for c1/c2)
        { name: 'Ghana',          fr: 'Ghana',            lon: -0.19, lat: 5.6,   c1: -1.6, c2: -1.6 },
        { name: "Côte d'Ivoire",  fr: "Côte d'Ivoire",    lon: -4.0,  lat: 5.35,  c1: -3,   c2: -3   },
        { name: 'Burkina Faso',   fr: 'Burkina Faso',     lon: -1.52, lat: 12.37, c1:  2,   c2:  2   },
        { name: 'Niger',          fr: 'Niger',            lon:  2.12, lat: 13.51, c1:  3,   c2:  3   },
        { name: 'Bénin',          fr: 'Bénin',            lon:  2.43, lat: 6.37,  c1: -1.2, c2: -1.2 },
        { name: 'Mali',           fr: 'Mali',             lon: -8.0,  lat: 12.65, c1:  4,   c2:  4   },
        { name: 'Sénégal',        fr: 'Sénégal',          lon: -17.45,lat: 14.7,  c1:  6,   c2:  6   },
        { name: 'Nigeria',        fr: 'Nigeria',          lon:  7.5,  lat: 9.06,  c1:  2.5, c2:  2.5 },
        { name: 'Guinée',         fr: 'Guinée',           lon: -13.7, lat: 9.5,   c1: -3.5, c2: -3.5 },

        // North Africa — sweep up over the Sahara
        { name: 'Maroc',          fr: 'Maroc',            lon: -7.59, lat: 33.57, c1:  9,   c2:  4   },
        { name: 'Algérie',        fr: 'Algérie',          lon:  1.66, lat: 28.03, c1: 11,   c2:  6   },
        { name: 'Tunisie',        fr: 'Tunisie',          lon:  9.54, lat: 33.89, c1: 12,   c2:  7   },
        { name: 'Égypte',         fr: 'Égypte',           lon: 30.8,  lat: 26.1,  c1: 16,   c2: 10   },

        // Central Africa
        { name: 'Cameroun',       fr: 'Cameroun',         lon:  9.7,  lat:  3.8,  c1:  5,   c2:  5   },
        { name: 'RD Congo',       fr: 'RD Congo',         lon: 21.76, lat: -2.88, c1:  9,   c2:  6   },

        // East Africa — high arc
        { name: 'Éthiopie',       fr: 'Éthiopie',         lon: 39.6,  lat:  9.15, c1: 16,   c2: 10   },
        { name: 'Kenya',          fr: 'Kenya',            lon: 37.91, lat: -0.02, c1: 16,   c2: 10   },
        { name: 'Tanzanie',       fr: 'Tanzanie',         lon: 34.89, lat: -6.37, c1: 16,   c2:  9   },

        // Southern Africa
        { name: 'Angola',         fr: 'Angola',           lon: 17.06, lat: -12.3, c1:  8,   c2:  6   },
        { name: 'Zambie',         fr: 'Zambie',           lon: 27.85, lat: -13.1, c1: 12,   c2:  8   },
        { name: 'Mozambique',     fr: 'Mozambique',       lon: 34.5,  lat: -18.4, c1: 16,   c2: 10   },
        { name: 'Afrique du Sud', fr: 'Afrique du Sud',   lon: 22.94, lat: -29.2, c1: 14,   c2: 10   },
        { name: 'Madagascar',     fr: 'Madagascar',       lon: 46.87, lat: -19.4, c1: 22,   c2: 16   }
    ];

    // --- Projection: (lon,lat) → SVG px. Frame focused on West Africa + whole continent visible.
    var LON0 = -23, LAT0 = 39, S = 10;
    function P(lon, lat) { return [((lon - LON0) * S).toFixed(1), ((LAT0 - lat) * S).toFixed(1)]; }
    function poly(pts) { return 'M' + pts.map(function (p) { var q = P(p[0], p[1]); return q[0] + ' ' + q[1]; }).join('L') + 'Z'; }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    /* Cubic Bezier easing (CSS cubic-bezier(.4,0,.2,1) approx) */
    function easeOut(t) { var u = 1 - t; return 1 - u * u * u; }  // matches "fast then settle" feel
    function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    /* Approximate length of a cubic Bezier in pixels by sampling (sufficient for dasharray). */
    function cubicLen(x0, y0, c1x, c1y, c2x, c2y, x1, y1) {
        var n = 32, prev = null, len = 0, x, y, i, t;
        for (i = 0; i <= n; i++) {
            t = i / n;
            var u = 1 - t;
            x = u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1;
            y = u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1;
            if (prev) { var dx = x - prev[0], dy = y - prev[1]; len += Math.sqrt(dx * dx + dy * dy); }
            prev = [x, y];
        }
        return len;
    }

    var W = 780, H = 760;

    function build(lang) {
        var fr = lang === 'fr';
        var t = {
            title: fr ? 'Carte holographique de l’Afrique — flux de données depuis le Togo vers tout le continent' : 'Holographic map of Africa — data flows from Togo across the continent',
            hub: 'HUB • TOGO',
            status: fr ? 'CONTRÔLE PAR PAYS • ACTIF' : 'COUNTRY-LEVEL CONTROL • LIVE',
            legendA: fr ? 'Nœud national isolé (tenant)' : 'Isolated national node (tenant)',
            legendB: fr ? 'Flux chiffré • RBAC' : 'Encrypted flow • RBAC'
        };
        var origin = P(TOGO.lon, TOGO.lat);
        var ox = +origin[0], oy = +origin[1];

        var defs =
            '<defs>' +
            '<linearGradient id="hmLand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2af08a" stop-opacity=".13"/><stop offset="1" stop-color="#0aa85c" stop-opacity=".04"/></linearGradient>' +
            '<radialGradient id="hmGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#4dffa6" stop-opacity=".55"/><stop offset="1" stop-color="#4dffa6" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="hmSweep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8dffc4" stop-opacity="0"/><stop offset=".5" stop-color="#8dffc4" stop-opacity=".28"/><stop offset="1" stop-color="#8dffc4" stop-opacity="0"/></linearGradient>' +
            '<pattern id="hmGrid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#3ce88a" stroke-opacity=".14" stroke-width=".6"/></pattern>' +
            '<pattern id="hmScan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="#0b3d24" fill-opacity=".35"/></pattern>' +
            '<filter id="hmBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>' +
            '<filter id="hmSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<filter id="hmNeon" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feColorMatrix in="b" type="matrix" values="0 0 0 0 .3  0 0 0 0 1  0 0 0 0 .6  0 0 0 1.2 0" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
            '<clipPath id="hmClip"><path d="' + poly(AFRICA) + '"/><path d="' + poly(MADAGASCAR) + '"/></clipPath>' +
            '<marker id="hmArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#d9ffe9"/></marker>' +
            '</defs>';

        var africaPath = poly(AFRICA), madaPath = poly(MADAGASCAR);

        var land =
            '<g class="hm-land">' +
            '<path d="' + africaPath + '" fill="#4dffa6" opacity=".18" filter="url(#hmBlur)"/>' +
            '<path d="' + madaPath + '" fill="#4dffa6" opacity=".18" filter="url(#hmBlur)"/>' +
            '<g clip-path="url(#hmClip)"><rect width="' + W + '" height="' + H + '" fill="url(#hmLand)"/><rect width="' + W + '" height="' + H + '" fill="url(#hmGrid)"/><rect width="' + W + '" height="' + H + '" fill="url(#hmScan)"/>' +
            '<rect class="hm-sweep" x="0" y="-160" width="' + W + '" height="160" fill="url(#hmSweep)"/></g>' +
            '<path d="' + africaPath + '" fill="none" stroke="#7dffbd" stroke-width="1.6" stroke-linejoin="round" filter="url(#hmSoft)"/>' +
            '<path d="' + madaPath + '" fill="none" stroke="#7dffbd" stroke-width="1.4" stroke-linejoin="round" filter="url(#hmSoft)"/>' +
            '<path class="hm-ghost" d="' + africaPath + '" fill="none" stroke="#4dffa6" stroke-width=".8" opacity=".35"/>' +
            '</g>';

        // Compute paths & lengths for every target
        var arcs = TARGETS.map(function (c) {
            var p = P(c.lon, c.lat), tx = +p[0], ty = +p[1];
            var dx = tx - ox, dy = ty - oy, len0 = Math.sqrt(dx * dx + dy * dy) || 1;
            var nx = -dy / len0, ny = dx / len0;
            var k1 = (c.c1 != null ? c.c1 : (c.bend != null ? c.bend : 0)) * S;
            var k2 = (c.c2 != null ? c.c2 : (c.c1 != null ? c.c1 : 0)) * S;
            /* Two control points at 30% and 70% along the line, offset perpendicularly. */
            var c1x = lerp(ox, tx, 0.30) + nx * k1;
            var c1y = lerp(oy, ty, 0.30) + ny * k1;
            var c2x = lerp(ox, tx, 0.70) + nx * k2;
            var c2y = lerp(oy, ty, 0.70) + ny * k2;
            var d = 'M' + ox + ' ' + oy + 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' + tx + ' ' + ty;
            var len = cubicLen(ox, oy, c1x, c1y, c2x, c2y, tx, ty);
            return { lon: c.lon, lat: c.lat, name: c.name, frName: c.fr || c.name, x: tx, y: ty, d: d, len: len };
        });

        // Build flow group + nodes + labels (per-target state, populated by the sequencer).
        var flows = '', nodes = '', labels = '';
        arcs.forEach(function (a, i) {
            var idx = 'i' + i;
            /* track: wide soft glow background (no animation, always faint) */
            flows +=
                '<g class="hm-flow" data-idx="' + idx + '">' +
                '<path class="hm-track" d="' + a.d + '"/>' +
                '<path class="hm-line" d="' + a.d + '" pathLength="1000" stroke-dasharray="1000 1000" stroke-dashoffset="1000"/>' +
                '<path class="hm-tip" d="' + a.d + '" marker-end="url(#hmArrow)"/>' +
                '<circle class="hm-impact" cx="' + a.x + '" cy="' + a.y + '" r="2"/>' +
                '</g>';
            nodes +=
                '<g class="hm-node" data-idx="' + idx + '" transform="translate(' + a.x + ' ' + a.y + ')">' +
                '<circle class="hm-ring" fill="none" r="4"/><circle class="hm-ring hm-ring2" fill="none" r="4"/>' +
                '<circle r="3" fill="#d9ffe9"/></g>';
            /* Label placement: left of point if target is left of hub, else right. */
            var anchor = a.x < ox ? 'end' : 'start';
            var off = a.x < ox ? -9 : 9;
            /* For very dense nearby labels, lift to avoid overlap with hub label. */
            var dist = Math.sqrt((a.x - ox) * (a.x - ox) + (a.y - oy) * (a.y - oy));
            var lift = dist < 50 ? -16 : -7;
            var nm = (fr ? a.frName : a.name).toUpperCase();
            labels += '<text class="hm-label" data-idx="' + idx + '" x="' + (a.x + off) + '" y="' + (a.y + lift) + '" text-anchor="' + anchor + '">' + esc(nm) + '</text>';
        });

        var hub =
            '<g class="hm-hub" transform="translate(' + ox + ' ' + oy + ')">' +
            '<circle r="34" fill="url(#hmGlow)"/>' +
            '<circle class="hm-pulse" fill="none" r="8"/><circle class="hm-pulse hm-pulse2" fill="none" r="8"/><circle class="hm-pulse hm-pulse3" fill="none" r="8"/>' +
            '<circle class="hm-hubBeat" r="6" fill="#ffffff" filter="url(#hmNeon)"/>' +
            '<g class="hm-reticle"><circle r="16" fill="none" stroke="#b8ffd9" stroke-width=".9" stroke-dasharray="6 5"/><circle r="24" fill="none" stroke="#7dffbd" stroke-width=".6" stroke-dasharray="2 6" opacity=".7"/></g>' +
            '<text class="hm-hubLabel" x="0" y="46" text-anchor="middle">' + esc(t.hub) + '</text>' +
            '</g>';

        var hudFrame =
            '<g class="hm-hud" fill="none" stroke="#7dffbd" stroke-width="1.2">' +
            '<path d="M14 40V14H40"/><path d="M' + (W - 14) + ' 40V14H' + (W - 40) + '"/><path d="M14 ' + (H - 40) + 'V' + (H - 14) + 'H40"/><path d="M' + (W - 14) + ' ' + (H - 40) + 'V' + (H - 14) + 'H' + (W - 40) + '"/>' +
            '</g>' +
            '<text class="hm-status" x="26" y="' + (H - 26) + '">' + esc(t.status) + '</text>' +
            '<text class="hm-status hm-right" x="' + (W - 26) + '" y="34" text-anchor="end">NUTRI.N°1 • AFRICAN FOOD CLOUD</text>';

        var legend =
            '<div class="hm-legend"><span><i class="hm-lg-node"></i>' + esc(t.legendA) + '</span><span><i class="hm-lg-line"></i>' + esc(t.legendB) + '</span></div>';

        return '<div class="hm-stage">' +
            '<svg class="hm-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t.title) + '" xmlns="http://www.w3.org/2000/svg">' +
            defs + '<rect width="' + W + '" height="' + H + '" fill="url(#hmGrid)" opacity=".5"/>' + land + flows + nodes + labels + hub + hudFrame +
            '</svg><div class="hm-base"></div></div>' + legend;
    }

    /* ------------------ Sequencer ------------------ */
    /* Drives a per-frame render of the arrows: for each target we keep a phase state
       (idle, drawing, holding, fading) and update the corresponding SVG attributes
       from performance.now(). No layout reflow — only stroke-dashoffset & opacity. */
    function attachSequencer(svg) {
        var flowNodes = svg.querySelectorAll('.hm-flow');
        var nodeGroups = svg.querySelectorAll('.hm-node');
        var labels = svg.querySelectorAll('.hm-label');
        var hubBeat = svg.querySelector('.hm-hubBeat');
        if (!flowNodes.length) return;

        var n = flowNodes.length;
        /* Timeline (ms) — total cycle = n * interval (≈ 46 s for 23 targets) */
        var DRAW = 2000;     // draw duration
        var HOLD = 1700;     // hold lit
        var FADE = 900;      // fade out
        var INTERVAL = 2000; // one new emission every 2 s
        var HUB_PULSE = 1100;

        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) {
            /* Draw all lines solid, permanent — accessible fallback */
            for (var r = 0; r < n; r++) {
                var fl = flowNodes[r], nd = nodeGroups[r], lb = labels[r];
                if (fl) {
                    var line = fl.querySelector('.hm-line');
                    if (line) { line.setAttribute('stroke-dashoffset', '0'); }
                    var tip = fl.querySelector('.hm-tip');
                    if (tip) { tip.setAttribute('opacity', '1'); }
                }
                if (nd) nd.setAttribute('opacity', '1');
                if (lb) lb.setAttribute('opacity', '1');
            }
            return;
        }

        /* Schedule: emission #k starts at t = startAt + k * INTERVAL.
           We process all emissions whose [t, t + DRAW + HOLD + FADE] intersects [now]. */
        var startAt = 0;
        var live = false;
        var rafId = 0;

        function render(now) {
            if (!live) return;
            var t = now - startAt;
            for (var k = 0; k < n; k++) {
                var emit = k * INTERVAL;
                var fl = flowNodes[k], nd = nodeGroups[k], lb = labels[k];
                if (!fl) continue;
                var line = fl.querySelector('.hm-line');
                var tip = fl.querySelector('.hm-tip');
                var impact = fl.querySelector('.hm-impact');
                var phase, p;
                if (t < emit) { phase = 'idle'; }
                else if (t < emit + DRAW) { phase = 'draw'; p = (t - emit) / DRAW; }
                else if (t < emit + DRAW + HOLD) { phase = 'hold'; p = 1; }
                else if (t < emit + DRAW + HOLD + FADE) { phase = 'fade'; p = 1 - (t - emit - DRAW - HOLD) / FADE; }
                else { phase = 'done'; p = 0; }

                if (phase === 'idle') {
                    line.setAttribute('stroke-dashoffset', '1000');
                    line.setAttribute('opacity', '0');
                    tip.setAttribute('opacity', '0');
                    impact.setAttribute('opacity', '0');
                    impact.setAttribute('r', '2');
                    nd.setAttribute('opacity', '0');
                    lb.setAttribute('opacity', '0');
                } else {
                    /* line is solid; we just reveal it by stroke-dashoffset on a 1000-unit pathLength. */
                    var offset = 1000 * (1 - easeOut(p));
                    if (phase === 'hold') offset = 0;
                    if (phase === 'fade') offset = 0;
                    line.setAttribute('stroke-dashoffset', offset.toFixed(2));
                    line.setAttribute('opacity', phase === 'fade' ? clamp(p, 0, 1).toFixed(3) : '1');

                    /* Arrowhead fades in just before the head arrives (last 30% of draw) */
                    var headP = clamp((t - emit) / DRAW - 0.55, 0, 1) / 0.45;
                    var tipOp;
                    if (phase === 'draw') tipOp = easeOut(clamp(headP, 0, 1));
                    else if (phase === 'hold') tipOp = 1;
                    else tipOp = clamp(p, 0, 1);
                    tip.setAttribute('opacity', tipOp.toFixed(3));
                    tip.setAttribute('marker-end', 'url(#hmArrow)');

                    /* Impact ring at destination: pulses right after arrival */
                    if (phase === 'draw') {
                        var ip = clamp((t - emit - DRAW * 0.85) / (DRAW * 0.15), 0, 1);
                        impact.setAttribute('opacity', clamp(ip * 1.4, 0, 1).toFixed(3));
                        impact.setAttribute('r', (2 + ip * 8).toFixed(2));
                    } else if (phase === 'hold') {
                        impact.setAttribute('opacity', '0.85');
                        impact.setAttribute('r', '10');
                    } else if (phase === 'fade') {
                        impact.setAttribute('opacity', (0.85 * p).toFixed(3));
                        impact.setAttribute('r', (10 + (1 - p) * 4).toFixed(2));
                    } else {
                        impact.setAttribute('opacity', '0');
                    }

                    /* Destination node + label appear at arrival */
                    if (phase === 'draw') {
                        var np = clamp((t - emit - DRAW * 0.85) / (DRAW * 0.15), 0, 1);
                        nd.setAttribute('opacity', easeOut(np).toFixed(3));
                        lb.setAttribute('opacity', (easeOut(np) * 0.95).toFixed(3));
                    } else if (phase === 'hold') {
                        nd.setAttribute('opacity', '1');
                        lb.setAttribute('opacity', '0.95');
                    } else if (phase === 'fade') {
                        nd.setAttribute('opacity', p.toFixed(3));
                        lb.setAttribute('opacity', (p * 0.95).toFixed(3));
                    }
                }
            }

            /* Hub synchronised beat — pulses at each emission start */
            var beatScale = 1, beatOp = 1;
            var sinceLast = t % INTERVAL;
            if (sinceLast < HUB_PULSE) {
                var bp = sinceLast / HUB_PULSE;
                beatScale = 1 + 0.55 * easeOut(bp) * (1 - bp);
                beatOp = 1 - 0.35 * bp;
            }
            if (hubBeat) {
                hubBeat.setAttribute('transform', 'scale(' + beatScale.toFixed(3) + ')');
                hubBeat.setAttribute('opacity', beatOp.toFixed(3));
            }

            rafId = requestAnimationFrame(render);
        }

        function play() {
            if (live) return;
            live = true;
            startAt = performance.now();
            rafId = requestAnimationFrame(render);
        }
        function pause() {
            live = false;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = 0;
            /* Reset all visuals to idle so re-entry is clean */
            for (var k = 0; k < n; k++) {
                var fl = flowNodes[k], nd = nodeGroups[k], lb = labels[k];
                if (fl) {
                    var line = fl.querySelector('.hm-line');
                    if (line) { line.setAttribute('stroke-dashoffset', '1000'); line.setAttribute('opacity', '0'); }
                    var tip = fl.querySelector('.hm-tip');
                    if (tip) tip.setAttribute('opacity', '0');
                    var imp = fl.querySelector('.hm-impact');
                    if (imp) { imp.setAttribute('opacity', '0'); imp.setAttribute('r', '2'); }
                }
                if (nd) nd.setAttribute('opacity', '0');
                if (lb) lb.setAttribute('opacity', '0');
            }
            if (hubBeat) { hubBeat.setAttribute('transform', 'scale(1)'); hubBeat.setAttribute('opacity', '1'); }
        }

        return { play: play, pause: pause };
    }

    function init() {
        var els = document.querySelectorAll('.holoMap');
        var allSeq = [];
        for (var i = 0; i < els.length; i++) {
            if (els[i].getAttribute('data-ready')) continue;
            var lang = els[i].getAttribute('data-lang') || document.documentElement.lang || 'en';
            els[i].innerHTML = build(lang.slice(0, 2).toLowerCase());
            els[i].setAttribute('data-ready', '1');
            var svg = els[i].querySelector('svg.hm-svg');
            if (svg) allSeq.push(attachSequencer(svg));
        }
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    var on = e.isIntersecting;
                    e.target.classList.toggle('is-live', on);
                    var idx = Array.prototype.indexOf.call(els, e.target);
                    if (idx >= 0 && allSeq[idx]) { on ? allSeq[idx].play() : allSeq[idx].pause(); }
                });
            }, { threshold: 0.2 });
            for (var j = 0; j < els.length; j++) io.observe(els[j]);
        } else {
            for (var k = 0; k < els.length; k++) { els[k].classList.add('is-live'); if (allSeq[k]) allSeq[k].play(); }
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
