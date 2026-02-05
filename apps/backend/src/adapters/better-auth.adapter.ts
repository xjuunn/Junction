import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { BetterAuthInstance } from '~/utils/auth';
import { ApiResponse } from '@junction/types';

export class BetterAuthIoAdapter extends IoAdapter {
    private readonly logger = new Logger(BetterAuthIoAdapter.name);

    constructor(
        private readonly app: INestApplicationContext,
        private readonly allowedOrigins: string[]) {
        super(app);
    }

    /**
     * 客户端连接时，自动将认证数据绑定到 socket 上
     */
    createIOServer(port: number, options?: any): any {
        const socketOptions = {
            ...options,
            cors: {
                origin: this.allowedOrigins,
                credentials: true,
                ...options?.cors,
            },
        };
        const server: Server = super.createIOServer(port, socketOptions);
        const authService = this.app.get<AuthService<BetterAuthInstance>>(AuthService);
        const authMiddleware = async (socket: Socket, next: (err?: any) => void) => {

            try {
                const req = socket.request;
                const headers = new Headers();
                Object.keys(req.headers).forEach((key) => {
                    const value = req.headers[key];
                    if (Array.isArray(value)) {
                        value.forEach((v) => headers.append(key, v));
                    } else if (value) {
                        headers.append(key, value as string);
                    }
                });
                const authToken = socket.handshake.auth.token;
                if (authToken) {
                    headers.set('Authorization', `Bearer ${authToken}`);
                }

                const sessionData = await authService.api.getSession({
                    headers: headers,
                });

                if (!sessionData) {
                    const err: any = new Error('Unauthorized');
                    err.data = {
                        code: 'UNAUTHORIZED',
                        reason: authToken ? 'invalid_token_or_session' : 'missing_token',
                    };
                    return next(err);
                }
                socket.data.user = sessionData.user;
                socket.data.session = sessionData.session;
                next();
            } catch (error) {
                this.logger.error('Socket Middleware Error', error);
                const err: any = new Error('Internal Server Error');
                err.data = { code: 'SOCKET_AUTH_ERROR' };
                next(err);
            }
        };
        server.use(authMiddleware);
        const originalOf = server.of.bind(server);
        server.of = (name: string | RegExp | Function) => {
            const nsp = originalOf(name);
            nsp.use(authMiddleware);
            return nsp;
        };
        return server;
    }
}
