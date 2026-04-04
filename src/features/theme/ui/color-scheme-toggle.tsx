'use client';

import { Button, Tooltip, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { useMounted } from '@mantine/hooks';
import { MoonStar, SunMedium } from 'lucide-react';
import styles from './color-scheme-toggle.module.css';

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const mounted = useMounted();
  const colorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: false,
  });
  const isDark = mounted ? colorScheme === 'dark' : false;

  return (
    <Tooltip
      label={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      withArrow
    >
      <Button
        aria-label={isDark ? 'Светлая тема' : 'Тёмная тема'}
        className={styles.toggle}
        color="gray"
        leftSection={
          isDark ? <SunMedium size={16} strokeWidth={1.8} /> : <MoonStar size={16} strokeWidth={1.8} />
        }
        onClick={() => {
          setColorScheme(isDark ? 'light' : 'dark');
        }}
        size="sm"
        variant="light"
      >
        <span className={styles.label}>{isDark ? 'Светлая' : 'Тёмная'}</span>
      </Button>
    </Tooltip>
  );
}
