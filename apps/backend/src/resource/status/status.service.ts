import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatusService {
    private readonly logger = new Logger(StatusService.name);
    private readonly PREFIX = 'u:s:';
    private readonly ONLINE_KEY = 'u:o:all';

    constructor(private readonly redis: RedisService) { }

    /**
     * 设置在线状态
     */
    async setOnline(userId: string) {
        try {
            await this.redis.client.pipeline()
                .set(`${this.PREFIX}${userId}`, '1', 'EX', 86400)
                .sadd(this.ONLINE_KEY, userId)
                .exec();
        } catch (error) {
            this.logger.error(`SetOnline Error: ${error.message}`);
        }
    }

    /**
     * 设置下线状态
     */
    async setOffline(userId: string) {
        try {
            await this.redis.client.pipeline()
                .del(`${this.PREFIX}${userId}`)
                .srem(this.ONLINE_KEY, userId)
                .exec();
        } catch (error) {
            this.logger.error(`SetOffline Error: ${error.message}`);
        }
    }

    /**
     * 获取单个用户状态
     */
    async getStatus(userId: string): Promise<boolean> {
        try {
            const res = await this.redis.client.exists(`${this.PREFIX}${userId}`);
            return res === 1;
        } catch (error) {
            this.logger.error(`Failed to fetch status for user ${userId}: ${error.message}`);
            return false;
        }
    }

    /**
     * 批量获取用户状态
     */
    async getStatuses(userIds: string[]): Promise<Record<string, boolean>> {
        if (!userIds.length) return {};
        try {
            const keys = userIds.map(id => `${this.PREFIX}${id}`);
            const results = await this.redis.client.mget(...keys);
            return userIds.reduce((acc, id, i) => {
                acc[id] = !!results[i];
                return acc;
            }, {});
        } catch (error) {
            this.logger.error(`Failed to fetch user statuses: ${error.message}`);
            return {};
        }
    }

    /**
     * 统计指定列表在线人数
     */
    async getOnlineStats(userIds: string[]) {
        const statuses = await this.getStatuses(userIds);
        const onlineCount = Object.values(statuses).filter(v => v).length;
        return {
            total: userIds.length,
            online: onlineCount,
            offline: userIds.length - onlineCount
        };
    }

    /**
     * 获取全网在线用户总数
     */
    async getGlobalOnlineCount(): Promise<number> {
        try {
            return await this.redis.client.scard(this.ONLINE_KEY);
        } catch (error) {
            this.logger.error(`Failed to get global online count: ${error.message}`);
            return 0;
        }
    }
}