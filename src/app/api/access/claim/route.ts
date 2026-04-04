import { requireCurrentUser } from '@/entities/user';
import { claimPlan } from '@/features/claim-plan';

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
    const deviceName = body.deviceName ?? body.name;

    if (!body.planId || !deviceName) {
      return Response.json(
        {
          error: 'planId and deviceName are required',
        },
        { status: 400 }
      );
    }

      const result = await claimPlan({
        customTrafficGb: body.customTrafficGb,
        planId: body.planId,
        deviceName,
        promoCode: body.promoCode,
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
