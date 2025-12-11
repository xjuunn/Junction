import { Module, Global } from '@nestjs/common';
import { EventBus } from './event-bus.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [EventBus],
    exports: [EventBus],
})
export class EventsModule { }
