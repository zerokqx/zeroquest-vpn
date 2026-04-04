import { PrismaPg } from '@prisma/adapter-pg';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const [{ PrismaClient }, { dataSecurityConfig, threeXUiConfig }, { encryptJson }] =
  await Promise.all([
    import('../generated/prisma/client'),
    import('../src/shared/config/env.server'),
    import('../src/shared/db/server/crypto'),
  ]);

const adapter = new PrismaPg({
  connectionString: dataSecurityConfig.databaseUrl,
});
const prisma = new PrismaClient({
  adapter,
});

const BYTES_IN_GIGABYTE = 1024 ** 3;

const defaultPlans = [
  {
    id: 'free-10gb-month',
    sortOrder: 0,
    slug: 'free',
    payload: {
      badge: 'Старт',
      ctaText: 'Получить бесплатно',
      description: 'Быстрый пробный доступ для знакомства с сервисом.',
      durationDays: threeXUiConfig.freePlanDurationDays,
      features: [
        `${threeXUiConfig.freePlanTrafficGb} GB трафика`,
        'общий защищённый профиль',
        'подключение за пару минут',
      ],
      highlight: 'Без оплаты',
      inboundId: threeXUiConfig.freePlanInboundId,
      isFeatured: false,
      priceRub: 0,
      slug: 'free',
      speedLimitMbps: null,
      title: 'Free',
      trafficLimitBytes:
        threeXUiConfig.freePlanTrafficGb * BYTES_IN_GIGABYTE,
    },
  },
  {
    id: 'extended-unlimited-month',
    sortOrder: 1,
    slug: 'extended',
    payload: {
      badge: 'Лучший выбор',
      ctaText: 'Подключить расширенный',
      description:
        'Приватный профиль с безлимитным трафиком и комфортной скоростью.',
      durationDays: threeXUiConfig.extendedPlanDurationDays,
      features: [
        'безлимитный трафик',
        `скорость до ${threeXUiConfig.extendedPlanSpeedMbps} Мбит/с`,
        'приватный маршрут ZeroQuest Приватный',
      ],
      highlight: 'Приватный канал',
      inboundId: threeXUiConfig.extendedPlanInboundId,
      isFeatured: true,
      priceRub: threeXUiConfig.extendedPlanPriceRub,
      slug: 'extended',
      speedLimitMbps: threeXUiConfig.extendedPlanSpeedMbps,
      title: 'Расширенный',
      trafficLimitBytes: null,
    },
  },
  {
    id: 'full-custom',
    sortOrder: 2,
    slug: 'full-custom',
    payload: {
      allowsCustomTraffic: true,
      badge: 'Гибкий',
      ctaText: 'Собрать свой объём',
      customPricePerGbRub: threeXUiConfig.customPlanPricePerGbRub,
      customTrafficMaxGb: threeXUiConfig.customPlanMaxTrafficGb,
      customTrafficMinGb: threeXUiConfig.customPlanMinTrafficGb,
      description: 'Конфигурация с выбором объёма трафика под ваше устройство.',
      durationDays: 30,
      features: [
        `от ${threeXUiConfig.customPlanMinTrafficGb} до ${threeXUiConfig.customPlanMaxTrafficGb} GB`,
        `${threeXUiConfig.customPlanPricePerGbRub} ₽ за 1 GB`,
        'приватный inbound Полный Кастом',
      ],
      highlight: 'Гигабайты под себя',
      inboundId: threeXUiConfig.customPlanInboundId,
      isFeatured: false,
      priceRub:
        threeXUiConfig.customPlanMinTrafficGb *
        threeXUiConfig.customPlanPricePerGbRub,
      slug: 'full-custom',
      speedLimitMbps: null,
      title: 'Полный кастом',
      trafficLimitBytes:
        threeXUiConfig.customPlanMinTrafficGb * BYTES_IN_GIGABYTE,
    },
  },
];

try {
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
          createdAt: now,
          id: plan.id,
          isActive: true,
          payload: encryptJson(plan.payload),
          slug: plan.slug,
          sortOrder: plan.sortOrder,
          updatedAt: now,
        },
      });
    }
  }

  console.log('Database seeded');
} finally {
  await prisma.$disconnect();
}
