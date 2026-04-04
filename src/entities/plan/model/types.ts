export interface Plan {
  allowsCustomTraffic: boolean;
  id: string;
  slug: string;
  title: string;
  description: string;
  priceRub: number;
  trafficLimitBytes: number | null;
  durationDays: number;
  speedLimitMbps: number | null;
  features: string[];
  inboundId: number;
  isFree: boolean;
  isActive: boolean;
  isFeatured: boolean;
  badge: string | null;
  ctaText: string;
  customPricePerGbRub: number | null;
  customTrafficMaxGb: number | null;
  customTrafficMinGb: number | null;
  highlight: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicPlan {
  allowsCustomTraffic: boolean;
  id: string;
  slug: string;
  title: string;
  description: string;
  priceRub: number;
  periodLabel: string;
  badge: string | null;
  ctaText: string;
  customPricePerGbRub: number | null;
  customTrafficMaxGb: number | null;
  customTrafficMinGb: number | null;
  highlight: string | null;
  trafficLimitBytes: number | null;
  durationDays: number;
  trafficLimitGb: number | null;
  speedLimitMbps: number | null;
  features: string[];
  isFree: boolean;
  isFeatured: boolean;
}

export interface UpsertPlanInput {
  allowsCustomTraffic?: boolean;
  badge: string | null;
  ctaText: string;
  customPricePerGbRub?: number | null;
  customTrafficMaxGb?: number | null;
  customTrafficMinGb?: number | null;
  description: string;
  durationDays: number;
  features: string[];
  highlight: string | null;
  inboundId: number;
  isActive: boolean;
  isFeatured: boolean;
  priceRub: number;
  slug: string;
  speedLimitMbps: number | null;
  title: string;
  trafficLimitBytes: number | null;
}
