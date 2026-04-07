import { randomUUID } from 'node:crypto';
import { decryptJson, encryptJson, getPrismaClient } from '@/shared/db/server';
import type {
  CreatePaymentRecordInput,
  Payment,
  PaymentFulfillmentStatus,
  PaymentPayload,
  PaymentStatus,
} from '../model/types';

const PAYMENT_FULFILLMENT_LEASE_MS = 60_000;

const toPayment = (row: {
  amount: number;
  createdAt: Date;
  currency: string;
  fulfilledAt: Date | null;
  fulfillmentStatus: string;
  id: string;
  lastCheckedAt: Date | null;
  paidAt: Date | null;
  payload: string;
  planId: string;
  provider: string;
  providerPaymentId: string | null;
  status: string;
  updatedAt: Date;
  userId: string;
}): Payment => ({
  amount: row.amount,
  createdAt: row.createdAt.toISOString(),
  currency: row.currency,
  fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
  fulfillmentStatus: row.fulfillmentStatus as PaymentFulfillmentStatus,
  id: row.id,
  lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
  paidAt: row.paidAt?.toISOString() ?? null,
  payload: decryptJson<PaymentPayload>(row.payload),
  planId: row.planId,
  provider: row.provider as Payment['provider'],
  providerPaymentId: row.providerPaymentId,
  status: row.status as PaymentStatus,
  updatedAt: row.updatedAt.toISOString(),
  userId: row.userId,
});

const readPaymentRowById = async (paymentId: string) => {
  return await getPrismaClient().paymentStore.findUnique({
    where: {
      id: paymentId,
    },
  });
};

const readPaymentRowByProviderPaymentId = async (providerPaymentId: string) => {
  return await getPrismaClient().paymentStore.findUnique({
    where: {
      providerPaymentId,
    },
  });
};

const mergePaymentPayload = async (
  paymentId: string,
  patch: Partial<PaymentPayload>
): Promise<PaymentPayload> => {
  const row = await readPaymentRowById(paymentId);

  if (!row) {
    throw new Error('Платеж не найден');
  }

  return {
    ...decryptJson<PaymentPayload>(row.payload),
    ...patch,
  };
};

export const createPaymentRecord = async (
  input: CreatePaymentRecordInput
): Promise<Payment> => {
  const paymentId = randomUUID();
  const now = new Date();

  await getPrismaClient().paymentStore.create({
    data: {
      amount: input.amount,
      createdAt: now,
      currency: input.currency,
      id: paymentId,
      payload: encryptJson(input.payload),
      planId: input.planId,
      provider: input.provider,
      status: 'pending',
      updatedAt: now,
      userId: input.userId,
    },
  });

  return (await getPaymentById(paymentId)) as Payment;
};

export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
  const row = await readPaymentRowById(paymentId);

  return row ? toPayment(row) : null;
};

export const getPaymentByProviderPaymentIdForUser = async (
  userId: string,
  providerPaymentId: string
): Promise<Payment | null> => {
  const row = await getPrismaClient().paymentStore.findFirst({
    where: {
      providerPaymentId,
      userId,
    },
  });

  return row ? toPayment(row) : null;
};

export const listTrackablePaymentsByUserId = async (
  userId: string
): Promise<Payment[]> =>
  (await getPrismaClient().paymentStore.findMany({
    where: {
      provider: 'yookassa',
      providerPaymentId: {
        not: null,
      },
      userId,
      OR: [
        {
          status: {
            in: ['pending', 'waiting_for_capture'],
          },
        },
        {
          fulfillmentStatus: {
            not: 'succeeded',
          },
          status: 'succeeded',
        },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  })).map(toPayment);

export const updatePaymentProviderState = async (
  paymentId: string,
  input: {
    confirmationUrl?: string | null;
    failureReason?: string | null;
    lastCheckedAt?: Date;
    paidAt?: Date | null;
    paymentMethodType?: string | null;
    providerPaymentId?: string | null;
    providerStatus?: string | null;
    status: PaymentStatus;
  }
): Promise<Payment> => {
  const payload = await mergePaymentPayload(paymentId, {
    confirmationUrl:
      input.confirmationUrl === undefined
        ? undefined
        : input.confirmationUrl,
    failureReason:
      input.failureReason === undefined ? undefined : input.failureReason,
    paymentMethodType:
      input.paymentMethodType === undefined
        ? undefined
        : input.paymentMethodType,
    providerStatus:
      input.providerStatus === undefined ? undefined : input.providerStatus,
  });
  const now = new Date();

  await getPrismaClient().paymentStore.update({
    where: {
      id: paymentId,
    },
    data: {
      lastCheckedAt: input.lastCheckedAt ?? now,
      paidAt: input.paidAt === undefined ? undefined : input.paidAt,
      payload: encryptJson(payload),
      providerPaymentId:
        input.providerPaymentId === undefined ? undefined : input.providerPaymentId,
      status: input.status,
      updatedAt: now,
    },
  });

  return (await getPaymentById(paymentId)) as Payment;
};

export const markPaymentPromoUsageApplied = async (
  paymentId: string
): Promise<Payment> => {
  const payload = await mergePaymentPayload(paymentId, {
    promoUsageApplied: true,
  });

  await getPrismaClient().paymentStore.update({
    where: {
      id: paymentId,
    },
    data: {
      payload: encryptJson(payload),
      updatedAt: new Date(),
    },
  });

  return (await getPaymentById(paymentId)) as Payment;
};

export const acquirePaymentFulfillmentLease = async (
  paymentId: string
): Promise<boolean> => {
  const staleBefore = new Date(Date.now() - PAYMENT_FULFILLMENT_LEASE_MS);
  const result = await getPrismaClient().paymentStore.updateMany({
    where: {
      id: paymentId,
      status: 'succeeded',
      OR: [
        {
          fulfillmentStatus: {
            in: ['pending', 'failed'],
          },
        },
        {
          fulfillmentStatus: 'processing',
          updatedAt: {
            lt: staleBefore,
          },
        },
      ],
    },
    data: {
      fulfillmentStatus: 'processing',
      updatedAt: new Date(),
    },
  });

  return result.count > 0;
};

export const completePaymentFulfillment = async (
  paymentId: string
): Promise<Payment> => {
  await getPrismaClient().paymentStore.update({
    where: {
      id: paymentId,
    },
    data: {
      fulfilledAt: new Date(),
      fulfillmentStatus: 'succeeded',
      updatedAt: new Date(),
    },
  });

  return (await getPaymentById(paymentId)) as Payment;
};

export const failPaymentFulfillment = async (
  paymentId: string,
  failureReason: string
): Promise<Payment> => {
  const payload = await mergePaymentPayload(paymentId, {
    failureReason,
  });

  await getPrismaClient().paymentStore.update({
    where: {
      id: paymentId,
    },
    data: {
      fulfillmentStatus: 'failed',
      payload: encryptJson(payload),
      updatedAt: new Date(),
    },
  });

  return (await getPaymentById(paymentId)) as Payment;
};

export const getPaymentByProviderPaymentId = async (
  providerPaymentId: string
): Promise<Payment | null> => {
  const row = await readPaymentRowByProviderPaymentId(providerPaymentId);

  return row ? toPayment(row) : null;
};
