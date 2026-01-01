import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { StatusService } from '../status/status.service';

@Module({
  controllers: [UserController],
  providers: [UserService, StatusService],
})
export class UserModule { }
