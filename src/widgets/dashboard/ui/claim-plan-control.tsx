'use client';

import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useTransition } from 'react';
import type { PublicPlan } from '@/entities/plan/model/types';
import { createPaymentRequest } from '@/features/payments/api/create-payment';
import { formatMoney } from '@/shared/lib/currency';
import { logClientError, logClientEvent } from '@/shared/logging/client/logger';
import { setCurrentPayment } from '@/shared/store/current-payment/client/store';
import { formatPlanPrice } from '../model/formatting';
import styles from './dashboard-page.module.css';

interface ClaimPlanControlProps {
  initialPlanId?: string;
  plans: PublicPlan[];
  triggerLabel: string;
  triggerVariant?: 'filled' | 'light';
}

interface ClaimPlanFormState {
  customTrafficGb?: number;
  deviceName: string;
  planId: string;
  promoCode: string;
}

const fieldStyles = {
  description: {
    color: 'var(--muted)',
  },
  input: {
    background: 'var(--surface-strong)',
    borderColor: 'var(--surface-border)',
    color: 'var(--foreground)',
  },
  label: {
    color: 'var(--foreground)',
    marginBottom: 6,
  },
} as const;

const getInitialFormState = (
  plans: PublicPlan[],
  initialPlanId?: string
): ClaimPlanFormState => {
  const initialPlan =
    plans.find((plan) => plan.id === initialPlanId) ?? plans[0] ?? null;

  return {
    customTrafficGb: initialPlan?.customTrafficMinGb ?? undefined,
    deviceName: '',
    planId: initialPlan?.id ?? '',
    promoCode: '',
  };
};

export function ClaimPlanControl({
  initialPlanId,
  plans,
  triggerLabel,
  triggerVariant = 'light',
}: ClaimPlanControlProps) {
  const [opened, { close, open }] = useDisclosure(false);
  const [form, setForm] = useState<ClaimPlanFormState>(() =>
    getInitialFormState(plans, initialPlanId)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedPlan = plans.find((plan) => plan.id === form.planId) ?? plans[0] ?? null;
  const calculatedPrice =
    selectedPlan?.allowsCustomTraffic && selectedPlan.customPricePerGbRub
      ? (form.customTrafficGb ?? selectedPlan.customTrafficMinGb ?? 0) *
        selectedPlan.customPricePerGbRub
      : selectedPlan?.priceRub ?? 0;

  const resetState = () => {
    setError(null);
    setForm(getInitialFormState(plans, initialPlanId));
  };

  const openModal = () => {
    resetState();
    open();
  };

  const closeModal = () => {
    close();
    resetState();
  };

  const submit = () => {
    if (!selectedPlan) {
      logClientEvent('warn', 'checkout', 'payment.submit.blocked', {
        reason: 'plan-unavailable',
      });
      setError('Тариф недоступен');
      return;
    }

    logClientEvent('info', 'checkout', 'payment.submit.started', {
      customTrafficGb: selectedPlan.allowsCustomTraffic
        ? form.customTrafficGb ?? null
        : null,
      deviceName: form.deviceName,
      planId: selectedPlan.id,
      promoCode: form.promoCode.trim() || null,
    });
    setError(null);

    startTransition(async () => {
      try {
        const response = await createPaymentRequest({
          customTrafficGb: selectedPlan.allowsCustomTraffic
            ? form.customTrafficGb
            : undefined,
          deviceName: form.deviceName,
          planId: selectedPlan.id,
          promoCode: form.promoCode.trim() || undefined,
        });
        setCurrentPayment({
          amount: response.amount,
          confirmationUrl: response.confirmationUrl,
          createdAt: new Date().toISOString(),
          currency: response.currency,
          paymentId: response.paymentId,
          planTitle: response.planTitle,
          status: response.status,
        });
        logClientEvent('info', 'checkout', 'payment.submit.succeeded', {
          amount: response.amount,
          paymentId: response.paymentId,
          planTitle: response.planTitle,
          redirectTo: response.confirmationUrl,
          status: response.status,
        });
        window.location.assign(response.confirmationUrl);
      } catch (requestError) {
        logClientError('checkout', 'payment.submit.failed', requestError, {
          planId: selectedPlan.id,
        });
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось создать платеж'
        );
      }
    });
  };

  return (
    <>
      <Button onClick={openModal} variant={triggerVariant}>
        {triggerLabel}
      </Button>

      <Modal
        centered
        onClose={closeModal}
        opened={opened}
        size="lg"
        title="Добавить устройство"
      >
        <Stack gap="lg">
          <Text className={styles.muted}>
            Подключение будет подписано только именем устройства.
          </Text>

          {error ? (
            <Alert color="red" radius="xl" title="Есть проблема" variant="light">
              {error}
            </Alert>
          ) : null}

          <Select
            data={plans.map((plan) => ({
              label: `${plan.title} • ${formatPlanPrice(plan)}`,
              value: plan.id,
            }))}
            label="Тариф"
            onChange={(value) => {
              if (!value) {
                return;
              }

              const targetPlan = plans.find((plan) => plan.id === value);

              setForm((current) => ({
                ...current,
                customTrafficGb: targetPlan?.customTrafficMinGb ?? undefined,
                planId: value,
              }));
            }}
            styles={fieldStyles}
            value={form.planId}
          />

          <TextInput
            label="Имя устройства"
            onChange={(event) => {
              const value = event.currentTarget.value;
              setForm((current) => ({
                ...current,
                deviceName: value,
              }));
            }}
            placeholder="Например: iPhone 16 Pro"
            styles={fieldStyles}
            value={form.deviceName}
          />

          {selectedPlan?.allowsCustomTraffic ? (
            <NumberInput
              description={`Диапазон: от ${selectedPlan.customTrafficMinGb} до ${selectedPlan.customTrafficMaxGb} GB.`}
              label="Объём трафика, GB"
              max={selectedPlan.customTrafficMaxGb ?? 500}
              min={selectedPlan.customTrafficMinGb ?? 1}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  customTrafficGb:
                    typeof value === 'number' ? value : current.customTrafficGb,
                }));
              }}
              styles={fieldStyles}
              value={form.customTrafficGb ?? undefined}
            />
          ) : null}

          {(selectedPlan?.priceRub ?? 0) > 0 || selectedPlan?.allowsCustomTraffic ? (
            <TextInput
              description="Если промокода нет, оставьте поле пустым."
              label="Промокод"
              onChange={(event) => {
                const value = event.currentTarget.value.toUpperCase();
                setForm((current) => ({
                  ...current,
                  promoCode: value,
                }));
              }}
              placeholder="Например: START20"
              styles={fieldStyles}
              value={form.promoCode}
            />
          ) : null}

          <Paper className={styles.modalPanel} p="md" radius="xl">
            <Stack gap={4}>
              <Text className={styles.muted} size="sm">
                Стоимость
              </Text>
              <Title order={3}>{formatMoney(calculatedPrice, selectedPlan?.currency ?? 'RUB')}</Title>
              <Text className={styles.muted} size="sm">
                {selectedPlan?.allowsCustomTraffic
                  ? `${form.customTrafficGb ?? selectedPlan.customTrafficMinGb} GB по кастомному тарифу`
                  : selectedPlan?.highlight ?? 'Готовый тариф'}
              </Text>
            </Stack>
          </Paper>

          <Alert color="blue" radius="xl" title="Как это работает" variant="light">
            После перехода в ЮKassa и подтверждения оплаты ключ появится в этом
            dashboard автоматически.
          </Alert>

          <Group justify="flex-end">
            <Button loading={isPending} onClick={submit}>
              Перейти к оплате
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
