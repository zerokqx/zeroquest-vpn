import { compare } from 'bcryptjs';
import { findUserByLogin } from '@/entities/user';
import { signAuthToken } from '@/shared/auth/server/session';
import type { AuthCredentials } from '../model/types';

export const loginUser = async (
  input: AuthCredentials
): Promise<{
  token: string;
  user: NonNullable<Awaited<ReturnType<typeof findUserByLogin>>>;
}> => {
  const user = await findUserByLogin(input.login);

  if (!user) {
    throw new Error('Неверный логин или пароль');
  }

  const isValidPassword = await compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Неверный логин или пароль');
  }

  const token = await signAuthToken({
    userId: user.id,
    login: user.login,
    role: user.role,
  });

  return {
    token,
    user,
  };
};
