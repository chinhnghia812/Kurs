# Merchant Guide

Merchants should configure one receiving account per environment and verify:

- the account exists on the selected Stellar network;
- the account has a trustline for the configured issued asset;
- the configured issuer is the intended issuer;
- prices are represented in seven-decimal stroops;
- quote expiry is short enough to limit rate risk;
- submitted payments reconcile to quote identifiers;
- refunds use a separately reviewed workflow.

Before opening the checkout publicly, complete a low-value payment and confirm
the result in Horizon.
