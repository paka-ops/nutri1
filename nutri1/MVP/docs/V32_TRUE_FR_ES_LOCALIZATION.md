# NUTRI.N°1 V32 — True French & Spanish Whole-Platform Localization

This version fixes the previous issue by making English the canonical source and loading central JSON dictionaries for French and Spanish.

Key behavior:
1. The selected language is stored in localStorage.
2. French (`fr`) and Spanish (`es`) dictionaries are loaded from `/web/locales/`.
3. The runtime captures canonical English text before translation.
4. Every connected page/component is translated from the canonical text.
5. Dynamically rendered content is captured and translated automatically.
6. Buttons, headings, navigation, form placeholders, titles, ARIA labels and option labels are covered.
7. Togo can use French as its default official platform language.
8. Local Ewe and Kabyè dictionaries remain available.

Important: for production, all clinical/nutrition terminology should undergo professional French/Spanish/local-language review by domain experts. The runtime itself is language-neutral and ready for additional locale files.
