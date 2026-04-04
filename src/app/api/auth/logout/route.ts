import { clearAuthResponse } from '@/shared/auth/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  return clearAuthResponse({ success: true });
}
