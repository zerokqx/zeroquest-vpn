import { z } from 'zod';

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();

    return normalized === '' ? undefined : normalized;
  },
  z.string().optional()
);

const optionalPositiveInteger = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    return value;
  },
  z.number().int().positive().optional()
);

export const claimPlanRequestSchema = z.object({
  customTrafficGb: optionalPositiveInteger,
  deviceName: z.string().trim().min(1, 'Введите имя устройства'),
  planId: z.string().trim().min(1, 'Выберите тариф'),
  promoCode: optionalTrimmedString,
});

export type ClaimPlanRequestInput = z.infer<typeof claimPlanRequestSchema>;
