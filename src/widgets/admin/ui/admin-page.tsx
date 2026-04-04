'use client';

import {
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { LogoutButton } from '@/features/auth/ui/logout-button';
import type { Plan } from '@/entities/plan/model/types';
import type { PromoCode } from '@/entities/promo-code/model/types';
import type { User } from '@/entities/user/model/types';
import styles from './admin-page.module.css';

interface AdminPageProps {
  plans: Plan[];
  promoCodes: PromoCode[];
  user: User;
}

interface PlanFormState {
  badge: string;
  ctaText: string;
  description: string;
  durationDays: number;
  features: string;
  highlight: string;
  inboundId: number;
  isActive: boolean;
  isFeatured: boolean;
  priceRub: number;
  slug: string;
  speedLimitMbps: number | null;
  title: string;
  trafficLimitGb: number | null;
}

interface PromoFormState {
  appliesToPlanIds: string[];
  code: string;
  description: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  expiresAt: string;
  isActive: boolean;
  usageLimit: number | null;
}

const fieldStyles = {
  input: {
    background: 'var(--surface-strong)',
    borderColor: 'var(--surface-border)',
    color: 'var(--foreground)',
  },
  label: {
    color: 'var(--foreground)',
    marginBottom: 6,
  },
  description: {
    color: 'var(--muted)',
  },
} as const;

const emptyPlanForm: PlanFormState = {
  badge: '',
  ctaText: '',
  description: '',
  durationDays: 30,
  features: '',
  highlight: '',
  inboundId: 1,
  isActive: true,
  isFeatured: false,
  priceRub: 0,
  slug: '',
  speedLimitMbps: null,
  title: '',
  trafficLimitGb: null,
};

const emptyPromoForm: PromoFormState = {
  appliesToPlanIds: [],
  code: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  expiresAt: '',
  isActive: true,
  usageLimit: null,
};

const planToFormState = (plan: Plan): PlanFormState => ({
  badge: plan.badge ?? '',
  ctaText: plan.ctaText,
  description: plan.description,
  durationDays: plan.durationDays,
  features: plan.features.join('\n'),
  highlight: plan.highlight ?? '',
  inboundId: plan.inboundId,
  isActive: plan.isActive,
  isFeatured: plan.isFeatured,
  priceRub: plan.priceRub,
  slug: plan.slug,
  speedLimitMbps: plan.speedLimitMbps,
  title: plan.title,
  trafficLimitGb:
    plan.trafficLimitBytes === null
      ? null
      : Math.round(plan.trafficLimitBytes / 1024 ** 3),
});

const promoToFormState = (promoCode: PromoCode): PromoFormState => ({
  appliesToPlanIds: promoCode.appliesToPlanIds,
  code: promoCode.code,
  description: promoCode.description,
  discountType: promoCode.discountType,
  discountValue: promoCode.discountValue,
  expiresAt: promoCode.expiresAt ? promoCode.expiresAt.slice(0, 16) : '',
  isActive: promoCode.isActive,
  usageLimit: promoCode.usageLimit,
});

const parseFeatures = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function AdminPage({ plans: initialPlans, promoCodes: initialPromoCodes, user }: AdminPageProps) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPromoCodeId, setEditingPromoCodeId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);
  const [promoForm, setPromoForm] = useState<PromoFormState>(emptyPromoForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const planOptions = plans.map((plan) => ({
    label: `${plan.title} (${plan.id})`,
    value: plan.id,
  }));

  const submitPlan = () => {
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          badge: planForm.badge.trim() || null,
          ctaText: planForm.ctaText.trim(),
          description: planForm.description.trim(),
          durationDays: planForm.durationDays,
          features: parseFeatures(planForm.features),
          highlight: planForm.highlight.trim() || null,
          inboundId: planForm.inboundId,
          isActive: planForm.isActive,
          isFeatured: planForm.isFeatured,
          priceRub: planForm.priceRub,
          slug: planForm.slug.trim(),
          speedLimitMbps: planForm.speedLimitMbps,
          title: planForm.title.trim(),
          trafficLimitGb: planForm.trafficLimitGb,
        };
        const response = await fetch(
          editingPlanId ? `/api/admin/plans/${editingPlanId}` : '/api/admin/plans',
          {
            method: editingPlanId ? 'PATCH' : 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
        const result = (await response.json()) as { error?: string; plan?: Plan };

        if (!response.ok || !result.plan) {
          throw new Error(result.error || 'Не удалось сохранить тариф');
        }

        const savedPlan = result.plan;

        setPlans((current) => {
          if (editingPlanId) {
            return current.map((plan) =>
              plan.id === savedPlan.id ? savedPlan : plan
            );
          }

          return [...current, savedPlan].sort(
            (left, right) => left.sortOrder - right.sortOrder
          );
        });
        setEditingPlanId(null);
        setPlanForm(emptyPlanForm);
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось сохранить тариф'
        );
      }
    });
  };

  const submitPromoCode = () => {
    setError(null);
    startTransition(async () => {
      try {
        const payload = {
          appliesToPlanIds: promoForm.appliesToPlanIds,
          code: promoForm.code.trim(),
          description: promoForm.description.trim(),
          discountType: promoForm.discountType,
          discountValue: promoForm.discountValue,
          expiresAt: promoForm.expiresAt ? new Date(promoForm.expiresAt).toISOString() : null,
          isActive: promoForm.isActive,
          usageLimit: promoForm.usageLimit,
        };
        const response = await fetch(
          editingPromoCodeId
            ? `/api/admin/promo-codes/${editingPromoCodeId}`
            : '/api/admin/promo-codes',
          {
            method: editingPromoCodeId ? 'PATCH' : 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
        const result = (await response.json()) as {
          error?: string;
          promoCode?: PromoCode;
        };

        if (!response.ok || !result.promoCode) {
          throw new Error(result.error || 'Не удалось сохранить промокод');
        }

        const savedPromoCode = result.promoCode;

        setPromoCodes((current) => {
          if (editingPromoCodeId) {
            return current.map((promoCode) =>
              promoCode.id === savedPromoCode.id ? savedPromoCode : promoCode
            );
          }

          return [savedPromoCode, ...current];
        });
        setEditingPromoCodeId(null);
        setPromoForm(emptyPromoForm);
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось сохранить промокод'
        );
      }
    });
  };

  const deleteEntity = (
    path: string,
    onSuccess: () => void,
    fallbackMessage: string
  ) => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(path, {
          method: 'DELETE',
        });
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(result?.error || fallbackMessage);
        }

        onSuccess();
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : fallbackMessage
        );
      }
    });
  };

  return (
    <div className={styles.page}>
      <Container size="xl">
        <Stack gap="xl">
          <Paper className={styles.hero} p={{ base: 'xl', md: 32 }} radius="24px">
            <Stack gap="lg">
              <Group justify="space-between" wrap="wrap">
                <Stack className={styles.heroIntro} gap="sm">
                  <Group gap="xs">
                    <Badge color="horizon" variant="light">
                      Admin
                    </Badge>
                    <Badge color="gray" variant="light">
                      @{user.login}
                    </Badge>
                  </Group>
                  <Text className={styles.eyebrow}>Управление витриной</Text>
                  <Title className={styles.heroTitle} order={1}>
                    Тарифы, промокоды и публикация изменений в одном месте.
                  </Title>
                  <Text className={styles.muted}>
                    Все изменения применяются сразу. Тарифы берутся из БД,
                    промокоды учитываются при выдаче доступа, а данные в БД
                    хранятся в зашифрованном виде.
                  </Text>
                </Stack>

                <Group>
                  <Button component={Link} href="/" variant="light">
                    На витрину
                  </Button>
                  <LogoutButton />
                </Group>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Paper className={styles.statCard} p="lg" radius="20px">
                  <Stack gap={6}>
                    <Text className={styles.statLabel} size="sm">
                      Активных тарифов
                    </Text>
                    <Title className={styles.statValue} order={3}>
                      {plans.filter((plan) => plan.isActive).length}
                    </Title>
                  </Stack>
                </Paper>
                <Paper className={styles.statCard} p="lg" radius="20px">
                  <Stack gap={6}>
                    <Text className={styles.statLabel} size="sm">
                      Промокодов
                    </Text>
                    <Title className={styles.statValue} order={3}>
                      {promoCodes.length}
                    </Title>
                  </Stack>
                </Paper>
                <Paper className={styles.statCard} p="lg" radius="20px">
                  <Stack gap={6}>
                    <Text className={styles.statLabel} size="sm">
                      Активных промокодов
                    </Text>
                    <Title className={styles.statValue} order={3}>
                      {promoCodes.filter((promoCode) => promoCode.isActive).length}
                    </Title>
                  </Stack>
                </Paper>
              </SimpleGrid>
            </Stack>
          </Paper>

          {error ? (
            <Paper className={styles.errorCard} p="lg" radius="20px">
              <Text c="red.4">{error}</Text>
            </Paper>
          ) : null}

          <Tabs className={styles.tabs} defaultValue="plans">
            <Tabs.List>
              <Tabs.Tab value="plans">Тарифы</Tabs.Tab>
              <Tabs.Tab value="promo-codes">Промокоды</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel pt="lg" value="plans">
              <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="xl">
                <Paper className={styles.panel} p="xl" radius="24px">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title className={styles.sectionTitle} order={3}>
                        {editingPlanId ? 'Редактирование тарифа' : 'Новый тариф'}
                      </Title>
                      {editingPlanId ? (
                        <Button
                          color="gray"
                          onClick={() => {
                            setEditingPlanId(null);
                            setPlanForm(emptyPlanForm);
                          }}
                          variant="subtle"
                        >
                          Сбросить
                        </Button>
                      ) : null}
                    </Group>

                    <TextInput
                      label="Название"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPlanForm((current) => ({ ...current, title: value }));
                      }}
                      styles={fieldStyles}
                      value={planForm.title}
                    />

                    <TextInput
                      description="Например: extended-premium"
                      label="Slug"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPlanForm((current) => ({ ...current, slug: value }));
                      }}
                      styles={fieldStyles}
                      value={planForm.slug}
                    />

                    <Textarea
                      label="Описание"
                      minRows={3}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPlanForm((current) => ({ ...current, description: value }));
                      }}
                      styles={fieldStyles}
                      value={planForm.description}
                    />

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <NumberInput
                        label="Цена, ₽"
                        min={0}
                        onChange={(value) => {
                          setPlanForm((current) => ({
                            ...current,
                            priceRub: typeof value === 'number' ? value : 0,
                          }));
                        }}
                        styles={fieldStyles}
                        value={planForm.priceRub}
                      />
                      <NumberInput
                        label="Дней"
                        min={1}
                        onChange={(value) => {
                          setPlanForm((current) => ({
                            ...current,
                            durationDays: typeof value === 'number' ? value : 30,
                          }));
                        }}
                        styles={fieldStyles}
                        value={planForm.durationDays}
                      />
                      <NumberInput
                        label="Лимит трафика, GB"
                        min={1}
                        onChange={(value) => {
                          setPlanForm((current) => ({
                            ...current,
                            trafficLimitGb:
                              typeof value === 'number' ? value : null,
                          }));
                        }}
                        styles={fieldStyles}
                        value={planForm.trafficLimitGb ?? undefined}
                      />
                      <NumberInput
                        label="Скорость, Мбит/с"
                        min={1}
                        onChange={(value) => {
                          setPlanForm((current) => ({
                            ...current,
                            speedLimitMbps:
                              typeof value === 'number' ? value : null,
                          }));
                        }}
                        styles={fieldStyles}
                        value={planForm.speedLimitMbps ?? undefined}
                      />
                      <NumberInput
                        label="Inbound ID"
                        min={1}
                        onChange={(value) => {
                          setPlanForm((current) => ({
                            ...current,
                            inboundId: typeof value === 'number' ? value : 1,
                          }));
                        }}
                        styles={fieldStyles}
                        value={planForm.inboundId}
                      />
                      <TextInput
                        label="Badge"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setPlanForm((current) => ({ ...current, badge: value }));
                        }}
                        styles={fieldStyles}
                        value={planForm.badge}
                      />
                    </SimpleGrid>

                    <TextInput
                      label="CTA текст"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPlanForm((current) => ({ ...current, ctaText: value }));
                      }}
                      styles={fieldStyles}
                      value={planForm.ctaText}
                    />

                    <TextInput
                      label="Короткий highlight"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPlanForm((current) => ({ ...current, highlight: value }));
                      }}
                      styles={fieldStyles}
                      value={planForm.highlight}
                    />

                    <Textarea
                      description="Одна выгода на строку"
                      label="Преимущества"
                      minRows={4}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPlanForm((current) => ({ ...current, features: value }));
                      }}
                      styles={fieldStyles}
                      value={planForm.features}
                    />

                    <Group>
                      <Checkbox
                        checked={planForm.isActive}
                        label="Активен"
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setPlanForm((current) => ({
                            ...current,
                            isActive: checked,
                          }));
                        }}
                      />
                      <Checkbox
                        checked={planForm.isFeatured}
                        label="Выделять как лучший"
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setPlanForm((current) => ({
                            ...current,
                            isFeatured: checked,
                          }));
                        }}
                      />
                    </Group>

                    <Button loading={isPending} onClick={submitPlan}>
                      {editingPlanId ? 'Сохранить тариф' : 'Создать тариф'}
                    </Button>
                  </Stack>
                </Paper>

                <Paper className={styles.tableCard} p="xl" radius="24px">
                  <Stack gap="md">
                    <Title className={styles.sectionTitle} order={3}>
                      Текущие тарифы
                    </Title>
                    <Table.ScrollContainer className={styles.table} minWidth={720}>
                      <Table highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Тариф</Table.Th>
                            <Table.Th>Цена</Table.Th>
                            <Table.Th>Статус</Table.Th>
                            <Table.Th>Inbound</Table.Th>
                            <Table.Th>Действия</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {plans.map((plan) => (
                            <Table.Tr key={plan.id}>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text className={styles.rowTitle} fw={600}>
                                    {plan.title}
                                  </Text>
                                  <Text className={styles.muted} size="sm">
                                    {plan.slug}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>{plan.priceRub} ₽</Table.Td>
                              <Table.Td>{plan.isActive ? 'Активен' : 'Скрыт'}</Table.Td>
                              <Table.Td>{plan.inboundId}</Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <Button
                                    color="gray"
                                    onClick={() => {
                                      setEditingPlanId(plan.id);
                                      setPlanForm(planToFormState(plan));
                                    }}
                                    size="compact-sm"
                                    variant="subtle"
                                  >
                                    Изменить
                                  </Button>
                                  <Button
                                    color="red"
                                    onClick={() => {
                                      deleteEntity(
                                        `/api/admin/plans/${plan.id}`,
                                        () => {
                                          setPlans((current) =>
                                            current.filter((item) => item.id !== plan.id)
                                          );
                                          if (editingPlanId === plan.id) {
                                            setEditingPlanId(null);
                                            setPlanForm(emptyPlanForm);
                                          }
                                        },
                                        'Не удалось удалить тариф'
                                      );
                                    }}
                                    size="compact-sm"
                                    variant="subtle"
                                  >
                                    Удалить
                                  </Button>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </Stack>
                </Paper>
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel pt="lg" value="promo-codes">
              <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="xl">
                <Paper className={styles.panel} p="xl" radius="24px">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title className={styles.sectionTitle} order={3}>
                        {editingPromoCodeId ? 'Редактирование промокода' : 'Новый промокод'}
                      </Title>
                      {editingPromoCodeId ? (
                        <Button
                          color="gray"
                          onClick={() => {
                            setEditingPromoCodeId(null);
                            setPromoForm(emptyPromoForm);
                          }}
                          variant="subtle"
                        >
                          Сбросить
                        </Button>
                      ) : null}
                    </Group>

                    <TextInput
                      label="Код"
                      onChange={(event) => {
                        const value = event.currentTarget.value.toUpperCase();
                        setPromoForm((current) => ({ ...current, code: value }));
                      }}
                      styles={fieldStyles}
                      value={promoForm.code}
                    />

                    <Textarea
                      label="Описание"
                      minRows={3}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setPromoForm((current) => ({ ...current, description: value }));
                      }}
                      styles={fieldStyles}
                      value={promoForm.description}
                    />

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Select
                        data={[
                          { label: 'Процент', value: 'percent' },
                          { label: 'Фиксированная сумма', value: 'fixed' },
                        ]}
                        label="Тип скидки"
                        onChange={(value) => {
                          setPromoForm((current) => ({
                            ...current,
                            discountType: value === 'fixed' ? 'fixed' : 'percent',
                          }));
                        }}
                        styles={fieldStyles}
                        value={promoForm.discountType}
                      />
                      <NumberInput
                        label={
                          promoForm.discountType === 'percent'
                            ? 'Скидка, %'
                            : 'Скидка, ₽'
                        }
                        min={1}
                        onChange={(value) => {
                          setPromoForm((current) => ({
                            ...current,
                            discountValue:
                              typeof value === 'number' ? value : current.discountValue,
                          }));
                        }}
                        styles={fieldStyles}
                        value={promoForm.discountValue}
                      />
                      <NumberInput
                        label="Лимит использований"
                        min={1}
                        onChange={(value) => {
                          setPromoForm((current) => ({
                            ...current,
                            usageLimit: typeof value === 'number' ? value : null,
                          }));
                        }}
                        styles={fieldStyles}
                        value={promoForm.usageLimit ?? undefined}
                      />
                      <TextInput
                        description="Оставьте пустым для бессрочного"
                        label="Действует до"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setPromoForm((current) => ({ ...current, expiresAt: value }));
                        }}
                        placeholder="2026-12-31T23:59"
                        styles={fieldStyles}
                        value={promoForm.expiresAt}
                      />
                    </SimpleGrid>

                    <Select
                      clearable
                      data={planOptions}
                      description="Выберите один тариф и нажмите добавить. Можно повторить несколько раз."
                      label="Применить к тарифу"
                      onChange={(value) => {
                        if (!value) {
                          return;
                        }

                        setPromoForm((current) => ({
                          ...current,
                          appliesToPlanIds: current.appliesToPlanIds.includes(value)
                            ? current.appliesToPlanIds
                            : [...current.appliesToPlanIds, value],
                        }));
                      }}
                      styles={fieldStyles}
                      value={null}
                    />

                    <Group gap="xs">
                      {promoForm.appliesToPlanIds.map((planId) => (
                        <Badge
                          color="gray"
                          key={planId}
                          onClick={() => {
                            setPromoForm((current) => ({
                              ...current,
                              appliesToPlanIds: current.appliesToPlanIds.filter(
                                (item) => item !== planId
                              ),
                            }));
                          }}
                          style={{ cursor: 'pointer' }}
                          variant="light"
                        >
                          {plans.find((plan) => plan.id === planId)?.title || planId}
                        </Badge>
                      ))}
                    </Group>

                    <Checkbox
                      checked={promoForm.isActive}
                      label="Промокод активен"
                      onChange={(event) => {
                        const checked = event.currentTarget.checked;
                        setPromoForm((current) => ({
                          ...current,
                          isActive: checked,
                        }));
                      }}
                    />

                    <Button loading={isPending} onClick={submitPromoCode}>
                      {editingPromoCodeId
                        ? 'Сохранить промокод'
                        : 'Создать промокод'}
                    </Button>
                  </Stack>
                </Paper>

                <Paper className={styles.tableCard} p="xl" radius="24px">
                  <Stack gap="md">
                    <Title className={styles.sectionTitle} order={3}>
                      Промокоды
                    </Title>
                    <Table.ScrollContainer className={styles.table} minWidth={720}>
                      <Table highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Код</Table.Th>
                            <Table.Th>Скидка</Table.Th>
                            <Table.Th>Использовано</Table.Th>
                            <Table.Th>Статус</Table.Th>
                            <Table.Th>Действия</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {promoCodes.map((promoCode) => (
                            <Table.Tr key={promoCode.id}>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text className={styles.rowTitle} fw={600}>
                                    {promoCode.code}
                                  </Text>
                                  <Text className={styles.muted} size="sm">
                                    {promoCode.description}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                {promoCode.discountType === 'percent'
                                  ? `${promoCode.discountValue}%`
                                  : `${promoCode.discountValue} ₽`}
                              </Table.Td>
                              <Table.Td>
                                {promoCode.usedCount}
                                {promoCode.usageLimit !== null
                                  ? ` / ${promoCode.usageLimit}`
                                  : ''}
                              </Table.Td>
                              <Table.Td>
                                {promoCode.isActive ? 'Активен' : 'Отключён'}
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <Button
                                    color="gray"
                                    onClick={() => {
                                      setEditingPromoCodeId(promoCode.id);
                                      setPromoForm(promoToFormState(promoCode));
                                    }}
                                    size="compact-sm"
                                    variant="subtle"
                                  >
                                    Изменить
                                  </Button>
                                  <Button
                                    color="red"
                                    onClick={() => {
                                      deleteEntity(
                                        `/api/admin/promo-codes/${promoCode.id}`,
                                        () => {
                                          setPromoCodes((current) =>
                                            current.filter((item) => item.id !== promoCode.id)
                                          );
                                          if (editingPromoCodeId === promoCode.id) {
                                            setEditingPromoCodeId(null);
                                            setPromoForm(emptyPromoForm);
                                          }
                                        },
                                        'Не удалось удалить промокод'
                                      );
                                    }}
                                    size="compact-sm"
                                    variant="subtle"
                                  >
                                    Удалить
                                  </Button>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  </Stack>
                </Paper>
              </SimpleGrid>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>
    </div>
  );
}
