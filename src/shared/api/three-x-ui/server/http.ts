import { NextResponse } from 'next/server';

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown proxy error';

export const jsonResponse = (
  payload: unknown,
  init?: ResponseInit
): Response => NextResponse.json(payload, init);

export const buildUpstreamRequestHeaders = (
  request: Request
): Record<string, string> => {
  const headers: Record<string, string> = {};

  for (const [key, value] of request.headers.entries()) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey === 'host' ||
      normalizedKey === 'origin' ||
      normalizedKey === 'referer' ||
      normalizedKey === 'content-length' ||
      normalizedKey === 'connection' ||
      normalizedKey === 'cookie'
    ) {
      continue;
    }

    headers[key] = value;
  }

  return headers;
};

export const copyUpstreamHeaders = (
  sourceHeaders: object
): Headers => {
  const headers = new Headers();

  for (const [key, value] of Object.entries(sourceHeaders)) {
    const normalizedKey = key.toLowerCase();

    if (
      value === undefined ||
      value === null ||
      normalizedKey === 'set-cookie' ||
      normalizedKey === 'content-length' ||
      normalizedKey === 'transfer-encoding' ||
      normalizedKey === 'content-encoding' ||
      normalizedKey === 'connection'
    ) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, String(item));
      }

      continue;
    }

    headers.set(key, String(value));
  }

  return headers;
};

export const readRequestBody = async (
  request: Request
): Promise<Uint8Array | undefined> => {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  return new Uint8Array(await request.arrayBuffer());
};

export const toResponseBody = (payload: unknown): BodyInit | null => {
  if (payload === undefined || payload === null) {
    return null;
  }

  if (payload instanceof ArrayBuffer) {
    return new Blob([payload]);
  }

  if (ArrayBuffer.isView(payload)) {
    const view = new Uint8Array(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength
    );

    return new Blob([
      view as unknown as BlobPart,
    ]);
  }

  if (typeof payload === 'string') {
    return payload;
  }

  return JSON.stringify(payload);
};
