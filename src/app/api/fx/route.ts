import { generateLiveRates } from '@/server/lib/fx';
import { fromError, ok } from '@/server/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rates = generateLiveRates();
    return ok(rates);
  } catch (err) {
    return fromError(err);
  }
}
