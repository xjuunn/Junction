import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StatusService } from './resource/status/status.service';

@WebSocketGateway({ namespace: 'app', cors: true })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(private readonly statusService: StatusService) { }

    /**
     * 鉴权通过后自动设置在线状态
     */
    async handleConnection(client: Socket) {
        const user = client.data.user;
        if (user?.id) {
            client.data.userId = user.id;
            await this.statusService.setOnline(user.id);
        }
    }

    /**
     * 物理连接断开时自动下线
     */
    async handleDisconnect(client: Socket) {
        const user = client.data.user;
        if (user?.id) {
            await this.statusService.setOffline(user.id);
        }
    }
}