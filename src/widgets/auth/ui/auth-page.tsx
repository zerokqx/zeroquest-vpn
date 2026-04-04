'use client';

import {
  Alert,
  Button,
  Center,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { LogIn, UserPlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  authCredentialsSchema,
  loginRequest,
  normalizeNextPath,
  registerFormSchema,
  registerRequest,
  resolvePostAuthRedirectPath,
} from '@/features/auth';
import { Reveal } from '@/shared/ui/reveal/reveal';
import styles from './auth-page.module.css';

type AuthTab = 'login' | 'register';

const fieldStyles = {
  description: {
    color: 'var(--muted)',
  },
  input: {
    background: 'var(--background-subtle)',
    borderColor: 'var(--surface-border)',
    color: 'var(--foreground)',
  },
  label: {
    color: 'var(--foreground)',
    marginBottom: 6,
  },
} as const;

export function AuthPage() {
  const searchParams = useSearchParams();
  const initialTab: AuthTab =
    searchParams?.get('mode') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({
    login: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    login: '',
    password: '',
    confirmPassword: '',
  });
  const [isPending, startTransition] = useTransition();

  const nextPath = normalizeNextPath(searchParams?.get('next') ?? null);

  const redirectToResolvedPath = (role: 'admin' | 'customer') => {
    const path = resolvePostAuthRedirectPath({ role }, nextPath);
    window.location.assign(path);
  };

  const submitLogin = () => {
    const parsed = authCredentialsSchema.safeParse(loginForm);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Проверьте данные формы');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await loginRequest(parsed.data);
        redirectToResolvedPath(response.user.role);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось войти в аккаунт'
        );
      }
    });
  };

  const submitRegister = () => {
    const parsed = registerFormSchema.safeParse(registerForm);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Проверьте данные формы');
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await registerRequest({
          login: parsed.data.login,
          password: parsed.data.password,
        });
        redirectToResolvedPath(response.user.role);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось создать аккаунт'
        );
      }
    });
  };

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

                {error ? (
                  <Alert color="red" radius="xl" title="Есть проблема" variant="light">
                    {error}
                  </Alert>
                ) : null}

                <Tabs
                  className={styles.tabs}
                  onChange={(value) => {
                    if (value === 'login' || value === 'register') {
                      setActiveTab(value);
                      setError(null);
                    }
                  }}
                  value={activeTab}
                >
                  <Tabs.List grow>
                    <Tabs.Tab value="login">Войти</Tabs.Tab>
                    <Tabs.Tab value="register">Регистрация</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel pt="lg" value="login">
                    <Stack gap="md">
                      <TextInput
                        label="Логин"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setLoginForm((current) => ({
                            ...current,
                            login: value,
                          }));
                        }}
                        placeholder="Например: zerok"
                        styles={fieldStyles}
                        value={loginForm.login}
                      />

                      <PasswordInput
                        label="Пароль"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setLoginForm((current) => ({
                            ...current,
                            password: value,
                          }));
                        }}
                        placeholder="Введите пароль"
                        styles={fieldStyles}
                        value={loginForm.password}
                      />

                      <Button
                        fullWidth
                        leftSection={<LogIn size={16} strokeWidth={1.9} />}
                        loading={isPending}
                        onClick={submitLogin}
                        size="md"
                      >
                        Войти
                      </Button>
                    </Stack>
                  </Tabs.Panel>

                  <Tabs.Panel pt="lg" value="register">
                    <Stack gap="md">
                      <TextInput
                        description="Латиница, цифры, точка, дефис или нижнее подчёркивание."
                        label="Логин"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setRegisterForm((current) => ({
                            ...current,
                            login: value,
                          }));
                        }}
                        placeholder="Например: zerok"
                        styles={fieldStyles}
                        value={registerForm.login}
                      />

                      <PasswordInput
                        label="Пароль"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setRegisterForm((current) => ({
                            ...current,
                            password: value,
                          }));
                        }}
                        placeholder="Минимум 8 символов"
                        styles={fieldStyles}
                        value={registerForm.password}
                      />

                      <PasswordInput
                        label="Повторите пароль"
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setRegisterForm((current) => ({
                            ...current,
                            confirmPassword: value,
                          }));
                        }}
                        placeholder="Повторите пароль"
                        styles={fieldStyles}
                        value={registerForm.confirmPassword}
                      />

                      <Button
                        fullWidth
                        leftSection={<UserPlus size={16} strokeWidth={1.9} />}
                        loading={isPending}
                        onClick={submitRegister}
                        size="md"
                      >
                        Зарегистрироваться
                      </Button>
                    </Stack>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            </Paper>
          </Reveal>
        </Center>
      </Container>
    </main>
  );
}
