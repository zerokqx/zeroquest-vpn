import { listPublicPlans } from '@/entities/plan';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.plans.get',
  async (request: Request): Promise<Response> => {
    void request;
    const plans = await listPublicPlans();

    return Response.json({
      plans,
    });
  }
);
