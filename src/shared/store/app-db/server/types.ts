export interface DbUser {
  id: string;
  login: string;
  passwordHash: string;
  createdAt: string;
}

export interface DbAccessRecord {
  id: string;
  userId: string;
  planId: string;
  planTitle: string;
  planPriceRub: number;
  periodLabel: string;
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

export interface AppDb {
  users: DbUser[];
  accessRecords: DbAccessRecord[];
}
