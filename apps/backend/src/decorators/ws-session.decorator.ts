import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Socket } from 'socket.io';

export const WsSession = createParamDecorator(
    (data: keyof any, ctx: ExecutionContext) => {
        const client = ctx.switchToWs().getClient<Socket>();
        const session = client.data?.session;
        if (data && session) {
            return session[data];
        }
        return session;
    },
);