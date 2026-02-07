import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { AppGateway } from './app.gateway';
import { NotificationModule } from './resource/notification/notification.module';
import { EventsModule } from './resource/events/events.module';
import { ConversationModule } from './resource/conversation/conversation.module';
import { MessageModule } from './resource/message/message.module';
import { RedisModule } from './resource/redis/redis.module';
import { StatusModule } from './resource/status/status.module';
import { AiBotModule } from './resource/ai-bot/ai-bot.module';
import { AdminModule } from './resource/admin/admin.module';
import { AiModule } from './resource/ai/ai.module';
import { EmojiModule } from './resource/emoji/emoji.module';

@Module({
  imports: [
    RedisModule,
    StatusModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        redirect: false,
      },
    }),
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
    NotificationModule,
    EventsModule,
    ConversationModule,
    MessageModule,
    EmojiModule,
    AiBotModule,
    AdminModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EmailService,
    AppGateway,
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
