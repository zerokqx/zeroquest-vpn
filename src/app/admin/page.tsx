import { redirect } from 'next/navigation';
import { listPlans } from '@/entities/plan';
import { listPromoCodes } from '@/entities/promo-code';
import { getCurrentUser } from '@/entities/user';
import { AdminPage } from '@/widgets/admin';

export default async function AdminScreen() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth?next=/admin');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  const [plans, promoCodes] = await Promise.all([
    listPlans(),
    listPromoCodes(),
  ]);

  return <AdminPage plans={plans} promoCodes={promoCodes} user={user} />;
}
