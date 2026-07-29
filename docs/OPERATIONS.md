# Operations

Monitor the following production signals:

- quote publication and read failures;
- stale-rate frequency;
- payment prepare-to-confirm conversion;
- expired unsigned payment intents;
- Horizon submission errors;
- merchant trustline and destination failures;
- Soroban RPC latency;
- Vercel server and client errors.

Every confirmed payment should retain its transaction hash, quote identifier,
asset code, issuer, amount, and merchant account for reconciliation.
