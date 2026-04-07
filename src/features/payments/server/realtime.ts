import { randomUUID } from 'node:crypto';
import { listTrackablePaymentsByUserId } from '@/entities/payment';
import { logServerError, logServerEvent } from '@/shared/logging/server/logger';
import type { PaymentStatusResponse } from '../model/types';
import { getPaymentStatusSnapshot } from './get-payment-status-snapshot';
import { syncPaymentStatus } from './sync-payment-status';

const PING_INTERVAL_MS = 25_000;
const SYNC_INTERVAL_MS = 10_000;

interface PaymentStreamEvent {
  payload: PaymentStatusResponse | null;
  type: 'payment.updated' | 'stream.ready';
}

interface PaymentSubscriber {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  keepAliveTimer: NodeJS.Timeout | null;
}

interface UserRealtimeState {
  inFlightSync: Promise<void> | null;
  lastEventSignatureByPaymentId: Map<string, string>;
  syncTimer: NodeJS.Timeout | null;
  subscribers: Map<string, PaymentSubscriber>;
}

interface RealtimeRuntimeState {
  users: Map<string, UserRealtimeState>;
}

const runtimeStateSymbol = Symbol.for('vpn-shop.payments.realtime.runtime-state');
const globalRuntimeState = globalThis as typeof globalThis & {
  [runtimeStateSymbol]?: RealtimeRuntimeState;
};
const runtimeState = (globalRuntimeState[runtimeStateSymbol] ??= {
  users: new Map<string, UserRealtimeState>(),
}) satisfies RealtimeRuntimeState;

const getUserRealtimeState = (userId: string): UserRealtimeState => {
  let state = runtimeState.users.get(userId);

  if (state) {
    return state;
  }

  state = {
    inFlightSync: null,
    lastEventSignatureByPaymentId: new Map<string, string>(),
    syncTimer: null,
    subscribers: new Map<string, PaymentSubscriber>(),
  };
  runtimeState.users.set(userId, state);

  return state;
};

const sendEvent = (
  subscriber: PaymentSubscriber,
  event: PaymentStreamEvent
): void => {
  subscriber.controller.enqueue(
    subscriber.encoder.encode(
      `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
    )
  );
};

const broadcastToUser = (userId: string, event: PaymentStreamEvent): void => {
  const state = runtimeState.users.get(userId);

  if (!state) {
    return;
  }

  for (const [subscriberId, subscriber] of state.subscribers.entries()) {
    try {
      sendEvent(subscriber, event);
    } catch {
      if (subscriber.keepAliveTimer) {
        clearInterval(subscriber.keepAliveTimer);
      }

      state.subscribers.delete(subscriberId);
    }
  }

  stopUserSyncIfIdle(userId);
};

const getEventSignature = (payload: PaymentStatusResponse): string =>
  JSON.stringify({
    confirmationUrl: payload.payment.confirmationUrl,
    failureReason: payload.payment.failureReason,
    fulfillmentStatus: payload.payment.fulfillmentStatus,
    paidAt: payload.payment.paidAt,
    paymentId: payload.payment.paymentId,
    status: payload.payment.status,
    vpnKeyId: payload.vpnKey?.id ?? null,
  });

const publishPaymentSnapshot = async (
  userId: string,
  paymentId: string,
  force = false
): Promise<void> => {
  const snapshot = await getPaymentStatusSnapshot(paymentId);

  if (!snapshot) {
    return;
  }

  const state = getUserRealtimeState(userId);
  const signature = getEventSignature(snapshot);
  const previousSignature = state.lastEventSignatureByPaymentId.get(paymentId);

  if (!force && previousSignature === signature) {
    return;
  }

  state.lastEventSignatureByPaymentId.set(paymentId, signature);
  broadcastToUser(userId, {
    payload: snapshot,
    type: 'payment.updated',
  });
};

const syncUserTrackablePayments = async (userId: string): Promise<void> => {
  const state = getUserRealtimeState(userId);

  if (state.inFlightSync) {
    await state.inFlightSync;
    return;
  }

  state.inFlightSync = (async () => {
    const payments = await listTrackablePaymentsByUserId(userId);

    if (payments.length === 0) {
      return;
    }

    for (const payment of payments) {
      try {
        await syncPaymentStatus(payment);
        await publishPaymentSnapshot(userId, payment.id);
      } catch (error) {
        logServerError('payments-realtime', 'payment.sync.failed', error, {
          paymentId: payment.id,
          userId,
        });
      }
    }
  })().finally(() => {
    state.inFlightSync = null;
  });

  await state.inFlightSync;
};

const stopUserSyncIfIdle = (userId: string): void => {
  const state = runtimeState.users.get(userId);

  if (!state || state.subscribers.size > 0) {
    return;
  }

  if (state.syncTimer) {
    clearInterval(state.syncTimer);
  }

  runtimeState.users.delete(userId);
};

const ensureUserSync = (userId: string): void => {
  const state = getUserRealtimeState(userId);

  if (state.syncTimer) {
    return;
  }

  state.syncTimer = setInterval(() => {
    void syncUserTrackablePayments(userId);
  }, SYNC_INTERVAL_MS);
};

export const notifyPaymentUpdate = async (
  userId: string,
  paymentId: string
): Promise<void> => {
  logServerEvent('debug', 'payments-realtime', 'payment.update.notified', {
    paymentId,
    userId,
  });
  await publishPaymentSnapshot(userId, paymentId, true);
};

export const createPaymentUpdatesStream = (
  userId: string
): ReadableStream<Uint8Array> => {
  let subscriberId: string | null = null;

  const cleanup = (): void => {
    if (!subscriberId) {
      return;
    }

    const state = runtimeState.users.get(userId);

    if (!state) {
      subscriberId = null;
      return;
    }

    const subscriber = state.subscribers.get(subscriberId);

    if (subscriber?.keepAliveTimer) {
      clearInterval(subscriber.keepAliveTimer);
    }

    state.subscribers.delete(subscriberId);
    logServerEvent('info', 'payments-realtime', 'stream.disconnected', {
      activeSubscribers: state.subscribers.size,
      subscriberId,
      userId,
    });
    subscriberId = null;
    stopUserSyncIfIdle(userId);
  };

  return new ReadableStream<Uint8Array>({
    cancel() {
      cleanup();
    },
    async start(controller) {
      const state = getUserRealtimeState(userId);
      subscriberId = randomUUID();
      const subscriber: PaymentSubscriber = {
        controller,
        encoder: new TextEncoder(),
        keepAliveTimer: null,
      };

      state.subscribers.set(subscriberId, subscriber);
      ensureUserSync(userId);
      logServerEvent('info', 'payments-realtime', 'stream.connected', {
        activeSubscribers: state.subscribers.size,
        subscriberId,
        userId,
      });

      sendEvent(subscriber, {
        payload: null,
        type: 'stream.ready',
      });

      subscriber.keepAliveTimer = setInterval(() => {
        subscriber.controller.enqueue(subscriber.encoder.encode(': ping\n\n'));
      }, PING_INTERVAL_MS);

      try {
        const payments = await listTrackablePaymentsByUserId(userId);

        for (const payment of payments) {
          const snapshot = await getPaymentStatusSnapshot(payment.id);

          if (!snapshot) {
            continue;
          }

          state.lastEventSignatureByPaymentId.set(
            payment.id,
            getEventSignature(snapshot)
          );
          sendEvent(subscriber, {
            payload: snapshot,
            type: 'payment.updated',
          });
        }

        await syncUserTrackablePayments(userId);
      } catch (error) {
        logServerError('payments-realtime', 'stream.bootstrap.failed', error, {
          subscriberId,
          userId,
        });
      }
    },
  });
};
