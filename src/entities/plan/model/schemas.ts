import { z } from 'zod';
import type { UpsertPlanInput } from './types';

const slugPattern = /^[a-z0-9-]+$/;
const gigabyte = 1024 ** 3;

export const adminPlanSchema = z.object({
  allowsCustomTraffic: z.boolean().optional(),
  badge: z.string().trim().max(32).nullable(),
  ctaText: z.string().trim().min(2).max(48),
  customPricePerGbRub: z.number().int().positive().max(1_000_000).nullable().optional(),
  customTrafficMaxGb: z.number().int().positive().max(100_000).nullable().optional(),
  customTrafficMinGb: z.number().int().positive().max(100_000).nullable().optional(),
  description: z.string().trim().min(10).max(240),
  durationDays: z.number().int().positive().max(3650),
  features: z.array(z.string().trim().min(1).max(120)).min(1).max(12),
  highlight: z.string().trim().max(64).nullable(),
  inboundId: z.number().int().positive(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  priceRub: z.number().int().nonnegative().max(1_000_000),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(slugPattern, 'Slug должен содержать только строчные буквы, цифры и дефисы'),
  speedLimitMbps: z.number().int().positive().max(100_000).nullable(),
  title: z.string().trim().min(2).max(48),
  trafficLimitGb: z.number().int().positive().max(100_000).nullable(),
});

export type AdminPlanInput = z.infer<typeof adminPlanSchema>;

export const toUpsertPlanInput = (input: AdminPlanInput): UpsertPlanInput => ({
  allowsCustomTraffic: input.allowsCustomTraffic,
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
  isActive: input.isActive,
  isFeatured: input.isFeatured,
  priceRub: input.priceRub,
  slug: input.slug,
  speedLimitMbps: input.speedLimitMbps,
  title: input.title,
  trafficLimitBytes:
    input.trafficLimitGb === null ? null : input.trafficLimitGb * gigabyte,
});
