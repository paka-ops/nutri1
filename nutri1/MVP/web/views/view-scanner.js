/* ==========================================================================
   NUTRI.N°1 — AI Food & Meal Scanner view  (SESSION 4)
   Renders <section id="scanner"> as a Dark Bento grid.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vs-*)
   Hosts      : #vsBalance — meal balance, recommendations and confirm lock (views/view-scanner-balance.js)
   Preserves  : runScan(type)  — 'Food' | 'Meal' | 'Product' | 'Food Cloud',
                #scanWizard (.step / .active / .done), #scanStatus
   Storage    : nutri_scans  [{ t, id, grams, kcal, score, conf }]   (confirmed scans, newest first)
   Note       : demonstration only — no camera is opened and no image is analysed.
                The user picks a sample photo (assets/scanner/*.jpg, AI-generated); the
                scan is simulated on it. Composition is summed from approximate
                per-100 g ingredient figures bundled with this file, and the user can
                correct ingredients / portions to raise the simulated confidence.
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

  /* Task 1 additions: photo viewfinder, nutrition gauges, score, manual assist. */
  I18N.register({
    en: {
      'scanner.demo.note': 'Simulation: the scan runs on a sample photo, no camera is opened and no image is analysed. Nutrient values are approximate and computed from the ingredients and portions shown.',
      'scanner.status.portion': 'Check the ingredients and portions to refine the result, then confirm.',
      'scanner.result.empty': 'Pick a photo and run a scan to see calories, macronutrients, micronutrients and the health score.',
      'scanner.result.confidence': 'AI accuracy (simulated)',
      'scanner.view.title': 'AI viewfinder', 'scanner.view.pick': 'Choose a photo to scan',
      'scanner.view.idle': 'Ready to scan', 'scanner.view.busy': 'AI analysis…', 'scanner.view.done': 'Analysis complete',
      'scanner.view.alt': 'Sample photo: {name}',
      'scanner.n.sugars': 'Sugars', 'scanner.kcal.ref': '{pct} % of a 2,000 kcal day', 'scanner.weight': 'Total weight',
      'scanner.score.title': 'Health score', 'scanner.score.a': 'Excellent', 'scanner.score.b': 'Good', 'scanner.score.c': 'Average', 'scanner.score.d': 'Limited', 'scanner.score.e': 'Poor',
      'scanner.score.note': 'Indicative score from fibre, protein, micronutrient density, sugars, salt and fat.',
      'scanner.macro.title': 'Macronutrients', 'scanner.macro.energy': '{pct} % of energy',
      'scanner.limit.title': 'Daily benchmarks', 'scanner.limit.of': '{pct} % of {ref}',
      'scanner.micro.title': 'Micronutrients', 'scanner.micro.note': '% of daily reference intake for this portion.',
      'scanner.m.iron': 'Iron', 'scanner.m.calcium': 'Calcium', 'scanner.m.vita': 'Vitamin A', 'scanner.m.vitc': 'Vitamin C',
      'scanner.m.potassium': 'Potassium', 'scanner.m.zinc': 'Zinc', 'scanner.m.folate': 'Folate (B9)', 'scanner.m.magnesium': 'Magnesium',
      'scanner.assist.title': 'Help the AI refine', 'scanner.assist.sub': 'Confirm what the AI saw, correct the grams, remove a wrong ingredient or add a missing one. Each check raises the accuracy and recalculates the result.',
      'scanner.assist.count': '{n} of {total} items verified',
      'scanner.assist.low': 'To refine', 'scanner.assist.mid': 'Almost there', 'scanner.assist.high': 'Reliable result',
      'scanner.assist.size': 'Portion size', 'scanner.assist.s': 'Small', 'scanner.assist.m': 'AI estimate', 'scanner.assist.l': 'Large',
      'scanner.assist.detected': 'Detected {pct} %', 'scanner.assist.hidden': 'Not visible · estimated {pct} %', 'scanner.assist.verified': 'Verified', 'scanner.assist.added': 'Added by you',
      'scanner.assist.confirm': 'Confirm {name}', 'scanner.assist.remove': 'Remove {name}', 'scanner.assist.grams': 'Grams of {name}',
      'scanner.assist.add': 'Add a missing ingredient', 'scanner.assist.addbtn': 'Add', 'scanner.assist.all': 'Confirm all',
      'scanner.hist.meta': '{g} g · score {score} · {time}',
      'scanner.i.cube': 'Stock cube and salt', 'scanner.i.beans': 'Cowpeas (niébé)', 'scanner.i.egg': 'Egg',
      'scanner.i.avocado': 'Avocado', 'scanner.i.plantain': 'Ripe plantain', 'scanner.i.moringa': 'Moringa leaves', 'scanner.i.mango': 'Mango',
      'scanner.i.milk': 'Sweetened condensed milk', 'scanner.i.noodles': 'Instant noodles', 'scanner.i.paste': 'Tomato paste'
    },
    fr: {
      'scanner.demo.note': 'Simulation : le scan s’exécute sur une photo d’exemple, aucune caméra n’est ouverte et aucune image n’est analysée. Les valeurs nutritionnelles sont approximatives et calculées à partir des ingrédients et portions affichés.',
      'scanner.status.portion': 'Vérifiez les ingrédients et les portions pour affiner le résultat, puis confirmez.',
      'scanner.result.empty': 'Choisissez une photo et lancez un scan pour afficher calories, macronutriments, micronutriments et score santé.',
      'scanner.result.confidence': 'Précision de l’IA (simulée)',
      'scanner.view.title': 'Viseur IA', 'scanner.view.pick': 'Choisissez une photo à scanner',
      'scanner.view.idle': 'Prêt à scanner', 'scanner.view.busy': 'Analyse IA…', 'scanner.view.done': 'Analyse terminée',
      'scanner.view.alt': 'Photo d’exemple : {name}',
      'scanner.n.sugars': 'Sucres', 'scanner.kcal.ref': '{pct} % d’une journée à 2 000 kcal', 'scanner.weight': 'Poids total',
      'scanner.score.title': 'Score santé', 'scanner.score.a': 'Excellent', 'scanner.score.b': 'Bon', 'scanner.score.c': 'Moyen', 'scanner.score.d': 'Limité', 'scanner.score.e': 'Faible',
      'scanner.score.note': 'Score indicatif : fibres, protéines, densité en micronutriments, sucres, sel et lipides.',
      'scanner.macro.title': 'Macronutriments', 'scanner.macro.energy': '{pct} % de l’énergie',
      'scanner.limit.title': 'Repères journaliers', 'scanner.limit.of': '{pct} % de {ref}',
      'scanner.micro.title': 'Micronutriments', 'scanner.micro.note': '% de l’apport de référence journalier pour cette portion.',
      'scanner.m.iron': 'Fer', 'scanner.m.calcium': 'Calcium', 'scanner.m.vita': 'Vitamine A', 'scanner.m.vitc': 'Vitamine C',
      'scanner.m.potassium': 'Potassium', 'scanner.m.zinc': 'Zinc', 'scanner.m.folate': 'Folates (B9)', 'scanner.m.magnesium': 'Magnésium',
      'scanner.assist.title': 'Aidez l’IA à affiner', 'scanner.assist.sub': 'Confirmez ce que l’IA a vu, corrigez les grammes, retirez un ingrédient erroné ou ajoutez-en un manquant. Chaque vérification augmente la précision et recalcule le résultat.',
      'scanner.assist.count': '{n} élément(s) vérifié(s) sur {total}',
      'scanner.assist.low': 'À affiner', 'scanner.assist.mid': 'Presque fiable', 'scanner.assist.high': 'Résultat fiable',
      'scanner.assist.size': 'Taille de la portion', 'scanner.assist.s': 'Petite', 'scanner.assist.m': 'Estimation IA', 'scanner.assist.l': 'Grande',
      'scanner.assist.detected': 'Détecté {pct} %', 'scanner.assist.hidden': 'Non visible · estimé {pct} %', 'scanner.assist.verified': 'Vérifié', 'scanner.assist.added': 'Ajouté par vous',
      'scanner.assist.confirm': 'Confirmer {name}', 'scanner.assist.remove': 'Retirer {name}', 'scanner.assist.grams': 'Grammes de {name}',
      'scanner.assist.add': 'Ajouter un ingrédient manquant', 'scanner.assist.addbtn': 'Ajouter', 'scanner.assist.all': 'Tout confirmer',
      'scanner.hist.meta': '{g} g · score {score} · {time}',
      'scanner.i.cube': 'Cube bouillon et sel', 'scanner.i.beans': 'Niébé', 'scanner.i.egg': 'Œuf',
      'scanner.i.avocado': 'Avocat', 'scanner.i.plantain': 'Banane plantain mûre', 'scanner.i.moringa': 'Feuilles de moringa', 'scanner.i.mango': 'Mangue',
      'scanner.i.milk': 'Lait concentré sucré', 'scanner.i.noodles': 'Nouilles instantanées', 'scanner.i.paste': 'Concentré de tomate'
    }
  });

  /* ---- 2. Ingredient table (approximate values per 100 g) -----------------
     kcal, protein g, carbs g, sugars g, fat g, fibre g, salt g,
     iron mg, calcium mg, vitamin A µg, vitamin C mg, potassium mg, zinc mg, folate µg, magnesium mg */
  var KEYS = ['kcal', 'protein', 'carbs', 'sugar', 'fat', 'fiber', 'salt', 'iron', 'calcium', 'vita', 'vitc', 'potassium', 'zinc', 'folate', 'magnesium'];
  var ING = {
    avocado:  [160, 2.0, 8.5, 0.7, 14.7, 6.7, 0.02, 0.55, 12, 7, 10, 485, 0.64, 81, 29],
    plantain: [122, 1.3, 31.9, 15.0, 0.4, 2.3, 0.01, 0.6, 3, 56, 18, 499, 0.14, 22, 37],
    moringa:  [64, 9.4, 8.3, 0.0, 1.4, 2.0, 0.02, 4.0, 185, 378, 52, 337, 0.6, 40, 42],
    mango:    [60, 0.8, 15.0, 13.7, 0.4, 1.6, 0.0, 0.16, 11, 54, 36, 168, 0.09, 43, 10],
    rice:     [130, 2.7, 28.2, 0.1, 0.3, 0.4, 0.0, 0.2, 10, 0, 0, 35, 0.5, 3, 12],
    chicken:  [190, 25.0, 0.0, 0.0, 9.5, 0.0, 0.2, 1.1, 12, 18, 0, 240, 2.0, 8, 23],
    tomato:   [18, 0.9, 3.9, 2.6, 0.2, 1.2, 0.01, 0.3, 10, 42, 14, 237, 0.17, 15, 11],
    onion:    [40, 1.1, 9.3, 4.2, 0.1, 1.7, 0.01, 0.2, 23, 0, 7, 146, 0.17, 19, 10],
    oil:      [884, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fish:     [128, 26.0, 0.0, 0.0, 2.7, 0.0, 0.14, 0.7, 14, 0, 0, 380, 0.4, 6, 34],
    carrot:   [35, 0.8, 8.2, 3.5, 0.2, 3.0, 0.15, 0.3, 30, 852, 3.6, 235, 0.2, 14, 10],
    cabbage:  [23, 1.3, 5.5, 2.8, 0.1, 1.9, 0.02, 0.2, 48, 4, 37, 196, 0.2, 30, 15],
    cassava:  [160, 1.4, 38.0, 1.7, 0.3, 1.8, 0.03, 0.3, 16, 1, 20, 271, 0.34, 27, 21],
    okra:     [22, 1.9, 4.5, 2.4, 0.2, 2.5, 0.02, 0.3, 77, 14, 16, 135, 0.43, 46, 36],
    palm:     [884, 0, 0, 0, 100, 0, 0, 0, 0, 5000, 0, 0, 0, 0, 0],
    fufu:     [155, 0.6, 37.0, 0.5, 0.2, 1.2, 0.02, 0.3, 15, 0, 5, 150, 0.2, 10, 15],
    cube:     [170, 8.0, 20.0, 8.0, 6.0, 0.0, 55.0, 0.5, 60, 0, 0, 300, 0.2, 10, 20],
    beans:    [116, 7.7, 20.8, 3.3, 0.5, 6.5, 0.01, 2.5, 24, 1, 0.4, 278, 1.3, 208, 53],
    egg:      [155, 12.6, 1.1, 1.1, 10.6, 0.0, 0.31, 1.2, 50, 149, 0, 126, 1.05, 44, 10],
    milk:     [321, 7.9, 54.4, 54.4, 8.7, 0.0, 0.32, 0.2, 284, 74, 2.6, 371, 0.94, 11, 26],
    noodles:  [450, 9.0, 60.0, 2.0, 19.0, 2.5, 4.3, 4.0, 20, 0, 0, 150, 0.6, 30, 25],
    paste:    [82, 4.3, 18.9, 12.2, 0.5, 4.1, 2.0, 3.0, 36, 76, 22, 1014, 0.63, 12, 42]
  };
  /* Ingredients a user may add by hand (whole foods only). */
  var ADDABLE = ['rice', 'chicken', 'fish', 'egg', 'beans', 'tomato', 'onion', 'carrot', 'cabbage', 'cassava', 'okra', 'fufu', 'plantain', 'avocado', 'moringa', 'oil', 'palm', 'cube'];
  var MICROS = [['iron', 14, 'mg'], ['calcium', 800, 'mg'], ['vita', 800, 'µg'], ['vitc', 80, 'mg'], ['potassium', 2000, 'mg'], ['zinc', 10, 'mg'], ['folate', 200, 'µg'], ['magnesium', 375, 'mg']];
  var LIMITS = [['fiber', 30, 'good'], ['sugar', 50, 'warn'], ['salt', 5, 'warn']];
  var MACROS = [['protein', 4, 'lime'], ['carbs', 4, 'blue'], ['fat', 9, 'orange']];

  /* Sample catalogue. parts: [ingredient, grams, simulated confidence, box [x,y,w,h] in % or null when not visible] */
  function item(id, mode, ref, parts, extra) {
    var o = { id: id, mode: mode, ref: ref, parts: parts, img: 'assets/scanner/' + id + '.jpg' };
    o.grams = parts.reduce(function (a, p) { return a + p[1]; }, 0);
    o.ingredients = parts.length > 1 ? parts.map(function (p) { return p[0]; }) : null;
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  var ITEMS = [
    item('avocado', 'food', 'NUTRI:FRUIT/AVOCADO', [['avocado', 100, 0.89, [14, 22, 74, 52]]]),
    item('plantain', 'food', 'NUTRI:STARCH/PLANTAIN-RIPE', [['plantain', 150, 0.86, [3, 22, 94, 62]]]),
    item('moringa', 'food', 'NUTRI:LEAF/MORINGA', [['moringa', 60, 0.82, [6, 16, 86, 68]]]),
    item('mango', 'food', 'NUTRI:FRUIT/MANGO', [['mango', 200, 0.88, [8, 22, 84, 56]]]),
    item('jollof', 'meal', 'NUTRI:DISH/JOLLOF-CHICKEN', [
      ['rice', 190, 0.95, [14, 34, 60, 50]], ['chicken', 90, 0.93, [24, 18, 34, 50]], ['tomato', 30, 0.90, [54, 20, 26, 22]],
      ['onion', 20, 0.87, [54, 40, 28, 28]], ['oil', 15, 0.61, null], ['cube', 5, 0.56, null]]),
    item('thieb', 'meal', 'NUTRI:DISH/THIEBOUDIENNE', [
      ['rice', 180, 0.94, [16, 62, 56, 18]], ['fish', 80, 0.91, [38, 36, 30, 34]], ['carrot', 30, 0.90, [62, 30, 14, 30]],
      ['cabbage', 35, 0.86, [22, 24, 28, 28]], ['cassava', 35, 0.78, [18, 50, 20, 20]], ['tomato', 20, 0.62, null],
      ['oil', 15, 0.60, null], ['cube', 5, 0.55, null]]),
    item('okra', 'meal', 'NUTRI:DISH/OKRA-FUFU', [
      ['okra', 120, 0.92, [10, 26, 56, 52]], ['fufu', 180, 0.94, [66, 34, 32, 42]], ['fish', 50, 0.84, [22, 42, 26, 24]],
      ['palm', 15, 0.66, null], ['onion', 10, 0.58, null], ['cube', 5, 0.55, null]]),
    item('milk', 'product', 'NUTRI:PRODUCT/CONDENSED-MILK', [['milk', 30, 0.93, [40, 6, 46, 70]]], { barcode: '0 000000 000017' }),
    item('noodles', 'product', 'NUTRI:PRODUCT/INSTANT-NOODLES', [['noodles', 85, 0.92, [6, 36, 88, 54]]], { barcode: '0 000000 000024' }),
    item('tomato', 'product', 'NUTRI:PRODUCT/TOMATO-PASTE', [['paste', 20, 0.93, [22, 16, 44, 56]]], { barcode: '0 000000 000031' })
  ];
  var MODES = ['food', 'meal', 'product'];
  var MODE_ICON = { food: 'leaf', meal: 'bowl', product: 'barcode' };
  var STEPS = ['capture', 'detect', 'ontology', 'composition', 'portion', 'confirm'];
  var STORE = 'nutri_scans';
  var VERIFIED = 0.99;

  function byId(id) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }
  function itemsOf(mode) { return ITEMS.filter(function (it) { return it.mode === mode; }); }

  /* ---- Nutrition maths ---------------------------------------------------- */
  function totals(parts) {
    var out = {}, grams = 0;
    KEYS.forEach(function (k) { out[k] = 0; });
    parts.forEach(function (p) {
      var row = ING[p.id]; if (!row) return;
      grams += p.g;
      KEYS.forEach(function (k, i) { out[k] += row[i] * p.g / 100; });
    });
    out.grams = grams;
    return out;
  }
  function per100(tot) {
    var out = {}, f = tot.grams > 0 ? 100 / tot.grams : 0;
    KEYS.forEach(function (k) { out[k] = tot[k] * f; });
    return out;
  }
  /* Indicative 0–100 score computed on the composition per 100 g. */
  function scoreOf(tot) {
    var c = per100(tot), micro = 0;
    MICROS.forEach(function (m) { micro += Math.min(1, c[m[0]] / (m[1] * 0.15)); });
    var s = 52 + Math.min(15, c.fiber * 3) + Math.min(10, c.protein * 0.8) + (micro / MICROS.length) * 22 -
      Math.min(26, Math.max(0, c.sugar - 5) * 0.9) - Math.min(26, c.salt * 12) - Math.min(15, Math.max(0, c.fat - 10) * 0.6);
    return Math.max(5, Math.min(98, Math.round(s)));
  }
  function gradeOf(score) { return score >= 80 ? 'a' : score >= 65 ? 'b' : score >= 50 ? 'c' : score >= 35 ? 'd' : 'e'; }
  function confOf(parts) {
    if (!parts.length) return 0;
    return parts.reduce(function (a, p) { return a + (p.v ? VERIFIED : p.c); }, 0) / parts.length;
  }
  function defaultParts(it) {
    return it.parts.map(function (p) { return { id: p[0], g: p[1], base: p[1], c: p[2], hidden: !p[3], v: false, added: false }; });
  }
  function defaultStats(it, grams) {
    var parts = defaultParts(it), f = grams > 0 && it.grams > 0 ? grams / it.grams : 1;
    parts.forEach(function (p) { p.g = p.g * f; });
    var tot = totals(parts);
    return { kcal: tot.kcal, score: scoreOf(tot) };
  }

  /* step: -1 idle · 0–3 running · 4 awaiting adjustments/confirm · 5 confirmed */
  var state = { step: -1, mode: 'food', tab: 'food', itemId: null, grams: 0, parts: [], pick: { food: 'avocado', meal: 'jollof', product: 'milk' }, note: 'ready', history: [], last: null };
  (function load() {
    try {
      var saved = JSON.parse(global.localStorage.getItem(STORE) || '[]');
      if (Array.isArray(saved)) state.history = saved.filter(function (e) { return e && byId(e.id) && +e.grams > 0; }).slice(0, 8).map(function (e) {
        if (!(+e.kcal >= 0) || !(+e.score > 0)) { var d = defaultStats(byId(e.id), +e.grams); e.kcal = d.kcal; e.score = d.score; }
        return e;
      });
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
  function ingName(id) { return t('scanner.i.' + id); }
  function pct(v) { return Math.round(v * 100); }
  function reduced() { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function flags(c) {
    var out = [];
    if (c.sugar > 22.5) out.push(['sugar', 'warn']);
    if (c.salt > 1.5) out.push(['salt', 'warn']);
    if (c.fat > 17.5) out.push(['fat', 'warn']);
    if (c.fiber >= 3) out.push(['fiber', 'good']);
    return out;
  }
  var PATHS = {
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.2"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-14 14z"/><path d="M5 19 13 11"/>',
    bowl: '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20h6M9 7c0-1.5 1.5-1.5 1.5-3M13.5 7c0-1.5 1.5-1.5 1.5-3"/>',
    barcode: '<path d="M4 6v12M7.5 6v12M11 6v12M14 6v12M17 6v12M20 6v12"/>',
    pipe: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
    result: '<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 5v4h4M12 8v4l2.5 2"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 4 3 19h18L12 4z"/><path d="M12 10v4M12 17h.01"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    tune: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n] + '</svg>';
  }
  /* Animated ring: the fill follows the --p custom property (0–100) of the wrapper. */
  function ring() {
    return '<svg class="vs-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<circle class="vs-ring__bg" cx="50" cy="50" r="42" pathLength="100"/><circle class="vs-ring__fg" cx="50" cy="50" r="42" pathLength="100"/></svg>';
  }

  /* ---- 4. Template ------------------------------------------------------ */
  function busy() { return state.step >= 0 && state.step < 4; }
  function shownItem() { return (state.step >= 0 && byId(state.itemId)) || byId(state.pick[state.tab]) || itemsOf(state.tab)[0]; }
  function hudText() { return t(busy() ? 'scanner.view.busy' : state.step === 4 ? 'scanner.view.done' : 'scanner.view.idle'); }
  function statusText() {
    if (state.note === 'confirm' && state.last) return t('scanner.status.confirm', { name: nameOf(state.last.item), kcal: num(Math.round(state.last.kcal), 0) });
    if (state.note === 'discard') return t('scanner.status.discard');
    if (state.step < 0) return t('scanner.status.ready');
    if (state.step === 0) return t('scanner.status.capture', { mode: t('scanner.mode.' + state.mode) });
    return t('scanner.status.' + STEPS[Math.min(state.step, 4)]);
  }
  function boxes(it) {
    return it.parts.map(function (p, i) {
      if (!p[3]) return '';
      var b = p[3];
      return '<span class="vs-box" style="left:' + b[0] + '%;top:' + b[1] + '%;width:' + b[2] + '%;height:' + b[3] + '%;--i:' + i + '">' +
        '<b>' + esc(ingName(p[0])) + ' · ' + pct(p[2]) + ' %</b></span>';
    }).join('');
  }
  function stageCard() {
    var it = shownItem(), lock = busy();
    var tabs = MODES.map(function (m) {
      return '<button type="button" class="vs-tab" data-vs-act="mode" data-vs-mode="' + m + '" aria-pressed="' + (state.tab === m) + '"' + (lock ? ' disabled' : '') +
        ' title="' + esc(t('scanner.mode.' + m + '.desc')) + '">' + ico(MODE_ICON[m]) + '<span>' + esc(t('scanner.mode.' + m)) + '</span></button>';
    }).join('');
    var thumbs = itemsOf(state.tab).map(function (x) {
      return '<button type="button" class="vs-thumb" data-vs-act="pick" data-vs-id="' + x.id + '" aria-pressed="' + (x.id === it.id) + '"' + (lock ? ' disabled' : '') + '>' +
        '<img src="' + x.img + '" alt="" loading="lazy" decoding="async"><span>' + esc(nameOf(x)) + '</span></button>';
    }).join('');
    return '<article class="card vs-stage">' +
      '<header class="vs-card__head"><span class="vh-ico">' + ico('scan') + '</span><h3>' + esc(t('scanner.view.title')) + '</h3>' +
        '<div class="vs-tabs" role="group" aria-label="' + esc(t('scanner.sample')) + '">' + tabs + '</div></header>' +
      '<div class="vs-view" id="vsView" data-step="' + state.step + '">' +
        '<img src="' + it.img + '" alt="' + esc(t('scanner.view.alt', { name: nameOf(it) })) + '" decoding="async">' +
        '<span class="vs-view__grid" aria-hidden="true"></span><span class="vs-view__laser" aria-hidden="true"></span>' +
        '<span class="vs-view__frame" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
        '<span class="vs-view__boxes" aria-hidden="true">' + boxes(it) + '</span>' +
        '<span class="vs-view__hud"><i aria-hidden="true"></i><span id="vsHud">' + esc(hudText()) + '</span></span>' +
        '<span class="vs-view__name">' + esc(nameOf(it)) + '</span>' +
      '</div>' +
      '<p class="vs-desc">' + esc(t('scanner.view.pick')) + '</p>' +
      '<div class="vs-thumbs">' + thumbs + '</div>' +
      '<button type="button" class="btn primary vs-scan" data-vs-act="scan" data-vs-mode="' + state.tab + '"' + (lock ? ' disabled' : '') + '>' + ico('scan') +
        '<span>' + esc(t(lock ? 'scanner.scanning' : 'scanner.scan')) + '</span></button>' +
      '</article>';
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

  /* Result — static skeleton; every number is filled by paintNutri(). */
  function gauge(key, tone, label) {
    return '<div class="vs-gauge vs-tone--' + tone + '" data-vs-p="' + key + '">' + ring() +
      '<div class="vs-gauge__in"><b data-vs-t="' + key + '.g"></b><small data-vs-t="' + key + '.pc"></small></div>' +
      '<span class="vs-gauge__label">' + esc(label) + '</span></div>';
  }
  function bar(key, label, tone) {
    return '<div class="vs-bar vs-tone--' + tone + '" data-vs-p="' + key + '"><div class="vs-bar__top"><span>' + esc(label) + '</span><b data-vs-t="' + key + '.v"></b></div>' +
      '<div class="vs-bar__track"><i></i></div><small data-vs-t="' + key + '.pc"></small></div>';
  }
  function partRow(p, i, single) {
    var name = ingName(p.id), max = Math.max(Math.round(p.base * 3), p.id === 'cube' ? 20 : p.id === 'oil' || p.id === 'palm' ? 60 : 300);
    var step = max > 400 ? 10 : max <= 60 ? 1 : 5;
    var badge = p.added ? ['added', t('scanner.assist.added')] : p.v ? ['ok', t('scanner.assist.verified')] :
      p.hidden ? ['hidden', t('scanner.assist.hidden', { pct: pct(p.c) })] : ['seen', t('scanner.assist.detected', { pct: pct(p.c) })];
    return '<li class="vs-part' + (p.v ? ' is-ok' : '') + '" data-vs-part="' + i + '">' +
      '<div class="vs-part__top"><span class="vs-part__name">' + esc(name) + '</span>' +
        '<span class="vs-part__badge vs-part__badge--' + badge[0] + '">' + (p.v ? ico('check') : '') + esc(badge[1]) + '</span>' +
        '<output class="vs-part__g" data-vs-g="' + i + '">' + num(p.g, 0) + ' g</output></div>' +
      '<div class="vs-part__ctl"><input type="range" min="' + (step === 1 ? 0 : 5) + '" max="' + max + '" step="' + step + '" value="' + Math.round(p.g) + '" data-vs-grams="' + i + '" aria-label="' + esc(t('scanner.assist.grams', { name: name })) + '">' +
        '<button type="button" class="vs-mini' + (p.v ? ' is-on' : '') + '" data-vs-act="verify" data-vs-i="' + i + '" aria-pressed="' + p.v + '" aria-label="' + esc(t('scanner.assist.confirm', { name: name })) + '" title="' + esc(t('scanner.assist.confirm', { name: name })) + '">' + ico('check') + '</button>' +
        (single ? '' : '<button type="button" class="vs-mini vs-mini--del" data-vs-act="remove" data-vs-i="' + i + '" aria-label="' + esc(t('scanner.assist.remove', { name: name })) + '" title="' + esc(t('scanner.assist.remove', { name: name })) + '">' + ico('close') + '</button>') +
      '</div></li>';
  }
  function partsList() {
    var single = state.parts.length < 2;
    return state.parts.map(function (p, i) { return partRow(p, i, single); }).join('');
  }
  function addOptions() {
    var used = {}; state.parts.forEach(function (p) { used[p.id] = 1; });
    return ADDABLE.filter(function (id) { return !used[id]; }).map(function (id) { return '<option value="' + id + '">' + esc(ingName(id)) + '</option>'; }).join('');
  }
  function resultCard() {
    var it = state.step === 4 ? byId(state.itemId) : null;
    var head = '<header class="vs-card__head"><span class="vh-ico">' + ico('result') + '</span><h3>' + esc(t('scanner.result.title')) + '</h3>' +
      '<span class="pill vs-demo">' + esc(t('scanner.demo')) + '</span></header>';
    if (!it) return '<article class="card vs-result">' + head + '<p class="vs-empty">' + esc(t('scanner.result.empty')) + '</p></article>';
    var nutri =
      '<div class="vs-id"><img class="vs-id__img" src="' + it.img + '" alt=""><div><h4 tabindex="-1" data-vs-focus>' + esc(nameOf(it)) + '</h4>' +
        '<span class="vs-kind">' + esc(t('scanner.mode.' + it.mode)) + ' · <span data-vs-t="weight"></span></span>' +
        '<dl class="vs-meta"><div><dt>' + esc(t('scanner.result.ref')) + '</dt><dd>' + esc(it.ref) + '</dd></div>' +
        (it.barcode ? '<div><dt>' + esc(t('scanner.result.barcode')) + '</dt><dd>' + esc(it.barcode) + '</dd></div>' : '') + '</dl></div></div>' +
      '<div class="vs-top">' +
        '<div class="vs-kcal"><span>' + esc(t('scanner.n.kcal')) + '</span><b><span data-vs-t="kcal"></span> <small>kcal</small></b><small data-vs-t="kcal.ref"></small>' +
          '<div class="vs-kcal__track" data-vs-p="kcal"><i></i></div></div>' +
        '<div class="vs-score" data-vs-p="score" data-vs-grade><div class="vs-score__ring">' + ring() + '<div class="vs-gauge__in"><b data-vs-t="score"></b><small>/100</small></div></div>' +
          '<div class="vs-score__txt"><span>' + esc(t('scanner.score.title')) + '</span><b data-vs-t="score.label"></b><small>' + esc(t('scanner.score.note')) + '</small></div></div>' +
      '</div>' +
      '<div id="vsBalance" class="vsb"></div>' +
      '<h5>' + esc(t('scanner.macro.title')) + '</h5>' +
      '<div class="vs-gauges">' + MACROS.map(function (m) { return gauge(m[0], m[2], t('scanner.n.' + m[0])); }).join('') + '</div>' +
      '<h5>' + esc(t('scanner.limit.title')) + '</h5>' +
      '<div class="vs-bars vs-bars--3">' + LIMITS.map(function (l) { return bar(l[0], t('scanner.n.' + (l[0] === 'sugar' ? 'sugars' : l[0])), l[2]); }).join('') + '</div>' +
      '<h5>' + esc(t('scanner.micro.title')) + '</h5>' +
      '<div class="vs-bars vs-bars--2">' + MICROS.map(function (m) { return bar(m[0], t('scanner.m.' + m[0]), 'lav'); }).join('') + '</div>' +
      '<p class="vs-per">' + esc(t('scanner.micro.note')) + '</p>' +
      '<div class="vs-flags" id="vsFlags"></div>';
    var assist =
      '<div class="vs-assist__head"><div class="vs-conf" data-vs-p="conf" data-vs-level>' + ring() + '<div class="vs-gauge__in"><b data-vs-t="conf"></b></div></div>' +
        '<div><h5>' + ico('tune') + esc(t('scanner.assist.title')) + '</h5><span class="vs-conf__label">' + esc(t('scanner.result.confidence')) + '</span>' +
        '<span class="vs-conf__state" data-vs-t="conf.state"></span></div></div>' +
      '<p class="vs-assist__sub">' + esc(t('scanner.assist.sub')) + '</p>' +
      '<div class="vs-size" role="group" aria-label="' + esc(t('scanner.assist.size')) + '"><span>' + esc(t('scanner.assist.size')) + '</span>' +
        [['s', 0.75], ['m', 1], ['l', 1.3]].map(function (s) { return '<button type="button" class="vs-chip" data-vs-act="size" data-vs-f="' + s[1] + '">' + esc(t('scanner.assist.' + s[0])) + '</button>'; }).join('') + '</div>' +
      '<ul class="vs-parts" id="vsParts">' + partsList() + '</ul>' +
      '<p class="vs-assist__count"><span data-vs-t="conf.count"></span><button type="button" class="vs-chip" data-vs-act="verifyall">' + ico('check') + esc(t('scanner.assist.all')) + '</button></p>' +
      '<div class="vs-add"><label for="vsAdd">' + esc(t('scanner.assist.add')) + '</label><div><select id="vsAdd">' + addOptions() + '</select>' +
        '<button type="button" class="btn secondary" data-vs-act="add">' + ico('plus') + '<span>' + esc(t('scanner.assist.addbtn')) + '</span></button></div></div>' +
      '<div class="vs-actions"><button type="button" class="btn primary" data-vs-act="confirm">' + ico('check') + '<span>' + esc(t('scanner.result.confirm')) + '</span></button>' +
        '<button type="button" class="btn secondary" data-vs-act="discard">' + esc(t('scanner.result.discard')) + '</button></div>';
    return '<article class="card vs-result is-on">' + head +
      '<div class="vs-res"><div class="vs-nutri">' + nutri + '</div><aside class="vs-assist">' + assist + '</aside></div></article>';
  }
  function historyCard() {
    var total = 0;
    var rows = state.history.map(function (e) {
      var it = byId(e.id); total += +e.kcal || 0;
      return '<li><img class="vs-hist__img" src="' + it.img + '" alt="" loading="lazy"><div><span>' + esc(nameOf(it)) + '</span><small>' +
        esc(t('scanner.hist.meta', { g: num(e.grams, 0), score: num(e.score, 0), time: time(e.t) })) + '</small></div><b>' + num(Math.round(e.kcal), 0) + ' kcal</b></li>';
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
      stageCard() + '<div class="vs-side">' + pipeCard() + historyCard() + '</div>' + resultCard() +
      '</div>';
  }

  /* ---- 5. Render ---------------------------------------------------------- */
  function selectorOf(el) {
    if (!el || !el.getAttribute) return null;
    if (el.id) return '#' + el.id;
    var act = el.getAttribute('data-vs-act');
    if (act) {
      var sel = '[data-vs-act="' + act + '"]';
      ['data-vs-mode', 'data-vs-id', 'data-vs-i', 'data-vs-f'].forEach(function (a) { if (el.getAttribute(a) != null) sel += '[' + a + '="' + el.getAttribute(a) + '"]'; });
      return sel;
    }
    if (el.getAttribute('data-vs-grams') != null) return '[data-vs-grams="' + el.getAttribute('data-vs-grams') + '"]';
    return null;
  }
  function focusOn(sel, scroll) {
    var target = sel ? root.querySelector(sel) : null;
    if (target && !target.disabled) { try { target.focus({ preventScroll: !scroll }); } catch (e) { target.focus(); } }
  }
  function render(focusSel) {
    var active = doc.activeElement;
    var keep = !focusSel && active && root.contains(active) ? selectorOf(active) : null;
    root.innerHTML = template();
    if (state.step === 4) paintNutri(true);
    focusOn(focusSel || keep, !!focusSel);
  }
  function paintPipe() {
    var w = doc.getElementById('scanWizard'), s = doc.getElementById('scanStatus'), v = doc.getElementById('vsView'), h = doc.getElementById('vsHud');
    if (w) w.innerHTML = wizard();
    if (s) s.textContent = statusText();
    if (v) v.setAttribute('data-step', state.step);
    if (h) h.textContent = hudText();
  }
  function setText(key, value) {
    var list = root.querySelectorAll('[data-vs-t="' + key + '"]');
    for (var i = 0; i < list.length; i++) list[i].textContent = value;
  }
  function setPct(key, value) {
    var el = root.querySelector('[data-vs-p="' + key + '"]');
    if (el) el.style.setProperty('--p', Math.max(0, Math.min(100, value)).toFixed(1));
    return el;
  }
  var tweens = {};
  function countTo(key, to, digits, animate) {
    if (tweens[key]) { global.cancelAnimationFrame(tweens[key]); tweens[key] = 0; }
    if (!animate || reduced() || !global.requestAnimationFrame) { setText(key, num(to, digits)); return; }
    var t0 = null;
    (function tick(now) {
      if (t0 == null) t0 = now;
      var k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      setText(key, num(to * e, digits));
      tweens[key] = k < 1 ? global.requestAnimationFrame(tick) : 0;
    })(global.performance && global.performance.now ? global.performance.now() : 0);
  }
  function stats() {
    var tot = totals(state.parts);
    return { tot: tot, score: scoreOf(tot), conf: confOf(state.parts) };
  }
  /* Fills every figure of the result card. intro=true animates gauges from zero. */
  function paintNutri(intro) {
    if (state.step !== 4 || !root.querySelector('.vs-res')) return;
    var st = stats(), tot = st.tot, energy = tot.protein * 4 + tot.carbs * 4 + tot.fat * 9 || 1;
    state.grams = Math.round(tot.grams);
    var apply = function () {
      setPct('kcal', tot.kcal / 2000 * 100);
      MACROS.forEach(function (m) { setPct(m[0], tot[m[0]] * m[1] / energy * 100); });
      LIMITS.forEach(function (l) { setPct(l[0], tot[l[0]] / l[1] * 100); });
      MICROS.forEach(function (m) { setPct(m[0], tot[m[0]] / m[1] * 100); });
      var sc = setPct('score', st.score); if (sc) sc.setAttribute('data-vs-grade', gradeOf(st.score));
      var cf = setPct('conf', st.conf * 100); if (cf) cf.setAttribute('data-vs-level', st.conf >= 0.95 ? 'high' : st.conf >= 0.88 ? 'mid' : 'low');
    };
    if (intro && !reduced() && global.requestAnimationFrame) global.requestAnimationFrame(function () { global.requestAnimationFrame(apply); }); else apply();

    countTo('kcal', Math.round(tot.kcal), 0, intro);
    countTo('score', st.score, 0, intro);
    setText('conf', pct(st.conf) + ' %');
    setText('weight', t('scanner.weight') + ' ' + num(tot.grams, 0) + ' g');
    setText('kcal.ref', t('scanner.kcal.ref', { pct: num(tot.kcal / 20, 0) }));
    setText('score.label', t('scanner.score.' + gradeOf(st.score)));
    MACROS.forEach(function (m) {
      setText(m[0] + '.g', num(tot[m[0]], 1) + ' g');
      setText(m[0] + '.pc', t('scanner.macro.energy', { pct: num(tot[m[0]] * m[1] / energy * 100, 0) }));
    });
    LIMITS.forEach(function (l) {
      setText(l[0] + '.v', num(tot[l[0]], l[0] === 'salt' ? 2 : 1) + ' g');
      setText(l[0] + '.pc', t('scanner.limit.of', { pct: num(tot[l[0]] / l[1] * 100, 0), ref: num(l[1], 0) + ' g' }));
    });
    MICROS.forEach(function (m) {
      var v = tot[m[0]];
      setText(m[0] + '.v', num(v, v >= 10 ? 0 : v >= 1 ? 1 : 2) + ' ' + m[2]);
      setText(m[0] + '.pc', num(v / m[1] * 100, 0) + ' %');
    });
    var n = state.parts.filter(function (p) { return p.v; }).length;
    setText('conf.count', t('scanner.assist.count', { n: n, total: state.parts.length }));
    setText('conf.state', t('scanner.assist.' + (st.conf >= 0.95 ? 'high' : st.conf >= 0.88 ? 'mid' : 'low')));
    var fl = flags(per100(tot)), box = doc.getElementById('vsFlags');
    if (box) box.innerHTML = fl.length ? fl.map(function (f) { return '<span class="vs-flag vs-flag--' + f[1] + '">' + ico(f[1] === 'good' ? 'check' : 'alert') + esc(t('scanner.flag.' + f[0])) + '</span>'; }).join('') +
      '<small>' + esc(t('scanner.flag.note')) + '</small>' : '';
    var bal = global.NutriBentoViews && global.NutriBentoViews.scannerBalance;   /* balanced or not + what to add (views/view-scanner-balance.js) */
    if (bal) bal.paint(tot);
  }
  function paintParts(focusSel) {
    var list = doc.getElementById('vsParts'), add = doc.getElementById('vsAdd');
    var keep = focusSel || (root.contains(doc.activeElement) ? selectorOf(doc.activeElement) : null);
    if (list) list.innerHTML = partsList();
    if (add) add.innerHTML = addOptions();
    paintNutri(false);
    focusOn(keep, false);
  }

  /* ---- 6. Actions --------------------------------------------------------- */
  var timer = null;
  function stop() { if (timer) { global.clearInterval(timer); timer = null; } }
  function start(mode, id) {
    var it = byId(id) || itemsOf(mode)[0];
    stop();
    state.mode = mode; state.tab = mode; state.itemId = it.id; state.grams = it.grams; state.parts = defaultParts(it);
    state.pick[mode] = it.id; state.step = 0; state.note = '';
    if (reduced()) { state.step = 4; render('[data-vs-focus]'); return; }
    render();
    timer = global.setInterval(function () {
      state.step += 1;
      if (state.step < 4) { paintPipe(); return; }
      stop(); state.step = 4;
      render(root.contains(doc.activeElement) ? '[data-vs-focus]' : null);
    }, 780);
  }
  function confirm() {
    var it = byId(state.itemId); if (state.step !== 4 || !it) return;
    var st = stats();
    var bal = global.NutriBentoViews && global.NutriBentoViews.scannerBalance;
    if (bal && !bal.allow(st.tot)) return;   /* the meal can only be confirmed once it is balanced */
    state.history.unshift({ t: Date.now(), id: it.id, grams: Math.round(st.tot.grams), kcal: Math.round(st.tot.kcal), score: st.score, conf: Math.round(st.conf * 100) });
    state.history = state.history.slice(0, 8);
    state.last = { item: it, grams: Math.round(st.tot.grams), kcal: st.tot.kcal };
    state.step = -1; state.note = 'confirm';
    save(); render('[data-vs-act="scan"]');
    if (typeof global.toast === 'function') { try { global.toast(statusText()); } catch (e) { /* ignore */ } }
  }
  function discard() {
    stop();
    state.step = -1; state.note = 'discard';
    render('[data-vs-act="scan"]');
  }
  function partAt(el) { var i = +el.getAttribute('data-vs-i'); return state.step === 4 && state.parts[i] ? i : -1; }

  root.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-vs-act]') : null;
    if (!el || !root.contains(el) || el.disabled) return;
    var act = el.getAttribute('data-vs-act'), i;
    if (act === 'scan') { var m = el.getAttribute('data-vs-mode'); start(m, state.pick[m]); }
    else if (act === 'mode') {
      if (busy()) return;
      if (state.step === 4) { state.step = -1; state.note = 'discard'; }
      state.tab = el.getAttribute('data-vs-mode'); render();
    }
    else if (act === 'pick') {
      var id = el.getAttribute('data-vs-id'), it = byId(id);
      if (busy() || !it) return;
      if (state.step === 4) { state.step = -1; state.note = 'discard'; }
      state.pick[it.mode] = id; state.tab = it.mode; render();
    }
    else if (act === 'verify') { i = partAt(el); if (i < 0) return; state.parts[i].v = !state.parts[i].v || state.parts[i].added; paintParts(); }
    else if (act === 'verifyall') { if (state.step !== 4) return; state.parts.forEach(function (p) { p.v = true; }); paintParts(); }
    else if (act === 'remove') { i = partAt(el); if (i < 0 || state.parts.length < 2) return; state.parts.splice(i, 1); paintParts('#vsAdd'); }
    else if (act === 'add') {
      var sel = doc.getElementById('vsAdd'), nid = sel && sel.value;
      if (state.step !== 4 || !ING[nid]) return;
      var g = nid === 'cube' ? 5 : nid === 'oil' || nid === 'palm' ? 10 : 50;
      state.parts.push({ id: nid, g: g, base: g, c: VERIFIED, hidden: false, v: true, added: true });
      paintParts('[data-vs-grams="' + (state.parts.length - 1) + '"]');
    }
    else if (act === 'size') {
      if (state.step !== 4) return;
      var f = +el.getAttribute('data-vs-f') || 1;
      state.parts.forEach(function (p) { if (!p.added) p.g = Math.round(p.base * f); });
      paintParts();
    }
    else if (act === 'confirm') confirm();
    else if (act === 'discard') discard();
    else if (act === 'clear') { state.history = []; save(); render('[data-vs-act="scan"]'); }
  });
  /* Moving a grams slider is a manual correction: the ingredient becomes verified. */
  root.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el || !el.getAttribute || el.getAttribute('data-vs-grams') == null || state.step !== 4) return;
    var i = +el.getAttribute('data-vs-grams'), p = state.parts[i]; if (!p) return;
    p.g = Math.max(0, +el.value || 0);
    var out = root.querySelector('[data-vs-g="' + i + '"]'); if (out) out.textContent = num(p.g, 0) + ' g';
    if (!p.v) { p.v = true; paintParts(); } else paintNutri(false);
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
    /* used by views/view-scanner-balance.js */
    food: function (id) { var r = ING[id]; return r ? { kcal: r[0], protein: r[1], carbs: r[2], fat: r[4] } : null; },
    totals: function () { return state.step === 4 ? totals(state.parts) : null; },
    addPart: function (id, g) {
      if (state.step !== 4 || !ING[id] || !(g > 0)) return false;
      var p = state.parts.filter(function (x) { return x.id === id; })[0];
      if (p) { p.g = Math.round(p.g + g); p.v = true; }
      else state.parts.push({ id: id, g: g, base: g, c: VERIFIED, hidden: false, v: true, added: true });
      paintParts('#vsBalance [data-vsb-first], #vsBalance [data-vsb-focus]');
      return true;
    },
    state: function () {
      var st = state.step === 4 ? stats() : null;
      return { step: state.step, mode: state.mode, itemId: state.itemId, grams: state.grams, note: state.note, history: state.history.slice(),
        parts: state.parts.map(function (p) { return { id: p.id, grams: p.g, verified: p.v }; }),
        confidence: st ? st.conf : null, score: st ? st.score : null, kcal: st ? st.tot.kcal : null };
    }
  };
})(window);
