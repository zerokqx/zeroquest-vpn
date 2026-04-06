'use client';

import { Button, Modal, Paper, Stack, Text, type ButtonProps } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { QRCodeSVG } from 'qrcode.react';
import styles from './access-qr-button.module.css';

interface AccessQrButtonProps {
  buttonLabel?: string;
  size?: ButtonProps['size'];
  value: string;
  variant?: ButtonProps['variant'];
}

export function AccessQrButton({
  buttonLabel = 'QR-код',
  size = 'compact-sm',
  value,
  variant = 'subtle',
}: AccessQrButtonProps) {
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <>
      <Button color="gray" onClick={open} size={size} variant={variant}>
        {buttonLabel}
      </Button>

      <Modal
        centered
        onClose={close}
        opened={opened}
        size="md"
        title="QR-код для подключения"
      >
        <Stack gap="md">
          <Paper className={styles.panel} p="xl" radius="28px">
            <Stack gap="md">
              <div className={styles.frame}>
                <QRCodeSVG
                  bgColor="#ffffff"
                  className={styles.code}
                  fgColor="#050505"
                  level="M"
                  marginSize={2}
                  size={240}
                  title="QR-код VLESS подключения"
                  value={value}
                />
              </div>

              <Text className={styles.hint} size="sm">
                Отсканируйте код в приложении клиента. Если подключение
                настраивается на этом же устройстве, используйте обычное
                копирование ссылки.
              </Text>

              <div className={styles.valueBox}>
                <Text className={styles.valueText}>{value}</Text>
              </div>
            </Stack>
          </Paper>
        </Stack>
      </Modal>
    </>
  );
}
