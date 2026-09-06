# NUTRI.N°1 V37 — Payments restored to V17 presentation

The payment interface has been reverted to the original V17-style presentation:
- Existing `Payments` page is used.
- Existing `#paymentMethods` container is used.
- Existing `.grid3` + `.card` visual system is used.
- No separate V35/V36 payment panel is added.
- Selecting a country re-renders all configured methods inside the original payment cards.

Requested examples:
Togo: Bank Card, Mixx by Yas, Flooz
Ghana: Bank Card, MTN MoMo, Telecel Cash, AirtelTigo Money
Côte d'Ivoire: Bank Card, Orange Money, MTN MoMo, Moov Money, Wave
Senegal: Bank Card, Wave, Orange Money, Free Money
Nigeria: Bank Card, OPay, PalmPay, Bank Transfer / USSD
Benin: Bank Card, MTN MoMo, Moov Money
Burkina Faso: Bank Card, Orange Money, Moov Money
Mali: Bank Card, Orange Money, Moov Money
Niger: Bank Card, Airtel Money, Moov Money

This version changes only the payment presentation/logic and keeps the V17-style page structure.
