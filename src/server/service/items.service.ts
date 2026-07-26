import { desc, eq } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import type { NewPriceItem, PriceItem } from '@/server/db/schema';
import { merchants, priceItems } from '@/server/db/schema';
import { getDemoItem, listDemoItems } from '@/server/demo-store';
import { AppError } from '@/server/lib/http';

export async function listItems(): Promise<
  (PriceItem & { merchantName: string; merchantAddress: string })[]
> {
  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) return listDemoItems();

  const rows = await db
    .select({
      id: priceItems.id,
      name: priceItems.name,
      basePriceUsdc: priceItems.basePriceUsdc,
      currencyCode: priceItems.currencyCode,
      merchantId: priceItems.merchantId,
      createdAt: priceItems.createdAt,
      merchantName: merchants.name,
      merchantAddress: merchants.stellarAddress,
    })
    .from(priceItems)
    .innerJoin(merchants, eq(priceItems.merchantId, merchants.id))
    .orderBy(desc(priceItems.createdAt));
  return rows;
}

export async function getItem(
  id: string,
): Promise<PriceItem & { merchantName: string; merchantAddress: string }> {
  if (env.DEMO_MODE || !env.DRIZZLE_DATABASE_URL) {
    try {
      return getDemoItem(id);
    } catch {
      throw new AppError('NOT_FOUND', `Item ${id} not found`, 404);
    }
  }

  const rows = await db
    .select({
      id: priceItems.id,
      name: priceItems.name,
      basePriceUsdc: priceItems.basePriceUsdc,
      currencyCode: priceItems.currencyCode,
      merchantId: priceItems.merchantId,
      createdAt: priceItems.createdAt,
      merchantName: merchants.name,
      merchantAddress: merchants.stellarAddress,
    })
    .from(priceItems)
    .innerJoin(merchants, eq(priceItems.merchantId, merchants.id))
    .where(eq(priceItems.id, id));

  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', `Item ${id} not found`, 404);
  }
  return rows[0];
}

export async function createItem(data: NewPriceItem): Promise<PriceItem> {
  const [item] = await db.insert(priceItems).values(data).returning();
  return item;
}
