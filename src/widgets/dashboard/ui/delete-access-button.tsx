'use client';

import { Button, Stack, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteDashboardAccessAction } from '../server/actions';

interface DeleteAccessButtonProps {
  accessId: string;
}

export function DeleteAccessButton({ accessId }: DeleteAccessButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Stack align="flex-end" gap={4}>
      <Button
        color="red"
        loading={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await deleteDashboardAccessAction(accessId);
              router.refresh();
            } catch (requestError) {
              setError(
                requestError instanceof Error
                  ? requestError.message
                  : 'Не удалось удалить подключение'
              );
            }
          });
        }}
        size="compact-sm"
        variant="subtle"
      >
        Удалить
      </Button>

      {error ? (
        <Text c="red.6" size="xs">
          {error}
        </Text>
      ) : null}
    </Stack>
  );
}
