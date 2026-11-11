/* ==========================================================================
   NUTRI.N°1 — African Food Cloud view  (SESSION 9)
   Renders <section id="foodcloud"> as a Dark Bento data workbench: six entry
   types with validated forms, a local validation queue and a JSON export.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vf-*)
   Preserves  : #foodCountry (country select of the food form), runScan('Food Cloud')
   Storage    : localStorage.nutri_foodcloud  [{ id, type, at, data }]  (newest first, max 200)
   Read by    : views/view-agri.js (production and consumption entries of the selected country)
   Note       : there is no Food Cloud server. Entries stay in this browser until the
                user exports them as a JSON file; nothing is validated, published or
                sent. The record counters of the original prototype (13,200+ …) had
                no data behind them and were replaced by real counts of local entries.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('foodcloud');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'cloud.title': 'African Food Cloud', 'cloud.kicker': 'DATA WORKBENCH',
      'cloud.sub': 'Prepare food, recipe, laboratory, consumption and production data for the shared African food database.',
      'cloud.demo': 'Local workbench · nothing is sent',
      'cloud.kpi.total': 'Entries in this browser', 'cloud.kpi.types': 'Entry types used', 'cloud.kpi.last': 'Last entry', 'cloud.kpi.never': 'None yet',
      'cloud.kpi.of': 'of {n}', 'cloud.kpi.pending': 'Awaiting validation',
      'cloud.types': 'Entry type',
      'cloud.t.food': 'Food / ingredient', 'cloud.t.recipe': 'Recipe / traditional dish', 'cloud.t.scan': 'Scan a food or label',
      'cloud.t.lab': 'Laboratory result', 'cloud.t.consumption': 'Dietary consumption', 'cloud.t.production': 'Food production',
      'cloud.d.food': 'Describe a food or ingredient and where its data comes from.',
      'cloud.d.recipe': 'Record a dish with its serving size and ingredients. Composition is not calculated here.',
      'cloud.d.scan': 'The scanner recognises a sample food, product or label. A confirmed scan can then be described here as a food entry.',
      'cloud.d.lab': 'Record one measured value with its method and sample.',
      'cloud.d.consumption': 'Record an average intake of one food for a population group.',
      'cloud.d.production': 'Record the production of one crop for a region and a year.',
      'cloud.f.name': 'Food name', 'cloud.f.local': 'Local name', 'cloud.f.country': 'Country', 'cloud.f.group': 'Food group', 'cloud.f.state': 'State', 'cloud.f.source': 'Source',
      'cloud.f.source.ph': 'FAO/INFOODS, national table, laboratory…',
      'cloud.f.dish': 'Dish name', 'cloud.f.serving': 'Serving size (g)', 'cloud.f.ingredients': 'Ingredients', 'cloud.f.ingredients.hint': 'One ingredient per line, for example: millet flour, 120 g',
      'cloud.f.lab': 'Laboratory', 'cloud.f.method': 'Method', 'cloud.f.analyte': 'Analyte', 'cloud.f.value': 'Value', 'cloud.f.unit': 'Unit', 'cloud.f.sample': 'Sample ID',
      'cloud.f.food': 'Food', 'cloud.f.pop': 'Population group', 'cloud.f.amount': 'Average intake (g/day)', 'cloud.f.survey': 'Survey method',
      'cloud.f.crop': 'Crop', 'cloud.f.region': 'Region', 'cloud.f.year': 'Year', 'cloud.f.tonnes': 'Production (tonnes)',
      'cloud.o.cereals': 'Cereals', 'cloud.o.tubers': 'Tubers & roots', 'cloud.o.fruits': 'Fruits & vegetables', 'cloud.o.legumes': 'Legumes', 'cloud.o.oilseeds': 'Oilseeds', 'cloud.o.animal': 'Animal-source foods',
      'cloud.o.raw': 'Raw', 'cloud.o.cooked': 'Cooked', 'cloud.o.dried': 'Dried', 'cloud.o.fermented': 'Fermented',
      'cloud.o.all': 'General population', 'cloud.o.children': 'Children under 5', 'cloud.o.school': 'School-age children', 'cloud.o.women': 'Women 15–49', 'cloud.o.adults': 'Adults', 'cloud.o.elderly': 'Older adults',
      'cloud.o.recall': '24-hour recall', 'cloud.o.diary': 'Food diary', 'cloud.o.ffq': 'Food frequency questionnaire', 'cloud.o.household': 'Household survey',
      'cloud.required': 'required', 'cloud.optional': 'optional',
      'cloud.err.required': 'This field is required.', 'cloud.err.number': 'Enter a number greater than 0.', 'cloud.err.year': 'Enter a year between 1960 and {max}.',
      'cloud.err.summary': 'Check the highlighted fields.',
      'cloud.submit': 'Add to the queue', 'cloud.clear': 'Clear the form',
      'cloud.scan.open': 'Open the scanner', 'cloud.scan.count': 'Confirmed scans in this browser: {n}', 'cloud.scan.next': 'Describe as a food entry',
      'cloud.toast.added': 'Entry added to the local queue.', 'cloud.toast.removed': 'Entry removed.', 'cloud.toast.exported': 'File prepared: {n} entries.',
      'cloud.toast.full': 'The local queue is full (200 entries). Export and empty it first.',
      'cloud.queue.title': 'Validation queue', 'cloud.queue.count': 'Entries: {n}',
      'cloud.queue.empty': 'No entry yet. Fill in a form to add the first one.',
      'cloud.queue.status': 'Awaiting validation', 'cloud.queue.remove': 'Remove entry: {name}',
      'cloud.queue.export': 'Export as JSON', 'cloud.queue.clear': 'Empty the queue', 'cloud.queue.confirm': 'Confirm: empty the queue',
      'cloud.queue.more': 'Showing the {n} most recent entries. The export contains all of them.',
      'cloud.next.title': 'What happens to an entry',
      'cloud.next.1': 'Entry', 'cloud.next.1.d': 'You describe the data and its source here.',
      'cloud.next.2': 'Local queue', 'cloud.next.2.d': 'It is saved in this browser only.',
      'cloud.next.3': 'Export', 'cloud.next.3.d': 'You download a JSON file to hand to the data team.',
      'cloud.next.4': 'Validation', 'cloud.next.4.d': 'Quality control and publication are not connected yet.',
      'cloud.next.note': 'No shared database is connected: nothing leaves this device unless you export the file.'
    },
    fr: {
      'cloud.title': 'Cloud alimentaire africain', 'cloud.kicker': 'ATELIER DE DONNÉES',
      'cloud.sub': 'Préparez les données sur les aliments, les recettes, les analyses, la consommation et la production pour la base africaine partagée.',
      'cloud.demo': 'Atelier local · rien n’est envoyé',
      'cloud.kpi.total': 'Saisies dans ce navigateur', 'cloud.kpi.types': 'Types de saisie utilisés', 'cloud.kpi.last': 'Dernière saisie', 'cloud.kpi.never': 'Aucune pour l’instant',
      'cloud.kpi.of': 'sur {n}', 'cloud.kpi.pending': 'En attente de validation',
      'cloud.types': 'Type de saisie',
      'cloud.t.food': 'Aliment / ingrédient', 'cloud.t.recipe': 'Recette / plat traditionnel', 'cloud.t.scan': 'Scanner un aliment ou une étiquette',
      'cloud.t.lab': 'Résultat de laboratoire', 'cloud.t.consumption': 'Consommation alimentaire', 'cloud.t.production': 'Production alimentaire',
      'cloud.d.food': 'Décrivez un aliment ou un ingrédient et l’origine de ses données.',
      'cloud.d.recipe': 'Enregistrez un plat avec sa portion et ses ingrédients. La composition n’est pas calculée ici.',
      'cloud.d.scan': 'Le scanner reconnaît un aliment, un produit ou une étiquette d’exemple. Un scan confirmé peut ensuite être décrit ici comme aliment.',
      'cloud.d.lab': 'Enregistrez une valeur mesurée avec sa méthode et son échantillon.',
      'cloud.d.consumption': 'Enregistrez la consommation moyenne d’un aliment pour un groupe de population.',
      'cloud.d.production': 'Enregistrez la production d’une culture pour une région et une année.',
      'cloud.f.name': 'Nom de l’aliment', 'cloud.f.local': 'Nom local', 'cloud.f.country': 'Pays', 'cloud.f.group': 'Groupe d’aliments', 'cloud.f.state': 'État', 'cloud.f.source': 'Source',
      'cloud.f.source.ph': 'FAO/INFOODS, table nationale, laboratoire…',
      'cloud.f.dish': 'Nom du plat', 'cloud.f.serving': 'Portion (g)', 'cloud.f.ingredients': 'Ingrédients', 'cloud.f.ingredients.hint': 'Un ingrédient par ligne, par exemple : farine de mil, 120 g',
      'cloud.f.lab': 'Laboratoire', 'cloud.f.method': 'Méthode', 'cloud.f.analyte': 'Analyte', 'cloud.f.value': 'Valeur', 'cloud.f.unit': 'Unité', 'cloud.f.sample': 'Identifiant de l’échantillon',
      'cloud.f.food': 'Aliment', 'cloud.f.pop': 'Groupe de population', 'cloud.f.amount': 'Consommation moyenne (g/jour)', 'cloud.f.survey': 'Méthode d’enquête',
      'cloud.f.crop': 'Culture', 'cloud.f.region': 'Région', 'cloud.f.year': 'Année', 'cloud.f.tonnes': 'Production (tonnes)',
      'cloud.o.cereals': 'Céréales', 'cloud.o.tubers': 'Tubercules et racines', 'cloud.o.fruits': 'Fruits et légumes', 'cloud.o.legumes': 'Légumineuses', 'cloud.o.oilseeds': 'Oléagineux', 'cloud.o.animal': 'Aliments d’origine animale',
      'cloud.o.raw': 'Cru', 'cloud.o.cooked': 'Cuit', 'cloud.o.dried': 'Séché', 'cloud.o.fermented': 'Fermenté',
      'cloud.o.all': 'Population générale', 'cloud.o.children': 'Enfants de moins de 5 ans', 'cloud.o.school': 'Enfants d’âge scolaire', 'cloud.o.women': 'Femmes de 15 à 49 ans', 'cloud.o.adults': 'Adultes', 'cloud.o.elderly': 'Personnes âgées',
      'cloud.o.recall': 'Rappel des 24 heures', 'cloud.o.diary': 'Journal alimentaire', 'cloud.o.ffq': 'Questionnaire de fréquence alimentaire', 'cloud.o.household': 'Enquête auprès des ménages',
      'cloud.required': 'obligatoire', 'cloud.optional': 'facultatif',
      'cloud.err.required': 'Ce champ est obligatoire.', 'cloud.err.number': 'Saisissez un nombre supérieur à 0.', 'cloud.err.year': 'Saisissez une année entre 1960 et {max}.',
      'cloud.err.summary': 'Vérifiez les champs signalés.',
      'cloud.submit': 'Ajouter à la file', 'cloud.clear': 'Effacer le formulaire',
      'cloud.scan.open': 'Ouvrir le scanner', 'cloud.scan.count': 'Scans confirmés dans ce navigateur : {n}', 'cloud.scan.next': 'Décrire comme aliment',
      'cloud.toast.added': 'Saisie ajoutée à la file locale.', 'cloud.toast.removed': 'Saisie retirée.', 'cloud.toast.exported': 'Fichier préparé : {n} saisies.',
      'cloud.toast.full': 'La file locale est pleine (200 saisies). Exportez-la puis videz-la.',
      'cloud.queue.title': 'File de validation', 'cloud.queue.count': 'Saisies : {n}',
      'cloud.queue.empty': 'Aucune saisie pour l’instant. Remplissez un formulaire pour ajouter la première.',
      'cloud.queue.status': 'En attente de validation', 'cloud.queue.remove': 'Retirer la saisie : {name}',
      'cloud.queue.export': 'Exporter en JSON', 'cloud.queue.clear': 'Vider la file', 'cloud.queue.confirm': 'Confirmer : vider la file',
      'cloud.queue.more': 'Les {n} saisies les plus récentes sont affichées. L’export les contient toutes.',
      'cloud.next.title': 'Le parcours d’une saisie',
      'cloud.next.1': 'Saisie', 'cloud.next.1.d': 'Vous décrivez ici la donnée et sa source.',
      'cloud.next.2': 'File locale', 'cloud.next.2.d': 'Elle est enregistrée dans ce navigateur uniquement.',
      'cloud.next.3': 'Export', 'cloud.next.3.d': 'Vous téléchargez un fichier JSON à remettre à l’équipe des données.',
      'cloud.next.4': 'Validation', 'cloud.next.4.d': 'Le contrôle qualité et la publication ne sont pas encore connectés.',
      'cloud.next.note': 'Aucune base partagée n’est connectée : rien ne quitte cet appareil tant que vous n’exportez pas le fichier.'
    }
  });

  /* ---- 2. Form schemas -------------------------------------------------- */
  /* field: [key, label key, kind, required, options | extra] ; kinds: text, num, year, country, select, area */
  var GROUPS = ['cereals', 'tubers', 'fruits', 'legumes', 'oilseeds', 'animal'];
  var SCHEMA = {
    food: [['name', 'name', 'text', 1], ['local', 'local', 'text', 0], ['country', 'country', 'country', 1], ['group', 'group', 'select', 1, GROUPS],
      ['state', 'state', 'select', 1, ['raw', 'cooked', 'dried', 'fermented']], ['source', 'source', 'text', 1, 'cloud.f.source.ph']],
    recipe: [['name', 'dish', 'text', 1], ['local', 'local', 'text', 0], ['country', 'country', 'country', 1], ['serving', 'serving', 'num', 1], ['ingredients', 'ingredients', 'area', 1, 'cloud.f.ingredients.hint']],
    scan: [],
    lab: [['lab', 'lab', 'text', 1], ['method', 'method', 'text', 0], ['analyte', 'analyte', 'text', 1], ['value', 'value', 'num', 1], ['unit', 'unit', 'text', 1], ['sample', 'sample', 'text', 0]],
    consumption: [['country', 'country', 'country', 1], ['name', 'food', 'text', 1], ['group', 'group', 'select', 1, GROUPS], ['pop', 'pop', 'select', 1, ['all', 'children', 'school', 'women', 'adults', 'elderly']],
      ['amount', 'amount', 'num', 1], ['survey', 'survey', 'select', 1, ['recall', 'diary', 'ffq', 'household']], ['source', 'source', 'text', 0]],
    production: [['country', 'country', 'country', 1], ['name', 'crop', 'text', 1], ['group', 'group', 'select', 1, GROUPS], ['region', 'region', 'text', 0], ['year', 'year', 'year', 1], ['tonnes', 'tonnes', 'num', 1], ['source', 'source', 'text', 0]]
  };
  var TYPES = ['food', 'recipe', 'scan', 'lab', 'consumption', 'production'];
  var ICON = { food: 'leaf', recipe: 'bowl', scan: 'scan', lab: 'flask', consumption: 'chart', production: 'sprout' };
  var KEY = 'nutri_foodcloud', MAX = 200, SHOW = 30, YEAR = new Date().getFullYear();

  /* ---- 3. State ------------------------------------------------------------ */
  function codes() { return (I18N.countries || []).map(function (c) { return c.code; }); }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && codes().indexOf(sel.value) >= 0) ? sel.value : 'TG'; }
  function load() {
    try {
      var raw = JSON.parse(global.localStorage.getItem(KEY) || '[]');
      return (Array.isArray(raw) ? raw : []).filter(function (e) { return e && SCHEMA[e.type] && e.type !== 'scan' && e.data && typeof e.data === 'object'; }).slice(0, MAX);
    } catch (e) { return []; }
  }
  function save() { try { global.localStorage.setItem(KEY, JSON.stringify(state.entries)); } catch (e) { /* ignore */ } }
  function scanCount() { try { var s = JSON.parse(global.localStorage.getItem('nutri_scans') || '[]'); return Array.isArray(s) ? s.length : 0; } catch (e) { return 0; } }
  var state = { type: 'food', drafts: {}, errors: {}, entries: load(), confirmClear: false };

  /* ---- 4. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function notify(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }
  function when(ts) { try { return new Date(ts).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function num(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 3 }); } catch (e) { return String(v); } }
  var PATHS = {
    cloud: '<path d="M7 18a4 4 0 0 1-.500-7.950A5.500 5.500 0 0 1 17 9.500a4.200 4.200 0 0 1 0 8.500z"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c2-4 5-7 9-9"/>',
    bowl: '<path d="M4 11h16a8 8 0 0 1-16 0zM9 20h6M9 7c0-1.500 1.500-1.500 1.500-3M13.500 7c0-1.500 1.500-1.500 1.500-3"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>',
    flask: '<path d="M9.500 4h5M10.500 4v5.500L5.500 18a1.500 1.500 0 0 0 1.300 2.200h10.400a1.500 1.500 0 0 0 1.300-2.200l-5-8.500V4M8 15h8"/>',
    chart: '<path d="M4 20h16M7 20v-6M12 20V6M17 20v-9"/>',
    sprout: '<path d="M12 21v-8M12 13c0-4-2.500-6.500-7-6.500 0 4 2.500 6.500 7 6.500zM12 10c0-3.500 2.300-5.800 6.500-5.800 0 3.700-2.300 5.800-6.500 5.800z"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.100M4 12h.100M4 17h.100"/>',
    flow: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    down: '<path d="M12 4v11M7.500 10.500 12 15l4.500-4.500M5 19.500h14"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra, id) {
    return '<header class="vf-card__head"><span class="vh-ico">' + ico(icon) + '</span><h3' + (id ? ' id="' + id + '" tabindex="-1"' : '') + '>' + esc(title) + '</h3>' + (extra || '') + '</header>';
  }
  function $(id) { return doc.getElementById(id); }
  function refocus(sel) { var el = root.querySelector(sel); if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } }
  function draft(type) {
    if (!state.drafts[type]) {
      var d = {};
      SCHEMA[type].forEach(function (f) { d[f[0]] = f[2] === 'country' ? headerCountry() : (f[2] === 'select' ? f[4][0] : ''); });
      state.drafts[type] = d;
    }
    return state.drafts[type];
  }
  function fid(f) { return f[0] === 'country' && state.type === 'food' ? 'foodCountry' : 'vf-' + f[0]; }
  function titleOf(e) { return e.data.name || e.data.analyte || t('cloud.t.' + e.type); }
  function metaOf(e) {
    var d = e.data, out = [];
    if (d.country) out.push(cname(d.country));
    if (e.type === 'food') out.push(t('cloud.o.' + d.group), t('cloud.o.' + d.state));
    if (e.type === 'recipe') out.push(num(d.serving) + ' g');
    if (e.type === 'lab') out.push(num(d.value) + ' ' + d.unit, d.lab);
    if (e.type === 'consumption') out.push(t('cloud.o.' + d.pop), num(d.amount) + ' g/' + (I18N.lang === 'fr' ? 'jour' : 'day'));
    if (e.type === 'production') out.push(String(d.year), num(d.tonnes) + ' t');
    return out.join(' · ');
  }

  /* ---- 5. Blocks ---------------------------------------------------------- */
  function kpisHtml() {
    var n = state.entries.length, used = {};
    state.entries.forEach(function (e) { used[e.type] = 1; });
    function k(label, value, sub) { return '<div class="vf-kpi"><span>' + esc(label) + '</span><b>' + esc(value) + '</b><small>' + esc(sub) + '</small></div>'; }
    return k(t('cloud.kpi.total'), String(n), t('cloud.kpi.pending')) + k(t('cloud.kpi.types'), String(Object.keys(used).length), t('cloud.kpi.of', { n: TYPES.length - 1 })) +
      k(t('cloud.kpi.last'), n ? titleOf(state.entries[0]) : '—', n ? when(state.entries[0].at) : t('cloud.kpi.never'));
  }
  function typesHtml() {
    var counts = {};
    state.entries.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
    return TYPES.map(function (k) {
      var on = state.type === k;
      return '<button type="button" class="vf-type' + (on ? ' is-on' : '') + '" data-vf-type="' + k + '" aria-pressed="' + on + '"><span class="vf-type__ico">' + ico(ICON[k]) + '</span>' +
        '<b>' + esc(t('cloud.t.' + k)) + '</b>' + (counts[k] ? '<i>' + counts[k] + '</i>' : '') + '</button>';
    }).join('');
  }
  function fieldHtml(f, d, errs) {
    var id = fid(f), kind = f[2], err = errs[f[0]], v = d[f[0]], ctl;
    var common = ' id="' + id + '" data-vf-field="' + f[0] + '"' + (f[3] ? ' aria-required="true"' : '') + (err ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : (kind === 'area' ? ' aria-describedby="' + id + '-hint"' : ''));
    if (kind === 'country') ctl = '<select' + common + '>' + codes().map(function (c) { return '<option value="' + c + '"' + (c === v ? ' selected' : '') + '>' + esc(cname(c)) + '</option>'; }).join('') + '</select>';
    else if (kind === 'select') ctl = '<select' + common + '>' + f[4].map(function (o) { return '<option value="' + o + '"' + (o === v ? ' selected' : '') + '>' + esc(t('cloud.o.' + o)) + '</option>'; }).join('') + '</select>';
    else if (kind === 'area') ctl = '<textarea' + common + ' rows="4" maxlength="1200">' + esc(v) + '</textarea><small class="vf-hint" id="' + id + '-hint">' + esc(t(f[4])) + '</small>';
    else ctl = '<input' + common + ' type="text"' + (kind === 'text' ? '' : ' inputmode="decimal"') + ' autocomplete="off" maxlength="' + (kind === 'text' ? 120 : 14) + '"' + (kind === 'text' && f[4] ? ' placeholder="' + esc(t(f[4])) + '"' : '') + ' value="' + esc(v) + '">';
    return '<div class="vf-field' + (kind === 'area' ? ' vf-field--wide' : '') + '"><label for="' + id + '">' + esc(t('cloud.f.' + f[1])) + ' <small>(' + esc(t(f[3] ? 'cloud.required' : 'cloud.optional')) + ')</small></label>' + ctl +
      (err ? '<p class="vf-error" id="' + id + '-err">' + esc(err) + '</p>' : '') + '</div>';
  }
  function formHtml() {
    var k = state.type, h = head(ICON[k], t('cloud.t.' + k), '', 'vfFormTitle') + '<p class="vf-sub">' + esc(t('cloud.d.' + k)) + '</p>';
    if (k === 'scan') {
      return h + '<p class="vf-note">' + ico('info') + '<span>' + esc(t('cloud.scan.count', { n: scanCount() })) + '</span></p>' +
        '<div class="vf-actions"><button type="button" class="btn primary" data-vf-act="scan">' + esc(t('cloud.scan.open')) + '</button>' +
        '<button type="button" class="btn secondary" data-vf-type="food">' + esc(t('cloud.scan.next')) + '</button></div>';
    }
    var d = draft(k), errs = state.errors, has = Object.keys(errs).length > 0;
    return h + '<form class="vf-form" id="vfForm" novalidate>' + (has ? '<p class="vf-error vf-error--sum" role="alert">' + esc(t('cloud.err.summary')) + '</p>' : '') +
      '<div class="vf-fields">' + SCHEMA[k].map(function (f) { return fieldHtml(f, d, errs); }).join('') + '</div>' +
      '<div class="vf-actions"><button type="submit" class="btn primary">' + esc(t('cloud.submit')) + '</button>' +
      '<button type="button" class="btn secondary" data-vf-act="reset">' + esc(t('cloud.clear')) + '</button></div></form>';
  }
  function queueHtml() {
    var n = state.entries.length;
    var h = head('list', t('cloud.queue.title'), '<span class="pill vf-count">' + esc(t('cloud.queue.count', { n: n })) + '</span>', 'vfQueueTitle');
    if (!n) return h + '<p class="vf-empty">' + esc(t('cloud.queue.empty')) + '</p>';
    return h + '<ul class="vf-queue">' + state.entries.slice(0, SHOW).map(function (e) {
      var name = titleOf(e);
      return '<li><span class="vf-type__ico">' + ico(ICON[e.type]) + '</span><div class="vf-queue__txt"><b>' + esc(name) + '</b><small>' + esc(t('cloud.t.' + e.type)) + (metaOf(e) ? ' · ' + esc(metaOf(e)) : '') + '</small>' +
        '<small class="vf-queue__when">' + ico('clock') + esc(when(e.at)) + ' · ' + esc(t('cloud.queue.status')) + '</small></div>' +
        '<button type="button" class="vf-rm" data-vf-act="remove" data-vf-id="' + esc(e.id) + '" aria-label="' + esc(t('cloud.queue.remove', { name: name })) + '">' + ico('x') + '</button></li>';
    }).join('') + '</ul>' + (n > SHOW ? '<p class="vf-note">' + ico('info') + '<span>' + esc(t('cloud.queue.more', { n: SHOW })) + '</span></p>' : '') +
      '<div class="vf-actions"><button type="button" class="btn primary" data-vf-act="export">' + ico('down') + esc(t('cloud.queue.export')) + '</button>' +
      '<button type="button" class="btn ' + (state.confirmClear ? 'danger' : 'secondary') + '" data-vf-act="clear">' + esc(t(state.confirmClear ? 'cloud.queue.confirm' : 'cloud.queue.clear')) + '</button></div>';
  }
  function render() {
    root.innerHTML = '<div class="vf">' +
      '<section class="card vf-hero"><div class="vh-head"><div class="vf-hero__title"><span class="vh-ico">' + ico('cloud') + '</span><div><span class="vf-kicker">' + esc(t('cloud.kicker')) + '</span><h2>' + esc(t('cloud.title')) + '</h2>' +
        '<p class="vf-sub">' + esc(t('cloud.sub')) + '</p></div></div><span class="pill vf-demo">' + esc(t('cloud.demo')) + '</span></div>' +
        '<div class="vf-kpis" id="vfKpis">' + kpisHtml() + '</div></section>' +
      '<div class="vf-grid">' +
        '<section class="card vf-entry" aria-labelledby="vfFormTitle"><div class="vf-types" id="vfTypes" role="group" aria-label="' + esc(t('cloud.types')) + '">' + typesHtml() + '</div>' +
          '<div id="vfFormBox">' + formHtml() + '</div></section>' +
        '<section class="card vf-queuecard" id="vfQueue" aria-labelledby="vfQueueTitle">' + queueHtml() + '</section>' +
        '<section class="card vf-next">' + head('flow', t('cloud.next.title')) + '<ol class="vf-steps">' + [1, 2, 3, 4].map(function (i) {
          return '<li><i>' + i + '</i><div><b>' + esc(t('cloud.next.' + i)) + '</b><p>' + esc(t('cloud.next.' + i + '.d')) + '</p></div></li>'; }).join('') + '</ol>' +
          '<p class="vf-note">' + ico('info') + '<span>' + esc(t('cloud.next.note')) + '</span></p></section>' +
      '</div></div>';
  }
  function paint(id, html) { var el = $(id); if (el) el.innerHTML = html; }
  function paintData() { paint('vfKpis', kpisHtml()); paint('vfTypes', typesHtml()); paint('vfQueue', queueHtml()); }

  /* ---- 6. Actions ----------------------------------------------------------- */
  function keep() {
    if (state.type === 'scan') return;
    var d = draft(state.type);
    SCHEMA[state.type].forEach(function (f) { var el = $(fid(f)); if (el) d[f[0]] = el.value; });
  }
  function setType(k, focus) {
    if (TYPES.indexOf(k) < 0) return;
    keep(); state.type = k; state.errors = {};
    paint('vfTypes', typesHtml()); paint('vfFormBox', formHtml());
    if (focus) refocus('#vfFormTitle');
  }
  function parseNum(s) { var v = Number(String(s).trim().replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : NaN; }
  function validate(type, d) {
    var errs = {}, out = {};
    SCHEMA[type].forEach(function (f) {
      var k = f[0], kind = f[2], raw = String(d[k] == null ? '' : d[k]).trim();
      if (kind === 'country') { if (codes().indexOf(raw) < 0) errs[k] = t('cloud.err.required'); else out[k] = raw; return; }
      if (kind === 'select') { if (f[4].indexOf(raw) < 0) errs[k] = t('cloud.err.required'); else out[k] = raw; return; }
      if (!raw) { if (f[3]) errs[k] = t('cloud.err.required'); return; }
      if (kind === 'num') { var v = parseNum(raw); if (!(v > 0) || v > 1e12) errs[k] = t('cloud.err.number'); else out[k] = v; return; }
      if (kind === 'year') { var y = parseNum(raw); if (!(y >= 1960 && y <= YEAR) || Math.floor(y) !== y) errs[k] = t('cloud.err.year', { max: YEAR }); else out[k] = y; return; }
      if (kind === 'area') { out[k] = raw.split(/\r?\n/).map(function (l) { return l.trim().slice(0, 120); }).filter(Boolean).slice(0, 40); if (!out[k].length) errs[k] = t('cloud.err.required'); return; }
      out[k] = raw.slice(0, 120);
    });
    return { errors: errs, data: out };
  }
  function submit() {
    if (state.type === 'scan') return false;
    keep();
    if (state.entries.length >= MAX) { notify(t('cloud.toast.full')); return false; }
    var type = state.type, res = validate(type, draft(type));
    state.errors = res.errors;
    var bad = Object.keys(res.errors);
    if (bad.length) {
      paint('vfFormBox', formHtml());
      for (var i = 0; i < SCHEMA[type].length; i++) if (res.errors[SCHEMA[type][i][0]]) { refocus('#' + fid(SCHEMA[type][i])); break; }
      return false;
    }
    state.entries.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: type, at: new Date().toISOString(), data: res.data });
    delete state.drafts[type];
    state.confirmClear = false;
    save(); paintData(); paint('vfFormBox', formHtml());
    notify(t('cloud.toast.added'));
    refocus('#vfQueueTitle');
    return true;
  }
  function exportJson() {
    if (!state.entries.length) return false;
    var body = JSON.stringify({ app: 'NUTRI.N°1', dataset: 'African Food Cloud — local entries', exported: new Date().toISOString(), status: 'not validated', entries: state.entries }, null, 2);
    try {
      var url = global.URL.createObjectURL(new global.Blob([body], { type: 'application/json' }));
      var a = doc.createElement('a');
      a.href = url; a.download = 'food-cloud-entries-' + new Date().toISOString().slice(0, 10) + '.json';
      doc.body.appendChild(a); a.click(); a.remove();
      global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 2000);
    } catch (e) { return false; }
    notify(t('cloud.toast.exported', { n: state.entries.length }));
    return true;
  }

  root.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-vf-type],[data-vf-act]');
    if (!el || !root.contains(el)) return;
    if (el.hasAttribute('data-vf-type')) { var k = el.getAttribute('data-vf-type'); setType(k, !el.classList.contains('vf-type')); if (el.classList.contains('vf-type')) refocus('.vf-type[data-vf-type="' + k + '"]'); return; }
    var act = el.getAttribute('data-vf-act');
    if (act === 'reset') { delete state.drafts[state.type]; state.errors = {}; paint('vfFormBox', formHtml()); refocus('#vfFormTitle'); }
    else if (act === 'scan') { if (typeof global.go === 'function') global.go('scanner'); if (typeof global.runScan === 'function') global.runScan('Food Cloud'); }
    else if (act === 'remove') {
      var id = el.getAttribute('data-vf-id');
      state.entries = state.entries.filter(function (e) { return e.id !== id; });
      state.confirmClear = false; save(); paintData(); notify(t('cloud.toast.removed')); refocus('#vfQueueTitle');
    }
    else if (act === 'export') exportJson();
    else if (act === 'clear') {
      if (!state.confirmClear) { state.confirmClear = true; paint('vfQueue', queueHtml()); refocus('[data-vf-act="clear"]'); }
      else { state.entries = []; state.confirmClear = false; save(); paintData(); refocus('#vfQueueTitle'); }
    }
  });
  root.addEventListener('submit', function (ev) { ev.preventDefault(); submit(); });
  doc.addEventListener('nutri:countryChanged', function () {
    keep();
    Object.keys(state.drafts).forEach(function (k) { if ('country' in state.drafts[k]) state.drafts[k].country = headerCountry(); });
    paint('vfFormBox', formHtml());
  });

  /* ---- 7. API ----------------------------------------------------------------- */
  var api = {
    render: render, setType: setType, submit: submit, exportJson: exportJson,
    fill: function (values) { var d = draft(state.type); Object.keys(values || {}).forEach(function (k) { if (k in d) d[k] = String(values[k]); }); paint('vfFormBox', formHtml()); },
    state: function () { return { type: state.type, entries: state.entries.length, errors: Object.keys(state.errors), first: state.entries[0] || null }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.foodcloud = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'foodcloud');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.drafts = {}; render(); });
  I18N.onChange(function () { keep(); state.errors = {}; render(); });
})(window);
