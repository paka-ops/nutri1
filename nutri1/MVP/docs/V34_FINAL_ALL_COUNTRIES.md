# NUTRI.N°1 V34 Final — All ECOWAS + AES Countries

This final V34 corrects two critical regressions:

1. The country list is embedded in the application, so it cannot collapse to Togo because of a failed JSON fetch.
2. Locale dictionaries (EN/FR/ES/EWE/KAB) are embedded in the application, so French and Spanish work even when the prototype is opened locally from a ZIP/file://.

Deployment scope:
- 12 current ECOWAS member states: Benin, Cabo Verde, Côte d'Ivoire, The Gambia, Ghana, Guinea, Guinea-Bissau, Liberia, Nigeria, Senegal, Sierra Leone, Togo.
- 3 AES states: Burkina Faso, Mali, Niger.

Country selection rebuilds the language selector from official + local language configuration.

Togo defaults to French and offers Ewe + Kabyè as local options.

Note: Portugal is the official language for Cabo Verde and Guinea-Bissau, so those countries correctly expose Portuguese rather than forcing French/English/Spanish. Country legal language status should be verified before government production deployment.
