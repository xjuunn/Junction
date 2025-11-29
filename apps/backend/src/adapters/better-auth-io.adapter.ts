import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import type { Server } from 'socket.io';

export class BetterAuthIoAdapter extends IoAdapter {
    constructor(app: INestApplicationContext) {
        super(app);
    }

    createIOServer(server: any, options?: any): Server {
        const opts = {
            transports: ['websocket'],
            cors: {
                origin: (process.env.FRONTEND_ORIGIN && [process.env.FRONTEND_ORIGIN]) || true,
                credentials: true,
            },
            ...options,
        };

        return super.createIOServer(server, opts);
    }
}