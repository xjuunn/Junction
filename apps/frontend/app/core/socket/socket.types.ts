import type {
    McServerPublicConfig,
    McServerStatus,
    PrismaTypes,
    RtcCallCanceled,
    RtcCallEnded,
    RtcCallInvite,
    RtcCallJoined,
    RtcCallMode,
    RtcCallParticipantEvent,
    RtcCallParticipantLeft,
    RtcCallRejected,
    RtcCallSignal,
    RtcCallType
} from '@junction/types';

/**
 * S = Send (发送给后端的数据), A = Ack (后端回调的数据), L = Listen (后端主动推送的数据)
 */
export interface SocketEvent<S = void, A = void, L = void> {
    send: S;
    ack: A;
    listen: L;
}

export interface SocketNamespaces {
    app: {
        "init": SocketEvent<void, PrismaTypes.User, never>;
        "new-notification": SocketEvent<never, never, PrismaTypes.Notification>;
        "conversation-status": SocketEvent<never, never, { conversationId: string; onlineCount: number }>;
        "new-message": SocketEvent<never, never, any>;
        "message-updated": SocketEvent<never, never, any>;
        "message-stream": SocketEvent<never, never, { conversationId: string; messageId: string; delta?: string; fullContent?: string }>;
        "message-revoked": SocketEvent<never, never, { id: string; conversationId: string;[key: string]: any }>;
        "message-read": SocketEvent<never, never, { conversationId: string; messageId: string; userId: string; sequence?: number; readAt: string }>;
        "call-start": SocketEvent<{ callId: string; conversationId: string; callType: RtcCallType; mode: RtcCallMode; targetUserIds?: string[] }, never, never>;
        "call-accept": SocketEvent<{ callId: string }, never, never>;
        "call-reject": SocketEvent<{ callId: string }, never, never>;
        "call-cancel": SocketEvent<{ callId: string }, never, never>;
        "call-leave": SocketEvent<{ callId: string }, never, never>;
        "call-signal": SocketEvent<{ callId: string; toUserId: string; data: RtcCallSignal['data'] }, never, RtcCallSignal>;
        "call-incoming": SocketEvent<never, never, RtcCallInvite>;
        "call-joined": SocketEvent<never, never, RtcCallJoined>;
        "call-participant-joined": SocketEvent<never, never, RtcCallParticipantEvent>;
        "call-participant-left": SocketEvent<never, never, RtcCallParticipantLeft>;
        "call-ended": SocketEvent<never, never, RtcCallEnded>;
        "call-rejected": SocketEvent<never, never, RtcCallRejected>;
        "call-canceled": SocketEvent<never, never, RtcCallCanceled>;

        "mc-server:subscribe": SocketEvent<{ serverId: string }, { ok: boolean; serverId?: string; config?: McServerPublicConfig; status?: McServerStatus | null; error?: string; events?: Array<{ serverId: string; receivedAt: string; event: string; data: any }> }, never>;
        "mc-server:unsubscribe": SocketEvent<{ serverId: string }, { ok: boolean; serverId?: string; error?: string }, never>;
        "mc-server:status": SocketEvent<never, never, { serverId: string; fetchedAt: string; config: McServerPublicConfig; status: McServerStatus | null; error?: string }>;
        "mc-server:notification": SocketEvent<never, never, { serverId: string; receivedAt: string; event: string; data: any }>;
    };
}

export type NSKeys = keyof SocketNamespaces;
export type EventKeys<N extends NSKeys> = keyof SocketNamespaces[N];

// 提取 Send 类型
export type InferSend<N extends NSKeys, E extends EventKeys<N>> =
    SocketNamespaces[N][E] extends SocketEvent<infer S, any, any> ? S : never;

// 提取 Ack 类型
export type InferAck<N extends NSKeys, E extends EventKeys<N>> =
    SocketNamespaces[N][E] extends SocketEvent<any, infer A, any> ? A : never;

// 提取 Listen 类型
export type InferListen<N extends NSKeys, E extends EventKeys<N>> =
    SocketNamespaces[N][E] extends SocketEvent<any, any, infer L> ? L : never;
