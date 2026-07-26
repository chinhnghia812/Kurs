# Mainnet readiness

Kurs is currently a hackathon demo. The public preview uses in-memory demo data so the price widget and SEP-7 request flow can be reviewed without a database or wallet secret.

Before enabling wallet signing or mainnet payments, configure and verify:

- a production database and migration;
- a real Stellar merchant account and USDC trustline;
- external wallet signing with no secret key stored by the app;
- quote expiry, idempotency, Horizon confirmation, and reconciliation;
- a documented rollback and operational owner.

No private key, seed phrase, GitHub token, or provider secret belongs in this repository.
