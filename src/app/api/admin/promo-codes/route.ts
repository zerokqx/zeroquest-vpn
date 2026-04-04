import { adminPromoCodeSchema } from '@/entities/promo-code/model/schemas';
import { createPromoCode, listPromoCodes } from '@/entities/promo-code';
import { requireAdminUser } from '@/entities/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
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
          error instanceof Error && error.message === 'Unauthorized' ? 401 : 403,
      }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
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
}
