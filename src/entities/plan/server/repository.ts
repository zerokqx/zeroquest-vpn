import { randomUUID } from 'node:crypto';
import { cache } from 'react';
import { getPrismaClient } from '@/shared/db/server';
import type { Plan, PublicPlan, UpsertPlanInput } from '../model/types';

const BYTES_IN_GIGABYTE = 1024 ** 3;

interface PlanWithInboundsRow {
  allowsCustomTraffic: boolean;
  badge: string | null;
  createdAt: Date;
  ctaText: string;
  currency: string;
  customPricePerGbRub: number | null;
  customTrafficMaxGb: number | null;
  customTrafficMinGb: number | null;
  description: string;
  durationDays: number;
  features: string[];
  highlight: string | null;
  id: string;
  isActive: boolean;
  isFeatured: boolean;
  planInbounds: Array<{
    inboundId: number;
    inbound: {
      id: number;
      isActive: boolean;
    };
  }>;
  priceRub: number;
  slug: string;
  sortOrder: number;
  speedLimitMbps: number | null;
  title: string;
  trafficLimitBytes: bigint | number | null;
  updatedAt: Date;
}

const toNumber = (value: bigint | number | null): number | null => {
  if (value === null) {
    return null;
  }

  return typeof value === 'bigint' ? Number(value) : value;
};

const planInclude = {
  planInbounds: {
    include: {
      inbound: true,
    },
    orderBy: [
      { sortOrder: 'asc' as const },
      { inboundId: 'asc' as const },
    ],
  },
};

const toPlan = (
  row: PlanWithInboundsRow
): Plan => {
  const primaryInbound =
    row.planInbounds.find((link) => link.inbound.isActive) ?? row.planInbounds[0];

  return {
    allowsCustomTraffic: row.allowsCustomTraffic,
    badge: row.badge,
    createdAt: row.createdAt.toISOString(),
    ctaText: row.ctaText,
    currency: row.currency,
    customPricePerGbRub: row.customPricePerGbRub,
    customTrafficMaxGb: row.customTrafficMaxGb,
    customTrafficMinGb: row.customTrafficMinGb,
    description: row.description,
    durationDays: row.durationDays,
    features: row.features,
    highlight: row.highlight,
    id: row.id,
    inboundId: primaryInbound?.inboundId ?? 0,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    isFree: row.priceRub === 0,
    priceRub: row.priceRub,
    slug: row.slug,
    sortOrder: row.sortOrder,
    speedLimitMbps: row.speedLimitMbps,
    title: row.title,
    trafficLimitBytes: toNumber(row.trafficLimitBytes),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const mergePlanFeatures = (plan: Plan): string[] => {
  const features: string[] = [];

  if (plan.trafficLimitBytes === null) {
    features.push('безлимитный трафик');
  } else {
    features.push(`${Math.round(plan.trafficLimitBytes / BYTES_IN_GIGABYTE)} GB трафика`);
  }

  if (plan.speedLimitMbps !== null) {
    features.push(`скорость до ${plan.speedLimitMbps} Мбит/с`);
  }

  if (plan.highlight) {
    features.push(plan.highlight);
  }

  return Array.from(new Set(features));
};

export const toPublicPlan = (plan: Plan): PublicPlan => ({
  allowsCustomTraffic: plan.allowsCustomTraffic,
  badge: plan.badge,
  ctaText: plan.ctaText,
  currency: plan.currency,
  customPricePerGbRub: plan.customPricePerGbRub,
  customTrafficMaxGb: plan.customTrafficMaxGb,
  customTrafficMinGb: plan.customTrafficMinGb,
  description: plan.description,
  durationDays: plan.durationDays,
  features: plan.features.length > 0 ? plan.features : mergePlanFeatures(plan),
  highlight: plan.highlight,
  id: plan.id,
  isFeatured: plan.isFeatured,
  isFree: plan.isFree,
  periodLabel: `${plan.durationDays} дней`,
  priceRub: plan.priceRub,
  slug: plan.slug,
  speedLimitMbps: plan.speedLimitMbps,
  title: plan.title,
  trafficLimitBytes: plan.trafficLimitBytes,
  trafficLimitGb:
    plan.trafficLimitBytes === null
      ? null
      : Math.round(plan.trafficLimitBytes / BYTES_IN_GIGABYTE),
});

const ensureInboundExists = async (inboundId: number): Promise<void> => {
  const inbound = await getPrismaClient().inboundStore.findUnique({
    where: {
      id: inboundId,
    },
    select: {
      id: true,
    },
  });

  if (!inbound) {
    throw new Error('Inbound не найден');
  }
};

export const listPlans = async (): Promise<Plan[]> =>
  (await getPrismaClient().planStore.findMany({
    include: planInclude,
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  })).map(toPlan);

export const listPublicPlans = cache(async (): Promise<PublicPlan[]> =>
  (await getPrismaClient().planStore.findMany({
    where: {
      isActive: true,
      priceRub: {
        gt: 0,
      },
    },
    include: planInclude,
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
    include: planInclude,
  });

  return row ? toPlan(row) : null;
});

export const createPlan = async (input: UpsertPlanInput): Promise<Plan> => {
  const prisma = getPrismaClient();
  const now = new Date();
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

  await ensureInboundExists(input.inboundId);

  await prisma.planStore.create({
    data: {
      allowsCustomTraffic: input.allowsCustomTraffic ?? false,
      badge: input.badge,
      createdAt: now,
      ctaText: input.ctaText,
      currency: input.currency,
      customPricePerGbRub: input.customPricePerGbRub ?? null,
      customTrafficMaxGb: input.customTrafficMaxGb ?? null,
      customTrafficMinGb: input.customTrafficMinGb ?? null,
      description: input.description,
      durationDays: input.durationDays,
      features: input.features,
      id: planId,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      highlight: input.highlight,
      planInbounds: {
        create: {
          createdAt: now,
          inboundId: input.inboundId,
          sortOrder: 0,
        },
      },
      priceRub: input.priceRub,
      slug: input.slug,
      sortOrder,
      speedLimitMbps: input.speedLimitMbps,
      title: input.title,
      trafficLimitBytes:
        input.trafficLimitBytes === null ? null : BigInt(input.trafficLimitBytes),
      updatedAt: now,
    },
    include: planInclude,
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

  await ensureInboundExists(input.inboundId);

  await prisma.planStore.update({
    where: {
      id: planId,
    },
    data: {
      allowsCustomTraffic: input.allowsCustomTraffic ?? existing.allowsCustomTraffic,
      badge: input.badge,
      ctaText: input.ctaText,
      currency: input.currency,
      customPricePerGbRub: input.customPricePerGbRub ?? existing.customPricePerGbRub,
      customTrafficMaxGb: input.customTrafficMaxGb ?? existing.customTrafficMaxGb,
      customTrafficMinGb: input.customTrafficMinGb ?? existing.customTrafficMinGb,
      description: input.description,
      durationDays: input.durationDays,
      features: input.features,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      highlight: input.highlight,
      planInbounds: {
        deleteMany: {},
        create: {
          createdAt: new Date(),
          inboundId: input.inboundId,
          sortOrder: 0,
        },
      },
      priceRub: input.priceRub,
      slug: input.slug,
      speedLimitMbps: input.speedLimitMbps,
      title: input.title,
      trafficLimitBytes:
        input.trafficLimitBytes === null ? null : BigInt(input.trafficLimitBytes),
      updatedAt: new Date(),
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
