# Observability

Useful structured fields for logs and metrics include:

- request and quote identifiers;
- Stellar network;
- asset code and issuer;
- merchant account;
- transaction hash;
- Horizon result code;
- contract method;
- RPC latency;
- quote age and expiry;
- idempotency outcome.

Never log signed XDR unnecessarily, wallet secrets, seed phrases, or provider
credentials.
