/* NUTRI.N°1 — Join / Rejoindre : popup contact CTO */
(function () {
  'use strict';

  var CTO = {
    name: 'Essosolim Joël PAKA',
    email: 'pakawess@gmail.com',
    linkedin: 'https://www.linkedin.com/in/essosolim-joel-paka',
    whatsapp: 'https://wa.me/228?text=' + encodeURIComponent('Bonjour Joel, je souhaite rejoindre NUTRI.N1.')
  };

  var FR = ((document.documentElement.lang || '') + '').toLowerCase().indexOf('fr') === 0;
  var copy = FR ? {
    kicker: 'Rejoindre l\'écosystème',
    title: 'Parlons avec le CTO',
    lead: '<b>' + CTO.name + '</b> — <span>CTO du projet</span>',
    mail: 'E-mail',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    waValue: 'Message direct',
    close: 'Fermer'
  } : {
    kicker: 'Join the ecosystem',
    title: 'Talk with the CTO',
    lead: '<b>' + CTO.name + '</b> — <span>Project CTO</span>',
    mail: 'Email',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    waValue: 'Direct message',
    close: 'Close'
  };

  function svgMail() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>';
  }
  function svgIn() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.8v2.1h.05c.53-1 1.84-2.1 3.79-2.1 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.7c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8.5z"/></svg>';
  }
  function svgWa() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.5 2 2 6.37 2 11.76c0 1.72.46 3.4 1.34 4.88L2 22l5.53-1.44a10.2 10.2 0 0 0 4.51 1.08h.01c5.54 0 10.04-4.37 10.04-9.76C22.09 6.37 17.58 2 12.04 2zm5.83 13.86c-.25.7-1.23 1.28-2.02 1.45-.54.11-1.24.2-3.61-.77-3.03-1.24-4.98-4.27-5.13-4.47-.15-.2-1.25-1.66-1.25-3.17 0-1.5.79-2.24 1.07-2.55.28-.3.61-.38.81-.38h.58c.19 0 .44-.07.69.53.25.61.86 2.1.93 2.25.08.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.45.53-.15.15-.3.31-.13.6.18.3.79 1.3 1.7 2.11 1.17 1.04 2.16 1.36 2.46 1.51.3.15.48.13.66-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.76.83 2.06.98.3.15.5.23.58.35.07.13.07.73-.18 1.43z"/></svg>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'cto-overlay';
  overlay.id = 'cto-join';
  overlay.setAttribute('hidden', '');
  overlay.innerHTML =
    '<div class="cto-modal" role="dialog" aria-modal="true" aria-labelledby="cto-join-title">' +
      '<button class="cto-close" type="button" aria-label="' + copy.close + '">×</button>' +
      '<div class="cto-kicker">' + copy.kicker + '</div>' +
      '<h2 id="cto-join-title">' + copy.title + '</h2>' +
      '<p class="cto-lead">' + copy.lead + '</p>' +
      '<div class="cto-list">' +
        '<a class="cto-item" href="mailto:' + CTO.email + '?subject=' + encodeURIComponent('NUTRI.N°1') + '">' +
          '<span class="cto-ico">' + svgMail() + '</span>' +
          '<span><small>' + copy.mail + '</small><strong>' + CTO.email + '</strong></span></a>' +
        '<a class="cto-item in" href="' + CTO.linkedin + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="cto-ico">' + svgIn() + '</span>' +
          '<span><small>' + copy.linkedin + '</small><strong>linkedin.com/in/essosolim-joel-paka</strong></span></a>' +
        '<a class="cto-item wa" href="' + CTO.whatsapp + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="cto-ico">' + svgWa() + '</span>' +
          '<span><small>' + copy.whatsapp + '</small><strong>' + copy.waValue + '</strong></span></a>' +
      '</div>' +
    '</div>';

  function mount() {
    if (!overlay.parentNode) document.body.appendChild(overlay);
  }

  var lastFocus = null;
  function openJoin(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    mount();
    lastFocus = document.activeElement;
    overlay.removeAttribute('hidden');
    overlay.classList.add('is-open');
    document.body.classList.add('cto-lock');
    var closeBtn = overlay.querySelector('.cto-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeJoin() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('cto-lock');
    setTimeout(function () {
      if (!overlay.classList.contains('is-open')) overlay.setAttribute('hidden', '');
    }, 380);
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (err) {}
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('.js-cto-join, a.btn.green[href*="#contact"]') : null;
    if (!t) return;
    openJoin(e);
  }, true);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeJoin();
  });
  overlay.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.cto-close') : null;
    if (b) closeJoin();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeJoin();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
