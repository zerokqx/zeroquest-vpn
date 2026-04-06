import type { AccessRecordWithMonitoring } from '@/entities/access/model/types';

export interface DashboardSummary {
  activeDevices: number;
  hasUnlimitedRecords: boolean;
  nextExpiry: AccessRecordWithMonitoring | null;
  totalRemainingBytes: number;
  totalUsedBytes: number;
}

export const buildDashboardSummary = (
  records: AccessRecordWithMonitoring[]
): DashboardSummary => {
  const activeRecords = records.filter((record) => record.isActive);
  const limitedRecords = records.filter(
    (record) => record.remainingTrafficBytes !== null
  );

  return {
    activeDevices: activeRecords.length,
    hasUnlimitedRecords: records.some(
      (record) => record.remainingTrafficBytes === null
    ),
    nextExpiry:
      [...activeRecords].sort(
        (left, right) =>
          new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime()
      )[0] ?? null,
    totalRemainingBytes: limitedRecords.reduce(
      (sum, record) => sum + (record.remainingTrafficBytes ?? 0),
      0
    ),
    totalUsedBytes: records.reduce(
      (sum, record) => sum + record.usedTrafficBytes,
      0
    ),
  };
};
