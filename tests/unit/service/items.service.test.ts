import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/server/lib/http';

// Mock DB client before importing service
vi.mock('../../../src/server/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock env before config import
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
};

describe('items.service — getItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND when no rows returned', async () => {
    // Chain: select().from().innerJoin().where() → []
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { getItem } = await import('../../../src/server/service/items.service');
    await expect(getItem('nonexistent-id')).rejects.toBeInstanceOf(AppError);
  });

  it('returns item when found', async () => {
    const fakeItem = {
      id: 'abc',
      name: 'Siopao',
      basePriceUsdc: '1500000',
      currencyCode: 'USDC',
      merchantId: 'mid',
      createdAt: new Date(),
      merchantName: "Rosa's",
      merchantAddress: 'GABCDEF',
    };
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([fakeItem]),
        }),
      }),
    });

    const { getItem } = await import('../../../src/server/service/items.service');
    const result = await getItem('abc');
    expect(result.name).toBe('Siopao');
    expect(result.merchantName).toBe("Rosa's");
  });
});

describe('items.service — listItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no items', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { listItems } = await import('../../../src/server/service/items.service');
    const result = await listItems();
    expect(result).toEqual([]);
  });
});
