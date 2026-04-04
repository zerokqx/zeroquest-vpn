import { adminPlanSchema, toUpsertPlanInput } from '@/entities/plan/model/schemas';
import { deletePlan, updatePlan } from '@/entities/plan';
import { requireAdminUser } from '@/entities/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string }> }
): Promise<Response> {
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
): Promise<Response> {
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
