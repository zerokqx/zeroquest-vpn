import { redirect } from 'next/navigation';
import {
  listAccessRecordsWithMonitoringByUserId,
} from '@/entities/access';
import { listPublicPlans } from '@/entities/plan';
import { getCurrentUser } from '@/entities/user';
import { DashboardPage } from '@/widgets/dashboard';

export default async function DashboardScreen() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth?next=/dashboard');
  }

  const [accessRecords, plans] = await Promise.all([
    listAccessRecordsWithMonitoringByUserId(user.id),
    listPublicPlans(),
  ]);

  return <DashboardPage accessRecords={accessRecords} plans={plans} user={user} />;
}
