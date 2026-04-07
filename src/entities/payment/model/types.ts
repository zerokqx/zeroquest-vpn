export type PaymentProvider = 'legacy' | 'yookassa';

export type PaymentStatus =
  | 'canceled'
  | 'failed'
  | 'pending'
  | 'succeeded'
  | 'waiting_for_capture';

export type PaymentFulfillmentStatus =
  | 'failed'
  | 'pending'
  | 'processing'
  | 'succeeded';

export interface PaymentPayload {
  confirmationUrl: string | null;
  customTrafficGb: number | null;
  description: string;
  deviceName: string;
  displayName: string;
  durationDays: number;
  failureReason: string | null;
  finalPriceRub: number;
  inboundId: number;
  originalPriceRub: number;
  paymentMethodType: string | null;
  periodLabel: string;
  planTitle: string;
  promoCode: string | null;
  promoCodeId: string | null;
  promoUsageApplied: boolean;
  providerStatus: string | null;
  speedLimitMbps: number | null;
  trafficLimitBytes: number | null;
}

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  status: PaymentStatus;
  fulfillmentStatus: PaymentFulfillmentStatus;
  amount: number;
  currency: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payload: PaymentPayload;
}

export interface CreatePaymentRecordInput {
  amount: number;
  currency: string;
  payload: PaymentPayload;
  planId: string;
  provider: PaymentProvider;
  userId: string;
}
