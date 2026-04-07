import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import type { PublicPlan } from '@/entities/plan/model/types';
import type { User } from '@/entities/user/model/types';
import { formatMoney } from '@/shared/lib/currency';
import styles from './home-page.module.css';

interface HomePageProps {
  plans: PublicPlan[];
  viewer: User | null;
}

export function HomePage({ plans, viewer }: HomePageProps) {
  return (
    <main className={styles.page}>
      <Container size="xl">
        <section className={styles.hero}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Stack gap="lg">
              <Group gap="xs">
                <Badge variant="filled">ZeroQuest VPN</Badge>
                <Badge color="gray" variant="light">
                  Flat dashboard для устройств и тарифов
                </Badge>
              </Group>

              <Stack className={styles.heroHeader} component="header" gap="md">
                <Text className={styles.eyebrow}>Приватный доступ без визуального шума</Text>
                <Title className={styles.heroTitle} order={1}>
                  VPN, где всё понятно с первого экрана.
                </Title>
                <Text className={styles.heroLead} size="lg">
                  Один аккаунт, один dashboard и все подключения под рукой.
                  Вы выбираете тариф, оплачиваете его через ЮKassa и только
                  после подтверждения платежа получаете VPN-ключ в личном кабинете.
                </Text>
              </Stack>

              <Group gap="sm">
                {viewer ? (
                  <>
                    <Link href="/dashboard">
                      <Button component="span" size="md">
                        Открыть dashboard
                      </Button>
                    </Link>
                    {viewer.role === 'admin' ? (
                      <Link href="/admin">
                        <Button component="span" size="md" variant="light">
                          Открыть admin
                        </Button>
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Button component="a" href="#plans" size="md">
                      Смотреть тарифы
                    </Button>
                    <Link href="/auth?mode=register">
                      <Button component="span" size="md" variant="light">
                        Регистрация
                      </Button>
                    </Link>
                  </>
                )}
              </Group>
            </Stack>

            <Paper
              aria-hidden="true"
              className={styles.preview}
              component="aside"
              p="md"
              radius="xl"
              withBorder
            >
              <Group className={styles.previewTop} gap="xs">
                <span className={styles.previewDot} />
                <span className={styles.previewDot} />
                <span className={styles.previewDot} />
              </Group>

              <Stack gap="md" mt="md">
                <Stack className={styles.previewInfo} gap="sm">
                  <Stack gap={4}>
                    <span className={styles.previewLabel}>Маршрут</span>
                    <strong>ZeroQuest Private</strong>
                  </Stack>
                  <Stack gap={4}>
                    <span className={styles.previewLabel}>Оплата</span>
                    <strong>Только после подтверждения</strong>
                  </Stack>
                  <Stack gap={4}>
                    <span className={styles.previewLabel}>Выдача</span>
                    <strong>В dashboard и профиле</strong>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          </SimpleGrid>

          <SimpleGrid className={styles.proofList} cols={{ base: 1, md: 3 }} mt="xl">
            <Stack className={styles.proofItem} gap={4}>
              <span className={styles.proofValue}>30 GB</span>
              <span className={styles.proofLabel}>стартовый платный тариф без демо-раздачи</span>
            </Stack>
            <Stack className={styles.proofItem} gap={4}>
              <span className={styles.proofValue}>250 ₽</span>
              <span className={styles.proofLabel}>расширенный тариф с безлимитным трафиком</span>
            </Stack>
            <Stack className={styles.proofItem} gap={4}>
              <span className={styles.proofValue}>Custom</span>
              <span className={styles.proofLabel}>полный кастом по гигабайтам под устройство</span>
            </Stack>
          </SimpleGrid>
        </section>

        {viewer ? (
          <Group
            className={styles.viewerBlock}
            justify="space-between"
            mt="xl"
            wrap="wrap"
          >
            <Stack gap="sm">
              <Text className={styles.eyebrow}>Для авторизованного пользователя</Text>
              <Title order={2}>Рабочий сценарий полностью перенесён в dashboard.</Title>
              <Text className={styles.sectionCopy}>
                Главная больше не забивает внимание тарифными карточками. Весь
                выбор плана, добавление устройства и мониторинг лежат в одном кабинете.
              </Text>
            </Stack>

            <Link href="/dashboard">
              <Button component="span" size="md">
                Перейти в dashboard
              </Button>
            </Link>
          </Group>
        ) : (
          <section className={styles.pricing} id="plans">
            <Stack className={styles.pricingHeader} component="header" gap="sm">
              <Text className={styles.eyebrow}>Тарифы</Text>
              <Title order={2}>
                План для знакомства, постоянного доступа и настройки под своё устройство.
              </Title>
              <Text className={styles.sectionCopy}>
                Здесь только ценность и условия. Сама выдача доступа начинается
                после регистрации и дальше всегда хранится в личном кабинете.
              </Text>
            </Stack>

            <SimpleGrid className={styles.pricingGrid} cols={{ base: 1, md: 3 }} mt="xl">
              {plans.map((plan) => (
                <Stack className={styles.planCard} component="article" gap="md" key={plan.id}>
                  <Group align="flex-start" justify="space-between" wrap="wrap">
                    <Stack gap="xs">
                      <Group gap="xs">
                        {plan.badge ? <Badge variant="light">{plan.badge}</Badge> : null}
                        <Badge color="gray" variant="subtle">
                          {plan.periodLabel}
                        </Badge>
                      </Group>
                      <Title order={3}>{plan.title}</Title>
                    </Stack>

                    <Text className={styles.planPrice}>
                      {plan.allowsCustomTraffic
                        ? `от ${formatMoney(plan.priceRub, plan.currency)}`
                        : formatMoney(plan.priceRub, plan.currency)}
                    </Text>
                  </Group>

                  <Text className={styles.sectionCopy}>{plan.description}</Text>

                  <Stack className={styles.planFeatures} component="ul" gap="sm">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                    {plan.allowsCustomTraffic ? (
                      <li>
                        {plan.customPricePerGbRub} ₽ за 1 GB, от {plan.customTrafficMinGb} до{' '}
                        {plan.customTrafficMaxGb} GB
                      </li>
                    ) : null}
                  </Stack>

                  <Group align="flex-start" justify="space-between" wrap="wrap">
                    <Text className={styles.planHighlight}>
                      {plan.allowsCustomTraffic
                        ? 'Сами выбираете объём трафика'
                        : plan.highlight || plan.features[0]}
                    </Text>
                    <Link href="/auth?mode=register">
                      <Button
                        component="span"
                        variant={plan.isFeatured ? 'filled' : 'light'}
                      >
                        {plan.ctaText}
                      </Button>
                    </Link>
                  </Group>
                </Stack>
              ))}
            </SimpleGrid>
          </section>
        )}
      </Container>
    </main>
  );
}
