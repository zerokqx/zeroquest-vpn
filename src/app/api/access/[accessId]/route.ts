import { deleteAccessForUser } from '@/entities/access';
import { requireCurrentUser } from '@/entities/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ accessId: string }> }
): Promise<Response> {
  try {
    const user = await requireCurrentUser();
    const { accessId } = await context.params;
    await deleteAccessForUser(accessId, user.id);

    return Response.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return Response.json(
        {
          error: 'Войдите в аккаунт',
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message === 'Подключение не найдено') {
      return Response.json(
        {
          error: error.message,
        },
        { status: 404 }
      );
    }

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Не удалось удалить подключение',
      },
      { status: 400 }
    );
  }
}
