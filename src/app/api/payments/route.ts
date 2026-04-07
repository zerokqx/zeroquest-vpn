import { requireCurrentUser } from '@/entities/user';
import { createPayment } from '@/features/payments';
import { createPaymentRequestSchema } from '@/features/payments/model/schemas';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.payments.post',
  async (request: Request): Promise<Response> => {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as {
      customTrafficGb?: number;
      deviceName?: string;
      planId?: string;
      promoCode?: string;
    };
    const parsed = createPaymentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || 'Некорректные данные',
        },
        { status: 400 }
      );
    }

    const result = await createPayment(parsed.data, user);

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json(
        {
          error: 'Войдите в аккаунт, чтобы оплатить тариф',
        },
        { status: 401 }
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Не удалось создать платеж',
      },
      { status: 400 }
    );
  }
});
