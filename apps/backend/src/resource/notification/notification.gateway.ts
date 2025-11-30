import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaTypes } from '@junction/types';
import { WsUser } from '~/decorators/ws-user.decorator';
@WebSocketGateway({ namespace: 'app' })
export class NotificationGateway {
    @WebSocketServer()
    server: Server;
    private readonly logger = new Logger(NotificationGateway.name);

    sendNotificationToUser(userId: string, notification: PrismaTypes.Notification) {
        this.server.to(`user-${userId}`).emit('new-notification', notification);
    }

    @SubscribeMessage('test')
    handleTest(@WsUser() user: PrismaTypes.User) {
        this.server.to(`user-${user.id}`).emit('new-notification', "测试通知");

    }
}
