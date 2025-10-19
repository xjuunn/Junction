import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
// import { AuthModule } from './res/auth/auth.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { PrismaModule } from './res/prisma/prisma.module';
import { auth } from '~/utils/auth';
import { UserModule } from './res/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: join(__dirname, '../../../.env'),
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule.forRoot({ auth }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
