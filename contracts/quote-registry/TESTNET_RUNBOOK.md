# Contract deployment runbook

1. Build the WASM and record its SHA-256 in `deployment.json`.
2. Generate upload, deploy, initialize, and method-call XDRs using the scripts in this repo.
3. Simulate each XDR against Soroban RPC.
4. Import each XDR into Stellar Lab or the app's wallet flow.
5. Select the intended network in Freighter and sign only after checking source, fee, and contract call.
6. Submit the signed XDR and record only public transaction hashes and contract IDs.

The same sequence applies to mainnet. Do not copy secret keys into scripts.
