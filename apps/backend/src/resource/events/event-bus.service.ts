import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, EventEmitter2 as EE2 } from '@nestjs/event-emitter';
import { EventPayloadMap, EventName } from './event-types';

@Injectable()
export class EventBus {
    private readonly logger = new Logger(EventBus.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * 立刻发出事件（同步或异步 listener 都会接收）
     */
    emit<E extends EventName>(event: E, payload: EventPayloadMap[E]) {
        return this.eventEmitter.emit(event as string, payload);
    }

    /**
     * 返回一个 Promise，等待所有异步 listener 执行完成（如果使用了 async listeners）
     */
    async emitAsync<E extends EventName>(event: E, payload: EventPayloadMap[E]) {
        this.eventEmitter.emit(event as string, payload);
    }
}
