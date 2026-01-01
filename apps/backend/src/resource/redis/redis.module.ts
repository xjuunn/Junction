import { Global, Module, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_KV, REDIS_PUB, REDIS_SUB } from './redis.constants';

/**
 * 企业级 Redis 实例工厂：包含错误处理、重连策略和日志监控
 */
const createRedisFactory = (name: string) => {
    const logger = new Logger(`Redis:${name}`);

    const client = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        db: Number(process.env.REDIS_DB ?? 0),
        connectionName: `junction_${name}`,
        keepAlive: 10000,
        retryStrategy(times) {
            return Math.min(times * 100, 3000);
        },
        reconnectOnError(err) {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) return true;
            if (err.message.includes('ECONNRESET')) return true;
            return false;
        }
    });

    client.on('error', (err) => {
        if (err.message.includes('ECONNRESET')) {
            logger.warn('Connection reset by peer, attempting to reconnect...');
        } else {
            logger.error(`Critical Error: ${err.message}`);
        }
    });

    client.on('ready', () => {
        logger.log(`Redis [${name}] is ready.`);
    });

    return client;
};

@Global()
@Module({
    providers: [
        { provide: REDIS_KV, useFactory: () => createRedisFactory('KV') },
        { provide: REDIS_PUB, useFactory: () => createRedisFactory('PUB') },
        { provide: REDIS_SUB, useFactory: () => createRedisFactory('SUB') },
        RedisService,
    ],
    exports: [REDIS_KV, REDIS_PUB, REDIS_SUB, RedisService],
})
export class RedisModule { }