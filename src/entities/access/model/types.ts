export interface VpnKeyRecord {
  id: string;
  userId: string;
  planId: string;
  paymentId: string;
  deviceName: string;
  displayName: string;
  threeXUiClientId: string;
  threeXUiEmail: string;
  inboundId: number;
  inboundRemark: string;
  keyValue: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  trafficLimitBytes: number | null;
}

export interface AccessRecord {
  id: string;
  userId: string;
  planId: string;
  paymentId: string;
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
