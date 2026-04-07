import { createHash } from 'node:crypto';
import type { Payment } from '@/entities/payment/model/types';
import {
  addThreeXUiClient,
  getThreeXUiInbound,
  listThreeXUiInbounds,
} from '@/shared/api/three-x-ui/server';
import type {
  ThreeXUiClient,
  ThreeXUiInbound,
  ThreeXUiInboundListItem,
} from '@/shared/api/three-x-ui/server/types';
import { threeXUiConfig } from '@/shared/config/env.server';
import { logServerEvent } from '@/shared/logging/server/logger';
import type { VpnKeyRecord } from '../model/types';
import { createVpnKey, getVpnKeyByPaymentId } from './repository';

interface InboundSettingsPayload {
  clients?: Array<{
    email?: string;
    flow?: string;
    id?: string;
  }>;
}

interface RealitySettingsPayload {
  shortIds?: string[];
  serverNames?: string[];
  target?: string;
  settings?: {
    fingerprint?: string;
    publicKey?: string;
    serverName?: string;
    spiderX?: string;
  };
}

interface StreamSettingsPayload {
  network?: string;
  realitySettings?: RealitySettingsPayload;
  security?: string;
}

const deterministicToken = (seed: string, size: number): string =>
  createHash('sha256')
    .update(seed)
    .digest('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, size)
    .toLowerCase();

const parseInboundSettings = (inbound: ThreeXUiInbound): InboundSettingsPayload =>
  JSON.parse(inbound.settings) as InboundSettingsPayload;

const parseInboundListSettings = (
  inbound: ThreeXUiInboundListItem
): InboundSettingsPayload => {
  try {
    return JSON.parse(inbound.settings) as InboundSettingsPayload;
  } catch {
    return {};
  }
};

const parseStreamSettings = (inbound: ThreeXUiInbound): StreamSettingsPayload =>
  JSON.parse(inbound.streamSettings) as StreamSettingsPayload;

const getDefaultFlow = (inbound: ThreeXUiInbound): string => {
  const settings = parseInboundSettings(inbound);
  const clientWithExplicitFlow = settings.clients?.find((client) =>
    Boolean(client.flow?.trim())
  );

  return clientWithExplicitFlow?.flow ?? settings.clients?.[0]?.flow ?? '';
};

const buildClient = (
  paymentId: string,
  name: string,
  inbound: ThreeXUiInbound,
  trafficLimitBytes: number | null,
  durationDays: number
): ThreeXUiClient => {
  const now = Date.now();

  return {
    comment: name,
    email: deterministicToken(`${paymentId}:email`, 8),
    enable: true,
    expiryTime: now + durationDays * 24 * 60 * 60 * 1000,
    flow: getDefaultFlow(inbound),
    id: paymentId,
    limitIp: 0,
    reset: 0,
    subId: deterministicToken(`${paymentId}:sub`, 16),
    tgId: '',
    totalGB: trafficLimitBytes ?? 0,
  };
};

const buildVlessUri = (inbound: ThreeXUiInbound, client: ThreeXUiClient): string => {
  if (inbound.protocol !== 'vless') {
    throw new Error(`Unsupported inbound protocol: ${inbound.protocol}`);
  }

  const stream = parseStreamSettings(inbound);
  const reality = stream.realitySettings;
  const params = new URLSearchParams();

  params.set('type', stream.network || 'tcp');

  if (client.flow) {
    params.set('flow', client.flow);
  }

  if (stream.security) {
    params.set('security', stream.security);
  }

  if (stream.security === 'reality' && reality) {
    const fingerprint = reality.settings?.fingerprint || 'chrome';
    const publicKey = reality.settings?.publicKey;
    const serverName =
      reality.settings?.serverName ||
      reality.serverNames?.[0] ||
      reality.target?.split(':', 1)[0] ||
      '';
    const shortId = reality.shortIds?.find(Boolean) ?? '';
    const spiderX = reality.settings?.spiderX || '/';

    if (!publicKey) {
      throw new Error('Reality public key is missing on inbound');
    }

    params.set('pbk', publicKey);
    params.set('fp', fingerprint);

    if (serverName) {
      params.set('sni', serverName);
    }

    if (shortId) {
      params.set('sid', shortId);
    }

    params.set('spx', spiderX);
  }

  const label = encodeURIComponent(client.comment);

  return `vless://${client.id}@${threeXUiConfig.clientPublicHost}:${inbound.port}?${params.toString()}#${label}`;
};

export const issueVpnKeyForPayment = async (
  payment: Payment
): Promise<VpnKeyRecord> => {
  const existingKey = await getVpnKeyByPaymentId(payment.id);

  if (existingKey) {
    logServerEvent('info', 'access', 'vpn-key.reused-existing', {
      paymentId: payment.id,
      userId: payment.userId,
      vpnKeyId: existingKey.id,
    });
    return existingKey;
  }

  const inbound = await getThreeXUiInbound(payment.payload.inboundId);
  const client = buildClient(
    payment.id,
    payment.payload.displayName,
    inbound,
    payment.payload.trafficLimitBytes,
    payment.payload.durationDays
  );

  try {
    await addThreeXUiClient(inbound.id, client);
  } catch (error) {
    const inbounds = await listThreeXUiInbounds({
      timeoutMs: 2_000,
    });
    const targetInbound = inbounds.find((item) => item.id === inbound.id);
    const configuredClients = targetInbound
      ? parseInboundListSettings(targetInbound).clients ?? []
      : [];
    const hasExistingClient = configuredClients.some(
      (candidate) => candidate.id === client.id || candidate.email === client.email
    );

    if (!hasExistingClient) {
      throw error;
    }
  }

  const keyValue = buildVlessUri(inbound, client);
  const vpnKey = await createVpnKey({
    deviceName: payment.payload.deviceName,
    displayName: payment.payload.displayName,
    expiresAt: new Date(client.expiryTime).toISOString(),
    inboundId: inbound.id,
    inboundRemark: inbound.remark,
    keyValue,
    paymentId: payment.id,
    planId: payment.planId,
    threeXUiClientId: client.id,
    threeXUiEmail: client.email,
    trafficLimitBytes: payment.payload.trafficLimitBytes,
    userId: payment.userId,
  });

  logServerEvent('info', 'access', 'vpn-key.issued', {
    inboundId: inbound.id,
    paymentId: payment.id,
    userId: payment.userId,
    vpnKeyId: vpnKey.id,
  });

  return vpnKey;
};
