// src/adapters/auth.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BetterAuthInstance } from '~/utils/auth';
import { BETTER_AUTH_INSTANCE } from '~/resource/auth/auth.module';
import { fromNodeHeaders } from 'better-auth/node';

export class AuthIoAdapter extends IoAdapter {
    private auth: BetterAuthInstance;

    constructor(private app: INestApplicationContext) {
        super(app);
        this.auth = app.get<BetterAuthInstance>(BETTER_AUTH_INSTANCE, { strict: false });
    }

    createIOServer(port: number, options?: any): any {
        const server: Server = super.createIOServer(port, options);

        server.use(async (socket: Socket, next) => {
            try {
                const headers = fromNodeHeaders(socket.handshake.headers);
                const session = await this.auth.api.getSession({
                    headers: headers,
                });

                if (!session) {
                    return next(new Error('Unauthorized'));
                }
                (socket as any).user = session.user;
                (socket as any).session = session.session;

                next();
            } catch (error) {
                console.error('WS Auth Error:', error);
                next(new Error('Authentication error'));
            }
        });

        return server;
    }
}