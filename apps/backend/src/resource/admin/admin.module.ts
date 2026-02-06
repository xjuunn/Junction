import { Module } from '@nestjs/common'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { StatusModule } from '../status/status.module'

@Module({
  imports: [PrismaModule, StatusModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule { }
