# Multi-Currency Price Tag FX Widget

An FX-aware price tag and payment request experience for Stellar issued assets.

## Stellar surface

- Classic Stellar USDC uses seven-decimal stroops (`1 USDC = 10,000,000`)

- Horizon payment intent and transaction verification
- Issued-asset issuer identity and quote-expiry checks
- SEP-7-compatible payment request direction for wallet signing
- External-signer payment flow: prepare an unsigned XDR, verify the signed digest and exact USDC payment, then submit through Horizon

## Readiness status

This repository is in hackathon readiness hardening. Simulation endpoints are demo-only and disabled on public network configuration. No mainnet deployment or transaction proof is claimed yet.

See [`docs/MAINNET_READINESS.md`](docs/MAINNET_READINESS.md) for the evidence checklist.

## Local demo

The public preview runs in demo mode without a database or wallet connection. For a local run, install dependencies and use `npm run dev`.

## Screenshots

![Kurs landing screen](screen-shot/01-landing.jpg)
![Merchant banner](screen-shot/02-merchant-banner.jpg)
![Multi-currency menu](screen-shot/03-menu-items.jpg)
![SEP-7 payment panel](screen-shot/05-qr-panel.jpg)

Keep all credentials outside Git. Wallet signing and mainnet broadcasting are intentionally deferred from this demo.

## Mainnet gate

Mainnet requires a real quote provider, issuer configuration, wallet-signed payment, Horizon confirmation, idempotency, and an auditable quote/payment reconciliation path.

The production payment path is `POST /api/payments/prepare` with an `Idempotency-Key`, followed by external wallet signing and `POST /api/payments/:id/confirm`. The server never stores or receives a secret key. Apply the `drizzle/0001_unsigned_payment_intents.sql` migration before enabling the route.
