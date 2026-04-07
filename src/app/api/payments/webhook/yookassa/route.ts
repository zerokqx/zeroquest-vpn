import { handleYooKassaWebhook } from '@/features/payments';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.payments.webhook.yookassa.post',
  async (request: Request): Promise<Response> => {
  try {
    const payload = (await request.json()) as {
      event?: string;
      object?: { id?: string };
      type?: string;
    };

    await handleYooKassaWebhook(payload);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Не удалось обработать webhook ЮKassa',
      },
      { status: 500 }
    );
  }
});
