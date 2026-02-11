import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { McManagementAdapter } from './adapters/mc-management.adapter'
import { McServerController } from './mc-server.controller'
import { McServerGateway } from './mc-server.gateway'
import { McServerService } from './mc-server.service'

@Module({
  imports: [PrismaModule],
  controllers: [McServerController],
  providers: [McServerService, McManagementAdapter, McServerGateway],
  exports: [McServerService]
})
export class McServerModule { }
