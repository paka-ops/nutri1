/* ==========================================================================
   NUTRI.N°1 — Theme switch (dark by default, optional light theme)
   Sets <html data-theme="light"> for styles/theme-light.css and remembers the
   choice in localStorage ("nutri_theme"). Loaded in <head> to avoid a flash.
   API: window.NutriBentoTheme.get() · set('dark'|'light') · toggle()
   Event: document "nutri:themeChanged" { detail: { theme } }
   ========================================================================== */
(function (global) {
  'use strict';
  var doc = global.document, KEY = 'nutri_theme';
  function read() { try { return global.localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } }
  function get() { return doc.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function label() {
    var fr = (doc.documentElement.lang || '').toLowerCase().indexOf('fr') === 0 || (global.NUTRI_BENTO_I18N && global.NUTRI_BENTO_I18N.lang === 'fr');
    var light = get() === 'light';
    return fr ? (light ? 'Passer au thème sombre' : 'Passer au thème clair') : (light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  function sync() {
    var btn = doc.getElementById('bentoTheme'); if (!btn) return;
    btn.setAttribute('aria-pressed', String(get() === 'light'));
    btn.setAttribute('aria-label', label()); btn.setAttribute('title', label());
  }
  function set(theme, silent) {
    theme = theme === 'light' ? 'light' : 'dark';
    if (theme === 'light') doc.documentElement.setAttribute('data-theme', 'light'); else doc.documentElement.removeAttribute('data-theme');
    try { global.localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
    sync();
    if (!silent) { try { doc.dispatchEvent(new global.CustomEvent('nutri:themeChanged', { detail: { theme: theme } })); } catch (e) { /* ignore */ } }
  }
  function toggle() { set(get() === 'light' ? 'dark' : 'light'); }

  if (read() === 'light') doc.documentElement.setAttribute('data-theme', 'light');
  doc.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('#bentoTheme') : null;
    if (btn) toggle();
  });
  doc.addEventListener('DOMContentLoaded', function () {
    sync();
    var I18N = global.NUTRI_BENTO_I18N;
    if (I18N && typeof I18N.onChange === 'function') I18N.onChange(sync);
  });
  global.NutriBentoTheme = { get: get, set: set, toggle: toggle };
})(window);
