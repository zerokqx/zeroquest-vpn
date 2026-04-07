import {
  getSessionSnapshot,
  getUpstreamInfo,
  jsonResponse,
} from '@/shared/api/three-x-ui/server';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRouteLogging(
  'api.3x-ui.session.status.get',
  async (request: Request): Promise<Response> => {
    void request;

    return jsonResponse({
      ok: true,
      session: getSessionSnapshot(),
      upstream: getUpstreamInfo(),
    });
  }
);
