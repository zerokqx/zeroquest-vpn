import { loadEnvConfig } from '@next/env';
import { defineConfig } from 'prisma/config';

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error('Missing required env variable: DATABASE_URL');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun run scripts/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
