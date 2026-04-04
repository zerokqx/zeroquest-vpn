import type { Plan, PublicPlan } from '@/entities/plan/model/types';

export interface PlanRuntimeSettings {
  priceRub: number;
  publicPlan: PublicPlan;
  trafficLimitBytes: number | null;
}

export const BYTES_IN_GIGABYTE = 1024 ** 3;

export const sanitizeDeviceName = (deviceName: string): string => {
  const normalized = deviceName.trim().replace(/\s+/g, ' ');

  if (normalized.length < 2) {
    throw new Error('Name must contain at least 2 characters');
  }

  if (normalized.length > 48) {
    throw new Error('Name is too long');
  }

  return normalized;
};

export const resolveCustomTrafficGb = (
  customTrafficGb: number | undefined,
  plan: Pick<
    Plan,
    'allowsCustomTraffic' | 'customTrafficMaxGb' | 'customTrafficMinGb'
  >
): number => {
  if (!plan.allowsCustomTraffic) {
    return 0;
  }

  if (!Number.isFinite(customTrafficGb)) {
    throw new Error('Укажите объём трафика для кастомного тарифа');
  }

  const normalizedTrafficGb = Math.round(customTrafficGb ?? 0);
  const minGb = plan.customTrafficMinGb ?? 10;
  const maxGb = plan.customTrafficMaxGb ?? 200;

  if (normalizedTrafficGb < minGb || normalizedTrafficGb > maxGb) {
    throw new Error(`Выберите объём от ${minGb} до ${maxGb} GB`);
  }

  return normalizedTrafficGb;
};

export const resolvePlanRuntimeSettings = (
  plan: Plan,
  customTrafficGb: number | undefined,
  toPublicPlan: (plan: Plan) => PublicPlan
): PlanRuntimeSettings => {
  if (!plan.allowsCustomTraffic) {
    return {
      priceRub: plan.priceRub,
      publicPlan: toPublicPlan(plan),
      trafficLimitBytes: plan.trafficLimitBytes,
    };
  }

  const selectedTrafficGb = resolveCustomTrafficGb(customTrafficGb, plan);
  const pricePerGbRub = plan.customPricePerGbRub ?? 15;
  const trafficLimitBytes = selectedTrafficGb * BYTES_IN_GIGABYTE;
  const priceRub = selectedTrafficGb * pricePerGbRub;

  return {
    priceRub,
    publicPlan: {
      ...toPublicPlan(plan),
      priceRub,
      trafficLimitBytes,
      trafficLimitGb: selectedTrafficGb,
    },
    trafficLimitBytes,
  };
};
