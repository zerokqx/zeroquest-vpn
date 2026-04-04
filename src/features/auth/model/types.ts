import type { User } from '@/entities/user/model/types';

export interface AuthCredentials {
  login: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export { normalizeNextPath, resolvePostAuthRedirectPath } from './navigation';
