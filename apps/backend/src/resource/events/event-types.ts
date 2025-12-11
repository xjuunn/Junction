import { PrismaTypes } from "@junction/types";

export interface EventPayloadMap {
    'notification.created': PrismaTypes.Prisma.NotificationCreateInput
}

export type EventName = keyof EventPayloadMap;
