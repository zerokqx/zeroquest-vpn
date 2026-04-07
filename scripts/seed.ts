import { PrismaPg } from '@prisma/adapter-pg';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const [{ PrismaClient }, { dataSecurityConfig }] = await Promise.all([
  import('../generated/prisma/client'),
  import('../src/shared/config/env.server'),
]);

const adapter = new PrismaPg({
  connectionString: dataSecurityConfig.databaseUrl,
});
const prisma = new PrismaClient({
  adapter,
});

const BYTES_IN_GIGABYTE = 1024 ** 3;

const defaultInbounds = [
  {
    id: 1,
    isActive: true,
    name: 'ZeroQuest Private',
    type: '3x-ui',
    value: '1',
  },
  {
    id: 2,
    isActive: true,
    name: 'ZeroQuest Standard',
    type: '3x-ui',
    value: '2',
  },
  {
    id: 5,
    isActive: true,
    name: 'ZeroQuest Custom',
    type: '3x-ui',
    value: '5',
  },
];

const defaultPlans = [
  {
    allowsCustomTraffic: false,
    badge: 'Старт',
    ctaText: 'Оплатить стартовый',
    currency: 'RUB',
    customPricePerGbRub: null,
    customTrafficMaxGb: null,
    customTrafficMinGb: null,
    description: 'Базовый тариф для одного устройства без бесплатной раздачи.',
    durationDays: 30,
    features: [
      '30 GB трафика',
      'один приватный профиль',
      'ключ появляется после подтверждения оплаты',
    ],
    highlight: 'Платный старт без демо-режима',
    id: 'starter-30gb-month',
    inboundId: 2,
    isActive: true,
    isFeatured: false,
    priceRub: 149,
    slug: 'starter',
    sortOrder: 0,
    speedLimitMbps: null,
    title: 'Старт',
    trafficLimitBytes: 30 * BYTES_IN_GIGABYTE,
  },
  {
    allowsCustomTraffic: false,
    badge: 'Лучший выбор',
    ctaText: 'Оплатить расширенный',
    currency: 'RUB',
    customPricePerGbRub: null,
    customTrafficMaxGb: null,
    customTrafficMinGb: null,
    description:
      'Приватный профиль с безлимитным трафиком и предсказуемой скоростью.',
    durationDays: 30,
    features: [
      'безлимитный трафик',
      'скорость до 40 Мбит/с',
      'приватный маршрут ZeroQuest Private',
    ],
    highlight: 'Приватный канал',
    id: 'extended-unlimited-month',
    inboundId: 1,
    isActive: true,
    isFeatured: true,
    priceRub: 250,
    slug: 'extended',
    sortOrder: 1,
    speedLimitMbps: 40,
    title: 'Расширенный',
    trafficLimitBytes: null,
  },
  {
    allowsCustomTraffic: true,
    badge: 'Гибкий',
    ctaText: 'Собрать свой объём',
    currency: 'RUB',
    customPricePerGbRub: 15,
    customTrafficMaxGb: 200,
    customTrafficMinGb: 10,
    description: 'Конфигурация с оплатой только за нужный вам объём трафика.',
    durationDays: 30,
    features: [
      'от 10 до 200 GB',
      '15 ₽ за 1 GB',
      'приватный маршрут ZeroQuest Custom',
    ],
    highlight: 'Гигабайты под себя',
    id: 'full-custom',
    inboundId: 5,
    isActive: true,
    isFeatured: false,
    priceRub: 150,
    slug: 'full-custom',
    sortOrder: 2,
    speedLimitMbps: null,
    title: 'Полный кастом',
    trafficLimitBytes: 10 * BYTES_IN_GIGABYTE,
  },
];

try {
  for (const inbound of defaultInbounds) {
    const existingInbound = await prisma.inboundStore.findUnique({
      where: {
        id: inbound.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingInbound) {
      const now = new Date();

      await prisma.inboundStore.create({
        data: {
          createdAt: now,
          id: inbound.id,
          isActive: inbound.isActive,
          name: inbound.name,
          type: inbound.type,
          updatedAt: now,
          value: inbound.value,
        },
      });
    }
  }

  for (const plan of defaultPlans) {
    const existingPlan = await prisma.planStore.findUnique({
      where: {
        id: plan.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingPlan) {
      const now = new Date();

      await prisma.planStore.create({
        data: {
          allowsCustomTraffic: plan.allowsCustomTraffic,
          badge: plan.badge,
          createdAt: now,
          ctaText: plan.ctaText,
          currency: plan.currency,
          customPricePerGbRub: plan.customPricePerGbRub,
          customTrafficMaxGb: plan.customTrafficMaxGb,
          customTrafficMinGb: plan.customTrafficMinGb,
          description: plan.description,
          durationDays: plan.durationDays,
          features: plan.features,
          id: plan.id,
          isActive: plan.isActive,
          isFeatured: plan.isFeatured,
          highlight: plan.highlight,
          planInbounds: {
            create: {
              createdAt: now,
              inboundId: plan.inboundId,
              sortOrder: 0,
            },
          },
          priceRub: plan.priceRub,
          slug: plan.slug,
          sortOrder: plan.sortOrder,
          speedLimitMbps: plan.speedLimitMbps,
          title: plan.title,
          trafficLimitBytes:
            plan.trafficLimitBytes === null
              ? null
              : BigInt(plan.trafficLimitBytes),
          updatedAt: now,
        },
      });
    }
  }

  console.log('Database seeded');
} finally {
  await prisma.$disconnect();
}
