import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { Agent as HttpsAgent } from 'node:https';
import {
  buildThreeXUiOrigin,
  buildThreeXUiUrl,
  threeXUiConfig,
} from '@/shared/config/env.server';
import type {
  ThreeXUiInbound,
  ThreeXUiClient,
  ThreeXUiInboundListItem,
  ThreeXUiSessionSnapshot,
  ThreeXUiUpstreamResponse,
} from './types';

interface SessionState {
  cookieHeader: string | null;
  authenticatedAt: string | null;
}

interface RuntimeState {
  loginPromise: Promise<ThreeXUiUpstreamResponse> | null;
  session: SessionState;
}

const httpsAgent =
  threeXUiConfig.protocol === 'https' && threeXUiConfig.allowInsecureTls
    ? new HttpsAgent({ rejectUnauthorized: false })
    : undefined;

const runtimeStateSymbol = Symbol.for('vpn-shop.three-x-ui.runtime-state');
const globalRuntimeState = globalThis as typeof globalThis & {
  [runtimeStateSymbol]?: RuntimeState;
};
const runtimeState = (globalRuntimeState[runtimeStateSymbol] ??= {
  loginPromise: null,
  session: {
    cookieHeader: null,
    authenticatedAt: null,
  },
}) satisfies RuntimeState;
const sessionState = runtimeState.session;

const upstreamClient = axios.create({
  timeout: threeXUiConfig.timeoutMs,
  maxRedirects: 5,
  validateStatus: () => true,
  httpsAgent,
});

const createLoginBody = (): URLSearchParams => {
  const body = new URLSearchParams();

  body.set('username', threeXUiConfig.username);
  body.set('password', threeXUiConfig.password);

  if (
    threeXUiConfig.includeEmptyTwoFactor ||
    threeXUiConfig.twoFactorCode.trim() !== ''
  ) {
    body.set('twoFactorCode', threeXUiConfig.twoFactorCode);
  }

  return body;
};

const getSetCookieHeaders = (response: AxiosResponse<unknown>): string[] => {
  const headerValue = response.headers['set-cookie'] as
    | string
    | string[]
    | undefined;

  if (Array.isArray(headerValue)) {
    return headerValue;
  }

  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return [headerValue];
  }

  return [];
};

const toCookieHeader = (headers: string[]): string =>
  headers
    .map((header) => header.split(';', 1)[0]?.trim() ?? '')
    .filter((header) => header.length > 0)
    .join('; ');

const decodeJsonPayload = <T>(payload: unknown): T => {
  if (payload instanceof ArrayBuffer) {
    return JSON.parse(Buffer.from(payload).toString('utf-8')) as T;
  }

  if (ArrayBuffer.isView(payload)) {
    return JSON.parse(
      Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength)
        .toString('utf-8')
    ) as T;
  }

  if (typeof payload === 'string') {
    return JSON.parse(payload) as T;
  }

  return payload as T;
};

const decodeTextPayload = (payload: unknown): string => {
  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload).toString('utf-8');
  }

  if (ArrayBuffer.isView(payload)) {
    return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength)
      .toString('utf-8');
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return JSON.stringify(payload);
};

const resetSession = (): void => {
  sessionState.cookieHeader = null;
  sessionState.authenticatedAt = null;
};

const login = async (
  timeoutMs?: number
): Promise<ThreeXUiUpstreamResponse> => {
  const response = await upstreamClient.post(
    buildThreeXUiUrl('/login/'),
    createLoginBody(),
    {
      timeout: timeoutMs,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  const payload = decodeJsonPayload<ThreeXUiUpstreamResponse>(response.data);
  const cookieHeader = toCookieHeader(getSetCookieHeaders(response));

  if (response.status >= 400 || !payload.success) {
    throw new Error(payload.msg || `3x-ui login failed with ${response.status}`);
  }

  if (!cookieHeader) {
    throw new Error('3x-ui login succeeded without a session cookie');
  }

  sessionState.cookieHeader = cookieHeader;
  sessionState.authenticatedAt = new Date().toISOString();

  return payload;
};

const isAuthFailureResponse = (response: AxiosResponse<unknown>): boolean => {
  if (response.status === 401 || response.status === 403) {
    return true;
  }

  const locationHeader = response.headers.location;

  return typeof locationHeader === 'string' && locationHeader.includes('/login');
};

export const getSessionSnapshot = (): ThreeXUiSessionSnapshot => ({
  authenticated: sessionState.cookieHeader !== null,
  authenticatedAt: sessionState.authenticatedAt,
});

export const clearSession = (): void => {
  resetSession();
};

export const forceLogin = async (): Promise<ThreeXUiUpstreamResponse> => {
  runtimeState.loginPromise ??= login().finally(() => {
    runtimeState.loginPromise = null;
  });

  return await runtimeState.loginPromise;
};

export const ensureAuthenticated = async (timeoutMs?: number): Promise<void> => {
  if (sessionState.cookieHeader) {
    return;
  }

  runtimeState.loginPromise ??= login(timeoutMs).finally(() => {
    runtimeState.loginPromise = null;
  });

  await runtimeState.loginPromise;
};

export const proxyThreeXUiRequest = async (
  config: AxiosRequestConfig,
  shouldRetry = true,
  authTimeoutMs?: number
): Promise<AxiosResponse<ArrayBuffer>> => {
  await ensureAuthenticated(authTimeoutMs);

  const headers = new AxiosHeaders();

  if (config.headers && typeof config.headers === 'object') {
    for (const [key, value] of Object.entries(config.headers)) {
      if (value !== undefined && value !== null) {
        headers.set(key, String(value));
      }
    }
  }

  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('content-length');
  headers.delete('cookie');

  if (sessionState.cookieHeader) {
    headers.set('Cookie', sessionState.cookieHeader);
  }

  const response = await upstreamClient.request<ArrayBuffer>({
    ...config,
    headers,
    responseType: 'arraybuffer',
  });

  if (shouldRetry && isAuthFailureResponse(response)) {
    resetSession();
    await ensureAuthenticated(authTimeoutMs);

    return await proxyThreeXUiRequest(config, false, authTimeoutMs);
  }

  return response;
};

export const requestThreeXUiJson = async <T>(
  config: AxiosRequestConfig,
  options?: {
    authTimeoutMs?: number;
  }
): Promise<T> => {
  const response = await proxyThreeXUiRequest(
    config,
    true,
    options?.authTimeoutMs
  );

  return JSON.parse(decodeTextPayload(response.data)) as T;
};

export const getThreeXUiInbound = async (
  inboundId: number
): Promise<ThreeXUiInbound> => {
  const response = await requestThreeXUiJson<
    ThreeXUiUpstreamResponse<ThreeXUiInbound>
  >({
    url: buildThreeXUiUrl(`/panel/api/inbounds/get/${inboundId}`),
    method: 'GET',
  });

  if (!response.success || !response.obj) {
    throw new Error(response.msg || 'Unable to load inbound');
  }

  return response.obj;
};

export const listThreeXUiInbounds = async (
  options?: {
    timeoutMs?: number;
  }
): Promise<ThreeXUiInboundListItem[]> => {
  const response = await requestThreeXUiJson<
    ThreeXUiUpstreamResponse<ThreeXUiInboundListItem[]>
  >({
    url: buildThreeXUiUrl('/panel/api/inbounds/list'),
    method: 'GET',
    timeout: options?.timeoutMs,
  }, {
    authTimeoutMs: options?.timeoutMs,
  });

  if (!response.success || !response.obj) {
    throw new Error(response.msg || 'Unable to load inbounds');
  }

  return response.obj;
};

export const addThreeXUiClient = async (
  inboundId: number,
  client: ThreeXUiClient
): Promise<void> => {
  const body = new URLSearchParams();

  body.set('id', String(inboundId));
  body.set(
    'settings',
    JSON.stringify({
      clients: [client],
    })
  );

  const response = await requestThreeXUiJson<ThreeXUiUpstreamResponse>({
    url: buildThreeXUiUrl('/panel/api/inbounds/addClient'),
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    data: body,
  });

  if (!response.success) {
    throw new Error(response.msg || 'Unable to add client');
  }
};

export const deleteThreeXUiClient = async (
  inboundId: number,
  clientId: string
): Promise<void> => {
  const response = await requestThreeXUiJson<ThreeXUiUpstreamResponse>({
    url: buildThreeXUiUrl(`/panel/api/inbounds/${inboundId}/delClient/${clientId}`),
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.success) {
    throw new Error(response.msg || 'Unable to delete client');
  }
};

export const getUpstreamInfo = (): {
  origin: string;
  webBasePath: string;
} => ({
  origin: buildThreeXUiOrigin(),
  webBasePath: threeXUiConfig.webBasePath || '/',
});
