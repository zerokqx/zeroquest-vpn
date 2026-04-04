import { getCurrentUser } from '@/entities/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();

  return Response.json({
    user,
  });
}
