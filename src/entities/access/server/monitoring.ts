import { listThreeXUiInbounds } from '@/shared/api/three-x-ui/server';
import type {
  ThreeXUiClient,
  ThreeXUiInboundListItem,
} from '@/shared/api/three-x-ui/server/types';
import type { AccessRecordWithMonitoring } from '../model/types';
import { listAccessRecordsWithStatusByUserId } from './repository';

interface ParsedInboundSettings {
  clients?: ThreeXUiClient[];
}

interface ClientUsageSnapshot {
  downBytes: number;
  lastOnlineAt: string | null;
  remainingTrafficBytes: number | null;
  totalTrafficBytes: number | null;
  upBytes: number;
  usagePercent: number | null;
  usedTrafficBytes: number;
}

interface MonitoringRuntimeState {
  cachedUsageMap: Map<string, ClientUsageSnapshot>;
  cacheExpiresAt: number;
  inFlightPromise: Promise<Map<string, ClientUsageSnapshot>> | null;
  retryAfter: number;
}

const MONITORING_CACHE_TTL_MS = 15_000;
const MONITORING_FAILURE_COOLDOWN_MS = 30_000;
const MONITORING_TIMEOUT_MS = 1_500;
const runtimeStateSymbol = Symbol.for('vpn-shop.access-monitoring.runtime-state');
const globalRuntimeState = globalThis as typeof globalThis & {
  [runtimeStateSymbol]?: MonitoringRuntimeState;
};
const runtimeState = (globalRuntimeState[runtimeStateSymbol] ??= {
  cachedUsageMap: new Map<string, ClientUsageSnapshot>(),
  cacheExpiresAt: 0,
  inFlightPromise: null,
  retryAfter: 0,
}) satisfies MonitoringRuntimeState;

const parseInboundSettings = (
  inbound: ThreeXUiInboundListItem
): ParsedInboundSettings => {
  try {
    return JSON.parse(inbound.settings) as ParsedInboundSettings;
  } catch {
    return {};
  }
};

const loadUsageMap = async (): Promise<Map<string, ClientUsageSnapshot>> => {
  const usageMap = new Map<string, ClientUsageSnapshot>();
  let inbounds: ThreeXUiInboundListItem[];

  try {
    inbounds = await listThreeXUiInbounds({
      timeoutMs: MONITORING_TIMEOUT_MS,
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Unknown upstream error';

    console.error(
      `[access-monitoring] Unable to fetch live 3x-ui stats, using stored access data instead. Reason: ${reason}`
    );

    throw error;
  }

  for (const inbound of inbounds) {
    const configuredClients = parseInboundSettings(inbound).clients ?? [];
    const configuredById = new Map(
      configuredClients.map((client) => [client.id, client])
    );
    const configuredByEmail = new Map(
      configuredClients.map((client) => [client.email, client])
    );

    for (const stat of inbound.clientStats) {
      const configuredClient =
        configuredById.get(stat.uuid) ?? configuredByEmail.get(stat.email);
      const totalTrafficBytes =
        stat.total > 0
          ? stat.total
          : configuredClient && configuredClient.totalGB > 0
            ? configuredClient.totalGB
            : null;
      const usedTrafficBytes = stat.up + stat.down;
      const remainingTrafficBytes =
        totalTrafficBytes === null
          ? null
          : Math.max(totalTrafficBytes - usedTrafficBytes, 0);
      const usagePercent =
        totalTrafficBytes === null || totalTrafficBytes <= 0
          ? null
          : Math.min(
              100,
              Math.round((usedTrafficBytes / totalTrafficBytes) * 100)
            );
      const lastOnlineAt =
        stat.lastOnline > 0 ? new Date(stat.lastOnline).toISOString() : null;
      const snapshot: ClientUsageSnapshot = {
        downBytes: stat.down,
        lastOnlineAt,
        remainingTrafficBytes,
        totalTrafficBytes,
        upBytes: stat.up,
        usagePercent,
        usedTrafficBytes,
      };

      usageMap.set(stat.uuid, snapshot);
      usageMap.set(stat.email, snapshot);
    }
  }

  return usageMap;
};

const createUsageMap = async (): Promise<Map<string, ClientUsageSnapshot>> => {
  const now = Date.now();

  if (runtimeState.cacheExpiresAt > now) {
    return new Map(runtimeState.cachedUsageMap);
  }

  if (runtimeState.inFlightPromise) {
    return new Map(await runtimeState.inFlightPromise);
  }

  if (runtimeState.retryAfter > now) {
    return new Map(runtimeState.cachedUsageMap);
  }

  runtimeState.inFlightPromise = loadUsageMap()
    .then((usageMap) => {
      runtimeState.cachedUsageMap = usageMap;
      runtimeState.cacheExpiresAt = Date.now() + MONITORING_CACHE_TTL_MS;
      runtimeState.retryAfter = 0;

      return usageMap;
    })
    .catch(() => {
      runtimeState.retryAfter = Date.now() + MONITORING_FAILURE_COOLDOWN_MS;

      return runtimeState.cachedUsageMap;
    })
    .finally(() => {
      runtimeState.inFlightPromise = null;
    });

  return new Map(await runtimeState.inFlightPromise);
};

export const listAccessRecordsWithMonitoringByUserId = async (
  userId: string
): Promise<AccessRecordWithMonitoring[]> => {
  const [records, usageMap] = await Promise.all([
    listAccessRecordsWithStatusByUserId(userId),
    createUsageMap(),
  ]);

  return records.map((record) => {
    const usage =
      usageMap.get(record.threeXUiClientId) ??
      usageMap.get(record.threeXUiEmail) ?? {
        downBytes: 0,
        lastOnlineAt: null,
        remainingTrafficBytes:
          record.trafficLimitBytes === null ? null : record.trafficLimitBytes,
        totalTrafficBytes: record.trafficLimitBytes,
        upBytes: 0,
        usagePercent: 0,
        usedTrafficBytes: 0,
      };

    return {
      ...record,
      ...usage,
    };
  });
};
