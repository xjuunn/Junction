import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';
import type { BetterAuthInstance } from '~/utils/auth';

export const WsUser = createParamDecorator(
    async (_: unknown, ctx: ExecutionContext) => {
        const client: Socket = ctx.switchToWs().getClient();
        const authService = (client as any).betterAuthService;

        if (!authService) {
            Logger.error('[WsUser] 找不到BetterAuth服务。你在handleConnection中附加它了吗？', 'WsUserDecorator');
            return null;
        }

        try {
            const headers = new Headers();
            const cookie = client.handshake.headers.cookie;
            if (cookie) {
                headers.set('cookie', cookie);
            } else {
                return null;
            }
            const auth = (authService['auth'] ?? authService) as BetterAuthInstance;
            const session = await auth.api.getSession({
                headers,
            });

            return session?.user ?? null;
        } catch (err) {
            Logger.error(`[WsUser] Validation failed: ${err}`, 'WsUserDecorator');
            return null;
        }
    },
);