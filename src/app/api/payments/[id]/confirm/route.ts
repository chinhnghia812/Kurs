import type { NextRequest } from 'next/server';
import { fail } from '@/server/lib/http';

/** Verify a wallet-signed envelope against the prepared digest before broadcast. */
export async function POST(_req: NextRequest) {
  return fail('CONFLICT', 'Wallet signing is not enabled in the public demo yet.', 409);
}
