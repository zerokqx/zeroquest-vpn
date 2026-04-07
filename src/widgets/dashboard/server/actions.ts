'use server';

import { revalidatePath } from 'next/cache';
import { deleteAccessForUser } from '@/entities/access/server/delete-access';
import { requireCurrentUser } from '@/entities/user';

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
