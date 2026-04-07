import { getPaymentById, updatePaymentProviderState } from '@/entities/payment';
import type { Payment } from '@/entities/payment/model/types';
import {
  captureYooKassaPayment,
  getYooKassaPayment,
  type YooKassaPayment,
} from '@/shared/api/yookassa/server';
import { logServerEvent } from '@/shared/logging/server/logger';
import { ensurePaymentFulfilled } from './fulfill-payment';

const resolveFailureReason = (payment: YooKassaPayment): string | null => {
  const reason = payment.cancellation_details?.reason;

  if (!reason) {
    return null;
  }

  return `Платеж отменён: ${reason}`;
};

const shouldSyncProviderStatus = (payment: Payment): boolean =>
  payment.provider === 'yookassa' &&
  Boolean(payment.providerPaymentId) &&
  (payment.status === 'pending' ||
    payment.status === 'waiting_for_capture' ||
    (payment.status === 'succeeded' && payment.fulfillmentStatus !== 'succeeded'));

export const syncPaymentStatus = async (
  paymentOrId: Payment | string
): Promise<Payment> => {
  const payment =
    typeof paymentOrId === 'string'
      ? await getPaymentById(paymentOrId)
      : paymentOrId;

  if (!payment) {
    throw new Error('Платеж не найден');
  }

  logServerEvent('debug', 'payments', 'payment.sync.started', {
    fulfillmentStatus: payment.fulfillmentStatus,
    localPaymentId: payment.id,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    userId: payment.userId,
  });

  if (!shouldSyncProviderStatus(payment)) {
    if (payment.status === 'succeeded' && payment.fulfillmentStatus !== 'succeeded') {
      await ensurePaymentFulfilled(payment.id);

      logServerEvent('info', 'payments', 'payment.sync.fulfilled-locally', {
        localPaymentId: payment.id,
        userId: payment.userId,
      });
      return (await getPaymentById(payment.id)) ?? payment;
    }

    return payment;
  }

  const providerPaymentId = payment.providerPaymentId;

  if (!providerPaymentId) {
    return payment;
  }

  const providerPayment = await getYooKassaPayment(providerPaymentId);
  const refreshedProviderPayment =
    providerPayment.status === 'waiting_for_capture'
      ? await captureYooKassaPayment({
          amount: payment.amount,
          currency: payment.currency,
          providerPaymentId,
        })
      : providerPayment;

  const updatedPayment = await updatePaymentProviderState(payment.id, {
    confirmationUrl:
      refreshedProviderPayment.confirmation?.confirmation_url ??
      payment.payload.confirmationUrl,
    failureReason: resolveFailureReason(refreshedProviderPayment),
    paidAt:
      refreshedProviderPayment.status === 'succeeded'
        ? payment.paidAt
          ? new Date(payment.paidAt)
          : new Date()
        : null,
    paymentMethodType:
      refreshedProviderPayment.payment_method?.type ??
      payment.payload.paymentMethodType,
    providerStatus: refreshedProviderPayment.status,
    status: refreshedProviderPayment.status,
  });

  if (updatedPayment.status === 'succeeded') {
    await ensurePaymentFulfilled(updatedPayment.id);
  }

  logServerEvent('info', 'payments', 'payment.sync.completed', {
    fulfillmentStatus: updatedPayment.fulfillmentStatus,
    localPaymentId: updatedPayment.id,
    previousStatus: payment.status,
    providerPaymentId,
    providerStatus: refreshedProviderPayment.status,
    status: updatedPayment.status,
    userId: updatedPayment.userId,
  });

  return (await getPaymentById(updatedPayment.id)) ?? updatedPayment;
};
