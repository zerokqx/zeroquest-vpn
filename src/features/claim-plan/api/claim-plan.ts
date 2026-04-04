import type { ClaimPlanRequest, ClaimPlanResponse } from '../model/types';

export const claimPlanRequest = async (
  payload: ClaimPlanRequest
): Promise<ClaimPlanResponse> => {
  const response = await fetch('/api/access/claim', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(errorPayload?.error || 'Не удалось выдать доступ');
  }

  return (await response.json()) as ClaimPlanResponse;
};
