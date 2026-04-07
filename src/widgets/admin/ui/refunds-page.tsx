'use client';

import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { RefundRequest } from '@/entities/refund-request';
import { formatMoney } from '@/shared/lib/currency';
import {
  approveRefundRequestAction,
  rejectRefundRequestAction,
} from '../server/refund-actions';
import styles from './refunds-page.module.css';

interface RefundsPageProps {
  requests: RefundRequest[];
}

const statusColor: Record<RefundRequest['status'], string> = {
  failed: 'red',
  rejected: 'gray',
  refund_pending: 'yellow',
  refunded: 'green',
  requested: 'blue',
};

const statusLabel: Record<RefundRequest['status'], string> = {
  failed: 'Ошибка',
  rejected: 'Отклонён',
  refund_pending: 'В обработке',
  refunded: 'Возвращён',
  requested: 'Новый',
};

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString('ru-RU') : '—';

export function RefundsPage({ requests }: RefundsPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <main className={styles.page}>
      <Container size="xl">
        <Stack gap="xl">
          <Paper className={styles.hero} p={{ base: 'xl', md: 40 }}>
            <Stack gap="lg">
              <Group justify="space-between" wrap="wrap">
                <Stack gap="sm">
                  <Text className={styles.eyebrow}>Admin / Refunds</Text>
                  <Title className={styles.heroTitle} order={1}>
                    Ручное подтверждение запросов на возврат денег.
                  </Title>
                  <Text className={styles.muted}>
                    После approve отправляется запрос в ЮKassa Refunds API.
                    Здесь видно дату запроса, дату покупки, причину и сумму.
                  </Text>
                </Stack>

                <Group gap="sm">
                  <Button component={Link} href="/admin" variant="light">
                    В admin
                  </Button>
                  <Button component={Link} href="/dashboard" variant="subtle">
                    В dashboard
                  </Button>
                </Group>
              </Group>

              <Group gap="sm">
                <Badge color="blue" variant="light">
                  Всего запросов: {requests.length}
                </Badge>
                <Badge color="yellow" variant="light">
                  Новых: {requests.filter((request) => request.status === 'requested').length}
                </Badge>
              </Group>
            </Stack>
          </Paper>

          {error ? (
            <Paper className={styles.panel} p="lg">
              <Text c="red.6">{error}</Text>
            </Paper>
          ) : null}

          <Paper className={styles.tableCard} p="lg">
            {requests.length === 0 ? (
              <Stack gap="sm">
                <Title order={3}>Запросов пока нет</Title>
                <Text className={styles.muted}>
                  Когда пользователь нажмёт кнопку возврата на устройстве,
                  запрос появится здесь.
                </Text>
              </Stack>
            ) : (
              <div className={styles.tableWrap}>
                <Table className={styles.table} highlightOnHover striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Статус</Table.Th>
                      <Table.Th>Пользователь</Table.Th>
                      <Table.Th>Устройство</Table.Th>
                      <Table.Th>Запрос создан</Table.Th>
                      <Table.Th>Покупка</Table.Th>
                      <Table.Th>Сумма</Table.Th>
                      <Table.Th>Причина</Table.Th>
                      <Table.Th>Действия</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {requests.map((request) => (
                      <Table.Tr key={request.id}>
                        <Table.Td>
                          <Stack gap={4}>
                            <Badge color={statusColor[request.status]} variant="light">
                              {statusLabel[request.status]}
                            </Badge>
                            {request.providerRefundId ? (
                              <Text c="dimmed" size="xs">
                                refund: {request.providerRefundId}
                              </Text>
                            ) : null}
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600}>@{request.userLogin}</Text>
                            <Text c="dimmed" size="xs">
                              {request.planTitle}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>{request.displayName}</Table.Td>
                        <Table.Td>{formatDateTime(request.requestedAt)}</Table.Td>
                        <Table.Td>{formatDateTime(request.purchaseAt)}</Table.Td>
                        <Table.Td>{formatMoney(request.amount, request.currency)}</Table.Td>
                        <Table.Td>
                          <Text className={styles.reason} size="sm">
                            {request.reason}
                          </Text>
                          {request.errorMessage ? (
                            <Text c="red.6" size="xs">
                              {request.errorMessage}
                            </Text>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Button
                              disabled={
                                isPending ||
                                pendingId === request.id ||
                                !['failed', 'requested'].includes(request.status)
                              }
                              loading={isPending && pendingId === request.id}
                              onClick={() => {
                                setError(null);
                                setPendingId(request.id);

                                startTransition(async () => {
                                  try {
                                    await approveRefundRequestAction(request.id);
                                    router.refresh();
                                  } catch (requestError) {
                                    setError(
                                      requestError instanceof Error
                                        ? requestError.message
                                        : 'Не удалось одобрить возврат'
                                    );
                                  } finally {
                                    setPendingId(null);
                                  }
                                });
                              }}
                              size="xs"
                            >
                              Approve
                            </Button>
                            <Button
                              color="gray"
                              disabled={
                                isPending ||
                                pendingId === request.id ||
                                request.status !== 'requested'
                              }
                              onClick={() => {
                                setError(null);
                                setPendingId(request.id);

                                startTransition(async () => {
                                  try {
                                    await rejectRefundRequestAction(request.id);
                                    router.refresh();
                                  } catch (requestError) {
                                    setError(
                                      requestError instanceof Error
                                        ? requestError.message
                                        : 'Не удалось отклонить возврат'
                                    );
                                  } finally {
                                    setPendingId(null);
                                  }
                                });
                              }}
                              size="xs"
                              variant="light"
                            >
                              Reject
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}
          </Paper>
        </Stack>
      </Container>
    </main>
  );
}
