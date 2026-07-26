import { index, pgEnum, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// ── Merchants ──────────────────────────────────────────────────────────────────
export const merchants = pgTable(
  'merchants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    stellarAddress: text('stellar_address').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    addressIdx: index('merchants_address_idx').on(t.stellarAddress),
  }),
);
export type Merchant = typeof merchants.$inferSelect;
export type NewMerchant = typeof merchants.$inferInsert;

// ── Price Items ────────────────────────────────────────────────────────────────
export const priceItems = pgTable(
  'price_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    basePriceUsdc: text('base_price_usdc').notNull(), // e.g. "1500000" = 1.5 USDC (6 decimals)
    currencyCode: text('currency_code').notNull().default('USDC'),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    merchantIdx: index('price_items_merchant_idx').on(t.merchantId),
  }),
);
export type PriceItem = typeof priceItems.$inferSelect;
export type NewPriceItem = typeof priceItems.$inferInsert;

// ── FX Rates ───────────────────────────────────────────────────────────────────
export const fxRates = pgTable(
  'fx_rates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pair: text('pair').notNull(), // e.g. "USDC_PHP"
    rate: real('rate').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pairIdx: index('fx_rates_pair_idx').on(t.pair),
  }),
);
export type FxRate = typeof fxRates.$inferSelect;
export type NewFxRate = typeof fxRates.$inferInsert;

// ── Payments ───────────────────────────────────────────────────────────────────
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const paymentStatusEnum = pgEnum('payment_status', PAYMENT_STATUSES);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => priceItems.id, { onDelete: 'cascade' }),
    amountUsdc: text('amount_usdc').notNull(), // 6-decimal bigint string
    stellarTxHash: text('stellar_tx_hash'),
    status: paymentStatusEnum('status').notNull().default('pending'),
    memo: text('memo').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    itemIdx: index('payments_item_idx').on(t.itemId),
    statusIdx: index('payments_status_idx').on(t.status),
  }),
);
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
