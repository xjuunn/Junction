import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { StatusService } from '../status/status.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ namespace: 'app', cors: true })
export class ConversationGateway {
    @WebSocketServer() server: Server;

    constructor(
        private readonly prisma: PrismaService,
        private readonly statusService: StatusService,
    ) { }

    /**
     * 实时广播状态变更
     */
    async handleUserStatusChange(userId: string) {
        const membersInCommon = await this.prisma.conversationMember.findMany({
            where: {
                conversation: { members: { some: { userId } } },
                isActive: true
            },
            select: {
                conversationId: true,
                userId: true,
                conversation: { select: { type: true } }
            }
        });

        if (!membersInCommon.length) return;

        const allUserIds = [...new Set(membersInCommon.map(m => m.userId))];
        const onlineMap = await this.statusService.getStatuses(allUserIds);

        const groups = membersInCommon.reduce((acc, curr) => {
            if (!acc[curr.conversationId]) acc[curr.conversationId] = { type: curr.conversation.type, members: [] };
            acc[curr.conversationId].members.push(curr.userId);
            return acc;
        }, {} as Record<string, { type: string, members: string[] }>);

        for (const [convId, group] of Object.entries(groups)) {
            const totalOnline = group.members.filter(id => onlineMap[id]).length;

            group.members.forEach(targetId => {
                if (!onlineMap[targetId]) return;

                let displayValue = totalOnline;
                if (group.type === 'PRIVATE') {
                    const otherId = group.members.find(id => id !== targetId);
                    displayValue = otherId && onlineMap[otherId] ? 1 : 0;
                }

                this.server.to(`user-${targetId}`).emit('conversation-status', {
                    conversationId: convId,
                    onlineCount: displayValue
                });
            });
        }
    }
}