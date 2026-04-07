'use server';

import { revalidatePath } from 'next/cache';
import { requireCurrentUser } from '@/entities/user';
import { requestRefund } from '@/features/refunds/server/request-refund';

export const requestDashboardRefundAction = async (
  accessId: string,
  reason: string
): Promise<void> => {
  const user = await requireCurrentUser();

  await requestRefund(user, {
    accessId,
    reason,
  });

  revalidatePath('/dashboard');
  revalidatePath('/admin/refunds');
};
