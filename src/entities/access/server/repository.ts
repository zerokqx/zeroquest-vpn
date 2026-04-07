import { randomUUID } from 'node:crypto';
import { decryptJson, encryptJson, getPrismaClient } from '@/shared/db/server';
import type { PaymentPayload } from '@/entities/payment/model/types';
import type {
  AccessRecord,
  AccessRecordWithStatus,
  VpnKeyRecord,
} from '../model/types';

interface VpnKeyPayload {
  deviceName: string;
  displayName: string;
  inboundRemark: string;
  threeXUiClientId: string;
  threeXUiEmail: string;
}

interface EncryptedKeyValuePayload {
  value: string;
}

const toNumber = (value: bigint | number | null): number | null => {
  if (value === null) {
    return null;
  }

  return typeof value === 'bigint' ? Number(value) : value;
};

const toVpnKeyRecord = (row: {
  expiresAt: Date;
  id: string;
  inboundId: number;
  issuedAt: Date;
  keyValue: string;
  payload: string;
  paymentId: string;
  planId: string;
  revokedAt: Date | null;
  trafficLimitBytes: bigint | number | null;
  userId: string;
}): VpnKeyRecord => {
  const payload = decryptJson<VpnKeyPayload>(row.payload);
  const keyValue = decryptJson<EncryptedKeyValuePayload>(row.keyValue);

  return {
    deviceName: payload.deviceName,
    displayName: payload.displayName,
    expiresAt: row.expiresAt.toISOString(),
    id: row.id,
    inboundId: row.inboundId,
    inboundRemark: payload.inboundRemark,
    issuedAt: row.issuedAt.toISOString(),
    keyValue: keyValue.value,
    paymentId: row.paymentId,
    planId: row.planId,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    threeXUiClientId: payload.threeXUiClientId,
    threeXUiEmail: payload.threeXUiEmail,
    trafficLimitBytes: toNumber(row.trafficLimitBytes),
    userId: row.userId,
  };
};

const toAccessRecord = (row: {
  expiresAt: Date;
  id: string;
  inboundId: number;
  issuedAt: Date;
  keyValue: string;
  payload: string;
  payment: {
    amount: number;
    payload: string;
  };
  paymentId: string;
  planId: string;
  revokedAt: Date | null;
  trafficLimitBytes: bigint | number | null;
  userId: string;
}): AccessRecord => {
  const vpnKey = toVpnKeyRecord(row);
  const payment = decryptJson<PaymentPayload>(row.payment.payload);

  return {
    accessUri: vpnKey.keyValue,
    createdAt: vpnKey.issuedAt,
    deviceName: vpnKey.deviceName,
    displayName: vpnKey.displayName,
    expiresAt: vpnKey.expiresAt,
    finalPriceRub: payment.finalPriceRub,
    id: vpnKey.id,
    inboundId: vpnKey.inboundId,
    inboundRemark: vpnKey.inboundRemark,
    originalPriceRub: payment.originalPriceRub,
    paymentId: row.paymentId,
    periodLabel: payment.periodLabel,
    planId: row.planId,
    planPriceRub: row.payment.amount,
    planTitle: payment.planTitle,
    promoCode: payment.promoCode,
    speedLimitMbps: payment.speedLimitMbps,
    threeXUiClientId: vpnKey.threeXUiClientId,
    threeXUiEmail: vpnKey.threeXUiEmail,
    trafficLimitBytes: toNumber(row.trafficLimitBytes),
    userId: row.userId,
  };
};

const toAccessRecordWithStatus = (row: Parameters<typeof toAccessRecord>[0]): AccessRecordWithStatus => {
  const record = toAccessRecord(row);

  return {
    ...record,
    isActive:
      row.revokedAt === null &&
      new Date(record.expiresAt).getTime() > Date.now(),
  };
};

export interface CreateVpnKeyInput {
  deviceName: string;
  displayName: string;
  expiresAt: string;
  inboundId: number;
  inboundRemark: string;
  keyValue: string;
  paymentId: string;
  planId: string;
  threeXUiClientId: string;
  threeXUiEmail: string;
  trafficLimitBytes: number | null;
  userId: string;
}

export const listAccessRecordsByUserId = async (
  userId: string
): Promise<AccessRecord[]> =>
  (await getPrismaClient().vpnKeyStore.findMany({
    where: {
      revokedAt: null,
      userId,
    },
    include: {
      payment: {
        select: {
          amount: true,
          payload: true,
        },
      },
    },
    orderBy: {
      issuedAt: 'desc',
    },
  })).map(toAccessRecord);

export const listAccessRecordsWithStatusByUserId = async (
  userId: string
): Promise<AccessRecordWithStatus[]> =>
  (await getPrismaClient().vpnKeyStore.findMany({
    where: {
      revokedAt: null,
      userId,
    },
    include: {
      payment: {
        select: {
          amount: true,
          payload: true,
        },
      },
    },
    orderBy: {
      issuedAt: 'desc',
    },
  })).map(toAccessRecordWithStatus);

export const createVpnKey = async (
  input: CreateVpnKeyInput
): Promise<VpnKeyRecord> => {
  const vpnKeyId = randomUUID();
  const issuedAt = new Date();

  await getPrismaClient().vpnKeyStore.create({
    data: {
      expiresAt: new Date(input.expiresAt),
      id: vpnKeyId,
      inboundId: input.inboundId,
      issuedAt,
      keyValue: encryptJson({
        value: input.keyValue,
      }),
      payload: encryptJson({
        deviceName: input.deviceName,
        displayName: input.displayName,
        inboundRemark: input.inboundRemark,
        threeXUiClientId: input.threeXUiClientId,
        threeXUiEmail: input.threeXUiEmail,
      }),
      paymentId: input.paymentId,
      planId: input.planId,
      trafficLimitBytes:
        input.trafficLimitBytes === null ? null : BigInt(input.trafficLimitBytes),
      userId: input.userId,
    },
  });

  return (await getVpnKeyById(vpnKeyId)) as VpnKeyRecord;
};

export const getVpnKeyById = async (
  vpnKeyId: string
): Promise<VpnKeyRecord | null> => {
  const row = await getPrismaClient().vpnKeyStore.findUnique({
    where: {
      id: vpnKeyId,
    },
  });

  return row ? toVpnKeyRecord(row) : null;
};

export const getVpnKeyByPaymentId = async (
  paymentId: string
): Promise<VpnKeyRecord | null> => {
  const row = await getPrismaClient().vpnKeyStore.findUnique({
    where: {
      paymentId,
    },
  });

  return row ? toVpnKeyRecord(row) : null;
};

export const getAccessRecordByIdForUser = async (
  accessRecordId: string,
  userId: string
): Promise<AccessRecord | null> => {
  const row = await getPrismaClient().vpnKeyStore.findFirst({
    where: {
      id: accessRecordId,
      revokedAt: null,
      userId,
    },
    include: {
      payment: {
        select: {
          amount: true,
          payload: true,
        },
      },
    },
  });

  return row ? toAccessRecord(row) : null;
};

export const revokeVpnKeyByIdForUser = async (
  accessRecordId: string,
  userId: string
): Promise<void> => {
  await getPrismaClient().vpnKeyStore.updateMany({
    where: {
      id: accessRecordId,
      revokedAt: null,
      userId,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
