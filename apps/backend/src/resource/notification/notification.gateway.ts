import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WsUser } from '~/decorators/ws-user.decorator';
import type { PrismaTypes } from '@junction/types';
@WebSocketGateway({
    namespace: 'notification',
    transports: ['websocket'],
})
export class NotificationGateway {
    @WebSocketServer()
    server: Server;
    private readonly logger = new Logger(NotificationGateway.name);

    @SubscribeMessage('test')
    test(@WsUser() user: PrismaTypes.User) {

        return user;
    }
}