import type { PublicPlan } from '@/entities/plan/model/types';

export interface ClaimPlanRequest {
  planId: string;
  deviceName: string;
  customTrafficGb?: number;
  promoCode?: string;
}

export interface ClaimPlanResponse {
  accessRecordId: string;
  plan: PublicPlan;
  pricing: {
    finalPriceRub: number;
    originalPriceRub: number;
    promoCode: string | null;
  };
  client: {
    id: string;
    email: string;
    name: string;
    expiresAt: string;
    trafficLimitBytes: number | null;
    trafficLimitGb: number | null;
  };
  inbound: {
    id: number;
    remark: string;
    port: number;
    protocol: string;
  };
  access: {
    uri: string;
  };
}
