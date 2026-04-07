'use client';

import {
  Avatar,
  Burger,
  Button,
  Divider,
  Drawer,
  Group,
  NavLink,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  PanelTopOpen,
  RotateCcw,
  Settings,
  Shield,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from '@/features/auth/ui/logout-button';
import { ColorSchemeToggle } from '@/features/theme/ui/color-scheme-toggle';
import styles from './mobile-header-menu.module.css';

interface MobileHeaderMenuProps {
  user: {
    login: string;
    role: 'admin' | 'customer';
  } | null;
}

const toInitials = (login: string): string =>
  login
    .split(/[\W_]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || login.slice(0, 2).toUpperCase();

export function MobileHeaderMenu({ user }: MobileHeaderMenuProps) {
  const [opened, { close, toggle }] = useDisclosure(false);

  return (
    <>
      <Burger
        aria-label={opened ? 'Закрыть меню' : 'Открыть меню'}
        className={styles.burgerButton}
        onClick={toggle}
        opened={opened}
        size="md"
      />

      <Drawer
        onClose={close}
        opened={opened}
        padding="lg"
        position="right"
        title={
          <Group gap="xs">
            <PanelTopOpen size={18} strokeWidth={1.9} />
            <Text fw={600}>Навигация</Text>
          </Group>
        }
      >
        <Stack gap="lg">
          {user ? (
            <Paper className={styles.identity} p="md" radius="xl" withBorder>
              <Group gap="sm" wrap="nowrap">
              <Avatar color="accent" radius="xl" size={42}>
                {toInitials(user.login)}
              </Avatar>
              <Stack gap={0}>
                <Title order={4}>{user.login}</Title>
                <Text c="dimmed" size="sm">
                  {user.role === 'admin' ? 'Администратор' : 'Аккаунт активен'}
                </Text>
              </Stack>
              </Group>
            </Paper>
          ) : null}

          <Stack gap="xs">
            <NavLink
              component={Link}
              href="/"
              label="Главная"
              leftSection={<Home size={18} strokeWidth={1.9} />}
              onClick={close}
            />
            <NavLink
              component={Link}
              href="/instructions"
              label="Инструкция"
              leftSection={<Smartphone size={18} strokeWidth={1.9} />}
              onClick={close}
            />
            {user ? (
              <NavLink
                component={Link}
                href="/dashboard"
                label="Dashboard"
                leftSection={<LayoutDashboard size={18} strokeWidth={1.9} />}
                onClick={close}
              />
            ) : null}
            {user?.role === 'admin' ? (
              <>
                <NavLink
                  component={Link}
                  href="/admin"
                  label="Admin"
                  leftSection={<Shield size={18} strokeWidth={1.9} />}
                  onClick={close}
                />
                <NavLink
                  component={Link}
                  href="/admin/refunds"
                  label="Refunds"
                  leftSection={<RotateCcw size={18} strokeWidth={1.9} />}
                  onClick={close}
                />
              </>
            ) : null}
          </Stack>

          <Divider />

          <Paper p="md" radius="xl" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap">
                  <Settings size={18} strokeWidth={1.9} />
                  <Text fw={600}>Интерфейс</Text>
                </Group>
              </Group>
              <ColorSchemeToggle />
            </Stack>
          </Paper>

          {user ? (
            <LogoutButton fullWidth leftSection={<LogOut size={16} strokeWidth={1.9} />} />
          ) : (
            <Group grow>
              <Button
                component={Link}
                href="/auth"
                leftSection={<LogIn size={16} strokeWidth={1.9} />}
                onClick={close}
                variant="light"
              >
                Войти
              </Button>
              <Button
                component={Link}
                href="/auth?mode=register"
                leftSection={<UserPlus size={16} strokeWidth={1.9} />}
                onClick={close}
              >
                Регистрация
              </Button>
            </Group>
          )}
        </Stack>
      </Drawer>
    </>
  );
}
