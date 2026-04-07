import { adminPromoCodeSchema } from '@/entities/promo-code/model/schemas';
import { createPromoCode, listPromoCodes } from '@/entities/promo-code';
import { requireAdminUser } from '@/entities/user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.admin.promo-codes.get',
  async (request: Request): Promise<Response> => {
    void request;

    try {
      await requireAdminUser();
      const promoCodes = await listPromoCodes();

      return Response.json({
        promoCodes,
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error && error.message === 'Unauthorized'
              ? 'Войдите как администратор'
              : 'Доступ запрещён',
        },
        {
          status:
            error instanceof Error && error.message === 'Unauthorized'
              ? 401
              : 403,
        }
      );
    }
  }
);

export const POST = withRouteLogging(
  'api.admin.promo-codes.post',
  async (request: Request): Promise<Response> => {
  try {
    await requireAdminUser();
    const payload = await request.json();
    const parsed = adminPromoCodeSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message || 'Некорректные данные промокода',
        },
        { status: 400 }
      );
    }

    const promoCode = await createPromoCode(parsed.data);

    return Response.json({
      promoCode,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Не удалось создать промокод',
      },
      {
        status:
          error instanceof Error &&
          (error.message === 'Unauthorized' || error.message === 'Forbidden')
            ? 403
            : 400,
      }
    );
  }
});
