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
        "app-test": SocketEvent<string, string, string>;
        "init": SocketEvent<void, PrismaTypes.User, never>;
        "new-notification": SocketEvent<never, never, PrismaTypes.Notification>;
        "test": SocketEvent<void, void, string>;
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