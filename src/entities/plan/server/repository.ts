import { randomUUID } from 'node:crypto';
import { cache } from 'react';
import { decryptJson, encryptJson, getPrismaClient } from '@/shared/db/server';
import type { Plan, PublicPlan, UpsertPlanInput } from '../model/types';

interface PlanPayload {
  allowsCustomTraffic?: boolean;
  badge: string | null;
  ctaText: string;
  customPricePerGbRub?: number | null;
  customTrafficMaxGb?: number | null;
  customTrafficMinGb?: number | null;
  description: string;
  durationDays: number;
  features: string[];
  highlight: string | null;
  inboundId: number;
  isFeatured: boolean;
  priceRub: number;
  slug: string;
  speedLimitMbps: number | null;
  title: string;
  trafficLimitBytes: number | null;
}

const BYTES_IN_GIGABYTE = 1024 ** 3;

const toPlan = (row: {
  createdAt: Date;
  id: string;
  isActive: boolean;
  payload: string;
  sortOrder: number;
  updatedAt: Date;
}): Plan => {
  const payload = decryptJson<PlanPayload>(row.payload);

  return {
    allowsCustomTraffic: payload.allowsCustomTraffic ?? false,
    id: row.id,
    slug: payload.slug,
    title: payload.title,
    description: payload.description,
    priceRub: payload.priceRub,
    trafficLimitBytes: payload.trafficLimitBytes,
    durationDays: payload.durationDays,
    speedLimitMbps: payload.speedLimitMbps,
    features: payload.features,
    inboundId: payload.inboundId,
    isFree: payload.priceRub === 0,
    isActive: row.isActive,
    isFeatured: payload.isFeatured,
    badge: payload.badge,
    ctaText: payload.ctaText,
    customPricePerGbRub: payload.customPricePerGbRub ?? null,
    customTrafficMaxGb: payload.customTrafficMaxGb ?? null,
    customTrafficMinGb: payload.customTrafficMinGb ?? null,
    highlight: payload.highlight,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const toPublicPlan = (plan: Plan): PublicPlan => ({
  allowsCustomTraffic: plan.allowsCustomTraffic,
  id: plan.id,
  slug: plan.slug,
  title: plan.title,
  description: plan.description,
  priceRub: plan.priceRub,
  periodLabel: `${plan.durationDays} дней`,
  badge: plan.badge,
  ctaText: plan.ctaText,
  customPricePerGbRub: plan.customPricePerGbRub,
  customTrafficMaxGb: plan.customTrafficMaxGb,
  customTrafficMinGb: plan.customTrafficMinGb,
  highlight: plan.highlight,
  trafficLimitBytes: plan.trafficLimitBytes,
  durationDays: plan.durationDays,
  trafficLimitGb:
    plan.trafficLimitBytes === null
      ? null
      : Math.round(plan.trafficLimitBytes / BYTES_IN_GIGABYTE),
  speedLimitMbps: plan.speedLimitMbps,
  features: plan.features,
  isFree: plan.isFree,
  isFeatured: plan.isFeatured,
});

export const listPlans = async (): Promise<Plan[]> =>
  (await getPrismaClient().planStore.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  })).map(toPlan);

export const listPublicPlans = cache(async (): Promise<PublicPlan[]> =>
  (await getPrismaClient().planStore.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  }))
    .map(toPlan)
    .map(toPublicPlan)
);

export const getPlanById = cache(async (planId: string): Promise<Plan | null> => {
  const row = await getPrismaClient().planStore.findUnique({
    where: {
      id: planId,
    },
  });

  return row ? toPlan(row) : null;
});

export const createPlan = async (input: UpsertPlanInput): Promise<Plan> => {
  const prisma = getPrismaClient();
  const now = new Date().toISOString();
  const planId = randomUUID();
  const currentMaxSortOrder = await prisma.planStore.findFirst({
    orderBy: {
      sortOrder: 'desc',
    },
    select: {
      sortOrder: true,
    },
  });
  const sortOrder = (currentMaxSortOrder?.sortOrder ?? -1) + 1;

  await prisma.planStore.create({
    data: {
      createdAt: new Date(now),
      id: planId,
      isActive: input.isActive,
      payload: encryptJson({
        allowsCustomTraffic: input.allowsCustomTraffic ?? false,
        badge: input.badge,
        ctaText: input.ctaText,
        customPricePerGbRub: input.customPricePerGbRub ?? null,
        customTrafficMaxGb: input.customTrafficMaxGb ?? null,
        customTrafficMinGb: input.customTrafficMinGb ?? null,
        description: input.description,
        durationDays: input.durationDays,
        features: input.features,
        highlight: input.highlight,
        inboundId: input.inboundId,
        isFeatured: input.isFeatured,
        priceRub: input.priceRub,
        slug: input.slug,
        speedLimitMbps: input.speedLimitMbps,
        title: input.title,
        trafficLimitBytes: input.trafficLimitBytes,
      }),
      slug: input.slug,
      sortOrder,
      updatedAt: new Date(now),
    },
  });

  return (await getPlanById(planId)) as Plan;
};

export const updatePlan = async (
  planId: string,
  input: UpsertPlanInput
): Promise<Plan> => {
  const prisma = getPrismaClient();
  const existing = await getPlanById(planId);

  if (!existing) {
    throw new Error('Тариф не найден');
  }

  const now = new Date().toISOString();

  await prisma.planStore.update({
    where: {
      id: planId,
    },
    data: {
      isActive: input.isActive,
      payload: encryptJson({
        allowsCustomTraffic:
          input.allowsCustomTraffic ?? existing.allowsCustomTraffic,
        badge: input.badge,
        ctaText: input.ctaText,
        customPricePerGbRub:
          input.customPricePerGbRub ?? existing.customPricePerGbRub,
        customTrafficMaxGb:
          input.customTrafficMaxGb ?? existing.customTrafficMaxGb,
        customTrafficMinGb:
          input.customTrafficMinGb ?? existing.customTrafficMinGb,
        description: input.description,
        durationDays: input.durationDays,
        features: input.features,
        highlight: input.highlight,
        inboundId: input.inboundId,
        isFeatured: input.isFeatured,
        priceRub: input.priceRub,
        slug: input.slug,
        speedLimitMbps: input.speedLimitMbps,
        title: input.title,
        trafficLimitBytes: input.trafficLimitBytes,
      }),
      slug: input.slug,
      updatedAt: new Date(now),
    },
  });

  return (await getPlanById(planId)) as Plan;
};

export const deletePlan = async (planId: string): Promise<void> => {
  await getPrismaClient().planStore.delete({
    where: {
      id: planId,
    },
  });
};
