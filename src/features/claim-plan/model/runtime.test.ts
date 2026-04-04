import { describe, expect, it } from 'vitest';
import {
  type Plan,
  type PublicPlan,
} from '../../../entities/plan/model/types';
import {
  BYTES_IN_GIGABYTE,
  resolveCustomTrafficGb,
  resolvePlanRuntimeSettings,
  sanitizeDeviceName,
} from './runtime';

const basePlan: Plan = {
  allowsCustomTraffic: false,
  badge: 'Старт',
  createdAt: '2026-01-01T00:00:00.000Z',
  ctaText: 'Подключить',
  customPricePerGbRub: null,
  customTrafficMaxGb: null,
  customTrafficMinGb: null,
  description: 'Описание',
  durationDays: 30,
  features: ['10 GB трафика'],
  highlight: '10 GB',
  id: 'free-plan',
  inboundId: 1,
  isActive: true,
  isFeatured: false,
  isFree: true,
  priceRub: 0,
  slug: 'free',
  sortOrder: 1,
  speedLimitMbps: null,
  title: 'Free',
  trafficLimitBytes: 10 * BYTES_IN_GIGABYTE,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const toPublicPlan = (plan: Plan): PublicPlan => ({
  allowsCustomTraffic: plan.allowsCustomTraffic,
  badge: plan.badge,
  ctaText: plan.ctaText,
  customPricePerGbRub: plan.customPricePerGbRub,
  customTrafficMaxGb: plan.customTrafficMaxGb,
  customTrafficMinGb: plan.customTrafficMinGb,
  description: plan.description,
  durationDays: plan.durationDays,
  features: plan.features,
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

describe('claim plan runtime', () => {
  it('sanitizes device name', () => {
    expect(sanitizeDeviceName('  My   iPhone  ')).toBe('My iPhone');
  });

  it('rejects too short device name', () => {
    expect(() => sanitizeDeviceName('a')).toThrow();
  });

  it('returns zero for non-custom plan', () => {
    expect(resolveCustomTrafficGb(undefined, basePlan)).toBe(0);
  });

  it('calculates runtime settings for custom plan', () => {
    const customPlan: Plan = {
      ...basePlan,
      allowsCustomTraffic: true,
      customPricePerGbRub: 12,
      customTrafficMaxGb: 120,
      customTrafficMinGb: 20,
      id: 'custom-plan',
      isFree: false,
      priceRub: 120,
      title: 'Полный кастом',
      trafficLimitBytes: null,
    };

    const result = resolvePlanRuntimeSettings(customPlan, 42, toPublicPlan);

    expect(result.priceRub).toBe(504);
    expect(result.trafficLimitBytes).toBe(42 * BYTES_IN_GIGABYTE);
    expect(result.publicPlan.trafficLimitGb).toBe(42);
  });
});
