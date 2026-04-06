import { requireCurrentUser } from '@/entities/user';
import { claimPlan } from '@/features/claim-plan';
import { claimPlanRequestSchema } from '@/features/claim-plan/model/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as {
      customTrafficGb?: number;
      planId?: string;
      deviceName?: string;
      name?: string;
      promoCode?: string;
    };
    const parsed = claimPlanRequestSchema.safeParse({
      customTrafficGb: body.customTrafficGb,
      deviceName: body.deviceName ?? body.name,
      planId: body.planId,
      promoCode: body.promoCode,
    });

    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || 'Некорректные данные',
        },
        { status: 400 }
      );
    }

    const result = await claimPlan({
      ...parsed.data,
      user,
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json(
        {
          error: 'Войдите в аккаунт, чтобы получить доступ',
        },
        { status: 401 }
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to create access',
      },
      { status: 400 }
    );
  }
}
