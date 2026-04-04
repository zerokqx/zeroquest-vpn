'use client';

import { Alert, Center, Paper, Stack, Text, Title } from '@mantine/core';
import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';

interface AdminErrorBoundaryState {
  hasError: boolean;
}

class AdminErrorBoundary extends Component<
  { children: ReactNode },
  AdminErrorBoundaryState
> {
  state: AdminErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AdminErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Center mih="calc(100vh - 96px)" px="md">
          <Paper p="xl" radius="lg" shadow="xs" withBorder maw={560} w="100%">
            <Stack gap="sm">
              <Title order={2}>Admin временно недоступен</Title>
              <Text c="dimmed" size="sm">
                Клиентская часть панели не инициализировалась. Обнови страницу.
                Если ошибка повторяется, проверь консоль браузера.
              </Text>
              <Alert color="red" radius="md" variant="light">
                React Admin загрузился с ошибкой.
              </Alert>
            </Stack>
          </Paper>
        </Center>
      );
    }

    return this.props.children;
  }
}

const AdminPage = dynamic(
  () => import('./admin-page').then((module) => module.AdminPage),
  {
    ssr: false,
    loading: () => (
      <Center mih="calc(100vh - 96px)" px="md">
        <Paper p="xl" radius="lg" shadow="xs" withBorder maw={560} w="100%">
          <Stack gap="xs">
            <Title order={2}>Загружаю admin</Title>
            <Text c="dimmed" size="sm">
              Поднимаю клиентскую панель управления тарифами и промокодами.
            </Text>
          </Stack>
        </Paper>
      </Center>
    ),
  }
);

export function AdminShell() {
  return (
    <AdminErrorBoundary>
      <AdminPage />
    </AdminErrorBoundary>
  );
}
