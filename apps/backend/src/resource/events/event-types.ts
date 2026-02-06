import { PrismaTypes } from "@junction/types";

export interface MessageCreatedEvent {
    messageId: string;
    conversationId: string;
    senderId: string | null;
    type: PrismaTypes.Prisma.MessageUncheckedCreateInput['type'];
    content: string | null;
    payload?: any;
    isBotMessage?: boolean;
}

export interface EventPayloadMap {
    'notification.create': PrismaTypes.Prisma.NotificationUncheckedCreateInput;
    'message.created': MessageCreatedEvent;
}

export type EventName = keyof EventPayloadMap;
