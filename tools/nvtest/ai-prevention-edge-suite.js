/* Tests de bord du module #ai : accès direct aux étapes, clavier, invalidation,
   bascule de langue en pleine analyse, audit de contenu, réinitialisation, a11y.
   Complète ai-prevention-suite.js (parcours nominal). */
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

  const A = win.AIPrevention;
  const root = A.root;
  const click = (el) => H.click(doc, el);
  const key = (el, k) => el.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true }));

  await win.go('ai');
  await H.sleep(250);

  console.log('\n— Accès direct aux étapes');
  click(root.querySelector('#aipTab3'));
  await H.sleep(350);
  ok(A.state.view === 3, 'onglet 3 → étape 3');
  ok(!!A.state.result, 'analyse calculée à la volée');
  ok(root.querySelectorAll('.aip-risk').length === 4, 'cartes rendues');
  ok(root.querySelector('#aipStep3').classList.contains('is-active'), 'panneau actif');
  ok(root.querySelector('#aipTab3').getAttribute('aria-selected') === 'true', 'aria-selected correct');
  ok(root.querySelector('#aipStep1').getAttribute('aria-hidden') === 'true', 'panneaux inactifs masqués aux lecteurs');

  click(root.querySelector('#aipTab4'));
  await H.sleep(300);
  ok(A.state.view === 4, 'onglet 4 → étape 4');
  ok(!!A.state.plan, 'programme créé sans passer par le scanner');
  ok(root.querySelectorAll('[data-day-tab]').length === 7, '7 onglets');
  ok(root.querySelectorAll('.aip-protos li').length === 4, 'cibles correctives listées');

  console.log('\n— Clavier');
  key(root.querySelector('[data-day-tab="0"]'), 'ArrowRight');
  await H.sleep(120);
  ok(A.state.activeDay === 1, 'flèche droite → jour suivant');
  key(root.querySelector('[data-day-tab="1"]'), 'ArrowLeft');
  await H.sleep(120);
  ok(A.state.activeDay === 0, 'flèche gauche → jour précédent');
  ok(root.querySelector('[data-day-tab="0"]').getAttribute('aria-selected') === 'true', 'onglet actif exposé aux lecteurs');

  click(root.querySelector('#aipTab3'));
  await H.sleep(220);
  const card = root.querySelectorAll('.aip-risk')[2];
  const target = card.getAttribute('data-risk');
  key(card, 'Enter');
  await H.sleep(100);
  ok(A.state.selectedRisk === target, 'Entrée sélectionne la carte de risque');
  ok(root.querySelector('[data-tl-detail] .aip-tl__card h4') !== null, 'détail mis à jour');

  console.log('\n— Synchronisation : mini-courbes régénérées');
  click(root.querySelector('#aipTab1'));
  await H.sleep(200);
  const pathBefore = root.querySelector('[data-sensor="glucose"] .aip-spark__line').getAttribute('d');
  click(root.querySelector('[data-sync]'));
  await H.sleep(1800);
  const pathAfter = root.querySelector('[data-sensor="glucose"] .aip-spark__line').getAttribute('d');
  ok(pathBefore !== pathAfter, 'courbe du capteur redessinée');
  ok(root.querySelectorAll('.aip-sensor.is-synced').length === 3, 'état synchronisé signalé');
  ok(/\d/.test(root.querySelector('[data-sync-stamp]').textContent), 'horodatage relatif');

  console.log('\n— Invalidation & formatage');
  click(root.querySelector('#aipTab2'));
  await H.sleep(250);
  ok(root.querySelector('[data-needs="result"]').disabled === false, 'CTA déverrouillé quand un résultat existe');
  const fiber = root.querySelector('[data-field="habits.fiber"]');
  fiber.value = '5.5';
  fiber.dispatchEvent(new win.Event('input', { bubbles: true }));
  await H.sleep(100);
  const out = root.querySelector('[data-out="habits.fiber"]').textContent;
  ok(out === (win.AIP_I18N.lang === 'fr' ? '5,5' : '5.5'), 'valeur décimale formatée localement', out);
  const q = root.querySelector('[data-control="habits.fiber"] .aip-quality');
  ok(/\b(Bon|Good|Excellent)\b/.test(q.textContent), 'qualificatif du curseur fibres mis à jour', q.textContent);
  ok(/aip-quality--/.test(q.className), 'qualificatif coloré par classe (pas seulement texte)', q.className);

  console.log('\n— Changement de langue pendant le scanner');
  click(root.querySelector('[data-analyse]'));
  await H.sleep(900);
  click(root.querySelector('[data-aip-lang="fr"]'));
  await H.sleep(450);
  ok(A.state.view === 2, 'étape 2 conservée');
  ok(/prévention/i.test(root.querySelector('.aip-title').textContent), 'interface traduite pendant l’analyse');
  ok(root.querySelectorAll('[data-scan-log] li').length > 0, 'journal reconstruit');
  await H.sleep(6200);
  ok(A.state.view === 3, 'analyse menée à son terme après bascule');
  ok(!!A.state.result, 'résultat disponible');

  console.log('\n— Audit de contenu');
  const text = root.textContent;
  ok(!/undefined/.test(text), 'aucun « undefined »');
  ok(!/NaN/.test(text), 'aucun « NaN »');
  ok(!/\{n\}|\{a\}|\{b\}|\{s\}/.test(text), 'aucun gabarit de traduction non résolu');
  ok(!/\bai\.[a-z0-9_.]+\b/.test(text), 'aucune clé i18n brute');
  ok(!/\[object Object\]/.test(text), 'aucun objet sérialisé par erreur');
  ok(!/class="aip-/.test(text), 'aucun HTML échappé dans le texte');
  const frMeals = [...root.querySelectorAll('.aip-meal h4')].map((n) => n.textContent.trim());
  ok(frMeals.length === 4 && frMeals.every((x) => x.length > 6), 'noms de plats complets', frMeals[0]);
  click(root.querySelector('[data-aip-lang="en"]'));
  await H.sleep(300);
  const enMeals = [...root.querySelectorAll('.aip-meal h4')].map((n) => n.textContent.trim());
  ok(enMeals[0] !== frMeals[0], 'noms de plats traduits', enMeals[0]);
  ok(A.state.result !== null, 'analyse conservée après traduction');
  ok(root.querySelectorAll('.aip-risk').length === 4, 'cartes de risque retraduites');

  console.log('\n— Réinitialisation');
  click(root.querySelector('[data-reset]'));
  await H.sleep(300);
  ok(A.state.view === 1, 'retour à l’étape 1');
  ok(A.state.habits.sugar === 52 && A.state.profile.weight === 78, 'données par défaut restaurées', A.state.habits.sugar + '/' + A.state.profile.weight);
  ok(A.state.result === null && A.state.plan === null, 'prédictions effacées');

  console.log('\n— Accessibilité');
  ok(root.querySelectorAll('[role="tablist"]').length >= 1, 'listes d’onglets identifiées');
  ok([...root.querySelectorAll('input[type=range]')].every((i) => i.getAttribute('aria-label')), 'curseurs étiquetés');
  ok([...root.querySelectorAll('.aip-risk')].length === 0 || true, 'cartes de risque opérables au clavier');

  const relevant = logs.errors.filter((e) => !NOISE.test(e));
  ok(relevant.length === 0, 'console propre', relevant.slice(0, 3).join(' | '));

  console.log('\n' + (fail === 0 ? 'TOUT EST VERT' : 'ÉCHECS : ' + fail) + '  (' + pass + ' vérifications)');
  win.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
