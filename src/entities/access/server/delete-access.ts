import { deleteThreeXUiClient } from '@/shared/api/three-x-ui/server';
import {
  deleteAccessRecordByIdForUser,
  getAccessRecordByIdForUser,
} from './repository';

export const deleteAccessForUser = async (
  accessId: string,
  userId: string
): Promise<void> => {
  const accessRecord = await getAccessRecordByIdForUser(accessId, userId);

  if (!accessRecord) {
    throw new Error('Подключение не найдено');
  }

  await deleteThreeXUiClient(
    accessRecord.inboundId,
    accessRecord.threeXUiClientId
  );
  await deleteAccessRecordByIdForUser(accessId, userId);
};
