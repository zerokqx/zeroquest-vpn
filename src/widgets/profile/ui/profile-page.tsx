'use client';

import {
  Badge,
  Button,
  Code,
  Container,
  CopyButton,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import { useState } from 'react';
import { LogoutButton } from '@/features/auth/ui/logout-button';
import type { AccessRecordWithStatus } from '@/entities/access/model/types';
import type { User } from '@/entities/user/model/types';
import styles from './profile-page.module.css';

interface ProfilePageProps {
  accessRecords: AccessRecordWithStatus[];
  user: User;
}

const formatTraffic = (trafficLimitBytes: number | null): string => {
  if (trafficLimitBytes === null) {
    return 'Безлимит';
  }

  return `${Math.round(trafficLimitBytes / 1024 ** 3)} GB`;
};

const formatSpeed = (speedLimitMbps: number | null): string =>
  speedLimitMbps === null ? 'Без ограничения' : `До ${speedLimitMbps} Мбит/с`;

export function ProfilePage({ accessRecords, user }: ProfilePageProps) {
  const [records, setRecords] = useState(accessRecords);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const activeRecords = records.filter((record) => record.isActive).length;

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

  return (
    <div className={styles.page}>
      <Container size="xl">
        <Stack gap="xl">
          <Paper className={styles.hero} p={{ base: 'xl', md: 40 }} radius="32px">
            <Stack gap="xl">
              <Group justify="space-between" gap="md" wrap="wrap">
                <Stack gap="md">
                  <Group gap="xs">
                    <Badge color="singularity" variant="filled">
                      Личный кабинет
                    </Badge>
                    <Badge color="horizon" variant="light">
                      @{user.login}
                    </Badge>
                  </Group>

                  <Text className={styles.eyebrow}>Управление подключениями</Text>

                  <Title c="white" className={styles.heroTitle} order={1}>
                    Все ваши конфиги и устройства доступны из профиля.
                  </Title>

                  <Text className={styles.heroCopy} size="lg">
                    Здесь сохраняются все выданные подключения. Можно
                    посмотреть тариф, срок действия, устройство и заново
                    скопировать ссылку без повторной выдачи.
                  </Text>
                </Stack>

                <Group gap="sm">
                  <Button component={Link} href="/" variant="light">
                    К тарифам
                  </Button>
                  <LogoutButton />
                </Group>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Paper className={styles.metricCard} p="lg">
                  <Stack gap={8}>
                    <Text c="dimmed" size="sm">
                      Пользователь
                    </Text>
                    <Title c="white" order={3}>
                      @{user.login}
                    </Title>
                    <Text c="dimmed" size="sm">
                      Имя пользователя автоматически попадает в подпись
                      подключения.
                    </Text>
                  </Stack>
                </Paper>

                <Paper className={styles.metricCard} p="lg">
                  <Stack gap={8}>
                    <Text c="dimmed" size="sm">
                      Всего подключений
                    </Text>
                    <Title c="white" order={3}>
                      {records.length}
                    </Title>
                    <Text c="dimmed" size="sm">
                      Сколько конфигов уже выпускалось на этот аккаунт.
                    </Text>
                  </Stack>
                </Paper>

                <Paper className={styles.metricCard} p="lg">
                  <Stack gap={8}>
                    <Text c="dimmed" size="sm">
                      Активных сейчас
                    </Text>
                    <Title c="white" order={3}>
                      {activeRecords}
                    </Title>
                    <Text c="dimmed" size="sm">
                      Подключения, срок действия которых еще не истек.
                    </Text>
                  </Stack>
                </Paper>
              </SimpleGrid>
            </Stack>
          </Paper>

          {error ? (
            <Paper className={styles.emptyState} p="lg" radius="24px">
              <Text c="red.4">{error}</Text>
            </Paper>
          ) : null}

          {records.length === 0 ? (
            <Paper className={styles.emptyState} p="xl" radius="28px">
              <Stack gap="md">
                <Title c="white" order={3}>
                  Пока здесь пусто
                </Title>
                <Text c="dimmed">
                  Перейдите к тарифам, выберите план и выпустите первый доступ.
                  После этого он сразу появится в профиле.
                </Text>
                <Group>
                  <Button component={Link} href="/">
                    Получить первый доступ
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
              {records.map((record) => {
                return (
                  <Paper className={styles.recordCard} key={record.id} p="xl" radius="28px">
                    <Stack gap="lg">
                      <Group justify="space-between" gap="md" wrap="wrap">
                        <Stack gap={6}>
                          <Group gap="xs">
                            <Badge
                              color={record.planPriceRub === 0 ? 'horizon' : 'singularity'}
                              variant="filled"
                            >
                              {record.planPriceRub === 0
                                ? 'Free'
                                : `${record.planPriceRub} ₽`}
                            </Badge>
                            <Badge color={record.isActive ? 'green' : 'gray'} variant="light">
                              {record.isActive ? 'Активен' : 'Истёк'}
                            </Badge>
                          </Group>

                          <Title c="white" order={2}>
                            {record.displayName}
                          </Title>
                          <Group gap="xs">
                            <Text c="dimmed">{record.planTitle}</Text>
                            {record.promoCode ? (
                              <Badge color="gray" variant="light">
                                {record.promoCode}
                              </Badge>
                            ) : null}
                          </Group>
                        </Stack>

                        <Code className={styles.resultCode}>{record.threeXUiEmail}</Code>
                      </Group>

                      <SimpleGrid className={styles.metaGrid} cols={{ base: 1, sm: 2 }} spacing="sm">
                        <Paper className={styles.metaCard} p="md">
                          <Stack gap={4}>
                            <Text c="dimmed" size="xs" tt="uppercase">
                              Устройство
                            </Text>
                            <Text c="white" fw={600}>
                              {record.deviceName}
                            </Text>
                          </Stack>
                        </Paper>

                        <Paper className={styles.metaCard} p="md">
                          <Stack gap={4}>
                            <Text c="dimmed" size="xs" tt="uppercase">
                              Срок действия
                            </Text>
                            <Text c="white" fw={600}>
                              {new Date(record.expiresAt).toLocaleString('ru-RU')}
                            </Text>
                          </Stack>
                        </Paper>

                        <Paper className={styles.metaCard} p="md">
                          <Stack gap={4}>
                            <Text c="dimmed" size="xs" tt="uppercase">
                              Стоимость
                            </Text>
                            <Text c="white" fw={600}>
                              {record.finalPriceRub} ₽
                            </Text>
                            {record.originalPriceRub !== record.finalPriceRub ? (
                              <Text c="dimmed" size="xs">
                                было {record.originalPriceRub} ₽
                              </Text>
                            ) : null}
                          </Stack>
                        </Paper>

                        <Paper className={styles.metaCard} p="md">
                          <Stack gap={4}>
                            <Text c="dimmed" size="xs" tt="uppercase">
                              Трафик
                            </Text>
                            <Text c="white" fw={600}>
                              {formatTraffic(record.trafficLimitBytes)}
                            </Text>
                          </Stack>
                        </Paper>

                        <Paper className={styles.metaCard} p="md">
                          <Stack gap={4}>
                            <Text c="dimmed" size="xs" tt="uppercase">
                              Скорость
                            </Text>
                            <Text c="white" fw={600}>
                              {formatSpeed(record.speedLimitMbps)}
                            </Text>
                          </Stack>
                        </Paper>

                        <Paper className={styles.metaCard} p="md">
                          <Stack gap={4}>
                            <Text c="dimmed" size="xs" tt="uppercase">
                              Точка подключения
                            </Text>
                            <Text c="white" fw={600}>
                              {record.inboundRemark}
                            </Text>
                          </Stack>
                        </Paper>

                        <Paper className={styles.metaCard} p="md">
                          <Stack gap={4}>
                            <Text c="dimmed" size="xs" tt="uppercase">
                              Выдан
                            </Text>
                            <Text c="white" fw={600}>
                              {new Date(record.createdAt).toLocaleString('ru-RU')}
                            </Text>
                          </Stack>
                        </Paper>
                      </SimpleGrid>

                      <Paper className={styles.uriBox} p="md" radius="xl">
                        <Stack gap="md">
                          <Group justify="space-between">
                            <Text c="dimmed" size="sm">
                              Ссылка подключения
                            </Text>
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
                          </Group>

                          <Textarea
                            autosize
                            classNames={{
                              input: styles.uriTextarea,
                            }}
                            minRows={4}
                            readOnly
                            value={record.accessUri}
                            variant="filled"
                          />
                        </Stack>
                      </Paper>

                      <Group>
                        <Button
                          color="red"
                          loading={pendingDeleteId === record.id}
                          onClick={() => {
                            void deleteAccess(record.id);
                          }}
                          variant="subtle"
                        >
                          Удалить подключение
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                );
              })}
            </SimpleGrid>
          )}
        </Stack>
      </Container>
    </div>
  );
}
