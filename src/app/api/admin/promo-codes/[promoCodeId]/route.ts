import { adminPromoCodeSchema } from '@/entities/promo-code/model/schemas';
import {
  deletePromoCode,
  updatePromoCode,
} from '@/entities/promo-code';
import { requireAdminUser } from '@/entities/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ promoCodeId: string }> }
): Promise<Response> {
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

    const { promoCodeId } = await context.params;
    const promoCode = await updatePromoCode(promoCodeId, parsed.data);

    return Response.json({
      promoCode,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Не удалось обновить промокод',
      },
      {
        status:
          error instanceof Error &&
          (error.message === 'Unauthorized' || error.message === 'Forbidden')
            ? 403
            : error instanceof Error && error.message === 'Промокод не найден'
              ? 404
              : 400,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ promoCodeId: string }> }
): Promise<Response> {
  try {
    await requireAdminUser();
    const { promoCodeId } = await context.params;

    await deletePromoCode(promoCodeId);

    return Response.json({
      success: true,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Не удалось удалить промокод',
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
}
