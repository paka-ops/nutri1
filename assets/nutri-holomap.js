/* NUTRI.N°1 — Holographic Africa map with animated flows from Togo to West Africa.
   Pure SVG (resolution independent → crisp at 4K). Injected into any element with class "holoMap".
   Set data-lang="fr" for French labels. */
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
    var TARGETS = [
        { name: 'Ghana', lon: -0.19, lat: 5.6, bend: -1.6 },
        { name: "Côte d'Ivoire", lon: -4.0, lat: 5.35, bend: -3 },
        { name: 'Burkina Faso', lon: -1.52, lat: 12.37, bend: 2 },
        { name: 'Niger', lon: 2.12, lat: 13.51, bend: 3 },
        { name: 'Bénin', lon: 2.43, lat: 6.37, bend: -1.2 },
        { name: 'Mali', lon: -8.0, lat: 12.65, bend: 4 },
        { name: 'Sénégal', lon: -17.45, lat: 14.7, bend: 6 },
        { name: 'Nigeria', lon: 7.5, lat: 9.06, bend: 2.5 },
        { name: 'Guinée', lon: -13.7, lat: 9.5, bend: -3.5 }
    ];

    // --- Projection: (lon,lat) → SVG px. Frame focused on West Africa + whole continent visible.
    var LON0 = -23, LAT0 = 39, S = 10;
    function P(lon, lat) { return [((lon - LON0) * S).toFixed(1), ((LAT0 - lat) * S).toFixed(1)]; }
    function poly(pts) { return 'M' + pts.map(function (p) { var q = P(p[0], p[1]); return q[0] + ' ' + q[1]; }).join('L') + 'Z'; }
    var W = 780, H = 760;

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

    function build(lang) {
        var fr = lang === 'fr';
        var t = {
            title: fr ? 'Carte holographique de l’Afrique — flux de données depuis le Togo vers l’Afrique de l’Ouest' : 'Holographic map of Africa — data flows from Togo to West Africa',
            hub: fr ? 'HUB • TOGO' : 'HUB • TOGO',
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
            '<marker id="hmArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#b8ffd9"/></marker>' +
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

        // Flows
        var flows = '', nodes = '', labels = '';
        TARGETS.forEach(function (c, i) {
            var p = P(c.lon, c.lat), tx = +p[0], ty = +p[1];
            var mx = (ox + tx) / 2, my = (oy + ty) / 2;
            var dx = tx - ox, dy = ty - oy, len = Math.sqrt(dx * dx + dy * dy) || 1;
            var nx = -dy / len, ny = dx / len; // normal
            var k = c.bend * S;
            var cx = (mx + nx * k).toFixed(1), cy = (my + ny * k).toFixed(1);
            var d = 'M' + ox + ' ' + oy + 'Q' + cx + ' ' + cy + ' ' + tx + ' ' + ty;
            var delay = (i * 0.55).toFixed(2) + 's';
            flows +=
                '<g class="hm-flow" style="--d:' + delay + '">' +
                '<path class="hm-track" fill="none" d="' + d + '"/>' +
                '<path class="hm-line" fill="none" d="' + d + '" marker-end="url(#hmArrow)"/>' +
                '<circle class="hm-packet" r="3.2"><animateMotion dur="2.6s" begin="' + delay + '" repeatCount="indefinite" path="' + d + '" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/></circle>' +
                '<circle class="hm-packet hm-packet2" r="2"><animateMotion dur="2.6s" begin="' + (i * 0.55 + 0.35).toFixed(2) + 's" repeatCount="indefinite" path="' + d + '" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/></circle>' +
                '</g>';
            nodes +=
                '<g class="hm-node" style="--d:' + delay + '" transform="translate(' + tx + ' ' + ty + ')">' +
                '<circle class="hm-ring" fill="none" r="4"/><circle class="hm-ring hm-ring2" fill="none" r="4"/>' +
                '<circle r="3" fill="#d9ffe9"/></g>';
            var anchor = tx < ox ? 'end' : 'start', off = tx < ox ? -9 : 9;
            var lift = (c.name === 'Ghana' || c.name === 'Bénin' || c.name === "Côte d'Ivoire" || c.name === 'Guinée') ? 16 : -9;
            labels += '<text class="hm-label" x="' + (tx + off) + '" y="' + (ty + lift) + '" text-anchor="' + anchor + '">' + esc(c.name.toUpperCase()) + '</text>';
        });

        var hub =
            '<g class="hm-hub" transform="translate(' + ox + ' ' + oy + ')">' +
            '<circle r="34" fill="url(#hmGlow)"/>' +
            '<circle class="hm-pulse" fill="none" r="8"/><circle class="hm-pulse hm-pulse2" fill="none" r="8"/><circle class="hm-pulse hm-pulse3" fill="none" r="8"/>' +
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
            defs + '<rect width="' + W + '" height="' + H + '" fill="url(#hmGrid)" opacity=".5"/>' + land + flows + nodes + labels + hub + hudFrame +
            '</svg><div class="hm-base"></div></div>' + legend;
    }

    function init() {
        var els = document.querySelectorAll('.holoMap');
        for (var i = 0; i < els.length; i++) {
            if (els[i].getAttribute('data-ready')) continue;
            var lang = els[i].getAttribute('data-lang') || document.documentElement.lang || 'en';
            els[i].innerHTML = build(lang.slice(0, 2).toLowerCase());
            els[i].setAttribute('data-ready', '1');
        }
        // Start animations only when visible (saves battery, restarts the intro nicely)
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) { e.target.classList.toggle('is-live', e.isIntersecting); });
            }, { threshold: 0.2 });
            for (var j = 0; j < els.length; j++) io.observe(els[j]);
        } else {
            for (var k = 0; k < els.length; k++) els[k].classList.add('is-live');
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
