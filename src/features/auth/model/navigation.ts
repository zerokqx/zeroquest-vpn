import type { User } from '@/entities/user/model/types';

export const normalizeNextPath = (value: string | null): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }

  return value;
};

export const resolvePostAuthRedirectPath = (
  user: Pick<User, 'role'>,
  nextPath: string
): string =>
  user.role === 'admin' && nextPath === '/dashboard' ? '/admin' : nextPath;
