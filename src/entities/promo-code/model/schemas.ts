import { z } from 'zod';

const codePattern = /^[A-Z0-9_-]+$/;

export const adminPromoCodeSchema = z
  .object({
    appliesToPlanIds: z.array(z.string().trim().min(1)).max(24),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(32)
      .regex(codePattern, 'Используйте только латиницу, цифры, дефис и подчёркивание'),
    description: z.string().trim().min(2).max(120),
    discountType: z.enum(['fixed', 'percent']),
    discountValue: z.number().positive().max(1_000_000),
    expiresAt: z.string().datetime().nullable(),
    isActive: z.boolean(),
    usageLimit: z.number().int().positive().max(1_000_000).nullable(),
  })
  .superRefine((value, context) => {
    if (value.discountType === 'percent' && value.discountValue > 100) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Скидка в процентах не может быть больше 100',
        path: ['discountValue'],
      });
    }
  });

export type AdminPromoCodeInput = z.infer<typeof adminPromoCodeSchema>;
