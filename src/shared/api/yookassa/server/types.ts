export interface YooKassaAmount {
  currency: string;
  value: string;
}

export interface YooKassaConfirmation {
  confirmation_token?: string;
  confirmation_url?: string;
  type: string;
}

export interface YooKassaCancellationDetails {
  party: string;
  reason: string;
}

export interface YooKassaPaymentMethod {
  id?: string;
  type?: string;
}

export interface YooKassaPayment {
  amount: YooKassaAmount;
  cancellation_details?: YooKassaCancellationDetails;
  confirmation?: YooKassaConfirmation;
  created_at: string;
  description?: string;
  id: string;
  metadata?: Record<string, string>;
  paid: boolean;
  payment_method?: YooKassaPaymentMethod;
  status: 'canceled' | 'pending' | 'succeeded' | 'waiting_for_capture';
}

export interface YooKassaRefund {
  amount: YooKassaAmount;
  cancellation_details?: YooKassaCancellationDetails;
  created_at: string;
  description?: string;
  id: string;
  payment_id: string;
  status: 'canceled' | 'pending' | 'succeeded';
}
