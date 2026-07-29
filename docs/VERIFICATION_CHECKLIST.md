# Verification Checklist

- [ ] Live Vercel application returns HTTP 200.
- [ ] Freighter reports Stellar Mainnet.
- [ ] Contract ID matches the deployment manifest.
- [ ] `get_rate` simulation returns the expected pair.
- [ ] `publish_rate` requests administrator authorization.
- [ ] Published numerator and denominator are positive.
- [ ] Functional transaction is successful in Stellar Expert.
- [ ] Issued asset code and issuer both match configuration.
- [ ] Merchant account has the required trustline.
- [ ] No private key, seed phrase, or provider secret is committed.

Run application and contract tests before release.
