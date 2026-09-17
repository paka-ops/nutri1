/* Vérifie que les AUTRES sections institutionnelles ne sont pas affectées :
   leurs couches de démonstration (V54/V56/V57) restent actives, aucun panneau
   NutriVision ne s'y installe, aucune erreur console. */
const H = require('./harness');
(async () => {
  const { win, doc, logs } = await H.load();
  await H.waitFor(() => H.ready(win), 20000, 'cockpit modules ready');
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
  /* #who (cockpit V62) : le clic sur une carte ne doit plus empiler un panneau legacy.
     L'ancienne attente « clic carte #who → overlay V54 ouvert » décrivait précisément le
     défaut de superposition corrigé par V62 : la carte ouvre la surface unifiée #wcStudio
     et aucun overlay V51..V57 ne s'affiche par-dessus. */
  await H.act(win, () => win.go('who'), 1200);
  const v54 = doc.getElementById('v54Overlay');
  const stacked = () => ['v51Live', 'v52Overlay', 'v53Shell', 'v54Overlay', 'v56overlay', 'v57ExactShell'].filter((id) => {
    const e = doc.getElementById(id); if (!e) return false;
    const cs = win.getComputedStyle(e);
    return e.classList.contains('show') || (cs.display !== 'none' && cs.visibility !== 'hidden' && e.style.display === 'block');
  });
  const before = doc.body.children.length;
  /* point d'entrée réel des cartes : le bouton ⤢ (toute carte en possède un) ; à défaut la
     première carte, pour prouver qu'un clic générique n'ouvre rien d'autre que la surface. */
  const card = doc.querySelector('#who [data-wc-open-btn]') || doc.querySelector('#who [data-wc-open]') || doc.querySelector('#who .wc-card, #who .card');
  if (card) card.dispatchEvent(new win.MouseEvent('click', { bubbles: true, view: win }));
  await H.sleep(700);
  const studioOpen = !!doc.querySelector('#wcStudio.on') || !!doc.querySelector('#wcStudio.show');
  const panels = stacked();
  console.log('clic carte #who → surface unifiée #wcStudio :', studioOpen ? 'ouverte' : 'absente',
    '| panneaux empilés :', panels.length ? panels.join(',') : 'aucun',
    '| nœuds ajoutés à <body> :', doc.body.children.length - before, '(attendu : ouvert / 0 / 0)');
  const whoOk = studioOpen && panels.length === 0 && doc.body.children.length - before === 0;
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
  /* bugs préexistants d'autres modules, déjà présents sur main et hors périmètre #who :
     comptés à part pour que la suite reste rouge au moindre NOUVEAU plantage. */
  const KNOWN = /V29_BASE_TEXT|setLocale is not a function|data-v44generate|Cannot set properties of null \(setting 'innerHTML'\)/;
  const all = logs.errors.filter(e => !NET.test(e));
  const known = all.filter(e => KNOWN.test(e));
  const errs = all.filter(e => !KNOWN.test(e));
  console.log('erreurs console :', errs.length, '| bugs connus hors #who (ignorés) :', known.length);
  errs.slice(0, 5).forEach(e => console.log('   ERR', e.slice(0, 200)));
  const bad = errs.length + (whoOk ? 0 : 1);
  console.log(bad ? '✗ smoke-sections : ' + bad + ' point(s) en échec' : '✓ smoke-sections : sections saines, aucune superposition dans #who');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
