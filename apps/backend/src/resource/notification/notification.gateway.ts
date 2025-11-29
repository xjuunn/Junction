import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { WsUser } from '~/decorators/ws-user.decorator';
import type { PrismaTypes } from '@junction/types';
import { AuthService } from '@thallesp/nestjs-better-auth';
import type { BetterAuthInstance } from '~/utils/auth';

@WebSocketGateway({
    namespace: 'notification',
    transports: ['websocket'],
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    private readonly logger = new Logger(NotificationGateway.name);
    constructor(
        private readonly authService: AuthService<BetterAuthInstance>
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
        (client as any).betterAuthService = this.authService;
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join')
    handleJoin(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string },
    ) {
        if (data && data.userId) {
            client.join(data.userId);
            this.logger.log(`User ${data.userId} joined room ${data.userId}`);
            return { event: 'join', status: 'success', userId: data.userId };
        }
        return { event: 'join', status: 'error', message: 'Missing userId' };
    }

    @SubscribeMessage('test')
    test(@WsUser() user: PrismaTypes.User) {
        if (!user) {
            this.logger.warn('test -> Unauthorized (No User found)');
            return { status: 'error', message: 'Unauthorized' };
        }
        this.logger.log('test -> ws user found:', user.email);
        return user;
    }
}