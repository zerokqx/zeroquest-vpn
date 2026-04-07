import { getVpnKeyByPaymentId, issueVpnKeyForPayment } from '@/entities/access';
import {
  acquirePaymentFulfillmentLease,
  completePaymentFulfillment,
  failPaymentFulfillment,
  getPaymentById,
  markPaymentPromoUsageApplied,
} from '@/entities/payment';
import { markPromoCodeAsUsed } from '@/entities/promo-code';
import { logServerError, logServerEvent } from '@/shared/logging/server/logger';

export const ensurePaymentFulfilled = async (paymentId: string) => {
  const existingKey = await getVpnKeyByPaymentId(paymentId);

  if (existingKey) {
    const payment = await getPaymentById(paymentId);

    if (payment && payment.fulfillmentStatus !== 'succeeded') {
      await completePaymentFulfillment(paymentId);
    }

    logServerEvent('info', 'payments', 'payment.fulfillment.reused-existing-key', {
      paymentId,
      vpnKeyId: existingKey.id,
    });
    return existingKey;
  }

  const payment = await getPaymentById(paymentId);

  if (!payment) {
    throw new Error('Платеж не найден');
  }

  if (payment.status !== 'succeeded') {
    return null;
  }

  const leaseAcquired = await acquirePaymentFulfillmentLease(paymentId);

  if (!leaseAcquired) {
    logServerEvent('debug', 'payments', 'payment.fulfillment.lease-skipped', {
      paymentId,
    });
    return await getVpnKeyByPaymentId(paymentId);
  }

  try {
    logServerEvent('info', 'payments', 'payment.fulfillment.started', {
      paymentId,
      userId: payment.userId,
    });
    let workingPayment = payment;

    if (workingPayment.payload.promoCodeId && !workingPayment.payload.promoUsageApplied) {
      await markPromoCodeAsUsed(workingPayment.payload.promoCodeId);
      workingPayment = await markPaymentPromoUsageApplied(workingPayment.id);
    }

    const vpnKey = await issueVpnKeyForPayment(workingPayment);

    await completePaymentFulfillment(workingPayment.id);

    logServerEvent('info', 'payments', 'payment.fulfillment.succeeded', {
      paymentId: workingPayment.id,
      userId: workingPayment.userId,
      vpnKeyId: vpnKey.id,
    });

    return vpnKey;
  } catch (error) {
    logServerError('payments', 'payment.fulfillment.failed', error, {
      paymentId: payment.id,
      userId: payment.userId,
    });
    await failPaymentFulfillment(
      payment.id,
      error instanceof Error ? error.message : 'Не удалось выдать VPN-ключ'
    );

    return await getVpnKeyByPaymentId(paymentId);
  }
};
