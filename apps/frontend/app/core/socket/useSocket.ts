import { SocketClient } from "./socket.client";
import type { SocketNamespaces } from "./socket.types";

export function useSocket<N extends keyof SocketNamespaces>(namespace: N) {
    const client = SocketClient.getInstance(namespace);
    return client;
}
