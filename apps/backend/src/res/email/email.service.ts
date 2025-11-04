import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
    constructor(private readonly mailerService: MailerService) { }

    /**
     * 发送邮箱
     * @param email 邮箱
     * @param subject 主题
     * @param template hbs模板文件名
     * @param data 模板数据
     */
    async send(email: string, subject: string, template: string, data: any) {
        await this.mailerService.sendMail({
            to: email,
            subject,
            template,
            context: {
                email,
                appName: process.env.APP_NAME,
                ...data
            }
        })
    }

    /**
     * 点击魔术链接验证
     * @param email 用户邮箱
     * @param url 回调url
     */
    async sendMagicLinkVerificationEmail(email: string, url: string) {
        await this.send(email, "验证您的邮箱地址", 'magic-link-verify', { url })
    }

    /**
     * 发送注册验证码
     * @param email 用户邮箱
     * @param code 验证码
     */
    async sendSignUpOTPVerification(email: string, code: string) {
        await this.send(email, "验证您的邮箱地址", 'signup-otp-verify', { code });
    }

    /**
     * 发送登录验证码
     * @param email 用户邮箱
     * @param code 验证码
     */
    async sendSignInOTPVerification(email: string, code: string) {
        await this.send(email, "验证您的邮箱地址", 'signin-otp-verify', { code });
    }
}