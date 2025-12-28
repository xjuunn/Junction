export interface APP {
    name: string;
}

export type { Prisma } from '@prisma/client'
export * from '@prisma/client'

/** Prisma 类型 */
export type * as PrismaTypes from 'prismaclient';
export * as PrismaValues from 'prismaclient';
export * from './api-response';