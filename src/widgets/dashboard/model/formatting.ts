import type { PublicPlan } from '@/entities/plan/model/types';

const utcDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
  year: 'numeric',
});

const utcDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
  year: 'numeric',
});

export const formatBytes = (value: number | null): string => {
  if (value === null) {
    return 'Безлимит';
  }

  if (value >= 1024 ** 3) {
    return `${(value / 1024 ** 3).toFixed(value >= 10 * 1024 ** 3 ? 0 : 1)} GB`;
  }

  if (value >= 1024 ** 2) {
    return `${Math.round(value / 1024 ** 2)} MB`;
  }

  return `${value} B`;
};

export const formatPlanPrice = (plan: PublicPlan): string => {
  if (plan.allowsCustomTraffic) {
    return `от ${plan.priceRub} ₽`;
  }

  return plan.priceRub === 0 ? '0 ₽' : `${plan.priceRub} ₽`;
};

export const formatUtcDate = (value: string): string =>
  utcDateFormatter.format(new Date(value));

export const formatUtcDateTime = (value: string): string =>
  `${utcDateTimeFormatter.format(new Date(value))} UTC`;

export const formatLastOnline = (value: string | null): string =>
  value ? formatUtcDateTime(value) : 'Нет активности';
