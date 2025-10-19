import { betterAuth, type Auth, type BetterAuthOptions, type Adapter, email } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { EmailService } from '~/res/email/email.service'
import { prisma } from '~/utils/prisma'

export const authFactory = (emailService: EmailService) => betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'sqlite',
    }),
    basePath: "/auth",
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 6,
        requireEmailVerification: true
    },
    trustedOrigins: ["*"], // 危! 允许所有源
    emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
            await emailService.sendVerificationEmail(user.email, url)
        }
    },
})