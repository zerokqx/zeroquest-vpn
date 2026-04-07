import { createAuthResponse } from '@/shared/auth/server/session';
import { authCredentialsSchema } from '@/features/auth/model/schemas';
import { registerUser } from '@/features/auth/server/register-user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.auth.register.post',
  async (request: Request): Promise<Response> => {
  try {
    const body = await request.json();
    const parsed = authCredentialsSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || 'Некорректные данные',
        },
        { status: 400 }
      );
    }

    const { token, user } = await registerUser(parsed.data);

    return createAuthResponse({ user }, token);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось создать аккаунт';

    return Response.json(
      { error: message },
      {
        status:
          message === 'Пользователь с таким логином уже существует' ? 409 : 400,
      }
    );
  }
});
