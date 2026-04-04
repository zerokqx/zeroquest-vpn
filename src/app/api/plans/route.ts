import { listPublicPlans } from '@/entities/plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const plans = await listPublicPlans();

  return Response.json({
    plans,
  });
}
