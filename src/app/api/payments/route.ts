import { z } from 'zod';
import { created, fromError } from '@/server/lib/http';
import { createPayment } from '@/server/service/payments.service';

const createSchema = z.object({
  itemId: z.string().uuid(),
  merchantAddress: z.string().min(56),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, merchantAddress } = createSchema.parse(body);
    const payment = await createPayment(itemId, merchantAddress);
    return created(payment);
  } catch (err) {
    return fromError(err);
  }
}
