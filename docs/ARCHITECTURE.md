# Architecture

Kurs combines a merchant catalog, signed payment intents, and an on-chain FX
quote registry.

1. The merchant UI displays source prices and supported display currencies.
2. Quote helpers convert values with explicit numerator and denominator fields.
3. The Soroban registry stores rate pairs and their freshness metadata.
4. The server prepares an unsigned Stellar payment transaction.
5. Freighter signs after the user reviews the exact asset and merchant.
6. The confirmation route validates and submits the signed envelope.

Catalog preview data and real settlement evidence remain deliberately separate.
