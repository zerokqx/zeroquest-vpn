import { adminPlanSchema, toUpsertPlanInput } from '@/entities/plan/model/schemas';
import { deletePlan, getPlanById, updatePlan } from '@/entities/plan';
import { requireAdminUser } from '@/entities/user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.admin.plans.by-id.get',
  async (
    _request: Request,
    context: { params: Promise<{ planId: string }> }
  ): Promise<Response> => {
    try {
      await requireAdminUser();
      const { planId } = await context.params;
      const plan = await getPlanById(planId);

      if (!plan) {
        return Response.json(
          {
            error: 'Тариф не найден',
          },
          { status: 404 }
        );
      }

      return Response.json({
        plan,
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
  'api.admin.plans.by-id.patch',
  async (
    request: Request,
    context: { params: Promise<{ planId: string }> }
  ): Promise<Response> => {
    try {
      await requireAdminUser();
      const payload = await request.json();
      const parsed = adminPlanSchema.safeParse(payload);

      if (!parsed.success) {
        return Response.json(
          {
            error:
              parsed.error.issues[0]?.message || 'Некорректные данные тарифа',
          },
          { status: 400 }
        );
      }

      const { planId } = await context.params;
      const plan = await updatePlan(planId, toUpsertPlanInput(parsed.data));

      return Response.json({
        plan,
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : 'Не удалось обновить тариф',
        },
        {
          status:
            error instanceof Error &&
            (error.message === 'Unauthorized' || error.message === 'Forbidden')
              ? 403
              : error instanceof Error && error.message === 'Тариф не найден'
                ? 404
                : 400,
        }
      );
    }
  }
);

export const DELETE = withRouteLogging(
  'api.admin.plans.by-id.delete',
  async (
    _request: Request,
    context: { params: Promise<{ planId: string }> }
  ): Promise<Response> => {
    try {
      await requireAdminUser();
      const { planId } = await context.params;

      await deletePlan(planId);

      return Response.json({
        success: true,
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : 'Не удалось удалить тариф',
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
