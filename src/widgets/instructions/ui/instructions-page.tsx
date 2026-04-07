import {
  Badge,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import Link from 'next/link';
import styles from './instructions-page.module.css';

const platforms = [
  {
    clients: ['v2raytun', 'happ'],
    key: 'android',
    title: 'Android',
  },
  {
    clients: ['throne'],
    key: 'linux',
    title: 'Linux',
  },
  {
    clients: [],
    key: 'windows',
    title: 'Windows',
  },
] as const;

const steps = [
  {
    copy:
      'Установите подходящий клиент для вашей платформы. Для Android используйте v2raytun или happ, для Linux используйте throne. Для Windows пока оставляем слот пустым.',
    title: 'Установите клиент',
  },
  {
    copy:
      'Откройте dashboard, выберите устройство и скопируйте ссылку подключения или отсканируйте QR-код со второго девайса.',
    title: 'Возьмите конфиг из dashboard',
  },
  {
    copy:
      'Импортируйте ссылку в клиент, сохраните профиль и включите подключение. Название устройства в клиенте должно совпадать с тем, что вы выбрали при покупке.',
    title: 'Импортируйте профиль',
  },
  {
    copy:
      'После подключения проверьте, что трафик идет через VPN, а устройство в dashboard показывает активность и обновляет статистику.',
    title: 'Проверьте соединение',
  },
] as const;

export function InstructionsPage() {
  return (
    <main className={styles.page}>
      <Container size="xl">
        <Stack gap="xl">
          <section className={styles.hero}>
            <Stack gap="lg" p={{ base: 'xl', md: 40 }}>
              <Stack gap="sm">
                <Text className={styles.eyebrow}>Setup Guide</Text>
                <Title className={styles.heroTitle} order={1}>
                  Как настроить VPN-клиент после оплаты и выдачи ключа.
                </Title>
                <Text className={styles.muted} size="lg">
                  Сначала оплачиваете тариф, потом получаете ключ в dashboard и
                  уже после этого импортируете его в клиент. Ниже список
                  рекомендованных приложений и пошаговая схема подключения.
                </Text>
              </Stack>

              <Group gap="sm">
                <Link href="/dashboard">
                  <Button component="span">Открыть dashboard</Button>
                </Link>
                <Link href="/">
                  <Button component="span" variant="light">
                    На главную
                  </Button>
                </Link>
              </Group>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack gap="lg" p={{ base: 'xl', md: 32 }}>
              <Stack gap="xs">
                <Text className={styles.eyebrow}>Шаг 1</Text>
                <Title className={styles.sectionTitle} order={2}>
                  Установите подходящий клиент
                </Title>
              </Stack>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                {platforms.map((platform) => (
                  <Stack className={styles.platformCard} gap="md" key={platform.key} p="lg">
                    <Stack gap={6}>
                      <Text className={styles.eyebrow}>{platform.key}</Text>
                      <Title className={styles.platformTitle} order={3}>
                        {platform.title}
                      </Title>
                    </Stack>

                    {platform.clients.length > 0 ? (
                      <Group gap="xs">
                        {platform.clients.map((client) => (
                          <span className={styles.clientPill} key={client}>
                            {client}
                          </span>
                        ))}
                      </Group>
                    ) : (
                      <Text className={styles.emptySlot} size="sm">
                        Пока без рекомендованного клиента
                      </Text>
                    )}
                  </Stack>
                ))}
              </SimpleGrid>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack gap="lg" p={{ base: 'xl', md: 32 }}>
              <Stack gap="xs">
                <Text className={styles.eyebrow}>Flow</Text>
                <Title className={styles.sectionTitle} order={2}>
                  Пошаговая настройка
                </Title>
              </Stack>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {steps.map((step, index) => (
                  <Stack className={styles.stepCard} gap="sm" key={step.title} p="lg">
                    <span className={styles.stepNumber}>Шаг {index + 1}</span>
                    <Title order={3}>{step.title}</Title>
                    <Text className={styles.muted}>{step.copy}</Text>
                  </Stack>
                ))}
              </SimpleGrid>
            </Stack>
          </section>

          <section className={styles.section}>
            <Stack gap="sm" p={{ base: 'xl', md: 32 }}>
              <Group gap="xs">
                <Badge color="blue" variant="light">
                  Важно
                </Badge>
              </Group>
              <Text className={styles.muted}>
                Если ключ уже выдан, но приложение не подключается, сначала
                проверьте правильность импорта ссылки и состояние устройства в
                dashboard. Если нужен возврат, его можно запросить прямо из
                карточки устройства.
              </Text>
            </Stack>
          </section>
        </Stack>
      </Container>
    </main>
  );
}
