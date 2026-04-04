'use client';

import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { theme } from './theme';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <MantineProvider defaultColorScheme="light" theme={theme}>
      {children}
    </MantineProvider>
  );
}
