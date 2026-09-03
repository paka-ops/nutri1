/* NUTRI.N°1 — Holographic Africa map with sequenced data flows from Togo to the whole continent.
   Pure SVG (resolution independent → crisp at 4K). Injected into any element with class "holoMap".
   Set data-lang="fr" for French labels.
   Flows are emitted one at a time (every 2 s) by a small JS sequencer that only runs while the
   section is on screen (class "is-live" set by the IntersectionObserver) and the tab is visible. */
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

    /* Destinations. Array order = emission order (near / far interleaved so the map never looks
       one-sided). `bend` = curvature of the quadratic arc (× S px, positive = bows to the right of
       the direction of travel). `lp` = label placement: r, l, ur, ul, dr, dl, a (above), b (below) or a custom [dx, dy, anchor]. */
    var TARGETS = [
        { en: 'Ghana', fr: 'Ghana', lon: -0.19, lat: 5.6, bend: -1.6, lp: [-12, 13, 'end'] },
        { en: 'Kenya', fr: 'Kenya', lon: 36.82, lat: -1.29, bend: -3.5, lp: 'r' },
        { en: 'Mali', fr: 'Mali', lon: -8.0, lat: 12.65, bend: 4, lp: 'l' },
        { en: 'Egypt', fr: 'Égypte', lon: 31.24, lat: 30.05, bend: -5, lp: 'r' },
        { en: 'Nigeria', fr: 'Nigeria', lon: 7.5, lat: 9.06, bend: 2.5, lp: 'ur' },
        { en: 'South Africa', fr: 'Afrique du Sud', lon: 18.42, lat: -33.93, bend: 4, lp: 'ur' },
        { en: 'Senegal', fr: 'Sénégal', lon: -17.45, lat: 14.7, bend: 6, lp: 'b' },
        { en: 'Ethiopia', fr: 'Éthiopie', lon: 38.75, lat: 9.02, bend: -6, lp: 'r' },
        { en: 'Benin', fr: 'Bénin', lon: 2.43, lat: 6.37, bend: -1.2, lp: [14, 14, 'start'] },
        { en: 'Morocco', fr: 'Maroc', lon: -6.85, lat: 34.0, bend: -3, lp: 'ul' },
        { en: 'DR Congo', fr: 'RD Congo', lon: 15.3, lat: -4.32, bend: -2, lp: 'r' },
        { en: 'Niger', fr: 'Niger', lon: 2.12, lat: 13.51, bend: 3, lp: 'a' },
        { en: 'Madagascar', fr: 'Madagascar', lon: 47.5, lat: -18.9, bend: 3, lp: 'b' },
        { en: "Côte d'Ivoire", fr: "Côte d'Ivoire", lon: -4.0, lat: 5.35, bend: -3, lp: [-8, 25, 'end'] },
        { en: 'Algeria', fr: 'Algérie', lon: 3.06, lat: 36.75, bend: -3, lp: 'l' },
        { en: 'Cameroon', fr: 'Cameroun', lon: 11.52, lat: 3.87, bend: 1.5, lp: 'r' },
        { en: 'Zambia', fr: 'Zambie', lon: 28.28, lat: -15.41, bend: -3, lp: 'l' },
        { en: 'Burkina Faso', fr: 'Burkina Faso', lon: -1.52, lat: 12.37, bend: 2, lp: 'a' },
        { en: 'Tanzania', fr: 'Tanzanie', lon: 35.74, lat: -6.17, bend: -1.5, lp: 'r' },
        { en: 'Guinea', fr: 'Guinée', lon: -13.7, lat: 9.5, bend: -3.5, lp: 'dl' },
        { en: 'Mozambique', fr: 'Mozambique', lon: 32.58, lat: -25.97, bend: 5, lp: 'r' },
        { en: 'Tunisia', fr: 'Tunisie', lon: 10.18, lat: 36.8, bend: 2, lp: 'r' },
        { en: 'Angola', fr: 'Angola', lon: 13.23, lat: -8.84, bend: 2.5, lp: 'dr' }
    ];

    // --- Sequencer timing (ms) --------------------------------------------------
    var EMIT_EVERY = 2000;   // a new arrow leaves Togo every 2 s
    var DRAW_MIN = 1800, DRAW_MAX = 2400; // draw duration scales with arc length
    var HOLD = 3200;         // arrow stays lit after arrival
    var FADE = 1400;         // opacity fade-out (must match CSS)

    // --- Projection: (lon,lat) → SVG px. Frame focused on West Africa + whole continent visible.
    var LON0 = -23, LAT0 = 39, S = 10;
    function P(lon, lat) { return [((lon - LON0) * S).toFixed(1), ((LAT0 - lat) * S).toFixed(1)]; }
    function poly(pts) { return 'M' + pts.map(function (p) { var q = P(p[0], p[1]); return q[0] + ' ' + q[1]; }).join('L') + 'Z'; }
    var W = 780, H = 760;

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function r1(n) { return Math.round(n * 10) / 10; }

    // Length of a quadratic Bézier by sampling (no DOM measurement needed).
    function quadLength(x0, y0, cx, cy, x1, y1) {
        var n = 32, len = 0, px = x0, py = y0;
        for (var i = 1; i <= n; i++) {
            var t = i / n, u = 1 - t;
            var x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
            len += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py)); px = x; py = y;
        }
        return len;
    }

    var LABEL_POS = {
        r: [9, 3.5, 'start'], l: [-9, 3.5, 'end'],
        ur: [9, -8, 'start'], ul: [-9, -8, 'end'],
        dr: [9, 15, 'start'], dl: [-9, 15, 'end'],
        a: [0, -10, 'middle'], b: [0, 17, 'middle']
    };

    function build(lang) {
        var fr = lang === 'fr';
        var t = {
            title: fr ? 'Carte holographique de l’Afrique — flux de données depuis le Togo vers l’ensemble du continent' : 'Holographic map of Africa — data flows from Togo across the whole continent',
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

        // Flows: track (static soft glow) + halo + solid line drawn via stroke-dashoffset + arrowhead + impact ring.
        var tracks = '', flows = '', nodes = '', labels = '';
        TARGETS.forEach(function (c, i) {
            var p = P(c.lon, c.lat), tx = +p[0], ty = +p[1];
            var mx = (ox + tx) / 2, my = (oy + ty) / 2;
            var dx = tx - ox, dy = ty - oy, len = Math.sqrt(dx * dx + dy * dy) || 1;
            var nx = -dy / len, ny = dx / len; // normal
            var k = c.bend * S;
            var cx = r1(mx + nx * k), cy = r1(my + ny * k);
            var d = 'M' + ox + ' ' + oy + 'Q' + cx + ' ' + cy + ' ' + tx + ' ' + ty;
            var L = Math.ceil(quadLength(ox, oy, cx, cy, tx, ty)) + 2;
            // Tangent at the end of the arc → arrowhead orientation.
            var ex = tx - cx, ey = ty - cy, el = Math.sqrt(ex * ex + ey * ey) || 1;
            var ux = ex / el, uy = ey / el;
            var ang = r1(Math.atan2(uy, ux) * 180 / Math.PI);
            var hs = Math.max(0.62, Math.min(1, L / 90)); // smaller arrowhead on very short arcs (Ghana, Benin)
            var hx = r1(tx - ux * 3.5 * hs), hy = r1(ty - uy * 3.5 * hs);
            var name = fr ? c.fr : c.en;

            tracks += '<path class="hm-track" data-flow="' + i + '" fill="none" d="' + d + '"/>';
            flows +=
                '<g class="hm-flow" data-flow="' + i + '" style="--len:' + L + 'px">' +
                '<path class="hm-halo" fill="none" d="' + d + '"/>' +
                '<path class="hm-line" fill="none" d="' + d + '"/>' +
                '<g transform="translate(' + hx + ' ' + hy + ') rotate(' + ang + ') scale(' + r1(hs) + ')">' +
                '<path class="hm-headHalo" d="M1.5 0L-12 -6L-9 0L-12 6Z"/>' +
                '<path class="hm-head" d="M0 0L-10 -4.4L-7.6 0L-10 4.4Z"/>' +
                '</g>' +
                '<circle class="hm-impact" cx="' + tx + '" cy="' + ty + '" r="5" fill="none"/>' +
                '</g>';
            nodes +=
                '<g class="hm-node" data-flow="' + i + '" transform="translate(' + tx + ' ' + ty + ')">' +
                '<circle class="hm-nodeGlow" r="9" fill="#4dffa6"/>' +
                '<circle class="hm-ring" fill="none" r="5.5"/>' +
                '<circle class="hm-dot" r="2.8" fill="#d9ffe9"/></g>';
            var lp = (typeof c.lp === 'string' ? LABEL_POS[c.lp] : c.lp) || LABEL_POS.r;
            labels += '<text class="hm-label" data-flow="' + i + '" x="' + r1(tx + lp[0]) + '" y="' + r1(ty + lp[1]) + '" text-anchor="' + lp[2] + '">' + esc(name.toUpperCase()) + '</text>';
        });

        var hub =
            '<g class="hm-hub" transform="translate(' + ox + ' ' + oy + ')">' +
            '<circle class="hm-hubGlow" r="34" fill="url(#hmGlow)"/>' +
            '<circle class="hm-burst" fill="none" r="8"/><circle class="hm-burst" fill="none" r="8"/>' +
            '<circle class="hm-pulse" fill="none" r="8"/>' +
            '<circle r="5.5" fill="#ffffff" filter="url(#hmNeon)"/>' +
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
            defs + '<rect width="' + W + '" height="' + H + '" fill="url(#hmGrid)" opacity=".5"/>' + land +
            '<g class="hm-tracks">' + tracks + '</g><g class="hm-flows">' + flows + '</g><g class="hm-nodes">' + nodes + '</g><g class="hm-labels">' + labels + '</g>' +
            hub + hudFrame +
            '</svg><div class="hm-base"></div></div>' + legend;
    }

    // --- Sequencer: one arrow every EMIT_EVERY ms, looping over all destinations --------------
    function Sequencer(root) {
        var self = this;
        this.root = root;
        this.hub = root.querySelector('.hm-hub');
        this.bursts = root.querySelectorAll('.hm-burst');
        this.burstIdx = 0;
        this.idx = 0;
        this.timer = null;
        this.beatTimer = null;
        this.running = false;
        this.flows = [];
        var groups = root.querySelectorAll('.hm-flow');
        var maxLen = 1;
        for (var i = 0; i < groups.length; i++) maxLen = Math.max(maxLen, parseFloat(groups[i].style.getPropertyValue('--len')) || 1);
        for (var j = 0; j < groups.length; j++) {
            var g = groups[j], id = g.getAttribute('data-flow');
            var L = parseFloat(g.style.getPropertyValue('--len')) || maxLen;
            var dur = Math.round(DRAW_MIN + (DRAW_MAX - DRAW_MIN) * (L / maxLen));
            g.style.setProperty('--dur', dur + 'ms');
            this.flows.push({
                g: g, dur: dur, timers: [],
                track: root.querySelector('.hm-track[data-flow="' + id + '"]'),
                node: root.querySelector('.hm-node[data-flow="' + id + '"]'),
                label: root.querySelector('.hm-label[data-flow="' + id + '"]')
            });
        }
        this.emit = function () { self._emit(); };
    }
    Sequencer.prototype._clearFlow = function (f) {
        while (f.timers.length) clearTimeout(f.timers.pop());
        f.g.classList.remove('is-drawing', 'is-on', 'is-fading');
        if (f.track) f.track.classList.remove('is-active');
        if (f.node) f.node.classList.remove('is-active');
        if (f.label) f.label.classList.remove('is-active');
    };
    Sequencer.prototype._beat = function () {
        var self = this;
        if (this.bursts.length) {
            var b = this.bursts[this.burstIdx % this.bursts.length];
            this.burstIdx++;
            // The other burst ring is reset so its animation can restart on the next beat.
            for (var i = 0; i < this.bursts.length; i++) if (this.bursts[i] !== b) this.bursts[i].classList.remove('is-on');
            b.classList.add('is-on');
        }
        if (this.hub) {
            clearTimeout(this.beatTimer);
            this.hub.classList.add('is-beat');
            this.beatTimer = setTimeout(function () { self.hub.classList.remove('is-beat'); }, 360);
        }
    };
    Sequencer.prototype._emit = function () {
        if (!this.flows.length) return;
        var f = this.flows[this.idx];
        this.idx = (this.idx + 1) % this.flows.length;
        this._clearFlow(f);
        this._beat();
        // Flush the idle style once (a single style recalc every 2 s — no per-frame layout work) so the
        // dashoffset transition always restarts from the hub, even if this flow was reset just now.
        if (window.getComputedStyle) void window.getComputedStyle(f.g).opacity;
        f.g.classList.add('is-drawing');
        if (f.track) f.track.classList.add('is-active');
        f.timers.push(setTimeout(function () {
            f.g.classList.add('is-on');
            if (f.node) f.node.classList.add('is-active');
            if (f.label) f.label.classList.add('is-active');
        }, f.dur));
        f.timers.push(setTimeout(function () {
            f.g.classList.add('is-fading');
            if (f.track) f.track.classList.remove('is-active');
            if (f.node) f.node.classList.remove('is-active');
            if (f.label) f.label.classList.remove('is-active');
        }, f.dur + HOLD));
        f.timers.push(setTimeout(function () {
            f.g.classList.remove('is-drawing', 'is-on', 'is-fading');
        }, f.dur + HOLD + FADE));
    };
    Sequencer.prototype.start = function () {
        if (this.running) return;
        this.running = true;
        this._emit();
        this.timer = setInterval(this.emit, EMIT_EVERY);
    };
    Sequencer.prototype.stop = function () {
        if (!this.running) return;
        this.running = false;
        clearInterval(this.timer); this.timer = null;
        clearTimeout(this.beatTimer);
        if (this.hub) this.hub.classList.remove('is-beat');
        for (var i = 0; i < this.bursts.length; i++) this.bursts[i].classList.remove('is-on');
        for (var j = 0; j < this.flows.length; j++) this._clearFlow(this.flows[j]);
    };

    function init() {
        var els = document.querySelectorAll('.holoMap');
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        var reduced = !!(reduce && reduce.matches);
        var items = [];

        for (var i = 0; i < els.length; i++) {
            if (els[i].getAttribute('data-ready')) continue;
            var lang = els[i].getAttribute('data-lang') || document.documentElement.lang || 'en';
            els[i].innerHTML = build(lang.slice(0, 2).toLowerCase());
            els[i].setAttribute('data-ready', '1');
            items.push({ el: els[i], seq: new Sequencer(els[i]), visible: false });
        }

        function sync(item) {
            if (reduced) { item.el.classList.add('is-static'); item.seq.stop(); return; }
            item.el.classList.remove('is-static');
            if (item.visible && !document.hidden) item.seq.start(); else item.seq.stop();
        }

        // Start animations only when visible (saves battery, restarts the intro nicely)
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    e.target.classList.toggle('is-live', e.isIntersecting);
                    for (var k = 0; k < items.length; k++) if (items[k].el === e.target) { items[k].visible = e.isIntersecting; sync(items[k]); }
                });
            }, { threshold: 0.2 });
            for (var j = 0; j < items.length; j++) io.observe(items[j].el);
        } else {
            for (var k = 0; k < items.length; k++) { items[k].el.classList.add('is-live'); items[k].visible = true; sync(items[k]); }
        }

        // Pause in background tabs (timers get throttled → avoids a burst of arrows when coming back).
        document.addEventListener('visibilitychange', function () { for (var k = 0; k < items.length; k++) sync(items[k]); });

        if (reduce) {
            var onChange = function (e) { reduced = e.matches; for (var k = 0; k < items.length; k++) sync(items[k]); };
            if (reduce.addEventListener) reduce.addEventListener('change', onChange); else if (reduce.addListener) reduce.addListener(onChange);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
