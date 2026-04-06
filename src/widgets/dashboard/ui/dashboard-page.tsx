import {
  Badge,
  Button,
  Code,
  Container,
  Grid,
  GridCol,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import type { AccessRecordWithMonitoring } from '@/entities/access/model/types';
import type { PublicPlan } from '@/entities/plan/model/types';
import type { User } from '@/entities/user/model/types';
import { AccessQrButton } from '@/shared/ui/access-qr-button/access-qr-button';
import {
  formatBytes,
  formatLastOnline,
  formatPlanPrice,
  formatUtcDate,
  formatUtcDateTime,
} from '../model/formatting';
import { buildDashboardSummary } from '../model/summary';
import { ClaimPlanControl } from './claim-plan-control';
import { CopyAccessButton } from './copy-access-button';
import { DeleteAccessButton } from './delete-access-button';
import styles from './dashboard-page.module.css';

interface DashboardPageProps {
  accessRecords: AccessRecordWithMonitoring[];
  plans: PublicPlan[];
  user: User;
}

export function DashboardPage({
  accessRecords,
  plans,
  user,
}: DashboardPageProps) {
  const summary = buildDashboardSummary(accessRecords);

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
                <Button component="a" href="#plans" size="md">
                  Выбрать тариф
                </Button>
                <Link href="/">
                  <Button component="span" size="md" variant="light">
                    На главную
                  </Button>
                </Link>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Пользователь</span>
                  <strong className={styles.statValue}>@{user.login}</strong>
                </Stack>
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Активные устройства</span>
                  <strong className={styles.statValue}>{summary.activeDevices}</strong>
                </Stack>
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Израсходовано</span>
                  <strong className={styles.statValue}>
                    {formatBytes(summary.totalUsedBytes)}
                  </strong>
                </Stack>
                <Stack className={styles.statCard} component="article" gap={4}>
                  <span className={styles.statLabel}>Ближайшее окончание</span>
                  <strong className={styles.statValue}>
                    {summary.nextExpiry
                      ? formatUtcDate(summary.nextExpiry.expiresAt)
                      : 'Нет активных'}
                  </strong>
                </Stack>
              </SimpleGrid>
            </Stack>
          </section>

          <Grid align="start" gap="xl">
            <GridCol span={{ base: 12, lg: 8 }}>
              <section className={styles.devicesSection}>
                <Group align="flex-start" justify="space-between" wrap="wrap">
                  <Stack gap="xs">
                    <Text className={styles.eyebrow}>Устройства</Text>
                    <Title order={2}>Текущие подключения и мониторинг по ним</Title>
                  </Stack>
                  <Text className={styles.sectionMeta}>
                    {summary.hasUnlimitedRecords
                      ? 'Есть устройства с безлимитным трафиком'
                      : `Остаток по лимитам: ${formatBytes(summary.totalRemainingBytes)}`}
                  </Text>
                </Group>

                {accessRecords.length === 0 ? (
                  <Stack className={styles.emptyState} component="article" gap="sm" mt="xl">
                    <Title order={3}>Устройств пока нет</Title>
                    <Text className={styles.muted}>
                      Нажмите «Добавить устройство», выберите тариф и задайте имя
                      девайса. Новый доступ сразу появится в списке.
                    </Text>
                  </Stack>
                ) : (
                  <Stack gap="md" mt="xl">
                    {accessRecords.map((record) => {
                      const primaryMetrics = [
                        {
                          caption:
                            record.totalTrafficBytes === null
                              ? 'Тариф без жёсткого лимита'
                              : `${record.usagePercent ?? 0}% от лимита`,
                          tone: 'accent',
                          value: formatBytes(record.usedTrafficBytes),
                          label: 'Потрачено',
                        },
                        {
                          caption:
                            record.remainingTrafficBytes === null
                              ? 'Трафик не ограничен'
                              : 'Оставшийся доступный объём',
                          tone: 'neutral',
                          value:
                            record.remainingTrafficBytes === null
                              ? 'Безлимит'
                              : formatBytes(record.remainingTrafficBytes),
                          label: 'Остаток',
                        },
                        {
                          caption: 'Последний сигнал от клиента',
                          tone: 'neutral',
                          value: formatLastOnline(record.lastOnlineAt),
                          label: 'Последняя активность',
                        },
                      ] as const;
                      const secondaryMetrics = [
                        {
                          caption: 'Пропускная способность',
                          value:
                            record.speedLimitMbps === null
                              ? 'Без ограничения'
                              : `До ${record.speedLimitMbps} Мбит/с`,
                          label: 'Скорость',
                        },
                        {
                          caption: 'Дата первой выдачи',
                          value: formatUtcDateTime(record.createdAt),
                          label: 'Выдан',
                        },
                        {
                          caption: record.isActive
                            ? 'Подключение ещё активно'
                            : 'Нужно перевыпустить доступ',
                          value: formatUtcDateTime(record.expiresAt),
                          label: 'Действует до',
                        },
                      ] as const;

                      return (
                        <Stack
                          className={styles.deviceCard}
                          component="article"
                          gap="lg"
                          key={record.id}
                        >
                          <div className={styles.deviceHeader}>
                            <Group align="flex-start" justify="space-between" wrap="wrap">
                              <Stack className={styles.deviceLead} gap="md">
                                <Group gap="xs">
                                  <Badge variant="filled">
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

                                <Stack gap={6}>
                                  <Title className={styles.deviceTitle} order={3}>
                                    {record.displayName}
                                  </Title>
                                  <Text className={styles.deviceSubtitle}>
                                    {record.planTitle} • {record.inboundRemark}
                                  </Text>
                                </Stack>
                              </Stack>

                              <Stack className={styles.deviceIdentity} gap={6}>
                                <span className={styles.metricKey}>Идентификатор</span>
                                <Code className={styles.deviceCode}>{record.threeXUiEmail}</Code>
                              </Stack>
                            </Group>

                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                              <Stack className={styles.highlightCard} gap={6}>
                                <span className={styles.metricKey}>Маршрут</span>
                                <strong className={styles.highlightValue}>
                                  {record.inboundRemark}
                                </strong>
                                <Text className={styles.highlightMeta}>
                                  Тариф {record.planTitle}
                                </Text>
                              </Stack>

                              <Stack
                                className={`${styles.highlightCard} ${styles.highlightAccent}`}
                                gap={6}
                              >
                                <span className={styles.metricKey}>Состояние доступа</span>
                                <strong className={styles.highlightValue}>
                                  {record.isActive
                                    ? 'Подключение активно'
                                    : 'Доступ завершён'}
                                </strong>
                                <Text className={styles.highlightMeta}>
                                  До {formatUtcDate(record.expiresAt)}
                                </Text>
                              </Stack>
                            </SimpleGrid>
                          </div>

                          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                            {primaryMetrics.map((metric) => (
                              <Stack
                                className={`${styles.metricCard} ${
                                  metric.tone === 'accent' ? styles.metricCardAccent : ''
                                }`}
                                gap={6}
                                key={metric.label}
                              >
                                <span className={styles.metricKey}>{metric.label}</span>
                                <strong className={styles.metricValue}>{metric.value}</strong>
                                <span className={styles.metricCaption}>{metric.caption}</span>
                              </Stack>
                            ))}
                          </SimpleGrid>

                          {record.totalTrafficBytes !== null ? (
                            <Stack className={styles.usagePanel} gap="xs">
                              <Group justify="space-between" wrap="wrap">
                                <Text className={styles.metricKey}>Использование лимита</Text>
                                <Text className={styles.usageValue}>
                                  {record.usagePercent ?? 0}%
                                </Text>
                              </Group>
                              <Progress
                                classNames={{ root: styles.progressTrack }}
                                color="grape"
                                radius="xl"
                                size="lg"
                                value={record.usagePercent ?? 0}
                              />
                            </Stack>
                          ) : null}

                          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                            {secondaryMetrics.map((metric) => (
                              <Stack className={styles.metricCardSecondary} gap={6} key={metric.label}>
                                <span className={styles.metricKey}>{metric.label}</span>
                                <strong className={styles.metricValueSecondary}>{metric.value}</strong>
                                <span className={styles.metricCaption}>{metric.caption}</span>
                              </Stack>
                            ))}
                          </SimpleGrid>

                          <Stack className={styles.uriBox} component="footer" gap="md">
                            <Group justify="space-between" wrap="wrap">
                              <Stack gap={2}>
                                <Text className={styles.uriTitle}>Ссылка подключения</Text>
                                <Text className={styles.uriCaption}>
                                  QR удобен для второго устройства, ссылка для ручного импорта.
                                </Text>
                              </Stack>
                              <Group gap="xs">
                                <AccessQrButton value={record.accessUri} variant="light" />
                                <CopyAccessButton value={record.accessUri} variant="light" />
                                <DeleteAccessButton accessId={record.id} />
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
                      );
                    })}
                  </Stack>
                )}
              </section>
            </GridCol>

            <GridCol span={{ base: 12, lg: 4 }}>
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
                  <Stack gap="lg" id="plans">
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

                          <ClaimPlanControl
                            initialPlanId={plan.id}
                            plans={plans}
                            triggerLabel={plan.ctaText}
                            triggerVariant={plan.isFeatured ? 'filled' : 'light'}
                            userLogin={user.login}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  </Stack>
                </section>
              </Stack>
            </GridCol>
          </Grid>
        </Stack>
      </Container>
    </main>
  );
}
