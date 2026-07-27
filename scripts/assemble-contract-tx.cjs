const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  Address,
  Networks,
  Operation,
  TransactionBuilder,
  rpc,
} = require('@stellar/stellar-sdk');

const SOURCE = 'GCY6FFLRRQXWRRZLF3PR35KY5IGBKMDBDASKLYOGQGRN2XCXQ2EGNUQX';
const ROOT = path.resolve(__dirname, '..');
const WASM_PATH = path.resolve(ROOT, 'contracts/quote-registry/target/wasm32v1-none/release/kurs_quote_registry_contract.wasm');
const WASM_HASH = 'b63f93ff5d35e24d53d92cb27ea473e03f7efcb2121b2dfb330df80d2ea6e0ba';
const SALT = crypto.createHash('sha256').update('017-kurs-quote-registry-v1').digest();

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function config() {
  const network = option('network', 'mainnet');
  if (!['mainnet', 'testnet'].includes(network)) throw new Error('Use --network mainnet or testnet');
  return network === 'mainnet'
    ? { rpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm', passphrase: Networks.PUBLIC, timeout: 86400 }
    : { rpcUrl: 'https://soroban-testnet.stellar.org:443', passphrase: Networks.TESTNET, timeout: 1800 };
}

function outputPath(stage, network) {
  return path.resolve(ROOT, `contracts/quote-registry/${network}-${stage}-assembled.xdr`);
}

async function main() {
  const stage = option('stage');
  if (!['upload', 'deploy', 'initialize'].includes(stage)) {
    throw new Error('Usage: npm run contract:assemble -- --stage upload|deploy|initialize [--network mainnet|testnet] [--contract-id C...]');
  }
  const network = option('network', 'mainnet');
  const settings = config();
  const server = new rpc.Server(settings.rpcUrl);
  const account = await server.getAccount(SOURCE);
  const builder = new TransactionBuilder(account, { fee: '100', networkPassphrase: settings.passphrase });

  if (stage === 'upload') {
    builder.addOperation(Operation.uploadContractWasm({ wasm: fs.readFileSync(WASM_PATH) }));
  } else if (stage === 'deploy') {
    builder.addOperation(Operation.createCustomContract({
      address: Address.fromString(SOURCE),
      wasmHash: Buffer.from(WASM_HASH, 'hex'),
      salt: SALT,
    }));
  } else {
    const contractId = option('contract-id');
    if (!contractId) throw new Error('--contract-id C... is required for initialize');
    builder.addOperation(Operation.invokeContractFunction({
      contract: contractId,
      function: 'initialize',
      args: [Address.fromString(SOURCE).toScVal()],
    }));
  }

  const raw = builder.setTimeout(settings.timeout).build();
  const simulation = await server.simulateTransaction(raw);
  if (simulation.error) throw new Error(simulation.error);
  const assembled = rpc.assembleTransaction(raw, simulation).build();
  const xdr = assembled.toXDR();
  const destination = outputPath(stage, network);
  fs.writeFileSync(destination, `${xdr}\n`, { mode: 0o600 });
  const result = stage === 'deploy' ? simulation.result?.retval : null;
  console.log(JSON.stringify({
    stage,
    network,
    outputPath: destination,
    xdr,
    hash: assembled.hash().toString('hex'),
    sequence: assembled.sequence.toString(),
    contractId: result ? Address.fromScVal(result).toString() : null,
    wasmSha256: stage === 'upload' ? WASM_HASH : undefined,
    salt: stage === 'deploy' ? SALT.toString('hex') : undefined,
    minResourceFee: simulation.minResourceFee,
    latestLedger: simulation.latestLedger,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
