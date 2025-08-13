import { PrismaClient } from '@prisma/client';
let prismaClientSingleton = null;
export function getPrismaClient() {
    if (!prismaClientSingleton) {
        prismaClientSingleton = new PrismaClient();
    }
    return prismaClientSingleton;
}
