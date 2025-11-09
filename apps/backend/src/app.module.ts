import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { PrismaModule } from './resource/prisma/prisma.module';
import { authFactory } from '~/utils/auth';
import { UserModule } from './resource/user/user.module';
import { EmailModule } from './resource/email/email.module'
import { EmailService } from './resource/email/email.service'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './exception-filters/HttpExceptionFilter';

@Module({
  imports: [
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
        auth: authFactory(emailService)
      })
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, EmailService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
  ],
})
export class AppModule { }
