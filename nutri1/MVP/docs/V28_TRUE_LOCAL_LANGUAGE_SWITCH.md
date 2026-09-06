# NUTRI.N°1 V28 — True Whole-Platform Local Language Switch

Base: V27.

Fixes the V27 issue where Ewe/Kabyè did not propagate across the interface.

Implementation:
- Language selector detects English, French, Portuguese, Ewe and Kabyè.
- All visible text nodes across every page are captured from their source text and translated when the language changes.
- Translation is reversible: switching back to English/French restores the source labels.
- Dynamically generated content is translated too (UNICEF, WHO, payments, marketplace, nutritionist/network, food cloud and other dashboards).
- Buttons, headings, navigation, cards, placeholders and select options are included.
- A mutation observer re-translates newly rendered UI.
- Togo's Ewe and Kabyè options are preserved through the existing country-language relationship.

The Ewe/Kabyè terminology included here is a prototype localization layer. For production, all health/nutrition terminology should be reviewed and approved by native-speaking linguists and local nutrition/medical experts.
