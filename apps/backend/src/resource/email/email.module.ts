import { Module } from '@nestjs/common'
import { MailerModule } from '@nestjs-modules/mailer'
import { EmailService } from './email.service'
import * as path from 'path'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
    imports: [
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                transport: {
                    host: config.get('MAIL_HOST'),
                    port: Number(config.get('MAIL_PORT')),
                    secure: true,
                    auth: {
                        user: config.get('MAIL_USER'),
                        pass: config.get('MAIL_PASS'),
                    },
                },
                defaults: {
                    from: config.get('MAIL_FROM'),
                },
                template: {
                    dir: path.join(process.cwd(), 'src/templates/email'),
                    adapter: new HandlebarsAdapter(),
                    options: { strict: true },
                },
            })
        }),
    ],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule { }
