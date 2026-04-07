import { redirect } from 'next/navigation';
import { listRefundRequestsForAdmin } from '@/entities/refund-request';
import { getCurrentUser } from '@/entities/user';
import { RefundsPage } from '@/widgets/admin/ui/refunds-page';

export default async function AdminRefundsScreen() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth?next=/admin/refunds');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  const requests = await listRefundRequestsForAdmin();

  return <RefundsPage requests={requests} />;
}
