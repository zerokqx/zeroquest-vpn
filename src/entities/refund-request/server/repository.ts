import { randomUUID } from 'node:crypto';
import {
  decryptJson,
  encryptJson,
  getPrismaClient,
} from '@/shared/db/server';
import type { PaymentPayload } from '@/entities/payment/model/types';
import type {
  CreateRefundRequestRecordInput,
  RefundRequest,
  RefundRequestPayload,
  RefundRequestStatus,
} from '../model/types';

interface UserPayload {
  login: string;
}

const toRefundRequest = (row: {
  amount: number;
  createdAt: Date;
  currency: string;
  id: string;
  paymentId: string;
  payment: {
    createdAt: Date;
    paidAt: Date | null;
    payload: string;
  };
  payload: string;
  provider: string;
  providerRefundId: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  reviewedByUser: {
    payload: string;
  } | null;
  reviewedByUserId: string | null;
  status: string;
  updatedAt: Date;
  user: {
    payload: string;
  };
  userId: string;
  vpnKeyId: string;
}): RefundRequest => {
  const payload = decryptJson<RefundRequestPayload>(row.payload);
  const paymentPayload = decryptJson<PaymentPayload>(row.payment.payload);
  const userPayload = decryptJson<UserPayload>(row.user.payload);
  const reviewedByLogin = row.reviewedByUser
    ? decryptJson<UserPayload>(row.reviewedByUser.payload).login
    : null;

  return {
    amount: row.amount,
    createdAt: row.createdAt.toISOString(),
    currency: row.currency,
    displayName: payload.displayName,
    errorMessage: payload.errorMessage,
    id: row.id,
    paymentId: row.paymentId,
    planTitle: payload.planTitle || paymentPayload.planTitle,
    provider: row.provider,
    providerRefundId: row.providerRefundId,
    providerStatus: payload.providerStatus,
    purchaseAt:
      row.payment.paidAt?.toISOString() ?? row.payment.createdAt.toISOString(),
    reason: payload.reason,
    requestedAt: row.requestedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByLogin,
    reviewedByUserId: row.reviewedByUserId,
    status: row.status as RefundRequestStatus,
    updatedAt: row.updatedAt.toISOString(),
    userId: row.userId,
    userLogin: userPayload.login,
    vpnKeyId: row.vpnKeyId,
  };
};

const refundRequestInclude = {
  payment: {
    select: {
      createdAt: true,
      paidAt: true,
      payload: true,
    },
  },
  reviewedByUser: {
    select: {
      payload: true,
    },
  },
  user: {
    select: {
      payload: true,
    },
  },
} as const;

const readRefundRequestById = async (refundRequestId: string) =>
  await getPrismaClient().refundRequestStore.findUnique({
    where: {
      id: refundRequestId,
    },
    include: refundRequestInclude,
  });

export const createRefundRequestRecord = async (
  input: CreateRefundRequestRecordInput
): Promise<RefundRequest> => {
  const refundRequestId = randomUUID();
  const now = new Date();

  await getPrismaClient().refundRequestStore.create({
    data: {
      amount: input.amount,
      createdAt: now,
      currency: input.currency,
      id: refundRequestId,
      paymentId: input.paymentId,
      payload: encryptJson(input.payload),
      provider: input.provider,
      requestedAt: now,
      status: 'requested',
      updatedAt: now,
      userId: input.userId,
      vpnKeyId: input.vpnKeyId,
    },
  });

  return (await getRefundRequestById(refundRequestId)) as RefundRequest;
};

export const getRefundRequestById = async (
  refundRequestId: string
): Promise<RefundRequest | null> => {
  const row = await readRefundRequestById(refundRequestId);

  return row ? toRefundRequest(row) : null;
};

export const getRefundRequestByPaymentId = async (
  paymentId: string
): Promise<RefundRequest | null> => {
  const row = await getPrismaClient().refundRequestStore.findUnique({
    where: {
      paymentId,
    },
    include: refundRequestInclude,
  });

  return row ? toRefundRequest(row) : null;
};

export const listRefundRequestsByUserId = async (
  userId: string
): Promise<RefundRequest[]> =>
  (await getPrismaClient().refundRequestStore.findMany({
    where: {
      userId,
    },
    include: refundRequestInclude,
    orderBy: {
      requestedAt: 'desc',
    },
  })).map(toRefundRequest);

export const listRefundRequestsForAdmin = async (): Promise<RefundRequest[]> =>
  (await getPrismaClient().refundRequestStore.findMany({
    include: refundRequestInclude,
    orderBy: {
      requestedAt: 'desc',
    },
  })).map(toRefundRequest);

export const updateRefundRequestState = async (
  refundRequestId: string,
  input: {
    errorMessage?: string | null;
    providerRefundId?: string | null;
    providerStatus?: string | null;
    reviewedAt?: Date | null;
    reviewedByUserId?: string | null;
    status: RefundRequestStatus;
  }
): Promise<RefundRequest> => {
  const row = await getPrismaClient().refundRequestStore.findUnique({
    where: {
      id: refundRequestId,
    },
    select: {
      payload: true,
    },
  });

  if (!row) {
    throw new Error('Запрос на возврат не найден');
  }

  const payload = decryptJson<RefundRequestPayload>(row.payload);

  await getPrismaClient().refundRequestStore.update({
    where: {
      id: refundRequestId,
    },
    data: {
      payload: encryptJson({
        ...payload,
        errorMessage:
          input.errorMessage === undefined ? payload.errorMessage : input.errorMessage,
        providerStatus:
          input.providerStatus === undefined
            ? payload.providerStatus
            : input.providerStatus,
      }),
      providerRefundId:
        input.providerRefundId === undefined ? undefined : input.providerRefundId,
      reviewedAt: input.reviewedAt === undefined ? undefined : input.reviewedAt,
      reviewedByUserId:
        input.reviewedByUserId === undefined ? undefined : input.reviewedByUserId,
      status: input.status,
      updatedAt: new Date(),
    },
  });

  return (await getRefundRequestById(refundRequestId)) as RefundRequest;
};
