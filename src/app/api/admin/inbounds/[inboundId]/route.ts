import { adminInboundSchema, toUpsertInboundInput } from '@/entities/inbound/model/schemas';
import {
  deleteInbound,
  getInboundById,
  updateInbound,
} from '@/entities/inbound';
import { requireAdminUser } from '@/entities/user';
import { withRouteLogging } from '@/shared/logging/server/route';

const parseInboundId = (value: string): number => {
  const normalized = Number.parseInt(value, 10);

  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('Inbound не найден');
  }

  return normalized;
};

export const GET = withRouteLogging(
  'api.admin.inbounds.by-id.get',
  async (
    _request: Request,
    context: { params: Promise<{ inboundId: string }> }
  ): Promise<Response> => {
    try {
      await requireAdminUser();
      const { inboundId } = await context.params;
      const inbound = await getInboundById(parseInboundId(inboundId));

      if (!inbound) {
        return Response.json(
          {
            error: 'Inbound не найден',
          },
          { status: 404 }
        );
      }

      return Response.json({
        inbound,
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

export const PATCH = withRouteLogging(
  'api.admin.inbounds.by-id.patch',
  async (
    request: Request,
    context: { params: Promise<{ inboundId: string }> }
  ): Promise<Response> => {
    try {
      await requireAdminUser();
      const { inboundId } = await context.params;
      const parsed = adminInboundSchema.safeParse(await request.json());

      if (!parsed.success) {
        return Response.json(
          {
            error: parsed.error.issues[0]?.message || 'Некорректные данные',
          },
          { status: 400 }
        );
      }

      const inbound = await updateInbound(
        parseInboundId(inboundId),
        toUpsertInboundInput(parsed.data)
      );

      return Response.json({
        inbound,
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : 'Не удалось обновить inbound',
        },
        { status: 400 }
      );
    }
  }
);

export const DELETE = withRouteLogging(
  'api.admin.inbounds.by-id.delete',
  async (
    _request: Request,
    context: { params: Promise<{ inboundId: string }> }
  ): Promise<Response> => {
    try {
      await requireAdminUser();
      const { inboundId } = await context.params;
      await deleteInbound(parseInboundId(inboundId));

      return Response.json({ ok: true });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : 'Не удалось удалить inbound',
        },
        { status: 400 }
      );
    }
  }
);
