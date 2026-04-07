import {
  clearSession,
  getSessionSnapshot,
  getUpstreamInfo,
  jsonResponse,
} from '@/shared/api/three-x-ui/server';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.3x-ui.session.logout.post',
  async (request: Request): Promise<Response> => {
    void request;
    clearSession();

    return jsonResponse({
      ok: true,
      session: getSessionSnapshot(),
      upstream: getUpstreamInfo(),
    });
  }
);
