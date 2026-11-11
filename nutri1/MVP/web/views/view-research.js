/* ==========================================================================
   NUTRI.N°1 — Research & Evidence Graph view  (SESSION 17)
   Renders <section id="research"> as a Dark Bento workspace built around a
   small working register of evidence links (what is linked to what, and the
   reference that supports it), plus a count of the research material already
   typed into the Food Cloud on this device.

   Depends on : js/bento-i18n.js, js/bento-shell.js
   Storage    : localStorage.nutri_evidence = [{id, type, from, to, ref, at}]
   Reads      : localStorage.nutri_foodcloud (written by views/view-foodcloud.js)
   Styles     : styles/views.css  (shared .vi-* institution components)
   Note       : removed because they were invented: the three growth charts
                (fixed series for 2021–2026), the heatmap (random cells), the four
                counters (1,240 / 680 / 420 / 1,980), the "live evidence engine"
                banner and the "decision lens" select that changed nothing.
                The view does not search or index any literature. Nothing is sent.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('research');
  if (!root || !I18N) return;

  I18N.register({
    en: {
      'res.kicker': 'RESEARCH · EVIDENCE', 'res.title': 'Research & Evidence Graph',
      'res.sub': 'A register of evidence links: what is linked to what, and the reference that supports it.',
      'res.demo': 'Local register · nothing is sent',
      'res.kpis': 'Headline indicators',
      'res.k.links': 'Evidence links', 'res.k.foods': 'Foods described', 'res.k.recipes': 'Recipes described', 'res.k.labs': 'Laboratory results',
      'res.k.local': 'Kept on this device', 'res.k.cloud': 'Food Cloud entries on this device',
      'res.reg.title': 'Evidence links', 'res.reg.sub': 'Each link is as reliable as the reference typed with it. Nothing is checked.',
      'res.reg.count': 'Links: {n}', 'res.reg.filter': 'Filter by type', 'res.reg.all': 'All',
      'res.reg.empty': 'No evidence link yet. Add one with the form.', 'res.reg.emptytype': 'No link of this type yet.',
      'res.reg.ref': 'Reference: {ref}',
      'res.reg.del': 'Delete', 'res.reg.confirm': 'Confirm deletion', 'res.reg.cancel': 'Cancel', 'res.reg.aria.del': 'Delete the link {from} to {to}',
      'res.reg.more': 'The {n} most recent links are shown.',
      'res.type.food': 'Food → Nutrient', 'res.type.biomarker': 'Diet → Biomarker', 'res.type.outcome': 'Diet → Outcome', 'res.type.recipe': 'Recipe → Nutrient',
      'res.form.title': 'Add an evidence link', 'res.form.sub': 'All fields are required.',
      'res.f.type': 'Type of link', 'res.f.from': 'From', 'res.f.to': 'To', 'res.f.ref': 'Reference',
      'res.f.from.hint': 'For example: orange-fleshed sweet potato.', 'res.f.to.hint': 'For example: vitamin A.', 'res.f.ref.hint': 'Authors, year and title, a DOI or a link.',
      'res.form.submit': 'Add to the register',
      'res.err.from': 'Enter 2 to 80 characters.', 'res.err.to': 'Enter 2 to 80 characters.', 'res.err.ref': 'Enter a reference of 5 to 200 characters.',
      'res.err.full': 'The register holds 200 links. Delete one before adding another.', 'res.err.store': 'The link could not be saved on this device.',
      'res.msg.added': 'Link added: {from} to {to}.', 'res.msg.deleted': 'Link deleted: {from} to {to}.',
      'res.by.title': 'Links by type', 'res.by.sub': 'How the register is spread across the four kinds of link.',
      'res.cov.title': 'Research material and gaps', 'res.cov.sub': 'What already exists on this device, and what is not connected.',
      'res.cov.local': 'Local entries: {n}', 'res.cov.none': 'Not connected',
      'res.cov.a': 'Food composition entries (Food Cloud)', 'res.cov.b': 'Recipe entries (Food Cloud)', 'res.cov.c': 'Laboratory results (Food Cloud)',
      'res.cov.1': 'Literature search and indexing', 'res.cov.2': 'Grading of the strength of evidence', 'res.cov.3': 'Checking of references', 'res.cov.4': 'Coverage maps and trends over time', 'res.cov.5': 'Sharing the register between devices or users',
      'res.add.food': 'Add a food to the Food Cloud'
    },
    fr: {
      'res.kicker': 'RECHERCHE · PREUVES', 'res.title': 'Recherche & graphe des preuves',
      'res.sub': 'Un registre de liens de preuve : ce qui est relié à quoi, et la référence qui l’appuie.',
      'res.demo': 'Registre local · rien n’est envoyé',
      'res.kpis': 'Indicateurs clés',
      'res.k.links': 'Liens de preuve', 'res.k.foods': 'Aliments décrits', 'res.k.recipes': 'Recettes décrites', 'res.k.labs': 'Résultats de laboratoire',
      'res.k.local': 'Conservé sur cet appareil', 'res.k.cloud': 'Saisies du Cloud alimentaire sur cet appareil',
      'res.reg.title': 'Liens de preuve', 'res.reg.sub': 'Chaque lien vaut ce que vaut la référence saisie avec lui. Rien n’est vérifié.',
      'res.reg.count': 'Liens : {n}', 'res.reg.filter': 'Filtrer par type', 'res.reg.all': 'Tous',
      'res.reg.empty': 'Aucun lien de preuve pour l’instant. Ajoutez-en un avec le formulaire.', 'res.reg.emptytype': 'Aucun lien de ce type pour l’instant.',
      'res.reg.ref': 'Référence : {ref}',
      'res.reg.del': 'Supprimer', 'res.reg.confirm': 'Confirmer la suppression', 'res.reg.cancel': 'Annuler', 'res.reg.aria.del': 'Supprimer le lien : {from} vers {to}',
      'res.reg.more': 'Liens affichés (les plus récents) : {n}.',
      'res.type.food': 'Aliment → Nutriment', 'res.type.biomarker': 'Alimentation → Biomarqueur', 'res.type.outcome': 'Alimentation → Effet sur la santé', 'res.type.recipe': 'Recette → Nutriment',
      'res.form.title': 'Ajouter un lien de preuve', 'res.form.sub': 'Tous les champs sont obligatoires.',
      'res.f.type': 'Type de lien', 'res.f.from': 'De', 'res.f.to': 'Vers', 'res.f.ref': 'Référence',
      'res.f.from.hint': 'Par exemple : patate douce à chair orange.', 'res.f.to.hint': 'Par exemple : vitamine A.', 'res.f.ref.hint': 'Auteurs, année et titre, un DOI ou un lien.',
      'res.form.submit': 'Ajouter au registre',
      'res.err.from': 'Saisissez de 2 à 80 caractères.', 'res.err.to': 'Saisissez de 2 à 80 caractères.', 'res.err.ref': 'Saisissez une référence de 5 à 200 caractères.',
      'res.err.full': 'Le registre contient 200 liens. Supprimez-en un avant d’en ajouter.', 'res.err.store': 'Le lien n’a pas pu être enregistré sur cet appareil.',
      'res.msg.added': 'Lien ajouté : {from} vers {to}.', 'res.msg.deleted': 'Lien supprimé : {from} vers {to}.',
      'res.by.title': 'Liens par type', 'res.by.sub': 'Répartition du registre entre les quatre sortes de lien.',
      'res.cov.title': 'Matériau de recherche et manques', 'res.cov.sub': 'Ce qui existe déjà sur cet appareil, et ce qui n’est pas connecté.',
      'res.cov.local': 'Saisies locales : {n}', 'res.cov.none': 'Non connecté',
      'res.cov.a': 'Saisies de composition des aliments (Cloud alimentaire)', 'res.cov.b': 'Saisies de recettes (Cloud alimentaire)', 'res.cov.c': 'Résultats de laboratoire (Cloud alimentaire)',
      'res.cov.1': 'Recherche et indexation de la littérature', 'res.cov.2': 'Cotation du niveau de preuve', 'res.cov.3': 'Vérification des références', 'res.cov.4': 'Cartes de couverture et évolutions dans le temps', 'res.cov.5': 'Partage du registre entre appareils ou utilisateurs',
      'res.add.food': 'Ajouter un aliment au Cloud alimentaire'
    }
  });

  var KEY = 'nutri_evidence', MAX = 200, SHOWN = 30;
  var TYPES = ['food', 'biomarker', 'outcome', 'recipe'], FIELDS = ['from', 'to', 'ref'];
  var state = { draft: { type: 'food', from: '', to: '', ref: '' }, errors: {}, confirm: null, msg: '', filter: 'all' };
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'); } catch (e) { return String(v); } }
  function load() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(KEY) || '[]');
      return (Array.isArray(raw) ? raw : []).filter(function (r) {
        return r && typeof r.id === 'string' && TYPES.indexOf(r.type) >= 0 && typeof r.from === 'string' && typeof r.to === 'string' && typeof r.ref === 'string';
      }).slice(0, MAX);
    } catch (e) { return []; }
  }
  function save(list) { try { global.localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function cloud() {
    var c = { food: 0, recipe: 0, lab: 0 };
    try { var raw = JSON.parse(global.localStorage.getItem('nutri_foodcloud') || '[]'); (Array.isArray(raw) ? raw : []).forEach(function (e) { if (e && e.type in c) c[e.type]++; }); } catch (e) { /* empty */ }
    return c;
  }

  var PATHS = {
    graph: '<circle cx="6" cy="7" r="2.500"/><circle cx="18" cy="7" r="2.500"/><circle cx="12" cy="18" r="2.500"/><path d="M8.500 7h7M7.500 9l3.300 6.800M16.500 9l-3.300 6.800"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bars: '<path d="M5 19V9M12 19V5M19 19v-7"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.100M4 12h.100M4 17h.100"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra, id) { return '<header class="vi-head"><span class="vh-ico">' + ico(icon) + '</span><h3' + (id ? ' id="' + id + '" tabindex="-1"' : '') + '>' + esc(title) + '</h3>' + (extra || '') + '</header>'; }
  function kpi(label, value, sub) { return '<li class="vi-kpi"><span class="vi-kpi__label">' + esc(label) + '</span><b>' + esc(value) + '</b><small>' + esc(sub) + '</small></li>'; }
  function field(name, max) {
    var err = state.errors[name], ids = 'res-' + name + '-hint' + (err ? ' res-' + name + '-err' : '');
    return '<div class="vi-form__field"><label for="res-' + name + '">' + esc(t('res.f.' + name)) + '</label>' +
      '<input type="text" id="res-' + name + '" name="' + name + '" maxlength="' + max + '" autocomplete="off" required value="' + esc(state.draft[name]) + '" aria-describedby="' + ids + '"' + (err ? ' aria-invalid="true"' : '') + '>' +
      '<small id="res-' + name + '-hint">' + esc(t('res.f.' + name + '.hint')) + '</small>' +
      (err ? '<p class="vi-form__err" id="res-' + name + '-err">' + esc(t(err)) + '</p>' : '') + '</div>';
  }

  function render() {
    var list = load(), c = cloud(), d = state.draft;
    var counts = {}; TYPES.forEach(function (x) { counts[x] = list.filter(function (r) { return r.type === x; }).length; });
    var shown = list.filter(function (r) { return state.filter === 'all' || r.type === state.filter; });
    var kpis = kpi(t('res.k.links'), num(list.length), t('res.k.local')) + kpi(t('res.k.foods'), num(c.food), t('res.k.cloud')) +
      kpi(t('res.k.recipes'), num(c.recipe), t('res.k.cloud')) + kpi(t('res.k.labs'), num(c.lab), t('res.k.cloud'));
    var chips = ['all'].concat(TYPES).map(function (x) {
      return '<button type="button" class="vi-chip" data-res-filter="' + x + '" aria-pressed="' + (x === state.filter) + '">' + esc(x === 'all' ? t('res.reg.all') : t('res.type.' + x)) + '</button>';
    }).join('');
    var reg = shown.length ? '<ul class="vi-reg" id="resRegister">' + shown.slice(0, SHOWN).map(function (r) {
      var ask = state.confirm === r.id;
      return '<li class="vi-reg__item" data-res-id="' + esc(r.id) + '"><div class="vi-reg__top"><span><b class="vi-link">' + esc(r.from) + ico('arrow') + esc(r.to) + '</b><small>' + esc(t('res.type.' + r.type)) + '</small></span></div>' +
        '<p class="vi-reg__stage vi-reg__ref">' + esc(t('res.reg.ref', { ref: r.ref })) + '</p>' +
        '<div class="vi-reg__actions">' + (ask
          ? '<button type="button" class="btn vi-btn-danger" data-res-act="confirm">' + ico('trash') + esc(t('res.reg.confirm')) + '</button><button type="button" class="btn secondary" data-res-act="cancel">' + esc(t('res.reg.cancel')) + '</button>'
          : '<button type="button" class="btn secondary" data-res-act="del" aria-label="' + esc(t('res.reg.aria.del', { from: r.from, to: r.to })) + '">' + ico('trash') + esc(t('res.reg.del')) + '</button>') +
        '</div></li>';
    }).join('') + '</ul>' + (shown.length > SHOWN ? '<p class="vi-note">' + ico('info') + '<span>' + esc(t('res.reg.more', { n: SHOWN })) + '</span></p>' : '')
      : '<p class="vi-note vi-note--warn" id="resRegister">' + ico('info') + '<span>' + esc(t(list.length ? 'res.reg.emptytype' : 'res.reg.empty')) + '</span></p>';
    var form = '<form class="vi-form" id="resForm" novalidate>' +
      (state.errors.form ? '<p class="vi-form__err" role="alert">' + esc(t(state.errors.form)) + '</p>' : '') +
      '<div class="vi-form__field"><label for="res-type">' + esc(t('res.f.type')) + '</label><select id="res-type" name="type">' + TYPES.map(function (x) {
        return '<option value="' + x + '"' + (x === d.type ? ' selected' : '') + '>' + esc(t('res.type.' + x)) + '</option>'; }).join('') + '</select></div>' +
      field('from', 80) + field('to', 80) + field('ref', 200) +
      '<button type="submit" class="btn primary">' + ico('plus') + esc(t('res.form.submit')) + '</button></form>';
    var top = Math.max.apply(null, TYPES.map(function (x) { return counts[x]; })) || 1;
    var by = TYPES.map(function (x) {
      return '<li><div class="vi-bars__top"><span><b>' + esc(t('res.type.' + x)) + '</b></span><strong>' + esc(num(counts[x])) + '</strong></div>' +
        (counts[x] ? '<div class="vi-bar" aria-hidden="true"><i style="--w:' + (counts[x] / top * 100).toFixed(1) + '%"></i></div>' : '') + '</li>';
    }).join('');
    var local = { a: c.food, b: c.recipe, c: c.lab };
    var cov = ['a', 'b', 'c'].map(function (k) {
      return '<li><span>' + esc(t('res.cov.' + k)) + '</span><b class="' + (local[k] ? 'is-on' : '') + '">' + (local[k] ? ico('check') : '') + esc(t('res.cov.local', { n: local[k] })) + '</b></li>';
    }).concat([1, 2, 3, 4, 5].map(function (i) { return '<li><span>' + esc(t('res.cov.' + i)) + '</span><b>' + esc(t('res.cov.none')) + '</b></li>'; })).join('');
    root.innerHTML = '<div class="vi">' +
      '<section class="card vi-hero"><div class="vh-head"><div class="vi-hero__title"><span class="vh-ico">' + ico('graph') + '</span><div><span class="vi-kicker">' + esc(t('res.kicker')) + '</span><h2>' + esc(t('res.title')) + '</h2>' +
        '<p class="vi-sub">' + esc(t('res.sub')) + '</p></div></div><span class="pill vi-demo">' + esc(t('res.demo')) + '</span></div>' +
        '<ul class="vi-kpis" aria-label="' + esc(t('res.kpis')) + '">' + kpis + '</ul></section>' +
      '<div class="vi-grid">' +
        '<section class="card vi-wide">' + head('link', t('res.reg.title'), '<span class="pill vi-count">' + esc(t('res.reg.count', { n: list.length })) + '</span>', 'resRegTitle') + '<p class="vi-sub">' + esc(t('res.reg.sub')) + '</p>' +
          '<div class="vi-chips" role="group" aria-label="' + esc(t('res.reg.filter')) + '">' + chips + '</div>' +
          '<p class="vi-status" id="resStatus" role="status" aria-live="polite">' + esc(state.msg) + '</p>' + reg + '</section>' +
        '<section class="card vi-side">' + head('plus', t('res.form.title')) + '<p class="vi-sub">' + esc(t('res.form.sub')) + '</p>' + form + '</section>' +
        '<section class="card vi-half">' + head('bars', t('res.by.title')) + '<p class="vi-sub">' + esc(t('res.by.sub')) + '</p><ul class="vi-bars" id="resByType">' + by + '</ul></section>' +
        '<section class="card vi-half">' + head('list', t('res.cov.title')) + '<p class="vi-sub">' + esc(t('res.cov.sub')) + '</p><ul class="vi-rows">' + cov + '</ul>' +
          '<div class="vi-actions"><button type="button" class="btn secondary" data-res-go="food">' + ico('plus') + esc(t('res.add.food')) + '</button></div></section>' +
      '</div></div>';
  }
  function readDraft() {
    var f = doc.getElementById('resForm'); if (!f) return;
    ['type', 'from', 'to', 'ref'].forEach(function (k) { if (f.elements[k]) state.draft[k] = f.elements[k].value; });
  }
  function clean(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function submit() {
    readDraft();
    var d = state.draft, errors = {}, v = { from: clean(d.from), to: clean(d.to), ref: clean(d.ref) };
    if (v.from.length < 2 || v.from.length > 80) errors.from = 'res.err.from';
    if (v.to.length < 2 || v.to.length > 80) errors.to = 'res.err.to';
    if (v.ref.length < 5 || v.ref.length > 200) errors.ref = 'res.err.ref';
    if (TYPES.indexOf(d.type) < 0) d.type = 'food';
    var bad = FIELDS.filter(function (k) { return errors[k]; })[0], list = load();
    if (!bad && list.length >= MAX) errors.form = 'res.err.full';
    if (!bad && !errors.form) {
      list.unshift({ id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: d.type, from: v.from, to: v.to, ref: v.ref, at: new Date().toISOString() });
      if (!save(list)) errors.form = 'res.err.store';
    }
    state.errors = errors; state.confirm = null;
    if (bad || errors.form) { state.msg = ''; render(); var el = doc.getElementById('res-' + (bad || 'from')); if (el) el.focus(); return false; }
    state.msg = t('res.msg.added', { from: v.from, to: v.to });
    if (state.filter !== 'all' && state.filter !== d.type) state.filter = 'all';
    state.draft = { type: d.type, from: '', to: '', ref: '' };
    render();
    var n = doc.getElementById('res-from'); if (n) n.focus();
    return true;
  }
  function act(id, what) {
    var list = load(), idx = -1, sel;
    list.forEach(function (r, k) { if (r.id === id) idx = k; });
    if (idx < 0) { state.confirm = null; render(); return; }
    if (what === 'del') { state.confirm = id; sel = '[data-res-id="' + id + '"] [data-res-act="cancel"]'; }
    else if (what === 'cancel') { state.confirm = null; sel = '[data-res-id="' + id + '"] [data-res-act="del"]'; }
    else if (what === 'confirm') {
      var r = list[idx]; list.splice(idx, 1); if (!save(list)) return;
      state.confirm = null; state.msg = t('res.msg.deleted', { from: r.from, to: r.to }); sel = '#resRegTitle';
    } else return;
    readDraft(); render();
    var el = root.querySelector(sel); if (el) el.focus();
  }

  root.addEventListener('submit', function (ev) { if (ev.target.id === 'resForm') { ev.preventDefault(); submit(); } });
  root.addEventListener('click', function (ev) {
    if (!ev.target.closest) return;
    var f = ev.target.closest('[data-res-filter]');
    if (f) {
      var x = f.getAttribute('data-res-filter');
      if (x === 'all' || TYPES.indexOf(x) >= 0) { readDraft(); state.filter = x; state.confirm = null; render(); var b = root.querySelector('[data-res-filter="' + x + '"]'); if (b) b.focus(); }
      return;
    }
    var g = ev.target.closest('[data-res-go]');
    if (g) {
      if (typeof global.go === 'function') global.go('foodcloud');
      var fc = global.NutriBentoViews && global.NutriBentoViews.foodcloud;
      if (fc && fc.setType) fc.setType('food', true);
      return;
    }
    var a = ev.target.closest('[data-res-act]');
    if (a) { var li = a.closest('[data-res-id]'); if (li) act(li.getAttribute('data-res-id'), a.getAttribute('data-res-act')); }
  });
  if (global.MutationObserver) {
    var shownView = root.classList.contains('on');
    new global.MutationObserver(function () { var on = root.classList.contains('on'); if (on && !shownView) { readDraft(); render(); } shownView = on; }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  global.addEventListener('storage', function (ev) { if (ev.key === KEY || ev.key === 'nutri_foodcloud') { readDraft(); render(); } });

  var api = {
    render: render, submit: submit, act: act,
    fill: function (values) { Object.keys(values || {}).forEach(function (k) { if (k in state.draft) state.draft[k] = String(values[k]); }); render(); },
    state: function () { var l = load(); return { links: l.length, filter: state.filter, errors: state.errors, confirm: state.confirm, cloud: cloud() }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.research = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'research');
  render();
  I18N.onChange(function () { readDraft(); state.msg = ''; render(); });
})(window);
