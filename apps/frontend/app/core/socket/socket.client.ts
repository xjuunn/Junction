import { io, Socket } from "socket.io-client";
import type { SocketNamespaces, EmitSend, EmitAck, OnReceive, NamespaceEvents } from "./socket.types";

class SocketClient<N extends keyof SocketNamespaces> {
    private static instances = new Map<string, any>();
    private socket!: Socket;
    private namespace: N;

    /** 未连接前临时存储事件监听 */
    private pendingListeners: Array<{
        event: string;
        listener: (...args: any[]) => void;
    }> = [];

    private isConnected = false;

    private constructor(namespace: N) {
        this.namespace = namespace;

        const config = useRuntimeConfig();
        const backendUrl = `${config.public.httpType}://${config.public.serverHost}:${config.public.backendPort}/${namespace}`;

        this.socket = io(backendUrl, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        this.socket.on("connect", () => {
            console.log(`[Socket] 已连接 (${namespace})`);
            this.isConnected = true;
            this.flushPendingListeners();
        });

        this.socket.on("disconnect", () => {
            console.log(`[Socket] 已断开 (${namespace})`);
            this.isConnected = false;
        });
    }

    /** 处理连接前注册的事件 */
    private flushPendingListeners() {
        this.pendingListeners.forEach(({ event, listener }) => {
            this.socket.on(event, listener);
        });
        this.pendingListeners = [];
    }

    static getInstance<N extends keyof SocketNamespaces>(namespace: N): SocketClientTyped<N> {
        if (!this.instances.has(namespace)) {
            this.instances.set(namespace, new SocketClient(namespace));
        }
        return this.instances.get(namespace);
    }

    /** 发送事件（可选 ack 回调） */
    emit<E extends keyof NamespaceEvents<N>>(
        event: E,
        data: EmitSend<N, E>,
        callback?: (ack: EmitAck<N, E>) => void
    ) {
        this.socket.emit(event as string, data, callback);
    }

    /** 监听事件 */
    on<E extends keyof NamespaceEvents<N>>(
        event: E,
        listener: (data: OnReceive<N, E>) => void
    ) {
        const wrap = ((data: any) => listener(data)) as (...args: any[]) => void;

        if (this.isConnected) {
            this.socket.on(event as string, wrap);
        } else {
            this.pendingListeners.push({ event: event as string, listener: wrap });
        }
    }
}

export type SocketClientTyped<N extends keyof SocketNamespaces> = SocketClient<N>;
export { SocketClient };

/** 全局钩子 */
export function useSocket<N extends keyof SocketNamespaces>(namespace: N): SocketClientTyped<N> {
    return SocketClient.getInstance(namespace);
}
