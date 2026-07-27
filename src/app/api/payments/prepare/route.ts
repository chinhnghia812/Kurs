import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { created, fail, fromError } from '@/server/lib/http';
import {
  buildUnsignedPayment,
  getNetworkPassphrase,
  validateStellarAddress,
} from '@/server/lib/stellar-payment';
import { attachPreparedPayment, getPayment } from '@/server/service/payments.service';

const schema = z.object({
  paymentId: z.string().min(1),
  senderAddress: z.string().length(56),
});

/** Build a real unsigned classic payment; Freighter signs it in the browser. */
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success)
      return fail('INVALID_INPUT', 'paymentId and senderAddress are required', 400);
    const { paymentId, senderAddress } = parsed.data;
    validateStellarAddress(senderAddress);

    const payment = await getPayment(paymentId);
    if (payment.status !== 'pending') return fail('CONFLICT', 'Payment is no longer pending', 409);
    if (!payment.recipientAddress) return fail('CONFLICT', 'Payment has no merchant address', 409);

    if (
      payment.unsignedXdr &&
      payment.unsignedTxDigest &&
      payment.senderAddress === senderAddress
    ) {
      return created({
        payment,
        unsignedXdr: payment.unsignedXdr,
        unsignedTxDigest: payment.unsignedTxDigest,
        network: process.env.STELLAR_NETWORK ?? 'testnet',
        networkPassphrase: getNetworkPassphrase(),
        recipientAddress: payment.recipientAddress,
        idempotent: true,
      });
    }

    const prepared = await buildUnsignedPayment({
      senderAddress,
      recipientAddress: payment.recipientAddress,
      amountMinor: payment.amountUsdc,
      memo: payment.memo,
    });
    const updated = await attachPreparedPayment(
      payment.id,
      senderAddress,
      prepared.unsignedXdr,
      prepared.unsignedTxDigest,
    );
    return created({
      payment: updated,
      unsignedXdr: prepared.unsignedXdr,
      unsignedTxDigest: prepared.unsignedTxDigest,
      network: process.env.STELLAR_NETWORK ?? 'testnet',
      networkPassphrase: getNetworkPassphrase(),
      recipientAddress: payment.recipientAddress,
    });
  } catch (err) {
    return fromError(err);
  }
}
