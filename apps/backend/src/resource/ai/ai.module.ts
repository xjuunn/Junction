import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MessageModule } from '../message/message.module'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'

@Module({
  imports: [PrismaModule, MessageModule],
  controllers: [AiController],
  providers: [AiService]
})
export class AiModule { }
