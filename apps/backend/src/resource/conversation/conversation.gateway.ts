import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { StatusService } from '../status/status.service';

@WebSocketGateway({ namespace: 'app', cors: true })
export class ConversationGateway {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly prisma: PrismaService,
        private readonly statusService: StatusService,
    ) { }

    /**
     * 广播用户在线状态变更
     */
    async handleUserStatusChange(userId: string) {
        const membersInCommon = await this.prisma.conversationMember.findMany({
            where: {
                conversation: {
                    members: { some: { userId } }
                },
                isActive: true
            },
            select: {
                conversationId: true,
                userId: true
            }
        });

        const conversationGroup = membersInCommon.reduce((acc, curr) => {
            if (!acc[curr.conversationId]) acc[curr.conversationId] = [];
            acc[curr.conversationId].push(curr.userId);
            return acc;
        }, {} as Record<string, string[]>);

        const allDistinctUsers = [...new Set(membersInCommon.map(m => m.userId))];
        const onlineMap = await this.statusService.getStatuses(allDistinctUsers);

        for (const [convId, memberIds] of Object.entries(conversationGroup)) {
            const onlineMembers = memberIds.filter(id => onlineMap[id]);
            const onlineCount = onlineMembers.length;

            onlineMembers.forEach(targetId => {
                this.server.to(`user-${targetId}`).emit('conversation-status', {
                    conversationId: convId,
                    onlineCount
                });
            });
        }
    }
}