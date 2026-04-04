import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@generated/prisma/client';
import { dataSecurityConfig } from '@/shared/config/env.server';

const runtimeSymbol = Symbol.for('vpn-shop.prisma.runtime');
const runtimeState = globalThis as typeof globalThis & {
  [runtimeSymbol]?: PrismaClient;
};

export const getPrismaClient = (): PrismaClient => {
  if (runtimeState[runtimeSymbol]) {
    return runtimeState[runtimeSymbol];
  }

  const adapter = new PrismaPg({
    connectionString: dataSecurityConfig.databaseUrl,
  });
  const prisma = new PrismaClient({
    adapter,
  });

  runtimeState[runtimeSymbol] = prisma;

  return prisma;
};
