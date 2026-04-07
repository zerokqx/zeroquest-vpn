import { getVpnKeyByPaymentId } from '@/entities/access';
import {
  getPaymentByProviderPaymentIdForUser,
} from '@/entities/payment';
import type { User } from '@/entities/user';
import type { PaymentStatusResponse } from '../model/types';
import { buildPaymentStatusResponse } from './payment-status-response';
import { ensurePaymentFulfilled } from './fulfill-payment';
import { syncPaymentStatus } from './sync-payment-status';

export const getPaymentStatus = async (
  user: User,
  providerPaymentId: string
): Promise<PaymentStatusResponse> => {
  const payment = await getPaymentByProviderPaymentIdForUser(
    user.id,
    providerPaymentId
  );

  if (!payment) {
    throw new Error('Платеж не найден');
  }

  const syncedPayment = await syncPaymentStatus(payment);

  const vpnKey =
    syncedPayment.status === 'succeeded'
      ? await ensurePaymentFulfilled(syncedPayment.id)
      : await getVpnKeyByPaymentId(syncedPayment.id);

  const refreshedPayment =
    (await getPaymentByProviderPaymentIdForUser(user.id, providerPaymentId)) ??
    syncedPayment;

  return buildPaymentStatusResponse(refreshedPayment, vpnKey);
};
