import { Injectable } from '@nestjs/common';
import { MessageBody, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { WsUser } from '~/decorators/ws-user.decorator';

type CallType = 'audio' | 'video';
type CallMode = 'PRIVATE' | 'GROUP';

interface CallParticipant {
  userId: string;
  name?: string | null;
  image?: string | null;
}

interface CallSession {
  id: string;
  conversationId: string;
  callType: CallType;
  mode: CallMode;
  ownerId: string;
  participants: Map<string, CallParticipant>;
  ringing: Set<string>;
  createdAt: number;
}

@Injectable()
@WebSocketGateway({ namespace: 'app', cors: true })
export class CallGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly sessions = new Map<string, CallSession>();
  private readonly userSessions = new Map<string, Set<string>>();

  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return;
    const callIds = this.userSessions.get(userId);
    if (!callIds?.size) return;
    callIds.forEach(callId => {
      this.handleLeaveInternal(callId, userId, 'disconnected');
    });
  }

  @SubscribeMessage('call-start')
  async handleCallStart(
    @WsUser('id') userId: string,
    @MessageBody() payload: { callId: string; conversationId: string; callType: CallType; mode: CallMode; targetUserIds?: string[] }
  ) {
    if (!userId) return;
    const { callId, conversationId, callType, mode, targetUserIds } = payload;
    if (!callId || !conversationId || !callType || !mode) return;
    if (this.sessions.has(callId)) {
      this.endSession(callId, 'ended', userId);
    }

    const member = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId, isActive: true },
      select: { userId: true }
    });
    if (!member) return;

    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId, isActive: true },
      select: { userId: true }
    });
    const allMemberIds = members.map(m => m.userId);
    const filteredTargets = (targetUserIds?.length ? targetUserIds : allMemberIds)
      .filter(id => id && id !== userId && allMemberIds.includes(id));

    const fromUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true }
    });

    const participants = new Map<string, CallParticipant>();
    participants.set(userId, {
      userId,
      name: fromUser?.name ?? null,
      image: fromUser?.image ?? null
    });

    const session: CallSession = {
      id: callId,
      conversationId,
      callType,
      mode,
      ownerId: userId,
      participants,
      ringing: new Set(filteredTargets),
      createdAt: Date.now()
    };
    this.sessions.set(callId, session);
    this.trackUserSession(userId, callId);

    this.server.to(`user-${userId}`).emit('call-joined', {
      callId,
      participants: [...participants.values()]
    });

    filteredTargets.forEach(targetId => {
      this.server.to(`user-${targetId}`).emit('call-incoming', {
        callId,
        conversationId,
        callType,
        mode,
        fromUser: {
          userId,
          name: fromUser?.name ?? null,
          image: fromUser?.image ?? null
        }
      });
    });
  }

  @SubscribeMessage('call-accept')
  async handleCallAccept(
    @WsUser('id') userId: string,
    @MessageBody() payload: { callId: string }
  ) {
    const { callId } = payload;
    const session = this.sessions.get(callId);
    if (!session || !userId) return;
    if (!session.ringing.has(userId) && !session.participants.has(userId)) return;

    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, image: true }
    });

    const participant: CallParticipant = {
      userId,
      name: profile?.name ?? null,
      image: profile?.image ?? null
    };
    session.participants.set(userId, participant);
    session.ringing.delete(userId);
    this.trackUserSession(userId, callId);

    this.server.to(`user-${userId}`).emit('call-joined', {
      callId,
      participants: [...session.participants.values()]
    });

    this.broadcastToParticipants(session, 'call-participant-joined', {
      callId,
      participant
    }, userId);
  }

  @SubscribeMessage('call-reject')
  async handleCallReject(
    @WsUser('id') userId: string,
    @MessageBody() payload: { callId: string }
  ) {
    const { callId } = payload;
    const session = this.sessions.get(callId);
    if (!session || !userId) return;
    session.ringing.delete(userId);
    this.server.to(`user-${session.ownerId}`).emit('call-rejected', { callId, userId });
    this.cleanupIfIdle(session);
  }

  @SubscribeMessage('call-cancel')
  async handleCallCancel(
    @WsUser('id') userId: string,
    @MessageBody() payload: { callId: string }
  ) {
    const { callId } = payload;
    const session = this.sessions.get(callId);
    if (!session || session.ownerId !== userId) return;
    session.ringing.forEach(targetId => {
      this.server.to(`user-${targetId}`).emit('call-canceled', { callId });
    });
    this.endSession(callId, 'canceled', userId);
  }

  @SubscribeMessage('call-leave')
  async handleCallLeave(
    @WsUser('id') userId: string,
    @MessageBody() payload: { callId: string }
  ) {
    const { callId } = payload;
    this.handleLeaveInternal(callId, userId, 'hangup');
  }

  @SubscribeMessage('call-signal')
  async handleCallSignal(
    @WsUser('id') userId: string,
    @MessageBody() payload: { callId: string; toUserId: string; data: any }
  ) {
    const { callId, toUserId, data } = payload;
    const session = this.sessions.get(callId);
    if (!session || !userId || !toUserId) return;
    if (!session.participants.has(userId) || !session.participants.has(toUserId)) return;
    this.server.to(`user-${toUserId}`).emit('call-signal', {
      callId,
      fromUserId: userId,
      toUserId,
      data
    });
  }

  private handleLeaveInternal(callId: string, userId: string, reason: 'hangup' | 'disconnected') {
    const session = this.sessions.get(callId);
    if (!session) return;
    if (!session.participants.has(userId)) return;
    session.participants.delete(userId);
    this.untrackUserSession(userId, callId);

    if (userId === session.ownerId) {
      this.endSession(callId, reason, userId);
      return;
    }

    this.broadcastToParticipants(session, 'call-participant-left', {
      callId,
      userId
    }, userId);
    this.cleanupIfIdle(session);
  }

  private cleanupIfIdle(session: CallSession) {
    if (session.participants.size === 0) {
      this.endSession(session.id, 'ended');
      return;
    }
    if (session.participants.size === 1 && session.ringing.size === 0) {
      this.endSession(session.id, 'ended');
    }
  }

  private endSession(callId: string, reason: 'hangup' | 'canceled' | 'rejected' | 'timeout' | 'disconnected' | 'ended', endedBy?: string) {
    const session = this.sessions.get(callId);
    if (!session) return;
    const participantIds = [...session.participants.keys()];
    const notifyIds = new Set<string>([...participantIds, ...session.ringing]);
    notifyIds.forEach(id => {
      this.server.to(`user-${id}`).emit('call-ended', {
        callId,
        reason,
        endedBy
      });
      this.untrackUserSession(id, callId);
    });
    this.sessions.delete(callId);
  }

  private broadcastToParticipants(session: CallSession, event: string, payload: any, excludeUserId?: string) {
    session.participants.forEach(participant => {
      if (participant.userId === excludeUserId) return;
      this.server.to(`user-${participant.userId}`).emit(event, payload);
    });
  }

  private trackUserSession(userId: string, callId: string) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set([callId]));
      return;
    }
    this.userSessions.get(userId)!.add(callId);
  }

  private untrackUserSession(userId: string, callId: string) {
    const set = this.userSessions.get(userId);
    if (!set) return;
    set.delete(callId);
    if (set.size === 0) {
      this.userSessions.delete(userId);
    }
  }
}
