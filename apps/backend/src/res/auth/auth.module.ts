import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { auth } from './auth.config';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, {
    provide: "AUTH_INSTANCE",
    useValue: auth,
  }],
  exports: ["AUTH_INSTANCE"]
})
export class AuthModule { }
