'use client';

import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Tabs,
  TextInput,
} from '@mantine/core';
import { LogIn, UserPlus } from 'lucide-react';
import { useActionState, useState } from 'react';
import { initialAuthActionState } from '@/features/auth/model/action-state';
import {
  loginWithCredentialsAction,
  registerWithCredentialsAction,
} from '@/features/auth/server/actions';
import styles from './auth-page.module.css';

type AuthTab = 'login' | 'register';

interface AuthFormProps {
  initialMode: AuthTab;
  nextPath: string;
}

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

export function AuthForm({ initialMode, nextPath }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialMode);
  const [loginState, loginAction, loginPending] = useActionState(
    loginWithCredentialsAction,
    initialAuthActionState
  );
  const [registerState, registerAction, registerPending] = useActionState(
    registerWithCredentialsAction,
    initialAuthActionState
  );
  const error =
    activeTab === 'login' ? loginState.error : registerState.error;

  return (
    <>
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
          }
        }}
        value={activeTab}
      >
        <Tabs.List grow>
          <Tabs.Tab value="login">Войти</Tabs.Tab>
          <Tabs.Tab value="register">Регистрация</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt="lg" value="login">
          <form action={loginAction}>
            <input name="next" type="hidden" value={nextPath} />

            <Stack gap="md">
              <TextInput
                autoComplete="username"
                label="Логин"
                name="login"
                placeholder="Например: zerok"
                styles={fieldStyles}
              />

              <PasswordInput
                autoComplete="current-password"
                label="Пароль"
                name="password"
                placeholder="Введите пароль"
                styles={fieldStyles}
              />

              <Button
                fullWidth
                leftSection={<LogIn size={16} strokeWidth={1.9} />}
                loading={loginPending}
                size="md"
                type="submit"
              >
                Войти
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>

        <Tabs.Panel pt="lg" value="register">
          <form action={registerAction}>
            <input name="next" type="hidden" value={nextPath} />

            <Stack gap="md">
              <TextInput
                autoComplete="username"
                description="Латиница, цифры, точка, дефис или нижнее подчёркивание."
                label="Логин"
                name="login"
                placeholder="Например: zerok"
                styles={fieldStyles}
              />

              <PasswordInput
                autoComplete="new-password"
                label="Пароль"
                name="password"
                placeholder="Минимум 8 символов"
                styles={fieldStyles}
              />

              <PasswordInput
                autoComplete="new-password"
                label="Повторите пароль"
                name="confirmPassword"
                placeholder="Повторите пароль"
                styles={fieldStyles}
              />

              <Button
                fullWidth
                leftSection={<UserPlus size={16} strokeWidth={1.9} />}
                loading={registerPending}
                size="md"
                type="submit"
              >
                Зарегистрироваться
              </Button>
            </Stack>
          </form>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
