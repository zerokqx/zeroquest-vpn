import { adminPromoCodeSchema } from '@/entities/promo-code/model/schemas';
import {
  deletePromoCode,
  getPromoCodeById,
  updatePromoCode,
} from '@/entities/promo-code';
import { requireAdminUser } from '@/entities/user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.admin.promo-codes.by-id.get',
  async (
    _request: Request,
    context: { params: Promise<{ promoCodeId: string }> }
  ): Promise<Response> => {
    try {
      await requireAdminUser();
      const { promoCodeId } = await context.params;
      const promoCode = await getPromoCodeById(promoCodeId);

      if (!promoCode) {
        return Response.json(
          {
            error: 'Промокод не найден',
          },
          { status: 404 }
        );
      }

      return Response.json({
        promoCode,
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

export const PATCH = withRouteLogging(
  'api.admin.promo-codes.by-id.patch',
  async (
    request: Request,
    context: { params: Promise<{ promoCodeId: string }> }
  ): Promise<Response> => {
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
);

export const DELETE = withRouteLogging(
  'api.admin.promo-codes.by-id.delete',
  async (
    _request: Request,
    context: { params: Promise<{ promoCodeId: string }> }
  ): Promise<Response> => {
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
);
