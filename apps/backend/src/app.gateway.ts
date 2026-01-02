import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StatusService } from './resource/status/status.service';
import { ConversationGateway } from './resource/conversation/conversation.gateway';

@WebSocketGateway({ namespace: 'app', cors: true })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly statusService: StatusService,
        private readonly conversationGateway: ConversationGateway
    ) { }

    /**
     * 连接处理
     */
    async handleConnection(client: Socket) {
        const user = client.data.user;
        if (user?.id) {
            client.data.userId = user.id;
            client.join(`user-${user.id}`);
            await this.statusService.setOnline(user.id);
            await this.conversationGateway.handleUserStatusChange(user.id);
        }
    }

    /**
     * 断开处理
     */
    async handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        if (userId) {
            await this.statusService.setOffline(userId);
            await this.conversationGateway.handleUserStatusChange(userId);
        }
    }
}