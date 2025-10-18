import { PrismaClient } from '@prisma/client';

export const prisma: PrismaClient = global.prisma ?? new PrismaClient();