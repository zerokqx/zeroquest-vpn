import {
  buildThreeXUiUrl,
  buildUpstreamRequestHeaders,
  copyUpstreamHeaders,
  getErrorMessage,
  jsonResponse,
  proxyThreeXUiRequest,
  readRequestBody,
  toResponseBody,
} from '@/shared/api/three-x-ui/server';
import { withRouteLogging } from '@/shared/logging/server/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProxyRouteContext {
  params: Promise<{
    path: string[];
  }>;
}

const handleProxyRequest = withRouteLogging(
  'api.3x-ui.proxy',
  async (
  request: Request,
  context: ProxyRouteContext
): Promise<Response> => {
  try {
    const { path } = await context.params;
    const requestUrl = new URL(request.url);
    const upstreamPath = `/${path.join('/')}`;
    const requestBody = await readRequestBody(request);
    const upstreamResponse = await proxyThreeXUiRequest({
      url: buildThreeXUiUrl(upstreamPath, requestUrl.search),
      method: request.method,
      headers: buildUpstreamRequestHeaders(request),
      data: requestBody,
    });

    return new Response(toResponseBody(upstreamResponse.data), {
      status: upstreamResponse.status,
      headers: copyUpstreamHeaders(upstreamResponse.headers),
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
});

export const GET = handleProxyRequest;
export const POST = handleProxyRequest;
export const PUT = handleProxyRequest;
export const PATCH = handleProxyRequest;
export const DELETE = handleProxyRequest;
export const HEAD = handleProxyRequest;
export const OPTIONS = handleProxyRequest;
