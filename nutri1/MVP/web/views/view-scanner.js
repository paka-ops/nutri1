/* ==========================================================================
   NUTRI.N°1 — AI Food & Meal Scanner view  (SESSION 4)
   Renders <section id="scanner"> as a Dark Bento grid.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vs-*)
   Preserves  : runScan(type)  — 'Food' | 'Meal' | 'Product' | 'Food Cloud',
                #scanWizard (.step / .active / .done), #scanStatus
   Storage    : nutri_scans  [{ t, id, grams }]   (confirmed scans, newest first)
   Note       : demonstration only — no camera is opened and no image is analysed.
                The user picks a sample item; composition values are approximate
                reference figures per 100 g bundled with this file.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('scanner');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'scanner.title': 'AI Food & Meal Scanner',
      'scanner.sub': 'From a capture to a confirmed entry: identification, composition and portion in one flow.',
      'scanner.demo': 'Demonstration · sample items',
      'scanner.demo.note': 'No camera is opened and no image is analysed here: choose a sample to walk through the pipeline. Values are approximate, per 100 g.',
      'scanner.mode.food': 'Food', 'scanner.mode.food.desc': 'Photo → identification → nutrients.',
      'scanner.mode.meal': 'Meal', 'scanner.mode.meal.desc': 'Dish → recipe → ingredients → composition.',
      'scanner.mode.product': 'Product', 'scanner.mode.product.desc': 'Barcode / label → product data.',
      'scanner.sample': 'Sample', 'scanner.scan': 'Scan now', 'scanner.scanning': 'Scanning…',
      'scanner.pipe.title': 'Live AI pipeline',
      'scanner.step.capture': 'Capture', 'scanner.step.detect': 'Detect', 'scanner.step.ontology': 'Ontology',
      'scanner.step.composition': 'Composition', 'scanner.step.portion': 'Portion', 'scanner.step.confirm': 'Confirm',
      'scanner.status.ready': 'Ready.',
      'scanner.status.capture': 'Capturing {mode}…',
      'scanner.status.detect': 'Detecting what is in the frame…',
      'scanner.status.ontology': 'Matching with the food ontology…',
      'scanner.status.composition': 'Looking up composition…',
      'scanner.status.portion': 'Adjust the portion, then confirm.',
      'scanner.status.confirm': 'Confirmed: {name} · {kcal} kcal saved to your scans.',
      'scanner.status.discard': 'Scan discarded.',
      'scanner.result.title': 'Result',
      'scanner.result.empty': 'Run a scan to see the identified item, its composition and the portion control.',
      'scanner.result.confidence': 'Simulated confidence',
      'scanner.result.ref': 'Ontology reference',
      'scanner.result.barcode': 'Barcode (sample)',
      'scanner.result.ingredients': 'Detected ingredients',
      'scanner.result.portion': 'Portion',
      'scanner.result.per': 'For {g} g',
      'scanner.result.confirm': 'Confirm & save', 'scanner.result.discard': 'Discard',
      'scanner.n.kcal': 'Energy', 'scanner.n.protein': 'Protein', 'scanner.n.carbs': 'Carbohydrates', 'scanner.n.sugar': 'of which sugars',
      'scanner.n.fat': 'Fat', 'scanner.n.fiber': 'Fibre', 'scanner.n.salt': 'Salt',
      'scanner.flag.sugar': 'High in sugars', 'scanner.flag.salt': 'High in salt', 'scanner.flag.fat': 'High in fat', 'scanner.flag.fiber': 'Source of fibre',
      'scanner.flag.note': 'Indicative thresholds per 100 g.',
      'scanner.hist.title': 'Confirmed scans', 'scanner.hist.empty': 'Nothing confirmed yet.', 'scanner.hist.clear': 'Clear',
      'scanner.hist.total': 'Total {kcal} kcal',
      'scanner.f.avocado': 'Avocado', 'scanner.f.plantain': 'Ripe plantain', 'scanner.f.moringa': 'Moringa leaves', 'scanner.f.mango': 'Mango',
      'scanner.f.jollof': 'Jollof rice with chicken', 'scanner.f.thieb': 'Thieboudienne (rice and fish)', 'scanner.f.okra': 'Okra soup with fufu',
      'scanner.f.milk': 'Sweetened condensed milk', 'scanner.f.noodles': 'Instant noodles (dry)', 'scanner.f.tomato': 'Tomato paste (canned)',
      'scanner.i.rice': 'Rice', 'scanner.i.chicken': 'Chicken', 'scanner.i.tomato': 'Tomato', 'scanner.i.onion': 'Onion', 'scanner.i.oil': 'Vegetable oil',
      'scanner.i.fish': 'Fish', 'scanner.i.carrot': 'Carrot', 'scanner.i.cabbage': 'Cabbage', 'scanner.i.cassava': 'Cassava',
      'scanner.i.okra': 'Okra', 'scanner.i.palm': 'Palm oil', 'scanner.i.fufu': 'Fufu'
    },
    fr: {
      'scanner.title': 'Scanner IA d’aliments et de repas',
      'scanner.sub': 'De la capture à l’entrée confirmée : identification, composition et portion en un seul parcours.',
      'scanner.demo': 'Démonstration · exemples',
      'scanner.demo.note': 'Aucune caméra n’est ouverte et aucune image n’est analysée ici : choisissez un exemple pour parcourir le pipeline. Valeurs approximatives, pour 100 g.',
      'scanner.mode.food': 'Aliment', 'scanner.mode.food.desc': 'Photo → identification → nutriments.',
      'scanner.mode.meal': 'Repas', 'scanner.mode.meal.desc': 'Plat → recette → ingrédients → composition.',
      'scanner.mode.product': 'Produit', 'scanner.mode.product.desc': 'Code-barres / étiquette → données produit.',
      'scanner.sample': 'Exemple', 'scanner.scan': 'Scanner', 'scanner.scanning': 'Analyse…',
      'scanner.pipe.title': 'Pipeline IA en direct',
      'scanner.step.capture': 'Capture', 'scanner.step.detect': 'Détection', 'scanner.step.ontology': 'Ontologie',
      'scanner.step.composition': 'Composition', 'scanner.step.portion': 'Portion', 'scanner.step.confirm': 'Confirmation',
      'scanner.status.ready': 'Prêt.',
      'scanner.status.capture': 'Capture : {mode}…',
      'scanner.status.detect': 'Détection du contenu de l’image…',
      'scanner.status.ontology': 'Rapprochement avec l’ontologie alimentaire…',
      'scanner.status.composition': 'Recherche de la composition…',
      'scanner.status.portion': 'Ajustez la portion, puis confirmez.',
      'scanner.status.confirm': 'Confirmé : {name} · {kcal} kcal ajoutées à vos scans.',
      'scanner.status.discard': 'Scan abandonné.',
      'scanner.result.title': 'Résultat',
      'scanner.result.empty': 'Lancez un scan pour afficher l’élément identifié, sa composition et le réglage de la portion.',
      'scanner.result.confidence': 'Confiance simulée',
      'scanner.result.ref': 'Référence d’ontologie',
      'scanner.result.barcode': 'Code-barres (exemple)',
      'scanner.result.ingredients': 'Ingrédients détectés',
      'scanner.result.portion': 'Portion',
      'scanner.result.per': 'Pour {g} g',
      'scanner.result.confirm': 'Confirmer et enregistrer', 'scanner.result.discard': 'Abandonner',
      'scanner.n.kcal': 'Énergie', 'scanner.n.protein': 'Protéines', 'scanner.n.carbs': 'Glucides', 'scanner.n.sugar': 'dont sucres',
      'scanner.n.fat': 'Lipides', 'scanner.n.fiber': 'Fibres', 'scanner.n.salt': 'Sel',
      'scanner.flag.sugar': 'Riche en sucres', 'scanner.flag.salt': 'Riche en sel', 'scanner.flag.fat': 'Riche en lipides', 'scanner.flag.fiber': 'Source de fibres',
      'scanner.flag.note': 'Seuils indicatifs pour 100 g.',
      'scanner.hist.title': 'Scans confirmés', 'scanner.hist.empty': 'Rien de confirmé pour l’instant.', 'scanner.hist.clear': 'Effacer',
      'scanner.hist.total': 'Total {kcal} kcal',
      'scanner.f.avocado': 'Avocat', 'scanner.f.plantain': 'Banane plantain mûre', 'scanner.f.moringa': 'Feuilles de moringa', 'scanner.f.mango': 'Mangue',
      'scanner.f.jollof': 'Riz jollof au poulet', 'scanner.f.thieb': 'Thiéboudienne (riz au poisson)', 'scanner.f.okra': 'Sauce gombo et foufou',
      'scanner.f.milk': 'Lait concentré sucré', 'scanner.f.noodles': 'Nouilles instantanées (sèches)', 'scanner.f.tomato': 'Concentré de tomate (conserve)',
      'scanner.i.rice': 'Riz', 'scanner.i.chicken': 'Poulet', 'scanner.i.tomato': 'Tomate', 'scanner.i.onion': 'Oignon', 'scanner.i.oil': 'Huile végétale',
      'scanner.i.fish': 'Poisson', 'scanner.i.carrot': 'Carotte', 'scanner.i.cabbage': 'Chou', 'scanner.i.cassava': 'Manioc',
      'scanner.i.okra': 'Gombo', 'scanner.i.palm': 'Huile de palme', 'scanner.i.fufu': 'Foufou'
    }
  });

  /* ---- 2. Sample catalogue (approximate values per 100 g; salt in g) ----- */
  function item(id, mode, ref, conf, grams, kcal, protein, carbs, sugar, fat, fiber, salt, extra) {
    var o = { id: id, mode: mode, ref: ref, conf: conf, grams: grams, kcal: kcal, protein: protein, carbs: carbs, sugar: sugar, fat: fat, fiber: fiber, salt: salt };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  var ITEMS = [
    item('avocado', 'food', 'NUTRI:FRUIT/AVOCADO', 0.96, 100, 160, 2.0, 8.5, 0.7, 14.7, 6.7, 0.02),
    item('plantain', 'food', 'NUTRI:STARCH/PLANTAIN-RIPE', 0.93, 150, 122, 1.3, 31.9, 15.0, 0.4, 2.3, 0.01),
    item('moringa', 'food', 'NUTRI:LEAF/MORINGA', 0.88, 60, 64, 9.4, 8.3, 0.0, 1.4, 2.0, 0.02),
    item('mango', 'food', 'NUTRI:FRUIT/MANGO', 0.95, 200, 60, 0.8, 15.0, 13.7, 0.4, 1.6, 0.0),
    item('jollof', 'meal', 'NUTRI:DISH/JOLLOF-CHICKEN', 0.91, 350, 150, 7.0, 20.0, 1.5, 4.5, 1.0, 0.8, { ingredients: ['rice', 'chicken', 'tomato', 'onion', 'oil'] }),
    item('thieb', 'meal', 'NUTRI:DISH/THIEBOUDIENNE', 0.89, 400, 140, 7.5, 18.0, 1.8, 4.0, 1.5, 0.75, { ingredients: ['rice', 'fish', 'tomato', 'carrot', 'cabbage', 'cassava', 'oil'] }),
    item('okra', 'meal', 'NUTRI:DISH/OKRA-FUFU', 0.86, 380, 110, 5.0, 15.0, 1.2, 3.5, 2.0, 0.6, { ingredients: ['okra', 'fufu', 'fish', 'palm', 'onion'] }),
    item('milk', 'product', 'NUTRI:PRODUCT/CONDENSED-MILK', 0.99, 30, 321, 7.9, 54.4, 54.4, 8.7, 0.0, 0.32, { barcode: '0 000000 000017' }),
    item('noodles', 'product', 'NUTRI:PRODUCT/INSTANT-NOODLES', 0.99, 85, 450, 9.0, 60.0, 2.0, 19.0, 2.5, 4.3, { barcode: '0 000000 000024' }),
    item('tomato', 'product', 'NUTRI:PRODUCT/TOMATO-PASTE', 0.99, 20, 82, 4.3, 18.9, 12.2, 0.5, 4.1, 2.0, { barcode: '0 000000 000031' })
  ];
  var MODES = ['food', 'meal', 'product'];
  var MODE_ICON = { food: 'leaf', meal: 'bowl', product: 'barcode' };
  var STEPS = ['capture', 'detect', 'ontology', 'composition', 'portion', 'confirm'];
  var NUTRIENTS = ['kcal', 'protein', 'carbs', 'sugar', 'fat', 'fiber', 'salt'];
  var STORE = 'nutri_scans';

  function byId(id) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }
  function itemsOf(mode) { return ITEMS.filter(function (it) { return it.mode === mode; }); }

  /* step: -1 idle · 0–3 running · 4 awaiting portion/confirm · 5 confirmed */
  var state = { step: -1, mode: 'food', itemId: null, grams: 0, pick: { food: 'avocado', meal: 'jollof', product: 'milk' }, note: 'ready', history: [], last: null };
  (function load() {
    try {
      var saved = JSON.parse(global.localStorage.getItem(STORE) || '[]');
      if (Array.isArray(saved)) state.history = saved.filter(function (e) { return e && byId(e.id) && +e.grams > 0; }).slice(0, 8);
    } catch (e) { /* storage unavailable */ }
  })();
  function save() { try { global.localStorage.setItem(STORE, JSON.stringify(state.history)); } catch (e) { /* ignore */ } }

  /* ---- 3. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function locale() { return I18N.lang === 'fr' ? 'fr-FR' : 'en-GB'; }
  function num(v, digits) { try { return Number(v).toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }); } catch (e) { return Number(v).toFixed(digits); } }
  function time(ts) { try { return new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function nameOf(it) { return t('scanner.f.' + it.id); }
  function amount(it, key, grams) { return it[key] * grams / 100; }
  function fmt(key, v) { return key === 'kcal' ? num(Math.round(v), 0) + ' kcal' : num(v, key === 'salt' ? 2 : 1) + ' g'; }
  function flags(it) {
    var out = [];
    if (it.sugar > 22.5) out.push(['sugar', 'warn']);
    if (it.salt > 1.5) out.push(['salt', 'warn']);
    if (it.fat > 17.5) out.push(['fat', 'warn']);
    if (it.fiber >= 3) out.push(['fiber', 'good']);
    return out;
  }
  var PATHS = {
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.2"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19 13 11"/>',
    bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20h6M9 7c0-1.500 1.500-1.500 1.500-3M13.500 7c0-1.500 1.500-1.500 1.500-3"/>',
    barcode: '<path d="M4 6v12M7.500 6v12M11 6v12M14 6v12M17 6v12M20 6v12"/>',
    pipe: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
    result: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.500-5.800M4 5v4h4M12 8v4l2.500 2"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    alert: '<path d="M12 4 3 19h18L12 4z"/><path d="M12 10v4M12 17h.010"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2').replace(/\.010/g, '.01') + '</svg>';
  }

  /* ---- 4. Template ------------------------------------------------------ */
  function busy() { return state.step >= 0 && state.step < 4; }
  function modeCard(mode) {
    var options = itemsOf(mode).map(function (it) {
      return '<option value="' + it.id + '"' + (state.pick[mode] === it.id ? ' selected' : '') + '>' + esc(nameOf(it)) + '</option>';
    }).join('');
    var running = busy() && state.mode === mode;
    return '<article class="card vs-mode' + (state.step >= 0 && state.step < 5 && state.mode === mode ? ' is-on' : '') + '">' +
      '<header class="vs-card__head"><span class="vh-ico">' + ico(MODE_ICON[mode]) + '</span><h3>' + esc(t('scanner.mode.' + mode)) + '</h3></header>' +
      '<p class="vs-desc">' + esc(t('scanner.mode.' + mode + '.desc')) + '</p>' +
      '<label class="vs-field"><span>' + esc(t('scanner.sample')) + '</span>' +
        '<select data-vs-pick="' + mode + '"' + (busy() ? ' disabled' : '') + '>' + options + '</select></label>' +
      '<button type="button" class="btn primary" data-vs-act="scan" data-vs-mode="' + mode + '"' + (busy() ? ' disabled' : '') + '>' + ico('scan') +
        '<span>' + esc(t(running ? 'scanner.scanning' : 'scanner.scan')) + '</span></button>' +
      '</article>';
  }
  function statusText() {
    if (state.note === 'confirm' && state.last) return t('scanner.status.confirm', { name: nameOf(state.last.item), kcal: num(Math.round(amount(state.last.item, 'kcal', state.last.grams)), 0) });
    if (state.note === 'discard') return t('scanner.status.discard');
    if (state.step < 0) return t('scanner.status.ready');
    if (state.step === 0) return t('scanner.status.capture', { mode: t('scanner.mode.' + state.mode) });
    return t('scanner.status.' + STEPS[Math.min(state.step, 4)]);
  }
  function wizard() {
    /* Idle keeps the legacy look: first step highlighted. */
    return STEPS.map(function (s, i) {
      var cls = 'step';
      if (state.step < 0) { if (state.note === 'confirm') cls += ' done'; else if (i === 0) cls += ' active'; }
      else if (i < state.step) cls += ' done';
      else if (i === state.step) cls += ' active';
      return '<li class="' + cls + '"' + (cls.indexOf('active') > 0 ? ' aria-current="step"' : '') + '><i>' + (cls.indexOf('done') > 0 ? ico('check') : (i + 1)) + '</i><span>' + esc(t('scanner.step.' + s)) + '</span></li>';
    }).join('');
  }
  function pipeCard() {
    return '<article class="card vs-pipe">' +
      '<header class="vs-card__head"><span class="vh-ico">' + ico('pipe') + '</span><h3>' + esc(t('scanner.pipe.title')) + '</h3></header>' +
      '<ol class="wizard vs-wizard" id="scanWizard">' + wizard() + '</ol>' +
      '<p id="scanStatus" class="vs-status" role="status" aria-live="polite">' + esc(statusText()) + '</p>' +
      '</article>';
  }
  function nutrientTiles(it, grams) {
    return NUTRIENTS.map(function (k) {
      return '<div class="vs-nut' + (k === 'kcal' ? ' vs-nut--main' : '') + (k === 'sugar' ? ' vs-nut--sub' : '') + '" data-vs-nut="' + k + '"><span>' + esc(t('scanner.n.' + k)) + '</span><b>' + esc(fmt(k, amount(it, k, grams))) + '</b></div>';
    }).join('');
  }
  function resultCard() {
    var it = state.step === 4 ? byId(state.itemId) : null;
    var head = '<header class="vs-card__head"><span class="vh-ico">' + ico('result') + '</span><h3>' + esc(t('scanner.result.title')) + '</h3>' +
      '<span class="pill vs-demo">' + esc(t('scanner.demo')) + '</span></header>';
    if (!it) return '<article class="card vs-result">' + head + '<p class="vs-empty">' + esc(t('scanner.result.empty')) + '</p></article>';
    var fl = flags(it), max = Math.max(it.grams * 3, 300), step = max > 600 ? 10 : 5;
    return '<article class="card vs-result is-on">' + head +
      '<div class="vs-id"><div><h4 tabindex="-1" data-vs-focus>' + esc(nameOf(it)) + '</h4><span class="vs-kind">' + esc(t('scanner.mode.' + it.mode)) + '</span></div>' +
        '<div class="vs-conf"><b>' + num(it.conf * 100, 0) + ' %</b><span>' + esc(t('scanner.result.confidence')) + '</span></div></div>' +
      '<dl class="vs-meta"><div><dt>' + esc(t('scanner.result.ref')) + '</dt><dd>' + esc(it.ref) + '</dd></div>' +
        (it.barcode ? '<div><dt>' + esc(t('scanner.result.barcode')) + '</dt><dd>' + esc(it.barcode) + '</dd></div>' : '') + '</dl>' +
      (it.ingredients ? '<div class="vs-ing"><span>' + esc(t('scanner.result.ingredients')) + '</span><ul>' +
        it.ingredients.map(function (k) { return '<li>' + esc(t('scanner.i.' + k)) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="vs-portion"><label for="vsPortion">' + esc(t('scanner.result.portion')) + '</label>' +
        '<output id="vsPortionOut" for="vsPortion">' + num(state.grams, 0) + ' g</output>' +
        '<input id="vsPortion" type="range" min="10" max="' + max + '" step="' + step + '" value="' + state.grams + '" data-vs-portion></div>' +
      '<p class="vs-per" id="vsPer">' + esc(t('scanner.result.per', { g: num(state.grams, 0) })) + '</p>' +
      '<div class="vs-nuts" id="vsNuts">' + nutrientTiles(it, state.grams) + '</div>' +
      (fl.length ? '<div class="vs-flags">' + fl.map(function (f) { return '<span class="vs-flag vs-flag--' + f[1] + '">' + ico(f[1] === 'good' ? 'check' : 'alert') + esc(t('scanner.flag.' + f[0])) + '</span>'; }).join('') +
        '<small>' + esc(t('scanner.flag.note')) + '</small></div>' : '') +
      '<div class="vs-actions"><button type="button" class="btn primary" data-vs-act="confirm">' + ico('check') + '<span>' + esc(t('scanner.result.confirm')) + '</span></button>' +
        '<button type="button" class="btn secondary" data-vs-act="discard">' + esc(t('scanner.result.discard')) + '</button></div>' +
      '</article>';
  }
  function historyCard() {
    var total = 0;
    var rows = state.history.map(function (e) {
      var it = byId(e.id), kcal = amount(it, 'kcal', e.grams); total += kcal;
      return '<li><span class="vs-hist__ico">' + ico(MODE_ICON[it.mode]) + '</span><div><span>' + esc(nameOf(it)) + '</span><small>' + num(e.grams, 0) + ' g · ' + esc(time(e.t)) + '</small></div><b>' + num(Math.round(kcal), 0) + ' kcal</b></li>';
    }).join('');
    return '<article class="card vs-hist">' +
      '<header class="vs-card__head"><span class="vh-ico">' + ico('history') + '</span><h3>' + esc(t('scanner.hist.title')) + '</h3>' +
        (rows ? '<button type="button" class="btn secondary vs-hist__clear" data-vs-act="clear">' + esc(t('scanner.hist.clear')) + '</button>' : '') + '</header>' +
      (rows ? '<ul class="vs-hist__list">' + rows + '</ul><p class="vs-hist__total">' + esc(t('scanner.hist.total', { kcal: num(Math.round(total), 0) })) + '</p>'
            : '<p class="vs-empty">' + esc(t('scanner.hist.empty')) + '</p>') +
      '</article>';
  }
  function template() {
    return '<div class="vs">' +
      '<article class="card vs-hero"><div class="vh-head"><div class="vs-hero__title"><span class="vh-ico">' + ico('scan') + '</span>' +
        '<div><h2>' + esc(t('scanner.title')) + '</h2><p class="muted">' + esc(t('scanner.sub')) + '</p></div></div>' +
        '<span class="pill vs-demo">' + esc(t('scanner.demo')) + '</span></div>' +
        '<p class="vs-hero__note">' + esc(t('scanner.demo.note')) + '</p></article>' +
      '<div class="vs-modes">' + MODES.map(modeCard).join('') + '</div>' +
      pipeCard() + resultCard() + historyCard() +
      '</div>';
  }

  /* ---- 5. Render ---------------------------------------------------------- */
  function render(focusSel) {
    var active = doc.activeElement, keep = null;
    if (!focusSel && active && root.contains(active) && active.getAttribute) {
      if (active.id) keep = '#' + active.id;
      else if (active.getAttribute('data-vs-pick')) keep = '[data-vs-pick="' + active.getAttribute('data-vs-pick') + '"]';
      else if (active.getAttribute('data-vs-act')) keep = '[data-vs-act="' + active.getAttribute('data-vs-act') + '"]' + (active.getAttribute('data-vs-mode') ? '[data-vs-mode="' + active.getAttribute('data-vs-mode') + '"]' : '');
    }
    root.innerHTML = template();
    var target = root.querySelector(focusSel || keep || 'x-none');
    if (target && !target.disabled) { try { target.focus({ preventScroll: !focusSel }); } catch (e) { target.focus(); } }
  }
  function paintPipe() {
    var w = doc.getElementById('scanWizard'), s = doc.getElementById('scanStatus');
    if (w) w.innerHTML = wizard();
    if (s) s.textContent = statusText();
  }
  function paintPortion() {
    var it = byId(state.itemId); if (!it) return;
    var out = doc.getElementById('vsPortionOut'), per = doc.getElementById('vsPer'), nuts = doc.getElementById('vsNuts');
    if (out) out.textContent = num(state.grams, 0) + ' g';
    if (per) per.textContent = t('scanner.result.per', { g: num(state.grams, 0) });
    if (nuts) nuts.innerHTML = nutrientTiles(it, state.grams);
  }

  /* ---- 6. Actions --------------------------------------------------------- */
  var timer = null;
  function stop() { if (timer) { global.clearInterval(timer); timer = null; } }
  function start(mode, id) {
    var it = byId(id) || itemsOf(mode)[0];
    stop();
    state.mode = mode; state.itemId = it.id; state.grams = it.grams; state.pick[mode] = it.id; state.step = 0; state.note = '';
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { state.step = 4; render('[data-vs-focus]'); return; }
    render();
    timer = global.setInterval(function () {
      state.step += 1;
      if (state.step < 4) { paintPipe(); return; }
      stop(); state.step = 4;
      render(root.contains(doc.activeElement) ? '[data-vs-focus]' : null);
    }, 520);
  }
  function confirm() {
    var it = byId(state.itemId); if (state.step !== 4 || !it) return;
    state.history.unshift({ t: Date.now(), id: it.id, grams: state.grams }); state.history = state.history.slice(0, 8);
    state.last = { item: it, grams: state.grams };
    state.step = -1; state.note = 'confirm';
    save(); render('[data-vs-act="scan"][data-vs-mode="' + it.mode + '"]');
    if (typeof global.toast === 'function') { try { global.toast(statusText()); } catch (e) { /* ignore */ } }
  }
  function discard() {
    var mode = state.mode; stop();
    state.step = -1; state.note = 'discard';
    render('[data-vs-act="scan"][data-vs-mode="' + mode + '"]');
  }

  root.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-vs-act]') : null;
    if (!el || !root.contains(el) || el.disabled) return;
    var act = el.getAttribute('data-vs-act');
    if (act === 'scan') { var m = el.getAttribute('data-vs-mode'); start(m, state.pick[m]); }
    else if (act === 'confirm') confirm();
    else if (act === 'discard') discard();
    else if (act === 'clear') { state.history = []; save(); render('[data-vs-act="scan"]'); }
  });
  root.addEventListener('change', function (ev) {
    var el = ev.target, mode = el && el.getAttribute && el.getAttribute('data-vs-pick');
    if (mode && byId(el.value)) state.pick[mode] = el.value;
  });
  root.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el && el.hasAttribute && el.hasAttribute('data-vs-portion')) { state.grams = Math.max(10, +el.value || 10); paintPortion(); }
  });

  /* ---- 7. Legacy API -------------------------------------------------------- */
  global.runScan = function (type) {
    var key = String(type == null ? '' : type).toLowerCase();
    var mode = MODES.indexOf(key) >= 0 ? key : 'food';          /* 'Food Cloud' and unknown types → food */
    if (busy()) return false;
    var on = doc.querySelector('.view.on');
    if (on !== root && typeof global.go === 'function') { try { global.go('scanner'); } catch (e) { /* ignore */ } }
    start(mode, state.pick[mode]);
    return true;
  };

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  render();
  I18N.onChange(function () { render(); });

  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.scanner = {
    render: render, items: ITEMS.map(function (it) { return it.id; }),
    state: function () { return { step: state.step, mode: state.mode, itemId: state.itemId, grams: state.grams, note: state.note, history: state.history.slice() }; }
  };
})(window);
