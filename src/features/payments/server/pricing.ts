import { getPlanById, toPublicPlan } from '@/entities/plan';
import { getPromoCodeByCode } from '@/entities/promo-code';
import type { User } from '@/entities/user';
import { sanitizeDeviceName, resolvePlanRuntimeSettings } from '@/features/claim-plan/model/runtime';
import type { CreatePaymentRequest } from '../model/types';

export interface ResolvedPaymentPricing {
  amount: number;
  deviceName: string;
  displayName: string;
  periodLabel: string;
  planId: string;
  planTitle: string;
  promoCode: string | null;
  promoCodeId: string | null;
  speedLimitMbps: number | null;
  trafficLimitBytes: number | null;
  durationDays: number;
  originalPriceRub: number;
}

const resolvePromoCode = async (
  promoCode: string | undefined,
  planId: string,
  originalPriceRub: number
): Promise<{
  finalPriceRub: number;
  promoCode: string | null;
  promoCodeId: string | null;
}> => {
  const trimmedPromoCode = promoCode?.trim();

  if (!trimmedPromoCode) {
    return {
      finalPriceRub: originalPriceRub,
      promoCode: null,
      promoCodeId: null,
    };
  }

  const resolvedPromoCode = await getPromoCodeByCode(trimmedPromoCode);

  if (!resolvedPromoCode) {
    throw new Error('Промокод не найден');
  }

  if (!resolvedPromoCode.isActive) {
    throw new Error('Промокод отключён');
  }

  if (
    resolvedPromoCode.expiresAt &&
    new Date(resolvedPromoCode.expiresAt).getTime() <= Date.now()
  ) {
    throw new Error('Срок действия промокода истёк');
  }

  if (
    resolvedPromoCode.usageLimit !== null &&
    resolvedPromoCode.usedCount >= resolvedPromoCode.usageLimit
  ) {
    throw new Error('Лимит использования промокода исчерпан');
  }

  if (
    resolvedPromoCode.appliesToPlanIds.length > 0 &&
    !resolvedPromoCode.appliesToPlanIds.includes(planId)
  ) {
    throw new Error('Промокод не подходит для выбранного тарифа');
  }

  const discountedPrice =
    resolvedPromoCode.discountType === 'percent'
      ? Math.round(
          originalPriceRub * (1 - resolvedPromoCode.discountValue / 100)
        )
      : originalPriceRub - resolvedPromoCode.discountValue;

  return {
    finalPriceRub: Math.max(0, discountedPrice),
    promoCode: resolvedPromoCode.code,
    promoCodeId: resolvedPromoCode.id,
  };
};

export const resolvePaymentPricing = async (
  input: CreatePaymentRequest,
  user: User
): Promise<ResolvedPaymentPricing & { currency: string; inboundId: number }> => {
  const deviceName = sanitizeDeviceName(input.deviceName);
  const plan = await getPlanById(input.planId);

  if (!plan) {
    throw new Error('Тариф не найден');
  }

  if (!plan.isActive) {
    throw new Error('Этот тариф сейчас недоступен');
  }

  const runtime = resolvePlanRuntimeSettings(plan, input.customTrafficGb, toPublicPlan);
  const pricing = await resolvePromoCode(input.promoCode, plan.id, runtime.priceRub);

  if (pricing.finalPriceRub <= 0) {
    throw new Error('Оплата с нулевой суммой отключена');
  }

  if (plan.inboundId <= 0) {
    throw new Error('Для тарифа не настроен inbound');
  }

  return {
    amount: pricing.finalPriceRub,
    currency: plan.currency,
    deviceName,
    displayName: `${user.login} / ${deviceName}`,
    durationDays: plan.durationDays,
    inboundId: plan.inboundId,
    originalPriceRub: runtime.priceRub,
    periodLabel: `${plan.durationDays} дней`,
    planId: plan.id,
    planTitle: plan.title,
    promoCode: pricing.promoCode,
    promoCodeId: pricing.promoCodeId,
    speedLimitMbps: plan.speedLimitMbps,
    trafficLimitBytes: runtime.trafficLimitBytes,
  };
};
