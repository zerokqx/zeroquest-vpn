import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
} from '../model/types';

export const createPaymentRequest = async (
  payload: CreatePaymentRequest
): Promise<CreatePaymentResponse> => {
  const response = await fetch('/api/payments', {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(errorPayload?.error || 'Не удалось создать платеж');
  }

  return (await response.json()) as CreatePaymentResponse;
};
