import { betterAuth, type Auth, type BetterAuthOptions, type Adapter, email } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP } from 'better-auth/plugins'
import { EmailService } from '~/res/email/email.service'
import { prisma } from '~/utils/prisma'

export const authFactory = (emailService: EmailService): Auth => betterAuth({
    database: prismaAdapter(prisma, { provider: 'sqlite' }),
    basePath: "/auth",
    baseURL: `${process.env.HTTP_TYPE}://${process.env.SERVER_HOST}:${process.env.BACKEND_PORT}`,
    secret: process.env.AUTH_SECRET,
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 6,
        requireEmailVerification: true,
    },
    trustedOrigins: ["*"],
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "sign-in") {
                    console.log("使用OTP登录", email, otp, type);
                } else if (type === "email-verification") {
                    emailService.sendOTPVerification(email, otp);
                } else if (type === 'forget-password') {
                    console.log("使用OTP找回密码", email, otp, type);
                }
            },
        }),
    ],
})