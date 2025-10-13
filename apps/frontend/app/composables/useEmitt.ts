import mitt, { type Emitter } from "mitt"

const emitter: Emitter<Events> = mitt<Events>()

export const useEmitt = () => {
    function on<Key extends keyof Events>(
        event: Key,
        handler: (payload: Events[Key]) => void
    ) {
        emitter.on(event, handler)
    }

    function off<Key extends keyof Events>(
        event: Key,
        handler: (payload: Events[Key]) => void
    ) {
        emitter.off(event, handler)
    }

    function emit<Key extends keyof Events>(event: Key, payload: Events[Key]) {
        emitter.emit(event, payload)
    }

    return {
        on,
        off,
        emit,
    }
}

export type Events = {
    // [key: string]: any
}
