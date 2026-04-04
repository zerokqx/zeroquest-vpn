import { randomUUID } from 'node:crypto';
import { decryptJson, encryptJson, getPrismaClient } from '@/shared/db/server';
import type { AccessRecord, AccessRecordWithStatus } from '../model/types';

type AccessRecordPayload = Omit<
  AccessRecord,
  'createdAt' | 'expiresAt' | 'id' | 'planId' | 'userId'
>;

const toAccessRecord = (row: {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  payload: string;
  planId: string;
  userId: string;
}): AccessRecord => {
  const payload = decryptJson<AccessRecordPayload>(row.payload);

  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId,
    planTitle: payload.planTitle,
    originalPriceRub: payload.originalPriceRub,
    finalPriceRub: payload.finalPriceRub,
    planPriceRub: payload.planPriceRub,
    periodLabel: payload.periodLabel,
    promoCode: payload.promoCode,
    deviceName: payload.deviceName,
    displayName: payload.displayName,
    threeXUiClientId: payload.threeXUiClientId,
    threeXUiEmail: payload.threeXUiEmail,
    inboundId: payload.inboundId,
    inboundRemark: payload.inboundRemark,
    accessUri: payload.accessUri,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    trafficLimitBytes: payload.trafficLimitBytes,
    speedLimitMbps: payload.speedLimitMbps,
  };
};

const toAccessRecordWithStatus = (row: {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  payload: string;
  planId: string;
  userId: string;
}): AccessRecordWithStatus => {
  const record = toAccessRecord(row);

  return {
    ...record,
    isActive: new Date(record.expiresAt).getTime() > Date.now(),
  };
};

export type CreateAccessRecordInput = Omit<AccessRecord, 'id' | 'createdAt'>;

export const listAccessRecordsByUserId = async (
  userId: string
): Promise<AccessRecord[]> => {
  return (await getPrismaClient().accessRecordStore.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })).map(toAccessRecord);
};

export const listAccessRecordsWithStatusByUserId = async (
  userId: string
): Promise<AccessRecordWithStatus[]> => {
  return (await getPrismaClient().accessRecordStore.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })).map(toAccessRecordWithStatus);
};

export const createAccessRecord = async (
  input: CreateAccessRecordInput
): Promise<AccessRecord> => {
  const prisma = getPrismaClient();
  const accessRecordId = randomUUID();
  const now = new Date().toISOString();

  await prisma.accessRecordStore.create({
    data: {
      createdAt: new Date(now),
      expiresAt: new Date(input.expiresAt),
      id: accessRecordId,
      payload: encryptJson({
        planTitle: input.planTitle,
        originalPriceRub: input.originalPriceRub,
        finalPriceRub: input.finalPriceRub,
        planPriceRub: input.planPriceRub,
        periodLabel: input.periodLabel,
        promoCode: input.promoCode,
        deviceName: input.deviceName,
        displayName: input.displayName,
        threeXUiClientId: input.threeXUiClientId,
        threeXUiEmail: input.threeXUiEmail,
        inboundId: input.inboundId,
        inboundRemark: input.inboundRemark,
        accessUri: input.accessUri,
        trafficLimitBytes: input.trafficLimitBytes,
        speedLimitMbps: input.speedLimitMbps,
      }),
      planId: input.planId,
      userId: input.userId,
    },
  });

  return (await getAccessRecordByIdForUser(accessRecordId, input.userId)) as AccessRecord;
};

export const getAccessRecordByIdForUser = async (
  accessRecordId: string,
  userId: string
): Promise<AccessRecord | null> => {
  const row = await getPrismaClient().accessRecordStore.findFirst({
    where: {
      id: accessRecordId,
      userId,
    },
  });

  return row ? toAccessRecord(row) : null;
};

export const deleteAccessRecordByIdForUser = async (
  accessRecordId: string,
  userId: string
): Promise<void> => {
  await getPrismaClient().accessRecordStore.deleteMany({
    where: {
      id: accessRecordId,
      userId,
    },
  });
};
