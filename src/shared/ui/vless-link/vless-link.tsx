'use client';

import { Button, Group, Stack, Text } from '@mantine/core';
import styles from './vless-link.module.css';

interface VlessLinkProps {
  className?: string;
  showDeepLink?: boolean;
  value: string;
}

const toV2RayTunDeepLink = (value: string): string =>
  `v2raytun://import/${encodeURIComponent(value)}`;

export function VlessLink({
  className,
  showDeepLink = false,
  value,
}: VlessLinkProps) {
  const deepLink = value.startsWith('vless://')
    ? toV2RayTunDeepLink(value)
    : null;

  return (
    <Stack className={[styles.root, className].filter(Boolean).join(' ')} gap="sm">
      {showDeepLink && deepLink ? (
        <Group justify="space-between" wrap="wrap">
          <Text className={styles.label} size="sm">
            Прямая ссылка
          </Text>
          <Button
            component="a"
            href={deepLink}
            rel="noreferrer"
            size="compact-sm"
            target="_blank"
            variant="light"
          >
            Открыть в V2RayTun
          </Button>
        </Group>
      ) : null}

      <code className={styles.code}>{value}</code>
    </Stack>
  );
}
