import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ namespace: 'app', cors: true })
export class MessageGateway {
    @WebSocketServer()
    server: Server;

    /**
     * 将消息实时分发给指定的多个用户
     */
    broadcastToUsers(userIds: string[], event: string, payload: any, excludeUserId?: string) {
        const uniqueIds = [...new Set(userIds)];
        uniqueIds.forEach(id => {
            if (id !== excludeUserId) {
                this.server.to(`user-${id}`).emit(event, payload);
            }
        });
    }
}