import type { PaymentStatusResponse } from '../model/types';

export const getPaymentStatusRequest = async (
  paymentId: string
): Promise<PaymentStatusResponse> => {
  const response = await fetch(`/api/payments/${paymentId}`, {
    cache: 'no-store',
    method: 'GET',
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(errorPayload?.error || 'Не удалось проверить статус платежа');
  }

  return (await response.json()) as PaymentStatusResponse;
};
