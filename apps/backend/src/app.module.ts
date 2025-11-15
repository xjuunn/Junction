import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { EmailModule } from './resource/email/email.module';
import { PrismaModule } from './resource/prisma/prisma.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { authFactory } from '~/utils/auth';
import { EmailService } from './resource/email/email.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './exception-filters/HttpExceptionFilter';
import { UserModule } from './resource/user/user.module';
import { FriendshipModule } from './resource/friendship/friendship.module';
import { UploadModule } from './resource/upload/upload.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
    }),

    UploadModule,
    ConfigModule.forRoot({
      envFilePath: join(__dirname, '../../../.env'),
      isGlobal: true,
    }),
    EmailModule,
    PrismaModule,
    AuthModule.forRootAsync({
      imports: [EmailModule],
      inject: [EmailService],
      useFactory: (emailService: EmailService) => ({
        auth: authFactory(emailService),
        disableGlobalAuthGuard: true,
        disableBodyParser: false,
        disableTrustedOriginsCors: false,
      })
    }),
    UserModule,
    FriendshipModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EmailService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    }
  ],
})
export class AppModule { }
