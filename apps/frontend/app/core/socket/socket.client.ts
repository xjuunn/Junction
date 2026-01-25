import { io, Socket } from "socket.io-client";
import type { SocketNamespaces, NSKeys, EventKeys, InferSend, InferAck, InferListen } from "./socket.types";

export class SocketClient<N extends NSKeys> {
    private static instances = new Map<string, any>();
    private socket: Socket;
    private namespace: N;
    private isConnected = false;

    private pendingListeners: Array<{ event: string; listener: (...args: any[]) => void }> = [];

    private constructor(namespace: N) {
        this.namespace = namespace;
        const config = useRuntimeConfig();
        const userStore = useUserStore();

        const isTauri = (() => {
            if (typeof window === 'undefined') return false;
            const win = window as any;
            const checks = {
                __TAURI__: win.__TAURI__ !== undefined,
                __TAURI_IPC__: win.__TAURI_IPC__ !== undefined,
                __TAURI_INTERNALS__: win.__TAURI_INTERNALS__ !== undefined,
                userAgentTauri: navigator.userAgent.includes('Tauri'),
                protocolTauri: window.location.protocol === 'tauri:',
                hrefTauri: window.location.href.startsWith('tauri://'),
            };
            const isTauriEnv = Object.values(checks).some(v => v);
            console.debug('[Socket] Tauri detection:', { ...checks, isTauriEnv });
            return isTauriEnv;
        })();
        const serverHost = isTauri ? 'localhost' : config.public.serverHost;
        const backendPort = config.public.backendPort;
        const backendUrl = `${config.public.httpType}://${serverHost}:${backendPort}/${namespace}`;
        console.log(`[Socket] Environment: ${isTauri ? 'Tauri' : 'Web'}, Host: ${serverHost}, Port: ${backendPort}, URL: ${backendUrl}`);

        const socketOptions: any = {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: {
                token: userStore.authToken.value
            }
        };

        if (!isTauri) {
            socketOptions.withCredentials = true;
        }

        this.socket = io(backendUrl, socketOptions);

        this.socket.on("connect", () => {
            console.log(`[Socket] Connected: ${namespace}`);
            this.isConnected = true;
            this.flushPendingListeners();
        });

        this.socket.on("disconnect", (reason) => {
            console.log(`[Socket] Disconnected: ${namespace}, reason: ${reason}`);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error(`[Socket] Connect error: ${namespace}`, error.message, error);
        });

        this.socket.on('connect_timeout', (timeout) => {
            console.error(`[Socket] Connect timeout: ${namespace}`, timeout);
        });

        this.socket.on('error', (error) => {
            console.error(`[Socket] Error: ${namespace}`, error);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`[Socket] Reconnected: ${namespace}, attempt: ${attemptNumber}`);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error(`[Socket] Reconnect error: ${namespace}`, error);
        });

        this.socket.on('reconnect_failed', () => {
            console.error(`[Socket] Reconnect failed: ${namespace}`);
        });
    }

    static getInstance<N extends NSKeys>(namespace: N): SocketClient<N> {
        if (!this.instances.has(namespace)) {
            this.instances.set(namespace, new SocketClient(namespace));
        }
        return this.instances.get(namespace);
    }

    private flushPendingListeners() {
        this.pendingListeners.forEach(({ event, listener }) => {
            this.socket.on(event, listener);
        });
        this.pendingListeners = [];
    }

    emit<E extends EventKeys<N>>(
        event: E
    ): void;

    emit<E extends EventKeys<N>>(
        event: InferSend<N, E> extends void ? E : never,
        callback: (ack: InferAck<N, E>) => void
    ): void;

    emit<E extends EventKeys<N>>(
        event: E,
        data: InferSend<N, E>
    ): void;

    emit<E extends EventKeys<N>>(
        event: E,
        data: InferSend<N, E>,
        callback: (ack: InferAck<N, E>) => void
    ): void;

    emit(event: string, ...args: any[]) {
        let data: any = undefined;
        let callback: any = undefined;

        if (args.length === 1) {
            if (typeof args[0] === 'function') {
                callback = args[0];
            } else {
                data = args[0];
            }
        } else if (args.length >= 2) {
            data = args[0];
            callback = args[1];
        }

        if (callback) {
            this.socket.emit(event, data, callback);
        } else {
            this.socket.emit(event, data);
        }
    }

    on<E extends EventKeys<N>>(
        event: E,
        listener: (data: InferListen<N, E>) => void
    ) {
        const wrap = (data: any) => listener(data);

        if (this.isConnected) {
            this.socket.on(event as string, wrap);
        } else {
            this.pendingListeners.push({ event: event as string, listener: wrap });
        }
    }

    off<E extends EventKeys<N>>(event: E) {
        this.socket.off(event as string);
    }
}

export function useSocket<N extends NSKeys>(namespace: N): SocketClient<N> {
    return SocketClient.getInstance(namespace);
}