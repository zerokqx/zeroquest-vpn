import { adminPlanSchema, toUpsertPlanInput } from '@/entities/plan/model/schemas';
import { createPlan, listPlans, toPublicPlan } from '@/entities/plan';
import { requireAdminUser } from '@/entities/user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.admin.plans.get',
  async (request: Request): Promise<Response> => {
    void request;

    try {
      await requireAdminUser();
      const plans = await listPlans();

      return Response.json({
        plans,
        publicPlans: plans.filter((plan) => plan.isActive).map(toPublicPlan),
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
  'api.admin.plans.post',
  async (request: Request): Promise<Response> => {
  try {
    await requireAdminUser();
    const payload = await request.json();
    const parsed = adminPlanSchema.safeParse(payload);

    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || 'Некорректные данные тарифа',
        },
        { status: 400 }
      );
    }

    const plan = await createPlan(toUpsertPlanInput(parsed.data));

    return Response.json({
      plan,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Не удалось создать тариф',
      },
      {
        status:
          error instanceof Error && error.message === 'Пользователь не найден'
            ? 404
            : error instanceof Error &&
                (error.message === 'Unauthorized' || error.message === 'Forbidden')
              ? 403
              : 400,
      }
    );
  }
});
