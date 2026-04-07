export interface Inbound {
  id: number;
  name: string;
  value: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertInboundInput {
  id: number;
  name: string;
  value: string;
  type: string;
  isActive: boolean;
}
