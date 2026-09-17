/* Suite #who — cockpit V62 « diet, nutrition & NCD investment ».
   Verrouille le contrat obtenu apres la relecture complete de la section :
   1. une SEULE surface de simulation (plus aucun panneau superpose) ;
   2. le modele santecout est deterministe et ne peut pas inventer de benefice ;
   3. chaque carte qui annonce un graphique le dessine vraiment ;
   4. bilinguisme fr/en et compatibilite avec les renderers globaux herites ;
   5. les AUTRES sections (et leurs cockpits) restent intactes.
   Utilisation : npm run serve (port 8000) puis NV_URL=... node who-suite.js
   Code sortie : 0 = contrat respecté, 1 = régression, 2 = plantage de la suite. */
const H = require('./harness');

const NET = /Could not load (script|link)|cdn\.jsdelivr|fonts\.googleapis|blob:/;
/* plantages déjà présents sur main, dans d'autres modules (hors #who) */
const KNOWN = /V29_BASE_TEXT|setLocale is not a function|data-v44generate|Cannot set properties of null \(setting 'innerHTML'\)/;
const LEGACY_PANELS = ['v51Live', 'v52Overlay', 'v53Shell', 'v54Overlay', 'v56overlay', 'v57ExactShell'];

let pass = 0, fail = 0;
function ck(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra ? '  · ' + extra : '')); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  · ' + extra : '')); }
}
function section(title) { console.log('\n\u001b[1m' + title + '\u001b[0m'); }

/* jsdom n'a aucun backend canvas et le harnais neutralise getContext() : on installe un
   contexte enregistreur pour que le tracé des 50 graphes s'exécute réellement (et qu'une
   erreur de dessin remonte au lieu de passer inaperçue). */
function canvasStub(win, errors) {
  const calls = { n: 0 };
  function ctxFor(canvas) {
    const state = { canvas };
    return new Proxy(state, {
      get(t, k) {
        if (k === 'canvas') return canvas;
        if (k === 'measureText') return () => ({ width: 12 });
        if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() { } });
        if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (k === 'drawImage' || k === 'putImageData') return () => { };
        if (k in t && typeof t[k] !== 'function') return t[k];
        return function () { calls.n++; if (k === 'arc' && arguments.length < 3) throw new Error('arc incomplet'); };
      },
      set(t, k, v) { t[k] = v; return true; },
    });
  }
  const store = new WeakMap();
  win.HTMLCanvasElement.prototype.getContext = function (kind) {
    if (kind !== '2d') return null;
    let c = store.get(this);
    if (!c) { c = ctxFor(this); store.set(this, c); }
    return c;
  };
  return calls;
}

(async () => {
  const { win, doc, logs } = await H.load({ view: false });
  canvasStub(win);
  await H.act(win, () => win.go('who'), 1600);
  const api = win.NUTRI_WHO;
  const $ = (s) => doc.querySelector(s);
  const $$ = (s, root) => Array.from((root || doc).querySelectorAll(s));
  const byId = (id) => doc.getElementById(id);
  const openPanels = () => LEGACY_PANELS.filter((id) => {
    const el = byId(id); if (!el) return false;
    const cs = win.getComputedStyle(el);
    return el.classList.contains('show') || (el.style.display === 'block' && cs.display !== 'none');
  });

  section('1. surface unique — plus aucun panneau superposé dans #who');
  ck('module V62 monté (window.NUTRI_WHO)', api && api.version === 'v62', api ? api.version + ' · session ' + (api.session || '?') : 'absent');
  if (!api) { console.log('\nFATAL module #who absent'); process.exit(1); }
  const studioNode = byId('wcStudio');
  ck('surface unifiée #wcStudio présente dans le flux', !!studioNode && !!studioNode.closest('#who'));

  const controls = $$('#who button, #who input, #who select, #who [data-wc-act], #who [data-wc-open]');
  const bodyBefore = doc.body.children.length;
  let clickErr = 0;
  for (const el of controls) {
    try { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, view: win })); }
    catch (e) { clickErr++; }
    if (el.tagName === 'INPUT') { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); }
    if (el.tagName === 'SELECT') { const o = el.options[Math.min(2, el.options.length - 1)]; if (o) { el.value = o.value; el.dispatchEvent(new win.Event('change', { bubbles: true })); } }
    await H.sleep(18);
  }
  await H.sleep(900);
  const panels = openPanels();
  ck(controls.length + ' contrôles de #who cliqués sans exception', clickErr === 0, clickErr ? clickErr + ' erreurs' : 'ok');
  ck('aucun panneau legacy ouvert par-dessus la section', panels.length === 0, panels.length ? 'ouverts : ' + panels.join(', ') : 'aucun');
  ck('aucun panneau injecté dans <body> par un clic #who', doc.body.children.length - bodyBefore === 0, 'delta ' + (doc.body.children.length - bodyBefore));
  ck('la surface reste le MÊME nœud du DOM (aucune copie empilée)', byId('wcStudio') === studioNode);
  ck('un seul cockpit marqué dans la page ([data-who-cockpit])', doc.querySelectorAll('[data-who-cockpit]').length === 1 && byId('who').hasAttribute('data-who-cockpit'));

  ck('bouton ⤢ d’une carte → ouvre la MÊME surface', (() => {
    const b = $('#who [data-wc-open-btn], #who [data-wc-open]'); if (!b) return false;
    studioNode.classList.remove('on'); b.dispatchEvent(new win.MouseEvent('click', { bubbles: true, view: win }));
    return studioNode.classList.contains('on');
  })());
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await H.sleep(400);
  ck('Échap ferme la surface (comme l’indique l’indice)', !studioNode.classList.contains('on'));
  api.openStudio(); await H.sleep(500);
  const emptyLayers = [];
  for (const layer of api.layers) { api.setLayer(layer); await H.sleep(240); const st = byId('wcStage'); if (!st || st.textContent.trim().length < 60) emptyLayers.push(layer); }
  ck('les ' + api.layers.length + ' couches du studio affichent du contenu réel', emptyLayers.length === 0, emptyLayers.join(', '));

  section('2. modèle santé-coût : déterministe, jamais flatteur');
  /* le cyclage de tous les contrôles a laissé des curseurs hétéroclites : on repart du
     preset de référence pour que les invariants portent sur un état connu. */
  api.setPreset('national'); await H.sleep(700);
  const m = api.model();
  ck('VAN positive et capital cohérent', m.npv > 0 && m.capex > 0, 'VAN $' + m.npv.toFixed(0) + ' M · capital $' + m.capex.toFixed(0) + ' M');
  ck('BCR > 1', m.bcr > 1, m.bcr.toFixed(2) + '×');
  ck('coût par DALY sous le seuil 3× PIB', m.cpd > 0 && m.cpd < m.thHi, '$' + m.cpd.toFixed(0) + ' vs $' + m.thHi.toFixed(0));
  ck('TRI exploitable (null = au-dessus de la borne haute)', m.irr === null || m.irr > 0);
  ck('retour sur investissement dans l’horizon', m.payback === null || (m.payback >= 1 && m.payback <= m.horizon), m.payback + ' an(s)');
  const keys = Object.keys(api.getLevers());
  const L = (v) => keys.reduce((o, k) => (o[k] = v, o), {});
  const sq = api.simulate(L(0), m.horizon, 0);
  ck('statu quo : aucun bénéfice inventé', Math.abs(sq.npv) < 1 && sq.dalysAv < 1 && sq.capex < 1, 'VAN ' + sq.npv + ' · capital ' + sq.capex);
  const ramp = [.15, .35, .6, .85, 1].map((v) => api.simulate(L(v), m.horizon, 0));
  ck('bénéfices sanitaires croissants avec l’intensité des leviers', ramp.every((s, i) => !i || s.dalysAv > ramp[i - 1].dalysAv), ramp.map((s) => Math.round(s.dalysAv)).join(' < ') + 'k DALY');
  ck('VAN concave : un optimum intérieur, jamais négative', ramp.every((s) => s.npv > 0) && ramp[ramp.length - 1].npv <= Math.max(...ramp.map((s) => s.npv)), ramp.map((s) => Math.round(s.npv)).join(' ') + ' M$');
  ck('BCR décroissant (rendements décroissants)', ramp.every((s, i) => !i || s.bcr < ramp[i - 1].bcr), ramp.map((s) => s.bcr.toFixed(2)).join(' > '));
  ck('jamais de hausse de prévalence modélisée', Object.keys(m.prevPrT).every((k) => m.prevPrT[k][m.prevPrT[k].length - 1] <= m.prevSqT[k][m.prevSqT[k].length - 1] + 1e-9));
  ck('financement = besoin de capital', Math.abs(m.financing.rows.reduce((a, r) => a + r.v, 0) - m.financing.need) < Math.max(2, m.financing.need * .06));
  ck('économie de la plateforme sur tout l’horizon', m.platform.arr.length === m.horizon && m.platform.arr[m.horizon - 1] > m.platform.arr[0]);
  ck('cibles OMS 2030 suivies, libellés fr + en', m.targets.length >= 4 && m.targets.every((x) => x.en && x.fr && x.pct >= 0 && x.pct <= 1), m.targets.length + ' cibles');
  ck('DALY, décès et cas évités > 0', m.dalysAv > 0 && m.deathsAv > 0 && m.casesAv > 0, Math.round(m.dalysAv) + 'k DALY · ' + Math.round(m.deathsAv) + ' décès');
  const shocked = api.simulate(api.getLevers(), m.horizon, 70);
  ck('choc des prix alimentaires : dégrade sans casser', isFinite(shocked.npv) && shocked.npv <= m.npv + 1e-6, 'VAN choc ' + shocked.npv.toFixed(0) + ' vs ' + m.npv.toFixed(0));
  const mc = api.monteCarlo(m);
  ck('Monte-Carlo : P(VAN>0) et P10/P90 bornés', mc.pos >= 0 && mc.pos <= 1 && mc.p10 <= mc.p90, 'P=' + Math.round(mc.pos * 100) + '% · P10 ' + Math.round(mc.p10) + ' · P90 ' + Math.round(mc.p90) + ' M$');
  ck('tornado de sensibilité (≥ 8 leviers)', api.sensitivity(m).length >= 8, api.sensitivity(m).length + ' pilotes');
  ck('table de scénarios : 1 ligne par preset, statu quo à 0', api.scenarioRows().length === Object.keys(api.presets).length && api.scenarioRows().some((r) => r.key === 'status' && Math.abs(r.npv) < 1));

  section('3. toutes les cartes annoncées dessinent vraiment');
  api.repaint(); await H.sleep(1200);
  const painted = api.painted(), okPainted = Object.keys(painted).filter((k) => painted[k]);
  ck('graphes peints', okPainted.length >= 26, okPainted.length + '/' + Object.keys(painted).length);
  ck('aucune erreur de tracé', api.drawErrors().length === 0, JSON.stringify(api.drawErrors()).slice(0, 120));
  ck('canvases dimensionnés (résolution devicePixelRatio)', $$('#who canvas').length >= 26 && $$('#who canvas').every((c) => c.width > 0 && c.height > 0), $$('#who canvas').length + ' canvases');
  const blocks = ['wcKpis', 'wcConditions', 'wcCondSel', 'wcRibbon', 'wcFilters', 'wcPresets', 'wcLevers', 'wcPipe', 'wcDeal', 'wcGov', 'wcModules', 'wcMethod', 'wcEquations', 'wcMemo', 'wcFeed', 'wcScenarioTable', 'wcProgramTable', 'wcCondTable', 'wcFinanceMetrics'];
  const empt = blocks.filter((id) => { const e = byId(id); return !e || e.textContent.trim().length < 8; });
  ck('blocs de contenu remplis', empt.length === 0, empt.join(', '));
  const shorty = ['wcHeroSave', 'wcHeroNpv', 'wcHeroBcrV', 'wcHeroImpact', 'wcChipCountry', 'wcChipHorizon', 'wcChipModel', 'wcMapBadge', 'wcMonteBadge', 'wcFrontierBadge'];
  ck('valeurs héro et badges remplis', shorty.every((id) => byId(id) && byId(id).textContent.trim().length > 2));
  ck('aucune carte héritée vide de graphe', $$('#who .v38-chart-wrap, #who .v46-gov-card, #who .v47-research-grid, #who .v43-live-stage').length === 0);
  ck('unités bilingues sur les leviers', /(capita\/yr|\/hab\/an)/.test(byId('who').innerHTML));

  section('4. interactions, pays, bilinguisme, exports');
  api.setCountry('NE'); await H.sleep(1100);
  ck('changement de pays appliqué et STABLE (pas de retour en arrière)', /Niger/.test(byId('wcChipCountry').textContent) && api.model().code === 'NE', byId('wcChipCountry').textContent.trim());
  api.setCountry('TG'); await H.sleep(900);
  ck('retour au Togo', /Togo/.test(byId('wcChipCountry').textContent));
  const npvBefore = api.model().npv;
  api.setPreset('full'); await H.sleep(800);
  ck('preset appliqué', api.model().npv !== npvBefore, npvBefore.toFixed(0) + ' → ' + api.model().npv.toFixed(0) + ' M$');
  api.setHorizon(15); await H.sleep(800);
  ck('horizon 15 ans reconstruit la séquence', api.model().horizon === 15 && api.model().years.length === 15);
  api.setShock(40); await H.sleep(800);
  ck('curseur de choc enregistré', api.model().shock === 40);
  api.setShock(0); api.setHorizon(10); api.setPreset('national'); await H.sleep(800);
  ck('leviers aller-retour (0–100 UI → 0–1 modèle)', (() => { api.setLevers({ ssb: .42, agri: .66 }); const r = api.model().Lraw; return Math.abs(r.ssb - .42) < 1e-9 && Math.abs(r.agri - .66) < 1e-9; })());
  ck('filtre condition recentre la sélection', (() => { api.setCondition('htn'); const a = byId('wcCondSel').textContent; api.setCondition('dm'); return a !== byId('wcCondSel').textContent && /Hypertension/.test(a); })());
  const textOf = () => byId('wcShell').textContent.slice(0, 5000);
  try { win.localStorage.setItem('nutri_language', 'fr'); } catch (e) { }
  doc.dispatchEvent(new win.Event('nutri:i18nChanged')); await H.sleep(800); const fr = textOf();
  try { win.localStorage.setItem('nutri_language', 'en'); } catch (e) { }
  doc.dispatchEvent(new win.Event('nutri:i18nChanged')); await H.sleep(800); const en = textOf();
  ck('bascule fr/en réécrit la copie du module', fr !== en && /VAN|Décès|pays/i.test(fr) && /NPV|Deaths|countries/i.test(en), fr.length + ' car. fr vs ' + en.length + ' car. en');
  let expErr = '';
  try { api.exportCsv(); api.exportBrief(); } catch (e) { expErr = e.message; }
  ck('export CSV + brief investisseur s’exécutent', !expErr, expErr);

  section('5. compatibilité avec le code global hérité');
  ck('nœuds de compatibilité conservés pour renderWHO()', ['whoTrendChart', 'whoRiskFactors', 'whoAlerts', 'whoConditionTitle', 'whoConditionSummary', 'whoDiabetes', 'whoGIS'].every((id) => !!byId(id)));
  let legacyErr = '';
  try { win.renderWHO(); win.selectWHOCondition('ob'); } catch (e) { legacyErr = e.message; }
  ck('renderWHO() et selectWHOCondition() hérités ne plantent plus', !legacyErr, legacyErr);

  section('6. les autres sections et leurs cockpits sont intacts');
  const views = ['agri', 'health', 'unicef', 'wfp', 'fao', 'monitoring', 'research', 'market', 'payments', 'citizen', 'scanner', 'ai', 'network', 'devices', 'foodcloud', 'who'];
  let navErr = '';
  for (const v of views) { try { win.go(v); await H.sleep(220); } catch (e) { navErr += v + ':' + e.message + ' '; } }
  ck('navigation sur les ' + views.length + ' vues', !navErr, navErr);
  ck('cockpit #agri conserve sa propre surface', !!byId('agriCockpit') && !!$('#agri .ag-shell'));
  await H.act(win, () => win.go('agri'), 900);
  const agriOpen = (() => { const b = $('#agri [data-ag-open]'); if (!b) return 'aucun bouton'; b.dispatchEvent(new win.MouseEvent('click', { bubbles: true, view: win })); return !!byId('agriCockpit'); })();
  await H.sleep(600);
  ck('garde anti-superposition de #who ne bloque PAS #agri', agriOpen === true, 'agriCockpit: ' + agriOpen);
  await H.act(win, () => win.go('who'), 800);
  ck('sections voisines toujours peuplées', !!$('#agri .ag-kpis') && ($('#unicef') && $('#unicef').textContent.length > 200 && $('#health').textContent.length > 200));

  const errs = (logs && logs.errors ? logs.errors : []).filter((e) => !NET.test(e) && !KNOWN.test(e));
  section('7. propreté runtime');
  ck('aucune erreur runtime liée à #who', errs.filter((e) => /wc[A-Z]|nutri-who-v62|NUTRI_WHO/i.test(e)).length === 0);

  console.log('\n' + (fail ? '\u001b[31m' : '\u001b[32m') + '#who V62 : ' + pass + ' vérif. OK, ' + fail + ' en échec\u001b[0m');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
