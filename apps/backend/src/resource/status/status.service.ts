import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatusService {
    private readonly logger = new Logger(StatusService.name);
    private readonly PREFIX = 'u:s:';
    private readonly ONLINE_KEY = 'u:o:all';

    constructor(private readonly redis: RedisService) { }

    /**
     * 设置在线状态：增加 try-catch 保证 Redis 故障不阻塞 WebSocket 主流程
     */
    async setOnline(userId: string) {
        try {
            await this.redis.client.pipeline()
                .set(`${this.PREFIX}${userId}`, '1', 'EX', 86400)
                .sadd(this.ONLINE_KEY, userId)
                .exec();
        } catch (error) {
            this.logger.error(`Failed to set online status for user ${userId}: ${error.message}`);
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
            this.logger.error(`Failed to set offline status for user ${userId}: ${error.message}`);
        }
    }

    /**
     * 批量获取状态：失败时回退到全员离线，保证 UI 不报错
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
}