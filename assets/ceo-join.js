/* NUTRI.N°1 — Join / Rejoindre : popup contact CEO */
(function () {
  'use strict';

  var CEO = {
    name: 'Dr Essodolom PAKA',
    email: 'essodolom.paka@gmail.com',
    linkedin: 'https://www.linkedin.com/in/essodolom-paka-1b95771b3',
    whatsapp: 'https://wa.me/22890147862?text=' + encodeURIComponent('Bonjour Dr PAKA, je souhaite rejoindre NUTRI.N1.')
  };

  var FR = ((document.documentElement.lang || '') + '').toLowerCase().indexOf('fr') === 0;

  var MAIL_SUBJECT = FR ? 'NUTRI.N°1 — Rejoindre l\'écosystème' : 'NUTRI.N°1 — Joining the ecosystem';
  var MAIL_BODY = FR
    ? 'Bonjour Dr PAKA,\n\nJe vous contacte au sujet du projet NUTRI.N°1.\n\n'
    : 'Hello Dr PAKA,\n\nI am reaching out regarding the NUTRI.N°1 project.\n\n';
  var MAILTO = 'mailto:' + CEO.email +
    '?subject=' + encodeURIComponent(MAIL_SUBJECT) +
    '&body=' + encodeURIComponent(MAIL_BODY);

  var copy = FR ? {
    kicker: 'Rejoindre l\'écosystème',
    title: 'Parlons avec le CEO',
    lead: '<b>' + CEO.name + '</b> — <span>CEO du projet</span>',
    mail: 'E-mail',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    waValue: 'Message direct',
    close: 'Fermer',
    mailAria: 'Écrire un e-mail à ' + CEO.email,
    copyAria: 'Copier l\'adresse e-mail ' + CEO.email,
    copyTip: 'Copier',
    copied: 'Adresse e-mail copiée',
    copiedNoClient: 'Aucune messagerie détectée — adresse copiée',
    copyFail: 'Copie impossible — sélectionnez l\'adresse puis Ctrl + C'
  } : {
    kicker: 'Join the ecosystem',
    title: 'Talk with the CEO',
    lead: '<b>' + CEO.name + '</b> — <span>Project CEO</span>',
    mail: 'Email',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
    waValue: 'Direct message',
    close: 'Close',
    mailAria: 'Write an email to ' + CEO.email,
    copyAria: 'Copy the email address ' + CEO.email,
    copyTip: 'Copy',
    copied: 'Email address copied',
    copiedNoClient: 'No mail app detected — address copied',
    copyFail: 'Copy failed — select the address then press Ctrl + C'
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
  function svgCopy() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
  }
  function svgCheck() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'ceo-overlay';
  overlay.id = 'ceo-join';
  overlay.setAttribute('hidden', '');
  overlay.innerHTML =
    '<div class="ceo-modal" role="dialog" aria-modal="true" aria-labelledby="ceo-join-title">' +
      '<button class="ceo-close" type="button" aria-label="' + copy.close + '">×</button>' +
      '<div class="ceo-kicker">' + copy.kicker + '</div>' +
      '<h2 id="ceo-join-title">' + copy.title + '</h2>' +
      '<p class="ceo-lead">' + copy.lead + '</p>' +
      '<div class="ceo-list">' +
        '<div class="ceo-row">' +
          '<a class="ceo-item js-ceo-mail" href="' + MAILTO + '" aria-label="' + copy.mailAria + '">' +
            '<span class="ceo-ico">' + svgMail() + '</span>' +
            '<span class="ceo-txt"><small>' + copy.mail + '</small><strong>' + CEO.email + '</strong></span></a>' +
          '<button class="ceo-copy js-ceo-copy" type="button" aria-label="' + copy.copyAria + '" title="' + copy.copyTip + '">' +
            '<span class="ceo-copy-i">' + svgCopy() + '</span>' +
            '<span class="ceo-copy-ok">' + svgCheck() + '</span></button>' +
        '</div>' +
        '<a class="ceo-item in" href="' + CEO.linkedin + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="ceo-ico">' + svgIn() + '</span>' +
          '<span class="ceo-txt"><small>' + copy.linkedin + '</small><strong>linkedin.com/in/essosolim-joel-paka</strong></span></a>' +
        '<a class="ceo-item wa" href="' + CEO.whatsapp + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="ceo-ico">' + svgWa() + '</span>' +
          '<span class="ceo-txt"><small>' + copy.whatsapp + '</small><strong>' + copy.waValue + '</strong></span></a>' +
      '</div>' +
      '<p class="ceo-toast" role="status" aria-live="polite"></p>' +
    '</div>';

  function mount() {
    if (!overlay.parentNode && document.body) document.body.appendChild(overlay);
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg, isError) {
    var el = overlay.querySelector('.ceo-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-error', !!isError);
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2600);
  }

  function flashCopyBtn() {
    var btn = overlay.querySelector('.js-ceo-copy');
    if (!btn) return;
    btn.classList.add('is-done');
    setTimeout(function () { btn.classList.remove('is-done'); }, 1800);
  }

  /* ---------- copie presse-papiers (avec repli execCommand) ---------- */
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    (overlay.querySelector('.ceo-modal') || document.body).appendChild(ta);
    var ok = false;
    try {
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      ok = document.execCommand('copy');
    } catch (err) { ok = false; }
    if (ta.parentNode) ta.parentNode.removeChild(ta);
    return ok;
  }

  function copyEmail() {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(CEO.email).then(function () {
        return true;
      })['catch'](function () {
        return legacyCopy(CEO.email);
      });
    }
    return Promise.resolve(legacyCopy(CEO.email));
  }

  function handleCopy(silentSuccessMsg) {
    return copyEmail().then(function (ok) {
      if (ok) {
        flashCopyBtn();
        toast(silentSuccessMsg || copy.copied, false);
      } else {
        toast(copy.copyFail, true);
      }
      return ok;
    });
  }

  /* ---------- clic sur le champ e-mail ----------
     1) on laisse le navigateur ouvrir le client mail (mailto:)
     2) si rien ne s'ouvre (pas de client configuré), on copie l'adresse    */
  function handleMailClick(e) {
    // clic modifié (nouvel onglet, etc.) : on ne touche à rien
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;

    // le lien mailto: suit son cours normalement (pas de preventDefault),
    // on surveille juste si le client mail prend le relais.
    var wasHidden = !!document.hidden;
    var left = false;
    function onLeave() { left = true; }
    window.addEventListener('blur', onLeave);
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('visibilitychange', onLeave);

    setTimeout(function () {
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('visibilitychange', onLeave);
      // le client mail s'est ouvert / la page a perdu le focus → rien à faire
      if (left || (!!document.hidden && !wasHidden)) return;
      // aucun client e-mail configuré → repli : on copie l'adresse
      handleCopy(copy.copiedNoClient);
    }, 900);
  }

  /* ---------- ouverture / fermeture ---------- */
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
    document.body.classList.add('ceo-lock');
    var closeBtn = overlay.querySelector('.ceo-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeJoin() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('ceo-lock');
    var t = overlay.querySelector('.ceo-toast');
    if (t) t.classList.remove('is-on');
    setTimeout(function () {
      if (!overlay.classList.contains('is-open')) overlay.setAttribute('hidden', '');
    }, 380);
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (err) {}
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('.js-ceo-join, a.btn.green[href*="#contact"]') : null;
    if (!t) return;
    openJoin(e);
  }, true);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) { closeJoin(); return; }
    if (!e.target.closest) return;

    if (e.target.closest('.ceo-close')) { closeJoin(); return; }

    if (e.target.closest('.js-ceo-copy')) {
      e.preventDefault();
      e.stopPropagation();
      handleCopy();
      return;
    }

    var mailLink = e.target.closest('.js-ceo-mail');
    if (mailLink) handleMailClick(e);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeJoin();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
