export interface ThreeXUiUpstreamResponse<T = unknown> {
  success: boolean;
  msg: string;
  obj: T | null;
}

export interface ThreeXUiSessionSnapshot {
  authenticated: boolean;
  authenticatedAt: string | null;
}

export interface ThreeXUiClient {
  id: string;
  email: string;
  enable: boolean;
  flow: string;
  limitIp: number;
  totalGB: number;
  expiryTime: number;
  subId: string;
  reset: number;
  comment: string;
  tgId: string;
}

export interface ThreeXUiInbound {
  id: number;
  remark: string;
  enable: boolean;
  port: number;
  protocol: string;
  settings: string;
  streamSettings: string;
}

export interface ThreeXUiClientStat {
  id: number;
  inboundId: number;
  enable: boolean;
  email: string;
  uuid: string;
  subId: string;
  up: number;
  down: number;
  allTime: number;
  expiryTime: number;
  total: number;
  reset: number;
  lastOnline: number;
}

export interface ThreeXUiInboundListItem extends ThreeXUiInbound {
  up: number;
  down: number;
  total: number;
  allTime: number;
  expiryTime: number;
  trafficReset: string;
  lastTrafficResetTime: number;
  clientStats: ThreeXUiClientStat[];
}
