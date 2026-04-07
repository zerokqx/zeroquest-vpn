import { getCurrentUser } from '@/entities/user';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.auth.me.get',
  async (request: Request): Promise<Response> => {
    void request;
    const user = await getCurrentUser();

    return Response.json({
      user,
    });
  }
);
