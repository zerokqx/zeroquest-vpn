import { requireCurrentUser } from '@/entities/user';
import { createPaymentUpdatesStream } from '@/features/payments';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.payments.stream.get',
  async (request: Request): Promise<Response> => {
    void request;

    try {
      const user = await requireCurrentUser();
      const stream = createPaymentUpdatesStream(user.id);

      return new Response(stream, {
        headers: {
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Content-Type': 'text/event-stream; charset=utf-8',
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return Response.json(
          {
            error: 'Сессия истекла, войдите в аккаунт снова',
          },
          { status: 401 }
        );
      }

      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Не удалось открыть канал обновления платежей',
        },
        { status: 400 }
      );
    }
  }
);
