export type PromoCodeDiscountType = 'fixed' | 'percent';

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  appliesToPlanIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPromoCodeInput {
  appliesToPlanIds: string[];
  code: string;
  description: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  expiresAt: string | null;
  isActive: boolean;
  usageLimit: number | null;
}
