import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { StatusService } from '../status/status.service';

@Module({
  controllers: [ConversationController],
  providers: [ConversationService, StatusService],
})
export class ConversationModule { }
