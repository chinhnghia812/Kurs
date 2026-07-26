import type { Payment, PriceItem } from '@/server/db/schema';

export type DemoItem = PriceItem & {
  merchantName: string;
  merchantAddress: string;
};

export const DEMO_MERCHANT_ADDRESS = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZFH3UWUYNV4_ROSA_DEMO';

const merchantId = '11111111-1111-4111-8111-111111111111';
const demoItems: DemoItem[] = [
  {
    id: '22222222-2222-4222-8222-222222222221',
    name: 'Siopao',
    basePriceUsdc: '1500000',
    currencyCode: 'USDC',
    merchantId,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    merchantName: "Rosa's Sari-Sari Store",
    merchantAddress: DEMO_MERCHANT_ADDRESS,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Lumpia',
    basePriceUsdc: '2000000',
    currencyCode: 'USDC',
    merchantId,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    merchantName: "Rosa's Sari-Sari Store",
    merchantAddress: DEMO_MERCHANT_ADDRESS,
  },
  {
    id: '22222222-2222-4222-8222-222222222223',
    name: 'Halo-halo',
    basePriceUsdc: '3000000',
    currencyCode: 'USDC',
    merchantId,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    merchantName: "Rosa's Sari-Sari Store",
    merchantAddress: DEMO_MERCHANT_ADDRESS,
  },
];

const demoPayments = new Map<string, Payment>();

export function listDemoItems(): DemoItem[] {
  return demoItems;
}

export function getDemoItem(id: string): DemoItem {
  const item = demoItems.find((entry) => entry.id === id);
  if (!item) throw new Error(`Demo item ${id} not found`);
  return item;
}

export function addDemoPayment(payment: Payment): Payment {
  demoPayments.set(payment.id, payment);
  return payment;
}

export function getDemoPayment(id: string): Payment | undefined {
  return demoPayments.get(id);
}

export function listDemoPayments(): Payment[] {
  return [...demoPayments.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function markDemoPaymentPaid(id: string, txHash: string | null): Payment {
  const payment = demoPayments.get(id);
  if (!payment) throw new Error(`Demo payment ${id} not found`);
  const updated = { ...payment, status: 'paid' as const, stellarTxHash: txHash };
  demoPayments.set(id, updated);
  return updated;
}
