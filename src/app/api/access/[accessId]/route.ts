import {
  deleteAccessRecordByIdForUser,
  getAccessRecordByIdForUser,
} from '@/entities/access';
import { requireCurrentUser } from '@/entities/user';
import { deleteThreeXUiClient } from '@/shared/api/three-x-ui/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ accessId: string }> }
): Promise<Response> {
  try {
    const user = await requireCurrentUser();
    const { accessId } = await context.params;
    const accessRecord = await getAccessRecordByIdForUser(accessId, user.id);

    if (!accessRecord) {
      return Response.json(
        {
          error: 'Подключение не найдено',
        },
        { status: 404 }
      );
    }

    await deleteThreeXUiClient(
      accessRecord.inboundId,
      accessRecord.threeXUiClientId
    );
    await deleteAccessRecordByIdForUser(accessId, user.id);

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
