import { betterAuth, type Auth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP } from 'better-auth/plugins'
import { passkey } from 'better-auth/plugins/passkey'
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
                    emailService.sendSignInOTPVerification(email, otp);
                } else if (type === "email-verification") {
                    emailService.sendSignUpOTPVerification(email, otp);
                } else if (type === 'forget-password') {
                    console.log("使用OTP找回密码", email, otp, type);
                }
            },
        }),
        passkey({
            rpID: process.env.SERVER_HOST!,
            rpName: process.env.APP_NAME!,
            origin: `${process.env.HTTP_TYPE}://${process.env.SERVER_HOST}:${process.env.FRONTEND_PORT}`,
            authenticatorSelection: {
                authenticatorAttachment: "platform",
                residentKey: "preferred",
                userVerification: "preferred",
            },
        }),
    ],
})