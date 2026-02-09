import { Module } from '@nestjs/common';
import { CallGateway } from './call.gateway';
import { CallController } from './call.controller';
import { CallService } from './call.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CallController],
  providers: [CallService, CallGateway],
})
export class CallModule { }
