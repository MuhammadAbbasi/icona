import { PrismaClient } from '@prisma/client';
import { getTenantScopedClient } from './tenantPrisma';

const globalForPrisma = globalThis as unknown as { 
  systemPrisma: PrismaClient;
  prisma: any;
};

// 1. Create the base unscoped client
export const systemPrisma =
  globalForPrisma.systemPrisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] });

// 2. Create the scoped tenant client
export const prisma =
  globalForPrisma.prisma ??
  getTenantScopedClient(systemPrisma);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.systemPrisma = systemPrisma;
  globalForPrisma.prisma = prisma;
}
