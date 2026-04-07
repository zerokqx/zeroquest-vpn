import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { hashSync } from 'bcryptjs';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const [{ PrismaClient }, { dataSecurityConfig }, crypto] = await Promise.all([
  import('../generated/prisma/client'),
  import('../src/shared/config/env.server'),
  import('../src/shared/db/server/crypto'),
]);

const { createLookupHash, decryptJson, encryptJson } = crypto;

const adapter = new PrismaPg({
  connectionString: dataSecurityConfig.databaseUrl,
});
const prisma = new PrismaClient({
  adapter,
});

const BYTES_IN_GIGABYTE = 1024 ** 3;

interface LegacyPlanPayload {
  allowsCustomTraffic?: boolean;
  badge: string | null;
  ctaText: string;
  customPricePerGbRub?: number | null;
  customTrafficMaxGb?: number | null;
  customTrafficMinGb?: number | null;
  description: string;
  durationDays: number;
  features: string[];
  highlight: string | null;
  inboundId: number;
  isFeatured: boolean;
  priceRub: number;
  slug: string;
  speedLimitMbps: number | null;
  title: string;
  trafficLimitBytes: number | null;
}

interface LegacyAccessRecordPayload {
  accessUri: string;
  deviceName: string;
  displayName: string;
  finalPriceRub: number;
  inboundId: number;
  inboundRemark: string;
  originalPriceRub: number;
  periodLabel: string;
  planPriceRub: number;
  planTitle: string;
  promoCode: string | null;
  speedLimitMbps: number | null;
  threeXUiClientId: string;
  threeXUiEmail: string;
  trafficLimitBytes: number | null;
}

const generateStrongPassword = (): string =>
  `ZQ-${randomBytes(18).toString('base64url')}!9a`;

const ensureSchema = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT PRIMARY KEY,
      "role" TEXT NOT NULL,
      "login_lookup" TEXT NOT NULL UNIQUE,
      "payload" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "plans" (
      "id" TEXT PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT,
      "description" TEXT,
      "price_rub" INTEGER,
      "currency" TEXT,
      "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      "traffic_limit_bytes" BIGINT,
      "duration_days" INTEGER,
      "speed_limit_mbps" INTEGER,
      "allows_custom_traffic" BOOLEAN NOT NULL DEFAULT FALSE,
      "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
      "is_featured" BOOLEAN NOT NULL DEFAULT FALSE,
      "badge" TEXT,
      "cta_text" TEXT,
      "custom_price_per_gb_rub" INTEGER,
      "custom_traffic_max_gb" INTEGER,
      "custom_traffic_min_gb" INTEGER,
      "highlight" TEXT,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "payload" TEXT,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "title" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "description" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "price_rub" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "currency" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "traffic_limit_bytes" BIGINT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "duration_days" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "speed_limit_mbps" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "allows_custom_traffic" BOOLEAN NOT NULL DEFAULT FALSE`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT FALSE`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "badge" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "cta_text" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "custom_price_per_gb_rub" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "custom_traffic_max_gb" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "custom_traffic_min_gb" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "highlight" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "payload" TEXT`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "promo_codes" (
      "id" TEXT PRIMARY KEY,
      "code_lookup" TEXT NOT NULL UNIQUE,
      "payload" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "inbounds" (
      "id" INTEGER PRIMARY KEY,
      "name" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "plan_inbounds" (
      "plan_id" TEXT NOT NULL,
      "inbound_id" INTEGER NOT NULL,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("plan_id", "inbound_id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "payments" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "plan_id" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "provider_payment_id" TEXT,
      "status" TEXT NOT NULL,
      "fulfillment_status" TEXT NOT NULL DEFAULT 'pending',
      "amount" INTEGER NOT NULL,
      "currency" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "paid_at" TIMESTAMPTZ(3),
      "fulfilled_at" TIMESTAMPTZ(3),
      "last_checked_at" TIMESTAMPTZ(3),
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "vpn_keys" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "plan_id" TEXT NOT NULL,
      "payment_id" TEXT NOT NULL UNIQUE,
      "inbound_id" INTEGER NOT NULL,
      "key_value" TEXT NOT NULL,
      "traffic_limit_bytes" BIGINT,
      "payload" TEXT NOT NULL,
      "expires_at" TIMESTAMPTZ(3) NOT NULL,
      "issued_at" TIMESTAMPTZ(3) NOT NULL,
      "revoked_at" TIMESTAMPTZ(3)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "refund_requests" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "payment_id" TEXT NOT NULL UNIQUE,
      "vpn_key_id" TEXT NOT NULL UNIQUE,
      "reviewed_by_user_id" TEXT,
      "provider" TEXT NOT NULL,
      "provider_refund_id" TEXT UNIQUE,
      "status" TEXT NOT NULL,
      "amount" INTEGER NOT NULL,
      "currency" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewed_at" TIMESTAMPTZ(3),
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "access_records" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "plan_id" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expires_at" TIMESTAMPTZ(3) NOT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "access_records_user_id_created_at_idx"
      ON "access_records" ("user_id", "created_at")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "plan_inbounds_inbound_id_idx"
      ON "plan_inbounds" ("inbound_id")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_payment_id_key"
      ON "payments" ("provider_payment_id")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "payments_user_id_created_at_idx"
      ON "payments" ("user_id", "created_at")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "payments_user_id_provider_payment_id_idx"
      ON "payments" ("user_id", "provider_payment_id")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "payments_status_fulfillment_status_idx"
      ON "payments" ("status", "fulfillment_status")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "vpn_keys_user_id_issued_at_idx"
      ON "vpn_keys" ("user_id", "issued_at")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "vpn_keys_plan_id_idx"
      ON "vpn_keys" ("plan_id")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "vpn_keys_revoked_at_idx"
      ON "vpn_keys" ("revoked_at")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "refund_requests_user_id_requested_at_idx"
      ON "refund_requests" ("user_id", "requested_at")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "refund_requests_status_requested_at_idx"
      ON "refund_requests" ("status", "requested_at")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "refund_requests_reviewed_by_user_id_idx"
      ON "refund_requests" ("reviewed_by_user_id")
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plan_inbounds_plan_id_fkey'
      ) THEN
        ALTER TABLE "plan_inbounds"
          ADD CONSTRAINT "plan_inbounds_plan_id_fkey"
          FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plan_inbounds_inbound_id_fkey'
      ) THEN
        ALTER TABLE "plan_inbounds"
          ADD CONSTRAINT "plan_inbounds_inbound_id_fkey"
          FOREIGN KEY ("inbound_id") REFERENCES "inbounds"("id") ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_user_id_fkey'
      ) THEN
        ALTER TABLE "payments"
          ADD CONSTRAINT "payments_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_plan_id_fkey'
      ) THEN
        ALTER TABLE "payments"
          ADD CONSTRAINT "payments_plan_id_fkey"
          FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vpn_keys_user_id_fkey'
      ) THEN
        ALTER TABLE "vpn_keys"
          ADD CONSTRAINT "vpn_keys_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vpn_keys_plan_id_fkey'
      ) THEN
        ALTER TABLE "vpn_keys"
          ADD CONSTRAINT "vpn_keys_plan_id_fkey"
          FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vpn_keys_payment_id_fkey'
      ) THEN
        ALTER TABLE "vpn_keys"
          ADD CONSTRAINT "vpn_keys_payment_id_fkey"
          FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'vpn_keys_inbound_id_fkey'
      ) THEN
        ALTER TABLE "vpn_keys"
          ADD CONSTRAINT "vpn_keys_inbound_id_fkey"
          FOREIGN KEY ("inbound_id") REFERENCES "inbounds"("id") ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refund_requests_user_id_fkey'
      ) THEN
        ALTER TABLE "refund_requests"
          ADD CONSTRAINT "refund_requests_user_id_fkey"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refund_requests_reviewed_by_user_id_fkey'
      ) THEN
        ALTER TABLE "refund_requests"
          ADD CONSTRAINT "refund_requests_reviewed_by_user_id_fkey"
          FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refund_requests_payment_id_fkey'
      ) THEN
        ALTER TABLE "refund_requests"
          ADD CONSTRAINT "refund_requests_payment_id_fkey"
          FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refund_requests_vpn_key_id_fkey'
      ) THEN
        ALTER TABLE "refund_requests"
          ADD CONSTRAINT "refund_requests_vpn_key_id_fkey"
          FOREIGN KEY ("vpn_key_id") REFERENCES "vpn_keys"("id") ON DELETE RESTRICT;
      END IF;
    END
    $$;
  `);
};

const backfillPlans = async (): Promise<void> => {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      payload: string | null;
    }>
  >(
    `SELECT "id", "payload" FROM "plans" WHERE "payload" IS NOT NULL`
  );

  for (const row of rows) {
    if (!row.payload) {
      continue;
    }

    const payload = decryptJson<LegacyPlanPayload>(row.payload);

    await prisma.planStore.update({
      where: {
        id: row.id,
      },
      data: {
        allowsCustomTraffic: payload.allowsCustomTraffic ?? false,
        badge: payload.badge,
        ctaText: payload.ctaText,
        currency: 'RUB',
        customPricePerGbRub: payload.customPricePerGbRub ?? null,
        customTrafficMaxGb: payload.customTrafficMaxGb ?? null,
        customTrafficMinGb: payload.customTrafficMinGb ?? null,
        description: payload.description,
        durationDays: payload.durationDays,
        features: payload.features,
        highlight: payload.highlight,
        isFeatured: payload.isFeatured,
        priceRub: payload.priceRub,
        speedLimitMbps: payload.speedLimitMbps,
        title: payload.title,
        trafficLimitBytes:
          payload.trafficLimitBytes === null
            ? null
            : BigInt(payload.trafficLimitBytes),
        updatedAt: new Date(),
      },
    });

    const inboundId = payload.inboundId;

    if (inboundId > 0) {
      await prisma.inboundStore.upsert({
        where: {
          id: inboundId,
        },
        update: {},
        create: {
          createdAt: new Date(),
          id: inboundId,
          isActive: true,
          name: `Inbound ${inboundId}`,
          type: '3x-ui',
          updatedAt: new Date(),
          value: String(inboundId),
        },
      });

      await prisma.planInboundStore.upsert({
        where: {
          planId_inboundId: {
            inboundId,
            planId: row.id,
          },
        },
        update: {},
        create: {
          createdAt: new Date(),
          inboundId,
          planId: row.id,
          sortOrder: 0,
        },
      });
    }
  }
};

const deactivateZeroPricePlans = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    UPDATE "plans"
    SET
      "is_active" = FALSE,
      "updated_at" = CURRENT_TIMESTAMP
    WHERE
      COALESCE("price_rub", 0) <= 0
      AND "is_active" = TRUE
  `);
};

const backfillLegacyAccessRecords = async (): Promise<void> => {
  const tableState = await prisma.$queryRawUnsafe<
    Array<{ relationName: string | null }>
  >(
    `SELECT to_regclass('public.access_records')::text AS "relationName"`
  );

  if (!tableState[0]?.relationName) {
    return;
  }

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      created_at: Date;
      expires_at: Date;
      id: string;
      payload: string;
      plan_id: string;
      user_id: string;
    }>
  >(
    `SELECT "id", "user_id", "plan_id", "payload", "created_at", "expires_at" FROM "access_records"`
  );

  for (const row of rows) {
    const providerPaymentId = `legacy:${row.id}`;
    const existingPayment = await prisma.paymentStore.findFirst({
      where: {
        providerPaymentId,
      },
      select: {
        id: true,
      },
    });

    if (existingPayment) {
      continue;
    }

    const payload = decryptJson<LegacyAccessRecordPayload>(row.payload);

    await prisma.inboundStore.upsert({
      where: {
        id: payload.inboundId,
      },
      update: {},
      create: {
        createdAt: row.created_at,
        id: payload.inboundId,
        isActive: true,
        name: payload.inboundRemark || `Inbound ${payload.inboundId}`,
        type: '3x-ui',
        updatedAt: row.created_at,
        value: String(payload.inboundId),
      },
    });

    const paymentId = `legacy-payment:${row.id}`;
    const paymentPayload = encryptJson({
      confirmationUrl: null,
      customTrafficGb:
        payload.trafficLimitBytes === null
          ? null
          : Math.max(
              1,
              Math.round(payload.trafficLimitBytes / BYTES_IN_GIGABYTE)
            ),
      description: `Legacy access migration for ${payload.planTitle}`,
      deviceName: payload.deviceName,
      displayName: payload.displayName,
      failureReason: null,
      inboundId: payload.inboundId,
      paymentMethodType: 'legacy',
      planTitle: payload.planTitle,
      promoCode: payload.promoCode,
      promoCodeId: null,
      promoUsageApplied: false,
      providerStatus: 'succeeded',
      speedLimitMbps: payload.speedLimitMbps,
      trafficLimitBytes: payload.trafficLimitBytes,
      periodLabel: payload.periodLabel,
      originalPriceRub: payload.originalPriceRub,
      finalPriceRub: payload.finalPriceRub,
      durationDays: Math.max(
        1,
        Math.ceil(
          (row.expires_at.getTime() - row.created_at.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      ),
    });

    await prisma.paymentStore.create({
      data: {
        amount: payload.finalPriceRub,
        createdAt: row.created_at,
        currency: 'RUB',
        fulfilledAt: row.created_at,
        fulfillmentStatus: 'succeeded',
        id: paymentId,
        lastCheckedAt: row.created_at,
        paidAt: row.created_at,
        payload: paymentPayload,
        planId: row.plan_id,
        provider: 'legacy',
        providerPaymentId,
        status: 'succeeded',
        updatedAt: row.created_at,
        userId: row.user_id,
      },
    });

    await prisma.vpnKeyStore.create({
      data: {
        expiresAt: row.expires_at,
        id: row.id,
        inboundId: payload.inboundId,
        issuedAt: row.created_at,
        keyValue: encryptJson({
          value: payload.accessUri,
        }),
        payload: encryptJson({
          deviceName: payload.deviceName,
          displayName: payload.displayName,
          inboundRemark: payload.inboundRemark,
          threeXUiClientId: payload.threeXUiClientId,
          threeXUiEmail: payload.threeXUiEmail,
        }),
        paymentId,
        planId: row.plan_id,
        revokedAt: null,
        trafficLimitBytes:
          payload.trafficLimitBytes === null
            ? null
            : BigInt(payload.trafficLimitBytes),
        userId: row.user_id,
      },
    });
  }
};

const ensureAdminUser = async (): Promise<void> => {
  const adminLogin = dataSecurityConfig.adminDefaultLogin;
  const loginLookup = createLookupHash(adminLogin);
  const existingAdmin = await prisma.userStore.findUnique({
    where: {
      loginLookup,
    },
    select: {
      id: true,
    },
  });
  const adminPassword =
    dataSecurityConfig.adminDefaultPassword ??
    generateStrongPassword();

  if (!existingAdmin) {
    const now = new Date();

    await prisma.userStore.create({
      data: {
        createdAt: now,
        id: randomUUID(),
        loginLookup,
        payload: encryptJson({
          login: adminLogin,
          passwordHash: hashSync(adminPassword, 12),
        }),
        role: 'admin',
        updatedAt: now,
      },
    });
    console.log('');
    console.log('Admin user created.');
    console.log(`Login: ${adminLogin}`);
    console.log(`Password: ${adminPassword}`);
    console.log('Save this password now. It will not be stored in a local file.');
    console.log('');
  }
};

try {
  await prisma.$connect();
  await ensureSchema();
  await backfillPlans();
  await deactivateZeroPricePlans();
  await backfillLegacyAccessRecords();
  await ensureAdminUser();
  console.log('Database schema initialized');
} finally {
  await prisma.$disconnect();
}
