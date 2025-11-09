import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'prismaclient';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
        console.log('✅ Prisma connected');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        console.log('⚡ Prisma disconnected');
    }
}
