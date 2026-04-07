import type { User } from '@/entities/user';
import type { ClaimPlanRequest, ClaimPlanResponse } from '../model/types';

export const claimPlan = async (
  input: ClaimPlanRequest & { user: User }
): Promise<ClaimPlanResponse> => {
  void input;

  throw new Error(
    'Прямая выдача VPN-ключа отключена. Сначала создайте и подтвердите платеж.'
  );
};
