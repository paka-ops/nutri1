/* Vérifie que les AUTRES sections institutionnelles ne sont pas affectées :
   leurs couches de démonstration (V54/V56/V57) restent actives, aucun panneau
   NutriVision ne s'y installe, aucune erreur console. */
const H = require('./harness');
(async () => {
  const { win, doc, logs } = await H.load();
  await H.waitFor(() => win.NutriUnicef && win.NutriUnicef.state.mounted, 25000, 'mounted');
  const secs = ['who', 'wfp', 'fao', 'health', 'agri', 'monitoring', 'research', 'unicef', 'citizen'];
  for (const id of secs) {
    await H.act(win, () => win.go(id), 700);
    const root = doc.getElementById(id);
    if (!root) { console.log('— ' + id + ' : section absente'); continue; }
    const panels = root.querySelectorAll('.nv-panel').length;
    const scoped = root.classList.contains('nv-scope');
    console.log('— ' + id.padEnd(11) + ' | .nv-scope=' + (scoped ? 'oui' : 'non') + ' | panneaux NV=' + panels +
      ' | v54-action=' + root.querySelectorAll('.v54-action').length +
      ' | v57-clickable=' + root.querySelectorAll('.v57-clickable').length);
  }
  /* un clic sur une carte héritée de #who doit toujours ouvrir l'overlay V54 */
  await H.act(win, () => win.go('who'), 800);
  const card = doc.querySelector('#who .card');
  card.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await H.sleep(500);
  const v54 = doc.getElementById('v54Overlay');
  console.log('clic carte #who → overlay V54 ouvert :', !!(v54 && v54.classList.contains('show')));
  /* et dans #unicef, un clic sur une carte héritée ouvre aussi V54 (comportement conservé) */
  await H.act(win, () => win.go('unicef'), 900);
  const ageCard = doc.querySelector('#unicef .age-card');
  if (ageCard) {
    ageCard.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await H.sleep(500);
    console.log('clic carte d\'âge #unicef → overlay V54 ouvert :', !!(v54 && v54.classList.contains('show')));
    const close = doc.querySelector('#v54Overlay .v54-close'); if (close) close.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  }
  /* mais un clic dans un panneau NV ne l'ouvre pas */
  await H.sleep(300);
  const btn = doc.querySelector('#unicef .nv-panel .nv-btn');
  if (btn) {
    btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await H.sleep(500);
    console.log('clic bouton cockpit → overlay V54 ouvert :', !!(v54 && v54.classList.contains('show')), '(attendu : false)');
  }
  const NET = /Could not load (script|link)|cdn\.jsdelivr|fonts\.googleapis|blob:/;
  const errs = logs.errors.filter(e => !NET.test(e));
  console.log('erreurs console :', errs.length); errs.slice(0, 5).forEach(e => console.log('   ERR', e.slice(0, 200)));
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
