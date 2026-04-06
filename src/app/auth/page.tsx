import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/entities/user';
import { normalizeNextPath } from '@/features/auth';
import { AuthPage } from '@/widgets/auth';

const getSearchParamValue = (value: string | string[] | undefined): string | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null;

export default async function AuthScreen(
  props: PageProps<'/auth'>
) {
  const user = await getCurrentUser();
  const searchParams = await props.searchParams;

  if (user) {
    redirect(user.role === 'admin' ? '/admin' : '/dashboard');
  }

  return (
    <AuthPage
      initialMode={getSearchParamValue(searchParams.mode) === 'register' ? 'register' : 'login'}
      nextPath={normalizeNextPath(getSearchParamValue(searchParams.next))}
    />
  );
}
