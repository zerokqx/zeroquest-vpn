'use client';

import { Button, type ButtonProps } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';

interface CopyAccessButtonProps {
  copiedLabel?: string;
  label?: string;
  size?: ButtonProps['size'];
  value: string;
  variant?: ButtonProps['variant'];
}

export function CopyAccessButton({
  copiedLabel = 'Скопировано',
  label = 'Копировать',
  size = 'compact-sm',
  value,
  variant = 'subtle',
}: CopyAccessButtonProps) {
  const clipboard = useClipboard({
    timeout: 1500,
  });

  return (
    <Button
      color="gray"
      onClick={() => {
        clipboard.copy(value);
      }}
      size={size}
      variant={variant}
    >
      {clipboard.copied ? copiedLabel : label}
    </Button>
  );
}
