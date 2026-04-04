import { listPublicPlans } from '@/entities/plan';
import { getCurrentUser } from '@/entities/user';
import { HomePage } from '@/widgets/home';
import { redirect } from 'next/navigation';

export default async function Home() {
  const viewer = await getCurrentUser();

  if (viewer) {
    redirect('/dashboard');
  }

  const plans = await listPublicPlans();

  return <HomePage plans={plans} viewer={viewer} />;
}
