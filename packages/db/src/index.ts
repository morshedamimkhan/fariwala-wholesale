import { PrismaClient } from '@prisma/client';

let prismaClientSingleton: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClientSingleton) {
    prismaClientSingleton = new PrismaClient();
  }
  return prismaClientSingleton;
}

export type { Prisma, Tenant, User, Product } from '@prisma/client';