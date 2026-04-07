import { revokeAccessForRefundByPaymentId } from '@/entities/access';
import { getPaymentById } from '@/entities/payment';
import {
  getRefundRequestById,
  updateRefundRequestState,
} from '@/entities/refund-request';
import type { User } from '@/entities/user/model/types';
import {
  createYooKassaRefund,
  type YooKassaRefund,
} from '@/shared/api/yookassa/server';
import {
  logServerError,
  logServerEvent,
} from '@/shared/logging/server/logger';

const toRefundRequestStatus = (
  refund: YooKassaRefund
): 'failed' | 'refund_pending' | 'refunded' =>
  refund.status === 'succeeded'
    ? 'refunded'
    : refund.status === 'pending'
      ? 'refund_pending'
      : 'failed';

export const reviewRefundRequest = async (
  admin: User,
  input: {
    action: 'approve' | 'reject';
    refundRequestId: string;
  }
) => {
  const refundRequestId = input.refundRequestId.trim();

  if (!refundRequestId) {
    throw new Error('Запрос на возврат не найден');
  }

  const refundRequest = await getRefundRequestById(refundRequestId);

  if (!refundRequest) {
    throw new Error('Запрос на возврат не найден');
  }

  if (
    refundRequest.status !== 'requested' &&
    !(input.action === 'approve' && refundRequest.status === 'failed')
  ) {
    throw new Error('Этот запрос уже обработан');
  }

  if (input.action === 'reject') {
    logServerEvent('info', 'refunds', 'refund.request.rejected', {
      adminId: admin.id,
      refundRequestId,
    });

    return await updateRefundRequestState(refundRequestId, {
      errorMessage: null,
      reviewedAt: new Date(),
      reviewedByUserId: admin.id,
      status: 'rejected',
    });
  }

  const payment = await getPaymentById(refundRequest.paymentId);

  if (!payment || !payment.providerPaymentId) {
    throw new Error('Платеж для возврата не найден');
  }

  try {
    const providerRefund = await createYooKassaRefund({
      amount: refundRequest.amount,
      currency: refundRequest.currency,
      description: `Возврат ${refundRequest.planTitle} / ${refundRequest.displayName}`.slice(
        0,
        128
      ),
      idempotenceKey: refundRequest.id,
      providerPaymentId: payment.providerPaymentId,
    });

    const updatedRequest = await updateRefundRequestState(refundRequestId, {
      errorMessage:
        providerRefund.status === 'canceled'
          ? 'ЮKassa отклонила возврат'
          : null,
      providerRefundId: providerRefund.id,
      providerStatus: providerRefund.status,
      reviewedAt: new Date(),
      reviewedByUserId: admin.id,
      status: toRefundRequestStatus(providerRefund),
    });

    if (providerRefund.status !== 'canceled') {
      try {
        await revokeAccessForRefundByPaymentId(refundRequest.paymentId);
      } catch (error) {
        logServerError('refunds', 'refund.request.access-revoke-failed', error, {
          adminId: admin.id,
          paymentId: refundRequest.paymentId,
          refundRequestId,
        });
      }
    }

    logServerEvent('info', 'refunds', 'refund.request.approved', {
      adminId: admin.id,
      providerRefundId: providerRefund.id,
      providerStatus: providerRefund.status,
      refundRequestId,
      status: updatedRequest.status,
    });

    return updatedRequest;
  } catch (error) {
    logServerError('refunds', 'refund.request.approve-failed', error, {
      adminId: admin.id,
      refundRequestId,
    });

    return await updateRefundRequestState(refundRequestId, {
      errorMessage:
        error instanceof Error ? error.message : 'Не удалось оформить возврат',
      reviewedAt: new Date(),
      reviewedByUserId: admin.id,
      status: 'failed',
    });
  }
};
