'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { logClientError, logClientEvent } from './logger';

const FETCH_PATCHED_KEY = '__vpnShopClientLoggingFetchPatched__';

declare global {
  interface Window {
    __vpnShopClientLoggingFetchPatched__?: boolean;
  }
}

const resolveUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
};

const patchFetchLogging = (): void => {
  if (window[FETCH_PATCHED_KEY]) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const startedAt = performance.now();
    const method =
      init?.method ??
      (input instanceof Request ? input.method : 'GET');
    const url = resolveUrl(input);

    logClientEvent('debug', 'fetch', 'request.started', {
      method,
      url,
    });

    try {
      const response = await nativeFetch(input, init);

      logClientEvent('info', 'fetch', 'request.completed', {
        durationMs: Math.round(performance.now() - startedAt),
        method,
        status: response.status,
        url,
      });

      return response;
    } catch (error) {
      logClientError('fetch', 'request.failed', error, {
        durationMs: Math.round(performance.now() - startedAt),
        method,
        url,
      });

      throw error;
    }
  };

  window[FETCH_PATCHED_KEY] = true;
};

export function ClientRuntimeLogger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    patchFetchLogging();

    const handleError = (event: ErrorEvent) => {
      logClientError('runtime', 'window.error', event.error ?? event.message, {
        colno: event.colno,
        filename: event.filename,
        lineno: event.lineno,
      });
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logClientError(
        'runtime',
        'window.unhandledrejection',
        event.reason
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    logClientEvent('info', 'runtime', 'logger.ready', {
      userAgent: navigator.userAgent,
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, []);

  useEffect(() => {
    logClientEvent('info', 'navigation', 'route.changed', {
      pathname,
      search: searchParams?.toString() || null,
    });
  }, [pathname, searchParams]);

  return null;
}
