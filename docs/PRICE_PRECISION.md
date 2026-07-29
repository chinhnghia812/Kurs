# Price Precision

Kurs avoids floating-point arithmetic at contract boundaries.

- Stellar amounts use seven decimal places.
- Contract rates use integer numerator and denominator values.
- Conversion rounds once at the final asset amount.
- The server validates positive values and bounded precision.
- The wallet displays the exact amount that will be signed.

For example, a rate represented as `1/10` remains deterministic across Rust,
JavaScript, and ledger execution. UI formatting must never alter the signed
stroop amount.
