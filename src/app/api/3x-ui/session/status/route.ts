import {
  getSessionSnapshot,
  getUpstreamInfo,
  jsonResponse,
} from '@/shared/api/three-x-ui/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return jsonResponse({
    ok: true,
    session: getSessionSnapshot(),
    upstream: getUpstreamInfo(),
  });
}
