import type {
  PaymentFulfillmentStatus,
  PaymentStatus,
} from '@/entities/payment/model/types';

export interface CreatePaymentRequest {
  customTrafficGb?: number;
  deviceName: string;
  planId: string;
  promoCode?: string;
}

export interface CreatePaymentResponse {
  amount: number;
  confirmationUrl: string;
  currency: string;
  paymentId: string;
  planTitle: string;
  status: PaymentStatus;
}

export interface PaymentStatusResponse {
  payment: {
    amount: number;
    confirmationUrl: string | null;
    createdAt: string;
    currency: string;
    failureReason: string | null;
    fulfillmentStatus: PaymentFulfillmentStatus;
    paidAt: string | null;
    paymentId: string;
    planTitle: string;
    status: PaymentStatus;
  };
  vpnKey: null | {
    displayName: string;
    expiresAt: string;
    id: string;
    keyValue: string;
    trafficLimitBytes: number | null;
    trafficLimitGb: number | null;
  };
}
