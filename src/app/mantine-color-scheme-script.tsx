'use client';

import { ColorSchemeScript, type MantineColorScheme } from '@mantine/core';
import { useServerInsertedHTML } from 'next/navigation';

interface MantineColorSchemeScriptProps {
  defaultColorScheme?: MantineColorScheme;
}

export function MantineColorSchemeScript({
  defaultColorScheme = 'light',
}: MantineColorSchemeScriptProps) {
  useServerInsertedHTML(() => (
    <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
  ));

  return null;
}
