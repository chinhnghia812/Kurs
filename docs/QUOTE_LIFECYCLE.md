# Quote Lifecycle

A quote moves through a small, auditable lifecycle:

1. **Rate published** — an authorized account stores an integer ratio.
2. **Quote created** — the app binds pair, price, payer, merchant, and expiry.
3. **Quote reviewed** — the payer inspects the wallet transaction.
4. **Payment submitted** — Horizon accepts the signed payment.
5. **Quote paid** — authorized logic records the settlement reference.
6. **Quote expired** — unpaid quotes are no longer eligible for settlement.

Clients must not treat an expired quote or UI simulation as payment proof.
