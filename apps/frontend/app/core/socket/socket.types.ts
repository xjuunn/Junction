import type { PrismaTypes } from '@junction/types';

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
