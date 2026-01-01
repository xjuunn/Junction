import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_KV, REDIS_PUB, REDIS_SUB } from './redis.constants';

@Injectable()
export class RedisService {
    constructor(
        @Inject(REDIS_KV) private readonly kv: Redis,
        @Inject(REDIS_PUB) private readonly pub: Redis,
        @Inject(REDIS_SUB) private readonly sub: Redis,
    ) { }

    /**
     * 获取基础 KV 存储实例
     */
    get client() {
        return this.kv;
    }

    /**
     * 获取 Pub 实例
     */
    get publisher() {
        return this.pub;
    }

    /**
     * 获取 Sub 实例
     */
    get subscriber() {
        return this.sub;
    }
}