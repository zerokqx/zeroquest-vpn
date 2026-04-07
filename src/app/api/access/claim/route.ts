import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.access.claim.post',
  async (request: Request): Promise<Response> => {
    void request;

    return Response.json(
      {
        error:
          'Прямая выдача доступа отключена. Сначала создайте платеж через /api/payments.',
      },
      { status: 410 }
    );
  }
);
