import type { Payment } from '@/entities/payment/model/types';
import type { VpnKeyRecord } from '@/entities/access/model/types';
import type { PaymentStatusResponse } from '../model/types';

const BYTES_IN_GIGABYTE = 1024 ** 3;

export const buildPaymentStatusResponse = (
  payment: Payment,
  vpnKey: VpnKeyRecord | null
): PaymentStatusResponse => ({
  payment: {
    amount: payment.amount,
    confirmationUrl: payment.payload.confirmationUrl,
    createdAt: payment.createdAt,
    currency: payment.currency,
    failureReason: payment.payload.failureReason,
    fulfillmentStatus: payment.fulfillmentStatus,
    paidAt: payment.paidAt,
    paymentId: payment.providerPaymentId ?? payment.id,
    planTitle: payment.payload.planTitle,
    status: payment.status,
  },
  vpnKey: vpnKey
    ? {
        displayName: vpnKey.displayName,
        expiresAt: vpnKey.expiresAt,
        id: vpnKey.id,
        keyValue: vpnKey.keyValue,
        trafficLimitBytes: vpnKey.trafficLimitBytes,
        trafficLimitGb:
          vpnKey.trafficLimitBytes === null
            ? null
            : Math.round(vpnKey.trafficLimitBytes / BYTES_IN_GIGABYTE),
      }
    : null,
});
