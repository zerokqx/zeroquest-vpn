export type RefundRequestStatus =
  | 'failed'
  | 'rejected'
  | 'refund_pending'
  | 'refunded'
  | 'requested';

export interface RefundRequestPayload {
  displayName: string;
  errorMessage: string | null;
  planTitle: string;
  providerStatus: string | null;
  reason: string;
}

export interface RefundRequest {
  amount: number;
  createdAt: string;
  currency: string;
  displayName: string;
  errorMessage: string | null;
  id: string;
  paymentId: string;
  planTitle: string;
  provider: string;
  providerRefundId: string | null;
  providerStatus: string | null;
  purchaseAt: string | null;
  reason: string;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedByLogin: string | null;
  reviewedByUserId: string | null;
  status: RefundRequestStatus;
  updatedAt: string;
  userId: string;
  userLogin: string;
  vpnKeyId: string;
}

export interface CreateRefundRequestRecordInput {
  amount: number;
  currency: string;
  paymentId: string;
  payload: RefundRequestPayload;
  provider: string;
  purchaseAt: string | null;
  userId: string;
  vpnKeyId: string;
}
