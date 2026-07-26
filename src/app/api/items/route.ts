import { fromError, ok } from '@/server/lib/http';
import { listItems } from '@/server/service/items.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listItems();
    return ok(items);
  } catch (err) {
    return fromError(err);
  }
}
