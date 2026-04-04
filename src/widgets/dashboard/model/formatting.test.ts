import { describe, expect, it } from 'vitest';
import type { PublicPlan } from '../../../entities/plan/model/types';
import {
  formatBytes,
  formatLastOnline,
  formatPlanPrice,
  formatUtcDate,
  formatUtcDateTime,
} from './formatting';

const basePlan: PublicPlan = {
  allowsCustomTraffic: false,
  badge: 'Старт',
  ctaText: 'Подключить',
  customPricePerGbRub: null,
  customTrafficMaxGb: null,
  customTrafficMinGb: null,
  description: 'Описание',
  durationDays: 30,
  features: ['10 GB'],
  highlight: '10 GB',
  id: 'free-plan',
  isFeatured: false,
  isFree: true,
  periodLabel: '30 дней',
  priceRub: 0,
  slug: 'free',
  speedLimitMbps: null,
  title: 'Free',
  trafficLimitBytes: 10 * 1024 ** 3,
  trafficLimitGb: 10,
};

describe('dashboard formatting', () => {
  it('formats bytes and unlimited values', () => {
    expect(formatBytes(null)).toBe('Безлимит');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB');
    expect(formatBytes(12 * 1024 ** 3)).toBe('12 GB');
  });

  it('formats plan prices', () => {
    expect(formatPlanPrice(basePlan)).toBe('0 ₽');
    expect(
      formatPlanPrice({
        ...basePlan,
        allowsCustomTraffic: true,
        priceRub: 150,
      })
    ).toBe('от 150 ₽');
  });

  it('formats utc dates', () => {
    const value = '2026-04-02T11:00:00.000Z';

    expect(formatUtcDate(value)).toBe('02.04.2026');
    expect(formatUtcDateTime(value)).toBe('02.04.2026, 11:00 UTC');
  });

  it('formats last online state', () => {
    expect(formatLastOnline(null)).toBe('Нет активности');
  });
});
