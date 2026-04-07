'use client';

import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { formatMoney } from '@/shared/lib/currency';
import { logClientEvent } from '@/shared/logging/client/logger';
import { getVisibleDeviceName } from '@/shared/lib/display-name';
import { AccessQrButton } from '@/shared/ui/access-qr-button/access-qr-button';
import {
  clearCurrentPayment,
  patchCurrentPayment,
  useCurrentPaymentStore,
} from '@/shared/store/current-payment/client/store';
import { CopyAccessButton } from '@/widgets/dashboard/ui/copy-access-button';
import { getPaymentStatusRequest } from '../api/get-payment-status';
import type { PaymentStatusResponse } from '../model/types';

const BYTES_IN_GIGABYTE = 1024 ** 3;

const formatTraffic = (value: number | null): string =>
  value === null ? 'Безлимит' : `${Math.round(value / BYTES_IN_GIGABYTE)} GB`;

const getRefetchInterval = (
  data: PaymentStatusResponse | undefined,
  isErrored: boolean
): number | false => {
  if (isErrored) {
    return false;
  }

  if (!data) {
    return 10_000;
  }

  const shouldContinuePolling =
    data.payment.status === 'pending' ||
    data.payment.status === 'waiting_for_capture' ||
    (data.payment.status === 'succeeded' &&
      data.payment.fulfillmentStatus !== 'succeeded' &&
      data.vpnKey === null);

  return shouldContinuePolling ? 10_000 : false;
};

export function PaymentStatusPanel() {
  const { currentPayment } = useCurrentPaymentStore();
  const router = useRouter();
  const hasRefreshed = useRef(false);
  const lastAppliedSignature = useRef<string | null>(null);
  const paymentId = currentPayment?.paymentId ?? null;

  const paymentQuery = useQuery({
    enabled: Boolean(paymentId),
    queryFn: async () => {
      if (!paymentId) {
        throw new Error('Не найден текущий платеж');
      }

      logClientEvent('debug', 'payment-status', 'payment.sync.started', {
        paymentId,
      });

      return getPaymentStatusRequest(paymentId);
    },
    queryKey: ['payment-status', paymentId],
    refetchInterval: (query) =>
      getRefetchInterval(query.state.data, query.state.status === 'error'),
    refetchOnWindowFocus: false,
  });

  const activeResult = paymentQuery.data ?? null;
  const error =
    paymentQuery.error instanceof Error ? paymentQuery.error.message : null;
  const isRefreshing = paymentQuery.isFetching;
  const showSuccess =
    activeResult?.payment.status === 'succeeded' && activeResult.vpnKey !== null;
  const showFailure =
    activeResult &&
    (activeResult.payment.status === 'canceled' ||
      activeResult.payment.status === 'failed');

  useEffect(() => {
    if (!activeResult) {
      hasRefreshed.current = false;
      lastAppliedSignature.current = null;
      return;
    }

    const signature = [
      activeResult.payment.paymentId,
      activeResult.payment.status,
      activeResult.payment.fulfillmentStatus,
      activeResult.payment.confirmationUrl ?? '',
      activeResult.vpnKey?.id ?? '',
    ].join(':');

    if (lastAppliedSignature.current === signature) {
      return;
    }

    lastAppliedSignature.current = signature;

    logClientEvent('info', 'payment-status', 'payment.result.received', {
      fulfillmentStatus: activeResult.payment.fulfillmentStatus,
      hasVpnKey: Boolean(activeResult.vpnKey),
      paymentId: activeResult.payment.paymentId,
      status: activeResult.payment.status,
    });

    if (currentPayment) {
      patchCurrentPayment({
        confirmationUrl:
          activeResult.payment.confirmationUrl ?? currentPayment.confirmationUrl,
        status: activeResult.payment.status,
      });
    }

    if (
      activeResult.payment.status === 'succeeded' &&
      activeResult.vpnKey &&
      !hasRefreshed.current
    ) {
      hasRefreshed.current = true;
      router.refresh();
    }
  }, [activeResult, currentPayment, router]);

  if (!currentPayment) {
    return null;
  }

  return (
    <Paper p="lg" radius="xl" withBorder>
      <Stack gap="md">
        <Stack gap={4}>
          <Text c="dimmed" size="sm">
            Текущий платеж
          </Text>
          <Title order={3}>{currentPayment.planTitle}</Title>
          <Text c="dimmed">
            {formatMoney(currentPayment.amount, currentPayment.currency)}
          </Text>
        </Stack>

        {showSuccess && activeResult?.vpnKey ? (
          <>
            <Alert color="blue" radius="xl" title="Оплата подтверждена" variant="light">
              Ключ выдан и уже сохранён в вашем dashboard.
            </Alert>

            <Stack gap="xs">
              <Text fw={600}>
                {getVisibleDeviceName(activeResult.vpnKey.displayName)}
              </Text>
              <Text c="dimmed" size="sm">
                Действует до {new Date(activeResult.vpnKey.expiresAt).toLocaleString('ru-RU')} •{' '}
                {formatTraffic(activeResult.vpnKey.trafficLimitBytes)}
              </Text>
            </Stack>

            <Group gap="xs">
              <AccessQrButton value={activeResult.vpnKey.keyValue} />
              <CopyAccessButton label="Копировать ссылку" value={activeResult.vpnKey.keyValue} />
              <Button onClick={() => clearCurrentPayment()} variant="light">
                Закрыть
              </Button>
            </Group>
          </>
        ) : null}

        {showFailure && activeResult ? (
          <>
            <Alert color="red" radius="xl" title="Оплата не завершена" variant="light">
              {activeResult.payment.failureReason || 'ЮKassa не подтвердила платеж.'}
            </Alert>
            <Group gap="xs">
              {currentPayment.confirmationUrl ? (
                <Button
                  component="a"
                  href={currentPayment.confirmationUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Повторно открыть оплату
                </Button>
              ) : null}
              <Button onClick={() => clearCurrentPayment()} variant="light">
                Очистить
              </Button>
              <Button onClick={() => paymentQuery.refetch()} variant="subtle">
                Проверить снова
              </Button>
            </Group>
          </>
        ) : null}

        {!showSuccess && !showFailure ? (
          <>
            <Alert
              color={error ? 'yellow' : 'blue'}
              radius="xl"
              title={error ? 'Проверка приостановлена' : 'Ждём подтверждение оплаты'}
              variant="light"
            >
              {error ||
                'Статус обновляется автоматически. Как только ЮKassa подтвердит платеж, ключ появится здесь и в списке устройств.'}
            </Alert>

            <Group gap="xs">
              {currentPayment.confirmationUrl ? (
                <Button
                  component="a"
                  href={currentPayment.confirmationUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Открыть оплату
                </Button>
              ) : null}
              <Button
                loading={isRefreshing}
                onClick={() => {
                  logClientEvent('info', 'payment-status', 'payment.sync.manual', {
                    paymentId: currentPayment.paymentId,
                  });
                  void paymentQuery.refetch();
                }}
                variant="light"
              >
                Проверить сейчас
              </Button>
              <Button onClick={() => clearCurrentPayment()} variant="subtle">
                Сбросить
              </Button>
            </Group>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}
