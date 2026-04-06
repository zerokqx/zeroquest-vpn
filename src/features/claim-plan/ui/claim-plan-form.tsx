'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import { useState } from 'react';
import type { PublicPlan } from '@/entities/plan/model/types';
import type { User } from '@/entities/user/model/types';
import { AccessQrButton } from '@/shared/ui/access-qr-button/access-qr-button';
import { CopyAccessButton } from '@/widgets/dashboard/ui/copy-access-button';
import { claimPlanRequest } from '../api/claim-plan';
import type { ClaimPlanResponse } from '../model/types';
import styles from './claim-plan-form.module.css';

interface ClaimPlanFormProps {
  plan: PublicPlan;
  viewer: User | null;
}

const formatTraffic = (plan: PublicPlan): string =>
  plan.trafficLimitGb === null ? 'Безлимит' : `${plan.trafficLimitGb} GB`;

export function ClaimPlanForm({ plan, viewer }: ClaimPlanFormProps) {
  const [deviceName, setDeviceName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimPlanResponse | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await claimPlanRequest({
        planId: plan.id,
        deviceName,
        promoCode,
      });

      setResult(response);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to claim plan'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deviceFieldStyles = {
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
  const profileLabel = plan.isFree ? 'Общий пул' : 'ZeroQuest Приватный';
  const namePreview = viewer ? `${viewer.login} / имя устройства` : '';

  return (
    <Card className={styles.card} padding="xl" radius="xl" shadow="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap="sm" style={{ flex: 1 }}>
            <Group gap="xs">
              <Badge color="singularity" radius="xl">
                {plan.badge || (plan.isFree ? 'Старт' : 'Лучший выбор')}
              </Badge>
              <Badge color="horizon" radius="xl" variant="light">
                {plan.periodLabel}
              </Badge>
            </Group>

            <div>
              <Title c="white" order={2}>
                {plan.title}
              </Title>
              <Text c="dimmed">{plan.description}</Text>
              {plan.highlight ? (
                <Text c="white" fw={600} mt={8} size="sm">
                  {plan.highlight}
                </Text>
              ) : null}
            </div>
          </Stack>

          <Paper className={styles.pricePanel} p="md" radius="xl">
            <Stack align="flex-start" gap={4}>
              <Text className={styles.priceLabel} size="xs">
                Стоимость
              </Text>
              <Title c="white" order={2}>
                {plan.priceRub === 0 ? '0 ₽' : `${plan.priceRub} ₽`}
              </Title>
              <Text c="dimmed" size="sm">
                {formatTraffic(plan)}
              </Text>
            </Stack>
          </Paper>
        </Group>

        <SimpleGrid className={styles.statsGrid} cols={{ base: 1, sm: 3 }} spacing="sm">
          <Paper className={styles.statCard} p="md">
            <Stack gap={4}>
              <Text c="dimmed" size="xs" tt="uppercase">
                Трафик
              </Text>
              <Text c="white" fw={600}>
                {formatTraffic(plan)}
              </Text>
            </Stack>
          </Paper>

          <Paper className={styles.statCard} p="md">
            <Stack gap={4}>
              <Text c="dimmed" size="xs" tt="uppercase">
                Скорость
              </Text>
              <Text c="white" fw={600}>
                {plan.speedLimitMbps === null
                  ? 'Без ограничения'
                  : `До ${plan.speedLimitMbps} Мбит/с`}
              </Text>
            </Stack>
          </Paper>

          <Paper className={styles.statCard} p="md">
            <Stack gap={4}>
              <Text c="dimmed" size="xs" tt="uppercase">
                Профиль
              </Text>
              <Text c="white" fw={600}>
                {profileLabel}
              </Text>
            </Stack>
          </Paper>
        </SimpleGrid>

        <List
          className={styles.features}
          c="dimmed"
          spacing="sm"
          icon={
            <ThemeIcon
              color={plan.isFree ? 'horizon' : 'singularity'}
              radius="xl"
              size={22}
            >
              <span>+</span>
            </ThemeIcon>
          }
        >
          {plan.features.map((feature) => (
            <List.Item key={feature}>{feature}</List.Item>
          ))}
        </List>

        {viewer ? (
          <Paper className={styles.formShell} p="md" radius="xl">
            <form onSubmit={(event) => void onSubmit(event)}>
              <Stack gap="md">
                <TextInput
                  description={`Подключение будет подписано как: ${namePreview}.`}
                  label="Имя устройства"
                  onChange={(event) => {
                    setDeviceName(event.currentTarget.value);
                  }}
                  placeholder="Например: iPhone 15 Pro"
                  required
                  size="md"
                  styles={deviceFieldStyles}
                  value={deviceName}
                  variant="filled"
                />

                {!plan.isFree ? (
                  <TextInput
                    description="Если промокода нет, оставьте поле пустым."
                    label="Промокод"
                    onChange={(event) => {
                      setPromoCode(event.currentTarget.value.toUpperCase());
                    }}
                    placeholder="Например: START20"
                    size="md"
                    styles={deviceFieldStyles}
                    value={promoCode}
                    variant="filled"
                  />
                ) : null}

                <Group className={styles.buttonRow}>
                  <Button
                    color="singularity"
                    loading={isSubmitting}
                    size="md"
                    type="submit"
                    variant={plan.isFree ? 'light' : 'filled'}
                  >
                    {isSubmitting
                      ? 'Подготавливаем доступ...'
                      : plan.ctaText}
                  </Button>

                  {result ? (
                    <AccessQrButton
                      buttonLabel="Показать QR"
                      size="md"
                      value={result.access.uri}
                    />
                  ) : null}

                  {result ? (
                    <CopyAccessButton
                      label="Копировать ссылку"
                      size="md"
                      value={result.access.uri}
                    />
                  ) : null}
                </Group>
              </Stack>
            </form>
          </Paper>
        ) : (
          <Paper className={styles.authGate} p="md" radius="xl">
            <Stack gap="md">
              <Alert
                color="horizon"
                radius="xl"
                title="Доступ выдается через аккаунт"
                variant="light"
              >
                Войдите или создайте профиль. После этого все выданные
                подключения будут доступны в личном кабинете.
              </Alert>

              <Group>
                <Button
                  color="singularity"
                  component={Link}
                  href="/auth"
                  size="md"
                  variant="light"
                >
                  Войти
                </Button>
                <Button
                  color="gray"
                  component={Link}
                  href="/auth?mode=register"
                  size="md"
                  variant="subtle"
                >
                  Создать аккаунт
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {error ? (
          <Alert color="red" radius="xl" title="Не удалось выдать доступ" variant="light">
            {error}
          </Alert>
        ) : null}

        {result ? (
          <Paper className={styles.result} p="lg" radius="xl">
            <Stack gap="md">
              <Group justify="space-between">
                <Title c="white" order={4}>
                  Доступ готов
                </Title>
                <Code className={styles.resultCode}>{result.client.email}</Code>
              </Group>

              <Text c="dimmed" size="sm">
                Цена: {result.pricing.finalPriceRub} ₽
                {result.pricing.originalPriceRub !== result.pricing.finalPriceRub
                  ? ` вместо ${result.pricing.originalPriceRub} ₽`
                  : ''}
                <br />
                {result.pricing.promoCode
                  ? `Промокод: ${result.pricing.promoCode}`
                  : 'Промокод: не использовался'}
                <br />
                Клиент: {result.client.name}
                <br />
                Точка подключения: {result.inbound.remark}
                <br />
                Активен до:{' '}
                {new Date(result.client.expiresAt).toLocaleString('ru-RU')}
              </Text>

              <Textarea
                autosize
                classNames={{
                  input: styles.resultTextarea,
                }}
                minRows={4}
                readOnly
                value={result.access.uri}
                variant="filled"
              />
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Card>
  );
}
