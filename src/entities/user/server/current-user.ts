import { cookies } from 'next/headers';
import { verifyAuthToken } from '@/shared/auth/server/session';
import { authConfig } from '@/shared/config/env.server';
import { findUserById } from './repository';
import type { User } from '../model/types';

export const getCurrentUser = async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(authConfig.cookieName)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);

  if (!payload) {
    return null;
  }

  return await findUserById(payload.userId);
};

export const requireCurrentUser = async (): Promise<User> => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
};

export const requireAdminUser = async (): Promise<User> => {
  const user = await requireCurrentUser();

  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }

  return user;
};
