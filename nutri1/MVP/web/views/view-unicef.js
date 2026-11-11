/* ==========================================================================
   NUTRI.N°1 — UNICEF Nutrition Intelligence Center view  (SESSION 12)
   Renders <section id="unicef"> as a Dark Bento dashboard: child and maternal
   indicators with WHO/UNICEF severity scales, distance to global targets,
   rule-based signals and the coverage of the data.

   Depends on : js/bento-i18n.js, js/bento-shell.js, js/bento-sample-data.js
   Styles     : styles/views.css  (shared .vi-* institution components)
   Preserves  : renderUNICEF(), #unicefCountry, #unicefStunting, #unicefWasting,
                #unicefAnaemia, #unicefEBF, #unicefFeedingIndicators, #unicefAlerts
   Note       : illustrative sample values, not official statistics (see
                js/bento-sample-data.js). Removed because nothing backed them: the
                "children monitored" counter, the Level and Year filters (they changed
                nothing), the trend bars (stunting ± fixed offsets), the age cards (they
                mixed unrelated indicators), the GIS demo and the "Tracked/Monitored" rows.
                Signals are derived from the severity class of each value.
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document;
  var I18N = global.NUTRI_BENTO_I18N, S = global.NutriSampleIndicators;
  var root = doc.getElementById('unicef');
  if (!root || !I18N || !S) return;

  I18N.register({
    en: {
      'unicef.kicker': 'UNICEF · CHILD & MATERNAL NUTRITION', 'unicef.title': 'UNICEF Nutrition Intelligence Center',
      'unicef.sub': 'Child malnutrition, infant and young child feeding, anaemia and maternal nutrition.',
      'unicef.demo': 'Illustrative figures · not official statistics',
      'unicef.country': 'Country',
      'unicef.placeholder': 'No country-specific sample exists for {country}: the placeholder values of the prototype are shown.',
      'unicef.i.stunting': 'Stunting', 'unicef.i.wasting': 'Wasting', 'unicef.i.anaemia': 'Anaemia', 'unicef.i.ebf': 'Exclusive breastfeeding',
      'unicef.p.stunting': 'Children under 5', 'unicef.p.wasting': 'Children under 5', 'unicef.p.anaemia': 'Group not specified in the sample', 'unicef.p.ebf': 'Infants 0–5 months',
      'unicef.s.verylow': 'Very low', 'unicef.s.low': 'Low', 'unicef.s.medium': 'Medium', 'unicef.s.high': 'High', 'unicef.s.veryhigh': 'Very high',
      'unicef.s.none': 'No problem', 'unicef.s.mild': 'Mild', 'unicef.s.moderate': 'Moderate', 'unicef.s.severe': 'Severe',
      'unicef.s.ontarget': 'Target reached', 'unicef.s.below': 'Below target',
      'unicef.kpis': 'Headline indicators', 'unicef.class': 'Class',
      'unicef.scale.title': 'Where {country} stands', 'unicef.scale.sub': 'Each value is placed on its severity scale. The marker shows the country.',
      'unicef.scale.aria': '{name}: {value}, class {cls}',
      'unicef.target.title': 'Distance to global targets', 'unicef.target.sub': 'Global nutrition targets that can be read directly from one value.',
      'unicef.target.wasting': 'Wasting below 5%', 'unicef.target.ebf': 'Exclusive breastfeeding at 50% or more',
      'unicef.target.met': 'Reached', 'unicef.target.edge': 'At the limit, not yet below', 'unicef.target.gap': '{n} points to go', 'unicef.target.now': 'Now {value}',
      'unicef.target.note': 'The stunting and anaemia targets are reductions from a baseline year, which the sample does not contain.',
      'unicef.signals.title': 'Early nutrition signals', 'unicef.signals.sub': 'Derived from the severity class of each value.',
      'unicef.sig.bad': 'Alert', 'unicef.sig.warn': 'Watch', 'unicef.sig.good': 'On track',
      'unicef.sig.text': '{name} is {value}: {cls}.',
      'unicef.cov.title': 'Coverage of the data', 'unicef.cov.sub': 'What the sample contains, and what still has to be connected.',
      'unicef.cov.sample': 'Sample value', 'unicef.cov.none': 'Not connected',
      'unicef.cov.1': 'Exclusive breastfeeding, 0–5 months', 'unicef.cov.2': 'Complementary feeding from 6 months', 'unicef.cov.3': 'Continued breastfeeding, 12–23 months',
      'unicef.cov.4': 'Minimum dietary diversity', 'unicef.cov.5': 'Anaemia in pregnant women', 'unicef.cov.6': 'Anaemia in women of reproductive age',
      'unicef.cov.7': 'Maternal nutrition status', 'unicef.cov.8': 'Sub-national levels and yearly trends',
      'unicef.note': 'Sample values carried over from the prototype. Replace them with survey data (DHS, MICS, SMART) or the UNICEF, WHO, World Bank joint estimates before any decision use.'
    },
    fr: {
      'unicef.kicker': 'UNICEF · NUTRITION DE L’ENFANT ET DE LA MÈRE', 'unicef.title': 'Centre d’intelligence nutritionnelle UNICEF',
      'unicef.sub': 'Malnutrition de l’enfant, alimentation du nourrisson et du jeune enfant, anémie et nutrition maternelle.',
      'unicef.demo': 'Chiffres illustratifs · pas de statistiques officielles',
      'unicef.country': 'Pays',
      'unicef.placeholder': 'Il n’existe pas d’exemple propre à ce pays ({country}) : les valeurs génériques du prototype sont affichées.',
      'unicef.i.stunting': 'Retard de croissance', 'unicef.i.wasting': 'Émaciation', 'unicef.i.anaemia': 'Anémie', 'unicef.i.ebf': 'Allaitement exclusif',
      'unicef.p.stunting': 'Enfants de moins de 5 ans', 'unicef.p.wasting': 'Enfants de moins de 5 ans', 'unicef.p.anaemia': 'Groupe non précisé dans l’exemple', 'unicef.p.ebf': 'Nourrissons de 0 à 5 mois',
      'unicef.s.verylow': 'Très faible', 'unicef.s.low': 'Faible', 'unicef.s.medium': 'Moyenne', 'unicef.s.high': 'Élevée', 'unicef.s.veryhigh': 'Très élevée',
      'unicef.s.none': 'Pas de problème', 'unicef.s.mild': 'Léger', 'unicef.s.moderate': 'Modéré', 'unicef.s.severe': 'Grave',
      'unicef.s.ontarget': 'Cible atteinte', 'unicef.s.below': 'Sous la cible',
      'unicef.kpis': 'Indicateurs clés', 'unicef.class': 'Classe',
      'unicef.scale.title': 'Situation du pays : {country}', 'unicef.scale.sub': 'Chaque valeur est placée sur son échelle de gravité. Le repère indique le pays.',
      'unicef.scale.aria': '{name} : {value}, classe {cls}',
      'unicef.target.title': 'Distance aux cibles mondiales', 'unicef.target.sub': 'Cibles mondiales de nutrition lisibles directement à partir d’une valeur.',
      'unicef.target.wasting': 'Émaciation sous 5 %', 'unicef.target.ebf': 'Allaitement exclusif à 50 % ou plus',
      'unicef.target.met': 'Atteinte', 'unicef.target.edge': 'À la limite, pas encore en dessous', 'unicef.target.gap': 'Encore {n} points', 'unicef.target.now': 'Actuellement {value}',
      'unicef.target.note': 'Les cibles sur le retard de croissance et l’anémie sont des réductions par rapport à une année de référence, absente de l’exemple.',
      'unicef.signals.title': 'Signaux nutritionnels précoces', 'unicef.signals.sub': 'Déduits de la classe de gravité de chaque valeur.',
      'unicef.sig.bad': 'Alerte', 'unicef.sig.warn': 'À surveiller', 'unicef.sig.good': 'En bonne voie',
      'unicef.sig.text': '{name} : {value}, classe « {cls} ».',
      'unicef.cov.title': 'Couverture des données', 'unicef.cov.sub': 'Ce que contient l’exemple, et ce qui reste à connecter.',
      'unicef.cov.sample': 'Valeur d’exemple', 'unicef.cov.none': 'Non connecté',
      'unicef.cov.1': 'Allaitement exclusif, 0 à 5 mois', 'unicef.cov.2': 'Alimentation de complément à partir de 6 mois', 'unicef.cov.3': 'Poursuite de l’allaitement, 12 à 23 mois',
      'unicef.cov.4': 'Diversité alimentaire minimale', 'unicef.cov.5': 'Anémie chez les femmes enceintes', 'unicef.cov.6': 'Anémie chez les femmes en âge de procréer',
      'unicef.cov.7': 'État nutritionnel des mères', 'unicef.cov.8': 'Niveaux infranationaux et tendances annuelles',
      'unicef.note': 'Valeurs d’exemple reprises du prototype. Remplacez-les par des données d’enquête (EDS, MICS, SMART) ou les estimations conjointes UNICEF, OMS, Banque mondiale avant tout usage pour la décision.'
    }
  });

  var KEYS = ['stunting', 'wasting', 'anaemia', 'ebf'], SCALED = ['stunting', 'wasting', 'anaemia'];
  function codes() { return (I18N.countries || []).map(function (c) { return c.code; }); }
  function headerCountry() { var sel = doc.getElementById('country'); return (sel && sel.value) ? sel.value : 'TG'; }
  var state = { country: headerCountry() };
  function t(key, params) { return I18N.t(key, params); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cname(code) { return typeof I18N.countryName === 'function' ? I18N.countryName(code) : code; }
  function n1(v) { try { return Number(v).toLocaleString(I18N.lang === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 }); } catch (e) { return String(v); } }
  function pct(v) { return n1(v) + (I18N.lang === 'fr' ? ' %' : '%'); }
  var PATHS = {
    child: '<circle cx="12" cy="7" r="3"/><path d="M7 20v-3a5 5 0 0 1 10 0v3"/>',
    scale: '<path d="M4 17h16M4 17v-3M9.300 17v-2M14.700 17v-2M20 17v-3M12 5v6M9.500 8.500 12 11l2.500-2.500"/>',
    target: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="4.500"/><circle cx="12" cy="12" r="1"/>',
    alert: '<path d="M12 4 3.500 19h17zM12 10v4M12 16.500v.100"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.100M4 12h.100M4 17h.100"/>',
    info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5M12 8v.100"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>'
  };
  function ico(n) {
    return '<svg class="bento-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + PATHS[n].replace(/(\d)\.(\d)00\b/g, '$1.$2') + '</svg>';
  }
  function head(icon, title, extra) { return '<header class="vi-head"><span class="vh-ico">' + ico(icon) + '</span><h3>' + esc(title) + '</h3>' + (extra || '') + '</header>'; }
  function sev(k, v) { var s = S.severity(k, v); return s ? '<span class="vi-sev vi-sev--' + s[1] + '">' + esc(t('unicef.s.' + s[0])) + '</span>' : ''; }

  function scaleHtml(k, v) {
    var sc = S.scales[k], prev = 0, cur = S.severity(k, v);
    var segs = sc.cuts.map(function (c) {
      var to = Math.min(c[0], sc.max), w = (to - prev) / sc.max * 100, from = prev; prev = to;
      return '<i class="vi-scale__seg vi-scale__seg--' + c[2] + (cur && cur[0] === c[1] ? ' is-on' : '') + '" style="--w:' + w.toFixed(2) + '%"><span>' + esc(t('unicef.s.' + c[1])) + '</span><small>' + (from ? esc(n1(from)) : '0') + '</small></i>';
    }).join('');
    return '<li class="vi-scale"><div class="vi-scale__top"><span><b>' + esc(t('unicef.i.' + k)) + '</b><small>' + esc(t('unicef.p.' + k)) + '</small></span><strong>' + esc(pct(v)) + '</strong></div>' +
      '<div class="vi-scale__track" role="img" aria-label="' + esc(t('unicef.scale.aria', { name: t('unicef.i.' + k), value: pct(v), cls: t('unicef.s.' + cur[0]) })) + '">' + segs +
      '<b class="vi-scale__mark" style="--x:' + Math.min(100, v / sc.max * 100).toFixed(2) + '%"></b></div></li>';
  }
  function render() {
    var m = S.get(state.country), own = S.has(state.country), name = cname(state.country);
    var kpis = KEYS.map(function (k) {
      return '<li class="vi-kpi"><span class="vi-kpi__label">' + esc(t('unicef.i.' + k)) + '</span><b id="unicef' + { stunting: 'Stunting', wasting: 'Wasting', anaemia: 'Anaemia', ebf: 'EBF' }[k] + '">' + esc(pct(m[k])) + '</b><small>' + esc(t('unicef.p.' + k)) + '</small>' +
        '<span class="vi-kpi__class"><em>' + esc(t('unicef.class')) + '</em>' + sev(k, m[k]) + '</span></li>';
    }).join('');
    /* [key, reached, points to go, bar fill %, value] */
    var targets = [['wasting', m.wasting < 5, Math.max(0, m.wasting - 5), 5 / Math.max(m.wasting, 5) * 100, m.wasting],
      ['ebf', m.ebf >= 50, Math.max(0, 50 - m.ebf), Math.min(100, m.ebf / 50 * 100), m.ebf]].map(function (x) {
      var label = x[1] ? t('unicef.target.met') : (x[2] > 0 ? t('unicef.target.gap', { n: n1(x[2]) }) : t('unicef.target.edge'));
      return '<li><div class="vi-bars__top"><span><b>' + esc(t('unicef.target.' + x[0])) + '</b><small>' + esc(t('unicef.target.now', { value: pct(x[4]) })) + '</small></span>' +
        '<span class="vi-sev vi-sev--' + (x[1] ? 'good' : 'warn') + '">' + esc(label) + '</span></div>' +
        '<div class="vi-bar vi-bar--' + (x[1] ? 'good' : 'warn') + '" aria-hidden="true"><i style="--w:' + x[3].toFixed(1) + '%"></i></div></li>';
    }).join('');
    var order = { bad: 0, warn: 1, good: 2 };
    var signals = KEYS.map(function (k) { var s = S.severity(k, m[k]); return { k: k, tone: s[1], cls: s[0] }; }).sort(function (a, b) { return order[a.tone] - order[b.tone]; }).map(function (x) {
      return '<li class="vi-signal vi-signal--' + x.tone + '"><strong>' + esc(t('unicef.sig.' + x.tone)) + '</strong><span>' + esc(t('unicef.sig.text', { name: t('unicef.i.' + x.k), value: pct(m[x.k]), cls: t('unicef.s.' + x.cls).toLowerCase() })) + '</span></li>';
    }).join('');
    var cov = [1, 2, 3, 4, 5, 6, 7, 8].map(function (i) {
      var has = i === 1;
      return '<li><span>' + esc(t('unicef.cov.' + i)) + '</span><b class="' + (has ? 'is-on' : '') + '">' + (has ? ico('check') + esc(pct(m.ebf)) + ' · ' : '') + esc(t(has ? 'unicef.cov.sample' : 'unicef.cov.none')) + '</b></li>';
    }).join('');
    root.innerHTML = '<div class="vi">' +
      '<section class="card vi-hero"><div class="vh-head"><div class="vi-hero__title"><span class="vh-ico">' + ico('child') + '</span><div><span class="vi-kicker">' + esc(t('unicef.kicker')) + '</span><h2>' + esc(t('unicef.title')) + '</h2>' +
        '<p class="vi-sub">' + esc(t('unicef.sub')) + '</p></div></div><span class="pill vi-demo">' + esc(t('unicef.demo')) + '</span></div>' +
        '<div class="vi-toolbar"><label class="vi-field"><span>' + esc(t('unicef.country')) + '</span><select id="unicefCountry">' + codes().map(function (c) {
          return '<option value="' + c + '"' + (c === state.country ? ' selected' : '') + '>' + esc(cname(c)) + '</option>'; }).join('') + '</select></label></div>' +
        (own ? '' : '<p class="vi-note vi-note--warn">' + ico('info') + '<span>' + esc(t('unicef.placeholder', { country: name })) + '</span></p>') +
        '<ul class="vi-kpis" aria-label="' + esc(t('unicef.kpis')) + '">' + kpis + '</ul></section>' +
      '<div class="vi-grid">' +
        '<section class="card vi-wide">' + head('scale', t('unicef.scale.title', { country: name })) + '<p class="vi-sub">' + esc(t('unicef.scale.sub')) + '</p><ul class="vi-scales">' + SCALED.map(function (k) { return scaleHtml(k, m[k]); }).join('') + '</ul></section>' +
        '<section class="card vi-side">' + head('target', t('unicef.target.title')) + '<p class="vi-sub">' + esc(t('unicef.target.sub')) + '</p><ul class="vi-bars">' + targets + '</ul>' +
          '<p class="vi-note">' + ico('info') + '<span>' + esc(t('unicef.target.note')) + '</span></p></section>' +
        '<section class="card vi-half alert-panel">' + head('alert', t('unicef.signals.title')) + '<p class="vi-sub">' + esc(t('unicef.signals.sub')) + '</p><ul class="vi-signals" id="unicefAlerts">' + signals + '</ul></section>' +
        '<section class="card vi-half">' + head('list', t('unicef.cov.title')) + '<p class="vi-sub">' + esc(t('unicef.cov.sub')) + '</p><ul class="vi-rows" id="unicefFeedingIndicators">' + cov + '</ul></section>' +
        '<p class="vi-note vi-full">' + ico('info') + '<span>' + esc(t('unicef.note')) + '</span></p>' +
      '</div></div>';
  }

  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'unicefCountry' && codes().indexOf(ev.target.value) >= 0) { state.country = ev.target.value; render(); var s = doc.getElementById('unicefCountry'); if (s) s.focus(); }
  });
  doc.addEventListener('nutri:countryChanged', function () { state.country = headerCountry(); render(); });

  var api = {
    render: render,
    renderUNICEF: function () { var e = doc.getElementById('unicefCountry'); if (e && codes().indexOf(e.value) >= 0) state.country = e.value; render(); },
    state: function () { return { country: state.country, own: S.has(state.country), metrics: S.get(state.country) }; }
  };
  global.NutriBentoViews = global.NutriBentoViews || {};
  global.NutriBentoViews.unicef = api;

  root.setAttribute('data-no-i18n', '');
  root.setAttribute('data-no-sim', '');
  root.setAttribute('data-v44bar', '1');
  root.setAttribute('data-bento-view', 'unicef');
  render();
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { state.country = headerCountry(); render(); });
  I18N.onChange(function () { render(); });
})(window);
