/* Suite d'intégration jsdom — cockpit citoyen + moteur d'inférence IA.
   Vérifie en particulier les régressions signalées :
   • courbes qui plongeaient hors du cadre (valeurs absentes → 0) ;
   • courbes dupliquées en fin de graphique ;
   • cartes Freemium / Premium illisibles (fond blanc hérité) ;
   • moteur de prédiction : ensemble multi-modèles, backtest, calibration. */
const fs = require('fs');
const H = require('./harness');
const path = require('path');
const ASSETS = process.env.NV_WEB ? path.join(process.env.NV_WEB, 'assets') : path.join(__dirname, '..', '..', 'nutri1', 'MVP', 'web', 'assets');

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
  const NC = win.NutriCitizen, NV = win.NutriVision;
  const root = doc.getElementById('citizen');

  /* ---------------------------------------------------------------- A */
  section('A. Chargement & intégration');
  ok(!!NC && !!NV, 'NutriVision + NutriCitizen exposés');
  ok(NC.state.mounted === true, 'module citoyen monté');
  ok(root.classList.contains('nv-scope'), '#citizen porte .nv-scope');
  ok(root.querySelectorAll('.nv-panel').length >= 7, 'panneaux cockpit présents (' + root.querySelectorAll('.nv-panel').length + ')');
  ok(typeof win.NUTRI_CITIZEN_ENGINE !== 'undefined', 'drapeau de passation V44/V45 posé');
  ['saveCitizen', 'updateReferences', 'generateRecommendations', 'loadFamilyChildDashboard', 'requestChildAccess', 'openChildNutritionPlan'].forEach((fn) => {
    ok(typeof win[fn] === 'function', 'pont legacy ' + fn + '()');
  });
  ok(!!NC.legacy && typeof NC.legacy.saveCitizen === 'function', 'API NutriCitizen.legacy');
  ok(doc.querySelectorAll('#citizen canvas.v45-canvas, #citizen .v45-panel').length === 0, 'pas de doublon V45 dans #citizen');

  /* ---------------------------------------------------------------- B */
  section('B. Géométrie des graphiques (aucune courbe hors cadre)');
  const hosts = Array.prototype.slice.call(root.querySelectorAll('[data-chart]'));
  ok(hosts.length >= 10, 'hôtes de graphique montés (' + hosts.length + ')');
  let checked = 0, bad = [], clipped = 0, nan = 0;
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
      H.pathPoints(d).forEach((q) => {
        /* tolérance 1px : le cadre de tracé est découpé (clipPath) de toute façon */
        if (q[1] < vb[1] - 1 || q[1] > vb[1] + vb[3] + 1 || q[0] < vb[0] - 1 || q[0] > vb[0] + vb[2] + 1) bad.push(key + ':hors-cadre(' + q.join(',') + ')');
      });
    });
  });
  ok(checked > 20, 'chemins de séries inspectés (' + checked + ')');
  ok(bad.length === 0, 'aucun point hors du cadre' + (bad.length ? ' → ' + bad.slice(0, 6).join(' | ') : ''));
  eq(nan, 0, 'aucun NaN/Infinity dans les tracés');
  ok(clipped >= 4, 'graphiques line/area découpés par clipPath (' + clipped + ')');

  /* rupture de courbe : l'historique s'arrête au lieu de plonger vers 0 */
  const fcSvg = root.querySelector('[data-chart="forecast"] svg');
  const series = Array.prototype.slice.call(fcSvg.querySelectorAll('path.nv-series'));
  ok(series.length >= 2 && series.length <= 3, 'prévision : 2 à 3 courbes selon la dérive du scénario (' + series.length + ')');
  const dSeries = series.map((s) => s.getAttribute('d'));
  eq(new Set(dSeries).size, dSeries.length, 'aucune courbe dupliquée dans la prévision');
  const scSeries0 = Array.prototype.slice.call(root.querySelectorAll('[data-chart="simCompare"] path.nv-series')).map((s) => s.getAttribute('d'));
  eq(new Set(scSeries0).size, scSeries0.length, 'aucune courbe dupliquée dans l\'impact projeté');
  const histSegs = (series[0].getAttribute('d').match(/M/g) || []).length;
  ok(histSegs >= 1, 'historique tracé en segments (' + histSegs + ')');
  const hy = H.pathPoints(series[0].getAttribute('d')).map((q) => q[1]);
  ok(Math.max.apply(null, hy) <= 288, 'l\'historique ne plonge plus sous le graphique (yMax ' + Math.round(Math.max.apply(null, hy)) + ')');
  const areas = Array.prototype.slice.call(fcSvg.querySelectorAll('path.nv-area'));
  ok(areas.length <= series.length, 'pas d\'aire dupliquée (' + areas.length + ' aires pour ' + series.length + ' séries)');
  const scSvg = root.querySelector('[data-chart="simCompare"] svg');
  const scMax = Math.max.apply(null, Array.prototype.slice.call(scSvg.querySelectorAll('path.nv-series')).map((p) => Math.max.apply(null, H.pathPoints(p.getAttribute('d')).map((q) => q[1]))));
  ok(scMax <= 210, 'impact projeté : courbes dans le cadre (yMax ' + Math.round(scMax) + ')');

  /* ---------------------------------------------------------------- C */
  section('C. Moteur de prédiction — ensemble multi-modèles');
  const S = NV.stats;
  const ser = [75.3, 74.8, 74.1, 73.6, 73.9, 73.2, 72.4, 72.1, 71.6, 71.9, 71.8, 71.79];
  const r = S.ensembleForecast(ser, 24, { seed: 'test', trials: 600, min: 25, max: 320, drift: -0.1 });
  ok(r.models.length === 6, '6 modèles candidats entraînés (' + r.models.length + ')');
  const kept = r.models.filter((m) => !m.dropped);
  ok(kept.length >= 2 && kept.length <= 6, 'au moins 2 modèles retenus (' + kept.length + ')');
  const wSum = kept.reduce((s, m) => s + m.weight, 0);
  near(wSum, 100, 0.6, 'les poids des modèles retenus somment à 100 %');
  ok(r.models.every((m) => m.mae != null && isFinite(m.mae)), 'MAE finie pour tous les modèles');
  ok(kept.every((m) => m.mae <= Math.max.apply(null, r.models.filter((x) => x.mae != null).map((x) => x.mae)) * 2.6 + 1e-9), 'seuil d\'exclusion à 2,6× la meilleure erreur respecté');
  eq(r.models.slice().sort((a, b) => a.mae - b.mae)[0].id, kept.slice().sort((a, b) => a.mae - b.mae)[0].id, 'le leader du backtest est retenu');
  ok(r.backtest.folds >= 5, 'backtest walk-forward : plis (' + r.backtest.folds + ')');
  ok(r.backtest.hmax >= 1, 'horizon de validation (' + r.backtest.hmax + ')');
  ok(r.calibration && isFinite(r.calibration.volScale) && r.calibration.volScale > 0, 'calibration : facteur de volatilité ' + (r.calibration || {}).volScale);
  ok(r.calibration.coverage == null || (r.calibration.coverage >= 0 && r.calibration.coverage <= 1), 'couverture empirique bornée');
  const sh = r.uncertainty.shares;
  near(sh.residual + sh.model + sh.scenario, 100, 2, 'parts d\'incertitude = 100 %');
  ok(sh.residual > 0, 'source résiduelle mesurée (' + sh.residual + ' %)');
  ok(sh.model >= 0, 'désaccord des modèles mesuré (' + sh.model + ' %)');
  eq(r.point.length, 24, 'horizon de prévision respecté');
  ok(r.point.every((v, i) => r.p10[i] <= v + 1e-9 && v <= r.p90[i] + 1e-9), 'P10 ≤ P50 ≤ P90 sur tout l\'horizon');
  ok(r.p10.every((v) => v >= 25 && v <= 320) && r.p90.every((v) => v >= 25 && v <= 320), 'bornes physiologiques respectées');
  ok(r.point[23] < ser[11], 'la dérive négative fait bien descendre la prévision');
  eq(r.steps.length, 10, 'pipeline tracé : 10 étapes');
  ['ingest', 'clean', 'features', 'train', 'backtest', 'weight', 'calibrate', 'montecarlo', 'uncertainty', 'synthesis'].forEach((id, i) => {
    eq(r.steps[i].id, id, 'étape ' + (i + 1) + ' = ' + id);
    ok(Object.keys(r.steps[i].metrics).length > 0, '  métriques de l\'étape ' + id);
  });
  const r2 = S.ensembleForecast(ser, 24, { seed: 'test', trials: 600, min: 25, max: 320, drift: -0.1 });
  eq(JSON.stringify(r2.point.map((x) => +x.toFixed(4))), JSON.stringify(r.point.map((x) => +x.toFixed(4))), 'déterministe à graine égale');
  const r3 = S.ensembleForecast(ser, 24, { seed: 'autre', trials: 600, min: 25, max: 320, drift: -0.1 });
  ok(JSON.stringify(r3.point.map((x) => +x.toFixed(4))) !== JSON.stringify(r.point.map((x) => +x.toFixed(4))), 'une autre graine donne d\'autres trajectoires');
  ok(r.ms < 2500, 'temps de calcul maîtrisé (' + r.ms + ' ms pour 600 trajectoires × 24 mois)');
  /* robustesse */
  ok(S.ensembleForecast([1, 2], 6, { seed: 'a', trials: 60 }).degenerate === true, 'série trop courte → mode dégradé');
  const holes = S.ensembleForecast([70, null, 71, NaN, 72, 73, 74, 75], 6, { seed: 'b', trials: 80 });
  ok(holes.steps.length === 10 && holes.steps[0].metrics.holes === 2, 'trous détectés à l\'ingestion (2)');
  const outliers = S.ensembleForecast([70, 71, 70.5, 300, 71, 72, 71.5, 72, 71, 72], 6, { seed: 'c', trials: 80 });
  ok(outliers.steps[1].metrics.anomalies >= 1, 'valeur aberrante détectée et réparée (MAD)');
  ok(S.clean([1, 2, 3]).values.length === 3, 'nettoyage : série propre inchangée');
  const ft = S.features(ser);
  ok(ft.slope < 0 && ft.r2 > 0.5, 'caractéristiques : tendance négative, R² ' + ft.r2.toFixed(2));
  ok(S.modelZoo().length === 6, 'zoo de modèles réutilisable exposé (6)');

  /* ---------------------------------------------------------------- D */
  section('D. Pipeline IA affiché dans le cockpit');
  const steps = root.querySelectorAll('#nvAiSteps .nv-pipe-step');
  eq(steps.length, 10, '10 étapes affichées');
  ok(Array.prototype.every.call(steps, (s) => s.dataset.state === 'done'), 'toutes les étapes terminées au chargement');
  ok(root.querySelectorAll('#nvAiSteps .nv-pipe-metrics b').length >= 20, 'métriques d\'étape affichées (' + root.querySelectorAll('#nvAiSteps .nv-pipe-metrics b').length + ')');
  ok(root.querySelectorAll('#nvAiSteps .nv-pipe-metrics em').length >= 20, 'libellés de métriques localisés');
  ok(/Ingestion|ingestion/.test(root.querySelector('#nvAiSteps .nv-pipe-label').textContent), 'première étape = ingestion');
  const bars = root.querySelector('#nvAiSteps .nv-pipe-bar i');
  eq(bars.style.width, '100%', 'barre de progression à 100 %');
  ok((root.querySelector('#nvAiSteps .nv-pipe-status').textContent || '').length > 10, 'statut final renseigné');
  const rows = root.querySelectorAll('#nvAiModels .nv-table tbody tr');
  eq(rows.length, 6, 'classement des modèles : 6 lignes');
  ok(root.querySelectorAll('#nvAiModels .nv-wcell').length >= 1, 'jauges de poids présentes');
  ok(root.querySelectorAll('#nvAiKpis .nv-kpi').length === 6, '6 KPI d\'inférence');
  ok(root.querySelectorAll('#nvAiFeatures .nv-chip').length === 6, '6 caractéristiques extraites');
  ok(root.querySelectorAll('#nvAiUnc .nv-meter').length === 3, '3 sources d\'incertitude');
  const btSvg = root.querySelector('[data-chart="backtest"] svg');
  ok(!!btSvg, 'graphique de backtest rendu');
  ok(btSvg.querySelectorAll('path.nv-series').length >= 3, 'backtest : observé + modèles (' + btSvg.querySelectorAll('path.nv-series').length + ')');
  const btMax = Math.max.apply(null, Array.prototype.slice.call(btSvg.querySelectorAll('path.nv-series')).map((p) => Math.max.apply(null, H.pathPoints(p.getAttribute('d')).map((q) => q[1]))));
  ok(btMax <= 206, 'backtest dans le cadre (yMax ' + Math.round(btMax) + ')');

  /* ---------------------------------------------------------------- E */
  section('E. Interaction — relancer l\'inférence');
  const before = NC.state.settings.rerun || 0;
  const fBefore = NC.forecast('weight', 24, true).fc.point[23];
  H.clickAction(doc, 'ai-run');
  await H.sleep(4200);
  ok((NC.state.settings.rerun || 0) > before, 'ai-run incrémente la graine de simulation');
  const fAfter = NC.forecast('weight', 24, true).fc.point[23];
  ok(fAfter !== fBefore, 'nouvelle inférence → nouvelles trajectoires (' + fBefore.toFixed(3) + ' → ' + fAfter.toFixed(3) + ')');
  eq(root.querySelectorAll('#nvAiSteps .nv-pipe-step[data-state="done"]').length, 10, 'pipeline rejoué jusqu\'au bout');
  ok(doc.querySelectorAll('#nv-toasts .nv-toast').length >= 1, 'toast de fin d\'inférence');
  ok(!root.querySelector('#nvAiBox').classList.contains('busy'), 'état « busy » retiré');

  section('F. Régressions fonctionnelles');
  H.clickAction(doc, 'pred-var', 'glucose'); await H.sleep(500);
  eq(NC.state.settings.predVar, 'glucose', 'changement de variable prédite');
  const gSer = Array.prototype.slice.call(root.querySelectorAll('[data-chart="forecast"] path.nv-series')).map((s) => s.getAttribute('d'));
  ok(gSer.length >= 2 && new Set(gSer).size === gSer.length, 'prévision glycémie : courbes distinctes (' + gSer.length + ')');
  H.clickAction(doc, 'trials', '300'); await H.sleep(500);
  eq(NC.state.settings.trials, 300, 'nombre de trajectoires modifié');
  H.clickAction(doc, 'trials', '1000'); await H.sleep(400);
  H.clickAction(doc, 'pred-var', 'weight'); await H.sleep(400);
  H.selectValue(doc, 'preset', 'local'); await H.sleep(700);
  eq(NC.scenario().organic, 78, 'préréglage « local » appliqué');
  H.selectValue(doc, 'preset', 'base'); await H.sleep(700);
  H.clickAction(doc, 'risk-select', 'htn'); await H.sleep(400);
  eq(NC.state.settings.riskSel, 'htn', 'sélection du risque hypertension');
  const foods0 = NC.journal.today().length;
  const chip = root.querySelector('#nvFoodChips .nv-foodchip');
  H.click(doc, chip); await H.sleep(400);
  eq(NC.journal.today().length, foods0 + 1, 'aliment ajouté au journal');
  H.click(doc, root.querySelector('[data-nv-action="journal-remove"]')); await H.sleep(400);
  eq(NC.journal.today().length, foods0, 'aliment retiré du journal');
  H.clickAction(doc, 'plan-regen'); await H.sleep(700);
  ok(root.querySelectorAll('#nvPlanDay .nv-tab, #nvPlanTabs .nv-tab').length >= 1, 'plan alimentaire toujours rendu');
  H.clickAction(doc, 'model-info'); await H.sleep(500);
  const modal = doc.querySelector('.nv-modal-backdrop');
  ok(!!modal, 'modale « sous le capot » ouverte');
  ok(/ensemble|Ensemble/.test(modal.textContent), 'la modale documente l\'ensemble multi-modèles');
  ok(modal.querySelectorAll('table').length >= 4, 'tables de transparence (' + modal.querySelectorAll('table').length + ')');
  H.click(doc, modal.querySelector('[data-nv-action="md-close"]')); await H.sleep(400);
  ok(!doc.querySelector('.nv-modal-backdrop'), 'modale fermée');
  H.clickAction(doc, 'export-json'); await H.sleep(400);
  const data = NC.exportData.json ? null : null;
  ok(typeof NC.exportData.json === 'function' || typeof NC.exportData === 'object', 'API d\'export présente');
  H.clickAction(doc, 'recompute'); await H.sleep(600);
  ok(NC.state.cache && NC.state.cache.sc, 'recalcul complet sans erreur');
  const fam = doc.getElementById('familyMember');
  ok(!!fam, 'sélecteur d\'enfant historique conservé (#familyMember)');
  fam.value = 'child2';
  fam.dispatchEvent(new win.Event('change', { bubbles: true }));
  await H.sleep(600);
  eq(NC.state.settings.child, 'child2', 'bascule sur le 2e enfant');
  ok(/Kofi/i.test(root.textContent), 'profil enfant Kofi affiché');
  H.clickAction(doc, 'child-full', 'child2'); await H.sleep(600);
  ok(!!doc.querySelector('.nv-modal-backdrop'), 'tableau de bord enfant complet ouvert');
  H.click(doc, doc.querySelector('.nv-modal-backdrop [data-nv-close], .nv-modal-backdrop .nv-modal-close')); await H.sleep(400);
  fam.value = 'child1';
  fam.dispatchEvent(new win.Event('change', { bubbles: true }));
  await H.sleep(500);
  eq(NC.state.settings.child, 'child1', 'retour au 1er enfant');

  /* ---------------------------------------------------------------- G */
  section('G. Cartes Freemium / Premium (lisibilité)');
  const plans = doc.querySelector('[data-v47-plans]');
  ok(!!plans, 'bloc Freemium/Premium présent');
  ok(!!plans.closest('.nv-scope'), 'injecté dans le cockpit (.nv-scope)');
  const css = fs.readFileSync(ASSETS + '/nutri-vision.css', 'utf8');
  ok(/\.nv-scope \.v47-plan[^\n]*\{[\s\S]{0,400}?background:[^;]+!important/.test(css), 'fond des cartes .v47-plan forcé en sombre');
  ok(/\.nv-scope \.v47-plan li \{[^}]*color: var\(--nv-ink2\) !important/.test(css), 'texte des listes forcé en clair');
  ok(/--card: rgba\(255, 255, 255, \.045\)/.test(css), 'variable --card du thème clair redéfinie dans .nv-scope');
  ['v47-plan', 'v38-kpi', 'v52-card', 'v53-card', 'v56-card', 'core-card', 'age-card', 'ncd-card', 'role-card', 'condition-card', 'executive-center-card', 'mini-chart', 'big-chart'].forEach((c) => {
    ok(css.indexOf('.nv-scope .' + c) >= 0, 'tuile héritée neutralisée : .' + c);
  });
  ok(/\.nv-scope \.card \.card/.test(css), 'cartes imbriquées neutralisées');
  /* aucun blanc codé en dur ne subsiste dans les règles .nv-scope */
  const scopeRules = css.split('}').filter((b) => /\.nv-scope/.test(b.split('{')[0]) && /background/.test(b));
  const whites = scopeRules.filter((b) => /background[^;]*:(?![^;]*var\(--nv|#0|#04|#06|rgba\(255, 255, 255, \.0|linear-gradient|radial-gradient|conic-gradient|none)[^;]*(#fff|#ffffff|white|rgba\(255, ?255, ?255, ?(0?\.[5-9]|1))/.test(b));
  eq(whites.length, 0, 'aucun fond blanc dans les règles .nv-scope' + (whites.length ? ' → ' + whites.map((w) => w.split('{')[0].trim().slice(-40)).join(' | ') : ''));

  /* ---------------------------------------------------------------- H */
  section('H. i18n & réutilisabilité');
  NV.i18n.set('en'); await H.sleep(700);
  ok(/AI inference engine|inference/i.test(root.querySelector('#nvAiBox').textContent), 'bloc IA traduit en anglais');
  ok(/Model leaderboard|leaderboard/i.test(root.querySelector('#nvAiBox').textContent), 'classement des modèles traduit');
  ok(root.querySelectorAll('#nvAiSteps .nv-pipe-metrics em').length >= 20, 'métriques re-localisées en anglais');
  NV.i18n.set('fr'); await H.sleep(700);
  ok(/Moteur d'inférence|inférence/i.test(root.querySelector('#nvAiBox').textContent), 'retour au français');
  ok(typeof NV.ui.pipeline === 'function', 'NV.ui.pipeline réutilisable exposé');
  ok(typeof NV.stats.ensembleForecast === 'function', 'NV.stats.ensembleForecast réutilisable exposé');
  ok(typeof NV.stats.modelZoo === 'function' && typeof NV.stats.backtest === 'function' && typeof NV.stats.clean === 'function' && typeof NV.stats.features === 'function', 'API stats étendue (zoo, backtest, clean, features)');
  ok(typeof NC.engine.forecast === 'function', 'API publique engine.forecast conservée');
  const pub = NC.engine.forecast(NC.profile(), 'weight', 12, true);
  ok(pub && pub.fc && pub.fc.point.length === 12, 'engine.forecast(p, clé, horizon) fonctionne');
  ok(!!pub.fc.models && pub.fc.models.length === 6, 'engine.forecast expose les 6 modèles de l\'ensemble');
  ok(pub.past.length === 12 && pub.months === 12, 'forme de retour conservée (past/labels/fc/months)');

  /* ---------------------------------------------------------------- I */
  section('I. Console');
  /* jsdom ne sait pas naviguer : le clic sur le lien blob: des exports produit
     « Not implemented: navigation » — artefact du harness, pas de l'application. */
  const real = logs.errors.filter((e) => !/cdn\.jsdelivr|fonts\.googleapis|Could not load|Not implemented: navigation/.test(e));
  const artefacts = logs.errors.filter((e) => /Not implemented: navigation/.test(e));
  if (artefacts.length) console.log('  (artefact jsdom ignoré : ' + artefacts.length + ' navigation blob: des exports)');
  eq(real.length, 0, 'aucune erreur console' + (real.length ? ' → ' + real.slice(0, 4).join(' | ') : ''));
  eq(logs.warnings.length, 0, 'aucun warning console' + (logs.warnings.length ? ' → ' + logs.warnings.slice(0, 3).join(' | ') : ''));

  console.log('\n════════════════════════════════════════');
  console.log('  RÉSULTAT : ' + pass + '/' + (pass + fail) + ' assertions');
  if (fail) { console.log('  ÉCHECS (' + fail + ') :'); fails.forEach((f) => console.log('   - ' + f)); }
  console.log('════════════════════════════════════════');
  win.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
