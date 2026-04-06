import {
  Center,
  Container,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Reveal } from '@/shared/ui/reveal/reveal';
import { AuthForm } from './auth-form';
import styles from './auth-page.module.css';

type AuthTab = 'login' | 'register';

interface AuthPageProps {
  initialMode: AuthTab;
  nextPath: string;
}

export function AuthPage({ initialMode, nextPath }: AuthPageProps) {
  return (
    <main className={styles.page}>
      <Container size={540}>
        <Center className={styles.center} mih="calc(100vh - var(--header-height))">
          <Reveal className={styles.authPanelWrap} delay={0.04} y={16}>
            <Paper
              className={styles.authPanel}
              component="section"
              p={{ base: 'lg', md: 'xl' }}
              radius="xl"
            >
              <Stack gap="lg">
                <Stack gap={4}>
                  <Title order={1}>Авторизация</Title>
                  <Text className={styles.formCopy} size="sm">
                    Войдите или зарегистрируйтесь, чтобы открыть dashboard.
                  </Text>
                </Stack>

                <AuthForm initialMode={initialMode} nextPath={nextPath} />
              </Stack>
            </Paper>
          </Reveal>
        </Center>
      </Container>
    </main>
  );
}
