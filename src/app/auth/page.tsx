import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/entities/user';
import { AuthPage } from '@/widgets/auth';

export default async function AuthScreen() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  }

  return <AuthPage />;
}
