'use server';

import { redirect } from 'next/navigation';
import {
  clearAuthSessionCookie,
  setAuthSessionCookie,
} from '@/shared/auth/server/session';
import {
  normalizeNextPath,
  resolvePostAuthRedirectPath,
} from '../model/navigation';
import { authCredentialsSchema, registerFormSchema } from '../model/schemas';
import type { AuthActionState } from '../model/action-state';
import { loginUser } from './login-user';
import { registerUser } from './register-user';

const getString = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value : '';

const resolveRedirectPath = (formData: FormData, role: 'admin' | 'customer') =>
  resolvePostAuthRedirectPath(
    { role },
    normalizeNextPath(getString(formData.get('next')) || null)
  );

export const loginWithCredentialsAction = async (
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> => {
  const parsed = authCredentialsSchema.safeParse({
    login: getString(formData.get('login')),
    password: getString(formData.get('password')),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Проверьте данные формы',
    };
  }

  try {
    const { token, user } = await loginUser(parsed.data);

    await setAuthSessionCookie(token);

    redirect(resolveRedirectPath(formData, user.role));
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Не удалось войти в аккаунт',
    };
  }
};

export const registerWithCredentialsAction = async (
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> => {
  const parsed = registerFormSchema.safeParse({
    confirmPassword: getString(formData.get('confirmPassword')),
    login: getString(formData.get('login')),
    password: getString(formData.get('password')),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || 'Проверьте данные формы',
    };
  }

  try {
    const { token, user } = await registerUser({
      login: parsed.data.login,
      password: parsed.data.password,
    });

    await setAuthSessionCookie(token);

    redirect(resolveRedirectPath(formData, user.role));
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Не удалось создать аккаунт',
    };
  }
};

export const logoutAction = async (): Promise<void> => {
  await clearAuthSessionCookie();
  redirect('/');
};
