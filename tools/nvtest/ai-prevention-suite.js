/* Suite d'intégration jsdom du module #ai — « Moteur IA de Nutrition & de Prévention ».
   Vérifie le module tel qu'il est réellement monté par index.html (components/ai-prevention/*).
   Prérequis : `npm run serve` dans un autre terminal (sert nutri1/MVP/web sur :8000). */
const H = require('./harness');

const NOISE = /Could not load|cdn\.jsdelivr|fonts\.googleapis|TLS|TLSSocket|socket disconnected|setTransform|unicef-nutrichild|JSDOM Uncaught/i;

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? '  →  ' + extra : '')); }
}

(async () => {
  const { win, doc, logs } = await H.load({ view: false, readyMs: 30000 });
  await H.waitFor(() => win.AIPrevention && win.AIPrevention.state, 25000, 'AIPrevention monté');
  await H.sleep(500);
  win.print = () => { win.__printed = true; };

  const root = doc.getElementById('aiPrevention');
  const A = win.AIPrevention;
  const click = (sel) => H.click(doc, sel);
  const clickEl = (el) => H.click(doc, el);

  console.log('\n— Montage');
  ok(!!root, 'racine #aiPrevention présente');
  ok(!!A, 'API AIPrevention exposée');
  ok(root && root.getAttribute('data-aip-ready') === '1', 'module marqué prêt');
  ok(root && root.querySelectorAll('.aip-step').length === 4, '4 étapes rendues');
  ok(root && root.querySelectorAll('#aipTab1,#aipTab2,#aipTab3,#aipTab4').length === 4, '4 onglets de navigation');
  ok(root && root.querySelectorAll('.aip-sensor').length === 3, '3 capteurs simulés');
  ok(root && root.querySelectorAll('input[type=range]').length >= 8, 'curseurs présents (' + (root ? root.querySelectorAll('input[type=range]').length : 0) + ')');
  ok(!!win.AIP_MODEL && typeof win.AIP_MODEL.analyse === 'function', 'moteur pur exposé (AIP_MODEL)');
  ok(!!win.AIP_CHARTS && typeof win.AIP_CHARTS.gauge === 'function', 'générateurs SVG exposés (AIP_CHARTS)');
  ok(!!win.AIP_I18N && !!win.AIP_I18N.strings, 'dictionnaire exposé (AIP_I18N)');

  console.log('\n— Langue initiale (suit la plateforme)');
  const lang0 = win.AIP_I18N.lang;
  const title = root.querySelector('.aip-title').textContent;
  ok(lang0 === 'fr' ? /prévention/i.test(title) : /AI Nutrition/i.test(title), 'titre cohérent avec la langue de la plateforme (' + lang0 + ')', title);
  ok(root.getAttribute('data-aip-locale') === lang0, 'attribut de locale du module');

  clickEl(root.querySelector('[data-aip-lang="en"]'));
  await H.sleep(220);
  ok(win.AIP_I18N.lang === 'en', 'bascule manuelle en anglais');
  ok(/AI Nutrition/i.test(root.querySelector('.aip-title').textContent), 'titre anglais après bascule');

  /* Course de démarrage : la plateforme initialise sa langue APRÈS le module
     (pays → langue, re-apply à 180 ms) et réaffirme la locale précédente. */
  if (win.NUTRI_I18N && typeof win.NUTRI_I18N.setLocale === 'function') {
    await win.NUTRI_I18N.setLocale('fr', false);
    await H.sleep(260);
    ok(win.AIP_I18N.lang === 'en', 'le choix explicite résiste à une ré-assertion de la plateforme au démarrage');
    await win.NUTRI_I18N.setLocale('en', false);
    await H.sleep(200);
    ok(win.AIP_I18N.lang === 'en', 'plateforme réalignée sur le choix du module');
  }

  await win.go('ai');
  await H.sleep(300);
  ok(doc.getElementById('title').textContent.length > 0, 'titre de la barre supérieure renseigné', doc.getElementById('title').textContent);

  console.log('\n— Synchronisation des capteurs');
  clickEl(root.querySelector('[data-sync]'));
  await H.sleep(1800);
  const glucose = root.querySelector('[data-sensor-value="glucose"]').textContent;
  ok(/^\d+$/.test(glucose), 'glycémie numérique après synchro', glucose);
  ok(A.state.sensors.syncedAt > 0, 'horodatage de synchro enregistré');
  ok(root.querySelector('[data-sync-stamp]').textContent.length > 0, 'horodatage affiché');
  ok(root.querySelectorAll('.aip-sensor.is-synced').length === 3, 'les trois capteurs signalés comme synchronisés');

  console.log('\n— Curseurs & IMC');
  const sugar = root.querySelector('[data-field="habits.sugar"]');
  sugar.value = '95';
  sugar.dispatchEvent(new win.Event('input', { bubbles: true }));
  await H.sleep(60);
  ok(A.state.habits.sugar === 95, 'curseur sucre met à jour l’état');
  ok(root.querySelector('[data-out="habits.sugar"]').textContent === '95', 'sortie du curseur mise à jour');
  const weight = root.querySelector('[data-field="profile.weight"]');
  weight.value = '88';
  weight.dispatchEvent(new win.Event('change', { bubbles: true }));
  await H.sleep(60);
  ok(A.state.profile.weight === 88, 'poids mis à jour');
  const bmiTxt = root.querySelector('[data-bmi-value]').textContent;
  ok(parseFloat(bmiTxt.replace(',', '.')) > 25, 'IMC recalculé', bmiTxt);
  ok(!!root.querySelector('[data-bmi][data-band]'), 'bande d’IMC exposée dans le DOM');

  console.log('\n— Analyse (scanner)');
  clickEl(root.querySelector('[data-analyse]'));
  await H.sleep(250);
  ok(A.state.view === 2, 'passage à l’étape 2');
  ok(root.querySelector('[data-scan]').classList.contains('is-running'), 'scanner en cours');
  await H.sleep(700);
  ok(root.querySelectorAll('[data-scan-log] li').length >= 1, 'journal d’analyse alimenté');
  await H.sleep(7800);
  ok(!!A.state.result, 'résultat calculé');
  ok(A.state.view === 3, 'passage automatique à l’étape 3');
  const res = A.state.result;
  ok(res.risks.length === 4, '4 risques évalués');
  ok(res.risks.every((r) => r.probability >= 2 && r.probability <= 96), 'probabilités bornées');
  ok(res.risks.every((r) => r.onset.from >= 1 && r.onset.to > r.onset.from), 'fenêtres temporelles cohérentes');
  ok(res.metabolicScore > 0 && res.metabolicScore < 100, 'score métabolique cohérent', String(res.metabolicScore));
  ok(res.signals.length > 0, 'signaux détectés', String(res.signals.length));

  console.log('\n— Cartes de risque & timeline');
  const cards = root.querySelectorAll('.aip-risk');
  ok(cards.length === 4, '4 cartes de risque');
  ok(root.querySelectorAll('.aip-gauge__bar').length >= 4, 'jauges SVG rendues');
  ok(cards[0].classList.contains('is-selected'), 'carte principale sélectionnée par défaut');
  ok(!!root.querySelector('[data-tl-detail] .aip-tl__card'), 'détail de timeline affiché');
  const markers = root.querySelectorAll('.aip-tl__marker');
  ok(markers.length > 0, 'jalons de timeline interactifs (' + markers.length + ')');
  clickEl(markers[markers.length - 1]);
  await H.sleep(100);
  ok(root.querySelectorAll('.aip-risk.is-selected').length === 1, 'un seul risque sélectionné');
  const windowTxt = root.querySelector('.aip-risk.is-selected .aip-risk__window').textContent;
  ok(/an|year|au-delà|beyond|non projet/i.test(windowTxt), 'projection temporelle lisible', windowTxt);

  console.log('\n— Mode « programme corrigé »');
  const beforeProb = A.state.result.risks[0].probability;
  clickEl(root.querySelector('[data-mode="corrected"]'));
  await H.sleep(150);
  ok(A.state.mode === 'corrected', 'mode corrigé actif');
  ok(root.querySelectorAll('.aip-risk__delta').length > 0, 'delta de risque affiché');
  ok(root.querySelector('[data-mode="corrected"]').classList.contains('is-active'), 'bouton de mode actif');
  ok(A.state.result.risks[0].probability === beforeProb, 'les probabilités actuelles ne changent pas (comparaison honnête)');
  ok(A.state.result.risks.every((r) => r.corrected && r.corrected.probability <= r.probability),
    'projection « programme corrigé » disponible et toujours inférieure');

  console.log('\n— Programme 7 jours');
  clickEl(root.querySelector('[data-goto="4"]'));
  await H.sleep(300);
  ok(A.state.view === 4, 'étape 4 affichée');
  ok(!!A.state.plan, 'programme généré');
  const plan = A.state.plan;
  ok(plan.days.length === 7, '7 jours');
  ok(plan.days.every((d) => Object.keys(d.meals).length === 4), '4 repas par jour');
  ok(plan.days.every((d) => d.totals.kcal > 900 && d.totals.kcal < 2600), 'apports plausibles', plan.days.map((d) => d.totals.kcal).join(','));
  ok(plan.days.every((d) => d.impacts.length > 0), 'impacts estimés par jour');
  const planA = JSON.stringify(plan.days.map((d) => Object.values(d.meals).map((m) => m.id)));
  ok(root.querySelectorAll('[data-day-tab]').length === 7, '7 onglets de jour');
  ok(root.querySelectorAll('.aip-meal').length === 4, '4 repas affichés');
  ok(root.querySelectorAll('.aip-protos li').length >= 3, 'cibles correctives listées');

  clickEl(root.querySelector('[data-day-tab="3"]'));
  await H.sleep(150);
  ok(A.state.activeDay === 3, 'changement de jour');
  ok(!!root.querySelector('[data-day="3"]'), 'panneau du jour 3 rendu');
  ok(root.querySelectorAll('.aip-week__col.is-active').length === 1, 'colonne de semaine active synchronisée');
  const kicker = root.querySelector('.aip-day__kicker').textContent;
  ok(/jeu|thu/i.test(kicker), 'nom du jour affiché', kicker);

  clickEl(root.querySelector('[data-regenerate]'));
  await H.sleep(180);
  const planB = JSON.stringify(A.state.plan.days.map((d) => Object.values(d.meals).map((m) => m.id)));
  ok(planA !== planB, 'régénération : nouveau programme');
  ok(A.state.plan.days.length === 7, 'programme toujours complet');
  const again = A.model.buildPlan(A.state, A.state.result);
  ok(JSON.stringify(again.days.map((d) => Object.values(d.meals).map((m) => m.id))) === planB, 'même état → même programme (déterminisme)');

  console.log('\n— Impression');
  clickEl(root.querySelector('[data-print]'));
  await H.sleep(350);
  ok(win.__printed === true, 'window.print() déclenché');

  console.log('\n— Bascule en français');
  clickEl(root.querySelector('[data-aip-lang="fr"]'));
  await H.sleep(250);
  const frTitle = root.querySelector('.aip-title').textContent;
  ok(/nutrition/i.test(frTitle) && /prévention/i.test(frTitle), 'titre traduit en français', frTitle);
  ok(A.state.view === 4, 'étape conservée après traduction');
  ok(A.state.plan.days.length === 7, 'programme conservé après traduction');
  ok(root.querySelectorAll('.aip-meal').length === 4, 'repas toujours rendus en français');
  ok(root.querySelector('.aip-disclaimer').textContent.length > 40, 'avertissement traduit');
  ok(root.querySelector('[data-day-tab="3"]') !== null, 'onglets reconstruits');
  ok(/jeu/i.test(root.querySelector('.aip-day__kicker').textContent), 'jour traduit', root.querySelector('.aip-day__kicker').textContent);
  ok(/g|%|kcal/.test(root.querySelector('.aip-meal').textContent), 'macros présentes');

  console.log('\n— Retour à l’anglais, profils de démonstration');
  clickEl(root.querySelector('[data-aip-lang="en"]'));
  await H.sleep(250);
  ok(/AI Nutrition/i.test(root.querySelector('.aip-title').textContent), 'retour à l’anglais');
  clickEl(root.querySelector('[data-preset="balanced"]'));
  await H.sleep(280);
  ok(A.state.view === 1, 'profil de démonstration → étape 1');
  ok(A.state.result === null, 'prédictions invalidées');
  const balanced = A.model.analyse(A.state);
  ok(balanced.risks[0].probability < 45, 'profil équilibré → risque bas', String(balanced.risks[0].probability));
  clickEl(root.querySelector('[data-preset="risk"]'));
  await H.sleep(280);
  const risky = A.model.analyse(A.state);
  ok(risky.risks[0].probability > 60, 'profil à risque → risque élevé', String(risky.risks[0].probability));
  ok(risky.metabolicScore < balanced.metabolicScore, 'score dégradé sur le profil à risque', risky.metabolicScore + ' < ' + balanced.metabolicScore);
  ok(risky.risks[0].onset.from <= balanced.risks[0].onset.from, '« risque dans 3–5 ans » plus précoce sur le profil à risque',
    risky.risks[0].onset.from + ' vs ' + balanced.risks[0].onset.from);

  console.log('\n— Suivi de la langue de la plateforme');
  /* On attend la fin de la fenêtre d’installation : après elle, la plateforme
     reprend la main sur tout changement réel (pas de test tributaire du hasard). */
  await H.waitFor(() => !win.AIP_I18N.settleUntil || Date.now() > win.AIP_I18N.settleUntil + 250,
    8000, 'fin de la fenêtre d’installation i18n');
  if (win.NUTRI_I18N && typeof win.NUTRI_I18N.setLocale === 'function') {
    await win.NUTRI_I18N.setLocale('en', false);
    await H.sleep(350);
    ok(win.AIP_I18N.lang === 'en', 'module aligné sur la plateforme (en)');
    await win.NUTRI_I18N.setLocale('fr', false);
    await H.sleep(350);
    ok(win.AIP_I18N.lang === 'fr', 'module aligné sur la plateforme (fr)');
    ok(/prévention/i.test(root.querySelector('.aip-title').textContent), 'titre traduit après changement plateforme');
  } else {
    console.log('  (NUTRI_I18N absent — test ignoré)');
  }

  console.log('\n— Structure du DOM');
  ok(root.querySelectorAll('[data-i18n]').length === 0, 'aucun data-i18n (évite l’écrasement par la couche plateforme)');
  ok(doc.querySelectorAll('#ai .aip-root').length === 1, 'une seule racine');
  ok(doc.documentElement.getAttribute('data-aip-locale') === win.AIP_I18N.lang, 'locale exposée sur <html>');

  console.log('\n— Console');
  const relevant = logs.errors.filter((e) => !NOISE.test(e));
  ok(relevant.length === 0, 'aucune erreur console imputable au module', relevant.slice(0, 4).join(' | '));
  const own = logs.errors.filter((e) => /ai-prevention|AIPrevention/.test(e));
  ok(own.length === 0, 'aucune erreur dans components/ai-prevention', own.slice(0, 3).join(' | '));

  console.log('\n' + (fail === 0 ? 'TOUT EST VERT' : 'ÉCHECS : ' + fail) + '  (' + pass + ' vérifications)');
  win.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
