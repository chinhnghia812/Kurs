import { TransactionBuilder } from '@stellar/stellar-sdk';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { created, fail, fromError } from '@/server/lib/http';
import { getNetworkPassphrase, submitSignedPayment } from '@/server/lib/stellar-payment';
import { confirmPreparedPayment, getPayment } from '@/server/service/payments.service';

/** Verify a wallet-signed envelope against the prepared digest before broadcast. */
const schema = z.object({ signedXdr: z.string().min(1).max(100_000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payment = await getPayment(id);
    if (payment.status === 'paid' && payment.stellarTxHash) {
      return created({ payment, txHash: payment.stellarTxHash, idempotent: true });
    }
    if (!payment.unsignedTxDigest || !payment.senderAddress || !payment.recipientAddress) {
      return fail('CONFLICT', 'Payment has not been prepared', 409);
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return fail('INVALID_INPUT', 'signedXdr is required', 400);

    let tx: ReturnType<typeof TransactionBuilder.fromXDR>;
    try {
      tx = TransactionBuilder.fromXDR(parsed.data.signedXdr, getNetworkPassphrase());
    } catch {
      return fail('INVALID_INPUT', 'signedXdr is not a valid Stellar transaction', 400);
    }
    const digest = Buffer.from(tx.hash()).toString('hex').toUpperCase();
    if (digest !== payment.unsignedTxDigest.toUpperCase()) {
      return fail('CONFLICT', 'Submitted transaction does not match the prepared intent', 409);
    }

    const result = await submitSignedPayment({
      signedXdr: parsed.data.signedXdr,
      senderAddress: payment.senderAddress,
      recipientAddress: payment.recipientAddress,
      amountMinor: payment.amountUsdc,
    });
    if (digest !== result.txHash.toUpperCase()) {
      return fail('CONFLICT', 'Horizon returned a different transaction hash', 409);
    }
    const confirmed = await confirmPreparedPayment(id, result.txHash);
    return created({ payment: confirmed, txHash: result.txHash, ledger: result.ledger });
  } catch (err) {
    return fromError(err);
  }
}
