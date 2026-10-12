/* Banc de test : exécute le dashboard NutriApp dans jsdom avec un contexte
   Canvas 2D instrumenté (tous les appels de dessin sont réellement parcourus). */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'index.html'), 'utf8');
const errors = [];
const warns = [];

function makeCtx(canvas){
  const store = { canvas };
  const grad = { addColorStop(o, c){
    if (typeof o !== 'number' || o < 0 || o > 1 || Number.isNaN(o)) errors.push('addColorStop offset invalide: ' + o);
    if (typeof c !== 'string' || /NaN|undefined|null/.test(c)) errors.push('addColorStop couleur invalide: ' + c);
  } };
  const known = {
    canvas,
    measureText: t => {
      if (t === undefined || t === null) errors.push('measureText(undefined)');
      if (/NaN|undefined/.test(String(t))) errors.push('measureText texte invalide: ' + t);
      return { width: String(t).length * 6.2 };
    },
    createLinearGradient: (...a) => { if (a.some(Number.isNaN)) errors.push('createLinearGradient NaN ' + a); return grad; },
    createRadialGradient: (...a) => { if (a.some(Number.isNaN)) errors.push('createRadialGradient NaN ' + a); return grad; },
    getImageData: (x,y,w,h) => ({ data: new Uint8ClampedArray(Math.max(4, w*h*4)), width:w, height:h }),
    createPattern: () => null
  };
  // Contrôle des NaN dans les coordonnées de dessin (bug visuel silencieux sinon)
  const guard = (name) => (...a) => {
    for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) errors.push(name + ' reçoit ' + v + ' → ' + a.join(','));
  };
  return new Proxy(store, {
    get(t, k){
      if (typeof k === 'symbol') return t[k];
      if (k in known) return known[k];
      if (k in t) return t[k];
      if (!t['__m_' + k]) t['__m_' + k] = guard(k);
      return t['__m_' + k];
    },
    set(t, k, v){
      if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v === 'string' && /NaN|undefined|null/.test(v))
        errors.push(k + ' invalide: ' + v);
      if ((k === 'lineWidth' || k === 'globalAlpha') && (!Number.isFinite(v) || v < 0))
        errors.push(k + ' invalide: ' + v);
      t[k] = v; return true;
    }
  });
}

function sizeFor(el){
  const cls = (el.getAttribute && el.getAttribute('class')) || '';
  if (el.tagName === 'CANVAS'){
    const p = el.parentElement, pcls = p ? (p.getAttribute('class') || '') : '';
    if (pcls.indexOf('kpi-badge') >= 0) return { w: 52, h: 16 };
    if (pcls.indexOf('spark-cell') >= 0) return { w: 76, h: 26 };
    if (cls.indexOf('bg-spark') >= 0) return { w: 320, h: 74 };
    return { w: 860, h: parseInt((pcls.match(/h-(\d+)/) || [0, 340])[1], 10) };
  }
  if (cls.indexOf('chart') >= 0) return { w: 860, h: parseInt((cls.match(/h-(\d+)/) || [0, 340])[1], 10) };
  if (cls.indexOf('tip') >= 0) return { w: 260, h: 130 };
  if (cls.indexOf('kpi-grid') >= 0) return { w: 1400, h: 200 };
  return { w: 1400, h: 900 };
}

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  beforeParse(window){
    let now = 1000;
    window.performance = window.performance || {};
    window.performance.now = () => now;
    // rAF : on fait avancer l'horloge de 900 ms → les animations 800 ms aboutissent en 1 frame
    window.requestAnimationFrame = cb => { now += 900; return window.setTimeout(() => cb(now), 0); };
    window.cancelAnimationFrame = id => window.clearTimeout(id);
    window.devicePixelRatio = 2;
    window.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
    window.print = () => {};
    window.IntersectionObserver = class {
      constructor(cb){ this.cb = cb; }
      observe(el){ this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this); }
      unobserve(){} disconnect(){}
    };
    window.HTMLCanvasElement.prototype.getContext = function(){ return makeCtx(this); };
    window.Element.prototype.getBoundingClientRect = function(){
      const s = sizeFor(this);
      return { x: 40, y: 100, left: 40, top: 100, width: s.w, height: s.h, right: 40 + s.w, bottom: 100 + s.h, toJSON(){} };
    };
    Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', { get(){ return this.parentElement || window.document.body; }, configurable: true });
    window.HTMLElement.prototype.animate = function(){ return { finished: Promise.resolve(), cancel(){}, onfinish: null }; };
    window.HTMLElement.prototype.scrollIntoView = function(){};
    Object.defineProperty(window.document, 'fonts', { value: { ready: Promise.resolve(), check: () => true }, configurable: true });
    window.addEventListener('error', e => errors.push('window.onerror: ' + (e.error && e.error.stack || e.message)));
  },
  virtualConsole: new (require('jsdom').VirtualConsole)()
    .on('jsdomError', e => {
      if (/Could not load|Not implemented/.test(e.message)) { warns.push(e.message); return; }
      errors.push('jsdomError: ' + (e.stack || e.message));
    })
    .on('error', (...a) => errors.push('console.error: ' + a.join(' ')))
});

const { window } = dom;
const doc = window.document;
const $ = s => doc.querySelector(s);
const $$ = s => Array.from(doc.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
function check(name, cond, detail){
  results.push({ name, ok: !!cond, detail: detail || '' });
  if (!cond) errors.push('ASSERT ÉCHOUÉ: ' + name + (detail ? ' — ' + detail : ''));
}

(async () => {
  await sleep(900);                       // laisse boot + animations rAF se dérouler

  /* ── 1. Structure DOM ─────────────────────────────────────────────── */
  check('5 KPI cards injectées', $$('.kpi').length === 5, $$('.kpi').length + ' trouvées');
  check('16 conteneurs de graphiques', $$('[data-chart]').length === 16, $$('[data-chart]').length + '');
  check('16 canvas de graphiques créés', $$('.chart canvas').length === 16, $$('.chart canvas').length + '');
  check('Scorecard : 16 lignes pays', $$('#scoreBody tr').length === 16, $$('#scoreBody tr').length + ' lignes');
  check('Scorecard : 12 colonnes', $$('#scoreHead th').length === 12, $$('#scoreHead th').length + '');
  check('Sélecteur pays : 16 options', $$('.cp-opt').length === 16, $$('.cp-opt').length + '');
  check('Bandeau de périmètre rempli', ($('#scopeBar').textContent || '').indexOf('16') >= 0);
  check('Encart sidebar renseigné', ($('#sbCardTxt').textContent || '').indexOf('points') >= 0);

  /* ── 2. Valeurs de référence imposées par le cahier des charges ───── */
  const s0 = window.getScope();
  check('Admissions globales ≈ 48 234', Math.abs(s0.agg.adm - 48234) < 60, 'obtenu ' + s0.agg.adm);
  check('Obésité globale ≈ 14.2 %', Math.abs(s0.agg.obes - 14.2) < 1.6, 'obtenu ' + s0.agg.obes);
  check('HTA globale ≈ 27.8 %', Math.abs(s0.agg.hta - 27.8) < 1.6, 'obtenu ' + s0.agg.hta);
  check('47 structures en rupture', s0.agg.stk === 47, 'obtenu ' + s0.agg.stk);
  check('1 842 points ATPE suivis', s0.agg.pts === 1842, 'obtenu ' + s0.agg.pts);
  check('Synchro globale ≈ 72 %', Math.abs(s0.agg.sync - 72) < 2.5, 'obtenu ' + s0.agg.sync);
  check('16 pays au référentiel', s0.zones.length === 16, s0.zones.length + '');
  check('Funnel CPN : gap ≈ 59 %', (() => {
    const f = window.funnelData(s0); return Math.abs((1 - f[2].v / f[1].v) * 100 - 59) < 1.5;
  })(), '');

  /* ── 3. Tous les dessins s'exécutent (normal + survol de chaque zone) ── */
  const fns = ['drawAdmissions','drawScatterSphered','drawBulletStock','drawHeatmapMatrix','drawPolarRose',
               'drawSmallMultiples','drawAnemiaCombo','drawCalendarSync','drawDumbbell','drawFunnelCpn',
               'drawTreemap','drawChannels','drawLollipop','drawBurdenStack','drawQualityBars'];
  const ctx = window.HTMLCanvasElement.prototype.getContext.call(doc.createElement('canvas'));
  let hitsTotal = 0, hoverTested = 0;
  for (const fn of fns){
    for (const W of [860, 420]) {                       // desktop + colonne étroite
      const H = 340;
      const out = window[fn](ctx, W, H, 1, null, s0, {});
      const hits = (out && out.hits) || [];
      hitsTotal += hits.length;
      check(fn + ' produit des zones de survol (W=' + W + ')', hits.length > 0, hits.length + '');
      // Test des branches « survol » sur un échantillon de zones
      for (const h of hits.slice(0, 3)){
        window[fn](ctx, W, H, 1, h, s0, {}); hoverTested++;
        if (!h.tip || !h.tip.title) errors.push(fn + ' : zone sans tooltip');
      }
    }
  }
  check('Dessins exécutés sans erreur', true);

  /* ── 4. Animations partielles (prog entre 0 et 1) ─────────────────── */
  for (const fn of fns){
    for (const p of [0, 0.05, 0.33, 0.66, 0.99]){
      window[fn](ctx, 860, 340, p, null, s0, {});
    }
  }

  /* ── 5. Navigation entre les 6 sections ──────────────────────────── */
  const vues = ['overview','crenas','atpe','anemie','mnt','synchro'];
  for (const v of vues){
    $('.nav-item[data-view="' + v + '"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(60);
    check('Section active : ' + v, $('#view-' + v).classList.contains('active'));
    check('Fil d\'ariane mis à jour (' + v + ')', ($('#crumb .here').textContent || '').length > 3);
  }

  /* ── 6. Passage en Vue détaillée par pays pour les 16 pays ───────── */
  $('#btnCountry').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(40);
  check('Sélecteur de pays visible en mode pays', $('#countryPicker').classList.contains('show'));
  const isos = ['NE','ML','BF','SN','GN','CI','GH','NG','MR','SL','LR','GW','GM','BJ','TG','CV'];
  for (const iso of isos){
    $('#cpBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const opt = $('.cp-opt[data-iso="' + iso + '"]');
    if (!opt){ errors.push('Option pays introuvable : ' + iso); continue; }
    opt.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(50);
    const sc = window.getScope();
    const pays = window.PAYS_PAR_ISO ? window.PAYS_PAR_ISO[iso] : null;
    check('Pays ' + iso + ' : mode détaillé actif', sc.global === false && sc.pays && sc.pays.iso === iso,
          sc.pays ? sc.pays.iso : 'aucun');
    check('Pays ' + iso + ' : districts décomposés', sc.zones.length >= 5 && sc.zones.length <= 8, sc.zones.length + ' zones');
    check('Pays ' + iso + ' : scorecard = nb districts', $$('#scoreBody tr').length === sc.zones.length,
          $$('#scoreBody tr').length + ' vs ' + sc.zones.length);
    check('Pays ' + iso + ' : titre & périmètre adaptés',
          ($('#dashTitle').textContent || '').indexOf(sc.pays.nom) >= 0 &&
          ($('#scopeBar').textContent || '').indexOf(sc.pays.nom) >= 0);
    check('Pays ' + iso + ' : 5 KPI recalculés', $$('.kpi').length === 5 &&
          ($('#kpiGrid').textContent || '').indexOf('RÉAPPRO') >= 0);
    check('Pays ' + iso + ' : admissions cohérentes', sc.agg.adm > 0 && sc.agg.adm < 48234, sc.agg.adm + '');
    check('Pays ' + iso + ' : rupture ≤ total pays', sc.agg.stk <= sc.agg.pts);
    // Redessine tous les graphiques dans ce périmètre (avec survol)
    for (const fn of fns){
      const out = window[fn](ctx, 860, 340, 1, null, sc, {});
      const hits = (out && out.hits) || [];
      if (hits.length) window[fn](ctx, 860, 340, 1, hits[0], sc, {});
      if (hits.some(h => !h.tip)) errors.push(fn + ' (' + iso + ') : zone sans tooltip');
    }
    if (pays === null && !window.PAYS_PAR_ISO) warns.push('PAYS_PAR_ISO non exposé (const de script)');
  }

  /* ── 6bis. Intégrité des données : districts ↔ totaux nationaux ───── */
  for (const iso of isos){
    window.eval("ETAT.mode='country';ETAT.pays='" + iso + "';");
    const sc = window.getScope();
    const p = window.eval("PAYS_PAR_ISO['" + iso + "']");
    const somme = (cle) => sc.zones.reduce((a, z) => a + (z[cle] || 0), 0);
    check('Intégrité ' + iso + ' : Σ districts admissions = total pays', somme('adm') === p.adm,
          somme('adm') + ' vs ' + p.adm);
    check('Intégrité ' + iso + ' : Σ districts points ATPE = total pays', somme('pts') === p.pts,
          somme('pts') + ' vs ' + p.pts);
    check('Intégrité ' + iso + ' : Σ districts ruptures = total pays', somme('stk') === p.stk,
          somme('stk') + ' vs ' + p.stk);
    check('Intégrité ' + iso + ' : Σ districts agents = total pays', somme('agents') === p.agents,
          somme('agents') + ' vs ' + p.agents);
    // bornes métier cohérentes
    check('Intégrité ' + iso + ' : guérison ∈ [40,98]', sc.zones.every(z => z.cure >= 40 && z.cure <= 98));
    check('Intégrité ' + iso + ' : abandon ∈ [0,45]', sc.zones.every(z => z.aban >= 0 && z.aban <= 45));
    check('Intégrité ' + iso + ' : synchro ∈ [15,100]', sc.zones.every(z => z.sync >= 15 && z.sync <= 100));
    check('Intégrité ' + iso + ' : score ∈ [5,99]', sc.zones.every(z => z.score >= 5 && z.score <= 99));
    check('Intégrité ' + iso + ' : stockD > 0', sc.zones.every(z => z.stockD > 0));
    // 12 mois de série = cohérent avec le total annuel
    check('Intégrité ' + iso + ' : série 12 mois positive', sc.agg.admS.m2025.every(v => v > 0));
  }
  window.eval("ETAT.mode='global';");

  /* ── 6ter. Cohérence région : un pays en vue globale = même valeur en vue pays ── */
  const sg = window.getScope();
  for (const iso of ['NE','SN','CV']){
    const zGlobal = sg.zones.find(z => z.iso === iso);
    window.eval("ETAT.mode='country';ETAT.pays='" + iso + "';");
    const sp = window.getScope();
    check('Cohérence ' + iso + ' : admissions identiques global/pays',
          zGlobal.adm === sp.agg.adm, zGlobal.adm + ' vs ' + sp.agg.adm);
    check('Cohérence ' + iso + ' : ruptures identiques', zGlobal.stk === sp.agg.stk);
  }
  window.eval("ETAT.mode='global';");

  /* ── 7. Retour en vue globale + recherche de pays ────────────────── */
  /* Retour en vue globale via un parcours utilisateur réel (les eval précédents
     ont modifié l'état sans passer par l'UI) */
  $('#cpBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  $('.cp-opt[data-iso="NE"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(50);
  $('#btnGlobal').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(60);
  check('Retour vue globale', window.getScope().global === true);
  check('Scorecard 16 lignes après retour', $$('#scoreBody tr').length === 16,
        $$('#scoreBody tr').length + ' lignes');
  check('KPI recalculés sur la région après retour',
        ($('#kpiGrid').textContent || '').indexOf("48") >= 0);

  $('#cpBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const search = $('#cpSearch');
  search.value = 'gui';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(20);
  check('Recherche pays filtrante (« gui » → Guinée + Guinée-Bissau)', $$('.cp-opt').length === 2,
        $$('.cp-opt').length + ' résultats');
  search.value = 'zzz';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(20);
  check('Recherche sans résultat gérée', $$('.cp-opt').length === 0 && $('#cpList').textContent.indexOf('Aucun') >= 0);
  search.value = '';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));

  /* ── 8. Tri de la scorecard sur chaque colonne ───────────────────── */
  const ths = $$('#scoreHead th');
  for (let i = 0; i < ths.length; i++){
    ths[i].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(25);
    check('Tri colonne ' + (i + 1), $$('#scoreBody tr').length === 16);
    ths[i].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));  // inverse
    await sleep(25);
  }

  /* ── 9. Événements souris sur les canvas (tooltips + crosshair) ──── */
  const cv = $('#view-overview .chart canvas');
  for (const [x, y] of [[200,150],[420,200],[700,90],[60,300],[859,339]]){
    cv.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: 40 + x, clientY: 100 + y }));
    await sleep(10);
  }
  cv.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
  await sleep(20);
  check('Tooltip masqué après mouseleave', !$('#tip').classList.contains('show'));

  /* ── 10. Plein écran (Fullscreen API) ────────────────────────────── */
  let fsCalled = 0;
  Object.defineProperty(doc, 'fullscreenElement', { get: () => (fsCalled % 2 === 1 ? doc.documentElement : null), configurable: true });
  doc.documentElement.requestFullscreen = () => { fsCalled++; doc.dispatchEvent(new window.Event('fullscreenchange')); return Promise.resolve(); };
  doc.exitFullscreen = () => { fsCalled++; doc.dispatchEvent(new window.Event('fullscreenchange')); return Promise.resolve(); };
  $('#btnFull').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(320);
  check('Plein écran : entrée + classe is-fullscreen', fsCalled === 1 && doc.body.classList.contains('is-fullscreen'));
  $('#btnFull').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(320);
  check('Plein écran : sortie', fsCalled === 2 && !doc.body.classList.contains('is-fullscreen'));

  /* ── 11. Export / impression ─────────────────────────────────────── */
  $('#btnPrint').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(120);

  /* ── 12. Raccourcis clavier ──────────────────────────────────────── */
  for (const k of ['2','3','4','5','6','1','f','g']){
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true }));
    await sleep(40);
  }
  check('Raccourcis clavier sans erreur', true);

  /* ── 13. Redimensionnement ───────────────────────────────────────── */
  window.dispatchEvent(new window.Event('resize'));
  await sleep(260);
  window.dispatchEvent(new window.Event('orientationchange'));
  await sleep(340);

  /* ── 14. Tooltip : contenu riche ─────────────────────────────────── */
  const before = $('#tip').innerHTML;
  cv.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientX: 40 + 420, clientY: 100 + 200 }));
  await sleep(30);
  check('Tooltip généré au survol', $('#tip').innerHTML.length > 40 || before.length > 0);

  /* ── Rapport ─────────────────────────────────────────────────────── */
  const ok = results.filter(r => r.ok).length;
  console.log('\n══════════ RAPPORT DE TESTS ══════════');
  console.log('Assertions réussies : ' + ok + ' / ' + results.length);
  console.log('Zones de survol générées : ' + hitsTotal + ' (testées en survol : ' + hoverTested + ')');
  results.filter(r => !r.ok).forEach(r => console.log('  ✗ ' + r.name + (r.detail ? ' → ' + r.detail : '')));
  if (errors.length){
    console.log('\n── ERREURS (' + errors.length + ') ──');
    const uniq = Array.from(new Set(errors));
    uniq.slice(0, 40).forEach(e => console.log('  • ' + e));
    if (uniq.length > 40) console.log('  … +' + (uniq.length - 40) + ' autres');
  } else console.log('\nAucune erreur d\'exécution détectée ✔');
  if (warns.length) console.log('Avertissements ignorés : ' + Array.from(new Set(warns)).slice(0,5).join(' | '));
  console.log('══════════════════════════════════════\n');
  process.exit(errors.length || ok !== results.length ? 1 : 0);
})().catch(e => { console.error('HARNESS CRASH', e); process.exit(2); });
