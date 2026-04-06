import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import { NextResponse } from 'next/server';
import { authConfig } from '@/shared/config/env.server';

interface AuthTokenPayload extends JWTPayload {
  userId: string;
  login: string;
  role: 'admin' | 'customer';
}

const secretKey = new TextEncoder().encode(authConfig.jwtSecret);
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const buildAuthCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge,
});

export const signAuthToken = async (
  payload: AuthTokenPayload
): Promise<string> =>
  await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(authConfig.jwtExpiresIn)
    .sign(secretKey);

export const verifyAuthToken = async (
  token: string
): Promise<AuthTokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, secretKey);

    if (
      typeof payload.userId !== 'string' ||
      typeof payload.login !== 'string' ||
      (payload.role !== 'admin' && payload.role !== 'customer')
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      login: payload.login,
      role: payload.role,
    };
  } catch {
    return null;
  }
};

export const createAuthResponse = (
  payload: unknown,
  token: string
): NextResponse => {
  const response = NextResponse.json(payload);

  response.cookies.set(
    authConfig.cookieName,
    token,
    buildAuthCookieOptions(AUTH_COOKIE_MAX_AGE_SECONDS)
  );

  return response;
};

export const clearAuthResponse = (payload: unknown): NextResponse => {
  const response = NextResponse.json(payload);

  response.cookies.set(authConfig.cookieName, '', buildAuthCookieOptions(0));

  return response;
};

export const setAuthSessionCookie = async (token: string): Promise<void> => {
  const cookieStore = await cookies();

  cookieStore.set(
    authConfig.cookieName,
    token,
    buildAuthCookieOptions(AUTH_COOKIE_MAX_AGE_SECONDS)
  );
};

export const clearAuthSessionCookie = async (): Promise<void> => {
  const cookieStore = await cookies();

  cookieStore.set(authConfig.cookieName, '', buildAuthCookieOptions(0));
};
