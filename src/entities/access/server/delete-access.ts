import { deleteThreeXUiClient } from '@/shared/api/three-x-ui/server';
import {
  getAccessRecordByIdForUser,
  getVpnKeyByPaymentId,
  revokeVpnKeyByIdForUser,
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
  await revokeVpnKeyByIdForUser(accessId, userId);
};

export const revokeAccessForRefundByPaymentId = async (
  paymentId: string
): Promise<void> => {
  const vpnKey = await getVpnKeyByPaymentId(paymentId);

  if (!vpnKey) {
    throw new Error('Подключение не найдено');
  }

  if (vpnKey.revokedAt === null) {
    await deleteThreeXUiClient(vpnKey.inboundId, vpnKey.threeXUiClientId);
    await revokeVpnKeyByIdForUser(vpnKey.id, vpnKey.userId);
  }
};
