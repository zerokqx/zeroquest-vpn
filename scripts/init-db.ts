import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { hashSync } from 'bcryptjs';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const [{ PrismaClient }, { dataSecurityConfig }, { createLookupHash, encryptJson }] = await Promise.all([
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

const generateStrongPassword = (): string =>
  `ZQ-${randomBytes(18).toString('base64url')}!9a`;

try {
  await prisma.$connect();

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
      "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "payload" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
    CREATE TABLE IF NOT EXISTS "access_records" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "plan_id" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expires_at" TIMESTAMPTZ(3) NOT NULL,
      CONSTRAINT "access_records_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "access_records_user_id_created_at_idx"
      ON "access_records" ("user_id", "created_at")
  `);

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

  console.log('Database schema initialized');
} finally {
  await prisma.$disconnect();
}
