/* =============================================================
   NUTRI.N°1 — "4K Immersion" engine
   Purely additive layer: no word is added, removed or reworded.
   It injects decorative (aria-hidden) layers, wraps existing
   heading characters in animation spans (1:1 text preserved)
   and toggles CSS classes. Only existing palette colours used.
   ============================================================= */
(function () {
  'use strict';
  var html = document.documentElement;
  var SELF = document.currentScript || document.querySelector('script[src*="nutri4k.js"]');
  var BASE = (SELF && SELF.getAttribute('src') ? SELF.getAttribute('src') : 'assets/nutri4k.js').replace(/[^/]*$/, '');
  function file(n) { return BASE + 'img/' + n + '.jpg'; }

  /* ---------- capability ---------- */
  var mq = function (q) { return window.matchMedia ? matchMedia(q).matches : false; };
  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var FINE = mq('(hover:hover) and (pointer:fine)');
  var COARSE = !FINE || innerWidth < 860;

  /* ---------- per-page art direction ---------- */
  var CFG = {
    index: {
      hero: { img: 'hero-index', pos: '62% 55%' },
      dark: ['field-aerial'], wash: true,
      /* '.loop .loopbox' intentionally excluded from thumbs and cardBg: the ambition
         loop cards now carry their own clear 4K <img> band (no gradient, no scrim),
         so neither a round thumbnail nor a faded background is injected over them */
      cardBg: {
        /* '.arch .box' and '.grid .stackcard' intentionally excluded: the strategic-architecture
           and intelligence-stack cards now carry their own clear <img> band with no gradient
           scrim, so no faded background image is injected behind their copy */
        '.grid .card:not(.stackcard)': ['field-aerial', 'field-harvest-hands', 'plate-fufu', 'plate-vegetable', 'market-stall', 'plate-grilled-fish']
      }
    },
    platform: {
      hero: { img: 'hero-platform', pos: '58% 50%' },
      dark: ['market-stall'], wash: true,
      thumbs: { '.card': ['null', 'null', 'null', 'plate-kenkey', 'plate-vegetable', 'null'] },
      cardBg: {
        '.grid .card': ['field-sunrise', 'field-aerial', 'solar-roof', 'plate-vegetable', 'field-harvest-hands', 'processing-line', 'plate-kenkey', 'plate-fufu', 'plate-grilled-fish']
      }
    },
    intelligence: {
      hero: { img: 'hero-intelligence', pos: '60% 50%' },
      dark: ['field-aerial'], wash: true,
      thumbs: { '.card': ['plate-vegetable', 'market-stall', 'plate-kenkey', 'field-harvest-hands', 'plate-fufu', 'plate-grilled-fish'] },
      cardBg: {
        '.grid .card': ['field-aerial', 'field-harvest-hands', 'plate-fufu', 'market-stall', 'solar-roof', 'processing-line', 'plate-vegetable', 'plate-kenkey', 'plate-grilled-fish']
      }
    },
    ecosystem: {
      hero: { img: 'hero-ecosystem', pos: '58% 50%' },
      dark: ['field-aerial', 'processing-line'], wash: true,
      /* '.grid .card.stake' and '.grid .card.gov' intentionally excluded from
         thumbs and cardBg: the four stakeholder cards and the three Government
         Intelligence cards carry their own clear 4K photo band (no gradient, no
         scrim) with the theme text set over the photo, so neither a round
         thumbnail nor a faded background is injected over them */
      thumbs: { '.grid .card:not(.stake):not(.gov)': ['market-stall', 'solar-roof'] },
      cardBg: {
        '.grid .card:not(.stake):not(.gov)': ['processing-line', 'market-stall', 'field-sunrise']
      }
    },
    agribusiness: {
      hero: { img: 'hero-agribusiness', pos: '58% 55%' },
      dark: ['field-harvest-hands', 'processing-line', 'market-stall'], wash: true,
      thumbs: {
        '.p2f-card': ['field-sunrise', 'field-aerial', 'field-harvest-hands', 'market-stall', 'plate-vegetable', 'solar-roof',
          'plate-kenkey', 'processing-line', 'solar-roof', 'processing-line', 'plate-vegetable', 'market-stall',
          'market-stall', 'plate-fufu', 'plate-grilled-fish', 'field-aerial', 'processing-line', 'plate-vegetable'],
        /* section 04 chain cards — one dedicated photo per step:
           HARVEST / COLLECT / COOL / PROCESS / DISTRIBUTE */
        '.p2f-chain-card': ['chain-harvest', 'chain-collect', 'chain-cool', 'chain-process', 'chain-distribute']
      },
      cardBg: {
        '.p2f-cards .p2f-card': [
          'field-sunrise', 'field-aerial', 'solar-roof', 'field-harvest-hands', 'market-stall', 'processing-line',
          'plate-vegetable', 'processing-line', 'solar-roof', 'solar-roof', 'plate-kenkey', 'plate-grilled-fish',
          'market-stall', 'field-aerial', 'plate-fufu', 'processing-line', 'plate-grilled-fish', 'plate-vegetable'
        ],
        '.p2f-chain .p2f-chain-card': [
          'chain-harvest', 'chain-collect', 'chain-cool', 'chain-process', 'chain-distribute'
        ],
        /* panels 1-2: section 02 (producer→market, surplus) —
           the two section 04 panels (.cold) carry their own clear 4K photo band
           (no gradient, no scrim), so no faded background is injected over them */
        '.p2f-panel:not(.cold)': ['field-harvest-hands', 'market-stall']
      }
    },
    team: {
      hero: { img: 'hero-team', pos: '62% 55%' },
      dark: ['processing-line'], wash: true,
      cardBg: {
        '.grid .card': ['field-harvest-hands', 'processing-line', 'field-aerial', 'field-sunrise', 'plate-vegetable', 'market-stall']
      }
    }
  };
  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html?.*$/, '') || 'index';
  var cfg = CFG[PAGE] || { dark: [], wash: true, thumbs: {} };

  /* ---------- tiny helpers ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, cls, parent) { var d = document.createElement(tag); if (cls) d.className = cls; if (parent) parent.appendChild(d); return d; }
  function svg(tag, at) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); return e; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function each(list, fn) { for (var i = 0; i < list.length; i++) { try { fn(list[i], i); } catch (e) { if (window.console) console.debug('[n4k]', e); } } }
  function mod(name, fn) { try { fn(); } catch (e) { if (window.console) console.debug('[n4k:' + name + ']', e); } }

  /* ---------- single rAF ticker + shared scroll state ---------- */
  var PER = [];           /* every frame */
  var SCR = [];           /* only when the scroll geometry changed */
  var SC = { y: 0, h: 0, doc: 1, dirty: true, seq: 0 };
  var last = 0, on = false;
  function frame(now) {
    var dt = Math.min(48, (now - last) || 16); last = now;
    if (!document.hidden) {
      if (SC.dirty) {
        SC.dirty = false; SC.seq++;
        SC.y = window.pageYOffset || html.scrollTop || 0;
        SC.h = innerHeight;
        SC.doc = Math.max(1, Math.max(document.body.scrollHeight, html.scrollHeight) - SC.h);
        for (var i = 0; i < SCR.length; i++) { try { SCR[i](SC); } catch (e) { } }
      }
      for (var j = 0; j < PER.length; j++) { try { PER[j](now, dt); } catch (e) { } }
    }
    requestAnimationFrame(frame);
  }
  function start() { if (!on) { on = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', function () { SC.dirty = true; }, { passive: true });
  addEventListener('resize', function () { SC.dirty = true; }, { passive: true });
  addEventListener('load', function () { SC.dirty = true; });

  /* parallax: --n4k-syp (px) driven by distance from viewport centre */
  function parallax(node, k) {
    if (!node) return;
    var o = { node: node, k: k };
    SCR.push(function () {
      var r = o.node.getBoundingClientRect();
      o.node.style.setProperty('--n4k-syp', ((r.top + r.height / 2 - SC.h / 2) * o.k).toFixed(2));
    });
  }

  /* =========================================================
     1 · cinematic full-page layers
     ========================================================= */
  mod('fx', function () {
    var body = document.body;
    if (REDUCE) { html.classList.add('n4k-reduce'); }
    else {
      var fx = mk('div', 'n4k-fx', body); fx.id = 'n4k-fx'; fx.setAttribute('aria-hidden', 'true');
      var rays = mk('div', 'n4k-rays', fx);
      mk('div', 'n4k-ray r1', rays); mk('div', 'n4k-ray r2', rays); mk('div', 'n4k-ray r3', rays);
      mk('div', 'n4k-vig', fx);
      mk('div', 'n4k-grain', fx);
      var scan = mk('div', 'n4k-scan', body); scan.setAttribute('aria-hidden', 'true'); mk('i', '', scan);
      var wipe = mk('div', '', body); wipe.id = 'n4k-wipe'; wipe.setAttribute('aria-hidden', 'true'); mk('i', '', wipe);
      html.classList.add('n4k-boot');
      setTimeout(function () { html.classList.remove('n4k-boot'); }, 700);
    }
  });

  /* drifting data motes — blend mode adapts to dark vs light sections */
  mod('dust', function () {
    if (REDUCE || COARSE) return;
    var c = mk('canvas', '', document.body); c.id = 'n4k-dust'; c.setAttribute('aria-hidden', 'true');
    var x = c.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1), W = 0, H = 0, ps = [], bands = [];
    function sections() {
      bands = $$('section').map(function (s) {
        var r = s.getBoundingClientRect(), top = r.top + (window.pageYOffset || 0);
        return { a: top, b: top + r.height, dark: !!(s.className.match(/dark|hero/) || s.closest('.p2f-dark,.v5-dark')) };
      });
    }
    function mote() {
      return { x: Math.random() * W, y: Math.random() * H, r: .5 + Math.random() * 2, s: .05 + Math.random() * .3,
        a: .07 + Math.random() * .3, ph: Math.random() * 6.283, amp: 6 + Math.random() * 26, gold: Math.random() < .3 };
    }
    function size() {
      W = innerWidth; H = innerHeight;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      c.style.width = W + 'px'; c.style.height = H + 'px';
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      ps = []; var n = Math.round(clamp(W / 30, 24, 54));
      for (var i = 0; i < n; i++) ps.push(mote());
      sections();
    }
    function darkAt(docY) {
      for (var i = 0; i < bands.length; i++) if (docY >= bands[i].a && docY < bands[i].b) return bands[i].dark;
      return true;
    }
    size();
    SCR.push(sections);
    tick();
    function tick() {
      var acc = 0;
    PER.push(function (now, dt) {
        acc += dt; if (acc < 32) return; acc = 0;
        x.clearRect(0, 0, W, H);
        var t = now / 1000;
        x.globalCompositeOperation = 'screen';
        for (var pass = 0; pass < 2; pass++) {
          if (pass) x.globalCompositeOperation = 'multiply';
          for (var i = 0; i < ps.length; i++) {
            var p = ps[i];
            if (!pass) { p.y -= p.s; if (p.y < -14) { p.y = H + 14; p.x = Math.random() * W; } }
            var dx = p.x + Math.sin(t * .3 + p.ph) * p.amp, dy = p.y + Math.cos(t * .22 + p.ph) * p.amp * .5;
            if ((pass ? darkAt(SC.y + p.y) : !darkAt(SC.y + p.y))) continue;
            var glow = .55 + .45 * Math.sin(t * 1.15 + p.ph);
            if (!pass) {
              var g = x.createRadialGradient(dx, dy, 0, dx, dy, p.r * 9);
              g.addColorStop(0, 'rgba(' + (p.gold ? '229,184,90,' : '41,207,112,') + (p.a * glow).toFixed(3) + ')');
              g.addColorStop(1, 'rgba(41,207,112,0)');
              x.fillStyle = g; x.beginPath(); x.arc(dx, dy, p.r * 9, 0, 6.283); x.fill();
            } else {
              x.fillStyle = 'rgba(11,33,23,' + (p.a * .16 * glow).toFixed(3) + ')';
              x.beginPath(); x.arc(dx, dy, p.r * 1.7, 0, 6.283); x.fill();
            }
          }
        }
        x.globalCompositeOperation = 'source-over';
      });
    }
    addEventListener('resize', size, { passive: true });
  });

  /* =========================================================
     2 · photography (fields + Togolese plates) & ambient wash
     ========================================================= */
  function photo(host, name, o) {
    o = o || {};
    var wrap = mk('div', 'n4k-photo' + (o.cls ? ' ' + o.cls : ''), host);
    wrap.setAttribute('aria-hidden', 'true');
    var im = mk('img', '', wrap);
    im.src = file(name); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
    if (o.pos) wrap.style.setProperty('--n4k-pos', o.pos);
    if (o.shade) wrap.style.setProperty('--n4k-sh', o.shade);
    if (o.opacity != null) wrap.style.setProperty('--n4k-po', o.opacity);
    if (o.dur) wrap.style.setProperty('--n4k-kbd', o.dur);
    if (o.bright != null) wrap.style.setProperty('--n4k-kbb', o.bright);
    host.style.isolation = 'isolate';
    requestAnimationFrame(function () { host.classList.add('n4k-photo-on'); });
    return wrap;
  }
  mod('photos', function () {
    var hero = $('section.hero,section.p2f-hero,section.v5-hero,section.p2x-hero');
    if (hero && cfg.hero) {
      /* la couche photo du hero est désormais écrite en dur dans le HTML
         (LQIP + <img fetchpriority="high">) : elle s'affiche dès le premier
         rendu. On la réutilise telle quelle au lieu d'en créer une seconde. */
      var hp = $('.n4k-photo--hero', hero);
      if (hp) {
        hero.style.isolation = 'isolate';
        hero.classList.add('n4k-photo-on');
      } else {
        hp = photo(hero, cfg.hero.img, {
          pos: cfg.hero.pos, opacity: .96, dur: '36s', bright: 1,
          shade: 'linear-gradient(96deg,#061b13f2 0%,#061b13e6 24%,#061b1399 46%,#061b1333 68%,#03140c14 100%),linear-gradient(180deg,#061b13bf 0%,#061b131a 42%,#03140c40 100%),radial-gradient(circle at 74% 26%,#29cf701f,transparent 44%)'
        });
      }
      parallax(hp, .05);
      parallax($('.art, .p2f-visual, .p2x-visual, .v4-orb, .v5-orb', hero), .12);
    }
    each($$('section.dark,section.p2f-dark,section.v5-dark,section.p2x-dark'), function (s, i) {
      var f = (cfg.dark || [])[i]; if (!f) return;
      parallax(photo(s, f, { opacity: .16, bright: .74, dur: '52s', shade: 'linear-gradient(180deg,#061b1359,#03140c4d)' }), .02);
    });
    if (cfg.wash) {
      each($$('section.light,section.p2f-light,section.v5-light'), function (s) {
        var w = mk('div', 'n4k-wash', s); w.setAttribute('aria-hidden', 'true');
        mk('b', 'b1', w); mk('b', 'b2', w); mk('b', 'b3', w);
      });
    }
    var cta = $('.ctaBox');
    if (cta && cfg.cta) parallax(photo(cta, cfg.cta, { opacity: .42, dur: '44s', bright: 1.03, shade: 'linear-gradient(120deg,#f5f4edf5,#f5f6efbc 48%,#fff5dce3)' }), .015);
  });

  mod('thumbs', function () {
    var map = cfg.thumbs || {};
    Object.keys(map).forEach(function (sel) {
      var list = map[sel] || [];
      each($$(sel), function (node, i) {
        var f = list[i]; if (!f || f === 'null') return;
        var t = mk('span', 'n4k-thumb' + (cfg.thumbSize === 'lg' ? ' n4k-thumb--lg' : ''), node);
        node.classList.add('n4k-hasthumb');
        if (cfg.thumbSize === 'lg') node.classList.add('n4k-thumb-lg');
        if (node.matches('.p2f-chain-card,.p2x-chain-card')) { node.classList.add('n4k-band'); t.classList.add('n4k-thumb--band'); }
        t.setAttribute('aria-hidden', 'true');
        var im = mk('img', '', t); im.src = file(f); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
        t.style.setProperty('--n4k-rvd', (Math.min(i, 9) * 10) + 'ms');
      });
    });
  });

  /* =========================================================
     3 · reveal engine + word masks
     ========================================================= */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    each(es, function (en) { if (en.isIntersecting) { io.unobserve(en.target); en.target.classList.add('n4k-in'); } });
  }, { threshold: .02, rootMargin: '0px 0px -6% 0px' }) : null;
  function reveal(node, delay) {
    if (!node || node.classList.contains('n4k-rv')) return;
    node.classList.add('n4k-rv');
    if (delay != null) node.style.setProperty('--n4k-rvd', delay + 'ms');
    if (REDUCE || !io) node.classList.add('n4k-in'); else io.observe(node);
  }
  /* headings whose colour comes from a gradient clipped to the glyphs must never
     be split: a filter/transform on a child creates its own stacking context and
     the clipped gradient stops following the glyphs (flicker / invisible words) */
  function clipsText(el) {
    if (!el) return false;
    try {
      var cs = getComputedStyle(el);
      if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') return true;
      var f = cs.webkitTextFillColor || '';
      return /rgba\(0,\s*0,\s*0,\s*0\)|transparent/.test(f);
    } catch (e) { return false; }
  }
  /* wrap each word of a heading in a mask span — text itself is untouched */
  function words(host) {
    if (!host || host._n4kw) return; host._n4kw = 1;
    var texts = [], walker, i;
    try {
      walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          var p = n.parentNode, tg = p && p.nodeName;
          return (tg && tg !== 'SCRIPT' && tg !== 'STYLE') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      while (walker.nextNode()) texts.push(walker.currentNode);
    } catch (e) { return; }
    var idx = 0;
    for (i = 0; i < texts.length; i++) {
      var tn = texts[i], parts = tn.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
      for (var k = 0; k < parts.length; k++) {
        var w = parts[k]; if (!w) continue;
        if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); continue; }
        var s = mk('span', 'n4k-w'), inner = mk('i', '', s);
        inner.textContent = w;
        s.style.setProperty('--w', idx++);
        frag.appendChild(s);
      }
      if (tn.parentNode) tn.parentNode.replaceChild(frag, tn);
    }
  }
  mod('seams', function () {
    /* hairline seams + a light glint between chapters, and a hero scroll cue */
    var secs = $$('section');
    each(secs.slice(1), function (s) {
      if (!$('.n4k-div', s)) { var d = mk('div', 'n4k-div', s); d.setAttribute('aria-hidden', 'true'); mk('i', '', d); }
    });
    var hero = $('section.hero,section.p2f-hero,section.v5-hero,section.p2x-hero');
    if (hero) {
      var hint = mk('div', 'n4k-hint', hero); hint.setAttribute('aria-hidden', 'true'); mk('i', '', hint);
      hint.addEventListener('click', function () {
        var next = secs[1] || secs[0]; if (next) goTo(next);
      });
      var hide = function () { if ((window.pageYOffset || 0) > 90) hint.classList.add('n4k-hide'); else hint.classList.remove('n4k-hide'); };
      SCR.push(hide); addEventListener('wheel', hide, { passive: true });
    }
  });

  mod('reveal', function () {
    /* take ownership of the legacy half-wired reveal (.v4-reveal has no observer on
       every page) so no block stays offset. Text is untouched. */
    each($$('.v4-reveal'), function (n) {
      n.classList.remove('v4-reveal'); n.style.opacity = ''; n.style.transform = ''; n.style.transition = '';
    });
    /* the CTA block ("Let's build the future of nutrition in Africa.") uses a
       gradient clipped to the text (background-clip:text). Splitting it into
       per-word spans that each get their own transform/blur breaks that paint:
       the glyphs detach from the gradient and the line jitters word by word.
       Those blocks get one calm, coherent fade-up instead. */
    each($$('.ctaBox .kicker,.ctaBox h2,.ctaBox p,.ctaBox .btn'), function (n, i) {
      n.classList.add('n4k-soft');
      reveal(n, 16 + i * 34);
    });
    each($$('section.hero h1,section.p2f-hero h1,section.v5-hero h1,.head h2,.v5-head h2,.p2f-head h2,.p2x-head h2,.cloud h2,.ctaBox h2,.head p,.v5-head p,.p2f-head p,.ctaBox p,.loopbox h3,.box h3,.p2f-panel h3,.p2f-chain-card strong'), function (h) {
      if ((h.textContent || '').trim().length > 320) return;
      if (h.classList.contains('n4k-soft') || clipsText(h)) { reveal(h, 16); return; }
      words(h); reveal(h, 16);
    });
    each($$('.head,.v5-head,.p2f-head,.p2x-head'), function (n) { reveal(n, 0); });
    /* stagger the children of every group, strictly following the DOM order of
       the section (a picture comes before the copy it illustrates in the HTML,
       so revealing rows top-to-bottom keeps that same image → background-image →
       text sequence readable). Delays are short so a full row settles quickly. */
    each($$('.grid,.p2f-cards,.teamGrid,.v5-team,.arch,.loop,.p2f-chain,.p2f-loop,.p2f-feature,.p2f-icons,.p2x-cards,.cloud,.flow,.p2x-loop,.v5-flow'), function (g) {
      each($$('.card,.box,.loopbox,.person,.v5-person,.p2f-card,.p2f-panel,.p2f-icon,.p2f-chain-card,.p2x-card,.node', g), function (t, i) {
        reveal(t, Math.min(i, 9) * 26);
      });
    });
    each($$('.p2f-note,.ctaBox,.cloudVisual,.p2f-visual,.art,.v5-demo,.v4-demo,.v4-map'), function (n, i) { reveal(n, Math.min(i, 5) * 22); });
    if ('IntersectionObserver' in window) {
      var sio = new IntersectionObserver(function (es) {
        each(es, function (en) { en.target.classList.toggle('n4k-in-sec', en.isIntersecting); });
      }, { threshold: .05 });
      each($$('section'), function (s) { sio.observe(s); });
    }
  });

  /* =========================================================
     4 · card micro-interaction (tilt, spotlight, magnetic CTAs)
     ========================================================= */
  mod('cards', function () {
    /* "full" cards get the spotlight + gradient-border pseudos; blocks that already
       own ::before/::after (or hold absolutely-positioned children) get the lite
       treatment so nothing of the original design is disturbed. */
    var full = $$('.card,.box,.loopbox,.v5-person,.person,.p2f-panel,.p2x-card');
    var lite = $$('.p2f-chain-card,.p2f-icon,.node,.sat,.p2f-node,.p2f-note,.ctaBox,.cloudVisual');
    each(full, function (c) { c.classList.add('n4k-card'); });
    each(lite, function (c) { c.classList.add('n4k-lite'); });
    var cards = full.concat($$('.p2f-chain-card,.p2f-icon'));
    if (COARSE || REDUCE) return;
    each(cards, function (c) {
      var hot = false, rx = 0, ry = 0, mx = 50, my = 50, q = 0, qx = 0, qy = 0;
      function draw() {
        q = 0;
        rx = lerp(rx, hot ? qy : 0, .22); ry = lerp(ry, hot ? qx : 0, .22);
        mx = lerp(mx, hot ? pmx : 50, .18); my = lerp(my, hot ? pmy : 50, .18);
        c.style.setProperty('--n4k-rx', rx.toFixed(2) + 'deg');
        c.style.setProperty('--n4k-ry', ry.toFixed(2) + 'deg');
        c.style.setProperty('--n4k-sc', hot ? 1.012 : 1);
        c.style.setProperty('--n4k-mx2', mx.toFixed(1) + '%');
        c.style.setProperty('--n4k-my2', my.toFixed(1) + '%');
        if (hot || Math.abs(rx) > .03 || Math.abs(ry) > .03) q = requestAnimationFrame(draw);
      }
      var pmx = 50, pmy = 50;
      c.addEventListener('pointerenter', function () { hot = true; c.classList.add('n4k-tilt'); if (!q) q = requestAnimationFrame(draw); });
      c.addEventListener('pointerleave', function () { hot = false; c.classList.remove('n4k-tilt'); if (!q) q = requestAnimationFrame(draw); });
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        qx = clamp(px * 7, -7, 7); qy = clamp(-py * 6, -6, 6); pmx = 50 + px * 46; pmy = 50 + py * 46;
        if (!q) q = requestAnimationFrame(draw);
      }, { passive: true });
    });
    each($$('.btn'), function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate3d(' + (((e.clientX - r.left) / r.width - .5) * 7).toFixed(1) + 'px,' + (((e.clientY - r.top) / r.height - .5) * 5).toFixed(1) + 'px,0)';
      }, { passive: true });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  });

  /* =========================================================
     5 · animated schematics — flowing wires, packets, radar
     ========================================================= */
  var WIRE = [], seq = 0;
  function build(host, o) {
    if (!host || host._n4k) return;
    var nodes = $$(o.path, host).filter(function (n) { return n.offsetWidth > 6 && n.offsetHeight > 6; });
    if (nodes.length < 2) return;
    host._n4k = 1;
    host.classList.add('n4k-wired');
    var pulses = $$(o.pulse || o.path, host);
    var uid = 'n4kw' + (++seq);
    var svgRoot = svg('svg', { class: 'n4k-wire', 'aria-hidden': 'true' });
    var defs = svg('defs');
    var grad = svg('linearGradient', { id: uid, x1: '0', y1: '0', x2: '1', y2: '0' });
    grad.appendChild(svg('stop', { offset: '0', 'stop-color': '#29cf70', 'stop-opacity': '.9' }));
    grad.appendChild(svg('stop', { offset: '.55', 'stop-color': '#9be766', 'stop-opacity': '.75' }));
    grad.appendChild(svg('stop', { offset: '1', 'stop-color': '#e5b85a', 'stop-opacity': '.9' }));
    defs.appendChild(grad); svgRoot.appendChild(defs);
    host.appendChild(svgRoot);

    var w = { host: host, legs: [], total: 1, s: 0, groups: o.packets || 2, on: false, armed: false, speed: o.speed || 42 };
    var hub = !!o.hub, hubEl = o.hubSel ? $(o.hubSel, host) : null;
    function mid(r, base) { return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 }; }
    function seg(a, b) {
      if (Math.abs(b.y - a.y) > 10) {
        var m = (a.y + b.y) / 2;
        return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'L' + a.x.toFixed(1) + ' ' + m.toFixed(1) + 'L' + b.x.toFixed(1) + ' ' + m.toFixed(1) + 'L' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
      }
      return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + 'L' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    w.layout = function () {
      var hr = host.getBoundingClientRect();
      if (hr.width < 60 || hr.height < 40) { svgRoot.style.display = 'none'; return; }
      svgRoot.style.display = '';
      svgRoot.setAttribute('viewBox', '0 0 ' + hr.width.toFixed(1) + ' ' + hr.height.toFixed(1));
      while (svgRoot.childNodes.length > 1) svgRoot.removeChild(svgRoot.lastChild);
      var pts = nodes.map(function (n) { return mid(n.getBoundingClientRect(), hr); });
      var legs = [];
      if (hub) {
        var c = mid((hubEl || host).getBoundingClientRect(), hr);
        for (var i = 0; i < pts.length; i++) legs.push({ a: c, b: pts[i], node: nodes[i] });
      } else {
        for (var j = 0; j < pts.length - 1; j++) legs.push({ a: pts[j], b: pts[j + 1], node: nodes[j + 1] });
      }
      w.legs = []; w.total = 0;
      for (var k = 0; k < legs.length; k++) {
        var L = legs[k], d = seg(L.a, L.b);
        var glow = svg('path', { class: 'n4k-line n4k-line--glow', d: d }), main = svg('path', { class: 'n4k-line', d: d, stroke: 'url(#' + uid + ')' });
        main.style.transitionDelay = (k * 130) + 'ms'; glow.style.transitionDelay = (k * 130) + 'ms';
        svgRoot.appendChild(glow); svgRoot.appendChild(main);
        var len = 0; try { len = main.getTotalLength() || 0; } catch (e) { }
        len = len || 1;
        [main, glow].forEach(function (p) { p.style.setProperty('--n4k-len', len.toFixed(0)); });
        var leg = { path: main, len: len, off: w.total, b: L.b, node: L.node, pk: [], fired: false };
        for (var g = 0; g < w.groups; g++) {
          var tail = svg('circle', { class: 'n4k-pkt-t', r: 8, cx: -30, cy: -30 });
          var pkt = svg('circle', { class: 'n4k-pkt' + (g % 2 ? ' n4k-pkt--g' : ''), r: 3.2, cx: -30, cy: -30 });
          svgRoot.appendChild(tail); svgRoot.appendChild(pkt);
          leg.pk.push({ el: pkt, tail: tail, g: g });
        }
        w.total += len; w.legs.push(leg);
      }
    };
    function fire(node) {
      var i = pulses.indexOf(node);
      var hit = [];
      if (node) hit.push(node);
      if (i > 0 && pulses[i - 1] !== node) hit.push(pulses[i - 1]);
      each(hit, function (n2) {
        n2.classList.add('n4k-zap');
        setTimeout(function () { n2.classList.remove('n4k-zap'); }, 540);
      });
    }
    w.tick = function (dt) {
      w.s = (w.s + w.speed * dt / 1000) % w.total;
      for (var i = 0; i < w.legs.length; i++) {
        var L = w.legs[i], live = false;
        for (var g = 0; g < L.pk.length; g++) {
          var p = L.pk[g], sg = (w.s + g * w.total / L.pk.length) % w.total, t = (sg - L.off) / L.len;
          if (t < 0 || t >= 1) { p.el.setAttribute('r', 0); p.tail.setAttribute('r', 0); continue; }
          live = true;
          var pt; try { pt = L.path.getPointAtLength(t * L.len); } catch (e) { continue; }
          var r = 3.2 * (hub ? (0.5 + t) : 1);
          p.el.setAttribute('r', r.toFixed(2)); p.el.setAttribute('cx', pt.x.toFixed(1)); p.el.setAttribute('cy', pt.y.toFixed(1));
          p.tail.setAttribute('r', (r * 2.4).toFixed(2)); p.tail.setAttribute('cx', pt.x.toFixed(1)); p.tail.setAttribute('cy', pt.y.toFixed(1));
          if (t > .93 && !L.fired) { fire(L.node); L.fired = true; }
        }
        if (!live) L.fired = false;
      }
    };
    w.layout();
    WIRE.push(w);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        each(es, function (en) {
          w.on = en.isIntersecting;
          if (en.isIntersecting && !w.armed) { w.armed = true; host.classList.add('n4k-wired-on'); }
        });
      }, { threshold: .04 }).observe(host);
    } else { w.on = true; host.classList.add('n4k-wired-on'); }
    if (window.ResizeObserver) new ResizeObserver(function () { SC.dirty = true; w.layout(); }).observe(host);
    SCR.push(function () {
      if (!w.armed) return;
      if (w._seq !== undefined && SC.seq - w._seq < 4 && Math.abs(SC.y - (w._y || 0)) < 8) return;
      w._seq = SC.seq; w._y = SC.y; w.layout();
    });
  }
  mod('wires', function () {
    if (REDUCE) return;
    each($$('.flow'), function (h) { build(h, { path: 'span', pulse: 'span,i', packets: 2, speed: 46 }); });
    each($$('.v5-flow,.v4-loop,.p2x-loop'), function (h) { build(h, { path: '.v5-node,.v4-loop-step,.node', packets: 2, speed: 46 }); });
    each($$('.p2f-loop'), function (h) { build(h, { path: '.node', pulse: '.node,.arr', packets: 2, speed: 54 }); });
    each($$('.p2f-chain'), function (h) { build(h, { path: '.p2f-chain-card', packets: 2, speed: 30 }); });
    each($$('.cloudVisual'), function (h) {
      build(h, { path: '.node', hub: true, hubSel: '.cloudCenter', packets: 1, speed: 66 });
      var rd = mk('div', 'n4k-radar', h); rd.setAttribute('aria-hidden', 'true');
      mk('div', 'n4k-orbit o1', h).setAttribute('aria-hidden', 'true');
      mk('div', 'n4k-orbit o2', h).setAttribute('aria-hidden', 'true');
    });
    each($$('.v4-map,.v5-map'), function (h) {
      build(h, { path: '.node', hub: true, hubSel: '.cloudCenter,.v4-score-circle', packets: 1, speed: 66 });
      mk('div', 'n4k-radar', h).setAttribute('aria-hidden', 'true');
    });
    each($$('.art,.p2f-visual,.p2x-visual,.v4-orb,.v5-orb'), function (h) {
      build(h, { path: '.sat,.p2f-node,.p2x-node,.v5-float', hub: true, hubSel: '.core,.p2f-core,.p2x-core,.v4-orb .planet,.v5-core', packets: 1, speed: 52 });
      mk('div', 'n4k-halo h1', h).setAttribute('aria-hidden', 'true');
      mk('div', 'n4k-halo h2', h).setAttribute('aria-hidden', 'true');
      mk('div', 'n4k-halo h3', h).setAttribute('aria-hidden', 'true');
    });
    PER.push(function (now, dt) { for (var i = 0; i < WIRE.length; i++) if (WIRE[i].on) WIRE[i].tick(dt); });
  });

  /* =========================================================
     6 · chrome : progress bar, section rail, nav, cursor, scroll
     ========================================================= */
  function smoothTo(to) {
    if (REDUCE) { window.scrollTo(0, to); return; }
    var from = window.pageYOffset || 0, dist = to - from, dur = clamp(Math.abs(dist) / .8, 420, 1150), t0 = 0, id;
    cancelAnimationFrame(window.__n4ksc || 0);
    function step(ts) {
      if (!t0) t0 = ts;
      var p = clamp((ts - t0) / dur, 0, 1);
      var e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, from + dist * e);
      if (p < 1) id = requestAnimationFrame(step);
      SC.dirty = true;
    }
    window.__n4ksc = id;
    requestAnimationFrame(step);
  }
  function goTo(node) {
    if (!node) return;
    smoothTo(node.getBoundingClientRect().top + (window.pageYOffset || 0) - 64);
  }
  mod('chrome', function () {
    var body = document.body;
    var bar = mk('div', '', body); bar.id = 'n4k-progress'; bar.setAttribute('aria-hidden', 'true');
    var fill = mk('i', '', bar);
    var secs = $$('section');
    var rail = mk('div', '', body); rail.id = 'n4k-rail'; rail.setAttribute('aria-hidden', 'true');
    var dots = each(secs, function (s, i) {
      var d = mk('u', '', rail);
      d.addEventListener('click', function () { goTo(s); });
      return d;
    });
    dots = $$('u', rail);
    var nav = $('.nav'), cur = -1;
    SCR.push(function () {
      var p = clamp(SC.y / SC.doc, 0, 1);
      fill.style.width = (p * 100).toFixed(2) + '%';
      rail.style.setProperty('--n4k-railp', p.toFixed(3));
      if (nav) nav.classList.toggle('n4k-stuck', SC.y > 26);
      var best = 0, bd = 1e9;
      for (var i = 0; i < secs.length; i++) {
        var r = secs[i].getBoundingClientRect();
        if (r.bottom <= 4 || r.top >= SC.h - 4) continue;
        var d = Math.abs(r.top + r.height / 2 - SC.h / 2) / Math.max(1, r.height);
        if (d < bd) { bd = d; best = i; }
      }
      if (best !== cur) { cur = best; each(dots, function (d, i) { d.classList.toggle('on', i === cur); }); }
    });
    setTimeout(function () { html.classList.add('n4k-lit'); }, 380);
  });

  mod('nav', function () {
    var links = $('.links'); if (!links) return;
    var ind = mk('span', 'n4k-navind', links); ind.setAttribute('aria-hidden', 'true');
    var here = location.pathname.split('/').pop() || 'index.html';
    var anchors = $$('a', links), cur = null;
    each(anchors, function (a) {
      var h = (a.getAttribute('href') || '').split('/').pop().split('#')[0];
      if (h === here) { a.classList.add('n4k-cur'); if (!cur) cur = a; }
    });
    function place(a) {
      if (!a) { ind.style.opacity = 0; return; }
      var r = a.getBoundingClientRect(), pr = links.getBoundingClientRect();
      ind.style.width = (r.width + 8) + 'px';
      ind.style.height = clamp(r.height + 2, 24, 34) + 'px';
      ind.style.transform = 'translate3d(' + (r.left - pr.left - 4) + 'px,0,0)';
      ind.style.opacity = 1;
    }
    each(anchors, function (a) {
      a.addEventListener('pointerenter', function () { place(a); });
      a.addEventListener('pointerleave', function () { place(cur); });
    });
    links.addEventListener('pointerleave', function () { place(cur); });
    if (cur) setTimeout(function () { place(cur); }, 150); else ind.style.opacity = 0;
    addEventListener('resize', function () { place(cur); }, { passive: true });
  });

  mod('cursor', function () {
    if (!FINE || REDUCE) return;
    var c = mk('div', '', document.body); c.id = 'n4k-cursor'; c.setAttribute('aria-hidden', 'true');
    mk('div', 'h', c); mk('div', 'r', c); mk('div', 'd', c);
    var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      html.classList.add('n4k-curs');
      var hot = !!(e.target.closest && e.target.closest('a,.btn,.n4k-card,.n4k-thumb'));
      html.classList.toggle('n4k-curs-hot', hot);
    }, { passive: true });
    PER.push(function () {
      cx = lerp(cx, x, .22); cy = lerp(cy, y, .22);
      c.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    });
  });

  mod('heroDepth', function () {
    if (COARSE || REDUCE) return;
    var hero = $('section.hero,section.p2f-hero,section.v5-hero,section.p2x-hero');
    if (!hero) return;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--n4k-mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      hero.style.setProperty('--n4k-my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { hero.style.setProperty('--n4k-mx', 0); hero.style.setProperty('--n4k-my', 0); });
  });

  /* in-page eased anchors + cinematic wipe between pages */
  mod('links', function () {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var href = a.getAttribute('href') || '';
      if (/^(mailto:|tel:|javascript:)/i.test(href) || a.target === '_blank') return;
      if (href.charAt(0) === '#') {
        e.preventDefault();
        var t = href.length > 1 ? document.getElementById(href.slice(1)) : document.body;
        if (t) { goTo(t); try { history.replaceState(null, '', href); } catch (er) { } }
        return;
      }
      var url; try { url = new URL(href, location.href); } catch (er2) { return; }
      if (url.origin !== location.origin || !/\.html?$/i.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) { e.preventDefault(); goTo(document.getElementById(url.hash.slice(1))); return; }
      if (REDUCE) return;
      e.preventDefault();
      html.classList.add('n4k-leave');
      setTimeout(function () { location.href = url.href; }, 400);
    });
  });

  /* =========================================================
     7 · card background images — une image de fond par carte
     Galerie du site, URL, import de fichier, intensité,
     retiré. Persistance localStorage page par page. Attributs
     statiques équivalents : data-card-bg / data-card-bg-op.
     ========================================================= */
  var CB_SEL = '.card,.box,.loopbox,.person,.v5-person,.p2f-card,.p2f-panel,.p2f-chain-card,.p2f-icon,.p2x-card,.p2x-chain-card,.node,.p2f-node,.p2x-node,.sat,.v5-float,.ctaBox,.v4-demo,.v5-demo';
  var CB_GALLERY = ['field-sunrise', 'field-aerial', 'field-harvest-hands', 'market-stall', 'plate-fufu', 'plate-grilled-fish', 'plate-kenkey', 'plate-vegetable', 'processing-line', 'solar-roof', 'cta-future', 'loop-digital', 'loop-foodsystem', 'gov-health', 'gov-food', 'gov-spatial', 'cold-temp-intel', 'cold-solar'];
  var CB_STORE_KEY = 'n4k-cardbg:v1';
  var CB_PAGE = (function () {
    var p = location.pathname.replace(/^\//, '').replace(/\.html?$/, '').split('/').filter(Boolean);
    if (p.length === 1) p.unshift('root');
    return p.join('/');
  })();
  var CB_SHADE_DARK = 'linear-gradient(180deg, rgba(3,18,11,0.12) 0%, rgba(3,18,11,0.24) 28%, rgba(4,23,14,0.58) 60%, rgba(3,18,11,0.85) 82%, rgba(2,14,8,0.95) 100%)';
  var CB_SHADE_LIGHT = 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(250,250,245,0.38) 30%, rgba(245,246,239,0.76) 62%, rgba(245,246,239,0.92) 84%, rgba(245,246,239,0.97) 100%)';

  function cbStore() {
    try { return JSON.parse(localStorage.getItem(CB_STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function cbToast(msg) {
    var t = document.getElementById('n4k-cb-toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(cbToast._t); cbToast._t = setTimeout(function () { t.classList.remove('on'); }, 3800);
  }
  function cbSave(st) {
    try { localStorage.setItem(CB_STORE_KEY, JSON.stringify(st)); return true; }
    catch (e) { cbToast('Stockage local plein : l’image restera pour cette session seulement.'); return false; }
  }
  function cbLum(el) {
    var cs = getComputedStyle(el).backgroundColor,
      m = cs.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/);
    if (!m) return null;
    var a = m[4] === undefined ? 1 : parseFloat(m[4]);
    if (a < .06) return null;
    return (.2126 * +m[1] + .7152 * +m[2] + .0722 * +m[3]) / 255;
  }
  function cbIsDark(el) {
    var l = cbLum(el);
    if (l != null) return l < .5;
    if (el.closest('.dark,.p2f-dark,.v5-dark,.p2x-dark,section.dark,section.hero,section.p2f-hero,section.v5-hero')) return true;
    var p = el.parentElement;
    while (p && p !== document.body) {
      l = cbLum(p);
      if (l != null) return l < .5;
      if (typeof p.className === 'string' && /(^|\s)(dark|hero)(\s|$)/.test(p.className)) return true;
      p = p.parentElement;
    }
    return false;
  }
  function cbLabel(el) {
    var h = el.querySelector('h3,h2,h4,.v5-bio h3,strong,b');
    var t = ((h || el).textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return t.slice(0, 60);
    t = (el.getAttribute('class') || '').replace(/n4k-[a-z0-9-]+/g, '').replace(/\s+/g, ' ').trim();
    return t || 'carte';
  }
  function cbKey(el) {
    var sec = el.closest('section');
    var si = sec ? $$('section').indexOf(sec) : 0;
    var scls = sec ? (sec.getAttribute('class') || '').replace(/n4k-[a-z0-9-]+/g, '').trim().replace(/\s+/g, '.') : 'body';
    var list = $$(CB_SEL, sec || document);
    var ci = list.indexOf(el); if (ci < 0) ci = 0;
    var own = (el.getAttribute('class') || '').replace(/n4k-[a-z0-9-]+|v4-reveal|reveal/g, '').trim().replace(/\s+/g, '.');
    return si + '|' + scls + '|' + ci + '|' + own + '|' + cbLabel(el).slice(0, 24);
  }
  function cbLayer(el) {
    var l = el.querySelector(':scope > .n4k-cb');
    if (!l) { l = mk('span', 'n4k-cb', el); l.setAttribute('aria-hidden', 'true'); }
    return l;
  }
  function cbCur(el) {
    var l = el && el.querySelector(':scope > .n4k-cb');
    if (!l) return null;
    var m = (l.style.backgroundImage || '').match(/url\("?(.*?)"?\)/);
    if (!m) {
      var img = l.querySelector('.n4k-cb-img');
      m = img && (img.style.backgroundImage || '').match(/url\("?(.*?)"?\)/);
    }
    return m ? { src: m[1], op: parseFloat(l.style.getPropertyValue('--n4k-cbo')) || 1 } : null;
  }
  function cbApply(el, o) {
    var l = el.querySelector(':scope > .n4k-cb');
    if (!o || !o.src || o.removed) {
      if (l) l.remove();
      el.classList.remove('n4k-cb-on', 'n4k-cb-has', 'n4k-cb-dark', 'n4k-cb-light');
      el.style.removeProperty('--n4k-cbsh');
      return;
    }
    l = cbLayer(el);
    l.style.backgroundImage = 'url("' + o.src + '")';
    l.style.setProperty('--n4k-cbo', (o.op == null ? 1 : o.op));
    var dark = cbIsDark(el);
    el.style.setProperty('--n4k-cbsh', dark ? CB_SHADE_DARK : CB_SHADE_LIGHT);
    el.classList.add('n4k-cb-on', 'n4k-cb-has');
    el.classList.toggle('n4k-cb-dark', dark);
    el.classList.toggle('n4k-cb-light', !dark);

    var img = l.querySelector('.n4k-cb-img');
    if (!img) { img = mk('span', 'n4k-cb-img', l); img.setAttribute('aria-hidden', 'true'); }
    img.style.backgroundImage = 'url("' + o.src + '")';

    var sh = l.querySelector('.n4k-cb-shade');
    if (!sh) { sh = mk('span', 'n4k-cb-shade', l); sh.setAttribute('aria-hidden', 'true'); }

    requestAnimationFrame(function () { requestAnimationFrame(function () { l.classList.add('n4k-cb-in'); }); });
  }
  function cbSet(el, o) {
    var st = cbStore(), k = cbKey(el);
    if (!st[CB_PAGE]) st[CB_PAGE] = {};
    if (o && o.src) st[CB_PAGE][k] = { src: o.src, op: o.op == null ? 1 : o.op };
    else st[CB_PAGE][k] = { removed: true };
    cbSave(st);
    cbApply(el, o);
  }

  /* restauration des images enregistrées (localStorage), des
     attributs statiques data-card-bg présents dans le HTML,
     et des fonds photographiques par défaut (CFG) */
  mod('cardbg-apply', function () {
    var st = cbStore()[CB_PAGE] || {};
    var bgMap = cfg.cardBg || {};
    each($$(CB_SEL), function (el) {
      if (el.querySelector(':scope > .n4k-cb')) return;
      var o = st[cbKey(el)];
      if (!o) {
        var d = el.getAttribute('data-card-bg');
        if (d) {
          o = { src: d, op: el.hasAttribute('data-card-bg-op') ? (parseFloat(el.getAttribute('data-card-bg-op')) || 1) : 1 };
        } else {
          for (var sel in bgMap) {
            if (el.matches && el.matches(sel)) {
              var list = bgMap[sel] || [];
              var sibs = $$(sel);
              var idx = sibs.indexOf(el);
              if (idx >= 0 && list[idx] && list[idx] !== 'null') {
                o = { src: file(list[idx]), op: 1 };
              }
              break;
            }
          }
        }
      }
      if (o && !o.removed) cbApply(el, o);
    });
  });

  /* l'éditeur : bascule, panneau, fab, pop-over, export */
  mod('cardbg-editor', function () {
    var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.8" cy="8.8" r="1.8"/><path d="M21 15l-4.2-4.2L6 21.6"/></svg>';

    each($$(CB_SEL), function (c) { c.classList.add('n4k-cb-target'); });

    var host = document.documentElement;

    var toast = mk('div', '', host); toast.id = 'n4k-cb-toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-hidden', 'true');

    

    var panel = mk('div', '', host); panel.id = 'n4k-cb-panel'; panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '<h5>Images de fond des cartes</h5>' +
      '<p>Survolez une carte (liseré vert) puis cliquez dessus ou sur 🖼 pour ajouter, changer ou retirer son image de fond.</p>' +
      '<div class="n4k-cb-acts"><button class="n4k-cb-btn warn" type="button" data-act="clear">Tout retirer</button>' +
      '<button class="n4k-cb-btn" type="button" data-act="export">Exporter le HTML</button></div>';

    var fab = mk('button', '', host); fab.id = 'n4k-cb-fab'; fab.type = 'button'; fab.setAttribute('aria-hidden', 'true');
    fab.innerHTML = ICON;
    fab.setAttribute('aria-label', 'Image de fond de la carte');

    var pop = mk('div', '', host); pop.id = 'n4k-cb-pop'; pop.hidden = true; pop.setAttribute('aria-hidden', 'true');
    pop.innerHTML =
      '<header><h5 class="cb-title">Carte</h5><button class="n4k-cb-close" type="button" data-act="close" aria-label="Fermer">✕</button></header>' +
      '<p class="n4k-cb-sub">Image de fond</p>' +
      '<div class="n4k-cb-cap">Galerie du site</div><div class="n4k-cb-grid" aria-label="Galerie d’images"></div>' +
      '<div class="n4k-cb-cap">Autre image</div>' +
      '<div class="n4k-cb-urlrow"><input type="text" placeholder="Coller une URL d’image…" aria-label="URL de l’image"><button class="n4k-cb-btn" type="button" data-act="url">Appliquer</button></div>' +
      '<div class="n4k-cb-uprow"><button class="n4k-cb-btn" type="button" data-act="file">📁 Importer une image</button><input type="file" accept="image/*" hidden></div>' +
      '<div class="n4k-cb-op"><label>Intensité de l’image <b class="cb-opval">100 %</b></label><input type="range" min="15" max="100" value="100" aria-label="Intensité de l’image"></div>' +
      '<div class="n4k-cb-foot"><button class="n4k-cb-btn warn" type="button" data-act="remove">Retirer l’image</button></div>';

    var grid = $('.n4k-cb-grid', pop);
    each(CB_GALLERY, function (name) {
      var b = mk('button', '', grid); b.type = 'button'; b.dataset.img = BASE + 'img/' + name + '.jpg'; b.title = name;
      var im = mk('img', '', b); im.src = b.dataset.img; im.alt = ''; im.loading = 'lazy';
      b.addEventListener('click', function () { if (popCard) { cbSet(popCard, { src: b.dataset.img, op: popOp() }); markSel(b.dataset.img); } });
    });

    var mode = false, popCard = null, fabCard = null;
    function popOp() { var r = $('input[type=range]', pop); return r ? parseInt(r.value, 10) / 100 : 1; }
    function markSel(src) { each($$('button', grid), function (b) { b.classList.toggle('n4k-cb-sel', b.dataset.img === src); }); }

    function openPop(card) {
      popCard = card;
      $('.cb-title', pop).textContent = cbLabel(card);
      var cur = cbCur(card);
      markSel(cur ? cur.src : null);
      var r = $('input[type=range]', pop), u = $('input[type=text]', pop);
      r.value = cur ? Math.round(cur.op * 100) : 100;
      u.value = cur && cur.src && cur.src.indexOf('data:') !== 0 ? cur.src : '';
      $('.cb-opval', pop).textContent = r.value + ' %';
      pop.hidden = false;
      var cr = card.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
      var x = cr.right - pw + 24;
      if (x < 12) x = 12;
      if (x + pw > innerWidth - 12) x = Math.max(12, innerWidth - pw - 12);
      var y = cr.top + 14;
      if (y + ph > innerHeight - 12) y = Math.max(12, innerHeight - ph - 12);
      if (y < 70) y = 70;
      pop.style.left = x + 'px'; pop.style.top = y + 'px';
    }
    function closePop() { pop.hidden = true; popCard = null; }

    pop.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b || !popCard) return;
      var act = b.dataset.act;
      if (act === 'close') { closePop(); return; }
      if (act === 'url') {
        var v = $('input[type=text]', pop).value.trim();
        if (!v) { cbToast('Collez d’abord une URL d’image.'); return; }
        if (!/^(https?:)?\/\//i.test(v) && !/^[./]/.test(v) && v.indexOf('data:image') !== 0) v = 'https://' + v;
        cbSet(popCard, { src: v, op: popOp() });
        cbToast('Image appliquée.');
        return;
      }
      if (act === 'file') { $('input[type=file]', pop).click(); return; }
      if (act === 'remove') { cbSet(popCard, null); cbToast('Image retirée de cette carte.'); }
    });
    $('input[type=range]', pop).addEventListener('input', function (e) {
      $('.cb-opval', pop).textContent = e.target.value + ' %';
      if (popCard && cbCur(popCard)) { var c = cbCur(popCard); cbSet(popCard, { src: c.src, op: parseInt(e.target.value, 10) / 100 }); }
    });
    $('input[type=file]', pop).addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f || !popCard) return;
      if (f.size > 8 * 1024 * 1024) { cbToast('Image trop lourde (8 Mo max).'); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var MAX = 1400, s = Math.min(1, MAX / Math.max(img.width, img.height));
          var cw = Math.max(1, Math.round(img.width * s)), ch = Math.max(1, Math.round(img.height * s));
          var cv = mk('canvas', ''), url = rd.result;
          cv.width = cw; cv.height = ch;
          try { cv.getContext('2d').drawImage(img, 0, 0, cw, ch); url = cv.toDataURL('image/jpeg', .84); } catch (er) { }
          cbSet(popCard, { src: url, op: popOp() });
          if (url.length > 2300000) cbToast('Image compressée > 2,3 Mo : le stockage local peut refuser. Préférez une URL pour publier.');
          else cbToast('Image importée et enregistrée sur cette carte.');
        };
        img.onerror = function () { cbToast('Impossible de lire cette image.'); };
        img.src = rd.result;
      };
      rd.onerror = function () { cbToast('Lecture du fichier impossible.'); };
      rd.readAsDataURL(f);
    });

    function setMode(on) {
      mode = on;
      html.classList.toggle('n4k-cbmode', on);
      var sp = toggle.querySelector('span');
      if (sp) sp.textContent = on ? 'Mode cartes : ON' : 'Fond des cartes';
      if (!on) { closePop(); fab.classList.remove('on'); fabCard = null; }
    }
    toggle.addEventListener('click', function () { setMode(!mode); });
    document.addEventListener('keydown', function (e) {
      if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key !== 'b' && e.key !== 'B') return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); setMode(!mode);
    });

    document.addEventListener('pointermove', function (e) {
      if (!mode) return;
      var t = e.target;
      var c = (t && t.closest) ? t.closest(CB_SEL) : null;
      if (c && c.offsetWidth > 8 && c.offsetHeight > 8) {
        fabCard = c;
        var r = c.getBoundingClientRect();
        var x = r.right - 32, y = r.top - 34;
        if (y < 86) y = r.top + 10;
        fab.style.left = Math.max(10, Math.min(innerWidth - 48, x)) + 'px';
        fab.style.top = Math.max(86, y) + 'px';
        fab.classList.add('on');
      } else { fab.classList.remove('on'); fabCard = null; }
    }, { passive: true });
    fab.addEventListener('click', function () { if (fabCard) openPop(fabCard); });

    document.addEventListener('click', function (e) {
      if (!mode) return;
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#n4k-cb-pop,#n4k-cb-panel,#n4k-cb-toggle,#n4k-cb-fab,#n4k-cb-exp,#n4k-cb-toast')) return;
      if (t.closest('a[href]')) return;
      var c = t.closest(CB_SEL);
      if (c) { e.preventDefault(); openPop(c); }
      else if (!pop.hidden) closePop();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden) closePop(); });
    addEventListener('resize', function () {
      fab.classList.remove('on'); fabCard = null;
      if (!pop.hidden && popCard) openPop(popCard);
    }, { passive: true });

    /* export : attributs HTML à coller sur les balises des cartes */
    var exp = mk('div', '', host); exp.id = 'n4k-cb-exp'; exp.setAttribute('aria-hidden', 'true');
    var expFile = CB_PAGE.replace(/^root\//, '') + '.html';
    exp.innerHTML = '<div class="n4k-cb-expbox"><h5>Exporter les images de fond — ' + expFile + '</h5>' +
      '<p>Collez les attributs <b>data-card-bg</b> et <b>data-card-bg-op</b> sur la balise de chaque carte indiquée dans le fichier HTML. ' +
      'Les images importées (data:…) doivent être hébergées : remplacez la valeur par le chemin du fichier (ex. assets/img/ma-photo.jpg).</p>' +
      '<textarea readonly spellcheck="false" aria-label="Code HTML à copier"></textarea>' +
      '<div class="n4k-cb-foot"><button class="n4k-cb-btn" type="button" data-act="copy">Copier</button>' +
      '<button class="n4k-cb-btn warn" type="button" data-act="closeexp">Fermer</button></div></div>';
    function openExp() {
      var lines = [], n = 0;
      each($$(CB_SEL), function (el) {
        var cur = cbCur(el); if (!cur) return; n++;
        var op = Math.round(cur.op * 100) / 100;
        var srcOut = cur.src, note = '';
        if (cur.src.indexOf('data:image') === 0) {
          note = '  <!-- image importée : remplacez par le chemin du fichier hébergé, ex. assets/img/ma-photo.jpg -->';
          srcOut = 'assets/img/ma-photo.jpg';
        }
        var own = (el.getAttribute('class') || '').replace(/n4k-[a-z0-9-]+/g, '').trim();
        lines.push('<!-- ' + cbLabel(el).slice(0, 48) + '  ·  <' + el.tagName.toLowerCase() + ' class="' + own + '">  → ajouter :');
        lines.push('data-card-bg="' + srcOut + '" data-card-bg-op="' + op + '"' + note);
      });
      $('textarea', exp).value = n ? lines.join('\n') : 'Aucune image de fond sur cette page pour le moment. Ajoutez-en en cliquant sur les cartes.';
      exp.classList.add('on');
    }
    exp.addEventListener('click', function (e) {
      if (e.target === exp) { exp.classList.remove('on'); return; }
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b) return;
      if (b.dataset.act === 'closeexp') { exp.classList.remove('on'); return; }
      if (b.dataset.act === 'copy') {
        var ta = $('textarea', exp);
        ta.focus(); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e2) { }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(ta.value).then(function () { ok = true; }, function () { });
        }
        cbToast(ok ? 'Code copié dans le presse-papiers.' : 'Sélectionnez le texte et copiez-le (Ctrl+C).');
      }
    });

    panel.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b) return;
      if (b.dataset.act === 'clear') {
        if (!confirm('Retirer toutes les images de fond de cette page ?')) return;
        var st = cbStore();
        if (!st[CB_PAGE]) st[CB_PAGE] = {};
        each($$(CB_SEL), function (el) {
          st[CB_PAGE][cbKey(el)] = { removed: true };
          cbApply(el, null);
        });
        cbSave(st);
        cbToast('Toutes les images de cette page ont été retirées.');
      } else if (b.dataset.act === 'export') openExp();
    });
  });

  /* =========================================================
     boot
     ========================================================= */
  function init() {
    html.classList.add('n4k');
    start();
    SC.dirty = true;
    setTimeout(function () {
      each($$('.n4k-rv'), function (n) {
        var r = n.getBoundingClientRect();
        if (r.top < innerHeight * .96 && r.bottom > -20) { n.classList.add('n4k-in'); if (io) io.unobserve(n); }
      });
      SC.dirty = true;
    }, 12);
    setTimeout(function () { SC.dirty = true; each(WIRE, function (w) { w.layout(); }); }, 260);
    addEventListener('pageshow', function () { SC.dirty = true; html.classList.remove('n4k-leave'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
