# Failure Modes

| Failure | Expected handling |
|---|---|
| Stale rate | Reject quote creation and request a fresh rate |
| Expired quote | Build a new quote; do not reuse payment intent |
| Wrong issuer | Reject before signing or submission |
| Missing trustline | Explain the required asset relationship |
| Sequence mismatch | Reload account and rebuild transaction |
| RPC unavailable | Preserve intent and retry with bounded backoff |
| Duplicate confirmation | Return the existing idempotent result |

Failures must not be converted into fake success records.
