import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
    constructor(private readonly mailerService: MailerService) { }

    /**
     * 点击url验证邮箱
     * @param email 用户邮箱
     * @param url 回调url
     */
    async sendVerificationEmail(email: string, url: string) {
        await this.mailerService.sendMail({
            to: email,
            subject: '请验证您的邮箱地址',
            template: 'verify-email',
            context: {
                appName: 'Junction',
                url,
            },
        })
    }

    /**
     * 发送验证码验证邮箱
     * @param email 用户邮箱
     * @param code 验证码
     */
    async sendOTPVerification(email: string, code: string) {
        await this.mailerService.sendMail({
            to: email,
            subject: "请验证您的邮箱地址",
            template: 'verify-email-otp',
            context: {
                email,
                appName: 'Junction',
                code
            }
        })
    }
}