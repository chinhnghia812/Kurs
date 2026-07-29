# Security Boundaries

Kurs never stores a wallet private key. Freighter signs in the browser.

The confirmation boundary validates:

- network passphrase and source account;
- merchant destination;
- asset code and exact issuer;
- exact amount and memo;
- transaction digest and time bounds;
- quote identity and expiry;
- idempotency key.

Rate publishing is restricted to the contract administrator. Production
credentials belong in encrypted deployment settings, not source control.
