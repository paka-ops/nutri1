# NUTRI.N°1 V31 — Language & Country Intelligence Engine

V31 builds on V30's centralized i18n and adds a country-aware language engine.

Core flow:
Country → official languages + local languages → language selector → centralized locale dictionary → whole SPA.

Examples:
- Togo → Français + Ewe + Kabyè
- Ghana → English + Ewe + Twi + Ga
- Benin → Français + Fon + Yorùbá
- Nigeria → English + Hausa + Yorùbá + Igbo
- Senegal → Français + Wolof + Pulaar + Sérère + Jola
- Burkina Faso → Français + Mooré + Dioula
- Mali → Français + Bambara + Fula + Songhay + Tamasheq
- Niger → Français + Hausa + Zarma + Fula
- Côte d'Ivoire → Français + Dioula + Baoulé + Sénoufo
- Guinea → Français + Pular + Maninka + Susu
- Sierra Leone → English + Krio + Temne + Mende
- Liberia → English + Kpelle + Bassa + Vai
- The Gambia → English + Mandinka + Wolof + Fula
- Guinea-Bissau → Português + Kriol + Balanta + Fula
- Cabo Verde → Português + Kriolu
- São Tomé and Príncipe → Português + Forro

The engine preserves existing V30 dictionaries and is designed to add locale JSON files as languages are validated.

Production note: country/language policy and local-language medical/nutrition terminology must be validated by competent national institutions and native-speaking domain experts before official deployment. Some country language mappings are a technical demonstration foundation, not a claim about legal language status.
