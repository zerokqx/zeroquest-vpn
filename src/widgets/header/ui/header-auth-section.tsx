import { Avatar, Button, Group, Stack } from '@mantine/core';
import Link from 'next/link';
import { getCurrentUser } from '@/entities/user';
import { LogoutButton } from '@/features/auth/ui/logout-button';
import { ColorSchemeToggle } from '@/features/theme/ui/color-scheme-toggle';
import { MobileHeaderMenu } from './mobile-header-menu';
import styles from './app-header.module.css';

const toInitials = (login: string): string =>
  login
    .split(/[\W_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || login.slice(0, 2).toUpperCase();

export async function HeaderAuthSection() {
  const user = await getCurrentUser();

  return (
    <>
      <Group
        className={styles.actions}
        gap="sm"
        visibleFrom="md"
        wrap="nowrap"
      >
        <ColorSchemeToggle />
        {user ? (
          <Group gap="sm" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Link href="/dashboard">
                <Button component="span" variant="light">
                  Dashboard
                </Button>
              </Link>
              {user.role === 'admin' ? (
                <Link href="/admin">
                  <Button component="span" variant="light">
                    Admin
                  </Button>
                </Link>
              ) : null}
            </Group>
            <Group className={styles.identity} gap="sm" wrap="nowrap">
              <Avatar color="accent" radius="xl" size={38}>
                {toInitials(user.login)}
              </Avatar>
              <Stack gap={1}>
                <span className={styles.identityName}>{user.login}</span>
                <span className={styles.identityCopy}>
                  {user.role === 'admin' ? 'Администратор' : 'Аккаунт активен'}
                </span>
              </Stack>
            </Group>
            <LogoutButton />
          </Group>
        ) : (
          <Group gap="sm">
            <Link href="/auth">
              <Button component="span" variant="light">
                Войти
              </Button>
            </Link>
            <Link href="/auth?mode=register">
              <Button component="span">Регистрация</Button>
            </Link>
          </Group>
        )}
      </Group>

      <Group className={styles.mobileOnly} hiddenFrom="md">
        <MobileHeaderMenu
          user={user ? { login: user.login, role: user.role } : null}
        />
      </Group>
    </>
  );
}
