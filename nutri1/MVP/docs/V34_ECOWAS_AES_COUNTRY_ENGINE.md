# NUTRI.N°1 V34 — ECOWAS + AES Country Engine

V34 fixes the regression where only Togo appeared.

The country selector is now populated from a dedicated manifest and is independent of the language dictionaries. Selecting a country rebuilds the language selector from that country's official + local languages.

Pilot:
- Togo → Français (default), Ewe, Kabyè

Other examples:
- Ghana → English, Ewe, Twi, Ga
- Nigeria → English, Hausa, Yoruba, Igbo
- Senegal → Français, Wolof, Pulaar, Sérère, Jola
- Burkina Faso → Français, Mooré, Dioula
- Mali → Français, Bambara, Fula, Songhay, Tamasheq
- Niger → Français, Hausa, Zarma, Fula
- Côte d'Ivoire → Français, Dioula, Baoulé, Sénoufo

The manifest contains the full deployment scope used by the prototype. Country legal/official-language status should be reviewed against current national law before production contracting; local-language availability is a product-language decision, not a claim of official status.
