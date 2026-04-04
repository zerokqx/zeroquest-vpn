import { randomUUID } from 'node:crypto';
import {
  createLookupHash,
  decryptJson,
  encryptJson,
  getPrismaClient,
  normalizeLookupInput,
} from '@/shared/db/server';
import type { User } from '../model/types';

interface UserPayload {
  login: string;
  passwordHash: string;
}

const toUser = (row: {
  createdAt: Date;
  id: string;
  payload: string;
  role: string;
}): User => {
  const payload = decryptJson<UserPayload>(row.payload);

  return {
    id: row.id,
    login: payload.login,
    role: row.role as 'admin' | 'customer',
    createdAt: row.createdAt.toISOString(),
  };
};

export const normalizeLogin = (login: string): string =>
  normalizeLookupInput(login);

export const findUserByLogin = async (
  login: string
): Promise<(User & { passwordHash: string }) | null> => {
  const prisma = getPrismaClient();
  const loginLookup = createLookupHash(login);
  const user = await prisma.userStore.findUnique({
    where: {
      loginLookup,
    },
    select: {
      createdAt: true,
      id: true,
      payload: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  const payload = decryptJson<UserPayload>(user.payload);

  return {
    ...toUser(user),
    passwordHash: payload.passwordHash,
  };
};

export const findUserById = async (userId: string): Promise<User | null> => {
  const prisma = getPrismaClient();
  const user = await prisma.userStore.findUnique({
    where: {
      id: userId,
    },
    select: {
      createdAt: true,
      id: true,
      payload: true,
      role: true,
    },
  });

  return user ? toUser(user) : null;
};

export const createUser = async (
  login: string,
  passwordHash: string
): Promise<User> => {
  const prisma = getPrismaClient();
  const normalizedLogin = normalizeLogin(login);
  const loginLookup = createLookupHash(normalizedLogin);
  const existing = await prisma.userStore.findUnique({
    where: {
      loginLookup,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error('Пользователь с таким логином уже существует');
  }

  const now = new Date().toISOString();
  const userId = randomUUID();

  await prisma.userStore.create({
    data: {
      createdAt: new Date(now),
      id: userId,
      loginLookup,
      payload: encryptJson({
        login: normalizedLogin,
        passwordHash,
      }),
      role: 'customer',
      updatedAt: new Date(now),
    },
  });

  return {
    id: userId,
    login: normalizedLogin,
    role: 'customer',
    createdAt: now,
  };
};
