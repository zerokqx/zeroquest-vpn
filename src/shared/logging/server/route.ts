import { randomUUID } from 'node:crypto';
import { logServerError, logServerEvent } from './logger';

type AppRouteHandler<TContext = unknown> = (
  request: Request,
  context: TContext
) => Promise<Response>;

const getHeaderValue = (request: Request, key: string): string | null =>
  request.headers.get(key);

const summarizeRequest = (request: Request) => {
  const url = new URL(request.url);

  return {
    contentLength: getHeaderValue(request, 'content-length'),
    contentType: getHeaderValue(request, 'content-type'),
    ip:
      getHeaderValue(request, 'x-forwarded-for') ??
      getHeaderValue(request, 'x-real-ip'),
    method: request.method,
    pathname: url.pathname,
    referer: getHeaderValue(request, 'referer'),
    search: url.search || null,
    userAgent: getHeaderValue(request, 'user-agent'),
  };
};

const summarizeResponse = (response: Response) => ({
  contentLength: response.headers.get('content-length'),
  contentType: response.headers.get('content-type'),
  status: response.status,
});

export const withRouteLogging = <TContext = unknown>(
  routeName: string,
  handler: AppRouteHandler<TContext>
): AppRouteHandler<TContext> => {
  return async (request: Request, context: TContext): Promise<Response> => {
    const requestId = randomUUID();
    const startedAt = Date.now();

    logServerEvent('info', 'api.route', 'request.started', {
      requestId,
      routeName,
      request: summarizeRequest(request),
    });

    try {
      const response = await handler(request, context);

      logServerEvent('info', 'api.route', 'request.completed', {
        durationMs: Date.now() - startedAt,
        requestId,
        response: summarizeResponse(response),
        routeName,
      });

      return response;
    } catch (error) {
      logServerError('api.route', 'request.failed', error, {
        durationMs: Date.now() - startedAt,
        requestId,
        routeName,
      });

      throw error;
    }
  };
};
