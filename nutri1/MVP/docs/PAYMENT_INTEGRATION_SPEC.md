# Payment Integration Specification

## Architecture
NUTRI.N°1 → Payment Orchestrator → Provider Adapter → Provider API → Webhook → Transaction Ledger.

## Adapter interface
- create_checkout
- verify_transaction
- handle_webhook
- refund (where supported)
- reconcile

## Providers
- CARD: approved card payment gateway
- MIXX_BY_YAS: official merchant/API integration
- FLOOZ: official merchant/API integration

Do not collect raw card numbers in NUTRI.N°1 servers when tokenized provider checkout is available. Use provider-hosted/tokenized payment flows and comply with applicable security requirements.
