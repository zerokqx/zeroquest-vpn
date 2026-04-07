import { getVpnKeyByPaymentId } from '@/entities/access';
import { getPaymentById } from '@/entities/payment';
import type { PaymentStatusResponse } from '../model/types';
import { buildPaymentStatusResponse } from './payment-status-response';
import { ensurePaymentFulfilled } from './fulfill-payment';

export const getPaymentStatusSnapshot = async (
  paymentId: string
): Promise<PaymentStatusResponse | null> => {
  const payment = await getPaymentById(paymentId);

  if (!payment) {
    return null;
  }

  const vpnKey =
    payment.status === 'succeeded'
      ? await ensurePaymentFulfilled(payment.id)
      : await getVpnKeyByPaymentId(payment.id);
  const refreshedPayment = (await getPaymentById(paymentId)) ?? payment;

  return buildPaymentStatusResponse(refreshedPayment, vpnKey);
};
