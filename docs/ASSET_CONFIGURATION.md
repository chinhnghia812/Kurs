# Asset Configuration

Issued assets are identified by both asset code and issuer account. Matching
only the code `USDC` is insufficient.

Production configuration must define:

- Stellar network passphrase;
- Horizon and Soroban RPC endpoints;
- asset code and issuer;
- merchant destination;
- quote validity duration;
- supported display currencies;
- decimal and rounding policy.

The sender and merchant need valid trustlines before an issued-asset payment can
succeed.
