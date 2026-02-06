import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MessageModule } from '../message/message.module'
import { AiBotService } from './ai-bot.service'
import { AiBotController } from './ai-bot.controller'
import { AiBotListener } from './ai-bot.listener'

@Module({
  imports: [PrismaModule, MessageModule],
  controllers: [AiBotController],
  providers: [AiBotService, AiBotListener],
  exports: [AiBotService]
})
export class AiBotModule { }
