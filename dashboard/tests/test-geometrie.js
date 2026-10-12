/* Vérification géométrique : détecte les textes/labels qui débordent du canvas
   pour chaque graphique, dans les largeurs réelles de cartes (1280 → 1920 px)
   et en mode pays. Le contexte simulé suit la matrice de transformation
   (translate/rotate/setTransform) et estime la boîte de chaque fillText. */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'index.html'), 'utf8');

/* ── Contexte Canvas instrumenté : traque la CTM et les boîtes de texte ── */
function makeTracker(W, H){
  const overflows = [];
  const st = { m: [1,0,0,1,0,0] };                    // [a,b,c,d,e,f]
  const mul = (m1, m2) => [
    m1[0]*m2[0] + m1[2]*m2[1], m1[1]*m2[0] + m1[3]*m2[1],
    m1[0]*m2[2] + m1[2]*m2[3], m1[1]*m2[2] + m1[3]*m2[3],
    m1[0]*m2[4] + m1[2]*m2[5] + m1[4], m1[1]*m2[4] + m1[3]*m2[5] + m1[5]
  ];
  const apply = (x, y) => {
    const m = st.m;
    return [m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5]];
  };
  let fontSize = 10, align = 'left';
  const grad = { addColorStop(){} };
  const target = {
    canvas: { width: W, height: H },
    setTransform(a,b,c,d,e,f){ st.m = [a,b,c,d,e,f]; },
    transform(a,b,c,d,e,f){ st.m = mul(st.m, [a,b,c,d,e,f]); },
    translate(x,y){ st.m = mul(st.m, [1,0,0,1,x,y]); },
    rotate(r){ st.m = mul(st.m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]); },
    scale(x,y){ st.m = mul(st.m, [x,0,0,y,0,0]); },
    save(){ saves.push(st.m.slice()); },
    restore(){ const p = saves.pop(); if (p) st.m = p; },
    measureText: t => ({ width: String(t).length * fontSize * .56 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => null,
    fillText(text, x, y){
      const w = String(text).length * fontSize * .56, h = fontSize * 1.02;
      const ax = align === 'center' ? x - w/2 : (align === 'right' ? x - w : x);
      /* 4 coins transformés par la CTM (gère les textes pivotés) */
      const pts = [[ax, y - h*.78],[ax + w, y - h*.78],[ax, y + h*.22],[ax + w, y + h*.22]].map(p => apply(p[0], p[1]));
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
      if (x1 < -1.5 || x2 > W + 1.5 || y1 < -1.5 || y2 > H + 1.5){
        overflows.push({ text: String(text), box: [x1,y1,x2,y2].map(v => Math.round(v)).join(','), canvas: W + 'x' + H });
      }
    },
    strokeText(){}, fillRect(){}, strokeRect(){}, clearRect(){}
  };
  const saves = [];
  return {
    overflows,
    ctx: new Proxy(target, {
      get(t, k){
        if (typeof k === 'symbol') return t[k];
        if (k in t) return t[k];
        if (!t['__n' + k]) t['__n' + k] = () => {};
        return t['__n' + k];
      },
      set(t, k, v){
        if (k === 'font'){ const m = /([\d.]+)px/.exec(String(v)); if (m) fontSize = parseFloat(m[1]); }
        if (k === 'textAlign') align = v;
        t[k] = v; return true;
      }
    })
  };
}

/* ── Boot jsdom (mêmes correctifs d'environnement que le test fonctionnel) ── */
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  virtualConsole: new VirtualConsole().on('jsdomError', () => {}),
  beforeParse(window){
    let now = 1000;
    window.performance.now = () => now;
    window.requestAnimationFrame = cb => { now += 900; return window.setTimeout(() => cb(now), 0); };
    window.cancelAnimationFrame = id => window.clearTimeout(id);
    window.devicePixelRatio = 2;
    window.matchMedia = () => ({ matches: false, addListener(){}, addEventListener(){} });
    window.print = () => {};
    window.IntersectionObserver = class { constructor(cb){ this.cb = cb; } observe(el){ this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this); } unobserve(){} disconnect(){} };
    window.HTMLCanvasElement.prototype.getContext = function(){ return makeTracker(900, 340).ctx; };
    window.Element.prototype.getBoundingClientRect = function(){ return { x:0,y:0,left:0,top:0,width:900,height:340,right:900,bottom:340,toJSON(){} }; };
    Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', { get(){ return this.parentElement; }, configurable: true });
    window.HTMLElement.prototype.animate = function(){ return { finished: Promise.resolve(), cancel(){} }; };
    Object.defineProperty(window.document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
  }
});
const { window } = dom;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Largeurs réalistes de carte selon la grille (6 colonnes, gap 20, padding 28×2) */
function cardWidths(viewport){
  const content = viewport - 260 - 56;                 // sidebar + padding contenu
  const col = (content - 5 * 20) / 6;
  return { s6: content - 56, s4: col * 4 + 60 - 56, s3: col * 3 + 40 - 56, s2: col * 2 + 20 - 56 };
}
const CHARTS_CFG = [
  ['drawAdmissions','c1',420,320,'s4'], ['drawScatterSphered','c2',420,320,'s2'],
  ['drawBulletStock','c3',380,380,'s6'], ['drawHeatmapMatrix','c4',420,420,'s4'],
  ['drawPolarRose','c5',420,420,'s2'], ['drawAnemiaCombo','c6',360,360,'s4'],
  ['drawCalendarSync','c7',300,300,'s3'], ['drawDumbbell','c8',360,360,'s3'],
  ['drawFunnelCpn','c9',360,360,'s2'], ['drawSmallMultiples','c10',300,300,'s6'],
  ['drawTreemap','c11',360,360,'s3'], ['drawChannels','c12',340,340,'s3'],
  ['drawLollipop','c13',340,340,'s3'], ['drawBurdenStack','c14',420,420,'s6'],
  ['drawQualityBars','c15b',380,380,'s6']
];

(async () => {
  await sleep(800);
  const rapports = [];
  for (const viewport of [1920, 1440, 1280]){
    const widths = cardWidths(viewport);
    for (const mode of ['global', 'country']){
      window.eval("ETAT.mode='" + mode + "';ETAT.pays='NE';");
      const s = window.getScope();
      for (const [fn, id, h, , span] of CHARTS_CFG){
        const W = Math.round(widths[span]), H = h;
        const tr = makeTracker(W, H);
        // rendu complet + survol de la première zone (branches « hover »)
        const out = window[fn](tr.ctx, W, H, 1, null, s, {});
        if (out && out.hits && out.hits[0]) window[fn](tr.ctx, W, H, 1, out.hits[0], s, {});
        if (tr.overflows.length) rapports.push({ viewport, mode, id, fn, W, H, n: tr.overflows.length, ex: tr.overflows.slice(0, 4) });
      }
    }
  }
  /* Tablettes : grille 2 colonnes */
  for (const viewport of [1024, 900]){
    const content = viewport - 78 - 36;
    const W = Math.round((content - 20) / 2 - 44);
    for (const [fn, id, h] of CHARTS_CFG){
      const tr = makeTracker(W, h);
      window.eval("ETAT.mode='global';");
      window[fn](tr.ctx, W, h, 1, null, window.getScope(), {});
      if (tr.overflows.length) rapports.push({ viewport, mode:'tablette', id, fn, W, H: h, n: tr.overflows.length, ex: tr.overflows.slice(0, 4) });
    }
  }

  console.log('\n══════ VÉRIFICATION GÉOMÉTRIQUE (débordements de texte) ══════');
  if (!rapports.length) console.log('Aucun débordement détecté sur 5 largeurs × 2 périmètres × 15 graphiques ✔');
  else {
    const byChart = {};
    rapports.forEach(r => { (byChart[r.id] = byChart[r.id] || []).push(r); });
    Object.keys(byChart).forEach(id => {
      const rs = byChart[id];
      console.log('\n✗ ' + id + ' (' + rs[0].fn + ') — ' + rs.reduce((a,b)=>a+b.n,0) + ' débordement(s)');
      rs.slice(0, 5).forEach(r => {
        console.log('   viewport ' + r.viewport + ' ' + r.mode + ' · canvas ' + r.W + '×' + r.H);
        r.ex.forEach(e => console.log('      « ' + e.text + ' » boîte=' + e.box));
      });
    });
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(rapports.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
