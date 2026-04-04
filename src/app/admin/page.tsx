import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/entities/user';
import { AdminShell } from '@/widgets/admin';

export default async function AdminScreen() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth?next=/admin');
  }

  if (user.role !== 'admin') {
    redirect('/');
  }

  return <AdminShell />;
}
