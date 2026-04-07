import { clearAuthResponse } from '@/shared/auth/server/session';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteLogging(
  'api.auth.logout.post',
  async (request: Request): Promise<Response> => {
    void request;

    return clearAuthResponse({ success: true });
  }
);
