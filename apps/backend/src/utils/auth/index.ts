import { betterAuth, type Auth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { passkey } from 'better-auth/plugins/passkey'
import { admin, siwe, jwt, emailOTP, bearer } from 'better-auth/plugins'
import { generateRandomString } from 'better-auth/crypto'
import { verifyMessage, createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { EmailService } from '~/resource/email/email.service'
import { prisma } from '~/utils/prisma'

const isIpHost = (host: string): boolean => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)

const toHostname = (value?: string | null): string | null => {
  if (!value) return null
  if (value.startsWith('tauri://')) return 'localhost'
  try {
    return new URL(value).hostname || null
  } catch {
    return null
  }
}

const toOrigin = (value?: string | null): string | null => {
  if (!value) return null
  if (value.startsWith('tauri://')) return value
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const buildTrustedOrigins = () => {
  const httpType = process.env.NUXT_PUBLIC_HTTP_TYPE ?? 'http'
  const serverHost = process.env.NUXT_PUBLIC_SERVER_HOST ?? 'localhost'
  const frontendPort = process.env.NUXT_PUBLIC_FRONTEND_PORT ?? '3000'
  const backendPort = process.env.NUXT_PUBLIC_BACKEND_PORT ?? '8080'

  const rawOrigins = [
    `${httpType}://${serverHost}:${frontendPort}`,
    `${httpType}://localhost:${frontendPort}`,
    `${httpType}://127.0.0.1:${frontendPort}`,
    `${httpType}://localhost:${backendPort}`,
    `${httpType}://127.0.0.1:${backendPort}`,
    `${httpType}://${serverHost}:${backendPort}`,
    process.env.NUXT_PUBLIC_API_URL,
    process.env.PASSKEY_ORIGIN,
    'http://tauri.localhost',
    'tauri://localhost',
    'http://app.junct.dpdns.org',
    'https://app.junct.dpdns.org',
    'http://junct.dpdns.org',
    'https://junct.dpdns.org',
  ]

  const normalized = rawOrigins
    .map(origin => toOrigin(origin))
    .filter((origin): origin is string => !!origin)

  return [...new Set(normalized)]
}

const resolvePasskeyRpId = (trustedOrigins: string[], fallbackHost: string, httpType: string): string => {
  const configuredRpId = (process.env.PASSKEY_RP_ID || '').trim()
  if (configuredRpId) return configuredRpId

  const isDevLike = process.env.NODE_ENV !== 'production'

  // 开发环境下固定 localhost，避免误选 tauri.localhost 或变化中的内网 IP。
  if (isDevLike && httpType === 'http') {
    return 'localhost'
  }

  const preferredOriginHost = toHostname(process.env.PASSKEY_ORIGIN)
  if (preferredOriginHost) return preferredOriginHost

  const candidateHosts = trustedOrigins
    .map(origin => toHostname(origin))
    .filter((host): host is string => !!host)
    .filter(host => host !== 'localhost' && host !== '127.0.0.1' && host !== 'tauri.localhost' && !isIpHost(host))

  if (candidateHosts.length > 0) {
    return [...candidateHosts].sort((a, b) => a.split('.').length - b.split('.').length)[0]
  }

  if (fallbackHost === 'tauri.localhost') return 'localhost'
  if (isDevLike && isIpHost(fallbackHost)) return 'localhost'

  return fallbackHost
}

export const authFactory = (emailService: EmailService): Auth => {
  const httpType = process.env.NUXT_PUBLIC_HTTP_TYPE ?? 'http'
  const serverHost = process.env.NUXT_PUBLIC_SERVER_HOST ?? 'localhost'
  const backendPort = process.env.NUXT_PUBLIC_BACKEND_PORT ?? '8080'
  const isDevLike = process.env.NODE_ENV !== 'production'
  const trustedOrigins = buildTrustedOrigins()
  const passkeyRpId = resolvePasskeyRpId(trustedOrigins, serverHost, httpType)

  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'sqlite' }),
    basePath: '/auth',
    baseURL: `${httpType}://${serverHost}:${backendPort}`,
    secret: process.env.AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 6,
      requireEmailVerification: true,
    },
    trustedOrigins,
    advanced: {
      cookie: {
        domain: '',
        secure: false,
        sameSite: 'lax',
      },
      disableCSRFCheck: true,
      defaultCookieAttributes: {
        secure: process.env.NODE_ENV === 'production' || httpType === 'https',
      },
    },
    plugins: [
      jwt(),
      bearer(),
      admin(),
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          if (type === 'sign-in') {
            emailService.sendSignInOTPVerification(email, otp)
          } else if (type === 'email-verification') {
            emailService.sendSignUpOTPVerification(email, otp)
          } else if (type === 'forget-password') {
            emailService.sendForgotPasswordOTPVerification(email, otp)
          }
        },
      }),
      passkey({
        rpID: passkeyRpId,
        rpName: process.env.NUXT_PUBLIC_APP_NAME || 'Junction',
        // 开发环境下使用请求头中的 origin，避免 IP/localhost 切换导致校验失败。
        origin: isDevLike ? null : trustedOrigins,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      }),
      siwe({
        domain: process.env.NUXT_PUBLIC_SERVER_HOST!,
        emailDomainName: process.env.NUXT_PUBLIC_SERVER_HOST!,
        anonymous: true,
        getNonce: async () => generateRandomString(32),
        verifyMessage: async ({ message, signature, address }) => {
          try {
            return await verifyMessage({
              address: address as `0x${string}`,
              message,
              signature: signature as `0x${string}`,
            })
          } catch (err) {
            console.error('SIWE 验证失败:', err)
            return false
          }
        },
        ensLookup: async ({ walletAddress }) => {
          try {
            const client = createPublicClient({ chain: mainnet, transport: http() })
            const ensName = await client.getEnsName({ address: walletAddress as `0x${string}` })
            const ensAvatar = ensName ? await client.getEnsAvatar({ name: ensName }) : null
            return { name: ensName || walletAddress, avatar: ensAvatar || '' }
          } catch {
            return { name: walletAddress, avatar: '' }
          }
        },
      }),
    ],
  })
}

export type BetterAuthInstance = ReturnType<typeof betterAuth>
