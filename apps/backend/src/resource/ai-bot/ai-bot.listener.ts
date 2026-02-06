import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { AiBotService } from './ai-bot.service'
import type { MessageCreatedEvent } from '../events/event-types'

@Injectable()
export class AiBotListener {
  constructor(private readonly aiBotService: AiBotService) { }

  @OnEvent('message.created')
  async handleMessageCreated(payload: MessageCreatedEvent) {
    await this.aiBotService.handleMessageCreated(payload)
  }
}
