import { getPrismaClient } from '@/shared/db/server';
import type { Inbound, UpsertInboundInput } from '../model/types';

const toInbound = (row: {
  createdAt: Date;
  id: number;
  isActive: boolean;
  name: string;
  type: string;
  updatedAt: Date;
  value: string;
}): Inbound => ({
  createdAt: row.createdAt.toISOString(),
  id: row.id,
  isActive: row.isActive,
  name: row.name,
  type: row.type,
  updatedAt: row.updatedAt.toISOString(),
  value: row.value,
});

export const listInbounds = async (): Promise<Inbound[]> =>
  (await getPrismaClient().inboundStore.findMany({
    orderBy: [
      { isActive: 'desc' },
      { id: 'asc' },
    ],
  })).map(toInbound);

export const listActiveInbounds = async (): Promise<Inbound[]> =>
  (await getPrismaClient().inboundStore.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      id: 'asc',
    },
  })).map(toInbound);

export const getInboundById = async (
  inboundId: number
): Promise<Inbound | null> => {
  const row = await getPrismaClient().inboundStore.findUnique({
    where: {
      id: inboundId,
    },
  });

  return row ? toInbound(row) : null;
};

export const createInbound = async (
  input: UpsertInboundInput
): Promise<Inbound> => {
  const prisma = getPrismaClient();
  const now = new Date();

  await prisma.inboundStore.create({
    data: {
      createdAt: now,
      id: input.id,
      isActive: input.isActive,
      name: input.name,
      type: input.type,
      updatedAt: now,
      value: input.value,
    },
  });

  return (await getInboundById(input.id)) as Inbound;
};

export const updateInbound = async (
  inboundId: number,
  input: UpsertInboundInput
): Promise<Inbound> => {
  const prisma = getPrismaClient();
  const existing = await getInboundById(inboundId);

  if (!existing) {
    throw new Error('Inbound не найден');
  }

  const nextId = input.id;

  if (nextId !== inboundId) {
    const duplicate = await getInboundById(nextId);

    if (duplicate) {
      throw new Error('Inbound с таким ID уже существует');
    }
  }

  await prisma.inboundStore.update({
    where: {
      id: inboundId,
    },
    data: {
      id: nextId,
      isActive: input.isActive,
      name: input.name,
      type: input.type,
      updatedAt: new Date(),
      value: input.value,
    },
  });

  return (await getInboundById(nextId)) as Inbound;
};

export const deleteInbound = async (inboundId: number): Promise<void> => {
  await getPrismaClient().inboundStore.delete({
    where: {
      id: inboundId,
    },
  });
};
