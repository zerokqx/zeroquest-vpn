import { getPaymentByProviderPaymentId } from '@/entities/payment';
import { logServerEvent } from '@/shared/logging/server/logger';
import { notifyPaymentUpdate } from './realtime';
import { syncPaymentStatus } from './sync-payment-status';

interface YooKassaWebhookNotification {
  event?: string;
  object?: {
    id?: string;
  };
  type?: string;
}

export const handleYooKassaWebhook = async (
  notification: YooKassaWebhookNotification
): Promise<void> => {
  logServerEvent('info', 'payments', 'payment.webhook.received', {
    event: notification.event ?? null,
    providerPaymentId: notification.object?.id ?? null,
    type: notification.type ?? null,
  });
  const providerPaymentId = notification.object?.id?.trim();

  if (!providerPaymentId) {
    throw new Error('Некорректный webhook payload');
  }

  const payment = await getPaymentByProviderPaymentId(providerPaymentId);

  if (!payment) {
    return;
  }

  const updatedPayment = await syncPaymentStatus(payment);

  logServerEvent('info', 'payments', 'payment.webhook.processed', {
    localPaymentId: updatedPayment.id,
    providerPaymentId,
    status: updatedPayment.status,
    userId: updatedPayment.userId,
  });
  await notifyPaymentUpdate(updatedPayment.userId, updatedPayment.id);
};
