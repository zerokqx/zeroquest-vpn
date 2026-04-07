'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/entities/user';
import { reviewRefundRequest } from '@/features/refunds/server/review-refund-request';

export const approveRefundRequestAction = async (
  refundRequestId: string
): Promise<void> => {
  const admin = await requireAdminUser();

  await reviewRefundRequest(admin, {
    action: 'approve',
    refundRequestId,
  });

  revalidatePath('/admin/refunds');
  revalidatePath('/dashboard');
};

export const rejectRefundRequestAction = async (
  refundRequestId: string
): Promise<void> => {
  const admin = await requireAdminUser();

  await reviewRefundRequest(admin, {
    action: 'reject',
    refundRequestId,
  });

  revalidatePath('/admin/refunds');
  revalidatePath('/dashboard');
};
