import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { PrismaModule } from './res/prisma/prisma.module';
import { authFactory } from '~/utils/auth';
import { UserModule } from './res/user/user.module';
import { EmailModule } from './res/email/email.module'
import { EmailService } from './res/email/email.service'

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
  providers: [AppService, EmailService],
})
export class AppModule { }
