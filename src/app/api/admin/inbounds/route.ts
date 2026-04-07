import { adminInboundSchema, toUpsertInboundInput } from '@/entities/inbound/model/schemas';
import { createInbound, listInbounds } from '@/entities/inbound';
import { requireAdminUser } from '@/entities/user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const GET = withRouteLogging(
  'api.admin.inbounds.get',
  async (request: Request): Promise<Response> => {
    void request;

    try {
      await requireAdminUser();
      const inbounds = await listInbounds();

      return Response.json({
        inbounds,
      });
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : 'Unauthorized',
        },
        {
          status:
            error instanceof Error && error.message === 'Forbidden'
              ? 403
              : 401,
        }
      );
    }
  }
);

export const POST = withRouteLogging(
  'api.admin.inbounds.post',
  async (request: Request): Promise<Response> => {
  try {
    await requireAdminUser();
    const parsed = adminInboundSchema.safeParse(await request.json());

    if (!parsed.success) {
      return Response.json(
        {
          error: parsed.error.issues[0]?.message || 'Некорректные данные',
        },
        { status: 400 }
      );
    }

    const inbound = await createInbound(toUpsertInboundInput(parsed.data));

    return Response.json(
      {
        inbound,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Не удалось создать inbound',
      },
      { status: 400 }
    );
  }
});
