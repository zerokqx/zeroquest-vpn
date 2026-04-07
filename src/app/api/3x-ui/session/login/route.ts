import {
  forceLogin,
  getErrorMessage,
  getSessionSnapshot,
  getUpstreamInfo,
  jsonResponse,
} from '@/shared/api/three-x-ui/server';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.3x-ui.session.login.post',
  async (request: Request): Promise<Response> => {
    void request;

    try {
      const upstreamResponse = await forceLogin();

      return jsonResponse({
        ok: true,
        session: getSessionSnapshot(),
        upstream: getUpstreamInfo(),
        upstreamResponse,
      });
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: getErrorMessage(error),
        },
        { status: 502 }
      );
    }
  }
);
