export interface AccessRecord {
  id: string;
  userId: string;
  planId: string;
  planTitle: string;
  originalPriceRub: number;
  finalPriceRub: number;
  planPriceRub: number;
  periodLabel: string;
  promoCode: string | null;
  deviceName: string;
  displayName: string;
  threeXUiClientId: string;
  threeXUiEmail: string;
  inboundId: number;
  inboundRemark: string;
  accessUri: string;
  createdAt: string;
  expiresAt: string;
  trafficLimitBytes: number | null;
  speedLimitMbps: number | null;
}

export interface AccessRecordWithStatus extends AccessRecord {
  isActive: boolean;
}

export interface AccessRecordWithMonitoring extends AccessRecordWithStatus {
  downBytes: number;
  lastOnlineAt: string | null;
  remainingTrafficBytes: number | null;
  totalTrafficBytes: number | null;
  upBytes: number;
  usagePercent: number | null;
  usedTrafficBytes: number;
}
