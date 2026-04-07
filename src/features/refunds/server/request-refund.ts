import { getAccessRecordByIdForUser } from '@/entities/access';
import { getPaymentById } from '@/entities/payment';
import {
  createRefundRequestRecord,
  getRefundRequestByPaymentId,
} from '@/entities/refund-request';
import type { User } from '@/entities/user/model/types';
import { logServerEvent } from '@/shared/logging/server/logger';

const normalizeReason = (reason: string): string => reason.trim();

export const requestRefund = async (
  user: User,
  input: {
    accessId: string;
    reason: string;
  }
) => {
  const accessId = input.accessId.trim();
  const reason = normalizeReason(input.reason);

  if (!accessId) {
    throw new Error('Подключение не найдено');
  }

  if (reason.length < 10) {
    throw new Error('Опишите причину возврата подробнее');
  }

  const accessRecord = await getAccessRecordByIdForUser(accessId, user.id);

  if (!accessRecord) {
    throw new Error('Подключение не найдено');
  }

  const payment = await getPaymentById(accessRecord.paymentId);

  if (!payment || payment.userId !== user.id) {
    throw new Error('Платеж не найден');
  }

  if (payment.status !== 'succeeded') {
    throw new Error('Возврат можно запросить только для оплаченного тарифа');
  }

  if (payment.provider !== 'yookassa' || !payment.providerPaymentId) {
    throw new Error('Возврат для этого платежа сейчас недоступен');
  }

  const existingRequest = await getRefundRequestByPaymentId(payment.id);

  if (existingRequest) {
    throw new Error('Запрос на возврат уже создан для этого устройства');
  }

  logServerEvent('info', 'refunds', 'refund.request.created', {
    accessId,
    paymentId: payment.id,
    userId: user.id,
  });

  return await createRefundRequestRecord({
    amount: payment.amount,
    currency: payment.currency,
    paymentId: payment.id,
    payload: {
      displayName: accessRecord.displayName,
      errorMessage: null,
      planTitle: accessRecord.planTitle,
      providerStatus: null,
      reason,
    },
    provider: payment.provider,
    purchaseAt: payment.paidAt,
    userId: user.id,
    vpnKeyId: accessRecord.id,
  });
};
