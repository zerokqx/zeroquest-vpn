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
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { PublicPlan } from '@/entities/plan/model/types';
import type { ClaimPlanResponse } from '@/features/claim-plan/model/types';
import { AccessQrButton } from '@/shared/ui/access-qr-button/access-qr-button';
import { claimDashboardPlanAction } from '../server/actions';
import { formatPlanPrice } from '../model/formatting';
import { CopyAccessButton } from './copy-access-button';
import styles from './dashboard-page.module.css';

interface ClaimPlanControlProps {
  initialPlanId?: string;
  plans: PublicPlan[];
  triggerLabel: string;
  triggerVariant?: 'filled' | 'light';
  userLogin: string;
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
  userLogin,
}: ClaimPlanControlProps) {
  const [opened, { close, open }] = useDisclosure(false);
  const [form, setForm] = useState<ClaimPlanFormState>(() =>
    getInitialFormState(plans, initialPlanId)
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimPlanResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const selectedPlan = plans.find((plan) => plan.id === form.planId) ?? plans[0] ?? null;
  const calculatedPrice =
    selectedPlan?.allowsCustomTraffic && selectedPlan.customPricePerGbRub
      ? (form.customTrafficGb ?? selectedPlan.customTrafficMinGb ?? 0) *
        selectedPlan.customPricePerGbRub
      : selectedPlan?.priceRub ?? 0;

  const resetState = () => {
    setError(null);
    setResult(null);
    setForm(getInitialFormState(plans, initialPlanId));
  };

  const openModal = () => {
    resetState();
    open();
  };

  const closeModal = () => {
    const shouldRefresh = result !== null;

    close();
    resetState();

    if (shouldRefresh) {
      router.refresh();
    }
  };

  const submit = () => {
    if (!selectedPlan) {
      setError('Тариф недоступен');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const response = await claimDashboardPlanAction({
          customTrafficGb: selectedPlan.allowsCustomTraffic
            ? form.customTrafficGb
            : undefined,
          deviceName: form.deviceName,
          planId: selectedPlan.id,
          promoCode: form.promoCode.trim() || undefined,
        });

        setResult(response);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось добавить устройство'
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
            Подключение будет подписано как: {userLogin} /{' '}
            {form.deviceName || 'имя устройства'}.
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
              setResult(null);
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

          <Paper className={styles.modalPanel} p="md" radius="20px">
            <Stack gap={4}>
              <Text className={styles.muted} size="sm">
                Стоимость
              </Text>
              <Title order={3}>
                {calculatedPrice === 0 ? '0 ₽' : `${calculatedPrice} ₽`}
              </Title>
              <Text className={styles.muted} size="sm">
                {selectedPlan?.allowsCustomTraffic
                  ? `${form.customTrafficGb ?? selectedPlan.customTrafficMinGb} GB по кастомному тарифу`
                  : selectedPlan?.highlight ?? 'Готовый тариф'}
              </Text>
            </Stack>
          </Paper>

          {result ? (
            <Alert color="green" radius="xl" title="Устройство добавлено" variant="light">
              Конфиг уже выпущен. После закрытия окна список устройств обновится.
            </Alert>
          ) : null}

          {result ? (
            <Textarea
              autosize
              classNames={{ input: styles.resultTextarea }}
              minRows={4}
              readOnly
              value={result.access.uri}
              variant="filled"
            />
          ) : null}

          <Group justify={result ? 'space-between' : 'flex-end'}>
            {result ? (
              <Group gap="xs">
                <AccessQrButton value={result.access.uri} />
                <CopyAccessButton value={result.access.uri} />
              </Group>
            ) : null}

            {result ? (
              <Button onClick={closeModal}>Закрыть и обновить</Button>
            ) : (
              <Button loading={isPending} onClick={submit}>
                Выпустить доступ
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
