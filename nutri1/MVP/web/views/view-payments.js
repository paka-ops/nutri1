/* ==========================================================================
   NUTRI.N°1 — Payments view  (SESSION 7)
   Renders <section id="payments"> as a Dark Bento grid: payment methods for the
   selected country, a three-step demo checkout and the production requirements.

   Depends on : js/bento-i18n.js (NUTRI_BENTO_I18N), js/bento-shell.js
   Styles     : styles/views.css  (.vp-*)
   Cart link  : NutriBentoViews.payments.setOrder(amount) is called by the marketplace cart
   Preserves  : renderPayments(country), selectPayment(method), #paymentMethods,
                .payment-method-card[data-payment-method]
   Note       : demonstration only. No payment provider is connected, no money moves,
                no card data is ever requested, and nothing is sent or stored: the
                state (including the phone number typed) lives in memory only.
                The method lists per country come from the original prototype and
                must be confirmed with each provider before production.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N;
  var root = doc.getElementById('payments');
  if (!root || !I18N) return;

  /* ---- 1. Dictionary (EN/FR, strict parity) ---------------------------- */
  I18N.register({
    en: {
      'payments.title': 'Country-specific Payments',
      'payments.sub': 'Bank and mobile-money methods follow the country selected in the header.',
      'payments.demo': 'Demonstration · no real payment',
      'payments.methods.title': 'Methods available in {country}',
      'payments.methods.sub': 'Choose how you would like to pay.',
      'payments.methods.count': '{n} method(s)',
      'payments.type.card': 'Bank card', 'payments.type.momo': 'Mobile money', 'payments.type.wallet': 'Digital wallet', 'payments.type.bank': 'Bank transfer',
      'payments.name.card': 'Bank Card', 'payments.name.transfer': 'Bank transfer', 'payments.name.ussd': 'Bank transfer / USSD',
      'payments.name.wallet': 'Mobile wallet', 'payments.name.emoney': 'E-money / local wallet',
      'payments.select': 'Select', 'payments.selected': 'Selected',
      'payments.toast.selected': 'Method selected: {method} · {country}',
      'payments.checkout.title': 'Checkout',
      'payments.step.method': 'Method', 'payments.step.details': 'Details', 'payments.step.done': 'Confirmation',
      'payments.idle': 'Select a payment method to continue.',
      'payments.purpose': 'What are you paying for?',
      'payments.purpose.premium': 'Premium subscription', 'payments.purpose.consult': 'Nutritionist consultation', 'payments.purpose.order': 'Store order',
      'payments.sum.title': 'Summary', 'payments.sum.method': 'Method', 'payments.sum.country': 'Country', 'payments.sum.purpose': 'Purpose',
      'payments.sum.amount': 'Amount', 'payments.sum.amount.none': 'Not set in this demonstration', 'payments.sum.amount.cart': '{amount} (sample cart total)',
      'payments.sum.ref': 'Reference', 'payments.sum.phone': 'Number', 'payments.sum.status': 'Status', 'payments.sum.status.demo': 'Simulated, no money moved',
      'payments.phone': 'Mobile number for {method}', 'payments.phone.hint': '8 to 15 digits, with or without the country code. It stays in this browser tab.',
      'payments.phone.error': 'Enter a valid mobile number (8 to 15 digits).',
      'payments.card.note': 'No card number is requested here. In production, card entry is handled on the secure page of a certified payment provider.',
      'payments.bank.note': 'In production, the transfer instructions (account, reference, USSD code) are issued by the bank or provider.',
      'payments.confirm': 'Confirm (demo)', 'payments.change': 'Change method', 'payments.new': 'New payment',
      'payments.done.title': 'Demonstration completed',
      'payments.done.text': 'This is where the provider would confirm the payment. Nothing was charged.',
      'payments.toast.done': 'Demo checkout completed. Nothing was charged.',
      'payments.prod.title': 'Before real payments',
      'payments.prod.sub': 'Production checkout is not active. It requires, for each country:',
      'payments.prod.1': 'Merchant onboarding', 'payments.prod.1.d': 'A merchant account with each bank or mobile-money operator.',
      'payments.prod.2': 'Provider APIs', 'payments.prod.2.d': 'Technical integration and testing with each provider.',
      'payments.prod.3': 'KYC', 'payments.prod.3.d': 'Identity checks on the merchant and, where required, on customers.',
      'payments.prod.4': 'Country authorization', 'payments.prod.4.d': 'Approval from the financial regulator of each country.'
    },
    fr: {
      'payments.title': 'Paiements par pays',
      'payments.sub': 'Les moyens bancaires et mobile money suivent le pays choisi dans l’en-tête.',
      'payments.demo': 'Démonstration · aucun paiement réel',
      'payments.methods.title': 'Moyens disponibles : {country}',
      'payments.methods.sub': 'Choisissez comment vous souhaitez payer.',
      'payments.methods.count': '{n} moyen(s)',
      'payments.type.card': 'Carte bancaire', 'payments.type.momo': 'Mobile money', 'payments.type.wallet': 'Portefeuille numérique', 'payments.type.bank': 'Virement bancaire',
      'payments.name.card': 'Carte bancaire', 'payments.name.transfer': 'Virement bancaire', 'payments.name.ussd': 'Virement bancaire / USSD',
      'payments.name.wallet': 'Portefeuille mobile', 'payments.name.emoney': 'Monnaie électronique / portefeuille local',
      'payments.select': 'Choisir', 'payments.selected': 'Sélectionné',
      'payments.toast.selected': 'Moyen sélectionné : {method} · {country}',
      'payments.checkout.title': 'Paiement',
      'payments.step.method': 'Moyen', 'payments.step.details': 'Détails', 'payments.step.done': 'Confirmation',
      'payments.idle': 'Sélectionnez un moyen de paiement pour continuer.',
      'payments.purpose': 'Que souhaitez-vous payer ?',
      'payments.purpose.premium': 'Abonnement Premium', 'payments.purpose.consult': 'Consultation de nutritionniste', 'payments.purpose.order': 'Commande du marché',
      'payments.sum.title': 'Récapitulatif', 'payments.sum.method': 'Moyen', 'payments.sum.country': 'Pays', 'payments.sum.purpose': 'Objet',
      'payments.sum.amount': 'Montant', 'payments.sum.amount.none': 'Non défini dans cette démonstration', 'payments.sum.amount.cart': '{amount} (total d’exemple du panier)',
      'payments.sum.ref': 'Référence', 'payments.sum.phone': 'Numéro', 'payments.sum.status': 'Statut', 'payments.sum.status.demo': 'Simulé, aucun débit',
      'payments.phone': 'Numéro mobile : {method}', 'payments.phone.hint': '8 à 15 chiffres, avec ou sans l’indicatif du pays. Il reste dans cet onglet du navigateur.',
      'payments.phone.error': 'Saisissez un numéro mobile valide (8 à 15 chiffres).',
      'payments.card.note': 'Aucun numéro de carte n’est demandé ici. En production, la saisie de la carte se fait sur la page sécurisée d’un prestataire de paiement certifié.',
      'payments.bank.note': 'En production, les instructions de virement (compte, référence, code USSD) sont fournies par la banque ou le prestataire.',
      'payments.confirm': 'Confirmer (démo)', 'payments.change': 'Changer de moyen', 'payments.new': 'Nouveau paiement',
      'payments.done.title': 'Démonstration terminée',
      'payments.done.text': 'C’est ici que le prestataire confirmerait le paiement. Rien n’a été débité.',
      'payments.toast.done': 'Paiement de démonstration terminé. Rien n’a été débité.',
      'payments.prod.title': 'Avant les paiements réels',
      'payments.prod.sub': 'Le paiement en production n’est pas actif. Il exige, pour chaque pays :',
      'payments.prod.1': 'Contrat marchand', 'payments.prod.1.d': 'Un compte marchand auprès de chaque banque ou opérateur de mobile money.',
      'payments.prod.2': 'API des prestataires', 'payments.prod.2.d': 'Intégration technique et tests avec chaque prestataire.',
      'payments.prod.3': 'KYC', 'payments.prod.3.d': 'Vérification d’identité du marchand et, si nécessaire, des clients.',
      'payments.prod.4': 'Autorisation nationale', 'payments.prod.4.d': 'Accord du régulateur financier de chaque pays.'
    }
  });

  /* ---- 2. Data (method lists carried over from the original prototype) -- */
  var METHODS = {
    BJ: ['Bank Card', 'MTN MoMo', 'Moov Money'], BF: ['Bank Card', 'Orange Money', 'Moov Money'], CV: ['Bank Card', 'E-money / local wallet'],
    CI: ['Bank Card', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Wave'], GM: ['Bank Card', 'QMoney', 'Afrimoney'],
    GH: ['Bank Card', 'MTN MoMo', 'Telecel Cash', 'AirtelTigo Money'], GN: ['Bank Card', 'Orange Money', 'MTN MoMo'], GW: ['Bank Card', 'Orange Money', 'MTN MoMo'],
    LR: ['Bank Card', 'Orange Money', 'Lonestar Cell MTN Mobile Money'], ML: ['Bank Card', 'Orange Money', 'Moov Money'],
    MR: ['Bank Card', 'Bank transfer', 'Mobile wallet'], NE: ['Bank Card', 'Airtel Money', 'Moov Money'],
    NG: ['Bank Card', 'OPay', 'PalmPay', 'Bank Transfer / USSD'], SN: ['Bank Card', 'Wave', 'Orange Money', 'Free Money'],
    SL: ['Bank Card', 'Orange Money', 'Afrimoney'], TG: ['Bank Card', 'Mixx by Yas', 'Flooz']
  };
  var GENERIC = { 'Bank Card': 'card', 'Bank transfer': 'transfer', 'Bank Transfer / USSD': 'ussd', 'Mobile wallet': 'wallet', 'E-money / local wallet': 'emoney' };
  var WALLETS = ['OPay', 'PalmPay', 'Wave', 'Mobile wallet', 'E-money / local wallet'];
  var PURPOSES = ['premium', 'consult', 'order'];
  var STEPS = ['method', 'details', 'done'];

  function typeOf(m) {
    if (m === 'Bank Card') return 'card';
    if (/bank/i.test(m)) return 'bank';
    return WALLETS.indexOf(m) >= 0 ? 'wallet' : 'momo';
  }
  function needsPhone(m) { var k = typeOf(m); return k === 'momo' || k === 'wallet'; }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  function list(c) { return METHODS[c] || ['Bank Card']; }

  var state = { country: headerCountry(), method: null, purpose: 'premium', phone: '', error: false, receipt: null, amount: null };

  /* ---- 3. Helpers ------------------------------------------------------- */
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function mname(m) { return GENERIC[m] ? t('payments.name.' + GENERIC[m]) : m; }
  function notify(msg) { if (typeof global.toast === 'function') { try { global.toast(msg); } catch (e) { /* ignore */ } } }
  function money(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency: 'USD' }); } catch (e) { return '$' + Number(v).toFixed(2); } }
  function mask(p) { return '•••• ' + p.slice(-2); }
  var PATHS = {
    pay: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
    momo: '<rect x="7" y="3" width="10" height="18" rx="2.500"/><path d="M11 17.500h2"/>',
    wallet: '<path d="M4 7.500A2.500 2.500 0 0 1 6.500 5H18v3"/><rect x="4" y="8" width="16" height="11" rx="2.500"/><circle cx="16" cy="13.500" r="1"/>',
    bank: '<path d="M4 10 12 5l8 5M5 10v8M9.500 10v8M14.500 10v8M19 10v8M3.500 19h17"/>',
    cart: '<path d="M4 5h2l2.200 10h9.300l1.800-7H7"/><circle cx="9.500" cy="18.500" r="1.300"/><circle cx="16.500" cy="18.500" r="1.300"/>',
    shield: '<path d="M12 3 5 6v5.500c0 4.300 2.900 7.700 7 9.500 4.100-1.800 7-5.200 7-9.500V6z"/><path d="m9 12 2.200 2.200L15 10.500"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.500"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra) {
    return '<header class="vp-card__head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3>' + (extra || '') + '</header>';
  }
  function step() { return state.receipt ? 2 : (state.method ? 1 : 0); }

  /* ---- 4. Blocks ---------------------------------------------------------- */
  function methodsHtml() {
    return list(state.country).map(function (m) {
      var on = state.method === m, k = typeOf(m);
      return '<button type="button" class="vp-method payment-method-card' + (on ? ' is-on' : '') + '" data-payment-method="' + esc(m) + '" aria-pressed="' + on + '">' +
        '<span class="vp-method__ico">' + ico(k) + '</span>' +
        '<span class="vp-method__txt"><b>' + esc(mname(m)) + '</b><small>' + esc(t('payments.type.' + k)) + '</small></span>' +
        '<span class="vp-method__cta">' + (on ? ico('check') : '') + esc(t(on ? 'payments.selected' : 'payments.select')) + '</span></button>';
    }).join('');
  }
  function row(label, value) { return '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>'; }
  function summary() {
    var r = state.receipt, rows = row(t('payments.sum.method'), mname(state.method)) + row(t('payments.sum.country'), cname(state.country)) +
      row(t('payments.sum.purpose'), t('payments.purpose.' + state.purpose)) + row(t('payments.sum.amount'), state.purpose === 'order' && state.amount != null ? t('payments.sum.amount.cart', { amount: money(state.amount) }) : t('payments.sum.amount.none'));
    if (r) {
      if (r.phone) rows += row(t('payments.sum.phone'), mask(r.phone));
      rows += row(t('payments.sum.ref'), r.ref) + row(t('payments.sum.status'), t('payments.sum.status.demo'));
    }
    return '<dl class="vp-sum" aria-label="' + esc(t('payments.sum.title')) + '">' + rows + '</dl>';
  }
  function checkoutHtml() {
    var s = step();
    var wizard = '<ol class="vp-steps">' + STEPS.map(function (k, i) {
      var cls = i < s || (s === 2 && i === 2) ? 'done' : (i === s ? 'active' : '');
      return '<li class="' + cls + '"' + (i === s ? ' aria-current="step"' : '') + '><i>' + (cls === 'done' ? ico('check') : (i + 1)) + '</i><span>' + esc(t('payments.step.' + k)) + '</span></li>';
    }).join('') + '</ol>';
    var body;
    if (s === 0) {
      body = '<p class="vp-empty" id="vpStatus" tabindex="-1">' + esc(t('payments.idle')) + '</p>';
    } else if (s === 1) {
      var kind = typeOf(state.method), field;
      if (needsPhone(state.method)) {
        field = '<label class="vp-field" for="vpPhone"><span>' + esc(t('payments.phone', { method: mname(state.method) })) + '</span></label>' +
          '<input id="vpPhone" type="tel" inputmode="tel" autocomplete="off" maxlength="20" value="' + esc(state.phone) + '" aria-describedby="vpPhoneHint' + (state.error ? ' vpPhoneErr' : '') + '"' + (state.error ? ' aria-invalid="true"' : '') + '>' +
          '<p class="vp-hint" id="vpPhoneHint">' + esc(t('payments.phone.hint')) + '</p>' +
          (state.error ? '<p class="vp-error" id="vpPhoneErr" role="alert">' + esc(t('payments.phone.error')) + '</p>' : '');
      } else {
        field = '<p class="vp-note">' + ico(kind === 'card' ? 'lock' : 'info') + '<span>' + esc(t(kind === 'card' ? 'payments.card.note' : 'payments.bank.note')) + '</span></p>';
      }
      body = '<form class="vp-form" id="vpForm" novalidate>' +
        '<label class="vp-field"><span>' + esc(t('payments.purpose')) + '</span><select id="vpPurpose">' + PURPOSES.map(function (p) {
          return '<option value="' + p + '"' + (p === state.purpose ? ' selected' : '') + '>' + esc(t('payments.purpose.' + p)) + '</option>';
        }).join('') + '</select></label>' + field + summary() +
        '<div class="vp-actions"><button type="submit" class="btn primary">' + esc(t('payments.confirm')) + '</button>' +
        '<button type="button" class="btn secondary" data-vp-act="change">' + esc(t('payments.change')) + '</button></div></form>';
    } else {
      body = '<div class="vp-done"><span class="vp-done__ico">' + ico('check') + '</span><div><h4 id="vpDone" tabindex="-1">' + esc(t('payments.done.title')) + '</h4>' +
        '<p>' + esc(t('payments.done.text')) + '</p></div></div>' + summary() +
        '<div class="vp-actions"><button type="button" class="btn primary" data-vp-act="new">' + esc(t('payments.new')) + '</button></div>';
    }
    return head('cart', t('payments.checkout.title')) + wizard + body;
  }
  function render() {
    var n = list(state.country).length;
    root.innerHTML = '<div class="vp">' +
      '<section class="card vp-hero"><div class="vh-head"><div class="vp-hero__title"><span class="vh-ico">' + ico('pay') + '</span><div><h2>' + esc(t('payments.title')) + '</h2>' +
        '<p class="vp-sub">' + esc(t('payments.sub')) + '</p></div></div><span class="pill vp-demo">' + esc(t('payments.demo')) + '</span></div></section>' +
      '<div class="vp-grid">' +
        '<section class="card vp-methods" aria-labelledby="vpMethodsTitle"><header class="vp-card__head"><span class="vh-ico">' + ico('wallet') + '</span>' +
          '<h3 id="vpMethodsTitle">' + esc(t('payments.methods.title', { country: cname(state.country) })) + '</h3><span class="pill vp-count">' + esc(t('payments.methods.count', { n: n })) + '</span></header>' +
          '<p class="vp-sub">' + esc(t('payments.methods.sub')) + '</p><div id="paymentMethods" class="vp-list">' + methodsHtml() + '</div></section>' +
        '<section class="card vp-checkout" id="vpCheckout" aria-label="' + esc(t('payments.checkout.title')) + '">' + checkoutHtml() + '</section>' +
        '<section class="card vp-prod">' + head('shield', t('payments.prod.title')) + '<p class="vp-sub">' + esc(t('payments.prod.sub')) + '</p><ol class="vp-reqs">' +
          [1, 2, 3, 4].map(function (i) { return '<li><i>' + i + '</i><div><b>' + esc(t('payments.prod.' + i)) + '</b><p>' + esc(t('payments.prod.' + i + '.d')) + '</p></div></li>'; }).join('') +
        '</ol></section>' +
      '</div></div>';
  }
  function focusId(id) { var el = doc.getElementById(id); if (el) { try { el.focus({ preventScroll: false }); } catch (e) { el.focus(); } } }
  function focusMethod(m) {
    var btns = root.querySelectorAll('[data-payment-method]');
    for (var i = 0; i < btns.length; i++) if (btns[i].getAttribute('data-payment-method') === m) { try { btns[i].focus({ preventScroll: true }); } catch (e) { btns[i].focus(); } }
  }

  /* ---- 5. Actions ----------------------------------------------------------- */
  function keepPhone() { var el = doc.getElementById('vpPhone'); if (el) state.phone = el.value; }
  function setCountry(c) {
    c = METHODS[c] ? c : headerCountry();
    if (c !== state.country) { state.country = c; state.method = null; state.receipt = null; state.error = false; state.phone = ''; }
    render();
  }
  function select(m, quiet) {
    if (list(state.country).indexOf(m) < 0) return false;
    keepPhone();
    var had = root.contains(doc.activeElement);
    state.method = m; state.receipt = null; state.error = false;
    render();
    if (had) focusMethod(m);
    if (!quiet) notify(t('payments.toast.selected', { method: mname(m), country: cname(state.country) }));
    return true;
  }
  function confirm() {
    if (!state.method || state.receipt) return false;
    keepPhone();
    var phone = '';
    if (needsPhone(state.method)) {
      phone = state.phone.replace(/[\s().-]/g, '');
      if (!/^\+?\d{8,15}$/.test(phone)) { state.error = true; render(); focusId('vpPhone'); return false; }
    }
    state.error = false;
    state.receipt = { ref: 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase(), phone: phone };
    state.phone = '';
    render(); focusId('vpDone');
    notify(t('payments.toast.done'));
    return true;
  }
  function reset() { state.method = null; state.receipt = null; state.error = false; state.phone = ''; render(); focusId('vpStatus'); }

  root.addEventListener('click', function (ev) {
    var m = ev.target.closest('[data-payment-method]');
    if (m && root.contains(m)) { select(m.getAttribute('data-payment-method')); return; }
    var a = ev.target.closest('[data-vp-act]');
    if (a && root.contains(a)) reset();
  });
  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'vpPurpose' && PURPOSES.indexOf(ev.target.value) >= 0) {
      keepPhone(); state.purpose = ev.target.value; render(); focusId('vpPurpose');
    }
  });
  root.addEventListener('submit', function (ev) { ev.preventDefault(); confirm(); });
  doc.addEventListener('nutri:countryChanged', function () { setCountry(headerCountry()); });

  /* ---- 6. Legacy API (index.html delegates its old functions here) ----------- */
  var api = {
    render: render,
    renderPayments: function (c) { setCountry(c || headerCountry()); },
    selectPayment: function (m) { return select(m); },
    setOrder: function (amount) { var v = Number(amount); state.amount = isFinite(v) && v > 0 ? v : null; state.purpose = 'order'; state.receipt = null; state.error = false; setCountry(headerCountry()); },
    confirm: confirm, reset: reset, methods: function (c) { return list(c || state.country).slice(); },
    state: function () { return { country: state.country, method: state.method, purpose: state.purpose, step: step(), error: state.error, receipt: state.receipt ? state.receipt.ref : null }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.payments = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'payments');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setCountry(headerCountry()); });
  I18N.onChange(function () { keepPhone(); render(); });
})(window);
