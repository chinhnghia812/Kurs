# Deployment Checklist

- [ ] Production branch passes unit tests and build.
- [ ] Mainnet network passphrase is explicit.
- [ ] Horizon and Soroban RPC endpoints target Mainnet.
- [ ] Contract ID matches the deployment manifest.
- [ ] Merchant account and issued-asset issuer are reviewed.
- [ ] Database migration is applied when persistence is enabled.
- [ ] Session and provider secrets are encrypted in Vercel.
- [ ] Demo-only simulation cannot create production evidence.
- [ ] A low-value smoke transaction is publicly verifiable.
- [ ] Rollback owner and incident contact are known.
