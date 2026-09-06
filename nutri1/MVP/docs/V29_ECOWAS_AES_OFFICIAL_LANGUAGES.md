# NUTRI.N°1 V29 — ECOWAS + AES Official Language Edition

Base: V28.

Official platform interface languages now explicitly supported:
- English
- Français
- Español

Local-language layer retained:
- Ewe
- Kabyè

The localization engine captures the original visible UI text and re-applies translations across the whole SPA, including navigation, dashboard labels, dynamically inserted content, headings and common placeholders. Switching back to English restores the original interface.

The architecture is intentionally extensible for additional ECOWAS/AES local languages. Local-language medical/nutrition terminology should be validated by native speakers and domain experts before production.
