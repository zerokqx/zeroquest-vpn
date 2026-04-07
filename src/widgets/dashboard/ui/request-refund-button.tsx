'use client';

import {
  Button,
  Modal,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { RefundRequest } from '@/entities/refund-request';
import { requestDashboardRefundAction } from '../server/refund-actions';

interface RequestRefundButtonProps {
  accessId: string;
  amountLabel: string;
  refundRequest: RefundRequest | null;
}

const refundStatusLabel: Record<RefundRequest['status'], string> = {
  failed: 'Ошибка возврата',
  rejected: 'Возврат отклонён',
  refund_pending: 'Возврат в обработке',
  refunded: 'Возвращено',
  requested: 'Запрос отправлен',
};

export function RequestRefundButton({
  accessId,
  amountLabel,
  refundRequest,
}: RequestRefundButtonProps) {
  const [opened, { close, open }] = useDisclosure(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (refundRequest) {
    return (
      <Stack align="flex-end" gap={4}>
        <Button disabled size="compact-sm" variant="subtle">
          {refundStatusLabel[refundRequest.status]}
        </Button>
        <Text c="dimmed" size="xs">
          {refundRequest.reason}
        </Text>
      </Stack>
    );
  }

  return (
    <>
      <Button color="yellow" onClick={open} size="compact-sm" variant="subtle">
        Вернуть деньги
      </Button>

      <Modal
        centered
        onClose={close}
        opened={opened}
        title="Запрос на возврат"
      >
        <Stack gap="md">
          <Text c="dimmed" size="sm">
            Запрос уйдёт администратору на ручное подтверждение. Сумма возврата:
            {' '}
            {amountLabel}.
          </Text>

          <Textarea
            autosize
            label="Причина возврата"
            minRows={4}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder="Опиши, почему нужно вернуть деньги"
            value={reason}
          />

          {error ? (
            <Text c="red.6" size="sm">
              {error}
            </Text>
          ) : null}

          <Button
            loading={isPending}
            onClick={() => {
              setError(null);

              startTransition(async () => {
                try {
                  await requestDashboardRefundAction(accessId, reason);
                  close();
                  setReason('');
                  router.refresh();
                } catch (requestError) {
                  setError(
                    requestError instanceof Error
                      ? requestError.message
                      : 'Не удалось создать запрос на возврат'
                  );
                }
              });
            }}
          >
            Отправить запрос
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
