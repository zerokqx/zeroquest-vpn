import { randomUUID } from 'node:crypto';
import {
  createLookupHash,
  decryptJson,
  encryptJson,
  getPrismaClient,
  normalizeLookupInput,
} from '@/shared/db/server';
import type { PromoCode, UpsertPromoCodeInput } from '../model/types';

type PromoCodePayload = Omit<PromoCode, 'createdAt' | 'id' | 'updatedAt'>;

const toPromoCode = (row: {
  createdAt: Date;
  id: string;
  payload: string;
  updatedAt: Date;
}): PromoCode => {
  const payload = decryptJson<PromoCodePayload>(row.payload);

  return {
    id: row.id,
    code: payload.code,
    description: payload.description,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    usageLimit: payload.usageLimit,
    usedCount: payload.usedCount,
    expiresAt: payload.expiresAt,
    appliesToPlanIds: payload.appliesToPlanIds,
    isActive: payload.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const normalizePromoCode = (code: string): string =>
  normalizeLookupInput(code).toUpperCase();

export const listPromoCodes = async (): Promise<PromoCode[]> => {
  return (await getPrismaClient().promoCodeStore.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })).map(toPromoCode);
};

export const getPromoCodeById = async (
  promoCodeId: string
): Promise<PromoCode | null> => {
  const row = await getPrismaClient().promoCodeStore.findUnique({
    where: {
      id: promoCodeId,
    },
  });

  return row ? toPromoCode(row) : null;
};

export const getPromoCodeByCode = async (
  code: string
): Promise<PromoCode | null> => {
  const row = await getPrismaClient().promoCodeStore.findUnique({
    where: {
      codeLookup: createLookupHash(code),
    },
  });

  return row ? toPromoCode(row) : null;
};

export const createPromoCode = async (
  input: UpsertPromoCodeInput
): Promise<PromoCode> => {
  const prisma = getPrismaClient();
  const normalizedCode = normalizePromoCode(input.code);
  const existing = await getPromoCodeByCode(normalizedCode);

  if (existing) {
    throw new Error('Промокод с таким кодом уже существует');
  }

  const now = new Date().toISOString();
  const promoCodeId = randomUUID();

  await prisma.promoCodeStore.create({
    data: {
      codeLookup: createLookupHash(normalizedCode),
      createdAt: new Date(now),
      id: promoCodeId,
      payload: encryptJson({
        ...input,
        code: normalizedCode,
        usedCount: 0,
      }),
      updatedAt: new Date(now),
    },
  });

  return (await getPromoCodeById(promoCodeId)) as PromoCode;
};

export const updatePromoCode = async (
  promoCodeId: string,
  input: UpsertPromoCodeInput
): Promise<PromoCode> => {
  const prisma = getPrismaClient();
  const existing = await getPromoCodeById(promoCodeId);

  if (!existing) {
    throw new Error('Промокод не найден');
  }

  const normalizedCode = normalizePromoCode(input.code);
  const sameCodeOwner = await getPromoCodeByCode(normalizedCode);

  if (sameCodeOwner && sameCodeOwner.id !== promoCodeId) {
    throw new Error('Промокод с таким кодом уже существует');
  }

  const now = new Date().toISOString();

  await prisma.promoCodeStore.update({
    where: {
      id: promoCodeId,
    },
    data: {
      codeLookup: createLookupHash(normalizedCode),
      payload: encryptJson({
        ...input,
        code: normalizedCode,
        usedCount: existing.usedCount,
      }),
      updatedAt: new Date(now),
    },
  });

  return (await getPromoCodeById(promoCodeId)) as PromoCode;
};

export const markPromoCodeAsUsed = async (
  promoCodeId: string
): Promise<PromoCode> => {
  const existing = await getPromoCodeById(promoCodeId);

  if (!existing) {
    throw new Error('Промокод не найден');
  }

  const now = new Date().toISOString();

  await getPrismaClient().promoCodeStore.update({
    where: {
      id: promoCodeId,
    },
    data: {
      payload: encryptJson({
        code: existing.code,
        description: existing.description,
        discountType: existing.discountType,
        discountValue: existing.discountValue,
        usageLimit: existing.usageLimit,
        usedCount: existing.usedCount + 1,
        expiresAt: existing.expiresAt,
        appliesToPlanIds: existing.appliesToPlanIds,
        isActive: existing.isActive,
      }),
      updatedAt: new Date(now),
    },
  });

  return (await getPromoCodeById(promoCodeId)) as PromoCode;
};

export const deletePromoCode = async (promoCodeId: string): Promise<void> => {
  await getPrismaClient().promoCodeStore.delete({
    where: {
      id: promoCodeId,
    },
  });
};
