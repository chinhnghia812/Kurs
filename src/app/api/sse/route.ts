/**
 * Server-Sent Events endpoint for payment status updates.
 * Polls the DB every 3 seconds and sends payment_update events.
 */
import { listPayments } from '@/server/service/payments.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial state
      try {
        const initial = await listPayments();
        send('init', initial);
      } catch {
        // ignore
      }

      // Poll every 3 seconds
      const interval = setInterval(async () => {
        try {
          const payments = await listPayments();
          send('payment_update', payments);
        } catch {
          // ignore
        }
      }, 3000);

      // Clean up on close
      const cleanup = () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Auto-close after 5 minutes to prevent lingering connections
      setTimeout(cleanup, 5 * 60 * 1000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
