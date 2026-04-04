'use client';

import { Button } from '@mantine/core';
import type { ReactNode } from 'react';
import { useTransition } from 'react';
import { logoutRequest } from '../api/client';

interface LogoutButtonProps {
  fullWidth?: boolean;
  leftSection?: ReactNode;
}

export function LogoutButton({ fullWidth = false, leftSection }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      color="gray"
      fullWidth={fullWidth}
      leftSection={leftSection}
      loading={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await logoutRequest();
            window.location.assign('/');
          } catch (error) {
            console.error(error);
          }
        });
      }}
      variant="subtle"
    >
      Выйти
    </Button>
  );
}
