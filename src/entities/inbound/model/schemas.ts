import { z } from 'zod';
import type { UpsertInboundInput } from './types';

export const adminInboundSchema = z.object({
  id: z.number().int().positive(),
  isActive: z.boolean(),
  name: z.string().trim().min(2).max(64),
  type: z.string().trim().min(2).max(32),
  value: z.string().trim().min(1).max(128),
});

export type AdminInboundInput = z.infer<typeof adminInboundSchema>;

export const toUpsertInboundInput = (
  input: AdminInboundInput
): UpsertInboundInput => ({
  id: input.id,
  isActive: input.isActive,
  name: input.name,
  type: input.type,
  value: input.value,
});
