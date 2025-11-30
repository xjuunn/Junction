
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { WsUser } from './decorators/ws-user.decorator';
import { PrismaTypes } from '@junction/types';
import { Server, Socket } from 'socket.io';


@WebSocketGateway({ namespace: 'app', cors: true })
export class AppGateway {
    server: Server;
    
    @SubscribeMessage('init')
    init(@WsUser() user: PrismaTypes.User, @ConnectedSocket() client: Socket) {
        client.join(`user-${user.id}`);
        return user;
    }
}
