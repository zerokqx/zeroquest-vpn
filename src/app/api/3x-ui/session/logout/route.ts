import {
  clearSession,
  getSessionSnapshot,
  getUpstreamInfo,
  jsonResponse,
} from '@/shared/api/three-x-ui/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  clearSession();

  return jsonResponse({
    ok: true,
    session: getSessionSnapshot(),
    upstream: getUpstreamInfo(),
  });
}
