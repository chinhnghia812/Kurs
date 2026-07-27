# Kurs quote registry contract

Minimal Soroban contract for project 017. It stores short-lived FX rates and
payment quotes, then marks a quote paid after the payer authorizes the call.
The existing classic USDC payment remains the settlement operation; this
contract supplies the on-chain quote/payment state for the product.

```bash
cargo test --offline --manifest-path contracts/quote-registry/Cargo.toml
rustup run stable cargo build --manifest-path contracts/quote-registry/Cargo.toml --target wasm32v1-none --release
```

Deploy and initialize through the unsigned XDR runbook. Never put a private key
in the repository or environment.
