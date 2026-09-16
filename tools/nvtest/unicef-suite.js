/* Suite d'intégration jsdom — cockpit UNICEF (#unicef) + réutilisation du noyau.
   Vérifie :
   • le module se monte sur le noyau NutriVision (pas de duplication) ;
   • AUCUNE fonctionnalité héritée supprimée (renderUNICEF, KPI, cartes d'âge,
     alimentation, maternel, anémie, tendances, GIS, alertes, V38) ;
   • la géométrie des graphiques (aucune courbe hors cadre, aucun NaN) ;
   • le moteur : prévision d'ensemble, simulation d'interventions, hotspots,
     alerte précoce, équité, qualité des données ;
   • chaque contrôle agit réellement (boutons, curseurs, listes, tuiles GIS). */
const H = require('./harness');

let pass = 0, fail = 0;
const fails = [];
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label); console.log('  ✗ ' + label); }
}
function eq(a, b, label) { ok(a === b, label + ' (' + JSON.stringify(a) + ' vs ' + JSON.stringify(b) + ')'); }
function near(a, b, tol, label) { ok(Math.abs(a - b) <= (tol == null ? 1e-6 : tol), label + ' (' + a + ' ≈ ' + b + ')'); }
function section(t) { console.log('\n— ' + t); }

(async () => {
  const { win, doc, logs } = await H.load();
  await H.waitFor(() => win.NutriUnicef && win.NutriUnicef.state && win.NutriUnicef.state.mounted, 25000, 'NutriUnicef mounted');
  await H.act(win, () => win.go && win.go('unicef'), 900);
  const NU = win.NutriUnicef, NV = win.NutriVision;
  const root = doc.getElementById('unicef');
  const q = (s) => root.querySelector(s);
  async function select(sel, value, settle) {
    const el = doc.querySelector(sel);
    if (!el) throw new Error('select introuvable : ' + sel);
    /* la couche i18n de la page traduit les libellés — et donc les valeurs des
       options qui n'ont pas d'attribut value : on vise l'option équivalente */
    const wanted = String(value);
    const has = el.tagName === 'SELECT' && Array.prototype.some.call(el.options, (o) => (o.value || o.textContent) === wanted);
    if (el.tagName === 'SELECT' && !has) {
      const flat = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const hit = Array.prototype.filter.call(el.options, (o) => flat(o.value || o.textContent).indexOf(flat(wanted).slice(0, 3)) === 0)[0];
      if (hit) el.value = hit.value || hit.textContent; else el.value = wanted;
    } else {
      el.value = wanted;
    }
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    await H.sleep(settle == null ? 700 : settle);
    return el;
  }
  const qa = (s) => Array.prototype.slice.call(root.querySelectorAll(s));

  /* ---------------------------------------------------------------- A */
  section('A. Chargement & intégration sur le noyau réutilisable');
  ok(!!NU && !!NV, 'NutriVision + NutriUnicef exposés');
  ok(NU.state.mounted === true, 'module UNICEF monté');
  ok(root.classList.contains('nv-scope') && root.classList.contains('nv-unicef'), '#unicef porte .nv-scope.nv-unicef');
  ok(qa('.nv-panel').length >= 8, 'panneaux du cockpit présents (' + qa('.nv-panel').length + ')');
  ok(typeof win.renderUNICEF === 'function', 'renderUNICEF() toujours disponible');
  ok(win.renderUNICEF.__nvWrapped === true, 'renderUNICEF() encapsulé (non remplacé)');
  ok(NU.engine && typeof NU.engine.forecast === 'function' && typeof NU.engine.simulate === 'function', 'API moteur exposée');
  ok(NV.app.get('unicef') && NV.app.get('citizen'), 'les deux modules enregistrés dans NV.app');
  ok(qa('.nv-pipe-step').length >= 9, 'pipeline IA visible (' + qa('.nv-pipe-step').length + ' étapes)');

  /* ---------------------------------------------------------------- B */
  section('B. Fonctionnalités héritées conservées');
  eq(qa('.institution-kpis .inst-kpi').length, 5, 'les 5 KPI institutionnels d\'origine');
  ok(/^[0-9]/.test((q('#unicefStunting') || {}).textContent || ''), 'KPI hérité #unicefStunting rempli (' + (q('#unicefStunting') || {}).textContent + ')');
  ok(/^[0-9]/.test((q('#unicefChildren') || {}).textContent || ''), 'KPI hérité #unicefChildren rempli');
  eq(qa('#unicefAgeCards .age-card').length, 5, 'les 5 cartes d\'âge d\'origine');
  ok(qa('#unicefFeedingIndicators .feeding-row').length >= 3, 'indicateurs ANJE d\'origine (' + qa('#unicefFeedingIndicators .feeding-row').length + ')');
  ok(qa('#unicefMaternal .maternal-row').length >= 2, 'panneau nutrition maternelle d\'origine');
  ok(qa('#unicefAnaemiaPanel .maternal-row').length >= 2, 'panneau anémie d\'origine');
  eq(qa('#unicefAlerts .alert-row').length, 2, 'les 2 signaux hérités conservés');
  ok(!!q('#unicefAlerts [data-nv-warn]'), 'signaux Monte-Carlo ajoutés aux alertes héritées');
  ok(!!q('#unicefTrendChart .trend-bars'), 'barres de tendance héritées conservées');
  eq(q('#unicefTrendChart .trend-bars').style.display, 'none', 'barres héritées masquées au profit du vrai graphique');
  ok(!!q('#unicefTrendChart [data-chart="uniTrend"] svg'), 'vrai graphique NV dans la carte « Malnutrition Trends »');
  ok(!!q('#unicefCountry') && q('#unicefCountry').options.length >= 15, 'liste de pays héritée intacte (' + (q('#unicefCountry') || { options: [] }).options.length + ')');
  ok(!!q('#unicefLevel') && !!q('#unicefYear'), 'sélecteurs niveau / année hérités intacts');
  const v38c = q('#v38-unicef');
  ok(!v38c || v38c.style.display === 'none', 'canvas Chart.js hérité masqué (pas de bloc blanc)');
  const v38kpi = qa('.v38-kpis .v38-kpi');
  ok(v38kpi.length === 0 || !/248,620/.test(v38kpi[0].textContent), 'KPI V38 resynchronisés sur les données du moteur');

  /* ---------------------------------------------------------------- C */
  section('C. Géométrie des graphiques (aucune courbe hors cadre)');
  const hosts = qa('[data-chart]');
  const v38canvas = !!doc.querySelector('#v38-unicef');
  ok(hosts.length >= 7, 'hôtes de graphique montés (' + hosts.length + (v38canvas ? ', canvas V38 présent' : ', sans canvas V38') + ')');
  if (v38canvas) ok(!!q('[data-chart="uniAgeBars"]'), 'graphique par tranche d\'âge substitué au canvas V38');
  else ok(!q('[data-chart="uniAgeBars"]'), 'pas de graphique fantôme en l\'absence de canvas V38');
  let checked = 0, nan = 0, clipped = 0; const bad = [];
  hosts.forEach((host) => {
    const key = host.getAttribute('data-chart');
    const svg = host.querySelector('svg');
    if (!svg) { bad.push(key + ':vide'); return; }
    const vb = (svg.getAttribute('viewBox') || '0 0 0 0').split(' ').map(Number);
    if (svg.querySelector('clipPath')) clipped++;
    Array.prototype.slice.call(svg.querySelectorAll('path')).forEach((p) => {
      const d = p.getAttribute('d') || '';
      if (/NaN|Infinity/.test(d)) { nan++; bad.push(key + ':NaN'); return; }
      if (!/nv-series|nv-area|nv-cone|nv-stack/.test(p.getAttribute('class') || '')) return;
      checked++;
      H.pathPoints(d).forEach((pt) => {
        if (pt[1] < vb[1] - 1 || pt[1] > vb[1] + vb[3] + 1 || pt[0] < vb[0] - 1 || pt[0] > vb[0] + vb[2] + 1) bad.push(key + ':hors-cadre');
      });
    });
  });
  eq(nan, 0, 'aucun NaN/Infinity dans les tracés');
  ok(checked > 10, 'tracés vérifiés (' + checked + ')');
  ok(clipped >= 3, 'découpage clipPath actif sur les courbes (' + clipped + ')');
  ok(bad.length === 0, 'aucun tracé hors cadre' + (bad.length ? ' → ' + bad.slice(0, 4).join(', ') : ''));

  /* ---------------------------------------------------------------- D */
  section('D. Moteur de prévision d\'ensemble');
  const f = NU.engine.forecast('TG', 'stunting', 8);
  ok(!!f && !!f.fc, 'forecast() retourne un objet complet');
  eq(f.fc.point.length, 8, 'horizon de 8 ans respecté');
  eq(f.past[f.past.length - 1], 18, 'série ancrée sur la valeur nationale héritée (TG = 18 %)');
  eq(f.years[0], 2000, 'historique reconstruit depuis 2000');
  eq(f.fc.models.length, 6, '6 modèles en compétition');
  ok(f.fc.models.filter((m) => !m.dropped).length >= 2, 'au moins 2 modèles retenus');
  ok((f.fc.steps || []).length >= 9, 'étapes du raisonnement exposées (' + (f.fc.steps || []).length + ')');
  ok(f.fc.backtest && f.fc.backtest.folds > 0, 'backtest walk-forward (' + f.fc.backtest.folds + ' plis)');
  ok(f.fc.calibration && f.fc.calibration.volScale > 0, 'calibration des intervalles');
  ok(f.fc.paths && f.fc.paths.length > 100, 'trajectoires Monte-Carlo (' + f.fc.paths.length + ')');
  let ordered = true;
  for (let i = 0; i < 8; i++) if (!(f.fc.p10[i] <= f.fc.point[i] + 1e-9 && f.fc.point[i] <= f.fc.p90[i] + 1e-9)) ordered = false;
  ok(ordered, 'P10 ≤ P50 ≤ P90 sur tout l\'horizon');
  const f2 = NU.engine.forecast('TG', 'stunting', 8);
  eq(JSON.stringify(f2.fc.point), JSON.stringify(f.fc.point), 'prévision déterministe (cache)');
  const fSc = NU.engine.forecast('TG', 'stunting', 8, -0.85);
  ok(fSc.fc.point[7] < f.fc.point[7], 'une dérive de politique publique abaisse bien la trajectoire (' + f.fc.point[7].toFixed(1) + ' → ' + fSc.fc.point[7].toFixed(1) + ')');
  const fNG = NU.engine.forecast('NG', 'stunting', 8);
  ok(fNG.past[fNG.past.length - 1] === 29, 'ancrage Nigeria cohérent avec le fichier hérité (29 %)');

  /* ---------------------------------------------------------------- E */
  section('E. Simulateur d\'interventions');
  const sim = NU.engine.simulate(null, { horizon: 8 });
  ok(!!sim && !!sim.totals, 'simulate() retourne un objet complet');
  ok(sim.programmes.length >= 5, 'programmes actifs (' + sim.programmes.length + ')');
  ok(sim.totals.daly > 0, 'DALY évités > 0 (' + Math.round(sim.totals.daly) + ')');
  ok(sim.totals.cases > 0, 'cas évités > 0 (' + Math.round(sim.totals.cases) + ')');
  ok(sim.totals.costDaly > 0, 'coût par DALY calculé (' + Math.round(sim.totals.costDaly) + ' $)');
  ok(sim.totals.roi > 0, 'ROI calculé (×' + sim.totals.roi.toFixed(1) + ')');
  ok(['veryCE', 'ce', 'notCE'].indexOf(sim.totals.verdict) >= 0, 'verdict de coût-efficacité (' + sim.totals.verdict + ')');
  const d = sim.indicators.stunting.delta;
  ok(d.p10 <= d.p50 && d.p50 <= d.p90, 'incertitude ordonnée P10 ≤ P50 ≤ P90');
  ok(sim.indicators.stunting.intervention[7] <= sim.indicators.stunting.baseline[7], 'l\'intervention réduit la prévalence du retard');
  const none = NU.engine.simulate({ ebf: 0, iyfc: 0, sam: 0, mnp: 0, ifa: 0, fort: 0, wash: 0, cash: 0, csc: 0 }, { horizon: 8 });
  near(none.totals.cases, 0, 1e-6, 'aucun levier → aucun cas évité');
  const small = NU.engine.simulate({ ebf: 15, sam: 20 }, { horizon: 8 });
  const big = NU.engine.simulate({ ebf: 75, sam: 85 }, { horizon: 8 });
  ok(Math.abs(big.indicators.stunting.delta.p50) > Math.abs(small.indicators.stunting.delta.p50), 'effet croissant avec la couverture');
  ok(big.annualCost > small.annualCost, 'coût croissant avec la couverture');
  const poor = NU.engine.simulate(null, { horizon: 8, budget: 1e6 });
  ok(poor.overBudget === true && poor.scale < 1, 'contrainte budgétaire : couverture réduite automatiquement (×' + poor.scale.toFixed(2) + ')');
  ok(poor.annualCost <= 1e6 * 1.02, 'le coût annualisé respecte le budget imposé');
  const ranked = sim.programmes.map((r) => r.costDaly == null ? Infinity : r.costDaly);
  ok(ranked.every((v, i) => i === 0 || ranked[i - 1] <= v), 'frontière classée par coût / DALY croissant');

  /* ---------------------------------------------------------------- F */
  section('F. Points chauds, alerte précoce, équité, qualité des données');
  const C = NU.state.country;
  const hs = NU.engine.hotspots(C);
  eq(hs.length, 12, '12 districts');
  ok(hs.every((x, i) => i === 0 || hs[i - 1].risk >= x.risk), 'districts classés par risque décroissant');
  ok(hs.every((x) => x.risk >= 0 && x.risk <= 100), 'indice de risque borné 0-100');
  const natU5 = NU.data.anchor(C).u5 * 1e6;
  const sumU5 = hs.reduce((s, x) => s + x.u5, 0);
  ok(Math.abs(sumU5 - natU5) / natU5 <= 0.12, 'population < 5 ans des districts ≈ population nationale (' + (sumU5 / 1e6).toFixed(2) + ' vs ' + (natU5 / 1e6).toFixed(2) + ' M)');
  const w = NU.engine.warning(C, 8);
  eq(w.length, 9, '9 indicateurs surveillés');
  ok(w.every((x) => x.pBreach >= 0 && x.pBreach <= 1), 'P(franchissement) bornée');
  ok(['critical', 'high', 'moderate', 'low'].indexOf(w[0].severity) >= 0, 'sévérité attribuée (' + w[0].severity + ')');
  ok(w.every((x) => !!x.action), 'chaque signal porte une action recommandée');
  const eqs = NU.engine.equity(C);
  ok(eqs.ratioRuralUrban > 1, 'ratio rural / urbain > 1 (×' + eqs.ratioRuralUrban.toFixed(2) + ')');
  ok(eqs.ratioQuintile > 1 && eqs.gini > 0, 'gradient de richesse et inégalité calculés');
  const dq = NU.engine.dataQuality(C);
  eq(dq.length, 9, 'qualité des données pour 9 indicateurs');
  ok(dq.every((x) => x.confidence > 0 && x.confidence <= 1), 'confiance bornée (0-1]');
  ok(dq.every((x) => !!x.source && x.lastRound <= 2026), 'source et dernier passage renseignés');
  const sh = NU.engine.shocks(C, 'wasting');
  ok(Array.isArray(sh), 'détection de chocs sur la série émaciation (' + sh.length + ' détectés)');

  /* ---------------------------------------------------------------- G */
  section('G. Portée administrative (National / Region / District)');
  const natRisk = NU.engine.risk(C);
  const natSt = NU.engine.series(C, 'stunting').values.slice(-1)[0];
  const natBurden = NU.engine.burden(C).u5;
  const natLabel = NU.data.scope().label;
  await select('#unicefLevel', 'District');
  eq(NU.state.level, 'District', 'le niveau District est pris en compte');
  const distRisk = NU.engine.risk(C);
  ok(Math.abs(distRisk - natRisk) > 0.05, 'le risque composite change avec la portée (' + natRisk + ' → ' + distRisk + ')');
  const distSt = NU.engine.series(C, 'stunting').values.slice(-1)[0];
  ok(distSt !== natSt, 'les séries suivent la portée administrative (' + natSt + ' → ' + distSt + ')');
  ok(NU.engine.burden(C).u5 < natBurden * 0.6, 'la population exposée se restreint au district (' + Math.round(natBurden) + ' → ' + Math.round(NU.engine.burden(C).u5) + ')');
  ok(NU.data.scope().label && NU.data.scope().label !== natLabel, 'étiquette de portée affichée (' + NU.data.scope().label + ')');
  await select('#unicefLevel', 'Region');
  eq(NU.state.level, 'Region', 'le niveau Région est pris en compte malgré la traduction des options');
  ok(NU.data.scope().label.indexOf('6') > 0 || /égion|egion/.test(NU.data.scope().label), 'agrégat régional (' + NU.data.scope().label + ')');
  await select('#unicefLevel', 'National');
  eq(NU.state.level, 'National', 'retour au niveau national');
  near(NU.engine.risk(C), natRisk, 1e-6, 'risque composite national restauré');
  near(NU.engine.series(C, 'stunting').values.slice(-1)[0], natSt, 1e-6, 'série nationale restaurée');

  /* ---------------------------------------------------------------- H */
  section('H. Interactions — chaque contrôle agit');
  await select('#uniFcInd', 'wasting', 900);
  eq(NU.state.indicator, 'wasting', 'sélecteur d\'indicateur → état');
  ok(/Wasting|Émaciation/.test(q('#uniAiSub').textContent), 'pipeline IA re-libellé (' + q('#uniAiSub').textContent + ')');
  await select('#uniFcInd', 'stunting', 700);
  const hz = q('#uniFcHorizon');
  hz.value = '12';
  hz.dispatchEvent(new win.Event('input', { bubbles: true }));
  await H.sleep(700);
  eq(NU.state.horizon, 12, 'curseur d\'horizon → état');
  ok(/12/.test(q('#uniFcHorizon-out').textContent), 'sortie du curseur mise à jour');
  ok(q('#uniSimHorizon').value === '12', 'curseur miroir (simulation) synchronisé');
  await select('#uniSimPreset', 'max', 900);
  eq(NU.state.scenario, 'max', 'préréglage « ambition maximale » appliqué');
  eq(NU.state.levers.sam, 90, 'leviers du préréglage appliqués (SAM 90 %)');
  ok(q('#uniSimBudget').value === '120', 'curseur budget repositionné');
  const beforeCost = q('#uniSimKpis').textContent;
  await select('#uniSimPreset', 'austerity', 900);
  ok(q('#uniSimKpis').textContent !== beforeCost, 'le scénario modifie réellement les résultats chiffrés');
  const levEl = q('#uniLeviyfc');
  levEl.value = '70';
  levEl.dispatchEvent(new win.Event('input', { bubbles: true }));
  await H.sleep(700);
  eq(NU.state.levers.iyfc, 70, 'levier de programme → état');
  eq(NU.state.scenario, 'custom', 'un levier manuel bascule en scénario personnalisé');
  /* boutons d'action */
  const clicks = ['uni-run-forecast', 'uni-run-sim', 'uni-replay-ai', 'uni-refresh'];
  for (let i = 0; i < clicks.length; i++) {
    const btn = q('[data-nv-action="' + clicks[i] + '"]');
    ok(!!btn, 'bouton présent : ' + clicks[i]);
    if (btn) { await H.act(win, () => btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 700); }
  }
  ok(true, 'aucune exception sur les boutons d\'action');
  /* segmentation */
  const seg = q('[data-nv-seg="uni-kpi-view"] [data-nv-arg="burden"]');
  ok(!!seg, 'segment « charge de morbidité » présent');
  await H.act(win, () => seg.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 600);
  ok(/Enfants affectés|Children affected|non couverts|not covered/.test(q('#uniKpis').textContent), 'vue « charge » affiche des effectifs d\'enfants');
  const segL = q('[data-nv-seg="uni-kpi-view"] [data-nv-arg="level"]');
  await H.act(win, () => segL.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 500);
  /* tuile GIS → focus district */
  const tile = q('.nv-uni-tile');
  ok(!!tile, 'tuiles de la couche GIS rendues');
  eq(qa('.nv-uni-tile').length, 12, '12 tuiles de district');
  const tileName = tile.getAttribute('data-district');
  await H.act(win, () => tile.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 900);
  eq(NU.state.focusDistrict, tileName, 'clic sur une tuile → district ciblé');
  eq(q('#unicefLevel').value, 'District', 'le sélecteur hérité suit le ciblage');
  ok(q('.nv-uni-tile.sel') !== null, 'tuile sélectionnée marquée visuellement');
  /* couche GIS */
  const gl = q('[data-nv-seg="uni-gis-layer"] [data-nv-arg="anaemia"]');
  await H.act(win, () => gl.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 500);
  eq(NU.state.gisLayer, 'anaemia', 'changement de couche SIG');
  /* modales */
  const modals = ['uni-gis-open', 'uni-district', 'uni-action-plan'];
  for (let i = 0; i < modals.length; i++) {
    const b = q('[data-nv-action="' + modals[i] + '"]');
    ok(!!b, 'déclencheur de modale : ' + modals[i]);
    if (!b) continue;
    await H.act(win, () => b.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 500);
    const back = doc.querySelector('.nv-modal-backdrop');
    ok(!!back, 'modale ouverte : ' + modals[i]);
    if (back) {
      ok(back.querySelectorAll('.nv-table tr, .nv-uni-tile, .nv-step').length > 0, 'contenu de la modale rendu : ' + modals[i]);
      const close = back.querySelector('[data-nv-close]');
      await H.act(win, () => close.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 300);
    }
  }
  await H.sleep(400);
  eq(doc.querySelectorAll('.nv-modal-backdrop').length, 0, 'toutes les modales refermées');
  /* exports */
  let blobs = 0;
  const origClick = win.HTMLAnchorElement.prototype.click;
  win.HTMLAnchorElement.prototype.click = function () { blobs++; };
  const bj = q('[data-nv-action="uni-export-json"]'), bc = q('[data-nv-action="uni-export-csv"]'), bh = q('[data-nv-action="uni-export-hotspots"]');
  ok(!!bj && !!bc && !!bh, 'boutons d\'export présents');
  await H.act(win, () => bj.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 300);
  await H.act(win, () => bc.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 300);
  await H.act(win, () => bh.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 300);
  ok(blobs >= 3, 'exports JSON + CSV + hotspots déclenchés (' + blobs + ')');
  win.HTMLAnchorElement.prototype.click = origClick;
  /* rapport imprimable */
  const rp = q('[data-nv-action="uni-report"]');
  ok(!!rp, 'bouton de rapport présent');
  /* pays : changement complet de contexte */
  await select('#unicefCountry', 'NG', 1400);
  eq(NU.state.country, 'NG', 'changement de pays pris en compte');
  ok(/Nigeria/.test(q('#uniHeroChips').textContent), 'hero re-libellé sur le Nigeria');
  ok(!!NU.data.names['NG'] && /Nigeria/.test(NU.data.names['NG'] + ''), 'fichier Nigeria chargé (' + NU.data.names['NG'] + ')');
  await select('#unicefLevel', 'National');
  near(NU.engine.series('NG', 'stunting').values.slice(-1)[0], 29, 0.001, 'série nationale Nigeria ancrée à 29 % (fichier hérité)');
  near(NU.data.anchor('NG').stunting, 29, 0.001, 'ancre Nigeria = 29 %');
  await select('#unicefCountry', 'TG', 1200);
  eq(NU.state.country, 'TG', 'retour au Togo');
  /* bouton hérité « Explore GIS » : toast + atelier SIG */
  const gisCardEl = q('#unicefGIS');
  const gisBtn = (gisCardEl && gisCardEl.closest('.card') ? gisCardEl.closest('.card').querySelector('.section-head button') : null) ||
    root.querySelector('[data-i18n="ui.explore_gis"]');
  ok(!!gisBtn, 'bouton hérité « Explore GIS » conservé');
  await H.act(win, () => gisBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 600);
  ok(!!doc.querySelector('.nv-modal-backdrop'), 'le bouton hérité ouvre désormais l\'atelier SIG');
  const cb = doc.querySelector('.nv-modal-backdrop [data-nv-close]');
  if (cb) await H.act(win, () => cb.dispatchEvent(new win.MouseEvent('click', { bubbles: true })), 400);

  /* ---------------------------------------------------------------- I */
  section('I. Courbes non dupliquées');
  await select('#uniFcScenario', 'bau', 1000);
  const fHost = q('[data-chart="uniForecast"]');
  const paths = fHost ? fHost.querySelectorAll('.nv-series').length : 0;
  ok(paths >= 2 && paths <= 3, 'nombre de courbes tracées cohérent (' + paths + ')');
  const p50count = fHost ? Array.prototype.slice.call(fHost.querySelectorAll('.nv-legend-t')).filter((x) => /^P50/.test(x.textContent.trim())).length : 0;
  ok(p50count <= 2, 'au plus 2 courbes P50 en légende (' + p50count + ')');
  await select('#uniFcScenario', 'accelerated', 1000);
  const paths2 = qa('[data-chart="uniForecast"] .nv-series').length;
  ok(paths2 >= paths, 'un scénario avec dérive ajoute au plus une courbe (' + paths + ' → ' + paths2 + ')');

  /* ---------------------------------------------------------------- J */
  section('J. Internationalisation');
  const titleBefore = q('#uniFcPanel h3').textContent;
  await H.act(win, () => NV.i18n.set('fr'), 700);
  const titleFr = q('#uniFcPanel h3').textContent;
  ok(/Prévision d'ensemble/.test(titleFr), 'titre traduit en français (' + titleFr + ')');
  await H.act(win, () => NV.i18n.set('en'), 700);
  const titleEn = q('#uniFcPanel h3').textContent;
  ok(/Ensemble Forecast/.test(titleEn), 'titre traduit en anglais (' + titleEn + ')');
  ok(titleBefore !== titleEn || /Ensemble|Prévision/.test(titleBefore), 're-traduction complète du cockpit');
  await H.act(win, () => NV.i18n.set('fr'), 500);

  /* ---------------------------------------------------------------- K */
  section('K. Contraste (aucun texte clair sur clair)');
  const ASSETS = require('path').join(__dirname, '..', '..', 'nutri1', 'MVP', 'web', 'assets');
  const css = require('fs').readFileSync(ASSETS + '/nutri-vision.css', 'utf8') +
    require('fs').readFileSync(ASSETS + '/nutri-unicef.css', 'utf8');
  const scoped = css.split('}').filter((r) => /\.nv-scope|\.nv-uni/.test(r));
  const whites = scoped.filter((r) => /background[^;]*:\s*(#fff\b|#ffffff|white)/i.test(r));
  eq(whites.length, 0, 'aucun fond blanc codé en dur dans les règles .nv-scope / .nv-uni');
  ok(qa('.nv-uni-tile-t').length > 0 && qa('.nv-uni-tile-v').length > 0, 'libellés de tuiles SIG présents (contraste audité séparément)');

  /* ---------------------------------------------------------------- L */
  section('L. Console');
  /* le bac à sable est hors ligne : Chart.js (CDN) et les polices Google échouent,
     ce sont des artefacts d'environnement, pas des défauts de l'application */
  const NET = /Could not load (script|link)|cdn\.jsdelivr|fonts\.googleapis|blob:/;
  const errs = logs.errors.filter((e) => !NET.test(e));
  const warns = logs.warnings.filter((e) => !NET.test(e));
  errs.slice(0, 6).forEach((e) => console.log('    ERR ' + e.slice(0, 180)));
  warns.slice(0, 6).forEach((e) => console.log('    WARN ' + e.slice(0, 180)));
  eq(errs.length, 0, 'aucune erreur console');
  eq(warns.length, 0, 'aucun warning console');

  console.log('\n════════════════════════════════════════');
  console.log('  RÉSULTAT : ' + pass + '/' + (pass + fail) + ' assertions');
  if (fail) { console.log('  ÉCHECS :\n   - ' + fails.join('\n   - ')); }
  console.log('════════════════════════════════════════\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
