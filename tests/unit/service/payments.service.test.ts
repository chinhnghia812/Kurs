import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/server/lib/http';

vi.mock('../../../src/server/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../src/server/config/env', () => ({
  env: {
    DRIZZLE_DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    NODE_ENV: 'test',
    STELLAR_NETWORK: 'testnet',
  },
}));

import { db } from '../../../src/server/db/client';

const mockDb = db as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

describe('payments.service — getPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND when payment missing', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { getPayment } = await import('../../../src/server/service/payments.service');
    await expect(getPayment('missing-id')).rejects.toBeInstanceOf(AppError);
  });

  it('returns payment when found', async () => {
    const fakePayment = {
      id: 'pay-1',
      itemId: 'item-1',
      amountUsdc: '1500000',
      memo: 'ORDER-ABC',
      status: 'pending' as const,
      stellarTxHash: null,
      createdAt: new Date(),
    };
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([fakePayment]),
      }),
    });

    const { getPayment } = await import('../../../src/server/service/payments.service');
    const result = await getPayment('pay-1');
    expect(result.id).toBe('pay-1');
    expect(result.status).toBe('pending');
  });
});

describe('payments.service — markPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND when payment missing', async () => {
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { markPaid } = await import('../../../src/server/service/payments.service');
    await expect(markPaid('missing-id')).rejects.toBeInstanceOf(AppError);
  });

  it('returns updated payment on success', async () => {
    const updatedPayment = {
      id: 'pay-1',
      itemId: 'item-1',
      amountUsdc: '1500000',
      memo: 'ORDER-ABC',
      status: 'paid' as const,
      stellarTxHash: 'TXHASH123',
      createdAt: new Date(),
    };
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedPayment]),
        }),
      }),
    });

    const { markPaid } = await import('../../../src/server/service/payments.service');
    const result = await markPaid('pay-1', 'TXHASH123');
    expect(result.status).toBe('paid');
    expect(result.stellarTxHash).toBe('TXHASH123');
  });
});

describe('payments.service — listPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of payments', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    });

    const { listPayments } = await import('../../../src/server/service/payments.service');
    const result = await listPayments();
    expect(Array.isArray(result)).toBe(true);
  });
});
