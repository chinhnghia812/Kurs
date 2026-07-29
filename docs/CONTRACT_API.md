# Quote Registry Contract API

The contract lives at `contracts/quote-registry/src/lib.rs`.

| Function | Purpose |
|---|---|
| `initialize` | Stores the registry administrator |
| `publish_rate` | Writes a numerator/denominator rate for a pair |
| `get_rate` | Reads the current rate and metadata |
| `create_quote` | Creates a bounded payment quote |
| `get_quote` | Reads quote terms and status |
| `mark_paid` | Marks a quote paid after authorization |

Rates use integer ratios to avoid floating-point behavior in contract execution.
