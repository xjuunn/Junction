import { Module } from '@nestjs/common'
import { StatusService } from './status.service'
import { RedisModule } from '../redis/redis.module'

@Module({
    imports: [RedisModule],
    providers: [StatusService],
    exports: [StatusService],
})
export class StatusModule { }
