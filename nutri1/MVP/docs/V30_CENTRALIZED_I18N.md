# NUTRI.N°1 V30 — Centralized Production i18n Foundation

Base: V29.

This version replaces the previous fragile text replacement approach with a centralized localization architecture:
- `/web/locales/en.json`
- `/web/locales/fr.json`
- `/web/locales/es.json`
- `/web/locales/ewe.json`
- `/web/locales/kab.json`
- canonical English keys
- centralized runtime loader
- whole-SPA visible-text localization
- dynamic DOM capture for newly rendered components
- placeholders and titles
- official languages: English, French, Spanish
- local languages: Ewe and Kabyè
- extensible for all ECOWAS/AES country languages

The locale dictionaries are intentionally JSON-based so translators, linguists and domain experts can maintain them independently of application code.

For clinical/government production, Ewe/Kabyè terminology must be professionally validated by native speakers and nutrition/health experts.
