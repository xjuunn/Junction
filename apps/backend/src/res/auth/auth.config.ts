import { betterAuth, type Auth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '~/utils/prisma'

export const auth: Auth<{
    database: (options: any) => any
}> = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'sqlite',
    }),
})
