# Testing Guide

Run the application suite:

```bash
npm test
npm run build
```

Run the Soroban contract suite:

```bash
cargo test --offline --manifest-path contracts/quote-registry/Cargo.toml
```

Tests should cover quote arithmetic, expiry, authorization, intent matching,
issued-asset identity, and duplicate confirmation. Mainnet smoke tests should
use low values and externally signed accounts.
