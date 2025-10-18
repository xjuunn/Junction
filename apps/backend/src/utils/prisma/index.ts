import { PrismaClient } from 'prismaclient'

export const prisma: PrismaClient
    = global.prisma ?? new PrismaClient();