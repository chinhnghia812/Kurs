import { fromError, ok } from '@/server/lib/http';
import { markPaid } from '@/server/service/payments.service';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const fakeTxHash = `SIMULATED_${Date.now().toString(16).toUpperCase()}`;
    const payment = await markPaid(id, fakeTxHash);
    return ok({ payment, simulated: true });
  } catch (err) {
    return fromError(err);
  }
}
