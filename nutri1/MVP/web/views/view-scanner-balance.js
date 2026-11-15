/* ==========================================================================
   NUTRI.N°1 — AI Food & Meal Scanner · meal balance
   Mounts into #vsBalance (placeholder emitted by views/view-scanner.js in the
   result card). After a scan it says whether the scanned food or meal is balanced
   (share of the energy coming from proteins, carbohydrates and fats), and when it
   is not it recommends what to add — a named food and a quantity for each macro
   that is too low — until the three shares are inside their target range. The
   "I eat this meal" button of the scanner stays locked until then.

   Depends on : js/bento-i18n.js, views/view-scanner.js
                (NutriBentoViews.scanner.addPart(id, grams) and .food(id))
   Styles     : styles/views.css  (.vsb-* in block 4b, scoped to #scanner)
   Targets    : proteins 12–35 %, carbohydrates 45–65 %, fats 20–35 % of the energy.
                Indicative ranges for the demonstration (close to the usual acceptable
                macronutrient distribution ranges); not a personalised medical advice.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('scanner');
  var scanner = global.NutriBentoViews && global.NutriBentoViews.scanner;
  if (!root || !I18N || !scanner || !scanner.addPart || !scanner.food) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'scanb.title': 'Meal balance',
      'scanb.ok': 'Balanced', 'scanb.ko': 'Not balanced',
      'scanb.ok.text': 'Proteins, carbohydrates and fats are all inside their target range. You can eat this meal.',
      'scanb.ko.text': 'Follow the recommendations below until the three bars are inside their target range.',
      'scanb.m.protein': 'Proteins', 'scanb.m.carbs': 'Carbohydrates', 'scanb.m.fat': 'Fats',
      'scanb.share': '{pct}% of energy', 'scanb.target': 'Target {min}–{max}%',
      'scanb.s.low': 'Too low', 'scanb.s.ok': 'On target', 'scanb.s.high': 'Too high',
      'scanb.reco.title': 'What to add',
      'scanb.reco.protein': 'Add a little protein', 'scanb.reco.carbs': 'Add a little carbohydrate', 'scanb.reco.fat': 'Add a little fat',
      'scanb.reco.why.low': '{macro} bring only {pct}% of the energy (target at least {min}%).',
      'scanb.reco.why.high': '{high} bring {pct}% of the energy (target at most {max}%): adding this brings the meal back into balance.',
      'scanb.reco.add': 'Add {g} g of {name}',
      'scanb.reco.or': 'or',
      'scanb.reco.alt': '{name} · {g} g',
      'scanb.auto': 'Balance automatically',
      'scanb.eat': 'I eat this meal', 'scanb.locked': 'Balance the meal first',
      'scanb.lock.note': 'The meal can be confirmed once it is balanced.',
      'scanb.toast.locked': 'This meal is not balanced yet: add what is recommended first.',
      'scanb.toast.added': 'Added: {g} g of {name}',
      'scanb.toast.ok': 'The meal is now balanced.',
      'scanb.note': 'Indicative targets for the demonstration, not personal medical advice.'
    },
    fr: {
      'scanb.title': 'Équilibre du repas',
      'scanb.ok': 'Équilibré', 'scanb.ko': 'Non équilibré',
      'scanb.ok.text': 'Protéines, glucides et lipides sont tous dans leur plage cible. Vous pouvez manger ce repas.',
      'scanb.ko.text': 'Suivez les recommandations ci-dessous jusqu’à ce que les trois barres soient dans leur plage cible.',
      'scanb.m.protein': 'Protéines', 'scanb.m.carbs': 'Glucides', 'scanb.m.fat': 'Lipides',
      'scanb.share': '{pct} % de l’énergie', 'scanb.target': 'Cible {min}–{max} %',
      'scanb.s.low': 'Trop peu', 'scanb.s.ok': 'Dans la cible', 'scanb.s.high': 'Trop',
      'scanb.reco.title': 'Ce qu’il faut ajouter',
      'scanb.reco.protein': 'Ajoutez un peu de protéines', 'scanb.reco.carbs': 'Ajoutez un peu de glucides', 'scanb.reco.fat': 'Ajoutez un peu de lipides',
      'scanb.reco.why.low': 'Les {macro} n’apportent que {pct} % de l’énergie (cible : au moins {min} %).',
      'scanb.reco.why.high': 'Les {high} apportent {pct} % de l’énergie (cible : au plus {max} %) : cet ajout ramène le repas à l’équilibre.',
      'scanb.reco.add': 'Ajouter {g} g de {name}',
      'scanb.reco.or': 'ou',
      'scanb.reco.alt': '{name} · {g} g',
      'scanb.auto': 'Équilibrer automatiquement',
      'scanb.eat': 'Je mange ce repas', 'scanb.locked': 'Équilibrez d’abord le repas',
      'scanb.lock.note': 'Le repas pourra être validé une fois équilibré.',
      'scanb.toast.locked': 'Ce repas n’est pas encore équilibré : ajoutez d’abord ce qui est recommandé.',
      'scanb.toast.added': 'Ajouté : {g} g de {name}',
      'scanb.toast.ok': 'Le repas est maintenant équilibré.',
      'scanb.note': 'Cibles indicatives pour la démonstration, pas un avis médical personnalisé.'
    }
  });

  /* ---- 2. Model ------------------------------------------------------------ */
  var MACROS = [
    { k: 'protein', kcal: 4, min: 12, max: 35, tone: 'lime', foods: ['chicken', 'fish', 'egg', 'beans'] },
    { k: 'carbs', kcal: 4, min: 45, max: 65, tone: 'blue', foods: ['rice', 'plantain', 'cassava', 'fufu'] },
    { k: 'fat', kcal: 9, min: 20, max: 35, tone: 'orange', foods: ['avocado', 'oil', 'palm'] }
  ];
  var SCALE = 80;   /* the bars show 0–80 % of the energy */
  function shares(tot) {
    var e = tot.protein * 4 + tot.carbs * 4 + tot.fat * 9;
    if (!(e > 0)) return null;
    return { protein: tot.protein * 4 / e * 100, carbs: tot.carbs * 4 / e * 100, fat: tot.fat * 9 / e * 100 };
  }
  /* the verdict uses the rounded percentages shown on screen */
  function status(m, sh) { var v = Math.round(sh[m.k]); return v < m.min ? 'low' : v > m.max ? 'high' : 'ok'; }
  function balanced(tot) {
    var sh = shares(tot); if (!sh) return false;
    return MACROS.every(function (m) { return status(m, sh) === 'ok'; });
  }
  function plus(tot, id, g) {
    var f = scanner.food(id);
    return { protein: tot.protein + f.protein * g / 100, carbs: tot.carbs + f.carbs * g / 100, fat: tot.fat + f.fat * g / 100 };
  }
  /* smallest quantity of a food that fixes `test`, in steps suited to the food */
  function dose(tot, id, test) {
    var oil = id === 'oil' || id === 'palm', step = oil ? 1 : 5, cap = oil ? 60 : 400, g;
    for (g = step; g <= cap; g += step) if (test(shares(plus(tot, id, g)))) return g;
    return 0;
  }
  /* -> [{ macro, why, opts: [{ id, g }] }]  (one recommendation per issue, most useful first) */
  function advise(tot) {
    var sh = shares(tot), out = [];
    if (!sh) return out;
    var low = MACROS.filter(function (m) { return status(m, sh) === 'low'; });
    var high = MACROS.filter(function (m) { return status(m, sh) === 'high'; });
    var make = function (m, test, why) {
      var opts = m.foods.map(function (id) { return { id: id, g: dose(tot, id, test) }; }).filter(function (o) { return o.g > 0; });
      if (opts.length) out.push({ macro: m, why: why, opts: opts.slice(0, 3) });
    };
    low.forEach(function (m) {
      make(m, function (s) { return s && Math.round(s[m.k]) >= m.min; },
        I18N.t('scanb.reco.why.low', { macro: I18N.t('scanb.m.' + m.k).toLowerCase(), pct: Math.round(sh[m.k]), min: m.min }));
    });
    if (!low.length && high.length) {
      /* nothing is too low but one macro is too high: add the macro that has the most room */
      var h = high[0], rest = MACROS.filter(function (m) { return m !== h; }).sort(function (a, b) {
        return (sh[a.k] - a.min) / (a.max - a.min) - (sh[b.k] - b.min) / (b.max - b.min);
      });
      make(rest[0], function (s) { return s && Math.round(s[h.k]) <= h.max && Math.round(s[rest[0].k]) <= rest[0].max; },
        I18N.t('scanb.reco.why.high', { high: I18N.t('scanb.m.' + h.k).toLowerCase(), pct: Math.round(sh[h.k]), max: h.max }));
    }
    return out;
  }

  /* ---- 3. Template ------------------------------------------------------------ */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function food(id) { return t('scanner.i.' + id).toLowerCase(); }
  var ICONS = {
    scale: '<path d="M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 4 3 19h18zM12 10v4M12 16.5v.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function row(m, sh) {
    var st = status(m, sh), v = Math.round(sh[m.k]);
    return '<li class="vsb-row vsb-tone--' + m.tone + ' is-' + st + '">' +
      '<div class="vsb-row__top"><span class="vsb-row__name">' + esc(t('scanb.m.' + m.k)) + '</span>' +
        '<span class="vsb-row__val"><b>' + esc(t('scanb.share', { pct: v })) + '</b><small>' + esc(t('scanb.target', { min: m.min, max: m.max })) + '</small></span>' +
        '<span class="vsb-chip vsb-chip--' + st + '">' + ico(st === 'ok' ? 'check' : 'alert') + esc(t('scanb.s.' + st)) + '</span></div>' +
      '<div class="vsb-track" aria-hidden="true"><span class="vsb-zone" style="left:' + (m.min / SCALE * 100) + '%;width:' + ((m.max - m.min) / SCALE * 100) + '%"></span>' +
        '<i style="width:' + (Math.min(SCALE, sh[m.k]) / SCALE * 100).toFixed(1) + '%"></i></div></li>';
  }
  function reco(r, n) {
    var main = r.opts[0], alts = r.opts.slice(1);
    return '<li class="vsb-reco vsb-tone--' + r.macro.tone + '">' +
      '<div class="vsb-reco__txt"><b>' + esc(t('scanb.reco.' + r.macro.k)) + ' : ' + esc(food(main.id)) + '</b><small>' + esc(r.why) + '</small></div>' +
      '<div class="vsb-reco__act"><button type="button" class="btn primary vsb-add" data-vsb-add="' + main.id + '" data-vsb-g="' + main.g + '"' + (n === 0 ? ' data-vsb-first' : '') + '>' +
        ico('plus') + '<span>' + esc(t('scanb.reco.add', { g: main.g, name: food(main.id) })) + '</span></button>' +
        (alts.length ? '<span class="vsb-or">' + esc(t('scanb.reco.or')) + '</span>' + alts.map(function (o) {
          return '<button type="button" class="vsb-alt" data-vsb-add="' + o.id + '" data-vsb-g="' + o.g + '" aria-label="' + esc(t('scanb.reco.add', { g: o.g, name: food(o.id) })) + '">' +
            esc(t('scanb.reco.alt', { name: food(o.id), g: o.g })) + '</button>';
        }).join('') : '') + '</div></li>';
  }
  var last = { ok: null };
  function paint(tot) {
    var slot = doc.getElementById('vsBalance');
    if (!slot) return;
    var sh = shares(tot);
    if (!sh) { slot.innerHTML = ''; lock(false); return; }
    var ok = balanced(tot), recos = ok ? [] : advise(tot);
    slot.className = 'vsb ' + (ok ? 'is-ok' : 'is-ko');
    slot.innerHTML =
      '<div class="vsb-head"><span class="vsb-ico">' + ico('scale') + '</span><div class="vsb-head__txt"><h5 tabindex="-1" data-vsb-focus>' + esc(t('scanb.title')) + '</h5>' +
        '<p role="status" aria-live="polite">' + esc(t(ok ? 'scanb.ok.text' : 'scanb.ko.text')) + '</p></div>' +
        '<span class="vsb-verdict">' + ico(ok ? 'check' : 'alert') + esc(t(ok ? 'scanb.ok' : 'scanb.ko')) + '</span></div>' +
      '<ul class="vsb-rows">' + MACROS.map(function (m) { return row(m, sh); }).join('') + '</ul>' +
      (recos.length ? '<div class="vsb-recos"><div class="vsb-recos__head"><h6>' + esc(t('scanb.reco.title')) + '</h6>' +
        '<button type="button" class="vsb-auto" data-vsb-auto>' + ico('spark') + esc(t('scanb.auto')) + '</button></div>' +
        '<ul>' + recos.map(reco).join('') + '</ul></div>' : '') +
      '<p class="vsb-note">' + esc(t('scanb.note')) + '</p>';
    lock(!ok);
    last.ok = ok;
  }
  /* The scanner's confirm button becomes "I eat this meal" and stays locked while the meal is not balanced. */
  function lock(on) {
    var btn = root.querySelector('[data-vs-act="confirm"]');
    if (!btn) return;
    btn.classList.toggle('is-locked', on);
    btn.setAttribute('aria-disabled', on ? 'true' : 'false');
    btn.innerHTML = ico(on ? 'lock' : 'check') + '<span>' + esc(t(on ? 'scanb.locked' : 'scanb.eat')) + '</span>';
    var note = root.querySelector('.vsb-locknote');
    if (on && !note && btn.parentNode && btn.parentNode.parentNode) {
      note = doc.createElement('p'); note.className = 'vsb-locknote';
      btn.parentNode.parentNode.insertBefore(note, btn.parentNode.nextSibling);
    }
    if (note) { if (on) note.textContent = t('scanb.lock.note'); else note.parentNode.removeChild(note); }
  }
  function toast(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }
  /* Called by the scanner before saving: false blocks the confirmation. */
  function allow(tot) {
    if (balanced(tot)) return true;
    toast(t('scanb.toast.locked'));
    var slot = doc.getElementById('vsBalance'), first = slot && (slot.querySelector('[data-vsb-first]') || slot.querySelector('[data-vsb-focus]'));
    if (slot) {
      slot.classList.remove('is-nudge'); void slot.offsetWidth; slot.classList.add('is-nudge');
      try { slot.scrollIntoView({ block: 'center', behavior: global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } catch (e) { slot.scrollIntoView(); }
    }
    if (first) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
    return false;
  }

  /* ---- 4. Events ---------------------------------------------------------------- */
  function current() { var s = scanner.state(); return s && s.step === 4 ? s : null; }
  function totalsNow() { return scanner.totals ? scanner.totals() : null; }
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-vsb-add], [data-vsb-auto]') : null;
    if (!b || !root.contains(b) || !current()) return;
    if (b.hasAttribute('data-vsb-auto')) {
      var guard = 0, tot;
      while (guard++ < 8) {
        tot = totalsNow(); if (!tot || balanced(tot)) break;
        var r = advise(tot)[0]; if (!r) break;
        scanner.addPart(r.opts[0].id, r.opts[0].g);
      }
      tot = totalsNow();
      if (tot && balanced(tot)) toast(t('scanb.toast.ok'));
      return;
    }
    var id = b.getAttribute('data-vsb-add'), g = +b.getAttribute('data-vsb-g') || 0;
    if (!scanner.addPart(id, g)) return;
    var now = totalsNow();
    toast(now && balanced(now) ? t('scanb.toast.ok') : t('scanb.toast.added', { g: g, name: food(id) }));
  });

  global.NutriBentoViews.scannerBalance = {
    paint: paint, allow: allow, balanced: balanced, advise: function (tot) { return advise(tot).map(function (r) { return { macro: r.macro.k, options: r.opts }; }); },
    shares: shares, targets: MACROS.map(function (m) { return { macro: m.k, min: m.min, max: m.max }; })
  };
  if (scanner.render) scanner.render();
})(window);
