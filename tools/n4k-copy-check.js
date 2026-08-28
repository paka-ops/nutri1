/* Régression "aucun mot modifié" : compare le texte visible de chaque page à sa
   version d'origine (commit 329e909) après exécution de la couche d'immersion.
   Dépendance dev uniquement : npm i -D jsdom   puis  node tools/n4k-copy-check.js */
const { JSDOM, VirtualConsole } = require('jsdom');
const { execSync } = require('child_process');
const fs = require('fs');

const files = ['index.html','platform.html','intelligence.html','ecosystem.html','agribusiness.html','team.html',
               'fr/index.html','fr/platform.html','fr/intelligence.html','fr/ecosystem.html','fr/agribusiness.html','fr/team.html'];
const norm = s => s.replace(/\s+/g,' ').trim();

function makeDom(html, o){
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => { const m=String(e.message||e); if(!/Could not parse CSS|Not implemented: window\.scroll|Could not load img|Not implemented: HTMLCanvasElement/.test(m)) errs.push(m); });
  vc.on('error', (...a) => { const m=a.join(' '); if(!/IntersectionObserver is not defined/.test(m)) errs.push(m); });
  const dom = new JSDOM(html, {
    runScripts: o.run ? 'dangerously' : 'outside-only',
    pretendToBeVisual: true,
    resources: o.run ? 'usable' : undefined,
    url: 'file:///home/user/nutri3/' + o.file,
    virtualConsole: vc,
    beforeParse(w){
      if(!o.run) return;
      class IO { constructor(cb){this.cb=cb;} observe(t){ this.cb([{target:t,isIntersecting:true,intersectionRatio:1}],this); } unobserve(){} disconnect(){} }
      w.IntersectionObserver = IO;
      w.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.matchMedia = q => ({ matches: /pointer:\s*fine/.test(q), media:q, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
      w.devicePixelRatio = 2;
      w.scrollTo = () => {};
      Object.defineProperty(w,'innerWidth',{value:1440}); Object.defineProperty(w,'innerHeight',{value:900});
      w.Element.prototype.getBoundingClientRect = function(){
        const w2 = 160, h2 = 40, top = 100;
        const kids = Array.from(this.parentNode ? this.parentNode.children : []).indexOf(this);
        return { x: 60 + kids*w2, y: top, width: w2, height: h2, top, left: 60 + kids*w2, right: 60 + kids*w2 + w2, bottom: top + h2, toJSON(){} };
      };
      Object.defineProperties(w.HTMLElement.prototype, { offsetWidth:{get(){return 160}}, offsetHeight:{get(){return 40}} });
    }
  });
  return { dom, errs, vc };
}

(async () => {
let fail = 0;
for (const f of files) {
  const orig = execSync(`git show 329e9093808c4c28dd34206a9961d23ced4aa10a:${f}`, {cwd:'/home/user/nutri3', encoding:'utf8'});
  const cur  = fs.readFileSync('/home/user/nutri3/'+f, 'utf8');
  const A = makeDom(orig, {file:f, run:false});
  const B = makeDom(cur,  {file:f, run:true});
  await new Promise(r => setTimeout(r, 700));   // let deferred script + timers run
  const ta = norm(A.dom.window.document.body.textContent || '');
  const tb = norm(B.dom.window.document.body.textContent || '');
  if (ta !== tb) {
    fail++;
    let i=0; while(i<Math.min(ta.length,tb.length) && ta[i]===tb[i]) i++;
    console.log('!! TEXT DIFF', f, '@', i, '\n  ORIG:', JSON.stringify(ta.slice(Math.max(0,i-60), i+80)), '\n  NEW :', JSON.stringify(tb.slice(Math.max(0,i-60), i+80)));
  }
  const d = B.dom.window.document;
  const q = s => d.querySelectorAll(s).length;
  const imgs = [...d.querySelectorAll('.n4k-photo img,.n4k-thumb img')].map(i=>i.getAttribute('src'));
  const missing = imgs.filter(s=>!fs.existsSync('/home/user/nutri3/'+decodeURIComponent(s).replace(/^.*?assets\//,'assets/')));
  console.log(f.padEnd(23),
    'n4k:'+(d.documentElement.classList.contains('n4k')?'y':'N'),
    'rv:'+q('.n4k-rv'), 'in:'+q('.n4k-in'), 'words:'+q('.n4k-w'),
    'photo:'+q('.n4k-photo'), 'thumb:'+q('.n4k-thumb'), 'wash:'+q('.n4k-wash'),
    'wired:'+q('.n4k-wired'), 'wireSvg:'+q('svg.n4k-wire'), 'packets:'+q('.n4k-pkt'),
    'rail:'+q('#n4k-rail u'), 'tiltPool:'+q('.n4k-card'), 'legacy:'+q('.v4-reveal'),
    'prog:'+q('#n4k-progress'), 'navind:'+q('.n4k-navind'), 'halo:'+q('.n4k-halo'), 'radar:'+q('.n4k-radar'),
    missing.length?('MISSING-IMG '+missing):'', B.errs.length?('ERR '+JSON.stringify(B.errs.slice(0,2))):'');
  if (B.errs.length) fail++;
}
console.log(fail ? '=> ISSUES: '+fail : '=> OK: copy identical on all 12 pages, engine active, no runtime errors');
process.exit(0);
})();
