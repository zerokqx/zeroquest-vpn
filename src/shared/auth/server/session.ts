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

  response.cookies.set(authConfig.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
};

export const clearAuthResponse = (payload: unknown): NextResponse => {
  const response = NextResponse.json(payload);

  response.cookies.set(authConfig.cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
};
