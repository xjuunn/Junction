import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatusService {
    private readonly PREFIX = 'u:s:';
    private readonly ONLINE_KEY = 'u:o:all';

    constructor(private readonly redis: RedisService) { }

    /**
     * 原子化设置用户在线状态并加入全局活跃集合
     */
    async setOnline(userId: string) {
        await this.redis.client.pipeline()
            .set(`${this.PREFIX}${userId}`, '1', 'EX', 86400) // 设置24小时过期防止僵尸状态
            .sadd(this.ONLINE_KEY, userId)
            .exec();
    }

    /**
     * 原子化移除用户状态
     */
    async setOffline(userId: string) {
        await this.redis.client.pipeline()
            .del(`${this.PREFIX}${userId}`)
            .srem(this.ONLINE_KEY, userId)
            .exec();
    }

    /**
     * 批量获取用户在线状态
     */
    async getStatuses(userIds: string[]): Promise<Record<string, boolean>> {
        if (!userIds.length) return {};
        const keys = userIds.map(id => `${this.PREFIX}${id}`);
        const results = await this.redis.client.mget(...keys);
        return userIds.reduce((acc, id, i) => {
            acc[id] = !!results[i];
            return acc;
        }, {});
    }
}