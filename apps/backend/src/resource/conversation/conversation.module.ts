import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { StatusService } from '../status/status.service';
import { ConversationGateway } from './conversation.gateway';

@Module({
  controllers: [ConversationController],
  providers: [ConversationService, StatusService, ConversationGateway],
  exports: [ConversationService, ConversationGateway],
})
export class ConversationModule { }
