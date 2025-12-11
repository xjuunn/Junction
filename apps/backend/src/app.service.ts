import { PrismaTypes } from '@junction/types';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '~/resource/prisma/prisma.service';
import { EventBus } from './resource/events/event-bus.service';
@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) { }
  getHello(): string {
    return 'Hello World!';
  }
}
