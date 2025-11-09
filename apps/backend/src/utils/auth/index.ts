import { betterAuth, codec, type Auth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP } from 'better-auth/plugins'
import { passkey } from 'better-auth/plugins/passkey'
import { siwe } from 'better-auth/plugins'
import { generateRandomString } from 'better-auth/crypto'
import { verifyMessage, createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { EmailService } from '~/resource/email/email.service'
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
                    emailService.sendForgotPasswordOTPVerification(email, otp);
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
        siwe({
            domain: process.env.SERVER_HOST!,
            emailDomainName: process.env.SERVER_HOST!,
            anonymous: true,
            getNonce: async () => {
                return generateRandomString(32)
            },
            verifyMessage: async ({ message, signature, address }) => {
                try {
                    const isValid = await verifyMessage({
                        address: address as `0x${string}`,
                        message,
                        signature: signature as `0x${string}`,
                    })
                    return isValid
                } catch (err) {
                    console.error("⚠️ SIWE 验证失败:", err)
                    return false
                }
            },
            ensLookup: async ({ walletAddress }) => {
                try {
                    const client = createPublicClient({
                        chain: mainnet,
                        transport: http(),
                    })

                    const ensName = await client.getEnsName({
                        address: walletAddress as `0x${string}`,
                    })
                    const ensAvatar = ensName
                        ? await client.getEnsAvatar({ name: ensName })
                        : null

                    return {
                        name: ensName || walletAddress,
                        avatar: ensAvatar || "",
                    }
                } catch {
                    return {
                        name: walletAddress,
                        avatar: "",
                    }
                }
            },
        }),
    ],
})