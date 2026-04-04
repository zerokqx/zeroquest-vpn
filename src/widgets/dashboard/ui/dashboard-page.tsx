'use client';

import {
  Alert,
  Badge,
  Button,
  Code,
  Container,
  CopyButton,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useMemo, useState } from 'react';
import type { AccessRecordWithMonitoring } from '@/entities/access/model/types';
import type { PublicPlan } from '@/entities/plan/model/types';
import type { User } from '@/entities/user/model/types';
import { claimPlanRequest } from '@/features/claim-plan/api/claim-plan';
import {
  formatBytes,
  formatLastOnline,
  formatPlanPrice,
  formatUtcDate,
  formatUtcDateTime,
} from '../model/formatting';
import styles from './dashboard-page.module.css';

interface DashboardPageProps {
  accessRecords: AccessRecordWithMonitoring[];
  plans: PublicPlan[];
  user: User;
}

interface AddDeviceFormState {
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

const getInitialFormState = (plans: PublicPlan[]): AddDeviceFormState => {
  const firstPlan = plans[0];

  return {
    customTrafficGb: firstPlan?.customTrafficMinGb ?? undefined,
    deviceName: '',
    planId: firstPlan?.id ?? '',
    promoCode: '',
  };
};

export function DashboardPage({
  accessRecords,
  plans,
  user,
}: DashboardPageProps) {
  const [opened, { close, open }] = useDisclosure(false);
  const [records, setRecords] = useState(accessRecords);
  const [form, setForm] = useState<AddDeviceFormState>(() =>
    getInitialFormState(plans)
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);

  useEffect(() => {
    setRecords(accessRecords);
  }, [accessRecords]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === form.planId) ?? plans[0] ?? null,
    [form.planId, plans]
  );

  useEffect(() => {
    if (!selectedPlan?.allowsCustomTraffic) {
      return;
    }

    setForm((current) => ({
      ...current,
      customTrafficGb:
        current.customTrafficGb ?? selectedPlan.customTrafficMinGb ?? undefined,
    }));
  }, [selectedPlan]);

  const activeDevices = records.filter((record) => record.isActive).length;
  const totalUsedBytes = records.reduce(
    (sum, record) => sum + record.usedTrafficBytes,
    0
  );
  const limitedRecords = records.filter(
    (record) => record.remainingTrafficBytes !== null
  );
  const hasUnlimitedRecords = records.some(
    (record) => record.remainingTrafficBytes === null
  );
  const totalRemainingBytes = limitedRecords.reduce(
    (sum, record) => sum + (record.remainingTrafficBytes ?? 0),
    0
  );
  const nextExpiry = records
    .filter((record) => record.isActive)
    .sort(
      (left, right) =>
        new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime()
    )[0];
  const calculatedPrice =
    selectedPlan?.allowsCustomTraffic && selectedPlan.customPricePerGbRub
      ? (form.customTrafficGb ?? selectedPlan.customTrafficMinGb ?? 0) *
        selectedPlan.customPricePerGbRub
      : selectedPlan?.priceRub ?? 0;

  const openWithPlan = (planId: string) => {
    const targetPlan = plans.find((plan) => plan.id === planId);

    setForm({
      customTrafficGb: targetPlan?.customTrafficMinGb ?? undefined,
      deviceName: '',
      planId,
      promoCode: '',
    });
    setError(null);
    setResultUri(null);
    open();
  };

  const deleteAccess = async (accessRecordId: string) => {
    setError(null);
    setPendingDeleteId(accessRecordId);

    try {
      const response = await fetch(`/api/access/${accessRecordId}`, {
        method: 'DELETE',
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Не удалось удалить подключение');
      }

      setRecords((current) =>
        current.filter((record) => record.id !== accessRecordId)
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось удалить подключение'
      );
    } finally {
      setPendingDeleteId(null);
    }
  };

  const submitDevice = async () => {
    if (!selectedPlan) {
      setError('Тариф не выбран');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await claimPlanRequest({
        customTrafficGb: selectedPlan.allowsCustomTraffic
          ? form.customTrafficGb
          : undefined,
        deviceName: form.deviceName,
        planId: selectedPlan.id,
        promoCode: form.promoCode.trim() || undefined,
      });

      setResultUri(response.access.uri);
      setRecords((current) => [
        {
          id: response.accessRecordId,
          userId: user.id,
          planId: response.plan.id,
          planTitle: response.plan.title,
          originalPriceRub: response.pricing.originalPriceRub,
          finalPriceRub: response.pricing.finalPriceRub,
          planPriceRub: response.pricing.finalPriceRub,
          periodLabel: response.plan.periodLabel,
          promoCode: response.pricing.promoCode,
          deviceName: form.deviceName,
          displayName: response.client.name,
          threeXUiClientId: response.client.id,
          threeXUiEmail: response.client.email,
          inboundId: response.inbound.id,
          inboundRemark: response.inbound.remark,
          accessUri: response.access.uri,
          createdAt: new Date().toISOString(),
          expiresAt: response.client.expiresAt,
          trafficLimitBytes: response.client.trafficLimitBytes,
          speedLimitMbps: response.plan.speedLimitMbps,
          isActive: true,
          downBytes: 0,
          lastOnlineAt: null,
          remainingTrafficBytes: response.client.trafficLimitBytes,
          totalTrafficBytes: response.client.trafficLimitBytes,
          upBytes: 0,
          usagePercent: 0,
          usedTrafficBytes: 0,
        },
        ...current,
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось добавить устройство'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <Container size="xl">
        <Stack gap="xl">
          <section className={styles.hero}>
            <Stack gap="lg">
              <Stack className={styles.heroIntro} gap="sm">
                <Text className={styles.eyebrow}>Dashboard</Text>
                <Title className={styles.heroTitle} order={1}>
                  Все устройства, трафик и тарифы собираются в одном экране.
                </Title>
                <Text className={styles.heroCopy} size="lg">
                  Здесь видно, сколько трафика уже потрачено, какой доступ истекает
                  первым и какой конфиг можно заново скопировать без повторной
                  выдачи.
                </Text>
              </Stack>

              <Group className={styles.heroActions} gap="sm">
                <Button onClick={() => openWithPlan(plans[0]?.id ?? '')} size="md">
                  Добавить устройство
                </Button>
                <Button component="a" href="/" size="md" variant="light">
                  На главную
                </Button>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Пользователь</span>
                  <strong className={styles.statValue}>@{user.login}</strong>
                </Stack>
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Активные устройства</span>
                  <strong className={styles.statValue}>{activeDevices}</strong>
                </Stack>
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Израсходовано</span>
                  <strong className={styles.statValue}>{formatBytes(totalUsedBytes)}</strong>
                </Stack>
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Ближайшее окончание</span>
                  <strong className={styles.statValue}>
                    {nextExpiry ? formatUtcDate(nextExpiry.expiresAt) : 'Нет активных'}
                  </strong>
                </Stack>
              </SimpleGrid>
            </Stack>
          </section>

          {error ? (
            <Alert color="red" radius="xl" title="Есть проблема" variant="light">
              {error}
            </Alert>
          ) : null}

          <Grid align="start" gap="xl">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <section className={styles.devicesSection}>
                <Group align="flex-start" justify="space-between" wrap="wrap">
                  <Stack gap="xs">
                    <Text className={styles.eyebrow}>Устройства</Text>
                    <Title order={2}>Текущие подключения и мониторинг по ним</Title>
                  </Stack>
                  <Text className={styles.sectionMeta}>
                    {hasUnlimitedRecords
                      ? 'Есть устройства с безлимитным трафиком'
                      : `Остаток по лимитам: ${formatBytes(totalRemainingBytes)}`}
                  </Text>
                </Group>

                {records.length === 0 ? (
                  <Stack className={styles.emptyState} component="article" gap="sm" mt="xl">
                    <Title order={3}>Устройств пока нет</Title>
                    <Text className={styles.muted}>
                      Нажмите «Добавить устройство», выберите тариф и задайте имя
                      девайса. Новый доступ сразу появится в списке.
                    </Text>
                  </Stack>
                ) : (
                  <Stack gap="md" mt="xl">
                    {records.map((record) => (
                      <Stack className={styles.deviceCard} component="article" gap="lg" key={record.id}>
                        <Group align="flex-start" justify="space-between" wrap="wrap">
                          <Stack gap="xs">
                            <Group gap="xs">
                              <Badge variant="light">
                                {record.planPriceRub === 0
                                  ? 'Free'
                                  : `${record.planPriceRub} ₽`}
                              </Badge>
                              <Badge
                                color={record.isActive ? 'green' : 'gray'}
                                variant="light"
                              >
                                {record.isActive ? 'Активен' : 'Истёк'}
                              </Badge>
                            </Group>

                            <Title className={styles.deviceTitle} order={3}>
                              {record.displayName}
                            </Title>
                            <Text className={styles.muted}>
                              {record.planTitle} • {record.inboundRemark}
                            </Text>
                          </Stack>

                          <Code>{record.threeXUiEmail}</Code>
                        </Group>

                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                          <Stack gap={4}>
                            <span className={styles.metricKey}>Потрачено</span>
                            <strong>{formatBytes(record.usedTrafficBytes)}</strong>
                          </Stack>
                          <Stack gap={4}>
                            <span className={styles.metricKey}>Остаток</span>
                            <strong>
                              {record.remainingTrafficBytes === null
                                ? 'Безлимит'
                                : formatBytes(record.remainingTrafficBytes)}
                            </strong>
                          </Stack>
                          <Stack gap={4}>
                            <span className={styles.metricKey}>Последняя активность</span>
                            <strong>{formatLastOnline(record.lastOnlineAt)}</strong>
                          </Stack>
                        </SimpleGrid>

                        {record.totalTrafficBytes !== null ? (
                          <Progress
                            classNames={{ root: styles.progressTrack }}
                            radius="xl"
                            size="md"
                            value={record.usagePercent ?? 0}
                          />
                        ) : null}

                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                          <Stack gap={4}>
                            <span className={styles.metricKey}>Скорость</span>
                            <strong>
                              {record.speedLimitMbps === null
                                ? 'Без ограничения'
                                : `До ${record.speedLimitMbps} Мбит/с`}
                            </strong>
                          </Stack>
                          <Stack gap={4}>
                            <span className={styles.metricKey}>Выдан</span>
                            <strong>{formatUtcDateTime(record.createdAt)}</strong>
                          </Stack>
                          <Stack gap={4}>
                            <span className={styles.metricKey}>Действует до</span>
                            <strong>{formatUtcDateTime(record.expiresAt)}</strong>
                          </Stack>
                        </SimpleGrid>

                        <Stack className={styles.uriBox} component="footer" gap="md">
                          <Group justify="space-between" wrap="wrap">
                            <Text className={styles.muted}>Ссылка подключения</Text>
                            <Group gap="xs">
                              <CopyButton value={record.accessUri}>
                                {({ copied, copy }) => (
                                  <Button
                                    color="gray"
                                    onClick={copy}
                                    size="compact-sm"
                                    variant="subtle"
                                  >
                                    {copied ? 'Скопировано' : 'Копировать'}
                                  </Button>
                                )}
                              </CopyButton>
                              <Button
                                color="red"
                                loading={pendingDeleteId === record.id}
                                onClick={() => {
                                  void deleteAccess(record.id);
                                }}
                                size="compact-sm"
                                variant="subtle"
                              >
                                Удалить
                              </Button>
                            </Group>
                          </Group>

                          <Textarea
                            autosize
                            classNames={{ input: styles.uriTextarea }}
                            minRows={3}
                            readOnly
                            value={record.accessUri}
                            variant="filled"
                          />
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </section>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Stack gap="xl">
                <section className={styles.accountPanel}>
                  <Stack gap="sm">
                    <Text className={styles.eyebrow}>Профиль</Text>
                    <Title order={3}>@{user.login}</Title>
                    <Text className={styles.muted}>
                      Каждое устройство подписывается как {user.login} / имя девайса,
                      поэтому выдачи не путаются между собой.
                    </Text>
                  </Stack>
                </section>

                <section className={styles.plansSection}>
                  <Stack gap="lg">
                    <Stack gap="xs">
                      <Text className={styles.eyebrow}>Тарифы</Text>
                      <Title order={2}>Добавить новое устройство</Title>
                    </Stack>

                    <Stack gap="md">
                      {plans.map((plan) => (
                        <Stack className={styles.planCard} component="article" gap="md" key={plan.id}>
                          <Group align="flex-start" justify="space-between" wrap="wrap">
                            <Stack gap="xs">
                              <Group gap="xs">
                                {plan.badge ? (
                                  <Badge variant="light">{plan.badge}</Badge>
                                ) : null}
                                <Badge color="gray" variant="subtle">
                                  {plan.periodLabel}
                                </Badge>
                              </Group>
                              <Title order={3}>{plan.title}</Title>
                            </Stack>
                            <Text className={styles.planPrice}>{formatPlanPrice(plan)}</Text>
                          </Group>

                          <Text className={styles.muted}>{plan.description}</Text>

                          <Text className={styles.planSummary}>
                            {plan.allowsCustomTraffic
                              ? `${plan.customPricePerGbRub} ₽ за 1 GB • от ${plan.customTrafficMinGb} до ${plan.customTrafficMaxGb} GB`
                              : plan.highlight || plan.features[0]}
                          </Text>

                          <Button
                            onClick={() => openWithPlan(plan.id)}
                            variant={plan.isFeatured ? 'filled' : 'light'}
                          >
                            {plan.ctaText}
                          </Button>
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </section>
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>

      <Modal
        centered
        onClose={() => {
          close();
          setError(null);
          setResultUri(null);
        }}
        opened={opened}
        size="lg"
        title="Добавить устройство"
      >
        <Stack gap="lg">
          <Text className={styles.muted}>
            Подключение будет подписано как: {user.login} /{' '}
            {form.deviceName || 'имя устройства'}.
          </Text>

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
              setResultUri(null);
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

          {resultUri ? (
            <Alert color="green" radius="xl" title="Устройство добавлено" variant="light">
              Конфиг уже выпущен и появился в списке устройств.
            </Alert>
          ) : null}

          {resultUri ? (
            <Textarea
              autosize
              classNames={{ input: styles.resultTextarea }}
              minRows={4}
              readOnly
              value={resultUri}
              variant="filled"
            />
          ) : null}

          <Group justify={resultUri ? 'space-between' : 'flex-end'}>
            {resultUri ? (
              <CopyButton value={resultUri}>
                {({ copied, copy }) => (
                  <Button color="gray" onClick={copy} variant="subtle">
                    {copied ? 'Скопировано' : 'Копировать ссылку'}
                  </Button>
                )}
              </CopyButton>
            ) : null}
            <Button loading={isSubmitting} onClick={() => void submitDevice()}>
              {isSubmitting ? 'Создаём подключение...' : 'Выдать доступ'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </main>
  );
}
