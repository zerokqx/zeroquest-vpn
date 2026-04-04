import {
  forceLogin,
  getErrorMessage,
  getSessionSnapshot,
  getUpstreamInfo,
  jsonResponse,
} from '@/shared/api/three-x-ui/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
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
