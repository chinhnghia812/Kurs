import {
  Contract,
  Networks,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

export const QUOTE_REGISTRY_CONTRACT = 'CCZCCNJG5KVDGHFFV7RC7IJQ5LJC5HUYRZWFCTLAXVWGXXHGB4AGBXTT';
export const MAINNET_RPC_URL = 'https://soroban-rpc.mainnet.stellar.gateway.fm';
export const MAINNET_PASSPHRASE = Networks.PUBLIC;

const server = new rpc.Server(MAINNET_RPC_URL);
const contract = new Contract(QUOTE_REGISTRY_CONTRACT);

export async function readPublishedRate(sourceAddress: string, pair: string) {
  const account = await server.getAccount(sourceAddress);
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: MAINNET_PASSPHRASE,
  })
    .addOperation(contract.call('get_rate', nativeToScVal(pair)))
    .setTimeout(60)
    .build();
  const simulation = await server.simulateTransaction(transaction);
  if ('error' in simulation && simulation.error) throw new Error(simulation.error);
  if (!('result' in simulation) || !simulation.result?.retval) {
    throw new Error(`No on-chain rate found for ${pair}`);
  }

  return scValToNative(simulation.result.retval) as {
    numerator: bigint;
    denominator: bigint;
    valid_until: number;
  };
}

export async function prepareRatePublication(
  sourceAddress: string,
  pair: string,
  numerator: bigint,
  denominator: bigint,
) {
  const account = await server.getAccount(sourceAddress);
  const latestLedger = await server.getLatestLedger();
  const transaction = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: MAINNET_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'publish_rate',
        nativeToScVal(pair),
        nativeToScVal(numerator, { type: 'i128' }),
        nativeToScVal(denominator, { type: 'i128' }),
        nativeToScVal(latestLedger.sequence + 10_000, { type: 'u32' }),
      ),
    )
    .setTimeout(60)
    .build();

  return server.prepareTransaction(transaction);
}

export async function submitPreparedTransaction(signedTxXdr: string) {
  const signed = TransactionBuilder.fromXDR(signedTxXdr, MAINNET_PASSPHRASE);
  return server.sendTransaction(signed);
}

export function isQuoteRegistryAdmin(address: string) {
  return address === 'GB7CLQ3LBM2TTYWVP4J3EU74YLYOPC5XX2MO77TIUECW4XPXNX67T4PL';
}
