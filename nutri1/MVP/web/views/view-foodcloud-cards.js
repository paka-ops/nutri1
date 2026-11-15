/* ==========================================================================
   NUTRI.N°1 — African dish cards inside the Food Cloud view  (TASK 5)
   Mounts into #vfCards (placeholder emitted by views/view-foodcloud.js):
     · an interactive grid of African dishes (sortable by any of the six ratings)
     · a dialog styled as a football "player card": overall rating 0–99 and rank,
       dish photo and origin, animated hexagon radar and six progress bars.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), views/view-foodcloud.js
   Styles     : styles/views.css  (.vc-*, block 9b)
   Assets     : assets/dishes/<id>.jpg  (AI-generated dish photos)
   Note       : demonstration only. Per-serving figures are rounded, hand-entered
                estimates (not laboratory values). The six ratings and the overall
                rating are a playful scale computed with the formulas of section 3;
                they are not a medical or regulatory score.
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
      'vc.kicker': 'AFRICAN DISHES', 'vc.title': 'Dish cards', 'vc.sub': 'Tap a dish to reveal its nutrition card, rated like a football player.',
      'vc.badge': 'Indicative ratings', 'vc.sort': 'Rank by', 'vc.photo': 'Photo of {name}', 'vc.open': 'Open the card of {name}, rated {n}',
      'vc.s.ovr': 'Overall', 'vc.s.ene': 'Calories / Energy', 'vc.s.pro': 'Protein', 'vc.s.glu': 'Carbs / GI', 'vc.s.lip': 'Fats', 'vc.s.fib': 'Fibre', 'vc.s.vit': 'Vitamins & Minerals',
      'vc.a.ovr': 'OVR', 'vc.a.ene': 'ENE', 'vc.a.pro': 'PRO', 'vc.a.glu': 'CGI', 'vc.a.lip': 'FAT', 'vc.a.fib': 'FIB', 'vc.a.vit': 'VIT',
      'vc.r.icon': 'Legend', 'vc.r.gold': 'Gold', 'vc.r.silver': 'Silver', 'vc.r.bronze': 'Bronze',
      'vc.t.cer': 'Cereal dish', 'vc.t.tub': 'Tuber dish', 'vc.t.leg': 'Legume dish', 'vc.t.sau': 'Sauce dish', 'vc.t.fru': 'Fruit & plantain',
      'vc.p.cer': 'CER', 'vc.p.tub': 'TUB', 'vc.p.leg': 'LEG', 'vc.p.sau': 'SAU', 'vc.p.fru': 'PLA',
      'vc.d.pate': 'Maize dough & leaf sauce', 'vc.d.foufou': 'Yam foufou & light soup', 'vc.d.jollof': 'Jollof rice', 'vc.d.attieke': 'Attiéké & grilled fish', 'vc.d.fonio': 'Fonio with vegetables',
      'vc.d.niebe': 'Niébé in red oil', 'vc.d.arachide': 'Groundnut sauce & rice', 'vc.d.thieb': 'Thiéboudienne', 'vc.d.plantain': 'Boiled ripe plantain', 'vc.d.okra': 'Okra sauce & dough',
      'vc.o.pate': 'Togo · Benin', 'vc.o.foufou': 'Togo · Ghana · Côte d’Ivoire', 'vc.o.jollof': 'Nigeria · Ghana · Senegal', 'vc.o.attieke': 'Côte d’Ivoire', 'vc.o.fonio': 'Guinea · Mali · Senegal',
      'vc.o.niebe': 'Burkina Faso · Togo · Benin', 'vc.o.arachide': 'Mali · Senegal', 'vc.o.thieb': 'Senegal', 'vc.o.plantain': 'Côte d’Ivoire · Cameroon · Ghana', 'vc.o.okra': 'Benin · Togo · Nigeria',
      'vc.m.pate': 'Iron, folate and provitamin A from the leaves', 'vc.m.foufou': 'Potassium from yam; few vitamins', 'vc.m.jollof': 'Lycopene from tomato; modest minerals', 'vc.m.attieke': 'Iodine, vitamin D and B12 from fish',
      'vc.m.fonio': 'Iron, zinc and magnesium; sulphur amino acids', 'vc.m.niebe': 'Folate, iron, magnesium; provitamin A from red oil', 'vc.m.arachide': 'Niacin, vitamin E and magnesium from groundnut',
      'vc.m.thieb': 'Fish plus carrot, cabbage and cassava: broad coverage', 'vc.m.plantain': 'Potassium and provitamin A', 'vc.m.okra': 'Folate, vitamin C and calcium from okra',
      'vc.card': 'Nutrition card', 'vc.serving': 'Serving {n} g', 'vc.origin': 'Origin', 'vc.radar': 'Hexagon of the six ratings', 'vc.stats': 'Ratings',
      'vc.f.ene': '{n} kcal per serving', 'vc.f.pro': '{n} g protein', 'vc.f.glu': '{c} g carbohydrate · GI {gi}', 'vc.f.lip': '{f} g fat, of which {s} g saturated', 'vc.f.fib': '{n} g fibre',
      'vc.prev': 'Previous dish', 'vc.next': 'Next dish', 'vc.close': 'Close', 'vc.pos': '{i} / {n}',
      'vc.how': 'How the rating works',
      'vc.how.d': 'Energy and protein rise with the amount per serving; Carbs/GI rewards a low glycaemic index; Fats rewards a balanced fat share with little saturated fat; Fibre rises with grams; Vitamins & Minerals is an editorial estimate. Overall = 45 + 0.55 × the weighted average.',
      'vc.note': 'Rounded, hand-entered estimates per serving — recipes vary a lot between households. Playful scale, not a medical score.'
    },
    fr: {
      'vc.kicker': 'PLATS AFRICAINS', 'vc.title': 'Cartes des plats', 'vc.sub': 'Touchez un plat pour révéler sa carte nutritionnelle, notée comme un joueur de football.',
      'vc.badge': 'Notes indicatives', 'vc.sort': 'Classer par', 'vc.photo': 'Photo : {name}', 'vc.open': 'Ouvrir la carte de {name}, note {n}',
      'vc.s.ovr': 'Général', 'vc.s.ene': 'Calories / Énergie', 'vc.s.pro': 'Protéines', 'vc.s.glu': 'Glucides / IG', 'vc.s.lip': 'Lipides', 'vc.s.fib': 'Fibres', 'vc.s.vit': 'Vitamines & Minéraux',
      'vc.a.ovr': 'GEN', 'vc.a.ene': 'ENE', 'vc.a.pro': 'PRO', 'vc.a.glu': 'GLU', 'vc.a.lip': 'LIP', 'vc.a.fib': 'FIB', 'vc.a.vit': 'VIT',
      'vc.r.icon': 'Légende', 'vc.r.gold': 'Or', 'vc.r.silver': 'Argent', 'vc.r.bronze': 'Bronze',
      'vc.t.cer': 'Plat de céréales', 'vc.t.tub': 'Plat de tubercules', 'vc.t.leg': 'Plat de légumineuses', 'vc.t.sau': 'Plat en sauce', 'vc.t.fru': 'Fruit & plantain',
      'vc.p.cer': 'CER', 'vc.p.tub': 'TUB', 'vc.p.leg': 'LEG', 'vc.p.sau': 'SAU', 'vc.p.fru': 'PLA',
      'vc.d.pate': 'Pâte de maïs & sauce feuilles', 'vc.d.foufou': 'Foufou d’igname & sauce claire', 'vc.d.jollof': 'Riz Jollof / riz au gras', 'vc.d.attieke': 'Attiéké & poisson braisé', 'vc.d.fonio': 'Fonio aux légumes',
      'vc.d.niebe': 'Niébé à l’huile rouge', 'vc.d.arachide': 'Sauce arachide & riz', 'vc.d.thieb': 'Thiéboudienne', 'vc.d.plantain': 'Banane plantain mûre bouillie', 'vc.d.okra': 'Sauce gombo & pâte',
      'vc.o.pate': 'Togo · Bénin', 'vc.o.foufou': 'Togo · Ghana · Côte d’Ivoire', 'vc.o.jollof': 'Nigéria · Ghana · Sénégal', 'vc.o.attieke': 'Côte d’Ivoire', 'vc.o.fonio': 'Guinée · Mali · Sénégal',
      'vc.o.niebe': 'Burkina Faso · Togo · Bénin', 'vc.o.arachide': 'Mali · Sénégal', 'vc.o.thieb': 'Sénégal', 'vc.o.plantain': 'Côte d’Ivoire · Cameroun · Ghana', 'vc.o.okra': 'Bénin · Togo · Nigéria',
      'vc.m.pate': 'Fer, folates et provitamine A des feuilles', 'vc.m.foufou': 'Potassium de l’igname ; peu de vitamines', 'vc.m.jollof': 'Lycopène de la tomate ; minéraux modestes', 'vc.m.attieke': 'Iode, vitamines D et B12 du poisson',
      'vc.m.fonio': 'Fer, zinc et magnésium ; acides aminés soufrés', 'vc.m.niebe': 'Folates, fer, magnésium ; provitamine A de l’huile rouge', 'vc.m.arachide': 'Niacine, vitamine E et magnésium de l’arachide',
      'vc.m.thieb': 'Poisson, carotte, chou et manioc : couverture large', 'vc.m.plantain': 'Potassium et provitamine A', 'vc.m.okra': 'Folates, vitamine C et calcium du gombo',
      'vc.card': 'Carte nutritionnelle', 'vc.serving': 'Portion {n} g', 'vc.origin': 'Origine', 'vc.radar': 'Hexagone des six notes', 'vc.stats': 'Notes',
      'vc.f.ene': '{n} kcal par portion', 'vc.f.pro': '{n} g de protéines', 'vc.f.glu': '{c} g de glucides · IG {gi}', 'vc.f.lip': '{f} g de lipides, dont {s} g saturés', 'vc.f.fib': '{n} g de fibres',
      'vc.prev': 'Plat précédent', 'vc.next': 'Plat suivant', 'vc.close': 'Fermer', 'vc.pos': '{i} / {n}',
      'vc.how': 'Comment la note est calculée',
      'vc.how.d': 'Énergie et Protéines montent avec la quantité par portion ; Glucides/IG récompense un index glycémique bas ; Lipides récompense une part de graisses équilibrée et peu de saturés ; Fibres monte avec les grammes ; Vitamines & Minéraux est une estimation éditoriale. Général = 45 + 0,55 × la moyenne pondérée.',
      'vc.note': 'Estimations arrondies saisies à la main, par portion — les recettes varient beaucoup d’un foyer à l’autre. Échelle ludique, pas un score médical.'
    }
  });

  /* ---- 2. Data (per serving, indicative) ----------------------------------- */
  /* id, type, serving g, kcal, protein g, carbs g, fat g, saturated g, fibre g, GI, vitamins & minerals (editorial 0–99) */
  var DISHES = [
    ['pate',     'cer', 450, 520, 22,  78, 12, 3,   9,   68, 78],
    ['foufou',   'tub', 500, 610, 24,  105, 9, 2.5, 7,   72, 55],
    ['jollof',   'cer', 350, 570, 14,  88, 17, 4,   4,   70, 48],
    ['attieke',  'tub', 400, 560, 30,  70, 16, 3,   5,   62, 62],
    ['fonio',    'cer', 300, 380, 9,   68, 7,  1,   6,   57, 60],
    ['niebe',    'leg', 300, 420, 22,  52, 13, 5,   14,  40, 80],
    ['arachide', 'sau', 450, 720, 32,  75, 32, 7,   6,   60, 58],
    ['thieb',    'cer', 450, 680, 30,  85, 22, 4.5, 6,   66, 70],
    ['plantain', 'fru', 200, 240, 2.6, 62, 0.6, 0.2, 4.6, 55, 50],
    ['okra',     'sau', 450, 480, 24,  66, 13, 4,   10,  62, 74]
  ].map(function (r) { return { id: r[0], type: r[1], g: r[2], kcal: r[3], protein: r[4], carbs: r[5], fat: r[6], sat: r[7], fiber: r[8], gi: r[9], micro: r[10] }; });
  var STATS = ['ene', 'pro', 'glu', 'lip', 'fib', 'vit'];
  var WEIGHTS = { ene: 0.12, pro: 0.2, glu: 0.18, lip: 0.14, fib: 0.16, vit: 0.2 };

  /* ---- 3. Rating model ------------------------------------------------------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, Math.round(v))); }
  DISHES.forEach(function (d) {
    var fatShare = d.fat * 9 / d.kcal * 100;
    d.s = {
      ene: clamp(d.kcal / 7.5, 1, 99),                               /* 742 kcal or more per serving = 99 */
      pro: clamp(d.protein / 35 * 99, 1, 99),                        /* 35 g per serving = 99 */
      glu: clamp(99 - (d.gi - 35) * 1.3, 20, 99),                    /* lower GI = higher rating */
      lip: clamp(99 - Math.abs(fatShare - 27) * 1.5 - d.sat * 3, 20, 99),   /* ~27 % energy from fat, little saturated */
      fib: clamp(d.fiber / 14 * 99, 1, 99),                          /* 14 g per serving = 99 */
      vit: d.micro
    };
    var mean = 0; STATS.forEach(function (k) { mean += WEIGHTS[k] * d.s[k]; });
    d.s.ovr = clamp(45 + 0.55 * mean, 1, 99);
    d.rank = d.s.ovr >= 85 ? 'icon' : d.s.ovr >= 78 ? 'gold' : d.s.ovr >= 70 ? 'silver' : 'bronze';
  });
  function dish(id) { for (var i = 0; i < DISHES.length; i++) if (DISHES[i].id === id) return DISHES[i]; return null; }

  var state = { sort: 'ovr', open: null, opener: null };

  /* ---- 4. Helpers --------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }); } catch (e) { return String(v); } }
  function reduced() { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function dname(d) { return t('vc.d.' + d.id); }
  function img(d, cls) { return '<img class="' + cls + '" src="assets/dishes/' + d.id + '.jpg" alt="' + esc(t('vc.photo', { name: dname(d) })) + '" loading="lazy" decoding="async" width="720" height="720">'; }
  var PATHS = {
    cards: '<rect x="4" y="6" width="11" height="15" rx="2.5"/><path d="M9 3h8.5A2.500 2.500 0 0 1 20 5.500V17"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', left: '<path d="m14.5 5-7 7 7 7"/>', right: '<path d="m9.5 5 7 7-7 7"/>',
    pin: '<path d="M12 21s7-6.2 7-11.500A7 7 0 0 0 5 9.500C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function sorted() { return DISHES.slice().sort(function (a, b) { return b.s[state.sort] - a.s[state.sort] || b.s.ovr - a.s.ovr; }); }

  /* ---- 5. Grid ---------------------------------------------------------------- */
  function tilesHtml() {
    return sorted().map(function (d, i) {
      return '<li style="--i:' + i + '"><button type="button" class="vc-tile vc-rank--' + d.rank + '" data-vc-open="' + d.id + '" aria-label="' + esc(t('vc.open', { name: dname(d), n: d.s.ovr })) + '">' +
        img(d, 'vc-tile__img') +
        '<span class="vc-tile__ovr"><b>' + d.s[state.sort] + '</b><small>' + esc(t('vc.a.' + state.sort)) + '</small></span>' +
        '<span class="vc-tile__rank">' + esc(t('vc.r.' + d.rank)) + '</span>' +
        '<span class="vc-tile__txt"><b>' + esc(dname(d)) + '</b><small>' + esc(t('vc.o.' + d.id)) + '</small></span></button></li>';
    }).join('');
  }
  function gridHtml() {
    var chips = ['ovr'].concat(STATS).map(function (k) {
      return '<button type="button" class="vc-chip" data-vc-sort="' + k + '" aria-pressed="' + (state.sort === k) + '">' + esc(t('vc.s.' + k)) + '</button>';
    }).join('');
    return '<section class="card vc-card" aria-labelledby="vcTitle"><header class="vc-head"><span class="vh-ico">' + ico('cards') + '</span>' +
        '<div><span class="vc-kicker">' + esc(t('vc.kicker')) + '</span><h3 id="vcTitle">' + esc(t('vc.title')) + '</h3><p>' + esc(t('vc.sub')) + '</p></div>' +
        '<span class="pill vc-badge">' + esc(t('vc.badge')) + '</span></header>' +
      '<div class="vc-chips" role="group" aria-label="' + esc(t('vc.sort')) + '">' + chips + '</div>' +
      '<ul class="vc-tiles" id="vcTiles">' + tilesHtml() + '</ul>' +
      '<p class="vc-note">' + ico('info') + '<span>' + esc(t('vc.note')) + '</span></p></section>';
  }

  /* ---- 6. Player card dialog --------------------------------------------------- */
  function hexHtml(d) {
    var cx = 150, cy = 140, R = 96, n = STATS.length;
    var pt = function (i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    var poly = function (r) { var s = []; for (var i = 0; i < n; i++) { var q = pt(i, r); s.push(q[0].toFixed(1) + ',' + q[1].toFixed(1)); } return s.join(' '); };
    var rings = [0.25, 0.5, 0.75, 1].map(function (k) { return '<polygon class="vc-hex__ring" points="' + poly(R * k) + '"/>'; }).join('');
    var spokes = '', labels = '', dots = '';
    var shape = STATS.map(function (k, i) {
      var q = pt(i, R * d.s[k] / 99), e = pt(i, R), l = pt(i, R + 20);
      spokes += '<line class="vc-hex__ring" x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '"/>';
      dots += '<circle class="vc-hex__dot" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="4" style="--i:' + i + '"/>';
      labels += '<text class="vc-hex__lab" x="' + l[0].toFixed(1) + '" y="' + (l[1] - 2).toFixed(1) + '" text-anchor="middle">' + esc(t('vc.a.' + k)) + '</text>' +
        '<text class="vc-hex__val" x="' + l[0].toFixed(1) + '" y="' + (l[1] + 14).toFixed(1) + '" text-anchor="middle">' + d.s[k] + '</text>';
      return q[0].toFixed(1) + ',' + q[1].toFixed(1);
    }).join(' ');
    return '<svg class="vc-hex" viewBox="0 0 300 290" role="img" aria-label="' + esc(t('vc.radar')) + '">' + rings + spokes +
      '<g class="vc-hex__grow"><polygon class="vc-hex__shape" points="' + shape + '"/>' + dots + '</g>' + labels + '</svg>';
  }
  function fact(d, k) {
    if (k === 'ene') return t('vc.f.ene', { n: num(d.kcal) });
    if (k === 'pro') return t('vc.f.pro', { n: num(d.protein) });
    if (k === 'glu') return t('vc.f.glu', { c: num(d.carbs), gi: d.gi });
    if (k === 'lip') return t('vc.f.lip', { f: num(d.fat), s: num(d.sat) });
    if (k === 'fib') return t('vc.f.fib', { n: num(d.fiber) });
    return t('vc.m.' + d.id);
  }
  function dialogHtml(d) {
    var list = sorted(), idx = list.indexOf(d);
    var mini = STATS.map(function (k) { return '<li><b>' + d.s[k] + '</b><span>' + esc(t('vc.a.' + k)) + '</span></li>'; }).join('');
    var bars = STATS.map(function (k, i) {
      var lvl = d.s[k] >= 75 ? 'hi' : d.s[k] >= 50 ? 'mid' : 'lo';
      return '<li class="vc-stat vc-stat--' + lvl + '" style="--i:' + i + '"><div class="vc-stat__top"><span>' + esc(t('vc.s.' + k)) + '</span><b>' + d.s[k] + '</b></div>' +
        '<i class="vc-bar"><i style="--w:' + d.s[k] / 99 * 100 + '%"></i></i><small>' + esc(fact(d, k)) + '</small></li>';
    }).join('');
    return '<div class="vc-overlay" data-vc-overlay><div class="vc-dialog vc-rank--' + d.rank + '" role="dialog" aria-modal="true" aria-labelledby="vcDlgTitle" tabindex="-1">' +
      '<div class="vc-dialog__bar"><span class="vc-dialog__pos">' + esc(t('vc.card')) + ' · ' + esc(t('vc.pos', { i: idx + 1, n: list.length })) + '</span>' +
        '<button type="button" class="vc-ibtn" data-vc-nav="-1" aria-label="' + esc(t('vc.prev')) + '">' + ico('left') + '</button>' +
        '<button type="button" class="vc-ibtn" data-vc-nav="1" aria-label="' + esc(t('vc.next')) + '">' + ico('right') + '</button>' +
        '<button type="button" class="vc-ibtn vc-x" data-vc-close aria-label="' + esc(t('vc.close')) + '">' + ico('x') + '</button></div>' +
      '<div class="vc-dialog__body">' +
        '<div class="vc-fut-wrap"><div class="vc-fut" id="vcFut">' +
          '<div class="vc-fut__shine" aria-hidden="true"></div>' +
          '<div class="vc-fut__top"><div class="vc-fut__ovr"><b id="vcOvr" data-to="' + d.s.ovr + '">' + d.s.ovr + '</b><span>' + esc(t('vc.p.' + d.type)) + '</span><i aria-hidden="true"></i><em>' + esc(t('vc.r.' + d.rank)) + '</em></div>' +
            '<div class="vc-fut__pic">' + img(d, 'vc-fut__img') + '</div></div>' +
          '<h3 class="vc-fut__name" id="vcDlgTitle">' + esc(dname(d)) + '</h3>' +
          '<p class="vc-fut__origin">' + ico('pin') + '<span>' + esc(t('vc.o.' + d.id)) + '</span></p>' +
          '<ul class="vc-fut__stats">' + mini + '</ul>' +
          '<p class="vc-fut__foot">' + esc(t('vc.t.' + d.type)) + ' · ' + esc(t('vc.serving', { n: d.g })) + '</p>' +
        '</div></div>' +
        '<div class="vc-detail"><div class="vc-detail__hex">' + hexHtml(d) + '</div>' +
          '<ul class="vc-stats" aria-label="' + esc(t('vc.stats')) + '">' + bars + '</ul></div>' +
      '</div>' +
      '<details class="vc-how"><summary>' + ico('info') + '<span>' + esc(t('vc.how')) + '</span></summary><p>' + esc(t('vc.how.d')) + '</p></details>' +
      '</div></div>';
  }

  /* ---- 7. Render ---------------------------------------------------------------- */
  var host = doc.createElement('div'); host.className = 'vc-host';
  var gridEl = doc.createElement('div'), modalEl = doc.createElement('div');
  host.appendChild(gridEl); host.appendChild(modalEl);
  var raf = 0;
  function countUp() {
    var el = doc.getElementById('vcOvr'); if (!el) return;
    var to = +el.getAttribute('data-to');
    if (reduced() || !global.requestAnimationFrame) { el.textContent = to; return; }
    var t0 = 0, dur = 900;
    global.cancelAnimationFrame(raf);
    el.textContent = '0';
    raf = global.requestAnimationFrame(function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (!doc.contains(el)) return;
      el.textContent = Math.round(to * e);
      if (k < 1) raf = global.requestAnimationFrame(step);
    });
  }
  function paintGrid() { gridEl.innerHTML = gridHtml(); }
  function paintModal(dir, focusSel) {
    var d = dish(state.open);
    if (!d) { modalEl.innerHTML = ''; return; }
    modalEl.innerHTML = dialogHtml(d);
    var dlg = modalEl.querySelector('.vc-dialog');
    if (dir) dlg.classList.add(dir > 0 ? 'is-next' : 'is-prev'); else if (dir === 0) modalEl.querySelector('.vc-overlay').classList.add('is-still');
    var target = focusSel ? dlg.querySelector(focusSel) : null;
    (target || dlg.querySelector('.vc-x') || dlg).focus({ preventScroll: true });
    countUp();
  }
  function mount() {
    var slot = doc.getElementById('vfCards');
    if (!slot) return;
    if (host.parentNode !== slot) slot.appendChild(host);
    if (!gridEl.firstChild) paintGrid();
  }

  /* ---- 8. Actions ----------------------------------------------------------------- */
  function open(id, opener) {
    if (!dish(id)) return;
    if (!state.open) state.opener = opener || doc.activeElement;
    state.open = id;
    doc.documentElement.classList.add('vc-lock');
    paintModal();
  }
  function close() {
    state.open = null;
    doc.documentElement.classList.remove('vc-lock');
    modalEl.innerHTML = '';
    var o = state.opener; state.opener = null;
    var again = o && o.getAttribute && o.getAttribute('data-vc-open') ? host.querySelector('[data-vc-open="' + o.getAttribute('data-vc-open') + '"]') : o;
    if (again && doc.contains(again) && again.focus) again.focus();
  }
  function nav(step) {
    var list = sorted(), i = list.indexOf(dish(state.open));
    if (i < 0) return;
    state.open = list[(i + step + list.length) % list.length].id;
    paintModal(step, '[data-vc-nav="' + step + '"]');
  }
  host.addEventListener('click', function (ev) {
    var tg = ev.target;
    if (tg.hasAttribute && tg.hasAttribute('data-vc-overlay')) { close(); return; }
    var el = tg.closest ? tg.closest('[data-vc-open], [data-vc-sort], [data-vc-nav], [data-vc-close]') : null;
    if (!el) return;
    if (el.hasAttribute('data-vc-open')) open(el.getAttribute('data-vc-open'), el);
    else if (el.hasAttribute('data-vc-close')) close();
    else if (el.hasAttribute('data-vc-nav')) nav(+el.getAttribute('data-vc-nav') > 0 ? 1 : -1);
    else {
      var k = el.getAttribute('data-vc-sort');
      if (k !== 'ovr' && STATS.indexOf(k) < 0) return;
      state.sort = k; paintGrid();
      var b = host.querySelector('[data-vc-sort="' + k + '"]'); if (b) b.focus();
    }
  });
  host.addEventListener('submit', function (ev) { ev.preventDefault(); ev.stopPropagation(); });
  doc.addEventListener('keydown', function (ev) {
    if (!state.open) return;
    var dlg = modalEl.querySelector('.vc-dialog');
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); nav(1); return; }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); nav(-1); return; }
    if (ev.key !== 'Tab' || !dlg) return;
    var f = [].slice.call(dlg.querySelectorAll('button:not([disabled]), summary'));
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!dlg.contains(doc.activeElement)) { ev.preventDefault(); first.focus(); }
    else if (ev.shiftKey && doc.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && doc.activeElement === last) { ev.preventDefault(); first.focus(); }
  });
  /* Subtle 3D tilt of the card under the pointer (skipped with reduced motion / touch). */
  host.addEventListener('pointermove', function (ev) {
    var card = doc.getElementById('vcFut');
    if (!card || reduced() || ev.pointerType === 'touch') return;
    var wrap = card.parentNode, r = wrap.getBoundingClientRect();
    if (ev.clientX < r.left - 40 || ev.clientX > r.right + 40 || ev.clientY < r.top - 40 || ev.clientY > r.bottom + 40) { card.style.transform = ''; return; }
    var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
    card.style.transform = 'rotateY(' + (x * 12).toFixed(2) + 'deg) rotateX(' + (-y * 10).toFixed(2) + 'deg)';
    card.style.setProperty('--sx', ((x + 0.5) * 100).toFixed(1) + '%');
  });

  /* ---- 9. API ---------------------------------------------------------------------- */
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.foodcloudCards = {
    mount: mount, open: function (id) { open(id); }, close: close,
    dishes: function () { return DISHES.map(function (d) { return { id: d.id, rank: d.rank, s: d.s }; }); },
    state: function () { return { sort: state.sort, open: state.open, order: sorted().map(function (d) { return d.id; }) }; }
  };
  I18N.onChange(function () { paintGrid(); if (state.open) paintModal(0); });
  var fc = global.NutriBentoViews.foodcloud;
  if (fc && fc.render) fc.render();
  mount();
})(window);
