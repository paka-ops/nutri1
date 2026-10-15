/* ============================================================================
 * AgriNutri Intelligence · agri-section.js
 * Fichier : components/sections/agri-section.js
 * Rôle    : Composant de section agri — extrait de index.html pour alléger la
 *           page principale. Injecte le HTML de la section (tableau de bord
 *           Shadow DOM + modules historiques) et expose les fonctions de rendu
 *           globales attendues par index.html (—).
 *           Langue : FR (source) ↔ EN via components/i18n/sections-i18n.js.
 * ========================================================================== */
(function (global) {
  'use strict';
  const I18N = global.NutriSectionsI18N;

  /* ------------------------------------------------------------------ */
  /* Gabarit HTML de la section                                          */
  /* ------------------------------------------------------------------ */
  const HTML = `
<agri-nutriapp-dashboard id="agriNutriApp"></agri-nutriapp-dashboard>
`;

  class AgriSection extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;
      this.innerHTML = HTML;
      if (I18N) I18N.translateTree(this);
    }
  }
  if (!customElements.get('agri-section')) customElements.define('agri-section', AgriSection);

  /* Libellés bilingues FR/EN des éléments <dashboard> (aria-label) */
  const ARIACode = {'agriNutriApp': {'fr': 'AgriNutri Intelligence · Ministère de l’Agriculture', 'en': 'AgriNutri Intelligence · Ministry of Agriculture'}};
  function syncAria() {
    if (!I18N) return;
    const fr = I18N.getLang() !== 'en';
    Object.keys(ARIACode).forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.setAttribute('aria-label', fr ? ARIACode[sel].fr : ARIACode[sel].en);
    });
  }
  if (I18N) { I18N.onChange(syncAria); syncAria(); }


})(window);
