# NUTRI.N°1 V36 — Complete Country Payment Matrix

This version specifically fixes the payment regression.

The payment module is driven by ISO-like country codes and not by language labels.

For each selected country, the UI displays every configured method in that country's payment manifest.

Required matrix:
- Togo: Bank card, Mixx by Yas, Flooz
- Ghana: Bank card, MTN MoMo, Telecel Cash, AirtelTigo Money
- Côte d'Ivoire: Bank card, Orange Money, MTN MoMo, Moov Money, Wave
- Senegal: Bank card, Wave, Orange Money, Free Money
- Nigeria: Bank card, OPay, PalmPay, Bank Transfer / USSD
- Benin: Bank card, MTN MoMo, Moov Money
- Burkina Faso: Bank card, Orange Money, Moov Money
- Mali: Bank card, Orange Money, Moov Money
- Niger: Bank card, Airtel Money, Moov Money

Additional deployment countries also have configurations in the manifest.

The matrix is embedded in the application as a fallback so the demo continues to work when opened locally without network access.

Live payments still require production PSP/acquirer contracts, merchant credentials, API integration, webhooks, fraud controls, reconciliation and refunds.
