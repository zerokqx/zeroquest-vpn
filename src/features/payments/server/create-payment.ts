import { createPaymentRecord, updatePaymentProviderState } from '@/entities/payment';
import type { User } from '@/entities/user';
import { createYooKassaPayment } from '@/shared/api/yookassa/server';
import { yooKassaConfig } from '@/shared/config/env.server';
import { logServerError, logServerEvent } from '@/shared/logging/server/logger';
import type { CreatePaymentResponse, CreatePaymentRequest } from '../model/types';
import { ensurePaymentFulfilled } from './fulfill-payment';
import { resolvePaymentPricing } from './pricing';

export const createPayment = async (
  input: CreatePaymentRequest,
  user: User
): Promise<CreatePaymentResponse> => {
  logServerEvent('info', 'payments', 'payment.create.requested', {
    customTrafficGb: input.customTrafficGb ?? null,
    planId: input.planId,
    promoCode: input.promoCode ?? null,
    userId: user.id,
  });
  const pricing = await resolvePaymentPricing(input, user);
  const paymentRecord = await createPaymentRecord({
    amount: pricing.amount,
    currency: pricing.currency,
    payload: {
      confirmationUrl: null,
      customTrafficGb: input.customTrafficGb ?? null,
      description: `ZeroQuest VPN • ${pricing.planTitle} • ${pricing.displayName}`,
      deviceName: pricing.deviceName,
      displayName: pricing.displayName,
      durationDays: pricing.durationDays,
      failureReason: null,
      finalPriceRub: pricing.amount,
      inboundId: pricing.inboundId,
      originalPriceRub: pricing.originalPriceRub,
      paymentMethodType: null,
      periodLabel: pricing.periodLabel,
      planTitle: pricing.planTitle,
      promoCode: pricing.promoCode,
      promoCodeId: pricing.promoCodeId,
      promoUsageApplied: false,
      providerStatus: null,
      speedLimitMbps: pricing.speedLimitMbps,
      trafficLimitBytes: pricing.trafficLimitBytes,
    },
    planId: pricing.planId,
    provider: 'yookassa',
    userId: user.id,
  });

  logServerEvent('info', 'payments', 'payment.record.created', {
    amount: paymentRecord.amount,
    localPaymentId: paymentRecord.id,
    planId: pricing.planId,
    userId: user.id,
  });

  try {
    const providerPayment = await createYooKassaPayment({
      amount: pricing.amount,
      currency: pricing.currency,
      description: paymentRecord.payload.description,
      idempotenceKey: paymentRecord.id,
      metadata: {
        paymentRecordId: paymentRecord.id,
        planId: pricing.planId,
        userId: user.id,
      },
      returnUrl: yooKassaConfig.redirectTo,
    });
    const confirmationUrl = providerPayment.confirmation?.confirmation_url;

    if (!confirmationUrl) {
      throw new Error('ЮKassa не вернула ссылку для оплаты');
    }

    const updatedPayment = await updatePaymentProviderState(paymentRecord.id, {
      confirmationUrl,
      paidAt: providerPayment.status === 'succeeded' ? new Date() : null,
      paymentMethodType: providerPayment.payment_method?.type ?? null,
      providerPaymentId: providerPayment.id,
      providerStatus: providerPayment.status,
      status: providerPayment.status,
    });

    if (updatedPayment.status === 'succeeded') {
      await ensurePaymentFulfilled(updatedPayment.id);
    }

    logServerEvent('info', 'payments', 'payment.provider.created', {
      localPaymentId: updatedPayment.id,
      providerPaymentId: providerPayment.id,
      status: updatedPayment.status,
      userId: user.id,
    });

    return {
      amount: updatedPayment.amount,
      confirmationUrl,
      currency: updatedPayment.currency,
      paymentId: providerPayment.id,
      planTitle: updatedPayment.payload.planTitle,
      status: updatedPayment.status,
    };
  } catch (error) {
    logServerError('payments', 'payment.create.failed', error, {
      localPaymentId: paymentRecord.id,
      planId: pricing.planId,
      userId: user.id,
    });
    await updatePaymentProviderState(paymentRecord.id, {
      failureReason: error instanceof Error ? error.message : 'Не удалось создать платеж',
      providerStatus: 'failed',
      status: 'failed',
    });

    throw error;
  }
};
