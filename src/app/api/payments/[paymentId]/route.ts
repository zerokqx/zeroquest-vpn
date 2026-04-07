import { requireCurrentUser } from '@/entities/user';
import { getPaymentStatus } from '@/features/payments';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.payments.by-id.get',
  async (
    _request: Request,
    context: { params: Promise<{ paymentId: string }> }
  ): Promise<Response> => {
    try {
      const user = await requireCurrentUser();
      const { paymentId } = await context.params;
      const result = await getPaymentStatus(user, paymentId);

      return Response.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Unauthorized') {
        return Response.json(
          {
            error: 'Сессия истекла, войдите в аккаунт снова',
          },
          { status: 401 }
        );
      }

      if (error instanceof Error && error.message === 'Платеж не найден') {
        return Response.json(
          {
            error: error.message,
          },
          { status: 404 }
        );
      }

      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Не удалось проверить статус платежа',
        },
        { status: 400 }
      );
    }
  }
);
