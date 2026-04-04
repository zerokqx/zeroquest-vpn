import { hash } from 'bcryptjs';
import { createUser } from '@/entities/user';
import { signAuthToken } from '@/shared/auth/server/session';
import type { AuthCredentials } from '../model/types';

export const registerUser = async (
  input: AuthCredentials
): Promise<{
  token: string;
  user: Awaited<ReturnType<typeof createUser>>;
}> => {
  const passwordHash = await hash(input.password, 12);
  const user = await createUser(input.login, passwordHash);
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
