import { randomUUID } from 'node:crypto';
import { yooKassaConfig } from '@/shared/config/env.server';
import { logServerError, logServerEvent } from '@/shared/logging/server/logger';
import type { YooKassaPayment, YooKassaRefund } from './types';

const createAuthHeader = (): string =>
  `Basic ${Buffer.from(`${yooKassaConfig.shopId}:${yooKassaConfig.token}`).toString('base64')}`;

const requestYooKassa = async <T,>(
  path: string,
  init: RequestInit & { idempotenceKey?: string } = {}
): Promise<T> => {
  const { idempotenceKey, ...requestInit } = init;
  const startedAt = Date.now();

  logServerEvent('debug', 'yookassa', 'request.started', {
    idempotenceKey: idempotenceKey ?? null,
    method: requestInit.method ?? 'GET',
    path,
  });
  const response = await fetch(`${yooKassaConfig.apiBaseUrl}${path}`, {
    ...requestInit,
    headers: {
      Authorization: createAuthHeader(),
      'Content-Type': 'application/json',
      ...(idempotenceKey
        ? {
            'Idempotence-Key': idempotenceKey,
          }
        : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const description =
      typeof payload?.description === 'string'
        ? payload.description
        : typeof payload?.error === 'string'
          ? payload.error
          : `YooKassa request failed with ${response.status}`;

    const error = new Error(description);

    logServerError('yookassa', 'request.failed', error, {
      durationMs: Date.now() - startedAt,
      idempotenceKey: idempotenceKey ?? null,
      method: requestInit.method ?? 'GET',
      path,
      status: response.status,
    });

    throw error;
  }

  logServerEvent('info', 'yookassa', 'request.completed', {
    durationMs: Date.now() - startedAt,
    idempotenceKey: idempotenceKey ?? null,
    method: requestInit.method ?? 'GET',
    path,
    status: response.status,
  });

  return payload as T;
};

const toAmountValue = (amount: number): string => amount.toFixed(2);

export const createYooKassaPayment = async (input: {
  amount: number;
  currency: string;
  description: string;
  idempotenceKey?: string;
  metadata: Record<string, string>;
  returnUrl: string;
}): Promise<YooKassaPayment> => {
  return await requestYooKassa<YooKassaPayment>('/payments', {
    body: JSON.stringify({
      amount: {
        currency: input.currency,
        value: toAmountValue(input.amount),
      },
      capture: true,
      confirmation: {
        return_url: input.returnUrl,
        type: 'redirect',
      },
      description: input.description,
      metadata: input.metadata,
    }),
    idempotenceKey: input.idempotenceKey ?? randomUUID(),
    method: 'POST',
  });
};

export const getYooKassaPayment = async (
  providerPaymentId: string
): Promise<YooKassaPayment> => {
  return await requestYooKassa<YooKassaPayment>(`/payments/${providerPaymentId}`, {
    method: 'GET',
  });
};

export const captureYooKassaPayment = async (input: {
  amount: number;
  currency: string;
  providerPaymentId: string;
}): Promise<YooKassaPayment> => {
  return await requestYooKassa<YooKassaPayment>(
    `/payments/${input.providerPaymentId}/capture`,
    {
      body: JSON.stringify({
        amount: {
          currency: input.currency,
          value: toAmountValue(input.amount),
        },
      }),
      idempotenceKey: randomUUID(),
      method: 'POST',
    }
  );
};

export const createYooKassaRefund = async (input: {
  amount: number;
  currency: string;
  description?: string;
  idempotenceKey?: string;
  providerPaymentId: string;
}): Promise<YooKassaRefund> => {
  return await requestYooKassa<YooKassaRefund>('/refunds', {
    body: JSON.stringify({
      amount: {
        currency: input.currency,
        value: toAmountValue(input.amount),
      },
      description: input.description,
      payment_id: input.providerPaymentId,
    }),
    idempotenceKey: input.idempotenceKey ?? randomUUID(),
    method: 'POST',
  });
};
