import { createAuthResponse } from '@/shared/auth/server/session';
import { authCredentialsSchema } from '@/features/auth/model/schemas';
import { loginUser } from '@/features/auth/server/login-user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.auth.login.post',
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

    const { token, user } = await loginUser(parsed.data);

    return createAuthResponse(
      {
        user: {
          id: user.id,
          login: user.login,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      token
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Не удалось войти в аккаунт';

    return Response.json(
      { error: message },
      {
        status: message === 'Неверный логин или пароль' ? 401 : 400,
      }
    );
  }
});
