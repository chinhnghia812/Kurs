import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { env, USDC_ASSET_ISSUER_VALUE } from '@/server/config/env';
import { AppError } from '@/server/lib/http';

export function getServer(): Horizon.Server {
  return new Horizon.Server(env.STELLAR_HORIZON_URL, { allowHttp: false });
}

export function getNetworkPassphrase(): string {
  if (env.STELLAR_NETWORK === 'public') return Networks.PUBLIC;
  if (env.STELLAR_NETWORK === 'futurenet') return Networks.FUTURENET;
  return Networks.TESTNET;
}

export function getUsdcAsset(): Asset {
  return new Asset(env.USDC_ASSET_CODE, USDC_ASSET_ISSUER_VALUE);
}

function amountFromMinor(amountMinor: string): string {
  if (!/^\d+$/.test(amountMinor) || BigInt(amountMinor) <= 0n) {
    throw new AppError(
      'INVALID_INPUT',
      'Payment amount must be a positive integer in minor units',
      400,
    );
  }
  const amount = BigInt(amountMinor);
  return `${amount / 10_000_000n}.${(amount % 10_000_000n).toString().padStart(7, '0')}`;
}

export function validateStellarAddress(address: string): void {
  try {
    Keypair.fromPublicKey(address);
  } catch {
    throw new AppError('INVALID_PUBLIC_KEY', `Invalid Stellar address: ${address}`, 400);
  }
}

/** Build an unsigned payment. The server never receives a secret key. */
export async function buildUnsignedPayment(params: {
  senderAddress: string;
  recipientAddress: string;
  amountMinor: string;
  memo?: string;
}): Promise<{ unsignedXdr: string; unsignedTxDigest: string; amount: string }> {
  const server = getServer();
  const senderAccount = await server.loadAccount(params.senderAddress);
  const recipientAccount = await server.loadAccount(params.recipientAddress);
  const asset = getUsdcAsset();
  const hasTrustline = recipientAccount.balances.some(
    (balance) =>
      'asset_code' in balance &&
      balance.asset_code === asset.getCode() &&
      balance.asset_issuer === asset.getIssuer(),
  );
  if (!hasTrustline) {
    throw new AppError('CONFLICT', 'Recipient has no trustline for the configured asset', 409);
  }

  let builder = new TransactionBuilder(senderAccount, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  });
  if (params.memo) builder = builder.addMemo(Memo.text(params.memo.slice(0, 28)));
  const tx = builder
    .addOperation(
      Operation.payment({
        destination: params.recipientAddress,
        asset,
        amount: amountFromMinor(params.amountMinor),
      }),
    )
    .setTimeout(30)
    .build();
  return {
    unsignedXdr: tx.toXDR(),
    unsignedTxDigest: Buffer.from(tx.hash()).toString('hex').toUpperCase(),
    amount: amountFromMinor(params.amountMinor),
  };
}

/** Verify the signed envelope against the stored intent, then submit to Horizon. */
export async function submitSignedPayment(params: {
  signedXdr: string;
  senderAddress: string;
  recipientAddress: string;
  amountMinor: string;
}): Promise<{ txHash: string; ledger: number }> {
  let tx: ReturnType<typeof TransactionBuilder.fromXDR>;
  try {
    tx = TransactionBuilder.fromXDR(params.signedXdr, getNetworkPassphrase());
  } catch {
    throw new AppError('INVALID_INPUT', 'signedXdr is not a valid Stellar transaction', 400);
  }
  const source = (tx as unknown as { source?: string }).source;
  if (source !== params.senderAddress || tx.signatures.length === 0) {
    throw new AppError('UNAUTHORIZED', 'Transaction is not signed by the payment sender', 401);
  }
  const senderKeypair = Keypair.fromPublicKey(params.senderAddress);
  if (
    !tx.signatures.some((signature) => {
      try {
        return senderKeypair.verify(tx.hash(), signature.signature());
      } catch {
        return false;
      }
    })
  ) {
    throw new AppError(
      'UNAUTHORIZED',
      'Transaction signature does not match the payment sender',
      401,
    );
  }

  const operations = tx.operations;
  if (operations.length !== 1 || operations[0]?.type !== 'payment') {
    throw new AppError(
      'INVALID_INPUT',
      'Transaction must contain exactly one payment operation',
      400,
    );
  }
  const operation = operations[0] as (typeof operations)[number] & {
    destination?: string;
    amount?: string;
    asset?: Asset;
  };
  const configured = getUsdcAsset();
  if (
    operation.destination !== params.recipientAddress ||
    operation.amount !== amountFromMinor(params.amountMinor) ||
    operation.asset?.getCode?.() !== configured.getCode() ||
    operation.asset?.getIssuer?.() !== configured.getIssuer()
  ) {
    throw new AppError(
      'INVALID_INPUT',
      'Signed transaction does not match the payment intent',
      400,
    );
  }

  const result = await getServer().submitTransaction(tx);
  if (!result.hash || !Number.isInteger(result.ledger)) {
    throw new AppError('INTERNAL', 'Horizon returned incomplete payment confirmation', 502);
  }
  return { txHash: result.hash, ledger: result.ledger };
}
