'use client';

import { useSyncExternalStore } from 'react';
import type { PaymentStatus } from '@/entities/payment/model/types';
import { logClientEvent } from '@/shared/logging/client/logger';

const STORAGE_KEY = 'vpn-shop.current-payment';

export interface StoredCurrentPayment {
  amount: number;
  confirmationUrl: string;
  createdAt: string;
  currency: string;
  paymentId: string;
  planTitle: string;
  status: PaymentStatus;
}

interface CurrentPaymentState {
  currentPayment: StoredCurrentPayment | null;
}

const DEFAULT_STATE: CurrentPaymentState = {
  currentPayment: null,
};

const listeners = new Set<() => void>();
let cachedState: CurrentPaymentState = DEFAULT_STATE;
let hasLoadedClientState = false;

const parseStoredState = (rawValue: string | null): CurrentPaymentState => {
  if (!rawValue) {
    return DEFAULT_STATE;
  }

  try {
    const parsed = JSON.parse(rawValue) as CurrentPaymentState;

    return parsed.currentPayment ? parsed : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
};

const getSnapshot = (): CurrentPaymentState => {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  if (!hasLoadedClientState) {
    cachedState = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
    hasLoadedClientState = true;
  }

  return cachedState;
};

const readState = (): CurrentPaymentState => {
  return getSnapshot();
};

const writeState = (state: CurrentPaymentState): void => {
  cachedState = state;
  hasLoadedClientState = true;

  if (typeof window === 'undefined') {
    return;
  }

  if (!state.currentPayment) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  listeners.forEach((listener) => listener());
};

export const setCurrentPayment = (payment: StoredCurrentPayment): void => {
  logClientEvent('info', 'current-payment-store', 'payment.set', {
    paymentId: payment.paymentId,
    planTitle: payment.planTitle,
    status: payment.status,
  });
  writeState({
    currentPayment: payment,
  });
};

export const patchCurrentPayment = (
  patch: Partial<StoredCurrentPayment>
): void => {
  const state = readState();

  if (!state.currentPayment) {
    return;
  }

  const nextPayment = {
    ...state.currentPayment,
    ...patch,
  };

  if (
    nextPayment.amount === state.currentPayment.amount &&
    nextPayment.confirmationUrl === state.currentPayment.confirmationUrl &&
    nextPayment.createdAt === state.currentPayment.createdAt &&
    nextPayment.currency === state.currentPayment.currency &&
    nextPayment.paymentId === state.currentPayment.paymentId &&
    nextPayment.planTitle === state.currentPayment.planTitle &&
    nextPayment.status === state.currentPayment.status
  ) {
    return;
  }

  logClientEvent('debug', 'current-payment-store', 'payment.patched', {
    nextStatus: nextPayment.status,
    paymentId: nextPayment.paymentId,
    previousStatus: state.currentPayment.status,
  });

  writeState({
    currentPayment: nextPayment,
  });
};

export const clearCurrentPayment = (): void => {
  const paymentId = readState().currentPayment?.paymentId ?? null;

  logClientEvent('info', 'current-payment-store', 'payment.cleared', {
    paymentId,
  });
  writeState(DEFAULT_STATE);
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(listener);
    };
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedState = parseStoredState(event.newValue);
      hasLoadedClientState = true;
      listener();
    }
  };

  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

export const useCurrentPaymentStore = (): CurrentPaymentState =>
  useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);
