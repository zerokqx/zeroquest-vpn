import type { AuthCredentials, AuthResponse } from '../model/types';

const parseError = async (response: Response): Promise<string> => {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return payload?.error || 'Не удалось выполнить запрос';
};

const postAuthRequest = async (
  path: string,
  payload: AuthCredentials
): Promise<AuthResponse> => {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as AuthResponse;
};

export const registerRequest = async (
  payload: AuthCredentials
): Promise<AuthResponse> => await postAuthRequest('/api/auth/register', payload);

export const loginRequest = async (
  payload: AuthCredentials
): Promise<AuthResponse> => await postAuthRequest('/api/auth/login', payload);

export const logoutRequest = async (): Promise<void> => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
};
