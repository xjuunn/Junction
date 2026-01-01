import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { REDIS_KV, REDIS_PUB, REDIS_SUB } from './redis.constants';

const createRedis = () =>
    new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        db: Number(process.env.REDIS_DB ?? 0),
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
    });

@Global()
@Module({
    providers: [
        { provide: REDIS_KV, useFactory: createRedis },
        { provide: REDIS_PUB, useFactory: createRedis },
        { provide: REDIS_SUB, useFactory: createRedis },
        RedisService,
    ],
    exports: [REDIS_KV, REDIS_PUB, REDIS_SUB, RedisService],
})
export class RedisModule { }