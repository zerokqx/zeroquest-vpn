'use server';

import { revalidatePath } from 'next/cache';
import { deleteAccessForUser } from '@/entities/access/server/delete-access';
import { requireCurrentUser } from '@/entities/user';
import { claimPlanRequestSchema } from '@/features/claim-plan/model/schemas';
import type {
  ClaimPlanRequest,
  ClaimPlanResponse,
} from '@/features/claim-plan/model/types';
import { claimPlan } from '@/features/claim-plan/server/claim-plan';

export const claimDashboardPlanAction = async (
  input: ClaimPlanRequest
): Promise<ClaimPlanResponse> => {
  const user = await requireCurrentUser();
  const parsed = claimPlanRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Проверьте данные формы');
  }

  const result = await claimPlan({
    ...parsed.data,
    user,
  });

  revalidatePath('/dashboard');

  return result;
};

export const deleteDashboardAccessAction = async (
  accessId: string
): Promise<void> => {
  const user = await requireCurrentUser();
  const normalizedAccessId = accessId.trim();

  if (!normalizedAccessId) {
    throw new Error('Подключение не найдено');
  }

  await deleteAccessForUser(normalizedAccessId, user.id);
  revalidatePath('/dashboard');
};
