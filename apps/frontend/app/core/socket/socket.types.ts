export type NamespaceEvents<N extends keyof SocketNamespaces> = SocketNamespaces[N]["events"];

export type EmitSend<N extends keyof SocketNamespaces, E extends keyof NamespaceEvents<N>>
    = NamespaceEvents<N>[E] extends EventDef<infer S, any, any> ? S : never;

export type EmitAck<N extends keyof SocketNamespaces, E extends keyof NamespaceEvents<N>>
    = NamespaceEvents<N>[E] extends EventDef<any, infer A, any> ? A : never;

export type OnReceive<N extends keyof SocketNamespaces, E extends keyof NamespaceEvents<N>>
    = NamespaceEvents<N>[E] extends EventDef<any, any, infer O> ? O : never;

import { AppGateway } from '@junction/backend/src/app.gateway';

export interface EventDef<Send = unknown, Ack = unknown, On = unknown> {
    send?: Send;  // send  客户端 -> 服务器
    ack?: Ack;    // ack   服务器 -> 客户端
    on?: On;      // on    服务器 -> 客户端广播
}

// 所有命名空间事件定义
export interface SocketNamespaces {
    app: {
        events: {
            "app-test": EventDef<string, AwaitedReturnType<AppGateway['handleAppTest']>, string>;
        };
    };
}