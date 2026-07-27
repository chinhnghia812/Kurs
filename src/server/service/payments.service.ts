import { and, desc, eq, isNull } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import type { NewPayment, Payment } from '@/server/db/schema';
import { payments, priceItems } from '@/server/db/schema';
import {
  addDemoPayment,
  getDemoItem,
  getDemoPayment,
  listDemoPayments,
  markDemoPaymentPaid,
  updateDemoPayment,
} from '@/server/demo-store';
import { minorToUsdc } from '@/server/lib/fx';
import { AppError } from '@/server/lib/http';
import { buildSep7PayUri } from '@/server/lib/sep7';

export interface PaymentWithUri extends Payment {
  sep7Uri: string;
  amountUsdcDisplay: string;
  itemName: string;
}

export async function createPayment(
  itemId: string,
  merchantAddress: string,
  options: { senderAddress?: string; idempotencyKey?: string } = {},
): Promise<PaymentWithUri> {
  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) {
    let item: ReturnType<typeof getDemoItem>;
    try {
      item = getDemoItem(itemId);
    } catch {
      throw new AppError('NOT_FOUND', `Item ${itemId} not found`, 404);
    }
    const existing = options.idempotencyKey
      ? listDemoPayments().find((entry) => entry.idempotencyKey === options.idempotencyKey)
      : undefined;
    if (existing) {
      if (existing.itemId !== itemId || existing.recipientAddress !== merchantAddress) {
        throw new AppError('CONFLICT', 'Idempotency key is already bound to another payment', 409);
      }
      return {
        ...existing,
        sep7Uri: buildSep7PayUri({
          destination: merchantAddress,
          amountUsdc: minorToUsdc(item.basePriceUsdc),
          memo: existing.memo,
        }),
        amountUsdcDisplay: minorToUsdc(item.basePriceUsdc),
        itemName: item.name,
      };
    }
    const now = new Date();
    const payment = addDemoPayment({
      id: crypto.randomUUID(),
      itemId,
      amountUsdc: item.basePriceUsdc,
      stellarTxHash: null,
      senderAddress: options.senderAddress ?? null,
      recipientAddress: merchantAddress,
      idempotencyKey: options.idempotencyKey ?? null,
      unsignedXdr: null,
      unsignedTxDigest: null,
      status: 'pending',
      memo: `ORDER-${Date.now().toString(36).toUpperCase()}`,
      createdAt: now,
    });
    return {
      ...payment,
      sep7Uri: buildSep7PayUri({
        destination: merchantAddress,
        amountUsdc: minorToUsdc(item.basePriceUsdc),
        memo: payment.memo,
      }),
      amountUsdcDisplay: minorToUsdc(item.basePriceUsdc),
      itemName: item.name,
    };
  }

  // Load item for amount
  const itemRows = await db.select().from(priceItems).where(eq(priceItems.id, itemId));
  if (itemRows.length === 0) {
    throw new AppError('NOT_FOUND', `Item ${itemId} not found`, 404);
  }
  const item = itemRows[0];
  const memo = `ORDER-${Date.now().toString(36).toUpperCase()}`;
  const amountDisplay = minorToUsdc(item.basePriceUsdc);

  const payData: NewPayment = {
    itemId,
    amountUsdc: item.basePriceUsdc,
    memo,
    senderAddress: options.senderAddress ?? null,
    recipientAddress: merchantAddress,
    idempotencyKey: options.idempotencyKey ?? null,
    status: 'pending',
  };

  if (options.idempotencyKey) {
    const existing = await db
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, options.idempotencyKey));
    if (existing.length > 0) {
      if (existing[0].itemId !== itemId || existing[0].recipientAddress !== merchantAddress) {
        throw new AppError('CONFLICT', 'Idempotency key is already bound to another payment', 409);
      }
      return {
        ...existing[0],
        sep7Uri: buildSep7PayUri({
          destination: merchantAddress,
          amountUsdc: amountDisplay,
          memo: existing[0].memo,
        }),
        amountUsdcDisplay: amountDisplay,
        itemName: item.name,
      };
    }
  }

  const [payment] = await db.insert(payments).values(payData).returning();

  const sep7Uri = buildSep7PayUri({
    destination: merchantAddress,
    amountUsdc: amountDisplay,
    memo,
  });

  return {
    ...payment,
    sep7Uri,
    amountUsdcDisplay: amountDisplay,
    itemName: item.name,
  };
}

export async function getPayment(id: string): Promise<Payment> {
  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) {
    const payment = getDemoPayment(id);
    if (!payment) throw new AppError('NOT_FOUND', `Payment ${id} not found`, 404);
    return payment;
  }

  const rows = await db.select().from(payments).where(eq(payments.id, id));
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', `Payment ${id} not found`, 404);
  }
  return rows[0];
}

export async function markPaid(id: string, txHash?: string): Promise<Payment> {
  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) {
    try {
      return markDemoPaymentPaid(id, txHash ?? null);
    } catch {
      throw new AppError('NOT_FOUND', `Payment ${id} not found`, 404);
    }
  }

  const rows = await db
    .update(payments)
    .set({ status: 'paid', stellarTxHash: txHash ?? null })
    .where(eq(payments.id, id))
    .returning();
  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', `Payment ${id} not found`, 404);
  }
  return rows[0];
}

export async function attachPreparedPayment(
  id: string,
  senderAddress: string,
  unsignedXdr: string,
  unsignedTxDigest: string,
): Promise<Payment> {
  const current = await getPayment(id);
  if (current.status !== 'pending') {
    throw new AppError('CONFLICT', 'Payment is no longer pending', 409);
  }
  if (current.unsignedXdr || current.unsignedTxDigest) {
    if (
      current.senderAddress === senderAddress &&
      current.unsignedTxDigest?.toUpperCase() === unsignedTxDigest.toUpperCase()
    ) {
      return current;
    }
    throw new AppError('CONFLICT', 'Payment already has a different prepared transaction', 409);
  }

  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) {
    return updateDemoPayment(id, { senderAddress, unsignedXdr, unsignedTxDigest });
  }

  const rows = await db
    .update(payments)
    .set({ senderAddress, unsignedXdr, unsignedTxDigest })
    .where(and(eq(payments.id, id), eq(payments.status, 'pending'), isNull(payments.unsignedXdr)))
    .returning();
  if (rows.length === 0) {
    throw new AppError('CONFLICT', 'Payment was prepared by another request', 409);
  }
  return rows[0];
}

export async function confirmPreparedPayment(id: string, txHash: string): Promise<Payment> {
  const current = await getPayment(id);
  if (current.status === 'paid' && current.stellarTxHash === txHash) return current;
  if (current.status !== 'pending') {
    throw new AppError('CONFLICT', 'Payment is no longer pending', 409);
  }

  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) {
    return updateDemoPayment(id, { status: 'paid', stellarTxHash: txHash });
  }

  const rows = await db
    .update(payments)
    .set({ status: 'paid', stellarTxHash: txHash })
    .where(and(eq(payments.id, id), eq(payments.status, 'pending')))
    .returning();
  if (rows.length === 0) {
    throw new AppError('CONFLICT', 'Payment could not be confirmed', 409);
  }
  return rows[0];
}

export async function listPayments(): Promise<Payment[]> {
  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) return listDemoPayments();

  return db.select().from(payments).orderBy(desc(payments.createdAt));
}
