import { createAccessRecord } from '@/entities/access';
import { getPlanById, toPublicPlan } from '@/entities/plan';
import { getPromoCodeByCode, markPromoCodeAsUsed } from '@/entities/promo-code';
import type { User } from '@/entities/user';
import {
  addThreeXUiClient,
  getThreeXUiInbound,
} from '@/shared/api/three-x-ui/server';
import { threeXUiConfig } from '@/shared/config/env.server';
import { randomBytes, randomUUID } from 'node:crypto';
import type { ThreeXUiClient, ThreeXUiInbound } from '@/shared/api/three-x-ui/server/types';
import type { ClaimPlanRequest, ClaimPlanResponse } from '../model/types';
import {
  BYTES_IN_GIGABYTE,
  resolvePlanRuntimeSettings,
  sanitizeDeviceName,
} from '../model/runtime';

interface InboundSettingsPayload {
  clients?: Array<{
    flow?: string;
  }>;
}

interface RealitySettingsPayload {
  shortIds?: string[];
  serverNames?: string[];
  target?: string;
  settings?: {
    publicKey?: string;
    fingerprint?: string;
    serverName?: string;
    spiderX?: string;
  };
}

interface StreamSettingsPayload {
  network?: string;
  security?: string;
  realitySettings?: RealitySettingsPayload;
}

const randomToken = (size: number): string =>
  randomBytes(size)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, size)
    .toLowerCase();

const parseInboundSettings = (inbound: ThreeXUiInbound): InboundSettingsPayload =>
  JSON.parse(inbound.settings) as InboundSettingsPayload;

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
  name: string,
  inbound: ThreeXUiInbound,
  trafficLimitBytes: number | null,
  durationDays: number
): ThreeXUiClient => {
  const now = Date.now();

  return {
    id: randomUUID(),
    email: randomToken(8),
    enable: true,
    flow: getDefaultFlow(inbound),
    limitIp: 0,
    totalGB: trafficLimitBytes ?? 0,
    expiryTime: now + durationDays * 24 * 60 * 60 * 1000,
    subId: randomToken(16),
    reset: 0,
    comment: name,
    tgId: '',
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

const resolvePromoCode = async (
  promoCode: string | undefined,
  planId: string,
  originalPriceRub: number
): Promise<{
  finalPriceRub: number;
  promoCode: string | null;
  promoCodeId: string | null;
}> => {
  const trimmedPromoCode = promoCode?.trim();

  if (!trimmedPromoCode) {
    return {
      finalPriceRub: originalPriceRub,
      promoCode: null,
      promoCodeId: null,
    };
  }

  const resolvedPromoCode = await getPromoCodeByCode(trimmedPromoCode);

  if (!resolvedPromoCode) {
    throw new Error('Промокод не найден');
  }

  if (!resolvedPromoCode.isActive) {
    throw new Error('Промокод отключён');
  }

  if (
    resolvedPromoCode.expiresAt &&
    new Date(resolvedPromoCode.expiresAt).getTime() <= Date.now()
  ) {
    throw new Error('Срок действия промокода истёк');
  }

  if (
    resolvedPromoCode.usageLimit !== null &&
    resolvedPromoCode.usedCount >= resolvedPromoCode.usageLimit
  ) {
    throw new Error('Лимит использования промокода исчерпан');
  }

  if (
    resolvedPromoCode.appliesToPlanIds.length > 0 &&
    !resolvedPromoCode.appliesToPlanIds.includes(planId)
  ) {
    throw new Error('Промокод не подходит для выбранного тарифа');
  }

  const discountedPrice =
    resolvedPromoCode.discountType === 'percent'
      ? Math.round(
          originalPriceRub * (1 - resolvedPromoCode.discountValue / 100)
        )
      : originalPriceRub - resolvedPromoCode.discountValue;

  return {
    finalPriceRub: Math.max(0, discountedPrice),
    promoCode: resolvedPromoCode.code,
    promoCodeId: resolvedPromoCode.id,
  };
};

export const claimPlan = async (
  input: ClaimPlanRequest & { user: User }
): Promise<ClaimPlanResponse> => {
  const deviceName = sanitizeDeviceName(input.deviceName);
  const plan = await getPlanById(input.planId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (!plan.isActive) {
    throw new Error('Этот тариф сейчас недоступен');
  }

  const planRuntimeSettings = resolvePlanRuntimeSettings(
    plan,
    input.customTrafficGb,
    toPublicPlan
  );
  const inbound = await getThreeXUiInbound(plan.inboundId);
  const displayName = `${input.user.login} / ${deviceName}`;
  const pricing = await resolvePromoCode(
    input.promoCode,
    plan.id,
    planRuntimeSettings.priceRub
  );
  const client = buildClient(
    displayName,
    inbound,
    planRuntimeSettings.trafficLimitBytes,
    plan.durationDays
  );

  await addThreeXUiClient(plan.inboundId, client);
  const accessUri = buildVlessUri(inbound, client);

  const accessRecord = await createAccessRecord({
    userId: input.user.id,
    planId: plan.id,
    planTitle: plan.title,
    originalPriceRub: planRuntimeSettings.priceRub,
    finalPriceRub: pricing.finalPriceRub,
    planPriceRub: pricing.finalPriceRub,
    periodLabel: `${plan.durationDays} дней`,
    promoCode: pricing.promoCode,
    deviceName,
    displayName,
    threeXUiClientId: client.id,
    threeXUiEmail: client.email,
    inboundId: inbound.id,
    inboundRemark: inbound.remark,
    accessUri,
    expiresAt: new Date(client.expiryTime).toISOString(),
    trafficLimitBytes: planRuntimeSettings.trafficLimitBytes,
    speedLimitMbps: plan.speedLimitMbps,
  });

  if (pricing.promoCodeId) {
    await markPromoCodeAsUsed(pricing.promoCodeId);
  }

  return {
    accessRecordId: accessRecord.id,
    plan: planRuntimeSettings.publicPlan,
    pricing: {
      originalPriceRub: planRuntimeSettings.priceRub,
      finalPriceRub: pricing.finalPriceRub,
      promoCode: pricing.promoCode,
    },
    client: {
      id: client.id,
      email: client.email,
      name: client.comment,
      expiresAt: new Date(client.expiryTime).toISOString(),
      trafficLimitBytes: planRuntimeSettings.trafficLimitBytes,
      trafficLimitGb:
        planRuntimeSettings.trafficLimitBytes === null
          ? null
          : Math.round(planRuntimeSettings.trafficLimitBytes / BYTES_IN_GIGABYTE),
    },
    inbound: {
      id: inbound.id,
      remark: inbound.remark,
      port: inbound.port,
      protocol: inbound.protocol,
    },
    access: {
      uri: accessUri,
    },
  };
};
