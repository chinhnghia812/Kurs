# Testnet quote and payment runbook

Kurs creates a quote/payment intent from a menu item, then uses a classic Stellar USDC payment. Prices are stored in six-decimal USDC units and converted to Stellar's seven-decimal amount format at the transaction boundary. No Soroban contract is required for this flow.

## Configure the accounts

Use a testnet `.env.local` configuration:

- `STELLAR_NETWORK=testnet`
- `STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org`
- the matching testnet USDC issuer and a merchant account that exists on testnet
- `DEMO_MODE=true` is acceptable for the in-memory quote store; use the migration and a PostgreSQL database for persistence

The sender must hold the configured USDC asset and enough XLM for fees. The merchant account must exist and have a trustline for the configured USDC issuer. The preview merchant address is a valid testnet account placeholder, but its trustline and funding must be verified before a real payment.

## Browser flow

1. Open the app in Chrome with Freighter enabled.
2. Select a menu item. Kurs creates a quote/payment intent and shows its SEP-7 URI and order memo.
3. Click **Connect Freighter** and confirm the displayed wallet address.
4. Click **Pay with Freighter**. The server loads both accounts, checks the merchant trustline, and returns an unsigned XDR and digest.
5. Review the recipient, asset, amount, memo, network, and fee in Freighter. Approve the signature.
6. Kurs submits the signed XDR to `/api/payments/:id/confirm`. The server verifies the digest, sender signature, one payment operation, exact destination, exact amount, and configured USDC asset before Horizon submission.
7. Save the returned transaction hash and verify it on the Stellar testnet explorer.

**Simulate Payment (demo)** only changes local/demo state. It is not a mainnet or testnet transaction and must not be counted as on-chain evidence.

## API shape

```text
POST /api/payments
  { itemId, merchantAddress }
POST /api/payments/prepare
  { paymentId, senderAddress }
Freighter signs data.unsignedXdr
POST /api/payments/<payment-id>/confirm
  { signedXdr }
```

If the merchant account or trustline check fails, fix the account configuration and create a new intent. Never paste a seed phrase or private key into the app, terminal, server environment, or repository.
