import { redirect } from 'next/navigation';
import {
  listAccessRecordsWithMonitoringByUserId,
} from '@/entities/access';
import { listPublicPlans } from '@/entities/plan';
import { listRefundRequestsByUserId } from '@/entities/refund-request';
import { getCurrentUser } from '@/entities/user';
import { DashboardPage } from '@/widgets/dashboard';

export default async function DashboardScreen() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth?next=/dashboard');
  }

  const [accessRecords, plans, refundRequests] = await Promise.all([
    listAccessRecordsWithMonitoringByUserId(user.id),
    listPublicPlans(),
    listRefundRequestsByUserId(user.id),
  ]);

  return (
    <DashboardPage
      accessRecords={accessRecords}
      plans={plans}
      refundRequests={refundRequests}
      user={user}
    />
  );
}
