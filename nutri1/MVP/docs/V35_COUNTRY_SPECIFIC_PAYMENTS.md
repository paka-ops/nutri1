# NUTRI.N°1 V35 — Country-Specific Payments

V35 restores the payment selector as a country-aware component.

Behavior:
Country → currency + available payment methods.

Every configured country includes a bank-card option where appropriate and country-specific mobile money / wallet / bank-transfer options.

Togo pilot:
- Bank card — Visa / Mastercard
- Mixx by Yas
- Flooz
- XOF

Other examples:
- Ghana → card, MTN MoMo, Telecel Cash, AirtelTigo Money
- Côte d'Ivoire → card, Orange Money, MTN MoMo, Moov Money, Wave
- Senegal → card, Wave, Orange Money, Free Money
- Nigeria → card, OPay, PalmPay, bank transfer/USSD
- Benin → card, MTN MoMo, Moov Money
- Burkina Faso → card, Orange Money, Moov Money
- Mali → card, Orange Money, Moov Money
- Niger → card, Airtel Money, Moov Money

The UI configuration is not itself a live payment gateway. Real transactions require contracts, merchant accounts, PSP/acquirer integrations, webhooks, reconciliation and production credentials.
